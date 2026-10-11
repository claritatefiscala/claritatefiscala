/* Claritate Fiscală — coș de cumpărături (partea comună tuturor paginilor)
 * - Coșul se ține în browserul clientului (localStorage). Nu se trimite nimic către server până la plată.
 * - Numele și prețurile vin din produse.json (sursa unică).
 * - Butoane pe paginile de produs:
 *     <a href="#" data-adauga-cos="produs-ghid-pfa">Adaugă în coș</a>
 *     <a href="#" data-cumpara-acum="produs-ghid-pfa">Cumpără acum</a>
 */
(function () {
  'use strict';
  var KEY = 'cf_cos_v1';
  var mem = [];            // rezervă dacă browserul blochează localStorage
  var _produse = null;

  function citeste() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return mem.slice(); }
  }
  function salveaza(ids) {
    mem = ids.slice();
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) { /* ignorat */ }
    actualizeazaBadge();
  }

  function produse() {
    if (!_produse) {
      _produse = fetch('produse.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('produse.json'); return r.json(); })
        .then(function (d) {
          var map = {};
          d.produse.forEach(function (p) { map[p.id] = p; });
          return { moneda: d.moneda || 'RON', map: map, lista: d.produse };
        });
    }
    return _produse;
  }

  function ids() { return citeste(); }
  function adauga(id) {
    var c = citeste();
    if (c.indexOf(id) === -1) c.push(id);   // produse digitale: o singură bucată
    salveaza(c);
  }
  function sterge(id) { salveaza(citeste().filter(function (x) { return x !== id; })); }
  function goleste() { salveaza([]); }

  function lei(n) {
    return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n) + ' lei';
  }

  // Creează elemente fără innerHTML (text sigur)
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  // Din coș păstrăm doar produsele care încă există în produse.json
  function liniiCos(p) {
    var valide = ids().filter(function (id) { return p.map[id]; });
    if (valide.length !== ids().length) salveaza(valide);
    return valide.map(function (id) { return p.map[id]; });
  }
  function total(linii) { return linii.reduce(function (s, x) { return s + x.pret; }, 0); }

  // Produsele pe care le conține fiecare element din coș (pachet => componentele lui)
  function suprapuneri(linii, p) {
    var detinut = {};   // idProdus -> [nume elemente din coș care îl conțin]
    linii.forEach(function (l) {
      var parti = l.tip === 'pachet' ? (l.componente || []) : [l.id];
      parti.forEach(function (pid) { (detinut[pid] = detinut[pid] || []).push(l.nume); });
    });
    var rez = [];
    Object.keys(detinut).forEach(function (pid) {
      if (detinut[pid].length > 1 && p.map[pid]) rez.push({ produs: p.map[pid].nume, surse: detinut[pid] });
    });
    return rez;
  }

  function actualizeazaBadge() {
    var n = ids().length;
    var noduri = document.querySelectorAll('[data-cos-count]');
    for (var i = 0; i < noduri.length; i++) {
      noduri[i].textContent = String(n);
      noduri[i].style.display = n ? '' : 'none';
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-adauga-cos],[data-cumpara-acum]') : null;
    if (!a) return;
    e.preventDefault();
    var direct = a.hasAttribute('data-cumpara-acum');
    var id = a.getAttribute(direct ? 'data-cumpara-acum' : 'data-adauga-cos');
    produse().then(function (p) {
      if (!p.map[id]) return;
      adauga(id);
      window.location.href = direct ? 'finalizare-comanda.html' : 'cos.html';
    });
  });

  document.addEventListener('DOMContentLoaded', actualizeazaBadge);

  window.CF = {
    cfg: window.CF_CONFIG || {},
    ids: ids, adauga: adauga, sterge: sterge, goleste: goleste,
    produse: produse, liniiCos: liniiCos, total: total, suprapuneri: suprapuneri,
    lei: lei, el: el, actualizeazaBadge: actualizeazaBadge
  };
})();
