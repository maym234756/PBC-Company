import { Fragment, startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  cleanupServiceUtilityQaTasks,
  createActivityLog,
  createServiceOrder,
  createTaskNote,
  duplicateServiceOrder,
  getActivityLog,
  getDashboard,
  getServiceOrderDetail,
  getTaskQueue,
  getWorkspace,
  previewTaskSlaPolicyCopy,
  runTaskSlaPolicyAction,
  submitWorkflowAction,
  type CreateServiceOrderResponse,
  type ServiceOrderActionRequest,
  type ServiceOrderPartCatalogEntry,
  type TaskSlaPolicyCopyPreviewResponse,
  type WorkflowActionResponse,
  updateServiceOrderDetail,
  updateTaskAssignee,
  updateTaskSlaPolicy,
  updateTaskStatus
} from "../api";
import { StoreSelectModal } from "../components/StoreSelectModal";
import { TopTabs } from "../components/TopTabs";
import {
  isWorkspaceId,
  legacyFallbackNavigation,
  quickLaunchButtons,
  resolveWorkspaceFromMenuItem,
  workspaceDefinitions,
  workspaceOrder,
  type QuickLaunchButton
} from "../lightspeedReference";
import { resolveWorkspaceMenuIntent, type WorkspaceMenuIntent } from "../workspaceMenuIntents";
import type {
  ActivityLogEntry,
  AuditWorkspaceRow,
  AnalyticsWorkspaceRow,
  CommandTone,
  DashboardPayload,
  DesktopWorkspaceRow,
  NavigationGroup,
  NavigationMenuItem,
  PartsWorkspaceRow,
  RowTone,
  SalesWorkspaceRow,
  ServiceNotificationEntry,
  ServiceWorkspaceRow,
  SessionState,
  StoreOperatorOption,
  TaskNoteKind,
  TaskSlaPolicyEntry,
  TaskStatus,
  TaskQueueEntry,
  WebsiteWorkspaceRow,
  WorkspaceId,
  WorkspacePayload
} from "../types";

interface DashboardPageProps {
  session: SessionState;
  activeStoreId: string;
  workspaceId: WorkspaceId;
  onSelectStore: (storeId: string) => void;
  onSignOut: () => void;
}

interface OpenServiceRepairOrderOptions {
  roNumber: string;
  customerName?: string | null;
  taskId?: string | null;
  returnToAuditStoreId?: string | null;
  returnToCleanupStoreId?: string | null;
}

interface ServiceDetailWindow {
  customerName: string;
  roNumber: string;
  storeId: string;
}

interface ServiceAuditReturnContext {
  label: string;
  subtitle: string;
}

interface OpenWindowsContextMenuState {
  targetWorkspaceId: WorkspaceId | null;
}

interface OpenWindowDropState {
  key: string;
  position: "before" | "after";
}

type OpenWindowRailItem =
  | {
      isActive: boolean;
      key: string;
      kind: "workspace";
      workspaceId: WorkspaceId;
    }
  | {
      isActive: boolean;
      key: string;
      kind: "detail";
      windowEntry: ServiceDetailWindow;
    };

type DesktopWidgetType =
  | "scoreboard"
  | "trendLine"
  | "laneGraph"
  | "reportTable"
  | "goalGauge"
  | "funnelBoard"
  | "attentionBoard"
  | "openWindows"
  | "operatingLanes"
  | "activityFeed";

type DesktopWidgetView = "cards" | "compact" | "line" | "area" | "bars" | "donut" | "list" | "timeline" | "table" | "gauge" | "funnel";
type DesktopWidgetWidth = "half" | "full";
type DesktopWidgetHeight = "compact" | "standard" | "tall";
type DesktopWidgetShape = "rectangle" | "square" | "oval" | "circle";
type DesktopWidgetLane = "left" | "spotlight" | "right";

interface DesktopWidgetDefinition {
  defaultTitle: string;
  defaultView: DesktopWidgetView;
  defaultWidth: DesktopWidgetWidth;
  defaultHeight: DesktopWidgetHeight;
  defaultLane: DesktopWidgetLane;
  defaultShape: DesktopWidgetShape;
  description: string;
  label: string;
  type: DesktopWidgetType;
  views: Array<{
    id: DesktopWidgetView;
    label: string;
  }>;
}

interface DesktopWidgetConfig {
  id: string;
  type: DesktopWidgetType;
  title: string;
  view: DesktopWidgetView;
  width: DesktopWidgetWidth;
  height: DesktopWidgetHeight;
  lane: DesktopWidgetLane;
  shape: DesktopWidgetShape;
}

interface DesktopDashboardConfig {
  id: string;
  name: string;
  widgets: DesktopWidgetConfig[];
}

interface DesktopDashboardPreference {
  activeDashboardId: string;
  dashboards: DesktopDashboardConfig[];
}

type DesktopDashboardManagerMode = "create" | "duplicate" | "rename" | "delete";

interface DesktopMetricPoint {
  label: string;
  value: number;
  displayValue: string;
}

interface DesktopReportRow {
  id: string;
  insight: string;
  label: string;
  status: "stable" | "attention" | "neutral";
  statusLabel: string;
  value: string;
  viewLabel: string;
}

interface DesktopGaugeMetric {
  dashOffset: number;
  label: string;
  percent: number;
  target: string;
  tone: "stable" | "attention" | "neutral";
  value: string;
}

interface DesktopFunnelStep {
  conversionLabel: string;
  displayValue: string;
  id: string;
  label: string;
  tone: "stable" | "attention" | "neutral";
  widthPercent: number;
}

const OPEN_WINDOWS_STORAGE_PREFIX = "marine-cloud-open-windows";
const OPEN_WINDOW_ORDER_STORAGE_PREFIX = "marine-cloud-open-window-order";
const OPEN_SERVICE_DETAIL_WINDOWS_STORAGE_PREFIX = "marine-cloud-open-service-detail-windows";
const SERVICE_NOTIFICATION_RAIL_STORAGE_PREFIX = "marine-cloud-service-notification-rail";
const RECENT_SERVICE_ROW_HIGHLIGHTS_STORAGE_PREFIX = "marine-cloud-recent-service-row-highlights";
const DESKTOP_WIDGETS_STORAGE_PREFIX = "marine-cloud-desktop-widgets";

const desktopWidgetCatalog: DesktopWidgetDefinition[] = [
  {
    type: "scoreboard",
    label: "Scoreboard",
    description: "Compact KPI cards built from the desktop stat rail.",
    defaultTitle: "Scoreboard",
    defaultView: "cards",
    defaultWidth: "full",
    defaultHeight: "standard",
    defaultLane: "spotlight",
    defaultShape: "rectangle",
    views: [
      { id: "cards", label: "Cards" },
      { id: "compact", label: "Compact" }
    ]
  },
  {
    type: "trendLine",
    label: "Trend Lines",
    description: "A quick line-based snapshot across the current desktop metrics.",
    defaultTitle: "Trend Lines",
    defaultView: "line",
    defaultWidth: "full",
    defaultHeight: "standard",
    defaultLane: "spotlight",
    defaultShape: "rectangle",
    views: [
      { id: "line", label: "Line" },
      { id: "area", label: "Area" }
    ]
  },
  {
    type: "laneGraph",
    label: "Lane Graph",
    description: "Bar graph volume by workspace lane for this store.",
    defaultTitle: "Lane Graph",
    defaultView: "bars",
    defaultWidth: "half",
    defaultHeight: "standard",
    defaultLane: "left",
    defaultShape: "rectangle",
    views: [
      { id: "bars", label: "Bars" },
      { id: "donut", label: "Donut" }
    ]
  },
  {
    type: "reportTable",
    label: "Report Table",
    description: "Salesforce-style report rows across KPIs, queues, and operator signals.",
    defaultTitle: "Report Table",
    defaultView: "table",
    defaultWidth: "full",
    defaultHeight: "tall",
    defaultLane: "spotlight",
    defaultShape: "rectangle",
    views: [
      { id: "table", label: "Table" },
      { id: "compact", label: "Compact" }
    ]
  },
  {
    type: "goalGauge",
    label: "Goal Gauge",
    description: "Gauge-style headline metrics closer to a CRM dashboard component set.",
    defaultTitle: "Goal Gauge",
    defaultView: "gauge",
    defaultWidth: "half",
    defaultHeight: "standard",
    defaultLane: "right",
    defaultShape: "rectangle",
    views: [
      { id: "gauge", label: "Gauge" },
      { id: "compact", label: "Compact" }
    ]
  },
  {
    type: "funnelBoard",
    label: "Funnel View",
    description: "Pipeline-style funnel view across tracked workspaces for report viewing.",
    defaultTitle: "Funnel View",
    defaultView: "funnel",
    defaultWidth: "half",
    defaultHeight: "standard",
    defaultLane: "left",
    defaultShape: "rectangle",
    views: [
      { id: "funnel", label: "Funnel" },
      { id: "bars", label: "Bars" }
    ]
  },
  {
    type: "attentionBoard",
    label: "Attention Board",
    description: "Flagged module headlines that still need operator attention.",
    defaultTitle: "Attention Board",
    defaultView: "list",
    defaultWidth: "half",
    defaultHeight: "standard",
    defaultLane: "right",
    defaultShape: "rectangle",
    views: [
      { id: "list", label: "List" },
      { id: "compact", label: "Compact" }
    ]
  },
  {
    type: "openWindows",
    label: "Open Windows",
    description: "Quick-launch cards for the workspaces pinned in the left rail.",
    defaultTitle: "Open Windows",
    defaultView: "cards",
    defaultWidth: "half",
    defaultHeight: "compact",
    defaultLane: "left",
    defaultShape: "rectangle",
    views: [
      { id: "cards", label: "Cards" },
      { id: "list", label: "List" }
    ]
  },
  {
    type: "operatingLanes",
    label: "Operating Lanes",
    description: "Module posture cards across the lanes this store is tracking.",
    defaultTitle: "Operating Lanes",
    defaultView: "cards",
    defaultWidth: "full",
    defaultHeight: "standard",
    defaultLane: "spotlight",
    defaultShape: "rectangle",
    views: [
      { id: "cards", label: "Cards" },
      { id: "list", label: "List" }
    ]
  },
  {
    type: "activityFeed",
    label: "Activity Feed",
    description: "Recent dashboard activity items for a front-page glance.",
    defaultTitle: "Activity Feed",
    defaultView: "timeline",
    defaultWidth: "half",
    defaultHeight: "standard",
    defaultLane: "right",
    defaultShape: "rectangle",
    views: [
      { id: "timeline", label: "Timeline" },
      { id: "list", label: "List" }
    ]
  }
];

const desktopWidgetPalette = ["#1f8aa7", "#173f70", "#79d5d3", "#ead37a", "#ce5f63", "#d69b00"];

const desktopWidgetWidthOptions: Array<{ description: string; label: string; value: DesktopWidgetWidth }> = [
  { value: "half", label: "Standard", description: "Two-up dashboard tile" },
  { value: "full", label: "Wide", description: "Full-row feature tile" }
];

const desktopWidgetHeightOptions: Array<{ description: string; label: string; value: DesktopWidgetHeight }> = [
  { value: "compact", label: "Compact", description: "Short quick-glance footprint" },
  { value: "standard", label: "Standard", description: "Balanced dashboard height" },
  { value: "tall", label: "Tall", description: "Deeper analysis surface" }
];

const desktopWidgetShapeOptions: Array<{ description: string; label: string; value: DesktopWidgetShape }> = [
  { value: "rectangle", label: "Rectangle", description: "Default dashboard card" },
  { value: "square", label: "Square", description: "Equal-width visual tile" },
  { value: "oval", label: "Oval", description: "Soft panoramic widget shell" },
  { value: "circle", label: "Circle", description: "Round glance-first module" }
];

const desktopWidgetLaneSections: Array<{ description: string; label: string; lane: DesktopWidgetLane }> = [
  { lane: "spotlight", label: "Spotlight Lane", description: "Full-width feature strip for headline widgets and large analytics." },
  { lane: "left", label: "Left Rail", description: "Primary working lane for daily glance widgets and live operations." },
  { lane: "right", label: "Right Rail", description: "Secondary lane for watchlists, alerts, and supporting context." }
];

interface LegacyGridColumn<T> {
  label: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface WorkspaceSearchState {
  searchTerm: string;
  filterValue: string;
}

interface HeaderSearchCommand {
  id: string;
  label: string;
  detail: string;
  action: "workspace" | "switchStore" | "logout";
  workspaceId?: WorkspaceId;
  keywords: string[];
}

type CommandLogEntry = ActivityLogEntry;

type ServiceQueueView = "All" | "Estimates" | "Repair Orders" | "Customer Reply" | "Tech Complete" | "Parts Received" | "Parts Hold";

type PendingSalesMenuIntent =
  | {
      kind: "boardFilter";
      filterValue: string;
      notice: string;
    }
  | {
      kind: "workflow";
      tool: string;
      notice: string;
      initialValues?: Record<string, string>;
    };

type ServiceMenuWorkflowTool = "New Estimate" | "New Repair Order" | "Report" | "Technician Time Entry" | "Warranty Claims";

type PendingServiceMenuIntent =
  | {
      kind: "notificationRail";
      unreadOnly: boolean;
    }
  | {
      kind: "queueView";
      queueView: ServiceQueueView;
      unreadOnly: boolean;
    }
  | {
      kind: "workflow";
      tool: ServiceMenuWorkflowTool;
    };

interface ServiceRowSignal {
  label: string;
  tone: CommandTone;
}

const serviceQueueViews: ServiceQueueView[] = [
  "All",
  "Estimates",
  "Repair Orders",
  "Customer Reply",
  "Tech Complete",
  "Parts Received",
  "Parts Hold"
];

function resolveSalesMenuIntent(item: string): PendingSalesMenuIntent | null {
  switch (item) {
    case "Leads, Quotes & Deals":
      return { kind: "boardFilter", filterValue: "All", notice: "Sales board showing all stages." };
    case "Unsold Follow-Up":
    case "Lead Board":
      return { kind: "boardFilter", filterValue: "Lead", notice: "Sales board filtered to Lead." };
    case "Quote Board":
    case "Quote Aging":
      return { kind: "boardFilter", filterValue: "Quote", notice: "Sales board filtered to Quote." };
    case "Open Deal Board":
    case "Deal Forecast":
      return { kind: "boardFilter", filterValue: "Open", notice: "Sales board filtered to Open." };
    case "Deposit Log":
    case "Deposit Board":
    case "Funding Pending":
      return { kind: "boardFilter", filterValue: "Deposit", notice: "Sales board filtered to Deposit." };
    default:
      return null;
  }
}

function resolveServiceMenuIntent(item: string): PendingServiceMenuIntent | null {
  switch (item) {
    case "Estimates & Repair Orders":
      return { kind: "queueView", queueView: "All", unreadOnly: false };
    case "Open Estimates List":
      return { kind: "queueView", queueView: "Estimates", unreadOnly: false };
    case "Repair Order Queue":
      return { kind: "queueView", queueView: "Repair Orders", unreadOnly: false };
    case "Customer Reply":
    case "Customer Reply Monitor":
      return { kind: "queueView", queueView: "Customer Reply", unreadOnly: false };
    case "Tech Complete":
      return { kind: "queueView", queueView: "Tech Complete", unreadOnly: false };
    case "Parts Received":
      return { kind: "queueView", queueView: "Parts Received", unreadOnly: false };
    case "Parts Hold":
      return { kind: "queueView", queueView: "Parts Hold", unreadOnly: false };
    case "Notification Rail":
      return { kind: "notificationRail", unreadOnly: false };
    case "Unread Service Alerts":
      return { kind: "notificationRail", unreadOnly: true };
    case "Express Write-Up":
      return { kind: "workflow", tool: "New Repair Order" };
    case "New Estimate":
    case "New Repair Order":
    case "Technician Time Entry":
    case "Warranty Claims":
      return { kind: "workflow", tool: item };
    case "Report Queue":
    case "Reports":
    case "Custom Reports":
      return { kind: "workflow", tool: "Report" };
    default:
      return null;
  }
}

type EditableServiceQueueField =
  | "inDate"
  | "roNumber"
  | "orderType"
  | "customerName"
  | "stockNumber"
  | "model"
  | "serviceWriter"
  | "roStatus"
  | "category"
  | "maker"
  | "note";

type ServiceQueueQuickFilterKey = "estimates" | "repairOrders" | "cashiered" | "canceledEstimates";

interface ServiceQueueQuickFilterState {
  estimates: boolean;
  repairOrders: boolean;
  cashiered: boolean;
  canceledEstimates: boolean;
}

interface ServiceQueueEditingCell {
  field: EditableServiceQueueField;
  rowId: string;
}

interface ServiceQueueColumnDefinition {
  className?: string;
  editableField?: EditableServiceQueueField;
  editor?: "text" | "textarea" | "select";
  label: string;
  options?: string[];
  key: string;
}

const serviceQueueNoteMaxLength = 4000;
const recentServiceRowHighlightDurationMs = 12_000;

const initialServiceQueueQuickFilterState: ServiceQueueQuickFilterState = {
  estimates: false,
  repairOrders: false,
  cashiered: false,
  canceledEstimates: false
};

const serviceQueueQuickFilterDefinitions: Array<{
  key: ServiceQueueQuickFilterKey;
  label: string;
  matches: (row: ServiceWorkspaceRow) => boolean;
}> = [
  {
    key: "estimates",
    label: "Estimates",
    matches: (row) => row.orderType === "Estimate"
  },
  {
    key: "repairOrders",
    label: "Repair Orders",
    matches: (row) => row.orderType === "Repair Order"
  },
  {
    key: "cashiered",
    label: "Cashiered",
    matches: (row) => row.roStatus.toLowerCase().includes("cash")
  },
  {
    key: "canceledEstimates",
    label: "Canceled Estimates",
    matches: (row) => {
      const normalizedStatus = row.roStatus.toLowerCase();
      const normalizedCategory = row.category.toLowerCase();
      const normalizedNote = row.note.toLowerCase();

      return row.orderType === "Estimate" && (normalizedStatus.includes("cancel") || normalizedCategory.includes("cancel") || normalizedNote.includes("cancel"));
    }
  }
];

const serviceQueueColumnDefinitions: ServiceQueueColumnDefinition[] = [
  { key: "inDate", label: "In Date", className: "legacy-col-service-date", editableField: "inDate" },
  { key: "roNumber", label: "RO #", className: "legacy-col-service-ro" },
  { key: "orderType", label: "Type", className: "legacy-col-service-type", editableField: "orderType", editor: "select", options: ["Estimate", "Repair Order"] },
  { key: "customerName", label: "Customer Name", className: "legacy-col-service-customer", editableField: "customerName" },
  { key: "stockNumber", label: "Stock #", className: "legacy-col-service-stock" },
  { key: "model", label: "Model", className: "legacy-col-service-model", editableField: "model" },
  { key: "serviceWriter", label: "Service Writer", className: "legacy-col-service-writer", editableField: "serviceWriter" },
  { key: "roStatus", label: "RO Status", className: "legacy-col-service-status", editableField: "roStatus" },
  { key: "signals", label: "Signals", className: "legacy-col-service-signals" },
  { key: "category", label: "Category", className: "legacy-col-service-category", editableField: "category" },
  { key: "maker", label: "Maker", className: "legacy-col-service-maker", editableField: "maker" },
  { key: "note", label: "Notes", className: "legacy-col-service-note", editableField: "note" }
];

interface WorkflowField {
  key: string;
  label: string;
  control: "text" | "textarea" | "select";
  defaultValue: string;
  options?: string[];
  placeholder?: string;
}

interface WorkflowPreviewItem {
  label: string;
  tone?: CommandTone;
  value: string;
}

interface ActionWorkflowState {
  title: string;
  description: string;
  commandLabel: string;
  primaryActionLabel: string;
  submitAction: string;
  tone: CommandTone;
  fields: WorkflowField[];
  values: Record<string, string>;
  buildDetail: (values: Record<string, string>) => string;
  buildPreviewItems?: (values: Record<string, string>) => WorkflowPreviewItem[];
}

type PartsLookupSearchField = "partNumber" | "secondary" | "description";

interface WorkflowContext {
  storeName: string;
  operatorName: string;
  salesRow: SalesWorkspaceRow | null;
  serviceRow: ServiceWorkspaceRow | null;
  serviceRows: ServiceWorkspaceRow[];
  partsRow: PartsWorkspaceRow | null;
  websiteRow: WebsiteWorkspaceRow | null;
}

interface WorkspaceInteractionState {
  selectedSalesRowId: string | null;
  onSelectSalesRow: (row: SalesWorkspaceRow) => void;
  selectedServiceRowId: string | null;
  onSelectServiceRow: (row: ServiceWorkspaceRow) => void;
  selectedPartsRowId: string | null;
  onSelectPartsRow: (row: PartsWorkspaceRow) => void;
  selectedWebsiteRowId: string | null;
  onSelectWebsiteRow: (row: WebsiteWorkspaceRow) => void;
}

const salesColumns: LegacyGridColumn<SalesWorkspaceRow>[] = [
  { label: "Deal Date", render: (row) => row.date },
  { label: "Worksheet", render: (row) => row.worksheet },
  { label: "Stock #", render: (row) => row.stock },
  { label: "Make", render: (row) => row.make },
  { label: "Model", render: (row) => row.model },
  { className: "align-right", label: "Cash Price", render: (row) => row.cashPrice },
  { className: "align-center", label: "Stage", render: (row) => row.finalized },
  { label: "Customer", render: (row) => row.customer },
  { label: "Year", render: (row) => row.year },
  { label: "VIN/HIN", render: (row) => row.vin }
];

const inlineServiceUtilityActions = new Set(["Duplicate", "Print", "Report", "Detail"]);
const serviceUtilityQaMarker = "QA";

const partsColumns: LegacyGridColumn<PartsWorkspaceRow>[] = [
  { label: "Part Number", render: (row) => row.partNumber },
  { label: "Secondary", render: (row) => row.secondary },
  { label: "Description", render: (row) => row.description },
  { label: "Supplier", render: (row) => row.supplier },
  { label: "Category", render: (row) => row.category },
  { label: "Order Type", render: (row) => row.orderType },
  { className: "align-right", label: "Qty", render: (row) => row.quantity },
  { className: "align-right", label: "Order Cost", render: (row) => row.orderCost },
  { label: "SO Invoice", render: (row) => row.source }
];

const partsLookupFieldOptions: Array<{ label: string; value: PartsLookupSearchField }> = [
  { label: "Part Number", value: "partNumber" },
  { label: "Secondary", value: "secondary" },
  { label: "Description", value: "description" }
];

const partsLookupColumns: LegacyGridColumn<PartsWorkspaceRow>[] = [
  { label: "Part Number", render: (row) => row.partNumber },
  { label: "Secondary", render: (row) => row.secondary },
  { label: "Description", render: (row) => row.description },
  { label: "Supplier", render: (row) => row.supplier },
  { className: "align-right", label: "Avail", render: (row) => getPartsLookupAvailableQuantity(row) },
  { className: "align-right", label: "Price", render: (row) => row.orderCost },
  { label: "Location", render: (row) => getPartsLookupLocation(row) }
];

export function DashboardPage({ session, activeStoreId, workspaceId, onSelectStore, onSignOut }: DashboardPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStore = session.stores.find((store) => store.id === activeStoreId) ?? session.stores[0];
  const openWindowsStorageKey = `${OPEN_WINDOWS_STORAGE_PREFIX}:${session.user.id}`;
  const openWindowOrderStorageKey = `${OPEN_WINDOW_ORDER_STORAGE_PREFIX}:${session.user.id}`;
  const desktopWidgetsStorageKey = `${DESKTOP_WIDGETS_STORAGE_PREFIX}:${session.user.id}:${activeStore.id}`;
  const serviceDetailWindowsStorageKey = `${OPEN_SERVICE_DETAIL_WINDOWS_STORAGE_PREFIX}:${session.user.id}`;
  const serviceNotificationRailStorageKey = `${SERVICE_NOTIFICATION_RAIL_STORAGE_PREFIX}:${session.user.id}`;
  const recentServiceRowHighlightsStorageKey = `${RECENT_SERVICE_ROW_HIGHLIGHTS_STORAGE_PREFIX}:${session.user.id}:${activeStore.id}`;
  const activeServiceDetailRoNumber = searchParams.get("detailRo");
  const focusedServiceRoNumber = searchParams.get("ro");
  const requestedServiceTaskId = searchParams.get("task");
  const requestedAuditCleanupStoreId = searchParams.get("cleanupStore");
  const serviceReturnStoreId = searchParams.get("returnStore");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStorePickerOpen, setIsStorePickerOpen] = useState(false);
  const [openWindowsContextMenu, setOpenWindowsContextMenu] = useState<OpenWindowsContextMenuState | null>(null);
  const [searchState, setSearchState] = useState<WorkspaceSearchState>({ searchTerm: "", filterValue: "All" });
  const [headerSearchTerm, setHeaderSearchTerm] = useState("");
  const [selectedSalesRowId, setSelectedSalesRowId] = useState<string | null>(null);
  const [selectedServiceRowId, setSelectedServiceRowId] = useState<string | null>(null);
  const [selectedPartsRowId, setSelectedPartsRowId] = useState<string | null>(null);
  const [selectedWebsiteRowId, setSelectedWebsiteRowId] = useState<string | null>(null);
  const [focusedServiceTaskId, setFocusedServiceTaskId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isManualRefreshPending, setIsManualRefreshPending] = useState(false);
  const [toolbarNotice, setToolbarNotice] = useState<string | null>(null);
  const [lastWorkspaceSyncLabel, setLastWorkspaceSyncLabel] = useState<string | null>(null);
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [taskQueue, setTaskQueue] = useState<TaskQueueEntry[]>([]);
  const [isTaskQueueLoading, setIsTaskQueueLoading] = useState(true);
  const [isOperatorFilterEnabled, setIsOperatorFilterEnabled] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [serviceQaCleanupStoreId, setServiceQaCleanupStoreId] = useState<string | null>(null);
  const [serviceQaCleanupRoNumber, setServiceQaCleanupRoNumber] = useState<string | null>(null);
  const [serviceWorkbenchModel, setServiceWorkbenchModel] = useState<ServiceWorkbenchModel | null>(null);
  const [servicePartCatalog, setServicePartCatalog] = useState<ServiceOrderPartCatalogEntry[]>([]);
  const [isServiceDetailLoading, setIsServiceDetailLoading] = useState(false);
  const [updatingServiceDetailKey, setUpdatingServiceDetailKey] = useState<string | null>(null);
  const [updatingServiceQueueRowId, setUpdatingServiceQueueRowId] = useState<string | null>(null);
  const [updatingTaskPolicyKey, setUpdatingTaskPolicyKey] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<ActionWorkflowState | null>(null);
  const [isWorkflowSubmitting, setIsWorkflowSubmitting] = useState(false);
  const [partsQuickAddTerm, setPartsQuickAddTerm] = useState("");
  const [isPartsLookupOpen, setIsPartsLookupOpen] = useState(false);
  const [partsLookupSearchField, setPartsLookupSearchField] = useState<PartsLookupSearchField>("partNumber");
  const [partsLookupSearchTerm, setPartsLookupSearchTerm] = useState("");
  const [partsLookupSelectedRowId, setPartsLookupSelectedRowId] = useState<string | null>(null);
  const [partsLookupQuantity, setPartsLookupQuantity] = useState("1");
  const [isPartsLookupSubmitting, setIsPartsLookupSubmitting] = useState(false);
  const [configuredOpenWorkspaceIds, setConfiguredOpenWorkspaceIds] = useState<WorkspaceId[]>(() => readOpenWorkspacePreference(session.user.id));
  const [openWindowOrderKeys, setOpenWindowOrderKeys] = useState<string[]>(() => readOpenWindowOrderPreference(session.user.id));
  const [serviceDetailWindows, setServiceDetailWindows] = useState<ServiceDetailWindow[]>(() => readOpenServiceDetailWindowPreference(session.user.id));
  const [draggingOpenWindowKey, setDraggingOpenWindowKey] = useState<string | null>(null);
  const [openWindowDropState, setOpenWindowDropState] = useState<OpenWindowDropState | null>(null);
  const [serviceQueueView, setServiceQueueView] = useState<ServiceQueueView>("All");
  const [isServiceNotificationRailCollapsed, setIsServiceNotificationRailCollapsed] = useState(() =>
    readServiceNotificationRailCollapsedPreference(session.user.id)
  );
  const [recentServiceRowHighlights, setRecentServiceRowHighlights] = useState<Record<string, number>>(() =>
    readRecentServiceRowHighlightsPreference(recentServiceRowHighlightsStorageKey)
  );
  const [isServiceNotificationUnreadOnly, setIsServiceNotificationUnreadOnly] = useState(false);
  const [pendingSalesMenuIntent, setPendingSalesMenuIntent] = useState<PendingSalesMenuIntent | null>(null);
  const [pendingWorkspaceMenuIntent, setPendingWorkspaceMenuIntent] = useState<WorkspaceMenuIntent | null>(null);
  const [pendingServiceMenuIntent, setPendingServiceMenuIntent] = useState<PendingServiceMenuIntent | null>(null);
  const currentActivityKeyRef = useRef(`${activeStore.id}:${workspaceId}`);

  const menuGroups = dashboard?.navigation ?? legacyFallbackNavigation;
  const headerSearchResults = searchHeaderCommands(buildHeaderSearchCommands(menuGroups), headerSearchTerm);
  const serviceRows = workspace?.workspaceId === "service" ? workspace.rows : [];
  const activeWorkspace = workspaceDefinitions[workspaceId];
  const shouldRenderCommandLogRail = workspaceId !== "service" && workspaceId !== "parts" && workspaceId !== "sales" && workspaceId !== "desktop";
  const shouldRenderTaskQueueRail = workspaceId !== "service" && workspaceId !== "sales" && workspaceId !== "desktop";
  const shouldFetchActivityLog = shouldRenderCommandLogRail || workspaceId === "service";
  const shouldFetchTaskQueue = shouldRenderTaskQueueRail || workspaceId === "service";
  const availableOpenWorkspaceIds = workspaceOrder.filter((candidateWorkspaceId) => {
    if (candidateWorkspaceId === "website") {
      return (dashboard?.workspaceCounts.website ?? 0) > 0;
    }

    return true;
  });
  const openWorkspaceIds = sortWorkspaceIdsByOpenWindowOrder(
    configuredOpenWorkspaceIds.filter((candidateWorkspaceId) => availableOpenWorkspaceIds.includes(candidateWorkspaceId)),
    openWindowOrderKeys
  );
  const hiddenOpenWorkspaceIds = availableOpenWorkspaceIds.filter(
    (candidateWorkspaceId) => !configuredOpenWorkspaceIds.includes(candidateWorkspaceId)
  );
  const visibleServiceDetailWindows = sortServiceDetailWindowsByOpenWindowOrder(
    serviceDetailWindows.filter((windowEntry) => windowEntry.storeId === activeStore.id),
    openWindowOrderKeys
  );
  const visibleOpenWindowItems = sortOpenWindowRailItems<OpenWindowRailItem>(
    [
      ...openWorkspaceIds.map((candidateWorkspaceId) => ({
        isActive: candidateWorkspaceId === workspaceId && !(candidateWorkspaceId === "service" && activeServiceDetailRoNumber),
        key: buildOpenWindowWorkspaceKey(candidateWorkspaceId),
        kind: "workspace" as const,
        workspaceId: candidateWorkspaceId
      })),
      ...visibleServiceDetailWindows.map((windowEntry) => ({
        isActive: workspaceId === "service" && activeServiceDetailRoNumber === windowEntry.roNumber,
        key: buildOpenWindowDetailKey(windowEntry),
        kind: "detail" as const,
        windowEntry
      }))
    ],
    openWindowOrderKeys
  );
  const activeServiceDetailRow = activeServiceDetailRoNumber
    ? serviceRows.find((row) => row.roNumber === activeServiceDetailRoNumber) ?? null
    : null;
  const matchedServiceDetailWindow = activeServiceDetailRoNumber
    ? visibleServiceDetailWindows.find((windowEntry) => windowEntry.roNumber === activeServiceDetailRoNumber) ?? null
    : null;
  const activeServiceDetailWindow =
    activeServiceDetailRoNumber && (matchedServiceDetailWindow || activeServiceDetailRow)
      ? {
          storeId: activeStore.id,
          roNumber: activeServiceDetailRoNumber,
          customerName: matchedServiceDetailWindow?.customerName || activeServiceDetailRow?.customerName || ""
        }
      : null;
  const contextMenuTargetWorkspaceId = openWindowsContextMenu?.targetWorkspaceId ?? null;
  const contextMenuTargetIsPinned = contextMenuTargetWorkspaceId
    ? configuredOpenWorkspaceIds.includes(contextMenuTargetWorkspaceId)
    : false;
  const hasAnyOpenWindows = configuredOpenWorkspaceIds.length > 0 || serviceDetailWindows.length > 0;
  const activeOpenWindowKey = activeServiceDetailWindow
    ? buildOpenWindowDetailKey(activeServiceDetailWindow)
    : buildOpenWindowWorkspaceKey(workspaceId);
  const shouldRenderActiveWorkspace = visibleOpenWindowItems.some((item) => item.key === activeOpenWindowKey);
  const partsRows = workspace?.workspaceId === "parts" ? workspace.rows : [];
  const selectedSalesRow = workspace?.workspaceId === "sales" ? resolveSelectedRow(workspace.rows, selectedSalesRowId) : null;
  const selectedServiceRow = workspace?.workspaceId === "service" ? resolveSelectedRow(workspace.rows, selectedServiceRowId) : null;
  const selectedPartsRow = workspace?.workspaceId === "parts" ? resolveSelectedRow(partsRows, selectedPartsRowId) : null;
  const selectedWebsiteRow = workspace?.workspaceId === "website" ? resolveSelectedRow(workspace.rows, selectedWebsiteRowId) : null;
  const partsLookupRows = filterPartsLookupRows(partsRows, partsLookupSearchTerm, partsLookupSearchField);
  const activePartsLookupRow = resolveSelectedRow(partsLookupRows, partsLookupSelectedRowId);
  const serviceNotificationEntries = workspace?.workspaceId === "service" ? workspace.notifications ?? [] : [];
  const activeWindowTitle = activeServiceDetailWindow ? formatServiceDetailWindowTitle(activeServiceDetailWindow) : activeWorkspace.title;
  const activeWindowSubtitle = activeServiceDetailRow
    ? `${activeServiceDetailRow.customerName} -+ ${activeServiceDetailRow.maker} ${activeServiceDetailRow.model}`
    : activeServiceDetailWindow
      ? `Repair order detail workbench`
      : activeWorkspace.subtitle;
  const isLoading = isDashboardLoading || isWorkspaceLoading;
  const serviceReturnStore = serviceReturnStoreId ? session.stores.find((store) => store.id === serviceReturnStoreId) ?? null : null;
  const serviceReturnCleanupStore = requestedAuditCleanupStoreId
    ? session.stores.find((store) => store.id === requestedAuditCleanupStoreId) ?? null
    : null;

  useEffect(() => {
    setPartsQuickAddTerm("");
    setPartsLookupSearchField("partNumber");
    setPartsLookupSearchTerm("");
    setPartsLookupSelectedRowId(null);
    setPartsLookupQuantity("1");
    setIsPartsLookupOpen(false);
    setIsPartsLookupSubmitting(false);
  }, [activeStore.id, workspaceId]);

  function appendCommandLog(
    entry: Omit<CommandLogEntry, "id" | "timeLabel" | "actorUserId" | "actorName" | "actorInitial">,
    options?: {
      optimistic?: boolean;
      storeId?: string;
      workspaceId?: WorkspaceId;
    }
  ) {
    const targetStoreId = options?.storeId ?? activeStore.id;
    const targetWorkspaceId = options?.workspaceId ?? workspaceId;
    const targetActivityKey = `${targetStoreId}:${targetWorkspaceId}`;
    const optimisticEntry: CommandLogEntry = {
      id: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timeLabel: formatClockTime(new Date()),
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorInitial: session.user.avatarInitial,
      ...entry
    };
    const shouldOptimisticallyRender = options?.optimistic ?? targetActivityKey === currentActivityKeyRef.current;

    if (shouldOptimisticallyRender) {
      setCommandLog((current) => [optimisticEntry, ...current].slice(0, 8));
    }

    void createActivityLog(targetStoreId, {
      workspaceId: targetWorkspaceId,
      label: entry.label,
      detail: entry.detail,
      tone: entry.tone,
      actorUserId: session.user.id
    })
      .then((savedEntry) => {
        if (currentActivityKeyRef.current === targetActivityKey) {
          setCommandLog((current) => [savedEntry, ...current.filter((currentEntry) => currentEntry.id !== savedEntry.id && currentEntry.id !== optimisticEntry.id)].slice(0, 8));
        }
      })
      .catch(() => {
        if (shouldOptimisticallyRender) {
          setCommandLog((current) => current.filter((currentEntry) => currentEntry.id !== optimisticEntry.id));
        }
      });
  }

  useEffect(() => {
    currentActivityKeyRef.current = `${activeStore.id}:${workspaceId}`;
  }, [activeStore.id, workspaceId]);

  useEffect(() => {
    setConfiguredOpenWorkspaceIds(readOpenWorkspacePreference(session.user.id));
    setOpenWindowOrderKeys(readOpenWindowOrderPreference(session.user.id));
    setServiceDetailWindows(readOpenServiceDetailWindowPreference(session.user.id));
    setIsServiceNotificationRailCollapsed(readServiceNotificationRailCollapsedPreference(session.user.id));
    setOpenWindowsContextMenu(null);
  }, [session.user.id]);

  useEffect(() => {
    setOpenWindowOrderKeys((current) => normalizeOpenWindowOrderPreference(current, configuredOpenWorkspaceIds, serviceDetailWindows));
  }, [configuredOpenWorkspaceIds, serviceDetailWindows]);

  useEffect(() => {
    setRecentServiceRowHighlights(readRecentServiceRowHighlightsPreference(recentServiceRowHighlightsStorageKey));
  }, [recentServiceRowHighlightsStorageKey]);

  useEffect(() => {
    if (!openWindowsContextMenu || typeof window === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenWindowsContextMenu(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openWindowsContextMenu]);

  useEffect(() => {
    setOpenWindowsContextMenu(null);
    setDraggingOpenWindowKey(null);
    setOpenWindowDropState(null);
  }, [activeStore.id, workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(openWindowsStorageKey, JSON.stringify(configuredOpenWorkspaceIds));
  }, [configuredOpenWorkspaceIds, openWindowsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(openWindowOrderStorageKey, JSON.stringify(openWindowOrderKeys));
  }, [openWindowOrderKeys, openWindowOrderStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(serviceDetailWindowsStorageKey, JSON.stringify(serviceDetailWindows));
  }, [serviceDetailWindows, serviceDetailWindowsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(serviceNotificationRailStorageKey, JSON.stringify(isServiceNotificationRailCollapsed));
  }, [isServiceNotificationRailCollapsed, serviceNotificationRailStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      recentServiceRowHighlightsStorageKey,
      JSON.stringify(pruneRecentServiceRowHighlights(recentServiceRowHighlights))
    );
  }, [recentServiceRowHighlights, recentServiceRowHighlightsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const activeHighlights = pruneRecentServiceRowHighlights(recentServiceRowHighlights);

    if (Object.keys(activeHighlights).length !== Object.keys(recentServiceRowHighlights).length) {
      setRecentServiceRowHighlights(activeHighlights);
      return;
    }

    const nextExpiry = Math.min(...Object.values(activeHighlights));

    if (!Number.isFinite(nextExpiry)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRecentServiceRowHighlights((current) => pruneRecentServiceRowHighlights(current));
    }, Math.max(nextExpiry - Date.now(), 0) + 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [recentServiceRowHighlights]);

  useEffect(() => {
    let ignore = false;

    setIsDashboardLoading(true);
    setErrorMessage(null);

    getDashboard(activeStore.id)
      .then((payload) => {
        if (!ignore) {
          setDashboard(payload);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the dashboard.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsDashboardLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeStore.id, refreshToken]);

  useEffect(() => {
    let ignore = false;

    setIsWorkspaceLoading(true);
    setWorkspace(null);
    setErrorMessage(null);

    getWorkspace(activeStore.id, workspaceId)
      .then((payload) => {
        if (!ignore) {
          setWorkspace(payload);
          setLastWorkspaceSyncLabel(`Refreshed ${formatClockTime(new Date())}`);

          if (isManualRefreshPending) {
            setToolbarNotice(`${workspaceDefinitions[workspaceId].title} refreshed.`);
            appendCommandLog({
              label: "Refresh completed",
              detail: `${workspaceDefinitions[workspaceId].title} synced for ${activeStore.name}.`,
              tone: "stable"
            });
            setIsManualRefreshPending(false);
          }
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the workspace.");

          if (isManualRefreshPending) {
            setToolbarNotice(`Refresh failed for ${workspaceDefinitions[workspaceId].title}.`);
            appendCommandLog({
              label: "Refresh failed",
              detail: `${workspaceDefinitions[workspaceId].title} could not be refreshed.`,
              tone: "attention"
            });
            setIsManualRefreshPending(false);
          }
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsWorkspaceLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeStore.id, refreshToken, workspaceId]);

  useEffect(() => {
    setSearchState({ searchTerm: "", filterValue: "All" });
    setHeaderSearchTerm("");
    setToolbarNotice(null);
    setActiveWorkflow(null);
  }, [activeStore.id, workspaceId]);

  useEffect(() => {
    setCommandLog([]);

    if (!shouldFetchActivityLog) {
      setIsActivityLoading(false);
    }
  }, [activeStore.id, shouldFetchActivityLog, workspaceId]);

  useEffect(() => {
    setTaskQueue([]);

    if (!shouldFetchTaskQueue) {
      setIsTaskQueueLoading(false);
    }
  }, [activeStore.id, shouldFetchTaskQueue, workspaceId]);

  useEffect(() => {
    if (!shouldFetchActivityLog) {
      setIsActivityLoading(false);
      return;
    }

    let ignore = false;

    setIsActivityLoading(true);

    getActivityLog(activeStore.id, workspaceId, isOperatorFilterEnabled ? session.user.id : undefined, workspaceId === "website" ? 20 : undefined)
      .then((entries) => {
        if (!ignore) {
          setCommandLog(entries);
        }
      })
      .catch(() => {
        if (!ignore) {
          setCommandLog([]);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsActivityLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeStore.id, isOperatorFilterEnabled, refreshToken, session.user.id, shouldFetchActivityLog, workspaceId]);

  useEffect(() => {
    if (!shouldFetchTaskQueue) {
      setIsTaskQueueLoading(false);
      return;
    }

    let ignore = false;

    setIsTaskQueueLoading(true);

    getTaskQueue(
      activeStore.id,
      workspaceId,
      isOperatorFilterEnabled ? session.user.id : undefined,
      workspaceId === "service" || workspaceId === "website" ? 20 : 8
    )
      .then((entries) => {
        if (!ignore) {
          setTaskQueue(entries);
        }
      })
      .catch(() => {
        if (!ignore) {
          setTaskQueue([]);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsTaskQueueLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeStore.id, isOperatorFilterEnabled, refreshToken, session.user.id, shouldFetchTaskQueue, workspaceId]);

  useEffect(() => {
    if (shouldFetchActivityLog && !isActivityLoading && !isWorkspaceLoading && workspace && commandLog.length === 0) {
      appendCommandLog({
        label: "Workspace ready",
        detail: `${activeStore.name} -+ ${workspaceDefinitions[workspaceId].title} loaded.`,
        tone: "stable"
      });
    }
  }, [activeStore.name, commandLog.length, isActivityLoading, isWorkspaceLoading, shouldFetchActivityLog, workspace, workspaceId]);

  useEffect(() => {
    if (workspaceId !== "sales" || workspace?.workspaceId !== "sales") {
      setSelectedSalesRowId(null);
      return;
    }

    setSelectedSalesRowId((current) => (current && workspace.rows.some((row) => row.id === current) ? current : workspace.rows[0]?.id ?? null));
  }, [workspace, workspaceId]);

  useEffect(() => {
    if (workspaceId !== "service" || workspace?.workspaceId !== "service") {
      setSelectedServiceRowId(null);
      setFocusedServiceTaskId(null);
      return;
    }

    if (focusedServiceRoNumber && !activeServiceDetailRoNumber) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set("detailRo", focusedServiceRoNumber);
      nextSearchParams.delete("ro");
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    if (activeServiceDetailRoNumber) {
      const focusedRow = workspace.rows.find((row) => row.roNumber === activeServiceDetailRoNumber) ?? null;

      if (!focusedRow) {
        setSelectedServiceRowId(workspace.rows[0]?.id ?? null);
        setFocusedServiceTaskId(null);
        setServiceDetailWindows((current) =>
          current.filter(
            (windowEntry) => !(windowEntry.storeId === activeStore.id && windowEntry.roNumber === activeServiceDetailRoNumber)
          )
        );

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete("detailRo");
        nextSearchParams.delete("task");
        setSearchParams(nextSearchParams, { replace: true });
        setToolbarNotice(`RO ${activeServiceDetailRoNumber} is not available in the current Service lane.`);
        return;
      }

      setSelectedServiceRowId(focusedRow.id);
      setFocusedServiceTaskId(requestedServiceTaskId);
      setServiceDetailWindows((current) =>
        upsertServiceDetailWindow(current, {
          customerName: focusedRow.customerName,
          roNumber: focusedRow.roNumber,
          storeId: activeStore.id
        })
      );

      setToolbarNotice(
        requestedServiceTaskId
          ? `RO ${focusedRow.roNumber} opened in its own detail window with the linked utility task focused.`
          : `RO ${focusedRow.roNumber} opened in its own detail window.`
      );
      return;
    }

    setSelectedServiceRowId((current) => (current && workspace.rows.some((row) => row.id === current) ? current : workspace.rows[0]?.id ?? null));
  }, [activeServiceDetailRoNumber, activeStore.id, focusedServiceRoNumber, requestedServiceTaskId, searchParams, setSearchParams, workspace, workspaceId]);

  useEffect(() => {
    if (workspaceId !== "service" || workspace?.workspaceId !== "service" || !activeServiceDetailRoNumber || !selectedServiceRowId) {
      setServiceWorkbenchModel(null);
      setServicePartCatalog([]);
      setIsServiceDetailLoading(false);
      setUpdatingServiceDetailKey(null);
      return;
    }

    let ignore = false;
    setIsServiceDetailLoading(true);

    getServiceOrderDetail(activeStore.id, selectedServiceRowId)
      .then((payload) => {
        if (!ignore) {
          setServiceWorkbenchModel(payload.detail as ServiceWorkbenchModel);
          setServicePartCatalog(payload.partCatalog);
          patchServiceWorkspaceRow(payload.row as ServiceWorkspaceRow);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setServiceWorkbenchModel(null);
          setServicePartCatalog([]);
          setToolbarNotice(error instanceof Error ? error.message : "Unable to load the service order.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsServiceDetailLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeServiceDetailRoNumber, activeStore.id, refreshToken, selectedServiceRowId, workspace?.workspaceId, workspaceId]);

  useEffect(() => {
    if (workspaceId !== "parts" || workspace?.workspaceId !== "parts") {
      setSelectedPartsRowId(null);
      return;
    }

    setSelectedPartsRowId((current) => (current && workspace.rows.some((row) => row.id === current) ? current : workspace.rows[0]?.id ?? null));
  }, [workspace, workspaceId]);

  useEffect(() => {
    if (workspaceId !== "website") {
      setSelectedWebsiteRowId(null);
      return;
    }

    if (workspace?.workspaceId !== "website") {
      return;
    }

    setSelectedWebsiteRowId((current) => (current && workspace.rows.some((row) => row.id === current) ? current : workspace.rows[0]?.id ?? null));
  }, [workspace, workspaceId]);

  function navigateToWorkspace(nextWorkspaceId: WorkspaceId, sourceLabel?: string) {
    if (nextWorkspaceId === workspaceId && !(nextWorkspaceId === "service" && activeServiceDetailRoNumber)) {
      return;
    }

    if (availableOpenWorkspaceIds.includes(nextWorkspaceId)) {
      addOpenWorkspace(nextWorkspaceId);
    }

    if (sourceLabel) {
      appendCommandLog(
        {
          label: "Workspace opened",
          detail: `${workspaceDefinitions[nextWorkspaceId].title} via ${sourceLabel}.`,
          tone: "neutral"
        },
        {
          optimistic: false,
          workspaceId: nextWorkspaceId
        }
      );
    }

    navigate(`/dashboard/${activeStore.id}/${nextWorkspaceId}`);
  }

  function addOpenWorkspace(targetWorkspaceId: WorkspaceId) {
    setConfiguredOpenWorkspaceIds((current) =>
      current.includes(targetWorkspaceId) ? current : normalizeOpenWorkspacePreference([...current, targetWorkspaceId])
    );
  }

  function removeOpenWorkspace(targetWorkspaceId: WorkspaceId) {
    setConfiguredOpenWorkspaceIds((current) => current.filter((workspaceId) => workspaceId !== targetWorkspaceId));
  }

  function clearAllOpenWindows() {
    if (!hasAnyOpenWindows) {
      return;
    }

    setConfiguredOpenWorkspaceIds([]);
    setOpenWindowOrderKeys([]);
    setServiceDetailWindows([]);
    setOpenWindowsContextMenu(null);
    setDraggingOpenWindowKey(null);
    setOpenWindowDropState(null);
    setToolbarNotice("All Open Windows items removed.");

    if (workspaceId === "service" && activeServiceDetailRoNumber) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("detailRo");
      nextSearchParams.delete("task");
      navigate(`/dashboard/${activeStore.id}/service${nextSearchParams.size > 0 ? `?${nextSearchParams.toString()}` : ""}`, {
        replace: true
      });
    }
  }

  function closeServiceDetailWindow(targetStoreId: string, roNumber: string) {
    setServiceDetailWindows((current) =>
      current.filter((windowEntry) => !(windowEntry.storeId === targetStoreId && windowEntry.roNumber === roNumber))
    );

    if (workspaceId === "service" && activeStore.id === targetStoreId && activeServiceDetailRoNumber === roNumber) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("detailRo");
      nextSearchParams.delete("task");
      navigate(`/dashboard/${targetStoreId}/service${nextSearchParams.size > 0 ? `?${nextSearchParams.toString()}` : ""}`, { replace: true });
    }
  }

  function openOpenWindowsContextMenu(event: React.MouseEvent<HTMLElement>, targetWorkspaceId: WorkspaceId | null) {
    event.preventDefault();
    event.stopPropagation();
    setOpenWindowsContextMenu({
      targetWorkspaceId
    });
  }

  function handleOpenWindowsRailContextMenu(event: React.MouseEvent<HTMLElement>) {
    const eventTarget = event.target;

    if (eventTarget instanceof HTMLElement && eventTarget.closest(".legacy-window-link")) {
      return;
    }

    openOpenWindowsContextMenu(event, null);
  }

  function handleOpenWindowDragStart(event: React.DragEvent<HTMLElement>, itemKey: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemKey);
    setDraggingOpenWindowKey(itemKey);
    setOpenWindowDropState(null);
    setOpenWindowsContextMenu(null);
  }

  function handleOpenWindowDragOver(event: React.DragEvent<HTMLDivElement>, targetKey: string) {
    if (!draggingOpenWindowKey || draggingOpenWindowKey === targetKey) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextDropPosition = event.clientY >= bounds.top + bounds.height / 2 ? "after" : "before";

    setOpenWindowDropState((current) =>
      current?.key === targetKey && current.position === nextDropPosition
        ? current
        : { key: targetKey, position: nextDropPosition }
    );
  }

  function handleOpenWindowDrop(event: React.DragEvent<HTMLDivElement>, targetKey: string) {
    event.preventDefault();

    if (!draggingOpenWindowKey || draggingOpenWindowKey === targetKey) {
      setDraggingOpenWindowKey(null);
      setOpenWindowDropState(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const fallbackDropPosition = event.clientY >= bounds.top + bounds.height / 2 ? "after" : "before";
    const dropPosition = openWindowDropState?.key === targetKey ? openWindowDropState.position : fallbackDropPosition;

    setOpenWindowOrderKeys((current) =>
      reorderOpenWindowOrderPreference(
        current,
        visibleOpenWindowItems.map((item) => item.key),
        draggingOpenWindowKey,
        targetKey,
        dropPosition,
        configuredOpenWorkspaceIds,
        serviceDetailWindows
      )
    );
    setDraggingOpenWindowKey(null);
    setOpenWindowDropState(null);
    setToolbarNotice("Open Windows reordered.");
  }

  function handleOpenWindowDragEnd() {
    setDraggingOpenWindowKey(null);
    setOpenWindowDropState(null);
  }

  function openServiceRepairOrder(targetStoreId: string, options: OpenServiceRepairOrderOptions) {
    const nextSearchParams = new URLSearchParams({ detailRo: options.roNumber });

    if (options.taskId) {
      nextSearchParams.set("task", options.taskId);
    }

    if (options.returnToAuditStoreId) {
      nextSearchParams.set("returnStore", options.returnToAuditStoreId);
    }

    if (options.returnToCleanupStoreId) {
      nextSearchParams.set("cleanupStore", options.returnToCleanupStoreId);
    }

    setServiceDetailWindows((current) =>
      upsertServiceDetailWindow(current, {
        customerName: options.customerName?.trim() ?? "",
        roNumber: options.roNumber,
        storeId: targetStoreId
      })
    );

    navigate(`/dashboard/${targetStoreId}/service?${nextSearchParams.toString()}`);
  }

  function returnToAuditCleanup(targetStoreId: string, cleanupStoreId?: string | null) {
    const nextSearchParams = new URLSearchParams();

    if (cleanupStoreId) {
      nextSearchParams.set("cleanupStore", cleanupStoreId);
    }

    const query = nextSearchParams.toString();
    navigate(`/dashboard/${targetStoreId}/audit${query ? `?${query}` : ""}`);
  }

  function handleStoreSelect(nextStoreId: string) {
    const nextStore = session.stores.find((store) => store.id === nextStoreId);

    if (nextStore) {
      appendCommandLog({
        label: "Store switched",
        detail: `${nextStore.name} opened in ${workspaceDefinitions[workspaceId].title}.`,
        tone: "accent"
      }, {
        optimistic: false,
        storeId: nextStore.id,
        workspaceId
      });
    }

    startTransition(() => {
      onSelectStore(nextStoreId);
      navigate(`/dashboard/${nextStoreId}/${workspaceId}`);
    });

    setIsStorePickerOpen(false);
  }

  function handleMenuSelect(groupLabel: string, item: string) {
    if (item === "Switch Store") {
      setIsStorePickerOpen(true);
      return;
    }

    if (item === "Logout" || item === "Exit") {
      onSignOut();
      return;
    }

    const workspaceMenuIntent = resolveWorkspaceMenuIntent(groupLabel, item);

    if (workspaceMenuIntent) {
      setPendingWorkspaceMenuIntent(workspaceMenuIntent);

      if (workspaceId !== workspaceMenuIntent.workspaceId) {
        navigateToWorkspace(workspaceMenuIntent.workspaceId, `${groupLabel} / ${item}`);
      }

      return;
    }

    if (groupLabel === "Sales") {
      const salesMenuIntent = resolveSalesMenuIntent(item);

      if (salesMenuIntent) {
        setPendingSalesMenuIntent(salesMenuIntent);

        if (workspaceId !== "sales") {
          navigateToWorkspace("sales", `${groupLabel} / ${item}`);
        }

        return;
      }
    }

    if (groupLabel === "Service") {
      const serviceMenuIntent = resolveServiceMenuIntent(item);

      if (serviceMenuIntent) {
        setPendingServiceMenuIntent(serviceMenuIntent);

        if (workspaceId !== "service" || activeServiceDetailRoNumber) {
          navigateToWorkspace("service", `${groupLabel} / ${item}`);
        }

        return;
      }
    }

    const nextWorkspaceId = resolveWorkspaceFromMenuItem(groupLabel, item);

    if (nextWorkspaceId) {
      navigateToWorkspace(nextWorkspaceId, `${groupLabel} / ${item}`);
    }
  }

  function handleMenuItemPin(groupLabel: string, item: string) {
    const nextWorkspaceId = resolveWorkspaceFromMenuItem(groupLabel, item);

    if (!nextWorkspaceId) {
      return;
    }

    if (!availableOpenWorkspaceIds.includes(nextWorkspaceId)) {
      setToolbarNotice(`${workspaceDefinitions[nextWorkspaceId].title} is not available for this store yet.`);
      return;
    }

    if (configuredOpenWorkspaceIds.includes(nextWorkspaceId)) {
      setToolbarNotice(`${workspaceDefinitions[nextWorkspaceId].title} is already pinned in Open Windows.`);
      return;
    }

    addOpenWorkspace(nextWorkspaceId);
    setToolbarNotice(`${workspaceDefinitions[nextWorkspaceId].title} added to Open Windows.`);
  }

  function isMenuItemPinnable(groupLabel: string, item: string) {
    const nextWorkspaceId = resolveWorkspaceFromMenuItem(groupLabel, item);

    return Boolean(nextWorkspaceId && availableOpenWorkspaceIds.includes(nextWorkspaceId));
  }

  function isMenuItemPinned(groupLabel: string, item: string) {
    const nextWorkspaceId = resolveWorkspaceFromMenuItem(groupLabel, item);

    return Boolean(nextWorkspaceId && configuredOpenWorkspaceIds.includes(nextWorkspaceId));
  }

  function handleQuickLaunch(button: QuickLaunchButton) {
    if (button.action === "switchStore") {
      setIsStorePickerOpen(true);
      return;
    }

    if (button.action === "logout") {
      onSignOut();
      return;
    }

    if (button.workspaceId) {
      navigateToWorkspace(button.workspaceId, `Quick launch ${button.slot}`);
    }
  }

  function handleSalesRowSelect(row: SalesWorkspaceRow) {
    if (selectedSalesRowId === row.id) {
      return;
    }

    setSelectedSalesRowId(row.id);
    appendCommandLog({
      label: "Deal focused",
      detail: `${row.customer} -+ Worksheet ${row.worksheet} -+ ${row.finalized}.`,
      tone: "neutral"
    });
  }

  function handleServiceRowSelect(row: ServiceWorkspaceRow) {
    if (selectedServiceRowId === row.id) {
      return;
    }

    setSelectedServiceRowId(row.id);
    setFocusedServiceTaskId(null);
    appendCommandLog({
      label: "RO focused",
      detail: `${row.roNumber} -+ ${row.customerName} -+ ${row.roStatus}.`,
      tone: "neutral"
    });
  }

  function handlePartsRowSelect(row: PartsWorkspaceRow) {
    if (selectedPartsRowId === row.id) {
      return;
    }

    setSelectedPartsRowId(row.id);
    appendCommandLog({
      label: "Part focused",
      detail: `${row.partNumber} -+ ${row.supplier} -+ ${row.orderCost}.`,
      tone: "neutral"
    });
  }

  function handleWebsiteRowSelect(row: WebsiteWorkspaceRow) {
    if (selectedWebsiteRowId === row.id) {
      return;
    }

    setSelectedWebsiteRowId(row.id);
    appendCommandLog({
      label: "Feed focused",
      detail: `${row.brand} -+ ${row.status} -+ ${row.domain}.`,
      tone: "neutral"
    });
  }

  function executeHeaderSearch(command: HeaderSearchCommand) {
    setHeaderSearchTerm("");

    if (command.action === "switchStore") {
      setIsStorePickerOpen(true);
      return;
    }

    if (command.action === "logout") {
      onSignOut();
      return;
    }

    if (command.workspaceId) {
      navigateToWorkspace(command.workspaceId, "Quick search");
    }
  }

  function handleWorkspaceTool(tool: string) {
    if (workspaceId === "service" && tool === "Detail") {
      if (!selectedServiceRow) {
        setToolbarNotice("Select an RO row to open its detail window.");
        return;
      }

      if (activeServiceDetailRoNumber === selectedServiceRow.roNumber) {
        setToolbarNotice(`${formatServiceDetailWindowTitle({
          customerName: selectedServiceRow.customerName,
          roNumber: selectedServiceRow.roNumber,
          storeId: activeStore.id
        })} is already open.`);
        return;
      }

      appendCommandLog({
        label: "RO detail opened",
        detail: `RO ${selectedServiceRow.roNumber} opened for ${selectedServiceRow.customerName}.`,
        tone: "neutral"
      });
      openServiceRepairOrder(activeStore.id, {
        customerName: selectedServiceRow.customerName,
        roNumber: selectedServiceRow.roNumber
      });
      return;
    }

    if (workspaceId === "service" && tool === "Duplicate" && !selectedServiceRow) {
      setToolbarNotice("Select an RO row before duplicating it.");
      return;
    }

    if (workspaceId === "parts" && tool === "Purchase Order") {
      handleOpenPartsLookup();
      return;
    }

    if (workspaceId === "parts" && tool === "Delete Selected" && !selectedPartsRow) {
      setToolbarNotice("Select a parts row before removing it.");
      return;
    }

    if (workspaceId === "parts" && tool === "Guide" && !selectedPartsRow) {
      setToolbarNotice("Select a parts row before attaching a guide note.");
      return;
    }

    if (tool === "Refresh") {
      setToolbarNotice(`Refreshing ${workspaceDefinitions[workspaceId].title}...`);
      setIsManualRefreshPending(true);
      setRefreshToken((current) => current + 1);
      return;
    }

    setActiveWorkflow(
      createActionWorkflow(workspaceId, tool, {
        storeName: activeStore.name,
        operatorName: session.user.name,
        salesRow: selectedSalesRow,
        serviceRow: selectedServiceRow,
        serviceRows,
        partsRow: selectedPartsRow,
        websiteRow: selectedWebsiteRow
      })
    );
  }

  function handleOpenPartsLookup(initialSearchTerm = partsQuickAddTerm) {
    if (workspaceId !== "parts") {
      return;
    }

    const nextSearchTerm = initialSearchTerm.trim();
    const nextLookupRows = filterPartsLookupRows(partsRows, nextSearchTerm, "partNumber");
    const nextSelectedRow = nextSearchTerm && nextLookupRows.length === 0 ? null : resolveSelectedRow(nextLookupRows, selectedPartsRowId);

    setActiveWorkflow(null);
    setPartsLookupSearchField("partNumber");
    setPartsLookupSearchTerm(nextSearchTerm);
    setPartsLookupSelectedRowId(nextSelectedRow?.id ?? null);
    setPartsLookupQuantity("1");
    setIsPartsLookupOpen(true);
  }

  function handleClosePartsLookup() {
    if (isPartsLookupSubmitting) {
      return;
    }

    setIsPartsLookupOpen(false);
    setPartsLookupSearchField("partNumber");
    setPartsLookupSearchTerm("");
    setPartsLookupSelectedRowId(null);
    setPartsLookupQuantity("1");
  }

  useEffect(() => {
    if (workspaceId !== "sales" || !pendingSalesMenuIntent) {
      return;
    }

    if (pendingSalesMenuIntent.kind === "boardFilter") {
      setActiveWorkflow(null);
      setSearchState({ searchTerm: "", filterValue: pendingSalesMenuIntent.filterValue });
      setToolbarNotice(pendingSalesMenuIntent.notice);
      setPendingSalesMenuIntent(null);
      return;
    }

    if (pendingSalesMenuIntent.tool === "Take Deposit") {
      if (workspace?.workspaceId !== "sales") {
        return;
      }

      if (workspace.rows.length > 0 && !selectedSalesRow) {
        return;
      }

      if (workspace.rows.length === 0) {
        setToolbarNotice("No sales rows available to post a deposit.");
        setPendingSalesMenuIntent(null);
        return;
      }
    }

    const nextWorkflow = createActionWorkflow("sales", pendingSalesMenuIntent.tool, {
      storeName: activeStore.name,
      operatorName: session.user.name,
      salesRow: selectedSalesRow,
      serviceRow: null,
      serviceRows: [],
      partsRow: null,
      websiteRow: null
    });

    setActiveWorkflow(
      pendingSalesMenuIntent.initialValues
        ? {
            ...nextWorkflow,
            values: {
              ...nextWorkflow.values,
              ...pendingSalesMenuIntent.initialValues
            }
          }
        : nextWorkflow
    );
    setToolbarNotice(pendingSalesMenuIntent.notice);
    setPendingSalesMenuIntent(null);
  }, [activeStore.name, pendingSalesMenuIntent, selectedSalesRow, session.user.name, workspace, workspaceId]);

  useEffect(() => {
    if (!pendingWorkspaceMenuIntent || workspaceId !== pendingWorkspaceMenuIntent.workspaceId) {
      return;
    }

    const nextWorkflow = applyWorkflowIntent(
      createActionWorkflow(pendingWorkspaceMenuIntent.workspaceId, pendingWorkspaceMenuIntent.tool, {
        storeName: activeStore.name,
        operatorName: session.user.name,
        salesRow: selectedSalesRow,
        serviceRow: selectedServiceRow,
        serviceRows,
        partsRow: selectedPartsRow,
        websiteRow: selectedWebsiteRow
      }),
      pendingWorkspaceMenuIntent
    );

    setActiveWorkflow(nextWorkflow);
    setToolbarNotice(pendingWorkspaceMenuIntent.notice);
    setPendingWorkspaceMenuIntent(null);
  }, [
    activeStore.name,
    pendingWorkspaceMenuIntent,
    selectedPartsRow,
    selectedSalesRow,
    selectedServiceRow,
    selectedWebsiteRow,
    serviceRows,
    session.user.name,
    workspaceId
  ]);

  useEffect(() => {
    if (workspaceId !== "service" || activeServiceDetailRoNumber || !pendingServiceMenuIntent) {
      return;
    }

    if (pendingServiceMenuIntent.kind === "queueView") {
      setActiveWorkflow(null);
      setServiceQueueView(pendingServiceMenuIntent.queueView);
      setIsServiceNotificationUnreadOnly(pendingServiceMenuIntent.unreadOnly);
      setToolbarNotice(`Service queue filtered to ${pendingServiceMenuIntent.queueView}.`);
      setPendingServiceMenuIntent(null);
      return;
    }

    if (pendingServiceMenuIntent.kind === "notificationRail") {
      setActiveWorkflow(null);
      setIsServiceNotificationRailCollapsed(false);
      setIsServiceNotificationUnreadOnly(pendingServiceMenuIntent.unreadOnly);
      setToolbarNotice(
        pendingServiceMenuIntent.unreadOnly ? "Service notification rail showing unread alerts." : "Service notification rail opened."
      );
      setPendingServiceMenuIntent(null);
      return;
    }

    setActiveWorkflow(
      createActionWorkflow("service", pendingServiceMenuIntent.tool, {
        storeName: activeStore.name,
        operatorName: session.user.name,
        salesRow: selectedSalesRow,
        serviceRow: selectedServiceRow,
        serviceRows,
        partsRow: selectedPartsRow,
        websiteRow: selectedWebsiteRow
      })
    );
    setToolbarNotice(`Service ${pendingServiceMenuIntent.tool} ready.`);
    setPendingServiceMenuIntent(null);
  }, [
    activeServiceDetailRoNumber,
    activeStore.name,
    pendingServiceMenuIntent,
    selectedPartsRow,
    selectedSalesRow,
    selectedServiceRow,
    selectedWebsiteRow,
    serviceRows,
    session.user.name,
    workspaceId
  ]);

  function applyWorkflowActionResult(result: WorkflowActionResponse) {
    applyWorkflowFocus(result.workspaceId, result.focusRowId, {
      setSelectedSalesRowId,
      setSelectedServiceRowId,
      setSelectedPartsRowId,
      setSelectedWebsiteRowId
    });

    setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));

    if (result.taskEntry) {
      const taskEntry = result.taskEntry;
      setTaskQueue((current) => [taskEntry, ...current.filter((entry) => entry.id !== taskEntry.id)].slice(0, 8));
    }

    setToolbarNotice(result.message);
    setRefreshToken((current) => current + 1);
  }

  function markRecentServiceRow(rowId: string) {
    setRecentServiceRowHighlights((current) => ({
      ...pruneRecentServiceRowHighlights(current),
      [rowId]: Date.now() + recentServiceRowHighlightDurationMs
    }));
  }

  function applyCreatedServiceOrderResult(createdOrder: CreateServiceOrderResponse) {
    setActiveWorkflow(null);
    setSelectedServiceRowId(createdOrder.row.id);
    markRecentServiceRow(createdOrder.row.id);
    setCommandLog((current) => [createdOrder.activityEntry, ...current.filter((entry) => entry.id !== createdOrder.activityEntry.id)].slice(0, 8));
    setWorkspace((current) => {
      if (current?.workspaceId !== "service") {
        return current;
      }

      return {
        ...current,
        rows: [createdOrder.row, ...current.rows.filter((row) => row.id !== createdOrder.row.id)]
      };
    });
    setToolbarNotice(createdOrder.message);
    setRefreshToken((current) => current + 1);
    openServiceRepairOrder(activeStore.id, {
      customerName: createdOrder.row.customerName,
      roNumber: createdOrder.row.roNumber
    });
  }

  function handleWorkflowChange(fieldKey: string, value: string) {
    setActiveWorkflow((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        values: {
          ...current.values,
          [fieldKey]: value
        }
      };
    });
  }

  async function handleWorkflowSubmit() {
    if (!activeWorkflow || isWorkflowSubmitting) {
      return;
    }

    const workflow = activeWorkflow;
    const detail = workflow.buildDetail(workflow.values);

    setIsWorkflowSubmitting(true);
    setToolbarNotice(`Saving ${workflow.commandLabel}...`);

    try {
      if (workspaceId === "service" && (workflow.submitAction === "New Estimate" || workflow.submitAction === "New Repair Order")) {
        const orderType = workflow.submitAction === "New Estimate" ? "Estimate" : "Repair Order";
        const modelValue =
          orderType === "Estimate"
            ? workflow.values.unit?.trim() || selectedServiceRow?.model || ""
            : workflow.values.model?.trim() || selectedServiceRow?.model || "";
        const createdOrder = await createServiceOrder(activeStore.id, {
          actorUserId: session.user.id,
          orderType,
          customerName: workflow.values.customerName?.trim() ?? "",
          stockNumber:
            orderType === "Repair Order"
              ? workflow.values.stockNumber?.trim() || selectedServiceRow?.stockNumber || ""
              : selectedServiceRow?.stockNumber || "",
          model: modelValue,
          serviceWriter: selectedServiceRow?.serviceWriter || session.user.name,
          maker: deriveServiceMakerFromModelInput(modelValue, selectedServiceRow?.maker || ""),
          note: workflow.values.concern?.trim() || selectedServiceRow?.note || ""
        });

        applyCreatedServiceOrderResult(createdOrder);
        return;
      }

      if (workspaceId === "service" && workflow.submitAction === "Duplicate") {
        if (!selectedServiceRow) {
          throw new Error("Select an RO row before duplicating it.");
        }

        const duplicatedOrder = await duplicateServiceOrder(activeStore.id, selectedServiceRow.id, {
          actorUserId: session.user.id,
          reason: workflow.values.reason?.trim() || "Follow-up repair"
        });

        applyCreatedServiceOrderResult(duplicatedOrder);
        return;
      }

      const result = await submitWorkflowAction(activeStore.id, {
        workspaceId,
        action: workflow.submitAction,
        selectedRowId: getSelectedRowIdForWorkspace(workspaceId, {
          sales: selectedSalesRowId,
          service: selectedServiceRowId,
          parts: selectedPartsRowId,
          website: selectedWebsiteRowId
        }),
        detail,
        tone: workflow.tone,
        actorUserId: session.user.id,
        values: workflow.values
      });

      setActiveWorkflow(null);
      applyWorkflowActionResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the workflow action.";

      appendCommandLog({
        label: `${workflow.commandLabel} failed`,
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
    } finally {
      setIsWorkflowSubmitting(false);
    }
  }

  async function handlePartsLookupSubmit() {
    if (workspaceId !== "parts" || isPartsLookupSubmitting) {
      return;
    }

    const manualPartNumber = partsLookupSearchField === "partNumber" ? partsLookupSearchTerm.trim() : "";
    const partNumber = activePartsLookupRow?.partNumber ?? manualPartNumber;

    if (!partNumber) {
      setToolbarNotice("Select a lookup row or enter a part number before adding a line.");
      return;
    }

    if (!activePartsLookupRow && partsLookupSearchField !== "partNumber") {
      setToolbarNotice("Select a lookup row before adding a line.");
      return;
    }

    const quantity = `${Math.max(1, Number.parseInt(partsLookupQuantity, 10) || 1)}`;
    const supplier = activePartsLookupRow?.supplier ?? selectedPartsRow?.supplier ?? "MM";
    const detail = summarizeWorkflowValues({ supplier, partNumber, quantity }, ["supplier", "partNumber", "quantity"]);

    setIsPartsLookupSubmitting(true);
    setToolbarNotice("Saving Purchase Order...");

    try {
      const result = await submitWorkflowAction(activeStore.id, {
        workspaceId: "parts",
        action: "Purchase Order",
        selectedRowId: activePartsLookupRow?.id ?? null,
        detail,
        tone: "accent",
        actorUserId: session.user.id,
        values: {
          supplier,
          partNumber,
          quantity
        }
      });

      setIsPartsLookupOpen(false);
      setPartsQuickAddTerm("");
      setPartsLookupSearchField("partNumber");
      setPartsLookupSearchTerm("");
      setPartsLookupSelectedRowId(null);
      setPartsLookupQuantity("1");
      applyWorkflowActionResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the purchase order line.";

      appendCommandLog({
        label: "Purchase Order failed",
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
    } finally {
      setIsPartsLookupSubmitting(false);
    }
  }

  async function handleTaskStatusUpdate(taskId: string, status: TaskStatus) {
    if (updatingTaskId || serviceQaCleanupRoNumber) {
      return;
    }

    const activeTask = taskQueue.find((entry) => entry.id === taskId);
    setUpdatingTaskId(taskId);
    setToolbarNotice(`Updating ${activeTask?.action ?? "task"}...`);

    try {
      const result = await updateTaskStatus(activeStore.id, taskId, {
        status,
        actorUserId: session.user.id
      });

      setTaskQueue((current) => [result.taskEntry, ...current.filter((entry) => entry.id !== result.taskEntry.id)].slice(0, 8));
      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update the task.";

      appendCommandLog({
        label: `${activeTask?.action ?? "Task"} update failed`,
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleTaskAssigneeUpdate(taskId: string, assigneeUserId: string | null) {
    if (updatingTaskId || serviceQaCleanupRoNumber) {
      return;
    }

    const activeTask = taskQueue.find((entry) => entry.id === taskId);
    setUpdatingTaskId(taskId);
    setToolbarNotice(`Handing off ${activeTask?.action ?? "task"}...`);

    try {
      const result = await updateTaskAssignee(activeStore.id, taskId, {
        actorUserId: session.user.id,
        assigneeUserId
      });

      setTaskQueue((current) => [result.taskEntry, ...current.filter((entry) => entry.id !== result.taskEntry.id)].slice(0, 8));
      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to hand off the task.";

      appendCommandLog({
        label: `${activeTask?.action ?? "Task"} handoff failed`,
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleTaskNoteCreate(taskId: string, body: string, kind: TaskNoteKind) {
    if (updatingTaskId || serviceQaCleanupRoNumber) {
      return false;
    }

    const activeTask = taskQueue.find((entry) => entry.id === taskId);
    setUpdatingTaskId(taskId);
    setToolbarNotice(kind === "Resolution" ? `Resolving ${activeTask?.action ?? "task"}...` : `Saving note for ${activeTask?.action ?? "task"}...`);

    try {
      const result = await createTaskNote(activeStore.id, taskId, {
        actorUserId: session.user.id,
        body,
        kind
      });

      setTaskQueue((current) => [result.taskEntry, ...current.filter((entry) => entry.id !== result.taskEntry.id)].slice(0, 8));
      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the task note.";

      appendCommandLog({
        label: `${activeTask?.action ?? "Task"} note failed`,
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleServiceUtilityQaCleanup(targetStoreId: string, roNumber: string) {
    if (updatingTaskId || serviceQaCleanupRoNumber) {
      return false;
    }

    const canPatchInlineServiceState = workspaceId === "service" && targetStoreId === activeStore.id;
    setServiceQaCleanupStoreId(targetStoreId);
    setServiceQaCleanupRoNumber(roNumber);
    setToolbarNotice(`Cleaning demo QA utility tasks for RO ${roNumber}...`);

    try {
      const result = await cleanupServiceUtilityQaTasks(targetStoreId, {
        actorUserId: session.user.id,
        roNumber
      });

      if (canPatchInlineServiceState) {
        setTaskQueue((current) => current.filter((entry) => !result.deletedTaskIds.includes(entry.id)));
        setCommandLog((current) => {
          const nextEntries = current.filter(
            (entry) => !(entry.detail.includes(serviceUtilityQaMarker) && entry.detail.startsWith(`${roNumber} -+`))
          );

          return result.activityEntry ? [result.activityEntry, ...nextEntries.filter((entry) => entry.id !== result.activityEntry?.id)].slice(0, 8) : nextEntries.slice(0, 8);
        });
      }

      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to clean demo QA tasks for RO ${roNumber}.`;

      appendCommandLog({
        label: "Demo QA cleanup failed",
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setServiceQaCleanupStoreId(null);
      setServiceQaCleanupRoNumber(null);
    }
  }

  function patchServiceWorkspaceRow(nextRow: ServiceWorkspaceRow) {
    setWorkspace((current) => {
      if (current?.workspaceId !== "service") {
        return current;
      }

      return {
        ...current,
        rows: current.rows.map((row) => (row.id === nextRow.id ? nextRow : row))
      };
    });
  }

  async function handleServiceQueueRowUpdate(nextRow: ServiceWorkspaceRow) {
    if (updatingServiceQueueRowId) {
      return false;
    }

    setUpdatingServiceQueueRowId(nextRow.id);
    setToolbarNotice(`Saving queue edits for RO ${nextRow.roNumber}...`);

    try {
      const result = await updateServiceOrderDetail(activeStore.id, nextRow.id, {
        mode: "updateQueueRow",
        actorUserId: session.user.id,
        inDate: nextRow.inDate,
        roNumber: nextRow.roNumber,
        orderType: nextRow.orderType,
        customerName: nextRow.customerName,
        stockNumber: nextRow.stockNumber,
        model: nextRow.model,
        serviceWriter: nextRow.serviceWriter,
        roStatus: nextRow.roStatus,
        category: nextRow.category,
        maker: nextRow.maker,
        note: nextRow.note
      });

      patchServiceWorkspaceRow(result.row as ServiceWorkspaceRow);
      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update the service queue row.";

      appendCommandLog({
        label: "Service queue edit failed",
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingServiceQueueRowId(null);
    }
  }

  async function handleServiceOrderAction(action: ServiceOrderActionRequest, pendingLabel: string, actionKey: string) {
    if (!selectedServiceRowId || updatingServiceDetailKey) {
      return false;
    }

    setUpdatingServiceDetailKey(actionKey);
    setToolbarNotice(pendingLabel);

    try {
      const result = await updateServiceOrderDetail(activeStore.id, selectedServiceRowId, action);

      patchServiceWorkspaceRow(result.row as ServiceWorkspaceRow);
      setServiceWorkbenchModel(result.detail as ServiceWorkbenchModel);
      setServicePartCatalog(result.partCatalog);
      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update the service order.";

      appendCommandLog({
        label: "Service order update failed",
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingServiceDetailKey(null);
    }
  }

  async function handleTaskSlaPolicyUpdate(targetWorkspaceId: WorkspaceId, action: string, slaMinutes: number) {
    if (updatingTaskPolicyKey) {
      return false;
    }

    const policyKey = createTaskSlaPolicyKey(targetWorkspaceId, action);
    setUpdatingTaskPolicyKey(policyKey);
    setToolbarNotice(`Saving ${action} SLA...`);

    try {
      const result = await updateTaskSlaPolicy(activeStore.id, {
        workspaceId: targetWorkspaceId,
        action,
        slaMinutes,
        actorUserId: session.user.id,
        applyToOpenTasks: true
      });

      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update the task SLA policy.";

      appendCommandLog({
        label: `${action} SLA update failed`,
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingTaskPolicyKey(null);
    }
  }

  async function handleTaskSlaPolicyReset(targetWorkspaceId: WorkspaceId, action: string) {
    if (updatingTaskPolicyKey) {
      return false;
    }

    const policyKey = `reset:${createTaskSlaPolicyKey(targetWorkspaceId, action)}`;
    setUpdatingTaskPolicyKey(policyKey);
    setToolbarNotice(`Resetting ${action} SLA...`);

    try {
      const result = await runTaskSlaPolicyAction(activeStore.id, {
        mode: "resetOne",
        actorUserId: session.user.id,
        workspaceId: targetWorkspaceId,
        action,
        applyToOpenTasks: true
      });

      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset the task SLA policy.";

      appendCommandLog({
        label: `${action} SLA reset failed`,
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingTaskPolicyKey(null);
    }
  }

  async function handleTaskSlaPolicyCopyOne(targetStoreId: string, targetWorkspaceId: WorkspaceId, action: string) {
    if (updatingTaskPolicyKey) {
      return false;
    }

    const policyKey = createTaskSlaPolicyKey(targetWorkspaceId, action);
    setUpdatingTaskPolicyKey(`copy-one:${targetStoreId}:${policyKey}`);
    setToolbarNotice(`Rolling out ${action} SLA...`);

    try {
      const result = await runTaskSlaPolicyAction(activeStore.id, {
        mode: "copyOneToStore",
        actorUserId: session.user.id,
        targetStoreId,
        workspaceId: targetWorkspaceId,
        action,
        applyToOpenTasks: true
      });

      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to roll out the SLA policy to the target store.";

      appendCommandLog({
        label: `${action} rollout failed`,
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingTaskPolicyKey(null);
    }
  }

  async function handleTaskSlaPolicyCopy(targetStoreId: string) {
    if (updatingTaskPolicyKey) {
      return false;
    }

    setUpdatingTaskPolicyKey(`copy:${targetStoreId}`);
    setToolbarNotice("Copying store SLA policies...");

    try {
      const result = await runTaskSlaPolicyAction(activeStore.id, {
        mode: "copyToStore",
        actorUserId: session.user.id,
        targetStoreId,
        applyToOpenTasks: true
      });

      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to copy the SLA policies to another store.";

      appendCommandLog({
        label: "SLA policy rollout failed",
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingTaskPolicyKey(null);
    }
  }

  async function handleTaskSlaPolicyResetAll() {
    if (updatingTaskPolicyKey) {
      return false;
    }

    setUpdatingTaskPolicyKey("reset-all");
    setToolbarNotice("Resetting all SLA policies to defaults...");

    try {
      const result = await runTaskSlaPolicyAction(activeStore.id, {
        mode: "resetAll",
        actorUserId: session.user.id,
        applyToOpenTasks: true
      });

      setCommandLog((current) => [result.activityEntry, ...current.filter((entry) => entry.id !== result.activityEntry.id)].slice(0, 8));
      setToolbarNotice(result.message);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset the SLA policies.";

      appendCommandLog({
        label: "SLA reset failed",
        detail: message,
        tone: "attention"
      });
      setToolbarNotice(message);
      return false;
    } finally {
      setUpdatingTaskPolicyKey(null);
    }
  }

  function handleHeaderSearchSubmit() {
    const firstCommand = headerSearchResults[0];

    if (firstCommand) {
      executeHeaderSearch(firstCommand);
    }
  }

  return (
    <div className="dashboard-screen legacy-dashboard">
      <header className="legacy-app-frame">
        <div className="legacy-title-strip">
          <span>Premier Marine Cloud DMS</span>
          <span>
            {dashboard?.store.name ?? activeStore.name} -+ {session.user.name}
          </span>
        </div>

        <div className="legacy-menu-row">
          <TopTabs
            isItemPinned={isMenuItemPinned}
            isItemPinnable={isMenuItemPinnable}
            items={menuGroups}
            onPinItem={handleMenuItemPin}
            onSelectItem={handleMenuSelect}
          />

          <div className="legacy-header-tools">
            <div className="legacy-global-search-shell">
              <input
                className="legacy-global-search"
                onChange={(event) => setHeaderSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleHeaderSearchSubmit();
                  }

                  if (event.key === "Escape") {
                    setHeaderSearchTerm("");
                  }
                }}
                placeholder="Main Menu Quick Search"
                type="text"
                value={headerSearchTerm}
              />

              {headerSearchTerm.trim() ? (
                <div className="legacy-search-results">
                  {headerSearchResults.length === 0 ? (
                    <div className="legacy-search-result-empty">No matching destinations</div>
                  ) : (
                    headerSearchResults.map((command) => (
                      <button
                        className="legacy-search-result"
                        key={command.id}
                        onClick={() => executeHeaderSearch(command)}
                        type="button"
                      >
                        <strong>{command.label}</strong>
                        <span>{command.detail}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <button className="legacy-header-button" onClick={() => setIsStorePickerOpen(true)} type="button">
              Switch Store
            </button>
            <button className="legacy-header-button" onClick={onSignOut} type="button">
              Logout
            </button>
          </div>
        </div>

        <div className="legacy-launch-strip">
          {quickLaunchButtons.map((button) => {
            const isActiveQuickLaunch = button.workspaceId === workspaceId;

            return (
              <button
                aria-current={isActiveQuickLaunch ? "page" : undefined}
                className={`legacy-launch-button${isActiveQuickLaunch ? " is-active" : ""}`}
                key={button.slot}
                onClick={() => handleQuickLaunch(button)}
                type="button"
              >
                <span>{button.slot}</span>
                <strong>{button.label}</strong>
              </button>
            );
          })}
        </div>
      </header>

      {errorMessage ? <p className="form-error banner-error">{errorMessage}</p> : null}

      <div className={`legacy-workspace-shell${workspaceId === "service" ? " is-service-shell" : ""}`}>
        <aside className="legacy-open-windows" onContextMenu={handleOpenWindowsRailContextMenu}>
          <div className="legacy-open-header">
            <div className="legacy-open-title-row">
              <div className="legacy-open-title">Open Windows</div>
              <div className="legacy-open-header-actions">
                <div className="legacy-open-help-shell">
                  <button aria-label="Open Windows help" className="legacy-open-icon-button" title="Open Windows help" type="button">
                    i
                  </button>
                  <div className="legacy-open-help-tooltip" role="tooltip">
                    Right-click the rail to add windows, drag cards to set the order, and use Clear All to remove every item.
                  </div>
                </div>
                <button
                  className="legacy-open-clear-button"
                  disabled={!hasAnyOpenWindows}
                  onClick={clearAllOpenWindows}
                  title="Remove all Open Windows items"
                  type="button"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
          {openWindowsContextMenu && openWindowsContextMenu.targetWorkspaceId === null ? (
            <div className="legacy-open-context-inline is-rail">
              {hiddenOpenWorkspaceIds.length > 0 ? (
                <>
                  <span className="legacy-open-context-label">Add Window</span>
                  {hiddenOpenWorkspaceIds.map((candidateWorkspaceId) => (
                    <button
                      className="legacy-open-context-action"
                      key={candidateWorkspaceId}
                      onClick={() => {
                        addOpenWorkspace(candidateWorkspaceId);
                        setOpenWindowsContextMenu(null);
                      }}
                      type="button"
                    >
                      Add {workspaceDefinitions[candidateWorkspaceId].title}
                    </button>
                  ))}
                </>
              ) : (
                <p className="legacy-open-context-empty">All available windows are already pinned in the rail.</p>
              )}
            </div>
          ) : null}
          <div className="legacy-open-window-list">
            {visibleOpenWindowItems.length === 0 ? <div aria-hidden="true" className="legacy-open-window-canvas" /> : null}
            {visibleOpenWindowItems.map((item) => {
              const isWorkspaceItem = item.kind === "workspace";
              const workspaceIdForItem = isWorkspaceItem ? item.workspaceId : null;
              const workspaceTitle = workspaceIdForItem ? workspaceDefinitions[workspaceIdForItem].title : null;
              const detailWindow = item.kind === "detail" ? item.windowEntry : null;
              const detailTitle = detailWindow ? formatServiceDetailWindowTitle(detailWindow) : null;
              const isContextTarget = isWorkspaceItem && contextMenuTargetWorkspaceId === workspaceIdForItem;
              const dropStateClass = openWindowDropState?.key === item.key ? ` is-drop-${openWindowDropState.position}` : "";

              return (
                <div
                  className={`legacy-window-link-shell${isContextTarget ? " is-context-open" : ""}${draggingOpenWindowKey === item.key ? " is-dragging" : ""}${dropStateClass}`}
                  draggable
                  key={item.key}
                  onDragEnd={handleOpenWindowDragEnd}
                  onDragOver={(event) => handleOpenWindowDragOver(event, item.key)}
                  onDragStart={(event) => handleOpenWindowDragStart(event, item.key)}
                  onDrop={(event) => handleOpenWindowDrop(event, item.key)}
                >
                  {isWorkspaceItem && workspaceIdForItem && workspaceTitle ? (
                    <Fragment>
                      <button
                        className={`legacy-window-link${item.isActive ? " active" : ""}`}
                        onClick={() => navigateToWorkspace(workspaceIdForItem, "Open Windows")}
                        onContextMenu={(event) => openOpenWindowsContextMenu(event, workspaceIdForItem)}
                        type="button"
                      >
                        <span aria-hidden="true" className="legacy-window-link-grip">
                          ::
                        </span>
                        <span className="legacy-window-link-copy">{workspaceTitle}</span>
                      </button>
                      {isContextTarget ? (
                        <button
                          className={`legacy-window-link-context-button${contextMenuTargetIsPinned ? " is-danger" : ""}`}
                          onClick={() => {
                            if (contextMenuTargetIsPinned) {
                              removeOpenWorkspace(workspaceIdForItem);
                              setToolbarNotice(`${workspaceTitle} removed from Open Windows.`);
                            } else {
                              addOpenWorkspace(workspaceIdForItem);
                              setToolbarNotice(`${workspaceTitle} added to Open Windows.`);
                            }

                            setOpenWindowsContextMenu(null);
                          }}
                          type="button"
                        >
                          {contextMenuTargetIsPinned ? "Delete" : "Pin"}
                        </button>
                      ) : null}
                    </Fragment>
                  ) : detailWindow && detailTitle ? (
                    <Fragment>
                      <button
                        className={`legacy-window-link legacy-window-link-detail${item.isActive ? " active" : ""}`}
                        onClick={() =>
                          openServiceRepairOrder(detailWindow.storeId, {
                            customerName: detailWindow.customerName,
                            roNumber: detailWindow.roNumber
                          })
                        }
                        type="button"
                      >
                        <span aria-hidden="true" className="legacy-window-link-grip">
                          ::
                        </span>
                        <span className="legacy-window-link-copy">{detailTitle}</span>
                      </button>
                      <button
                        aria-label={`Close ${detailTitle}`}
                        className="legacy-window-link-context-button legacy-window-link-detail-close"
                        onClick={() => closeServiceDetailWindow(detailWindow.storeId, detailWindow.roNumber)}
                        type="button"
                      >
                        x
                      </button>
                    </Fragment>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section
          className={`legacy-workspace${workspaceId === "service" ? " is-service-workspace" : ""}${workspaceId === "parts" ? " is-parts-workspace" : ""}`}
          data-workspace-id={workspaceId}
        >
          {shouldRenderActiveWorkspace ? (
            <>
              <div className="legacy-window-bar">
                <div>
                  <strong>{activeWindowTitle}</strong>
                  <span>
                    {dashboard?.store.name ?? activeStore.name} -+ {activeWindowSubtitle}
                  </span>
                </div>
                <div className="legacy-window-bar-meta">
                  <span>{dashboard?.store.code ?? activeStore.code}</span>
                  <span>{dashboard?.store.dealerGroupName ?? activeStore.dealerGroupName}</span>
                </div>
              </div>

              <div className="legacy-toolbar-strip">
                <div className="legacy-toolbar-actions">
                  {activeWorkspace.tools.map((tool) => (
                    <button className="legacy-tool-button" key={tool} onClick={() => handleWorkspaceTool(tool)} type="button">
                      {tool}
                    </button>
                  ))}
                </div>
                <div className="legacy-toolbar-summary">
                  {lastWorkspaceSyncLabel ? <div className="legacy-toolbar-meta">{lastWorkspaceSyncLabel}</div> : null}
                </div>
              </div>

              {toolbarNotice ? <div className="legacy-toolbar-status">{toolbarNotice}</div> : null}

              <div className={`legacy-workspace-canvas${workspaceId === "service" ? " is-service-canvas" : ""}`}>
                <div
                  className={`legacy-workspace-stack${
                    workspaceId === "service"
                      ? ` is-service-layout${isServiceNotificationRailCollapsed ? " is-service-notification-rail-collapsed" : ""}`
                      : ""
                  }`}
                >
                  {isLoading ? (
                    <div className="legacy-loading-panel">Loading workspace...</div>
                  ) : (
                    renderWorkspace(
                      workspaceId,
                      dashboard,
                      workspace,
                      openWorkspaceIds,
                      activeStore.statusLine,
                      searchState,
                      setSearchState,
                      {
                        selectedSalesRowId,
                        onSelectSalesRow: handleSalesRowSelect,
                        selectedServiceRowId,
                        onSelectServiceRow: handleServiceRowSelect,
                        selectedPartsRowId,
                        onSelectPartsRow: handlePartsRowSelect,
                        selectedWebsiteRowId,
                        onSelectWebsiteRow: handleWebsiteRowSelect
                      },
                      navigateToWorkspace,
                      desktopWidgetsStorageKey,
                      {
                        activeStoreId: activeStore.id,
                        actorUserId: session.user.id,
                        availableStores: session.stores,
                        cleaningQaStoreId: serviceQaCleanupStoreId,
                        cleaningQaRoNumber: serviceQaCleanupRoNumber,
                        onCopySingleTaskSlaPolicy: handleTaskSlaPolicyCopyOne,
                        onCopyTaskSlaPolicies: handleTaskSlaPolicyCopy,
                        onCleanupQaTasks: handleServiceUtilityQaCleanup,
                        onOpenServiceRo: openServiceRepairOrder,
                        onResetAllTaskSlaPolicies: handleTaskSlaPolicyResetAll,
                        onResetTaskSlaPolicy: handleTaskSlaPolicyReset,
                        onUpdateTaskSlaPolicy: handleTaskSlaPolicyUpdate,
                        requestedCleanupStoreId: requestedAuditCleanupStoreId,
                        refreshKey: refreshToken,
                        updatingPolicyKey: updatingTaskPolicyKey
                      },
                      {
                        activeServiceDetailRoNumber,
                        entries: taskQueue,
                        activityEntries: commandLog,
                        cleaningQaRoNumber: serviceQaCleanupRoNumber,
                        focusedTaskId: focusedServiceTaskId,
                        isServiceDetailLoading,
                        isFilteredByOperator: isOperatorFilterEnabled,
                        onSelectServiceQueueView: setServiceQueueView,
                        recentServiceRowHighlights,
                        serviceDetail: serviceWorkbenchModel,
                        serviceNotificationEntries,
                        servicePartCatalog,
                        serviceQueueView,
                        updatingServiceDetailKey,
                        updatingServiceQueueRowId,
                        onAddLaborSession: (payload) =>
                          handleServiceOrderAction(
                            {
                              mode: "addLaborSession",
                              actorUserId: session.user.id,
                              ...payload
                            },
                            "Saving labor session...",
                            `labor:${payload.jobId}`
                          ),
                        onAddPart: (payload) =>
                          handleServiceOrderAction(
                            {
                              mode: "addPart",
                              actorUserId: session.user.id,
                              ...payload
                            },
                            "Adding part to the job...",
                            `part:add:${payload.jobId}`
                          ),
                        onAddTaskNote: handleTaskNoteCreate,
                        onAssignTask: handleTaskAssigneeUpdate,
                        onCreateJob: (payload) =>
                          handleServiceOrderAction(
                            {
                              mode: "createJob",
                              actorUserId: session.user.id,
                              ...payload
                            },
                            "Creating service job...",
                            "job:create"
                          ),
                        onCleanupQaTasks: (roNumber) => handleServiceUtilityQaCleanup(activeStore.id, roNumber),
                        onRemovePart: (jobId, partNumber) =>
                          handleServiceOrderAction(
                            {
                              mode: "removePart",
                              actorUserId: session.user.id,
                              jobId,
                              partNumber
                            },
                            "Removing part from the job...",
                            `part:remove:${jobId}:${partNumber}`
                          ),
                        onReturnToAuditCleanup: serviceReturnStore
                          ? () => returnToAuditCleanup(serviceReturnStore.id, requestedAuditCleanupStoreId)
                          : null,
                        onUpdateQueueRow: handleServiceQueueRowUpdate,
                        onUpdateJob: (payload) =>
                          handleServiceOrderAction(
                            {
                              mode: "updateJob",
                              actorUserId: session.user.id,
                              ...payload
                            },
                            "Saving job changes...",
                            `job:update:${payload.jobId}`
                          ),
                        onUpdateOrderType: (orderType) =>
                          handleServiceOrderAction(
                            {
                              mode: "updateOrderType",
                              actorUserId: session.user.id,
                              orderType
                            },
                            `Converting to ${orderType}...`,
                            `orderType:${orderType}`
                          ),
                        onUpdateWarrantyClaim: (payload) =>
                          handleServiceOrderAction(
                            {
                              mode: "updateWarrantyClaim",
                              actorUserId: session.user.id,
                              ...payload
                            },
                            "Saving warranty claim...",
                            `warranty:${payload.jobId}`
                          ),
                        onUpdateStatus: handleTaskStatusUpdate,
                        operators: dashboard?.operators ?? [],
                        returnToAuditContext: serviceReturnStore
                          ? {
                              label: "Return to Audit Cleanup",
                              subtitle:
                                serviceReturnCleanupStore && serviceReturnCleanupStore.id !== serviceReturnStore.id
                                  ? `${serviceReturnStore.name} -+ Cleanup scope ${serviceReturnCleanupStore.name}`
                                  : serviceReturnStore.name
                            }
                          : null,
                        updatingTaskId
                      },
                      {
                        isLookupOpen: isPartsLookupOpen,
                        isSubmitting: isPartsLookupSubmitting,
                        lookupSearchField: partsLookupSearchField,
                        lookupSearchTerm: partsLookupSearchTerm,
                        lookupSelectedRowId: partsLookupSelectedRowId,
                        lookupQuantity: partsLookupQuantity,
                        quickAddTerm: partsQuickAddTerm,
                        onChangeLookupQuantity: setPartsLookupQuantity,
                        onChangeLookupSearchField: setPartsLookupSearchField,
                        onChangeLookupSearchTerm: setPartsLookupSearchTerm,
                        onChangeQuickAddTerm: setPartsQuickAddTerm,
                        onCloseLookup: handleClosePartsLookup,
                        onOpenLookup: handleOpenPartsLookup,
                        onSelectLookupRow: handlePartsRowSelect,
                        onSelectLookupResult: setPartsLookupSelectedRowId,
                        onSubmitLookup: handlePartsLookupSubmit
                      }
                    )
                  )}

                  {workspaceId === "service" ? (
                    <ServiceNotificationRail
                      activeDetailRoNumber={activeServiceDetailRoNumber}
                      entries={serviceNotificationEntries}
                      isCollapsed={isServiceNotificationRailCollapsed}
                      isLoading={isWorkspaceLoading}
                      isUnreadOnly={isServiceNotificationUnreadOnly}
                      onOpenServiceRo={(notificationEntry) =>
                        openServiceRepairOrder(activeStore.id, {
                          customerName: notificationEntry.customerName,
                          roNumber: notificationEntry.roNumber
                        })
                      }
                      onToggleCollapsed={() => setIsServiceNotificationRailCollapsed((current) => !current)}
                      onToggleUnreadOnly={() => setIsServiceNotificationUnreadOnly((current) => !current)}
                    />
                  ) : !shouldRenderCommandLogRail ? null : (
                    <CommandLogRail
                      entries={commandLog}
                      isFilteredByOperator={isOperatorFilterEnabled}
                      isLoading={isActivityLoading}
                      onToggleOperatorFilter={() => setIsOperatorFilterEnabled((current) => !current)}
                      workspaceTitle={activeWorkspace.title}
                    />
                  )}
                  {!shouldRenderTaskQueueRail ? null : (
                    <TaskQueueRail
                      entries={taskQueue}
                      isFilteredByOperator={isOperatorFilterEnabled}
                      isLoading={isTaskQueueLoading}
                      onAddTaskNote={handleTaskNoteCreate}
                      onAssignTask={handleTaskAssigneeUpdate}
                      onToggleOperatorFilter={() => setIsOperatorFilterEnabled((current) => !current)}
                      operators={dashboard?.operators ?? []}
                      onUpdateStatus={handleTaskStatusUpdate}
                      updatingTaskId={updatingTaskId}
                      workspaceTitle={activeWorkspace.title}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div aria-hidden="true" className="legacy-workspace-empty-canvas" />
          )}
        </section>
      </div>

      <StoreSelectModal
        activeStoreId={activeStore.id}
        onClose={() => setIsStorePickerOpen(false)}
        onSelect={(store) => handleStoreSelect(store.id)}
        open={isStorePickerOpen}
        stores={session.stores}
        subtitle="Shift the dashboard shell to another store without leaving the compact command surface."
        title="Switch Store"
      />

      <ActionWorkflowModal
        isSubmitting={isWorkflowSubmitting}
        onChangeField={handleWorkflowChange}
        onClose={() => setActiveWorkflow(null)}
        onSubmit={handleWorkflowSubmit}
        workflow={activeWorkflow}
      />
    </div>
  );
}

interface ServiceQueueBoardProps {
  onFilterChange: (filterValue: string) => void;
  onSearchChange: (searchTerm: string) => void;
  onSelectQueueView: React.Dispatch<React.SetStateAction<ServiceQueueView>>;
  onSelectRow: (row: ServiceWorkspaceRow) => void;
  onUpdateRow: (row: ServiceWorkspaceRow) => Promise<boolean>;
  recentServiceRowHighlights: Record<string, number>;
  rows: ServiceWorkspaceRow[];
  searchState: WorkspaceSearchState;
  selectedRowId: string | null;
  serviceNotificationEntries: ServiceNotificationEntry[];
  serviceQueueView: ServiceQueueView;
  updatingRowId: string | null;
}

function ServiceQueueBoard({
  onFilterChange,
  onSearchChange,
  onSelectQueueView,
  onSelectRow,
  onUpdateRow,
  recentServiceRowHighlights,
  rows,
  searchState,
  selectedRowId,
  serviceNotificationEntries,
  serviceQueueView,
  updatingRowId
}: ServiceQueueBoardProps) {
  const [isQueueViewsCollapsed, setIsQueueViewsCollapsed] = useState(false);
  const [quickFilters, setQuickFilters] = useState<ServiceQueueQuickFilterState>(initialServiceQueueQuickFilterState);
  const [editingCell, setEditingCell] = useState<ServiceQueueEditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const serviceNotificationsByRo = groupServiceNotificationsByRo(serviceNotificationEntries);
  const noteEditorRow = editingCell?.field === "note" ? rows.find((candidate) => candidate.id === editingCell.rowId) ?? null : null;
  const filterOptions = buildFilterOptions(rows.map((row) => row.roStatus));
  const hasActiveQuickFilters = Object.values(quickFilters).some(Boolean);
  const filteredRows = rows.filter(
    (row) =>
      matchesWorkspaceSearch(
        [
          row.inDate,
          row.roNumber,
          row.orderType,
          row.customerName,
          row.stockNumber,
          row.model,
          row.serviceWriter,
          row.roStatus,
          row.category,
          row.maker,
          row.note
        ],
        searchState.searchTerm
      ) &&
      matchesWorkspaceFilter(row.roStatus, searchState.filterValue) &&
      matchesServiceQueueView(row, serviceQueueView, serviceNotificationsByRo[row.roNumber] ?? []) &&
      (!hasActiveQuickFilters || serviceQueueQuickFilterDefinitions.some((filterDefinition) => quickFilters[filterDefinition.key] && filterDefinition.matches(row)))
  );
  const selectedRow = resolveSelectedRow(filteredRows, selectedRowId);

  function beginEditing(row: ServiceWorkspaceRow, field: EditableServiceQueueField) {
    setEditingCell({ field, rowId: row.id });
    setDraftValue(String(row[field] ?? ""));
  }

  function cancelEditing() {
    setEditingCell(null);
    setDraftValue("");
  }

  async function saveCell(row: ServiceWorkspaceRow, field: EditableServiceQueueField) {
    const nextValue = normalizeServiceQueueDraftValue(field, draftValue);
    const currentValue = normalizeServiceQueueDraftValue(field, String(row[field] ?? ""));

    if (nextValue === currentValue) {
      cancelEditing();
      return;
    }

    const nextRow = {
      ...row,
      [field]: nextValue
    } as ServiceWorkspaceRow;
    const didSave = await onUpdateRow(nextRow);

    if (didSave) {
      cancelEditing();
    }
  }

  return (
    <div className="legacy-data-window legacy-data-window-service-list">
      <div className="legacy-service-queue-view-toolbar">
        <div>
          <strong>Queue Views</strong>
          <span>{serviceQueueView}</span>
        </div>
        <button className="legacy-task-status-button" onClick={() => setIsQueueViewsCollapsed((current) => !current)} type="button">
          {isQueueViewsCollapsed ? "Show queue views" : "Hide queue views"}
        </button>
      </div>

      {isQueueViewsCollapsed ? null : (
        <div className="legacy-service-queue-view-row" aria-label="Service queue views">
          {serviceQueueViews.map((queueView) => {
            const queueViewCount = rows.filter((row) => matchesServiceQueueView(row, queueView, serviceNotificationsByRo[row.roNumber] ?? [])).length;

            return (
              <button
                className={`legacy-service-queue-view${serviceQueueView === queueView ? " is-active" : ""}`}
                key={queueView}
                onClick={() => onSelectQueueView(queueView)}
                type="button"
              >
                <strong>{queueView}</strong>
                <span>{queueViewCount}</span>
              </button>
            );
          })}
        </div>
      )}

      <WorkspaceSearchStrip
        filterLabel="Status"
        filterOptions={filterOptions}
        filterValue={searchState.filterValue}
        foundCount={filteredRows.length}
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        searchTerm={searchState.searchTerm}
      />

      <div className="legacy-service-quick-filter-row" aria-label="Service queue quick filters">
        {serviceQueueQuickFilterDefinitions.map((filterDefinition) => {
          const count = rows.filter(filterDefinition.matches).length;
          const checked = quickFilters[filterDefinition.key];

          return (
            <label className={`legacy-service-quick-filter${checked ? " is-active" : ""}`} key={filterDefinition.key}>
              <input
                checked={checked}
                onChange={() =>
                  setQuickFilters((current) => ({
                    ...current,
                    [filterDefinition.key]: !current[filterDefinition.key]
                  }))
                }
                type="checkbox"
              />
              <span>{filterDefinition.label}</span>
              <strong>{count}</strong>
            </label>
          );
        })}
        {hasActiveQuickFilters ? (
          <button className="legacy-task-status-button" onClick={() => setQuickFilters(initialServiceQueueQuickFilterState)} type="button">
            Clear
          </button>
        ) : null}
      </div>

      <div className="legacy-grid-shell">
        <table className="legacy-grid">
          <thead>
            <tr>
              {serviceQueueColumnDefinitions.map((column) => (
                <th className={column.className} key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td className="legacy-grid-empty" colSpan={serviceQueueColumnDefinitions.length}>
                  No service rows match the current search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isSelected = selectedRow?.id === row.id;
                const isRecentlyCreated = (recentServiceRowHighlights[row.id] ?? 0) > Date.now();
                const isSavingRow = updatingRowId === row.id;
                const signals = buildServiceRowSignals(row, serviceNotificationsByRo[row.roNumber] ?? []);

                return (
                  <tr
                    className={`tone-${row.tone} is-interactive${isSelected ? " is-selected" : ""}${isRecentlyCreated ? " is-recent" : ""}${isSavingRow ? " is-saving" : ""}`}
                    key={row.id}
                    onClick={() => onSelectRow(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectRow(row);
                      }
                    }}
                    tabIndex={0}
                  >
                    {serviceQueueColumnDefinitions.map((column) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell.field === column.editableField;
                      const currentValue = column.editableField ? String(row[column.editableField] ?? "") : "";

                      return (
                        <td className={column.className} key={`${row.id}:${column.key}`}>
                          {column.key === "signals" ? (
                            signals.length > 0 ? (
                              <div className="legacy-service-row-signals">
                                {signals.map((signal) => (
                                  <span className={`legacy-service-row-signal tone-${signal.tone}`} key={`${row.id}-${signal.label}`}>
                                    {signal.label}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="legacy-service-row-signal-empty">Quiet</span>
                            )
                          ) : isEditing && column.editableField && column.editableField !== "note" ? (
                            <form
                              className="legacy-service-cell-editor"
                              onClick={(event) => event.stopPropagation()}
                              onSubmit={(event) => {
                                event.preventDefault();
                                void saveCell(row, column.editableField as EditableServiceQueueField);
                              }}
                            >
                              {column.editor === "textarea" ? (
                                <textarea
                                  aria-label={`Edit ${column.label}`}
                                  className="legacy-service-cell-input"
                                  disabled={isSavingRow}
                                  onChange={(event) => setDraftValue(event.currentTarget.value)}
                                  onKeyDown={(event) => {
                                    event.stopPropagation();
                                    if (event.key === "Escape") {
                                      cancelEditing();
                                    }
                                  }}
                                  placeholder={column.label}
                                  rows={3}
                                  title={`Edit ${column.label}`}
                                  value={draftValue}
                                />
                              ) : column.editor === "select" ? (
                                <select
                                  aria-label={`Edit ${column.label}`}
                                  className="legacy-service-cell-input"
                                  disabled={isSavingRow}
                                  onChange={(event) => setDraftValue(event.currentTarget.value)}
                                  onKeyDown={(event) => {
                                    event.stopPropagation();
                                    if (event.key === "Escape") {
                                      cancelEditing();
                                    }
                                  }}
                                  title={`Edit ${column.label}`}
                                  value={draftValue}
                                >
                                  {(column.options ?? []).map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  aria-label={`Edit ${column.label}`}
                                  className="legacy-service-cell-input"
                                  disabled={isSavingRow}
                                  onChange={(event) => setDraftValue(event.currentTarget.value)}
                                  onKeyDown={(event) => {
                                    event.stopPropagation();
                                    if (event.key === "Escape") {
                                      cancelEditing();
                                    }
                                  }}
                                  placeholder={column.label}
                                  required
                                  title={`Edit ${column.label}`}
                                  value={draftValue}
                                />
                              )}
                              <div className="legacy-service-cell-editor-actions">
                                <button className="legacy-service-cell-action is-primary" disabled={isSavingRow} type="submit">
                                  Save
                                </button>
                                <button className="legacy-service-cell-action" disabled={isSavingRow} onClick={cancelEditing} type="button">
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="legacy-service-grid-cell">
                              <span
                                className={`legacy-service-grid-value${column.key === "note" ? " is-note" : ""}`}
                                title={column.key === "note" ? currentValue : undefined}
                              >
                                {currentValue || (column.key === "note" ? "No note added" : "")}
                              </span>
                              {column.editableField ? (
                                <button
                                  aria-label={`Edit ${column.label}`}
                                  className="legacy-service-cell-edit-button"
                                  disabled={isSavingRow}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    beginEditing(row, column.editableField as EditableServiceQueueField);
                                  }}
                                  type="button"
                                >
                                  G£Ä
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {noteEditorRow ? (
        <div
          aria-hidden="true"
          className="legacy-service-note-editor-backdrop"
          onClick={cancelEditing}
        >
          <form
            aria-labelledby="service-note-editor-title"
            className="legacy-service-note-editor-panel"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void saveCell(noteEditorRow, "note");
            }}
            role="dialog"
          >
            <div className="legacy-service-note-editor-header">
              <div>
                <strong id="service-note-editor-title">Edit Note</strong>
                <span>{`RO ${noteEditorRow.roNumber} - ${noteEditorRow.customerName}`}</span>
              </div>
              <button className="legacy-task-status-button" disabled={updatingRowId === noteEditorRow.id} onClick={cancelEditing} type="button">
                Close
              </button>
            </div>

            <p className="legacy-service-note-editor-copy">Notes save as plain text, stay trimmed in the grid preview, and can hold longer writer detail without stretching the queue rows.</p>

            <textarea
              aria-label="Edit service note"
              className="legacy-service-cell-input legacy-service-note-editor-input"
              disabled={updatingRowId === noteEditorRow.id}
              maxLength={serviceQueueNoteMaxLength}
              onChange={(event) => setDraftValue(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEditing();
                }

                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void saveCell(noteEditorRow, "note");
                }
              }}
              placeholder="Add service notes for the queue row"
              rows={10}
              spellCheck
              title="Edit service note"
              value={draftValue}
            />

            <div className="legacy-service-note-editor-footer">
              <span className="legacy-service-note-editor-meta">{`${draftValue.length}/${serviceQueueNoteMaxLength}`}</span>
              <div className="legacy-service-note-editor-actions">
                <button className="legacy-service-cell-action is-primary" disabled={updatingRowId === noteEditorRow.id} type="submit">
                  Save Note
                </button>
                <button className="legacy-service-cell-action" disabled={updatingRowId === noteEditorRow.id} onClick={cancelEditing} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function renderWorkspace(
  activeWorkspaceId: WorkspaceId,
  dashboard: DashboardPayload | null,
  workspace: WorkspacePayload | null,
  openWorkspaceIds: WorkspaceId[],
  fallbackStatusLine: string,
  searchState: WorkspaceSearchState,
  setSearchState: React.Dispatch<React.SetStateAction<WorkspaceSearchState>>,
  interactionState: WorkspaceInteractionState,
  onOpenWorkspace: (workspaceId: WorkspaceId, sourceLabel?: string) => void,
  desktopWidgetsStorageKey: string,
  auditControls: {
    activeStoreId: string;
    actorUserId: string;
    availableStores: SessionState["stores"];
    cleaningQaStoreId: string | null;
    cleaningQaRoNumber: string | null;
    onCopySingleTaskSlaPolicy: (targetStoreId: string, workspaceId: WorkspaceId, action: string) => Promise<boolean>;
    onCopyTaskSlaPolicies: (targetStoreId: string) => Promise<boolean>;
    onCleanupQaTasks: (targetStoreId: string, roNumber: string) => Promise<boolean>;
    onOpenServiceRo: (targetStoreId: string, options: OpenServiceRepairOrderOptions) => void;
    onResetAllTaskSlaPolicies: () => Promise<boolean>;
    onResetTaskSlaPolicy: (workspaceId: WorkspaceId, action: string) => Promise<boolean>;
    onUpdateTaskSlaPolicy: (workspaceId: WorkspaceId, action: string, slaMinutes: number) => Promise<boolean>;
    requestedCleanupStoreId: string | null;
    refreshKey: number;
    updatingPolicyKey: string | null;
  },
  taskControls: {
    activeServiceDetailRoNumber: string | null;
    entries: TaskQueueEntry[];
    activityEntries: CommandLogEntry[];
    cleaningQaRoNumber: string | null;
    focusedTaskId: string | null;
    isServiceDetailLoading: boolean;
    isFilteredByOperator: boolean;
    onSelectServiceQueueView: React.Dispatch<React.SetStateAction<ServiceQueueView>>;
    onAddTaskNote: (taskId: string, body: string, kind: TaskNoteKind) => Promise<boolean>;
    onAddLaborSession: (payload: {
      jobId: string;
      technician: string;
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      actualHours: string;
      creditedHours: string;
      override: string;
    }) => Promise<boolean>;
    onAddPart: (payload: {
      jobId: string;
      partNumber: string;
      description: string;
      supplier: string;
      available: number;
      price: number;
      quantity: number;
      category: string;
    }) => Promise<boolean>;
    onAssignTask: (taskId: string, assigneeUserId: string | null) => void;
    onCleanupQaTasks: (roNumber: string) => Promise<boolean>;
    onCreateJob: (payload: {
      title: string;
      unitLabel: string;
      description: string;
      technician: string;
    }) => Promise<boolean>;
    onRemovePart: (jobId: string, partNumber: string) => Promise<boolean>;
    onReturnToAuditCleanup: (() => void) | null;
    onUpdateQueueRow: (row: ServiceWorkspaceRow) => Promise<boolean>;
    onUpdateJob: (payload: {
      jobId: string;
      title: string;
      customerApproval: string;
      status: string;
      appliance: string;
      description: string;
      resolution: string;
      recommendations: string;
      technician: string;
      laborRate: string;
      chargeBy: string;
      rate: number;
      quantity: number;
    }) => Promise<boolean>;
    onUpdateOrderType: (orderType: "Estimate" | "Repair Order") => Promise<boolean>;
    onUpdateStatus: (taskId: string, status: TaskStatus) => void;
    onUpdateWarrantyClaim: (payload: {
      jobId: string;
      warrantyClaimNumber: string;
      internalWarrantyNumber: string;
      failureDate: string;
      contentionCode: string;
      problemCode: string;
      problemDescription: string;
      claimType: string;
      status: string;
      deductible: number;
      failedPartNumber: string;
      actionTaken: string;
      reasonForDelay: string;
      carrierNumber: string;
      invoiceDate: string;
      invoiceNumber: string;
      dateFiledWithCarrier: string;
    }) => Promise<boolean>;
    operators: StoreOperatorOption[];
    returnToAuditContext: ServiceAuditReturnContext | null;
    recentServiceRowHighlights: Record<string, number>;
    serviceDetail: ServiceWorkbenchModel | null;
    serviceNotificationEntries: ServiceNotificationEntry[];
    servicePartCatalog: ServiceOrderPartCatalogEntry[];
    serviceQueueView: ServiceQueueView;
    updatingServiceDetailKey: string | null;
    updatingServiceQueueRowId: string | null;
    updatingTaskId: string | null;
  },
  partsControls: {
    isLookupOpen: boolean;
    isSubmitting: boolean;
    lookupSearchField: PartsLookupSearchField;
    lookupSearchTerm: string;
    lookupSelectedRowId: string | null;
    lookupQuantity: string;
    quickAddTerm: string;
    onChangeLookupQuantity: React.Dispatch<React.SetStateAction<string>>;
    onChangeLookupSearchField: React.Dispatch<React.SetStateAction<PartsLookupSearchField>>;
    onChangeLookupSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    onChangeQuickAddTerm: React.Dispatch<React.SetStateAction<string>>;
    onCloseLookup: () => void;
    onOpenLookup: (initialSearchTerm?: string) => void;
    onSelectLookupResult: React.Dispatch<React.SetStateAction<string | null>>;
    onSelectLookupRow: (row: PartsWorkspaceRow) => void;
    onSubmitLookup: () => void | Promise<void>;
  }
) {
  switch (activeWorkspaceId) {
    case "sales": {
      const rows = workspace?.workspaceId === "sales" ? workspace.rows : [];
      const filterOptions = buildFilterOptions(rows.map((row) => row.finalized), searchState.filterValue);
      const filteredRows = rows.filter(
        (row) =>
          matchesWorkspaceSearch(
            [row.date, row.worksheet, row.stock, row.make, row.model, row.cashPrice, row.finalized, row.customer, row.year, row.vin],
            searchState.searchTerm
          ) &&
          matchesWorkspaceFilter(row.finalized, searchState.filterValue)
      );
      return (
        <div className="legacy-data-window legacy-data-window-service legacy-data-window-sales">
          <WorkspaceSearchStrip
            filterLabel="Stage"
            filterOptions={filterOptions}
            filterValue={searchState.filterValue}
            foundCount={filteredRows.length}
            onFilterChange={(filterValue) => setSearchState((current) => ({ ...current, filterValue }))}
            onSearchChange={(searchTerm) => setSearchState((current) => ({ ...current, searchTerm }))}
            searchTerm={searchState.searchTerm}
          />
          <LegacyDataGrid
            columns={salesColumns}
            emptyMessage="No sales rows match the current search."
            onRowSelect={interactionState.onSelectSalesRow}
            rows={filteredRows}
            selectedRowId={interactionState.selectedSalesRowId}
          />
        </div>
      );
    }
    case "service": {
      const rows = workspace?.workspaceId === "service" ? workspace.rows : [];
      const isServiceDetailWindow = Boolean(taskControls.activeServiceDetailRoNumber);
      const serviceNotificationEntries = taskControls.serviceNotificationEntries ?? [];

      if (!isServiceDetailWindow) {
        return (
          <ServiceQueueBoard
            onFilterChange={(filterValue) => setSearchState((current) => ({ ...current, filterValue }))}
            onSearchChange={(searchTerm) => setSearchState((current) => ({ ...current, searchTerm }))}
            onSelectQueueView={taskControls.onSelectServiceQueueView}
            onSelectRow={interactionState.onSelectServiceRow}
            onUpdateRow={taskControls.onUpdateQueueRow}
            recentServiceRowHighlights={taskControls.recentServiceRowHighlights}
            rows={rows}
            searchState={searchState}
            selectedRowId={interactionState.selectedServiceRowId}
            serviceNotificationEntries={serviceNotificationEntries}
            serviceQueueView={taskControls.serviceQueueView}
            updatingRowId={taskControls.updatingServiceQueueRowId}
          />
        );
      }

      const detailServiceRow =
        rows.find((row) => row.roNumber === taskControls.activeServiceDetailRoNumber) ?? resolveSelectedRow(rows, interactionState.selectedServiceRowId);

      return (
        <div className="legacy-data-window legacy-data-window-service">
          <ServiceRepairWorkbench
            entries={taskControls.entries}
            activityEntries={taskControls.activityEntries}
            cleaningQaRoNumber={taskControls.cleaningQaRoNumber}
            focusedTaskId={taskControls.focusedTaskId}
            isServiceDetailLoading={taskControls.isServiceDetailLoading}
            isFilteredByOperator={taskControls.isFilteredByOperator}
            onAddLaborSession={taskControls.onAddLaborSession}
            onAddPart={taskControls.onAddPart}
            onAddTaskNote={taskControls.onAddTaskNote}
            onAssignTask={taskControls.onAssignTask}
            onCleanupQaTasks={taskControls.onCleanupQaTasks}
            onCreateJob={taskControls.onCreateJob}
            onRemovePart={taskControls.onRemovePart}
            onReturnToAuditCleanup={taskControls.onReturnToAuditCleanup}
            onUpdateJob={taskControls.onUpdateJob}
            onUpdateOrderType={taskControls.onUpdateOrderType}
            onUpdateStatus={taskControls.onUpdateStatus}
            onUpdateWarrantyClaim={taskControls.onUpdateWarrantyClaim}
            operators={taskControls.operators}
            returnToAuditContext={taskControls.returnToAuditContext}
            selectedServiceRow={detailServiceRow}
            serviceDetail={taskControls.serviceDetail}
            servicePartCatalog={taskControls.servicePartCatalog}
            updatingServiceDetailKey={taskControls.updatingServiceDetailKey}
            updatingTaskId={taskControls.updatingTaskId}
          />
        </div>
      );
    }
    case "parts": {
      const rows = workspace?.workspaceId === "parts" ? workspace.rows : [];
      return (
        <PartsOrderingBoard
          isLookupOpen={partsControls.isLookupOpen}
          isLookupSubmitting={partsControls.isSubmitting}
          lookupQuantity={partsControls.lookupQuantity}
          lookupSearchField={partsControls.lookupSearchField}
          lookupSearchTerm={partsControls.lookupSearchTerm}
          lookupSelectedRowId={partsControls.lookupSelectedRowId}
          onCloseLookup={partsControls.onCloseLookup}
          onFilterChange={(filterValue) => setSearchState((current) => ({ ...current, filterValue }))}
          onLookupQuantityChange={partsControls.onChangeLookupQuantity}
          onLookupSearchFieldChange={partsControls.onChangeLookupSearchField}
          onLookupSearchTermChange={partsControls.onChangeLookupSearchTerm}
          onLookupSelectResult={partsControls.onSelectLookupResult}
          onOpenLookup={partsControls.onOpenLookup}
          onQuickAddTermChange={partsControls.onChangeQuickAddTerm}
          onSearchChange={(searchTerm) => setSearchState((current) => ({ ...current, searchTerm }))}
          onSelectLookupRow={partsControls.onSelectLookupRow}
          onSelectRow={interactionState.onSelectPartsRow}
          onSubmitLookup={partsControls.onSubmitLookup}
          quickAddTerm={partsControls.quickAddTerm}
          rows={rows}
          searchState={searchState}
          selectedRowId={interactionState.selectedPartsRowId}
        />
      );
    }
    case "analytics": {
      const rows = workspace?.workspaceId === "analytics" ? workspace.rows : [];
      return <AnalyticsWorkspace dashboard={dashboard} onOpenWorkspace={onOpenWorkspace} rows={rows} />;
    }
    case "audit": {
      const auditWorkspace = workspace?.workspaceId === "audit" ? workspace : null;
      return (
        <AuditWorkspace
          activeStoreId={auditControls.activeStoreId}
          actorUserId={auditControls.actorUserId}
          availableStores={auditControls.availableStores}
          cleaningQaStoreId={auditControls.cleaningQaStoreId}
          cleaningQaRoNumber={auditControls.cleaningQaRoNumber}
          dashboard={dashboard}
          onCopySingleTaskSlaPolicy={auditControls.onCopySingleTaskSlaPolicy}
          onCopyTaskSlaPolicies={auditControls.onCopyTaskSlaPolicies}
          onCleanupQaTasks={auditControls.onCleanupQaTasks}
          onOpenServiceRo={auditControls.onOpenServiceRo}
          onResetAllTaskSlaPolicies={auditControls.onResetAllTaskSlaPolicies}
          onResetTaskSlaPolicy={auditControls.onResetTaskSlaPolicy}
          onUpdateTaskSlaPolicy={auditControls.onUpdateTaskSlaPolicy}
          policies={auditWorkspace?.policies ?? []}
          requestedCleanupStoreId={auditControls.requestedCleanupStoreId}
          refreshKey={auditControls.refreshKey}
          rows={auditWorkspace?.rows ?? []}
          updatingPolicyKey={auditControls.updatingPolicyKey}
        />
      );
    }
    case "website": {
      const rows = workspace?.workspaceId === "website" ? workspace.rows : [];
      const selectedWebsiteRow = resolveSelectedRow(rows, interactionState.selectedWebsiteRowId);

      return (
        <WebsiteWorkspace
          activityEntries={taskControls.activityEntries}
          entries={taskControls.entries}
          fallbackStatusLine={fallbackStatusLine}
          isFilteredByOperator={taskControls.isFilteredByOperator}
          onAddTaskNote={taskControls.onAddTaskNote}
          onAssignTask={taskControls.onAssignTask}
          onSelectRow={interactionState.onSelectWebsiteRow}
          onUpdateStatus={taskControls.onUpdateStatus}
          operators={taskControls.operators}
          rows={rows}
          selectedRow={selectedWebsiteRow}
          selectedRowId={selectedWebsiteRow?.id ?? null}
          updatingTaskId={taskControls.updatingTaskId}
        />
      );
    }
    case "desktop":
    default: {
      const rows = workspace?.workspaceId === "desktop" ? workspace.rows : [];

      return (
        <DesktopWorkspace
          dashboard={dashboard}
          onOpenWorkspace={onOpenWorkspace}
          openWorkspaceIds={openWorkspaceIds}
          rows={rows}
          widgetStorageKey={desktopWidgetsStorageKey}
        />
      );
    }
  }
}

interface DesktopWorkspaceProps {
  dashboard: DashboardPayload | null;
  onOpenWorkspace: (workspaceId: WorkspaceId, sourceLabel?: string) => void;
  openWorkspaceIds: WorkspaceId[];
  rows: DesktopWorkspaceRow[];
  widgetStorageKey: string;
}

function DesktopWorkspace({ dashboard, onOpenWorkspace, openWorkspaceIds, rows, widgetStorageKey }: DesktopWorkspaceProps) {
  const defaultWidgetDefinition = getDesktopWidgetDefinition("scoreboard");
  const desktopBoardRef = useRef<HTMLDivElement | null>(null);
  const draggingWidgetIdRef = useRef<string | null>(null);
  const laneElementRefs = useRef<Partial<Record<DesktopWidgetLane, HTMLElement | null>>>({});
  const liveDragPreviewRef = useRef<{
    dropAfterTarget: boolean | null;
    targetLane: DesktopWidgetLane | null;
    targetWidgetId: string | null;
  } | null>(null);
  const pointerDragSessionRef = useRef<{
    height: number;
    isActive: boolean;
    offsetX: number;
    offsetY: number;
    pointerId: number;
    startX: number;
    startY: number;
    widgetId: string;
    width: number;
  } | null>(null);
  const resizeWidgetSessionRef = useRef<{
    originX: number;
    originY: number;
    startHeight: DesktopWidgetHeight;
    startWidth: DesktopWidgetWidth;
    widgetId: string;
  } | null>(null);
  const widgetElementRefs = useRef<Record<string, HTMLElement | null>>({});
  const [dashboardPreference, setDashboardPreference] = useState<DesktopDashboardPreference>(() => readDesktopDashboardPreference(widgetStorageKey));
  const [dragPreview, setDragPreview] = useState<{
    height: number;
    targetLane: DesktopWidgetLane | null;
    targetWidgetId: string | null;
    width: number;
    x: number;
    y: number;
  } | null>(null);
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [dropTargetLane, setDropTargetLane] = useState<DesktopWidgetLane | null>(null);
  const [dropTargetWidgetId, setDropTargetWidgetId] = useState<string | null>(null);
  const [dashboardDraftName, setDashboardDraftName] = useState("");
  const [dashboardManagerMode, setDashboardManagerMode] = useState<DesktopDashboardManagerMode>("create");
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [isDashboardManagerOpen, setIsDashboardManagerOpen] = useState(false);
  const [isWidgetBuilderOpen, setIsWidgetBuilderOpen] = useState(false);
  const [resizingWidgetId, setResizingWidgetId] = useState<string | null>(null);
  const [widgetDraftType, setWidgetDraftType] = useState<DesktopWidgetType>(defaultWidgetDefinition.type);
  const [widgetDraftTitle, setWidgetDraftTitle] = useState(defaultWidgetDefinition.defaultTitle);
  const [widgetDraftView, setWidgetDraftView] = useState<DesktopWidgetView>(defaultWidgetDefinition.defaultView);
  const [widgetDraftLane, setWidgetDraftLane] = useState<DesktopWidgetLane>(defaultWidgetDefinition.defaultLane);
  const [widgetDraftWidth, setWidgetDraftWidth] = useState<DesktopWidgetWidth>(defaultWidgetDefinition.defaultWidth);
  const [widgetDraftHeight, setWidgetDraftHeight] = useState<DesktopWidgetHeight>(defaultWidgetDefinition.defaultHeight);
  const [widgetDraftShape, setWidgetDraftShape] = useState<DesktopWidgetShape>(defaultWidgetDefinition.defaultShape);
  const activeDashboard =
    dashboardPreference.dashboards.find((dashboardLayout) => dashboardLayout.id === dashboardPreference.activeDashboardId) ??
    dashboardPreference.dashboards[0];
  const widgets = activeDashboard?.widgets ?? [];
  const laneWidgets = {
    spotlight: widgets.filter((widget) => widget.lane === "spotlight"),
    left: widgets.filter((widget) => widget.lane === "left"),
    right: widgets.filter((widget) => widget.lane === "right")
  };

  const moduleCards =
    dashboard?.modules.length
      ? dashboard.modules.map((moduleItem) => ({
          id: moduleItem.code,
          name: moduleItem.name,
          status: moduleItem.status,
          headline: moduleItem.headline,
          meta: moduleItem.ownerTeam
        }))
      : rows.map((row) => ({
          id: row.id,
          name: row.module,
          status: row.status,
          headline: row.headline,
          meta: "Desktop"
        }));
  const signalRows =
    rows.length > 0
      ? rows.map((row) => ({
          id: row.id,
          module: row.module,
          status: row.status,
          headline: row.headline
        }))
      : moduleCards.map((moduleItem) => ({
          id: moduleItem.id,
          module: moduleItem.name,
          status: moduleItem.status,
          headline: moduleItem.headline
        }));
  const unresolvedModules = signalRows.filter((row) => row.status !== "Online");
  const watchRows = signalRows.slice(0, 5);
  const spotlightRows = unresolvedModules.length > 0 ? unresolvedModules : watchRows.slice(0, 3);
  const stats = dashboard?.stats ?? [];
  const activityItems = dashboard?.activity ?? [];
  const trendMetrics = buildDesktopTrendMetrics(stats, dashboard?.workspaceCounts);
  const trendPath = buildDesktopTrendPath(trendMetrics);
  const trendFillPath = buildDesktopTrendFillPath(trendMetrics);
  const trendMax = Math.max(...trendMetrics.map((metric) => metric.value), 1);
  const laneGraphMetrics = buildDesktopLaneGraphMetrics(dashboard?.workspaceCounts);
  const laneGraphSegments = buildDesktopDonutSegments(laneGraphMetrics);
  const laneGraphGradient = buildDesktopDonutGradient(laneGraphSegments);
  const laneGraphTotal = laneGraphMetrics.reduce((total, metric) => total + metric.value, 0);
  const laneGraphMax = Math.max(...laneGraphMetrics.map((metric) => metric.value), 1);
  const reportRows = buildDesktopReportRows(stats, laneGraphMetrics, moduleCards);
  const gaugeMetrics = buildDesktopGaugeMetrics(stats, laneGraphMetrics);
  const funnelSteps = buildDesktopFunnelSteps(laneGraphMetrics);
  const draggingWidget = draggingWidgetId ? widgets.find((widget) => widget.id === draggingWidgetId) ?? null : null;
  const selectedWidgetDefinition = getDesktopWidgetDefinition(widgetDraftType);

  useEffect(() => {
    const nextDashboardPreference = readDesktopDashboardPreference(widgetStorageKey);

    setDashboardPreference(nextDashboardPreference);
    setDashboardDraftName(nextDashboardPreference.dashboards[0]?.name ?? "Front Page");
    setEditingWidgetId(null);
    setResizingWidgetId(null);
    setWidgetDraftType(defaultWidgetDefinition.type);
    setWidgetDraftTitle(defaultWidgetDefinition.defaultTitle);
    setWidgetDraftView(defaultWidgetDefinition.defaultView);
    setWidgetDraftLane(defaultWidgetDefinition.defaultLane);
    setWidgetDraftWidth(defaultWidgetDefinition.defaultWidth);
    setWidgetDraftHeight(defaultWidgetDefinition.defaultHeight);
    setWidgetDraftShape(defaultWidgetDefinition.defaultShape);
  }, [widgetStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(widgetStorageKey, JSON.stringify(dashboardPreference));
  }, [dashboardPreference, widgetStorageKey]);

  function updateActiveDashboardWidgets(updater: (widgets: DesktopWidgetConfig[]) => DesktopWidgetConfig[]) {
    if (!activeDashboard) {
      return;
    }

    setDashboardPreference((current) => ({
      ...current,
      dashboards: current.dashboards.map((dashboardLayout) =>
        dashboardLayout.id === activeDashboard.id ? { ...dashboardLayout, widgets: updater(dashboardLayout.widgets) } : dashboardLayout
      )
    }));
  }

  useEffect(() => {
    if (typeof window === "undefined" || !resizingWidgetId) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const session = resizeWidgetSessionRef.current;

      if (!session) {
        return;
      }

      const widthUnits = Math.min(
        2,
        Math.max(1, desktopWidgetWidthUnits(session.startWidth) + Math.round((event.clientX - session.originX) / 220))
      );
      const heightUnits = Math.min(
        3,
        Math.max(1, desktopWidgetHeightUnits(session.startHeight) + Math.round((event.clientY - session.originY) / 120))
      );

      updateActiveDashboardWidgets((current) =>
        current.map((widget) =>
          widget.id === session.widgetId
            ? {
                ...widget,
                ...buildDesktopWidgetPlacementForWidth(desktopWidgetWidthFromUnits(widthUnits), widget.lane),
                height: desktopWidgetHeightFromUnits(heightUnits)
              }
            : widget
        )
      );
    }

    function handlePointerUp() {
      resizeWidgetSessionRef.current = null;
      setResizingWidgetId(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizingWidgetId]);

  function resetWidgetDragState() {
    pointerDragSessionRef.current = null;
    draggingWidgetIdRef.current = null;
    liveDragPreviewRef.current = null;
    setDragPreview(null);
    setDraggingWidgetId(null);
    setDropTargetLane(null);
    setDropTargetWidgetId(null);

    if (typeof document !== "undefined") {
      document.body.classList.remove("is-desktop-dragging");
    }
  }

  function isDesktopWidgetInteractiveTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest("button, select, option, input, textarea, label, a"));
  }

  function setLaneElementRef(lane: DesktopWidgetLane, node: HTMLElement | null) {
    laneElementRefs.current[lane] = node;
  }

  function setWidgetElementRef(widgetId: string, node: HTMLElement | null) {
    if (node) {
      widgetElementRefs.current[widgetId] = node;
      return;
    }

    delete widgetElementRefs.current[widgetId];
  }

  function resolveDesktopDragLane(clientX: number, clientY: number) {
    const laneRects = desktopWidgetLaneSections.flatMap((laneSection) => {
      const node = laneElementRefs.current[laneSection.lane];

      if (!node) {
        return [];
      }

      return [{ lane: laneSection.lane, rect: node.getBoundingClientRect() }];
    });

    if (laneRects.length === 0) {
      return null;
    }

    const directMatch = laneRects.find(
      ({ rect }) => clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    );

    if (directMatch) {
      return directMatch.lane;
    }

    return laneRects.reduce<{ distance: number; lane: DesktopWidgetLane | null }>(
      (closest, entry) => {
        const horizontalDistance = clientX < entry.rect.left ? entry.rect.left - clientX : clientX > entry.rect.right ? clientX - entry.rect.right : 0;
        const verticalDistance = clientY < entry.rect.top ? entry.rect.top - clientY : clientY > entry.rect.bottom ? clientY - entry.rect.bottom : 0;
        const distance = Math.hypot(horizontalDistance, verticalDistance);

        return distance < closest.distance ? { distance, lane: entry.lane } : closest;
      },
      { distance: Number.POSITIVE_INFINITY, lane: laneRects[0]?.lane ?? null }
    ).lane;
  }

  function resolveDesktopDragTarget(
    clientX: number,
    clientY: number,
    sourceWidgetId: string
  ): { dropAfterTarget: boolean | null; targetLane: DesktopWidgetLane; targetWidgetId: string | null } | null {
    const targetLane = resolveDesktopDragLane(clientX, clientY);

    if (!targetLane) {
      return null;
    }

    const orderedLaneWidgets = widgets.filter((widget) => widget.lane === targetLane && widget.id !== sourceWidgetId);
    const laneWidgetRects = orderedLaneWidgets.flatMap((widget) => {
      const node = widgetElementRefs.current[widget.id];

      if (!node) {
        return [];
      }

      return [{ rect: node.getBoundingClientRect(), widgetId: widget.id }];
    });

    if (laneWidgetRects.length === 0) {
      return {
        dropAfterTarget: null,
        targetLane,
        targetWidgetId: null
      };
    }

    if (clientY < laneWidgetRects[0].rect.top) {
      return {
        dropAfterTarget: false,
        targetLane,
        targetWidgetId: laneWidgetRects[0].widgetId
      };
    }

    const lastLaneWidget = laneWidgetRects[laneWidgetRects.length - 1];

    if (clientY > lastLaneWidget.rect.bottom) {
      return {
        dropAfterTarget: true,
        targetLane,
        targetWidgetId: lastLaneWidget.widgetId
      };
    }

    return laneWidgetRects.reduce<{
      dropAfterTarget: boolean;
      score: number;
      targetLane: DesktopWidgetLane;
      targetWidgetId: string;
    }>(
      (closest, candidate) => {
        const midpointY = candidate.rect.top + candidate.rect.height / 2;
        const verticalDistance = Math.abs(clientY - midpointY);
        const horizontalDistance = clientX < candidate.rect.left ? candidate.rect.left - clientX : clientX > candidate.rect.right ? clientX - candidate.rect.right : 0;
        const score = verticalDistance + horizontalDistance * 0.6;

        return score < closest.score
          ? {
              dropAfterTarget: clientY > midpointY,
              score,
              targetLane,
              targetWidgetId: candidate.widgetId
            }
          : closest;
      },
      {
        dropAfterTarget: false,
        score: Number.POSITIVE_INFINITY,
        targetLane,
        targetWidgetId: laneWidgetRects[0].widgetId
      }
    );
  }

  function buildDesktopDragPreviewPosition(clientX: number, clientY: number, session: NonNullable<typeof pointerDragSessionRef.current>) {
    const boardRect = desktopBoardRef.current?.getBoundingClientRect();

    if (!boardRect) {
      return null;
    }

    const unclampedX = clientX - boardRect.left - session.offsetX;
    const unclampedY = clientY - boardRect.top - session.offsetY;
    const maxX = Math.max(0, boardRect.width - session.width);
    const maxY = Math.max(0, boardRect.height - session.height);

    return {
      x: Math.max(0, Math.min(unclampedX, maxX)),
      y: Math.max(0, Math.min(unclampedY, maxY))
    };
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLButtonElement>, widget: DesktopWidgetConfig) {
    event.preventDefault();
    event.stopPropagation();
    resizeWidgetSessionRef.current = {
      originX: event.clientX,
      originY: event.clientY,
      startHeight: widget.height,
      startWidth: widget.width,
      widgetId: widget.id
    };
    setResizingWidgetId(widget.id);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      if (resizeWidgetSessionRef.current) {
        return;
      }

      const session = pointerDragSessionRef.current;

      if (!session) {
      return;
    }

      if (!session.isActive) {
        const dragDistance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);

        if (dragDistance < 8) {
          return;
        }

        session.isActive = true;
        draggingWidgetIdRef.current = session.widgetId;
        liveDragPreviewRef.current = null;
        setDraggingWidgetId(session.widgetId);
        setDropTargetLane(null);
        setDropTargetWidgetId(null);
        document.body.classList.add("is-desktop-dragging");
      }

      const previewPosition = buildDesktopDragPreviewPosition(event.clientX, event.clientY, session);
      const nextDragTarget = resolveDesktopDragTarget(event.clientX, event.clientY, session.widgetId);

      if (previewPosition) {
        setDragPreview({
          height: session.height,
          targetLane: nextDragTarget?.targetLane ?? null,
          targetWidgetId: nextDragTarget?.targetWidgetId ?? null,
          width: session.width,
          x: previewPosition.x,
          y: previewPosition.y
        });
      }

      if (!nextDragTarget) {
        return;
      }

      if (
        liveDragPreviewRef.current?.targetWidgetId === nextDragTarget.targetWidgetId &&
        liveDragPreviewRef.current?.targetLane === nextDragTarget.targetLane &&
        liveDragPreviewRef.current?.dropAfterTarget === nextDragTarget.dropAfterTarget
      ) {
        return;
      }

      liveDragPreviewRef.current = nextDragTarget;
      setDropTargetLane(nextDragTarget.targetLane);
      setDropTargetWidgetId(nextDragTarget.targetWidgetId);
      updateActiveDashboardWidgets((current) =>
        nextDragTarget.targetWidgetId
          ? moveDesktopWidgetToTarget(
              current,
              session.widgetId,
              nextDragTarget.targetWidgetId,
              nextDragTarget.dropAfterTarget ?? false,
              nextDragTarget.targetLane
            )
          : moveDesktopWidgetToLane(current, session.widgetId, nextDragTarget.targetLane)
      );
    }

    function handlePointerEnd(event: PointerEvent) {
      const session = pointerDragSessionRef.current;

      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      resetWidgetDragState();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [widgets]);

  function handleWidgetPointerDown(event: React.PointerEvent<HTMLElement>, widget: DesktopWidgetConfig) {
    if (event.button !== 0 || isDesktopWidgetInteractiveTarget(event.target)) {
      return;
    }

    const widgetNode = widgetElementRefs.current[widget.id];
    const boardNode = desktopBoardRef.current;

    if (!widgetNode || !boardNode) {
      return;
    }

    const widgetRect = widgetNode.getBoundingClientRect();

    pointerDragSessionRef.current = {
      height: widgetRect.height,
      isActive: false,
      offsetX: event.clientX - widgetRect.left,
      offsetY: event.clientY - widgetRect.top,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      widgetId: widget.id,
      width: widgetRect.width
    };

    event.preventDefault();
  }

  function openDashboardManager(mode: DesktopDashboardManagerMode) {
    setDashboardManagerMode(mode);
    setDashboardDraftName(
      mode === "duplicate"
        ? `${activeDashboard?.name ?? "Front Page"} Copy`
        : activeDashboard?.name ?? "Front Page"
    );
    setIsDashboardManagerOpen(true);
  }

  function handleDashboardManagerClose() {
    setIsDashboardManagerOpen(false);
  }

  function handleDashboardManagerSubmit() {
    const nextName = dashboardDraftName.trim() || "Front Page";

    setDashboardPreference((current) => {
      const currentDashboard = current.dashboards.find((dashboardLayout) => dashboardLayout.id === current.activeDashboardId) ?? current.dashboards[0];

      switch (dashboardManagerMode) {
        case "create": {
          const nextDashboard = buildDesktopDashboardConfig(nextName);

          return {
            activeDashboardId: nextDashboard.id,
            dashboards: [...current.dashboards, nextDashboard]
          };
        }
        case "duplicate": {
          const nextDashboard = buildDesktopDashboardConfig(nextName, cloneDesktopWidgets(currentDashboard?.widgets ?? buildBlankDesktopWidgets()));

          return {
            activeDashboardId: nextDashboard.id,
            dashboards: [...current.dashboards, nextDashboard]
          };
        }
        case "rename":
          return {
            ...current,
            dashboards: current.dashboards.map((dashboardLayout) =>
              dashboardLayout.id === current.activeDashboardId ? { ...dashboardLayout, name: nextName } : dashboardLayout
            )
          };
        case "delete":
          if (current.dashboards.length <= 1) {
            return current;
          }

          return {
            activeDashboardId: current.dashboards.find((dashboardLayout) => dashboardLayout.id !== current.activeDashboardId)?.id ?? current.activeDashboardId,
            dashboards: current.dashboards.filter((dashboardLayout) => dashboardLayout.id !== current.activeDashboardId)
          };
        default:
          return current;
      }
    });
    handleDashboardManagerClose();
  }

  function resetWidgetDraft(type: DesktopWidgetType = defaultWidgetDefinition.type) {
    const widgetDefinition = getDesktopWidgetDefinition(type);

    setEditingWidgetId(null);
    setWidgetDraftType(widgetDefinition.type);
    setWidgetDraftTitle(widgetDefinition.defaultTitle);
    setWidgetDraftView(widgetDefinition.defaultView);
    setWidgetDraftLane(widgetDefinition.defaultLane);
    setWidgetDraftWidth(widgetDefinition.defaultWidth);
    setWidgetDraftHeight(widgetDefinition.defaultHeight);
    setWidgetDraftShape(widgetDefinition.defaultShape);
  }

  function openCreateWidgetBuilder() {
    resetWidgetDraft();
    setIsWidgetBuilderOpen(true);
  }

  function openEditWidget(widget: DesktopWidgetConfig) {
    setEditingWidgetId(widget.id);
    setWidgetDraftType(widget.type);
    setWidgetDraftTitle(widget.title);
    setWidgetDraftView(normalizeDesktopWidgetView(widget.type, widget.view));
    setWidgetDraftLane(widget.lane);
    setWidgetDraftWidth(widget.width);
    setWidgetDraftHeight(widget.height);
    setWidgetDraftShape(widget.shape);
    setIsWidgetBuilderOpen(true);
  }

  function handleWidgetDraftTypeChange(nextType: DesktopWidgetType) {
    const currentDefinition = getDesktopWidgetDefinition(widgetDraftType);
    const nextDefinition = getDesktopWidgetDefinition(nextType);

    setWidgetDraftType(nextType);
    setWidgetDraftView(nextDefinition.defaultView);
    setWidgetDraftLane(nextDefinition.defaultLane);
    setWidgetDraftWidth(nextDefinition.defaultWidth);
    setWidgetDraftHeight(nextDefinition.defaultHeight);
    setWidgetDraftShape(nextDefinition.defaultShape);
    setWidgetDraftTitle((current) => {
      const trimmed = current.trim();

      if (trimmed.length === 0 || trimmed === currentDefinition.defaultTitle) {
        return nextDefinition.defaultTitle;
      }

      return current;
    });
  }

  function handleWidgetDraftLaneChange(nextLane: DesktopWidgetLane) {
    const nextPlacement = buildDesktopWidgetPlacementForLane(nextLane);

    setWidgetDraftLane(nextPlacement.lane);
    setWidgetDraftWidth(nextPlacement.width);
  }

  function handleWidgetDraftWidthChange(nextWidth: DesktopWidgetWidth) {
    const nextPlacement = buildDesktopWidgetPlacementForWidth(nextWidth, widgetDraftLane);

    setWidgetDraftLane(nextPlacement.lane);
    setWidgetDraftWidth(nextPlacement.width);
  }

  function handleWidgetBuilderClose() {
    setIsWidgetBuilderOpen(false);
    resetWidgetDraft();
  }

  function handleWidgetSave() {
    const currentWidget = editingWidgetId ? widgets.find((widget) => widget.id === editingWidgetId) : null;
    const nextPlacement = buildDesktopWidgetPlacementForWidth(
      widgetDraftWidth,
      widgetDraftLane ?? currentWidget?.lane ?? selectedWidgetDefinition.defaultLane
    );
    const nextWidget = buildDesktopWidgetConfig(widgetDraftType, {
      id: editingWidgetId ?? undefined,
      height: widgetDraftHeight,
      lane: nextPlacement.lane,
      shape: widgetDraftShape,
      title: widgetDraftTitle.trim() || selectedWidgetDefinition.defaultTitle,
      view: widgetDraftView,
      width: nextPlacement.width
    });

    updateActiveDashboardWidgets((current) =>
      editingWidgetId
        ? current.map((widget) => (widget.id === editingWidgetId ? nextWidget : widget))
        : [...current, nextWidget]
    );
    handleWidgetBuilderClose();
  }

  function handleWidgetViewChange(widgetId: string, view: DesktopWidgetView) {
    updateActiveDashboardWidgets((current) =>
      current.map((widget) => (widget.id === widgetId ? { ...widget, view: normalizeDesktopWidgetView(widget.type, view) } : widget))
    );
  }

  function renderDesktopWidget(widget: DesktopWidgetConfig) {
    const widgetDefinition = getDesktopWidgetDefinition(widget.type);

    switch (widget.type) {
      case "scoreboard": {
        if (stats.length === 0) {
          return <p className="legacy-desktop-widget-empty">Dashboard stats will appear here as soon as the store payload is ready.</p>;
        }

        if (widget.view === "compact") {
          return (
            <div className="legacy-desktop-compact-list">
              {stats.map((stat) => (
                <article className="legacy-desktop-compact-row" key={stat.label}>
                  <div>
                    <strong>{stat.label}</strong>
                    <p>{stat.caption}</p>
                  </div>
                  <span>{stat.value}</span>
                </article>
              ))}
            </div>
          );
        }

        return (
          <div className="legacy-desktop-scoreboard-grid">
            {stats.map((stat) => (
              <article className="legacy-desktop-stat-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.caption}</p>
              </article>
            ))}
          </div>
        );
      }
      case "trendLine":
        return trendMetrics.length > 1 ? (
          <div className="legacy-desktop-chart-widget">
            <svg aria-hidden="true" className="legacy-desktop-trend-svg" viewBox="0 0 280 96">
              {widget.view === "area" ? <path className="legacy-desktop-trend-fill" d={trendFillPath} /> : null}
              <path className="legacy-desktop-trend-line" d={trendPath} />
              {trendMetrics.map((metric, index) => {
                const x = trendMetrics.length === 1 ? 18 : 18 + (index * 244) / (trendMetrics.length - 1);
                const y = 66 - (metric.value / trendMax) * 48;

                return <circle className="legacy-desktop-trend-point" cx={x} cy={y} key={metric.label} r="4" />;
              })}
            </svg>

            <div className="legacy-desktop-trend-labels">
              {trendMetrics.map((metric) => (
                <div className="legacy-desktop-trend-label" key={metric.label}>
                  <strong>{metric.displayValue}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="legacy-desktop-widget-empty">Trend lines need at least two live metrics to draw the curve.</p>
        );
      case "laneGraph": {
        if (widget.view === "donut") {
          return (
            <div className="legacy-desktop-donut-widget">
              <div className="legacy-desktop-donut-ring" style={{ background: laneGraphGradient }}>
                <div className="legacy-desktop-donut-center">
                  <strong>{laneGraphTotal}</strong>
                  <span>Tracked items</span>
                </div>
              </div>

              <div className="legacy-desktop-donut-legend">
                {laneGraphSegments.map((segment) => (
                  <div className="legacy-desktop-donut-row" key={segment.label}>
                    <span className="legacy-desktop-donut-swatch" style={{ backgroundColor: segment.color }} />
                    <span>{segment.label}</span>
                    <strong>{segment.displayValue}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div className="legacy-desktop-chart-widget">
            <svg aria-hidden="true" className="legacy-desktop-graph-svg" viewBox={`0 0 320 ${laneGraphMetrics.length * 34}`}>
              {laneGraphMetrics.map((metric, index) => {
                const y = 8 + index * 34;
                const barWidth = laneGraphMax === 0 ? 0 : (metric.value / laneGraphMax) * 162;

                return (
                  <Fragment key={metric.label}>
                    <text className="legacy-desktop-graph-text" x="0" y={y + 10}>
                      {metric.label}
                    </text>
                    <rect className="legacy-desktop-graph-track" height="12" rx="6" width="162" x="118" y={y} />
                    <rect className="legacy-desktop-graph-bar" height="12" rx="6" width={barWidth} x="118" y={y} />
                    <text className="legacy-desktop-graph-value" x="290" y={y + 10}>
                      {metric.value}
                    </text>
                  </Fragment>
                );
              })}
            </svg>
          </div>
        );
      }
      case "reportTable": {
        if (reportRows.length === 0) {
          return <p className="legacy-desktop-widget-empty">Report rows will appear here once the Desktop metrics and queues finish loading.</p>;
        }

        if (widget.view === "compact") {
          return (
            <div className="legacy-desktop-report-compact-grid">
              {reportRows.map((row) => (
                <article className="legacy-desktop-report-card" key={row.id}>
                  <div className="legacy-desktop-report-card-header">
                    <strong>{row.label}</strong>
                    <span className={`legacy-chip tone-${row.status}`}>{row.statusLabel}</span>
                  </div>
                  <strong className="legacy-desktop-report-card-value">{row.value}</strong>
                  <span className="legacy-desktop-report-card-view">{row.viewLabel}</span>
                  <p>{row.insight}</p>
                </article>
              ))}
            </div>
          );
        }

        return (
          <div className="legacy-desktop-report-widget">
            <div className="legacy-desktop-report-toolbar">
              <div>
                <span className="legacy-command-meta">Report Snapshot</span>
                <strong>Operator dashboard matrix</strong>
              </div>
              <span className="legacy-chip tone-neutral">Live rows</span>
            </div>

            <div className="legacy-desktop-report-table-shell">
              <table className="legacy-desktop-report-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>View</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Insight</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.label}</strong>
                      </td>
                      <td>{row.viewLabel}</td>
                      <td>
                        <span className={`legacy-chip tone-${row.status}`}>{row.statusLabel}</span>
                      </td>
                      <td>{row.value}</td>
                      <td>{row.insight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      case "goalGauge": {
        if (gaugeMetrics.length === 0) {
          return <p className="legacy-desktop-widget-empty">Gauge metrics will appear here as soon as headline KPI values are available.</p>;
        }

        if (widget.view === "compact") {
          return (
            <div className="legacy-desktop-gauge-list">
              {gaugeMetrics.map((metric) => (
                <article className="legacy-desktop-gauge-list-row" key={metric.label}>
                  <div className="legacy-desktop-gauge-list-copy">
                    <strong>{metric.label}</strong>
                    <p>{metric.value} toward {metric.target}</p>
                  </div>
                  <div className="legacy-desktop-gauge-mini">
                    <svg aria-hidden="true" className="legacy-desktop-gauge-mini-svg" viewBox="0 0 100 10">
                      <rect className="legacy-desktop-gauge-mini-track" height="10" rx="5" width="100" x="0" y="0" />
                      <rect className={`legacy-desktop-gauge-mini-fill is-${metric.tone}`} height="10" rx="5" width={metric.percent} x="0" y="0" />
                    </svg>
                    <span>{metric.percent}%</span>
                  </div>
                </article>
              ))}
            </div>
          );
        }

        return (
          <div className="legacy-desktop-gauge-grid">
            {gaugeMetrics.map((metric) => (
              <article className="legacy-desktop-gauge-card" key={metric.label}>
                <svg aria-hidden="true" className="legacy-desktop-gauge-svg" viewBox="0 0 120 120">
                  <circle className="legacy-desktop-gauge-track" cx="60" cy="60" r="42" />
                  <circle
                    className={`legacy-desktop-gauge-progress is-${metric.tone}`}
                    cx="60"
                    cy="60"
                    r="42"
                    strokeDasharray="264"
                    strokeDashoffset={metric.dashOffset}
                  />
                </svg>
                <div className="legacy-desktop-gauge-copy">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                  <p>{metric.percent}% to target -+ {metric.target}</p>
                </div>
              </article>
            ))}
          </div>
        );
      }
      case "funnelBoard": {
        if (funnelSteps.length === 0) {
          return <p className="legacy-desktop-widget-empty">Funnel stages will populate once tracked workspace counts are available.</p>;
        }

        if (widget.view === "bars") {
          return (
            <div className="legacy-desktop-funnel-bars">
              {funnelSteps.map((step) => (
                <article className="legacy-desktop-funnel-bar-row" key={step.id}>
                  <div className="legacy-desktop-funnel-bar-copy">
                    <strong>{step.label}</strong>
                    <p>{step.conversionLabel}</p>
                  </div>
                  <div className="legacy-desktop-funnel-bar-meter">
                    <svg aria-hidden="true" className="legacy-desktop-funnel-bar-svg" viewBox="0 0 100 12">
                      <rect className="legacy-desktop-funnel-bar-track" height="12" rx="6" width="100" x="0" y="0" />
                      <rect className={`legacy-desktop-funnel-bar-fill is-${step.tone}`} height="12" rx="6" width={step.widthPercent} x="0" y="0" />
                    </svg>
                    <span>{step.displayValue}</span>
                  </div>
                </article>
              ))}
            </div>
          );
        }

        return (
          <div className="legacy-desktop-funnel">
            {funnelSteps.map((step) => {
              const leftEdge = (100 - step.widthPercent) / 2;
              const rightEdge = leftEdge + step.widthPercent;
              const innerLeft = Math.min(leftEdge + 8, rightEdge - 22);
              const innerRight = Math.max(rightEdge - 8, leftEdge + 22);

              return (
                <article className="legacy-desktop-funnel-step" key={step.id}>
                  <div className="legacy-desktop-funnel-figure">
                    <svg aria-hidden="true" className="legacy-desktop-funnel-shape" viewBox="0 0 100 48">
                      <polygon
                        className={`legacy-desktop-funnel-shape-fill is-${step.tone}`}
                        points={`${leftEdge},2 ${rightEdge},2 ${innerRight},46 ${innerLeft},46`}
                      />
                    </svg>
                    <strong>{step.displayValue}</strong>
                  </div>
                  <div className="legacy-desktop-funnel-copy">
                    <strong>{step.label}</strong>
                    <p>{step.conversionLabel}</p>
                  </div>
                </article>
              );
            })}
          </div>
        );
      }
      case "attentionBoard": {
        if (spotlightRows.length === 0) {
          return <p className="legacy-desktop-widget-empty">All operating lanes are clear right now.</p>;
        }

        if (widget.view === "compact") {
          return (
            <div className="legacy-desktop-status-grid">
              {spotlightRows.map((row) => (
                <article className="legacy-desktop-status-card" key={row.id}>
                  <strong>{row.module}</strong>
                  <span className={`legacy-chip tone-${row.status.toLowerCase()}`}>{row.status}</span>
                  <p>{row.headline}</p>
                </article>
              ))}
            </div>
          );
        }

        return (
          <div className="legacy-desktop-line-stack">
            {spotlightRows.map((row) => (
              <article className="legacy-desktop-line" key={row.id}>
                <div className="legacy-desktop-line-copy">
                  <strong>{row.module}</strong>
                  <p>{row.headline}</p>
                </div>
                <span className={`legacy-chip tone-${row.status.toLowerCase()}`}>{row.status}</span>
              </article>
            ))}
          </div>
        );
      }
      case "openWindows":
        if (openWorkspaceIds.length === 0) {
          return <div aria-hidden="true" className="legacy-desktop-open-windows-canvas" />;
        }

        return widget.view === "list" ? (
          <div className="legacy-desktop-quicklist">
            {openWorkspaceIds.map((workspaceId) => (
              <button
                className="legacy-desktop-quicklist-row"
                key={workspaceId}
                onClick={() => onOpenWorkspace(workspaceId, "Desktop Widget Board")}
                type="button"
              >
                <strong>{workspaceDefinitions[workspaceId].title}</strong>
                <span>{workspaceDefinitions[workspaceId].subtitle}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="legacy-desktop-window-grid">
            {openWorkspaceIds.map((workspaceId) => (
              <button
                className="legacy-desktop-window-card"
                key={workspaceId}
                onClick={() => onOpenWorkspace(workspaceId, "Desktop Widget Board")}
                type="button"
              >
                <strong>{workspaceDefinitions[workspaceId].title}</strong>
                <span>{workspaceDefinitions[workspaceId].subtitle}</span>
              </button>
            ))}
          </div>
        );
      case "operatingLanes":
        return widget.view === "list" ? (
          <div className="legacy-desktop-line-stack">
            {moduleCards.map((moduleItem) => (
              <article className="legacy-desktop-line" key={moduleItem.id}>
                <div className="legacy-desktop-line-copy">
                  <strong>{moduleItem.name}</strong>
                  <p>{moduleItem.headline}</p>
                </div>
                <span className={`legacy-chip tone-${moduleItem.status.toLowerCase()}`}>{moduleItem.meta}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="legacy-desktop-module-grid">
            {moduleCards.map((moduleItem) => (
              <article className="legacy-desktop-module-card" key={moduleItem.id}>
                <div className="legacy-desktop-module-header">
                  <strong>{moduleItem.name}</strong>
                  <span className={`legacy-chip tone-${moduleItem.status.toLowerCase()}`}>{moduleItem.status}</span>
                </div>
                <p>{moduleItem.headline}</p>
                <span className="legacy-desktop-module-meta">{moduleItem.meta}</span>
              </article>
            ))}
          </div>
        );
      case "activityFeed": {
        if (activityItems.length === 0) {
          return <p className="legacy-desktop-widget-empty">Recent dashboard activity will show here as the stream updates.</p>;
        }

        if (widget.view === "timeline") {
          return (
            <div className="legacy-desktop-timeline">
              {activityItems.map((item, index) => (
                <article className="legacy-desktop-timeline-item" key={`${item.label}-${index}`}>
                  <span className={`legacy-desktop-timeline-dot tone-${item.tone.toLowerCase()}`} />
                  <div className="legacy-desktop-timeline-copy">
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          );
        }

        return (
          <div className="legacy-desktop-line-stack">
            {activityItems.map((item, index) => (
              <article className="legacy-desktop-line" key={`${item.label}-${index}`}>
                <div className="legacy-desktop-line-copy">
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
                <span className={`legacy-chip tone-${item.tone.toLowerCase()}`}>{item.tone}</span>
              </article>
            ))}
          </div>
        );
      }
      default:
        return <p className="legacy-desktop-widget-empty">{widgetDefinition.label} is not available right now.</p>;
    }
  }

  return (
    <div className="legacy-desktop-layout">
      <section className="legacy-info-card legacy-desktop-hero">
        <div className="legacy-desktop-hero-copy">
          <span className="legacy-command-meta">Desktop Overview</span>
          <h3>{dashboard?.store.name ?? "Store command surface"}</h3>
          <p>{dashboard?.store.summary ?? "Marine cloud command surface is loading."}</p>
          <div className="legacy-chip-row">
            {moduleCards.map((moduleItem) => (
              <span className={`legacy-chip tone-${moduleItem.status.toLowerCase()}`} key={moduleItem.id}>
                {moduleItem.name}
              </span>
            ))}
          </div>
        </div>

        <div className="legacy-desktop-stat-grid">
          {stats.map((stat) => (
            <article className="legacy-desktop-stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.caption}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="legacy-info-card legacy-desktop-board-intro">
        <div className="legacy-desktop-board-heading">
          <div className="legacy-desktop-board-copy">
            <span className="legacy-command-meta">Desktop Dashboard</span>
            <h3>{activeDashboard?.name ?? "Report Widget Board"}</h3>
            <p>Keep the canvas tight, clean, and operator-friendly with saved front pages, live snap movement, and cleaner widget presentation.</p>
          </div>
          <div className="legacy-desktop-board-metrics">
            <article className="legacy-desktop-board-metric">
              <strong>{widgets.length}</strong>
              <span>Widgets</span>
            </article>
            <article className="legacy-desktop-board-metric">
              <strong>{dashboardPreference.dashboards.length}</strong>
              <span>Saved Views</span>
            </article>
            <article className="legacy-desktop-board-metric">
              <strong>Live</strong>
              <span>Snap Canvas</span>
            </article>
          </div>
        </div>

        <div className="legacy-desktop-board-toolbar">
          <div className="legacy-desktop-board-toolbar-group is-primary">
            <label className="legacy-desktop-widget-select-shell is-dashboard-picklist">
              <span>Dashboard</span>
              <select
                className="legacy-desktop-widget-select"
                onChange={(event) => startTransition(() => setDashboardPreference((current) => ({ ...current, activeDashboardId: event.target.value })))}
                value={activeDashboard?.id ?? ""}
              >
                {dashboardPreference.dashboards.map((dashboardLayout) => (
                  <option key={dashboardLayout.id} value={dashboardLayout.id}>
                    {dashboardLayout.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="legacy-desktop-board-button" onClick={openCreateWidgetBuilder} type="button">
              New Widget
            </button>
            <button className="legacy-desktop-board-button is-secondary" onClick={() => openDashboardManager("create")} type="button">
              New View
            </button>
            <button className="legacy-desktop-board-button is-secondary" onClick={() => openDashboardManager("duplicate")} type="button">
              Duplicate
            </button>
          </div>

          <div className="legacy-desktop-board-toolbar-group">
            <button className="legacy-desktop-board-button is-secondary" onClick={() => openDashboardManager("rename")} type="button">
              Rename
            </button>
            <button
              className="legacy-desktop-board-button is-secondary"
              disabled={dashboardPreference.dashboards.length <= 1}
              onClick={() => openDashboardManager("delete")}
              type="button"
            >
              Delete
            </button>
            <button
              className="legacy-desktop-board-button is-secondary"
              onClick={() => updateActiveDashboardWidgets(() => buildDefaultDesktopWidgets())}
              type="button"
            >
              Reset Layout
            </button>
          </div>
        </div>
      </section>

      <div className="legacy-desktop-widget-board" ref={desktopBoardRef}>
        {widgets.length === 0 ? (
          <section className="legacy-info-card legacy-desktop-empty-board">
            <div>
              <span className="legacy-command-meta">Dashboard Canvas</span>
              <h3>No widgets on this board</h3>
              <p>Add a report widget to start building the front page for this store.</p>
              <div className="legacy-chip-row">
                {desktopWidgetCatalog.slice(0, 4).map((widgetDefinition) => (
                  <span className="legacy-chip tone-neutral" key={widgetDefinition.type}>
                    {widgetDefinition.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="legacy-desktop-empty-actions">
              <button className="legacy-desktop-board-button is-secondary" onClick={() => updateActiveDashboardWidgets(() => buildDefaultDesktopWidgets())} type="button">
                Load Starter Dashboard
              </button>
              <button className="legacy-desktop-board-button" onClick={openCreateWidgetBuilder} type="button">
                Create First Widget
              </button>
            </div>
          </section>
        ) : (
          desktopWidgetLaneSections.map((laneSection) => {
            const laneEntries = laneWidgets[laneSection.lane];

            return (
              <section
                className={`legacy-info-card legacy-desktop-widget-lane is-${laneSection.lane}${dropTargetLane === laneSection.lane ? " is-drop-target" : ""}`}
                key={laneSection.lane}
                ref={(node) => setLaneElementRef(laneSection.lane, node)}
              >
                <div className="legacy-desktop-widget-lane-header">
                  <div>
                    <span className="legacy-command-meta">Snap Zone</span>
                    <h3>{laneSection.label}</h3>
                    <p>{laneSection.description}</p>
                  </div>
                  <span className="legacy-chip tone-neutral">{laneEntries.length} widgets</span>
                </div>

                {laneEntries.length === 0 ? (
                  <div className="legacy-desktop-widget-lane-empty">
                    <strong>Drop a widget here</strong>
                    <p>Drag any tile handle into this lane to snap it into a new part of the Desktop canvas.</p>
                  </div>
                ) : (
                  <div className={`legacy-desktop-widget-lane-grid is-${laneSection.lane}`}>
                    {laneEntries.map((widget) => {
                      const widgetDefinition = getDesktopWidgetDefinition(widget.type);
                      const widgetWidthLabel = desktopWidgetWidthOptions.find((option) => option.value === widget.width)?.label ?? "Standard";
                      const widgetHeightLabel = desktopWidgetHeightOptions.find((option) => option.value === widget.height)?.label ?? "Standard";
                      const widgetShapeLabel = desktopWidgetShapeOptions.find((option) => option.value === widget.shape)?.label ?? "Rectangle";
                      const widgetViewLabel =
                        widgetDefinition.views.find((viewOption) => viewOption.id === widget.view)?.label ?? widgetDefinition.views[0]?.label ?? "View";

                      return (
                        <section
                          className={`legacy-info-card legacy-desktop-widget is-${widget.width} is-height-${widget.height}${widget.id === draggingWidgetId ? " is-dragging" : ""}${widget.id === dropTargetWidgetId ? " is-drop-target" : ""}${widget.id === resizingWidgetId ? " is-resizing" : ""}`}
                          key={widget.id}
                          ref={(node) => setWidgetElementRef(widget.id, node)}
                        >
                          <div className="legacy-desktop-widget-header" onPointerDown={(event) => handleWidgetPointerDown(event, widget)}>
                            <div className="legacy-desktop-widget-copy">
                              <span className="legacy-command-meta legacy-desktop-widget-meta">
                                <span aria-hidden="true" className="legacy-desktop-widget-grip" />
                                {widgetDefinition.label} -+ {laneSection.label} -+ {widgetWidthLabel} Tile -+ {widgetHeightLabel}
                              </span>
                              <h3>{widget.title}</h3>
                              <p className="legacy-desktop-widget-summary">{widgetViewLabel} view -+ {widgetShapeLabel} container</p>
                            </div>
                            <div className="legacy-desktop-widget-controls">
                              <label className="legacy-desktop-widget-select-shell">
                                <span>View</span>
                                <select
                                  className="legacy-desktop-widget-select"
                                  onChange={(event) => handleWidgetViewChange(widget.id, event.target.value as DesktopWidgetView)}
                                  value={widget.view}
                                >
                                  {widgetDefinition.views.map((viewOption) => (
                                    <option key={viewOption.id} value={viewOption.id}>
                                      {viewOption.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button className="legacy-desktop-widget-button is-customize" onClick={() => openEditWidget(widget)} type="button">
                                Customize
                              </button>
                              <button
                                className="legacy-desktop-widget-button is-danger"
                                onClick={() => updateActiveDashboardWidgets((current) => current.filter((entry) => entry.id !== widget.id))}
                                type="button"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <div className="legacy-desktop-widget-content">
                            <div className={`legacy-desktop-widget-content-shell is-shape-${widget.shape}`}>{renderDesktopWidget(widget)}</div>
                          </div>

                          <div className="legacy-desktop-widget-footer">
                            <span className="legacy-command-meta">Grab the header to move this widget live across the canvas, then use the corner grip to resize it.</span>
                            <button
                              aria-label={`Resize ${widget.title}`}
                              className="legacy-desktop-widget-resize-handle"
                              onPointerDown={(event) => handleResizePointerDown(event, widget)}
                              type="button"
                            >
                              Resize
                            </button>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}

        {dragPreview && draggingWidget ? (
          <div aria-hidden="true" className="legacy-desktop-drag-preview-layer">
            <article
              className={`legacy-desktop-drag-preview is-${draggingWidget.width}`}
              style={{ minHeight: `${dragPreview.height}px`, transform: `translate(${dragPreview.x}px, ${dragPreview.y}px)`, width: `${dragPreview.width}px` }}
            >
              <span className="legacy-desktop-drag-preview-chip">Live placement</span>
              <strong>{draggingWidget.title}</strong>
              <p>
                {getDesktopWidgetDefinition(draggingWidget.type).label}
                {dragPreview.targetLane ? ` -+ Snap to ${desktopWidgetLaneSections.find((laneSection) => laneSection.lane === dragPreview.targetLane)?.label ?? "Lane"}` : ""}
              </p>
            </article>
          </div>
        ) : null}
      </div>

      <DesktopWidgetBuilderModal
        draftHeight={widgetDraftHeight}
        draftLane={widgetDraftLane}
        draftShape={widgetDraftShape}
        draftView={widgetDraftView}
        draftWidth={widgetDraftWidth}
        draftTitle={widgetDraftTitle}
        draftType={widgetDraftType}
        isEditing={editingWidgetId !== null}
        onChangeHeight={setWidgetDraftHeight}
        onChangeLane={handleWidgetDraftLaneChange}
        onChangeShape={setWidgetDraftShape}
        onChangeTitle={setWidgetDraftTitle}
        onChangeType={handleWidgetDraftTypeChange}
        onChangeView={setWidgetDraftView}
        onChangeWidth={handleWidgetDraftWidthChange}
        onClose={handleWidgetBuilderClose}
        onSubmit={handleWidgetSave}
        open={isWidgetBuilderOpen}
      />

      <DesktopDashboardManagerModal
        currentDashboardName={activeDashboard?.name ?? "Front Page"}
        dashboardCount={dashboardPreference.dashboards.length}
        draftName={dashboardDraftName}
        mode={dashboardManagerMode}
        onChangeName={setDashboardDraftName}
        onClose={handleDashboardManagerClose}
        onSubmit={handleDashboardManagerSubmit}
        open={isDashboardManagerOpen}
      />
    </div>
  );
}

interface DesktopWidgetBuilderModalProps {
  draftHeight: DesktopWidgetHeight;
  draftLane: DesktopWidgetLane;
  draftShape: DesktopWidgetShape;
  draftView: DesktopWidgetView;
  draftWidth: DesktopWidgetWidth;
  draftTitle: string;
  draftType: DesktopWidgetType;
  isEditing: boolean;
  onChangeHeight: (height: DesktopWidgetHeight) => void;
  onChangeLane: (lane: DesktopWidgetLane) => void;
  onChangeShape: (shape: DesktopWidgetShape) => void;
  onChangeTitle: (value: string) => void;
  onChangeType: (type: DesktopWidgetType) => void;
  onChangeView: (view: DesktopWidgetView) => void;
  onChangeWidth: (width: DesktopWidgetWidth) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
}

function DesktopWidgetBuilderModal({
  draftHeight,
  draftLane,
  draftShape,
  draftView,
  draftWidth,
  draftTitle,
  draftType,
  isEditing,
  onChangeHeight,
  onChangeLane,
  onChangeShape,
  onChangeTitle,
  onChangeType,
  onChangeView,
  onChangeWidth,
  onClose,
  onSubmit,
  open
}: DesktopWidgetBuilderModalProps) {
  if (!open) {
    return null;
  }

  const selectedWidgetDefinition = getDesktopWidgetDefinition(draftType);
  const selectedViewLabel = selectedWidgetDefinition.views.find((viewOption) => viewOption.id === draftView)?.label ?? selectedWidgetDefinition.views[0]?.label;
  const selectedLaneLabel = desktopWidgetLaneSections.find((laneSection) => laneSection.lane === draftLane)?.label ?? "Spotlight Lane";
  const selectedLaneDescription = desktopWidgetLaneSections.find((laneSection) => laneSection.lane === draftLane)?.description ?? "Feature lane";
  const selectedWidthLabel = desktopWidgetWidthOptions.find((option) => option.value === draftWidth)?.label ?? "Standard";
  const selectedHeightLabel = desktopWidgetHeightOptions.find((option) => option.value === draftHeight)?.label ?? "Standard";
  const selectedShapeLabel = desktopWidgetShapeOptions.find((option) => option.value === draftShape)?.label ?? "Rectangle";

  return (
    <div className="modal-backdrop">
      <div className="modal-panel workflow-panel legacy-desktop-widget-modal">
        <div className="modal-header">
          <div>
            <p>Desktop front page</p>
            <h2>{isEditing ? "Customize Widget" : "Add Widget"}</h2>
          </div>
          <button className="workflow-secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <p className="workflow-summary">Shape how this widget sits on the Desktop canvas, which lane owns it, and how tightly the information reads at a glance.</p>

        <div className="legacy-desktop-builder-shell">
          <div className="workflow-form legacy-desktop-builder-grid">
            <section className="legacy-desktop-builder-section legacy-desktop-builder-section-identity">
              <div className="legacy-desktop-builder-section-header">
                <div>
                  <span>Identity</span>
                  <h3>Widget definition</h3>
                </div>
                <span className="legacy-chip tone-neutral">{selectedWidgetDefinition.label}</span>
              </div>

              <div className="legacy-desktop-builder-field-grid">
                <label className="workflow-field">
                  <span>Widget Type</span>
                  <select onChange={(event) => onChangeType(event.target.value as DesktopWidgetType)} value={draftType}>
                    {desktopWidgetCatalog.map((widgetDefinition) => (
                      <option key={widgetDefinition.type} value={widgetDefinition.type}>
                        {widgetDefinition.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="workflow-field is-wide">
                  <span>Widget Title</span>
                  <input onChange={(event) => onChangeTitle(event.target.value)} type="text" value={draftTitle} />
                </label>
              </div>
            </section>

            <section className="legacy-desktop-builder-section">
              <div className="legacy-desktop-builder-section-header">
                <div>
                  <span>Placement</span>
                  <h3>Canvas fit</h3>
                </div>
                <span className="legacy-chip tone-neutral">{selectedLaneLabel}</span>
              </div>

              <DesktopWidgetOptionGroup
                label="Dashboard Lane"
                onSelect={(value) => onChangeLane(value as DesktopWidgetLane)}
                options={desktopWidgetLaneSections.map((laneSection) => ({
                  value: laneSection.lane,
                  label: laneSection.label,
                  description: laneSection.description
                }))}
                selectedValue={draftLane}
              />

              <DesktopWidgetOptionGroup
                label="Tile Width"
                onSelect={(value) => onChangeWidth(value as DesktopWidgetWidth)}
                options={desktopWidgetWidthOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                  description: option.description
                }))}
                selectedValue={draftWidth}
              />

              <DesktopWidgetOptionGroup
                label="Tile Height"
                onSelect={(value) => onChangeHeight(value as DesktopWidgetHeight)}
                options={desktopWidgetHeightOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                  description: option.description
                }))}
                selectedValue={draftHeight}
              />
            </section>

            <section className="legacy-desktop-builder-section">
              <div className="legacy-desktop-builder-section-header">
                <div>
                  <span>Presentation</span>
                  <h3>Visual behavior</h3>
                </div>
                <span className="legacy-chip tone-neutral">{selectedViewLabel}</span>
              </div>

              <DesktopWidgetOptionGroup
                label="View Mode"
                onSelect={(value) => onChangeView(value as DesktopWidgetView)}
                options={selectedWidgetDefinition.views.map((viewOption) => ({
                  value: viewOption.id,
                  label: viewOption.label,
                  description: `Render this widget as ${viewOption.label.toLowerCase()}.`
                }))}
                selectedValue={draftView}
              />

              <DesktopWidgetOptionGroup
                label="Container Shape"
                onSelect={(value) => onChangeShape(value as DesktopWidgetShape)}
                options={desktopWidgetShapeOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                  description: option.description
                }))}
                selectedValue={draftShape}
              />
            </section>
          </div>

          <aside className="legacy-desktop-builder-sidebar">
            <div className="legacy-desktop-builder-preview is-prominent">
              <span className="legacy-command-meta">Canvas Summary</span>
              <strong>{draftTitle.trim() || selectedWidgetDefinition.defaultTitle}</strong>
              <p>{selectedWidgetDefinition.description}</p>
              <div className="legacy-desktop-builder-summary-grid">
                <div>
                  <span>Lane</span>
                  <strong>{selectedLaneLabel}</strong>
                </div>
                <div>
                  <span>Footprint</span>
                  <strong>{selectedWidthLabel} / {selectedHeightLabel}</strong>
                </div>
                <div>
                  <span>View</span>
                  <strong>{selectedViewLabel}</strong>
                </div>
                <div>
                  <span>Shape</span>
                  <strong>{selectedShapeLabel}</strong>
                </div>
              </div>
            </div>

            <div className="legacy-desktop-builder-preview">
              <strong>Placement guidance</strong>
              <p>{selectedLaneDescription}</p>
              <div className="legacy-desktop-builder-preview-grid">
                <span className="legacy-chip tone-neutral">Header-grab movement</span>
                <span className="legacy-chip tone-neutral">Live snap preview</span>
                <span className="legacy-chip tone-neutral">Corner resize</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="workflow-actions">
          <button className="workflow-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="workflow-primary" onClick={onSubmit} type="button">
            {isEditing ? "Save Changes" : "Create Widget"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DesktopWidgetOptionGroupProps {
  label: string;
  onSelect: (value: string) => void;
  options: Array<{ description: string; label: string; value: string }>;
  selectedValue: string;
}

function DesktopWidgetOptionGroup({ label, onSelect, options, selectedValue }: DesktopWidgetOptionGroupProps) {
  return (
    <div className="workflow-field is-wide legacy-desktop-option-group-field">
      <span>{label}</span>
      <div className="legacy-desktop-option-group">
        {options.map((option) => (
          <button
            className={`legacy-desktop-option-chip${selectedValue === option.value ? " is-active" : ""}`}
            key={option.value}
            onClick={() => onSelect(option.value)}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface DesktopDashboardManagerModalProps {
  currentDashboardName: string;
  dashboardCount: number;
  draftName: string;
  mode: DesktopDashboardManagerMode;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  open: boolean;
}

function DesktopDashboardManagerModal({
  currentDashboardName,
  dashboardCount,
  draftName,
  mode,
  onChangeName,
  onClose,
  onSubmit,
  open
}: DesktopDashboardManagerModalProps) {
  if (!open) {
    return null;
  }

  const modeLabel =
    mode === "create"
      ? "Create Dashboard"
      : mode === "duplicate"
        ? "Duplicate Dashboard"
        : mode === "rename"
          ? "Rename Dashboard"
          : "Delete Dashboard";
  const summary =
    mode === "delete"
      ? `Delete ${currentDashboardName} from this store front page. This will keep the remaining ${Math.max(dashboardCount - 1, 0)} dashboard layouts.`
      : "Save multiple named front pages per store, then switch between them from the Desktop toolbar.";

  return (
    <div className="modal-backdrop">
      <div className="modal-panel workflow-panel legacy-desktop-dashboard-modal">
        <div className="modal-header">
          <div>
            <p>Desktop layouts</p>
            <h2>{modeLabel}</h2>
          </div>
          <button className="workflow-secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <p className="workflow-summary">{summary}</p>

        {mode !== "delete" ? (
          <div className="workflow-form">
            <label className="workflow-field">
              <span>Dashboard Name</span>
              <input onChange={(event) => onChangeName(event.target.value)} type="text" value={draftName} />
            </label>
          </div>
        ) : (
          <div className="legacy-desktop-builder-preview">
            <strong>{currentDashboardName}</strong>
            <p>This removes the current named layout and switches to the next available Desktop dashboard.</p>
          </div>
        )}

        <div className="workflow-actions">
          <button className="workflow-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="workflow-primary" onClick={onSubmit} type="button">
            {mode === "delete" ? "Delete Dashboard" : modeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AnalyticsWorkspaceProps {
  dashboard: DashboardPayload | null;
  onOpenWorkspace: (workspaceId: WorkspaceId, sourceLabel?: string) => void;
  rows: AnalyticsWorkspaceRow[];
}

function AnalyticsWorkspace({ dashboard, onOpenWorkspace, rows }: AnalyticsWorkspaceProps) {
  const exceptionRoutes = buildExecutiveExceptionRoutes(dashboard, rows);
  const executiveStats = dashboard?.stats.slice(0, 4) ?? [];

  return (
    <div className="legacy-analytics-layout">
      {executiveStats.length > 0 ? (
        <section className="legacy-info-card">
          <h3>Executive Snapshot</h3>
          <div className="legacy-desktop-stat-grid">
            {executiveStats.map((stat) => (
              <article className="legacy-desktop-stat-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.caption}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="legacy-info-card">
        <h3>Exception Routes</h3>
        <div className="legacy-analytics-route-stack">
          {exceptionRoutes.map((route) => (
            <article className="legacy-analytics-route-card" key={route.id}>
              <div className="legacy-command-log-header">
                <div>
                  <strong>{route.label}</strong>
                  <span>{route.ownerTeam}</span>
                </div>
                <span className={`legacy-chip tone-${route.status.toLowerCase()}`}>{route.status}</span>
              </div>
              <p>{route.headline}</p>
              <span className="legacy-command-meta">{route.metric}</span>
              <button className="legacy-task-status-button" onClick={() => onOpenWorkspace(route.workspaceId, "Executive Board")} type="button">
                {route.actionLabel}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="legacy-info-card">
        <h3>Executive Signals</h3>
        <div className="legacy-analytics-signal-stack">
          <div className="legacy-module-stack">
            {rows.map((row) => (
              <article className="legacy-module-line" key={row.id}>
                <span className={`legacy-chip tone-${row.status.toLowerCase()}`}>{row.status}</span>
                <div>
                  <strong>{row.label}</strong>
                  <p>{row.headline}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="legacy-activity-stack">
            {(dashboard?.activity ?? []).map((item) => (
              <article className={`legacy-activity-line tone-${item.tone}`} key={item.label}>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

interface ExecutiveExceptionRoute {
  id: string;
  workspaceId: WorkspaceId;
  label: string;
  status: string;
  ownerTeam: string;
  metric: string;
  headline: string;
  actionLabel: string;
}

function buildExecutiveExceptionRoutes(dashboard: DashboardPayload | null, rows: AnalyticsWorkspaceRow[]): ExecutiveExceptionRoute[] {
  const marineDmsRow = rows.find((row) => row.label === "Marine DMS") ?? null;
  const websiteFeedRow = rows.find((row) => row.label === "Website Feed") ?? null;
  const salesCount = dashboard?.workspaceCounts.sales ?? 0;
  const partsCount = dashboard?.workspaceCounts.parts ?? 0;
  const websiteCount = dashboard?.workspaceCounts.website ?? 0;

  return [
    {
      id: "sales-route",
      workspaceId: "sales",
      label: "Sales Exception Desk",
      status: marineDmsRow?.status ?? (salesCount > 0 ? "Attention" : "Ready"),
      ownerTeam: marineDmsRow?.ownerTeam ?? "Sales + Ops",
      metric: `${salesCount} sales lane${salesCount === 1 ? "" : "s"} in scope`,
      headline: marineDmsRow?.headline ?? "Deal desk pressure, quote follow-up, and lead conversion gaps need review.",
      actionLabel: "Open Sales Board"
    },
    {
      id: "parts-route",
      workspaceId: "parts",
      label: "Parts Exception Lane",
      status: partsCount > 0 ? "Attention" : "Ready",
      ownerTeam: "Parts + Ops",
      metric: `${partsCount} parts lane${partsCount === 1 ? "" : "s"} in scope`,
      headline: "Supplier blockers, special-order pressure, and receiving gaps need a fast operator loop.",
      actionLabel: "Open Parts Board"
    },
    {
      id: "website-route",
      workspaceId: "website",
      label: "Website Exception Lane",
      status: websiteFeedRow?.status ?? (websiteCount > 0 ? "Publishing" : "Ready"),
      ownerTeam: websiteFeedRow?.ownerTeam ?? "Digital",
      metric: `${websiteCount} website feed${websiteCount === 1 ? "" : "s"} in scope`,
      headline: websiteFeedRow?.headline ?? "Publishing cadence, merchandising pushes, and lead routing need review.",
      actionLabel: "Open Website Feed"
    }
  ];
}

interface AuditWorkspaceProps {
  activeStoreId: string;
  actorUserId: string;
  availableStores: SessionState["stores"];
  cleaningQaStoreId: string | null;
  cleaningQaRoNumber: string | null;
  dashboard: DashboardPayload | null;
  onCopySingleTaskSlaPolicy: (targetStoreId: string, workspaceId: WorkspaceId, action: string) => Promise<boolean>;
  onCopyTaskSlaPolicies: (targetStoreId: string) => Promise<boolean>;
  onCleanupQaTasks: (targetStoreId: string, roNumber: string) => Promise<boolean>;
  onOpenServiceRo: (targetStoreId: string, options: OpenServiceRepairOrderOptions) => void;
  onResetAllTaskSlaPolicies: () => Promise<boolean>;
  onResetTaskSlaPolicy: (workspaceId: WorkspaceId, action: string) => Promise<boolean>;
  rows: AuditWorkspaceRow[];
  policies: TaskSlaPolicyEntry[];
  onUpdateTaskSlaPolicy: (workspaceId: WorkspaceId, action: string, slaMinutes: number) => Promise<boolean>;
  requestedCleanupStoreId: string | null;
  refreshKey: number;
  updatingPolicyKey: string | null;
}

function AuditWorkspace({
  activeStoreId,
  actorUserId,
  availableStores,
  cleaningQaStoreId,
  cleaningQaRoNumber,
  dashboard,
  onCopySingleTaskSlaPolicy,
  onCopyTaskSlaPolicies,
  onCleanupQaTasks,
  onOpenServiceRo,
  onResetAllTaskSlaPolicies,
  onResetTaskSlaPolicy,
  rows,
  policies,
  onUpdateTaskSlaPolicy,
  requestedCleanupStoreId,
  refreshKey,
  updatingPolicyKey
}: AuditWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [workspaceFilter, setWorkspaceFilter] = useState("All");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [policyDrafts, setPolicyDrafts] = useState<Record<string, string>>({});
  const [policyTargetStoreId, setPolicyTargetStoreId] = useState("");
  const [cleanupStoreId, setCleanupStoreId] = useState(requestedCleanupStoreId ?? activeStoreId);
  const [policyCopyPreview, setPolicyCopyPreview] = useState<TaskSlaPolicyCopyPreviewResponse | null>(null);
  const [isPolicyCopyPreviewLoading, setIsPolicyCopyPreviewLoading] = useState(false);
  const [policyCopyPreviewError, setPolicyCopyPreviewError] = useState<string | null>(null);
  const [targetAuditRows, setTargetAuditRows] = useState<AuditWorkspaceRow[]>([]);
  const [cleanupServiceEntries, setCleanupServiceEntries] = useState<TaskQueueEntry[]>([]);
  const [isCleanupServiceEntriesLoading, setIsCleanupServiceEntriesLoading] = useState(true);
  const [isBulkCleanupRunning, setIsBulkCleanupRunning] = useState(false);
  const [openPolicyHistoryKey, setOpenPolicyHistoryKey] = useState<string | null>(null);
  const filteredRows = rows.filter(
    (row) =>
      matchesWorkspaceSearch(
        [
          row.summary,
          row.detail,
          row.storeName,
          row.storeCode,
          row.workspaceLabel,
          row.operatorName,
          row.assigneeName,
          row.latestCommentPreview ?? "",
          row.resolutionNote ?? ""
        ],
        searchTerm
      ) &&
      matchesWorkspaceFilter(row.operatorName, operatorFilter) &&
      matchesWorkspaceFilter(row.status, statusFilter) &&
      matchesWorkspaceFilter(row.workspaceLabel, workspaceFilter)
  );

  useEffect(() => {
    setSelectedRowId((current) => {
      if (current && filteredRows.some((row) => row.id === current)) {
        return current;
      }

      return filteredRows.find((row) => row.kind === "Task")?.id ?? filteredRows[0]?.id ?? null;
    });
  }, [filteredRows]);

  const queuedTasks = rows.filter((row) => row.kind === "Task" && row.status === "Queued").length;
  const blockedTasks = rows.filter((row) => row.kind === "Task" && row.status === "Blocked").length;
  const activeStores = new Set(rows.map((row) => row.storeCode)).size;
  const activeOperators = new Set(rows.map((row) => row.operatorName)).size;
  const selectedRow = filteredRows.find((row) => row.id === selectedRowId) ?? null;
  const selectedPolicyKey = selectedRow?.kind === "Task" ? createTaskSlaPolicyKey(selectedRow.workspaceId, selectedRow.summary) : null;
  const rolloutStores = availableStores.filter(
    (store) => store.id !== activeStoreId && store.dealerGroupName === (dashboard?.store.dealerGroupName ?? "")
  );
  const cleanupStores = dashboard?.store.dealerGroupName
    ? availableStores.filter((store) => store.dealerGroupName === dashboard.store.dealerGroupName)
    : availableStores;
  const hasCustomPolicies = policies.some((policy) => policy.source === "Custom");
  const selectedCleanupStore = cleanupStores.find((store) => store.id === cleanupStoreId) ?? null;
  const targetStoreName = policyCopyPreview?.targetStoreName ?? rolloutStores.find((store) => store.id === policyTargetStoreId)?.name ?? "Target store";
  const policyTimelineRows = targetAuditRows.length > 0 ? dedupeAuditWorkspaceRows([...rows, ...targetAuditRows]) : rows;
  const qaCleanupCandidates = buildServiceUtilityQaCleanupCandidates(cleanupServiceEntries);
  const isQaCleanupPending = Boolean(cleaningQaRoNumber) || isBulkCleanupRunning;
  const policyPreviewEntriesByKey = new Map(
    (policyCopyPreview?.comparison ?? []).map((entry) => [createTaskSlaPolicyKey(entry.workspaceId, entry.action), entry])
  );
  const changedPolicyPreviewRows = policyCopyPreview?.comparison.filter((entry) => entry.changeType !== "unchanged") ?? [];
  const isPolicyRolloutAligned = policyCopyPreview?.changedRuleCount === 0;

  useEffect(() => {
    setPolicyTargetStoreId((current) => {
      if (current && rolloutStores.some((store) => store.id === current)) {
        return current;
      }

      return rolloutStores[0]?.id ?? "";
    });
  }, [rolloutStores]);

  useEffect(() => {
    setCleanupStoreId((current) => {
      if (current && cleanupStores.some((store) => store.id === current)) {
        return current;
      }

      return cleanupStores.find((store) => store.id === activeStoreId)?.id ?? cleanupStores[0]?.id ?? activeStoreId;
    });
  }, [activeStoreId, cleanupStores]);

  useEffect(() => {
    if (!requestedCleanupStoreId || !cleanupStores.some((store) => store.id === requestedCleanupStoreId)) {
      return;
    }

    setCleanupStoreId((current) => (current === requestedCleanupStoreId ? current : requestedCleanupStoreId));
  }, [cleanupStores, requestedCleanupStoreId]);

  useEffect(() => {
    let isCancelled = false;

    if (!policyTargetStoreId) {
      setPolicyCopyPreview(null);
      setPolicyCopyPreviewError(null);
      setIsPolicyCopyPreviewLoading(false);
      setTargetAuditRows([]);
      return;
    }

    setIsPolicyCopyPreviewLoading(true);
    setPolicyCopyPreviewError(null);

    void Promise.allSettled([
      previewTaskSlaPolicyCopy(activeStoreId, {
        actorUserId,
        targetStoreId: policyTargetStoreId
      }),
      getWorkspace(policyTargetStoreId, "audit")
    ])
      .then(([previewResult, targetAuditResult]) => {
        if (isCancelled) {
          return;
        }

        if (previewResult.status === "fulfilled") {
          setPolicyCopyPreview(previewResult.value);
          setPolicyCopyPreviewError(null);
        } else {
          const message = previewResult.reason instanceof Error ? previewResult.reason.message : "Unable to preview the SLA rollout.";
          setPolicyCopyPreview(null);
          setPolicyCopyPreviewError(message);
        }

        if (targetAuditResult.status === "fulfilled" && targetAuditResult.value.workspaceId === "audit") {
          setTargetAuditRows(targetAuditResult.value.rows);
        } else {
          setTargetAuditRows([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsPolicyCopyPreviewLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeStoreId, actorUserId, policyTargetStoreId, policies]);

  useEffect(() => {
    setOpenPolicyHistoryKey(null);
  }, [policyTargetStoreId, rows.length, targetAuditRows.length]);

  useEffect(() => {
    let isCancelled = false;

    if (!cleanupStoreId) {
      setCleanupServiceEntries([]);
      setIsCleanupServiceEntriesLoading(false);
      return;
    }

    setIsCleanupServiceEntriesLoading(true);

    void getTaskQueue(cleanupStoreId, "service", undefined, 20)
      .then((entries) => {
        if (!isCancelled) {
          setCleanupServiceEntries(entries);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCleanupServiceEntries([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCleanupServiceEntriesLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [cleanupStoreId, refreshKey]);

  async function handleBulkQaCleanup() {
    if (isQaCleanupPending || qaCleanupCandidates.length === 0) {
      return;
    }

    setIsBulkCleanupRunning(true);

    try {
      for (const candidate of qaCleanupCandidates) {
        const cleaned = await onCleanupQaTasks(cleanupStoreId, candidate.roNumber);

        if (!cleaned) {
          break;
        }
      }
    } finally {
      setIsBulkCleanupRunning(false);
    }
  }

  return (
    <div className="legacy-audit-layout">
      <section className="legacy-info-card">
        <h3>Audit Snapshot</h3>
        <div className="legacy-stage-strip">
          <article className="legacy-stage-card">
            <span>Stores in scope</span>
            <strong>{activeStores}</strong>
            <p>{dashboard?.store.dealerGroupName ?? "Dealer group"} cross-store trail.</p>
          </article>
          <article className="legacy-stage-card">
            <span>Queued tasks</span>
            <strong>{queuedTasks}</strong>
            <p>Tasks still waiting for operator movement.</p>
          </article>
          <article className="legacy-stage-card">
            <span>Blocked tasks</span>
            <strong>{blockedTasks}</strong>
            <p>Workflow items that still need intervention.</p>
          </article>
          <article className="legacy-stage-card">
            <span>Operators active</span>
            <strong>{activeOperators}</strong>
            <p>Users touching task or activity history in this feed.</p>
          </article>
        </div>
      </section>

      <section className="legacy-info-card">
        <div className="legacy-command-log-header">
          <div>
            <h3>Cross-Store Trail</h3>
            <span>{dashboard?.store.dealerGroupName ?? "Dealer group"}</span>
          </div>
        </div>

        <div className="legacy-audit-filter-row">
          <label className="legacy-audit-filter-control">
            <span>Search</span>
            <input onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search task, store, or operator" type="text" value={searchTerm} />
          </label>
          <label className="legacy-audit-filter-control">
            <span>Operator</span>
            <select onChange={(event) => setOperatorFilter(event.target.value)} value={operatorFilter}>
              {buildFilterOptions(rows.map((row) => row.operatorName)).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="legacy-audit-filter-control">
            <span>Status</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              {buildFilterOptions(rows.map((row) => row.status)).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="legacy-audit-filter-control">
            <span>Workspace</span>
            <select onChange={(event) => setWorkspaceFilter(event.target.value)} value={workspaceFilter}>
              {buildFilterOptions(rows.map((row) => row.workspaceLabel)).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="legacy-audit-trail-grid">
          <div className="legacy-audit-list-panel">
            {filteredRows.length === 0 ? (
              <p className="legacy-audit-empty-state">No audit entries match the current filters.</p>
            ) : (
              <div className="legacy-command-list">
                {filteredRows.map((row) => (
                  <button
                    className={`legacy-command-line legacy-audit-row tone-${row.tone}${selectedRowId === row.id ? " is-selected" : ""}`}
                    key={row.id}
                    onClick={() => setSelectedRowId(row.id)}
                    type="button"
                  >
                    <span className="legacy-command-time">{row.kind === "Task" ? row.status : row.kind}</span>
                    <div>
                      <strong>{row.summary}</strong>
                      <p>{row.detail}</p>
                      <span className="legacy-command-meta">
                        {row.storeName} -+ {row.workspaceLabel} -+ {row.timeLabel}
                      </span>
                      <span className="legacy-command-meta">
                        {row.kind === "Task" ? `Owner ${row.assigneeName} -+ Updated by ${row.operatorName}` : `Logged by ${row.operatorName}`}
                      </span>
                      {row.kind === "Task" ? (
                        <>
                          <span className={`legacy-command-meta${row.breachLabel?.includes("overdue") ? " is-overdue" : ""}`}>
                            Age {row.ageLabel} -+ SLA {row.slaLabel} -+ {row.breachLabel}
                          </span>
                          {row.latestCommentPreview ? <span className="legacy-command-meta">Latest note: {row.latestCommentPreview}</span> : null}
                          {row.resolutionNote ? <span className="legacy-command-meta">Resolution: {row.resolutionNote}</span> : null}
                          {row.commentCount > 0 ? <span className="legacy-command-meta">{row.commentCount} note{row.commentCount === 1 ? "" : "s"} on file</span> : null}
                        </>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="legacy-audit-detail-panel">
            {selectedRow ? (
              selectedRow.kind === "Task" && selectedRow.taskDetail ? (
                <section className="legacy-info-card legacy-audit-focus-card">
                  <div className="legacy-command-log-header">
                    <div>
                      <h3>Focused Task</h3>
                      <span>{selectedRow.storeName}</span>
                    </div>
                    <span className="legacy-command-time">{selectedRow.status}</span>
                  </div>

                  <div className="legacy-audit-focus-summary">
                    <div className="legacy-audit-focus-copy">
                      <strong>{selectedRow.summary}</strong>
                      <p>{selectedRow.detail}</p>
                    </div>
                    <span className={`legacy-command-meta${selectedRow.breachLabel?.includes("overdue") ? " is-overdue" : ""}`}>
                      Age {selectedRow.ageLabel} -+ SLA {selectedRow.slaLabel} -+ {selectedRow.breachLabel}
                    </span>
                  </div>

                  <div className="legacy-info-grid">
                    <LabelValue label="Store" value={`${selectedRow.storeName} -+ ${selectedRow.storeCode}`} />
                    <LabelValue label="Workspace" value={selectedRow.workspaceLabel} />
                    <LabelValue label="Created" value={selectedRow.taskDetail.createdAtLabel} />
                    <LabelValue label="Updated" value={selectedRow.taskDetail.updatedAtLabel} />
                    <LabelValue label="Due" value={selectedRow.taskDetail.dueAtLabel ?? "-"} />
                    <LabelValue label="Closed" value={selectedRow.taskDetail.completedAtLabel ?? "-"} />
                    <LabelValue label="Created By" value={selectedRow.taskDetail.actorName} />
                    <LabelValue label="Owner" value={selectedRow.assigneeName} />
                    <LabelValue label="Updated By" value={selectedRow.operatorName} />
                    <LabelValue label="Latest Note By" value={selectedRow.taskDetail.latestCommentByName ?? "-"} />
                  </div>

                  <div className="legacy-audit-focus-section">
                    <h4 className="legacy-audit-section-title">Workflow Snapshot</h4>
                    {selectedRow.taskDetail.snapshotFields.length === 0 ? (
                      <p className="legacy-audit-empty-state">No captured workflow fields for this task.</p>
                    ) : (
                      <div className="legacy-info-grid">
                        {selectedRow.taskDetail.snapshotFields.map((field) => (
                          <LabelValue key={`${selectedRow.id}-${field.label}`} label={field.label} value={field.value} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="legacy-audit-focus-section">
                    <h4 className="legacy-audit-section-title">Note History</h4>
                    {selectedRow.taskDetail.notes.length === 0 ? (
                      <p className="legacy-audit-empty-state">No task notes recorded yet.</p>
                    ) : (
                      <div className="legacy-task-note-list">
                        {selectedRow.taskDetail.notes.map((note) => (
                          <article className="legacy-task-note-line" key={note.id}>
                            <strong>{note.kind}</strong>
                            <p>{note.body}</p>
                            <span className="legacy-command-meta">
                              {note.authorName} -+ {note.timeLabel}
                            </span>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <section className="legacy-info-card legacy-audit-focus-card">
                  <div className="legacy-command-log-header">
                    <div>
                      <h3>Focused Activity</h3>
                      <span>{selectedRow.storeName}</span>
                    </div>
                    <span className="legacy-command-time">{selectedRow.kind}</span>
                  </div>
                  <div className="legacy-audit-focus-copy">
                    <strong>{selectedRow.summary}</strong>
                    <p>{selectedRow.detail}</p>
                  </div>
                  <div className="legacy-info-grid">
                    <LabelValue label="Store" value={`${selectedRow.storeName} -+ ${selectedRow.storeCode}`} />
                    <LabelValue label="Workspace" value={selectedRow.workspaceLabel} />
                    <LabelValue label="Logged" value={selectedRow.timeLabel} />
                    <LabelValue label="Operator" value={selectedRow.operatorName} />
                  </div>
                </section>
              )
            ) : (
              <section className="legacy-info-card legacy-audit-focus-card">
                <h3>Focused Detail</h3>
                <p className="legacy-audit-empty-state">Select a task or activity row to inspect timing, workflow payload, and note history.</p>
              </section>
            )}

            <section className="legacy-info-card legacy-audit-admin-card">
              <div className="legacy-command-log-header">
                <div>
                  <h3>Demo QA Cleanup</h3>
                  <span>{selectedCleanupStore?.name ?? dashboard?.store.name ?? "Current store"}</span>
                </div>
                <div className="legacy-audit-cleanup-actions">
                  <label className="legacy-audit-filter-control legacy-audit-cleanup-store-picker">
                    <span>Store</span>
                    <select disabled={isQaCleanupPending || cleanupStores.length === 0} onChange={(event) => setCleanupStoreId(event.target.value)} value={cleanupStoreId}>
                      {cleanupStores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span>{qaCleanupCandidates.length} RO{qaCleanupCandidates.length === 1 ? "" : "s"}</span>
                  {qaCleanupCandidates.length > 1 ? (
                    <button
                      className="legacy-task-status-button"
                      disabled={isQaCleanupPending || isCleanupServiceEntriesLoading}
                      onClick={() => {
                        void handleBulkQaCleanup();
                      }}
                      type="button"
                    >
                      {isBulkCleanupRunning ? "Cleaning all..." : "Clean All"}
                    </button>
                  ) : null}
                </div>
              </div>

              {isCleanupServiceEntriesLoading ? (
                <p className="legacy-audit-empty-state">Checking the current store service queue for demo QA tasks...</p>
              ) : qaCleanupCandidates.length === 0 ? (
                <p className="legacy-audit-empty-state">No demo QA service utility tasks are currently queued for this store.</p>
              ) : (
                <div className="legacy-audit-cleanup-list">
                  {qaCleanupCandidates.map((candidate) => (
                    <article className="legacy-audit-cleanup-line" key={candidate.roNumber}>
                      <div className="legacy-audit-cleanup-copy">
                        <strong>RO {candidate.roNumber}</strong>
                        <span className="legacy-command-meta">
                          {candidate.taskCount} demo QA task{candidate.taskCount === 1 ? "" : "s"} -+ {candidate.actions.join(", ")}
                        </span>
                        <span className="legacy-command-meta">
                          Latest status {candidate.latestStatus} -+ {candidate.latestTimeLabel}
                        </span>
                        <span className="legacy-command-meta">Jump opens the latest {candidate.latestAction} task inline.</span>
                      </div>
                      <div className="legacy-audit-cleanup-line-actions">
                        <button
                          className="legacy-task-status-button"
                          disabled={isQaCleanupPending}
                          onClick={() =>
                            onOpenServiceRo(cleanupStoreId, {
                              roNumber: candidate.roNumber,
                              taskId: candidate.latestTaskId,
                              returnToAuditStoreId: activeStoreId,
                              returnToCleanupStoreId: cleanupStoreId
                            })
                          }
                          type="button"
                        >
                          Open Task
                        </button>
                        <button
                          className="legacy-task-status-button"
                          disabled={isQaCleanupPending}
                          onClick={() => {
                            void onCleanupQaTasks(cleanupStoreId, candidate.roNumber);
                          }}
                          type="button"
                        >
                          {cleaningQaStoreId === cleanupStoreId && cleaningQaRoNumber === candidate.roNumber ? "Cleaning..." : isBulkCleanupRunning ? "Queued" : "Clean RO"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="legacy-info-card legacy-audit-policy-board">
              <div className="legacy-command-log-header">
                <div>
                  <h3>Store SLA Policies</h3>
                  <span>{dashboard?.store.name ?? "Current store"}</span>
                </div>
              </div>

              <div className="legacy-policy-board-actions">
                <label className="legacy-audit-filter-control">
                  <span>Roll Out To</span>
                  <select disabled={Boolean(updatingPolicyKey) || rolloutStores.length === 0} onChange={(event) => setPolicyTargetStoreId(event.target.value)} value={policyTargetStoreId}>
                    {rolloutStores.length === 0 ? (
                      <option value="">No other stores available</option>
                    ) : (
                      rolloutStores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <div className="legacy-policy-action-buttons">
                  <button
                    className="legacy-task-status-button"
                    disabled={Boolean(updatingPolicyKey) || !policyTargetStoreId || isPolicyCopyPreviewLoading || isPolicyRolloutAligned}
                    onClick={() => {
                      void onCopyTaskSlaPolicies(policyTargetStoreId);
                    }}
                    type="button"
                  >
                    {isPolicyRolloutAligned ? "Already aligned" : updatingPolicyKey?.startsWith("copy:") ? "Copying..." : "Copy All"}
                  </button>
                  <button
                    className="legacy-task-status-button"
                    disabled={Boolean(updatingPolicyKey) || !hasCustomPolicies}
                    onClick={() => {
                      void onResetAllTaskSlaPolicies().then((saved) => {
                        if (saved) {
                          setPolicyDrafts({});
                        }
                      });
                    }}
                    type="button"
                  >
                    {updatingPolicyKey === "reset-all" ? "Resetting..." : "Reset All"}
                  </button>
                </div>
              </div>

              {policyTargetStoreId ? (
                <section className="legacy-policy-preview-card">
                  <div className="legacy-command-log-header">
                    <div>
                      <h4 className="legacy-audit-section-title">Rollout Preview</h4>
                      <span>{targetStoreName}</span>
                    </div>
                    <span>
                      {isPolicyCopyPreviewLoading
                        ? "Loading"
                        : policyCopyPreview
                          ? `${policyCopyPreview.changedRuleCount} change${policyCopyPreview.changedRuleCount === 1 ? "" : "s"}`
                          : "Preview unavailable"}
                    </span>
                  </div>

                  {isPolicyCopyPreviewLoading ? (
                    <p className="legacy-audit-empty-state">Loading the target store policy diff...</p>
                  ) : policyCopyPreviewError ? (
                    <p className="legacy-audit-empty-state">{policyCopyPreviewError}</p>
                  ) : policyCopyPreview ? (
                    <>
                      <p className="legacy-command-meta">{policyCopyPreview.message}</p>
                      {changedPolicyPreviewRows.length === 0 ? (
                        <p className="legacy-audit-empty-state">{policyCopyPreview.targetStoreName} already matches the rollout state.</p>
                      ) : (
                        <div className="legacy-policy-preview-list">
                          {changedPolicyPreviewRows.map((entry) => (
                            <article className={`legacy-policy-preview-line is-${entry.changeType}`} key={`${entry.workspaceId}:${entry.action}:${entry.changeType}`}>
                              <div className="legacy-policy-preview-copy">
                                <strong>{entry.action}</strong>
                                <span className="legacy-command-meta">
                                  {entry.workspaceLabel} -+ {describeTaskSlaPolicyPreviewChange(entry.changeType)}
                                </span>
                              </div>
                              <span className="legacy-command-meta">
                                Current target: {formatTaskSlaPolicyPreviewState(entry.targetStoreSource, entry.targetStoreSlaLabel, "Default only")}
                              </span>
                              <span className="legacy-command-meta">
                                After rollout: {formatTaskSlaPolicyPreviewState(entry.nextTargetSource, entry.nextTargetSlaLabel, "Removed")}
                              </span>
                              <span className="legacy-command-meta">
                                Source store: {formatTaskSlaPolicyPreviewState(entry.sourceStoreSource, entry.sourceStoreSlaLabel, "No source rule")}
                              </span>
                            </article>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </section>
              ) : null}

              {policies.length === 0 ? (
                <p className="legacy-audit-empty-state">No task policy entries are available for this store yet.</p>
              ) : (
                <div className="legacy-audit-policy-stack">
                  {policies.map((policy) => {
                    const policyKey = createTaskSlaPolicyKey(policy.workspaceId, policy.action);
                    const draftValue = policyDrafts[policyKey] ?? `${policy.slaMinutes}`;
                    const parsedMinutes = Number(draftValue);
                    const previewEntry = policyPreviewEntriesByKey.get(policyKey) ?? null;
                    const policyTimelineEntries = buildPolicyTimelineEntries(policy.action, policyTimelineRows, policyTargetStoreId ? targetStoreName : null);
                    const previewTimelineEntries = policyTimelineEntries.slice(0, 2);
                    const hasOverflowTimeline = policyTimelineEntries.length > previewTimelineEntries.length;
                    const isHistoryOpen = openPolicyHistoryKey === policyKey;
                    const singleRolloutKey = `copy-one:${policyTargetStoreId}:${policyKey}`;
                    const isSingleRolloutAligned = previewEntry?.changeType === "unchanged";

                    return (
                      <article className={`legacy-policy-line${selectedPolicyKey === policyKey ? " is-linked" : ""}`} key={policy.id}>
                        <div className="legacy-policy-line-copy">
                          <strong>{policy.action}</strong>
                          <span className="legacy-command-meta">
                            {policy.workspaceLabel} -+ {policy.source} -+ {policy.slaLabel}
                          </span>
                          <span className="legacy-command-meta">
                            {policy.updatedAtLabel
                              ? `Updated by ${policy.updatedByName ?? "Operator"} -+ ${policy.updatedAtLabel}`
                              : "Using the seeded default SLA target"}
                          </span>
                          <span className="legacy-command-meta">
                            {policy.openTaskCount} open task{policy.openTaskCount === 1 ? "" : "s"} in scope
                          </span>
                          {policyTargetStoreId ? (
                            isPolicyCopyPreviewLoading ? (
                              <span className="legacy-command-meta">Loading {targetStoreName} policy preview...</span>
                            ) : previewEntry ? (
                              <div className={`legacy-policy-target-preview${previewEntry.changeType !== "unchanged" ? ` is-${previewEntry.changeType}` : ""}`}>
                                <span className="legacy-command-meta">
                                  {targetStoreName} current: {formatTaskSlaPolicyPreviewState(previewEntry.targetStoreSource, previewEntry.targetStoreSlaLabel, "Default only")}
                                </span>
                                <span className="legacy-command-meta">
                                  After rollout: {formatTaskSlaPolicyPreviewState(previewEntry.nextTargetSource, previewEntry.nextTargetSlaLabel, "Removed")}
                                </span>
                              </div>
                            ) : (
                              <span className="legacy-command-meta">No rollout preview available for {targetStoreName}.</span>
                            )
                          ) : null}
                          {previewTimelineEntries.length > 0 ? (
                            <div className="legacy-policy-timeline-stack">
                              <div className="legacy-policy-timeline">
                                {previewTimelineEntries.map((timelineEntry) => (
                                  <article className={`legacy-policy-timeline-item tone-${timelineEntry.tone}`} key={timelineEntry.id}>
                                    <span className="legacy-policy-timeline-dot" />
                                    <div>
                                      <strong>{timelineEntry.label}</strong>
                                      <span className="legacy-command-meta">{timelineEntry.meta}</span>
                                    </div>
                                  </article>
                                ))}
                              </div>
                              {hasOverflowTimeline ? (
                                <div className="legacy-policy-history-trigger">
                                  <button
                                    className="legacy-policy-history-button"
                                    onClick={() => setOpenPolicyHistoryKey((current) => (current === policyKey ? null : policyKey))}
                                    type="button"
                                  >
                                    {isHistoryOpen ? "Hide full history" : "View full history"}
                                  </button>
                                  <span className="legacy-command-meta">{policyTimelineEntries.length} events</span>
                                  {isHistoryOpen ? (
                                    <div className="legacy-policy-history-popover">
                                      <div className="legacy-policy-history-popover-header">
                                        <strong>Policy Timeline</strong>
                                        <button
                                          className="legacy-policy-history-button"
                                          onClick={() => setOpenPolicyHistoryKey(null)}
                                          type="button"
                                        >
                                          Close
                                        </button>
                                      </div>
                                      <div className="legacy-policy-history-popover-list">
                                        {policyTimelineEntries.map((timelineEntry) => (
                                          <article className={`legacy-policy-timeline-item tone-${timelineEntry.tone}`} key={`${policyKey}-${timelineEntry.id}`}>
                                            <span className="legacy-policy-timeline-dot" />
                                            <div>
                                              <strong>{timelineEntry.label}</strong>
                                              <span className="legacy-command-meta">{timelineEntry.meta}</span>
                                            </div>
                                          </article>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="legacy-policy-line-actions">
                          <input
                            aria-label={`${policy.action} SLA minutes`}
                            className="legacy-policy-input"
                            disabled={Boolean(updatingPolicyKey)}
                            min={5}
                            onChange={(event) =>
                              setPolicyDrafts((current) => ({
                                ...current,
                                [policyKey]: event.target.value
                              }))
                            }
                            step={5}
                            type="number"
                            value={draftValue}
                          />
                          <button
                            className="legacy-task-status-button"
                            disabled={Boolean(updatingPolicyKey) || !Number.isFinite(parsedMinutes) || parsedMinutes < 5 || parsedMinutes === policy.slaMinutes}
                            onClick={() => {
                              void onUpdateTaskSlaPolicy(policy.workspaceId, policy.action, parsedMinutes).then((saved) => {
                                if (saved) {
                                  setPolicyDrafts((current) => ({
                                    ...current,
                                    [policyKey]: `${parsedMinutes}`
                                  }));
                                }
                              });
                            }}
                            type="button"
                          >
                            {updatingPolicyKey === policyKey ? "Saving..." : "Save"}
                          </button>
                          <button
                            className="legacy-task-status-button"
                            disabled={Boolean(updatingPolicyKey) || policy.source === "Default"}
                            onClick={() => {
                              void onResetTaskSlaPolicy(policy.workspaceId, policy.action).then((saved) => {
                                if (saved) {
                                  setPolicyDrafts((current) => {
                                    const nextDrafts = { ...current };
                                    delete nextDrafts[policyKey];
                                    return nextDrafts;
                                  });
                                }
                              });
                            }}
                            type="button"
                          >
                            {updatingPolicyKey === `reset:${policyKey}` ? "Resetting..." : "Reset"}
                          </button>
                          <button
                            className="legacy-task-status-button"
                            disabled={Boolean(updatingPolicyKey) || !policyTargetStoreId || isPolicyCopyPreviewLoading || !previewEntry || isSingleRolloutAligned}
                            onClick={() => {
                              void onCopySingleTaskSlaPolicy(policyTargetStoreId, policy.workspaceId, policy.action);
                            }}
                            type="button"
                          >
                            {isSingleRolloutAligned ? "Aligned" : updatingPolicyKey === singleRolloutKey ? "Rolling..." : "Roll Out"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}

interface WebsiteWorkspaceProps {
  activityEntries: CommandLogEntry[];
  entries: TaskQueueEntry[];
  fallbackStatusLine: string;
  isFilteredByOperator: boolean;
  onAddTaskNote: (taskId: string, body: string, kind: TaskNoteKind) => Promise<boolean>;
  onAssignTask: (taskId: string, assigneeUserId: string | null) => void;
  onSelectRow: (row: WebsiteWorkspaceRow) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  operators: StoreOperatorOption[];
  rows: WebsiteWorkspaceRow[];
  selectedRow: WebsiteWorkspaceRow | null;
  selectedRowId: string | null;
  updatingTaskId: string | null;
}

function WebsiteWorkspace({
  activityEntries,
  entries,
  fallbackStatusLine,
  isFilteredByOperator,
  onAddTaskNote,
  onAssignTask,
  onSelectRow,
  onUpdateStatus,
  operators,
  rows,
  selectedRow,
  selectedRowId,
  updatingTaskId
}: WebsiteWorkspaceProps) {
  const [queueActionFilter, setQueueActionFilter] = useState("All");
  const [queueStatusFilter, setQueueStatusFilter] = useState("All");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [handoffSelections, setHandoffSelections] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const totalInventory = rows.reduce((sum, feed) => sum + feed.inventoryCount, 0);
  const totalLeads = rows.reduce((sum, feed) => sum + feed.leadsToday, 0);
  const publishingCount = rows.filter((feed) => feed.status === "Publishing").length;
  const readyCount = rows.filter((feed) => feed.status === "Ready").length;
  const selectedLeadShare = selectedRow && totalLeads > 0 ? Math.round((selectedRow.leadsToday / totalLeads) * 100) : 0;
  const queueActionOptions = buildFilterOptions(entries.map((entry) => entry.action));
  const queueStatusOptions = buildFilterOptions(entries.map((entry) => entry.status));
  const historyEntries = activityEntries.filter(isWebsiteHistoryEntry);
  const historyTypeOptions = buildFilterOptions(historyEntries.map((entry) => entry.label));
  const filteredQueueEntries = entries.filter(
    (entry) => matchesWorkspaceFilter(entry.action, queueActionFilter) && matchesWorkspaceFilter(entry.status, queueStatusFilter)
  );
  const filteredHistoryEntries = historyEntries.filter((entry) => matchesWorkspaceFilter(entry.label, historyFilter));
  const overdueQueueCount = filteredQueueEntries.filter((entry) => entry.isOverdue && entry.status !== "Done").length;

  return (
    <div className="legacy-feed-layout">
      <section className="legacy-info-card">
        <div className="legacy-command-log-header">
          <div>
            <h3>Publishing Queue</h3>
            <span>{rows.length} feeds</span>
          </div>
          <span>{publishingCount} publishing -+ {readyCount} ready</span>
        </div>

        {rows.length === 0 ? (
          <p>No website feeds are configured for this store.</p>
        ) : (
          <div className="legacy-feed-stack">
            {rows.map((feed) => (
              <button
                className={`legacy-feed-line legacy-feed-button${feed.id === selectedRowId ? " is-selected" : ""}`}
                key={feed.id}
                onClick={() => onSelectRow(feed)}
                type="button"
              >
                <div>
                  <strong>{feed.brand}</strong>
                  <p>{feed.domain}</p>
                  <span className="legacy-command-meta">
                    {feed.leadsToday} leads today -+ {feed.inventoryCount} units
                  </span>
                </div>
                <div>
                  <strong>{feed.lastSyncLabel}</strong>
                  <p>{buildWebsiteSyncGuidance(feed)}</p>
                </div>
                <span className={`legacy-chip tone-${feed.status.toLowerCase()}`}>{feed.status}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="legacy-feed-detail-stack">
        <section className="legacy-info-card">
          <div className="legacy-command-log-header">
            <div>
              <h3>Feed Focus</h3>
              <span>{selectedRow?.brand ?? "No feed selected"}</span>
            </div>
            {selectedRow ? <span className={`legacy-chip tone-${selectedRow.status.toLowerCase()}`}>{selectedRow.status}</span> : null}
          </div>

          {!selectedRow ? (
            <p>Select a website feed to inspect publish posture and lead-sync load.</p>
          ) : (
            <>
              <div className="legacy-info-grid">
                <LabelValue label="Domain" value={selectedRow.domain} />
                <LabelValue label="Inventory" value={`${selectedRow.inventoryCount} units`} />
                <LabelValue label="Leads Today" value={`${selectedRow.leadsToday}`} />
                <LabelValue label="Last Sync" value={selectedRow.lastSyncLabel} />
              </div>
              <div className="legacy-chip-row">
                <span className={`legacy-chip tone-${buildWebsiteLeadTone(selectedRow.leadsToday)}`}>{buildWebsiteLeadLabel(selectedRow.leadsToday)}</span>
                <span className="legacy-chip tone-neutral">{selectedLeadShare}% of store web leads</span>
                <span className="legacy-chip tone-neutral">
                  {selectedRow.inventoryCount >= 100 ? "Full catalog window" : "Featured inventory window"}
                </span>
              </div>
              <p>{buildWebsitePublishGuidance(selectedRow)}</p>
            </>
          )}
        </section>

        <section className="legacy-info-card">
          <h3>Lead Sync Monitor</h3>
          <p>{fallbackStatusLine}</p>
          <div className="legacy-activity-stack">
            {rows.map((feed) => {
              const leadShare = totalLeads > 0 ? Math.round((feed.leadsToday / totalLeads) * 100) : 0;

              return (
                <article className={`legacy-activity-line tone-${buildWebsiteLeadTone(feed.leadsToday)}`} key={`${feed.id}-lead`}>
                  <strong>{feed.brand}</strong>
                  <p>
                    {feed.leadsToday} leads today -+ {leadShare}% of store web leads -+ {feed.lastSyncLabel}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="legacy-info-card">
          <h3>Feed Totals</h3>
          <div className="legacy-feed-health-strip">
            <article className="legacy-feed-health-card">
              <span>Total Inventory</span>
              <strong>{totalInventory}</strong>
              <p>Units currently staged across every public website surface for this store.</p>
            </article>
            <article className="legacy-feed-health-card">
              <span>Web Leads</span>
              <strong>{totalLeads}</strong>
              <p>Combined website leads captured today across the active domain lanes.</p>
            </article>
            <article className="legacy-feed-health-card">
              <span>Publishing Now</span>
              <strong>{publishingCount}</strong>
              <p>Feeds actively pushing inventory updates or waiting for the publish window to close.</p>
            </article>
          </div>
        </section>

        <section className="legacy-info-card">
          <div className="legacy-command-log-header">
            <div>
              <h3>Digital Ops Queue</h3>
              <span>{filteredQueueEntries.length} task{filteredQueueEntries.length === 1 ? "" : "s"} visible</span>
            </div>
            <span>{overdueQueueCount} overdue</span>
          </div>

          <div className="legacy-website-filter-row">
            <label className="legacy-audit-filter-control">
              <span>Queue Action</span>
              <select onChange={(event) => setQueueActionFilter(event.target.value)} value={queueActionFilter}>
                {queueActionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="legacy-audit-filter-control">
              <span>Queue Status</span>
              <select onChange={(event) => setQueueStatusFilter(event.target.value)} value={queueStatusFilter}>
                {queueStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isFilteredByOperator ? <span className="legacy-command-meta legacy-website-inline-meta">Mine only is active in the shared rails for this workspace.</span> : null}

          {entries.length === 0 ? (
            <p>{isFilteredByOperator ? "No website tasks are queued for this operator right now." : "No website tasks are queued for Digital Ops right now."}</p>
          ) : filteredQueueEntries.length === 0 ? (
            <p>No website tasks match the current queue filters.</p>
          ) : (
            <div className="legacy-command-list">
              {filteredQueueEntries.map((entry) => (
                <article className={`legacy-command-line tone-${entry.tone}`} key={entry.id}>
                  <span className="legacy-command-time">{entry.status}</span>
                  <div>
                    <strong>{entry.action}</strong>
                    <p>{entry.detail}</p>
                    <span className="legacy-command-meta">Created by {entry.actorName}</span>
                    <span className="legacy-command-meta">
                      Owner {entry.assignedName} -+ Updated by {entry.lastUpdatedByName} -+ {entry.timeLabel}
                    </span>
                    <span className={`legacy-command-meta${entry.isOverdue ? " is-overdue" : ""}`}>
                      Age {entry.ageLabel} -+ SLA {entry.slaLabel} -+ {entry.breachLabel}
                    </span>
                    {entry.latestCommentPreview ? <span className="legacy-command-meta">Latest note: {entry.latestCommentPreview}</span> : null}
                    {entry.resolutionNote ? <span className="legacy-command-meta">Resolution: {entry.resolutionNote}</span> : null}
                    {entry.commentCount > 0 ? (
                      <span className="legacy-command-meta">{entry.commentCount} note{entry.commentCount === 1 ? "" : "s"} recorded</span>
                    ) : null}
                    {updatingTaskId === entry.id ? <span className="legacy-command-meta">Updating task status...</span> : null}
                    {entry.notes.length > 0 ? (
                      <div className="legacy-task-note-list">
                        {entry.notes.map((note) => (
                          <article className="legacy-task-note-line" key={note.id}>
                            <strong>{note.kind}</strong>
                            <p>{note.body}</p>
                            <span className="legacy-command-meta">
                              {note.authorName} -+ {note.timeLabel}
                            </span>
                          </article>
                        ))}
                      </div>
                    ) : null}
                    <div className="legacy-task-note-composer">
                      <textarea
                        aria-label={`Website task note for ${entry.action}`}
                        className="legacy-task-note-input"
                        disabled={Boolean(updatingTaskId)}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [entry.id]: event.target.value
                          }))
                        }
                        placeholder="Add digital-ops context, blocker detail, or a resolution note"
                        rows={2}
                        value={noteDrafts[entry.id] ?? ""}
                      />
                      <div className="legacy-task-status-actions">
                        <button
                          className="legacy-task-status-button"
                          disabled={Boolean(updatingTaskId) || !(noteDrafts[entry.id] ?? "").trim()}
                          onClick={() => {
                            void onAddTaskNote(entry.id, (noteDrafts[entry.id] ?? "").trim(), "Comment").then((saved) => {
                              if (saved) {
                                setNoteDrafts((current) => ({
                                  ...current,
                                  [entry.id]: ""
                                }));
                              }
                            });
                          }}
                          type="button"
                        >
                          Add note
                        </button>
                        <button
                          className="legacy-task-status-button"
                          disabled={Boolean(updatingTaskId) || !(noteDrafts[entry.id] ?? "").trim()}
                          onClick={() => {
                            void onAddTaskNote(entry.id, (noteDrafts[entry.id] ?? "").trim(), "Resolution").then((saved) => {
                              if (saved) {
                                setNoteDrafts((current) => ({
                                  ...current,
                                  [entry.id]: ""
                                }));
                              }
                            });
                          }}
                          type="button"
                        >
                          {entry.status === "Done" ? "Update resolution" : "Resolve"}
                        </button>
                      </div>
                    </div>
                    <div className="legacy-task-handoff-row">
                      <select
                        aria-label={`Assign website task ${entry.action}`}
                        className="legacy-task-assignee-select"
                        disabled={Boolean(updatingTaskId)}
                        onChange={(event) =>
                          setHandoffSelections((current) => ({
                            ...current,
                            [entry.id]: event.target.value
                          }))
                        }
                        value={handoffSelections[entry.id] ?? entry.assignedUserId ?? ""}
                      >
                        <option value="">Unassigned</option>
                        {operators.map((operator) => (
                          <option key={operator.id} value={operator.id}>
                            {operator.name} -+ {operator.title}
                          </option>
                        ))}
                      </select>
                      <button
                        className="legacy-task-status-button"
                        disabled={Boolean(updatingTaskId) || (handoffSelections[entry.id] ?? entry.assignedUserId ?? "") === (entry.assignedUserId ?? "")}
                        onClick={() => onAssignTask(entry.id, (handoffSelections[entry.id] ?? entry.assignedUserId ?? "") || null)}
                        type="button"
                      >
                        Hand off
                      </button>
                    </div>
                    <div className="legacy-task-status-actions">
                      {getTaskStatusActions(entry.status).map((action) => (
                        <button
                          className="legacy-task-status-button"
                          disabled={Boolean(updatingTaskId)}
                          key={`${entry.id}-${action.status}`}
                          onClick={() => onUpdateStatus(entry.id, action.status)}
                          type="button"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="legacy-info-card">
          <div className="legacy-command-log-header">
            <div>
              <h3>Publish History</h3>
              <span>{filteredHistoryEntries.length} event{filteredHistoryEntries.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="legacy-website-filter-row">
            <label className="legacy-audit-filter-control">
              <span>History Type</span>
              <select onChange={(event) => setHistoryFilter(event.target.value)} value={historyFilter}>
                {historyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {historyEntries.length === 0 ? (
            <p>No website activity has been logged for this store yet.</p>
          ) : filteredHistoryEntries.length === 0 ? (
            <p>No website history rows match the current history filter.</p>
          ) : (
            <div className="legacy-command-list">
              {filteredHistoryEntries.map((entry) => (
                <article className={`legacy-command-line tone-${entry.tone}`} key={entry.id}>
                  <span className="legacy-command-time">{entry.timeLabel}</span>
                  <div>
                    <strong>{entry.label}</strong>
                    <p>{entry.detail}</p>
                    <span className="legacy-command-meta">{entry.actorName}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const websiteHistoryEntryLabels = new Set(["Publish Feed", "Lead Sync", "Open Queue", "Refresh completed"]);

function isWebsiteHistoryEntry(entry: CommandLogEntry) {
  return websiteHistoryEntryLabels.has(entry.label);
}

function buildWebsiteLeadTone(leadsToday: number) {
  if (leadsToday >= 8) {
    return "accent";
  }

  if (leadsToday >= 4) {
    return "stable";
  }

  return "neutral";
}

function buildWebsiteLeadLabel(leadsToday: number) {
  if (leadsToday >= 8) {
    return "High lead pace";
  }

  if (leadsToday >= 4) {
    return "Steady lead pace";
  }

  return "Light lead pace";
}

function buildWebsiteSyncGuidance(feed: WebsiteWorkspaceRow) {
  if (feed.status === "Publishing") {
    return "Push is running now.";
  }

  if (feed.inventoryCount >= 100) {
    return "Catalog is ready for the next full publish.";
  }

  return "Use this lane for featured inventory or landing-page updates.";
}

function buildWebsitePublishGuidance(feed: WebsiteWorkspaceRow) {
  if (feed.status === "Publishing") {
    return `${feed.brand} is already in a publish window. Keep Digital Ops on queue coverage until the sync closes and lead routing settles.`;
  }

  if (feed.leadsToday >= 8) {
    return `${feed.brand} is carrying the heaviest lead volume today. If merchandising changed, queue a fresh publish before the next lead-response sweep.`;
  }

  return `${feed.brand} is ready for a smaller merch pass. Use the publish rail for featured inventory, pricing updates, or a landing-page refresh.`;
}

interface CommandLogRailProps {
  entries: CommandLogEntry[];
  isFilteredByOperator: boolean;
  isLoading: boolean;
  onToggleOperatorFilter: () => void;
  workspaceTitle: string;
}

function CommandLogRail({ entries, isFilteredByOperator, isLoading, onToggleOperatorFilter, workspaceTitle }: CommandLogRailProps) {
  return (
    <section className="legacy-info-card legacy-command-log">
      <div className="legacy-command-log-header">
        <div>
          <h3>Activity Rail</h3>
          <span>{workspaceTitle}</span>
        </div>
        <button className="legacy-task-status-button" onClick={onToggleOperatorFilter} type="button">
          {isFilteredByOperator ? "All operators" : "Mine only"}
        </button>
      </div>

      {isLoading && entries.length === 0 ? (
        <p>Loading activity...</p>
      ) : entries.length === 0 ? (
        <p>
          {isFilteredByOperator
            ? "No operator actions logged for this user yet. Refreshes, row focus, and workflow submits will appear here."
            : "No operator actions logged yet. Refreshes, row focus, and workflow submits will appear here."}
        </p>
      ) : (
        <div className="legacy-command-list">
          {entries.map((entry) => (
            <article className={`legacy-command-line tone-${entry.tone}`} key={entry.id}>
              <span className="legacy-command-time">{entry.timeLabel}</span>
              <div>
                <strong>{entry.label}</strong>
                <p>{entry.detail}</p>
                <span className="legacy-command-meta">{entry.actorName}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

interface ServiceNotificationRailProps {
  activeDetailRoNumber: string | null;
  entries: ServiceNotificationEntry[];
  isCollapsed: boolean;
  isLoading: boolean;
  isUnreadOnly: boolean;
  onOpenServiceRo: (notificationEntry: ServiceNotificationEntry) => void;
  onToggleCollapsed: () => void;
  onToggleUnreadOnly: () => void;
}

function ServiceNotificationRail({
  activeDetailRoNumber,
  entries,
  isCollapsed,
  isLoading,
  isUnreadOnly,
  onOpenServiceRo,
  onToggleCollapsed,
  onToggleUnreadOnly
}: ServiceNotificationRailProps) {
  const visibleEntries = isUnreadOnly ? entries.filter((entry) => entry.unread) : entries;
  const unreadCount = entries.filter((entry) => entry.unread).length;
  const totalCount = entries.length;

  return (
    <section className={`legacy-info-card legacy-command-log legacy-service-notification-rail${isCollapsed ? " is-collapsed" : ""}`}>
      {isCollapsed ? (
        <button
          aria-expanded="false"
          aria-label="Expand notification rail"
          className="legacy-service-notification-rail-toggle"
          onClick={onToggleCollapsed}
          title={`${unreadCount} unread, ${totalCount} total service notifications`}
          type="button"
        >
          <span className="legacy-service-notification-rail-toggle-kicker">Alerts</span>
          <strong>{unreadCount}</strong>
          <span className="legacy-service-notification-rail-toggle-label">Unread</span>
          <span className="legacy-service-notification-rail-toggle-total">{totalCount} total</span>
        </button>
      ) : (
        <>
          <div className="legacy-command-log-header legacy-service-notification-rail-header">
            <div className="legacy-service-notification-rail-heading">
              <h3>Notification Rail</h3>
              <div className="legacy-service-notification-rail-summary">
                <span className="legacy-service-notification-rail-badge is-unread">{unreadCount} unread</span>
                <span className="legacy-service-notification-rail-badge">{totalCount} total</span>
              </div>
            </div>
            <div className="legacy-service-notification-rail-actions">
              <button className="legacy-task-status-button" onClick={onToggleUnreadOnly} type="button">
                {isUnreadOnly ? "Show all" : "Unread only"}
              </button>
              <button
                aria-expanded="true"
                aria-label="Collapse notification rail"
                className="legacy-task-status-button"
                onClick={onToggleCollapsed}
                type="button"
              >
                Collapse
              </button>
            </div>
          </div>

          {isLoading && entries.length === 0 ? (
            <p>Loading service notifications...</p>
          ) : visibleEntries.length === 0 ? (
            <p>{isUnreadOnly ? "No unread service notifications right now." : "No service notifications are queued right now."}</p>
          ) : (
            <div className="legacy-service-notification-list">
              {visibleEntries.map((entry) => {
                const isViewing = activeDetailRoNumber === entry.roNumber;

                return (
                  <button
                    className={`legacy-service-notification-card tone-${entry.tone}${entry.unread ? " is-unread" : ""}${isViewing ? " is-viewing" : ""}`}
                    disabled={isViewing}
                    key={entry.id}
                    onClick={() => onOpenServiceRo(entry)}
                    type="button"
                  >
                    <strong>{entry.headline}</strong>
                    <span className="legacy-command-meta">RO {entry.roNumber} - {entry.customerName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface TaskQueueRailProps {
  entries: TaskQueueEntry[];
  isFilteredByOperator: boolean;
  isLoading: boolean;
  onAddTaskNote: (taskId: string, body: string, kind: TaskNoteKind) => Promise<boolean>;
  onAssignTask: (taskId: string, assigneeUserId: string | null) => void;
  onToggleOperatorFilter: () => void;
  operators: StoreOperatorOption[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  updatingTaskId: string | null;
  workspaceTitle: string;
}

function TaskQueueRail({
  entries,
  isFilteredByOperator,
  isLoading,
  onAddTaskNote,
  onAssignTask,
  onToggleOperatorFilter,
  operators,
  onUpdateStatus,
  updatingTaskId,
  workspaceTitle
}: TaskQueueRailProps) {
  const [handoffSelections, setHandoffSelections] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const visibleEntries = entries.slice(0, 8);

  return (
    <section className="legacy-info-card legacy-command-log">
      <div className="legacy-command-log-header">
        <div>
          <h3>Task Queue</h3>
          <span>{workspaceTitle}</span>
        </div>
        <button className="legacy-task-status-button" onClick={onToggleOperatorFilter} type="button">
          {isFilteredByOperator ? "All operators" : "Mine only"}
        </button>
      </div>

      {isLoading && visibleEntries.length === 0 ? (
        <p>Loading queued tasks...</p>
      ) : visibleEntries.length === 0 ? (
        <p>{isFilteredByOperator ? "No queued workflow tasks for this operator yet." : "No queued workflow tasks for this workspace yet."}</p>
      ) : (
        <div className="legacy-command-list">
          {visibleEntries.map((entry) => (
            <article className={`legacy-command-line tone-${entry.tone}`} key={entry.id}>
              <span className="legacy-command-time">{entry.status}</span>
              <div>
                <strong>{entry.action}</strong>
                <p>{entry.detail}</p>
                <span className="legacy-command-meta">Created by {entry.actorName}</span>
                <span className="legacy-command-meta">
                  Owner {entry.assignedName} -+ Updated by {entry.lastUpdatedByName} -+ {entry.timeLabel}
                </span>
                <span className={`legacy-command-meta${entry.isOverdue ? " is-overdue" : ""}`}>
                  Age {entry.ageLabel} -+ SLA {entry.slaLabel} -+ {entry.breachLabel}
                </span>
                {entry.latestCommentPreview ? (
                  <span className="legacy-command-meta">Latest note: {entry.latestCommentPreview}</span>
                ) : null}
                {entry.resolutionNote ? <span className="legacy-command-meta">Resolution: {entry.resolutionNote}</span> : null}
                {entry.commentCount > 0 ? (
                  <span className="legacy-command-meta">{entry.commentCount} note{entry.commentCount === 1 ? "" : "s"} recorded</span>
                ) : null}
                {updatingTaskId === entry.id ? <span className="legacy-command-meta">Updating task status...</span> : null}
                {entry.notes.length > 0 ? (
                  <div className="legacy-task-note-list">
                    {entry.notes.map((note) => (
                      <article className="legacy-task-note-line" key={note.id}>
                        <strong>{note.kind}</strong>
                        <p>{note.body}</p>
                        <span className="legacy-command-meta">
                          {note.authorName} -+ {note.timeLabel}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : null}
                <div className="legacy-task-note-composer">
                  <textarea
                    aria-label={`Task note for ${entry.action}`}
                    className="legacy-task-note-input"
                    disabled={Boolean(updatingTaskId)}
                    onChange={(event) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [entry.id]: event.target.value
                      }))
                    }
                    placeholder="Add handoff context, blocker detail, or a resolution note"
                    rows={2}
                    value={noteDrafts[entry.id] ?? ""}
                  />
                  <div className="legacy-task-status-actions">
                    <button
                      className="legacy-task-status-button"
                      disabled={Boolean(updatingTaskId) || !(noteDrafts[entry.id] ?? "").trim()}
                      onClick={() => {
                        void onAddTaskNote(entry.id, (noteDrafts[entry.id] ?? "").trim(), "Comment").then((saved) => {
                          if (saved) {
                            setNoteDrafts((current) => ({
                              ...current,
                              [entry.id]: ""
                            }));
                          }
                        });
                      }}
                      type="button"
                    >
                      Add note
                    </button>
                    <button
                      className="legacy-task-status-button"
                      disabled={Boolean(updatingTaskId) || !(noteDrafts[entry.id] ?? "").trim()}
                      onClick={() => {
                        void onAddTaskNote(entry.id, (noteDrafts[entry.id] ?? "").trim(), "Resolution").then((saved) => {
                          if (saved) {
                            setNoteDrafts((current) => ({
                              ...current,
                              [entry.id]: ""
                            }));
                          }
                        });
                      }}
                      type="button"
                    >
                      {entry.status === "Done" ? "Update resolution" : "Resolve"}
                    </button>
                  </div>
                </div>
                <div className="legacy-task-handoff-row">
                  <select
                    aria-label={`Assign ${entry.action}`}
                    className="legacy-task-assignee-select"
                    disabled={Boolean(updatingTaskId)}
                    onChange={(event) =>
                      setHandoffSelections((current) => ({
                        ...current,
                        [entry.id]: event.target.value
                      }))
                    }
                    value={handoffSelections[entry.id] ?? entry.assignedUserId ?? ""}
                  >
                    <option value="">Unassigned</option>
                    {operators.map((operator) => (
                      <option key={operator.id} value={operator.id}>
                        {operator.name} -+ {operator.title}
                      </option>
                    ))}
                  </select>
                  <button
                    className="legacy-task-status-button"
                    disabled={Boolean(updatingTaskId) || (handoffSelections[entry.id] ?? entry.assignedUserId ?? "") === (entry.assignedUserId ?? "")}
                    onClick={() => onAssignTask(entry.id, (handoffSelections[entry.id] ?? entry.assignedUserId ?? "") || null)}
                    type="button"
                  >
                    Hand off
                  </button>
                </div>
                <div className="legacy-task-status-actions">
                  {getTaskStatusActions(entry.status).map((action) => (
                    <button
                      className="legacy-task-status-button"
                      disabled={Boolean(updatingTaskId)}
                      key={`${entry.id}-${action.status}`}
                      onClick={() => onUpdateStatus(entry.id, action.status)}
                      type="button"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function getTaskStatusActions(status: TaskStatus) {
  if (status === "Queued") {
    return [
      { label: "Start", status: "In Progress" },
      { label: "Block", status: "Blocked" },
      { label: "Done", status: "Done" }
    ] as const;
  }

  if (status === "In Progress") {
    return [
      { label: "Block", status: "Blocked" },
      { label: "Done", status: "Done" },
      { label: "Reset", status: "Queued" }
    ] as const;
  }

  if (status === "Blocked") {
    return [
      { label: "Start", status: "In Progress" },
      { label: "Done", status: "Done" },
      { label: "Reset", status: "Queued" }
    ] as const;
  }

  return [{ label: "Reopen", status: "Queued" }] as const;
}

type ServiceWorkbenchTab =
  | "general"
  | "units"
  | "work"
  | "communications"
  | "laborCloseout"
  | "deposits"
  | "attachments"
  | "history"
  | "esignature";

type ServiceWorkSubTab = "jobGeneral" | "parts" | "labor" | "techNotes" | "sublet" | "attachments" | "warranty1" | "warranty2";

interface ServiceWorkbenchUnit {
  id: string;
  label: string;
  stockNumber: string;
  make: string;
  model: string;
  year: string;
  serialNumber: string;
  unitType: string;
  location: string;
  hoursIn: string;
  hoursOut: string;
  notes: string;
  onLot: boolean;
}

interface ServiceWorkbenchPart {
  partNumber: string;
  description: string;
  supplier: string;
  available: number;
  price: number;
  quantity: number;
  category: string;
}

interface ServiceWorkbenchLaborLine {
  technician: string;
  jobCode: string;
  description: string;
  quantity: string;
  laborRate: string;
  chargeBy: string;
  rate: number;
  total: number;
  closedDate: string;
  completedBy: string;
}

interface ServiceWorkbenchSubletLine {
  vendor: string;
  code: string;
  description: string;
  price: number;
  invoiceNumber: string;
  date: string;
}

interface ServiceWorkbenchWarrantyClaim {
  warrantyClaimNumber: string;
  internalWarrantyNumber: string;
  failureDate: string;
  contentionCode: string;
  problemCode: string;
  problemDescription: string;
  claimType: string;
  status: string;
  deductible: number;
  failedPartNumber: string;
  actionTaken: string;
  reasonForDelay: string;
  carrierNumber: string;
  invoiceDate: string;
  invoiceNumber: string;
  dateFiledWithCarrier: string;
  authorizations: string[];
  extraLabor: Array<{ hours: string; reason: string }>;
}

interface ServiceWorkbenchJob {
  id: string;
  title: string;
  unitLabel: string;
  customerApproval: string;
  status: string;
  warranty: string;
  appliance: string;
  description: string;
  resolution: string;
  recommendations: string;
  jobCode: string;
  technician: string;
  laborRate: string;
  chargeBy: string;
  rate: number;
  quantity: number;
  total: number;
  closedDate: string;
  completedBy: string;
  techNotes: string;
  parts: ServiceWorkbenchPart[];
  laborLines: ServiceWorkbenchLaborLine[];
  subletLines: ServiceWorkbenchSubletLine[];
  attachments: string[];
  warrantyClaim: ServiceWorkbenchWarrantyClaim;
}

interface ServiceWorkbenchFollowUp {
  subject: string;
  owner: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  confirmed: string;
  showed: string;
  automated: string;
  notes: string;
}

interface ServiceWorkbenchLaborSession {
  technician: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  actualHours: string;
  creditedHours: string;
  override: string;
}

interface ServiceWorkbenchDeposit {
  invoiceNumber: string;
  date: string;
  cashier: string;
  description: string;
  amount: number;
  paymentDate: string;
  cancelDate: string;
}

interface ServiceWorkbenchAttachment {
  name: string;
  visibility: string;
  kind: string;
  createdBy: string;
  createdTime: string;
  status: string;
}

interface ServiceWorkbenchHistoryLine {
  date: string;
  event: string;
  user: string;
  detail: string;
  oldValue: string;
  newValue: string;
}

interface ServiceWorkbenchSignatureDoc {
  description: string;
  createdBy: string;
  createdTime: string;
  completedTime: string;
  status: string;
  customer: string;
  dealer1: string;
  dealer2: string;
  dealer3: string;
  dealer4: string;
}

interface ServiceWorkbenchModel {
  roNumber: string;
  customerAddress: string[];
  homePhone: string;
  workPhone: string;
  cellPhone: string;
  email: string;
  customerNo: string;
  setupDate: string;
  loyaltyPoints: string;
  promisedDate: string;
  closedDate: string;
  purchaseOrder: string;
  jobs: ServiceWorkbenchJob[];
  units: ServiceWorkbenchUnit[];
  notes: string;
  transferNotes: string;
  miscCharges: Array<{ label: string; amount: number; auto: boolean }>;
  totals: {
    parts: number;
    labor: number;
    sublet: number;
    misc: number;
    beforeTax: number;
    salesTax: number;
    total: number;
    totalDue: number;
    saleType: string;
  };
  openFollowUps: ServiceWorkbenchFollowUp[];
  closedFollowUps: ServiceWorkbenchFollowUp[];
  laborCloseout: ServiceWorkbenchLaborLine[];
  laborSessions: ServiceWorkbenchLaborSession[];
  deposits: ServiceWorkbenchDeposit[];
  attachments: ServiceWorkbenchAttachment[];
  history: ServiceWorkbenchHistoryLine[];
  signatureDocs: ServiceWorkbenchSignatureDoc[];
}

const serviceWorkbenchTabs: Array<{ id: ServiceWorkbenchTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "units", label: "Units" },
  { id: "work", label: "Work" },
  { id: "communications", label: "Communications" },
  { id: "laborCloseout", label: "Labor Closeout" },
  { id: "deposits", label: "Deposits" },
  { id: "attachments", label: "Attachments" },
  { id: "history", label: "History" },
  { id: "esignature", label: "eSignature" }
];

const estimateHiddenServiceWorkbenchTabs = new Set<ServiceWorkbenchTab>(["laborCloseout", "deposits", "esignature"]);

function getVisibleServiceWorkbenchTabs(orderType: ServiceWorkspaceRow["orderType"]) {
  return orderType === "Estimate"
    ? serviceWorkbenchTabs.filter((tab) => !estimateHiddenServiceWorkbenchTabs.has(tab.id))
    : serviceWorkbenchTabs;
}

const serviceWorkSubTabs: Array<{ id: ServiceWorkSubTab; label: string }> = [
  { id: "jobGeneral", label: "Job General" },
  { id: "parts", label: "Parts" },
  { id: "labor", label: "Labor" },
  { id: "techNotes", label: "Tech Notes" },
  { id: "sublet", label: "Sublet" },
  { id: "attachments", label: "Attachments" },
  { id: "warranty1", label: "Warranty 1" },
  { id: "warranty2", label: "Warranty 2" }
];

interface ServiceRepairWorkbenchProps extends ServiceUtilityInlinePanelProps {
  isServiceDetailLoading: boolean;
  onAddLaborSession: (payload: {
    jobId: string;
    technician: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    actualHours: string;
    creditedHours: string;
    override: string;
  }) => Promise<boolean>;
  onAddPart: (payload: {
    jobId: string;
    partNumber: string;
    description: string;
    supplier: string;
    available: number;
    price: number;
    quantity: number;
    category: string;
  }) => Promise<boolean>;
  onCreateJob: (payload: {
    title: string;
    unitLabel: string;
    description: string;
    technician: string;
  }) => Promise<boolean>;
  onRemovePart: (jobId: string, partNumber: string) => Promise<boolean>;
  onUpdateJob: (payload: {
    jobId: string;
    title: string;
    customerApproval: string;
    status: string;
    appliance: string;
    description: string;
    resolution: string;
    recommendations: string;
    technician: string;
    laborRate: string;
    chargeBy: string;
    rate: number;
    quantity: number;
  }) => Promise<boolean>;
  onUpdateOrderType: (orderType: "Estimate" | "Repair Order") => Promise<boolean>;
  onUpdateWarrantyClaim: (payload: {
    jobId: string;
    warrantyClaimNumber: string;
    internalWarrantyNumber: string;
    failureDate: string;
    contentionCode: string;
    problemCode: string;
    problemDescription: string;
    claimType: string;
    status: string;
    deductible: number;
    failedPartNumber: string;
    actionTaken: string;
    reasonForDelay: string;
    carrierNumber: string;
    invoiceDate: string;
    invoiceNumber: string;
    dateFiledWithCarrier: string;
  }) => Promise<boolean>;
  serviceDetail: ServiceWorkbenchModel | null;
  servicePartCatalog: ServiceOrderPartCatalogEntry[];
  updatingServiceDetailKey: string | null;
}

function readWorkbenchFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readWorkbenchFormNumber(formData: FormData, key: string) {
  const value = Number.parseFloat(readWorkbenchFormText(formData, key));
  return Number.isFinite(value) ? value : 0;
}

function readWorkbenchFormInteger(formData: FormData, key: string) {
  const value = Number.parseInt(readWorkbenchFormText(formData, key), 10);
  return Number.isFinite(value) ? value : 0;
}

function ServiceRepairWorkbench(props: ServiceRepairWorkbenchProps) {
  const { activityEntries, entries, selectedServiceRow, serviceDetail, servicePartCatalog, updatingServiceDetailKey } = props;
  const [activeTab, setActiveTab] = useState<ServiceWorkbenchTab>("general");
  const [activeWorkSubTab, setActiveWorkSubTab] = useState<ServiceWorkSubTab>("jobGeneral");
  const model = selectedServiceRow ? serviceDetail ?? buildServiceRepairWorkbenchModel(selectedServiceRow, entries, activityEntries) : null;
  const [selectedJobId, setSelectedJobId] = useState<string | null>(model?.jobs[0]?.id ?? null);
  const isEstimate = selectedServiceRow?.orderType === "Estimate";

  useEffect(() => {
    setActiveTab("general");
    setActiveWorkSubTab("jobGeneral");
    setSelectedJobId(model?.jobs[0]?.id ?? null);
  }, [selectedServiceRow?.id]);

  useEffect(() => {
    if (isEstimate && estimateHiddenServiceWorkbenchTabs.has(activeTab)) {
      setActiveTab("general");
    }
  }, [activeTab, isEstimate]);

  if (!selectedServiceRow) {
    return (
      <section className="legacy-info-card legacy-service-workbench is-empty">
        <p className="legacy-audit-empty-state">Select an RO row to open the service workbench.</p>
      </section>
    );
  }

  if (props.isServiceDetailLoading && !serviceDetail) {
    return (
      <section className="legacy-info-card legacy-service-workbench is-empty">
        <p className="legacy-audit-empty-state">Loading service order detail...</p>
      </section>
    );
  }

  if (!model) {
    return (
      <section className="legacy-info-card legacy-service-workbench is-empty">
        <p className="legacy-audit-empty-state">Service order detail is unavailable for this row.</p>
      </section>
    );
  }

  const selectedJob = model.jobs.find((job) => job.id === selectedJobId) ?? model.jobs[0];
  const isMutatingServiceDetail = Boolean(updatingServiceDetailKey);
  const orderTypeToggleTarget = selectedServiceRow.orderType === "Estimate" ? "Repair Order" : "Estimate";
  const recordLabel = isEstimate ? "Estimate" : "Repair Order";
  const orderNumberLabel = isEstimate ? "Estimate #" : "RO #";
  const jobCollectionLabel = isEstimate ? "Estimate Jobs" : "Repair Order Jobs";
  const totalSummaryLabel = isEstimate ? "Estimated Total" : "Total Due";
  const totalSummaryValue = isEstimate ? model.totals.total : model.totals.totalDue;
  const visibleWorkbenchTabs = getVisibleServiceWorkbenchTabs(selectedServiceRow.orderType);

  let workSubTabContent: ReactNode;

  switch (activeWorkSubTab) {
    case "parts": {
      const partsTotal = selectedJob.parts.reduce((total, part) => total + part.price * part.quantity, 0);

      workSubTabContent = (
        <>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Parts On Job</h4>
              <span>{selectedJob.parts.length} line{selectedJob.parts.length === 1 ? "" : "s"}</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Supplier</th>
                    <th>Avail</th>
                    <th>Category</th>
                    <th>Each</th>
                    <th>Qty</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJob.parts.length > 0 ? (
                    selectedJob.parts.map((part) => (
                      <tr key={`${selectedJob.id}-${part.partNumber}`}>
                        <td>{part.partNumber}</td>
                        <td>{part.description}</td>
                        <td>{part.supplier}</td>
                        <td>{part.available}</td>
                        <td>{part.category}</td>
                        <td>{formatWorkbenchCurrency(part.price)}</td>
                        <td>{part.quantity}</td>
                        <td>
                          <button
                            className="legacy-task-status-button"
                            disabled={isMutatingServiceDetail}
                            onClick={() => {
                              void props.onRemovePart(selectedJob.id, part.partNumber);
                            }}
                            type="button"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>No parts have been added to this job yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Add Part</h4>
              <span>{servicePartCatalog.length} catalog references</span>
            </div>
            <form
              className="workflow-form"
              key={`${selectedJob.id}-add-part`}
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const formData = new FormData(form);

                void props
                  .onAddPart({
                    jobId: selectedJob.id,
                    partNumber: readWorkbenchFormText(formData, "partNumber"),
                    description: readWorkbenchFormText(formData, "description"),
                    supplier: readWorkbenchFormText(formData, "supplier"),
                    available: readWorkbenchFormInteger(formData, "available"),
                    price: readWorkbenchFormNumber(formData, "price"),
                    quantity: Math.max(1, readWorkbenchFormInteger(formData, "quantity")),
                    category: readWorkbenchFormText(formData, "category")
                  })
                  .then((saved) => {
                    if (saved) {
                      form.reset();
                    }
                  });
              }}
            >
              <div className="workflow-grid">
                <label className="workflow-field">
                  <span>Part #</span>
                  <input list={`${selectedJob.id}-part-catalog`} name="partNumber" placeholder="Part number" required />
                </label>
                <label className="workflow-field">
                  <span>Description</span>
                  <input name="description" placeholder="Part description" required />
                </label>
                <label className="workflow-field">
                  <span>Supplier</span>
                  <input defaultValue="MM" name="supplier" placeholder="Supplier" required />
                </label>
                <label className="workflow-field">
                  <span>Category</span>
                  <input defaultValue="SHOP" name="category" placeholder="Category" required />
                </label>
                <label className="workflow-field">
                  <span>Available</span>
                  <input defaultValue="1" min="0" name="available" type="number" />
                </label>
                <label className="workflow-field">
                  <span>Price</span>
                  <input defaultValue="0" min="0" name="price" step="0.01" type="number" />
                </label>
                <label className="workflow-field">
                  <span>Quantity</span>
                  <input defaultValue="1" min="1" name="quantity" type="number" />
                </label>
              </div>
              <div className="workflow-actions">
                <button className="workflow-primary" disabled={isMutatingServiceDetail} type="submit">
                  Add Part
                </button>
              </div>
              <datalist id={`${selectedJob.id}-part-catalog`}>
                {servicePartCatalog.map((part) => (
                  <option key={part.partNumber} value={part.partNumber}>
                    {part.description}
                  </option>
                ))}
              </datalist>
            </form>
          </section>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-charge-list">
              <div className="legacy-service-charge-row">
                <span>Parts total</span>
                <strong>{formatWorkbenchCurrency(partsTotal)}</strong>
              </div>
              <div className="legacy-service-charge-row">
                <span>Open availability</span>
                <strong>{selectedJob.parts.some((part) => part.available === 0) ? "Backordered" : "In stock"}</strong>
              </div>
            </div>
          </section>
        </>
      );
      break;
    }
    case "labor": {
      workSubTabContent = (
        <>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>{isEstimate ? "Estimated Labor" : "Labor Detail"}</h4>
              <span>{selectedJob.technician}</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Job Code</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Labor Rate</th>
                    <th>Charge By</th>
                    <th>Rate</th>
                    <th>Total</th>
                    <th>Closed Date</th>
                    <th>Completed By</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJob.laborLines.map((line) => (
                    <tr key={`${selectedJob.id}-${line.jobCode}-${line.technician}`}>
                      <td>{line.technician}</td>
                      <td>{line.jobCode}</td>
                      <td>{line.description}</td>
                      <td>{line.quantity}</td>
                      <td>{line.laborRate}</td>
                      <td>{line.chargeBy}</td>
                      <td>{formatWorkbenchCurrency(line.rate)}</td>
                      <td>{formatWorkbenchCurrency(line.total)}</td>
                      <td>{line.closedDate || "-"}</td>
                      <td>{line.completedBy || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {isEstimate ? (
            <section className="legacy-service-pane-section">
              <div className="legacy-service-note-panel">
                <strong>Repair Order Promotion Required</strong>
                <p>Labor sessions stay disabled until this estimate is promoted to a repair order.</p>
              </div>
            </section>
          ) : (
            <section className="legacy-service-pane-section">
              <div className="legacy-service-pane-header">
                <h4>Add Labor Session</h4>
                <span>{model.laborSessions.length} total sessions</span>
              </div>
              <form
                className="workflow-form"
                key={`${selectedJob.id}-labor-session`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const formData = new FormData(form);

                  void props
                    .onAddLaborSession({
                      jobId: selectedJob.id,
                      technician: readWorkbenchFormText(formData, "technician"),
                      startDate: readWorkbenchFormText(formData, "startDate"),
                      startTime: readWorkbenchFormText(formData, "startTime"),
                      endDate: readWorkbenchFormText(formData, "endDate"),
                      endTime: readWorkbenchFormText(formData, "endTime"),
                      actualHours: readWorkbenchFormText(formData, "actualHours"),
                      creditedHours: readWorkbenchFormText(formData, "creditedHours"),
                      override: readWorkbenchFormText(formData, "override")
                    })
                    .then((saved) => {
                      if (saved) {
                        form.reset();
                      }
                    });
                }}
              >
                <div className="workflow-grid">
                  <label className="workflow-field">
                    <span>Technician</span>
                    <input defaultValue={selectedJob.technician} name="technician" required />
                  </label>
                  <label className="workflow-field">
                    <span>Start Date</span>
                    <input name="startDate" placeholder="MM/DD/YYYY" required />
                  </label>
                  <label className="workflow-field">
                    <span>Start Time</span>
                    <input name="startTime" placeholder="8:00 AM" required />
                  </label>
                  <label className="workflow-field">
                    <span>End Date</span>
                    <input name="endDate" placeholder="MM/DD/YYYY" />
                  </label>
                  <label className="workflow-field">
                    <span>End Time</span>
                    <input name="endTime" placeholder="4:30 PM" />
                  </label>
                  <label className="workflow-field">
                    <span>Actual Hrs</span>
                    <input defaultValue="1.0" name="actualHours" required />
                  </label>
                  <label className="workflow-field">
                    <span>Credited Hrs</span>
                    <input defaultValue="1.0" name="creditedHours" required />
                  </label>
                  <label className="workflow-field">
                    <span>Override</span>
                    <input name="override" placeholder="Optional override reason" />
                  </label>
                </div>
                <div className="workflow-actions">
                  <button className="workflow-primary" disabled={isMutatingServiceDetail} type="submit">
                    Save Labor Session
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      );
      break;
    }
    case "techNotes": {
      workSubTabContent = (
        <section className="legacy-service-pane-section">
          <h4>Tech Notes</h4>
          <div className="legacy-service-note-panel">
            <p>{selectedJob.techNotes}</p>
          </div>
        </section>
      );
      break;
    }
    case "sublet": {
      workSubTabContent = selectedJob.subletLines.length > 0 ? (
        <section className="legacy-service-pane-section">
          <div className="legacy-service-table-wrap">
            <table className="legacy-service-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Invoice #</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedJob.subletLines.map((line) => (
                  <tr key={`${selectedJob.id}-${line.vendor}-${line.code}`}>
                    <td>{line.vendor}</td>
                    <td>{line.code}</td>
                    <td>{line.description}</td>
                    <td>{formatWorkbenchCurrency(line.price)}</td>
                    <td>{line.invoiceNumber}</td>
                    <td>{line.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="legacy-audit-empty-state">No sublet lines are tied to this job.</p>
      );
      break;
    }
    case "attachments": {
      workSubTabContent = selectedJob.attachments.length > 0 ? (
        <div className="legacy-service-attachment-grid">
          {selectedJob.attachments.map((attachment) => (
            <article className="legacy-service-attachment-card" key={`${selectedJob.id}-${attachment}`}>
              <strong>{attachment}</strong>
              <span>{selectedJob.technician}</span>
              <span>{selectedServiceRow.roNumber}</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="legacy-audit-empty-state">No job-specific attachments are linked yet.</p>
      );
      break;
    }
    case "warranty1": {
      workSubTabContent = (
        <div className="legacy-service-pane-grid is-split">
          <section className="legacy-service-pane-section">
            <div className="legacy-service-key-grid">
              <LabelValue label="Warranty Claim #" value={selectedJob.warrantyClaim.warrantyClaimNumber} />
              <LabelValue label="Internal Warranty #" value={selectedJob.warrantyClaim.internalWarrantyNumber} />
              <LabelValue label="Failure Date" value={selectedJob.warrantyClaim.failureDate} />
              <LabelValue label="Claim Type" value={selectedJob.warrantyClaim.claimType} />
              <LabelValue label="Status" value={selectedJob.warrantyClaim.status} />
              <LabelValue label="Failed Part" value={selectedJob.warrantyClaim.failedPartNumber} />
            </div>
          </section>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-key-grid">
              <LabelValue label="Contention Code" value={selectedJob.warrantyClaim.contentionCode} />
              <LabelValue label="Problem Code" value={selectedJob.warrantyClaim.problemCode} />
              <LabelValue label="Deductible" value={formatWorkbenchCurrency(selectedJob.warrantyClaim.deductible)} />
            </div>
            <div className="legacy-service-note-panel">
              <p>{selectedJob.warrantyClaim.problemDescription}</p>
            </div>
            <form
              className="workflow-form"
              key={`${selectedJob.id}-warranty-edit`}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                void props.onUpdateWarrantyClaim({
                  jobId: selectedJob.id,
                  warrantyClaimNumber: readWorkbenchFormText(formData, "warrantyClaimNumber"),
                  internalWarrantyNumber: readWorkbenchFormText(formData, "internalWarrantyNumber"),
                  failureDate: readWorkbenchFormText(formData, "failureDate"),
                  contentionCode: readWorkbenchFormText(formData, "contentionCode"),
                  problemCode: readWorkbenchFormText(formData, "problemCode"),
                  problemDescription: readWorkbenchFormText(formData, "problemDescription"),
                  claimType: readWorkbenchFormText(formData, "claimType"),
                  status: readWorkbenchFormText(formData, "status"),
                  deductible: readWorkbenchFormNumber(formData, "deductible"),
                  failedPartNumber: readWorkbenchFormText(formData, "failedPartNumber"),
                  actionTaken: readWorkbenchFormText(formData, "actionTaken"),
                  reasonForDelay: readWorkbenchFormText(formData, "reasonForDelay"),
                  carrierNumber: readWorkbenchFormText(formData, "carrierNumber"),
                  invoiceDate: readWorkbenchFormText(formData, "invoiceDate"),
                  invoiceNumber: readWorkbenchFormText(formData, "invoiceNumber"),
                  dateFiledWithCarrier: readWorkbenchFormText(formData, "dateFiledWithCarrier")
                });
              }}
            >
              <div className="workflow-grid">
                <label className="workflow-field">
                  <span>Claim #</span>
                  <input defaultValue={selectedJob.warrantyClaim.warrantyClaimNumber} name="warrantyClaimNumber" />
                </label>
                <label className="workflow-field">
                  <span>Internal #</span>
                  <input defaultValue={selectedJob.warrantyClaim.internalWarrantyNumber} name="internalWarrantyNumber" />
                </label>
                <label className="workflow-field">
                  <span>Failure Date</span>
                  <input defaultValue={selectedJob.warrantyClaim.failureDate} name="failureDate" />
                </label>
                <label className="workflow-field">
                  <span>Claim Type</span>
                  <input defaultValue={selectedJob.warrantyClaim.claimType} name="claimType" />
                </label>
                <label className="workflow-field">
                  <span>Status</span>
                  <input defaultValue={selectedJob.warrantyClaim.status} name="status" />
                </label>
                <label className="workflow-field">
                  <span>Failed Part</span>
                  <input defaultValue={selectedJob.warrantyClaim.failedPartNumber} name="failedPartNumber" />
                </label>
                <label className="workflow-field">
                  <span>Contention Code</span>
                  <input defaultValue={selectedJob.warrantyClaim.contentionCode} name="contentionCode" />
                </label>
                <label className="workflow-field">
                  <span>Problem Code</span>
                  <input defaultValue={selectedJob.warrantyClaim.problemCode} name="problemCode" />
                </label>
                <label className="workflow-field">
                  <span>Deductible</span>
                  <input defaultValue={selectedJob.warrantyClaim.deductible} min="0" name="deductible" step="0.01" type="number" />
                </label>
                <label className="workflow-field">
                  <span>Carrier #</span>
                  <input defaultValue={selectedJob.warrantyClaim.carrierNumber} name="carrierNumber" />
                </label>
                <label className="workflow-field">
                  <span>Invoice Date</span>
                  <input defaultValue={selectedJob.warrantyClaim.invoiceDate} name="invoiceDate" />
                </label>
                <label className="workflow-field">
                  <span>Invoice #</span>
                  <input defaultValue={selectedJob.warrantyClaim.invoiceNumber} name="invoiceNumber" />
                </label>
                <label className="workflow-field">
                  <span>Filed With Carrier</span>
                  <input defaultValue={selectedJob.warrantyClaim.dateFiledWithCarrier} name="dateFiledWithCarrier" />
                </label>
                <label className="workflow-field is-wide">
                  <span>Problem Description</span>
                  <textarea defaultValue={selectedJob.warrantyClaim.problemDescription} name="problemDescription" rows={3} />
                </label>
                <label className="workflow-field is-wide">
                  <span>Action Taken</span>
                  <textarea defaultValue={selectedJob.warrantyClaim.actionTaken} name="actionTaken" rows={3} />
                </label>
                <label className="workflow-field is-wide">
                  <span>Reason For Delay</span>
                  <textarea defaultValue={selectedJob.warrantyClaim.reasonForDelay} name="reasonForDelay" rows={3} />
                </label>
              </div>
              <div className="workflow-actions">
                <button className="workflow-primary" disabled={isMutatingServiceDetail} type="submit">
                  Save Warranty Claim
                </button>
              </div>
            </form>
          </section>
        </div>
      );
      break;
    }
    case "warranty2": {
      workSubTabContent = (
        <div className="legacy-service-pane-grid is-split">
          <section className="legacy-service-pane-section">
            <div className="legacy-service-key-grid">
              <LabelValue label="Carrier #" value={selectedJob.warrantyClaim.carrierNumber} />
              <LabelValue label="Invoice Date" value={selectedJob.warrantyClaim.invoiceDate} />
              <LabelValue label="Invoice #" value={selectedJob.warrantyClaim.invoiceNumber} />
              <LabelValue label="Filed With Carrier" value={selectedJob.warrantyClaim.dateFiledWithCarrier} />
            </div>
            <div className="legacy-service-note-panel">
              <p>{selectedJob.warrantyClaim.actionTaken}</p>
            </div>
          </section>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Authorizations</h4>
              <span>{selectedJob.warrantyClaim.authorizations.length} entries</span>
            </div>
            <div className="legacy-service-charge-list">
              {selectedJob.warrantyClaim.authorizations.map((authorization, authorizationIndex) => (
                <div className="legacy-service-charge-row" key={`${selectedJob.id}-auth-${authorizationIndex}`}>
                  <span>Authorization {authorizationIndex + 1}</span>
                  <strong>{authorization}</strong>
                </div>
              ))}
            </div>
            <div className="legacy-service-note-panel">
              <p>{selectedJob.warrantyClaim.reasonForDelay}</p>
            </div>
          </section>
        </div>
      );
      break;
    }
    case "jobGeneral":
    default: {
      workSubTabContent = (
        <div className="legacy-service-pane-grid is-split">
          <section className="legacy-service-pane-section">
            <div className="legacy-service-key-grid">
              <LabelValue label="Unit" value={selectedJob.unitLabel} />
              <LabelValue label="Appliance" value={selectedJob.appliance} />
              <LabelValue label="Warranty" value={selectedJob.warranty} />
              <LabelValue label="Job Code" value={selectedJob.jobCode} />
              <LabelValue label="Technician" value={selectedJob.technician} />
              <LabelValue label="Job Total" value={formatWorkbenchCurrency(selectedJob.total)} />
            </div>
            <form
              className="workflow-form"
              key={`${selectedJob.id}-job-edit`}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);

                void props.onUpdateJob({
                  jobId: selectedJob.id,
                  title: readWorkbenchFormText(formData, "title"),
                  customerApproval: readWorkbenchFormText(formData, "customerApproval"),
                  status: readWorkbenchFormText(formData, "status"),
                  appliance: readWorkbenchFormText(formData, "appliance"),
                  description: readWorkbenchFormText(formData, "description"),
                  resolution: readWorkbenchFormText(formData, "resolution"),
                  recommendations: readWorkbenchFormText(formData, "recommendations"),
                  technician: readWorkbenchFormText(formData, "technician"),
                  laborRate: readWorkbenchFormText(formData, "laborRate"),
                  chargeBy: readWorkbenchFormText(formData, "chargeBy"),
                  rate: readWorkbenchFormNumber(formData, "rate"),
                  quantity: readWorkbenchFormNumber(formData, "quantity")
                });
              }}
            >
              <div className="workflow-grid">
                <label className="workflow-field">
                  <span>Title</span>
                  <input defaultValue={selectedJob.title} name="title" required />
                </label>
                <label className="workflow-field">
                  <span>Customer Approval</span>
                  <input defaultValue={selectedJob.customerApproval} name="customerApproval" required />
                </label>
                <label className="workflow-field">
                  <span>Status</span>
                  <input defaultValue={selectedJob.status} name="status" required />
                </label>
                <label className="workflow-field">
                  <span>Appliance</span>
                  <input defaultValue={selectedJob.appliance} name="appliance" required />
                </label>
                <label className="workflow-field">
                  <span>Technician</span>
                  <input defaultValue={selectedJob.technician} name="technician" required />
                </label>
                <label className="workflow-field">
                  <span>Labor Rate</span>
                  <input defaultValue={selectedJob.laborRate} name="laborRate" required />
                </label>
                <label className="workflow-field">
                  <span>Charge By</span>
                  <input defaultValue={selectedJob.chargeBy} name="chargeBy" required />
                </label>
                <label className="workflow-field">
                  <span>Rate</span>
                  <input defaultValue={selectedJob.rate} min="0" name="rate" step="0.01" type="number" />
                </label>
                <label className="workflow-field">
                  <span>Quantity</span>
                  <input defaultValue={selectedJob.quantity} min="0" name="quantity" step="0.1" type="number" />
                </label>
                <label className="workflow-field is-wide">
                  <span>Description</span>
                  <textarea defaultValue={selectedJob.description} name="description" rows={4} />
                </label>
                <label className="workflow-field is-wide">
                  <span>Resolution</span>
                  <textarea defaultValue={selectedJob.resolution} name="resolution" rows={4} />
                </label>
                <label className="workflow-field is-wide">
                  <span>Recommendations</span>
                  <textarea defaultValue={selectedJob.recommendations} name="recommendations" rows={4} />
                </label>
              </div>
              <div className="workflow-actions">
                <button className="workflow-primary" disabled={isMutatingServiceDetail} type="submit">
                  Save Job
                </button>
              </div>
            </form>
          </section>
        </div>
      );
      break;
    }
  }

  let paneContent: ReactNode;

  switch (activeTab) {
    case "units": {
      paneContent = (
        <>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Units On Repair Order</h4>
              <span>{model.units.length} linked unit{model.units.length === 1 ? "" : "s"}</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Stock #</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Year</th>
                    <th>VIN/HIN/Serial No.</th>
                    <th>Unit On Lot</th>
                  </tr>
                </thead>
                <tbody>
                  {model.units.map((unit) => (
                    <tr key={unit.id}>
                      <td>{unit.stockNumber}</td>
                      <td>{unit.make}</td>
                      <td>{unit.model}</td>
                      <td>{unit.year}</td>
                      <td>{unit.serialNumber}</td>
                      <td>{unit.onLot ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="legacy-service-unit-card-grid">
            {model.units.map((unit) => (
              <section className="legacy-service-pane-section" key={`${unit.id}-card`}>
                <div className="legacy-service-pane-header">
                  <h4>{unit.label}</h4>
                  <span>{unit.unitType}</span>
                </div>
                <div className="legacy-service-key-grid">
                  <LabelValue label="Location" value={unit.location} />
                  <LabelValue label="Hours In" value={unit.hoursIn} />
                  <LabelValue label="Hours Out" value={unit.hoursOut} />
                  <LabelValue label="Year" value={unit.year} />
                </div>
                <div className="legacy-service-note-panel">
                  <p>{unit.notes}</p>
                </div>
              </section>
            ))}
          </div>
        </>
      );
      break;
    }
    case "work": {
      paneContent = (
        <>
          <div className="legacy-service-work-layout">
            <div className="legacy-service-work-column">
              <section className="legacy-service-pane-section legacy-service-pane-section.is-table-heavy">
                <div className="legacy-service-pane-header">
                  <h4>{jobCollectionLabel}</h4>
                  <span>{model.jobs.length} jobs</span>
                </div>
                <div className="legacy-service-table-wrap">
                  <table className="legacy-service-table">
                    <thead>
                      <tr>
                        <th>Job #</th>
                        <th>Customer Approval</th>
                        <th>Status</th>
                        <th>Title</th>
                        <th>Unit</th>
                        <th>Warranty</th>
                        <th>Job Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.jobs.map((job, jobIndex) => (
                        <tr className={job.id === selectedJob.id ? "is-selected" : undefined} key={job.id}>
                          <td>{jobIndex + 1}</td>
                          <td>{job.customerApproval}</td>
                          <td>{job.status}</td>
                          <td>
                            <button className="legacy-service-table-button" onClick={() => setSelectedJobId(job.id)} type="button">
                              {job.title}
                            </button>
                          </td>
                          <td>{job.unitLabel}</td>
                          <td>{job.warranty}</td>
                          <td>{formatWorkbenchCurrency(job.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="legacy-service-pane-section legacy-service-pane-section.is-compact">
                <div className="legacy-service-pane-header">
                  <h4>Create Job</h4>
                  <span>Add a new service line to this {selectedServiceRow.orderType.toLowerCase()}</span>
                </div>
                <form
                  className="workflow-form"
                  key={`${selectedServiceRow.id}-create-job`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const formData = new FormData(form);

                    void props
                      .onCreateJob({
                        title: readWorkbenchFormText(formData, "title"),
                        unitLabel: readWorkbenchFormText(formData, "unitLabel"),
                        description: readWorkbenchFormText(formData, "description"),
                        technician: readWorkbenchFormText(formData, "technician")
                      })
                      .then((saved) => {
                        if (saved) {
                          form.reset();
                        }
                      });
                  }}
                >
                  <div className="workflow-grid">
                    <label className="workflow-field">
                      <span>Title</span>
                      <input name="title" placeholder="Job title" required />
                    </label>
                    <label className="workflow-field">
                      <span>Unit</span>
                      <input defaultValue={model.units[0]?.label ?? selectedServiceRow.model} name="unitLabel" placeholder="Unit label" required />
                    </label>
                    <label className="workflow-field">
                      <span>Technician</span>
                      <input defaultValue={selectedJob.technician} name="technician" placeholder="Assigned tech" required />
                    </label>
                    <label className="workflow-field is-wide">
                      <span>Description</span>
                      <textarea name="description" placeholder="Complaint or requested work" rows={3} />
                    </label>
                  </div>
                  <div className="workflow-actions">
                    <button className="workflow-primary" disabled={isMutatingServiceDetail} type="submit">
                      Create Job
                    </button>
                  </div>
                </form>
              </section>
            </div>
            <div className="legacy-service-work-column is-detail">
              <div className="legacy-service-work-subtabs" role="tablist" aria-label={`${recordLabel} job tabs`}>
                {serviceWorkSubTabs.map((tab) => (
                  <button
                    className={`legacy-service-work-subtab${activeWorkSubTab === tab.id ? " is-active" : ""}`}
                    key={tab.id}
                    onClick={() => setActiveWorkSubTab(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="legacy-service-work-detail-stack">{workSubTabContent}</div>
            </div>
          </div>
          <ServiceUtilityInlinePanel {...props} />
        </>
      );
      break;
    }
    case "communications": {
      paneContent = (
        <>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Open Follow Ups</h4>
              <span>{model.openFollowUps.length}</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Owner</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Type</th>
                    <th>Confirmed</th>
                    <th>Showed</th>
                    <th>Automated</th>
                  </tr>
                </thead>
                <tbody>
                  {model.openFollowUps.length > 0 ? (
                    model.openFollowUps.map((followUp, followUpIndex) => (
                      <tr key={`${selectedServiceRow.id}-open-follow-up-${followUpIndex}`}>
                        <td>{followUp.subject}</td>
                        <td>{followUp.owner}</td>
                        <td>{followUp.date}</td>
                        <td>{followUp.time}</td>
                        <td>{followUp.duration}</td>
                        <td>{followUp.type}</td>
                        <td>{followUp.confirmed}</td>
                        <td>{followUp.showed}</td>
                        <td>{followUp.automated}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>No open follow ups on this repair order.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Closed Follow Ups</h4>
              <span>{model.closedFollowUps.length}</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Owner</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {model.closedFollowUps.length > 0 ? (
                    model.closedFollowUps.map((followUp, followUpIndex) => (
                      <tr key={`${selectedServiceRow.id}-closed-follow-up-${followUpIndex}`}>
                        <td>{followUp.subject}</td>
                        <td>{followUp.owner}</td>
                        <td>{followUp.date}</td>
                        <td>{followUp.time}</td>
                        <td>{followUp.type}</td>
                        <td>{followUp.notes}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No closed follow ups recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      );
      break;
    }
    case "laborCloseout": {
      paneContent = (
        <>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Labor Closeout</h4>
              <span>{model.laborCloseout.length} closeout row{model.laborCloseout.length === 1 ? "" : "s"}</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Job Code</th>
                    <th>Description</th>
                    <th>Charge</th>
                    <th>Actual</th>
                    <th>Credited</th>
                    <th>Closed Date</th>
                    <th>Completed By</th>
                  </tr>
                </thead>
                <tbody>
                  {model.laborCloseout.map((line) => (
                    <tr key={`${line.jobCode}-${line.technician}`}>
                      <td>{line.technician}</td>
                      <td>{line.jobCode}</td>
                      <td>{line.description}</td>
                      <td>{line.quantity}</td>
                      <td>{line.laborRate}</td>
                      <td>{line.chargeBy}</td>
                      <td>{line.closedDate || "-"}</td>
                      <td>{line.completedBy || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Labor Sessions</h4>
              <span>{model.laborSessions.length} active sessions</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Start Date</th>
                    <th>Start Time</th>
                    <th>End Date</th>
                    <th>End Time</th>
                    <th>Actual Hrs</th>
                    <th>Credited Hrs</th>
                    <th>Override</th>
                  </tr>
                </thead>
                <tbody>
                  {model.laborSessions.map((session, sessionIndex) => (
                    <tr key={`${selectedServiceRow.id}-labor-session-${sessionIndex}`}>
                      <td>{session.technician}</td>
                      <td>{session.startDate}</td>
                      <td>{session.startTime}</td>
                      <td>{session.endDate}</td>
                      <td>{session.endTime}</td>
                      <td>{session.actualHours}</td>
                      <td>{session.creditedHours}</td>
                      <td>{session.override}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      );
      break;
    }
    case "deposits": {
      paneContent = (
        <div className="legacy-service-pane-grid is-split">
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>RO Deposits</h4>
              <span>{model.deposits.length} entry{model.deposits.length === 1 ? "" : "s"}</span>
            </div>
            <div className="legacy-service-table-wrap">
              <table className="legacy-service-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Cashier</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Payment Date</th>
                    <th>Cancel Date</th>
                  </tr>
                </thead>
                <tbody>
                  {model.deposits.length > 0 ? (
                    model.deposits.map((deposit) => (
                      <tr key={`${selectedServiceRow.id}-${deposit.invoiceNumber}`}>
                        <td>{deposit.invoiceNumber}</td>
                        <td>{deposit.date}</td>
                        <td>{deposit.cashier}</td>
                        <td>{deposit.description}</td>
                        <td>{formatWorkbenchCurrency(deposit.amount)}</td>
                        <td>{deposit.paymentDate || "-"}</td>
                        <td>{deposit.cancelDate || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No deposit has been recorded on this repair order yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="legacy-service-pane-section">
            <div className="legacy-service-pane-header">
              <h4>Payment Request</h4>
              <span>{model.deposits.length > 0 ? "Cashiered" : "Pending"}</span>
            </div>
            <div className="legacy-service-charge-list">
              <div className="legacy-service-charge-row">
                <span>Method of payment</span>
                <strong>{model.deposits.length > 0 ? "Cash" : "Click to pay"}</strong>
              </div>
              <div className="legacy-service-charge-row">
                <span>Amount requested</span>
                <strong>{formatWorkbenchCurrency(model.deposits[0]?.amount ?? model.totals.totalDue)}</strong>
              </div>
              <div className="legacy-service-charge-row">
                <span>Card on file</span>
                <strong>{model.deposits.length > 0 ? "On file" : "None"}</strong>
              </div>
            </div>
          </section>
        </div>
      );
      break;
    }
    case "attachments": {
      paneContent = (
        <>
          <div className="legacy-service-attachment-grid">
            {model.attachments.map((attachment) => (
              <article className="legacy-service-attachment-card" key={`${selectedServiceRow.id}-${attachment.name}`}>
                <strong>{attachment.name}</strong>
                <span>{attachment.kind}</span>
                <span>
                  {attachment.visibility} -+ {attachment.status}
                </span>
                <span>
                  {attachment.createdBy} -+ {attachment.createdTime}
                </span>
              </article>
            ))}
          </div>
          <div className="legacy-service-footer-actions">
            <button className="legacy-task-status-button" type="button">
              Attach File
            </button>
          </div>
        </>
      );
      break;
    }
    case "history": {
      paneContent = (
        <section className="legacy-service-pane-section">
          <div className="legacy-service-table-wrap">
            <table className="legacy-service-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>User</th>
                  <th>Detail</th>
                  <th>Old Value</th>
                  <th>New Value</th>
                </tr>
              </thead>
              <tbody>
                {model.history.map((line, lineIndex) => (
                  <tr key={`${selectedServiceRow.id}-history-${lineIndex}`}>
                    <td>{line.date}</td>
                    <td>{line.event}</td>
                    <td>{line.user}</td>
                    <td>{line.detail}</td>
                    <td>{line.oldValue}</td>
                    <td>{line.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
      break;
    }
    case "esignature": {
      paneContent = model.signatureDocs.length > 0 ? (
        <section className="legacy-service-pane-section">
          <div className="legacy-service-table-wrap">
            <table className="legacy-service-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Created By</th>
                  <th>Created Time</th>
                  <th>Completed Time</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Dealer 1</th>
                  <th>Dealer 2</th>
                  <th>Dealer 3</th>
                  <th>Dealer 4</th>
                </tr>
              </thead>
              <tbody>
                {model.signatureDocs.map((doc, docIndex) => (
                  <tr key={`${selectedServiceRow.id}-signature-${docIndex}`}>
                    <td>{doc.description}</td>
                    <td>{doc.createdBy}</td>
                    <td>{doc.createdTime}</td>
                    <td>{doc.completedTime}</td>
                    <td>{doc.status}</td>
                    <td>{doc.customer}</td>
                    <td>{doc.dealer1}</td>
                    <td>{doc.dealer2}</td>
                    <td>{doc.dealer3}</td>
                    <td>{doc.dealer4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="legacy-service-pane-section">
          <p className="legacy-audit-empty-state">No eSignature documents are active for this repair order.</p>
        </section>
      );
      break;
    }
    case "general":
    default: {
      paneContent = (
        <>
          {isEstimate ? (
            <section className="legacy-service-pane-section">
              <div className="legacy-service-note-panel">
                <strong>Estimate Stage</strong>
                <p>Labor closeout, deposits, and eSignature stay hidden until this estimate is promoted to a repair order.</p>
              </div>
            </section>
          ) : null}
          <div className="legacy-service-general-layout">
            <div className="legacy-service-general-column">
              <section className="legacy-service-pane-section legacy-service-pane-section.is-compact">
                <div className="legacy-service-overview-grid">
                  <div>
                    <h4>Sold To</h4>
                    <div className="legacy-service-address">
                      <strong>{selectedServiceRow.customerName.toUpperCase()}</strong>
                      {model.customerAddress.map((line) => (
                        <span key={`${selectedServiceRow.id}-${line}`}>{line}</span>
                      ))}
                    </div>
                  </div>
                  <div className="legacy-service-key-grid legacy-service-key-grid.is-compact">
                    <LabelValue label="Service Writer" value={selectedServiceRow.serviceWriter} />
                    <LabelValue label="Category" value={selectedServiceRow.category} />
                    <LabelValue label="In Date" value={selectedServiceRow.inDate} />
                    <LabelValue label="PO #" value={model.purchaseOrder} />
                    <LabelValue label="Promised Date" value={model.promisedDate} />
                    <LabelValue label="Closed Date" value={model.closedDate || "-"} />
                  </div>
                </div>
                <div className="legacy-service-key-grid legacy-service-key-grid.is-compact">
                  <LabelValue label="Home Phone" value={model.homePhone} />
                  <LabelValue label="Work Phone" value={model.workPhone} />
                  <LabelValue label="Cell Phone" value={model.cellPhone} />
                  <LabelValue label="Email" value={model.email} />
                  <LabelValue label="Customer No." value={model.customerNo} />
                  <LabelValue label="Setup Date" value={model.setupDate} />
                </div>
              </section>

              <section className="legacy-service-pane-section legacy-service-pane-section.is-table-heavy">
                <div className="legacy-service-pane-header">
                  <h4>{jobCollectionLabel}</h4>
                  <span>{model.jobs.length} open lines</span>
                </div>
                <div className="legacy-service-table-wrap">
                  <table className="legacy-service-table">
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Title</th>
                        <th>Customer Approval</th>
                        <th>Status</th>
                        <th>Parts</th>
                        <th>Labor</th>
                        <th>Sublet</th>
                        <th>Job Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.jobs.map((job) => (
                        <tr key={`${selectedServiceRow.id}-${job.id}`}>
                          <td>{job.unitLabel}</td>
                          <td>{job.title}</td>
                          <td>{job.customerApproval}</td>
                          <td>{job.status}</td>
                          <td>{formatWorkbenchCurrency(job.parts.reduce((total, part) => total + part.price * part.quantity, 0))}</td>
                          <td>{formatWorkbenchCurrency(job.laborLines.reduce((total, line) => total + line.total, 0))}</td>
                          <td>{formatWorkbenchCurrency(job.subletLines.reduce((total, line) => total + line.price, 0))}</td>
                          <td>{formatWorkbenchCurrency(job.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="legacy-service-general-column">
              <section className="legacy-service-pane-section legacy-service-pane-section.is-compact">
                <div className="legacy-service-pane-header">
                  <h4>Operator Notes</h4>
                  <span>{recordLabel}</span>
                </div>
                <div className="legacy-service-pane-grid">
                  <div className="legacy-service-note-panel">
                    <strong>Notes</strong>
                    <p>{model.notes}</p>
                  </div>
                  <div className="legacy-service-note-panel">
                    <strong>Transfer Notes</strong>
                    <p>{model.transferNotes}</p>
                  </div>
                </div>
              </section>

              <section className="legacy-service-pane-section legacy-service-pane-section.is-compact">
                <div className="legacy-service-pane-header">
                  <h4>Financial Summary</h4>
                  <span>{model.totals.saleType}</span>
                </div>
                <div className="legacy-service-financial-grid">
                  <div className="legacy-service-charge-list">
                    <div className="legacy-service-charge-row">
                      <span>{totalSummaryLabel}</span>
                      <strong>{formatWorkbenchCurrency(totalSummaryValue)}</strong>
                    </div>
                    <div className="legacy-service-charge-row">
                      <span>Loyalty Points</span>
                      <strong>{model.loyaltyPoints}</strong>
                    </div>
                    {model.miscCharges.map((charge) => (
                      <div className="legacy-service-charge-row" key={`${selectedServiceRow.id}-${charge.label}`}>
                        <span>
                          {charge.label}
                          {charge.auto ? " -+ Auto" : ""}
                        </span>
                        <strong>{formatWorkbenchCurrency(charge.amount)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="legacy-service-charge-list">
                    <div className="legacy-service-charge-row">
                      <span>Parts</span>
                      <strong>{formatWorkbenchCurrency(model.totals.parts)}</strong>
                    </div>
                    <div className="legacy-service-charge-row">
                      <span>Labor</span>
                      <strong>{formatWorkbenchCurrency(model.totals.labor)}</strong>
                    </div>
                    <div className="legacy-service-charge-row">
                      <span>Sublet</span>
                      <strong>{formatWorkbenchCurrency(model.totals.sublet)}</strong>
                    </div>
                    <div className="legacy-service-charge-row">
                      <span>Misc.</span>
                      <strong>{formatWorkbenchCurrency(model.totals.misc)}</strong>
                    </div>
                    <div className="legacy-service-charge-row">
                      <span>Before Tax</span>
                      <strong>{formatWorkbenchCurrency(model.totals.beforeTax)}</strong>
                    </div>
                    <div className="legacy-service-charge-row">
                      <span>Sales Tax</span>
                      <strong>{formatWorkbenchCurrency(model.totals.salesTax)}</strong>
                    </div>
                    <div className="legacy-service-charge-row is-total">
                      <span>Total</span>
                      <strong>{formatWorkbenchCurrency(model.totals.total)}</strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      );
      break;
    }
  }

  return (
    <section className="legacy-info-card legacy-service-workbench">
      <div className="legacy-service-workbench-header">
        <div className="legacy-service-workbench-title">
          <div>
            <h3>
              {recordLabel} #{model.roNumber}
            </h3>
            <p>
              {selectedServiceRow.customerName} -+ {selectedServiceRow.maker} {selectedServiceRow.model}
            </p>
          </div>
          <div className="legacy-service-header-pill-row">
            <span className="legacy-service-header-pill is-muted">{selectedServiceRow.orderType}</span>
            <span className="legacy-service-header-pill is-alert">{selectedServiceRow.roStatus}</span>
            <span className="legacy-service-header-pill is-muted">{selectedServiceRow.category}</span>
            <span className="legacy-service-header-pill is-success">{selectedServiceRow.serviceWriter}</span>
          </div>
        </div>
        <div className="legacy-service-key-grid">
          <LabelValue label={orderNumberLabel} value={selectedServiceRow.roNumber} />
          <LabelValue label="Stock #" value={selectedServiceRow.stockNumber} />
          <LabelValue label="Maker" value={selectedServiceRow.maker} />
          <LabelValue label="Model" value={selectedServiceRow.model} />
          <LabelValue label="In Date" value={selectedServiceRow.inDate} />
          <LabelValue label={totalSummaryLabel} value={formatWorkbenchCurrency(totalSummaryValue)} />
        </div>
      </div>
      <div className="legacy-service-footer-actions">
        <button
          className="legacy-task-status-button"
          disabled={isMutatingServiceDetail}
          onClick={() => {
            void props.onUpdateOrderType(orderTypeToggleTarget);
          }}
          type="button"
        >
          Convert To {orderTypeToggleTarget}
        </button>
      </div>
      <div className="legacy-service-workbench-tabs" role="tablist" aria-label={`${recordLabel} tabs`}>
        {visibleWorkbenchTabs.map((tab) => (
          <button
            className={`legacy-service-workbench-tab${activeTab === tab.id ? " is-active" : ""}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="legacy-service-pane">{paneContent}</div>
    </section>
  );
}

interface ServiceUtilityInlinePanelProps {
  entries: TaskQueueEntry[];
  activityEntries: CommandLogEntry[];
  cleaningQaRoNumber: string | null;
  focusedTaskId: string | null;
  isFilteredByOperator: boolean;
  onAddTaskNote: (taskId: string, body: string, kind: TaskNoteKind) => Promise<boolean>;
  onAssignTask: (taskId: string, assigneeUserId: string | null) => void;
  onCleanupQaTasks: (roNumber: string) => Promise<boolean>;
  onReturnToAuditCleanup: (() => void) | null;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  operators: StoreOperatorOption[];
  returnToAuditContext: ServiceAuditReturnContext | null;
  selectedServiceRow: ServiceWorkspaceRow | null;
  updatingTaskId: string | null;
}

function ServiceUtilityInlinePanel({
  entries,
  activityEntries,
  cleaningQaRoNumber,
  focusedTaskId,
  isFilteredByOperator,
  onAddTaskNote,
  onAssignTask,
  onCleanupQaTasks,
  onReturnToAuditCleanup,
  onUpdateStatus,
  operators,
  returnToAuditContext,
  selectedServiceRow,
  updatingTaskId
}: ServiceUtilityInlinePanelProps) {
  const [handoffSelections, setHandoffSelections] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const focusedTaskRef = useRef<HTMLElement | null>(null);
  const relatedEntries = selectedServiceRow
    ? entries.filter(
        (entry) => inlineServiceUtilityActions.has(entry.action) && entry.detail.startsWith(`${selectedServiceRow.roNumber} -+`)
      )
    : [];
  const qaEntries = relatedEntries.filter(isServiceUtilityQaTask);
  const focusedEntry = focusedTaskId ? relatedEntries.find((entry) => entry.id === focusedTaskId) ?? null : null;
  const isCleanupPending = Boolean(selectedServiceRow && cleaningQaRoNumber === selectedServiceRow.roNumber);
  const isTaskMutationPending = Boolean(updatingTaskId) || isCleanupPending;

  useEffect(() => {
    if (focusedEntry && focusedTaskRef.current) {
      focusedTaskRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [focusedEntry]);

  return (
    <section className="legacy-info-card legacy-service-task-panel">
      <div className="legacy-command-log-header">
        <div>
          <h3>Service Utility Queue</h3>
          <span>{selectedServiceRow ? `RO ${selectedServiceRow.roNumber}` : "Select an RO"}</span>
        </div>
        <div className="legacy-service-task-toolbar">
          {returnToAuditContext && onReturnToAuditCleanup ? (
            <button className="legacy-task-status-button" onClick={onReturnToAuditCleanup} type="button">
              {returnToAuditContext.label}
            </button>
          ) : null}
          {selectedServiceRow && qaEntries.length > 0 ? (
            <>
              <span className="legacy-command-meta">{qaEntries.length} demo QA task{qaEntries.length === 1 ? "" : "s"}</span>
              <button
                className="legacy-task-status-button"
                disabled={isTaskMutationPending}
                onClick={() => {
                  void onCleanupQaTasks(selectedServiceRow.roNumber);
                }}
                type="button"
              >
                {isCleanupPending ? "Cleaning..." : "Clean demo QA"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {returnToAuditContext ? <span className="legacy-command-meta legacy-service-return-meta">{returnToAuditContext.subtitle}</span> : null}
      {focusedEntry ? (
        <div className="legacy-service-task-focus">
          <strong>Focused task</strong>
          <span className="legacy-command-meta">
            {focusedEntry.action} -+ {focusedEntry.status} -+ {focusedEntry.timeLabel}
          </span>
        </div>
      ) : null}

      {!selectedServiceRow ? (
        <p className="legacy-audit-empty-state">Select an RO row to work Duplicate, Print, Report, and Detail tasks inline.</p>
      ) : relatedEntries.length === 0 ? (
        <p className="legacy-audit-empty-state">
          {isFilteredByOperator
            ? "No inline utility tasks match the current operator filter for this RO."
            : "No Duplicate, Print, Report, or Detail tasks are tied to this RO yet."}
        </p>
      ) : (
        <div className="legacy-service-task-stack">
          {relatedEntries.map((entry) => (
            <article
              className={`legacy-service-task-line tone-${entry.tone}${entry.id === focusedTaskId ? " is-focused" : ""}`}
              key={entry.id}
              ref={entry.id === focusedTaskId ? focusedTaskRef : undefined}
            >
              {buildServiceUtilityTaskBadges(entry, activityEntries).length > 0 ? (
                <div className="legacy-service-task-badge-row">
                  {buildServiceUtilityTaskBadges(entry, activityEntries).map((badge, badgeIndex) => (
                    <span className={`legacy-service-task-badge${badge.tone ? ` tone-${badge.tone}` : ""}`} key={`${entry.id}-${badge.label}-${badgeIndex}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="legacy-service-task-copy">
                <div className="legacy-command-log-header">
                  <strong>{entry.action}</strong>
                  <span className="legacy-command-time">{entry.status}</span>
                </div>
                <p>{entry.detail}</p>
                <span className="legacy-command-meta">
                  Owner {entry.assignedName} -+ Updated by {entry.lastUpdatedByName} -+ {entry.timeLabel}
                </span>
                <span className={`legacy-command-meta${entry.isOverdue ? " is-overdue" : ""}`}>
                  Age {entry.ageLabel} -+ SLA {entry.slaLabel} -+ {entry.breachLabel}
                </span>
                {entry.latestCommentPreview ? <span className="legacy-command-meta">Latest note: {entry.latestCommentPreview}</span> : null}
                {entry.resolutionNote ? <span className="legacy-command-meta">Resolution: {entry.resolutionNote}</span> : null}
                {updatingTaskId === entry.id ? <span className="legacy-command-meta">Updating task status...</span> : null}
                {isCleanupPending ? <span className="legacy-command-meta">Removing demo QA tasks for this RO...</span> : null}
                {entry.notes.length > 0 ? (
                  <div className="legacy-task-note-list">
                    {entry.notes.map((note) => (
                      <article className="legacy-task-note-line" key={note.id}>
                        <strong>{note.kind}</strong>
                        <p>{note.body}</p>
                        <span className="legacy-command-meta">
                          {note.authorName} -+ {note.timeLabel}
                        </span>
                      </article>
                    ))}
                  </div>
                ) : null}
                <div className="legacy-task-note-composer">
                  <textarea
                    aria-label={`Inline task note for ${entry.action}`}
                    className="legacy-task-note-input"
                    disabled={isTaskMutationPending}
                    onChange={(event) =>
                      setNoteDrafts((current) => ({
                        ...current,
                        [entry.id]: event.target.value
                      }))
                    }
                    placeholder="Add inline notes or resolve this utility task"
                    rows={2}
                    value={noteDrafts[entry.id] ?? ""}
                  />
                  <div className="legacy-task-status-actions">
                    <button
                      className="legacy-task-status-button"
                      disabled={isTaskMutationPending || !(noteDrafts[entry.id] ?? "").trim()}
                      onClick={() => {
                        void onAddTaskNote(entry.id, (noteDrafts[entry.id] ?? "").trim(), "Comment").then((saved) => {
                          if (saved) {
                            setNoteDrafts((current) => ({
                              ...current,
                              [entry.id]: ""
                            }));
                          }
                        });
                      }}
                      type="button"
                    >
                      Add note
                    </button>
                    <button
                      className="legacy-task-status-button"
                      disabled={isTaskMutationPending || !(noteDrafts[entry.id] ?? "").trim()}
                      onClick={() => {
                        void onAddTaskNote(entry.id, (noteDrafts[entry.id] ?? "").trim(), "Resolution").then((saved) => {
                          if (saved) {
                            setNoteDrafts((current) => ({
                              ...current,
                              [entry.id]: ""
                            }));
                          }
                        });
                      }}
                      type="button"
                    >
                      {entry.status === "Done" ? "Update resolution" : "Resolve"}
                    </button>
                  </div>
                </div>
                <div className="legacy-task-handoff-row">
                  <select
                    aria-label={`Inline assign ${entry.action}`}
                    className="legacy-task-assignee-select"
                    disabled={isTaskMutationPending}
                    onChange={(event) =>
                      setHandoffSelections((current) => ({
                        ...current,
                        [entry.id]: event.target.value
                      }))
                    }
                    value={handoffSelections[entry.id] ?? entry.assignedUserId ?? ""}
                  >
                    <option value="">Unassigned</option>
                    {operators.map((operator) => (
                      <option key={operator.id} value={operator.id}>
                        {operator.name} -+ {operator.title}
                      </option>
                    ))}
                  </select>
                  <button
                    className="legacy-task-status-button"
                    disabled={isTaskMutationPending || (handoffSelections[entry.id] ?? entry.assignedUserId ?? "") === (entry.assignedUserId ?? "")}
                    onClick={() => onAssignTask(entry.id, (handoffSelections[entry.id] ?? entry.assignedUserId ?? "") || null)}
                    type="button"
                  >
                    Hand off
                  </button>
                </div>
              </div>
              <div className="legacy-task-status-actions">
                {getTaskStatusActions(entry.status).map((action) => (
                  <button
                    className="legacy-task-status-button"
                    disabled={isTaskMutationPending}
                    key={`${entry.id}-${action.status}`}
                    onClick={() => onUpdateStatus(entry.id, action.status)}
                    type="button"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function buildServiceRepairWorkbenchModel(row: ServiceWorkspaceRow, entries: TaskQueueEntry[], activityEntries: CommandLogEntry[]): ServiceWorkbenchModel {
  const seed = resolveServiceSeed(row.roNumber);
  const units = buildServiceWorkbenchUnits(row, seed);
  const jobs = buildServiceWorkbenchJobs(row, units, seed);
  const parts = jobs.flatMap((job) => job.parts);
  const laborLines = jobs.flatMap((job) => job.laborLines);
  const subletLines = jobs.flatMap((job) => job.subletLines);
  const partsTotal = roundWorkbenchCurrency(parts.reduce((total, part) => total + part.price * part.quantity, 0));
  const laborTotal = roundWorkbenchCurrency(laborLines.reduce((total, line) => total + line.total, 0));
  const subletTotal = roundWorkbenchCurrency(subletLines.reduce((total, line) => total + line.price, 0));
  const miscCharges = buildServiceWorkbenchMiscCharges(row, seed);
  const miscTotal = roundWorkbenchCurrency(miscCharges.reduce((total, charge) => total + charge.amount, 0));
  const beforeTax = roundWorkbenchCurrency(partsTotal + laborTotal + subletTotal + miscTotal);
  const salesTax = roundWorkbenchCurrency(partsTotal * 0.0825);
  const total = roundWorkbenchCurrency(beforeTax + salesTax);
  const totalDue = roundWorkbenchCurrency(row.roStatus === "Ready to Cash" ? total : total * 0.35);
  const history = buildServiceWorkbenchHistory(row, entries, activityEntries);
  const promisedDate = shiftUsDate(row.inDate, row.roStatus === "Ready to Cash" ? 1 : row.roStatus === "In Progress" ? 2 : 4);
  const closedDate = row.roStatus === "Ready to Cash" ? shiftUsDate(row.inDate, 4) : "";
  const notes = `Customer reports ${lowercaseSentence(row.note)}. Verify ${row.category.toLowerCase()} blockers, document all work under RO ${row.roNumber}, and keep ${row.serviceWriter} informed before any customer update.`;
  const transferNotes = `Move ${row.stockNumber} through the ${row.category.toLowerCase()} lane only after parts and labor are posted. Route final release back to ${row.serviceWriter} for customer contact.`;
  const openFollowUps = [
    {
      subject: `${row.roStatus} update`,
      owner: row.serviceWriter,
      date: promisedDate,
      time: "12:10 PM",
      duration: "5 min",
      type: row.roStatus === "Ready to Cash" ? "Pickup" : "Call",
      confirmed: row.roStatus === "Ready to Cash" ? "Yes" : "Pending",
      showed: row.roStatus === "Ready to Cash" ? "Yes" : "-",
      automated: "No",
      notes: `Reach back out once ${row.category.toLowerCase()} clears.`
    }
  ].filter((followUp) => row.roStatus !== "Clocked Out" || followUp.type === "Pickup");
  const closedFollowUps = history.slice(0, 3).map((line) => ({
    subject: line.event,
    owner: line.user,
    date: row.inDate,
    time: line.date.includes("-+") ? line.date.split("-+")[1]?.trim() ?? "11:15 AM" : "11:15 AM",
    duration: "5 min",
    type: "Note",
    confirmed: "Yes",
    showed: "Yes",
    automated: "No",
    notes: line.detail
  }));
  const deposits =
    row.roStatus === "Ready to Cash"
      ? [
          {
            invoiceNumber: `INV-${row.roNumber}`,
            date: shiftUsDate(row.inDate, 4),
            cashier: "Miles May",
            description: `RO ${row.roNumber} final payment`,
            amount: totalDue,
            paymentDate: shiftUsDate(row.inDate, 4),
            cancelDate: ""
          }
        ]
      : [];
  const attachments = buildServiceWorkbenchAttachments(row, entries);
  const signatureDocs = buildServiceWorkbenchSignatureDocs(row, total);

  return {
    roNumber: row.roNumber,
    customerAddress: buildServiceCustomerAddress(seed),
    homePhone: buildServicePhone(seed),
    workPhone: buildServicePhone(seed + 11),
    cellPhone: buildServicePhone(seed + 21),
    email: buildServiceEmail(row.customerName),
    customerNo: `${seed}${(seed % 97).toString().padStart(2, "0")}`,
    setupDate: shiftUsDate(row.inDate, -21),
    loyaltyPoints: `${(seed % 7) * 50}`,
    promisedDate,
    closedDate,
    purchaseOrder: `PO-${row.roNumber}`,
    jobs,
    units,
    notes,
    transferNotes,
    miscCharges,
    totals: {
      parts: partsTotal,
      labor: laborTotal,
      sublet: subletTotal,
      misc: miscTotal,
      beforeTax,
      salesTax,
      total,
      totalDue,
      saleType: "CUSTOMER - TAXABLE"
    },
    openFollowUps,
    closedFollowUps,
    laborCloseout: laborLines,
    laborSessions: buildServiceWorkbenchLaborSessions(row, jobs, seed),
    deposits,
    attachments,
    history,
    signatureDocs
  };
}

function resolveServiceSeed(roNumber: string) {
  const seed = Number.parseInt(roNumber.replace(/\D/g, ""), 10);
  return Number.isFinite(seed) && seed > 0 ? seed : 1;
}

function roundWorkbenchCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatWorkbenchCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function shiftUsDate(value: string, days: number) {
  const parts = value.split("/").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return value;
  }

  const [month, day, year] = parts;
  const date = new Date(year, month - 1, day + days);

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

function lowercaseSentence(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function buildServiceCustomerAddress(seed: number) {
  const streets = ["Coral Lane", "Bayfront Drive", "Harbor Trace", "Anchor Point", "Pelican Bend"];
  const cities = [
    "Wimberley, Texas 78676",
    "Sarasota, Florida 34231",
    "St. Petersburg, Florida 33712",
    "Charleston, South Carolina 29412",
    "Naples, Florida 34102"
  ];
  const streetNumber = 100 + (seed % 700);

  return [`${streetNumber} ${streets[seed % streets.length]}`, cities[seed % cities.length]];
}

function buildServicePhone(seed: number) {
  const suffix = (seed % 10000).toString().padStart(4, "0");
  const middle = (500 + (seed % 400)).toString();

  return `512-${middle}-${suffix}`;
}

function buildServiceEmail(customerName: string) {
  const normalized = customerName
    .replace(/[^a-z0-9]+/gi, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();

  return `${normalized}@customer.mail`;
}

function resolveServiceTechnicians(serviceWriter: string) {
  if (serviceWriter.includes("Patrick")) {
    return ["Erik Williams", "James Hampton"];
  }

  if (serviceWriter.includes("Dustin")) {
    return ["Dylan Henrikson", "Yard Tech"];
  }

  return ["Ernest Saenz", "Corporate Use Only"];
}

function buildServiceWorkbenchUnits(row: ServiceWorkspaceRow, seed: number): ServiceWorkbenchUnit[] {
  const primaryYear = (2026 - (seed % 4)).toString();
  const engineByMaker: Record<string, string> = {
    PARKER: "Mercury 300 Verado",
    TIDEWATER: "Yamaha F300XB",
    HEWES: "Yamaha VF250XB",
    AVALON: "Mercury 250L",
    NAUTICSTAR: "Yamaha F225XB",
    PURSUIT: "Yamaha F350",
    "SEA HUNT": "Yamaha F250XB"
  };
  const secondaryRig = engineByMaker[row.maker.toUpperCase()] ?? "Mercury 250L";
  const [secondaryMake, ...secondaryModelParts] = secondaryRig.split(" ");

  return [
    {
      id: `${row.id}-unit-primary`,
      label: `${primaryYear}, ${row.maker} ${row.model}`,
      stockNumber: row.stockNumber,
      make: row.maker,
      model: row.model,
      year: primaryYear,
      serialNumber: `${row.stockNumber}-${(seed % 97).toString().padStart(2, "0")}`,
      unitType: "Boat",
      location: row.stockNumber,
      hoursIn: `${seed % 40}`,
      hoursOut: `${Math.max(seed % 40, row.roStatus === "Ready to Cash" ? seed % 40 : 0)}`,
      notes: `Primary hull intake tied to ${row.category.toLowerCase()} routing for ${row.serviceWriter}.`,
      onLot: row.roStatus !== "Clocked Out"
    },
    {
      id: `${row.id}-unit-secondary`,
      label: `${primaryYear}, ${secondaryRig}`,
      stockNumber: `ENG-${(seed % 900).toString().padStart(3, "0")}`,
      make: secondaryMake,
      model: secondaryModelParts.join(" "),
      year: primaryYear,
      serialNumber: `${row.stockNumber}-P${(seed % 31).toString().padStart(2, "0")}`,
      unitType: "Outboard",
      location: row.stockNumber,
      hoursIn: `${seed % 18}`,
      hoursOut: `${row.roStatus === "Ready to Cash" ? seed % 18 : 0}`,
      notes: `Power package linked to ${row.maker} ${row.model}; verify rigging before delivery.`,
      onLot: true
    }
  ];
}

function buildServiceWorkbenchJobs(row: ServiceWorkspaceRow, units: ServiceWorkbenchUnit[], seed: number): ServiceWorkbenchJob[] {
  const technicians = resolveServiceTechnicians(row.serviceWriter);
  const primaryParts = buildServiceWorkbenchParts(row, seed, "primary");
  const supportParts = buildServiceWorkbenchParts(row, seed, "support");
  const releaseParts = buildServiceWorkbenchParts(row, seed, "release");
  const isWarranty = row.category.toLowerCase().includes("warranty");
  const closedDate = row.roStatus === "Ready to Cash" ? shiftUsDate(row.inDate, 4) : "";
  const primaryQuantity = row.roStatus === "Ready to Cash" ? 5 : row.roStatus === "Ready to Work" ? 3 : row.roStatus === "In Progress" ? 2 : 1;
  const secondaryQuantity = row.roStatus === "Not Started" ? 1 : 2;
  const releaseQuantity = row.roStatus === "Ready to Cash" ? 1.5 : 0.5;

  return [
    buildServiceWorkbenchJob({
      row,
      seed,
      index: 1,
      title: buildServicePrimaryJobTitle(row),
      unitLabel: units[0]?.label ?? row.model,
      customerApproval: "Approved",
      status: row.category === "Parts Hold" ? "Not Ready - Waiting on parts" : row.roStatus,
      warranty: isWarranty ? row.maker : "-",
      appliance: "None",
      description: row.note,
      resolution:
        row.roStatus === "Ready to Cash"
          ? `Primary repair verified; ${row.maker} ${row.model} is ready for customer pickup.`
          : `Hold the unit in ${row.category.toLowerCase()} until the primary concern is cleared and documented.`,
      recommendations: `Complete the main repair, confirm ${row.serviceWriter} follow-up, and attach the final RO jacket before release.`,
      technician: technicians[0],
      quantity: primaryQuantity,
      rate: 139 + (seed % 3) * 15,
      laborRate: isWarranty ? "Warranty" : "FPC - RETAIL",
      parts: primaryParts,
      subletLines: [],
      closedDate,
      completedBy: row.roStatus === "Ready to Cash" ? technicians[0] : "",
      techNotes: `Capture intake photos, confirm ${lowercaseSentence(row.note)}, and update the writer if parts availability changes.`,
      warrantyClaim: buildServiceWorkbenchWarrantyClaim(row, seed, primaryParts[0]?.partNumber ?? "", isWarranty)
    }),
    buildServiceWorkbenchJob({
      row,
      seed,
      index: 2,
      title: buildServiceSupportJobTitle(row),
      unitLabel: units[1]?.label ?? units[0]?.label ?? row.model,
      customerApproval: "Approved",
      status: row.roStatus === "Ready to Cash" ? "Ready to Cashier" : "No Activity",
      warranty: isWarranty ? row.maker : "-",
      appliance: row.category,
      description: `Support ${row.category.toLowerCase()} routing and confirm accessory fitment before customer contact.`,
      resolution: `Support line will clear once parts, attachments, and final labor are posted to the RO.`,
      recommendations: `Keep accessory and rigging documentation together so the cashier can close the order without reopening the packet.`,
      technician: technicians[1],
      quantity: secondaryQuantity,
      rate: 119 + (seed % 2) * 10,
      laborRate: "Customer Pay - Retail Hourly",
      parts: supportParts,
      subletLines: row.category === "Rig for Sale" ? buildServiceWorkbenchSubletLines(row, seed) : [],
      closedDate,
      completedBy: row.roStatus === "Ready to Cash" ? technicians[1] : "",
      techNotes: `Verify serial numbers, attach supporting documents, and confirm all open communication threads are resolved.`,
      warrantyClaim: buildServiceWorkbenchWarrantyClaim(row, seed + 7, supportParts[0]?.partNumber ?? "", false)
    }),
    buildServiceWorkbenchJob({
      row,
      seed,
      index: 3,
      title: buildServiceReleaseJobTitle(row),
      unitLabel: units[0]?.label ?? row.model,
      customerApproval: "Approved",
      status: row.roStatus === "Ready to Cash" ? "Ready to Cashier" : "No Activity",
      warranty: "-",
      appliance: "None",
      description: `Final QA, water test planning, and delivery prep for ${row.maker} ${row.model}.`,
      resolution: row.roStatus === "Ready to Cash" ? "Release packet prepared and ready for cashier closeout." : "Hold release steps until primary repair and support work are complete.",
      recommendations: `Do not release the unit until all utility tasks, parts invoices, and warranty notes are attached.`,
      technician: technicians[0],
      quantity: releaseQuantity,
      rate: 129,
      laborRate: "Customer Pay - NonPay Labor",
      parts: releaseParts,
      subletLines: row.category === "Consignment" ? buildServiceWorkbenchSubletLines(row, seed + 4) : [],
      closedDate,
      completedBy: row.roStatus === "Ready to Cash" ? row.serviceWriter : "",
      techNotes: `Confirm final wash, verify signatures, and set pickup expectations with the customer.`,
      warrantyClaim: buildServiceWorkbenchWarrantyClaim(row, seed + 14, releaseParts[0]?.partNumber ?? "", false)
    })
  ];
}

function buildServiceWorkbenchJob({
  row,
  seed,
  index,
  title,
  unitLabel,
  customerApproval,
  status,
  warranty,
  appliance,
  description,
  resolution,
  recommendations,
  technician,
  quantity,
  rate,
  laborRate,
  parts,
  subletLines,
  closedDate,
  completedBy,
  techNotes,
  warrantyClaim
}: {
  row: ServiceWorkspaceRow;
  seed: number;
  index: number;
  title: string;
  unitLabel: string;
  customerApproval: string;
  status: string;
  warranty: string;
  appliance: string;
  description: string;
  resolution: string;
  recommendations: string;
  technician: string;
  quantity: number;
  rate: number;
  laborRate: string;
  parts: ServiceWorkbenchPart[];
  subletLines: ServiceWorkbenchSubletLine[];
  closedDate: string;
  completedBy: string;
  techNotes: string;
  warrantyClaim: ServiceWorkbenchWarrantyClaim;
}): ServiceWorkbenchJob {
  const laborTotal = roundWorkbenchCurrency(quantity * rate);
  const partsTotal = roundWorkbenchCurrency(parts.reduce((total, part) => total + part.price * part.quantity, 0));
  const subletTotal = roundWorkbenchCurrency(subletLines.reduce((total, line) => total + line.price, 0));
  const jobCode = `${row.serviceWriter.split(" ")[0].slice(0, 3).toLowerCase()}${(seed + index).toString().slice(-3)}`;

  return {
    id: `${row.id}-job-${index}`,
    title,
    unitLabel,
    customerApproval,
    status,
    warranty,
    appliance,
    description,
    resolution,
    recommendations,
    jobCode,
    technician,
    laborRate,
    chargeBy: "Hours",
    rate,
    quantity,
    total: roundWorkbenchCurrency(laborTotal + partsTotal + subletTotal),
    closedDate,
    completedBy,
    techNotes,
    parts,
    laborLines: [
      {
        technician,
        jobCode,
        description: title,
        quantity: formatWorkbenchHours(quantity),
        laborRate,
        chargeBy: "Hours",
        rate,
        total: laborTotal,
        closedDate,
        completedBy
      }
    ],
    subletLines,
    attachments: [`${row.roNumber}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`],
    warrantyClaim
  };
}

function buildServicePrimaryJobTitle(row: ServiceWorkspaceRow) {
  const note = row.note.toLowerCase();

  if (note.includes("pump")) {
    return "DIAG WATER PUMP / COOLING";
  }

  if (note.includes("battery")) {
    return "INSTALL DUAL BATTERY KIT";
  }

  if (row.category.toLowerCase().includes("warranty")) {
    return `${row.maker} WARRANTY DIAG`;
  }

  if (row.category.toLowerCase().includes("rig")) {
    return `RIG ${row.maker} DELIVERY PREP`;
  }

  return `INSPECT ${row.maker} ${row.model}`;
}

function buildServiceSupportJobTitle(row: ServiceWorkspaceRow) {
  if (row.category.toLowerCase().includes("parts")) {
    return "PARTS / RIGGING FOLLOW-UP";
  }

  if (row.category.toLowerCase().includes("consignment")) {
    return "CONSIGNMENT PHOTO / QC REVIEW";
  }

  return "DOCUMENTATION / APPROVAL CHECK";
}

function buildServiceReleaseJobTitle(row: ServiceWorkspaceRow) {
  if (row.roStatus === "Ready to Cash") {
    return "FINAL RELEASE / CASHIER HANDOFF";
  }

  return "WATER TEST / CUSTOMER RELEASE";
}

function buildServiceWorkbenchParts(row: ServiceWorkspaceRow, seed: number, variant: "primary" | "support" | "release") {
  if (variant === "primary" && row.note.toLowerCase().includes("pump")) {
    return [
      {
        partNumber: `8M${(seed + 6123).toString().slice(-7)}`,
        description: "Water pump service kit",
        supplier: "MM",
        available: row.category === "Parts Hold" ? 0 : 1,
        price: 152.99,
        quantity: 1,
        category: "PMC"
      },
      {
        partNumber: `35-${(seed + 8921).toString().slice(-7)}`,
        description: "Impeller and gasket set",
        supplier: "MM",
        available: row.category === "Parts Hold" ? 0 : 2,
        price: 96.95,
        quantity: 1,
        category: "PMC"
      }
    ];
  }

  if (variant === "support") {
    return [
      {
        partNumber: `${(seed % 9000000).toString().padStart(7, "0")}-GL`,
        description: row.category === "Rig for Sale" ? "Rigging accessory kit" : "Shop supply staging kit",
        supplier: "MM",
        available: 1,
        price: 63.99,
        quantity: 1,
        category: row.category === "Rig for Sale" ? "RIG" : "SHOP"
      }
    ];
  }

  return [
    {
      partNumber: `${(seed % 8000000).toString().padStart(7, "0")}-RL`,
      description: row.roStatus === "Ready to Cash" ? "Final QC release supplies" : "Inspection and test supplies",
      supplier: "MM",
      available: 1,
      price: row.roStatus === "Ready to Cash" ? 41.53 : 27.75,
      quantity: 1,
      category: "QC"
    }
  ];
}

function buildServiceWorkbenchSubletLines(row: ServiceWorkspaceRow, seed: number): ServiceWorkbenchSubletLine[] {
  return [
    {
      vendor: row.category === "Consignment" ? "Harbor Wash & Detail" : "Dealer Graphics",
      code: `SUB-${(seed % 999).toString().padStart(3, "0")}`,
      description: row.category === "Consignment" ? "Detail and showroom prep" : "Accessory fitment support",
      price: row.category === "Consignment" ? 145 : 95,
      invoiceNumber: `AP-${(seed % 9000).toString().padStart(4, "0")}`,
      date: shiftUsDate(row.inDate, 2)
    }
  ];
}

function buildServiceWorkbenchWarrantyClaim(
  row: ServiceWorkspaceRow,
  seed: number,
  failedPartNumber: string,
  isWarranty: boolean
): ServiceWorkbenchWarrantyClaim {
  return {
    warrantyClaimNumber: isWarranty ? `${seed}` : "",
    internalWarrantyNumber: `${(seed + 162).toString().slice(-4)}`,
    failureDate: shiftUsDate(row.inDate, isWarranty ? 0 : 2),
    contentionCode: isWarranty ? "OEM" : "N/A",
    problemCode: isWarranty ? "2322" : "N/A",
    problemDescription: isWarranty
      ? `Warranty review required for ${row.maker} ${row.model} before the claim can be approved.`
      : `No warranty claim is tied to this line; customer-pay documentation remains in effect.`,
    claimType: isWarranty ? "Manufacturer" : "N/A",
    status: isWarranty ? "Not Ready - Warranty Not Approved" : "No warranty claim filed",
    deductible: isWarranty ? 0 : 0,
    failedPartNumber,
    actionTaken: isWarranty
      ? `Submitted supporting documents to ${row.maker} warranty for review and waiting on disposition.`
      : `No claim action required; continue with customer-pay repair routing.`,
    reasonForDelay: isWarranty ? "Awaiting manufacturer disposition and supplemental authorization." : "No warranty delay on this line.",
    carrierNumber: isWarranty ? `${seed % 9}` : "",
    invoiceDate: shiftUsDate(row.inDate, 1),
    invoiceNumber: isWarranty ? `INV-${seed}` : "",
    dateFiledWithCarrier: isWarranty ? shiftUsDate(row.inDate, 1) : "",
    authorizations: isWarranty ? [`AUTH-${seed}`, `AUTH-${seed + 1}`] : ["-"],
    extraLabor: isWarranty ? [{ hours: "0.5", reason: "Documentation" }] : [{ hours: "0", reason: "N/A" }]
  };
}

function buildServiceWorkbenchMiscCharges(row: ServiceWorkspaceRow, seed: number) {
  return [
    { label: "Shop Supplies", amount: roundWorkbenchCurrency(12 + (seed % 6) * 3), auto: true },
    { label: "Boat Gas", amount: row.roStatus === "Ready to Cash" ? 18 : 0, auto: false },
    { label: "Freight", amount: row.category === "Parts Hold" ? 24 : 0, auto: row.category === "Parts Hold" },
    { label: "Environmental Fee", amount: 6, auto: true },
    { label: "Discount", amount: row.roStatus === "Ready to Cash" ? -15 : 0, auto: false }
  ];
}

function buildServiceWorkbenchLaborSessions(row: ServiceWorkspaceRow, jobs: ServiceWorkbenchJob[], seed: number): ServiceWorkbenchLaborSession[] {
  const primaryJob = jobs[0];

  return [
    {
      technician: primaryJob.technician,
      startDate: shiftUsDate(row.inDate, 1),
      startTime: "8:15 AM",
      endDate: row.roStatus === "Ready to Cash" ? shiftUsDate(row.inDate, 1) : "",
      endTime: row.roStatus === "Ready to Cash" ? "1:20 PM" : "",
      actualHours: formatWorkbenchHours(primaryJob.quantity),
      creditedHours: formatWorkbenchHours(Math.max(primaryJob.quantity - 0.5, 0)),
      override: seed % 2 === 0 ? "None" : "Writer review"
    }
  ];
}

function buildServiceWorkbenchAttachments(row: ServiceWorkspaceRow, entries: TaskQueueEntry[]): ServiceWorkbenchAttachment[] {
  const relatedEntries = entries.filter((entry) => entry.detail.startsWith(`${row.roNumber} -+`)).slice(0, 3);
  const customerSlug = row.customerName.split(",")[0]?.trim().toUpperCase() ?? "CUSTOMER";
  const baseAttachment: ServiceWorkbenchAttachment = {
    name: `${customerSlug}-${row.roNumber}.pdf`,
    visibility: "Private",
    kind: "RO Jacket",
    createdBy: row.serviceWriter,
    createdTime: `${row.inDate} -+ 8:30 AM`,
    status: "Attached"
  };

  return [
    baseAttachment,
    ...relatedEntries.map((entry) => ({
      name: `${row.roNumber}-${entry.action.toLowerCase()}.pdf`,
      visibility: "Private",
      kind: entry.action,
      createdBy: entry.actorName,
      createdTime: entry.timeLabel,
      status: entry.status
    }))
  ];
}

function buildServiceWorkbenchSignatureDocs(row: ServiceWorkspaceRow, total: number): ServiceWorkbenchSignatureDoc[] {
  if (row.roStatus !== "Ready to Cash") {
    return [];
  }

  return [
    {
      description: `Repair authorization -+ ${formatWorkbenchCurrency(total)}`,
      createdBy: row.serviceWriter,
      createdTime: `${shiftUsDate(row.inDate, 3)} -+ 9:05 AM`,
      completedTime: `${shiftUsDate(row.inDate, 4)} -+ 11:40 AM`,
      status: "Signed",
      customer: "Signed",
      dealer1: "Signed",
      dealer2: "-",
      dealer3: "-",
      dealer4: "-"
    }
  ];
}

function buildServiceWorkbenchHistory(row: ServiceWorkspaceRow, entries: TaskQueueEntry[], activityEntries: CommandLogEntry[]): ServiceWorkbenchHistoryLine[] {
  const roPrefix = `${row.roNumber} -+`;
  const taskHistory = entries
    .filter((entry) => entry.detail.startsWith(roPrefix))
    .map((entry) => ({
      date: `${row.inDate} -+ ${entry.timeLabel}`,
      event: `${entry.action} ${entry.status}`,
      user: entry.lastUpdatedByName,
      detail: entry.detail,
      oldValue: entry.assignedName,
      newValue: entry.status
    }));
  const activityHistory = activityEntries
    .filter((entry) => entry.detail.includes(row.roNumber))
    .map((entry) => ({
      date: `${row.inDate} -+ ${entry.timeLabel}`,
      event: entry.label,
      user: entry.actorName,
      detail: entry.detail,
      oldValue: row.category,
      newValue: row.roStatus
    }));
  const fallbackHistory = [
    {
      date: `${row.inDate} -+ 11:15 AM`,
      event: "Customer approval changed",
      user: row.serviceWriter,
      detail: row.note,
      oldValue: "Waiting",
      newValue: "Approved"
    },
    {
      date: `${row.inDate} -+ 11:05 AM`,
      event: "Repair order opened",
      user: row.serviceWriter,
      detail: `RO ${row.roNumber} created for ${row.customerName}.`,
      oldValue: "-",
      newValue: row.roStatus
    }
  ];

  return [...taskHistory, ...activityHistory, ...fallbackHistory].slice(0, 8);
}

function formatWorkbenchHours(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function createTaskSlaPolicyKey(workspaceId: WorkspaceId, action: string) {
  return `${workspaceId}:${action}`;
}

function describeTaskSlaPolicyPreviewChange(changeType: TaskSlaPolicyCopyPreviewResponse["comparison"][number]["changeType"]) {
  switch (changeType) {
    case "create":
      return "Create override";
    case "update":
      return "Update override";
    case "remove":
      return "Remove override";
    case "unchanged":
    default:
      return "No change";
  }
}

function formatTaskSlaPolicyPreviewState(source: string | null, slaLabel: string | null, fallback: string) {
  if (!source || !slaLabel) {
    return fallback;
  }

  return `${source} -+ ${slaLabel}`;
}

function buildPolicyTimelineEntries(action: string, rows: AuditWorkspaceRow[], targetStoreName: string | null) {
  return rows
    .flatMap((row) => {
      if (row.kind !== "Activity") {
        return [];
      }

      if (row.summary === "SLA policy updated" && row.detail.startsWith(`${action} now targets `)) {
        return [
          {
            id: row.id,
            label: "Source edited",
            meta: `${row.storeName} -+ ${row.timeLabel} -+ ${row.operatorName}`,
            tone: row.tone
          }
        ];
      }

      if (row.summary === "SLA policy reset" && row.detail.startsWith(`${action} returned to the default `)) {
        return [
          {
            id: row.id,
            label: "Reset to default",
            meta: `${row.storeName} -+ ${row.timeLabel} -+ ${row.operatorName}`,
            tone: row.tone
          }
        ];
      }

      if (
        row.summary === "SLA policy rolled out" &&
        row.detail.startsWith(`${action} synced to `) &&
        (!targetStoreName || row.detail.includes(`synced to ${targetStoreName}.`) || row.detail.includes(`synced to ${targetStoreName}`))
      ) {
        return [
          {
            id: row.id,
            label: "Source push",
            meta: `${row.storeName} -+ ${row.timeLabel} -+ ${row.operatorName}`,
            tone: row.tone
          }
        ];
      }

      if (
        row.summary === "SLA policy rollout received" &&
        row.detail.startsWith(`${action} copied in from `) &&
        (!targetStoreName || row.storeName === targetStoreName)
      ) {
        return [
          {
            id: row.id,
            label: "Target receipt",
            meta: `${row.storeName} -+ ${row.timeLabel} -+ ${row.operatorName}`,
            tone: row.tone
          }
        ];
      }

      if (
        row.summary === "SLA policy already aligned" &&
        ((targetStoreName && row.detail.includes(`${targetStoreName} already matches`) && row.detail.endsWith(`for ${action}.`)) ||
          (targetStoreName && row.storeName === targetStoreName && row.detail.startsWith(`${action} already matches `)))
      ) {
        return [
          {
            id: row.id,
            label: "Already aligned",
            meta: `${row.storeName} -+ ${row.timeLabel} -+ ${row.operatorName}`,
            tone: row.tone
          }
        ];
      }

      return [];
    });
}

function buildServiceUtilityTaskBadges(entry: TaskQueueEntry, activityEntries: CommandLogEntry[]) {
  const handoffBadges = activityEntries
    .filter(
      (activity) =>
        activity.detail === entry.detail &&
        (activity.label === `${entry.action} unassigned` || activity.label.startsWith(`${entry.action} handed to `))
    )
    .slice(0, 2)
    .map((activity) => ({
      label: activity.label.replace(`${entry.action} `, ""),
      tone: activity.tone
    }));

  return [
    { label: `Created ${entry.actorName}`, tone: "neutral" as const },
    { label: `Owner ${entry.assignedName}`, tone: entry.assignedUserId ? ("accent" as const) : ("neutral" as const) },
    { label: `Last touch ${entry.lastUpdatedByName}`, tone: "stable" as const },
    ...(entry.latestCommentByName ? [{ label: `Latest note ${entry.latestCommentByName}`, tone: "neutral" as const }] : []),
    ...(entry.status === "Done" ? [{ label: "Reopen ready", tone: "stable" as const }] : []),
    ...handoffBadges
  ];
}

function isServiceUtilityQaTask(entry: Pick<TaskQueueEntry, "action" | "detail">) {
  return inlineServiceUtilityActions.has(entry.action) && entry.detail.includes(serviceUtilityQaMarker);
}

function dedupeAuditWorkspaceRows(rows: AuditWorkspaceRow[]) {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function buildServiceUtilityQaCleanupCandidates(entries: TaskQueueEntry[]) {
  const candidates = new Map<
    string,
    {
      latestAction: string;
      roNumber: string;
      latestTaskId: string;
      taskCount: number;
      actions: string[];
      latestStatus: TaskStatus;
      latestTimeLabel: string;
    }
  >();

  for (const entry of entries) {
    if (!isServiceUtilityQaTask(entry)) {
      continue;
    }

    const roNumber = resolveServiceUtilityRoNumber(entry.detail);

    if (!roNumber) {
      continue;
    }

    const existingCandidate = candidates.get(roNumber);

    if (!existingCandidate) {
      candidates.set(roNumber, {
        latestAction: entry.action,
        roNumber,
        latestTaskId: entry.id,
        taskCount: 1,
        actions: [entry.action],
        latestStatus: entry.status,
        latestTimeLabel: entry.timeLabel
      });
      continue;
    }

    existingCandidate.taskCount += 1;

    if (!existingCandidate.actions.includes(entry.action)) {
      existingCandidate.actions.push(entry.action);
    }
  }

  return [...candidates.values()];
}

function resolveServiceUtilityRoNumber(detail: string) {
  const [roNumber] = detail.split(" -+ ");
  return roNumber?.trim() || null;
}

interface ActionWorkflowModalProps {
  isSubmitting: boolean;
  workflow: ActionWorkflowState | null;
  onChangeField: (fieldKey: string, value: string) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}

function ActionWorkflowModal({ isSubmitting, workflow, onChangeField, onClose, onSubmit }: ActionWorkflowModalProps) {
  if (!workflow) {
    return null;
  }

  const previewItems = workflow.buildPreviewItems?.(workflow.values) ?? [];

  return (
    <div className="modal-backdrop">
      <div className="modal-panel workflow-panel">
        <div className="modal-header">
          <div>
            <p>Command workflow</p>
            <h2>{workflow.title}</h2>
          </div>
          <button className="workflow-secondary" disabled={isSubmitting} onClick={onClose} type="button">
            Close
          </button>
        </div>

        <p className="workflow-summary">{workflow.description}</p>

        {previewItems.length > 0 ? (
          <div className="workflow-preview-strip">
            {previewItems.map((item) => (
              <div className={`workflow-preview-item tone-${item.tone ?? "neutral"}`} key={`${item.label}:${item.value}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <form
          className="workflow-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="workflow-grid">
            {workflow.fields.map((field) => (
              <label className={`workflow-field${field.control === "textarea" ? " is-wide" : ""}`} key={field.key}>
                <span>{field.label}</span>

                {field.control === "textarea" ? (
                  <textarea
                    disabled={isSubmitting}
                    onChange={(event) => onChangeField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    value={workflow.values[field.key] ?? ""}
                  />
                ) : field.control === "select" ? (
                  <select disabled={isSubmitting} onChange={(event) => onChangeField(field.key, event.target.value)} value={workflow.values[field.key] ?? ""}>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    disabled={isSubmitting}
                    onChange={(event) => onChangeField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    type="text"
                    value={workflow.values[field.key] ?? ""}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="workflow-actions">
            <button className="workflow-secondary" disabled={isSubmitting} onClick={onClose} type="button">
              Cancel
            </button>
            <button className="workflow-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : workflow.primaryActionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PartsOrderingBoardProps {
  isLookupOpen: boolean;
  isLookupSubmitting: boolean;
  lookupQuantity: string;
  lookupSearchField: PartsLookupSearchField;
  lookupSearchTerm: string;
  lookupSelectedRowId: string | null;
  onCloseLookup: () => void;
  onFilterChange: (filterValue: string) => void;
  onLookupQuantityChange: React.Dispatch<React.SetStateAction<string>>;
  onLookupSearchFieldChange: React.Dispatch<React.SetStateAction<PartsLookupSearchField>>;
  onLookupSearchTermChange: React.Dispatch<React.SetStateAction<string>>;
  onLookupSelectResult: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenLookup: (initialSearchTerm?: string) => void;
  onQuickAddTermChange: React.Dispatch<React.SetStateAction<string>>;
  onSearchChange: (searchTerm: string) => void;
  onSelectLookupRow: (row: PartsWorkspaceRow) => void;
  onSelectRow: (row: PartsWorkspaceRow) => void;
  onSubmitLookup: () => void | Promise<void>;
  quickAddTerm: string;
  rows: PartsWorkspaceRow[];
  searchState: WorkspaceSearchState;
  selectedRowId: string | null;
}

function PartsOrderingBoard({
  isLookupOpen,
  isLookupSubmitting,
  lookupQuantity,
  lookupSearchField,
  lookupSearchTerm,
  lookupSelectedRowId,
  onCloseLookup,
  onFilterChange,
  onLookupQuantityChange,
  onLookupSearchFieldChange,
  onLookupSearchTermChange,
  onLookupSelectResult,
  onOpenLookup,
  onQuickAddTermChange,
  onSearchChange,
  onSelectLookupRow,
  onSelectRow,
  onSubmitLookup,
  quickAddTerm,
  rows,
  searchState,
  selectedRowId
}: PartsOrderingBoardProps) {
  const filterOptions = buildFilterOptions(rows.map((row) => row.supplier));
  const filteredRows = rows.filter(
    (row) =>
      matchesWorkspaceSearch(
        [row.partNumber, row.secondary, row.description, row.supplier, row.category, row.orderType, row.quantity, row.orderCost, row.source],
        searchState.searchTerm
      ) && matchesWorkspaceFilter(row.supplier, searchState.filterValue)
  );
  const selectedPartsRow = resolveSelectedRow(filteredRows, selectedRowId);
  const availableQuantity = selectedPartsRow ? getPartsLookupAvailableQuantity(selectedPartsRow) : "0";
  const onOrderQuantity = selectedPartsRow?.orderType === "PO" ? selectedPartsRow.quantity : "0";

  return (
    <div className="legacy-data-window legacy-parts-workspace">
      <section className="legacy-info-card legacy-parts-composer">
        <form
          className="legacy-parts-composer-form"
          onSubmit={(event) => {
            event.preventDefault();
            onOpenLookup(quickAddTerm);
          }}
        >
          <label className="legacy-parts-composer-field">
            <span>Key/Scan Part to Add</span>
            <input
              disabled={isLookupSubmitting}
              onChange={(event) => onQuickAddTermChange(event.target.value)}
              placeholder="Part number, barcode, or quick lookup"
              type="text"
              value={quickAddTerm}
            />
          </label>
          <button className="legacy-parts-composer-action" disabled={isLookupSubmitting} type="submit">
            Add
          </button>
          <div className="legacy-parts-composer-meta">
            <span>Selected Line</span>
            <strong>{selectedPartsRow?.partNumber ?? "No line selected"}</strong>
          </div>
          <div className="legacy-parts-composer-meta">
            <span>Default Supplier</span>
            <strong>{selectedPartsRow?.supplier ?? "MM"}</strong>
          </div>
        </form>
      </section>

      <section className="legacy-info-card legacy-parts-grid-panel">
        <WorkspaceSearchStrip
          filterLabel="Supplier"
          filterOptions={filterOptions}
          filterValue={searchState.filterValue}
          foundCount={filteredRows.length}
          onFilterChange={onFilterChange}
          onSearchChange={onSearchChange}
          searchTerm={searchState.searchTerm}
        />
        <LegacyDataGrid
          columns={partsColumns}
          emptyMessage="No parts rows match the current search."
          onRowSelect={onSelectRow}
          rows={filteredRows}
          selectedRowId={selectedPartsRow?.id ?? null}
        />
      </section>

      <div className="legacy-parts-footer">
        <section className="legacy-info-card">
          <h3>Part Info</h3>
          <div className="legacy-info-grid">
            <LabelValue label="Part Number" value={selectedPartsRow?.partNumber ?? "-"} />
            <LabelValue label="Default Supplier" value={selectedPartsRow?.supplier ?? "-"} />
            <LabelValue label="Category" value={selectedPartsRow?.category ?? "-"} />
            <LabelValue label="Order Type" value={selectedPartsRow?.orderType ?? "-"} />
          </div>
        </section>
        <section className="legacy-info-card">
          <h3>Inventory Snapshot</h3>
          <div className="legacy-info-grid">
            <LabelValue label="Available" value={availableQuantity} />
            <LabelValue label="On Order" value={onOrderQuantity} />
            <LabelValue label="Pkg Qty" value={selectedPartsRow?.quantity ?? "0"} />
            <LabelValue label="Order Cost" value={selectedPartsRow?.orderCost ?? "$0"} />
          </div>
        </section>
      </div>

      <PartsLookupModal
        isSubmitting={isLookupSubmitting}
        onClose={onCloseLookup}
        onQuantityChange={onLookupQuantityChange}
        onSearchFieldChange={onLookupSearchFieldChange}
        onSearchTermChange={onLookupSearchTermChange}
        onSelectResult={onLookupSelectResult}
        onSelectRow={onSelectLookupRow}
        onSubmit={onSubmitLookup}
        open={isLookupOpen}
        quantity={lookupQuantity}
        rows={rows}
        searchField={lookupSearchField}
        searchTerm={lookupSearchTerm}
        selectedRowId={lookupSelectedRowId}
      />
    </div>
  );
}

interface PartsLookupModalProps {
  isSubmitting: boolean;
  onClose: () => void;
  onQuantityChange: React.Dispatch<React.SetStateAction<string>>;
  onSearchFieldChange: React.Dispatch<React.SetStateAction<PartsLookupSearchField>>;
  onSearchTermChange: React.Dispatch<React.SetStateAction<string>>;
  onSelectResult: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectRow: (row: PartsWorkspaceRow) => void;
  onSubmit: () => void | Promise<void>;
  open: boolean;
  quantity: string;
  rows: PartsWorkspaceRow[];
  searchField: PartsLookupSearchField;
  searchTerm: string;
  selectedRowId: string | null;
}

function PartsLookupModal({
  isSubmitting,
  onClose,
  onQuantityChange,
  onSearchFieldChange,
  onSearchTermChange,
  onSelectResult,
  onSelectRow,
  onSubmit,
  open,
  quantity,
  rows,
  searchField,
  searchTerm,
  selectedRowId
}: PartsLookupModalProps) {
  if (!open) {
    return null;
  }

  const visibleRows = filterPartsLookupRows(rows, searchTerm, searchField);
  const selectedLookupRow = resolveSelectedRow(visibleRows, selectedRowId);
  const manualPartNumber = searchField === "partNumber" ? searchTerm.trim() : "";
  const stagedPartNumber = selectedLookupRow?.partNumber ?? manualPartNumber;
  const normalizedQuantity = `${Math.max(1, Number.parseInt(quantity, 10) || 1)}`;
  const canSubmit = Boolean(selectedLookupRow || manualPartNumber);
  const previewMessage = selectedLookupRow
    ? `${selectedLookupRow.description} -+ ${selectedLookupRow.supplier} -+ ${getPartsLookupLocation(selectedLookupRow)}`
    : manualPartNumber
      ? `No exact inventory row is selected. This will stage a PO line for ${manualPartNumber}.`
      : "Search part inventory to stage a new purchase-order line.";

  return (
    <div className="modal-backdrop">
      <div className="modal-panel workflow-panel legacy-parts-lookup-modal">
        <div className="legacy-parts-lookup-titlebar">
          <strong>Part Lookup</strong>
          <button className="workflow-secondary legacy-parts-lookup-close" disabled={isSubmitting} onClick={onClose} type="button">
            x
          </button>
        </div>

        <div className="legacy-parts-lookup-toolbar">
          <label className="legacy-search-field legacy-parts-lookup-search">
            <span>Search</span>
            <input
              disabled={isSubmitting}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder={searchField === "description" ? "Type description or keyword" : searchField === "secondary" ? "Type secondary number" : "Type part number"}
              type="text"
              value={searchTerm}
            />
          </label>

          <label className="legacy-search-field is-small">
            <span>Search By</span>
            <select disabled={isSubmitting} onChange={(event) => onSearchFieldChange(event.target.value as PartsLookupSearchField)} value={searchField}>
              {partsLookupFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="legacy-search-field is-small">
            <span>Look In</span>
            <select disabled value="Part Inventory">
              <option value="Part Inventory">Part Inventory</option>
            </select>
          </label>

          <label className="legacy-search-field is-small legacy-parts-lookup-qty">
            <span>Qty</span>
            <input disabled={isSubmitting} inputMode="numeric" onChange={(event) => onQuantityChange(event.target.value)} type="text" value={quantity} />
          </label>
        </div>

        <div className="legacy-parts-lookup-grid">
          <LegacyDataGrid
            columns={partsLookupColumns}
            emptyMessage={searchTerm ? "No lookup rows match the current search." : "No parts are available for lookup yet."}
            onRowSelect={(row) => {
              onSelectRow(row);
              onSelectResult(row.id);
            }}
            rows={visibleRows}
            selectedRowId={selectedLookupRow?.id ?? null}
          />
        </div>

        <section className="legacy-parts-lookup-preview">
          <div className="legacy-parts-lookup-preview-copy">
            <span>Ready to Stage</span>
            <strong>{stagedPartNumber || "Select a part"}</strong>
            <p>{previewMessage}</p>
          </div>
          <div className="legacy-parts-lookup-preview-grid">
            <LabelValue label="Supplier" value={selectedLookupRow?.supplier ?? "MM"} />
            <LabelValue label="Qty" value={normalizedQuantity} />
            <LabelValue label="Location" value={selectedLookupRow ? getPartsLookupLocation(selectedLookupRow) : "Part Inventory"} />
            <LabelValue label="Price" value={selectedLookupRow?.orderCost ?? "-"} />
          </div>
        </section>

        <div className="workflow-actions">
          <button className="workflow-secondary" disabled={isSubmitting} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="workflow-primary"
            disabled={isSubmitting || !canSubmit}
            onClick={() => {
              void onSubmit();
            }}
            type="button"
          >
            {isSubmitting ? "Adding..." : "Add Line"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WorkspaceSearchStripProps {
  filterLabel: string;
  filterOptions: string[];
  filterValue: string;
  foundCount: number;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  searchTerm: string;
}

function WorkspaceSearchStrip({
  filterLabel,
  filterOptions,
  filterValue,
  foundCount,
  onFilterChange,
  onSearchChange,
  searchTerm
}: WorkspaceSearchStripProps) {
  return (
    <div className="legacy-search-strip">
      <label className="legacy-search-field">
        <span>Search</span>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Type here to search..."
          type="text"
          value={searchTerm}
        />
      </label>

      <label className="legacy-search-field is-small">
        <span>{filterLabel}</span>
        <select onChange={(event) => onFilterChange(event.target.value)} value={filterValue}>
          {filterOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="legacy-search-meta">Found: {foundCount}</div>
    </div>
  );
}

interface LegacyDataGridProps<T extends { id: string; tone: RowTone }> {
  columns: LegacyGridColumn<T>[];
  emptyMessage: string;
  onRowSelect?: (row: T) => void;
  rows: T[];
  selectedRowId?: string | null;
}

function LegacyDataGrid<T extends { id: string; tone: RowTone }>({
  columns,
  emptyMessage,
  onRowSelect,
  rows,
  selectedRowId
}: LegacyDataGridProps<T>) {
  return (
    <div className="legacy-grid-shell">
      <table className="legacy-grid">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.label}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="legacy-grid-empty" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                className={`tone-${row.tone}${onRowSelect ? " is-interactive" : ""}${selectedRowId === row.id ? " is-selected" : ""}`}
                key={row.id}
                onClick={onRowSelect ? () => onRowSelect(row) : undefined}
                onKeyDown={
                  onRowSelect
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowSelect(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowSelect ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td className={column.className} key={column.label}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function buildFilterOptions(values: string[], activeValue?: string) {
  const uniqueValueSet = new Set(values.filter(Boolean));

  if (activeValue && activeValue !== "All") {
    uniqueValueSet.add(activeValue);
  }

  const uniqueValues = [...uniqueValueSet].sort((left, right) => left.localeCompare(right));
  return ["All", ...uniqueValues];
}

function readOpenWorkspacePreference(userId: string) {
  if (typeof window === "undefined") {
    return workspaceOrder;
  }

  const raw = window.sessionStorage.getItem(`${OPEN_WINDOWS_STORAGE_PREFIX}:${userId}`);

  if (!raw) {
    return workspaceOrder;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return workspaceOrder;
    }

    return normalizeOpenWorkspacePreference(parsed.filter((value): value is WorkspaceId => typeof value === "string" && isWorkspaceId(value)));
  } catch {
    return workspaceOrder;
  }
}

function readOpenWindowOrderPreference(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.sessionStorage.getItem(`${OPEN_WINDOW_ORDER_STORAGE_PREFIX}:${userId}`);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function readServiceNotificationRailCollapsedPreference(userId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const raw = window.sessionStorage.getItem(`${SERVICE_NOTIFICATION_RAIL_STORAGE_PREFIX}:${userId}`);

  if (!raw) {
    return false;
  }

  try {
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function readRecentServiceRowHighlightsPreference(storageKey: string) {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.sessionStorage.getItem(storageKey);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return pruneRecentServiceRowHighlights(
      Object.fromEntries(
        Object.entries(parsed).flatMap(([rowId, expiresAt]) =>
          typeof expiresAt === "number" && Number.isFinite(expiresAt) ? [[rowId, expiresAt]] : []
        )
      )
    );
  } catch {
    return {};
  }
}

function pruneRecentServiceRowHighlights(current: Record<string, number>) {
  const now = Date.now();

  return Object.fromEntries(Object.entries(current).filter(([, expiresAt]) => expiresAt > now));
}

function getDesktopWidgetDefinition(type: DesktopWidgetType) {
  return desktopWidgetCatalog.find((widgetDefinition) => widgetDefinition.type === type) ?? desktopWidgetCatalog[0];
}

function normalizeDesktopWidgetView(type: DesktopWidgetType, view: DesktopWidgetView) {
  const widgetDefinition = getDesktopWidgetDefinition(type);

  return widgetDefinition.views.some((viewOption) => viewOption.id === view) ? view : widgetDefinition.defaultView;
}

function normalizeDesktopWidgetWidth(width: unknown): DesktopWidgetWidth {
  return width === "full" ? "full" : "half";
}

function normalizeDesktopWidgetLane(lane: unknown, width: DesktopWidgetWidth, fallbackLane?: DesktopWidgetLane): DesktopWidgetLane {
  if (width === "full") {
    return "spotlight";
  }

  if (lane === "left" || lane === "right") {
    return lane;
  }

  return fallbackLane === "right" ? "right" : "left";
}

function buildDesktopWidgetPlacementForLane(lane: DesktopWidgetLane) {
  return lane === "spotlight"
    ? { lane: "spotlight" as const, width: "full" as const }
    : { lane, width: "half" as const };
}

function buildDesktopWidgetPlacementForWidth(width: DesktopWidgetWidth, currentLane: DesktopWidgetLane) {
  if (width === "full") {
    return buildDesktopWidgetPlacementForLane("spotlight");
  }

  return buildDesktopWidgetPlacementForLane(currentLane === "right" ? "right" : "left");
}

function desktopWidgetWidthUnits(width: DesktopWidgetWidth) {
  return width === "full" ? 2 : 1;
}

function desktopWidgetWidthFromUnits(units: number): DesktopWidgetWidth {
  return units >= 2 ? "full" : "half";
}

function normalizeDesktopWidgetHeight(height: unknown): DesktopWidgetHeight {
  return height === "compact" || height === "tall" ? height : "standard";
}

function desktopWidgetHeightUnits(height: DesktopWidgetHeight) {
  switch (height) {
    case "compact":
      return 1;
    case "tall":
      return 3;
    case "standard":
    default:
      return 2;
  }
}

function desktopWidgetHeightFromUnits(units: number): DesktopWidgetHeight {
  if (units <= 1) {
    return "compact";
  }

  if (units >= 3) {
    return "tall";
  }

  return "standard";
}

function normalizeDesktopWidgetShape(shape: unknown): DesktopWidgetShape {
  return shape === "square" || shape === "oval" || shape === "circle" ? shape : "rectangle";
}

function buildDesktopWidgetConfig(
  type: DesktopWidgetType,
  overrides?: Partial<Pick<DesktopWidgetConfig, "height" | "id" | "lane" | "shape" | "title" | "view" | "width">>
): DesktopWidgetConfig {
  const widgetDefinition = getDesktopWidgetDefinition(type);
  const normalizedWidth = normalizeDesktopWidgetWidth(overrides?.width ?? widgetDefinition.defaultWidth);

  return {
    id: overrides?.id ?? createDesktopWidgetId(type),
    type,
    title: overrides?.title?.trim() ? overrides.title.trim() : widgetDefinition.defaultTitle,
    view: normalizeDesktopWidgetView(type, overrides?.view ?? widgetDefinition.defaultView),
    width: normalizedWidth,
    height: normalizeDesktopWidgetHeight(overrides?.height ?? widgetDefinition.defaultHeight),
    lane: normalizeDesktopWidgetLane(overrides?.lane, normalizedWidth, widgetDefinition.defaultLane),
    shape: normalizeDesktopWidgetShape(overrides?.shape ?? widgetDefinition.defaultShape)
  };
}

function buildDefaultDesktopWidgets(): DesktopWidgetConfig[] {
  return [
    buildDesktopWidgetConfig("scoreboard", { lane: "spotlight" }),
    buildDesktopWidgetConfig("reportTable", { lane: "spotlight" }),
    buildDesktopWidgetConfig("trendLine", { lane: "spotlight" }),
    buildDesktopWidgetConfig("laneGraph", { lane: "left" }),
    buildDesktopWidgetConfig("funnelBoard", { lane: "left" }),
    buildDesktopWidgetConfig("attentionBoard", { lane: "right" }),
    buildDesktopWidgetConfig("openWindows", { lane: "left" }),
    buildDesktopWidgetConfig("operatingLanes", { lane: "spotlight" }),
    buildDesktopWidgetConfig("goalGauge", { lane: "right" }),
    buildDesktopWidgetConfig("activityFeed", { lane: "right" })
  ];
}

function buildBlankDesktopWidgets(): DesktopWidgetConfig[] {
  return [];
}

function cloneDesktopWidgets(widgets: DesktopWidgetConfig[]) {
  return widgets.map((widget) => ({
    ...widget,
    id: createDesktopWidgetId(widget.type)
  }));
}

function createDesktopDashboardId() {
  return `dashboard-${Math.random().toString(36).slice(2, 10)}`;
}

function buildDesktopDashboardConfig(name: string, widgets: DesktopWidgetConfig[] = buildBlankDesktopWidgets()): DesktopDashboardConfig {
  return {
    id: createDesktopDashboardId(),
    name: name.trim() || "Front Page",
    widgets: widgets.map((widget) => buildDesktopWidgetConfig(widget.type, widget))
  };
}

function buildDefaultDesktopDashboardPreference(): DesktopDashboardPreference {
  const defaultDashboard = buildDesktopDashboardConfig("Front Page");

  return {
    activeDashboardId: defaultDashboard.id,
    dashboards: [defaultDashboard]
  };
}

function createDesktopWidgetId(type: DesktopWidgetType) {
  return `${type}-${Math.random().toString(36).slice(2, 10)}`;
}

function upgradeLegacyDesktopWidgets(widgets: DesktopWidgetConfig[]) {
  const legacyDefaultTypes: DesktopWidgetType[] = [
    "scoreboard",
    "trendLine",
    "laneGraph",
    "attentionBoard",
    "openWindows",
    "operatingLanes",
    "activityFeed"
  ];
  const nextGenerationTypes: DesktopWidgetType[] = ["reportTable", "funnelBoard", "goalGauge"];
  const widgetTypes = widgets.map((widget) => widget.type);
  const isLegacyDefaultLayout =
    widgets.length === legacyDefaultTypes.length &&
    legacyDefaultTypes.every((type) => widgetTypes.includes(type)) &&
    nextGenerationTypes.every((type) => !widgetTypes.includes(type));

  if (!isLegacyDefaultLayout) {
    return widgets;
  }

  const nextWidgets = [...widgets];

  nextWidgets.splice(1, 0, buildDesktopWidgetConfig("reportTable"));

  const laneGraphIndex = nextWidgets.findIndex((widget) => widget.type === "laneGraph");
  nextWidgets.splice(laneGraphIndex + 1, 0, buildDesktopWidgetConfig("funnelBoard"));

  const operatingLanesIndex = nextWidgets.findIndex((widget) => widget.type === "operatingLanes");
  nextWidgets.splice(operatingLanesIndex + 1, 0, buildDesktopWidgetConfig("goalGauge"));

  return nextWidgets;
}

function readDesktopWidgetPreference(storageKey: string) {
  if (typeof window === "undefined") {
    return buildBlankDesktopWidgets();
  }

  const raw = window.sessionStorage.getItem(storageKey);

  if (!raw) {
    return buildBlankDesktopWidgets();
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return buildBlankDesktopWidgets();
    }

    const normalized = parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidateId = "id" in entry ? entry.id : null;
      const candidateType = "type" in entry ? entry.type : null;
      const candidateTitle = "title" in entry ? entry.title : null;
      const candidateView = "view" in entry ? entry.view : null;
      const candidateWidth = "width" in entry ? entry.width : null;
      const candidateHeight = "height" in entry ? entry.height : null;
      const candidateLane = "lane" in entry ? entry.lane : null;
      const candidateShape = "shape" in entry ? entry.shape : null;

      if (typeof candidateType !== "string") {
        return [];
      }

      const widgetDefinition = desktopWidgetCatalog.find((widgetDefinition) => widgetDefinition.type === candidateType);

      if (!widgetDefinition) {
        return [];
      }

      return [
        buildDesktopWidgetConfig(widgetDefinition.type, {
          id: typeof candidateId === "string" && candidateId.trim().length > 0 ? candidateId : createDesktopWidgetId(widgetDefinition.type),
          title:
            typeof candidateTitle === "string" && candidateTitle.trim().length > 0
              ? candidateTitle.trim()
              : widgetDefinition.defaultTitle,
          view: typeof candidateView === "string" ? (candidateView as DesktopWidgetView) : widgetDefinition.defaultView,
          width: candidateWidth,
          height: candidateHeight,
          lane: candidateLane,
          shape: candidateShape
        })
      ];
    });

    const nextWidgets = normalized.length > 0 || parsed.length === 0 ? normalized : buildBlankDesktopWidgets();

    return upgradeLegacyDesktopWidgets(nextWidgets);
  } catch {
    return buildBlankDesktopWidgets();
  }
}

function readDesktopDashboardPreference(storageKey: string): DesktopDashboardPreference {
  const fallbackPreference = buildDefaultDesktopDashboardPreference();

  if (typeof window === "undefined") {
    return fallbackPreference;
  }

  const raw = window.sessionStorage.getItem(storageKey);

  if (!raw) {
    return fallbackPreference;
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const legacyWidgets = readDesktopWidgetPreference(storageKey);
      const migratedDashboard = buildDesktopDashboardConfig("Front Page", legacyWidgets);

      return {
        activeDashboardId: migratedDashboard.id,
        dashboards: [migratedDashboard]
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return fallbackPreference;
    }

    const parsedDashboards = "dashboards" in parsed ? parsed.dashboards : null;
    const parsedActiveDashboardId = "activeDashboardId" in parsed ? parsed.activeDashboardId : null;

    if (!Array.isArray(parsedDashboards)) {
      return fallbackPreference;
    }

    const dashboards = parsedDashboards.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const candidateId = "id" in entry ? entry.id : null;
      const candidateName = "name" in entry ? entry.name : null;
      const candidateWidgets = "widgets" in entry ? entry.widgets : null;

      const widgetList = Array.isArray(candidateWidgets)
        ? candidateWidgets.flatMap((widgetEntry) => {
            if (!widgetEntry || typeof widgetEntry !== "object") {
              return [];
            }

            const candidateWidgetType = "type" in widgetEntry ? widgetEntry.type : null;

            if (typeof candidateWidgetType !== "string") {
              return [];
            }

            const widgetDefinition = desktopWidgetCatalog.find((widgetDefinition) => widgetDefinition.type === candidateWidgetType);

            if (!widgetDefinition) {
              return [];
            }

            return [buildDesktopWidgetConfig(widgetDefinition.type, widgetEntry as Partial<DesktopWidgetConfig>)];
          })
        : [];

      const normalizedWidgets = widgetList.length > 0 || (Array.isArray(candidateWidgets) && candidateWidgets.length === 0) ? widgetList : buildBlankDesktopWidgets();

      return [
        {
          id: typeof candidateId === "string" && candidateId.trim().length > 0 ? candidateId : createDesktopDashboardId(),
          name: typeof candidateName === "string" && candidateName.trim().length > 0 ? candidateName.trim() : "Front Page",
          widgets: upgradeLegacyDesktopWidgets(normalizedWidgets)
        }
      ];
    });

    if (dashboards.length === 0) {
      return fallbackPreference;
    }

    const activeDashboardId =
      typeof parsedActiveDashboardId === "string" && dashboards.some((dashboardLayout) => dashboardLayout.id === parsedActiveDashboardId)
        ? parsedActiveDashboardId
        : dashboards[0].id;

    return {
      activeDashboardId,
      dashboards
    };
  } catch {
    return fallbackPreference;
  }
}

function moveDesktopWidgetToTarget(
  widgets: DesktopWidgetConfig[],
  sourceWidgetId: string,
  targetWidgetId: string,
  dropAfterTarget: boolean,
  targetLane?: DesktopWidgetLane
) {
  const sourceIndex = widgets.findIndex((widget) => widget.id === sourceWidgetId);
  const targetIndex = widgets.findIndex((widget) => widget.id === targetWidgetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return widgets;
  }

  const nextWidgets = [...widgets];
  const [movedWidget] = nextWidgets.splice(sourceIndex, 1);
  const nextLane = targetLane ?? widgets[targetIndex]?.lane ?? movedWidget.lane;
  const nextMovedWidget = {
    ...movedWidget,
    ...buildDesktopWidgetPlacementForLane(nextLane)
  };
  const adjustedTargetIndex = nextWidgets.findIndex((widget) => widget.id === targetWidgetId);
  const insertIndex = adjustedTargetIndex === -1 ? nextWidgets.length : adjustedTargetIndex + (dropAfterTarget ? 1 : 0);

  nextWidgets.splice(insertIndex, 0, nextMovedWidget);
  return nextWidgets;
}

function moveDesktopWidgetToLane(widgets: DesktopWidgetConfig[], sourceWidgetId: string, targetLane: DesktopWidgetLane) {
  const sourceIndex = widgets.findIndex((widget) => widget.id === sourceWidgetId);

  if (sourceIndex === -1) {
    return widgets;
  }

  const nextWidgets = [...widgets];
  const [movedWidget] = nextWidgets.splice(sourceIndex, 1);
  const nextMovedWidget = {
    ...movedWidget,
    ...buildDesktopWidgetPlacementForLane(targetLane)
  };
  const lastLaneIndex = nextWidgets.reduce((lastIndex, widget, index) => (widget.lane === targetLane ? index : lastIndex), -1);

  nextWidgets.splice(lastLaneIndex + 1, 0, nextMovedWidget);

  return nextWidgets;
}

function buildDesktopTrendMetrics(stats: DashboardPayload["stats"], workspaceCounts?: DashboardPayload["workspaceCounts"]): DesktopMetricPoint[] {
  const statMetrics = stats.slice(0, 3).map((stat) => ({
    label: stat.label,
    value: parseDashboardMetricValue(stat.value),
    displayValue: stat.value
  }));

  const workspaceMetrics = workspaceCounts
    ? [
        { label: "Sales", value: workspaceCounts.sales, displayValue: String(workspaceCounts.sales) },
        { label: "Service", value: workspaceCounts.service, displayValue: String(workspaceCounts.service) },
        { label: "Parts", value: workspaceCounts.parts, displayValue: String(workspaceCounts.parts) },
        { label: "Website", value: workspaceCounts.website, displayValue: String(workspaceCounts.website) }
      ]
    : [];

  return [...statMetrics, ...workspaceMetrics].filter((metric) => metric.value > 0).slice(0, 6);
}

function parseDashboardMetricValue(value: string) {
  const numericValue = Number.parseFloat(value.replace(/[$,%]/g, "").replace(/,/g, ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function buildDesktopTrendPath(metrics: DesktopMetricPoint[]) {
  if (metrics.length === 0) {
    return "";
  }

  const maxValue = Math.max(...metrics.map((metric) => metric.value), 1);

  return metrics
    .map((metric, index) => {
      const x = metrics.length === 1 ? 18 : 18 + (index * 244) / (metrics.length - 1);
      const y = 66 - (metric.value / maxValue) * 48;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
}

function buildDesktopTrendFillPath(metrics: DesktopMetricPoint[]) {
  if (metrics.length === 0) {
    return "";
  }

  const lastX = metrics.length === 1 ? 18 : 18 + ((metrics.length - 1) * 244) / (metrics.length - 1);
  return `${buildDesktopTrendPath(metrics)} L ${lastX} 66 L 18 66 Z`;
}

function buildDesktopLaneGraphMetrics(workspaceCounts?: DashboardPayload["workspaceCounts"]): DesktopMetricPoint[] {
  return [
    { label: "Sales", value: workspaceCounts?.sales ?? 0, displayValue: String(workspaceCounts?.sales ?? 0) },
    { label: "Service", value: workspaceCounts?.service ?? 0, displayValue: String(workspaceCounts?.service ?? 0) },
    { label: "Parts", value: workspaceCounts?.parts ?? 0, displayValue: String(workspaceCounts?.parts ?? 0) },
    { label: "Website", value: workspaceCounts?.website ?? 0, displayValue: String(workspaceCounts?.website ?? 0) }
  ];
}

function buildDesktopReportRows(
  stats: DashboardPayload["stats"],
  laneGraphMetrics: DesktopMetricPoint[],
  moduleCards: Array<{ headline: string; meta: string; name: string; status: string }>
): DesktopReportRow[] {
  const statRows = stats.slice(0, 4).map<DesktopReportRow>((stat) => {
    const numericValue = parseDashboardMetricValue(stat.value);

    return {
      id: `report-stat-${stat.label}`,
      insight: stat.caption,
      label: stat.label,
      status: numericValue > 0 ? "stable" : "neutral",
      statusLabel: numericValue > 0 ? "Tracking" : "Waiting",
      value: stat.value,
      viewLabel: "KPI"
    };
  });

  const workspaceRows = laneGraphMetrics
    .filter((metric) => metric.value > 0)
    .map<DesktopReportRow>((metric) => {
      const matchingModule = moduleCards.find((moduleItem) => moduleItem.name.toLowerCase().includes(metric.label.toLowerCase()));
      const tone: DesktopReportRow["status"] = metric.value >= 8 ? "attention" : matchingModule?.status === "Online" ? "stable" : "neutral";

      return {
        id: `report-lane-${metric.label}`,
        insight: matchingModule?.headline ?? `${metric.displayValue} active records in ${metric.label}.`,
        label: `${metric.label} pipeline`,
        status: tone,
        statusLabel: tone === "attention" ? "Watch" : tone === "stable" ? "Healthy" : "Open",
        value: metric.displayValue,
        viewLabel: "Queue"
      };
    });

  return [...statRows, ...workspaceRows].slice(0, 6);
}

function buildDesktopGaugeMetrics(stats: DashboardPayload["stats"], laneGraphMetrics: DesktopMetricPoint[]): DesktopGaugeMetric[] {
  const baseMetrics =
    stats
      .slice(0, 3)
      .map((stat) => ({
        label: stat.label,
        value: parseDashboardMetricValue(stat.value),
        displayValue: stat.value
      }))
      .filter((metric) => metric.value > 0) || [];

  const fallbackMetrics = laneGraphMetrics.filter((metric) => metric.value > 0).slice(0, 3);
  const sourceMetrics = baseMetrics.length > 0 ? baseMetrics : fallbackMetrics;
  const gaugeCircumference = 264;

  return sourceMetrics.map((metric) => {
    const target = buildDesktopGaugeTarget(metric.value, metric.displayValue);
    const percent = Math.max(0, Math.min(100, Math.round((metric.value / target.targetValue) * 100)));
    const tone = percent >= 82 ? "stable" : percent >= 58 ? "neutral" : "attention";

    return {
      dashOffset: gaugeCircumference - (gaugeCircumference * percent) / 100,
      label: metric.label,
      percent,
      target: target.displayValue,
      tone,
      value: metric.displayValue
    };
  });
}

function buildDesktopGaugeTarget(value: number, displayValue: string) {
  if (displayValue.includes("%")) {
    return { targetValue: 100, displayValue: "100%" };
  }

  const paddedValue =
    value <= 10
      ? Math.ceil(Math.max(value, 1) / 5) * 5
      : value <= 100
        ? Math.ceil(value * 1.15 / 10) * 10
        : value <= 1000
          ? Math.ceil(value * 1.12 / 50) * 50
          : Math.ceil(value * 1.1 / 500) * 500;
  const targetValue = Math.max(paddedValue, Math.max(value, 1));

  return {
    targetValue,
    displayValue: displayValue.trim().startsWith("$") ? `$${targetValue.toLocaleString()}` : targetValue.toLocaleString()
  };
}

function buildDesktopFunnelSteps(metrics: DesktopMetricPoint[]): DesktopFunnelStep[] {
  const activeMetrics = metrics.filter((metric) => metric.value > 0);
  const maxValue = Math.max(...activeMetrics.map((metric) => metric.value), 1);

  return activeMetrics.map((metric, index) => {
    const previousValue = activeMetrics[index - 1]?.value ?? metric.value;
    const conversion = index === 0 ? 100 : Math.round((metric.value / Math.max(previousValue, 1)) * 100);
    const tone = conversion >= 82 ? "stable" : conversion >= 58 ? "neutral" : "attention";

    return {
      conversionLabel: index === 0 ? "Entry stage" : `${conversion}% of previous stage`,
      displayValue: metric.displayValue,
      id: `funnel-${metric.label}`,
      label: metric.label,
      tone,
      widthPercent: Math.round(42 + (metric.value / maxValue) * 58)
    };
  });
}

function buildDesktopDonutSegments(metrics: DesktopMetricPoint[]) {
  const activeMetrics = metrics.filter((metric) => metric.value > 0);
  const total = activeMetrics.reduce((sum, metric) => sum + metric.value, 0);
  let cursor = 0;

  return activeMetrics.map((metric, index) => {
    const percent = total === 0 ? 0 : (metric.value / total) * 100;
    const start = cursor;
    const end = cursor + percent;
    cursor = end;

    return {
      ...metric,
      color: desktopWidgetPalette[index % desktopWidgetPalette.length],
      start,
      end
    };
  });
}

function buildDesktopDonutGradient(segments: Array<{ color: string; end: number; start: number }>) {
  if (segments.length === 0) {
    return "conic-gradient(#dfeaf0 0 100%)";
  }

  return `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")})`;
}

function normalizeOpenWorkspacePreference(workspaceIds: WorkspaceId[]) {
  const seen = new Set<WorkspaceId>();

  return workspaceIds.filter((workspaceId) => {
    if (seen.has(workspaceId)) {
      return false;
    }

    seen.add(workspaceId);
    return true;
  });
}

function buildOpenWindowWorkspaceKey(workspaceId: WorkspaceId) {
  return `workspace:${workspaceId}`;
}

function buildOpenWindowDetailKey(windowEntry: Pick<ServiceDetailWindow, "roNumber" | "storeId">) {
  return `detail:${windowEntry.storeId}:${windowEntry.roNumber}`;
}

function normalizeOpenWindowOrderPreference(orderKeys: string[], workspaceIds: WorkspaceId[], windows: ServiceDetailWindow[]) {
  const candidateKeys = [
    ...workspaceIds.map((workspaceId) => buildOpenWindowWorkspaceKey(workspaceId)),
    ...windows.map((windowEntry) => buildOpenWindowDetailKey(windowEntry))
  ];
  const candidateKeySet = new Set(candidateKeys);
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const key of orderKeys) {
    if (!candidateKeySet.has(key) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(key);
  }

  for (const key of candidateKeys) {
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}

function sortOpenWindowRailItems<Item extends { key: string }>(items: Item[], orderKeys: string[]) {
  const orderLookup = new Map(orderKeys.map((key, index) => [key, index]));

  return [...items].sort((left, right) => {
    const leftIndex = orderLookup.get(left.key) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = orderLookup.get(right.key) ?? Number.MAX_SAFE_INTEGER;

    return leftIndex - rightIndex;
  });
}

function sortWorkspaceIdsByOpenWindowOrder(workspaceIds: WorkspaceId[], orderKeys: string[]) {
  return sortOpenWindowRailItems(
    workspaceIds.map((workspaceId) => ({ key: buildOpenWindowWorkspaceKey(workspaceId), workspaceId })),
    orderKeys
  ).map((item) => item.workspaceId);
}

function sortServiceDetailWindowsByOpenWindowOrder(windows: ServiceDetailWindow[], orderKeys: string[]) {
  return sortOpenWindowRailItems(
    windows.map((windowEntry) => ({ key: buildOpenWindowDetailKey(windowEntry), windowEntry })),
    orderKeys
  ).map((item) => item.windowEntry);
}

function readOpenServiceDetailWindowPreference(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.sessionStorage.getItem(`${OPEN_SERVICE_DETAIL_WINDOWS_STORAGE_PREFIX}:${userId}`);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeServiceDetailWindows(
      parsed.flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }

        const customerName = "customerName" in entry && typeof entry.customerName === "string" ? entry.customerName : "";
        const roNumber = "roNumber" in entry && typeof entry.roNumber === "string" ? entry.roNumber : "";
        const storeId = "storeId" in entry && typeof entry.storeId === "string" ? entry.storeId : "";

        return roNumber && storeId ? [{ customerName, roNumber, storeId }] : [];
      })
    );
  } catch {
    return [];
  }
}

function normalizeServiceDetailWindows(windows: ServiceDetailWindow[]) {
  const seen = new Set<string>();
  const normalized: ServiceDetailWindow[] = [];

  for (const windowEntry of windows) {
    const storeId = windowEntry.storeId.trim();
    const roNumber = windowEntry.roNumber.trim();

    if (!storeId || !roNumber) {
      continue;
    }

    const key = `${storeId}:${roNumber}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      customerName: windowEntry.customerName.trim(),
      roNumber,
      storeId
    });

    if (normalized.length >= 8) {
      break;
    }
  }

  return normalized;
}

function upsertServiceDetailWindow(current: ServiceDetailWindow[], nextWindow: ServiceDetailWindow) {
  const existingWindow = current.find(
    (windowEntry) => windowEntry.storeId === nextWindow.storeId && windowEntry.roNumber === nextWindow.roNumber
  );

  return normalizeServiceDetailWindows([
    {
      ...nextWindow,
      customerName: nextWindow.customerName || existingWindow?.customerName || ""
    },
    ...current.filter(
      (windowEntry) => !(windowEntry.storeId === nextWindow.storeId && windowEntry.roNumber === nextWindow.roNumber)
    )
  ]);
}

function reorderOpenWindowOrderPreference(
  currentOrderKeys: string[],
  visibleKeys: string[],
  sourceKey: string,
  targetKey: string,
  dropPosition: OpenWindowDropState["position"],
  workspaceIds: WorkspaceId[],
  windows: ServiceDetailWindow[]
) {
  const normalizedOrder = normalizeOpenWindowOrderPreference(currentOrderKeys, workspaceIds, windows);
  const sourceIndex = visibleKeys.indexOf(sourceKey);
  const targetIndex = visibleKeys.indexOf(targetKey);

  if (sourceIndex === -1 || targetIndex === -1) {
    return normalizedOrder;
  }

  const reorderedVisibleKeys = visibleKeys.filter((key) => key !== sourceKey);
  const adjustedTargetIndex = reorderedVisibleKeys.indexOf(targetKey);

  if (adjustedTargetIndex === -1) {
    return normalizedOrder;
  }

  reorderedVisibleKeys.splice(adjustedTargetIndex + (dropPosition === "after" ? 1 : 0), 0, sourceKey);

  const visibleKeySet = new Set(visibleKeys);
  let reorderedVisibleIndex = 0;

  return normalizedOrder.map((key) => {
    if (!visibleKeySet.has(key)) {
      return key;
    }

    const nextKey = reorderedVisibleKeys[reorderedVisibleIndex] ?? key;
    reorderedVisibleIndex += 1;
    return nextKey;
  });
}

function formatServiceDetailWindowTitle(windowEntry: ServiceDetailWindow) {
  return windowEntry.customerName ? `RO ${windowEntry.roNumber} - ${windowEntry.customerName}` : `RO ${windowEntry.roNumber}`;
}

function normalizeServiceQueueDraftValue(field: EditableServiceQueueField, value: string) {
  const normalizedValue = value.replace(/\r\n/g, "\n");

  if (field === "note") {
    return normalizedValue.slice(0, serviceQueueNoteMaxLength).trim();
  }

  return normalizedValue.trim();
}

function groupServiceNotificationsByRo(entries: ServiceNotificationEntry[]) {
  return entries.reduce<Record<string, ServiceNotificationEntry[]>>((current, entry) => {
    current[entry.roNumber] = [...(current[entry.roNumber] ?? []), entry];
    return current;
  }, {});
}

function buildServiceRowSignals(row: ServiceWorkspaceRow, notifications: ServiceNotificationEntry[]): ServiceRowSignal[] {
  const signals: ServiceRowSignal[] = [];

  for (const notification of notifications) {
    if (notification.kind === "customer") {
      signals.push({ label: "Cust Msg", tone: notification.unread ? "accent" : "neutral" });
      continue;
    }

    if (notification.kind === "techComplete") {
      signals.push({ label: "Tech Done", tone: notification.tone });
      continue;
    }

    if (notification.kind === "partsReceived") {
      signals.push({ label: "Parts In", tone: notification.tone });
      continue;
    }
  }

  if (row.category === "Parts Hold") {
    signals.push({ label: "Hold", tone: "attention" });
  }

  if (row.orderType === "Estimate") {
    signals.push({ label: "Estimate", tone: "neutral" });
  }

  if (row.roStatus === "Ready to Cash") {
    signals.push({ label: "Cash", tone: "stable" });
  }

  return signals.filter((signal, index, current) => current.findIndex((candidate) => candidate.label === signal.label) === index).slice(0, 3);
}

function matchesServiceQueueView(row: ServiceWorkspaceRow, queueView: ServiceQueueView, notifications: ServiceNotificationEntry[]) {
  if (queueView === "All") {
    return true;
  }

  if (queueView === "Estimates") {
    return row.orderType === "Estimate";
  }

  if (queueView === "Repair Orders") {
    return row.orderType === "Repair Order";
  }

  if (queueView === "Customer Reply") {
    return notifications.some((notification) => notification.kind === "customer");
  }

  if (queueView === "Tech Complete") {
    return notifications.some((notification) => notification.kind === "techComplete");
  }

  if (queueView === "Parts Received") {
    return notifications.some((notification) => notification.kind === "partsReceived");
  }

  if (queueView === "Parts Hold") {
    return row.category === "Parts Hold";
  }

  return true;
}

function matchesWorkspaceFilter(rowValue: string, filterValue: string) {
  return filterValue === "All" || rowValue === filterValue;
}

function matchesWorkspaceSearch(values: string[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalizedSearch));
}

function filterPartsLookupRows(rows: PartsWorkspaceRow[], searchTerm: string, searchField: PartsLookupSearchField) {
  return rows.filter((row) => matchesPartsLookupSearch(row, searchTerm, searchField));
}

function matchesPartsLookupSearch(row: PartsWorkspaceRow, searchTerm: string, searchField: PartsLookupSearchField) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  const searchValues =
    searchField === "partNumber" ? [row.partNumber] : searchField === "secondary" ? [row.secondary] : [row.description, row.category, row.source];

  return searchValues.some((value) => value.toLowerCase().includes(normalizedSearch));
}

function getPartsLookupAvailableQuantity(row: PartsWorkspaceRow) {
  return row.orderType === "PO" ? "0" : row.quantity;
}

function getPartsLookupLocation(row: PartsWorkspaceRow) {
  const normalizedSource = row.source.toLowerCase();

  if (normalizedSource.includes("repairorder") || normalizedSource.includes("service")) {
    return "Service";
  }

  if (row.orderType === "SPEC") {
    return "Web Order";
  }

  if (normalizedSource.includes("purchaseorder")) {
    return "Vendor";
  }

  return "Part Inventory";
}

function resolveSelectedRow<T extends { id: string }>(rows: T[], selectedRowId: string | null) {
  return rows.find((row) => row.id === selectedRowId) ?? rows[0] ?? null;
}

function getSelectedRowIdForWorkspace(
  workspaceId: WorkspaceId,
  selectedRowIds: {
    sales: string | null;
    service: string | null;
    parts: string | null;
    website: string | null;
  }
) {
  if (workspaceId === "sales") {
    return selectedRowIds.sales;
  }

  if (workspaceId === "service") {
    return selectedRowIds.service;
  }

  if (workspaceId === "parts") {
    return selectedRowIds.parts;
  }

  if (workspaceId === "website") {
    return selectedRowIds.website;
  }

  return null;
}

function applyWorkflowFocus(
  workspaceId: WorkspaceId,
  focusRowId: string | null,
  setters: {
    setSelectedSalesRowId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedServiceRowId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedPartsRowId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedWebsiteRowId: React.Dispatch<React.SetStateAction<string | null>>;
  }
) {
  if (workspaceId === "sales") {
    setters.setSelectedSalesRowId(focusRowId);
    return;
  }

  if (workspaceId === "service") {
    setters.setSelectedServiceRowId(focusRowId);
    return;
  }

  if (workspaceId === "parts") {
    setters.setSelectedPartsRowId(focusRowId);
    return;
  }

  if (workspaceId === "website") {
    setters.setSelectedWebsiteRowId(focusRowId);
  }
}

function createActionWorkflow(workspaceId: WorkspaceId, tool: string, context: WorkflowContext): ActionWorkflowState {
  switch (`${workspaceId}:${tool}`) {
    case "sales:New Lead":
      return createWorkflowState({
        title: "New Lead Intake",
        description: `Create a fresh lead lane for ${context.storeName}.`,
        commandLabel: tool,
        primaryActionLabel: "Stage Lead",
        tone: "accent",
        fields: [
          { key: "customerName", label: "Customer", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Prospect name" },
          { key: "interest", label: "Boat / Product", control: "text", defaultValue: context.salesRow ? `${context.salesRow.make} ${context.salesRow.model}` : "", placeholder: "Interest or package" },
          { key: "source", label: "Source", control: "select", defaultValue: "Website Lead", options: ["Website Lead", "Walk-In", "Phone Up", "Referral"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["customerName", "interest", "source"])
      });
    case "sales:New Quote":
      return createWorkflowState({
        title: "Quote Worksheet",
        description: `Stage a pricing worksheet before it reaches the desk.`,
        commandLabel: tool,
        primaryActionLabel: "Open Quote",
        tone: "accent",
        fields: [
          { key: "customerName", label: "Customer", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Buyer or prospect" },
          { key: "unit", label: "Unit", control: "text", defaultValue: context.salesRow ? `${context.salesRow.make} ${context.salesRow.model}` : "", placeholder: "Make and model" },
          { key: "targetPrice", label: "Target Price", control: "text", defaultValue: context.salesRow?.cashPrice ?? "", placeholder: "$0" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["customerName", "unit", "targetPrice"])
      });
    case "sales:New Deal":
      return createWorkflowState({
        title: "Deal Jacket",
        description: `Push an approved quote into a deal workflow with the desk data prefilled.`,
        commandLabel: tool,
        primaryActionLabel: "Create Deal",
        tone: "accent",
        fields: [
          { key: "customerName", label: "Customer", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Buyer name" },
          { key: "unit", label: "Unit", control: "text", defaultValue: context.salesRow ? `${context.salesRow.make} ${context.salesRow.model}` : "", placeholder: "Boat or engine" },
          { key: "worksheet", label: "Worksheet", control: "text", defaultValue: context.salesRow?.worksheet ?? "", placeholder: "Worksheet #" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["customerName", "unit", "worksheet"])
      });
    case "sales:Take Deposit":
      return createWorkflowState({
        title: "Deposit Capture",
        description: `Move buyer funds into the deal desk without leaving the sales board.`,
        commandLabel: tool,
        primaryActionLabel: "Post Deposit",
        tone: "stable",
        fields: [
          { key: "customerName", label: "Customer", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Buyer name" },
          { key: "amount", label: "Amount", control: "text", defaultValue: "$5,000", placeholder: "$0" },
          { key: "method", label: "Payment Method", control: "select", defaultValue: "ACH", options: ["ACH", "Credit Card", "Check"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["customerName", "amount", "method"])
      });
    case "sales:Marketing":
      return createWorkflowState({
        title: "Campaign Push",
        description: `Push the selected sales lane into a campaign or remarketing sequence.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Campaign",
        tone: "neutral",
        fields: [
          { key: "campaign", label: "Campaign", control: "text", defaultValue: "Weekend follow-up", placeholder: "Campaign name" },
          { key: "audience", label: "Audience", control: "select", defaultValue: "Open quotes", options: ["Open quotes", "Unworked leads", "Recent deposits"] },
          { key: "note", label: "Operator Note", control: "textarea", defaultValue: "", placeholder: "What should happen next?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["campaign", "audience", "note"])
      });
    case "sales:Send Message":
      return createWorkflowState({
        title: "Outbound Message",
        description: `Route a quick message through the operator lane without leaving the board.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Message",
        tone: "neutral",
        fields: [
          { key: "recipient", label: "Recipient", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Customer or team" },
          { key: "channel", label: "Channel", control: "select", defaultValue: "Email", options: ["Email", "SMS", "CRM Task"] },
          { key: "message", label: "Message", control: "textarea", defaultValue: "", placeholder: "Message body" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["recipient", "channel", "message"])
      });
    case "sales:Sales Report":
      return createWorkflowState({
        title: "Sales Report Runner",
        description: `Queue a sales report without leaving the desk board.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Report",
        tone: "neutral",
        fields: [
          {
            key: "reportName",
            label: "Report",
            control: "select",
            defaultValue: "Salesperson Insights",
            options: [
              "Salesperson Insights",
              "Sales Velocity",
              "Lead Source Mix",
              "Desk Productivity",
              "Closing Ratio Summary",
              "Gross Profit Summary",
              "Custom Sales Reports",
              "Favorite Sales Board"
            ]
          },
          { key: "window", label: "Window", control: "select", defaultValue: "30 Days", options: ["Today", "7 Days", "30 Days", "MTD", "QTD"] },
          { key: "delivery", label: "Delivery", control: "select", defaultValue: "Operator Queue", options: ["Operator Queue", "Export", "Email PDF"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["reportName", "window", "delivery"])
      });
    case "sales:Sales Desk Setup":
      return createWorkflowState({
        title: "Sales Desk Setup",
        description: `Review lead-routing and salesperson assignment controls without leaving the board.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Setup Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Setup Area",
            control: "select",
            defaultValue: "Salesperson Assignment",
            options: ["Salesperson Assignment", "Lead Source Setup"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Sales Desk", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "sales:Sales Workflow Setup":
      return createWorkflowState({
        title: "Sales Workflow Setup",
        description: `Review quote layouts and desk workflow rules with rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Workflow Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Workflow Area",
            control: "select",
            defaultValue: "Quote Form Layouts",
            options: ["Quote Form Layouts", "Deal Status Rules"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Sales Desk", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "sales:Inventory Review":
      return createWorkflowState({
        title: "Inventory Visibility",
        description: `Review major-unit inventory and locator signals from the sales board.`,
        commandLabel: tool,
        primaryActionLabel: "Open Inventory View",
        tone: "neutral",
        fields: [
          {
            key: "view",
            label: "View",
            control: "select",
            defaultValue: "Major Unit Inventory",
            options: ["Major Unit Inventory", "Major Unit Locator", "Incoming Unit Schedule", "Aged Inventory Watch"]
          },
          { key: "unit", label: "Unit", control: "text", defaultValue: context.salesRow ? `${context.salesRow.make} ${context.salesRow.model}` : "", placeholder: "Make and model" },
          { key: "stock", label: "Stock #", control: "text", defaultValue: context.salesRow?.stock ?? "", placeholder: "Stock number" },
          { key: "window", label: "Window", control: "select", defaultValue: "All units", options: ["All units", "In stock", "Incoming 30 Days", "Aged 90+", "Dealer group"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["view", "unit", "window"])
      });
    case "sales:Pricing Review":
      return createWorkflowState({
        title: "Pricing Review",
        description: `Stage pricing and promotion work without leaving the sales desk.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Pricing Review",
        tone: "neutral",
        fields: [
          {
            key: "focus",
            label: "Focus",
            control: "select",
            defaultValue: "Consumer Promos",
            options: ["Consumer Promos", "Rebate Matrix", "Package Builder", "MSRP Override Review"]
          },
          { key: "unit", label: "Unit", control: "text", defaultValue: context.salesRow ? `${context.salesRow.make} ${context.salesRow.model}` : "", placeholder: "Make and model" },
          { key: "strategy", label: "Strategy", control: "select", defaultValue: "Retail pricing", options: ["Retail pricing", "Promo bundle", "Rebate stack", "Manager approval"] },
          { key: "note", label: "Pricing Note", control: "textarea", defaultValue: "", placeholder: "What needs review?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["focus", "unit", "strategy"])
      });
    case "sales:Finance Review":
      return createWorkflowState({
        title: "Finance Review",
        description: `Queue finance and compliance work from the active sales lane.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Finance Review",
        tone: "stable",
        fields: [
          {
            key: "queue",
            label: "Queue",
            control: "select",
            defaultValue: "Credit Application Queue",
            options: ["Credit Application Queue", "Lender Follow-Up", "Compliance Packet"]
          },
          { key: "customer", label: "Customer", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Buyer name" },
          { key: "lender", label: "Lender / Owner", control: "text", defaultValue: "", placeholder: "Lender or owner" },
          { key: "dueWindow", label: "Due Window", control: "select", defaultValue: "Today", options: ["Today", "48 Hours", "This Week"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["queue", "customer", "dueWindow"])
      });
    case "sales:Sales Favorite View":
      return createWorkflowState({
        title: "Sales Favorite View",
        description: `Recall a saved sales board or favorite workflow with ownership and recall timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Favorite",
        tone: "stable",
        fields: [
          {
            key: "favoriteView",
            label: "Favorite",
            control: "select",
            defaultValue: "Favorite Lead Queue",
            options: [
              "Favorite Lead Queue",
              "Favorite Deal Desk",
              "Favorite Funding Watch",
              "Favorite Delivery Board",
              "Favorite Sales Reports",
              "Favorite Appraisal Log",
              "Favorite Promotions",
              "Favorite Sold Board"
            ]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Sales Desk", placeholder: "Owner or team" },
          { key: "recallWindow", label: "Recall Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "Pinned"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["favoriteView", "owner", "recallWindow"])
      });
    case "sales:Sales Finance Setup":
      return createWorkflowState({
        title: "Sales Finance Setup",
        description: `Review finance-control setup with ownership and rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Finance Setup",
        tone: "stable",
        fields: [
          {
            key: "setupArea",
            label: "Finance Control",
            control: "select",
            defaultValue: "Rate Tables",
            options: ["Rate Tables", "Doc Fee Setup", "Menu Template Library", "Compliance Forms"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "F&I", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "sales:Delivery Review":
      return createWorkflowState({
        title: "Delivery Review",
        description: `Stage sold-unit delivery work from the sales board.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Delivery",
        tone: "stable",
        fields: [
          {
            key: "queue",
            label: "Queue",
            control: "select",
            defaultValue: "Delivery Checklist",
            options: ["Delivery Checklist", "We Owe Log", "Sold Not Delivered", "Delivery Calendar", "Delivery Packets"]
          },
          { key: "customer", label: "Customer", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Buyer name" },
          { key: "unit", label: "Unit", control: "text", defaultValue: context.salesRow ? `${context.salesRow.make} ${context.salesRow.model}` : "", placeholder: "Boat or engine" },
          { key: "targetDate", label: "Target Date", control: "text", defaultValue: "Next available", placeholder: "Delivery target" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["queue", "customer", "targetDate"])
      });
    case "sales:Customer Review":
      return createWorkflowState({
        title: "Customer Review",
        description: `Stage CRM and customer follow-up review from the active sales lane.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Review",
        tone: "neutral",
        fields: [
          {
            key: "view",
            label: "View",
            control: "select",
            defaultValue: "Prospect 360",
            options: ["Prospect 360", "Duplicate Customer Review", "Lost Prospect Recovery", "Referral Tracker", "Birthday & Anniversary List"]
          },
          { key: "customer", label: "Customer", control: "text", defaultValue: context.salesRow?.customer ?? "", placeholder: "Customer or prospect" },
          { key: "owner", label: "Owner", control: "text", defaultValue: context.operatorName, placeholder: "Owner or team" },
          { key: "nextAction", label: "Next Action", control: "select", defaultValue: "Review", options: ["Review", "Reach out", "Recover", "Merge"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["view", "customer", "nextAction"])
      });
    case "service:New Estimate":
      return createWorkflowState({
        title: "Estimate Intake",
        description: `Stage a new estimate from the service lane with unit context attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Estimate",
        tone: "accent",
        fields: [
          { key: "customerName", label: "Customer", control: "text", defaultValue: context.serviceRow?.customerName ?? "", placeholder: "Customer name" },
          { key: "unit", label: "Unit / Model", control: "text", defaultValue: context.serviceRow?.model ?? "", placeholder: "Model or rig" },
          { key: "concern", label: "Complaint", control: "textarea", defaultValue: context.serviceRow?.note ?? "", placeholder: "What does the customer need?" }
        ],
        buildPreviewItems: (values) => buildServiceIntakeWorkflowPreviewItems("Estimate", values, context),
        buildDetail: (values) => summarizeWorkflowValues(values, ["customerName", "unit", "concern"])
      });
    case "service:New Repair Order":
      return createWorkflowState({
        title: "Repair Order Intake",
        description: `Create a new RO shell with the currently focused customer and stock ready to go.`,
        commandLabel: tool,
        primaryActionLabel: "Create RO",
        tone: "accent",
        fields: [
          { key: "customerName", label: "Customer", control: "text", defaultValue: context.serviceRow?.customerName ?? "", placeholder: "Customer name" },
          { key: "model", label: "Unit / Model", control: "text", defaultValue: context.serviceRow?.model ?? "", placeholder: "Model or rig" },
          { key: "stockNumber", label: "Stock #", control: "text", defaultValue: context.serviceRow?.stockNumber ?? "", placeholder: "Stock or serial" },
          { key: "concern", label: "Primary Concern", control: "textarea", defaultValue: context.serviceRow?.note ?? "", placeholder: "Complaint or requested work" }
        ],
        buildPreviewItems: (values) => buildServiceIntakeWorkflowPreviewItems("Repair Order", values, context),
        buildDetail: (values) => summarizeWorkflowValues(values, ["customerName", "model", "stockNumber"])
      });
    case "service:Technician Time Entry":
      return createWorkflowState({
        title: "Technician Time Entry",
        description: `Stage a technician time-entry update without leaving the service lane.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Time Entry",
        tone: "neutral",
        fields: [
          { key: "technician", label: "Technician", control: "text", defaultValue: context.serviceRow?.serviceWriter ?? "", placeholder: "Technician name" },
          { key: "roNumber", label: "RO #", control: "text", defaultValue: context.serviceRow?.roNumber ?? "", placeholder: "Repair order #" },
          { key: "hours", label: "Hours", control: "text", defaultValue: "1.0", placeholder: "0.0" },
          { key: "operation", label: "Operation", control: "text", defaultValue: "Diagnostic", placeholder: "What was performed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["technician", "roNumber", "hours"])
      });
    case "service:Warranty Claims":
      return createWorkflowState({
        title: "Warranty Claim Intake",
        description: `Start a warranty claim packet from the current service lane.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Claim",
        tone: "attention",
        fields: [
          { key: "roNumber", label: "RO #", control: "text", defaultValue: context.serviceRow?.roNumber ?? "", placeholder: "Repair order #" },
          { key: "claimType", label: "Claim Type", control: "select", defaultValue: "Standard", options: ["Standard", "Pre-Authorization", "Goodwill"] },
          { key: "carrier", label: "Carrier", control: "text", defaultValue: context.serviceRow?.maker ?? "", placeholder: "OEM or carrier" },
          { key: "note", label: "Claim Note", control: "textarea", defaultValue: context.serviceRow?.note ?? "", placeholder: "What needs to be filed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["roNumber", "claimType", "carrier"])
      });
    case "service:Duplicate":
      return createWorkflowState({
        title: "Duplicate RO Shell",
        description: `Clone the current lane into a new service document for follow-up work.`,
        commandLabel: tool,
        primaryActionLabel: "Duplicate RO",
        tone: "neutral",
        fields: [{ key: "reason", label: "Reason", control: "text", defaultValue: "Follow-up repair", placeholder: "Why duplicate this lane?" }],
        buildPreviewItems: (values) => buildServiceDuplicateWorkflowPreviewItems(values, context),
        buildDetail: (values) => summarizeWorkflowValues(values, ["reason"])
      });
    case "service:Print":
      return createWorkflowState({
        title: "Print Queue",
        description: `Route a service document to the right printer or PDF queue.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Print",
        tone: "neutral",
        fields: [
          {
            key: "documentType",
            label: "Document",
            control: "select",
            defaultValue: context.serviceRow?.orderType === "Estimate" ? "Estimate" : "RO Jacket",
            options:
              context.serviceRow?.orderType === "Estimate"
                ? ["Estimate", "Estimate Summary", "Customer Approval"]
                : ["RO Jacket", "Estimate", "Work Order"]
          },
          { key: "destination", label: "Destination", control: "select", defaultValue: "Front Desk", options: ["Front Desk", "Shop Printer", "PDF Queue"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["documentType", "destination"])
      });
    case "service:Report":
      return createWorkflowState({
        title: "Service Report Runner",
        description: `Stage a service report without leaving the writer queue.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Report",
        tone: "neutral",
        fields: [
          {
            key: "reportName",
            label: "Report",
            control: "select",
            defaultValue: "Open ROs",
            options: [
              "Open ROs",
              "Warranty Holds",
              "Technician Load",
              "Service Promise Board",
              "Comeback Watch",
              "Labor Sales Summary",
              "Effective Labor Rate",
              "Comeback Cost Review",
              "Sublet Analysis",
              "Custom Reports"
            ]
          },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "7 Days", "30 Days", "MTD"] },
          { key: "delivery", label: "Delivery", control: "select", defaultValue: "Operator Queue", options: ["Operator Queue", "Export", "Email PDF"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["reportName", "window", "delivery"])
      });
    case "service:Service Favorite View":
      return createWorkflowState({
        title: "Service Favorite View",
        description: `Recall a saved service board or favorite workflow with ownership and recall timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Favorite",
        tone: "stable",
        fields: [
          {
            key: "favoriteView",
            label: "Favorite",
            control: "select",
            defaultValue: "Favorite Service Board",
            options: ["Favorite Service Board", "Favorite Dispatch Board", "Favorite Promise Watch", "Favorite Pickup Ready", "Favorite Warranty Board"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Service Admin", placeholder: "Owner or team" },
          { key: "recallWindow", label: "Recall Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "Pinned"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["favoriteView", "owner", "recallWindow"])
      });
    case "service:Service Intake Review":
      return createWorkflowState({
        title: "Service Intake Review",
        description: `Review intake posture, ownership, and the next customer touch from the service lane.`,
        commandLabel: tool,
        primaryActionLabel: "Open Intake Review",
        tone: "neutral",
        fields: [
          {
            key: "intakeFocus",
            label: "Intake Focus",
            control: "select",
            defaultValue: "Check-In Board",
            options: ["Check-In Board", "Promise Date Entry", "Pickup Appointment Queue", "Unit Intake Photos"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: context.serviceRow?.serviceWriter ?? context.operatorName, placeholder: "Owner or team" },
          { key: "note", label: "Intake Note", control: "textarea", defaultValue: "", placeholder: "What needs intake follow-up?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["intakeFocus", "owner", "note"])
      });
    case "service:Service Dispatch Review":
      return createWorkflowState({
        title: "Service Dispatch Review",
        description: `Open dispatch and promise-date control with owner and timing context attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Dispatch Review",
        tone: "neutral",
        fields: [
          {
            key: "dispatchView",
            label: "Dispatch View",
            control: "select",
            defaultValue: "Dispatch Board",
            options: ["Dispatch Board", "Bay Schedule", "Work In Progress", "Promise Date Watch"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Dispatch", placeholder: "Owner or team" },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "Current Shift"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["dispatchView", "owner", "window"])
      });
    case "service:Service Workbench Review":
      return createWorkflowState({
        title: "Service Workbench Review",
        description: `Stage service workbench review with RO context and operator notes ready to go.`,
        commandLabel: tool,
        primaryActionLabel: "Open Workbench",
        tone: "neutral",
        fields: [
          {
            key: "workbenchView",
            label: "Workbench View",
            control: "select",
            defaultValue: "Repair Order Detail",
            options: ["Repair Order Detail", "Job Workbench", "Labor Sessions", "Recommendations Queue", "Detail Review", "Repair Orders", "Estimate Worksheets"]
          },
          { key: "roNumber", label: "RO #", control: "text", defaultValue: context.serviceRow?.roNumber ?? "", placeholder: "Repair order #" },
          { key: "note", label: "Workbench Note", control: "textarea", defaultValue: context.serviceRow?.note ?? "", placeholder: "What should be reviewed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["workbenchView", "roNumber", "note"])
      });
    case "service:Service Quality Review":
      return createWorkflowState({
        title: "Service Quality Review",
        description: `Queue quality-control follow-up with ownership and note context from the service lane.`,
        commandLabel: tool,
        primaryActionLabel: "Open Quality Review",
        tone: "attention",
        fields: [
          {
            key: "qualityFocus",
            label: "Quality Focus",
            control: "select",
            defaultValue: "Final Inspection",
            options: ["Final Inspection", "Sea Trial Checklist", "Delivery Prep Queue", "Comeback Watch"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Shop Foreman", placeholder: "Owner or team" },
          { key: "note", label: "Quality Note", control: "textarea", defaultValue: "", placeholder: "What needs review?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["qualityFocus", "owner", "note"])
      });
    case "service:Service Warranty Review":
      return createWorkflowState({
        title: "Service Warranty Review",
        description: `Open warranty review with queue ownership and a current review window.`,
        commandLabel: tool,
        primaryActionLabel: "Open Warranty Review",
        tone: "attention",
        fields: [
          {
            key: "warrantyQueue",
            label: "Warranty Queue",
            control: "select",
            defaultValue: "Pre-Authorization Queue",
            options: [
              "Warranty Packets",
              "Pre-Authorization Queue",
              "Carrier Submission Queue",
              "Claim Status Review",
              "Warranty Receivables",
              "Deductible Review",
              "Delayed Claim Watch",
              "Claim Audit Trail"
            ]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Warranty", placeholder: "Owner or team" },
          { key: "reviewWindow", label: "Review Window", control: "select", defaultValue: "This Week", options: ["Today", "This Week", "Month End"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["warrantyQueue", "owner", "reviewWindow"])
      });
    case "service:Service Communication Review":
      return createWorkflowState({
        title: "Service Communication Review",
        description: `Stage service communication follow-up with the next customer step already attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Follow-Up Review",
        tone: "neutral",
        fields: [
          {
            key: "communicationQueue",
            label: "Communication Queue",
            control: "select",
            defaultValue: "Approval Needed Queue",
            options: ["Approval Needed Queue", "Pickup Ready Queue", "Status Update Log", "Promise Risk Alerts", "Follow-Up Callbacks"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: context.serviceRow?.serviceWriter ?? context.operatorName, placeholder: "Owner or team" },
          { key: "nextStep", label: "Next Step", control: "select", defaultValue: "Review", options: ["Review", "Call Customer", "Send Update", "Escalate"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["communicationQueue", "owner", "nextStep"])
      });
    case "service:Service Department Setup":
      return createWorkflowState({
        title: "Service Department Setup",
        description: `Review core service department setup with ownership and rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Setup Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Setup Area",
            control: "select",
            defaultValue: "Labor Rate Setup",
            options: ["Labor Rate Setup", "Job Code Library", "Service Writer Assignments", "Print Form Layouts"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Service Admin", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "service:Service Policy Setup":
      return createWorkflowState({
        title: "Service Policy Setup",
        description: `Review service policy controls with ownership and rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Policy Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Policy Area",
            control: "select",
            defaultValue: "Approval Limits",
            options: ["Approval Limits", "Promise Date Rules", "Warranty Policy Matrix", "Role Access Review"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Service Admin", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "service:Service Workflow Setup":
      return createWorkflowState({
        title: "Service Workflow Setup",
        description: `Review service workflow controls with ownership and rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Workflow Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Workflow Area",
            control: "select",
            defaultValue: "Status Rules",
            options: ["Status Rules", "Notification Triggers", "Dispatch Priorities", "Inspection Templates"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Service Admin", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "service:Service Utility Review":
      return createWorkflowState({
        title: "Service Utility Review",
        description: `Open service utilities with owner and timing controls for cleanup or export work.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Utility Review",
        tone: "neutral",
        fields: [
          {
            key: "utilityAction",
            label: "Utility Action",
            control: "select",
            defaultValue: "Capacity Planner",
            options: [
              "Capacity Planner",
              "Bay Availability Matrix",
              "Loaner Schedule",
              "Pickup Calendar",
              "Archive Closed ROs",
              "Merge Duplicate Units",
              "Repair Order Renumbering",
              "Rebuild Search Index",
              "Export Queue",
              "Service Data Extracts",
              "Mobile Tech Sync",
              "Vendor File Exchange"
            ]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Service Admin", placeholder: "Owner or team" },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "After Close"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["utilityAction", "owner", "window"])
      });
    case "service:Detail":
      return createWorkflowState({
        title: "RO Detail Packet",
        description: `Prepare the selected service lane for a deeper operator review.`,
        commandLabel: tool,
        primaryActionLabel: "Stage Detail",
        tone: "stable",
        fields: [
          { key: "roNumber", label: "RO #", control: "text", defaultValue: context.serviceRow?.roNumber ?? "", placeholder: "RO #" },
          { key: "owner", label: "Owner", control: "text", defaultValue: context.serviceRow?.serviceWriter ?? "", placeholder: "Writer or manager" },
          { key: "note", label: "Packet Note", control: "textarea", defaultValue: context.serviceRow?.note ?? "", placeholder: "What should be reviewed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["roNumber", "owner", "note"])
      });
    case "parts:Guide":
      return createWorkflowState({
        title: "Parts Guide Note",
        description: `Attach a quick guidance note to the currently focused part lane.`,
        commandLabel: tool,
        primaryActionLabel: "Attach Guide",
        tone: "neutral",
        fields: [
          { key: "partNumber", label: "Part Number", control: "text", defaultValue: context.partsRow?.partNumber ?? "", placeholder: "Part number" },
          { key: "note", label: "Guide Note", control: "textarea", defaultValue: "", placeholder: "Installation or ordering note" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["partNumber", "note"])
      });
    case "parts:Purchase Order":
      return createWorkflowState({
        title: "Purchase Order Draft",
        description: `Stage a PO directly from the selected parts lane.`,
        commandLabel: tool,
        primaryActionLabel: "Create PO",
        tone: "accent",
        fields: [
          { key: "supplier", label: "Supplier", control: "text", defaultValue: context.partsRow?.supplier ?? "", placeholder: "Vendor code" },
          { key: "partNumber", label: "Part Number", control: "text", defaultValue: context.partsRow?.partNumber ?? "", placeholder: "Part number" },
          { key: "quantity", label: "Quantity", control: "text", defaultValue: context.partsRow?.quantity ?? "1", placeholder: "Qty" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["supplier", "partNumber", "quantity"])
      });
    case "parts:Delete Selected":
      return createWorkflowState({
        title: "Delete Selected Line",
        description: `Stage a removal request for the currently focused parts lane.`,
        commandLabel: tool,
        primaryActionLabel: "Remove Line",
        tone: "attention",
        fields: [
          { key: "partNumber", label: "Part Number", control: "text", defaultValue: context.partsRow?.partNumber ?? "", placeholder: "Part number" },
          { key: "reason", label: "Reason", control: "select", defaultValue: "Ordered in Error", options: ["Ordered in Error", "Vendor Hold", "Duplicate"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["partNumber", "reason"])
      });
    case "parts:Parts Inventory Review":
      return createWorkflowState({
        title: "Parts Inventory Review",
        description: `Review inventory, lookup, and availability posture from one parts workflow.`,
        commandLabel: tool,
        primaryActionLabel: "Open Inventory Review",
        tone: "neutral",
        fields: [
          {
            key: "inventoryView",
            label: "Inventory View",
            control: "select",
            defaultValue: "Parts Inventory",
            options: [
              "Parts Inventory",
              "Part Number Lookup",
              "Secondary Number Lookup",
              "Description Search",
              "Cycle Counts",
              "Bin Location Review",
              "On-Hand Adjustments",
              "Stock Status Review",
              "Price Matrix Review",
              "Availability Watch",
              "Substitute Parts",
              "Stocking Class Review"
            ]
          },
          { key: "supplier", label: "Supplier", control: "text", defaultValue: context.partsRow?.supplier ?? "", placeholder: "Preferred vendor or supplier" },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "7 Days", "30 Days"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["inventoryView", "supplier", "window"])
      });
    case "parts:Parts Purchasing Review":
      return createWorkflowState({
        title: "Parts Purchasing Review",
        description: `Open purchasing and vendor follow-up with supplier ownership and due timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Purchasing Review",
        tone: "accent",
        fields: [
          {
            key: "purchasingQueue",
            label: "Purchasing Queue",
            control: "select",
            defaultValue: "Ordering",
            options: [
              "Ordering",
              "Purchase Order Queue",
              "Emergency Buy",
              "Transfer Requests",
              "Special Orders",
              "Backorder Review",
              "Drop Ship Requests",
              "Supplier Follow-Up",
              "Preferred Vendor Matrix",
              "Vendor Lead Times",
              "Open Vendor Claims",
              "Supplier Scorecards",
              "Parts Purchase Orders",
              "Special Order Slips"
            ]
          },
          { key: "supplier", label: "Supplier", control: "text", defaultValue: context.partsRow?.supplier ?? "", placeholder: "Vendor or supplier" },
          { key: "dueWindow", label: "Due Window", control: "select", defaultValue: "Today", options: ["Today", "48 Hours", "This Week"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["purchasingQueue", "supplier", "dueWindow"])
      });
    case "parts:Parts Receiving Review":
      return createWorkflowState({
        title: "Parts Receiving Review",
        description: `Stage receiving, return, and exception review with owner and timing context.`,
        commandLabel: tool,
        primaryActionLabel: "Open Receiving Review",
        tone: "attention",
        fields: [
          {
            key: "receivingQueue",
            label: "Receiving Queue",
            control: "select",
            defaultValue: "Receiving",
            options: [
              "Receiving",
              "Receipt Match Queue",
              "Vendor Discrepancies",
              "Core Tracking",
              "Vendor Returns",
              "Warranty Returns",
              "Return Authorizations",
              "Damaged Goods Hold",
              "Packing Slip Variances",
              "Missing Core Follow-Up",
              "Freight Damage Review",
              "Receipt Audit Trail",
              "Receiving Exceptions"
            ]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Receiving", placeholder: "Owner or team" },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "MTD"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["receivingQueue", "owner", "window"])
      });
    case "parts:Parts Counter Review":
      return createWorkflowState({
        title: "Parts Counter Review",
        description: `Open counter and ticket-control work with the next operator step attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Counter Review",
        tone: "neutral",
        fields: [
          {
            key: "counterQueue",
            label: "Counter Queue",
            control: "select",
            defaultValue: "Cashiering",
            options: [
              "Cashiering",
              "Counter Sale Entry",
              "Will Call Queue",
              "Quote Builder",
              "Technician Parts Requests",
              "Open Pick Tickets",
              "Install Prep Queue",
              "Service Parts Staging",
              "Hold Tickets",
              "Pending Invoice Review",
              "Counter Closeout",
              "Refund Approvals"
            ]
          },
          { key: "customer", label: "Customer / Internal Lane", control: "text", defaultValue: "", placeholder: "Customer or lane owner" },
          { key: "nextStep", label: "Next Step", control: "select", defaultValue: "Review", options: ["Review", "Stage", "Call Customer", "Escalate"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["counterQueue", "customer", "nextStep"])
      });
    case "parts:Parts Report Review":
      return createWorkflowState({
        title: "Parts Report Review",
        description: `Queue parts lists, reporting, and scheduled output with the right delivery path.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Report",
        tone: "neutral",
        fields: [
          {
            key: "reportName",
            label: "Report",
            control: "select",
            defaultValue: "Fill Rate Summary",
            options: [
              "Lists",
              "Bin Labels",
              "Cycle Count Sheets",
              "Price Update Queue",
              "Reports",
              "Fill Rate Summary",
              "Lost Sales Report",
              "Obsolescence Report",
              "Custom Reports",
              "Gross Margin Detail",
              "Return Activity Report",
              "Vendor Spend Analysis",
              "Counter Closeout Summary",
              "Saved Report Sets",
              "Scheduled Report Runs",
              "Report Delivery Queue",
              "Export History",
              "Parts Fill Rate",
              "Obsolescence Watch",
              "Vendor Performance"
            ]
          },
          { key: "window", label: "Window", control: "select", defaultValue: "30 Days", options: ["Today", "7 Days", "30 Days", "MTD"] },
          { key: "delivery", label: "Delivery", control: "select", defaultValue: "Operator Queue", options: ["Operator Queue", "Export", "Email PDF"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["reportName", "window", "delivery"])
      });
    case "parts:Parts Favorite View":
      return createWorkflowState({
        title: "Parts Favorite View",
        description: `Recall a saved parts board, queue, or shortcut with ownership and recall timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Favorite",
        tone: "stable",
        fields: [
          {
            key: "favoriteView",
            label: "Favorite",
            control: "select",
            defaultValue: "Favorite PO Queue",
            options: [
              "Favorite PO Queue",
              "Favorite Receiving Queue",
              "Favorite Parts Reports",
              "Favorite Vendor Scorecards",
              "Favorite Fill Rate View",
              "Favorite Counter Closeout",
              "Favorite Parts Board",
              "Favorite Catalog Sync"
            ]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Parts Admin", placeholder: "Owner or team" },
          { key: "recallWindow", label: "Recall Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "Pinned"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["favoriteView", "owner", "recallWindow"])
      });
    case "parts:Parts Catalog Setup":
      return createWorkflowState({
        title: "Parts Catalog Setup",
        description: `Review parts catalog maintenance and accessory bundle setup with rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Setup Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Setup Area",
            control: "select",
            defaultValue: "Vendor Catalog Sync",
            options: ["Vendor Catalog Sync", "Supersession Review", "Kit Assemblies", "Accessory Bundles"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Parts Admin", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "parts:Parts Security Setup":
      return createWorkflowState({
        title: "Parts Security Setup",
        description: `Review parts security and approval controls with rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Security Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Security Area",
            control: "select",
            defaultValue: "Counter Permissions",
            options: ["Counter Permissions", "Approval Limits", "Parts Overrides", "Role Access Review"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Parts Admin", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "parts:Parts Department Setup":
      return createWorkflowState({
        title: "Parts Department Setup",
        description: `Review parts department setup and pricing controls with rollout timing attached.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Department Review",
        tone: "neutral",
        fields: [
          {
            key: "setupArea",
            label: "Department Area",
            control: "select",
            defaultValue: "Tax & Fee Setup",
            options: ["Tax & Fee Setup", "Core Charge Table", "Discount Rules", "Print Form Layouts"]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Parts Admin", placeholder: "Owner or team" },
          { key: "effectiveWindow", label: "Effective Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupArea", "owner", "effectiveWindow"])
      });
    case "parts:Parts Utility Review":
      return createWorkflowState({
        title: "Parts Utility Review",
        description: `Open parts utility and cleanup flows with owner and timing controls.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Utility Review",
        tone: "neutral",
        fields: [
          {
            key: "utilityAction",
            label: "Utility Action",
            control: "select",
            defaultValue: "Barcode Utilities",
            options: [
              "Barcode Utilities",
              "Label Reprint Queue",
              "Bin Label Designer",
              "Shelf Tag Runs",
              "Import Staging",
              "Export Queue",
              "Vendor File Drops",
              "Price File Updates",
              "Archive Closed Tickets",
              "Purge Temp Holds",
              "Merge Duplicate Parts",
              "Rebuild Search Index"
            ]
          },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Parts Admin", placeholder: "Owner or team" },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "After Close"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["utilityAction", "owner", "window"])
      });
    case "analytics:Forecast":
      return createWorkflowState({
        title: "Forecast Pull",
        description: `Stage a forecast packet from the executive board.`,
        commandLabel: tool,
        primaryActionLabel: "Run Forecast",
        tone: "stable",
        fields: [
          { key: "window", label: "Window", control: "select", defaultValue: "30 Days", options: ["30 Days", "60 Days", "90 Days"] },
          { key: "note", label: "Leadership Note", control: "textarea", defaultValue: "", placeholder: "What should this forecast emphasize?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["window", "note"])
      });
    case "analytics:Management Forecast":
      return createWorkflowState({
        title: "Leadership Forecast",
        description: `Assemble a management forecast view tuned for executive follow-up.`,
        commandLabel: tool,
        primaryActionLabel: "Run Forecast",
        tone: "stable",
        fields: [
          { key: "window", label: "Forecast Window", control: "select", defaultValue: "60 Days", options: ["30 Days", "60 Days", "90 Days"] },
          {
            key: "forecastFocus",
            label: "Forecast Focus",
            control: "select",
            defaultValue: "Store posture",
            options: ["Store posture", "Daily scorecard", "Executive board", "Pipeline pressure"]
          },
          { key: "note", label: "Leadership Brief", control: "textarea", defaultValue: "", placeholder: "What should leadership see first?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["window", "forecastFocus", "note"])
      });
    case "analytics:Exceptions":
      return createWorkflowState({
        title: "Exception Sweep",
        description: `Queue an exception sweep for leadership review.`,
        commandLabel: tool,
        primaryActionLabel: "Run Sweep",
        tone: "attention",
        fields: [
          {
            key: "threshold",
            label: "Threshold",
            control: "select",
            defaultValue: "High urgency",
            options: [
              "High urgency",
              "All open",
              "Financial blockers",
              "Funding blockers",
              "Promise date risk",
              "Backorder risk",
              "Time clock exceptions",
              "Comp plan variance"
            ]
          },
          { key: "owner", label: "Owner Team", control: "text", defaultValue: "Leadership", placeholder: "Who should review it?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["threshold", "owner"])
      });
    case "analytics:Management Exception Review":
      return createWorkflowState({
        title: "Management Exception Review",
        description: `Open a management-first exception pass with clearer ownership and escalation.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Review",
        tone: "attention",
        fields: [
          {
            key: "threshold",
            label: "Exception Lens",
            control: "select",
            defaultValue: "High urgency",
            options: [
              "High urgency",
              "All open",
              "Financial blockers",
              "Funding blockers",
              "Promise date risk",
              "Backorder risk",
              "Time clock exceptions",
              "Comp plan variance"
            ]
          },
          { key: "owner", label: "Review Owner", control: "text", defaultValue: "Leadership", placeholder: "Team or leader" },
          {
            key: "escalation",
            label: "Escalation Path",
            control: "select",
            defaultValue: "Leadership",
            options: ["Leadership", "Sales Desk", "F&I", "Controller", "Service", "Parts", "Payroll & People"]
          }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["threshold", "owner", "escalation"])
      });
    case "analytics:Cross-Store View":
      return createWorkflowState({
        title: "Cross-Store View",
        description: `Open a cross-store board around the lane that needs comparison.`,
        commandLabel: tool,
        primaryActionLabel: "Stage Comparison",
        tone: "neutral",
        fields: [
          { key: "compareStores", label: "Compare Stores", control: "text", defaultValue: context.storeName, placeholder: "Store names" },
          {
            key: "focus",
            label: "Focus",
            control: "select",
            defaultValue: "Service backlog",
            options: [
              "Service backlog",
              "Deal velocity",
              "Website feed",
              "Funding cadence",
              "Lead response",
              "Delivery readiness",
              "Parts fill rate",
              "Staffing coverage"
            ]
          }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["compareStores", "focus"])
      });
    case "analytics:Management Cross-Store Review":
      return createWorkflowState({
        title: "Management Comparison Board",
        description: `Compare stores with management-specific focus and timeframe controls.`,
        commandLabel: tool,
        primaryActionLabel: "Stage Review",
        tone: "neutral",
        fields: [
          { key: "compareStores", label: "Store Group", control: "text", defaultValue: context.storeName, placeholder: "Store names or group" },
          {
            key: "focus",
            label: "Comparison Focus",
            control: "select",
            defaultValue: "Service backlog",
            options: [
              "Service backlog",
              "Deal velocity",
              "Website feed",
              "Funding cadence",
              "Lead response",
              "Delivery readiness",
              "Parts fill rate",
              "Staffing coverage"
            ]
          },
          { key: "timeframe", label: "Timeframe", control: "select", defaultValue: "30 Days", options: ["Today", "7 Days", "30 Days", "MTD"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["compareStores", "focus", "timeframe"])
      });
    case "analytics:Receivables Inquiry":
      return createWorkflowState({
        title: "Customer Inquiry",
        description: `Stage a receivables inquiry with account context, contact channel, and follow-up timing.`,
        commandLabel: tool,
        primaryActionLabel: "Open Inquiry",
        tone: "neutral",
        fields: [
          {
            key: "inquiryType",
            label: "Inquiry Type",
            control: "select",
            defaultValue: "Customer account",
            options: ["Customer account", "Statement request", "Payment promise", "Credit hold", "Balance forward review"]
          },
          { key: "contactChannel", label: "Contact Channel", control: "select", defaultValue: "Phone", options: ["Phone", "Email", "In Person"] },
          { key: "followUp", label: "Follow-Up", control: "select", defaultValue: "Same Day", options: ["Immediate", "Same Day", "Next Business Day"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["inquiryType", "contactChannel", "followUp"])
      });
    case "analytics:Receivables Batch":
      return createWorkflowState({
        title: "Credit Card Batch Review",
        description: `Review the batch before settlement and reconciliation.`,
        commandLabel: tool,
        primaryActionLabel: "Review Batch",
        tone: "accent",
        fields: [
          { key: "batchType", label: "Batch Type", control: "select", defaultValue: "Credit Card", options: ["Credit Card", "ACH", "Mixed"] },
          { key: "cutoffWindow", label: "Cutoff Window", control: "select", defaultValue: "Today", options: ["Today", "Yesterday", "MTD"] },
          { key: "settlementStatus", label: "Settlement Status", control: "select", defaultValue: "Ready to settle", options: ["Ready to settle", "Needs review", "Held"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["batchType", "cutoffWindow", "settlementStatus"])
      });
    case "analytics:Receivables Queue":
      return createWorkflowState({
        title: "Collections Queue",
        description: `Open the collections queue with ownership and priority controls.`,
        commandLabel: tool,
        primaryActionLabel: "Open Queue",
        tone: "attention",
        fields: [
          { key: "queueName", label: "Queue", control: "select", defaultValue: "Collections", options: ["Collections", "Promises to Pay", "Disputes"] },
          { key: "owner", label: "Queue Owner", control: "text", defaultValue: "AR Team", placeholder: "Assigned team" },
          { key: "priority", label: "Priority", control: "select", defaultValue: "High", options: ["Normal", "High", "Critical"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["queueName", "owner", "priority"])
      });
    case "analytics:Receivables Report":
      return createWorkflowState({
        title: "Receivables Report",
        description: `Queue a receivables report with the right aging window and delivery path.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Report",
        tone: "neutral",
        fields: [
          {
            key: "reportName",
            label: "Report",
            control: "select",
            defaultValue: "Aging Summary",
            options: ["Aging Summary", "Collections Productivity", "Promise Tracking", "Broken Promise Summary"]
          },
          { key: "window", label: "Window", control: "select", defaultValue: "30 Days", options: ["Today", "7 Days", "30 Days", "MTD"] },
          { key: "delivery", label: "Delivery", control: "select", defaultValue: "Operator Queue", options: ["Operator Queue", "Export", "Email PDF"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["reportName", "window", "delivery"])
      });
    case "analytics:GL Store Summary":
      return createWorkflowState({
        title: "Store Summary",
        description: `Open the accounting store summary with the right period and lens.`,
        commandLabel: tool,
        primaryActionLabel: "Open Summary",
        tone: "neutral",
        fields: [
          { key: "period", label: "Period", control: "select", defaultValue: "MTD", options: ["Today", "MTD", "QTD", "YTD"] },
          { key: "summaryLens", label: "Summary Lens", control: "select", defaultValue: "P&L", options: ["P&L", "Balance Sheet", "Cash"] },
          { key: "reviewer", label: "Reviewer", control: "text", defaultValue: "Controller", placeholder: "Accounting owner" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["period", "summaryLens", "reviewer"])
      });
    case "analytics:GL Deal Posting":
      return createWorkflowState({
        title: "Deal Posting",
        description: `Stage a deal posting batch with date and approver context.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Posting",
        tone: "accent",
        fields: [
          { key: "postingBatch", label: "Posting Batch", control: "select", defaultValue: "Open deals", options: ["Open deals", "Delivered deals", "Funding cleared"] },
          { key: "postingDate", label: "Posting Date", control: "select", defaultValue: "Today", options: ["Today", "Yesterday", "Month End"] },
          { key: "approver", label: "Approver", control: "text", defaultValue: "Accounting", placeholder: "Accounting approver" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["postingBatch", "postingDate", "approver"])
      });
    case "analytics:GL Deposit Review":
      return createWorkflowState({
        title: "Deposit Review",
        description: `Review deposit reconciliation and exception flags before posting.`,
        commandLabel: tool,
        primaryActionLabel: "Review Deposits",
        tone: "attention",
        fields: [
          { key: "depositSource", label: "Deposit Source", control: "select", defaultValue: "All deposits", options: ["All deposits", "Sales deposits", "Service deposits"] },
          { key: "reviewWindow", label: "Review Window", control: "select", defaultValue: "Today", options: ["Today", "7 Days", "MTD"] },
          { key: "varianceFlag", label: "Variance Flag", control: "select", defaultValue: "Open variances", options: ["Open variances", "Balanced only", "All items"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["depositSource", "reviewWindow", "varianceFlag"])
      });
    case "analytics:GL Month End":
      return createWorkflowState({
        title: "Month End",
        description: `Stage the month-end checklist with owner and close window controls.`,
        commandLabel: tool,
        primaryActionLabel: "Open Closeout",
        tone: "neutral",
        fields: [
          { key: "closeWindow", label: "Close Window", control: "select", defaultValue: "Month End", options: ["This Week", "Month End", "Quarter End"] },
          { key: "checklistOwner", label: "Checklist Owner", control: "text", defaultValue: "Controller", placeholder: "Accounting owner" },
          { key: "note", label: "Close Note", control: "textarea", defaultValue: "", placeholder: "What should closeout focus on?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["closeWindow", "checklistOwner", "note"])
      });
    case "analytics:System Access Review":
      return createWorkflowState({
        title: "Users & Roles",
        description: `Review role coverage and access changes from the system lane.`,
        commandLabel: tool,
        primaryActionLabel: "Review Access",
        tone: "neutral",
        fields: [
          { key: "roleScope", label: "Role Scope", control: "select", defaultValue: "Store operators", options: ["Store operators", "Managers", "All users"] },
          { key: "reviewer", label: "Reviewer", control: "text", defaultValue: "System Admin", placeholder: "System owner" },
          { key: "changeWindow", label: "Change Window", control: "select", defaultValue: "This Week", options: ["Today", "This Week", "Next Release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["roleScope", "reviewer", "changeWindow"])
      });
    case "analytics:System Workflow Review":
      return createWorkflowState({
        title: "Workflow Rules",
        description: `Review cross-workspace rules with owner and publish timing in one pass.`,
        commandLabel: tool,
        primaryActionLabel: "Review Rules",
        tone: "neutral",
        fields: [
          { key: "ruleset", label: "Rule Set", control: "select", defaultValue: "Cross-workspace automations", options: ["Cross-workspace automations", "Notifications", "Escalations"] },
          { key: "owner", label: "Rule Owner", control: "text", defaultValue: "System Admin", placeholder: "Who owns these rules?" },
          { key: "publishWindow", label: "Publish Window", control: "select", defaultValue: "Next release", options: ["Today", "This Week", "Next release"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["ruleset", "owner", "publishWindow"])
      });
    case "website:Publish Feed":
      return createWorkflowState({
        title: "Publish Website Feed",
        description: `Stage an inventory publish push for the public web surfaces.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Publish",
        tone: "stable",
        fields: [
          { key: "brand", label: "Brand", control: "text", defaultValue: context.websiteRow?.brand ?? context.storeName, placeholder: "Brand or site" },
          { key: "window", label: "Inventory Window", control: "select", defaultValue: "Full inventory", options: ["Full inventory", "Featured units", "Recent changes"] },
          { key: "note", label: "Publish Note", control: "textarea", defaultValue: "", placeholder: "What changed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["brand", "window", "note"])
      });
    case "website:Management Website Pulse":
      return createWorkflowState({
        title: "Website Pulse",
        description: `Stage a management website pulse around publishing freshness and merchandising posture.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Website Pulse",
        tone: "stable",
        fields: [
          { key: "brand", label: "Website / Brand", control: "text", defaultValue: context.websiteRow?.brand ?? context.storeName, placeholder: "Brand, site, or store" },
          { key: "window", label: "Publishing Window", control: "select", defaultValue: "Recent changes", options: ["Recent changes", "Featured units", "Full inventory"] },
          { key: "pulseType", label: "Pulse Type", control: "select", defaultValue: "Merchandising", options: ["Merchandising", "Inventory freshness", "Lead routing"] },
          { key: "note", label: "Digital Note", control: "textarea", defaultValue: "", placeholder: "What changed or needs attention?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["brand", "window", "pulseType"])
      });
    case "website:Lead Sync":
      return createWorkflowState({
        title: "Lead Sync Pass",
        description: `Run a lead handoff check between the site and the store command surface.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Sync",
        tone: "stable",
        fields: [
          { key: "lane", label: "Lead Lane", control: "select", defaultValue: "All lanes", options: ["All lanes", "Sales only", "Service only"] },
          { key: "owner", label: "Owner", control: "text", defaultValue: "BDC", placeholder: "Team owner" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["lane", "owner"])
      });
    case "website:Management Lead Handoff":
      return createWorkflowState({
        title: "Lead Handoff Monitor",
        description: `Review management lead handoff posture with ownership and response timing in one pass.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Handoff",
        tone: "stable",
        fields: [
          { key: "lane", label: "Handoff Lane", control: "select", defaultValue: "Sales only", options: ["Sales only", "Service only", "All lanes"] },
          { key: "owner", label: "Receiving Team", control: "text", defaultValue: "BDC", placeholder: "Team handling the leads" },
          { key: "responseWindow", label: "Response Window", control: "select", defaultValue: "30 Minutes", options: ["15 Minutes", "30 Minutes", "Same Day"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["lane", "owner", "responseWindow"])
      });
    case "website:Open Queue":
      return createWorkflowState({
        title: "Queue Review",
        description: `Open the operator queue for publishing and lead tasks.`,
        commandLabel: tool,
        primaryActionLabel: "Stage Queue",
        tone: "neutral",
        fields: [
          {
            key: "queueName",
            label: "Queue",
            control: "select",
            defaultValue: "Publishing",
            options: ["Publishing", "Lead Response", "Merchandising", "Campaign Response", "Reputation"]
          },
          { key: "assignee", label: "Assignee", control: "text", defaultValue: "Digital Ops", placeholder: "Assigned team" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["queueName", "assignee"])
      });
    case "website:Management Digital Queue":
      return createWorkflowState({
        title: "Digital Queue Review",
        description: `Open a management queue view for website response, publishing, and reputation work.`,
        commandLabel: tool,
        primaryActionLabel: "Open Queue",
        tone: "neutral",
        fields: [
          {
            key: "queueName",
            label: "Digital Queue",
            control: "select",
            defaultValue: "Campaign Response",
            options: ["Campaign Response", "Reputation", "Publishing", "Lead Response", "Merchandising"]
          },
          { key: "assignee", label: "Queue Owner", control: "text", defaultValue: "Digital Ops", placeholder: "Assigned team" },
          { key: "priority", label: "Priority", control: "select", defaultValue: "High", options: ["Normal", "High", "Same Day"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["queueName", "assignee", "priority"])
      });
    case "website:System Website Feed":
      return createWorkflowState({
        title: "Website Feed",
        description: `Stage a system-level website feed push with publishing scope and cadence controls.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Feed Push",
        tone: "stable",
        fields: [
          { key: "brand", label: "Brand / Site", control: "text", defaultValue: context.websiteRow?.brand ?? context.storeName, placeholder: "Brand or site" },
          { key: "window", label: "Feed Window", control: "select", defaultValue: "Full inventory", options: ["Full inventory", "Featured units", "Recent changes"] },
          { key: "pulseType", label: "Feed Intent", control: "select", defaultValue: "Lead routing", options: ["Lead routing", "Merchandising", "Inventory freshness"] },
          { key: "note", label: "System Note", control: "textarea", defaultValue: "", placeholder: "What triggered this feed push?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["brand", "window", "pulseType"])
      });
    case "audit:Management Policy Audit":
      return createWorkflowState({
        title: "Policy Exception Review",
        description: `Stage a management policy audit with explicit owner and exception notes.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Policy Review",
        tone: "attention",
        fields: [
          { key: "summary", label: "Policy Set", control: "text", defaultValue: "", placeholder: "Policy scope" },
          { key: "owner", label: "Review Owner", control: "text", defaultValue: "Operations", placeholder: "Owner or team" },
          { key: "note", label: "Policy Exception Note", control: "textarea", defaultValue: "", placeholder: "What needs review?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "owner", "note"])
      });
    case "audit:Management Approval Review":
      return createWorkflowState({
        title: "Approval Review",
        description: `Stage an approval review with approver ownership and sign-off notes.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Approval Review",
        tone: "neutral",
        fields: [
          { key: "summary", label: "Approval Scope", control: "text", defaultValue: "", placeholder: "Approval lane or packet" },
          { key: "approver", label: "Approver", control: "text", defaultValue: "GM", placeholder: "Who signs off?" },
          { key: "note", label: "Approval Notes", control: "textarea", defaultValue: "", placeholder: "Context for the approval review" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "approver", "note"])
      });
    case "audit:Management Close Readiness":
      return createWorkflowState({
        title: "Close Readiness",
        description: `Queue the close-readiness checklist with a clear window and note trail.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Close Review",
        tone: "neutral",
        fields: [
          { key: "summary", label: "Close Checklist", control: "text", defaultValue: "", placeholder: "Close package or checklist" },
          { key: "closingWindow", label: "Close Window", control: "select", defaultValue: "Month End", options: ["This Week", "Month End", "Quarter End"] },
          { key: "note", label: "Close Note", control: "textarea", defaultValue: "", placeholder: "What should closeout focus on?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "closingWindow", "note"])
      });
    case "audit:System Audit Review":
      return createWorkflowState({
        title: "System Audit Trail",
        description: `Review system-level audit entries with scoped ownership and operator notes.`,
        commandLabel: tool,
        primaryActionLabel: "Open Audit Review",
        tone: "neutral",
        fields: [
          { key: "summary", label: "Audit Scope", control: "text", defaultValue: "", placeholder: "Audit lane or system area" },
          { key: "owner", label: "Audit Owner", control: "text", defaultValue: "System Admin", placeholder: "Who owns the review?" },
          { key: "note", label: "Audit Notes", control: "textarea", defaultValue: "", placeholder: "What needs attention?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "owner", "note"])
      });
    case "desktop:Application Task Queue Review":
      return createWorkflowState({
        title: "Task Queue Monitor",
        description: `Review queue scope, ownership, and operator notes from the desktop lane.`,
        commandLabel: tool,
        primaryActionLabel: "Open Queue Review",
        tone: "neutral",
        fields: [
          { key: "queueScope", label: "Queue Scope", control: "select", defaultValue: "All workspaces", options: ["All workspaces", "Desktop only", "My queue"] },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Store leadership", placeholder: "Who owns this pass?" },
          { key: "note", label: "Queue Note", control: "textarea", defaultValue: "", placeholder: "What needs review?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["queueScope", "ownerFocus", "note"])
      });
    case "desktop:Designer":
      return createWorkflowState({
        title: "Dashboard Designer",
        description: `Open the desktop widget builder to add, arrange, and customize dashboard widgets for ${context.storeName}.`,
        commandLabel: tool,
        primaryActionLabel: "Open Designer",
        tone: "neutral",
        fields: [
          {
            key: "action",
            label: "Designer Action",
            control: "select",
            defaultValue: "New Widget",
            options: ["New Widget", "New View", "Duplicate View", "Reset Layout"]
          },
          {
            key: "widgetType",
            label: "Widget Type",
            control: "select",
            defaultValue: "Scoreboard",
            options: ["Scoreboard", "Trend Line", "Lane Graph", "Module Board", "Signal List", "Activity Feed", "Report Table", "Gauge Row", "Funnel Steps"]
          },
          { key: "note", label: "Designer Note", control: "textarea", defaultValue: "", placeholder: "What should this dashboard show?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["action", "widgetType", "note"])
      });
    case "desktop:Store Status":
      return createWorkflowState({
        title: "Store Status",
        description: `Review store-level operating posture, roster context, and shift notes from the desktop shell.`,
        commandLabel: tool,
        primaryActionLabel: "Open Store Status",
        tone: "neutral",
        fields: [
          {
            key: "storeView",
            label: "Store View",
            control: "select",
            defaultValue: "Store Status Board",
            options: ["Store Status Board", "Store Summary", "Store Roster", "Shift Notes"]
          },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Store leadership", placeholder: "Who is reviewing this?" },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "Current Shift"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["storeView", "ownerFocus", "window"])
      });
    case "desktop:Workspace Tools":
      return createWorkflowState({
        title: "Workspace Tools",
        description: `Workspace Tools is the operator's personal command center for configuring and managing the desktop environment. Use it to control window layout, manage alerts and follow-up prompts, review store operations at a glance, and set up personal preferences and quick-launch shortcuts.`,
        commandLabel: tool,
        primaryActionLabel: "Open Workspace Tools",
        tone: "neutral",
        fields: [
          {
            key: "toolSection",
            label: "Tool Section",
            control: "select",
            defaultValue: "Window Control",
            options: ["Window Control", "Alerts & Notices", "Store Operations", "Setup"]
          },
          {
            key: "action",
            label: "Action",
            control: "select",
            defaultValue: "Pinned Windows",
            options: [
              "Pinned Windows",
              "Window Layout Presets",
              "Workspace Reset",
              "Notifications",
              "Follow-Up Prompts",
              "Exception Inbox",
              "Store Summary",
              "Store Roster",
              "Shift Notes",
              "Preferences",
              "Personal Shortcuts",
              "Quick Launch Setup"
            ]
          },
          { key: "note", label: "Operator Note", control: "textarea", defaultValue: "", placeholder: "What needs attention?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["toolSection", "action", "note"])
      });
    case "desktop:Application Workspace Surface":
      return createWorkflowState({
        title: "Application Workspace Surface",
        description: `Review the desktop surface, launch tools, and open-window shell behavior from one flow.`,
        commandLabel: tool,
        primaryActionLabel: "Open Surface Review",
        tone: "neutral",
        fields: [
          {
            key: "surface",
            label: "Surface",
            control: "select",
            defaultValue: "Desktop",
            options: ["Desktop", "Open Windows", "Command Search", "Workspace Overview", "Favorite Desktop"]
          },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Operator", placeholder: "Who is this for?" },
          { key: "note", label: "Surface Note", control: "textarea", defaultValue: "", placeholder: "What should be reviewed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["surface", "ownerFocus", "note"])
      });
    case "desktop:Application Activity Review":
      return createWorkflowState({
        title: "Application Activity Review",
        description: `Review desktop-side operator activity and shared search context without leaving the shell.`,
        commandLabel: tool,
        primaryActionLabel: "Open Activity Review",
        tone: "neutral",
        fields: [
          {
            key: "panel",
            label: "Panel",
            control: "select",
            defaultValue: "Activity Snapshot",
            options: ["Activity Snapshot", "Search Results"]
          },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Operator", placeholder: "Who should review this?" },
          { key: "note", label: "Activity Note", control: "textarea", defaultValue: "", placeholder: "What needs attention?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["panel", "ownerFocus", "note"])
      });
    case "desktop:Application Window Control":
      return createWorkflowState({
        title: "Application Window Control",
        description: `Review window control, reset, and layout behavior from the desktop shell.`,
        commandLabel: tool,
        primaryActionLabel: "Open Window Review",
        tone: "neutral",
        fields: [
          {
            key: "layoutAction",
            label: "Layout Action",
            control: "select",
            defaultValue: "Pinned Windows",
            options: ["Pinned Windows", "Workspace Reset", "Window Layout Presets"]
          },
          { key: "layoutScope", label: "Layout Scope", control: "select", defaultValue: "Desktop", options: ["Desktop", "Current operator", "All open windows"] },
          { key: "note", label: "Window Note", control: "textarea", defaultValue: "", placeholder: "What should change?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["layoutAction", "layoutScope", "note"])
      });
    case "desktop:Application Notification Review":
      return createWorkflowState({
        title: "Notification Center",
        description: `Open the notification center with lane and follow-up controls for operators.`,
        commandLabel: tool,
        primaryActionLabel: "Open Notifications",
        tone: "neutral",
        fields: [
          { key: "alertLane", label: "Alert Lane", control: "select", defaultValue: "All alerts", options: ["All alerts", "Critical only", "Unread"] },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Operator", placeholder: "Who should follow up?" },
          { key: "followUp", label: "Follow-Up", control: "select", defaultValue: "Same Day", options: ["Immediate", "Same Day", "Next Business Day"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["alertLane", "ownerFocus", "followUp"])
      });
    case "desktop:Application Alert Inbox Review":
      return createWorkflowState({
        title: "Application Alert Inbox",
        description: `Review desktop alerts and follow-up prompts with owner and timing context attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Alert Review",
        tone: "attention",
        fields: [
          {
            key: "alertView",
            label: "Alert View",
            control: "select",
            defaultValue: "Notifications",
            options: ["Notifications", "Follow-Up Prompts"]
          },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Operator", placeholder: "Who owns this follow-up?" },
          { key: "followUp", label: "Follow-Up", control: "select", defaultValue: "Same Day", options: ["Immediate", "Same Day", "Next Business Day"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["alertView", "ownerFocus", "followUp"])
      });
    case "desktop:Application Store Operations Review":
      return createWorkflowState({
        title: "Application Store Operations",
        description: `Review store-level operating posture, roster context, and shift notes from the desktop shell.`,
        commandLabel: tool,
        primaryActionLabel: "Open Store Review",
        tone: "neutral",
        fields: [
          {
            key: "storeView",
            label: "Store View",
            control: "select",
            defaultValue: "Store Status Board",
            options: ["Store Status Board", "Store Summary", "Store Roster", "Shift Notes"]
          },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Store leadership", placeholder: "Who is reviewing this?" },
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "Current Shift"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["storeView", "ownerFocus", "window"])
      });
    case "desktop:Application Personal Setup Review":
      return createWorkflowState({
        title: "Application Personal Setup",
        description: `Review personal setup and shortcut preferences with operator ownership attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Personal Setup",
        tone: "neutral",
        fields: [
          {
            key: "setupFocus",
            label: "Setup Focus",
            control: "select",
            defaultValue: "Preferences",
            options: ["Preferences", "Personal Shortcuts"]
          },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Operator", placeholder: "Who owns this setup?" },
          { key: "note", label: "Setup Note", control: "textarea", defaultValue: "", placeholder: "What should change?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["setupFocus", "ownerFocus", "note"])
      });
    case "analytics:Application Operator Status":
      return createWorkflowState({
        title: "Operator Status Board",
        description: `Review operator posture across teams, shifts, and store ownership in one board.`,
        commandLabel: tool,
        primaryActionLabel: "Open Status Board",
        tone: "neutral",
        fields: [
          { key: "statusScope", label: "Status Scope", control: "select", defaultValue: "All operators", options: ["All operators", "Front line", "Managers"] },
          { key: "shiftWindow", label: "Shift Window", control: "select", defaultValue: "Today", options: ["Today", "This Week", "Current Shift"] },
          { key: "ownerFocus", label: "Owner Focus", control: "text", defaultValue: "Store leadership", placeholder: "Who is reviewing this?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["statusScope", "shiftWindow", "ownerFocus"])
      });
    case "audit:Application Exception Log Review":
      return createWorkflowState({
        title: "Exception Logs",
        description: `Review application exception logs with scoped ownership and current notes.`,
        commandLabel: tool,
        primaryActionLabel: "Open Exceptions",
        tone: "attention",
        fields: [
          { key: "summary", label: "Exception Scope", control: "text", defaultValue: "Operational exceptions", placeholder: "What set of exceptions?" },
          { key: "owner", label: "Exception Owner", control: "text", defaultValue: "Operations", placeholder: "Owner or team" },
          { key: "note", label: "Exception Note", control: "textarea", defaultValue: "", placeholder: "What needs review?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "owner", "note"])
      });
    case "audit:Application Workflow Checklist":
      return createWorkflowState({
        title: "Workflow Checklists",
        description: `Open workflow checklists for operational follow-up and audit-ready notes.`,
        commandLabel: tool,
        primaryActionLabel: "Open Checklists",
        tone: "neutral",
        fields: [
          { key: "summary", label: "Checklist Scope", control: "text", defaultValue: "Workflow checklists", placeholder: "Checklist set" },
          { key: "owner", label: "Checklist Owner", control: "text", defaultValue: "Operations", placeholder: "Owner or team" },
          { key: "note", label: "Checklist Note", control: "textarea", defaultValue: "", placeholder: "What needs action?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "owner", "note"])
      });
    case "analytics:Application Cash Pulse":
      return createWorkflowState({
        title: "Cash Pulse",
        description: `Stage a cash pulse review with timing, lens, and accounting context.`,
        commandLabel: tool,
        primaryActionLabel: "Open Cash Pulse",
        tone: "accent",
        fields: [
          { key: "window", label: "Window", control: "select", defaultValue: "Today", options: ["Today", "7 Days", "MTD"] },
          { key: "cashLens", label: "Cash Lens", control: "select", defaultValue: "Current cash posture", options: ["Current cash posture", "Deposit pressure", "Funding cadence"] },
          { key: "reviewer", label: "Reviewer", control: "text", defaultValue: "Controller", placeholder: "Accounting reviewer" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["window", "cashLens", "reviewer"])
      });
    case "analytics:Application Store Scorecard":
      return createWorkflowState({
        title: "Store Scorecard",
        description: `Open the store scorecard with timeframe and reviewer context for leadership.`,
        commandLabel: tool,
        primaryActionLabel: "Open Scorecard",
        tone: "neutral",
        fields: [
          { key: "window", label: "Window", control: "select", defaultValue: "30 Days", options: ["Today", "7 Days", "30 Days", "MTD"] },
          { key: "scorecardFocus", label: "Scorecard Focus", control: "select", defaultValue: "Store posture", options: ["Store posture", "Department pace", "Operator throughput"] },
          { key: "reviewer", label: "Reviewer", control: "text", defaultValue: "Leadership", placeholder: "Leadership reviewer" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["window", "scorecardFocus", "reviewer"])
      });
    case "analytics:Application Executive Snapshot":
      return createWorkflowState({
        title: "Executive Snapshot",
        description: `Stage an executive application snapshot with reviewer and time-window context.`,
        commandLabel: tool,
        primaryActionLabel: "Open Snapshot",
        tone: "stable",
        fields: [
          { key: "snapshotView", label: "Snapshot View", control: "select", defaultValue: "Executive Snapshot", options: ["Executive Snapshot", "Favorite Executive Board"] },
          { key: "reviewer", label: "Reviewer", control: "text", defaultValue: "Leadership", placeholder: "Leadership reviewer" },
          { key: "window", label: "Window", control: "select", defaultValue: "30 Days", options: ["Today", "7 Days", "30 Days", "90 Days"] }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["snapshotView", "reviewer", "window"])
      });
    case "desktop:Application Quick Launch Setup":
      return createWorkflowState({
        title: "Quick Launch Setup",
        description: `Review quick-launch coverage and lane setup for the current store.`,
        commandLabel: tool,
        primaryActionLabel: "Review Shortcuts",
        tone: "neutral",
        fields: [
          { key: "shortcutScope", label: "Shortcut Scope", control: "select", defaultValue: "Store operators", options: ["Store operators", "Sales desk", "Service lane", "Management"] },
          { key: "launchLane", label: "Launch Lane", control: "select", defaultValue: "Quick Launch", options: ["Quick Launch", "Open Windows", "Desktop"] },
          { key: "note", label: "Setup Note", control: "textarea", defaultValue: "", placeholder: "What should change?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["shortcutScope", "launchLane", "note"])
      });
    case "audit:Application Audit Review":
      return createWorkflowState({
        title: "Application Audit Review",
        description: `Open audit-side application review with ownership and follow-up notes attached.`,
        commandLabel: tool,
        primaryActionLabel: "Open Audit Review",
        tone: "attention",
        fields: [
          { key: "auditFocus", label: "Audit Focus", control: "select", defaultValue: "Audit Notes", options: ["Audit Notes", "Exception Inbox", "Favorite Audit Trail"] },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Operations", placeholder: "Owner or team" },
          { key: "note", label: "Audit Note", control: "textarea", defaultValue: "", placeholder: "What needs review?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["auditFocus", "owner", "note"])
      });
    case "website:Application Favorite Website Feed":
      return createWorkflowState({
        title: "Favorite Website Feed",
        description: `Load the preferred website feed setup with freshness and publishing controls.`,
        commandLabel: tool,
        primaryActionLabel: "Load Favorite Feed",
        tone: "stable",
        fields: [
          { key: "brand", label: "Brand / Site", control: "text", defaultValue: context.websiteRow?.brand ?? context.storeName, placeholder: "Brand or site" },
          { key: "window", label: "Feed Window", control: "select", defaultValue: "Recent changes", options: ["Recent changes", "Featured units", "Full inventory"] },
          { key: "pulseType", label: "Feed Focus", control: "select", defaultValue: "Inventory freshness", options: ["Inventory freshness", "Lead routing", "Merchandising"] },
          { key: "note", label: "Favorite Note", control: "textarea", defaultValue: "", placeholder: "Why this feed is pinned" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["brand", "window", "pulseType"])
      });
    case "desktop:Help Operator Guide":
      return createWorkflowState({
        title: "Operator Guide",
        description: `Open the operator guide with audience and quick-start note context.`,
        commandLabel: tool,
        primaryActionLabel: "Open Guide",
        tone: "neutral",
        fields: [
          { key: "guideType", label: "Guide Type", control: "select", defaultValue: "Operator guide", options: ["Operator guide", "Desktop overview", "Daily command surface"] },
          { key: "audience", label: "Audience", control: "text", defaultValue: "All operators", placeholder: "Who is this guide for?" },
          { key: "note", label: "Guide Note", control: "textarea", defaultValue: "", placeholder: "What should the operator focus on?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["guideType", "audience", "note"])
      });
    case "desktop:Help Onboarding Checklist":
      return createWorkflowState({
        title: "New Operator Checklist",
        description: `Stage the onboarding checklist for new operators and cross-training support.`,
        commandLabel: tool,
        primaryActionLabel: "Open Checklist",
        tone: "neutral",
        fields: [
          {
            key: "checklistType",
            label: "Checklist Type",
            control: "select",
            defaultValue: "New operator",
            options: ["New operator", "Cross-training", "Leadership setup", "First week plan"]
          },
          { key: "audience", label: "Audience", control: "text", defaultValue: "New hire", placeholder: "Who is this checklist for?" },
          { key: "note", label: "Checklist Note", control: "textarea", defaultValue: "", placeholder: "What should onboarding emphasize?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["checklistType", "audience", "note"])
      });
    case "desktop:Help Shortcut Map":
      return createWorkflowState({
        title: "Shortcut Map",
        description: `Open the shortcut map for quick-launch, menu, and open-window navigation.`,
        commandLabel: tool,
        primaryActionLabel: "Open Shortcut Map",
        tone: "neutral",
        fields: [
          { key: "shortcutScope", label: "Shortcut Scope", control: "select", defaultValue: "Quick Launch", options: ["Quick Launch", "Menu navigation", "Open Windows"] },
          { key: "audience", label: "Audience", control: "text", defaultValue: "All operators", placeholder: "Who uses these shortcuts?" },
          { key: "note", label: "Shortcut Note", control: "textarea", defaultValue: "", placeholder: "What should be emphasized?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["shortcutScope", "audience", "note"])
      });
    case "desktop:Help Workflow Walkthrough":
      return createWorkflowState({
        title: "Workflow Walkthroughs",
        description: `Review cross-workspace walkthroughs with track and audience controls.`,
        commandLabel: tool,
        primaryActionLabel: "Open Walkthroughs",
        tone: "neutral",
        fields: [
          {
            key: "walkthroughType",
            label: "Walkthrough Type",
            control: "select",
            defaultValue: "Cross-workspace",
            options: ["Cross-workspace", "Sales desk", "Service lane", "Parts ordering", "Queue triage", "Month-end closeout"]
          },
          { key: "audience", label: "Audience", control: "text", defaultValue: "Store operators", placeholder: "Who is this walkthrough for?" },
          { key: "note", label: "Walkthrough Note", control: "textarea", defaultValue: "", placeholder: "What should be covered?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["walkthroughType", "audience", "note"])
      });
    case "desktop:Help Tips Guide":
      return createWorkflowState({
        title: "Department Tips",
        description: `Open operator tip content with the right department track and audience already in focus.`,
        commandLabel: tool,
        primaryActionLabel: "Open Tips",
        tone: "neutral",
        fields: [
          { key: "tipTrack", label: "Tip Track", control: "select", defaultValue: "Service Tips", options: ["Service Tips", "Sales Tips", "Parts Tips"] },
          { key: "audience", label: "Audience", control: "text", defaultValue: "Store operators", placeholder: "Who is this guidance for?" },
          { key: "note", label: "Tips Note", control: "textarea", defaultValue: "", placeholder: "What should the team focus on?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["tipTrack", "audience", "note"])
      });
    case "desktop:Help Release Brief":
      return createWorkflowState({
        title: "Release Brief",
        description: `Review release-center content with audience and rollout context attached.`,
        commandLabel: tool,
        primaryActionLabel: "Review Brief",
        tone: "neutral",
        fields: [
          {
            key: "releaseTrack",
            label: "Release Track",
            control: "select",
            defaultValue: "Upcoming Changes",
            options: ["Upcoming Changes", "Demo Scripts", "Release Webinar"]
          },
          { key: "audience", label: "Audience", control: "text", defaultValue: "All operators", placeholder: "Who should see this?" },
          { key: "note", label: "Brief Note", control: "textarea", defaultValue: "", placeholder: "What should the rollout emphasize?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["releaseTrack", "audience", "note"])
      });
    case "desktop:Help Release Notes":
      return createWorkflowState({
        title: "Release Notes",
        description: `Stage release notes with audience and time-window context for operators.`,
        commandLabel: tool,
        primaryActionLabel: "Review Notes",
        tone: "neutral",
        fields: [
          { key: "releaseWindow", label: "Release Window", control: "select", defaultValue: "Current release", options: ["Current release", "Last 30 Days", "Upcoming release"] },
          { key: "audience", label: "Audience", control: "text", defaultValue: "All operators", placeholder: "Who should read this?" },
          { key: "note", label: "Release Note", control: "textarea", defaultValue: "", placeholder: "What changed for the team?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["releaseWindow", "audience", "note"])
      });
    case "audit:Help Known Issues Review":
      return createWorkflowState({
        title: "Known Issues",
        description: `Review the known-issues list with support ownership and operator notes.`,
        commandLabel: tool,
        primaryActionLabel: "Review Issues",
        tone: "attention",
        fields: [
          { key: "summary", label: "Issue Scope", control: "text", defaultValue: "Known issues", placeholder: "What issue set?" },
          { key: "owner", label: "Issue Owner", control: "text", defaultValue: "Support", placeholder: "Who owns the issue list?" },
          { key: "note", label: "Issue Note", control: "textarea", defaultValue: "", placeholder: "What needs follow-up?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "owner", "note"])
      });
    case "audit:Help Support Request":
      return createWorkflowState({
        title: "Support",
        description: `Open support guidance with scoped ownership and current ticket notes.`,
        commandLabel: tool,
        primaryActionLabel: "Open Support",
        tone: "neutral",
        fields: [
          { key: "summary", label: "Support Scope", control: "text", defaultValue: "Support request", placeholder: "What support lane?" },
          { key: "owner", label: "Support Owner", control: "text", defaultValue: "Support", placeholder: "Who owns the request?" },
          { key: "note", label: "Support Note", control: "textarea", defaultValue: "", placeholder: "What is needed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "owner", "note"])
      });
    case "audit:Help Support Ticket":
      return createWorkflowState({
        title: "Open Ticket",
        description: `Stage a new support ticket with ownership and operator note context.`,
        commandLabel: tool,
        primaryActionLabel: "Open Ticket",
        tone: "attention",
        fields: [
          { key: "summary", label: "Ticket Scope", control: "text", defaultValue: "New support ticket", placeholder: "What needs a ticket?" },
          { key: "owner", label: "Ticket Owner", control: "text", defaultValue: "Support", placeholder: "Who owns follow-up?" },
          { key: "note", label: "Ticket Note", control: "textarea", defaultValue: "", placeholder: "What should the ticket capture?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "owner", "note"])
      });
    case "audit:Help Contact Directory":
      return createWorkflowState({
        title: "Contact Directory",
        description: `Open the support contact directory with owner notes and escalation context.`,
        commandLabel: tool,
        primaryActionLabel: "Open Directory",
        tone: "neutral",
        fields: [
          { key: "directoryScope", label: "Directory Scope", control: "select", defaultValue: "Contact Directory", options: ["Contact Directory"] },
          { key: "owner", label: "Owner", control: "text", defaultValue: "Support", placeholder: "Who maintains this?" },
          { key: "note", label: "Directory Note", control: "textarea", defaultValue: "", placeholder: "What contact path is needed?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["directoryScope", "owner", "note"])
      });
    case "desktop:Help Role Training Plan":
      return createWorkflowState({
        title: "Role-Based Training",
        description: `Open the training plan with track and audience controls for ramp-up.`,
        commandLabel: tool,
        primaryActionLabel: "Open Training Plan",
        tone: "neutral",
        fields: [
          {
            key: "trainingTrack",
            label: "Training Track",
            control: "select",
            defaultValue: "Role-based training",
            options: ["Role-based training", "Sales onboarding", "Service onboarding", "Leadership ramp", "Certification tracker"]
          },
          { key: "audience", label: "Audience", control: "text", defaultValue: "Store operators", placeholder: "Who is training for?" },
          { key: "note", label: "Training Note", control: "textarea", defaultValue: "", placeholder: "What should the training cover?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["trainingTrack", "audience", "note"])
      });
    default:
      return createWorkflowState({
        title: `${tool} Workflow`,
        description: `Stage the ${tool.toLowerCase()} operator flow for ${context.storeName}.`,
        commandLabel: tool,
        primaryActionLabel: "Queue Command",
        tone: "neutral",
        fields: [
          { key: "summary", label: "Summary", control: "text", defaultValue: "", placeholder: "Short description" },
          { key: "note", label: "Operator Note", control: "textarea", defaultValue: "", placeholder: "What should happen next?" }
        ],
        buildDetail: (values) => summarizeWorkflowValues(values, ["summary", "note"])
      });
  }
}

function createWorkflowState(config: Omit<ActionWorkflowState, "submitAction" | "values"> & { submitAction?: string }) {
  return {
    ...config,
    submitAction: config.submitAction ?? config.commandLabel,
    values: Object.fromEntries(config.fields.map((field) => [field.key, field.defaultValue]))
  };
}

function applyWorkflowIntent(
  workflow: ActionWorkflowState,
  intent: Pick<WorkspaceMenuIntent, "initialValues" | "workflowOverrides">
) {
  const nextWorkflow = intent.workflowOverrides ? { ...workflow, ...intent.workflowOverrides } : workflow;

  if (!intent.initialValues) {
    return nextWorkflow;
  }

  return {
    ...nextWorkflow,
    values: {
      ...nextWorkflow.values,
      ...intent.initialValues
    }
  };
}

function summarizeWorkflowValues(values: Record<string, string>, keys: string[]) {
  const summary = keys
    .map((key) => values[key]?.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" -+ ");

  return summary || "Queued for operator review.";
}

function buildNextServiceRoPreview(rows: ServiceWorkspaceRow[]) {
  const maxRoNumber = rows.reduce((currentMax, row) => {
    const numericValue = Number.parseInt(row.roNumber.replace(/\D/g, ""), 10);

    return Number.isFinite(numericValue) ? Math.max(currentMax, numericValue) : currentMax;
  }, 100000);

  return String(maxRoNumber + 1);
}

function deriveServiceMakerFromModelInput(modelValue: string, fallbackMaker = "") {
  const normalizedModelValue = modelValue.trim();

  if (!normalizedModelValue) {
    return fallbackMaker.trim();
  }

  const makerTokens: string[] = [];

  for (const token of normalizedModelValue.split(/\s+/)) {
    const cleanedToken = token.replace(/[^A-Za-z0-9]/g, "");

    if (!cleanedToken) {
      continue;
    }

    if (/\d/.test(cleanedToken)) {
      break;
    }

    makerTokens.push(cleanedToken.toUpperCase());

    if (makerTokens.length >= 2) {
      break;
    }
  }

  return makerTokens.join(" ") || fallbackMaker.trim();
}

function buildServiceIntakeWorkflowPreviewItems(
  orderType: "Estimate" | "Repair Order",
  values: Record<string, string>,
  context: WorkflowContext
) {
  const modelValue = orderType === "Estimate" ? values.unit?.trim() ?? "" : values.model?.trim() ?? "";
  const makerValue = deriveServiceMakerFromModelInput(modelValue, context.serviceRow?.maker ?? "");
  const previewItems: WorkflowPreviewItem[] = [{ label: "Next RO", tone: "accent", value: buildNextServiceRoPreview(context.serviceRows) }];

  if (makerValue) {
    previewItems.push({ label: "Maker", tone: "neutral", value: makerValue });
  }

  return previewItems;
}

function buildServiceDuplicateWorkflowPreviewItems(values: Record<string, string>, context: WorkflowContext) {
  const previewItems: WorkflowPreviewItem[] = [
    { label: "Source", tone: "neutral", value: `RO ${context.serviceRow?.roNumber ?? "Pending"}` },
    { label: "Next RO", tone: "accent", value: buildNextServiceRoPreview(context.serviceRows) }
  ];
  const reason = values.reason?.trim();

  if (reason) {
    previewItems.push({ label: "Reason", tone: "stable", value: reason });
  }

  return previewItems;
}

function buildHeaderSearchCommands(menuGroups: NavigationGroup[]) {
  const commands: HeaderSearchCommand[] = workspaceOrder.map((workspaceId) => ({
    id: `workspace:${workspaceId}`,
    label: workspaceDefinitions[workspaceId].title,
    detail: workspaceDefinitions[workspaceId].subtitle,
    action: "workspace",
    workspaceId,
    keywords: [workspaceDefinitions[workspaceId].title, workspaceDefinitions[workspaceId].subtitle]
  }));

  quickLaunchButtons.forEach((button) => {
    if (button.workspaceId) {
      commands.push({
        id: `quick-launch:${button.slot}`,
        label: button.label,
        detail: `Quick launch ${button.slot}`,
        action: "workspace",
        workspaceId: button.workspaceId,
        keywords: [button.label, `quick launch ${button.slot}`]
      });
      return;
    }

    if (button.action === "switchStore") {
      commands.push({
        id: `quick-launch:${button.slot}`,
        label: button.label,
        detail: `Quick launch ${button.slot}`,
        action: "switchStore",
        keywords: [button.label, "change store", "switch location"]
      });
    }
  });

  function getNavigationItemLabel(item: NavigationMenuItem) {
    return typeof item === "string" ? item : item.label;
  }

  function isNavigationSubmenu(item: NavigationMenuItem): item is Exclude<NavigationMenuItem, string> & { items: NavigationMenuItem[] } {
    return typeof item !== "string" && "items" in item && Array.isArray(item.items);
  }

  function flattenNavigationLeaves(
    items: NavigationMenuItem[],
    pathLabels: string[] = []
  ): Array<{ keywords: string[]; label: string; pathLabels: string[] }> {
    return items.flatMap((item) => {
      const label = getNavigationItemLabel(item);
      const nextPathLabels = [...pathLabels, label];

      if (isNavigationSubmenu(item)) {
        return flattenNavigationLeaves(item.items, nextPathLabels);
      }

      return [
        {
          keywords: typeof item === "string" ? [] : item.keywords ?? [],
          label,
          pathLabels: nextPathLabels
        }
      ];
    });
  }

  menuGroups.forEach((group) => {
    flattenNavigationLeaves(group.items).forEach(({ label, pathLabels, keywords }) => {
      const detail = pathLabels.length > 1 ? `${group.label} / ${pathLabels.slice(0, -1).join(" / ")}` : group.label;
      const searchKeywords = [label, group.label, `${group.label} ${pathLabels.join(" ")}`, ...pathLabels, ...keywords];

      if (label === "Switch Store") {
        commands.push({
          id: `menu:${group.label}:${pathLabels.join(">")}`,
          label,
          detail,
          action: "switchStore",
          keywords: searchKeywords
        });
        return;
      }

      if (label === "Logout" || label === "Exit") {
        commands.push({
          id: `menu:${group.label}:${pathLabels.join(">")}`,
          label,
          detail,
          action: "logout",
          keywords: searchKeywords
        });
        return;
      }

      const workspaceId = resolveWorkspaceFromMenuItem(group.label, label);

      if (!workspaceId) {
        return;
      }

      commands.push({
        id: `menu:${group.label}:${pathLabels.join(">")}`,
        label,
        detail,
        action: "workspace",
        workspaceId,
        keywords: [...searchKeywords, workspaceDefinitions[workspaceId].title]
      });
    });
  });

  const uniqueCommands = new Map<string, HeaderSearchCommand>();

  commands.forEach((command) => {
    const key = `${command.action}:${command.workspaceId ?? "none"}:${command.detail.toLowerCase()}:${command.label.toLowerCase()}`;

    if (!uniqueCommands.has(key)) {
      uniqueCommands.set(key, command);
    }
  });

  return [...uniqueCommands.values()];
}

function searchHeaderCommands(commands: HeaderSearchCommand[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return [];
  }

  return commands
    .map((command) => ({ command, score: scoreHeaderCommand(command, normalizedSearch) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.command.label.localeCompare(right.command.label))
    .slice(0, 7)
    .map((entry) => entry.command);
}

function scoreHeaderCommand(command: HeaderSearchCommand, normalizedSearch: string) {
  const normalizedLabel = command.label.toLowerCase();
  const normalizedDetail = command.detail.toLowerCase();
  const normalizedKeywords = command.keywords.map((value) => value.toLowerCase());

  if (normalizedLabel === normalizedSearch) {
    return 600;
  }

  if (normalizedLabel.startsWith(normalizedSearch)) {
    return 450;
  }

  if (normalizedKeywords.some((value) => value === normalizedSearch)) {
    return 300;
  }

  if (normalizedDetail === normalizedSearch || normalizedDetail.startsWith(normalizedSearch)) {
    return 240;
  }

  if (normalizedKeywords.some((value) => value.startsWith(normalizedSearch))) {
    return 180;
  }

  const searchableValues = [normalizedLabel, normalizedDetail, ...normalizedKeywords];

  if (searchableValues.some((value) => value.split(/\s+/).some((token) => token.startsWith(normalizedSearch)))) {
    return 120;
  }

  if (searchableValues.some((value) => value.includes(normalizedSearch))) {
    return 80;
  }

  return 0;
}

function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

interface LabelValueProps {
  label: string;
  value: string;
}

function LabelValue({ label, value }: LabelValueProps) {
  return (
    <div className="legacy-label-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
