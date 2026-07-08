-- Shorts join the pipeline: a production doc is long-form by default, or a
-- short. Published docs carry the format onto the tracked video row, so
-- analytics can compare like with like.

alter table productions
  add column if not exists format video_format not null default 'long_form';
