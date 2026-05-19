import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
    users,
    invitationCodes,
    chats,
    messages,
    userSettings,
    activeGenerations,
    mcpServers,
    userFacts,
    chatKeys,
} from '../db/schema';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from '../db/env';

dotenv.config();

async function resetDb() {
    console.log('\n\x1b[36m┌─────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[36m│\x1b[0m   \x1b[1mDATABASE RESET\x1b[0m                    \x1b[36m│\x1b[0m');
    console.log('\x1b[36m└─────────────────────────────────────┘\x1b[0m\n');

    const client = postgres(getDatabaseUrl(), { prepare: false });
    const db = drizzle(client);

    try {
        console.log('\x1b[33m[1/1]\x1b[0m Cleaning database tables...');

        await db.delete(activeGenerations);
        console.log('   Dependencies: activeGenerations cleared');

        await db.delete(messages);
        console.log('   Dependencies: messages cleared');

        await db.delete(chatKeys);
        console.log('   Dependencies: chatKeys cleared');

        await db.delete(chats);
        console.log('   Dependencies: chats cleared');

        await db.delete(userFacts);
        console.log('   Dependencies: userFacts cleared');

        await db.delete(userSettings);
        console.log('   Dependencies: userSettings cleared');

        await db.execute(sql`UPDATE users SET invitation_code_id = NULL`);
        console.log('   Circular links broken (users.invitationCodeId -> NULL)');

        await db.delete(invitationCodes);
        console.log('   Table: invitationCodes cleared');

        await db.delete(users);
        console.log('   Table: users cleared');

        await db.delete(mcpServers);
        console.log('   Table: mcpServers cleared');

        console.log('\n\x1b[32m✓ Database reset complete!\x1b[0m\n');
    } catch (error: any) {
        console.error('\n\x1b[31m✗ Error:\x1b[0m', error?.message || error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

resetDb();
