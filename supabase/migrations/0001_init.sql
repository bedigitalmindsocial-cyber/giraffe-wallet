-- Giraffe Wallet — initial schema
-- Run this in the Supabase SQL editor of a fresh project.
-- Source of truth: src/types/index.ts and src/lib/data/mock.ts (DataStore impl).

create extension if not exists "pgcrypto";

-- ── Roles ──────────────────────────────────────────────────────────────
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  multiplier numeric(4,2) not null check (multiplier > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Settings (single row) ──────────────────────────────────────────────
-- We pin the row to a known UUID so application code can always upsert it.
create table if not exists settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  base_hourly_rate numeric(10,2) not null default 125 check (base_hourly_rate > 0),
  markup_multiplier numeric(4,2) not null default 2.5 check (markup_multiplier >= 1),
  credit_value numeric(10,2) not null default 500 check (credit_value > 0),
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = '00000000-0000-0000-0000-000000000001')
);

-- ── Services ───────────────────────────────────────────────────────────
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  category text not null,
  default_role_id uuid not null references roles(id) on delete restrict,
  avg_hours numeric(5,2) not null check (avg_hours > 0),
  included_revisions int not null default 2 check (included_revisions >= 0),
  tag text check (tag in ('NEW','POPULAR','PROMO','DISCONTINUED')),
  method_tag text check (method_tag in ('AI POWERED','HYBRID','ARTISAN')),
  credit_cost int not null check (credit_cost > 0),
  credit_cost_override boolean not null default false,
  credit_cost_override_reason text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint override_needs_reason check (credit_cost_override = false or credit_cost_override_reason is not null)
);

-- ── Packages ───────────────────────────────────────────────────────────
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  quarterly_fee_inr int not null check (quarterly_fee_inr > 0),
  total_credits int not null check (total_credits > 0),
  core_credits int not null check (core_credits >= 0),
  flex_credits int not null check (flex_credits >= 0),
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  constraint flex_equals_total_minus_core check (flex_credits = total_credits - core_credits)
);

-- ── Users (1:1 with auth.users) ────────────────────────────────────────
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text not null check (role in ('super_admin','manager','executor')),
  is_active boolean not null default true,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

-- ── Clients ────────────────────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  contact_person text,
  contact_email text,
  contact_phone text,
  sector text,
  city text,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Engagements ────────────────────────────────────────────────────────
create table if not exists engagements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  slug text unique not null,
  package_id uuid not null references packages(id),
  start_date date not null,
  end_date date not null,
  passcode text not null check (passcode ~ '^[0-9]{4}$'),
  total_credits int not null,
  core_credits_total int not null,
  flex_credits_total int not null,
  brand_manager_id uuid references users(id),
  status text not null default 'active' check (status in ('active','paused','expired','cancelled')),
  paused_at timestamptz,
  paused_reason text,
  pause_days_consumed int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists engagements_client_idx on engagements(client_id);
create index if not exists engagements_slug_idx on engagements(slug);
create index if not exists engagements_status_idx on engagements(status);

-- ── Tasks ──────────────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  title text not null,
  brief text,
  status text not null check (status in ('quoted','approved','in_progress','submitted','revision','done','cancelled')),
  bucket text not null check (bucket in ('core','flex')),
  credit_cost_locked int not null check (credit_cost_locked > 0),
  executor_role_id uuid not null references roles(id) on delete restrict,
  assigned_to uuid references users(id),
  estimated_hours numeric(5,2) not null,
  actual_hours numeric(5,2) not null default 0,
  revision_count int not null default 0,
  revisions_included int not null default 2,
  is_system_generated boolean not null default false,
  approved_by_client boolean not null default false,
  approved_by_manager_on_behalf boolean not null default false,
  approval_reason text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  quoted_at timestamptz not null default now(),
  approved_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
);

create index if not exists tasks_engagement_idx on tasks(engagement_id);
create index if not exists tasks_status_idx on tasks(status);

-- ── Task hours log ─────────────────────────────────────────────────────
create table if not exists task_hours_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  role_id uuid not null references roles(id),
  hours numeric(5,2) not null check (hours > 0),
  logged_by uuid references users(id),
  logged_at timestamptz not null default now(),
  notes text
);

create index if not exists task_hours_log_task_idx on task_hours_log(task_id);

-- ── Audit log (append-only) ────────────────────────────────────────────
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_type text not null check (actor_type in ('super_admin','manager','executor','client','system')),
  actor_id uuid,
  actor_name text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_entity_idx on audit_log(entity_type, entity_id);
create index if not exists audit_actor_idx on audit_log(actor_type, actor_id);
create index if not exists audit_created_idx on audit_log(created_at desc);

-- ── Engagement balances view (single source of truth for wallet) ──────
create or replace view engagement_balances as
select
  e.id as engagement_id,
  e.core_credits_total,
  coalesce(sum(case when t.bucket='core' and t.status in ('approved','in_progress','submitted','revision','done') then t.credit_cost_locked else 0 end), 0) as core_credits_used,
  e.core_credits_total - coalesce(sum(case when t.bucket='core' and t.status in ('approved','in_progress','submitted','revision','done') then t.credit_cost_locked else 0 end), 0) as core_credits_remaining,
  e.flex_credits_total,
  coalesce(sum(case when t.bucket='flex' and t.status in ('approved','in_progress','submitted','revision','done') then t.credit_cost_locked else 0 end), 0) as flex_credits_used,
  e.flex_credits_total - coalesce(sum(case when t.bucket='flex' and t.status in ('approved','in_progress','submitted','revision','done') then t.credit_cost_locked else 0 end), 0) as flex_credits_remaining
from engagements e
left join tasks t on t.engagement_id = e.id
group by e.id;

-- ── Auto-expire engagements function ──────────────────────────────────
create or replace function sweep_expired_engagements() returns void as $$
begin
  update engagements
     set status = 'expired', updated_at = now()
   where status = 'active' and end_date < current_date;
end;
$$ language plpgsql;

-- ── Settings recalc function ──────────────────────────────────────────
-- Recompute credit_cost for all non-overridden services using current settings.
create or replace function recalc_service_credit_costs() returns void as $$
declare
  s record;
  cfg record;
  r record;
  new_cost int;
begin
  select * into cfg from settings limit 1;
  for s in select id, default_role_id, avg_hours, credit_cost from services where credit_cost_override = false loop
    select multiplier into r from roles where id = s.default_role_id;
    new_cost := greatest(1, ceil((s.avg_hours * r.multiplier * cfg.base_hourly_rate * cfg.markup_multiplier) / cfg.credit_value));
    if new_cost <> s.credit_cost then
      update services set credit_cost = new_cost, updated_at = now() where id = s.id;
    end if;
  end loop;
end;
$$ language plpgsql;

-- ── Row-Level Security ────────────────────────────────────────────────
-- Service-role API routes bypass RLS, so this section guards client and
-- end-user reads. The Postgres session var "request.engagement_id" is set by
-- the API route wrapper after a passcode login.
alter table engagements enable row level security;
alter table tasks enable row level security;
alter table audit_log enable row level security;

-- Helper: which engagement is the current client request scoped to?
create or replace function current_engagement_id() returns uuid as $$
declare v text;
begin
  v := current_setting('request.engagement_id', true);
  if v is null or v = '' then return null; end if;
  return v::uuid;
exception when others then return null;
end;
$$ language plpgsql stable;

-- Clients can read only their own engagement and its tasks/audit.
drop policy if exists engagements_client_select on engagements;
create policy engagements_client_select on engagements for select
  using (id = current_engagement_id());

drop policy if exists tasks_client_select on tasks;
create policy tasks_client_select on tasks for select
  using (engagement_id = current_engagement_id());

drop policy if exists audit_client_select on audit_log;
create policy audit_client_select on audit_log for select
  using (
    entity_type in ('engagement','task')
    and (
      (entity_type = 'engagement' and entity_id = current_engagement_id())
      or (entity_type = 'task' and entity_id in (select id from tasks where engagement_id = current_engagement_id()))
    )
  );

-- ── Seed data ─────────────────────────────────────────────────────────
insert into roles (name, multiplier) values
  ('Executive', 1.0),
  ('Manager', 2.0),
  ('Senior Manager', 3.0),
  ('Senior Partner', 5.0)
on conflict (name) do nothing;

insert into settings (id, base_hourly_rate, markup_multiplier, credit_value)
values ('00000000-0000-0000-0000-000000000001', 125, 2.5, 500)
on conflict (id) do nothing;

insert into packages (name, quarterly_fee_inr, total_credits, core_credits, flex_credits, sort_order)
values
  ('Starter', 450000, 900, 600, 300, 1),
  ('Growth', 750000, 1500, 600, 900, 2),
  ('Scale', 1200000, 2400, 600, 1800, 3)
on conflict (name) do nothing;

-- Seed services. Cost is auto-calculated via the same formula used in app code.
insert into services (name, description, category, default_role_id, avg_hours, credit_cost, tag, method_tag, sort_order)
select
  d.name, d.description, d.category, r.id, d.avg_hours,
  greatest(1, ceil((d.avg_hours * r.multiplier * 125 * 2.5) / 500))::int as credit_cost,
  d.tag, d.method_tag, d.sort_order
from (
  values
    ('Social post (single)', 'One static post with caption, hashtags, and platform sizing.', 'Social', 'Executive', 1.5, 'POPULAR', 'AI POWERED', 1),
    ('Social carousel (5 slides)', 'Multi-slide post with copy and design.', 'Social', 'Executive', 4.0, null, 'HYBRID', 2),
    ('Blog graphic', 'Header graphic for an article. Two revisions included.', 'Design', 'Executive', 3.0, null, 'HYBRID', 3),
    ('Web page (single)', 'One landing page or content page, copy plus design.', 'Design', 'Manager', 8.0, null, 'HYBRID', 4),
    ('Long-form article', '1200 to 1500 word article with research and edit pass.', 'Content', 'Manager', 8.0, null, 'HYBRID', 5),
    ('Whitepaper or case study', 'Long-form research piece with structure and design.', 'Content', 'Senior Manager', 16.0, null, 'ARTISAN', 6),
    ('Pitch deck', '12 to 15 slide deck with structure, copy, and design.', 'Sales Enablement', 'Senior Manager', 12.0, null, 'ARTISAN', 7),
    ('Brand strategy doc', 'Positioning, messaging architecture, brand voice.', 'Strategy', 'Senior Partner', 15.0, 'NEW', 'ARTISAN', 8),
    ('Press article', 'PR-ready article for placement, including pitch note.', 'PR', 'Manager', 6.0, null, 'ARTISAN', 9),
    ('Email campaign', 'One email with copy, design, and segmentation note.', 'Email', 'Executive', 3.0, null, 'AI POWERED', 10),
    ('Video ad (15s to 30s)', 'Script, edit, and one revision.', 'Video', 'Manager', 12.0, null, 'HYBRID', 11),
    ('Photography (half day)', 'On-site product or environment shoot.', 'Production', 'Manager', 5.0, null, 'ARTISAN', 12),
    ('Infographic', 'Single static infographic with research and design.', 'Design', 'Executive', 4.0, null, 'HYBRID', 13),
    ('SEO audit', 'Technical and content audit with prioritized action list.', 'SEO', 'Manager', 6.0, null, 'HYBRID', 14),
    ('Strategy: Quarterly Plan (system task)', 'Quarterly roadmap and monthly review.', 'Strategy (Core)', 'Manager', 16.0, null, 'ARTISAN', 15),
    ('Website Maintenance (system task)', 'Uptime, backups, security patches, performance.', 'Tech (Core)', 'Manager', 10.0, null, 'AI POWERED', 16),
    ('Monthly Content System (system task)', 'One pillar piece plus derivative posts and emails for the month.', 'Content (Core)', 'Manager', 14.0, null, 'HYBRID', 17)
) as d(name, description, category, role_name, avg_hours, tag, method_tag, sort_order)
join roles r on r.name = d.role_name
on conflict (name) do nothing;

-- The first super_admin user is created manually after Supabase auth signup.
-- See SETUP.md.
