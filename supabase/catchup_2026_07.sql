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
