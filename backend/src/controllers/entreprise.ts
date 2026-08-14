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

    // Record as supply with type 'DEPOSIT_MAIN_CASH'
    await prisma.mainCashSupply.create({
      data: {
        entrepriseId,
        userId: (req as any).userId || 'user-test-id',
        amount: parseFloat(amount),
        targetService: 'DEPOSIT_MAIN_CASH'
      }
    });

    res.json({ mainCashBalance: updated.mainCashBalance });
  } catch (error) {
    console.error('[depositMainCash] error:', error);
    res.status(500).json({ error: 'Failed to deposit to main cash' });
  }
};

export const supplyCashierService = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId || 'user-test-id';
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, targetService } = req.body;

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

    // Verify there is an active session for today to credit
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

    // Use transaction to update database safely
    const [supplyRecord, updatedEntreprise] = await prisma.$transaction([
      prisma.mainCashSupply.create({
        data: {
          entrepriseId,
          userId, // The user performing the action (admin)
          amount: parseFloat(amount),
          targetService: targetService.toUpperCase()
        }
      }),
      prisma.entreprise.update({
        where: { id: entrepriseId },
        data: {
          mainCashBalance: { decrement: parseFloat(amount) }
        }
      })
    ]);

    res.json({
      supplyRecord,
      mainCashBalance: updatedEntreprise.mainCashBalance
    });

  } catch (error: any) {
    console.error('[supplyCashierService]', error);
    res.status(500).json({ error: error.message || 'Failed to process supply' });
  }
};
