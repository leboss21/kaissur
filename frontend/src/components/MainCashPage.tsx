import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Vault, PlusCircle, ArrowDownToLine, History, AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { AmountInput } from './ui/AmountInput';

const SERVICE_OPTIONS = [
  { value: 'XOF', label: 'Caisse XOF (espèces)' },
  { value: 'TMONEY', label: 'T-Money' },
  { value: 'FLOOZ', label: 'Flooz (Moov)' },
  { value: 'MOOV', label: 'Moov Money' },
  { value: 'YAS', label: 'YAS' },
  { value: 'CR_TOGOCEL', label: 'Crédit Togocel' },
  { value: 'CR_MOOV', label: 'Crédit Moov' },
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'Livre Sterling (GBP)' },
  { value: 'CNY', label: 'Yuan (CNY)' },
];

export const MainCashPage = () => {
  const [data, setData] = useState<{ mainCashBalance: number; supplies: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Deposit form
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositLoading, setDepositLoading] = useState(false);

  // Supply form
  const [supplyAmount, setSupplyAmount] = useState<number>(0);
  const [supplyService, setSupplyService] = useState('XOF');
  const [supplyLoading, setSupplyLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getMainCash();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || depositAmount <= 0) {
      setError('Veuillez saisir un montant de dépôt supérieur à 0.');
      return;
    }
    setDepositLoading(true);
    setError('');
    try {
      await api.depositMainCash(depositAmount);
      setDepositAmount(0);
      showSuccess('Dépôt enregistré avec succès.');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyAmount || supplyAmount <= 0) {
      setError("Veuillez saisir un montant d'approvisionnement supérieur à 0.");
      return;
    }
    setSupplyLoading(true);
    setError('');
    try {
      await api.supplyCashierService({ amount: supplyAmount, targetService: supplyService });
      setSupplyAmount(0);
      showSuccess(`Approvisionnement ${supplyService} effectué avec succès.`);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSupplyLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  const formatLabel = (entry: any) => {
    if (entry.targetService === 'DEPOSIT_MAIN_CASH') return 'Dépôt Caisse Principale';
    const opt = SERVICE_OPTIONS.find(s => s.value === entry.targetService);
    return `Approvisionnement — ${opt?.label || entry.targetService}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <Vault className="text-amber-400 w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Caisse Principale</h1>
          <p className="text-textMuted text-sm">Gérez les fonds de réserve et les approvisionnements</p>
        </div>
        <button onClick={load} className="ml-auto btn-ghost flex items-center gap-2">
          <RefreshCcw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5" /> {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Balance card */}
      {loading ? (
        <div className="glass-panel p-8 rounded-xl flex items-center justify-center text-textMuted">
          <span className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin mr-3" />
          Chargement...
        </div>
      ) : data && (
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <p className="text-textMuted text-sm mb-1">Solde disponible — Caisse Principale</p>
          <p className="text-4xl font-extrabold text-amber-300">{fmt(data.mainCashBalance)} <span className="text-base font-semibold text-textMuted">FCFA</span></p>
        </div>
      )}

      {/* Action cards */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Deposit */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2 text-lg">
            <PlusCircle className="w-5 h-5 text-emerald-400" /> Alimenter la Caisse Principale
          </h2>
          <p className="text-textMuted text-sm mb-5">Ajoutez des fonds à la réserve centrale (ex: apport de capital).</p>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Montant (FCFA)</label>
              <AmountInput
                value={depositAmount}
                onChangeAmount={val => setDepositAmount(val)}
                placeholder="0"
                className="glass-input w-full font-mono text-base text-white"
              />
            </div>
            <button type="submit" disabled={depositLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {depositLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Confirmer le dépôt
            </button>
          </form>
        </div>

        {/* Supply */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2 text-lg">
            <ArrowDownToLine className="w-5 h-5 text-primary" /> Approvisionner un Service
          </h2>
          <p className="text-textMuted text-sm mb-5">Transférer des fonds vers un service (caisse, Mobile Money, crédit…).</p>
          <form onSubmit={handleSupply} className="space-y-4">
            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Service cible</label>
              <select
                className="glass-input w-full bg-slate-900"
                value={supplyService}
                onChange={e => setSupplyService(e.target.value)}
              >
                {SERVICE_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Montant (FCFA)</label>
              <AmountInput
                value={supplyAmount}
                onChangeAmount={val => setSupplyAmount(val)}
                placeholder="0"
                className="glass-input w-full font-mono text-base text-white"
              />
            </div>
            <button type="submit" disabled={supplyLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {supplyLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
              Effectuer l'approvisionnement
            </button>
          </form>
        </div>
      </div>

      {/* History */}
      {data && (
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-textMuted" /> Historique des mouvements
          </h2>
          {data.supplies.length === 0 ? (
            <p className="text-textMuted text-sm text-center py-6">Aucun mouvement enregistré.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {data.supplies.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{formatLabel(s)}</p>
                    <p className="text-textMuted text-xs mt-0.5">
                      {new Date(s.createdAt).toLocaleString('fr-FR')} — {s.user?.name || 'Système'}
                    </p>
                  </div>
                  <div className={`text-sm font-bold ${s.targetService === 'DEPOSIT_MAIN_CASH' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {s.targetService === 'DEPOSIT_MAIN_CASH' ? '+' : '-'}{fmt(s.amount)} FCFA
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
