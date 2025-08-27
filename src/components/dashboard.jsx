"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, LineChart, Line
} from "recharts";
import { supabaseBrowser } from "@/lib/supabase";

export default function Dashboard({ initialRecords = [] }) {
  const [records, setRecords] = useState(initialRecords);

  // Live updates via Supabase Realtime (anon read must be allowed by RLS)
  useEffect(() => {
    const supabase = supabaseBrowser();

    async function refresh() {
      const { data, error } = await supabase
        .from("records")
        .select("id,artist,album,year,quantity,format,is_special,is_favorite,created_at,updated_at,genre")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!error) setRecords(Array.isArray(data) ? data : []);
    }

    const channel = supabase
      .channel("records-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "records" }, refresh)
      .subscribe();

    // First paint refresh (ensures client & server in sync)
    refresh();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalVinyls = useMemo(
    () => records.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
    [records]
  );

  const uniqueArtists = useMemo(
    () => new Set(records.map(r => r.artist)).size,
    [records]
  );

  const favCount = useMemo(
    () => records.filter(r => r.is_favorite).length,
    [records]
  );

  const specialCount = useMemo(
    () => records.filter(r => r.is_special).length,
    [records]
  );

  // Top artists (by sum of quantity)
  const topArtists = useMemo(() => {
    const m = new Map();
    for (const r of records) {
      const q = Number(r.quantity) || 0;
      m.set(r.artist, (m.get(r.artist) || 0) + q);
    }
    return Array.from(m, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [records]);

  // Years distribution
  const yearsData = useMemo(() => {
    const m = new Map();
    for (const r of records) {
      const y = Number(r.year);
      if (!Number.isFinite(y)) continue;
      m.set(y, (m.get(y) || 0) + (Number(r.quantity) || 0));
    }
    return Array.from(m, ([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);
  }, [records]);

  // Formats distribution
  const formatPie = useMemo(() => {
    const m = new Map();
    for (const r of records) {
      const key = (r.format || "Unknown").trim() || "Unknown";
      m.set(key, (m.get(key) || 0) + (Number(r.quantity) || 0));
    }
    return Array.from(m, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  // Monthly additions (created_at by month)
  const monthlyAdds = useMemo(() => {
    const m = new Map();
    for (const r of records) {
      const t = r.created_at ? new Date(r.created_at) : null;
      if (!t) continue;
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
      m.set(key, (m.get(key) || 0) + (Number(r.quantity) || 0));
    }
    const now = new Date();
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ month: key, count: m.get(key) || 0 });
    }
    return out;
  }, [records]);

  // Genre (optional column)
  const hasGenre = useMemo(
    () => records.some(r => r.genre && String(r.genre).trim().length > 0),
    [records]
  );
  const genrePie = useMemo(() => {
    if (!hasGenre) return [];
    const m = new Map();
    for (const r of records) {
      const g = (r.genre || "Unknown").trim() || "Unknown";
      m.set(g, (m.get(g) || 0) + (Number(r.quantity) || 0));
    }
    return Array.from(m, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [records, hasGenre]);

  // Quick insights
  const insights = useMemo(() => {
    const top = topArtists[0]?.name || "—";
    const oldest = yearsData[0]?.year ?? "—";
    const newest = yearsData[yearsData.length - 1]?.year ?? "—";
    const avgYear = yearsData.length
      ? Math.round(
          yearsData.reduce((s, r) => s + r.year * r.count, 0) /
          yearsData.reduce((s, r) => s + r.count, 0)
        )
      : "—";
    return { top, oldest, newest, avgYear };
  }, [topArtists, yearsData]);

  // Admin-only spend (requires RLS allowing authenticated admins to read cost_cents)
  const [spend, setSpend] = useState(null);
  useEffect(() => {
    const supabase = supabaseBrowser();
    let mounted = true;
    (async () => {
      const { data: { session } = { session: null } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from("records")
        .select("cost_cents,quantity")
        .not("cost_cents","is", null)
        .limit(5000);
      if (error || !mounted) return;
      const totalCents = (data || []).reduce((s, r) => {
        const unit = Number(r.cost_cents) || 0;
        const qty = Math.max(1, Number(r.quantity) || 1);
        return s + unit * qty;
      }, 0);
      setSpend({
        totalUSD: (totalCents / 100).toFixed(2),
        avgUSD: (totalCents / Math.max(1, totalVinyls) / 100).toFixed(2),
      });
    })();
    return () => { mounted = false; };
  }, [totalVinyls]);

  return (
    <div className="space-y-6">
        
      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total vinyls" value={totalVinyls} />
        <StatCard label="Unique artists" value={uniqueArtists} />
        <StatCard label="Favorites" value={favCount} />
        <StatCard label="Special editions" value={specialCount} />
      </div>
      {spend ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <StatCard label="Total spent (admin)" value={`$${spend.totalUSD}`} />
          <StatCard label="Avg cost per record" value={`$${spend.avgUSD}`} />
        </div>
      ) : null}

      {/* Insights */}
      <Panel title="Quick insights">
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Top artist: <span className="font-medium">{insights.top}</span></li>
          <li>Oldest year in collection: <span className="font-medium">{insights.oldest}</span></li>
          <li>Newest year in collection: <span className="font-medium">{insights.newest}</span></li>
          <li>Average year (weighted by quantity): <span className="font-medium">{insights.avgYear}</span></li>
        </ul>
      </Panel>
      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Top artists (by quantity)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topArtists}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-accent-color)"/>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Years (count of records)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yearsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-accent-color)"/>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Formats">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip />
              <Pie dataKey="value" nameKey="name" data={formatPie} cx="50%" cy="50%" outerRadius={100} label />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Monthly additions (last 12 months)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyAdds}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        {hasGenre ? (
          <Panel title="Top genres">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Tooltip />
                <Pie dataKey="value" nameKey="name" data={genrePie} cx="50%" cy="50%" outerRadius={100} label />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        ) : (
          <Panel title="Genres">
            <div className="text-sm text-neutral-500">
              Add a <code className="px-1 rounded bg-neutral-100">genre</code> column to your <code className="px-1 rounded bg-neutral-100">records</code> table to populate this chart (e.g., TEXT, nullable).
            </div>
          </Panel>
        )}
      </div>

    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-4 border rounded-2xl bg-spotify-gray">
      <div className="text-sm text-neutral-600">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="p-4 border rounded-2xl bg-spotify-gray">
      <div className="font-medium mb-3">{title}</div>
      {children}
    </div>
  );
}
