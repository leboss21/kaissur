import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, Users, Settings, Smartphone, Phone, Plane, FileText, UserCog, UserCircle, ReceiptText, Briefcase } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';



const navItems = [
  { name: 'Tableau de bord', icon: LayoutDashboard, path: '/', roles: ['ADMIN', 'CASHIER'] },
  { name: 'Transactions', icon: ArrowRightLeft, path: '/transactions', roles: ['ADMIN', 'CASHIER'], group: 'Services' },
  { name: 'Mobile Money', icon: Smartphone, path: '/services/mobile-money', roles: ['ADMIN', 'CASHIER'], group: 'Services' },
  { name: 'Crédit Comm.', icon: Phone, path: '/services/credit', roles: ['ADMIN', 'CASHIER'], group: 'Services' },
  { name: 'Billetterie', icon: Plane, path: '/services/tickets', roles: ['ADMIN', 'CASHIER'], group: 'Services' },
  { name: 'Reçus', icon: ReceiptText, path: '/receipts', roles: ['ADMIN', 'CASHIER'] },
  { name: 'Clients', icon: Users, path: '/clients', roles: ['ADMIN', 'CASHIER'] },
  { name: 'Rapports', icon: FileText, path: '/reports', roles: ['ADMIN', 'CASHIER'] },
  { name: 'Équipe', icon: UserCog, path: '/users', roles: ['ADMIN'] },
  { name: 'Paramètres', icon: Settings, path: '/settings', roles: ['ADMIN', 'CASHIER'] },
];


export const Sidebar = () => {
  const { user, switchRole } = useAuth();

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

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
          // Group Services together under a label
          const groups: string[] = [];
          return filtered.map((item, idx) => {
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

      {/* Mode bascule rôle pour la démo */}
      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl">
          <UserCircle className="w-8 h-8 text-textMuted" />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <button 
              onClick={() => switchRole(user.role === 'ADMIN' ? 'CASHIER' : 'ADMIN')}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Mode: {user.role === 'ADMIN' ? 'Administrateur' : 'Caissier'} (Changer)
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};


