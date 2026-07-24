import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Currency, ServiceProvider } from '../lib/api';
import { Building2, Save, Coins, Plus, Smartphone, Phone, Trash2, Server } from 'lucide-react';

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  MOBILE_MONEY: 'Mobile Money',
  CREDIT: 'Crédit de Communication',
};

const PROVIDER_TYPE_COLORS: Record<string, string> = {
  MOBILE_MONEY: 'text-yellow-400',
  CREDIT: 'text-blue-400',
};

export const SettingsPage = () => {
  const [entreprise, setEntreprise] = useState<any>({ name: '', address: '', phone: '', email: '', taxId: '' });
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', sellMargin: 0 });
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [newProvider, setNewProvider] = useState({ type: 'MOBILE_MONEY', name: '', color: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [entRes, curRes, provRes] = await Promise.all([
        api.getEntreprise().catch(() => null),
        api.getCurrencies().catch(() => []),
        api.getProviders().catch(() => []),
      ]);
      if (entRes) setEntreprise(entRes);
      if (curRes) setCurrencies(curRes);
      if (provRes) setProviders(provRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.updateEntreprise(entreprise);
      setMsg('En-tête sauvegardé avec succès !');
    } catch (error) {
      setMsg('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCurrency(newCurrency as any);
      setNewCurrency({ code: '', name: '', symbol: '', sellMargin: 0 });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'ajout de la devise');
    }
  };

  const handleUpdateMargin = async (code: string, sellMargin: number) => {
    try {
      await api.updateCurrencyMargin(code, sellMargin);
      fetchData();
    } catch (err) {
      alert('Erreur de mise à jour de la marge');
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.name.trim()) return;
    try {
      await api.createProvider({
        type: newProvider.type,
        name: newProvider.name.trim().toUpperCase(),
        color: newProvider.color || undefined,
      });
      setNewProvider({ type: 'MOBILE_MONEY', name: '', color: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'ajout de l\'opérateur');
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Supprimer cet opérateur ?')) return;
    setDeletingId(id);
    try {
      await api.deleteProvider(id);
      fetchData();
    } catch (err) {
      alert('Impossible de supprimer cet opérateur (des opérations peuvent y être liées).');
    } finally {
      setDeletingId(null);
    }
  };

  const mmProviders = providers.filter(p => p.type === 'MOBILE_MONEY');
  const creditProviders = providers.filter(p => p.type === 'CREDIT');

  if (loading) return <div className="p-8 text-white">Chargement...</div>;

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Paramètres</h2>
        <p className="text-textMuted mt-1">Configuration de l'entreprise, devises et opérateurs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Company info ── */}
        <div className="glass-panel p-6 h-fit">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <Building2 className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-white">Informations de l'entreprise</h3>
          </div>

          {msg && <div className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{msg}</div>}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Nom de l'entreprise *</label>
                <input type="text" className="glass-input w-full" value={entreprise.name || ''} onChange={e => setEntreprise({...entreprise, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-textMuted text-sm mb-1.5">NIF / Numéro fiscal</label>
                <input type="text" className="glass-input w-full" value={entreprise.taxId || ''} onChange={e => setEntreprise({...entreprise, taxId: e.target.value})} />
              </div>
            </div>
            
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Adresse physique</label>
              <input type="text" className="glass-input w-full" value={entreprise.address || ''} onChange={e => setEntreprise({...entreprise, address: e.target.value})} placeholder="Quartier, Ville, Pays" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Téléphone</label>
                <input type="text" className="glass-input w-full" value={entreprise.phone || ''} onChange={e => setEntreprise({...entreprise, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Email</label>
                <input type="email" className="glass-input w-full" value={entreprise.email || ''} onChange={e => setEntreprise({...entreprise, email: e.target.value})} />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Currencies ── */}
        <div className="glass-panel p-6 h-fit">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <Coins className="w-6 h-6 text-emerald-400" />
            <h3 className="text-xl font-bold text-white">Devises supportées</h3>
          </div>

          <div className="space-y-3 mb-6">
            {currencies.map(c => (
              <div key={c.code} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center font-bold text-white">{c.code}</div>
                  <div>
                    <div className="text-white text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-primary">{c.symbol}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-textMuted">Marge:</span>
                  <input 
                    type="number" step="0.1" min="0"
                    className="glass-input w-20 text-sm py-1 px-2"
                    defaultValue={c.sellMargin || 0}
                    onBlur={(e) => handleUpdateMargin(c.code, parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs text-textMuted">%</span>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCurrency} className="bg-slate-900/50 p-4 rounded-xl border border-white/10 space-y-4">
            <h4 className="text-sm font-medium text-white mb-2">Ajouter une nouvelle devise</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-textMuted text-xs mb-1">Code (ex: JPY)</label>
                <input type="text" required maxLength={3} className="glass-input w-full uppercase" value={newCurrency.code} onChange={e => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-textMuted text-xs mb-1">Nom (ex: Yen)</label>
                <input type="text" required className="glass-input w-full" value={newCurrency.name} onChange={e => setNewCurrency({...newCurrency, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-textMuted text-xs mb-1">Symbole (ex: ¥)</label>
                <input type="text" required className="glass-input w-full" value={newCurrency.symbol} onChange={e => setNewCurrency({...newCurrency, symbol: e.target.value})} />
              </div>
              <div>
                <label className="block text-textMuted text-xs mb-1">Marge (%)</label>
                <input type="number" step="0.1" min="0" required className="glass-input w-full" value={newCurrency.sellMargin} onChange={e => setNewCurrency({...newCurrency, sellMargin: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <button type="submit" className="btn-secondary w-full flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </form>
        </div>

        {/* ── Service Providers (spans full width) ── */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
            <Server className="w-6 h-6 text-accent" />
            <div>
              <h3 className="text-xl font-bold text-white">Opérateurs de Services</h3>
              <p className="text-textMuted text-xs mt-0.5">Gérez les opérateurs Mobile Money et Crédit disponibles dans le formulaire de service</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mobile Money providers */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-semibold text-white">Mobile Money</h4>
                <span className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded-full">{mmProviders.length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {mmProviders.length === 0 && (
                  <p className="text-textMuted text-xs italic">Aucun opérateur. Ajoutez-en ci-dessous.</p>
                )}
                {mmProviders.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.color && (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      )}
                      <span className="text-yellow-300 font-semibold text-sm">{p.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteProvider(p.id)}
                      disabled={deletingId === p.id}
                      className="text-rose-400 hover:text-rose-300 transition-colors p-1 rounded hover:bg-rose-500/10"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit providers */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">Crédit de Communication</h4>
                <span className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded-full">{creditProviders.length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {creditProviders.length === 0 && (
                  <p className="text-textMuted text-xs italic">Aucun opérateur. Ajoutez-en ci-dessous.</p>
                )}
                {creditProviders.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.color && (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      )}
                      <span className="text-blue-300 font-semibold text-sm">{p.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteProvider(p.id)}
                      disabled={deletingId === p.id}
                      className="text-rose-400 hover:text-rose-300 transition-colors p-1 rounded hover:bg-rose-500/10"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add provider form */}
          <form onSubmit={handleAddProvider} className="mt-6 bg-slate-900/50 border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-3">Ajouter un opérateur</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-textMuted text-xs mb-1">Type</label>
                <select
                  className="glass-input w-full"
                  value={newProvider.type}
                  onChange={e => setNewProvider({ ...newProvider, type: e.target.value })}
                >
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CREDIT">Crédit de Communication</option>
                </select>
              </div>
              <div>
                <label className="block text-textMuted text-xs mb-1">Nom de l'opérateur *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: TMONEY, WAVE..."
                  className="glass-input w-full uppercase"
                  value={newProvider.name}
                  onChange={e => setNewProvider({ ...newProvider, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-textMuted text-xs mb-1">Couleur (optionnel)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="h-10 w-12 rounded-lg cursor-pointer bg-transparent border border-white/20"
                    value={newProvider.color || '#6366f1'}
                    onChange={e => setNewProvider({ ...newProvider, color: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="#rrggbb"
                    className="glass-input w-full"
                    value={newProvider.color}
                    onChange={e => setNewProvider({ ...newProvider, color: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="btn-secondary mt-3 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter l'opérateur
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
