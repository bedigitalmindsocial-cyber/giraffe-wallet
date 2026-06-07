-- Migration 0005 — Services table v2 schema
-- Adds per-unit pricing fields, audience/lifecycle tags, and scope metadata.
-- Drops legacy avg_hours / credit_cost / included_revisions columns.
-- method_tag was already added in 0002 — do NOT re-add it here.

-- ── 1. Add new columns to services ────────────────────────────────────────────

alter table services
  add column if not exists pricing_model text not null default 'flat'
    check (pricing_model in ('flat','per_page','per_100_words','per_design','per_episode'));

alter table services
  add column if not exists credits_per_unit decimal(8,2) not null default 0;

alter table services
  add column if not exists unit_label text not null default 'unit';

alter table services
  add column if not exists min_units int not null default 1;

alter table services
  add column if not exists tier_threshold int;

alter table services
  add column if not exists tier_credits_per_unit decimal(8,2);

alter table services
  add column if not exists included_revisions_per_unit decimal(4,2) default 0.5;

alter table services
  add column if not exists late_revision_credits int default 4;

alter table services
  add column if not exists internal_avg_hours decimal(5,2);

alter table services
  add column if not exists scope_inclusions text;

alter table services
  add column if not exists scope_exclusions text;

alter table services
  add column if not exists client_inputs_required text;

alter table services
  add column if not exists deliverable_format text;

alter table services
  add column if not exists turnaround_days int default 5;

alter table services
  add column if not exists quality_bar text;

alter table services
  add column if not exists lifecycle_tag text
    check (lifecycle_tag in ('NEW','POPULAR','PROMO','LIMITED','DISCONTINUED') or lifecycle_tag is null);

alter table services
  add column if not exists audience_tag text not null default 'CROSS'
    check (audience_tag in ('MFG','CAPITAL','EXPORT','TALENT','CROSS'));

-- ── 2. Back-fill credits_per_unit from legacy credit_cost ─────────────────────

update services
  set credits_per_unit = credit_cost
  where credits_per_unit = 0;

-- ── 3. Add quantity to tasks ───────────────────────────────────────────────────

alter table tasks
  add column if not exists quantity int not null default 1;

-- ── 4. Drop legacy columns from services ──────────────────────────────────────
-- credits_per_unit is now populated, so dropping credit_cost is safe.

alter table services drop column if exists avg_hours;
alter table services drop column if exists credit_cost;
alter table services drop column if exists credit_cost_override;
alter table services drop column if exists credit_cost_override_reason;
alter table services drop column if exists included_revisions;
