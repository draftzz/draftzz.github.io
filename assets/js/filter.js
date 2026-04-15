(function () {
  const cards = Array.from(document.querySelectorAll('.card'));
  const filters = Array.from(document.querySelectorAll('.filter'));
  const search = document.getElementById('search');
  const noResults = document.getElementById('no-results');
  let activeFilter = 'all';
  let query = '';

  function apply() {
    let visibleCount = 0;
    cards.forEach(card => {
      const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
      const matchesQuery = !query || card.dataset.search.includes(query);
      const show = matchesFilter && matchesQuery;
      card.hidden = !show;
      if (show) visibleCount++;
    });
    if (noResults) noResults.hidden = visibleCount !== 0;
  }

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      apply();
    });
  });

  if (search) {
    search.addEventListener('input', e => {
      query = e.target.value.trim().toLowerCase();
      apply();
    });
  }
})();
