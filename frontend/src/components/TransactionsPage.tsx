import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, CheckCircle2, Clock, Eye, XCircle, FileText } from 'lucide-react';
import { api } from '../lib/api';
import type { Transaction, Currency, Client, CreateTransactionPayload } from '../lib/api';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { AmountInput } from './ui/AmountInput';

const DEMO_ENTREPRISE_ID = 'demo-tenant';

export const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [exchangeMargin, setExchangeMargin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTransactionPayload>({
    fromCurrencyCode: '', toCurrencyCode: '', amountIn: 0, exchangeRate: 0, clientId: '', type: 'EXCHANGE'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = () => {
    Promise.all([
      api.getTransactions(DEMO_ENTREPRISE_ID).catch(() => []),
      api.getCurrencies().catch(() => []),
      api.getClients(DEMO_ENTREPRISE_ID).catch(() => []),
      api.getEntreprise().catch(() => null),
    ]).then(([txns, curr, cl, ent]) => {
      setTransactions(txns);
      setCurrencies(curr);
      setClients(cl);
      if (ent && ent.exchangeMargin) {
        setExchangeMargin(ent.exchangeMargin);
        setForm(f => ({ ...f, margin: ent.exchangeMargin }));
      }
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const appliedRate = form.exchangeRate ? form.exchangeRate * (1 + (form.margin || 0) / 100) : 0;
  const amountOut = form.amountIn && appliedRate ? (form.amountIn * appliedRate) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { 
        ...form, 
        clientId: form.clientId || undefined,
        exchangeRate: appliedRate // On envoie le taux final appliqué au backend
      };
      const result = await api.createTransaction(payload, DEMO_ENTREPRISE_ID);
      
      setTransactions([result, ...transactions]);
      setShowForm(false);
      
      if (result.receipt) {
        const receiptData = await api.getReceiptDetails(result.receipt.id);
        generateReceiptPDF(receiptData, false);
      }
      
      setForm({ fromCurrencyCode: '', toCurrencyCode: '', amountIn: 0, exchangeRate: 0, clientId: '', type: 'EXCHANGE' });
      fetchAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white">Transactions</h2>
          <p className="text-textMuted mt-1">{transactions.length} échange(s) au total</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvel échange
        </button>
      </div>

      {/* Modal nouvel échange */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-6">Nouvelle transaction d'échange</h3>
            {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Devise remise *</label>
                  <select 
                    className="glass-input w-full" 
                    value={form.fromCurrencyCode} 
                    onChange={e => {
                      const code = e.target.value;
                      const selectedCurr = currencies.find(c => c.code === code);
                      const defaultMargin = selectedCurr?.sellMargin || exchangeMargin;
                      setForm({ ...form, fromCurrencyCode: code, margin: defaultMargin });
                    }} 
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code} – {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Devise reçue *</label>
                  <select 
                    className="glass-input w-full" 
                    value={form.toCurrencyCode} 
                    onChange={e => {
                      const code = e.target.value;
                      const selectedCurr = currencies.find(c => c.code === code);
                      // On peut aussi appliquer la marge de la devise reçue si pertinent, mais prenons celle de remise en priorité si elle a changé
                      setForm({ ...form, toCurrencyCode: code });
                    }} 
                    required
                  >
                    <option value="">Sélectionner...</option>
                    {currencies.filter(c => c.code !== form.fromCurrencyCode).map(c => <option key={c.code} value={c.code}>{c.code} – {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Montant remis *</label>
                  <AmountInput 
                    value={form.amountIn || 0} 
                    onChangeAmount={val => setForm({ ...form, amountIn: val })} 
                    placeholder="100.00" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Taux de base *</label>
                  <AmountInput 
                    value={form.exchangeRate || 0} 
                    onChangeAmount={val => setForm({ ...form, exchangeRate: val })} 
                    placeholder="0.9200" 
                    required 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Marge (%) *</label>
                  <AmountInput 
                    value={form.margin || 0} 
                    onChangeAmount={val => setForm({ ...form, margin: val })} 
                    placeholder="5" 
                  />
                </div>
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Taux appliqué au client</label>
                  <div className="glass-input w-full bg-white/5 flex items-center text-white/50">{appliedRate.toFixed(4)}</div>
                </div>
              </div>

              {/* Aperçu en direct */}
              {amountOut > 0 && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-textMuted text-sm">Le client recevra (après marge)</span>
                  <span className="text-accent font-bold text-lg">{amountOut.toFixed(2)} {form.toCurrencyCode}</span>
                </div>
              )}

              <div>
                <label className="block text-textMuted text-sm mb-1.5">Client (optionnel)</label>
                <select className="glass-input w-full" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">Anonyme (passage)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Traitement...' : 'Valider l\'échange'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau des transactions */}
      <div className="glass-panel p-6">
        {loading ? (
          <div className="text-center py-16 text-textMuted">Chargement des transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-textMuted">Aucune transaction pour le moment. Cliquez sur « Nouvel échange » pour commencer !</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-textMuted text-sm border-b border-white/10">
                  <th className="pb-3 pr-4">Client</th>
                  <th className="pb-3 pr-4">Échange</th>
                  <th className="pb-3 pr-4">Remis</th>
                  <th className="pb-3 pr-4">Reçu</th>
                  <th className="pb-3 pr-4">Taux</th>
                  <th className="pb-3 pr-4">Statut</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4 text-white">
                      {t.client ? `${t.client.firstName} ${t.client.lastName}` : <span className="text-textMuted italic">Anonyme</span>}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-mono text-white">
                        {t.fromCurrencyCode} → {t.toCurrencyCode}
                      </span>
                    </td>
                    <td className="py-4 pr-4 font-mono text-white">{t.amountIn.toFixed(2)}</td>
                    <td className="py-4 pr-4 font-mono text-accent">{t.amountOut.toFixed(2)}</td>
                    <td className="py-4 pr-4 text-textMuted font-mono text-sm">{t.exchangeRate.toFixed(4)}</td>
                    <td className="py-4 pr-4">
                      <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg w-fit ${
                        t.status === 'COMPLETED' ? 'bg-accent/10 text-accent' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {t.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {t.status === 'COMPLETED' ? 'Validé' : 'En attente'}
                      </span>
                    </td>
                    <td className="py-4 text-textMuted text-sm">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</td>
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
