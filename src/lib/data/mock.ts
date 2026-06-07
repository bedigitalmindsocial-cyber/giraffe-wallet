// In-memory mock store. The full DataStore implementation lives here so we
// can run the entire app locally without touching Supabase. Seed data is
// loaded on import. State persists for the lifetime of the Node process only.

import type {
  Actor,
  AuditEntry,
  Client,
  Engagement,
  EngagementBalance,
  EngagementSummary,
  Package,
  PackageInput,
  Role,
  Service,
  Settings,
  Task,
  TaskBucket,
  User,
} from "@/types";
import type { DataStore } from "./store";
import { computeCreditCost } from "@/lib/credits";
import {
  addDays,
  daysBetween,
  formatCredits,
  todayIso,
  timestamp,
} from "@/lib/utils";
import { engagementSlug, fourDigitPasscode, slugify } from "@/lib/slug";

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

// ── Tables ──────────────────────────────────────────────────────────────

const roles: Role[] = [];
const services: Service[] = [];
const packages: Package[] = [];
const clients: Client[] = [];
const engagements: Engagement[] = [];
const tasks: Task[] = [];
const users: User[] = [];
const audit: AuditEntry[] = [];
let settings: Settings = {
  baseHourlyRate: 125,
  markupMultiplier: 2.5,
  creditValue: 500,
  updatedAt: timestamp(),
};

const SYSTEM_ACTOR: Actor = { type: "system", id: "system", name: "System" };

function pushAudit(e: Omit<AuditEntry, "id" | "createdAt">): void {
  audit.push({ id: uid(), createdAt: timestamp(), ...e });
}

// ── Seed ────────────────────────────────────────────────────────────────

function seedRoles(): void {
  const data = [
    { name: "Executive", multiplier: 1.0 },
    { name: "Manager", multiplier: 2.0 },
    { name: "Senior Manager", multiplier: 3.0 },
    { name: "Senior Partner", multiplier: 5.0 },
  ];
  for (const r of data) {
    roles.push({
      id: uid(),
      name: r.name,
      multiplier: r.multiplier,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    });
  }
}

function roleByName(name: string): Role {
  const r = roles.find((x) => x.name === name);
  if (!r) throw new Error(`Role not found: ${name}`);
  return r;
}

function seedPackages(): void {
  const data: PackageInput[] = [
    {
      name: "Starter",
      quarterlyFeeInr: 450_000,
      totalCredits: 900,
      coreCredits: 600,
      sortOrder: 1,
    },
    {
      name: "Growth",
      quarterlyFeeInr: 750_000,
      totalCredits: 1500,
      coreCredits: 600,
      sortOrder: 2,
    },
    {
      name: "Scale",
      quarterlyFeeInr: 1_200_000,
      totalCredits: 2400,
      coreCredits: 600,
      sortOrder: 3,
    },
  ];
  for (const p of data) {
    packages.push({
      id: uid(),
      name: p.name,
      quarterlyFeeInr: p.quarterlyFeeInr,
      totalCredits: p.totalCredits,
      coreCredits: p.coreCredits,
      flexCredits: p.totalCredits - p.coreCredits,
      isActive: true,
      sortOrder: p.sortOrder ?? 0,
    });
  }
}

interface ServiceSeed {
  name: string;
  description: string;
  category: string;
  roleName: string;
  pricingModel?: Service["pricingModel"];
  creditsPerUnit: number;
  unitLabel?: string;
  minUnits?: number;
  tierThreshold?: number;
  tierCreditsPerUnit?: number;
  includedRevisionsPerUnit?: number;
  lateRevisionCredits?: number;
  internalAvgHours?: number;
  turnaroundDays?: number;
  lifecycleTag?: Service["lifecycleTag"];
  methodTag?: Service["methodTag"];
  audienceTag?: Service["audienceTag"];
}

function seedServices(): void {
  const data: ServiceSeed[] = [
    // ── Core (system) services ────────────────────────────────────────────
    { name: "Strategy: Quarterly Plan (system task)", description: "Quarterly roadmap and monthly review.", category: "Strategy (Core)", roleName: "Manager", pricingModel: "flat", creditsPerUnit: 80, internalAvgHours: 16, methodTag: "ARTISAN", audienceTag: "CROSS" },
    { name: "Website Maintenance (system task)", description: "Uptime, backups, security patches, performance.", category: "Tech (Core)", roleName: "Manager", pricingModel: "flat", creditsPerUnit: 50, internalAvgHours: 10, methodTag: "AI POWERED", audienceTag: "CROSS" },
    { name: "Monthly Content System (system task)", description: "One pillar piece plus derivative posts and emails for the month.", category: "Content (Core)", roleName: "Manager", pricingModel: "flat", creditsPerUnit: 70, internalAvgHours: 14, methodTag: "HYBRID", audienceTag: "CROSS" },

    // ── Flex services ─────────────────────────────────────────────────────
    { name: "Social post (single)", description: "One static post with caption, hashtags, and platform sizing.", category: "Social", roleName: "Executive", pricingModel: "flat", creditsPerUnit: 8, internalAvgHours: 1.5, lifecycleTag: "POPULAR", methodTag: "AI POWERED", audienceTag: "CROSS" },
    { name: "Social carousel (5 slides)", description: "Multi-slide post with copy and design.", category: "Social", roleName: "Executive", pricingModel: "flat", creditsPerUnit: 20, internalAvgHours: 4.0, methodTag: "HYBRID", audienceTag: "CROSS" },
    { name: "Long-form article", description: "1200 to 1500 word article with research and edit pass.", category: "Content", roleName: "Manager", pricingModel: "flat", creditsPerUnit: 40, internalAvgHours: 8.0, methodTag: "HYBRID", audienceTag: "CROSS" },
    { name: "Pitch deck", description: "12 to 15 slide deck with structure, copy, and design.", category: "Sales Enablement", roleName: "Senior Manager", pricingModel: "flat", creditsPerUnit: 120, internalAvgHours: 12.0, methodTag: "ARTISAN", audienceTag: "CAPITAL" },
    { name: "Brand strategy doc", description: "Positioning, messaging architecture, brand voice.", category: "Strategy", roleName: "Senior Partner", pricingModel: "flat", creditsPerUnit: 150, internalAvgHours: 15.0, lifecycleTag: "NEW", methodTag: "ARTISAN", audienceTag: "CROSS" },
    { name: "Web page (single)", description: "One landing page or content page, copy plus design.", category: "Design", roleName: "Manager", pricingModel: "flat", creditsPerUnit: 60, internalAvgHours: 8.0, methodTag: "HYBRID", audienceTag: "CROSS" },
    { name: "Blog graphic", description: "Header graphic for an article. Two revisions included.", category: "Design", roleName: "Executive", pricingModel: "flat", creditsPerUnit: 15, includedRevisionsPerUnit: 2, internalAvgHours: 3.0, methodTag: "HYBRID", audienceTag: "CROSS" },
    { name: "Email campaign", description: "One email with copy, design, and segmentation note.", category: "Email", roleName: "Executive", pricingModel: "flat", creditsPerUnit: 15, internalAvgHours: 3.0, methodTag: "AI POWERED", audienceTag: "CROSS" },
    { name: "Infographic", description: "Single static infographic with research and design.", category: "Design", roleName: "Executive", pricingModel: "flat", creditsPerUnit: 20, internalAvgHours: 4.0, methodTag: "HYBRID", audienceTag: "CROSS" },
    { name: "SEO audit", description: "Technical and content audit with prioritized action list.", category: "SEO", roleName: "Manager", pricingModel: "flat", creditsPerUnit: 30, internalAvgHours: 6.0, methodTag: "HYBRID", audienceTag: "CROSS" },
    { name: "Static Posts/Ads", description: "Single static social post or ad creative with caption-ready messaging, platform sizing, and export files.", category: "Social Media Creatives", roleName: "Executive", pricingModel: "flat", creditsPerUnit: 12, includedRevisionsPerUnit: 2, internalAvgHours: 2.4, lifecycleTag: "POPULAR", methodTag: "AI POWERED", audienceTag: "CROSS" },
    { name: "Carousel Ads", description: "Multi-slide ad creative with structured narrative, slide copy, design, and platform-ready exports.", category: "Social Media Creatives", roleName: "Executive", pricingModel: "flat", creditsPerUnit: 20, includedRevisionsPerUnit: 2, internalAvgHours: 4.0, lifecycleTag: "POPULAR", methodTag: "HYBRID", audienceTag: "CROSS" },
    { name: "Research & Content Writing (100 words)", description: "Research-backed copy block or article section delivered in 100-word units with an edit pass.", category: "Content Writing", roleName: "Executive", pricingModel: "per_100_words", creditsPerUnit: 4, unitLabel: "100 words", minUnits: 1, internalAvgHours: 1.6, methodTag: "AI POWERED", audienceTag: "CROSS" },
    { name: "Presentation & Pitch Decks (up to 8 pages)", description: "Per-page deck design and copy polish for concise investor, sales, or internal presentations up to 8 pages.", category: "Presentation & Documents", roleName: "Manager", pricingModel: "per_page", creditsPerUnit: 8, unitLabel: "page", minUnits: 1, tierThreshold: 8, tierCreditsPerUnit: 6, includedRevisionsPerUnit: 2, internalAvgHours: 1.6, methodTag: "HYBRID", audienceTag: "CROSS" },
  ];
  let i = 0;
  for (const s of data) {
    const role = roleByName(s.roleName);
    services.push({
      id: uid(),
      name: s.name,
      description: s.description,
      category: s.category,
      defaultRoleId: role.id,
      pricingModel: s.pricingModel ?? 'flat',
      creditsPerUnit: s.creditsPerUnit,
      unitLabel: s.unitLabel ?? 'unit',
      minUnits: s.minUnits ?? 1,
      tierThreshold: s.tierThreshold,
      tierCreditsPerUnit: s.tierCreditsPerUnit,
      includedRevisionsPerUnit: s.includedRevisionsPerUnit ?? 0.5,
      lateRevisionCredits: s.lateRevisionCredits ?? 4,
      internalAvgHours: s.internalAvgHours,
      turnaroundDays: s.turnaroundDays ?? 5,
      lifecycleTag: s.lifecycleTag ?? null,
      methodTag: s.methodTag ?? 'HYBRID',
      audienceTag: s.audienceTag ?? 'CROSS',
      isActive: true,
      sortOrder: i++,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    });
  }
}

function seedUsers(): void {
  users.push(
    { id: uid(), email: "admin@giraffe.partners", name: "Lovish Kalani", role: "super_admin", isActive: true, whatsappNumber: "+919999999999", createdAt: timestamp() },
    { id: uid(), email: "manager@giraffe.partners", name: "Aanya Brand Manager", role: "manager", isActive: true, whatsappNumber: "+919888888888", createdAt: timestamp() },
    { id: uid(), email: "executor@giraffe.partners", name: "Rahul Executor", role: "executor", isActive: true, createdAt: timestamp() },
  );
}

function seedSampleEngagement(): void {
  const admin = users[0];
  const manager = users[1];
  const executor = users[2];

  const client: Client = {
    id: uid(),
    name: "Saraswati Industries",
    slug: "saraswati-industries",
    contactPerson: "Mr. Saraswat",
    contactEmail: "saraswat@example.com",
    contactPhone: "+919777777777",
    sector: "Auto Components",
    city: "Faridabad",
    createdBy: admin.id,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  };
  clients.push(client);

  const growth = packages.find((p) => p.name === "Growth")!;
  const start = todayIso();
  const end = addDays(start, 90);
  const eng: Engagement = {
    id: uid(),
    clientId: client.id,
    slug: `${client.slug}-${"a3k7"}`,
    packageId: growth.id,
    startDate: start,
    endDate: end,
    passcode: "1234",
    totalCredits: growth.totalCredits,
    coreCreditsTotal: growth.coreCredits,
    flexCreditsTotal: growth.flexCredits,
    brandManagerId: manager.id,
    status: "active",
    pauseDaysConsumed: 0,
    createdAt: timestamp(),
    updatedAt: timestamp(),
  };
  engagements.push(eng);

  // Auto-create 9 system Core tasks: 3 services × 3 months.
  createSystemCoreTasks(eng);

  // 4 sample Flex tasks for visual demo.
  const pitch = services.find((s) => s.name === "Pitch deck")!;
  const social = services.find((s) => s.name === "Social post (single)")!;
  const article = services.find((s) => s.name === "Long-form article")!;
  const carousel = services.find((s) => s.name === "Social carousel (5 slides)")!;

  const t1 = makeFlexTask(eng, pitch, "Diwali campaign deck", "Investor pitch deck for the Diwali campaign rollout. Needs strong narrative arc and clear ROI numbers.", admin.id);
  t1.status = "quoted";
  tasks.push(t1);

  const t2 = makeFlexTask(eng, social, "Republic Day post", "Single Republic Day greeting with Saraswati branding.", manager.id);
  t2.status = "approved";
  t2.approvedAt = timestamp();
  t2.approvedByClient = true;
  t2.assignedTo = executor.id;
  t2.startedAt = timestamp();
  tasks.push({ ...t2, status: "in_progress" });

  const t3 = makeFlexTask(eng, article, "Q1 industry trends piece", "Long-form on auto component industry tailwinds. 1500 words.", manager.id);
  t3.status = "submitted";
  t3.approvedAt = timestamp();
  t3.startedAt = timestamp();
  t3.submittedAt = timestamp();
  t3.assignedTo = executor.id;
  t3.actualHours = 9.5;
  t3.hoursLog = [
    { id: uid(), taskId: t3.id, roleId: roleByName("Manager").id, hours: 9.5, loggedBy: executor.id, loggedAt: timestamp() },
  ];
  t3.approvedByClient = true;
  tasks.push(t3);

  const t4 = makeFlexTask(eng, carousel, "Plant tour carousel", "5-slide carousel for the Faridabad plant tour.", manager.id);
  t4.status = "done";
  t4.approvedAt = timestamp();
  t4.startedAt = timestamp();
  t4.submittedAt = timestamp();
  t4.completedAt = timestamp();
  t4.assignedTo = executor.id;
  t4.actualHours = 4.5;
  t4.approvedByClient = true;
  t4.hoursLog = [
    { id: uid(), taskId: t4.id, roleId: roleByName("Executive").id, hours: 4.5, loggedBy: executor.id, loggedAt: timestamp() },
  ];
  tasks.push(t4);

  pushAudit({
    entityType: "engagement",
    entityId: eng.id,
    action: "engagement_created",
    actorType: "super_admin",
    actorId: admin.id,
    actorName: admin.name || admin.email,
    payload: { packageId: growth.id, totalCredits: eng.totalCredits },
  });
}

function makeFlexTask(eng: Engagement, service: Service, title: string, brief: string, createdBy: string): Task {
  return {
    id: uid(),
    engagementId: eng.id,
    serviceId: service.id,
    title,
    brief,
    status: "quoted",
    bucket: "flex",
    quantity: 1,
    creditCostLocked: computeCreditCost(service, 1),
    executorRoleId: service.defaultRoleId,
    estimatedHours: service.internalAvgHours ?? 0,
    actualHours: 0,
    revisionCount: 0,
    revisionsIncluded: service.includedRevisionsPerUnit,
    isSystemGenerated: false,
    approvedByClient: false,
    approvedByManagerOnBehalf: false,
    createdBy,
    createdAt: timestamp(),
    quotedAt: timestamp(),
    hoursLog: [],
  };
}

function createSystemCoreTasks(eng: Engagement): void {
  const coreServices = [
    services.find((s) => s.name.startsWith("Strategy: Quarterly Plan"))!,
    services.find((s) => s.name.startsWith("Website Maintenance"))!,
    services.find((s) => s.name.startsWith("Monthly Content System"))!,
  ];
  for (let m = 1; m <= 3; m++) {
    for (const svc of coreServices) {
      const baseTitle = svc.name.replace(/\s*\(system task\)\s*/i, "");
      const t: Task = {
        id: uid(),
        engagementId: eng.id,
        serviceId: svc.id,
        title: `${baseTitle} – Month ${m}`,
        brief: svc.description,
        status: "approved",
        bucket: "core",
        quantity: 1,
        creditCostLocked: computeCreditCost(svc, 1),
        executorRoleId: svc.defaultRoleId,
        estimatedHours: svc.internalAvgHours ?? 0,
        actualHours: 0,
        revisionCount: 0,
        revisionsIncluded: svc.includedRevisionsPerUnit,
        isSystemGenerated: true,
        approvedByClient: false,
        approvedByManagerOnBehalf: false,
        createdAt: timestamp(),
        quotedAt: timestamp(),
        approvedAt: timestamp(),
        hoursLog: [],
      };
      tasks.push(t);
    }
  }
}

// ── Computed view: balances ─────────────────────────────────────────────

const COUNTING_STATUSES: Task["status"][] = [
  "approved",
  "in_progress",
  "submitted",
  "revision",
  "done",
];

function computeBalance(eng: Engagement): EngagementBalance {
  const engTasks = tasks.filter((t) => t.engagementId === eng.id);
  const sumByBucket = (bucket: TaskBucket) =>
    engTasks
      .filter((t) => t.bucket === bucket && COUNTING_STATUSES.includes(t.status))
      .reduce((sum, t) => sum + t.creditCostLocked, 0);

  const coreUsed = sumByBucket("core");
  const flexUsed = sumByBucket("flex");
  return {
    engagementId: eng.id,
    coreCreditsTotal: eng.coreCreditsTotal,
    coreCreditsUsed: coreUsed,
    coreCreditsRemaining: eng.coreCreditsTotal - coreUsed,
    flexCreditsTotal: eng.flexCreditsTotal,
    flexCreditsUsed: flexUsed,
    flexCreditsRemaining: eng.flexCreditsTotal - flexUsed,
  };
}

// ── Auto-expiry sweep ───────────────────────────────────────────────────

function sweepExpiry(): void {
  const today = todayIso();
  for (const e of engagements) {
    if (e.status === "active" && e.endDate < today) {
      e.status = "expired";
      e.updatedAt = timestamp();
      pushAudit({
        entityType: "engagement",
        entityId: e.id,
        action: "engagement_expired",
        actorType: "system",
        actorId: SYSTEM_ACTOR.id,
        actorName: SYSTEM_ACTOR.name,
        payload: { endDate: e.endDate },
      });
    }
  }
}

// ── Initial seed ────────────────────────────────────────────────────────

seedRoles();
seedPackages();
seedServices();
seedUsers();
seedSampleEngagement();

// ── Implementation ──────────────────────────────────────────────────────

export const mockStore: DataStore = {
  // Roles
  async getRoles() {
    return [...roles].sort((a, b) => a.multiplier - b.multiplier);
  },
  async upsertRole(input, actor) {
    const id = input.id ?? uid();
    const existing = roles.find((r) => r.id === id);
    const now = timestamp();
    const next: Role = existing
      ? { ...existing, name: input.name, multiplier: input.multiplier, notes: input.notes, updatedAt: now }
      : { id, name: input.name, multiplier: input.multiplier, notes: input.notes, createdAt: now, updatedAt: now };
    if (existing) Object.assign(existing, next);
    else roles.push(next);
    pushAudit({
      entityType: "role",
      entityId: id,
      action: existing ? "role_updated" : "role_created",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      payload: { before: existing, after: next },
    });
    return next;
  },
  async deleteRole(id) {
    const refServices = services.filter((s) => s.defaultRoleId === id).length;
    const refTasks = tasks.filter((t) => t.executorRoleId === id).length;
    const refLog = tasks.flatMap((t) => t.hoursLog).filter((h) => h.roleId === id).length;
    if (refServices + refTasks + refLog > 0) {
      throw new Error(`Role is referenced by ${refServices} services, ${refTasks} tasks, ${refLog} log rows. Cannot delete.`);
    }
    const idx = roles.findIndex((r) => r.id === id);
    if (idx >= 0) roles.splice(idx, 1);
  },

  // Services
  async getServices(filters) {
    let out = [...services];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((s) => s.name.toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q));
    }
    if (filters?.categories?.length) out = out.filter((s) => filters.categories!.includes(s.category));
    if (filters?.roleIds?.length) out = out.filter((s) => filters.roleIds!.includes(s.defaultRoleId));
    if (filters?.lifecycleTags?.length) out = out.filter((s) => filters.lifecycleTags!.includes(s.lifecycleTag ?? null));
    if (filters?.methodTags?.length) out = out.filter((s) => filters.methodTags!.includes(s.methodTag));
    if (filters?.audienceTags?.length) out = out.filter((s) => filters.audienceTags!.includes(s.audienceTag));
    if (filters?.activeOnly) out = out.filter((s) => s.isActive);
    return out.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
  async getService(id) {
    return services.find((s) => s.id === id) ?? null;
  },
  async upsertService(input, actor) {
    if (!roles.find((r) => r.id === input.defaultRoleId)) throw new Error("Default role not found");

    const now = timestamp();
    const id = input.id ?? uid();
    const existing = services.find((s) => s.id === id);
    const lifecycleTag = input.lifecycleTag ?? null;
    const isActive = lifecycleTag === "DISCONTINUED" ? false : input.isActive ?? true;

    const next: Service = existing
      ? {
          ...existing,
          name: input.name,
          description: input.description,
          category: input.category,
          defaultRoleId: input.defaultRoleId,
          pricingModel: input.pricingModel ?? existing.pricingModel,
          creditsPerUnit: input.creditsPerUnit ?? existing.creditsPerUnit,
          unitLabel: input.unitLabel ?? existing.unitLabel,
          minUnits: input.minUnits ?? existing.minUnits,
          tierThreshold: input.tierThreshold ?? existing.tierThreshold,
          tierCreditsPerUnit: input.tierCreditsPerUnit ?? existing.tierCreditsPerUnit,
          includedRevisionsPerUnit: input.includedRevisionsPerUnit ?? existing.includedRevisionsPerUnit,
          lateRevisionCredits: input.lateRevisionCredits ?? existing.lateRevisionCredits,
          internalAvgHours: input.internalAvgHours ?? existing.internalAvgHours,
          scopeInclusions: input.scopeInclusions ?? existing.scopeInclusions,
          scopeExclusions: input.scopeExclusions ?? existing.scopeExclusions,
          clientInputsRequired: input.clientInputsRequired ?? existing.clientInputsRequired,
          deliverableFormat: input.deliverableFormat ?? existing.deliverableFormat,
          turnaroundDays: input.turnaroundDays ?? existing.turnaroundDays,
          qualityBar: input.qualityBar ?? existing.qualityBar,
          lifecycleTag,
          methodTag: input.methodTag ?? existing.methodTag,
          audienceTag: input.audienceTag ?? existing.audienceTag,
          isActive,
          sortOrder: input.sortOrder ?? existing.sortOrder,
          updatedAt: now,
        }
      : {
          id,
          name: input.name,
          description: input.description,
          category: input.category,
          defaultRoleId: input.defaultRoleId,
          pricingModel: input.pricingModel ?? 'flat',
          creditsPerUnit: input.creditsPerUnit ?? 0,
          unitLabel: input.unitLabel ?? 'unit',
          minUnits: input.minUnits ?? 1,
          tierThreshold: input.tierThreshold,
          tierCreditsPerUnit: input.tierCreditsPerUnit,
          includedRevisionsPerUnit: input.includedRevisionsPerUnit ?? 0.5,
          lateRevisionCredits: input.lateRevisionCredits ?? 4,
          internalAvgHours: input.internalAvgHours,
          scopeInclusions: input.scopeInclusions,
          scopeExclusions: input.scopeExclusions,
          clientInputsRequired: input.clientInputsRequired,
          deliverableFormat: input.deliverableFormat,
          turnaroundDays: input.turnaroundDays ?? 5,
          qualityBar: input.qualityBar,
          lifecycleTag,
          methodTag: input.methodTag ?? 'HYBRID',
          audienceTag: input.audienceTag ?? 'CROSS',
          isActive,
          sortOrder: input.sortOrder ?? services.length,
          createdAt: now,
          updatedAt: now,
        };
    if (existing) Object.assign(existing, next);
    else services.push(next);

    pushAudit({
      entityType: "service",
      entityId: id,
      action: existing ? "service_updated" : "service_created",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      payload: { before: existing, after: next },
    });
    return next;
  },
  async archiveService(id, actor) {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    s.isActive = false;
    s.lifecycleTag = "DISCONTINUED";
    s.updatedAt = timestamp();
    pushAudit({
      entityType: "service",
      entityId: id,
      action: "service_archived",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
    });
  },

  // Packages
  async getPackages() {
    return [...packages].sort((a, b) => a.sortOrder - b.sortOrder);
  },
  async upsertPackage(input, actor) {
    const id = input.id ?? uid();
    const existing = packages.find((p) => p.id === id);
    const next: Package = existing
      ? {
          ...existing,
          name: input.name,
          quarterlyFeeInr: input.quarterlyFeeInr,
          totalCredits: input.totalCredits,
          coreCredits: input.coreCredits,
          flexCredits: input.totalCredits - input.coreCredits,
          description: input.description,
          isActive: input.isActive ?? existing.isActive,
          sortOrder: input.sortOrder ?? existing.sortOrder,
        }
      : {
          id,
          name: input.name,
          quarterlyFeeInr: input.quarterlyFeeInr,
          totalCredits: input.totalCredits,
          coreCredits: input.coreCredits,
          flexCredits: input.totalCredits - input.coreCredits,
          description: input.description,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? packages.length,
        };
    if (existing) Object.assign(existing, next);
    else packages.push(next);
    pushAudit({
      entityType: "package",
      entityId: id,
      action: existing ? "package_updated" : "package_created",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      payload: { after: next },
    });
    return next;
  },

  // Settings
  async getSettings() {
    return settings;
  },
  async previewSettings(_s) {
    // v2 schema: service credit costs are explicit (creditsPerUnit), not derived from settings.
    return [];
  },
  async updateSettings(input, actor) {
    settings = {
      baseHourlyRate: input.baseHourlyRate,
      markupMultiplier: input.markupMultiplier,
      creditValue: input.creditValue,
      updatedAt: timestamp(),
    };
    pushAudit({
      entityType: "settings",
      entityId: "settings",
      action: "settings_updated",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      payload: { settings },
    });
    return { settings, updatedServices: [] };
  },

  // Clients
  async listClients(forUserId) {
    if (forUserId) {
      const myEngagements = engagements.filter((e) => e.brandManagerId === forUserId).map((e) => e.clientId);
      return clients.filter((c) => myEngagements.includes(c.id));
    }
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  },
  async getClient(id) {
    return clients.find((c) => c.id === id) ?? null;
  },
  async createClient(input, actor) {
    const baseSlug = slugify(input.name) || "client";
    let slug = baseSlug;
    let i = 2;
    while (clients.some((c) => c.slug === slug)) slug = `${baseSlug}-${i++}`;
    const c: Client = {
      id: uid(),
      name: input.name,
      slug,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      sector: input.sector,
      city: input.city,
      notes: input.notes,
      createdBy: actor.id,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    clients.push(c);
    pushAudit({
      entityType: "client",
      entityId: c.id,
      action: "client_created",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      payload: { name: input.name },
    });
    return c;
  },

  // Engagements
  async listEngagements(filters, forUserId) {
    sweepExpiry();
    let out = [...engagements];
    if (forUserId) {
      const me = users.find((u) => u.id === forUserId);
      if (me?.role === "manager") out = out.filter((e) => e.brandManagerId === forUserId);
    }
    if (filters?.brandManagerId) out = out.filter((e) => e.brandManagerId === filters.brandManagerId);
    if (filters?.status) out = out.filter((e) => e.status === filters.status);
    if (filters?.packageId) out = out.filter((e) => e.packageId === filters.packageId);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((e) => {
        const c = clients.find((x) => x.id === e.clientId);
        return c?.name.toLowerCase().includes(q) || e.slug.includes(q);
      });
    }
    if (typeof filters?.endingWithinDays === "number") {
      const cutoff = addDays(todayIso(), filters.endingWithinDays);
      out = out.filter((e) => e.endDate <= cutoff);
    }
    return out.map((e) => buildSummary(e));
  },
  async getEngagement(id) {
    sweepExpiry();
    return engagements.find((e) => e.id === id) ?? null;
  },
  async getEngagementBySlug(slug) {
    sweepExpiry();
    return engagements.find((e) => e.slug === slug) ?? null;
  },
  async getEngagementSummary(id) {
    sweepExpiry();
    const e = engagements.find((x) => x.id === id);
    if (!e) return null;
    return buildSummary(e);
  },
  async createEngagement(input, actor) {
    const client = clients.find((c) => c.id === input.clientId);
    if (!client) throw new Error("Client not found");
    const pkg = packages.find((p) => p.id === input.packageId);
    if (!pkg) throw new Error("Package not found");
    const start = input.startDate || todayIso();
    const end = input.endDate || addDays(start, 90);

    let slug = engagementSlug(client.slug);
    while (engagements.some((e) => e.slug === slug)) slug = engagementSlug(client.slug);

    const e: Engagement = {
      id: uid(),
      clientId: client.id,
      slug,
      packageId: pkg.id,
      startDate: start,
      endDate: end,
      passcode: fourDigitPasscode(),
      totalCredits: pkg.totalCredits,
      coreCreditsTotal: pkg.coreCredits,
      flexCreditsTotal: pkg.flexCredits,
      brandManagerId: input.brandManagerId,
      status: "active",
      pauseDaysConsumed: 0,
      notes: input.notes,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    engagements.push(e);
    createSystemCoreTasks(e);
    pushAudit({
      entityType: "engagement",
      entityId: e.id,
      action: "engagement_created",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      payload: { clientId: client.id, packageId: pkg.id, slug, passcode: e.passcode },
    });
    return e;
  },
  async pauseEngagement(id, reason, actor) {
    const e = engagements.find((x) => x.id === id);
    if (!e) throw new Error("Engagement not found");
    if (e.status !== "active") throw new Error("Only active engagements can be paused");
    e.status = "paused";
    e.pausedAt = timestamp();
    e.pausedReason = reason;
    e.updatedAt = timestamp();
    pushAudit({ entityType: "engagement", entityId: id, action: "engagement_paused", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { reason } });
  },
  async resumeEngagement(id, actor) {
    const e = engagements.find((x) => x.id === id);
    if (!e) throw new Error("Engagement not found");
    if (e.status !== "paused" || !e.pausedAt) throw new Error("Not paused");
    const days = daysBetween(e.pausedAt, new Date());
    e.endDate = addDays(e.endDate, days);
    e.pauseDaysConsumed += days;
    e.status = "active";
    e.pausedAt = undefined;
    e.pausedReason = undefined;
    e.updatedAt = timestamp();
    pushAudit({ entityType: "engagement", entityId: id, action: "engagement_resumed", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { addedDays: days, newEndDate: e.endDate } });
  },
  async upgradeEngagement(id, newPackageId, actor) {
    const e = engagements.find((x) => x.id === id);
    if (!e) throw new Error("Engagement not found");
    const oldPkg = packages.find((p) => p.id === e.packageId);
    const newPkg = packages.find((p) => p.id === newPackageId);
    if (!oldPkg || !newPkg) throw new Error("Package not found");
    if (newPkg.totalCredits <= oldPkg.totalCredits) throw new Error("Upgrade target must be larger than current package");
    const flexDelta = newPkg.flexCredits - oldPkg.flexCredits;
    const totalDelta = newPkg.totalCredits - oldPkg.totalCredits;
    e.flexCreditsTotal += flexDelta;
    e.totalCredits += totalDelta;
    e.packageId = newPackageId;
    e.updatedAt = timestamp();
    const daysLeft = Math.max(0, daysBetween(new Date(), e.endDate));
    const proratedFee = Math.round(((newPkg.quarterlyFeeInr - oldPkg.quarterlyFeeInr) * daysLeft) / 90);
    pushAudit({ entityType: "engagement", entityId: id, action: "engagement_upgraded", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { oldPackageId: oldPkg.id, newPackageId, flexDelta, totalDelta, proratedFee } });
  },
  async reassignBrandManager(id, newUserId, actor) {
    const e = engagements.find((x) => x.id === id);
    if (!e) throw new Error("Engagement not found");
    const before = e.brandManagerId;
    e.brandManagerId = newUserId;
    e.updatedAt = timestamp();
    pushAudit({ entityType: "engagement", entityId: id, action: "brand_manager_reassigned", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { before, after: newUserId } });
  },

  // Tasks
  async listTasks(engagementId, filters) {
    let out = tasks.filter((t) => t.engagementId === engagementId);
    if (filters?.status?.length) out = out.filter((t) => filters.status!.includes(t.status));
    if (filters?.assignedTo) out = out.filter((t) => t.assignedTo === filters.assignedTo);
    if (filters?.bucket) out = out.filter((t) => t.bucket === filters.bucket);
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  },
  async getTask(id) {
    return tasks.find((t) => t.id === id) ?? null;
  },
  async createTask(input, actor) {
    const eng = engagements.find((e) => e.id === input.engagementId);
    if (!eng) throw new Error("Engagement not found");
    if (eng.status !== "active") throw new Error(`Engagement is ${eng.status}. New tasks not allowed.`);
    const svc = services.find((s) => s.id === input.serviceId);
    if (!svc) throw new Error("Service not found");
    if (!svc.isActive || svc.lifecycleTag === "DISCONTINUED") throw new Error("Service is not available");

    const quantity = input.quantity ?? 1;
    const creditCost = computeCreditCost(svc, quantity);
    const balance = computeBalance(eng);
    if (input.bucket === "flex" && balance.flexCreditsRemaining < creditCost) {
      throw new Error(`Insufficient flex credits. Need ${creditCost - balance.flexCreditsRemaining} more.`);
    }
    if (input.bucket === "core" && balance.coreCreditsRemaining < creditCost) {
      throw new Error(`Insufficient core credits. Need ${creditCost - balance.coreCreditsRemaining} more.`);
    }

    const t: Task = {
      id: uid(),
      engagementId: eng.id,
      serviceId: svc.id,
      title: input.title,
      brief: input.brief,
      status: "quoted",
      bucket: input.bucket,
      quantity,
      creditCostLocked: creditCost,
      executorRoleId: svc.defaultRoleId,
      estimatedHours: svc.internalAvgHours ?? 0,
      actualHours: 0,
      revisionCount: 0,
      revisionsIncluded: svc.includedRevisionsPerUnit,
      isSystemGenerated: false,
      approvedByClient: false,
      approvedByManagerOnBehalf: false,
      createdBy: actor.id,
      createdAt: timestamp(),
      quotedAt: timestamp(),
      hoursLog: [],
    };
    tasks.push(t);
    pushAudit({ entityType: "task", entityId: t.id, action: "task_created", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { title: t.title, bucket: t.bucket, creditCost: t.creditCostLocked } });
    return t;
  },
  async approveTask(id, actor, byClient, reason) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    if (t.status !== "quoted") throw new Error(`Task is already ${t.status}`);

    const eng = engagements.find((e) => e.id === t.engagementId)!;
    const balance = computeBalance(eng);
    const remaining = t.bucket === "flex" ? balance.flexCreditsRemaining : balance.coreCreditsRemaining;
    if (remaining < t.creditCostLocked) {
      throw new Error(`Insufficient ${t.bucket} credits at approval time. Have ${remaining}, need ${t.creditCostLocked}.`);
    }

    t.status = "approved";
    t.approvedAt = timestamp();
    if (byClient) t.approvedByClient = true;
    else {
      t.approvedByManagerOnBehalf = true;
      t.approvalReason = reason;
    }
    pushAudit({ entityType: "task", entityId: t.id, action: byClient ? "task_approved_by_client" : "task_approved_on_behalf", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { reason } });
    return t;
  },
  async assignTask(id, userId, actor) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    t.assignedTo = userId;
    pushAudit({ entityType: "task", entityId: t.id, action: "task_assigned", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { assignedTo: userId } });
    return t;
  },
  async startTask(id, actor) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    if (t.status !== "approved") throw new Error(`Cannot start task in status ${t.status}`);
    t.status = "in_progress";
    t.startedAt = timestamp();
    pushAudit({ entityType: "task", entityId: t.id, action: "task_started", actorType: actor.type, actorId: actor.id, actorName: actor.name });
    return t;
  },
  async submitTask(id, hoursLog, actor) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    if (!["in_progress", "revision"].includes(t.status)) throw new Error(`Cannot submit from ${t.status}`);
    if (!hoursLog.length) throw new Error("At least one hours entry required");
    const totalHours = hoursLog.reduce((s, h) => s + h.hours, 0);
    if (totalHours <= 0) throw new Error("Total hours must be positive");
    for (const h of hoursLog) {
      t.hoursLog.push({ id: uid(), taskId: t.id, roleId: h.roleId, hours: h.hours, loggedBy: h.loggedBy, loggedAt: timestamp(), notes: h.notes });
    }
    t.actualHours = t.hoursLog.reduce((s, h) => s + h.hours, 0);
    t.status = "submitted";
    t.submittedAt = timestamp();
    pushAudit({ entityType: "task", entityId: t.id, action: "task_submitted", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { totalHours, hoursLog } });
    return t;
  },
  async requestRevision(id, note, actor) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    if (!["submitted", "in_progress"].includes(t.status)) throw new Error(`Cannot request revision from ${t.status}`);
    t.status = "revision";
    t.revisionCount += 1;
    pushAudit({ entityType: "task", entityId: t.id, action: "revision_requested", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { note, revisionCount: t.revisionCount, revisionsIncluded: t.revisionsIncluded } });
    return t;
  },
  async completeTask(id, actor) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    if (!["submitted", "revision"].includes(t.status)) throw new Error(`Cannot complete from ${t.status}`);
    t.status = "done";
    t.completedAt = timestamp();
    pushAudit({ entityType: "task", entityId: t.id, action: "task_completed", actorType: actor.type, actorId: actor.id, actorName: actor.name });
    return t;
  },
  async cancelTask(id, reason, actor) {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    if (t.status === "done" || t.status === "cancelled") throw new Error(`Cannot cancel from ${t.status}`);
    t.status = "cancelled";
    t.cancelledAt = timestamp();
    t.cancellationReason = reason;
    pushAudit({ entityType: "task", entityId: t.id, action: "task_cancelled", actorType: actor.type, actorId: actor.id, actorName: actor.name, payload: { reason, refundedCredits: t.creditCostLocked } });
    return t;
  },

  // Auth
  async verifyEngagementPasscode(slug, passcode) {
    const e = engagements.find((x) => x.slug === slug);
    return !!e && e.passcode === passcode;
  },
  async getUserById(id) {
    return users.find((u) => u.id === id) ?? null;
  },
  async getUserByEmail(email) {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },
  async listStaff(role) {
    return role ? users.filter((u) => u.role === role && u.isActive) : users.filter((u) => u.isActive);
  },

  // Audit
  async appendAudit(entry) {
    pushAudit(entry);
  },
  async listAudit(filters) {
    let out = [...audit].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (filters.entityType) out = out.filter((a) => a.entityType === filters.entityType);
    if (filters.entityId) out = out.filter((a) => a.entityId === filters.entityId);
    if (filters.actorType) out = out.filter((a) => a.actorType === filters.actorType);
    if (filters.action) out = out.filter((a) => a.action === filters.action);
    if (filters.limit) out = out.slice(0, filters.limit);
    return out;
  },

  // Reports
  async efficiencyReport(filters) {
    let scope = tasks.filter((t) => t.status === "done");
    if (filters.fromDate) scope = scope.filter((t) => (t.completedAt ?? "") >= filters.fromDate!);
    if (filters.toDate) scope = scope.filter((t) => (t.completedAt ?? "") <= filters.toDate!);
    if (filters.serviceId) scope = scope.filter((t) => t.serviceId === filters.serviceId);
    if (filters.executorId) scope = scope.filter((t) => t.assignedTo === filters.executorId);
    if (filters.clientId) {
      const engIds = engagements.filter((e) => e.clientId === filters.clientId).map((e) => e.id);
      scope = scope.filter((t) => engIds.includes(t.engagementId));
    }
    if (filters.brandManagerId) {
      const engIds = engagements.filter((e) => e.brandManagerId === filters.brandManagerId).map((e) => e.id);
      scope = scope.filter((t) => engIds.includes(t.engagementId));
    }

    // Service variance
    const byService = new Map<string, Task[]>();
    for (const t of scope) {
      const arr = byService.get(t.serviceId) ?? [];
      arr.push(t);
      byService.set(t.serviceId, arr);
    }
    const serviceVariance = [...byService.entries()].map(([sid, ts]) => {
      const svc = services.find((s) => s.id === sid)!;
      const avgEst = ts.reduce((s, t) => s + t.estimatedHours, 0) / ts.length;
      const avgAct = ts.reduce((s, t) => s + t.actualHours, 0) / ts.length;
      const variance = avgEst > 0 ? ((avgAct - avgEst) / avgEst) * 100 : 0;
      return {
        serviceId: sid,
        serviceName: svc?.name ?? "Unknown",
        taskCount: ts.length,
        avgEstimatedHours: Number(avgEst.toFixed(2)),
        avgActualHours: Number(avgAct.toFixed(2)),
        variancePct: Number(variance.toFixed(1)),
      };
    }).sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));

    // Per-executor
    const byExec = new Map<string, Task[]>();
    for (const t of scope) {
      if (!t.assignedTo) continue;
      const arr = byExec.get(t.assignedTo) ?? [];
      arr.push(t);
      byExec.set(t.assignedTo, arr);
    }
    const executors = [...byExec.entries()].map(([uid_, ts]) => {
      const u = users.find((x) => x.id === uid_);
      const totalHours = ts.reduce((s, t) => s + t.actualHours, 0);
      const variances = ts.map((t) => (t.estimatedHours > 0 ? ((t.actualHours - t.estimatedHours) / t.estimatedHours) * 100 : 0));
      const avgVar = variances.length ? variances.reduce((s, v) => s + v, 0) / variances.length : 0;
      const onTime = ts.filter((t) => t.actualHours <= t.estimatedHours).length;
      const onTimePct = ts.length ? (onTime / ts.length) * 100 : 0;
      const svcSums = new Map<string, number>();
      for (const t of ts) svcSums.set(t.serviceId, (svcSums.get(t.serviceId) ?? 0) + t.actualHours);
      const topServices = [...svcSums.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([sid, h]) => ({ serviceId: sid, serviceName: services.find((s) => s.id === sid)?.name ?? "Unknown", hours: Number(h.toFixed(2)) }));
      return {
        userId: uid_,
        name: u?.name ?? u?.email ?? "Unknown",
        totalHours: Number(totalHours.toFixed(2)),
        avgVariancePct: Number(avgVar.toFixed(1)),
        onTimePct: Number(onTimePct.toFixed(1)),
        topServices,
      };
    });

    // Per-manager
    const byMgr = new Map<string, Task[]>();
    for (const t of scope) {
      const eng = engagements.find((e) => e.id === t.engagementId);
      if (!eng?.brandManagerId) continue;
      const arr = byMgr.get(eng.brandManagerId) ?? [];
      arr.push(t);
      byMgr.set(eng.brandManagerId, arr);
    }
    const managers = [...byMgr.entries()].map(([uid_, ts]) => {
      const u = users.find((x) => x.id === uid_);
      const credits = ts.reduce((s, t) => s + t.creditCostLocked, 0);
      const internal = ts.reduce((s, t) => {
        return s + t.hoursLog.reduce((acc, h) => {
          const role = roles.find((r) => r.id === h.roleId);
          return acc + (role ? h.hours * role.multiplier * settings.baseHourlyRate : 0);
        }, 0);
      }, 0);
      const revenueInr = credits * settings.creditValue;
      const margin = revenueInr - internal;
      const myEngagements = engagements.filter((e) => e.brandManagerId === uid_ && e.status === "active");
      const utilSum = myEngagements.reduce((s, e) => {
        const bal = computeBalance(e);
        return s + (e.flexCreditsTotal > 0 ? (bal.flexCreditsUsed / e.flexCreditsTotal) * 100 : 0);
      }, 0);
      const utilPct = myEngagements.length ? utilSum / myEngagements.length : 0;
      return {
        userId: uid_,
        name: u?.name ?? u?.email ?? "Unknown",
        creditsDelivered: credits,
        internalCostInr: Math.round(internal),
        marginInr: Math.round(margin),
        utilizationPct: Number(utilPct.toFixed(1)),
      };
    });

    return { serviceVariance, executors, managers };
  },
  async utilizationReport(filters) {
    let active = engagements.filter((e) => e.status === "active");
    if (filters.brandManagerId) active = active.filter((e) => e.brandManagerId === filters.brandManagerId);
    if (filters.clientId) active = active.filter((e) => e.clientId === filters.clientId);
    const rows = active.map((e) => {
      const total = daysBetween(e.startDate, e.endDate);
      const elapsed = Math.max(0, daysBetween(e.startDate, new Date()));
      const balance = computeBalance(e);
      const flexUsedPct = e.flexCreditsTotal > 0 ? (balance.flexCreditsUsed / e.flexCreditsTotal) * 100 : 0;
      const expectedPct = total > 0 ? (elapsed / total) * 100 : 0;
      const flag: "underutilized" | "ontrack" | "overutilized" =
        elapsed / Math.max(total, 1) > 0.5 && flexUsedPct < 40
          ? "underutilized"
          : flexUsedPct > expectedPct + 20
          ? "overutilized"
          : "ontrack";
      return {
        engagementId: e.id,
        clientName: clients.find((c) => c.id === e.clientId)?.name ?? "Unknown",
        daysElapsed: elapsed,
        daysTotal: total,
        flexUsedPct: Number(flexUsedPct.toFixed(1)),
        expectedPct: Number(expectedPct.toFixed(1)),
        flag,
      };
    });
    return {
      rows,
      underutilized: rows.filter((r) => r.flag === "underutilized"),
      overutilized: rows.filter((r) => r.flag === "overutilized"),
    };
  },
};

// Re-export helpers used by ops summary builders.
export function buildSummary(e: Engagement): EngagementSummary {
  const client = clients.find((c) => c.id === e.clientId)!;
  const pkg = packages.find((p) => p.id === e.packageId)!;
  const brandManager = users.find((u) => u.id === e.brandManagerId);
  const balance = computeBalance(e);
  const daysRemaining = Math.max(0, daysBetween(new Date(), e.endDate));
  const engTasks = tasks.filter((t) => t.engagementId === e.id);
  const openTaskCount = engTasks.filter((t) => !["done", "cancelled"].includes(t.status)).length;
  const lastActivityAt = engTasks
    .map((t) => t.completedAt ?? t.submittedAt ?? t.startedAt ?? t.approvedAt ?? t.createdAt)
    .sort()
    .reverse()[0];
  return { engagement: e, client, brandManager, package: pkg, balance, daysRemaining, openTaskCount, lastActivityAt };
}

// Helpers for pages that need to render related entities without re-querying.
export function _mockSnapshot() {
  return { roles, services, packages, clients, engagements, tasks, users, audit, settings };
}

// Used by mock-mode staff signup helpers and tests.
export function _mockUpsertUser(u: Omit<User, "id" | "createdAt"> & { id?: string }): User {
  const existing = users.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
  if (existing) {
    Object.assign(existing, { name: u.name, role: u.role, isActive: u.isActive });
    return existing;
  }
  const next: User = { id: u.id ?? uid(), createdAt: timestamp(), ...u };
  users.push(next);
  return next;
}

export const _STATIC_HELPERS = { computeBalance, formatCredits };
