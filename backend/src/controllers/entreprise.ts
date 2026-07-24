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
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

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
