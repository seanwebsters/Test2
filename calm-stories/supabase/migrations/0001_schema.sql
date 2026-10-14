-- Calm Stories — core schema.
-- Column names match src/lib/types.ts exactly so the SupabaseDatabase adapter
-- needs no mapping layer. Text primary keys keep seeded ids stable.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- identity
create table users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  email text not null unique,
  avatar_hue int not null default 240,
  created_at timestamptz not null default now()
);

create table user_roles (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('creator','admin','editor')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table subscription_entitlements (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  plan text not null check (plan in ('free','premium')),
  status text not null check (status in ('active','expired','cancelled')),
  source text not null check (source in ('mock','calm')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on subscription_entitlements (user_id, status);

create table creator_profiles (
  id text primary key,
  user_id text not null unique references users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  is_official boolean not null default false,
  avatar jsonb not null,
  created_at timestamptz not null default now()
);

create table user_settings (
  id text primary key references users(id) on delete cascade,
  autoplay_next boolean not null default true,
  autoplay_limit int not null default 3,
  default_speed numeric not null default 1,
  default_sleep_timer_minutes int,
  new_episode_updates boolean not null default true,
  private_listening_history boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- audio library
create table voice_profiles (
  id text primary key,
  name text not null,
  description text not null,
  provider text not null check (provider in ('elevenlabs','openai','mock')),
  provider_voice_id text not null,
  accent text not null,
  tone text not null,
  approved boolean not null default false,
  consent_record text not null,
  created_at timestamptz not null default now()
);

create table soundscapes (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  layers jsonb not null,
  licence text not null,
  sample_url text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- catalogue
create table series (
  id text primary key,
  slug text not null unique,
  creator_id text not null references users(id) on delete restrict,
  title text not null,
  tagline text not null default '',
  description text not null default '',
  genre text not null,
  tags text[] not null default '{}',
  status text not null check (status in ('draft','in_review','published','archived','removed')),
  is_official boolean not null default false,
  artwork jsonb not null,
  narrator_voice_id text references voice_profiles(id),
  soundscape_id text references soundscapes(id),
  content_rating text not null default 'all-ages',
  ai_disclosure text,
  trending_score numeric not null default 0,
  popularity numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index on series (status, genre);
create index on series (creator_id);

create table seasons (
  id text primary key,
  series_id text not null references series(id) on delete cascade,
  number int not null,
  title text not null,
  synopsis text not null default '',
  arc text not null default '',
  created_at timestamptz not null default now(),
  unique (series_id, number)
);

create table audio_assets (
  id text primary key,
  owner_id text references users(id) on delete set null,
  series_id text references series(id) on delete cascade,
  episode_id text,
  kind text not null check (kind in ('narration_section','narration','ambience','mix','sample','voice_preview')),
  section_index int,
  storage_key text not null,
  url text not null,
  mime_type text not null,
  duration_seconds numeric not null default 0,
  provider text not null,
  simulated boolean not null default false,
  qa jsonb,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on audio_assets (episode_id, kind);

create table episodes (
  id text primary key,
  series_id text not null references series(id) on delete cascade,
  season_id text not null references seasons(id) on delete cascade,
  number int not null,
  title text not null,
  summary text not null default '',
  duration_seconds int not null default 0,
  status text not null check (status in ('planned','draft','script_ready','audio_ready','in_review','changes_requested','approved','published','rejected')),
  release_at timestamptz,
  published_at timestamptz,
  audio_asset_id text references audio_assets(id) on delete set null,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on episodes (series_id, number);
create index on episodes (status, release_at);
alter table audio_assets add constraint audio_assets_episode_fk foreign key (episode_id) references episodes(id) on delete cascade;

create table scripts (
  id text primary key,
  episode_id text not null unique references episodes(id) on delete cascade,
  series_id text not null references series(id) on delete cascade,
  current_version_id text,
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table script_versions (
  id text primary key,
  script_id text not null references scripts(id) on delete cascade,
  version int not null,
  content text not null,
  word_count int not null,
  source text not null check (source in ('ai','human','ai_rewrite','agent')),
  provider text,
  model text,
  simulated boolean not null default false,
  note text not null default '',
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (script_id, version)
);
alter table scripts add constraint scripts_current_version_fk foreign key (current_version_id) references script_versions(id) on delete set null deferrable initially deferred;

create table episode_productions (
  id text primary key,
  episode_id text not null unique references episodes(id) on delete cascade,
  series_id text not null references series(id) on delete cascade,
  settings jsonb not null,
  section_asset_ids jsonb not null default '[]',
  mix_asset_id text references audio_assets(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table artwork_assets (
  id text primary key,
  owner_id text not null references users(id) on delete cascade,
  series_id text references series(id) on delete cascade,
  episode_id text references episodes(id) on delete cascade,
  character_id text,
  kind text not null check (kind in ('cover','episode','portrait','banner')),
  source text not null check (source in ('procedural','upload','generated')),
  spec jsonb not null,
  prompt text,
  provider text,
  simulated boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- story memory
create table story_bibles (
  id text primary key,
  series_id text not null unique references series(id) on delete cascade,
  world_name text not null default '',
  geography text not null default '',
  culture text not null default '',
  history text not null default '',
  atmosphere text not null default '',
  rules text[] not null default '{}',
  themes text[] not null default '{}',
  established_facts text[] not null default '{}',
  unresolved_threads text[] not null default '{}',
  creator_preferences text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table characters (
  id text primary key,
  series_id text not null references series(id) on delete cascade,
  name text not null,
  age_range text not null default '',
  personality text not null default '',
  backstory text not null default '',
  motivations text not null default '',
  narrative_role text not null default '',
  voice_profile text not null default '',
  arc text not null default '',
  portrait jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on characters (series_id);
alter table artwork_assets add constraint artwork_character_fk foreign key (character_id) references characters(id) on delete cascade;

create table character_relationships (
  id text primary key,
  series_id text not null references series(id) on delete cascade,
  character_a_id text not null references characters(id) on delete cascade,
  character_b_id text not null references characters(id) on delete cascade,
  kind text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table locations (
  id text primary key,
  series_id text not null references series(id) on delete cascade,
  name text not null,
  description text not null default '',
  recurring boolean not null default false,
  created_at timestamptz not null default now()
);
create index on locations (series_id);

create table narrative_events (
  id text primary key,
  series_id text not null references series(id) on delete cascade,
  episode_id text references episodes(id) on delete cascade,
  kind text not null check (kind in ('event','fact','thread_opened','thread_resolved')),
  summary text not null,
  character_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on narrative_events (series_id, created_at);

-- ---------------------------------------------------------------- AI
create table ai_conversations (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  series_id text references series(id) on delete cascade,
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on ai_conversations (user_id, series_id);

create table ai_tool_calls (
  id text primary key,
  conversation_id text references ai_conversations(id) on delete set null,
  user_id text not null references users(id) on delete cascade,
  series_id text references series(id) on delete cascade,
  tool text not null,
  input jsonb,
  output jsonb,
  status text not null check (status in ('pending_confirmation','executed','failed','cancelled')),
  confirmation_reason text,
  error text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);
create index on ai_tool_calls (user_id, created_at desc);

create table agent_configurations (
  id text primary key,
  agent text not null unique,
  name text not null,
  description text not null,
  provider text not null,
  model text not null,
  prompt_template text not null default '',
  temperature numeric not null default 0.7,
  max_cost_cents_per_job int not null default 100,
  retry_limit int not null default 2,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table production_workflows (
  id text primary key,
  series_id text not null unique references series(id) on delete cascade,
  episodes_per_week int not null check (episodes_per_week between 1 and 14),
  target_duration_minutes int not null,
  writing_provider text not null,
  writing_model text not null,
  narrator_voice_id text references voice_profiles(id),
  soundscape_id text references soundscapes(id),
  release_days int[] not null,
  release_hour_utc int not null check (release_hour_utc between 0 and 23),
  max_budget_cents int not null,
  approval_required boolean not null default true check (approval_required),
  status text not null check (status in ('active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_production_jobs (
  id text primary key,
  kind text not null,
  series_id text references series(id) on delete cascade,
  episode_id text references episodes(id) on delete set null,
  workflow_id text references production_workflows(id) on delete set null,
  status text not null check (status in ('queued','running','paused','succeeded','failed','cancelled')),
  current_step text,
  steps jsonb not null default '[]',
  logs jsonb not null default '[]',
  payload jsonb not null default '{}',
  attempts int not null default 0,
  max_attempts int not null default 3,
  idempotency_key text unique,
  cost_cents int not null default 0,
  budget_cents int,
  error text,
  simulated boolean not null default false,
  requested_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index on ai_production_jobs (status, created_at);
create index on ai_production_jobs (series_id);

create table production_costs (
  id text primary key,
  job_id text references ai_production_jobs(id) on delete set null,
  series_id text references series(id) on delete set null,
  episode_id text references episodes(id) on delete set null,
  category text not null check (category in ('llm','tts','image','audio_processing')),
  provider text not null,
  model text not null,
  units numeric not null,
  unit_label text not null,
  cost_cents int not null,
  simulated boolean not null default false,
  created_at timestamptz not null default now()
);
create index on production_costs (created_at);

create table ai_settings (
  id text primary key check (id = 'global'),
  writing_provider text not null,
  writing_model_anthropic text not null,
  writing_model_openai text not null,
  voice_provider text not null,
  image_provider text not null,
  sound_provider text not null,
  task_models jsonb not null default '{}',
  prompt_templates jsonb not null default '{}',
  monthly_cost_limit_cents int not null,
  per_job_cost_limit_cents int not null,
  retry_limit int not null,
  approval_policy text not null,
  max_concurrent_jobs int not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- publishing & safety
create table publishing_schedules (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  series_id text not null references series(id) on delete cascade,
  release_at timestamptz not null,
  status text not null check (status in ('scheduled','released','cancelled')),
  created_by text not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on publishing_schedules (status, release_at);

create table editorial_reviews (
  id text primary key,
  episode_id text not null references episodes(id) on delete cascade,
  series_id text not null references series(id) on delete cascade,
  submitted_by text not null references users(id),
  source text not null check (source in ('creator','production_engine')),
  status text not null check (status in ('pending','approved','rejected','changes_requested')),
  checks jsonb not null default '[]',
  requested_release_at timestamptz,
  reviewer_id text references users(id),
  notes text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index on editorial_reviews (status, created_at);

create table rights_declarations (
  id text primary key,
  series_id text not null references series(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  original_work boolean not null,
  ai_assisted boolean not null,
  third_party_material text not null default '',
  voice_consent boolean not null,
  accepted_terms_version text not null,
  created_at timestamptz not null default now()
);

create table content_reports (
  id text primary key,
  reporter_id text references users(id) on delete set null,
  target_type text not null check (target_type in ('series','episode','creator')),
  target_id text not null,
  reason text not null,
  details text not null default '',
  status text not null check (status in ('open','actioned','dismissed')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------- listener
create table user_libraries (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  series_id text not null references series(id) on delete cascade,
  collection text not null default 'Saved',
  created_at timestamptz not null default now(),
  unique (user_id, series_id, collection)
);

create table series_follows (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  series_id text not null references series(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, series_id)
);
create index on series_follows (series_id);

create table creator_follows (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  creator_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, creator_id)
);
create index on creator_follows (creator_id);

create table listening_progress (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  episode_id text not null references episodes(id) on delete cascade,
  series_id text not null references series(id) on delete cascade,
  position_seconds numeric not null default 0,
  duration_seconds numeric not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, episode_id)
);
create index on listening_progress (user_id, updated_at desc);

create table listening_events (
  id text primary key,
  user_id text references users(id) on delete set null,
  anonymous_id text,
  episode_id text references episodes(id) on delete set null,
  series_id text references series(id) on delete set null,
  kind text not null,
  position_seconds numeric not null default 0,
  listened_seconds numeric not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index on listening_events (series_id, created_at);
create index on listening_events (episode_id, kind);

create table notifications (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read, created_at desc);
