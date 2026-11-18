/**
 * ==========================================================================
 * Marie Dream Planner — Word quote attached to the request email
 * --------------------------------------------------------------------------
 * Loaded on demand by main.js when the quote form is submitted (together with
 * PizZip and docxtemplater), so the home page stays light.
 *
 * Exposes window.quoteGenerator.createQuoteFile(request) → Promise<File>.
 * The Word template is /assets/documents/devis.docx ({…} placeholders).
 *
 * Amounts are computed in integer cents: no rounding errors.
 * Prices must stay in sync with the home page and the terms of sale (CGV).
 * Quote content is visitor-facing, hence in French.
 * ==========================================================================
 */

(function () {
  "use strict";

  const templateUrl = "/assets/documents/devis.docx";
  const placeholderText = "à compléter";
  const wordMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  /** Public prices, in cents. Keys match the values of the formula <select>. */
  const formulaOffers = Object.freeze({
    "Week-end": { priceCents: 7900, description: "Formule Week-end (2 à 4 jours, 1 étape, 4 voyageurs inclus)" },
    "Escapade": { priceCents: 16900, description: "Formule Escapade (5 à 15 jours, jusqu’à 4 étapes, 4 voyageurs inclus)" },
    "Évasion": { priceCents: 29900, description: "Formule Évasion (15 à 30 jours, jusqu’à 10 étapes, 4 voyageurs inclus)" },
  });
  const includedTravelers = 4;
  const extraTravelerPriceCents = 1000;
  const assistancePriceCents = 1500; // optional WhatsApp assistance, per day of travel
  const assistanceLabel = "Option assistance WhatsApp pendant le voyage (par jour)";
  const depositRate = 0.5; // 50 % deposit when the quote is signed

  const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

  /**
   * @param {number} cents
   * @returns {string} e.g. « 189,00 € »
   */
  const formatEuro = (cents) => euroFormatter.format(cents / 100);

  /**
   * Formats a computed quote line for the Word template.
   * @param {{label: string, quantity: number, unitCents: number}} line
   * @returns {{label: string, quantity: string, unitPrice: string, lineTotal: string}}
   */
  const formatLine = (line) => ({
    label: line.label,
    quantity: String(line.quantity),
    unitPrice: formatEuro(line.unitCents),
    lineTotal: formatEuro(line.quantity * line.unitCents),
  });

  /** @param {number} value */
  const padTwoDigits = (value) => String(value).padStart(2, "0");

  /**
   * @param {Date} date
   * @returns {string} dd/mm/yyyy
   */
  const formatDate = (date) => `${padTwoDigits(date.getDate())}/${padTwoDigits(date.getMonth() + 1)}/${date.getFullYear()}`;

  /** @param {string} text */
  const removeAccents = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  /**
   * Uppercase initials without accents, for the quote number (e.g. « JM »).
   * @param {string} firstName
   * @param {string} lastName
   * @returns {string}
   */
  const getInitials = (firstName, lastName) =>
    removeAccents(`${firstName.charAt(0)}${lastName.charAt(0)}`).toUpperCase().replace(/[^A-Z]/g, "");

  /**
   * Unique number without a server-side counter: D-YYYYMMDD-HHMM-INITIALS.
   * Only invoices require a continuous sequence; Marie may renumber the quote in Word.
   * @param {Date} date
   * @param {string} firstName
   * @param {string} lastName
   * @returns {string}
   */
  const buildQuoteNumber = (date, firstName, lastName) => {
    const day = `${date.getFullYear()}${padTwoDigits(date.getMonth() + 1)}${padTwoDigits(date.getDate())}`;
    const time = `${padTwoDigits(date.getHours())}${padTwoDigits(date.getMinutes())}`;
    return `D-${day}-${time}-${getInitials(firstName, lastName) || "X"}`;
  };

  /**
   * File-name-safe text: no accents, no special characters.
   * @param {string} text
   * @returns {string}
   */
  const toSafeFileName = (text) =>
    removeAccents(text).replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-|-$/g, "");

  /**
   * Returns the trimmed value, or the placeholder when it is empty.
   * @param {unknown} value
   * @returns {string}
   */
  const valueOrPlaceholder = (value) => (value && String(value).trim()) || placeholderText;

  /**
   * Quote lines and amounts. Custom formulas (EVJF / EVG, other projects)
   * are quoted case by case: their price is left for Marie to fill in, but
   * the assistance option keeps its fixed price.
   * @param {string} formula
   * @param {number} travelers
   * @param {number} assistanceDays 0 when the option is not chosen
   * @returns {{lines: object[], totalAmount: string, depositAmount: string, balanceAmount: string}}
   */
  const computePricing = (formula, travelers, assistanceDays) => {
    const offer = formulaOffers[formula];
    const assistanceLine = assistanceDays > 0
      ? { label: assistanceLabel, quantity: assistanceDays, unitCents: assistancePriceCents }
      : null;

    if (!offer) {
      const customLine = {
        label: `Prestation ${formula} — organisation sur mesure (${travelers} participants)`,
        quantity: "1",
        unitPrice: placeholderText,
        lineTotal: placeholderText,
      };
      const depositPercent = Math.round(depositRate * 100);
      return {
        lines: assistanceLine ? [customLine, formatLine(assistanceLine)] : [customLine],
        totalAmount: placeholderText,
        depositAmount: `${depositPercent} % du total (${placeholderText})`,
        balanceAmount: `${100 - depositPercent} % du total (${placeholderText})`,
      };
    }

    const lines = [{ label: offer.description, quantity: 1, unitCents: offer.priceCents }];
    const extraTravelers = Math.max(0, travelers - includedTravelers);
    if (extraTravelers > 0) {
      lines.push({ label: "Voyageur supplémentaire", quantity: extraTravelers, unitCents: extraTravelerPriceCents });
    }
    if (assistanceLine) lines.push(assistanceLine);

    const totalCents = lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0);
    const depositCents = Math.round(totalCents * depositRate);
    return {
      lines: lines.map(formatLine),
      totalAmount: formatEuro(totalCents),
      depositAmount: formatEuro(depositCents),
      balanceAmount: formatEuro(totalCents - depositCents),
    };
  };

  /**
   * Builds the Word quote from the form request.
   * @param {{firstName: string, lastName: string, email: string, phone: string, formula: string,
   *          travelers: string, destination: string, period: string, assistanceDays: string}} request
   * @returns {Promise<File>}
   */
  const createQuoteFile = async (request) => {
    // Library globals as exposed by their UMD builds
    const { PizZip, docxtemplater: Docxtemplater } = window;
    if (!PizZip || !Docxtemplater) throw new Error("Word libraries are not loaded");

    const issuer = window.siteConfig?.quoteIssuer || {};
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + (Number(issuer.validityDays) || 30));
    const travelers = Math.max(1, Number(request.travelers) || 1);
    const assistanceDays = Math.max(0, Math.floor(Number(request.assistanceDays) || 0));
    const quoteNumber = buildQuoteNumber(now, request.firstName, request.lastName);

    const templateData = {
      // Issuer
      companyLegalName: valueOrPlaceholder(issuer.legalName),
      companyAddress: valueOrPlaceholder(issuer.address),
      companySiret: valueOrPlaceholder(issuer.siret),
      companyEmail: valueOrPlaceholder(issuer.email),
      companyPhone: issuer.phone || "",
      vatMention: issuer.vatMention || "",
      // VAT exemption (article 293 B): « net à payer »; otherwise the total includes VAT
      totalLabel: /293 B/.test(issuer.vatMention || "") ? "Total net à payer" : "Total TTC",
      balanceTerms: valueOrPlaceholder(issuer.balanceTerms),
      deliveryDelay: valueOrPlaceholder(issuer.deliveryDelay),
      bankHolder: valueOrPlaceholder(issuer.bankHolder),
      iban: valueOrPlaceholder(issuer.iban),
      bic: valueOrPlaceholder(issuer.bic),
      // Quote and client
      quoteNumber,
      quoteDate: formatDate(now),
      quoteValidUntil: formatDate(validUntil),
      clientName: `${request.firstName} ${request.lastName}`.trim(),
      clientAddress: placeholderText,
      clientEmail: request.email || "",
      clientPhone: request.phone || "",
      formula: request.formula,
      travelers: String(travelers),
      destination: valueOrPlaceholder(request.destination),
      travelPeriod: valueOrPlaceholder(request.period),
      ...computePricing(request.formula, travelers, assistanceDays),
    };

    const response = await fetch(templateUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Quote template not found (HTTP ${response.status})`);

    const filledDocument = new Docxtemplater(new PizZip(await response.arrayBuffer()), {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });
    filledDocument.render(templateData);

    const blob = filledDocument.getZip().generate({
      type: "blob",
      mimeType: wordMimeType,
      compression: "DEFLATE", // about 3× lighter than the default uncompressed zip
    });
    const fileName = `Devis-${quoteNumber}-${toSafeFileName(request.lastName) || "client"}.docx`;
    return new File([blob], fileName, { type: blob.type });
  };

  window.quoteGenerator = Object.freeze({ createQuoteFile });
})();
