-- Shareable idea briefs. A member freezes a markdown brief of the org's
-- performance data behind an unguessable token; the public share-brief edge
-- function serves it read-only so an outside AI (ChatGPT etc.) can fetch it by
-- URL. RLS: members manage their org's briefs; anonymous access only via the
-- edge function (service role) with the exact token.

create table shared_briefs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  token            text not null unique,
  title            text not null default 'Idea brief',
  content_md       text not null,
  created_by       uuid references profiles (id),
  created_at       timestamptz not null default now()
);
create index shared_briefs_org_idx on shared_briefs (organization_id, created_at desc);

alter table shared_briefs enable row level security;
create policy "members read briefs" on shared_briefs for select to authenticated
  using (is_org_member(organization_id));
create policy "members create briefs" on shared_briefs for insert to authenticated
  with check (is_org_member(organization_id));
create policy "members delete briefs" on shared_briefs for delete to authenticated
  using (is_org_member(organization_id));
