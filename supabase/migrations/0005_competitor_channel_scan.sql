-- Channel-level competitor intelligence. A "scan" pulls a competitor channel's
-- recent uploads in bulk and rolls them up into these headline stats, so the
-- Competitors tab tracks whole channels in the niche, not just single videos.
-- All derived/append-friendly: a scan overwrites the rollup, never the videos.

alter table competitor_channels
  add column if not exists url                  text,
  add column if not exists handle               text,
  add column if not exists thumbnail_url        text,
  add column if not exists subscriber_count     bigint,
  add column if not exists tracked_video_count  integer,
  add column if not exists outlier_count        integer,
  add column if not exists median_views_per_day numeric,
  add column if not exists upload_cadence_days  numeric,
  add column if not exists last_scanned_at      timestamptz;
