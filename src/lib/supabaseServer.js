import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client — requires SUPABASE_SERVICE_ROLE_KEY in env
export const supabaseServer = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
