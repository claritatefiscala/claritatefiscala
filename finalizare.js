/* Pagina „Finalizare comandă": formular, validare și plată cu Stripe (Payment Element). */
(function () {
  'use strict';
  var CF = window.CF, cfg = CF.cfg;
  var JUDETE = ['Alba','Arad','Argeș','Bacău','Bihor','Bistrița-Năsăud','Botoșani','Brașov','Brăila','București','Buzău',
    'Caraș-Severin','Călărași','Cluj','Constanța','Covasna','Dâmbovița','Dolj','Galați','Giurgiu','Gorj','Harghita',
    'Hunedoara','Ialomița','Iași','Ilfov','Maramureș','Mehedinți','Mureș','Neamț','Olt','Prahova','Satu Mare','Sălaj',
    'Sibiu','Suceava','Teleorman','Timiș','Tulcea','Vaslui','Vâlcea','Vrancea'];

  // Eticheta butonului de plată: formularea cerută de OUG 34/2014, art. 8 alin. (2).
  var ETICHETA_BUTON = 'Comandă ce implică o obligație de plată';

  var $ = function (id) { return document.getElementById(id); };
  var form = $('comanda-form'), btn = $('btn-plata'), blocEroare = $('mesaj-eroare');
  var stripe = null, elements = null, linii = [], total = 0, ocupat = false;
  var cheieSesiune = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('k' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  // ── Județe ────────────────────────────────────────────────────────────────
  var sel = $('judet');
  JUDETE.forEach(function (j) { var o = document.createElement('option'); o.value = j; o.textContent = j; sel.appendChild(o); });

  // ── Persoană fizică / juridică ────────────────────────────────────────────
  function tip() { return form.elements.tip.value === 'pj' ? 'pj' : 'pf'; }
  function actualizeazaTip() {
    var pj = tip() === 'pj';
    $('bloc-pj').classList.toggle('ascuns', !pj);
    ['l-strada', 'l-judet', 'l-localitate', 'l-cp'].forEach(function (id) {
      var l = $(id), t = l.textContent.replace(/ \*$/, '');
      l.textContent = t + ' *';   // adresa e obligatorie pentru toți
    });
  }
  Array.prototype.forEach.call(form.elements.tip, function (r) { r.addEventListener('change', actualizeazaTip); });
  actualizeazaTip();

  // ── Validare ──────────────────────────────────────────────────────────────
  function eroareCamp(id, msg) {
    var input = $(id), e = $('e-' + id);
    if (input && input.setAttribute) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    if (e) e.textContent = msg || '';
  }
  function valideaza() {
    var primul = null;
    function ceVa(id, msg) { eroareCamp(id, msg); if (msg && !primul) primul = id; }
    var v = function (id) { return ($(id).value || '').trim(); };
    var pj = tip() === 'pj';

    ceVa('prenume', v('prenume') ? '' : 'Completează prenumele.');
    ceVa('nume', v('nume') ? '' : 'Completează numele.');
    ceVa('telefon', /^[0-9+()\-.\s]{6,30}$/.test(v('telefon')) ? '' : 'Introdu un număr de telefon valid.');
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'));
    ceVa('email', emailOk ? '' : 'Introdu o adresă de email validă.');
    ceVa('email2', (emailOk && v('email').toLowerCase() === v('email2').toLowerCase()) ? '' : 'Adresele de email nu coincid.');

    if (pj) {
      ceVa('cif', /^(RO)?\s?\d{2,10}$/i.test(v('cif')) ? '' : 'Introdu un CIF valid (ex: RO12345678).');
      ceVa('denumire', v('denumire') ? '' : 'Completează denumirea companiei.');
    } else {
      ['cif', 'denumire'].forEach(function (id) { eroareCamp(id, ''); });
    }
    // Adresa completă este obligatorie pentru toți clienții (necesară pentru factură).
    ceVa('strada', v('strada') ? '' : 'Completează adresa.');
    ceVa('judet', v('judet') ? '' : 'Alege județul.');
    ceVa('localitate', v('localitate') ? '' : 'Completează localitatea.');
    ceVa('cod_postal', /^\d{6}$/.test(v('cod_postal')) ? '' : 'Codul poștal are 6 cifre.');
    var acord = $('acord_termeni').checked;
    $('e-acord_termeni').textContent = acord ? '' : 'Bifează acceptarea termenilor pentru a continua.';
    if (!acord && !primul) primul = 'acord_termeni';
    var acordDig = $('acord_digital').checked;
    $('e-acord_digital').textContent = acordDig ? '' : 'Bifează această confirmare pentru a continua.';
    if (!acordDig && !primul) primul = 'acord_digital';

    if (primul) { var f = $(primul); if (f && f.focus) f.focus(); }
    return !primul;
  }

  function arataEroare(msg) {
    blocEroare.textContent = msg; blocEroare.classList.remove('ascuns');
    btn.disabled = false; btn.textContent = ETICHETA_BUTON; ocupat = false;
  }
  function indisponibil(msg) {
    arataEroare(msg); btn.textContent = 'Plată indisponibilă'; btn.disabled = true;
  }
  function ascundeEroare() { blocEroare.classList.add('ascuns'); blocEroare.textContent = ''; }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(36);
  }

  // ── Plata ─────────────────────────────────────────────────────────────────
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (ocupat || !stripe) return;
    ascundeEroare();
    if (!valideaza()) return;

    ocupat = true; btn.disabled = true; btn.textContent = 'Se procesează…';
    try {
      var sub = await elements.submit();
      if (sub.error) { arataEroare(sub.error.message || 'Verifică datele cardului.'); return; }

      var v = function (id) { return ($(id).value || '').trim(); };
      var payload = {
        produse: linii.map(function (l) { return l.id; }),
        total_afisat: total,
        client: { prenume: v('prenume'), nume: v('nume'), telefon: v('telefon'), email: v('email') },
        facturare: { tip: tip(), cif: v('cif'), denumire: v('denumire'), strada: v('strada'), strada2: v('strada2'),
                     judet: v('judet'), localitate: v('localitate'), cod_postal: v('cod_postal') },
        acord_termeni: $('acord_termeni').checked,
        acord_digital: $('acord_digital').checked,
        acord_marketing: $('acord_marketing').checked
      };
      payload.cheie_unica = cheieSesiune + '-' + hash(JSON.stringify(payload));

      var r = await fetch(cfg.API + '/creeaza-plata', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      var data = {};
      try { data = await r.json(); } catch (x) { /* ignorat */ }
      if (!r.ok || !data.clientSecret) { arataEroare(data.eroare || 'Plata nu a putut fi inițiată. Încearcă din nou.'); return; }

      var ret = new URL('comanda-confirmata.html', window.location.href);
      ret.searchParams.set('comanda', data.comanda);
      try {
        sessionStorage.setItem('cf_ultima_comanda', JSON.stringify({ comanda: data.comanda, email: payload.client.email, total: data.total, status: 'initiata' }));
      } catch (x) { /* ignorat */ }

      var rez = await stripe.confirmPayment({
        elements: elements, clientSecret: data.clientSecret,
        confirmParams: { return_url: ret.toString() }, redirect: 'if_required'
      });
      if (rez.error) { arataEroare(rez.error.message || 'Plata a fost refuzată. Încearcă alt card.'); return; }

      var st = rez.paymentIntent ? rez.paymentIntent.status : '';
      if (st === 'succeeded' || st === 'processing') {
        try {
          sessionStorage.setItem('cf_ultima_comanda', JSON.stringify({ comanda: data.comanda, email: payload.client.email, total: data.total, status: st }));
        } catch (x) { /* ignorat */ }
        CF.goleste();
        window.location.href = ret.toString();
      } else {
        arataEroare('Plata nu a fost finalizată. Încearcă din nou.');
      }
    } catch (err) {
      arataEroare('A apărut o problemă de conexiune. Verifică internetul și încearcă din nou.');
    }
  });

  // ── Inițializare ──────────────────────────────────────────────────────────
  function deseneazaSumar() {
    var zona = $('sumar-linii'); zona.textContent = '';
    linii.forEach(function (l) {
      zona.appendChild(CF.el('div', { class: 'rand' }, [CF.el('span', { text: l.nume }), CF.el('span', { text: CF.lei(l.pret) })]));
    });
    $('sumar-total').textContent = CF.lei(total);
    $('nota-livrare').textContent = 'După confirmarea plății, primești produsele pe email în maximum ' + (cfg.TERMEN_LIVRARE || '24 de ore') + '.';
  }

  function gol() {
    var z = $('zona-comanda'); z.textContent = ''; z.className = 'wrap una';
    z.appendChild(CF.el('div', { class: 'card goala' }, [
      CF.el('h2', { text: 'Coșul tău este gol' }),
      CF.el('p', { text: 'Alege un ghid sau un pachet ca să continui.' }),
      CF.el('a', { class: 'btn btn-aur', href: 'ghiduri.html', text: 'Vezi ghidurile' })
    ]));
  }

  async function porneste() {
    var p;
    try { p = await CF.produse(); } catch (e) { indisponibil('Nu am putut încărca produsele. Reîncarcă pagina.'); return; }

    // Link de tip „Cumpără acum": finalizare-comanda.html?adauga=ID
    var adauga = new URLSearchParams(window.location.search).get('adauga');
    if (adauga && p.map[adauga]) { CF.adauga(adauga); window.history.replaceState(null, '', 'finalizare-comanda.html'); }

    linii = CF.liniiCos(p); total = CF.total(linii);
    if (!linii.length) { gol(); return; }
    deseneazaSumar();

    if (typeof window.Stripe !== 'function') { indisponibil('Modulul de plată nu s-a încărcat. Dezactivează blocantele de reclame și reîncarcă pagina.'); return; }

    var pk = '';
    try {
      var rc = await fetch(cfg.API + '/config');
      pk = (await rc.json()).publishableKey || '';
    } catch (e) { /* tratat mai jos */ }
    if (!pk) { indisponibil('Plata nu este disponibilă momentan. Încearcă mai târziu sau scrie-ne la ' + (cfg.EMAIL_CONTACT || '') + '.'); return; }

    stripe = window.Stripe(pk);
    elements = stripe.elements({
      mode: 'payment', amount: total * 100, currency: 'ron', locale: 'ro',
      appearance: { theme: 'stripe', variables: { colorPrimary: '#1a2744', fontFamily: 'Inter, sans-serif', borderRadius: '9px' } }
    });
    elements.create('payment', { layout: 'tabs' }).mount('#payment-element');
    btn.disabled = false; btn.textContent = ETICHETA_BUTON;
  }

  porneste();
})();
