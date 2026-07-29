const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateWorkspaces() {
  try {
    console.log('Starting workspace migration...');

    const users = await prisma.user.findMany();

    if (users.length === 0) {
      console.log('No users found. Skipping migration.');
      return;
    }

    for (const user of users) {
      console.log(`Processing user: ${user.email}`);

      const workspace = await prisma.workspace.create({
        data: {
          name: `${user.fullName}'s Workspace`,
        },
      });

      await prisma.workspaceUser.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'ADMIN',
        },
      });

      const contactsToMigrate = await prisma.contact.findMany({
        where: {
          workspaceId: null,
        },
      });

      if (contactsToMigrate.length > 0) {
        await prisma.contact.updateMany({
          where: {
            workspaceId: null,
          },
          data: {
            workspaceId: workspace.id,
          },
        });

        console.log(
          `  Migrated ${contactsToMigrate.length} contacts to workspace: ${workspace.name}`
        );
      }
    }

    console.log('Workspace migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateWorkspaces();
