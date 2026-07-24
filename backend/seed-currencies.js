import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const currencies = [
    { code: 'USD', name: 'Dollar Américain', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'Livre Sterling', symbol: '£' },
    { code: 'JPY', name: 'Yen Japonais', symbol: '¥' },
    { code: 'CAD', name: 'Dollar Canadien', symbol: '$' },
    { code: 'CHF', name: 'Franc Suisse', symbol: 'CHF' },
    { code: 'AUD', name: 'Dollar Australien', symbol: '$' },
    { code: 'CNY', name: 'Yuan Chinois', symbol: '¥' },
    { code: 'INR', name: 'Roupie Indienne', symbol: '₹' },
    { code: 'ZAR', name: 'Rand Sud-Africain', symbol: 'R' }
];
async function main() {
    console.log('Seeding currencies...');
    for (const c of currencies) {
        await prisma.currency.upsert({
            where: { code: c.code },
            update: {
                sellMargin: 10
            },
            create: {
                ...c,
                sellMargin: 10
            }
        });
    }
    console.log('Finished seeding currencies.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-currencies.js.map