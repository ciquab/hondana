import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export function canCreateAdminClient() {
  return true; // validated at startup via lib/env
}

export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
