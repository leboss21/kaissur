import { createClient } from '@libsql/client';

const connectionString = "file:./prisma/dev.db";

const client = createClient({
  url: connectionString
});

try {
  console.log('Altering Local SQLite schema...');
  const info = await client.execute('PRAGMA table_info(Entreprise)');
  console.log('Current columns of Entreprise locally:', info.rows.map(r => r.name));
  
  if (!info.rows.some(r => r.name === 'mainCashBalance')) {
    console.log('Adding mainCashBalance column locally...');
    await client.execute('ALTER TABLE Entreprise ADD COLUMN mainCashBalance REAL NOT NULL DEFAULT 0');
    console.log('Added mainCashBalance locally!');
  }
} catch (e) {
  console.error('Error altering local schema directly:', e);
} finally {
  client.close();
}
