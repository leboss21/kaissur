const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('kaissur_token');
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...(options?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Currencies
  getCurrencies: () => request<Currency[]>('/currencies'),
  createCurrency: (data: CreateCurrencyPayload) =>
    request<Currency>('/currencies', { method: 'POST', body: JSON.stringify(data) }),
  updateCurrencyMargin: (code: string, sellMargin: number) =>
    request<Currency>(`/currencies/${code}/margin`, { method: 'PATCH', body: JSON.stringify({ sellMargin }) }),

  // Exchange Rates
  getRates: () => request<ExchangeRate[]>('/rates'),
  createRate: (data: CreateRatePayload) =>
    request<ExchangeRate>('/rates', { method: 'POST', body: JSON.stringify(data) }),

  // Clients (require tenant header from middleware)
  getClients: (entrepriseId: string) =>
    request<Client[]>('/clients', { headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),
  createClient: (data: CreateClientPayload, entrepriseId: string) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),
  getClientById: (id: string, entrepriseId: string) =>
    request<Client>(`/clients/${id}`, { headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),

  // Transactions
  getTransactions: (entrepriseId: string) =>
    request<Transaction[]>('/transactions', { headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),
  createTransaction: (data: CreateTransactionPayload, entrepriseId: string) =>
    request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),
  updateTransaction: (id: string, data: Partial<Transaction>, entrepriseId: string) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),

  // Cash Register
  getCashRegisters: (entrepriseId: string) =>
    request<CashRegister[]>('/cash-register', { headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),
  adjustCashRegister: (data: AdjustCashPayload, entrepriseId: string) =>
    request<CashRegister>('/cash-register/adjust', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),

  // Services
  // Providers
  getProviders: () => request<ServiceProvider[]>('/providers'),
  createProvider: (data: CreateProviderPayload) => request<ServiceProvider>('/providers', { method: 'POST', body: JSON.stringify(data) }),
  deleteProvider: (id: string) => request<void>(`/providers/${id}`, { method: 'DELETE' }),

  // Service Operations
  getServiceOperations: (entrepriseId: string) =>
    request<ServiceOperation[]>('/services', { headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),
  createServiceOperation: (data: CreateServiceOperationPayload, entrepriseId: string) =>
    request<ServiceOperation>('/services', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),
  updateServiceOperation: (id: string, data: Partial<ServiceOperation>, entrepriseId: string) =>
    request<ServiceOperation>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json', 'x-entreprise-id': entrepriseId } }),

  // Sessions
  getCurrentSession: () => request<Session | null>('/sessions/current').catch(() => null),
  openSession: () => request<Session>('/sessions/open', { method: 'POST' }),
  closeSession: (sessionId: string, declaredBalances: any[], billBreakdown?: any, physicalBalance?: number, theoreticalBalance?: number, closingComment?: string) => 
    request<Session>(`/sessions/${sessionId}/close`, { method: 'POST', body: JSON.stringify({ declaredBalances, billBreakdown, physicalBalance, theoreticalBalance, closingComment }) }),

  // Reports
  getReports: () => request<DailyReport[]>('/reports'),
  generateReport: () => request<DailyReport>('/reports/generate', { method: 'POST' }),
  getMonthlyReport: (year: number, month: number) => request<any>(`/reports/monthly?year=${year}&month=${month}`),

  // Receipts
  getReceipts: () => request<any[]>('/receipts'),
  getReceiptDetails: (id: string) => request<any>(`/receipts/${id}`),

  // Entreprise
  getEntreprise: () => request<any>('/entreprise'),
  updateEntreprise: (data: any) => request<any>('/entreprise', { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  getUsers: () => request<any[]>('/users'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUserRole: (id: string, role: string) => request<any>(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateUser: (id: string, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<any>(`/users/${id}`, { method: 'DELETE' }),

  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  // Caisse Principale
  getMainCash: () => request<any>('/entreprise/main-cash'),
  depositMainCash: (amount: number) => request<any>('/entreprise/main-cash/deposit', { method: 'POST', body: JSON.stringify({ amount }) }),
  supplyCashierService: (data: { amount: number; targetService: string }) => request<any>('/entreprise/main-cash/supply', { method: 'POST', body: JSON.stringify(data) }),

  // SuperAdmin
  getPlatformStats: () => request<PlatformStats>('/superadmin/stats'),
  getSuperadminEntreprises: () => request<EntrepriseItem[]>('/superadmin/entreprises'),
  createSuperadminEntreprise: (data: CreateEntreprisePayload) => request<any>('/superadmin/entreprises', { method: 'POST', body: JSON.stringify(data) }),
  updateSuperadminEntreprise: (id: string, data: any) => request<any>(`/superadmin/entreprises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleSuperadminEntrepriseStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => request<any>(`/superadmin/entreprises/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  resetSuperadminAdminPassword: (id: string, newPassword: string) => request<any>(`/superadmin/entreprises/${id}/reset-admin`, { method: 'POST', body: JSON.stringify({ newPassword }) })
};

export interface PlatformStats {
  totalEntreprises: number;
  activeEntreprises: number;
  suspendedEntreprises: number;
  totalUsers: number;
  totalOperations: number;
  totalVolume: number;
}

export interface EntrepriseItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  stats: {
    totalUsers: number;
    totalTransactions: number;
    totalServiceOps: number;
    totalSessions: number;
  };
  primaryAdmin: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  } | null;
}

export interface CreateEntreprisePayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

// ---------- Types ----------
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  sellMargin: number;
}

export interface ExchangeRate {
  id: string;
  currencyId: string;
  buyRate: number;
  sellRate: number;
  date: string;
  currency: Currency;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  identityType?: string;
  identityNum?: string;
  phone?: string;
  entrepriseId: string;
  createdAt: string;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  entrepriseId: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  amountIn: number;
  amountOut: number;
  exchangeRate: number;
  type: string;
  status: string;
  createdAt: string;
  clientId?: string;
  user?: { name: string; email: string };
  client?: { firstName: string; lastName: string };
  receipt?: any;
}

export interface CashRegister {
  id: string;
  entrepriseId: string;
  currencyId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  currency: Currency;
}

export interface CreateCurrencyPayload { code: string; name: string; symbol: string; sellMargin?: number; }
export interface CreateRatePayload { currencyId: string; buyRate: number; sellRate: number; }
export interface CreateClientPayload { firstName: string; lastName: string; identityType?: string; identityNum?: string; phone?: string; }
export interface CreateTransactionPayload { clientId?: string; fromCurrencyCode: string; toCurrencyCode: string; amountIn: number; exchangeRate: number; type?: string; margin?: number; }
export interface AdjustCashPayload { currencyId: string; balance: number; }
export interface CreateProviderPayload { type: string; name: string; color?: string; }

export interface ServiceProvider {
  id: string;
  type: string;
  name: string;
  color?: string;
}

export interface ServiceOperation {
  id: string;
  entrepriseId: string;
  type: string;
  subType?: string;
  provider: string;
  amount: number;
  fees: number;
  phone?: string;
  reference?: string;
  passengerName?: string;
  flightNumber?: string;
  departure?: string;
  destination?: string;
  flightDate?: string;
  airline?: string;
  ticketPrice?: number;
  commissionType?: string;
  commission?: number;
  notes?: string;
  status: string;
  createdAt: string;
  clientId?: string;
  user?: { name: string; email: string };
  client?: { firstName: string; lastName: string };
  receipt?: any;
}

export interface CreateServiceOperationPayload {
  clientId?: string;
  type: string;
  subType?: string;
  provider: string;
  amount: number;
  fees?: number;
  phone?: string;
  reference?: string;
  passengerName?: string;
  flightNumber?: string;
  departure?: string;
  destination?: string;
  flightDate?: string;
  airline?: string;
  ticketPrice?: number;
  commissionType?: string;
  commission?: number;
  notes?: string;
}

export interface Session {
  id: string;
  entrepriseId: string;
  userId: string;
  date: string;
  status: string;
  balances: SessionBalance[];
}

export interface SessionBalance {
  id: string;
  sessionId: string;
  accountId: string;
  startingBalance: number;
  expectedEndingBalance: number;
  declaredEndingBalance?: number;
  discrepancy?: number;
}

export interface DailyReport {
  id: string;
  date: string;
  totalExchangeIn: number;
  totalExchangeOut: number;
  totalMobileMoney: number;
  totalMobileMoneyDeposits: number;
  totalMobileMoneyWithdrawals: number;
  totalCredit: number;
  totalTickets: number;
  reportData: string | null;
  generatedByUserId?: string | null;
  generatedByName?: string | null;
  createdAt: string;
}
