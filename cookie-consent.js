/* Claritate Fiscală — banner de consimțământ cookie-uri + încărcare condiționată Google Analytics (GA4)
 *
 * Cum activezi Google Analytics când ești pregătită:
 * 1. Creează o proprietate GA4 pe analytics.google.com și copiază ID-ul de măsurare (format G-XXXXXXXXXX).
 * 2. Completează-l mai jos, la GA4_MEASUREMENT_ID.
 * 3. Încarcă din nou fișierul pe toate paginile (vezi lista de upload).
 *
 * Cât GA4_MEASUREMENT_ID este gol, scriptul nu face nimic — nu apare niciun banner,
 * pentru că nu există încă cookie-uri de analiză care să necesite acordul vizitatorului.
 * În momentul în care completezi ID-ul, banner-ul apare automat pe toate paginile,
 * iar Analytics se încarcă DOAR dacă vizitatorul apasă "Accept".
 */
(function () {
  var GA4_MEASUREMENT_ID = 'G-62R32ECZ7G'; // ex: 'G-ABC123XYZ' — lasă gol pentru a păstra Analytics dezactivat

  if (!GA4_MEASUREMENT_ID) return;

  var CONSENT_KEY = 'cf_cookie_consent';

  function loadGA4() {
    if (window.__cfGA4Loaded) return;
    window.__cfGA4Loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function showBanner() {
    if (document.getElementById('cf-cookie-banner')) return;
    var el = document.createElement('div');
    el.id = 'cf-cookie-banner';
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#1a2744;' +
      'color:#fff;padding:1rem 5%;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;' +
      'gap:1rem;font-family:Inter,sans-serif;font-size:0.88rem;box-shadow:0 -4px 20px rgba(0,0,0,0.15);';
    el.innerHTML =
      '<span style="flex:1;min-width:240px;line-height:1.5;">Folosim cookie-uri tehnice necesare site-ului ' +
      'și, doar cu acordul tău, Google Analytics pentru a înțelege cum este folosit site-ul. Detalii în ' +
      '<a href="politica-cookies.html" style="color:#e8d5a3;text-decoration:underline;">Politica de Cookies</a>.</span>' +
      '<span style="display:flex;gap:0.6rem;flex-shrink:0;">' +
      '<button id="cf-cookie-refuse" style="background:transparent;border:1px solid rgba(255,255,255,0.4);' +
      'color:#fff;padding:0.55rem 1.1rem;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;">Refuz</button>' +
      '<button id="cf-cookie-accept" style="background:#c9a84c;border:none;color:#1a2744;padding:0.55rem 1.1rem;' +
      'border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;">Accept</button>' +
      '</span>';
    document.body.appendChild(el);

    document.getElementById('cf-cookie-accept').onclick = function () {
      setConsent('accepted');
      el.remove();
      loadGA4();
    };
    document.getElementById('cf-cookie-refuse').onclick = function () {
      setConsent('refused');
      el.remove();
    };
  }

  function init() {
    var consent = getConsent();
    if (consent === 'accepted') {
      loadGA4();
    } else if (consent !== 'refused') {
      showBanner();
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // Permite revenirea asupra alegerii — poți lega un link "Setări cookie-uri" la window.cfReopenCookieBanner()
  window.cfReopenCookieBanner = function () {
    try { localStorage.removeItem(CONSENT_KEY); } catch (e) {}
    showBanner();
  };
})();
