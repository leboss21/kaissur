import React, { useState } from 'react';
import { api } from '../lib/api';
import type { Session } from '../lib/api';
import { AlertCircle } from 'lucide-react';

interface Props {
  session: Session;
  onClosed: () => void;
  onCancel: () => void;
}

export const ClosingForm = ({ session, onClosed, onCancel }: Props) => {
  const [declaredBalances, setDeclaredBalances] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  const handleInputChange = (accountId: string, value: string) => {
    setDeclaredBalances(prev => ({
      ...prev,
      [accountId]: parseFloat(value) || 0
    }));
  };

  const handlePreview = () => {
    setShowSummary(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = Object.keys(declaredBalances).map(acc => ({
        accountId: acc,
        amount: declaredBalances[acc]
      }));
      // Pad missing accounts with 0 just in case
      session.balances.forEach(b => {
        if (!declaredBalances.hasOwnProperty(b.accountId)) {
          payload.push({ accountId: b.accountId, amount: 0 });
        }
      });

      await api.closeSession(session.id, payload);
      onClosed();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (showSummary) {
    return (
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h4 className="text-white font-bold mb-4">Résumé de Clôture</h4>
        {error && <div className="text-danger text-sm mb-4">{error}</div>}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-textMuted">
              <th className="pb-2">Compte</th>
              <th className="pb-2">Attendu</th>
              <th className="pb-2">Déclaré</th>
              <th className="pb-2">Écart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {session.balances.map(b => {
              const declared = declaredBalances[b.accountId] || 0;
              const diff = declared - b.expectedEndingBalance;
              return (
                <tr key={b.accountId} className="text-white">
                  <td className="py-2">{b.accountId}</td>
                  <td className="py-2">{b.expectedEndingBalance}</td>
                  <td className="py-2">{declared}</td>
                  <td className="py-2">
                    {diff === 0 ? (
                      <span className="text-emerald-400">0</span>
                    ) : (
                      <span className="flex items-center gap-1 text-danger">
                        <AlertCircle className="w-4 h-4" /> {diff > 0 ? '+' : ''}{diff}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex gap-3">
          <button onClick={() => setShowSummary(false)} className="btn-ghost flex-1">Retour</button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">Confirmer la clôture</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
      <h4 className="text-white font-bold mb-4">Saisie des soldes réels (Billettage / Comptes virtuels)</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {session.balances.map(b => (
          <div key={b.accountId}>
            <label className="block text-textMuted text-sm mb-1.5">{b.accountId}</label>
            <input 
              type="number" 
              step="0.01" 
              className="glass-input w-full" 
              value={declaredBalances[b.accountId] || ''}
              onChange={e => handleInputChange(b.accountId, e.target.value)}
              placeholder="0.00"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1">Annuler</button>
        <button onClick={handlePreview} className="btn-primary flex-1">Vérifier les écarts</button>
      </div>
    </div>
  );
};
