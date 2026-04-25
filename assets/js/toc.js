(function () {
  const body = document.querySelector('.writeup__body');
  const nav = document.getElementById('toc-nav');
  if (!body || !nav) return;

  const headings = Array.from(body.querySelectorAll('h2, h3'));
  const aside = nav.closest('.toc');
  if (headings.length < 3) {
    // Skip TOC for very short writeups; aside starts hidden, leave it that way
    return;
  }
  if (aside) aside.hidden = false;

  // Add anchor link icon to each heading
  headings.forEach(h => {
    if (!h.id) return;
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + h.id;
    anchor.setAttribute('aria-label', 'Link to ' + (h.textContent || '').trim());
    anchor.textContent = '#';
    h.appendChild(anchor);
  });

  // Build TOC
  const ul = document.createElement('ul');
  ul.className = 'toc__list';
  headings.forEach(h => {
    if (!h.id) return;
    const li = document.createElement('li');
    li.className = 'toc__item toc__item--' + h.tagName.toLowerCase();
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.className = 'toc__link';
    a.textContent = (h.textContent || '').replace(/^#\s*/, '').replace(/#$/, '').trim();
    li.appendChild(a);
    ul.appendChild(li);
  });
  nav.appendChild(ul);

  // Highlight current section on scroll
  const links = Array.from(nav.querySelectorAll('.toc__link'));
  const linkById = new Map();
  links.forEach(l => linkById.set(decodeURIComponent(l.getAttribute('href').slice(1)), l));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = linkById.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  headings.forEach(h => { if (h.id) observer.observe(h); });
})();
