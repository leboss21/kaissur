import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Session } from '../lib/api';
import { ClosingForm } from './ClosingForm';
import { RefreshCw, Wallet, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

export const CashierDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showClosing, setShowClosing] = useState(false);

  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  const fetchSession = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const current = await api.getCurrentSession();
      setSession(current);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleOpenSession = async () => {
    setOpening(true);
    setError('');
    try {
      const newSession = await api.openSession();
      setSession(newSession);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Impossible d\'ouvrir la caisse. Veuillez réessayer.');
    } finally {
      setOpening(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  if (loading) return <div className="p-8 text-white">Chargement...</div>;

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Ma Caisse</h2>
          <p className="text-textMuted mt-1">Gestion et suivi des soldes en temps réel</p>
        </div>
        {session && (
          <button
            onClick={() => fetchSession(true)}
            disabled={refreshing}
            className="btn-ghost flex items-center gap-2 text-sm border border-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser les soldes
          </button>
        )}
      </div>

      {!session ? (
        <div className="glass-panel p-12 text-center max-w-xl mx-auto">
          <Wallet className="w-16 h-16 text-primary mx-auto mb-4 opacity-80" />
          <h3 className="text-xl font-bold text-white mb-4">Aucune session ouverte</h3>
          <p className="text-textMuted mb-8">Ouvrez votre caisse pour commencer la journée et enregistrer des transactions.</p>
          {error && <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-3 mb-6 text-sm">{error}</div>}
          <button onClick={handleOpenSession} disabled={opening} className="btn-primary w-full py-4 text-lg">
            {opening ? 'Ouverture en cours...' : 'Ouvrir la Caisse'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Session Active du Jour</h3>
                  <p className="text-xs text-textMuted">Caisse ouverte le {new Date(session.date).toLocaleString('fr-FR')}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/20">
                Ouverte
              </span>
            </div>

            {!showClosing && (
              <>
                <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
                  Soldes des comptes en direct
                </h4>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-textMuted border-b border-white/10">
                        <th className="pb-3 pr-4">Compte / Service</th>
                        <th className="pb-3 pr-4">Solde Initial</th>
                        <th className="pb-3 pr-4">Solde Théorique En Direct</th>
                        <th className="pb-3 text-right">Variation du Jour</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {session.balances.filter(b => b.accountId === 'XOF' || b.startingBalance !== 0 || b.expectedEndingBalance !== 0).map(b => {
                        const diff = b.expectedEndingBalance - b.startingBalance;
                        return (
                          <tr key={b.accountId} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4 text-white font-medium font-mono">
                              {b.displayName || b.accountId}
                            </td>
                            <td className="py-3 pr-4 text-textMuted">
                              {fmt(b.startingBalance)}
                            </td>
                            <td className="py-3 pr-4 text-white font-bold">
                              {fmt(b.expectedEndingBalance)}
                            </td>
                            <td className="py-3 text-right font-semibold">
                              {diff === 0 ? (
                                <span className="text-textMuted">0</span>
                              ) : diff > 0 ? (
                                <span className="text-emerald-400 inline-flex items-center gap-1 justify-end">
                                  <ArrowUpRight className="w-4 h-4" /> +{fmt(diff)}
                                </span>
                              ) : (
                                <span className="text-rose-400 inline-flex items-center gap-1 justify-end">
                                  <ArrowDownRight className="w-4 h-4" /> {fmt(diff)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {showClosing ? (
              <ClosingForm
                session={session}
                onClosed={() => { setShowClosing(false); fetchSession(); }}
                onCancel={() => setShowClosing(false)}
              />
            ) : (
              <div className="flex justify-end pt-2 border-t border-white/10">
                <button onClick={() => setShowClosing(true)} className="btn-primary">
                  Clôturer la Journée
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
