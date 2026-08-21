import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import {
  Vault, PlusCircle, ArrowDownToLine, ArrowUpFromLine,
  History, AlertCircle, CheckCircle2, RefreshCcw,
  ChevronLeft, ChevronRight, Search, Smartphone, CreditCard,
  TrendingDown, Building2, DollarSign, Filter
} from 'lucide-react';
import { AmountInput } from './ui/AmountInput';
import { Combobox } from './ui/Combobox';

const HISTORY_PAGE_SIZE = 5;

type SupplyType = 'SUPPLY' | 'WITHDRAWAL' | 'DEPOSIT';

export const MainCashPage = () => {
  const [data, setData] = useState<{ mainCashBalance: number; supplies: any[] } | null>(null);
  const [liveBalances, setLiveBalances] = useState<{ providers: any[]; cashRegisters?: any[]; currencies?: any[]; balances: Record<string, any> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active panel: 'deposit' | 'supply' | 'withdraw'
  const [activePanel, setActivePanel] = useState<'deposit' | 'supply' | 'withdraw'>('deposit');

  // Deposit form
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositLoading, setDepositLoading] = useState(false);

  // Supply form
  const [supplyAmount, setSupplyAmount] = useState<number>(0);
  const [supplyService, setSupplyService] = useState('');
  const [supplyMotif, setSupplyMotif] = useState('');
  const [supplyLoading, setSupplyLoading] = useState(false);
  // For forex supply
  const [supplyForeignAmount, setSupplyForeignAmount] = useState<number>(0);
  const [supplyForeignCurrency, setSupplyForeignCurrency] = useState('');
  const [supplyExchangerName, setSupplyExchangerName] = useState('');

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawMotif, setWithdrawMotif] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // History filters & pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<SupplyType | 'ALL'>('ALL');
  const [historySearch, setHistorySearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [cashData, balances] = await Promise.all([
        api.getMainCash(),
        api.getLiveBalances().catch(() => null)
      ]);
      setData(cashData);
      if (balances) setLiveBalances(balances);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh without spinner — used after supply/deposit/withdraw operations
  const silentRefresh = async () => {
    try {
      const [cashData, balances] = await Promise.all([
        api.getMainCash(),
        api.getLiveBalances().catch(() => null)
      ]);
      setData(cashData);
      if (balances) setLiveBalances(balances);
    } catch { /* silent */ }
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  // Build service options from live providers & currencies (no static dummy choices)
  const serviceOptions = useMemo(() => {
    const base = [{ value: 'XOF', label: 'Caisse XOF — Espèces', badge: 'XOF' }];
    if (!liveBalances) return base;

    const mmProviders = (liveBalances.providers || [])
      .filter((p: any) => p.type === 'MOBILE_MONEY')
      .map((p: any) => ({
        value: `MM_${p.id}`,
        label: `Mobile Money — ${p.name}`,
        badge: 'MM',
        rawId: p.id,
        providerType: 'MOBILE_MONEY'
      }));

    const creditProviders = (liveBalances.providers || [])
      .filter((p: any) => p.type === 'CREDIT')
      .map((p: any) => ({
        value: `CR_${p.id}`,
        label: `Crédit — ${p.name}`,
        badge: 'CR',
        rawId: p.id,
        providerType: 'CREDIT'
      }));

    const currRegisters = (liveBalances.cashRegisters || [])
      .filter((cr: any) => cr.currencyId !== 'XOF')
      .map((cr: any) => ({
        value: `CURR_${cr.currencyId}`,
        label: `Caisse Devise — ${cr.currencyId} (${cr.currency?.name || cr.currency?.symbol || cr.currencyId})`,
        badge: cr.currencyId,
        currencyCode: cr.currencyId,
        isForex: true
      }));

    const registeredCodes = new Set((liveBalances.cashRegisters || []).map((cr: any) => cr.currencyId));
    const otherCurrencies = (liveBalances.currencies || [])
      .filter((c: any) => c.code !== 'XOF' && !registeredCodes.has(c.code))
      .map((c: any) => ({
        value: `CURR_${c.code}`,
        label: `Caisse Devise — ${c.code} (${c.name || c.symbol || c.code})`,
        badge: c.code,
        currencyCode: c.code,
        isForex: true
      }));

    return [...base, ...mmProviders, ...creditProviders, ...currRegisters, ...otherCurrencies];
  }, [liveBalances]);

  // Detect if selected service is a forex/currency target
  const isForexService = (service: string) => {
    return service?.startsWith('CURR_') || (Boolean(service) && service !== 'XOF' && !service.startsWith('MM_') && !service.startsWith('CR_'));
  };

  const getForexCode = (service: string) => {
    if (!service) return '';
    if (service.startsWith('CURR_')) return service.replace('CURR_', '');
    if (service !== 'XOF' && !service.startsWith('MM_') && !service.startsWith('CR_')) return service;
    return '';
  };

  const handleServiceSelect = (val: string) => {
    setSupplyService(val);
    const forexCode = getForexCode(val);
    if (forexCode) {
      setSupplyForeignCurrency(forexCode);
    }
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
      showSuccess('Dépôt enregistré avec succès dans la Caisse Principale.');
      silentRefresh();
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
    if (!supplyService) {
      setError("Veuillez sélectionner le service ou compte à approvisionner.");
      return;
    }

    const isForex = isForexService(supplyService);
    const forexCode = getForexCode(supplyService) || supplyForeignCurrency;

    if (isForex) {
      if (!supplyExchangerName.trim()) {
        setError("Veuillez préciser le nom de l'échangeur / cambiste de devises.");
        return;
      }
      if (!forexCode) {
        setError("Veuillez préciser la devise ciblée.");
        return;
      }
      if (!supplyForeignAmount || supplyForeignAmount <= 0) {
        setError("Veuillez indiquer le montant équivalent en devise reçu.");
        return;
      }
    }

    setSupplyLoading(true);
    setError('');
    try {
      await api.supplyCashierService({
        amount: supplyAmount,
        targetService: isForex ? forexCode : supplyService,
        motif: supplyMotif || undefined,
        foreignAmount: isForex ? supplyForeignAmount : undefined,
        foreignCurrency: isForex ? forexCode : undefined,
        exchangerName: isForex ? supplyExchangerName.trim() : undefined,
      });
      setSupplyAmount(0);
      setSupplyForeignAmount(0);
      setSupplyForeignCurrency('');
      setSupplyExchangerName('');
      setSupplyMotif('');
      setSupplyService('');
      showSuccess(`Approvisionnement effectué avec succès.`);
      silentRefresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSupplyLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError("Veuillez saisir un montant de sortie supérieur à 0.");
      return;
    }
    if (!withdrawMotif.trim() || withdrawMotif.trim().length < 3) {
      setError("Veuillez préciser le motif de la sortie de caisse (minimum 3 caractères).");
      return;
    }
    setWithdrawLoading(true);
    setError('');
    try {
      await api.withdrawMainCash({ amount: withdrawAmount, motif: withdrawMotif.trim() });
      setWithdrawAmount(0);
      setWithdrawMotif('');
      showSuccess('Sortie de caisse enregistrée avec succès.');
      silentRefresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  // Filtered & paginated history (strict 5 per page)
  const filteredHistory = useMemo(() => {
    if (!data?.supplies) return [];
    return data.supplies.filter(s => {
      if (historyFilter !== 'ALL' && s.type !== historyFilter) return false;
      if (historySearch) {
        const search = historySearch.toLowerCase();
        const target = (s.targetService || '').toLowerCase();
        const user = (s.user?.name || '').toLowerCase();
        const motif = (s.motif || '').toLowerCase();
        const exchanger = (s.exchangerName || '').toLowerCase();
        const currency = (s.foreignCurrency || '').toLowerCase();
        if (!target.includes(search) && !user.includes(search) && !motif.includes(search) && !exchanger.includes(search) && !currency.includes(search)) return false;
      }
      return true;
    });
  }, [data?.supplies, historyFilter, historySearch]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const pagedHistory = filteredHistory.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  const formatLabel = (entry: any) => {
    if (entry.targetService === 'DEPOSIT_MAIN_CASH') return 'Dépôt — Alimentation Caisse Principale';
    if (entry.targetService === 'WITHDRAWAL_MAIN_CASH' || entry.type === 'WITHDRAWAL') {
      return `Sortie de caisse${entry.motif ? ` — ${entry.motif}` : ''}`;
    }
    if (entry.targetService === 'XOF') return 'Approvisionnement — Caisse XOF (Espèces)';
    if (entry.targetService?.startsWith('MM_') || entry.targetService?.startsWith('CR_')) {
      const providerId = entry.targetService.replace(/^(MM_|CR_)/, '');
      const provider = liveBalances?.providers?.find((p: any) => p.id === providerId);
      const prefix = entry.targetService.startsWith('MM_') ? 'Mobile Money' : 'Crédit';
      return `Approvisionnement ${prefix} — ${provider?.name || providerId}`;
    }
    if (entry.foreignCurrency || entry.foreignAmount) {
      return `Approvisionnement Devise — ${entry.foreignCurrency || entry.targetService}`;
    }
    return `Approvisionnement — ${entry.targetService}`;
  };

  const getTypeColor = (entry: any) => {
    if (entry.type === 'DEPOSIT' || entry.targetService === 'DEPOSIT_MAIN_CASH') return 'text-emerald-400';
    if (entry.type === 'WITHDRAWAL' || entry.targetService === 'WITHDRAWAL_MAIN_CASH') return 'text-rose-400';
    return 'text-blue-400';
  };

  const getTypeSign = (entry: any) => {
    if (entry.type === 'DEPOSIT' || entry.targetService === 'DEPOSIT_MAIN_CASH') return '+';
    return '−';
  };

  const getTypeBadge = (entry: any) => {
    if (entry.type === 'DEPOSIT' || entry.targetService === 'DEPOSIT_MAIN_CASH') return { label: 'Dépôt', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (entry.type === 'WITHDRAWAL' || entry.targetService === 'WITHDRAWAL_MAIN_CASH') return { label: 'Sortie', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    return { label: 'Appro.', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  };

  // Providers & Currencies for live balance display
  // Only show MM/Credits with balance > 0; only show currencies with balance > 0
  const mmProviders = (liveBalances?.providers || [])
    .filter((p: any) => p.type === 'MOBILE_MONEY')
    .filter((p: any) => {
      const bal = liveBalances?.balances?.[`mm_${p.id}`];
      return bal && bal.xofBalance > 0;
    });
  const creditProviders = (liveBalances?.providers || [])
    .filter((p: any) => p.type === 'CREDIT')
    .filter((p: any) => {
      const bal = liveBalances?.balances?.[`cr_${p.id}`];
      return bal && bal.xofBalance > 0;
    });
  const currencyRegisters = (liveBalances?.cashRegisters || []).filter((cr: any) => cr.currencyId !== 'XOF' && Number(cr.balance) > 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <Vault className="text-amber-400 w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Caisse Principale</h1>
          <p className="text-textMuted text-sm">Gérez les fonds de réserve, approvisionnements et sorties</p>
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

      {/* Balance card — main + live sub-accounts */}
      {loading ? (
        <div className="glass-panel p-8 rounded-xl flex items-center justify-center text-textMuted">
          <span className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin mr-3" />
          Chargement...
        </div>
      ) : data && (
        <div className="space-y-4">
          {/* Main XOF Balance */}
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <p className="text-textMuted text-sm mb-1 flex items-center gap-2">
              <Vault className="w-4 h-4 text-amber-400" /> Solde disponible — Caisse Principale (XOF)
            </p>
            <p className="text-4xl font-extrabold text-amber-300 font-mono">
              {fmt(data.mainCashBalance)} <span className="text-base font-semibold text-textMuted">FCFA</span>
            </p>
          </div>

          {/* Live sub-balances */}
          {liveBalances && (currencyRegisters.length > 0 || mmProviders.length > 0 || creditProviders.length > 0) && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-textMuted uppercase tracking-wider">
                Soldes des comptes & caisses en direct
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Devises présentes */}
                {currencyRegisters.map((cr: any) => (
                  <div key={cr.id} className="glass-panel p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                      {cr.currency?.symbol || cr.currencyId}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{cr.currency?.name || cr.currencyId}</p>
                      <p className="text-blue-400/80 text-xs font-medium">Caisse Devise ({cr.currencyId})</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-bold font-mono text-sm">{fmt(cr.balance)}</p>
                      <p className="text-textMuted text-xs font-semibold">{cr.currencyId}</p>
                    </div>
                  </div>
                ))}
                {/* Mobile Money balances */}
                {mmProviders.map((p: any) => {
                  const key = `mm_${p.id}`;
                  const bal = liveBalances.balances?.[key];
                  return (
                    <div key={p.id} className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: p.color || '#eab308' }}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-textMuted text-xs">Mobile Money</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold font-mono text-sm">{fmt(bal?.xofBalance || 0)}</p>
                        <p className="text-textMuted text-xs">FCFA</p>
                      </div>
                    </div>
                  );
                })}
                {/* Crédit balances */}
                {creditProviders.map((p: any) => {
                  const key = `cr_${p.id}`;
                  const bal = liveBalances.balances?.[key];
                  return (
                    <div key={p.id} className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: p.color || '#3b82f6' }}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-textMuted text-xs">Crédit Communication</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold font-mono text-sm">{fmt(bal?.xofBalance || 0)}</p>
                        <p className="text-textMuted text-xs">FCFA</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action tabs */}
      <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActivePanel('deposit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activePanel === 'deposit' ? 'bg-emerald-600 text-white' : 'text-textMuted hover:text-white'}`}
        >
          <PlusCircle className="w-4 h-4" /> Dépôt
        </button>
        <button
          onClick={() => setActivePanel('supply')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activePanel === 'supply' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
        >
          <ArrowDownToLine className="w-4 h-4" /> Approvisionnement
        </button>
        <button
          onClick={() => setActivePanel('withdraw')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activePanel === 'withdraw' ? 'bg-rose-600 text-white' : 'text-textMuted hover:text-white'}`}
        >
          <ArrowUpFromLine className="w-4 h-4" /> Sortie de caisse
        </button>
      </div>

      {/* Panel: Deposit */}
      {activePanel === 'deposit' && (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 animate-in fade-in duration-200">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2 text-lg">
            <PlusCircle className="w-5 h-5 text-emerald-400" /> Alimenter la Caisse Principale
          </h2>
          <p className="text-textMuted text-sm mb-5">Ajoutez des fonds à la réserve centrale (ex: apport de capital, remise de fonds).</p>
          <form onSubmit={handleDeposit} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Montant (FCFA)</label>
              <AmountInput value={depositAmount} onChangeAmount={setDepositAmount} placeholder="0" className="glass-input w-full font-mono text-base text-white" />
            </div>
            <button type="submit" disabled={depositLoading} className="btn-primary w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 cursor-pointer">
              {depositLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Confirmer le dépôt
            </button>
          </form>
        </div>
      )}

      {/* Panel: Supply */}
      {activePanel === 'supply' && (
        <div className="glass-panel p-6 rounded-2xl border border-primary/20 animate-in fade-in duration-200">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2 text-lg">
            <ArrowDownToLine className="w-5 h-5 text-primary" /> Approvisionner un Service / Compte
          </h2>
          <p className="text-textMuted text-sm mb-5">Transférez des fonds de la caisse principale vers un compte Mobile Money, Crédit, ou devise.</p>
          <form onSubmit={handleSupply} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Service ou compte cible *</label>
              <Combobox
                options={serviceOptions}
                value={supplyService}
                onChange={handleServiceSelect}
                placeholder="Sélectionner le service ou la devise à approvisionner..."
                searchPlaceholder="Rechercher Mobile Money, Crédit, Devise, XOF..."
              />
            </div>

            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">
                {isForexService(supplyService) ? 'Montant XOF déboursé (décrémenté du solde principal) *' : 'Montant (FCFA) *'}
              </label>
              <AmountInput value={supplyAmount} onChangeAmount={setSupplyAmount} placeholder="0" className="glass-input w-full font-mono text-base text-white" />
            </div>

            {/* Fields specific to forex supply */}
            {supplyService && isForexService(supplyService) && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                <p className="text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Détails de l'approvisionnement en devise
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textMuted text-xs mb-1.5 font-medium">Échangeur / Cambiste *</label>
                    <input
                      type="text"
                      required
                      className="glass-input w-full text-sm"
                      value={supplyExchangerName}
                      onChange={e => setSupplyExchangerName(e.target.value)}
                      placeholder="Ex: Cambiste Central, Marché..."
                    />
                  </div>
                  <div>
                    <label className="block text-textMuted text-xs mb-1.5 font-medium">Devise cible *</label>
                    <input
                      type="text"
                      required
                      className="glass-input w-full uppercase font-mono text-sm"
                      value={supplyForeignCurrency || getForexCode(supplyService)}
                      onChange={e => setSupplyForeignCurrency(e.target.value.toUpperCase())}
                      placeholder="USD, EUR, GBP..."
                      maxLength={5}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-textMuted text-xs mb-1.5 font-medium">
                    Montant équivalent en devise reçu (crédité sur la caisse {supplyForeignCurrency || getForexCode(supplyService) || 'devise'}) *
                  </label>
                  <AmountInput value={supplyForeignAmount} onChangeAmount={setSupplyForeignAmount} placeholder="0" className="glass-input w-full font-mono text-base text-white" />
                </div>
                {supplyAmount > 0 && supplyForeignAmount > 0 && (
                  <div className="p-2.5 bg-blue-500/15 border border-blue-500/25 rounded-lg text-xs text-blue-200 flex items-center justify-between">
                    <span>Taux de change implicite :</span>
                    <span className="font-mono font-bold text-white">
                      1 {supplyForeignCurrency || getForexCode(supplyService) || 'DEV'} = {(supplyAmount / supplyForeignAmount).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} XOF
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Motif / Commentaire (optionnel)</label>
              <input
                type="text"
                className="glass-input w-full text-sm"
                value={supplyMotif}
                onChange={e => setSupplyMotif(e.target.value)}
                placeholder="Ex: Recharge opérateur, Achat de devises..."
              />
            </div>

            <button type="submit" disabled={supplyLoading} className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer">
              {supplyLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
              Effectuer l'approvisionnement
            </button>
          </form>
        </div>
      )}

      {/* Panel: Withdraw */}
      {activePanel === 'withdraw' && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 animate-in fade-in duration-200">
          <h2 className="text-white font-bold mb-1 flex items-center gap-2 text-lg">
            <ArrowUpFromLine className="w-5 h-5 text-rose-400" /> Sortie de Caisse Principale
          </h2>
          <p className="text-textMuted text-sm mb-5">Enregistrez une sortie de fonds de la caisse principale (remboursement, dépenses, etc.).</p>
          <form onSubmit={handleWithdraw} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Montant à sortir (FCFA) *</label>
              <AmountInput value={withdrawAmount} onChangeAmount={setWithdrawAmount} placeholder="0" className="glass-input w-full font-mono text-base text-white" />
            </div>
            <div>
              <label className="block text-textMuted text-xs uppercase tracking-wider mb-2">Motif de la sortie *</label>
              <input
                type="text"
                required
                className="glass-input w-full"
                value={withdrawMotif}
                onChange={e => setWithdrawMotif(e.target.value)}
                placeholder="Ex: Remboursement fournisseur, Dépenses de bureau..."
              />
              <p className="text-xs text-textMuted mt-1">Minimum 3 caractères, obligatoire</p>
            </div>
            <button type="submit" disabled={withdrawLoading} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50">
              {withdrawLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <TrendingDown className="w-4 h-4" />}
              Confirmer la sortie de caisse
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {data && (
        <div className="glass-panel p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="text-white font-bold flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-textMuted" /> Historique des mouvements
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Type filter */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                {(['ALL', 'DEPOSIT', 'SUPPLY', 'WITHDRAWAL'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => { setHistoryFilter(type); setHistoryPage(1); }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${historyFilter === type ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
                  >
                    {type === 'ALL' ? 'Tous' : type === 'DEPOSIT' ? 'Dépôts' : type === 'SUPPLY' ? 'Appros.' : 'Sorties'}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted" />
                <input
                  type="text"
                  className="glass-input pl-8 pr-3 py-1.5 text-sm w-40"
                  placeholder="Rechercher..."
                  value={historySearch}
                  onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                />
              </div>
            </div>
          </div>

          {pagedHistory.length === 0 ? (
            <p className="text-textMuted text-sm text-center py-6">Aucun mouvement trouvé.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {pagedHistory.map((s: any) => {
                const badge = getTypeBadge(s);
                return (
                  <div key={s.id} className="flex items-start justify-between py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                        <p className="text-white text-sm font-medium truncate">{formatLabel(s)}</p>
                      </div>
                      <p className="text-textMuted text-xs mt-0.5">
                        {new Date(s.createdAt).toLocaleString('fr-FR')} — {s.user?.name || 'Système'}
                      </p>
                      {s.foreignAmount && s.foreignCurrency && (
                        <p className="text-blue-400 text-xs mt-0.5 font-mono">
                          → {s.foreignAmount.toLocaleString('fr-FR')} {s.foreignCurrency}
                          {s.exchangerName && ` (via ${s.exchangerName})`}
                        </p>
                      )}
                    </div>
                    <div className={`text-sm font-bold font-mono ${getTypeColor(s)} shrink-0`}>
                      {getTypeSign(s)}{fmt(s.amount)} FCFA
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
              <span className="text-textMuted text-xs">
                Page {historyPage} / {totalPages} ({filteredHistory.length} entrées)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => p - 1)}
                  className="btn-ghost p-1.5 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setHistoryPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${historyPage === p ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={historyPage === totalPages}
                  onClick={() => setHistoryPage(p => p + 1)}
                  className="btn-ghost p-1.5 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
