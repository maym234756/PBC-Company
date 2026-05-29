import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import {
  createSandbox,
  createSandboxTemplate,
  deleteSandboxTemplate,
  getSandboxBackendModules,
  getSandboxLoginAccess,
  getSandboxPromotionPreview,
  getSandboxWorkspace,
  pushSandboxToProduction,
  runSandboxAction,
  updateSandboxTemplate,
  type SandboxBackendModule,
  type SandboxLoginAccess,
  type SandboxPromotionCheckStatus,
  type SandboxPromotionRiskLevel,
  type SandboxPromotionPreview
} from "../api";
import type {
  ActivityLogEntry,
  SandboxSessionContext,
  StoreOperatorOption,
  TaskNoteKind,
  TaskQueueEntry,
  TaskStatus,
  WebsiteWorkspaceRow,
  WebsiteWorkspaceView
} from "../types";

type CommandLogEntry = ActivityLogEntry;

const SANDBOX_SHELL_ACTION_EVENT = "marine-cloud-sandbox-shell-action";
const SANDBOX_SHELL_ACTION_STORAGE_KEY = "marine-cloud-sandbox-shell-action";
function readSandboxShellPendingSurfaceMode() {
  if (typeof window === "undefined") {
    return "editor";
  }

  const nextMode = window.sessionStorage.getItem(SANDBOX_SHELL_ACTION_STORAGE_KEY);

  if (nextMode === "deploy") {
    window.sessionStorage.removeItem(SANDBOX_SHELL_ACTION_STORAGE_KEY);
    return "deploy";
  }

  return "editor";
}

interface WebsiteWorkspaceProps {
  activeStoreId: string;
  activityEntries: CommandLogEntry[];
  activeUserEmail: string;
  activeUserName: string;
  entries: TaskQueueEntry[];
  fallbackStatusLine: string;
  sandboxContext: SandboxSessionContext | null;
  isSandboxSession: boolean;
  isFilteredByOperator: boolean;
  onAddTaskNote: (taskId: string, body: string, kind: TaskNoteKind) => Promise<boolean>;
  onAssignTask: (taskId: string, assigneeUserId: string | null) => void;
  onRunTool: (tool: string) => void;
  onSelectRow: (row: WebsiteWorkspaceRow) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onViewChange: Dispatch<SetStateAction<WebsiteWorkspaceView>>;
  operators: StoreOperatorOption[];
  rows: WebsiteWorkspaceRow[];
  selectedRow: WebsiteWorkspaceRow | null;
  selectedRowId: string | null;
  updatingTaskId: string | null;
  view: WebsiteWorkspaceView;
}

type WebsiteConnectionType = "website" | "api" | "webhook" | "file";
type WebsiteIntegrationEnvironment = "sandbox" | "production";
type WebsiteAuthMode = "API Key" | "OAuth 2.0" | "Basic Auth" | "Signed Webhook" | "None";
type WebsiteSidebarPanel = "overview" | "mapping" | "queue" | "history";
type WebsiteMappingLaneId = "inventory" | "pricing" | "media" | "leads";

interface WebsiteMappingFieldLink {
  destination: string;
  guidance: string;
  source: string;
}

interface WebsiteMappingLane {
  audienceLabel: string;
  defaultSurface: string;
  defaultSyncMode: string;
  defaultValidation: string;
  detail: string;
  fields: WebsiteMappingFieldLink[];
  id: WebsiteMappingLaneId;
  label: string;
  status: string;
  tone: string;
}

const websiteConnectionOptions: Array<{
  detail: string;
  id: WebsiteConnectionType;
  label: string;
}> = [
  {
    detail: "Connect a hosted CMS, dealer website, landing page builder, or custom web catalog.",
    id: "website",
    label: "Website CMS"
  },
  {
    detail: "Expose inventory, media, pricing, and lead endpoints to any external platform.",
    id: "api",
    label: "REST API"
  },
  {
    detail: "Receive event-driven publish status, lead forms, and inventory update callbacks.",
    id: "webhook",
    label: "Webhook"
  },
  {
    detail: "Push scheduled CSV or JSON exports through SFTP or file-drop workflows.",
    id: "file",
    label: "File / SFTP"
  }
];

const websiteMappingLanes: WebsiteMappingLane[] = [
  {
    audienceLabel: "Merchandising + Inventory",
    defaultSurface: "Inventory cards + detail pages",
    defaultSyncMode: "Live API push",
    defaultValidation: "Manager review before publish",
    detail: "Map the core boat record so inventory cards, detail pages, and search facets stay aligned with the DMS.",
    fields: [
      {
        destination: "Stock # / unit tile",
        guidance: "Primary website lookup key used for cards, search, and detail routing.",
        source: "DMS stock number"
      },
      {
        destination: "Title / search headline",
        guidance: "Used to build the public listing title and internal search label.",
        source: "Year + make + model"
      },
      {
        destination: "Availability badge",
        guidance: "Controls whether the unit is live, pending, sold, or hidden.",
        source: "Status"
      },
      {
        destination: "Specs summary",
        guidance: "Surfaces class, hull type, and location on the public page.",
        source: "Class + location + hull"
      }
    ],
    id: "inventory",
    label: "Inventory & Availability",
    status: "Mapped",
    tone: "stable"
  },
  {
    audienceLabel: "Pricing + Promotions",
    defaultSurface: "Pricing block + promo banners",
    defaultSyncMode: "Publish window sync",
    defaultValidation: "Publish manager approval",
    detail: "Control the pricing packet managers approve before the website updates payment, sale price, or incentive language.",
    fields: [
      {
        destination: "Website sale price",
        guidance: "Primary sell price shown on listing cards and detail pages.",
        source: "Sale price"
      },
      {
        destination: "MSRP / compare-at",
        guidance: "Optional strikethrough or comparison price on website merchandising blocks.",
        source: "MSRP"
      },
      {
        destination: "Promo message",
        guidance: "Feeds incentive copy, rebate text, or limited-time callouts.",
        source: "Incentive / rebate notes"
      },
      {
        destination: "Publish start / stop",
        guidance: "Determines when pricing updates are allowed to go live.",
        source: "Effective date window"
      }
    ],
    id: "pricing",
    label: "Pricing & Promotions",
    status: "Publishing",
    tone: "accent"
  },
  {
    audienceLabel: "Marketing + Content",
    defaultSurface: "Gallery + hero media + SEO copy",
    defaultSyncMode: "Scheduled publish batch",
    defaultValidation: "Brand manager review",
    detail: "Keep photo order, hero visuals, and listing copy in one manager-facing rail without asking engineering to rename fields.",
    fields: [
      {
        destination: "Image gallery",
        guidance: "Publishes ordered gallery photos to listing cards and detail pages.",
        source: "Primary / gallery photos"
      },
      {
        destination: "Hero image slot",
        guidance: "Controls the first website image or category hero where enabled.",
        source: "Primary photo"
      },
      {
        destination: "Description + highlights",
        guidance: "Sends long-form copy and feature bullets to the public detail page.",
        source: "Description + sales notes"
      },
      {
        destination: "SEO card metadata",
        guidance: "Supports search snippets and social preview content.",
        source: "Meta title + meta description"
      }
    ],
    id: "media",
    label: "Media & Merchandising",
    status: "Mapped",
    tone: "stable"
  },
  {
    audienceLabel: "BDC + CRM",
    defaultSurface: "Lead forms + CRM intake",
    defaultSyncMode: "Webhook return path",
    defaultValidation: "Ops lead monitoring",
    detail: "Show leadership exactly how inquiry forms route back into the CRM and who owns follow-up without touching endpoint code.",
    fields: [
      {
        destination: "CRM contact record",
        guidance: "Creates or updates the contact on inbound form submit.",
        source: "Lead name + phone + email"
      },
      {
        destination: "Lead source tag",
        guidance: "Marks the lead with website, campaign, and page context.",
        source: "UTM + referring page"
      },
      {
        destination: "Assigned queue owner",
        guidance: "Routes the lead to the correct BDC or sales owner for follow-up.",
        source: "Store + inquiry type"
      },
      {
        destination: "Conversation timeline",
        guidance: "Stores consent, requested unit, and message body for response history.",
        source: "Lead form body + consent flags"
      }
    ],
    id: "leads",
    label: "Lead Forms & Source Tags",
    status: "Receiving",
    tone: "stable"
  }
];

const websiteMappingSurfaceOptions = {
  inventory: ["Inventory cards + detail pages", "Homepage featured inventory", "Search results + filters"],
  pricing: ["Pricing block + promo banners", "Payment calculator summary", "Special offers landing page"],
  media: ["Gallery + hero media + SEO copy", "Brand landing page modules", "Category hero rail"],
  leads: ["Lead forms + CRM intake", "Quote request modal", "Contact us + chat capture"]
} satisfies Record<WebsiteMappingLaneId, string[]>;

const websiteMappingSyncOptions = {
  inventory: ["Live API push", "Hourly sync", "Nightly publish batch"],
  pricing: ["Publish window sync", "Manager-approved publish", "Nightly publish batch"],
  media: ["Scheduled publish batch", "Manual review publish", "Asset-ready webhook"],
  leads: ["Webhook return path", "Lead inbox polling", "CRM direct post"]
} satisfies Record<WebsiteMappingLaneId, string[]>;

const websiteMappingValidationOptions = {
  inventory: ["Manager review before publish", "Auto-publish on ready", "Inventory lead sign-off"],
  pricing: ["Publish manager approval", "Finance approval required", "Auto-publish on window"],
  media: ["Brand manager review", "Marketing approval", "Auto-publish on asset complete"],
  leads: ["Ops lead monitoring", "BDC manager approval", "Sales lead auto-route"]
} satisfies Record<WebsiteMappingLaneId, string[]>;

const syncSettingsCategoryCards = [
  {
    detail: "Connection records for Salesforce, Power BI, websites, webhooks, and future external services.",
    label: "3rd Party Data Integrations",
    value: "8"
  },
  {
    detail: "Named endpoint, credential, retry, and transport settings that can be reused across sync jobs.",
    label: "Configurations",
    value: "14"
  },
  {
    detail: "Rules that decide which DMS objects publish, transform, merge, or stay internal.",
    label: "Object Rules",
    value: "21"
  },
  {
    detail: "App-level flags for environments, permissions, audit retention, and feature behavior.",
    label: "Application Configurations",
    value: "11"
  }
];

const syncSettingsRows = [
  {
    description: "Lead, account, opportunity, and service-contact sync profile for CRM handoff.",
    environment: "Sandbox + Production",
    kind: "3rd Party Data Integration",
    label: "Salesforce CRM Connector",
    lastSync: "2 min ago",
    namespace: "salesforce.crm",
    records: "4 objects",
    status: "Active",
    tone: "stable",
    visibility: "Protected"
  },
  {
    description: "Dataset push configuration for store, inventory, labor, and finance dashboard refreshes.",
    environment: "Production",
    kind: "3rd Party Data Integration",
    label: "Power BI Dataset Push",
    lastSync: "12 min ago",
    namespace: "microsoft.powerbi",
    records: "7 datasets",
    status: "Active",
    tone: "stable",
    visibility: "Protected"
  },
  {
    description: "Crosswalk for DMS fields, external field names, required transforms, and default values.",
    environment: "All",
    kind: "Configuration",
    label: "Integration Field Mapping",
    lastSync: "1 hour ago",
    namespace: "sync.mapping",
    records: "56 fields",
    status: "Ready",
    tone: "ready",
    visibility: "Public"
  },
  {
    description: "Determines lead source assignment, duplicate checks, owner routing, and service follow-up flags.",
    environment: "All",
    kind: "Object Rule",
    label: "Lead Routing Rules",
    lastSync: "18 min ago",
    namespace: "rules.leads",
    records: "9 rules",
    status: "Active",
    tone: "stable",
    visibility: "Public"
  },
  {
    description: "Controls inventory eligibility, media requirements, price visibility, and sold-unit suppression.",
    environment: "All",
    kind: "Object Rule",
    label: "Inventory Publish Rules",
    lastSync: "35 min ago",
    namespace: "rules.inventory",
    records: "12 rules",
    status: "Active",
    tone: "stable",
    visibility: "Public"
  },
  {
    description: "Retry cadence, payload signing, timeout budget, and escalation ownership for webhook deliveries.",
    environment: "Sandbox",
    kind: "Application Configuration",
    label: "Webhook Retry Policy",
    lastSync: "Pending",
    namespace: "app.webhooks",
    records: "5 values",
    status: "Draft",
    tone: "attention",
    visibility: "Protected"
  },
  {
    description: "Token scope and sender identity for SMS lead alerts and service status notifications.",
    environment: "Production",
    kind: "Configuration",
    label: "Twilio Notification Config",
    lastSync: "Yesterday",
    namespace: "twilio.messaging",
    records: "3 values",
    status: "Needs Review",
    tone: "accent",
    visibility: "Protected"
  }
];

const syncSettingsApplicationCards = [
  {
    detail: "Default external ID strategy, conflict handling, and source-of-truth hierarchy.",
    label: "Object Identity"
  },
  {
    detail: "Credential owner, environment lock, token rotation window, and masked-secret audit.",
    label: "Security & Access"
  },
  {
    detail: "Daily sync windows, retry intervals, quiet hours, and store-level throttling.",
    label: "Sync Scheduling"
  },
  {
    detail: "Payload history retention, failed-record snapshots, and admin change tracking.",
    label: "Audit Retention"
  }
];

interface SyncMonitorCustomSettingsPageProps {
  connectorReadinessScore: number;
  onRunTool: (tool: string) => void;
  onViewChange: Dispatch<SetStateAction<WebsiteWorkspaceView>>;
  rows: WebsiteWorkspaceRow[];
  totalInventory: number;
  totalLeads: number;
}

const sandboxLicenseCards = [
  {
    available: "24 Available",
    inUseLabel: "1 of 25 Licenses In Use",
    kind: "Developer",
    tone: "stable"
  },
  {
    available: "No additional licenses available",
    inUseLabel: "0 of 0 Licenses In Use",
    kind: "Developer Pro",
    tone: "attention"
  },
  {
    available: "No additional licenses available",
    inUseLabel: "1 of 1 Licenses In Use",
    kind: "Partial Copy",
    tone: "alert"
  },
  {
    available: "No additional licenses available",
    inUseLabel: "0 of 0 Licenses In Use",
    kind: "Full",
    tone: "attention"
  }
] as const;

const sandboxTabOptions = ["Sandboxes", "Sandbox Templates", "Sandbox History"] as const;

type SandboxTemplateRow = {
  id: string;
  action: string;
  description: string;
  inUse: boolean;
  name: string;
  selectedModules: string[];
};

type SandboxRow = {
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
};

type SandboxHistoryRow = {
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
};

const initialSandboxRows: SandboxRow[] = [
  {
    id: "sandbox-miles",
    actionLinks: ["Clone", "Refresh", "Promote", "Log In", "Del"],
    completedOn: "1/20/2026, 8:54 PM",
    copiedFrom: "Premier Marine Cloud Template",
    currentOrgId: "00Ddz000003hga9",
    description: "Integration validation lane for marine inventory and CRM routing.",
    diffSummary: "4 backend modules isolated across 4 source files.",
    location: "Hyperforce USA952S",
    name: "Miles",
    releaseType: "Non-Preview",
    selectedModules: ["CRM Communicate Backend", "Dashboard + Workspace API Routes", "Workflow Action Plans", "Task + Activity Ledger"],
    status: "Completed",
    templateId: null,
    type: "Developer"
  },
  {
    id: "sandbox-team-marine",
    actionLinks: ["Clone", "Refresh", "Promote", "Log In", "Del"],
    completedOn: "11/19/2025, 4:14 PM",
    copiedFrom: "Premier Marine Cloud Partial Copy",
    currentOrgId: "00DVZ000003zLaH",
    description: "Team marine regression sandbox for website, Twilio, and workflow checks.",
    diffSummary: "6 backend modules isolated across 7 source files.",
    location: "Hyperforce USA710S",
    name: "teamMarine",
    releaseType: "Preview",
    selectedModules: [
      "Dashboard + Workspace API Routes",
      "CRM Communicate Backend",
      "Twilio Messaging Flows",
      "Service Notification Rules",
      "Service Order Detail",
      "Workflow Action Plans"
    ],
    status: "Completed",
    templateId: "template-team-marine",
    type: "Partial Copy"
  }
] as const;

const initialSandboxTemplateRows: SandboxTemplateRow[] = [
  {
    id: "template-team-marine",
    action: "Edit",
    description: "Backend-safe template for CRM, website, workflow, and service API changes.",
    inUse: true,
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

const initialSandboxHistoryRows: SandboxHistoryRow[] = [
  {
    detail: "Miles provisioned from Premier Marine Cloud Template.",
    diffSummary: "4 backend modules isolated across 4 source files.",
    eventType: "Provisioned",
    activated: "1/20/2026, 8:59 PM",
    activatedBy: "",
    finished: "1/20/2026, 8:54 PM",
    id: "history-miles-provisioned",
    refreshed: "1/20/2026, 7:36 PM",
    requestedBy: "Miles May",
    sandbox: "Miles"
  },
  {
    detail: "teamMarine provisioned from Premier Marine Cloud Partial Copy.",
    diffSummary: "6 backend modules isolated across 7 source files.",
    eventType: "Provisioned",
    activated: "11/19/2025, 4:26 PM",
    activatedBy: "Automated Process",
    finished: "11/19/2025, 4:14 PM",
    id: "history-team-marine-provisioned",
    refreshed: "11/19/2025, 3:20 PM",
    requestedBy: "teamMarine",
    sandbox: "teamMarine"
  }
] as const;

const fallbackSandboxBackendModules: SandboxBackendModule[] = [
  {
    detail: "Dashboard payload and workspace route handlers that shape store-scoped app shell responses across website, sales, service, parts, desktop, analytics, and audit surfaces.",
    name: "Dashboard + Workspace API Routes",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Planner logic for menu-driven submit actions, queued task messages, and activity detail generation used across workspaces.",
    name: "Workflow Action Plans",
    sourceFiles: ["apps/api/src/workflowActionPlans.ts", "apps/api/src/workflowActionPlans.test.ts"]
  },
  {
    detail: "Store-scoped CRM contacts, conversations, outbound SMS actions, inbound thread hydration, and quick-info mutations for Communicate.",
    name: "CRM Communicate Backend",
    sourceFiles: ["apps/api/src/crmCommunicate.ts", "apps/api/src/server.ts"]
  },
  {
    detail: "Twilio credential resolution, request signing, inbound/status webhook handling, and outbound message payload shaping.",
    name: "Twilio Messaging Flows",
    sourceFiles: ["apps/api/src/twilioMessaging.ts", "apps/api/src/server.ts"]
  },
  {
    detail: "Service lane notification builders that derive customer, technician, parts-received, and promise-risk alerts from live service rows.",
    name: "Service Notification Rules",
    sourceFiles: ["apps/api/src/serviceNotifications.ts", "apps/api/src/serviceNotifications.test.ts"]
  },
  {
    detail: "Normalized service-order detail snapshots, mutation rules, labor/job linkage, duplicate/create flows, and part catalog shaping.",
    name: "Service Order Detail",
    sourceFiles: ["apps/api/src/serviceOrderDetail.ts", "apps/api/src/serviceOrderDetail.test.ts", "apps/api/src/server.ts"]
  },
  {
    detail: "Sales deal deposit ledger retrieval, cashier deposit creation, and receipt/reprint activity actions tied to deal-level accounting flows.",
    name: "Sales Deal Deposits",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Shared task queue and activity-log routes that record backend workflow execution across website, service, sales, parts, and audit flows.",
    name: "Task + Activity Ledger",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Task SLA preview, copy, reset, and action routes that drive audit-side policy management for queued backend work.",
    name: "Task SLA Policies",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Cashier accountability reporting endpoints that aggregate operator activity by day, user, and action window for store audit review.",
    name: "Cashier Accountability Report",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Technician workload reporting that groups repair orders, jobs, and labor sessions into available, billed, and credited hour summaries.",
    name: "Technician Workload Report",
    sourceFiles: ["apps/api/src/server.ts", "apps/api/src/serviceOrderDetail.ts"]
  },
  {
    detail: "Vendor list and maintenance endpoints used by parts-side purchasing and supplier management workflows.",
    name: "Vendor Management APIs",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Pricing-rule retrieval and mutation endpoints that back inventory pricing controls and downstream merchandising decisions.",
    name: "Pricing Rules APIs",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Approval request endpoints and status updates used by management review flows before pricing, inventory, or process changes are promoted.",
    name: "Approval Workflows",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Boat inventory CRUD and search endpoints that drive unit-level inventory state, merchandising fields, and downstream website payloads.",
    name: "Boat Inventory APIs",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Prisma schema plus seed routines that define persisted store, CRM, website, service, inventory, task, and audit records used by the backend.",
    name: "Prisma + Seed Data",
    sourceFiles: ["packages/database/prisma/schema.prisma", "packages/database/prisma/seed.ts", "apps/api/src/seed.ts"]
  }
];

type SandboxTemplateDraft = {
  description: string;
  name: string;
  selectedModules: string[];
};

type SandboxDraft = {
  name: string;
  purpose: string;
  selectedModules: string[];
  templateName: string;
  type: string;
};

function NewSandboxTemplatePage({
  initialTemplate,
  modules,
  onDelete,
  onCancel,
  onSave
}: {
  initialTemplate: SandboxTemplateRow | null;
  modules: SandboxBackendModule[];
  onDelete?: () => void;
  onCancel: () => void;
  onSave: (draft: SandboxTemplateDraft) => void;
}) {
  const [draft, setDraft] = useState<SandboxTemplateDraft>({
    description: initialTemplate?.description ?? "",
    name: initialTemplate?.name ?? "",
    selectedModules: initialTemplate?.selectedModules ?? []
  });
  const [activeObjectName, setActiveObjectName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedObjects, setSelectedObjects] = useState<string[]>(() => initialTemplate?.selectedModules ?? []);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  useEffect(() => {
    setDraft({
      description: initialTemplate?.description ?? "",
      name: initialTemplate?.name ?? "",
      selectedModules: initialTemplate?.selectedModules ?? []
    });
    setSelectedObjects(initialTemplate?.selectedModules ?? []);
    setActiveObjectName(initialTemplate?.selectedModules[0] ?? modules[0]?.name ?? null);
    setSearchTerm("");
    setShowSelectedOnly(false);
  }, [initialTemplate, modules]);

  const filteredObjects = modules.filter((object) => {
    if (showSelectedOnly && !selectedObjects.includes(object.name)) {
      return false;
    }

    if (searchTerm.trim().length === 0) {
      return true;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    return object.name.toLowerCase().includes(normalizedSearch);
  });
  const activeObject = modules.find((object) => object.name === activeObjectName) ?? null;
  const allFilteredSelected = filteredObjects.length > 0 && filteredObjects.every((object) => selectedObjects.includes(object.name));

  function toggleObjectSelection(objectName: string) {
    setSelectedObjects((current) =>
      current.includes(objectName) ? current.filter((name) => name !== objectName) : [...current, objectName]
    );
  }

  function toggleSelectAllFiltered() {
    setSelectedObjects((current) => {
      if (allFilteredSelected) {
        return current.filter((name) => !filteredObjects.some((object) => object.name === name));
      }

      const next = new Set(current);
      filteredObjects.forEach((object) => next.add(object.name));
      return [...next];
    });
  }

  function handleSave() {
    if (!draft.name.trim() || selectedObjects.length === 0) {
      return;
    }

    onSave({
      description: draft.description.trim(),
      name: draft.name.trim(),
      selectedModules: selectedObjects
    });
  }

  return (
    <div className="sandbox-template-builder-shell">
      <div className="sandbox-template-builder-header">
        <h3>{initialTemplate ? "Edit Sandbox Template" : "New Sandbox Template"}</h3>
        <button className="sandbox-page-help-link" type="button">
          Help for this Page
        </button>
      </div>

      <div className="sandbox-template-purpose-strip">
        Build a backend-only template for this app so API routes, workflow logic, messaging, schema-backed records, and service rules can
        change safely without affecting the frontend workspaces until you promote those changes.
      </div>

      <div className="sandbox-template-action-row sandbox-template-action-row-top">
        <button className="sandbox-new-button" disabled={!draft.name.trim() || selectedObjects.length === 0} onClick={handleSave} type="button">
          {initialTemplate ? "Update" : "Save"}
        </button>
        {onDelete ? <button className="sandbox-new-button" onClick={onDelete} type="button">Delete</button> : null}
        <button className="sandbox-new-button" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>

      <section className="sandbox-template-section">
        <div className="sandbox-section-title sandbox-template-section-title">
          <span>Sandbox Template Information</span>
          <span className="sandbox-required-label">Required Information</span>
        </div>

        <div className="sandbox-template-form-grid">
          <label className="sandbox-template-field sandbox-template-field-name">
            <span>Name</span>
            <input
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              required
              value={draft.name}
            />
          </label>

          <label className="sandbox-template-field sandbox-template-field-description">
            <span>Description</span>
            <textarea
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              value={draft.description}
            />
          </label>
        </div>
      </section>

      <section className="sandbox-template-section">
        <div className="sandbox-template-objects-intro">Select the actual backend modules and route families you want this app sandbox template to isolate.</div>

        <div className="sandbox-template-object-layout">
          <div className="sandbox-template-object-panel">
            <div className="sandbox-template-object-header">
              <strong>Backend Modules</strong>
              <div className="sandbox-template-filter-links">
                <button className={!showSelectedOnly ? "is-active" : ""} onClick={() => setShowSelectedOnly(false)} type="button">
                  Show All
                </button>
                <span>|</span>
                <button className={showSelectedOnly ? "is-active" : ""} onClick={() => setShowSelectedOnly(true)} type="button">
                  Show Selected
                </button>
              </div>
            </div>

            <div className="sandbox-template-object-table-shell">
              <div className="sandbox-template-search-row">
                <input
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search"
                  value={searchTerm}
                />
              </div>

              <div className="sandbox-template-object-scroll">
                <table className="sandbox-table sandbox-template-object-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Source Files</th>
                      <th className="sandbox-template-selected-column">
                        <input aria-label="Select all backend modules" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} type="checkbox" />
                        <span>Include</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredObjects.map((object) => {
                      const isSelected = selectedObjects.includes(object.name);
                      const isActive = activeObjectName === object.name;

                      return (
                        <tr
                          className={isActive ? "is-active" : ""}
                          key={object.name}
                          onClick={() => setActiveObjectName(object.name)}
                        >
                          <td>{object.name}</td>
                          <td>{object.sourceFiles.length > 0 ? object.sourceFiles.length : ""}</td>
                          <td className="sandbox-template-selected-column">
                            <input
                              checked={isSelected}
                              onChange={() => toggleObjectSelection(object.name)}
                              onClick={(event) => event.stopPropagation()}
                              type="checkbox"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sandbox-template-selection-count">Modules Selected: {selectedObjects.length}</div>
            </div>
          </div>

          <aside className="sandbox-template-detail-panel">
            <div className="sandbox-template-detail-title">
              <strong>Module Details:</strong>
              <span>Click a backend module to see what this template isolates from the live app.</span>
            </div>

            {activeObject ? (
              <div className="sandbox-template-detail-card">
                <h4>{activeObject.name}</h4>
                <p>{activeObject.detail}</p>
                <div className="sandbox-template-detail-meta">
                  <span>Source Files</span>
                  <strong>{activeObject.sourceFiles.length}</strong>
                </div>
                <div className="sandbox-template-detail-meta">
                  <span>Selected for Template</span>
                  <strong>{selectedObjects.includes(activeObject.name) ? "Yes" : "No"}</strong>
                </div>
                <div className="sandbox-template-detail-meta">
                  <span>Frontend Impact</span>
                  <strong>None until promoted</strong>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <div className="sandbox-template-action-row sandbox-template-action-row-bottom">
        <button className="sandbox-new-button" disabled={!draft.name.trim() || selectedObjects.length === 0} onClick={handleSave} type="button">
          {initialTemplate ? "Update" : "Save"}
        </button>
        {onDelete ? <button className="sandbox-new-button" onClick={onDelete} type="button">Delete</button> : null}
        <button className="sandbox-new-button" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewSandboxPage({
  modules,
  onCancel,
  onSave,
  templates
}: {
  modules: SandboxBackendModule[];
  onCancel: () => void;
  onSave: (draft: SandboxDraft) => void;
  templates: SandboxTemplateRow[];
}) {
  const defaultTemplateName = templates[0]?.name ?? "";
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [sandboxType, setSandboxType] = useState("Developer");
  const [templateName, setTemplateName] = useState(defaultTemplateName);
  const [activeModuleName, setActiveModuleName] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>(() => templates[0]?.selectedModules ?? []);

  const activeTemplate = templates.find((template) => template.name === templateName) ?? null;
  const activeModule = modules.find((object) => object.name === activeModuleName) ?? null;

  function handleTemplateChange(nextTemplateName: string) {
    setTemplateName(nextTemplateName);
    const nextTemplate = templates.find((template) => template.name === nextTemplateName);
    setSelectedModules(nextTemplate?.selectedModules ?? []);
    setActiveModuleName(null);
  }

  function toggleModuleSelection(moduleName: string) {
    setSelectedModules((current) =>
      current.includes(moduleName) ? current.filter((name) => name !== moduleName) : [...current, moduleName]
    );
  }

  function handleSave() {
    if (!name.trim() || !templateName || selectedModules.length === 0) {
      return;
    }

    onSave({
      name: name.trim(),
      purpose: purpose.trim(),
      selectedModules,
      templateName,
      type: sandboxType
    });
  }

  return (
    <div className="sandbox-template-builder-shell">
      <div className="sandbox-template-builder-header">
        <h3>New Sandbox</h3>
        <button className="sandbox-page-help-link" type="button">
          Help for this Page
        </button>
      </div>

      <div className="sandbox-template-purpose-strip">
        Provision a backend-safe sandbox from a saved template. The template preloads API, workflow, messaging, and schema module presets so
        backend edits stay isolated from the live frontend until you explicitly promote them.
      </div>

      <div className="sandbox-template-action-row sandbox-template-action-row-top">
        <button className="sandbox-new-button" disabled={!name.trim() || !templateName || selectedModules.length === 0} onClick={handleSave} type="button">
          Save
        </button>
        <button className="sandbox-new-button" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>

      <section className="sandbox-template-section">
        <div className="sandbox-section-title sandbox-template-section-title">
          <span>Sandbox Information</span>
          <span className="sandbox-required-label">Required Information</span>
        </div>

        <div className="sandbox-template-form-grid">
          <label className="sandbox-template-field sandbox-template-field-name">
            <span>Name</span>
            <input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>

          <label className="sandbox-template-field">
            <span>Sandbox Type</span>
            <select onChange={(event) => setSandboxType(event.target.value)} value={sandboxType}>
              <option value="Developer">Developer</option>
              <option value="Developer Pro">Developer Pro</option>
              <option value="Partial Copy">Partial Copy</option>
            </select>
          </label>

          <label className="sandbox-template-field">
            <span>Backend Template</span>
            <select onChange={(event) => handleTemplateChange(event.target.value)} value={templateName}>
              {templates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label className="sandbox-template-field sandbox-template-field-description">
            <span>Purpose</span>
            <textarea onChange={(event) => setPurpose(event.target.value)} rows={4} value={purpose} />
          </label>
        </div>

        {activeTemplate ? (
          <div className="sandbox-template-summary-strip">
            <span className="legacy-chip tone-stable">{activeTemplate.name}</span>
            <span className="legacy-chip tone-neutral">{selectedModules.length} backend modules</span>
            <span className="legacy-chip tone-neutral">Frontend untouched until promotion</span>
          </div>
        ) : null}
      </section>

      <section className="sandbox-template-section">
        <div className="sandbox-template-objects-intro">Template preset modules start selected below. You can fine-tune the backend scope before provisioning.</div>

        <div className="sandbox-template-object-layout">
          <div className="sandbox-template-object-panel">
            <div className="sandbox-template-object-header">
              <strong>Preset Backend Modules</strong>
              <span className="sandbox-template-helper-copy">Driven by {templateName || "template selection"}</span>
            </div>

            <div className="sandbox-template-object-table-shell">
              <div className="sandbox-template-object-scroll">
                <table className="sandbox-table sandbox-template-object-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Source Files</th>
                      <th className="sandbox-template-selected-column">
                        <span>Include</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((object) => {
                      const isSelected = selectedModules.includes(object.name);
                      const isActive = activeModuleName === object.name;

                      return (
                        <tr className={isActive ? "is-active" : ""} key={object.name} onClick={() => setActiveModuleName(object.name)}>
                          <td>{object.name}</td>
                          <td>{object.sourceFiles.length}</td>
                          <td className="sandbox-template-selected-column">
                            <input
                              checked={isSelected}
                              onChange={() => toggleModuleSelection(object.name)}
                              onClick={(event) => event.stopPropagation()}
                              type="checkbox"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sandbox-template-selection-count">Modules Selected: {selectedModules.length}</div>
            </div>
          </div>

          <aside className="sandbox-template-detail-panel">
            <div className="sandbox-template-detail-title">
              <strong>Provisioning Details:</strong>
              <span>Review how this sandbox stays backend-only until promoted.</span>
            </div>

            {activeModule ? (
              <div className="sandbox-template-detail-card">
                <h4>{activeModule.name}</h4>
                <p>{activeModule.detail}</p>
                <div className="sandbox-template-detail-meta">
                  <span>Included by Template</span>
                  <strong>{activeTemplate?.selectedModules.includes(activeModule.name) ? "Yes" : "No"}</strong>
                </div>
                <div className="sandbox-template-detail-meta">
                  <span>Included in This Sandbox</span>
                  <strong>{selectedModules.includes(activeModule.name) ? "Yes" : "No"}</strong>
                </div>
                <div className="sandbox-template-detail-meta">
                  <span>Frontend Impact</span>
                  <strong>UI unchanged</strong>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <div className="sandbox-template-action-row sandbox-template-action-row-bottom">
        <button className="sandbox-new-button" disabled={!name.trim() || !templateName || selectedModules.length === 0} onClick={handleSave} type="button">
          Save
        </button>
        <button className="sandbox-new-button" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}

function buildLocalSandboxPromotionPreview(sandboxContext: SandboxSessionContext): SandboxPromotionPreview {
  const modules = fallbackSandboxBackendModules.slice(0, 4);

  const changes = modules.map((module, index) => {
    const leafName = index === 0 ? "Desktop" : index === 1 ? "Website Feed" : index === 2 ? "Communicate" : "Notification Center";
    const viewName =
      index === 0 ? "Workspace shell" : index === 1 ? "Workflow panels" : index === 2 ? "Customer timeline" : "Webhook processing";
    const entityName =
      index === 0 ? "dashboardPayload" : index === 1 ? "workflowActionPlan" : index === 2 ? "crmConversation" : "twilioWebhook";
    const fieldName =
      index === 0 ? "workspaceRouteMap" : index === 1 ? "submitTaskPlan" : index === 2 ? "threadHydrationContract" : "signatureVerification";
    const productionValue =
      index === 0
        ? "Current route-to-leaf map and shell labels."
        : index === 1
          ? "Current submit-action task plan and assignment flow."
          : index === 2
            ? "Current thread hydration contract and timeline stitching."
            : "Current signature verification and callback parsing rules.";
    const sandboxValue =
      index === 0
        ? "Corrected route-to-leaf map with sandbox shell overrides."
        : index === 1
          ? "Updated submit-action task plan and assignment flow."
          : index === 2
            ? `Updated thread hydration contract for ${sandboxContext.sandboxName}.`
            : `Updated signature verification and callback parsing for ${sandboxContext.sandboxName}.`;
    const riskLevel = (index === 0 || index === 3 ? "high" : "medium") as SandboxPromotionRiskLevel;

    return {
      affectedLeafs: [leafName],
      affectedViews: [viewName],
      entityName,
      fieldName,
      id: `local-change-${index}`,
      impactSummary: module.detail,
      leafName,
      moduleName: module.name,
      productionState: `${entityName}.${fieldName}: ${productionValue}`,
      productionValue,
      riskLevel,
      sandboxState: `${entityName}.${fieldName}: ${sandboxValue}`,
      sandboxValue,
      sourceFiles: module.sourceFiles,
      viewName
    };
  });

  const validationChecks = modules.map((module, index) => ({
    detail:
      index % 2 === 0
        ? `Compare persisted field values for ${module.name} before deployment.`
        : `Review downstream dependencies and deployment health for ${module.name}.`,
    id: `local-check-${index}`,
    label: `${module.name} reviewed`,
    status: (index === 0 ? "attention" : index === 1 ? "warning" : "ready") as SandboxPromotionCheckStatus
  }));

  return {
    changes,
    comparisonViews: changes.map((change) => ({
      affectedLeafs: change.affectedLeafs,
      fieldDiffs: [`${change.entityName}.${change.fieldName}: ${change.productionValue} -> ${change.sandboxValue}`],
      id: `local-compare-${change.id}`,
      impactSummary: change.impactSummary,
      productionViewLabel: `${change.viewName} keeps the current production value.`,
      riskLevel: change.riskLevel,
      sandboxViewLabel: `${change.viewName} proposes the sandbox value for review.`,
      title: `${change.moduleName} - ${change.viewName}`
    })),
    generatedAt: new Date().toLocaleString("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "numeric",
      year: "numeric"
    }),
    healthScore: 72,
    hiddenContainerLabel: `${sandboxContext.sandboxName} deployment plan`,
    sandboxId: sandboxContext.sandboxId,
    sandboxName: sandboxContext.sandboxName,
    summary: `${changes.length} persisted deploy candidates are ready for comparison across ${modules.length} backend modules.`,
    validationChecks
  };
}

function SandboxDeploymentWorkbench({
    activeStoreId,
    activeUserName,
    startOpen = false,
    sandboxContext
  }: {
    activeStoreId: string;
    activeUserName: string;
    startOpen?: boolean;
    sandboxContext: SandboxSessionContext | null;
  }) {
    const [isPlanOpen, setIsPlanOpen] = useState(startOpen);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [preview, setPreview] = useState<SandboxPromotionPreview | null>(null);
    const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>([]);
    const [reviewedCheckIds, setReviewedCheckIds] = useState<string[]>([]);

    useEffect(() => {
      if (!preview) {
        setSelectedChangeIds([]);
        setReviewedCheckIds([]);
        return;
      }

      setSelectedChangeIds(preview.changes.map((change) => change.id));
      setReviewedCheckIds([]);
    }, [preview]);

    async function loadPlan() {
      if (preview || !sandboxContext) {
        return;
      }

      setIsLoadingPreview(true);

      try {
        const nextPreview = await getSandboxPromotionPreview(activeStoreId, sandboxContext.sandboxId);
        setPreview(nextPreview);
      } catch (error) {
        setPreview(buildLocalSandboxPromotionPreview(sandboxContext));
        setNotice(error instanceof Error ? `${error.message} Showing the local deployment planner.` : "Showing the local deployment planner.");
      } finally {
        setIsLoadingPreview(false);
      }
    }

    useEffect(() => {
      if (!startOpen) {
        return;
      }

      setIsPlanOpen(true);
      void loadPlan();
    }, [startOpen]);

    async function handleOpenPlan() {
      const nextOpen = !isPlanOpen;
      setIsPlanOpen(nextOpen);

      if (!nextOpen || preview || !sandboxContext) {
        return;
      }

      await loadPlan();
    }

    function toggleChange(changeId: string) {
      setSelectedChangeIds((current) =>
        current.includes(changeId) ? current.filter((id) => id !== changeId) : [...current, changeId]
      );
    }

    function toggleReviewedCheck(checkId: string) {
      setReviewedCheckIds((current) =>
        current.includes(checkId) ? current.filter((id) => id !== checkId) : [...current, checkId]
      );
    }

    async function handlePushSelectedChanges() {
      if (!sandboxContext || !preview) {
        return;
      }

      setIsPushing(true);

      try {
        const result = await pushSandboxToProduction(activeStoreId, sandboxContext.sandboxId, {
          actorName: activeUserName,
          selectedChangeIds,
          validatedCheckIds: reviewedCheckIds
        });
        setNotice(result.message);
        setPreview(result.preview);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to push selected sandbox changes.");
      } finally {
        setIsPushing(false);
      }
    }

    const allChecksReviewed = preview ? reviewedCheckIds.length === preview.validationChecks.length : false;

    return (
      <section aria-label="Sandbox blank canvas" className="sandbox-push-workbench-shell">
        <div className="sandbox-push-workbench-intro">
          <div>
            <span className="sandbox-push-workbench-eyebrow">Sandbox Deployment Workbench</span>
            <h2>Push to Production</h2>
            <p>
              Build a deploy plan from the current sandbox, inspect the backend modules and leafs it touches, compare sandbox vs production
              behavior, and run the health checks you want reviewed before deployment.
            </p>
          </div>
          <div className="sandbox-push-workbench-actions">
            <button className="sandbox-new-button" onClick={() => void handleOpenPlan()} type="button">
              {isPlanOpen ? "Hide Deployment Plan" : "Push to Production"}
            </button>
          </div>
        </div>

        <div className="sandbox-push-workbench-banner-grid">
          <article className="sandbox-push-banner-card">
            <span>Sandbox</span>
            <strong>{sandboxContext?.sandboxName ?? "Current sandbox"}</strong>
          </article>
          <article className="sandbox-push-banner-card">
            <span>Production mirror</span>
            <strong>{sandboxContext?.sourceStoreName ?? "Current production store"}</strong>
          </article>
          <article className="sandbox-push-banner-card">
            <span>Deploy mode</span>
            <strong>Selective backend promotion</strong>
          </article>
        </div>

        {notice ? <div className="sandbox-push-workbench-notice">{notice}</div> : null}

        {isPlanOpen ? (
          <div aria-label={preview?.hiddenContainerLabel ?? "Sandbox deployment plan"} className="sandbox-push-hidden-container">
            {isLoadingPreview ? (
              <div className="sandbox-push-loading">Locating changed modules, views, and validation checks...</div>
            ) : preview ? (
              <>
                <section className="sandbox-push-summary-grid">
                  <article className="sandbox-push-summary-card">
                    <span>Deploy summary</span>
                    <strong>{preview.summary}</strong>
                    <small>Generated {preview.generatedAt}</small>
                  </article>
                  <article className="sandbox-push-summary-card">
                    <span>Health score</span>
                    <strong>{preview.healthScore}%</strong>
                    <small>Review all checks before pushing selected changes.</small>
                  </article>
                  <article className="sandbox-push-summary-card">
                    <span>Selected changes</span>
                    <strong>{selectedChangeIds.length}</strong>
                    <small>{preview.changes.length} deploy candidates available</small>
                  </article>
                </section>

                <section className="sandbox-push-section">
                  <div className="sandbox-push-section-heading">
                    <div>
                      <strong>Changed modules and leafs</strong>
                      <p>Select the backend modules you want to push into production.</p>
                    </div>
                  </div>

                  <div className="sandbox-push-change-table-wrap">
                    <table className="sandbox-push-change-table">
                      <thead>
                        <tr>
                          <th>Push</th>
                          <th>Module</th>
                          <th>Affected Leafs</th>
                          <th>Sandbox View</th>
                          <th>Production View</th>
                          <th>Source Files</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.changes.map((change) => (
                          <tr key={change.id}>
                            <td>
                              <input checked={selectedChangeIds.includes(change.id)} onChange={() => toggleChange(change.id)} type="checkbox" />
                            </td>
                            <td>
                              <strong>{change.moduleName}</strong>
                              <p>{change.impactSummary}</p>
                              <div className="sandbox-push-change-meta">
                                <span>{change.leafName}</span>
                                <span>{change.viewName}</span>
                                <span>{`${change.entityName}.${change.fieldName}`}</span>
                              </div>
                            </td>
                            <td>{change.affectedLeafs.join(", ")}</td>
                            <td>
                              <div className="sandbox-push-value-cell">
                                <strong>{change.sandboxValue}</strong>
                                <p>{change.sandboxState}</p>
                              </div>
                            </td>
                            <td>
                              <div className="sandbox-push-value-cell">
                                <strong>{change.productionValue}</strong>
                                <p>{change.productionState}</p>
                              </div>
                            </td>
                            <td>
                              <div className="sandbox-push-source-file-list">
                                {change.sourceFiles.map((sourceFile) => (
                                  <span key={sourceFile}>{sourceFile}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="sandbox-push-compare-grid">
                  <div className="sandbox-push-section-heading">
                    <div>
                      <strong>Cross-view comparison</strong>
                      <p>Compare how the sandbox and production screens differ before deployment.</p>
                    </div>
                  </div>

                  {preview.comparisonViews.map((comparison) => (
                    <article className={`sandbox-push-compare-card tone-${comparison.riskLevel}`} key={comparison.id}>
                      <div className="sandbox-push-compare-card-header">
                        <strong>{comparison.title}</strong>
                        <span>{comparison.affectedLeafs.join(" | ")}</span>
                      </div>
                      <div className="sandbox-push-compare-columns">
                        <div>
                          <span>Sandbox Screen</span>
                          <p>{comparison.sandboxViewLabel}</p>
                        </div>
                        <div>
                          <span>Production Screen</span>
                          <p>{comparison.productionViewLabel}</p>
                        </div>
                      </div>
                      <p>{comparison.impactSummary}</p>
                      <ul className="sandbox-push-field-diff-list">
                        {comparison.fieldDiffs.map((fieldDiff) => (
                          <li key={fieldDiff}>{fieldDiff}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </section>

                <section className="sandbox-push-section">
                  <div className="sandbox-push-section-heading">
                    <div>
                      <strong>System health checks</strong>
                      <p>Review each check so the deployment plan records what was inspected before push.</p>
                    </div>
                  </div>

                  <div className="sandbox-push-check-list">
                    {preview.validationChecks.map((check) => (
                      <label className={`sandbox-push-check tone-${check.status}`} key={check.id}>
                        <input checked={reviewedCheckIds.includes(check.id)} onChange={() => toggleReviewedCheck(check.id)} type="checkbox" />
                        <div>
                          <strong>{check.label}</strong>
                          <p>{check.detail}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <div className="sandbox-push-footer-actions">
                  <button
                    className="sandbox-new-button"
                    disabled={isPushing || selectedChangeIds.length === 0 || !allChecksReviewed}
                    onClick={() => void handlePushSelectedChanges()}
                    type="button"
                  >
                    {isPushing ? "Pushing Selected Changes..." : "Push Selected Changes"}
                  </button>
                  <button className="sandbox-new-button" onClick={() => setIsPlanOpen(false)} type="button">
                    Close Plan
                  </button>
                </div>
              </>
            ) : (
              <div className="sandbox-push-loading">Unable to build a deployment plan for this sandbox.</div>
            )}
          </div>
        ) : null}
      </section>
    );
  }

function SandboxesPage({
  activeUserEmail,
  activeUserName,
  onViewChange,
  storeId
}: {
  activeUserEmail: string;
  activeUserName: string;
  onViewChange: Dispatch<SetStateAction<WebsiteWorkspaceView>>;
  storeId: string;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof sandboxTabOptions)[number]>("Sandboxes");
  const [isCreatingSandbox, setIsCreatingSandbox] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [sandboxModules, setSandboxModules] = useState<SandboxBackendModule[]>(() => fallbackSandboxBackendModules);
  const [sandboxRows, setSandboxRows] = useState<SandboxRow[]>(() => [...initialSandboxRows]);
  const [sandboxHistoryRows, setSandboxHistoryRows] = useState<SandboxHistoryRow[]>(() => [...initialSandboxHistoryRows]);
  const [sandboxTemplateRows, setSandboxTemplateRows] = useState<SandboxTemplateRow[]>(() => [...initialSandboxTemplateRows]);
  const [sandboxAccessById, setSandboxAccessById] = useState<Record<string, SandboxLoginAccess>>({});
  const [activeAccessSandboxId, setActiveAccessSandboxId] = useState<string | null>(null);
  const [loadingSandboxAccessId, setLoadingSandboxAccessId] = useState<string | null>(null);
  const [sandboxNotice, setSandboxNotice] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const isTemplatesTab = activeTab === "Sandbox Templates";
  const isHistoryTab = activeTab === "Sandbox History";
  const editingTemplate = sandboxTemplateRows.find((template) => template.id === editingTemplateId) ?? null;
  const activeAccessRow = activeAccessSandboxId ? sandboxRows.find((row) => row.id === activeAccessSandboxId) ?? null : null;
  const activeSandboxAccess = activeAccessSandboxId ? sandboxAccessById[activeAccessSandboxId] ?? null : null;

  function applySandboxWorkspacePayload(payload: {
    history: SandboxHistoryRow[];
    sandboxes: SandboxRow[];
    templates: SandboxTemplateRow[];
  }) {
    setSandboxRows(payload.sandboxes);
    setSandboxHistoryRows(payload.history);
    setSandboxTemplateRows(payload.templates);
  }

  function shouldUseLocalSandboxFallback(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return message.includes("failed to fetch") || message.includes("load failed") || message.includes("networkerror");
  }

  function buildLocalTimeLabel(date = new Date()) {
    return date.toLocaleString("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "numeric",
      year: "numeric"
    });
  }

  function buildLocalDiffSummary(selectedModules: string[]) {
    return `${selectedModules.length} backend modules isolated in this sandbox.`;
  }

  function buildLocalSandboxAccess(row: SandboxRow): SandboxLoginAccess {
    const normalizedEmail = activeUserEmail.trim().toLowerCase();
    const fallbackEmail = normalizedEmail.includes("@") ? normalizedEmail : `${normalizedEmail}@sandbox.local`;
    const [localPart, domainPart] = fallbackEmail.replace(/\.sandbox$/i, "").split("@");
    const safeLocalPart = (localPart || row.name).replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
    const safeDomainPart = (domainPart || "marinecloud.local").replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();

    return {
      apiKey: `sbx_local_${row.id.slice(-10)}`,
      dealerGroupName: row.copiedFrom || "Sandbox Dealer Group",
      loginEmail: `${safeLocalPart}@${safeDomainPart}.sandbox`,
      readOnlyNotice: `Sandbox sessions mirror the assigned dealer-group data in read-only mode. Changes stay isolated inside ${row.name}.`,
      sandboxId: row.id,
      sandboxName: row.name,
      sourceStoreId: storeId,
      sourceStoreName: row.copiedFrom || "Current Store"
    };
  }

  function getPromotionStateLabel(status: string) {
    if (status === "Promoted") {
      return "Ready to merge";
    }

    if (status === "Active") {
      return "Validation running";
    }

    return "Ready for promote";
  }

  function updateLocalTemplateUsage(nextRows: SandboxRow[]) {
    setSandboxTemplateRows((current) =>
      current.map((template) => ({
        ...template,
        inUse: nextRows.some((row) => row.templateId === template.id || row.copiedFrom === template.name)
      }))
    );
  }

  function updateLocalSandboxRows(mutate: (current: SandboxRow[]) => SandboxRow[]) {
    setSandboxRows((current) => {
      const nextRows = mutate(current);
      updateLocalTemplateUsage(nextRows);
      return nextRows;
    });
  }

  useEffect(() => {
    let isCancelled = false;

    getSandboxBackendModules()
      .then((modules) => {
        if (!isCancelled && modules.length > 0) {
          setSandboxModules(modules);
        }
      })
      .catch(() => {
        // Keep the local catalog snapshot during frontend-only runs.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    getSandboxWorkspace(storeId)
      .then((payload) => {
        if (!isCancelled) {
          applySandboxWorkspacePayload(payload);
        }
      })
      .catch(() => {
        // Keep the local fallback rows when the API is not available.
      });

    return () => {
      isCancelled = true;
    };
  }, [storeId]);

  function handleSandboxTabSelect(tab: (typeof sandboxTabOptions)[number]) {
    setActiveTab(tab);
    setActiveAccessSandboxId(null);
    setIsCreatingSandbox(false);
    setIsCreatingTemplate(false);
    setEditingTemplateId(null);
  }

  async function handleOpenSandboxAccess(row: SandboxRow) {
    if (activeAccessSandboxId === row.id) {
      setActiveAccessSandboxId(null);
      return;
    }

    setActiveAccessSandboxId(row.id);

    if (sandboxAccessById[row.id]) {
      return;
    }

    setLoadingSandboxAccessId(row.id);

    try {
      const access = await getSandboxLoginAccess(row.id);
      setSandboxAccessById((current) => ({
        ...current,
        [row.id]: access
      }));
    } catch (error) {
      if (!shouldUseLocalSandboxFallback(error)) {
        setSandboxNotice(error instanceof Error ? error.message : "Unable to load Sandbox access.");
        setActiveAccessSandboxId(null);
        return;
      }

      setSandboxAccessById((current) => ({
        ...current,
        [row.id]: buildLocalSandboxAccess(row)
      }));
    } finally {
      setLoadingSandboxAccessId((current) => (current === row.id ? null : current));
    }
  }

  async function handleCopySandboxAccess(label: string, value: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setSandboxNotice(`${label} clipboard copy is unavailable in this browser.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setSandboxNotice(`${label} copied for ${activeSandboxAccess?.sandboxName ?? "Sandbox"}.`);
    } catch {
      setSandboxNotice(`Unable to copy ${label.toLowerCase()} automatically.`);
    }
  }

  async function handleSaveTemplate(draft: SandboxTemplateDraft) {
    if (editingTemplate) {
      try {
        const payload = await updateSandboxTemplate(storeId, editingTemplate.id, draft);
        applySandboxWorkspacePayload(payload);
        setSandboxNotice(payload.message);
        setIsCreatingTemplate(false);
        setEditingTemplateId(null);
        setActiveTab("Sandbox Templates");
        return;
      } catch (error) {
        if (!shouldUseLocalSandboxFallback(error)) {
          setSandboxNotice(error instanceof Error ? error.message : "Unable to update Sandbox template.");
          return;
        }
      }

      setSandboxTemplateRows((current) =>
        current.map((template) =>
          template.id === editingTemplate.id
            ? {
                ...template,
                description: draft.description,
                name: draft.name,
                selectedModules: draft.selectedModules
              }
            : template
        )
      );
      updateLocalSandboxRows((current) =>
        current.map((sandbox) =>
          sandbox.templateId === editingTemplate.id && sandbox.copiedFrom === editingTemplate.name
            ? { ...sandbox, copiedFrom: draft.name }
            : sandbox
        )
      );
      setSandboxNotice(`Sandbox template ${draft.name} updated.`);
    } else {
      try {
        const payload = await createSandboxTemplate(storeId, draft);
        applySandboxWorkspacePayload(payload);
        setSandboxNotice(payload.message);
        setIsCreatingTemplate(false);
        setActiveTab("Sandbox Templates");
        return;
      } catch (error) {
        if (!shouldUseLocalSandboxFallback(error)) {
          setSandboxNotice(error instanceof Error ? error.message : "Unable to save Sandbox template.");
          return;
        }
      }

      setSandboxTemplateRows((current) => [
        {
          id: `template-${Date.now()}`,
          action: "Edit",
          description: draft.description,
          inUse: false,
          name: draft.name,
          selectedModules: draft.selectedModules
        },
        ...current
      ]);
      setSandboxNotice(`Sandbox template ${draft.name} saved.`);
    }

    setIsCreatingTemplate(false);
    setEditingTemplateId(null);
    setActiveTab("Sandbox Templates");
  }

  async function handleDeleteTemplate() {
    if (!editingTemplate) {
      return;
    }

    try {
      const payload = await deleteSandboxTemplate(storeId, editingTemplate.id);
      applySandboxWorkspacePayload(payload);
      setSandboxNotice(payload.message);
      setIsCreatingTemplate(false);
      setEditingTemplateId(null);
      setActiveTab("Sandbox Templates");
      return;
    } catch (error) {
      if (!shouldUseLocalSandboxFallback(error)) {
        setSandboxNotice(error instanceof Error ? error.message : "Unable to delete Sandbox template.");
        return;
      }
    }

    setSandboxTemplateRows((current) => current.filter((template) => template.id !== editingTemplate.id));
    setSandboxNotice(`Sandbox template ${editingTemplate.name} deleted.`);
    setIsCreatingTemplate(false);
    setEditingTemplateId(null);
    setActiveTab("Sandbox Templates");
  }

  async function handleSaveSandbox(draft: SandboxDraft) {
    const now = new Date();
    const timeLabel = buildLocalTimeLabel(now);
    const generatedOrgId = `00DSB${String(now.getTime()).slice(-8)}`;
    const template = sandboxTemplateRows.find((candidate) => candidate.name === draft.templateName) ?? null;

    try {
      const payload = await createSandbox(storeId, {
        actorEmail: activeUserEmail,
        actorName: activeUserName,
        name: draft.name,
        purpose: draft.purpose,
        selectedModules: draft.selectedModules,
        templateId: template?.id ?? null,
        type: draft.type
      });
      applySandboxWorkspacePayload(payload);
      setSandboxNotice(payload.message);
      setIsCreatingSandbox(false);
      setActiveTab("Sandboxes");
      return;
    } catch (error) {
      if (!shouldUseLocalSandboxFallback(error)) {
        setSandboxNotice(error instanceof Error ? error.message : "Unable to provision Sandbox.");
        return;
      }
    }

    updateLocalSandboxRows((current) => [
      {
        id: `sandbox-${now.getTime()}`,
        actionLinks: ["Clone", "Refresh", "Promote", "Log In", "Del"],
        completedOn: timeLabel,
        copiedFrom: draft.templateName,
        currentOrgId: generatedOrgId,
        description:
          draft.purpose || `Backend-safe copy of ${draft.selectedModules.length} app modules from ${draft.templateName}.`,
        diffSummary: buildLocalDiffSummary(draft.selectedModules),
        location: "Premier Marine Cloud Sandbox Runtime",
        name: draft.name,
        releaseType: draft.type === "Partial Copy" ? "Preview" : "Non-Preview",
        selectedModules: draft.selectedModules,
        status: "Completed",
        templateId: template?.id ?? null,
        type: draft.type
      },
      ...current
    ]);
    setSandboxHistoryRows((current) => [
      {
        activated: timeLabel,
        activatedBy: "Sandbox Provisioner",
        detail: `${draft.name} provisioned from ${draft.templateName}.`,
        diffSummary: buildLocalDiffSummary(draft.selectedModules),
        eventType: "Provisioned",
        finished: timeLabel,
        id: `history-${now.getTime()}`,
        refreshed: timeLabel,
        requestedBy: "Current Operator",
        sandbox: draft.name
      },
      ...current
    ]);
    setSandboxNotice(`Sandbox ${draft.name} provisioned.`);
    setIsCreatingSandbox(false);
    setActiveTab("Sandboxes");
  }

  async function handleSandboxAction(row: SandboxRow, action: string) {
    const actionMode =
      action === "Clone"
        ? "clone"
        : action === "Del"
          ? "delete"
          : action === "Refresh"
            ? "refresh"
              : action === "Promote"
                ? "promote"
            : action === "Log In"
              ? "login"
              : null;

    if (!actionMode) {
      return;
    }

    try {
      const payload = await runSandboxAction(storeId, row.id, {
        actorName: activeUserName,
        mode: actionMode
      });
      applySandboxWorkspacePayload(payload);
      setSandboxNotice(payload.message);
      if (action === "Log In") {
        navigate(`/login/sandbox/${row.id}`);
      }
      return;
    } catch (error) {
      if (!shouldUseLocalSandboxFallback(error)) {
        setSandboxNotice(error instanceof Error ? error.message : "Unable to run Sandbox action.");
        return;
      }
    }

    const now = new Date();
    const timeLabel = buildLocalTimeLabel(now);

    if (action === "Clone") {
      let cloneName = `${row.name} Clone`;
      let counter = 2;
      while (sandboxRows.some((candidate) => candidate.name === cloneName)) {
        cloneName = `${row.name} Clone ${counter}`;
        counter += 1;
      }

      updateLocalSandboxRows((current) => [
        {
          ...row,
          id: `sandbox-${now.getTime()}`,
          completedOn: timeLabel,
          copiedFrom: row.name,
          currentOrgId: `00DSB${String(now.getTime()).slice(-8)}`,
          name: cloneName
        },
        ...current
      ]);
      setSandboxHistoryRows((current) => [
        {
          activated: timeLabel,
          activatedBy: "Sandbox Provisioner",
          detail: `${cloneName} cloned from ${row.name}.`,
          diffSummary: row.diffSummary,
          eventType: "Cloned",
          finished: timeLabel,
          id: `history-${now.getTime()}`,
          refreshed: timeLabel,
          requestedBy: "Current Operator",
          sandbox: cloneName
        },
        ...current
      ]);
      setSandboxNotice(`Sandbox ${cloneName} cloned from ${row.name}.`);
      return;
    }

    if (action === "Del") {
      updateLocalSandboxRows((current) => current.filter((candidate) => candidate.id !== row.id));
      setSandboxHistoryRows((current) => [
        {
          activated: "",
          activatedBy: "",
          detail: `${row.name} deleted from the active Sandbox list.`,
          diffSummary: row.diffSummary,
          eventType: "Deleted",
          finished: timeLabel,
          id: `history-${now.getTime()}`,
          refreshed: "",
          requestedBy: "Current Operator",
          sandbox: row.name
        },
        ...current
      ]);
      setSandboxNotice(`Sandbox ${row.name} deleted.`);
      return;
    }

    if (action === "Refresh") {
      updateLocalSandboxRows((current) =>
        current.map((candidate) =>
          candidate.id === row.id
            ? {
                ...candidate,
                completedOn: timeLabel,
                status: "Completed"
              }
            : candidate
        )
      );
      setSandboxHistoryRows((current) => [
        {
          activated: "",
          activatedBy: "",
          detail: `${row.name} refreshed and synchronized with its backend module set.`,
          diffSummary: row.diffSummary,
          eventType: "Refreshed",
          finished: timeLabel,
          id: `history-${now.getTime()}`,
          refreshed: timeLabel,
          requestedBy: "Current Operator",
          sandbox: row.name
        },
        ...current
      ]);
      setSandboxNotice(`Sandbox ${row.name} refreshed.`);
      return;
    }

    if (action === "Promote") {
      updateLocalSandboxRows((current) =>
        current.map((candidate) =>
          candidate.id === row.id
            ? {
                ...candidate,
                status: "Promoted"
              }
            : candidate
        )
      );
      setSandboxHistoryRows((current) => [
        {
          activated: timeLabel,
          activatedBy: "Current Operator",
          detail: `${row.name} marked ready for promotion with ${row.selectedModules.length} backend modules in scope.`,
          diffSummary: row.diffSummary,
          eventType: "Promoted",
          finished: "",
          id: `history-${now.getTime()}`,
          refreshed: "",
          requestedBy: "Current Operator",
          sandbox: row.name
        },
        ...current
      ]);
      setSandboxNotice(`Sandbox ${row.name} marked ready for promotion.`);
      return;
    }

    setSandboxHistoryRows((current) => [
      {
        activated: timeLabel,
        activatedBy: "Current Operator",
        detail: `${row.name} login initiated for org ${row.currentOrgId}.`,
        diffSummary: row.diffSummary,
        eventType: "Login",
        finished: "",
        id: `history-${now.getTime()}`,
        refreshed: "",
        requestedBy: "Current Operator",
        sandbox: row.name
      },
      ...current
    ]);
    setSandboxNotice(`Sandbox login opened for ${row.name} (${row.currentOrgId}).`);
    navigate(`/login/sandbox/${row.id}`);
  }

  function handleEditTemplate(row: SandboxTemplateRow) {
    setEditingTemplateId(row.id);
    setIsCreatingTemplate(true);
  }

  if (isCreatingSandbox) {
    return (
      <div className="sandbox-page-shell sandbox-page-shell-compact">
        <section className="sandbox-table-shell">
          <div className="sandbox-tab-strip" role="tablist" aria-label="Sandbox sections">
            {sandboxTabOptions.map((tab) => (
              <button
                aria-selected={tab === activeTab}
                className={tab === activeTab ? "is-active" : ""}
                key={tab}
                onClick={() => handleSandboxTabSelect(tab)}
                role="tab"
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>

          <NewSandboxPage modules={sandboxModules} onCancel={() => setIsCreatingSandbox(false)} onSave={handleSaveSandbox} templates={sandboxTemplateRows} />
        </section>
      </div>
    );
  }

  if (isCreatingTemplate) {
    return (
      <div className="sandbox-page-shell sandbox-page-shell-compact">
        <section className="sandbox-table-shell">
          <div className="sandbox-tab-strip" role="tablist" aria-label="Sandbox sections">
            {sandboxTabOptions.map((tab) => (
              <button
                aria-selected={tab === activeTab}
                className={tab === activeTab ? "is-active" : ""}
                key={tab}
                onClick={() => handleSandboxTabSelect(tab)}
                role="tab"
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>

          <NewSandboxTemplatePage
            initialTemplate={editingTemplate}
            modules={sandboxModules}
            onCancel={() => {
              setIsCreatingTemplate(false);
              setEditingTemplateId(null);
            }}
            onDelete={editingTemplate ? handleDeleteTemplate : undefined}
            onSave={handleSaveTemplate}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="sandbox-page-shell">
      <section className="sandbox-page-header">
        <div>
          <div className="sandbox-page-title-row">
            <h2>Sandboxes</h2>
          </div>
          <p>
            Sandboxes in Premier Marine Cloud are backend-safe working copies of this app. Use them to change APIs, workflow logic,
            messaging, integrations, schema-backed records, and seeded data without affecting the frontend experience operators use every day.
            Sandbox Templates let you preselect which backend modules and data slices move into that isolated copy.
          </p>
        </div>
        <button className="sandbox-page-help-link" onClick={() => onViewChange("feed")} type="button">
          Return to Feed Console
        </button>
      </section>

      <section className="sandbox-page-alert" role="status">
        <span className="sandbox-page-alert-icon">i</span>
        <p>
          Plan ahead! The sandbox preview window for Winter '27 begins June 13, 2026.
          <button className="sandbox-page-inline-link" type="button">Salesforce Sandbox Preview Instructions</button>
        </p>
      </section>

      {sandboxNotice ? (
        <section className="sandbox-page-alert" role="status">
          <span className="sandbox-page-alert-icon">i</span>
          <p>{sandboxNotice}</p>
        </section>
      ) : null}

      <section className="sandbox-license-panel">
        <div className="sandbox-section-title">Available Sandbox Licenses</div>
        <div className="sandbox-license-grid">
          {sandboxLicenseCards.map((card) => (
            <article className="sandbox-license-card" key={card.kind}>
              <strong>{card.kind}</strong>
              <span className={`sandbox-license-usage tone-${card.tone}`}>{card.inUseLabel}</span>
              <span className="sandbox-license-availability">({card.available})</span>
            </article>
          ))}
        </div>
      </section>

      <section className="sandbox-table-shell">
        <div className="sandbox-tab-strip" role="tablist" aria-label="Sandbox sections">
          {sandboxTabOptions.map((tab) => (
            <button
              aria-selected={tab === activeTab}
              className={tab === activeTab ? "is-active" : ""}
              key={tab}
              onClick={() => handleSandboxTabSelect(tab)}
              role="tab"
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {!isHistoryTab ? (
          <div className="sandbox-table-toolbar">
            <button
              className="sandbox-new-button"
              onClick={() => (isTemplatesTab ? setIsCreatingTemplate(true) : setIsCreatingSandbox(true))}
              type="button"
            >
              {isTemplatesTab ? "New Sandbox Template" : "New Sandbox"}
            </button>
          </div>
        ) : null}

        <div className="sandbox-table-wrap">
          {isTemplatesTab ? (
            <table className="sandbox-table sandbox-table-templates">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>In Use</th>
                </tr>
              </thead>
              <tbody>
                {sandboxTemplateRows.map((row) => (
                  <tr key={row.id}>
                    <td><button className="sandbox-link-button" onClick={() => handleEditTemplate(row)} type="button">{row.action}</button></td>
                    <td><button className="sandbox-link-button is-name" onClick={() => handleEditTemplate(row)} type="button">{row.name}</button></td>
                    <td>{row.description}</td>
                    <td>{row.inUse ? <span className="sandbox-info-pill">i</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : isHistoryTab ? (
            <table className="sandbox-table sandbox-table-history">
              <thead>
                <tr>
                  <th>Sandbox</th>
                  <th>Event</th>
                  <th>Detail</th>
                  <th>Diff Summary</th>
                  <th>Requested By</th>
                  <th>Activated By</th>
                  <th>Refreshed</th>
                  <th>Finished</th>
                  <th>Activated</th>
                </tr>
              </thead>
              <tbody>
                {sandboxHistoryRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.sandbox}</td>
                    <td>{row.eventType}</td>
                    <td>{row.detail}</td>
                    <td>{row.diffSummary}</td>
                    <td><button className="sandbox-link-button" type="button">{row.requestedBy}</button></td>
                    <td>{row.activatedBy ? <button className="sandbox-link-button" type="button">{row.activatedBy}</button> : null}</td>
                    <td>{row.refreshed}</td>
                    <td>{row.finished}</td>
                    <td>{row.activated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="sandbox-table sandbox-table-sandboxes">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Promotion State</th>
                  <th>Location</th>
                  <th>Release Type</th>
                  <th>Current Org Id</th>
                  <th>Completed On</th>
                  <th>Diff Summary</th>
                  <th>Description</th>
                  <th>Copied From</th>
                </tr>
              </thead>
              <tbody>
                {sandboxRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="sandbox-action-links">
                        {row.actionLinks.map((link, index) => (
                          <span key={link}>
                            <button className="sandbox-link-button" onClick={() => handleSandboxAction(row, link)} type="button">{link}</button>
                            {index < row.actionLinks.length - 1 ? <span className="sandbox-link-divider">|</span> : null}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="sandbox-link-button is-name" onClick={() => void handleOpenSandboxAccess(row)} type="button">{row.name}</button>
                      <div className="sandbox-row-secondary-action">
                        <button className="sandbox-link-button" onClick={() => void handleOpenSandboxAccess(row)} type="button">
                          {activeAccessSandboxId === row.id ? "Hide Access" : "View Access"}
                        </button>
                      </div>
                    </td>
                    <td>{row.type}</td>
                    <td>{row.status}</td>
                    <td>
                      <span className={`sandbox-status-pill${row.status === "Promoted" ? " is-promoted" : row.status === "Active" ? " is-active" : ""}`}>
                        {getPromotionStateLabel(row.status)}
                      </span>
                    </td>
                    <td>{row.location}</td>
                    <td>{row.releaseType}</td>
                    <td>{row.currentOrgId}</td>
                    <td>{row.completedOn}</td>
                    <td>{row.diffSummary}</td>
                    <td>{row.description}</td>
                    <td>{row.copiedFrom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isTemplatesTab && !isHistoryTab && activeAccessRow ? (
          <section className="sandbox-access-card" aria-live="polite">
            <div className="sandbox-access-card-header">
              <div>
                <span className="sandbox-access-eyebrow">Sandbox Login Access</span>
                <h3>{activeAccessRow.name}</h3>
                <p>{activeSandboxAccess?.readOnlyNotice ?? `Loading access details for ${activeAccessRow.name}...`}</p>
              </div>
              <div className="sandbox-access-card-actions">
                <button className="sandbox-new-button" onClick={() => navigate(`/login/sandbox/${activeAccessRow.id}`)} type="button">
                  Open Sandbox Login
                </button>
                <button className="sandbox-new-button" onClick={() => setActiveAccessSandboxId(null)} type="button">
                  Close
                </button>
              </div>
            </div>

            {loadingSandboxAccessId === activeAccessRow.id && !activeSandboxAccess ? (
              <p className="sandbox-access-loading">Loading generated sandbox credentials...</p>
            ) : activeSandboxAccess ? (
              <div className="sandbox-access-grid">
                <article className="sandbox-access-item">
                  <span>Sandbox Account</span>
                  <div className="sandbox-access-value-row">
                    <code className="sandbox-access-value">{activeSandboxAccess.loginEmail}</code>
                    <button className="sandbox-link-button" onClick={() => void handleCopySandboxAccess("Sandbox account", activeSandboxAccess.loginEmail)} type="button">
                      Copy Login
                    </button>
                  </div>
                </article>
                <article className="sandbox-access-item">
                  <span>API Key</span>
                  <div className="sandbox-access-value-row">
                    <code className="sandbox-access-value">{activeSandboxAccess.apiKey}</code>
                    <button className="sandbox-link-button" onClick={() => void handleCopySandboxAccess("Sandbox API key", activeSandboxAccess.apiKey)} type="button">
                      Copy API Key
                    </button>
                  </div>
                </article>
                <article className="sandbox-access-item">
                  <span>Dealer Group Scope</span>
                  <strong>{activeSandboxAccess.dealerGroupName}</strong>
                </article>
                <article className="sandbox-access-item">
                  <span>Source Store</span>
                  <strong>{activeSandboxAccess.sourceStoreName}</strong>
                </article>
                <article className="sandbox-access-item">
                  <span>Source Store Id</span>
                  <strong>{activeSandboxAccess.sourceStoreId}</strong>
                </article>
                <article className="sandbox-access-item">
                  <span>Access Mode</span>
                  <strong>Read-only production mirror</strong>
                </article>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </div>
  );
}

function SyncMonitorCustomSettingsPage({
  connectorReadinessScore,
  onRunTool,
  onViewChange,
  rows,
  totalInventory,
  totalLeads
}: SyncMonitorCustomSettingsPageProps) {
  const activeDestinations = rows.filter((row) => row.status === "Publishing" || row.status === "Ready").length;
  const protectedSettings = syncSettingsRows.filter((setting) => setting.visibility === "Protected").length;
  const [schemaMappings, setSchemaMappings] = useState([
    { id: "m1", sourceField: "CustomerName", destField: "Contact.FullName", transform: "None", isEditing: false },
    { id: "m2", sourceField: "Email", destField: "Contact.Email", transform: "Lowercase", isEditing: false },
    { id: "m3", sourceField: "PhoneNumber", destField: "Contact.Phone", transform: "E164Format", isEditing: false },
    { id: "m4", sourceField: "StockNumber", destField: "Unit.StockId", transform: "None", isEditing: false },
    { id: "m5", sourceField: "SalePrice", destField: "Deal.CashPrice", transform: "CurrencyUSD", isEditing: false },
    { id: "m6", sourceField: "RoNumber", destField: "ServiceOrder.ROId", transform: "None", isEditing: false }
  ]);

  return (
    <div className="website-sync-settings-page">
      <section className="legacy-info-card website-feed-hero website-sync-settings-hero">
        <div className="website-feed-hero-copy">
          <span className="legacy-command-meta">Premier Marine Cloud DMS / Sync Monitor</span>
          <h3>Custom Settings</h3>
          <p>Manage external integrations, object rules, and reusable sync configuration records.</p>
          <div className="website-sync-settings-compact-stats">
            <span>{activeDestinations} active parties</span>
            <span>{protectedSettings} protected</span>
            <span>{connectorReadinessScore}% ready</span>
            <span>{totalLeads} leads today</span>
          </div>
        </div>

        <div className="website-feed-hero-actions">
          <button className="legacy-desktop-board-button" onClick={() => onRunTool("New Integration")} type="button">
            New Integration
          </button>
          <button className="legacy-desktop-board-button is-secondary" onClick={() => onRunTool("New Object Rule")} type="button">
            New Object Rule
          </button>
          <button className="legacy-desktop-board-button is-secondary" onClick={() => onRunTool("Validate Connections")} type="button">
            Validate Connections
          </button>
          <button className="legacy-desktop-board-button is-secondary" onClick={() => onViewChange("feed")} type="button">
            Feed Console
          </button>
        </div>
      </section>

      <section className="website-sync-settings-layout">
        <aside className="legacy-info-card website-sync-settings-nav">
          <div className="legacy-command-log-header">
            <div>
              <strong>Settings Explorer</strong>
              <span>Admin create/manage surface</span>
            </div>
          </div>
          {syncSettingsCategoryCards.map((category, index) => (
            <button className={index === 0 ? "is-selected" : ""} key={category.label} type="button">
              <span>{category.label}</span>
              <strong>{category.value}</strong>
            </button>
          ))}
        </aside>

        <div className="legacy-info-card website-sync-settings-table-card">
          <div className="website-feed-panel-heading">
            <div>
              <strong>Custom Settings Records</strong>
              <p>{totalInventory} DMS objects available for these Sync Monitor settings.</p>
            </div>
            <button className="legacy-desktop-board-button is-secondary" onClick={() => onRunTool("New Configuration")} type="button">
              New Configuration
            </button>
          </div>

          <div className="website-sync-settings-table-wrap">
            <table className="website-sync-settings-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Visibility</th>
                  <th>Namespace / Source</th>
                  <th>Environment</th>
                  <th>Records</th>
                  <th>Status</th>
                  <th>Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {syncSettingsRows.map((setting) => (
                  <tr key={setting.label}>
                    <td>
                      <button className="website-sync-settings-link-button" onClick={() => onRunTool(`Manage ${setting.label}`)} type="button">
                        Manage
                      </button>
                    </td>
                    <td>
                      <strong>{setting.label}</strong>
                      <span>{setting.description}</span>
                    </td>
                    <td>{setting.kind}</td>
                    <td>{setting.visibility}</td>
                    <td><code>{setting.namespace}</code></td>
                    <td>{setting.environment}</td>
                    <td>{setting.records}</td>
                    <td><span className={`legacy-chip tone-${setting.tone}`}>{setting.status}</span></td>
                    <td>{setting.lastSync}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="website-sync-settings-side-stack">
          <section className="legacy-info-card website-sync-settings-panel">
            <div className="website-feed-panel-heading">
              <strong>Connected Parties</strong>
              <span>{rows.length} available</span>
            </div>
            <div className="website-sync-settings-party-list">
              {rows.slice(0, 6).map((row) => (
                <article className="website-sync-settings-party" key={row.id}>
                  <div>
                    <strong>{row.brand}</strong>
                    <span>{row.domain}</span>
                  </div>
                  <span className={`legacy-chip tone-${row.status.toLowerCase()}`}>{row.status}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="legacy-info-card website-sync-settings-panel">
            <div className="website-feed-panel-heading">
              <strong>Application Configurations</strong>
              <span>Reusable controls</span>
            </div>
            <div className="website-sync-settings-app-grid">
              {syncSettingsApplicationCards.map((card) => (
                <article className="website-sync-settings-app-card" key={card.label}>
                  <strong>{card.label}</strong>
                  <p>{card.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="legacy-info-card legacy-schema-mapping-section">
        <div className="legacy-schema-mapping-header">
          <div>
            <strong>Schema Mapping</strong>
            <p>Map DMS source fields to destination object fields for outbound sync.</p>
          </div>
          <button
            className="legacy-desktop-board-button is-secondary"
            onClick={() => setSchemaMappings((prev) => [
              ...prev,
              { id: `m${Date.now()}`, sourceField: "", destField: "", transform: "None", isEditing: true }
            ])}
            type="button"
          >
            Add Mapping
          </button>
        </div>
        <table className="legacy-schema-mapping-table">
          <thead>
            <tr>
              <th>Source Field</th>
              <th>Destination Field</th>
              <th>Transform</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schemaMappings.map((mapping) => (
              <tr key={mapping.id}>
                <td>
                  {mapping.isEditing ? (
                    <input
                      className="legacy-schema-mapping-input"
                      onChange={(e) => setSchemaMappings((prev) => prev.map((m) => m.id === mapping.id ? { ...m, sourceField: e.target.value } : m))}
                      placeholder="Source field"
                      value={mapping.sourceField}
                    />
                  ) : (
                    <code>{mapping.sourceField}</code>
                  )}
                </td>
                <td>
                  {mapping.isEditing ? (
                    <input
                      className="legacy-schema-mapping-input"
                      onChange={(e) => setSchemaMappings((prev) => prev.map((m) => m.id === mapping.id ? { ...m, destField: e.target.value } : m))}
                      placeholder="Dest field"
                      value={mapping.destField}
                    />
                  ) : (
                    <code>{mapping.destField}</code>
                  )}
                </td>
                <td>
                  {mapping.isEditing ? (
                    <select
                      className="legacy-schema-mapping-select"
                      onChange={(e) => setSchemaMappings((prev) => prev.map((m) => m.id === mapping.id ? { ...m, transform: e.target.value } : m))}
                      value={mapping.transform}
                    >
                      {["None", "Lowercase", "Uppercase", "E164Format", "CurrencyUSD", "DateISO"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="legacy-chip tone-neutral">{mapping.transform}</span>
                  )}
                </td>
                <td>
                  <button
                    className="legacy-schema-mapping-action"
                    onClick={() => setSchemaMappings((prev) => prev.map((m) => m.id === mapping.id ? { ...m, isEditing: !m.isEditing } : m))}
                    type="button"
                  >
                    {mapping.isEditing ? "Save" : "Edit"}
                  </button>
                  <button
                    className="legacy-schema-mapping-action is-danger"
                    onClick={() => setSchemaMappings((prev) => prev.filter((m) => m.id !== mapping.id))}
                    type="button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function WebsiteWorkspace({
  activeStoreId,
  activityEntries,
  activeUserEmail,
  activeUserName,
  entries,
  fallbackStatusLine,
  sandboxContext,
  isSandboxSession,
  isFilteredByOperator,
  onAddTaskNote,
  onAssignTask,
  onRunTool,
  onSelectRow,
  onUpdateStatus,
  onViewChange,
  operators,
  rows,
  selectedRow,
  selectedRowId,
  updatingTaskId,
  view
}: WebsiteWorkspaceProps) {
  const [queueActionFilter, setQueueActionFilter] = useState("All");
  const [queueStatusFilter, setQueueStatusFilter] = useState("All");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [handoffSelections, setHandoffSelections] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [connectionType, setConnectionType] = useState<WebsiteConnectionType>("website");
  const [environment, setEnvironment] = useState<WebsiteIntegrationEnvironment>("sandbox");
  const [authMode, setAuthMode] = useState<WebsiteAuthMode>("API Key");
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<WebsiteSidebarPanel>("overview");
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(true);
  const [activeMappingLaneId, setActiveMappingLaneId] = useState<WebsiteMappingLaneId>("inventory");
  const [mappingSurfaceSelections, setMappingSurfaceSelections] = useState<Record<WebsiteMappingLaneId, string>>({
    inventory: websiteMappingLanes[0].defaultSurface,
    pricing: websiteMappingLanes[1].defaultSurface,
    media: websiteMappingLanes[2].defaultSurface,
    leads: websiteMappingLanes[3].defaultSurface
  });
  const [mappingSyncSelections, setMappingSyncSelections] = useState<Record<WebsiteMappingLaneId, string>>({
    inventory: websiteMappingLanes[0].defaultSyncMode,
    pricing: websiteMappingLanes[1].defaultSyncMode,
    media: websiteMappingLanes[2].defaultSyncMode,
    leads: websiteMappingLanes[3].defaultSyncMode
  });
  const [mappingValidationSelections, setMappingValidationSelections] = useState<Record<WebsiteMappingLaneId, string>>({
    inventory: websiteMappingLanes[0].defaultValidation,
    pricing: websiteMappingLanes[1].defaultValidation,
    media: websiteMappingLanes[2].defaultValidation,
    leads: websiteMappingLanes[3].defaultValidation
  });
  const [websitePreviewState, setWebsitePreviewState] = useState<"idle" | "loading" | "ready" | "blocked">("idle");
  const [showSandboxDeploymentWorkbench, setShowSandboxDeploymentWorkbench] = useState(() => isSandboxSession && readSandboxShellPendingSurfaceMode() === "deploy");
  const [connectorUrl, setConnectorUrl] = useState("");
  const [validationNotice, setValidationNotice] = useState("Connection settings are ready for validation.");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{ ok: boolean; latencyMs: number; message: string } | null>(null);
  const suggestedConnectorUrl = selectedRow ? buildWebsiteConnectorUrl(selectedRow) : "";
  const previousSuggestedConnectorUrlRef = useRef("");
  const totalInventory = rows.reduce((sum, feed) => sum + feed.inventoryCount, 0);
  const totalLeads = rows.reduce((sum, feed) => sum + feed.leadsToday, 0);
  const publishingCount = rows.filter((feed) => feed.status === "Publishing").length;
  const readyCount = rows.filter((feed) => feed.status === "Ready").length;
  const reviewCount = Math.max(0, rows.length - publishingCount - readyCount);
  const selectedLeadShare = selectedRow && totalLeads > 0 ? Math.round((selectedRow.leadsToday / totalLeads) * 100) : 0;
  const selectedInventoryShare = selectedRow && totalInventory > 0 ? Math.round((selectedRow.inventoryCount / totalInventory) * 100) : 0;
  const connectorReadinessScore = rows.length > 0 ? Math.round(((publishingCount + readyCount) / rows.length) * 100) : 0;
  const endpointLabel = rows.length === 1 ? "endpoint" : "endpoints";
  const queueActionOptions = buildFilterOptions(entries.map((entry) => entry.action));
  const queueStatusOptions = buildFilterOptions(entries.map((entry) => entry.status));
  const historyEntries = activityEntries.filter(isWebsiteHistoryEntry);
  const historyTypeOptions = buildFilterOptions(historyEntries.map((entry) => entry.label));
  const filteredQueueEntries = entries.filter(
    (entry) => matchesWorkspaceFilter(entry.action, queueActionFilter) && matchesWorkspaceFilter(entry.status, queueStatusFilter)
  );
  const filteredHistoryEntries = historyEntries.filter((entry) => matchesWorkspaceFilter(entry.label, historyFilter));
  const overdueQueueCount = filteredQueueEntries.filter((entry) => entry.isOverdue && entry.status !== "Done").length;
  const normalizedConnectorUrl = normalizeWebsiteBaseUrl(connectorUrl || suggestedConnectorUrl);
  const selectedConnectionOption = websiteConnectionOptions.find((option) => option.id === connectionType) ?? websiteConnectionOptions[0];
  const authModeOptions = getWebsiteAuthModes(connectionType);
  const integrationEndpoints = buildWebsiteIntegrationEndpoints(normalizedConnectorUrl, connectionType, environment);
  const contractRows = buildWebsiteContractRows(connectionType);
  const heroSummaryCards = [
    {
      detail: `${publishingCount} publishing, ${readyCount} ready, ${reviewCount} waiting on setup.`,
      label: "Configured Destinations",
      value: `${rows.length}`
    },
    {
      detail: "Inventory, pricing, media, and availability records staged for external systems.",
      label: "DMS Objects",
      value: `${totalInventory}`
    },
    {
      detail: "Submitted leads accepted back into the operator workflow today.",
      label: "Lead Return Path",
      value: `${totalLeads}`
    },
    {
      detail: `${rows.length} ${endpointLabel} have a ready or active integration state.`,
      label: "Transport Readiness",
      value: `${connectorReadinessScore}%`
    }
  ];
  const heroStages = buildWebsiteConnectorStages(rows, totalInventory, totalLeads);
  const activePreviewUrl = selectedRow ? buildWebsiteConnectorUrl(selectedRow) : normalizedConnectorUrl || getWebsiteDefaultBaseUrl(connectionType);
  const previewHostLabel = formatWebsitePreviewHost(activePreviewUrl);
  const previewHighlights = buildWebsitePreviewHighlights(selectedRow, selectedInventoryShare, selectedLeadShare);
  const activeMappingLane = websiteMappingLanes.find((lane) => lane.id === activeMappingLaneId) ?? websiteMappingLanes[0];
  const blockedPreviewSnapshotUrl = buildWebsitePreviewSnapshotUrl(activePreviewUrl);
  const routeHostLabel = formatWebsitePreviewHost(normalizedConnectorUrl || getWebsiteDefaultBaseUrl(connectionType));
  const sidebarLeadRows = [...rows].sort((left, right) => right.leadsToday - left.leadsToday).slice(0, 4);
  const sidebarPanelTabs: Array<{ id: WebsiteSidebarPanel; label: string; meta: string }> = [
    {
      id: "overview",
      label: "Snapshot",
      meta: selectedRow ? selectedRow.brand : "Pick a website"
    },
    {
      id: "mapping",
      label: "Data Setup",
      meta: `${activeMappingLane.fields.length} links`
    },
    {
      id: "queue",
      label: "Tasks",
      meta: `${filteredQueueEntries.length} visible`
    },
    {
      id: "history",
      label: "Activity",
      meta: `${filteredHistoryEntries.length} events`
    }
  ];
  const activeSidebarTab = sidebarPanelTabs.find((tab) => tab.id === activeSidebarPanel) ?? sidebarPanelTabs[0];

  async function handleTestConnection() {
    setIsTestingConnection(true);
    setTestConnectionResult(null);
    setValidationNotice(`Testing ${selectedConnectionOption.label} ${environment} connection…`);

    const targetUrl = normalizedConnectorUrl || getWebsiteDefaultBaseUrl(connectionType);
    const latencyMs = 600 + Math.floor(Math.random() * 900);

    await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));

    const hasUrl = targetUrl.trim().length > 0;
    const ok = hasUrl && environment === "sandbox" ? Math.random() > 0.15 : hasUrl && Math.random() > 0.25;
    const message = ok
      ? `${selectedConnectionOption.label} ${environment} endpoint reachable at ${targetUrl}. Auth: ${authMode}.`
      : `Could not reach ${targetUrl}. Check the Base URL and credentials, then retry.`;

    setTestConnectionResult({ ok, latencyMs, message });
    setValidationNotice(message);
    setIsTestingConnection(false);
  }

  useEffect(() => {
    setConnectorUrl((current) => {
      const shouldReplace = current.trim().length === 0 || current === previousSuggestedConnectorUrlRef.current;
      previousSuggestedConnectorUrlRef.current = suggestedConnectorUrl;

      return shouldReplace ? suggestedConnectorUrl : current;
    });
  }, [suggestedConnectorUrl]);

  useEffect(() => {
    const supportedAuthModes = getWebsiteAuthModes(connectionType);

    if (!supportedAuthModes.includes(authMode)) {
      setAuthMode(supportedAuthModes[0]);
    }
  }, [authMode, connectionType]);

  useEffect(() => {
    if (!selectedRow) {
      setWebsitePreviewState("idle");
      return;
    }

    setWebsitePreviewState("loading");
    const timeoutId = window.setTimeout(() => {
      setWebsitePreviewState((current) => (current === "loading" ? "blocked" : current));
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [activePreviewUrl, selectedRow]);

  useEffect(() => {
    if (!isSandboxSession) {
      setShowSandboxDeploymentWorkbench(false);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const handleSandboxShellAction = (event: Event) => {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail === "deploy") {
        setShowSandboxDeploymentWorkbench(true);
      }
    };

    window.addEventListener(SANDBOX_SHELL_ACTION_EVENT, handleSandboxShellAction as EventListener);
    return () => window.removeEventListener(SANDBOX_SHELL_ACTION_EVENT, handleSandboxShellAction as EventListener);
  }, [isSandboxSession]);

  useEffect(() => {
    if (!isSandboxSession || view !== "feed") {
      return;
    }

    if (readSandboxShellPendingSurfaceMode() === "deploy") {
      setShowSandboxDeploymentWorkbench(true);
    }
  }, [isSandboxSession, view]);

  if (view === "customSettings") {
    return (
      <SyncMonitorCustomSettingsPage
        connectorReadinessScore={connectorReadinessScore}
        onRunTool={onRunTool}
        onViewChange={onViewChange}
        rows={rows}
        totalInventory={totalInventory}
        totalLeads={totalLeads}
      />
    );
  }

  if (view === "sandbox") {
    return <SandboxesPage activeUserEmail={activeUserEmail} activeUserName={activeUserName} onViewChange={onViewChange} storeId={activeStoreId} />;
  }

  if (isSandboxSession && view === "feed" && showSandboxDeploymentWorkbench) {
    return (
      <section aria-label="Sandbox deployment workbench" className="sandbox-shell-studio-shell">
        <div className="sandbox-shell-studio-main">
          <div className="sandbox-shell-mode-frame">
            <div className="sandbox-shell-mode-banner">
              <div>
                <span className="sandbox-shell-mode-eyebrow">Sandbox Deployment</span>
                <strong>Push to Production</strong>
                <p>Review deployment records, comparisons, and checks, then return to the current workspace page when you are done.</p>
              </div>
              <button className="sandbox-new-button" onClick={() => setShowSandboxDeploymentWorkbench(false)} type="button">
                Return to Page
              </button>
            </div>
            <SandboxDeploymentWorkbench activeStoreId={activeStoreId} activeUserName={activeUserName} sandboxContext={sandboxContext} startOpen={true} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="website-feed-page">
      <section className={`legacy-info-card website-feed-hero${isHeroCollapsed ? " is-collapsed" : ""}`}>
        <div className="website-feed-hero-copy">
          <span className="legacy-command-meta">Premier Marine Cloud DMS / Integration Layer</span>
          <h3>Website Feed Integration Console</h3>
          {isHeroCollapsed ? (
            <div className="website-feed-hero-collapsed-meta">
              <span className="legacy-chip tone-stable">{rows.length} sites</span>
              <span className="legacy-chip tone-stable">{totalInventory} objects</span>
              <span className="legacy-chip tone-neutral">{totalLeads} leads</span>
              <span className="legacy-chip tone-neutral">{connectorReadinessScore}% ready</span>
              {selectedRow ? <span className="legacy-chip tone-neutral">{selectedRow.brand}</span> : null}
            </div>
          ) : (
            <>
              <p>Connect your website, API, webhook receiver, or file transport to publish DMS inventory and route leads back into Premier Marine Cloud.</p>
              <div className="legacy-chip-row">
                <span className="legacy-chip tone-stable">Website CMS</span>
                <span className="legacy-chip tone-stable">REST API</span>
                <span className="legacy-chip tone-neutral">Webhook</span>
                <span className="legacy-chip tone-neutral">File / SFTP</span>
              </div>
            </>
          )}
        </div>

        <div className="website-feed-hero-actions">
          <button
            aria-expanded={!isHeroCollapsed}
            className="legacy-desktop-board-button is-secondary"
            onClick={() => setIsHeroCollapsed((current) => !current)}
            type="button"
          >
            {isHeroCollapsed ? "Expand Summary" : "Collapse Summary"}
          </button>
          <button className="legacy-desktop-board-button" onClick={() => onRunTool("Publish Feed")} type="button">
            Publish Feed
          </button>
          <button className="legacy-desktop-board-button is-secondary" onClick={() => onRunTool("Lead Sync")} type="button">
            Lead Sync
          </button>
          <button className="legacy-desktop-board-button is-secondary" onClick={() => onRunTool("Open Queue")} type="button">
            Open Queue
          </button>
        </div>

        {!isHeroCollapsed ? (
          <>
            <div className="website-feed-summary-strip">
              {heroSummaryCards.map((card) => (
                <article className="website-feed-summary-card" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.detail}</p>
                </article>
              ))}
            </div>

            <div className="website-feed-stage-strip">
              {heroStages.map((stage, index) => (
                <article className={`website-feed-stage-pill tone-${stage.tone}`} key={stage.label}>
                  <span className="website-feed-stage-pill-index">{index + 1}</span>
                  <div>
                    <strong>{stage.label}</strong>
                    <p>{stage.detail}</p>
                  </div>
                  <span className={`legacy-chip tone-${stage.tone}`}>{stage.status}</span>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className="website-feed-workspace">
        <aside className="website-feed-sidebar">
          <section className="legacy-info-card website-feed-setup website-feed-sidebar-card">
            <div className="legacy-command-log-header">
              <div>
                <h3>Connection Setup</h3>
                <span>Step 1: set up how this website connects before anything goes live</span>
              </div>
              <span className="legacy-chip tone-stable">{authMode}</span>
            </div>

            <div className="website-feed-sidebar-step-strip">
              <article className="website-feed-sidebar-step is-active">
                <span>Step 1</span>
                <strong>Pick connection type</strong>
                <p>{selectedConnectionOption.label} in {environment === "production" ? "Production" : "Sandbox"}</p>
              </article>
              <article className={`website-feed-sidebar-step${testConnectionResult?.ok ? " is-complete" : ""}`}>
                <span>Step 2</span>
                <strong>Test access</strong>
                <p>{testConnectionResult?.ok ? "Connection passed validation." : "Confirm the host and auth mode."}</p>
              </article>
              <article className={`website-feed-sidebar-step${selectedRow ? " is-complete" : ""}`}>
                <span>Step 3</span>
                <strong>Choose website</strong>
                <p>{selectedRow ? `${selectedRow.brand} is ready for review.` : "Pick a destination below to continue."}</p>
              </article>
            </div>

            <div className="website-feed-setup-grid website-feed-setup-grid--compact">
              <div className="website-feed-control-panel">
                <span className="website-feed-control-label">Connection Type</span>
                <div className="website-feed-segmented" role="group" aria-label="Website feed connector type">
                  {websiteConnectionOptions.map((option) => (
                    <button
                      className={option.id === connectionType ? "is-selected" : ""}
                      key={option.id}
                      onClick={() => {
                        setConnectionType(option.id);
                        setTestConnectionResult(null);
                        setValidationNotice(`${option.label} connector selected. Validate the endpoint when settings are ready.`);
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <article className="website-feed-selected-connector">
                  <strong>{selectedConnectionOption.label}</strong>
                  <p>{selectedConnectionOption.detail}</p>
                </article>

                <span className="website-feed-control-label">Where You Are Working</span>
                <div className="website-feed-segmented is-compact" role="group" aria-label="Website feed environment">
                  {(["sandbox", "production"] as WebsiteIntegrationEnvironment[]).map((option) => (
                    <button
                      className={option === environment ? "is-selected" : ""}
                      key={option}
                      onClick={() => {
                        setEnvironment(option);
                        setTestConnectionResult(null);
                        setValidationNotice(`${option === "production" ? "Production" : "Sandbox"} environment selected for validation.`);
                      }}
                      type="button"
                    >
                      {option === "production" ? "Production" : "Sandbox"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="website-feed-control-panel website-feed-control-panel-emphasis">
                <label className="website-feed-field">
                  <span>Website Address</span>
                  <input
                    onChange={(event) => {
                      setConnectorUrl(event.target.value);
                      setTestConnectionResult(null);
                    }}
                    placeholder="https://www.yourwebsite.com"
                    value={connectorUrl}
                  />
                </label>
                <label className="website-feed-field">
                  <span>Login Method</span>
                  <select onChange={(event) => setAuthMode(event.target.value as WebsiteAuthMode)} value={authMode}>
                    {authModeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="website-feed-notice">
                  <strong>{environment === "production" ? "Production" : "Sandbox"} connector</strong>
                  {testConnectionResult ? (
                    <div className={`website-feed-test-result tone-${testConnectionResult.ok ? "stable" : "alert"}`}>
                      <span className={`legacy-chip tone-${testConnectionResult.ok ? "stable" : "alert"}`}>
                        {testConnectionResult.ok ? "Connected" : "Failed"}
                      </span>
                      <p>{testConnectionResult.message}</p>
                      <span className="website-feed-test-latency">{testConnectionResult.latencyMs}ms</span>
                    </div>
                  ) : (
                    <p>{validationNotice}</p>
                  )}
                </div>
                <div className="website-feed-action-row">
                  <button
                    className={`legacy-task-status-button${isTestingConnection ? " is-loading" : ""}`}
                    disabled={isTestingConnection}
                    onClick={() => void handleTestConnection()}
                    type="button"
                  >
                    {isTestingConnection ? "Testing..." : "Test Connection"}
                  </button>
                  <button
                    className="legacy-task-status-button"
                    onClick={() => {
                      const credentialMode = authModeOptions.includes("API Key") ? "API Key" : authModeOptions[0];
                      setAuthMode(credentialMode);
                      setValidationNotice(`${credentialMode} credential staged for ${selectedConnectionOption.label}.`);
                    }}
                    type="button"
                  >
                    Add Login
                  </button>
                  <button className="legacy-task-status-button" onClick={() => onRunTool("Open Queue")} type="button">
                    Open Setup Queue
                  </button>
                </div>
              </div>

              <div className="website-feed-control-panel website-feed-connection-plan">
                <div className="website-feed-panel-heading">
                  <div className="website-feed-panel-copy">
                    <span className="website-feed-control-label">What This Connection Sends</span>
                    <p>{integrationEndpoints.length} auto-generated routes will publish through {routeHostLabel}.</p>
                  </div>
                  <span>{integrationEndpoints.length} routes</span>
                </div>
                <div className="website-feed-generated-list is-compact">
                  {integrationEndpoints.map((endpoint) => (
                    <article className="website-feed-generated-endpoint is-compact" key={`${endpoint.method}-${endpoint.label}`}>
                      <div className="website-feed-generated-endpoint-header">
                        <span>{endpoint.method}</span>
                        <strong>{endpoint.label}</strong>
                      </div>
                      <p>{endpoint.detail}</p>
                      <code>{formatWebsiteEndpointPath(endpoint.url)}</code>
                    </article>
                  ))}
                </div>
                <div className="website-feed-contract-summary">
                  {contractRows.map((contractRow) => (
                    <article className="website-feed-contract-summary-item" key={contractRow.route}>
                      <strong>{contractRow.route}</strong>
                      <span>{contractRow.method}</span>
                      <p>{contractRow.detail}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="legacy-info-card website-feed-endpoints website-feed-sidebar-card">
            <div className="legacy-command-log-header">
              <div>
                <h3>Choose Website</h3>
                <span>{selectedRow ? `${selectedRow.brand} selected` : "Step 2: choose which website your team is working on"}</span>
              </div>
              <span>{publishingCount} live push</span>
            </div>

            {rows.length === 0 ? (
              <p>No website endpoints are configured for this store.</p>
            ) : (
              <div className="website-feed-endpoint-list">
                {rows.map((feed) => {
                  const inventoryShare = totalInventory > 0 ? Math.round((feed.inventoryCount / totalInventory) * 100) : 0;
                  const leadShare = totalLeads > 0 ? Math.round((feed.leadsToday / totalLeads) * 100) : 0;

                  return (
                    <button
                      className={`website-feed-endpoint${feed.id === selectedRowId ? " is-selected" : ""}`}
                      key={feed.id}
                      onClick={() => {
                        onSelectRow(feed);
                        setActiveSidebarPanel("overview");
                      }}
                      type="button"
                    >
                      <div className="website-feed-endpoint-header">
                        <div>
                          <strong>{feed.brand}</strong>
                          <span>{feed.domain}</span>
                        </div>
                        <span className={`legacy-chip tone-${feed.status.toLowerCase()}`}>{feed.status}</span>
                      </div>
                      <div className="website-feed-endpoint-meter">
                        <span style={{ width: `${Math.max(8, inventoryShare)}%` }} />
                      </div>
                      <div className="website-feed-endpoint-meta">
                        <span>{feed.inventoryCount} units</span>
                        <span>{feed.leadsToday} leads</span>
                        <span>{leadShare}% lead share</span>
                      </div>
                      <p>{buildWebsiteSyncGuidance(feed)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="legacy-info-card website-feed-sidebar-workspace website-feed-sidebar-card">
            <div className="legacy-command-log-header">
              <div>
                <h3>Website Details</h3>
                <span>One place for status, data setup, tasks, and recent activity</span>
              </div>
              <span>{activeSidebarTab.label}</span>
            </div>

            <div className="website-feed-sidebar-tabs" role="tablist" aria-label="Website sidebar workspace views">
              {sidebarPanelTabs.map((tab) => (
                <button
                  aria-selected={tab.id === activeSidebarPanel}
                  className={tab.id === activeSidebarPanel ? "is-selected" : ""}
                  key={tab.id}
                  onClick={() => setActiveSidebarPanel(tab.id)}
                  role="tab"
                  type="button"
                >
                  <strong>{tab.label}</strong>
                  <span>{tab.meta}</span>
                </button>
              ))}
            </div>

            {activeSidebarPanel === "overview" ? (
              <div className="website-feed-sidebar-panel-stack" role="tabpanel">
                <div className="website-feed-sidebar-monitor-card">
                  <div className="website-feed-panel-heading">
                    <strong>Selected Website</strong>
                    <span>{selectedRow?.brand ?? "No endpoint selected"}</span>
                  </div>

                  {!selectedRow ? (
                    <p>Select a website endpoint to inspect connector posture.</p>
                  ) : (
                    <>
                      <div className="website-feed-profile-grid website-feed-sidebar-profile-grid">
                        <LabelValue label="Website" value={selectedRow.domain} />
                        <LabelValue label="DMS Source" value="Premier Marine Cloud" />
                        <LabelValue label="Inventory Share" value={`${selectedInventoryShare}%`} />
                        <LabelValue label="Lead Share" value={`${selectedLeadShare}%`} />
                        <LabelValue label="Last Sync" value={selectedRow.lastSyncLabel} />
                        <LabelValue label="Endpoint" value={formatWebsiteFeedEndpoint(selectedRow)} />
                      </div>
                      <div className="legacy-chip-row">
                        <span className={`legacy-chip tone-${buildWebsiteLeadTone(selectedRow.leadsToday)}`}>{buildWebsiteLeadLabel(selectedRow.leadsToday)}</span>
                        <span className={`legacy-chip tone-${buildWebsiteConnectionTone(selectedRow)}`}>{buildWebsiteConnectionLabel(selectedRow)}</span>
                        <span className="legacy-chip tone-neutral">
                          {selectedRow.inventoryCount >= 100 ? "Full catalog" : "Featured catalog"}
                        </span>
                      </div>
                      <p>{buildWebsitePublishGuidance(selectedRow)}</p>
                    </>
                  )}
                </div>

                <div className="legacy-feed-health-strip website-feed-sidebar-health-strip">
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

                <div className="website-feed-sidebar-monitor-card">
                  <div className="website-feed-panel-heading">
                    <strong>Lead Activity</strong>
                    <span>What is coming back from the website today</span>
                  </div>
                  <p>{fallbackStatusLine}</p>
                  <div className="legacy-activity-stack">
                    {sidebarLeadRows.map((feed) => {
                      const leadShare = totalLeads > 0 ? Math.round((feed.leadsToday / totalLeads) * 100) : 0;

                      return (
                        <article className={`legacy-activity-line tone-${buildWebsiteLeadTone(feed.leadsToday)}`} key={`${feed.id}-lead`}>
                          <strong>{feed.brand}</strong>
                          <p>
                            {feed.leadsToday} leads today · {leadShare}% of store web leads · {feed.lastSyncLabel}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {activeSidebarPanel === "mapping" ? (
              <div className="website-feed-sidebar-panel-stack" role="tabpanel">
                <div className="website-feed-panel-heading">
                  <strong>What Data Goes Where</strong>
                  <span>Review how website fields line up with your DMS data</span>
                </div>

                {!selectedRow ? (
                  <p>Select a website endpoint to open the live field mapping board.</p>
                ) : (
                  <div className="website-feed-mapper-shell">
                    <div className="website-feed-mapper-lane-tabs" role="tablist" aria-label="Website field mapping lanes">
                      {websiteMappingLanes.map((lane) => (
                        <button
                          aria-selected={lane.id === activeMappingLaneId}
                          className={lane.id === activeMappingLaneId ? "is-selected" : ""}
                          key={lane.id}
                          onClick={() => setActiveMappingLaneId(lane.id)}
                          role="tab"
                          type="button"
                        >
                          <div className="website-feed-mapper-tab-meta">
                            <span className={`legacy-chip tone-${lane.tone}`}>{lane.status}</span>
                            <span>{lane.fields.length} links</span>
                          </div>
                          <strong>{lane.label}</strong>
                          <span className="website-feed-mapper-tab-audience">{lane.audienceLabel}</span>
                        </button>
                      ))}
                    </div>

                    <div className="website-feed-mapper-panel" role="tabpanel">
                      <div className="website-feed-mapper-toolbar">
                        <div>
                          <span className="website-feed-control-label">Active lane</span>
                          <h4>{activeMappingLane.label}</h4>
                          <p>{activeMappingLane.detail}</p>
                        </div>
                        <div className="website-feed-mapper-context-strip">
                          <span className={`legacy-chip tone-${activeMappingLane.tone}`}>{activeMappingLane.status}</span>
                          <span className="legacy-chip tone-neutral">Premier Marine Cloud to {selectedRow.brand}</span>
                          <span className="legacy-chip tone-neutral">{selectedRow.brand}</span>
                        </div>
                      </div>

                      <div className="website-feed-mapper-toolbar-fields">
                        <label className="website-feed-field">
                          <span>Website Surface</span>
                          <select
                            onChange={(event) =>
                              setMappingSurfaceSelections((current) => ({
                                ...current,
                                [activeMappingLane.id]: event.target.value
                              }))
                            }
                            value={mappingSurfaceSelections[activeMappingLane.id]}
                          >
                            {websiteMappingSurfaceOptions[activeMappingLane.id].map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="website-feed-field">
                          <span>Sync Mode</span>
                          <select
                            onChange={(event) =>
                              setMappingSyncSelections((current) => ({
                                ...current,
                                [activeMappingLane.id]: event.target.value
                              }))
                            }
                            value={mappingSyncSelections[activeMappingLane.id]}
                          >
                            {websiteMappingSyncOptions[activeMappingLane.id].map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="website-feed-field">
                          <span>Approval Guardrail</span>
                          <select
                            onChange={(event) =>
                              setMappingValidationSelections((current) => ({
                                ...current,
                                [activeMappingLane.id]: event.target.value
                              }))
                            }
                            value={mappingValidationSelections[activeMappingLane.id]}
                          >
                            {websiteMappingValidationOptions[activeMappingLane.id].map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="website-feed-mapper-meta-bar">
                        <span>DMS source: Premier Marine Cloud</span>
                        <span>Website destination: {selectedRow.domain}</span>
                        <span>Sync: {mappingSyncSelections[activeMappingLane.id]}</span>
                        <span>Approval: {mappingValidationSelections[activeMappingLane.id]}</span>
                      </div>

                      <div className="website-feed-mapper-table-wrap">
                        <table className="website-feed-mapper-table">
                          <thead>
                            <tr>
                              <th>DMS Field</th>
                              <th>Website Field</th>
                              <th>Surface</th>
                              <th>Sync</th>
                              <th>Approval</th>
                              <th>Manager Guidance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeMappingLane.fields.map((field) => (
                              <tr key={`${activeMappingLane.id}-${field.source}-${field.destination}`}>
                                <td>
                                  <strong>{field.source}</strong>
                                  <span>Premier Marine Cloud</span>
                                </td>
                                <td>
                                  <strong>{field.destination}</strong>
                                  <span>{selectedRow.brand}</span>
                                </td>
                                <td>{mappingSurfaceSelections[activeMappingLane.id]}</td>
                                <td>{mappingSyncSelections[activeMappingLane.id]}</td>
                                <td>{mappingValidationSelections[activeMappingLane.id]}</td>
                                <td>{field.guidance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {activeSidebarPanel === "queue" ? (
              <div className="website-feed-sidebar-panel-stack" role="tabpanel">
                <div className="website-feed-panel-heading">
                  <div>
                    <strong>Work Queue</strong>
                    <p>{filteredQueueEntries.length} task{filteredQueueEntries.length === 1 ? "" : "s"} visible</p>
                  </div>
                  <span>{overdueQueueCount} overdue</span>
                </div>

                <div className="legacy-website-filter-row">
                  <label className="legacy-audit-filter-control">
                    <span>Task Type</span>
                    <select onChange={(event) => setQueueActionFilter(event.target.value)} value={queueActionFilter}>
                      {queueActionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="legacy-audit-filter-control">
                    <span>Task Status</span>
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
                            Owner {entry.assignedName} · Updated by {entry.lastUpdatedByName} · {entry.timeLabel}
                          </span>
                          <span className={`legacy-command-meta${entry.isOverdue ? " is-overdue" : ""}`}>
                            Age {entry.ageLabel} · SLA {entry.slaLabel} · {entry.breachLabel}
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
                                    {note.authorName} · {note.timeLabel}
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
                                  {operator.name} · {operator.title}
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
              </div>
            ) : null}

            {activeSidebarPanel === "history" ? (
              <div className="website-feed-sidebar-panel-stack" role="tabpanel">
                <div className="website-feed-panel-heading">
                  <div>
                    <strong>Recent Activity</strong>
                    <p>{filteredHistoryEntries.length} event{filteredHistoryEntries.length === 1 ? "" : "s"}</p>
                  </div>
                </div>

                <div className="legacy-website-filter-row">
                  <label className="legacy-audit-filter-control">
                    <span>Activity Type</span>
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
              </div>
            ) : null}
          </section>
        </aside>

        <div className="website-feed-main">
          <section className="legacy-info-card website-feed-preview-panel">
            <div className="website-feed-preview-header">
              <div>
                <span className="legacy-command-meta">Website backend workspace</span>
                <h3>{selectedRow?.brand ?? "Select a connected website"}</h3>
                <p>
                  {selectedRow
                    ? `Review ${selectedRow.brand} inside a protected operations shell before publishing inventory, pricing, media, or lead-routing changes.`
                    : "Choose a connected website from the left rail to open its safe editing view and website operations details."}
                </p>
              </div>

              <div className="website-feed-preview-actions">
                <button className="legacy-desktop-board-button" onClick={() => onRunTool("Publish Feed")} type="button">
                  Publish Feed
                </button>
                <button className="legacy-desktop-board-button is-secondary" onClick={() => onRunTool("Lead Sync")} type="button">
                  Lead Sync
                </button>
                {selectedRow ? (
                  <a className="legacy-desktop-board-button is-secondary" href={activePreviewUrl} rel="noreferrer" target="_blank">
                    Open Live Site
                  </a>
                ) : null}
              </div>
            </div>

            {!selectedRow ? (
              <div className="website-feed-empty-preview">
                <strong>No website selected</strong>
                <p>Use the connected websites list on the left to load a site into this backend workspace.</p>
              </div>
            ) : (
              <>
                <div className="website-feed-preview-toolbar">
                  <div className="website-feed-browser-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="website-feed-preview-address">{previewHostLabel}</div>
                  <span className={`legacy-chip tone-${buildWebsiteConnectionTone(selectedRow)}`}>{buildWebsiteConnectionLabel(selectedRow)}</span>
                </div>

                <div className="website-feed-browser-frame">
                  {websitePreviewState === "blocked" ? (
                    <div className="website-feed-browser-snapshot-shell">
                      <img
                        alt={`${selectedRow.brand} website snapshot`}
                        className="website-feed-browser-snapshot-image"
                        loading="lazy"
                        src={blockedPreviewSnapshotUrl}
                      />
                      <div className="website-feed-browser-snapshot-bar">
                        <div>
                          <strong>Showing synced website snapshot</strong>
                          <p>{selectedRow.brand} blocks embedded live rendering, so this panel is showing a current visual website snapshot instead.</p>
                        </div>
                        <div className="website-feed-browser-snapshot-chips">
                          <span className="legacy-chip tone-neutral">{previewHostLabel}</span>
                          <span className={`legacy-chip tone-${buildWebsiteConnectionTone(selectedRow)}`}>{buildWebsiteConnectionLabel(selectedRow)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <iframe
                        className="website-feed-browser-iframe"
                        loading="lazy"
                        onError={() => setWebsitePreviewState("blocked")}
                        onLoad={() => setWebsitePreviewState("ready")}
                        referrerPolicy="no-referrer"
                        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                        src={activePreviewUrl}
                        title={`${selectedRow.brand} website preview`}
                      />
                      {websitePreviewState === "loading" ? (
                        <div className="website-feed-browser-state-overlay">
                          <strong>Loading website preview...</strong>
                          <p>Connecting to {previewHostLabel} inside the protected preview frame.</p>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="website-feed-preview-footnote">
                  <span className="legacy-command-meta">
                    {websitePreviewState === "blocked"
                      ? "Embedded preview is unavailable for this site, so this panel has switched to a synced website snapshot."
                      : "If the website blocks embedded previews, use Open Live Site to verify changes in a separate tab."}
                  </span>
                </div>

                <div className="website-feed-preview-highlight-grid">
                  {previewHighlights.map((highlight) => (
                    <article className="website-feed-preview-highlight-card" key={highlight.label}>
                      <span>{highlight.label}</span>
                      <strong>{highlight.value}</strong>
                      <p>{highlight.detail}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
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

function buildWebsiteConnectionTone(feed: WebsiteWorkspaceRow) {
  if (feed.status === "Publishing") {
    return "accent";
  }

  if (feed.status === "Ready") {
    return "stable";
  }

  return "attention";
}

function buildWebsiteConnectionLabel(feed: WebsiteWorkspaceRow) {
  if (feed.status === "Publishing") {
    return "Push active";
  }

  if (feed.status === "Ready") {
    return "Connected";
  }

  return "Review needed";
}

function buildWebsitePreviewHighlights(feed: WebsiteWorkspaceRow | null, inventoryShare: number, leadShare: number) {
  if (!feed) {
    return [
      {
        detail: "Connect a CMS, API, webhook, or file transport to open a managed backend view here.",
        label: "Safe editing lane",
        value: "Awaiting site"
      },
      {
        detail: "Once a site is selected, its publish posture, lead routing, and catalog coverage will appear here.",
        label: "Website context",
        value: "No endpoint"
      },
      {
        detail: "Open the connection rail on the left to stage credentials and generated endpoints first.",
        label: "Next action",
        value: "Connect + select"
      }
    ];
  }

  return [
    {
      detail: `${inventoryShare}% of staged inventory currently routes to this website lane.`,
      label: "Catalog coverage",
      value: `${feed.inventoryCount} units`
    },
    {
      detail: `${leadShare}% of today's web leads are returning through this endpoint.`,
      label: "Lead return path",
      value: `${feed.leadsToday} leads`
    },
    {
      detail: buildWebsitePublishGuidance(feed),
      label: "Publish posture",
      value: feed.lastSyncLabel
    }
  ];
}

function formatWebsiteFeedEndpoint(feed: WebsiteWorkspaceRow) {
  const normalizedDomain = feed.domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return `${normalizedDomain}/inventory-feed`;
}

function formatWebsiteEndpointPath(value: string) {
  const normalizedValue = value.replace(/^(https?|sftp):\/\//i, "");
  const firstSlashIndex = normalizedValue.indexOf("/");

  return firstSlashIndex >= 0 ? normalizedValue.slice(firstSlashIndex) : normalizedValue;
}

function normalizeWebsiteBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (trimmed.length === 0) {
    return "";
  }

  return /^(https?|sftp):\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatWebsitePreviewHost(value: string) {
  return value.replace(/^(https?|sftp):\/\//i, "").replace(/\/$/, "") || "preview unavailable";
}

function buildWebsitePreviewSnapshotUrl(value: string) {
  const normalizedUrl = normalizeWebsiteBaseUrl(value);
  return `https://image.thum.io/get/width/1600/noanimate/${normalizedUrl}`;
}

function buildWebsiteConnectorUrl(feed: WebsiteWorkspaceRow) {
  return normalizeWebsiteBaseUrl(feed.domain);
}

function getWebsiteDefaultBaseUrl(connectionType: WebsiteConnectionType) {
  if (connectionType === "api") {
    return "https://api.yourwebsite.com";
  }

  if (connectionType === "file") {
    return "sftp://feeds.yourwebsite.com";
  }

  return "https://www.yourwebsite.com";
}

function getWebsiteAuthModes(connectionType: WebsiteConnectionType): WebsiteAuthMode[] {
  if (connectionType === "webhook") {
    return ["Signed Webhook", "API Key", "OAuth 2.0"];
  }

  if (connectionType === "file") {
    return ["Basic Auth", "API Key", "None"];
  }

  if (connectionType === "api") {
    return ["API Key", "OAuth 2.0", "Basic Auth"];
  }

  return ["API Key", "OAuth 2.0", "None"];
}

function buildWebsiteEndpointUrl(
  baseUrl: string,
  connectionType: WebsiteConnectionType,
  environment: WebsiteIntegrationEnvironment,
  path: string
) {
  if (connectionType === "file") {
    const fileBase = (baseUrl || getWebsiteDefaultBaseUrl(connectionType)).replace(/^https?:\/\//i, "sftp://").replace(/\/+$/, "");
    const folder = environment === "production" ? "/production" : "/sandbox";

    return `${fileBase}${folder}${path}`;
  }

  const cleanBaseUrl = normalizeWebsiteBaseUrl(baseUrl || getWebsiteDefaultBaseUrl(connectionType));
  const environmentPrefix = environment === "production" ? "" : "/sandbox";

  return `${cleanBaseUrl}${environmentPrefix}${path}`;
}

function buildWebsiteIntegrationEndpoints(
  baseUrl: string,
  connectionType: WebsiteConnectionType,
  environment: WebsiteIntegrationEnvironment
) {
  if (connectionType === "file") {
    return [
      {
        detail: "Scheduled catalog export for inventory, availability, and pricing rows.",
        label: "Inventory Export",
        method: "PUT",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/inventory.csv")
      },
      {
        detail: "Image manifest keyed to stock numbers and unit media assets.",
        label: "Media Manifest",
        method: "PUT",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/media.json")
      },
      {
        detail: "Lead import file watched by the DMS return-path worker.",
        label: "Lead Intake",
        method: "GET",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/leads.csv")
      }
    ];
  }

  if (connectionType === "webhook") {
    return [
      {
        detail: "Receives a publish notification when inventory changes are ready.",
        label: "Publish Event",
        method: "POST",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/webhooks/marine-cloud/publish")
      },
      {
        detail: "Accepts website forms, source tags, consent, and unit interest.",
        label: "Lead Intake",
        method: "POST",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/webhooks/marine-cloud/leads")
      },
      {
        detail: "Confirms external processing status back to Premier Marine Cloud.",
        label: "Status Callback",
        method: "POST",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/webhooks/marine-cloud/status")
      }
    ];
  }

  if (connectionType === "api") {
    return [
      {
        detail: "Read current inventory objects with pricing, availability, and merchandising fields.",
        label: "Inventory API",
        method: "GET",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/api/marine-cloud/inventory")
      },
      {
        detail: "Read media URLs, gallery order, video links, and alt text for published units.",
        label: "Media API",
        method: "GET",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/api/marine-cloud/media")
      },
      {
        detail: "Submit website leads back into DMS workflows with source attribution.",
        label: "Lead API",
        method: "POST",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/api/marine-cloud/leads")
      },
      {
        detail: "Send external publish, import, or transform status back to the DMS.",
        label: "Status API",
        method: "POST",
        url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/api/marine-cloud/status")
      }
    ];
  }

  return [
    {
      detail: "Public catalog payload for website inventory cards, detail pages, and search pages.",
      label: "Inventory Feed",
      method: "GET",
      url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/marine-cloud/feed/inventory.json")
    },
    {
      detail: "Media payload with ordered photos, videos, listing copy, and merchandising flags.",
      label: "Media Feed",
      method: "GET",
      url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/marine-cloud/feed/media.json")
    },
    {
      detail: "Lead form receiver for website, landing-page, and campaign submissions.",
      label: "Lead Receiver",
      method: "POST",
      url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/marine-cloud/leads")
    },
    {
      detail: "Website-side callback for publish success, transform warnings, and retry signals.",
      label: "Status Callback",
      method: "POST",
      url: buildWebsiteEndpointUrl(baseUrl, connectionType, environment, "/marine-cloud/status")
    }
  ];
}

function buildWebsiteContractRows(connectionType: WebsiteConnectionType) {
  const payloadType = connectionType === "file" ? "CSV" : "JSON";

  return [
    {
      detail: "One DMS unit with stock, VIN/HIN, make, model, class, status, and availability.",
      method: payloadType,
      route: "inventory.item",
      schema: "stockNumber, vin, make, model, year, status, availability"
    },
    {
      detail: "Retail price, sale price, incentives, rebates, and publish-window rules.",
      method: payloadType,
      route: "pricing",
      schema: "msrp, salePrice, incentiveName, incentiveExpiresAt"
    },
    {
      detail: "Primary photo, gallery order, video URLs, alt text, and listing copy.",
      method: payloadType,
      route: "media.assets",
      schema: "primaryPhotoUrl, galleryUrls, videoUrl, altText"
    },
    {
      detail: "Lead form source, campaign, unit interest, consent flags, and response owner.",
      method: payloadType,
      route: "lead.source",
      schema: "sourceUrl, campaign, stockNumber, consent, assignedTeam"
    }
  ];
}

function buildWebsiteConnectorStages(rows: WebsiteWorkspaceRow[], totalInventory: number, totalLeads: number) {
  const publishingCount = rows.filter((feed) => feed.status === "Publishing").length;
  const readyCount = rows.filter((feed) => feed.status === "Ready").length;

  return [
    {
      label: "DMS Inventory Source",
      detail: `${totalInventory} units staged from stock, pricing, availability, and merchandising fields.`,
      status: totalInventory > 0 ? "Streaming" : "Empty",
      tone: totalInventory > 0 ? "stable" : "neutral"
    },
    {
      label: "Website Destination Map",
      detail: `${rows.length} connected website endpoint${rows.length === 1 ? "" : "s"} with brand and domain routing.`,
      status: rows.length > 0 ? "Mapped" : "Not Started",
      tone: rows.length > 0 ? "stable" : "attention"
    },
    {
      label: "Publish Transport",
      detail: `${publishingCount} active publish window${publishingCount === 1 ? "" : "s"} and ${readyCount} ready endpoint${readyCount === 1 ? "" : "s"}.`,
      status: publishingCount > 0 ? "Publishing" : readyCount > 0 ? "Ready" : "Queued",
      tone: publishingCount > 0 ? "accent" : readyCount > 0 ? "stable" : "neutral"
    },
    {
      label: "Lead Return Path",
      detail: `${totalLeads} website lead${totalLeads === 1 ? "" : "s"} captured today for operator follow-up.`,
      status: totalLeads > 0 ? "Receiving" : "Quiet",
      tone: totalLeads > 0 ? "stable" : "neutral"
    }
  ];
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

function buildFilterOptions(values: string[], activeValue?: string) {
  const uniqueValueSet = new Set(values.filter(Boolean));

  if (activeValue && activeValue !== "All") {
    uniqueValueSet.add(activeValue);
  }

  const uniqueValues = [...uniqueValueSet].sort((left, right) => left.localeCompare(right));
  return ["All", ...uniqueValues];
}

function matchesWorkspaceFilter(rowValue: string, filterValue: string) {
  return filterValue === "All" || rowValue === filterValue;
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
