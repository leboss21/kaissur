import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const users = await prisma.user.findMany({
      where: { entrepriseId }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { role } = req.body;

    const user = await prisma.user.update({
      where: { id: id as string },
      data: { role }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId || 'demo-tenant';

    // Ensure Entreprise exists in database before linking User (foreign key constraint)
    await prisma.entreprise.upsert({
      where: { id: entrepriseId },
      update: {},
      create: {
        id: entrepriseId,
        name: 'Mon Agence',
      }
    });

    const { name, email, role, password } = req.body;

    const user = await prisma.user.create({
      data: {
        entrepriseId,
        name,
        email,
        role: role || 'CASHIER',
        passwordHash: password || 'default-password-hash',
      }
    });

    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
};
