import { prisma } from '../src/lib/prisma.js';
import bcryptjs from 'bcryptjs';

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

  // Create demo users for each role
  const users = [
    {
      id: 'user-superadmin-id',
      email: 'superadmin@kaissur.tg',
      name: 'Super Administrateur',
      role: 'SUPER_ADMIN',
      entrepriseId: null,
    },
    {
      id: 'user-admin-id',
      email: 'admin@kaissur.tg',
      name: 'Administrateur Agence',
      role: 'ADMIN',
      entrepriseId: 'demo-tenant',
    },
    {
      id: 'user-chef-id',
      email: 'chefcaisse@kaissur.tg',
      name: 'Koffi Chef Caisse',
      role: 'CHEF_CAISSE',
      entrepriseId: 'demo-tenant',
    },
    {
      id: 'user-cashier-id',
      email: 'caissier@kaissur.tg',
      name: 'Abla Caissière',
      role: 'CASHIER',
      entrepriseId: 'demo-tenant',
    },
    {
      id: 'user-directeur-id',
      email: 'directeur@kaissur.tg',
      name: 'Directeur Général',
      role: 'DIRECTEUR',
      entrepriseId: 'demo-tenant',
    }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: DEFAULT_PASSWORD_HASH, role: u.role, name: u.name },
      create: {
        id: u.id,
        email: u.email,
        passwordHash: DEFAULT_PASSWORD_HASH,
        name: u.name,
        role: u.role,
        entrepriseId: u.entrepriseId,
      }
    });
    console.log('✔ User created:', u.email, `(${u.role})`);
  }

  // Clean up removed default providers
  await prisma.serviceProvider.deleteMany({
    where: {
      name: {
        in: ['T-Money', 'Moov Flooz', 'Togocel Crédit', 'Moov Crédit', 'Togocel Cré dit']
      }
    }
  });
  console.log('✔ Default demo providers removed');

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

  // Create default Cash Registers with initial funds
  await prisma.cashRegister.upsert({
    where: { entrepriseId_currencyId: { entrepriseId: 'demo-tenant', currencyId: 'USD' } },
    update: {},
    create: { entrepriseId: 'demo-tenant', currencyId: 'USD', balance: 1500 }
  });
  await prisma.cashRegister.upsert({
    where: { entrepriseId_currencyId: { entrepriseId: 'demo-tenant', currencyId: 'EUR' } },
    update: {},
    create: { entrepriseId: 'demo-tenant', currencyId: 'EUR', balance: 800 }
  });

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
