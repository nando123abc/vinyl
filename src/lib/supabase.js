import { createClient } from '@supabase/supabase-js';

export const supabaseBrowser = () =>
	createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
		process.env.SUPABASE_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	);