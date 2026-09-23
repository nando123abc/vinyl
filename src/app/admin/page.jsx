"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { RECORDS_TABLE } from "@/lib/db";

export default function AdminPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [uiMessage, setUiMessage] = useState({ type: "", text: "" });
  const [listQuery, setListQuery] = useState("");
  const [listGenre, setListGenre] = useState("");
  const [form, setForm] = useState({
    id: "",
    artist: "",
    album: "",
    year: "",
    quantity: 1,
    cost_cents: "",
    format: "LP",
    notes: "",
    is_special: false,
    is_favorite: false,
    genre: "",
    spotify_url: "",
    cover_url: "",
  });

  // ------- Auth + data fetch (only after login) -------
  useEffect(() => {
    let mounted = true;

    // Keep session in sync (magic link, sign-in/out)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!mounted) return;
      setSession(s);
      if (s) {
        verifyAdminAndLoad(s);
      }
      else {
        setRecords([]);
        setLoadError("");
        setIsAdmin(false);
      }
    });

    // Initial session + fetch
    (async () => {
      const { data: { session: s } = {} } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s);
      if (s) verifyAdminAndLoad(s);
    })();

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function verifyAdminAndLoad(currSession) {
    const email = currSession?.user?.email;
    if (!email) {
      setIsAdmin(false);
      setRecords([]);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("admins")
      .select("email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      setIsAdmin(false);
      setRecords([]);
      setUiMessage({ type: "error", text: error.message || "Failed to verify admin access." });
      return;
    }

    if (!data) {
      setIsAdmin(false);
      setRecords([]);
      setUiMessage({ type: "error", text: "This account is authenticated but not in the admin allowlist." });
      return;
    }

    setIsAdmin(true);
    setUiMessage({ type: "success", text: "Signed in as admin." });
    await fetchRecords();
  }

  async function fetchRecords() {
    setLoading(true);
    setLoadError("");
    // If your RLS allows authenticated to read everything, "*" is fine.
    // Otherwise, list the columns you need explicitly:
    // .select("id,artist,album,year,quantity,cost_cents,format,notes,is_special,is_favorite,genre,spotify_url,cover_url,created_at,updated_at")
    const { data, error } = await supabase
      .from(RECORDS_TABLE)
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setLoadError(error.message || "Failed to load records (check RLS/grants).");
      setRecords([]);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }

  const isAuthed = !!session?.user?.email;

  const adminGenres = useMemo(() => {
    const set = new Set(records.map((r) => (r.genre || "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (listGenre && (r.genre || "") !== listGenre) return false;
      if (!q) return true;
      return (
        (r.artist || "").toLowerCase().includes(q) ||
        (r.album || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q) ||
        String(r.year || "").includes(q)
      );
    });
  }, [records, listQuery, listGenre]);

  const adminStats = useMemo(() => {
    const totalItems = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const uniqueArtists = new Set(records.map((r) => r.artist).filter(Boolean)).size;
    const favorites = records.filter((r) => r.is_favorite).length;
    const specials = records.filter((r) => r.is_special).length;

    let costCount = 0;
    let totalCostCents = 0;
    for (const r of records) {
      if (r.cost_cents == null || r.cost_cents === "") continue;
      const unit = Number(r.cost_cents) || 0;
      const qty = Math.max(1, Number(r.quantity) || 1);
      totalCostCents += unit * qty;
      costCount += qty;
    }

    const genreMap = new Map();
    for (const r of records) {
      const g = (r.genre || "Unknown").trim() || "Unknown";
      genreMap.set(g, (genreMap.get(g) || 0) + (Number(r.quantity) || 0));
    }
    const topGenreEntry = Array.from(genreMap.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      totalItems,
      uniqueArtists,
      favorites,
      specials,
      totalSpentUSD: (totalCostCents / 100).toFixed(2),
      avgCostUSD: costCount > 0 ? (totalCostCents / costCount / 100).toFixed(2) : null,
      topGenre: topGenreEntry ? `${topGenreEntry[0]} (${topGenreEntry[1]})` : "—",
    };
  }, [records]);

  async function onLogin() {
    const email = authEmail.trim();
    if (!email) {
      setUiMessage({ type: "error", text: "Enter your admin email first." });
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/admin" },
    });
    if (error) setUiMessage({ type: "error", text: error.message });
    else {
      setUiMessage({ type: "success", text: "Check your email for the sign-in link." });
      setAuthEmail("");
    }
  }

  async function onLogout() {
    await supabase.auth.signOut();
    // clear local UI
    setRecords([]);
    setForm((f) => ({ ...f, id: "" }));
    setIsAdmin(false);
    setUiMessage({ type: "", text: "" });
  }

  async function onFetchCover() {
    const artist = form.artist?.trim();
    const album = form.album?.trim();
    if (!artist || !album) {
      setUiMessage({ type: "error", text: "Please enter Artist and Album first." });
      return;
    }
    try {
      const res = await fetch(`/api/cover?artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`);
      const { image } = await res.json();
      if (image) setForm((f) => ({ ...f, cover_url: image }));
      else setUiMessage({ type: "error", text: "No cover art found for that artist/album." });
    } catch (e) {
      console.error(e);
      setUiMessage({ type: "error", text: "Cover lookup failed. Try again." });
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const payload = {
      artist: form.artist,
      album: form.album,
      year: form.year ? Number(form.year) : null,
      quantity: form.quantity ? Number(form.quantity) : 1,
      cost_cents: form.cost_cents !== "" ? Number(form.cost_cents) : null,
      format: form.format || null,
      notes: form.notes || null,
      is_special: !!form.is_special,
      is_favorite: !!form.is_favorite,
      genre: form.genre || null,
      spotify_url: form.spotify_url || null,
      cover_url: form.cover_url || null,
    };

    if (form.id) {
      // Update (don’t send id in body)
      const { error } = await supabase.from(RECORDS_TABLE).update(payload).eq("id", form.id);
      if (error) return setUiMessage({ type: "error", text: error.message });
    } else {
      const { error } = await supabase.from(RECORDS_TABLE).insert(payload);
      if (error) return setUiMessage({ type: "error", text: error.message });
    }
    await fetchRecords();
    setUiMessage({ type: "success", text: "Saved." });
  }

  async function onDelete() {
    if (!form.id) return;
    const confirmed = window.confirm("Delete this record?");
    if (!confirmed) return;
    const { error } = await supabase.from(RECORDS_TABLE).delete().eq("id", form.id);
    if (error) return setUiMessage({ type: "error", text: error.message });
    await fetchRecords();
    setForm((f) => ({
      ...f,
      id: "",
      artist: "",
      album: "",
      year: "",
      quantity: 1,
      cost_cents: "",
      format: "LP",
      notes: "",
      is_special: false,
      is_favorite: false,
      genre: "",
      spotify_url: "",
      cover_url: "",
    }));
    setUiMessage({ type: "success", text: "Deleted." });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pt-6 pb-15 ">
        <h1 className="text-2xl font-semibold">Admin</h1>
        {isAuthed ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-600 truncate max-w-[200px]">{session.user.email}</span>
            <button className="px-3 py-2 border rounded-xl" onClick={onLogout}>
              Log out
            </button>
          </div>
        ) : (
          <button className="px-3 py-2 border rounded-xl" onClick={onLogin}>
            Email sign-in
          </button>
        )}
      </div>

      {!isAuthed && (
        <div className="p-4 border rounded-2xl bg-spotify-gray space-y-3">
          <p className="text-sm text-neutral-700">
            Sign in with your admin email to manage records.
          </p>
          <div className="flex gap-2 max-w-lg">
            <input
              type="email"
              className="flex-1 border rounded-xl px-3 py-2"
              placeholder="you@example.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <button className="px-3 py-2 border rounded-xl" onClick={onLogin}>
              Send magic link
            </button>
          </div>
        </div>
      )}

      {!!uiMessage.text && (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            uiMessage.type === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800",
          ].join(" ")}
        >
          {uiMessage.text}
        </div>
      )}

      {isAuthed && !isAdmin && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          <div className="font-medium">Signed in, but this email is not in the admin allowlist.</div>
          <div className="mt-1">
            Signed-in email detected by app: <b>{session?.user?.email || "(none)"}</b>
          </div>
          <div className="mt-1">Run this in the Supabase SQL editor for the same project used by Vercel:</div>
          <pre className="mt-2 rounded-md border border-amber-300 bg-amber-100 p-2 text-xs overflow-auto">
{`insert into public.admins (email)
values ('${session?.user?.email || "you@example.com"}')
on conflict (email) do nothing;`}
          </pre>
          <div className="mt-2">Then refresh this page.</div>
        </div>
      )}

      {isAuthed && isAdmin && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 border rounded-xl bg-spotify-gray">
              <div className="text-xs text-neutral-600">Total vinyls</div>
              <div className="text-xl font-semibold">{adminStats.totalItems}</div>
            </div>
            <div className="p-3 border rounded-xl bg-spotify-gray">
              <div className="text-xs text-neutral-600">Unique artists</div>
              <div className="text-xl font-semibold">{adminStats.uniqueArtists}</div>
            </div>
            <div className="p-3 border rounded-xl bg-spotify-gray">
              <div className="text-xs text-neutral-600">Favorites · Specials</div>
              <div className="text-xl font-semibold">{adminStats.favorites} · {adminStats.specials}</div>
            </div>
            <div className="p-3 border rounded-xl bg-spotify-gray">
              <div className="text-xs text-neutral-600">Top genre</div>
              <div className="text-sm font-semibold truncate">{adminStats.topGenre}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 border rounded-xl bg-spotify-gray">
              <div className="text-xs text-neutral-600">Total spend (tracked)</div>
              <div className="text-xl font-semibold">${adminStats.totalSpentUSD}</div>
            </div>
            <div className="p-3 border rounded-xl bg-spotify-gray">
              <div className="text-xs text-neutral-600">Average cost per record</div>
              <div className="text-xl font-semibold">{adminStats.avgCostUSD ? `$${adminStats.avgCostUSD}` : "—"}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="p-4 border rounded-2xl bg-spotify-gray">
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Artist</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.artist}
                    onChange={(e) => setForm({ ...form, artist: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm">Album</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.album}
                    onChange={(e) => setForm({ ...form, album: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm">Year</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm">Quantity</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm">Cost (cents)</label>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.cost_cents}
                    onChange={(e) => setForm({ ...form, cost_cents: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm">Format</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm">Genre</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                    placeholder="e.g. Alternative R&B, Jazz, Hip-Hop"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm">Notes (signed, limited, color, etc.)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_special}
                    onChange={(e) => setForm({ ...form, is_special: e.target.checked })}
                  />{" "}
                  Special
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_favorite}
                    onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })}
                  />{" "}
                  Favorite
                </label>
              </div>

              <div>
                <label className="text-sm">Spotify URL (optional)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.spotify_url}
                  onChange={(e) => setForm({ ...form, spotify_url: e.target.value })}
                  placeholder="https://open.spotify.com/album/..."
                />
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-sm">Cover URL</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.cover_url || ""}
                    onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))}
                    placeholder="Will auto-fill if found"
                  />

                  {form.cover_url ? (
                    <div className="mt-2 w-40 h-40 rounded-xl overflow-hidden bg-neutral-200">
                      <img src={form.cover_url} alt="cover" className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                </div>
                <button type="button" className="px-3 py-2 border rounded-xl" onClick={onFetchCover}>
                  Find cover
                </button>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="px-3 py-2 border rounded-xl bg-black text-white">
                  Save
                </button>
                {form.id && (
                  <button
                    type="button"
                    className="px-3 py-2 border rounded-xl text-red-700 border-red-300"
                    onClick={onDelete}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  className="px-3 py-2 border rounded-xl"
                  onClick={() =>
                    setForm({
                      id: "",
                      artist: "",
                      album: "",
                      year: "",
                      quantity: 1,
                      cost_cents: "",
                      format: "LP",
                      notes: "",
                      is_special: false,
                      is_favorite: false,
                      genre: "",
                      spotify_url: "",
                      cover_url: "",
                    })
                  }
                >
                  New
                </button>
              </div>
            </form>
          </div>

          {/* List */}
          <div className="p-4 border rounded-2xl bg-spotify-gray max-h-[70vh] overflow-auto">
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <input
                className="border rounded-xl px-3 py-2 text-sm"
                placeholder="Search records..."
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
              />
              <select
                className="border rounded-xl px-3 py-2 text-sm"
                value={listGenre}
                onChange={(e) => setListGenre(e.target.value)}
              >
                <option value="">All genres</option>
                {adminGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="text-sm text-neutral-500">Loading…</div>
            ) : loadError ? (
              <div className="text-sm text-red-600">Error: {loadError}</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-sm text-neutral-500">No records.</div>
            ) : (
              filteredRecords.map((r) => (
                <button
                  key={r.id}
                  onClick={() =>
                    setForm({
                      id: r.id,
                      artist: r.artist || "",
                      album: r.album || "",
                      year: String(r.year || ""),
                      quantity: r.quantity || 1,
                      cost_cents: r.cost_cents ? String(r.cost_cents) : "",
                      format: r.format || "LP",
                      notes: r.notes || "",
                      is_special: !!r.is_special,
                      is_favorite: !!r.is_favorite,
                      genre: r.genre || "",
                      spotify_url: r.spotify_url || "",
                      cover_url: r.cover_url || "",
                    })
                  }
                  className={`block w-full text-left p-3 rounded-xl border hover:bg-neutral-50 mb-2`}
                >
                  <div className="font-medium">
                    {r.artist} – {r.album}
                  </div>
                  <div className="text-sm text-neutral-600">
                    {(r.year || "")} · Qty {r.quantity}
                    {r.format ? ` · ${r.format}` : ""}
                    {r.genre ? ` · ${r.genre}` : ""}
                    {r.is_special ? " · Special" : ""}
                    {r.is_favorite ? " · Favorite" : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
