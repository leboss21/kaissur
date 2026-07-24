import type { Request, Response } from 'express';
export declare const getClients: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createClient: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getClientById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=client.d.ts.map