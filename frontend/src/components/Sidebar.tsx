import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRightLeft, Users, Settings, Smartphone, Phone,
  Plane, FileText, UserCog, UserCircle, ReceiptText, Briefcase, Vault, LogOut,
  Building2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const navItems = [
  // Super Admin view
  { name: 'Gestion Entreprises', icon: Building2, path: '/', roles: ['SUPER_ADMIN'] },

  // Tenant views
  { name: 'Tableau de bord', icon: LayoutDashboard, path: '/', roles: ['ADMIN', 'CHEF_CAISSE', 'CASHIER', 'DIRECTEUR'] },
  { name: 'Caisse Principale', icon: Vault, path: '/main-cash', roles: ['CHEF_CAISSE'] },
  { name: 'Transactions', icon: ArrowRightLeft, path: '/transactions', roles: ['ADMIN', 'CHEF_CAISSE', 'CASHIER'], group: 'Services' },
  { name: 'Mobile Money', icon: Smartphone, path: '/services/mobile-money', roles: ['ADMIN', 'CHEF_CAISSE', 'CASHIER'], group: 'Services' },
  { name: 'Crédit Comm.', icon: Phone, path: '/services/credit', roles: ['ADMIN', 'CHEF_CAISSE', 'CASHIER'], group: 'Services' },
  { name: 'Billetterie', icon: Plane, path: '/services/tickets', roles: ['ADMIN', 'CHEF_CAISSE', 'CASHIER'], group: 'Services' },
  { name: 'Reçus', icon: ReceiptText, path: '/receipts', roles: ['ADMIN', 'CHEF_CAISSE', 'CASHIER'] },
  { name: 'Clients', icon: Users, path: '/clients', roles: ['ADMIN', 'CHEF_CAISSE', 'CASHIER'] },
  { name: 'Rapports', icon: FileText, path: '/reports', roles: ['ADMIN', 'DIRECTEUR', 'CHEF_CAISSE', 'CASHIER'] },
  { name: 'Équipe', icon: UserCog, path: '/users', roles: ['ADMIN'] },
  { name: 'Paramètres', icon: Settings, path: '/settings', roles: ['ADMIN', 'DIRECTEUR'] },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <aside className="w-64 h-screen p-6 border-r border-white/10 glass-panel rounded-none flex flex-col">

      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <ArrowRightLeft className="text-primary w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          ExchangeOS
        </h1>
      </div>

      <nav className="space-y-1 flex-1">
        {(() => {
          const filtered = navItems.filter(item => item.roles.includes(user.role));
          const groups: string[] = [];
          return filtered.map((item) => {
            const isFirstInGroup = (item as any).group && !groups.includes((item as any).group);
            if (isFirstInGroup) groups.push((item as any).group);
            return (
              <React.Fragment key={item.name}>
                {isFirstInGroup && (
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-textMuted" />
                    <span className="text-xs font-semibold text-textMuted uppercase tracking-wider">Services</span>
                  </div>
                )}
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                        : 'text-textMuted hover:bg-white/5 hover:text-white'
                    }${ (item as any).group ? ' pl-7 text-sm' : '' }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              </React.Fragment>
            );
          });
        })()}
      </nav>

      {/* User info & Logout */}
      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-2">
          <UserCircle className="w-8 h-8 text-textMuted flex-shrink-0" />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-textMuted truncate">
              {user.role === 'SUPER_ADMIN' ? 'Super-Administrateur' : user.role === 'ADMIN' ? 'Administrateur' : user.role === 'CHEF_CAISSE' ? 'Chef Caisse' : user.role === 'DIRECTEUR' ? 'Directeur' : 'Caissier'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-textMuted hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </aside>
  );
};
