import { prisma } from './src/lib/prisma.js';

try {
  const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
  console.log('Tables found:', tables);
  
  const columns = await prisma.$queryRaw`PRAGMA table_info(Entreprise)`;
  console.log('Columns of Entreprise from Prisma:', columns);
} catch (e) {
  console.error('Error:', e);
} finally {
  await prisma.$disconnect();
}
