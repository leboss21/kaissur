const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // In future: Authorization: `Bearer ${token}`
    },
    ...options,
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

  // Sessions
  getCurrentSession: () => request<Session>('/sessions/current'),
  openSession: () => request<Session>('/sessions/open', { method: 'POST' }),
  closeSession: (sessionId: string, declaredBalances: any[]) => 
    request<Session>(`/sessions/${sessionId}/close`, { method: 'POST', body: JSON.stringify({ declaredBalances }) }),

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
  updateUserRole: (id: string, role: string) => request<any>(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
};

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
  createdAt: string;
}
