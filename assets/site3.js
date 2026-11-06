/* AgriManager project site (site3). Plain JS, no build step.
   Data: data/site3.js (window.SITE3), written by tools/site3/extract_site3.py from real scored test bundles and the
   final tables. No number on the pages is typed by hand into this file. */
(function () {
  "use strict";
  var D = window.SITE3 || {};
  var F = D.findings || {};
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function S(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function T(tag, attrs, text, parent) { var t = S(tag, attrs, parent); t.textContent = text; return t; }
  function h(tag, cls, text, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(x, d) {
    if (x === null || x === undefined || isNaN(x)) return "–";
    return Number(x).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function icon(parent, id) { var s = S("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, parent); S("use", { href: id }, s); return s; }
  function niceCeil(v) { var p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1e-9)))) / 2; return Math.ceil(v / p) * p; }
  function narrow(el) { return el.clientWidth < 520; }
  function actionKind(a) {
    a = a || "";
    if (/irrigat/i.test(a) && /nitrogen|fertil/i.test(a)) return "both";
    if (/irrigat/i.test(a)) return "water";
    if (/nitrogen|phosph|potass|fertil/i.test(a)) return "n";
    return "none";
  }
  function setPill(pill, action) {
    clear(pill);
    var k = actionKind(action);
    pill.className = "act-pill" + (k === "water" ? " water" : k === "none" ? " none" : "");
    icon(pill, k === "water" ? "#i-drop" : k === "none" ? "#i-dot" : "#i-leaf");
    pill.appendChild(document.createTextNode(action || "(no valid action)"));
  }
  function cumFert(s, after) {
    var v = after ? [s.n_after, s.p_after, s.k_after] : [s.n_cum, s.p_cum, s.k_cum];
    return v.reduce(function (a, x) { return a + (x || 0); }, 0);
  }
  function stepInputs(s) {
    var f = Math.max(0, cumFert(s, true) - cumFert(s, false));
    var w = (s.w_after != null && s.w_cum != null) ? Math.max(0, s.w_after - s.w_cum) : 0;
    return { f: Math.round(f * 10) / 10, w: Math.round(w * 10) / 10 };
  }
  function hasPK(ep) { return ep.steps.some(function (s) { return s.p_after != null; }); }
  function tabs(container, onSelect) {
    var btns = $$("button", container);
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        onSelect(b);
      });
    });
  }

  /* ---------------------------------------------------------------- shell: theme, nav, reveal, footer */
  (function theme() {
    var btn = $("#themeBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var root = document.documentElement, cur = root.getAttribute("data-theme");
      var dark = cur ? cur === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      var next = dark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("agm3-theme", next); } catch (e) {}
    });
  })();
  (function nav() {
    var n = $("#nav");
    if (!n) return;
    function on() { n.classList.toggle("scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", on, { passive: true }); on();
  })();
  (function reveal() {
    var els = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e) { io.observe(e); });
  })();
  (function bib() {
    var b = $("#bibCopy");
    if (!b) return;
    b.addEventListener("click", function () {
      var txt = $("#bibtex").textContent;
      function done() { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1600); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
      else done();
    });
  })();
  $$("a[data-todo]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); }); a.title = "Coming soon"; });

  /* ---------------------------------------------------------------- hero: continuous season playback of one real episode (maize)
     Driven by the episode's real observations: plant height, leaf count, tassel and silks by the development stage (DVS),
     ear size by the storage-organ (grain) weight (WSO), soil shade by root-zone moisture (SM), soil dots by available
     nitrogen (NAVAIL). The plant shape is schematic. Every decision step is played; the card pauses only at hero.moments. */
  (function heroStory() {
    var ep = D.hero, scene = $("#stScene"), lineSvg = $("#stLine");
    if (!ep || !scene) return;
    var steps = ep.steps, n = steps.length, f = ep.final, na = ep.noaction, moments = ep.moments || [];
    var wsoMax = Math.max(f.final_wso || 1, 1), dayEnd = steps[n - 1].day + 10, GY = 252;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function stateAt(k) { var s = steps[k]; return { dvs: s.stage, wso: s.growth || 0, sm: s.moisture, n: s.soil_n, day: s.day }; }
    var FINAL = { dvs: 2.0, wso: f.final_wso, sm: steps[n - 1].moisture, n: steps[n - 1].soil_n, day: dayEnd };
    var SOW = { dvs: -0.2, wso: 0, sm: steps[0].moisture, n: steps[0].soil_n, day: 0 };
    function mix(a, b, t) { return { dvs: lerp(a.dvs, b.dvs, t), wso: lerp(a.wso, b.wso, t), sm: lerp(a.sm, b.sm, t), n: lerp(a.n, b.n, t), day: lerp(a.day, b.day, t) }; }
    function kind(a) { return /irrigat/i.test(a || "") ? "water" : /nitrogen|phosph|potass/i.test(a || "") ? "fert" : "none"; }
    function amount(a) { var m = (a || "").match(/(\d+(?:\.\d+)?)\s*(kg\/ha|cm)/); return m ? (+m[1]) + " " + m[2] : ""; }
    function rnd(i, k) { var x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }

    /* --- maize plant */
    var NL = 11;
    function buildScene(svg) {
      var G = {};
      S("rect", { x: 0, y: GY, width: 560, height: 320 - GY, rx: 14, fill: "var(--soil-dry)" }, svg);
      G.wet = S("rect", { x: 0, y: GY, width: 560, height: 320 - GY, rx: 14, fill: "var(--soil-wet)", opacity: 0 }, svg);
      G.dots = [];
      for (var i = 0; i < 18; i++) G.dots.push(S("circle", { cx: 18 + rnd(i, 1) * 524, cy: GY + 14 + rnd(i, 2) * 46, r: 2.8, fill: "var(--n-dot)", opacity: 0 }, svg));
      G.plants = [[150, .84, 1], [280, 1, -1], [410, .9, 1]].map(function (p, pi) {
        var g = S("g", { transform: "translate(" + p[0] + "," + GY + ") scale(" + p[1] + ")" }, svg);
        var P = { flip: p[2], roots: [], leaves: [], ribs: [], tassel: [], silks: [] };
        for (var r = 0; r < 2; r++) P.roots.push(S("path", { fill: "none", stroke: "var(--stem)", "stroke-width": 2, "stroke-linecap": "round" }, g));
        P.seed = S("ellipse", { cx: 0, cy: 10, rx: 4, ry: 3, fill: "var(--kernel)", stroke: "var(--soil-line)", "stroke-width": 1 }, g);
        P.stalk = S("path", { fill: "var(--stem)" }, g);
        P.nodes = S("path", { fill: "none", stroke: "var(--leaf-2)", "stroke-width": 1.4, opacity: .55 }, g);
        for (var l = 0; l < NL; l++) {
          P.leaves.push(S("path", { fill: "var(--leaf)" }, g));
          P.ribs.push(S("path", { fill: "none", stroke: "var(--leaf-2)", "stroke-width": 1, opacity: .55, "stroke-linecap": "round" }, g));
        }
        for (var t = 0; t < 7; t++) P.tassel.push(S("path", { fill: "none", stroke: "var(--tassel)", "stroke-width": 1.8, "stroke-linecap": "round" }, g));
        P.ear = S("g", {}, g);
        P.husk = S("path", { fill: "var(--husk)", stroke: "var(--leaf-2)", "stroke-width": .8 }, P.ear);
        P.kernels = S("path", { fill: "var(--kernel)" }, P.ear);
        P.huskLine = S("path", { fill: "none", stroke: "var(--leaf-2)", "stroke-width": 1, opacity: .7 }, P.ear);
        for (var sk = 0; sk < 6; sk++) P.silks.push(S("path", { fill: "none", stroke: "var(--silk)", "stroke-width": 1.2, "stroke-linecap": "round" }, P.ear));
        return P;
      });
      G.particles = S("g", {}, svg);
      return G;
    }
    function leafPath(x0, y0, s, L, droop) {
      var w = 2.4 + L * 0.055;
      var tipY = Math.min(y0 - L * (0.1 - droop * 1.6), -10);
      var p1 = [x0 + s * L * 0.3, y0 - L * 0.42], p2 = [x0 + s * L * 0.72, Math.min(y0 - L * (0.42 - droop), -14)], p3 = [x0 + s * L, tipY];
      return {
        blade: "M" + x0 + " " + (y0 - 2) + " C " + p1[0] + " " + (p1[1] - w) + ", " + p2[0] + " " + (p2[1] - w * 0.7) + ", " + p3[0] + " " + p3[1] +
          " C " + p2[0] + " " + (p2[1] + w * 0.5) + ", " + p1[0] + " " + (p1[1] + w * 1.1) + ", " + x0 + " " + (y0 + 3) + " Z",
        rib: "M" + x0 + " " + y0 + " C " + p1[0] + " " + p1[1] + ", " + p2[0] + " " + p2[1] + ", " + p3[0] + " " + p3[1]
      };
    }
    function drawState(G, st) {
      G.wet.setAttribute("opacity", clamp((st.sm - 0.28) / 0.2, 0, 1).toFixed(2));
      var nd = clamp(Math.round((st.n || 0) / 3), 0, 18);
      G.dots.forEach(function (d, i) { d.setAttribute("opacity", i < nd ? .8 : 0); });
      var up = clamp(st.dvs / 1.0, 0, 1), H = st.dvs <= -0.08 ? 0 : 8 + 214 * Math.pow(up, 1.25);
      var share = clamp(st.wso / wsoMax, 0, 1), ripe = clamp((st.dvs - 1.6) / 0.35, 0, 1);
      G.plants.forEach(function (P) {
        var on = H > 0;
        var nlv = on ? clamp(Math.round(2 + 9 * up), 2, NL) : 0, Lmax = 16 + 56 * Math.pow(up, .8);
        P.seed.setAttribute("opacity", st.dvs < 0.05 ? 1 : 0);
        // stalk: tapered, slightly curved
        var bw = 2 + 3.2 * up, tw = 1.2 + 1 * up;
        P.stalk.setAttribute("d", on ? "M" + (-bw) + " 0 C " + (-bw) + " " + (-H * .5) + ", " + (-tw - 1) + " " + (-H * .8) + ", " + (-tw) + " " + (-H) +
          " L " + tw + " " + (-H) + " C " + (tw + 1) + " " + (-H * .8) + ", " + bw + " " + (-H * .5) + ", " + bw + " 0 Z" : "");
        var nodes = "";
        P.leaves.forEach(function (lf, i) {
          if (i >= nlv) { lf.setAttribute("d", ""); P.ribs[i].setAttribute("d", ""); return; }
          var frac = nlv === 1 ? .5 : i / (nlv - 1), y0 = -H * (0.07 + 0.83 * frac), s = (i % 2 ? 1 : -1) * P.flip;
          var L = Lmax * (0.5 + 0.5 * Math.sin(Math.PI * (0.18 + 0.7 * (1 - Math.abs(frac - 0.45) * 1.1))));
          var droop = 0.16 + 0.22 * (1 - frac) + 0.08 * ripe;
          var lp = leafPath(0, y0, s, L, droop);
          lf.setAttribute("d", lp.blade); P.ribs[i].setAttribute("d", lp.rib);
          var dead = ripe > 0 && frac < ripe * 0.9;
          lf.setAttribute("fill", dead ? "var(--leaf-old)" : (i % 3 === 1 ? "var(--leaf-2b)" : "var(--leaf)"));
          nodes += "M-3 " + y0.toFixed(1) + " H3 ";
        });
        P.nodes.setAttribute("d", nodes);
        // brace roots
        P.roots.forEach(function (r, i) { var s = i ? 1 : -1; r.setAttribute("d", H > 120 ? "M" + (s * 1.5) + " -10 Q " + (s * 6) + " -4, " + (s * 9) + " 2" : ""); });
        // tassel
        var tg = clamp((st.dvs - 0.75) / 0.3, 0, 1);
        P.tassel.forEach(function (tp, i) {
          if (!tg || !on) { tp.setAttribute("d", ""); return; }
          var top = -H, len = (8 + 16 * tg) * (i === 0 ? 1.25 : 1), a = i === 0 ? -Math.PI / 2 : -Math.PI / 2 + (i % 2 ? 1 : -1) * (0.35 + 0.22 * Math.ceil(i / 2));
          var x2 = Math.cos(a) * len, y2 = top + Math.sin(a) * len;
          tp.setAttribute("d", "M0 " + (top + 2) + " Q " + (x2 * 0.5) + " " + (top + Math.sin(a) * len * 0.8 - 2) + ", " + x2 + " " + (y2 + (i ? len * 0.35 : 0)));
          tp.setAttribute("stroke", ripe > 0.5 ? "var(--tassel-old)" : "var(--tassel)");
        });
        // ear: appears at silking, grows with grain weight
        var eg = clamp((st.dvs - 0.85) / 0.2, 0, 1);
        if (!eg || !on) { P.ear.setAttribute("opacity", 0); return; }
        P.ear.setAttribute("opacity", 1);
        var es = -P.flip, ey = -H * 0.44, el = (11 + 30 * Math.sqrt(share)) * (0.6 + 0.4 * eg), ew = el * 0.3;
        P.ear.setAttribute("transform", "translate(" + (es * 3) + "," + ey + ") rotate(" + (es * 28) + ")");
        P.husk.setAttribute("d", "M0 0 C " + (-ew) + " " + (-el * 0.25) + ", " + (-ew * 0.9) + " " + (-el * 0.8) + ", 0 " + (-el) + " C " + (ew * 0.9) + " " + (-el * 0.8) + ", " + ew + " " + (-el * 0.25) + ", 0 0 Z");
        P.husk.setAttribute("fill", ripe > 0.4 ? "var(--husk-old)" : "var(--husk)");
        var kv = share > 0.25 ? 1 : 0, kl = el * 0.38, kw = ew * 0.55;
        P.kernels.setAttribute("d", kv ? "M0 " + (-el + kl) + " C " + (-kw) + " " + (-el + kl * 0.6) + ", " + (-kw) + " " + (-el + 2) + ", 0 " + (-el - 1) + " C " + kw + " " + (-el + 2) + ", " + kw + " " + (-el + kl * 0.6) + ", 0 " + (-el + kl) + " Z" : "");
        P.huskLine.setAttribute("d", "M0 -2 Q " + (ew * 0.35) + " " + (-el * 0.5) + ", 0 " + (-el * 0.92));
        var silk = st.dvs > 0.9 && st.dvs < 1.5;
        P.silks.forEach(function (sk, i) {
          var a = -Math.PI / 2 + (i - 2.5) * 0.22, len = 7 + (i % 3) * 3;
          sk.setAttribute("d", silk ? "M0 " + (-el) + " q " + (Math.cos(a) * len * 0.5) + " " + (Math.sin(a) * len * 0.6) + ", " + (Math.cos(a) * len) + " " + (Math.sin(a) * len + 3) : "");
        });
      });
    }
    function drop(G, act) {
      var k = kind(act);
      if (k === "none" || reduceMotion) return;
      for (var i = 0; i < 20; i++) {
        var x = 96 + rnd(i, 3) * 368, y0 = 12 + rnd(i, 4) * 60, el;
        el = k === "water" ? S("path", { d: "M0 -6 C 3 -1, 4 2, 0 5 C -4 2, -3 -1, 0 -6Z", fill: "var(--water)" }, G.particles)
                           : S("circle", { r: 2.6, fill: "var(--granule)" }, G.particles);
        if (!el.animate) { el.remove(); continue; }
        (function (el, x, y0, i) {
          var a = el.animate([{ transform: "translate(" + x + "px," + y0 + "px)", opacity: 0 }, { opacity: 1, offset: .15 },
            { transform: "translate(" + x + "px," + (GY + 4) + "px)", opacity: .95, offset: .9 }, { transform: "translate(" + x + "px," + (GY + 10) + "px)", opacity: 0 }],
            { duration: 950 + (i % 5) * 80, delay: (i % 6) * 60, easing: "cubic-bezier(.4,0,.8,.6)", fill: "forwards" });
          a.onfinish = function () { el.remove(); };
        })(el, x, y0, i);
      }
    }

    /* --- timeline: every decision is a node (click / tap / Enter to inspect it) */
    var x0 = 28, x1 = 532, LY = 36;
    function TX(d) { return x0 + (x1 - x0) * d / dayEnd; }
    S("line", { x1: x0, x2: x1, y1: LY, y2: LY, stroke: "var(--rule-strong)", "stroke-width": 2, "stroke-linecap": "round" }, lineSvg);
    T("text", { x: x0, y: 66, "font-size": 13.5, fill: "var(--muted)" }, "Sowing", lineSvg);
    T("text", { x: x1, y: 66, "font-size": 13.5, fill: "var(--muted)", "text-anchor": "end" }, "Harvest", lineSvg);
    var prog = S("line", { x1: x0, x2: x0, y1: LY, y2: LY, stroke: "var(--green)", "stroke-width": 3, "stroke-linecap": "round" }, lineSvg);
    var nodes = steps.map(function (s, k) {
      var kd = kind(s.action), x = TX(s.day);
      var prevX = k ? TX(steps[k - 1].day) : x0 - 16, nextX = k < n - 1 ? TX(steps[k + 1].day) : x1 + 16;
      var g = S("g", { class: "node", tabindex: 0, role: "button", "aria-label": "Day " + s.day + (s.date ? ", " + s.date : "") + ": " + (kd === "none" ? "wait" : s.action) }, lineSvg);
      S("rect", { class: "hit", x: (prevX + x) / 2, y: 2, width: (nextX - prevX) / 2, height: LY + 14, rx: 6 }, g);
      S("circle", { class: "ring", cx: x, cy: LY - 9, r: 10, fill: "none", stroke: "transparent" }, g);
      var m = S("g", { opacity: .3 }, g);
      if (kd === "water") S("path", { d: "M" + x + " " + (LY - 16) + " c 3.4 4.4, 5.6 7.6, 5.6 10 a 5.6 5.6 0 0 1 -11.2 0 c 0 -2.4, 2.2 -5.6, 5.6 -10z", fill: "var(--water)" }, m);
      else if (kd === "fert") S("circle", { cx: x, cy: LY - 9, r: 5.2, fill: "var(--granule)" }, m);
      else S("line", { x1: x, x2: x, y1: LY - 12, y2: LY - 5, stroke: "var(--faint)", "stroke-width": 2.4, "stroke-linecap": "round" }, m);
      T("title", {}, "Day " + s.day + (s.date ? " · " + s.date : "") + " — " + verb(s.action), g);
      g.addEventListener("click", function () { pauseAt(k); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pauseAt(k); }
        else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); var j = clamp(k + (e.key === "ArrowRight" ? 1 : -1), 0, n); allNodes[j].focus(); pauseAt(j); }
      });
      return { g: g, m: m };
    });
    // harvest: a real node at the end of the line (last stop of the arrow-key navigation)
    function harvestDate() {
      var s = steps[n - 1], y = ep.scenario && ep.scenario.year;
      if (!s.date || !y) return "";
      var d = new Date(s.date + ", " + y); if (isNaN(d)) return "";
      d.setDate(d.getDate() + (dayEnd - s.day));
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    }
    var hDate = harvestDate();
    var hg = S("g", { class: "node", tabindex: 0, role: "button", "aria-label": "Harvest, day " + dayEnd + (hDate ? ", " + hDate : "") }, lineSvg);
    S("rect", { class: "hit", x: (TX(steps[n - 1].day) + x1) / 2, y: 2, width: x1 + 24 - (TX(steps[n - 1].day) + x1) / 2, height: LY + 14, rx: 6 }, hg);
    S("circle", { class: "ring", cx: x1, cy: LY, r: 11, fill: "none", stroke: "transparent" }, hg);
    var hm = S("g", { opacity: .45 }, hg);
    S("path", { d: "M" + (x1 - 4.5) + " " + (LY - 4) + " l 4.5 -11 l 4.5 11 z", fill: "var(--husk-old)" }, hm);
    T("title", {}, "Harvest — day " + dayEnd + (hDate ? " · " + hDate : ""), hg);
    hg.addEventListener("click", function () { pauseAt(n); });
    hg.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pauseAt(n); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); allNodes[n - 1].focus(); pauseAt(n - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); }
    });
    var allNodes = nodes.map(function (nd) { return nd.g; }).concat([hg]);
    var amtLbl = T("text", { x: x0, y: LY - 23, "font-size": 13.5, "text-anchor": "middle", fill: "var(--ink-2)", "font-weight": 600 }, "", lineSvg);
    var cursor = S("circle", { cx: x0, cy: LY, r: 6, fill: "var(--surface)", stroke: "var(--green)", "stroke-width": 2.6, "pointer-events": "none" }, lineSvg);
    function setDay(d) { prog.setAttribute("x2", TX(d)); cursor.setAttribute("cx", TX(d)); }
    function markUpTo(k) { nodes.forEach(function (nd, i) { nd.m.setAttribute("opacity", i <= k ? 1 : .3); }); }
    function select(k) { allNodes.forEach(function (g, i) { g.classList.toggle("sel", i === k); }); hm.setAttribute("opacity", k === n ? 1 : .45); }
    function label(k) {
      var a = amount(steps[k].action);
      amtLbl.textContent = a; amtLbl.setAttribute("x", clamp(TX(steps[k].day), x0 + 26, x1 - 26));
    }

    /* --- captions: plain words, exact numbers on hover */
    function stagePhrase(dvs) { return dvs < 0 ? "Just sown" : dvs < 0.8 ? "Plants growing, not yet flowering" : dvs < 0.95 ? "Tassels about to emerge" : dvs < 1.3 ? "Plants flowering" : dvs < 1.9 ? "Grain filling" : "Crop near maturity"; }
    function soilPhrase(s) {
      var a = s.action || "";
      if (/irrigat/i.test(a) || !/nitrogen|phosph|potass/i.test(a)) return s.moisture < 0.33 ? "the soil is dry" : s.moisture < 0.42 ? "the soil is drying" : "the soil is moist";
      var nut = /potass/i.test(a) ? ["potassium", s.soil_k] : /phosph/i.test(a) ? ["phosphorus", s.soil_p] : ["nitrogen", s.soil_n];
      return "soil " + nut[0] + " is " + (nut[1] < 1 ? "nearly gone" : nut[1] < 10 ? "very low" : nut[1] < 30 ? "low" : "adequate");
    }
    function verb(a) {
      var k = kind(a), m = amount(a);
      if (k === "water") return "irrigates " + m;
      if (k === "fert") return "applies " + m + " " + ((a.match(/(nitrogen|phosphorus|potassium)/i) || ["", "fertilizer"])[1]).toLowerCase();
      return "waits";
    }
    var tick = $("#stTick"), rows = $("#stRows");
    function showTick(k) {
      var s = steps[k];
      tick.textContent = "Day " + s.day + (s.date ? " · " + s.date : "") + " — the agent " + verb(s.action);
      tick.classList.toggle("wait", kind(s.action) === "none");
    }
    function showCard(k) {
      var s = steps[k], sees = $("#stSees");
      sees.textContent = stagePhrase(s.stage) + "; " + soilPhrase(s) + ".";
      sees.title = "Day " + s.day + (s.date ? " (" + s.date + ")" : "") + " · development stage " + fmt(s.stage, 2) + " · soil moisture " + fmt(s.moisture, 3) +
        " · soil N " + fmt(s.soil_n, 2) + " kg/ha";
      $("#stThinks").textContent = s.excerpt;
      setPill($("#stDoes"), kind(s.action) === "none" ? "Wait (no action)" : s.action);
      rows.classList.add("on");
    }

    /* --- harvest card: RL-trained vs the untrained same model on the same scenario (numbers from hero.compare) */
    var C = ep.compare || {}, sgn = function (v, d) { return (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), d); };
    var big = $("#stBig");
    big.textContent = sgn(C.profit_gain_pct, 0) + "% profit";
    big.title = "Profit = grain yield − input costs, both in kg of grain per hectare (WOFOST " + (ep.crop || "maize") + (ep.scenario && ep.scenario.year ? ", " + ep.scenario.year + " weather" : "") +
      "). RL-trained " + fmt(C.rl.profit) + " vs untrained " + fmt(C.untrained.profit) + " kg/ha.";
    $("#stChipY").textContent = sgn(C.yield_gain_t, 1) + " t/ha grain yield";
    $("#stChipN").textContent = sgn(C.n_diff, 0) + " kg/ha nitrogen";
    $("#stMute").textContent = "RL-trained " + fmt(C.rl.yield_kg_ha / 1000, 1) + " t/ha · Untrained " + fmt(C.untrained.yield_kg_ha / 1000, 1) + " t/ha";
    $("#stCapLine").textContent = "A real test episode in WOFOST (maize). Every decision is made by Qwen3-4B trained with RL.";
    $("#story").title = "Plant drawing is schematic: height, leaves, tassel and silks follow the observed development stage, the ear the grain weight, soil shade the root-zone moisture, dots the soil nitrogen.";
    var G = buildScene(scene), cap = $("#stCap"), end = $("#stEnd");

    /* --- playback */
    var cur = SOW, raf = null, timers = [], playing = true, visible = true, seq = 0;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function stopAll() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); }
    function tween(to, ms, done) {
      var from = cur, t0 = performance.now();
      cancelAnimationFrame(raf);
      (function frame(tt) {
        var u = Math.min(1, (tt - t0) / ms), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        cur = mix(from, to, e); drawState(G, cur); setDay(cur.day);
        if (u < 1) raf = requestAnimationFrame(frame); else done();
      })(t0);
    }
    function reset() { cur = SOW; drawState(G, cur); setDay(0); markUpTo(-1); amtLbl.textContent = ""; tick.textContent = "Sowing"; rows.classList.remove("on"); end.classList.remove("on"); hm.setAttribute("opacity", .45); }
    function step(k) {
      if (!playing || !visible) return;
      var my = ++seq;
      if (k >= n) {
        rows.classList.remove("on"); amtLbl.textContent = ""; tick.textContent = "Harvest";
        tween(FINAL, 1300, function () {
          if (my !== seq) return;
          showHarvest();
          later(function () { reset(); later(function () { step(0); }, 900); }, 6500);
        });
        return;
      }
      var key = moments.indexOf(k) >= 0;
      rows.classList.remove("on");
      tween(stateAt(k), k === 0 ? 1000 : key ? 900 : 520, function () {
        if (my !== seq) return;
        markUpTo(k); label(k); showTick(k); drop(G, steps[k].action);
        if (key) { later(function () { showCard(k); }, 350); later(function () { step(k + 1); }, 4600); }
        else later(function () { step(k + 1); }, kind(steps[k].action) === "none" ? 520 : 820);
      });
    }
    var playBtn = $("#stPlay"), resumeBtn = $("#stResume"), pausedAt = null;
    function showHarvest() {
      cur = FINAL; drawState(G, cur); setDay(dayEnd); markUpTo(n - 1); rows.classList.remove("on");
      tick.textContent = "Harvest" + (hDate ? " · " + hDate : ""); amtLbl.textContent = "";
      end.style.top = (cap.offsetTop - 4) + "px"; end.classList.add("on"); hm.setAttribute("opacity", 1);
    }
    function pauseAt(k) {
      stopAll(); playing = false; pausedAt = k;
      clear(playBtn); icon(playBtn, "#i-play"); playBtn.setAttribute("aria-label", "Play");
      if (k >= n) { select(n); showHarvest(); resumeBtn.hidden = false; return; }
      end.classList.remove("on"); cur = stateAt(k); drawState(G, cur); setDay(cur.day); markUpTo(k); label(k); showTick(k); showCard(k); select(k);
      resumeBtn.hidden = false;
    }
    function setPlaying(p) {
      playing = p; clear(playBtn); icon(playBtn, p ? "#i-pause" : "#i-play"); playBtn.setAttribute("aria-label", p ? "Pause" : "Play");
      stopAll();
      if (!p) return;
      resumeBtn.hidden = true; select(-1);
      if (pausedAt !== null && pausedAt < n) { var k = pausedAt; pausedAt = null; rows.classList.remove("on"); step(k + 1); }
      else if (pausedAt !== null) { pausedAt = null; reset(); step(0); }
      else { reset(); step(0); }
    }
    playBtn.addEventListener("click", function () { if (!playing) setPlaying(true); else { var k = Math.max(0, nodes.filter(function (nd) { return +nd.m.getAttribute("opacity") === 1; }).length - 1); pauseAt(k); } });
    resumeBtn.addEventListener("click", function () { setPlaying(true); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
      var v = es[0].isIntersecting;
      if (v && !visible) { visible = true; if (playing) { reset(); step(0); } } else if (!v) { visible = false; stopAll(); }
    }).observe($("#story"));
    // for screenshots / review: jump to step k (or "end")
    window.__storyAt = function (k) {
      pauseAt(k === "end" ? n : k);
    };
    if (reduceMotion) pauseAt(moments[0] || 0); else { reset(); step(0); }
  })();

  /* ---------------------------------------------------------------- Section 03: framework figure (redraw of the paper's Figure 1a) */
  (function frameworkFig() {
    var host = $("#fwSvg");
    if (!host) return;
    function leaf(g, y0, s, L, droop, fill) {
      var w = 2 + L * 0.06, tipY = Math.min(y0 - L * (0.1 - droop * 1.6), -6);
      var p1 = [s * L * 0.3, y0 - L * 0.42], p2 = [s * L * 0.72, Math.min(y0 - L * (0.42 - droop), -10)], p3 = [s * L, tipY];
      S("path", { d: "M0 " + (y0 - 2) + " C " + p1[0] + " " + (p1[1] - w) + ", " + p2[0] + " " + (p2[1] - w * 0.7) + ", " + p3[0] + " " + p3[1] +
        " C " + p2[0] + " " + (p2[1] + w * 0.5) + ", " + p1[0] + " " + (p1[1] + w * 1.1) + ", 0 " + (y0 + 3) + " Z", fill: fill }, g);
      S("path", { d: "M0 " + y0 + " C " + p1[0] + " " + p1[1] + ", " + p2[0] + " " + p2[1] + ", " + p3[0] + " " + p3[1], fill: "none", stroke: "var(--leaf-2)", "stroke-width": .9, opacity: .5 }, g);
    }
    function maize(parent, x, y, t, k) {
      // t in (0,1]: growth stage left to right; k: scale
      var g = S("g", { transform: "translate(" + x + "," + y + ") scale(" + k + ")" }, parent);
      // roots
      var nr = 3 + Math.round(4 * t), rl = 10 + 26 * t;
      for (var r = 0; r < nr; r++) { var a = Math.PI * (0.15 + 0.7 * r / Math.max(1, nr - 1)); S("path", { d: "M0 2 q " + (Math.cos(a) * rl * 0.4) + " " + (rl * 0.5) + ", " + (Math.cos(a) * rl) + " " + (Math.sin(a) * rl), fill: "none", stroke: "var(--root)", "stroke-width": 1.3, "stroke-linecap": "round" }, g); }
      var H = 14 + 170 * Math.pow(t, 1.15), bw = 1.6 + 3 * t, tw = 1 + t;
      S("path", { d: "M" + (-bw) + " 0 C " + (-bw) + " " + (-H * .5) + ", " + (-tw - 1) + " " + (-H * .8) + ", " + (-tw) + " " + (-H) + " L " + tw + " " + (-H) + " C " + (tw + 1) + " " + (-H * .8) + ", " + bw + " " + (-H * .5) + ", " + bw + " 0 Z", fill: "var(--stem)" }, g);
      var n = Math.max(2, Math.round(2 + 8 * t)), Lmax = 16 + 50 * Math.pow(t, .8);
      for (var i = 0; i < n; i++) {
        var fr = n === 1 ? .5 : i / (n - 1), y0 = -H * (0.08 + 0.82 * fr), s = i % 2 ? 1 : -1;
        var L = Lmax * (0.55 + 0.45 * Math.sin(Math.PI * (0.2 + 0.65 * (1 - Math.abs(fr - 0.45)))));
        leaf(g, y0, s, L, 0.16 + 0.2 * (1 - fr), i % 3 === 1 ? "var(--leaf-2b)" : "var(--leaf)");
      }
      if (t > 0.7) for (var j = 0; j < 5; j++) {
        var len = 7 + 12 * Math.min(1, (t - 0.7) / 0.3), ang = -Math.PI / 2 + (j - 2) * 0.35;
        S("path", { d: "M0 " + (-H + 2) + " q " + (Math.cos(ang) * len * 0.5) + " " + (Math.sin(ang) * len * 0.8) + ", " + (Math.cos(ang) * len) + " " + (Math.sin(ang) * len + (j === 2 ? 0 : len * 0.3) - 2), fill: "none", stroke: "var(--tassel)", "stroke-width": 1.7, "stroke-linecap": "round" }, g);
      }
      if (t > 0.82) {
        var eg = S("g", { transform: "translate(-3," + (-H * 0.44) + ") rotate(-28)" }, g), el = 22 * t, ew = el * 0.3;
        S("path", { d: "M0 0 C " + (-ew) + " " + (-el * .25) + ", " + (-ew * .9) + " " + (-el * .8) + ", 0 " + (-el) + " C " + (ew * .9) + " " + (-el * .8) + ", " + ew + " " + (-el * .25) + ", 0 0 Z", fill: "var(--husk)", stroke: "var(--leaf-2)", "stroke-width": .8 }, eg);
        for (var q = 0; q < 4; q++) S("path", { d: "M0 " + (-el) + " q " + ((q - 1.5) * 2) + " -4, " + ((q - 1.5) * 4) + " -7", fill: "none", stroke: "var(--silk)", "stroke-width": 1, "stroke-linecap": "round" }, eg);
      }
      return g;
    }
    function arrow(svg, x1, y1, x2, y2, color, w) {
      var g = S("g", {}, svg);
      S("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color, "stroke-width": w || 2.6, "stroke-linecap": "round" }, g);
      var a = Math.atan2(y2 - y1, x2 - x1), h = 11;
      S("path", { d: "M" + (x2 - h * Math.cos(a - .45)) + " " + (y2 - h * Math.sin(a - .45)) + " L " + x2 + " " + y2 + " L " + (x2 - h * Math.cos(a + .45)) + " " + (y2 - h * Math.sin(a + .45)), fill: "none", stroke: color, "stroke-width": w || 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      return g;
    }
    function label(svg, x, y, word, sym, color, anchor, size) {
      var t = S("text", { x: x, y: y, "text-anchor": anchor || "middle", "font-size": size || 20, "font-weight": 600, fill: color || "var(--ink)" }, svg);
      var a = S("tspan", {}, t); a.textContent = word + " ";
      var b = S("tspan", { "font-style": "italic", fill: "var(--green)" }, t); b.textContent = sym;
      return t;
    }
    function packet(svg, d, dur, begin, color) {
      if (reduceMotion) return;
      var c = S("circle", { r: 5, fill: color, opacity: 0 }, svg);
      var m = S("animateMotion", { path: d, dur: dur + "s", begin: begin + "s", repeatCount: "indefinite", keyPoints: "0;1;1", keyTimes: "0;0.45;1", calcMode: "linear" }, c);
      S("animate", { attributeName: "opacity", values: "0;1;1;0;0", keyTimes: "0;0.05;0.4;0.45;1", dur: dur + "s", begin: begin + "s", repeatCount: "indefinite" }, c);
    }
    function scene(svg, x, y, w, h, sc) {
      var id = "fwClip" + Math.round(w);
      var defs = S("defs", {}, svg), cp = S("clipPath", { id: id }, defs);
      S("rect", { x: x, y: y, width: w, height: h, rx: 14 }, cp);
      var lg = S("linearGradient", { id: id + "s", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      S("stop", { offset: "0", "stop-color": "var(--sky-top)" }, lg); S("stop", { offset: "1", "stop-color": "var(--sky-bot)" }, lg);
      var g = S("g", { "clip-path": "url(#" + id + ")" }, svg);
      S("rect", { x: x, y: y, width: w, height: h, fill: "url(#" + id + "s)" }, g);
      S("circle", { cx: x + w * 0.16, cy: y + h * 0.2, r: 20 * sc, fill: "var(--sun)" }, g);
      [[0.3, 0.2, 1], [0.62, 0.12, .8], [0.86, 0.26, .9]].forEach(function (c) {
        var cx = x + w * c[0], cy = y + h * c[1], r = 16 * sc * c[2];
        S("path", { d: "M" + (cx - 2.4 * r) + " " + (cy + r * .6) + " a " + r + " " + r + " 0 0 1 " + (r * 1.1) + " " + (-r * .9) + " a " + (r * 1.2) + " " + (r * 1.2) + " 0 0 1 " + (r * 2.2) + " " + (-r * .2) + " a " + r + " " + r + " 0 0 1 " + (r * 1.3) + " " + (r * 1.1) + " z", fill: "var(--cloud)" }, g);
      });
      var gy = y + h * 0.72;
      S("rect", { x: x, y: gy, width: w, height: h - (gy - y), fill: "var(--soil-dry)" }, g);
      S("rect", { x: x, y: gy, width: w * 0.45, height: h - (gy - y), fill: "var(--soil-wet)", opacity: .35 }, g);
      S("line", { x1: x, x2: x + w, y1: gy, y2: gy, stroke: "var(--soil-line)", "stroke-width": 2 }, g);
      for (var i = 0; i < 6; i++) maize(g, x + w * (0.1 + 0.16 * i), gy, (i + 1) / 6, sc * 0.86);
      // water and nutrition cues
      var fs = 19 * Math.max(sc, .85), ly = gy + (h - (gy - y)) * 0.68;
      for (var d = 0; d < 3; d++) { var dx = x + w * 0.06 + d * 14 * sc, dy = ly - 8 * sc; S("path", { d: "M" + dx + " " + (dy - 8 * sc) + " c " + (3 * sc) + " " + (4 * sc) + ", " + (5 * sc) + " " + (6 * sc) + ", " + (5 * sc) + " " + (8 * sc) + " a " + (5 * sc) + " " + (5 * sc) + " 0 0 1 " + (-10 * sc) + " 0 c 0 " + (-2 * sc) + ", " + (2 * sc) + " " + (-4 * sc) + ", " + (5 * sc) + " " + (-8 * sc) + "z", fill: "var(--water)" }, g); }
      T("text", { x: x + w * 0.06 + 44 * sc, y: ly, "font-size": fs, "font-weight": 600, fill: "var(--soil-ink)" }, "water", g);
      var nx = x + w * 0.62;
      for (var q = 0; q < 4; q++) S("circle", { cx: nx - 44 * sc + q * 9 * sc, cy: ly - 6 * sc - (q % 2) * 6 * sc, r: 3.2 * sc, fill: "var(--n-dot)" }, g);
      T("text", { x: nx, y: ly, "font-size": fs, "font-weight": 600, fill: "var(--soil-ink)" }, "nutrition", g);
      return gy;
    }
    function interfaceBand(svg, x, y, w, h, chipW, fs) {
      S("path", { d: "M" + x + " " + y + " H " + (x + w) + " V " + (y + h - 20) + " q 0 20 -20 20 H " + (x + 20) + " q -20 0 -20 -20 Z", fill: "var(--blue-soft)" }, svg);
      S("line", { x1: x, x2: x + w, y1: y, y2: y, stroke: "var(--blue-line)", "stroke-width": 1.5 }, svg);
      var gap = 12, total = 3 * chipW + 2 * gap, cx0 = x + (w - total) / 2;
      ["DSSAT", "WOFOST", "Cycles"].forEach(function (n, i) {
        var cx = cx0 + i * (chipW + gap);
        S("rect", { x: cx, y: y + 16, width: chipW, height: 40, rx: 10, fill: "var(--surface)", stroke: "var(--blue-line)", "stroke-width": 1.5 }, svg);
        T("text", { x: cx + chipW / 2, y: y + 42, "text-anchor": "middle", "font-size": fs, "font-weight": 650, fill: "var(--ink)" }, n, svg);
      });
      T("text", { x: x + w / 2, y: y + h - 18, "text-anchor": "middle", "font-size": 16.5, "font-weight": 650, "letter-spacing": 2, fill: "var(--blue)" }, "UNIFIED ENV INTERFACE", svg);
    }
    function policyBox(svg, x, y, w, h, fs) {
      S("rect", { x: x, y: y, width: w, height: h, rx: 20, fill: "var(--policy-bg)" }, svg);
      var cx = x + w / 2, cy = y + h * 0.36, r = 14;
      S("rect", { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, rx: 4, fill: "none", stroke: "var(--policy-ink)", "stroke-width": 2.2 }, svg);
      S("rect", { x: cx - 6, y: cy - 6, width: 12, height: 12, rx: 2, fill: "var(--policy-ink)" }, svg);
      [-8, 0, 8].forEach(function (o) {
        S("line", { x1: cx + o, x2: cx + o, y1: cy - r - 6, y2: cy - r, stroke: "var(--policy-ink)", "stroke-width": 2 }, svg);
        S("line", { x1: cx + o, x2: cx + o, y1: cy + r, y2: cy + r + 6, stroke: "var(--policy-ink)", "stroke-width": 2 }, svg);
        S("line", { y1: cy + o, y2: cy + o, x1: cx - r - 6, x2: cx - r, stroke: "var(--policy-ink)", "stroke-width": 2 }, svg);
        S("line", { y1: cy + o, y2: cy + o, x1: cx + r, x2: cx + r + 6, stroke: "var(--policy-ink)", "stroke-width": 2 }, svg);
      });
      T("text", { x: cx, y: y + h * 0.8, "text-anchor": "middle", "font-size": fs, "font-weight": 700, fill: "var(--policy-ink)", "font-family": "Inter Tight, Inter, sans-serif" }, "LLM Policy", svg);
    }
    function rlBox(svg, x, y, w, h, fs) {
      S("rect", { x: x, y: y, width: w, height: h, rx: 18, fill: "var(--green-soft)", stroke: "var(--green-line)", "stroke-width": 2, "stroke-dasharray": "7 6" }, svg);
      T("text", { x: x + w / 2, y: y + 32, "text-anchor": "middle", "font-size": fs, "font-weight": 650, fill: "var(--green)" }, "RL update from trajectories", svg);
      var cw = 52, gap = 22, cx0 = x + (w - (3 * cw + 2 * gap)) / 2;
      ["s", "a", "r"].forEach(function (l, i) {
        var cx = cx0 + i * (cw + gap), cy = y + 48;
        for (var k = 2; k >= 0; k--) S("rect", { x: cx + k * 4, y: cy + k * 4, width: cw, height: 38, rx: 8, fill: "var(--surface)", stroke: "var(--green-line)", "stroke-width": 1.5 }, svg);
        T("text", { x: cx + cw / 2, y: cy + 27, "text-anchor": "middle", "font-size": 21, "font-style": "italic", "font-weight": 600, fill: "var(--green)" }, l, svg);
      });
    }
    function wide() {
      var svg = S("svg", { viewBox: "0 0 1160 470", role: "img", "aria-hidden": "true" });
      S("rect", { x: 6, y: 10, width: 528, height: 450, rx: 22, fill: "var(--surface)", stroke: "var(--green-line)", "stroke-width": 2 }, svg);
      scene(svg, 24, 28, 492, 300, 1);
      interfaceBand(svg, 7, 344, 526, 115, 128, 19);
      S("rect", { x: 6, y: 10, width: 528, height: 450, rx: 22, fill: "none", stroke: "var(--green-line)", "stroke-width": 2 }, svg);
      arrow(svg, 562, 176, 722, 176, "var(--ink-2)"); label(svg, 642, 158, "state", "s");
      arrow(svg, 722, 248, 562, 248, "var(--ink-2)"); label(svg, 642, 284, "action", "a");
      arrow(svg, 562, 396, 722, 396, "var(--green)"); label(svg, 642, 378, "reward", "r", "var(--green)");
      packet(svg, "M562 176 H722", 3.6, 0, "var(--ink-2)"); packet(svg, "M722 248 H562", 3.6, 1.2, "var(--ink-2)"); packet(svg, "M562 396 H722", 3.6, 2.4, "var(--green)");
      policyBox(svg, 744, 104, 408, 180, 36);
      rlBox(svg, 744, 342, 408, 118, 19);
      arrow(svg, 948, 336, 948, 292, "var(--green)"); T("text", { x: 962, y: 320, "font-size": 18, "font-weight": 600, fill: "var(--green)" }, "policy update", svg);
      return svg;
    }
    function narrow() {
      var svg = S("svg", { viewBox: "0 0 360 820", role: "img", "aria-hidden": "true" });
      S("rect", { x: 2, y: 2, width: 336, height: 400, rx: 18, fill: "var(--surface)", stroke: "var(--green-line)", "stroke-width": 2 }, svg);
      scene(svg, 14, 14, 312, 240, .66);
      interfaceBand(svg, 3, 266, 334, 135, 94, 17);
      S("rect", { x: 2, y: 2, width: 336, height: 400, rx: 18, fill: "none", stroke: "var(--green-line)", "stroke-width": 2 }, svg);
      arrow(svg, 130, 410, 130, 486, "var(--ink-2)"); label(svg, 120, 454, "state", "s", null, "end", 17);
      arrow(svg, 210, 486, 210, 410, "var(--ink-2)"); label(svg, 220, 454, "action", "a", null, "start", 17);
      policyBox(svg, 20, 494, 300, 130, 28);
      rlBox(svg, 20, 700, 300, 112, 16.5);
      arrow(svg, 120, 694, 120, 632, "var(--green)"); T("text", { x: 112, y: 668, "text-anchor": "end", "font-size": 16.5, "font-weight": 600, fill: "var(--green)" }, "policy update", svg);
      var rp = S("path", { d: "M338 300 H352 V756 H328", fill: "none", stroke: "var(--green)", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      S("path", { d: "M336 750 L 328 756 L 336 762", fill: "none", stroke: "var(--green)", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      label(svg, 344, 668, "reward", "r", "var(--green)", "end", 16.5);
      packet(svg, "M130 410 V486", 3.6, 0, "var(--ink-2)"); packet(svg, "M210 486 V410", 3.6, 1.2, "var(--ink-2)"); packet(svg, "M352 300 V756 H330", 3.6, 2.4, "var(--green)");
      return svg;
    }
    var mode = null;
    function render() {
      var m = host.clientWidth < 700 ? "n" : "w";
      if (m === mode) return;
      mode = m; clear(host); host.appendChild(m === "n" ? narrow() : wide());
    }
    render();
    window.addEventListener("resize", function () { render(); });
  })();

  /* ---------------------------------------------------------------- Section 02: "Same field, different prompt" (chips from the paired test prompts) */
  (function ireStrip() {
    var P = D.schema_pairs, tabsEl = $("#ireTabs");
    if (!P || !tabsEl) return;
    var SAY = { observation: "The test prompt keeps everything else but drops the four soil-resource fields.",
                action: "The test prompt offers a different set of management actions.",
                reward: "The test prompt asks for profit instead of yield." };
    function fieldName(l) {
      var M = [[/^Finish flag/, "season end"], [/^Development stage/, "crop stage"], [/^Storage organ dry matter/, "crop weight"],
               [/soil nitrogen/, "soil N"], [/soil phosphorus/, "soil P"], [/soil potassium/, "soil K"], [/soil moisture/, "soil moisture"],
               [/^Cumulative nitrogen/, "N applied"], [/^Cumulative phosphorus/, "P applied"], [/^Cumulative potassium/, "K applied"],
               [/^Cumulative irrigation/, "water applied"], [/solar radiation/, "radiation"], [/air temperature/, "temperature"], [/rainfall/, "rainfall"]];
      for (var i = 0; i < M.length; i++) if (M[i][0].test(l)) return M[i][1];
      return l.replace(/\s*\(.*$/, "").split(/\s+/).slice(0, 3).join(" ").toLowerCase();
    }
    function actName(l) {
      l = l.replace(/^- /, "").replace(/\.$/, "");
      var nums = (l.match(/\d+(?:\.\d+)?/g) || []).map(function (x) { return String(+x); });
      var rng = nums.length > 1 ? " " + nums[0] + "–" + nums[nums.length - 1] : "";
      if (/^Do nothing/i.test(l)) return "do nothing";
      var m = l.match(/^Apply (\w+) fertilizer/); if (m) return m[1] + rng + " kg/ha";
      if (/^Irrigate/i.test(l)) return "irrigation" + rng + " cm";
      return l;
    }
    function chip(parent, text, cls, tip) { var c = h("span", "pchip" + (cls ? " " + cls : ""), text, parent); if (tip) c.title = tip; return c; }
    function math(f, rightSide) {
      var t = f.replace(/profit_wso_kg_ha/, "profit").replace(/final_WSO_kg_ha/g, "final yield").replace(/total_N_kg_ha/g, "N").replace(/total_P_kg_ha/g, "P")
               .replace(/total_K_kg_ha/g, "K").replace(/total_irrig_cm/g, "irrigation (cm)").replace(/\s\*\s/g, "·").replace(/\s-\s/g, " − ");
      return t;
    }
    function col(host, title, cls) { var c = h("div", "pcol " + (cls || ""), null, host); h("div", "pcol-hd", title, c); var body = h("div", "pcol-body", null, c); return [c, body]; }
    function show(tab) {
      var v = P[tab], host = $("#ireDiff"); clear(host);
      $("#ireSay").textContent = SAY[tab];
      var L = col(host, "Training prompt", "l"), R = col(host, "Test prompt", "r");
      L[0].title = "verbatim prompt:\n" + v.a.block; R[0].title = "verbatim prompt:\n" + v.b.block;
      if (tab === "observation") {
        var have = {}; v.b.fields.forEach(function (f) { have[f[0]] = 1; });
        var pairs = [];
        v.a.fields.forEach(function (f) {
          var n = fieldName(f[0]);
          var lc = chip(L[1], n, null, "- " + f[0] + ": " + f[1]);
          var rc = have[f[0]] ? chip(R[1], n, null, "- " + f[0] + ": " + f[1]) : chip(R[1], "not shown", "gone", n + " (not in the test prompt)");
          pairs.push([lc, rc]);
        });
        // same chip widths on both sides so every chip sits in the same place
        requestAnimationFrame(function () { pairs.forEach(function (pr) { var w = Math.max(pr[0].getBoundingClientRect().width, pr[1].getBoundingClientRect().width) / (parseFloat(document.documentElement.style.zoom) || 1); pr[0].style.width = pr[1].style.width = w + "px"; }); });
      } else if (tab === "action") {
        var la = v.a.actions.filter(function (l) { return !/^Unavailable/.test(l); }), ra = v.b.actions.filter(function (l) { return !/^Unavailable/.test(l); });
        la.forEach(function (l) { chip(L[1], actName(l), null, l); if (ra.indexOf(l) >= 0) chip(R[1], actName(l), null, l); else chip(R[1], "not offered", "gone", actName(l) + " (not offered in the test prompt)"); });
        ra.forEach(function (l) { if (la.indexOf(l) < 0) chip(R[1], actName(l), "new", l); });
      } else {
        h("div", "pformula", math(v.a.formula), L[1]);
        var fr = h("div", "pformula", null, R[1]), t = math(v.b.formula), m = t.match(/^(profit = final yield)(.*)$/);
        if (m) { fr.appendChild(document.createTextNode(m[1])); h("span", "new", m[2], fr); } else { fr.textContent = t; fr.className += " new"; }
        h("div", "punit", "in kg of yield-equivalent per hectare", R[1]);
        var lt = h("div", "pformula", null, L[1]); lt.className = "punit"; lt.textContent = "in kg of yield per hectare";
      }
    }
    tabs(tabsEl, function (b) { show(b.getAttribute("data-t")); });
    show("observation");
    window.__ireShow = function (t) { $$("button", tabsEl).forEach(function (x) { x.setAttribute("aria-selected", x.getAttribute("data-t") === t ? "true" : "false"); }); show(t); };
  })();

  /* ---------------------------------------------------------------- Section 04: same field, different interface (Tier 2 paired test episodes) */
  (function ifPairs() {
    var P = D.schema_pairs, tabsEl = $("#ifTabs");
    if (!P || !tabsEl) return;
    var ctx = $("#ifCtx"), A = $("#ifA"), B = $("#ifB");
    var SUB = { observation: "What the agent sees", action: "What the agent can do", reward: "What the agent is asked to optimize" };
    var RES = /^(Available soil nitrogen|Available soil phosphorus|Available soil potassium|Root-zone soil moisture)/;
    function splitLabel(l) { var m = l.match(/^(.*?)\s*\(([^)]*)\)\s*$/); return m ? [m[1], m[2]] : [l, ""]; }
    function fmtVal(v, unit) { return v + (unit && !/fraction|1 means/.test(unit) ? " " + unit.replace(/;.*$/, "") : ""); }
    function body(tab, v, side, other) {
      var wrap = h("div", "if-body");
      if (tab === "observation") {
        var shown = {}; side.fields.forEach(function (f) { shown[f[0]] = f[1]; });
        var all = (v.a.fields.length >= v.b.fields.length ? v.a.fields : v.b.fields);
        var diff = all.filter(function (f) { return RES.test(f[0]); });
        var ul = h("ul", "if-fields", null, wrap);
        diff.forEach(function (f) {
          var lu = splitLabel(f[0]), li = h("li", shown[f[0]] === undefined ? "gone" : null, null, ul);
          h("span", "n", lu[0], li);
          h("span", "v", shown[f[0]] === undefined ? "not in prompt" : fmtVal(shown[f[0]].replace(/\s*\(.*$/, ""), lu[1]), li);
        });
        var same = side.fields.length - diff.filter(function (f) { return shown[f[0]] !== undefined; }).length;
        h("p", "if-note", "+ " + same + " other fields shown in both prompts (crop stage, inputs so far, weather)", wrap);
      } else if (tab === "action") {
        var ul2 = h("ul", "if-acts", null, wrap), oth = other.actions;
        side.actions.forEach(function (l) {
          var un = /^Unavailable/.test(l), li = h("li", un ? "un" : (oth.indexOf(l) < 0 ? "only" : null), l.replace(/^- /, ""), ul2);
        });
      } else {
        var o = side.objective, d1 = h("div", "if-obj", null, wrap);
        h("span", "k", "Goal", d1); h("span", "t", o.goal, d1);
        var d2 = h("div", "if-obj", null, wrap);
        h("span", "k", "Rule", d2); h("span", "t", o.rule, d2);
      }
      return wrap;
    }
    function card(el, tab, v, side, other) {
      clear(el);
      var hd = h("div", "if-hd", null, el); h("b", null, side.label, hd); h("span", null, SUB[tab], hd);
      el.appendChild(body(tab, v, side, other));
      var th = h("div", "if-row", null, el); h("span", "k", "Think", th); h("q", null, side.excerpt, th);
      var dz = h("div", "if-row", null, el); h("span", "k", "Act", dz); var pill = h("span", "act-pill", null, dz); setPill(pill, side.action);
    }
    function show(tab) {
      var v = P[tab], sc = v.scenario || {};
      clear(ctx);
      ctx.appendChild(document.createTextNode("Same field (WOFOST " + (sc.crop || "") + (sc.year ? ", " + sc.year + " weather" : "") + ") · same day (" +
        (v.a.date ? "Day " + v.a.day + " · " + v.a.date : "Day " + v.a.day) + ") · only the interface differs "));
      var info = h("span", "if-info", "ⓘ", ctx); info.tabIndex = 0;
      info.title = "Tier 2 test suite, " + v.setting + ", RL-trained think policy seed " + v.seed + " (median of three seeds), terminal checkpoint (step " + v.checkpoint_step + "). " +
        "Scenario: closest to the median score of the " + v.ref_split.replace("test_", "") + " split" + (v.skipped ? " (" + v.skipped + " closer scenarios had identical actions)" : "") +
        "; decision: the first step at which the two interfaces lead to different actions." + (v.state_mismatches ? " Action menus run under their own production wrappers, so the field state can differ slightly." : "");
      card(A, tab, v, v.a, v.b); card(B, tab, v, v.b, v.a);
    }
    tabs(tabsEl, function (b) { show(b.getAttribute("data-t")); });
    show("observation");
    window.__ifShow = function (t) { $$("button", tabsEl).forEach(function (x) { x.setAttribute("aria-selected", x.getAttribute("data-t") === t ? "true" : "false"); }); show(t); };
  })();

  /* ---------------------------------------------------------------- results: T1.3 validation return during training (W&B) */
  (function t13Curve() {
    var V = D.t13_val, host = $("#t13Curve");
    if (!V || !host) return;
    var nar = host.clientWidth < 600, c = V.curve, W = nar ? 340 : 760, H = nar ? 300 : 300, l = nar ? 58 : 70, r = nar ? 12 : 24, t = 20, b = 46, fs = nar ? 18 : 13;
    var lo = Math.min.apply(null, c.map(function (p) { return p.lo; })), hi = Math.max.apply(null, c.map(function (p) { return p.hi; }));
    var y0 = Math.floor(lo / 5000) * 5000, y1 = Math.ceil(hi / 5000) * 5000, x1v = c[c.length - 1].step;
    function X(s) { return l + (W - l - r) * s / x1v; }
    function Y(v) { return t + (H - t - b) * (y1 - v) / (y1 - y0); }
    var svg = S("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Validation gross revenue over RL training steps, mean and seed range" }, host);
    for (var v = y0; v <= y1; v += 5000) { S("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }, svg); T("text", { x: l - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": fs, fill: "var(--faint)" }, "$" + fmt(v / 1000) + "k", svg); }
    for (var s = 0; s <= x1v; s += (nar ? 40 : 20)) T("text", { x: X(s), y: H - 18, "text-anchor": "middle", "font-size": fs, fill: "var(--faint)" }, String(s), svg);
    T("text", { x: (l + W - r) / 2, y: H - 2, "text-anchor": "middle", "font-size": fs, fill: "var(--muted)" }, "RL training step", svg);
    var up = c.map(function (p) { return X(p.step) + " " + Y(p.hi); }), dn = c.slice().reverse().map(function (p) { return X(p.step) + " " + Y(p.lo); });
    S("path", { d: "M" + up.join("L") + "L" + dn.join("L") + "Z", fill: "var(--green)", opacity: .15 }, svg);
    S("path", { d: "M" + c.map(function (p) { return X(p.step) + " " + Y(p.mean); }).join("L"), fill: "none", stroke: "var(--green)", "stroke-width": 2.6, "stroke-linejoin": "round" }, svg);
    c.forEach(function (p, i) {
      var cc = S("circle", { cx: X(p.step), cy: Y(p.mean), r: i === 0 ? 6 : 3.5, fill: i === 0 ? "var(--surface)" : "var(--green)", stroke: "var(--green)", "stroke-width": 2 }, svg);
      T("title", {}, "step " + p.step + ": mean $" + fmt(p.mean) + " (seeds $" + fmt(p.lo) + "–$" + fmt(p.hi) + ")", cc);
    });
    T("text", { x: X(0) + 12, y: Y(c[0].mean) + 5, "font-size": fs + 1, fill: "var(--ink-2)" }, nar ? "untrained" : "untrained model (step 0)", svg);
    var last = c[c.length - 1];
    T("text", { x: X(last.step) - 6, y: Y(last.mean) - 12, "text-anchor": "end", "font-size": fs + 1, "font-weight": 600, fill: "var(--green)" }, "$" + fmt(last.mean), svg);
    $("#t13Meta").textContent = "gross revenue, $/ha over 19 years · 3 seeds";
    $("#t13Cap").textContent = "Mean of three think seeds on the validation split (line) and their range (band), logged during RL training; step 0 is the untrained model. " +
      "Validation only, not the frozen test suite (exploratory). W&B " + V.project + ": " + V.runs.map(function (r) { return r.name.replace("schema-t13-price-", "") + " " + r.id + " (last step " + r.last_step + ")"; }).join(", ") +
      "; the curve shows the steps logged by all three runs.";
  })();

  /* ---------------------------------------------------------------- T2.2 think vs masked PPO vs target-trained PPO */
  $$("[data-t22base]").forEach(function (root) {
    var B = D.t22_baselines;
    if (!B) return;
    var sw = h("div", "seg blue small", null, root); sw.setAttribute("role", "tablist"); sw.style.marginBottom = "10px";
    [["A", "Family A · trained on lnpkw, lnpk"], ["B", "Family B · trained on lnpk, lw"]].forEach(function (x, i) {
      var b = h("button", null, x[1], sw); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", i ? "false" : "true"); b.setAttribute("data-fam", x[0]);
    });
    var lg = h("div", "legend tb-legend", null, root);
    [["tb-think", "think (LLM-RL)"], ["tb-mask", "masked PPO"], ["tb-tgt", "PPO trained on the test menu"]].forEach(function (x) { var sp = h("span", null, null, lg); h("i", x[0], null, sp); sp.appendChild(document.createTextNode(x[1])); });
    var rows = h("div", "tb-rows", null, root);
    var all = [];
    ["A", "B"].forEach(function (f) { B.menus.forEach(function (m) { var F_ = B.fam[f]; [F_.think[m], F_.masked[m], B.target[m]].forEach(function (v) { all.push(v[0] + v[1]); all.push(v[0] - v[1]); }); }); });
    var lo = Math.min(0, Math.floor(Math.min.apply(null, all))), hi = Math.ceil(Math.max.apply(null, all));
    function P(v) { return 100 * (v - lo) / (hi - lo); }
    function show(f) {
      clear(rows);
      var F_ = B.fam[f];
      B.menus.forEach(function (m) {
        var r = h("div", "tb-row", null, rows);
        h("code", null, m, r);
        var tr = h("div", "tb-track", null, r);
        for (var g = Math.ceil(lo); g <= hi; g++) { var gl = h("i", "tb-grid", null, tr); gl.style.left = P(g) + "%"; if (g === 0) gl.className += " zero"; }
        [[B.target[m], "tb-tgt", "PPO trained on " + m], [F_.masked[m], "tb-mask", "masked PPO"], [F_.think[m], "tb-think", "think"]].forEach(function (x) {
          var v = x[0], wsk = h("span", "tb-sd " + x[1], null, tr);
          wsk.style.left = P(v[0] - v[1]) + "%"; wsk.style.width = (P(v[0] + v[1]) - P(v[0] - v[1])) + "%";
          var d = h("span", "tb-dot " + x[1], null, tr); d.style.left = P(v[0]) + "%";
          d.title = x[2] + " on " + m + ": " + v[0].toFixed(2) + " ± " + v[1].toFixed(2) + " (normalized return, mean ± SD over three seeds)";
        });
        h("span", "tb-val", F_.think[m][0].toFixed(2) + " · " + F_.masked[m][0].toFixed(2) + " · " + B.target[m][0].toFixed(2), r);
      });
      var ax = h("div", "tb-axis", null, rows); h("span", null, "", ax); var at = h("div", "tb-track ax", null, ax);
      for (var g = Math.ceil(lo); g <= hi; g += 2) { var t = h("span", null, String(g), at); t.style.left = P(g) + "%"; if (P(g) > 97) t.style.transform = "translateX(-100%)"; }
      h("span", "tb-val", "think · masked · target", ax);
    }
    tabs(sw, function (b) { show(b.getAttribute("data-fam")); });
    show("A");
  });

  /* ---------------------------------------------------------------- T1.2 crop-variety 8ID validation curve (seen vs held-out crops) */
  $$("[data-valcurve]").forEach(function (host) {
    var V = D.t12_val;
    if (!V) return;
    var compact = host.getAttribute("data-valcurve") === "compact";
    var chart = h("div", "vc-chart", null, host);
    var cw = chart.clientWidth || 600, nar = cw < 560, W = Math.max(300, Math.round(cw)), H = nar ? 250 : (compact ? 240 : 290);
    var l = nar ? 30 : 36, r = nar ? 14 : 24, t = 30, b = 44, fs = nar ? 12 : 13;
    var A = V.seen_curve, B = V.held_curve, all = A.concat(B);
    var y0 = Math.floor(Math.min.apply(null, all.map(function (p) { return p.lo; }))), y1 = Math.ceil(Math.max.apply(null, all.map(function (p) { return p.hi; })));
    y0 = Math.min(0, y0);
    var x1v = A[A.length - 1].step;
    function X(s) { return l + (W - l - r) * s / x1v; }
    function Y(v) { return t + (H - t - b) * (y1 - v) / (y1 - y0); }
    var svg = S("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Validation return during RL training on seen and held-out crops, mean and seed range" }, chart);
    for (var v = y0; v <= y1; v += 1) { S("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), stroke: "var(--rule)" }, svg); T("text", { x: l - 8, y: Y(v) + 4, "text-anchor": "end", "font-size": fs, fill: "var(--faint)" }, String(v), svg); }
    for (var s = 0; s <= x1v; s += (nar ? 50 : 25)) T("text", { x: X(s), y: H - 20, "text-anchor": "middle", "font-size": fs, fill: "var(--faint)" }, String(s), svg);
    T("text", { x: (l + W - r) / 2, y: H - 3, "text-anchor": "middle", "font-size": fs, fill: "var(--muted)" }, "RL training step", svg);
    T("text", { x: 2, y: 12, "font-size": fs, fill: "var(--muted)" }, "profit-equivalent t/ha (objective)", svg);
    [[A, "var(--green)", "seen crops (8)"], [B, "var(--blue)", "held-out crops (4)"]].forEach(function (x) {
      var c = x[0], col = x[1];
      var up = c.map(function (p) { return X(p.step) + " " + Y(p.hi); }), dn = c.slice().reverse().map(function (p) { return X(p.step) + " " + Y(p.lo); });
      S("path", { d: "M" + up.join("L") + "L" + dn.join("L") + "Z", fill: col, opacity: .16 }, svg);
      S("path", { d: "M" + c.map(function (p) { return X(p.step) + " " + Y(p.mean); }).join("L"), fill: "none", stroke: col, "stroke-width": 2.6, "stroke-linejoin": "round" }, svg);
      c.forEach(function (p, i) {
        var cc = S("circle", { cx: X(p.step), cy: Y(p.mean), r: i === 0 ? 5.5 : 3.2, fill: i === 0 ? "var(--surface)" : col, stroke: col, "stroke-width": 2 }, svg);
        T("title", {}, x[2] + " · step " + p.step + (p.step === 0 ? " (untrained model)" : "") + ": mean " + p.mean.toFixed(2) + " t/ha (seeds " + p.lo.toFixed(2) + "–" + p.hi.toFixed(2) + ")", cc);
      });
      var last = c[c.length - 1];
      T("text", { x: X(last.step) - 4, y: Y(last.mean) - 10, "text-anchor": "end", "font-size": fs + 1, "font-weight": 600, fill: col }, last.mean.toFixed(2), svg);
    });
    T("text", { x: X(0) + 10, y: Y(A[0].mean) + 22, "font-size": fs, fill: "var(--muted)" }, "step 0 = untrained model", svg);
    var lg = h("div", "legend vc-legend", null, host);
    [["var(--green)", "seen crops (8)"], ["var(--blue)", "held-out crops (4)"]].forEach(function (x) { var sp = h("span", null, null, lg); var i = h("i", null, null, sp); i.style.background = x[0]; sp.appendChild(document.createTextNode(x[1])); });
    var cap = h("p", "cap vc-cap", null, host);
    cap.textContent = compact
      ? "Crop-variety, trained on 8 crops. Line: mean of three think seeds; band: seed range."
      : "Crop-variety setting, trained on 8 crops (" + V.seen.join(", ").replace("seed_onion", "seed onion") + "); held out: " + V.held.join(", ").replace("seed_onion", "seed onion") +
        ". Objective: season profit in storage-organ equivalents (yield minus input costs), t/ha. Line: mean of three think seeds; band: seed range; step 0 is the untrained model. " +
        "Validation split logged during training, not the frozen test suite (exploratory). W&B " + V.project + ": " + V.runs.map(function (r) { return r.name.replace("schema-t12-crosscrop-8id-think-", "") + " " + r.id; }).join(", ") + ".";
  });

  /* ---------------------------------------------------------------- episode explorer (homepage compact + demo page) */
  function episodeList(withHero) {
    var out = [];
    if (withHero && D.hero) out.push({ ep: D.hero, tab: "WOFOST · Tier 1", badge: "Held-out weather · drought" });
    (D.episodes || []).forEach(function (e) { out.push({ ep: e, tab: withHero ? e.sim + " · Tier 3" : e.sim, badge: "Held-out tuple · " + e.tuple }); });
    return out;
  }
  function explorer(root) {
    var compact = root.getAttribute("data-compact") === "1";
    var list = episodeList(root.getAttribute("data-hero") === "1");
    var LABEL = { WOFOST: "Storage-organ yield (kg/ha)", DSSAT: "Grain dry matter (kg/ha)", Cycles: "Aboveground biomass (as in the prompt)" };
    var tr = h("div", "tabs-row", null, root);
    var tabsEl = h("div", "seg small", null, tr); tabsEl.setAttribute("role", "tablist");
    var badge = h("span", "badge", null, tr);
    var card = h("div", "card explorer" + (compact ? " compact" : ""), null, root);
    var left = h("div", "ex-left", null, card);
    var meta = h("div", "ex-meta", null, left);
    var svg = S("svg", { role: "img", "aria-label": "Growth and inputs over the season" }, left);
    var scrub = h("div", "scrub", null, left);
    var playBtn = h("button", "icon-btn play-btn", null, scrub); playBtn.type = "button"; icon(playBtn, "#i-play"); playBtn.setAttribute("aria-label", "Play season");
    var range = h("input", null, null, scrub); range.type = "range"; range.min = 0; range.value = 0; range.setAttribute("aria-label", "Decision step");
    var lbl = h("span", "step-lbl", null, scrub);
    var totals = h("div", "totals", null, left);
    var right = h("div", "ex-right", null, card);
    function dsec(title, extra) { var d = h("div", "dsec", null, right), k = h("div", "k", null, d); h("span", null, title, k); var x = h("span", null, extra || "", k); return [d, x]; }
    var o = dsec("Observe"), obs = h("pre", "obs-pre", null, o[0]);
    var r = dsec("Think", "model output, verbatim"), reason = h("p", "reason", null, r[0]);
    var a = dsec("Act"), act = h("span", "act-pill", null, a[0]);
    var cap = h("p", "cap", null, root);
    list.forEach(function (it, i) {
      var b = h("button", null, it.tab, tabsEl); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", i === 0 ? "true" : "false"); b.setAttribute("data-i", i);
    });
    var cur = null, k = 0, timer = null, drawSel = null;
    tabs(tabsEl, function (b) { stop(); load(list[+b.getAttribute("data-i")]); });
    function dayLabel(ep, s) {
      if (ep.sim === "WOFOST") return "Day " + fmt(s.day) + (s.date ? " · " + s.date : "");
      if (ep.sim === "DSSAT") return "Day " + fmt(s.day) + " after planting";
      return "Day of year " + fmt(s.day);
    }
    function load(it) {
      var ep = it.ep; cur = ep; k = 0;
      var n = ep.steps.length, sc = ep.scenario || {};
      range.max = n - 1; range.value = 0;
      badge.textContent = it.badge;
      var m = [sc.crop, sc.site, sc.year ? "weather year " + sc.year : null].filter(Boolean);
      clear(meta); h("b", null, ep.sim, meta); meta.appendChild(document.createTextNode(" · " + m.join(" · ") + " · " + n + " decisions"));
      cap.textContent = compact ? ep.run + ". Median-scoring test episode (rank " + ep.episode_rank + " of " + ep.n_episodes + "); reasoning verbatim." :
        ep.run + ". The episode closest to its split's median score (rank " + ep.episode_rank + " of " + ep.n_episodes +
        "). Reasoning is the model's own text, copied in full; it can be wrong. Bars show the inputs applied at each decision; yield and profit are the simulator's end-of-season values.";
      clear(svg);
      var W = narrow(left) ? 400 : 560, H = compact ? 236 : 300;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      var x0 = 66, x1 = W - 20, yT = 26, yB = compact ? 128 : 168;
      var lf = compact ? [144, 174] : [196, 230], lw = compact ? [186, 216] : [246, 280];
      var gs = ep.steps.map(function (s) { return s.growth || 0; });
      var gmax = niceCeil(Math.max.apply(null, gs.concat([1])));
      function X(i) { return x0 + (x1 - x0) * (n === 1 ? 0 : i / (n - 1)); }
      function Y(g) { return yB - (yB - yT) * g / gmax; }
      var cw = Math.min(26, (x1 - x0) / (n - 1 || 1));
      var hl = S("rect", { y: yT - 8, height: lw[1] - yT + 12, width: cw, fill: "var(--green-soft)", rx: 6 }, svg);
      [0, .5, 1].forEach(function (f) {
        S("line", { x1: x0, x2: x1, y1: Y(gmax * f), y2: Y(gmax * f), stroke: "var(--rule)" }, svg);
        T("text", { x: x0 - 20, y: Y(gmax * f) + 4, "text-anchor": "end", "font-size": 12.5, fill: "var(--faint)" }, fmt(gmax * f, gmax < 10 ? 1 : 0), svg);
      });
      T("text", { x: 0, y: 12, "font-size": 13, fill: "var(--muted)", "font-weight": 500 }, LABEL[ep.sim], svg);
      var ins = ep.steps.map(stepInputs), pk = hasPK(ep);
      var fmax = Math.max.apply(null, ins.map(function (v) { return v.f; }).concat([1]));
      var wmax = Math.max.apply(null, ins.map(function (v) { return v.w; }).concat([1]));
      var hasW = ep.steps.some(function (s) { return s.w_after != null; });
      [[pk ? "NPK" : "N", lf], [hasW ? "Water" : "", lw]].forEach(function (l) {
        S("line", { x1: x0, x2: x1, y1: l[1][1], y2: l[1][1], stroke: "var(--rule-strong)" }, svg);
        T("text", { x: x0 - 20, y: l[1][1], "text-anchor": "end", "font-size": 12, fill: "var(--faint)" }, l[0], svg);
      });
      var bw = Math.max(4, (x1 - x0) / n * 0.55);
      var path = ep.steps.map(function (s, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(gs[i]).toFixed(1); }).join("");
      S("path", { d: path + "L" + X(n - 1) + " " + yB + "L" + X(0) + " " + yB + "Z", fill: "var(--green)", opacity: .1 }, svg);
      S("path", { d: path, fill: "none", stroke: "var(--green)", "stroke-width": 2.2, "stroke-linejoin": "round" }, svg);
      ep.steps.forEach(function (s, i) {
        var v = ins[i];
        if (v.f > 0) S("rect", { x: X(i) - bw / 2, width: bw, y: lf[1] - (lf[1] - lf[0]) * v.f / fmax, height: (lf[1] - lf[0]) * v.f / fmax, rx: 2, fill: "var(--green)" }, svg);
        if (v.w > 0) S("rect", { x: X(i) - bw / 2, width: bw, y: lw[1] - (lw[1] - lw[0]) * v.w / wmax, height: (lw[1] - lw[0]) * v.w / wmax, rx: 2, fill: "var(--water)" }, svg);
      });
      [0, n - 1].forEach(function (i) { T("text", { x: X(i), y: H - 4, "text-anchor": i === 0 ? "start" : "end", "font-size": 12.5, fill: "var(--faint)" }, (i === 0 ? "decision " : "") + (i + 1), svg); });
      var dot = S("circle", { r: 5.5, fill: "var(--surface)", stroke: "var(--green)", "stroke-width": 2.6 }, svg);
      var hit = S("rect", { x: x0 - 14, y: 0, width: x1 - x0 + 28, height: H, fill: "transparent", style: "cursor:pointer" }, svg);
      hit.addEventListener("click", function (e) {
        var rr = svg.getBoundingClientRect(), vx = (e.clientX - rr.left) / rr.width * W;
        stop(); select(Math.max(0, Math.min(n - 1, Math.round((vx - x0) / (x1 - x0) * (n - 1)))));
      });
      drawSel = function (i) { hl.setAttribute("x", X(i) - cw / 2); dot.setAttribute("cx", X(i)); dot.setAttribute("cy", Y(gs[i])); };
      select(0);
    }
    function select(i) {
      k = i; range.value = i;
      var ep = cur, s = ep.steps[i], f = ep.final, pk = hasPK(ep);
      drawSel(i);
      lbl.textContent = (i + 1) + " / " + ep.steps.length;
      o[1].textContent = dayLabel(ep, s);
      obs.textContent = s.obs;
      reason.textContent = s.reasoning || "(no reasoning text)";
      setPill(act, s.action + (s.invalid ? "  (invalid)" : ""));
      clear(totals);
      var hasW = s.w_after != null;
      [[fmt(cumFert(s, true)) + " kg/ha", pk ? "N + P + K so far" : "N applied so far", ""],
       [hasW ? fmt(s.w_after) + " mm" : "–", hasW ? "Water so far" : "No irrigation in this menu", ""],
       [fmt(f.revenue), "Final yield, kg/ha", "final"],
       [fmt(f.profit), "Profit, kg/ha yield-eq.", "final"]].forEach(function (t) {
        var d = h("div", "tot " + t[2], null, totals); h("b", null, t[0], d); h("span", null, t[1], d);
      });
    }
    range.addEventListener("input", function () { stop(); select(+range.value); });
    function stop() { clearInterval(timer); timer = null; clear(playBtn); icon(playBtn, "#i-play"); playBtn.setAttribute("aria-label", "Play season"); }
    playBtn.addEventListener("click", function () {
      if (timer) { stop(); return; }
      if (k >= cur.steps.length - 1) select(0);
      clear(playBtn); icon(playBtn, "#i-pause"); playBtn.setAttribute("aria-label", "Pause season");
      timer = setInterval(function () { if (k >= cur.steps.length - 1) { stop(); return; } select(k + 1); }, 1700);
    });
    load(list[0]);
  }
  $$("[data-explorer]").forEach(explorer);

  /* ---------------------------------------------------------------- before / after RL (T1.3, same scenario) */
  $$("[data-paired]").forEach(function (root) {
    var P = D.paired;
    if (!P) return;
    var regime = { high_soybean: "high soybean price (held-out)", high_corn: "high corn price (held-out)", id_test: "typical prices" }[P.price_regime] || P.price_regime;
    var head = h("div", "pair-head", null, root);
    h("div", "ttl", "Before and after RL · same 19-year Cycles plan · " + regime, head);
    var lg = h("div", "legend", null, head);
    [["var(--corn)", "corn"], ["var(--green-2)", "soybean"], ["var(--rule-strong)", "bar = yearly gross revenue"]].forEach(function (x) {
      var s = h("span", null, null, lg), i = h("i", null, null, s); i.style.background = x[0]; s.appendChild(document.createTextNode(x[1]));
    });
    var rmax = 0;
    [P.untrained, P.trained].forEach(function (r) { r.years.forEach(function (y) { rmax = Math.max(rmax, y.revenue || 0); }); });
    var tiles = [], box;
    [["before", P.untrained, "Before RL", "untrained Qwen3-4B, think"], ["after", P.trained, "After RL", "Qwen3-4B think, seed r1"]].forEach(function (cfg) {
      var row = h("div", "prow " + cfg[0], null, root);
      var who = h("div", "who", null, row); h("b", null, cfg[2], who); h("span", null, cfg[3], who);
      var tl = h("div", "ptiles", null, row);
      cfg[1].years.forEach(function (y, i) {
        var b = h("button", "ptile", null, tl); b.type = "button";
        b.setAttribute("aria-label", y.year + ": " + y.crop + ", " + fmt(y.revenue) + " $/ha");
        h("span", "bar", null, b).style.height = Math.max(2, 40 * (y.revenue || 0) / rmax) + "px";
        h("span", "crop " + y.crop, y.crop === "corn" ? "C" : "S", b);
        b.addEventListener("click", function () { pick(i); });
        tiles.push([i, b]);
      });
      var tot = h("div", "ptot", null, row); h("b", null, "$" + fmt(cfg[1].total), tot); h("span", null, "$/ha over 19 years", tot);
    });
    var detail = root.getAttribute("data-detail") !== "0";
    box = h("div", "pyear", null, root);
    if (!detail) box.style.display = "none";
    function pick(i) {
      tiles.forEach(function (t) { t[1].classList.toggle("sel", t[0] === i); });
      clear(box);
      [["Before RL", P.untrained.years[i]], ["After RL", P.trained.years[i]]].forEach(function (c) {
        var y = c[1], d = h("div", null, null, box);
        h("div", "yh", c[0] + " · " + y.year, d);
        h("div", "yr", (y.crop === "corn" ? "Corn" : "Soybean") + " · " + fmt(y.yield_t, 2) + " t/ha · $" + fmt(y.revenue) + "/ha", d);
        h("q", null, y.reasoning, d);
      });
    }
    pick(2);
    var corn = P.untrained.years.filter(function (y) { return y.crop === "corn"; }).length;
    if (!detail) {
      var cp = h("p", "cap", "Before RL the model plants corn in " + corn + " of 19 years; after RL it rotates. Median-scoring episode of the trained run (rank " + P.trained.rank + " of " + P.n_rows +
        "); run means $" + fmt(P.trained.run_mean) + " after RL, $" + fmt(P.untrained.run_mean) + " before. ", root);
      var a = h("a", "more", "Each year's reasoning on the Results page →", cp); a.href = "results.html#rl-changes"; a.style.fontSize = "12.5px";
      return;
    }
    h("p", "cap", "Tier 1 price-regime test scenario. Rule: the trained run's episode closest to its median total over " + P.n_rows + " test rows (rank " + P.trained.rank +
      "), and the untrained model on the same scenario (rank " + P.untrained.rank + " in its run). Run means: $" + fmt(P.trained.run_mean) + " after RL, $" +
      fmt(P.untrained.run_mean) + " before. Before RL the model plants corn in " + corn + " of 19 years. Click a year to read both models' reasoning (verbatim).", root);
  });

  /* ---------------------------------------------------------------- T3.2 test-suite curves */
  $$("[data-curves]").forEach(function (wrap) {
    if (!D.curves) return;
    var arm = "think", sw = $(wrap.getAttribute("data-curves"));
    function ticks(lo, hi) {
      var raw = (hi - lo) / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
      var step = (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p, out = [];
      for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
      return out;
    }
    function draw() {
      clear(wrap);
      D.curves.forEach(function (c) {
        var card = h("div", "card curve-card", null, wrap);
        h("h5", null, c.label, card); h("div", "ctx", "held-out tuple · normalized return", card);
        var pts = c.arms[arm], all = [c.specialist, 0];
        ["think", "no-think"].forEach(function (a) { c.arms[a].forEach(function (p) { all.push(p.lo, p.hi); }); });
        var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * .08; lo -= pad; hi += pad;
        var W = 300, H = 200, l = 34, r = 12, t = 16, b = 26;
        function X(e) { return l + (W - l - r) * e / 4; }
        function Y(v) { return t + (H - t - b) * (hi - v) / (hi - lo); }
        var svg = S("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": c.label + " test-suite score over training" }, card);
        ticks(lo, hi).forEach(function (v) {
          S("line", { x1: l, x2: W - r, y1: Y(v), y2: Y(v), stroke: v === 0 ? "var(--rule-strong)" : "var(--rule)", "stroke-dasharray": v === 0 ? "2 3" : null }, svg);
          T("text", { x: l - 6, y: Y(v) + 3.5, "text-anchor": "end", "font-size": 12, fill: "var(--faint)" }, String(v), svg);
        });
        for (var e = 0; e <= 4; e++) T("text", { x: X(e), y: H - 8, "text-anchor": "middle", "font-size": 12, fill: "var(--faint)" }, e === 0 ? "0 · untrained" : String(e), svg);
        var col = arm === "think" ? "var(--green)" : "var(--corn)";
        S("line", { x1: l, x2: W - r, y1: Y(c.specialist), y2: Y(c.specialist), stroke: "var(--ink-2)", "stroke-width": 1.4, "stroke-dasharray": "6 4" }, svg);
        T("text", { x: W - r, y: Y(c.specialist) - 5, "text-anchor": "end", "font-size": 12.5, fill: "var(--ink-2)" }, "specialist " + c.specialist.toFixed(2), svg);
        var up = pts.map(function (p) { return X(p.epoch) + " " + Y(p.hi); }), dn = pts.slice().reverse().map(function (p) { return X(p.epoch) + " " + Y(p.lo); });
        S("path", { d: "M" + up.join("L") + "L" + dn.join("L") + "Z", fill: col, opacity: .16 }, svg);
        S("path", { d: "M" + pts.map(function (p) { return X(p.epoch) + " " + Y(p.mean); }).join("L"), fill: "none", stroke: col, "stroke-width": 2.2, "stroke-linejoin": "round" }, svg);
        pts.forEach(function (p) {
          var ex = p.epoch > 0 && p.epoch < 4;
          var cc = S("circle", { cx: X(p.epoch), cy: Y(p.mean), r: p.epoch === 4 ? 5 : 4, fill: p.epoch === 0 ? "var(--surface)" : col, stroke: col, "stroke-width": 2, opacity: ex ? .7 : 1 }, svg);
          T("title", {}, (p.epoch === 0 ? "untrained model" : "epoch " + p.epoch + (ex ? " (exploratory)" : " (terminal)")) + ": mean " + p.mean.toFixed(2) +
            ", seeds " + p.seeds.map(function (s) { return s.toFixed(2); }).join(" / "), cc);
        });
        var end = pts[4];
        T("text", { x: X(4) - 8, y: Y(end.mean) + (end.mean > c.specialist - (hi - lo) * .12 ? 16 : -9), "text-anchor": "end", "font-size": 12.5, fill: col, "font-weight": 600 }, end.mean.toFixed(2), svg);
      });
    }
    if (sw) tabs(sw, function (b) { arm = b.getAttribute("data-arm"); draw(); });
    draw();
  });

  /* ---------------------------------------------------------------- real-prompt before / after (benchmark page) */
  (function interfaceDemo() {
    var I = D.interface, tabsEl = $("#baTabs");
    if (!I || !tabsEl) return;
    function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function countActions(block) {
      return block.split("\n").filter(function (l) { return /^- /.test(l); }).reduce(function (a, l) { var m = l.match(/\d+(?:\.\d+)?/g); return a + (m ? m.length : 1); }, 0);
    }
    function obsLines(markGone) {
      return I.obs.split("\n").map(function (l) {
        var gone = I.withheld.some(function (w) { return l.indexOf(w) >= 0; });
        return gone && markGone ? '<span class="gone">' + esc(l) + "</span>" : esc(l);
      }).join("\n");
    }
    function diff(before, after, cls, side) {
      var other = (side === "after" ? before : after).split("\n");
      return (side === "after" ? after : before).split("\n").map(function (l) { return other.indexOf(l) < 0 ? '<span class="' + cls + '">' + esc(l) + "</span>" : esc(l); }).join("\n");
    }
    var V = {
      obs: { bt: I.n_fields_full + " fields", at: I.n_fields_s2b + " fields", b: obsLines(false), a: obsLines(true),
             say: "Withhold the four resource-state fields and the agent can no longer tell whether nitrogen or water is needed, while every unneeded input still costs." },
      act: { bt: countActions(I.menu_before) + " actions", at: countActions(I.menu_after) + " actions", b: diff(I.menu_before, I.menu_after, "dim", "before"), a: diff(I.menu_before, I.menu_after, "new", "after"),
             say: "The menu itself changes: phosphorus and potassium are gone, and the same policy has to act from what is left." },
      rew: { bt: "yield", at: "profit", b: esc(I.objective_before), a: diff(I.objective_before, I.objective_after, "new", "after"),
             say: "Same field, same actions, a new goal: under profit, an input pays only if it raises yield by more than it costs." }
    };
    function show(k) {
      var v = V[k];
      $("#baBefore").innerHTML = v.b; $("#baAfter").innerHTML = v.a;
      $("#baBeforeTag").textContent = v.bt; $("#baAfterTag").textContent = v.at; $("#baSay").textContent = v.say;
    }
    tabs(tabsEl, function (b) { show(b.getAttribute("data-k")); });
    show("obs");
  })();

  /* ---------------------------------------------------------------- Section 06 compact visuals */
  $$("[data-t1chips]").forEach(function (root) {
    var t = F.t1, pp = F.t1_ppo || {};
    if (!t) return;
    [["weather", "Weather", 5], ["crop", "Crop", null], ["price", "Price", null]].forEach(function (x) {
      var v = t[x[0]], seeds = 3, splits = v[1] / seeds, c = h("span", "f1chip", null, root);
      c.appendChild(document.createTextNode(x[1] + " ")); h("span", "ck", "✓", c);
      c.title = v[0] + "/" + v[1] + " seed–split pairs above the untrained model (" + splits + " test splits × " + seeds + " seeds)" +
        (pp[x[0]] && pp[x[0]][0] ? "; every think seed above every PPO seed in " + (pp[x[0]][1] === 1 ? "this setting" : "all " + pp[x[0]][1] + " splits") : "");
    });
  });
  $$("[data-obsmini]").forEach(function (root) {
    if (!F.t2_obs) return;
    var by = {}; F.t2_obs.forEach(function (o) { by[o.id] = o; });
    var full = by.s1.mean;
    h("div", "t2-cap", "Share of the full-schema policy's gain kept", root);
    [["Renamed fields", ["s3", "s5"]], ["Extra fields", ["s4"]], ["Secondary field dropped", ["s2a", "s2c", "s2d"]], ["Resource state removed", ["s2b"]]].forEach(function (g) {
      var ps = g[1].map(function (id) { return Math.round(100 * by[id].mean / full); });
      var lo = Math.min.apply(null, ps), hi = Math.max.apply(null, ps), weak = g[1][0] === "s2b";
      var r = h("div", "mbar", null, root);
      r.title = g[1].map(function (id) { return by[id].label + ": " + by[id].mean.toFixed(2) + " vs full " + full.toFixed(2); }).join("; ") + " (normalized return, mean of three seeds)";
      var top = h("div", "mbar-top", null, r); h("span", null, g[0], top); h("b", null, (lo === hi ? lo : lo + "–" + hi) + "%", top);
      var tr = h("div", "mbar-track", null, r);
      var fl = h("div", "mbar-fill" + (weak ? " bad" : ""), null, tr); fl.style.width = Math.max(2, lo) + "%";
      if (hi > lo) { var ex = h("div", "mbar-ext", null, tr); ex.style.left = lo + "%"; ex.style.width = (hi - lo) + "%"; }
    });
  });
  $$("[data-rewmini]").forEach(function (root) {
    var m = F.t2_multi;
    if (!m) return;
    [["think", "With reasoning"], ["no-think", "Without reasoning"]].forEach(function (x) {
      var fl = m[x[0]], n = fl.length, k = fl.filter(Boolean).length;
      var r = h("div", "t2-srow", null, root);
      r.title = "Trained on yield, profit and water at once; a seed counts as stalled when it stays below half the scripted reference's gain over doing nothing on all four test goals";
      h("span", "t2-lab", x[1], r);
      var dots = h("span", "t2-dots", null, r);
      fl.slice().sort(function (a, b) { return a - b; }).forEach(function (s) { h("i", s ? "t2-dot t2-off" : "t2-dot t2-on", null, dots); });
      h("span", "t2-res", k === 0 ? n + " of " + n + " seeds learn" : k + " of " + n + " stall near doing nothing", r);
    });
    h("div", "t2-cap", "Trained on several goals at once, three seeds each", root);
  });

  /* ---------------------------------------------------------------- findings visuals (copy lives in the HTML) */
  $$("[data-t1]").forEach(function (root) {
    var t = F.t1;
    if (!t) return;
    [["weather", "Weather-regime"], ["crop", "Crop-variety"], ["price", "Price-regime"]].forEach(function (x) {
      var d = h("div", null, null, root); h("b", null, t[x[0]][0] + "/" + t[x[0]][1], d); h("span", "lbl", x[1], d); h("small", null, "seed–split pairs above the untrained model", d);
    });
  });
  $$("[data-obsbars]").forEach(function (root) {
    if (!F.t2_obs) return;
    var all = root.getAttribute("data-obsbars") === "all";
    var rows = all ? F.t2_obs : F.t2_obs.filter(function (o) { return o.id === "s1" || o.id === "s2b"; });
    var max = niceCeil(Math.max.apply(null, F.t2_obs.map(function (o) { return Math.max(o.mean, o.untrained); })));
    rows.forEach(function (o) {
      var r = h("div", "hbar", null, root);
      h("span", null, o.label, r);
      var tr = h("div", "track", null, r), fl = h("div", "fill" + (o.id === "s2b" ? " weak" : ""), null, tr);
      fl.style.width = Math.max(1, 100 * o.mean / max) + "%";
      if (all) { var tk = h("i", "tick", null, tr); tk.style.left = (100 * Math.max(0, o.untrained) / max) + "%"; tk.title = "untrained model " + o.untrained.toFixed(2); }
      h("span", "val", o.mean.toFixed(2) + " ± " + o.sd.toFixed(2), r);
    });
  });
  $$("[data-families]").forEach(function (root) {
    if (!F.t2_act) return;
    var sw = h("div", "seg blue small", null, root); sw.setAttribute("role", "tablist"); sw.style.marginBottom = "12px";
    [["A", "N + water together"], ["B", "Only separately"]].forEach(function (x, i) {
      var b = h("button", null, x[1], sw); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", i ? "false" : "true"); b.setAttribute("data-fam", x[0]);
    });
    var menus = h("div", "menus", null, root), say = h("p", "note", null, root); say.style.margin = "10px 0 0";
    var TXT = { A: "Family A, trained on lnpkw and lnpk.", B: "Family B, trained on lnpk and lw." };
    function show(f) {
      clear(menus);
      F.t2_act[f].forEach(function (m) {
        var d = h("div", "menu" + (m[3] ? " trained" : ""), null, menus);
        h("div", "m", m[0], d);
        var p = h("div", "pips", null, d);
        for (var i = 0; i < m[2]; i++) h("i", i < m[1] ? "on" : null, null, p);
        h("small", null, (m[3] ? "trained · " : "") + m[1] + "/" + m[2] + " seeds", d);
      });
      say.textContent = TXT[f] + " Filled dot: a seed above the untrained model. lnw is the new menu combining N and water.";
    }
    tabs(sw, function (b) { show(b.getAttribute("data-fam")); });
    show("A");
  });
  $$("[data-rewards]").forEach(function (root) {
    if (!F.t2_rew) return;
    var max = niceCeil(Math.max.apply(null, F.t2_rew.map(function (o) { return Math.max(o.yield_only, o.untrained); })));
    F.t2_rew.forEach(function (o) {
      var r = h("div", "hbar", null, root);
      h("span", null, o.obj + (o.trained ? " · trained" : " · unseen"), r);
      var tr = h("div", "track", null, r), fl = h("div", "fill", null, tr);
      fl.style.width = (100 * o.yield_only / max) + "%"; if (o.trained) fl.style.background = "var(--ink-2)";
      var tk = h("i", "tick", null, tr); tk.style.left = (100 * Math.max(0, o.untrained) / max) + "%"; tk.title = "untrained model " + o.untrained.toFixed(2);
      h("span", "val", o.yield_only.toFixed(2) + " · " + o.seeds_above + "/3", r);
    });
  });
  $$("[data-matrix]").forEach(function (root) {
    var M = F.t3_matrix;
    if (!M) return;
    h("span", null, null, root);
    M.targets.forEach(function (t) { h("span", "h", "→ " + t, root); });
    M.sources.forEach(function (s, i) {
      h("span", "rh", s, root);
      M.values[i].forEach(function (v, j) { h("span", "c" + (i === j ? " diag" : M.below[i][j] ? " below" : ""), v.toFixed(2), root); });
    });
    h("span", "rh", "untrained", root);
    M.untrained.forEach(function (v) { h("span", "c un", v.toFixed(2), root); });
  });
  $$("[data-uvs]").forEach(function (root) {
    if (!F.t3_uvs) return;
    F.t3_uvs.forEach(function (r) {
      var row = h("div", "dotrow", null, root);
      h("span", null, r.label, row);
      var vals = [r.untrained, r.unified, r.specialist], lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * .25 || .5;
      lo -= pad; hi += pad;
      var svg = S("svg", { viewBox: "0 0 300 52" }, row), cy = 26;
      function X(v) { return 10 + 280 * (v - lo) / (hi - lo); }
      S("line", { x1: 10, x2: 290, y1: cy, y2: cy, stroke: "var(--rule-strong)" }, svg);
      [[r.untrained, "un"], [r.unified, "uni"], [r.specialist, "spec"]].forEach(function (m) {
        var x = X(m[0]);
        if (m[1] === "un") S("circle", { cx: x, cy: cy, r: 5.5, fill: "var(--surface)", stroke: "var(--muted)", "stroke-width": 1.6 }, svg);
        else if (m[1] === "uni") S("circle", { cx: x, cy: cy, r: 6, fill: "var(--blue)" }, svg);
        else S("rect", { x: x - 5, y: cy - 5, width: 10, height: 10, fill: "var(--green)", transform: "rotate(45 " + x + " " + cy + ")" }, svg);
        T("text", { x: x, y: m[1] === "uni" ? cy + 21 : cy - 12, "text-anchor": "middle", fill: m[1] === "uni" ? "var(--blue)" : "var(--muted)" }, m[0].toFixed(2), svg);
      });
    });
  });
})();

/* Fullscreen video overlay (2026-10-26) */
(function () {
  var open = document.getElementById("vidOpen"), modal = document.getElementById("vidModal"),
      close = document.getElementById("vidClose"), vid = document.getElementById("vidEl");
  if (!open || !modal || !vid) return;
  function show() { modal.hidden = false; document.body.classList.add("vopen"); try { vid.currentTime = 0; } catch (e) {} var p = vid.play(); if (p && p.catch) p.catch(function () {}); close.focus(); }
  function hide() { vid.pause(); modal.hidden = true; document.body.classList.remove("vopen"); open.focus(); }
  open.addEventListener("click", show);
  close.addEventListener("click", hide);
  modal.addEventListener("click", function (e) { if (e.target === modal) hide(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) hide(); });
  if (location.hash === "#video") { modal.hidden = false; document.body.classList.add("vopen"); }
})();

/* Tier 1 finding: before/after RL bars (2026-10-26; same chart as the video) */
(function () {
  var F = (window.SITE3 && window.SITE3.findings) || null;
  document.querySelectorAll("[data-t1bars]").forEach(function (root) {
    var D = F || (window.SITE3_DATA && window.SITE3_DATA.findings);
    var rows = D && D.t1_bars; if (!rows) return;
    var lg = document.createElement("div"); lg.className = "t1b-lg";
    lg.innerHTML = '<span><i class="b"></i>Before RL</span><span><i class="a"></i>After RL</span>'; root.appendChild(lg);
    rows.forEach(function (r) {
      var lo = Math.min(0, r.before, r.after), hi = Math.max(0, r.before, r.after), span = hi - lo || 1;
      var z = 100 * (0 - lo) / span;
      var row = document.createElement("div"); row.className = "t1b-row";
      row.innerHTML = '<div class="t1b-h"><b>' + r.label + '</b></div>';
      [["b", r.before], ["a", r.after]].forEach(function (x) {
        var v = x[1], w = 100 * Math.abs(v) / span, left = v >= 0 ? z : z - w;
        var bar = document.createElement("div"); bar.className = "t1b-track";
        bar.innerHTML = '<span class="t1b-zero" style="left:' + z + '%"></span><span class="t1b-bar ' + x[0] + '" style="left:' + left + '%;width:' + Math.max(w, 0.6) + '%"></span>' +
          '<span class="t1b-v ' + x[0] + '" style="left:calc(' + (v >= 0 ? left + w : left) + '% ' + (v >= 0 ? '+ 6px' : '- 42px') + ')">' + (r.unit === "normalized score" && Math.max(Math.abs(r.before), Math.abs(r.after)) < 2 ? v.toFixed(2) : v.toFixed(1)) + '</span>';
        row.appendChild(bar);
      });
      root.appendChild(row);
    });
    var fn = document.createElement("div"); fn.className = "t1b-fn"; fn.textContent = "Held-out test conditions · mean of 3 seeds · each row has its own scale"; root.appendChild(fn);
  });
})();
