import type { Request, Response } from 'express';
export declare const getCurrencies: (req: Request, res: Response) => Promise<void>;
export declare const createCurrency: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCurrencyMargin: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=currency.d.ts.map