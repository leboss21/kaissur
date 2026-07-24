import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getClients = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId; // From tenant middleware
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const clients = await prisma.client.findMany({
      where: { entrepriseId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId; // From tenant middleware
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { firstName, lastName, identityType, identityNum, phone } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        identityType,
        identityNum,
        phone,
        entrepriseId
      }
    });
    
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client' });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Client ID is invalid' });
    }

    const client = await prisma.client.findFirst({
      where: { id, entrepriseId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
};
