import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { DailyReport } from '../lib/api';
import { Download, FileText } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const ReportsPage = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setSuccessMsg('');
    try {
      await api.generateReport();
      setSuccessMsg('Nouveau rapport journalier généré et enregistré dans l\'historique !');
      await fetchReports();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const parseReportData = (r: DailyReport) => {
    if (!r.reportData) return null;
    try {
      return JSON.parse(r.reportData);
    } catch {
      return null;
    }
  };

  const exportExcel = (r: DailyReport) => {
    const parsed = parseReportData(r);
    const wb = utils.book_new();

    // Feuille 1: Résumé Global
    const summaryData = [
      ['RAPPORT JOURNALIER DU', new Date(r.date).toLocaleDateString('fr-FR')],
      [''],
      ['KPI', 'Valeur (XOF)'],
      ['Entrées Change', r.totalExchangeIn],
      ['Sorties Change', r.totalExchangeOut],
      ['Mobile Money (Dépôts)', r.totalMobileMoneyDeposits ?? 0],
      ['Mobile Money (Retraits)', r.totalMobileMoneyWithdrawals ?? 0],
      ['Crédit de Communication', r.totalCredit],
      ['Billetterie (Ventes)', r.totalTickets],
    ];
    if (parsed?.summary?.totalFeesCollected) {
      summaryData.push(['Frais Collectés', parsed.summary.totalFeesCollected]);
    }
    if (parsed?.summary?.totalCommissionTickets) {
      summaryData.push(['Commissions Billets', parsed.summary.totalCommissionTickets]);
    }
    const wsSummary = utils.aoa_to_sheet(summaryData);
    utils.book_append_sheet(wb, wsSummary, "Résumé");

    // Feuille 2: Mobile Money par Opérateur
    if (parsed?.breakdown?.mobileMoneyByProvider) {
      const mmData = [['Opérateur', 'Dépôts (XOF)', 'Retraits (XOF)', 'Total (XOF)', 'Nombre Op.']];
      Object.entries(parsed.breakdown.mobileMoneyByProvider).forEach(([prov, item]: [string, any]) => {
        mmData.push([prov, item.deposits || 0, item.withdrawals || 0, item.total || 0, item.count || 0]);
      });
      const wsMM = utils.aoa_to_sheet(mmData);
      utils.book_append_sheet(wb, wsMM, "Mobile Money");
    }

    // Feuille 3: Crédit par Opérateur
    if (parsed?.breakdown?.creditByProvider) {
      const creditData = [['Opérateur', 'Montant Total (XOF)', 'Nombre Op.']];
      Object.entries(parsed.breakdown.creditByProvider).forEach(([prov, item]: [string, any]) => {
        creditData.push([prov, item.total || 0, item.count || 0]);
      });
      const wsCredit = utils.aoa_to_sheet(creditData);
      utils.book_append_sheet(wb, wsCredit, "Crédit");
    }

    // Feuille 4: Billetterie par Compagnie
    if (parsed?.breakdown?.ticketsByAirline) {
      const ticketData = [['Compagnie', 'Ventes (XOF)', 'Commission (XOF)', 'Nombre Billets']];
      Object.entries(parsed.breakdown.ticketsByAirline).forEach(([airline, item]: [string, any]) => {
        ticketData.push([airline, item.total || 0, item.commission || 0, item.count || 0]);
      });
      const wsTicket = utils.aoa_to_sheet(ticketData);
      utils.book_append_sheet(wb, wsTicket, "Billetterie");
    }

    // Feuille 5: Transactions de Change détaillées
    if (parsed?.transactions && parsed.transactions.length > 0) {
      const txnData = [['Date / Heure', 'Type', 'Paire', 'Montant Remis', 'Taux', 'Montant Reçu']];
      parsed.transactions.forEach((t: any) => {
        txnData.push([
          new Date(t.createdAt).toLocaleString('fr-FR'),
          t.type === 'BUY' ? 'Achat' : t.type === 'SELL' ? 'Vente' : 'Échange',
          `${t.fromCurrencyCode} → ${t.toCurrencyCode}`,
          t.amountIn,
          t.exchangeRate,
          t.amountOut
        ]);
      });
      const wsTxns = utils.aoa_to_sheet(txnData);
      utils.book_append_sheet(wb, wsTxns, "Transactions Change");
    }

    writeFile(wb, `Rapport_Detaillest_${new Date(r.date).toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = (r: DailyReport) => {
    const parsed = parseReportData(r);
    const doc = new jsPDF();
    const dateStr = new Date(r.date).toLocaleDateString('fr-FR');

    doc.setFontSize(16);
    doc.text(`Rapport Financier Journalier - ${dateStr}`, 14, 18);

    doc.setFontSize(10);
    doc.text(`Généré le ${new Date(r.createdAt).toLocaleString('fr-FR')}`, 14, 25);

    // Tableau 1: Résumé Synthétique
    autoTable(doc, {
      startY: 30,
      head: [['Métrique Principal', 'Montant (XOF)']],
      body: [
        ['Entrées Change', `${r.totalExchangeIn.toLocaleString('fr-FR')} XOF`],
        ['Sorties Change', `${r.totalExchangeOut.toLocaleString('fr-FR')} XOF`],
        ['Mobile Money (Dépôts)', `${(r.totalMobileMoneyDeposits ?? 0).toLocaleString('fr-FR')} XOF`],
        ['Mobile Money (Retraits)', `${(r.totalMobileMoneyWithdrawals ?? 0).toLocaleString('fr-FR')} XOF`],
        ['Crédit de Communication', `${r.totalCredit.toLocaleString('fr-FR')} XOF`],
        ['Billetterie (Ventes)', `${r.totalTickets.toLocaleString('fr-FR')} XOF`],
      ],
      headStyles: { fillColor: [37, 99, 235] }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Tableau 2: Mobile Money par Opérateur
    if (parsed?.breakdown?.mobileMoneyByProvider && Object.keys(parsed.breakdown.mobileMoneyByProvider).length > 0) {
      doc.setFontSize(12);
      doc.text('Ventilation Mobile Money par Opérateur', 14, currentY);
      const mmRows = Object.entries(parsed.breakdown.mobileMoneyByProvider).map(([prov, item]: [string, any]) => [
        prov,
        `${(item.deposits || 0).toLocaleString('fr-FR')} XOF`,
        `${(item.withdrawals || 0).toLocaleString('fr-FR')} XOF`,
        `${(item.total || 0).toLocaleString('fr-FR')} XOF`,
        item.count || 0
      ]);
      autoTable(doc, {
        startY: currentY + 4,
        head: [['Opérateur', 'Dépôts', 'Retraits', 'Total', 'Nbr Op.']],
        body: mmRows,
        headStyles: { fillColor: [234, 179, 8] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tableau 3: Crédit par Opérateur
    if (parsed?.breakdown?.creditByProvider && Object.keys(parsed.breakdown.creditByProvider).length > 0) {
      doc.setFontSize(12);
      doc.text('Ventilation Crédit par Opérateur', 14, currentY);
      const creditRows = Object.entries(parsed.breakdown.creditByProvider).map(([prov, item]: [string, any]) => [
        prov,
        `${(item.total || 0).toLocaleString('fr-FR')} XOF`,
        item.count || 0
      ]);
      autoTable(doc, {
        startY: currentY + 4,
        head: [['Opérateur', 'Montant Total', 'Nbr Op.']],
        body: creditRows,
        headStyles: { fillColor: [59, 130, 246] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tableau 4: Billetterie par Compagnie
    if (parsed?.breakdown?.ticketsByAirline && Object.keys(parsed.breakdown.ticketsByAirline).length > 0) {
      doc.setFontSize(12);
      doc.text('Ventilation Billetterie par Compagnie', 14, currentY);
      const ticketRows = Object.entries(parsed.breakdown.ticketsByAirline).map(([airline, item]: [string, any]) => [
        airline,
        `${(item.total || 0).toLocaleString('fr-FR')} XOF`,
        `${(item.commission || 0).toLocaleString('fr-FR')} XOF`,
        item.count || 0
      ]);
      autoTable(doc, {
        startY: currentY + 4,
        head: [['Compagnie', 'Ventes', 'Commission', 'Nbr Billets']],
        body: ticketRows,
        headStyles: { fillColor: [168, 85, 247] }
      });
    }

    doc.save(`Rapport_Detaillé_${new Date(r.date).toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <div className="p-8 text-white">Chargement...</div>;

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Rapports Financiers</h2>
          <p className="text-textMuted mt-1">Génération et Exportation</p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2">
          <FileText className="w-4 h-4" /> {generating ? 'Génération...' : 'Générer le rapport du jour'}
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="glass-panel p-6">
        <h3 className="text-xl font-bold text-white mb-6">Historique des Rapports</h3>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-textMuted">Aucun rapport généré.</div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <div>
                  <h4 className="text-white font-medium">Rapport du {new Date(r.date).toLocaleDateString()}</h4>
                  <p className="text-sm text-textMuted">Généré à {new Date(r.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => exportPDF(r)} className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-1.5">
                    <Download className="w-4 h-4" /> PDF
                  </button>
                  <button onClick={() => exportExcel(r)} className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-1.5">
                    <Download className="w-4 h-4" /> Excel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
