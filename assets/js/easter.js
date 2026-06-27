(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- console greeting for the curious ---
  var cyan = 'color:#62e7ff;font-family:monospace';
  var green = 'color:#39ff9c;font-weight:700;font-family:monospace';
  try {
    console.log('%cdraftzz@portfolio:~$ whoami', cyan);
    console.log('%cpoking around the console? respect. ☕', cyan);
    console.log('%cdraftzz{w3lc0m3_t0_th3_c0ns0l3}', green);
    console.log('%cpsst — Konami code: ↑ ↑ ↓ ↓ ← → ← → B A', 'color:#7aa7ff;font-family:monospace');
    console.log('%crecruiter? let\'s talk → brunomoreira2712@gmail.com', 'color:#ffc857;font-family:monospace');
  } catch (e) { /* ignore */ }

  // --- Konami code ---
  var seq = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  var pos = 0;
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    if (k === seq[pos]) {
      pos += 1;
      if (pos === seq.length) { pos = 0; unlock(); }
    } else {
      pos = (k === seq[0]) ? 1 : 0;
    }
  });

  var firing = false;
  function unlock() {
    if (firing) return;
    firing = true;

    var toast = document.createElement('div');
    toast.className = 'konami-toast';
    toast.innerHTML = '<span class="konami-toast__tag">root access granted</span>' +
      '<span class="konami-toast__flag">draftzz{k0n4m1_unl0ck3d}</span>';
    document.body.appendChild(toast);

    if (!reduce) matrixBurst();

    window.setTimeout(function () { toast.classList.add('is-out'); }, 2600);
    window.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      firing = false;
    }, 3300);
  }

  function matrixBurst() {
    var canvas = document.createElement('canvas');
    canvas.className = 'konami-matrix';
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    document.body.appendChild(canvas);

    var w = canvas.width = window.innerWidth;
    var h = canvas.height = window.innerHeight;
    var fontSize = 16;
    var cols = Math.floor(w / fontSize);
    var drops = [];
    var i;
    for (i = 0; i < cols; i++) drops[i] = Math.floor(Math.random() * -20);
    var glyphs = '01<>{}[]/\\|=+*#$%&abcdef0123456789';

    var start = null;
    var raf = null;
    function frame(ts) {
      if (start === null) start = ts;
      var elapsed = ts - start;
      ctx.fillStyle = 'rgba(3,6,17,0.18)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#39ff9c';
      ctx.font = fontSize + 'px monospace';
      for (i = 0; i < drops.length; i++) {
        var ch = glyphs.charAt(Math.floor(Math.random() * glyphs.length));
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 1;
      }
      if (elapsed < 2800) {
        raf = window.requestAnimationFrame(frame);
      } else {
        canvas.classList.add('is-out');
        window.setTimeout(function () { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }, 500);
        if (raf) window.cancelAnimationFrame(raf);
      }
    }
    raf = window.requestAnimationFrame(frame);
  }
})();
