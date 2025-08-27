"use client";
import { useEffect, useMemo, useState } from "react";
import { Heart, Star, Search } from "lucide-react";

export default function Catalog({ initialRecords = [] }) {
  // Controls
  const [query, setQuery] = useState("");
  const [showFavs, setShowFavs] = useState(false);
  const [showSpecial, setShowSpecial] = useState(false);
  const [format, setFormat] = useState(""); // LP / EP / 7" / etc
  // sort: 'artist-asc' | 'artist-desc' | 'year-asc' | 'year-desc' | 'recent'
  const [sort, setSort] = useState("artist-asc");

  // Selected large preview card
  const [selected, setSelected] = useState(initialRecords[0] || null);

  // Distinct formats for dropdown
  const formats = useMemo(() => {
    const s = new Set(initialRecords.map((r) => (r.format || "").trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [initialRecords]);

  // Read query params on mount (back-compat with old 'artist'/'year'/'recent')
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQuery(p.get("q") || "");
    const rawSort = p.get("sort") || "artist-asc";
    const normalized =
      rawSort === "artist" ? "artist-asc" :
      rawSort === "year"   ? "year-asc"   :
      ["artist-asc","artist-desc","year-asc","year-desc","recent"].includes(rawSort)
        ? rawSort
        : "artist-asc";
    setSort(normalized);
    setFormat(p.get("format") || "");
    setShowFavs(p.get("favs") === "1");
    setShowSpecial(p.get("special") === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write query params on control changes
  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (sort !== "artist-asc") p.set("sort", sort);
    if (format) p.set("format", format);
    if (showFavs) p.set("favs", "1");
    if (showSpecial) p.set("special", "1");
    const next = `${location.pathname}${p.toString() ? `?${p.toString()}` : ""}`;
    if (next !== `${location.pathname}${location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [query, sort, format, showFavs, showSpecial]);

  // Text search match
  const matchesQuery = (r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.artist || "").toLowerCase().includes(q) ||
      (r.album || "").toLowerCase().includes(q) ||
      String(r.year || "").includes(q) ||
      (r.notes || "").toLowerCase().includes(q)
    );
  };

  // Filtering
  const filtered = useMemo(() => {
    return initialRecords.filter((r) => {
      if (!matchesQuery(r)) return false;
      if (showFavs && !r.is_favorite) return false;
      if (showSpecial && !r.is_special) return false;
      if (format && r.format !== format) return false;
      return true;
    });
  }, [initialRecords, query, showFavs, showSpecial, format]);

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];

    const cmpArtistAsc = (a, b) => {
      const byArtist = (a.artist || "").localeCompare(b.artist || "");
      if (byArtist !== 0) return byArtist;
      return (a.album || "").localeCompare(b.album || "");
    };
    const cmpArtistDesc = (a, b) => -cmpArtistAsc(a, b);

    const keyYearAsc = (v) => (Number.isFinite(+v) ? +v : Infinity);   // missing last
    const keyYearDesc = (v) => (Number.isFinite(+v) ? +v : -Infinity); // missing last on desc

    if (sort === "artist-asc") {
      arr.sort(cmpArtistAsc);
    } else if (sort === "artist-desc") {
      arr.sort(cmpArtistDesc);
    } else if (sort === "year-asc") {
      arr.sort((a, b) => keyYearAsc(a.year) - keyYearAsc(b.year));
    } else if (sort === "year-desc") {
      arr.sort((a, b) => keyYearDesc(b.year) - keyYearDesc(a.year));
    } else if (sort === "recent") {
      const ts = (r) => {
        const a = r.created_at ? new Date(r.created_at).getTime() : 0;
        const b = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return Math.max(a, b);
      };
      arr.sort((a, b) => ts(b) - ts(a)); // newest first
    }

    return arr;
  }, [filtered, sort]);

  // Keep selected item valid as filters/sorts change
  useEffect(() => {
    if (!selected) {
      setSelected(sorted[0] || null);
      return;
    }
    const stillVisible = sorted.find((r) => r.id === selected.id);
    if (!stillVisible) {
      setSelected(sorted[0] || null);
    }
  }, [sorted, selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {/* Left: Large Preview (sticky) */}
      <div className="md:col-span-2 order-2 md:order-1">
        <div className="sticky top-6 h-fit">
          <div className="p-4 border rounded-2xl bg-spotify-gray">
            {selected ? (
              <div className="space-y-3">
                <div className="aspect-square w-full overflow-hidden rounded-2xl bg-neutral-200">
                  {selected.cover_url ? (
                    <img
                      src={selected.cover_url}
                      alt={`${selected.artist} – ${selected.album}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-neutral-500">No Cover</div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">{selected.artist}</h1>
                  <p className="text-lg text-spotify-secondary-gray">
                    {selected.album}
                    {selected.year ? ` · ${selected.year}` : ""}
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    className="underline text-sm"
                    href={`https://open.spotify.com/search/${encodeURIComponent(`${selected.artist} ${selected.album}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Listen on Spotify
                  </a>
                  {selected.spotify_url && (
                    <a className="underline text-sm" href={selected.spotify_url} target="_blank" rel="noreferrer">
                      Direct link
                    </a>
                  )}
                </div>
                {selected.notes && <p className="text-sm text-neutral-600">{selected.notes}</p>}
              </div>
            ) : (
              <div className="h-64 grid place-items-center text-neutral-500">Select a record</div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Controls (sticky) + List (scrollable) */}
      <div className="md:col-span-3 order-1 md:order-2 flex flex-col">
        {/* Controls (stick to top like the preview) */}
        <div className="sticky top-6 z-10">
          <div className="p-3 border rounded-2xl bg-spotify-gray">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              {/* Search */}
              <div className="relative flex-1 justify-center">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                <input
                  placeholder="Search artist, album, year, notes…"
                  className="w-full pl-8 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Sort + Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm">
                  Sort:&nbsp;
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="border px-3 py-2 rounded-xl"
                  >
                    <option value="artist-asc">A–Z (Ascending)</option>
                    <option value="artist-desc">A–Z (Descending)</option>
                    <option value="year-asc">Year (Ascending)</option>
                    <option value="year-desc">Year (Descending)</option>
                    <option value="recent">Recently Added</option>
                  </select>
                </label>

                {/* <label className="text-sm">
                  Format:&nbsp;
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="border px-3 py-2 rounded-xl"
                  >
                    <option value="">All</option>
                    {formats.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label> */}

                <button
                  onClick={() => setShowSpecial((v) => !v)}
                  className={`p-2 rounded-full border ${showSpecial ? "bg-yellow-100 border-yellow-300" : "bg-white"}`}
                  title="Show special"
                  aria-pressed={showSpecial}
                >
                  <Star className={showSpecial ? "fill-yellow-500 text-yellow-500" : "text-neutral-700"} />
                </button>
                <button
                  onClick={() => setShowFavs((v) => !v)}
                  className={`p-2 rounded-full border ${showFavs ? "bg-red-100 border-red-300" : "bg-white"}`}
                  title="Show favorites"
                  aria-pressed={showFavs}
                >
                  <Heart className={showFavs ? "fill-red-500 text-red-500" : "text-neutral-700"} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="mt-4 max-h-[55vh] overflow-y-auto pr-1 bg-main-bg">
          {sorted.length === 0 ? (
            <div className="text-sm text-neutral-500">No matches.</div>
          ) : (
            <div className="space-y-2">
              {sorted.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left p-3 rounded-xl border bg-main-bg hover:bg-neutral-50 hover:text-black ${
                    selected?.id === r.id ? "border-neutral-200" : "border-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
                      {r.cover_url ? <img src={r.cover_url} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {r.artist} – {r.album}
                      </div>
                      <div className="text-sm text-spotify-secondary-gray flex gap-2 flex-wrap">
                        {r.year ? <span>{r.year}</span> : null}
                        <span>Qty: {r.quantity}</span>
                        {r.format ? <span>{r.format}</span> : null}
                        {r.is_special ? (
                          <span className="ml-1 rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs">Special</span>
                        ) : null}
                        {r.is_favorite ? (
                          <span className="ml-1 rounded bg-red-100 text-red-700 px-2 py-0.5 text-xs">Favorite</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
