# GIRAFFE WALLET — SERVICE CATALOG SPEC v2 (SIMPLIFIED)

**This replaces v1 entirely. Companion to GIRAFFE_WALLET_BUILD_PROMPT.md.**

Inspired by the catalog Lovish ran a few years ago: per-unit pricing, judgment-set rates, a small number of services that self-scale to any size. Adds the GROW WITH US 30 capabilities and Capital Markets work without bloat.

---

## 1. The shift in pricing model

### What v1 did wrong
Each service had a fixed credit cost computed from `avg_hours × role_multiplier × markup`. To handle different sizes, I created variants — "Pitch deck (12-15 slides)" vs "Pitch deck (20-25 slides, complex)" vs "Pitch deck (small)" etc. 76 services. Hard to maintain. Hard to price consistently.

### What v2 does right
Each service has a **pricing model**. Most services are **flat** (one price, one deliverable). The most-used categories are **per-unit** — pay by the page, by 100 words, by design. The manager enters quantity at task creation and the credit cost computes automatically. No size variants in the catalog. About 46 services total.

### Five pricing models

| Model | Used for | Example |
|---|---|---|
| `flat` | Single fixed deliverable | Logo & Identity = 150 credits |
| `per_page` | Decks, brochures, catalogues, whitepapers, reports | Pitch deck = 8/page (first 8), 6/page (9+) |
| `per_100_words` | Content writing, copyediting, translation | Article writing = 4 per 100 words |
| `per_design` | Print media items | Banner/Flyer/Card etc = 20/new, 10/variation |
| `per_episode` | Recurring units | Podcast episode = 30 each |

---

## 2. Schema delta to apply to `services` table

Replace the v1 schema with:

```sql
ALTER TABLE services
  DROP COLUMN avg_hours,
  DROP COLUMN credit_cost,
  DROP COLUMN credit_cost_override,
  DROP COLUMN credit_cost_override_reason,
  DROP COLUMN included_revisions;

ALTER TABLE services
  ADD COLUMN pricing_model text NOT NULL DEFAULT 'flat'
    CHECK (pricing_model IN ('flat','per_page','per_100_words','per_design','per_episode')),
  ADD COLUMN credits_per_unit decimal(8,2) NOT NULL,
  ADD COLUMN unit_label text NOT NULL DEFAULT 'unit',
  ADD COLUMN min_units int NOT NULL DEFAULT 1,
  ADD COLUMN tier_threshold int,
  ADD COLUMN tier_credits_per_unit decimal(8,2),
  ADD COLUMN included_revisions_per_unit decimal(4,2) DEFAULT 0.5,
  ADD COLUMN late_revision_credits int DEFAULT 4,
  ADD COLUMN internal_avg_hours decimal(5,2),
  ADD COLUMN scope_inclusions text,
  ADD COLUMN scope_exclusions text,
  ADD COLUMN client_inputs_required text,
  ADD COLUMN deliverable_format text,
  ADD COLUMN turnaround_days int DEFAULT 5,
  ADD COLUMN quality_bar text;

-- Tag system unchanged from v1
ALTER TABLE services
  ADD COLUMN lifecycle_tag text 
    CHECK (lifecycle_tag IN ('NEW','POPULAR','PROMO','LIMITED','DISCONTINUED') OR lifecycle_tag IS NULL),
  ADD COLUMN method_tag text NOT NULL DEFAULT 'HYBRID'
    CHECK (method_tag IN ('AI POWERED','HYBRID','ARTISAN')),
  ADD COLUMN audience_tag text NOT NULL DEFAULT 'CROSS'
    CHECK (audience_tag IN ('MFG','CAPITAL','EXPORT','TALENT','CROSS'));
```

### Pricing logic at task creation

```ts
function computeCreditCost(service: Service, quantity: number): number {
  if (service.pricing_model === 'flat') {
    return service.credits_per_unit;
  }
  if (service.tier_threshold && quantity > service.tier_threshold) {
    const baseCost = service.tier_threshold * service.credits_per_unit;
    const discountedCost = (quantity - service.tier_threshold) * service.tier_credits_per_unit;
    return Math.ceil(baseCost + discountedCost);
  }
  return Math.ceil(quantity * service.credits_per_unit);
}
```

Worked examples:
- Pitch deck, 8 pages: 8 × 8 = **64 credits**
- Pitch deck, 12 pages: (8×8) + (4×6) = **88 credits**
- Brochure, 4 pages: 4 × 8 = **32 credits**
- Catalogue, 24 pages: (8×8) + (16×6) = **160 credits**
- Article, 1500 words: 15 × 4 = **60 credits**
- Press release, 400 words: 4 × 4 = **16 credits**

---

## 3. The full catalog — 46 services

Each entry: name | pricing | method tag | audience tag | role (internal cost tracking) | turnaround | scope inclusions / exclusions / inputs / quality bar.

---

### A. CORE (auto-created system tasks — 3 services)

These auto-generate at engagement start and consume Core Bucket. Not orderable individually.

**A1. Strategy & Planning** ✋ ARTISAN | CROSS
- Pricing: **80 credits/month** (flat). Internal: Senior Manager, ~16h.
- Quarterly roadmap, monthly reviews, weekly priorities. One review meeting per month.

**A2. Website Maintenance** 🔧 HYBRID | CROSS
- Pricing: **50 credits/month** (flat). Internal: Manager, ~10h.
- Uptime monitoring, weekly backups, security patches, performance, content updates up to 4 hours.

**A3. Monthly Content System** 🔧 HYBRID | CROSS
- Pricing: **70 credits/month** (flat). Internal: Manager, ~14h.
- One pillar piece (article OR film, alternating), 8 derivative posts, 1 newsletter, 1 sales-collateral repurpose.

**Total Core = 200 credits/month × 3 months = 600 credits/quarter.**

---

### B. WEB DEVELOPMENT (3 services)

**B1. New Webpage (Template)** 🔧 HYBRID | CROSS
- Pricing: **25 credits flat**. Internal: Manager, ~5h.
- Inclusions: New page from scratch, copy + design + dev, mobile responsive, SEO basics.
- Inputs: Page brief (audience, action, proof points), brand assets.
- Quality: One CTA. Page weight under 1MB.

**B2. Webpage Variation** ⚡ AI POWERED | CROSS
- Pricing: **10 credits flat**. Internal: Executive, ~2h.
- Inclusions: Alternate version of an existing page, copy or layout variation, A/B test ready.

**B3. Text & Image Changes (per webpage)** ⚡ AI POWERED | CROSS
- Pricing: **2 credits flat per webpage**. Internal: Executive, ~30min.
- Inclusions: In-place text and image swaps on an existing page. No layout changes.

---

### C. CONTENT WRITING (3 services, per 100 words)

**C1. Research & Content Writing** 🔧 HYBRID | CROSS | Lifecycle: POPULAR
- Pricing: **4 credits per 100 words**. Min 200 words. Internal: Manager, ~1h per 250 words.
- Covers: blog posts, long-form articles, whitepapers, case study narratives, web copy, sales pages, founder stories, PR articles, press releases.
- Inclusions: Research, drafting, edit pass, fact-flagging.
- Exclusions: Design and graphics.
- Inputs: Topic brief, target keyword, audience, 2-3 references.
- Quality: Original perspective in headline and intro. Passes a 5-question Turing read.

**C2. Copyediting & Proofreading** ⚡ AI POWERED | CROSS
- Pricing: **1 credit per 100 words**. Min 500 words.
- Inclusions: Light copy edit, consistency check, fact-flag.
- Exclusions: Substantive rewriting (use C1).

**C3. Translation & Localisation** ⚡ AI POWERED | EXPORT
- Pricing: **3 credits per 100 words**. Min 200 words.
- Inclusions: AI-driven translation + native-reviewer pass for tone. Standard languages: Spanish, French, German, Arabic, Mandarin, Hindi, Tamil, Bengali. Other languages priced separately.
- Exclusions: Sworn/legal translation.

---

### D. GRAPHIC DESIGN — flat (7 services)

**D1. Website Graphic** ⚡ AI POWERED | CROSS
- Pricing: **8 credits flat**. Internal: Executive, ~2h.

**D2. Blog/Article Graphic** ⚡ AI POWERED | CROSS
- Pricing: **6 credits flat**. Internal: Executive, ~1.5h.

**D3. Social Static Post** ⚡ AI POWERED | CROSS | Lifecycle: POPULAR
- Pricing: **6 credits flat**. Internal: Executive, ~1.5h.
- Inclusions: One static post, copy + design, platform-sized, hashtags, alt text.

**D4. Social Carousel (per slide)** 🔧 HYBRID | CROSS | Lifecycle: POPULAR
- Pricing: **2 credits per slide**. Min 3 slides.
- Examples: 5-slide carousel = 10 credits, 10-slide = 20 credits.
- Inclusions: Cover + body + CTA slides, design + copy.

**D5. Social Cover** 🔧 HYBRID | CROSS
- Pricing: **8 credits flat**. Internal: Executive, ~2h.
- Covers: LinkedIn banner, Twitter/X header, Facebook cover, YouTube banner.

**D6. Print Ad Design** 🔧 HYBRID | CROSS
- Pricing: **16 credits flat**. Internal: Manager, ~3h.
- Inclusions: Concept + copy + design for one print ad, CMYK print-ready.

**D7. Motion Graphic for Existing Video** ⚡ AI POWERED | CROSS
- Pricing: **8 credits flat**. Internal: Executive, ~2h.
- Inclusions: Lower-thirds, animated text, transitions, end card on existing edited video.

---

### E. VIDEO (4 services)

**E1. Video Ad (under 30 seconds)** 🔧 HYBRID | CROSS
- Pricing: **12 credits flat**. Internal: Manager, ~6h.
- Inclusions: Script, storyboard, edit (footage provided), motion graphics, music, 1 platform variant.
- Exclusions: Original shoot (use H series). Voiceover talent fees.

**E2. Video Ad (30-60 seconds)** 🔧 HYBRID | CROSS
- Pricing: **20 credits flat**. Internal: Manager, ~10h.

**E3. Video Ad (over 60 seconds)** 🔧 HYBRID | CROSS
- Pricing: **40 credits flat**. Internal: Manager, ~18h.
- Inclusions: Full script, storyboard, edit, music, voiceover direction, 3 platform variants.

**E4. Explainer Video (animated, 60-90s)** ✋ ARTISAN | CROSS
- Pricing: **60 credits flat**. Internal: Senior Manager, ~24h.
- Inclusions: Concept, script, storyboard, illustrated/animated explainer, music, voiceover direction.

---

### F. PRESENTATION & DOCUMENTS — per page (5 services)

**F1. Pitch Deck** ✋ ARTISAN | CROSS | Lifecycle: POPULAR
- Pricing: **8 credits/page (first 8 pages), 6 credits/page (9th onwards)**.
- Examples: 8-page deck = 64. 12-page = 88. 20-page = 64 + 72 = 136.
- Inclusions: Narrative structure, copy, design, presenter notes, PDF export.
- Exclusions: Custom illustrations beyond brand-system. Pitch coaching.
- Inputs: Audience, ask/objective, key proof points, brand assets, 60-min stakeholder briefing.
- Quality: Slide 1 makes audience care. Last slide makes action obvious.

**F2. Brochure / Corporate Profile / Catalogue** ✋ ARTISAN | MFG, EXPORT | Lifecycle: NEW
- Pricing: **8 credits/page (first 8 pages), 6 credits/page (9th onwards)**.
- Examples: 4-page brochure = 32. 12-page corporate profile = 88. 24-page catalogue = 160.
- Inclusions: Concept, copy, design, photography direction (using existing library), print-ready CMYK + digital PDF.
- Exclusions: Original photography (use H series). Print production.
- Inputs: Product/company info, certifications, key proof points, brand assets, image library.
- Quality: Front cover works as a standalone teaser. Each spread has one primary message.
- **Adding pages later**: same service, same per-page rate, just create a new task with the page count of the addition.

**F3. Sales Sheet / One-Pager** 🔧 HYBRID | CROSS
- Pricing: **6 credits/page**. Most are 1-2 pages.
- Inclusions: Single or two-page sell sheet, copy + design, print + digital.
- Quality: One action. No filler.

**F4. Whitepaper / Case Study (designed)** ✋ ARTISAN | CROSS | Lifecycle: POPULAR
- Pricing: **6 credits/page**. Most are 4-12 pages.
- Inclusions: Designed PDF layout of pre-written content, custom infographics integrated (up to 3), web-ready short version, LinkedIn promo copy.
- Exclusions: The writing itself (use C1, charged separately).
- Inputs: Approved final text, supporting data, brand assets.
- Quality: Standalone shareable. Three quotable stat-bites highlighted.

**F5. Report (Annual / Market / Industry)** ✋ ARTISAN | CAPITAL, MFG
- Pricing: **6 credits/page**. Annual reports typically 40-80 pages = 240-480 credits.
- Inclusions: Concept, layout, infographics, photography direction, print + digital + interactive web version.
- Exclusions: Audited financial statements. Original research.

---

### G. PRINT MEDIA — flat per design (1 service)

**G1. Print Design** 🔧 HYBRID | MFG, EXPORT | Lifecycle: POPULAR
- Pricing: **20 credits per new design, 10 credits per variation**.
- Covers: Banners, Flyers, Business Cards, Posters, Signages, Stationery, Stickers, Leaflets, Invitations, Postcards, Certificates & Awards, Billboards, Trade Show Banners, Packaging Inserts, T-Shirts, Album/Book Covers, Lanyard Inserts, Door-Hangers, Tent Cards.
- Inclusions: Concept, copy, design, print-ready CMYK output.
- Exclusions: Print production. Original photography.
- Inputs: Specs (dimensions, material, fold), key message, brand assets.
- Variation rule: Same design adapted (different size, language, or product variant) at half rate.
- Quality: Print-tested on standard paper before sign-off.

---

### H. PHOTOGRAPHY & VIDEOGRAPHY (4 services)

**H1. Photography (half-day)** ✋ ARTISAN | MFG, EXPORT, TALENT
- Pricing: **25 credits flat**. Internal: Manager + assistant, ~5h.
- Inclusions: Photographer + 1 assistant, 30-50 edited high-res images, brand-style direction, basic licensing.
- Exclusions: Travel beyond client city. Models/talent fees. Set design.

**H2. Photography (full-day)** ✋ ARTISAN | MFG, EXPORT, TALENT
- Pricing: **45 credits flat**. Internal: Manager + assistant, ~9h.
- Inclusions: Same as H1, 80-120 edited finals.

**H3. Videography (half-day)** ✋ ARTISAN | MFG, EXPORT, TALENT
- Pricing: **30 credits flat**. Internal: Manager + DOP, ~6h.
- Inclusions: Videographer + DOP, raw footage, on-site direction, basic licensing. Editing charged separately under E series.

**H4. Videography (full-day)** ✋ ARTISAN | MFG, EXPORT, TALENT
- Pricing: **60 credits flat**. Internal: Manager + DOP + assistant, ~10h.

---

### I. STRATEGY & BRAND (6 services)

**I1. Brand Strategy & Positioning** ✋ ARTISAN | CROSS
- Pricing: **200 credits flat**. Internal: Senior Partner, ~24h.
- Inclusions: Positioning statement, brand pillars, tone of voice, value prop framework, do-don't-say list, sample applications.
- Exclusions: Visual identity (use I2). Naming.
- Inputs: 90-min founder interview, 3 customer reference calls, 3 years of communications samples.

**I2. Logo & Identity** ✋ ARTISAN | CROSS
- Pricing: **150 credits flat**. Internal: Senior Manager, ~24h.
- Inclusions: Logo (primary, secondary, monogram), color palette, typography, basic application set (cards, letterhead, email signature, social profiles).
- Exclusions: Brand guidelines doc (use I3). Packaging system.

**I3. Brand Guidelines** 🔧 HYBRID | CROSS
- Pricing: **60 credits flat**. Internal: Manager, ~12h.
- Inclusions: Logo usage, color spec, typography, photography direction, voice summary, do-don't examples, 3 sample applications.

**I4. SEO Audit** 🔧 HYBRID | CROSS
- Pricing: **30 credits flat**. Internal: Manager, ~6h.
- Inclusions: Technical + content + keyword audit, top 10 fixes prioritised with effort/impact ratings.
- Exclusions: Implementation (use B series).

**I5. Ad Campaign Strategy** ✋ ARTISAN | CROSS
- Pricing: **60 credits flat**. Internal: Senior Manager, ~10h.
- Inclusions: Channel mix recommendation, audience definition, creative brief, budget allocation, KPI framework.
- Exclusions: Ad creative production (use D, E series). Media buying.

**I6. Market Research Report** ✋ ARTISAN | MFG, CAPITAL
- Pricing: **6 credits/page**. Typically 25-40 pages = 150-240 credits.
- Inclusions: Sector landscape, competitor mapping, buyer journey, pricing benchmarks, threat-and-opportunity matrix.
- Exclusions: Primary research interviews. Original survey design.

---

### J. EMAIL & NEWSLETTER (3 services)

**J1. Email Campaign (single)** ⚡ AI POWERED | CROSS
- Pricing: **8 credits flat**. Internal: Executive, ~3h.
- Inclusions: Copy, design, mobile-tested, subject line A/B options, plain-text version.

**J2. Newsletter Issue (recurring)** ⚡ AI POWERED | CROSS
- Pricing: **8 credits flat per issue**. Internal: Executive, ~3h.
- Inclusions: One issue using existing template, copy + curation + layout.

**J3. Newsletter Template (one-time)** 🔧 HYBRID | CROSS
- Pricing: **40 credits flat**. Internal: Manager, ~8h.
- Inclusions: Reusable template + first issue, mobile-tested.

---

### K. PR & MEDIA (1 service, plus C1 for press releases)

**K1. Media Pitch & Outreach Sprint (10 publications)** ✋ ARTISAN | CROSS
- Pricing: **60 credits flat**. Internal: Senior Manager, ~8h.
- Inclusions: Curated publication list, customised pitch per outlet, follow-up cadence, response handling.
- Exclusions: Guaranteed placement. Paid placement.

(Press releases and PR articles use C1 — Research & Content Writing — at 4 credits per 100 words.)

---

### L. PODCAST (1 service)

**L1. Podcast Episode Production** 🔧 HYBRID | CROSS
- Pricing: **30 credits per episode**. Internal: Manager, ~7h.
- Inclusions: Audio edit, music, intro/outro, transcript, episode description, 3 audiogram clips, cover graphic.
- Exclusions: Recording. Hosting platform setup.

---

### M. CAPITAL MARKETS (4 services, optional add-on for Capital clients)

**M1. Equity Story Document** ✋ ARTISAN | CAPITAL
- Pricing: **8 credits/page**. Typically 15-25 pages = 120-200 credits.
- Inclusions: Investor-grade narrative, why-now/why-us framing, moat articulation, sample Q&A handling, talking points companion.
- Exclusions: Financial model. Legal/regulatory drafting.

**M2. Investor Presentation** ✋ ARTISAN | CAPITAL | Lifecycle: LIMITED
- Pricing: **8 credits/page (first 8), 6 credits/page (9+)**. Typically 25-35 pages = 166-226 credits.
- Inclusions: Full deck, narrative redesign, custom data visualisations, presenter notes, 2 dry-run sessions.
- Exclusions: DRHP filing. Financial audit.

**M3. Annual Report Design** ✋ ARTISAN | CAPITAL | Lifecycle: LIMITED
- Pricing: **6 credits/page**. Typically 60-100 pages = 360-600 credits.

**M4. Spokesperson Prep** ✋ ARTISAN | CAPITAL
- Pricing: **100 credits flat**. Internal: Senior Partner, ~12h.
- Inclusions: Message map, expected Q&A (50+), bridging techniques, 90-min mock interview, debrief.

---

### N. REVISIONS (1 service)

**N1. Late Revision (after 10 days of delivery)** 🔧 HYBRID | CROSS
- Pricing: **4 credits flat per revision**. Internal: Executive, ~1h.
- Inclusions: Single round of changes to a previously-delivered design or document.
- Note: Each service includes default free revisions during the active job. This kicks in only when the client comes back >10 days after delivery.

---

## 4. Catalog summary

| Category | Services | Most-used pricing |
|---|---|---|
| A. Core (system) | 3 | Flat per month |
| B. Web Development | 3 | Flat |
| C. Content Writing | 3 | Per 100 words |
| D. Graphic Design | 7 | Flat |
| E. Video | 4 | Flat |
| F. Presentation & Documents | 5 | Per page |
| G. Print Media | 1 | Per design |
| H. Photography & Videography | 4 | Flat |
| I. Strategy & Brand | 6 | Flat (one per page) |
| J. Email & Newsletter | 3 | Flat |
| K. PR & Media | 1 | Flat |
| L. Podcast | 1 | Per episode |
| M. Capital Markets | 4 | Per page (one flat) |
| N. Revisions | 1 | Flat |
| **Total** | **46** | |

---

## 5. Build prompt addendum

### 5.1 Catalog UI changes

On `/catalog/services/new` and `/catalog/services/[id]`:
- **Pricing model selector**: radio with 5 options: Flat / Per Page / Per 100 Words / Per Design / Per Episode.
- **Credits per unit**: int input with label that updates based on pricing model (e.g., "Credits per page" or "Credits per 100 words").
- **Volume tier (optional)**: toggle. When on, reveals two fields: "Tier threshold (units)" and "Credits per unit beyond threshold". Used for graduated pricing like Pitch Deck's 8/page → 6/page over 8.
- **Live preview**: shows pricing examples for typical sizes. For per-page services: "5 pages = X, 10 pages = Y, 20 pages = Z". For per-word: "500 words = X, 1500 words = Y, 5000 words = Z".

### 5.2 Task creation UX

On `/ops/engagements/[id]/tasks/new`:
- After service selection, if pricing_model is per-unit:
  - Show a quantity input with the unit label (e.g., "Pages: ___" or "Words: ___").
  - Live-compute and display the credit cost: "Credit cost: 88 credits (12 pages × 8 first 8, 6 thereafter)"
- For flat services, no quantity input. Just show the flat cost.
- Wallet check banner updates as quantity changes.

### 5.3 Client portal display

On `/ops/client/[slug]` task cards:
- Show quantity and per-unit calculation explicitly: "Pitch Deck — 12 pages — 88 credits".
- This builds trust. The client sees exactly why the cost is what it is.

### 5.4 Replace seed services

In the build prompt's Section 3.4, replace the entire `INSERT INTO services` block with seed reflecting all 46 services in Section 3 above, with full SOP fields.

### 5.5 Settings page changes

Remove `markup_multiplier` from settings (no longer needed since pricing is set by judgment, not formula). Keep `credit_value` (₹500 per credit) for reference and admin-side cost computation. Keep `base_hourly_rate` for internal cost reports only.

---

## 6. Pricing examples in practice

### 6.1 Standard Growth-tier client month

| Task | Quantity | Cost |
|---|---|---|
| Pitch Deck refresh | 12 pages | 88 |
| Long-form article | 1500 words | 60 |
| Social posts | 6 × 6 credits | 36 |
| Carousel | 8 slides × 2 | 16 |
| Email campaign | 1 | 8 |
| Print Design (banner) | 1 new + 1 variation | 30 |
| Photography (half-day) | 1 | 25 |
| Blog graphic | 6 × 6 | 36 |
| **Total** | | **299 credits** |

About a month of typical Growth-tier (₹7.5L / 900 flex/quarter = 300/month).

### 6.2 Heavy Capital Markets month (Scale tier)

| Task | Quantity | Cost |
|---|---|---|
| Annual Report design | 64 pages | 384 |
| Equity Story Document | 18 pages | 144 |
| Investor update letter | 600 words | 24 |
| Spokesperson Prep | 1 session | 100 |
| **Total** | | **652 credits** |

### 6.3 Manufacturing trade show month

| Task | Quantity | Cost |
|---|---|---|
| Trade Show Banner (Print Design) | 1 new | 20 |
| Trade Show Brochure | 8 pages | 64 |
| Business Cards (Print Design) | 1 new + 2 variations | 40 |
| Capability Deck | 12 pages | 88 |
| One-pager | 2 pages | 12 |
| Photography (half-day, on-site) | 1 | 25 |
| Email campaign | 1 | 8 |
| **Total** | | **257 credits** |

---

## 7. What's deliberately NOT in the catalog

Items I had in v1, now removed or absorbed:

- **Naming Sprint** — too rare, quote bespoke as a custom task.
- **Founder LinkedIn ghost-writing** — covered by C1 (per 100 words).
- **Sales Playbook** — covered by F4 (whitepaper) since it's a designed long-form doc.
- **Battle Cards** — covered by F3 (sales sheet).
- **Tender / RFP Response** — too bespoke, custom one-off.
- **ICP & Buyer Persona** — falls under I1 (Brand Strategy) at smaller scope, or quote as one-off.
- **Distributor Onboarding Pack** — bundle of F2 + F4 + G1, quote as separate tasks.
- **Microsite** — use B1 for each page, plus B3 for tweaks.
- **Community Engagement Sprint** — out of scope. Concierge work, not a productized service.

If a service is missing and a client asks, the manager creates a custom task with manual credit override (audit-logged) at the moment of quoting. The catalog stays clean.

---

## 8. Operating principles

1. **Set prices by judgment, not formula.** The role multiplier × markup math was over-engineered. Look at market rates. Look at internal margin. Set the per-unit credit cost. Refine quarterly using efficiency report data.

2. **Self-scaling beats variants.** Never create "Pitch Deck Small" and "Pitch Deck Large." Use per-page or per-word. The catalog stays small. The client experience stays consistent.

3. **Bundle logically, separate strategically.** Print Media is one service with 17 deliverable types. But Pitch Deck is separate from Brochure even though both are per-page, because the SOP, audience, and quality bar differ.

4. **Custom one-off tasks are fine.** Not every job fits a catalog row. The override mechanism exists for exactly this. Use it without guilt; just audit-log the reason.

5. **The catalog is a living document.** Quarterly review: which services are over-quoted vs underquoted? Where does avg actual hours diverge from internal_avg_hours? Adjust prices, adjust internal estimates, archive unused services.

---

End of v2 catalog spec. Ship clean.
