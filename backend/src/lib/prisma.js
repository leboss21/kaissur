import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
const initializePrisma = () => {
    const connectionString = process.env.DATABASE_URL || 'file:./dev.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    // We initialize the libSQL client
    const clientConfig = {
        url: connectionString,
    };
    if (authToken) {
        clientConfig.authToken = authToken;
    }
    const libsql = createClient(clientConfig);
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter });
};
export const prisma = global.prisma || initializePrisma();
if (process.env.NODE_ENV !== 'production')
    global.prisma = prisma;
//# sourceMappingURL=prisma.js.map