// Server route that redirects user to Spotify authorization page
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    // Accept either a pre-built state token or a plain userId (backcompat)
    const stateToken = searchParams.get('stateToken');
    const userId = searchParams.get('userId') || '';

    const state = stateToken || (userId ? encodeURIComponent(userId) : undefined);

    // Basic validation so we don't redirect to Spotify with missing params
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      console.error('[spotify/login] missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI');
      return Response.json({ error: 'missing_spotify_env', message: 'SPOTIFY_CLIENT_ID and SPOTIFY_REDIRECT_URI must be set on the server' }, { status: 500 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: [
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-top-read',
        'user-read-recently-played',
        'user-read-private'
      ].join(' '),
      show_dialog: 'true'
    });
    if (state) params.set('state', state);

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return Response.redirect(url);
  } catch (err) {
    console.error('[spotify/login] error', err);
    return Response.json({ error: 'failed to create spotify auth url' }, { status: 500 });
  }
}
