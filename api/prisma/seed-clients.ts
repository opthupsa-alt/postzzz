import { PrismaClient, ClientStatus, SocialPlatform } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding clients...');

  // Get any existing tenant (or create one)
  let tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.log('📦 Creating test tenant...');
    tenant = await prisma.tenant.create({
      data: {
        name: 'Postzzz Test Agency',
        slug: 'postzzz-test',
      },
    });
  }
  console.log(`✅ Using tenant: ${tenant.name}`);

  // Get any existing user in this tenant (or create one)
  let user = await prisma.user.findFirst({
    where: {
      memberships: {
        some: { tenantId: tenant.id },
      },
    },
  });

  if (!user) {
    console.log('📦 Creating test user...');
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('test123', 10);
    user = await prisma.user.create({
      data: {
        email: 'test@postzzz.com',
        name: 'Test User',
        passwordHash,
        defaultTenantId: tenant.id,
        memberships: {
          create: {
            tenantId: tenant.id,
            role: 'OWNER',
          },
        },
      },
    });
  }
  console.log(`✅ Using user: ${user.email}`);

  // Create Client 1: شركة أرامكو
  const client1 = await prisma.client.upsert({
    where: { id: 'client-aramco-001' },
    update: {},
    create: {
      id: 'client-aramco-001',
      tenantId: tenant.id,
      createdById: user.id,
      name: 'شركة أرامكو',
      industry: 'النفط والغاز',
      category: 'شركات كبرى',
      contactName: 'أحمد الغامدي',
      contactEmail: 'ahmed@aramco.com',
      contactPhone: '+966501234567',
      website: 'https://www.aramco.com',
      status: ClientStatus.ACTIVE,
    },
  });
  console.log(`✅ Client created: ${client1.name}`);

  // Add platforms for Client 1
  await prisma.clientPlatform.upsert({
    where: {
      tenantId_clientId_platform: {
        tenantId: tenant.id,
        clientId: client1.id,
        platform: SocialPlatform.X,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client1.id,
      platform: SocialPlatform.X,
      handle: 'aramco',
      profileUrl: 'https://x.com/aramco',
      isEnabled: true,
    },
  });

  await prisma.clientPlatform.upsert({
    where: {
      tenantId_clientId_platform: {
        tenantId: tenant.id,
        clientId: client1.id,
        platform: SocialPlatform.LINKEDIN,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client1.id,
      platform: SocialPlatform.LINKEDIN,
      handle: 'aramco',
      profileUrl: 'https://linkedin.com/company/aramco',
      isEnabled: true,
    },
  });

  await prisma.clientPlatform.upsert({
    where: {
      tenantId_clientId_platform: {
        tenantId: tenant.id,
        clientId: client1.id,
        platform: SocialPlatform.INSTAGRAM,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client1.id,
      platform: SocialPlatform.INSTAGRAM,
      handle: 'aramco',
      profileUrl: 'https://instagram.com/aramco',
      isEnabled: true,
    },
  });

  console.log(`   ✅ Added 3 platforms for ${client1.name}`);

  // Create Client 2: مطاعم البيك
  const client2 = await prisma.client.upsert({
    where: { id: 'client-albaik-001' },
    update: {},
    create: {
      id: 'client-albaik-001',
      tenantId: tenant.id,
      createdById: user.id,
      name: 'مطاعم البيك',
      industry: 'المطاعم والضيافة',
      category: 'مطاعم',
      contactName: 'محمد العلي',
      contactEmail: 'info@albaik.com',
      contactPhone: '+966509876543',
      website: 'https://www.albaik.com',
      status: ClientStatus.ACTIVE,
    },
  });
  console.log(`✅ Client created: ${client2.name}`);

  // Add platforms for Client 2
  await prisma.clientPlatform.upsert({
    where: {
      tenantId_clientId_platform: {
        tenantId: tenant.id,
        clientId: client2.id,
        platform: SocialPlatform.X,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client2.id,
      platform: SocialPlatform.X,
      handle: 'ABORASHED_ALBAIK',
      profileUrl: 'https://x.com/ALBAIKIOFFICIAL',
      isEnabled: true,
    },
  });

  await prisma.clientPlatform.upsert({
    where: {
      tenantId_clientId_platform: {
        tenantId: tenant.id,
        clientId: client2.id,
        platform: SocialPlatform.INSTAGRAM,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client2.id,
      platform: SocialPlatform.INSTAGRAM,
      handle: 'albaikiofficial',
      profileUrl: 'https://instagram.com/albaikiofficial',
      isEnabled: true,
    },
  });

  await prisma.clientPlatform.upsert({
    where: {
      tenantId_clientId_platform: {
        tenantId: tenant.id,
        clientId: client2.id,
        platform: SocialPlatform.TIKTOK,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      clientId: client2.id,
      platform: SocialPlatform.TIKTOK,
      handle: 'albaik',
      profileUrl: 'https://tiktok.com/@albaik',
      isEnabled: true,
    },
  });

  console.log(`   ✅ Added 3 platforms for ${client2.name}`);

  console.log('');
  console.log('🎉 Clients seed completed!');
  console.log('   - 2 clients created');
  console.log('   - 6 platforms created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
