(function () {
  const body = document.body;
  const loader = document.getElementById('adminSiteLoader');
  if (!body || !loader) return;

  let hideTimer = null;
  let hasHiddenOnce = false;

  function showLoader() {
    loader.setAttribute('aria-hidden', 'false');
    body.classList.remove('admin-loaded');
    body.classList.add('admin-loading');
  }

  function hideLoader() {
    window.clearTimeout(hideTimer);
    hasHiddenOnce = true;
    body.classList.remove('admin-loading');
    body.classList.add('admin-loaded');
    hideTimer = window.setTimeout(() => {
      loader.setAttribute('aria-hidden', 'true');
    }, 360);
  }

  function hideSoon(delay) {
    window.setTimeout(() => {
      if (!hasHiddenOnce) hideLoader();
    }, delay);
  }

  function isNavigableLink(link) {
    if (!link) return false;
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (link.hasAttribute('download')) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.dataset.noLoader === 'true') return false;
    try {
      const url = new URL(link.href, window.location.href);
      return url.origin === window.location.origin;
    } catch (_error) {
      return false;
    }
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    hideSoon(140);
  } else {
    document.addEventListener('DOMContentLoaded', () => hideSoon(140), { once: true });
  }

  window.addEventListener('load', () => hideSoon(220), { once: true });
  window.addEventListener('pageshow', hideLoader);
  hideSoon(1200);

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!isNavigableLink(link)) return;
    showLoader();
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.noLoader === 'true') return;
    showLoader();
  });
})();
