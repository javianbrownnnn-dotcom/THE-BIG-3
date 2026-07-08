-- Modern Ambition Content Studio: a gated pipeline from topic to finished
-- documentary script (relevance → research → titles → thumbnail → outline →
-- script → critique → feedback), plus the Script Bible (reusable writing
-- rules distilled from feedback) and evolving viewer personas.
--
-- Design notes:
--   * Each pipeline artifact lives in a jsonb column on content_projects —
--     same pattern as ai_recommendations.proposed_change. Variants (titles,
--     thumbnail concepts) are arrays inside those documents; the selected one
--     is denormalized to its own column for querying.
--   * feedback_rules is the Script Bible: append rows, toggle active. Rules
--     are injected into every generation prompt.
--   * content_personas holds AI-proposed personas (the three built-ins ship
--     in code). New personas unlock at 30 and 100 completed projects, five max.

create table content_projects (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations (id) on delete cascade,
  channel_id          uuid references channels (id) on delete set null,
  topic               text not null,
  status              text not null default 'relevance',  -- relevance|research|titles|thumbnail|outline|script|critique|feedback|done
  primary_persona     text,
  secondary_persona   text,
  video_length_minutes integer not null default 15,       -- 15|18|20|25
  relevance           jsonb,
  research            jsonb,
  title_lab           jsonb,
  selected_title      text,
  thumbnail_lab       jsonb,
  selected_thumbnail  jsonb,
  thumbnail_variants  jsonb,   -- saved image/prompt variants incl. provider + selected flag
  outline             jsonb,
  script              text,
  critique            jsonb,
  feedback            jsonb,   -- ratings + notes from the human review
  linked_production_id uuid references productions (id) on delete set null,
  created_by          uuid references profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index content_projects_org_idx on content_projects (organization_id, status, updated_at desc);

drop trigger if exists content_projects_updated_at on content_projects;
create trigger content_projects_updated_at before update on content_projects
  for each row execute function set_updated_at();

create table feedback_rules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  category         text not null default 'general',  -- title|script|thumbnail|hook|ending|general
  rule             text not null,
  source_feedback  text,
  active           boolean not null default true,
  created_by       uuid references profiles (id),
  created_at       timestamptz not null default now()
);
create index feedback_rules_org_idx on feedback_rules (organization_id, active);

create table content_personas (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  name             text not null,
  definition       jsonb not null,   -- { ageRange, description, respondsTo[] }
  source           text not null default 'ai',
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index content_personas_org_idx on content_personas (organization_id, active);

do $$
declare t text;
begin
  foreach t in array array['content_projects','feedback_rules','content_personas'] loop
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
      'create policy "editors delete %s" on %I for delete to authenticated
       using (has_org_role(organization_id, ''editor''))', t, t);
  end loop;
end $$;
