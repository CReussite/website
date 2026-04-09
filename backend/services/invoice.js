const PDFDocument = require('pdfkit');

/**
 * Génère un PDF de facture en mémoire.
 * Retourne une Promise<Buffer>.
 */
function generateInvoice({ invoiceNumber, email, productName, amount, date }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const amountEur = (amount / 100).toFixed(2).replace('.', ',');
    const dateStr = new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // ── En-tête ──────────────────────────────────────────
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text("C'Réussite", 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('contact@c-reussite.fr', 50, 75)
      .text('c-reussite.fr', 50, 90);

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('FACTURE', 400, 50, { align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`N° ${invoiceNumber}`, 400, 75, { align: 'right' })
      .text(`Date : ${dateStr}`, 400, 90, { align: 'right' });

    // ── Ligne séparatrice ─────────────────────────────────
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#cccccc').stroke();

    // ── Client ────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Facturé à :', 50, 140);

    doc
      .font('Helvetica')
      .text(email, 50, 158);

    // ── Tableau produit ───────────────────────────────────
    const tableTop = 220;

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#000000')
      .text('Désignation', 50, tableTop)
      .text('Prix TTC', 450, tableTop, { align: 'right', width: 95 });

    doc.moveTo(50, tableTop + 18).lineTo(545, tableTop + 18).strokeColor('#cccccc').stroke();

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(productName, 50, tableTop + 26)
      .text(`${amountEur} €`, 450, tableTop + 26, { align: 'right', width: 95 });

    doc.moveTo(50, tableTop + 48).lineTo(545, tableTop + 48).strokeColor('#cccccc').stroke();

    // ── Total ─────────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .text('Total TTC', 350, tableTop + 58)
      .text(`${amountEur} €`, 450, tableTop + 58, { align: 'right', width: 95 });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#666666')
      .text('TVA non applicable – article 293 B du CGI', 50, tableTop + 58);

    // ── Pied de page ──────────────────────────────────────
    doc
      .fontSize(9)
      .fillColor('#999999')
      .text(
        "C'Réussite — Auto-entrepreneur — Facture acquittée",
        50, 750,
        { align: 'center', width: 495 }
      );

    doc.end();
  });
}

module.exports = { generateInvoice };
