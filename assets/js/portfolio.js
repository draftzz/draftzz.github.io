(function () {
  const consoleLine = document.querySelector('[data-console-line]');
  const clock = document.querySelector('[data-live-clock]');
  const progress = document.querySelector('.scroll-progress');

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

  window.addEventListener('scroll', updateProgress, { passive: true });

  tickConsole();
  tickClock();
  updateProgress();
  window.setInterval(tickConsole, 3800);
  window.setInterval(tickClock, 1000);
})();
