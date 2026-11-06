(function () {
  var root = document.documentElement;

  // ---- Single source of truth for navigation ----
  var NAV = [
    { file: 'index.html', title: 'AgriManager', home: true },
    { group: 'Tutorial' },
    { file: 'installation.html', title: 'Installation' },
    { file: 'dssat.html', title: 'DSSAT runtime' },
    { file: 'configuration.html', title: 'Configuration' },
    { file: 'quickstart.html', title: 'Quick start' },
    { group: 'Guides' },
    { file: 'framework.html', title: 'Framework' },
    { file: 'tasks.html', title: 'Tasks' },
    { file: 'rl-training.html', title: 'RL training' },
    { file: 'models.html', title: 'Supported models & algorithms' },
    { file: 'benchmark.html', title: 'Benchmark' },
    { file: 'new-environment.html', title: 'Adding a new environment' },
    { group: 'Evaluation' },
    { file: 'test-suite.html', title: 'Held-out test suite' },
    { file: 'evaluation.html', title: 'Evaluation' },
    { file: 'reproduce.html', title: 'Reproducing the paper' },
    { group: 'Reference' },
    { file: 'models-data.html', title: 'Models and data' },
    { file: 'reference.html', title: 'Citation' }
  ];

  var current = location.pathname.split('/').pop() || 'index.html';
  if (current === '') current = 'index.html';

  // ---- Build the sidebar from NAV ----
  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    NAV.forEach(function (item) {
      if (item.group) {
        var lbl = document.createElement('div');
        lbl.className = 's-label';
        lbl.textContent = item.group;
        sidebar.appendChild(lbl);
        return;
      }
      var a = document.createElement('a');
      a.href = item.file;
      a.setAttribute('data-page', item.file);
      if (item.home) {
        a.className = 's-home';
        a.innerHTML = '<img class="logo" src="assets/logo-icon.svg" alt="" /> ' + item.title;
      } else {
        a.className = 's-link';
        a.textContent = item.title;
      }
      if (item.file === current) a.classList.add('active');
      sidebar.appendChild(a);
    });
  }

  // ---- Build prev/next from NAV order ----
  var pagenav = document.getElementById('pagenav');
  if (pagenav) {
    var pages = NAV.filter(function (i) { return i.file; });
    var idx = -1;
    pages.forEach(function (p, i) { if (p.file === current) idx = i; });
    var prev = idx > 0 ? pages[idx - 1] : null;
    var next = idx >= 0 && idx < pages.length - 1 ? pages[idx + 1] : null;
    var left = prev
      ? '<a href="' + prev.file + '"><span class="pn-dir">Previous</span><span>← ' + prev.title + '</span></a>'
      : '<span></span>';
    var right = next
      ? '<a class="pn-next" href="' + next.file + '"><span class="pn-dir">Next</span><span>' + next.title + ' →</span></a>'
      : '<span></span>';
    pagenav.innerHTML = left + right;
  }

  // ---- Theme: follows the system setting until the reader picks one (same rule as the website) ----
  var themeBtn = document.getElementById('themeBtn');
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var n = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', n);
    try { localStorage.setItem('agri-theme', n); } catch (e) {}
  });

  // ---- Mobile sidebar ----
  var bd = document.getElementById('backdrop'), mb = document.getElementById('menuBtn');
  function closeSb() { if (sidebar) sidebar.classList.remove('open'); if (bd) bd.classList.remove('show'); }
  if (mb) mb.addEventListener('click', function () { sidebar.classList.add('open'); bd.classList.add('show'); });
  if (bd) bd.addEventListener('click', closeSb);
  if (sidebar) sidebar.addEventListener('click', function (e) { if (e.target.closest('a')) closeSb(); });

  // ---- Build the right-hand "On this page" TOC from headings ----
  var main = document.querySelector('main');
  var toc = document.getElementById('toc');
  var observed = [];
  if (main && toc) {
    var heads = main.querySelectorAll('h2[id], h3[id]');
    if (heads.length) {
      var lbl = document.createElement('div'); lbl.className = 't-label'; lbl.textContent = 'On this page';
      toc.appendChild(lbl);
      heads.forEach(function (h) {
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent.replace(/#$/, '').trim();
        if (h.tagName === 'H3') a.className = 'lvl-3';
        a.setAttribute('data-id', h.id);
        toc.appendChild(a);
        observed.push(h);
      });
    } else {
      toc.style.display = 'none';
    }
  }

  // ---- Active anchor highlight on scroll ----
  if (observed.length) {
    var tocLinks = {};
    toc.querySelectorAll('a[data-id]').forEach(function (a) { tocLinks[a.getAttribute('data-id')] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          Object.keys(tocLinks).forEach(function (id) { tocLinks[id].classList.remove('active'); });
          if (tocLinks[e.target.id]) tocLinks[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-60px 0px -68% 0px', threshold: 0 });
    observed.forEach(function (h) { obs.observe(h); });
  }

  // ---- Copy buttons ----
  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.closest('.code').querySelector('pre');
      navigator.clipboard.writeText(pre.innerText).then(function () {
        var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1300);
      });
    });
  });
})();
