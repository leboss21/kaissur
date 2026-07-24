import type { Request, Response } from 'express';
export declare const getReceipts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getReceiptDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const generateReceiptForSource: (tx: any, entrepriseId: string, sourceType: string, sourceId: string) => Promise<any>;
//# sourceMappingURL=receipt.d.ts.map