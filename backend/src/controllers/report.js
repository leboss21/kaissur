import { prisma } from '../lib/prisma.js';
export const getReports = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const reports = await prisma.dailyReport.findMany({
            where: { entrepriseId },
            orderBy: { date: 'desc' }
        });
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};
export const generateDailyReport = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        // Fetch today's transactions
        const txns = await prisma.transaction.findMany({
            where: {
                entrepriseId,
                createdAt: { gte: startOfDay }
            }
        });
        // Fetch today's service operations
        const ops = await prisma.serviceOperation.findMany({
            where: {
                entrepriseId,
                createdAt: { gte: startOfDay }
            }
        });
        const totalExchangeIn = txns.reduce((sum, t) => sum + t.amountIn, 0);
        const totalExchangeOut = txns.reduce((sum, t) => sum + t.amountOut, 0);
        const totalMobileMoney = ops.filter(o => o.type === 'MOBILE_MONEY').reduce((sum, o) => sum + o.amount, 0);
        const totalCredit = ops.filter(o => o.type === 'CREDIT').reduce((sum, o) => sum + o.amount, 0);
        const totalTickets = ops.filter(o => o.type === 'TICKET').reduce((sum, o) => sum + o.amount, 0);
        const report = await prisma.dailyReport.create({
            data: {
                entrepriseId,
                totalExchangeIn,
                totalExchangeOut,
                totalMobileMoney,
                totalCredit,
                totalTickets,
                reportData: JSON.stringify({ txns, ops }) // Store raw data for detailed export
            }
        });
        res.status(201).json(report);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate report' });
    }
};
//# sourceMappingURL=report.js.map