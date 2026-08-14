import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtNum = (n: number | string) => {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num) || num === null || num === undefined) return '0';
  return num.toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' ');
};

// ── Number-to-French-words conversion ──────────────────────────
const ONES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

const belowThousand = (n: number): string => {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (t === 7) return 'soixante-' + ONES[10 + o];
    if (t === 9) return 'quatre-vingt-' + (o === 0 ? '' : ONES[o]);
    const sep = (t === 8 && o === 0) ? '' : (o === 1 && t !== 8) ? '-et-' : o === 0 ? '' : '-';
    return TENS[t] + sep + ONES[o];
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const suffix = rest === 0 ? '' : '-' + belowThousand(rest);
  return (h === 1 ? 'cent' : ONES[h] + '-cent') + suffix;
};

const numberToLetters = (amount: number): string => {
  if (isNaN(amount) || amount < 0) return '';
  const n = Math.round(amount);
  if (n === 0) return 'zéro';
  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;
  if (billions) parts.push(belowThousand(billions) + ' milliard' + (billions > 1 ? 's' : ''));
  if (millions) parts.push(belowThousand(millions) + ' million' + (millions > 1 ? 's' : ''));
  if (thousands === 1) parts.push('mille');
  else if (thousands > 1) parts.push(belowThousand(thousands) + '-mille');
  if (remainder) parts.push(belowThousand(remainder));
  const result = parts.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

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
  doc.text(new Date(receipt.createdAt).toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' '), 60, metaY);
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
    sectionTitle = 'Opération de Change';
    bodyData = [
      ['Devise remise', `${fmtNum(sourceData.amountIn)} ${sourceData.fromCurrencyCode}`],
      ['Taux appliqué', `${sourceData.exchangeRate}`],
      ['Devise reçue', `${fmtNum(sourceData.amountOut)} ${sourceData.toCurrencyCode}`],
      ['Statut', sourceData.status === 'COMPLETED' ? 'Validee - OK' : sourceData.status],
    ];
  } else if (receipt.sourceType === 'MOBILE_MONEY') {
    sectionTitle = 'Mobile Money';
    bodyData = [
      ['Opérateur', sourceData.provider || '-'],
      ['Type', sourceData.subType === 'DEPOSIT' ? 'Dépôt' : 'Retrait'],
      ['Numéro', sourceData.phone || '-'],
      ['Montant', `${fmtNum(sourceData.amount)} XOF`],
      ['Référence', sourceData.reference || '-'],
      ['Statut', sourceData.status === 'COMPLETED' ? 'Validee - OK' : sourceData.status],
    ];
  } else if (receipt.sourceType === 'CREDIT') {
    sectionTitle = 'Crédit de Communication';
    bodyData = [
      ['Opérateur', sourceData.provider || '-'],
      ['Numéro', sourceData.phone || '-'],
      ['Montant', `${fmtNum(sourceData.amount)} XOF`],
      ['Statut', sourceData.status === 'COMPLETED' ? 'Validee - OK' : sourceData.status],
    ];
  } else if (receipt.sourceType === 'TICKET') {
    sectionTitle = 'Billet d\'Avion';
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
      ['Prix de vente', `${fmtNum(sourceData.amount)} XOF`],
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
    ? `${fmtNum(sourceData.amountOut)} ${sourceData.toCurrencyCode}`
    : `${fmtNum(sourceData.amount)} XOF`;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, tableEndY + 6, pageWidth - 28, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 22, tableEndY + 15);
  doc.text(totalAmount, pageWidth - 18, tableEndY + 15, { align: 'right' });

  // ── Amount in letters ───────────────────────────────────────
  const rawAmount = receipt.sourceType === 'EXCHANGE'
    ? parseFloat(sourceData.amountOut)
    : parseFloat(sourceData.amount);
  const amountLetters = numberToLetters(rawAmount);
  const amountLettersLine = `Arrêté le présent reçu à la somme de ${amountLetters} francs CFA.`;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const splitLetters = doc.splitTextToSize(amountLettersLine, pageWidth - 28);
  doc.text(splitLetters, 14, tableEndY + 26);
  const lettersHeight = splitLetters.length * 4.5;

  // ── Thank-you line ──────────────────────────────────────────
  doc.setTextColor(120, 140, 160);
  doc.setFont('helvetica', 'italic');
  doc.text('Merci de votre confiance !', pageWidth / 2, tableEndY + 26 + lettersHeight + 4, { align: 'center' });
  doc.text('Ce document est une preuve de transaction.', pageWidth / 2, tableEndY + 26 + lettersHeight + 9, { align: 'center' });

  // ── Company footer (right-aligned) ─────────────────────────
  const footerY = pageHeight - 10;
  doc.setTextColor(100, 120, 140);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${entreprise?.name || 'ExchangeOS'}     Service Comptabilité`, pageWidth - 14, footerY, { align: 'right' });


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
