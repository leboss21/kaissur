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
        const { code, name, symbol, sellMargin } = req.body;
        if (!code || !name || !symbol) {
            return res.status(400).json({ error: 'Code, name, and symbol are required' });
        }
        const currency = await prisma.currency.create({
            data: {
                code: code.toUpperCase(),
                name,
                symbol,
                sellMargin: sellMargin ? parseFloat(sellMargin) : 0
            }
        });
        res.status(201).json(currency);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create currency' });
    }
};
export const updateCurrencyMargin = async (req, res) => {
    try {
        const { code } = req.params;
        const { sellMargin } = req.body;
        const currency = await prisma.currency.update({
            where: { code: code },
            data: { sellMargin: parseFloat(sellMargin) || 0 }
        });
        res.json(currency);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update currency margin' });
    }
};
//# sourceMappingURL=currency.js.map