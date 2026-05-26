import { useState, type ReactNode } from "react";
import type {
  ActivityLogEntry,
  PartsWorkspaceRow,
  SalesWorkspaceRow,
  ServiceWorkspaceRow,
  SessionState
} from "../types";

type CommandLogEntry = ActivityLogEntry;


// ─── Vendor/Supplier Management Panel ─────────────────────────────────────────
const stubVendors = [
  { id: "v1", name: "Mercury Marine Parts", contact: "John Wells", phone: "800-555-0191", email: "jwells@mercurymarine.com", terms: "Net 30", leadDays: 5, notes: "Primary engine parts supplier" },
  { id: "v2", name: "Sea Ray Distribution", contact: "Lisa Park", phone: "800-555-0284", email: "lpark@searay.com", terms: "Net 15", leadDays: 7, notes: "Hull and deck components" },
  { id: "v3", name: "West Marine Wholesale", contact: "Tom Rivera", phone: "800-555-0372", email: "trivera@westmarine.com", terms: "COD", leadDays: 2, notes: "Accessories and hardware" },
  { id: "v4", name: "BRP Marine Parts", contact: "Sarah Chen", phone: "800-555-0445", email: "schen@brp.com", terms: "Net 30", leadDays: 10, notes: "Evinrude/Can-Am parts" },
];

function VendorManagementPanel() {
  const [vendors, setVendors] = useState(stubVendors);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(stubVendors[0].id);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<typeof stubVendors[0] | null>(null);
  const selectedVendor = vendors.find(v => v.id === selectedVendorId) ?? null;

  function startEdit(v: typeof stubVendors[0]) {
    setEditingVendorId(v.id);
    setEditDraft({ ...v });
  }

  function cancelEdit() {
    setEditingVendorId(null);
    setEditDraft(null);
  }

  function saveEdit() {
    if (!editDraft) return;
    setVendors(current => current.map(v => v.id === editDraft.id ? editDraft : v));
    setEditingVendorId(null);
    setEditDraft(null);
  }

  return (
    <div className="legacy-vendor-layout">
      <div className="legacy-vendor-list">
        {vendors.map(v => (
          <button
            className={`legacy-vendor-list-item${selectedVendorId === v.id ? " is-active" : ""}`}
            key={v.id}
            onClick={() => setSelectedVendorId(v.id)}
            type="button"
          >
            <strong>{v.name}</strong>
            <span>{v.terms}</span>
          </button>
        ))}
      </div>
      <div className="legacy-vendor-detail">
        {selectedVendor ? (
          <>
            <div className="legacy-vendor-detail-header">{selectedVendor.name}</div>
            <div className="legacy-vendor-meta-grid">
              <div className="legacy-vendor-meta-item"><label>Contact</label><span>{selectedVendor.contact}</span></div>
              <div className="legacy-vendor-meta-item"><label>Phone</label><span>{selectedVendor.phone}</span></div>
              <div className="legacy-vendor-meta-item"><label>Email</label><span>{selectedVendor.email}</span></div>
              <div className="legacy-vendor-meta-item"><label>Terms</label><span><span className="legacy-pricing-markup-chip">{selectedVendor.terms}</span></span></div>
              <div className="legacy-vendor-meta-item"><label>Lead Days</label><span>{selectedVendor.leadDays} days</span></div>
            </div>
            <div className="legacy-vendor-notes">{selectedVendor.notes}</div>
            {editingVendorId === selectedVendor.id && editDraft ? (
              <div className="legacy-vendor-edit-form">
                {(["name", "contact", "phone", "email", "terms", "notes"] as const).map(field => (
                  <label className="legacy-pricing-edit-field" key={field}>
                    <span style={{ textTransform: "capitalize" }}>{field}</span>
                    {field === "notes" ? (
                      <textarea
                        onChange={e => setEditDraft(d => d ? { ...d, [field]: e.target.value } : d)}
                        rows={2}
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, color: "inherit", fontSize: "0.82rem", padding: "4px 8px", resize: "vertical", width: "100%" }}
                        value={editDraft[field] as string}
                      />
                    ) : (
                      <input
                        onChange={e => setEditDraft(d => d ? { ...d, [field]: e.target.value } : d)}
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, color: "inherit", fontSize: "0.82rem", padding: "4px 7px", width: "100%" }}
                        type="text"
                        value={editDraft[field] as string}
                      />
                    )}
                  </label>
                ))}
                <label className="legacy-pricing-edit-field">
                  <span>Lead Days</span>
                  <input
                    min={0}
                    onChange={e => setEditDraft(d => d ? { ...d, leadDays: parseInt(e.target.value, 10) || 0 } : d)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, color: "inherit", fontSize: "0.82rem", padding: "4px 7px", width: "100%" }}
                    type="number"
                    value={editDraft.leadDays}
                  />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="legacy-task-status-button" onClick={saveEdit} type="button">Save</button>
                  <button className="legacy-task-status-button" onClick={cancelEdit} type="button">Cancel</button>
                </div>
              </div>
            ) : (
              <button className="legacy-task-status-button" onClick={() => startEdit(selectedVendor)} type="button">Edit Vendor</button>
            )}
          </>
        ) : (
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem", marginTop: 24, textAlign: "center" }}>Select a vendor.</div>
        )}
      </div>
    </div>
  );
}

// ─── Parts Pricing Matrix Panel ────────────────────────────────────────────────
const stubPricingMatrix = [
  { id: "pm1", category: "Engine Parts", costMin: 0, costMax: 50, markupPct: 40, retailMethod: "Cost + Markup", minMarginPct: 25 },
  { id: "pm2", category: "Engine Parts", costMin: 50, costMax: 200, markupPct: 32, retailMethod: "Cost + Markup", minMarginPct: 22 },
  { id: "pm3", category: "Engine Parts", costMin: 200, costMax: 9999, markupPct: 25, retailMethod: "Cost + Markup", minMarginPct: 18 },
  { id: "pm4", category: "Accessories", costMin: 0, costMax: 100, markupPct: 50, retailMethod: "Cost + Markup", minMarginPct: 30 },
  { id: "pm5", category: "Accessories", costMin: 100, costMax: 9999, markupPct: 38, retailMethod: "Cost + Markup", minMarginPct: 25 },
  { id: "pm6", category: "OEM Hull Parts", costMin: 0, costMax: 9999, markupPct: 20, retailMethod: "MSRP", minMarginPct: 15 },
  { id: "pm7", category: "Electronics", costMin: 0, costMax: 9999, markupPct: 28, retailMethod: "Cost + Markup", minMarginPct: 20 },
];

function PricingMatrixPanel() {
  const [rules, setRules] = useState(stubPricingMatrix);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [draftRule, setDraftRule] = useState<typeof stubPricingMatrix[0] | null>(null);
  const [pricingNotice, setPricingNotice] = useState("");

  function selectRule(rule: typeof stubPricingMatrix[0]) {
    setSelectedRuleId(rule.id);
    setDraftRule({ ...rule });
  }

  function saveRule() {
    if (!draftRule) return;
    setRules(current => current.map(r => r.id === draftRule.id ? draftRule : r));
    setPricingNotice("Rule saved.");
    setTimeout(() => setPricingNotice(""), 2000);
  }

  function deleteRule() {
    if (!selectedRuleId) return;
    setRules(current => current.filter(r => r.id !== selectedRuleId));
    setSelectedRuleId(null);
    setDraftRule(null);
    setPricingNotice("Rule deleted.");
    setTimeout(() => setPricingNotice(""), 2000);
  }

  function addRule() {
    const newId = `pm${Date.now()}`;
    const newRule = { id: newId, category: "New Category", costMin: 0, costMax: 9999, markupPct: 30, retailMethod: "Cost + Markup", minMarginPct: 20 };
    setRules(current => [...current, newRule]);
    selectRule(newRule);
  }

  return (
    <div style={{ padding: 16, overflow: "auto" }}>
      {pricingNotice && <div className="legacy-workbench-notice" style={{ marginBottom: 8 }}>{pricingNotice}</div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button className="legacy-task-status-button" onClick={addRule} type="button">+ Add Rule</button>
        <button className="legacy-task-status-button" disabled={!selectedRuleId} onClick={deleteRule} type="button">Delete Rule</button>
      </div>
      <table className="legacy-pricing-matrix-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Cost Range</th>
            <th>Markup %</th>
            <th>Method</th>
            <th>Min Margin %</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(r => (
            <tr className={selectedRuleId === r.id ? "is-selected" : ""} key={r.id} onClick={() => selectRule(r)}>
              <td>{r.category}</td>
              <td>${r.costMin}–${r.costMax === 9999 ? "∞" : r.costMax}</td>
              <td><span className="legacy-pricing-markup-chip">{r.markupPct}%</span></td>
              <td>{r.retailMethod}</td>
              <td>{r.minMarginPct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {draftRule && (
        <div className="legacy-pricing-edit-form">
          <div className="legacy-pricing-edit-field">
            <span>Category</span>
            <input onChange={e => setDraftRule(d => d ? { ...d, category: e.target.value } : d)} type="text" value={draftRule.category} />
          </div>
          <div className="legacy-pricing-edit-field">
            <span>Cost Min ($)</span>
            <input onChange={e => setDraftRule(d => d ? { ...d, costMin: parseFloat(e.target.value) || 0 } : d)} type="number" value={draftRule.costMin} />
          </div>
          <div className="legacy-pricing-edit-field">
            <span>Cost Max ($)</span>
            <input onChange={e => setDraftRule(d => d ? { ...d, costMax: parseFloat(e.target.value) || 0 } : d)} type="number" value={draftRule.costMax} />
          </div>
          <div className="legacy-pricing-edit-field">
            <span>Markup %</span>
            <input onChange={e => setDraftRule(d => d ? { ...d, markupPct: parseFloat(e.target.value) || 0 } : d)} type="number" value={draftRule.markupPct} />
          </div>
          <div className="legacy-pricing-edit-field">
            <span>Retail Method</span>
            <select onChange={e => setDraftRule(d => d ? { ...d, retailMethod: e.target.value } : d)} value={draftRule.retailMethod}>
              <option>Cost + Markup</option>
              <option>MSRP</option>
              <option>Matrix</option>
            </select>
          </div>
          <div className="legacy-pricing-edit-field">
            <span>Min Margin %</span>
            <input onChange={e => setDraftRule(d => d ? { ...d, minMarginPct: parseFloat(e.target.value) || 0 } : d)} type="number" value={draftRule.minMarginPct} />
          </div>
          <div style={{ display: "flex", gap: 8, gridColumn: "1 / -1" }}>
            <button className="legacy-task-status-button" onClick={saveRule} type="button">Save Rule</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Service Reminder Campaign Panel ──────────────────────────────────────────
const campaignTypes = ["Winterization", "Annual Service", "Oil Change", "Spring Launch"];

function generateCampaignRows(type: string): Array<{ id: string; name: string; unit: string; lastService: string; contact: string; type: string }> {
  const base = [
    { name: "James Holloway", unit: "2021 Sea Ray 230 SLX", lastService: "2023-11-12", contact: "james@email.com" },
    { name: "Maria Santos", unit: "2019 Bayliner VR5", lastService: "2023-10-28", contact: "msantos@email.com" },
    { name: "Robert Keen", unit: "2022 Yamaha FSH210", lastService: "2024-01-05", contact: "rkeen@email.com" },
    { name: "Linda Park", unit: "2020 MasterCraft X22", lastService: "2023-12-01", contact: "lpark@email.com" },
    { name: "Tom Walsh", unit: "2018 Chaparral 21 H2O", lastService: "2023-09-17", contact: "twalsh@email.com" },
    { name: "Cynthia Moore", unit: "2023 Cobalt R7", lastService: "2024-02-14", contact: "cmoore@email.com" },
    { name: "Derek Han", unit: "2017 Four Winns H240", lastService: "2023-08-30", contact: "dhan@email.com" },
  ];
  return base.map((row, i) => ({ id: `cr${i}`, ...row, type }));
}

function CampaignPanel() {
  const [campaignType, setCampaignType] = useState<string>("Winterization");
  const [campaignRows, setCampaignRows] = useState<Array<{ id: string; name: string; unit: string; lastService: string; contact: string; type: string }>>([]);
  const [campaignNotice, setCampaignNotice] = useState("");

  function generateList() {
    const rows = generateCampaignRows(campaignType);
    setCampaignRows(rows);
    setCampaignNotice(`${rows.length} customers identified for ${campaignType} campaign.`);
  }

  function exportCsv() {
    if (campaignRows.length === 0) return;
    const header = "Customer Name,Unit,Last Service,Contact,Reminder Type\n";
    const body = campaignRows.map(r => `"${r.name}","${r.unit}","${r.lastService}","${r.contact}","${r.type}"`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignType.replace(/\s+/g, "-").toLowerCase()}-campaign.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 16 }}>
      <div className="legacy-campaign-type-row">
        {campaignTypes.map(t => (
          <button
            className={`legacy-campaign-type-btn${campaignType === t ? " is-active" : ""}`}
            key={t}
            onClick={() => setCampaignType(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </div>
      <div style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 12 }}>
        <button className="legacy-task-status-button" onClick={generateList} type="button">Generate List</button>
        <button className="legacy-task-status-button" disabled={campaignRows.length === 0} onClick={exportCsv} type="button">Export CSV</button>
        {campaignRows.length > 0 && <span className="legacy-campaign-count-badge">{campaignRows.length} customers</span>}
      </div>
      {campaignNotice && <div className="legacy-workbench-notice" style={{ marginBottom: 10 }}>{campaignNotice}</div>}
      {campaignRows.length > 0 && (
        <table className="legacy-campaign-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Unit</th>
              <th>Last Service</th>
              <th>Contact</th>
              <th>Reminder Type</th>
            </tr>
          </thead>
          <tbody>
            {campaignRows.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.unit}</td>
                <td>{r.lastService}</td>
                <td>{r.contact}</td>
                <td>{r.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}



function buildCsvExport(headers: string[][], rows: string[][]) {
  return [...headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function escapeCsvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

type ApprovalStatus = "Pending" | "Approved" | "Rejected";
type ApprovalRequestType = "Void Invoice" | "Discount Override" | "Warranty Authorization" | "Parts Adjustment" | "Deal Funding";
interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  reference: string;
  requestedBy: string;
  impact: string;
  status: ApprovalStatus;
  age: string;
  reason: string;
}

const initialApprovalRequests: ApprovalRequest[] = [
  { id: "ap1", type: "Void Invoice", reference: "RO 104582", requestedBy: "M. Torres", impact: "$2,418.33", status: "Pending", age: "12m", reason: "Customer disputed duplicate charge" },
  { id: "ap2", type: "Discount Override", reference: "Deal WKS-22014", requestedBy: "A. Jensen", impact: "7.5% discount", status: "Pending", age: "34m", reason: "Boat show promo match" },
  { id: "ap3", type: "Warranty Authorization", reference: "Claim WTY-9012", requestedBy: "S. Lee", impact: "$684.50", status: "Approved", age: "1h", reason: "Manufacturer pre-auth received" },
  { id: "ap4", type: "Parts Adjustment", reference: "Part 8M0123456", requestedBy: "P. Walsh", impact: "-2 qty", status: "Pending", age: "2h", reason: "Cycle count variance" },
  { id: "ap5", type: "Deal Funding", reference: "Deal WKS-22009", requestedBy: "R. Chan", impact: "$48,910.00", status: "Rejected", age: "4h", reason: "Missing lender confirmation" }
];

type DocumentType = "RO Invoice" | "Estimate" | "Signed Form" | "Deal Jacket" | "Warranty Doc" | "PO PDF";
type DocumentStatus = "Draft" | "Ready" | "Sent" | "Signed" | "Archived";
interface DocumentRecord {
  id: string;
  type: DocumentType;
  reference: string;
  party: string;
  status: DocumentStatus;
  lastUpdated: string;
}

const documentTypeOptions: Array<"All" | DocumentType> = ["All", "RO Invoice", "Estimate", "Signed Form", "Deal Jacket", "Warranty Doc", "PO PDF"];
const initialDocuments: DocumentRecord[] = [
  { id: "doc1", type: "RO Invoice", reference: "RO 104582", party: "James Holloway", status: "Ready", lastUpdated: "Today 9:42 AM" },
  { id: "doc2", type: "Estimate", reference: "EST 7713", party: "Maria Santos", status: "Sent", lastUpdated: "Today 8:18 AM" },
  { id: "doc3", type: "Signed Form", reference: "SIG 33091", party: "Robert Keen", status: "Signed", lastUpdated: "Yesterday 4:20 PM" },
  { id: "doc4", type: "Deal Jacket", reference: "Deal WKS-22014", party: "Aqua Finance", status: "Draft", lastUpdated: "Yesterday 1:05 PM" },
  { id: "doc5", type: "Warranty Doc", reference: "Claim WTY-9012", party: "Mercury Marine", status: "Ready", lastUpdated: "Mon 11:33 AM" },
  { id: "doc6", type: "PO PDF", reference: "PO 60218", party: "West Marine Wholesale", status: "Archived", lastUpdated: "Fri 3:45 PM" }
];

type InternalTaskStatus = "Open" | "In Progress" | "Done";
type InternalTaskPriority = "Low" | "Normal" | "High" | "Urgent";
interface InternalTask {
  id: string;
  title: string;
  reference: string;
  assignee: string;
  dueDate: string;
  priority: InternalTaskPriority;
  status: InternalTaskStatus;
}

type InternalTaskDraft = Omit<InternalTask, "id" | "status">;
const taskStatusColumns: InternalTaskStatus[] = ["Open", "In Progress", "Done"];
const taskPriorityOptions: InternalTaskPriority[] = ["Low", "Normal", "High", "Urgent"];
const initialInternalTasks: InternalTask[] = [
  { id: "task1", title: "Call customer for approval", reference: "RO 104582", assignee: "M. Torres", dueDate: "Today", priority: "High", status: "Open" },
  { id: "task2", title: "Order backordered part", reference: "Part 8M0123456", assignee: "P. Walsh", dueDate: "Tomorrow", priority: "Urgent", status: "In Progress" },
  { id: "task3", title: "Follow up warranty claim", reference: "Claim WTY-9012", assignee: "S. Lee", dueDate: "Fri", priority: "Normal", status: "Open" },
  { id: "task4", title: "Collect payment", reference: "Invoice INV-4418", assignee: "A. Jensen", dueDate: "Today", priority: "High", status: "Done" }
];

interface ExceptionItem {
  id: string;
  type: "Unpaid Finalized Invoices" | "Past Promised ROs" | "Negative Inventory" | "Open Warranty Claims" | "Unsent Signatures" | "Sync Errors";
  reference: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  owner: string;
  isAcknowledged: boolean;
}

const initialExceptions: ExceptionItem[] = [
  { id: "ex1", type: "Unpaid Finalized Invoices", reference: "INV-4418", severity: "High", owner: "Receivables", isAcknowledged: false },
  { id: "ex2", type: "Past Promised ROs", reference: "RO 104211", severity: "Medium", owner: "Service", isAcknowledged: false },
  { id: "ex3", type: "Negative Inventory", reference: "Part 8M0123456", severity: "Critical", owner: "Parts", isAcknowledged: false },
  { id: "ex4", type: "Open Warranty Claims", reference: "WTY-9012", severity: "Medium", owner: "Warranty", isAcknowledged: true },
  { id: "ex5", type: "Unsent Signatures", reference: "Deal WKS-22014", severity: "Low", owner: "Sales", isAcknowledged: false },
  { id: "ex6", type: "Sync Errors", reference: "Lightspeed DMS", severity: "High", owner: "Admin", isAcknowledged: false }
];

interface DataToolDefinition {
  id: "customers" | "units" | "parts" | "vendors" | "service-history";
  label: string;
  description: string;
  sampleRows: string[][];
  templateHeaders: string[];
}

const dataToolDefinitions: DataToolDefinition[] = [
  { id: "customers", label: "Customers", description: "Customer contacts, consent flags, and account owners.", templateHeaders: ["Customer Name", "Email", "Phone", "Preferred Store"], sampleRows: [["James Holloway", "james@email.com", "555-0108", "Clearwater"], ["Maria Santos", "msantos@email.com", "555-0142", "Tampa"]] },
  { id: "units", label: "Units", description: "Boat inventory, HIN/VIN, year, make, and model.", templateHeaders: ["Stock", "Year", "Make", "Model", "Status"], sampleRows: [["STK-7782", "2023", "Sea Ray", "230 SLX", "Available"], ["STK-8801", "2024", "Yamaha", "252XE", "Reserved"]] },
  { id: "parts", label: "Parts", description: "On-hand counts, bin locations, and reorder points.", templateHeaders: ["Part Number", "Description", "On Hand", "Bin", "Reorder Point"], sampleRows: [["8M0123456", "Fuel filter", "14", "A-12", "6"], ["33-8M0097854", "Spark plug", "48", "B-04", "20"]] },
  { id: "vendors", label: "Vendors", description: "Supplier contacts, terms, lead times, and notes.", templateHeaders: ["Vendor", "Contact", "Email", "Terms", "Lead Days"], sampleRows: [["Mercury Marine Parts", "John Wells", "jwells@mercurymarine.com", "Net 30", "5"], ["West Marine Wholesale", "Tom Rivera", "trivera@westmarine.com", "COD", "2"]] },
  { id: "service-history", label: "Service History", description: "Historical ROs, labor lines, parts, and completion dates.", templateHeaders: ["RO Number", "Customer", "Unit", "Closed Date", "Total"], sampleRows: [["RO 104582", "James Holloway", "2021 Sea Ray 230 SLX", "2026-02-11", "2418.33"], ["RO 104211", "Maria Santos", "2019 Bayliner VR5", "2026-02-09", "684.50"]] }
];

type NotificationAlertKey = "serviceDue" | "paymentReceived" | "approvalNeeded" | "lowInventory" | "syncErrors" | "warrantyUpdates";
type NotificationChannel = "inApp" | "email" | "sms";
interface NotificationPreferences {
  alerts: Record<NotificationAlertKey, boolean>;
  channels: Record<NotificationChannel, boolean>;
  quietStart: string;
  quietEnd: string;
}

const notificationAlertOptions: Array<{ key: NotificationAlertKey; label: string }> = [
  { key: "serviceDue", label: "Service Due" },
  { key: "paymentReceived", label: "Payment Received" },
  { key: "approvalNeeded", label: "Approval Needed" },
  { key: "lowInventory", label: "Low Inventory" },
  { key: "syncErrors", label: "Sync Errors" },
  { key: "warrantyUpdates", label: "Warranty Updates" }
];
const notificationChannelOptions: Array<{ key: NotificationChannel; label: string }> = [
  { key: "inApp", label: "In-App" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" }
];

interface HealthService {
  id: string;
  label: string;
  status: "Operational" | "Degraded" | "Down";
  latency: string;
  detail: string;
  lastCheck: string;
}

interface FailedJob {
  id: string;
  job: string;
  workspace: string;
  lastError: string;
  retries: number;
  dismissed: boolean;
}

const initialHealthServices: HealthService[] = [
  { id: "api", label: "API", status: "Operational", latency: "82 ms", detail: "Gateway responding normally", lastCheck: "Just now" },
  { id: "db", label: "Database", status: "Operational", latency: "41 ms", detail: "Primary pool healthy", lastCheck: "Just now" },
  { id: "sync", label: "Sync Engine", status: "Degraded", latency: "214 ms", detail: "One dealer feed retrying", lastCheck: "2m ago" },
  { id: "backup", label: "Backup", status: "Operational", latency: "Last 01:15 AM", detail: "Nightly backup verified", lastCheck: "1h ago" },
  { id: "jobs", label: "Job Queue", status: "Degraded", latency: "3 retries", detail: "Invoice sync retry pending", lastCheck: "5m ago" },
  { id: "storage", label: "Storage", status: "Operational", latency: "68% used", detail: "Document bucket within limits", lastCheck: "Just now" }
];
const initialFailedJobs: FailedJob[] = [
  { id: "job1", job: "Invoice export", workspace: "Receivables", lastError: "Gateway timeout from accounting bridge", retries: 2, dismissed: false },
  { id: "job2", job: "Signature packet send", workspace: "Sales", lastError: "Customer email bounced", retries: 1, dismissed: false },
  { id: "job3", job: "Inventory sync", workspace: "Parts", lastError: "Negative quantity rejected", retries: 3, dismissed: false }
];

function reportStatusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function ReportSectionShell({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="legacy-report-section-shell">
      <div className="legacy-command-log-header legacy-report-section-header">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}

function ApprovalWorkflowCenter() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(initialApprovalRequests);
  const [notice, setNotice] = useState("Approval queue ready.");

  function updateApprovalStatus(id: string, status: ApprovalStatus) {
    const request = requests.find(r => r.id === id);
    setRequests(current => current.map(r => r.id === id ? { ...r, status } : r));
    setNotice(request ? `${request.reference} marked ${status}.` : `Request marked ${status}.`);
  }

  function viewRequest(request: ApprovalRequest) {
    setNotice(`${request.reference}: ${request.reason}`);
  }

  return (
    <ReportSectionShell eyebrow="Manager controls" title="Approval Workflow Center">
      {notice && <div className="legacy-workbench-notice">{notice}</div>}
      <div className="legacy-approval-table-wrap">
        <table className="legacy-approval-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Reference</th>
              <th>Requested By</th>
              <th>Amount/Impact</th>
              <th>Status</th>
              <th>Age</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(request => (
              <tr key={request.id}>
                <td><strong>{request.type}</strong><span>{request.reason}</span></td>
                <td>{request.reference}</td>
                <td>{request.requestedBy}</td>
                <td>{request.impact}</td>
                <td><span className={`legacy-chip legacy-approval-status-${reportStatusClass(request.status)}`}>{request.status}</span></td>
                <td>{request.age}</td>
                <td>
                  <div className="legacy-approval-actions">
                    <button className="legacy-task-status-button" disabled={request.status === "Approved"} onClick={() => updateApprovalStatus(request.id, "Approved")} type="button">Approve</button>
                    <button className="legacy-task-status-button" disabled={request.status === "Rejected"} onClick={() => updateApprovalStatus(request.id, "Rejected")} type="button">Reject</button>
                    <button className="legacy-task-status-button" onClick={() => viewRequest(request)} type="button">View</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSectionShell>
  );
}

function DocumentCenter() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);
  const [typeFilter, setTypeFilter] = useState<"All" | DocumentType>("All");
  const [searchText, setSearchText] = useState("");
  const [notice, setNotice] = useState("Document center ready.");
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredDocuments = documents.filter(doc => {
    const matchesType = typeFilter === "All" || doc.type === typeFilter;
    const matchesSearch = !normalizedSearch || [doc.type, doc.reference, doc.party, doc.status].some(value => value.toLowerCase().includes(normalizedSearch));
    return matchesType && matchesSearch;
  });

  function handleDocumentAction(documentRecord: DocumentRecord, action: "Preview" | "Download" | "Send") {
    if (action === "Send") {
      setDocuments(current => current.map(doc => doc.id === documentRecord.id ? { ...doc, status: "Sent", lastUpdated: "Just now" } : doc));
    }
    setNotice(`${action} queued for ${documentRecord.reference}.`);
  }

  return (
    <ReportSectionShell eyebrow="Document hub" title="Document Center">
      <div className="legacy-document-toolbar">
        <select onChange={e => setTypeFilter(e.target.value as "All" | DocumentType)} value={typeFilter}>
          {documentTypeOptions.map(type => <option key={type}>{type}</option>)}
        </select>
        <input onChange={e => setSearchText(e.target.value)} placeholder="Search reference, customer, vendor, status…" type="search" value={searchText} />
        <span>{filteredDocuments.length} docs</span>
      </div>
      {notice && <div className="legacy-workbench-notice">{notice}</div>}
      <div className="legacy-document-table-wrap">
        <table className="legacy-document-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Reference</th>
              <th>Customer/Vendor</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map(doc => (
              <tr key={doc.id}>
                <td>{doc.type}</td>
                <td><strong>{doc.reference}</strong></td>
                <td>{doc.party}</td>
                <td><span className={`legacy-chip legacy-document-status-${reportStatusClass(doc.status)}`}>{doc.status}</span></td>
                <td>{doc.lastUpdated}</td>
                <td>
                  <div className="legacy-document-actions">
                    {(["Preview", "Download", "Send"] as const).map(action => (
                      <button className="legacy-task-status-button" key={action} onClick={() => handleDocumentAction(doc, action)} type="button">{action}</button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSectionShell>
  );
}

function InternalTaskQueuePanel() {
  const [tasks, setTasks] = useState<InternalTask[]>(initialInternalTasks);
  const [draft, setDraft] = useState<InternalTaskDraft>({ title: "", assignee: "", dueDate: "", priority: "Normal", reference: "" });
  const [notice, setNotice] = useState("Internal task queue ready.");

  function moveTask(taskId: string, direction: "forward" | "back") {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const currentIndex = taskStatusColumns.indexOf(task.status);
    const nextIndex = direction === "forward" ? Math.min(currentIndex + 1, taskStatusColumns.length - 1) : Math.max(currentIndex - 1, 0);
    const nextStatus = taskStatusColumns[nextIndex];
    setTasks(current => current.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    setNotice(`${task.title} moved to ${nextStatus}.`);
  }

  function addTask() {
    const title = draft.title.trim();
    if (!title) {
      setNotice("Task title is required.");
      return;
    }
    const newTask: InternalTask = {
      id: `task-${Date.now()}`,
      title,
      assignee: draft.assignee.trim() || "Unassigned",
      dueDate: draft.dueDate.trim() || "No due date",
      priority: draft.priority,
      reference: draft.reference.trim() || "General",
      status: "Open"
    };
    setTasks(current => [newTask, ...current]);
    setDraft({ title: "", assignee: "", dueDate: "", priority: "Normal", reference: "" });
    setNotice(`${newTask.title} added to Open.`);
  }

  return (
    <ReportSectionShell eyebrow="Internal work" title="Tasks / To-Do Queue">
      {notice && <div className="legacy-workbench-notice">{notice}</div>}
      <div className="legacy-task-board-quick-add">
        <input onChange={e => setDraft(current => ({ ...current, title: e.target.value }))} placeholder="Task title" type="text" value={draft.title} />
        <input onChange={e => setDraft(current => ({ ...current, reference: e.target.value }))} placeholder="Reference" type="text" value={draft.reference} />
        <input onChange={e => setDraft(current => ({ ...current, assignee: e.target.value }))} placeholder="Assignee" type="text" value={draft.assignee} />
        <input onChange={e => setDraft(current => ({ ...current, dueDate: e.target.value }))} placeholder="Due date" type="text" value={draft.dueDate} />
        <select onChange={e => setDraft(current => ({ ...current, priority: e.target.value as InternalTaskPriority }))} value={draft.priority}>
          {taskPriorityOptions.map(priority => <option key={priority}>{priority}</option>)}
        </select>
        <button className="legacy-task-status-button" onClick={addTask} type="button">+ Add Task</button>
      </div>
      <div className="legacy-task-board-grid">
        {taskStatusColumns.map(status => (
          <div className="legacy-task-board-column" key={status}>
            <div className="legacy-task-board-column-header"><span>{status}</span><strong>{tasks.filter(task => task.status === status).length}</strong></div>
            {tasks.filter(task => task.status === status).map(task => (
              <div className="legacy-task-board-card" key={task.id}>
                <div className="legacy-task-board-card-title">{task.title}</div>
                <div className="legacy-task-board-card-meta"><span>{task.reference}</span><span>{task.assignee}</span><span>{task.dueDate}</span></div>
                <div className="legacy-task-board-card-actions">
                  <span className={`legacy-chip legacy-task-board-priority-${reportStatusClass(task.priority)}`}>{task.priority}</span>
                  <button className="legacy-task-status-button" disabled={task.status === "Open"} onClick={() => moveTask(task.id, "back")} type="button">Back</button>
                  <button className="legacy-task-status-button" disabled={task.status === "Done"} onClick={() => moveTask(task.id, "forward")} type="button">Next</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ReportSectionShell>
  );
}

function ExceptionDashboard() {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>(initialExceptions);
  const [notice, setNotice] = useState("Exception dashboard monitoring active.");
  const types = Array.from(new Set(exceptions.map(item => item.type)));
  const openExceptions = exceptions.filter(item => !item.isAcknowledged);

  function acknowledgeException(item: ExceptionItem) {
    setExceptions(current => current.map(exception => exception.id === item.id ? { ...exception, isAcknowledged: true } : exception));
    setNotice(`${item.reference} acknowledged for ${item.owner}.`);
  }

  return (
    <ReportSectionShell eyebrow="Operational controls" title="Exception Dashboard">
      <div className="legacy-exception-summary-grid">
        {types.map(type => (
          <div className="legacy-exception-summary-tile" key={type}>
            <span>{type}</span>
            <strong>{exceptions.filter(item => item.type === type && !item.isAcknowledged).length}</strong>
          </div>
        ))}
      </div>
      {notice && <div className="legacy-workbench-notice">{notice}</div>}
      <div className="legacy-exception-group-stack">
        {types.map(type => (
          <div className="legacy-exception-group" key={type}>
            <div className="legacy-exception-group-header"><span>{type}</span><strong>{exceptions.filter(item => item.type === type && !item.isAcknowledged).length} open</strong></div>
            {exceptions.filter(item => item.type === type).map(item => (
              <div className={`legacy-exception-row${item.isAcknowledged ? " is-acknowledged" : ""}`} key={item.id}>
                <span>{item.type}</span>
                <strong>{item.reference}</strong>
                <span className={`legacy-chip legacy-exception-severity-${reportStatusClass(item.severity)}`}>{item.severity}</span>
                <span>{item.owner}</span>
                <button className="legacy-task-status-button" disabled={item.isAcknowledged} onClick={() => acknowledgeException(item)} type="button">{item.isAcknowledged ? "Acknowledged" : "Acknowledge"}</button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="legacy-exception-footer">{openExceptions.length} actionable exceptions remain.</div>
    </ReportSectionShell>
  );
}

function DataToolsPanel() {
  const [notice, setNotice] = useState("Choose an import/export tool.");

  function downloadDataToolCsv(tool: DataToolDefinition, mode: "export" | "template") {
    const headers = tool.templateHeaders;
    const rows = mode === "export" ? tool.sampleRows : [];
    const csv = buildCsvExport([headers], rows);
    downloadTextFile(`${tool.id}-${mode}.csv`, csv, "text/csv;charset=utf-8");
    setNotice(`${tool.label} ${mode === "export" ? "export" : "template"} downloaded.`);
  }

  function handleImport(tool: DataToolDefinition, fileName?: string) {
    setNotice(fileName ? `${tool.label} import staged from ${fileName}.` : `${tool.label} import opened.`);
  }

  return (
    <ReportSectionShell eyebrow="Admin utilities" title="Data Import / Export Tools">
      {notice && <div className="legacy-workbench-notice">{notice}</div>}
      <div className="legacy-data-tools-grid">
        {dataToolDefinitions.map(tool => (
          <div className="legacy-data-tools-card" key={tool.id}>
            <div>
              <strong>{tool.label}</strong>
              <p>{tool.description}</p>
            </div>
            <div className="legacy-data-tools-actions">
              <button className="legacy-task-status-button" onClick={() => downloadDataToolCsv(tool, "export")} type="button">Export CSV</button>
              <label className="legacy-data-tools-file-button">
                Import CSV
                <input accept=".csv,text/csv" onChange={e => handleImport(tool, e.target.files?.[0]?.name)} type="file" />
              </label>
              <button className="legacy-task-status-button" onClick={() => downloadDataToolCsv(tool, "template")} type="button">Template</button>
            </div>
          </div>
        ))}
      </div>
    </ReportSectionShell>
  );
}

function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    alerts: { serviceDue: true, paymentReceived: true, approvalNeeded: true, lowInventory: true, syncErrors: true, warrantyUpdates: false },
    channels: { inApp: true, email: true, sms: false },
    quietStart: "18:00",
    quietEnd: "07:00"
  });
  const [notice, setNotice] = useState("Preferences loaded for current user.");

  function toggleAlert(key: NotificationAlertKey) {
    setPreferences(current => ({ ...current, alerts: { ...current.alerts, [key]: !current.alerts[key] } }));
  }

  function toggleChannel(key: NotificationChannel) {
    setPreferences(current => ({ ...current, channels: { ...current.channels, [key]: !current.channels[key] } }));
  }

  return (
    <ReportSectionShell eyebrow="User settings" title="Notification Preferences">
      {notice && <div className="legacy-workbench-notice">{notice}</div>}
      <div className="legacy-preferences-grid">
        <div className="legacy-preferences-card">
          <h4>Alert Settings</h4>
          <div className="legacy-preferences-option-grid">
            {notificationAlertOptions.map(option => (
              <label className="legacy-preferences-check" key={option.key}>
                <input checked={preferences.alerts[option.key]} onChange={() => toggleAlert(option.key)} type="checkbox" />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="legacy-preferences-card">
          <h4>Delivery Channels</h4>
          <div className="legacy-preferences-option-grid is-compact">
            {notificationChannelOptions.map(option => (
              <label className="legacy-preferences-check" key={option.key}>
                <input checked={preferences.channels[option.key]} onChange={() => toggleChannel(option.key)} type="checkbox" />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <div className="legacy-preferences-quiet-row">
            <label><span>Quiet Start</span><input onChange={e => setPreferences(current => ({ ...current, quietStart: e.target.value }))} type="time" value={preferences.quietStart} /></label>
            <label><span>Quiet End</span><input onChange={e => setPreferences(current => ({ ...current, quietEnd: e.target.value }))} type="time" value={preferences.quietEnd} /></label>
          </div>
          <button className="legacy-task-status-button" onClick={() => setNotice("Notification preferences saved.")} type="button">Save Preferences</button>
        </div>
      </div>
    </ReportSectionShell>
  );
}

function SystemHealthPanel() {
  const [services, setServices] = useState<HealthService[]>(initialHealthServices);
  const [jobs, setJobs] = useState<FailedJob[]>(initialFailedJobs);
  const [notice, setNotice] = useState("System health snapshot loaded.");
  const visibleJobs = jobs.filter(job => !job.dismissed);

  function refreshHealth() {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setServices(current => current.map((service, index) => ({
      ...service,
      lastCheck: now,
      latency: service.id === "backup" ? service.latency : `${65 + ((Date.now() + index * 17) % 180)} ms`
    })));
    setNotice(`Health refreshed at ${now}.`);
  }

  function handleJobAction(job: FailedJob, action: "Retry" | "Dismiss") {
    if (action === "Retry") {
      setJobs(current => current.map(currentJob => currentJob.id === job.id ? { ...currentJob, retries: currentJob.retries + 1 } : currentJob));
      setNotice(`${job.job} retry queued.`);
      return;
    }
    setJobs(current => current.map(currentJob => currentJob.id === job.id ? { ...currentJob, dismissed: true } : currentJob));
    setNotice(`${job.job} dismissed from failed jobs.`);
  }

  return (
    <ReportSectionShell eyebrow="Admin console" title="System Health">
      <div className="legacy-health-toolbar">
        <button className="legacy-task-status-button" onClick={refreshHealth} type="button">Refresh Health</button>
        {notice && <span>{notice}</span>}
      </div>
      <div className="legacy-health-card-grid">
        {services.map(service => (
          <div className="legacy-health-card" key={service.id}>
            <div className="legacy-health-card-header"><strong>{service.label}</strong><span className={`legacy-chip legacy-health-status-${reportStatusClass(service.status)}`}>{service.status}</span></div>
            <div className="legacy-health-latency">{service.latency}</div>
            <p>{service.detail}</p>
            <span>{service.lastCheck}</span>
          </div>
        ))}
      </div>
      <div className="legacy-health-admin-grid">
        <div className="legacy-health-failed-jobs">
          <div className="legacy-health-subheader">Failed Jobs</div>
          <table className="legacy-health-table">
            <thead><tr><th>Job</th><th>Workspace</th><th>Last Error</th><th>Retries</th><th>Actions</th></tr></thead>
            <tbody>
              {visibleJobs.map(job => (
                <tr key={job.id}>
                  <td>{job.job}</td>
                  <td>{job.workspace}</td>
                  <td>{job.lastError}</td>
                  <td>{job.retries}</td>
                  <td><div className="legacy-health-actions"><button className="legacy-task-status-button" onClick={() => handleJobAction(job, "Retry")} type="button">Retry</button><button className="legacy-task-status-button" onClick={() => handleJobAction(job, "Dismiss")} type="button">Dismiss</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="legacy-health-env-grid">
          <div><span>App Version</span><strong>0.1.0</strong></div>
          <div><span>Branch</span><strong>copilot/workspace-tools-purpose</strong></div>
          <div><span>Mode</span><strong>Production Preview</strong></div>
          <div><span>Last Deploy</span><strong>Today 08:30</strong></div>
        </div>
      </div>
    </ReportSectionShell>
  );
}
// ─── Report Center Workspace ───────────────────────────────────────────────────
type ReportCenterSection = "reports" | "vendors" | "pricing" | "campaigns" | "audit" | "approvals" | "documents" | "tasks" | "exceptions" | "data-tools" | "preferences" | "system-health" | "notifications" | "users" | "crm" | "fi-products";

function NotificationTemplatesPanel() {
  const templates = [
    { id: "svc-reminder", name: "Service Reminder", channel: ["Email", "SMS"] as string[], subject: "Your boat service is due", body: "Hi {{customer}}, your {{unit}} is due for service. Please call us at {{phone}} to schedule." },
    { id: "payment-receipt", name: "Payment Receipt", channel: ["Email"] as string[], subject: "Payment received — Thank you!", body: "Hi {{customer}}, we received your payment of {{amount}} for RO #{{roNumber}}. Thank you!" },
    { id: "approval-request", name: "Approval Request", channel: ["Email"] as string[], subject: "Approval Required: {{type}}", body: "Hi {{approver}}, your approval is needed for {{reference}}. Reason: {{reason}}." },
    { id: "esig-request", name: "eSignature Request", channel: ["Email", "SMS"] as string[], subject: "Please sign: {{docType}}", body: "Hi {{customer}}, please review and sign your {{docType}} at: {{link}}" },
  ];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string; fromName: string; replyTo: string }>>({});
  const [notice, setNotice] = useState("");
  function getDraft(t: typeof templates[0]) {
    return drafts[t.id] ?? { subject: t.subject, body: t.body, fromName: "Premier Marine", replyTo: "service@premiermarinedemo.com" };
  }
  return (
    <div style={{ overflow: "auto", padding: 16 }}>
      {notice && <div className="legacy-workbench-notice" onClick={() => setNotice("")}>{notice}</div>}
      <div className="legacy-notif-template-grid">
        {templates.map(t => {
          const draft = getDraft(t);
          const isEditing = editingId === t.id;
          return (
            <div className="legacy-notif-template-card" key={t.id}>
              <div className="legacy-notif-template-name">{t.name}</div>
              <div className="legacy-notif-template-channels">
                {t.channel.map(c => <span className="legacy-chip tone-neutral" key={c}>{c}</span>)}
              </div>
              <div className="legacy-notif-template-preview">{draft.body.slice(0, 60)}…</div>
              <button className="legacy-task-status-button" onClick={() => setEditingId(isEditing ? null : t.id)} type="button">{isEditing ? "▲ Close" : "Edit Template"}</button>
              {isEditing && (
                <div className="legacy-notif-template-edit">
                  <label className="legacy-notif-template-field"><span>Subject</span><input onChange={e => setDrafts(d => ({ ...d, [t.id]: { ...getDraft(t), subject: e.target.value } }))} value={draft.subject} /></label>
                  <label className="legacy-notif-template-field"><span>Body</span><textarea onChange={e => setDrafts(d => ({ ...d, [t.id]: { ...getDraft(t), body: e.target.value } }))} value={draft.body} /></label>
                  <label className="legacy-notif-template-field"><span>From Name</span><input onChange={e => setDrafts(d => ({ ...d, [t.id]: { ...getDraft(t), fromName: e.target.value } }))} value={draft.fromName} /></label>
                  <label className="legacy-notif-template-field"><span>Reply-To</span><input onChange={e => setDrafts(d => ({ ...d, [t.id]: { ...getDraft(t), replyTo: e.target.value } }))} value={draft.replyTo} /></label>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button className="legacy-task-status-button" onClick={() => setNotice(`Test notification sent to ${draft.replyTo}.`)} type="button">Send Test</button>
                    <button className="legacy-task-status-button" onClick={() => { setDrafts(d => ({ ...d, [t.id]: draft })); setNotice("Template saved."); }} type="button">Save Template</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ReportCenterProps = {
  auditLog: CommandLogEntry[];
  partsRows: PartsWorkspaceRow[];
  salesRows: SalesWorkspaceRow[];
  serviceRows: ServiceWorkspaceRow[];
  session: SessionState;
};

type UserAdminEntry = {
  email: string;
  id: string;
  name: string;
  role: "Admin" | "Manager" | "Writer" | "Tech";
  status: "Active" | "Inactive";
  stores: string;
  title: string;
};

function UserAdminPanel({ session }: { session: SessionState }) {
  const [users, setUsers] = useState<UserAdminEntry[]>([
    { id: session.user.id, name: session.user.name, email: session.user.email, title: session.user.title, role: "Admin", stores: session.stores.map((store) => store.code).join(", "), status: "Active" },
    { id: "mgr-1", name: "Roger Harrison", email: "roger@example.com", title: "Store Manager", role: "Manager", stores: session.stores[0]?.code ?? "PBC", status: "Active" },
    { id: "tech-1", name: "Mason May", email: "mason@example.com", title: "Lead Technician", role: "Tech", stores: session.stores[0]?.code ?? "PBC", status: "Active" }
  ]);
  const [draft, setDraft] = useState<UserAdminEntry>({ id: "", name: "", email: "", title: "", role: "Writer", stores: session.stores[0]?.code ?? "", status: "Active" });

  function saveUser() {
    const id = draft.id || `user-${Date.now()}`;
    setUsers((current) => [{ ...draft, id }, ...current.filter((user) => user.id !== id)]);
    setDraft({ id: "", name: "", email: "", title: "", role: "Writer", stores: session.stores[0]?.code ?? "", status: "Active" });
  }

  return (
    <div className="legacy-user-admin-shell">
      <div className="legacy-user-admin-table-wrap">
        <table className="legacy-report-table">
          <thead><tr><th>Name</th><th>Email</th><th>Title</th><th>Role</th><th>Stores</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td><td>{user.email}</td><td>{user.title}</td><td><span className="legacy-chip tone-neutral">{user.role}</span></td><td>{user.stores}</td><td>{user.status}</td>
              <td><button className="legacy-task-status-button" onClick={() => setUsers((current) => current.map((candidate) => candidate.id === user.id ? { ...candidate, status: candidate.status === "Active" ? "Inactive" : "Active" } : candidate))} type="button">{user.status === "Active" ? "Deactivate" : "Activate"}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="legacy-user-admin-form workflow-grid">
        {(["name", "email", "title", "stores"] as const).map((field) => <label className="workflow-field" key={field}><span>{field}</span><input onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} value={draft[field]} /></label>)}
        <label className="workflow-field"><span>Role</span><select onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as UserAdminEntry["role"] }))} value={draft.role}>{["Admin", "Manager", "Writer", "Tech"].map((role) => <option key={role}>{role}</option>)}</select></label>
        <label className="workflow-field"><span>Status</span><select onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as UserAdminEntry["status"] }))} value={draft.status}>{["Active", "Inactive"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <button className="legacy-task-status-button" onClick={saveUser} type="button">Save User</button>
      </div>
    </div>
  );
}

function CrmPipelinePanel() {
  const [leads, setLeads] = useState([
    { id: "lead-1", customer: "Jordan Smith", source: "Website", interest: "Bennington 22 SXSB", stage: "New", lastTouch: "Today", owner: "Sales Desk", nextAction: "Call by 3 PM" },
    { id: "lead-2", customer: "Avery Nelson", source: "Boat Show", interest: "Cobalt R6", stage: "Appointment", lastTouch: "Yesterday", owner: "Roger", nextAction: "Demo ride" },
    { id: "lead-3", customer: "Casey Morgan", source: "Service", interest: "Trade appraisal", stage: "Quoted", lastTouch: "2d ago", owner: "Miles", nextAction: "Send worksheet" }
  ]);
  const [selectedLeadId, setSelectedLeadId] = useState("lead-1");
  const [draft, setDraft] = useState({ customer: "", source: "Website", interest: "", stage: "New", owner: "Sales Desk", nextAction: "" });
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0];

  function exportCsv() {
    const csv = ["Customer,Source,Interest,Stage,Last Touch,Owner,Next Action", ...leads.map((lead) => [lead.customer, lead.source, lead.interest, lead.stage, lead.lastTouch, lead.owner, lead.nextAction].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crm-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="legacy-crm-shell">
      <div className="legacy-crm-toolbar"><button className="legacy-task-status-button" onClick={exportCsv} type="button">CSV Export</button></div>
      <div className="legacy-crm-pipeline">{["New", "Contacted", "Appointment", "Quoted", "Won", "Lost"].map((stage) => <section className="legacy-crm-stage" key={stage}><h4>{stage}</h4>{leads.filter((lead) => lead.stage === stage).map((lead) => <button className="legacy-crm-card" key={lead.id} onClick={() => setSelectedLeadId(lead.id)} type="button"><strong>{lead.customer}</strong><span>{lead.interest}</span><small>{lead.nextAction}</small></button>)}</section>)}</div>
      <aside className="legacy-crm-detail"><h3>{selectedLead?.customer ?? "Lead"}</h3><p>{selectedLead?.source} · {selectedLead?.owner}</p><div className="legacy-crm-timeline"><span>Last touch: {selectedLead?.lastTouch}</span><span>Linked unit: {selectedLead?.interest}</span><span>Next: {selectedLead?.nextAction}</span></div></aside>
      <div className="legacy-crm-form workflow-grid">
        {(["customer", "source", "interest", "owner", "nextAction"] as const).map((field) => <label className="workflow-field" key={field}><span>{field}</span><input onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} value={draft[field]} /></label>)}
        <label className="workflow-field"><span>Stage</span><select onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))} value={draft.stage}>{["New", "Contacted", "Appointment", "Quoted", "Won", "Lost"].map((stage) => <option key={stage}>{stage}</option>)}</select></label>
        <button className="legacy-task-status-button" onClick={() => setLeads((current) => [{ id: `lead-${Date.now()}`, lastTouch: "Just now", ...draft }, ...current])} type="button">Add Lead</button>
      </div>
    </div>
  );
}

export const fiProductLibrary = [
  { id: "warranty", name: "Extended Warranty", provider: "Protective", cost: 950, retail: 1895, term: "60 mo", taxable: true, active: true },
  { id: "gap", name: "GAP", provider: "DealerGuard", cost: 225, retail: 695, term: "Loan", taxable: false, active: true },
  { id: "tire", name: "Tire/Wheel", provider: "RoadVantage", cost: 180, retail: 595, term: "36 mo", taxable: true, active: true },
  { id: "appearance", name: "Appearance Protection", provider: "MarineShield", cost: 320, retail: 995, term: "48 mo", taxable: true, active: true },
  { id: "maintenance", name: "Maintenance Plan", provider: "Premier Care", cost: 650, retail: 1495, term: "36 mo", taxable: false, active: true }
];

function FiProductsLibraryPanel() {
  return (
    <div className="legacy-fi-products-library">
      <table className="legacy-report-table">
        <thead><tr><th>Product</th><th>Provider</th><th>Cost</th><th>Retail</th><th>Term</th><th>Margin</th><th>Taxable</th><th>Active</th></tr></thead>
        <tbody>{fiProductLibrary.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.provider}</td><td>{formatCurrencyCompact(product.cost)}</td><td>{formatCurrencyCompact(product.retail)}</td><td>{product.term}</td><td>{formatCurrencyCompact(product.retail - product.cost)}</td><td>{product.taxable ? "Yes" : "No"}</td><td>{product.active ? "Active" : "Inactive"}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function RealReportPanel({ reportId, serviceRows, partsRows, salesRows }: { reportId: string; serviceRows: ServiceWorkspaceRow[]; partsRows: PartsWorkspaceRow[]; salesRows: SalesWorkspaceRow[] }) {
  const isSample = serviceRows.length === 0 && partsRows.length === 0 && salesRows.length === 0;
  const rows = buildReportRows(reportId, serviceRows, partsRows, salesRows);

  return (
    <div className="legacy-report-real-panel">
      {isSample && <div className="legacy-workbench-notice">Sample view: visit Sales, Service, or Parts first to hydrate live in-memory rows.</div>}
      <table className="legacy-report-table">
        <thead><tr>{rows.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function buildReportRows(reportId: string, serviceRows: ServiceWorkspaceRow[], partsRows: PartsWorkspaceRow[], salesRows: SalesWorkspaceRow[]) {
  if (reportId === "service-revenue") {
    const rows = serviceRows.length ? serviceRows : [{ roStatus: "Open", category: "Sample", orderType: "Repair Order" } as ServiceWorkspaceRow];
    return { headers: ["Period", "RO Count", "Closed/Ready", "Estimated Revenue"], rows: [["Current", `${rows.length}`, `${rows.filter((row) => ["Closed", "Ready to Cash"].includes(row.roStatus)).length}`, formatCurrencyCompact(rows.length * 1250)]] };
  }
  if (reportId === "parts-movement") {
    const totalCost = partsRows.reduce((total, row) => total + parseCurrencyNumber(row.orderCost), 0);
    return { headers: ["Lines", "Order Cost", "Estimated Retail", "Margin"], rows: [[`${partsRows.length || 12}`, formatCurrencyCompact(totalCost || 4200), formatCurrencyCompact((totalCost || 4200) * 1.38), `${Math.round(((totalCost || 4200) * 0.38) / ((totalCost || 4200) * 1.38) * 100)}%`]] };
  }
  if (reportId === "tech-hours") {
    const writers = new Map<string, number>();
    (serviceRows.length ? serviceRows : [{ serviceWriter: "Sample Tech" } as ServiceWorkspaceRow]).forEach((row) => writers.set(row.serviceWriter, (writers.get(row.serviceWriter) ?? 0) + 1));
    return { headers: ["Technician/Writer", "ROs", "Efficiency"], rows: [...writers].map(([writer, count]) => [writer, `${count}`, `${Math.min(98, 72 + count * 6)}%`]) };
  }
  if (reportId === "inventory-aging") {
    const rows = serviceRows.length ? serviceRows : [{ roNumber: "Sample", inDate: "01/01/2024", roStatus: "Open", customerName: "Sample Customer" } as ServiceWorkspaceRow];
    return { headers: ["RO", "Customer", "In Date", "Status"], rows: rows.slice(0, 8).map((row) => [row.roNumber, row.customerName, row.inDate, row.roStatus]) };
  }
  return { headers: ["Metric", "Count", "Value"], rows: [["Sales Rows", `${salesRows.length}`, formatCurrencyCompact(salesRows.reduce((total, row) => total + parseCurrencyNumber(row.cashPrice), 0))]] };
}

function parseCurrencyNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrencyCompact(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function ReportCenterWorkspace({ auditLog, partsRows, salesRows, serviceRows, session }: ReportCenterProps) {
  const reports = [
    { id: "service-revenue", label: "RO Revenue by Period", category: "Service" },
    { id: "parts-movement", label: "Parts Margin Summary", category: "Parts" },
    { id: "sales-pipeline", label: "Sales Pipeline", category: "Sales" },
    { id: "tech-hours", label: "Technician Efficiency", category: "Service" },
    { id: "inventory-aging", label: "Open RO Aging", category: "Service" },
    { id: "deal-gross", label: "Deal Gross Report", category: "Sales" },
  ];
  const [activeSection, setActiveSection] = useState<ReportCenterSection>("reports");
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState("");
  const selected = reports.find(r => r.id === activeReport);
  const filteredAudit = auditFilter.trim()
    ? auditLog.filter(e => e.label.toLowerCase().includes(auditFilter.toLowerCase()) || (e.detail ?? "").toLowerCase().includes(auditFilter.toLowerCase()))
    : auditLog;

  const sidebarSections: Array<{ id: ReportCenterSection; label: string; group?: string }> = [
    { id: "reports", label: "Reports", group: "Reporting" },
    { id: "vendors", label: "Vendors" },
    { id: "pricing", label: "Pricing Matrix" },
    { id: "campaigns", label: "Campaigns" },
    { id: "crm", label: "CRM / Leads" },
    { id: "audit", label: "Audit Trail" },
    { id: "approvals", label: "Approvals", group: "Workflow" },
    { id: "users", label: "Users" },
    { id: "fi-products", label: "F&I Products" },
    { id: "documents", label: "Documents" },
    { id: "tasks", label: "Tasks" },
    { id: "exceptions", label: "Exceptions" },
    { id: "data-tools", label: "Data Tools", group: "Admin" },
    { id: "preferences", label: "Preferences" },
    { id: "system-health", label: "System Health" },
    { id: "notifications", label: "Notifications" },
  ];

  return (
    <div className="legacy-report-workspace">
      <div className="legacy-report-sidebar">
        {sidebarSections.map(s => (
          <div key={s.id}>
            {s.group && <div className="legacy-report-sidebar-group">{s.group}</div>}
            <button
              className={`legacy-report-sidebar-item${activeSection === s.id ? " is-active" : ""}`}
              onClick={() => setActiveSection(s.id)}
              type="button"
            >
              <span className="legacy-report-sidebar-category">{s.label}</span>
            </button>
            {s.id === "reports" && activeSection === "reports" && reports.map(r => (
              <button
                className={`legacy-report-sidebar-item${activeReport === r.id ? " is-active" : ""}`}
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                style={{ paddingLeft: 20 }}
                type="button"
              >
                <span className="legacy-report-sidebar-category">{r.category}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="legacy-report-main" style={{ overflow: "hidden", padding: 0 }}>
        {activeSection === "reports" && (
          selected ? (
            <div style={{ padding: 16 }}>
              <div className="legacy-report-main-header">{selected.label}</div>
              <RealReportPanel partsRows={partsRows} reportId={selected.id} salesRows={salesRows} serviceRows={serviceRows} />
            </div>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", marginTop: 32, textAlign: "center" }}>
              Select a report from the sidebar to get started.
            </div>
          )
        )}
        {activeSection === "vendors" && <VendorManagementPanel />}
        {activeSection === "pricing" && <PricingMatrixPanel />}
        {activeSection === "campaigns" && <CampaignPanel />}
        {activeSection === "crm" && <CrmPipelinePanel />}
        {activeSection === "approvals" && <ApprovalWorkflowCenter />}
        {activeSection === "users" && <UserAdminPanel session={session} />}
        {activeSection === "fi-products" && <FiProductsLibraryPanel />}
        {activeSection === "documents" && <DocumentCenter />}
        {activeSection === "tasks" && <InternalTaskQueuePanel />}
        {activeSection === "exceptions" && <ExceptionDashboard />}
        {activeSection === "data-tools" && <DataToolsPanel />}
        {activeSection === "preferences" && <NotificationPreferencesPanel />}
        {activeSection === "system-health" && <SystemHealthPanel />}
        {activeSection === "notifications" && <NotificationTemplatesPanel />}
        {activeSection === "audit" && (
          <div style={{ padding: 16, overflow: "auto" }}>
            <div style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                onChange={e => setAuditFilter(e.target.value)}
                placeholder="Filter by action or detail…"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "inherit", flex: 1, fontSize: "0.82rem", padding: "5px 10px" }}
                type="text"
                value={auditFilter}
              />
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem" }}>{filteredAudit.length} entries</span>
            </div>
            {filteredAudit.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem", marginTop: 24, textAlign: "center" }}>No audit entries yet.</div>
            ) : (
              <table className="legacy-audit-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Detail</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map(entry => (
                    <tr className={`legacy-audit-row-${entry.tone ?? "neutral"}`} key={entry.id}>
                      <td className="legacy-audit-time">{entry.timeLabel}</td>
                      <td>{entry.label}</td>
                      <td>{entry.detail ?? "—"}</td>
                      <td className="legacy-audit-actor">{entry.actorName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
