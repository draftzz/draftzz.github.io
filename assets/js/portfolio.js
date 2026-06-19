(function () {
  const tabs = Array.from(document.querySelectorAll('[data-project-toggle]'));
  const panels = Array.from(document.querySelectorAll('[data-project-panel]'));
  const consoleLine = document.querySelector('[data-console-line]');
  const clock = document.querySelector('[data-live-clock]');
  const map = document.querySelector('[data-system-map]');

  const consoleLines = [
    'vesai.rag -> hybrid retrieval + cited technical answer',
    'ecoa.ops -> occurrence captured, owner assigned, action tracked',
    'analytics.sql -> chassis timeline, delta calculated, status resolved',
    'research.lab -> exploit hypothesis, proof, remediation notes'
  ];

  let lineIndex = 0;

  function activateProject(slug) {
    tabs.forEach(tab => {
      const active = tab.dataset.projectToggle === slug;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach(panel => {
      const active = panel.dataset.projectPanel === slug;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    if (map) {
      map.dataset.activeProject = slug;
    }

    if (consoleLine) {
      const tab = tabs.find(item => item.dataset.projectToggle === slug);
      const label = tab ? tab.innerText.replace(/\s+/g, ' ').trim() : slug;
      consoleLine.textContent = 'focus switched -> ' + label.toLowerCase();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateProject(tab.dataset.projectToggle));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = tabs.indexOf(tab);
      let nextIndex = currentIndex;

      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;

      tabs[nextIndex].focus();
      activateProject(tabs[nextIndex].dataset.projectToggle);
    });
  });

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

  tickConsole();
  tickClock();
  window.setInterval(tickConsole, 3800);
  window.setInterval(tickClock, 1000);
})();
