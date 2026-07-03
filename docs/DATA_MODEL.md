# Data model

Full DDL: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
Conventions: UUID PKs, `created_at`/`updated_at`/`created_by` on every table,
snake_case in SQL ↔ camelCase in `src/types`.

## Entity map

```
organizations ─┬─ organization_members ── profiles (auth.users)
               ├─ channels ─┬─ channel_goals
               │            └─ videos ── video_metric_snapshots*        (append-only)
               ├─ competitor_channels ── competitor_videos ── competitor_video_snapshots*
               ├─ tags ── idea_tags ── ideas ──(links)── competitor_videos / sops
               ├─ sops ─┬─ sop_versions*                                (append-only)
               │        ├─ sop_video_links ── videos
               │        └─ sop_competitor_links ── competitor_videos
               ├─ ai_insights ── ai_recommendations ──► sop_versions (proposed)
               ├─ ai_conversations ── ai_messages
               ├─ reports
               ├─ notifications
               ├─ integrations / webhook_endpoints / automations
               └─ activity_log
```

`*` = append-only: a trigger (`forbid_mutation`) rejects UPDATE and DELETE.

## Why snapshots instead of columns

A video's "views" is not a value, it's a time series. `video_metric_snapshots`
records every observation (day 1, day 7, day 30, …) so the app can draw growth
curves, the loop can compare early CTR vs. late CTR, and no update ever
destroys information. `video_current_metrics` is a view returning the latest
snapshot per video for cheap list rendering.

The same pattern applies to competitors (`competitor_video_snapshots` with
`views_per_day` and `velocity`), which is what outlier detection runs on.

## SOP versioning

`sops` is a stable identity (title, category, review cadence). All content —
purpose, when-to-use, steps, examples — lives in `sop_versions`, keyed by
`(sop_id, version_number)`. Creating a "new version" is an INSERT; the
previous version is untouched, forever. `change_summary` records what changed
and why, and `source` records whether a human or the AI wrote it. The
`sop_current_versions` view returns the highest-numbered version per SOP.

## Recommendation outcome tracking

`ai_recommendations.status` walks a lifecycle:

```
proposed ──► accepted / rejected
    │
    └─► testing ──► validated / failed
```

While a recommendation is `testing`, the learning loop splits videos linked to
its SOP into published-before vs. published-after cohorts and computes the
metric delta (`measured_impact` jsonb: before/after means, sample sizes,
t-statistic). This is how the system gets more accurate over time — it keeps
score on itself.

## Row Level Security

- `is_org_member(org)` / `has_org_role(org, min_role)` are `SECURITY DEFINER`
  SQL helpers used by every policy (avoids recursive RLS on the membership
  table).
- Role ordering: `viewer < editor < admin < owner`.
- Standard grid: members **read**, editors **insert/update**, admins
  **delete**. Owner-only: org update/delete.
- Tables without a direct `organization_id` (snapshots, versions, links)
  resolve their org through the parent row inside the policy.
- Personal data (conversations, messages, notification read-state) is scoped
  to `auth.uid()`, not just the org.
