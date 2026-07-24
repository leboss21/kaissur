import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getRates = async (req: Request, res: Response) => {
  try {
    const rates = await prisma.exchangeRate.findMany({
      orderBy: { date: 'desc' },
      include: { currency: true }
    });
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
};

export const createRate = async (req: Request, res: Response) => {
  try {
    const { currencyId, buyRate, sellRate } = req.body;
    
    if (!currencyId || !buyRate || !sellRate) {
      return res.status(400).json({ error: 'currencyId, buyRate, and sellRate are required' });
    }

    // Upsert rate for the current date to ensure uniqueness per day if needed
    // For simplicity, we just create it here
    const rate = await prisma.exchangeRate.create({
      data: {
        currencyId,
        buyRate: parseFloat(buyRate),
        sellRate: parseFloat(sellRate)
      },
      include: { currency: true }
    });
    
    res.status(201).json(rate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exchange rate' });
  }
};
