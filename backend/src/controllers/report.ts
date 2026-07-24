import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getReports = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const reports = await prisma.dailyReport.findMany({
      where: { entrepriseId },
      orderBy: { date: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

export const generateDailyReport = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Fetch today's transactions
    const txns = await prisma.transaction.findMany({
      where: { entrepriseId, createdAt: { gte: startOfDay } },
      include: { user: { select: { name: true } }, client: { select: { firstName: true, lastName: true } } }
    });

    // Fetch today's service operations
    const ops = await prisma.serviceOperation.findMany({
      where: { entrepriseId, createdAt: { gte: startOfDay } },
      include: { user: { select: { name: true } }, client: { select: { firstName: true, lastName: true } } }
    });

    // Aggregate totals
    const totalExchangeIn = txns.reduce((sum, t) => sum + t.amountIn, 0);
    const totalExchangeOut = txns.reduce((sum, t) => sum + t.amountOut, 0);
    const totalMobileMoneyDeposits = ops.filter(o => o.type === 'MOBILE_MONEY' && o.subType === 'DEPOSIT').reduce((sum, o) => sum + o.amount, 0);
    const totalMobileMoneyWithdrawals = ops.filter(o => o.type === 'MOBILE_MONEY' && o.subType === 'WITHDRAWAL').reduce((sum, o) => sum + o.amount, 0);
    const totalMobileMoney = totalMobileMoneyDeposits + totalMobileMoneyWithdrawals; // kept for backwards compatibility if needed
    const totalCredit = ops.filter(o => o.type === 'CREDIT').reduce((sum, o) => sum + o.amount, 0);
    const totalTickets = ops.filter(o => o.type === 'TICKET').reduce((sum, o) => sum + o.amount, 0);

    // Detailed breakdown by operator
    const mobileMoneyByProvider: Record<string, { total: number; count: number; deposits: number; withdrawals: number }> = {};
    ops.filter(o => o.type === 'MOBILE_MONEY').forEach(o => {
      if (!mobileMoneyByProvider[o.provider]) mobileMoneyByProvider[o.provider] = { total: 0, count: 0, deposits: 0, withdrawals: 0 };
      mobileMoneyByProvider[o.provider].total += o.amount;
      mobileMoneyByProvider[o.provider].count++;
      if (o.subType === 'DEPOSIT') mobileMoneyByProvider[o.provider].deposits += o.amount;
      if (o.subType === 'WITHDRAWAL') mobileMoneyByProvider[o.provider].withdrawals += o.amount;
    });

    const creditByProvider: Record<string, { total: number; count: number }> = {};
    ops.filter(o => o.type === 'CREDIT').forEach(o => {
      if (!creditByProvider[o.provider]) creditByProvider[o.provider] = { total: 0, count: 0 };
      creditByProvider[o.provider].total += o.amount;
      creditByProvider[o.provider].count++;
    });

    const ticketsByAirline: Record<string, { total: number; count: number; commission: number }> = {};
    ops.filter(o => o.type === 'TICKET').forEach(o => {
      const key = o.airline || o.provider || 'AUTRE';
      if (!ticketsByAirline[key]) ticketsByAirline[key] = { total: 0, count: 0, commission: 0 };
      ticketsByAirline[key].total += o.amount;
      ticketsByAirline[key].count++;
      ticketsByAirline[key].commission += o.commission || 0;
    });

    const exchangeByCurrency: Record<string, { amountIn: number; amountOut: number; count: number; profit: number }> = {};
    txns.forEach(t => {
      const key = `${t.fromCurrencyCode}→${t.toCurrencyCode}`;
      if (!exchangeByCurrency[key]) exchangeByCurrency[key] = { amountIn: 0, amountOut: 0, count: 0, profit: 0 };
      exchangeByCurrency[key].amountIn += t.amountIn;
      exchangeByCurrency[key].amountOut += t.amountOut;
      exchangeByCurrency[key].count++;
    });

    const totalFeesCollected = ops.reduce((sum, o) => sum + (o.fees || 0), 0);
    const totalCommissionTickets = ops.filter(o => o.type === 'TICKET').reduce((sum, o) => sum + (o.commission || 0), 0);

    const reportData = JSON.stringify({
      summary: {
        totalTransactions: txns.length,
        totalServiceOps: ops.length,
        totalExchangeIn,
        totalExchangeOut,
        totalMobileMoney,
        totalMobileMoneyDeposits,
        totalMobileMoneyWithdrawals,
        totalCredit,
        totalTickets,
        totalFeesCollected,
        totalCommissionTickets
      },
      breakdown: {
        mobileMoneyByProvider,
        creditByProvider,
        ticketsByAirline,
        exchangeByCurrency,
      },
      transactions: txns,
      serviceOperations: ops,
    });

    const report = await prisma.dailyReport.create({
      data: {
        entrepriseId,
        totalExchangeIn,
        totalExchangeOut,
        totalMobileMoney,
        totalMobileMoneyDeposits,
        totalMobileMoneyWithdrawals,
        totalCredit,
        totalTickets,
        reportData
      }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

export const getMonthlyReport = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    const { year, month } = req.query; // month: 1-12
    const y = parseInt(year as string) || new Date().getFullYear();
    const m = parseInt(month as string) || new Date().getMonth() + 1;

    const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

    const [txns, ops] = await Promise.all([
      prisma.transaction.findMany({
        where: { entrepriseId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
        include: { user: { select: { name: true } } }
      }),
      prisma.serviceOperation.findMany({
        where: { entrepriseId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
        include: { user: { select: { name: true } } }
      })
    ]);

    // Group by day
    const byDay: Record<string, { exchanges: number; mobileMoney: number; credit: number; tickets: number; fees: number }> = {};
    txns.forEach(t => {
      const day = t.createdAt.toISOString().substring(0, 10);
      if (!byDay[day]) byDay[day] = { exchanges: 0, mobileMoney: 0, credit: 0, tickets: 0, fees: 0 };
      byDay[day].exchanges += t.amountIn;
    });
    ops.forEach(o => {
      const day = o.createdAt.toISOString().substring(0, 10);
      if (!byDay[day]) byDay[day] = { exchanges: 0, mobileMoney: 0, credit: 0, tickets: 0, fees: 0 };
      if (o.type === 'MOBILE_MONEY') byDay[day].mobileMoney += o.amount;
      if (o.type === 'CREDIT') byDay[day].credit += o.amount;
      if (o.type === 'TICKET') byDay[day].tickets += o.amount;
      byDay[day].fees += o.fees || 0;
    });

    const totalExchangeIn = txns.reduce((s, t) => s + t.amountIn, 0);
    const totalExchangeOut = txns.reduce((s, t) => s + t.amountOut, 0);
    const totalMobileMoney = ops.filter(o => o.type === 'MOBILE_MONEY').reduce((s, o) => s + o.amount, 0);
    const totalCredit = ops.filter(o => o.type === 'CREDIT').reduce((s, o) => s + o.amount, 0);
    const totalTickets = ops.filter(o => o.type === 'TICKET').reduce((s, o) => s + o.amount, 0);
    const totalFees = ops.reduce((s, o) => s + (o.fees || 0), 0);
    const totalCommission = ops.filter(o => o.type === 'TICKET').reduce((s, o) => s + (o.commission || 0), 0);

    res.json({
      period: { year: y, month: m },
      summary: {
        totalTransactions: txns.length,
        totalServiceOps: ops.length,
        totalExchangeIn,
        totalExchangeOut,
        totalMobileMoney,
        totalCredit,
        totalTickets,
        totalFees,
        totalCommission,
      },
      byDay,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
};
