import { prisma } from './src/lib/prisma.js';

try {
  const isTurso = process.env.TURSO_DATABASE_URL ? 'Turso' : 'Local SQLite';
  console.log('App is using database type:', isTurso);
  console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL);
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  // Test query
  const res = await prisma.$queryRaw`SELECT 1`;
  console.log('Simple query test result:', res);
  
  // Try retrieving users
  const users = await prisma.user.findMany({ include: { entreprise: true } });
  console.log('Found users:', users.map(u => ({ email: u.email, entreprise: u.entreprise?.name })));
} catch (e) {
  console.error('Database connection / query failed:', e);
} finally {
  await prisma.$disconnect();
}
