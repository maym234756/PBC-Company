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

const defaultApiBaseUrl =
  typeof window === "undefined"
    ? "http://localhost:4000/api"
    : `http://${window.location.hostname}:4000/api`;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl).replace(/\/$/, "");

export async function login(email: string, password: string) {
  return request<LoginPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getDashboard(storeId: string) {
  return request<DashboardPayload>(`/stores/${storeId}/dashboard`);
}

export async function getWorkspace(storeId: string, workspaceId: WorkspaceId) {
  return request<WorkspacePayload>(`/stores/${storeId}/workspaces/${workspaceId}`);
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

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}
