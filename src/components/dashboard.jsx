"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, LineChart, Line
} from "recharts";
import { supabaseBrowser } from "@/lib/supabase";
import { RECORDS_TABLE } from "@/lib/db";

export default function Dashboard({ initialRecords = [] }) {
  const [records, setRecords] = useState(initialRecords);

  // Live updates via Supabase Realtime (anon read must be allowed by RLS)
  useEffect(() => {
    const supabase = supabaseBrowser();

    async function refresh() {
      const { data, error } = await supabase
        .from(RECORDS_TABLE)
        .select("id,artist,album,year,quantity,format,is_special,is_favorite,created_at,updated_at,genre")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!error) setRecords(Array.isArray(data) ? data : []);
    }

    const channel = supabase
      .channel(`${RECORDS_TABLE}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table: RECORDS_TABLE }, refresh)
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
        .from(RECORDS_TABLE)
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

      {/* Spotify personal section */}
      <Panel title="Your Spotify (personal)">
        <SpotifyPanel />
      </Panel>

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

function SpotifyPanel() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [busyConnect, setBusyConnect] = useState(false);
  const popupRef = useRef(null);

  async function getUserId() {
    const supabase = supabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.user?.id || null;
  }

  async function openConnect() {
    setBusyConnect(true);
    setStatus("");
    const userId = await getUserId();
    if (!userId) {
      setStatus('Please sign in first.');
      setBusyConnect(false);
      return;
    }

    let url = `/api/spotify/login?userId=${encodeURIComponent(userId)}`;
    // Prefer short-lived state tokens; fallback to legacy userId-based state if unavailable.
    try {
      const stateRes = await fetch('/api/spotify/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (stateRes.ok) {
        const stateJson = await stateRes.json();
        if (stateJson?.token) {
          url = `/api/spotify/login?stateToken=${encodeURIComponent(stateJson.token)}`;
        }
      }
    } catch {
      // ignore and fallback
    }

    popupRef.current = window.open(url, 'spotify_connect', 'width=600,height=800');
    setStatus('Spotify authorization window opened. Approve access there and this panel will refresh automatically.');
    setBusyConnect(false);
  }

  async function fetchSpotify() {
    setLoading(true);
    setStatus("");
    try {
      const userId = await getUserId();
      if (!userId) {
        setStatus('Please sign in first.');
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/spotify/data?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        const txt = await res.text();
        console.error('spotify fetch error', txt);
        setData(null);
        setConnected(false);
        setStatus('Could not load Spotify data yet. Connect Spotify first, then refresh.');
      } else {
        const json = await res.json();
        setData(json);
        setConnected(true);
        setStatus('Spotify data refreshed.');
      }
    } catch (err) {
      console.error(err);
      setData(null);
      setConnected(false);
      setStatus('Spotify request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const id = await getUserId();
      if (!id) return;
      fetchSpotify();
    })();
  }, []);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'spotify_connected') return;
      fetchSpotify();
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button className="btn" onClick={openConnect} disabled={busyConnect || loading}>
          {busyConnect ? 'Opening...' : 'Connect Spotify'}
        </button>
        <button className="btn" onClick={fetchSpotify} disabled={loading || busyConnect}>{loading ? 'Loading...' : 'Refresh'}</button>
        <div className="text-sm text-neutral-600">{connected ? 'Connected' : 'Not connected'}</div>
      </div>

      {status ? <div className="text-sm text-neutral-600">{status}</div> : null}

      {data ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="font-medium">Currently playing</div>
            {data.currently_playing && data.currently_playing.item ? (
              <div className="mt-2">
                <div className="font-semibold">{data.currently_playing.item.name}</div>
                <div className="text-sm text-neutral-600">{(data.currently_playing.item.artists || []).map(a => a.name).join(', ')}</div>
                {data.currently_playing.item.preview_url ? (
                  <audio controls src={data.currently_playing.item.preview_url} className="mt-2 w-full" />
                ) : (
                  <div className="text-sm text-neutral-500 mt-2">No preview available</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-neutral-500 mt-2">Nothing playing or no permission.</div>
            )}
          </div>

          <div>
            <div className="font-medium">Top 5 Artists</div>
            <ol className="list-decimal pl-5 mt-2 text-sm">
              {(data.top_artists || []).map(a => (
                <li key={a.id} className="py-1">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-neutral-500 text-sm">{a.genres?.slice(0,2).join(', ')}</div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="font-medium">Top 5 Albums</div>
            <ol className="list-decimal pl-5 mt-2 text-sm">
              {(data.top_albums || []).map(a => (
                <li key={a.id} className="py-1">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-neutral-500 text-sm">{(a.artists || []).map(x => x.name).join(', ')}</div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="font-medium">Top 5 Tracks</div>
            <ol className="list-decimal pl-5 mt-2 text-sm">
              {(data.top_tracks || []).map(t => (
                <li key={t.id} className="py-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-neutral-500 text-sm">{(t.artists || []).map(x => x.name).join(', ')}</div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="font-medium">Monthly listening (last 12 months)</div>
            <div className="mt-2" style={{ width: '100%', height: 160 }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.monthly_listening || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="var(--color-accent-color)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-neutral-500">No Spotify data. Connect and refresh to load.</div>
      )}
    </div>
  );
}
