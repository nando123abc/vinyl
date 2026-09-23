// backfill_covers.js
// Usage examples:
//   node backfill_covers.js
//   COVER_LIMIT=200 node backfill_covers.js
//   COVER_DRY_RUN=1 node backfill_covers.js
//   COVER_INCLUDE_LEGACY=0 node backfill_covers.js
import { createClient } from "@supabase/supabase-js";
import { resolveCoverUrl } from "./src/lib/coverResolver.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] != null) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
parseEnvFile(path.join(__dirname, ".env.local"));
parseEnvFile(path.join(__dirname, ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = process.env.NEXT_PUBLIC_SUPABASE_RECORDS_TABLE || "records";

const LIMIT = Number(process.env.COVER_LIMIT || 300);
const DRY_RUN = process.env.COVER_DRY_RUN === "1";
const INCLUDE_LEGACY = process.env.COVER_INCLUDE_LEGACY !== "0";
const DELAY_MS = Number(process.env.COVER_DELAY_MS || 250);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error(
    "Missing env vars. Required URL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL. Required secret: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCandidateRows() {
  let query = supabase
    .from(TABLE)
    .select("id,artist,album,cover_url,updated_at")
    .order("updated_at", { ascending: false })
    .limit(LIMIT);

  if (INCLUDE_LEGACY) {
    query = query.or("cover_url.is.null,cover_url.like.%coverartarchive.org%")
  } else {
    query = query.is("cover_url", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function main() {
  console.log(`Starting cover repair for table '${TABLE}' (limit=${LIMIT}, includeLegacy=${INCLUDE_LEGACY}, dryRun=${DRY_RUN})`);

  const rows = await getCandidateRows();
  if (rows.length === 0) {
    console.log("No candidate rows found.");
    return;
  }

  let scanned = 0;
  let updated = 0;
  let unchanged = 0;
  let unresolved = 0;
  let failed = 0;

  for (const row of rows) {
    scanned += 1;
    const artist = String(row.artist || "").trim();
    const album = String(row.album || "").trim();

    if (!artist || !album) {
      unchanged += 1;
      continue;
    }

    try {
      const { image, source } = await resolveCoverUrl({ artist, album });
      if (!image) {
        unresolved += 1;
        console.log(`⚠️  [${scanned}/${rows.length}] no match: ${artist} - ${album}`);
      } else if (image === row.cover_url) {
        unchanged += 1;
      } else if (DRY_RUN) {
        updated += 1;
        console.log(`🧪 [${scanned}/${rows.length}] would update (${source}): ${artist} - ${album}`);
      } else {
        const { error: updateError } = await supabase
          .from(TABLE)
          .update({ cover_url: image })
          .eq("id", row.id);

        if (updateError) {
          failed += 1;
          console.error(`❌ update failed for ${artist} - ${album}:`, updateError.message);
        } else {
          updated += 1;
          console.log(`✅ [${scanned}/${rows.length}] updated (${source}): ${artist} - ${album}`);
        }
      }
    } catch (err) {
      failed += 1;
      console.error(`❌ lookup failed for ${artist} - ${album}:`, err?.message || err);
    }

    if (DELAY_MS > 0) {
      await sleep(DELAY_MS);
    }
  }

  console.log("---");
  console.log(`Done. scanned=${scanned} updated=${updated} unchanged=${unchanged} unresolved=${unresolved} failed=${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err?.message || err);
  process.exit(1);
});
