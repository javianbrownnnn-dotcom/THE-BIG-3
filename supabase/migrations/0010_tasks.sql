-- Team task manager (replaces the Reports page in the UI). A lightweight
-- kanban: todo → doing → done, with an assignee and a due date. Discord
-- notifications are sent client-side through the org's webhook (stored in the
-- existing integrations table, provider='discord' — non-secret config).

create table tasks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  title            text not null,
  notes            text,
  status           text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_id      uuid references profiles (id) on delete set null,
  due_at           timestamptz,
  created_by       uuid references profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index tasks_org_idx on tasks (organization_id, status, due_at);

create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

alter table tasks enable row level security;
create policy "members read tasks" on tasks for select to authenticated
  using (is_org_member(organization_id));
create policy "editors write tasks" on tasks for insert to authenticated
  with check (has_org_role(organization_id, 'editor'));
create policy "editors update tasks" on tasks for update to authenticated
  using (has_org_role(organization_id, 'editor'));
create policy "editors delete tasks" on tasks for delete to authenticated
  using (has_org_role(organization_id, 'editor'));

-- The Discord webhook + member mapping live in the existing integrations
-- table (provider='discord', config jsonb) — RLS for it ships in 0001.
