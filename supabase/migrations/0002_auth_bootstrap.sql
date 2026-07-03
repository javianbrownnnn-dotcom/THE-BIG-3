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
