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
