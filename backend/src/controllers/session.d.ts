import type { Request, Response } from 'express';
export declare const getSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const openSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const closeSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=session.d.ts.map