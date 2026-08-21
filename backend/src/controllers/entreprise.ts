import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getEntreprise = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId }
    });
    res.json(entreprise);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entreprise' });
  }
};

export const updateEntreprise = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId || 'demo-tenant';

    const { name, address, phone, email, logoUrl, taxId } = req.body;

    const entreprise = await prisma.entreprise.upsert({
      where: { id: entrepriseId },
      update: { name, address, phone, email, logoUrl, taxId },
      create: {
        id: entrepriseId,
        name: name || 'Mon Agence',
        address,
        phone,
        email,
        logoUrl,
        taxId,
      }
    });
    res.json(entreprise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update entreprise' });
  }
};

export const getMainCash = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { mainCashBalance: true }
    });

    const supplies = await prisma.mainCashSupply.findMany({
      where: { entrepriseId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    res.json({
      mainCashBalance: entreprise?.mainCashBalance || 0,
      supplies
    });
  } catch (error) {
    console.error('[getMainCash] error:', error);
    res.status(500).json({ error: 'Failed to fetch main cash details' });
  }
};

export const getLiveBalances = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch service providers for this company (Mobile Money, Crédits)
    const providers = await prisma.serviceProvider.findMany({
      where: { entrepriseId }
    });

    // Fetch active currencies & cash registers
    const cashRegisters = await prisma.cashRegister.findMany({
      where: { entrepriseId },
      include: { currency: true },
      orderBy: { currencyId: 'asc' }
    });

    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' }
    });

    // Compute running balances per service from MainCashSupply movements
    const movements = await prisma.mainCashSupply.findMany({
      where: { entrepriseId },
      select: { targetService: true, amount: true, type: true, foreignAmount: true, foreignCurrency: true }
    });

    // Balance by targetService key — normalize to lowercase to handle both old uppercase and new lowercase keys
    const balances: Record<string, { xofBalance: number; foreignAmount?: number; foreignCurrency?: string }> = {};

    for (const m of movements) {
      const key = m.targetService.toLowerCase();
      if (!balances[key]) balances[key] = { xofBalance: 0 };

      if (m.type === 'SUPPLY') {
        balances[key].xofBalance += m.amount;
        if ((m as any).foreignAmount && (m as any).foreignCurrency) {
          balances[key].foreignAmount = (balances[key].foreignAmount || 0) + ((m as any).foreignAmount as number);
          balances[key].foreignCurrency = (m as any).foreignCurrency;
        }
      } else if (m.type === 'WITHDRAWAL') {
        balances[key].xofBalance -= m.amount;
      }
    }

    res.json({ providers, cashRegisters, currencies, balances });
  } catch (error) {
    console.error('[getLiveBalances] error:', error);
    res.status(500).json({ error: 'Failed to fetch live balances' });
  }
};

export const depositMainCash = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { amount } = req.body;
    if (amount === undefined || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Veuillez saisir un montant valide supérieur à 0.' });
    }

    const updated = await prisma.entreprise.update({
      where: { id: entrepriseId },
      data: {
        mainCashBalance: { increment: parseFloat(amount) }
      }
    });

    await (prisma.mainCashSupply.create as any)({
      data: {
        entrepriseId,
        userId: (req as any).userId || 'user-test-id',
        amount: parseFloat(amount),
        targetService: 'DEPOSIT_MAIN_CASH',
        type: 'DEPOSIT'
      }
    });

    res.json({ mainCashBalance: updated.mainCashBalance });
  } catch (error) {
    console.error('[depositMainCash] error:', error);
    res.status(500).json({ error: 'Failed to deposit to main cash' });
  }
};

export const withdrawMainCash = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId || 'user-test-id';
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, motif } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Veuillez saisir un montant valide supérieur à 0.' });
    }
    if (!motif || motif.trim().length < 3) {
      return res.status(400).json({ error: 'Veuillez préciser le motif de la sortie de caisse (minimum 3 caractères).' });
    }

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { mainCashBalance: true }
    });

    if (!entreprise || entreprise.mainCashBalance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Solde de la caisse principale insuffisant pour effectuer cette sortie.' });
    }

    const [withdrawRecord, updatedEntreprise] = await (prisma.$transaction as any)([
      (prisma.mainCashSupply.create as any)({
        data: {
          entrepriseId,
          userId,
          amount: parseFloat(amount),
          targetService: 'WITHDRAWAL_MAIN_CASH',
          type: 'WITHDRAWAL',
          motif: motif.trim()
        }
      }),
      prisma.entreprise.update({
        where: { id: entrepriseId },
        data: { mainCashBalance: { decrement: parseFloat(amount) } }
      })
    ]);

    res.json({ withdrawRecord, mainCashBalance: updatedEntreprise.mainCashBalance });
  } catch (error: any) {
    console.error('[withdrawMainCash]', error);
    res.status(500).json({ error: error.message || 'Failed to process withdrawal' });
  }
};

export const supplyCashierService = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId || 'user-test-id';
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, targetService, motif, foreignAmount, foreignCurrency, exchangerName } = req.body;

    if (!amount || parseFloat(amount) <= 0 || !targetService) {
      return res.status(400).json({ error: 'Montant et service cible requis.' });
    }

    // Check if Caisse Principale has sufficient funds
    const entreprise = await prisma.entreprise.findUnique({
      where: { id: entrepriseId },
      select: { mainCashBalance: true }
    });

    if (!entreprise || entreprise.mainCashBalance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Solde de la caisse principale insuffisant.' });
    }

    // Verify there is an active session for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const activeSession = await prisma.cashRegisterSession.findFirst({
      where: {
        entrepriseId,
        status: 'OPEN',
        date: { gte: startOfDay }
      }
    });

    if (!activeSession) {
      return res.status(400).json({ error: "Aucune caisse n'est actuellement ouverte pour recevoir cet approvisionnement." });
    }

    const tsUpper = (targetService || '').toUpperCase();
    const isForex = Boolean(
      (foreignCurrency && foreignCurrency !== 'XOF') ||
      (targetService && tsUpper !== 'XOF' && !tsUpper.startsWith('MM_') && !tsUpper.startsWith('CR_'))
    );
    const forexCode = isForex ? (foreignCurrency || targetService || '').toUpperCase() : '';

    const results = await prisma.$transaction(async (tx: any) => {
      const supplyRecord = await tx.mainCashSupply.create({
        data: {
          entrepriseId,
          userId,
          amount: parseFloat(amount),
          targetService: targetService,
          type: 'SUPPLY',
          motif: motif || null,
          foreignAmount: foreignAmount ? parseFloat(foreignAmount) : null,
          foreignCurrency: isForex ? forexCode : null,
          exchangerName: exchangerName || null
        }
      });

      const updatedEntreprise = await tx.entreprise.update({
        where: { id: entrepriseId },
        data: {
          mainCashBalance: { decrement: parseFloat(amount) }
        }
      });

      if (isForex && foreignAmount && parseFloat(foreignAmount) > 0) {
        const existing = await tx.cashRegister.findUnique({
          where: {
            entrepriseId_currencyId: {
              entrepriseId,
              currencyId: forexCode
            }
          }
        });

        if (existing) {
          await tx.cashRegister.update({
            where: { id: existing.id },
            data: { balance: { increment: parseFloat(foreignAmount) } }
          });
        } else {
          await tx.cashRegister.create({
            data: {
              entrepriseId,
              currencyId: forexCode,
              balance: parseFloat(foreignAmount)
            }
          });
        }
      }

      return [supplyRecord, updatedEntreprise];
    });

    const supplyRecord = results[0];
    const updatedEntreprise = results[1];

    res.json({
      supplyRecord,
      mainCashBalance: updatedEntreprise.mainCashBalance
    });

  } catch (error: any) {
    console.error('[supplyCashierService]', error);
    res.status(500).json({ error: error.message || 'Failed to process supply' });
  }
};
