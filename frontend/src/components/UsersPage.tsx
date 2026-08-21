import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, UserPlus, X, Pencil, KeyRound, Trash2, Briefcase, Vault, Sparkles, Eye, EyeOff, Check, Copy } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

type ModalMode = 'create' | 'edit' | null;

const EMPTY_CREATE = { name: '', email: '', role: 'CASHIER', password: '' };
const EMPTY_EDIT   = { name: '', email: '', role: 'CASHIER', password: '' };

export const UsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalMode, setModalMode]   = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form, setForm]             = useState(EMPTY_CREATE);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [companyName, setCompanyName] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const fetchUsers = () => {
    api.getUsers().then(res => {
      setUsers(res);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchUsers();
    api.getEntreprise().then(ent => {
      if (ent?.name) setCompanyName(ent.name);
    }).catch(() => {});
  }, []);

  // Génération dynamique de l'email basé sur {prénom}@{entreprise}.com
  const handleNameChange = (nameVal: string) => {
    const prevSuggested = getSuggestedEmail(form.name);
    const isEmailUntouchedOrSuggested = !form.email || form.email === prevSuggested;
    
    const newSuggested = getSuggestedEmail(nameVal);
    setForm(prev => ({
      ...prev,
      name: nameVal,
      email: isEmailUntouchedOrSuggested && nameVal.trim() ? newSuggested : prev.email
    }));
  };

  const getSuggestedEmail = (fullName: string) => {
    if (!fullName.trim()) return '';
    const parts = fullName.trim().split(' ').filter(Boolean);
    const firstName = parts[0] ? parts[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') : '';
    const compSlug = (companyName || user?.entrepriseName || 'entreprise')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    return firstName ? `${firstName}@${compSlug || 'entreprise'}.com` : '';
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: generated }));
    setShowPassword(true);
  };

  const copyPasswordToClipboard = () => {
    if (!form.password) return;
    navigator.clipboard.writeText(form.password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'CASHIER', password: '' });
    setShowPassword(false);
    setCopiedPass(false);
    setError('');
    setSuccess('');
    setModalMode('create');
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({ name: u.name || '', email: u.email || '', role: u.role || 'CASHIER', password: '' });
    setError('');
    setSuccess('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
    setError('');
    setSuccess('');
  };

  const handleDeleteUser = async (userToDelete: any) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userToDelete.name}" ? Cette action est irréversible.`)) {
      return;
    }
    try {
      await api.deleteUser(userToDelete.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de l\'utilisateur.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.createUser(form);
      closeModal();
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur de création');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!editingUser) return;

    const payload: any = {};
    if (form.name && form.name !== editingUser.name)     payload.name  = form.name;
    if (form.email && form.email !== editingUser.email)  payload.email = form.email;
    if (form.role && form.role !== editingUser.role)     payload.role  = form.role;
    if (form.password)                                   payload.password = form.password;

    if (Object.keys(payload).length === 0) {
      setError('Aucune modification détectée.');
      return;
    }

    try {
      await (api as any).updateUser(editingUser.id, payload);
      setSuccess('Utilisateur mis à jour avec succès.');
      fetchUsers();
      setTimeout(closeModal, 1200);
    } catch (err: any) {
      setError(err.message || "Echec de la mise à jour");
    }
  };

  return (
    <div className="p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Équipe</h2>
          <p className="text-textMuted mt-1">Gestion des utilisateurs et des accès</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Ajouter un utilisateur
        </button>
      </div>

      <div className="glass-panel p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-textMuted border-b border-white/10">
                <th className="pb-3 pr-4">Utilisateur</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Rôle actuel</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 pr-4 text-white font-medium">{u.name}</td>
                  <td className="py-4 pr-4 text-textMuted">{u.email}</td>
                  <td className="py-4 pr-4">
                    {u.role === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <ShieldAlert className="w-3.5 h-3.5" /> Administrateur
                      </span>
                    ) : u.role === 'CHEF_CAISSE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Vault className="w-3.5 h-3.5" /> Chef Caisse
                      </span>
                    ) : u.role === 'DIRECTEUR' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Briefcase className="w-3.5 h-3.5" /> Direction
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Shield className="w-3.5 h-3.5" /> Caissier
                      </span>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        title="Modifier les informations"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Modifier
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                        title="Supprimer cet utilisateur"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-textMuted">Aucun utilisateur trouvé</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setModalMode(null)}
              className="absolute top-4 right-4 text-textMuted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {modalMode === 'create' ? (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-white">Ajouter un utilisateur</h3>
                </div>
                {error && <div className="mb-4 text-sm text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</div>}
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-textMuted text-sm mb-1.5">Nom complet *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Jean Dupont"
                      className="glass-input w-full"
                      value={form.name}
                      onChange={e => handleNameChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-textMuted text-sm mb-1.5">Adresse Email *</label>
                    <input
                      type="email"
                      required
                      className="glass-input w-full"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      placeholder={getSuggestedEmail('jean dupont') || 'jean@agence.com'}
                    />
                    {form.name && (
                      <p className="text-xs text-primary/70 mt-1">
                        💡 Suggestion : <span className="font-mono">{getSuggestedEmail(form.name)}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-textMuted text-sm">Mot de passe provisoire *</label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Générer automatiquement
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        className="glass-input w-full pr-20 font-mono"
                        value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})}
                        placeholder="Saisir ou générer…"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {form.password && (
                          <button
                            type="button"
                            onClick={copyPasswordToClipboard}
                            title={copiedPass ? "Copié !" : "Copier le mot de passe"}
                            className="text-textMuted hover:text-emerald-400 transition-colors p-1"
                          >
                            {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="text-textMuted hover:text-white transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {form.password && (
                      <p className="text-xs text-amber-400 mt-1">⚠️ Notez ou copiez ce mot de passe avant de créer le compte — il ne sera plus visible ensuite.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-textMuted text-sm mb-1.5">Rôle initial</label>
                    <select className="glass-input w-full bg-slate-900" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                      <option value="CASHIER">Caissier</option>
                      <option value="CHEF_CAISSE">Chef Caisse</option>
                      <option value="ADMIN">Administrateur</option>
                      <option value="DIRECTEUR">Direction / Directeur</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full mt-2">Créer l'utilisateur</button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Pencil className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-bold text-white">Modifier – {editingUser?.name}</h3>
                </div>

                {error   && <div className="mb-4 text-sm text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</div>}
                {success && <div className="mb-4 text-sm text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{success}</div>}

                <form onSubmit={handleEditUser} className="space-y-4">
                  <div>
                    <label className="block text-textMuted text-sm mb-1.5">Nom complet</label>
                    <input type="text" className="glass-input w-full" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-textMuted text-sm mb-1.5">Adresse Email</label>
                    <input type="email" className="glass-input w-full" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-textMuted text-sm mb-1.5">Rôle</label>
                    <select className="glass-input w-full bg-slate-900" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                      <option value="CASHIER">Caissier</option>
                      <option value="CHEF_CAISSE">Chef Caisse</option>
                      <option value="ADMIN">Administrateur</option>
                      <option value="DIRECTEUR">Direction / Directeur</option>
                    </select>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <label className="block text-textMuted text-sm">Réinitialiser le mot de passe</label>
                    </div>
                    <input
                      type="password"
                      placeholder="Laisser vide pour ne pas changer"
                      className="glass-input w-full"
                      value={form.password}
                      onChange={e => setForm({...form, password: e.target.value})}
                    />
                    <p className="text-xs text-textMuted mt-1">Laissez vide si vous ne souhaitez pas modifier le mot de passe.</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-textMuted hover:text-white hover:border-white/30 transition-all text-sm">
                      Annuler
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Enregistrer
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

