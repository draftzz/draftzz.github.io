(function () {
  const cards = Array.from(document.querySelectorAll('.writeup-card'));
  const filters = Array.from(document.querySelectorAll('.filter'));
  const search = document.getElementById('search');
  const noResults = document.getElementById('no-results');

  const active = { category: 'all', platform: 'all' };
  let query = '';

  function apply() {
    let visibleCount = 0;
    cards.forEach(card => {
      const matchesCategory = active.category === 'all' || card.dataset.category === active.category;
      const matchesPlatform = active.platform === 'all' || card.dataset.platform === active.platform;
      const matchesQuery = !query || card.dataset.search.includes(query);
      const show = matchesCategory && matchesPlatform && matchesQuery;
      card.hidden = !show;
      if (show) visibleCount++;
    });
    if (noResults) noResults.hidden = visibleCount !== 0;
  }

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.filterType || 'category';
      filters.forEach(b => {
        if ((b.dataset.filterType || 'category') === type) b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      filters.forEach(b => {
        if ((b.dataset.filterType || 'category') === type) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        }
      });
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

  apply();
})();
