import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getCurrencies = async (req: Request, res: Response) => {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(currencies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
};

export const createCurrency = async (req: Request, res: Response) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to create currency' });
  }
};

export const updateCurrencyMargin = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { sellMargin } = req.body;

    const currency = await prisma.currency.update({
      where: { code: code as string },
      data: { sellMargin: parseFloat(sellMargin) || 0 }
    });
    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update currency margin' });
  }
};

