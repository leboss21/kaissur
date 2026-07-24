import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import type { Client, CreateClientPayload } from '../lib/api';

const DEMO_ENTREPRISE_ID = 'demo-tenant';

export const ClientsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateClientPayload>({ firstName: '', lastName: '', phone: '', identityType: '', identityNum: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchClients = () => {
    api.getClients(DEMO_ENTREPRISE_ID)
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.createClient(form, DEMO_ENTREPRISE_ID);
      setShowForm(false);
      setForm({ firstName: '', lastName: '', phone: '', identityType: '', identityNum: '' });
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = clients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const ID_LABELS: Record<string, string> = {
    passport: 'Passeport',
    national_id: 'Carte nationale d\'identité',
    drivers_license: 'Permis de conduire',
  };

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white">Clients</h2>
          <p className="text-textMuted mt-1">{clients.length} client(s) enregistré(s)</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {/* Modal ajout client */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-6">Enregistrer un nouveau client</h3>
            {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Prénom *</label>
                  <input className="glass-input w-full" placeholder="Jean" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Nom *</label>
                  <input className="glass-input w-full" placeholder="Dupont" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Téléphone</label>
                <input className="glass-input w-full" placeholder="+33 6 12 34 56 78" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Type de pièce d'identité</label>
                  <select className="glass-input w-full" value={form.identityType} onChange={e => setForm({ ...form, identityType: e.target.value })}>
                    <option value="">Sélectionner...</option>
                    <option value="passport">Passeport</option>
                    <option value="national_id">Carte nationale d'identité</option>
                    <option value="drivers_license">Permis de conduire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Numéro de pièce</label>
                  <input className="glass-input w-full" placeholder="FR123456" value={form.identityNum} onChange={e => setForm({ ...form, identityNum: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : 'Enregistrer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
        <input className="glass-input w-full pl-11" placeholder="Rechercher un client par nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grille des clients */}
      {loading ? (
        <div className="text-center py-16 text-textMuted">Chargement des clients...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-textMuted">
          {search ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client enregistré pour le moment.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(client => (
            <div key={client.id} className="glass-panel p-5 hover:border-white/20 transition-all duration-200 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {client.firstName[0]}{client.lastName[0]}
                </div>
                <div>
                  <div className="font-semibold text-white">{client.firstName} {client.lastName}</div>
                  <div className="text-textMuted text-xs">Client depuis le {new Date(client.createdAt).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-textMuted text-sm mb-2">
                  <Phone className="w-3.5 h-3.5" /> {client.phone}
                </div>
              )}
              {client.identityType && (
                <div className="flex items-center gap-2 text-textMuted text-sm">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{ID_LABELS[client.identityType] ?? client.identityType}</span>
                  {client.identityNum && <span className="text-white/50">• {client.identityNum}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
