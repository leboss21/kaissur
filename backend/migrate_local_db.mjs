import { createClient } from '@libsql/client';

const connectionString = "file:./prisma/dev.db";

const client = createClient({
  url: connectionString
});

try {
  console.log('Synchronizing local SQLite schema with model additions...');
  
  // 1. Table MainCashSupply
  console.log('Checking Table MainCashSupply...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS MainCashSupply (
      id TEXT PRIMARY KEY NOT NULL,
      entrepriseId TEXT NOT NULL,
      userId TEXT NOT NULL,
      amount REAL NOT NULL,
      targetService TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entrepriseId) REFERENCES Entreprise (id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User (id)
    )
  `);
  console.log('MainCashSupply ready locally.');

  // 2. Columns on CashRegisterSession
  console.log('Checking CashRegisterSession...');
  const sInfo = await client.execute('PRAGMA table_info(CashRegisterSession)');
  if (!sInfo.rows.some(r => r.name === 'billBreakdown')) {
    await client.execute('ALTER TABLE CashRegisterSession ADD COLUMN billBreakdown TEXT');
    console.log('Added billBreakdown locally.');
  }
  if (!sInfo.rows.some(r => r.name === 'physicalBalance')) {
    await client.execute('ALTER TABLE CashRegisterSession ADD COLUMN physicalBalance REAL');
    console.log('Added physicalBalance locally.');
  }
  if (!sInfo.rows.some(r => r.name === 'theoreticalBalance')) {
    await client.execute('ALTER TABLE CashRegisterSession ADD COLUMN theoreticalBalance REAL');
    console.log('Added theoreticalBalance locally.');
  }
  
  console.log('Local verification completed!');
} catch (e) {
  console.error('Error migrating local database directly:', e);
} finally {
  client.close();
}
