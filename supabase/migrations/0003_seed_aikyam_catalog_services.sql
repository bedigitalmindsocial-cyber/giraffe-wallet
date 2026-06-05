-- Seed the Aikyam/Giraffe service catalog from the credit table, including
-- AI-powered variants where speed and expert review make sense.

insert into services (
  name,
  description,
  category,
  default_role_id,
  avg_hours,
  included_revisions,
  credit_cost,
  credit_cost_override,
  tag,
  method_tag,
  sort_order
)
select
  d.name,
  d.description,
  d.category,
  r.id,
  d.avg_hours,
  d.included_revisions,
  greatest(1, ceil((d.avg_hours * r.multiplier * cfg.base_hourly_rate * cfg.markup_multiplier) / cfg.credit_value))::int as credit_cost,
  false,
  d.tag,
  d.method_tag,
  d.sort_order
from (
  values
    ('New Webpage Template', 'New reusable webpage structure with layout, core copy blocks, visual direction, and responsive implementation notes.', 'Web Development', 'Manager', 5.0, 2, null, 'HYBRID', 101),
    ('New Webpage Variation', 'Adapt an approved webpage template for a new offer, audience, or campaign with revised copy and imagery.', 'Web Development', 'Executive', 4.0, 1, 'NEW', 'AI POWERED', 102),
    ('AI Webpage Copy & Image Variation', 'Fast AI-generated page copy and image-direction variant, reviewed and polished by an expert before delivery.', 'Web Development', 'Executive', 2.0, 1, 'NEW', 'AI POWERED', 103),
    ('Text & Image Changes (per webpage)', 'Small copy swaps, image replacements, section edits, and formatting updates on an existing webpage.', 'Website Changes', 'Executive', 0.8, 1, null, 'AI POWERED', 104),
    ('Research & Content Writing (100 words)', 'Research-backed copy block or article section delivered in 100-word units with an edit pass.', 'Content Writing', 'Executive', 1.6, 1, null, 'AI POWERED', 105),
    ('Website Graphics', 'Custom website visual asset such as a section graphic, hero support visual, feature illustration, or landing-page banner.', 'Website Graphics', 'Executive', 3.2, 2, null, 'HYBRID', 106),
    ('AI Website Graphic Variation', 'AI-assisted website graphic variant from an existing direction, refined for brand fit and clean delivery.', 'Website Graphics', 'Executive', 1.2, 1, 'NEW', 'AI POWERED', 107),
    ('Blog Graphics', 'Article header or supporting blog visual sized for web publishing and social sharing.', 'Website Graphics', 'Executive', 2.4, 2, null, 'HYBRID', 108),
    ('AI Blog Graphic Variation', 'Rapid AI-assisted blog visual variation, curated and polished for brand consistency.', 'Website Graphics', 'Executive', 1.0, 1, 'NEW', 'AI POWERED', 109),
    ('Static Posts/Ads', 'Single static social post or ad creative with caption-ready messaging, platform sizing, and export files.', 'Social Media Creatives', 'Executive', 2.4, 2, 'POPULAR', 'AI POWERED', 110),
    ('AI Static Post/Ad Variation', 'Fast AI-powered variation of an approved static post or ad, expert-polished for brand tone and layout.', 'Social Media Creatives', 'Executive', 1.2, 1, 'NEW', 'AI POWERED', 111),
    ('Video Ads (<30 Seconds)', 'Short-form video ad with script, edit direction, basic motion, and one platform-ready export under 30 seconds.', 'Social Media Creatives', 'Manager', 2.4, 2, null, 'HYBRID', 112),
    ('Video Ads (<60 Seconds)', 'Video ad up to 60 seconds with script, edit plan, motion direction, and export-ready delivery.', 'Social Media Creatives', 'Manager', 4.0, 2, null, 'HYBRID', 113),
    ('Video Ads (>60 Seconds)', 'Longer-form video ad or explainer requiring deeper scripting, sequencing, edit supervision, and review.', 'Social Media Creatives', 'Manager', 8.0, 2, null, 'ARTISAN', 114),
    ('AI Video Ad Concept Cut (<30 Seconds)', 'AI-assisted short video concept, script, and first-cut direction for quick testing before a full production pass.', 'Social Media Creatives', 'Executive', 3.2, 1, 'NEW', 'AI POWERED', 115),
    ('Print Ads', 'Print-ready advertisement concept with copy, layout, visual direction, and press/export specifications.', 'Social Media Creatives', 'Manager', 3.2, 2, null, 'HYBRID', 116),
    ('Carousel Ads', 'Multi-slide ad creative with structured narrative, slide copy, design, and platform-ready exports.', 'Social Media Creatives', 'Executive', 4.0, 2, 'POPULAR', 'HYBRID', 117),
    ('AI Carousel Ad Variation', 'AI-assisted carousel variation using an approved concept, polished by an expert for clarity and brand fit.', 'Social Media Creatives', 'Executive', 1.6, 1, 'NEW', 'AI POWERED', 118),
    ('Social Media Covers', 'Platform cover, header, or profile-banner design adapted to channel dimensions and brand requirements.', 'Social Media Creatives', 'Executive', 3.2, 2, null, 'HYBRID', 119),
    ('Presentation & Pitch Decks (up to 8 pages)', 'Per-page deck design and copy polish for concise investor, sales, or internal presentations up to 8 pages.', 'Presentation & Documents', 'Manager', 1.6, 2, null, 'HYBRID', 120),
    ('Presentation & Pitch Decks (more than 8 pages)', 'Per-page continuation pricing for larger decks once the structure and direction are already established.', 'Presentation & Documents', 'Manager', 1.2, 2, null, 'HYBRID', 121),
    ('Presentation Templates', 'Reusable presentation template page with master visual system, typography, components, and page structure.', 'Presentation & Documents', 'Manager', 1.6, 2, null, 'HYBRID', 122),
    ('AI Presentation Draft (up to 8 slides)', 'AI-assisted first draft for an 8-slide presentation, expert-curated into a coherent narrative and structure.', 'Presentation & Documents', 'Executive', 4.0, 1, 'NEW', 'AI POWERED', 123),
    ('Infographics (per page)', 'Single infographic page with information hierarchy, visual structure, copy cleanup, and export-ready design.', 'Presentation & Documents', 'Executive', 2.4, 2, null, 'HYBRID', 124),
    ('AI Infographic Concept Variation', 'AI-assisted infographic concept or layout variation refined by an expert for readability and brand alignment.', 'Presentation & Documents', 'Executive', 1.2, 1, 'NEW', 'AI POWERED', 125),
    ('Sales Sheets (per page)', 'One-page sales sheet or product/service explainer with copy structure, design, and export-ready files.', 'Presentation & Documents', 'Executive', 2.4, 2, null, 'HYBRID', 126),
    ('Reports (per page)', 'Designed report page with cleaned-up content, visual hierarchy, tables/charts where needed, and final export.', 'Presentation & Documents', 'Executive', 2.4, 2, null, 'HYBRID', 127),
    ('Print Collateral: New Design', 'New print design for flyers, business cards, posters, signage, stationery, certificates, billboards, covers, T-shirts, inserts, or similar collateral.', 'Print Media', 'Manager', 4.0, 2, null, 'ARTISAN', 128),
    ('Print Collateral: Variation', 'Variation of an approved print collateral design for another format, size, language, audience, or offer.', 'Print Media', 'Manager', 2.0, 1, null, 'HYBRID', 129),
    ('AI Print Collateral Variation', 'AI-assisted print collateral variation from an approved design direction, expert-checked for layout and production readiness.', 'Print Media', 'Executive', 2.0, 1, 'NEW', 'AI POWERED', 130),
    ('Changes to Print Graphics (after 10 days)', 'Post-delivery changes to print graphics requested after the included delivery window has passed.', 'Revisions', 'Executive', 1.6, 1, null, 'HYBRID', 131)
) as d(name, description, category, role_name, avg_hours, included_revisions, tag, method_tag, sort_order)
cross join settings cfg
join roles r on r.name = d.role_name
on conflict (name) do update set
  description = excluded.description,
  category = excluded.category,
  default_role_id = excluded.default_role_id,
  avg_hours = excluded.avg_hours,
  included_revisions = excluded.included_revisions,
  credit_cost = case
    when services.credit_cost_override then services.credit_cost
    else excluded.credit_cost
  end,
  tag = excluded.tag,
  method_tag = excluded.method_tag,
  sort_order = excluded.sort_order,
  updated_at = now();
