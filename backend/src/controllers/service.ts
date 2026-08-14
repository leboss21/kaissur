import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateReceiptForSource } from './receipt.js';

/**
 * Récupère la session active pour un utilisateur donné.
 */
async function getActiveSession(entrepriseId: string, userId: string) {
  return prisma.cashRegisterSession.findFirst({
    where: { entrepriseId, userId, status: 'OPEN' }
  });
}

export const getServiceOperations = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Unauthorized' });

    // Un caissier ne voit que ses propres opérations
    const whereClause: any = { entrepriseId };
    if (userRole === 'CASHIER') {
      whereClause.userId = userId;
    }

    const operations = await prisma.serviceOperation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        client: { select: { firstName: true, lastName: true } }
      }
    });
    res.json(operations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service operations' });
  }
};

export const createServiceOperation = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;

    if (!entrepriseId || !userId) return res.status(401).json({ error: 'Non autorisé' });

    const {
      clientId,
      type,
      subType,
      provider,
      amount,
      fees,
      phone,
      reference,
      passengerName,
      flightNumber,
      departure,
      destination,
      flightDate,
      airline,
      ticketPrice,
      commissionType,
      commission,
      notes
    } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Veuillez choisir un opérateur (ex: Moov, TMoney, Flooz, etc.).' });
    }
    if (amount === undefined || amount === null || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Veuillez saisir un montant valide supérieur à 0.' });
    }
    if (type === 'MOBILE_MONEY' && !subType) {
      return res.status(400).json({ error: "Veuillez choisir le type d'opération Mobile Money (Dépôt ou Retrait)." });
    }

    // ⛔ Vérification session active obligatoire
    const activeSession = await getActiveSession(entrepriseId, userId);
    if (!activeSession) {
      return res.status(403).json({
        error: 'Aucune session de caisse active. Vous devez ouvrir votre caisse avant d\'enregistrer une opération.'
      });
    }

    // Création de l'opération avec sessionId
    const operation = await prisma.serviceOperation.create({
      data: {
        entrepriseId,
        userId,
        sessionId: activeSession.id,
        clientId: clientId ? clientId : null,
        type,
        subType: subType || null,
        provider,
        amount: parseFloat(amount),
        fees: fees ? parseFloat(fees) : 0,
        phone: phone || null,
        reference: reference || null,
        passengerName: passengerName || null,
        flightNumber: flightNumber || null,
        departure: departure || null,
        destination: destination || null,
        flightDate: flightDate || null,
        airline: airline || null,
        ticketPrice: ticketPrice ? parseFloat(ticketPrice) : null,
        commissionType: commissionType || null,
        commission: commission ? parseFloat(commission) : null,
        notes: notes || null,
        status: 'COMPLETED'
      }
    });

    // Generate Receipt best effort
    let receipt = null;
    try {
      receipt = await generateReceiptForSource(prisma as any, entrepriseId, type, operation.id);
    } catch (receiptErr) {
      console.warn('Receipt generation failed (non-critical):', receiptErr);
    }

    res.status(201).json({ ...operation, receipt });

  } catch (error: any) {
    console.error('Service Engine Error:', error);
    res.status(500).json({ error: error?.message || "Échec du traitement de l'opération de service" });
  }
};

export const updateServiceOperation = async (req: Request, res: Response) => {
  try {
    const entrepriseId = (req as any).entrepriseId;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;

    if (!entrepriseId) return res.status(401).json({ error: 'Non autorisé' });

    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.serviceOperation.findUnique({
      where: { id: id as string },
      include: { session: { select: { status: true, userId: true } } }
    });

    if (!existing || existing.entrepriseId !== entrepriseId) {
      return res.status(404).json({ error: 'Opération non trouvée' });
    }

    // Un caissier ne peut modifier que ses propres opérations
    if (userRole === 'CASHIER' && existing.userId !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez modifier que vos propres opérations.' });
    }

    // ⛔ Interdire la modification si la session est clôturée
    if (existing.session && existing.session.status === 'CLOSED') {
      return res.status(403).json({
        error: 'Modification impossible. La session de caisse associée à cette opération est clôturée.'
      });
    }

    const updated = await prisma.serviceOperation.update({
      where: { id: id as string },
      data: {
        provider: data.provider ?? existing.provider,
        subType: data.subType ?? existing.subType,
        amount: data.amount ? parseFloat(data.amount) : existing.amount,
        fees: data.fees !== undefined ? parseFloat(data.fees) : existing.fees,
        phone: data.phone ?? existing.phone,
        reference: data.reference ?? existing.reference,
        passengerName: data.passengerName ?? existing.passengerName,
        flightNumber: data.flightNumber ?? existing.flightNumber,
        departure: data.departure ?? existing.departure,
        destination: data.destination ?? existing.destination,
        flightDate: data.flightDate ?? existing.flightDate,
        airline: data.airline ?? existing.airline,
        ticketPrice: data.ticketPrice !== undefined ? parseFloat(data.ticketPrice) : existing.ticketPrice,
        commission: data.commission !== undefined ? parseFloat(data.commission) : existing.commission,
        clientId: data.clientId ? data.clientId : null,
      },
      include: {
        user: { select: { name: true, email: true } },
        client: { select: { firstName: true, lastName: true } }
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update Service Operation Error:', error);
    res.status(500).json({ error: error?.message || "Échec de la mise à jour de l'opération" });
  }
};
