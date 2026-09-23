// src/app/page.js
import Catalog from "@/components/catalog";
import {ChartArea, Music, LogIn} from "lucide-react";
import Image from "next/image"; // ⬅️ add this
import Link from "next/link";
import { RECORDS_TABLE } from "@/lib/db";

// page.js (top of file)
import { Bebas_Neue, Oswald } from "next/font/google";

const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400" });
const oswald = Oswald({ subsets: ["latin"], weight: "600" });


export const dynamic = "force-dynamic";

export default async function Home({searchParams}) {
  const sp = await searchParams;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = `${supabaseUrl}/rest/v1/${RECORDS_TABLE}`;
  let warningMessage = "";
  const headers = {
    apikey: publicKey,
  };

  // Publishable keys are not JWTs; only send Bearer when the key is JWT-like.
  if (publicKey?.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${publicKey}`;
  }
  const columns = [
    "id",
    "artist",
    "album",
    "year",
    "quantity",
    "format",
    "notes",
    "is_special",
    "is_favorite",
    "cover_url",
    "spotify_url",
    "musicbrainz_release_id",
    "created_at",
    "updated_at",
  ].join(",");
  let data = [];

  if (!supabaseUrl || !publicKey) {
    console.error("[home] Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).");
    warningMessage = "Catalog is temporarily unavailable: Supabase environment variables are missing.";
  } else {
    try {
      const res = await fetch(`${url}?select=${columns}&order=artist.asc`, {
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        let apiMessage = "";
        try {
          const errJson = await res.json();
          apiMessage = errJson?.message || "";
        } catch {
          apiMessage = "";
        }
        console.error("[home] Supabase REST request failed", res.status, res.statusText, apiMessage);
        warningMessage = apiMessage
          ? `Catalog is temporarily unavailable: ${apiMessage}`
          : `Catalog is temporarily unavailable: Supabase API returned ${res.status}.`;
      } else {
        data = await res.json();
      }
    } catch (err) {
      console.error("[home] Failed to reach Supabase", err);
      warningMessage = "Catalog is temporarily unavailable: unable to reach Supabase.";
    }
  }

  const records = Array.isArray(data) ? data : [];

  const rawSort = typeof sp?.sort === "string" ? sp.sort : "artist-asc";
  const initialControls = {
    q: typeof sp?.q === "string" ? sp.q : "",
    favs: sp?.favs === "1",
    special: sp?.special === "1",
    format: typeof sp?.format === "string" ? sp.format : "",
    genre: typeof sp?.genre === "string" ? sp.genre : "",
    sort:
      rawSort === "artist"
        ? "artist-asc"
        : rawSort === "year"
          ? "year-asc"
          : ["artist-asc", "artist-desc", "year-asc", "year-desc", "recent"].includes(rawSort)
            ? rawSort
            : "artist-asc",
  };

  const totalVinyls = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return (
    <main>
      {warningMessage ? (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm"
          >
            {warningMessage}
          </div>
        </div>
      ) : null}

      {/* Simple header with total + dashboard link */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-8 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="./Vinyl_Logo.svg"
            alt="Vi.nyl Vault logo"
            width={36}
            height={36}
            priority
            className="h-9 w-9"
          />
          <span className={`${oswald.className} text-3xl tracking-wide leading-none uppercase`}>Vinyl Vault</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            Total vinyls:&nbsp;
            <span className="font-semibold">{totalVinyls}</span>
          </span>
          {/* <Link
            href="/#"
            className="inline-flex items-center px-3 gap-2 py-1.5 rounded-xl border hover:bg-neutral-50 hover:text-black"
          >
            <Music size={16} className={""} />
            Listening Party
          </Link> */}
          <Link
            href="/dashboard"
            className="inline-flex items-center px-3 gap-2 py-1.5 rounded-xl border hover:bg-neutral-50 hover:text-black"
          >
            <ChartArea size={16} className={""} />
            Dashboard
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center px-3 gap-2 py-1.5 rounded-xl border hover:bg-neutral-50 hover:text-black"
          >
            <LogIn size={16} className={""} />
            Login
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <Catalog initialRecords={records} initialControls={initialControls} />
      </div>
    </main>
  );
}
