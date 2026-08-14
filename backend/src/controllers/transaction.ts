import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateReceiptForSource } from './receipt.js';

/**
 * Récupère la session active pour un utilisateur donné.
 * Retourne null si aucune session OPEN n'existe.
 */
async function getActiveSession(entrepriseId: string, userId: string) {
  return prisma.cashRegisterSession.findFirst({
    where: { entrepriseId, userId, status: 'OPEN' }
  });
}

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    // Un caissier ne voit que ses propres transactions
    const whereClause: any = { entrepriseId };
    if (userRole === 'CASHIER') {
      whereClause.userId = userId;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
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
    const userId = (req as any).userId;

    if (!entrepriseId || !userId) return res.status(401).json({ error: 'Unauthorized' });

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

    // ⛔ Vérification session active obligatoire
    const activeSession = await getActiveSession(entrepriseId, userId);
    if (!activeSession) {
      return res.status(403).json({
        error: 'Aucune session de caisse active. Vous devez ouvrir votre caisse avant d\'enregistrer une transaction.'
      });
    }

    const amountOut = parseFloat(amountIn) * parseFloat(exchangeRate);

    // 1. Create Transaction record avec sessionId
    const transaction = await prisma.transaction.create({
      data: {
        entrepriseId,
        userId,
        sessionId: activeSession.id,
        clientId: clientId ? clientId : null,
        fromCurrencyCode: fromCurrencyCode.toUpperCase(),
        toCurrencyCode: toCurrencyCode.toUpperCase(),
        amountIn: parseFloat(amountIn),
        amountOut,
        exchangeRate: parseFloat(exchangeRate),
        type: type || 'EXCHANGE',
        status: 'COMPLETED'
      }
    });

    // 2. Update Cash Registers (best effort)
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

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { fromCurrencyCode, toCurrencyCode, amountIn, exchangeRate, clientId, type, status } = req.body;

    const existing = await prisma.transaction.findUnique({
      where: { id: id as string },
      include: { session: { select: { status: true, userId: true } } }
    });

    if (!existing || existing.entrepriseId !== entrepriseId) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Un caissier ne peut modifier que ses propres transactions
    if (userRole === 'CASHIER' && existing.userId !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez modifier que vos propres transactions.' });
    }

    // ⛔ Interdire la modification si la session associée est clôturée
    if (existing.session && existing.session.status === 'CLOSED') {
      return res.status(403).json({
        error: 'Modification impossible. La session de caisse associée à cette transaction est clôturée.'
      });
    }

    const newAmountIn = amountIn ? parseFloat(amountIn) : existing.amountIn;
    const newRate = exchangeRate ? parseFloat(exchangeRate) : existing.exchangeRate;
    const amountOut = newAmountIn * newRate;

    const updated = await prisma.transaction.update({
      where: { id: id as string },
      data: {
        fromCurrencyCode: fromCurrencyCode ? fromCurrencyCode.toUpperCase() : existing.fromCurrencyCode,
        toCurrencyCode: toCurrencyCode ? toCurrencyCode.toUpperCase() : existing.toCurrencyCode,
        amountIn: newAmountIn,
        exchangeRate: newRate,
        amountOut,
        clientId: clientId ? clientId : null,
        type: type || existing.type,
        status: status || existing.status,
      },
      include: {
        user: { select: { name: true, email: true } },
        client: { select: { firstName: true, lastName: true } }
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update Transaction Error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};
