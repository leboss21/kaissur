import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getProviders = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const providers = await prisma.serviceProvider.findMany({
      where: { entrepriseId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(providers);
  } catch (error) {
    console.error('[getProviders]', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
};

export const createProvider = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, name, color } = req.body;
    
    if (!type || !name) {
      return res.status(400).json({ error: 'Type and name are required' });
    }

    const provider = await prisma.serviceProvider.create({
      data: {
        entrepriseId,
        type,
        name,
        color
      }
    });
    res.status(201).json(provider);
  } catch (error) {
    console.error('[createProvider]', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
};

export const deleteProvider = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const { id } = req.params;

    await prisma.serviceProvider.delete({
      where: { id, entrepriseId }
    });
    res.status(204).send();
  } catch (error) {
    console.error('[deleteProvider]', error);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
};
