import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD_HASH = bcryptjs.hashSync('Mdp12345', 10);

async function main() {
  console.log('Seeding database...');

  // Create the demo entreprise
  const entreprise = await prisma.entreprise.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: {
      id: 'demo-tenant',
      name: 'Kaissur Exchange',
      address: 'Lomé, Togo',
      phone: '+228 90 00 00 00',
      email: 'contact@kaissur.tg',
      taxId: 'TG-XXXX-XXXX',
    },
  });
  console.log('✔ Entreprise created:', entreprise.name);

  // Create the demo admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@kaissur.tg' },
    update: { passwordHash: DEFAULT_PASSWORD_HASH },
    create: {
      id: 'user-test-id',
      email: 'admin@kaissur.tg',
      passwordHash: DEFAULT_PASSWORD_HASH,
      name: 'Administrateur',
      role: 'ADMIN',
      entrepriseId: 'demo-tenant',
    },
  });
  console.log('✔ User created:', user.email);

  // Create some default currencies
  const currencies = [
    { code: 'XOF', name: 'Franc CFA', symbol: 'FCFA' },
    { code: 'USD', name: 'Dollar américain', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'Livre sterling', symbol: '£' },
  ];

  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    console.log('✔ Currency:', c.code);
  }

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
