/**
 * Script to create the first admin user and generate an initial invitation code
 * 
 * Usage: bun run scripts/create-admin.ts <email> <password> [name]
 *   - Or (safer): ADMIN_PASSWORD="..." bun run scripts/create-admin.ts <email> [name]
 * 
 * This script will:
 * 1. Create a user in Supabase Auth
 * 2. Create a user record in the database with isAdmin=true
 * 3. Generate an initial invitation code for inviting other users
 */

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, invitationCodes } from '../db/schema';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from '../db/env';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = getDatabaseUrl();

async function createAdmin() {
  const args = process.argv.slice(2);

  const envPassword = process.env.ADMIN_PASSWORD;
  if (args.length < 1 || (!envPassword && args.length < 2)) {
    console.log('\n\x1b[31m✗ Error: Missing required arguments\x1b[0m');
    console.log('\n\x1b[33mUsage:\x1b[0m bun run scripts/create-admin.ts <email> <password> [name]');
    console.log('\n\x1b[33mOr:\x1b[0m ADMIN_PASSWORD="..." bun run scripts/create-admin.ts <email> [name]');
    console.log('\n\x1b[36mExample:\x1b[0m ADMIN_PASSWORD="..." bun run scripts/create-admin.ts admin@example.com "Admin User"');
    process.exit(1);
  }

  const email = args[0];
  const password = envPassword ?? args[1];
  const name = envPassword ? args[1] : args[2];

  console.log('\n\x1b[36m┌─────────────────────────────────────┐\x1b[0m');
  console.log('\x1b[36m│\x1b[0m   \x1b[1mCRACKER ADMIN SETUP\x1b[0m              \x1b[36m│\x1b[0m');
  console.log('\x1b[36m└─────────────────────────────────────┘\x1b[0m\n');

  // Initialize clients
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Step 1: Create user in Supabase Auth
    console.log('\x1b[33m[1/4]\x1b[0m Creating user in Supabase Auth...');

    // Use let because we might re-assign if we find an existing user
    let { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    // If any error occurred, let's check if the user actually exists
    if (authError) {
      console.log(`\x1b[33m   !\x1b[0m Auth error encountered: ${authError.message}`);
      console.log('\x1b[33m   !\x1b[0m Checking if user exists despite error...');

      const { data: { users: existingUsers }, error: searchError } = await supabase.auth.admin.listUsers();

      if (searchError) {
        console.error('Failed to list users to verify existence:', searchError);
        throw new Error(`Supabase Auth error: ${authError.message}`); // Throw original if we can't search
      }

      const existingUser = existingUsers.find((u: any) => u.email === email);
      if (existingUser) {
        console.log('\x1b[32m   ✓\x1b[0m User found in existing users list with ID:', existingUser.id);
        authData = { user: existingUser, session: null } as any;
        authError = null; // Clear error since we found the user
      } else {
        // User not found, so the error was real and fatal
        throw new Error(`Supabase Auth error: ${authError.message}`);
      }
    }

    if (!authData.user) {
      throw new Error('Failed to create or find user in Supabase Auth');
    }

    console.log('\x1b[32m   ✓\x1b[0m User created/found in Supabase Auth');

    // Step 2: Create user record in database as admin
    console.log('\x1b[33m[2/4]\x1b[0m Creating admin user in database...');
    // We use upsert (on conflict do update) or check if exists to avoid errors if re-running
    await db.insert(users).values({
      id: authData.user.id,
      email: authData.user.email!,
      name: name || null,
      isAdmin: true,
    }).onConflictDoUpdate({
      target: users.id,
      set: { isAdmin: true, name: name || null }
    });

    console.log('\x1b[32m   ✓\x1b[0m Admin user created/updated in database');

    // Step 3: Generate initial invitation code
    console.log('\x1b[33m[3/4]\x1b[0m Generating invitation code...');
    const code = randomUUID().replace(/-/g, '');
    const [newCode] = await db.insert(invitationCodes).values({
      code,
      createdBy: authData.user.id,
    }).returning();

    console.log('\x1b[32m   ✓\x1b[0m Invitation code generated');

    // Step 4: Summary
    console.log('\x1b[33m[4/4]\x1b[0m Setup complete!\n');

    console.log('\x1b[36m┌─────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[36m│\x1b[0m   \x1b[1mADMIN CREDENTIALS\x1b[0m                 \x1b[36m│\x1b[0m');
    console.log('\x1b[36m├─────────────────────────────────────┤\x1b[0m');
    console.log(`\x1b[36m│\x1b[0m  Email:    \x1b[32m${email}\x1b[0m`);
    if (name) console.log(`\x1b[36m│\x1b[0m  Name:     \x1b[32m${name}\x1b[0m`);
    console.log('\x1b[36m└─────────────────────────────────────┘\x1b[0m\n');

    console.log('\x1b[36m┌─────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[36m│\x1b[0m   \x1b[1mFIRST INVITATION CODE\x1b[0m             \x1b[36m│\x1b[0m');
    console.log('\x1b[36m├─────────────────────────────────────┤\x1b[0m');
    console.log(`\x1b[36m│\x1b[0m  \x1b[33m${newCode.code}\x1b[0m`);
    console.log('\x1b[36m└─────────────────────────────────────┘\x1b[0m\n');

    console.log('\x1b[32m✓ Setup complete!\x1b[0m');
    console.log('\n  1. Start the dev server: \x1b[36mbun dev\x1b[0m');
    console.log('  2. Go to \x1b[36mhttp://localhost:3000/login\x1b[0m');
    console.log('  3. Login with the admin credentials above');
    console.log('  4. Access admin panel at \x1b[36mhttp://localhost:3000/admin\x1b[0m\n');

  } catch (error: any) {
    console.error('\n\x1b[31m✗ Error:\x1b[0m', error?.message || error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

createAdmin();
