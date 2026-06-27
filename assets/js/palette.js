(function () {
  var dataEl = document.getElementById('term-data');
  var data = { baseurl: '', projects: [], writeups: [] };
  try { if (dataEl) data = Object.assign(data, JSON.parse(dataEl.textContent)); } catch (e) { /* ignore */ }
  var base = data.baseurl || '';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build the searchable item list.
  var sections = [
    { label: 'About', sub: 'section', anchor: '#about' },
    { label: 'Method', sub: 'section', anchor: '#method' },
    { label: 'Projects', sub: 'section', anchor: '#projects' },
    { label: 'Research / writeups', sub: 'section', anchor: '#writeups' },
    { label: 'Contact', sub: 'section', anchor: '#contact' },
    { label: 'All projects', sub: 'page', url: base + '/projects/' },
    { label: 'Tags', sub: 'page', url: base + '/tags/' },
    { label: 'Home', sub: 'page', url: base + '/' }
  ];

  var items = [];
  sections.forEach(function (s) {
    items.push({ kind: 'nav', label: s.label, sub: s.sub, anchor: s.anchor, url: s.url, key: s.label });
  });
  (data.projects || []).forEach(function (p) {
    items.push({ kind: 'project', label: p.name, sub: p.type || 'project', url: base + '/projects/', key: p.name + ' ' + (p.type || '') });
  });
  (data.writeups || []).forEach(function (w) {
    var tags = (w.tags || []).join(' ');
    items.push({
      kind: 'writeup', label: w.title, sub: (w.cat || '') + (w.platform ? ' · ' + w.platform : ''),
      url: w.url, key: w.title + ' ' + (w.cat || '') + ' ' + (w.platform || '') + ' ' + tags
    });
  });

  function score(text, q) {
    text = text.toLowerCase();
    var idx = text.indexOf(q);
    if (idx !== -1) return idx;
    var ti = 0, qi = 0;
    while (ti < text.length && qi < q.length) {
      if (text.charAt(ti) === q.charAt(qi)) qi += 1;
      ti += 1;
    }
    return qi === q.length ? 1000 + text.length : -1;
  }

  // Build DOM.
  var root = document.createElement('div');
  root.className = 'cmdk';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Command palette');
  root.innerHTML =
    '<div class="cmdk__backdrop" data-cmdk-close></div>' +
    '<div class="cmdk__panel">' +
      '<input class="cmdk__input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Search sections, projects, writeups…" aria-label="Search">' +
      '<ul class="cmdk__list" role="listbox"></ul>' +
      '<div class="cmdk__foot"><span><b>↑↓</b> navigate</span><span><b>↵</b> open</span><span><b>esc</b> close</span></div>' +
    '</div>';
  document.body.appendChild(root);

  var input = root.querySelector('.cmdk__input');
  var list = root.querySelector('.cmdk__list');
  var results = [];
  var sel = 0;
  var open = false;

  var ICONS = { nav: '→', page: '⧉', project: '◆', writeup: '#' };

  function compute(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      return items.filter(function (it) { return it.kind === 'nav'; })
        .concat(items.filter(function (it) { return it.kind === 'writeup'; }).slice(0, 4));
    }
    return items
      .map(function (it) { return { it: it, s: score(it.key, q) }; })
      .filter(function (r) { return r.s !== -1; })
      .sort(function (a, b) { return a.s - b.s; })
      .slice(0, 9)
      .map(function (r) { return r.it; });
  }

  function render() {
    list.innerHTML = '';
    results.forEach(function (it, i) {
      var li = document.createElement('li');
      li.className = 'cmdk__item' + (i === sel ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      li.innerHTML =
        '<span class="cmdk__icon">' + (ICONS[it.kind] || '›') + '</span>' +
        '<span class="cmdk__label">' + escapeHtml(it.label) + '</span>' +
        '<span class="cmdk__sub">' + escapeHtml(it.sub || '') + '</span>';
      li.addEventListener('click', function () { activate(it); });
      li.addEventListener('mousemove', function () { if (sel !== i) { sel = i; paint(); } });
      list.appendChild(li);
    });
  }
  function paint() {
    Array.prototype.forEach.call(list.children, function (li, i) {
      var on = i === sel;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function refresh() {
    results = compute(input.value);
    sel = 0;
    render();
  }

  function onHome() {
    var p = location.pathname.replace(/index\.html$/, '');
    return p === (base + '/') || p === '/' || p === (base || '/');
  }
  function activate(it) {
    if (!it) return;
    close();
    if (it.anchor) {
      var el = document.querySelector(it.anchor);
      if (el && onHome()) { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
      location.href = base + '/' + it.anchor;
      return;
    }
    if (it.url) location.href = it.url;
  }

  function show() {
    if (open) return;
    open = true;
    root.hidden = false;
    input.value = '';
    refresh();
    window.setTimeout(function () { input.focus(); }, 10);
  }
  function close() {
    if (!open) return;
    open = false;
    root.hidden = true;
  }

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, results.length - 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') { activate(results[sel]); e.preventDefault(); }
    else if (e.key === 'Escape') { close(); }
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-cmdk-close]'), function (el) {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open ? close() : show();
    }
  });
})();
