// src/app/api/cover/route.js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get("artist")?.trim();
  const album = searchParams.get("album")?.trim();
  if (!artist || !album) {
    return Response.json({ image: null }, { status: 400 });
  }

  const MB_BASE = "https://musicbrainz.org/ws/2";
  const CAA_BASE = "https://coverartarchive.org";

  try {
    // 1) Search release-groups by artist+album
    const q = new URLSearchParams({
      query: `artist:${artist} AND release:${album}`,
      fmt: "json",
    });
    const rgRes = await fetch(`${MB_BASE}/release-group/?${q.toString()}`, {
      headers: { "User-Agent": "vinyl-vault/1.0 (email@example.com)" },
      // Cache for a day on Vercel/Next.js side to reduce API hits
      next: { revalidate: 86400 },
    });
    const data = await rgRes.json().catch(() => ({}));
    const rg = data?.["release-groups"]?.[0];
    if (!rg?.id) {
      return Response.json({ image: null }, { status: 200, headers: { "Cache-Control": "s-maxage=3600" } });
    }

    // 2) Fetch cover art from Cover Art Archive
    const caaRes = await fetch(`${CAA_BASE}/release-group/${rg.id}`, {
      next: { revalidate: 86400 },
    });
    if (!caaRes.ok) {
      return Response.json({ image: null }, { status: 200, headers: { "Cache-Control": "s-maxage=3600" } });
    }
    const caa = await caaRes.json().catch(() => ({}));
    const front = (caa?.images || []).find((img) => img.front);

    return Response.json(
      { image: front?.image || null },
      { status: 200, headers: { "Cache-Control": "s-maxage=86400" } }
    );
  } catch (err) {
    console.error("[cover route] error:", err);
    return Response.json({ image: null }, { status: 200 });
  }
}
