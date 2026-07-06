-- YouTube publishing credentials. Stores the per-channel OAuth refresh token
-- used to auto-upload videos. Deliberately locked down: RLS is enabled with
-- NO policies, so authenticated users (including org members) can never read
-- the tokens — only the edge functions, which use the service role and bypass
-- RLS, ever touch this table.

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
