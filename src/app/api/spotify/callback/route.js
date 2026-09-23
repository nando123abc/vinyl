import { supabaseServer } from '@/lib/supabaseServer';

// Spotify will redirect here with ?code=...&state=...
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // we used this to encode userId

    if (!code) {
      return Response.json({ error: 'missing code' }, { status: 400 });
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI || '',
      }),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text().catch(() => '');
      console.error('[spotify/callback] token error', tokenRes.status, txt);
      return Response.json({ error: 'failed to exchange code' }, { status: 500 });
    }

    const tok = await tokenRes.json();
    // tok: access_token, token_type, expires_in, refresh_token, scope

    const supabase = supabaseServer();

    // Preferred path: resolve a short-lived state token -> user id.
    let userId = null;
    if (state) {
      const stateLookup = await supabase
        .from('spotify_states')
        .select('token,user_id,expires_at')
        .eq('token', state)
        .maybeSingle();

      if (!stateLookup.error && stateLookup.data) {
        const now = Math.floor(Date.now() / 1000);
        if (!stateLookup.data.expires_at || stateLookup.data.expires_at >= now) {
          userId = stateLookup.data.user_id;
        } else {
          console.warn('[spotify/callback] state token expired');
        }

        // One-time token; delete regardless of expiration to prevent replay.
        await supabase.from('spotify_states').delete().eq('token', state);
      } else if (stateLookup.error) {
        // Backward compatibility path for earlier userId-in-state implementation.
        console.warn('[spotify/callback] state lookup failed, falling back to legacy state mode', stateLookup.error.message);
      }
    }

    // Legacy fallback: state used to carry an encoded userId directly.
    if (!userId && state) {
      try {
        const decoded = decodeURIComponent(state);
        if (/^[0-9a-fA-F-]{36}$/.test(decoded)) {
          userId = decoded;
        }
      } catch {
        // ignore decode issues
      }
    }

    if (!userId) {
      console.warn('[spotify/callback] could not resolve userId from state');
      return Response.json({ error: 'invalid_or_missing_state' }, { status: 400 });
    }

    // Persist tokens into a server-side table `spotify_tokens` (user_id PK)
    const expires_at = Math.floor(Date.now() / 1000) + (tok.expires_in || 3600);

    const { error } = await supabase
      .from('spotify_tokens')
      .upsert({ user_id: userId, access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at }, { onConflict: 'user_id' });

    if (error) {
      console.error('[spotify/callback] supabase upsert error', error);
      return Response.json({ error: 'failed to persist tokens' }, { status: 500 });
    }

    // Return a small HTML page that notifies the opener (client) and closes itself
    const html = `<!doctype html>
      <html>
        <body>
          <h2>Spotify connected</h2>
          <p>You can close this window; it will attempt to notify the app automatically.</p>
          <script>
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'spotify_connected', state: ${JSON.stringify(state)} }, '*');
              }
            } catch (e) { /* ignore */ }
            setTimeout(() => { window.close(); }, 800);
          </script>
        </body>
      </html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (err) {
    console.error('[spotify/callback] unexpected', err);
    return Response.json({ error: 'unexpected' }, { status: 500 });
  }
}
