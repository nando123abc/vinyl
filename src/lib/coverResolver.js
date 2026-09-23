const ONE_DAY = 86400;

let spotifyTokenCache = {
  token: null,
  expiresAt: 0,
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function albumSearchVariants(album) {
  const raw = String(album || "").trim();
  if (!raw) return [];

  const strippedParens = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const strippedDash = strippedParens.replace(/\s[-–]\s.*$/, "").trim();
  const strippedDescriptors = strippedDash
    .replace(/\b(limited|edition|anniversary|signed|bootleg|deluxe)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return Array.from(new Set([raw, strippedParens, strippedDash, strippedDescriptors].filter(Boolean)));
}

function scoreCandidate(artist, album, candidateArtist, candidateAlbum) {
  const a = normalizeText(artist);
  const b = normalizeText(album);
  const ca = normalizeText(candidateArtist);
  const cb = normalizeText(candidateAlbum);

  let score = 0;
  if (!a || !b || !ca || !cb) return score;

  if (ca === a) score += 60;
  else if (ca.includes(a) || a.includes(ca)) score += 30;

  if (cb === b) score += 80;
  else if (cb.includes(b) || b.includes(cb)) score += 40;

  return score;
}

async function resolveReachableImageUrl(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const head = await fetch(candidate, {
        method: "HEAD",
        redirect: "follow",
        next: { revalidate: ONE_DAY },
      });

      if (head.ok) {
        return head.url || candidate;
      }

      // Some CDNs reject HEAD; fallback to GET.
      const get = await fetch(candidate, {
        method: "GET",
        redirect: "follow",
        next: { revalidate: ONE_DAY },
      });

      if (get.ok) {
        return get.url || candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (spotifyTokenCache.token && spotifyTokenCache.expiresAt > now + 30_000) {
    return spotifyTokenCache.token;
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!tokenRes.ok) return null;

  const tokenData = await tokenRes.json().catch(() => null);
  const token = tokenData?.access_token || null;
  const expiresIn = Number(tokenData?.expires_in || 3600);

  if (!token) return null;

  spotifyTokenCache = {
    token,
    expiresAt: now + Math.max(60, expiresIn - 60) * 1000,
  };

  return token;
}

async function resolveFromSpotify({ artist, album }) {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  const params = new URLSearchParams({
    q: `album:${album} artist:${artist}`,
    type: "album",
    limit: "8",
    market: "US",
  });

  const searchRes = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!searchRes.ok) return null;

  const data = await searchRes.json().catch(() => null);
  const items = data?.albums?.items || [];
  if (!Array.isArray(items) || items.length === 0) return null;

  const ranked = items
    .map((item) => {
      const candidateArtist = item?.artists?.[0]?.name || "";
      const candidateAlbum = item?.name || "";
      return {
        score: scoreCandidate(artist, album, candidateArtist, candidateAlbum),
        images: item?.images || [],
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 50) return null;

  const bestImage = [...top.images].sort((a, b) => Number(b?.width || 0) - Number(a?.width || 0))[0]?.url;
  if (!bestImage) return null;

  return resolveReachableImageUrl([bestImage]);
}

function upscaleItunesArtwork(url) {
  if (!url) return null;
  return url
    .replace(/\/[0-9]+x[0-9]+([a-z]*)(\.(jpg|png))$/i, "/1000x1000bb$1$2")
    .replace(/\/100x100bb(\.(jpg|png))$/i, "/1000x1000bb$1");
}

async function resolveFromItunes({ artist, album }) {
  const params = new URLSearchParams({
    term: `${artist} ${album}`,
    entity: "album",
    limit: "10",
  });

  const res = await fetch(`https://itunes.apple.com/search?${params.toString()}`, {
    next: { revalidate: ONE_DAY },
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const results = data?.results || [];
  if (!Array.isArray(results) || results.length === 0) return null;

  const ranked = results
    .map((item) => ({
      score: scoreCandidate(artist, album, item?.artistName, item?.collectionName),
      artwork: upscaleItunesArtwork(item?.artworkUrl100 || item?.artworkUrl60),
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 45) return null;

  return resolveReachableImageUrl([top.artwork]);
}

async function getJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

function pickBestByScore(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return [...items].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))[0] || null;
}

async function resolveFromCoverArtArchive({ artist, album }) {
  const MB_BASE = "https://musicbrainz.org/ws/2";
  const CAA_BASE = "https://coverartarchive.org";
  const query = `artist:"${artist}" AND release:"${album}"`;
  const userAgent = "vinyl-vault/1.0 (email@example.com)";

  const releaseParams = new URLSearchParams({
    query,
    fmt: "json",
    limit: "5",
  });
  const releaseData = await getJson(`${MB_BASE}/release/?${releaseParams.toString()}`, {
    headers: { "User-Agent": userAgent },
    next: { revalidate: ONE_DAY },
  });
  const bestRelease = pickBestByScore(releaseData?.releases);

  const rgParams = new URLSearchParams({
    query,
    fmt: "json",
    limit: "5",
  });
  const rgData = await getJson(`${MB_BASE}/release-group/?${rgParams.toString()}`, {
    headers: { "User-Agent": userAgent },
    next: { revalidate: ONE_DAY },
  });
  const bestReleaseGroup = pickBestByScore(rgData?.["release-groups"]);

  const releaseId = bestRelease?.id || null;
  const releaseGroupId = bestRelease?.["release-group"]?.id || bestReleaseGroup?.id || null;

  const candidates = [
    releaseId ? `${CAA_BASE}/release/${releaseId}/front-500` : null,
    releaseGroupId ? `${CAA_BASE}/release-group/${releaseGroupId}/front-500` : null,
    releaseId ? `${CAA_BASE}/release/${releaseId}/front` : null,
    releaseGroupId ? `${CAA_BASE}/release-group/${releaseGroupId}/front` : null,
  ];

  return resolveReachableImageUrl(candidates);
}

export async function resolveCoverUrl({ artist, album }) {
  if (!artist || !album) return { image: null, source: null };

  const variants = albumSearchVariants(album);

  for (const albumCandidate of variants) {
    try {
      const spotify = await resolveFromSpotify({ artist, album: albumCandidate });
      if (spotify) return { image: spotify, source: "spotify" };
    } catch {
      // Continue with fallback providers.
    }

    try {
      const itunes = await resolveFromItunes({ artist, album: albumCandidate });
      if (itunes) return { image: itunes, source: "itunes" };
    } catch {
      // Continue with fallback providers.
    }

    try {
      const caa = await resolveFromCoverArtArchive({ artist, album: albumCandidate });
      if (caa) return { image: caa, source: "coverartarchive" };
    } catch {
      // Try next variant.
    }
  }

  return { image: null, source: null };
}
