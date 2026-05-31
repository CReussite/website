const PDFDocument = require('pdfkit');
const path = require('path');

// Couleurs du site
const ROYAL_BLUE = '#112250';
const SAPPHIRE = '#3C5070';
const QUICKSAND = '#E0C58F';
const SWAN_WING = '#F5F0E9';
const SHELLSTONE = '#D9CBC2';
const TEXT_MID = '#3C4A5C';

/**
 * Génère un PDF de facture en mémoire.
 * Retourne une Promise<Buffer>.
 */
function generateInvoice({ invoiceNumber, email, productName, amount, date, paymentRef }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const amountEur = (amount / 100).toFixed(2).replace('.', ',');
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const pageWidth = 595.28;
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;

    // ── En-tête (fond bleu royal) ────────────────────────
    doc.rect(0, 0, pageWidth, 90).fill(ROYAL_BLUE);

    // Logo
    try {
      const logoPath = path.join(__dirname, '../assets/logo.jpeg');
      doc.image(logoPath, margin, 15, { width: 60, height: 60 });
    } catch (_) {}

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text("C'Réussite", margin + 72, 38);

    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor(QUICKSAND)
      .text('FACTURE', pageWidth - margin - 150, 30, { width: 150, align: 'right' });

    // ── Barre meta (fond swan-wing) — 2 lignes ─────────
    doc.rect(0, 90, pageWidth, 52).fill(SWAN_WING);
    // Ligne bleu royal séparant l'en-tête de la barre
    doc.rect(0, 90, pageWidth, 2).fill(QUICKSAND);

    doc.fontSize(9).font('Helvetica').fillColor(SAPPHIRE);
    // Ligne 1 : facture
    const metaLine1Y = 98;
    doc
      .font('Helvetica-Bold')
      .text('N° facture :', margin, metaLine1Y, { continued: true })
      .font('Helvetica')
      .text(' ' + invoiceNumber);
    doc
      .font('Helvetica-Bold')
      .text("Date d'émission :", margin + 250, metaLine1Y, { continued: true })
      .font('Helvetica')
      .text(' ' + dateStr);
    // Ligne 2 : paiement
    const metaLine2Y = 114;
    const refText = paymentRef || '—';
    doc
      .font('Helvetica-Bold')
      .text('Réf. paiement :', margin, metaLine2Y, { continued: true })
      .font('Helvetica')
      .text(' ' + refText);
    doc
      .font('Helvetica-Bold')
      .text('Date de paiement :', margin + 250, metaLine2Y, { continued: true })
      .font('Helvetica')
      .text(' ' + dateStr);

    // ── Vendeur / Client ─────────────────────────────────
    const partiesY = 164;

    // Vendeur
    doc.fontSize(8).font('Helvetica-Bold').fillColor(QUICKSAND).text('VENDEUR', margin, partiesY);
    doc
      .moveTo(margin, partiesY + 12)
      .lineTo(margin + 60, partiesY + 12)
      .lineWidth(1.5)
      .strokeColor(QUICKSAND)
      .stroke();
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(ROYAL_BLUE)
      .text('Camille Reinhardt EI', margin, partiesY + 20);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(TEXT_MID)
      .text("C'Réussite", margin, partiesY + 36)
      .text('54A Rue des Écoles', margin, partiesY + 48)
      .text('57700 Neufchef', margin, partiesY + 60)
      .text('SIRET : 103 644 050 00017', margin, partiesY + 72)
      .text('APE : 4791B', margin, partiesY + 84)
      .text('c-reussite.fr', margin, partiesY + 96);

    // Client
    const clientX = pageWidth / 2 + 20;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(QUICKSAND).text('CLIENT', clientX, partiesY);
    doc
      .moveTo(clientX, partiesY + 12)
      .lineTo(clientX + 50, partiesY + 12)
      .lineWidth(1.5)
      .strokeColor(QUICKSAND)
      .stroke();
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(ROYAL_BLUE)
      .text(email, clientX, partiesY + 20);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(TEXT_MID)
      .text(email, clientX, partiesY + 36);

    // ── Tableau produit ──────────────────────────────────
    const tableTop = partiesY + 110;
    const colDesignation = margin;
    const colQty = margin + contentWidth * 0.55;
    const colPU = margin + contentWidth * 0.68;
    const colTotal = margin + contentWidth * 0.85;

    // En-tête tableau
    doc.rect(margin, tableTop, contentWidth, 24).fill(SAPPHIRE);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('DÉSIGNATION', colDesignation + 8, tableTop + 7);
    doc.text('QTÉ', colQty, tableTop + 7, { width: 40, align: 'right' });
    doc.text('PRIX UNITAIRE HT', colPU, tableTop + 7, { width: 70, align: 'right' });
    doc.text('TOTAL HT', colTotal, tableTop + 7, { width: 70, align: 'right' });

    // Ligne produit
    const rowY = tableTop + 24;
    const designation = `Ebook — ${productName} (PDF)`;
    doc.fontSize(9).font('Helvetica').fillColor('#1A1A2E');
    doc.text(designation, colDesignation + 8, rowY + 8);
    doc.text('1', colQty, rowY + 8, { width: 40, align: 'right' });
    doc.text(amountEur + ' €', colPU, rowY + 8, { width: 70, align: 'right' });
    doc.text(amountEur + ' €', colTotal, rowY + 8, { width: 70, align: 'right' });
    doc
      .moveTo(margin, rowY + 26)
      .lineTo(margin + contentWidth, rowY + 26)
      .lineWidth(0.5)
      .strokeColor(SHELLSTONE)
      .stroke();

    // ── Totaux ───────────────────────────────────────────
    const totalsX = margin + contentWidth - 200;
    const totalsY = rowY + 40;

    doc.fontSize(9).font('Helvetica').fillColor(TEXT_MID);
    doc.text('Sous-total HT', totalsX, totalsY);
    doc.text(amountEur + ' €', totalsX + 100, totalsY, { width: 100, align: 'right' });

    doc.text('TVA', totalsX, totalsY + 18);
    doc.text('0,00 €', totalsX + 100, totalsY + 18, { width: 100, align: 'right' });

    doc
      .moveTo(totalsX, totalsY + 36)
      .lineTo(totalsX + 200, totalsY + 36)
      .lineWidth(1.5)
      .strokeColor(ROYAL_BLUE)
      .stroke();

    doc.fontSize(12).font('Helvetica-Bold').fillColor(ROYAL_BLUE);
    doc.text('Total TTC', totalsX, totalsY + 44);
    doc.text(amountEur + ' €', totalsX + 100, totalsY + 44, { width: 100, align: 'right' });

    // ── Badge paiement ───────────────────────────────────
    const payY = totalsY + 76;
    doc.roundedRect(margin, payY, contentWidth, 34, 4).fill(SWAN_WING);
    // Badge "Payé"
    doc.roundedRect(margin + 12, payY + 8, 42, 18, 10).fill('#2e7d4f');
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#FFFFFF')
      .text('Payé', margin + 17, payY + 12);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(SAPPHIRE)
      .text(
        'Paiement reçu par carte bancaire via Stancer le ' + dateStr + '.',
        margin + 62,
        payY + 11,
      );

    // ── Mentions légales ─────────────────────────────────
    const legalY = payY + 50;
    doc
      .moveTo(margin, legalY)
      .lineTo(margin + contentWidth, legalY)
      .lineWidth(0.5)
      .strokeColor(SHELLSTONE)
      .stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_MID);
    doc.text(
      'TVA non applicable, article 293 B du CGI.\n' +
        "Le droit de rétractation ne s'applique pas aux produits numériques dont l'exécution a commencé après accord préalable exprès du consommateur (article L. 221-28 du Code de la consommation).\n" +
        'Livraison : immédiate (téléchargement numérique).\n' +
        'Médiation de la consommation : CM2C — 49 rue de Ponthieu, 75 008 Paris — cm2c.net — litiges@cm2c.net',
      margin,
      legalY + 8,
      { width: contentWidth, lineGap: 2 },
    );

    // ── Pied de page (fond bleu royal) ───────────────────
    doc.rect(0, 780, pageWidth, 62).fill(ROYAL_BLUE);
    doc.fontSize(7.5).font('Helvetica').fillColor('#FFFFFF').opacity(0.7);
    doc.text(
      'Camille Reinhardt — Entrepreneur individuel — SIRET 103 644 050 00017 — APE 4791B',
      0,
      794,
      { width: pageWidth, align: 'center' },
    );
    doc.text('54A Rue des Écoles, 57700 Neufchef — c-reussite.fr', 0, 808, {
      width: pageWidth,
      align: 'center',
    });

    doc.end();
  });
}

/**
 * Génère un PDF de facture cours particuliers en mémoire.
 * Retourne une Promise<Buffer>.
 * @param {object} params
 * @param {string} params.invoiceNumber
 * @param {string} params.customerName
 * @param {string} params.customerAddress
 * @param {Array}  params.items - [{ description, hours, hourlyRate }]
 * @param {Date}   params.invoiceDate
 * @param {string} params.paymentDate   - ex: "07/05/2026"
 * @param {string} params.paymentMethod - ex: "Wero"
 */
function generateCpInvoice({ invoiceNumber, customerName, customerAddress, items, invoiceDate, paymentDate, paymentMethod }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const total = items.reduce((sum, item) => sum + item.hours * item.hourlyRate, 0);
    const totalStr = total.toFixed(2).replace('.', ',');
    const totalHours = items.reduce((sum, item) => sum + item.hours, 0);
    const dateStr = invoiceDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Résumé des paiements : regroupe par méthode, déduplique les dates
    const paymentsByMethod = {};
    items.forEach(item => {
      const m = item.paymentMethod || '';
      const d = item.paymentDate || '';
      if (m && d && !paymentsByMethod[m]) paymentsByMethod[m] = [];
      if (m && d && !paymentsByMethod[m].includes(d)) paymentsByMethod[m].push(d);
    });
    // Fallback sur les infos au niveau de la facture
    if (Object.keys(paymentsByMethod).length === 0 && paymentMethod) {
      paymentsByMethod[paymentMethod] = paymentDate ? [paymentDate] : [];
    }
    const paymentText = Object.entries(paymentsByMethod).map(([method, dates]) => {
      if (dates.length === 0) return `Paiement reçu par ${method}.`;
      if (dates.length === 1) return `Paiement reçu par ${method} le ${dates[0]}.`;
      return `Paiements reçus par ${method} les ${dates.join(', ')}.`;
    }).join(' ');


    const pageWidth = 595.28;
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;

    // ── En-tête ──────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 90).fill(ROYAL_BLUE);
    try {
      const logoPath = path.join(__dirname, '../assets/logo.jpeg');
      doc.image(logoPath, margin, 15, { width: 60, height: 60 });
    } catch (_) {}
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#FFFFFF').text("C'Réussite", margin + 72, 38);
    doc.fontSize(24).font('Helvetica-Bold').fillColor(QUICKSAND).text('FACTURE', pageWidth - margin - 150, 30, { width: 150, align: 'right' });

    // ── Barre meta ───────────────────────────────────────────
    const clientX = pageWidth / 2 + 20;
    doc.rect(0, 90, pageWidth, 34).fill(SWAN_WING);
    doc.rect(0, 90, pageWidth, 2).fill(QUICKSAND);
    doc.fontSize(9).font('Helvetica').fillColor(SAPPHIRE);
    // N° facture aligné avec VENDEUR (gauche), Date d'émission aligné avec CLIENT (droite)
    doc.font('Helvetica-Bold').text('N° facture :', margin, 103, { continued: true }).font('Helvetica').text(' ' + invoiceNumber);
    doc.font('Helvetica-Bold').text("Date d'émission :", clientX, 103, { continued: true }).font('Helvetica').text(' ' + dateStr);

    // ── Vendeur / Client ─────────────────────────────────────
    const partiesY = 164;

    doc.fontSize(8).font('Helvetica-Bold').fillColor(QUICKSAND).text('VENDEUR', margin, partiesY);
    doc.moveTo(margin, partiesY + 12).lineTo(margin + 60, partiesY + 12).lineWidth(1.5).strokeColor(QUICKSAND).stroke();
    doc.fontSize(12).font('Helvetica-Bold').fillColor(ROYAL_BLUE).text('Camille Reinhardt EI', margin, partiesY + 20);
    doc.fontSize(9).font('Helvetica').fillColor(TEXT_MID)
      .text("C'Réussite", margin, partiesY + 36)
      .text('54A Rue des Écoles', margin, partiesY + 48)
      .text('57700 Neufchef', margin, partiesY + 60)
      .text('SIRET : 103 644 050 00017', margin, partiesY + 72)
      .text('APE : 4791B', margin, partiesY + 84)
      .text('c-reussite.fr', margin, partiesY + 96);

    doc.fontSize(8).font('Helvetica-Bold').fillColor(QUICKSAND).text('CLIENT', clientX, partiesY);
    doc.moveTo(clientX, partiesY + 12).lineTo(clientX + 50, partiesY + 12).lineWidth(1.5).strokeColor(QUICKSAND).stroke();
    doc.fontSize(12).font('Helvetica-Bold').fillColor(ROYAL_BLUE).text(customerName, clientX, partiesY + 20);
    if (customerAddress) {
      const addressLines = customerAddress.split(/\n|(?<=\D),\s*(?=\d{5})/);
      doc.fontSize(9).font('Helvetica').fillColor(TEXT_MID);
      addressLines.forEach((line, i) => doc.text(line.trim(), clientX, partiesY + 36 + i * 14));
    }

    // ── Tableau ──────────────────────────────────────────────
    const tableTop = partiesY + 130;
    const colDesignation = margin;
    const colHeures      = margin + contentWidth * 0.55;
    const colTarif       = margin + contentWidth * 0.68;
    const colTotal       = margin + contentWidth * 0.85;

    doc.rect(margin, tableTop, contentWidth, 24).fill(SAPPHIRE);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
    doc.text('DÉSIGNATION', colDesignation + 8, tableTop + 7);
    doc.text('HEURES', colHeures, tableTop + 7, { width: 40, align: 'right' });
    doc.text('TARIF HORAIRE', colTarif, tableTop + 7, { width: 70, align: 'right' });
    doc.text('TOTAL HT', colTotal, tableTop + 7, { width: 70, align: 'right' });

    // Calcul dynamique de la hauteur de ligne pour tenir sur une page
    // Espace dispo pour les lignes : footer(780) - tableTop - header(24) - totalHeures(22) - sections bas(≈230)
    const MAX_ROW_AREA = 780 - tableTop - 24 - 22 - 230;
    const maxRowH = Math.floor(MAX_ROW_AREA / items.length);
    const BASE_ROW_H = Math.min(30, maxRowH);
    const PMT_ROW_H  = Math.min(36, maxRowH);
    const showSubText = maxRowH >= 28;

    let rowY = tableTop + 24;
    items.forEach((item) => {
      const lineTotal = item.hours * item.hourlyRate;
      const hasPmt = showSubText && !!(item.paymentMethod && item.paymentDate);
      const rowHeight = hasPmt ? PMT_ROW_H : BASE_ROW_H;

      doc.fontSize(9).font('Helvetica').fillColor('#1A1A2E');
      doc.text(item.description, colDesignation + 8, rowY + 8);
      if (hasPmt) {
        doc.fontSize(7.5).font('Helvetica').fillColor(SAPPHIRE)
          .text('Paiement : ' + item.paymentMethod + ' le ' + item.paymentDate, colDesignation + 8, rowY + 21);
      }
      doc.fontSize(9).font('Helvetica').fillColor('#1A1A2E');
      doc.text(String(item.hours), colHeures, rowY + 8, { width: 40, align: 'right' });
      doc.text(item.hourlyRate.toFixed(2).replace('.', ',') + ' €', colTarif, rowY + 8, { width: 70, align: 'right' });
      doc.text(lineTotal.toFixed(2).replace('.', ',') + ' €', colTotal, rowY + 8, { width: 70, align: 'right' });
      doc.moveTo(margin, rowY + rowHeight - 4).lineTo(margin + contentWidth, rowY + rowHeight - 4).lineWidth(0.5).strokeColor(SHELLSTONE).stroke();
      rowY += rowHeight;
    });

    // ── Ligne récapitulatif heures ────────────────────────────
    doc.rect(margin, rowY, contentWidth, 22).fill(SWAN_WING);
    doc.fontSize(8).font('Helvetica').fillColor(SAPPHIRE).text('Total heures :', colDesignation + 8, rowY + 7);
    doc.font('Helvetica-Bold').text(totalHours + ' h', colHeures, rowY + 7, { width: 40, align: 'right' });
    rowY += 22;

    // ── Totaux ───────────────────────────────────────────────
    const totalsX = margin + contentWidth - 200;
    const totalsY = rowY + 14;
    doc.fontSize(9).font('Helvetica').fillColor(TEXT_MID);
    doc.text('Sous-total HT', totalsX, totalsY);
    doc.text(totalStr + ' €', totalsX + 100, totalsY, { width: 100, align: 'right' });
    doc.text('TVA', totalsX, totalsY + 18);
    doc.text('0,00 €', totalsX + 100, totalsY + 18, { width: 100, align: 'right' });
    doc.moveTo(totalsX, totalsY + 36).lineTo(totalsX + 200, totalsY + 36).lineWidth(1.5).strokeColor(ROYAL_BLUE).stroke();
    doc.fontSize(12).font('Helvetica-Bold').fillColor(ROYAL_BLUE);
    doc.text('Total TTC', totalsX, totalsY + 44);
    doc.text(totalStr + ' €', totalsX + 100, totalsY + 44, { width: 100, align: 'right' });

    // ── Badge paiement ───────────────────────────────────────
    const payY = totalsY + 56;
    const badgeW = paymentText ? contentWidth : 80;
    doc.roundedRect(margin, payY, badgeW, 30, 4).fill(SWAN_WING);
    doc.roundedRect(margin + 12, payY + 6, 42, 18, 10).fill('#2e7d4f');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF').text('Payé', margin + 17, payY + 10);
    if (paymentText) {
      doc.fontSize(9).font('Helvetica').fillColor(SAPPHIRE)
        .text(paymentText, margin + 62, payY + 10, { width: contentWidth - 74, lineBreak: false });
    }

    // ── Mentions légales ─────────────────────────────────────
    const legalY = payY + 38;
    doc.moveTo(margin, legalY).lineTo(margin + contentWidth, legalY).lineWidth(0.5).strokeColor(SHELLSTONE).stroke();
    doc.fontSize(6.5).font('Helvetica').fillColor(TEXT_MID).text(
      'TVA non applicable, article 293 B du CGI.\n' +
      'Médiation de la consommation : CM2C — 49 rue de Ponthieu, 75 008 Paris — cm2c.net — litiges@cm2c.net\n' +
      "Date d'échéance : à réception de facture.\n" +
      "Pas d'escompte pour paiement anticipé.\n" +
      "Tout retard de paiement (au-delà d'une semaine) entraîne des pénalités de retard au taux de 3 fois le taux d'intérêt légal en vigueur, exigibles le jour suivant la date d'échéance, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 €.",
      margin, legalY + 6, { width: contentWidth, lineGap: 1 }
    );

    // ── Pied de page ─────────────────────────────────────────
    doc.rect(0, 780, pageWidth, 62).fill(ROYAL_BLUE);
    doc.fontSize(7.5).font('Helvetica').fillColor('#FFFFFF').opacity(0.7);
    doc.text('Camille Reinhardt — Entrepreneur individuel — SIRET 103 644 050 00017 — APE 4791B', 0, 794, { width: pageWidth, align: 'center' });
    doc.text('54A Rue des Écoles, 57700 Neufchef — c-reussite.fr', 0, 808, { width: pageWidth, align: 'center' });

    doc.end();
  });
}

module.exports = { generateInvoice, generateCpInvoice };
