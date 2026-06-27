(function () {
  // Cinematic boot sequence for the home page.
  // Additive + graceful: if this script never runs (no JS), the site shows
  // normally. We bail on reduced-motion and only play once per tab session.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = null;
  try { seen = sessionStorage.getItem('draftzz_booted'); } catch (e) { seen = null; }
  if (reduce || seen) return;
  try { sessionStorage.setItem('draftzz_booted', '1'); } catch (e) { /* ignore */ }

  var lines = [
    '<span class="ok">[  ok  ]</span> kernel ............ applied-systems',
    '<span class="ok">[  ok  ]</span> identity .......... Bruno "draftzz" Moreira',
    '<span class="ok">[  ok  ]</span> modules ........... ai · ops · automotive · security',
    '<span class="ok">[  ok  ]</span> projects .......... mounted',
    '<span class="ok">[  ok  ]</span> research .......... indexed',
    '<span class="ok">[  ok  ]</span> security .......... armed',
    '<span class="ready">[ ready ]</span> portfolio online — welcome.'
  ];

  var screen = document.createElement('div');
  screen.className = 'boot-screen';
  screen.setAttribute('aria-hidden', 'true');

  var inner = document.createElement('div');
  inner.className = 'boot-screen__inner';
  inner.innerHTML = '<p class="boot-screen__cmd">draftzz@portfolio:~$ <span class="dim">./boot --portfolio</span></p>';

  var lineEls = lines.map(function (html) {
    var p = document.createElement('p');
    p.className = 'boot-line';
    p.innerHTML = html;
    inner.appendChild(p);
    return p;
  });

  var cursor = document.createElement('span');
  cursor.className = 'boot-cursor';
  inner.appendChild(cursor);
  screen.appendChild(inner);

  var skip = document.createElement('div');
  skip.className = 'boot-skip';
  skip.textContent = 'press any key to skip';
  screen.appendChild(skip);

  var revealTimer = null;
  var safetyTimer = null;
  var done = false;

  function end() {
    if (done) return;
    done = true;
    if (revealTimer) window.clearInterval(revealTimer);
    if (safetyTimer) window.clearTimeout(safetyTimer);
    document.documentElement.classList.remove('boot-lock');
    screen.classList.add('is-hiding');
    window.setTimeout(function () {
      if (screen.parentNode) screen.parentNode.removeChild(screen);
    }, 520);
    window.removeEventListener('keydown', end);
    window.removeEventListener('pointerdown', end);
  }

  function mount() {
    document.documentElement.classList.add('boot-lock');
    document.body.appendChild(screen);

    var i = 0;
    revealTimer = window.setInterval(function () {
      if (i >= lineEls.length) {
        window.clearInterval(revealTimer);
        revealTimer = null;
        window.setTimeout(end, 1100);
        return;
      }
      lineEls[i].classList.add('is-in');
      i += 1;
    }, 500);

    window.addEventListener('keydown', end);
    window.addEventListener('pointerdown', end);
    // Safety net: never trap the visitor behind the boot screen.
    safetyTimer = window.setTimeout(end, 8000);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
