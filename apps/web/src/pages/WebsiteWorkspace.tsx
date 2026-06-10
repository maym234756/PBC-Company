import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
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
import { WebsiteFeedLeafPage } from "./WebsiteFeedLeafPage";
import type {
  ActivityLogEntry,
  SandboxSessionContext,
  TaskQueueEntry,
  WebsiteDashboardSummary,
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
  dashboardSummary: WebsiteDashboardSummary | null;
  entries: TaskQueueEntry[];
  fallbackStatusLine: string;
  sandboxContext: SandboxSessionContext | null;
  isSandboxSession: boolean;
  onRunTool: (tool: string) => void;
  onSelectRow: (row: WebsiteWorkspaceRow) => void;
  onViewChange: Dispatch<SetStateAction<WebsiteWorkspaceView>>;
  rows: WebsiteWorkspaceRow[];
  selectedRow: WebsiteWorkspaceRow | null;
  storeName: string;
  view: WebsiteWorkspaceView;
}

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
  dashboardSummary,
  entries,
  fallbackStatusLine,
  sandboxContext,
  isSandboxSession,
  onRunTool,
  onSelectRow,
  onViewChange,
  rows,
  selectedRow,
  storeName,
  view
}: WebsiteWorkspaceProps) {
  const [showSandboxDeploymentWorkbench, setShowSandboxDeploymentWorkbench] = useState(() => isSandboxSession && readSandboxShellPendingSurfaceMode() === "deploy");
  const totalInventory = rows.reduce((sum, feed) => sum + feed.inventoryCount, 0);
  const totalLeads = rows.reduce((sum, feed) => sum + feed.leadsToday, 0);
  const publishingCount = rows.filter((feed) => feed.status === "Publishing").length;
  const readyCount = rows.filter((feed) => feed.status === "Ready").length;
  const connectorReadinessScore = rows.length > 0 ? Math.round(((publishingCount + readyCount) / rows.length) * 100) : 0;
  const historyEntries = activityEntries.filter(isWebsiteHistoryEntry);

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
      <WebsiteFeedLeafPage
        activeUserName={activeUserName}
        entries={entries}
        fallbackStatusLine={fallbackStatusLine}
        historyEntries={historyEntries}
        onOpenEditor={() => onViewChange("editor")}
        onOpenCustomSettings={() => onViewChange("customSettings")}
        onOpenOverview={() => onViewChange("feed")}
        onOpenSandbox={() => onViewChange("sandbox")}
        onRunTool={onRunTool}
        onSelectRow={onSelectRow}
        rows={rows}
        selectedRow={selectedRow}
        storeName={storeName}
        summary={dashboardSummary}
        view={view === "editor" ? "editor" : "feed"}
      />
    </div>
  );
}

const websiteHistoryEntryLabels = new Set(["Publish Feed", "Lead Sync", "Open Queue", "Refresh completed"]);

function isWebsiteHistoryEntry(entry: CommandLogEntry) {
  return websiteHistoryEntryLabels.has(entry.label);
}
