import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Printer, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateReceiptPDF } from '../lib/pdfGenerator';

const PAGE_SIZE = 10;

export const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReceipts = async () => {
    try {
      const data = await api.getReceipts();
      setReceipts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleReprint = async (id: string) => {
    try {
      const receiptData = await api.getReceiptDetails(id);
      generateReceiptPDF(receiptData, true);
    } catch (e) {
      console.error('Failed to generate PDF', e);
      alert('Erreur lors de la génération du duplicata');
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const matchesSearch = 
      r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.sourceType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || r.sourceType === filterType;

    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredReceipts.length / PAGE_SIZE) || 1;
  const paginatedReceipts = filteredReceipts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'EXCHANGE': return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">Change</span>;
      case 'MOBILE_MONEY': return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">Mobile Money</span>;
      case 'CREDIT': return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">Crédit</span>;
      case 'TICKET': return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">Billetterie</span>;
      default: return <span className="bg-white/10 text-white px-2.5 py-0.5 rounded-full text-xs">{type}</span>;
    }
  };

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Historique des Reçus</h2>
          <p className="text-textMuted mt-1">Consultez et réimprimez (Duplicata) tous les reçus émis ({filteredReceipts.length} reçus).</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input 
              type="text" 
              className="glass-input w-full pl-10" 
              placeholder="Rechercher un numéro de reçu..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div>
            <select 
              className="glass-input text-sm" 
              value={filterType} 
              onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">Tous les types</option>
              <option value="EXCHANGE">Change</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CREDIT">Crédit</option>
              <option value="TICKET">Billetterie</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-textMuted">Chargement...</div>
        ) : paginatedReceipts.length === 0 ? (
          <div className="text-center py-8 text-textMuted">Aucun reçu trouvé.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-textMuted border-b border-white/10">
                    <th className="pb-3 pr-4">Numéro</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4 text-white font-medium font-mono">{r.receiptNumber}</td>
                      <td className="py-4 pr-4 text-textMuted">{getTypeBadge(r.sourceType)}</td>
                      <td className="py-4 pr-4 text-textMuted">{new Date(r.createdAt).toLocaleString('fr-FR')}</td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => handleReprint(r.id)} 
                          className="btn-ghost text-xs inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-lg"
                        >
                          <Printer className="w-3.5 h-3.5" /> Réimprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <span className="text-textMuted text-sm">
                  Page {currentPage} sur {totalPages} ({filteredReceipts.length} reçus)
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="btn-ghost p-2 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="btn-ghost p-2 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
