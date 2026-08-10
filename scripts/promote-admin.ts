import { config } from 'dotenv';
config({ path: '.env.development.local' });
config({ path: '.env.local' });

import bcrypt from 'bcrypt';

function usage(): never {
  console.error('Usage:');
  console.error('  npm run promote-admin -- <email> [ADMIN|MEMBER]');
  console.error('  npm run promote-admin -- <email> ADMIN --create "Full Name" <password>');
  process.exit(1);
}

async function main() {
  // Dynamic import so DATABASE_URL is already set by dotenv before the Prisma
  // adapter is constructed at module-load time.
  const { prisma } = await import('../lib/prisma');

  try {
    const args = process.argv.slice(2);
    const [emailArg, roleArg = 'ADMIN', ...rest] = args;
    if (!emailArg) usage();
    const targetRole = roleArg.toUpperCase();
    if (targetRole !== 'ADMIN' && targetRole !== 'MEMBER') usage();

    const createIdx = rest.indexOf('--create');
    const shouldCreate = createIdx >= 0;
    const fullName = shouldCreate ? rest[createIdx + 1] : undefined;
    const password = shouldCreate ? rest[createIdx + 2] : undefined;
    if (shouldCreate && (!fullName || !password)) usage();

    const existing = await prisma.user.findUnique({ where: { email: emailArg } });

    if (!existing && !shouldCreate) {
      console.error(`No user found with email ${emailArg}.`);
      console.error('If this is the first admin, re-run with:');
      console.error(`  npm run promote-admin -- ${emailArg} ADMIN --create "Your Name" <password>`);
      process.exit(1);
    }

    if (!existing && shouldCreate) {
      const created = await prisma.user.create({
        data: {
          email: emailArg,
          fullName: fullName!,
          password: await bcrypt.hash(password!, 10),
          role: targetRole,
        },
        select: { id: true, email: true, role: true },
      });
      console.log(`Created ${created.email} with role ${created.role}`);
      return;
    }

    if (targetRole === 'MEMBER' && existing!.role === 'ADMIN') {
      const otherAdmins = await prisma.user.count({
        where: { role: 'ADMIN', NOT: { id: existing!.id } },
      });
      if (otherAdmins === 0) {
        console.error('Refusing to demote the only ADMIN. Promote another user first.');
        process.exit(1);
      }
    }

    const updated = await prisma.user.update({
      where: { id: existing!.id },
      data: { role: targetRole },
      select: { id: true, email: true, role: true },
    });
    console.log(`Updated ${updated.email} → role ${updated.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
