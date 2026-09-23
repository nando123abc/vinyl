// Safe debug endpoint — returns presence (true/false) of required env vars without exposing their values.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  try {
    const envs = [
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REDIRECT_URI',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    ];

    const out = {};
    for (const k of envs) out[k] = Boolean(process.env[k]);

    return Response.json({ ok: true, env: out, nodeEnv: process.env.NODE_ENV || null });
  } catch (err) {
    console.error('[debug/env] error', err);
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
