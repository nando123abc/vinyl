// backfill_covers.js
// Node 18+ (global fetch). Install: npm i @supabase/supabase-js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // NEVER put this in frontend code
const MB_CONTACT = process.env.ADMIN_EMAILS || "you@example.com";
const UA = `vinyl-vault/1.0 (${MB_CONTACT})`;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE in your env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function lookupCover(artist, album) {
  const MB_BASE = "https://musicbrainz.org/ws/2";
  const CAA_BASE = "https://coverartarchive.org";
  const q = `artist:"${artist}" AND release:"${album}"`;

  const fetchJSON = async (url, init={}) => {
    const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers||{}) } });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  };

  // 1) Release-group search
  const rg = await fetchJSON(`${MB_BASE}/release-group/?query=${encodeURIComponent(q)}&fmt=json`);
  const rgid = rg?.["release-groups"]?.[0]?.id;

  // Try CAA at release-group
  if (rgid) {
    const caaRG = await fetchJSON(`${CAA_BASE}/release-group/${rgid}`);
    const frontRG = caaRG?.images?.find(i => i.front)?.image;
    if (frontRG) return frontRG;

    // Fallback: a release under that group
    const rels = await fetchJSON(`${MB_BASE}/release?release-group=${rgid}&fmt=json`);
    const releaseId = rels?.releases?.[0]?.id;
    if (releaseId) {
      const head = await fetch(`${CAA_BASE}/release/${releaseId}/front`, { method: "HEAD" });
      if (head.ok) return `${CAA_BASE}/release/${releaseId}/front`;
      const caaRel = await fetchJSON(`${CAA_BASE}/release/${releaseId}`);
      const frontRel = caaRel?.images?.find(i => i.front)?.image;
      if (frontRel) return frontRel;
    }
  }

  // 2) Direct release search
  const rel = await fetchJSON(`${MB_BASE}/release/?query=${encodeURIComponent(q)}&fmt=json`);
  const releaseId2 = rel?.releases?.[0]?.id;
  if (releaseId2) {
    const head2 = await fetch(`${CAA_BASE}/release/${releaseId2}/front`, { method: "HEAD" });
    if (head2.ok) return `${CAA_BASE}/release/${releaseId2}/front`;
    const caaRel2 = await fetchJSON(`${CAA_BASE}/release/${releaseId2}`);
    const frontRel2 = caaRel2?.images?.find(i => i.front)?.image;
    if (frontRel2) return frontRel2;
  }

  return null;
}

async function main() {
  // Pull rows missing cover_url (adjust limit as needed)
  const { data: rows, error } = await supabase
    .from("records")
    .select("id,artist,album,cover_url")
    .is("cover_url", null)
    .limit(500);

  if (error) {
    console.error("DB read error:", error.message);
    process.exit(1);
  }

  for (const r of rows) {
    try {
      const image = await lookupCover(r.artist, r.album);
      if (image) {
        const { error: uerr } = await supabase
          .from("records")
          .update({ cover_url: image })
          .eq("id", r.id);
        if (uerr) console.error("Update failed:", r.id, uerr.message);
        else console.log("✅", r.artist, "-", r.album);
      } else {
        console.log("⚠️ No cover found:", r.artist, "-", r.album);
      }
    } catch (e) {
      console.log("❌ Error for", r.artist, "-", r.album, e.message);
    }
    // Be nice to MusicBrainz/CAA
    await new Promise(res => setTimeout(res, 800));
  }
  console.log("Done.");
}

main();
