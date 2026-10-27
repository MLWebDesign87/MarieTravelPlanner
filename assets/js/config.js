/**
 * ==========================================================================
 * Marie Dream Planner — Configuration des services tiers
 * --------------------------------------------------------------------------
 * Seul fichier à modifier pour brancher les services (aucun backend requis).
 * ATTENTION : tout ce fichier est public (lisible par n'importe quel visiteur).
 * N'y placez jamais de clé API secrète.
 * ==========================================================================
 */

window.siteConfig = Object.freeze({
  /**
   * Envoi du formulaire de devis par e-mail, AVEC le devis Word en pièce jointe.
   *
   * "formsubmit" (par défaut, gratuit, pièces jointes incluses) :
   *   endpoint = https://formsubmit.co/ suivi de l'adresse de Marie, ou mieux,
   *   de l'alias aléatoire fourni par FormSubmit après la première activation
   *   (il masque l'adresse e-mail dans le code du site).
   *
   * "web3forms" (pièces jointes réservées à l'offre Pro, payante) :
   *   endpoint = https://api.web3forms.com/submit + web3formsAccessKey.
   */
  formProvider: "formsubmit",
  // Destination des demandes : l’ALIAS FormSubmit de la boîte Gmail de Marie (voir README,
  // section « Activation »). Ne jamais committer l’adresse e-mail elle-même : ce dépôt est public.
  formEndpoint: "https://formsubmit.co/VOTRE-ALIAS-FORMSUBMIT",
  web3formsAccessKey: "",

  /**
   * Informations de l'émettrice reprises sur chaque devis généré.
   * Elles sont publiques (déjà visibles dans les mentions légales),
   * SAUF l'IBAN : s'il est renseigné ici, il devient lisible dans le code
   * du site. Laissé vide, le devis affiche « à compléter » et Marie
   * l'ajoute dans Word avant d'envoyer le devis.
   */
  quoteIssuer: Object.freeze({
    legalName: "",            // ex. « Marie Dupont EI » (mention EI obligatoire)
    address: "",              // adresse postale
    siret: "106 296 882 00017",
    email: "contact@mariedreamplanner.fr",           // adresse publique (redirigée vers la boîte de Marie)
    phone: "",
    vatMention: "TVA non applicable, article 293 B du CGI.",
    mediator: "",             // nom, adresse et site du médiateur de la consommation
    balanceTerms: "",         // échéance du solde, ex. « à la remise du carnet de voyage »
    deliveryDelay: "14 jours à compter de l’échange de cadrage",
    validityDays: 30,
    bankHolder: "",
    iban: "",                 // voir l'avertissement ci-dessus
    bic: "",
  }),

  /**
   * Brevo (ex-Sendinblue) : URL d'action du formulaire d'inscription
   * (Brevo › Contacts › Formulaires › Partager › code HTML, attribut action).
   */
  brevoFormUrl: "",
});
