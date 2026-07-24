import { prisma } from '../lib/prisma.js';
export const getUsers = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const users = await prisma.user.findMany({
            where: { entrepriseId }
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
export const updateUserRole = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { id } = req.params;
        const { role } = req.body;
        const user = await prisma.user.update({
            where: { id: id },
            data: { role }
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
};
export const createUser = async (req, res) => {
    try {
        const entrepriseId = req.entrepriseId;
        if (!entrepriseId)
            return res.status(401).json({ error: 'Unauthorized' });
        const { name, email, role, password } = req.body;
        const user = await prisma.user.create({
            data: {
                entrepriseId,
                name,
                email,
                role: role || 'CASHIER',
                passwordHash: password || 'default-password-hash', // In a real app, hash this!
            }
        });
        res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};
//# sourceMappingURL=user.js.map