import { useEffect, useMemo, useState } from "react";

type ManagementActivityStatus = "Successful" | "Erroneous" | "Pending" | "In Process";
type ManagementActivityViewMode = "needsAttention" | "allActivity";

interface ManagementActivityRow {
  id: string;
  status: ManagementActivityStatus;
  documentType: string;
  documentNumber: string;
  commonInvoiceNumber: string;
  postedAt: string;
  sourceQueue: string;
  owner: string;
  detail: string;
  attentionReason?: string;
}

const managementActivityRows: ManagementActivityRow[] = [
  {
    id: "ma-600836",
    status: "Successful",
    documentType: "Part Invoice",
    documentNumber: "600836",
    commonInvoiceNumber: "600836",
    postedAt: "05/26/2026 04:11 PM",
    sourceQueue: "Parts billing",
    owner: "Parts accounting",
    detail: "Part invoice posted cleanly into inventory and receivables with no mismatch flags."
  },
  {
    id: "ma-600835",
    status: "Successful",
    documentType: "Part Invoice",
    documentNumber: "600835",
    commonInvoiceNumber: "600835",
    postedAt: "05/26/2026 03:22 PM",
    sourceQueue: "Parts billing",
    owner: "Parts accounting",
    detail: "Accessory sale posted with matching part cost and retail extension."
  },
  {
    id: "ma-600834",
    status: "Successful",
    documentType: "Part Invoice",
    documentNumber: "600834",
    commonInvoiceNumber: "600834",
    postedAt: "05/26/2026 02:57 PM",
    sourceQueue: "Parts billing",
    owner: "Parts accounting",
    detail: "Invoice released from staging and carried through the daily close batch."
  },
  {
    id: "ma-600833",
    status: "Successful",
    documentType: "Part Invoice",
    documentNumber: "600833",
    commonInvoiceNumber: "600833",
    postedAt: "05/26/2026 02:44 PM",
    sourceQueue: "Parts billing",
    owner: "Parts accounting",
    detail: "Retail invoice posted after will-call pickup confirmation."
  },
  {
    id: "ma-tra-072c",
    status: "Successful",
    documentType: "Trade Purchase",
    documentNumber: "6002490",
    commonInvoiceNumber: "TRA-072C",
    postedAt: "05/26/2026 01:37 PM",
    sourceQueue: "Inventory acquisition",
    owner: "Sales desk",
    detail: "Trade purchase entry moved into used inventory with valuation attached."
  },
  {
    id: "ma-32993",
    status: "Successful",
    documentType: "Major Unit Transfer",
    documentNumber: "32993",
    commonInvoiceNumber: "",
    postedAt: "05/26/2026 01:29 PM",
    sourceQueue: "Inter-store transfers",
    owner: "Inventory control",
    detail: "Major unit transfer approved and queued for receiving acknowledgment."
  },
  {
    id: "ma-32992",
    status: "In Process",
    documentType: "Major Unit Receiving",
    documentNumber: "32992",
    commonInvoiceNumber: "",
    postedAt: "05/26/2026 01:29 PM",
    sourceQueue: "Receiving dock",
    owner: "Inventory control",
    detail: "Receiving inspection is still open while final photos and checklist items upload.",
    attentionReason: "Final inspection still open"
  },
  {
    id: "ma-32991",
    status: "Successful",
    documentType: "Major Unit Receiving",
    documentNumber: "32991",
    commonInvoiceNumber: "",
    postedAt: "05/26/2026 01:29 PM",
    sourceQueue: "Receiving dock",
    owner: "Inventory control",
    detail: "Receiving completed and stock availability opened for merchandising."
  },
  {
    id: "ma-32899",
    status: "Pending",
    documentType: "Major Unit Transfer",
    documentNumber: "32899",
    commonInvoiceNumber: "",
    postedAt: "05/26/2026 01:29 PM",
    sourceQueue: "Inter-store transfers",
    owner: "Inventory control",
    detail: "Transfer is waiting on destination store acceptance before posting can close.",
    attentionReason: "Awaiting destination acceptance"
  },
  {
    id: "ma-2561010",
    status: "Successful",
    documentType: "Repair Order",
    documentNumber: "2561010",
    commonInvoiceNumber: "51880391",
    postedAt: "05/26/2026 01:05 PM",
    sourceQueue: "Service closeout",
    owner: "Service accounting",
    detail: "Repair order invoiced and closed with labor, parts, and tax totals in balance."
  },
  {
    id: "ma-600028",
    status: "Successful",
    documentType: "Part Invoice",
    documentNumber: "600028",
    commonInvoiceNumber: "600028",
    postedAt: "05/26/2026 01:05 PM",
    sourceQueue: "Parts billing",
    owner: "Parts accounting",
    detail: "Counter sale invoice posted after card settlement confirmation."
  },
  {
    id: "ma-2561046",
    status: "Erroneous",
    documentType: "Repair Order",
    documentNumber: "2561046",
    commonInvoiceNumber: "51867178",
    postedAt: "05/26/2026 11:24 AM",
    sourceQueue: "Service closeout",
    owner: "Warranty clerk",
    detail: "Repair order posting failed because the sublet cost extension exceeded the approved claim amount.",
    attentionReason: "Sublet claim variance"
  },
  {
    id: "ma-73",
    status: "Successful",
    documentType: "Inventory Update",
    documentNumber: "73",
    commonInvoiceNumber: "",
    postedAt: "05/26/2026 10:54 AM",
    sourceQueue: "Inventory maintenance",
    owner: "Inventory control",
    detail: "Inventory quantity and cost layers refreshed from the morning stock update."
  },
  {
    id: "ma-32891",
    status: "Successful",
    documentType: "Major Unit Transfer Receive",
    documentNumber: "32891",
    commonInvoiceNumber: "",
    postedAt: "05/26/2026 10:36 AM",
    sourceQueue: "Receiving dock",
    owner: "Inventory control",
    detail: "Transfer receipt confirmed and destination serial record activated."
  },
  {
    id: "ma-32896",
    status: "Pending",
    documentType: "Major Unit Transfer Receive",
    documentNumber: "32896",
    commonInvoiceNumber: "",
    postedAt: "05/26/2026 10:29 AM",
    sourceQueue: "Receiving dock",
    owner: "Inventory control",
    detail: "Receipt is waiting on final freight-damage signoff.",
    attentionReason: "Freight-damage signoff pending"
  },
  {
    id: "ma-87365769886636409",
    status: "Successful",
    documentType: "Part Receiving Document",
    documentNumber: "87365769886636409",
    commonInvoiceNumber: "4378 - MJJ MARINE INTER-STORE PARTS XFER",
    postedAt: "05/26/2026 10:23 AM",
    sourceQueue: "Parts receiving",
    owner: "Receiving",
    detail: "Inter-store parts receiving posted with no cost discrepancy."
  },
  {
    id: "ma-87356570181272828",
    status: "Erroneous",
    documentType: "Part Receiving Document",
    documentNumber: "87356570181272828",
    commonInvoiceNumber: "8678261 - DONOVAN MARINE D01791",
    postedAt: "05/26/2026 09:52 AM",
    sourceQueue: "Parts receiving",
    owner: "Receiving",
    detail: "Receiving document is held because one line posted to a missing vendor freight bucket.",
    attentionReason: "Missing vendor freight bucket"
  },
  {
    id: "ma-873565009074146859",
    status: "Successful",
    documentType: "Part Receiving Document",
    documentNumber: "873565009074146859",
    commonInvoiceNumber: "8675294 - DONOVAN MARINE D01791",
    postedAt: "05/26/2026 09:41 AM",
    sourceQueue: "Parts receiving",
    owner: "Receiving",
    detail: "Receiving batch balanced against the vendor pack slip and inventory landed cost."
  },
  {
    id: "ma-600023",
    status: "Successful",
    documentType: "Part Invoice",
    documentNumber: "600023",
    commonInvoiceNumber: "600023",
    postedAt: "05/26/2026 09:13 AM",
    sourceQueue: "Parts billing",
    owner: "Parts accounting",
    detail: "Invoice moved into the day-start billing export without exception."
  },
  {
    id: "ma-pur-009abc",
    status: "Pending",
    documentType: "Major Unit Receiving to AP",
    documentNumber: "87356846286124776",
    commonInvoiceNumber: "PUR-009ABC",
    postedAt: "05/26/2026 12:00 AM",
    sourceQueue: "AP staging",
    owner: "Accounts payable",
    detail: "AP receiving is waiting on landed-cost approval before voucher creation.",
    attentionReason: "Landed-cost approval pending"
  },
  {
    id: "ma-gkw1012349caadju",
    status: "Erroneous",
    documentType: "Major Unit Receiving to AP",
    documentNumber: "87358782569127417",
    commonInvoiceNumber: "GKW1012349 CA ADJ",
    postedAt: "05/26/2026 12:00 AM",
    sourceQueue: "AP staging",
    owner: "Accounts payable",
    detail: "Adjustment document failed validation because the receiving total does not match the vendor memo.",
    attentionReason: "Vendor memo mismatch"
  },
  {
    id: "ma-51824233",
    status: "Successful",
    documentType: "Resolve Adjustment",
    documentNumber: "6002481",
    commonInvoiceNumber: "51824233",
    postedAt: "05/23/2026 04:59 PM",
    sourceQueue: "Accounting adjustments",
    owner: "Controller",
    detail: "Adjustment resolution posted and cleared the related exception queue item."
  },
  {
    id: "ma-6002480",
    status: "In Process",
    documentType: "Sales Deal Deposit",
    documentNumber: "6002480",
    commonInvoiceNumber: "SDE-2480",
    postedAt: "05/23/2026 03:41 PM",
    sourceQueue: "Sales cashiering",
    owner: "Sales accounting",
    detail: "Deal deposit is posted to the interim cash lane while bank match is still pending.",
    attentionReason: "Bank match still pending"
  },
  {
    id: "ma-6002478",
    status: "Successful",
    documentType: "Bank Deposits",
    documentNumber: "6002478",
    commonInvoiceNumber: "DEP-2478",
    postedAt: "05/23/2026 03:18 PM",
    sourceQueue: "Bank reconciliation",
    owner: "Treasury",
    detail: "Deposit slip matched and released to cash-clearing without open variance."
  },
  {
    id: "ma-6002471",
    status: "Erroneous",
    documentType: "AR Credit Card Payment",
    documentNumber: "6002471",
    commonInvoiceNumber: "CCP-2471",
    postedAt: "05/23/2026 01:09 PM",
    sourceQueue: "Receivables settlement",
    owner: "AR team",
    detail: "Card payment rejected because the merchant batch closeout was never finalized.",
    attentionReason: "Merchant batch not finalized"
  },
  {
    id: "ma-6002468",
    status: "Successful",
    documentType: "Click to Pay Payment",
    documentNumber: "6002468",
    commonInvoiceNumber: "CTP-2468",
    postedAt: "05/23/2026 12:34 PM",
    sourceQueue: "Digital payments",
    owner: "Receivables settlement",
    detail: "Customer payment token settled and matched to the open receivable."
  },
  {
    id: "ma-6002460",
    status: "Pending",
    documentType: "Rental Charges",
    documentNumber: "6002460",
    commonInvoiceNumber: "RNT-2460",
    postedAt: "05/23/2026 11:18 AM",
    sourceQueue: "Rental billing",
    owner: "Rental admin",
    detail: "Rental charge batch is waiting on fuel and damage add-on review.",
    attentionReason: "Fuel and damage review pending"
  },
  {
    id: "ma-6002458",
    status: "Successful",
    documentType: "Rental Revenue",
    documentNumber: "6002458",
    commonInvoiceNumber: "RNT-2458",
    postedAt: "05/23/2026 10:42 AM",
    sourceQueue: "Rental billing",
    owner: "Rental admin",
    detail: "Rental revenue posted into the daily revenue transfer with no exception."
  }
];

const managementActivityStatuses: Array<{ label: string; value: ManagementActivityStatus }> = [
  { label: "Successful Documents", value: "Successful" },
  { label: "Erroneous Documents", value: "Erroneous" },
  { label: "Pending Documents", value: "Pending" },
  { label: "In Process Documents", value: "In Process" }
];

const managementActivityDocumentTypes = Array.from(new Set(managementActivityRows.map((row) => row.documentType)));
const needsAttentionStatuses: ManagementActivityStatus[] = ["Erroneous", "Pending", "In Process"];
const agedIssueThresholdMs = 24 * 60 * 60 * 1000;
const managementActivityStatusPriority: Record<ManagementActivityStatus, number> = {
  Erroneous: 0,
  Pending: 1,
  "In Process": 2,
  Successful: 3
};

function createDefaultSelectedStatuses(): Record<ManagementActivityStatus, boolean> {
  return {
    Successful: true,
    Erroneous: true,
    Pending: true,
    "In Process": true
  };
}

function createEmptyStatusCounts(): Record<ManagementActivityStatus, number> {
  return {
    Successful: 0,
    Erroneous: 0,
    Pending: 0,
    "In Process": 0
  };
}

function parseManagementActivityDate(value: string) {
  const [datePart = "", timePart = "00:00", meridiem = "AM"] = value.split(" ");
  const [month = "1", day = "1", year = "1970"] = datePart.split("/");
  const [rawHours = "0", minutes = "0"] = timePart.split(":");
  let hours = Number.parseInt(rawHours, 10) % 12;

  if (meridiem.toUpperCase() === "PM") {
    hours += 12;
  }

  return new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10), hours, Number.parseInt(minutes, 10));
}

function getManagementActivityAgeMs(postedAt: string, referenceDate: Date) {
  return Math.max(referenceDate.getTime() - parseManagementActivityDate(postedAt).getTime(), 0);
}

function formatManagementActivityAge(ageMs: number) {
  const totalHours = Math.max(1, Math.floor(ageMs / (60 * 60 * 1000)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${totalHours}h`;
}

function formatManagementActivityStatusClass(status: ManagementActivityStatus) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function formatRefreshLabel(date: Date) {
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ManagementActivitiesWorkspace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [documentNumberOnly, setDocumentNumberOnly] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<ManagementActivityStatus, boolean>>(() => createDefaultSelectedStatuses());
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>(managementActivityDocumentTypes);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(managementActivityRows[0]?.id ?? null);
  const [isDetailOpen, setIsDetailOpen] = useState(true);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ManagementActivityViewMode>("needsAttention");
  const [refreshTime, setRefreshTime] = useState(() => new Date());

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const refreshLabel = useMemo(() => formatRefreshLabel(refreshTime), [refreshTime]);

  const searchScopedRows = useMemo(
    () =>
      managementActivityRows.filter((row) => {
        if (!selectedDocumentTypes.includes(row.documentType)) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        const searchableValues = documentNumberOnly
          ? [row.documentNumber, row.commonInvoiceNumber]
          : [row.status, row.documentType, row.documentNumber, row.commonInvoiceNumber, row.detail, row.owner, row.sourceQueue, row.attentionReason ?? ""];

        return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearchTerm));
      }),
    [documentNumberOnly, normalizedSearchTerm, selectedDocumentTypes]
  );

  const statusCounts = useMemo(() => {
    return managementActivityStatuses.reduce<Record<ManagementActivityStatus, number>>((counts, statusOption) => {
      counts[statusOption.value] = searchScopedRows.filter((row) => row.status === statusOption.value).length;
      return counts;
    }, createEmptyStatusCounts());
  }, [searchScopedRows]);

  const oldestIssueLabel = useMemo(() => {
    const oldestIssue = [...searchScopedRows]
      .filter((row) => needsAttentionStatuses.includes(row.status))
      .sort((leftRow, rightRow) => getManagementActivityAgeMs(rightRow.postedAt, refreshTime) - getManagementActivityAgeMs(leftRow.postedAt, refreshTime))[0];

    return oldestIssue ? formatManagementActivityAge(getManagementActivityAgeMs(oldestIssue.postedAt, refreshTime)) : "No open issues";
  }, [refreshTime, searchScopedRows]);

  const visibleRows = useMemo(() => {
    return [...searchScopedRows]
      .filter((row) => selectedStatuses[row.status])
      .filter((row) => viewMode === "allActivity" || row.status !== "Successful")
      .sort((leftRow, rightRow) => {
        const priorityDifference = managementActivityStatusPriority[leftRow.status] - managementActivityStatusPriority[rightRow.status];

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        if (leftRow.status === "Successful" && rightRow.status === "Successful") {
          return parseManagementActivityDate(rightRow.postedAt).getTime() - parseManagementActivityDate(leftRow.postedAt).getTime();
        }

        return getManagementActivityAgeMs(rightRow.postedAt, refreshTime) - getManagementActivityAgeMs(leftRow.postedAt, refreshTime);
      });
  }, [refreshTime, searchScopedRows, selectedStatuses, viewMode]);

  const activeStatusCount = Object.values(selectedStatuses).filter(Boolean).length;
  const activeKpiStatus =
    activeStatusCount === 1
      ? (Object.entries(selectedStatuses).find(([, isSelected]) => isSelected)?.[0] as ManagementActivityStatus | undefined) ?? null
      : null;
  const filterSummary = `${activeStatusCount} statuses, ${selectedDocumentTypes.length} document types selected${normalizedSearchTerm ? `, search: ${searchTerm}` : ""}`;

  useEffect(() => {
    setSelectedRowId((current) => {
      if (current && visibleRows.some((row) => row.id === current)) {
        return current;
      }

      return visibleRows[0]?.id ?? null;
    });
  }, [visibleRows]);

  const selectedRow = visibleRows.find((row) => row.id === selectedRowId) ?? null;

  function toggleStatus(status: ManagementActivityStatus) {
    setSelectedStatuses((current) => ({
      ...current,
      [status]: !current[status]
    }));
  }

  function toggleDocumentType(documentType: string) {
    setSelectedDocumentTypes((current) =>
      current.includes(documentType) ? current.filter((value) => value !== documentType) : [...current, documentType]
    );
  }

  function focusStatus(status: ManagementActivityStatus) {
    if (activeKpiStatus === status) {
      setSelectedStatuses(createDefaultSelectedStatuses());
      setViewMode("needsAttention");
      return;
    }

    setSelectedStatuses({
      Successful: false,
      Erroneous: false,
      Pending: false,
      "In Process": false,
      [status]: true
    });
    setViewMode(status === "Successful" ? "allActivity" : "needsAttention");
  }

  return (
    <div className="management-activities-page">
      <div className="management-activities-window-strip">
        <h2>Management Activities</h2>
      </div>

      <div className="management-activities-toolbar">
        <div className="management-activities-toolbar-actions">
          <button
            className="management-activities-toolbar-button"
            onClick={() => setRefreshTime(new Date())}
            type="button"
          >
            Refresh
          </button>
          <button className="management-activities-toolbar-button" onClick={() => setIsDetailOpen((current) => !current)} type="button">
            {isDetailOpen ? "Hide Detail" : "Show Detail"}
          </button>
        </div>
        <div className="management-activities-toolbar-meta">
          <span>Updated {refreshLabel}</span>
          <strong>Found: {visibleRows.length}</strong>
        </div>
      </div>

      <section className="management-activities-summary-shell">
        <div className="management-activities-view-row">
          <div className="management-activities-view-toggle" role="group" aria-label="Management activities view mode">
            <span>View</span>
            <button className={viewMode === "needsAttention" ? "is-active" : ""} onClick={() => setViewMode("needsAttention")} type="button">
              Needs Attention
            </button>
            <button className={viewMode === "allActivity" ? "is-active" : ""} onClick={() => setViewMode("allActivity")} type="button">
              All Activity
            </button>
          </div>
          <button className="management-activities-filter-toggle" onClick={() => setIsFiltersExpanded((current) => !current)} type="button">
            <strong>{isFiltersExpanded ? "Hide Filters" : "Show Filters"}</strong>
            <span>{filterSummary}</span>
          </button>
        </div>
      </section>

      <section className="management-activities-kpi-strip">
        {managementActivityStatuses.map((statusOption) => (
          <button
            className={`management-activities-kpi-card${activeKpiStatus === statusOption.value ? " is-active" : ""}`}
            key={statusOption.value}
            onClick={() => focusStatus(statusOption.value)}
            type="button"
          >
            <span>{statusOption.value}</span>
            <strong>{statusCounts[statusOption.value]}</strong>
          </button>
        ))}
        <div className="management-activities-kpi-card is-oldest-issue">
          <span>Oldest Issue</span>
          <strong>{oldestIssueLabel}</strong>
        </div>
      </section>

      {isFiltersExpanded ? (
        <section className="management-activities-filter-shell">
          <div className="management-activities-search-row">
            <label className="management-activities-search-field">
              <span>Search</span>
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search document, invoice, RO, PO, VIN, customer..."
                type="text"
                value={searchTerm}
              />
            </label>
            <label className="management-activities-document-toggle">
              <input checked={documentNumberOnly} onChange={(event) => setDocumentNumberOnly(event.target.checked)} type="checkbox" />
              <span>Document Number Only</span>
            </label>
          </div>

          <div className="management-activities-status-row">
            {managementActivityStatuses.map((statusOption) => (
              <label className="management-activities-status-toggle" key={statusOption.value}>
                <input checked={selectedStatuses[statusOption.value]} onChange={() => toggleStatus(statusOption.value)} type="checkbox" />
                <span>{statusOption.label}</span>
              </label>
            ))}
          </div>

          <div className="management-activities-document-panel">
            <div className="management-activities-document-actions">
              <button className="management-activities-mini-button" onClick={() => setSelectedDocumentTypes(managementActivityDocumentTypes)} type="button">
                Select All
              </button>
              <button className="management-activities-mini-button" onClick={() => setSelectedDocumentTypes([])} type="button">
                Clear All
              </button>
            </div>
            <div className="management-activities-document-grid">
              {managementActivityDocumentTypes.map((documentType) => (
                <label className="management-activities-document-type" key={documentType}>
                  <input checked={selectedDocumentTypes.includes(documentType)} onChange={() => toggleDocumentType(documentType)} type="checkbox" />
                  <span>{documentType}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {isDetailOpen && selectedRow ? (
        <section className="management-activities-detail-card">
          <div>
            <span className={`management-activities-status-chip is-${formatManagementActivityStatusClass(selectedRow.status)}`}>{selectedRow.status}</span>
            <strong>{selectedRow.documentType}</strong>
          </div>
          <div className="management-activities-detail-grid">
            <div>
              <span>Document Number</span>
              <strong>{selectedRow.documentNumber}</strong>
            </div>
            <div>
              <span>Common Invoice Number</span>
              <strong>{selectedRow.commonInvoiceNumber || "Not assigned"}</strong>
            </div>
            <div>
              <span>Queue</span>
              <strong>{selectedRow.sourceQueue}</strong>
            </div>
            <div>
              <span>Owner</span>
              <strong>{selectedRow.owner}</strong>
            </div>
            <div>
              <span>Age</span>
              <strong>{formatManagementActivityAge(getManagementActivityAgeMs(selectedRow.postedAt, refreshTime))}</strong>
            </div>
          </div>
          {selectedRow.attentionReason ? (
            <div className="management-activities-detail-alert">
              <span>Attention</span>
              <strong>{selectedRow.attentionReason}</strong>
            </div>
          ) : null}
          <p>{selectedRow.detail}</p>
        </section>
      ) : null}

      <section className="management-activities-grid-shell">
        <div className="management-activities-grid-wrap">
          <table className="management-activities-grid">
            <thead>
              <tr>
                <th>Status</th>
                <th>Document Type</th>
                <th>Document Number</th>
                <th>Common Invoice Number</th>
                <th>Age</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="management-activities-empty-state" colSpan={6}>
                    No documents match the current Management Activities filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const ageMs = getManagementActivityAgeMs(row.postedAt, refreshTime);
                  const ageLabel = formatManagementActivityAge(ageMs);
                  const isAgedIssue = row.status !== "Successful" && ageMs >= agedIssueThresholdMs;

                  return (
                    <tr
                      className={`${row.id === selectedRowId ? "is-selected" : ""}${isAgedIssue ? " is-aged-issue" : ""}`.trim() || undefined}
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                    >
                      <td>
                        <div className="management-activities-status-stack">
                          <span className={`management-activities-status-text is-${formatManagementActivityStatusClass(row.status)}`}>{row.status}</span>
                          {row.attentionReason ? <span className="management-activities-inline-reason">{row.attentionReason}</span> : null}
                        </div>
                      </td>
                      <td>{row.documentType}</td>
                      <td>
                        <button className="management-activities-document-link" onClick={() => setSelectedRowId(row.id)} type="button">
                          {row.documentNumber}
                        </button>
                      </td>
                      <td>{row.commonInvoiceNumber || "-"}</td>
                      <td className={`management-activities-age-cell${isAgedIssue ? " is-aged" : ""}`}>{ageLabel}</td>
                      <td>{row.postedAt}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}