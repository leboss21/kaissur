import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcryptjs from 'bcryptjs';

/**
 * GET /api/superadmin/stats
 * Statistiques globales de la plateforme multi-entreprises
 */
export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    const [
      totalEntreprises,
      activeEntreprises,
      suspendedEntreprises,
      totalUsers,
      totalTransactions,
      totalServiceOps
    ] = await Promise.all([
      prisma.entreprise.count(),
      prisma.entreprise.count({ where: { status: 'ACTIVE' } as any }),
      prisma.entreprise.count({ where: { status: 'SUSPENDED' } as any }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.transaction.count(),
      prisma.serviceOperation.count()
    ]);

    const txns = await prisma.transaction.findMany({ select: { amountIn: true } });
    const ops = await prisma.serviceOperation.findMany({ select: { amount: true } });

    const totalVolume = txns.reduce((s, t) => s + (t.amountIn || 0), 0) +
                        ops.reduce((s, o) => s + (o.amount || 0), 0);

    res.json({
      totalEntreprises,
      activeEntreprises,
      suspendedEntreprises,
      totalUsers,
      totalOperations: totalTransactions + totalServiceOps,
      totalVolume
    });
  } catch (error: any) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques globales' });
  }
};

/**
 * GET /api/superadmin/entreprises
 * Liste toutes les entreprises avec leurs métriques et leur administrateur principal
 */
export const getEntreprises = async (req: Request, res: Response) => {
  try {
    const entreprises = await prisma.entreprise.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            transactions: true,
            serviceOperations: true,
            sessions: true
          }
        },
        users: {
          where: { role: 'ADMIN' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          },
          take: 1
        }
      }
    });

    const result = entreprises.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      address: e.address,
      taxId: e.taxId,
      status: (e as any).status || 'ACTIVE',
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      stats: {
        totalUsers: e._count.users,
        totalTransactions: e._count.transactions,
        totalServiceOps: e._count.serviceOperations,
        totalSessions: e._count.sessions
      },
      primaryAdmin: e.users[0] || null
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching entreprises:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des entreprises' });
  }
};

/**
 * POST /api/superadmin/entreprises
 * Création d'une nouvelle entreprise et de son Administrateur principal
 */
export const createEntreprise = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      taxId,
      adminName,
      adminEmail,
      adminPassword
    } = req.body;

    if (!name || !adminEmail || !adminPassword) {
      return res.status(400).json({
        error: "Le nom de l'entreprise, l'email de l'administrateur et le mot de passe sont requis."
      });
    }

    // Vérifier si l'email de l'admin est déjà utilisé
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        error: "L'adresse email de l'administrateur est déjà utilisée par un autre compte."
      });
    }

    const passwordHash = bcryptjs.hashSync(adminPassword.trim(), 10);

    // Création atomique de l'entreprise et de l'administrateur
    const newEntreprise = await prisma.entreprise.create({
      data: {
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        taxId: taxId ? taxId.trim() : null,
        status: 'ACTIVE',
        users: {
          create: {
            name: adminName ? adminName.trim() : 'Administrateur',
            email: adminEmail.trim().toLowerCase(),
            passwordHash,
            role: 'ADMIN'
          }
        }
      },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, createdAt: true }
        }
      }
    });

    res.status(201).json({
      message: 'Entreprise et compte administrateur créés avec succès.',
      entreprise: newEntreprise
    });
  } catch (error: any) {
    console.error('Error creating entreprise:', error);
    res.status(500).json({ error: error.message || "Erreur lors de la création de l'entreprise" });
  }
};

/**
 * PUT /api/superadmin/entreprises/:id
 * Modification des détails d'une entreprise
 */
export const updateEntreprise = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, taxId, status } = req.body;

    const existing = await prisma.entreprise.findUnique({ where: { id: id as string } });
    if (!existing) {
      return res.status(404).json({ error: 'Entreprise introuvable.' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email ? email.trim().toLowerCase() : null;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (taxId !== undefined) updateData.taxId = taxId ? taxId.trim() : null;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.entreprise.update({
      where: { id: id as string },
      data: updateData
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating entreprise:', error);
    res.status(500).json({ error: "Erreur lors de la modification de l'entreprise" });
  }
};

/**
 * PATCH /api/superadmin/entreprises/:id/status
 * Activer ou suspendre une entreprise
 */
export const toggleEntrepriseStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: "Le statut doit être 'ACTIVE' ou 'SUSPENDED'." });
    }

    const existing = await prisma.entreprise.findUnique({ where: { id: id as string } });
    if (!existing) {
      return res.status(404).json({ error: 'Entreprise introuvable.' });
    }

    const updated = await prisma.entreprise.update({
      where: { id: id as string },
      data: { status }
    });

    res.json({
      message: `Statut de l'entreprise mis à jour : ${status}`,
      entreprise: updated
    });
  } catch (error: any) {
    console.error('Error toggling entreprise status:', error);
    res.status(500).json({ error: 'Erreur lors du changement de statut.' });
  }
};

/**
 * POST /api/superadmin/entreprises/:id/reset-admin
 * Réinitialisation du mot de passe de l'administrateur d'une entreprise
 */
export const resetAdminPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }

    // Trouver l'administrateur de l'entreprise
    const admin = await prisma.user.findFirst({
      where: { entrepriseId: id as string, role: 'ADMIN' }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Aucun administrateur trouvé pour cette entreprise.' });
    }

    const passwordHash = bcryptjs.hashSync(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash }
    });

    res.json({
      message: `Mot de passe réinitialisé avec succès pour l'administrateur (${admin.email}).`
    });
  } catch (error: any) {
    console.error('Error resetting admin password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
};
