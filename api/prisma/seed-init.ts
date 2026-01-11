import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing database with seed data...\n');

  // 1. Create Super Admin
  const adminEmail = 'admin@postzzz.com';
  const adminPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
        isSuperAdmin: true,
        isActive: true,
      },
    });
    console.log('✅ Super Admin created:', admin.email);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { isSuperAdmin: true },
    });
    console.log('✅ Super Admin already exists:', adminEmail);
  }

  // 2. Create Test User with Tenant
  const testEmail = 'test@postzzz.com';
  const testPassword = 'Test@123';
  const testPasswordHash = await bcrypt.hash(testPassword, 12);

  const existingTest = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!existingTest) {
    // Create tenant first
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Company',
        slug: 'test-company',
        status: 'ACTIVE',
      },
    });

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: testPasswordHash,
        name: 'Test User',
        isSuperAdmin: false,
        isActive: true,
        defaultTenantId: tenant.id,
      },
    });

    // Create membership
    await prisma.membership.create({
      data: {
        userId: testUser.id,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    });

    console.log('✅ Test User created:', testEmail);
    console.log('✅ Test Tenant created:', tenant.name);
  } else {
    console.log('✅ Test User already exists:', testEmail);
  }

  // 3. Create Platform Settings
  const settings = await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      platformUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3001',
    },
  });
  console.log('✅ Platform Settings initialized');

  // Summary
  console.log('\n📋 Summary:');
  console.log('─────────────────────────────────────');
  console.log('Super Admin: admin@postzzz.com / Admin@123');
  console.log('Test User:   test@postzzz.com / Test@123');
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
