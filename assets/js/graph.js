(function () {
  var host = document.getElementById('tech-graph');
  if (!host) return;
  var canvas = host.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var dataEl = document.getElementById('term-data');
  var data = { writeups: [] };
  try { if (dataEl) data = Object.assign(data, JSON.parse(dataEl.textContent)); } catch (e) { /* ignore */ }
  var writeups = data.writeups || [];
  if (!writeups.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // Build nodes (techniques + writeups) and links.
  var nodes = [];
  var index = {};
  function addNode(n) { n.id = nodes.length; nodes.push(n); return n; }

  var techMap = {};
  writeups.forEach(function (w) {
    (w.tags || []).forEach(function (t) {
      var key = slug(t);
      if (!techMap[key]) techMap[key] = addNode({ kind: 'tech', label: t, slug: key, deg: 0, x: 0, y: 0, vx: 0, vy: 0 });
      techMap[key].deg += 1;
    });
  });
  var links = [];
  writeups.forEach(function (w) {
    var wn = addNode({ kind: 'writeup', label: w.title, url: w.url, deg: (w.tags || []).length, x: 0, y: 0, vx: 0, vy: 0 });
    (w.tags || []).forEach(function (t) {
      var tn = techMap[slug(t)];
      if (tn) links.push({ a: wn.id, b: tn.id });
    });
  });
  nodes.forEach(function (n) { index[n.id] = n; });

  var neighbors = {};
  nodes.forEach(function (n) { neighbors[n.id] = {}; });
  links.forEach(function (l) { neighbors[l.a][l.b] = 1; neighbors[l.b][l.a] = 1; });

  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    var r = host.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  // Seed positions in a circle.
  nodes.forEach(function (n, i) {
    var a = (i / nodes.length) * Math.PI * 2;
    n.x = W / 2 + Math.cos(a) * Math.min(W, H) * 0.32 + (i % 3 - 1) * 8;
    n.y = H / 2 + Math.sin(a) * Math.min(W, H) * 0.32 + (i % 2) * 8;
  });

  var theme = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    theme.accent = (cs.getPropertyValue('--accent') || '#62e7ff').trim();
    theme.a2 = (cs.getPropertyValue('--accent-2') || '#7aa7ff').trim();
    theme.text = (cs.getPropertyValue('--text') || '#f4f7fb').trim();
    var tr = (cs.getPropertyValue('--text-rgb') || '244,247,251').trim();
    var ti = (cs.getPropertyValue('--tint-rgb') || '255,255,255').trim();
    theme.muted = 'rgba(' + tr + ',.55)';
    theme.edge = 'rgba(' + ti + ',.16)';
  }
  readColors();

  function radius(n) { return n.kind === 'tech' ? 4 + Math.min(n.deg, 8) * 1.3 : 5.5; }

  var hover = null, drag = null, energy = 1, alive = true;

  function step() {
    // Repulsion (O(n^2), fine for this size).
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d2 = dx * dx + dy * dy || 0.01;
        var f = 1400 / d2;
        var d = Math.sqrt(d2);
        var fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
    }
    // Springs.
    links.forEach(function (l) {
      var a = nodes[l.a], b = nodes[l.b];
      var dx = b.x - a.x, dy = b.y - a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var f = (d - 74) * 0.02;
      var fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    });
    // Gravity + integrate.
    energy = 0;
    nodes.forEach(function (n) {
      if (n === drag) { n.vx = 0; n.vy = 0; return; }
      n.vx += (W / 2 - n.x) * 0.012;
      n.vy += (H / 2 - n.y) * 0.012;
      n.vx *= 0.84; n.vy *= 0.84;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(16, Math.min(W - 16, n.x));
      n.y = Math.max(16, Math.min(H - 16, n.y));
      energy += Math.abs(n.vx) + Math.abs(n.vy);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Edges.
    links.forEach(function (l) {
      var a = nodes[l.a], b = nodes[l.b];
      var on = hover && (l.a === hover.id || l.b === hover.id);
      ctx.strokeStyle = on ? theme.accent : theme.edge;
      ctx.globalAlpha = hover && !on ? 0.25 : 1;
      ctx.lineWidth = on ? 1.4 : 0.8;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // Nodes.
    nodes.forEach(function (n) {
      var dim = hover && n !== hover && !neighbors[hover.id][n.id];
      var r = radius(n);
      ctx.globalAlpha = dim ? 0.3 : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n.kind === 'tech' ? theme.accent : theme.a2;
      ctx.fill();
      if (n === hover) { ctx.lineWidth = 2; ctx.strokeStyle = theme.text; ctx.stroke(); }
      // Labels: techniques always, writeups on hover/neighbor.
      var showLabel = n.kind === 'tech' || (hover && (n === hover || neighbors[hover.id][n.id]));
      if (showLabel) {
        ctx.globalAlpha = dim ? 0.3 : 1;
        ctx.fillStyle = n === hover ? theme.text : theme.muted;
        ctx.font = (n === hover ? '700 ' : '') + '11px ui-monospace, monospace';
        ctx.fillText(n.label, n.x + r + 4, n.y + 4);
      }
    });
    ctx.globalAlpha = 1;
  }

  function loop() {
    if (!alive) return;
    if (!drag && energy < 0.4) { draw(); return; } // settled: stop the rAF
    step(); draw();
    window.requestAnimationFrame(loop);
  }
  function kick() { if (energy < 0.4) { energy = 1; window.requestAnimationFrame(loop); } }

  if (reduce) { for (var k = 0; k < 220; k++) step(); draw(); }
  else window.requestAnimationFrame(loop);

  // Interaction.
  function at(mx, my) {
    var best = null, bd = 18;
    nodes.forEach(function (n) {
      var d = Math.hypot(n.x - mx, n.y - my);
      if (d < Math.max(bd, radius(n) + 6) && (!best || d < bd)) { best = n; bd = d; }
    });
    return best;
  }
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  canvas.addEventListener('mousemove', function (e) {
    var p = pos(e);
    if (drag) { drag.x = p.x; drag.y = p.y; kick(); return; }
    var n = at(p.x, p.y);
    if (n !== hover) { hover = n; canvas.style.cursor = n ? 'pointer' : 'default'; if (energy < 0.4) draw(); }
  });
  canvas.addEventListener('mousedown', function (e) { var n = at(pos(e).x, pos(e).y); if (n) { drag = n; kick(); } });
  window.addEventListener('mouseup', function () { drag = null; });
  canvas.addEventListener('click', function (e) {
    var n = at(pos(e).x, pos(e).y);
    if (!n) return;
    if (n.kind === 'writeup' && n.url) { location.href = n.url; }
    else if (n.kind === 'tech') { var el = document.getElementById(n.slug); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  });
  canvas.addEventListener('mouseleave', function () { hover = null; if (energy < 0.4) draw(); });

  window.addEventListener('resize', function () { resize(); kick(); }, { passive: true });
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { window.setTimeout(function () { readColors(); draw(); }, 0); });
  });
})();
