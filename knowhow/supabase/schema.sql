-- KNOWHOW database schema (Supabase / Postgres).
-- Apply in the Supabase SQL editor, then load the catalog with:
--   npm run db:seed-sql > supabase/seed.sql   (and run seed.sql)
-- The app server uses the service-role key; RLS below protects direct client access.

-- ───────────────────────────── Catalog
create table if not exists categories (
  id text primary key,
  label text not null,
  blurb text not null,
  color text not null,
  color2 text not null,
  deep text not null,
  glyph text not null
);

create table if not exists topics (
  id text primary key,
  label text not null,
  category_id text not null references categories(id),
  parent_id text references topics(id)
);

create table if not exists topic_relationships (
  from_topic text not null references topics(id),
  to_topic text not null references topics(id),
  kind text not null default 'related' check (kind in ('related', 'parent')),
  primary key (from_topic, to_topic, kind)
);

create table if not exists series (
  slug text primary key,
  title text not null,
  tagline text not null,
  description text not null,
  hook text not null,
  category_id text not null references categories(id),
  creator jsonb not null,
  rating numeric(2,1) not null default 0,
  rating_count int not null default 0,
  free_episodes int not null default 1,
  art jsonb not null,
  trending int,
  format text not null check (format in ('quick', 'deep')),
  release_note text,
  card_fact text not null
);

create table if not exists episodes (
  id text primary key,
  series_slug text not null references series(slug) on delete cascade,
  n int not null,
  title text not null,
  description text not null,
  minutes int not null,
  duration_seconds numeric,
  status text not null check (status in ('released', 'upcoming')),
  has_audio boolean not null default false,
  audio_path text,
  topics text[] not null default '{}',
  unique (series_slug, n)
);

-- ───────────────────────────── Users
create table if not exists profiles (
  id text primary key,                         -- 'sb_<auth uid>' or 'g_<guest id>'
  auth_user_id uuid references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  email text,
  avatar_hue int not null default 0,
  created_at timestamptz not null default now(),
  onboarded boolean not null default false,
  interests text[] not null default '{}',
  learn_style text not null default 'mix' check (learn_style in ('quick', 'deep', 'mix')),
  bio text not null default '',
  is_public boolean not null default true,
  xp int not null default 0,
  explored_categories text[] not null default '{}',
  completed_series text[] not null default '{}',
  listening_hours int[] not null default array_fill(0, array[24]),
  ai_month text not null default '',
  ai_count int not null default 0
);

create table if not exists streaks (
  user_id text primary key references profiles(id) on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  last_day date
);

create table if not exists listening_progress (
  user_id text not null references profiles(id) on delete cascade,
  episode_id text not null,                    -- catalog episode id or ai_<series>-<n>
  position numeric not null default 0,
  duration numeric not null,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  listened numeric not null default 0,
  primary key (user_id, episode_id)
);

create table if not exists listening_days (
  user_id text not null references profiles(id) on delete cascade,
  day date not null,
  seconds int not null default 0,
  primary key (user_id, day)
);

create table if not exists series_follows (
  user_id text not null references profiles(id) on delete cascade,
  series_slug text not null,
  primary key (user_id, series_slug)
);

create table if not exists series_favourites (
  user_id text not null references profiles(id) on delete cascade,
  series_slug text not null,
  primary key (user_id, series_slug)
);

create table if not exists saved_insights (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  episode_id text not null,
  text text not null,
  saved_at timestamptz not null default now()
);

create table if not exists knowledge_cards (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  card_key text not null,                      -- series:<slug> | category:<id> | milestone key
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  unlocked_at timestamptz not null default now(),
  unique (user_id, card_key)
);

-- XP events (finishing episodes, completing series, recall challenges, exploring, streaks)
create table if not exists achievements (
  user_id text not null references profiles(id) on delete cascade,
  at timestamptz not null,
  amount int not null,
  reason text not null,
  primary key (user_id, at, reason)
);

create table if not exists challenge_attempts (
  user_id text not null references profiles(id) on delete cascade,
  episode_id text not null,
  correct boolean not null,
  first_try boolean not null,
  attempts int not null default 1,
  answered_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

-- ───────────────────────────── Collections
create table if not exists collections (
  id text primary key,
  owner_id text not null,                      -- profile id, or 'editorial'
  owner_handle text not null,
  owner_name text not null,
  title text not null,
  description text not null default '',
  series_slugs text[] not null default '{}',
  is_public boolean not null default true,
  editorial boolean not null default false,
  followers int not null default 0,
  palette text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists collection_follows (
  user_id text not null references profiles(id) on delete cascade,
  collection_id text not null,
  primary key (user_id, collection_id)
);

-- ───────────────────────────── Money
create table if not exists credit_balances (
  user_id text primary key references profiles(id) on delete cascade,
  credits int not null default 0 check (credits >= 0)
);

create table if not exists credit_transactions (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in ('credit_purchase', 'credit_spend', 'subscription', 'subscription_cancel', 'bonus')),
  credits int not null default 0,
  amount_pence int,
  description text not null,
  provider text not null check (provider in ('simulated', 'stripe', 'system'))
);

create table if not exists episode_unlocks (
  user_id text not null references profiles(id) on delete cascade,
  episode_id text not null,
  primary key (user_id, episode_id)
);

create table if not exists subscriptions (
  user_id text primary key references profiles(id) on delete cascade,
  status text not null default 'none' check (status in ('none', 'active', 'canceled')),
  plan text,
  provider text,
  renews_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text
);

-- ───────────────────────────── AI generation
create table if not exists ai_series (
  id text primary key,
  owner_id text not null references profiles(id) on delete cascade,
  prompt text not null,
  mode text not null check (mode in ('live', 'demo')),
  title text not null,
  category text not null,
  created_at timestamptz not null default now(),
  data jsonb not null                          -- full series incl. scripts and transcript timings
);

create table if not exists ai_series_library (
  user_id text not null references profiles(id) on delete cascade,
  ai_series_id text not null references ai_series(id) on delete cascade,
  primary key (user_id, ai_series_id)
);

create table if not exists ai_generation_jobs (
  id text primary key,
  owner_id text not null references profiles(id) on delete cascade,
  prompt text not null,
  mode text not null,
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  steps jsonb not null,
  series_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listening_progress_updated on listening_progress (user_id, updated_at desc);
create index if not exists collections_public on collections (is_public) where is_public;
create index if not exists ai_jobs_owner on ai_generation_jobs (owner_id, created_at desc);

-- Narrated audio for AI series
insert into storage.buckets (id, name, public) values ('ai-audio', 'ai-audio', false) on conflict do nothing;

-- ───────────────────────────── Row level security
-- Catalog is world-readable. User data is readable/writable only by its owner when
-- accessed with a user JWT; the KNOWHOW server uses the service role (bypasses RLS)
-- and performs its own entitlement checks.
alter table categories enable row level security;
alter table topics enable row level security;
alter table topic_relationships enable row level security;
alter table series enable row level security;
alter table episodes enable row level security;
create policy "catalog read" on categories for select using (true);
create policy "catalog read" on topics for select using (true);
create policy "catalog read" on topic_relationships for select using (true);
create policy "catalog read" on series for select using (true);
create policy "catalog read" on episodes for select using (true);

do $$
declare t text;
begin
  foreach t in array array['streaks','listening_progress','listening_days','series_follows','series_favourites','saved_insights',
    'knowledge_cards','achievements','challenge_attempts','collection_follows','credit_balances','credit_transactions',
    'episode_unlocks','subscriptions','ai_series_library'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy "owner read" on %I for select using (user_id = 'sb_' || replace(auth.uid()::text, '-', ''))$p$, t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "public profiles" on profiles for select using (is_public or id = 'sb_' || replace(auth.uid()::text, '-', ''));
alter table collections enable row level security;
create policy "public collections" on collections for select using (is_public or owner_id = 'sb_' || replace(auth.uid()::text, '-', ''));
alter table ai_series enable row level security;
create policy "owner read" on ai_series for select using (owner_id = 'sb_' || replace(auth.uid()::text, '-', ''));
alter table ai_generation_jobs enable row level security;
create policy "owner read" on ai_generation_jobs for select using (owner_id = 'sb_' || replace(auth.uid()::text, '-', ''));
-- Writes (credits, unlocks, subscriptions, XP) are server-only: no insert/update policies for clients.
