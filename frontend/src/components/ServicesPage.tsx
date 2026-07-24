import React, { useState, useEffect } from 'react';
import { Smartphone, Plane, Plus, Phone } from 'lucide-react';
import { api } from '../lib/api';
import { generateReceiptPDF } from '../lib/pdfGenerator';
import { AmountInput } from './ui/AmountInput';
import { PhoneInput } from './ui/PhoneInput';
import type { ServiceOperation, Client, CreateServiceOperationPayload, ServiceProvider } from '../lib/api';

const DEMO_ENTREPRISE_ID = 'demo-tenant';

type TabType = 'MOBILE_MONEY' | 'CREDIT' | 'TICKET';

const TAB_CONFIG: Record<TabType, { label: string; icon: React.ElementType; color: string }> = {
  MOBILE_MONEY: { label: 'Mobile Money', icon: Smartphone, color: 'text-yellow-400' },
  CREDIT: { label: 'Crédit de Communication', icon: Phone, color: 'text-blue-400' },
  TICKET: { label: 'Billetterie', icon: Plane, color: 'text-purple-400' },
};

/** Returns a tailwind-safe active class based on a hex color (fallback to generic). */
function providerActiveClass(color?: string) {
  return 'ring-2 ring-white/60 bg-white/20';
}

export const ServicesPage = ({ defaultTab = 'MOBILE_MONEY' }: { defaultTab?: TabType }) => {
  const [operations, setOperations] = useState<ServiceOperation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<Partial<CreateServiceOperationPayload>>({});

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

  // When the route changes (defaultTab changes), reset the active tab
  useEffect(() => { setActiveTab(defaultTab); setForm({ type: defaultTab }); }, [defaultTab]);

  const openForm = (tab: TabType) => {
    setActiveTab(tab);
    setForm({ type: tab });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, type: activeTab, clientId: form.clientId || undefined } as CreateServiceOperationPayload;
      const result = await api.createServiceOperation(payload, DEMO_ENTREPRISE_ID);
      setOperations([result, ...operations]);
      setShowForm(false);
      setForm({});

      if (result.receipt) {
        const receiptData = await api.getReceiptDetails(result.receipt.id);
        generateReceiptPDF(receiptData, false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /** Render dynamic operator buttons for a given type */
  const renderProviderButtons = (type: 'MOBILE_MONEY' | 'CREDIT') => {
    const typeProviders = providers.filter(p => p.type === type);

    if (typeProviders.length === 0) {
      return (
        <p className="text-textMuted text-sm col-span-2 italic">
          Aucun opérateur configuré. Ajoutez-en dans les{' '}
          <span className="text-primary">Paramètres → Opérateurs de Services</span>.
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
            isActive
              ? 'border-transparent'
              : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
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
              <select className="glass-input w-full" value={form.subType || ''} onChange={e => setForm({ ...form, subType: e.target.value })} required>
                <option value="">Sélectionner...</option>
                <option value="DEPOSIT">Dépôt</option>
                <option value="WITHDRAWAL">Retrait</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Numéro de téléphone *</label>
              <PhoneInput value={form.phone || ''} onChange={val => setForm({ ...form, phone: val })} />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Montant *</label>
              <AmountInput value={form.amount || 0} onChangeAmount={val => setForm({ ...form, amount: val })} placeholder="10000" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Frais (optionnel)</label>
              <AmountInput value={form.fees || 0} onChangeAmount={val => setForm({ ...form, fees: val })} placeholder="100" />
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
          </div>
          <div>
            <label className="block text-textMuted text-sm mb-1.5">Montant de la recharge *</label>
            <AmountInput value={form.amount || 0} onChangeAmount={val => setForm({ ...form, amount: val })} placeholder="1000" required />
          </div>
        </>
      );
    }

    if (activeTab === 'TICKET') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Compagnie Aérienne *</label>
              <select className="glass-input w-full" value={form.airline || ''} onChange={e => setForm({ ...form, airline: e.target.value })} required>
                <option value="">Sélectionner...</option>
                <option value="ASKY">Asky Airlines</option>
                <option value="AIR_FRANCE">Air France</option>
                <option value="ETHIOPIAN">Ethiopian Airlines</option>
                <option value="AIR_COTE_D_IVOIRE">Air Côte d'Ivoire</option>
                <option value="ROYAL_AIR_MAROC">Royal Air Maroc</option>
                <option value="BRUSSELS_AIRLINES">Brussels Airlines</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Nom du passager *</label>
              <input className="glass-input w-full" type="text" placeholder="John Doe" value={form.passengerName || ''} onChange={e => setForm({ ...form, passengerName: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Départ (Ville / Aéroport) *</label>
              <input
                className="glass-input w-full uppercase"
                type="text"
                list="airports-list"
                placeholder="ex: LFW - Lomé"
                value={form.departure || 'LFW - Lomé'}
                onChange={e => setForm({ ...form, departure: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Destination (Ville / Aéroport) *</label>
              <input
                className="glass-input w-full uppercase"
                type="text"
                list="airports-list"
                placeholder="ex: CDG - Paris"
                value={form.destination || ''}
                onChange={e => setForm({ ...form, destination: e.target.value })}
                required
              />
            </div>
            <datalist id="airports-list">
              {/* Afrique de l'Ouest & Centrale */}
              <option value="LFW - Lomé (Togo)" />
              <option value="COO - Cotonou (Bénin)" />
              <option value="ABJ - Abidjan (Côte d'Ivoire)" />
              <option value="ACC - Accra (Ghana)" />
              <option value="DKR - Dakar (Sénégal)" />
              <option value="OUA - Ouagadougou (Burkina Faso)" />
              <option value="BKO - Bamako (Mali)" />
              <option value="NIM - Niamey (Niger)" />
              <option value="LOS - Lagos (Nigéria)" />
              <option value="ABV - Abuja (Nigéria)" />
              <option value="ROB - Monrovia (Libéria)" />
              <option value="FNA - Freetown (Sierra Leone)" />
              <option value="CKY - Conakry (Guinée)" />
              <option value="OXB - Bissau (Guinée-Bissau)" />
              <option value="RAI - Praia (Cap-Vert)" />
              <option value="DLA - Douala (Cameroun)" />
              <option value="NSI - Yaoundé (Cameroun)" />
              <option value="LBV - Libreville (Gabon)" />
              <option value="BZV - Brazzaville (Congo)" />
              <option value="PNR - Pointe-Noire (Congo)" />
              <option value="FIH - Kinshasa (RDC)" />
              <option value="FDU - Bandundu (RDC)" />
              <option value="NDJ - N'Djamena (Tchad)" />
              <option value="SSG - Malabo (Guinée Équatoriale)" />
              <option value="TMS - São Tomé (São Tomé-et-Príncipe)" />
              {/* Afrique du Nord, Est & Sud */}
              <option value="CMN - Casablanca (Maroc)" />
              <option value="TUN - Tunis (Tunisie)" />
              <option value="ALG - Alger (Algérie)" />
              <option value="CAI - Le Caire (Égypte)" />
              <option value="ADD - Addis-Abeba (Éthiopie)" />
              <option value="NBO - Nairobi (Kenya)" />
              <option value="EBB - Entebbe/Kampala (Ouganda)" />
              <option value="KGL - Kigali (Rwanda)" />
              <option value="DAR - Dar es Salaam (Tanzanie)" />
              <option value="JNB - Johannesburg (Afrique du Sud)" />
              <option value="CPT - Le Cap (Afrique du Sud)" />
              <option value="MRU - Maurice (Île Maurice)" />
              {/* Europe */}
              <option value="CDG - Paris Charles de Gaulle (France)" />
              <option value="ORY - Paris Orly (France)" />
              <option value="LYS - Lyon (France)" />
              <option value="MRS - Marseille (France)" />
              <option value="NCE - Nice (France)" />
              <option value="BRU - Bruxelles (Belgique)" />
              <option value="GVA - Genève (Suisse)" />
              <option value="ZRH - Zurich (Suisse)" />
              <option value="LHR - Londres Heathrow (Royaume-Uni)" />
              <option value="LGW - Londres Gatwick (Royaume-Uni)" />
              <option value="FRA - Francfort (Allemagne)" />
              <option value="MUC - Munich (Allemagne)" />
              <option value="AMS - Amsterdam (Pays-Bas)" />
              <option value="MAD - Madrid (Espagne)" />
              <option value="BCN - Barcelone (Espagne)" />
              <option value="LIS - Lisbonne (Portugal)" />
              <option value="FCO - Rome Fiumicino (Italie)" />
              <option value="MXP - Milan Malpensa (Italie)" />
              <option value="VIE - Vienne (Autriche)" />
              <option value="IST - Istanbul (Turquie)" />
              {/* Moyen-Orient & Asie */}
              <option value="DXB - Dubaï (Émirats Arabe Unis)" />
              <option value="AUH - Abou Dabi (Émirats Arabe Unis)" />
              <option value="DOH - Doha (Qatar)" />
              <option value="RUH - Riyad (Arabie Saoudite)" />
              <option value="JED - Djeddah (Arabie Saoudite)" />
              <option value="BOM - Mumbai (Inde)" />
              <option value="DEL - New Delhi (Inde)" />
              <option value="CAN - Guangzhou / Canton (Chine)" />
              <option value="PEK - Pékin (Chine)" />
              <option value="PVG - Shanghai (Chine)" />
              <option value="BKK - Bangkok (Thaïlande)" />
              {/* Amériques */}
              <option value="JFK - New York JFK (USA)" />
              <option value="EWR - New York Newark (USA)" />
              <option value="IAD - Washington Dulles (USA)" />
              <option value="ATL - Atlanta (USA)" />
              <option value="MIA - Miami (USA)" />
              <option value="ORD - Chicago O'Hare (USA)" />
              <option value="IAH - Houston (USA)" />
              <option value="YUL - Montréal (Canada)" />
              <option value="YYZ - Toronto (Canada)" />
              <option value="GRU - São Paulo (Brésil)" />
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Date du vol *</label>
              <input className="glass-input w-full" type="date" value={form.flightDate || ''} onChange={e => setForm({ ...form, flightDate: e.target.value })} required />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Numéro de vol</label>
              <input className="glass-input w-full" type="text" placeholder="AF123" value={form.flightNumber || ''} onChange={e => setForm({ ...form, flightNumber: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Prix de vente *</label>
              <AmountInput value={form.amount || 0} onChangeAmount={val => setForm({ ...form, amount: val, provider: form.provider || 'AIRLINE' })} placeholder="500000" required />
            </div>
            <div>
              <label className="block text-textMuted text-sm mb-1.5">Marge / Commission</label>
              <AmountInput value={form.commission || 0} onChangeAmount={val => setForm({ ...form, commission: val })} placeholder="15000" />
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center`}>
            {React.createElement(TAB_CONFIG[activeTab].icon, { className: `w-6 h-6 ${TAB_CONFIG[activeTab].color}` })}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">{TAB_CONFIG[activeTab].label}</h2>
            <p className="text-textMuted mt-0.5 text-sm">Nouvelle opération ou historique</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => openForm(activeTab)}>
          <Plus className="w-4 h-4" /> Nouvelle opération
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-6">
              {activeTab === 'MOBILE_MONEY' ? 'Nouvelle opération Mobile Money' : activeTab === 'CREDIT' ? 'Vente de crédit' : 'Réservation de billet'}
            </h3>
            {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {renderFormContent()}
              
              <div>
                <label className="block text-textMuted text-sm mb-1.5">Client (optionnel)</label>
                <select className="glass-input w-full" value={form.clientId || ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">Anonyme</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                  {submitting ? 'Traitement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau des services */}
      <div className="glass-panel p-6">
        {loading ? (
          <div className="text-center py-16 text-textMuted">Chargement...</div>
        ) : operations.filter(op => op.type === activeTab).length === 0 ? (
          <div className="text-center py-16 text-textMuted">Aucune opération pour le moment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-textMuted border-b border-white/10">
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Détails</th>
                  <th className="pb-3 pr-4">Montant</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {operations.filter(op => op.type === activeTab).map(op => (
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
                      {op.amount.toLocaleString()} XOF
                      {op.fees > 0 && <span className="text-xs text-textMuted block">+ {op.fees} frais</span>}
                      {op.commission && op.commission > 0 ? <span className="text-xs text-accent block">Marge: {op.commission}</span> : null}
                    </td>
                    <td className="py-4 pr-4 text-textMuted">
                      {new Date(op.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {op.status}
                      </span>
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
