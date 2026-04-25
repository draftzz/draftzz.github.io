(function () {
  const STORAGE_KEY = 'draftzz_lang';
  const DEFAULT = 'en';
  const ALLOWED = ['en', 'pt-br'];

  function getStored() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return ALLOWED.includes(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  function setStored(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  // Preference order:
  // 1. User-stored choice
  // 2. Current page lang (writeup pages know their own lang via data-page-lang)
  // 3. Browser language if pt
  // 4. Default (en)
  function detectInitial() {
    const stored = getStored();
    if (stored) return stored;
    const pageLang = document.body && document.body.dataset.pageLang;
    if (pageLang && ALLOWED.includes(pageLang)) return pageLang;
    const nav = (navigator.language || 'en').toLowerCase();
    if (nav.startsWith('pt')) return 'pt-br';
    return DEFAULT;
  }

  let current = detectInitial();
  // Expose for filter.js
  window.__draftzzLang = function () { return current; };

  function applyVisibility() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const langSuffix = key.endsWith('-pt') ? 'pt-br' : (key.endsWith('-en') ? 'en' : null);
      if (!langSuffix) return;
      el.hidden = (langSuffix !== current);
    });
    document.querySelectorAll('.nav__lang-pill').forEach(b => {
      b.classList.toggle('is-active', b.dataset.lang === current);
    });
    if (document.documentElement && document.documentElement.dataset) {
      document.documentElement.dataset.lang = current;
    }
  }

  function findSister() {
    const link = document.querySelector('.writeup__lang-switch');
    return link ? link.getAttribute('href') : null;
  }

  function setLang(lang) {
    if (!ALLOWED.includes(lang) || lang === current) return;
    current = lang;
    setStored(lang);
    applyVisibility();

    // If we're on a writeup whose lang differs from preference, navigate to sister.
    const pageLang = document.body && document.body.dataset.pageLang;
    if (pageLang && pageLang !== lang) {
      const sister = findSister();
      if (sister) {
        window.location.href = sister;
        return;
      }
    }

    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  document.querySelectorAll('.nav__lang-pill').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      setLang(btn.dataset.lang);
    });
  });

  applyVisibility();
})();
