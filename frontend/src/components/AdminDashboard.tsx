import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { DailyReport } from '../lib/api';
import {
  ArrowUpRight, ArrowDownRight, Wallet, Plane, Phone, Smartphone,
  TrendingUp, ChevronLeft, ChevronRight, RefreshCw, Calendar, BarChart3
} from 'lucide-react';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const PROVIDER_LABELS: Record<string, string> = {
  TMONEY: 'TMoney', FLOOZ: 'Flooz', MOOV: 'Moov', TOGOCEL: 'Togocel',
  ASKY: 'Asky Airlines', AIR_FRANCE: 'Air France', ETHIOPIAN: 'Ethiopian Airlines',
  AIR_COTE_D_IVOIRE: "Air Côte d'Ivoire", ROYAL_AIR_MAROC: 'Royal Air Maroc',
  BRUSSELS_AIRLINES: 'Brussels Airlines', OTHER: 'Autre',
};
const PROVIDER_COLORS: Record<string, string> = {
  TMONEY: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  FLOOZ: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  MOOV: 'bg-blue-400/20 text-blue-200 border-blue-400/30',
  TOGOCEL: 'bg-green-600/20 text-green-300 border-green-600/30',
};

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

/* ─── Daily Tab ─────────────────────────────────────────────── */
const DailyTab = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selected, setSelected] = useState<DailyReport | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.getReports().then(r => { setReports(r); setLoading(false); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selected?.reportData) {
      try { setParsed(JSON.parse(selected.reportData)); } catch { setParsed(null); }
    } else {
      setParsed(null);
    }
  }, [selected]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await api.generateReport();
      setReports([r, ...reports]);
      setSelected(r);
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="text-center py-16 text-textMuted">Chargement...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List panel */}
      <div className="glass-panel p-4 h-fit">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">Rapports générés</h3>
          <button onClick={handleGenerate} disabled={generating}
            className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
            <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '...' : "Générer"}
          </button>
        </div>
        {reports.length === 0
          ? <p className="text-textMuted text-sm text-center py-8">Aucun rapport. Cliquez sur Générer.</p>
          : <div className="space-y-2">
            {reports.map(r => (
              <button key={r.id} onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === r.id ? 'bg-primary/20 border-primary/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <div className="text-white font-medium text-sm">{new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                <div className="text-textMuted text-xs mt-0.5">Entrées: {fmt(r.totalExchangeIn)} XOF</div>
              </button>
            ))}
          </div>
        }
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-2 space-y-4">
        {!selected
          ? <div className="glass-panel p-8 text-center text-textMuted">Sélectionnez un rapport pour voir les détails</div>
          : <>
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold text-white mb-1">
                {new Date(selected.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-textMuted text-sm mb-5">Rapport journalier complet</p>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: ArrowUpRight, label: 'Entrées Change', value: fmt(selected.totalExchangeIn), unit: 'XOF', color: 'text-emerald-400' },
                  { icon: ArrowDownRight, label: 'Sorties Change', value: fmt(selected.totalExchangeOut), unit: 'XOF', color: 'text-rose-400' },
                  { icon: Smartphone, label: 'MM Dépôts', value: fmt(selected.totalMobileMoneyDeposits ?? 0), unit: 'XOF', color: 'text-yellow-400' },
                  { icon: Wallet, label: 'MM Retraits', value: fmt(selected.totalMobileMoneyWithdrawals ?? 0), unit: 'XOF', color: 'text-orange-400' },
                  { icon: Phone, label: 'Crédit', value: fmt(selected.totalCredit), unit: 'XOF', color: 'text-blue-400' },
                  { icon: Plane, label: 'Billets', value: fmt(selected.totalTickets), unit: 'XOF', color: 'text-purple-400' },
                  { icon: TrendingUp, label: 'Total Opérations', value: String((parsed?.summary?.totalTransactions ?? 0) + (parsed?.summary?.totalServiceOps ?? 0)), unit: 'ops', color: 'text-accent' },
                ].map((s, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                      <span className="text-textMuted text-xs">{s.label}</span>
                    </div>
                    <div className="text-white font-bold">{s.value} <span className="text-xs font-normal text-textMuted">{s.unit}</span></div>
                  </div>
                ))}
              </div>

              {/* Detailed breakdown */}
              {parsed?.breakdown && (
                <div className="space-y-4">
                  {/* Mobile Money */}
                  {Object.keys(parsed.breakdown.mobileMoneyByProvider).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Smartphone className="w-4 h-4 text-yellow-400" /> Mobile Money par opérateur</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(parsed.breakdown.mobileMoneyByProvider).map(([prov, data]: [string, any]) => (
                          <div key={prov} className={`rounded-xl border p-3 ${PROVIDER_COLORS[prov] || 'bg-white/5 text-white border-white/10'}`}>
                            <div className="font-bold">{PROVIDER_LABELS[prov] || prov}</div>
                            <div className="text-xs mt-1">Total: {fmt(data.total)} XOF · {data.count} op.</div>
                            <div className="text-xs">Dépôts: {fmt(data.deposits)} · Retraits: {fmt(data.withdrawals)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credit */}
                  {Object.keys(parsed.breakdown.creditByProvider).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Phone className="w-4 h-4 text-blue-400" /> Crédit par opérateur</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(parsed.breakdown.creditByProvider).map(([prov, data]: [string, any]) => (
                          <div key={prov} className={`rounded-xl border p-3 ${PROVIDER_COLORS[prov] || 'bg-white/5 text-white border-white/10'}`}>
                            <div className="font-bold">{PROVIDER_LABELS[prov] || prov}</div>
                            <div className="text-xs mt-1">Total: {fmt(data.total)} XOF · {data.count} op.</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tickets */}
                  {Object.keys(parsed.breakdown.ticketsByAirline).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><Plane className="w-4 h-4 text-purple-400" /> Billets par compagnie</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(parsed.breakdown.ticketsByAirline).map(([airline, data]: [string, any]) => (
                          <div key={airline} className="bg-purple-500/10 border border-purple-500/20 text-purple-200 rounded-xl p-3">
                            <div className="font-bold">{PROVIDER_LABELS[airline] || airline}</div>
                            <div className="text-xs mt-1">Ventes: {fmt(data.total)} XOF · {data.count} billet(s)</div>
                            <div className="text-xs">Commission: {fmt(data.commission)} XOF</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exchange */}
                  {Object.keys(parsed.breakdown.exchangeByCurrency).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-emerald-400" /> Change par paire de devises</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(parsed.breakdown.exchangeByCurrency).map(([pair, data]: [string, any]) => (
                          <div key={pair} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-xl p-3">
                            <div className="font-mono font-bold">{pair}</div>
                            <div className="text-xs mt-1">Entrée: {fmt(data.amountIn)} · Sortie: {fmt(data.amountOut)}</div>
                            <div className="text-xs">{data.count} transaction(s)</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Transactions de change ── */}
            {parsed?.transactions?.length > 0 && (
              <div className="glass-panel p-6">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  Transactions de change ({parsed.transactions.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-textMuted border-b border-white/10">
                        <th className="pb-2 pr-3">Heure</th>
                        <th className="pb-2 pr-3">Paire</th>
                        <th className="pb-2 pr-3">Remis</th>
                        <th className="pb-2 pr-3">Taux</th>
                        <th className="pb-2 pr-3">Reçu</th>
                        <th className="pb-2 pr-3">Caissier</th>
                        <th className="pb-2">Client</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsed.transactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-3 text-textMuted">{new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-2 pr-3 font-mono text-white">{t.fromCurrencyCode}→{t.toCurrencyCode}</td>
                          <td className="py-2 pr-3 text-white">{fmt(t.amountIn)} {t.fromCurrencyCode}</td>
                          <td className="py-2 pr-3 text-textMuted">{t.exchangeRate}</td>
                          <td className="py-2 pr-3 text-emerald-400 font-semibold">{fmt(t.amountOut)} {t.toCurrencyCode}</td>
                          <td className="py-2 pr-3 text-textMuted">{t.user?.name || '—'}</td>
                          <td className="py-2 text-textMuted">{t.client ? `${t.client.firstName} ${t.client.lastName}` : 'Anonyme'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Opérations de services ── */}
            {parsed?.serviceOperations?.length > 0 && (
              <div className="glass-panel p-6">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-yellow-400" />
                  Opérations de services ({parsed.serviceOperations.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-textMuted border-b border-white/10">
                        <th className="pb-2 pr-3">Heure</th>
                        <th className="pb-2 pr-3">Type</th>
                        <th className="pb-2 pr-3">Opérateur</th>
                        <th className="pb-2 pr-3">Détail</th>
                        <th className="pb-2 pr-3">Montant</th>
                        <th className="pb-2 pr-3">Frais</th>
                        <th className="pb-2">Caissier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsed.serviceOperations.map((op: any) => (
                        <tr key={op.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-2 pr-3 text-textMuted">{new Date(op.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-2 pr-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              op.type === 'MOBILE_MONEY' ? 'bg-yellow-500/15 text-yellow-300' :
                              op.type === 'CREDIT' ? 'bg-blue-500/15 text-blue-300' :
                              'bg-purple-500/15 text-purple-300'
                            }`}>
                              {op.type === 'MOBILE_MONEY' ? 'Mobile Money' : op.type === 'CREDIT' ? 'Crédit' : 'Billet'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-white">{PROVIDER_LABELS[op.provider] || op.provider}</td>
                          <td className="py-2 pr-3 text-textMuted">
                            {op.type === 'MOBILE_MONEY' && `${op.subType === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} – ${op.phone || ''}`}
                            {op.type === 'CREDIT' && op.phone}
                            {op.type === 'TICKET' && `${op.passengerName || ''} (${op.departure || ''}→${op.destination || ''})`}
                          </td>
                          <td className="py-2 pr-3 text-white font-semibold">{fmt(op.amount)} XOF</td>
                          <td className="py-2 pr-3 text-orange-400">{op.fees > 0 ? `${fmt(op.fees)} XOF` : '—'}</td>
                          <td className="py-2 text-textMuted">{op.user?.name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        }
      </div>
    </div>
  );
};

/* ─── Monthly Tab ────────────────────────────────────────────── */
const MonthlyTab = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = (y: number, m: number) => {
    setLoading(true);
    api.getMonthlyReport(y, m).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(year, month); }, []);

  const prev = () => {
    const newM = month === 1 ? 12 : month - 1;
    const newY = month === 1 ? year - 1 : year;
    setMonth(newM); setYear(newY); load(newY, newM);
  };
  const next = () => {
    const newM = month === 12 ? 1 : month + 1;
    const newY = month === 12 ? year + 1 : year;
    setMonth(newM); setYear(newY); load(newY, newM);
  };

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className="glass-panel p-4 flex items-center justify-between">
        <button onClick={prev} className="btn-ghost p-2"><ChevronLeft className="w-5 h-5" /></button>
        <h3 className="text-white font-bold text-lg">{MONTHS_FR[month - 1]} {year}</h3>
        <button onClick={next} className="btn-ghost p-2"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {loading
        ? <div className="text-center py-16 text-textMuted">Chargement...</div>
        : !data
          ? <div className="text-center py-16 text-textMuted">Aucune donnée pour cette période.</div>
          : <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: 'Change (entrées)', value: fmt(data.summary.totalExchangeIn), unit: 'XOF', color: 'text-emerald-400', icon: ArrowUpRight },
                { label: 'Change (sorties)', value: fmt(data.summary.totalExchangeOut), unit: 'XOF', color: 'text-rose-400', icon: ArrowDownRight },
                { label: 'Mobile Money', value: fmt(data.summary.totalMobileMoney), unit: 'XOF', color: 'text-yellow-400', icon: Smartphone },
                { label: 'Crédit', value: fmt(data.summary.totalCredit), unit: 'XOF', color: 'text-blue-400', icon: Phone },
                { label: 'Billets', value: fmt(data.summary.totalTickets), unit: 'XOF', color: 'text-purple-400', icon: Plane },
                { label: 'Commissions Billets', value: fmt(data.summary.totalCommission), unit: 'XOF', color: 'text-accent', icon: TrendingUp },
                { label: 'Frais collectés', value: fmt(data.summary.totalFees), unit: 'XOF', color: 'text-orange-400', icon: Wallet },
                { label: 'Opérations totales', value: fmt(data.summary.totalTransactions + data.summary.totalServiceOps), unit: 'ops', color: 'text-white', icon: BarChart3 },
              ].map((s, i) => (
                <div key={i} className="glass-panel p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-textMuted text-xs">{s.label}</span>
                  </div>
                  <div className="text-white font-bold text-lg">{s.value} <span className="text-xs font-normal text-textMuted">{s.unit}</span></div>
                </div>
              ))}
            </div>

            {/* Day-by-day breakdown */}
            {Object.keys(data.byDay).length > 0 && (
              <div className="glass-panel p-6">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" /> Activité jour par jour
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-textMuted border-b border-white/10">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Change (XOF)</th>
                        <th className="pb-3 pr-4">Mobile Money</th>
                        <th className="pb-3 pr-4">Crédit</th>
                        <th className="pb-3 pr-4">Billets</th>
                        <th className="pb-3">Frais</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {Object.entries(data.byDay)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([day, vals]: [string, any]) => (
                          <tr key={day} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4 text-white font-medium">
                              {new Date(day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </td>
                            <td className="py-3 pr-4 text-emerald-400 font-mono">{fmt(vals.exchanges)}</td>
                            <td className="py-3 pr-4 text-yellow-400 font-mono">{fmt(vals.mobileMoney)}</td>
                            <td className="py-3 pr-4 text-blue-400 font-mono">{fmt(vals.credit)}</td>
                            <td className="py-3 pr-4 text-purple-400 font-mono">{fmt(vals.tickets)}</td>
                            <td className="py-3 text-orange-400 font-mono">{fmt(vals.fees)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
      }
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
export const AdminDashboard = () => {
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Vue Direction</h2>
          <p className="text-textMuted mt-1">Rapports et supervision multi-caisses</p>
        </div>
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <button onClick={() => setTab('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'daily' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}>
            <Calendar className="w-4 h-4" /> Journalier
          </button>
          <button onClick={() => setTab('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'monthly' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}>
            <BarChart3 className="w-4 h-4" /> Mensuel
          </button>
        </div>
      </div>

      {tab === 'daily' ? <DailyTab /> : <MonthlyTab />}
    </div>
  );
};
