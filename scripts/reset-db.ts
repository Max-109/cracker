/**
 * Script to reset the database and optionally remove the admin user from Supabase Auth
 * 
 * Usage: bun run scripts/reset-db.ts [email]
 * 
 * If email is provided, it will attempt to remove that user from Supabase Auth.
 */

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
    users,
    invitationCodes,
    chats,
    messages,
    userSettings,
    activeGenerations,
    mcpServers
} from '../db/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from '../db/env';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = getDatabaseUrl();

async function resetDb() {
    const args = process.argv.slice(2);
    const emailToDelete = args[0];

    console.log('\n\x1b[36m┌─────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[36m│\x1b[0m   \x1b[1mDATABASE RESET\x1b[0m                    \x1b[36m│\x1b[0m');
    console.log('\x1b[36m└─────────────────────────────────────┘\x1b[0m\n');

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const client = postgres(databaseUrl);
    const db = drizzle(client);

    try {
        if (emailToDelete) {
            console.log('\x1b[33m[1/2]\x1b[0m Cleaning up Supabase Auth...');
            const { data: { users: existingUsers }, error: searchError } = await supabase.auth.admin.listUsers();
            if (searchError) throw searchError;

            const existingUser = existingUsers.find((u: any) => u.email === emailToDelete);
            if (existingUser) {
                const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
                if (deleteError) {
                    console.log(`\x1b[31m   ✗\x1b[0m Failed to delete user from Auth: ${deleteError.message}`);
                } else {
                    console.log(`\x1b[32m   ✓\x1b[0m Deleted user ${emailToDelete} from Supabase Auth`);
                }
            } else {
                console.log(`\x1b[33m   -\x1b[0m User ${emailToDelete} not found in Auth, skipping.`);
            }
        } else {
            console.log('\x1b[33m[1/2]\x1b[0m No email provided, skipping Supabase Auth cleanup...');
        }

        console.log('\x1b[33m[2/2]\x1b[0m Cleaning database tables...');

        // 1. Clear dependent tables first
        await db.delete(activeGenerations);
        console.log('   Dependencies: activeGenerations cleared');

        await db.delete(messages);
        console.log('   Dependencies: messages cleared');

        await db.delete(chats);
        console.log('   Dependencies: chats cleared');

        await db.delete(userSettings);
        console.log('   Dependencies: userSettings cleared');

        // 2. Handle circular dependency between users and invitationCodes
        // Set invitationCodeId to NULL for all users to break the link
        await db.execute(sql`UPDATE users SET invitation_code_id = NULL`);
        console.log('   Circular links broken (users.invitationCodeId -> NULL)');

        // Now safe to delete invitation codes (which ref users)
        // Wait, invitationCodes references users via createdBy/usedBy.
        // Users references invitationCodes via invitationCodeId.
        // Drizzle delete on invitationCodes will fail if we don't first nullify users' refs to it?
        // We already did that above.
        // But wait, if invitationCodes has FK to users, we can't delete users yet.
        // So order is: Nullify Users->Codes link, Delete Codes, Delete Users.
        await db.delete(invitationCodes);
        console.log('   Table: invitationCodes cleared');

        await db.delete(users);
        console.log('   Table: users cleared');

        // Optional: Clear MCP servers if desired, though often config-like.
        // Since user asked for "FULL" db clean, we should probably clear these too or ask. 
        // Usually these are system dependent. Let's clear them to be safe as per "Clean FULL db".
        await db.delete(mcpServers);
        console.log('   Table: mcpServers cleared');

        console.log('\n\x1b[32m✓ Database reset complete!\x1b[0m\n');

    } catch (error: any) {
        console.error('\n\x1b[31m✗ Error:\x1b[0m', error?.message || error);
        process.exit(1);
    } finally {
        await client.end();
    }

    process.exit(0);
}

resetDb();
