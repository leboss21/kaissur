import { createClient } from '@libsql/client';
const c = createClient({ url: 'file:./dev.db' });
const r = await c.execute('SELECT id, name FROM Entreprise');
console.log('Entreprise rows:', JSON.stringify(r.rows));
const r2 = await c.execute('SELECT id, email FROM User');
console.log('User rows:', JSON.stringify(r2.rows));
//# sourceMappingURL=test-db.js.map