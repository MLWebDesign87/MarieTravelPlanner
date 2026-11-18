/**
 * Marie Dream Planner — Word quote template generator
 * ----------------------------------------------------
 * Writes public/assets/documents/devis.docx. Its {…} placeholders are filled
 * in the visitor's browser (public/assets/js/quote-generator.js) when the
 * quote form is submitted; the quote is then attached to the email to Marie.
 *
 * Golden rule: each placeholder is written in a single TextRun so that Word
 * never splits it. When editing the template in Word, retype a placeholder in
 * one go (or paste it whole).
 *
 * Legal mentions covered (French consumer law): identification (including the
 * "EI" mention and SIRET), date and validity, price breakdown, nature of the
 * service, VAT mention, deposit explicitly qualified as "acompte" and not
 * "arrhes" (Code de la consommation L214-1), balance due date, bank details,
 * withdrawal right, acceptance of the terms of sale and request for
 * early performance (L221-25, L221-28 1°), collected with two separate boxes.
 *
 * Usage: node scripts/documents/build-templates.js [output directory]
 * Requires the "docx" npm package (npm install).
 */

const fs = require("fs");
const path = require("path");
const {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, Packer, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} = require("docx");

const outputDir = process.argv[2] || path.join(__dirname, "..", "..", "public", "assets", "documents");
fs.mkdirSync(outputDir, { recursive: true });

// --- Brand ------------------------------------------------------------------
const color = { garnet: "7E1416", night: "2B0709", soft: "6B3734", line: "E8C9C1", blush: "FCE6E0" };
const font = { body: "Arial", display: "Georgia" };
const pageWidth = 11906; // A4 width, in DXA (1/20 pt)
const pageHeight = 16838; // A4 height, in DXA
const margin = 1000;
const contentWidth = pageWidth - 2 * margin;
const logo = fs.readFileSync(path.join(__dirname, "..", "..", "public", "assets", "img", "logo-emblem-96.png"));

// --- Formatting helpers -----------------------------------------------------
const run = (text, options = {}) => new TextRun({ text, font: font.body, size: 19, color: color.night, ...options });
const paragraph = (children, options = {}) =>
  new Paragraph({ spacing: { after: 60, line: 276 }, ...options, children: Array.isArray(children) ? children : [children] });
const label = (text) => run(text, { bold: true, color: color.garnet });
const small = (text, options = {}) => run(text, { size: 16, color: color.soft, ...options });

const sectionTitle = (text) => new Paragraph({
  spacing: { before: 240, after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: color.line, space: 2 } },
  children: [run(text, { bold: true, size: 20, color: color.garnet })],
});

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
// Single bottom rule (table rows, signature boxes)
const lineBorders = { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 4, color: color.line } };

const cell = (children, width, options = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  borders: options.borders || noBorders,
  shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  verticalAlign: VerticalAlign.CENTER,
  children: Array.isArray(children) ? children : [children],
});

// Header: logo and issuer identity (left), document title and details (right)
const headerBlock = (documentTitle, metaLines) => {
  const leftWidth = Math.round(contentWidth * 0.56);
  const rightWidth = contentWidth - leftWidth;
  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [leftWidth, rightWidth],
    rows: [new TableRow({ children: [
      cell([
        paragraph([new ImageRun({ type: "png", data: logo, transformation: { width: 54, height: 54 } })], { spacing: { after: 80 } }),
        paragraph(run("Marie Dream Planner", { font: font.display, size: 30, color: color.garnet })),
        paragraph(run("{companyLegalName}", { bold: true })),
        paragraph(run("{companyAddress}")),
        paragraph(run("SIRET : {companySiret}")),
        paragraph(run("{companyEmail}{#companyPhone} — {companyPhone}{/companyPhone}")),
      ], leftWidth),
      cell([
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 120 },
          children: [run(documentTitle, { font: font.display, size: 40, color: color.garnet })] }),
        ...metaLines.map((line) => new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 40 }, children: line })),
      ], rightWidth),
    ] })],
  });
};

// Client block (blush frame)
const clientBlock = () => new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [contentWidth],
  rows: [new TableRow({ children: [cell([
    paragraph(label("Client")),
    paragraph(run("{clientName}", { bold: true })),
    paragraph(run("Adresse : {clientAddress}")),
    paragraph(run("{clientEmail}{#clientPhone} — {clientPhone}{/clientPhone}")),
  ], contentWidth, { fill: color.blush })] })],
});

// Price table: docxtemplater repeats the data row once per quote line
const linesTable = () => {
  const widths = [Math.round(contentWidth * 0.55), Math.round(contentWidth * 0.1), Math.round(contentWidth * 0.17)];
  widths.push(contentWidth - widths.reduce((a, b) => a + b, 0));
  const headerFill = color.garnet;
  const headerCell = (text, width, align) => cell(
    new Paragraph({ alignment: align, children: [run(text, { bold: true, color: "FFFFFF", size: 18 })] }), width, { fill: headerFill });
  const dataCell = (text, width, align) => cell(
    new Paragraph({ alignment: align, children: [run(text)] }), width, { borders: lineBorders });
  // Total rows span columns 2 and 3
  const mergedTotal = (labelText, valueTag, bold = false) => new TableRow({ children: [
    cell(new Paragraph({ children: [run("")] }), widths[0]),
    new TableCell({ width: { size: widths[1] + widths[2], type: WidthType.DXA }, columnSpan: 2, borders: noBorders,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(labelText, { bold })] })] }),
    cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(valueTag, { bold, color: bold ? color.garnet : color.night })] }), widths[3]),
  ] });

  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: [
        headerCell("Désignation", widths[0], AlignmentType.LEFT), headerCell("Qté", widths[1], AlignmentType.CENTER),
        headerCell("Prix unitaire", widths[2], AlignmentType.RIGHT), headerCell("Montant", widths[3], AlignmentType.RIGHT),
      ] }),
      new TableRow({ children: [
        dataCell("{#lines}{label}", widths[0], AlignmentType.LEFT), dataCell("{quantity}", widths[1], AlignmentType.CENTER),
        dataCell("{unitPrice}", widths[2], AlignmentType.RIGHT), dataCell("{lineTotal}{/lines}", widths[3], AlignmentType.RIGHT),
      ] }),
      mergedTotal("{totalLabel}", "{totalAmount}", true),
    ],
  });
};

// Bank details for the transfer, with the reference to quote
const bankBlock = (referenceTag) => [
  paragraph([label("Coordonnées bancaires — "), run("Titulaire : {bankHolder}")]),
  paragraph([run("IBAN : {iban}     BIC : {bic}")]),
  paragraph([run("Référence à indiquer sur le virement : "), run(referenceTag, { bold: true })]),
];

// Page footer: issuer, document reference and page number
const pageFooter = (documentKind) => new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: color.line, space: 4 } },
    children: [
      small(`{companyLegalName} — Marie Dream Planner — SIRET {companySiret} — ${documentKind} — page `),
      new TextRun({ children: [PageNumber.CURRENT], font: font.body, size: 16, color: color.soft }),
    ],
  })] });

const buildDocument = ({ footer, children }) => new Document({
  creator: "Marie Dream Planner",
  styles: { default: { document: { run: { font: font.body, size: 19 } } } },
  sections: [{
    properties: { page: { size: { width: pageWidth, height: pageHeight }, margin: { top: 900, bottom: 900, left: margin, right: margin } } },
    footers: { default: footer },
    children,
  }],
});

// ============================================================================
// Quote document (content in French: it is sent to clients)
// ============================================================================
const quoteDocument = buildDocument({
  footer: pageFooter("Devis {quoteNumber}"),
  children: [
    headerBlock("Devis", [
      [label("N° "), run("{quoteNumber}", { bold: true })],
      [run("Date : {quoteDate}")],
      [run("Valable jusqu'au : {quoteValidUntil}")],
    ]),
    paragraph(run(""), { spacing: { after: 120 } }),
    clientBlock(),

    sectionTitle("Objet"),
    paragraph(run("Prestation de conseil et d'organisation de voyage sur mesure — formule {formula}.")),
    paragraph([label("Destination : "), run("{destination}"), label("     Période : "), run("{travelPeriod}"), label("     Voyageurs : "), run("{travelers}")]),
    paragraph([label("Nature de l'opération : "), run("prestation de services.")]),
    paragraph([label("Contenu : "), run("échange de cadrage, recherche des transports, logements, activités et bonnes adresses, itinéraire personnalisé, carnet de voyage au format PDF contenant les liens de réservation. Les réservations et leur paiement restent à la charge du client, directement auprès des prestataires.")]),
    paragraph([label("Délai de remise du carnet : "), run("{deliveryDelay}")]),

    sectionTitle("Détail du prix"),
    linesTable(),
    paragraph(run("{vatMention}", { italics: true, color: color.soft }), { spacing: { before: 80 } }),

    sectionTitle("Conditions de paiement"),
    paragraph([run("Acompte de 50 % à la signature du devis : "), run("{depositAmount}", { bold: true }), run(", par virement bancaire.")]),
    paragraph([run("Solde : "), run("{balanceAmount}", { bold: true }), run(" — {balanceTerms}.")]),
    paragraph(run("La somme versée à la signature constitue un acompte et non des arrhes (article L214-1 du Code de la consommation) : elle engage définitivement les deux parties, sous réserve du droit de rétractation ci-dessous.")),
    ...bankBlock("{quoteNumber}"),
    paragraph(run("Escompte pour paiement anticipé : néant.")),

    sectionTitle("Droit de rétractation"),
    paragraph(run("Contrat conclu à distance : sauf exceptions prévues à l'article L221-28 du Code de la consommation (CGV, article 9), vous disposez de 14 jours à compter de l'acceptation du devis pour vous rétracter, sans motif, au moyen du formulaire joint aux conditions générales de vente ou de toute déclaration dénuée d'ambiguïté. L'acompte vous est alors remboursé, déduction faite, le cas échéant, de la part de prestation déjà réalisée à votre demande expresse.")),

    sectionTitle("Bon pour accord"),
    paragraph(run("Pour accepter ce devis, retournez-le daté et signé, puis effectuez le virement de l'acompte.")),
    paragraph([run("☐  ", { font: "Segoe UI Symbol" }), run("J'ai pris connaissance des conditions générales de vente jointes à ce devis et je les accepte.")]),
    paragraph([run("☐  ", { font: "Segoe UI Symbol" }), run("(Facultatif) Je demande que la prestation commence avant la fin du délai de rétractation de 14 jours. Je reconnais que je perdrai mon droit de rétractation une fois le carnet de voyage remis, et qu'en cas de rétractation avant, la part déjà réalisée restera due.")]),
    paragraph(run(""), { spacing: { after: 120 } }),
    new Table({
      width: { size: contentWidth, type: WidthType.DXA },
      columnWidths: [Math.round(contentWidth / 2), contentWidth - Math.round(contentWidth / 2)],
      rows: [new TableRow({ children: [
        cell([paragraph(label("Date :")), paragraph(run("")), paragraph(run("Mention « Bon pour accord »")), paragraph(run("")), paragraph(run(""))],
          Math.round(contentWidth / 2), { borders: lineBorders }),
        cell([paragraph(label("Signature du client :")), paragraph(run("")), paragraph(run("")), paragraph(run("")), paragraph(run(""))],
          contentWidth - Math.round(contentWidth / 2), { borders: lineBorders }),
      ] })],
    }),
  ],
});

(async () => {
  const outputFile = path.join(outputDir, "devis.docx");
  fs.writeFileSync(outputFile, await Packer.toBuffer(quoteDocument));
  console.log("Template written:", outputFile);
})();
