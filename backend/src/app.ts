import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import transactionRoutes from './routes/transaction.js';
import currencyRoutes from './routes/currency.js';
import rateRoutes from './routes/rate.js';
import clientRoutes from './routes/client.js';
import cashRegisterRoutes from './routes/cashRegister.js';
import serviceRoutes from './routes/service.js';
import sessionRoutes from './routes/session.js';
import reportRoutes from './routes/report.js';
import userRoutes from './routes/user.js';
import receiptRoutes from './routes/receipt.js';
import entrepriseRoutes from './routes/entreprise.js';
import providerRoutes from './routes/provider.js';
import authRoutes from './routes/auth.js';
import superadminRoutes from './routes/superadmin.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-entreprise-id']
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/cash-register', cashRegisterRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/entreprise', entrepriseRoutes);
app.use('/api/providers', providerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running correctly (Option A)' });
});

export default app;
