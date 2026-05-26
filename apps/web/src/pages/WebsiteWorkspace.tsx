import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from "react";
import type {
  ActivityLogEntry,
  StoreOperatorOption,
  TaskNoteKind,
  TaskQueueEntry,
  TaskStatus,
  WebsiteWorkspaceRow,
  WebsiteWorkspaceView
} from "../types";

type CommandLogEntry = ActivityLogEntry;



interface WebsiteWorkspaceProps {
  activityEntries: CommandLogEntry[];
  entries: TaskQueueEntry[];
  fallbackStatusLine: string;
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
  activityEntries,
  entries,
  fallbackStatusLine,
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

  return (
    <div className="website-feed-page">
      <section className="legacy-info-card website-feed-hero">
        <div className="website-feed-hero-copy">
          <span className="legacy-command-meta">Premier Marine Cloud DMS / Integration Layer</span>
          <h3>Website Feed Integration Console</h3>
          <p>Connect your website, API, webhook receiver, or file transport to publish DMS inventory and route leads back into Premier Marine Cloud.</p>
          <div className="legacy-chip-row">
            <span className="legacy-chip tone-stable">Website CMS</span>
            <span className="legacy-chip tone-stable">REST API</span>
            <span className="legacy-chip tone-neutral">Webhook</span>
            <span className="legacy-chip tone-neutral">File / SFTP</span>
          </div>
        </div>

        <div className="website-feed-hero-actions">
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

        <div className="website-feed-health-grid">
          <article className="website-feed-health-card">
            <span>Configured Destinations</span>
            <strong>{rows.length}</strong>
            <p>{publishingCount} publishing, {readyCount} ready, {reviewCount} waiting on setup.</p>
          </article>
          <article className="website-feed-health-card">
            <span>DMS Objects</span>
            <strong>{totalInventory}</strong>
            <p>Inventory, pricing, media, and availability records staged for external systems.</p>
          </article>
          <article className="website-feed-health-card">
            <span>Lead Return Path</span>
            <strong>{totalLeads}</strong>
            <p>Submitted leads accepted back into the operator workflow today.</p>
          </article>
          <article className="website-feed-health-card">
            <span>Transport Readiness</span>
            <strong>{connectorReadinessScore}%</strong>
            <p>{rows.length} {endpointLabel} have a ready or active integration state.</p>
          </article>
        </div>
      </section>

      <section className="legacy-info-card website-feed-pipeline">
        {buildWebsiteConnectorStages(rows, totalInventory, totalLeads).map((stage, index) => (
          <article className={`website-feed-stage tone-${stage.tone}`} key={stage.label}>
            <span className="website-feed-stage-index">{index + 1}</span>
            <div>
              <strong>{stage.label}</strong>
              <p>{stage.detail}</p>
            </div>
            <span className={`legacy-chip tone-${stage.tone}`}>{stage.status}</span>
          </article>
        ))}
      </section>

      <section className="legacy-info-card website-feed-setup">
        <div className="legacy-command-log-header">
          <div>
            <h3>Connection Setup</h3>
            <span>
              {selectedConnectionOption.label} / {environment}
            </span>
          </div>
          <span className="legacy-chip tone-stable">{authMode}</span>
        </div>

        <div className="website-feed-setup-grid">
          <div className="website-feed-control-panel">
            <span className="website-feed-control-label">Connector Type</span>
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

            <span className="website-feed-control-label">Environment</span>
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

          <div className="website-feed-control-panel">
            <label className="website-feed-field">
              <span>Base URL / Host</span>
              <input
                onChange={(event) => { setConnectorUrl(event.target.value); setTestConnectionResult(null); }}
                placeholder="https://www.yourwebsite.com"
                value={connectorUrl}
              />
            </label>
            <label className="website-feed-field">
              <span>Authentication</span>
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
                {isTestingConnection ? "Testing…" : "Validate Connection"}
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
                Create Credential
              </button>
              <button className="legacy-task-status-button" onClick={() => onRunTool("Open Queue")} type="button">
                Queue Setup
              </button>
            </div>
          </div>

          <div className="website-feed-control-panel">
            <div className="website-feed-panel-heading">
              <span className="website-feed-control-label">Generated Endpoints</span>
              <span>{integrationEndpoints.length} routes</span>
            </div>
            <div className="website-feed-generated-list">
              {integrationEndpoints.map((endpoint) => (
                <article className="website-feed-generated-endpoint" key={`${endpoint.method}-${endpoint.label}`}>
                  <span>{endpoint.method}</span>
                  <strong>{endpoint.label}</strong>
                  <code>{endpoint.url}</code>
                  <p>{endpoint.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="website-feed-contract-list">
          {contractRows.map((contractRow) => (
            <article className="website-feed-contract-card" key={contractRow.route}>
              <span>{contractRow.method}</span>
              <strong>{contractRow.route}</strong>
              <p>{contractRow.detail}</p>
              <code>{contractRow.schema}</code>
            </article>
          ))}
        </div>
      </section>

      <div className="website-feed-grid">
        <section className="legacy-info-card website-feed-endpoints">
          <div className="legacy-command-log-header">
            <div>
              <h3>Configured Destinations</h3>
              <span>{rows.length} {endpointLabel}</span>
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
                    onClick={() => onSelectRow(feed)}
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

        <div className="website-feed-detail-stack">
          <section className="legacy-info-card website-feed-focus">
            <div className="legacy-command-log-header">
              <div>
                <h3>Destination Profile</h3>
                <span>{selectedRow?.brand ?? "No endpoint selected"}</span>
              </div>
              {selectedRow ? <span className={`legacy-chip tone-${selectedRow.status.toLowerCase()}`}>{selectedRow.status}</span> : null}
            </div>

            {!selectedRow ? (
              <p>Select a website endpoint to inspect connector posture.</p>
            ) : (
              <>
                <div className="website-feed-profile-grid">
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
          </section>

          <section className="legacy-info-card website-feed-mapping">
            <div className="legacy-command-log-header">
              <div>
                <h3>Field Mapping</h3>
                <span>Inventory, pricing, media, leads</span>
              </div>
            </div>

            <div className="website-feed-map-grid">
              {buildWebsiteMappingRows(selectedRow).map((mappingRow) => (
                <article className="website-feed-map-card" key={mappingRow.label}>
                  <span className={`legacy-chip tone-${mappingRow.tone}`}>{mappingRow.status}</span>
                  <strong>{mappingRow.label}</strong>
                  <p>{mappingRow.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="legacy-info-card website-feed-retired-panel">
        <div className="legacy-command-log-header">
          <div>
            <h3>Publishing Queue</h3>
            <span>{rows.length} feeds</span>
          </div>
          <span>{publishingCount} publishing · {readyCount} ready</span>
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
                    {feed.leadsToday} leads today · {feed.inventoryCount} units
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

      <div className="website-feed-ops-grid">
        <section className="legacy-info-card website-feed-retired-panel">
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

        <section className="legacy-info-card website-feed-retired-panel">
          <h3>Lead Sync Monitor</h3>
          <p>{fallbackStatusLine}</p>
          <div className="legacy-activity-stack">
            {rows.map((feed) => {
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
        </section>

        <section className="legacy-info-card website-feed-retired-panel">
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

function formatWebsiteFeedEndpoint(feed: WebsiteWorkspaceRow) {
  const normalizedDomain = feed.domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return `${normalizedDomain}/inventory-feed`;
}

function normalizeWebsiteBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (trimmed.length === 0) {
    return "";
  }

  return /^(https?|sftp):\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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

function buildWebsiteMappingRows(feed: WebsiteWorkspaceRow | null) {
  return [
    {
      label: "Inventory & Availability",
      detail: feed ? `${feed.inventoryCount} units from DMS stock are in this endpoint scope.` : "Awaiting endpoint selection.",
      status: feed ? "Mapped" : "Pending",
      tone: feed ? "stable" : "neutral"
    },
    {
      label: "Pricing & Promotions",
      detail: feed ? `${feed.brand} pricing payload follows the active publish window.` : "Pricing rules attach after a website endpoint is selected.",
      status: feed?.status === "Publishing" ? "Publishing" : feed ? "Ready" : "Pending",
      tone: feed?.status === "Publishing" ? "accent" : feed ? "stable" : "neutral"
    },
    {
      label: "Media & Merchandising",
      detail: feed && feed.inventoryCount >= 100 ? "Full catalog media and listing copy are in scope." : "Featured inventory media and listing copy are in scope.",
      status: feed ? "Mapped" : "Pending",
      tone: feed ? "stable" : "neutral"
    },
    {
      label: "Lead Forms & Source Tags",
      detail: feed ? `${feed.leadsToday} lead${feed.leadsToday === 1 ? "" : "s"} received today from this endpoint.` : "Lead return path opens with the selected endpoint.",
      status: feed && feed.leadsToday > 0 ? "Receiving" : feed ? "Ready" : "Pending",
      tone: feed && feed.leadsToday > 0 ? "stable" : "neutral"
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
