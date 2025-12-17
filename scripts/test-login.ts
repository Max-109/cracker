/**
 * Script to test login and diagnose auth issues
 * Usage: ADMIN_PASSWORD='...' bun run scripts/test-login.ts <email>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testLogin() {
    const args = process.argv.slice(2);
    const email = args[0];
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.error('Usage: ADMIN_PASSWORD=\'...\' bun run scripts/test-login.ts <email>');
        process.exit(1);
    }

    console.log('\n🔍 Diagnosing Login Issue for:', email);
    console.log('----------------------------------------');

    // 1. Check user status with Admin Client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Failed to list users:', listError.message);
    } else {
        const user = users.find(u => u.email === email);
        if (user) {
            console.log('✅ User found in Auth system');
            console.log('   ID:', user.id);
            console.log('   Email:', user.email);
            console.log('   Confirmed At:', user.email_confirmed_at ? user.email_confirmed_at : '❌ NOT CONFIRMED');
            console.log('   Last Sign In:', user.last_sign_in_at || 'Never');
            console.log('   App Metadata:', JSON.stringify(user.app_metadata, null, 2));
            console.log('   User Metadata:', JSON.stringify(user.user_metadata, null, 2));

            if (!user.email_confirmed_at) {
                console.log('\n⚠️  WARNING: User email is not confirmed. This usually prevents login.');
                console.log('   Attempting to manually confirm user...');
                const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
                    email_confirm: true
                });
                if (updateError) {
                    console.log('   ❌ Failed to confirm email:', updateError.message);
                } else {
                    console.log('   ✅ User email manually confirmed. Try logging in again.');
                }
            }
        } else {
            console.error('❌ User NOT found in Auth system via Admin API');
        }
    }

    console.log('\n----------------------------------------');
    console.log('🔐 Testing Login with Credentials...');

    // 2. Try Login with Public Client
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('❌ Login Failed:', error.message);
        console.error('   Error Details:', error);
    } else {
        console.log('✅ Login Successful!');
        console.log('   Session User:', data.user?.email);
        console.log('   Access Token:', data.session?.access_token ? '(Present)' : '(Missing)');
    }
}

testLogin();
