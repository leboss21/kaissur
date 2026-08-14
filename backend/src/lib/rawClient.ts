import 'dotenv/config';
import { createClient, type Client } from '@libsql/client';

/**
 * Client libsql brut pour les requêtes SQL directes sur Turso.
 * Utilisé pour les colonnes non encore reflétées dans le client Prisma généré.
 */
const createRawClient = (): Client => {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.startsWith('libsql://')) {
    return createClient({ url, ...(authToken ? { authToken } : {}) });
  }

  // SQLite local file fallback
  return createClient({ url: `file:${url.replace('file:', '')}` });
};

export const rawClient = createRawClient();
