# Data Model

**Date:** 2026-07-18  
**Store:** Postgres (Supabase) canonical · SQLite client cache subset

---

## 1. Entity overview

- `public_figures`  
- `sources`  
- `cards`  
- `decks` / `deck_cards`  
- `editorial_reviews`  
- `game_sessions` / `players` / `teams` / `answers` / `scores` (mostly client; optional sync)  
- `reports`  
- `custom_decks` (Phase 3)  
- `user_accounts` / `entitlements` (Phase 2)  

---

## 2. Recommended relational schema (Postgres)

```sql
-- roles
create type user_role as enum ('player', 'editor', 'moderator', 'admin');
create type authenticity as enum ('authentic', 'fabricated');
create type verification_status as enum ('unverified', 'verified', 'disputed', 'removed');
create type sensitivity as enum ('everyone', 'teen', 'mature');
create type report_status as enum ('open', 'triaging', 'resolved', 'rejected');
create type input_method as enum ('tilt', 'tap', 'swipe', 'unknown');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role user_role not null default 'player',
  created_at timestamptz not null default now()
);

create table public_figures (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  handle text,
  known_for text,
  locale text default 'en',
  region text,
  likeness_allowed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  platform text, -- 'x','instagram','speech','interview','book','other','none'
  source_url text,
  source_post_id text,
  published_at timestamptz,
  snapshot_storage_path text, -- optional internal evidence, not shipped lightly
  rights_status text not null default 'unknown', -- unknown|licensed|public_domain|fair_use_claim|original
  license_notes text,
  created_at timestamptz not null default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  public_figure_id uuid not null references public_figures(id),
  statement_text text not null,
  authenticity authenticity not null,
  source_id uuid references sources(id),
  verification_status verification_status not null default 'unverified',
  verification_method text,
  category text,
  difficulty int not null check (difficulty between 1 and 5),
  sensitivity sensitivity not null default 'everyone',
  locale text not null default 'en',
  region text,
  explanation text,
  fact_check_notes text,
  decoy_method text, -- human|ai_assisted|none
  moderation_flags jsonb not null default '[]',
  removal_status text not null default 'active', -- active|removed|hidden
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table decks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  sensitivity sensitivity not null default 'everyone',
  is_published boolean not null default false,
  content_version text not null, -- semver
  package_path text,
  package_checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table deck_cards (
  deck_id uuid references decks(id) on delete cascade,
  card_id uuid references cards(id) on delete cascade,
  sort_order int,
  primary key (deck_id, card_id)
);

create table editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  reviewer_id uuid references profiles(id),
  decision text not null, -- approve|reject|needs_work
  notes text,
  created_at timestamptz not null default now()
);

create table card_tombstones (
  card_id uuid primary key,
  reason text,
  removed_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id),
  deck_id uuid references decks(id),
  device_id text,
  user_id uuid references profiles(id),
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolver_id uuid references profiles(id)
);

create table entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  sku text not null,
  source text not null, -- app_store|play|promo
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table custom_decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  title text not null,
  visibility text not null default 'private',
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Optional synced sessions (Phase 2+)
create table game_sessions (
  id uuid primary key,
  device_id text,
  user_id uuid,
  mode text not null,
  deck_id uuid,
  deck_version text,
  started_at timestamptz,
  ended_at timestamptz,
  summary jsonb
);
```

---

## 3. Client SQLite subset

Tables: `decks_local`, `cards_local`, `tombstones`, `settings`, `local_players`, `local_sessions`, `local_answers`, `outbox_reports`.

Do **not** store admin-only `fact_check_notes` or source snapshots on device unless required.

---

## 4. Card payload shipped to clients (package JSON)

```json
{
  "deckId": "uuid",
  "contentVersion": "1.2.0",
  "cards": [
    {
      "id": "uuid",
      "figureId": "uuid",
      "displayName": "Ava Example",
      "statementText": "...",
      "authenticity": "fabricated",
      "difficulty": 2,
      "sensitivity": "everyone",
      "explanation": "Written for the game; not a real post.",
      "sourceUrl": null,
      "category": "music"
    }
  ],
  "tombstones": []
}
```

Omit handles/profile images in MVP packages.
