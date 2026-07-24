import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionsPage } from './components/TransactionsPage';
import { ClientsPage } from './components/ClientsPage';
import { SettingsPage } from './components/SettingsPage';
import { ServicesPage } from './components/ServicesPage';
import { ReceiptsPage } from './components/ReceiptsPage';
import { ReportsPage } from './components/ReportsPage';
import { UsersPage } from './components/UsersPage';

import { AuthProvider } from './lib/AuthContext';



function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex bg-background min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/services/mobile-money" element={<ServicesPage defaultTab="MOBILE_MONEY" />} />
              <Route path="/services/credit" element={<ServicesPage defaultTab="CREDIT" />} />
              <Route path="/services/tickets" element={<ServicesPage defaultTab="TICKET" />} />
              <Route path="/services" element={<ServicesPage defaultTab="MOBILE_MONEY" />} />
              <Route path="/receipts" element={<ReceiptsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />

              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
