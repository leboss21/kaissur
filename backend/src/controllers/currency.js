import { prisma } from '../lib/prisma.js';
export const getCurrencies = async (req, res) => {
    try {
        const currencies = await prisma.currency.findMany({
            orderBy: { code: 'asc' }
        });
        res.json(currencies);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch currencies' });
    }
};
export const createCurrency = async (req, res) => {
    try {
        const { code, name, symbol } = req.body;
        if (!code || !name || !symbol) {
            return res.status(400).json({ error: 'Code, name, and symbol are required' });
        }
        const currency = await prisma.currency.create({
            data: {
                code: code.toUpperCase(),
                name,
                symbol
            }
        });
        res.status(201).json(currency);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create currency' });
    }
};
//# sourceMappingURL=currency.js.map