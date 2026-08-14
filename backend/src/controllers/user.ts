import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcryptjs from 'bcryptjs';

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

    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Action non autorisée.' });
    }

    const existing = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existing || existing.entrepriseId !== entrepriseId) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

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
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Contexte entreprise requis' });

    const { name, email, role, password } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Nom et adresse email requis' });
    }

    if (role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Création de super-administrateur non autorisée ici.' });
    }

    // Vérification email unique
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé par un autre compte.' });
    }

    const hash = bcryptjs.hashSync(password || 'Mdp12345!', 10);
    const user = await prisma.user.create({
      data: {
        entrepriseId,
        name,
        email: email.trim().toLowerCase(),
        role: role || 'CASHIER',
        passwordHash: hash,
      }
    });

    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const { name, email, role, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existing || existing.entrepriseId !== entrepriseId) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) updateData.passwordHash = bcryptjs.hashSync(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: id as string },
      data: updateData
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || "Echec de la mise a jour de l'utilisateur" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id: id as string } });
    if (!existing || existing.entrepriseId !== entrepriseId) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    await prisma.user.delete({ where: { id: id as string } });
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Échec de la suppression' });
  }
};

