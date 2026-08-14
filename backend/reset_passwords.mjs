import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

const DEFAULT_PASSWORD = 'Mdp12345';
const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

console.log('New hash for Mdp12345:', hash);

// Verify the hash first
const ok = bcrypt.compareSync(DEFAULT_PASSWORD, hash);
console.log('Hash verification:', ok);

// Reset all users' passwords
const result = await p.user.updateMany({
  data: { passwordHash: hash }
});

console.log(`Updated ${result.count} user(s).`);

// Show all users after update
const users = await p.user.findMany({ select: { id: true, email: true, name: true, role: true } });
console.log('Users in DB:', JSON.stringify(users, null, 2));

await p.$disconnect();
