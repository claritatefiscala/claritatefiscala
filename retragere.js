/* Formularul se activează numai împreună cu ruta server /retragere. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var payload = null, busy = false, proof = '';
  var contact = 'claritate.fiscala@gmail.com';
  var orderFromLink = new URLSearchParams(window.location.search).get('comanda');
  if (orderFromLink && orderFromLink.length <= 100) $('comanda').value = orderFromLink;
  function error(message) {
    $('eroare').textContent = message;
    $('eroare').hidden = false;
  }
  function clearError() { $('eroare').hidden = true; $('eroare').textContent = ''; }
  function declaration(data) {
    return 'Către Savu E. Alina Georgiana P.F.A. / Claritate Fiscală\n\n' +
      'Subsemnatul/Subsemnata ' + data.nume + ', vă notific prin prezenta retragerea mea din contractul ' +
      (data.comanda ? 'aferent comenzii ' + data.comanda : 'identificat prin detaliile de mai jos') + '.\n' +
      (data.detalii ? '\nDetalii pentru identificarea contractului: ' + data.detalii + '\n' : '') +
      '\nAdresa de email pentru confirmarea de primire: ' + data.email;
  }
  $('retragere-form').addEventListener('submit', function (event) {
    event.preventDefault();
    clearError();
    if (!$('retragere-form').reportValidity()) return;
    var name = $('nume').value.trim(), email = $('email').value.trim();
    var order = $('comanda').value.trim(), details = $('detalii').value.trim();
    if (!name) { error('Completează numele și prenumele.'); $('nume').focus(); return; }
    if (!order && details.length < 10) {
      error('Completează numărul comenzii sau câteva detalii care permit identificarea achiziției.');
      $('detalii').focus(); return;
    }
    if (!(window.crypto && window.crypto.randomUUID)) {
      error('Browserul nu permite transmiterea formularului. Folosește un browser actualizat sau scrie la ' + contact + '.'); return;
    }
    payload = { nume:name, email:email, comanda:order, detalii:details,
      website:$('website').value, cheie_unica:window.crypto.randomUUID() };
    payload.declaratie = declaration(payload);
    $('declaratie').textContent = payload.declaratie;
    $('date').hidden = true; $('verificare').hidden = false;
    $('verificare-titlu').focus();
  });
  $('modifica').addEventListener('click', function () {
    if (busy) return;
    clearError(); payload = null;
    $('verificare').hidden = true; $('date').hidden = false; $('nume').focus();
  });
  $('confirma').addEventListener('click', async function () {
    if (busy || !payload) return;
    clearError(); busy = true;
    $('confirma').disabled = true; $('modifica').disabled = true;
    $('confirma').textContent = 'Se transmite…';
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 25000);
    try {
      var api = window.CF_CONFIG && window.CF_CONFIG.API;
      if (!api) throw new Error('missing-api');
      var response = await fetch(api + '/retragere', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify(payload), signal:controller.signal
      });
      var receipt = await response.json();
      if (!response.ok || receipt.accepted !== true || !receipt.receiptId ||
          !receipt.receivedAt || !Number.isFinite(Date.parse(receipt.receivedAt))) {
        error('Nu am putut confirma primirea declarației. Încearcă din nou sau transmite-o la ' + contact + '.'); return;
      }
      // Niciun răspuns nestructurat sau simplu HTTP 200 nu este prezentat ca succes.
      var timestamp = new Date(receipt.receivedAt).toLocaleString('ro-RO', { timeZone:'Europe/Bucharest' });
      proof = 'Confirmare de primire — Claritate Fiscală\nNumăr: ' + receipt.receiptId +
        '\nData și ora înregistrării: ' + timestamp + ' (Europe/Bucharest)' +
        '\nData și ora UTC: ' + receipt.receivedAt + '\n\n' + payload.declaratie;
      $('dovada').textContent = proof;
      $('confirmare-email').textContent = receipt.emailSent === true
        ? 'Confirmarea de primire a fost trimisă la ' + payload.email + '. Verifică și folderul Spam.'
        : 'Declarația a fost înregistrată, dar confirmarea pe email nu a putut fi trimisă încă. Descarcă dovada de mai jos și contactează-ne la ' + contact + '.';
      $('verificare').hidden = true; $('rezultat').hidden = false; $('rezultat-titlu').focus();
    } catch (e) {
      error('Nu am putut confirma primirea declarației. Încearcă din nou sau transmite-o la ' + contact + '.');
    } finally {
      clearTimeout(timeout); busy = false;
      $('confirma').disabled = false; $('modifica').disabled = false;
      $('confirma').textContent = 'Confirmă retragerea';
    }
  });
  $('descarca').addEventListener('click', function () {
    if (!proof) return;
    var url = URL.createObjectURL(new Blob(['\ufeff' + proof], { type:'text/plain;charset=utf-8' }));
    var link = document.createElement('a'); link.href = url; link.download = 'confirmare-retragere-claritate-fiscala.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
})();
