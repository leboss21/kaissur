import { prisma } from '../lib/prisma.js';
import { generateReceiptForSource } from './receipt.js';
export const getServiceOperations = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const operations = await prisma.serviceOperation.findMany({
            where: { entrepriseId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, email: true } },
                client: { select: { firstName: true, lastName: true } }
            }
        });
        res.json(operations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch service operations' });
    }
};
export const createServiceOperation = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        const userId = req.userId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { clientId, type, subType, provider, amount, fees, phone, reference, passengerName, flightNumber, departure, destination, flightDate, airline, ticketPrice, commissionType, commission, notes } = req.body;
        if (!type || !provider || amount === undefined) {
            return res.status(400).json({ error: 'Missing required service details' });
        }
        // Run in transaction to safely generate receipt
        const result = await prisma.$transaction(async (tx) => {
            const operation = await tx.serviceOperation.create({
                data: {
                    entrepriseId,
                    userId,
                    clientId,
                    type,
                    subType,
                    provider,
                    amount: parseFloat(amount),
                    fees: fees ? parseFloat(fees) : 0,
                    phone,
                    reference,
                    passengerName,
                    flightNumber,
                    departure,
                    destination,
                    flightDate,
                    airline,
                    ticketPrice: ticketPrice ? parseFloat(ticketPrice) : null,
                    commissionType,
                    commission: commission ? parseFloat(commission) : null,
                    notes,
                    status: 'COMPLETED'
                }
            });
            let receipt = null;
            if (type === 'TICKET') {
                receipt = await generateReceiptForSource(tx, entrepriseId, type, operation.id);
            }
            return { ...operation, receipt };
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Service Engine Error:', error);
        res.status(500).json({ error: 'Failed to process service operation' });
    }
};
//# sourceMappingURL=service.js.map