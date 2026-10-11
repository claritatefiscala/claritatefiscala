/* Pagina „Confirmare comandă".
 * Arată „plata confirmată" doar dacă:
 *   a) Stripe confirmă starea plății (la întoarcerea dintr-o redirecționare), sau
 *   b) plata s-a finalizat chiar în această sesiune de browser (fără redirecționare).
 */
(function () {
  'use strict';
  var CF = window.CF, cfg = CF.cfg;
  var zona = document.getElementById('confirmare');
  var params = new URLSearchParams(window.location.search);

  function sesiune() {
    try { return JSON.parse(sessionStorage.getItem('cf_ultima_comanda') || 'null'); } catch (e) { return null; }
  }

  function succes(info, procesare) {
    zona.textContent = '';
    zona.appendChild(CF.el('h2', { text: procesare ? 'Plata se procesează' : 'Mulțumim pentru comandă!' }));
    zona.appendChild(CF.el('p', { text: procesare
      ? 'Banca încă procesează plata. Primești produsele după confirmarea ei.'
      : 'Plata a fost confirmată.' }));
    if (info && info.comanda) {
      var p = CF.el('p', { style: 'margin:.9rem 0' }, ['Număr comandă: ', CF.el('span', { class: 'nr-comanda', text: info.comanda })]);
      zona.appendChild(p);
    }
    var email = info && info.email ? info.email : '';
    zona.appendChild(CF.el('div', { class: 'mesaj ok', role: 'status', text:
      'Produsele ajung pe email' + (email ? ' la ' + email : '') + ', în maximum ' + (cfg.TERMEN_LIVRARE || '24 de ore lucrătoare') +
      ' de la confirmarea plății. Verifică și dosarul Spam/Promoții.' }));
    zona.appendChild(CF.el('p', { style: 'margin-top:1rem;font-size:.9rem', text:
      'Ai întrebări sau nu ai primit produsele în termen? Scrie-ne la ' + (cfg.EMAIL_CONTACT || '') + ' și menționează numărul comenzii.' }));
    zona.appendChild(CF.el('a', { class: 'btn btn-aur', href: '/', style: 'display:inline-block;width:auto;margin-top:1.2rem', text: 'Înapoi la site' }));
  }

  function esec(msg) {
    zona.textContent = '';
    zona.appendChild(CF.el('h2', { text: 'Plata nu a fost finalizată' }));
    zona.appendChild(CF.el('div', { class: 'mesaj eroare', role: 'alert', text: msg }));
    zona.appendChild(CF.el('a', { class: 'btn btn-aur', href: 'cos.html', style: 'display:inline-block;width:auto;margin-top:1rem', text: 'Înapoi la coș' }));
  }

  function necunoscut() {
    zona.textContent = '';
    zona.appendChild(CF.el('h2', { text: 'Nu găsim o comandă recentă' }));
    zona.appendChild(CF.el('p', { text: 'Dacă tocmai ai plătit, verifică emailul. Pentru orice nelămurire, scrie-ne la ' + (cfg.EMAIL_CONTACT || '') + '.' }));
    zona.appendChild(CF.el('a', { class: 'btn btn-aur', href: '/', style: 'display:inline-block;width:auto;margin-top:1rem', text: 'Înapoi la site' }));
  }

  async function verificaCuStripe(secret) {
    if (typeof window.Stripe !== 'function') { necunoscut(); return; }
    var pk = '';
    try { pk = (await (await fetch(cfg.API + '/config')).json()).publishableKey || ''; } catch (e) { /* ignorat */ }
    if (!pk) { necunoscut(); return; }
    var rez = await window.Stripe(pk).retrievePaymentIntent(secret);
    var s = rez.paymentIntent ? rez.paymentIntent.status : '';
    var info = sesiune() || { comanda: params.get('comanda') || '' };
    if (s === 'succeeded') { CF.goleste(); succes(info, false); }
    else if (s === 'processing') { CF.goleste(); succes(info, true); }
    else esec('Plata nu a fost aprobată. Nu s-a retras nicio sumă. Poți încerca din nou.');
  }

  var secret = params.get('payment_intent_client_secret');
  if (secret) { verificaCuStripe(secret).catch(necunoscut); return; }

  var info = sesiune();
  if (info && (info.status === 'succeeded' || info.status === 'processing')) succes(info, info.status === 'processing');
  else necunoscut();
})();
