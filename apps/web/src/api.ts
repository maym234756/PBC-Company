import type {
  ActivityLogEntry,
  CommandTone,
  DashboardPayload,
  LoginPayload,
  ServiceWorkspaceRow,
  TaskNoteKind,
  TaskQueueEntry,
  TaskSlaPolicyEntry,
  TaskSlaPolicySource,
  TaskStatus,
  WorkspaceId,
  WorkspacePayload
} from "./types";

export interface CreateActivityRequest {
  workspaceId: WorkspaceId;
  label: string;
  detail: string;
  tone: CommandTone;
  actorUserId: string;
}

export interface WorkflowActionRequest {
  workspaceId: WorkspaceId;
  action: string;
  selectedRowId?: string | null;
  detail: string;
  tone: CommandTone;
  actorUserId: string;
  values: Record<string, string>;
}

export interface WorkflowActionResponse {
  workspaceId: WorkspaceId;
  focusRowId: string | null;
  message: string;
  activityEntry: ActivityLogEntry;
  taskEntry?: TaskQueueEntry;
}

export interface SandboxBackendModule {
  detail: string;
  name: string;
  sourceFiles: string[];
}

export interface SandboxTemplateRow {
  id: string;
  action: string;
  description: string;
  inUse: boolean;
  name: string;
  selectedModules: string[];
}

export interface SandboxRow {
  id: string;
  actionLinks: string[];
  completedOn: string;
  copiedFrom: string;
  currentOrgId: string;
  description: string;
  diffSummary: string;
  location: string;
  name: string;
  releaseType: string;
  selectedModules: string[];
  status: string;
  templateId: string | null;
  type: string;
}

export interface SandboxHistoryRow {
  activated: string;
  activatedBy: string;
  detail: string;
  diffSummary: string;
  eventType: string;
  finished: string;
  id: string;
  refreshed: string;
  requestedBy: string;
  sandbox: string;
}

export interface SandboxWorkspacePayload {
  history: SandboxHistoryRow[];
  sandboxes: SandboxRow[];
  templates: SandboxTemplateRow[];
}

export interface SandboxLoginAccess {
  apiKey: string;
  dealerGroupName: string;
  loginEmail: string;
  readOnlyNotice: string;
  sandboxId: string;
  sandboxName: string;
  sourceStoreId: string;
  sourceStoreName: string;
}

export interface SandboxMutationResponse extends SandboxWorkspacePayload {
  message: string;
}

export type SandboxPromotionCheckStatus = "ready" | "warning" | "attention";
export type SandboxPromotionRiskLevel = "low" | "medium" | "high";

export interface SandboxPromotionChange {
  affectedLeafs: string[];
  affectedViews: string[];
  entityName: string;
  fieldName: string;
  id: string;
  impactSummary: string;
  leafName: string;
  moduleName: string;
  productionState: string;
  productionValue: string;
  riskLevel: SandboxPromotionRiskLevel;
  sandboxState: string;
  sandboxValue: string;
  sourceFiles: string[];
  viewName: string;
}

export interface SandboxPromotionComparison {
  affectedLeafs: string[];
  fieldDiffs: string[];
  id: string;
  impactSummary: string;
  productionViewLabel: string;
  riskLevel: SandboxPromotionRiskLevel;
  sandboxViewLabel: string;
  title: string;
}

export interface SandboxPromotionValidation {
  detail: string;
  id: string;
  label: string;
  status: SandboxPromotionCheckStatus;
}

export interface SandboxPromotionPreview {
  changes: SandboxPromotionChange[];
  comparisonViews: SandboxPromotionComparison[];
  generatedAt: string;
  healthScore: number;
  hiddenContainerLabel: string;
  sandboxId: string;
  sandboxName: string;
  summary: string;
  validationChecks: SandboxPromotionValidation[];
}

export interface SandboxPushRequest {
  actorName?: string;
  selectedChangeIds: string[];
  validatedCheckIds: string[];
}

export interface SandboxPushResponse extends SandboxWorkspacePayload {
  deployedChangeCount: number;
  deployedModules: string[];
  message: string;
  preview: SandboxPromotionPreview;
}

export interface SandboxTemplateMutationRequest {
  description: string;
  name: string;
  selectedModules: string[];
}

export interface CreateSandboxRequest {
  actorEmail?: string;
  actorName?: string;
  name: string;
  purpose: string;
  selectedModules: string[];
  templateId?: string | null;
  type: string;
}

export interface UpdateSandboxRequest {
  description?: string;
  location?: string;
  name?: string;
  releaseType?: string;
  selectedModules?: string[];
  status?: string;
  type?: string;
}

export interface SandboxActionRequest {
  actorName?: string;
  mode: "activate" | "clone" | "delete" | "login" | "promote" | "refresh";
}

export interface CashierAccountabilityReportOperator {
  operatorKey: string;
  actorUserId: string | null;
  name: string;
  initial: string;
  title: string;
  activityCount: number;
  activeDateCount: number;
  latestActivityAt: string;
  latestActivityLabel: string;
}

export interface CashierAccountabilityReportEntry {
  id: string;
  operatorKey: string;
  actorUserId: string | null;
  actorName: string;
  actorInitial: string;
  actorTitle: string;
  workspaceId: WorkspaceId;
  label: string;
  detail: string;
  tone: CommandTone;
  occurredAt: string;
}

export interface CashierAccountabilityReportResponse {
  storeId: string;
  storeName: string;
  startDate: string;
  endDate: string;
  operators: CashierAccountabilityReportOperator[];
  entries: CashierAccountabilityReportEntry[];
}

export interface TechnicianWorkloadReportTechnician {
  repairOrderCount: number;
  id: string;
  name: string;
  availableHours: number;
  billedHours: number;
  creditedHours: number;
  active: boolean;
}

export interface TechnicianWorkloadReportSessionDetail {
  id: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  actualHours: number;
  creditedHours: number;
  override: string;
  status: "Clocked In" | "Clocked Out";
}

export interface TechnicianWorkloadReportJobDetail {
  id: string;
  roNumber: string;
  customerName: string;
  stockNumber: string;
  model: string;
  serviceWriter: string;
  roStatus: string;
  jobTitle: string;
  availableHours: number;
  billedHours: number;
  creditedHours: number;
  sessionCount: number;
  sessions: TechnicianWorkloadReportSessionDetail[];
}

export interface TechnicianWorkloadReportTechnicianDetail {
  technicianId: string;
  technicianName: string;
  repairOrderCount: number;
  availableHours: number;
  billedHours: number;
  creditedHours: number;
  jobCount: number;
  jobs: TechnicianWorkloadReportJobDetail[];
}

export interface TechnicianWorkloadReportResponse {
  storeId: string;
  storeName: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  technicians: TechnicianWorkloadReportTechnician[];
  technicianDetails: TechnicianWorkloadReportTechnicianDetail[];
}

export interface SalesDealDepositEntry {
  id: string;
  invoice: string;
  date: string;
  cashier: string;
  method: string;
  arName: string;
  amount: number;
  description: string;
  notes: string;
  reference: string;
}

export interface SalesDealDepositActivity {
  id: string;
  title: string;
  detail: string;
  meta: string;
}

export interface SalesDealDepositsResponse {
  dealId: string;
  dealNumber: string;
  customerName: string;
  status: "Pending" | "Posted";
  targetAmount: number;
  capturedAmount: number;
  remainingAmount: number;
  ledger: SalesDealDepositEntry[];
  activity: SalesDealDepositActivity[];
}

export interface CreateSalesDealDepositRequest {
  actorUserId: string;
  cashier: string;
  password: string;
  date: string;
  description: string;
  method: string;
  amount: number;
  notes: string;
  arAccount: string;
}

export interface SalesDealDepositActivityActionRequest {
  actorUserId: string;
  mode: "sendReceipt" | "reprint";
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  actorUserId: string;
}

export interface UpdateTaskResponse {
  message: string;
  taskEntry: TaskQueueEntry;
  activityEntry: ActivityLogEntry;
}

export interface UpdateTaskAssigneeRequest {
  actorUserId: string;
  assigneeUserId: string | null;
}

export interface CreateTaskNoteRequest {
  actorUserId: string;
  body: string;
  kind: TaskNoteKind;
}

export interface CleanupServiceUtilityQaRequest {
  actorUserId: string;
  roNumber: string;
}

export interface CleanupServiceUtilityQaResponse {
  message: string;
  deletedTaskCount: number;
  deletedActivityCount: number;
  deletedTaskIds: string[];
  activityEntry: ActivityLogEntry | null;
}

export interface ServiceOrderPartCatalogEntry {
  partNumber: string;
  description: string;
  supplier: string;
  category: string;
  price: number;
}

export interface ServiceOrderDetailResponse {
  row: ServiceWorkspaceRow;
  detail: unknown;
  partCatalog: ServiceOrderPartCatalogEntry[];
}

export interface BoatInventoryUnit {
  id: string;
  stockNumber: string;
  vinHin: string;
  status: string;
  condition: string;
  year: number;
  make: string;
  model: string;
  lengthFt: number;
  engine: string;
  exteriorColor: string;
  interiorColor: string;
  location: string;
  ageDays: number;
  costCents: number;
  priceCents: number;
  photosJson: string;
  notes: string;
  storeId: string;
}

export type BoatInventoryUnitInput = Omit<BoatInventoryUnit, "id" | "storeId">;

export interface NormalizedServiceOrderResponse {
  source: "normalized" | "snapshot";
  serviceOrder: unknown;
}

export interface CreateServiceOrderRequest {
  actorUserId: string;
  orderType: "Estimate" | "Repair Order";
  customerName: string;
  stockNumber: string;
  model: string;
  serviceWriter: string;
  maker: string;
  note: string;
}

export interface DuplicateServiceOrderRequest {
  actorUserId: string;
  reason: string;
}

export type ServiceOrderActionRequest =
  | {
      mode: "createJob";
      actorUserId: string;
      title: string;
      unitLabel: string;
      description: string;
      technician: string;
      jobCode: string;
      recommendations: string;
      resolution: string;
    }
  | {
      mode: "updateJob";
      actorUserId: string;
      jobId: string;
      title: string;
      unitLabel: string;
      customerApproval: string;
      status: string;
      appliance: string;
      warranty: string;
      description: string;
      resolution: string;
      recommendations: string;
      technician: string;
      laborRate: string;
      chargeBy: string;
      rate: number;
      quantity: number;
    }
  | {
      mode: "addPart";
      actorUserId: string;
      jobId: string;
      partNumber: string;
      description: string;
      supplier: string;
      available: number;
      price: number;
      quantity: number;
      category: string;
    }
  | {
      mode: "removePart";
      actorUserId: string;
      jobId: string;
      partNumber: string;
    }
  | {
      mode: "addLaborSession";
      actorUserId: string;
      jobId: string;
      technician: string;
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      actualHours: string;
      creditedHours: string;
      override: string;
    }
  | {
      mode: "updateWarrantyClaim";
      actorUserId: string;
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
    }
  | {
      mode: "updateOrderType";
      actorUserId: string;
      orderType: "Estimate" | "Repair Order";
    }
  | {
      mode: "updateNotes";
      actorUserId: string;
      notes: string;
      transferNotes: string;
    }
  | {
      mode: "updateCustomer";
      actorUserId: string;
      customerName: string;
      addressLine1: string;
      location: string;
      homePhone: string;
      cellPhone: string;
      workPhone: string;
      email: string;
      customerNo: string;
    }
  | {
      mode: "updateQueueRow";
      actorUserId: string;
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
    }
  | {
      mode: "deleteJob";
      actorUserId: string;
      jobId: string;
    }
  | {
      mode: "closeLabor";
      actorUserId: string;
      jobId: string;
      lineIndex: number;
      actorName: string;
    }
  | {
      mode: "reopenLabor";
      actorUserId: string;
      jobId: string;
      lineIndex: number;
    }
  | {
      mode: "deleteLaborSession";
      actorUserId: string;
      sessionIndex: number;
    }
  | {
      mode: "editLaborSession";
      actorUserId: string;
      sessionIndex: number;
      technician: string;
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      actualHours: string;
      creditedHours: string;
      override: string;
    }
  | {
      mode: "updateROHeader";
      actorUserId: string;
      purchaseOrder: string;
      promisedDate: string;
      closedDate: string;
    }
  | {
      mode: "finalizeInvoice";
      actorUserId: string;
      invoiceStatus: "Draft" | "Finalized" | "Paid" | "Voided";
    }
  | {
      mode: "updateJobStatus";
      actorUserId: string;
      jobId: string;
      status: string;
    }
  | {
      mode: "requestSignature";
      actorUserId: string;
      docType: string;
      recipient: string;
      message: string;
    }
  | {
      mode: "recordPayment";
      actorUserId: string;
      method: string;
      amount: number;
      reference: string;
    };

export interface ServiceOrderActionResponse extends ServiceOrderDetailResponse {
  message: string;
  activityEntry: ActivityLogEntry;
}

export interface CreateServiceOrderResponse extends ServiceOrderDetailResponse {
  message: string;
  activityEntry: ActivityLogEntry;
}

export interface UpdateTaskSlaPolicyRequest {
  workspaceId: WorkspaceId;
  action: string;
  slaMinutes: number;
  actorUserId: string;
  applyToOpenTasks?: boolean;
}

export interface UpdateTaskSlaPolicyResponse {
  message: string;
  policyEntry: TaskSlaPolicyEntry;
  retimedTaskCount: number;
  activityEntry: ActivityLogEntry;
}

export interface PreviewTaskSlaPolicyCopyRequest {
  actorUserId: string;
  targetStoreId: string;
}

export type TaskSlaPolicyCopyPreviewChangeType = "create" | "update" | "remove" | "unchanged";

export interface TaskSlaPolicyCopyPreviewEntry {
  workspaceId: WorkspaceId;
  workspaceLabel: string;
  action: string;
  sourceStoreSlaMinutes: number | null;
  sourceStoreSlaLabel: string | null;
  sourceStoreSource: TaskSlaPolicySource | null;
  targetStoreSlaMinutes: number | null;
  targetStoreSlaLabel: string | null;
  targetStoreSource: TaskSlaPolicySource | null;
  nextTargetSlaMinutes: number | null;
  nextTargetSlaLabel: string | null;
  nextTargetSource: "Custom" | null;
  changeType: TaskSlaPolicyCopyPreviewChangeType;
}

export interface TaskSlaPolicyCopyPreviewResponse {
  message: string;
  sourceStoreName: string;
  targetStoreName: string;
  changedRuleCount: number;
  totalRuleCount: number;
  comparison: TaskSlaPolicyCopyPreviewEntry[];
}

export type TaskSlaPolicyActionRequest =
  | {
      mode: "copyOneToStore";
      actorUserId: string;
      targetStoreId: string;
      workspaceId: WorkspaceId;
      action: string;
      applyToOpenTasks?: boolean;
    }
  | {
      mode: "copyToStore";
      actorUserId: string;
      targetStoreId: string;
      applyToOpenTasks?: boolean;
    }
  | {
      mode: "resetAll";
      actorUserId: string;
      applyToOpenTasks?: boolean;
    }
  | {
      mode: "resetOne";
      actorUserId: string;
      workspaceId: WorkspaceId;
      action: string;
      applyToOpenTasks?: boolean;
    };

export interface TaskSlaPolicyActionResponse {
  message: string;
  updatedPolicyCount: number;
  retimedTaskCount: number;
  activityEntry: ActivityLogEntry;
}

export interface CrmContactProfile {
  id: string;
  name: string;
  owner: string;
  location: string;
  phone: string;
  email: string;
  company: string;
  stage: string;
  tags: string[];
  consentText: string;
  consentEmail: string;
  lastTouch: string;
  lastChannel: string;
  nextAction: string;
  healthScore: number;
  openBalance: number;
  opportunityValue: number;
  reviewScore: number;
  integrationId: string;
  dealReference: string;
}

export interface CrmConversationMessage {
  id: string;
  author: string;
  body: string;
  timeLabel: string;
  direction: "inbound" | "outbound";
  status: string;
}

export interface CrmConversationThread {
  id: string;
  contactId: string;
  channel: "SMS" | "Email";
  subject: string;
  preview: string;
  queueLabel: string;
  assignment: string;
  status: "Open" | "Pending" | "Escalated";
  unreadCount: number;
  lastTouch: string;
  messages: CrmConversationMessage[];
}

export interface CrmReviewItem {
  id: string;
  contactId: string;
  author: string;
  platform: string;
  rating: number;
  postedAt: string;
  body: string;
  owner: string;
  state: "Needs Response" | "Responded";
}

export interface CrmPaymentRecord {
  id: string;
  contactId: string;
  createdAt: string;
  customer: string;
  confirmation: string;
  invoice: string;
  amount: number;
  type: string;
  status: "Pending" | "Link Sent" | "Paid" | "Refunded" | "Promise to Pay";
  reconciled: boolean;
  owner: string;
  detail: string;
}

export interface CrmActivityEntry {
  id: string;
  contactId: string;
  kind: "SMS" | "Email" | "Call" | "Task" | "Review" | "Payment" | "Quote";
  title: string;
  detail: string;
  owner: string;
  source: string;
  timeLabel: string;
  priority: "Low" | "Normal" | "High";
  state: "Open" | "Done";
}

export interface CrmCommunicatePayload {
  contacts: CrmContactProfile[];
  conversations: CrmConversationThread[];
  reviews: CrmReviewItem[];
  payments: CrmPaymentRecord[];
  activities: CrmActivityEntry[];
}

export interface CreateCrmThreadRequest {
  actorName: string;
  name: string;
  phone: string;
  email?: string;
}

export interface CreateCrmThreadResponse {
  message: string;
  contactId: string;
  conversationId: string;
}

export interface UpdateCrmContactQuickInfoRequest {
  name?: string;
  phone?: string;
  email?: string;
  stage?: string;
}

export interface UpdateCrmContactQuickInfoResponse {
  message: string;
  contactId: string;
}

export interface SendCrmConversationSmsRequest {
  actorName: string;
  body: string;
}

export interface SendCrmConversationSmsResponse {
  message: string;
  contactId: string;
  conversationId: string;
  sid: string | null;
  status: string;
}

const defaultApiBaseUrl =
  typeof window === "undefined"
    ? "http://localhost:4000/api"
    : `http://${window.location.hostname}:4000/api`;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl).replace(/\/$/, "");
const SESSION_STORAGE_KEY = "marine-cloud-session";

export async function login(email: string, password: string, sandboxId?: string | null) {
  return request<LoginPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, sandboxId: sandboxId ?? null })
  });
}

export async function getSandboxLoginAccess(sandboxId: string) {
  return request<SandboxLoginAccess>(`/sandboxes/${sandboxId}/login-access`);
}

export async function getDashboard(storeId: string) {
  return request<DashboardPayload>(`/stores/${storeId}/dashboard`);
}

export async function getWorkspace(storeId: string, workspaceId: WorkspaceId) {
  return request<WorkspacePayload>(`/stores/${storeId}/workspaces/${workspaceId}`);
}

export async function getCashierAccountabilityReport(storeId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });

  return request<CashierAccountabilityReportResponse>(`/stores/${storeId}/reports/cashier-accountability?${params.toString()}`);
}

export async function getTechnicianWorkloadReport(storeId: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });

  return request<TechnicianWorkloadReportResponse>(`/stores/${storeId}/reports/technician-workload?${params.toString()}`);
}

export async function getActivityLog(storeId: string, workspaceId: WorkspaceId, actorUserId?: string, limit?: number) {
  const params = new URLSearchParams({ workspaceId });

  if (actorUserId) {
    params.set("actorUserId", actorUserId);
  }

  if (limit) {
    params.set("limit", `${limit}`);
  }

  return request<ActivityLogEntry[]>(`/stores/${storeId}/activity?${params.toString()}`);
}

export async function getTaskQueue(storeId: string, workspaceId: WorkspaceId, actorUserId?: string, limit?: number) {
  const params = new URLSearchParams({ workspaceId });

  if (actorUserId) {
    params.set("actorUserId", actorUserId);
  }

  if (limit) {
    params.set("limit", `${limit}`);
  }

  return request<TaskQueueEntry[]>(`/stores/${storeId}/tasks?${params.toString()}`);
}

export async function createActivityLog(storeId: string, payload: CreateActivityRequest) {
  return request<ActivityLogEntry>(`/stores/${storeId}/activity`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function submitWorkflowAction(storeId: string, payload: WorkflowActionRequest) {
  return request<WorkflowActionResponse>(`/stores/${storeId}/workflow-actions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getSalesDealDeposits(storeId: string, dealId: string) {
  return request<SalesDealDepositsResponse>(`/stores/${storeId}/sales-deals/${dealId}/deposits`);
}

export async function createSalesDealDeposit(storeId: string, dealId: string, payload: CreateSalesDealDepositRequest) {
  return request<SalesDealDepositsResponse>(`/stores/${storeId}/sales-deals/${dealId}/deposits`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createSalesDealDepositActivity(
  storeId: string,
  dealId: string,
  depositId: string,
  payload: SalesDealDepositActivityActionRequest
) {
  return request<SalesDealDepositsResponse>(`/stores/${storeId}/sales-deals/${dealId}/deposits/${depositId}/activity`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateTaskStatus(storeId: string, taskId: string, payload: UpdateTaskStatusRequest) {
  return request<UpdateTaskResponse>(`/stores/${storeId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function updateTaskAssignee(storeId: string, taskId: string, payload: UpdateTaskAssigneeRequest) {
  return request<UpdateTaskResponse>(`/stores/${storeId}/tasks/${taskId}/assignee`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function createTaskNote(storeId: string, taskId: string, payload: CreateTaskNoteRequest) {
  return request<UpdateTaskResponse>(`/stores/${storeId}/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function cleanupServiceUtilityQaTasks(storeId: string, payload: CleanupServiceUtilityQaRequest) {
  return request<CleanupServiceUtilityQaResponse>(`/stores/${storeId}/tasks/actions`, {
    method: "POST",
    body: JSON.stringify({
      mode: "cleanupServiceUtilityQa",
      ...payload
    })
  });
}

export async function getServiceOrderDetail(storeId: string, serviceOrderId: string) {
  return request<ServiceOrderDetailResponse>(`/stores/${storeId}/service-orders/${serviceOrderId}`);
}

export async function createServiceOrder(storeId: string, payload: CreateServiceOrderRequest) {
  return request<CreateServiceOrderResponse>(`/stores/${storeId}/service-orders`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function duplicateServiceOrder(storeId: string, serviceOrderId: string, payload: DuplicateServiceOrderRequest) {
  return request<CreateServiceOrderResponse>(`/stores/${storeId}/service-orders/${serviceOrderId}/duplicate`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateServiceOrderDetail(storeId: string, serviceOrderId: string, payload: ServiceOrderActionRequest) {
  return request<ServiceOrderActionResponse>(`/stores/${storeId}/service-orders/${serviceOrderId}/actions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getNormalizedServiceOrder(storeId: string, roNumber: string) {
  return request<NormalizedServiceOrderResponse>(`/stores/${storeId}/service-orders/${encodeURIComponent(roNumber)}/normalized`);
}

export async function normalizeServiceOrder(storeId: string, roNumber: string) {
  return request<{ ok: boolean; createdJobs: number }>(`/stores/${storeId}/service-orders/${encodeURIComponent(roNumber)}/normalize`, {
    method: "POST"
  });
}

export async function updateTaskSlaPolicy(storeId: string, payload: UpdateTaskSlaPolicyRequest) {
  return request<UpdateTaskSlaPolicyResponse>(`/stores/${storeId}/task-sla-policies`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function previewTaskSlaPolicyCopy(storeId: string, payload: PreviewTaskSlaPolicyCopyRequest) {
  return request<TaskSlaPolicyCopyPreviewResponse>(`/stores/${storeId}/task-sla-policies/actions`, {
    method: "POST",
    body: JSON.stringify({
      mode: "previewCopyToStore",
      ...payload
    })
  });
}

export async function runTaskSlaPolicyAction(storeId: string, payload: TaskSlaPolicyActionRequest) {
  return request<TaskSlaPolicyActionResponse>(`/stores/${storeId}/task-sla-policies/actions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getVendors(storeId: string): Promise<unknown[]> {
  const response = await fetch(`/api/stores/${storeId}/vendors`);
  if (!response.ok) throw new Error("Failed to fetch vendors");
  return response.json() as Promise<unknown[]>;
}

export async function createVendor(storeId: string, data: { name: string; contact: string; phone: string; email: string; terms: string; leadDays: number; notes: string }): Promise<unknown> {
  const response = await fetch(`/api/stores/${storeId}/vendors`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) throw new Error("Failed to create vendor");
  return response.json();
}

export async function updateVendor(storeId: string, vendorId: string, data: Partial<{ name: string; contact: string; phone: string; email: string; terms: string; leadDays: number; notes: string }>): Promise<unknown> {
  const response = await fetch(`/api/stores/${storeId}/vendors/${vendorId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) throw new Error("Failed to update vendor");
  return response.json();
}

export async function getPricingRules(storeId: string): Promise<unknown[]> {
  const response = await fetch(`/api/stores/${storeId}/pricing-rules`);
  if (!response.ok) throw new Error("Failed to fetch pricing rules");
  return response.json() as Promise<unknown[]>;
}

export async function getApprovals(storeId: string): Promise<unknown[]> {
  const response = await fetch(`/api/stores/${storeId}/approvals`);
  if (!response.ok) throw new Error("Failed to fetch approvals");
  return response.json() as Promise<unknown[]>;
}

export async function updateApproval(storeId: string, approvalId: string, data: { status: string; reviewedBy?: string; reviewNote?: string }): Promise<unknown> {
  const response = await fetch(`/api/stores/${storeId}/approvals/${approvalId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!response.ok) throw new Error("Failed to update approval");
  return response.json();
}

export async function getBoatInventoryUnits(storeId: string) {
  return request<BoatInventoryUnit[]>(`/stores/${storeId}/boat-inventory`);
}

export async function createBoatInventoryUnit(storeId: string, data: BoatInventoryUnitInput) {
  return request<BoatInventoryUnit>(`/stores/${storeId}/boat-inventory`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateBoatInventoryUnit(storeId: string, unitId: string, data: Partial<BoatInventoryUnitInput>) {
  return request<BoatInventoryUnit>(`/stores/${storeId}/boat-inventory/${unitId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteBoatInventoryUnit(storeId: string, unitId: string) {
  return request<{ ok: boolean }>(`/stores/${storeId}/boat-inventory/${unitId}`, {
    method: "DELETE"
  });
}

export interface GlobalSearchResult {
  serviceOrders: unknown[];
  partsLines: unknown[];
  salesDeals: unknown[];
  units: unknown[];
}

export async function globalSearch(storeId: string, query: string): Promise<GlobalSearchResult> {
  return request<GlobalSearchResult>(`/stores/${storeId}/search?q=${encodeURIComponent(query)}`);
}

export async function getSandboxBackendModules() {
  return request<SandboxBackendModule[]>("/sandbox/backend-modules");
}

export async function getSandboxWorkspace(storeId: string) {
  return request<SandboxWorkspacePayload>(`/stores/${storeId}/sandbox-workspace`);
}

export async function getSandboxPromotionPreview(storeId: string, sandboxId: string) {
  return request<SandboxPromotionPreview>(`/stores/${storeId}/sandboxes/${sandboxId}/promotion-preview`);
}

export async function createSandboxTemplate(storeId: string, payload: SandboxTemplateMutationRequest) {
  return request<SandboxMutationResponse>(`/stores/${storeId}/sandbox-templates`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSandboxTemplate(storeId: string, templateId: string, payload: SandboxTemplateMutationRequest) {
  return request<SandboxMutationResponse>(`/stores/${storeId}/sandbox-templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSandboxTemplate(storeId: string, templateId: string) {
  return request<SandboxMutationResponse>(`/stores/${storeId}/sandbox-templates/${templateId}`, {
    method: "DELETE"
  });
}

export async function createSandbox(storeId: string, payload: CreateSandboxRequest) {
  return request<SandboxMutationResponse>(`/stores/${storeId}/sandboxes`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSandbox(storeId: string, sandboxId: string, payload: UpdateSandboxRequest) {
  return request<SandboxMutationResponse>(`/stores/${storeId}/sandboxes/${sandboxId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function runSandboxAction(storeId: string, sandboxId: string, payload: SandboxActionRequest) {
  return request<SandboxMutationResponse>(`/stores/${storeId}/sandboxes/${sandboxId}/actions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function pushSandboxToProduction(storeId: string, sandboxId: string, payload: SandboxPushRequest) {
  return request<SandboxPushResponse>(`/stores/${storeId}/sandboxes/${sandboxId}/push-to-production`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getCrmCommunicate(storeId: string) {
  return request<CrmCommunicatePayload>(`/stores/${storeId}/crm/communicate`);
}

export async function createCrmThread(storeId: string, payload: CreateCrmThreadRequest) {
  return request<CreateCrmThreadResponse>(`/stores/${storeId}/crm/threads`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateCrmContactQuickInfo(storeId: string, contactId: string, payload: UpdateCrmContactQuickInfoRequest) {
  return request<UpdateCrmContactQuickInfoResponse>(`/stores/${storeId}/crm/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function sendCrmConversationSms(storeId: string, conversationId: string, payload: SendCrmConversationSmsRequest) {
  return request<SendCrmConversationSmsResponse>(`/stores/${storeId}/crm/conversations/${conversationId}/messages/send`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getDealerSetupPersistedDealers<T>(storeId: string) {
  return request<{ dealers: T[] }>(`/stores/${storeId}/dealer-setup/dealers`);
}

export async function createDealerSetupDealer<T>(storeId: string, payload: { dealer: T }) {
  return request<{ dealer: T; message: string }>(`/stores/${storeId}/dealer-setup/dealers`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function request<T>(path: string, init?: RequestInit) {
  const sandboxHeaders = readSandboxSessionHeaders();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...sandboxHeaders,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

function readSandboxSessionHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as {
      mode?: string;
      sandboxContext?: {
        sandboxId?: string;
      } | null;
    };

    if (parsed.mode !== "sandbox") {
      return {};
    }

    return {
      "X-Marine-Sandbox-Id": parsed.sandboxContext?.sandboxId ?? "",
      "X-Marine-Session-Mode": "sandbox"
    };
  } catch {
    return {};
  }
}
