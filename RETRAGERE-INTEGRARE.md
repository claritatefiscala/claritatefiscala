# Retragere online — pregătită, neactivată

Nu publica ramura înainte de implementarea și testarea rutei din Workerul actual.
Nu schimba Workerul de plăți cu o implementare nouă: păstrează toate rutele,
configurația Stripe, webhookurile și confirmările existente.

## Ruta necesară

`POST https://plata.claritatefiscala.ro/retragere`, cu CORS limitat la
`https://claritatefiscala.ro` și `https://www.claritatefiscala.ro` și răspuns la OPTIONS.

Cererea conține `nume`, `email`, `comanda`, `detalii`, `website` (honeypot),
`cheie_unica` (UUID pentru repetarea aceleiași cereri) și `declaratie`.
Validarea server este obligatorie: nume maximum 120 caractere, email maximum 254,
număr comandă maximum 100, detalii maximum 1500; comandă sau detalii identificabile.
Generează textul canonic pe server din câmpurile validate; nu te baza pe declarația
trimisă de browser. Verifică dimensiunea corpului, originea și protecția anti-abuz.
Nu afișa date ale unei comenzi pe baza unui număr public și nu condiționa depunerea
unei declarații de găsirea exactă a comenzii. Nu cere motivul retragerii.

Înregistrează mai întâi declarația în stocare durabilă, cu identificator și data/ora
UTC de pe server. Pentru aceeași cheie și același corp, returnează aceeași dovadă;
respinge reutilizarea cheii cu un alt conținut. Folosește garanții atomice ale
stocării existente. Nu utiliza o simplă variabilă globală sau localStorage.

Trimite prin furnizorul existent confirmarea către client: conținutul declarației,
numărul dovezii, data și ora, inclusiv fusul orar. Trimite și notificarea către
Alina, pentru verificarea solicitării înaintea livrării manuale. Păstrează dovada
trimiterii. Dacă trimiterea emailului eșuează, păstrează declarația și repetă
trimiterea dintr-un mecanism durabil; nu pierde data originală a primirii.

Răspuns JSON:

```json
{
  "accepted": true,
  "receiptId": "identificator-generat-pe-server",
  "receivedAt": "data-ISO-8601-generata-pe-server",
  "emailSent": true
}
```

`emailSent: true` se întoarce numai după acceptarea reală a emailului de către
furnizor. Primirea declarației nu înseamnă aprobare automată a rambursării.
Nu iniția automat rambursări Stripe. Corelarea cu comanda și eligibilitatea
trebuie verificate fără a pierde dovada primirii și fără a amâna termenele legale.

## Înainte de publicare

- Testează cerere validă, repetare, cheie reutilizată cu alt corp, date invalide,
  origine nepermisă, furnizor de email indisponibil și reîncercare.
- Verifică primirea mesajului la adresa de test și a notificării pentru Alina.
- Confirmă păstrarea funcționării plăților și a webhookului Stripe.
- Adaugă ruta în Worker, apoi publică formularul, linkurile și politica.
- Actualizează emailul existent de confirmare a contractului cu linkul către
  `https://claritatefiscala.ro/retragere.html`.
- Configurează ștergerea dovezilor după perioada declarată în politică.

Surse: OUG 34/2014 art. 6, 11^1, 13 și 16 lit. m; OPANPC 449/2022,
modificat prin OPANPC 270/2026. Model SAL din anexa nr. 2, publicată pe
https://legislatie.just.ro/ImaginiDinActe/309404_A95656513.jpg.
