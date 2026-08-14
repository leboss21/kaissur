import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

try {
  const user = await p.user.findFirst({
    where: { email: 'admin@kaissur.tg' },
    include: { entreprise: true }
  });
  
  if (!user) {
    console.log('User not found!');
  } else {
    console.log('User found:', user.email, user.role);
    console.log('Entreprise:', user.entreprise?.name);
    const match = bcrypt.compareSync('Mdp12345', user.passwordHash);
    console.log('Password match:', match);
  }
} catch (err) {
  console.error('ERROR:', err);
} finally {
  await p.$disconnect();
}
