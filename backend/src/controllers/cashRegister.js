import { prisma } from '../lib/prisma.js';
export const getCashRegisters = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const registers = await prisma.cashRegister.findMany({
            where: { entrepriseId },
            include: { currency: true },
            orderBy: { currencyId: 'asc' },
        });
        res.json(registers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch cash registers' });
    }
};
export const adjustCashRegister = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { currencyId, balance } = req.body;
        if (!currencyId || balance === undefined) {
            return res.status(400).json({ error: 'currencyId and balance are required' });
        }
        const register = await prisma.cashRegister.upsert({
            where: {
                entrepriseId_currencyId: {
                    entrepriseId,
                    currencyId: currencyId.toUpperCase(),
                },
            },
            update: { balance: parseFloat(balance) },
            create: {
                entrepriseId,
                currencyId: currencyId.toUpperCase(),
                balance: parseFloat(balance),
            },
            include: { currency: true },
        });
        res.json(register);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update cash register' });
    }
};
//# sourceMappingURL=cashRegister.js.map