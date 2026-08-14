import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'Mdp12345';
const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

console.log('New hash for Mdp12345:', hash);

try {
  const result = await prisma.user.updateMany({
    data: { passwordHash: hash }
  });
  console.log(`Updated ${result.count} users in Turso.`);
  
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  console.log('Users now in DB:', JSON.stringify(users, null, 2));
} catch (e) {
  console.error('Error updating users:', e);
} finally {
  await prisma.$disconnect();
}
