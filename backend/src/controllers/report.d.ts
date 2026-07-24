import type { Request, Response } from 'express';
export declare const getReports: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const generateDailyReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMonthlyReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=report.d.ts.map