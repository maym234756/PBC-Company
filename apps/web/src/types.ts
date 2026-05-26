export interface SessionUser {
  id: string;
  name: string;
  email: string;
  title: string;
  avatarInitial: string;
  dealerGroupName: string;
}

export interface StoreOperatorOption {
  id: string;
  name: string;
  title: string;
  avatarInitial: string;
}

export type WorkspaceId = "desktop" | "sales" | "service" | "parts" | "analytics" | "website" | "audit" | "reports" | "boatInventory";
export type RowTone = "lime" | "teal" | "salmon" | "gold" | "violet" | "green" | "gray";
export type CommandTone = "stable" | "accent" | "attention" | "neutral";
export type TaskStatus = "Queued" | "In Progress" | "Blocked" | "Done";
export type TaskNoteKind = "Comment" | "Resolution";
export type TaskSlaPolicySource = "Default" | "Custom";

export interface TaskNoteEntry {
  id: string;
  kind: TaskNoteKind;
  body: string;
  authorUserId: string | null;
  authorName: string;
  authorInitial: string;
  timeLabel: string;
}

export interface AuditTaskSnapshotField {
  label: string;
  value: string;
}

export interface AuditTaskDetail {
  actorName: string;
  actorInitial: string;
  assignedName: string;
  assignedInitial: string;
  lastUpdatedByName: string;
  lastUpdatedByInitial: string;
  latestCommentByName: string | null;
  latestCommentByInitial: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  dueAtLabel: string | null;
  completedAtLabel: string | null;
  notes: TaskNoteEntry[];
  snapshotFields: AuditTaskSnapshotField[];
}

export interface TaskSlaPolicyEntry {
  id: string;
  workspaceId: WorkspaceId;
  workspaceLabel: string;
  action: string;
  slaMinutes: number;
  slaLabel: string;
  source: TaskSlaPolicySource;
  updatedByName: string | null;
  updatedAtLabel: string | null;
  openTaskCount: number;
}

export interface ActivityLogEntry {
  id: string;
  timeLabel: string;
  label: string;
  detail: string;
  tone: CommandTone;
  actorUserId: string | null;
  actorName: string;
  actorInitial: string;
}

export interface TaskQueueEntry {
  id: string;
  timeLabel: string;
  action: string;
  detail: string;
  status: TaskStatus;
  tone: CommandTone;
  actorUserId: string | null;
  actorName: string;
  actorInitial: string;
  assignedUserId: string | null;
  assignedName: string;
  assignedInitial: string;
  lastUpdatedByUserId: string | null;
  lastUpdatedByName: string;
  lastUpdatedByInitial: string;
  ageLabel: string;
  slaLabel: string;
  breachLabel: string;
  isOverdue: boolean;
  commentCount: number;
  latestCommentPreview: string | null;
  latestCommentByUserId: string | null;
  latestCommentByName: string | null;
  latestCommentByInitial: string | null;
  resolutionNote: string | null;
  notes: TaskNoteEntry[];
}

export interface StoreOption {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  dealerGroupName: string;
  statusLine: string;
}

export interface SessionState {
  user: SessionUser;
  stores: StoreOption[];
  selectedStoreId: string | null;
}

export interface LoginPayload {
  user: SessionUser;
  stores: StoreOption[];
}

export interface NavigationLeafItem {
  label: string;
  keywords?: string[];
}

export interface NavigationBranchItem {
  label: string;
  items: NavigationMenuItem[];
}

export type NavigationMenuItem = string | NavigationLeafItem | NavigationBranchItem;

export interface NavigationGroup {
  label: string;
  items: NavigationMenuItem[];
}

export interface DashboardStat {
  label: string;
  value: string;
  caption: string;
}

export interface ModuleCard {
  code: string;
  name: string;
  category: string;
  status: string;
  description: string;
  headline: string;
  ownerTeam: string;
  navGroup: string;
}

export interface WebsiteFeed {
  id?: string;
  brand: string;
  domain: string;
  status: string;
  inventoryCount: number;
  leadsToday: number;
  lastSyncLabel: string;
}

export interface ActivityItem {
  label: string;
  detail: string;
  tone: string;
}

export interface DashboardPayload {
  store: {
    id: string;
    code: string;
    name: string;
    city: string;
    state: string;
    dealerGroupName: string;
    summary: string;
  };
  navigation: NavigationGroup[];
  stats: DashboardStat[];
  modules: ModuleCard[];
  websiteFeeds: WebsiteFeed[];
  activity: ActivityItem[];
  operators: StoreOperatorOption[];
  workspaceCounts: {
    sales: number;
    service: number;
    parts: number;
    website: number;
  };
}

export interface DesktopWorkspaceRow {
  id: string;
  module: string;
  status: string;
  headline: string;
}

export interface SalesWorkspaceRow {
  id: string;
  date: string;
  worksheet: string;
  stock: string;
  make: string;
  model: string;
  cashPrice: string;
  finalized: string;
  customer: string;
  year: string;
  vin: string;
  tone: RowTone;
}

export interface ServiceWorkspaceRow {
  id: string;
  inDate: string;
  roNumber: string;
  orderType: "Estimate" | "Repair Order";
  customerName: string;
  stockNumber: string;
  model: string;
  serviceWriter: string;
  roStatus: string;
  category: string;
  maker: string;
  note: string;
  tone: RowTone;
}

export type ServiceNotificationKind = "customer" | "techComplete" | "partsReceived" | "promiseRisk";

export interface ServiceNotificationEntry {
  id: string;
  customerName: string;
  detail: string;
  headline: string;
  kind: ServiceNotificationKind;
  roNumber: string;
  sourceLabel: string;
  timeLabel: string;
  tone: CommandTone;
  unread: boolean;
}

export interface PartsWorkspaceRow {
  id: string;
  partNumber: string;
  secondary: string;
  description: string;
  supplier: string;
  category: string;
  orderType: string;
  quantity: string;
  orderCost: string;
  source: string;
  tone: RowTone;
}

export interface AnalyticsWorkspaceRow {
  id: string;
  label: string;
  status: string;
  ownerTeam: string;
  headline: string;
}

export interface AuditWorkspaceRow {
  id: string;
  kind: "Task" | "Activity";
  taskId: string | null;
  storeName: string;
  storeCode: string;
  workspaceId: WorkspaceId;
  workspaceLabel: string;
  status: string;
  summary: string;
  detail: string;
  tone: CommandTone;
  operatorName: string;
  assigneeName: string;
  ageLabel: string;
  slaLabel: string;
  breachLabel: string;
  commentCount: number;
  latestCommentPreview: string | null;
  resolutionNote: string | null;
  timeLabel: string;
  taskDetail: AuditTaskDetail | null;
}

export interface WebsiteWorkspaceRow {
  id: string;
  brand: string;
  domain: string;
  status: string;
  inventoryCount: number;
  leadsToday: number;
  lastSyncLabel: string;
}

export type WebsiteWorkspaceView = "feed" | "customSettings";

export type WorkspacePayload =
  | {
      workspaceId: "desktop";
      title: string;
      rows: DesktopWorkspaceRow[];
    }
  | {
      workspaceId: "sales";
      title: string;
      rows: SalesWorkspaceRow[];
    }
  | {
      workspaceId: "service";
      title: string;
      rows: ServiceWorkspaceRow[];
      notifications: ServiceNotificationEntry[];
    }
  | {
      workspaceId: "parts";
      title: string;
      rows: PartsWorkspaceRow[];
    }
  | {
      workspaceId: "analytics";
      title: string;
      rows: AnalyticsWorkspaceRow[];
    }
  | {
      workspaceId: "audit";
      title: string;
      rows: AuditWorkspaceRow[];
      policies: TaskSlaPolicyEntry[];
    }
  | {
      workspaceId: "website";
      title: string;
      rows: WebsiteWorkspaceRow[];
    }
  | {
      workspaceId: "reports";
      title: string;
      rows: never[];
    }
  | {
      workspaceId: "boatInventory";
      title: string;
      rows: unknown[];
    };
