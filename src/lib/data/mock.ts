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
import { autoCreditCost } from "@/lib/credits";
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
  avgHours: number;
  includedRevisions?: number;
  tag?: Service["tag"];
  methodTag?: Service["methodTag"];
}

function seedServices(): void {
  const data: ServiceSeed[] = [
    { name: "Social post (single)", description: "One static post with caption, hashtags, and platform sizing.", category: "Social", roleName: "Executive", avgHours: 1.5, tag: "POPULAR", methodTag: "AI POWERED" },
    { name: "Social carousel (5 slides)", description: "Multi-slide post with copy and design.", category: "Social", roleName: "Executive", avgHours: 4.0, tag: null, methodTag: "HYBRID" },
    { name: "Blog graphic", description: "Header graphic for an article. Two revisions included.", category: "Design", roleName: "Executive", avgHours: 3.0, tag: null, methodTag: "HYBRID" },
    { name: "Web page (single)", description: "One landing page or content page, copy plus design.", category: "Design", roleName: "Manager", avgHours: 8.0, tag: null, methodTag: "HYBRID" },
    { name: "Long-form article", description: "1200 to 1500 word article with research and edit pass.", category: "Content", roleName: "Manager", avgHours: 8.0, tag: null, methodTag: "HYBRID" },
    { name: "Whitepaper or case study", description: "Long-form research piece with structure and design.", category: "Content", roleName: "Senior Manager", avgHours: 16.0, tag: null, methodTag: "ARTISAN" },
    { name: "Pitch deck", description: "12 to 15 slide deck with structure, copy, and design.", category: "Sales Enablement", roleName: "Senior Manager", avgHours: 12.0, tag: null, methodTag: "ARTISAN" },
    { name: "Brand strategy doc", description: "Positioning, messaging architecture, brand voice.", category: "Strategy", roleName: "Senior Partner", avgHours: 15.0, tag: "NEW", methodTag: "ARTISAN" },
    { name: "Press article", description: "PR-ready article for placement, including pitch note.", category: "PR", roleName: "Manager", avgHours: 6.0, tag: null, methodTag: "ARTISAN" },
    { name: "Email campaign", description: "One email with copy, design, and segmentation note.", category: "Email", roleName: "Executive", avgHours: 3.0, tag: null, methodTag: "AI POWERED" },
    { name: "Video ad (15s to 30s)", description: "Script, edit, and one revision.", category: "Video", roleName: "Manager", avgHours: 12.0, tag: null, methodTag: "HYBRID" },
    { name: "Photography (half day)", description: "On-site product or environment shoot.", category: "Production", roleName: "Manager", avgHours: 5.0, tag: null, methodTag: "ARTISAN" },
    { name: "Infographic", description: "Single static infographic with research and design.", category: "Design", roleName: "Executive", avgHours: 4.0, tag: null, methodTag: "HYBRID" },
    { name: "SEO audit", description: "Technical and content audit with prioritized action list.", category: "SEO", roleName: "Manager", avgHours: 6.0, tag: null, methodTag: "HYBRID" },
    { name: "New Webpage Template", description: "New reusable webpage structure with layout, core copy blocks, visual direction, and responsive implementation notes.", category: "Web Development", roleName: "Manager", avgHours: 5.0, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "New Webpage Variation", description: "Adapt an approved webpage template for a new offer, audience, or campaign with revised copy and imagery.", category: "Web Development", roleName: "Executive", avgHours: 4.0, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "AI Webpage Copy & Image Variation", description: "Fast AI-generated page copy and image-direction variant, reviewed and polished by an expert before delivery.", category: "Web Development", roleName: "Executive", avgHours: 2.0, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Text & Image Changes (per webpage)", description: "Small copy swaps, image replacements, section edits, and formatting updates on an existing webpage.", category: "Website Changes", roleName: "Executive", avgHours: 0.8, includedRevisions: 1, tag: null, methodTag: "AI POWERED" },
    { name: "Research & Content Writing (100 words)", description: "Research-backed copy block or article section delivered in 100-word units with an edit pass.", category: "Content Writing", roleName: "Executive", avgHours: 1.6, includedRevisions: 1, tag: null, methodTag: "AI POWERED" },
    { name: "Website Graphics", description: "Custom website visual asset such as a section graphic, hero support visual, feature illustration, or landing-page banner.", category: "Website Graphics", roleName: "Executive", avgHours: 3.2, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "AI Website Graphic Variation", description: "AI-assisted website graphic variant from an existing direction, refined for brand fit and clean delivery.", category: "Website Graphics", roleName: "Executive", avgHours: 1.2, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Blog Graphics", description: "Article header or supporting blog visual sized for web publishing and social sharing.", category: "Website Graphics", roleName: "Executive", avgHours: 2.4, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "AI Blog Graphic Variation", description: "Rapid AI-assisted blog visual variation, curated and polished for brand consistency.", category: "Website Graphics", roleName: "Executive", avgHours: 1.0, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Static Posts/Ads", description: "Single static social post or ad creative with caption-ready messaging, platform sizing, and export files.", category: "Social Media Creatives", roleName: "Executive", avgHours: 2.4, includedRevisions: 2, tag: "POPULAR", methodTag: "AI POWERED" },
    { name: "AI Static Post/Ad Variation", description: "Fast AI-powered variation of an approved static post or ad, expert-polished for brand tone and layout.", category: "Social Media Creatives", roleName: "Executive", avgHours: 1.2, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Video Ads (<30 Seconds)", description: "Short-form video ad with script, edit direction, basic motion, and one platform-ready export under 30 seconds.", category: "Social Media Creatives", roleName: "Manager", avgHours: 2.4, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Video Ads (<60 Seconds)", description: "Video ad up to 60 seconds with script, edit plan, motion direction, and export-ready delivery.", category: "Social Media Creatives", roleName: "Manager", avgHours: 4.0, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Video Ads (>60 Seconds)", description: "Longer-form video ad or explainer requiring deeper scripting, sequencing, edit supervision, and review.", category: "Social Media Creatives", roleName: "Manager", avgHours: 8.0, includedRevisions: 2, tag: null, methodTag: "ARTISAN" },
    { name: "AI Video Ad Concept Cut (<30 Seconds)", description: "AI-assisted short video concept, script, and first-cut direction for quick testing before a full production pass.", category: "Social Media Creatives", roleName: "Executive", avgHours: 3.2, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Print Ads", description: "Print-ready advertisement concept with copy, layout, visual direction, and press/export specifications.", category: "Social Media Creatives", roleName: "Manager", avgHours: 3.2, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Carousel Ads", description: "Multi-slide ad creative with structured narrative, slide copy, design, and platform-ready exports.", category: "Social Media Creatives", roleName: "Executive", avgHours: 4.0, includedRevisions: 2, tag: "POPULAR", methodTag: "HYBRID" },
    { name: "AI Carousel Ad Variation", description: "AI-assisted carousel variation using an approved concept, polished by an expert for clarity and brand fit.", category: "Social Media Creatives", roleName: "Executive", avgHours: 1.6, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Social Media Covers", description: "Platform cover, header, or profile-banner design adapted to channel dimensions and brand requirements.", category: "Social Media Creatives", roleName: "Executive", avgHours: 3.2, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Presentation & Pitch Decks (up to 8 pages)", description: "Per-page deck design and copy polish for concise investor, sales, or internal presentations up to 8 pages.", category: "Presentation & Documents", roleName: "Manager", avgHours: 1.6, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Presentation & Pitch Decks (more than 8 pages)", description: "Per-page continuation pricing for larger decks once the structure and direction are already established.", category: "Presentation & Documents", roleName: "Manager", avgHours: 1.2, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Presentation Templates", description: "Reusable presentation template page with master visual system, typography, components, and page structure.", category: "Presentation & Documents", roleName: "Manager", avgHours: 1.6, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "AI Presentation Draft (up to 8 slides)", description: "AI-assisted first draft for an 8-slide presentation, expert-curated into a coherent narrative and structure.", category: "Presentation & Documents", roleName: "Executive", avgHours: 4.0, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Infographics (per page)", description: "Single infographic page with information hierarchy, visual structure, copy cleanup, and export-ready design.", category: "Presentation & Documents", roleName: "Executive", avgHours: 2.4, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "AI Infographic Concept Variation", description: "AI-assisted infographic concept or layout variation refined by an expert for readability and brand alignment.", category: "Presentation & Documents", roleName: "Executive", avgHours: 1.2, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Sales Sheets (per page)", description: "One-page sales sheet or product/service explainer with copy structure, design, and export-ready files.", category: "Presentation & Documents", roleName: "Executive", avgHours: 2.4, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Reports (per page)", description: "Designed report page with cleaned-up content, visual hierarchy, tables/charts where needed, and final export.", category: "Presentation & Documents", roleName: "Executive", avgHours: 2.4, includedRevisions: 2, tag: null, methodTag: "HYBRID" },
    { name: "Print Collateral: New Design", description: "New print design for flyers, business cards, posters, signage, stationery, certificates, billboards, covers, T-shirts, inserts, or similar collateral.", category: "Print Media", roleName: "Manager", avgHours: 4.0, includedRevisions: 2, tag: null, methodTag: "ARTISAN" },
    { name: "Print Collateral: Variation", description: "Variation of an approved print collateral design for another format, size, language, audience, or offer.", category: "Print Media", roleName: "Manager", avgHours: 2.0, includedRevisions: 1, tag: null, methodTag: "HYBRID" },
    { name: "AI Print Collateral Variation", description: "AI-assisted print collateral variation from an approved design direction, expert-checked for layout and production readiness.", category: "Print Media", roleName: "Executive", avgHours: 2.0, includedRevisions: 1, tag: "NEW", methodTag: "AI POWERED" },
    { name: "Changes to Print Graphics (after 10 days)", description: "Post-delivery changes to print graphics requested after the included delivery window has passed.", category: "Revisions", roleName: "Executive", avgHours: 1.6, includedRevisions: 1, tag: null, methodTag: "HYBRID" },
    { name: "Strategy: Quarterly Plan (system task)", description: "Quarterly roadmap and monthly review.", category: "Strategy (Core)", roleName: "Manager", avgHours: 16.0, methodTag: "ARTISAN" },
    { name: "Website Maintenance (system task)", description: "Uptime, backups, security patches, performance.", category: "Tech (Core)", roleName: "Manager", avgHours: 10.0, methodTag: "AI POWERED" },
    { name: "Monthly Content System (system task)", description: "One pillar piece plus derivative posts and emails for the month.", category: "Content (Core)", roleName: "Manager", avgHours: 14.0, methodTag: "HYBRID" },
  ];
  let i = 0;
  for (const s of data) {
    const role = roleByName(s.roleName);
    const cost = autoCreditCost(s.avgHours, role.multiplier, settings);
    services.push({
      id: uid(),
      name: s.name,
      description: s.description,
      category: s.category,
      defaultRoleId: role.id,
      avgHours: s.avgHours,
      includedRevisions: s.includedRevisions ?? 2,
      tag: s.tag ?? null,
      methodTag: s.methodTag ?? null,
      creditCost: cost,
      creditCostOverride: false,
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
    creditCostLocked: service.creditCost,
    executorRoleId: service.defaultRoleId,
    estimatedHours: service.avgHours,
    actualHours: 0,
    revisionCount: 0,
    revisionsIncluded: service.includedRevisions,
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
        creditCostLocked: svc.creditCost,
        executorRoleId: svc.defaultRoleId,
        estimatedHours: svc.avgHours,
        actualHours: 0,
        revisionCount: 0,
        revisionsIncluded: svc.includedRevisions,
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
    if (filters?.tags?.length) out = out.filter((s) => filters.tags!.includes(s.tag));
    if (filters?.methodTags?.length) out = out.filter((s) => filters.methodTags!.includes(s.methodTag));
    if (filters?.activeOnly) out = out.filter((s) => s.isActive);
    return out.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
  async getService(id) {
    return services.find((s) => s.id === id) ?? null;
  },
  async upsertService(input, actor) {
    const role = roles.find((r) => r.id === input.defaultRoleId);
    if (!role) throw new Error("Default role not found");
    const computed = autoCreditCost(input.avgHours, role.multiplier, settings);
    const cost = input.creditCostOverride && typeof input.creditCost === "number" ? input.creditCost : computed;

    const now = timestamp();
    const id = input.id ?? uid();
    const existing = services.find((s) => s.id === id);
    const tag = input.tag ?? null;
    const methodTag = input.methodTag ?? null;
    const isActive = tag === "DISCONTINUED" ? false : input.isActive ?? true;

    const next: Service = existing
      ? {
          ...existing,
          name: input.name,
          description: input.description,
          category: input.category,
          defaultRoleId: input.defaultRoleId,
          avgHours: input.avgHours,
          includedRevisions: input.includedRevisions ?? existing.includedRevisions,
          tag,
          methodTag,
          creditCost: cost,
          creditCostOverride: !!input.creditCostOverride,
          creditCostOverrideReason: input.creditCostOverrideReason,
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
          avgHours: input.avgHours,
          includedRevisions: input.includedRevisions ?? 2,
          tag,
          methodTag,
          creditCost: cost,
          creditCostOverride: !!input.creditCostOverride,
          creditCostOverrideReason: input.creditCostOverrideReason,
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
    s.tag = "DISCONTINUED";
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
  async previewSettings(s) {
    return services
      .filter((svc) => !svc.creditCostOverride)
      .map((svc) => {
        const role = roles.find((r) => r.id === svc.defaultRoleId)!;
        const newCost = autoCreditCost(svc.avgHours, role.multiplier, s);
        return { id: svc.id, name: svc.name, oldCost: svc.creditCost, newCost };
      })
      .filter((row) => row.oldCost !== row.newCost);
  },
  async updateSettings(input, actor) {
    const previews = await this.previewSettings(input);
    settings = {
      baseHourlyRate: input.baseHourlyRate,
      markupMultiplier: input.markupMultiplier,
      creditValue: input.creditValue,
      updatedAt: timestamp(),
    };
    const updated: Service[] = [];
    for (const p of previews) {
      const svc = services.find((s) => s.id === p.id);
      if (!svc) continue;
      svc.creditCost = p.newCost;
      svc.updatedAt = timestamp();
      updated.push(svc);
    }
    pushAudit({
      entityType: "settings",
      entityId: "settings",
      action: "settings_updated",
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      payload: { settings, recalcedServices: previews },
    });
    return { settings, updatedServices: updated };
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
    if (!svc.isActive || svc.tag === "DISCONTINUED") throw new Error("Service is not available");

    const balance = computeBalance(eng);
    if (input.bucket === "flex" && balance.flexCreditsRemaining < svc.creditCost) {
      throw new Error(`Insufficient flex credits. Need ${svc.creditCost - balance.flexCreditsRemaining} more.`);
    }
    if (input.bucket === "core" && balance.coreCreditsRemaining < svc.creditCost) {
      throw new Error(`Insufficient core credits. Need ${svc.creditCost - balance.coreCreditsRemaining} more.`);
    }

    const t: Task = {
      id: uid(),
      engagementId: eng.id,
      serviceId: svc.id,
      title: input.title,
      brief: input.brief,
      status: "quoted",
      bucket: input.bucket,
      creditCostLocked: svc.creditCost,
      executorRoleId: svc.defaultRoleId,
      estimatedHours: svc.avgHours,
      actualHours: 0,
      revisionCount: 0,
      revisionsIncluded: svc.includedRevisions,
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
