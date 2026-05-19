import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from '../db/env';
import { verifyPassword } from '../lib/password';

dotenv.config();

async function testLogin() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.argv[3];

  if (!email || !password) {
    console.error('Usage: ADMIN_PASSWORD="..." bun run scripts/test-login.ts <email>');
    console.error('   or: bun run scripts/test-login.ts <email> <password>');
    process.exit(1);
  }

  const client = postgres(getDatabaseUrl(), { prepare: false });
  const db = drizzle(client);

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        isAdmin: users.isAdmin,
        isGuest: users.isGuest,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      console.error('✗ User not found');
      process.exit(1);
    }

    const ok = verifyPassword(password, user.passwordHash);
    console.log(`User: ${user.email}`);
    console.log(`Admin: ${user.isAdmin}`);
    console.log(`Guest: ${user.isGuest}`);
    console.log(ok ? '✓ Password is valid' : '✗ Password is invalid');
    process.exit(ok ? 0 : 1);
  } finally {
    await client.end();
  }
}

testLogin().catch((error) => {
  console.error('✗ Login test failed');
  console.error(error);
  process.exit(1);
});
