/* =========================================================
   AYL — minimal. One job: filter the list by category.
   State lives in the URL hash so links are shareable.
   ========================================================= */
(() => {
  const buttons = [...document.querySelectorAll('.filter button')];
  const items   = [...document.querySelectorAll('.list li')];
  const list    = document.querySelector('.list');
  const about   = document.querySelector('.about');
  const count   = document.querySelector('[data-count]');
  const archive = document.querySelector('[data-archive-box]');
  if (!buttons.length) return;

  const valid = new Set(buttons.map(b => b.dataset.f));

  function apply(f) {
    if (!valid.has(f)) f = 'about';

    buttons.forEach(b => b.setAttribute('aria-current', String(b.dataset.f === f)));

    const showAbout = f === 'about';
    about.classList.toggle('on', showAbout);
    list.classList.toggle('off', showAbout);
    count.classList.toggle('off', showAbout);
    if (archive) archive.classList.toggle('off', f !== 'writings');
    if (showAbout) { if (archive) archive.classList.add('off'); return; }

    let n = 0;
    items.forEach(li => {
      const on = li.dataset.cat === f;
      li.hidden = !on;
      if (on) n++;
    });
    count.textContent = `showing ${n} work${n === 1 ? '' : 's'}`;
  }

  buttons.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.f;
    history.replaceState(null, '', f === 'about' ? location.pathname : `#${f}`);
    apply(f);
  }));

  window.addEventListener('hashchange', () => apply(location.hash.slice(1) || 'about'));
  apply(location.hash.slice(1) || 'about');
})();

/* every link that leaves the site opens in a new tab, including ones added later */
(() => {
  for (const a of document.querySelectorAll('a[href^="http"]')) {
    if (a.hostname === location.hostname) continue;
    a.target = '_blank';
    a.rel = (a.rel + ' noopener').trim();
  }
})();
