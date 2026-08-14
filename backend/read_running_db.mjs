import { prisma } from './src/lib/prisma.js';

const users = await prisma.user.findMany({ select: { id: true, email: true, passwordHash: true, name: true } });
console.log('REAL RUNNING SERVER DB USERS AND HASHES:', users);
await prisma.$disconnect();
