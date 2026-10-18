-- DIRECTION schema. Content (careers, paths, missions, achievements) lives in
-- the application code and is referenced here by stable text ids. This schema
-- holds private user data only, protected by row-level security.

create extension if not exists pgcrypto;

-- ───────────── Profiles ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default 'Explorer' check (char_length(display_name) <= 40),
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,40}$'),
  created_at timestamptz not null default now(),
  onboarding jsonb,
  onboarded_at timestamptz,
  matches jsonb not null default '[]'::jsonb,
  timezone text not null default 'Europe/London',
  streak jsonb not null default '{"current":0,"longest":0,"lastActiveDay":null,"freezes":0,"frozenDays":[]}'::jsonb,
  privacy jsonb not null default '{"passportPublic":false,"showDirection":true,"showSkills":true,"showAchievements":true,"showProjects":true,"showTimeline":false,"researchConsent":false}'::jsonb,
  challenge jsonb,
  is_demo boolean not null default false
);

-- ───────────── Subscriptions (written by the server only) ─────────────
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  source text not null default 'none' check (source in ('none', 'mock', 'stripe')),
  renews_at timestamptz,
  stripe_customer_id text unique,
  updated_at timestamptz not null default now()
);

-- ───────────── Paths, missions, achievements ─────────────
create table public.user_paths (
  user_id uuid not null references public.profiles (id) on delete cascade,
  career_slug text not null,
  status text not null check (status in ('active', 'paused')),
  started_at timestamptz not null default now(),
  skipped_through int not null default 0 check (skipped_through between 0 and 10),
  last_active_at timestamptz not null default now(),
  primary key (user_id, career_slug)
);

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id text not null,
  career_slug text not null,
  completed_at timestamptz not null default now(),
  day date not null,
  evidence text check (char_length(evidence) <= 4000),
  reflection text check (char_length(reflection) <= 2000),
  rating smallint check (rating in (-1, 0, 1)),
  xp int not null check (xp between 0 and 500),
  skill_points jsonb not null default '[]'::jsonb,
  source text not null check (source in ('path', 'daily', 'challenge', 'placement')),
  unique (user_id, mission_id)
);
create index mission_completions_user_day on public.mission_completions (user_id, day);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.daily_plans (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  mission_ids text[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ───────────── Coach ─────────────
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now(),
  provider text check (provider in ('anthropic', 'offline'))
);
create index coach_messages_user_created on public.coach_messages (user_id, created_at desc);

-- ───────────── Opportunities, discovery, passport ─────────────
create table public.opportunity_bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  opportunity_id text not null,
  status text not null check (status in ('saved', 'applied', 'interviewing', 'secured', 'closed')),
  notes text not null default '' check (char_length(notes) <= 2000),
  updated_at timestamptz not null default now(),
  snapshot jsonb,
  primary key (user_id, opportunity_id)
);

create table public.career_views (
  user_id uuid not null references public.profiles (id) on delete cascade,
  career_slug text not null,
  viewed_at timestamptz not null default now(),
  primary key (user_id, career_slug)
);

create table public.passport_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('experience', 'certification', 'project', 'education')),
  title text not null check (char_length(title) between 1 and 120),
  organisation text not null default '',
  start_date date,
  end_date date,
  description text not null default '' check (char_length(description) <= 1500),
  url text check (url is null or url ~* '^https?://'),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index passport_items_user on public.passport_items (user_id);

-- ───────────── Row-level security ─────────────
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_paths enable row level security;
alter table public.mission_completions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_plans enable row level security;
alter table public.coach_messages enable row level security;
alter table public.opportunity_bookmarks enable row level security;
alter table public.career_views enable row level security;
alter table public.passport_items enable row level security;

-- Owners have full access to their own rows; nobody else has any access.
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own paths" on public.user_paths for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own completions" on public.mission_completions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own achievements" on public.user_achievements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own daily plans" on public.daily_plans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own coach messages" on public.coach_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own bookmarks" on public.opportunity_bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own career views" on public.career_views for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own passport" on public.passport_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Subscriptions: users may read their own; only the service role (server) writes.
create policy "read own subscription" on public.subscriptions for select to authenticated using (user_id = auth.uid());

-- ───────────── Public passport (opt-in, field-limited) ─────────────
-- Returns only what the owner has chosen to share. Runs as definer so the
-- anonymous role never gets direct table access.
create or replace function public.get_public_passport(p_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.profiles%rowtype;
  priv jsonb;
begin
  select * into p from public.profiles where handle = lower(p_handle);
  if not found then return null; end if;
  priv := p.privacy;
  if coalesce((priv->>'passportPublic')::boolean, false) is not true then return null; end if;
  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id, 'display_name', p.display_name, 'handle', p.handle, 'created_at', p.created_at,
      'timezone', p.timezone, 'streak', p.streak, 'privacy', p.privacy, 'onboarded_at', p.onboarded_at,
      'matches', '[]'::jsonb, 'is_demo', p.is_demo
    ),
    'paths', case when coalesce((priv->>'showDirection')::boolean, true)
      then coalesce((select jsonb_agg(to_jsonb(up) - 'user_id') from public.user_paths up where up.user_id = p.id), '[]'::jsonb) else '[]'::jsonb end,
    'completions', coalesce((select jsonb_agg(
        jsonb_build_object('id', c.id, 'mission_id', c.mission_id, 'career_slug', c.career_slug, 'completed_at', c.completed_at, 'day', c.day,
          'xp', c.xp, 'skill_points', c.skill_points, 'source', c.source,
          'evidence', case when coalesce((priv->>'showProjects')::boolean, true) then c.evidence else null end))
      from public.mission_completions c where c.user_id = p.id), '[]'::jsonb),
    'achievements', case when coalesce((priv->>'showAchievements')::boolean, true)
      then coalesce((select jsonb_agg(jsonb_build_object('achievement_id', a.achievement_id, 'unlocked_at', a.unlocked_at)) from public.user_achievements a where a.user_id = p.id), '[]'::jsonb) else '[]'::jsonb end,
    'passport', coalesce((select jsonb_agg(to_jsonb(i) - 'user_id') from public.passport_items i where i.user_id = p.id and i.is_public), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_public_passport(text) from public;
grant execute on function public.get_public_passport(text) to anon, authenticated;
