/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import type { DataStore } from "./store";
import type {
  Actor, AuditEntry, AuditFilters, Client, ClientInput,
  Engagement, EngagementBalance, EngagementFilters,
  EngagementInput, EngagementSummary, HoursEntry, Package, PackageInput,
  ReportFilters, Role, RoleInput, Service, ServiceFilters, ServiceInput,
  SettingsInput, Task, TaskFilters, TaskInput, User,
} from "@/types";
import { computeCreditCost } from "@/lib/credits";
import { engagementSlug, fourDigitPasscode, slugify } from "@/lib/slug";
import { addDays, daysBetween, todayIso, timestamp } from "@/lib/utils";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_SETTINGS = {
  baseHourlyRate: 125,
  markupMultiplier: 2.5,
  creditValue: 500,
};

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Row → Domain mappers ────────────────────────────────────────────────────

function toRole(r: any): Role {
  return {
    id: r.id, name: r.name, multiplier: Number(r.multiplier),
    notes: r.notes ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function toService(r: any): Service {
  return {
    id: r.id, name: r.name, description: r.description ?? undefined,
    category: r.category, defaultRoleId: r.default_role_id,
    pricingModel: r.pricing_model ?? 'flat',
    creditsPerUnit: Number(r.credits_per_unit ?? 0),
    unitLabel: r.unit_label ?? 'unit',
    minUnits: r.min_units ?? 1,
    tierThreshold: r.tier_threshold ?? undefined,
    tierCreditsPerUnit: r.tier_credits_per_unit ? Number(r.tier_credits_per_unit) : undefined,
    includedRevisionsPerUnit: Number(r.included_revisions_per_unit ?? 0.5),
    lateRevisionCredits: r.late_revision_credits ?? 4,
    internalAvgHours: r.internal_avg_hours ? Number(r.internal_avg_hours) : undefined,
    scopeInclusions: r.scope_inclusions ?? undefined,
    scopeExclusions: r.scope_exclusions ?? undefined,
    clientInputsRequired: r.client_inputs_required ?? undefined,
    deliverableFormat: r.deliverable_format ?? undefined,
    turnaroundDays: r.turnaround_days ?? 5,
    qualityBar: r.quality_bar ?? undefined,
    lifecycleTag: r.lifecycle_tag ?? null,
    methodTag: r.method_tag ?? 'HYBRID',
    audienceTag: r.audience_tag ?? 'CROSS',
    isActive: r.is_active, sortOrder: r.sort_order,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function toPackage(r: any): Package {
  return {
    id: r.id, name: r.name, quarterlyFeeInr: r.quarterly_fee_inr,
    totalCredits: r.total_credits, coreCredits: r.core_credits,
    flexCredits: r.flex_credits, description: r.description ?? undefined,
    isActive: r.is_active, sortOrder: r.sort_order,
  };
}

function toUser(r: any): User {
  return {
    id: r.id, email: r.email, name: r.name ?? undefined, role: r.role,
    isActive: r.is_active, whatsappNumber: r.whatsapp_number ?? undefined,
    createdAt: r.created_at,
  };
}

function toClient(r: any): Client {
  return {
    id: r.id, name: r.name, slug: r.slug,
    contactPerson: r.contact_person ?? undefined,
    contactEmail: r.contact_email ?? undefined,
    contactPhone: r.contact_phone ?? undefined,
    sector: r.sector ?? undefined, city: r.city ?? undefined,
    notes: r.notes ?? undefined, createdBy: r.created_by ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function toEngagement(r: any): Engagement {
  return {
    id: r.id, clientId: r.client_id, slug: r.slug, packageId: r.package_id,
    startDate: r.start_date, endDate: r.end_date, passcode: r.passcode,
    totalCredits: r.total_credits, coreCreditsTotal: r.core_credits_total,
    flexCreditsTotal: r.flex_credits_total,
    brandManagerId: r.brand_manager_id ?? undefined,
    status: r.status, pausedAt: r.paused_at ?? undefined,
    pausedReason: r.paused_reason ?? undefined,
    pauseDaysConsumed: r.pause_days_consumed,
    notes: r.notes ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function toTask(r: any, hoursLog: HoursEntry[] = []): Task {
  return {
    id: r.id, engagementId: r.engagement_id, serviceId: r.service_id,
    title: r.title, brief: r.brief ?? undefined, status: r.status,
    bucket: r.bucket, creditCostLocked: r.credit_cost_locked,
    executorRoleId: r.executor_role_id, assignedTo: r.assigned_to ?? undefined,
    estimatedHours: Number(r.estimated_hours), actualHours: Number(r.actual_hours),
    revisionCount: r.revision_count, revisionsIncluded: r.revisions_included,
    quantity: r.quantity ?? 1,
    isSystemGenerated: r.is_system_generated,
    approvedByClient: r.approved_by_client,
    approvedByManagerOnBehalf: r.approved_by_manager_on_behalf,
    approvalReason: r.approval_reason ?? undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at, quotedAt: r.quoted_at,
    approvedAt: r.approved_at ?? undefined, startedAt: r.started_at ?? undefined,
    submittedAt: r.submitted_at ?? undefined, completedAt: r.completed_at ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    cancellationReason: r.cancellation_reason ?? undefined,
    hoursLog,
  };
}

function toHoursEntry(r: any): HoursEntry {
  return {
    id: r.id, taskId: r.task_id, roleId: r.role_id, hours: Number(r.hours),
    loggedBy: r.logged_by, loggedAt: r.logged_at, notes: r.notes ?? undefined,
  };
}

function toAudit(r: any): AuditEntry {
  return {
    id: r.id, entityType: r.entity_type, entityId: r.entity_id,
    action: r.action, actorType: r.actor_type, actorId: r.actor_id,
    actorName: r.actor_name, payload: r.payload ?? undefined, createdAt: r.created_at,
  };
}

function toBalance(r: any, engagementId: string): EngagementBalance {
  return {
    engagementId,
    coreCreditsTotal: r?.core_credits_total ?? 0,
    coreCreditsUsed: r?.core_credits_used ?? 0,
    coreCreditsRemaining: r?.core_credits_remaining ?? 0,
    flexCreditsTotal: r?.flex_credits_total ?? 0,
    flexCreditsUsed: r?.flex_credits_used ?? 0,
    flexCreditsRemaining: r?.flex_credits_remaining ?? 0,
  };
}

// ── Store implementation ────────────────────────────────────────────────────

export const supabaseStore: DataStore = {

  // ── Roles ─────────────────────────────────────────────────────────────────
  async getRoles() {
    const { data, error } = await sb().from("roles").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map(toRole);
  },

  async upsertRole(role: RoleInput, actor: Actor) {
    const client = sb();
    const row = { name: role.name, multiplier: role.multiplier, notes: role.notes ?? null, updated_at: timestamp() };
    let data: any;
    if (role.id) {
      const res = await client.from("roles").update(row).eq("id", role.id).select().single();
      if (res.error) throw res.error;
      data = res.data;
    } else {
      const res = await client.from("roles").insert(row).select().single();
      if (res.error) throw res.error;
      data = res.data;
    }
    await supabaseStore.appendAudit({ entityType: "role", entityId: data.id, action: role.id ? "role_updated" : "role_created", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { name: role.name } });
    return toRole(data);
  },

  async deleteRole(id: string) {
    const { error } = await sb().from("roles").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Services ──────────────────────────────────────────────────────────────
  async getServices(filters?: ServiceFilters) {
    let q = sb().from("services").select("*").order("sort_order");
    if (filters?.activeOnly) q = q.eq("is_active", true);
    if (filters?.search) q = q.ilike("name", `%${filters.search}%`);
    if (filters?.categories?.length) q = q.in("category", filters.categories);
    if (filters?.roleIds?.length) q = q.in("default_role_id", filters.roleIds);
    if (filters?.lifecycleTags?.length) q = q.in("lifecycle_tag", filters.lifecycleTags);
    if (filters?.methodTags?.length) q = q.in("method_tag", filters.methodTags);
    if (filters?.audienceTags?.length) q = q.in("audience_tag", filters.audienceTags);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toService);
  },

  async getService(id: string) {
    const { data, error } = await sb().from("services").select("*").eq("id", id).single();
    if (error) return null;
    return toService(data);
  },

  async upsertService(svc: ServiceInput, actor: Actor) {
    const client = sb();
    const row = {
      name: svc.name,
      description: svc.description ?? null,
      category: svc.category,
      default_role_id: svc.defaultRoleId,
      pricing_model: svc.pricingModel ?? 'flat',
      credits_per_unit: svc.creditsPerUnit ?? 0,
      unit_label: svc.unitLabel ?? 'unit',
      min_units: svc.minUnits ?? 1,
      tier_threshold: svc.tierThreshold ?? null,
      tier_credits_per_unit: svc.tierCreditsPerUnit ?? null,
      included_revisions_per_unit: svc.includedRevisionsPerUnit ?? 0.5,
      late_revision_credits: svc.lateRevisionCredits ?? 4,
      internal_avg_hours: svc.internalAvgHours ?? null,
      scope_inclusions: svc.scopeInclusions ?? null,
      scope_exclusions: svc.scopeExclusions ?? null,
      client_inputs_required: svc.clientInputsRequired ?? null,
      deliverable_format: svc.deliverableFormat ?? null,
      turnaround_days: svc.turnaroundDays ?? 5,
      quality_bar: svc.qualityBar ?? null,
      lifecycle_tag: svc.lifecycleTag ?? null,
      method_tag: svc.methodTag ?? 'HYBRID',
      audience_tag: svc.audienceTag ?? 'CROSS',
      is_active: svc.isActive ?? true,
      sort_order: svc.sortOrder ?? 0,
      updated_at: timestamp(),
    };
    let data: any;
    if (svc.id) {
      const res = await client.from("services").update(row).eq("id", svc.id).select().single();
      if (res.error) throw res.error;
      data = res.data;
    } else {
      const res = await client.from("services").insert(row).select().single();
      if (res.error) throw res.error;
      data = res.data;
    }
    await supabaseStore.appendAudit({ entityType: "service", entityId: data.id, action: svc.id ? "service_updated" : "service_created", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { name: svc.name } });
    return toService(data);
  },

  async archiveService(id: string, actor: Actor) {
    const { error } = await sb().from("services").update({ is_active: false, updated_at: timestamp() }).eq("id", id);
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "service", entityId: id, action: "service_archived", actorType: actor.type, actorId: actor.id, actorName: actor.name });
  },

  // ── Packages ──────────────────────────────────────────────────────────────
  async getPackages() {
    const { data, error } = await sb().from("packages").select("*").order("sort_order");
    if (error) throw error;
    return (data ?? []).map(toPackage);
  },

  async upsertPackage(pkg: PackageInput, actor: Actor) {
    const client = sb();
    const row = {
      name: pkg.name, quarterly_fee_inr: pkg.quarterlyFeeInr,
      total_credits: pkg.totalCredits, core_credits: pkg.coreCredits,
      flex_credits: pkg.totalCredits - pkg.coreCredits,
      description: pkg.description ?? null, is_active: pkg.isActive ?? true, sort_order: pkg.sortOrder ?? 0,
    };
    let data: any;
    if (pkg.id) {
      const res = await client.from("packages").update(row).eq("id", pkg.id).select().single();
      if (res.error) throw res.error;
      data = res.data;
    } else {
      const res = await client.from("packages").insert(row).select().single();
      if (res.error) throw res.error;
      data = res.data;
    }
    await supabaseStore.appendAudit({ entityType: "package", entityId: data.id, action: pkg.id ? "package_updated" : "package_created", actorType: actor.type, actorId: actor.id, actorName: actor.name });
    return toPackage(data);
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  async getSettings() {
    const { data } = await sb().from("settings").select("*").single();
    if (!data) return { ...DEFAULT_SETTINGS, updatedAt: timestamp() };
    return { baseHourlyRate: Number(data.base_hourly_rate), markupMultiplier: Number(data.markup_multiplier), creditValue: Number(data.credit_value), updatedAt: data.updated_at };
  },

  async previewSettings(_s: SettingsInput) {
    // v2 schema: service credit costs are explicit (credits_per_unit), not derived from settings.
    return [];
  },

  async updateSettings(s: SettingsInput, actor: Actor) {
    const client = sb();
    const { error } = await client.from("settings")
      .upsert({
        id: SETTINGS_ID,
        base_hourly_rate: s.baseHourlyRate,
        markup_multiplier: s.markupMultiplier,
        credit_value: s.creditValue,
        updated_at: timestamp(),
      }, { onConflict: "id" });
    if (error) throw error;
    const [settings, updatedServices] = await Promise.all([supabaseStore.getSettings(), supabaseStore.getServices()]);
    await supabaseStore.appendAudit({ entityType: "settings", entityId: SETTINGS_ID, action: "settings_updated", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: s as unknown as Record<string, unknown> });
    return { settings, updatedServices };
  },

  // ── Clients ───────────────────────────────────────────────────────────────
  async listClients(forUserId?: string) {
    const client = sb();
    let allowedClientIds: string[] | null = null;

    if (forUserId) {
      const { data: user } = await client.from("users").select("role").eq("id", forUserId).single();
      if (user?.role === "manager") {
        const { data: engagementRows, error: engagementError } = await client
          .from("engagements")
          .select("client_id")
          .eq("brand_manager_id", forUserId);
        if (engagementError) throw engagementError;
        allowedClientIds = [...new Set((engagementRows ?? []).map((row: any) => row.client_id))];
        if (allowedClientIds.length === 0) return [];
      }
    }

    let q = client.from("clients").select("*").order("name");
    if (allowedClientIds) q = q.in("id", allowedClientIds);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toClient);
  },

  async getClient(id: string) {
    const { data, error } = await sb().from("clients").select("*").eq("id", id).single();
    if (error) return null;
    return toClient(data);
  },

  async createClient(c: ClientInput, actor: Actor) {
    const client = sb();
    const { data, error } = await client.from("clients").insert({
      name: c.name, slug: slugify(c.name),
      contact_person: c.contactPerson ?? null, contact_email: c.contactEmail ?? null,
      contact_phone: c.contactPhone ?? null, sector: c.sector ?? null,
      city: c.city ?? null, notes: c.notes ?? null, created_by: actor.id,
    }).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "client", entityId: data.id, action: "client_created", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { name: c.name } });
    return toClient(data);
  },

  // ── Engagements ───────────────────────────────────────────────────────────
  async listEngagements(filters?: EngagementFilters, forUserId?: string) {
    const client = sb();
    let q = client.from("engagements").select("*").order("created_at", { ascending: false });
    if (forUserId) {
      const { data: user } = await client.from("users").select("role").eq("id", forUserId).single();
      if (user?.role === "manager") q = q.eq("brand_manager_id", forUserId);
    }
    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.brandManagerId) q = q.eq("brand_manager_id", filters.brandManagerId);
    if (filters?.packageId) q = q.eq("package_id", filters.packageId);
    const { data: engRows, error } = await q;
    if (error) throw error;
    const engs = (engRows ?? []).map(toEngagement);
    if (!engs.length) return [];

    const clientIds = [...new Set(engs.map(e => e.clientId))];
    const packageIds = [...new Set(engs.map(e => e.packageId))];
    const managerIds = [...new Set(engs.map(e => e.brandManagerId).filter(Boolean) as string[])];

    const [cRes, pRes, uRes, tRes, bRes] = await Promise.all([
      client.from("clients").select("*").in("id", clientIds),
      client.from("packages").select("*").in("id", packageIds),
      managerIds.length ? client.from("users").select("*").in("id", managerIds) : Promise.resolve({ data: [] }),
      client.from("tasks").select("*").in("engagement_id", engs.map(e => e.id)),
      client.from("engagement_balances").select("*").in("engagement_id", engs.map(e => e.id)),
    ]);

    const clientsMap = new Map((cRes.data ?? []).map(toClient).map(c => [c.id, c]));
    const pkgsMap = new Map((pRes.data ?? []).map(toPackage).map(p => [p.id, p]));
    const usersMap = new Map((uRes.data ?? []).map(toUser).map(u => [u.id, u]));
    const allTasks = (tRes.data ?? []).map((t: any) => toTask(t));
    const balancesMap = new Map((bRes.data ?? []).map((b: any) => [b.engagement_id, b]));

    const today = todayIso();
    const openStatuses = new Set(["quoted", "approved", "in_progress", "submitted", "revision"]);

    let summaries: EngagementSummary[] = engs.map(eng => {
      const tasks = allTasks.filter(t => t.engagementId === eng.id);
      const b = balancesMap.get(eng.id);
      return {
        engagement: eng,
        client: clientsMap.get(eng.clientId)!,
        brandManager: eng.brandManagerId ? usersMap.get(eng.brandManagerId) : undefined,
        package: pkgsMap.get(eng.packageId)!,
        balance: toBalance(b, eng.id),
        daysRemaining: Math.max(0, daysBetween(today, eng.endDate)),
        openTaskCount: tasks.filter(t => openStatuses.has(t.status)).length,
        lastActivityAt: tasks.length ? tasks.map(t => t.completedAt ?? t.submittedAt ?? t.startedAt ?? t.createdAt).sort().at(-1) : undefined,
      };
    }).filter(s => s.client && s.package);

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      summaries = summaries.filter(s => s.client.name.toLowerCase().includes(search) || s.engagement.slug.includes(search));
    }
    if (filters?.endingWithinDays != null) {
      summaries = summaries.filter(s => s.daysRemaining <= filters.endingWithinDays!);
    }
    return summaries;
  },

  async getEngagement(id: string) {
    const { data, error } = await sb().from("engagements").select("*").eq("id", id).single();
    if (error) return null;
    return toEngagement(data);
  },

  async getEngagementBySlug(slug: string) {
    const { data, error } = await sb().from("engagements").select("*").eq("slug", slug).single();
    if (error) return null;
    return toEngagement(data);
  },

  async getEngagementSummary(id: string) {
    const client = sb();
    const { data: engRow, error } = await client.from("engagements").select("*").eq("id", id).single();
    if (error || !engRow) return null;
    const eng = toEngagement(engRow);

    const [cRes, pRes, mRes, tRes, bRes] = await Promise.all([
      client.from("clients").select("*").eq("id", eng.clientId).single(),
      client.from("packages").select("*").eq("id", eng.packageId).single(),
      eng.brandManagerId ? client.from("users").select("*").eq("id", eng.brandManagerId).single() : Promise.resolve({ data: null }),
      client.from("tasks").select("*, task_hours_log(*)").eq("engagement_id", id),
      client.from("engagement_balances").select("*").eq("engagement_id", id).single(),
    ]);

    if (!cRes.data || !pRes.data) return null;
    const today = todayIso();
    const tasks = (tRes.data ?? []).map((t: any) => toTask(t, (t.task_hours_log ?? []).map(toHoursEntry)));
    const openStatuses = new Set(["quoted", "approved", "in_progress", "submitted", "revision"]);

    return {
      engagement: eng,
      client: toClient(cRes.data),
      brandManager: mRes.data ? toUser(mRes.data) : undefined,
      package: toPackage(pRes.data),
      balance: toBalance(bRes.data, id),
      daysRemaining: Math.max(0, daysBetween(today, eng.endDate)),
      openTaskCount: tasks.filter(t => openStatuses.has(t.status)).length,
      lastActivityAt: tasks.length ? tasks.map(t => t.completedAt ?? t.submittedAt ?? t.startedAt ?? t.createdAt).sort().at(-1) : undefined,
    };
  },

  async createEngagement(e: EngagementInput, actor: Actor) {
    const client = sb();
    const [pkgRes, clientRes] = await Promise.all([
      client.from("packages").select("*").eq("id", e.packageId).single(),
      client.from("clients").select("*").eq("id", e.clientId).single(),
    ]);
    if (pkgRes.error || !pkgRes.data) throw new Error("Package not found");
    if (clientRes.error || !clientRes.data) throw new Error("Client not found");

    const pkg = pkgRes.data;
    const clientSlug = slugify(clientRes.data.name);
    const slug = engagementSlug(clientSlug);
    const startDate = e.startDate;
    const endDate = e.endDate ?? addDays(startDate, 90);
    const passcode = fourDigitPasscode();

    const { data, error } = await client.from("engagements").insert({
      client_id: e.clientId, slug, package_id: e.packageId,
      start_date: startDate, end_date: endDate, passcode,
      total_credits: pkg.total_credits, core_credits_total: pkg.core_credits,
      flex_credits_total: pkg.flex_credits,
      brand_manager_id: e.brandManagerId ?? null,
      status: "active", pause_days_consumed: 0, notes: e.notes ?? null,
    }).select().single();
    if (error) throw error;
    const eng = toEngagement(data);

    // Create system tasks for core service categories
    const { data: coreSvcs } = await client.from("services").select("*")
      .in("category", ["Strategy (Core)", "Tech (Core)", "Content (Core)"])
      .eq("is_active", true);
    for (const svc of coreSvcs ?? []) {
      const mappedSvc = toService(svc);
      await client.from("tasks").insert({
        engagement_id: eng.id, service_id: svc.id, title: svc.name,
        status: "approved", bucket: "core",
        quantity: 1,
        credit_cost_locked: computeCreditCost(mappedSvc, 1),
        executor_role_id: svc.default_role_id, estimated_hours: svc.internal_avg_hours ?? null,
        actual_hours: 0, revision_count: 0, revisions_included: svc.included_revisions_per_unit ?? 0.5,
        is_system_generated: true, approved_by_client: false,
        approved_by_manager_on_behalf: true, approval_reason: "System generated",
        created_by: actor.id,
      });
    }

    await supabaseStore.appendAudit({ entityType: "engagement", entityId: eng.id, action: "engagement_created", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { slug, packageId: e.packageId } });
    return eng;
  },

  async pauseEngagement(id: string, reason: string, actor: Actor) {
    const { error } = await sb().from("engagements").update({ status: "paused", paused_at: timestamp(), paused_reason: reason, updated_at: timestamp() }).eq("id", id);
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "engagement", entityId: id, action: "engagement_paused", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { reason } });
  },

  async resumeEngagement(id: string, actor: Actor) {
    const eng = await supabaseStore.getEngagement(id);
    if (!eng) throw new Error("Engagement not found");
    const daysPaused = eng.pausedAt ? Math.max(0, daysBetween(eng.pausedAt.split("T")[0], todayIso())) : 0;
    const { error } = await sb().from("engagements").update({ status: "active", paused_at: null, paused_reason: null, pause_days_consumed: eng.pauseDaysConsumed + daysPaused, updated_at: timestamp() }).eq("id", id);
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "engagement", entityId: id, action: "engagement_resumed", actorType: actor.type, actorId: actor.id, actorName: actor.name });
  },

  async upgradeEngagement(id: string, newPackageId: string, actor: Actor) {
    const { data: pkg, error: pkgErr } = await sb().from("packages").select("*").eq("id", newPackageId).single();
    if (pkgErr || !pkg) throw new Error("Package not found");
    const { error } = await sb().from("engagements").update({ package_id: newPackageId, total_credits: pkg.total_credits, core_credits_total: pkg.core_credits, flex_credits_total: pkg.flex_credits, updated_at: timestamp() }).eq("id", id);
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "engagement", entityId: id, action: "engagement_upgraded", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { newPackageId } });
  },

  async reassignBrandManager(id: string, newUserId: string, actor: Actor) {
    const { error } = await sb().from("engagements").update({ brand_manager_id: newUserId, updated_at: timestamp() }).eq("id", id);
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "engagement", entityId: id, action: "brand_manager_reassigned", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { newUserId } });
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async listTasks(engagementId: string, filters?: TaskFilters) {
    let q = sb().from("tasks").select("*, task_hours_log(*)").eq("engagement_id", engagementId).order("created_at");
    if (filters?.status?.length) q = q.in("status", filters.status);
    if (filters?.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
    if (filters?.bucket) q = q.eq("bucket", filters.bucket);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((t: any) => toTask(t, (t.task_hours_log ?? []).map(toHoursEntry)));
  },

  async getTask(id: string) {
    const { data, error } = await sb().from("tasks").select("*, task_hours_log(*)").eq("id", id).single();
    if (error) return null;
    return toTask(data, (data.task_hours_log ?? []).map(toHoursEntry));
  },

  async createTask(t: TaskInput, actor: Actor) {
    const { data: svc, error: svcErr } = await sb().from("services").select("*").eq("id", t.serviceId).single();
    if (svcErr || !svc) throw new Error("Service not found");
    const quantity = t.quantity ?? 1;
    const { data, error } = await sb().from("tasks").insert({
      engagement_id: t.engagementId, service_id: t.serviceId,
      title: t.title, brief: t.brief ?? null, status: "quoted",
      bucket: t.bucket,
      quantity,
      credit_cost_locked: computeCreditCost(toService(svc), quantity),
      executor_role_id: svc.default_role_id, estimated_hours: svc.internal_avg_hours ?? null,
      actual_hours: 0, revision_count: 0, revisions_included: svc.included_revisions_per_unit ?? 0.5,
      is_system_generated: false, approved_by_client: false,
      approved_by_manager_on_behalf: false, created_by: actor.id,
    }).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "task", entityId: data.id, action: "task_created", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { title: t.title, bucket: t.bucket } });
    return toTask(data);
  },

  async approveTask(id: string, actor: Actor, byClient: boolean, reason?: string) {
    const { data, error } = await sb().from("tasks").update({ status: "approved", approved_by_client: byClient, approved_by_manager_on_behalf: !byClient, approval_reason: reason ?? null, approved_at: timestamp() }).eq("id", id).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "task", entityId: id, action: "task_approved", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { byClient } });
    return toTask(data);
  },

  async assignTask(id: string, userId: string, actor: Actor) {
    const { data, error } = await sb().from("tasks").update({ assigned_to: userId }).eq("id", id).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "task", entityId: id, action: "task_assigned", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { userId } });
    return toTask(data);
  },

  async startTask(id: string, actor: Actor) {
    const { data, error } = await sb().from("tasks").update({ status: "in_progress", started_at: timestamp() }).eq("id", id).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "task", entityId: id, action: "task_started", actorType: actor.type, actorId: actor.id, actorName: actor.name });
    return toTask(data);
  },

  async submitTask(id: string, hoursLog: Omit<HoursEntry, "id" | "taskId" | "loggedAt">[], actor: Actor) {
    const client = sb();
    const totalHours = hoursLog.reduce((s, e) => s + e.hours, 0);
    const { data, error } = await client.from("tasks").update({ status: "submitted", actual_hours: totalHours, submitted_at: timestamp() }).eq("id", id).select().single();
    if (error) throw error;
    for (const entry of hoursLog) {
      await client.from("task_hours_log").insert({ task_id: id, role_id: entry.roleId, hours: entry.hours, logged_by: entry.loggedBy, notes: entry.notes ?? null });
    }
    await supabaseStore.appendAudit({ entityType: "task", entityId: id, action: "task_submitted", actorType: actor.type, actorId: actor.id, actorName: actor.name });
    return toTask(data);
  },

  async requestRevision(id: string, note: string, actor: Actor) {
    const task = await supabaseStore.getTask(id);
    if (!task) throw new Error("Task not found");
    const { data, error } = await sb().from("tasks").update({ status: "revision", revision_count: task.revisionCount + 1 }).eq("id", id).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "task", entityId: id, action: "revision_requested", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { note } });
    return toTask(data);
  },

  async completeTask(id: string, actor: Actor) {
    const { data, error } = await sb().from("tasks").update({ status: "done", completed_at: timestamp() }).eq("id", id).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "task", entityId: id, action: "task_completed", actorType: actor.type, actorId: actor.id, actorName: actor.name });
    return toTask(data);
  },

  async cancelTask(id: string, reason: string, actor: Actor) {
    const { data, error } = await sb().from("tasks").update({ status: "cancelled", cancelled_at: timestamp(), cancellation_reason: reason }).eq("id", id).select().single();
    if (error) throw error;
    await supabaseStore.appendAudit({ entityType: "task", entityId: id, action: "task_cancelled", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { reason } });
    return toTask(data);
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  async verifyEngagementPasscode(slug: string, passcode: string) {
    const { data } = await sb().from("engagements").select("id").eq("slug", slug).eq("passcode", passcode).single();
    return !!data;
  },

  async getUserById(id: string) {
    const { data, error } = await sb().from("users").select("*").eq("id", id).single();
    if (error) return null;
    return toUser(data);
  },

  async getUserByEmail(email: string) {
    const { data, error } = await sb().from("users").select("*").eq("email", email).eq("is_active", true).single();
    if (error) return null;
    return toUser(data);
  },

  async listStaff(role?: User["role"]) {
    let q = sb().from("users").select("*").order("name");
    if (role) q = q.eq("role", role);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toUser);
  },

  // ── Audit ─────────────────────────────────────────────────────────────────
  async appendAudit(entry: Omit<AuditEntry, "id" | "createdAt">) {
    await sb().from("audit_log").insert({
      entity_type: entry.entityType, entity_id: entry.entityId,
      action: entry.action, actor_type: entry.actorType,
      actor_id: entry.actorId, actor_name: entry.actorName,
      payload: entry.payload ?? null,
    });
  },

  async listAudit(filters: AuditFilters) {
    let q = sb().from("audit_log").select("*").order("created_at", { ascending: false });
    if (filters.entityType) q = q.eq("entity_type", filters.entityType);
    if (filters.entityId) q = q.eq("entity_id", filters.entityId);
    if (filters.actorType) q = q.eq("actor_type", filters.actorType);
    if (filters.action) q = q.eq("action", filters.action);
    if (filters.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(toAudit);
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  async efficiencyReport(filters: ReportFilters) {
    const client = sb();
    let q = client.from("tasks").select("*, task_hours_log(*)").eq("status", "done");
    if (filters.fromDate) q = q.gte("completed_at", filters.fromDate);
    if (filters.toDate) q = q.lte("completed_at", filters.toDate);
    if (filters.serviceId) q = q.eq("service_id", filters.serviceId);
    if (filters.executorId) q = q.eq("assigned_to", filters.executorId);

    const { data: taskRows, error } = await q;
    if (error) throw error;

    let scope = (taskRows ?? []).map((row: any) => toTask(row, (row.task_hours_log ?? []).map(toHoursEntry)));
    if (!scope.length) return { serviceVariance: [], executors: [], managers: [] };

    const engagementIds = [...new Set(scope.map((task) => task.engagementId))];
    const [engRes, svcRes, roleRes, userRes, settings] = await Promise.all([
      client.from("engagements").select("*").in("id", engagementIds),
      client.from("services").select("*"),
      client.from("roles").select("*"),
      client.from("users").select("*"),
      supabaseStore.getSettings(),
    ]);
    if (engRes.error) throw engRes.error;
    if (svcRes.error) throw svcRes.error;
    if (roleRes.error) throw roleRes.error;
    if (userRes.error) throw userRes.error;

    const engagements = (engRes.data ?? []).map(toEngagement);
    const services = (svcRes.data ?? []).map(toService);
    const roles = (roleRes.data ?? []).map(toRole);
    const users = (userRes.data ?? []).map(toUser);

    if (filters.clientId) {
      const allowedEngagementIds = new Set(engagements.filter((eng) => eng.clientId === filters.clientId).map((eng) => eng.id));
      scope = scope.filter((task) => allowedEngagementIds.has(task.engagementId));
    }
    if (filters.brandManagerId) {
      const allowedEngagementIds = new Set(engagements.filter((eng) => eng.brandManagerId === filters.brandManagerId).map((eng) => eng.id));
      scope = scope.filter((task) => allowedEngagementIds.has(task.engagementId));
    }

    const byService = new Map<string, Task[]>();
    for (const task of scope) byService.set(task.serviceId, [...(byService.get(task.serviceId) ?? []), task]);
    const serviceVariance = [...byService.entries()].map(([serviceId, serviceTasks]) => {
      const avgEstimatedHours = serviceTasks.reduce((sum, task) => sum + task.estimatedHours, 0) / serviceTasks.length;
      const avgActualHours = serviceTasks.reduce((sum, task) => sum + task.actualHours, 0) / serviceTasks.length;
      const variancePct = avgEstimatedHours > 0 ? ((avgActualHours - avgEstimatedHours) / avgEstimatedHours) * 100 : 0;
      return {
        serviceId,
        serviceName: services.find((service) => service.id === serviceId)?.name ?? "Unknown",
        taskCount: serviceTasks.length,
        avgEstimatedHours: Number(avgEstimatedHours.toFixed(2)),
        avgActualHours: Number(avgActualHours.toFixed(2)),
        variancePct: Number(variancePct.toFixed(1)),
      };
    }).sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));

    const byExecutor = new Map<string, Task[]>();
    for (const task of scope) {
      if (!task.assignedTo) continue;
      byExecutor.set(task.assignedTo, [...(byExecutor.get(task.assignedTo) ?? []), task]);
    }
    const executors = [...byExecutor.entries()].map(([userId, executorTasks]) => {
      const user = users.find((candidate) => candidate.id === userId);
      const totalHours = executorTasks.reduce((sum, task) => sum + task.actualHours, 0);
      const varianceValues = executorTasks.map((task) => task.estimatedHours > 0 ? ((task.actualHours - task.estimatedHours) / task.estimatedHours) * 100 : 0);
      const avgVariancePct = varianceValues.length ? varianceValues.reduce((sum, value) => sum + value, 0) / varianceValues.length : 0;
      const onTimePct = executorTasks.length ? (executorTasks.filter((task) => task.actualHours <= task.estimatedHours).length / executorTasks.length) * 100 : 0;
      const serviceHours = new Map<string, number>();
      for (const task of executorTasks) serviceHours.set(task.serviceId, (serviceHours.get(task.serviceId) ?? 0) + task.actualHours);
      const topServices = [...serviceHours.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([serviceId, hours]) => ({
          serviceId,
          serviceName: services.find((service) => service.id === serviceId)?.name ?? "Unknown",
          hours: Number(hours.toFixed(2)),
        }));
      return {
        userId,
        name: user?.name ?? user?.email ?? "Unknown",
        totalHours: Number(totalHours.toFixed(2)),
        avgVariancePct: Number(avgVariancePct.toFixed(1)),
        onTimePct: Number(onTimePct.toFixed(1)),
        topServices,
      };
    });

    const byManager = new Map<string, Task[]>();
    for (const task of scope) {
      const engagement = engagements.find((candidate) => candidate.id === task.engagementId);
      if (!engagement?.brandManagerId) continue;
      byManager.set(engagement.brandManagerId, [...(byManager.get(engagement.brandManagerId) ?? []), task]);
    }

    const managerIds = [...byManager.keys()];
    const activeEngagementsRes = managerIds.length
      ? await client.from("engagements").select("*").eq("status", "active").in("brand_manager_id", managerIds)
      : { data: [], error: null };
    if (activeEngagementsRes.error) throw activeEngagementsRes.error;
    const activeEngagements = (activeEngagementsRes.data ?? []).map(toEngagement);
    const balanceRes = activeEngagements.length
      ? await client.from("engagement_balances").select("*").in("engagement_id", activeEngagements.map((eng) => eng.id))
      : { data: [], error: null };
    if (balanceRes.error) throw balanceRes.error;
    const balancesMap = new Map((balanceRes.data ?? []).map((balance: any) => [balance.engagement_id, balance]));

    const managers = [...byManager.entries()].map(([userId, managerTasks]) => {
      const user = users.find((candidate) => candidate.id === userId);
      const creditsDelivered = managerTasks.reduce((sum, task) => sum + task.creditCostLocked, 0);
      const internalCostInr = managerTasks.reduce((sum, task) => {
        const taskCost = task.hoursLog.reduce((hoursSum, entry) => {
          const role = roles.find((candidate) => candidate.id === entry.roleId);
          return hoursSum + (role ? entry.hours * role.multiplier * settings.baseHourlyRate : 0);
        }, 0);
        return sum + taskCost;
      }, 0);
      const managerActiveEngagements = activeEngagements.filter((engagement) => engagement.brandManagerId === userId);
      const utilizationSum = managerActiveEngagements.reduce((sum, engagement) => {
        const balance = balancesMap.get(engagement.id);
        const used = balance?.flex_credits_used ?? 0;
        return sum + (engagement.flexCreditsTotal > 0 ? (used / engagement.flexCreditsTotal) * 100 : 0);
      }, 0);
      return {
        userId,
        name: user?.name ?? user?.email ?? "Unknown",
        creditsDelivered,
        internalCostInr: Math.round(internalCostInr),
        marginInr: Math.round(creditsDelivered * settings.creditValue - internalCostInr),
        utilizationPct: Number((managerActiveEngagements.length ? utilizationSum / managerActiveEngagements.length : 0).toFixed(1)),
      };
    });

    return { serviceVariance, executors, managers };
  },

  async utilizationReport(filters: ReportFilters) {
    const client = sb();
    let q = client.from("engagements").select("*").eq("status", "active");
    if (filters.brandManagerId) q = q.eq("brand_manager_id", filters.brandManagerId);
    if (filters.clientId) q = q.eq("client_id", filters.clientId);
    const { data: engagementRows, error } = await q;
    if (error) throw error;
    const engagements = (engagementRows ?? []).map(toEngagement);
    if (!engagements.length) return { rows: [], underutilized: [], overutilized: [] };

    const [clientRes, balanceRes] = await Promise.all([
      client.from("clients").select("*").in("id", [...new Set(engagements.map((engagement) => engagement.clientId))]),
      client.from("engagement_balances").select("*").in("engagement_id", engagements.map((engagement) => engagement.id)),
    ]);
    if (clientRes.error) throw clientRes.error;
    if (balanceRes.error) throw balanceRes.error;

    const clientsMap = new Map((clientRes.data ?? []).map(toClient).map((clientRow) => [clientRow.id, clientRow]));
    const balancesMap = new Map((balanceRes.data ?? []).map((balance: any) => [balance.engagement_id, balance]));
    const today = todayIso();

    const rows = engagements.map((engagement) => {
      const daysTotal = Math.max(1, daysBetween(engagement.startDate, engagement.endDate));
      const daysElapsed = Math.min(daysTotal, Math.max(0, daysBetween(engagement.startDate, today)));
      const balance = balancesMap.get(engagement.id);
      const flexCreditsUsed = balance?.flex_credits_used ?? 0;
      const flexUsedPct = engagement.flexCreditsTotal > 0 ? (flexCreditsUsed / engagement.flexCreditsTotal) * 100 : 0;
      const expectedPct = (daysElapsed / daysTotal) * 100;
      const flag: "underutilized" | "ontrack" | "overutilized" =
        daysElapsed / daysTotal > 0.5 && flexUsedPct < 40
          ? "underutilized"
          : flexUsedPct > expectedPct + 20
            ? "overutilized"
            : "ontrack";
      return {
        engagementId: engagement.id,
        clientName: clientsMap.get(engagement.clientId)?.name ?? "Unknown",
        daysElapsed,
        daysTotal,
        flexUsedPct: Number(flexUsedPct.toFixed(1)),
        expectedPct: Number(expectedPct.toFixed(1)),
        flag,
      };
    });

    return {
      rows,
      underutilized: rows.filter((row) => row.flag === "underutilized"),
      overutilized: rows.filter((row) => row.flag === "overutilized"),
    };
  },
};
