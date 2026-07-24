import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Session } from '../lib/api';
import { ClosingForm } from './ClosingForm';

export const CashierDashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClosing, setShowClosing] = useState(false);

  const fetchSession = async () => {
    try {
      const current = await api.getCurrentSession();
      setSession(current);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleOpenSession = async () => {
    try {
      const newSession = await api.openSession();
      setSession(newSession);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-white">Chargement...</div>;

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Ma Caisse</h2>
          <p className="text-textMuted mt-1">Gestion de la journée</p>
        </div>
      </div>

      {!session ? (
        <div className="glass-panel p-12 text-center max-w-xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-4">Aucune session ouverte</h3>
          <p className="text-textMuted mb-8">Ouvrez votre caisse pour commencer la journée et enregistrer des transactions.</p>
          <button onClick={handleOpenSession} className="btn-primary w-full py-4 text-lg">
            Ouvrir la Caisse
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Session Active</h3>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/20">
                Ouverte
              </span>
            </div>
            <p className="text-textMuted mb-6">La caisse a été ouverte le {new Date(session.date).toLocaleString()}</p>
            
            {showClosing ? (
              <ClosingForm session={session} onClosed={() => { setShowClosing(false); fetchSession(); }} onCancel={() => setShowClosing(false)} />
            ) : (
              <button onClick={() => setShowClosing(true)} className="btn-primary w-full md:w-auto">
                Clôturer la Journée
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
