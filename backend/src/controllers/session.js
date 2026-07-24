import { prisma } from '../lib/prisma.js';
export const getSession = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        const userId = req.userId;
        if (!entrepriseId || !userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const session = await prisma.cashRegisterSession.findFirst({
            where: {
                entrepriseId,
                userId,
                status: 'OPEN',
                date: { gte: startOfDay }
            },
            include: { balances: true }
        });
        res.json(session || null);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch session' });
    }
};
export const openSession = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        const userId = req.userId;
        if (!entrepriseId || !userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const session = await prisma.cashRegisterSession.create({
            data: {
                entrepriseId,
                userId,
                status: 'OPEN',
                balances: {
                    create: [
                        { accountId: 'XOF', startingBalance: 0, expectedEndingBalance: 0 },
                        { accountId: 'USD', startingBalance: 0, expectedEndingBalance: 0 },
                        { accountId: 'TMONEY', startingBalance: 0, expectedEndingBalance: 0 },
                        { accountId: 'FLOOZ', startingBalance: 0, expectedEndingBalance: 0 },
                        { accountId: 'MOOV', startingBalance: 0, expectedEndingBalance: 0 },
                        { accountId: 'YAS', startingBalance: 0, expectedEndingBalance: 0 },
                    ]
                }
            },
            include: { balances: true }
        });
        res.status(201).json(session);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to open session' });
    }
};
export const closeSession = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        const userId = req.userId;
        if (!entrepriseId || !userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const sessionId = req.params.sessionId;
        const { declaredBalances } = req.body;
        const session = await prisma.cashRegisterSession.findUnique({
            where: { id: sessionId },
            include: { balances: true }
        });
        if (!session || session.userId !== userId)
            return res.status(404).json({ error: 'Session not found' });
        const updatePromises = declaredBalances.map(async (decl) => {
            const bal = session.balances.find((b) => b.accountId === decl.accountId);
            if (bal) {
                const discrepancy = decl.amount - bal.expectedEndingBalance;
                return prisma.sessionBalance.update({
                    where: { id: bal.id },
                    data: {
                        declaredEndingBalance: decl.amount,
                        discrepancy
                    }
                });
            }
        });
        await Promise.all(updatePromises);
        const closedSession = await prisma.cashRegisterSession.update({
            where: { id: sessionId },
            data: { status: 'CLOSED' },
            include: { balances: true }
        });
        res.json(closedSession);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to close session' });
    }
};
//# sourceMappingURL=session.js.map