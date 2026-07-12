-- CI dataset loader for a LIVE Supabase workspace — July 2026 research cycles.
--
-- The deployed app runs against your real backend, so the CI data seeded into
-- the in-browser demo never appears there. Run this ONCE in the Supabase
-- dashboard: SQL Editor → New query → paste this whole file → Run.
--
-- Safe by construction:
--   • Purely additive — it never updates or deletes your existing rows, and
--     only fills in blank intel fields (notes/subs/url) on competitors you
--     already track under the same name.
--   • Idempotent — running it twice adds nothing the second time.
--   • Dedupes by name/title against whatever you already have.
--
-- What it loads: 70 competitor channels (business + christianity CI cycles),
-- 83 outlier videos with full teardowns + view snapshots, 79 deduplicated
-- ideas (with tags), 30 knowledge-base insights, the "Founder Reality"
-- channel with its 12-month projection goals, and 8 per-niche SOPs.

do $$
declare
  v_org uuid;
  v_founder uuid;
  v_rel uuid;
  v_ch uuid;
  v_row uuid;
  v_sop uuid;
begin
  select id into v_org from organizations order by created_at limit 1;
  if v_org is null then
    raise exception 'No organization found — open the app once to bootstrap, then rerun.';
  end if;

  create temp table if not exists _cc_map (seed_id text primary key, id uuid) on commit drop;
  create temp table if not exists _cv_map (seed_id text primary key, id uuid) on commit drop;

  -- ── "Founder Reality" channel (the business CI cycle's flagship) ──
  select id into v_founder from channels
    where organization_id = v_org and lower(name) = lower('Founder Reality') limit 1;
  if v_founder is null then
    insert into channels (organization_id, name, brand, niche, upload_cadence, description)
    values (v_org, 'Founder Reality', 'Founder Reality',
            'Modern ambition / authentic founder documentaries', '1.5 long-form / week + 2-3 clips per video',
            'We document ambitious people making real decisions. Not the polished version. Not inspiration porn. The actual journey — with all its failures, doubts, and messy realities. We center the founder''s voice and the specific decisions that defined their trajectory. Format: 14–16 min documentary, hero''s journey with failures integrated, distinctive human voice, minimal stock. Brand: deep blue + white + gold; thoughtful, direct, occasionally irreverent. Why it wins: more authentic than ColdFusion, more founder-centric than Wendover, faster than Company Man, more accessible than Lex Fridman — with community + multi-stream revenue from day 1. Full strategy: docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md §9.')
    returning id into v_founder;
  end if;

  if not exists (select 1 from channel_goals where channel_id = v_founder and metric = 'subscribers' and period = 'month 12') then
    insert into channel_goals (channel_id, metric, target_value, period, notes)
    values (v_founder, 'subscribers', 310000, 'month 12', 'CI projection (conservative): 28K @ mo3 → 85K @ mo6 → 175K @ mo9 → 310K @ mo12; 3M views/mo and ~$57K/mo total revenue at month 12.');
  end if;

  if not exists (select 1 from channel_goals where channel_id = v_founder and metric = 'ctr' and period = 'monthly') then
    insert into channel_goals (channel_id, metric, target_value, period, notes)
    values (v_founder, 'ctr', 7, 'monthly', '≥7–8% average CTR by month 3 (niche top-quartile packaging).');
  end if;

  if not exists (select 1 from channel_goals where channel_id = v_founder and metric = 'avg_percent_viewed' and period = 'monthly') then
    insert into channel_goals (channel_id, metric, target_value, period, notes)
    values (v_founder, 'avg_percent_viewed', 65, 'monthly', '≥65% completion — the report''s retention bar for the format.');
  end if;

  -- ── Your religion-niche channel (Christianity CI goals + SOPs attach here) ──
  select id into v_rel from channels
    where organization_id = v_org
      and niche ~* 'religio|myth|christ|bible|church|theolog'
    order by created_at limit 1;

  if v_rel is not null and not exists (select 1 from channel_goals where channel_id = v_rel and metric = 'subscribers' and period = 'month 12') then
    insert into channel_goals (channel_id, metric, target_value, period, notes)
    values (v_rel, 'subscribers', 93000, 'month 12', 'CI projection (Jul 2026, conservative): 600K views/mo and ~$7.6K/mo total revenue by month 12, from a ~15K-sub base at 2-3 uploads/month.');
  end if;

  if v_rel is not null and not exists (select 1 from channel_goals where channel_id = v_rel and metric = 'monthly_revenue' and period = 'month 12') then
    insert into channel_goals (channel_id, metric, target_value, period, notes)
    values (v_rel, 'monthly_revenue', 7600, 'month 12', 'Patronage-first ladder per the niche''s proven structure: AdSense $3.0K + Patreon $2.1K + courses $2.5K (60% non-ad). Sponsors excluded as upside.');
  end if;

  -- ── Competitor channels (70) — insert if missing, else fill blanks ──

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'magnatesmedia' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Magnates Media', 'Business documentaries', 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense + courses/products · AI: voice-generation. Mini-documentaries about business empires, founders, and wealth; rise-and-fall format — "Netflix for Entrepreneurs." Edge: format efficiency + course/product monetization; proven mini-doc system. What we can do better: add depth (longer, deeper investigations); community engagement; original footage and founder interviews (their AI voice weakens personal connection).', 'https://www.youtube.com/c/MagnatesMedia', 'UCE4Gn00XZbpWvGUfIslT-tA', 1700000, 3.5)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Business documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense + courses/products · AI: voice-generation. Mini-documentaries about business empires, founders, and wealth; rise-and-fall format — "Netflix for Entrepreneurs." Edge: format efficiency + course/product monetization; proven mini-doc system. What we can do better: add depth (longer, deeper investigations); community engagement; original footage and founder interviews (their AI voice weakens personal connection).'),
      url = coalesce(url, 'https://www.youtube.com/c/MagnatesMedia'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCE4Gn00XZbpWvGUfIslT-tA'),
      subscriber_count = coalesce(subscriber_count, 1700000),
      upload_cadence_days = coalesce(upload_cadence_days, 3.5)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_mag', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'religionforbreakfast' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'ReligionForBreakfast', 'Academic religion', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Patreon + courses · AI: none. Academic, nonsectarian religious studies explainers from a PhD scholar. The reference channel for ''religion explained without preaching or debunking.'' Edge: The only 1M+ channel doing strictly academic, nonsectarian religion explainers with real scholarly credentials on camera.. What we can do better: Leaves immersive long-form storytelling untouched - he explains topics, we can narrate them as 45-90 min sagas with sound design and arc; Rarely serializes; no multi-part ''history of a belief system'' epics that build binge watchlists; Under-produces atmosphere (music, pacing, cinematography) - we can match his rigor while beating him on emotional experience.', 'https://www.youtube.com/@ReligionForBreakfast', 'UCct9aR7HC79Cv2g-9oDOTLw', 1230000, 14)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Academic religion'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Patreon + courses · AI: none. Academic, nonsectarian religious studies explainers from a PhD scholar. The reference channel for ''religion explained without preaching or debunking.'' Edge: The only 1M+ channel doing strictly academic, nonsectarian religion explainers with real scholarly credentials on camera.. What we can do better: Leaves immersive long-form storytelling untouched - he explains topics, we can narrate them as 45-90 min sagas with sound design and arc; Rarely serializes; no multi-part ''history of a belief system'' epics that build binge watchlists; Under-produces atmosphere (music, pacing, cinematography) - we can match his rigor while beating him on emotional experience.'),
      url = coalesce(url, 'https://www.youtube.com/@ReligionForBreakfast'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCct9aR7HC79Cv2g-9oDOTLw'),
      subscriber_count = coalesce(subscriber_count, 1230000),
      upload_cadence_days = coalesce(upload_cadence_days, 14)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_rfb', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'esoterica' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Esoterica', 'Esoteric religious history', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · Patreon + products · AI: none. Rigorous academic deep dives into esotericism, Kabbalah, magic, alchemy and early Christian/Jewish history from Dr. Justin Sledge. Proves lecture-style scholarship on obscure texts scales to 1M subscribers. Edge: The only academically credentialed scholar covering occult and esoteric history at scale, with a community that treats the channel as a curriculum.. What we can do better: Zero visual storytelling - we can take the same source rigor and wrap it in cinematic narration, maps and reconstruction imagery he never uses; His Yahweh/early-Christianity videos massively outperform but he stays anchored to occultism - the mainstream ancient-religion lane he proved demand for is open to us; No serialized narrative structure or entry-level on-ramps, so binge-friendly beginner journeys through ancient belief systems remain uncontested.', 'https://www.youtube.com/@TheEsotericaChannel', 'UCoydhtfFSk1fZXNRnkGnneQ', 1000000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Esoteric religious history'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · Patreon + products · AI: none. Rigorous academic deep dives into esotericism, Kabbalah, magic, alchemy and early Christian/Jewish history from Dr. Justin Sledge. Proves lecture-style scholarship on obscure texts scales to 1M subscribers. Edge: The only academically credentialed scholar covering occult and esoteric history at scale, with a community that treats the channel as a curriculum.. What we can do better: Zero visual storytelling - we can take the same source rigor and wrap it in cinematic narration, maps and reconstruction imagery he never uses; His Yahweh/early-Christianity videos massively outperform but he stays anchored to occultism - the mainstream ancient-religion lane he proved demand for is open to us; No serialized narrative structure or entry-level on-ramps, so binge-friendly beginner journeys through ancient belief systems remain uncontested.'),
      url = coalesce(url, 'https://www.youtube.com/@TheEsotericaChannel'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCoydhtfFSk1fZXNRnkGnneQ'),
      subscriber_count = coalesce(subscriber_count, 1000000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_eso', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'mrbeast' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'MrBeast', 'Extreme ambition/Wealth display/Entertainment', 'CI Jul 2026 · North Star · team ~40 · Multiple + products/newsletter · AI: editing-assist. High-budget entertainment through extreme giving and competition. Founder story through empire building narrative. Billionaire-status achievement. Edge: Founder-as-billionaire narrative; first YouTube-native billion-dollar business. What we can do better: Doesn''t show realistic risk or failure; Lower-income audience accessibility gap; Limited storytelling depth (format-driven).', 'https://www.youtube.com/@MrBeast', 'UCX6OQ3DkcsbYNE6H8uQQuVA', 380000000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Extreme ambition/Wealth display/Entertainment'),
      notes = coalesce(notes, 'CI Jul 2026 · North Star · team ~40 · Multiple + products/newsletter · AI: editing-assist. High-budget entertainment through extreme giving and competition. Founder story through empire building narrative. Billionaire-status achievement. Edge: Founder-as-billionaire narrative; first YouTube-native billion-dollar business. What we can do better: Doesn''t show realistic risk or failure; Lower-income audience accessibility gap; Limited storytelling depth (format-driven).'),
      url = coalesce(url, 'https://www.youtube.com/@MrBeast'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCX6OQ3DkcsbYNE6H8uQQuVA'),
      subscriber_count = coalesce(subscriber_count, 380000000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_mrbeast', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'coldfusion' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'ColdFusion', 'Business documentaries/Tech history/Company case studies', 'CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. In-depth documentaries on technology, history, business, and innovation. Research-heavy storytelling about companies and industries. Edge: Research-first methodology; Dagogo''s distinctive personality. What we can do better: Could explore more recent/trending topics; Limited product/course monetization; No community engagement tools (courses, community).', 'https://www.youtube.com/@ColdFusion', 'UC4QZ_LsYcvcq7qOsOhpAX4A', 5204053, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Business documentaries/Tech history/Company case studies'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. In-depth documentaries on technology, history, business, and innovation. Research-heavy storytelling about companies and industries. Edge: Research-first methodology; Dagogo''s distinctive personality. What we can do better: Could explore more recent/trending topics; Limited product/course monetization; No community engagement tools (courses, community).'),
      url = coalesce(url, 'https://www.youtube.com/@ColdFusion'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UC4QZ_LsYcvcq7qOsOhpAX4A'),
      subscriber_count = coalesce(subscriber_count, 5204053),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_coldfusion', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'wendoverproductions' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Wendover Productions', 'Geography/Economics/Logistics documentaries', 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Geographic and economic systems explained through logistics, aviation, and international business. Educational explainers on complex systems. Edge: Only channel focused on logistics as primary subject; Sam Denby''s expertise in aviation/geography. What we can do better: Underutilizes secondary income streams; Limited expansion into adjacent niches; Not leveraging CEO status (Nebula)effectively for cross-promotion.', 'https://www.youtube.com/@Wendoverproductions', 'UC9RM-iSvTu1uPJb8X5yp3EQ', 4900000, 14)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Geography/Economics/Logistics documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Geographic and economic systems explained through logistics, aviation, and international business. Educational explainers on complex systems. Edge: Only channel focused on logistics as primary subject; Sam Denby''s expertise in aviation/geography. What we can do better: Underutilizes secondary income streams; Limited expansion into adjacent niches; Not leveraging CEO status (Nebula)effectively for cross-promotion.'),
      url = coalesce(url, 'https://www.youtube.com/@Wendoverproductions'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UC9RM-iSvTu1uPJb8X5yp3EQ'),
      subscriber_count = coalesce(subscriber_count, 4900000),
      upload_cadence_days = coalesce(upload_cadence_days, 14)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_wendover_productions', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'modernmba' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Modern MBA', 'Business case studies/Strategic analysis', 'CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. Deep-dive business case studies with strategic analysis. Wall Street-level financial and operational breakdowns. For ambitious professionals. Edge: Emmy-winning production team + strategic depth; targets professional audience. What we can do better: Could explore emerging companies/startups more; No products/courses leveraging expertise; Limited international expansion.', 'https://www.youtube.com/c/ModernMBA', 'UCbzVRTkX3bzNZuBd9In4XyA', 789000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Business case studies/Strategic analysis'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. Deep-dive business case studies with strategic analysis. Wall Street-level financial and operational breakdowns. For ambitious professionals. Edge: Emmy-winning production team + strategic depth; targets professional audience. What we can do better: Could explore emerging companies/startups more; No products/courses leveraging expertise; Limited international expansion.'),
      url = coalesce(url, 'https://www.youtube.com/c/ModernMBA'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCbzVRTkX3bzNZuBd9In4XyA'),
      subscriber_count = coalesce(subscriber_count, 789000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_modern_mba', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'wallstreetmillennial' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Wall Street Millennial', 'Finance/Business/Markets', 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Markets, investing, companies, and financial controversies explained. Gen-Z financial education. Edge: Gen-Z voice in finance education; emerging creator status. What we can do better: Could dive deeper into specific investment strategies; Limited international markets; No product diversification.', 'https://www.youtube.com/@wallstreetmillennial', 'UCUyH4QfXX-5NOT0bULqG6lQ', 900000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Finance/Business/Markets'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Markets, investing, companies, and financial controversies explained. Gen-Z financial education. Edge: Gen-Z voice in finance education; emerging creator status. What we can do better: Could dive deeper into specific investment strategies; Limited international markets; No product diversification.'),
      url = coalesce(url, 'https://www.youtube.com/@wallstreetmillennial'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCUyH4QfXX-5NOT0bULqG6lQ'),
      subscriber_count = coalesce(subscriber_count, 900000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_wall_street_millennial', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'lexfridmanpodcast' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Lex Fridman Podcast', 'Long-form interviews/Ambitious figures/AI/Tech', 'CI Jul 2026 · Direct Competitor · team ~2 · Multiple · AI: none. Long-form interviews with ambitious figures in tech, AI, science, and philosophy. Profiles of world-changers. Edge: Access to elite researchers, founders, and thinkers; MIT platform. What we can do better: Could highlight clips/short-form content more; Limited diversification (all interview format); Underutilizes community building.', 'https://www.youtube.com/@lexfridman', 'UCSHZKyawb77ixDdsGog4iWA', 2500000, 9.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Long-form interviews/Ambitious figures/AI/Tech'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~2 · Multiple · AI: none. Long-form interviews with ambitious figures in tech, AI, science, and philosophy. Profiles of world-changers. Edge: Access to elite researchers, founders, and thinkers; MIT platform. What we can do better: Could highlight clips/short-form content more; Limited diversification (all interview format); Underutilizes community building.'),
      url = coalesce(url, 'https://www.youtube.com/@lexfridman'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCSHZKyawb77ixDdsGog4iWA'),
      subscriber_count = coalesce(subscriber_count, 2500000),
      upload_cadence_days = coalesce(upload_cadence_days, 9.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_lex_fridman_podcast', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'polymatter' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'PolyMatter', 'Economics/Business/Geography', 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. International business problems and economic policy explained. Geographic analysis of business expansion and market dynamics. Edge: Geography-business economics nexus; international focus. What we can do better: Could explore more startup/founder stories; Limited content on emerging markets; No audience monetization beyond ads.', 'https://www.youtube.com/channel/UCgNg3vwj3xt7QOrcIDaHdFg', 'UCgNg3vwj3xt7QOrcIDaHdFg', 2000000, 9.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Economics/Business/Geography'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. International business problems and economic policy explained. Geographic analysis of business expansion and market dynamics. Edge: Geography-business economics nexus; international focus. What we can do better: Could explore more startup/founder stories; Limited content on emerging markets; No audience monetization beyond ads.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UCgNg3vwj3xt7QOrcIDaHdFg'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCgNg3vwj3xt7QOrcIDaHdFg'),
      subscriber_count = coalesce(subscriber_count, 2000000),
      upload_cadence_days = coalesce(upload_cadence_days, 9.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_polymatter', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'economicsexplained' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Economics Explained', 'Economic documentaries/Systems explainer', 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Economic systems and policies explained simply. Makes complex economics accessible. Edge: High frequency + accessibility; growing rapidly. What we can do better: Could explore business applications more; Limited to education format; No product diversification.', 'https://www.youtube.com/c/ExplainedOutlook', 'null', 1200000, 3.5)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Economic documentaries/Systems explainer'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Economic systems and policies explained simply. Makes complex economics accessible. Edge: High frequency + accessibility; growing rapidly. What we can do better: Could explore business applications more; Limited to education format; No product diversification.'),
      url = coalesce(url, 'https://www.youtube.com/c/ExplainedOutlook'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 1200000),
      upload_cadence_days = coalesce(upload_cadence_days, 3.5)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_economics_explained', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'companyman' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Company Man', 'Company explainer/Business history', 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Company histories and business model explanations. How companies work and their origins. Edge: Owns the company explainer niche; unmatched consistency. What we can do better: Could go deeper into founder stories; Limited to company histories (not founders); No product or course monetization.', 'https://www.youtube.com/channel/UCQMyhrt92_8XM0KLm04dUEw', 'null', 2000000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Company explainer/Business history'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Company histories and business model explanations. How companies work and their origins. Edge: Owns the company explainer niche; unmatched consistency. What we can do better: Could go deeper into founder stories; Limited to company histories (not founders); No product or course monetization.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UCQMyhrt92_8XM0KLm04dUEw'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 2000000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_company_man', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'businesscasual' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Business Casual', 'Business/Finance history', 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Animated business history and finance stories. Turning boring financial history into engaging narratives. Edge: Animated business storytelling; unique visual style. What we can do better: Slow upload schedule limits growth; Could scale with team but requires investment; Limited beyond animation format.', 'https://www.youtube.com/channel/UC_E4px0RST-qFwXLJWBav8Q', 'null', 500000, 14)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Business/Finance history'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Animated business history and finance stories. Turning boring financial history into engaging narratives. Edge: Animated business storytelling; unique visual style. What we can do better: Slow upload schedule limits growth; Could scale with team but requires investment; Limited beyond animation format.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UC_E4px0RST-qFwXLJWBav8Q'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 500000),
      upload_cadence_days = coalesce(upload_cadence_days, 14)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_business_casual', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'internethistorian' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Internet Historian', 'Internet culture/History/Scandals', 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Internet history, scandals, and culture wars. Comedy-documentary hybrid about online phenomena. Edge: Comedy-documentary hybrid in internet culture space. What we can do better: Could expand to other cultural domains; Limited audience monetization; Slow growth due to upload frequency.', 'https://www.youtube.com/channel/UCR1IuLEqb6UEA_zQ81kwXfg', 'null', 2500000, 14)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Internet culture/History/Scandals'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Internet history, scandals, and culture wars. Comedy-documentary hybrid about online phenomena. Edge: Comedy-documentary hybrid in internet culture space. What we can do better: Could expand to other cultural domains; Limited audience monetization; Slow growth due to upload frequency.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UCR1IuLEqb6UEA_zQ81kwXfg'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 2500000),
      upload_cadence_days = coalesce(upload_cadence_days, 14)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_internet_historian', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'ycombinator' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Y Combinator', 'Startup education/Founder advice', 'CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. Startup education from the world''s top startup accelerator. Founder advice, fundraising, product-market fit. Edge: Direct access to YC network; highest-quality founder insights. What we can do better: Could improve production quality; Limited to existing YC community; Could use narrative storytelling more.', 'https://www.youtube.com/c/ycombinator', 'null', 1650000, 3.5)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Startup education/Founder advice'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. Startup education from the world''s top startup accelerator. Founder advice, fundraising, product-market fit. Edge: Direct access to YC network; highest-quality founder insights. What we can do better: Could improve production quality; Limited to existing YC community; Could use narrative storytelling more.'),
      url = coalesce(url, 'https://www.youtube.com/c/ycombinator'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 1650000),
      upload_cadence_days = coalesce(upload_cadence_days, 3.5)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_y_combinator', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'realengineering' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Real Engineering', 'Engineering/Technology/Projects', 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Engineering projects and technical innovation. How real engineering problems are solved. Edge: Engineering-focused; real project documentation. What we can do better: Could link projects to founder stories; Limited business/ambition angle; Underutilizes behind-the-scenes content.', 'https://www.youtube.com/channel/UCR1IuLEqb6UEA_zQ81kwXfg', 'null', 4000000, 9.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Engineering/Technology/Projects'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Engineering projects and technical innovation. How real engineering problems are solved. Edge: Engineering-focused; real project documentation. What we can do better: Could link projects to founder stories; Limited business/ambition angle; Underutilizes behind-the-scenes content.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UCR1IuLEqb6UEA_zQ81kwXfg'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 4000000),
      upload_cadence_days = coalesce(upload_cadence_days, 9.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_real_engineering', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'fortunemagazine' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Fortune Magazine', 'Business/Founder stories/Entrepreneurship', 'CI Jul 2026 · Direct Competitor · team ~8 · AdSense · AI: none. Business news and founder stories from Fortune magazine. Corporate profiles and entrepreneurship insights. Edge: Fortune brand + access to top executives. What we can do better: Could go deeper into individual stories; Limited to news-cycle topics; Underutilizes documentary format.', 'https://www.youtube.com/user/FORTUNEmagazine', 'null', 3500000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Business/Founder stories/Entrepreneurship'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~8 · AdSense · AI: none. Business news and founder stories from Fortune magazine. Corporate profiles and entrepreneurship insights. Edge: Fortune brand + access to top executives. What we can do better: Could go deeper into individual stories; Limited to news-cycle topics; Underutilizes documentary format.'),
      url = coalesce(url, 'https://www.youtube.com/user/FORTUNEmagazine'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 3500000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_fortune_magazine', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'thisweekinstartups' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'This Week in Startups', 'Startup news/Founder interviews', 'CI Jul 2026 · Emerging · team ~2 · AdSense + newsletter · AI: none. Weekly insights on startups, founders, and venture capital. Hosted by investor Jason Calacanis. Edge: Jason Calacanis credibility; high frequency; investor perspective. What we can do better: Could improve production quality; Limited geographic diversity of guests; Underutilizes clips/short-form content.', 'https://www.youtube.com/user/thisweekin', 'null', 351000, 2.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Startup news/Founder interviews'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging · team ~2 · AdSense + newsletter · AI: none. Weekly insights on startups, founders, and venture capital. Hosted by investor Jason Calacanis. Edge: Jason Calacanis credibility; high frequency; investor perspective. What we can do better: Could improve production quality; Limited geographic diversity of guests; Underutilizes clips/short-form content.'),
      url = coalesce(url, 'https://www.youtube.com/user/thisweekin'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 351000),
      upload_cadence_days = coalesce(upload_cadence_days, 2.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_this_week_in_startups', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'slidebean' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Slidebean', 'Startup education/Business stories', 'CI Jul 2026 · Emerging · team ~5 · AdSense + courses/products · AI: editing-assist. Startup education and pitch coaching. How to launch and grow startups. Edge: Product monetization; pitch coaching focus. What we can do better: Could feature founder stories; Limited differentiation from other startup channels; Underutilizes documentary format.', 'https://www.youtube.com/c/Slidebean', 'null', 662000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Startup education/Business stories'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging · team ~5 · AdSense + courses/products · AI: editing-assist. Startup education and pitch coaching. How to launch and grow startups. Edge: Product monetization; pitch coaching focus. What we can do better: Could feature founder stories; Limited differentiation from other startup channels; Underutilizes documentary format.'),
      url = coalesce(url, 'https://www.youtube.com/c/Slidebean'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 662000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_slidebean', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'startupgrind' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Startup Grind', 'Founder interviews/Startup stories', 'CI Jul 2026 · Emerging · team ~3 · AdSense · AI: none. Global community of entrepreneurs sharing real founder stories. Authentic accounts of startup journeys. Edge: Global founder community; authentic stories. What we can do better: Could improve production quality; Limited to existing Startup Grind community; Underutilizes narrative editing.', 'https://www.youtube.com/c/StartupGrind', 'null', 800000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Founder interviews/Startup stories'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging · team ~3 · AdSense · AI: none. Global community of entrepreneurs sharing real founder stories. Authentic accounts of startup journeys. Edge: Global founder community; authentic stories. What we can do better: Could improve production quality; Limited to existing Startup Grind community; Underutilizes narrative editing.'),
      url = coalesce(url, 'https://www.youtube.com/c/StartupGrind'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 800000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_startup_grind', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'newsthink' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'NewsThink', 'Science/Tech/Founder stories/Innovation', 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Science, technology, innovation, and founder stories explained. Tech trends and business implications. Edge: Founded by Cindy Pom after journalism career; emerging creator with momentum. What we can do better: Could explore more founder stories; Limited to science/tech (not pure business); No product diversification.', 'https://www.youtube.com/c/NewsThink', 'null', 1000000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Science/Tech/Founder stories/Innovation'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Science, technology, innovation, and founder stories explained. Tech trends and business implications. Edge: Founded by Cindy Pom after journalism career; emerging creator with momentum. What we can do better: Could explore more founder stories; Limited to science/tech (not pure business); No product diversification.'),
      url = coalesce(url, 'https://www.youtube.com/c/NewsThink'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 1000000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_newsthink', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'coinbureau' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Coin Bureau', 'Crypto/Blockchain/Tech investment', 'CI Jul 2026 · Emerging · team ~2 · AdSense · AI: none. Crypto education and blockchain project analysis. Investment insights for the crypto-curious. Edge: Credible crypto education; emerging creator with strong growth. What we can do better: Could connect to founder stories in crypto; Limited to crypto domain; Underutilizes documentary format.', 'https://www.youtube.com/channel/UCqnLvsynvxEeEAVtcIPlAzg', 'null', 2500000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Crypto/Blockchain/Tech investment'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging · team ~2 · AdSense · AI: none. Crypto education and blockchain project analysis. Investment insights for the crypto-curious. Edge: Credible crypto education; emerging creator with strong growth. What we can do better: Could connect to founder stories in crypto; Limited to crypto domain; Underutilizes documentary format.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UCqnLvsynvxEeEAVtcIPlAzg'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 2500000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_coin_bureau', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'howmoneyworks' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'How Money Works', 'Finance/Business documentaries', 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: voice-generation. Financial systems and money explained through documentary-style narratives. Edge: Finance education through narrative documentary. What we can do better: Could feature founder stories more; Limited to systems/finance (not companies); No product diversification.', 'https://www.youtube.com/c/HowMoneyWorks', 'null', 1500000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Finance/Business documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: voice-generation. Financial systems and money explained through documentary-style narratives. Edge: Finance education through narrative documentary. What we can do better: Could feature founder stories more; Limited to systems/finance (not companies); No product diversification.'),
      url = coalesce(url, 'https://www.youtube.com/c/HowMoneyWorks'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 1500000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_how_money_works', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'logicallyanswered' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Logically Answered', 'Tech/Social media economics', 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Tech and social media economics explained. How internet platforms actually work from a business perspective. Edge: Tech economics analysis; incentive-structure focus. What we can do better: Could feature tech founder stories; Limited to tech domain; No audience monetization.', 'https://www.youtube.com/c/LogicallyAnswered', 'null', 800000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Tech/Social media economics'),
      notes = coalesce(notes, 'CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Tech and social media economics explained. How internet platforms actually work from a business perspective. Edge: Tech economics analysis; incentive-structure focus. What we can do better: Could feature tech founder stories; Limited to tech domain; No audience monetization.'),
      url = coalesce(url, 'https://www.youtube.com/c/LogicallyAnswered'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 800000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_logically_answered', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'realstories' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Real Stories', 'General documentaries/Human stories', 'CI Jul 2026 · Emerging · team ~3 · AdSense · AI: none. Curated documentaries about real human experiences. Deep dives into personal stories and transformations. Edge: Curated documentary quality; human story focus. What we can do better: Could explore founder/ambition stories more; Limited to general documentaries; No business/entrepreneurship angle.', 'https://www.youtube.com/c/RealStories', 'null', 1500000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'General documentaries/Human stories'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging · team ~3 · AdSense · AI: none. Curated documentaries about real human experiences. Deep dives into personal stories and transformations. Edge: Curated documentary quality; human story focus. What we can do better: Could explore founder/ambition stories more; Limited to general documentaries; No business/entrepreneurship angle.'),
      url = coalesce(url, 'https://www.youtube.com/c/RealStories'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 1500000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_real_stories', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'dailydoseofinternet' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Daily Dose of Internet', 'Internet culture/Viral content curation', 'CI Jul 2026 · Emerging · team ~1 · AdSense · AI: none. Trending and viral videos curated and presented. Best of internet compilation format. Edge: Viral content curation; high frequency. What we can do better: No business/documentary angle; Limited storytelling; Trend-dependent algorithm risk.', 'https://www.youtube.com/channel/UCdC0An4ZPNr_YiFiYoVbwaw', 'null', 1500000, 3.5)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Internet culture/Viral content curation'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging · team ~1 · AdSense · AI: none. Trending and viral videos curated and presented. Best of internet compilation format. Edge: Viral content curation; high frequency. What we can do better: No business/documentary angle; Limited storytelling; Trend-dependent algorithm risk.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UCdC0An4ZPNr_YiFiYoVbwaw'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 1500000),
      upload_cadence_days = coalesce(upload_cadence_days, 3.5)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_daily_dose_of_internet', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'statquestwithjoshstarmer' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'StatQuest with Josh Starmer', 'AI/Machine learning/Education', 'CI Jul 2026 · Emerging · team ~1 · AdSense · AI: none. Statistics and machine learning demystified. Educational content for AI-curious professionals. Edge: Best-in-class statistical education. What we can do better: No business/ambition angle; Limited to technical education; Could connect to AI startup stories.', 'https://www.youtube.com/channel/UCtYLUTtgS3k1Fg4y5tAQliA', 'null', 1240000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'AI/Machine learning/Education'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging · team ~1 · AdSense · AI: none. Statistics and machine learning demystified. Educational content for AI-curious professionals. Edge: Best-in-class statistical education. What we can do better: No business/ambition angle; Limited to technical education; Could connect to AI startup stories.'),
      url = coalesce(url, 'https://www.youtube.com/channel/UCtYLUTtgS3k1Fg4y5tAQliA'),
      youtube_channel_id = coalesce(youtube_channel_id, 'null'),
      subscriber_count = coalesce(subscriber_count, 1240000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_statquest_with_josh_star', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'dwdocumentary' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'DW Documentary', 'General documentaries/Global stories', 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 5590000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'General documentaries/Global stories'),
      notes = coalesce(notes, 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 5590000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_dw_documentary', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'freedocumentary' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Free Documentary', 'General documentaries', 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 4940000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'General documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 4940000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_free_documentary', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'bestdocumentary' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Best Documentary', 'General documentaries/Curated', 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 800000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'General documentaries/Curated'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 800000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_best_documentary', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'themedicalfuturist' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'The Medical Futurist', 'Healthcare/Medical innovation/Future tech', 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 600000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Healthcare/Medical innovation/Future tech'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 600000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_the_medical_futurist', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'artedocumentary' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'ARTE Documentary', 'Documentary/Cultural stories', 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 2000000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Documentary/Cultural stories'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 2000000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_arte_documentary', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'nickrobinson' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Nick Robinson', 'Documentary/Mystery solving', 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 1300000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Documentary/Mystery solving'),
      notes = coalesce(notes, 'CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 1300000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_nick_robinson', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'blissfoster(fashion)' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Bliss Foster (Fashion)', 'Fashion history/Design analysis', 'CI Jul 2026 · Watch (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 400000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Fashion history/Design analysis'),
      notes = coalesce(notes, 'CI Jul 2026 · Watch (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 400000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_bliss_foster_fashion', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'garyvee(garyvaynerchuk)' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'GaryVee (Gary Vaynerchuk)', 'Entrepreneur/Personal brand/Motivation', 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 9500000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Entrepreneur/Personal brand/Motivation'),
      notes = coalesce(notes, 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 9500000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_garyvee_gary_vaynerchuk', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'tonyrobbins' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Tony Robbins', 'Self-help/Personal transformation', 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 10500000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Self-help/Personal transformation'),
      notes = coalesce(notes, 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 10500000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_tony_robbins', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'veritasium' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Veritasium', 'Science documentaries/Experiments', 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).', null, null, 12500000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Science documentaries/Experiments'),
      notes = coalesce(notes, 'CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 12500000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_ci_veritasium', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'let''stalkreligion' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Let''s Talk Religion', 'Comparative religion/Religious history documentaries', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · Patreon + newsletter · AI: none. Calm, academic long-form documentaries on world religions - especially Islam, Sufism and Christian history - from Swedish religious-studies scholar Filip Holm. 96M+ lifetime views across 400+ videos. Edge: The audio-first comparative-religion scholar whose videos work equally as podcasts, capturing listeners no visual-first channel reaches.. What we can do better: His Christianity coverage is occasional and survey-level - a dedicated, serialized early-Christianity storytelling arc would own the search terms he only grazes; Flat chronological essays skip character-driven drama; we can tell the same histories through people, conflicts and stakes; Minimal visual investment means we can win the same topics on YouTube''s browse/suggested surfaces with cinematic packaging.', 'https://www.youtube.com/@LetsTalkReligion', 'UC9dRb4fbJQIbQ3KHJZF_z0g', 1050000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Comparative religion/Religious history documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · Patreon + newsletter · AI: none. Calm, academic long-form documentaries on world religions - especially Islam, Sufism and Christian history - from Swedish religious-studies scholar Filip Holm. 96M+ lifetime views across 400+ videos. Edge: The audio-first comparative-religion scholar whose videos work equally as podcasts, capturing listeners no visual-first channel reaches.. What we can do better: His Christianity coverage is occasional and survey-level - a dedicated, serialized early-Christianity storytelling arc would own the search terms he only grazes; Flat chronological essays skip character-driven drama; we can tell the same histories through people, conflicts and stakes; Minimal visual investment means we can win the same topics on YouTube''s browse/suggested surfaces with cinematic packaging.'),
      url = coalesce(url, 'https://www.youtube.com/@LetsTalkReligion'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UC9dRb4fbJQIbQ3KHJZF_z0g'),
      subscriber_count = coalesce(subscriber_count, 1050000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_let_s_talk_religion', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'hochelaga' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Hochelaga', 'Religious mysteries/Biblical lore/Atmospheric storytelling', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · AdSense · AI: none. Atmospheric, cinematic storytelling about biblical lore, religious mysteries and strange history from Cambridge-trained Tommie Trelawny. Crossed 1M subscribers the week of July 7, 2026. Edge: The strongest cinematic mood and curiosity packaging in the religion niche - he makes religious history feel like an unsolved mystery.. What we can do better: Atmosphere without academic depth - we can deliver his cinematic feel plus citations and scholar-grade rigor, owning viewers who graduate past ''spooky Bible facts''; No fan monetization ladder (no Patreon/courses/products visible), so his superfans have nowhere to spend - ours will; Sub-20-minute one-offs leave the 45+ minute definitive deep-dive on the same topics (Nephilim, apocrypha, relics) available to us.', 'https://www.youtube.com/@hochelaga', 'UCjP-MiAEn9DPvUHNyGEs7Wg', 1000000, 17.5)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Religious mysteries/Biblical lore/Atmospheric storytelling'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · AdSense · AI: none. Atmospheric, cinematic storytelling about biblical lore, religious mysteries and strange history from Cambridge-trained Tommie Trelawny. Crossed 1M subscribers the week of July 7, 2026. Edge: The strongest cinematic mood and curiosity packaging in the religion niche - he makes religious history feel like an unsolved mystery.. What we can do better: Atmosphere without academic depth - we can deliver his cinematic feel plus citations and scholar-grade rigor, owning viewers who graduate past ''spooky Bible facts''; No fan monetization ladder (no Patreon/courses/products visible), so his superfans have nowhere to spend - ours will; Sub-20-minute one-offs leave the 45+ minute definitive deep-dive on the same topics (Nephilim, apocrypha, relics) available to us.'),
      url = coalesce(url, 'https://www.youtube.com/@hochelaga'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCjP-MiAEn9DPvUHNyGEs7Wg'),
      subscriber_count = coalesce(subscriber_count, 1000000),
      upload_cadence_days = coalesce(upload_cadence_days, 17.5)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_hochelaga', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'usefulcharts' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'UsefulCharts', 'Religion/History explained via charts and timelines', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~8 · Products + products · AI: none. History and religion explained through family trees, timelines and charts by Dr. Matt Baker (PhD Religious Studies). A chart company (founded 2018, Vancouver storefront) with a 2M-subscriber YouTube channel as its marketing engine. Edge: The only channel in the niche with a genuine physical-products company behind it - a content-to-commerce flywheel competitors haven''t replicated.. What we can do better: Charts show the ''what'' but never the ''why it mattered'' - immersive narrative treatments of the same lineages (Herods, apostles, church fathers) are ours to take; His religion videos are structural overviews, not source-driven storytelling - we can be the depth destination his viewers click to next; Physical-product moat doesn''t extend to digital community, courses or serialized series, leaving the recurring-revenue superfan layer open.', 'https://www.youtube.com/@UsefulCharts', null, 2000000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Religion/History explained via charts and timelines'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~8 · Products + products · AI: none. History and religion explained through family trees, timelines and charts by Dr. Matt Baker (PhD Religious Studies). A chart company (founded 2018, Vancouver storefront) with a 2M-subscriber YouTube channel as its marketing engine. Edge: The only channel in the niche with a genuine physical-products company behind it - a content-to-commerce flywheel competitors haven''t replicated.. What we can do better: Charts show the ''what'' but never the ''why it mattered'' - immersive narrative treatments of the same lineages (Herods, apostles, church fathers) are ours to take; His religion videos are structural overviews, not source-driven storytelling - we can be the depth destination his viewers click to next; Physical-product moat doesn''t extend to digital community, courses or serialized series, leaving the recurring-revenue superfan layer open.'),
      url = coalesce(url, 'https://www.youtube.com/@UsefulCharts'),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 2000000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_usefulcharts', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'voicesofthepast' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Voices of the Past', 'Primary-source history storytelling/Narrated documentaries', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · AdSense · AI: none. History told through firsthand written accounts - diaries, letters and chronicles from people who were there, including early Christian and ancient religious texts. Run by David Kelly (History of the Universe; brother of History Time''s Pete Kelly). Edge: Owns the ''hear history from the people who lived it'' format with production-grade voice acting no religion channel matches.. What we can do better: Religious sources appear only occasionally amid general history - a channel doing the same immersive treatment exclusively for ancient belief and early Christian texts (martyr acts, Gnostic gospels, church fathers) would own that sub-audience outright; Accounts are presented raw with little scholarly interpretation - we can pair immersion with academic framing of what the source reveals about belief; Faceless anthology model builds no personal authority or community ladder - our named, credentialed storytelling brand can convert the same viewers into members.', 'https://www.youtube.com/@VoicesofthePast', 'UCqoGR_EedlhKDVuWNwYWRbg', 930000, 14)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Primary-source history storytelling/Narrated documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · AdSense · AI: none. History told through firsthand written accounts - diaries, letters and chronicles from people who were there, including early Christian and ancient religious texts. Run by David Kelly (History of the Universe; brother of History Time''s Pete Kelly). Edge: Owns the ''hear history from the people who lived it'' format with production-grade voice acting no religion channel matches.. What we can do better: Religious sources appear only occasionally amid general history - a channel doing the same immersive treatment exclusively for ancient belief and early Christian texts (martyr acts, Gnostic gospels, church fathers) would own that sub-audience outright; Accounts are presented raw with little scholarly interpretation - we can pair immersion with academic framing of what the source reveals about belief; Faceless anthology model builds no personal authority or community ladder - our named, credentialed storytelling brand can convert the same viewers into members.'),
      url = coalesce(url, 'https://www.youtube.com/@VoicesofthePast'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCqoGR_EedlhKDVuWNwYWRbg'),
      subscriber_count = coalesce(subscriber_count, 930000),
      upload_cadence_days = coalesce(upload_cadence_days, 14)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_voices_of_the_past', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'danmcclellan' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Dan McClellan', 'Biblical scholarship/Data-over-dogma short-form rebuttals', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · Book sales + Data Over Dogma podcast Patreon (video content itself deliberately unmonetized) + products/newsletter · AI: none. PhD biblical scholar debunking pop claims about the Bible in rapid short-form rebuttals. ''Data over dogma'' — stitch-style responses to apologists and influencers, ported from a 1M+ TikTok following. Edge: The only credentialed scholar winning the short-form algorithm war in biblical studies, with a TikTok audience an order of magnitude larger than his YouTube base.. What we can do better: He never tells stories — everything is rebuttal, so the viewer who wants immersive narrative about the ancient world (our lane) leaves his channel unsatisfied; No long-form YouTube-native catalog: we can convert his short-form-primed audience into 30-60 min deep dives he will never make; His content is Bible-only; the comparative ancient-religions frame (Mesopotamia, Egypt, Greco-Roman cults) he name-checks but never develops is wide open for us.', 'https://www.youtube.com/@maklelan', 'UCAAJCQ0FCqRmAEv95SyTfNg', 170000, 1)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Biblical scholarship/Data-over-dogma short-form rebuttals'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · Book sales + Data Over Dogma podcast Patreon (video content itself deliberately unmonetized) + products/newsletter · AI: none. PhD biblical scholar debunking pop claims about the Bible in rapid short-form rebuttals. ''Data over dogma'' — stitch-style responses to apologists and influencers, ported from a 1M+ TikTok following. Edge: The only credentialed scholar winning the short-form algorithm war in biblical studies, with a TikTok audience an order of magnitude larger than his YouTube base.. What we can do better: He never tells stories — everything is rebuttal, so the viewer who wants immersive narrative about the ancient world (our lane) leaves his channel unsatisfied; No long-form YouTube-native catalog: we can convert his short-form-primed audience into 30-60 min deep dives he will never make; His content is Bible-only; the comparative ancient-religions frame (Mesopotamia, Egypt, Greco-Roman cults) he name-checks but never develops is wide open for us.'),
      url = coalesce(url, 'https://www.youtube.com/@maklelan'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCAAJCQ0FCqRmAEv95SyTfNg'),
      subscriber_count = coalesce(subscriber_count, 170000),
      upload_cadence_days = coalesce(upload_cadence_days, 1)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_dan_mcclellan', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'mythvisionpodcast' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'MythVision Podcast', 'Critical biblical scholarship interviews/Long-form podcast', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Patreon + channel memberships + paid courses (mvp-courses.com) + courses · AI: edit. The interview hub of critical biblical scholarship — Derek Lambert books virtually every major secular scholar (Ehrman, Tabor, Fredriksen, Dennis MacDonald) for multi-hour conversations. Owns the scholar-access lane. Edge: Scholar access as a moat — he has made himself the default distribution channel for critical biblical scholars promoting new work.. What we can do better: Raw interviews are unedited ore: we can synthesize the same scholarship into scripted, visual, narrative documentaries — the refined product his audience upgrades to; Zero cinematic craft means his catalog has no rewatch or share value; a produced retelling of the same material outcompetes it in browse and suggested feeds; He is locked to the deconstruction-audience frame; a neutral ''ancient meaning-making'' framing can capture the far larger curious-but-not-angry audience he alienates.', 'https://www.youtube.com/@MythVisionPodcast', 'UCWVCimOe67LOfyi9PjUeGgA', 350000, 1)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Critical biblical scholarship interviews/Long-form podcast'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Patreon + channel memberships + paid courses (mvp-courses.com) + courses · AI: edit. The interview hub of critical biblical scholarship — Derek Lambert books virtually every major secular scholar (Ehrman, Tabor, Fredriksen, Dennis MacDonald) for multi-hour conversations. Owns the scholar-access lane. Edge: Scholar access as a moat — he has made himself the default distribution channel for critical biblical scholars promoting new work.. What we can do better: Raw interviews are unedited ore: we can synthesize the same scholarship into scripted, visual, narrative documentaries — the refined product his audience upgrades to; Zero cinematic craft means his catalog has no rewatch or share value; a produced retelling of the same material outcompetes it in browse and suggested feeds; He is locked to the deconstruction-audience frame; a neutral ''ancient meaning-making'' framing can capture the far larger curious-but-not-angry audience he alienates.'),
      url = coalesce(url, 'https://www.youtube.com/@MythVisionPodcast'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCWVCimOe67LOfyi9PjUeGgA'),
      subscriber_count = coalesce(subscriber_count, 350000),
      upload_cadence_days = coalesce(upload_cadence_days, 1)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_mythvision_podcast', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'bartd.ehrman' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Bart D. Ehrman', 'Critical New Testament scholarship/Lectures and courses', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~4 · Paid online courses and webinars (bartehrman.com), with charity-membership blog and book royalties alongside AdSense + courses/products/newsletter · AI: none. The most famous New Testament scholar alive running his own media funnel — weekly Misquoting Jesus podcast plus lecture clips, all feeding paid online courses, webinars, and a membership blog. Edge: He is the citation — other channels'' authority derives from quoting him, and he converts that primacy directly into course revenue.. What we can do better: His courses prove this audience pays hundreds of dollars for structured depth, but he serves it zero cinematic storytelling — we can be the visual-narrative complement he can''t produce; He rarely leaves the New Testament; the surrounding world of ancient Mediterranean religion, mystery cults, and comparative myth that contextualizes his material is our whitespace; His audience skews 50+; the same scholarship packaged with modern documentary pacing captures the 20-40 cohort before it ever finds him.', 'https://www.youtube.com/@bartdehrman', 'UCm9O8xILJQAs9LxaM4HiMOQ', 220000, 2.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Critical New Testament scholarship/Lectures and courses'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~4 · Paid online courses and webinars (bartehrman.com), with charity-membership blog and book royalties alongside AdSense + courses/products/newsletter · AI: none. The most famous New Testament scholar alive running his own media funnel — weekly Misquoting Jesus podcast plus lecture clips, all feeding paid online courses, webinars, and a membership blog. Edge: He is the citation — other channels'' authority derives from quoting him, and he converts that primacy directly into course revenue.. What we can do better: His courses prove this audience pays hundreds of dollars for structured depth, but he serves it zero cinematic storytelling — we can be the visual-narrative complement he can''t produce; He rarely leaves the New Testament; the surrounding world of ancient Mediterranean religion, mystery cults, and comparative myth that contextualizes his material is our whitespace; His audience skews 50+; the same scholarship packaged with modern documentary pacing captures the 20-40 cohort before it ever finds him.'),
      url = coalesce(url, 'https://www.youtube.com/@bartdehrman'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCm9O8xILJQAs9LxaM4HiMOQ'),
      subscriber_count = coalesce(subscriber_count, 220000),
      upload_cadence_days = coalesce(upload_cadence_days, 2.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_bart_d_ehrman', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'alexo''connor(cosmicskeptic)' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Alex O''Connor (CosmicSkeptic)', 'Philosophy of religion/Interviews and debates', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · Multiple + newsletter · AI: none. Oxford-trained philosopher hosting Within Reason — prestige long-form interviews and debates on God, the Bible, and meaning that both atheists and Christians watch. The niche''s crossover mainstream act. Edge: The only creator in the niche whom apologists, atheists, and legacy media all treat as a fair arbiter — neutrality itself is his brand.. What we can do better: He debates what ancient texts mean but never immerses viewers in the ancient world itself — his audience''s proven appetite for early-Christianity content has no narrative-documentary outlet on his channel; Argument is his product, story is ours: the same viewer who watches a 2-hour debate on the resurrection will watch a 1-hour cinematic history of how resurrection belief emerged; His output is guest-gated and non-scalable; a scripted catalog compounds in search and suggested traffic while his back catalog dates quickly with the news cycle.', 'https://www.youtube.com/@CosmicSkeptic', 'UC7kIy8fZavEni8Gzl8NLjOQ', 1990000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Philosophy of religion/Interviews and debates'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · Multiple + newsletter · AI: none. Oxford-trained philosopher hosting Within Reason — prestige long-form interviews and debates on God, the Bible, and meaning that both atheists and Christians watch. The niche''s crossover mainstream act. Edge: The only creator in the niche whom apologists, atheists, and legacy media all treat as a fair arbiter — neutrality itself is his brand.. What we can do better: He debates what ancient texts mean but never immerses viewers in the ancient world itself — his audience''s proven appetite for early-Christianity content has no narrative-documentary outlet on his channel; Argument is his product, story is ours: the same viewer who watches a 2-hour debate on the resurrection will watch a 1-hour cinematic history of how resurrection belief emerged; His output is guest-gated and non-scalable; a scripted catalog compounds in search and suggested traffic while his back catalog dates quickly with the news cycle.'),
      url = coalesce(url, 'https://www.youtube.com/@CosmicSkeptic'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UC7kIy8fZavEni8Gzl8NLjOQ'),
      subscriber_count = coalesce(subscriber_count, 1990000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_alex_o_connor_cosmicskep', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'fallofcivilizations' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Fall of Civilizations', 'Epic long-form history documentaries/Ancient civilizations', 'CI Jul 2026 (Christianity cycle) · North Star · team ~4 · Patreon (podcast-first patronage) + bestselling book + AdSense on multi-hour watch time + products · AI: none. Novelist-historian Paul Cooper''s 3-4 hour cinematic epics on how great civilizations collapsed — the acknowledged gold standard for narrative history documentary craft on YouTube. Edge: Proof that novelistic prose plus patient production can make 3-hour history videos mass-market — a moat of craft rather than volume.. What we can do better: He treats belief systems as scenery to political collapse; nobody has applied his epic elegiac format to religions themselves — ''the rise and fall of a god'' is our unclaimed franchise; His 2-3 releases a year leave his own audience starving between episodes; a monthly cadence at 60-90 minutes captures the same viewers in the gaps; No community, newsletter, or course layer — we can wrap comparable storytelling in the owned-audience infrastructure he never built.', 'https://www.youtube.com/@FallofCivilizations', 'UCT6Y5JJPKe_JDMivpKgVXew', 1400000, 53.8)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Epic long-form history documentaries/Ancient civilizations'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · North Star · team ~4 · Patreon (podcast-first patronage) + bestselling book + AdSense on multi-hour watch time + products · AI: none. Novelist-historian Paul Cooper''s 3-4 hour cinematic epics on how great civilizations collapsed — the acknowledged gold standard for narrative history documentary craft on YouTube. Edge: Proof that novelistic prose plus patient production can make 3-hour history videos mass-market — a moat of craft rather than volume.. What we can do better: He treats belief systems as scenery to political collapse; nobody has applied his epic elegiac format to religions themselves — ''the rise and fall of a god'' is our unclaimed franchise; His 2-3 releases a year leave his own audience starving between episodes; a monthly cadence at 60-90 minutes captures the same viewers in the gaps; No community, newsletter, or course layer — we can wrap comparable storytelling in the owned-audience infrastructure he never built.'),
      url = coalesce(url, 'https://www.youtube.com/@FallofCivilizations'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCT6Y5JJPKe_JDMivpKgVXew'),
      subscriber_count = coalesce(subscriber_count, 1400000),
      upload_cadence_days = coalesce(upload_cadence_days, 53.8)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_fall_of_civilizations', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'toldinstone' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'toldinstone', 'Greco-Roman antiquity/Everyday life/Early Christianity context', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · AdSense + Patreon + book royalties + video sponsors + products · AI: none. Dr. Garrett Ryan (PhD, Greek and Roman history) answers irresistibly specific questions about everyday life in classical antiquity — the scholarly channel that made ''what was it actually like?'' a format. Edge: Owns the ''daily life in antiquity'' micro-niche — the trusted answer to every oddly specific question about Rome.. What we can do better: He touches early Christianity only as Roman context and stays studiously above the fray; the full narrative treatment of how new religions lived and spread inside that world is left to us; His 12-minute format answers questions but never builds worlds — we can take his proven curiosity hooks and pay them off with hour-long immersive storytelling; Belief, ritual, and meaning are his weakest coverage areas within antiquity; ''what it was like to worship'' is an untouched twin of his ''what it was like to live'' franchise.', 'https://www.youtube.com/@toldinstone', 'UCqBiWcuTF8IaLH7wBqnihsQ', 640000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Greco-Roman antiquity/Everyday life/Early Christianity context'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · AdSense + Patreon + book royalties + video sponsors + products · AI: none. Dr. Garrett Ryan (PhD, Greek and Roman history) answers irresistibly specific questions about everyday life in classical antiquity — the scholarly channel that made ''what was it actually like?'' a format. Edge: Owns the ''daily life in antiquity'' micro-niche — the trusted answer to every oddly specific question about Rome.. What we can do better: He touches early Christianity only as Roman context and stays studiously above the fray; the full narrative treatment of how new religions lived and spread inside that world is left to us; His 12-minute format answers questions but never builds worlds — we can take his proven curiosity hooks and pay them off with hour-long immersive storytelling; Belief, ritual, and meaning are his weakest coverage areas within antiquity; ''what it was like to worship'' is an untouched twin of his ''what it was like to live'' franchise.'),
      url = coalesce(url, 'https://www.youtube.com/@toldinstone'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCqBiWcuTF8IaLH7wBqnihsQ'),
      subscriber_count = coalesce(subscriber_count, 640000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_toldinstone', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'historytime' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'History Time', 'Long-form ancient history documentaries', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · AdSense on multi-hour watch time + Patreon + Substack newsletter + newsletter · AI: none. Pete Kelly''s feature-length narrated documentaries on the ancient and early-medieval world — multi-hour epics on lost peoples, migrations, and early religious history produced by one man. Edge: The strongest one-person feature-documentary machine on YouTube — trust and tone that a decade of solo consistency built.. What we can do better: His epics narrate what happened to ancient peoples but rarely why they believed — the interior world of ritual, myth, and meaning inside his own topics is our entire channel; Chronicle format means no argument or payoff; structuring similar material around a driving question (why did this god die? why did this cult win?) beats it on retention; He has no course, community, or product layer and treats early Christianity as one topic among fifty — a focused ancient-religion catalog can own the niche he only visits.', 'https://www.youtube.com/@HistoryTime', 'UCN9v4QG3AQEP3zuRvVs2dAg', 1300000, 23.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Long-form ancient history documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~1 · AdSense on multi-hour watch time + Patreon + Substack newsletter + newsletter · AI: none. Pete Kelly''s feature-length narrated documentaries on the ancient and early-medieval world — multi-hour epics on lost peoples, migrations, and early religious history produced by one man. Edge: The strongest one-person feature-documentary machine on YouTube — trust and tone that a decade of solo consistency built.. What we can do better: His epics narrate what happened to ancient peoples but rarely why they believed — the interior world of ritual, myth, and meaning inside his own topics is our entire channel; Chronicle format means no argument or payoff; structuring similar material around a driving question (why did this god die? why did this cult win?) beats it on retention; He has no course, community, or product layer and treats early Christianity as one topic among fifty — a focused ancient-religion catalog can own the niche he only visits.'),
      url = coalesce(url, 'https://www.youtube.com/@HistoryTime'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCN9v4QG3AQEP3zuRvVs2dAg'),
      subscriber_count = coalesce(subscriber_count, 1300000),
      upload_cadence_days = coalesce(upload_cadence_days, 23.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_history_time', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'cogito' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Cogito', 'Animated history of religions/Explainer documentaries', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Multiple · AI: none. Neutral animated histories of world religions and peoples (History of Christianity, Judaism, Zoroastrianism). The calm, even-handed ''religion explained'' documentary channel run by Irish animator Domhnall O Luchrain. Edge: The default neutral animated survey of every major religion — the Wikipedia-with-animation of the niche.. What we can do better: Surveys stay at overview altitude — we can own the deep narrative layer (one council, one heresy, one text per episode) his format never reaches; His cadence leaves months of audience demand unserved; a reliable weekly-to-biweekly schedule in the same lane captures his waiting audience; No storytelling voice or human protagonist — our character-driven, primary-source storytelling gives emotional stakes his neutral surveys deliberately avoid.', 'https://www.youtube.com/@CogitoEdu', 'UCKMnl27hDMKvch--noWe5CA', 900000, 28)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Animated history of religions/Explainer documentaries'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Multiple · AI: none. Neutral animated histories of world religions and peoples (History of Christianity, Judaism, Zoroastrianism). The calm, even-handed ''religion explained'' documentary channel run by Irish animator Domhnall O Luchrain. Edge: The default neutral animated survey of every major religion — the Wikipedia-with-animation of the niche.. What we can do better: Surveys stay at overview altitude — we can own the deep narrative layer (one council, one heresy, one text per episode) his format never reaches; His cadence leaves months of audience demand unserved; a reliable weekly-to-biweekly schedule in the same lane captures his waiting audience; No storytelling voice or human protagonist — our character-driven, primary-source storytelling gives emotional stakes his neutral surveys deliberately avoid.'),
      url = coalesce(url, 'https://www.youtube.com/@CogitoEdu'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCKMnl27hDMKvch--noWe5CA'),
      subscriber_count = coalesce(subscriber_count, 900000),
      upload_cadence_days = coalesce(upload_cadence_days, 28)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_cogito', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'overlysarcasticproductions' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Overly Sarcastic Productions', 'Mythology and legends storytelling/Animated summaries', 'CI Jul 2026 (Christianity cycle) · North Star · team ~5 · Multiple + products · AI: none. Two hosts (Red: mythology and literature, Blue: history) deliver fast, funny illustrated summaries of myths, classics, and world history. Comedy-education hybrid that made comparative mythology a mainstream young-audience genre. Edge: The strongest creator-fandom relationship in the mythology space, built on personality and owned art rather than production budget.. What we can do better: They serve myths as entertainment, not meaning — our ''Myth & Meaning'' framing (why people believed, ritual, archaeology) is the graduation path for their maturing audience; Almost no coverage of early Christianity or religion-as-history; the biggest myth-adjacent topic on YouTube is left to apologists and we can take it with academic storytelling; No long-form documentary format — a 60-90 minute cinematic treatment of stories they cover in 15 comic minutes captures the same search terms at higher watch time.', 'https://www.youtube.com/@OverlySarcasticProductions', 'UCodbH5mUeF-m_BsNueRDjcw', 2540000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Mythology and legends storytelling/Animated summaries'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · North Star · team ~5 · Multiple + products · AI: none. Two hosts (Red: mythology and literature, Blue: history) deliver fast, funny illustrated summaries of myths, classics, and world history. Comedy-education hybrid that made comparative mythology a mainstream young-audience genre. Edge: The strongest creator-fandom relationship in the mythology space, built on personality and owned art rather than production budget.. What we can do better: They serve myths as entertainment, not meaning — our ''Myth & Meaning'' framing (why people believed, ritual, archaeology) is the graduation path for their maturing audience; Almost no coverage of early Christianity or religion-as-history; the biggest myth-adjacent topic on YouTube is left to apologists and we can take it with academic storytelling; No long-form documentary format — a 60-90 minute cinematic treatment of stories they cover in 15 comic minutes captures the same search terms at higher watch time.'),
      url = coalesce(url, 'https://www.youtube.com/@OverlySarcasticProductions'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCodbH5mUeF-m_BsNueRDjcw'),
      subscriber_count = coalesce(subscriber_count, 2540000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_overly_sarcastic_product', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'inspiringphilosophy' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'InspiringPhilosophy', 'Christian apologetics/Philosophy/Animated arguments', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · Multiple · AI: none. Michael Jones''s nonprofit ministry building ''the largest apologetic library on the internet'' — animated, citation-heavy defenses of Christianity spanning philosophy, quantum mechanics, Genesis, and the resurrection. Edge: The deepest single-channel apologetics reference library on YouTube, with nonprofit funding insulation from AdSense swings.. What we can do better: He argues, we narrate — the same source material (Genesis context, ancient cosmology, resurrection debates) told as neutral academic story reaches the far larger audience that clicks away from apologetics; His Genesis/ancient Near East videos prove demand for scholarly context, but his devotional frame concedes the secular-curious viewer to us entirely; No cinematic production or sound design — a visually premium treatment of identical topics wins the browse feed even against his SEO seniority.', 'https://www.youtube.com/@InspiringPhilosophy', 'UC5qDet6sa6rODi7t6wfpg8g', 530000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Christian apologetics/Philosophy/Animated arguments'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · Multiple · AI: none. Michael Jones''s nonprofit ministry building ''the largest apologetic library on the internet'' — animated, citation-heavy defenses of Christianity spanning philosophy, quantum mechanics, Genesis, and the resurrection. Edge: The deepest single-channel apologetics reference library on YouTube, with nonprofit funding insulation from AdSense swings.. What we can do better: He argues, we narrate — the same source material (Genesis context, ancient cosmology, resurrection debates) told as neutral academic story reaches the far larger audience that clicks away from apologetics; His Genesis/ancient Near East videos prove demand for scholarly context, but his devotional frame concedes the secular-curious viewer to us entirely; No cinematic production or sound design — a visually premium treatment of identical topics wins the browse feed even against his SEO seniority.'),
      url = coalesce(url, 'https://www.youtube.com/@InspiringPhilosophy'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UC5qDet6sa6rODi7t6wfpg8g'),
      subscriber_count = coalesce(subscriber_count, 530000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_inspiringphilosophy', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'redeemedzoomer' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Redeemed Zoomer', 'Denominational history/Theology explained for Gen Z', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Patreon · AI: none. Richard Ackerman explains denominations, theology, and church history to Gen Z with maps, drawings, and Minecraft — while running Operation Reformation, a movement to reclaim mainline Protestant churches for orthodoxy. Edge: He converted an explainer channel into a real-world religious movement — audience-as-community depth no competitor matches.. What we can do better: His church history is advocacy; ours is scholarship — the large audience that wants pre-Reformation and ancient-church storytelling without a denominational agenda is unserved by him; He rarely goes earlier than the Reformation in depth; the first five centuries (councils, canon, Christology fights) are our open lane with his exact audience; Zero production ambition — cinematic, sound-designed storytelling on the same topics feels like a category upgrade rather than a competitor.', 'https://www.youtube.com/@redeemedzoomer6053', 'UCiLqiXa5O85APUBQV7X5w9Q', 690000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Denominational history/Theology explained for Gen Z'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Patreon · AI: none. Richard Ackerman explains denominations, theology, and church history to Gen Z with maps, drawings, and Minecraft — while running Operation Reformation, a movement to reclaim mainline Protestant churches for orthodoxy. Edge: He converted an explainer channel into a real-world religious movement — audience-as-community depth no competitor matches.. What we can do better: His church history is advocacy; ours is scholarship — the large audience that wants pre-Reformation and ancient-church storytelling without a denominational agenda is unserved by him; He rarely goes earlier than the Reformation in depth; the first five centuries (councils, canon, Christology fights) are our open lane with his exact audience; Zero production ambition — cinematic, sound-designed storytelling on the same topics feels like a category upgrade rather than a competitor.'),
      url = coalesce(url, 'https://www.youtube.com/@redeemedzoomer6053'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCiLqiXa5O85APUBQV7X5w9Q'),
      subscriber_count = coalesce(subscriber_count, 690000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_redeemed_zoomer', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'weshuff' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Wes Huff', 'Manuscripts/Textual criticism/Apologetics', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Multiple + products · AI: none. PhD candidate and Apologetics Canada VP who made biblical manuscripts and textual criticism mainstream after his viral Joe Rogan appearance (Jan 2025). Approachable scholar persona bridging academia and apologetics. Edge: The only creator who has taken manuscript scholarship to Joe Rogan''s audience — mainstream credibility spillover the niche has never had.. What we can do better: He covers manuscripts as evidence, not as stories — the human drama of how texts were written, copied, fought over, and canonized is our narrative territory he leaves untouched; His momentum is personality-bound and interview-driven; authored, evergreen long-form documentaries on the same artifacts out-position him in search over time; He stays inside the biblical canon — surrounding literature (Enoch, Gnostic gospels, Dead Sea Scrolls context, pagan parallels) is where his curious viewers go next, and we can be waiting there.', 'https://www.youtube.com/@WesHuff', 'UCJX2EazMKUqBQV048px2aoA', 986000, 2.8)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Manuscripts/Textual criticism/Apologetics'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~2 · Multiple + products · AI: none. PhD candidate and Apologetics Canada VP who made biblical manuscripts and textual criticism mainstream after his viral Joe Rogan appearance (Jan 2025). Approachable scholar persona bridging academia and apologetics. Edge: The only creator who has taken manuscript scholarship to Joe Rogan''s audience — mainstream credibility spillover the niche has never had.. What we can do better: He covers manuscripts as evidence, not as stories — the human drama of how texts were written, copied, fought over, and canonized is our narrative territory he leaves untouched; His momentum is personality-bound and interview-driven; authored, evergreen long-form documentaries on the same artifacts out-position him in search over time; He stays inside the biblical canon — surrounding literature (Enoch, Gnostic gospels, Dead Sea Scrolls context, pagan parallels) is where his curious viewers go next, and we can be waiting there.'),
      url = coalesce(url, 'https://www.youtube.com/@WesHuff'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCJX2EazMKUqBQV048px2aoA'),
      subscriber_count = coalesce(subscriber_count, 986000),
      upload_cadence_days = coalesce(upload_cadence_days, 2.8)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_wes_huff', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'bibleproject' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'BibleProject', 'Animated biblical literacy/Nonprofit media studio', 'CI Jul 2026 (Christianity cycle) · North Star · team ~130 · Donations + courses/newsletter · AI: none. Nonprofit crowdfunded animation studio (Tim Mackie + Jon Collins, Portland) making the Bible''s literary design accessible through short animated explainers, podcasts, classes, and an app — free in 50+ languages. Edge: The only crowdfunded animation studio in religion media — scale, polish, and financial independence no individual creator can replicate.. What we can do better: They present the Bible''s literary unity and skip its historical messiness — canon formation, council politics, textual variants, and ancient Near East borrowings are exactly our academic-storytelling lane; Their devotional frame can''t touch comparative material (Ugaritic parallels, Enochic literature, Greco-Roman context) without controversy; we can make that our core identity; Nothing over ten minutes on the main feed — their millions of viewers who want feature-length narrative depth after a 7-minute overview currently have nowhere branded to go.', 'https://www.youtube.com/@bibleproject', 'UCVfwlh9XpX2Y_tQfjeln9QA', 5400000, 7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Animated biblical literacy/Nonprofit media studio'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · North Star · team ~130 · Donations + courses/newsletter · AI: none. Nonprofit crowdfunded animation studio (Tim Mackie + Jon Collins, Portland) making the Bible''s literary design accessible through short animated explainers, podcasts, classes, and an app — free in 50+ languages. Edge: The only crowdfunded animation studio in religion media — scale, polish, and financial independence no individual creator can replicate.. What we can do better: They present the Bible''s literary unity and skip its historical messiness — canon formation, council politics, textual variants, and ancient Near East borrowings are exactly our academic-storytelling lane; Their devotional frame can''t touch comparative material (Ugaritic parallels, Enochic literature, Greco-Roman context) without controversy; we can make that our core identity; Nothing over ten minutes on the main feed — their millions of viewers who want feature-length narrative depth after a 7-minute overview currently have nowhere branded to go.'),
      url = coalesce(url, 'https://www.youtube.com/@bibleproject'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCVfwlh9XpX2Y_tQfjeln9QA'),
      subscriber_count = coalesce(subscriber_count, 5400000),
      upload_cadence_days = coalesce(upload_cadence_days, 7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_bibleproject', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'thechosen' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'The Chosen', 'Biblical drama series/Streaming-first storytelling', 'CI Jul 2026 (Christianity cycle) · North Star · team ~100 · Crowdfunding/Donations + products/newsletter · AI: none. The first multi-season streaming drama about the life of Jesus, funded by the largest media crowdfund ever and kept free via its own app and the Come and See Foundation. YouTube functions as the top-of-funnel: trailers, scene clips, cast content and livestreams that drive viewers into the app and theatrical releases. Edge: The only player with a billion-view scripted Jesus franchise and a nonprofit funding engine that makes it permanently free.. What we can do better: They dramatize but never explain - viewers finish an episode full of questions about historical context (Second Temple Judaism, Rome, who the Pharisees actually were) that our academic storytelling can answer directly; Zero coverage of the messy history around the text itself (canon formation, apocrypha, competing early Christianities) because it would complicate the devotional brand - that is exactly our lane; Their audience skews devotional and is underserved on comparative context (how the Jesus story sits among ancient Mediterranean religions and myth), which we can serve without attacking faith.', 'https://www.youtube.com/@TheChosenSeries', 'UCBXOFnNTULFaAnj24PAeblg', 1700000, 2.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Biblical drama series/Streaming-first storytelling'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · North Star · team ~100 · Crowdfunding/Donations + products/newsletter · AI: none. The first multi-season streaming drama about the life of Jesus, funded by the largest media crowdfund ever and kept free via its own app and the Come and See Foundation. YouTube functions as the top-of-funnel: trailers, scene clips, cast content and livestreams that drive viewers into the app and theatrical releases. Edge: The only player with a billion-view scripted Jesus franchise and a nonprofit funding engine that makes it permanently free.. What we can do better: They dramatize but never explain - viewers finish an episode full of questions about historical context (Second Temple Judaism, Rome, who the Pharisees actually were) that our academic storytelling can answer directly; Zero coverage of the messy history around the text itself (canon formation, apocrypha, competing early Christianities) because it would complicate the devotional brand - that is exactly our lane; Their audience skews devotional and is underserved on comparative context (how the Jesus story sits among ancient Mediterranean religions and myth), which we can serve without attacking faith.'),
      url = coalesce(url, 'https://www.youtube.com/@TheChosenSeries'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCBXOFnNTULFaAnj24PAeblg'),
      subscriber_count = coalesce(subscriber_count, 1700000),
      upload_cadence_days = coalesce(upload_cadence_days, 2.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_the_chosen', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'crecganford' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Crecganford', 'Comparative mythology/Origins of religion', 'CI Jul 2026 (Christianity cycle) · Emerging · team ~1 · Multiple + products · AI: none. Jon F. White traces myths back tens of thousands of years using phylogenetic methods, asking what the world''s oldest stories were and how they spread. Runs the Mythology & Folklore Database used by researchers at 100+ universities, which gives the channel unusual scholarly legitimacy. Edge: The only creator combining comparative mythology with phylogenetic dating methods, backed by a database academics actually use.. What we can do better: He reconstructs deep-time myth origins but rarely lands the ''so what'' - our storytelling-first format can take the same material and deliver narrative payoff and meaning, not just data; Minimal visual investment means the atmospheric, cinematic treatment of ancient belief is completely unclaimed in his lane - we can out-produce him on identical topics; He avoids early Christianity and the biblical world almost entirely, leaving the bridge between comparative myth and Christian origins - our core beat - wide open.', 'https://www.youtube.com/@Crecganford', 'UChhMB_J0kz8eBJECy4d5uSQ', 220000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Comparative mythology/Origins of religion'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging · team ~1 · Multiple + products · AI: none. Jon F. White traces myths back tens of thousands of years using phylogenetic methods, asking what the world''s oldest stories were and how they spread. Runs the Mythology & Folklore Database used by researchers at 100+ universities, which gives the channel unusual scholarly legitimacy. Edge: The only creator combining comparative mythology with phylogenetic dating methods, backed by a database academics actually use.. What we can do better: He reconstructs deep-time myth origins but rarely lands the ''so what'' - our storytelling-first format can take the same material and deliver narrative payoff and meaning, not just data; Minimal visual investment means the atmospheric, cinematic treatment of ancient belief is completely unclaimed in his lane - we can out-produce him on identical topics; He avoids early Christianity and the biblical world almost entirely, leaving the bridge between comparative myth and Christian origins - our core beat - wide open.'),
      url = coalesce(url, 'https://www.youtube.com/@Crecganford'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UChhMB_J0kz8eBJECy4d5uSQ'),
      subscriber_count = coalesce(subscriber_count, 220000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_crecganford', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'gnosticinformant' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Gnostic Informant', 'Gnosticism/Comparative religion/On-location history', 'CI Jul 2026 (Christianity cycle) · Emerging · team ~1 · Multiple · AI: none. Neal Sendlak''s edgy comparative-religion channel arguing the ''informant'' angle: what churches did not tell you about Gnosticism, Christian origins and pagan parallels. Differentiates with self-funded on-location filming at ancient sites (Egypt, Greece, Anatolia, Rome) and long podcast interviews with scholars. Edge: The only sub-500K creator in the niche regularly filming at the ancient Mediterranean sites he covers.. What we can do better: His ''they hid it from you'' framing burns long-term credibility - we can cover the same Gnostic and apocryphal material with academic rigor and inherit the viewers he loses as they mature; On-location footage is wasted on loose, unscripted delivery - a tightly written narrative documentary using licensed/archival visuals can beat his retention without a plane ticket; He optimizes for controversy over comprehension; structured series (e.g., a proper ''Early Christianities'' arc) that build cumulative understanding are absent from his catalog and central to ours.', 'https://www.youtube.com/@GnosticInformant', 'UCtdweFMJ5DGj7_q5IcpQhPQ', 240000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Gnosticism/Comparative religion/On-location history'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging · team ~1 · Multiple · AI: none. Neal Sendlak''s edgy comparative-religion channel arguing the ''informant'' angle: what churches did not tell you about Gnosticism, Christian origins and pagan parallels. Differentiates with self-funded on-location filming at ancient sites (Egypt, Greece, Anatolia, Rome) and long podcast interviews with scholars. Edge: The only sub-500K creator in the niche regularly filming at the ancient Mediterranean sites he covers.. What we can do better: His ''they hid it from you'' framing burns long-term credibility - we can cover the same Gnostic and apocryphal material with academic rigor and inherit the viewers he loses as they mature; On-location footage is wasted on loose, unscripted delivery - a tightly written narrative documentary using licensed/archival visuals can beat his retention without a plane ticket; He optimizes for controversy over comprehension; structured series (e.g., a proper ''Early Christianities'' arc) that build cumulative understanding are absent from his catalog and central to ours.'),
      url = coalesce(url, 'https://www.youtube.com/@GnosticInformant'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCtdweFMJ5DGj7_q5IcpQhPQ'),
      subscriber_count = coalesce(subscriber_count, 240000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_gnostic_informant', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'centreplace' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Centre Place', 'Academic lectures/Church history/Second Temple Judaism', 'CI Jul 2026 (Christianity cycle) · Emerging · team ~3 · Donations · AI: none. The YouTube arm of Toronto''s Community of Christ congregation, where pastor-historian John Hamer delivers weekly academic lectures on church history, Second Temple Judaism, theology and world religions with charts, maps and timelines. A congregation''s outreach program that accidentally became one of the best free religious-history lecture libraries online. Edge: A functioning congregation whose weekly output doubles as a university-grade open courseware library on religious history.. What we can do better: Their material proves demand for deep academic religious history, but nobody is editing it into narrative - we can cover the same syllabus (Second Temple Judaism, canon history, restoration movements) as scripted, visual documentaries and capture the audience the format leaves behind; No discoverability strategy: their best lectures rank on search only; story-driven titles, chaptering and cinematic packaging on identical topics would consistently out-perform them for the same queries; As a church channel they soft-pedal comparative and mythological framing (Christianity alongside other ancient religions), which is precisely our positioning and their audience''s unmet curiosity.', 'https://www.youtube.com/@centre-place', 'UCWv114UTADTuZBweshlMa1g', 190000, 2.3)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Academic lectures/Church history/Second Temple Judaism'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging · team ~3 · Donations · AI: none. The YouTube arm of Toronto''s Community of Christ congregation, where pastor-historian John Hamer delivers weekly academic lectures on church history, Second Temple Judaism, theology and world religions with charts, maps and timelines. A congregation''s outreach program that accidentally became one of the best free religious-history lecture libraries online. Edge: A functioning congregation whose weekly output doubles as a university-grade open courseware library on religious history.. What we can do better: Their material proves demand for deep academic religious history, but nobody is editing it into narrative - we can cover the same syllabus (Second Temple Judaism, canon history, restoration movements) as scripted, visual documentaries and capture the audience the format leaves behind; No discoverability strategy: their best lectures rank on search only; story-driven titles, chaptering and cinematic packaging on identical topics would consistently out-perform them for the same queries; As a church channel they soft-pedal comparative and mythological framing (Christianity alongside other ancient religions), which is precisely our positioning and their audience''s unmet curiosity.'),
      url = coalesce(url, 'https://www.youtube.com/@centre-place'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UCWv114UTADTuZBweshlMa1g'),
      subscriber_count = coalesce(subscriber_count, 190000),
      upload_cadence_days = coalesce(upload_cadence_days, 2.3)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_centre_place', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'kippdavis' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Kipp Davis', 'Dead Sea Scrolls scholarship/Scholar reaction-critique', 'CI Jul 2026 (Christianity cycle) · Emerging · team ~1 · Multiple · AI: none. A publishing Dead Sea Scrolls scholar (Second Temple Judaism, forgery detection) who grew fast by critiquing viral pop-apologetics claims - most famously the Wes Huff/Joe Rogan material - and by showing what manuscript scholarship actually looks like. The channel is the ''scholar reacts'' corrective layer of the niche. Edge: The only actual Dead Sea Scrolls specialist doing rapid-response critique of viral religious claims on YouTube.. What we can do better: He rebuts stories but never tells them - a cinematic narrative documentary on the scrolls, Qumran, or the forgery scandal (his own beat) would out-reach his entire catalog and he lacks the production capacity to make it; Reaction content decays; evergreen, structured storytelling on Second Temple Judaism can permanently capture the search demand his viral moments only spike; His tone alienates believing viewers who still want rigorous history - our non-combative academic storytelling can serve both sides of the audience he splits.', 'https://www.youtube.com/@DrKippDavis', null, 120000, 3.5)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Dead Sea Scrolls scholarship/Scholar reaction-critique'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging · team ~1 · Multiple · AI: none. A publishing Dead Sea Scrolls scholar (Second Temple Judaism, forgery detection) who grew fast by critiquing viral pop-apologetics claims - most famously the Wes Huff/Joe Rogan material - and by showing what manuscript scholarship actually looks like. The channel is the ''scholar reacts'' corrective layer of the niche. Edge: The only actual Dead Sea Scrolls specialist doing rapid-response critique of viral religious claims on YouTube.. What we can do better: He rebuts stories but never tells them - a cinematic narrative documentary on the scrolls, Qumran, or the forgery scandal (his own beat) would out-reach his entire catalog and he lacks the production capacity to make it; Reaction content decays; evergreen, structured storytelling on Second Temple Judaism can permanently capture the search demand his viral moments only spike; His tone alienates believing viewers who still want rigorous history - our non-combative academic storytelling can serve both sides of the audience he splits.'),
      url = coalesce(url, 'https://www.youtube.com/@DrKippDavis'),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 120000),
      upload_cadence_days = coalesce(upload_cadence_days, 3.5)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_kipp_davis', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'mikewinger(biblethinker)' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Mike Winger (BibleThinker)', 'In-depth Bible teaching/Apologetics marathons', 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · Donations + newsletter · AI: none. Former pastor turned full-time YouTube Bible teacher whose brand is exhaustive single-host deep dives - multi-hour verse-by-verse studies, a 40+ hour women-in-ministry series, and the viral ''cover-up culture'' investigations of charismatic church scandals. Passed 1M subscribers in 2026, then announced a three-month hiatus beginning June 1, 2026, citing exhaustion and a book contract - the key-person risk of the model made visible. Edge: A million-subscriber audience built entirely on donor-funded, ultra-long-form trust - the strongest parasocial credibility in the niche.. What we can do better: His June-August 2026 hiatus leaves a vacuum of deep, trustworthy long-form Bible content - a direct window for our early-Christianity storytelling to catch his underserved audience while uploads are paused; He teaches from inside confessional commitments and won''t touch critical-historical framing (canon politics, competing early Christianities, ancient Near East parallels) - his most curious viewers graduate to exactly what we make; The one-man format is structurally unscalable; our three-person team producing scripted, visual, narrative episodes competes on production dimensions he has chosen never to enter.', 'https://www.youtube.com/@MikeWinger', 'UC7u2HaYBKDaLPcWmldxgGEA', 1000000, 4.7)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'In-depth Bible teaching/Apologetics marathons'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Direct Competitor · team ~3 · Donations + newsletter · AI: none. Former pastor turned full-time YouTube Bible teacher whose brand is exhaustive single-host deep dives - multi-hour verse-by-verse studies, a 40+ hour women-in-ministry series, and the viral ''cover-up culture'' investigations of charismatic church scandals. Passed 1M subscribers in 2026, then announced a three-month hiatus beginning June 1, 2026, citing exhaustion and a book contract - the key-person risk of the model made visible. Edge: A million-subscriber audience built entirely on donor-funded, ultra-long-form trust - the strongest parasocial credibility in the niche.. What we can do better: His June-August 2026 hiatus leaves a vacuum of deep, trustworthy long-form Bible content - a direct window for our early-Christianity storytelling to catch his underserved audience while uploads are paused; He teaches from inside confessional commitments and won''t touch critical-historical framing (canon politics, competing early Christianities, ancient Near East parallels) - his most curious viewers graduate to exactly what we make; The one-man format is structurally unscalable; our three-person team producing scripted, visual, narrative episodes competes on production dimensions he has chosen never to enter.'),
      url = coalesce(url, 'https://www.youtube.com/@MikeWinger'),
      youtube_channel_id = coalesce(youtube_channel_id, 'UC7u2HaYBKDaLPcWmldxgGEA'),
      subscriber_count = coalesce(subscriber_count, 1000000),
      upload_cadence_days = coalesce(upload_cadence_days, 4.7)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_mike_winger_biblethinker', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'kingsandgenerals' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Kings and Generals', 'Animated history documentaries/Military and religious history', 'CI Jul 2026 (Christianity cycle) · North Star (watchlist — summary level; deep-dive scheduled Q4 2026). 4.16M as of June 2026; factory production model; frequent series on Crusades, early Islam, Christianization', null, null, 4160000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Animated history documentaries/Military and religious history'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · North Star (watchlist — summary level; deep-dive scheduled Q4 2026). 4.16M as of June 2026; factory production model; frequent series on Crusades, early Islam, Christianization'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 4160000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_kings_and_generals', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'crashcourse' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'CrashCourse', 'Educational series/Religions curriculum', 'CI Jul 2026 (Christianity cycle) · North Star (watchlist — summary level; deep-dive scheduled Q4 2026). 2024 Religions series with John Green mainstreamed academic religious studies; curriculum-series playbook; subs approximate', null, null, 16500000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Educational series/Religions curriculum'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · North Star (watchlist — summary level; deep-dive scheduled Q4 2026). 2024 Religions series with John Green mainstreamed academic religious studies; curriculum-series playbook; subs approximate'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 16500000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_crashcourse', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'capturingchristianity' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Capturing Christianity', 'Apologetics interviews/Debates', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Cameron Bertuzzi; interview/debate hub bridging philosophy of religion and lay audiences; ~402-416K subs', null, null, 420000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Apologetics interviews/Debates'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Cameron Bertuzzi; interview/debate hub bridging philosophy of religion and lay audiences; ~402-416K subs'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 420000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_capturing_christianity', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'paulogia' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Paulogia', 'Skeptic response/Counter-apologetics', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Point-by-point responses to apologists; the counter-programming side of our audience; subs approximate', null, null, 300000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Skeptic response/Counter-apologetics'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Point-by-point responses to apologists; the counter-programming side of our audience; subs approximate'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 300000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_paulogia', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'truthunites(gavinortlund)' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Truth Unites (Gavin Ortlund)', 'Irenic theology/Church history for laypeople', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Scholar-pastor doing church-history storytelling with a calm tone close to ours; subs approximate', null, null, 300000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Irenic theology/Church history for laypeople'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Scholar-pastor doing church-history storytelling with a calm tone close to ours; subs approximate'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 300000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_truth_unites_gavin_ortlu', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'thetenminutebiblehour' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'The Ten Minute Bible Hour', 'Exploratory Christian content/Visiting traditions', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Matt Whitman; curious non-dogmatic ''visit every denomination'' format is a storytelling template; subs approximate', null, null, 450000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Exploratory Christian content/Visiting traditions'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Matt Whitman; curious non-dogmatic ''visit every denomination'' format is a storytelling template; subs approximate'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 450000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_the_ten_minute_bible_hou', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'thehistocrat' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'The Histocrat', 'Long-form ancient history/Archaeology and religion', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Multi-hour narrated deep dives incl. ancient religion topics; subs approximate', null, null, 250000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Long-form ancient history/Archaeology and religion'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Multi-hour narrated deep dives incl. ancient religion topics; subs approximate'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 250000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_the_histocrat', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'samaronow' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Sam Aronow', 'Jewish history/Chronological deep dives', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Definitive Jewish-history channel, adjacent coverage of Second Temple era; 82K in 2024, subs approximate', null, null, 100000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Jewish history/Chronological deep dives'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Definitive Jewish-history channel, adjacent coverage of Second Temple era; 82K in 2024, subs approximate'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 100000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_sam_aronow', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'digitalhammurabi' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'Digital Hammurabi', 'Assyriology/Hebrew Bible scholarship', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). PhD couple (Josh Bowen, Megan Lewis) on ancient Near East context of the Bible; small but scholarly credible; subs approximate', null, null, 70000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Assyriology/Hebrew Bible scholarship'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). PhD couple (Josh Bowen, Megan Lewis) on ancient Near East context of the Bible; small but scholarly credible; subs approximate'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 70000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_digital_hammurabi', v_ch) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from competitor_channels
    where organization_id = v_org and replace(lower(name), ' ', '') = 'historyvalley' limit 1;
  if v_ch is null then
    insert into competitor_channels (organization_id, name, niche, notes, url, youtube_channel_id, subscriber_count, upload_cadence_days)
    values (v_org, 'History Valley', 'Religious history interviews/Scholar conversations', 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Jacob Berman; prolific scholar-interview channel in the MythVision mold; subs approximate (trackers conflict)', null, null, 40000, null)
    returning id into v_ch;
  else
    update competitor_channels set
      niche = coalesce(niche, 'Religious history interviews/Scholar conversations'),
      notes = coalesce(notes, 'CI Jul 2026 (Christianity cycle) · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026). Jacob Berman; prolific scholar-interview channel in the MythVision mold; subs approximate (trackers conflict)'),
      url = coalesce(url, null),
      youtube_channel_id = coalesce(youtube_channel_id, null),
      subscriber_count = coalesce(subscriber_count, 40000),
      upload_cadence_days = coalesce(upload_cadence_days, null)
    where id = v_ch;
  end if;
  insert into _cc_map values ('cc_cx_history_valley', v_ch) on conflict (seed_id) do update set id = excluded.id;

  -- ── Outlier videos with teardowns (83) + view snapshots ──

  select id into v_ch from _cc_map where seed_id = 'cc_ci_coldfusion';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Theranos – Silicon Valley''s Greatest Disaster') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Theranos – Silicon Valley''s Greatest Disaster', 'https://youtube.com/watch?v=ci_coldfusion_1', '2026-04-07T14:54:40.760Z', 'Theranos fraud collapse', 'story_cold_open', 'rise_and_fall', 'Cold open on a single scene — a blood test that couldn''t work — before any names or dates. The calm narrator makes the fraud feel bigger, not smaller.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.2, '{"whyItWorked":"Classic ColdFusion packaging: ''Company – [dramatic claim]'' title with a minimal-text, orange/blue thumbnail, then a cold open dropping you inside one concrete moment of the deception. Dagogo''s measured Australian delivery plays against the enormity of the fraud, so the story escalates while the voice never does — a tension that holds an 18-minute rise-and-fall arc without a single hype cut.","observations":"The transferable mechanism is restraint as amplification: cinematic b-roll, 8-15s shots, and contemplative pacing signal ''research-heavy documentary,'' which the JSON flags as this channel''s core trust asset. The claim in the title is superlative (''Greatest Disaster'') but the video under-plays it stylistically — the gap between loud packaging and quiet execution is the retention engine, not the topic.","transferableMoves":["Open on one concrete scene from the story''s turning point before introducing any names, dates, or context.","Pair a superlative title claim with deliberately calm narration so the facts, not the voice, carry the drama.","Hold shots 8-15 seconds with cinematic b-roll to signal research depth instead of cutting for energy."],"idea":{"title":"The Startup That Faked Its Way to Our Doorstep — a Founder Reality cold-open documentary","description":"For Founder Reality: open cold on the exact moment a real founder we interview discovered their own metrics were lying to them, then unwind the rise-and-fall calmly in their own voice — restraint-as-amplification without inventing villains.","tags":["story_cold_open","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 26900000, 350000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_coldfusion_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_coldfusion';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Enron – The Biggest Fraud in History') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Enron – The Biggest Fraud in History', 'https://youtube.com/watch?v=ci_coldfusion_2', '2026-06-08T14:54:40.760Z', 'Enron accounting scandal', 'bold_claim', 'chronological', '''Biggest fraud in history'' stakes a claim the video then has to earn, chronologically, receipt by receipt. Old story, but the research depth makes it feel newly declassified.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.6, '{"whyItWorked":"The title is a bold, checkable claim (''The [adjective] [topic]'' pattern), and the video spends 18 minutes methodically proving it in strict chronological order — every mark-to-market trick dated and sourced. On a 20-year-old story, ColdFusion''s research-first methodology is the differentiator: viewers who think they know Enron stay because each act adds a document they hadn''t seen.","observations":"Per the CI record, this channel wins on research depth, audience trust, and a distinctive narrator — not recency (the JSON even lists ''could explore more trending topics'' as a blind spot). The mechanism that transfers: pick a story the audience thinks is settled, make a superlative claim about it, then let professional color grading, minimal text overlays, and gradual pacing signal ''this is the definitive version.''","transferableMoves":["Stake one superlative, falsifiable claim in the title and structure the entire video as its proof.","Revisit a ''settled'' story and win on sourcing depth — show the documents, name the dates.","Use strict chronology so each act adds one new revelation instead of teasing ahead."],"idea":{"title":"The Biggest Small-Business Collapse Nobody Studied — Business Storytelling definitive edition","description":"For Business Storytelling: take a founder collapse everyone thinks they understand, make one bold checkable claim about it, and earn it chronologically with primary documents — positioning ours as the definitive version.","tags":["bold_claim","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 13600000, 500000, 0.4);
  end if;
  insert into _cv_map values ('cv_ci_coldfusion_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_wendover_productions';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why There are Now So Many Shortages (It''s Not COVID)') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why There are Now So Many Shortages (It''s Not COVID)', 'https://youtube.com/watch?v=ci_wendover_productions_1', '2026-02-11T14:54:40.760Z', 'Global supply chain shortages', 'contrarian', 'problem_solution', 'The parenthetical attacks the explanation everyone already believes. Correcting the viewer''s model of the world is the whole hook — comments arguing back are free distribution.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.6, '{"whyItWorked":"Textbook Wendover ''Why [question]'' title weaponized with a contrarian parenthetical: ''(It''s Not COVID)'' tells viewers their existing explanation is wrong before they click. The video then does problem-solution systems analysis — animated maps and graphics tracing the real bottleneck through ports, trucking, and just-in-time inventory — so the payoff is a corrected mental model, not just facts.","observations":"The CI record says this channel owns the logistics/systems-thinking lane with graphics-heavy, minimal-b-roll production and Sam Denby''s measured, deliberate narration. What transfers is the contrarian frame on a systems question: name the popular explanation, refute it, replace it with a mechanism diagram. The map-and-graphics editing style means one person can produce it — no location footage required.","transferableMoves":["Add a parenthetical to the title that directly negates the audience''s default explanation.","Structure the video as: popular theory, why it fails, the real mechanism, traced step by step.","Replace b-roll with animated diagrams of the system so the viewer leaves with a model, not trivia."],"idea":{"title":"Why Most Startups Die (It''s Not the Idea) — Founder Reality","description":"For Founder Reality: negate the default explanation for startup failure in the title, then use our founders'' real decision logs to diagram the actual mechanism — cash timing and hiring sequence — problem-solution style.","tags":["contrarian","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 36200000, 300000, 0.1);
  end if;
  insert into _cv_map values ('cv_ci_wendover_productions_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_wendover_productions';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Insane Logistics of Formula 1') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Insane Logistics of Formula 1', 'https://youtube.com/watch?v=ci_wendover_productions_2', '2026-05-15T14:54:40.760Z', 'Formula 1 freight operations', 'statistic', 'case_study', 'Opens on the impossible number — an entire race operation moved across continents in days — then spends the video showing the machine that makes it possible. Glamorous subject, unglamorous lens.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.9, '{"whyItWorked":"''The [noun] of [topic]'' title pattern applied to a subject with a huge built-in fanbase, but through the one lens nobody else covers: freight. The hook is a staggering logistics statistic up front, and the case-study structure follows one race-to-race move end to end. It borrows F1''s audience while staying 100% inside Wendover''s systems-explainer competence — the JSON''s ''only channel focused on logistics'' advantage doing the differentiation.","observations":"The mechanism that transfers is the lens-borrow: take a high-search-volume subject and cover the operational layer beneath it that fans never see. Wendover''s animated maps, clean transitions, and deliberate narration make invisible infrastructure feel cinematic without any location shoot — consistent with the CI note that this is a one-person operation sustaining high production value.","transferableMoves":["Pick a subject with a massive existing audience and cover only its invisible operational layer.","Lead with one verified statistic so absurd it demands the explanation that follows.","Follow a single end-to-end case (one move, one launch, one deal) rather than surveying the whole industry."],"idea":{"title":"The Insane Logistics of a Product Launch — Business Storytelling case study","description":"For Business Storytelling: borrow a beloved consumer brand''s audience but tell only the unseen operational story of one launch, opening on a single absurd verified statistic.","tags":["statistic","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 22300000, 480000, 0.3);
  end if;
  insert into _cv_map values ('cv_ci_wendover_productions_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_modern_mba';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('WeWork - The $47 Billion Delusion') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'WeWork - The $47 Billion Delusion', 'https://youtube.com/watch?v=ci_modern_mba_1', '2026-03-16T14:54:40.760Z', 'WeWork valuation collapse', 'statistic', 'rise_and_fall', '$47B in the title, then the unit economics on screen by minute two. The spectacle story everyone knows, retold as a spreadsheet — that''s the differentiation.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.5, '{"whyItWorked":"The ''[Company] - [financial element]'' title leads with the valuation statistic, and the video delivers what the CI record calls Wall Street-level breakdowns: charts and financial visuals showing exactly why the unit economics never worked, act by act through the rise and fall. Where competitors retell the Adam Neumann drama, Modern MBA''s Emmy-winning production team retells the balance sheet — the analysis is the entertainment for its 25-45 professional audience.","observations":"Per the JSON, this channel''s moat is strategic-analysis depth aimed at executives and founders, with 22-minute videos that would sink a faster channel. The transferable mechanism: take a story saturated with personality coverage and win by being the only one who actually walks the numbers. Charts-as-b-roll keeps production tractable while signaling rigor.","transferableMoves":["Lead the title with the single most damning number in the story.","Rebuild the company''s actual unit economics on screen instead of narrating vibes.","Structure the fall as the numbers predicted it — each act is a metric breaking, not a scandal beat."],"idea":{"title":"Our Real P&L, Episode One — Founder Reality opens the books","description":"For Founder Reality: apply the numbers-as-narrative mechanism to ourselves — walk our channel''s actual unit economics on screen, including the metric that nearly broke us, with charts doing the storytelling.","tags":["statistic","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 17000000, 180000, 0.15);
  end if;
  insert into _cv_map values ('cv_ci_modern_mba_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_modern_mba';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('How Costco Wins by Refusing to Grow') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'How Costco Wins by Refusing to Grow', 'https://youtube.com/watch?v=ci_modern_mba_2', '2026-05-26T14:54:40.760Z', 'Costco retail strategy', 'contrarian', 'case_study', '''Wins by refusing to grow'' inverts the growth-at-all-costs belief its ambitious professional audience holds. The case study pays it off with margin math, not opinion.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.2, '{"whyItWorked":"A ''How [company] [strategy]'' title built on a contrarian premise: the boring retailer beats the disruptors by deliberately capping margins and SKUs. The case-study structure walks membership economics, inventory turns, and wage strategy with the channel''s signature charts and professional b-roll, so the counterintuitive claim lands as demonstrated fact. For an audience of executives, a usable strategic framework is the retention hook.","observations":"The CI record notes this channel attracts a high-value professional audience precisely because it delivers business-school depth free — its stated competition is business schools, not other YouTubers. What transfers is contrarian-thesis-plus-proof: challenge a belief your audience professionally identifies with, then earn it with primary financial data. The confident, analytical narrator voice keeps it authoritative rather than clickbaity.","transferableMoves":["Frame the title as a strategy that contradicts what your audience believes makes businesses win.","Prove the thesis with three concrete financial mechanisms, each with its own chart.","End with the framework stated plainly so viewers can apply it — utility drives shares."],"idea":{"title":"The Founder Who Won by Staying Small — Business Storytelling contrarian case study","description":"For Business Storytelling: profile a founder who deliberately refused venture scale and out-earned funded rivals — contrarian thesis proven with their real margins, told as a case study.","tags":["contrarian","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 10500000, 280000, 0.35);
  end if;
  insert into _cv_map values ('cv_ci_modern_mba_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_wall_street_millennial';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Archegos - The $20 Billion Blowup Nobody Saw Coming') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Archegos - The $20 Billion Blowup Nobody Saw Coming', 'https://youtube.com/watch?v=ci_wall_street_millennial_1', '2026-03-05T14:54:40.760Z', 'Archegos margin collapse', 'statistic', 'chronological', '$20B evaporating in 48 hours is the hook and the promise. The chronological tick-tock format turns a derivatives story into a thriller you can follow without a finance degree.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.1, '{"whyItWorked":"The ''[Company] - [controversial element]'' pattern with a jaw-drop statistic in the title, paid off as an hour-by-hour chronological reconstruction of the margin calls. The channel''s conversational, youthful narration plus animated charts translate total return swaps into plain English mid-story — the CI record''s ''accessible financial education'' strength doing the heavy lifting on a genuinely complex controversy.","observations":"Per the JSON, Wall Street Millennial wins as the Gen-Z voice on financial controversies: graphics-heavy, quick cuts, trend-aware, one-person production. The transferable mechanism is the tick-tock: a documented blowup retold on a strict clock, with each cut to a chart explaining exactly one concept the moment the story needs it. Jargon-on-demand, never up front.","transferableMoves":["Put the dollar figure and the timespan in the title — scale plus speed is the click.","Reconstruct the collapse on a literal timeline; let the clock create tension instead of teasers.","Explain each technical concept only at the exact story beat where it detonates."],"idea":{"title":"The Week Our Runway Almost Hit Zero — Founder Reality tick-tock","description":"For Founder Reality: apply the chronological blowup mechanism to a real founder''s near-death week — day-by-day reconstruction with the actual numbers on screen, explaining each business concept the moment it bites.","tags":["statistic","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 12400000, 120000, 0.15);
  end if;
  insert into _cv_map values ('cv_ci_wall_street_millennial_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_wall_street_millennial';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why Short Sellers Keep Finding Frauds Before Regulators Do') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why Short Sellers Keep Finding Frauds Before Regulators Do', 'https://youtube.com/watch?v=ci_wall_street_millennial_2', '2026-06-01T14:54:40.760Z', 'Short-seller fraud investigations', 'question', 'problem_solution', 'A question that indicts the referee: why do traders beat regulators to the fraud? Viewers click for the answer and stay because the incentive math is genuinely satisfying.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.8, '{"whyItWorked":"A ''Why [financial topic]'' title posing a question with an institutional villain built in, answered problem-solution style: the problem is regulator incentives, the solution is the short-seller profit motive, illustrated with two or three famous fraud reveals. The channel''s relatable Gen-Z framing turns market plumbing into an underdog story its wealth-building 20-40 audience roots for.","observations":"The CI record flags trending-topic coverage and a strong personality brand as this one-person channel''s edge, with ''general finance'' breadth as the tradeoff. What transfers is the incentive-autopsy: answer a why-question by following who gets paid, using quick cuts between animated incentive diagrams and real case receipts. The question hook self-selects viewers who will finish the video for the answer.","transferableMoves":["Pose a title question whose honest answer indicts a system, not a person.","Answer it by mapping who profits — an incentive diagram beats an opinion.","Anchor the abstract answer with two short real cases as proof beats."],"idea":{"title":"Why First-Time Founders Spot Market Gaps That Giants Miss — Business Storytelling","description":"For Business Storytelling: use the incentive-autopsy mechanism on a positive question — trace who gets paid to ignore a market gap, then tell the story of the founder who exploited it.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 5200000, 160000, 0.45);
  end if;
  insert into _cv_map values ('cv_ci_wall_street_millennial_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_lex_fridman_podcast';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Sam Altman: OpenAI, GPT-5, Sora, Board Saga | Lex Fridman Podcast') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Sam Altman: OpenAI, GPT-5, Sora, Board Saga | Lex Fridman Podcast', 'https://youtube.com/watch?v=ci_lex_fridman_podcast_1', '2026-04-15T14:54:40.760Z', 'OpenAI board crisis interview', 'story_cold_open', 'case_study', 'The only long-form sit-down where the protagonist of the biggest tech story of the year narrates his own firing. Access is the packaging; the title just lists the receipts.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.7, '{"whyItWorked":"The ''[Guest Name] - [Topic] | Lex Fridman Podcast'' pattern works here because ''Board Saga'' promises the one story every viewer wants firsthand, and the episode opens by walking straight into those days. Minimal editing and the full-conversation format — the channel''s documented style — become the draw: no cuts means viewers trust they''re getting the unfiltered account, and 165 minutes of watch time compounds the outlier.","observations":"Per the CI record, this channel''s moat is access to elite founders plus the thoughtful, prepared-interviewer voice; the consistent guest-face-and-name thumbnails make the guest the entire thumbnail strategy. What transfers is timing-plus-access: get the central figure of a live story into a trust format where they''ll actually talk, and let the event''s search volume do distribution. The JSON notes clips/short-form as this channel''s underused surface — an exploitable gap.","transferableMoves":["Book the subject while their story is still hot — recency of the saga is half the packaging.","Open the conversation inside the hardest moment, not with biography or warm-up.","Signal zero-edit authenticity deliberately; uncut is a trust feature, so market it."],"idea":{"title":"The Founder, Two Weeks After the Layoffs — Founder Reality unfiltered sit-down","description":"For Founder Reality: adapt the access-plus-timing mechanism at our scale — a raw, uncut conversation with a founder days after their hardest public decision, opening cold inside that moment, and cut clips aggressively since Lex leaves that lane open.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 28200000, 400000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_lex_fridman_podcast_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_lex_fridman_podcast';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Mark Zuckerberg: Future of AI at Meta | Lex Fridman Podcast') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Mark Zuckerberg: Future of AI at Meta | Lex Fridman Podcast', 'https://youtube.com/watch?v=ci_lex_fridman_podcast_2', '2026-06-16T14:54:40.760Z', 'Meta AI strategy interview', 'question', 'chronological', 'One of the most media-trained CEOs alive, in a format long enough that the training runs out. Viewers come for the question everyone asks — what is Meta actually building — and stay for the unscripted stretches.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.1, '{"whyItWorked":"The title''s implicit question — where is Meta taking AI — is one only this guest can answer, and the conversation moves chronologically from early Facebook decisions to the current bets, so the payoff builds instead of front-loading. The channel''s documented minimal-edit, professional-audio format is the differentiator: at hour two, a rehearsed executive starts thinking out loud, and that unguarded material is what clips and comments amplify.","observations":"The CI record credits MIT-backed credibility and a probing-but-safe interviewer persona for getting guests other channels can''t — guests trust the format enough to go long. The transferable mechanism is duration-as-truth-serum: length plus a genuinely prepared interviewer produces moments that scripted PR can''t survive. The consistent branding (guest face, name, minimal text) makes every episode instantly legible in the feed.","transferableMoves":["Ask the one question only this guest can answer, and put it in the packaging.","Walk the guest''s decisions in the order they happened — chronology surfaces reasoning, not talking points.","Prepare deeply enough to follow up past the rehearsed answer; the second follow-up is where the moment lives."],"idea":{"title":"Three Hours With the Founder Who Sold Too Early — Business Storytelling long-form","description":"For Business Storytelling: use duration-as-truth-serum on a founder retrospective — a long chronological walk through every decision leading to a controversial exit, letting the length get past the polished retelling.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 6700000, 320000, 0.5);
  end if;
  insert into _cv_map values ('cv_ci_lex_fridman_podcast_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_polymatter';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why Chinese Manufacturing Wins') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why Chinese Manufacturing Wins', 'https://youtube.com/watch?v=ci_polymatter_1', '2026-02-06T14:54:40.760Z', 'China manufacturing dominance', 'contrarian', 'problem_solution', 'Refutes the cheap-labor explanation everyone carries around, then rebuilds the real answer — clustered supply chains and speed — with maps and charts. Correcting a lazy consensus is the click.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4, '{"whyItWorked":"A pure ''Why [country/business decision]'' title where the video''s actual thesis is contrarian: it''s not cheap labor, it''s ecosystem density and iteration speed. The problem-solution structure sets up the naive model, breaks it, then rebuilds the true mechanism with the channel''s signature maps, flags, and simple animations. Viewers share it because it upgrades an opinion they were already arguing about.","observations":"The CI record positions PolyMatter at the geography-business nexus with a clear, analytical narrator and minimal-b-roll, chart-driven editing — a one-person production system. What transfers is consensus-correction on an evergreen debate: pick a belief with high argument-volume, disprove the folk explanation, and supply a stickier model. The map-heavy visual language makes abstract economics concrete without any filming.","transferableMoves":["Choose a topic people already argue about and correct the folk explanation head-on.","Set up the naive model first so the refutation lands as a reveal, not a lecture.","Compress the real answer into one visual model viewers can repeat in a comment."],"idea":{"title":"Why Bootstrapped Companies Win (It''s Not Frugality) — Founder Reality","description":"For Founder Reality: apply consensus-correction to founder mythology — refute the folk explanation for bootstrapped success with data from our own founders, and leave viewers one repeatable visual model.","tags":["contrarian","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 18700000, 150000, 0.1);
  end if;
  insert into _cv_map values ('cv_ci_polymatter_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_polymatter';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Taiwan - The Economy the World Can''t Live Without') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Taiwan - The Economy the World Can''t Live Without', 'https://youtube.com/watch?v=ci_polymatter_2', '2026-05-10T14:54:40.760Z', 'Taiwan semiconductor economy', 'bold_claim', 'case_study', 'One island, one industry, one bold dependency claim — then a case study proving your phone, car, and job all route through it. Stakes personalization does the retention.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.3, '{"whyItWorked":"The ''[Geographic region] - [economic element]'' pattern carrying a bold claim of total global dependency, proven as a single case study of the semiconductor supply chain. The channel''s flag-and-map thumbnail language plus clear, analytical narration frame a geopolitics headline as an economics explainer — riding news search volume while staying evergreen, exactly the geography-business nexus the CI record calls its unique advantage.","observations":"Per the JSON, PolyMatter''s edge is filling the gap between economics and geography with an analytical framework, despite a 0.75/week schedule — so each video must be durable. What transfers is dependency-mapping: make a macro story personal by tracing the chain from the viewer''s own devices back to one chokepoint. Charts and maps keep the claim rigorous where a talking head would sound alarmist.","transferableMoves":["Make one bold dependency claim and prove it by tracing the chain to the viewer''s own life.","Anchor a news-adjacent topic in evergreen structural analysis so it keeps earning views.","Use one region or company as the case-study lens for the whole system."],"idea":{"title":"The One Supplier Every Startup Secretly Depends On — Business Storytelling","description":"For Business Storytelling: adapt dependency-mapping to the founder world — a case study tracing how thousands of businesses route through a single unglamorous chokepoint company, and what happened to founders when it wobbled.","tags":["bold_claim","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 11100000, 220000, 0.3);
  end if;
  insert into _cv_map values ('cv_ci_polymatter_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_economics_explained';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Economy of the Soviet Union') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Economy of the Soviet Union', 'https://youtube.com/watch?v=ci_economics_explained_1', '2026-02-20T14:54:40.760Z', 'Soviet planned economy', 'statistic', 'rise_and_fall', 'Opens on one staggering number — the world''s second-largest economy, on paper — then spends ten minutes explaining why the paper lied. A systems explainer wearing a collapse story.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.1, '{"whyItWorked":"The title follows their proven ''The [economic system/policy]'' pattern but picks the one system everyone has an opinion about and almost nobody understands. The statistic hook (GDP that looked world-class) creates an immediate gap between official numbers and lived reality, and the rise-and-fall arc gives an abstract topic a body count of factories, queues, and five-year plans.","observations":"What transfers is the number-first cold open, not the Soviet topic: lead with one metric the audience thinks they understand, then dismantle it. Their vibrant animations and minimal-face, concept-visualized thumbnails let a 10-minute video carry textbook density without feeling like a lecture — consistent with the channel''s documented accessibility-plus-frequency advantage.","transferableMoves":["Open with a single official metric, then spend the video proving the metric hid the real story.","Give abstract systems a rise-and-fall arc with concrete casualties (products, jobs, shortages) instead of theory.","Visualize the core concept in the thumbnail rather than a face — make the idea itself the image."],"idea":{"title":"Our Revenue Chart Looked Great. The Business Was Dying — a Founder Reality teardown","description":"For Founder Reality: apply the ''official number vs. lived reality'' mechanism to our own dashboard — open on the vanity metric, then walk through the real decisions and failures the chart concealed, in the founder''s own voice.","tags":["statistic","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 13600000, 120000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_economics_explained_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_economics_explained';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why Does Argentina Keep Going Broke?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why Does Argentina Keep Going Broke?', 'https://youtube.com/watch?v=ci_economics_explained_2', '2026-05-15T14:54:40.760Z', 'Argentina''s repeated defaults', 'question', 'case_study', 'A ''Why [economic question]'' title that everyone half-knows the answer to and nobody actually does. The recurring-failure framing makes one country a repeatable case study.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.8, '{"whyItWorked":"The question hook works because the premise is genuinely puzzling — a resource-rich country that was once among the world''s wealthiest defaulting again and again. Structuring it as a case study of one nation rather than a lecture on inflation lets the channel smuggle in three economics lessons per act while the viewer thinks they''re watching a mystery get solved.","observations":"This is their high-frequency, accessible-explainer machine at full power: ''Why [economic question]'' titles, colorful concept-driven animation instead of b-roll, and a clear educational narrator that never assumes prior knowledge. The transferable mechanism is ''recurring failure as mystery'' — the repetition itself is the hook, because one failure is an accident and nine is a system.","transferableMoves":["Frame a repeated failure as a mystery question the video promises to solve, not a topic it will cover.","Teach the underlying concept only at the exact moment the story needs it, never up front.","Use one vivid case as the spine and generalize in the final act, not throughout."],"idea":{"title":"Why Do Restaurants Keep Going Broke in the Same Location? — Business Storytelling","description":"For Business Storytelling: borrow the ''one failure is an accident, nine is a system'' mechanism — take a business pattern that keeps repeating and unravel the systemic cause as a rise-and-fall case study.","tags":["question","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 7400000, 160000, 0.4);
  end if;
  insert into _cv_map values ('cv_ci_economics_explained_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_company_man';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Decline of Blockbuster...What Happened?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Decline of Blockbuster...What Happened?', 'https://youtube.com/watch?v=ci_company_man_1', '2026-03-14T14:54:40.760Z', 'Blockbuster''s collapse', 'story_cold_open', 'rise_and_fall', 'Opens inside the story — 9,000 stores, then one. The calm, unhurried narration makes the collapse feel inevitable rather than sensational, which builds trust.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.6, '{"whyItWorked":"The ''...What Happened?'' formula is a promise the channel has kept dozens of times, so the click is low-risk for the viewer — that''s the compounding return of the format consistency the research flags as their core strength. Blockbuster is the perfect subject for it: universally remembered, universally misunderstood (''Netflix killed them'' is wrong enough to correct), and a clean rise-and-fall arc.","observations":"The mechanism is franchise packaging: a simple-logo-on-consistent-layout thumbnail and a fill-in-the-blank title mean each video markets every other video. Their calm, clear-diction narration over minimal stock footage proves production value isn''t the moat — the repeatable question format is. The documented blind spot is real too: the video stops at the company level and never enters the founder''s decisions.","transferableMoves":["Build one fill-in-the-blank title format and repeat it until the format itself is the brand.","Correct the popular one-sentence explanation of a famous failure — being usefully wrong is the hook.","Keep thumbnails to one recognizable mark plus a consistent layout so the series is identifiable at a glance."],"idea":{"title":"The Decision That Killed the Company — a repeatable Founder Reality format","description":"For Founder Reality: adopt the franchise-format mechanism but fix Company Man''s documented gap — go one level deeper than the company and rebuild the single founder decision, with the tradeoffs they saw at the time, that started the decline.","tags":["story_cold_open","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 19200000, 200000, 0.1);
  end if;
  insert into _cv_map values ('cv_ci_company_man_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_company_man';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('How Costco Works') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'How Costco Works', 'https://youtube.com/watch?v=ci_company_man_2', '2026-05-26T14:54:40.760Z', 'Costco''s business model', 'question', 'case_study', 'The implicit question — how does a store this cheap make money? — is one every viewer has personally wondered in the checkout line. Familiarity does the marketing.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.2, '{"whyItWorked":"Straight from their ''How [company] Works'' title pattern, aimed at a company the audience physically visits every week. The hook is the gap between personal experience (impossibly cheap hot dogs) and business logic (someone is paying for this), and the case-study structure resolves it one revenue mechanism at a time. No drama needed — curiosity about a familiar thing outperforms shock about an unfamiliar one.","observations":"This shows why the research says they own the company-explainer lane: calm educational narration, simple text overlays, and a logo-first thumbnail turn a business-model explainer into comfort content. The transferable mechanism is picking subjects with maximum audience contact — the viewer''s own life is the cold open. The short 11-minute runtime is a deliberate ceiling, which is also their monetization weakness.","transferableMoves":["Choose subjects the viewer physically interacts with — their firsthand experience is the hook.","Answer the question in mechanisms (how each dollar flows), not adjectives.","Cap runtime at what the question needs; a fully answered short video beats a padded long one."],"idea":{"title":"How a $5 Rotisserie Chicken Built an Empire — Business Storytelling","description":"For Business Storytelling: take the everyday-object hook and expand it into the founder story Company Man''s format skips — how Jim Sinegal''s pricing dogma became a rise-defining business model, told through one product everyone recognizes.","tags":["question","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 9000000, 240000, 0.3);
  end if;
  insert into _cv_map values ('cv_ci_company_man_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_business_casual';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('How Rockefeller Built His Trillion Dollar Oil Empire') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'How Rockefeller Built His Trillion Dollar Oil Empire', 'https://youtube.com/watch?v=ci_business_casual_1', '2026-03-01T14:54:40.760Z', 'Rockefeller and Standard Oil', 'story_cold_open', 'chronological', 'Opens on a broke Cleveland bookkeeper, not the richest man in history — the gap between the two is the whole video. Animation makes 1870s finance feel like a heist.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.8, '{"whyItWorked":"This is their ''turning boring financial history into engaging narratives'' positioning executed perfectly: a chronological empire-building story where custom illustrated characters replace nonexistent 1870s footage. The cold open on Rockefeller before the money inverts the wealth-porn formula — viewers stay to watch the transformation happen, and the playful animation style lets ruthless tactics land as story beats instead of a lecture.","observations":"The mechanism is visual monopoly on pre-camera subjects: for any story with no archival footage, whoever builds the visual world owns the story. Their humorous, narrative-driven narration and colorful illustrated thumbnails are instantly distinguishable in a stock-footage-saturated niche — but the research is clear that animation cost is exactly why they ship 0.5 videos a week. The move transfers; the production budget math has to be respected.","transferableMoves":["Pick stories with no archival footage and own them visually — scarcity of imagery is an opportunity, not a blocker.","Cold-open on the protagonist before the success; the transformation is the retention engine.","Play dry financial mechanics as story beats with humor, never as exposition."],"idea":{"title":"Draw the Deal: our worst contract, animated — Founder Reality","description":"For Founder Reality: use the animate-what-has-no-footage mechanism on our own history — reconstruct a pivotal early deal we have no footage of as a short illustrated sequence, narrated by the founder who signed it, failure included.","tags":["story_cold_open","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 8500000, 80000, 0.1);
  end if;
  insert into _cv_map values ('cv_ci_business_casual_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_business_casual';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The South Sea Bubble Explained') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The South Sea Bubble Explained', 'https://youtube.com/watch?v=ci_business_casual_2', '2026-05-07T14:54:40.760Z', 'The 1720 South Sea Bubble', 'bold_claim', 'rise_and_fall', 'Claims a 300-year-old scam explains every bubble since — then proves it with cartoon aristocrats losing fortunes. Old story, permanent relevance.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.5, '{"whyItWorked":"Follows their ''[Business Event] Explained'' title pattern on an event almost no viewer has heard of, which forces the bold-claim hook to carry the click: this forgotten scandal is the template for every mania you''ve lived through. The rise-and-fall arc is history''s most reliable structure, and the playful animated style makes 18th-century stock fraud legible — even Isaac Newton losing his fortune becomes a punchline with a lesson.","observations":"The mechanism is the relevance bridge: obscure history earns the click only when the title or hook pins it to something the audience is living through now. Their humorous narrator voice and colorful illustrated thumbnails give them a monopoly look in the business-history lane — and per the research, that unique visual style is the entire moat, since the slow schedule surrenders volume to every competitor.","transferableMoves":["Bridge every historical story to a pattern the viewer is living through right now — state the bridge in the first 30 seconds.","Use a famous victim''s loss (a Newton, not a nobody) as the emotional anchor of a systemic story.","Let humor carry the exposition; a joke that teaches beats a graph that explains."],"idea":{"title":"Every Startup Bubble Is the Same Bubble — Business Storytelling","description":"For Business Storytelling: apply the relevance-bridge mechanism to a rise-and-fall doc that cuts between one historical mania and one modern startup bubble, letting the identical mechanics reveal themselves scene by scene.","tags":["bold_claim","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2900000, 55000, 0.3);
  end if;
  insert into _cv_map values ('cv_ci_business_casual_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_internet_historian';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Failure of Fyre Festival') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Failure of Fyre Festival', 'https://youtube.com/watch?v=ci_internet_historian_1', '2026-03-06T14:54:40.760Z', 'Fyre Festival collapse', 'bold_claim', 'rise_and_fall', 'Sells the greatest party that never happened, then delivers the disaster as comedy. Laughing at the fall keeps you through a 20-minute documentary.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.7, '{"whyItWorked":"The comedy-documentary hybrid the research identifies as this channel''s unique advantage is at maximum power on a business failure this absurd: deadpan narration plays the founders'' own promotional claims straight while the meme-heavy edit undercuts them, so the jokes ARE the analysis. The rise-and-fall structure does the retention work — every act ends with the hole slightly deeper, and the viewer stays to see exactly how deep it goes.","observations":"The transferable mechanism is tonal contrast as retention: earnest source material plus deadpan delivery generates a laugh every 20 seconds without a single written joke. Their ''[The scandal/drama]'' title pattern and shocked-face meme thumbnails promise chaos, and the 20-minute runtime works because comedy resets attention where pure documentary exhausts it. Note the documented risk: the humor is the moat and also the thing that may not age.","transferableMoves":["Let the subject''s own overconfident claims play straight against reality — quote, then cut to the outcome.","End every act with the situation measurably worse; escalation is the chapter structure.","Use tonal contrast (earnest material, dry delivery) to reset attention in long videos."],"idea":{"title":"Our Launch Was a Disaster. Here''s the Footage — Founder Reality","description":"For Founder Reality: borrow the play-the-hype-straight mechanism on ourselves — cut our own optimistic launch predictions against what actually happened, with the founder narrating the gap honestly instead of for laughs at someone else''s expense.","tags":["bold_claim","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 25600000, 250000, 0.1);
  end if;
  insert into _cv_map values ('cv_ci_internet_historian_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_internet_historian';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Cost of Concordia') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Cost of Concordia', 'https://youtube.com/watch?v=ci_internet_historian_2', '2026-06-04T14:54:40.760Z', 'Costa Concordia disaster and salvage', 'story_cold_open', 'chronological', 'Cold-opens on a cruise ship already on its side and spends an hour explaining how it got there and what it cost to move it. Scale is the star.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.2, '{"whyItWorked":"A step outside the channel''s internet-culture lane that became one of its biggest videos — evidence against the research''s own ''limited to internet-specific topics'' weakness. The cold open starts at the disaster and rewinds, and the chronological structure then splits into two stories for the price of one: the comedy of errors that sank the ship, and the genuinely awe-inspiring engineering of the salvage. Deadpan tone plus real stakes is a harder trick than pure comedy, and it landed.","observations":"The mechanism is the aftermath pivot: most tellings end at the disaster, but the second half — who pays, who fixes it, what it costs — is fresher territory than the crash itself. The over-the-top edit and meme integration keep an hour-long runtime light, and the title''s understatement (''The Cost'') does contrarian work against a sensational subject. Transferable insight: your style is the moat, not your topic vertical.","transferableMoves":["Start at the wreckage and rewind — the outcome shown first becomes a question, not a spoiler.","Tell the aftermath (cleanup, cost, consequences) as a second act; it''s the half nobody else covers.","Understate the title against a sensational subject — restraint reads as confidence."],"idea":{"title":"The Cost of the Recall: what happens after a product fails — Business Storytelling","description":"For Business Storytelling: apply the aftermath-pivot mechanism to a famous product failure — spend act one on the collapse everyone knows, then make the untold cleanup, payout, and rebuild the real story.","tags":["story_cold_open","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 9700000, 320000, 0.5);
  end if;
  insert into _cv_map values ('cv_ci_internet_historian_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_y_combinator';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Mark Zuckerberg : How to Build the Future') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Mark Zuckerberg : How to Build the Future', 'https://youtube.com/watch?v=ci_y_combinator_1', '2026-04-28T14:54:40.760Z', 'Zuckerberg on building Facebook', 'question', 'case_study', 'The title''s question is answered by the one person most qualified to answer it. Zero production polish — access IS the production value.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.1, '{"whyItWorked":"Pure demonstration of the channel''s documented unique advantage: direct access to the YC network. The ''[Founder] on [Topic]'' pattern with a name this big needs nothing else — the lecture-format, minimal-production style the research flags as a weakness becomes credibility here, because polish would make it feel like PR. The case-study structure (early Facebook decisions, told firsthand) delivers specifics no journalist retelling can match.","observations":"The mechanism is source proximity: firsthand testimony beats production value whenever the speaker''s authority is the product. Their consistent speaker-plus-text thumbnails make authority legible at browse time. The research''s blind spot is the opportunity — YC never wraps this raw access in narrative storytelling, so the same testimony re-cut with structure, stakes, and archival context is an open lane.","transferableMoves":["Trade production polish for source proximity — get the person who was in the room, on record.","Ask for specific decisions and moments, never lessons; specificity is what makes access valuable.","Put the speaker''s name and authority in the packaging — the who is the hook."],"idea":{"title":"The Night We Almost Sold: one founder, one decision, firsthand — Founder Reality","description":"For Founder Reality: use the source-proximity mechanism YC proves but add the narrative structure they skip — one founder recounts a single near-fatal decision on camera, intercut with the actual emails and numbers from that week.","tags":["question","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 5100000, 85000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_y_combinator_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_y_combinator';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Startup Advice That Sounds Right But Isn''t, with Dalton Caldwell') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Startup Advice That Sounds Right But Isn''t, with Dalton Caldwell', 'https://youtube.com/watch?v=ci_y_combinator_2', '2026-06-13T14:54:40.760Z', 'Debunking common startup advice', 'contrarian', 'listicle', 'Attacks advice the audience has already internalized, delivered by someone who has watched thousands of startups test it. Comments arguing back = free distribution.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.3, '{"whyItWorked":"The contrarian hook is uniquely credible here: when a YC partner says popular advice is wrong, it lands as data, not opinion — he has the sample size of the entire accelerator behind him, which is exactly the ''highest-quality founder insights'' advantage the research documents. The listicle structure makes each debunked belief a self-contained payoff, so retention survives the minimal lecture-format production.","observations":"The mechanism is authority-backed contrarianism plus enumerable payoffs: each myth is a mini-episode with its own setup and reversal, which suits their ''[Topic] with [Expert]'' packaging and text-based thumbnails. The research notes the format''s ceiling — no narrative, no stakes, no faces of actual founders who followed the bad advice. Pairing each myth with one real casualty story would be the upgrade YC''s format can''t make.","transferableMoves":["Debunk beliefs your audience already holds — disagreement in the comments is distribution.","Back every contrarian claim with sample size or firsthand evidence, never vibes.","Structure myth-busting as discrete numbered payoffs so every segment re-hooks the viewer."],"idea":{"title":"We Followed the Best Startup Advice. It Nearly Killed Us — Business Storytelling","description":"For Business Storytelling: convert the myth-debunk mechanism into narrative — each act follows one real company that faithfully applied a piece of celebrated advice straight into a wall, with the reversal as the act break.","tags":["contrarian","listicle","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3000000, 130000, 0.5);
  end if;
  insert into _cv_map values ('cv_ci_y_combinator_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_real_engineering';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Insane Engineering of the SR-71 Blackbird') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Insane Engineering of the SR-71 Blackbird', 'https://youtube.com/watch?v=ci_real_engineering_1', '2026-03-24T14:54:40.760Z', 'SR-71 Blackbird engineering', 'statistic', 'problem_solution', 'Every spec of the plane is a solved impossibility — leaks fuel on the runway, outruns missiles at altitude. The stats are the story.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.4, '{"whyItWorked":"The statistic hook front-loads a spec that sounds like a mistake (a spy plane that leaks fuel on the ground) and the problem-solution structure then reveals it as genius — the plane only seals at Mach 3 temperatures. Chaining impossible-requirement to elegant-solution over and over is the channel''s technical-but-accessible narration doing what the research says it does best: making accuracy itself entertaining, with diagrams and animations as the payoff for each setup.","observations":"The mechanism is constraint-first storytelling: state the impossible requirement before the solution so every engineering fact lands as a plot twist. Their ''The [Project]'' title pattern plus bold-text project thumbnails signal depth to an audience that wants it. The research''s blind spot is the human layer — the video celebrates the machine but barely meets Kelly Johnson''s team, and that founder-shaped hole is addressable by us, not them.","transferableMoves":["State the impossible constraint before revealing the solution — sequence is what creates the twist.","Lead with the spec that sounds like a flaw, then reframe it as the design''s genius.","Chain problem-solution pairs as chapters so each segment re-hooks on its own."],"idea":{"title":"The Skunk Works Playbook: how a tiny team out-built an industry — Founder Reality","description":"For Founder Reality: apply constraint-first storytelling to team-building — frame each of our own impossible constraints (budget, headcount, deadline) as the setup, and the unglamorous workaround that solved it as the payoff, told by the people who made the call.","tags":["statistic","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 22000000, 250000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_real_engineering_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_real_engineering';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Truth About Hydrogen') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Truth About Hydrogen', 'https://youtube.com/watch?v=ci_real_engineering_2', '2026-05-21T14:54:40.760Z', 'Hydrogen economy viability', 'contrarian', 'case_study', 'Challenges a technology the audience wants to believe in, with math instead of opinion. ''The Truth About'' promises a verdict, and the video earns it.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.9, '{"whyItWorked":"The contrarian hook targets hopeful consensus — hydrogen as the clean-energy future — and the channel''s documented technical accuracy is what makes the skepticism land as analysis rather than cynicism. Working the case study through energy-density math, storage physics, and infrastructure cost step by step means the viewer arrives at the deflating verdict themselves, which is far stickier than being told.","observations":"The mechanism is earned contrarianism: their knowledgeable, accessible narrator walks the audience through the calculation instead of asserting the conclusion, with technical diagrams as evidence rather than decoration. ''The Truth About X'' packaging converts credibility into clicks — but it only works for channels that have banked accuracy first, which the research lists as this channel''s core strength. Verdict-promising titles are a trust withdrawal; the balance has to exist.","transferableMoves":["Challenge a hopeful consensus with arithmetic the viewer can follow, not expert assertion.","Let the audience reach the verdict one step before you say it — guided math beats stated conclusions.","Reserve verdict-promising titles for topics where you can genuinely show your work."],"idea":{"title":"The Truth About ''Passive Income'' Businesses — Business Storytelling","description":"For Business Storytelling: apply earned contrarianism to a business belief the audience wants true — walk the real unit economics of a hyped ''passive'' business model through one founder''s actual books until the verdict states itself.","tags":["contrarian","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 12500000, 300000, 0.4);
  end if;
  insert into _cv_map values ('cv_ci_real_engineering_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_fortune_magazine';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Lisa Su - The Engineer Who Saved AMD From Bankruptcy') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Lisa Su - The Engineer Who Saved AMD From Bankruptcy', 'https://youtube.com/watch?v=ci_fortune_magazine_1', '2026-06-04T14:54:40.760Z', 'AMD turnaround', 'story_cold_open', 'rise_and_fall', 'Opens inside the 2014 crisis meeting, not the magazine profile. Executive access turned into scene-setting instead of soundbites.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.6, '{"whyItWorked":"Fortune broke its own news-format ceiling here: instead of the usual news-cycle montage, it used its executive access to open cold inside AMD''s near-death moment and ran the arc as fall-then-rise. The ''[Executive/Founder] - [Story]'' title promised a person, not a press release, and the authoritative news voice made the turnaround feel like verified record rather than fan retelling.","observations":"The transferable mechanism is access-as-proof: real interview footage of the principal beats stock b-roll every time, and Fortune''s executive-face thumbnails already train the audience to click people over logos. Notably, this outlier succeeds exactly where the channel''s blind spots say it usually doesn''t — deeper individual stories and documentary format — which confirms the demand their news-style editing normally leaves on the table.","transferableMoves":["Open cold inside the company''s worst moment before introducing the protagonist by name.","Lead the title with the person and a survival stake, not the company and the news hook.","Cut interview pull-quotes into the narrative as evidence beats, not as talking-head segments."],"idea":{"title":"The Week We Almost Shut Down — a Founder Reality episode","description":"For Founder Reality: apply the fall-then-rise cold open to our own near-death decision, with the founder narrating the crisis meeting from inside it — our access to ourselves is the same proof mechanism Fortune gets from executives.","tags":["story_cold_open","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 8500000, 280000, 0.4);
  end if;
  insert into _cv_map values ('cv_ci_fortune_magazine_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_fortune_magazine';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Costco - How a $1.50 Hot Dog Explains a $250 Billion Empire') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Costco - How a $1.50 Hot Dog Explains a $250 Billion Empire', 'https://youtube.com/watch?v=ci_fortune_magazine_2', '2026-05-13T14:54:40.760Z', 'Costco business model', 'statistic', 'case_study', 'One absurdly small number carrying a giant one. The hot dog is the thumbnail, the hook, and the thesis in a single object.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.8, '{"whyItWorked":"This fits Fortune''s ''[Company] - [News]'' title pattern but swaps news for a paradox statistic: $1.50 versus $250 billion in one line. The tiny-number-explains-huge-number frame gives the professional, authoritative narration something to prove rather than report, and the case study structure pays the promise off decision by decision.","observations":"Fortune''s strength is credibility — the news-like voice makes a counterintuitive claim land as fact, where a solo creator would sound like a hot take. The mechanism that transfers is anchoring an entire business model to one concrete, thumbnail-able object; their professional b-roll and logo-plus-wealth-elements thumbnail patterns do the rest. It also shows their news-cycle dependence is a choice: evergreen case studies outrun their own headlines.","transferableMoves":["Anchor the whole video on one concrete object whose price or size contradicts the company''s scale.","Put the paradox statistic in the title verbatim — small number versus big number.","Structure the body as the sequence of deliberate decisions that keep the paradox profitable."],"idea":{"title":"The $9 Decision That Explains a $10 Billion Company","description":"For Business Storytelling: pick one tiny, concrete artifact from a company we''re profiling and let it carry the whole model — the paradox-statistic anchor, applied to a founder-story case study instead of retail news.","tags":["statistic","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 9100000, 190000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_fortune_magazine_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_this_week_in_startups';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('David Sacks on Why Most Startups Should Never Raise a Series A | TWIS') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'David Sacks on Why Most Startups Should Never Raise a Series A | TWIS', 'https://youtube.com/watch?v=ci_this_week_in_startups_1', '2026-05-26T14:54:40.760Z', 'Venture capital contrarianism', 'contrarian', 'problem_solution', 'A VC telling founders not to raise. The messenger contradicting his own incentives is the entire hook.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.1, '{"whyItWorked":"The outlier mechanism is messenger-against-interest: an investor arguing against fundraising carries credibility no journalist could buy. The ''[Guest Name] on [Topic] | TWIS'' title pattern did the targeting, and the talk-show format''s low production ceased to matter because the claim itself was the production. Comment wars over the thesis drove free distribution.","observations":"TWIS proves Jason Calacanis''s investor-perspective positioning converts best when the take costs the speaker something — the audience of founders and investors shares clips as ammunition in their own arguments. The documented weakness (audio-focused, minimal editing) is irrelevant when the hook is a belief attack; their real gap, per the research, is not clipping these moments into short-form. The mechanism transfers to any format: find the credible insider saying the inconvenient thing.","transferableMoves":["Book or feature the person whose incentives point opposite to the claim they''re making.","Put the contrarian thesis in the title as a flat assertion, not a question.","Structure the video as problem (the consensus), then solution (the insider''s alternative playbook)."],"idea":{"title":"Why We Turned Down Our Term Sheet — Founder Reality","description":"For Founder Reality: our own against-interest confession — the money we said no to and what it cost us — using TWIS''s messenger-against-incentive mechanism with documentary production they can''t match.","tags":["contrarian","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 1580000, 42000, 0.5);
  end if;
  insert into _cv_map values ('cv_ci_this_week_in_startups_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_slidebean';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('How WeWork Burned $47 Billion Explained') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'How WeWork Burned $47 Billion Explained', 'https://youtube.com/watch?v=ci_slidebean_1', '2026-05-15T14:54:40.760Z', 'WeWork collapse', 'statistic', 'rise_and_fall', '$47 billion in the title, forensic receipts in the video. An education channel doing an autopsy instead of a how-to.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.6, '{"whyItWorked":"Slidebean''s baseline is ''[Startup topic] Explained'' how-to content, and this outlier kept the Explained framing but inverted it into a failure autopsy — the $47 billion statistic gave the mentor-like narrator a body to examine. Rise-and-fall structure turned their pitch-coaching expertise into forensic credibility: they could read the deck and the unit economics like an insider.","observations":"The mechanism is expertise-as-autopsy: their animated explainers and screen-recording style, normally used to teach, become evidence exhibits when pointed at a collapse. This is exactly the founder-story gap the research flags in their blind spots — the outlier proves their educational format monetizes drama better than advice. The enthusiasm in the narration keeps a grim story watchable, and the course funnel means the video sells the fix for the failure it just dissected.","transferableMoves":["Point teaching assets — decks, spreadsheets, screen recordings — at a failure and present them as exhibits.","Lead the title with the money destroyed, then the Explained promise.","End each act with the specific decision that made the next loss inevitable."],"idea":{"title":"The Pitch Deck That Raised Millions and Killed the Company","description":"For Business Storytelling: run a full rise-and-fall through the company''s actual artifacts — deck slides, pricing pages, org charts — as on-screen evidence, adapting Slidebean''s autopsy-by-exhibit mechanism to our documentary depth.","tags":["statistic","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4200000, 90000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_slidebean_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_startup_grind';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Melanie Perkins - 100 Rejections Before Canva') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Melanie Perkins - 100 Rejections Before Canva', 'https://youtube.com/watch?v=ci_startup_grind_1', '2026-03-13T14:54:40.760Z', 'Canva founding story', 'story_cold_open', 'case_study', 'Opens on the founder recounting rejection number 100 in her own voice. No narrator, no gloss — the authenticity is the production value.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.9, '{"whyItWorked":"This is Startup Grind''s ''[Founder Name] - [Company/Story]'' pattern executed on a story where the pain is quantified — 100 rejections — and told first-person. The cold open drops the viewer into the worst rejection before any context, and because the channel''s positioning is authentic founder voices with minimal production, the rawness reads as trust rather than cheapness.","observations":"The mechanism is unmediated testimony: the interview format the research lists as a production weakness becomes the moat when the story is emotionally specific — no scripted narrator can deliver ''they laughed at the idea'' like the founder can. Their documented blind spot, underutilized narrative editing, is visible even in the outlier: the raw material outperforms despite flat structure, not because of it. Cut properly, this format has more headroom than any competitor''s.","transferableMoves":["Start on the founder mid-story at the emotional low point, with zero introduction.","Quantify the struggle in the title — a count of rejections, months, or dollars lost.","Keep the founder''s voice as the only narration; use editing to add structure, never a voiceover."],"idea":{"title":"Every No We Got This Year, On Camera — Founder Reality","description":"For Founder Reality: apply unmediated testimony to our own channel by logging rejections as they happen, then cold-opening the episode on the worst one — Startup Grind''s authenticity mechanism plus the narrative editing they leave on the table.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 6800000, 70000, 0.3);
  end if;
  insert into _cv_map values ('cv_ci_startup_grind_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_newsthink';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why SpaceX Builds Rockets Faster Than NASA') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why SpaceX Builds Rockets Faster Than NASA', 'https://youtube.com/watch?v=ci_newsthink_1', '2026-06-16T14:54:40.760Z', 'SpaceX manufacturing speed', 'question', 'problem_solution', 'A David-vs-Goliath question the viewer assumes has a budget answer — then the video proves it''s a process answer. Expectation flip inside the first minute.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.4, '{"whyItWorked":"Textbook execution of NewsThink''s ''Why [tech trend]'' title pattern, but the outlier fuel is the institutional mismatch: a startup out-executing a government agency is an ambition story disguised as a tech explainer. The problem-solution structure lets Cindy Pom''s clear, journalist-trained narration set up the obvious wrong answer (money) before paying off the real one (iteration speed), and the professional b-roll-plus-graphics style makes engineering process feel cinematic.","observations":"The transferable mechanism is the expectation flip: pose a why question whose assumed answer is wrong, and the correction becomes the retention engine. NewsThink''s journalism background shows in sourcing and pacing — claims arrive with receipts, which suits their critical-thinking audience. The research notes their blind spot is under-indexing on founder stories; this video works precisely because a founder''s operating philosophy is the hidden protagonist.","transferableMoves":["Pose a why question where the audience''s default answer is confidently wrong.","Reveal the wrong answer first and dismantle it before introducing the real mechanism.","Translate abstract process advantages into concrete side-by-side comparisons on screen."],"idea":{"title":"Why Tiny Teams Ship Faster Than Funded Startups — Business Storytelling","description":"For Business Storytelling: use the expectation-flip question on a company we profile — the assumed answer is money or headcount, the documented answer is a founder''s process decision, told with receipts.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3300000, 160000, 0.6);
  end if;
  insert into _cv_map values ('cv_ci_newsthink_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_newsthink';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('How a Denny''s Dishwasher Built a $3 Trillion Company') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'How a Denny''s Dishwasher Built a $3 Trillion Company', 'https://youtube.com/watch?v=ci_newsthink_2', '2026-04-15T14:54:40.760Z', 'Jensen Huang origin story', 'story_cold_open', 'chronological', 'The title hides the name. Dishwasher-to-trillions is the gap; withholding ''Nvidia'' until the click makes curiosity do the marketing.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.3, '{"whyItWorked":"This outlier departs from NewsThink''s usual ''Why [tech trend]'' framing into pure origin narrative, and the mechanism is identity withholding: the title sells the distance between dishwasher and $3 trillion without naming Jensen Huang or Nvidia. The cold open at the Denny''s booth grounds the chronology in a physical place, and the professional b-roll-and-graphics production carries a 30-year arc without dragging.","observations":"What transfers is the anonymized-gap title: name the low point and the outcome, hide the identity, and let the face-plus-bold-text thumbnail tease recognition. Cindy Pom''s journalism training shows in the restraint — the video earns the trillion-dollar payoff with dated, verifiable milestones instead of hype. Per the research, founder stories are the channel''s own underexplored lane, and this outlier is the proof the audience wants NewsThink to go there.","transferableMoves":["Write the title as low point to outcome with the famous name withheld.","Anchor the cold open in one specific, humble physical location.","Mark the chronology with verifiable dated milestones so scale feels earned, not hyped."],"idea":{"title":"From a Rented Garage to Our First Million Views — Founder Reality","description":"For Founder Reality: apply identity-withholding at episode scale — open on the humble physical starting point and let dated milestones carry our own build-in-public chronology, failures kept in the timeline.","tags":["story_cold_open","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 8400000, 120000, 0.1);
  end if;
  insert into _cv_map values ('cv_ci_newsthink_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_coin_bureau';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why 99% of Crypto Projects Will Go to Zero') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why 99% of Crypto Projects Will Go to Zero', 'https://youtube.com/watch?v=ci_coin_bureau_1', '2026-06-08T14:54:40.760Z', 'Crypto project failure analysis', 'bold_claim', 'listicle', 'A crypto channel telling crypto holders their bags are worthless. Attacking the audience''s own portfolio is the retention engine.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.9, '{"whyItWorked":"The outlier mechanism is trusted-insider pessimism: Coin Bureau''s whole brand is credible crypto education, so a 99%-will-die claim from them reads as due diligence, not FUD. The listicle structure — failure pattern by failure pattern, each with chart evidence — lets every viewer watch to the end to check whether their own holdings match a pattern. Self-audit is the retention loop.","observations":"This follows their ''Why [Crypto topic]'' title pattern and leans on their documented chart-and-graphics editing style: every claim gets a professional visual receipt, which is what separates education from doomposting. The transferable move is making the viewer grade themselves against a criteria list — the video becomes a tool, not just a story. The research flags their blind spot as never connecting analysis to founder stories; each failure pattern here is an unnamed founder decision waiting to be told.","transferableMoves":["Make the bold claim implicate the viewer''s own decisions so watching becomes a self-audit.","Structure the body as named failure patterns, each proven with one chart or document.","Deliver the pessimistic thesis from a position of documented expertise, with receipts on screen."],"idea":{"title":"The 5 Decisions That Kill Founder-Led Companies — Business Storytelling","description":"For Business Storytelling: adapt the self-audit listicle — five documented failure patterns, each anchored to a real company''s paper trail, so founder viewers check their own company against every pattern.","tags":["bold_claim","listicle","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4900000, 180000, 0.4);
  end if;
  insert into _cv_map values ('cv_ci_coin_bureau_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_mrbeast';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('$456,000 Squid Game In Real Life!') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, '$456,000 Squid Game In Real Life!', 'https://youtube.com/watch?v=ci_mrbeast_1', '2026-06-21T14:54:40.760Z', 'Recreating a cultural moment at scale', 'statistic', 'chronological', 'Dollar figure in the first three words + a set everyone already recognized. Elimination format means a cliffhanger every 90 seconds.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.8, '{"whyItWorked":"The title is pure MrBeast pattern — ''$[amount] [activity]'' — bolted onto a piece of culture with pre-built awareness, so the packaging did zero educating. The chronological elimination structure manufactures stakes mechanically: 456 players becomes 1, and every cut is a mini-resolution. Shocked-face thumbnail in red/yellow high contrast matches his documented formula exactly.","observations":"What transfers is not the budget — it''s stakes-per-second. His 2-5 second cuts and rapid narration keep a payoff always less than a minute away. The JSON flags his blind spot: he never shows realistic risk or failure, and storytelling depth is format-driven. A documentary channel can borrow the escalating-stakes skeleton while filling it with the real tension he skips.","transferableMoves":["Put the single most concrete number of the story in the first three words of the title","Structure the edit so a stake resolves or escalates at least every 90 seconds","Anchor the packaging to something the audience already recognizes, so the thumbnail explains itself"],"idea":{"title":"We Bet $40,000 Of Our Own Money On One Video — Founder Reality","description":"For Founder Reality: take MrBeast''s number-first, escalating-stakes mechanic but aim it at the thing he never shows — real downside. Document an actual bet-the-budget decision chronologically, with the failure branch left in.","tags":["statistic","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3400000000, 200000000, 0.5);
  end if;
  insert into _cv_map values ('cv_ci_mrbeast_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_mrbeast';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('I Opened A Restaurant That Pays You To Eat At It') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'I Opened A Restaurant That Pays You To Eat At It', 'https://youtube.com/watch?v=ci_mrbeast_2', '2026-06-09T14:54:40.760Z', 'Inverted business model stunt', 'contrarian', 'problem_solution', 'The title inverts how a business works — restaurants take money, this one pays it. Curiosity gap is structural, not clickbait.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 4.2, '{"whyItWorked":"The whole video is a contrarian premise executed as problem_solution: an impossible business, then watching the logistics of actually running it for a day. It fits his ''I gave away $X'' title pattern while feeling fresh because the giving is disguised as a business model. The escalation problem the JSON flags (''requires constant escalation'') is solved here by novelty of premise rather than a bigger number.","observations":"The transferable mechanism is premise inversion — take a system everyone understands and flip one rule. His high-contrast thumbnail and shocked-expression formula do the rest, but the inversion is what earns the click for a viewer fatigued by pure dollar amounts. Per the JSON, his founder-as-billionaire narrative means viewers read even stunts as empire-building — the stunt doubles as brand lore.","transferableMoves":["Flip one rule of a familiar system and make that inversion the entire title","Frame a giveaway or expense as a business experiment so the video has a question to answer","Let the operational chaos on screen be the content — don''t cut around the logistics"],"idea":{"title":"The Company That Pays Customers To Leave","description":"Business Storytelling episode on real inverted business models (Zappos paying new hires to quit, insurers paying claims to close accounts) — MrBeast''s premise-inversion hook applied to documented corporate history instead of a stunt.","tags":["contrarian","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3300000000, 125000000, 0.4);
  end if;
  insert into _cv_map values ('cv_ci_mrbeast_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_how_money_works';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('How The 1% Use Life Insurance To Avoid Taxes') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'How The 1% Use Life Insurance To Avoid Taxes', 'https://youtube.com/watch?v=ci_how_money_works_1', '2026-04-29T14:54:40.760Z', 'Wealth-preservation loopholes', 'bold_claim', 'problem_solution', 'A boring product (''life insurance'') attached to a forbidden outcome (''avoid taxes''). The gap between the two is the click.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.4, '{"whyItWorked":"Classic ''How [financial system]'' title pattern from the JSON, but the outlier lift comes from pairing the dullest instrument in finance with class resentment — viewers click to learn the trick they''re excluded from. The problem_solution structure (here''s the tax problem, here''s the rich person''s workaround, here''s why you can''t use it) delivers a complete arc in 13 minutes with the channel''s dramatic AI narration keeping stakes high over b-roll and animations.","observations":"The mechanism is ''mundane instrument, illicit-feeling outcome'' — it works on any system where insiders play by different rules. The JSON notes their blind spot: they explain systems, never the people inside them; the loophole is presented with no named founder or family actually using it. A channel that CAN attach a human face to the mechanism gets the same click plus the retention their format leaves on the table.","transferableMoves":["Pair a boring, familiar noun with an outcome the audience believes is off-limits","Structure as problem → insider workaround → why it stays legal, so the payoff lands in act two, not the end","Keep the first 30 seconds jargon-free — name the unfairness before naming the instrument"],"idea":{"title":"The Boring Legal Trick That Saved Our Company $30K — Founder Reality","description":"Founder Reality adapts the mundane-instrument mechanic first-person: walk through a real, unglamorous structure we actually used (S-corp election, R&D credit), with the real numbers and the real accountant conversation — the human face How Money Works never shows.","tags":["bold_claim","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 10700000, 180000, 0.3);
  end if;
  insert into _cv_map values ('cv_ci_how_money_works_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_how_money_works';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why Companies Would Rather Lose Money Than Pay You More') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why Companies Would Rather Lose Money Than Pay You More', 'https://youtube.com/watch?v=ci_how_money_works_2', '2026-06-07T14:54:40.760Z', 'Wage suppression economics', 'contrarian', 'case_study', 'Attacks the ''companies are rational'' belief while validating a grievance every viewer holds. Comments section argues, algorithm rewards.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.9, '{"whyItWorked":"The contrarian claim sounds economically impossible, which forces the click to resolve the dissonance — then the case-study structure pays it off with real examples of firms burning margin to hold wage anchors. It hits the channel''s documented 16-40 financial-literacy audience exactly where personal grievance meets systems curiosity, and the cinematic b-roll plus dramatic narration make a labor-economics lecture feel like an exposé.","observations":"Transferable mechanism: state a corporate behavior as irrational, then reveal the hidden incentive that makes it rational — the reveal IS the retention curve. The JSON flags their AI voice-generation as a connection ceiling; the argument carries the video because the narrator can''t. A channel with a real human voice can run the same incentive-reveal structure with an authority the synthetic narration can''t match.","transferableMoves":["Open by framing a common corporate behavior as economically irrational, then spend the video revealing the incentive","Pick case studies the audience has personally experienced as employees or customers","Seed one defensible-but-arguable claim to convert the comment section into distribution"],"idea":{"title":"The Companies That Chose Bankruptcy Over Change","description":"Business Storytelling: apply the irrational-behavior-hidden-incentive reveal to rise-and-fall history — Kodak, Blockbuster, Sears — showing the incentive structure that made ''obviously dumb'' decisions locally rational for the executives who made them.","tags":["contrarian","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 7000000, 250000, 0.45);
  end if;
  insert into _cv_map values ('cv_ci_how_money_works_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_logically_answered';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Why Spotify Loses Money On Every Song You Stream') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Why Spotify Loses Money On Every Song You Stream', 'https://youtube.com/watch?v=ci_logically_answered_1', '2026-04-07T14:54:40.760Z', 'Streaming platform unit economics', 'question', 'problem_solution', 'A product everyone uses daily, framed as a business that shouldn''t exist. ''Why'' title promises the answer in one video.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.1, '{"whyItWorked":"Textbook execution of the channel''s ''Why [tech decision]'' title pattern: a paradox about a platform with universal daily usage, so the addressable curiosity is the entire audience. The problem_solution structure walks the incentive chain — label royalties, payout structure, why scale doesn''t fix it — matching the channel''s documented incentive-structure focus, with clean minimalist graphics keeping the argument legible at 11 minutes.","observations":"The transferable move is paradox-of-the-familiar: take a service the viewer touched today and assert its economics are broken, then resolve it through incentives rather than narrative. The JSON notes the blind spot — analysis with no people in it; nobody at Spotify is ever a character. A channel that pairs the same incentive autopsy with the founder who made each decision gets both the click and an emotional arc this format structurally lacks.","transferableMoves":["Pick a subject the viewer used in the last 24 hours and assert its business model is broken","Resolve the paradox by walking the incentive chain step by step, one graphic per link","Keep production minimal but the logic airtight — the argument is the production value"],"idea":{"title":"Our Video Business Loses Money On Every Upload (Here''s Why We Keep Going) — Founder Reality","description":"Founder Reality turns the unit-economics paradox on ourselves: publish our real per-video cost stack and the strategic reason the math still works — the incentive-chain walkthrough Logically Answered does, but with the founder in frame owning the numbers.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 7700000, 100000, 0.25);
  end if;
  insert into _cv_map values ('cv_ci_logically_answered_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_logically_answered';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Brutal Economics of Food Delivery Apps') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Brutal Economics of Food Delivery Apps', 'https://youtube.com/watch?v=ci_logically_answered_2', '2026-05-21T14:54:40.760Z', 'Gig platform economics', 'statistic', 'case_study', 'Opens on one number — what a $20 burrito order actually pays everyone in the chain. One receipt, whole industry indicted.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.4, '{"whyItWorked":"Follows the channel''s ''The [economics] of [platform]'' pattern, but the outlier lift is the single-receipt device: one concrete order decomposed line by line, so an abstract three-sided-market problem becomes a number the viewer recognizes from their own phone. The case-study structure (DoorDash as the specimen, the industry as the diagnosis) lets an 11-minute solo-produced video feel comprehensive without b-roll budget.","observations":"What transfers is decomposition-of-one-transaction — any opaque industry can be exposed through a single itemized example, and it plays perfectly to a minimalist text-overlay editing style like theirs. The JSON flags the one-person team and no audience monetization: the format is deliberately cheap, which means the mechanism, not production, is doing all the work. That''s exactly the kind of move a three-person team can steal wholesale.","transferableMoves":["Decompose one real transaction line-by-line instead of describing an industry in aggregate","Lead with the single most damning number as the cold open and the thumbnail","Use the one specimen company as a lens, then zoom out to the industry pattern in the final act"],"idea":{"title":"One $9.99 Subscription, Fully Dissected: Where The Money Actually Went","description":"Business Storytelling takes the single-receipt decomposition and applies it to a famous collapse — trace one customer''s payment through MoviePass in its dying months to narrate the whole rise-and-fall through a single transaction.","tags":["statistic","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3300000, 80000, 0.2);
  end if;
  insert into _cv_map values ('cv_ci_logically_answered_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_real_stories';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('From Riches To Rags: The Millionaires Who Lost Everything') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'From Riches To Rags: The Millionaires Who Lost Everything', 'https://youtube.com/watch?v=ci_real_stories_1', '2026-03-06T14:54:40.760Z', 'Wealth loss and identity', 'story_cold_open', 'rise_and_fall', 'Cold open on one person in one room describing the day it ended. No narrator, no montage — the face carries the first minute.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.6, '{"whyItWorked":"Real Stories'' documented formula — minimal narration, cinematic framing, faces-and-emotion thumbnails — is at maximum power on a rise-and-fall arc, because loss is the one story where silence outperforms exposition. The cold open drops the viewer into the aftermath first, making the whole 45-minute climb toward the fall feel inevitable, which is what sustains long-form retention for a 25-55 documentary audience.","observations":"The transferable mechanism is aftermath-first sequencing: show the wreckage, then earn it. The JSON explicitly flags their blind spot — no business or entrepreneurship angle at all; they have the emotional craft but never the founder subject matter. That gap is precisely our lane: the same subject-centered, narration-light treatment aimed at founders would be a video neither Real Stories nor the business explainer channels can make.","transferableMoves":["Open on the aftermath — the subject in the present, changed — before any timeline begins","Let the subject''s face hold the frame; cut narration wherever the interview can carry it","Build the thumbnail on genuine emotion in a real face, not text or graphics"],"idea":{"title":"The Day I Shut It Down — Founder Reality","description":"Founder Reality borrows the aftermath-first, narration-light treatment: sit a founder in the empty office a year after the shutdown and let them narrate their own rise-and-fall — Real Stories'' emotional craft pointed at the business subject matter the JSON says they never touch.","tags":["story_cold_open","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 15400000, 150000, 0.15);
  end if;
  insert into _cv_map values ('cv_ci_real_stories_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_daily_dose_of_internet';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('June 1, 2026 - Daily Dose of Internet') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'June 1, 2026 - Daily Dose of Internet', 'https://youtube.com/watch?v=ci_daily_dose_of_internet_1', '2026-06-01T14:54:40.760Z', 'Viral clip curation', 'story_cold_open', 'listicle', 'Best clip first, zero preamble. Each segment is 15-40 seconds, so abandoning mid-video never feels rational.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 3.7, '{"whyItWorked":"The dated title pattern turns the channel itself into the hook — viewers click the brand, not the topic, which is the endgame of format consistency. Inside, it''s a listicle engineered for retention: strongest clip cold-opens the video, minimal narration adds one line of context per clip, and the quick-cut montage style means the next payoff is always under 40 seconds away. The outlier happens when one embedded clip goes independently viral and drags the compilation with it.","observations":"What transfers isn''t curation — it''s segment-level retention design: treat every 30-second block as a unit that must justify itself, and front-load the best one instead of saving it. The JSON is blunt about the blind spots (no storytelling, no depth, trend-dependent), which means the mechanism is fully separable from the shallow content. Long-form documentaries lose viewers in the valleys between peaks; DDoI simply deleted the valleys.","transferableMoves":["Open with your single strongest moment, not context — earn the backstory later","Audit the edit in 30-second blocks and cut any block that doesn''t pay off on its own","Keep narration to one setup line per segment; let the footage deliver the punchline"],"idea":{"title":"Every Decision That Killed WeWork, In 60-Second Chapters","description":"Business Storytelling adapts DDoI''s segment-level retention design to a rise-and-fall: one collapse told as self-contained 60-second decision chapters, strongest chapter first, so a 20-minute documentary has the abandon-resistance of a compilation.","tags":["story_cold_open","listicle","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 9800000, 300000, 0.6);
  end if;
  insert into _cv_map values ('cv_ci_daily_dose_of_internet_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_ci_statquest_with_josh_star';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Transformer Neural Networks Clearly Explained') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Transformer Neural Networks Clearly Explained', 'https://youtube.com/watch?v=ci_statquest_with_josh_star_1', '2026-02-07T14:54:40.760Z', 'AI fundamentals education', 'question', 'problem_solution', 'Rode the ChatGPT wave with the exact promise the channel always makes: ''Clearly Explained.'' The brand IS the retention guarantee.', 'Representative outlier reconstructed from the July 2026 CI research; stats are illustrative of the channel''s outlier scale.', true, 2.2, '{"whyItWorked":"The title is the channel''s one documented pattern — ''[Statistical Concept] Clearly Explained'' — applied to the single most-searched technical concept of the AI boom, so an evergreen format caught a trend tailwind. The implicit question (''how does this actually work?'') is resolved via problem_solution: build the intuition failure first, then fix it piece by piece with his hand-drawn animations and patient, enthusiastic narration that makes an 8-minute lecture feel safe for intimidated learners.","observations":"The transferable mechanism is promise standardization: one repeated title suffix that functions as a quality contract, so each video inherits trust from every previous one. The JSON notes he''s best-in-class in a narrow lane and flags the blind spot — he never connects concepts to the startups and founders built on them. The trend-intercept move (evergreen format × breaking topic) works for any channel with a recognizable format contract.","transferableMoves":["Standardize one title suffix as a quality promise and never publish under it below the bar","When a trend breaks, ship your evergreen format aimed at it within the attention window","Start from the learner''s wrong intuition and repair it stepwise, rather than presenting the right answer"],"idea":{"title":"How We Actually Decided, Clearly Explained — Founder Reality","description":"Founder Reality builds its own StatQuest-style format contract: a recurring ''Clearly Explained'' segment that decomposes one real founder decision (pricing, firing, pivot) stepwise from the wrong intuition to what we did — the standardized-promise mechanism applied to decisions instead of statistics.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.760Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 18600000, 150000, 0.1);
  end if;
  insert into _cv_map values ('cv_ci_statquest_with_josh_star_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_let_s_talk_religion';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What is Gnosticism?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What is Gnosticism?', 'https://youtube.com/watch?v=cx_let_s_talk_religion_1', '2026-04-19T14:54:40.761Z', 'Gnosticism and early Christian diversity', 'question', 'chronological', 'The flagship ''What is X?'' title owns the single highest-intent search query on the topic, and 40 minutes of calm scholarly narration converts that search click into podcast-length watch time.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.3, '{"whyItWorked":"Filip Holm''s ''What is [tradition]?'' pattern is a search-intent monopoly: one definitive, evergreen answer to the question everyone types. The question hook promises orientation rather than sensation, and the unhurried chronological walk from Sethians to Valentinus rewards the trust with genuine scholarship, so the video compounds for years as both YouTube result and podcast episode.","observations":"The mechanism is definitive-explainer positioning, not the topic: classical-artwork slideshow, clean serif thumbnail text, and a soft-spoken lecture-essay voice that doubles as audio. His own documented weakness is that these are essays, not stories — flat chronology with no characters or stakes — which is exactly the surface a narrative channel can add without losing the search equity.","transferableMoves":["Claim one high-intent ''What is/was X?'' query per topic cluster and make the single definitive long-form answer to it.","Mix every video''s audio so it works eyes-closed — script for listeners first, then layer visuals.","Use one consistent thumbnail system (classical artwork + serif title) so the catalog reads as a trustworthy reference shelf."],"idea":{"title":"What Was Early Christian Worship Actually Like?","description":"Take Let''s Talk Religion''s search-owning definitive-explainer mechanism and add the narrative layer Holm skips: answer the query through a reconstructed second-century house-church gathering — the meal, the hymns, the letter read aloud — grounded in Justin Martyr, the Didache and Pliny, so Myth & Meaning owns the search term with characters and stakes instead of a flat essay.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4700000, 70000, 0.15);
  end if;
  insert into _cv_map values ('cv_cx_let_s_talk_religion_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_let_s_talk_religion';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The History of Christian Mysticism') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The History of Christian Mysticism', 'https://youtube.com/watch?v=cx_let_s_talk_religion_2', '2026-06-09T14:54:40.761Z', 'Christian mystical tradition from the Desert Fathers to Meister Eckhart', 'story_cold_open', 'case_study', 'Opening inside a mystic''s own words — a vision quoted before any framing — gives his usual survey format a rare moment of narrative pull, then the survey delivers depth no shorter channel matches.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.1, '{"whyItWorked":"Instead of his usual definition-first opening, this one cold-opens on a first-person mystical account, and the video advances as a chain of figure-by-figure case studies — Antony, Pseudo-Dionysius, Eckhart — rather than pure chronology. It''s the closest his catalog gets to character-driven structure, and it noticeably outperformed his Christianity baseline because the mysticism-interest segment of his audience got people, not just concepts.","observations":"What transfers is the case-study chain: carrying a 40-minute survey on the backs of five vivid individuals keeps the academic-trust promise while fixing his documented ''essays, not stories'' weakness. The slideshow-of-manuscripts editing style and ambient-music pacing also show that production cost is not what earns this audience — sourcing and voice are.","transferableMoves":["Open on a primary-source quotation performed cold, before any topic framing or channel intro.","Structure long surveys as a relay of 4-6 individual lives, each a self-contained case study with a handoff.","Let slow pans over period art carry the visuals — spend the budget on research and script instead."],"idea":{"title":"The Desert Fathers: Christianity''s First Monks","description":"Apply the Let''s Talk Religion figure-relay mechanism to the fourth-century Egyptian desert: cold-open on one of Antony''s temptations from Athanasius'' Life, then chain case studies of Antony, Pachomius, Evagrius and Syncletica to show how the monastic idea was invented — an academic narrative Holm''s survey style grazes but never dramatizes.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2510000, 95000, 0.35);
  end if;
  insert into _cv_map values ('cv_cx_let_s_talk_religion_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_hochelaga';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Nephilim: The Bible''s Forgotten Giants') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Nephilim: The Bible''s Forgotten Giants', 'https://youtube.com/watch?v=cx_hochelaga_1', '2026-05-15T14:54:40.761Z', 'The Nephilim in Genesis 6 and Second Temple literature', 'story_cold_open', 'case_study', 'Six verses of Genesis treated as an unsolved textual mystery: a moody cold open on the strange passage itself, then an atmospheric investigation that never fully closes the case, leaving the wonder intact.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.7, '{"whyItWorked":"Trelawny''s signature move is selecting a canonical-but-weird fragment and packaging it as a mystery: dark single-figure thumbnail with no text, a cold open reading the Genesis passage over drone music, then a case-study walk through what interpreters made of it. He poses questions instead of lecturing, so viewers who arrived for ''giants'' stay for atmosphere — his apocrypha and Nephilim videos are documented 500K-1M+ performers.","observations":"The transferable mechanism is curiosity-gap topic selection from inside the canon — the strangest verses everyone has skimmed past — plus a thumbnail system (eerie artwork, dark glow, minimal text) built for browse traffic. The JSON flags his light sourcing as a weakness: he wins the click but caps depth at 15 minutes, leaving the definitive cited treatment on the table.","transferableMoves":["Mine canonical texts for their strangest short passages and lead with the strangeness, not the syllabus.","Design thumbnails as a single eerie artwork with dark background and zero text, optimized for browse.","Narrate in open questions — let the viewer feel the mystery before you weigh the scholarly answers."],"idea":{"title":"Cherubim: The Monsters Guarding Eden","description":"Borrow Hochelaga''s canon-weirdness mechanism for a figure he''d package as spooky and we can package as scholarship: the cherubim of Genesis and Ezekiel read against Assyrian lamassu and ancient Near Eastern throne-guardian iconography — the same eerie cold open and dark thumbnail, but 40 minutes with citations on screen, serving the viewer who graduates past atmosphere.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4640000, 100000, 0.4);
  end if;
  insert into _cv_map values ('cv_cx_hochelaga_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_hochelaga';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What''s Inside the Ark of the Covenant?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What''s Inside the Ark of the Covenant?', 'https://youtube.com/watch?v=cx_hochelaga_2', '2026-06-18T14:54:40.761Z', 'The Ark of the Covenant: construction, veneration and disappearance', 'question', 'rise_and_fall', 'A ''What''s inside?'' question the thumbnail refuses to answer, mapped onto the Ark''s natural rise-and-fall arc — built, carried, enshrined, and then simply gone from the record — so the structure itself is the cliffhanger.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.9, '{"whyItWorked":"The title matches his documented \"What''s Inside [lost thing]?\" pattern — a physical-object curiosity gap that works on religious and secular viewers alike. The rise-and-fall arc does the retention work: each act of the Ark''s biography ends closer to the moment it vanishes from the biblical text, and the cinematic grading and negative space make an artifact history feel like a thriller without a single sensational claim.","observations":"What transfers is object biography as structure: artifacts have built-in arcs (made, venerated, lost) that give chronology stakes. His weaknesses per the research — no on-screen sourcing, 15-minute cap, no membership ladder — mean the same object treated at 45 minutes with scholar-grade rigor is an open lane rather than a copy.","transferableMoves":["Pick a physical artifact and structure the video as its biography, ending on the moment the record goes silent.","Pose the title as a question about a concrete hidden or lost thing, and withhold the answer from the thumbnail.","Grade the visuals dark and slow — atmosphere is a retention tool, not decoration."],"idea":{"title":"What Happened to the Temple Menorah?","description":"Take Hochelaga''s lost-object biography mechanism to an artifact with a better paper trail than the Ark: the Second Temple menorah — carved on the Arch of Titus, paraded through Rome, last attested in late antique sources before the trail dies. Myth & Meaning tells the full rise-and-fall with the primary sources on screen, delivering the definitive cited version his format can''t.","tags":["question","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2880000, 150000, 0.55);
  end if;
  insert into _cv_map values ('cv_cx_hochelaga_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_usefulcharts';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Biblical Family Tree: Adam & Eve to Jesus') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Biblical Family Tree: Adam & Eve to Jesus', 'https://youtube.com/watch?v=cx_usefulcharts_1', '2026-02-10T14:54:40.761Z', 'The complete biblical genealogy in one wallchart', 'statistic', 'chronological', 'One staggering countable promise — every generation from Adam to Jesus on a single chart — turns an abstract topic into a finite visual object the camera can literally walk across.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.5, '{"whyItWorked":"The hook is a number: dozens of generations, every named ancestor, one chart. That completeness claim (''Every X, Explained in One Chart'' per his documented patterns) makes the video feel like acquiring a reference object rather than watching an essay, and the camera panning across the physical wallchart gives constant visual progress. Matt Baker''s PhD in Religious Studies lets him flag which links are traditional versus historical without breaking the friendly teacher register — and the video doubles as an ad for the purchasable chart.","observations":"What transfers is the completeness contract and the spatial anchor: a single persistent visual the whole video navigates, so viewers always know where they are and how much remains. Per the research, the chart shows the ''what'' but never the ''why it mattered'' — the structural overview deliberately leaves the narrative depth to someone else.","transferableMoves":["Anchor a long video to one persistent master visual and navigate it on screen, never cutting away for long.","Make a countable completeness promise in the title and visibly deliver every unit of it.","Distinguish tradition from history explicitly on screen — the honesty deepens authority instead of undercutting the hook."],"idea":{"title":"The House of Herod: One Family Tree, Five Gospels","description":"Adapt the UsefulCharts persistent-chart mechanism into narrative: build one on-screen Herodian family tree and light it up node by node as the story moves — the temple builder, the sons Rome deposed, the tetrarch who beheaded John, the grandson of Acts 12 — so the lineage becomes a political drama with the chart as map, giving Myth & Meaning the ''why it mattered'' the chart format structurally omits.","tags":["statistic","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 12160000, 100000, 0.1);
  end if;
  insert into _cv_map values ('cv_cx_usefulcharts_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_usefulcharts';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Who Wrote the Bible? Part 1: The Torah') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Who Wrote the Bible? Part 1: The Torah', 'https://youtube.com/watch?v=cx_usefulcharts_2', '2026-06-01T14:54:40.761Z', 'The Documentary Hypothesis and Torah authorship', 'question', 'problem_solution', 'A genuinely contested scholarly question posed plainly, then answered with a color-coded chart that makes the Documentary Hypothesis — J, E, P, D — legible to a lay viewer in twenty minutes.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.9, '{"whyItWorked":"The question hook works because Baker actually has standing to answer it — the PhD credential converts a provocative title into a trustworthy one, matching his documented ''Is [biblical claim] true? (chart-based)'' pattern. The problem-solution structure maps the messy scholarship onto a visual: the problem is contradictions in the text, the solution is sources rendered as colors on one chart, so an abstract academic debate becomes something you can literally see.","observations":"The transferable mechanism is visual encoding of an argument — not just illustrating a claim but making the evidence itself graphical, so the viewer feels they verified it rather than took it on faith. Per the research, his religion videos stay structural overviews tied to sellable charts; the source-driven storytelling behind the diagram is the documented open lane.","transferableMoves":["Encode the argument itself visually (color-coded sources, layered timelines) so viewers can inspect the evidence, not just hear it.","Lead with a contested question you have documented standing to answer, and show the credentials early.","Split monster topics into numbered parts to build a binge chain instead of one bloated video."],"idea":{"title":"The Q Source: Reconstructing a Gospel Nobody Has Ever Seen","description":"Apply the UsefulCharts evidence-you-can-see mechanism to the synoptic problem: put Matthew, Mark and Luke on screen as three color-coded columns and let viewers watch the shared material emerge until the hypothetical Q document assembles itself — a scholarly detective story for Myth & Meaning where the visual encoding is the argument, told with full academic honesty about what remains hypothesis.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3940000, 120000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_usefulcharts_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_voices_of_the_past';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('A Roman Governor Interrogates the First Christians (112 AD) // Pliny''s Letters') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'A Roman Governor Interrogates the First Christians (112 AD) // Pliny''s Letters', 'https://youtube.com/watch?v=cx_voices_of_the_past_1', '2026-03-26T14:54:40.761Z', 'Pliny the Younger''s correspondence with Trajan about early Christians', 'story_cold_open', 'case_study', 'A hired voice actor performs Pliny''s actual letter cold — a Roman official genuinely unsure what to do with these ''Christians'' — and the audience realizes they''re hearing the earliest outside description of the faith, verbatim.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4, '{"whyItWorked":"The channel''s whole moat is performed primary sources, and this outlier is the format at its purest: cold-open into the voice-acted letter with no preamble, matching the documented ''[Eyewitness]''s Account of [event] // Primary Source'' title pattern that promises authenticity in the packaging itself. Treating the Pliny-Trajan exchange as a self-contained case study gives it courtroom tension — accusation, test, verdict — without a single dramatized invention.","observations":"What transfers is the authenticity contract: premium voice acting plus quoted-source framing in title and thumbnail signals ''this really happened'' before playback starts, and slow pans over period art keep production costs sane. The research notes the accounts are presented raw with little scholarly interpretation — immersion without framing — which is precisely the gap a credentialed narrative channel closes.","transferableMoves":["Cold-open on a performed primary source before any narrator framing, and cast real voice actors for it.","Put the source itself in the title with its date — the document is the celebrity.","Follow every performed passage with a beat of scholarly framing: what this line reveals and how we know."],"idea":{"title":"A Bishop Writes on His Way to Die: The Letters of Ignatius","description":"Take the Voices of the Past performed-document mechanism and add the interpretive layer it omits: a voice actor performs Ignatius of Antioch''s letters as he is marched to Rome around 110 AD, while Myth & Meaning''s narrator frames each excerpt with what it shows about earliest church structure, martyrdom theology and the scholarly debates over the letters'' authenticity.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4750000, 55000, 0.15);
  end if;
  insert into _cv_map values ('cv_cx_voices_of_the_past_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_voices_of_the_past';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What Was It Like to Face the Roman Arena? The Prison Diary of Perpetua (203 AD)') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What Was It Like to Face the Roman Arena? The Prison Diary of Perpetua (203 AD)', 'https://youtube.com/watch?v=cx_voices_of_the_past_2', '2026-05-27T14:54:40.761Z', 'The prison diary of the martyr Perpetua of Carthage', 'question', 'chronological', 'The ''What was it like?'' question is answered by the rarest possible source — a first-person diary written by a young woman in the days before her execution — and the diary''s own day-by-day order supplies a countdown structure no editor could improve on.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.2, '{"whyItWorked":"This uses the channel''s documented ''What Was It Like to [experience]?'' pattern, and the source selection does the emotional work: Perpetua''s diary is one of the earliest surviving texts by a Christian woman, so the experiential question lands with real weight. Playing the entries in strict chronological order turns the video into a countdown — each dated entry is one day closer to the arena — producing dread and empathy from nothing but faithful reading.","observations":"The mechanism that transfers is source-as-protagonist with a built-in clock: diaries, trial records and dated letters carry their own suspense structure. The research notes the anthology model builds no serialized hooks or personal authority — a named scholarly host running a themed martyr-texts series converts the same immersion into recurring viewership.","transferableMoves":["Choose sources with internal chronology — diaries, dated letters, trial transcripts — and let their own sequence structure the edit.","Frame experiential titles as questions the primary source will answer in the first person.","Cast voices that match the writer''s age and station; the casting is half the authenticity."],"idea":{"title":"Egeria: The Woman Who Wrote Christianity''s First Travel Diary","description":"Apply Voices of the Past''s diary-with-a-clock mechanism to a journey instead of a martyrdom: a voice actor performs the fourth-century pilgrim Egeria''s travelogue through Sinai and Jerusalem stage by stage, while Myth & Meaning frames what her eyewitness liturgies reveal about how fourth-century Christian worship actually worked — immersion plus the scholarly interpretation the original format leaves out.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2390000, 65000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_voices_of_the_past_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_dan_mcclellan';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Does the Bible really describe heaven and hell?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Does the Bible really describe heaven and hell?', 'https://youtube.com/watch?v=cx_dan_mcclellan_1', '2026-06-22T14:54:40.761Z', 'Afterlife concepts in the Hebrew Bible versus popular assumption', 'contrarian', 'problem_solution', 'A four-minute single take that contradicts something nearly every viewer assumes, delivered in flat academic diction — the total absence of hype is itself the credibility signal that makes the correction shareable.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.7, '{"whyItWorked":"The mechanism is credentialed contradiction at zero production cost: the claim appears as on-screen text (his documented format), and the problem-solution beat is compressed to seconds — here''s what people say, here''s what the data indicate. His deliberately unemotional delivery and catchphrases (''the data indicate'') turn restraint into a brand, and the deconstruction-audience psychographics reward any correction of a childhood certainty.","observations":"What transfers is misconception-first topic selection: he starts from what the audience already believes and mines the gap between assumption and text. The research is explicit that he never tells stories and builds no long-form catalog — his velocity primes millions of viewers for exactly the immersive treatment his format cannot deliver.","transferableMoves":["Open by stating the popular assumption verbatim on screen, then pivot to what the sources actually say.","Keep delivery deliberately flat when correcting — underclaiming is the authority signal in this niche.","Show citations on screen at the moment of the claim, not in the description."],"idea":{"title":"Which Ten Commandments? The Three Lists Nobody Notices","description":"Scale Dan McClellan''s assumption-versus-text mechanism to long form for Myth & Meaning: everyone assumes one canonical list of ten, but Exodus 20, Deuteronomy 5 and Exodus 34 differ — and Jewish, Catholic and Protestant traditions number them differently. A 35-minute narrative history of how the lists diverged, with every verse on screen, honestly framed as textual history rather than gotcha.","tags":["contrarian","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 5120000, 320000, 0.6);
  end if;
  insert into _cv_map values ('cv_cx_dan_mcclellan_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_dan_mcclellan';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Bible has never changed? What the manuscripts say') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Bible has never changed? What the manuscripts say', 'https://youtube.com/watch?v=cx_dan_mcclellan_2', '2026-06-07T14:54:40.761Z', 'Textual variants and manuscript transmission', 'bold_claim', 'case_study', 'He puts the maximal version of a viral claim on screen — ''the Bible has never changed'' — then walks one concrete manuscript example through it, and the specificity of a single verse''s paper trail does more damage than any generalization could.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.6, '{"whyItWorked":"The bold claim in the title is someone else''s — his documented reactive format rides an apologist''s virality for free reach, per the ''Responding to [influencer]'' pattern. The case-study structure is the persuasion engine: rather than asserting ''there are variants,'' he shows one verse across manuscripts in split screen, and the viewer draws the conclusion themselves. Ehrman-adjacent material compressed to commute length.","observations":"What transfers is receipts-at-the-moment-of-claim: the evidence appears on screen in the same breath as the assertion, which is why his audience calls it ''data over dogma.'' The research notes his content is Bible-only rebuttal with no evergreen catalog — the same evidentiary style applied to narrative history is uncontested ground.","transferableMoves":["Quote the strongest version of the claim you''re examining, on screen, before responding to it.","Argue through one concrete example a viewer can verify, not through summary statistics.","Use split screen to place claim and primary source side by side at the decisive moment."],"idea":{"title":"The Verse That Wasn''t There: The Story of the Johannine Comma","description":"Turn Dan McClellan''s one-verse-receipts mechanism into a full Myth & Meaning documentary: follow 1 John 5:7 — the Trinity proof-text absent from early Greek manuscripts — from marginal gloss to Erasmus''s printed editions to the King James, showing each manuscript on screen as evidence. The story of how one sentence entered the Bible, told as careful textual history with no gotcha framing.","tags":["bold_claim","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 5600000, 200000, 0.5);
  end if;
  insert into _cv_map values ('cv_cx_dan_mcclellan_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_mythvision_podcast';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Bart Ehrman: How Jesus Became God') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Bart Ehrman: How Jesus Became God', 'https://youtube.com/watch?v=cx_mythvision_podcast_1', '2026-06-13T14:54:40.761Z', 'Early Christology and the development of belief in Jesus'' divinity', 'bold_claim', 'case_study', 'The title is the guest''s own published thesis stated flat — scholar name plus provocative claim — so the credibility and the curiosity gap arrive in the same six words, and two hours of access to Ehrman himself is the product.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.4, '{"whyItWorked":"This is the channel''s documented ''[Scholar name]: [provocative thesis]'' pattern at full power: the bold claim is borrowed from a bestselling scholar, so it reads as scholarship rather than clickbait, and Derek Lambert''s deferential ex-fundamentalist hosting lets the guest teach for two hours. The case-study structure — one thesis, examined from every angle with the person who wrote it — is what his marathon-listening audience shows up for.","observations":"What transfers is thesis-as-title packaging and the scholar-access moat: he has made himself the default distribution channel for critical scholars promoting new work. The research is equally clear on the ceiling — podcast-grade production, zero visual storytelling, no rewatch value — so the interviews function as raw ore for whoever refines them.","transferableMoves":["Package videos around one named scholarly thesis stated plainly in the title, and attribute it.","Treat published scholarship as your development pipeline — the books signal which theses have proven demand.","Insert primary-source visuals (manuscripts, inscriptions) at the exact moments they''re discussed instead of staying on talking heads."],"idea":{"title":"What the First Christians Sang: The Hymns Hidden in the New Testament","description":"Do what MythVision''s format can''t: synthesize the scholarship his guests discuss into a scripted visual documentary. Build it on a published thesis — that passages like Philippians 2 preserve pre-Pauline hymns about Christ — and stage the argument with performed reconstructions and manuscripts on screen, giving Myth & Meaning the refined, rewatchable version of material his audience currently gets as two-hour raw interviews.","tags":["bold_claim","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2780000, 120000, 0.45);
  end if;
  insert into _cv_map values ('cv_cx_mythvision_podcast_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_mythvision_podcast';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Dennis MacDonald: Did the Gospel of Mark Imitate Homer?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Dennis MacDonald: Did the Gospel of Mark Imitate Homer?', 'https://youtube.com/watch?v=cx_mythvision_podcast_2', '2026-06-02T14:54:40.761Z', 'Mimesis criticism and the Gospel of Mark''s literary context', 'question', 'problem_solution', 'A question title that sounds outrageous until you learn a senior scholar has spent a career on it — the video''s job is walking the gap between ''surely not'' and ''here''s the case,'' and that walk is the retention curve.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.3, '{"whyItWorked":"The question hook flags a genuinely contested thesis rather than settled fact, which keeps the packaging honest while maximizing curiosity — the ''Did [figure] really [claim]?'' pattern from his documented playbook. Problem-solution structure carries it: the problem is Mark''s puzzling narrative choices, the proposed solution is deliberate imitation of Greek epic, and the guest presents parallels passage by passage while viewers argue in the comments, feeding session time.","observations":"What transfers is fringe-of-consensus topic selection: theses far enough from the textbook to feel electric, close enough to real scholarship to survive scrutiny — always attributed to their actual proponent. The research notes the deconstruction framing alienates the larger curious-but-neutral audience; a comparative-literature framing of the same material reads as fascinating rather than combative.","transferableMoves":["Source topics from the contested edge of real scholarship and name the scholar who defends the thesis.","Frame provocative theses as open questions and give the counter-arguments real screen time.","Show the textual parallels side by side and let viewers judge — participation drives comments and session time."],"idea":{"title":"Paul and the Stoics: What the Apostle Borrowed from Greek Philosophy","description":"Adapt MythVision''s contested-thesis mechanism into Myth & Meaning''s neutral comparative frame: put Paul''s letters beside Seneca and Epictetus on screen and weigh the mainstream scholarly debate over how much Stoic vocabulary and ethics shaped him — a passage-by-passage visual investigation that treats the question as ancient intellectual history, capturing the curious audience the deconstruction framing turns away.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4160000, 130000, 0.35);
  end if;
  insert into _cv_map values ('cv_cx_mythvision_podcast_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_bart_d_ehrman';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Did Jesus Really Exist? What Scholars Actually Know') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Did Jesus Really Exist? What Scholars Actually Know', 'https://youtube.com/watch?v=cx_bart_d_ehrman_1', '2026-04-07T14:54:40.761Z', 'Historicity of Jesus and the scholarly evidence', 'question', 'problem_solution', 'Puts the niche''s single biggest search question in the title and answers it with the one person whose name IS the citation — authority converts curiosity clicks into hour-long watch sessions.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.7, '{"whyItWorked":"The title is a verbatim match for Ehrman''s documented ''Did [biblical event] really happen?'' pattern, and the branded template thumbnail (his face plus large question text over a Renaissance painting) signals ''the definitive answer'' before the click. The problem_solution structure — lay out the mythicist challenge, then walk the evidence — gives a lecture the propulsion of a verdict.","observations":"What transfers is not Ehrman''s fame but the mechanism: pose the audience''s most-searched question, then resolve it with visible evidentiary discipline. His avuncular, supremely confident lecture cadence and chaptered two-camera format prove that authority plus a genuine question outperforms production value — his editing is deliberately corporate and it still outlies. Note also the funnel logic: the video presumes nothing, but every chapter is an ad for structured depth (his paid courses).","transferableMoves":["Title the video as the exact question viewers type into search, then answer it with a stated verdict by the end.","Open by steelmanning the doubt (the ''problem'') before presenting evidence, so skeptical viewers stay for the resolution.","Chapter the argument like a course syllabus so the video doubles as a reference viewers return to and share."],"idea":{"title":"Did the Exodus Really Happen? What the Archaeology Actually Says","description":"Apply the Bart D. Ehrman mechanism — the niche''s biggest search question answered with evidentiary discipline — to the Hebrew Bible''s founding story. Steelman the traditional account first, then walk through Egyptian records, Sinai archaeology, and the scholarly consensus with on-screen citations, delivered as cinematic narrative rather than his talking-head lecture. Honest verdict, no debunking glee.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3990000, 52000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_bart_d_ehrman_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_bart_d_ehrman';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Misquoting Jesus: How Scribes Changed the New Testament') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Misquoting Jesus: How Scribes Changed the New Testament', 'https://youtube.com/watch?v=cx_bart_d_ehrman_2', '2026-06-04T14:54:40.761Z', 'Textual criticism and scribal changes to New Testament manuscripts', 'bold_claim', 'case_study', 'Leads with the claim that made him a bestseller — the text you read isn''t exactly the text that was written — then proves it with specific manuscripts, turning dry textual criticism into a stakes-laden reveal.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.2, '{"whyItWorked":"The bold claim is pre-validated brand equity — ''Misquoting Jesus'' is both his NYT bestseller and his podcast, so the title compounds twenty years of authority into one click. The case_study structure grounds the provocation instantly: instead of arguing abstractly, he walks specific passages and shows exactly what changed, which makes the claim feel discovered rather than asserted.","observations":"The transferable mechanism is claim-then-receipts: a startling but scholarly-consensus statement, immediately cashed out in named, checkable examples. His podcast co-host format (Megan Lewis asking the lay questions) keeps a 70-year-old scholar''s output consistent and gives newcomers an on-ramp — a structural trick, not a personality one. His under-optimized packaging (JSON flags weak titles/thumbnails relative to the funnel) means the same material with documentary craft has headroom.","transferableMoves":["State the boldest defensible version of the scholarly consensus in the title, then spend the video earning it with named examples.","Anchor every abstract claim to one specific passage or artifact the viewer can look up afterward.","Build a recurring series brand around one strong claim so each episode compounds the last one''s authority."],"idea":{"title":"The Verse That Wasn''t There: How a Line Got Added to the Bible","description":"Take Bart D. Ehrman''s claim-then-receipts mechanism and give it the cinematic treatment his channel never will: the story of the Johannine Comma — the Trinity proof-text at 1 John 5:7 that appears in no early Greek manuscript. Trace one verse across a millennium of copying, from marginal note to printed Bible to modern footnote, as a single-passage case study in how texts actually travel. Mainstream textual criticism, told as narrative.","tags":["bold_claim","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2680000, 88000, 0.5);
  end if;
  insert into _cv_map values ('cv_cx_bart_d_ehrman_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_alex_o_connor_cosmicskep';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Richard Dawkins on God, Memes, and Cultural Christianity') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Richard Dawkins on God, Memes, and Cultural Christianity', 'https://youtube.com/watch?v=cx_alex_o_connor_cosmicskep_1', '2026-06-16T14:54:40.761Z', 'Long-form interview with Richard Dawkins on cultural Christianity', 'contrarian', 'case_study', 'The world''s most famous atheist saying something warm about Christianity is a perfect contrarian engine — both tribes click to see their champion challenged, and O''Connor''s courteous Socratic pressure keeps them for two hours.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.5, '{"whyItWorked":"Celebrity-tier guest access supplies the click, but the outlier engine is the contrarian tension in the framing: the arch-atheist entertaining ''cultural Christianity'' violates both audiences'' expectations at once. The dark cinematic studio set and moody guest-plus-Alex thumbnail (his documented pattern) package a podcast as prestige television, and his steelmanning Socratic style — probing one guest''s position as a deep case study — earns the cross-tribal trust that is literally his brand.","observations":"We can''t book Dawkins, but the mechanism transfers without the guest: stage a genuine expectation-violation at the center of the packaging, then treat it with such visible fairness that both sides share it. His restrained editing grammar — paintings, slow zooms, quotation cards in serif type — is exactly our register and cheap to match. Note his weakness per the research: he debates what texts mean but never immerses viewers in the ancient world, so his primed audience has no narrative outlet.","transferableMoves":["Build the packaging around a credible expectation-violation (a scholar''s surprising position), not around a scandal.","Steelman the position you''ll ultimately complicate — on screen, in its strongest form — before examining it.","Use quotation cards and classical art with slow zooms to make argument-driven segments feel prestige rather than lecture-like."],"idea":{"title":"When Did Christians Start Worshipping Jesus as God? The Debate That Split the Scholars","description":"Adapt Alex O''Connor''s cross-tribal fairness mechanism for narrative history: take the real early-high-Christology debate (Hurtado and Bauckham vs. Ehrman''s evolutionary view), steelman each side in its strongest form with quotation cards and primary sources, then walk the first-century evidence as an immersive story rather than a studio conversation. The expectation-violation is genuine — the ''slow evolution'' answer many viewers assume is itself contested by mainstream scholars.","tags":["contrarian","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 8940000, 430000, 0.6);
  end if;
  insert into _cv_map values ('cv_cx_alex_o_connor_cosmicskep_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_alex_o_connor_cosmicskep';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Most Disturbing Story in the Bible') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Most Disturbing Story in the Bible', 'https://youtube.com/watch?v=cx_alex_o_connor_cosmicskep_2', '2026-05-29T14:54:40.761Z', 'Solo video essay close-reading a troubling biblical narrative', 'bold_claim', 'problem_solution', 'A superlative claim (''most disturbing'') from a host famous for fairness carries weight clickbait can''t fake — viewers trust that whatever he ranked first will actually earn the label, and the essay pays it off with a rigorous close reading.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.9, '{"whyItWorked":"This matches his documented ''The [strangest/most disturbing] [Bible topic]'' title pattern: a superlative bold claim whose credibility is borrowed from his arbiter reputation. The problem_solution structure does the retention work — the passage is presented as a genuine interpretive problem, competing scholarly readings are auditioned, and the essay lands on the most defensible one, so the video satisfies both the curious and the rigorous.","observations":"The mechanism is superlative-plus-earned-payoff: you may only claim ''most'' if the treatment visibly considers alternatives, which is exactly what our academic register can do. His solo-essay grammar — classical paintings, slow zooms, serif quotation cards, measured Oxford narration — is the low-cost half of his format (the studio interviews are the expensive half), and per the research his solo essays have become rare, leaving this proven format under-supplied on his own channel.","transferableMoves":["Use a superlative title only when the video explicitly auditions the runners-up, making the ranking itself part of the content.","Frame difficult religious material as an interpretive problem with named scholarly solutions, never as gotcha material.","Read the key passage aloud, slowly, on a quotation card — let the primary source deliver the shock, not the narrator."],"idea":{"title":"The Strangest Ritual in the Bible: The Scapegoat and the Mystery of Azazel","description":"Borrow Alex O''Connor''s superlative-with-receipts mechanism for Myth & Meaning: Leviticus 16''s scapegoat rite, where one goat is sent into the wilderness ''for Azazel'' — a name scholars still debate (demon, place, or something older?). Audition the major interpretations honestly, then follow the ritual''s afterlife through Second Temple literature into the very word ''scapegoat.'' Comparative myth with a genuine interpretive puzzle at its core.","tags":["bold_claim","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 14100000, 400000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_alex_o_connor_cosmicskep_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_fall_of_civilizations';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('18. Egypt - Fall of the Pharaohs') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, '18. Egypt - Fall of the Pharaohs', 'https://youtube.com/watch?v=cx_fall_of_civilizations_1', '2026-05-05T14:54:40.761Z', 'The three-thousand-year decline of pharaonic Egypt', 'story_cold_open', 'rise_and_fall', 'Opens inside a scene — a scribe, a temple, a dying dynasty — before any thesis, so the viewer is emotionally committed to a civilization before being asked to sit with a three-hour film about its death.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.8, '{"whyItWorked":"Paul Cooper''s novelistic cold open drops you into a lived moment and lets the elegiac ''melancholy of ruins'' register do the selling; the numbered-episode title pattern (''18. Egypt - [poetic subtitle]'') signals a prestige series rather than a video. The rise_and_fall arc is the retention machine: showing the civilization at its glorious height first makes every hour of decline feel like loss, and the painterly commissioned thumbnail with no faces and no clickbait text filters for exactly the deep-focus viewer who watches all three hours.","observations":"This is the format the research names as our North Star, and the transferable core is that emotional structure beats information structure: he sequences facts as tragedy, with voice-acted primary sources as emotional punctuation. His documented signature — commissioned art, ambient score, literary narration — is a craft moat, not a budget moat. Crucially, the research notes he treats belief systems as scenery to political collapse; the same elegiac arc applied to a religion itself is unclaimed.","transferableMoves":["Cold-open inside a specific human scene from the primary sources — no thesis statement until the viewer is emotionally invested.","Structure the episode as height-then-loss: spend real runtime on the world at its peak so the fall carries weight.","Number the episodes and give each a poetic subtitle so the catalog reads as a collectible prestige series."],"idea":{"title":"The Last Oracle: The Rise and Fall of Delphi","description":"Apply the Fall of Civilizations elegiac arc to a religious institution instead of an empire: a thousand years of the Delphic oracle, from smoky origins through the sanctuary at its treasure-laden height to the final recorded oracle under Theodosius. Cold-open with a pilgrim climbing the Sacred Way, voice-act the ancient consultations, and let the ending land as genuine loss — the mechanism of civilizational tragedy, honestly applied to the death of a belief system.","tags":["story_cold_open","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 11400000, 210000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_fall_of_civilizations_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_fall_of_civilizations';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('1. Roman Britain - The Work of Giants Crumbled') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, '1. Roman Britain - The Work of Giants Crumbled', 'https://youtube.com/watch?v=cx_fall_of_civilizations_2', '2026-02-14T14:54:40.761Z', 'The collapse of Roman Britain seen through its ruins', 'question', 'chronological', 'Frames the whole film as one haunting question — who built these ruins, and how does a world forget? — borrowed from an Anglo-Saxon poet staring at Roman stonework, so the viewer''s curiosity and the sources'' own wonder are the same feeling.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.4, '{"whyItWorked":"The episode weaponizes a primary source as its hook: ''The Ruin,'' an Anglo-Saxon poem asking what giants built the crumbled Roman baths, turns the audience''s question into the ancient author''s question. The chronological structure then answers it patiently across centuries, and the multi-hour runtime becomes a feature — evergreen watch-time economics that kept this episode compounding views for years, exactly the catalog behavior the research documents.","observations":"The transferable move is letting an ancient voice ask the video''s driving question — it grants permission for slow pacing because the mystery is authentically old, not manufactured. His drone-footage-over-ruins visual grammar and voice-acted source readings match his documented editing style and are achievable at our scale. The research notes his 2-3 releases a year starve his own audience between episodes; a monthly cadence in this register captures viewers in the gaps.","transferableMoves":["Open with an ancient text that asks your video''s question, so the inquiry feels discovered in the sources rather than pitched.","Let physical ruins anchor each chapter — return to one place repeatedly as centuries pass to make time visible.","Design for the evergreen deep-focus viewer: long chapters, ambient score, no mid-video hype resets."],"idea":{"title":"The Last Temple: Philae and the Two Centuries the Old Gods Refused to Die","description":"Take the Fall of Civilizations ruins-ask-the-question mechanism to the island temple of Philae, where Isis worship survived two hundred years after Christianity became the empire''s religion — until Justinian closed it and the last hieroglyphic inscriptions fell silent. Open with the graffiti of the final priests, then move chronologically through the long twilight of Egyptian religion. An elegiac, honest portrait of how a faith actually ends: slowly, at the edge of the map.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 20100000, 170000, 0.1);
  end if;
  insert into _cv_map values ('cv_cx_fall_of_civilizations_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_toldinstone';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What Happened to the Last Pagans of Rome?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What Happened to the Last Pagans of Rome?', 'https://youtube.com/watch?v=cx_toldinstone_1', '2026-05-11T14:54:40.761Z', 'The disappearance of traditional Roman religion in late antiquity', 'question', 'chronological', 'An irresistibly specific ''last of antiquity'' question — everyone knows Rome converted, almost no one knows what happened to the holdouts — answered with a PhD''s precision in twelve tight minutes.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.4, '{"whyItWorked":"This is Dr. Garrett Ryan''s documented ''The last [X] of antiquity'' title pattern doing its job: a question so specific it feels like it must have a real answer, which only a specialist could deliver. The chronological structure walks the holdouts century by century, and his dry, urbane narration over Ken Burns pans of statuary — his exact documented style — makes scholarly neutrality itself the appeal: no side-taking, just the strange true story.","observations":"The mechanism is question-specificity as an authority signal — vague questions read as content-farm, hyper-specific ones read as expertise. His search-friendly, endlessly generative question format is the most copyable engine in the research set. But the research is explicit that he treats belief as his weakest coverage area and answers questions without building worlds: the same curiosity hooks paid off at 45-plus minutes with ritual, sound design, and interiority is our open lane.","transferableMoves":["Phrase titles as oddly specific questions a curious person didn''t know they had until they read it.","Answer the literal question in the first third, then reward viewers with the stranger, deeper story behind it.","Land one understated, well-timed dry aside per section — wit as proof the narrator is comfortable in the material."],"idea":{"title":"What Was It Like to Worship in an Ancient Temple?","description":"The research names this almost verbatim as toldinstone''s untouched twin franchise: he owns ''what it was like to live'' in antiquity but never ''what it was like to believe.'' Take his hyper-specific question mechanism and pay it off at Myth & Meaning length — the smoke, the sacrifice logistics, the sensory choreography of a day at a Greco-Roman temple, sourced from inscriptions and sacred laws, with the scholarly wit intact but the world fully built.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4170000, 84000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_toldinstone_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_toldinstone';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What Was It Like to Live in an Ancient Roman Apartment?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What Was It Like to Live in an Ancient Roman Apartment?', 'https://youtube.com/watch?v=cx_toldinstone_2', '2026-06-12T14:54:40.761Z', 'Daily life in the insulae of imperial Rome', 'statistic', 'case_study', 'Opens on a staggering number — a million people packed into ancient Rome, most of them stacked in creaking apartment blocks — then spends twelve minutes making that statistic livable, floor by floor.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.8, '{"whyItWorked":"The cold-open statistic reframes a familiar postcard Rome into an unfamiliar lived one, and the case_study structure — one building type examined top to bottom — gives a short video the satisfying completeness of a tour. His documented statue-with-modern-object thumbnail juxtaposition and ''what was it like'' pattern promise the channel''s signature payoff: antiquity at human scale, delivered with PhD-grade sourcing worn lightly.","observations":"The transferable mechanism is statistic-into-texture: one number that shocks, then relentless sensory specifics (rent, noise, fire risk) that make it real. This is the everyday-materiality register that his weekly solo cadence proves is sustainable and search-durable. Per the research, he covers the Roman world of early Christianity with scholarly neutrality but deliberately avoids the big contested questions — the same daily-life lens pointed at religious life inherits his trust without his ceiling.","transferableMoves":["Open with one verified, counterintuitive number and let the whole video be its explanation.","Structure around a single physical space examined completely — one building, one street, one room.","Convert every abstract claim into a cost, a smell, a sound, or a walking distance."],"idea":{"title":"A Day in the Life of a Christian in Rome, 200 AD","description":"Point toldinstone''s statistic-into-texture mechanism at belief: open with the number of house churches a city of a million could hide, then follow one ordinary believer through a single day — work, neighbors, the evening gathering in a rented room above a shop. Everyday material history of early Christianity from Lampe and the archaeology of the insulae, at human scale and without apologetics or debunking.","tags":["statistic","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2520000, 105000, 0.5);
  end if;
  insert into _cv_map values ('cv_cx_toldinstone_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_history_time';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Ancient Mesopotamia: 3000 BC - 539 BC - Cradle of Civilisation') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Ancient Mesopotamia: 3000 BC - 539 BC - Cradle of Civilisation', 'https://youtube.com/watch?v=cx_history_time_1', '2026-03-24T14:54:40.761Z', 'Feature-length chronicle of Mesopotamian civilization', 'story_cold_open', 'chronological', 'A fireside cold open on a mudbrick city at dawn eases viewers into a two-and-a-half-hour chronicle whose real product is the experience of being told a very long, very old story by a trusted voice.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.5, '{"whyItWorked":"The title is Pete Kelly''s exact documented pattern — region, epoch span, poetic subtitle — which pre-qualifies the deep-time binge viewer and the sleep-listener alike, and the feature length turns each upload into an AdSense annuity. The warm northern-English fireside narration over drone landscapes and ambient score (his documented signature) makes the chronological chronicle structure feel like companionship rather than coverage, which is why watch time, not click-through, is this channel''s whole engine.","observations":"What transfers is the dual-use design: video built to reward both full attention and second-screen listening, with long ambient passages that would be dead air anywhere else functioning as the retention feature. The research flags his weakness precisely — chronicle without a driving question, and belief treated as incidental to geography. The same fireside register organized around ''why did they believe this?'' beats coverage-shaped epics on retention.","transferableMoves":["Write for ears first: every section must work as pure audio before a single visual is added.","Use epoch-span titles to signal scope honestly and capture the binge/sleep-listener use case.","Give the chronicle a through-line question so the hours accumulate toward a payoff instead of just passing."],"idea":{"title":"The Entire History of the Afterlife: From Sheol to Heaven","description":"Take History Time''s feature-length fireside mechanism and give it the through-line his chronicles lack: a single question — how did the flat, shadowy Sheol of early Israel become heaven and hell? — carried chronologically through Mesopotamian netherworlds, Persian influence, Second Temple apocalypticism, and early Christianity. Built for the deep-listen: long ambient passages, warm narration, one idea evolving across three thousand years.","tags":["story_cold_open","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 11900000, 135000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_history_time_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_history_time';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('1000 AD: A Tour of the Viking World') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, '1000 AD: A Tour of the Viking World', 'https://youtube.com/watch?v=cx_history_time_2', '2026-05-23T14:54:40.761Z', 'Snapshot tour of the Norse world at a single moment in time', 'question', 'case_study', 'Freezes history at one year and asks what you would actually see — the ''tour'' framing converts a sprawling topic into a guided walk, which is a far stickier promise than another chronological survey.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.1, '{"whyItWorked":"The single-year snapshot is a brilliant constraint: instead of ''the history of the Vikings,'' the implicit question ''what was this world like at exactly this moment?'' makes the case_study structure feel like travel rather than syllabus. His dramatic-landscape thumbnails with bold era-plus-people text and no clickbait devices (documented pattern) promise immersion, and the fireside narration delivers a place, not an argument — ideal for his documentary-marathon and background-listening audience.","observations":"The mechanism is the time-slice tour: a hard temporal constraint that turns breadth into intimacy and lets one video visit many cultures without losing shape. It is also endlessly serializable — any year, any world. The research notes religion stays incidental to his geographic framing; a time-slice built around the world''s belief systems at one pivotal moment inherits the format''s charm while owning the interior dimension he skips.","transferableMoves":["Constrain the video to a single year or moment and structure it as a guided tour between locations.","Transition between regions with the connective tissue of travel — roads, ships, trade routes — to keep the tour feeling continuous.","Template the format for a series: same year-tour mechanic, different world each installment."],"idea":{"title":"33 AD: A Tour of the World''s Religions","description":"Adapt History Time''s time-slice tour mechanism for Myth & Meaning: freeze the world in a single pivotal year and walk it — the Temple in Jerusalem at Passover, Rome''s state cults and imported mysteries, Alexandria''s synagogues and Serapeum, Persia''s fire temples, the Buddhist stupas of the Kushan trade routes. One year, one guided journey through what humanity believed, with the Jesus movement as one small room in a very large house. Serializable by century.","tags":["question","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 6400000, 160000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_history_time_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_cogito';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The History of Christianity') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The History of Christianity', 'https://youtube.com/watch?v=cx_cogito_1', '2026-05-15T14:54:40.761Z', 'Animated survey of Christianity from Jesus movement to world religion', 'question', 'chronological', 'Asks the deceptively simple question — how did a persecuted Jewish sect become the world''s largest religion? — and answers it with the most trusted neutral animated survey in the niche, making it the default search result for the topic.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4, '{"whyItWorked":"This is the ''The History of [Religion]'' title pattern executed as pure evergreen search capture: the plainest possible packaging, backed by Cogito''s documented house animation style and deliberately neutral, gently wry Irish narration, which believers and skeptics alike trust. The chaptered-eras chronological structure and animated maps make a two-thousand-year story legible, and the video compounds views for years as the default ''religion explained'' result — the research calls the catalog the Wikipedia-with-animation of the niche.","observations":"What transfers is the trust architecture: visible even-handedness on doctrine plus a consistent, instantly recognizable visual system that brands neutrality itself. His flat-illustrated, minimal-text thumbnails are the anti-clickbait signal his audience selects for. But the research is precise about the gap: surveys stay at overview altitude and his near-monthly cadence leaves demand unserved — the deep narrative layer beneath his chapters (one council, one heresy, one text per episode) is the graduation path we own.","transferableMoves":["Claim the plain, definitive title for evergreen search terms and let neutrality be the packaging promise.","Chapter long histories into named eras so the timestamp bar itself reads as a table of contents.","Keep one consistent visual system across all videos so any frame is recognizably yours in the suggested feed."],"idea":{"title":"Marcion: The Heretic Who Forced Christianity to Build a Bible","description":"Zoom into the single chapter Cogito''s survey format can never dwell on: Marcion of Sinope, the second-century shipowner who rejected the Hebrew scriptures, published the first Christian canon, and was expelled — forcing the church to define its own. One heresy, one man, one consequence, told as character-driven narrative with scholarly care: the deep-layer episode that begins where the neutral overview''s chapter marker ends.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4640000, 100000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_cogito_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_cogito';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What is Zoroastrianism?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What is Zoroastrianism?', 'https://youtube.com/watch?v=cx_cogito_2', '2026-06-20T14:54:40.761Z', 'Explainer on the ancient Persian religion and its influence', 'statistic', 'case_study', 'Opens on the arresting numbers — one of humanity''s oldest continuously practiced religions, once an empire''s faith, now counting only scattered thousands — instantly framing an unfamiliar topic as both enormous and endangered.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.4, '{"whyItWorked":"The statistic hook solves the explainer''s cold-start problem: viewers who have never heard of the topic are given a reason to care in one sentence — vast age, vanishing present. The ''What Is [Belief/Movement]?'' pattern then delivers a complete case study of one tradition, and the owned animation style turns an obscure subject into something that looks canonical, which is exactly how a niche topic outperforms on a survey channel.","observations":"The transferable mechanism is scale-contrast framing: pair a tradition''s historical enormity with its present fragility (or vice versa) to manufacture stakes without sensationalism. His documented neutrality on doctrine is what lets a video about a living minority faith travel safely — a discipline we should copy verbatim. The research notes his months-long gaps leave this proven demand unserved; adjacent deep-dives can catch the same search intent between his uploads.","transferableMoves":["Open unfamiliar topics with a scale-contrast statistic that makes the stakes legible in one line.","Treat living traditions with strict doctrinal neutrality so the video is shareable inside and outside the community.","Pick ''obscure but foundational'' topics where being the only quality treatment guarantees the search shelf."],"idea":{"title":"The Persian Idea That Rewired the Bible: Zoroastrianism''s Fingerprints on Judaism and Christianity","description":"Take the scale-contrast mechanism from Cogito''s explainer and go one layer deeper than a survey can: the scholarly case that the exile under Persia left marks on Jewish and Christian thought — a cosmic adversary, angelic hierarchies, resurrection, last judgment. Present the influence debate honestly (where scholars agree, where they don''t), with primary texts side by side. Comparative religion as detective work, not diffusion clickbait.","tags":["statistic","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2200000, 125000, 0.6);
  end if;
  insert into _cv_map values ('cv_cx_cogito_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_overly_sarcastic_product';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Legends Summarized: Journey to the West (Part 1)') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Legends Summarized: Journey to the West (Part 1)', 'https://youtube.com/watch?v=cx_overly_sarcastic_product_1', '2026-05-29T14:54:40.761Z', 'Chinese mythology — serialized epic literature', 'story_cold_open', 'chronological', 'Dropping the viewer straight into Sun Wukong''s chaos with zero throat-clearing turns a 2,000-page classic into an addictive serial — each part ends mid-journey, so the series binges like a show.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.7, '{"whyItWorked":"The packaging is pure franchise: the ''Legends Summarized:'' prefix plus Red''s hand-drawn character art tells returning fans exactly what shelf this sits on before they read a word. The cold open skips all setup and lands on the most entertaining scene of the epic, and the strict chronological, part-by-part structure converts a daunting classic into an episodic binge with built-in cliffhangers.","observations":"What transfers is the serialization mechanism, not the comedy: OSP''s documented title patterns (''Legends Summarized: [Epic]'') and bright hand-drawn thumbnail branding make every entry instantly legible as part of a collectible set, and the fast-cut illustrated editing style keeps a long source text moving. Their weakness — per the research, myth treated as fun plot rather than lived belief — is the exact altitude gap Myth & Meaning can occupy with the same serial mechanics.","transferableMoves":["Brand multi-part epics with a fixed series prefix so each episode reads as a collectible entry, not a one-off","Open on the single most dramatic scene of the source text before any historical setup","End every part mid-journey with an explicit ''next time'' beat to engineer binge chains"],"idea":{"title":"Gilgamesh, Serialized: The World''s First Epic as a Weekly Saga","description":"Adapt Overly Sarcastic Productions'' series-franchise mechanism — fixed series branding, in-medias-res openings, cliffhanger part breaks — to a multi-episode narrative reading of the Epic of Gilgamesh. Where OSP plays the plot for laughs, Myth & Meaning pairs each episode with what the text meant as religious literature: kingship ideology, the gods'' politics, and Mesopotamian views of death, grounded in mainstream Assyriology.","tags":["story_cold_open","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 12300000, 350000, 0.4);
  end if;
  insert into _cv_map values ('cv_cx_overly_sarcastic_product_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_overly_sarcastic_product';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Miscellaneous Myths: Hades and Persephone') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Miscellaneous Myths: Hades and Persephone', 'https://youtube.com/watch?v=cx_overly_sarcastic_product_2', '2026-03-07T14:54:40.761Z', 'Greek mythology — pop-culture myth correction', 'contrarian', 'case_study', 'It takes the internet''s favorite romanticized retelling and lovingly dismantles it against the actual Homeric Hymn — correcting a myth the audience thinks it already knows is an irresistible click.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.8, '{"whyItWorked":"The contrarian hook works because the target is beloved, not obscure: fandom has a strong prior about Hades-the-romantic, and the video promises to test it against the primary source. Treating one myth as a close-read case study — pop version versus Homeric Hymn, beat by beat — gives the correction structure instead of snark, and Red''s expressive character art in the thumbnail signals the house ''Miscellaneous Myths'' brand instantly.","observations":"The transferable mechanism is ''affectionate correction of a myth you already know,'' powered by OSP''s documented strengths: series-branded thumbnails with hand-drawn faces, rapid meme-literate narration, and a title pattern (''Miscellaneous Myths: [Figure]'') that promises a known character. The research notes their audience outgrows the comedy-summary format with nowhere to go — a rigorous version of this exact video is the graduation path.","transferableMoves":["Pick myths the audience already half-knows from pop culture so the correction carries built-in stakes","Structure the video as pop version versus primary source, quoting the ancient text on screen","Keep the tone affectionate toward the modern retelling — correct the record without mocking the fans"],"idea":{"title":"What the Persephone Myth Actually Meant: Inside the Eleusinian Mysteries","description":"Borrow Overly Sarcastic Productions'' ''myth you think you know'' correction mechanism, but land the payoff they skip: after close-reading the Homeric Hymn to Demeter against the modern romance retellings, Myth & Meaning follows the story into the Eleusinian Mysteries — the real initiation ritual where Greeks staged this myth to confront death. Scholarly sources on screen, no mockery of the pop versions that brought viewers in.","tags":["contrarian","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 12100000, 260000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_overly_sarcastic_product_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_inspiringphilosophy';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Is Genesis 1 Ancient Cosmology?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Is Genesis 1 Ancient Cosmology?', 'https://youtube.com/watch?v=cx_inspiringphilosophy_1', '2026-02-04T14:54:40.761Z', 'Genesis 1 and ancient Near Eastern cosmology', 'question', 'problem_solution', 'A question both skeptics and believers genuinely argue about, answered with a wall of on-screen journal citations — the citation density itself becomes the retention device for the ''thinking viewer'' segment.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.4, '{"whyItWorked":"The ''Is [Claim] True?'' title pattern frames a live controversy as a solvable problem, and the problem-solution structure delivers: state the tension between Genesis and ancient science, then resolve it step by step through Near Eastern comparative material. Every claim arrives with a visible citation card, which converts a contested topic into something that feels adjudicated rather than asserted.","observations":"What transfers is the evidence-stacking mechanism, not the apologetic conclusion: InspiringPhilosophy''s documented citation-dense voiceover, question-style thumbnail text, and multi-part series branding turn scholarly literature into binge material for 18-40 viewers who want receipts. The research notes his conclusion-first framing concedes the secular-curious viewer — the same sources presented neutrally reach a strictly larger audience.","transferableMoves":["Put the actual citation on screen for every substantive claim — visible sourcing is a retention feature, not homework","Frame contested topics as a stated problem with a stepwise resolution rather than a lecture","Title with the exact question the two camps are already arguing, phrased so both sides click"],"idea":{"title":"The Three-Story Universe: How Ancient Israel Pictured the Cosmos","description":"Take InspiringPhilosophy''s citation-heavy problem-solution mechanism and strip the apologetic frame: a visually mapped tour of the firmament, the waters above, and Sheol below as ancient Israelites actually pictured them, with every reconstruction pinned to on-screen scholarship (Walton, Smith, ANE parallels). Myth & Meaning answers the same question his audience is asking — ''what kind of text is Genesis 1?'' — as neutral religious history that skeptics and believers can both trust.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 6100000, 48000, 0.1);
  end if;
  insert into _cv_map values ('cv_cx_inspiringphilosophy_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_inspiringphilosophy';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Case for the Resurrection of Jesus') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Case for the Resurrection of Jesus', 'https://youtube.com/watch?v=cx_inspiringphilosophy_2', '2026-03-07T14:54:40.761Z', 'Resurrection historiography — multi-part evidence series', 'bold_claim', 'case_study', 'Announcing ''the case'' up front turns a belief into a verdict to be earned across a multi-video series — the series structure itself manufactures binge sessions from an argument.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.7, '{"whyItWorked":"The bold-claim hook (''The Case for...'') stakes a thesis in the title, then the case-study structure prosecutes it piece by piece — each video one exhibit, each exhibit citation-stacked. Series branding across the parts, one of the channel''s documented packaging patterns, means a viewer who accepts exhibit one is algorithmically walked to exhibit two, which is how a 530K-subscriber channel builds outlier aggregate viewership from a fifteen-year library.","observations":"The mechanism that transfers is the cumulative evidence series: InspiringPhilosophy''s methodical, citation-dense voiceover and multi-part series structure (noted in the research as a binge driver) make viewers feel they are completing a course, not watching videos. Myth & Meaning can run the same architecture on historical questions where the honest answer is a story, not a verdict.","transferableMoves":["Design contested-history topics as numbered multi-part series so each video recruits viewers into the next","Give every episode a single evidentiary job — one source, one debate, one exhibit per video","Recap the accumulated argument at each episode''s open so late arrivals convert into back-catalog binges"],"idea":{"title":"From Sheol to Resurrection: How the Afterlife Was Born","description":"Adapt InspiringPhilosophy''s cumulative case-series mechanism into a neutral multi-episode arc tracing where resurrection belief came from: the silent Sheol of early Hebrew texts, Persian-period influence, Daniel 12, the Maccabean martyrs, and the Second Temple debates between Pharisees and Sadducees. Each episode is one exhibit with sources on screen — but where his series argues a verdict, Myth & Meaning narrates an evolution, serving the huge audience that wants the evidence tour without the apologetic frame.","tags":["bold_claim","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 5600000, 55000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_inspiringphilosophy_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_redeemed_zoomer';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Every Christian Denomination Explained') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Every Christian Denomination Explained', 'https://youtube.com/watch?v=cx_redeemed_zoomer_1', '2026-04-07T14:54:40.761Z', 'Denominational taxonomy — church history as a map', 'statistic', 'listicle', 'Opening on the staggering count of Christian denominations, then promising to sort ALL of them into one hand-drawn family tree, turns church history into completable lore — Gen Z watches it the way they watch fandom-iceberg videos.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.9, '{"whyItWorked":"The statistic hook (thousands of denominations, one video) sets an absurd-sounding completeness promise, and the listicle structure pays it off branch by branch on an MS-paint family tree — the channel''s documented thumbnail signature. The lo-fi drawing is the point: it reads as a friend''s whiteboard, not an institution''s lecture, which is why 16-30 viewers who''d never click an academic explainer binge 22 minutes of taxonomy.","observations":"What transfers is exhaustive-taxonomy-as-lore: Redeemed Zoomer''s ''Every [X] Explained'' title pattern, hand-drawn map thumbnails, and ideas-per-minute editing convert classification — the driest genre in religion content — into memeable, serializable identity content. The research flags that he rarely goes deeper than the Reformation; the same map mechanism pointed at the ancient world is an open lane with his exact audience.","transferableMoves":["Open with one jaw-dropping count that makes the taxonomy feel impossible, then promise completeness","Draw the map by hand on screen — visible, imperfect drawing builds trust polish can''t","Give every branch a one-line personality so viewers pick a ''team'' and argue in the comments"],"idea":{"title":"Every Christianity of the Year 200, Mapped","description":"Apply Redeemed Zoomer''s denomination-map mechanism to the second century, a period he never covers in depth: one hand-drawn map of the ancient Mediterranean, every early Christian community and school placed on it — Ebionites, Marcionites, Valentinians, Montanists, the proto-orthodox — each with a one-line identity and a primary source. Myth & Meaning does it as scholarship rather than advocacy: no branch is the villain, and the payoff is understanding why diversity was the norm before creeds.","tags":["statistic","listicle","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 15400000, 200000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_redeemed_zoomer_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_redeemed_zoomer';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Problem With Non-Denominational Churches') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Problem With Non-Denominational Churches', 'https://youtube.com/watch?v=cx_redeemed_zoomer_2', '2026-06-15T14:54:40.761Z', 'Tradition versus modern evangelicalism', 'contrarian', 'problem_solution', 'It tells the largest bloc of American Protestant YouTube that the thing they think is neutral — being ''non-denominational'' — is itself a tradition with problems. Attacking the invisible default is peak contrarian packaging.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.9, '{"whyItWorked":"''The Problem With [Movement]'' — one of the channel''s documented title patterns — names a target his own audience belongs to, which guarantees both agreement-clicks and outrage-clicks. The problem-solution structure keeps it from being pure provocation: he diagnoses what gets lost without historical rootedness, then offers tradition as the fix, delivered in his fast, earnest Gen-Z voice over lo-fi diagrams.","observations":"The transferable mechanism is ''make the invisible default visible'': the video works because viewers never thought of their own position as a position. His confessional advocacy is the ceiling the research identifies — a scholarly version of the same move (revealing hidden assumptions rather than prosecuting them) keeps the click without inheriting the alienation.","transferableMoves":["Target assumptions the audience doesn''t know it holds — the reveal that a ''default'' has a history is the hook","Diagnose before prescribing: spend the first act proving the problem exists in the viewer''s own experience","Stake a clear thesis in the title and defend it on screen — hedged titles die where committed ones travel"],"idea":{"title":"The Problem With ''Christianity Is Just Repackaged Paganism''","description":"Borrow Redeemed Zoomer''s contrarian problem-solution mechanism and aim it at a claim our comparative-mythology audience half-believes: that Christmas, Easter, and Christ himself are copy-pasted paganism. Myth & Meaning walks through where the parallel-o-mania claims actually come from (Frazer, early-1900s comparativism), which parallels are real, which are fabricated, and what honest comparative religion looks like — correcting the internet''s favorite oversimplification without mocking believers or skeptics.","tags":["contrarian","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 6900000, 320000, 0.6);
  end if;
  insert into _cv_map values ('cv_cx_redeemed_zoomer_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_wes_huff';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Can We Trust the New Testament Manuscripts?') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Can We Trust the New Testament Manuscripts?', 'https://youtube.com/watch?v=cx_wes_huff_1', '2026-03-22T14:54:40.761Z', 'New Testament textual criticism for a mainstream audience', 'question', 'problem_solution', 'It asks the exact question the Rogan wave left millions of new viewers holding — ''can I trust this book?'' — and answers it with physical objects you can see: papyri, codices, scribal corrections.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.6, '{"whyItWorked":"The ''Can We Trust [Text]?'' title pattern is the channel''s core packaging move: it meets skeptical framing head-on instead of dodging it, which earns clicks from doubters and believers simultaneously. The problem-solution structure honors the doubt (state the transmission problem plainly, show real variants) before resolving it, and manuscript close-ups plus his face — the documented thumbnail formula — make an abstract discipline look like show-and-tell.","observations":"What transfers is evidence-you-can-photograph: Huff''s warm guest-lecturer delivery and artifact b-roll turn textual criticism into visually concrete, clippable content, which the research credits for his shorts performance. His fixed apologetic conclusion is the documented ceiling — the same show-and-tell mechanism with the verdict left to the viewer captures the secular-curious audience he can''t.","transferableMoves":["Lead with the skeptic''s strongest version of the question — meeting doubt head-on earns both audiences","Anchor every abstract claim to a photographable object the camera can push into","State the problem honestly and at full strength before offering any resolution"],"idea":{"title":"How the Iliad Survived: What Homer''s Manuscripts Teach Us About the Bible''s","description":"Adapt Wes Huff''s trust-the-text mechanism — skeptic''s question, artifact show-and-tell, honest problem-then-resolution — to the comparative frame he never uses. Myth & Meaning traces how the Iliad traveled from oral song to Venetus A to your bookshelf, then sets the New Testament''s transmission beside it: same scribes, same variants, same methods. Viewers get textual criticism as a discipline that applies to every ancient text, with no verdict pre-loaded.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 15200000, 170000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_wes_huff_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_wes_huff';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What the Oldest New Testament Fragment Actually Says') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What the Oldest New Testament Fragment Actually Says', 'https://youtube.com/watch?v=cx_wes_huff_2', '2026-06-07T14:54:40.761Z', 'P52 — the John Rylands papyrus fragment', 'story_cold_open', 'case_study', 'It opens inside the story of one credit-card-sized scrap of papyrus and lets a single artifact carry the whole video — the object becomes the protagonist, and its tiny size against its huge implications is the tension.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.2, '{"whyItWorked":"The ''What [Discovery] Actually Says'' pattern promises a corrective payoff, and the cold open — a scholar in 1934 noticing handwriting on a scrap nobody had catalogued — delivers narrative before any argument starts. The case-study structure keeps the entire video on one object (P52), which matches the channel''s documented artifact-close-up thumbnails and makes the episode endlessly clippable for shorts.","observations":"The transferable mechanism is the single-artifact biography: Huff''s manuscript imagery, conversational scholar persona, and on-location instincts prove one small object can anchor fifteen minutes if it''s framed as a character with a discovery story. The research notes he treats manuscripts as evidence rather than stories — the fully narrative version of this format is unclaimed territory.","transferableMoves":["Build entire episodes around one object and open with its discovery moment, not its significance","Play scale against stakes — the smaller and humbler the artifact, the harder its implications land","Show the object''s physical details on screen (handwriting, damage, ink) as plot beats, not decoration"],"idea":{"title":"The Stone That First Said ''Israel''","description":"Take Wes Huff''s single-artifact case-study mechanism long-form: the Merneptah Stele, a pharaoh''s victory monument from 1208 BC that happens to contain the earliest known mention of Israel. Myth & Meaning opens on Flinders Petrie''s 1896 excavation moment, then lets one granite slab narrate the whole debate about Israel''s origins in Canaan — what one line of hieroglyphs can and cannot prove, told as archaeology-as-detective-story with the scholarship on screen.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 8100000, 290000, 0.5);
  end if;
  insert into _cv_map values ('cv_cx_wes_huff_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_bibleproject';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Overview: Genesis 1-11') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Overview: Genesis 1-11', 'https://youtube.com/watch?v=cx_bibleproject_1', '2026-04-22T14:54:40.761Z', 'Book overview — Genesis primeval history', 'question', 'chronological', 'Seven minutes of premium animation that walks the entire text in order and makes its literary architecture visible — the video is a map you rewatch, which turns one upload into permanent small-group infrastructure.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.2, '{"whyItWorked":"The Tim-and-Jon dialogue opens on a wondering question (''what is this strange ancient text actually doing?'') rather than a lecture, and the strict chronological walk through Genesis 1-11 turns a contested text into a guided tour. The packaging is the moat: signature flat-illustration thumbnails with a single central symbol and the fixed ''Overview: [Book]'' pattern make every entry in the series instantly recognizable and infinitely rewatchable as reference material.","observations":"What transfers is the visual-grammar mechanism: BibleProject''s documented illustrated visual language assigns every recurring concept a consistent drawn motif, so viewers accumulate literacy across videos — the catalog compounds because the symbols do. The research notes their devotional unity-frame skips the historical messiness; the same overview craft applied to texts they can''t touch is Myth & Meaning''s lane.","transferableMoves":["Develop a consistent visual symbol for every recurring concept and reuse it across the whole catalog","Voice big questions through a genuine two-person dialogue — a wonderer and an explainer — instead of a monologue","Design overview videos as rewatchable reference maps: chronological, chaptered, and dense enough to reward a second viewing"],"idea":{"title":"Enuma Elish in 60 Minutes: Babylon''s Creation Epic, Mapped","description":"Apply BibleProject''s overview mechanism — a guided chronological walk with a recurring illustrated symbol system — to a text their devotional frame keeps them from touching: the Babylonian creation epic. Myth & Meaning traces all seven tablets of Enuma Elish with consistent visual motifs for Tiamat, Marduk, and the divine assembly, then closes on what the epic''s echoes in Genesis 1 do and don''t mean, per mainstream Assyriology. The rewatchable-map format is the point: one video that becomes the internet''s reference tour of the epic.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 24600000, 380000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_bibleproject_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_bibleproject';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Tree of Life') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Tree of Life', 'https://youtube.com/watch?v=cx_bibleproject_2', '2026-06-20T14:54:40.761Z', 'Theme video — tracing one motif across the whole canon', 'bold_claim', 'case_study', 'It claims one small image — a tree — secretly threads the entire Bible, then proves it by walking the motif from Eden to Revelation. The ''hidden pattern revealed'' payoff makes viewers feel they''ve been handed X-ray vision.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.6, '{"whyItWorked":"The bold claim — this one image organizes everything — creates a proof obligation the video then satisfies as a motif case study, revisiting the tree at every canonical appearance with the same drawn symbol each time. The packaging follows the channel''s documented pattern of a single central symbol on a flat-illustration thumbnail: the thumbnail literally is the thesis, and the meticulous sound design and two-voice wondering tone make pattern-spotting feel like discovery rather than instruction.","observations":"The transferable mechanism is motif-tracing: pick one concrete image, follow it across a whole corpus, and let the repetition of a drawn symbol do the argumentative work. BibleProject confines the method inside one canon read as a unified story; the research flags comparative material as exactly what their frame can''t absorb — running the same method across cultures is open ground.","transferableMoves":["Trace one concrete image across an entire corpus instead of summarizing texts one by one","Make the thumbnail a single central symbol that states the video''s thesis at a glance","Re-show the same visual motif at every recurrence so viewers experience the pattern instead of being told it"],"idea":{"title":"The Divine Council: One Idea Traced Through Ugarit, Israel, and Greece","description":"Borrow BibleProject''s motif-tracing mechanism but run it across cultures instead of inside one canon: the image of gods assembled in council, followed from the Baal Cycle''s court at Mount Zaphon, through Psalm 82 and Job''s heavenly scenes, to Olympus. Myth & Meaning gives the motif a consistent visual symbol at each stop, showing how ancient Mediterranean peoples shared a picture of divine government — comparative scholarship presented with the pattern-revealing craft their devotional frame reserves for one Bible.","tags":["bold_claim","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 10600000, 600000, 0.6);
  end if;
  insert into _cv_map values ('cv_cx_bibleproject_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_the_chosen';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Jesus Calls Matthew | The Chosen') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Jesus Calls Matthew | The Chosen', 'https://youtube.com/watch?v=cx_the_chosen_1', '2026-05-04T14:54:40.761Z', 'Scene clip — character-driven biblical drama', 'story_cold_open', 'case_study', 'A single self-contained scene, posted whole: no context, no framing, just a despised tax collector abandoning his booth. The clip trusts one character''s emotional turn to carry twenty minutes — and it does.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.3, '{"whyItWorked":"The cold open drops viewers mid-scene with television craft — costume, blocking, score — and the case-study structure (one character, one turning point) gives a 2,000-year-old story present-tense stakes. The packaging follows the channel''s documented pattern: an emotional character close-up in costume with warm grading, titled ''[Character] [emotional moment] | The Chosen'', which makes browse-feed strangers feel a specific human moment rather than a religious category.","observations":"What transfers is present-tense character stakes: The Chosen''s clip strategy proves that a known ancient story retold through one minor character''s point of view outperforms any summary of the same events. The research notes viewers finish these scenes full of historical questions the show never answers — who tax collectors actually were, why they were hated — and that unanswered context is precisely the hand-off to an academic narrative channel.","transferableMoves":["Retell famous ancient episodes through the eyes of one minor participant instead of the famous protagonist","Cut clips as complete emotional arcs — entry, turn, exit — so each stands alone in the feed","Package with a character''s face and the emotional beat in the title, not the topic or era"],"idea":{"title":"A Day in Capernaum: The Lived World Behind The Chosen","description":"Adapt The Chosen''s present-tense character immersion into academic narrative: reconstruct one ordinary day in first-century Capernaum through the eyes of the town''s real social types — the fisherman in debt, the tax farmer at his booth, the synagogue elder, the Roman garrison. Myth & Meaning uses archaeology (the excavated synagogue, the insula houses, fishing economics) to answer the historical questions the show''s viewers finish each episode holding, with scene-setting narration instead of lecture.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 27600000, 500000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_the_chosen_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_the_chosen';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Chosen Season 5: The Last Supper | Official Trailer') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Chosen Season 5: The Last Supper | Official Trailer', 'https://youtube.com/watch?v=cx_the_chosen_2', '2026-02-10T14:54:40.761Z', 'Holy Week dramatized — season trailer as event', 'bold_claim', 'rise_and_fall', 'The trailer sells the one week everyone knows the ending of as an unbearable arc anyway — triumphal entry to betrayal in two minutes. Known-outcome tension, staged as a theatrical event, is the whole mechanism.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.5, '{"whyItWorked":"The bold claim is scale — the biggest season of the biggest crowdfunded show, framed as an event with a theatrical release attached — and the rise-and-fall cut mirrors Holy Week itself: palm branches and acclamation collapsing into the upper room and the betrayal. Per the channel''s documented playbook, the trailer is top-of-funnel packaging (cinematic stills, character close-ups, season branding) that converts YouTube reach into app installs and ticket sales.","observations":"What transfers is dramatic irony as a retention engine: the audience knowing the ending doesn''t kill tension, it creates it, because every early high registers as a countdown. The research notes the franchise dramatizes but never explains — the historical reconstruction of the same week, with the same arc discipline, is the complement their billion-view audience has nowhere to find.","transferableMoves":["Structure known-ending stories as rise-and-fall arcs where the audience''s foreknowledge supplies the dread","Treat major releases as events — trailers, dated premieres, countdowns — even for educational content","Cut cold opens like trailers: peak emotional images first, context afterward"],"idea":{"title":"The Week That Made Christianity: Holy Week as History","description":"Take The Chosen''s known-ending rise-and-fall mechanism and apply it to the historical reconstruction they leave undone: Jesus''s last week as historians piece it together — Passover crowds swelling Jerusalem, Pilate''s garrison moving in, the temple incident, the arrest. Myth & Meaning narrates day by day with the sources visible (Josephus, the gospels read critically, archaeology of first-century Jerusalem), letting the audience''s foreknowledge of Friday do the dramatic work while the scholarship explains why events unfolded as they did.","tags":["bold_claim","rise_and_fall","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 54700000, 450000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_the_chosen_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_crecganford';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('The Oldest Story in the World: Tracing the Cosmic Hunt Back 30,000 Years') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'The Oldest Story in the World: Tracing the Cosmic Hunt Back 30,000 Years', 'https://youtube.com/watch?v=cx_crecganford_1', '2026-04-15T14:54:40.761Z', 'Phylogenetic dating of the Cosmic Hunt / Pleiades myth across continents', 'statistic', 'chronological', 'One staggering, defensible number — a story older than agriculture — carries the entire video. The phylogenetic method turns ''mythology trivia'' into a scientific detective claim viewers feel compelled to verify.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 3.6, '{"whyItWorked":"The packaging is a superlative plus a number: ''oldest story in the world'' plus a Paleolithic date sourced from actual phylogenetic analysis. The statistic hook earns the click and the chronological structure pays it off by walking the myth backwards, branch by branch, from living tellings to the Ice Age. Because White runs the Mythology Database used at 100+ universities, the audacious claim reads as data, not clickbait.","observations":"What transfers is the method-as-authority move, not the Pleiades. His title_patterns (''The Oldest [Myth] in the World'', ''The Origins of [motif]'') show superlative-plus-evidence packaging works even with static-slideshow editing_style and a calm, minimal-hype narrator_voice — the claim does the work the production doesn''t. His documented weakness is landing the ''so what'': the data arrives but the meaning never does, which is exactly the gap a storytelling-first channel closes.","transferableMoves":["Lead the title with a verifiable superlative and put the dating method on screen in the first 60 seconds so the big number reads as evidence, not hype.","Structure motif-history videos as a reverse chronology — start with the living version, then strip away layers era by era so every act reveals an older ancestor.","Close every deep-time claim with a ''so what'' beat about lived belief and meaning, the payoff Crecganford''s data-first format leaves on the table."],"idea":{"title":"Leviathan''s Family Tree: 4,000 Years of the Chaos Dragon","description":"Apply Crecganford''s superlative-plus-method mechanism to the combat myth behind the Bible: trace the sea-dragon motif backwards from Revelation''s beast through Isaiah''s Leviathan, Ugaritic Lotan, and Mesopotamian Tiamat, dating each branch with cited comparative scholarship. Same reverse-chronology engine, but delivered as cinematic narrative with an explicit closing act on what the motif meant to the people who prayed it — the meaning payoff his data-first format skips.","tags":["statistic","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3170000, 45000, 0.3);
  end if;
  insert into _cv_map values ('cv_cx_crecganford_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_gnostic_informant';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What the Church Won''t Tell You About the Gospel of Thomas (Filmed in Egypt)') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What the Church Won''t Tell You About the Gospel of Thomas (Filmed in Egypt)', 'https://youtube.com/watch?v=cx_gnostic_informant_1', '2026-03-08T14:54:40.761Z', 'The Gospel of Thomas and the Nag Hammadi discovery, shot on location in Egypt', 'bold_claim', 'case_study', 'A forbidden-knowledge frame on a genuinely under-covered text, plus real footage from the place it was found. The ''informant'' promise converts high search demand for apocrypha into clicks no studio channel can match visually.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.1, '{"whyItWorked":"The bold-claim hook (''what they won''t tell you'') plugs directly into the deconstruction audience''s hidden-history appetite, and the case-study structure — one text, one discovery site, one payoff — keeps a 45-minute video coherent. Sendlak''s self-funded on-location footage is the real differentiator: standing where Nag Hammadi was unearthed makes an apocryphal text feel like breaking news.","observations":"Two things transfer, and one thing shouldn''t. The curiosity packaging works: his title_patterns (''What [church/scholars] Won''t Tell You'', ''The REAL [origin]'') and shock-reveal thumbnail_patterns reliably win clicks on apocrypha topics most channels neglect. Place-based storytelling works too — the site itself is the b-roll. But the JSON record is explicit that the sensational ''they hid it from you'' framing costs him trust with academics and careful viewers; the transferable move is the honest version — real curiosity gaps that scholarship actually resolves, without the conspiracy overlay his energetic provocateur narrator_voice leans on.","transferableMoves":["Package apocrypha with a genuine curiosity gap — ''the gospel found in a jar'' — and resolve it with cited scholarship instead of a suppression narrative.","Anchor each episode to one physical discovery site and return to it as a narrative through-line, using licensed and archival visuals where travel isn''t possible.","Script the reveal tightly: put the single most surprising verifiable fact at the midpoint so retention doesn''t depend on unscripted charisma."],"idea":{"title":"The Gospel in the Garbage: What the Oxyrhynchus Trash Heap Preserved","description":"Take the mechanism Gnostic Informant proves — curiosity-gap packaging plus place-based storytelling on apocrypha — and run it clean for Myth & Meaning: the ancient rubbish dump at Oxyrhynchus that yielded lost sayings of Jesus, unknown gospels, and everyday letters. The hook is honest (this really was found in the garbage), the payoff is scholarly (how papyrologists date, reconstruct, and publish fragments), and the framing is discovery, not suppression — inheriting the viewers his sensationalism eventually loses.","tags":["bold_claim","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2720000, 27000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_gnostic_informant_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_centre_place';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Second Temple Judaism: The World That Made Christianity') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Second Temple Judaism: The World That Made Christianity', 'https://youtube.com/watch?v=cx_centre_place_1', '2026-05-21T14:54:40.761Z', 'Survey lecture on Second Temple Judaism as the matrix of early Christianity', 'question', 'chronological', 'A 75-minute unedited lecture outperformed because the question it answers — where did Christianity actually come from? — has huge unmet search demand, and Hamer''s maps and timelines make a dense era legible in a way text sources can''t.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.4, '{"whyItWorked":"The hook is a genuine question a large audience is quietly asking, and the chronological structure — exile to Maccabees to sects to Jesus movement — gives a sprawling era a spine. Hamer''s map-and-chart pedagogy (custom maps, genealogy charts, timelines per the channel''s editing_style) does the retention work that editing normally does: every ten minutes the viewer gets a new visual scaffold that reorganizes what they just learned.","observations":"This is proof of demand, not proof of format. A fixed-camera lecture with slide-screenshot thumbnails reaching these numbers means the topic pulls despite zero YouTube-native packaging — the JSON flags ''no discoverability strategy'' as their core blind spot. What transfers is Hamer''s legibility mechanism: warm unhurried narrator_voice plus one custom chart per major concept. What doesn''t need copying is the raw 75-minute capture; the same syllabus, scripted and chaptered, should beat it for identical queries.","transferableMoves":["Build one custom map or timeline per major concept and cut back to it as ideas accumulate, so viewers always know where they are in time and space.","Mine high-performing lecture-library topics for proven demand, then ship the scripted 30-40 minute narrative version with story-driven titles and chapters.","Keep the pastoral-patience register — explain like a gifted adjunct, never a debater — to hold believers and skeptics in the same audience."],"idea":{"title":"How the Afterlife Got Into the Bible: A Second Temple Story","description":"Take the exact demand Centre Place proves — deep, honest Second Temple history — and give it the narrative packaging their congregation-run format never will: the strange 400-year window in which resurrection, Satan, angels, and final judgment entered Jewish belief, told chronologically with Myth & Meaning''s cinematic pacing and a Hamer-style evolving master-timeline that fills in on screen as each idea arrives.","tags":["question","chronological","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 1370000, 33000, 0.4);
  end if;
  insert into _cv_map values ('cv_cx_centre_place_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_kipp_davis';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('A Dead Sea Scrolls Scholar Responds to the Viral Joe Rogan Manuscript Claims') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'A Dead Sea Scrolls Scholar Responds to the Viral Joe Rogan Manuscript Claims', 'https://youtube.com/watch?v=cx_kipp_davis_1', '2026-02-14T14:54:40.761Z', 'Scholarly correction of viral pop-apologetics claims about biblical manuscripts', 'contrarian', 'problem_solution', 'Rode a mainstream viral moment with the one credential that mattered — an actual publishing Dead Sea Scrolls specialist — so the correction itself became the story. Zero production cost, maximum authority arbitrage.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.7, '{"whyItWorked":"The contrarian hook works because the counter-position is backed by elite, exactly-on-topic credentials: when millions heard a manuscript claim on a giant podcast, the one DSS specialist on YouTube became the mandatory second click. The problem-solution structure is clean — state the viral claim, then perform the actual scholarship on screen, scroll images and all. Viewers watched real expertise happen live, hedges included, which his dry seminar-style narrator_voice makes feel authentic rather than combative.","observations":"The mechanism is credentialed correction of a live misconception, and it transfers without the feud. His title_patterns (''Scholar responds to [viral claim]'', ''What the Dead Sea Scrolls ACTUALLY say'') and split-screen claim-vs-correction thumbnails convert controversy into authority — but the JSON notes reaction content decays and the Huff wave cooled, and his webcam-plus-screen-share editing_style caps casual retention. The evergreen version — narrative episodes built around a widely-believed misconception — captures the same search demand permanently.","transferableMoves":["When a religion-history claim goes mainstream-viral, ship a calm, credentialed corrective within days — cite the primary manuscript on screen, never dunk on the person.","Show the work: put the actual text, the actual paleography, the actual dating evidence on screen so viewers watch scholarship performed rather than asserted.","Convert each viral-moment correction into an evergreen narrative episode on the underlying topic, so the traffic spike seeds a permanent search asset."],"idea":{"title":"How Do We Know How Old a Manuscript Is? Dating the Great Isaiah Scroll","description":"Adapt Kipp Davis''s authority mechanism — watch real manuscript scholarship happen — into evergreen narrative for Myth & Meaning: one scroll, the Great Isaiah Scroll, taken through every dating method scholars actually use (paleography, radiocarbon, orthography, archaeology of Qumran), structured as a mystery that resolves misconception by misconception. All the claim-vs-evidence satisfaction of his reaction videos, none of the personality drama, and it never expires.","tags":["contrarian","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 2960000, 25000, 0.1);
  end if;
  insert into _cv_map values ('cv_cx_kipp_davis_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_mike_winger_biblethinker';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('What Does the Bible REALLY Say About Tithing? (Full 3-Hour Study)') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'What Does the Bible REALLY Say About Tithing? (Full 3-Hour Study)', 'https://youtube.com/watch?v=cx_mike_winger_biblethinker_1', '2026-06-08T14:54:40.761Z', 'Exhaustive single-question verse-by-verse study of tithing and giving', 'question', 'problem_solution', 'Answers a perennial, personally urgent search question with a moat nobody rational will copy: three hours of methodical, source-on-screen teaching from a donor-funded teacher with no sponsor incentives. The length IS the trust signal.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 2.9, '{"whyItWorked":"The question hook targets a query people ask their whole lives (''what does the Bible REALLY say about X'' is his signature title_pattern), and the problem-solution structure walks every relevant passage before landing a conclusion — so the runtime reads as thoroughness, not padding. His editing_style is deliberately minimal (single camera, scripture overlays, chapter markers) because the format''s promise is that nothing is being hidden or hurried; donor funding with zero sponsors completes the trust architecture.","observations":"The transferable mechanism is exhaustiveness-as-brand on perennial questions, not the devotional frame. His earnest, methodical narrator_voice and citations-on-screen habit build the strongest parasocial credibility in the niche, but the JSON is explicit that he teaches inside confessional commitments and won''t touch critical-historical framing — his most curious viewers graduate to exactly the canon-politics and ancient-context material an academic channel can supply, especially during his 2026 hiatus vacuum.","transferableMoves":["Pick perennial search questions and make the single definitive treatment — chaptered, citations on screen, every major position steelmanned before the conclusion.","Use chapter markers as a completeness map so the video doubles as a reference work viewers return to and send to friends.","State your funding and method up front each episode; transparency compounds into the trust that makes multi-hour runtimes an asset instead of a barrier."],"idea":{"title":"Where Did Hell Come From? The Complete History","description":"Borrow Mike Winger''s exhaustiveness-as-trust mechanism for Myth & Meaning''s academic lane: one perennial question — where the idea of hell actually came from — answered definitively in a chaptered 90-minute narrative through Gehenna''s valley, Second Temple apocalypses, Greco-Roman underworlds, and the early church, with every source on screen. Serves the historically curious viewers his confessional framing can''t follow, in exactly the deep-study format his audience is trained to binge.","tags":["question","problem_solution","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 3260000, 120000, 0.5);
  end if;
  insert into _cv_map values ('cv_cx_mike_winger_biblethinker_1', v_row) on conflict (seed_id) do update set id = excluded.id;

  select id into v_ch from _cc_map where seed_id = 'cc_cx_mike_winger_biblethinker';
  select id into v_row from competitor_videos where competitor_channel_id = v_ch and lower(title) = lower('Cover-Up Culture: How Churches Hide Abuse — A Documented Investigation') limit 1;
  if v_row is null then
    insert into competitor_videos (competitor_channel_id, title, url, published_at, topic, hook, story_structure, why_it_worked, ai_observations, is_outlier, outlier_score, teardown, teardown_at)
    values (v_ch, 'Cover-Up Culture: How Churches Hide Abuse — A Documented Investigation', 'https://youtube.com/watch?v=cx_mike_winger_biblethinker_2', '2026-05-12T14:54:40.761Z', 'Receipts-driven investigation of institutional cover-up patterns in church culture', 'story_cold_open', 'case_study', 'A trusted insider doing accountability journalism on his own tribe — opening cold on a documented case, then building the pattern receipt by receipt. The investigation drove mainstream news cycles because the messenger''s credibility was unimpeachable.', 'Representative outlier reconstructed from the July 2026 CI research (Christianity cycle); stats are illustrative of the channel''s outlier scale.', true, 4.3, '{"whyItWorked":"The story cold open drops viewers into a documented case with stakes before any framing, and the case-study structure earns each escalation by showing the evidence on screen first — the same citation-overlay editing_style he uses for Bible studies, repurposed as journalism. It worked because a decade of earnest, methodical teaching (his narrator_voice is pastoral, never prosecutorial) banked the credibility that makes an insider investigation land where an outsider''s would bounce.","observations":"The mechanism is evidence-first investigative structure delivered by an already-trusted voice — trust built slowly in low-stakes content, spent carefully on high-stakes claims. Per the JSON, this series proved a teaching channel can drive mainstream-scale news cycles without clickbait props (his thumbnail_patterns stay face-plus-question even here). For an academic history channel, the transferable version is the documented historical investigation: same receipts discipline, applied to textual history rather than living institutions.","transferableMoves":["Open cold on one concrete documented case — a person, a date, a text — and hold all framing until the stakes are established.","Show every receipt on screen at the moment it''s claimed; the audience should be able to check each step without pausing.","Bank credibility with methodical low-controversy episodes before publishing high-stakes investigations, and keep the tone sorrowful-precise, never gleeful."],"idea":{"title":"The Verse That Wasn''t There: Investigating the Comma Johanneum","description":"Apply Winger''s receipts-driven investigation mechanism to a purely historical case for Myth & Meaning: the Trinity proof-text of 1 John 5:7 that appears in no early Greek manuscript, how it entered the printed Bible through Erasmus''s editions, and the centuries-long scholarly paper trail that documented it. Cold open on Erasmus in 1516, every manuscript receipt on screen — an honest textual-history detective story with zero conspiracy framing, because the archive itself is dramatic enough.","tags":["story_cold_open","case_study","competitor_teardown"]}}'::jsonb, '2026-07-12T14:54:40.761Z')
    returning id into v_row;
    insert into competitor_video_snapshots (competitor_video_id, views, views_per_day, velocity)
    values (v_row, 4880000, 100000, 0.2);
  end if;
  insert into _cv_map values ('cv_cx_mike_winger_biblethinker_2', v_row) on conflict (seed_id) do update set id = excluded.id;

  -- ── Attach teardowns to matching pre-existing videos (never overwrite) ──

  update competitor_videos cv set teardown = '{"whyItWorked":"Broke out on identity-mystery packaging: the title withholds a name the audience half-knows, and the cold open drops the viewer inside a single scene of the empire with zero finance jargon. The rise-and-fall spine keeps one question — how did one man end up owning everything? — open for the entire runtime.","observations":"Pure MagnatesMedia system: dramatic narration over stock montages (4–8s cuts), founder-face thumbnail with a bold claim, mini-doc length. What transfers is the mechanism — package a person as a mystery, not a biography. Their AI voice is the exploitable weakness: the same mechanism with a real human or founder voice is our differentiation.","transferableMoves":["Package a person as a mystery (''the man who…'') instead of naming them in the title.","Open cold inside one concrete scene of the empire — never with a biography preamble.","Keep a single ownership/identity question open across the whole rise-and-fall spine."],"idea":{"title":"Founder Reality: The Founder Who Owns Nothing (On Purpose)","description":"Invert the mechanism honestly for Founder Reality: a founder who gave up equity or control on purpose, told through the specific decisions — failures integrated, founder''s own voice on mic instead of an AI narrator.","tags":["story_cold_open","rise_and_fall","competitor_teardown"]}}'::jsonb, teardown_at = now()
    from competitor_channels cc
    where cv.competitor_channel_id = cc.id and cc.organization_id = v_org
      and lower(cv.title) = lower('The Man Who Owns Everything') and cv.teardown is null;

  update competitor_videos cv set teardown = '{"whyItWorked":"Consumer-anger mechanism: ''your face'' makes the viewer personally implicated before they click, and the accusatory single-object thumbnail carries the same charge. Retention holds because each act reveals one more brand the viewer already owns, escalating the same question instead of changing subject.","observations":"The transferable frame is ''hidden monopoly you already pay'' — implication plus escalating reveals — not eyewear. It works when the claim is literally true and needs no conspiracy framing; the title never overclaims, the video cashes it in the first act.","transferableMoves":["Implicate the viewer in the title (''your…'') only when the story genuinely touches them.","Thumbnail: one accusatory object, no collage, copy that restates the implication in ≤3 words.","Structure the body as escalating reveals of things the audience already owns or uses."],"idea":{"title":"Business Storytelling: You''ve Been Paying This Company Your Whole Life","description":"Adapt the implication mechanism for Business Storytelling: pick an honestly verifiable hidden giant behind everyday brands and escalate the reveals act by act — consumer-anger framing without conspiracy claims.","tags":["question","rise_and_fall","competitor_teardown"]}}'::jsonb, teardown_at = now()
    from competitor_channels cc
    where cv.competitor_channel_id = cc.id and cc.organization_id = v_org
      and lower(cv.title) = lower('The Company That Owns Your Face') and cv.teardown is null;

  update competitor_videos cv set teardown = '{"whyItWorked":"Forbidden-knowledge curiosity on an academically legitimate topic: the title promises something the audience''s tradition ''forgot'', and the video cashes it with real scholarship (Kuntillet Ajrud, Ugarit). The cold open on an inscription makes the claim concrete before any argument starts, and the search tail is enormous because the curiosity is evergreen.","observations":"ReligionForBreakfast''s system: credentialed neutrality, explainer altitude, modest visuals. The mechanism that transfers is ''the archive remembers something the tradition forgot'' — framed descriptively, never conspiratorially. What he leaves on the table is narrative: the same evidence as a 65-minute biography-of-a-god saga is our lane, not his.","transferableMoves":["Open on the physical artifact and read it before explaining it.","Frame recovered scholarship as ''forgotten'', never ''hidden by them'' — descriptive beats conspiratorial.","Pick topics with evergreen search tails (named deities, named texts) so the video compounds."],"idea":{"title":"Myth & Meaning: Asherah — Rise and Fall of a God #3","description":"Upgrade the mechanism from explainer to saga for Myth & Meaning: the goddess''s full biography through inscriptions and texts, voice-acted sources, scholar-reviewed — the franchise entry the explainer format can''t make.","tags":["story_cold_open","chronological","competitor_teardown"]}}'::jsonb, teardown_at = now()
    from competitor_channels cc
    where cv.competitor_channel_id = cc.id and cc.organization_id = v_org
      and lower(cv.title) = lower('The Bible''s Forgotten Goddess') and cv.teardown is null;

  update competitor_videos cv set teardown = '{"whyItWorked":"Object-mystery packaging: a single physical book, a single physical detail (the chain), and a title that implies suppression without claiming conspiracy. Retention holds because each act answers one question about the object and opens another — the object IS the story spine.","observations":"Esoterica''s proof that rigorous scholarship on ''forbidden'' material scales when the packaging is honest. What transfers is the object-biography spine: pick one manuscript/relic/site and let its custody history carry the narrative. His weakness is production — static lecture visuals — so the same mechanism with cinematic treatment beats him at his own topic.","transferableMoves":["Give the video one physical object and structure acts around its custody history.","Let titles imply intrigue only where the facts genuinely carry it (a literally chained book).","Answer-and-reopen: close each act''s question while opening the next."],"idea":{"title":"Myth & Meaning: The Gospel Nobody Was Allowed to Read","description":"Object-biography treatment of a real restricted text''s custody history (e.g. the Gospel of Judas''s journey through the antiquities market) — Esoterica''s mechanism with cinematic production and the sourcing on screen.","tags":["story_cold_open","chronological","competitor_teardown"]}}'::jsonb, teardown_at = now()
    from competitor_channels cc
    where cv.competitor_channel_id = cc.id and cc.organization_id = v_org
      and lower(cv.title) = lower('The Book Chained in the Vatican') and cv.teardown is null;

  -- ── Deduplicated ideas (79) with tags ──

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('AI impact on founders — how AI is changing entrepreneurship')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'AI impact on founders — how AI is changing entrepreneurship', 'Niche-level opportunity (CI report §5), tier 1. Technical AI content exists; no "founder implications" documentary. 400K–1M potential subs · difficulty 6/10 · CTR 8–9% · RPM $15–25 (AI/SaaS sponsors) · trending +180% YoY.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'ai_founders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'ai_founders' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Female founder documentaries — dedicated series')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Female founder documentaries — dedicated series', 'Niche-level opportunity (CI report §5), tier 1. Few channels exclusively document female founder journeys. 400K–1M subs · difficulty 5/10 · CTR 7–8% · RPM $10–16 · clear differentiation + partnership potential with founder networks.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'female_founders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'female_founders' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Startup finance reality — real financial models')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Startup finance reality — real financial models', 'Niche-level opportunity (CI report §5), tier 1. Finance education is generic; real company financials are private. 250–600K subs · difficulty 7/10 (access) · CTR 7–9% · RPM $18–28 (premium professional audience). Needs CFO relationships.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'finance') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'finance' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Creator-economy founders — creator/solo business stories')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Creator-economy founders — creator/solo business stories', 'Niche-level opportunity (CI report §5), tier 1. Most channels cover VC startups; creators are under-documented and easy to access. 500K–1.2M subs · difficulty 5/10 · CTR 8–10% · RPM $10–15.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'creator_economy') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'creator_economy' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Global founder stories — non-Western entrepreneurship')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Global founder stories — non-Western entrepreneurship', 'Niche-level opportunity (CI report §5), tier 2. Global perspective + emerging-market insights. 400–900K subs · difficulty 6/10 · RPM $8–14 (regional CPM variance). Risks: language, international logistics.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'international') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'international' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Founder mental health — wellbeing + business success')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Founder mental health — wellbeing + business success', 'Niche-level opportunity (CI report §5), tier 2. Growing interest, sensitive handling required (consult expertise). 300–700K subs · difficulty 7/10 · RPM $12–18 (health/wellness sponsors).', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'mental_health') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'mental_health' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('VC/investor decision-making exposed')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'VC/investor decision-making exposed', 'Niche-level opportunity (CI report §5), tier 2. Behind-the-scenes of how VCs actually evaluate startups. 250–600K subs · difficulty 7/10 (requires VC relationships) · RPM $16–24.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'vc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'vc' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Startup mistakes analysis — what goes wrong and why')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Startup mistakes analysis — what goes wrong and why', 'Niche-level opportunity (CI report §5), tier 2. Learning-focused, non-judgmental failure analysis. 400–900K subs · difficulty 4/10 · RPM $8–14. Risk: generic if not done thoughtfully.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'failure_analysis') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'failure_analysis' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Industry-specific founder verticals (fintech / health-tech / climate-tech)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Industry-specific founder verticals (fintech / health-tech / climate-tech)', 'Niche-level opportunity (CI report §5), tier 2. Vertical expertise + industry sponsor premium. 200–500K subs per niche · difficulty 5/10 · RPM $14–22.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'verticals') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'verticals' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Solopreneur → micro-team scaling')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Solopreneur → micro-team scaling', 'Niche-level opportunity (CI report §5), tier 3. Underserved segment. 150–400K subs · difficulty 5/10 · RPM $10–16 · ~20–24 months to 100K.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'solopreneur') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'solopreneur' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Cofounder & partnership dynamics')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Cofounder & partnership dynamics', 'Niche-level opportunity (CI report §5), tier 3. Psychology of cofounder relationships. 200–500K subs · difficulty 6/10 (intimate subject) · RPM $8–14.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'cofounders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'cofounders' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Acquisition aftermath stories')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Acquisition aftermath stories', 'Niche-level opportunity (CI report §5), tier 3. Post-acquisition realities nobody discusses. 200–450K subs · difficulty 6/10 (access to founders + acquirers) · RPM $12–20.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'acquisitions') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'acquisitions' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Startup location strategy — why founders choose certain places')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Startup location strategy — why founders choose certain places', 'Niche-level opportunity (CI report §5), tier 3. Geography + business strategy, underexplored. 150–350K subs · difficulty 5/10 · RPM $8–12.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'geography') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'geography' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Founder pivots — major direction changes')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Founder pivots — major direction changes', 'Niche-level opportunity (CI report §5), tier 3. Decision-making under uncertainty. 200–500K subs · difficulty 5/10 · RPM $10–16.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'pivots') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'pivots' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Non-traditional founder paths — older founders, career switchers')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Non-traditional founder paths — older founders, career switchers', 'Niche-level opportunity (CI report §5), tier 3. Age diversity / late bloomers, underrepresented and growing. 200–500K subs · difficulty 5/10 · RPM $10–15.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'older_founders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'older_founders' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Founder exit interviews — after the acquisition/IPO')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Founder exit interviews — after the acquisition/IPO', 'Niche-level opportunity (CI report §5), tier 3. Post-exit life and reflections; premium investor audience. 150–350K subs · difficulty 7/10 (exclusive access) · RPM $14–22.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'exits') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'exits' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Bootstrapped vs. funded — different paths compared')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Bootstrapped vs. funded — different paths compared', 'Niche-level opportunity (CI report §5), tier 3. Direct comparison of funding approaches. 250–600K subs · difficulty 5/10 · RPM $10–16.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'bootstrapped') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'bootstrapped' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Founder reinvention — second acts after failure')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Founder reinvention — second acts after failure', 'Niche-level opportunity (CI report §5), tier 3. Failure recovery, inspirational but realistic. 200–500K subs · difficulty 5/10 · RPM $10–15.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'second_acts') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'second_acts' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Founder network effects — social capital as a business asset')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, null, 'Founder network effects — social capital as a business asset', 'Niche-level opportunity (CI report §5), tier 3. How successful founders build leverage. 250–600K subs · difficulty 6/10 · RPM $12–18.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'network_effects') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'network_effects' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('How $0 Became $100M: The Unfiltered Truth')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'How $0 Became $100M: The Unfiltered Truth', 'Video idea (CI report §7), tier 1. CTR 8–9% · RPM $16–24 · evergreen 8/10 · difficulty 7/10. 16 min documentary, hero''s journey with failures integrated. Hook: "This founder admits he was wrong about 90% of startup advice he gives." Wins on authenticity + specific claim + counterintuitive.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'failure_analysis') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'failure_analysis' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The 3 Decisions That Actually Matter for Startups')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The 3 Decisions That Actually Matter for Startups', 'Video idea (CI report §7), tier 1. CTR 7–8% · RPM $14–20 · evergreen 9/10 · difficulty 5/10. 14 min system explainer with examples (cofounder selection, market timing, retention focus). Hook: "Most founder advice is noise. These 3 decisions determine 80% of outcomes."', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'explainer') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'explainer' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'decisions') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'decisions' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Why This Founder Turned Down $50M (The Real Reason)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'Why This Founder Turned Down $50M (The Real Reason)', 'Video idea (CI report §7), tier 1. CTR 8–10% · RPM $12–18 · evergreen 7/10 · difficulty 6/10 (needs exclusive founder access). 18 min interview + analysis on money vs. impact and founder autonomy.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'decisions') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'decisions' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'exits') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'exits' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('10 Things No VC Will Tell You (Founder Revealed)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, '10 Things No VC Will Tell You (Founder Revealed)', 'Video idea (CI report §7), tier 1. CTR 8–9% · RPM $16–24 · evergreen 7/10 · difficulty 6/10. 15 min founder interview + graphics on VC incentives, term-sheet tricks, power imbalances. Shares the "vc" thread with the VC decision-making niche concept.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'vc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'vc' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'insider') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'insider' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Startup That Shouldn''t Have Succeeded (But Did)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Startup That Shouldn''t Have Succeeded (But Did)', 'Video idea (CI report §7), tier 1. CTR 7–8% · RPM $12–16 · evergreen 8/10 · difficulty 7/10. 17 min underdog documentary on defying odds and luck in business. Hook: "By every metric, this startup was doomed. Then this one decision changed everything."', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'underdog') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'underdog' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('How AI Is Changing What Founders Actually Need to Know')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'How AI Is Changing What Founders Actually Need to Know', 'Video idea (CI report §7), tier 2. CTR 8–9% · RPM $18–26 · evergreen 5/10 (dates quickly) · 16 min. Hook: "Everything you learned about startups in 2024 is outdated." Instantiates the AI-founders niche concept.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'ai_founders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'ai_founders' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'explainer') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'explainer' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Founder Who Quit at the Top (Here''s Why)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Founder Who Quit at the Top (Here''s Why)', 'Video idea (CI report §7), tier 2. CTR 8–9% · RPM $14–20 · evergreen 7/10 · 15 min. Hook: "She sold her company for $500M and walked away. The reason shocked investors."', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'exits') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'exits' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Why This Female Founder Raised 10x More Than Her Male Competitors')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'Why This Female Founder Raised 10x More Than Her Male Competitors', 'Video idea (CI report §7), tier 2. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 14 min. Hook: "She did something different. Here''s her unfair advantage." Instantiates the female-founders niche concept.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'female_founders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'female_founders' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'fundraising') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'fundraising' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Pivot That Saved the Company ($1B Outcome)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Pivot That Saved the Company ($1B Outcome)', 'Video idea (CI report §7), tier 2. CTR 7–8% · RPM $14–20 · evergreen 7/10 · 15 min. Hook: "They were heading toward failure. This pivot saved everything." Pairs with the founder-pivots niche concept.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'pivots') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'pivots' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Cofounder Breakup: How It Destroyed (and Created) Companies')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'Cofounder Breakup: How It Destroyed (and Created) Companies', 'Video idea (CI report §7), tier 2. CTR 8–9% · RPM $12–18 · evergreen 8/10 · 17 min, three tracked stories. Pairs with the cofounder-dynamics niche concept.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'cofounders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'cofounders' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'failure_analysis') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'failure_analysis' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Money That Ruined Great Startups')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Money That Ruined Great Startups', 'Video idea (CI report §7), tier 2. CTR 7–8% · RPM $14–20 · evergreen 7/10 · 16 min. Hook: "Too much VC funding destroyed these promising companies. Here''s how."', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'vc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'vc' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'failure_analysis') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'failure_analysis' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Why Bootstrapped Founders Make Different (Often Better) Decisions')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'Why Bootstrapped Founders Make Different (Often Better) Decisions', 'Video idea (CI report §7), tier 2. CTR 7–8% · RPM $12–18 · evergreen 9/10 · 15 min. Instantiates the bootstrapped-vs-funded niche concept.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'bootstrapped') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'bootstrapped' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'decisions') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'decisions' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Founder Who Got Everything Wrong (But Became a Billionaire Anyway)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Founder Who Got Everything Wrong (But Became a Billionaire Anyway)', 'Video idea (CI report §7), tier 2. CTR 8–9% · RPM $14–20 · evergreen 8/10 · 14 min. Hook: "His business plan violated every rule. It somehow worked."', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'underdog') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'underdog' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Why Older Founders Have an Unfair Advantage')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'Why Older Founders Have an Unfair Advantage', 'Video idea (CI report §7), tier 2. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 15 min. Hook: "Age isn''t a disadvantage in startups. It''s an edge." Instantiates the non-traditional-paths niche concept.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'older_founders') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'older_founders' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Decision That Cost This Founder $1 Billion')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Decision That Cost This Founder $1 Billion', 'Video idea (CI report §7), tier 2. CTR 8–9% · RPM $12–18 · evergreen 7/10 · 15 min. Hook: "One wrong choice. One billion dollars. Here''s the story."', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'decisions') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'decisions' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'failure_analysis') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'failure_analysis' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Behind the Scenes of a $10M Fundraise')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'Behind the Scenes of a $10M Fundraise', 'Video idea (CI report §7), tier 3. CTR 7–8% · RPM $16–24 · evergreen 6/10 · 18 min. Hook: "We filmed an entire funding round. This is what really happens."', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'fundraising') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'fundraising' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'vc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'vc' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Founder Who Rejected Venture Capital (5 Years Later)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Founder Who Rejected Venture Capital (5 Years Later)', 'Video idea (CI report §7), tier 3. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 14 min. Hook: "She turned down VCs. Five years later, here''s what happened."', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'bootstrapped') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'bootstrapped' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('How Creator-Economy Founders Make More Than VCs')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'How Creator-Economy Founders Make More Than VCs', 'Video idea (CI report §7), tier 3. CTR 8–9% · RPM $10–16 · evergreen 6/10 · 15 min. Instantiates the creator-economy niche concept.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'creator_economy') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'creator_economy' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Startup That Survived the Recession (Here''s How)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'The Startup That Survived the Recession (Here''s How)', 'Video idea (CI report §7), tier 3. CTR 7–8% · RPM $12–18 · evergreen 7/10 · 16 min. Hook: "When the market crashes, these founders doubled down."', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'resilience') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'resilience' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'founder_story') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'founder_story' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Why This Founder''s First Company Failed (And the Second Succeeded)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_founder, 'Why This Founder''s First Company Failed (And the Second Succeeded)', 'Video idea (CI report §7), tier 3. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 15 min. Hook: "He learned from failure. Here''s the specific lesson." Instantiates the founder-reinvention niche concept.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'second_acts') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'second_acts' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'failure_analysis') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'failure_analysis' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Serialized early-Christianity narrative arc (councils, canon, christology)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Serialized early-Christianity narrative arc (councils, canon, christology)', 'Niche-level opportunity (Christianity CI report §5), tier 1 — the flagship series. Redeemed Zoomer rarely goes pre-Reformation, Cogito stays at survey altitude, BibleProject skips canon politics. 300–800K potential subs · difficulty 6/10 · CTR 5–7% · serialization is a patronage engine (early-access tier). Number the episodes; every episode hooks the next.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'early_christianity_arc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'early_christianity_arc' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('''Rise and Fall of a God'' franchise')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, '''Rise and Fall of a God'' franchise', 'Niche-level opportunity (Christianity CI report §5), tier 1. Fall of Civilizations'' unclaimed twin — epic elegiac format applied to deities (2–3 releases/yr leaves his audience starving). 400K–1M subs · difficulty 8/10 (tent-pole spec) · strongest Patreon-conversion format in the dataset. Quarterly: Baal → Mithras → Asherah → Serapis.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'god_franchise') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'god_franchise' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Manuscript drama / textual-detective stories')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Manuscript drama / textual-detective stories', 'Niche-level opportunity (Christianity CI report §5), tier 1. Wes Huff treats manuscripts as evidence, not stories; Kipp Davis rebuts but never narrates his own beat. 300–700K subs · difficulty 5/10 · CTR 5–7% (heist framing on real history) · sponsor fit: Bible software, education platforms. Recurring ''Textual Detectives'' sub-series.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'textual_detectives') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'textual_detectives' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Long-form graduation path for BibleProject / McClellan / OSP audiences')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Long-form graduation path for BibleProject / McClellan / OSP audiences', 'Niche-level opportunity (Christianity CI report §5), tier 1. Three of the niche''s biggest audiences have no long-form destination (BibleProject caps at 10 min; McClellan is shorts-only; OSP viewers outgrow comedy summaries). 500K–1.5M reachable via suggested adjacency · difficulty 5/10 — a positioning/packaging play. Title against their top videos.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'graduation_path') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'graduation_path' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Scholarly-but-cinematic apocrypha & Gnosticism coverage')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Scholarly-but-cinematic apocrypha & Gnosticism coverage', 'Niche-level opportunity (Christianity CI report §5), tier 1. Gnostic Informant proved demand but burns credibility with conspiracy framing; Hochelaga''s apocrypha one-offs pull 500K–1M views at <20 light minutes. 300–700K subs · CTR 6–8% (most clickable honest cluster) · difficulty 6/10. Sources on screen — the contrast IS the brand.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'apocrypha') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'apocrypha' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('''What it was like to worship'' immersive history franchise')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, '''What it was like to worship'' immersive history franchise', 'Niche-level opportunity (Christianity CI report §5), tier 2. toldinstone''s untouched twin of ''what it was like to live''; Voices of the Past covers religion only occasionally. 250–600K subs · difficulty 6/10 · sensory reconstruction + scholarly framing; hedge reconstruction claims — this audience checks.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'immersive_worship') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'immersive_worship' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Centre Place lecture-to-documentary conversion (Second Temple syllabus)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Centre Place lecture-to-documentary conversion (Second Temple syllabus)', 'Niche-level opportunity (Christianity CI report §5), tier 2. 100+ academic lectures prove topic demand with zero packaging — their catalog is a validated topic map. Same syllabus as scripted cinematic documentaries wins their search queries. 200–450K subs · difficulty 5/10 · collab-reachable (John Hamer).', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'second_temple') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'second_temple' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The deconstruction-neutral academic lane')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The deconstruction-neutral academic lane', 'Niche-level opportunity (Christianity CI report §5), tier 2. The niche polarizes into apologetics vs counter-apologetics and concedes the middle: the curious-but-not-angry audience is the largest underserved psychographic. RFB proves neutral is the biggest brand — and he explains rather than narrates. 500K–1M · difficulty 4/10 (a discipline, not a cost) · most advertiser-safe religion content.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'neutral_lane') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'neutral_lane' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Course/patronage monetization ladder')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Course/patronage monetization ladder', 'Niche-level opportunity (Christianity CI report §5), tier 2. Ehrman sells $50–300 courses off a 220K-sub channel; RFB runs The Religion Department; the storytelling channels haven''t built the ladder (Hochelaga''s superfans have nowhere to spend). Revenue multiplier 2–5x AdSense at maturity: early-access tier → research-notes tier → annual cohort course.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'monetization_ladder') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'monetization_ladder' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Hebrew Bible scholarship as narrative (Yahweh, El, Asherah, monotheism''s origins)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Hebrew Bible scholarship as narrative (Yahweh, El, Asherah, monotheism''s origins)', 'Niche-level opportunity (Christianity CI report §5), tier 2. Esoterica''s Yahweh series massively outperforms but he stays anchored to occultism; McClellan name-checks the scholarship in 4-min clips with no long-form payoff. 300–700K subs · difficulty 6/10 (highest citation-risk cluster — scholar review pass required) · enormous patronage pull.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'yahweh_origins') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'yahweh_origins' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Primary-source performance for religious texts')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Primary-source performance for religious texts', 'Niche-level opportunity (Christianity CI report §5), tier 3. Voices of the Past''s voice-acted format applied exclusively to religious texts (martyr acts, church fathers, Gnostic gospels). 150–400K subs · difficulty 6/10 (voice-actor budget ~$200–500/episode).', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'primary_sources') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'primary_sources' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Cadence-gap capture in the epic-documentary lane')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Cadence-gap capture in the epic-documentary lane', 'Niche-level opportunity (Christianity CI report §5), tier 3. Fall of Civilizations ships 2–3x/year, History Time ~monthly — a reliable monthly 45–90 min release in their suggested neighborhoods captures waiting audiences. Structural advantage · difficulty 4/10 — a scheduling commitment; don''t over-promise (burnout threat).', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'cadence_gap') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'cadence_gap' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Comparative myth with production values (flood myths, dying-and-rising gods)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Comparative myth with production values (flood myths, dying-and-rising gods)', 'Niche-level opportunity (Christianity CI report §5), tier 3. Crecganford owns myth phylogenetics with minimal visual investment and avoids the biblical world — the myth-to-Christian-origins bridge is wide open. 200–500K subs · difficulty 5/10.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'comparative_myth') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'comparative_myth' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Mike Winger hiatus window (Q3 2026 trust-vacuum capture)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Mike Winger hiatus window (Q3 2026 trust-vacuum capture)', 'Niche-level opportunity (Christianity CI report §5), tier 3 but TIME-LIMITED: his June–August 2026 hiatus pauses the niche''s biggest long-form Bible catalog; his most curious viewers graduate to critical-historical content he won''t touch. 100–300K reachable · difficulty 3/10 (topic selection + respectful tone) · act in Q3.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'hiatus_window') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'hiatus_window' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Audio-first repurposing (podcast + newsletter)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Audio-first repurposing (podcast + newsletter)', 'Niche-level opportunity (Christianity CI report §5), tier 3. Narration-driven format is already podcast-shaped (Let''s Talk Religion triples surface area this way; Fall of Civilizations has 200M+ podcast listens); most rivals have no newsletter. +20–30% consumption surface · difficulty 2/10.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'audio_repurposing') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'audio_repurposing' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Chosen context-companion lane')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Chosen context-companion lane', 'Niche-level opportunity (Christianity CI report §5), tier 3. 6.5M monthly viewers finish episodes full of historical-context questions (Second Temple Judaism, Rome, the Pharisees) that academic storytelling can answer without attacking faith. 200–500K crossover · difficulty 4/10 · never framed as reaction content.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'chosen_companion') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'chosen_companion' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Roman-world religious history (neutral classics lane)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Roman-world religious history (neutral classics lane)', 'Niche-level opportunity (Christianity CI report §5), tier 3. toldinstone stays above the fray on early Christianity; O''Connor''s 6M monthly views prove appetite with no documentary outlet. 250–600K subs · difficulty 5/10 · classics content is advertiser-safe.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'roman_world') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'roman_world' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('''Competing Christianities'' / heresies series')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, '''Competing Christianities'' / heresies series', 'Niche-level opportunity (Christianity CI report §5), tier 3. Marcionites, Ebionites, Valentinians, Arians as character-driven episodes — BibleProject can''t touch it, Cogito skips it, Redeemed Zoomer does advocacy. Feeds the flagship arc. 200–500K · difficulty 5/10.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'early_christianity_arc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'early_christianity_arc' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'heresies') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'heresies' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Owned-audience infrastructure (newsletter + community)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Owned-audience infrastructure (newsletter + community)', 'Niche-level opportunity (Christianity CI report §5), tier 3. Only 5 of 25 deep-dived channels have newsletters; almost none run structured communities. Email + Discord de-risks the algorithm and feeds course launches. 5–10% of subs on email at maturity · difficulty 3/10.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'owned_audience') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'owned_audience' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Scholar-access synthesis (interviews as raw material, not product)')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Scholar-access synthesis (interviews as raw material, not product)', 'Niche-level opportunity (Christianity CI report §5), tier 3. MythVision''s raw interviews are unedited ore — synthesize the same scholarship into scripted documentaries; 1 interview/quarter cut into episodes rather than 3-hour podcasts. Credibility multiplier + collab pipeline · difficulty 4/10.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'niche') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'niche' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'opportunity') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'opportunity' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'scholar_access') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'scholar_access' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Council That Defined God: Nicaea, 325 AD')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Council That Defined God: Nicaea, 325 AD', 'Video idea (Christianity CI report §7), tier 1. CTR 5–6% · RPM $6–8 · evergreen 10/10 · difficulty 6/10. 55 min political thriller: persecution generation → council floor → verdict → exiles; gently debunks the canon-vote myth. Flagship of the early-Christianity arc.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'early_christianity_arc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'early_christianity_arc' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'councils') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'councils' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Gospels That Didn''t Make It')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Gospels That Didn''t Make It', 'Video idea (Christianity CI report §7), tier 1. CTR 6–8% · RPM $5–7 · evergreen 10/10 · difficulty 6/10. 60 min canon formation told through the books that lost (Thomas, Peter, Mary; Marcion''s challenge). The niche''s highest-demand honest topic — inherits Gnostic Informant''s maturing viewers.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'early_christianity_arc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'early_christianity_arc' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'apocrypha') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'apocrypha' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'canon') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'canon' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Before He Was God Alone: The Forgotten History of Yahweh')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Before He Was God Alone: The Forgotten History of Yahweh', 'Video idea (Christianity CI report §7), tier 1. CTR 6–7% · RPM $4–6 · evergreen 10/10 · difficulty 7/10 (scholar review pass required). 65 min biography of a god: Ugaritic texts, the divine council, ''Yahweh and his Asherah'', exile and monotheism. Esoterica proved the demand then retreated to occultism.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'yahweh_origins') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'yahweh_origins' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'hebrew_bible') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'hebrew_bible' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Rise and Fall of a God #1: Baal')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Rise and Fall of a God #1: Baal', 'Video idea (Christianity CI report §7), tier 1. CTR 4–6% · RPM $5–8 (watch-time annuity) · evergreen 10/10 · difficulty 8/10 (tent-pole: commissioned art, voice actor). 75 min franchise launch: the Baal cycle as drama → contest narratives → how a god becomes a devil (Beelzebub). Strongest Patreon-conversion release of the year.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'god_franchise') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'god_franchise' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'comparative_myth') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'comparative_myth' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Monk, the Trash Basket, and the World''s Oldest Bible')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Monk, the Trash Basket, and the World''s Oldest Bible', 'Video idea (Christianity CI report §7), tier 1. CTR 6–7% · RPM $6–9 (advertiser-safe adventure framing) · evergreen 9/10 · difficulty 5/10. 45 min Tischendorf/Codex Sinaiticus detective story — rescue or theft? Opens the Textual Detectives sub-series; fast, cheap first release.', 'high'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'textual_detectives') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'textual_detectives' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'manuscripts') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'manuscripts' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Dead Sea Scrolls Forgery Scandal')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Dead Sea Scrolls Forgery Scandal', 'Video idea (Christianity CI report §7), tier 2. CTR 6–7% · RPM $6–8 · evergreen 8/10 · difficulty 5/10. 50 min modern crime story (post-2002 fake fragments, Museum of the Bible) — distinct from the pipeline''s ''What the Dead Sea Scrolls actually say''. Kipp Davis''s own beat he''ll never produce; natural consultant collab.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'textual_detectives') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'textual_detectives' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'dead_sea_scrolls') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'dead_sea_scrolls' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Last Day of the Temple')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Last Day of the Temple', 'Video idea (Christianity CI report §7), tier 2. CTR 5–6% · RPM $5–8 · evergreen 10/10 · difficulty 7/10. 60 min immersive reconstruction of the Temple''s final year + how 70 AD created both Judaism and Christianity. toldinstone''s untouched ''what it was like to worship'' twin; answers The Chosen audience''s context questions.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'immersive_worship') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'immersive_worship' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'second_temple') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'second_temple' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Flood Before Noah')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Flood Before Noah', 'Video idea (Christianity CI report §7), tier 2. CTR 6–7% · RPM $5–7 · evergreen 10/10 · difficulty 6/10. 50 min comparative-myth narrative (Atrahasis, Gilgamesh XI voice-acted, Genesis in context) — dependence and difference, not gotcha. Crecganford''s beat with production values.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'comparative_myth') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'comparative_myth' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'hebrew_bible') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'hebrew_bible' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The First Heretic: Marcion, the Man Who Forced the Bible into Existence')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The First Heretic: Marcion, the Man Who Forced the Bible into Existence', 'Video idea (Christianity CI report §7), tier 2. CTR 5–6% · RPM $5–7 · evergreen 9/10 · difficulty 5/10. 45 min character-driven arc episode 2 — the first published Christian canon rejected the whole Old Testament. Feeds directly out of ''The Gospels That Didn''t Make It''.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'early_christianity_arc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'early_christianity_arc' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'heresies') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'heresies' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'canon') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'canon' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Gospel in the Garbage Dump')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Gospel in the Garbage Dump', 'Video idea (Christianity CI report §7), tier 2. CTR 6–7% · RPM $5–7 · evergreen 9/10 · difficulty 5/10. 40 min discovery narrative: Oxyrhynchus + Nag Hammadi framing for the Gospel of Thomas. The 40+ minute rigorous apocrypha treatment is uncontested.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'apocrypha') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'apocrypha' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'textual_detectives') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'textual_detectives' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Did Christianity Copy the Dying-and-Rising Gods?')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Did Christianity Copy the Dying-and-Rising Gods?', 'Video idea (Christianity CI report §7), tier 2. CTR 6–8% · RPM $4–6 · evergreen 9/10 · difficulty 7/10 (both camps'' fact-checkers). 55 min honest adjudication: steelman the parallels, then what scholars actually conclude. Serves the curious middle between MythVision''s sensationalism and McClellan''s 4-min debunks; highest cross-tribal share potential.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'comparative_myth') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'comparative_myth' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'neutral_lane') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'neutral_lane' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('How Israel Stopped Believing in Many Gods')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'How Israel Stopped Believing in Many Gods', 'Video idea (Christianity CI report §7), tier 2. CTR 5–6% · RPM $4–6 · evergreen 10/10 · difficulty 6/10. 55 min sequel to the Yahweh biography: Josiah''s reform, Babylon, Second Isaiah — monotheism as a conclusion reached in the ashes of a destroyed kingdom.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'yahweh_origins') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'yahweh_origins' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'hebrew_bible') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'hebrew_bible' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Book of Enoch: The Bible''s Banned Prequel')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Book of Enoch: The Bible''s Banned Prequel', 'Video idea (Christianity CI report §7), tier 2. CTR 7–8% · RPM $4–6 (keep ''banned'' descriptive, not thumbnail bait) · evergreen 9/10 · difficulty 5/10. 50 min text biography: the Watchers, why it was beloved then dropped (except Ethiopia). Hochelaga''s biggest one-offs at 15 light minutes prove the demand for the definitive version.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'apocrypha') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'apocrypha' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Zoroaster''s Shadow: The Religion That Shaped Heaven and Hell')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Zoroaster''s Shadow: The Religion That Shaped Heaven and Hell', 'Video idea (Christianity CI report §7), tier 2. CTR 5–6% · RPM $5–7 · evergreen 10/10 · difficulty 6/10. 60 min comparative narrative presenting the influence debate as a live scholarly question. Cogito and Let''s Talk Religion prove search demand at survey altitude; neither builds the narrative bridge.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'comparative_myth') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'comparative_myth' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Rise and Fall of a God #2: Mithras, the God of the Legions')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Rise and Fall of a God #2: Mithras, the God of the Legions', 'Video idea (Christianity CI report §7), tier 2. CTR 5–6% · RPM $5–8 · evergreen 10/10 · difficulty 8/10. 70 min franchise entry — one god''s full biography plus why Christianity won (distinct from the pipeline''s mystery-cults idea). Serves O''Connor''s early-Christianity appetite with no documentary outlet.', 'medium'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'god_franchise') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'god_franchise' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'roman_world') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'roman_world' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Scribes Who Changed the Bible')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Scribes Who Changed the Bible', 'Video idea (Christianity CI report §7), tier 3. CTR 5–6% · RPM $5–7 · evergreen 9/10 · difficulty 5/10. 40 min Textual Detectives entry: ending of Mark, pericope adulterae — watching scribes add famous passages. Ehrman''s course empire proves paying demand; we''re the visual-narrative complement.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'textual_detectives') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'textual_detectives' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'manuscripts') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'manuscripts' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Why Rome Feared the Christians')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Why Rome Feared the Christians', 'Video idea (Christianity CI report §7), tier 3. CTR 5–6% · RPM $5–8 · evergreen 10/10 · difficulty 5/10. 50 min primary-source narrative (Pliny–Trajan letters, martyr acts, voice-acted) — Voices of the Past''s format on the religious sub-beat he only visits.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'primary_sources') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'primary_sources' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'roman_world') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'roman_world' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Other Messiahs')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Other Messiahs', 'Video idea (Christianity CI report §7), tier 3. CTR 5–6% · RPM $5–7 · evergreen 9/10 · difficulty 5/10. 45 min Second Temple context: the dozen first-century messiah claimants — and the one who almost beat Rome. Serves The Chosen viewers'' unanswered context questions at long-form depth.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'second_temple') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'second_temple' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'chosen_companion') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'chosen_companion' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('The Ark of the Covenant: What Actually Happened to It')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'The Ark of the Covenant: What Actually Happened to It', 'Video idea (Christianity CI report §7), tier 3. CTR 7–8% · RPM $5–7 · evergreen 9/10 · difficulty 4/10. 40 min curiosity topic resolved with scholarship — the anti-sensationalism template; high browse-traffic test vehicle.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'hebrew_bible') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'hebrew_bible' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'curiosity_packaging') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'curiosity_packaging' on conflict do nothing;
  end if;

  if not exists (select 1 from ideas where organization_id = v_org and lower(title) = lower('Constantine: The Emperor Who Bet on a Forbidden God')) then
    insert into ideas (organization_id, channel_id, title, description, priority, status)
    values (v_org, v_rel, 'Constantine: The Emperor Who Bet on a Forbidden God', 'Video idea (Christianity CI report §7), tier 3. CTR 5–6% · RPM $5–8 · evergreen 10/10 · difficulty 6/10. 60 min belief-politics biography completing the Nicaea-era binge cluster with the council and Marcion episodes. Kings and Generals covers his battles, never his belief politics.', 'low'::idea_priority, 'inbox'::idea_status)
    returning id into v_row;
    insert into tags (organization_id, name) values (v_org, 'early_christianity_arc') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'early_christianity_arc' on conflict do nothing;
    insert into tags (organization_id, name) values (v_org, 'roman_world') on conflict (organization_id, name) do nothing;
    insert into idea_tags (idea_id, tag_id) select v_row, id from tags where organization_id = v_org and name = 'roman_world' on conflict do nothing;
  end if;

  -- ── Knowledge-base insights (30) ──

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Face-centered thumbnails win the business niche (+25–30% CTR)')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Face-centered thumbnails win the business niche (+25–30% CTR)', '72% success rate for face (left ⅓) + bold ≤3-word claim (right ⅓) in orange/blue, mobile-optimized (70% of views). Text-heavy thumbnails are declining (28%). What we do differently: face-centered testimonial style as default, A/B minimalist for professional topics. [CI Jul 2026 §3.1]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('The 15-second retention cliff is the master rule')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'The 15-second retention cliff is the master rule', 'Videos that lose viewers before 15s rarely recover; the steepest drop is at 10–20s. Every hook must deliver on the title''s promise by second 15. What we do differently: the hook must pay off the packaging promise inside 15 seconds — no scene-setting preambles. [CI Jul 2026 §3.2]', 0.9);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('''Proof then promise'' is the strongest hook (78% retention at 30s)')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', '''Proof then promise'' is the strongest hook (78% retention at 30s)', 'Shocking stat (0–5s) → payoff (5–15s) → commitment (15–30s) appears in 58% of top videos and holds 78% at 30s, vs 71% contrarian, 74% story immersion, 67% question hooks. What we do differently: proof-then-promise as default; question hooks only when the question itself is the story. [CI Jul 2026 §3.2]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Title formula: [Number/Claim] – [Benefit] – [Curiosity] (CTR 6.8–8.2%)')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Title formula: [Number/Claim] – [Benefit] – [Curiosity] (CTR 6.8–8.2%)', 'Numbers add +34% CTR, personal pronouns +18%, parentheticals +12%; the first 40 characters are critical (mobile truncation). Power words work only when honest. What we do differently: every title drafted against this formula, and never a claim the video can''t cash. [CI Jul 2026 §3.3]', 0.8);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Hero''s journey with failures integrated beats success-only narratives')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Hero''s journey with failures integrated beats success-only narratives', '74% completion for hero''s-journey-with-failures on founder stories; rise-and-fall (70%) is most shareable for company stories. Emotional beats matter more than structure: 3–5 beats across 12–18 min outperform flat narratives by 15–20% retention. What we do differently: failures are integrated, never skipped — that''s the positioning. [CI Jul 2026 §3.4]', 0.8);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('6–8s average shot length is the pacing sweet spot for 18–45')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', '6–8s average shot length is the pacing sweet spot for 18–45', 'Younger audiences want 3–5s cuts, 40+ tolerates 8–12s; 6–8s serves the 18–45 core. What we do differently: brief the editor on 6–8s average with intentional slower holds on emotional beats. [CI Jul 2026 §3.5]', 0.7);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Human narrators retain +22% vs AI voice — and audiences now detect AI')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Human narrators retain +22% vs AI voice — and audiences now detect AI', 'Distinctive personal narrators appear in 64% of 2M+ channels; detectable AI narration costs 12–18% retention and is declining in audience favor. Authentic founder voices in multi-voice formats add 18–25% engagement. What we do differently: human (or founder) voice, always — it''s also Magnates Media''s biggest weakness. [CI Jul 2026 §3.5]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('1.5×/week is the growth-optimal cadence; 2×+/week collapses by month 12')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', '1.5×/week is the growth-optimal cadence; 2×+/week collapses by month 12', '1.5×/week correlates with +35–50% YoY sub growth and stays sustainable; 80% of small-team channels on 2×+/week fail within 12 months (quality death + burnout). Consistent-mediocre beats sporadic-brilliant. What we do differently: 1.5×/week ceiling, enforced — burnout is the #1 cause of channel death. [CI Jul 2026 §4.1]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Tue–Thu, 9am–12pm ET is the publishing window for business content')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Tue–Thu, 9am–12pm ET is the publishing window for business content', 'Best-performing slot for business/founder audiences — but consistency matters more than exact timing. What we do differently: fixed Tue/Thu slots so the audience can build a habit. [CI Jul 2026 §4.1]', 0.6);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Sponsorships pay 2–5× AdSense; business audiences carry a 20–30% CPM premium')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Sponsorships pay 2–5× AdSense; business audiences carry a 20–30% CPM premium', 'Sponsor CPMs: finance/investment $15–45, crypto $12–35, SaaS $8–25, tech $10–20, education $6–15. Revenue by size: 100–500K subs → $2–5K/mo deals; 1–3M → $10–25K. What we do differently: sponsor outreach starts pre-100K, targeting finance/SaaS first. [CI Jul 2026 §4.2]', 0.8);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Mid-roll native sponsor integration causes no retention drop')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Mid-roll native sponsor integration causes no retention drop', 'Integrated mid-roll reads at ~50% show no retention penalty; intro reads >20s cost 5–10%. What we do differently: one native mid-roll per video, never a cold intro read. [CI Jul 2026 §4.2]', 0.75);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('20 of 25 deep-dived competitors are AdSense-only — the structural gap')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'competitor', '20 of 25 deep-dived competitors are AdSense-only — the structural gap', 'Even leaders (ColdFusion, Wendover) have no product, course, community, or newsletter, leaving 40–60% of potential revenue on the table. Top diversified channels earn 40–60% from non-ad sources. What we do differently: newsletter + community from day 1, product at ~100K subs — a moat competitors must restructure to copy. [CI Jul 2026 §2.3, §4.2]', 0.9);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('The audience: 22–45 aspiring entrepreneurs; curiosity and schadenfreude drive clicks')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'The audience: 22–45 aspiring entrepreneurs; curiosity and schadenfreude drive clicks', '~65% male / 35% female, 40% US / 20% UK-EU / 15% India, median income $40–80K. Emotional triggers in top videos: curiosity/mystery 71%, aspiration 58%, ''what went wrong'' 48%, awe 42%, fear/risk 35%. What we do differently: lead packaging with curiosity + honest failure stakes, not inspiration. [CI Jul 2026 §4.3]', 0.75);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Underserved gaps: failure analysis, female founders, international founders, AI × founders')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'competitor', 'Underserved gaps: failure analysis, female founders, international founders, AI × founders', 'General founder stories are saturated (50+ channels, −15–25% YoY for mediocre entrants); nearly unserved: dedicated failure analysis, founder follow-ups, creator-economy founders, founder mental health, sports-business. What we do differently: enter only through the gaps — authentic failure analysis first — and never compete head-on with generic founder stories. [CI Jul 2026 §4.4]', 0.8);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Audiences are rewarding authenticity and punishing ''inspiration porn''')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Audiences are rewarding authenticity and punishing ''inspiration porn''', 'Wants growing: authenticity, failure analysis, realistic advice, diverse founders. Rejecting: inspiration porn (−20% YoY), generic advice (−20–30% YoY), get-rich-quick framing (regulatory + trust risk). What we do differently: zero-BS editorial rule — real decisions and real numbers, or the story doesn''t run. [CI Jul 2026 §1, §6]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Burnout kills 70% of channels — sustainability is a strategy, not a vibe')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_founder, 'pattern', 'Burnout kills 70% of channels — sustainability is a strategy, not a vibe', '70% of channel failures trace to founder burnout; production costs rise 20–30%/yr as audience expectations inflate. What we do differently: 3–5 person team, 14-day production cycle, 1.5×/week hard ceiling, and format variety within the theme to avoid fatigue. [CI Jul 2026 §6]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Rigor and narrative are substitutes in this niche — nobody combines them')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'competitor', 'Rigor and narrative are substitutes in this niche — nobody combines them', 'Every channel in the 25-deep-dive sample picked one: ReligionForBreakfast/Esoterica/Ehrman have rigor without story; Hochelaga/Voices of the Past/History Time have story without rigor. Six competitors'' blind-spot lists independently point at the combination. What we do differently: rigor + cinematic narrative is the whole positioning — match RFB''s sourcing while beating him on emotional experience. [CI Jul 2026 · Christianity §1]', 0.9);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Patronage-first monetization — sponsors are a side dish here')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Patronage-first monetization — sponsors are a side dish here', 'Only 3 of 25 deep-dived channels are AdSense-led; Patreon/memberships dominate, courses are the proven premium tier (Ehrman sells $50–300 courses off a 220K-sub channel), and the niche''s giants are donation-funded nonprofits (BibleProject, The Chosen). Patron conversion runs ~0.13–0.35% of subs. What we do differently: build the ladder early — early-access tier, research-notes tier, annual cohort course — instead of waiting for sponsor CPMs that never come. [CI Jul 2026 · Christianity §4]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Artifact-led thumbnails beat faces for documentary formats — the inverse of the business niche')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Artifact-led thumbnails beat faces for documentary formats — the inverse of the business niche', 'Faces cluster exclusively in the interview/debate/reaction lanes; documentary channels win with manuscripts, icons, reconstructed scenes, and restrained text — and visibly non-clickbait packaging is itself a trust signal this audience rewards. What we do differently: artifact-forward thumbnails with ≤3 words, no arrows, no shocked faces; A/B against painting-detail crops. [CI Jul 2026 · Christianity §3]', 0.8);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Low cadence is viable: watch time + patronage decouple income from frequency')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Low cadence is viable: watch time + patronage decouple income from frequency', 'Six channels averaging ~1.1M subs ship 0.1–0.5 videos/week (Fall of Civilizations: 2–3/year). Long runtimes make each upload an AdSense annuity and patronage smooths the gaps. What we do differently: 2–3 quality releases/month beats weekly filler — out-ship the epics 4–8x without matching explainer-channel cadence. [CI Jul 2026 · Christianity §4]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Credentialed human narration is the moat — 24 of 25 channels show zero AI usage')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Credentialed human narration is the moat — 24 of 25 channels show zero AI usage', 'Roughly half the sample fronts academic credentials on camera or in scripts; YouTube''s 2026 AI-content crackdown widens the authenticity premium. This audience checks citations and punishes errors permanently. What we do differently: human narration always, sources on screen, and a scholar-review pass on high-stakes scripts (Yahweh/Asherah cluster). [CI Jul 2026 · Christianity §3]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Three of the niche''s biggest audiences have no long-form destination')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'competitor', 'Three of the niche''s biggest audiences have no long-form destination', 'BibleProject (5.4M subs) caps at ~10 minutes; Dan McClellan (~2.5M monthly views) is short-form only; OSP viewers outgrow comedy summaries with nowhere to go on-channel. The graduation path is the largest reachable pool in the dataset (500K–1.5M via suggested adjacency). What we do differently: deliberately title/tag against their top videos — their search terms, our depth. [CI Jul 2026 · Christianity §5]', 0.8);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('The curious-but-not-angry middle is the largest underserved psychographic')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'The curious-but-not-angry middle is the largest underserved psychographic', 'The niche polarizes into apologetics (InspiringPhilosophy, Huff) and counter-apologetics (MythVision, Paulogia, Kipp Davis), each conceding the middle. ReligionForBreakfast proves the neutral brand is the biggest brand — and he''s alone in it. Neutral content is also the most advertiser-safe religion content. What we do differently: ''ancient meaning-making'' framing; neutrality maintained under comment-section pressure from both camps. [CI Jul 2026 · Christianity §4–5]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Sensationalism burns trust permanently in this niche — Gnostic Informant is the cautionary tale')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'competitor', 'Sensationalism burns trust permanently in this niche — Gnostic Informant is the cautionary tale', '''They hid it from you'' framing gets clicks and then bleeds maturing viewers; weak sourcing is detected fast by an audience that includes seminarians and grad students. What we do differently: honest titles that still open loops (''The Gospels That Didn''t Make It''), ''banned/forbidden'' used descriptively not conspiratorially, and citations visible on screen. [CI Jul 2026 · Christianity §6]', 0.85);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Serialization is the niche''s patronage engine')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Serialization is the niche''s patronage engine', 'Numbered arcs and franchises (Fall of Civilizations'' episodes, Redeemed Zoomer''s denomination series) convert casual viewers to members via early-access and ''next episode'' pull. What we do differently: the early-Christianity arc and the ''Rise and Fall of a God'' franchise are both numbered, both end on hooks, and both feed a Patreon early-access tier. [CI Jul 2026 · Christianity §5]', 0.75);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Time-limited: the Mike Winger hiatus window (June–August 2026)')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'anomaly', 'Time-limited: the Mike Winger hiatus window (June–August 2026)', 'The niche''s biggest long-form Bible catalog (~1.5M monthly views, donor-funded) paused uploads June 1; his most curious viewers graduate to critical-historical content he won''t touch. What we do differently: ship the early-Christianity and manuscript episodes during Q3 2026 with respectful, non-combative packaging to catch that audience while the vacuum lasts. [CI Jul 2026 · Christianity §5, opp #14]', 0.7);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Religion AdSense RPMs are modest ($4–10) — packaging discipline protects them')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Religion AdSense RPMs are modest ($4–10) — packaging discipline protects them', 'Advertiser sensitivity clusters around conspiratorial/controversial framings; adventure-history and classics framings are the most advertiser-safe. Sponsors that do appear: education platforms, Bible software, audiobooks, documentary streamers, history games. What we do differently: factual titles, sensitive topics framed academically, and revenue weighted toward patronage/courses so RPM dips don''t matter. [CI Jul 2026 · Christianity §4]', 0.75);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Proven-demand topic clusters: apocrypha/lost gospels, Yahweh''s origins, manuscripts-as-drama')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Proven-demand topic clusters: apocrypha/lost gospels, Yahweh''s origins, manuscripts-as-drama', 'Apocrypha is the most clickable honest cluster (CTR 6–8% in this sample); Esoterica''s Yahweh series and Hochelaga''s Nephilim one-offs massively outperform their baselines; Wes Huff took manuscripts mainstream in under two years. What we do differently: enter through these three proven clusters before broadening; each has a named incumbent weakness. [CI Jul 2026 · Christianity §5, §7]', 0.8);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Centre Place''s lecture catalog is a free, validated topic-demand map')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'competitor', 'Centre Place''s lecture catalog is a free, validated topic-demand map', '100+ academic lectures (Second Temple Judaism, canon history) rank on search with zero packaging — proof of sustained demand for exactly our syllabus. What we do differently: treat their catalog as keyword research; cover the same syllabus as scripted, chaptered, cinematic documentaries and win their queries. [CI Jul 2026 · Christianity §5, opp #7]', 0.75);
  end if;

  if not exists (select 1 from ai_insights where organization_id = v_org and lower(title) = lower('Owned-audience infrastructure is a niche-wide gap')) then
    insert into ai_insights (organization_id, channel_id, kind, title, body, confidence)
    values (v_org, v_rel, 'pattern', 'Owned-audience infrastructure is a niche-wide gap', 'Only 5 of 25 deep-dived channels run newsletters; almost none run structured communities. Algorithm dependence is the top strategic threat for low-cadence channels. What we do differently: newsletter + Discord from this quarter; email 5–10% of subs at maturity feeds course launches directly. [CI Jul 2026 · Christianity §5–6]', 0.75);
  end if;

  -- ── Per-niche SOPs (8) — one version each, source 'ai' ──

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Hooks — Business niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_founder, 'Hooks — Business niche', 'hooks', 'active', 45, now() + interval '45 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Open business/founder videos so a browsing viewer commits inside 15 seconds.', 'Every Founder Reality / Business Storytelling video, before scripting the body.', '["Default to proof-then-promise: concrete proof in the first 5 seconds, payoff by second 15, commitment by 30 (78% retention at 30s vs 67% for question hooks in the CI sample).","Deliver the title''s promise by second 15 — the 10–20s retention cliff is unrecoverable.","Prefer a direct claim over scene-setting; use first person where honest (+8–12% engagement).","Open cold inside a decision moment or a single scene of the empire — never a biography preamble (MagnatesMedia teardowns).","Never open with a statistic without context; read the hook aloud and cut it if it runs past 20 seconds."]'::jsonb, 'Created from the July 2026 business teardown cycle (25 channels): proof-then-promise default, 15-second delivery rule, decision-moment cold opens. Evidence: MagnatesMedia, ColdFusion, How Money Works, Internet Historian teardowns.', 'ai');
  end if;

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Packaging — Business niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_founder, 'Packaging — Business niche', 'packaging', 'active', 45, now() + interval '45 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Title + thumbnail packaging tuned to what wins in the business/founder niche.', 'After the script locks, before scheduling, on business-niche videos.', '["Thumbnail: face on the left third + a ≤3-word claim on the right, orange/blue palette (72% success pattern, +25–30% CTR); check on a phone first — 70% of views are mobile.","Title: draft against [Number/Claim] – [Benefit] – [Curiosity]; numbers +34% CTR, personal pronouns +18%; front-load the first 40 characters.","Identity-mystery framing (''the man who…'', ''the company that…'') when the subject genuinely carries it (Magnates Media mechanism).","Implicate the viewer (''your…'') only when the story literally touches them (Luxottica mechanism) — never overclaim; trust damage is permanent.","Title and thumbnail must not repeat the same words."]'::jsonb, 'Created from the July 2026 business teardown cycle: face-left formula, number/benefit/curiosity titles, identity-mystery and viewer-implication mechanisms. Evidence: MagnatesMedia, Fortune, Company Man, Wall Street Millennial teardowns.', 'ai');
  end if;

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Story Structure — Business niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_founder, 'Story Structure — Business niche', 'storytelling', 'active', 45, now() + interval '45 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Pick the narrative spine and pacing that maximize retention on founder/company stories.', 'At outline stage on business-niche videos.', '["Founder/person stories: hero''s journey with failures integrated (74% completion in the CI sample) — never success-only.","Company stories: rise-and-fall (most shareable, 70% completion).","Plan 3–5 emotional beats (setback → revelation → triumph) per 12–18 minutes; beats outperform flat narratives by 15–20% retention regardless of spine.","Pacing: 6–8s average shot length for the 18–45 core; hold longer only on emotional beats.","Keep one concrete question open across the whole video; end every act on it."]'::jsonb, 'Created from the July 2026 business teardown cycle: failures-integrated default, emotional-beat rule, 6–8s pacing. Evidence: Modern MBA, Internet Historian, Real Stories, Wendover teardowns; patterns §3.4–3.5.', 'ai');
  end if;

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Topic Selection — Business niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_founder, 'Topic Selection — Business niche', 'research', 'active', 60, now() + interval '60 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Greenlight only business topics with demonstrated demand and a named competitor blind spot.', 'Weekly idea review for the business niche.', '["Check the CI saturation map: generic founder stories and generic advice are declining (−15–30% YoY); the open gaps are failure analysis, female/international founders, creator-economy founders, AI × founders.","Name the competitor blind spot the topic exploits (20/25 deep-dived channels are AdSense-only and success-only) — if no tracked channel is weak here, rescore.","Find 3+ comparable videos with above-baseline views/day; log them in the competitor database.","Score 1-5 on demand, differentiation, and production cost; packaging (title + thumbnail concept) drafted at idea stage."]'::jsonb, 'Created from the July 2026 business teardown cycle: saturation-map gate + blind-spot requirement, sourced from all 25 deep-dive blind-spot lists.', 'ai');
  end if;

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Hooks — Religion & History niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_rel, 'Hooks — Religion & History niche', 'hooks', 'active', 45, now() + interval '45 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Open religious-history videos so curiosity is honest and the promise lands early.', 'Every Myth & Meaning video, before scripting the body.', '["Open cold on an artifact, a scene, or a primary-source line — drop the viewer inside the ancient world, not inside a thesis.","Deliver the title''s promise early and honestly; this audience punishes bait permanently.","Question hooks must be resolved with scholarship by the end — never leave a ''mystery'' the video can''t cash (the anti-Gnostic-Informant rule).","State what scholars actually know vs what is debated within the first minute on contested topics.","Read the hook aloud; atmosphere is allowed to breathe here — slower than business-niche pacing, but every sentence still earns its place."]'::jsonb, 'Created from the July 2026 Christianity teardown cycle (25 channels): artifact/scene cold-opens, honest-promise delivery, resolve-with-scholarship rule. Evidence: Hochelaga, Voices of the Past, Fall of Civilizations, Gnostic Informant teardowns.', 'ai');
  end if;

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Packaging — Religion & History niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_rel, 'Packaging — Religion & History niche', 'packaging', 'active', 45, now() + interval '45 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Title + thumbnail packaging tuned to what wins in the religious-history niche — the opposite of the business playbook.', 'After the script locks, before scheduling, on religion-niche videos.', '["Thumbnail: artifact/manuscript/icon-led with ≤3 words — faces win only in interview/debate lanes, which we are not in. No arrows, no shocked faces.","Visibly non-clickbait packaging is itself a trust signal this audience rewards — restraint converts.","Winning title shapes: ''What X Actually Believed'', ''The Forgotten/Lost X'', questions the video resolves with scholarship.","''Banned/forbidden'' only when literally descriptive (Book of Enoch), never conspiratorial; watch advertiser sensitivity on contested framings.","Title and thumbnail must not repeat the same words; check artifact readability at 120px."]'::jsonb, 'Created from the July 2026 Christianity teardown cycle: artifact-led thumbnails (inverse of the business niche), no-clickbait trust packaging, honest ''forbidden'' rule. Evidence: Hochelaga, UsefulCharts, Esoterica, ReligionForBreakfast teardowns.', 'ai');
  end if;

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Story Structure — Religion & History niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_rel, 'Story Structure — Religion & History niche', 'storytelling', 'active', 45, now() + interval '45 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Pick the narrative spine that carries scholarship as story on religious-history topics.', 'At outline stage on religion-niche videos.', '["Default spines: mystery-reveal (discoveries), biography-of-a-god/text (franchise entries), textual-detective (manuscript stories).","Serialize: number arc episodes and end each on a hook into the next — serialization is this niche''s patronage engine.","Voice-act primary sources instead of paraphrasing the narrator over them (Voices of the Past mechanism, with the scholarly framing he omits).","Hedge reconstruction claims explicitly — ''we think'', ''the evidence suggests'' — this audience checks.","Runtimes breathe here: 40–75 min is normal at the top of the niche; cut for tension, not for length."]'::jsonb, 'Created from the July 2026 Christianity teardown cycle: mystery-reveal/biography/detective spines, serialization rule, voice-acted sources. Evidence: Fall of Civilizations, Voices of the Past, History Time, Crecganford teardowns.', 'ai');
  end if;

  if not exists (select 1 from sops where organization_id = v_org and lower(title) = lower('Research & Credibility — Religion & History niche')) then
    insert into sops (organization_id, channel_id, title, category, status, review_frequency_days, next_review_at)
    values (v_org, v_rel, 'Research & Credibility — Religion & History niche', 'research', 'active', 60, now() + interval '60 days')
    returning id into v_sop;
    insert into sop_versions (sop_id, version_number, purpose, when_to_use, steps, change_summary, source)
    values (v_sop, 1, 'Protect the channel''s credibility — the leading indicator of everything in this niche.', 'Every religion-niche video, from topic selection through publish.', '["Sources on screen — the visible contrast with sensationalist channels IS the brand.","Scholar-review pass required on high-stakes scripts (Yahweh/Asherah/monotheism cluster, anything contested).","Stay neutral under comment pressure: never be claimed by the apologetics or counter-apologetics camp — the curious middle is the audience.","Zero-retraction standard: one bad correction does permanent damage with this audience; when scholarship is divided, present the division.","No conspiracy framing ever — cover apocrypha and ''lost'' texts rigorously and inherit sensationalist channels'' maturing viewers."]'::jsonb, 'Created from the July 2026 Christianity teardown cycle: sources-on-screen rule, scholar-review gate, neutrality discipline, zero-retraction standard. Evidence: Gnostic Informant (cautionary), ReligionForBreakfast, Kipp Davis, MythVision teardowns.', 'ai');
  end if;

end $$;
