import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { DailyReport } from '../lib/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, Wallet, Plane, Phone, Smartphone,
  TrendingUp, Calendar, BarChart3, Lock, RefreshCw, Activity, Layers,
  Search, User, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null || isNaN(n as number)) return '0';
  return (n as number).toLocaleString('fr-FR');
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

/* ─── Tooltip personnalisé ──────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-white/20 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-textMuted">{p.name}:</span>
          <span className="text-white font-medium">{fmt(p.value)} XOF</span>
        </div>
      ))}
    </div>
  );
};

/* ─── KPI Card ──────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, unit, color, sub }: {
  icon: any; label: string; value: string; unit: string; color: string; sub?: string;
}) => (
  <div className="glass-panel p-4 border border-white/10 hover:border-white/20 transition-all">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-textMuted text-xs font-medium">{label}</span>
    </div>
    <div className="text-white font-bold text-xl">{value}</div>
    <div className="text-textMuted text-xs mt-0.5">{unit}{sub && <span className="ml-2 text-white/40">{sub}</span>}</div>
  </div>
);

/* ─── Section Statistiques Live avec graphes ────────────────── */
const LiveStatsSection = () => {
  const now = new Date();
  const [monthData, setMonthData] = useState<any>(null);
  const [prevMonthData, setPrevMonthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(now);

  const load = async () => {
    setLoading(true);
    try {
      const prevM = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const [curr, prev] = await Promise.all([
        api.getMonthlyReport(now.getFullYear(), now.getMonth() + 1),
        api.getMonthlyReport(prevY, prevM),
      ]);
      setMonthData(curr);
      setPrevMonthData(prev);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Today
  const todayKey = now.toISOString().substring(0, 10);
  const todayData = monthData?.byDay?.[todayKey] ?? null;

  // Chart data — day by day for current month, most recent last
  const chartDayData = Object.entries(monthData?.byDay ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]: [string, any]) => ({
      name: new Date(day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      Change: Math.round(v.exchanges),
      'Mobile Money': Math.round(v.mobileMoney),
      Crédit: Math.round(v.credit),
      Billets: Math.round(v.tickets),
      Frais: Math.round(v.fees),
    }));

  // Pie chart data — services breakdown for current month
  const summary = monthData?.summary ?? {};
  const pieData = [
    { name: 'Change', value: Math.round(summary.totalExchangeIn ?? 0), color: '#10b981' },
    { name: 'Mobile Money', value: Math.round(summary.totalMobileMoney ?? 0), color: '#eab308' },
    { name: 'Crédit', value: Math.round(summary.totalCredit ?? 0), color: '#3b82f6' },
    { name: 'Billets', value: Math.round(summary.totalTickets ?? 0), color: '#a855f7' },
  ].filter(d => d.value > 0);

  // Bar chart — current vs prev month comparison
  const compareData = [
    {
      name: 'Change',
      [MONTHS_FR[now.getMonth()]]: Math.round(summary.totalExchangeIn ?? 0),
      [MONTHS_FR[prevMonthData ? (now.getMonth() === 0 ? 11 : now.getMonth() - 1) : now.getMonth()]]: Math.round(prevMonthData?.summary?.totalExchangeIn ?? 0),
    },
    {
      name: 'Mobile Money',
      [MONTHS_FR[now.getMonth()]]: Math.round(summary.totalMobileMoney ?? 0),
      [MONTHS_FR[prevMonthData ? (now.getMonth() === 0 ? 11 : now.getMonth() - 1) : now.getMonth()]]: Math.round(prevMonthData?.summary?.totalMobileMoney ?? 0),
    },
    {
      name: 'Crédit',
      [MONTHS_FR[now.getMonth()]]: Math.round(summary.totalCredit ?? 0),
      [MONTHS_FR[prevMonthData ? (now.getMonth() === 0 ? 11 : now.getMonth() - 1) : now.getMonth()]]: Math.round(prevMonthData?.summary?.totalCredit ?? 0),
    },
    {
      name: 'Billets',
      [MONTHS_FR[now.getMonth()]]: Math.round(summary.totalTickets ?? 0),
      [MONTHS_FR[prevMonthData ? (now.getMonth() === 0 ? 11 : now.getMonth() - 1) : now.getMonth()]]: Math.round(prevMonthData?.summary?.totalTickets ?? 0),
    },
  ];

  const currentMonthLabel = MONTHS_FR[now.getMonth()];
  const prevMonthLabel = MONTHS_FR[now.getMonth() === 0 ? 11 : now.getMonth() - 1];

  if (loading && !monthData) return (
    <div className="flex items-center justify-center py-24 text-textMuted">
      <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Chargement des statistiques...
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-white font-bold">Statistiques en direct</h3>
            <p className="text-textMuted text-xs">
              Actualisé à {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="btn-ghost flex items-center gap-2 text-sm px-3 py-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* ── KPIs Aujourd'hui ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" />
          <h4 className="text-white font-semibold text-sm">
            Aujourd'hui — {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h4>
        </div>
        {!todayData ? (
          <div className="glass-panel p-6 text-center text-textMuted text-sm border border-white/5">
            Aucune activité enregistrée aujourd'hui.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard icon={ArrowUpRight} label="Change" value={fmt(todayData.exchanges)} unit="XOF" color="text-emerald-400" />
            <KpiCard icon={Smartphone} label="Mobile Money" value={fmt(todayData.mobileMoney)} unit="XOF" color="text-yellow-400" />
            <KpiCard icon={Phone} label="Crédit" value={fmt(todayData.credit)} unit="XOF" color="text-blue-400" />
            <KpiCard icon={Plane} label="Billets" value={fmt(todayData.tickets)} unit="XOF" color="text-purple-400" />
            <KpiCard icon={Wallet} label="Frais" value={fmt(todayData.fees)} unit="XOF" color="text-orange-400" />
          </div>
        )}
      </div>

      {/* ── KPIs Mois ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-accent" />
          <h4 className="text-white font-semibold text-sm">
            {currentMonthLabel} {now.getFullYear()} — Cumul mensuel
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={ArrowUpRight} label="Change (entrées)" value={fmt(summary.totalExchangeIn)} unit="XOF" color="text-emerald-400" />
          <KpiCard icon={ArrowDownRight} label="Change (sorties)" value={fmt(summary.totalExchangeOut)} unit="XOF" color="text-rose-400" />
          <KpiCard icon={Smartphone} label="Mobile Money" value={fmt(summary.totalMobileMoney)} unit="XOF" color="text-yellow-400" />
          <KpiCard icon={Phone} label="Crédit" value={fmt(summary.totalCredit)} unit="XOF" color="text-blue-400" />
          <KpiCard icon={Plane} label="Billets" value={fmt(summary.totalTickets)} unit="XOF" color="text-purple-400" />
          <KpiCard icon={TrendingUp} label="Commissions" value={fmt(summary.totalCommission)} unit="XOF" color="text-accent" />
          <KpiCard icon={Wallet} label="Frais collectés" value={fmt(summary.totalFees)} unit="XOF" color="text-orange-400" />
          <KpiCard icon={Activity} label="Total opérations" value={fmt((summary.totalTransactions ?? 0) + (summary.totalServiceOps ?? 0))} unit="ops" color="text-white" />
        </div>
      </div>

      {/* ── Graphe 1 : Évolution jour par jour (Area Chart) ── */}
      {chartDayData.length > 0 && (
        <div className="glass-panel p-6">
          <h4 className="text-white font-bold mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" /> Évolution jour par jour — {currentMonthLabel}
          </h4>
          <p className="text-textMuted text-xs mb-5">Volumes par catégorie (XOF)</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartDayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="gChange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCredit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBillets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '12px' }} />
              <Area type="monotone" dataKey="Change" stroke="#10b981" strokeWidth={2} fill="url(#gChange)" />
              <Area type="monotone" dataKey="Mobile Money" stroke="#eab308" strokeWidth={2} fill="url(#gMM)" />
              <Area type="monotone" dataKey="Crédit" stroke="#3b82f6" strokeWidth={2} fill="url(#gCredit)" />
              <Area type="monotone" dataKey="Billets" stroke="#a855f7" strokeWidth={2} fill="url(#gBillets)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Graphes 2 & 3 : Pie + Comparaison mensuelle ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie — répartition des activités ce mois */}
        {pieData.length > 0 && (
          <div className="glass-panel p-6">
            <h4 className="text-white font-bold mb-1">Répartition des activités</h4>
            <p className="text-textMuted text-xs mb-4">{currentMonthLabel} — part de chaque service</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${fmt(value)} XOF`, '']}
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bar — comparaison mois précédent */}
        <div className="glass-panel p-6">
          <h4 className="text-white font-bold mb-1">Comparaison mensuelle</h4>
          <p className="text-textMuted text-xs mb-4">{prevMonthLabel} vs {currentMonthLabel}</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={compareData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '12px' }} />
              <Bar dataKey={prevMonthLabel} fill="rgba(148,163,184,0.3)" radius={[4, 4, 0, 0]} />
              <Bar dataKey={currentMonthLabel} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ─── Section Rapports historiques ─────────────────────────── */
const PAGE_SIZE_DIR = 5;

const ReportsHistorySection = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selected, setSelected] = useState<DailyReport | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pagination & Recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadReports = () => {
    setLoading(true);
    api.getReports().then(r => {
      setReports(r);
      if (r.length > 0 && !selected) {
        setSelected(r[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (selected?.reportData) {
      try { setParsed(JSON.parse(selected.reportData)); } catch { setParsed(null); }
    } else { setParsed(null); }
  }, [selected]);

  const getGeneratorName = (r: DailyReport) => {
    if (r.generatedByName) return r.generatedByName;
    if (r.reportData) {
      try {
        const p = JSON.parse(r.reportData);
        if (p?.summary?.generatedBy) return p.summary.generatedBy;
      } catch {}
    }
    return 'Caissier';
  };

  const filteredReports = reports.filter(r => {
    const generator = getGeneratorName(r).toLowerCase();
    const dateStr = new Date(r.date).toLocaleDateString('fr-FR').toLowerCase();
    const term = searchTerm.toLowerCase();
    return generator.includes(term) || dateStr.includes(term) || r.id.toLowerCase().includes(term);
  });

  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE_DIR) || 1;
  const paginatedReports = filteredReports.slice((currentPage - 1) * PAGE_SIZE_DIR, currentPage * PAGE_SIZE_DIR);

  if (loading) return <div className="text-center py-8 text-textMuted text-sm">Chargement des rapports...</div>;
  if (reports.length === 0) return (
    <div className="glass-panel p-8 text-center text-textMuted">
      Aucun rapport journalier n'a encore été généré.
    </div>
  );

  const selectedGenerator = selected ? getGeneratorName(selected) : 'Caissier';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List panel */}
      <div className="glass-panel p-4 h-fit space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-bold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Rapports ({filteredReports.length})
          </h4>
          <button onClick={loadReports} title="Rafraîchir" className="btn-ghost p-1.5 text-textMuted hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-textMuted" />
          <input
            type="text"
            className="glass-input w-full pl-9 py-1.5 text-xs"
            placeholder="Filtrer par agent, date..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {filteredReports.length === 0 ? (
          <p className="text-textMuted text-xs text-center py-6">Aucun rapport trouvé.</p>
        ) : (
          <div className="space-y-2">
            {paginatedReports.map(r => {
              const generator = getGeneratorName(r);
              const isSelected = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium text-sm">
                      {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" /> {generator}
                    </span>
                  </div>
                  <div className="text-textMuted text-xs mt-0.5">Entrées: {fmt(r.totalExchangeIn)} XOF</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className="text-textMuted">
              Page {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="btn-ghost p-1.5 disabled:opacity-30 border border-white/10"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="btn-ghost p-1.5 disabled:opacity-30 border border-white/10"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        {!selected ? (
          <div className="glass-panel p-8 text-center text-textMuted">
            Sélectionnez un rapport pour voir le détail
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-white/10">
                <div>
                  <h4 className="text-xl font-bold text-white">
                    {new Date(selected.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h4>
                  <p className="text-textMuted text-xs mt-0.5">Enregistré à {new Date(selected.createdAt).toLocaleTimeString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-xs text-textMuted">Généré par :</span>
                  <strong className="text-xs text-white">{selectedGenerator}</strong>
                </div>
              </div>

              {/* Rapport pie chart */}
              {(() => {
                const chartData = [
                  { name: 'Change (entrées)', value: Math.round(selected.totalExchangeIn), color: '#10b981' },
                  { name: 'Mobile Money', value: Math.round((selected.totalMobileMoneyDeposits ?? 0) + (selected.totalMobileMoneyWithdrawals ?? 0)), color: '#eab308' },
                  { name: 'Crédit', value: Math.round(selected.totalCredit), color: '#3b82f6' },
                  { name: 'Billets', value: Math.round(selected.totalTickets), color: '#a855f7' },
                ].filter(d => d.value > 0);

                return chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : null;
              })()}
            </div>

            {/* Breakdown detail */}
            {parsed?.breakdown && (
              <div className="glass-panel p-6 space-y-3">
                {Object.keys(parsed.breakdown.mobileMoneyByProvider ?? {}).length > 0 && (
                  <div>
                    <p className="text-xs text-textMuted font-semibold uppercase tracking-wider mb-2">Mobile Money par opérateur</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(parsed.breakdown.mobileMoneyByProvider).map(([p, d]: [string, any]) => (
                        <div key={p} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-200 text-xs">
                          <div className="font-bold">{p}</div>
                          <div className="mt-1">Total: {fmt(d.total)} XOF · {d.count} op.</div>
                          <div>Dépôts: {fmt(d.deposits)} · Retraits: {fmt(d.withdrawals)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
export const DirecteurDashboard = () => {
  const [tab, setTab] = useState<'stats' | 'reports'>('stats');

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold text-white">Vue Direction</h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 text-xs font-semibold">Lecture seule</span>
            </div>
          </div>
          <p className="text-textMuted">Supervision et analyse des performances</p>
        </div>
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <button onClick={() => setTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'stats' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}>
            <Activity className="w-4 h-4" /> Statistiques
          </button>
          <button onClick={() => setTab('reports')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'reports' ? 'bg-primary text-white' : 'text-textMuted hover:text-white'}`}>
            <Calendar className="w-4 h-4" /> Rapports
          </button>
        </div>
      </div>

      {tab === 'stats' ? <LiveStatsSection /> : <ReportsHistorySection />}
    </div>
  );
};
