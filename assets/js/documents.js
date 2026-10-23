/**
 * ==========================================================================
 * Marie Dream Planner — Outil privé : devis et factures Word
 * --------------------------------------------------------------------------
 * Remplit les modèles /outils/modeles/devis.docx et facture.docx avec
 * docxtemplater (+ PizZip), entièrement dans le navigateur.
 *
 * Principes :
 *  - Montants calculés en centimes (entiers) : aucune erreur d'arrondi.
 *  - Informations de l'entreprise et compteurs de numérotation enregistrés
 *    dans localStorage (ce navigateur uniquement), jamais dans le code.
 *  - Données de la demande lues dans le fragment d'URL (#demande=…),
 *    qui n'est jamais envoyé au serveur.
 *
 * Sommaire
 *   1. Constantes et utilitaires
 *   2. Stockage local (paramètres, compteurs)
 *   3. Lecture de la demande transmise par l'e-mail
 *   4. Calcul des lignes et des montants
 *   5. Génération des documents Word
 *   6. Interface (affichages conditionnels, aperçu, boutons)
 * ==========================================================================
 */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
   * 1. Constantes et utilitaires
   * --------------------------------------------------------------------- */
  const storageKeys = Object.freeze({ settings: "mdp.documents.settings", counters: "mdp.documents.counters" });

  /** Tarifs publics (en centimes) : à aligner sur la page d'accueil et les CGV. */
  const formulaPrices = Object.freeze({
    "Week-end": { price: 7900, description: "Formule Week-end (2 à 4 jours, 1 étape, 4 voyageurs inclus)" },
    "Escapade": { price: 16900, description: "Formule Escapade (5 à 15 jours, jusqu’à 4 étapes, 4 voyageurs inclus)" },
    "Évasion": { price: 29900, description: "Formule Évasion (15 à 30 jours, jusqu’à 10 étapes, 4 voyageurs inclus)" },
  });
  const includedTravelers = 4;
  const extraTravelerPrice = 1000;
  const depositRate = 0.1;

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const fieldValue = (id) => (qs(`#${id}`)?.value || "").trim();

  const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  /** @param {number} cents */
  const formatEuro = (cents) => euroFormatter.format(cents / 100);

  /** Date ISO (aaaa-mm-jj) → jj/mm/aaaa. */
  const formatDate = (isoDate) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  };

  /** Date du jour décalée de « days » jours, au format ISO local. */
  const isoDateFromToday = (days = 0, fromIso = "") => {
    const date = fromIso ? new Date(`${fromIso}T12:00:00`) : new Date();
    date.setDate(date.getDate() + days);
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  /** Nom de fichier sûr : sans accents ni caractères spéciaux. */
  const safeFileName = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-|-$/g, "");

  const setStatus = (elementId, message, statusType = "") => {
    const statusElement = qs(`#${elementId}`);
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.dataset.status = statusType;
  };

  /* ------------------------------------------------------------------------
   * 2. Stockage local
   * --------------------------------------------------------------------- */
  const settingsFields = ["companyLegalName", "companyAddress", "companySiret", "companyPhone", "companyEmail", "vatMode",
    "vatNumber", "vatRate", "bankHolder", "iban", "bic", "mediator", "balanceTerms", "quoteValidityDays", "paymentDelayDays"];
  const requiredSettings = ["companyLegalName", "companyAddress", "companySiret", "companyEmail", "bankHolder", "iban", "bic", "mediator", "balanceTerms"];

  const readStorage = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("[documents] Enregistrement local impossible :", error);
      return false;
    }
  };

  const loadSettings = () => {
    const savedSettings = readStorage(storageKeys.settings, {});
    settingsFields.forEach((fieldId) => {
      if (savedSettings[fieldId] !== undefined && qs(`#${fieldId}`)) qs(`#${fieldId}`).value = savedSettings[fieldId];
    });
  };

  const collectSettings = () => Object.fromEntries(settingsFields.map((fieldId) => [fieldId, fieldValue(fieldId)]));

  const missingSettings = () => requiredSettings.filter((fieldId) => !fieldValue(fieldId));

  /**
   * Numéro suivant pour un préfixe donné (D = devis, F = facture), au format
   * PRÉFIXE-AAAA-NNN. Le compteur repart à 1 chaque année.
   */
  const nextNumber = (counterName, prefix) => {
    const counters = readStorage(storageKeys.counters, {});
    const year = new Date().getFullYear();
    const counter = counters[counterName];
    const last = counter && counter.year === year ? counter.last : 0;
    return `${prefix}-${year}-${String(last + 1).padStart(3, "0")}`;
  };

  /** Mémorise un numéro utilisé (s'il dépasse le dernier connu de l'année). */
  const rememberNumber = (counterName, usedNumber) => {
    const match = /^[A-Z]+-(\d{4})-(\d+)$/.exec(usedNumber);
    if (!match) return;
    const year = Number(match[1]);
    const sequence = Number(match[2]);
    const counters = readStorage(storageKeys.counters, {});
    const counter = counters[counterName];
    if (!counter || counter.year !== year || sequence > counter.last) {
      counters[counterName] = { year, last: sequence };
      writeStorage(storageKeys.counters, counters);
    }
  };

  /* ------------------------------------------------------------------------
   * 3. Lecture de la demande transmise par l'e-mail (#demande=…)
   * --------------------------------------------------------------------- */
  const readRequestFromHash = () => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const encoded = hashParams.get("demande");
    if (!encoded) return null;
    try {
      // base64url → octets → texte UTF-8 → objet
      const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      console.error("[documents] Lien de demande illisible :", error);
      return null;
    }
  };

  const applyRequest = (request) => {
    const mapping = { firstName: "clientFirstName", lastName: "clientLastName", email: "clientEmail", phone: "clientPhone",
      destination: "destination", period: "travelPeriod", message: "clientMessage" };
    Object.entries(mapping).forEach(([requestKey, fieldId]) => {
      if (request[requestKey]) qs(`#${fieldId}`).value = request[requestKey];
    });
    if (request.formula && qsa("#formula option").some((option) => option.value === request.formula)) {
      qs("#formula").value = request.formula;
    }
    if (Number(request.travelers) > 0) qs("#travelers").value = Number(request.travelers);
    if (request.message) qs("#clientMessageField").hidden = false;

    qs("#requestClientName").textContent = `${request.firstName || ""} ${request.lastName || ""}`.trim();
    qs("#requestNotice").hidden = false;
    // Le fragment a été lu : on l'efface de la barre d'adresse et de l'historique
    history.replaceState(null, "", window.location.pathname);
  };

  /* ------------------------------------------------------------------------
   * 4. Calcul des lignes et des montants (en centimes)
   * --------------------------------------------------------------------- */
  const isCustomFormula = () => !formulaPrices[fieldValue("formula")];

  /** Lignes de la prestation complète, hors TVA. */
  const serviceLines = () => {
    const formula = fieldValue("formula");
    const travelers = Math.max(1, Number(fieldValue("travelers")) || 1);
    const lines = [];

    if (formulaPrices[formula]) {
      lines.push({ label: formulaPrices[formula].description, quantity: 1, unitCents: formulaPrices[formula].price });
      const extraTravelers = Math.max(0, travelers - includedTravelers);
      if (extraTravelers > 0) {
        lines.push({ label: "Voyageur supplémentaire", quantity: extraTravelers, unitCents: extraTravelerPrice });
      }
    } else {
      const customCents = Math.round((Number(fieldValue("customPrice")) || 0) * 100);
      lines.push({ label: `Prestation ${formula} — organisation sur mesure (${travelers} participants)`, quantity: 1, unitCents: customCents });
    }
    return lines.map((line) => ({ ...line, totalCents: line.quantity * line.unitCents }));
  };

  const sumCents = (lines) => lines.reduce((total, line) => total + line.totalCents, 0);

  /** Montants clés : total, acompte (10 %, arrondi au centime) et solde. */
  const amounts = () => {
    const totalCents = sumCents(serviceLines());
    const depositCents = Math.round(totalCents * depositRate);
    return { totalCents, depositCents, balanceCents: totalCents - depositCents };
  };

  /** Mentions et totaux liés à la TVA, selon le régime choisi. */
  const vatData = (netCents) => {
    if (fieldValue("vatMode") !== "liable") {
      return { vatMention: "TVA non applicable, article 293 B du CGI.", vatIdentityLine: "",
        totalLabel: "Total net à payer", totalAmount: formatEuro(netCents), payableCents: netCents };
    }
    const rate = Number(fieldValue("vatRate")) || 0;
    const vatCents = Math.round(netCents * rate / 100);
    return {
      vatMention: `Total HT : ${formatEuro(netCents)} — TVA ${rate.toLocaleString("fr-FR")} % : ${formatEuro(vatCents)} — Total TTC : ${formatEuro(netCents + vatCents)}`,
      vatIdentityLine: fieldValue("vatNumber") ? `N° de TVA intracommunautaire : ${fieldValue("vatNumber")}` : "",
      totalLabel: "Total TTC", totalAmount: formatEuro(netCents + vatCents), payableCents: netCents + vatCents,
    };
  };

  const toTemplateLines = (lines) => lines.map((line) => ({
    label: line.label, quantity: String(line.quantity), unitPrice: formatEuro(line.unitCents), lineTotal: formatEuro(line.totalCents),
  }));

  /** Données communes aux deux documents. */
  const commonData = () => {
    const settings = collectSettings();
    const clientName = `${fieldValue("clientFirstName")} ${fieldValue("clientLastName")}`.trim();
    return {
      companyLegalName: settings.companyLegalName, companyAddress: settings.companyAddress, companySiret: settings.companySiret,
      companyEmail: settings.companyEmail, companyPhone: settings.companyPhone, bankHolder: settings.bankHolder,
      iban: settings.iban, bic: settings.bic, mediator: settings.mediator,
      clientName, clientEmail: fieldValue("clientEmail"), clientPhone: fieldValue("clientPhone"), clientAddress: fieldValue("clientAddress"),
      clientIsBusiness: qs("#clientIsBusiness").checked, clientCompany: fieldValue("clientCompany"), clientSiren: fieldValue("clientSiren"),
      formula: fieldValue("formula"), destination: fieldValue("destination") || "à définir",
      travelPeriod: fieldValue("travelPeriod") || "à définir", travelers: fieldValue("travelers"),
      quoteNumber: fieldValue("quoteNumber"), quoteDate: formatDate(fieldValue("quoteDate")),
    };
  };

  /* ------------------------------------------------------------------------
   * 5. Génération des documents Word
   * --------------------------------------------------------------------- */

  /**
   * Remplit un modèle .docx et déclenche son téléchargement.
   * @param {string} templateName  devis | facture
   * @param {object} data          valeurs des balises
   * @param {string} fileName      nom du fichier téléchargé
   */
  const renderDocument = async (templateName, data, fileName) => {
    const response = await fetch(`/outils/modeles/${templateName}.docx`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Modèle introuvable (${response.status})`);

    const zip = new window.PizZip(await response.arrayBuffer());
    const filledDocument = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
    filledDocument.render(data);

    const blob = filledDocument.getZip().generate({
      type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const downloadLink = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName });
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    setTimeout(() => URL.revokeObjectURL(downloadLink.href), 2000);
  };

  /** Vérifications communes ; renvoie un message d'erreur ou une chaîne vide. */
  const validateCommon = () => {
    const missing = missingSettings();
    if (missing.length) {
      qs("#settingsPanel").open = true;
      return "Complétez d’abord vos informations d’entreprise (section 1) et enregistrez-les.";
    }
    if (!fieldValue("clientFirstName") || !fieldValue("clientLastName")) return "Indiquez le prénom et le nom du client.";
    if (!fieldValue("clientAddress")) return "Indiquez l’adresse du client (mention obligatoire).";
    if (isCustomFormula() && !(Number(fieldValue("customPrice")) > 0)) return "Indiquez le prix de la prestation sur devis.";
    if (qs("#clientIsBusiness").checked && !/^\d{9}$/.test(fieldValue("clientSiren").replace(/\s/g, ""))) {
      return "Pour un client professionnel, indiquez son SIREN (9 chiffres).";
    }
    return "";
  };

  const generateQuote = async () => {
    const errorMessage = validateCommon() || (!fieldValue("quoteNumber") ? "Indiquez le numéro du devis." : "");
    if (errorMessage) return setStatus("quoteStatus", errorMessage, "error");

    const { totalCents } = amounts();
    const vat = vatData(totalCents);
    const depositCents = Math.round(vat.payableCents * depositRate);
    const validityDays = Number(fieldValue("quoteValidityDays")) || 30;
    const data = {
      ...commonData(), ...vat,
      quoteValidUntil: formatDate(isoDateFromToday(validityDays, fieldValue("quoteDate"))),
      deliveryDelay: fieldValue("deliveryDelay"),
      lines: toTemplateLines(serviceLines()),
      depositAmount: formatEuro(depositCents), balanceAmount: formatEuro(vat.payableCents - depositCents),
      balanceTerms: fieldValue("balanceTerms"),
    };

    try {
      await renderDocument("devis", data, `Devis-${data.quoteNumber}-${safeFileName(fieldValue("clientLastName"))}.docx`);
      rememberNumber("quote", data.quoteNumber);
      // Le numéro reste affiché : les factures de ce client y feront référence.
      // Le numéro suivant sera proposé au prochain chargement de l'outil.
      setStatus("quoteStatus", `Devis ${data.quoteNumber} téléchargé.`, "success");
    } catch (error) {
      console.error("[documents] Échec du devis :", error);
      setStatus("quoteStatus", `Le devis n’a pas pu être créé : ${error.message}`, "error");
    }
  };

  const generateInvoice = async () => {
    const invoiceType = qs("input[name='invoiceType']:checked").value;
    let errorMessage = validateCommon();
    if (!errorMessage && !fieldValue("invoiceNumber")) errorMessage = "Indiquez le numéro de la facture.";
    if (!errorMessage && !fieldValue("quoteNumber")) errorMessage = "Indiquez le numéro du devis de référence (section 3).";
    if (!errorMessage && invoiceType === "balance" && !fieldValue("depositInvoiceNumber")) errorMessage = "Indiquez le numéro de la facture d’acompte.";
    if (errorMessage) return setStatus("invoiceStatus", errorMessage, "error");

    const lines = serviceLines();
    const fullVat = vatData(sumCents(lines));
    const depositPayableCents = Math.round(fullVat.payableCents * depositRate);
    let invoiceLines;
    let invoiceTitle;
    let netCents;

    if (invoiceType === "deposit") {
      invoiceTitle = "Facture d’acompte";
      netCents = Math.round(sumCents(lines) * depositRate);
      invoiceLines = [{ label: `Acompte de 10 % sur le devis ${fieldValue("quoteNumber")} (montant total ${fullVat.totalAmount})`,
        quantity: 1, unitCents: netCents, totalCents: netCents }];
    } else if (invoiceType === "balance") {
      invoiceTitle = "Facture de solde";
      const depositNetCents = Math.round(sumCents(lines) * depositRate);
      invoiceLines = [...lines, { label: `Acompte déjà facturé (facture ${fieldValue("depositInvoiceNumber")})`,
        quantity: 1, unitCents: -depositNetCents, totalCents: -depositNetCents }];
      netCents = sumCents(lines) - depositNetCents;
    } else {
      invoiceTitle = "Facture";
      invoiceLines = lines;
      netCents = sumCents(lines);
    }

    const vat = vatData(netCents);
    const invoiceDate = fieldValue("invoiceDate");
    const data = {
      ...commonData(), ...vat, invoiceTitle,
      invoiceNumber: fieldValue("invoiceNumber"), invoiceDate: formatDate(invoiceDate),
      serviceDate: fieldValue("serviceDate") || formatDate(invoiceDate),
      lines: toTemplateLines(invoiceLines),
      isPaid: qs("#isPaid").checked, paidDate: formatDate(fieldValue("paidDate")),
      dueDate: formatDate(isoDateFromToday(Number(fieldValue("paymentDelayDays")) || 0, invoiceDate)),
    };

    try {
      await renderDocument("facture", data, `Facture-${data.invoiceNumber}-${safeFileName(fieldValue("clientLastName"))}.docx`);
      rememberNumber("invoice", data.invoiceNumber);
      setStatus("invoiceStatus", `${invoiceTitle} ${data.invoiceNumber} téléchargée (${formatEuro(vat.payableCents)}). Conservez-la dans votre registre.`, "success");
      if (invoiceType === "deposit") qs("#depositInvoiceNumber").value = data.invoiceNumber;
      qs("#invoiceNumber").value = nextNumber("invoice", "F");
    } catch (error) {
      console.error("[documents] Échec de la facture :", error);
      setStatus("invoiceStatus", `La facture n’a pas pu être créée : ${error.message}`, "error");
    }
  };

  /* ------------------------------------------------------------------------
   * 6. Interface
   * --------------------------------------------------------------------- */
  const refreshVisibility = () => {
    const vatLiable = fieldValue("vatMode") === "liable";
    qsa("[data-show-when='liable']").forEach((element) => { element.hidden = !vatLiable; });
    qsa("[data-show-when-business]").forEach((element) => { element.hidden = !qs("#clientIsBusiness").checked; });
    qsa("[data-show-when-custom]").forEach((element) => { element.hidden = !isCustomFormula(); });
    qsa("[data-show-when-paid]").forEach((element) => { element.hidden = !qs("#isPaid").checked; });
    const invoiceType = qs("input[name='invoiceType']:checked").value;
    qsa("[data-show-when-invoice]").forEach((element) => { element.hidden = element.dataset.showWhenInvoice !== invoiceType; });

    const missing = missingSettings();
    const badge = qs("#settingsBadge");
    badge.textContent = missing.length ? "à compléter" : "complètes";
    badge.dataset.state = missing.length ? "todo" : "done";
  };

  /** Aperçu du prix, mis à jour à chaque saisie. */
  const refreshPreview = () => {
    const linesBody = qs("#linesBody");
    linesBody.replaceChildren(...serviceLines().map((line) => {
      const row = document.createElement("tr");
      [line.label, String(line.quantity), formatEuro(line.unitCents), formatEuro(line.totalCents)].forEach((text) => {
        const tableCell = document.createElement("td");
        tableCell.textContent = text;
        row.append(tableCell);
      });
      return row;
    }));
    const vat = vatData(amounts().totalCents);
    const depositCents = Math.round(vat.payableCents * depositRate);
    qs("#totalDisplay").textContent = vat.totalAmount;
    qs("#depositDisplay").textContent = formatEuro(depositCents);
    qs("#balanceDisplay").textContent = formatEuro(vat.payableCents - depositCents);
  };

  const init = () => {
    if (!window.PizZip || !window.docxtemplater) {
      setStatus("quoteStatus", "Bibliothèques de génération introuvables (dossier assets/vendor).", "error");
      return;
    }

    loadSettings();
    qs("#settingsPanel").open = missingSettings().length > 0;

    const request = readRequestFromHash();
    if (request) applyRequest(request);

    qs("#quoteNumber").value = nextNumber("quote", "D");
    qs("#invoiceNumber").value = nextNumber("invoice", "F");
    qs("#quoteDate").value = isoDateFromToday();
    qs("#invoiceDate").value = isoDateFromToday();
    qs("#paidDate").value = isoDateFromToday();

    qs("#settingsForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const missing = missingSettings();
      if (missing.length) {
        setStatus("settingsStatus", "Certains champs obligatoires (*) sont vides.", "error");
        qs(`#${missing[0]}`).focus();
        return;
      }
      const saved = writeStorage(storageKeys.settings, collectSettings());
      setStatus("settingsStatus", saved ? "Informations enregistrées dans ce navigateur." : "Enregistrement impossible (navigation privée ?).", saved ? "success" : "error");
      refreshVisibility();
      refreshPreview();
    });

    document.addEventListener("input", () => { refreshVisibility(); refreshPreview(); });
    document.addEventListener("change", () => { refreshVisibility(); refreshPreview(); });
    qs("#generateQuote").addEventListener("click", generateQuote);
    qs("#generateInvoice").addEventListener("click", generateInvoice);

    refreshVisibility();
    refreshPreview();
  };

  init();
})();
