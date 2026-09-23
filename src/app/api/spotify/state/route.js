import { supabaseServer } from '@/lib/supabaseServer';
import crypto from 'crypto';

// Create a short-lived state token tied to a user id.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;
    if (!userId) return Response.json({ error: 'missing userId' }, { status: 400 });

    const token = crypto.randomBytes(20).toString('hex');
    const expires_at = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    const supabase = supabaseServer();
    const { error } = await supabase.from('spotify_states').upsert({ token, user_id: userId, expires_at }, { onConflict: 'token' });
    if (error) {
      console.error('[spotify/state] supabase error', error);
      const msg = String(error?.message || 'db error');
      const invalidKey = /invalid api key/i.test(msg);
      return Response.json(
        {
          error: invalidKey ? 'supabase_service_key_invalid' : 'db_error',
          message: invalidKey
            ? 'Supabase service role key is invalid or belongs to a different project.'
            : msg,
        },
        { status: invalidKey ? 503 : 500 }
      );
    }

    return Response.json({ token });
  } catch (err) {
    console.error('[spotify/state] unexpected', err);
    return Response.json({ error: 'unexpected' }, { status: 500 });
  }
}
