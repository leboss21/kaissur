import { createClient } from '@libsql/client';

const connectionString = "libsql://db-kaissur-leboss21.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MTYxNDgsImlkIjoiMDE5Zjk1NGEtMmQwMS03MWZlLWJhNjgtNjU5MmNmMDQwMWY0Iiwia2lkIjoiWFliQ01ENnZfZWtVUm8ybkQ2UzY0TC1OTENvRkVabzR1cGNyS05CeXh3TSIsInJpZCI6Ijk4YjRlMzA1LTY2ZWUtNDNkNy1hZTVmLWU0ZWMwZWJjNTc5YyJ9.6uVvXLREN3Gq8Qu5S_an2oNghKWZYEYSoxr-QYVHK_m3myYzuFYX5ob8DDKUMuSFQSfdY6QXNr3kRMX__dOJCw";

const client = createClient({
  url: connectionString,
  authToken: authToken
});

try {
  console.log('Altering Turso schema...');
  // Check current columns
  const info = await client.execute('PRAGMA table_info(Entreprise)');
  console.log('Current columns of Entreprise:', info.rows.map(r => r.name));
  
  if (!info.rows.some(r => r.name === 'mainCashBalance')) {
    console.log('Adding mainCashBalance column...');
    await client.execute('ALTER TABLE Entreprise ADD COLUMN mainCashBalance REAL NOT NULL DEFAULT 0');
    console.log('Added mainCashBalance!');
  }
} catch (e) {
  console.error('Error altering schema directly:', e);
} finally {
  client.close();
}
