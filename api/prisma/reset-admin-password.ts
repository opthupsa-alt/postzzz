import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Admin123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await prisma.user.update({
    where: { email: 'admin@optarget.com' },
    data: { passwordHash: hashedPassword },
  });

  console.log(`Password reset for: ${result.email}`);
  console.log(`New password: ${newPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
