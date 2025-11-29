/**
 * Script to create the first admin user and generate an initial invitation code
 * 
 * Usage: bun run scripts/create-admin.ts <email> <password> [name]
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

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('\n\x1b[31m✗ Error: Missing required arguments\x1b[0m');
    console.log('\n\x1b[33mUsage:\x1b[0m bun run scripts/create-admin.ts <email> <password> [name]');
    console.log('\n\x1b[36mExample:\x1b[0m bun run scripts/create-admin.ts admin@example.com MySecurePassword123 "Admin User"');
    process.exit(1);
  }

  const [email, password, name] = args;

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
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Supabase Auth error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user in Supabase Auth');
    }

    console.log('\x1b[32m   ✓\x1b[0m User created in Supabase Auth');

    // Step 2: Create user record in database as admin
    console.log('\x1b[33m[2/4]\x1b[0m Creating admin user in database...');
    await db.insert(users).values({
      id: authData.user.id,
      email: authData.user.email!,
      name: name || null,
      isAdmin: true,
    });

    console.log('\x1b[32m   ✓\x1b[0m Admin user created in database');

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
    console.log(`\x1b[36m│\x1b[0m  Password: \x1b[32m${password}\x1b[0m`);
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

  } catch (error) {
    console.error('\n\x1b[31m✗ Error:\x1b[0m', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

createAdmin();
