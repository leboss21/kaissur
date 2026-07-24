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
    // Note: userId should be securely extracted from auth token middleware, assuming it's available in req
    const userId = (req as any).userId || 'test-user-id'; // placeholder if auth isn't fully implemented
    
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

    // Calculate amountOut (assume exchangeRate is 'fromCurrency to toCurrency' multiplier)
    // E.g., USD -> EUR, rate 0.92, amountIn = 100 USD -> amountOut = 92 EUR
    const amountOut = amountIn * parseFloat(exchangeRate);

    // Run in a database transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction record
      const transaction = await tx.transaction.create({
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

      // 2. Increase Cash Register for fromCurrency (Office receives this)
      await tx.cashRegister.upsert({
        where: {
          entrepriseId_currencyId: {
            entrepriseId,
            currencyId: fromCurrencyCode.toUpperCase()
          }
        },
        update: {
          balance: { increment: parseFloat(amountIn) }
        },
        create: {
          entrepriseId,
          currencyId: fromCurrencyCode.toUpperCase(),
          balance: parseFloat(amountIn)
        }
      });

      // 3. Decrease Cash Register for toCurrency (Office gives this out)
      await tx.cashRegister.upsert({
        where: {
          entrepriseId_currencyId: {
            entrepriseId,
            currencyId: toCurrencyCode.toUpperCase()
          }
        },
        update: {
          balance: { decrement: amountOut }
        },
        create: {
          entrepriseId,
          currencyId: toCurrencyCode.toUpperCase(),
          balance: -amountOut
        }
      });

      // 4. Generate Receipt
      const receipt = await generateReceiptForSource(tx, entrepriseId, 'EXCHANGE', transaction.id);

      return { ...transaction, receipt };
    });

    res.status(201).json(result);

  } catch (error) {
    console.error('Transaction Engine Error:', error);
    res.status(500).json({ error: 'Failed to process transaction securely' });
  }
};
