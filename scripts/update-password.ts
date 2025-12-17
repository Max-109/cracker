/**
 * Script to update user password
 * Usage: NEW_PASSWORD='...' bun run scripts/update-password.ts <email>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function updatePassword() {
    const args = process.argv.slice(2);
    const email = args[0];
    const newPassword = process.env.NEW_PASSWORD;

    if (!email || !newPassword) {
        console.error('Usage: NEW_PASSWORD=\'...\' bun run scripts/update-password.ts <email>');
        process.exit(1);
    }

    console.log('\n🔐 Updating Password for:', email);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find User
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Failed to list users:', listError.message);
        process.exit(1);
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        console.error('❌ User not found');
        process.exit(1);
    }

    // 2. Update Password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
    });

    if (updateError) {
        console.error('❌ Failed to update password:', updateError.message);
        process.exit(1);
    }

    console.log('✅ Password successfully updated!');
}

updatePassword();
