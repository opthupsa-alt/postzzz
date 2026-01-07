import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update existing admin user to be Super Admin
  const result = await prisma.user.updateMany({
    where: { email: 'admin@optarget.com' },
    data: { isSuperAdmin: true },
  });

  console.log(`Updated ${result.count} user(s) to Super Admin`);

  // Verify
  const superAdmins = await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });

  console.log('Super Admins:', superAdmins);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
