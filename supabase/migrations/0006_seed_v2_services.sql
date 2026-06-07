-- Migration 0006 — Seed 46 v2 services
-- Replaces all legacy services with the full v2 catalog.

delete from services;

insert into services (
  name,
  category,
  default_role_id,
  pricing_model,
  credits_per_unit,
  unit_label,
  min_units,
  tier_threshold,
  tier_credits_per_unit,
  method_tag,
  audience_tag,
  lifecycle_tag,
  internal_avg_hours,
  turnaround_days,
  is_active,
  sort_order
)
values

-- ── CORE ──────────────────────────────────────────────────────────────────────
(
  'Strategy & Planning',
  'Core',
  (select id from roles where name = 'Senior Manager'),
  'flat', 80, 'unit', 1, null, null,
  'ARTISAN', 'CROSS', null,
  16, 30, true, 1
),
(
  'Website Maintenance',
  'Core',
  (select id from roles where name = 'Manager'),
  'flat', 50, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  10, 30, true, 2
),
(
  'Monthly Content System',
  'Core',
  (select id from roles where name = 'Manager'),
  'flat', 70, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  14, 30, true, 3
),

-- ── WEB DEVELOPMENT ───────────────────────────────────────────────────────────
(
  'New Webpage (Template)',
  'Web Development',
  (select id from roles where name = 'Manager'),
  'flat', 25, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  5, 5, true, 10
),
(
  'Webpage Variation',
  'Web Development',
  (select id from roles where name = 'Executive'),
  'flat', 10, 'unit', 1, null, null,
  'AI POWERED', 'CROSS', null,
  2, 5, true, 11
),
(
  'Text & Image Changes',
  'Web Development',
  (select id from roles where name = 'Executive'),
  'flat', 2, 'webpage', 1, null, null,
  'AI POWERED', 'CROSS', null,
  0.5, 5, true, 12
),

-- ── CONTENT WRITING ───────────────────────────────────────────────────────────
(
  'Research & Content Writing',
  'Content Writing',
  (select id from roles where name = 'Manager'),
  'per_100_words', 4, '100 words', 2, null, null,
  'HYBRID', 'CROSS', 'POPULAR',
  null, 5, true, 20
),
(
  'Copyediting & Proofreading',
  'Content Writing',
  (select id from roles where name = 'Executive'),
  'per_100_words', 1, '100 words', 5, null, null,
  'AI POWERED', 'CROSS', null,
  null, 5, true, 21
),
(
  'Translation & Localisation',
  'Content Writing',
  (select id from roles where name = 'Executive'),
  'per_100_words', 3, '100 words', 2, null, null,
  'AI POWERED', 'EXPORT', null,
  null, 5, true, 22
),

-- ── GRAPHIC DESIGN ────────────────────────────────────────────────────────────
(
  'Website Graphic',
  'Graphic Design',
  (select id from roles where name = 'Executive'),
  'flat', 8, 'unit', 1, null, null,
  'AI POWERED', 'CROSS', null,
  2, 5, true, 30
),
(
  'Blog/Article Graphic',
  'Graphic Design',
  (select id from roles where name = 'Executive'),
  'flat', 6, 'unit', 1, null, null,
  'AI POWERED', 'CROSS', null,
  1.5, 5, true, 31
),
(
  'Social Static Post',
  'Graphic Design',
  (select id from roles where name = 'Executive'),
  'flat', 6, 'unit', 1, null, null,
  'AI POWERED', 'CROSS', 'POPULAR',
  1.5, 5, true, 32
),
(
  'Social Carousel',
  'Graphic Design',
  (select id from roles where name = 'Executive'),
  'per_design', 2, 'slide', 3, null, null,
  'HYBRID', 'CROSS', 'POPULAR',
  null, 5, true, 33
),
(
  'Social Cover',
  'Graphic Design',
  (select id from roles where name = 'Executive'),
  'flat', 8, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  2, 5, true, 34
),
(
  'Print Ad Design',
  'Graphic Design',
  (select id from roles where name = 'Manager'),
  'flat', 16, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  3, 5, true, 35
),
(
  'Motion Graphic for Existing Video',
  'Graphic Design',
  (select id from roles where name = 'Executive'),
  'flat', 8, 'unit', 1, null, null,
  'AI POWERED', 'CROSS', null,
  2, 5, true, 36
),

-- ── VIDEO ─────────────────────────────────────────────────────────────────────
(
  'Video Ad (under 30 seconds)',
  'Video',
  (select id from roles where name = 'Manager'),
  'flat', 12, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  6, 5, true, 40
),
(
  'Video Ad (30-60 seconds)',
  'Video',
  (select id from roles where name = 'Manager'),
  'flat', 20, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  10, 5, true, 41
),
(
  'Video Ad (over 60 seconds)',
  'Video',
  (select id from roles where name = 'Manager'),
  'flat', 40, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  18, 5, true, 42
),
(
  'Explainer Video (animated 60-90s)',
  'Video',
  (select id from roles where name = 'Senior Manager'),
  'flat', 60, 'unit', 1, null, null,
  'ARTISAN', 'CROSS', null,
  24, 5, true, 43
),

-- ── PRESENTATION & DOCUMENTS ──────────────────────────────────────────────────
(
  'Pitch Deck',
  'Presentation & Documents',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 8, 'page', 1, 8, 6,
  'ARTISAN', 'CROSS', 'POPULAR',
  null, 5, true, 50
),
(
  'Brochure / Corporate Profile / Catalogue',
  'Presentation & Documents',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 8, 'page', 1, 8, 6,
  'ARTISAN', 'MFG', 'NEW',
  null, 5, true, 51
),
(
  'Sales Sheet / One-Pager',
  'Presentation & Documents',
  (select id from roles where name = 'Manager'),
  'per_page', 6, 'page', 1, null, null,
  'HYBRID', 'CROSS', null,
  null, 5, true, 52
),
(
  'Whitepaper / Case Study (designed)',
  'Presentation & Documents',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 6, 'page', 1, null, null,
  'ARTISAN', 'CROSS', 'POPULAR',
  null, 5, true, 53
),
(
  'Report (Annual / Market / Industry)',
  'Presentation & Documents',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 6, 'page', 1, null, null,
  'ARTISAN', 'CAPITAL', null,
  null, 5, true, 54
),

-- ── PRINT MEDIA ───────────────────────────────────────────────────────────────
(
  'Print Design',
  'Print Media',
  (select id from roles where name = 'Manager'),
  'per_design', 20, 'design', 1, 1, 10,
  'HYBRID', 'MFG', 'POPULAR',
  null, 5, true, 60
),

-- ── PHOTOGRAPHY & VIDEOGRAPHY ─────────────────────────────────────────────────
(
  'Photography (half-day)',
  'Photography & Videography',
  (select id from roles where name = 'Manager'),
  'flat', 25, 'unit', 1, null, null,
  'ARTISAN', 'MFG', null,
  5, 5, true, 70
),
(
  'Photography (full-day)',
  'Photography & Videography',
  (select id from roles where name = 'Manager'),
  'flat', 45, 'unit', 1, null, null,
  'ARTISAN', 'MFG', null,
  9, 5, true, 71
),
(
  'Videography (half-day)',
  'Photography & Videography',
  (select id from roles where name = 'Manager'),
  'flat', 30, 'unit', 1, null, null,
  'ARTISAN', 'MFG', null,
  6, 5, true, 72
),
(
  'Videography (full-day)',
  'Photography & Videography',
  (select id from roles where name = 'Manager'),
  'flat', 60, 'unit', 1, null, null,
  'ARTISAN', 'MFG', null,
  10, 5, true, 73
),

-- ── STRATEGY & BRAND ──────────────────────────────────────────────────────────
(
  'Brand Strategy & Positioning',
  'Strategy & Brand',
  (select id from roles where name = 'Senior Partner'),
  'flat', 200, 'unit', 1, null, null,
  'ARTISAN', 'CROSS', null,
  24, 5, true, 80
),
(
  'Logo & Identity',
  'Strategy & Brand',
  (select id from roles where name = 'Senior Manager'),
  'flat', 150, 'unit', 1, null, null,
  'ARTISAN', 'CROSS', null,
  24, 5, true, 81
),
(
  'Brand Guidelines',
  'Strategy & Brand',
  (select id from roles where name = 'Manager'),
  'flat', 60, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  12, 5, true, 82
),
(
  'SEO Audit',
  'Strategy & Brand',
  (select id from roles where name = 'Manager'),
  'flat', 30, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  6, 5, true, 83
),
(
  'Ad Campaign Strategy',
  'Strategy & Brand',
  (select id from roles where name = 'Senior Manager'),
  'flat', 60, 'unit', 1, null, null,
  'ARTISAN', 'CROSS', null,
  10, 5, true, 84
),
(
  'Market Research Report',
  'Strategy & Brand',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 6, 'page', 1, null, null,
  'ARTISAN', 'MFG', null,
  null, 5, true, 85
),

-- ── EMAIL & NEWSLETTER ────────────────────────────────────────────────────────
(
  'Email Campaign (single)',
  'Email & Newsletter',
  (select id from roles where name = 'Executive'),
  'flat', 8, 'unit', 1, null, null,
  'AI POWERED', 'CROSS', null,
  3, 5, true, 90
),
(
  'Newsletter Issue (recurring)',
  'Email & Newsletter',
  (select id from roles where name = 'Executive'),
  'flat', 8, 'unit', 1, null, null,
  'AI POWERED', 'CROSS', null,
  3, 5, true, 91
),
(
  'Newsletter Template (one-time)',
  'Email & Newsletter',
  (select id from roles where name = 'Manager'),
  'flat', 40, 'unit', 1, null, null,
  'HYBRID', 'CROSS', null,
  8, 5, true, 92
),

-- ── PR & MEDIA ────────────────────────────────────────────────────────────────
(
  'Media Pitch & Outreach Sprint',
  'PR & Media',
  (select id from roles where name = 'Senior Manager'),
  'flat', 60, 'unit', 1, null, null,
  'ARTISAN', 'CROSS', null,
  8, 5, true, 100
),

-- ── PODCAST ───────────────────────────────────────────────────────────────────
(
  'Podcast Episode Production',
  'Podcast',
  (select id from roles where name = 'Manager'),
  'per_episode', 30, 'episode', 1, null, null,
  'HYBRID', 'CROSS', null,
  7, 5, true, 110
),

-- ── CAPITAL MARKETS ───────────────────────────────────────────────────────────
(
  'Equity Story Document',
  'Capital Markets',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 8, 'page', 1, null, null,
  'ARTISAN', 'CAPITAL', null,
  null, 5, true, 120
),
(
  'Investor Presentation',
  'Capital Markets',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 8, 'page', 1, 8, 6,
  'ARTISAN', 'CAPITAL', 'LIMITED',
  null, 5, true, 121
),
(
  'Annual Report Design',
  'Capital Markets',
  (select id from roles where name = 'Senior Manager'),
  'per_page', 6, 'page', 1, null, null,
  'ARTISAN', 'CAPITAL', 'LIMITED',
  null, 5, true, 122
),
(
  'Spokesperson Prep',
  'Capital Markets',
  (select id from roles where name = 'Senior Partner'),
  'flat', 100, 'unit', 1, null, null,
  'ARTISAN', 'CAPITAL', null,
  12, 5, true, 123
),

-- ── REVISIONS ─────────────────────────────────────────────────────────────────
(
  'Late Revision',
  'Revisions',
  (select id from roles where name = 'Executive'),
  'flat', 4, 'revision', 1, null, null,
  'HYBRID', 'CROSS', null,
  1, 5, true, 130
);
