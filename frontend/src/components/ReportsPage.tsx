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

  const handleGenerate = async () => {
    try {
      await api.generateReport();
      fetchReports();
    } catch (e) {
      console.error(e);
    }
  };

  const exportExcel = (r: DailyReport) => {
    const data = [
      ['Rapport du jour', new Date(r.date).toLocaleDateString()],
      ['Échange Entrées', r.totalExchangeIn],
      ['Échange Sorties', r.totalExchangeOut],
      ['Mobile Money', r.totalMobileMoney],
      ['Crédit', r.totalCredit],
      ['Billets', r.totalTickets],
    ];
    const ws = utils.aoa_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Rapport");
    writeFile(wb, `Rapport_${new Date(r.date).toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = (r: DailyReport) => {
    const doc = new jsPDF();
    doc.text(`Rapport du jour: ${new Date(r.date).toLocaleDateString()}`, 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Métrique', 'Montant']],
      body: [
        ['Échange Entrées', r.totalExchangeIn],
        ['Échange Sorties', r.totalExchangeOut],
        ['Mobile Money', r.totalMobileMoney],
        ['Crédit', r.totalCredit],
        ['Billets', r.totalTickets],
      ],
    });
    doc.save(`Rapport_${new Date(r.date).toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <div className="p-8 text-white">Chargement...</div>;

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Rapports Financiers</h2>
          <p className="text-textMuted mt-1">Génération et Exportation</p>
        </div>
        <button onClick={handleGenerate} className="btn-primary flex items-center gap-2">
          <FileText className="w-4 h-4" /> Générer le rapport du jour
        </button>
      </div>

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
