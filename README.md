# Vinyl Vault

A personal vinyl record catalog built with **Next.js (App Router, JavaScript only)** and **Supabase**. Public visitors can browse and search; a protected **admin portal** lets you add/edit/delete records. Private fields like **cost** stay hidden from the public via row‑level security (RLS) and column grants.

---

## ✨ Features

* 🔎 **Search + list view** with large cover preview
* ❤️ **Favorites** toggle & ⭐ **Special** (signed / limited / colored vinyl, etc.)
* 🧾 Fields: **artist, album, year, quantity, notes, format, favorite, special, cover\_url, spotify\_url**
* 🏷️ **Cost (private)** — visible only to authenticated admins
* 🖼️ **Auto‑fetch album art** via MusicBrainz + Cover Art Archive (no API key)
* 🎧 **Spotify** link (direct or search) from the record card
* 🔐 **Admin portal** with email magic‑link authentication
* 📦 JavaScript‑only stack: Next.js + Tailwind + `@supabase/supabase-js`
* 🚀 Deployable to **Vercel** in minutes

---

## 🧱 Tech Stack

* **Frontend**: Next.js 14 (App Router), JavaScript, TailwindCSS, lucide-react
* **Backend/DB**: Supabase (Postgres, Auth, RLS)
* **Integrations**: MusicBrainz + Cover Art Archive; optional Spotify album URLs

---

## ⚡ Quick Start

### 1) Prerequisites

* Node.js ≥ 18
* Supabase account & project
* (Optional) Vercel account for deployment

### 2) Create the app (JavaScript)

```bash
npx create-next-app@latest vinyl-vault \
  --eslint --tailwind --src-dir --app --import-alias "@/*"
cd vinyl-vault
npm install lucide-react @supabase/supabase-js
```

### 3) Environment variables

Create `.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
ADMIN_EMAILS=you@example.com
```

### 4) Supabase schema & security

Open **Supabase → SQL Editor** and run:

```sql
-- TABLES
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  artist text not null,
  album text not null,
  year int,
  quantity int not null default 1,
  cost_cents int,                -- PRIVATE (admins only)
  format text default 'LP',
  notes text,
  is_special boolean default false,
  is_favorite boolean default false,
  cover_url text,
  spotify_url text,
  musicbrainz_release_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
create or replace trigger trg_set_updated_at
before update on public.records for each row execute function public.set_updated_at();

create table if not exists public.admins (
  email text primary key
);

-- RLS
alter table public.records enable row level security;

create policy "anon can read records" on public.records
  for select using ( auth.role() = 'anon' );

create policy "admins can read/write" on public.records
  for all using (
    exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email')
  ) with check (
    exists (select 1 from public.admins a where a.email = auth.jwt() ->> 'email')
  );

-- COLUMN PRIVILEGES
revoke all on table public.records from anon, authenticated;

-- Public can read non‑private columns
grant select (id, artist, album, year, quantity, format, notes, is_special, is_favorite,
              cover_url, spotify_url, musicbrainz_release_id, created_at, updated_at)
  on public.records to anon;

-- Authenticated can read all columns (RLS still restricts to admins for writes)
grant select (id, artist, album, year, quantity, format, notes, is_special, is_favorite,
              cover_url, spotify_url, musicbrainz_release_id, created_at, updated_at, cost_cents)
  on public.records to authenticated;

grant insert, update, delete on public.records to authenticated;

-- Add yourself as admin
insert into public.admins (email) values ('you@example.com') on conflict do nothing;
```

**Auth Redirects:** In Supabase → Authentication → URL Configuration, add:

* `http://localhost:3000/admin`
* (Later) your production domain: `https://YOURDOMAIN.com/admin`

### 5) File structure (key parts)

```
src/
  app/
    api/
      cover/route.js        # Server route to fetch cover art via MusicBrainz/CAA
    admin/page.jsx          # Admin portal (magic-link login + CRUD)
    layout.js               # Root layout
    page.js                 # Public catalog page (server fetch from Supabase)
  components/
    catalog.jsx             # Search, list, large preview
  lib/
    supabase.js             # Supabase browser client
  app/globals.css           # Tailwind
```

> The repository includes complete code for each file above.

### 6) Run locally

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** for the catalog and **/admin** to sign in with your admin email.

---

## 🧩 How it works

### Public catalog

* `/` loads records from Supabase REST using the **anon** key (RLS limits data).
* The UI provides free‑text search across artist/album/year/notes, a favorites filter, and a large cover preview card.
* Spotify link is either the stored `spotify_url` or a generated search link.

### Admin portal

* `/admin` uses Supabase email **magic‑link** auth.
* Only emails in `public.admins` pass RLS for writes.
* Create, edit, or delete records; optional **Find cover** button hits `/api/cover` server route to fetch art from MusicBrainz/CAA.

### Cover art API

`GET /api/cover?artist=...&album=...`

* Finds a MusicBrainz **release-group** for the query, then looks up the **front** image from Cover Art Archive.
* Returns `{ image: string | null }`.

### Data model

| Column                   | Type        | Notes                                                                               |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| id                       | uuid        | primary key                                                                         |
| artist                   | text        | required                                                                            |
| album                    | text        | required                                                                            |
| year                     | int         | optional                                                                            |
| quantity                 | int         | default 1                                                                           |
| cost\_cents              | int         | **private**; readable to authenticated role only; write restricted by RLS to admins |
| format                   | text        | e.g., LP/EP/7"/12"                                                                  |
| notes                    | text        | signed/limited/color/etc.                                                           |
| is\_special              | boolean     | badge in UI                                                                         |
| is\_favorite             | boolean     | badge + favorites filter                                                            |
| cover\_url               | text        | fetched via API or pasted manually                                                  |
| spotify\_url             | text        | optional direct album link                                                          |
| musicbrainz\_release\_id | text        | optional cache                                                                      |
| created\_at/updated\_at  | timestamptz | timestamps                                                                          |

---

## 🚀 Deploy

**Vercel**

1. Push to GitHub.
2. Import repo in Vercel.
3. Add env vars in Vercel:

   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Set Supabase Auth redirect for your production domain.
5. Deploy.

---

## 🔐 Security & privacy notes

* Public pages use the **anon** key and are limited by **RLS** and **column grants**. `cost_cents` is not exposed to anonymous users.
* Admin actions occur under the **authenticated** role, but **RLS** still checks membership in `public.admins` for write access.
* Never expose a **service‑role** key to the browser.

---

## 🧪 Manual test checklist

* [ ] Browse/search works logged-out; cost never appears
* [ ] Email magic-link login works for an allowlisted admin
* [ ] Admin can add/edit/delete records
* [ ] Cover art fetch returns an image for common releases
* [ ] RLS blocks writes for non-admin accounts

---

## 🗺️ Roadmap (optional)

* Sorting (artist A–Z, year, recently added)
* Filters (format, special, favorites)
* CSV import/export
* Supabase Storage for hosting images
* Spotify Web API integration to store canonical album links

---

## 📄 License

MIT — do as you wish, attribution appreciated.
