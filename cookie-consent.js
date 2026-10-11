/* Claritate Fiscală — banner de consimțământ cookie-uri + Google Analytics GA4 (Consent Mode v2)
 *
 * Comportament:
 *   — Google Analytics NU se încarcă și NU trimite nimic către Google până când vizitatorul apasă „Accept".
 *   — Dacă apasă „Refuz" (sau nu alege), scriptul Google nu este încărcat deloc.
 *   — Publicitatea rămâne permanent blocată (nu folosim Google Ads).
 *   — Link permanent „Setări cookie-uri" în subsol, pentru schimbarea sau retragerea acordului.
 */
(function () {
  var GA4_MEASUREMENT_ID = 'G-62R32ECZ7G'; // lasă gol pentru a păstra Analytics dezactivat
  if (!GA4_MEASUREMENT_ID) return;

  var CONSENT_KEY = 'cf_cookie_consent';
  var gaLoaded = false;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }

  // Pornește Google Analytics — apelată NUMAI după acord (și la re-acordare, după un refuz anterior).
  function loadAnalytics() {
    window['ga-disable-' + GA4_MEASUREMENT_ID] = false;
    if (gaLoaded) {
      // script deja încărcat în această pagină (Accept -> Refuz -> Accept): reactivează colectarea
      gtag('consent', 'update', { analytics_storage: 'granted' });
      gtag('event', 'page_view');
      return;
    }
    gaLoaded = true;
    gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA4_MEASUREMENT_ID, { anonymize_ip: true });
  }

  // La retragerea acordului: oprește colectarea și șterge cookie-urile _ga.
  function stopAnalytics() {
    window['ga-disable-' + GA4_MEASUREMENT_ID] = true;
    if (gaLoaded) gtag('consent', 'update', { analytics_storage: 'denied' });
    try {
      var host = location.hostname.replace(/^www\./, '');
      document.cookie.split(';').forEach(function (c) {
        var n = c.split('=')[0].trim();
        if (n.indexOf('_ga') === 0) {
          ['', '; domain=' + host, '; domain=.' + host].forEach(function (d) {
            document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
          });
        }
      });
    } catch (e) {}
  }

  function showBanner() {
    if (document.getElementById('cf-cookie-banner')) return;
    var el = document.createElement('div');
    el.id = 'cf-cookie-banner';
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#1a2744;' +
      'color:#fff;padding:1rem 5%;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;' +
      'gap:1rem;font-family:Inter,sans-serif;font-size:0.88rem;box-shadow:0 -4px 20px rgba(0,0,0,0.15);';
    el.innerHTML =
      '<span style="flex:1;min-width:240px;line-height:1.5;">Folosim stocare tehnică necesară site-ului ' +
      'și, doar cu acordul tău, Google Analytics pentru a înțelege cum este folosit site-ul. Poți schimba alegerea oricând din „Setări cookie-uri". Detalii în ' +
      '<a href="politica-cookies.html" style="color:#e8d5a3;text-decoration:underline;">Politica de Cookies</a>.</span>' +
      '<span style="display:flex;gap:0.6rem;flex-shrink:0;">' +
      '<button id="cf-cookie-refuse" style="background:transparent;border:1px solid rgba(255,255,255,0.4);' +
      'color:#fff;padding:0.55rem 1.1rem;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;">Refuz</button>' +
      '<button id="cf-cookie-accept" style="background:#c9a84c;border:none;color:#1a2744;padding:0.55rem 1.1rem;' +
      'border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;">Accept</button>' +
      '</span>';
    document.body.appendChild(el);
    document.getElementById('cf-cookie-accept').onclick = function () {
      setConsent('accepted'); loadAnalytics(); el.remove();
    };
    document.getElementById('cf-cookie-refuse').onclick = function () {
      setConsent('refused'); stopAnalytics(); el.remove();
    };
  }

  // Link permanent „Setări cookie-uri": în subsol, iar dacă pagina nu are subsol, un buton discret.
  function addSettingsLink() {
    if (document.getElementById('cf-cookie-settings')) return;
    var a = document.createElement('a');
    a.id = 'cf-cookie-settings'; a.href = '#'; a.textContent = 'Setări cookie-uri';
    a.onclick = function (e) { e.preventDefault(); window.cfReopenCookieBanner(); };
    var footer = document.querySelector('footer');
    if (footer) {
      footer.appendChild(document.createTextNode(' · '));
      footer.appendChild(a);
    } else {
      a.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9000;background:#1a2744;color:#fff;' +
        'font:12px Inter,sans-serif;padding:6px 10px;border-radius:6px;text-decoration:none;opacity:.85;';
      document.body.appendChild(a);
    }
  }

  function init() {
    addSettingsLink();
    var consent = getConsent();
    if (consent === 'accepted') loadAnalytics();
    else if (consent !== 'refused') showBanner();
  }

  // Reafișează bannerul; alegerea anterioară rămâne până la o nouă decizie.
  window.cfReopenCookieBanner = function () { showBanner(); };

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
