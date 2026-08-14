import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getReports = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    // Un caissier ne voit que les rapports générés depuis ses propres sessions
    const whereClause: any = { entrepriseId };
    if (userRole === 'CASHIER') {
      whereClause.generatedByUserId = userId;
    }

    const reports = await prisma.dailyReport.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });

    // Récupération des noms des utilisateurs ayant généré les rapports
    const userIds = [...new Set(reports.map((r: any) => r.generatedByUserId).filter(Boolean))] as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });
    const userMap = new Map(users.map((u: any) => [u.id, u.name || u.email]));

    const enrichedReports = reports.map((r: any) => {
      let generatorName = r.generatedByUserId ? userMap.get(r.generatedByUserId) : null;
      if (!generatorName && r.reportData) {
        try {
          const parsed = JSON.parse(r.reportData);
          generatorName = parsed?.summary?.generatedBy;
        } catch {}
      }
      return {
        ...r,
        generatedByName: generatorName || 'Caissier'
      };
    });

    res.json(enrichedReports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

/**
 * POST /reports/generate
 * Génère le rapport journalier basé sur les sessions clôturées du jour.
 * SEUL un utilisateur ayant le rôle Caissier (vue caissier) peut générer ce rapport.
 */
export const generateDailyReport = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    // Restriction stricte : Seul le rôle Caissier peut générer un rapport de caisse
    if (userRole !== 'CASHIER') {
      return res.status(403).json({
        error: "Seul un utilisateur avec le rôle Caissier peut générer un rapport journalier de caisse."
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Pour un caissier : uniquement ses sessions clôturées du jour
    const sessionWhere: any = {
      entrepriseId,
      userId,
      status: 'CLOSED',
      date: { gte: startOfDay, lte: endOfDay }
    };

    const closedSessions = await prisma.cashRegisterSession.findMany({
      where: sessionWhere,
      select: { id: true }
    });

    if (closedSessions.length === 0) {
      return res.status(400).json({
        error: "Le rapport journalier ne peut être généré qu'après la fermeture d'au moins une session de caisse du jour."
      });
    }

    const sessionIds = closedSessions.map((s: any) => s.id);

    // Transactions liées aux sessions clôturées du jour
    const txns = await prisma.transaction.findMany({
      where: {
        entrepriseId,
        sessionId: { in: sessionIds },
        status: 'COMPLETED'
      },
      include: {
        user: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } }
      }
    });

    // Opérations de service liées aux sessions clôturées du jour
    const ops = await prisma.serviceOperation.findMany({
      where: {
        entrepriseId,
        sessionId: { in: sessionIds },
        status: 'COMPLETED'
      },
      include: {
        user: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } }
      }
    });

    // Totaux par type d'opération
    const totalExchangeIn = txns.reduce((sum: number, t: any) => sum + t.amountIn, 0);
    const totalExchangeOut = txns.reduce((sum: number, t: any) => sum + t.amountOut, 0);
    const totalMobileMoneyDeposits = ops
      .filter((o: any) => o.type === 'MOBILE_MONEY' && o.subType === 'DEPOSIT')
      .reduce((sum: number, o: any) => sum + o.amount, 0);
    const totalMobileMoneyWithdrawals = ops
      .filter((o: any) => o.type === 'MOBILE_MONEY' && o.subType === 'WITHDRAWAL')
      .reduce((sum: number, o: any) => sum + o.amount, 0);
    const totalMobileMoney = totalMobileMoneyDeposits + totalMobileMoneyWithdrawals;
    const totalCredit = ops
      .filter((o: any) => o.type === 'CREDIT')
      .reduce((sum: number, o: any) => sum + o.amount, 0);
    const totalTickets = ops
      .filter((o: any) => o.type === 'TICKET')
      .reduce((sum: number, o: any) => sum + o.amount, 0);

    // Ventilation détaillée par opérateur
    const mobileMoneyByProvider: Record<string, { total: number; count: number; deposits: number; withdrawals: number }> = {};
    ops.filter((o: any) => o.type === 'MOBILE_MONEY').forEach((o: any) => {
      const p = mobileMoneyByProvider[o.provider] || { total: 0, count: 0, deposits: 0, withdrawals: 0 };
      p.total += o.amount;
      p.count++;
      if (o.subType === 'DEPOSIT') p.deposits += o.amount;
      if (o.subType === 'WITHDRAWAL') p.withdrawals += o.amount;
      mobileMoneyByProvider[o.provider] = p;
    });

    const creditByProvider: Record<string, { total: number; count: number }> = {};
    ops.filter((o: any) => o.type === 'CREDIT').forEach((o: any) => {
      const p = creditByProvider[o.provider] || { total: 0, count: 0 };
      p.total += o.amount;
      p.count++;
      creditByProvider[o.provider] = p;
    });

    const ticketsByAirline: Record<string, { total: number; count: number; commission: number }> = {};
    ops.filter((o: any) => o.type === 'TICKET').forEach((o: any) => {
      const key = o.airline || o.provider || 'AUTRE';
      if (!ticketsByAirline[key]) ticketsByAirline[key] = { total: 0, count: 0, commission: 0 };
      ticketsByAirline[key].total += o.amount;
      ticketsByAirline[key].count++;
      ticketsByAirline[key].commission += o.commission || 0;
    });

    const exchangeByCurrency: Record<string, { amountIn: number; amountOut: number; count: number }> = {};
    txns.forEach((t: any) => {
      const key = `${t.fromCurrencyCode}→${t.toCurrencyCode}`;
      if (!exchangeByCurrency[key]) exchangeByCurrency[key] = { amountIn: 0, amountOut: 0, count: 0 };
      exchangeByCurrency[key].amountIn += t.amountIn;
      exchangeByCurrency[key].amountOut += t.amountOut;
      exchangeByCurrency[key].count++;
    });

    const totalFeesCollected = ops.reduce((sum: number, o: any) => sum + (o.fees || 0), 0);
    const totalCommissionTickets = ops
      .filter((o: any) => o.type === 'TICKET')
      .reduce((sum: number, o: any) => sum + (o.commission || 0), 0);

    let generatedByName = 'Agent';
    if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) generatedByName = u.name || u.email;
    }

    const reportData = JSON.stringify({
      summary: {
        generatedBy: generatedByName,
        userRole: userRole || 'CASHIER',
        sessionIds,
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
        generatedByUserId: userId,
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

    const { year, month } = req.query;
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

    const byDay: Record<string, { exchanges: number; mobileMoney: number; credit: number; tickets: number; fees: number }> = {};
    txns.forEach((t: any) => {
      const day = t.createdAt.toISOString().substring(0, 10);
      if (!byDay[day]) byDay[day] = { exchanges: 0, mobileMoney: 0, credit: 0, tickets: 0, fees: 0 };
      byDay[day].exchanges += t.amountIn;
    });
    ops.forEach((o: any) => {
      const day = o.createdAt.toISOString().substring(0, 10);
      if (!byDay[day]) byDay[day] = { exchanges: 0, mobileMoney: 0, credit: 0, tickets: 0, fees: 0 };
      if (o.type === 'MOBILE_MONEY') byDay[day].mobileMoney += o.amount;
      if (o.type === 'CREDIT') byDay[day].credit += o.amount;
      if (o.type === 'TICKET') byDay[day].tickets += o.amount;
      byDay[day].fees += o.fees || 0;
    });

    const totalExchangeIn = txns.reduce((s: number, t: any) => s + t.amountIn, 0);
    const totalExchangeOut = txns.reduce((s: number, t: any) => s + t.amountOut, 0);
    const totalMobileMoney = ops.filter((o: any) => o.type === 'MOBILE_MONEY').reduce((s: number, o: any) => s + o.amount, 0);
    const totalCredit = ops.filter((o: any) => o.type === 'CREDIT').reduce((s: number, o: any) => s + o.amount, 0);
    const totalTickets = ops.filter((o: any) => o.type === 'TICKET').reduce((s: number, o: any) => s + o.amount, 0);
    const totalFees = ops.reduce((s: number, o: any) => s + (o.fees || 0), 0);
    const totalCommission = ops.filter((o: any) => o.type === 'TICKET').reduce((s: number, o: any) => s + (o.commission || 0), 0);

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

/**
 * GET /reports/consolidated
 * Vue consolidée de toutes les sessions du jour — DIRECTEUR et ADMIN uniquement.
 */
export const getConsolidatedReport = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    if (userRole === 'CASHIER') {
      return res.status(403).json({ error: 'Accès refusé. Vue réservée aux directeurs et administrateurs.' });
    }

    const { date } = req.query;
    const filterDate = date ? new Date(date as string) : new Date();
    filterDate.setHours(0, 0, 0, 0);
    const endDate = new Date(filterDate);
    endDate.setHours(23, 59, 59, 999);

    // Récupérer toutes les sessions du jour (ouvertes et fermées)
    const sessions = await prisma.cashRegisterSession.findMany({
      where: {
        entrepriseId,
        date: { gte: filterDate, lte: endDate }
      },
      include: {
        balances: true,
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { date: 'asc' }
    });

    if (sessions.length === 0) {
      return res.json({ date: filterDate.toISOString(), sessions: [], totals: null });
    }

    const sessionIds = sessions.map((s: any) => s.id);

    // Toutes les opérations rattachées à ces sessions
    const [txns, ops] = await Promise.all([
      prisma.transaction.findMany({
        where: { entrepriseId, sessionId: { in: sessionIds }, status: 'COMPLETED' },
        include: { user: { select: { name: true } } }
      }),
      prisma.serviceOperation.findMany({
        where: { entrepriseId, sessionId: { in: sessionIds }, status: 'COMPLETED' },
        include: { user: { select: { name: true } } }
      })
    ]);

    // Totaux consolidés
    const totals = {
      sessions: sessions.length,
      openSessions: sessions.filter((s: any) => s.status === 'OPEN').length,
      closedSessions: sessions.filter((s: any) => s.status === 'CLOSED').length,
      totalTransactions: txns.length,
      totalServiceOps: ops.length,
      totalExchangeIn: txns.reduce((s: number, t: any) => s + t.amountIn, 0),
      totalExchangeOut: txns.reduce((s: number, t: any) => s + t.amountOut, 0),
      totalMobileMoneyDeposits: ops
        .filter((o: any) => o.type === 'MOBILE_MONEY' && o.subType === 'DEPOSIT')
        .reduce((s: number, o: any) => s + o.amount, 0),
      totalMobileMoneyWithdrawals: ops
        .filter((o: any) => o.type === 'MOBILE_MONEY' && o.subType === 'WITHDRAWAL')
        .reduce((s: number, o: any) => s + o.amount, 0),
      totalCredit: ops.filter((o: any) => o.type === 'CREDIT').reduce((s: number, o: any) => s + o.amount, 0),
      totalTickets: ops.filter((o: any) => o.type === 'TICKET').reduce((s: number, o: any) => s + o.amount, 0),
      totalFeesCollected: ops.reduce((s: number, o: any) => s + (o.fees || 0), 0),
    };

    // Résumé par caissier
    const byCashier = sessions.map((session: any) => {
      const sessionTxns = txns.filter((t: any) => t.sessionId === session.id);
      const sessionOps = ops.filter((o: any) => o.sessionId === session.id);
      return {
        sessionId: session.id,
        cashier: session.user,
        status: session.status,
        openedAt: session.date,
        closedAt: session.status === 'CLOSED' ? session.updatedAt : null,
        transactions: sessionTxns.length,
        serviceOps: sessionOps.length,
        exchangeIn: sessionTxns.reduce((s: number, t: any) => s + t.amountIn, 0),
        exchangeOut: sessionTxns.reduce((s: number, t: any) => s + t.amountOut, 0),
        mobileMoney: sessionOps.filter((o: any) => o.type === 'MOBILE_MONEY').reduce((s: number, o: any) => s + o.amount, 0),
        credit: sessionOps.filter((o: any) => o.type === 'CREDIT').reduce((s: number, o: any) => s + o.amount, 0),
        tickets: sessionOps.filter((o: any) => o.type === 'TICKET').reduce((s: number, o: any) => s + o.amount, 0),
        balances: session.balances,
        closingComment: session.closingComment || null,
      };
    });

    res.json({
      date: filterDate.toISOString(),
      sessions: byCashier,
      totals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate consolidated report' });
  }
};
