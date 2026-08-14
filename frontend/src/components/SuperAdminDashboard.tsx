import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { EntrepriseItem, PlatformStats } from '../lib/api';
import {
  Building2, Users, ShieldCheck, ShieldAlert, Plus, Search,
  TrendingUp, Key, CheckCircle2, AlertCircle, RefreshCw,
  Power, Edit3, X, Eye, EyeOff, Sparkles, Phone, Mail, MapPin, FileText
} from 'lucide-react';

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null || isNaN(n as number)) return '0';
  return (n as number).toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' ');
}

export const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [entreprises, setEntreprises] = useState<EntrepriseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [selectedEntreprise, setSelectedEntreprise] = useState<EntrepriseItem | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED'
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, entData] = await Promise.all([
        api.getPlatformStats(),
        api.getSuperadminEntreprises()
      ]);
      setStats(statsData);
      setEntreprises(entData);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEntreprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.adminEmail || !createForm.adminPassword) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.createSuperadminEntreprise(createForm);
      setSuccessMsg(`L'entreprise "${createForm.name}" et son compte administrateur ont été créés avec succès !`);
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        adminName: '',
        adminEmail: '',
        adminPassword: ''
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la création de l'entreprise.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (ent: EntrepriseItem) => {
    const newStatus = ent.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMsg = newStatus === 'SUSPENDED'
      ? `Êtes-vous sûr de vouloir suspendre l'entreprise "${ent.name}" ? Ses utilisateurs ne pourront plus se connecter.`
      : `Voulez-vous réactiver l'entreprise "${ent.name}" ?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.toggleSuperadminEntrepriseStatus(ent.id, newStatus);
      setSuccessMsg(`Statut de "${ent.name}" modifié en : ${newStatus === 'ACTIVE' ? 'Actif' : 'Suspendu'}`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la modification du statut.');
    }
  };

  const handleOpenEdit = (ent: EntrepriseItem) => {
    setSelectedEntreprise(ent);
    setEditForm({
      name: ent.name || '',
      email: ent.email || '',
      phone: ent.phone || '',
      address: ent.address || '',
      taxId: ent.taxId || '',
      status: ent.status
    });
    setIsEditOpen(true);
  };

  const handleEditEntreprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntreprise) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.updateSuperadminEntreprise(selectedEntreprise.id, editForm);
      setSuccessMsg(`Informations de l'entreprise "${editForm.name}" mises à jour avec succès !`);
      setIsEditOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenResetPwd = (ent: EntrepriseItem) => {
    setSelectedEntreprise(ent);
    setNewPassword('');
    setIsResetPwdOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntreprise || !newPassword || newPassword.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.resetSuperadminAdminPassword(selectedEntreprise.id, newPassword);
      setSuccessMsg(`Mot de passe réinitialisé avec succès pour l'administrateur de "${selectedEntreprise.name}".`);
      setIsResetPwdOpen(false);
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la réinitialisation du mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const filteredEntreprises = entreprises.filter(e => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      e.name.toLowerCase().includes(term) ||
      (e.email && e.email.toLowerCase().includes(term)) ||
      (e.taxId && e.taxId.toLowerCase().includes(term)) ||
      (e.primaryAdmin?.email && e.primaryAdmin.email.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Supervision Multi-Entreprises</h2>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-bold tracking-wide">
              SUPER-ADMIN
            </span>
          </div>
          <p className="text-textMuted mt-1">
            Gestion globale des entreprises, comptes administrateurs et état de la plateforme
          </p>
        </div>

        <button
          onClick={() => {
            const pwd = generateRandomPassword();
            setCreateForm(prev => ({ ...prev, adminPassword: pwd }));
            setIsCreateOpen(true);
          }}
          className="btn-primary flex items-center gap-2 py-3 px-5 text-sm font-semibold shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all"
        >
          <Plus className="w-5 h-5" /> Créer une Entreprise
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400/60 hover:text-emerald-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400/60 hover:text-rose-400"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-6 border-l-4 border-l-primary relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted text-xs font-semibold uppercase tracking-wider">Total Entreprises</span>
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-black text-white">{stats ? stats.totalEntreprises : '...'}</div>
          <div className="text-xs text-textMuted mt-1">Plateformes actives ou archivées</div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-emerald-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted text-xs font-semibold uppercase tracking-wider">Entreprises Actives</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats ? stats.activeEntreprises : '...'}</div>
          <div className="text-xs text-textMuted mt-1">Accès et opérations autorisés</div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-rose-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted text-xs font-semibold uppercase tracking-wider">Suspendues</span>
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400">{stats ? stats.suspendedEntreprises : '...'}</div>
          <div className="text-xs text-textMuted mt-1">Accès temporairement bloqué</div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-indigo-500 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textMuted text-xs font-semibold uppercase tracking-wider">Volume Réseau</span>
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 truncate">{stats ? `${fmt(stats.totalVolume)} XOF` : '...'}</div>
          <div className="text-xs text-textMuted mt-1">{stats ? `${stats.totalUsers} utilisateurs totaux` : '...'}</div>
        </div>
      </div>

      {/* Main List & Management Panel */}
      <div className="glass-panel p-6 space-y-6">
        {/* Filters and search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-white">Liste des Entreprises ({filteredEntreprises.length})</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status pill filter */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${statusFilter === 'ALL' ? 'bg-primary text-white shadow' : 'text-textMuted hover:text-white'}`}
              >
                Toutes ({entreprises.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-white shadow' : 'text-textMuted hover:text-white'}`}
              >
                Actives ({entreprises.filter(e => e.status === 'ACTIVE').length})
              </button>
              <button
                onClick={() => setStatusFilter('SUSPENDED')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${statusFilter === 'SUSPENDED' ? 'bg-rose-500 text-white shadow' : 'text-textMuted hover:text-white'}`}
              >
                Suspendues ({entreprises.filter(e => e.status === 'SUSPENDED').length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input
                type="text"
                placeholder="Rechercher par nom, email..."
                className="glass-input w-full pl-10 text-xs py-2"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={loadData}
              title="Actualiser la liste"
              className="btn-ghost p-2 text-textMuted hover:text-white border border-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table or Cards */}
        {loading ? (
          <div className="text-center py-16 text-textMuted flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span>Chargement des entreprises...</span>
          </div>
        ) : filteredEntreprises.length === 0 ? (
          <div className="text-center py-16 text-textMuted bg-white/5 rounded-2xl border border-white/10">
            <Building2 className="w-12 h-12 text-textMuted/40 mx-auto mb-3" />
            <p className="font-semibold text-white">Aucune entreprise trouvée</p>
            <p className="text-xs text-textMuted mt-1">Créez votre première entreprise ou modifiez vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredEntreprises.map(ent => {
              const isActive = ent.status === 'ACTIVE';
              return (
                <div
                  key={ent.id}
                  className={`border rounded-2xl p-5 transition-all duration-200 ${
                    isActive
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Enterprise details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                          {ent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">{ent.name}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                                isActive
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                              {isActive ? 'Active' : 'Suspendue'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-textMuted mt-0.5">
                            {ent.taxId && <span>NIF : {ent.taxId}</span>}
                            {ent.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {ent.email}</span>}
                            {ent.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {ent.phone}</span>}
                            <span>Créée le {new Date(ent.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Admin & stats badges */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {ent.primaryAdmin ? (
                          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs">
                            <Key className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-textMuted">Admin :</span>
                            <span className="text-white font-medium">{ent.primaryAdmin.name || 'Admin'}</span>
                            <span className="text-textMuted">({ent.primaryAdmin.email})</span>
                          </div>
                        ) : (
                          <div className="text-xs text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            Aucun compte admin assigné
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {ent.stats.totalUsers} Utilisateur(s)
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {ent.stats.totalTransactions + ent.stats.totalServiceOps} Opérations
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                      <button
                        onClick={() => handleToggleStatus(ent)}
                        className={`btn-ghost text-xs flex items-center gap-1.5 px-3 py-2 border ${
                          isActive
                            ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/15'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'
                        }`}
                        title={isActive ? "Suspendre l'entreprise" : "Activer l'entreprise"}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {isActive ? 'Suspendre' : 'Activer'}
                      </button>

                      <button
                        onClick={() => handleOpenResetPwd(ent)}
                        className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-2 border border-white/10 text-yellow-300 hover:bg-white/10"
                        title="Réinitialiser le mot de passe de l'administrateur"
                      >
                        <Key className="w-3.5 h-3.5 text-yellow-400" /> Mot de passe Admin
                      </button>

                      <button
                        onClick={() => handleOpenEdit(ent)}
                        className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-2 border border-white/10 text-white hover:bg-white/10"
                        title="Modifier les informations"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-primary" /> Modifier
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal 1 : Création d'Entreprise + Administrateur ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Créer une Nouvelle Entreprise</h3>
                  <p className="text-xs text-textMuted">Entreprise + Création du compte Administrateur principal</p>
                </div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="btn-ghost p-1.5 text-textMuted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntreprise} className="space-y-6">
              {/* Section 1 : Entreprise */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> 1. Informations de l'Entreprise
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-textMuted mb-1 font-medium">Nom de l'entreprise *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Bureau de Change Lomé Centre"
                      className="glass-input w-full text-sm"
                      value={createForm.name}
                      onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-textMuted mb-1 font-medium">NIF / N° Registre</label>
                    <input
                      type="text"
                      placeholder="Ex : TG-2025-A123"
                      className="glass-input w-full text-sm"
                      value={createForm.taxId}
                      onChange={e => setCreateForm({ ...createForm, taxId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-textMuted mb-1 font-medium">Email professionnel</label>
                    <input
                      type="email"
                      placeholder="contact@entreprise.com"
                      className="glass-input w-full text-sm"
                      value={createForm.email}
                      onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-textMuted mb-1 font-medium">Téléphone</label>
                    <input
                      type="text"
                      placeholder="+228 90 00 00 00"
                      className="glass-input w-full text-sm"
                      value={createForm.phone}
                      onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-textMuted mb-1 font-medium">Adresse physique / Ville</label>
                    <input
                      type="text"
                      placeholder="Lomé, Boulevard du 13 Janvier"
                      className="glass-input w-full text-sm"
                      value={createForm.address}
                      onChange={e => setCreateForm({ ...createForm, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 : Administrateur */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4" /> 2. Administrateur Principal de l'Agence
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-textMuted mb-1 font-medium">Nom complet de l'Admin</label>
                    <input
                      type="text"
                      placeholder="Ex : Koffi Mensah"
                      className="glass-input w-full text-sm"
                      value={createForm.adminName}
                      onChange={e => setCreateForm({ ...createForm, adminName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-textMuted mb-1 font-medium">Email de connexion Admin *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@entreprise.com"
                      className="glass-input w-full text-sm"
                      value={createForm.adminEmail}
                      onChange={e => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-textMuted font-medium">Mot de passe temporaire *</label>
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, adminPassword: generateRandomPassword() })}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Générer un mot de passe
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="glass-input w-full text-sm pr-10 font-mono"
                        value={createForm.adminPassword}
                        onChange={e => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-textMuted mt-1">
                      Communiquez ces identifiants à l'administrateur afin qu'il puisse configurer son agence et créer ses caissiers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-ghost px-4 py-2 text-sm border border-white/10"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-6 py-2 text-sm font-semibold flex items-center gap-2"
                >
                  {submitting ? 'Création en cours...' : "Créer l'Entreprise et l'Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2 : Édition d'Entreprise ── */}
      {isEditOpen && selectedEntreprise && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-lg space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary" /> Modifier l'Entreprise
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="btn-ghost p-1 text-textMuted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditEntreprise} className="space-y-4">
              <div>
                <label className="block text-xs text-textMuted mb-1">Nom de l'entreprise *</label>
                <input
                  type="text"
                  required
                  className="glass-input w-full text-sm"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-textMuted mb-1">Email</label>
                  <input
                    type="email"
                    className="glass-input w-full text-sm"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-textMuted mb-1">Téléphone</label>
                  <input
                    type="text"
                    className="glass-input w-full text-sm"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-textMuted mb-1">NIF / Tax ID</label>
                  <input
                    type="text"
                    className="glass-input w-full text-sm"
                    value={editForm.taxId}
                    onChange={e => setEditForm({ ...editForm, taxId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-textMuted mb-1">Statut</label>
                  <select
                    className="glass-input w-full text-sm bg-slate-900"
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                  >
                    <option value="ACTIVE">Actif</option>
                    <option value="SUSPENDED">Suspendu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-textMuted mb-1">Adresse</label>
                <input
                  type="text"
                  className="glass-input w-full text-sm"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-ghost px-4 py-2 text-xs border border-white/10"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {submitting ? 'Enregistrement...' : 'Mettre à jour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3 : Réinitialisation Mot de passe Administrateur ── */}
      {isResetPwdOpen && selectedEntreprise && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 w-full max-w-md space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-400" /> Réinitialiser Mot de passe Admin
              </h3>
              <button onClick={() => setIsResetPwdOpen(false)} className="btn-ghost p-1 text-textMuted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-textMuted">
              Entreprise : <strong className="text-white">{selectedEntreprise.name}</strong><br />
              Admin : <strong className="text-white">{selectedEntreprise.primaryAdmin?.email || 'N/A'}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-textMuted font-medium">Nouveau mot de passe *</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Générer
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Min. 6 caractères"
                  className="glass-input w-full text-sm font-mono"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsResetPwdOpen(false)}
                  className="btn-ghost px-4 py-2 text-xs border border-white/10"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2 text-xs font-semibold"
                >
                  {submitting ? 'Modification...' : 'Appliquer le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
