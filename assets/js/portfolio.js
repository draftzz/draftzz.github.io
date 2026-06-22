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
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    items.forEach(item => observer.observe(item));
  }

  function initPanelHover() {
    if (!finePointer) return;
    document.querySelectorAll('.interactive-panel').forEach(panel => {
      let rect = null;
      let frame = null;
      let latest = null;

      panel.addEventListener('pointerenter', () => {
        rect = panel.getBoundingClientRect();
      });

      panel.addEventListener('pointermove', event => {
        latest = event;
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = null;
          if (!rect || !latest) return;
          const x = ((latest.clientX - rect.left) / rect.width) * 100;
          const y = ((latest.clientY - rect.top) / rect.height) * 100;
          panel.style.setProperty('--mx', x.toFixed(2) + '%');
          panel.style.setProperty('--my', y.toFixed(2) + '%');
        });
      }, { passive: true });

      panel.addEventListener('pointerleave', () => {
        rect = null;
        latest = null;
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }
        panel.style.removeProperty('--mx');
        panel.style.removeProperty('--my');
      });
    });
  }

  function initCursorTrail() {
    if (!finePointer || reduceMotion) return;

    const trail = document.createElement('div');
    trail.className = 'cursor-trail';
    trail.setAttribute('aria-hidden', 'true');

    const dotCount = 5;
    const dots = Array.from({ length: dotCount }, (_, index) => {
      const dot = document.createElement('span');
      dot.className = 'cursor-trail__dot';
      dot.style.setProperty('--trail-size', Math.max(3, 8 - index * 0.85) + 'px');
      dot.style.setProperty('--trail-delay', (index * 18) + 'ms');
      dot.style.setProperty('--trail-opacity', Math.max(0.08, 0.55 - index * 0.08).toFixed(2));
      trail.appendChild(dot);
      return dot;
    });

    let frame = null;
    let idleTimer = null;
    let latest = null;

    function move(event) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      latest = event;
      trail.classList.add('is-active');
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(hide, 180);
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        if (!latest) return;
        const transform = `translate3d(${latest.clientX}px, ${latest.clientY}px, 0) translate(-50%, -50%)`;
        dots.forEach(dot => {
          dot.style.transform = transform;
        });
      });
    }

    function hide() {
      latest = null;
      trail.classList.remove('is-active');
    }

    document.body.appendChild(trail);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('pointerdown', () => trail.classList.add('is-pressed'));
    window.addEventListener('pointerup', () => trail.classList.remove('is-pressed'));
  }

  window.addEventListener('scroll', updateProgress, { passive: true });

  tickConsole();
  tickClock();
  updateProgress();
  initReveal();
  initPanelHover();
  initCursorTrail();
  window.setInterval(tickConsole, 3800);
  window.setInterval(tickClock, 1000);
})();
