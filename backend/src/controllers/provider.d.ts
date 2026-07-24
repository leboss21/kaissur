import type { Request, Response } from 'express';
export declare const getProviders: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createProvider: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteProvider: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=provider.d.ts.map