import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

const initializePrisma = () => {
  const connectionString = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (connectionString.startsWith('libsql://')) {
    const libsql = createClient({
      url: connectionString,
      ...(authToken ? { authToken } : {}),
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
  }

  return new PrismaClient();
};

export const prisma = global.prisma || initializePrisma();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
