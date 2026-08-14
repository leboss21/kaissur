import React, { useState, useMemo } from 'react';
import { api } from '../lib/api';
import type { Session } from '../lib/api';
import { AlertCircle, Calculator, CheckCircle2 } from 'lucide-react';

interface Props {
  session: Session;
  onClosed: () => void;
  onCancel: () => void;
}

const BILLS = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];

export const ClosingForm = ({ session, onClosed, onCancel }: Props) => {
  const [step, setStep] = useState<'count' | 'declare' | 'summary'>('count');

  // Banknote counting state
  const [counts, setCounts] = useState<Record<number, number>>(
    Object.fromEntries(BILLS.map(b => [b, 0]))
  );

  // Declared balances for non-XOF accounts
  const [declaredBalances, setDeclaredBalances] = useState<Record<string, number>>({});
  const [closingComment, setClosingComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const physicalXOF = useMemo(() =>
    BILLS.reduce((sum, b) => sum + b * (counts[b] || 0), 0),
    [counts]
  );

  const mmBalances = session.balances.filter(b =>
    b.accountId.startsWith('MM_') || ['TMONEY', 'FLOOZ', 'MOOV', 'YAS'].includes(b.accountId)
  );
  
  // XOF expected balance
  const xofBal = session.balances.find(b => b.accountId === 'XOF');
  const expectedXOF = xofBal?.expectedEndingBalance ?? 0;
  const xofDiscrepancy = physicalXOF - expectedXOF;

  // Calcul du total des écarts
  const totalDiscrepancy = useMemo(() => {
    let sum = Math.abs(xofDiscrepancy);
    session.balances.forEach(b => {
      if (b.accountId !== 'XOF') {
        const declared = declaredBalances[b.accountId] ?? b.expectedEndingBalance;
        sum += Math.abs(declared - b.expectedEndingBalance);
      }
    });
    return sum;
  }, [session.balances, xofDiscrepancy, declaredBalances]);

  const hasDiscrepancy = totalDiscrepancy > 0;
  const isCommentMissing = hasDiscrepancy && closingComment.trim() === '';

  const handleCountChange = (bill: number, value: string) => {
    setCounts(prev => ({ ...prev, [bill]: Math.max(0, parseInt(value) || 0) }));
  };

  const handleDeclareChange = (accountId: string, value: string) => {
    setDeclaredBalances(prev => ({ ...prev, [accountId]: parseFloat(value) || 0 }));
  };

  const handleSubmit = async () => {
    if (isCommentMissing) {
      setError("Un commentaire est obligatoire pour justifier l'écart.");
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      // Build payload: use physical count for XOF, user input for MM & others
      const payload = session.balances.map(b => {
        if (b.accountId === 'XOF') {
          return { accountId: b.accountId, amount: physicalXOF };
        }
        return { accountId: b.accountId, amount: declaredBalances[b.accountId] ?? b.expectedEndingBalance };
      });

      // Le total théorique envoyé est uniquement pour le backend (qui peut recalculer)
      await api.closeSession(
        session.id,
        payload,
        counts,
        physicalXOF,
        expectedXOF,
        closingComment
      );
      onClosed();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('fr-FR');

  const [showAllAccounts, setShowAllAccounts] = useState(false);

  // Active non-XOF accounts (starting !== 0 || expected !== 0 || declared input)
  const activeNonXOF = useMemo(() => {
    return session.balances.filter(b => {
      if (b.accountId === 'XOF') return false;
      if (showAllAccounts) return true;
      const isDeclared = declaredBalances[b.accountId] !== undefined;
      return (b.startingBalance !== 0) || (b.expectedEndingBalance !== 0) || isDeclared;
    });
  }, [session.balances, showAllAccounts, declaredBalances]);

  // Balances to show in summary table (XOF + active accounts)
  const activeSummaryBalances = useMemo(() => {
    return session.balances.filter(b => {
      if (b.accountId === 'XOF') return true;
      if (showAllAccounts) return true;
      const isDeclared = declaredBalances[b.accountId] !== undefined && declaredBalances[b.accountId] !== 0;
      return (b.startingBalance !== 0) || (b.expectedEndingBalance !== 0) || isDeclared;
    });
  }, [session.balances, showAllAccounts, declaredBalances]);

  // Step 1: Banknote counting
  if (step === 'count') {
    return (
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <h4 className="text-white font-bold mb-1 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Comptage physique des billets et pièces
        </h4>
        <p className="text-textMuted text-sm mb-5">Saisissez le nombre de chaque coupure.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {BILLS.map(bill => (
            <div key={bill} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
              <div className="w-16 text-center">
                <div className="text-white font-bold text-sm">{fmt(bill)}</div>
                <div className="text-textMuted text-xs">XOF</div>
              </div>
              <input
                type="number"
                min="0"
                className="glass-input flex-1 text-center text-white"
                value={counts[bill] || ''}
                onChange={e => handleCountChange(bill, e.target.value)}
                placeholder="0"
              />
              <div className="w-20 text-right text-xs text-emerald-400 font-mono">
                = {fmt(bill * (counts[bill] || 0))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5 flex items-center justify-between">
          <span className="text-white font-semibold">Total physique XOF</span>
          <span className="text-primary font-extrabold text-xl">{fmt(physicalXOF)} FCFA</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Annuler</button>
          <button onClick={() => setStep('declare')} className="btn-primary flex-1">
            Suivant — Déclarer les autres soldes
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Other balances (MM, credit, currencies)
  if (step === 'declare') {
    return (
      <div className="bg-white/5 p-6 rounded-xl border border-white/10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-white font-bold mb-1">Soldes des comptes virtuels & Devises</h4>
            <p className="text-textMuted text-sm">Vérifiez ou saisissez les soldes des comptes actifs en caisse.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllAccounts(!showAllAccounts)}
            className="text-xs text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
          >
            {showAllAccounts ? 'Masquer les comptes vides (0 FCFA)' : 'Afficher tous les comptes'}
          </button>
        </div>

        {activeNonXOF.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-textMuted text-sm mb-5">
            Aucun compte virtuel ou devise étrangère actif détecté pour cette session.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
            {activeNonXOF.map(b => (
              <div key={b.accountId}>
                <label className="block text-textMuted text-sm mb-1.5 font-medium">
                  {b.accountId}
                  <span className="ml-2 text-xs text-primary/70">attendu: {fmt(b.expectedEndingBalance)}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="glass-input w-full"
                  value={declaredBalances[b.accountId] ?? b.expectedEndingBalance}
                  onChange={e => handleDeclareChange(b.accountId, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep('count')} className="btn-ghost flex-1">Retour</button>
          <button onClick={() => setStep('summary')} className="btn-primary flex-1">Voir le récapitulatif</button>
        </div>
      </div>
    );
  }

  // Step 3: Summary
  return (
    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
      <h4 className="text-white font-bold mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        Récapitulatif de Clôture
      </h4>
      {error && <div className="text-danger text-sm mb-4 bg-danger/10 p-3 rounded-xl border border-danger/20">{error}</div>}

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-textMuted border-b border-white/10">
            <th className="pb-2">Compte</th>
            <th className="pb-2">Attendu (théorique)</th>
            <th className="pb-2">Déclaré</th>
            <th className="pb-2">Écart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {activeSummaryBalances.map(b => {
            const declared = b.accountId === 'XOF' ? physicalXOF : (declaredBalances[b.accountId] ?? b.expectedEndingBalance);
            const diff = declared - b.expectedEndingBalance;
            return (
              <tr key={b.accountId} className="text-white">
                <td className="py-2 font-mono text-sm">{b.accountId}</td>
                <td className="py-2">{fmt(b.expectedEndingBalance)}</td>
                <td className="py-2 font-semibold">{fmt(declared)}</td>
                <td className="py-2">
                  {diff === 0 ? (
                    <span className="text-emerald-400">0</span>
                  ) : (
                    <span className={`flex items-center gap-1 ${diff < 0 ? 'text-danger' : 'text-yellow-400'}`}>
                      <AlertCircle className="w-4 h-4" />
                      {diff > 0 ? '+' : ''}{fmt(diff)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Global physical vs theoretical */}
      <div className={`rounded-xl p-4 mb-5 border ${xofDiscrepancy === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-textMuted text-sm">Total physique compté (caisse XOF)</span>
          <span className="text-white font-bold">{fmt(physicalXOF)} FCFA</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-textMuted text-sm">Solde théorique attendu (caisse XOF)</span>
          <span className="text-white font-bold">{fmt(expectedXOF)} FCFA</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
          <span className="text-white font-semibold">Écart de caisse (XOF)</span>
          <span className={`font-extrabold text-lg ${xofDiscrepancy === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {xofDiscrepancy > 0 ? '+' : ''}{fmt(xofDiscrepancy)} FCFA
          </span>
        </div>
      </div>

      {hasDiscrepancy && (
        <div className="mb-5">
          <label className="block text-white text-sm font-semibold mb-2">
            Justification de l'écart <span className="text-rose-400">*</span>
          </label>
          <textarea
            className="glass-input w-full min-h-[80px]"
            placeholder="Veuillez expliquer la raison de cet écart..."
            value={closingComment}
            onChange={(e) => setClosingComment(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => setStep('declare')} className="btn-ghost flex-1">Retour</button>
        <button onClick={handleSubmit} disabled={submitting || isCommentMissing} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? 'Clôture en cours...' : 'Confirmer la clôture'}
        </button>
      </div>
    </div>
  );
};
