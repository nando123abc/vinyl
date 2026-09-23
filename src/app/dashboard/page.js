// src/app/dashboard/page.js
import Dashboard from "@/components/dashboard";
import Link from "next/link";
import { RECORDS_TABLE } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
    "is_special",
    "is_favorite",
    "created_at",
    "updated_at",
    "genre",
  ].join(",");
  let data = [];

  if (!supabaseUrl || !publicKey) {
    console.error("[dashboard] Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).");
    warningMessage = "Dashboard data is temporarily unavailable: Supabase environment variables are missing.";
  } else {
    try {
      const res = await fetch(`${url}?select=${columns}`, {
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
        console.error("[dashboard] Supabase REST request failed", res.status, res.statusText, apiMessage);
        warningMessage = apiMessage
          ? `Dashboard data is temporarily unavailable: ${apiMessage}`
          : `Dashboard data is temporarily unavailable: Supabase API returned ${res.status}.`;
      } else {
        data = await res.json();
      }
    } catch (err) {
      console.error("[dashboard] Failed to reach Supabase", err);
      warningMessage = "Dashboard data is temporarily unavailable: unable to reach Supabase.";
    }
  }

  const records = Array.isArray(data) ? data : [];

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6">
      {warningMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm"
        >
          {warningMessage}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/" className="text-sm underline">
          ← Back to catalog
        </Link>
      </div>
      <Dashboard initialRecords={records} />
    </main>
  );
}
