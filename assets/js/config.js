/**
 * ==========================================================================
 * Marie Dream Planner — Configuration des services tiers
 * --------------------------------------------------------------------------
 * Seul fichier à modifier pour brancher les services (aucun backend requis).
 * Toutes ces valeurs sont PUBLIQUES par nature : elles peuvent figurer
 * dans le code client sans risque. Ne jamais placer ici de clé secrète
 * Stripe (sk_live_…) ni de clé API Brevo.
 * ==========================================================================
 */

window.siteConfig = Object.freeze({
  /**
   * Stripe Payment Links (Dashboard Stripe › Liens de paiement › Créer).
   * Une URL par formule, de la forme https://buy.stripe.com/xxxxxxxx
   * Tant qu'une URL est vide, le bouton « Réserver » renvoie vers le
   * formulaire de devis avec la formule présélectionnée.
   */
  stripePaymentLinks: Object.freeze({
    weekend: "",
    escapade: "",
    evasion: "",
  }),

  /**
   * Web3Forms (https://web3forms.com) : envoie le formulaire de devis
   * par e-mail à l'adresse associée à la clé d'accès.
   */
  web3formsAccessKey: "",
  web3formsEndpoint: "https://api.web3forms.com/submit",

  /**
   * Brevo (ex-Sendinblue) : URL d'action du formulaire d'inscription
   * (Brevo › Contacts › Formulaires › Partager › code HTML, attribut action).
   * Exemple : https://xxxx.sibforms.com/serve/MUIFA…
   */
  brevoFormUrl: "",
});
