import 'dotenv/config';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { rawClient } from '../lib/rawClient.js';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'kaissur_jwt_secret_2025_secure_key';
const JWT_EXPIRES = '8h'; // Session de 8 heures max

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, entrepriseId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    // Find user by email - search across all entreprises or by specific one
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        ...(entrepriseId ? { entrepriseId } : {})
      },
      include: {
        entreprise: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Hashed password comparison
    if (!bcryptjs.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Vérifier le statut de l'entreprise via requête brute (status ajouté directement dans Turso)
    if (user.role !== 'SUPER_ADMIN' && user.entrepriseId) {
      const result = await rawClient.execute({
        sql: 'SELECT status FROM Entreprise WHERE id = ?',
        args: [user.entrepriseId]
      });

      const firstRow = result.rows[0];
      const entrepriseStatus = result.rows.length > 0 && firstRow
        ? String(firstRow.status ?? 'ACTIVE')
        : 'ACTIVE';

      if (entrepriseStatus === 'SUSPENDED') {
        return res.status(403).json({
          error: "L'accès pour votre entreprise est actuellement suspendu. Veuillez contacter l'administrateur de la plateforme."
        });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        entrepriseId: user.entrepriseId || null,
        role: user.role,
        name: user.name,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        entrepriseId: user.entrepriseId || null,
        entrepriseName: user.role === 'SUPER_ADMIN' ? 'Administration Globale' : (user.entreprise?.name || 'Agence')
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion.' });
  }
};

export const me = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, entrepriseId: true }
  });

  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(user);
};
