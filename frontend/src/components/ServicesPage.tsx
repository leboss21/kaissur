import React, { useState, useEffect } from 'react';
import { Smartphone, Plane, Plus, Phone, Search, Edit2, ChevronLeft, ChevronRight, AlertCircle, Building, Check } from 'lucide-react';
import { api } from '../lib/api';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { AmountInput } from './ui/AmountInput';
import { PhoneInput } from './ui/PhoneInput';
import { Combobox } from './ui/Combobox';
import { WORLD_CITIES } from '../lib/cities';
import type { ServiceOperation, Client, CreateServiceOperationPayload, ServiceProvider } from '../lib/api';

const DEMO_ENTREPRISE_ID = 'demo-tenant';
const PAGE_SIZE = 10;

type TabType = 'MOBILE_MONEY' | 'CREDIT' | 'TICKET';

const TAB_CONFIG: Record<TabType, { label: string; icon: React.ElementType; color: string }> = {
  MOBILE_MONEY: { label: 'Mobile Money', icon: Smartphone, color: 'text-yellow-400' },
  CREDIT: { label: 'Crédit de Communication', icon: Phone, color: 'text-blue-400' },
  TICKET: { label: 'Billetterie', icon: Plane, color: 'text-purple-400' },
};

const AIRLINE_OPTIONS = [
  { value: 'ASKY', label: 'Asky Airlines', badge: 'KP' },
  { value: 'AIR_FRANCE', label: 'Air France', badge: 'AF' },
  { value: 'ETHIOPIAN', label: 'Ethiopian Airlines', badge: 'ET' },
  { value: 'AIR_COTE_D_IVOIRE', label: 'Air Côte d\'Ivoire', badge: 'HF' },
  { value: 'ROYAL_AIR_MAROC', label: 'Royal Air Maroc', badge: 'AT' },
  { value: 'BRUSSELS_AIRLINES', label: 'Brussels Airlines', badge: 'SN' },
  { value: 'EMIRATES', label: 'Emirates', badge: 'EK' },
  { value: 'TURKISH_AIRLINES', label: 'Turkish Airlines', badge: 'TK' },
  { value: 'CORSAIR', label: 'Corsair', badge: 'SS' },
  { value: 'OTHER', label: 'Autre Compagnie', badge: 'AUTRE' },
];

export const ServicesPage = ({ defaultTab = 'MOBILE_MONEY' }: { defaultTab?: TabType }) => {
  const [operations, setOperations] = useState<ServiceOperation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('ALL');
  const [filterSubType, setFilterSubType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Partial<CreateServiceOperationPayload>>({});

  // Edit states
  const [editingOp, setEditingOp] = useState<ServiceOperation | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceOperation>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchAll = () => {
    Promise.all([
      api.getServiceOperations(DEMO_ENTREPRISE_ID).catch(() => []),
      api.getClients(DEMO_ENTREPRISE_ID).catch(() => []),
      api.getProviders().catch(() => []),
    ]).then(([ops, cl, prov]) => {
      setOperations(ops);
      setClients(cl);
      setProviders(prov);
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => { 
    setActiveTab(defaultTab); 
    setForm({ type: defaultTab }); 
    setSearchTerm('');
    setFilterProvider('ALL');
    setFilterSubType('ALL');
    setCurrentPage(1);
  }, [defaultTab]);

  const openForm = (tab: TabType) => {
    setActiveTab(tab);
    setForm({ type: tab });
    setError('');
    setShowForm(true);
  };

  // Validation explicite et détaillée par champ
  const validateForm = (): string | null => {
    if (activeTab === 'MOBILE_MONEY') {
      if (!form.provider) {
        return 'Veuillez sélectionner un opérateur Mobile Money (ex: Flooz, T-Money, Mixx...).';
      }
      if (!form.subType) {
        return "Veuillez sélectionner le type d'opération (Dépôt ou Retrait).";
      }
      if (!form.phone || form.phone.trim().length < 6) {
        return 'Veuillez renseigner un numéro de téléphone valide pour la transaction.';
      }
      if (!form.amount || form.amount <= 0) {
        return "Veuillez saisir un montant d'opération supérieur à 0 FCFA.";
      }
    } else if (activeTab === 'CREDIT') {
      if (!form.provider) {
        return 'Veuillez sélectionner un opérateur de crédit (ex: Moov, Togocel, Mixx...).';
      }
      if (!form.phone || form.phone.trim().length < 6) {
        return 'Veuillez renseigner le numéro de téléphone à recharger.';
      }
      if (!form.amount || form.amount <= 0) {
        return 'Veuillez saisir un montant de recharge supérieur à 0 FCFA.';
      }
    } else if (activeTab === 'TICKET') {
      if (!form.airline) {
        return 'Veuillez sélectionner la compagnie aérienne.';
      }
      if (!form.passengerName || !form.passengerName.trim()) {
        return 'Veuillez indiquer le nom et prénom du passager.';
      }
      if (!form.departure || !form.departure.trim()) {
        return 'Veuillez renseigner la ville ou l\'aéroport de départ.';
      }
      if (!form.destination || !form.destination.trim()) {
        return 'Veuillez renseigner la ville ou l\'aéroport d\'arrivée (destination).';
      }
      if (form.departure.trim().toLowerCase() === form.destination.trim().toLowerCase()) {
        return 'La ville de départ et la ville de destination doivent être différentes.';
      }
      if (!form.flightDate) {
        return 'Veuillez sélectionner la date du vol.';
      }
      if (!form.ticketPrice || form.ticketPrice <= 0) {
        return 'Veuillez renseigner le coût d\'achat partenaire (prix du billet) supérieur à 0.';
      }
      if (!form.amount || form.amount <= 0) {
        return 'Veuillez renseigner le prix de vente facturé au client.';
      }
      if (form.amount < form.ticketPrice) {
        return 'Le prix de vente au client ne peut pas être inférieur au coût d\'achat du billet.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      let finalForm = { ...form, type: activeTab, clientId: form.clientId || undefined };
      
      // Billetterie: calcul automatique de la commission
      if (activeTab === 'TICKET') {
        const cost = form.ticketPrice || 0;
        const sellPrice = form.amount || 0;
        finalForm.commission = Math.max(0, sellPrice - cost);
        finalForm.provider = form.airline || 'AIRLINE';
      }

      const payload = finalForm as CreateServiceOperationPayload;
      const result = await api.createServiceOperation(payload, DEMO_ENTREPRISE_ID);
      setOperations([result, ...operations]);
      setShowForm(false);
      setForm({});

      if (result.receipt) {
        const receiptData = await api.getReceiptDetails(result.receipt.id);
        generateReceiptPDF(receiptData, false);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement de l\'opération.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOp) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      let updatedData = { ...editForm };
      if (editingOp.type === 'TICKET') {
        const cost = editForm.ticketPrice ?? editingOp.ticketPrice ?? 0;
        const sellPrice = editForm.amount ?? editingOp.amount ?? 0;
        updatedData.commission = Math.max(0, sellPrice - cost);
      }
      const updated = await api.updateServiceOperation(editingOp.id, updatedData, DEMO_ENTREPRISE_ID);
      setOperations(operations.map(o => o.id === updated.id ? updated : o));
      setEditingOp(null);
    } catch (err: any) {
      setEditError(err.message || 'Erreur lors de la modification');
    } finally {
      setEditSubmitting(false);
    }
  };

  const openEditModal = (op: ServiceOperation) => {
    setEditingOp(op);
    setEditForm({
      amount: op.amount,
      phone: op.phone || '',
      reference: op.reference || '',
      ticketPrice: op.ticketPrice || 0,
      passengerName: op.passengerName || '',
      flightNumber: op.flightNumber || '',
      clientId: op.clientId || '',
    });
    setEditError('');
  };

  /** Render dynamic operator buttons for a given type */
  const renderProviderButtons = (type: 'MOBILE_MONEY' | 'CREDIT') => {
    const typeProviders = providers.filter(p => p.type === type);

    if (typeProviders.length === 0) {
      return (
        <p className="text-textMuted text-sm col-span-2 italic">
          Aucun opérateur configuré. Ajoutez-en dans les Paramètres.
        </p>
      );
    }

    return typeProviders.map(p => {
      const isActive = form.provider === p.name;
      const bgStyle = p.color ? { backgroundColor: `${p.color}33`, borderColor: isActive ? p.color : `${p.color}55` } : {};
      const textStyle = p.color && isActive ? { color: p.color } : {};
      const initial = p.name.charAt(0);

      return (
        <button
          key={p.id}
          type="button"
          onClick={() => setForm({ ...form, provider: p.name })}
          style={isActive ? { ...bgStyle, boxShadow: `0 0 0 2px ${p.color || '#6366f1'}` } : bgStyle}
          className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
            isActive ? 'border-transparent' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
          }`}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={p.color ? { backgroundColor: p.color, color: '#fff' } : { backgroundColor: '#fff2', color: '#fff' }}
          >
            {initial}
          </span>
          <span style={isActive ? textStyle : {}}>{p.name}</span>
        </button>
      );
    });
  };

  const renderFormContent = () => {
    if (activeTab === 'MOBILE_MONEY') {
      const subTypeOptions = [
        { value: 'DEPOSIT', label: 'Dépôt d\'argent', badge: 'DÉPÔT' },
        { value: 'WITHDRAWAL', label: 'Retrait d\'argent', badge: 'RETRAIT' },
      ];

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-textMuted text-sm mb-1.5">Opérateur *</label>
              <div className="grid grid-cols-2 gap-3">
                {renderProviderButtons('MOBILE_MONEY')}
              </div>
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Type d'opération *</label>
              <Combobox
                options={subTypeOptions}
                value={form.subType || ''}
                onChange={val => setForm({ ...form, subType: val })}
                placeholder="Sélectionner le type..."
                searchPlaceholder="Dépôt, Retrait..."
              />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Numéro de téléphone *</label>
              <PhoneInput value={form.phone || ''} onChange={val => setForm({ ...form, phone: val })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Montant *</label>
              <AmountInput value={form.amount || 0} onChangeAmount={val => setForm({ ...form, amount: val })} placeholder="10000" required />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Référence transaction (optionnel)</label>
              <input className="glass-input w-full" type="text" placeholder="Txn ID" value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
          </div>
        </>
      );
    }

    if (activeTab === 'CREDIT') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-textMuted text-sm mb-1.5">Opérateur *</label>
              <div className="grid grid-cols-2 gap-3">
                {renderProviderButtons('CREDIT')}
              </div>
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Numéro de téléphone *</label>
              <PhoneInput value={form.phone || ''} onChange={val => setForm({ ...form, phone: val })} />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Montant de la recharge *</label>
              <AmountInput value={form.amount || 0} onChangeAmount={val => setForm({ ...form, amount: val })} placeholder="1000" required />
            </div>
          </div>
        </>
      );
    }

    if (activeTab === 'TICKET') {
      const computedMargin = (form.amount || 0) - (form.ticketPrice || 0);

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Compagnie Aérienne *</label>
              <Combobox
                options={AIRLINE_OPTIONS}
                value={form.airline || ''}
                onChange={val => setForm({ ...form, airline: val })}
                placeholder="Sélectionner une compagnie..."
                searchPlaceholder="Rechercher une compagnie..."
              />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Nom du passager *</label>
              <input className="glass-input w-full" type="text" placeholder="Ex: Jean Dupont" value={form.passengerName || ''} onChange={e => setForm({ ...form, passengerName: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Départ (Ville / Aéroport) *</label>
              <Combobox
                options={WORLD_CITIES}
                value={form.departure || 'Lomé (LFW)'}
                onChange={val => setForm({ ...form, departure: val })}
                placeholder="Ville ou aéroport de départ..."
                searchPlaceholder="Rechercher une ville, code IATA (ex: LFW, Paris)..."
                allowCustom={true}
              />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Destination (Ville / Aéroport) *</label>
              <Combobox
                options={WORLD_CITIES}
                value={form.destination || ''}
                onChange={val => setForm({ ...form, destination: val })}
                placeholder="Ville ou aéroport d'arrivée..."
                searchPlaceholder="Rechercher une ville, code IATA (ex: CDG, Abidjan)..."
                allowCustom={true}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Date du vol *</label>
              <input className="glass-input w-full" type="date" value={form.flightDate || ''} onChange={e => setForm({ ...form, flightDate: e.target.value })} required />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Numéro de vol</label>
              <input className="glass-input w-full" type="text" placeholder="Ex: KP024 / AF338" value={form.flightNumber || ''} onChange={e => setForm({ ...form, flightNumber: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 mt-2">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Prix du partenaire (Coût d'achat) *</label>
              <AmountInput 
                value={form.ticketPrice || 0} 
                onChangeAmount={val => setForm({ ...form, ticketPrice: val })} 
                placeholder="450000" 
                required 
              />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Prix de vente au client *</label>
              <AmountInput 
                value={form.amount || 0} 
                onChangeAmount={val => setForm({ ...form, amount: val })} 
                placeholder="500000" 
                required 
              />
            </div>
          </div>

          {/* Marge calculée automatiquement */}
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center justify-between mt-2">
            <span className="text-textMuted text-sm">Marge brute calculée (Masquée sur le reçu)</span>
            <span className={`font-bold text-lg ${computedMargin >= 0 ? 'text-accent' : 'text-danger'}`}>
              {computedMargin.toLocaleString('fr-FR')} XOF
            </span>
          </div>
        </>
      );
    }
  };

  // Filtered & Paginated operations
  const currentTabOperations = operations.filter(op => op.type === activeTab);
  
  const filteredOperations = currentTabOperations.filter(op => {
    const matchesSearch = 
      (op.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.passengerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.provider || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.client ? `${op.client.firstName} ${op.client.lastName}` : '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvider = filterProvider === 'ALL' || op.provider === filterProvider;
    const matchesSubType = filterSubType === 'ALL' || op.subType === filterSubType;

    return matchesSearch && matchesProvider && matchesSubType;
  });

  const totalPages = Math.ceil(filteredOperations.length / PAGE_SIZE) || 1;
  const paginatedOperations = filteredOperations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const clientOptions = [
    { value: '', label: 'Client Anonyme / Au comptoir' },
    ...clients.map(c => ({
      value: c.id,
      label: `${c.firstName} ${c.lastName}`,
      subLabel: c.phone || undefined
    }))
  ];

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center`}>
            {React.createElement(TAB_CONFIG[activeTab].icon, { className: `w-6 h-6 ${TAB_CONFIG[activeTab].color}` })}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">{TAB_CONFIG[activeTab].label}</h2>
            <p className="text-textMuted mt-0.5 text-sm">{filteredOperations.length} opération(s)</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => openForm(activeTab)}>
          <Plus className="w-4 h-4" /> Nouvelle opération
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {activeTab === 'MOBILE_MONEY' ? 'Nouvelle opération Mobile Money' : activeTab === 'CREDIT' ? 'Vente de crédit' : 'Réservation de billet d\'avion'}
            </h3>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl p-3.5 mb-4 text-sm flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {renderFormContent()}
              
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Client (optionnel)</label>
                <Combobox
                  options={clientOptions}
                  value={form.clientId || ''}
                  onChange={val => setForm({ ...form, clientId: val })}
                  placeholder="Sélectionner ou rechercher un client..."
                  searchPlaceholder="Rechercher par nom..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Traitement...' : 'Enregistrer l\'opération'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edition */}
      {editingOp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-6">Modifier l'opération</h3>
            {editError && <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 mb-4 text-sm">{editError}</div>}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Montant</label>
                <AmountInput value={editForm.amount || 0} onChangeAmount={val => setEditForm({ ...editForm, amount: val })} required />
              </div>
              {editingOp.type === 'TICKET' && (
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Prix partenaire (Coût d'achat)</label>
                  <AmountInput value={editForm.ticketPrice || 0} onChangeAmount={val => setEditForm({ ...editForm, ticketPrice: val })} />
                </div>
              )}
              {editingOp.phone !== undefined && (
                <div>
                  <label className="block text-textMuted text-sm mb-1.5">Numéro de téléphone</label>
                  <PhoneInput value={editForm.phone || ''} onChange={val => setEditForm({ ...editForm, phone: val })} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setEditingOp(null)}>Annuler</button>
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
            placeholder="Rechercher par téléphone, passager, client..." 
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        {activeTab === 'MOBILE_MONEY' && (
          <div className="flex gap-3">
            <select 
              className="glass-input text-sm" 
              value={filterSubType} 
              onChange={e => { setFilterSubType(e.target.value); setCurrentPage(1); }}
            >
              <option value="ALL">Tous les types</option>
              <option value="DEPOSIT">Dépôt</option>
              <option value="WITHDRAWAL">Retrait</option>
            </select>
          </div>
        )}
      </div>

      {/* Tableau des services */}
      <div className="glass-panel p-6">
        {loading ? (
          <div className="text-center py-16 text-textMuted">Chargement...</div>
        ) : paginatedOperations.length === 0 ? (
          <div className="text-center py-16 text-textMuted">Aucune opération trouvée.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-textMuted border-b border-white/10">
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Détails</th>
                    <th className="pb-3 pr-4">Montant</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Statut</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedOperations.map(op => (
                    <tr key={op.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4 text-white">
                        {op.type === 'MOBILE_MONEY' ? 'Mobile Money' : op.type === 'CREDIT' ? 'Crédit' : 'Billet Vol'}
                        <div className="text-xs text-textMuted">{op.provider}</div>
                      </td>
                      <td className="py-4 pr-4 text-white">
                        {op.type === 'MOBILE_MONEY' && <span>{op.subType === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} - {op.phone}</span>}
                        {op.type === 'CREDIT' && <span>Recharge - {op.phone}</span>}
                        {op.type === 'TICKET' && <span>{op.passengerName} ({op.departure} ➔ {op.destination})</span>}
                      </td>
                      <td className="py-4 pr-4 text-white font-medium">
                        {op.amount.toLocaleString('fr-FR')} XOF
                        {op.type === 'TICKET' && op.commission && op.commission > 0 ? (
                          <span className="text-xs text-accent block">Marge: {op.commission.toLocaleString('fr-FR')} XOF</span>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4 text-textMuted">
                        {new Date(op.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {op.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => openEditModal(op)}
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
                  Page {currentPage} sur {totalPages} ({filteredOperations.length} éléments)
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
