-- Close the learning loop. A recommendation can now carry the *concrete* SOP
-- edit the loop drafted (purpose/steps/change summary) as a mutable draft.
-- Approving it writes that draft as a new, immutable sop_versions row — so the
-- append-only history invariant holds: the draft lives here until a human OKs
-- it, and only then becomes a permanent version.

alter table ai_recommendations
  add column if not exists proposed_change jsonb;
-- shape: { sop_id?, sop_title, category?, purpose, when_to_use?, steps[],
--          examples?, change_summary }
