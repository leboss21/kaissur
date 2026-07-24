import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getReceipts = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const receipts = await prisma.receipt.findMany({
      where: { entrepriseId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
};

export const getReceiptDetails = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id }
    });

    if (!receipt || receipt.entrepriseId !== entrepriseId) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    let sourceData = null;
    if (receipt.sourceType === 'EXCHANGE') {
      sourceData = await prisma.transaction.findUnique({ where: { id: receipt.sourceId }, include: { client: true, user: true } });
    } else {
      sourceData = await prisma.serviceOperation.findUnique({ where: { id: receipt.sourceId }, include: { client: true, user: true } });
    }

    const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });

    res.json({ receipt, sourceData, entreprise });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipt details' });
  }
};

export const generateReceiptForSource = async (
  tx: any, 
  entrepriseId: string, 
  sourceType: string, 
  sourceId: string
) => {
  const currentYear = new Date().getFullYear();
  const count = await tx.receipt.count({
    where: { 
      entrepriseId,
      receiptNumber: { startsWith: `REC-${currentYear}-` }
    }
  });

  const nextSeq = (count + 1).toString().padStart(5, '0');
  const receiptNumber = `REC-${currentYear}-${nextSeq}`;

  return await tx.receipt.create({
    data: {
      entrepriseId,
      receiptNumber,
      sourceType,
      sourceId
    }
  });
};
