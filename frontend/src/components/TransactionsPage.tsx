import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Clock, Search, Edit2, ChevronLeft, ChevronRight, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { api } from '../lib/api';
import type { Transaction, Currency, Client, CreateTransactionPayload } from '../lib/api';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { AmountInput } from './ui/AmountInput';
import { Combobox } from './ui/Combobox';

const DEMO_ENTREPRISE_ID = 'demo-tenant';
const PAGE_SIZE = 10;

export const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [exchangeMargin, setExchangeMargin] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // New Transaction Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTransactionPayload>({
    fromCurrencyCode: 'XOF', toCurrencyCode: '', amountIn: 0, exchangeRate: 0, clientId: '', type: 'BUY'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit Transaction state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

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

  // Validation explicite et ciblée
  const validateTransactionForm = (): string | null => {
    if (!form.fromCurrencyCode) {
      return form.type === 'BUY'
        ? 'Veuillez sélectionner la devise apportée par le client.'
        : 'Veuillez sélectionner la devise payée par le client.';
    }
    if (!form.toCurrencyCode) {
      return form.type === 'BUY'
        ? 'Veuillez sélectionner la devise remise au client.'
        : 'Veuillez sélectionner la devise livrée au client.';
    }
    if (form.fromCurrencyCode === form.toCurrencyCode) {
      return 'La devise d\'entrée et la devise de sortie doivent être différentes.';
    }
    if (!form.amountIn || form.amountIn <= 0) {
      return 'Veuillez saisir un montant apporté supérieur à 0.';
    }
    if (!form.exchangeRate || form.exchangeRate <= 0) {
      return 'Veuillez renseigner un taux de change de base supérieur à 0.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationMsg = validateTransactionForm();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    setSubmitting(true);
    try {
      const payload = { 
        ...form, 
        clientId: form.clientId || undefined,
        exchangeRate: appliedRate
      };
      const result = await api.createTransaction(payload, DEMO_ENTREPRISE_ID);
      
      setTransactions([result, ...transactions]);
      setShowForm(false);
      
      if (result.receipt) {
        const receiptData = await api.getReceiptDetails(result.receipt.id);
        generateReceiptPDF(receiptData, false);
      }
      
      setForm({ fromCurrencyCode: 'XOF', toCurrencyCode: '', amountIn: 0, exchangeRate: 0, clientId: '', type: 'BUY' });
      fetchAll();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      const updated = await api.updateTransaction(editingTransaction.id, editForm, DEMO_ENTREPRISE_ID);
      setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
      setEditingTransaction(null);
    } catch (err: any) {
      setEditError(err.message || 'Erreur lors de la modification.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setEditForm({
      fromCurrencyCode: t.fromCurrencyCode,
      toCurrencyCode: t.toCurrencyCode,
      amountIn: t.amountIn,
      exchangeRate: t.exchangeRate,
      clientId: t.clientId || '',
      type: t.type
    });
    setEditError('');
  };

  // Filtered & Paginated Transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      (t.client ? `${t.client.firstName} ${t.client.lastName}` : 'Anonyme').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fromCurrencyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.toCurrencyCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCurrency = filterCurrency === 'ALL' || t.fromCurrencyCode === filterCurrency || t.toCurrencyCode === filterCurrency;

    return matchesSearch && matchesType && matchesCurrency;
  });

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Transactions de Change</h2>
          <p className="text-textMuted mt-1">{filteredTransactions.length} échange(s) trouvé(s)</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouvel échange
        </button>
      </div>

      {/* Modal Nouvel Échange */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-6">Nouvelle transaction d'échange</h3>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3.5 mb-4 text-sm flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Type de transaction *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      type: 'BUY',
                      fromCurrencyCode: 'XOF',
                      toCurrencyCode: f.toCurrencyCode === 'XOF' ? '' : f.toCurrencyCode
                    }))}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                      form.type === 'BUY'
                        ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Achat de devise
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      type: 'SELL',
                      toCurrencyCode: 'XOF',
                      fromCurrencyCode: f.fromCurrencyCode === 'XOF' ? '' : f.fromCurrencyCode
                    }))}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                      form.type === 'SELL'
                        ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Vente de devise
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">
                    {form.type === 'BUY' ? 'Devise apportée par le client *' : 'Devise payée par le client *'}
                  </label>
                  <Combobox
                    options={currencies.map(c => ({
                      value: c.code,
                      label: `${c.code} – ${c.name}`,
                      badge: c.code
                    }))}
                    value={form.fromCurrencyCode}
                    onChange={code => {
                      const selectedCurr = currencies.find(c => c.code === code);
                      const defaultMargin = selectedCurr?.sellMargin || exchangeMargin;
                      setForm(f => ({ ...f, fromCurrencyCode: code, margin: defaultMargin }));
                    }}
                    placeholder="Sélectionner la devise..."
                    searchPlaceholder="Rechercher code ou nom (USD, EUR, XOF)..."
                  />
                </div>
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">
                    {form.type === 'BUY' ? 'Devise donnée au client *' : 'Devise livrée au client *'}
                  </label>
                  <Combobox
                    options={currencies
                      .filter(c => c.code !== form.fromCurrencyCode)
                      .map(c => ({
                        value: c.code,
                        label: `${c.code} – ${c.name}`,
                        badge: c.code
                      }))}
                    value={form.toCurrencyCode}
                    onChange={code => setForm(f => ({ ...f, toCurrencyCode: code }))}
                    placeholder="Sélectionner la devise..."
                    searchPlaceholder="Rechercher code ou nom (USD, EUR, XOF)..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">
                    {form.type === 'BUY' ? 'Montant apporté par le client *' : 'Montant payé par le client *'}
                  </label>
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
                  <label className="block text-textMuted text-sm mb-1.5">Marge (%)</label>
                  <AmountInput 
                    value={form.margin || 0} 
                    onChangeAmount={val => setForm({ ...form, margin: val })} 
                    placeholder="5" 
                  />
                </div>
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Taux appliqué au client</label>
                  <div className="glass-input w-full bg-white/5 flex items-center text-white font-mono">{appliedRate.toFixed(4)}</div>
                </div>
              </div>

              {/* Aperçu clair */}
              {amountOut > 0 && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-textMuted text-sm">Le client recevra au total</span>
                  <span className="text-accent font-bold text-lg font-mono">{amountOut.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {form.toCurrencyCode}</span>
                </div>
              )}

              <div>
                <label className="block text-textMuted text-sm mb-1.5">Client (optionnel)</label>
                <Combobox
                  options={[
                    { value: '', label: 'Client Anonyme (au comptoir)' },
                    ...clients.map(c => ({
                      value: c.id,
                      label: `${c.firstName} ${c.lastName}`,
                      subLabel: c.phone || undefined
                    }))
                  ]}
                  value={form.clientId || ''}
                  onChange={val => setForm({ ...form, clientId: val })}
                  placeholder="Sélectionner ou rechercher un client..."
                  searchPlaceholder="Rechercher un client..."
                />
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

      {/* Modal Edit Transaction */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-6">Modifier la transaction</h3>
            {editError && <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 mb-4 text-sm">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Montant apporté par le client</label>
                <AmountInput 
                  value={editForm.amountIn || 0} 
                  onChangeAmount={val => setEditForm({ ...editForm, amountIn: val })} 
                  required 
                />
              </div>
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Taux de change appliqué</label>
                <AmountInput 
                  value={editForm.exchangeRate || 0} 
                  onChangeAmount={val => setEditForm({ ...editForm, exchangeRate: val })} 
                  required 
                />
              </div>
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Client</label>
                <select className="glass-input w-full" value={editForm.clientId || ''} onChange={e => setEditForm({ ...editForm, clientId: e.target.value })}>
                  <option value="">Anonyme</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setEditingTransaction(null)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={editSubmitting}>
                  {editSubmitting ? 'Enregistrement...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <div className="glass-panel p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          <input 
            type="text" 
            className="glass-input w-full pl-10" 
            placeholder="Rechercher par client ou devise..." 
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="flex gap-3">
          <select 
            className="glass-input text-sm" 
            value={filterType} 
            onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">Tous les types</option>
            <option value="BUY">Achat</option>
            <option value="SELL">Vente</option>
          </select>
          <select 
            className="glass-input text-sm" 
            value={filterCurrency} 
            onChange={e => { setFilterCurrency(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">Toutes les devises</option>
            {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="glass-panel p-6">
        {loading ? (
          <div className="text-center py-16 text-textMuted">Chargement des transactions...</div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="text-center py-16 text-textMuted">Aucune transaction trouvée.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-textMuted text-sm border-b border-white/10">
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Client</th>
                    <th className="pb-3 pr-4">Échange</th>
                    <th className="pb-3 pr-4">Montant remis</th>
                    <th className="pb-3 pr-4">Montant reçu</th>
                    <th className="pb-3 pr-4">Taux</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.type === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : t.type === 'SELL'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-white/10 text-white/70'
                        }`}>
                          {t.type === 'BUY' ? 'Achat' : t.type === 'SELL' ? 'Vente' : 'Échange'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-white">
                        {t.client ? `${t.client.firstName} ${t.client.lastName}` : <span className="text-textMuted italic">Anonyme</span>}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-mono text-white">
                          {t.fromCurrencyCode} → {t.toCurrencyCode}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-mono text-white">{t.amountIn.toLocaleString('fr-FR')} {t.fromCurrencyCode}</td>
                      <td className="py-4 pr-4 font-mono text-accent">{t.amountOut.toLocaleString('fr-FR')} {t.toCurrencyCode}</td>
                      <td className="py-4 pr-4 text-textMuted font-mono text-sm">{t.exchangeRate.toFixed(4)}</td>
                      <td className="py-4 pr-4">
                        <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg w-fit ${
                          t.status === 'COMPLETED' ? 'bg-accent/10 text-accent' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {t.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {t.status === 'COMPLETED' ? 'Validé' : 'En attente'}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-textMuted text-sm">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => openEditModal(t)}
                          className="btn-ghost text-xs p-1.5 hover:bg-white/10 rounded-lg inline-flex items-center gap-1"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
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
                  Page {currentPage} sur {totalPages} ({filteredTransactions.length} éléments)
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
