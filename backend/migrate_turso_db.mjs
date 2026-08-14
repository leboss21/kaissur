import { createClient } from '@libsql/client';

const connectionString = "libsql://db-kaissur-leboss21.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MTYxNDgsImlkIjoiMDE5Zjk1NGEtMmQwMS03MWZlLWJhNjgtNjU5MmNmMDQwMWY0Iiwia2lkIjoiWFliQ01ENnZfZWtVUm8ybkQ2UzY0TC1OTENvRkVabzR1cGNyS05CeXh3TSIsInJpZCI6Ijk4YjRlMzA1LTY2ZWUtNDNkNy1hZTVmLWU0ZWMwZWJjNTc5YyJ9.6uVvXLREN3Gq8Qu5S_an2oNghKWZYEYSoxr-QYVHK_m3myYzuFYX5ob8DDKUMuSFQSfdY6QXNr3kRMX__dOJCw";

const client = createClient({
  url: connectionString,
  authToken: authToken
});

try {
  console.log('Synchronizing Turso schema with model additions...');
  
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
  console.log('MainCashSupply ready.');

  // 2. MainCashBalance column on Entreprise
  console.log('Checking mainCashBalance...');
  const eInfo = await client.execute('PRAGMA table_info(Entreprise)');
  if (!eInfo.rows.some(r => r.name === 'mainCashBalance')) {
    await client.execute('ALTER TABLE Entreprise ADD COLUMN mainCashBalance REAL NOT NULL DEFAULT 0');
    console.log('Added mainCashBalance on Entreprise.');
  }

  // 3. Columns on CashRegisterSession
  console.log('Checking CashRegisterSession...');
  const sInfo = await client.execute('PRAGMA table_info(CashRegisterSession)');
  if (!sInfo.rows.some(r => r.name === 'billBreakdown')) {
    await client.execute('ALTER TABLE CashRegisterSession ADD COLUMN billBreakdown TEXT');
    console.log('Added billBreakdown.');
  }
  if (!sInfo.rows.some(r => r.name === 'physicalBalance')) {
    await client.execute('ALTER TABLE CashRegisterSession ADD COLUMN physicalBalance REAL');
    console.log('Added physicalBalance.');
  }
  if (!sInfo.rows.some(r => r.name === 'theoreticalBalance')) {
    await client.execute('ALTER TABLE CashRegisterSession ADD COLUMN theoreticalBalance REAL');
    console.log('Added theoreticalBalance.');
  }
  
  console.log('Verification completed!');
} catch (e) {
  console.error('Error migrating Turso database directly:', e);
} finally {
  client.close();
}
