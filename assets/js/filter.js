(function () {
  const cards = Array.from(document.querySelectorAll('.card'));
  const filters = Array.from(document.querySelectorAll('.filter'));
  const search = document.getElementById('search');
  const noResults = document.getElementById('no-results');

  const active = { category: 'all', platform: 'all' };
  let query = '';

  function currentLang() {
    return (window.__draftzzLang && window.__draftzzLang()) || 'en';
  }

  function apply() {
    const lang = currentLang();
    let visibleCount = 0;
    cards.forEach(card => {
      const matchesLang = card.dataset.lang === lang;
      const matchesCategory = active.category === 'all' || card.dataset.category === active.category;
      const matchesPlatform = active.platform === 'all' || card.dataset.platform === active.platform;
      const matchesQuery = !query || card.dataset.search.includes(query);
      const show = matchesLang && matchesCategory && matchesPlatform && matchesQuery;
      card.hidden = !show;
      if (show) visibleCount++;
    });
    if (noResults) noResults.hidden = visibleCount !== 0;
  }

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.filterType || 'category';
      filters.forEach(b => {
        if ((b.dataset.filterType || 'category') === type) {
          b.classList.remove('is-active');
        }
      });
      btn.classList.add('is-active');
      active[type] = btn.dataset.filter;
      apply();
    });
  });

  if (search) {
    search.addEventListener('input', e => {
      query = e.target.value.trim().toLowerCase();
      apply();
    });
  }

  document.addEventListener('langchange', apply);

  // Initial pass once lang.js has set preference
  document.addEventListener('DOMContentLoaded', apply);
  apply();
})();
