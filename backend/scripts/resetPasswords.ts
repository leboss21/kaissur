import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = bcryptjs.hashSync('Mdp12345', 10);
  const result = await prisma.user.updateMany({
    data: { passwordHash: hash }
  });
  console.log(`✓ ${result.count} utilisateur(s) mis à jour avec le mot de passe par défaut "Mdp12345" (haché).`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
