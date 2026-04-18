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
    doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.7)');
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

module.exports = { generateInvoice };
