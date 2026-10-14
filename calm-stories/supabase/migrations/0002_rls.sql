-- Row Level Security. The Next.js server uses the service-role key and applies
-- src/lib/auth/policy.ts; these policies protect the same rows for any direct
-- client (anon / authenticated) access. users.id equals auth.uid()::text when
-- Supabase Auth is the identity provider.

create or replace function app_uid() returns text language sql stable as $$ select auth.uid()::text $$;

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = app_uid() and role in ('admin','editor'))
$$;

create or replace function owns_series(sid text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from series where id = sid and creator_id = app_uid())
$$;

create or replace function series_is_public(sid text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from series where id = sid and status = 'published')
$$;

create or replace function has_premium() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from subscription_entitlements where user_id = app_uid() and plan = 'premium' and status = 'active' and (expires_at is null or expires_at > now()))
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','user_roles','subscription_entitlements','creator_profiles','user_settings','voice_profiles','soundscapes',
    'series','seasons','episodes','audio_assets','scripts','script_versions','episode_productions','artwork_assets',
    'story_bibles','characters','character_relationships','locations','narrative_events','ai_conversations','ai_tool_calls',
    'agent_configurations','production_workflows','ai_production_jobs','production_costs','ai_settings',
    'publishing_schedules','editorial_reviews','rights_declarations','content_reports','user_libraries','series_follows',
    'creator_follows','listening_progress','listening_events','notifications']
  loop
    execute format('alter table %I enable row level security', t);
    -- Administrators / editors can manage everything.
    execute format('create policy admin_all on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Public profile data
create policy read_public on creator_profiles for select using (true);
create policy read_public on voice_profiles for select using (approved);
create policy read_public on soundscapes for select using (true);
create policy self_read on users for select using (id = app_uid());
create policy self_read on user_roles for select using (user_id = app_uid());
create policy self_read on subscription_entitlements for select using (user_id = app_uid());
create policy self_all on user_settings for all using (id = app_uid()) with check (id = app_uid());

-- Catalogue: published content is public; drafts only for their creator.
create policy read_published on series for select using (status = 'published' or creator_id = app_uid());
create policy creator_insert on series for insert with check (creator_id = app_uid() and status in ('draft','in_review'));
create policy creator_update on series for update using (creator_id = app_uid()) with check (creator_id = app_uid() and status <> 'published');
create policy creator_delete on series for delete using (creator_id = app_uid() and status = 'draft');

create policy read_published on seasons for select using (series_is_public(series_id) or owns_series(series_id));
create policy creator_write on seasons for all using (owns_series(series_id)) with check (owns_series(series_id));

-- Episodes: metadata of released episodes is public; creators manage their own,
-- but can never mark an episode published or approved themselves.
create policy read_released on episodes for select using ((status = 'published' and published_at <= now() and series_is_public(series_id)) or owns_series(series_id));
create policy creator_write on episodes for insert with check (owns_series(series_id) and status not in ('approved','published'));
create policy creator_update on episodes for update using (owns_series(series_id)) with check (owns_series(series_id) and status not in ('approved','published'));
create policy creator_delete on episodes for delete using (owns_series(series_id) and status in ('planned','draft'));

-- Audio files are streamed through the entitlement-checked API; rows readable by owners.
create policy owner_read on audio_assets for select using (owner_id = app_uid() or (series_id is not null and owns_series(series_id)));

-- Creator-private working data
create policy creator_all on scripts for all using (owns_series(series_id)) with check (owns_series(series_id));
create policy creator_all on script_versions for all using (exists (select 1 from scripts s where s.id = script_id and owns_series(s.series_id))) with check (exists (select 1 from scripts s where s.id = script_id and owns_series(s.series_id)));
create policy creator_all on episode_productions for all using (owns_series(series_id)) with check (owns_series(series_id));
create policy creator_all on story_bibles for all using (owns_series(series_id)) with check (owns_series(series_id));
create policy creator_all on characters for all using (owns_series(series_id)) with check (owns_series(series_id));
create policy creator_all on character_relationships for all using (owns_series(series_id)) with check (owns_series(series_id));
create policy creator_all on locations for all using (owns_series(series_id)) with check (owns_series(series_id));
create policy creator_all on narrative_events for all using (owns_series(series_id)) with check (owns_series(series_id));
create policy owner_all on artwork_assets for all using (owner_id = app_uid()) with check (owner_id = app_uid());
create policy read_public_art on artwork_assets for select using (series_id is not null and series_is_public(series_id));
create policy owner_all on ai_conversations for all using (user_id = app_uid()) with check (user_id = app_uid());
create policy owner_read on ai_tool_calls for select using (user_id = app_uid());
create policy owner_read on rights_declarations for select using (user_id = app_uid());
create policy owner_insert on rights_declarations for insert with check (user_id = app_uid() and owns_series(series_id));

-- Editorial: creators see reviews of their own work and may submit; only admins decide.
create policy creator_read on editorial_reviews for select using (owns_series(series_id));
create policy creator_submit on editorial_reviews for insert with check (owns_series(series_id) and submitted_by = app_uid() and status = 'pending');
create policy creator_read on publishing_schedules for select using (owns_series(series_id));

-- Reports: anyone signed in can file; only admins read.
create policy file_report on content_reports for insert with check (reporter_id is null or reporter_id = app_uid());

-- Listener data is private to its owner.
create policy owner_all on user_libraries for all using (user_id = app_uid()) with check (user_id = app_uid());
create policy owner_all on series_follows for all using (user_id = app_uid()) with check (user_id = app_uid());
create policy owner_all on creator_follows for all using (user_id = app_uid()) with check (user_id = app_uid());
create policy owner_all on listening_progress for all using (user_id = app_uid()) with check (user_id = app_uid());
create policy owner_insert on listening_events for insert with check (user_id = app_uid());
create policy owner_all on notifications for all using (user_id = app_uid()) with check (user_id = app_uid());

-- agent_configurations, production_workflows, ai_production_jobs, production_costs and
-- ai_settings are admin-only (covered by admin_all above).
