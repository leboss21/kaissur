import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionsPage } from './components/TransactionsPage';
import { ClientsPage } from './components/ClientsPage';
import { SettingsPage } from './components/SettingsPage';
import { ServicesPage } from './components/ServicesPage';
import { ReceiptsPage } from './components/ReceiptsPage';
import { ReportsPage } from './components/ReportsPage';
import { UsersPage } from './components/UsersPage';
import { MainCashPage } from './components/MainCashPage';

import { AuthProvider, useAuth } from './lib/AuthContext';
import { LoginPage } from './components/LoginPage';

function MainLayout() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isAdmin = user.role === 'ADMIN';
  const isChefCaisse = user.role === 'CHEF_CAISSE';
  const isDirecteur = user.role === 'DIRECTEUR';
  const isCashier = user.role === 'CASHIER';

  // SuperAdmin has dedicated platform view
  if (isSuperAdmin) {
    return (
      <BrowserRouter>
        <div className="flex bg-background min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex bg-background min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* Operational routes — ADMIN, CHEF_CAISSE and CASHIER, not DIRECTEUR */}
            <Route path="/transactions" element={isDirecteur ? <Navigate to="/" replace /> : <TransactionsPage />} />
            <Route path="/clients" element={isDirecteur ? <Navigate to="/" replace /> : <ClientsPage />} />
            <Route path="/services/mobile-money" element={isDirecteur ? <Navigate to="/" replace /> : <ServicesPage defaultTab="MOBILE_MONEY" />} />
            <Route path="/services/credit" element={isDirecteur ? <Navigate to="/" replace /> : <ServicesPage defaultTab="CREDIT" />} />
            <Route path="/services/tickets" element={isDirecteur ? <Navigate to="/" replace /> : <ServicesPage defaultTab="TICKET" />} />
            <Route path="/services" element={isDirecteur ? <Navigate to="/" replace /> : <ServicesPage defaultTab="MOBILE_MONEY" />} />
            <Route path="/receipts" element={isDirecteur ? <Navigate to="/" replace /> : <ReceiptsPage />} />
            <Route path="/settings" element={isCashier || isChefCaisse ? <Navigate to="/" replace /> : <SettingsPage />} />

            {/* Reports — ADMIN, DIRECTEUR, CHEF_CAISSE and CASHIER */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* Users — ADMIN only */}
            <Route path="/users" element={!isAdmin ? <Navigate to="/" replace /> : <UsersPage />} />

            {/* Main cash — CHEF_CAISSE only (or fallback if direct URL) */}
            <Route path="/main-cash" element={!isChefCaisse && !isAdmin ? <Navigate to="/" replace /> : <MainCashPage />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;

