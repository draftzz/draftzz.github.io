(function () {
  var KEY = 'draftzz_theme';
  var root = document.documentElement;

  function isLight() { return root.getAttribute('data-theme') === 'light'; }

  function sync() {
    var light = isLight();
    var icon = light ? '☾' : '☀';            // moon when light, sun when dark
    var label = light ? 'Switch to dark theme' : 'Switch to light theme';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var i = btn.querySelector('.nav__theme-icon');
      if (i) i.textContent = icon;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#eef1f6' : '#030611');
  }

  function toggle() {
    if (isLight()) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'light');
    try { localStorage.setItem(KEY, isLight() ? 'light' : 'dark'); } catch (e) { /* ignore */ }
    sync();
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', toggle);
  });

  sync();
})();
