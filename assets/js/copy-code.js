(function () {
  document.querySelectorAll('.writeup__body pre, .writeup__body div.highlight').forEach(block => {
    if (block.querySelector('.copy-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.textContent = 'copy';

    block.style.position = 'relative';
    block.appendChild(btn);

    btn.addEventListener('click', async () => {
      const code = block.querySelector('code') || block;
      const text = code.innerText;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '✓ copied';
        btn.classList.add('is-copied');
        setTimeout(() => {
          btn.textContent = 'copy';
          btn.classList.remove('is-copied');
        }, 1500);
      } catch (e) {
        btn.textContent = 'error';
      }
    });
  });
})();
