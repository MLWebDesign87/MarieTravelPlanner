/**
 * ==========================================================================
 * Marie Dream Planner — Configuration des services tiers
 * --------------------------------------------------------------------------
 * Seul fichier à modifier pour brancher les services (aucun backend requis).
 * Toutes ces valeurs sont PUBLIQUES par nature : elles peuvent figurer
 * dans le code client sans risque. Ne jamais placer ici de clé API Brevo
 * ni de coordonnées bancaires (l’IBAN se saisit dans l’outil privé de Marie).
 * ==========================================================================
 */

window.siteConfig = Object.freeze({
  /**
   * Web3Forms (https://web3forms.com) : envoie le formulaire de devis
   * par e-mail à l'adresse associée à la clé d'accès.
   */
  web3formsAccessKey: "",
  web3formsEndpoint: "https://api.web3forms.com/submit",

  /**
   * Outil privé de Marie (devis et factures Word). Chaque e-mail de demande
   * contient un lien vers cette page, pré-rempli avec les données du client.
   */
  documentsToolPath: "/outils/documents.html",

  /**
   * Brevo (ex-Sendinblue) : URL d'action du formulaire d'inscription
   * (Brevo › Contacts › Formulaires › Partager › code HTML, attribut action).
   * Exemple : https://xxxx.sibforms.com/serve/MUIFA…
   */
  brevoFormUrl: "",
});
