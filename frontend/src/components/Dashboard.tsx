import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { CashierDashboard } from './CashierDashboard';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="w-full">
      {user.role === 'ADMIN' ? <AdminDashboard /> : <CashierDashboard />}
    </div>
  );
};
