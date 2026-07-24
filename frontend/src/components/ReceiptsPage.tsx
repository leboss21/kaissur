import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FileText, Printer, Search } from 'lucide-react';
import { generateReceiptPDF } from '../lib/pdfGenerator';

export const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredReceipts = receipts.filter(r => 
    r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.sourceType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Historique des Reçus</h2>
          <p className="text-textMuted mt-1">Consultez et réimprimez (Duplicata) tous les reçus émis.</p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input 
              type="text" 
              className="glass-input w-full pl-10" 
              placeholder="Rechercher un numéro de reçu..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-textMuted">Chargement...</div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-8 text-textMuted">Aucun reçu trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-textMuted border-b border-white/10">
                  <th className="pb-3 pr-4">Numéro</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4 text-white font-medium">{r.receiptNumber}</td>
                    <td className="py-4 pr-4 text-textMuted">{r.sourceType}</td>
                    <td className="py-4 pr-4 text-textMuted">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-4">
                      <button 
                        onClick={() => handleReprint(r.id)} 
                        className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" /> Réimprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
