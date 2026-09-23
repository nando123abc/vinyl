import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const backupPath = path.join(root, 'backup.sql');
const outPath = path.join(root, 'restore_public_records.sql');

const sql = fs.readFileSync(backupPath, 'utf8');

function extractCopyBlock(tableName) {
  const re = new RegExp(
    `COPY public\\.${tableName} \\(([^)]*)\\) FROM stdin;\\n([\\s\\S]*?)\\n\\\\\\.`,
    'm'
  );
  const m = sql.match(re);
  if (!m) {
    throw new Error(`Could not find COPY block for public.${tableName}`);
  }
  const columns = m[1].split(',').map((s) => s.trim());
  const body = m[2].trim();
  const rows = body ? body.split('\n') : [];
  return { columns, rows };
}

function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function fieldToSql(column, raw) {
  if (raw === '\\N') return 'NULL';

  if (column === 'is_special' || column === 'is_favorite') {
    if (raw === 't') return 'TRUE';
    if (raw === 'f') return 'FALSE';
  }

  if (column === 'year' || column === 'quantity' || column === 'cost_cents') {
    if (raw === '') return 'NULL';
    return String(Number(raw));
  }

  return sqlString(raw);
}

function copyToInsert(tableName) {
  const { columns, rows } = extractCopyBlock(tableName);
  const valuesSql = rows
    .map((line) => {
      const fields = line.split('\t');
      if (fields.length !== columns.length) {
        throw new Error(
          `Column mismatch for ${tableName}. Expected ${columns.length}, got ${fields.length}`
        );
      }
      const converted = fields.map((raw, i) => fieldToSql(columns[i], raw));
      return `(${converted.join(', ')})`;
    })
    .join(',\n');

  return `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES\n${valuesSql}\nON CONFLICT DO NOTHING;`;
}

const adminsInsert = copyToInsert('admins');
const recordsInsert = copyToInsert('records');

const output = `-- Generated from backup.sql
-- Restores only app-relevant public tables and data.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.admins (
  email text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist text NOT NULL,
  album text NOT NULL,
  year integer,
  quantity integer NOT NULL DEFAULT 1,
  cost_cents integer,
  format text DEFAULT 'LP',
  notes text,
  is_special boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  cover_url text,
  spotify_url text,
  musicbrainz_release_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  genre text
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.records;
DROP TRIGGER IF EXISTS set_updated_at ON public.records;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.records
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

TRUNCATE TABLE public.records, public.admins;

${adminsInsert}

${recordsInsert}

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can read/write" ON public.records;
DROP POLICY IF EXISTS "anon can read records" ON public.records;
DROP POLICY IF EXISTS admin_delete_records ON public.records;
DROP POLICY IF EXISTS admin_insert_records ON public.records;
DROP POLICY IF EXISTS admin_update_records ON public.records;
DROP POLICY IF EXISTS anon_read_records ON public.records;
DROP POLICY IF EXISTS auth_read_records ON public.records;

CREATE POLICY "anon can read records"
ON public.records
FOR SELECT
USING (auth.role() = 'anon');

CREATE POLICY "admins can read/write"
ON public.records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.email = auth.jwt() ->> 'email'
  )
);

REVOKE ALL ON TABLE public.records FROM anon, authenticated;
GRANT SELECT (id, artist, album, year, quantity, format, notes, is_special, is_favorite, cover_url, spotify_url, musicbrainz_release_id, created_at, updated_at, genre)
ON public.records TO anon;
GRANT SELECT (id, artist, album, year, quantity, format, notes, is_special, is_favorite, cover_url, spotify_url, musicbrainz_release_id, created_at, updated_at, cost_cents, genre)
ON public.records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.records TO authenticated;
GRANT ALL ON TABLE public.records TO service_role;
GRANT ALL ON TABLE public.admins TO service_role;

COMMIT;
`;

fs.writeFileSync(outPath, output, 'utf8');
console.log(`Wrote ${outPath}`);
