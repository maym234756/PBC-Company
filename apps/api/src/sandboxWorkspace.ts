import { randomBytes } from "node:crypto";
import { prisma } from "@marine-cloud/database";
import { sandboxBackendModules, type SandboxBackendModule } from "./sandboxBackendModules.js";

const sandboxActionLinks = ["Clone", "Refresh", "Promote", "Log In", "Del"] as const;

const defaultTemplateBlueprints = [
  {
    description: "Backend-safe template for CRM, website, workflow, and service API changes.",
    name: "teamMarine",
    selectedModules: [
      "Dashboard + Workspace API Routes",
      "CRM Communicate Backend",
      "Twilio Messaging Flows",
      "Service Notification Rules",
      "Service Order Detail",
      "Workflow Action Plans"
    ]
  }
] as const;

const defaultSandboxBlueprints = [
  {
    activatedAt: new Date("2026-01-21T01:59:00.000Z"),
    activatedBy: "",
    completedAt: new Date("2026-01-21T01:54:00.000Z"),
    copiedFromLabel: "Premier Marine Cloud Template",
    description: "Integration validation lane for marine inventory and CRM routing.",
    location: "Hyperforce USA952S",
    name: "Miles",
    refreshedAt: new Date("2026-01-21T00:36:00.000Z"),
    releaseType: "Non-Preview",
    requestedBy: "Miles May",
    selectedModules: ["CRM Communicate Backend", "Dashboard + Workspace API Routes", "Workflow Action Plans", "Task + Activity Ledger"],
    status: "Completed",
    templateName: null,
    type: "Developer"
  },
  {
    activatedAt: new Date("2025-11-19T21:26:00.000Z"),
    activatedBy: "Automated Process",
    completedAt: new Date("2025-11-19T21:14:00.000Z"),
    copiedFromLabel: "Premier Marine Cloud Partial Copy",
    description: "Team marine regression sandbox for website, Twilio, and workflow checks.",
    location: "Hyperforce USA710S",
    name: "teamMarine",
    refreshedAt: new Date("2025-11-19T20:20:00.000Z"),
    releaseType: "Preview",
    requestedBy: "teamMarine",
    selectedModules: [
      "Dashboard + Workspace API Routes",
      "CRM Communicate Backend",
      "Twilio Messaging Flows",
      "Service Notification Rules",
      "Service Order Detail",
      "Workflow Action Plans"
    ],
    status: "Completed",
    templateName: "teamMarine",
    type: "Partial Copy"
  }
] as const;

export interface SandboxTemplateRecord {
  id: string;
  action: string;
  description: string;
  inUse: boolean;
  name: string;
  selectedModules: string[];
}

export interface SandboxRecord {
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

export interface SandboxHistoryRecord {
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
  history: SandboxHistoryRecord[];
  sandboxes: SandboxRecord[];
  templates: SandboxTemplateRecord[];
}

export interface SandboxTemplateInput {
  description: string;
  name: string;
  selectedModules: string[];
}

export interface SandboxCreateInput {
  actorEmail?: string;
  actorName?: string;
  name: string;
  purpose: string;
  selectedModules: string[];
  templateId?: string | null;
  type: string;
}

export interface SandboxUpdateInput {
  description?: string;
  location?: string;
  name?: string;
  releaseType?: string;
  selectedModules?: string[];
  status?: string;
  type?: string;
}

export interface SandboxActionInput {
  actorName?: string;
  mode: "activate" | "clone" | "delete" | "login" | "promote" | "refresh";
}

export interface SandboxWorkspaceMutationResult extends SandboxWorkspacePayload {
  message: string;
}

export interface SandboxLoginAccessRecord {
  apiKey: string;
  dealerGroupName: string;
  loginEmail: string;
  readOnlyNotice: string;
  sandboxId: string;
  sandboxName: string;
  sourceStoreId: string;
  sourceStoreName: string;
}

export interface SandboxAuthPayload {
  sandbox: SandboxLoginAccessRecord;
  stores: Array<{
    city: string;
    code: string;
    dealerGroupName: string;
    id: string;
    name: string;
    state: string;
    statusLine: string;
  }>;
  user: {
    avatarInitial: string;
    dealerGroupName: string;
    email: string;
    id: string;
    name: string;
    title: string;
  };
}

export type SandboxPromotionCheckStatus = "ready" | "warning" | "attention";
export type SandboxPromotionRiskLevel = "low" | "medium" | "high";

export interface SandboxPromotionChangeRecord {
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

export interface SandboxPromotionComparisonRecord {
  affectedLeafs: string[];
  fieldDiffs: string[];
  id: string;
  impactSummary: string;
  productionViewLabel: string;
  riskLevel: SandboxPromotionRiskLevel;
  sandboxViewLabel: string;
  title: string;
}

export interface SandboxPromotionValidationRecord {
  detail: string;
  id: string;
  label: string;
  status: SandboxPromotionCheckStatus;
}

export interface SandboxPromotionPreviewRecord {
  changes: SandboxPromotionChangeRecord[];
  comparisonViews: SandboxPromotionComparisonRecord[];
  generatedAt: string;
  healthScore: number;
  hiddenContainerLabel: string;
  sandboxId: string;
  sandboxName: string;
  summary: string;
  validationChecks: SandboxPromotionValidationRecord[];
}

export interface SandboxPushToProductionInput {
  actorName?: string;
  selectedChangeIds: string[];
  validatedCheckIds: string[];
}

export interface SandboxPushToProductionResponse extends SandboxWorkspacePayload {
  deployedChangeCount: number;
  deployedModules: string[];
  message: string;
  preview: SandboxPromotionPreviewRecord;
}

interface SandboxPromotionBlueprint {
  affectedLeafs: string[];
  affectedViews: string[];
  impactSummary: string;
  productionState: string;
  riskLevel: SandboxPromotionRiskLevel;
  sandboxState: string;
  validationChecks: Array<{
    detail: string;
    idSuffix: string;
    label: string;
    status: SandboxPromotionCheckStatus;
  }>;
}

interface SandboxPromotionDiffSeed {
  entityName: string;
  fieldName: string;
  impactSummary: string;
  leafName: string;
  productionValue: string;
  riskLevel: SandboxPromotionRiskLevel;
  sandboxValue: string;
  sourceFile: string;
  viewName: string;
}

interface SandboxPromotionDiffMutationClient {
  sandboxPromotionDiff: {
    createMany(args: {
      data: Array<{
        entityName: string;
        fieldName: string;
        impactSummary: string;
        leafName: string;
        moduleName: string;
        productionValue: string;
        riskLevel: string;
        sandboxId: string;
        sandboxValue: string;
        sourceFile: string;
        storeId: string;
        viewName: string;
      }>;
    }): Promise<unknown>;
    deleteMany(args: { where: { sandboxId: string } }): Promise<unknown>;
  };
}

function formatSandboxDateTime(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  return value.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "numeric",
    year: "numeric"
  });
}

function parseSelectedModulesJson(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function normalizeSelectedModules(selectedModules: string[]) {
  const allowedNames = new Set(sandboxBackendModules.map((module) => module.name));
  return [...new Set(selectedModules.map((value) => value.trim()).filter((value) => value.length > 0 && allowedNames.has(value)))];
}

function buildSandboxDiffSummary(selectedModules: string[]) {
  const modules = sandboxBackendModules.filter((module) => selectedModules.includes(module.name));
  const sourceFiles = new Set(modules.flatMap((module) => module.sourceFiles));

  if (modules.length === 0) {
    return "No backend modules selected.";
  }

  return `${modules.length} backend modules isolated across ${sourceFiles.size} source files.`;
}

function deriveReleaseType(type: string) {
  return type === "Partial Copy" ? "Preview" : "Non-Preview";
}

function buildSandboxOrgId(date: Date) {
  return `00DSB${String(date.getTime()).slice(-8)}`;
}

function buildPromotionRecordId(prefix: string, moduleName: string, suffix?: string) {
  const slug = moduleName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return suffix ? `${prefix}-${slug}-${suffix}` : `${prefix}-${slug}`;
}

function normalizePromotionRiskLevel(value: string): SandboxPromotionRiskLevel {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function buildFallbackPromotionDiffSeeds(module: SandboxBackendModule): SandboxPromotionDiffSeed[] {
  const primarySourceFile = module.sourceFiles[0] ?? "apps/api/src/server.ts";
  const secondarySourceFile = module.sourceFiles[module.sourceFiles.length - 1] ?? primarySourceFile;

  return [
    {
      entityName: module.name,
      fieldName: "deploymentScope",
      impactSummary: module.detail,
      leafName: "Sandbox",
      productionValue: `Production continues to use the current ${module.name} behavior.`,
      riskLevel: "medium",
      sandboxValue: `Sandbox contains the pending ${module.name} deployment scope.`,
      sourceFile: primarySourceFile,
      viewName: "Deployment scope"
    },
    {
      entityName: module.name,
      fieldName: "validationPlan",
      impactSummary: `Validation checkpoints for ${module.name} were updated in sandbox before promotion.`,
      leafName: "Audit Trail",
      productionValue: `Production still uses the current ${module.name} validation plan.`,
      riskLevel: "medium",
      sandboxValue: `Sandbox records the pending ${module.name} validation plan.`,
      sourceFile: secondarySourceFile,
      viewName: "Validation checklist"
    }
  ];
}

function buildSandboxPromotionDiffSeeds(module: SandboxBackendModule): SandboxPromotionDiffSeed[] {
  const primarySourceFile = module.sourceFiles[0] ?? "apps/api/src/server.ts";
  const secondarySourceFile = module.sourceFiles[1] ?? module.sourceFiles[0] ?? "apps/api/src/server.ts";

  switch (module.name) {
    case "Dashboard + Workspace API Routes":
      return [
        {
          entityName: "dashboardPayload",
          fieldName: "workspaceRouteMap",
          impactSummary: "Sandbox route payloads point leaf selections at the corrected page targets and sandbox shell state.",
          leafName: "Desktop",
          productionValue: "Current route-to-leaf map and shell labels.",
          riskLevel: "high",
          sandboxValue: "Corrected route-to-leaf map with sandbox session shell overrides.",
          sourceFile: primarySourceFile,
          viewName: "Workspace shell"
        },
        {
          entityName: "openWindowDescriptor",
          fieldName: "routeLabel",
          impactSummary: "Open-window descriptors preserve the right leaf labels when sandbox and production pages are reopened.",
          leafName: "Website Feed",
          productionValue: "Existing open-window route labels and descriptors.",
          riskLevel: "high",
          sandboxValue: "Updated route labels and descriptors for leaf-correct reopen behavior.",
          sourceFile: primarySourceFile,
          viewName: "Open windows"
        }
      ];
    case "Workflow Action Plans":
      return [
        {
          entityName: "workflowActionPlan",
          fieldName: "submitTaskPlan",
          impactSummary: "Submit actions create a different queued task plan in sandbox than the live workflow path.",
          leafName: "Website Feed",
          productionValue: "Current submit-action task plan and assignment flow.",
          riskLevel: "medium",
          sandboxValue: "Updated submit-action task plan and assignment flow.",
          sourceFile: primarySourceFile,
          viewName: "Workflow panels"
        },
        {
          entityName: "workflowActivityEntry",
          fieldName: "detailMessage",
          impactSummary: "Activity messages and queue timing text differ in the sandbox workflow runbook.",
          leafName: "Receivables",
          productionValue: "Current activity detail text and queue timing.",
          riskLevel: "medium",
          sandboxValue: "Updated activity detail text and queue timing.",
          sourceFile: secondarySourceFile,
          viewName: "Activity log"
        }
      ];
    case "CRM Communicate Backend":
      return [
        {
          entityName: "crmConversation",
          fieldName: "threadHydrationContract",
          impactSummary: "Conversation hydration and timeline reconciliation differ between sandbox and production.",
          leafName: "Communicate",
          productionValue: "Current thread hydration contract and timeline stitching.",
          riskLevel: "medium",
          sandboxValue: "Updated thread hydration contract and timeline stitching.",
          sourceFile: primarySourceFile,
          viewName: "Customer timeline"
        },
        {
          entityName: "crmContact",
          fieldName: "quickInfoMutationFields",
          impactSummary: "Quick-info field edits and assignment metadata use the sandbox contact mutation rules.",
          leafName: "Communicate",
          productionValue: "Current quick-info mutation fields and assignment metadata.",
          riskLevel: "medium",
          sandboxValue: "Updated quick-info mutation fields and assignment metadata.",
          sourceFile: secondarySourceFile,
          viewName: "CRM conversation center"
        }
      ];
    case "Twilio Messaging Flows":
      return [
        {
          entityName: "twilioWebhook",
          fieldName: "signatureVerification",
          impactSummary: "Webhook validation and callback parsing differ in sandbox before production rollout.",
          leafName: "Notification Center",
          productionValue: "Current signature verification and callback parsing rules.",
          riskLevel: "high",
          sandboxValue: "Updated signature verification and callback parsing rules.",
          sourceFile: primarySourceFile,
          viewName: "Webhook processing"
        },
        {
          entityName: "outboundMessage",
          fieldName: "statusCallbackState",
          impactSummary: "Delivery-status handling and retry fallback behavior differ in the sandbox Twilio flow.",
          leafName: "Text Follow-Up Board",
          productionValue: "Current delivery-status mapping and retry handling.",
          riskLevel: "high",
          sandboxValue: "Updated delivery-status mapping and retry handling.",
          sourceFile: secondarySourceFile,
          viewName: "Message status updates"
        }
      ];
    case "Service Notification Rules":
      return [
        {
          entityName: "serviceAlert",
          fieldName: "promiseRiskTone",
          impactSummary: "Promise-risk alert thresholds and tone rules are different in sandbox.",
          leafName: "Unread Service Alerts",
          productionValue: "Current promise-risk threshold and tone rules.",
          riskLevel: "medium",
          sandboxValue: "Updated promise-risk threshold and tone rules.",
          sourceFile: primarySourceFile,
          viewName: "Promise-risk alerts"
        },
        {
          entityName: "notificationRail",
          fieldName: "unreadBucketCounts",
          impactSummary: "Unread alert rollups and escalation buckets are recalculated in sandbox.",
          leafName: "Notification Rail",
          productionValue: "Current unread rollups and escalation buckets.",
          riskLevel: "medium",
          sandboxValue: "Updated unread rollups and escalation buckets.",
          sourceFile: secondarySourceFile,
          viewName: "Notification rail"
        }
      ];
    case "Service Order Detail":
      return [
        {
          entityName: "serviceOrderSnapshot",
          fieldName: "jobLaborLinkage",
          impactSummary: "Repair-order detail rows serialize job and labor relationships differently in sandbox.",
          leafName: "Repair Order Detail",
          productionValue: "Current job and labor serialization contract.",
          riskLevel: "high",
          sandboxValue: "Updated job and labor serialization contract.",
          sourceFile: primarySourceFile,
          viewName: "Labor/job linkage"
        },
        {
          entityName: "repairOrderWorkbench",
          fieldName: "mutationGuards",
          impactSummary: "Workbench duplicate, create, and mutation guardrails differ in sandbox.",
          leafName: "Estimates & Repair Orders",
          productionValue: "Current duplicate, create, and mutation guardrails.",
          riskLevel: "high",
          sandboxValue: "Updated duplicate, create, and mutation guardrails.",
          sourceFile: secondarySourceFile,
          viewName: "RO detail"
        }
      ];
    case "Sales Deal Deposits":
      return [
        {
          entityName: "salesDepositReceipt",
          fieldName: "reprintAuditState",
          impactSummary: "Receipt reprint state and audit markers differ in the sandbox deposit flow.",
          leafName: "Receivables",
          productionValue: "Current receipt reprint markers and cashier audit state.",
          riskLevel: "medium",
          sandboxValue: "Updated receipt reprint markers and cashier audit state.",
          sourceFile: primarySourceFile,
          viewName: "Deposit receipts"
        },
        {
          entityName: "salesDepositLedger",
          fieldName: "activityNoteFormat",
          impactSummary: "Deposit activity notes and ledger formatting differ before promotion.",
          leafName: "General Ledger",
          productionValue: "Current deposit activity note format.",
          riskLevel: "medium",
          sandboxValue: "Updated deposit activity note format.",
          sourceFile: primarySourceFile,
          viewName: "Deposit activity log"
        }
      ];
    case "Task + Activity Ledger":
      return [
        {
          entityName: "taskQueue",
          fieldName: "assignmentState",
          impactSummary: "Queue assignment and execution-state derivation differ in sandbox.",
          leafName: "Task Queue Monitor",
          productionValue: "Current assignment and execution-state derivation.",
          riskLevel: "medium",
          sandboxValue: "Updated assignment and execution-state derivation.",
          sourceFile: primarySourceFile,
          viewName: "Task queue"
        },
        {
          entityName: "auditEntry",
          fieldName: "eventDetailPayload",
          impactSummary: "Audit event detail payloads and source labels change with the sandbox ledger updates.",
          leafName: "Audit Trail",
          productionValue: "Current audit event detail payloads and source labels.",
          riskLevel: "medium",
          sandboxValue: "Updated audit event detail payloads and source labels.",
          sourceFile: primarySourceFile,
          viewName: "Workflow execution history"
        }
      ];
    case "Task SLA Policies":
      return [
        {
          entityName: "taskSlaPolicy",
          fieldName: "previewWindow",
          impactSummary: "Preview timing windows differ in the sandbox SLA planner.",
          leafName: "Audit Trail",
          productionValue: "Current SLA preview timing windows.",
          riskLevel: "medium",
          sandboxValue: "Updated SLA preview timing windows.",
          sourceFile: primarySourceFile,
          viewName: "Policy preview"
        },
        {
          entityName: "taskSlaPolicy",
          fieldName: "resetActionPlan",
          impactSummary: "Reset and copy actions use a different downstream task plan in sandbox.",
          leafName: "Task Queue Monitor",
          productionValue: "Current reset and copy action plan.",
          riskLevel: "medium",
          sandboxValue: "Updated reset and copy action plan.",
          sourceFile: primarySourceFile,
          viewName: "Escalation actions"
        }
      ];
    case "Cashier Accountability Report":
      return [
        {
          entityName: "cashierAccountabilityReport",
          fieldName: "operatorTotals",
          impactSummary: "Operator total calculations differ between sandbox and production report output.",
          leafName: "Cashier Accountability",
          productionValue: "Current operator total aggregation.",
          riskLevel: "low",
          sandboxValue: "Updated operator total aggregation.",
          sourceFile: primarySourceFile,
          viewName: "Operator summary"
        },
        {
          entityName: "cashierAccountabilityReport",
          fieldName: "actionWindowGrouping",
          impactSummary: "Action-window grouping and time-bucket output differ in sandbox.",
          leafName: "Cashier Accountability",
          productionValue: "Current action-window grouping.",
          riskLevel: "low",
          sandboxValue: "Updated action-window grouping.",
          sourceFile: primarySourceFile,
          viewName: "Activity window"
        }
      ];
    case "Technician Workload Report":
      return [
        {
          entityName: "technicianWorkloadReport",
          fieldName: "availableHours",
          impactSummary: "Available-hour calculations differ in the sandbox technician workload report.",
          leafName: "Technician Workload",
          productionValue: "Current available-hour calculations.",
          riskLevel: "medium",
          sandboxValue: "Updated available-hour calculations.",
          sourceFile: primarySourceFile,
          viewName: "Hour summary"
        },
        {
          entityName: "technicianWorkloadReport",
          fieldName: "creditedHours",
          impactSummary: "Credited-hour grouping and detail rows differ in sandbox.",
          leafName: "Technician Workload",
          productionValue: "Current credited-hour grouping and detail rows.",
          riskLevel: "medium",
          sandboxValue: "Updated credited-hour grouping and detail rows.",
          sourceFile: secondarySourceFile,
          viewName: "Repair-order detail"
        }
      ];
    case "Vendor Management APIs":
      return [
        {
          entityName: "vendorRecord",
          fieldName: "leadDayWindow",
          impactSummary: "Lead-day handling differs in the sandbox vendor maintenance flow.",
          leafName: "Parts Inventory",
          productionValue: "Current vendor lead-day window.",
          riskLevel: "low",
          sandboxValue: "Updated vendor lead-day window.",
          sourceFile: primarySourceFile,
          viewName: "Vendor maintenance"
        },
        {
          entityName: "vendorRecord",
          fieldName: "contactStatus",
          impactSummary: "Vendor contact status handling differs before promotion.",
          leafName: "Parts Inventory",
          productionValue: "Current vendor contact status handling.",
          riskLevel: "low",
          sandboxValue: "Updated vendor contact status handling.",
          sourceFile: primarySourceFile,
          viewName: "Supplier management"
        }
      ];
    case "Pricing Rules APIs":
      return [
        {
          entityName: "pricingRule",
          fieldName: "approvalState",
          impactSummary: "Pricing approval state handling differs in sandbox pricing controls.",
          leafName: "Pricing Rules",
          productionValue: "Current pricing approval state handling.",
          riskLevel: "high",
          sandboxValue: "Updated pricing approval state handling.",
          sourceFile: primarySourceFile,
          viewName: "Pricing controls"
        },
        {
          entityName: "websitePricingPacket",
          fieldName: "publishedPriceFields",
          impactSummary: "Website pricing packets differ in the sandbox publish path.",
          leafName: "Website Feed",
          productionValue: "Current website price packet fields.",
          riskLevel: "high",
          sandboxValue: "Updated website price packet fields.",
          sourceFile: primarySourceFile,
          viewName: "Website price packets"
        }
      ];
    case "Approval Workflows":
      return [
        {
          entityName: "approvalRequest",
          fieldName: "reviewerChain",
          impactSummary: "Reviewer-chain routing differs in the sandbox approval queue.",
          leafName: "Management Activities",
          productionValue: "Current reviewer-chain routing.",
          riskLevel: "medium",
          sandboxValue: "Updated reviewer-chain routing.",
          sourceFile: primarySourceFile,
          viewName: "Approval queues"
        },
        {
          entityName: "approvalRequest",
          fieldName: "blockingState",
          impactSummary: "Blocking-state rules differ before deployment.",
          leafName: "Approval Workflows",
          productionValue: "Current approval blocking-state rules.",
          riskLevel: "medium",
          sandboxValue: "Updated approval blocking-state rules.",
          sourceFile: primarySourceFile,
          viewName: "Audit outcomes"
        }
      ];
    case "Boat Inventory APIs":
      return [
        {
          entityName: "inventoryUnit",
          fieldName: "websitePublishPacket",
          impactSummary: "Website publish packet fields differ in sandbox inventory output.",
          leafName: "Website Feed",
          productionValue: "Current website publish packet fields.",
          riskLevel: "high",
          sandboxValue: "Updated website publish packet fields.",
          sourceFile: primarySourceFile,
          viewName: "Website publish packets"
        },
        {
          entityName: "inventoryUnit",
          fieldName: "availabilityState",
          impactSummary: "Availability-state serialization differs in sandbox inventory detail.",
          leafName: "Boat Inventory",
          productionValue: "Current availability-state serialization.",
          riskLevel: "high",
          sandboxValue: "Updated availability-state serialization.",
          sourceFile: primarySourceFile,
          viewName: "Unit availability"
        }
      ];
    case "Prisma + Seed Data":
      return [
        {
          entityName: "prismaSchema",
          fieldName: "crmPayloadContract",
          impactSummary: "CRM payload contracts differ in sandbox because schema-backed record shapes changed.",
          leafName: "Communicate",
          productionValue: "Current CRM payload contract.",
          riskLevel: "high",
          sandboxValue: "Updated CRM payload contract.",
          sourceFile: primarySourceFile,
          viewName: "Cross-workspace data contracts"
        },
        {
          entityName: "seedState",
          fieldName: "websiteFeedDefaults",
          impactSummary: "Seeded website-feed defaults differ in sandbox validation data.",
          leafName: "Website Feed",
          productionValue: "Current seeded website-feed defaults.",
          riskLevel: "high",
          sandboxValue: "Updated seeded website-feed defaults.",
          sourceFile: secondarySourceFile,
          viewName: "Seeded demo state"
        }
      ];
    default:
      return buildFallbackPromotionDiffSeeds(module);
  }
}

const sandboxPromotionBlueprints: Record<string, SandboxPromotionBlueprint> = {
  "Approval Workflows": {
    affectedLeafs: ["Management Activities", "Approval Workflows", "Audit Trail"],
    affectedViews: ["Approval queues", "Management review lanes", "Audit outcomes"],
    impactSummary: "Approval routes and pre-publish review gates will change for management-side promotion reviews.",
    productionState: "Production approvals continue to use the currently published review routing.",
    riskLevel: "medium",
    sandboxState: "Sandbox approval gates include the new routing and reviewer thresholds.",
    validationChecks: [
      {
        detail: "Compare approval queue owners and fallback escalation paths before deployment.",
        idSuffix: "approval-owners",
        label: "Approval owners reviewed",
        status: "warning"
      },
      {
        detail: "Confirm high-priority submissions still block correctly when approval is missing.",
        idSuffix: "approval-blocking",
        label: "Blocking rules validated",
        status: "ready"
      }
    ]
  },
  "Boat Inventory APIs": {
    affectedLeafs: ["Boat Inventory", "Website Feed", "Parts Inventory"],
    affectedViews: ["Inventory detail", "Website publish packets", "Unit availability"],
    impactSummary: "Inventory state, merchandising fields, and downstream website payloads will shift with this deployment.",
    productionState: "Production inventory payloads still reflect the current API contracts and field rules.",
    riskLevel: "high",
    sandboxState: "Sandbox inventory endpoints include the pending inventory and merchandising adjustments.",
    validationChecks: [
      {
        detail: "Review unit search, availability badges, and website inventory mappings before push.",
        idSuffix: "inventory-surface",
        label: "Inventory surfaces compared",
        status: "attention"
      },
      {
        detail: "Validate downstream pricing and publish payloads after inventory field changes.",
        idSuffix: "inventory-publish",
        label: "Website publish dependencies checked",
        status: "warning"
      }
    ]
  },
  "CRM Communicate Backend": {
    affectedLeafs: ["Communicate", "Text Follow-Up Board", "Lead Source Mix"],
    affectedViews: ["CRM conversation center", "Customer timeline", "Outbound messaging"],
    impactSummary: "CRM thread hydration, quick-contact details, and outbound messaging rules are changing.",
    productionState: "Production continues to use the current contact, conversation, and quick-info behavior.",
    riskLevel: "medium",
    sandboxState: "Sandbox Communicate flows reflect the pending thread and contact changes.",
    validationChecks: [
      {
        detail: "Compare customer timelines, quick-info edits, and queue ownership between sandbox and production.",
        idSuffix: "crm-compare",
        label: "CRM timeline comparison complete",
        status: "warning"
      },
      {
        detail: "Confirm outbound messaging, unread counts, and assignment states still reconcile cleanly.",
        idSuffix: "crm-routing",
        label: "CRM routing validated",
        status: "ready"
      }
    ]
  },
  "Dashboard + Workspace API Routes": {
    affectedLeafs: ["Desktop", "Website Feed", "Communicate", "Audit Trail"],
    affectedViews: ["Workspace shell", "Top-nav leaf routing", "Open windows metadata"],
    impactSummary: "Shared workspace payloads, shell route metadata, and multiple workspace surfaces are included in this push.",
    productionState: "Production shell responses still use the currently published workspace route and payload behavior.",
    riskLevel: "high",
    sandboxState: "Sandbox shell and workspace payloads include the pending route and dashboard changes.",
    validationChecks: [
      {
        detail: "Open the affected leaf pages in both sandbox and production to compare route targets and shell labels.",
        idSuffix: "shell-routing",
        label: "Leaf routing compared",
        status: "attention"
      },
      {
        detail: "Verify global search, workspace headers, and open-window metadata still align across surfaces.",
        idSuffix: "shell-metadata",
        label: "Workspace metadata verified",
        status: "warning"
      }
    ]
  },
  "Pricing Rules APIs": {
    affectedLeafs: ["Pricing Rules", "Website Feed", "Boat Inventory"],
    affectedViews: ["Pricing controls", "Website price packets", "Merchandising approvals"],
    impactSummary: "Pricing rule retrieval and publish-side downstream pricing behavior will change.",
    productionState: "Production pricing logic continues to use the current rule set and calculation flow.",
    riskLevel: "high",
    sandboxState: "Sandbox pricing endpoints contain the pending pricing and approval changes.",
    validationChecks: [
      {
        detail: "Cross-check website pricing output against inventory and approval views before pushing.",
        idSuffix: "pricing-compare",
        label: "Pricing comparison complete",
        status: "attention"
      },
      {
        detail: "Confirm no approval workflows are bypassed when pricing changes are deployed.",
        idSuffix: "pricing-approval",
        label: "Approval dependency checked",
        status: "warning"
      }
    ]
  },
  "Prisma + Seed Data": {
    affectedLeafs: ["Sandbox", "Website Feed", "Communicate", "Audit Trail"],
    affectedViews: ["Persisted records", "Seeded demo state", "Cross-workspace data contracts"],
    impactSummary: "Schema-backed records or seeded data contracts are changing and can affect multiple workspaces.",
    productionState: "Production continues to use the current schema contract and seeded reference state.",
    riskLevel: "high",
    sandboxState: "Sandbox data contracts reflect the pending schema-backed changes.",
    validationChecks: [
      {
        detail: "Review record shape and seed compatibility across the affected workspaces before deployment.",
        idSuffix: "schema-contract",
        label: "Schema contract reviewed",
        status: "attention"
      },
      {
        detail: "Confirm history, queue, and workspace payloads still deserialize cleanly after the push.",
        idSuffix: "schema-payloads",
        label: "Workspace payload compatibility checked",
        status: "warning"
      }
    ]
  },
  "Service Notification Rules": {
    affectedLeafs: ["Estimates & Repair Orders", "Notification Rail", "Unread Service Alerts"],
    affectedViews: ["Service queue", "Notification rail", "Promise-risk alerts"],
    impactSummary: "Service alert generation, notification counts, and promise-risk messaging will change.",
    productionState: "Production service alerts still run on the current notification builders and thresholds.",
    riskLevel: "medium",
    sandboxState: "Sandbox service notifications include the pending alert-generation changes.",
    validationChecks: [
      {
        detail: "Compare unread counts, promise-risk alerts, and parts-received signals across sandbox and production.",
        idSuffix: "service-alerts",
        label: "Service alerts compared",
        status: "warning"
      },
      {
        detail: "Verify no technician or service-writer lane loses a required notification after deployment.",
        idSuffix: "service-coverage",
        label: "Notification coverage reviewed",
        status: "ready"
      }
    ]
  },
  "Service Order Detail": {
    affectedLeafs: ["Estimates & Repair Orders", "Repair Order Detail", "Technician Workload"],
    affectedViews: ["RO detail", "Labor/job linkage", "Technician reporting"],
    impactSummary: "Service detail snapshots, workbench mutations, and technician detail reporting will change.",
    productionState: "Production service detail and technician reporting still use the current mutation and serialization flow.",
    riskLevel: "high",
    sandboxState: "Sandbox service detail routes include the pending workbench and reporting updates.",
    validationChecks: [
      {
        detail: "Open the same repair order in sandbox and production to compare jobs, parts, and labor totals.",
        idSuffix: "service-detail-compare",
        label: "RO detail comparison complete",
        status: "attention"
      },
      {
        detail: "Confirm technician workload totals remain aligned after the service detail changes.",
        idSuffix: "tech-workload",
        label: "Technician workload validated",
        status: "warning"
      }
    ]
  },
  "Task + Activity Ledger": {
    affectedLeafs: ["Task Queue Monitor", "Audit Trail", "Website Feed"],
    affectedViews: ["Task queue", "Activity log", "Workflow execution history"],
    impactSummary: "Task queue activity and history recording will change for the affected workspace actions.",
    productionState: "Production task and activity recording continue to use the currently published history behavior.",
    riskLevel: "medium",
    sandboxState: "Sandbox queue and activity logging reflect the pending ledger changes.",
    validationChecks: [
      {
        detail: "Compare task generation, activity entries, and completion timing against production before deployment.",
        idSuffix: "task-ledger",
        label: "Task ledger compared",
        status: "warning"
      },
      {
        detail: "Verify downstream audit views still show the expected history after the push.",
        idSuffix: "task-audit",
        label: "Audit history dependency checked",
        status: "ready"
      }
    ]
  },
  "Twilio Messaging Flows": {
    affectedLeafs: ["Communicate", "Notification Center", "Text Follow-Up Board"],
    affectedViews: ["Twilio outbound sends", "Webhook processing", "Message status updates"],
    impactSummary: "Messaging credentials, webhook handling, or outbound status behavior are changing.",
    productionState: "Production Twilio flows still use the current signing, payload, and webhook behavior.",
    riskLevel: "high",
    sandboxState: "Sandbox messaging flows include the pending payload, signature, or webhook updates.",
    validationChecks: [
      {
        detail: "Compare sandbox and production message payloads, status callbacks, and webhook signatures before deployment.",
        idSuffix: "twilio-payload",
        label: "Messaging payloads compared",
        status: "attention"
      },
      {
        detail: "Validate failure handling so production queues do not stall on webhook or credential changes.",
        idSuffix: "twilio-fallback",
        label: "Webhook fallback reviewed",
        status: "warning"
      }
    ]
  },
  "Workflow Action Plans": {
    affectedLeafs: ["Website Feed", "General Ledger", "Receivables", "Help"],
    affectedViews: ["Workflow panels", "Queued task creation", "Activity messages"],
    impactSummary: "Menu-driven submit actions, queued workflow tasks, and activity text will change.",
    productionState: "Production workflows still use the current submit actions, task messages, and queue plans.",
    riskLevel: "medium",
    sandboxState: "Sandbox workflow actions include the pending submit logic and task-plan changes.",
    validationChecks: [
      {
        detail: "Run the same workflow entry points in sandbox and production to compare generated tasks and activity messages.",
        idSuffix: "workflow-compare",
        label: "Workflow outputs compared",
        status: "warning"
      },
      {
        detail: "Verify queue timing and downstream audit surfaces remain healthy when the new plan ships.",
        idSuffix: "workflow-health",
        label: "Workflow health reviewed",
        status: "ready"
      }
    ]
  }
};

async function ensureSandboxStore(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { code: true, id: true } });

  if (!store) {
    throw new Error("Store not found.");
  }

  return store;
}

function sanitizeSandboxEmailSegment(value: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/\.sandbox$/i, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "sandbox-user";
}

function buildFallbackSandboxActorEmail(name: string, storeCode: string) {
  return `${sanitizeSandboxEmailSegment(name)}@${sanitizeSandboxEmailSegment(storeCode)}.marinecloud.local`;
}

function buildSandboxLoginEmail(actorEmail: string) {
  const normalizedEmail = actorEmail.trim().toLowerCase().replace(/\.sandbox$/i, "");

  if (!normalizedEmail.includes("@")) {
    return `${sanitizeSandboxEmailSegment(normalizedEmail)}@sandbox.local.sandbox`;
  }

  const [localPart, domainPart] = normalizedEmail.split("@");
  return `${sanitizeSandboxEmailSegment(localPart)}@${sanitizeSandboxEmailSegment(domainPart)}.sandbox`;
}

function buildSandboxApiKey() {
  return `sbx_${randomBytes(18).toString("hex")}`;
}

function buildSandboxLoginAccessRecord(sandbox: {
  apiKey: string;
  id: string;
  loginEmail: string;
  name: string;
  store: {
    dealerGroup: { name: string };
    id: string;
    name: string;
  };
}): SandboxLoginAccessRecord {
  return {
    apiKey: sandbox.apiKey,
    dealerGroupName: sandbox.store.dealerGroup.name,
    loginEmail: sandbox.loginEmail,
    readOnlyNotice: `Sandbox sessions mirror live ${sandbox.store.dealerGroup.name} data in read-only mode. Changes do not write back to production.`,
    sandboxId: sandbox.id,
    sandboxName: sandbox.name,
    sourceStoreId: sandbox.store.id,
    sourceStoreName: sandbox.store.name
  };
}

async function backfillMissingSandboxCredentials(storeId: string) {
  const store = await ensureSandboxStore(storeId);
  const sandboxes = await prisma.sandbox.findMany({
    where: {
      OR: [
        { apiKey: "" },
        { createdByEmail: "" },
        { createdByName: "" },
        { loginEmail: "" }
      ],
      storeId
    },
    select: {
      createdByEmail: true,
      createdByName: true,
      id: true,
      loginEmail: true,
      name: true,
      requestedBy: true,
      apiKey: true
    }
  });

  for (const sandbox of sandboxes) {
    const createdByName = sandbox.createdByName || sandbox.requestedBy || `${sandbox.name} Owner`;
    const createdByEmail = sandbox.createdByEmail || buildFallbackSandboxActorEmail(createdByName, store.code);
    const loginEmail = sandbox.loginEmail || buildSandboxLoginEmail(createdByEmail);
    const apiKey = sandbox.apiKey || buildSandboxApiKey();

    await prisma.sandbox.update({
      where: { id: sandbox.id },
      data: {
        apiKey,
        createdByEmail,
        createdByName,
        loginEmail
      }
    });
  }
}

async function resolveUniqueSandboxName(storeId: string, baseName: string) {
  let attempt = 1;
  let candidate = baseName;

  while (await prisma.sandbox.findFirst({ where: { storeId, name: candidate } })) {
    attempt += 1;
    candidate = `${baseName} ${attempt}`;
  }

  return candidate;
}

function serializeSandboxTemplate(template: {
  id: string;
  name: string;
  description: string;
  selectedModulesJson: string;
  sandboxes: Array<{ id: string }>;
}): SandboxTemplateRecord {
  return {
    id: template.id,
    action: "Edit",
    description: template.description,
    inUse: template.sandboxes.length > 0,
    name: template.name,
    selectedModules: parseSelectedModulesJson(template.selectedModulesJson)
  };
}

function serializeSandbox(sandbox: {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  releaseType: string;
  currentOrgId: string;
  description: string;
  copiedFromLabel: string;
  selectedModulesJson: string;
  diffSummary: string;
  completedAt: Date | null;
  templateId: string | null;
  template: { name: string } | null;
}): SandboxRecord {
  return {
    id: sandbox.id,
    actionLinks: [...sandboxActionLinks],
    completedOn: formatSandboxDateTime(sandbox.completedAt),
    copiedFrom: sandbox.template?.name ?? sandbox.copiedFromLabel,
    currentOrgId: sandbox.currentOrgId,
    description: sandbox.description,
    diffSummary: sandbox.diffSummary,
    location: sandbox.location,
    name: sandbox.name,
    releaseType: sandbox.releaseType,
    selectedModules: parseSelectedModulesJson(sandbox.selectedModulesJson),
    status: sandbox.status,
    templateId: sandbox.templateId,
    type: sandbox.type
  };
}

function serializeSandboxHistory(entry: {
  id: string;
  sandboxName: string;
  eventType: string;
  detail: string;
  diffSummary: string;
  requestedBy: string;
  activatedBy: string;
  refreshedAt: Date | null;
  finishedAt: Date | null;
  activatedAt: Date | null;
}): SandboxHistoryRecord {
  return {
    activated: formatSandboxDateTime(entry.activatedAt),
    activatedBy: entry.activatedBy,
    detail: entry.detail,
    diffSummary: entry.diffSummary,
    eventType: entry.eventType,
    finished: formatSandboxDateTime(entry.finishedAt),
    id: entry.id,
    refreshed: formatSandboxDateTime(entry.refreshedAt),
    requestedBy: entry.requestedBy,
    sandbox: entry.sandboxName
  };
}

async function buildSandboxWorkspacePayload(storeId: string): Promise<SandboxWorkspacePayload> {
  const [templates, sandboxes, history] = await prisma.$transaction([
    prisma.sandboxTemplate.findMany({
      where: { storeId },
      include: {
        sandboxes: {
          where: { deletedAt: null },
          select: { id: true }
        }
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }]
    }),
    prisma.sandbox.findMany({
      where: { storeId, deletedAt: null },
      include: {
        template: {
          select: { name: true }
        }
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }]
    }),
    prisma.sandboxHistoryEntry.findMany({
      where: { storeId },
      orderBy: [{ createdAt: "desc" }]
    })
  ]);

  return {
    history: history.map(serializeSandboxHistory),
    sandboxes: sandboxes.map(serializeSandbox),
    templates: templates.map(serializeSandboxTemplate)
  };
}

function buildFallbackPromotionBlueprint(module: SandboxBackendModule): SandboxPromotionBlueprint {
  return {
    affectedLeafs: ["Sandbox", "Audit Trail"],
    affectedViews: ["Sandbox validation", "Production comparison"],
    impactSummary: module.detail,
    productionState: `Production continues to use the current ${module.name} behavior.`,
    riskLevel: "medium",
    sandboxState: `Sandbox contains the pending ${module.name} changes.`,
    validationChecks: [
      {
        detail: `Compare sandbox and production behavior for ${module.name} before deployment.`,
        idSuffix: "compare",
        label: `${module.name} compared`,
        status: "warning"
      },
      {
        detail: `Review downstream dependencies touched by ${module.name} before pushing selected changes.`,
        idSuffix: "dependencies",
        label: `${module.name} dependencies checked`,
        status: "ready"
      }
    ]
  };
}

function resolveSandboxPromotionBlueprint(module: SandboxBackendModule) {
  return sandboxPromotionBlueprints[module.name] ?? buildFallbackPromotionBlueprint(module);
}

function buildSandboxPromotionDiffRows(selectedModules: string[]) {
  return sandboxBackendModules
    .filter((module) => selectedModules.includes(module.name))
    .flatMap((module) =>
      buildSandboxPromotionDiffSeeds(module).map((seed) => ({
        entityName: seed.entityName,
        fieldName: seed.fieldName,
        impactSummary: seed.impactSummary,
        leafName: seed.leafName,
        moduleName: module.name,
        productionValue: seed.productionValue,
        riskLevel: seed.riskLevel,
        sandboxValue: seed.sandboxValue,
        sourceFile: seed.sourceFile,
        viewName: seed.viewName
      }))
    );
}

async function syncSandboxPromotionDiffRecords(
  client: SandboxPromotionDiffMutationClient,
  storeId: string,
  sandboxId: string,
  selectedModules: string[]
) {
  const diffRows = buildSandboxPromotionDiffRows(selectedModules);

  await client.sandboxPromotionDiff.deleteMany({ where: { sandboxId } });

  if (diffRows.length > 0) {
    await client.sandboxPromotionDiff.createMany({
      data: diffRows.map((row) => ({
        ...row,
        riskLevel: row.riskLevel,
        sandboxId,
        storeId
      }))
    });
  }
}

async function backfillMissingSandboxPromotionDiffs(storeId: string) {
  const [sandboxes, existingDiffs] = await prisma.$transaction([
    prisma.sandbox.findMany({
      where: { deletedAt: null, storeId },
      select: {
        id: true,
        selectedModulesJson: true
      }
    }),
    prisma.sandboxPromotionDiff.findMany({
      where: { storeId },
      select: { sandboxId: true }
    })
  ]);

  const sandboxIdsWithDiffs = new Set(existingDiffs.map((entry) => entry.sandboxId));

  for (const sandbox of sandboxes) {
    if (sandboxIdsWithDiffs.has(sandbox.id)) {
      continue;
    }

    await syncSandboxPromotionDiffRecords(prisma, storeId, sandbox.id, parseSelectedModulesJson(sandbox.selectedModulesJson));
  }
}

async function loadSandboxPromotionDiffRows(
  storeId: string,
  sandbox: {
    id: string;
    selectedModulesJson: string;
  }
) {
  let diffRows = await prisma.sandboxPromotionDiff.findMany({
    orderBy: [{ moduleName: "asc" }, { leafName: "asc" }, { viewName: "asc" }, { entityName: "asc" }, { fieldName: "asc" }],
    where: { sandboxId: sandbox.id, storeId }
  });

  if (diffRows.length === 0) {
    const selectedModules = parseSelectedModulesJson(sandbox.selectedModulesJson);

    if (selectedModules.length > 0) {
      await syncSandboxPromotionDiffRecords(prisma, storeId, sandbox.id, selectedModules);
      diffRows = await prisma.sandboxPromotionDiff.findMany({
        orderBy: [{ moduleName: "asc" }, { leafName: "asc" }, { viewName: "asc" }, { entityName: "asc" }, { fieldName: "asc" }],
        where: { sandboxId: sandbox.id, storeId }
      });
    }
  }

  return diffRows;
}

function buildSandboxPromotionPreviewRecord(sandbox: {
  diffSummary: string;
  id: string;
  name: string;
  selectedModulesJson: string;
}, diffRows: Array<{
  entityName: string;
  fieldName: string;
  id: string;
  impactSummary: string;
  leafName: string;
  moduleName: string;
  productionValue: string;
  riskLevel: string;
  sandboxValue: string;
  sourceFile: string;
  viewName: string;
}>) {
  const selectedModuleNames = parseSelectedModulesJson(sandbox.selectedModulesJson);
  const selectedModules = sandboxBackendModules.filter((module) => selectedModuleNames.includes(module.name));
  const changes = diffRows.map<SandboxPromotionChangeRecord>((diffRow) => ({
    affectedLeafs: [diffRow.leafName],
    affectedViews: [diffRow.viewName],
    entityName: diffRow.entityName,
    fieldName: diffRow.fieldName,
    id: diffRow.id,
    impactSummary: diffRow.impactSummary,
    leafName: diffRow.leafName,
    moduleName: diffRow.moduleName,
    productionState: `${diffRow.entityName}.${diffRow.fieldName}: ${diffRow.productionValue}`,
    productionValue: diffRow.productionValue,
    riskLevel: normalizePromotionRiskLevel(diffRow.riskLevel),
    sandboxState: `${diffRow.entityName}.${diffRow.fieldName}: ${diffRow.sandboxValue}`,
    sandboxValue: diffRow.sandboxValue,
    sourceFiles: [diffRow.sourceFile],
    viewName: diffRow.viewName
  }));

  const comparisonGroupMap = new Map<
    string,
    {
      affectedLeafs: string[];
      fieldDiffs: string[];
      impactSummary: string;
      moduleName: string;
      riskLevel: SandboxPromotionRiskLevel;
      viewName: string;
    }
  >();

  for (const change of changes) {
    const key = `${change.moduleName}::${change.leafName}::${change.viewName}`;
    const existing = comparisonGroupMap.get(key);
    const nextFieldDiff = `${change.entityName}.${change.fieldName}: ${change.productionValue} -> ${change.sandboxValue}`;

    if (existing) {
      if (!existing.fieldDiffs.includes(nextFieldDiff)) {
        existing.fieldDiffs.push(nextFieldDiff);
      }

      if (!existing.affectedLeafs.includes(change.leafName)) {
        existing.affectedLeafs.push(change.leafName);
      }

      if (existing.impactSummary !== change.impactSummary) {
        existing.impactSummary = `${existing.impactSummary} ${change.impactSummary}`;
      }

      if (change.riskLevel === "high" || (change.riskLevel === "medium" && existing.riskLevel === "low")) {
        existing.riskLevel = change.riskLevel;
      }

      continue;
    }

    comparisonGroupMap.set(key, {
      affectedLeafs: [change.leafName],
      fieldDiffs: [nextFieldDiff],
      impactSummary: change.impactSummary,
      moduleName: change.moduleName,
      riskLevel: change.riskLevel,
      viewName: change.viewName
    });
  }

  const comparisonViews = [...comparisonGroupMap.entries()].map<SandboxPromotionComparisonRecord>(([key, group]) => ({
    affectedLeafs: group.affectedLeafs,
    fieldDiffs: group.fieldDiffs,
    id: buildPromotionRecordId("compare", group.moduleName, key.split("::").slice(1).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    impactSummary: group.impactSummary,
    productionViewLabel: `${group.viewName} keeps ${group.fieldDiffs.length} production value${group.fieldDiffs.length === 1 ? "" : "s"}.`,
    riskLevel: group.riskLevel,
    sandboxViewLabel: `${group.viewName} proposes ${group.fieldDiffs.length} sandbox value${group.fieldDiffs.length === 1 ? "" : "s"}.`,
    title: `${group.moduleName} - ${group.viewName}`
  }));

  const validationChecks = selectedModules.flatMap<SandboxPromotionValidationRecord>((module) => {
    const blueprint = resolveSandboxPromotionBlueprint(module);
    const moduleChanges = changes.filter((change) => change.moduleName === module.name);
    const fieldChangeCount = moduleChanges.length;
    const leafCount = new Set(moduleChanges.map((change) => change.leafName)).size;

    return blueprint.validationChecks.map((check) => ({
      detail:
        fieldChangeCount === 0
          ? check.detail
          : `${check.detail} Persisted diff coverage: ${fieldChangeCount} field changes across ${leafCount} leaf${leafCount === 1 ? "" : "s"}.`,
      id: buildPromotionRecordId("check", module.name, check.idSuffix),
      label: check.label,
      status: check.status
    }));
  });

  const readyCheckCount = validationChecks.filter((check) => check.status === "ready").length;
  const warningCount = validationChecks.filter((check) => check.status === "warning").length;
  const attentionCount = validationChecks.filter((check) => check.status === "attention").length;
  const healthScore = Math.max(42, 100 - warningCount * 8 - attentionCount * 18 + readyCheckCount * 2);

  return {
    changes,
    comparisonViews,
    generatedAt: formatSandboxDateTime(new Date()),
    healthScore,
    hiddenContainerLabel: `${sandbox.name} deployment plan`,
    sandboxId: sandbox.id,
    sandboxName: sandbox.name,
    summary:
      changes.length === 0
        ? "No backend modules are selected for this sandbox yet."
        : `${changes.length} deploy candidates are ready for comparison across ${selectedModules.length} backend modules. ${sandbox.diffSummary}`,
    validationChecks
  } satisfies SandboxPromotionPreviewRecord;
}

export async function getSandboxPromotionPreview(storeId: string, sandboxId: string): Promise<SandboxPromotionPreviewRecord> {
  await ensureStoreSandboxDefaults(storeId);
  const sandbox = await prisma.sandbox.findFirst({
    where: { deletedAt: null, id: sandboxId, storeId },
    select: {
      diffSummary: true,
      id: true,
      name: true,
      selectedModulesJson: true
    }
  });

  if (!sandbox) {
    throw new Error("Sandbox not found.");
  }

  return buildSandboxPromotionPreviewRecord(sandbox, await loadSandboxPromotionDiffRows(storeId, sandbox));
}

export async function pushSandboxChangesToProduction(
  storeId: string,
  sandboxId: string,
  input: SandboxPushToProductionInput
): Promise<SandboxPushToProductionResponse> {
  await ensureStoreSandboxDefaults(storeId);
  const sandbox = await prisma.sandbox.findFirst({
    where: { deletedAt: null, id: sandboxId, storeId },
    select: {
      diffSummary: true,
      id: true,
      name: true,
      selectedModulesJson: true
    }
  });

  if (!sandbox) {
    throw new Error("Sandbox not found.");
  }

  const preview = buildSandboxPromotionPreviewRecord(sandbox, await loadSandboxPromotionDiffRows(storeId, sandbox));
  const selectedChangeIds = [...new Set(input.selectedChangeIds.map((value) => value.trim()).filter((value) => value.length > 0))];
  const validatedCheckIds = [...new Set(input.validatedCheckIds.map((value) => value.trim()).filter((value) => value.length > 0))];

  if (selectedChangeIds.length === 0) {
    throw new Error("Select at least one changed module before pushing to production.");
  }

  const selectedChanges = preview.changes.filter((change) => selectedChangeIds.includes(change.id));

  if (selectedChanges.length === 0) {
    throw new Error("Selected push items could not be resolved for this sandbox.");
  }

  const requiredCheckIds = new Set(preview.validationChecks.map((check) => check.id));
  const hasReviewedAllChecks = [...requiredCheckIds].every((checkId) => validatedCheckIds.includes(checkId));

  if (!hasReviewedAllChecks) {
    throw new Error("Review every system-health and comparison check before pushing selected sandbox changes.");
  }

  const actorName = input.actorName?.trim() || "Current Operator";
  const now = new Date();
  const deployedModules = [...new Set(selectedChanges.map((change) => change.moduleName))];
  const affectedLeafs = [...new Set(selectedChanges.flatMap((change) => change.affectedLeafs))];

  await prisma.sandbox.update({
    where: { id: sandboxId },
    data: {
      activatedAt: now,
      activatedBy: actorName,
      status: "Promoted"
    }
  });

  await prisma.sandboxHistoryEntry.create({
    data: {
      activatedAt: now,
      activatedBy: actorName,
      detail: `${sandbox.name} pushed ${selectedChanges.length} selected changes across ${deployedModules.length} backend modules to the production deployment queue. Affected leafs: ${affectedLeafs.join(", ") || "Sandbox"}.`,
      diffSummary: deployedModules.join(", "),
      eventType: "Pushed to Production",
      requestedBy: actorName,
      sandboxId,
      sandboxName: sandbox.name,
      storeId
    }
  });

  return {
    ...(await buildSandboxWorkspacePayload(storeId)),
    deployedChangeCount: selectedChanges.length,
    deployedModules,
    message: `${sandbox.name} pushed ${selectedChanges.length} selected changes across ${deployedModules.length} backend modules after ${preview.validationChecks.length} health checks were reviewed.`,
    preview
  };
}

export async function ensureStoreSandboxDefaults(storeId: string) {
  const store = await ensureSandboxStore(storeId);

  const [templateCount, sandboxCount, historyCount] = await prisma.$transaction([
    prisma.sandboxTemplate.count({ where: { storeId } }),
    prisma.sandbox.count({ where: { storeId } }),
    prisma.sandboxHistoryEntry.count({ where: { storeId } })
  ]);

  if (templateCount > 0 || sandboxCount > 0 || historyCount > 0) {
    await backfillMissingSandboxCredentials(storeId);
    await backfillMissingSandboxPromotionDiffs(storeId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const templateMap = new Map<string, string>();

    for (const blueprint of defaultTemplateBlueprints) {
      const selectedModules = normalizeSelectedModules([...blueprint.selectedModules]);
      const template = await tx.sandboxTemplate.create({
        data: {
          description: blueprint.description,
          name: blueprint.name,
          selectedModulesJson: JSON.stringify(selectedModules),
          storeId
        }
      });

      templateMap.set(blueprint.name, template.id);
    }

    for (const blueprint of defaultSandboxBlueprints) {
      const selectedModules = normalizeSelectedModules([...blueprint.selectedModules]);
      const diffSummary = buildSandboxDiffSummary(selectedModules);
      const createdByName = blueprint.requestedBy || "Sandbox Operator";
      const createdByEmail = buildFallbackSandboxActorEmail(createdByName, store.code);
      const sandbox = await tx.sandbox.create({
        data: {
          activatedAt: blueprint.activatedAt,
          activatedBy: blueprint.activatedBy,
          apiKey: buildSandboxApiKey(),
          completedAt: blueprint.completedAt,
          copiedFromLabel: blueprint.copiedFromLabel,
          createdByEmail,
          createdByName,
          currentOrgId: buildSandboxOrgId(blueprint.completedAt),
          description: blueprint.description,
          diffSummary,
          loginEmail: buildSandboxLoginEmail(createdByEmail),
          location: blueprint.location,
          name: blueprint.name,
          refreshedAt: blueprint.refreshedAt,
          releaseType: blueprint.releaseType,
          requestedBy: blueprint.requestedBy,
          selectedModulesJson: JSON.stringify(selectedModules),
          status: blueprint.status,
          storeId,
          templateId: blueprint.templateName ? (templateMap.get(blueprint.templateName) ?? null) : null,
          type: blueprint.type
        }
      });

      await syncSandboxPromotionDiffRecords(tx, storeId, sandbox.id, selectedModules);

      await tx.sandboxHistoryEntry.create({
        data: {
          activatedAt: blueprint.activatedAt,
          activatedBy: blueprint.activatedBy,
          createdAt: blueprint.activatedAt,
          detail: `${blueprint.name} provisioned from ${blueprint.copiedFromLabel}.`,
          diffSummary,
          eventType: "Provisioned",
          finishedAt: blueprint.completedAt,
          refreshedAt: blueprint.refreshedAt,
          requestedBy: blueprint.requestedBy,
          sandboxId: sandbox.id,
          sandboxName: blueprint.name,
          storeId
        }
      });
    }
  });
}

export async function getSandboxWorkspacePayload(storeId: string) {
  await ensureStoreSandboxDefaults(storeId);
  await backfillMissingSandboxCredentials(storeId);
  await backfillMissingSandboxPromotionDiffs(storeId);
  return buildSandboxWorkspacePayload(storeId);
}

export async function createSandboxTemplateRecord(storeId: string, input: SandboxTemplateInput): Promise<SandboxWorkspaceMutationResult> {
  await ensureStoreSandboxDefaults(storeId);
  const name = input.name.trim();
  const description = input.description.trim();
  const selectedModules = normalizeSelectedModules(input.selectedModules);

  if (!name || selectedModules.length === 0) {
    throw new Error("Enter a template name and select at least one backend module.");
  }

  const existing = await prisma.sandboxTemplate.findFirst({ where: { storeId, name } });
  if (existing) {
    throw new Error("A Sandbox template with that name already exists.");
  }

  await prisma.sandboxTemplate.create({
    data: {
      description,
      name,
      selectedModulesJson: JSON.stringify(selectedModules),
      storeId
    }
  });

  return {
    ...(await buildSandboxWorkspacePayload(storeId)),
    message: `Sandbox template ${name} saved.`
  };
}

export async function updateSandboxTemplateRecord(
  storeId: string,
  templateId: string,
  input: SandboxTemplateInput
): Promise<SandboxWorkspaceMutationResult> {
  await ensureStoreSandboxDefaults(storeId);
  const existing = await prisma.sandboxTemplate.findFirst({ where: { id: templateId, storeId } });

  if (!existing) {
    throw new Error("Sandbox template not found.");
  }

  const name = input.name.trim();
  const selectedModules = normalizeSelectedModules(input.selectedModules);

  if (!name || selectedModules.length === 0) {
    throw new Error("Enter a template name and select at least one backend module.");
  }

  const conflicting = await prisma.sandboxTemplate.findFirst({
    where: {
      storeId,
      name,
      NOT: { id: templateId }
    }
  });

  if (conflicting) {
    throw new Error("A Sandbox template with that name already exists.");
  }

  await prisma.sandboxTemplate.update({
    where: { id: templateId },
    data: {
      description: input.description.trim(),
      name,
      selectedModulesJson: JSON.stringify(selectedModules)
    }
  });

  return {
    ...(await buildSandboxWorkspacePayload(storeId)),
    message: `Sandbox template ${name} updated.`
  };
}

export async function deleteSandboxTemplateRecord(storeId: string, templateId: string): Promise<SandboxWorkspaceMutationResult> {
  await ensureStoreSandboxDefaults(storeId);
  const existing = await prisma.sandboxTemplate.findFirst({ where: { id: templateId, storeId } });

  if (!existing) {
    throw new Error("Sandbox template not found.");
  }

  await prisma.sandboxTemplate.delete({ where: { id: templateId } });

  return {
    ...(await buildSandboxWorkspacePayload(storeId)),
    message: `Sandbox template ${existing.name} deleted.`
  };
}

export async function createSandboxRecord(storeId: string, input: SandboxCreateInput): Promise<SandboxWorkspaceMutationResult> {
  await ensureStoreSandboxDefaults(storeId);
  const store = await ensureSandboxStore(storeId);
  const name = input.name.trim();

  if (!name) {
    throw new Error("Enter a Sandbox name.");
  }

  const existing = await prisma.sandbox.findFirst({ where: { storeId, name } });
  if (existing) {
    throw new Error("A Sandbox with that name already exists.");
  }

  const template = input.templateId
    ? await prisma.sandboxTemplate.findFirst({ where: { id: input.templateId, storeId } })
    : null;

  if (input.templateId && !template) {
    throw new Error("Sandbox template not found.");
  }

  const selectedModules = normalizeSelectedModules(input.selectedModules);
  if (selectedModules.length === 0) {
    throw new Error("Select at least one backend module for the Sandbox.");
  }

  const now = new Date();
  const diffSummary = buildSandboxDiffSummary(selectedModules);
  const description = input.purpose.trim() || `Backend-safe copy of ${selectedModules.length} app modules from ${template?.name ?? "manual selection"}.`;
  const createdByName = input.actorName?.trim() || "Current Operator";
  const createdByEmail = input.actorEmail?.trim().toLowerCase() || buildFallbackSandboxActorEmail(createdByName, store.code);
  const loginEmail = buildSandboxLoginEmail(createdByEmail);
  const apiKey = buildSandboxApiKey();

  const sandbox = await prisma.sandbox.create({
    data: {
      activatedAt: now,
      activatedBy: "Sandbox Provisioner",
      apiKey,
      completedAt: now,
      copiedFromLabel: template?.name ?? "Manual Backend Template",
      createdByEmail,
      createdByName,
      currentOrgId: buildSandboxOrgId(now),
      description,
      diffSummary,
      loginEmail,
      location: "Premier Marine Cloud Sandbox Runtime",
      name,
      refreshedAt: now,
      releaseType: deriveReleaseType(input.type),
      requestedBy: "Current Operator",
      selectedModulesJson: JSON.stringify(selectedModules),
      status: "Completed",
      storeId,
      templateId: template?.id ?? null,
      type: input.type
    }
  });

  await syncSandboxPromotionDiffRecords(prisma, storeId, sandbox.id, selectedModules);

  await prisma.sandboxHistoryEntry.create({
    data: {
      activatedAt: now,
      activatedBy: "Sandbox Provisioner",
      detail: `${name} provisioned from ${template?.name ?? "manual selection"}.`,
      diffSummary,
      eventType: "Provisioned",
      finishedAt: now,
      refreshedAt: now,
      requestedBy: "Current Operator",
      sandboxId: sandbox.id,
      sandboxName: name,
      storeId
    }
  });

  return {
    ...(await buildSandboxWorkspacePayload(storeId)),
    message: `Sandbox ${name} provisioned. Use ${loginEmail} with the generated API key on the sandbox login screen.`
  };
}

export async function updateSandboxRecord(storeId: string, sandboxId: string, input: SandboxUpdateInput): Promise<SandboxWorkspaceMutationResult> {
  await ensureStoreSandboxDefaults(storeId);
  const existing = await prisma.sandbox.findFirst({ where: { id: sandboxId, storeId, deletedAt: null } });

  if (!existing) {
    throw new Error("Sandbox not found.");
  }

  const nextName = input.name?.trim();
  if (nextName) {
    const conflicting = await prisma.sandbox.findFirst({
      where: {
        storeId,
        name: nextName,
        NOT: { id: sandboxId }
      }
    });

    if (conflicting) {
      throw new Error("A Sandbox with that name already exists.");
    }
  }

  const selectedModules = input.selectedModules ? normalizeSelectedModules(input.selectedModules) : null;
  const diffSummary = selectedModules ? buildSandboxDiffSummary(selectedModules) : existing.diffSummary;

  await prisma.sandbox.update({
    where: { id: sandboxId },
    data: {
      description: input.description?.trim(),
      diffSummary,
      location: input.location?.trim(),
      name: nextName,
      releaseType: input.releaseType?.trim(),
      selectedModulesJson: selectedModules ? JSON.stringify(selectedModules) : undefined,
      status: input.status?.trim(),
      type: input.type?.trim()
    }
  });

  if (selectedModules) {
    await syncSandboxPromotionDiffRecords(prisma, storeId, sandboxId, selectedModules);
  }

  return {
    ...(await buildSandboxWorkspacePayload(storeId)),
    message: `Sandbox ${nextName ?? existing.name} updated.`
  };
}

export async function runSandboxAction(storeId: string, sandboxId: string, input: SandboxActionInput): Promise<SandboxWorkspaceMutationResult> {
  await ensureStoreSandboxDefaults(storeId);
  const sandbox = await prisma.sandbox.findFirst({
    where: { id: sandboxId, storeId, deletedAt: null },
    include: {
      template: true
    }
  });

  if (!sandbox) {
    throw new Error("Sandbox not found.");
  }

  const actorName = input.actorName?.trim() || "Current Operator";
  const selectedModules = parseSelectedModulesJson(sandbox.selectedModulesJson);
  const diffSummary = sandbox.diffSummary || buildSandboxDiffSummary(selectedModules);

  if (input.mode === "clone") {
    const now = new Date();
    const cloneName = await resolveUniqueSandboxName(storeId, `${sandbox.name} Clone`);
    const createdByName = sandbox.createdByName || actorName;
    const createdByEmail = sandbox.createdByEmail || buildFallbackSandboxActorEmail(createdByName, (await ensureSandboxStore(storeId)).code);
    const clone = await prisma.sandbox.create({
      data: {
        activatedAt: now,
        activatedBy: "Sandbox Provisioner",
        apiKey: buildSandboxApiKey(),
        completedAt: now,
        copiedFromLabel: sandbox.name,
        createdByEmail,
        createdByName,
        currentOrgId: buildSandboxOrgId(now),
        description: `Cloned from ${sandbox.name}. ${sandbox.description}`,
        diffSummary,
        loginEmail: buildSandboxLoginEmail(createdByEmail),
        location: sandbox.location,
        name: cloneName,
        refreshedAt: now,
        releaseType: sandbox.releaseType,
        requestedBy: actorName,
        selectedModulesJson: sandbox.selectedModulesJson,
        status: "Completed",
        storeId,
        templateId: sandbox.templateId,
        type: sandbox.type
      }
    });

    await syncSandboxPromotionDiffRecords(prisma, storeId, clone.id, selectedModules);

    await prisma.sandboxHistoryEntry.create({
      data: {
        activatedAt: now,
        activatedBy: "Sandbox Provisioner",
        detail: `${cloneName} cloned from ${sandbox.name}.`,
        diffSummary,
        eventType: "Cloned",
        finishedAt: now,
        refreshedAt: now,
        requestedBy: actorName,
        sandboxId: clone.id,
        sandboxName: cloneName,
        storeId
      }
    });

    return {
      ...(await buildSandboxWorkspacePayload(storeId)),
      message: `Sandbox ${cloneName} cloned from ${sandbox.name}.`
    };
  }

  if (input.mode === "delete") {
    const now = new Date();
    await prisma.sandbox.update({
      where: { id: sandboxId },
      data: {
        deletedAt: now,
        status: "Deleted"
      }
    });

    await prisma.sandboxHistoryEntry.create({
      data: {
        detail: `${sandbox.name} deleted from the active Sandbox list.`,
        diffSummary,
        eventType: "Deleted",
        finishedAt: now,
        requestedBy: actorName,
        sandboxId,
        sandboxName: sandbox.name,
        storeId
      }
    });

    return {
      ...(await buildSandboxWorkspacePayload(storeId)),
      message: `Sandbox ${sandbox.name} deleted.`
    };
  }

  if (input.mode === "refresh") {
    const now = new Date();
    await prisma.sandbox.update({
      where: { id: sandboxId },
      data: {
        completedAt: now,
        refreshedAt: now,
        status: "Completed"
      }
    });

    await syncSandboxPromotionDiffRecords(prisma, storeId, sandboxId, selectedModules);

    await prisma.sandboxHistoryEntry.create({
      data: {
        detail: `${sandbox.name} refreshed and synchronized with its backend module set.`,
        diffSummary,
        eventType: "Refreshed",
        finishedAt: now,
        refreshedAt: now,
        requestedBy: actorName,
        sandboxId,
        sandboxName: sandbox.name,
        storeId
      }
    });

    return {
      ...(await buildSandboxWorkspacePayload(storeId)),
      message: `Sandbox ${sandbox.name} refreshed.`
    };
  }

  if (input.mode === "login") {
    const now = new Date();
    await prisma.sandboxHistoryEntry.create({
      data: {
        activatedAt: now,
        activatedBy: actorName,
        detail: `${sandbox.name} login initiated for org ${sandbox.currentOrgId}.`,
        diffSummary,
        eventType: "Login",
        requestedBy: actorName,
        sandboxId,
        sandboxName: sandbox.name,
        storeId
      }
    });

    return {
      ...(await buildSandboxWorkspacePayload(storeId)),
      message: `Sandbox login opened for ${sandbox.name}. Sign in as ${sandbox.loginEmail} with its generated API key.`
    };
  }

  if (input.mode === "activate") {
    const now = new Date();
    await prisma.sandbox.update({
      where: { id: sandboxId },
      data: {
        activatedAt: now,
        activatedBy: actorName,
        status: "Active"
      }
    });

    await prisma.sandboxHistoryEntry.create({
      data: {
        activatedAt: now,
        activatedBy: actorName,
        detail: `${sandbox.name} activated for backend validation.`,
        diffSummary,
        eventType: "Activated",
        requestedBy: actorName,
        sandboxId,
        sandboxName: sandbox.name,
        storeId
      }
    });

    return {
      ...(await buildSandboxWorkspacePayload(storeId)),
      message: `Sandbox ${sandbox.name} activated.`
    };
  }

  const now = new Date();
  await prisma.sandbox.update({
    where: { id: sandboxId },
    data: {
      status: "Promoted"
    }
  });

  await prisma.sandboxHistoryEntry.create({
    data: {
      activatedAt: now,
      activatedBy: actorName,
      detail: `${sandbox.name} marked ready for promotion with ${selectedModules.length} backend modules in scope.`,
      diffSummary,
      eventType: "Promoted",
      requestedBy: actorName,
      sandboxId,
      sandboxName: sandbox.name,
      storeId
    }
  });

  return {
    ...(await buildSandboxWorkspacePayload(storeId)),
    message: `Sandbox ${sandbox.name} marked ready for promotion.`
  };
}

export async function getSandboxLoginAccess(sandboxId: string): Promise<SandboxLoginAccessRecord> {
  const sandbox = await prisma.sandbox.findFirst({
    where: { deletedAt: null, id: sandboxId },
    include: {
      store: {
        include: {
          dealerGroup: true
        }
      }
    }
  });

  if (!sandbox) {
    throw new Error("Sandbox not found.");
  }

  await backfillMissingSandboxCredentials(sandbox.storeId);

  const refreshedSandbox = await prisma.sandbox.findUnique({
    where: { id: sandboxId },
    include: {
      store: {
        include: {
          dealerGroup: true
        }
      }
    }
  });

  if (!refreshedSandbox) {
    throw new Error("Sandbox not found.");
  }

  return buildSandboxLoginAccessRecord(refreshedSandbox);
}

export async function authenticateSandboxLogin(email: string, password: string, sandboxId?: string | null): Promise<SandboxAuthPayload> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  let sandbox = sandboxId
    ? await prisma.sandbox.findFirst({
        where: { deletedAt: null, id: sandboxId },
        include: {
          store: {
            include: {
              dealerGroup: {
                include: {
                  stores: true
                }
              }
            }
          }
        }
      })
    : null;

  if (sandbox?.storeId) {
    await backfillMissingSandboxCredentials(sandbox.storeId);
    sandbox = await prisma.sandbox.findFirst({
      where: { deletedAt: null, id: sandbox.id },
      include: {
        store: {
          include: {
            dealerGroup: {
              include: {
                stores: true
              }
            }
          }
        }
      }
    });
  }

  if (!sandbox) {
    const matches = await prisma.sandbox.findMany({
      where: { deletedAt: null, loginEmail: normalizedEmail },
      include: {
        store: {
          include: {
            dealerGroup: {
              include: {
                stores: true
              }
            }
          }
        }
      }
    });

    if (matches.length === 0) {
      throw new Error("Sandbox account not found.");
    }

    if (matches.length > 1) {
      throw new Error("Open sandbox sign-in from the Sandbox workspace so the account can be scoped to the correct environment.");
    }

    sandbox = matches[0];
    await backfillMissingSandboxCredentials(sandbox.storeId);
    sandbox = await prisma.sandbox.findFirst({
      where: { deletedAt: null, id: sandbox.id },
      include: {
        store: {
          include: {
            dealerGroup: {
              include: {
                stores: true
              }
            }
          }
        }
      }
    });
  }

  if (!sandbox) {
    throw new Error("Sandbox account not found.");
  }

  if (sandbox.loginEmail.toLowerCase() !== normalizedEmail) {
    throw new Error("This sandbox sign-in link is tied to a different sandbox account.");
  }

  if (sandbox.apiKey !== normalizedPassword) {
    throw new Error("Sandbox API key is invalid.");
  }

  const stores = [...sandbox.store.dealerGroup.stores]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((store) => ({
      city: store.city,
      code: store.code,
      dealerGroupName: sandbox.store.dealerGroup.name,
      id: store.id,
      name: store.name,
      state: store.state,
      statusLine: `${store.city}, ${store.state} · ${sandbox.store.dealerGroup.name}`
    }));

  return {
    sandbox: buildSandboxLoginAccessRecord(sandbox),
    stores,
    user: {
      avatarInitial: "SB",
      dealerGroupName: sandbox.store.dealerGroup.name,
      email: sandbox.loginEmail,
      id: `sandbox-${sandbox.id}`,
      name: `${sandbox.createdByName || sandbox.name} Sandbox`,
      title: `Sandbox Account · ${sandbox.name}`
    }
  };
}