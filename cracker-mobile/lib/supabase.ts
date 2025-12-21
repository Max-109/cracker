import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase credentials from .env (NEW PROJECT - migrated for security)
const SUPABASE_URL = 'https://ousemhpryvyxreurmany.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91c2VtaHByeXZ5eHJldXJtYW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTUyNjcsImV4cCI6MjA4MTU3MTI2N30.ExSTE98-6GWafdhub_q85dm8VTcUSZ7GEP_YBgzSvj0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
