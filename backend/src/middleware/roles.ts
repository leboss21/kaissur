import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware to block write operations (POST, PUT, PATCH, DELETE) for the DIRECTEUR role.
 * Directors have read-only access to statistics.
 */
export const requireNotDirecteur = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole;
  if (role === 'DIRECTEUR') {
    return res.status(403).json({ error: 'Accès refusé. Le rôle Directeur est en lecture seule.' });
  }
  return next();
};

/**
 * Middleware to restrict route access to SUPER_ADMIN only.
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole;
  if (role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Accès refusé. Cette action nécessite le rôle Super-Administrateur.' });
  }
  return next();
};

/**
 * Middleware to restrict route access to ADMIN (company admin) only.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Accès refusé. Cette action nécessite le rôle Administrateur d\'entreprise.' });
  }
  return next();
};

/**
 * Middleware to restrict route access to CHEF_CAISSE only (or ADMIN).
 */
export const requireChefCaisseOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole;
  if (role !== 'CHEF_CAISSE' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Accès refusé. Cette action nécessite le rôle Chef Caisse.' });
  }
  return next();
};

/**
 * Middleware to restrict route access to CHEF_CAISSE only.
 */
export const requireChefCaisse = (req: Request, res: Response, next: NextFunction) => {
  const role = (req as any).userRole;
  if (role !== 'CHEF_CAISSE' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Accès refusé. Cette action nécessite le rôle Chef Caisse.' });
  }
  return next();
};
