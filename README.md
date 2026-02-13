# Portal-Migration Tracking

React-basiertes Tracking-Tool für die Mandanten-Portal-Migration. Daten werden in Supabase (PostgreSQL) persistiert.

## Features

- Mandanten mit Aktenzeichen, Batch und Status erfassen
- Fortschritt über alle Prozessschritte tracken (Portal, E-Mail, Docs, Reminder, Tel.)
- Dashboard mit Live-Counters
- CSV-Export
- Tailwind CSS Styling
- Supabase-Backend mit Echtzeit-Sync
- Offline-Fallback via localStorage

## Setup

### 1. Supabase-Projekt einrichten

1. Erstelle ein Projekt auf [supabase.com](https://supabase.com)
2. Gehe zu **SQL Editor** und führe folgendes SQL aus:

```sql
-- Tabelle erstellen
create table tracker_rows (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  az text default '',
  name text default '',
  typ text default '',
  batch text default '',
  monat text default '',
  rate text default '',
  portal text default '',
  datum_portal text default '',
  email text default '',
  datum_email text default '',
  docs text default '',
  reminder text default '',
  datum_reminder text default '',
  tel text default '',
  status text default 'Offen',
  bemerkung text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security aktivieren (Anon-Key darf alles – internes Tool)
alter table tracker_rows enable row level security;

create policy "Allow all for anon" on tracker_rows
  for all
  using (true)
  with check (true);
```

3. Kopiere **Project URL** und **Anon Key** aus den Supabase-Projekteinstellungen (Settings → API)

### 2. Umgebungsvariablen setzen

Erstelle eine `.env.local` Datei im Projektroot:

```
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### 3. Starten

```bash
npm install
npm run dev
```

## Build & Deploy (Vercel)

```bash
npm run build
```

Für Vercel-Deployment:
1. Repo mit Vercel verbinden
2. In Vercel → Settings → Environment Variables die beiden Variablen setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy

## Tech Stack

- React 19 + Vite
- Tailwind CSS 4
- Supabase (PostgreSQL)
