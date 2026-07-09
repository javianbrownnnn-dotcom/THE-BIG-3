-- Fact-check workflow: every unverified claim (research packet, [FACT-CHECK]
-- marks in scripts, critique findings) becomes a tracked item that must be
-- verified (with a source) or consciously waived before a project can finish.
-- For a channel about living people, this is the safety rail.

alter table content_projects
  add column if not exists fact_checks jsonb;
