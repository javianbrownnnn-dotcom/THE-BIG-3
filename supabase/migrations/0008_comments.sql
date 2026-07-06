-- Team collaboration: threaded comments on any doc (production video docs,
-- SOPs, ideas). @mentions are stored as member ids and fan out a notification
-- to each mentioned teammate, so the three of you can work inside the app.

create table comments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  entity_type      text not null,          -- 'production' | 'sop' | 'idea'
  entity_id        uuid not null,
  author_id        uuid not null references profiles (id) on delete cascade,
  body             text not null,
  mentions         uuid[] not null default '{}',
  created_at       timestamptz not null default now()
);
create index comments_entity_idx on comments (entity_type, entity_id, created_at);

alter table comments enable row level security;
create policy "members read comments" on comments for select to authenticated
  using (is_org_member(organization_id));
create policy "members write comments" on comments for insert to authenticated
  with check (is_org_member(organization_id) and author_id = auth.uid());
-- Authors delete their own; admins can moderate any.
create policy "delete own or admin comments" on comments for delete to authenticated
  using (author_id = auth.uid() or has_org_role(organization_id, 'admin'));
