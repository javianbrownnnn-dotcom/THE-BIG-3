-- Team invites. The onboarding flow only lets a signed-in user CREATE an org;
-- this adds the missing half — inviting others INTO an existing org. An admin
-- mints an invite (a random code with a role); the invitee signs up and
-- redeems the code to join, no email/SMTP setup required.

create table org_invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  code             text not null unique,
  email            text,                         -- optional, just a label/reminder
  role             org_role not null default 'editor',
  created_by       uuid references profiles (id),
  expires_at       timestamptz not null default now() + interval '14 days',
  accepted_by      uuid references profiles (id),
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index org_invites_org_idx on org_invites (organization_id);

alter table org_invites enable row level security;
-- Members see their org's invites; admins/owners mint and revoke them.
create policy "members read invites" on org_invites for select to authenticated
  using (is_org_member(organization_id));
create policy "admins create invites" on org_invites for insert to authenticated
  with check (has_org_role(organization_id, 'admin'));
create policy "admins delete invites" on org_invites for delete to authenticated
  using (has_org_role(organization_id, 'admin'));

-- Redeem an invite. SECURITY DEFINER so a not-yet-member can join via a valid
-- code (the org_members insert policy otherwise requires you to already be an
-- admin of that org). Validates the code, enforces single-use + expiry.
create or replace function redeem_invite(invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv org_invites;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to redeem an invite';
  end if;
  select * into inv from org_invites where code = invite_code;
  if inv.id is null then raise exception 'Invalid invite code'; end if;
  if inv.accepted_at is not null then raise exception 'This invite has already been used'; end if;
  if inv.expires_at < now() then raise exception 'This invite has expired'; end if;

  insert into organization_members (organization_id, user_id, role)
  values (inv.organization_id, auth.uid(), inv.role)
  on conflict (organization_id, user_id) do nothing;

  update org_invites set accepted_by = auth.uid(), accepted_at = now() where id = inv.id;
  return inv.organization_id;
end $$;
grant execute on function redeem_invite(text) to authenticated;
