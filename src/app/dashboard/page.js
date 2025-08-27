// src/app/dashboard/page.js
import Dashboard from "@/components/dashboard";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/records`;
  const columns = [
    "id","artist","album","year","quantity","format",
    "is_special","is_favorite","created_at","updated_at","genre"
  ].join(",");

  const res = await fetch(`${url}?select=${columns}`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    cache: 'no-store',
  });

  const data = await res.json();
  const records = Array.isArray(data) ? data : [];

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <a href="/" className="text-sm underline">← Back to catalog</a>
      </div>
      <Dashboard initialRecords={records} />
    </main>
  );
}
