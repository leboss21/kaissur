import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

async function ensureDefaultProviders(entrepriseId: string) {
  const count = await prisma.serviceProvider.count({ where: { entrepriseId } });
  if (count === 0) {
    const defaults = [
      { type: 'MOBILE_MONEY', name: 'TMONEY', color: '#eab308' },
      { type: 'MOBILE_MONEY', name: 'FLOOZ', color: '#2563eb' },
      { type: 'MOBILE_MONEY', name: 'MOOV', color: '#60a5fa' },
      { type: 'MOBILE_MONEY', name: 'YAS', color: '#16a34a' },
      { type: 'CREDIT', name: 'MOOV', color: '#60a5fa' },
      { type: 'CREDIT', name: 'YAS', color: '#16a34a' },
    ];
    for (const d of defaults) {
      await prisma.serviceProvider.create({
        data: { entrepriseId, ...d }
      });
    }
  }
}

function normalizeProvider(name: string) {
  if (!name) return '';
  return name.toUpperCase().replace(/[\s\-_]/g, '');
}

/**
 * Calcule les soldes théoriques de fin de session en se basant
 * STRICTEMENT sur les opérations rattachées à la session via sessionId.
 * Fallback sur l'horodatage si les opérations n'ont pas de sessionId (données héritées).
 */
async function calculateExpectedEndingBalances(session: any) {
  if (!session) return null;

  const sessionId = session.id;
  const sessionStartDate = new Date(session.createdAt || session.date);

  // Get all currencies defined in DB to dynamically test currency accounts
  const currencies = await prisma.currency.findMany();
  const currencyCodes = new Set(currencies.map((c: any) => c.code.toUpperCase()));
  currencyCodes.add('XOF');
  currencyCodes.add('USD');
  currencyCodes.add('EUR');
  currencyCodes.add('GBP');

  // Get providers for ID to name mapping
  const providers = await prisma.serviceProvider.findMany({
    where: { entrepriseId: session.entrepriseId }
  });
  const providerIdToNameMap = new Map(providers.map((p: any) => [p.id, p.name]));

  // Transactions liées à cette session (via sessionId en priorité, sinon horodatage)
  const txns = await prisma.transaction.findMany({
    where: {
      entrepriseId: session.entrepriseId,
      userId: session.userId,
      status: 'COMPLETED',
      OR: [
        { sessionId: sessionId },
        // Fallback pour données héritées sans sessionId
        { sessionId: null, createdAt: { gte: sessionStartDate } }
      ]
    }
  });

  // Opérations de service liées à cette session
  const ops = await prisma.serviceOperation.findMany({
    where: {
      entrepriseId: session.entrepriseId,
      userId: session.userId,
      status: 'COMPLETED',
      OR: [
        { sessionId: sessionId },
        { sessionId: null, createdAt: { gte: sessionStartDate } }
      ]
    }
  });

  // Approvisionnements de la caisse principale
  const supplies = await prisma.mainCashSupply.findMany({
    where: {
      entrepriseId: session.entrepriseId,
      createdAt: { gte: sessionStartDate }
    }
  });

  const updatedBalances = session.balances.map((bal: any) => {
    const accountId = bal.accountId;
    const normAccountId = normalizeProvider(accountId);
    let expectedEndingBalance = bal.startingBalance;

    const isCurrency = currencyCodes.has(accountId.toUpperCase());
    
    // 1. Add supplies from Main Cash
    const matchingSupplies = supplies.filter((s: any) => {
      const normTarget = normalizeProvider(s.targetService);
      return normTarget === normAccountId ||
             normTarget === normalizeProvider(accountId.replace(/^(MM_|CR_)/, '')) ||
             normAccountId === normalizeProvider(s.targetService.replace(/^(MM_|CR_)/, ''));
    });
    
    const totalSupplies = matchingSupplies.reduce((sum: number, s: any) => {
      // If supplying a foreign currency, use foreignAmount. Otherwise, use amount.
      const val = (isCurrency && accountId.toUpperCase() !== 'XOF' && s.foreignAmount) ? s.foreignAmount : s.amount;
      return sum + val;
    }, 0);
    expectedEndingBalance += totalSupplies;

    // 2. Currency Exchanges (XOF, USD, EUR, etc.)
    if (isCurrency) {
      const inTxns = txns.filter((t: any) => t.fromCurrencyCode.toUpperCase() === accountId.toUpperCase());
      const outTxns = txns.filter((t: any) => t.toCurrencyCode.toUpperCase() === accountId.toUpperCase());
      expectedEndingBalance += inTxns.reduce((sum: number, t: any) => sum + t.amountIn, 0);
      expectedEndingBalance -= outTxns.reduce((sum: number, t: any) => sum + t.amountOut, 0);
    }

    // 3. Service operations affecting Physical XOF Cash Drawer
    if (accountId.toUpperCase() === 'XOF') {
      for (const op of ops) {
        if ((op as any).type === 'MOBILE_MONEY') {
          if ((op as any).subType === 'DEPOSIT') {
            expectedEndingBalance += ((op as any).amount + ((op as any).fees || 0));
          } else if ((op as any).subType === 'WITHDRAWAL') {
            expectedEndingBalance -= (op as any).amount;
          }
        } else if ((op as any).type === 'CREDIT') {
          expectedEndingBalance += (op as any).amount;
        } else if ((op as any).type === 'TICKET') {
          expectedEndingBalance += (op as any).amount;
        }
      }
    }

    // 4. Mobile Money Balances (MM_TMONEY, MM_FLOOZ, etc.)
    if (accountId.startsWith('MM_') || (!isCurrency && !accountId.startsWith('CR_'))) {
      const rawProvider = accountId.startsWith('MM_') ? accountId.substring(3) : accountId;
      const provName = providerIdToNameMap.get(rawProvider) || rawProvider;
      const provNorm = normalizeProvider(provName);

      const mmOps = ops.filter((op: any) => op.type === 'MOBILE_MONEY' && normalizeProvider(op.provider) === provNorm);
      for (const op of mmOps) {
        if ((op as any).subType === 'DEPOSIT') {
          expectedEndingBalance -= (op as any).amount;
        } else if ((op as any).subType === 'WITHDRAWAL') {
          expectedEndingBalance += (op as any).amount;
        }
      }
    }

    // 5. Credit Balances (CR_MOOV, CR_YAS, etc.)
    if (accountId.startsWith('CR_')) {
      const rawProvider = accountId.substring(3);
      const provName = providerIdToNameMap.get(rawProvider) || rawProvider;
      const provNorm = normalizeProvider(provName);

      const crOps = ops.filter((op: any) => op.type === 'CREDIT' && normalizeProvider(op.provider) === provNorm);
      for (const op of crOps) {
        expectedEndingBalance -= (op as any).amount;
      }
    }

    let displayName = accountId;
    if (accountId.startsWith('MM_') || accountId.startsWith('CR_')) {
      const rawProvider = accountId.substring(3);
      const name = providerIdToNameMap.get(rawProvider);
      if (name) {
        displayName = accountId.startsWith('MM_') ? `Mobile Money - ${name}` : `Crédit - ${name}`;
      }
    }

    return {
      ...bal,
      expectedEndingBalance,
      displayName
    };
  });

  return {
    ...session,
    balances: updatedBalances
  };
}

/**
 * GET /sessions/current
 * Retourne la session OPEN du caissier connecté.
 * Accessible à tous les rôles (lecture seule pour directeur).
 */
export const getSession = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!entrepriseId || !userId) return res.status(401).json({ error: 'Unauthorized' });

    // Les directeurs et admins voient un résumé, pas une session personnelle
    // On retourne quand même la session du caissier connecté (ou null si admin/directeur)
    const whereClause: any = {
      entrepriseId,
      status: 'OPEN'
    };

    // Un caissier ne voit que SA session
    if (userRole === 'CASHIER' || userRole === 'CAISSIER') {
      whereClause.userId = userId;
    } else if (userRole === 'DIRECTEUR') {
      // Directeur : pas de session propre, retourne null
      return res.json(null);
    }
    // ADMIN voit sa propre session uniquement via /current
    whereClause.userId = userId;

    const session = await prisma.cashRegisterSession.findFirst({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { balances: true }
    });

    if (!session) {
      return res.json(null);
    }

    const computed = await calculateExpectedEndingBalances(session);
    res.json(computed);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

/**
 * GET /sessions/all
 * Vue consolidée de toutes les sessions de l'entreprise — ADMIN et DIRECTEUR uniquement.
 */
export const getAllSessions = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    // Caissier ne peut pas accéder à la vue globale
    if (userRole === 'CASHIER' || userRole === 'CAISSIER') {
      return res.status(403).json({ error: 'Accès refusé. Vue réservée aux directeurs et administrateurs.' });
    }

    const { date } = req.query;
    const filterDate = date ? new Date(date as string) : new Date();
    filterDate.setHours(0, 0, 0, 0);
    const endDate = new Date(filterDate);
    endDate.setHours(23, 59, 59, 999);

    const sessions = await prisma.cashRegisterSession.findMany({
      where: {
        entrepriseId,
        date: { gte: filterDate, lte: endDate }
      },
      include: {
        balances: true,
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

/**
 * POST /sessions/open
 * Ouvre une nouvelle session de caisse pour le caissier connecté.
 * BLOQUE si une session est déjà active pour ce caissier.
 */
export const openSession = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    if (!entrepriseId || !userId) return res.status(401).json({ error: 'Unauthorized' });

    // ⛔ Blocage double ouverture
    const existingSession = await prisma.cashRegisterSession.findFirst({
      where: { entrepriseId, userId, status: 'OPEN' }
    });

    if (existingSession) {
      return res.status(409).json({
        error: 'Une session de caisse est déjà ouverte pour ce caissier. Veuillez clôturer la session en cours avant d\'en ouvrir une nouvelle.',
        sessionId: existingSession.id
      });
    }

    await prisma.entreprise.upsert({
      where: { id: entrepriseId },
      update: {},
      create: { id: entrepriseId, name: 'Mon Agence' }
    });

    await ensureDefaultProviders(entrepriseId);

    const currencies = await prisma.currency.findMany();
    const providers = await prisma.serviceProvider.findMany({
      where: { entrepriseId }
    });

    // Dernière session CLOSED de CE caissier (pas de toute l'entreprise)
    const lastSession = await prisma.cashRegisterSession.findFirst({
      where: { entrepriseId, userId, status: 'CLOSED' },
      orderBy: { date: 'desc' },
      include: { balances: true }
    });

    const getStartingBalance = (accountId: string, fallbackAccountId?: string) => {
      if (!lastSession) return 0;
      let bal = lastSession.balances.find((b: any) => b.accountId === accountId);
      if (!bal && fallbackAccountId) {
        bal = lastSession.balances.find((b: any) => b.accountId === fallbackAccountId);
      }
      return bal?.declaredEndingBalance ?? bal?.expectedEndingBalance ?? 0;
    };

    const balancesData = [];

    for (const cur of currencies) {
      balancesData.push({
        accountId: cur.code,
        startingBalance: getStartingBalance(cur.code),
        expectedEndingBalance: getStartingBalance(cur.code)
      });
    }

    for (const prov of providers) {
      // Use provider ID so it matches targetService in MainCashSupply (MM_{id} / CR_{id})
      const accountId = prov.type === 'MOBILE_MONEY' ? `MM_${prov.id}` : `CR_${prov.id}`;
      // Fallback to name-based accountId for migrating from old sessions
      const fallbackAccountId = prov.type === 'MOBILE_MONEY' ? `MM_${prov.name}` : `CR_${prov.name}`;
      
      const startingBalance = getStartingBalance(accountId, fallbackAccountId);
      balancesData.push({
        accountId,
        startingBalance,
        expectedEndingBalance: startingBalance
      });
    }

    const session = await prisma.cashRegisterSession.create({
      data: {
        entrepriseId,
        userId,
        status: 'OPEN',
        balances: {
          create: balancesData
        }
      },
      include: { balances: true }
    });

    res.status(201).json(session);
  } catch (error: any) {
    console.error('Failed to open session:', error);
    res.status(500).json({ error: 'Failed to open session: ' + (error.message || 'Server error') });
  }
};

/**
 * POST /sessions/:sessionId/close
 * Clôture la session de caisse.
 * - Vérifie que la session est encore OPEN
 * - Vérifie que la session appartient bien au caissier connecté
 * - Exige un commentaire si l'écart global est non nul
 */
export const closeSession = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    if (!entrepriseId || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const sessionId = req.params.sessionId as string;
    const { declaredBalances, billBreakdown, physicalBalance, theoreticalBalance, closingComment } = req.body;

    const session = await prisma.cashRegisterSession.findUnique({
      where: { id: sessionId },
      include: { balances: true }
    });

    // Vérifications d'intégrité
    if (!session) {
      return res.status(404).json({ error: 'Session introuvable.' });
    }
    if (session.entrepriseId !== entrepriseId) {
      return res.status(403).json({ error: 'Accès refusé. Cette session n\'appartient pas à votre entreprise.' });
    }
    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez clôturer que votre propre session.' });
    }
    if (session.status === 'CLOSED') {
      return res.status(409).json({ error: 'Cette session est déjà clôturée. Aucune modification n\'est possible.' });
    }

    // Recalcul des soldes théoriques
    const computedSession = await calculateExpectedEndingBalances(session);
    if (!computedSession) return res.status(500).json({ error: 'Failed to calculate expected balances' });

    // Calcul de l'écart global
    const totalDiscrepancy = declaredBalances.reduce((total: number, decl: any) => {
      const bal = computedSession.balances.find((b: any) => b.accountId === decl.accountId);
      if (bal) {
        return total + Math.abs(decl.amount - bal.expectedEndingBalance);
      }
      return total;
    }, 0);

    // Commentaire obligatoire si écart ≠ 0
    if (totalDiscrepancy > 0 && (!closingComment || closingComment.trim() === '')) {
      return res.status(400).json({
        error: 'Un commentaire est obligatoire lorsqu\'il existe un écart entre le solde déclaré et le solde théorique.',
        totalDiscrepancy
      });
    }

    // Mise à jour des soldes
    const updatePromises = declaredBalances.map(async (decl: any) => {
      const bal = computedSession.balances.find((b: any) => b.accountId === decl.accountId);
      if (bal) {
        const discrepancy = decl.amount - bal.expectedEndingBalance;
        return prisma.sessionBalance.update({
          where: { id: bal.id },
          data: {
            expectedEndingBalance: bal.expectedEndingBalance,
            declaredEndingBalance: decl.amount,
            discrepancy
          }
        });
      }
    });

    await Promise.all(updatePromises);

    const closedSession = await prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        billBreakdown: billBreakdown ? JSON.stringify(billBreakdown) : null,
        physicalBalance: physicalBalance !== undefined ? parseFloat(physicalBalance) : null,
        theoreticalBalance: theoreticalBalance !== undefined ? parseFloat(theoreticalBalance) : null,
        closingComment: closingComment ? closingComment.trim() : null,
      },
      include: { balances: true }
    });

    res.json(closedSession);
  } catch (error) {
    console.error('Failed to close session:', error);
    res.status(500).json({ error: 'Failed to close session' });
  }
};
