(function () {
  var trigger = document.querySelector('[data-semantic-open]');
  if (!trigger) return;

  var dataEl = document.getElementById('term-data');
  var data = { writeups: [] };
  try { if (dataEl) data = Object.assign(data, JSON.parse(dataEl.textContent)); } catch (e) { /* ignore */ }
  var docs = data.writeups || [];
  if (!docs.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root, input, listEl, statusEl;
  var extractor = null, docVecs = null, loading = null, results = [], sel = 0, debounce = null;

  var MODEL_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function status(msg) {
    statusEl.textContent = msg || '';
    statusEl.style.display = msg ? 'block' : 'none';
  }

  function build() {
    root = document.createElement('div');
    root.className = 'cmdk sem';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Semantic search');
    root.innerHTML =
      '<div class="cmdk__backdrop" data-sem-close></div>' +
      '<div class="cmdk__panel">' +
        '<input class="cmdk__input" type="text" autocomplete="off" spellcheck="false" placeholder="Describe what you’re looking for…" aria-label="Semantic search">' +
        '<div class="cmdk__status" role="status"></div>' +
        '<ul class="cmdk__list" role="listbox"></ul>' +
        '<div class="cmdk__foot"><span>semantic search · embeddings run locally in your browser</span></div>' +
      '</div>';
    document.body.appendChild(root);
    input = root.querySelector('.cmdk__input');
    listEl = root.querySelector('.cmdk__list');
    statusEl = root.querySelector('.cmdk__status');
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
    root.querySelector('[data-sem-close]').addEventListener('click', close);
  }

  function ensureModel() {
    if (loading) return loading;
    loading = (async function () {
      status('loading model (~25 MB, first time only)…');
      var mod = await import(MODEL_URL);
      mod.env.allowLocalModels = false;
      extractor = await mod.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
      status('indexing writeups…');
      docVecs = [];
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i];
        var text = d.title + '. ' + (d.desc || '') + ' ' + (d.cat || '') + ' ' + (d.platform || '') + ' ' + (d.tags || []).join(' ');
        var out = await extractor(text, { pooling: 'mean', normalize: true });
        docVecs.push(Array.from(out.data));
      }
      status('');
    })().catch(function (e) {
      status('could not load the model — check your connection and try again.');
      loading = null;
      throw e;
    });
    return loading;
  }

  function dot(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

  function onInput() {
    window.clearTimeout(debounce);
    var q = input.value.trim();
    if (!q) { results = []; render(); return; }
    debounce = window.setTimeout(function () { runQuery(q); }, 280);
  }

  async function runQuery(q) {
    try { await ensureModel(); } catch (e) { return; }
    if (!extractor) return;
    var out = await extractor(q, { pooling: 'mean', normalize: true });
    var qv = Array.from(out.data);
    results = docs.map(function (d, i) { return { d: d, score: dot(qv, docVecs[i]) }; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 6);
    sel = 0;
    render();
  }

  function render() {
    listEl.innerHTML = '';
    results.forEach(function (r, i) {
      var pct = Math.max(0, Math.min(100, Math.round(r.score * 100)));
      var li = document.createElement('li');
      li.className = 'cmdk__item' + (i === sel ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.innerHTML =
        '<span class="cmdk__icon">#</span>' +
        '<span class="cmdk__label">' + esc(r.d.title) + '</span>' +
        '<span class="cmdk__sub">' + pct + '% match</span>';
      li.addEventListener('click', function () { go(r.d); });
      li.addEventListener('mousemove', function () { if (sel !== i) { sel = i; paint(); } });
      listEl.appendChild(li);
    });
  }
  function paint() {
    Array.prototype.forEach.call(listEl.children, function (li, i) {
      li.classList.toggle('is-active', i === sel);
    });
  }
  function go(d) { if (d && d.url) { close(); location.href = d.url; } }

  function onKey(e) {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, results.length - 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') { go(results[sel] && results[sel].d); e.preventDefault(); }
    else if (e.key === 'Escape') { close(); }
  }

  function show() {
    if (!root) build();
    root.hidden = false;
    input.value = '';
    results = []; render(); status('');
    window.setTimeout(function () { input.focus(); }, 10);
    ensureModel().catch(function () { /* surfaced in status */ });
  }
  function close() { if (root) root.hidden = true; }

  trigger.addEventListener('click', show);
})();
