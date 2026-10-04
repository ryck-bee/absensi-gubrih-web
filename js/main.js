/* ==========================================================================
   Console — admin dashboard  ·  vanilla JS (no jQuery)
   Loaded in <head> so the theme/sidebar boot runs before first paint.
   ========================================================================== */

/* ---- Early boot: apply saved theme + sidebar state (no FOUC) ---------- */
(function boot() {
  try {
    var theme = localStorage.getItem('console-theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    var role = localStorage.getItem('console-user-role');
    if (role) {
      document.documentElement.setAttribute('data-user-role', role);
    }
    if (localStorage.getItem('console-sidebar') === 'collapsed') {
      document.documentElement.setAttribute('data-sidebar', 'collapsed');
    }
  } catch (e) { /* storage unavailable — carry on */ }
})();

document.addEventListener('DOMContentLoaded', function () {
  initThemeToggle();
  initSidebar();
  initDropdowns();
  initSegments();
  initTasks();
  initProgress();
  initTableSort();
  initLoginForm();
  initCharts();
});

/* ---- helpers ---------------------------------------------------------- */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ---- Theme toggle ----------------------------------------------------- */
var themeChangeHooks = [];

function initThemeToggle() {
  var btn = document.getElementById('themeToggle');
  syncThemeIcon();
  if (!btn) return;

  btn.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    if (!current) {
      // no explicit theme yet — infer from OS, then flip
      current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.add('theme-anim');
    setTimeout(function () { document.documentElement.classList.remove('theme-anim'); }, 550);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('console-theme', next); } catch (e) {}
    syncThemeIcon();
    themeChangeHooks.forEach(function (fn) { fn(); });
  });
}

function syncThemeIcon() {
  var sun = document.querySelector('#themeToggle .ic-sun');
  var moon = document.querySelector('#themeToggle .ic-moon');
  if (!sun || !moon) return;
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  sun.hidden = isDark;
  moon.hidden = !isDark;
}

/* ---- Sidebar (desktop collapse + mobile off-canvas) ------------------- */
function initSidebar() {
  var toggle = document.getElementById('sidebarToggle');
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('backdrop');
  if (!toggle || !sidebar) return;

  var isMobile = function () { return window.matchMedia('(max-width: 991px)').matches; };

  function openMobile() {
    sidebar.classList.add('is-open');
    if (backdrop) { backdrop.hidden = false; requestAnimationFrame(function () { backdrop.classList.add('is-open'); }); }
    toggle.setAttribute('aria-expanded', 'true');
  }
  function closeMobile() {
    sidebar.classList.remove('is-open');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      setTimeout(function () { if (!sidebar.classList.contains('is-open')) backdrop.hidden = true; }, 260);
    }
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    if (isMobile()) {
      sidebar.classList.contains('is-open') ? closeMobile() : openMobile();
    } else {
      var collapsed = document.documentElement.getAttribute('data-sidebar') === 'collapsed';
      if (collapsed) {
        document.documentElement.removeAttribute('data-sidebar');
        try { localStorage.removeItem('console-sidebar'); } catch (e) {}
      } else {
        document.documentElement.setAttribute('data-sidebar', 'collapsed');
        try { localStorage.setItem('console-sidebar', 'collapsed'); } catch (e) {}
      }
    }
  });

  if (backdrop) backdrop.addEventListener('click', closeMobile);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) closeMobile();
  });
  sidebar.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () { if (isMobile()) closeMobile(); });
  });
  window.addEventListener('resize', function () {
    if (!isMobile()) closeMobile();
  });
}

/* ---- Dropdowns (notifications + user menu) ---------------------------- */
function initDropdowns() {
  var pairs = [
    { btn: 'notifBtn', menu: 'notifMenu' },
    { btn: 'userBtn', menu: 'userMenu' }
  ];
  var open = null;

  function closeAll() {
    pairs.forEach(function (p) {
      var b = document.getElementById(p.btn), m = document.getElementById(p.menu);
      if (m) m.classList.remove('is-open');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    open = null;
  }

  pairs.forEach(function (p) {
    var btn = document.getElementById(p.btn);
    var menu = document.getElementById(p.menu);
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains('is-open');
      closeAll();
      if (!isOpen) {
        menu.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        open = menu;
      }
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  document.addEventListener('click', function () { if (open) closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) closeAll(); });
}

/* ---- Segmented date range -------------------------------------------- */
function initSegments() {
  document.querySelectorAll('.segment').forEach(function (seg) {
    var buttons = seg.querySelectorAll('button');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.classList.remove('is-active'); x.removeAttribute('aria-pressed'); });
        b.classList.add('is-active');
        b.setAttribute('aria-pressed', 'true');
      });
    });
  });
}

/* ---- Tasks + progress ------------------------------------------------- */
function initTasks() {
  var list = document.getElementById('taskList');
  if (!list) return;
  var pctEl = document.getElementById('taskPct');
  var countEl = document.getElementById('taskCount');
  var bar = document.querySelector('.progress i');

  function recompute() {
    var items = list.querySelectorAll('.check');
    var done = list.querySelectorAll('.check.is-done').length;
    var total = items.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    if (pctEl) pctEl.textContent = pct + '%';
    if (countEl) countEl.textContent = done + ' of ' + total + ' done';
    if (bar) bar.style.width = pct + '%';
  }

  list.querySelectorAll('.check').forEach(function (chk) {
    chk.addEventListener('click', function () {
      var on = chk.classList.toggle('is-done');
      chk.setAttribute('aria-pressed', on ? 'true' : 'false');
      var txt = chk.parentElement.querySelector('.task-txt');
      if (txt) txt.classList.toggle('is-done', on);
      recompute();
    });
  });
  recompute();
}

function initProgress() {
  document.querySelectorAll('[data-progress]').forEach(function (el) {
    var v = parseFloat(el.getAttribute('data-progress'));
    if (!isNaN(v)) el.style.width = Math.max(0, Math.min(100, v)) + '%';
  });
}

/* ---- Sortable data table --------------------------------------------- */
function initTableSort() {
  var table = document.getElementById('ordersTable');
  if (!table) return;
  var tbody = table.querySelector('tbody');
  var headers = table.querySelectorAll('th.sortable');

  headers.forEach(function (th) {
    var idx = Array.prototype.indexOf.call(th.parentElement.children, th);
    var dir = 0; // 0 none, 1 asc, -1 desc
    th.addEventListener('click', function () {
      headers.forEach(function (h) { if (h !== th) h.removeAttribute('aria-sort'); });
      dir = dir === 1 ? -1 : 1;
      th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');

      var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
      rows.sort(function (a, b) {
        var ca = a.children[idx], cb = b.children[idx];
        var va = ca.getAttribute('data-val') || ca.textContent.trim();
        var vb = cb.getAttribute('data-val') || cb.textContent.trim();
        var na = parseFloat(va), nb = parseFloat(vb);
        var cmp;
        if (!isNaN(na) && !isNaN(nb) && String(na) === va && String(nb) === vb) {
          cmp = na - nb;
        } else if (!isNaN(na) && !isNaN(nb)) {
          cmp = na - nb;
        } else {
          cmp = va.localeCompare(vb);
        }
        return cmp * dir;
      });
      rows.forEach(function (r) { tbody.appendChild(r); });
    });
  });
}

/* ---- Login form (demo — no backend) ----------------------------------- */
function initLoginForm() {
  var form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true; }
      setTimeout(function () { window.location.href = 'index.html'; }, 700);
    });
  }
  document.querySelectorAll('[data-toggle-password]').forEach(function (t) {
    t.addEventListener('click', function () {
      var input = document.getElementById(t.getAttribute('data-toggle-password'));
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      var on = t.querySelector('.eye-on'), off = t.querySelector('.eye-off');
      if (on && off) { on.hidden = show; off.hidden = !show; }
    });
  });
}

/* ---- Charts (Chart.js) ------------------------------------------------ */
var _charts = [];

function buildLabels(n) {
  var out = [], d = new Date(2026, 6, 15); // Jul 15 2026
  for (var i = n - 1; i >= 0; i--) {
    var dt = new Date(d);
    dt.setDate(d.getDate() - i);
    out.push(dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return out;
}

function initCharts() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif";
  Chart.defaults.font.size = 12;

  renderCharts();
  // Rebuild on theme change so mark/grid colors track the palette.
  themeChangeHooks.push(function () {
    _charts.forEach(function (c) { c.destroy(); });
    _charts = [];
    renderCharts();
  });
}

function renderCharts() {
  var grid = cssVar('--chart-grid');
  var tick = cssVar('--chart-tick');
  var line = cssVar('--chart-line');
  var lineFill = cssVar('--chart-line-fill');
  var prev = cssVar('--chart-prev');
  var surface = cssVar('--surface');
  var ink = cssVar('--ink');

  var tooltipBase = {
    backgroundColor: cssVar('--ink'),
    titleColor: cssVar('--surface'),
    bodyColor: cssVar('--surface'),
    padding: 10,
    cornerRadius: 8,
    displayColors: false,
    titleFont: { weight: '600' }
  };

  /* Revenue line */
  var revCanvas = document.getElementById('revenueChart');
  if (revCanvas) {
    var current = [6820,7120,6980,7450,7210,7890,8330,7960,8210,8670,8420,9010,8780,9240,9120,8890,9450,9330,9880,9620,10120,9980,10460,10230,10780,11040,10620,11230,11480,11960];
    var previous = [6210,6480,6350,6720,6540,6910,7180,7020,7260,7540,7390,7720,7610,7880,7750,7590,7960,7880,8210,8090,8420,8330,8560,8470,8720,8890,8640,9010,9180,9320];
    var ctx = revCanvas.getContext('2d');
    var fillGrad = ctx.createLinearGradient(0, 0, 0, 300);
    fillGrad.addColorStop(0, lineFill);
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');

    _charts.push(new Chart(ctx, {
      type: 'line',
      data: {
        labels: buildLabels(30),
        datasets: [
          {
            label: 'This period', data: current,
            borderColor: line, backgroundColor: fillGrad,
            borderWidth: 2, fill: true, tension: 0.4,
            pointRadius: 0, pointHoverRadius: 5,
            pointHoverBackgroundColor: line,
            pointHoverBorderColor: surface, pointHoverBorderWidth: 2
          },
          {
            label: 'Previous', data: previous,
            borderColor: prev, backgroundColor: 'transparent',
            borderWidth: 2, borderDash: [5, 5], fill: false, tension: 0.4,
            pointRadius: 0, pointHoverRadius: 4,
            pointHoverBackgroundColor: prev,
            pointHoverBorderColor: surface, pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, tooltipBase, {
            callbacks: {
              label: function (c) { return c.dataset.label + ': $' + c.parsed.y.toLocaleString(); }
            }
          })
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: tick, maxTicksLimit: 7, maxRotation: 0, autoSkip: true }
          },
          y: {
            grid: { color: grid, drawTicks: false },
            border: { display: false },
            ticks: {
              color: tick, maxTicksLimit: 5, padding: 8,
              callback: function (v) { return '$' + (v / 1000) + 'k'; }
            }
          }
        }
      }
    }));
  }

  /* Channel donut */
  var chCanvas = document.getElementById('channelChart');
  if (chCanvas) {
    _charts.push(new Chart(chCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Online store', 'Marketplace', 'Social', 'In-store'],
        datasets: [{
          data: [48, 26, 16, 10],
          backgroundColor: [cssVar('--donut-1'), cssVar('--donut-2'), cssVar('--donut-3'), cssVar('--donut-4')],
          borderColor: surface,
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: Object.assign({}, tooltipBase, {
            callbacks: { label: function (c) { return c.label + ': ' + c.parsed + '%'; } }
          })
        }
      }
    }));
  }
}
