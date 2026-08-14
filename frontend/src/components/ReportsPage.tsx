import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import type { DailyReport } from '../lib/api';
import { Download, FileText, AlertCircle, CheckCircle2, Lock, Search, Eye, User, ChevronLeft, ChevronRight, Calendar, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_SIZE = 5;

export const ReportsPage = () => {
  const { user } = useAuth();
  const isCashier = user?.role === 'CASHIER';
  const isDirecteur = user?.role === 'DIRECTEUR';
  const isAdmin = user?.role === 'ADMIN';
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Quick View Modal
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

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
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    if (!isCashier) {
      setErrorMsg('Seul un caissier peut générer un rapport journalier de caisse.');
      return;
    }
    setGenerating(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.generateReport();
      setSuccessMsg('Nouveau rapport journalier généré avec succès !');
      await fetchReports();
    } catch (e: any) {
      setErrorMsg(e.message || 'Impossible de générer le rapport.');
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

  const fmtNum = (n: number | string) => {
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(num) || num === null || num === undefined) return '0';
    return num.toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' ');
  };

  const getGeneratorName = (r: DailyReport) => {
    if (r.generatedByName) return r.generatedByName;
    const parsed = parseReportData(r);
    return parsed?.summary?.generatedBy || 'Caissier';
  };

  const exportExcel = (r: DailyReport) => {
    const parsed = parseReportData(r);
    const generator = getGeneratorName(r);
    const wb = utils.book_new();

    // Feuille 1: Résumé Global
    const summaryData = [
      ['RAPPORT JOURNALIER DU', new Date(r.date).toLocaleDateString('fr-FR')],
      ['GÉNÉRÉ PAR', generator],
      ['DATE DE GÉNÉRATION', new Date(r.createdAt).toLocaleString('fr-FR')],
      [''],
      ['KPI / Métrique', 'Valeur (XOF)'],
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

    writeFile(wb, `Rapport_${generator.replace(/\s+/g, '_')}_${new Date(r.date).toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = (r: DailyReport) => {
    const parsed = parseReportData(r);
    const generator = getGeneratorName(r);
    const doc = new jsPDF();
    const dateStr = new Date(r.date).toLocaleDateString('fr-FR').replace(/[\u00A0\u202F]/g, ' ');

    doc.setFontSize(16);
    doc.text(`Rapport Financier Journalier - ${dateStr}`, 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${new Date(r.createdAt).toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' ')} par : ${generator}`, 14, 25);
    doc.setTextColor(0);

    // Tableau 1: Résumé Synthétique
    autoTable(doc, {
      startY: 30,
      head: [['Métrique Principale', 'Montant (XOF)']],
      body: [
        ['Généré Par', generator],
        ['Entrées Change', `${fmtNum(r.totalExchangeIn)} XOF`],
        ['Sorties Change', `${fmtNum(r.totalExchangeOut)} XOF`],
        ['Mobile Money (Dépôts)', `${fmtNum(r.totalMobileMoneyDeposits ?? 0)} XOF`],
        ['Mobile Money (Retraits)', `${fmtNum(r.totalMobileMoneyWithdrawals ?? 0)} XOF`],
        ['Crédit de Communication', `${fmtNum(r.totalCredit)} XOF`],
        ['Billetterie (Ventes)', `${fmtNum(r.totalTickets)} XOF`],
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
        `${fmtNum(item.deposits || 0)} XOF`,
        `${fmtNum(item.withdrawals || 0)} XOF`,
        `${fmtNum(item.total || 0)} XOF`,
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
        `${fmtNum(item.total || 0)} XOF`,
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
        `${fmtNum(item.total || 0)} XOF`,
        `${fmtNum(item.commission || 0)} XOF`,
        item.count || 0
      ]);
      autoTable(doc, {
        startY: currentY + 4,
        head: [['Compagnie', 'Ventes', 'Commission', 'Nbr Billets']],
        body: ticketRows,
        headStyles: { fillColor: [168, 85, 247] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tableau 5: Détails des Transactions de Change GROUPÉES PAR DEVISE
    if (parsed?.transactions && parsed.transactions.length > 0) {
      doc.setFontSize(12);
      doc.text('Détail des Échanges (Groupé par Devise)', 14, currentY);
      currentY += 6;

      const grouped: Record<string, any[]> = {};
      parsed.transactions.forEach((t: any) => {
        const pair = `${t.fromCurrencyCode} → ${t.toCurrencyCode}`;
        if (!grouped[pair]) grouped[pair] = [];
        grouped[pair].push(t);
      });

      Object.entries(grouped).forEach(([pair, txns]) => {
        const totalIn = txns.reduce((s, t) => s + (t.amountIn || 0), 0);
        const totalOut = txns.reduce((s, t) => s + (t.amountOut || 0), 0);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Paire ${pair} (${txns.length} op. | Total Remis: ${fmtNum(totalIn)} | Total Reçu: ${fmtNum(totalOut)})`, 14, currentY);

        const txnRows = txns.map((t: any) => [
          new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          t.type === 'BUY' ? 'Achat' : t.type === 'SELL' ? 'Vente' : 'Échange',
          `${fmtNum(t.amountIn)} ${t.fromCurrencyCode}`,
          t.exchangeRate,
          `${fmtNum(t.amountOut)} ${t.toCurrencyCode}`,
          t.client ? `${t.client.firstName} ${t.client.lastName}` : 'Anonyme'
        ]);

        autoTable(doc, {
          startY: currentY + 2,
          head: [['Heure', 'Type', 'Montant Remis', 'Taux', 'Montant Reçu', 'Client']],
          body: txnRows,
          headStyles: { fillColor: [16, 185, 129] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      });
    }

    doc.save(`Rapport_${new Date(r.date).toISOString().slice(0, 10)}.pdf`);
  };

  // Filter & Paginate Reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const generator = getGeneratorName(r).toLowerCase();
      const dateStr = new Date(r.date).toLocaleDateString('fr-FR').toLowerCase();
      const term = searchTerm.toLowerCase();
      return generator.includes(term) || dateStr.includes(term) || r.id.toLowerCase().includes(term);
    });
  }, [reports, searchTerm, user]);

  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE) || 1;
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, currentPage]);

  if (loading) return <div className="p-8 text-white">Chargement des rapports...</div>;

  const latestReport = reports[0];
  const totalVolume = reports.reduce((s, r) => s + r.totalExchangeIn + (r.totalMobileMoneyDeposits || 0) + r.totalCredit + r.totalTickets, 0);

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Rapports Financiers Journaliers</h2>
          <p className="text-textMuted mt-1">
            {isDirecteur || isAdmin ? 'Consultation, analyse et exportation' : 'Génération, aperçu et exportation des rapports de caisse'}
          </p>
        </div>
        {isCashier ? (
          <button onClick={handleGenerate} disabled={generating} className="btn-primary flex items-center gap-2 py-3 px-5 text-base shadow-lg shadow-primary/20">
            <FileText className="w-5 h-5" /> {generating ? 'Génération en cours...' : 'Générer le rapport du jour'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Lock className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Mode Consultation</span>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
        </div>
      )}

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted text-sm font-medium">Rapports archivés</span>
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-white">{reports.length}</div>
          <p className="text-xs text-textMuted mt-1">Sessions clôturées enregistrées</p>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted text-sm font-medium">Volume Global Cumulé</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{fmtNum(totalVolume)} FCFA</div>
          <p className="text-xs text-textMuted mt-1">Transactions et opérations de services</p>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted text-sm font-medium">Dernier Générateur</span>
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white truncate">
            {latestReport ? getGeneratorName(latestReport) : 'Aucun'}
          </div>
          <p className="text-xs text-textMuted mt-1">
            {latestReport ? `Le ${new Date(latestReport.createdAt).toLocaleDateString('fr-FR')}` : 'Aucun rapport généré'}
          </p>
        </div>
      </div>

      {/* Main List Panel */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Historique des Rapports ({filteredReports.length})
          </h3>

          {/* Search bar */}
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input
              type="text"
              className="glass-input w-full pl-10 text-sm"
              placeholder="Rechercher par agent, date..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-textMuted bg-white/5 rounded-xl border border-white/10">
            Aucun rapport ne correspond à la recherche.
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedReports.map((r) => {
              const generator = getGeneratorName(r);
              const dateStr = new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const timeStr = new Date(r.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="capitalize text-lg font-bold text-white">{dateStr}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Validé
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-textMuted">
                      <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-white font-medium">{generator}</span>
                      </div>
                      <span>Généré à {timeStr}</span>
                    </div>

                    {/* Quick Metrics Badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Change: {fmtNum(r.totalExchangeIn)} XOF
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                        Mobile Money: {fmtNum(r.totalMobileMoneyDeposits ?? 0)} XOF
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        Crédits: {fmtNum(r.totalCredit)} XOF
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        Billets: {fmtNum(r.totalTickets)} XOF
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setSelectedReport(r)}
                      className="btn-ghost text-xs flex items-center gap-1.5 px-3.5 py-2 border border-white/10 hover:bg-white/10"
                      title="Aperçu rapide du rapport"
                    >
                      <Eye className="w-4 h-4 text-primary" /> Aperçu
                    </button>
                    <button
                      onClick={() => exportPDF(r)}
                      className="btn-ghost text-xs flex items-center gap-1.5 px-3.5 py-2 border border-white/10 hover:bg-white/10 text-emerald-400 hover:text-emerald-300"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </button>
                    <button
                      onClick={() => exportExcel(r)}
                      className="btn-ghost text-xs flex items-center gap-1.5 px-3.5 py-2 border border-white/10 hover:bg-white/10 text-blue-400 hover:text-blue-300"
                    >
                      <Download className="w-4 h-4" /> Excel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-textMuted text-sm">
              Page {currentPage} sur {totalPages} ({filteredReports.length} rapports au total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="btn-ghost p-2 disabled:opacity-30 border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="btn-ghost p-2 disabled:opacity-30 border border-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  Rapport du {new Date(selectedReport.date).toLocaleDateString('fr-FR')}
                </h3>
                <p className="text-sm text-textMuted mt-1">
                  Généré par <strong className="text-white">{getGeneratorName(selectedReport)}</strong> le {new Date(selectedReport.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="btn-ghost p-2 text-textMuted hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-xs text-textMuted">Entrées Change</span>
                <div className="text-lg font-bold text-white mt-1">{fmtNum(selectedReport.totalExchangeIn)} XOF</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-xs text-textMuted">Sorties Change</span>
                <div className="text-lg font-bold text-white mt-1">{fmtNum(selectedReport.totalExchangeOut)} XOF</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-xs text-textMuted">Dépôts Mobile Money</span>
                <div className="text-lg font-bold text-yellow-400 mt-1">{fmtNum(selectedReport.totalMobileMoneyDeposits ?? 0)} XOF</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-xs text-textMuted">Retraits Mobile Money</span>
                <div className="text-lg font-bold text-yellow-400 mt-1">{fmtNum(selectedReport.totalMobileMoneyWithdrawals ?? 0)} XOF</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-xs text-textMuted">Ventes Crédits</span>
                <div className="text-lg font-bold text-blue-400 mt-1">{fmtNum(selectedReport.totalCredit)} XOF</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-xs text-textMuted">Ventes Billets</span>
                <div className="text-lg font-bold text-purple-400 mt-1">{fmtNum(selectedReport.totalTickets)} XOF</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button onClick={() => exportPDF(selectedReport)} className="btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" /> Télécharger PDF Complète
              </button>
              <button onClick={() => exportExcel(selectedReport)} className="btn-ghost flex items-center gap-2 border border-white/10">
                <Download className="w-4 h-4" /> Export Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
