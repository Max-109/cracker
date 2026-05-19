import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from '../db/env';
import { hashPassword } from '../lib/password';

dotenv.config();

async function updatePassword() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error('Usage: ADMIN_PASSWORD="..." bun run scripts/update-password.ts <email>');
    console.error('   or: bun run scripts/update-password.ts <email> <password>');
    process.exit(1);
  }

  const client = postgres(getDatabaseUrl(), { prepare: false });
  const db = drizzle(client);

  try {
    const [updated] = await db
      .update(users)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(users.email, email))
      .returning({ id: users.id, email: users.email });

    if (!updated) {
      throw new Error(`No user found for ${email}`);
    }

    console.log(`✓ Password updated for ${updated.email}`);
  } finally {
    await client.end();
  }
}

updatePassword().catch((error) => {
  console.error('✗ Failed to update password');
  console.error(error);
  process.exit(1);
});
