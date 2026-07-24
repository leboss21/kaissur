import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReceiptPDF = (receiptData: any, isReprint: boolean = false) => {
  const { receipt, sourceData, entreprise } = receiptData;

  if (!receipt || !sourceData) {
    console.error('Receipt data is incomplete:', receiptData);
    alert('Données du reçu incomplètes. Impossible de générer le PDF.');
    return;
  }

  const doc = new jsPDF({ format: 'a5', orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Header ─────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // dark background band
  doc.rect(0, 0, pageWidth, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(entreprise?.name || 'Entreprise', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 220);
  let headerY = 23;
  if (entreprise?.address) { doc.text(entreprise.address, pageWidth / 2, headerY, { align: 'center' }); headerY += 6; }
  if (entreprise?.phone) { doc.text(`Tél : ${entreprise.phone}`, pageWidth / 2, headerY, { align: 'center' }); headerY += 6; }
  if (entreprise?.email) { doc.text(entreprise.email, pageWidth / 2, headerY, { align: 'center' }); headerY += 6; }
  if (entreprise?.taxId) { doc.text(`NIF : ${entreprise.taxId}`, pageWidth / 2, headerY, { align: 'center' }); }

  // ── Receipt title band ──────────────────────────────────────
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 50, pageWidth, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const title = isReprint ? `DUPLICATA – REÇU N° ${receipt.receiptNumber}` : `REÇU N° ${receipt.receiptNumber}`;
  doc.text(title, pageWidth / 2, 59, { align: 'center' });

  // ── Meta info ───────────────────────────────────────────────
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let metaY = 74;
  doc.text(`Date d'émission :`, 14, metaY);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(receipt.createdAt).toLocaleString('fr-FR'), 60, metaY);
  doc.setFont('helvetica', 'normal');
  metaY += 6;
  doc.text(`Caissier :`, 14, metaY);
  doc.setFont('helvetica', 'bold');
  doc.text(sourceData?.user?.name || 'Inconnu', 60, metaY);
  doc.setFont('helvetica', 'normal');
  if (sourceData?.client) {
    metaY += 6;
    doc.text(`Client :`, 14, metaY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sourceData.client.firstName} ${sourceData.client.lastName}`, 60, metaY);
    doc.setFont('helvetica', 'normal');
  }

  // ── Separator ───────────────────────────────────────────────
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(14, metaY + 5, pageWidth - 14, metaY + 5);

  // ── Transaction details ─────────────────────────────────────
  const startY = metaY + 10;
  let bodyData: any[] = [];
  let sectionTitle = 'Détails';

  if (receipt.sourceType === 'EXCHANGE') {
    sectionTitle = '💱 Opération de Change';
    const margin = sourceData.notes ? JSON.parse(sourceData.notes || '{}')?.margin : null;
    bodyData = [
      ['Devise remise', `${(sourceData.amountIn || 0).toLocaleString('fr-FR')} ${sourceData.fromCurrencyCode}`],
      ['Taux appliqué', `${sourceData.exchangeRate}`],
      ['Devise reçue', `${(sourceData.amountOut || 0).toLocaleString('fr-FR')} ${sourceData.toCurrencyCode}`],
      ['Statut', sourceData.status === 'COMPLETED' ? 'Validée ✓' : sourceData.status],
    ];
  } else if (receipt.sourceType === 'TICKET') {
    sectionTitle = '✈️  Billet d\'Avion';
    const airlineLabels: Record<string, string> = {
      ASKY: 'Asky Airlines', AIR_FRANCE: 'Air France', ETHIOPIAN: 'Ethiopian Airlines',
      AIR_COTE_D_IVOIRE: "Air Côte d'Ivoire", ROYAL_AIR_MAROC: 'Royal Air Maroc',
      BRUSSELS_AIRLINES: 'Brussels Airlines', OTHER: 'Autre',
    };
    bodyData = [
      ['Compagnie', airlineLabels[sourceData.airline] || sourceData.airline || '-'],
      ['Passager', sourceData.passengerName || '-'],
      ['Trajet', `${sourceData.departure || '-'} → ${sourceData.destination || '-'}`],
      ['Date du vol', sourceData.flightDate || '-'],
      ['N° de vol', sourceData.flightNumber || '-'],
      ['Prix de vente', `${(sourceData.amount || 0).toLocaleString('fr-FR')} XOF`],
      ['Commission', `${(sourceData.commission || 0).toLocaleString('fr-FR')} XOF`],
    ];
  }

  // Section title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(sectionTitle, 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, fillColor: false },
      1: { cellWidth: 'auto' }
    },
    body: bodyData,
    margin: { left: 14, right: 14 },
  });

  // ── Total band ──────────────────────────────────────────────
  const tableEndY = (doc as any).lastAutoTable.finalY;
  const totalAmount = receipt.sourceType === 'EXCHANGE'
    ? `${(sourceData.amountOut || 0).toLocaleString('fr-FR')} ${sourceData.toCurrencyCode}`
    : `${(sourceData.amount || 0).toLocaleString('fr-FR')} XOF`;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, tableEndY + 6, pageWidth - 28, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 22, tableEndY + 15);
  doc.text(totalAmount, pageWidth - 18, tableEndY + 15, { align: 'right' });

  // ── Footer ──────────────────────────────────────────────────
  doc.setTextColor(120, 140, 160);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Merci de votre confiance !', pageWidth / 2, tableEndY + 28, { align: 'center' });
  doc.text('Ce document est une preuve de transaction.', pageWidth / 2, tableEndY + 34, { align: 'center' });

  // ── DUPLICATA watermark (LAST, semi-transparent) ────────────
  if (isReprint) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
    doc.setTextColor(255, 0, 0);
    doc.setFontSize(58);
    doc.setFont('helvetica', 'bold');
    doc.text('DUPLICATA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();

    // Red banner at top
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, 4, pageHeight, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DUPLICATA', 14, tableEndY + 42);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 120, 140);
    doc.text(`Réimpression effectuée le ${new Date().toLocaleString('fr-FR')}`, 14, tableEndY + 48);
  }

  // ── Save ────────────────────────────────────────────────────
  const filename = isReprint
    ? `Duplicata_${receipt.receiptNumber}.pdf`
    : `Recu_${receipt.receiptNumber}.pdf`;
  doc.save(filename);
};
