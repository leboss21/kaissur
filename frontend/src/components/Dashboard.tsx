import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { AdminDashboard } from './AdminDashboard';
import { CashierDashboard } from './CashierDashboard';
import { DirecteurDashboard } from './DirecteurDashboard';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="w-full">
      {user?.role === 'SUPER_ADMIN'
        ? <SuperAdminDashboard />
        : user?.role === 'ADMIN'
          ? <AdminDashboard />
          : user?.role === 'DIRECTEUR'
            ? <DirecteurDashboard />
            : <CashierDashboard />
      }
    </div>
  );
};
