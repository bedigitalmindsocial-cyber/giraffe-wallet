// Storage interface for Giraffe Wallet. Auto-switches between an in-memory
// mock (default for local dev) and Supabase (when env vars are set).

import type {
  Actor,
  AuditEntry,
  AuditFilters,
  Client,
  ClientInput,
  EfficiencyReport,
  Engagement,
  EngagementFilters,
  EngagementInput,
  EngagementSummary,
  HoursEntry,
  Package,
  PackageInput,
  ReportFilters,
  Role,
  RoleInput,
  Service,
  ServiceFilters,
  ServiceInput,
  Settings,
  SettingsInput,
  Task,
  TaskFilters,
  TaskInput,
  User,
  UtilizationReport,
} from "@/types";
import { mockStore } from "./mock";
import { supabaseStore } from "./supabase";

export interface DataStore {
  // Catalog: roles
  getRoles(): Promise<Role[]>;
  upsertRole(role: RoleInput, actor: Actor): Promise<Role>;
  deleteRole(id: string): Promise<void>;

  // Catalog: services
  getServices(filters?: ServiceFilters): Promise<Service[]>;
  getService(id: string): Promise<Service | null>;
  upsertService(service: ServiceInput, actor: Actor): Promise<Service>;
  archiveService(id: string, actor: Actor): Promise<void>;

  // Catalog: packages
  getPackages(): Promise<Package[]>;
  upsertPackage(pkg: PackageInput, actor: Actor): Promise<Package>;

  // Catalog: settings
  getSettings(): Promise<Settings>;
  previewSettings(s: SettingsInput): Promise<{ id: string; name: string; oldCost: number; newCost: number }[]>;
  updateSettings(s: SettingsInput, actor: Actor): Promise<{ settings: Settings; updatedServices: Service[] }>;

  // Clients
  listClients(forUserId?: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  createClient(c: ClientInput, actor: Actor): Promise<Client>;

  // Engagements
  listEngagements(filters?: EngagementFilters, forUserId?: string): Promise<EngagementSummary[]>;
  getEngagement(id: string): Promise<Engagement | null>;
  getEngagementBySlug(slug: string): Promise<Engagement | null>;
  getEngagementSummary(id: string): Promise<EngagementSummary | null>;
  createEngagement(e: EngagementInput, actor: Actor): Promise<Engagement>;
  pauseEngagement(id: string, reason: string, actor: Actor): Promise<void>;
  resumeEngagement(id: string, actor: Actor): Promise<void>;
  upgradeEngagement(id: string, newPackageId: string, actor: Actor): Promise<void>;
  reassignBrandManager(id: string, newUserId: string, actor: Actor): Promise<void>;

  // Tasks
  listTasks(engagementId: string, filters?: TaskFilters): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(t: TaskInput, actor: Actor): Promise<Task>;
  approveTask(id: string, actor: Actor, byClient: boolean, reason?: string): Promise<Task>;
  assignTask(id: string, userId: string, actor: Actor): Promise<Task>;
  startTask(id: string, actor: Actor): Promise<Task>;
  submitTask(id: string, hoursLog: Omit<HoursEntry, "id" | "taskId" | "loggedAt">[], actor: Actor): Promise<Task>;
  requestRevision(id: string, note: string, actor: Actor): Promise<Task>;
  completeTask(id: string, actor: Actor): Promise<Task>;
  cancelTask(id: string, reason: string, actor: Actor): Promise<Task>;

  // Auth
  verifyEngagementPasscode(slug: string, passcode: string): Promise<boolean>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  listStaff(role?: User["role"]): Promise<User[]>;

  // Audit
  appendAudit(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void>;
  listAudit(filters: AuditFilters): Promise<AuditEntry[]>;

  // Reports
  efficiencyReport(filters: ReportFilters): Promise<EfficiencyReport>;
  utilizationReport(filters: ReportFilters): Promise<UtilizationReport>;
}

let _store: DataStore | null = null;

export function getStore(): DataStore {
  if (_store) return _store;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    _store = supabaseStore;
    if (typeof console !== "undefined") console.log("[wallet] Using Supabase store (real persistence)");
  } else {
    const isProductionRuntime = process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";
    if (isProductionRuntime) {
      throw new Error(
        "Giraffe Wallet is running in production without Supabase persistence. " +
          "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before deploying.",
      );
    }
    _store = mockStore;
    if (typeof console !== "undefined") {
      console.log(
        "[wallet] Using in-memory mock store (no persistence). " +
          "Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable Supabase.",
      );
    }
  }
  return _store!;
}
