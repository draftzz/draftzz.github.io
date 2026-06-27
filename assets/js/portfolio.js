(function () {
  document.documentElement.classList.add('js');

  const consoleLine = document.querySelector('[data-console-line]');
  const clock = document.querySelector('[data-live-clock]');
  const progress = document.querySelector('.scroll-progress');
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const consoleLines = [
    'vesai.rag -> hybrid retrieval + cited answer',
    'ecoa.ops -> occurrence captured + action tracked',
    'analytics.sql -> chassis timeline + delta resolved',
    'research.lab -> hypothesis + proof + remediation'
  ];

  let lineIndex = 0;

  function tickConsole() {
    if (!consoleLine) return;
    consoleLine.textContent = consoleLines[lineIndex % consoleLines.length];
    lineIndex += 1;
  }

  function tickClock() {
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateProgress() {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = pct + '%';
  }

  function initReveal() {
    const items = Array.from(document.querySelectorAll('.reveal-on-scroll'));
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(item => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = +entry.target.dataset.revealDelay || 0;
        if (delay) {
          window.setTimeout(() => entry.target.classList.add('is-visible'), delay);
        } else {
          entry.target.classList.add('is-visible');
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    items.forEach(item => observer.observe(item));
  }

  function animateCount(el) {
    const target = parseInt(el.dataset.target, 10) || 0;
    const duration = 900;
    let started = null;
    function step(ts) {
      if (started === null) started = ts;
      const p = Math.min((ts - started) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toString();
      if (p < 1) window.requestAnimationFrame(step);
      else el.textContent = target.toString();
    }
    window.requestAnimationFrame(step);
  }

  function initCounters() {
    const nums = Array.from(document.querySelectorAll('.mini-stat span'));
    if (!nums.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    nums.forEach(el => {
      const target = parseInt(el.textContent.trim(), 10);
      if (isNaN(target)) return;
      el.dataset.target = target;
      el.textContent = '0';
      observer.observe(el);
    });
  }

  function initPanelHover() {
    if (!finePointer) return;

    let active = null;   // panel currently under the pointer
    let px = 0, py = 0;  // last known pointer position (viewport coords)
    let frame = null;

    function update() {
      frame = null;
      if (!active) return;
      // Recompute the rect every frame so the glow stays correct while
      // the panel moves under a stationary pointer (e.g. on scroll).
      const rect = active.getBoundingClientRect();
      const x = ((px - rect.left) / rect.width) * 100;
      const y = ((py - rect.top) / rect.height) * 100;
      active.style.setProperty('--mx', x.toFixed(2) + '%');
      active.style.setProperty('--my', y.toFixed(2) + '%');
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    document.querySelectorAll('.interactive-panel').forEach(panel => {
      panel.addEventListener('pointerenter', event => {
        active = panel;
        px = event.clientX;
        py = event.clientY;
        schedule();
      });

      panel.addEventListener('pointermove', event => {
        active = panel;
        px = event.clientX;
        py = event.clientY;
        schedule();
      }, { passive: true });

      panel.addEventListener('pointerleave', () => {
        if (active === panel) active = null;
        panel.style.removeProperty('--mx');
        panel.style.removeProperty('--my');
      });
    });

    // Keep the glow under the pointer while the page scrolls.
    window.addEventListener('scroll', () => {
      if (active) schedule();
    }, { passive: true });
  }

  function initCursorTrail() {
    if (!finePointer || reduceMotion) return;

    const cursor = document.createElement('div');
    cursor.className = 'cursor-x';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML =
      '<div class="cursor-x__reticle">' +
        '<span class="cursor-x__ring"></span>' +
        '<span class="cursor-x__dot"></span>' +
      '</div>';
    document.body.appendChild(cursor);

    const lockSelector = 'a, button, input, textarea, select, label, summary, ' +
      '[role="button"], .filter, .nav__lang-pill, .term-launcher, .terminal__close, ' +
      '.card, .project-card, .contact-card, .interactive-panel, .tag-cloud-link';

    const pointer = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = null;
    let visible = false;

    function start() {
      if (!frame) frame = window.requestAnimationFrame(animate);
    }

    function animate() {
      frame = null;
      pos.x += (pointer.x - pos.x) * 0.4;
      pos.y += (pointer.y - pos.y) * 0.4;
      cursor.style.transform =
        'translate3d(' + pos.x + 'px, ' + pos.y + 'px, 0) translate(-50%, -50%)';
      if (Math.abs(pointer.x - pos.x) + Math.abs(pointer.y - pos.y) > 0.4) start();
    }

    function move(event) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!visible) {
        visible = true;
        cursor.classList.add('is-visible');
        document.documentElement.classList.add('custom-cursor');
      }
      const locked = event.target && event.target.closest && event.target.closest(lockSelector);
      cursor.classList.toggle('is-locked', !!locked);
      start();
    }

    function hide() {
      visible = false;
      cursor.classList.remove('is-visible');
      document.documentElement.classList.remove('custom-cursor');
    }

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
  }

  window.addEventListener('scroll', updateProgress, { passive: true });

  tickConsole();
  tickClock();
  updateProgress();
  initReveal();
  initCounters();
  initPanelHover();
  initCursorTrail();
  window.setInterval(tickConsole, 3800);
  window.setInterval(tickClock, 1000);
})();
