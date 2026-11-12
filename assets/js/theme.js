/* =========================================================
   AYL — light / dark.
   Loaded in <head>, not deferred, so a saved choice is on the page
   before it paints. With no choice saved the page follows the system.
   The choice lives in this browser only (localStorage, guarded).
   ========================================================= */
(() => {
  const root = document.documentElement;
  const KEY = 'ayl-theme';
  const sys = window.matchMedia('(prefers-color-scheme: dark)');
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : sys.matches;

  document.addEventListener('DOMContentLoaded', () => {
    const b = document.querySelector('.theme');
    if (!b) return;
    const label = () => {
      const to = isDark() ? 'light' : 'dark';
      b.textContent = to;
      b.setAttribute('aria-label', `switch to ${to} mode`);
    };
    label();
    sys.addEventListener?.('change', label);
    b.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) {}
      label();
      document.dispatchEvent(new Event('themechange'));   /* the press re-reads its inks */
    });
  });
})();
