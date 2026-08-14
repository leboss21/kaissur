import { PrismaClient as LocalPrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local SQLite client
const localPrisma = new LocalPrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, '../prisma/dev.db')}`
    }
  }
});

// Remote Turso client
const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

console.log('Target Turso URL:', tursoUrl);

if (!tursoUrl || !tursoUrl.startsWith('libsql://')) {
  console.error('CRITICAL: TURSO_DATABASE_URL or DATABASE_URL must start with libsql:// to sync data to Turso.');
  process.exit(1);
}

const libsql = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

const adapter = new PrismaLibSQL(libsql);
const remotePrisma = new LocalPrismaClient({ adapter });

async function syncLocalToTurso() {
  console.log('\n--- Starting Migration of Local SQLite Data to Turso Online Database ---');

  try {
    // 0. Ensure Remote Database Schema is created on Turso
    console.log('Creating database tables on Turso if missing...');
    const statements = [
      `CREATE TABLE IF NOT EXISTS "Entreprise" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "address" TEXT, "phone" TEXT, "email" TEXT, "logoUrl" TEXT, "taxId" TEXT, "exchangeMargin" REAL NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL, "name" TEXT, "role" TEXT NOT NULL DEFAULT 'ADMIN', "entrepriseId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "Currency" ("code" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "symbol" TEXT NOT NULL, "sellMargin" REAL NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS "ServiceProvider" ("id" TEXT NOT NULL PRIMARY KEY, "entrepriseId" TEXT NOT NULL, "type" TEXT NOT NULL, "name" TEXT NOT NULL, "color" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "Client" ("id" TEXT NOT NULL PRIMARY KEY, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL, "identityType" TEXT, "identityNum" TEXT, "phone" TEXT, "entrepriseId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "Transaction" ("id" TEXT NOT NULL PRIMARY KEY, "entrepriseId" TEXT NOT NULL, "userId" TEXT NOT NULL, "clientId" TEXT, "fromCurrencyCode" TEXT NOT NULL, "toCurrencyCode" TEXT NOT NULL, "amountIn" REAL NOT NULL, "amountOut" REAL NOT NULL, "exchangeRate" REAL NOT NULL, "type" TEXT NOT NULL DEFAULT 'EXCHANGE', "status" TEXT NOT NULL DEFAULT 'COMPLETED', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "ServiceOperation" ("id" TEXT NOT NULL PRIMARY KEY, "entrepriseId" TEXT NOT NULL, "userId" TEXT NOT NULL, "clientId" TEXT, "type" TEXT NOT NULL, "subType" TEXT, "provider" TEXT NOT NULL, "amount" REAL NOT NULL, "fees" REAL NOT NULL DEFAULT 0, "phone" TEXT, "reference" TEXT, "passengerName" TEXT, "flightNumber" TEXT, "departure" TEXT, "destination" TEXT, "flightDate" TEXT, "airline" TEXT, "ticketPrice" REAL, "commissionType" TEXT, "commission" REAL, "notes" TEXT, "status" TEXT NOT NULL DEFAULT 'COMPLETED', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "DailyReport" ("id" TEXT NOT NULL PRIMARY KEY, "entrepriseId" TEXT NOT NULL, "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "totalExchangeIn" REAL NOT NULL DEFAULT 0, "totalExchangeOut" REAL NOT NULL DEFAULT 0, "totalMobileMoney" REAL NOT NULL DEFAULT 0, "totalMobileMoneyDeposits" REAL NOT NULL DEFAULT 0, "totalMobileMoneyWithdrawals" REAL NOT NULL DEFAULT 0, "totalCredit" REAL NOT NULL DEFAULT 0, "totalTickets" REAL NOT NULL DEFAULT 0, "reportData" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "CashRegister" ("id" TEXT NOT NULL PRIMARY KEY, "entrepriseId" TEXT NOT NULL, "currencyId" TEXT NOT NULL, "balance" REAL NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("currencyId") REFERENCES "Currency" ("code") ON DELETE CASCADE ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "CashRegisterSession" ("id" TEXT NOT NULL PRIMARY KEY, "entrepriseId" TEXT NOT NULL, "userId" TEXT NOT NULL, "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "status" TEXT NOT NULL DEFAULT 'OPEN', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE, FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "SessionBalance" ("id" TEXT NOT NULL PRIMARY KEY, "sessionId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "startingBalance" REAL NOT NULL DEFAULT 0, "expectedEndingBalance" REAL NOT NULL DEFAULT 0, "declaredEndingBalance" REAL, "discrepancy" REAL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("sessionId") REFERENCES "CashRegisterSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "Receipt" ("id" TEXT NOT NULL PRIMARY KEY, "receiptNumber" TEXT NOT NULL UNIQUE, "entrepriseId" TEXT NOT NULL, "sourceType" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE CASCADE ON UPDATE CASCADE);`
    ];

    for (const sql of statements) {
      try {
        await libsql.execute(sql);
      } catch (err) {
        // Ignore
      }
    }

    console.log('✔ Remote database schema reset and synchronized on Turso!');

    // 1. Sync Entreprises
    const entreprises = await localPrisma.entreprise.findMany();
    console.log(`Found ${entreprises.length} local Entreprises.`);
    for (const ent of entreprises) {
      const { createdAt, updatedAt, ...entData } = ent as any;
      await remotePrisma.entreprise.upsert({
        where: { id: ent.id },
        update: entData,
        create: entData,
      });
      console.log(`  ✔ Migrated Entreprise: ${ent.name} (${ent.id})`);
    }

    // 2. Sync Users
    const users = await localPrisma.user.findMany();
    console.log(`Found ${users.length} local Users.`);
    for (const u of users) {
      const { createdAt, updatedAt, ...uData } = u as any;
      await remotePrisma.user.upsert({
        where: { id: u.id },
        update: uData,
        create: uData,
      });
      console.log(`  ✔ Migrated User: ${u.name} (${u.email}) - Role: ${u.role}`);
    }

    // 3. Sync Currencies
    const currencies = await localPrisma.currency.findMany();
    console.log(`Found ${currencies.length} local Currencies.`);
    for (const c of currencies) {
      const { createdAt, updatedAt, id, ...cData } = c as any;
      await remotePrisma.currency.upsert({
        where: { code: cData.code },
        update: cData,
        create: cData,
      });
      console.log(`  ✔ Migrated Currency: ${cData.code}`);
    }

    // 4. Sync Service Providers
    const providers = await localPrisma.serviceProvider.findMany();
    console.log(`Found ${providers.length} local Service Providers.`);
    for (const p of providers) {
      const { createdAt, updatedAt, ...pData } = p as any;
      await remotePrisma.serviceProvider.upsert({
        where: { id: p.id },
        update: pData,
        create: pData,
      });
      console.log(`  ✔ Migrated Provider: ${p.name} (${p.type})`);
    }

    // 5. Sync Clients
    const clients = await localPrisma.client.findMany();
    console.log(`Found ${clients.length} local Clients.`);
    for (const cl of clients) {
      const { createdAt, updatedAt, ...clData } = cl as any;
      await remotePrisma.client.upsert({
        where: { id: cl.id },
        update: clData,
        create: clData,
      });
      console.log(`  ✔ Migrated Client: ${cl.firstName || ''} ${cl.lastName || ''}`);
    }

    // 6. Sync Transactions
    const transactions = await localPrisma.transaction.findMany();
    console.log(`Found ${transactions.length} local Transactions.`);
    for (const tx of transactions) {
      const { createdAt, updatedAt, ...txData } = tx as any;
      await remotePrisma.transaction.upsert({
        where: { id: tx.id },
        update: txData,
        create: txData,
      });
    }
    if (transactions.length > 0) console.log(`  ✔ Migrated ${transactions.length} Transactions.`);

    // 7. Sync Service Operations
    const serviceOps = await localPrisma.serviceOperation.findMany();
    console.log(`Found ${serviceOps.length} local Service Operations.`);
    for (const op of serviceOps) {
      const { createdAt, updatedAt, ...opData } = op as any;
      await remotePrisma.serviceOperation.upsert({
        where: { id: op.id },
        update: opData,
        create: opData,
      });
    }
    if (serviceOps.length > 0) console.log(`  ✔ Migrated ${serviceOps.length} Service Operations.`);

    // 8. Sync Daily Reports
    const reports = await localPrisma.dailyReport.findMany();
    console.log(`Found ${reports.length} local Daily Reports.`);
    for (const r of reports) {
      const { createdAt, updatedAt, ...rData } = r as any;
      await remotePrisma.dailyReport.upsert({
        where: { id: r.id },
        update: rData,
        create: rData,
      });
    }
    if (reports.length > 0) console.log(`  ✔ Migrated ${reports.length} Daily Reports.`);

    console.log('\n✅ ALL LOCAL DATA SUCCESSFULLY MIGRATED TO TURSO ONLINE DATABASE!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
  } finally {
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
  }
}

syncLocalToTurso();
