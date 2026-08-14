import { prisma } from './src/lib/prisma.js';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const email = 'admin@kaissur.tg';
const password = 'Mdp12345';
const JWT_SECRET = 'kaissur_jwt_secret_2025_secure_key';

try {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
    include: { entreprise: true }
  });

  if (!user) { console.log('USER NOT FOUND'); process.exit(1); }
  console.log('Found:', user.email);
  
  const match = bcryptjs.compareSync(password, user.passwordHash);
  console.log('Password match:', match);
  
  const token = jwt.sign({ userId: user.id, entrepriseId: user.entrepriseId, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  console.log('Token OK, length:', token.length);
} catch(err) {
  console.error('ERROR:', err);
} finally {
  await prisma.$disconnect();
}
