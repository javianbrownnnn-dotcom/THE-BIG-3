-- ============================================================================
-- The Big 3 OS — complete database setup (all migrations, in order).
-- Paste this ENTIRE file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project. Takes a few seconds.
-- ============================================================================

-- ---- 0001_init.sql ---------------------------------------------------------
-- ============================================================================
-- The Big 3 OS — initial schema
--
-- Principles:
--   * Normalized: entities reference each other, no duplicated fields.
--   * UUID primary keys everywhere.
--   * Audit columns (created_at / updated_at / created_by) on every table.
--   * Metrics are stored as append-only historical snapshots.
--   * SOP versions are append-only: never overwritten, never deleted.
--   * Multi-tenant from day one: everything hangs off an organization,
--     and Row Level Security is enforced through org membership.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type org_role as enum ('owner', 'admin', 'editor', 'viewer');
create type video_format as enum ('long_form', 'short', 'livestream');
create type idea_priority as enum ('low', 'medium', 'high', 'urgent');
create type idea_status as enum ('inbox', 'researching', 'approved', 'in_production', 'published', 'archived');
create type sop_status as enum ('draft', 'active', 'archived');
create type content_source as enum ('human', 'ai');
create type recommendation_status as enum ('proposed', 'accepted', 'rejected', 'testing', 'validated', 'failed');
create type report_type as enum ('weekly', 'monthly', 'quarterly', 'channel', 'cross_channel', 'competitor', 'experiment');
create type notification_type as enum (
  'ctr_drop', 'retention_improved', 'competitor_outlier',
  'sop_review_due', 'ai_recommendation', 'experiment_complete', 'system'
);
create type integration_provider as enum (
  'youtube', 'youtube_analytics', 'claude', 'openai',
  'google_drive', 'slack', 'discord', 'email', 'webhook'
);

-- ----------------------------------------------------------------------------
-- Shared trigger functions
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Append-only guard: snapshots and versions are historical records.
create or replace function forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% rows are append-only and cannot be % (history is kept forever)', tg_table_name, lower(tg_op);
end $$;

-- ----------------------------------------------------------------------------
-- Identity & tenancy
-- ----------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references profiles (id) on delete cascade,
  role            org_role not null default 'viewer',
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Membership helpers used by every RLS policy. SECURITY DEFINER so policies
-- don't recurse into organization_members' own RLS.
create or replace function is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function has_org_role(org uuid, min_role org_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and array_position(array['viewer','editor','admin','owner']::org_role[], m.role)
          >= array_position(array['viewer','editor','admin','owner']::org_role[], min_role)
  );
$$;

-- ----------------------------------------------------------------------------
-- Channels
-- ----------------------------------------------------------------------------
create table channels (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations (id) on delete cascade,
  owner_id           uuid references profiles (id),
  name               text not null,
  brand              text,
  niche              text,
  upload_cadence     text,             -- e.g. "1 long-form / week"
  description        text,
  youtube_channel_id text,             -- set once the YouTube integration is connected
  created_by         uuid references profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table channel_goals (
  id           uuid primary key default gen_random_uuid(),
  channel_id   uuid not null references channels (id) on delete cascade,
  metric       text not null,          -- 'ctr', 'avg_percent_viewed', 'subscribers', ...
  target_value numeric not null,
  period       text not null default 'monthly',
  notes        text,
  created_by   uuid references profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Videos + append-only metric snapshots
-- ----------------------------------------------------------------------------
create table videos (
  id               uuid primary key default gen_random_uuid(),
  channel_id       uuid not null references channels (id) on delete cascade,
  title            text not null,
  url              text,
  thumbnail_url    text,
  published_at     timestamptz,
  topic            text,
  hook_type        text,
  story_structure  text,
  duration_seconds integer,
  format           video_format not null default 'long_form',
  manual_notes     text,
  ai_observations  text,             -- written by the learning loop
  created_by       uuid references profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index videos_channel_published_idx on videos (channel_id, published_at desc);

create table video_metric_snapshots (
  id                       uuid primary key default gen_random_uuid(),
  video_id                 uuid not null references videos (id) on delete cascade,
  captured_at              timestamptz not null default now(),
  views                    bigint,
  impressions              bigint,
  ctr                      numeric,     -- 0..100
  avg_view_duration_secs   numeric,
  avg_percent_viewed       numeric,     -- 0..100
  watch_time_hours         numeric,
  subscribers_gained       integer,
  revenue                  numeric,     -- future
  rpm                      numeric,     -- future
  source                   text not null default 'manual'  -- 'manual' | 'youtube_api'
);
create index video_snapshots_video_time_idx on video_metric_snapshots (video_id, captured_at desc);

create trigger video_snapshots_append_only
  before update or delete on video_metric_snapshots
  for each row execute function forbid_mutation();

-- ----------------------------------------------------------------------------
-- Competitor database + append-only snapshots
-- ----------------------------------------------------------------------------
create table competitor_channels (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations (id) on delete cascade,
  name               text not null,
  youtube_channel_id text,
  niche              text,
  notes              text,
  created_by         uuid references profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table competitor_videos (
  id                    uuid primary key default gen_random_uuid(),
  competitor_channel_id uuid not null references competitor_channels (id) on delete cascade,
  title                 text not null,
  url                   text,
  thumbnail_url         text,
  published_at          timestamptz,
  topic                 text,
  hook                  text,
  story_structure       text,
  why_it_worked         text,
  ai_observations       text,        -- written by the learning loop
  is_outlier            boolean not null default false,
  outlier_score         numeric,       -- z-score of views/day vs. the channel's trailing baseline
  created_by            uuid references profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index competitor_videos_channel_idx on competitor_videos (competitor_channel_id, published_at desc);
create index competitor_videos_outlier_idx on competitor_videos (is_outlier) where is_outlier;

create table competitor_video_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  competitor_video_id uuid not null references competitor_videos (id) on delete cascade,
  captured_at         timestamptz not null default now(),
  views               bigint,
  views_per_day       numeric,
  velocity            numeric          -- week-over-week change in views/day
);
create index competitor_snapshots_video_time_idx on competitor_video_snapshots (competitor_video_id, captured_at desc);

create trigger competitor_snapshots_append_only
  before update or delete on competitor_video_snapshots
  for each row execute function forbid_mutation();

-- ----------------------------------------------------------------------------
-- Ideas
-- ----------------------------------------------------------------------------
create table tags (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create table ideas (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references organizations (id) on delete cascade,
  channel_id                  uuid references channels (id) on delete set null,
  title                       text not null,
  description                 text,
  priority                    idea_priority not null default 'medium',
  status                      idea_status not null default 'inbox',
  related_competitor_video_id uuid references competitor_videos (id) on delete set null,
  related_sop_id              uuid,    -- FK added after sops table exists
  created_by                  uuid references profiles (id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create table idea_tags (
  idea_id uuid not null references ideas (id) on delete cascade,
  tag_id  uuid not null references tags (id) on delete cascade,
  primary key (idea_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- SOP system — the heart of the platform.
-- The sops row is a stable identity; all content lives in append-only versions.
-- ----------------------------------------------------------------------------
create table sops (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations (id) on delete cascade,
  channel_id            uuid references channels (id) on delete set null,  -- null = org-wide
  title                 text not null,
  category              text,          -- 'hooks', 'thumbnails', 'storytelling', 'packaging', ...
  status                sop_status not null default 'active',
  review_frequency_days integer not null default 30,
  next_review_at        timestamptz,
  created_by            uuid references profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table sop_versions (
  id             uuid primary key default gen_random_uuid(),
  sop_id         uuid not null references sops (id) on delete cascade,
  version_number integer not null,
  purpose        text not null,
  when_to_use    text,
  steps          jsonb not null default '[]',   -- ordered array of step strings
  examples       text,
  change_summary text,                          -- what changed vs. the previous version and why
  source         content_source not null default 'human',
  created_by     uuid references profiles (id),
  created_at     timestamptz not null default now(),
  unique (sop_id, version_number)
);

-- Versions are immutable history: no updates, no deletes, ever.
create trigger sop_versions_append_only
  before update or delete on sop_versions
  for each row execute function forbid_mutation();

alter table ideas
  add constraint ideas_related_sop_fk
  foreign key (related_sop_id) references sops (id) on delete set null;

create table sop_video_links (
  sop_id   uuid not null references sops (id) on delete cascade,
  video_id uuid not null references videos (id) on delete cascade,
  primary key (sop_id, video_id)
);

create table sop_competitor_links (
  sop_id              uuid not null references sops (id) on delete cascade,
  competitor_video_id uuid not null references competitor_videos (id) on delete cascade,
  primary key (sop_id, competitor_video_id)
);

-- ----------------------------------------------------------------------------
-- AI layer: insights, recommendations (with outcome tracking), conversations
-- ----------------------------------------------------------------------------
create table ai_insights (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  channel_id      uuid references channels (id) on delete cascade,
  kind            text not null,       -- 'pattern', 'anomaly', 'competitor', 'experiment'
  title           text not null,
  body            text not null,
  confidence      numeric,             -- 0..1 as reported by the model + statistical backing
  data            jsonb not null default '{}',  -- the evidence: metric deltas, sample sizes
  created_at      timestamptz not null default now()
);

create table ai_recommendations (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references organizations (id) on delete cascade,
  insight_id              uuid references ai_insights (id) on delete set null,
  sop_id                  uuid references sops (id) on delete set null,
  proposed_sop_version_id uuid references sop_versions (id) on delete set null,
  title                   text not null,
  rationale               text not null,
  status                  recommendation_status not null default 'proposed',
  -- Outcome tracking: filled in by the learning loop after enough videos ship
  -- under the new SOP version to measure whether performance actually improved.
  measured_impact         jsonb,       -- { metric, before, after, n_before, n_after, p_value }
  outcome_notes           text,
  decided_by              uuid references profiles (id),
  decided_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table ai_conversations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references profiles (id) on delete cascade,
  title           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Reports
-- ----------------------------------------------------------------------------
create table reports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  channel_id      uuid references channels (id) on delete cascade,  -- null = cross-channel
  type            report_type not null,
  title           text not null,
  period_start    date not null,
  period_end      date not null,
  content_md      text not null,       -- rendered markdown, exportable as-is
  data            jsonb not null default '{}',
  source          content_source not null default 'ai',
  created_by      uuid references profiles (id),
  created_at      timestamptz not null default now()
);
create index reports_org_period_idx on reports (organization_id, period_end desc);

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
create table notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid references profiles (id) on delete cascade,  -- null = whole org
  type            notification_type not null,
  title           text not null,
  body            text,
  entity_type     text,                -- 'video' | 'sop' | 'competitor_video' | ...
  entity_id       uuid,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Integrations & automation engine (future-ready interfaces)
-- ----------------------------------------------------------------------------
create table integrations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  provider        integration_provider not null,
  config          jsonb not null default '{}',  -- non-secret config; secrets live in Vault/edge secrets
  enabled         boolean not null default false,
  created_by      uuid references profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, provider)
);

create table webhook_endpoints (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  url             text not null,
  events          text[] not null default '{}',
  secret          text,
  enabled         boolean not null default true,
  created_by      uuid references profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table automations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  trigger         jsonb not null,      -- { type: 'schedule'|'event', ... }
  actions         jsonb not null,      -- ordered array of action definitions
  enabled         boolean not null default false,
  last_run_at     timestamptz,
  created_by      uuid references profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Activity log
-- ----------------------------------------------------------------------------
create table activity_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  actor_id        uuid references profiles (id),
  action          text not null,       -- 'created', 'updated', 'published', ...
  entity_type     text not null,
  entity_id       uuid,
  meta            jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index activity_log_org_idx on activity_log (organization_id, created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','channels','channel_goals','videos',
    'competitor_channels','competitor_videos','ideas','sops',
    'ai_recommendations','ai_conversations','integrations',
    'webhook_endpoints','automations'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Standard model: any org member can read; editors and up can write;
-- admins and up can delete. Append-only tables additionally block
-- update/delete at the trigger level regardless of role.
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
create policy "profiles are readable by authenticated users"
  on profiles for select to authenticated using (true);
create policy "users manage their own profile"
  on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table organizations enable row level security;
create policy "members read their orgs"
  on organizations for select to authenticated using (is_org_member(id));
create policy "authenticated users can create orgs"
  on organizations for insert to authenticated with check (created_by = auth.uid());
create policy "owners update their orgs"
  on organizations for update to authenticated using (has_org_role(id, 'owner'));
create policy "owners delete their orgs"
  on organizations for delete to authenticated using (has_org_role(id, 'owner'));

alter table organization_members enable row level security;
create policy "members see membership of their orgs"
  on organization_members for select to authenticated using (is_org_member(organization_id));
create policy "admins manage membership"
  on organization_members for insert to authenticated with check (has_org_role(organization_id, 'admin'));
create policy "admins update membership"
  on organization_members for update to authenticated using (has_org_role(organization_id, 'admin'));
create policy "admins remove members"
  on organization_members for delete to authenticated using (has_org_role(organization_id, 'admin'));

-- Tables whose org scope is a direct organization_id column.
do $$
declare t text;
begin
  foreach t in array array[
    'channels','competitor_channels','ideas','tags','sops','ai_insights',
    'ai_recommendations','reports','notifications','integrations',
    'webhook_endpoints','automations','activity_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "members read %s" on %I for select to authenticated
       using (is_org_member(organization_id))', t, t);
    execute format(
      'create policy "editors write %s" on %I for insert to authenticated
       with check (has_org_role(organization_id, ''editor''))', t, t);
    execute format(
      'create policy "editors update %s" on %I for update to authenticated
       using (has_org_role(organization_id, ''editor''))', t, t);
    execute format(
      'create policy "admins delete %s" on %I for delete to authenticated
       using (has_org_role(organization_id, ''admin''))', t, t);
  end loop;
end $$;

-- Tables scoped through a parent row.
alter table channel_goals enable row level security;
create policy "members read channel_goals" on channel_goals for select to authenticated
  using (exists (select 1 from channels c where c.id = channel_id and is_org_member(c.organization_id)));
create policy "editors write channel_goals" on channel_goals for insert to authenticated
  with check (exists (select 1 from channels c where c.id = channel_id and has_org_role(c.organization_id, 'editor')));
create policy "editors update channel_goals" on channel_goals for update to authenticated
  using (exists (select 1 from channels c where c.id = channel_id and has_org_role(c.organization_id, 'editor')));
create policy "admins delete channel_goals" on channel_goals for delete to authenticated
  using (exists (select 1 from channels c where c.id = channel_id and has_org_role(c.organization_id, 'admin')));

alter table videos enable row level security;
create policy "members read videos" on videos for select to authenticated
  using (exists (select 1 from channels c where c.id = channel_id and is_org_member(c.organization_id)));
create policy "editors write videos" on videos for insert to authenticated
  with check (exists (select 1 from channels c where c.id = channel_id and has_org_role(c.organization_id, 'editor')));
create policy "editors update videos" on videos for update to authenticated
  using (exists (select 1 from channels c where c.id = channel_id and has_org_role(c.organization_id, 'editor')));
create policy "admins delete videos" on videos for delete to authenticated
  using (exists (select 1 from channels c where c.id = channel_id and has_org_role(c.organization_id, 'admin')));

alter table video_metric_snapshots enable row level security;
create policy "members read video snapshots" on video_metric_snapshots for select to authenticated
  using (exists (select 1 from videos v join channels c on c.id = v.channel_id
                 where v.id = video_id and is_org_member(c.organization_id)));
create policy "editors append video snapshots" on video_metric_snapshots for insert to authenticated
  with check (exists (select 1 from videos v join channels c on c.id = v.channel_id
                      where v.id = video_id and has_org_role(c.organization_id, 'editor')));

alter table competitor_videos enable row level security;
create policy "members read competitor videos" on competitor_videos for select to authenticated
  using (exists (select 1 from competitor_channels cc where cc.id = competitor_channel_id and is_org_member(cc.organization_id)));
create policy "editors write competitor videos" on competitor_videos for insert to authenticated
  with check (exists (select 1 from competitor_channels cc where cc.id = competitor_channel_id and has_org_role(cc.organization_id, 'editor')));
create policy "editors update competitor videos" on competitor_videos for update to authenticated
  using (exists (select 1 from competitor_channels cc where cc.id = competitor_channel_id and has_org_role(cc.organization_id, 'editor')));
create policy "admins delete competitor videos" on competitor_videos for delete to authenticated
  using (exists (select 1 from competitor_channels cc where cc.id = competitor_channel_id and has_org_role(cc.organization_id, 'admin')));

alter table competitor_video_snapshots enable row level security;
create policy "members read competitor snapshots" on competitor_video_snapshots for select to authenticated
  using (exists (select 1 from competitor_videos cv join competitor_channels cc on cc.id = cv.competitor_channel_id
                 where cv.id = competitor_video_id and is_org_member(cc.organization_id)));
create policy "editors append competitor snapshots" on competitor_video_snapshots for insert to authenticated
  with check (exists (select 1 from competitor_videos cv join competitor_channels cc on cc.id = cv.competitor_channel_id
                      where cv.id = competitor_video_id and has_org_role(cc.organization_id, 'editor')));

alter table idea_tags enable row level security;
create policy "members read idea_tags" on idea_tags for select to authenticated
  using (exists (select 1 from ideas i where i.id = idea_id and is_org_member(i.organization_id)));
create policy "editors write idea_tags" on idea_tags for insert to authenticated
  with check (exists (select 1 from ideas i where i.id = idea_id and has_org_role(i.organization_id, 'editor')));
create policy "editors delete idea_tags" on idea_tags for delete to authenticated
  using (exists (select 1 from ideas i where i.id = idea_id and has_org_role(i.organization_id, 'editor')));

alter table sop_versions enable row level security;
create policy "members read sop versions" on sop_versions for select to authenticated
  using (exists (select 1 from sops s where s.id = sop_id and is_org_member(s.organization_id)));
create policy "editors append sop versions" on sop_versions for insert to authenticated
  with check (exists (select 1 from sops s where s.id = sop_id and has_org_role(s.organization_id, 'editor')));

alter table sop_video_links enable row level security;
create policy "members read sop_video_links" on sop_video_links for select to authenticated
  using (exists (select 1 from sops s where s.id = sop_id and is_org_member(s.organization_id)));
create policy "editors write sop_video_links" on sop_video_links for insert to authenticated
  with check (exists (select 1 from sops s where s.id = sop_id and has_org_role(s.organization_id, 'editor')));
create policy "editors delete sop_video_links" on sop_video_links for delete to authenticated
  using (exists (select 1 from sops s where s.id = sop_id and has_org_role(s.organization_id, 'editor')));

alter table sop_competitor_links enable row level security;
create policy "members read sop_competitor_links" on sop_competitor_links for select to authenticated
  using (exists (select 1 from sops s where s.id = sop_id and is_org_member(s.organization_id)));
create policy "editors write sop_competitor_links" on sop_competitor_links for insert to authenticated
  with check (exists (select 1 from sops s where s.id = sop_id and has_org_role(s.organization_id, 'editor')));
create policy "editors delete sop_competitor_links" on sop_competitor_links for delete to authenticated
  using (exists (select 1 from sops s where s.id = sop_id and has_org_role(s.organization_id, 'editor')));

alter table ai_conversations enable row level security;
create policy "users read their conversations" on ai_conversations for select to authenticated
  using (user_id = auth.uid() and is_org_member(organization_id));
create policy "users create conversations" on ai_conversations for insert to authenticated
  with check (user_id = auth.uid() and is_org_member(organization_id));
create policy "users update their conversations" on ai_conversations for update to authenticated
  using (user_id = auth.uid());
create policy "users delete their conversations" on ai_conversations for delete to authenticated
  using (user_id = auth.uid());

alter table ai_messages enable row level security;
create policy "users read their messages" on ai_messages for select to authenticated
  using (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "users append messages" on ai_messages for insert to authenticated
  with check (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- Users can mark their own notifications read.
create policy "users mark notifications read" on notifications for update to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Convenience views
-- ----------------------------------------------------------------------------

-- Latest snapshot per video (current metrics).
create or replace view video_current_metrics as
select distinct on (s.video_id)
  s.video_id, s.captured_at, s.views, s.impressions, s.ctr,
  s.avg_view_duration_secs, s.avg_percent_viewed, s.watch_time_hours,
  s.subscribers_gained, s.revenue, s.rpm
from video_metric_snapshots s
order by s.video_id, s.captured_at desc;

-- Current (highest-numbered) version per SOP.
create or replace view sop_current_versions as
select distinct on (v.sop_id) v.*
from sop_versions v
order by v.sop_id, v.version_number desc;

-- ---- 0002_auth_bootstrap.sql ----------------------------------------------
-- Auth bootstrap: auto-provision profiles, and a safe path to create the
-- first organization (plain INSERTs can't grant yourself membership under
-- RLS, so a SECURITY DEFINER function does the org + owner-membership pair).

-- Auto-create a profile row whenever a user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New user'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Create an organization and make the caller its owner, atomically.
create or replace function create_organization(org_name text, org_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_org uuid;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to create an organization';
  end if;
  insert into organizations (name, slug, created_by)
  values (org_name, org_slug, auth.uid())
  returning id into new_org;

  insert into organization_members (organization_id, user_id, role)
  values (new_org, auth.uid(), 'owner');

  return new_org;
end $$;

grant execute on function create_organization(text, text) to authenticated;

-- ---- 0003_productions.sql -------------------------------------------------
-- Production workspace: the shared video document + pipeline.
-- A production is the working doc (hook, script, packaging, goal); when it
-- ships, it links to a `videos` row where real metrics accumulate, closing
-- the goal → outcome loop.

create type production_stage as enum (
  'scripting', 'editing', 'packaging', 'scheduled', 'published'
);

create table productions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations (id) on delete cascade,
  channel_id        uuid not null references channels (id) on delete cascade,
  title             text not null,               -- working title
  stage             production_stage not null default 'scripting',
  assignee_id       uuid references profiles (id) on delete set null,
  due_date          date,
  scheduled_at      timestamptz,                 -- target publish moment

  topic             text,
  goal              text,                        -- e.g. "CTR ≥ 6%", "50k views in 30 days"
  goal_metric       text,                        -- 'ctr' | 'views' | 'avg_percent_viewed' | ...
  goal_target       numeric,

  hook_text         text,                        -- the written hook (first 30s)
  script_hook       text,
  script_body       text,
  script_outro      text,
  description       text,                        -- YouTube description draft
  title_candidates  jsonb not null default '[]', -- [{ text, starred }]
  thumbnail_concept text,
  reference_links   jsonb not null default '[]', -- [string]
  vo_status         text,                        -- 'not_started' | 'generated' | 'recorded' | 'final'
  asset_links       jsonb not null default '[]', -- [{ label, url }]
  checklists        jsonb not null default '{}', -- { [stage]: boolean[] } vs the stage's SOP steps
  notes             text,

  linked_video_id   uuid references videos (id) on delete set null,
  created_by        uuid references profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index productions_org_stage_idx on productions (organization_id, stage);
create index productions_channel_idx on productions (channel_id);

create trigger productions_set_updated_at
  before update on productions
  for each row execute function set_updated_at();

-- Role gate: everyone edits, only admins/owners post. Moving INTO
-- scheduled/published requires admin — enforced in the database so it holds
-- for every client.
create or replace function enforce_publish_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage in ('scheduled', 'published')
     and new.stage is distinct from old.stage
     and not has_org_role(new.organization_id, 'admin') then
    raise exception 'Only an owner or admin can move a video to %', new.stage;
  end if;
  return new;
end $$;

create trigger productions_publish_gate
  before update on productions
  for each row execute function enforce_publish_gate();

-- Standard org RLS grid.
alter table productions enable row level security;
create policy "members read productions" on productions for select to authenticated
  using (is_org_member(organization_id));
create policy "editors write productions" on productions for insert to authenticated
  with check (has_org_role(organization_id, 'editor'));
create policy "editors update productions" on productions for update to authenticated
  using (has_org_role(organization_id, 'editor'));
create policy "admins delete productions" on productions for delete to authenticated
  using (has_org_role(organization_id, 'admin'));

-- ============================================================================
-- ---- 0004_youtube_publishing.sql ------------------------------------------
-- Per-channel OAuth refresh tokens for one-click YouTube auto-upload.
-- Locked down: RLS on with NO policies, so only the service role (edge
-- functions) can ever touch the tokens. Members see connection status via view.
-- ============================================================================

create table youtube_credentials (
  channel_id         uuid primary key references channels (id) on delete cascade,
  youtube_channel_id text,
  refresh_token      text not null,
  scope              text,
  connected_by       uuid references profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger youtube_credentials_set_updated_at
  before update on youtube_credentials
  for each row execute function set_updated_at();

alter table youtube_credentials enable row level security;
-- No policies on purpose. Only the service role (edge functions) may access it.

-- Members may see WHETHER a channel is connected, without the token, via this view.
create or replace view youtube_connection_status as
select channel_id, youtube_channel_id, created_at
from youtube_credentials;

-- ============================================================================
-- ---- 0005_competitor_channel_scan.sql -------------------------------------
-- Channel-level competitor intelligence: a scan pulls a competitor channel's
-- recent uploads in bulk and rolls them up into these headline stats.
-- ============================================================================

alter table competitor_channels
  add column if not exists url                  text,
  add column if not exists handle               text,
  add column if not exists thumbnail_url        text,
  add column if not exists subscriber_count     bigint,
  add column if not exists tracked_video_count  integer,
  add column if not exists outlier_count        integer,
  add column if not exists median_views_per_day numeric,
  add column if not exists upload_cadence_days  numeric,
  add column if not exists last_scanned_at      timestamptz;
