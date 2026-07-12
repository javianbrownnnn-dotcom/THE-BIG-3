-- Allow whole-entity deletion to cascade through append-only history tables.
--
-- forbid_mutation() protected metric snapshots and SOP versions from being
-- rewritten — but it also fired on DELETEs cascading from a parent row, which
-- silently broke deleting a channel (its videos' snapshots block the cascade)
-- and made per-video deletion impossible. Removing an entire record together
-- with its history is not the same as rewriting history: individual history
-- rows still can never be updated or directly deleted.
--
-- pg_trigger_depth() = 1 means the statement targeted this table directly;
-- cascaded deletes arrive via the FK's internal trigger at depth > 1.

create or replace function forbid_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;  -- cascade from deleting the parent entity — allowed
  end if;
  raise exception '% rows are append-only and cannot be % (history is kept forever)', tg_table_name, lower(tg_op);
end $$;
