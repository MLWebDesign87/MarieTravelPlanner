/**
 * ==========================================================================
 * Marie Dream Planner — Third-party services configuration
 * --------------------------------------------------------------------------
 * The only file to edit to connect the services (no backend required).
 * WARNING: this whole file is public (readable by any visitor, and on GitHub).
 * Never put a secret API key, an email address or an IBAN you want to keep
 * private in it.
 * ==========================================================================
 */

window.siteConfig = Object.freeze({
  /**
   * Quote form delivery by email, WITH the Word quote attached.
   *
   * "formsubmit" (default, free, attachments included):
   *   formEndpoint = https://formsubmit.co/ followed by the random ALIAS that
   *   FormSubmit provides once the form is activated (see DEPLOIEMENT.md).
   *   Never commit the email address itself.
   *
   * "web3forms" (attachments require the paid Pro plan):
   *   formEndpoint = https://api.web3forms.com/submit + web3formsAccessKey.
   *
   * Keep formEndpoint identical to the `action` of #quoteForm in index.html
   * (used when JavaScript is unavailable).
   */
  formProvider: "formsubmit",
  formEndpoint: "https://formsubmit.co/VOTRE-ALIAS-FORMSUBMIT",
  web3formsAccessKey: "",

  /**
   * Issuer details printed on every generated quote. They are public anyway
   * (legal notice), EXCEPT the IBAN: leave it empty and the quote shows
   * « à compléter », so Marie adds it in Word before sending the quote.
   * Values are visitor-facing, hence in French.
   */
  quoteIssuer: Object.freeze({
    legalName: "Marie BINZ EI", // the "EI" mention is mandatory
    address: "76 avenue Franklin Roosevelt, 06110 Le Cannet",
    siret: "106 296 882 00017",
    email: "contact@mariedreamplanner.fr", // public address, forwarded to Marie's inbox
    phone: "06 52 96 23 00",
    vatMention: "TVA non applicable, article 293 B du CGI.",
    balanceTerms: "à la finalisation du projet, avant l’envoi du carnet de voyage",
    deliveryDelay: "14 jours à compter de l’échange de cadrage",
    validityDays: 30,
    bankHolder: "Marie BINZ",
    iban: "", // see the warning above
    bic: "BNPAFRPPXXX",
  }),

  /**
   * Brevo (formerly Sendinblue): action URL of the signup form
   * (Brevo › Contacts › Forms › Share › HTML code, `action` attribute).
   */
  brevoFormUrl: "",
});
