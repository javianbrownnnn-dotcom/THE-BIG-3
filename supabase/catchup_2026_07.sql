-- Catch-up migrations for a live database created before mid-July 2026.
-- Safe to run more than once (everything is IF NOT EXISTS / OR REPLACE).
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. Fixes "Could not find the 'builder' column" (the Video Builder
-- error), enables deleting channels/videos with history, and sets the
-- 18-minute default for new Studio projects.

-- 0015 — fact-check workflow column (no-op if you already have it)
alter table content_projects
  add column if not exists fact_checks jsonb;

-- 0016 — Video Builder state on the production doc
alter table productions add column if not exists builder jsonb;

-- 0017 — let whole-entity deletes cascade through append-only history.
-- History rows still can never be updated or directly deleted; only a
-- cascade from deleting the parent entity passes.
create or replace function forbid_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;  -- cascade from deleting the parent entity — allowed
  end if;
  raise exception '% rows are append-only and cannot be % (history is kept forever)', tg_table_name, lower(tg_op);
end $$;

-- 0018 — new content projects default to 18 minutes (existing rows untouched)
alter table content_projects alter column video_length_minutes set default 18;

-- 0004 (backfill) — YouTube owner-connection storage. If this table is
-- missing, "Connect with Google" shows a green badge but never stores the
-- token, and CTR/retention/watch-time stay empty forever.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table if not exists youtube_credentials (
  channel_id         uuid primary key references channels (id) on delete cascade,
  youtube_channel_id text,
  refresh_token      text not null,
  scope              text,
  connected_by       uuid references profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists youtube_credentials_set_updated_at on youtube_credentials;
create trigger youtube_credentials_set_updated_at
  before update on youtube_credentials
  for each row execute function set_updated_at();

alter table youtube_credentials enable row level security;
-- No policies on purpose: only the service role (edge functions) may read
-- tokens. Members see connection status through this view instead.
create or replace view youtube_connection_status as
select channel_id, youtube_channel_id, created_at
from youtube_credentials;

-- 0011 (backfill) — the safe "connected" flag the app displays.
alter table channels add column if not exists youtube_connected_at timestamptz;
