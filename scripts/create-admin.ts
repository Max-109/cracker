import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, invitationCodes, userSettings } from '../db/schema';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { getDatabaseUrl } from '../db/env';
import { hashPassword } from '../lib/password';

dotenv.config();

async function createAdmin() {
  const args = process.argv.slice(2);
  const envPassword = process.env.ADMIN_PASSWORD;

  if (args.length < 1 || (!envPassword && args.length < 2)) {
    console.log('\n\x1b[31m✗ Error: Missing required arguments\x1b[0m');
    console.log('\n\x1b[33mUsage:\x1b[0m bun run scripts/create-admin.ts <email> <password> [name]');
    console.log('\n\x1b[33mOr:\x1b[0m ADMIN_PASSWORD="..." bun run scripts/create-admin.ts <email> [name]');
    process.exit(1);
  }

  const email = args[0].trim().toLowerCase();
  const password = envPassword ?? args[1];
  const name = envPassword ? args[1] : args[2];

  const client = postgres(getDatabaseUrl(), { prepare: false });
  const db = drizzle(client);

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    const userId = existing?.id ?? randomUUID();

    await db
      .insert(users)
      .values({
        id: userId,
        email,
        passwordHash: hashPassword(password),
        name: name || 'Admin',
        isAdmin: true,
        isGuest: false,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash: hashPassword(password),
          name: name || 'Admin',
          isAdmin: true,
          isGuest: false,
        },
      });

    await db.insert(userSettings).values({ userId }).onConflictDoNothing();

    const code = randomUUID().replace(/-/g, '');
    await db.insert(invitationCodes).values({ code, createdBy: userId });

    console.log('\n\x1b[32m✓ Admin user ready\x1b[0m');
    console.log(`Email: ${email}`);
    console.log(`User ID: ${userId}`);
    console.log(`Initial invitation code: ${code}`);
  } finally {
    await client.end();
  }
}

createAdmin().catch((error) => {
  console.error('\n\x1b[31m✗ Failed to create admin\x1b[0m');
  console.error(error);
  process.exit(1);
});
