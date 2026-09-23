"use client";
import {useEffect, useMemo, useState} from "react";
import Image from "next/image";
import {Heart, Star, Search} from "lucide-react";

function normalizeCoverUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const url = new URL(rawUrl);
    if (url.hostname === "coverartarchive.org" && url.protocol === "http:") {
      url.protocol = "https:";
    }
    return url.toString();
  } catch {
    return null;
  }
}

export default function Catalog({initialRecords = [], initialControls = {}}) {

  // Controls
  const [query, setQuery] = useState(() => initialControls.q || "");
  const [showFavs, setShowFavs] = useState(() => initialControls.favs === true);
  const [showSpecial, setShowSpecial] = useState(() => initialControls.special === true);
  const [format, setFormat] = useState(() => initialControls.format || ""); // LP / EP / 7" / etc
  const [genre, setGenre] = useState(() => initialControls.genre || "");
  const [sort, setSort] = useState(() => {
    const rawSort = initialControls.sort || "artist-asc";
    if (rawSort === "artist") return "artist-asc";
    if (rawSort === "year") return "year-asc";
    return ["artist-asc", "artist-desc", "year-asc", "year-desc", "recent"].includes(rawSort)
      ? rawSort
      : "artist-asc";
  });

  // Selected large preview card
  const [selectedId, setSelectedId] = useState(() => initialRecords[0]?.id || null);
  const [brokenCoverIds, setBrokenCoverIds] = useState(() => new Set());
  const [recoveredCoverUrls, setRecoveredCoverUrls] = useState(() => new Map());
  const [coverRecoveryTriedIds, setCoverRecoveryTriedIds] = useState(() => new Set());

  const markCoverBroken = (id) => {
    if (!id) return;
    setBrokenCoverIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const markCoverRecovered = (id, url) => {
    if (!id || !url) return;
    setRecoveredCoverUrls((prev) => {
      const next = new Map(prev);
      next.set(id, url);
      return next;
    });
    setBrokenCoverIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const getRecordCoverUrl = (record) => {
    if (!record?.id) return null;
    return recoveredCoverUrls.get(record.id) || normalizeCoverUrl(record.cover_url);
  };

  const recoverCoverUrl = async (record) => {
    const id = record?.id;
    if (!id) return;

    let shouldTry = false;
    setCoverRecoveryTriedIds((prev) => {
      if (prev.has(id)) return prev;
      shouldTry = true;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (!shouldTry) return;

    const artist = (record.artist || "").trim();
    const album = (record.album || "").trim();
    if (!artist || !album) return;

    try {
      const p = new URLSearchParams({artist, album});
      const res = await fetch(`/api/cover?${p.toString()}`);
      if (!res.ok) return;
      const body = await res.json().catch(() => null);
      const candidate = normalizeCoverUrl(body?.image);
      if (candidate) {
        markCoverRecovered(id, candidate);
      }
    } catch {
      // Keep existing fallback behavior when cover lookup fails.
    }
  };

  const handleCoverError = (record) => {
    markCoverBroken(record?.id);
    void recoverCoverUrl(record);
  };

  // Distinct formats for dropdown (kept if you want to re-enable later)
  const formats = useMemo(() => {
    const s = new Set(initialRecords.map((r) => (r.format || "").trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [initialRecords]);

  const genres = useMemo(() => {
    const s = new Set(initialRecords.map((r) => (r.genre || "").trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [initialRecords]);

  // Write query params on control changes
  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (sort !== "artist-asc") p.set("sort", sort);
    if (format) p.set("format", format);
    if (genre) p.set("genre", genre);
    if (showFavs) p.set("favs", "1");
    if (showSpecial) p.set("special", "1");
    const next = `${location.pathname}${p.toString() ? `?${p.toString()}` : ""}`;
    if (next !== `${location.pathname}${location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [query, sort, format, genre, showFavs, showSpecial]);

  // Filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRecords.filter((r) => {
      if (q) {
        const queryMatch =
          (r.artist || "").toLowerCase().includes(q) ||
          (r.album || "").toLowerCase().includes(q) ||
          String(r.year || "").includes(q) ||
          (r.notes || "").toLowerCase().includes(q);
        if (!queryMatch) return false;
      }
      if (showFavs && !r.is_favorite) return false;
      if (showSpecial && !r.is_special) return false;
      if (format && r.format !== format) return false;
      if (genre && (r.genre || "") !== genre) return false;
      return true;
    });
  }, [initialRecords, query, showFavs, showSpecial, format, genre]);

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];

    const cmpArtistAsc = (a, b) => {
      const byArtist = (a.artist || "").localeCompare(b.artist || "");
      if (byArtist !== 0) return byArtist;
      return (a.album || "").localeCompare(b.album || "");
    };
    const cmpArtistDesc = (a, b) => -cmpArtistAsc(a, b);

    const keyYearAsc = (v) => (Number.isFinite(+v) ? +v : Infinity);
    const keyYearDesc = (v) => (Number.isFinite(+v) ? +v : -Infinity);

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
      arr.sort((a, b) => ts(b) - ts(a));
    }

    return arr;
  }, [filtered, sort]);

  const selected = useMemo(() => {
    return sorted.find((r) => r.id === selectedId) || sorted[0] || null;
  }, [sorted, selectedId]);

  const selectedCoverUrl = selected ? getRecordCoverUrl(selected) : null;
  const selectedCoverBroken = !!selected?.id && brokenCoverIds.has(selected.id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
      {/* Left: Large Preview (only sticky on md+) */}
      <div className="md:col-span-2 order-1 md:order-1">
        <div className="md:sticky md:top-6 md:h-fit">
          <div className="p-3 md:p-4 border rounded-2xl bg-spotify-gray">
            {selected ? (
              <div className="space-y-3">
                <div className="aspect-square w-full overflow-hidden rounded-2xl bg-neutral-200">
                  {selectedCoverUrl && !selectedCoverBroken ? (
                    <Image
                      src={selectedCoverUrl}
                      alt={`${selected.artist} – ${selected.album}`}
                      width={800}
                      height={800}
                      className="w-full h-full object-cover"
                      priority
                      onError={() => handleCoverError(selected)}
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-neutral-500">No Cover</div>
                  )}
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold break-words">{selected.artist}</h1>
                  <p className="text-base md:text-lg text-spotify-secondary-gray">
                    {selected.album}
                    {selected.year ? ` · ${selected.year}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    className="underline text-sm md:text-base"
                    href={`https://open.spotify.com/search/${encodeURIComponent(
                      `${selected.artist} ${selected.album}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Listen on Spotify
                  </a>
                  {selected.spotify_url && (
                    <a
                      className="underline text-sm md:text-base"
                      href={selected.spotify_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Direct link
                    </a>
                  )}
                </div>
                {selected.notes && (
                  <p className="text-sm md:text-base text-neutral-600 whitespace-pre-wrap break-words">
                    {selected.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="h-48 md:h-64 grid place-items-center text-neutral-500">Select a record</div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Controls + List */}
      <div className="md:col-span-3 order-2 md:order-2 flex flex-col">
        {/* Controls (sticky only on md+) */}
        <div className="md:sticky md:top-6 md:z-10">
          <div className="p-3 border rounded-2xl bg-spotify-gray">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  placeholder="Search artist, album, year, notes…"
                  className="w-full pl-10 pr-10 py-3 md:py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 text-base md:text-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  inputMode="search"
                />
                {!!query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm text-neutral-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sort + Filters */}
              <div className="flex items-center gap-2 w-full md:w-auto md:flex-nowrap">
                <label className="w-full md:w-[190px]">
                  <span className="sr-only">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full border px-3 py-2 rounded-xl text-sm bg-white text-neutral-900"
                    aria-label="Sort records"
                  >
                    <option value="artist-asc">A-Z (Asc)</option>
                    <option value="artist-desc">A-Z (Desc)</option>
                    <option value="year-asc">Year (Asc)</option>
                    <option value="year-desc">Year (Desc)</option>
                    <option value="recent">Recently Added</option>
                  </select>
                </label>

                {genres.length > 0 ? (
                  <label className="w-full md:w-[170px]">
                    <span className="sr-only">Genre</span>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full border px-3 py-2 rounded-xl text-sm bg-white text-neutral-900"
                      aria-label="Filter by genre"
                    >
                      <option value="">All Genres</option>
                      {genres.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {/* Compact icon buttons on mobile; pill buttons on md+ */}
                <button
                  onClick={() => setShowSpecial((v) => !v)}
                  title="Show special"
                  aria-pressed={showSpecial}
                  className={[
                    "shrink-0 transition-colors border rounded-full",
                    "h-10 w-10 grid place-items-center",
                    "md:h-9 md:w-auto md:px-3",
                    showSpecial ? "bg-yellow-100 border-yellow-300" : "bg-white",
                  ].join(" ")}
                >
                  <Star className={showSpecial ? "fill-yellow-500 text-yellow-500" : "text-neutral-700"} />
                  {/* Optional text on md+: <span className="hidden md:inline ml-2">Special</span> */}
                </button>

                <button
                  onClick={() => setShowFavs((v) => !v)}
                  title="Show favorites"
                  aria-pressed={showFavs}
                  className={[
                    "shrink-0 transition-colors border rounded-full",
                    "h-10 w-10 grid place-items-center",
                    "md:h-9 md:w-auto md:px-3",
                    showFavs ? "bg-red-100 border-red-300" : "bg-white",
                  ].join(" ")}
                >
                  <Heart className={showFavs ? "fill-red-500 text-red-500" : "text-neutral-700"} />
                  {/* Optional text on md+: <span className="hidden md:inline ml-2">Favorites</span> */}
                </button>
                
              </div>
            </div>
          </div>
        </div>

        {/* List: natural page scroll on mobile; scroll pane only on md+ */}
        <div className="mt-4 md:max-h-[60vh] md:overflow-y-auto md:pr-1 bg-main-bg" role="list">
          {sorted.length === 0 ? (
            <div className="text-sm text-neutral-500">No matches.</div>
          ) : (
            <div className="space-y-2">
              {sorted.map((r) => {
                const recordCoverUrl = getRecordCoverUrl(r);
                return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  role="listitem"
                  className={`w-full text-left p-3 md:p-3.5 rounded-xl border bg-main-bg hover:bg-neutral-50 hover:text-black active:bg-neutral-100 min-h-16
                    ${selected?.id === r.id ? "border-neutral-200" : "border-neutral-800"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 md:w-14 md:h-14 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
                      {recordCoverUrl && !brokenCoverIds.has(r.id) ? (
                        <Image
                          src={recordCoverUrl}
                          alt=""
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          onError={() => handleCoverError(r)}
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
