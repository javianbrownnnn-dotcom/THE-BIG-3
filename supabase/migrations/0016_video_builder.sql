-- Video Builder: per-section narration (human-recorded), b-roll picks, and
-- render state live on the production doc. jsonb because the builder state is
-- a working document, not queryable history.

alter table productions add column if not exists builder jsonb;
