/* Claritate Fiscală — setări coș și plată
 * Aici completezi/modifici doar valorile de mai jos. Nu pui NICIODATĂ chei secrete în acest fișier
 * (fișierul este public). Cheile Stripe se pun în Cloudflare, nu aici.
 */
window.CF_CONFIG = {
  // Adresa Worker-ului Cloudflare care creează plata. Se completează după instalarea Worker-ului.
  API: 'https://plata.claritatefiscala.ro',

  // Termenul de livrare afișat clientului (decizia ta: poate fi schimbat oricând).
  TERMEN_LIVRARE: '24 de ore lucrătoare',

  EMAIL_CONTACT: 'claritate.fiscala@gmail.com'
};
