import 'dotenv/config';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kaissur_jwt_secret_2025_secure_key';

// Extend Express Request interface to include tenant info
declare global {
  namespace Express {
    interface Request {
      entrepriseId?: string;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Middleware to authenticate any valid JWT (SuperAdmin or Tenant user).
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise. Veuillez vous connecter.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.entrepriseId = payload.entrepriseId;
    (req as any).userId = payload.userId;
    (req as any).userRole = payload.role;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré. Veuillez vous reconnecter.' });
  }
};

import { rawClient } from '../lib/rawClient.js';

/**
 * Middleware to extract and verify JWT token and ensure a valid entrepriseId is present,
 * and verify that the entreprise is not suspended.
 */
export const requireTenant = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      if (!payload.entrepriseId) {
        return res.status(403).json({ error: 'Accès refusé. Cette ressource nécessite un contexte entreprise valide.' });
      }

      // Vérifier en temps réel si l'entreprise est suspendue
      if (payload.role !== 'SUPER_ADMIN') {
        const result = await rawClient.execute({
          sql: 'SELECT status FROM Entreprise WHERE id = ?',
          args: [payload.entrepriseId]
        });
        const firstRow = result.rows[0];
        const status = result.rows.length > 0 && firstRow ? String(firstRow.status ?? 'ACTIVE') : 'ACTIVE';
        if (status === 'SUSPENDED') {
          return res.status(403).json({
            error: "L'accès pour votre entreprise est actuellement suspendu. Veuillez contacter l'administrateur de la plateforme."
          });
        }
      }

      req.entrepriseId = payload.entrepriseId;
      (req as any).userId = payload.userId;
      (req as any).userRole = payload.role;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré. Veuillez vous reconnecter.' });
    }
  }

  // Fallback: legacy header pour dev si activé
  const entrepriseId = req.headers['x-entreprise-id'] as string;
  if (entrepriseId && process.env.NODE_ENV !== 'production') {
    req.entrepriseId = entrepriseId;
    (req as any).userId = 'user-test-id';
    (req as any).userRole = 'ADMIN';
    return next();
  }

  return res.status(401).json({ error: 'Authentification requise. Veuillez vous connecter.' });
};
