import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://bvzglqnkobrlambozgsd.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ✅ Runtime environment validation - catch misconfiguration early
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ FATAL: Missing Supabase credentials!');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ MISSING');
  console.error('   VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ MISSING');
  console.error('   Check your .env file and ensure both variables are defined.');
}

// ✅ Log which project we're connecting to (safe - URL is not secret)
console.log('🔌 Supabase connecting to:', SUPABASE_URL);
console.log('🔑 Anon key present:', !!SUPABASE_ANON_KEY);

// ✅ TRUE SINGLETON PATTERN
let clientInstance: ReturnType<typeof createClient<Database>> | null = null;

if (!clientInstance) {
  console.log('🚀 Supabase Singleton initialized ONCE');
  
  clientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

export const supabase = clientInstance!;
