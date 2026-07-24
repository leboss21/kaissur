import type { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include tenant info
declare global {
  namespace Express {
    interface Request {
      entrepriseId?: string;
    }
  }
}

/**
 * Middleware to extract entrepriseId from headers (or JWT token)
 * and inject it into the request for Option A tenant isolation.
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  // In a real scenario, this might come from a decoded JWT payload.
  // For now, we accept it as a header for simplicity, defaulting to demo-tenant
  const entrepriseId = (req.headers['x-entreprise-id'] as string) || 'demo-tenant';

  req.entrepriseId = entrepriseId;
  (req as any).userId = 'user-test-id'; // injected automatically
  next();
};
