import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'thegopichand@gmail.com';
  const adminPassword = 'Gopivenu69@';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const adminUser = await prisma.user.create({
      data: {
        name: 'venugopal',
        email: adminEmail,
        passwordHash: passwordHash,
        role: 'SUPER_ADMIN',
        approvalStatus: 'APPROVED',
      }
    });
    console.log('Super Admin created:', adminUser.email);
  } else {
    // Update existing admin details
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);
    
    await prisma.user.update({
      where: { email: adminEmail },
      data: { 
        name: 'venugopal',
        passwordHash: passwordHash,
        role: 'SUPER_ADMIN', 
        approvalStatus: 'APPROVED' 
      }
    });
    console.log('Super Admin updated successfully.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
