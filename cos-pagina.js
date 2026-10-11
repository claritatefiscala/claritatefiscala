/* Pagina „Coșul tău" */
(function () {
  'use strict';
  var CF = window.CF;
  var radacina = document.getElementById('cos-continut');

  function deseneaza(p) {
    var linii = CF.liniiCos(p);
    radacina.textContent = '';

    if (linii.length === 0) {
      radacina.appendChild(CF.el('div', { class: 'wrap una' }, [CF.el('div', { class: 'card goala' }, [
        CF.el('h2', { text: 'Coșul tău este gol' }),
        CF.el('p', { text: 'Alege un ghid sau un pachet ca să continui.' }),
        CF.el('a', { class: 'btn btn-aur', href: 'ghiduri.html', text: 'Vezi ghidurile' })
      ])]));
      return;
    }

    var stanga = CF.el('div');
    var card = CF.el('div', { class: 'card' }, [CF.el('h2', { text: 'Produsele tale' })]);

    linii.forEach(function (l) {
      var nume = CF.el('div', { class: 'linie-nume' }, [
        CF.el('a', { href: l.pagina, text: l.nume })
      ]);
      nume.appendChild(CF.el('span', { class: 'linie-tip', text: l.tip === 'pachet' ? 'Pachet' : 'Produs' }));

      var stg = CF.el('div', null, [nume]);
      if (l.include && l.include.length) {
        var det = CF.el('details', null, [CF.el('summary', { text: 'Ce primești' })]);
        var ul = CF.el('ul');
        l.include.forEach(function (x) { ul.appendChild(CF.el('li', { text: x })); });
        det.appendChild(ul);
        stg.appendChild(det);
      }
      var sterge = CF.el('button', { class: 'btn-sterge', type: 'button', 'aria-label': 'Șterge din coș: ' + l.nume, text: 'Șterge din coș' });
      sterge.addEventListener('click', function () { CF.sterge(l.id); deseneaza(p); });
      stg.appendChild(sterge);

      card.appendChild(CF.el('div', { class: 'linie' }, [stg, CF.el('div', { class: 'linie-pret', text: CF.lei(l.pret) })]));
    });
    stanga.appendChild(card);

    var sup = CF.suprapuneri(linii, p);
    if (sup.length) {
      var txt = 'Atenție: unele produse din coș se suprapun. ' + sup.map(function (s) {
        return '„' + s.produs + '” apare în: ' + s.surse.join(' și ');
      }).join('; ') + '. Poți șterge ce nu ai nevoie înainte de plată.';
      stanga.appendChild(CF.el('div', { class: 'mesaj info', role: 'status', text: txt }));
    }

    var sumar = CF.el('aside', { class: 'card sumar', 'aria-label': 'Sumar comandă' }, [
      CF.el('h2', { text: 'Sumar comandă' }),
      CF.el('div', { class: 'rand' }, [CF.el('span', { text: 'Produse (' + linii.length + ')' }), CF.el('span', { text: CF.lei(CF.total(linii)) })]),
      CF.el('div', { class: 'rand total' }, [CF.el('span', { text: 'Total de plată' }), CF.el('span', { text: CF.lei(CF.total(linii)) })]),
      CF.el('p', { class: 'nota-tva', text: 'Prețuri finale. Vânzătorul nu este plătitor de TVA.' }),
      CF.el('a', { class: 'btn btn-aur', href: 'finalizare-comanda.html', style: 'margin-top:1rem', text: 'Continuă către plată' }),
      CF.el('a', { class: 'btn btn-contur', href: 'ghiduri.html', text: '← Continuă cumpărăturile' })
    ]);

    radacina.appendChild(CF.el('div', { class: 'wrap' }, [stanga, sumar]));
  }

  CF.produse().then(deseneaza).catch(function () {
    radacina.textContent = '';
    radacina.appendChild(CF.el('div', { class: 'wrap una' }, [CF.el('div', { class: 'card goala' }, [
      CF.el('h2', { text: 'Nu am putut încărca produsele' }),
      CF.el('p', { text: 'Reîncarcă pagina sau scrie-ne la ' + (CF.cfg.EMAIL_CONTACT || '') + '.' })
    ])]));
  });
})();
