"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export default function AdminPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
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
      if (s) fetchRecords(); // fetch after login
      else {
        setRecords([]);
        setLoadError("");
      }
    });

    // Initial session + fetch
    (async () => {
      const { data: { session: s } = {} } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s);
      if (s) fetchRecords();
    })();

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function fetchRecords() {
    setLoading(true);
    setLoadError("");
    // If your RLS allows authenticated to read everything, "*" is fine.
    // Otherwise, list the columns you need explicitly:
    // .select("id,artist,album,year,quantity,cost_cents,format,notes,is_special,is_favorite,genre,spotify_url,cover_url,created_at,updated_at")
    const { data, error } = await supabase
      .from("records")
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

  async function onLogin() {
    const email = prompt("Enter your admin email");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/admin" },
    });
    if (error) alert(error.message);
    else alert("Check your email for the sign-in link.");
  }

  async function onLogout() {
    await supabase.auth.signOut();
    // clear local UI
    setRecords([]);
    setForm((f) => ({ ...f, id: "" }));
  }

  async function onFetchCover() {
    const artist = form.artist?.trim();
    const album = form.album?.trim();
    if (!artist || !album) {
      alert("Please enter Artist and Album first.");
      return;
    }
    try {
      const res = await fetch(`/api/cover?artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`);
      const { image } = await res.json();
      if (image) setForm((f) => ({ ...f, cover_url: image }));
      else alert("No cover art found for that artist/album.");
    } catch (e) {
      console.error(e);
      alert("Cover lookup failed. Try again.");
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
      const { error } = await supabase.from("records").update(payload).eq("id", form.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from("records").insert(payload);
      if (error) return alert(error.message);
    }
    await fetchRecords();
    alert("Saved");
  }

  async function onDelete() {
    if (!form.id) return;
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from("records").delete().eq("id", form.id);
    if (error) return alert(error.message);
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
    alert("Deleted");
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
        <p className="text-sm text-neutral-600">
          Sign in with your admin email to manage records.
        </p>
      )}

      {isAuthed && (
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
            {loading ? (
              <div className="text-sm text-neutral-500">Loading…</div>
            ) : loadError ? (
              <div className="text-sm text-red-600">Error: {loadError}</div>
            ) : records.length === 0 ? (
              <div className="text-sm text-neutral-500">No records.</div>
            ) : (
              records.map((r) => (
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
      )}
    </div>
  );
}
