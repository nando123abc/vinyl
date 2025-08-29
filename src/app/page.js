// src/app/page.js
import Catalog from "@/components/catalog";
import {ChartArea, Music, LogIn} from "lucide-react";
import Image from "next/image"; // ⬅️ add this
import Link from "next/link";

// page.js (top of file)
import { Bebas_Neue, Oswald } from "next/font/google";

const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400" });
const oswald = Oswald({ subsets: ["latin"], weight: "600" });


export const dynamic = "force-dynamic";

export default async function Home() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/records`;
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

  const res = await fetch(`${url}?select=${columns}&order=artist.asc`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    cache: "no-store",
  });

  const data = await res.json();
  const records = Array.isArray(data) ? data : [];

  const totalVinyls = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  return (
    <main>
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
        <Catalog initialRecords={records} />
      </div>
    </main>
  );
}
