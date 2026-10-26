/**
 * ==========================================================================
 * Marie Dream Planner — Génération du devis Word joint à l'e-mail
 * --------------------------------------------------------------------------
 * Chargé à la demande par main.js au moment de l'envoi du formulaire
 * (avec PizZip et docxtemplater), pour ne pas alourdir la page d'accueil.
 *
 * Expose window.quoteGenerator.createQuoteFile(request) → Promise<File>.
 * Le modèle Word est /assets/documents/devis.docx (balises {…}).
 *
 * Montants calculés en centimes (entiers) : aucune erreur d'arrondi.
 * Tarifs à garder alignés avec la page d'accueil et les CGV.
 * ==========================================================================
 */

(function () {
  "use strict";

  const templateUrl = "/assets/documents/devis.docx";
  const toComplete = "à compléter";

  /** Tarifs publics, en centimes. */
  const formulaPrices = Object.freeze({
    "Week-end": { price: 7900, description: "Formule Week-end (2 à 4 jours, 1 étape, 4 voyageurs inclus)" },
    "Escapade": { price: 16900, description: "Formule Escapade (5 à 15 jours, jusqu’à 4 étapes, 4 voyageurs inclus)" },
    "Évasion": { price: 29900, description: "Formule Évasion (15 à 30 jours, jusqu’à 10 étapes, 4 voyageurs inclus)" },
  });
  const includedTravelers = 4;
  const extraTravelerPrice = 1000;
  const depositRate = 0.5; // acompte de 50 % à la signature

  const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  /** @param {number} cents */
  const formatEuro = (cents) => euroFormatter.format(cents / 100);

  const pad = (value) => String(value).padStart(2, "0");
  /** @param {Date} date → jj/mm/aaaa */
  const formatDate = (date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

  /** Initiales sans accents, pour le numéro de devis (ex. « JM »). */
  const initials = (firstName, lastName) => `${firstName.charAt(0)}${lastName.charAt(0)}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");

  /**
   * Numéro unique sans compteur serveur : D-AAAAMMJJ-HHMM-INITIALES.
   * (Seules les factures exigent une numérotation continue ; Marie peut
   * renuméroter le devis dans Word si elle le souhaite.)
   */
  const quoteNumber = (date, firstName, lastName) =>
    `D-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}-${initials(firstName, lastName) || "X"}`;

  /** Nom de fichier sûr : sans accents ni caractères spéciaux. */
  const safeFileName = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-|-$/g, "");

  /**
   * Lignes et montants du devis.
   * Formules « sur devis » (EVJF / EVG, autre projet) : prix laissé à compléter.
   */
  const pricing = (formula, travelers) => {
    const offer = formulaPrices[formula];
    if (!offer) {
      return {
        lines: [{ label: `Prestation ${formula} — organisation sur mesure (${travelers} participants)`,
          quantity: "1", unitPrice: toComplete, lineTotal: toComplete }],
        totalAmount: toComplete, depositAmount: `50 % du total (${toComplete})`, balanceAmount: `50 % du total (${toComplete})`,
      };
    }

    const lines = [{ label: offer.description, quantity: 1, unitCents: offer.price }];
    const extraTravelers = Math.max(0, travelers - includedTravelers);
    if (extraTravelers > 0) lines.push({ label: "Voyageur supplémentaire", quantity: extraTravelers, unitCents: extraTravelerPrice });

    const totalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0);
    const depositCents = Math.round(totalCents * depositRate);
    return {
      lines: lines.map((line) => ({
        label: line.label, quantity: String(line.quantity),
        unitPrice: formatEuro(line.unitCents), lineTotal: formatEuro(line.quantity * line.unitCents),
      })),
      totalAmount: formatEuro(totalCents), depositAmount: formatEuro(depositCents), balanceAmount: formatEuro(totalCents - depositCents),
    };
  };

  /**
   * Crée le devis Word à partir de la demande du formulaire.
   * @param {{firstName:string,lastName:string,email:string,phone:string,formula:string,
   *          travelers:string,destination:string,period:string}} request
   * @returns {Promise<File>}
   */
  const createQuoteFile = async (request) => {
    if (!window.PizZip || !window.docxtemplater) throw new Error("Bibliothèques Word non chargées");

    const issuer = (window.siteConfig && window.siteConfig.quoteIssuer) || {};
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + (Number(issuer.validityDays) || 30));
    const travelers = Math.max(1, Number(request.travelers) || 1);
    const number = quoteNumber(now, request.firstName, request.lastName);
    const orValue = (value) => (value && String(value).trim()) || toComplete;

    const data = {
      // Émettrice
      companyLegalName: orValue(issuer.legalName), companyAddress: orValue(issuer.address), companySiret: orValue(issuer.siret),
      companyEmail: orValue(issuer.email), companyPhone: issuer.phone || "", vatMention: issuer.vatMention || "",
      // Franchise en base de TVA (art. 293 B) : « net à payer » ; sinon le total s'entend TTC
      totalLabel: /293 B/.test(issuer.vatMention || "") ? "Total net à payer" : "Total TTC",
      mediator: orValue(issuer.mediator), balanceTerms: orValue(issuer.balanceTerms), deliveryDelay: orValue(issuer.deliveryDelay),
      bankHolder: orValue(issuer.bankHolder), iban: orValue(issuer.iban), bic: orValue(issuer.bic),
      // Devis et client
      quoteNumber: number, quoteDate: formatDate(now), quoteValidUntil: formatDate(validUntil),
      clientName: `${request.firstName} ${request.lastName}`.trim(), clientAddress: toComplete,
      clientEmail: request.email || "", clientPhone: request.phone || "",
      formula: request.formula, travelers: String(travelers),
      destination: orValue(request.destination), travelPeriod: orValue(request.period),
      ...pricing(request.formula, travelers),
    };

    const response = await fetch(templateUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Modèle de devis introuvable (${response.status})`);

    const filledDocument = new window.docxtemplater(new window.PizZip(await response.arrayBuffer()), {
      paragraphLoop: true, linebreaks: true, nullGetter: () => "",
    });
    filledDocument.render(data);

    const blob = filledDocument.getZip().generate({
      type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE", // ≈ 3 fois plus léger que le zip non compressé par défaut
    });
    return new File([blob], `Devis-${number}-${safeFileName(request.lastName) || "client"}.docx`, { type: blob.type });
  };

  window.quoteGenerator = Object.freeze({ createQuoteFile });
})();
