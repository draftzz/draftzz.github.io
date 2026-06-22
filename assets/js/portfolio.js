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

    const dotCount = 7;
    const pointer = { x: -100, y: -100 };
    const dots = Array.from({ length: dotCount }, (_, index) => {
      const dot = document.createElement('span');
      dot.className = 'cursor-trail__dot';
      dot.style.setProperty('--trail-size', Math.max(3, 9 - index * 0.75) + 'px');
      trail.appendChild(dot);
      return {
        el: dot,
        x: pointer.x,
        y: pointer.y,
        opacity: Math.max(0.07, 0.58 - index * 0.06)
      };
    });

    let frame = null;
    let idleTimer = null;
    let active = false;
    let visible = false;

    function move(event) {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      active = true;
      visible = true;
      trail.classList.add('is-active');
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(hide, 180);
      start();
    }

    function hide() {
      active = false;
      trail.classList.remove('is-active');
    }

    function start() {
      if (frame) return;
      frame = window.requestAnimationFrame(animate);
    }

    function animate() {
      frame = null;
      let moving = false;

      dots.forEach((dot, index) => {
        const target = index === 0 ? pointer : dots[index - 1];
        const speed = Math.max(0.18, 0.42 - index * 0.035);
        const dx = target.x - dot.x;
        const dy = target.y - dot.y;

        dot.x += dx * speed;
        dot.y += dy * speed;
        if (Math.abs(dx) + Math.abs(dy) > 0.7) moving = true;

        dot.el.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
        dot.el.style.opacity = active ? dot.opacity.toFixed(2) : '0';
      });

      if (active || moving) {
        frame = window.requestAnimationFrame(animate);
        return;
      }

      if (visible) {
        visible = false;
        dots.forEach(dot => {
          dot.x = pointer.x;
          dot.y = pointer.y;
        });
      }
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
