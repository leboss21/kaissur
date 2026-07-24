import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateReceiptForSource } from './receipt.js';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const transactions = await prisma.transaction.findMany({
      where: { entrepriseId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        client: { select: { firstName: true, lastName: true } }
      }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId || 'test-user-id';
    
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { 
      clientId, 
      fromCurrencyCode, 
      toCurrencyCode, 
      amountIn, 
      exchangeRate, 
      type 
    } = req.body;

    if (!fromCurrencyCode || !toCurrencyCode || !amountIn || !exchangeRate) {
      return res.status(400).json({ error: 'Missing required transaction details' });
    }

    const amountOut = parseFloat(amountIn) * parseFloat(exchangeRate);

    // 1. Create Transaction record
    const transaction = await prisma.transaction.create({
      data: {
        entrepriseId,
        userId,
        clientId,
        fromCurrencyCode: fromCurrencyCode.toUpperCase(),
        toCurrencyCode: toCurrencyCode.toUpperCase(),
        amountIn: parseFloat(amountIn),
        amountOut,
        exchangeRate: parseFloat(exchangeRate),
        type: type || 'EXCHANGE',
        status: 'COMPLETED'
      }
    });

    // 2. Update Cash Registers (best effort - LibSQL does not support interactive transactions)
    try {
      await prisma.cashRegister.upsert({
        where: { entrepriseId_currencyId: { entrepriseId, currencyId: fromCurrencyCode.toUpperCase() } },
        update: { balance: { increment: parseFloat(amountIn) } },
        create: { entrepriseId, currencyId: fromCurrencyCode.toUpperCase(), balance: parseFloat(amountIn) }
      });
      await prisma.cashRegister.upsert({
        where: { entrepriseId_currencyId: { entrepriseId, currencyId: toCurrencyCode.toUpperCase() } },
        update: { balance: { decrement: amountOut } },
        create: { entrepriseId, currencyId: toCurrencyCode.toUpperCase(), balance: -amountOut }
      });
    } catch (cashErr) {
      console.warn('Cash register update failed (non-critical):', cashErr);
    }

    // 3. Generate Receipt (best effort)
    let receipt = null;
    try {
      receipt = await generateReceiptForSource(prisma as any, entrepriseId, 'EXCHANGE', transaction.id);
    } catch (receiptErr) {
      console.warn('Receipt generation failed (non-critical):', receiptErr);
    }

    res.status(201).json({ ...transaction, receipt });

  } catch (error) {
    console.error('Transaction Engine Error:', error);
    res.status(500).json({ error: 'Failed to process transaction securely' });
  }
};
