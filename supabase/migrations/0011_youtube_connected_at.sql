-- Connection *status* for the owner OAuth, safe to show in the UI. The
-- refresh token itself stays locked in youtube_credentials (no read policies);
-- the youtube-oauth callback stamps this when a connection succeeds so the app
-- can show "connected" instead of a dead-looking Connect button.

alter table channels add column if not exists youtube_connected_at timestamptz;
