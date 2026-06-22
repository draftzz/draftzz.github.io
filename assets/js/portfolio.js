(function () {
  const consoleLine = document.querySelector('[data-console-line]');
  const clock = document.querySelector('[data-live-clock]');
  const aura = document.querySelector('.cursor-aura');
  const trailDots = Array.from(document.querySelectorAll('.cursor-trail span'));
  const progress = document.querySelector('.scroll-progress');

  const consoleLines = [
    'vesai.rag -> hybrid retrieval + cited answer',
    'ecoa.ops -> occurrence captured + action tracked',
    'analytics.sql -> chassis timeline + delta resolved',
    'research.lab -> hypothesis + proof + remediation'
  ];

  let lineIndex = 0;
  let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const dotState = trailDots.map(() => ({ x: pointer.x, y: pointer.y }));

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

  function animateCursor() {
    if (aura) {
      aura.style.left = pointer.x + 'px';
      aura.style.top = pointer.y + 'px';
    }

    trailDots.forEach((dot, index) => {
      const previous = index === 0 ? pointer : dotState[index - 1];
      dotState[index].x += (previous.x - dotState[index].x) * 0.28;
      dotState[index].y += (previous.y - dotState[index].y) * 0.28;
      dot.style.left = dotState[index].x + 'px';
      dot.style.top = dotState[index].y + 'px';
    });

    window.requestAnimationFrame(animateCursor);
  }

  window.addEventListener('pointermove', event => {
    pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  window.addEventListener('scroll', updateProgress, { passive: true });

  tickConsole();
  tickClock();
  updateProgress();
  animateCursor();
  window.setInterval(tickConsole, 3800);
  window.setInterval(tickClock, 1000);
})();
