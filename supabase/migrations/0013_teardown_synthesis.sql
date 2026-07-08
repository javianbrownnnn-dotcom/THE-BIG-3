-- Teardown synthesis: every 20 competitor teardowns, the learning loop
-- distills the winning mechanisms into SOP change proposals (human-approved)
-- and grounds every AI surface in the resulting playbook. That needs the FULL
-- teardown persisted per video — not just the two display fields.

alter table competitor_videos
  add column if not exists teardown    jsonb,
  add column if not exists teardown_at timestamptz;
