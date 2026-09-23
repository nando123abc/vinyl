// src/app/api/cover/route.js
import { resolveCoverUrl } from "@/lib/coverResolver";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get("artist")?.trim();
  const album = searchParams.get("album")?.trim();
  if (!artist || !album) {
    return Response.json({ image: null }, { status: 400 });
  }

  try {
    const { image, source } = await resolveCoverUrl({ artist, album });

    if (!image) {
      return Response.json({ image: null }, { status: 200, headers: { "Cache-Control": "s-maxage=3600" } });
    }

    return Response.json(
      { image, source },
      { status: 200, headers: { "Cache-Control": "s-maxage=86400" } }
    );
  } catch (err) {
    console.error("[cover route] error:", err);
    return Response.json({ image: null }, { status: 200 });
  }
}
