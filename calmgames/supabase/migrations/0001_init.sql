-- Calm AI Game Studio schema. Apply with `supabase db push` or paste into the SQL editor.
-- Each table keeps its record in a jsonb `data` column plus the keys we query on.
-- The studio connects with the service-role key from the server only; RLS is
-- enabled with no policies so the anon key can read nothing.

create table if not exists games (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game_versions (
  game_id text not null references games(id) on delete cascade,
  number int not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (game_id, number)
);

create table if not exists thumbnails (
  game_id text primary key references games(id) on delete cascade,
  png_base64 text not null
);

create table if not exists jobs (
  id text primary key,
  status text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_created_idx on jobs (created_at desc);

create table if not exists play_events (
  id text primary key,
  game_id text not null,
  data jsonb not null,
  at timestamptz not null default now()
);
create index if not exists play_events_game_idx on play_events (game_id, at);

create table if not exists usage (
  id text primary key,
  data jsonb not null,
  at timestamptz not null default now()
);

create table if not exists assets (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists concept_batches (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id text primary key,
  data jsonb not null
);

alter table games enable row level security;
alter table game_versions enable row level security;
alter table thumbnails enable row level security;
alter table jobs enable row level security;
alter table play_events enable row level security;
alter table usage enable row level security;
alter table assets enable row level security;
alter table concept_batches enable row level security;
alter table settings enable row level security;
