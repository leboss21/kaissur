import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Lock, Mail, ArrowRightLeft, Eye, EyeOff } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4 select-none">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-3000" />

      <div className="w-full max-w-md glass-panel p-8 md:p-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <ArrowRightLeft className="text-primary w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">ExchangeOS</h1>
          <p className="text-textMuted mt-2 text-sm text-center">
            Connectez-vous pour accéder à votre console de caisse.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium animate-in fade-in duration-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-textMuted text-xs font-semibold uppercase tracking-wider mb-2">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
              <input
                type="email"
                required
                className="glass-input w-full pl-11 py-3 text-white placeholder-white/30 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-textMuted text-xs font-semibold uppercase tracking-wider mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="glass-input w-full pl-11 pr-11 py-3 text-white placeholder-white/30 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all font-sans"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors p-1"
                title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 text-sm font-bold mt-6 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
        
        <div className="text-center mt-6 text-xs text-textMuted">
          Sécurité renforcée par chiffrement de session.
        </div>
      </div>
    </div>
  );
};
