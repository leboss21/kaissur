import type { Request, Response, NextFunction } from 'express';
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
export declare const requireTenant: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=tenant.d.ts.map