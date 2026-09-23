import { supabaseServer } from '@/lib/supabaseServer';

async function fetchWithToken(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function deriveTopAlbumsFromTracks(tracks = []) {
  const byAlbum = new Map();

  for (const t of tracks) {
    const album = t?.album;
    if (!album?.id) continue;
    const curr = byAlbum.get(album.id) || {
      id: album.id,
      name: album.name,
      artists: album.artists || [],
      score: 0,
    };
    curr.score += Number(t?.popularity) || 1;
    byAlbum.set(album.id, curr);
  }

  return Array.from(byAlbum.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score, ...album }) => album);
}

// Returns: { currently_playing, top_artists, top_albums, top_tracks, monthly_listening }
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return Response.json({ error: 'missing userId' }, { status: 400 });

    const supabase = supabaseServer();
    let data;
    try {
      const resp = await supabase.from('spotify_tokens').select('*').eq('user_id', userId).single();
      data = resp.data;
      if (resp.error) {
        console.error('[spotify/data] supabase select error', resp.error);
        return Response.json({ error: 'no tokens found', details: resp.error.message }, { status: 404 });
      }
      if (!data) {
        return Response.json({ error: 'no tokens found' }, { status: 404 });
      }
    } catch (dbErr) {
      console.error('[spotify/data] supabase exception', dbErr);
      return Response.json({ error: 'db_exception', message: String(dbErr?.message || dbErr) }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    let accessToken = data.access_token;

    // If expired or close to expiration, attempt refresh
    if (!accessToken || (data.expires_at && data.expires_at - 60 < now)) {
      // Refresh token
      const tRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: data.refresh_token }),
      });
      if (tRes.ok) {
        const t = await tRes.json();
        accessToken = t.access_token;
        const expires_at = Math.floor(Date.now() / 1000) + (t.expires_in || 3600);
        const upd = await supabase.from('spotify_tokens').update({ access_token: accessToken, expires_at }).eq('user_id', userId);
        if (upd.error) console.error('[spotify/data] supabase update error', upd.error);
      } else {
        const txt = await tRes.text().catch(() => '');
        console.error('[spotify/data] refresh failed', tRes.status, txt);
        return Response.json({ error: 'refresh_failed', status: tRes.status, body: txt }, { status: 500 });
      }
    }

    // Fetch endpoints in parallel
    const [currently, topArtists, topTracks, recentPlays] = await Promise.all([
      fetchWithToken('https://api.spotify.com/v1/me/player/currently-playing', accessToken),
      fetchWithToken('https://api.spotify.com/v1/me/top/artists?limit=5', accessToken),
      fetchWithToken('https://api.spotify.com/v1/me/top/tracks?limit=5', accessToken),
      fetchWithToken('https://api.spotify.com/v1/me/player/recently-played?limit=50', accessToken),
    ]);

    const derivedTopAlbums = deriveTopAlbumsFromTracks(topTracks?.items || []);

    // If the state looks like a token (not raw user id), resolve it to the user id for cases where caller passed a state token
    // (backwards compatibility handled by storing tokens by user_id only; this is a noop here)

    // Simple monthly listening breakdown from recently-played
    const monthly = {};
    if (recentPlays?.items) {
      for (const it of recentPlays.items) {
        const t = new Date(it.played_at);
        const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
        monthly[key] = (monthly[key] || 0) + 1;
      }
    }

    // Build last 12 months
    const nowDate = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: key, count: monthly[key] || 0 });
    }

    return Response.json({
      currently_playing: currently || null,
      top_artists: topArtists?.items || [],
      top_albums: derivedTopAlbums,
      top_tracks: topTracks?.items || [],
      monthly_listening: months,
    });
  } catch (err) {
    console.error('[spotify/data] error', err?.stack || err);
    // In dev return the error message to help debugging (avoid exposing in prod)
    return Response.json({ error: 'unexpected', message: String(err?.message || err) }, { status: 500 });
  }
}
