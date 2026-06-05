// Domain types for Giraffe Wallet. These mirror the Postgres schema in
// supabase/migrations/0001_init.sql. The DataStore interface below is
// implemented by both the in-memory mock store and the Supabase store.

export type StaffRole = "super_admin" | "manager" | "executor";
export type ActorType = StaffRole | "client" | "system";

export interface Actor {
  type: ActorType;
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
  multiplier: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleInput {
  id?: string;
  name: string;
  multiplier: number;
  notes?: string;
}

export interface Settings {
  baseHourlyRate: number;
  markupMultiplier: number;
  creditValue: number;
  updatedAt: string;
}

export interface SettingsInput {
  baseHourlyRate: number;
  markupMultiplier: number;
  creditValue: number;
}

export type ServiceTag = "NEW" | "POPULAR" | "PROMO" | "DISCONTINUED" | null;
export type ServiceMethodTag = "AI POWERED" | "HYBRID" | "ARTISAN" | null;

export interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  defaultRoleId: string;
  avgHours: number;
  includedRevisions: number;
  tag: ServiceTag;
  methodTag: ServiceMethodTag;
  creditCost: number;
  creditCostOverride: boolean;
  creditCostOverrideReason?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceInput {
  id?: string;
  name: string;
  description?: string;
  category: string;
  defaultRoleId: string;
  avgHours: number;
  includedRevisions?: number;
  tag?: ServiceTag;
  methodTag?: ServiceMethodTag;
  creditCost?: number;
  creditCostOverride?: boolean;
  creditCostOverrideReason?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ServiceFilters {
  search?: string;
  categories?: string[];
  roleIds?: string[];
  tags?: ServiceTag[];
  methodTags?: ServiceMethodTag[];
  activeOnly?: boolean;
}

export interface Package {
  id: string;
  name: string;
  quarterlyFeeInr: number;
  totalCredits: number;
  coreCredits: number;
  flexCredits: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PackageInput {
  id?: string;
  name: string;
  quarterlyFeeInr: number;
  totalCredits: number;
  coreCredits: number;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  sector?: string;
  city?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientInput {
  name: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  sector?: string;
  city?: string;
  notes?: string;
}

export type EngagementStatus = "active" | "paused" | "expired" | "cancelled";

export interface Engagement {
  id: string;
  clientId: string;
  slug: string;
  packageId: string;
  startDate: string;
  endDate: string;
  passcode: string;
  totalCredits: number;
  coreCreditsTotal: number;
  flexCreditsTotal: number;
  brandManagerId?: string;
  status: EngagementStatus;
  pausedAt?: string;
  pausedReason?: string;
  pauseDaysConsumed: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementInput {
  clientId: string;
  packageId: string;
  startDate: string;
  endDate?: string;
  brandManagerId?: string;
  notes?: string;
}

export interface EngagementFilters {
  brandManagerId?: string;
  status?: EngagementStatus;
  packageId?: string;
  search?: string;
  endingWithinDays?: number;
}

export interface EngagementBalance {
  engagementId: string;
  coreCreditsTotal: number;
  coreCreditsUsed: number;
  coreCreditsRemaining: number;
  flexCreditsTotal: number;
  flexCreditsUsed: number;
  flexCreditsRemaining: number;
}

export interface EngagementSummary {
  engagement: Engagement;
  client: Client;
  brandManager?: User;
  package: Package;
  balance: EngagementBalance;
  daysRemaining: number;
  openTaskCount: number;
  lastActivityAt?: string;
}

export type TaskStatus =
  | "quoted"
  | "approved"
  | "in_progress"
  | "submitted"
  | "revision"
  | "done"
  | "cancelled";

export type TaskBucket = "core" | "flex";

export interface Task {
  id: string;
  engagementId: string;
  serviceId: string;
  title: string;
  brief?: string;
  status: TaskStatus;
  bucket: TaskBucket;
  creditCostLocked: number;
  executorRoleId: string;
  assignedTo?: string;
  estimatedHours: number;
  actualHours: number;
  revisionCount: number;
  revisionsIncluded: number;
  isSystemGenerated: boolean;
  approvedByClient: boolean;
  approvedByManagerOnBehalf: boolean;
  approvalReason?: string;
  createdBy?: string;
  createdAt: string;
  quotedAt: string;
  approvedAt?: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  hoursLog: HoursEntry[];
}

export interface TaskInput {
  engagementId: string;
  serviceId: string;
  title: string;
  brief?: string;
  bucket: TaskBucket;
}

export interface TaskFilters {
  status?: TaskStatus[];
  assignedTo?: string;
  bucket?: TaskBucket;
}

export interface HoursEntry {
  id: string;
  taskId: string;
  roleId: string;
  hours: number;
  loggedBy: string;
  loggedAt: string;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: StaffRole;
  isActive: boolean;
  whatsappNumber?: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: ActorType;
  actorId: string;
  actorName: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditFilters {
  entityType?: string;
  entityId?: string;
  actorType?: ActorType;
  action?: string;
  limit?: number;
}

// Reports

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  brandManagerId?: string;
  executorId?: string;
  serviceId?: string;
  clientId?: string;
}

export interface ServiceVarianceRow {
  serviceId: string;
  serviceName: string;
  taskCount: number;
  avgEstimatedHours: number;
  avgActualHours: number;
  variancePct: number;
}

export interface ExecutorRow {
  userId: string;
  name: string;
  totalHours: number;
  avgVariancePct: number;
  onTimePct: number;
  topServices: { serviceId: string; serviceName: string; hours: number }[];
}

export interface ManagerRow {
  userId: string;
  name: string;
  creditsDelivered: number;
  internalCostInr: number;
  marginInr: number;
  utilizationPct: number;
}

export interface EfficiencyReport {
  serviceVariance: ServiceVarianceRow[];
  executors: ExecutorRow[];
  managers: ManagerRow[];
}

export interface UtilizationRow {
  engagementId: string;
  clientName: string;
  daysElapsed: number;
  daysTotal: number;
  flexUsedPct: number;
  expectedPct: number;
  flag: "underutilized" | "ontrack" | "overutilized";
}

export interface UtilizationReport {
  rows: UtilizationRow[];
  underutilized: UtilizationRow[];
  overutilized: UtilizationRow[];
}
