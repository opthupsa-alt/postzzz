import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  {
    name: 'free',
    nameAr: 'مجاني',
    description: 'Perfect for getting started',
    descriptionAr: 'مثالي للبدء',
    price: new Decimal(0),
    yearlyPrice: new Decimal(0),
    currency: 'SAR',
    seatsLimit: 1,
    leadsLimit: 100,
    searchesLimit: 10,
    messagesLimit: 50,
    features: ['basic_search', 'manual_leads', 'basic_reports'],
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'starter',
    nameAr: 'المبتدئ',
    description: 'For small teams getting started',
    descriptionAr: 'للفرق الصغيرة',
    price: new Decimal(199),
    yearlyPrice: new Decimal(1990),
    currency: 'SAR',
    seatsLimit: 3,
    leadsLimit: 1000,
    searchesLimit: 100,
    messagesLimit: 500,
    features: ['basic_search', 'manual_leads', 'basic_reports', 'whatsapp', 'lists', 'csv_import', 'templates'],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'pro',
    nameAr: 'الاحترافي',
    description: 'For growing businesses',
    descriptionAr: 'للأعمال المتنامية',
    price: new Decimal(499),
    yearlyPrice: new Decimal(4990),
    currency: 'SAR',
    seatsLimit: 10,
    leadsLimit: 10000,
    searchesLimit: 500,
    messagesLimit: 5000,
    features: ['basic_search', 'manual_leads', 'basic_reports', 'whatsapp', 'lists', 'csv_import', 'templates', 'ai_reports', 'bulk_whatsapp', 'export', 'integrations'],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'enterprise',
    nameAr: 'المؤسسات',
    description: 'For large organizations',
    descriptionAr: 'للمؤسسات الكبيرة',
    price: new Decimal(-1), // Custom pricing
    yearlyPrice: new Decimal(-1),
    currency: 'SAR',
    seatsLimit: -1, // Unlimited
    leadsLimit: -1,
    searchesLimit: -1,
    messagesLimit: -1,
    features: ['basic_search', 'manual_leads', 'basic_reports', 'whatsapp', 'lists', 'csv_import', 'templates', 'ai_reports', 'bulk_whatsapp', 'export', 'integrations', 'api_access', 'sso', 'audit_logs', 'dedicated_support', 'custom_integrations'],
    isActive: true,
    sortOrder: 3,
  },
];

async function main() {
  console.log('Seeding default plans...');

  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.plan.findUnique({
      where: { name: plan.name },
    });

    if (existing) {
      console.log(`Plan "${plan.name}" already exists, updating...`);
      await prisma.plan.update({
        where: { name: plan.name },
        data: plan,
      });
    } else {
      console.log(`Creating plan "${plan.name}"...`);
      await prisma.plan.create({
        data: plan,
      });
    }
  }

  // List all plans
  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  console.log('\nPlans in database:');
  plans.forEach((p) => {
    console.log(`  - ${p.name} (${p.nameAr}): ${p.price} SAR/month`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
