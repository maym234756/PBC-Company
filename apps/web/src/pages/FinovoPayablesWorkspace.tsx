import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  createApproval,
  createVendor,
  getApprovals,
  getFinovoPayablesDashboard,
  getVendors,
  updateApproval,
  type ApprovalRequestRecord,
  type FinovoPayablesBillStatus,
  type FinovoPayablesDashboardResponse,
  type FinovoPayablesNavItem,
  type VendorRecord
} from "../api";

type BillFilter = "all" | "pendingApproval" | "dueSoon" | "overdue" | "paid";
type ComposerMode = "vendor" | "bill" | null;

interface VendorFormState {
  name: string;
  contact: string;
  phone: string;
  email: string;
  terms: string;
  leadDays: string;
  notes: string;
}

interface BillFormState {
  type: string;
  reference: string;
  requestedBy: string;
  amount: string;
  reason: string;
}

const quickActions = ["Enter Bill", "Approve Bills", "Schedule Payment", "Pay Bills", "Add Vendor", "Upload Bills"];
const fallbackNavItems: FinovoPayablesNavItem[] = [
  { id: "home", label: "Home", badge: null },
  { id: "bills", label: "Bills", badge: null },
  { id: "expenses", label: "Expenses", badge: null },
  { id: "vendors", label: "Vendors", badge: null },
  { id: "approvals", label: "Approvals", badge: null },
  { id: "payments", label: "Payments", badge: null },
  { id: "1099s", label: "1099s", badge: null },
  { id: "reports", label: "Reports", badge: null },
  { id: "cashflow", label: "Cash Flow", badge: null },
  { id: "settings", label: "Settings", badge: null }
];

const initialVendorFormState: VendorFormState = {
  name: "",
  contact: "",
  phone: "",
  email: "",
  terms: "Net 30",
  leadDays: "5",
  notes: ""
};

const initialBillFormState: BillFormState = {
  type: "Bill Approval",
  reference: "",
  requestedBy: "",
  amount: "",
  reason: ""
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency"
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency"
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatCompactCurrency(value: number) {
  return compactCurrencyFormatter.format(value);
}

function formatLongDate(value: string | Date) {
  return shortDateFormatter.format(value instanceof Date ? value : new Date(value));
}

function parseCurrencyAmount(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPolylinePoints(values: number[], width: number, height: number, minValue: number, maxValue: number) {
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - minValue) / (maxValue - minValue || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildAreaPath(points: string, width: number, height: number) {
  const pointPairs = points.split(" ").filter(Boolean);

  if (pointPairs.length === 0) {
    return `M 0 ${height} L ${width} ${height} Z`;
  }

  const [firstX] = pointPairs[0].split(",");
  const lineCommands = pointPairs
    .map((point) => {
      const [x, y] = point.split(",");
      return `L ${x} ${y}`;
    })
    .join(" ");

  return `M ${firstX} ${height} ${lineCommands} L ${width} ${height} Z`;
}

function getNavGlyph(itemId: string) {
  switch (itemId) {
    case "home":
      return "HM";
    case "bills":
      return "BL";
    case "expenses":
      return "EX";
    case "vendors":
      return "VD";
    case "approvals":
      return "AP";
    case "payments":
      return "PY";
    case "1099s":
      return "10";
    case "reports":
      return "RP";
    case "cashflow":
      return "CF";
    default:
      return "ST";
  }
}

function statusTone(status: FinovoPayablesBillStatus) {
  switch (status) {
    case "Pending Approval":
      return "warning";
    case "Due Soon":
      return "info";
    case "Overdue":
      return "danger";
    case "Paid":
      return "success";
  }
}

function normalizeApprovalWorkflowStatus(status: string) {
  return status.trim().toLowerCase();
}

function isApprovalPendingReview(status: string) {
  const normalized = normalizeApprovalWorkflowStatus(status);
  return normalized !== "approved" && normalized !== "scheduled" && normalized !== "paid";
}

function isApprovalSchedulable(status: string) {
  return normalizeApprovalWorkflowStatus(status) === "approved";
}

function isApprovalPayable(status: string) {
  const normalized = normalizeApprovalWorkflowStatus(status);
  return normalized === "approved" || normalized === "scheduled";
}

function resolveViewMeta(activeNavId: string) {
  switch (activeNavId) {
    case "bills":
      return {
        title: "Bills Workspace",
        description: "Work the full bill list, status filters, and approval-linked items from one queue",
        searchLabel: "Search vendors, invoices, or payment methods"
      };
    case "expenses":
      return {
        title: "Expense Signals",
        description: "Monitor vendor concentration, operational outflow, and discount capture across the AP stack",
        searchLabel: "Search expense vendors or notes"
      };
    case "vendors":
      return {
        title: "Vendor Directory",
        description: "Manage supplier records, payment terms, and contact coverage with live store data",
        searchLabel: "Search vendors, contacts, emails, or terms"
      };
    case "approvals":
      return {
        title: "Approval Desk",
        description: "Review pending approvals, create new bill approvals, and clear review queues",
        searchLabel: "Search approvals, invoices, or reasons"
      };
    case "payments":
      return {
        title: "Payments Lane",
        description: "Track upcoming outflows, completed disbursements, and payment-timing risk",
        searchLabel: "Search paid or scheduled bills"
      };
    case "1099s":
      return {
        title: "1099 Coverage",
        description: "Audit vendor readiness for tax reporting and identify missing contact or terms data",
        searchLabel: "Search vendors for 1099 readiness"
      };
    case "reports":
      return {
        title: "Reports Board",
        description: "Review aging, performance, and vendor concentration in one reporting surface",
        searchLabel: "Search report metrics or vendors"
      };
    case "cashflow":
      return {
        title: "Cash Flow Planner",
        description: "Focus on payables forecast and near-term cash pressure without the broader dashboard clutter",
        searchLabel: "Search forecast labels or bill timing"
      };
    case "settings":
      return {
        title: "Finovo Settings",
        description: "Stage operational defaults, review cadence, and rollout notes for the payables team",
        searchLabel: "Search settings or rollout notes"
      };
    default:
      return {
        title: "Payables Hub",
        description: "Manage bills, vendors, approvals, and payment timing from one API-backed AP command center",
        searchLabel: "Search vendors, bills, or invoices"
      };
  }
}

interface FinovoPayablesWorkspaceProps {
  storeId: string;
  storeName: string;
}

export function FinovoPayablesWorkspace({ storeId, storeName }: FinovoPayablesWorkspaceProps) {
  const [dashboard, setDashboard] = useState<FinovoPayablesDashboardResponse | null>(null);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeNavId, setActiveNavId] = useState("home");
  const [activeComposer, setActiveComposer] = useState<ComposerMode>(null);
  const [billFilter, setBillFilter] = useState<BillFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusNotice, setStatusNotice] = useState("Loading live Finovo payables data...");
  const [vendorForm, setVendorForm] = useState<VendorFormState>(initialVendorFormState);
  const [billForm, setBillForm] = useState<BillFormState>(initialBillFormState);

  async function loadFinovoData(options?: { showSpinner?: boolean; syncStatusNotice?: boolean }) {
    const showSpinner = options?.showSpinner ?? true;
    const syncStatusNotice = options?.syncStatusNotice ?? true;

    if (showSpinner) {
      setIsLoading(true);
    }

    setErrorMessage(null);

    try {
      const [nextDashboard, nextVendors, nextApprovals] = await Promise.all([
        getFinovoPayablesDashboard(storeId),
        getVendors(storeId),
        getApprovals(storeId)
      ]);

      setDashboard(nextDashboard);
      setVendors(nextVendors);
      setApprovals(nextApprovals);

      if (syncStatusNotice) {
        setStatusNotice(nextDashboard.statusNotice);
      }

      return { nextDashboard, nextVendors, nextApprovals };
    } catch (error) {
      setDashboard(null);
      setVendors([]);
      setApprovals([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load Finovo payables data.");

      if (syncStatusNotice) {
        setStatusNotice("Finovo could not load live data from the API.");
      }

      return null;
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    setActiveNavId("home");
    setActiveComposer(null);
    setBillFilter("all");
    setSearchTerm("");
    setVendorForm(initialVendorFormState);
    setBillForm(initialBillFormState);
    void loadFinovoData({ showSpinner: true, syncStatusNotice: true });
  }, [storeId]);

  const navItems = dashboard?.navItems ?? fallbackNavItems;
  const bills = dashboard?.bills ?? [];
  const activeNavItem = navItems.find((item) => item.id === activeNavId) ?? navItems[0] ?? fallbackNavItems[0];
  const viewMeta = resolveViewMeta(activeNavId);
  const billByInvoiceNumber = useMemo(() => new Map(bills.map((bill) => [bill.invoiceNumber, bill])), [bills]);

  const filteredBills = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return bills.filter((bill) => {
      const matchesFilter =
        billFilter === "all"
          ? true
          : billFilter === "pendingApproval"
            ? bill.status === "Pending Approval"
            : billFilter === "dueSoon"
              ? bill.status === "Due Soon"
              : billFilter === "overdue"
                ? bill.status === "Overdue"
                : bill.status === "Paid";

      const matchesSearch =
        normalizedSearch.length === 0 ||
        `${bill.vendor} ${bill.invoiceNumber} ${bill.paymentMethod} ${bill.billDate} ${bill.dueDate}`.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [billFilter, bills, searchTerm]);

  const filteredVendors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return vendors.filter((vendor) => {
      if (normalizedSearch.length === 0) {
        return true;
      }

      return `${vendor.name} ${vendor.contact} ${vendor.email} ${vendor.terms} ${vendor.notes}`.toLowerCase().includes(normalizedSearch);
    });
  }, [searchTerm, vendors]);

  const filteredApprovals = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return approvals.filter((approval) => {
      if (normalizedSearch.length === 0) {
        return true;
      }

      return `${approval.requestedBy} ${approval.reference} ${approval.reason} ${approval.status} ${approval.impact}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [approvals, searchTerm]);

  const pendingApprovals = approvals.filter((approval) => isApprovalPendingReview(approval.status));
  const schedulableApprovals = approvals.filter((approval) => isApprovalSchedulable(approval.status));
  const payableApprovals = approvals.filter((approval) => isApprovalPayable(approval.status));
  const homeApprovals = pendingApprovals.slice(0, 3);
  const paidBills = filteredBills.filter((bill) => bill.status === "Paid");
  const upcomingBills = filteredBills.filter((bill) => bill.status === "Due Soon" || bill.status === "Pending Approval");
  const maxVendorSpend = Math.max(...(dashboard?.vendorSpend.map((item) => item.spend) ?? [1]));
  const averageLeadDays = vendors.length > 0 ? Math.round(vendors.reduce((sum, vendor) => sum + vendor.leadDays, 0) / vendors.length) : 0;
  const donutSegments = dashboard?.statusBreakdown ?? [];

  const donutStyle = useMemo<CSSProperties>(() => {
    let currentDegree = 0;
    const totalAmount = donutSegments.reduce((sum, item) => sum + item.amount, 0);
    const stops = donutSegments.map((segment) => {
      const degrees = totalAmount === 0 ? 0 : (segment.amount / totalAmount) * 360;
      const stop = `${segment.color} ${currentDegree}deg ${currentDegree + degrees}deg`;
      currentDegree += degrees;
      return stop;
    });

    return {
      background: `conic-gradient(${stops.join(", ")})`
    };
  }, [donutSegments]);

  const cashInSeries = (dashboard?.cashFlowForecast.points ?? []).map((point) => Math.round(point.cashIn / 1000));
  const cashOutSeries = (dashboard?.cashFlowForecast.points ?? []).map((point) => -Math.round(point.cashOut / 1000));
  const chartLabels = (dashboard?.cashFlowForecast.points ?? []).map((point) => point.label);
  const chartMin = Math.min(-200, ...(cashOutSeries.length > 0 ? cashOutSeries : [-200]));
  const chartMax = Math.max(400, ...(cashInSeries.length > 0 ? cashInSeries : [400]));
  const cashChartPointsIn = buildPolylinePoints(cashInSeries, 460, 170, chartMin, chartMax);
  const cashChartPointsOut = buildPolylinePoints(cashOutSeries, 460, 170, chartMin, chartMax);
  const cashChartAreaIn = buildAreaPath(cashChartPointsIn, 460, 170);
  const cashChartAreaOut = buildAreaPath(cashChartPointsOut, 460, 170);
  const zeroLineY = 170 - ((0 - chartMin) / (chartMax - chartMin || 1)) * 170;

  function syncBillFilterForNav(itemId: string) {
    if (itemId === "approvals") {
      setBillFilter("pendingApproval");
      return;
    }

    if (itemId === "payments") {
      setBillFilter("paid");
      return;
    }

    if (itemId === "cashflow") {
      setBillFilter("dueSoon");
      return;
    }

    if (itemId === "bills" || itemId === "home" || itemId === "vendors" || itemId === "reports") {
      setBillFilter("all");
    }
  }

  function handleNavSelect(itemId: string) {
    setActiveNavId(itemId);
    syncBillFilterForNav(itemId);

    setActiveComposer((current) => {
      if (current === "vendor" && itemId !== "vendors") {
        return null;
      }

      if (current === "bill" && itemId !== "approvals" && itemId !== "bills" && itemId !== "home") {
        return null;
      }

      return current;
    });
  }

  function openVendorComposer() {
    setActiveNavId("vendors");
    setActiveComposer("vendor");
    setVendorForm(initialVendorFormState);
    setStatusNotice("Vendor creation is ready with the live vendor API.");
  }

  function openBillComposer() {
    setActiveNavId("approvals");
    setBillFilter("pendingApproval");
    setActiveComposer("bill");
    setBillForm({
      ...initialBillFormState,
      requestedBy: vendors[0]?.name ?? ""
    });
    setStatusNotice("Bill entry is routed through the live approval request API.");
  }

  async function handleReviewApproval(approval: ApprovalRequestRecord) {
    if (!isApprovalPendingReview(approval.status)) {
      setStatusNotice(`${approval.requestedBy} / ${approval.reference} is already approved.`);
      return;
    }

    setIsSubmittingAction(true);

    try {
      await updateApproval(storeId, approval.id, {
        status: "Approved",
        reviewedBy: "Finovo AP Desk",
        reviewNote: "Approved from the Finovo approval desk."
      });
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setStatusNotice(`${approval.requestedBy} / ${approval.reference} was approved.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to approve the selected bill.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleScheduleApproval(approval: ApprovalRequestRecord) {
    if (!isApprovalSchedulable(approval.status)) {
      setStatusNotice(`${approval.requestedBy} / ${approval.reference} is not ready to schedule.`);
      return;
    }

    setIsSubmittingAction(true);

    try {
      await updateApproval(storeId, approval.id, {
        status: "Scheduled",
        reviewedBy: "Finovo Payments Desk",
        reviewNote: "Scheduled from the Finovo payments lane."
      });
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setStatusNotice(`${approval.requestedBy} / ${approval.reference} was scheduled for payment.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to schedule the selected payment.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handlePayApproval(approval: ApprovalRequestRecord) {
    if (!isApprovalPayable(approval.status)) {
      setStatusNotice(`${approval.requestedBy} / ${approval.reference} is not ready to mark as paid.`);
      return;
    }

    setIsSubmittingAction(true);

    try {
      await updateApproval(storeId, approval.id, {
        status: "Paid",
        reviewedBy: "Finovo Payments Desk",
        reviewNote: "Marked paid from the Finovo payments lane."
      });
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setStatusNotice(`${approval.requestedBy} / ${approval.reference} was marked paid.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to mark the selected bill as paid.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleBulkApprove() {
    if (pendingApprovals.length === 0) {
      setStatusNotice("There are no pending approvals to clear.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      await Promise.all(
        pendingApprovals.map((approval) =>
          updateApproval(storeId, approval.id, {
            status: "Approved",
            reviewedBy: "Finovo AP Desk",
            reviewNote: "Approved from the Finovo quick action queue."
          })
        )
      );
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setActiveNavId("approvals");
      setBillFilter("dueSoon");
      setStatusNotice(`Approved ${pendingApprovals.length} pending bill${pendingApprovals.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to bulk approve pending bills.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleBulkSchedule() {
    if (schedulableApprovals.length === 0) {
      setStatusNotice("There are no approved bills ready to schedule.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      await Promise.all(
        schedulableApprovals.map((approval) =>
          updateApproval(storeId, approval.id, {
            status: "Scheduled",
            reviewedBy: "Finovo Payments Desk",
            reviewNote: "Scheduled from the Finovo quick action queue."
          })
        )
      );
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setActiveNavId("payments");
      setBillFilter("dueSoon");
      setStatusNotice(`Scheduled ${schedulableApprovals.length} approved bill${schedulableApprovals.length === 1 ? "" : "s"} for payment.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to schedule approved bills.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleBulkPay() {
    if (payableApprovals.length === 0) {
      setStatusNotice("There are no approved or scheduled bills ready to mark as paid.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      await Promise.all(
        payableApprovals.map((approval) =>
          updateApproval(storeId, approval.id, {
            status: "Paid",
            reviewedBy: "Finovo Payments Desk",
            reviewNote: "Marked paid from the Finovo quick action queue."
          })
        )
      );
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setActiveNavId("payments");
      setBillFilter("paid");
      setStatusNotice(`Marked ${payableApprovals.length} bill${payableApprovals.length === 1 ? "" : "s"} as paid.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to mark approved bills as paid.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleVendorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedLeadDays = Number.parseInt(vendorForm.leadDays, 10);

    if (!vendorForm.name.trim()) {
      setStatusNotice("Vendor name is required.");
      return;
    }

    if (!Number.isFinite(parsedLeadDays)) {
      setStatusNotice("Lead days must be a whole number.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      await createVendor(storeId, {
        name: vendorForm.name.trim(),
        contact: vendorForm.contact.trim(),
        phone: vendorForm.phone.trim(),
        email: vendorForm.email.trim(),
        terms: vendorForm.terms.trim(),
        leadDays: parsedLeadDays,
        notes: vendorForm.notes.trim()
      });
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setVendorForm(initialVendorFormState);
      setActiveComposer(null);
      setStatusNotice(`${vendorForm.name.trim()} was added to the live vendor directory.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to create the vendor.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleBillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseCurrencyAmount(billForm.amount);

    if (!billForm.reference.trim() || !billForm.requestedBy.trim() || !billForm.reason.trim() || amount <= 0) {
      setStatusNotice("Invoice number, vendor, amount, and reason are required to create a bill approval.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      await createApproval(storeId, {
        type: billForm.type.trim() || "Bill Approval",
        reference: billForm.reference.trim(),
        requestedBy: billForm.requestedBy.trim(),
        impact: formatCurrency(amount),
        reason: billForm.reason.trim()
      });
      await loadFinovoData({ showSpinner: false, syncStatusNotice: false });
      setBillForm({
        ...initialBillFormState,
        requestedBy: billForm.requestedBy.trim()
      });
      setActiveComposer(null);
      setActiveNavId("approvals");
      setBillFilter("pendingApproval");
      setStatusNotice(`${billForm.reference.trim()} was added to the approval queue.`);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Unable to create the bill approval.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function handleQuickAction(action: string) {
    switch (action) {
      case "Add Vendor":
        openVendorComposer();
        return;
      case "Enter Bill":
      case "Upload Bills":
        openBillComposer();
        return;
      case "Approve Bills":
        void handleBulkApprove();
        return;
      case "Schedule Payment":
        void handleBulkSchedule();
        return;
      case "Pay Bills":
        void handleBulkPay();
        return;
      default:
        setStatusNotice(`${action} is staged for the next Finovo automation pass.`);
    }
  }

  function handlePrimaryCreate() {
    if (activeNavId === "vendors" || activeComposer === "vendor") {
      openVendorComposer();
      return;
    }

    openBillComposer();
  }

  function findMatchingApproval(billReference: string, vendorName: string) {
    return approvals.find((approval) => approval.reference === billReference && approval.requestedBy === vendorName) ?? null;
  }

  function resolveApprovalDueLabel(approval: ApprovalRequestRecord) {
    const matchingBill = billByInvoiceNumber.get(approval.reference);

    if (matchingBill) {
      return `Due ${matchingBill.dueDate}`;
    }

    const fallbackDate = new Date(approval.createdAt);
    fallbackDate.setDate(fallbackDate.getDate() + 7);
    return `Due ${formatLongDate(fallbackDate)}`;
  }

  function renderComposerPanel() {
    if (activeComposer === "vendor") {
      return (
        <article className="finovo-payables-panel finovo-payables-form-panel">
          <header className="finovo-payables-panel-header">
            <div>
              <strong>Add Vendor</strong>
              <span>Create a live vendor record for {dashboard?.storeName ?? storeName}.</span>
            </div>
            <button onClick={() => setActiveComposer(null)} type="button">Close</button>
          </header>
          <form className="finovo-payables-form-grid" onSubmit={handleVendorSubmit}>
            <label className="finovo-payables-field is-full">
              <span>Vendor Name</span>
              <input onChange={(event) => setVendorForm((current) => ({ ...current, name: event.target.value }))} value={vendorForm.name} />
            </label>
            <label className="finovo-payables-field">
              <span>Primary Contact</span>
              <input onChange={(event) => setVendorForm((current) => ({ ...current, contact: event.target.value }))} value={vendorForm.contact} />
            </label>
            <label className="finovo-payables-field">
              <span>Phone</span>
              <input onChange={(event) => setVendorForm((current) => ({ ...current, phone: event.target.value }))} value={vendorForm.phone} />
            </label>
            <label className="finovo-payables-field">
              <span>Email</span>
              <input onChange={(event) => setVendorForm((current) => ({ ...current, email: event.target.value }))} type="email" value={vendorForm.email} />
            </label>
            <label className="finovo-payables-field">
              <span>Terms</span>
              <input onChange={(event) => setVendorForm((current) => ({ ...current, terms: event.target.value }))} value={vendorForm.terms} />
            </label>
            <label className="finovo-payables-field">
              <span>Lead Days</span>
              <input min="0" onChange={(event) => setVendorForm((current) => ({ ...current, leadDays: event.target.value }))} type="number" value={vendorForm.leadDays} />
            </label>
            <label className="finovo-payables-field is-full">
              <span>Notes</span>
              <textarea onChange={(event) => setVendorForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={vendorForm.notes} />
            </label>
            <div className="finovo-payables-form-actions is-full">
              <button onClick={() => setActiveComposer(null)} type="button">Cancel</button>
              <button className="is-primary" disabled={isSubmittingAction} type="submit">{isSubmittingAction ? "Saving..." : "Create Vendor"}</button>
            </div>
          </form>
        </article>
      );
    }

    if (activeComposer === "bill") {
      return (
        <article className="finovo-payables-panel finovo-payables-form-panel">
          <header className="finovo-payables-panel-header">
            <div>
              <strong>Enter Bill</strong>
              <span>Create a bill approval request using the live approvals API.</span>
            </div>
            <button onClick={() => setActiveComposer(null)} type="button">Close</button>
          </header>
          <form className="finovo-payables-form-grid" onSubmit={handleBillSubmit}>
            <label className="finovo-payables-field">
              <span>Type</span>
              <input onChange={(event) => setBillForm((current) => ({ ...current, type: event.target.value }))} value={billForm.type} />
            </label>
            <label className="finovo-payables-field">
              <span>Invoice Number</span>
              <input onChange={(event) => setBillForm((current) => ({ ...current, reference: event.target.value }))} value={billForm.reference} />
            </label>
            <label className="finovo-payables-field">
              <span>Vendor</span>
              <input list="finovo-vendor-options" onChange={(event) => setBillForm((current) => ({ ...current, requestedBy: event.target.value }))} value={billForm.requestedBy} />
              <datalist id="finovo-vendor-options">
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.name} />
                ))}
              </datalist>
            </label>
            <label className="finovo-payables-field">
              <span>Amount</span>
              <input onChange={(event) => setBillForm((current) => ({ ...current, amount: event.target.value }))} placeholder="12540.00" value={billForm.amount} />
            </label>
            <label className="finovo-payables-field is-full">
              <span>Reason</span>
              <textarea onChange={(event) => setBillForm((current) => ({ ...current, reason: event.target.value }))} rows={4} value={billForm.reason} />
            </label>
            <div className="finovo-payables-form-actions is-full">
              <button onClick={() => setActiveComposer(null)} type="button">Cancel</button>
              <button className="is-primary" disabled={isSubmittingAction} type="submit">{isSubmittingAction ? "Saving..." : "Create Approval"}</button>
            </div>
          </form>
        </article>
      );
    }

    return null;
  }

  function renderBillsTable(rows: typeof bills, title: string, subtitle: string, showPrimaryButton: boolean) {
    return (
      <article className="finovo-payables-panel finovo-payables-bills-panel">
        <header className="finovo-payables-panel-header">
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          <div className="finovo-payables-toolbar-actions">
            <select defaultValue="All Vendors">
              <option>All Vendors</option>
              <option>Key Vendors</option>
              <option>Discount Eligible</option>
            </select>
            <select defaultValue="All Dates">
              <option>All Dates</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
            <button onClick={() => setStatusNotice("Advanced bill filters are queued for the next Finovo slice.")} type="button">Filters</button>
            {showPrimaryButton ? <button className="is-primary" onClick={openBillComposer} type="button">New Bill</button> : null}
          </div>
        </header>

        <div className="finovo-payables-bill-tabs" role="tablist">
          <button className={billFilter === "all" ? "is-active" : ""} onClick={() => setBillFilter("all")} type="button">All Bills ({dashboard?.filterCounts.all ?? 0})</button>
          <button className={billFilter === "pendingApproval" ? "is-active" : ""} onClick={() => setBillFilter("pendingApproval")} type="button">Pending Approval ({dashboard?.filterCounts.pendingApproval ?? 0})</button>
          <button className={billFilter === "dueSoon" ? "is-active" : ""} onClick={() => setBillFilter("dueSoon")} type="button">Due Soon ({dashboard?.filterCounts.dueSoon ?? 0})</button>
          <button className={billFilter === "overdue" ? "is-active" : ""} onClick={() => setBillFilter("overdue")} type="button">Overdue ({dashboard?.filterCounts.overdue ?? 0})</button>
          <button className={billFilter === "paid" ? "is-active" : ""} onClick={() => setBillFilter("paid")} type="button">Paid ({dashboard?.filterCounts.paid ?? 0})</button>
        </div>

        <div className="finovo-payables-table-wrap">
          <table className="finovo-payables-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Bill #</th>
                <th>Bill Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((bill) => {
                  const matchingApproval = findMatchingApproval(bill.invoiceNumber, bill.vendor);

                  return (
                    <tr key={bill.id}>
                      <td>{bill.vendor}</td>
                      <td>{bill.invoiceNumber}</td>
                      <td>{bill.billDate}</td>
                      <td>{bill.dueDate}</td>
                      <td>{formatCurrency(bill.amount)}</td>
                      <td>
                        <span className={`finovo-payables-status-pill tone-${statusTone(bill.status)}`}>{bill.status}</span>
                      </td>
                      <td>{bill.paymentMethod}</td>
                      <td>
                        <div className="finovo-payables-inline-actions finovo-payables-table-actions">
                          {matchingApproval && isApprovalPendingReview(matchingApproval.status) ? (
                            <button disabled={isSubmittingAction} onClick={() => void handleReviewApproval(matchingApproval)} type="button">Approve</button>
                          ) : null}
                          {matchingApproval && isApprovalSchedulable(matchingApproval.status) ? (
                            <button disabled={isSubmittingAction} onClick={() => void handleScheduleApproval(matchingApproval)} type="button">Schedule</button>
                          ) : null}
                          {matchingApproval && isApprovalPayable(matchingApproval.status) ? (
                            <button disabled={isSubmittingAction} onClick={() => void handlePayApproval(matchingApproval)} type="button">Pay</button>
                          ) : null}
                          <button onClick={() => setStatusNotice(`${bill.vendor} / ${bill.invoiceNumber} is staged for a detailed bill drawer.`)} type="button">Open</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="finovo-payables-empty-table" colSpan={8}>No bills match the current search and filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    );
  }

  function renderHomeView() {
    return (
      <>
        <section className="finovo-payables-summary-grid">
          {(dashboard?.summaryCards ?? []).map((card) => (
            <article className={`finovo-payables-stat-card${card.tone === "critical" ? " is-critical" : card.tone === "positive" ? " is-positive" : ""}`} key={card.id}>
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <p>{card.caption}</p>
            </article>
          ))}
        </section>

        <section className="finovo-payables-main-grid">
          <div className="finovo-payables-primary-column">
            <div className="finovo-payables-chart-row">
              <article className="finovo-payables-panel finovo-payables-cashflow-panel">
                <header className="finovo-payables-panel-header">
                  <div>
                    <strong>AP Cash Flow Forecast</strong>
                    <span>Expected cash in and cash out over the selected window.</span>
                  </div>
                  <span className="finovo-payables-panel-tag">{dashboard?.cashFlowForecast.windowLabel ?? "Next 90 Days"}</span>
                </header>
                <div className="finovo-payables-chart-shell">
                  <div className="finovo-payables-chart-legend">
                    <span><i className="tone-cash-out" />Cash Out</span>
                    <span><i className="tone-cash-in" />Cash In</span>
                  </div>
                  <svg aria-hidden="true" className="finovo-payables-line-chart" viewBox="0 0 460 220">
                    <g className="finovo-payables-grid-lines">
                      <line x1="0" x2="460" y1="20" y2="20" />
                      <line x1="0" x2="460" y1="70" y2="70" />
                      <line x1="0" x2="460" y1="120" y2="120" />
                      <line x1="0" x2="460" y1="170" y2="170" />
                    </g>
                    <line className="finovo-payables-zero-line" x1="0" x2="460" y1={zeroLineY} y2={zeroLineY} />
                    <path className="finovo-payables-area cash-in" d={cashChartAreaIn} />
                    <path className="finovo-payables-area cash-out" d={cashChartAreaOut} />
                    <polyline className="finovo-payables-line cash-in" points={cashChartPointsIn} />
                    <polyline className="finovo-payables-line cash-out" points={cashChartPointsOut} />
                  </svg>
                  <div className="finovo-payables-chart-axis">
                    {chartLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                  <div className="finovo-payables-chart-callout">
                    <strong>{dashboard?.cashFlowForecast.highlightLabel ?? "Forecast Window"}</strong>
                    <span>Cash In {formatCurrency(dashboard?.cashFlowForecast.highlightCashIn ?? 0)}</span>
                    <span>Cash Out {formatCurrency(dashboard?.cashFlowForecast.highlightCashOut ?? 0)}</span>
                    <span>Net {formatCurrency((dashboard?.cashFlowForecast.highlightCashIn ?? 0) - (dashboard?.cashFlowForecast.highlightCashOut ?? 0))}</span>
                  </div>
                </div>
              </article>

              <article className="finovo-payables-panel finovo-payables-status-panel">
                <header className="finovo-payables-panel-header">
                  <div>
                    <strong>Bills by Status</strong>
                    <span>Current AP status mix by dollar volume.</span>
                  </div>
                </header>
                <div className="finovo-payables-status-chart">
                  <div className="finovo-payables-donut" style={donutStyle}>
                    <div>
                      <strong>{formatCompactCurrency((dashboard?.statusBreakdown ?? []).reduce((sum, item) => sum + item.amount, 0))}</strong>
                      <span>Total</span>
                    </div>
                  </div>
                  <div className="finovo-payables-status-list">
                    {donutSegments.map((segment) => (
                      <div className="finovo-payables-status-row" key={segment.label}>
                        <span><i style={{ backgroundColor: segment.color }} />{segment.label}</span>
                        <strong>{formatCurrency(segment.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="finovo-payables-panel finovo-payables-actions-panel">
                <header className="finovo-payables-panel-header">
                  <div>
                    <strong>Quick Actions</strong>
                    <span>Live vendor and approval actions are now wired where the backend exists.</span>
                  </div>
                </header>
                <div className="finovo-payables-quick-actions">
                  {quickActions.map((action) => (
                    <button disabled={isSubmittingAction && action === "Approve Bills"} key={action} onClick={() => handleQuickAction(action)} type="button">
                      <span className="finovo-payables-action-icon">+</span>
                      <span>{action}</span>
                    </button>
                  ))}
                </div>
              </article>
            </div>

            <div className="finovo-payables-insight-row">
              <article className="finovo-payables-panel">
                <header className="finovo-payables-panel-header">
                  <div>
                    <strong>AP Aging Summary</strong>
                    <span>As of {dashboard?.generatedAt ? new Date(dashboard.generatedAt).toLocaleDateString() : "today"}</span>
                  </div>
                </header>
                <div className="finovo-payables-aging-grid">
                  {(dashboard?.agingBuckets ?? []).map((bucket) => (
                    <div key={bucket.id}>
                      <span>{bucket.label}</span>
                      <strong>{formatCurrency(bucket.amount)}</strong>
                      <em className={bucket.tone === "danger" ? "tone-danger" : undefined}>{bucket.shareLabel}</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="finovo-payables-panel">
                <header className="finovo-payables-panel-header">
                  <div>
                    <strong>Top Overdue Bills</strong>
                    <span>Most urgent items by amount and age.</span>
                  </div>
                  <button onClick={() => handleNavSelect("bills")} type="button">View All</button>
                </header>
                <div className="finovo-payables-ranked-list">
                  {(dashboard?.overdueBills ?? []).map((bill) => (
                    <div className="finovo-payables-ranked-row" key={bill.id}>
                      <div>
                        <strong>{bill.vendor}</strong>
                        <span>{bill.invoiceNumber}</span>
                      </div>
                      <div>
                        <strong>{formatCurrency(bill.amount)}</strong>
                        <span>{bill.ageLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="finovo-payables-panel">
                <header className="finovo-payables-panel-header">
                  <div>
                    <strong>Discount Opportunities</strong>
                    <span>Priority vendors with early-pay savings available.</span>
                  </div>
                  <button onClick={() => handleNavSelect("expenses")} type="button">View All</button>
                </header>
                <div className="finovo-payables-ranked-list">
                  {(dashboard?.discountOpportunities ?? []).map((item) => (
                    <div className="finovo-payables-ranked-row" key={item.id}>
                      <div>
                        <strong>{item.vendor}</strong>
                        <span>{item.discountLabel}</span>
                      </div>
                      <div>
                        <strong>{formatCurrency(item.amount)}</strong>
                        <span>{item.dueLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            {renderBillsTable(filteredBills, "Bills Overview", `${filteredBills.length} visible items across the current filter.`, true)}
          </div>

          <div className="finovo-payables-secondary-column">
            <article className="finovo-payables-panel">
              <header className="finovo-payables-panel-header">
                <div>
                  <strong>Approvals</strong>
                  <span>{pendingApprovals.length} waiting for review</span>
                </div>
                <button onClick={() => handleNavSelect("approvals")} type="button">View All</button>
              </header>
              <div className="finovo-payables-card-list">
                {homeApprovals.map((approval) => (
                  <div className="finovo-payables-mini-card" key={approval.id}>
                    <div>
                      <strong>{approval.requestedBy}</strong>
                      <span>{approval.reference}</span>
                      <small>{resolveApprovalDueLabel(approval)}</small>
                    </div>
                    <button disabled={isSubmittingAction} onClick={() => void handleReviewApproval(approval)} type="button">Review</button>
                  </div>
                ))}
              </div>
            </article>

            <article className="finovo-payables-panel">
              <header className="finovo-payables-panel-header">
                <div>
                  <strong>Upcoming Payments</strong>
                  <span>Scheduled outflow windows</span>
                </div>
                <button onClick={() => handleNavSelect("payments")} type="button">View Calendar</button>
              </header>
              <div className="finovo-payables-upcoming-list">
                {(dashboard?.upcomingPayments ?? []).map((bucket) => (
                  <div className={bucket.id === "total" ? "is-total" : ""} key={bucket.id}>
                    <span>{bucket.label}</span>
                    <strong>{bucket.billCount} bills</strong>
                    <em>{formatCurrency(bucket.amount)}</em>
                  </div>
                ))}
              </div>
            </article>

            <article className="finovo-payables-panel">
              <header className="finovo-payables-panel-header">
                <div>
                  <strong>Recent Activity</strong>
                  <span>Latest operator and bill events</span>
                </div>
                <button onClick={() => handleNavSelect("reports")} type="button">View All</button>
              </header>
              <div className="finovo-payables-activity-list">
                {(dashboard?.recentActivity ?? []).map((item) => (
                  <div className="finovo-payables-activity-row" key={item.id}>
                    <i className={`tone-${item.tone}`} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.amount > 0 ? formatCurrency(item.amount) : "Profile update"}</span>
                    </div>
                    <small>{item.timeLabel}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="finovo-payables-panel">
              <header className="finovo-payables-panel-header">
                <div>
                  <strong>Top Vendors by Spend (YTD)</strong>
                  <span>Supplier concentration and AP exposure.</span>
                </div>
                <button onClick={() => handleNavSelect("vendors")} type="button">View Directory</button>
              </header>
              <div className="finovo-payables-vendor-list">
                {(dashboard?.vendorSpend ?? []).map((item) => (
                  <div className="finovo-payables-vendor-row" key={item.id}>
                    <div className="finovo-payables-vendor-meta">
                      <strong>{item.vendor}</strong>
                      <span>{formatCurrency(item.spend)}</span>
                    </div>
                    <div className="finovo-payables-vendor-bar"><span style={{ width: `${(item.spend / maxVendorSpend) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="finovo-payables-performance-grid">
          <header className="finovo-payables-performance-header">
            <div>
              <strong>Payables Performance</strong>
              <span>This Month</span>
            </div>
            <button onClick={() => handleNavSelect("reports")} type="button">View Analytics</button>
          </header>
          <div className="finovo-payables-performance-cards">
            {(dashboard?.performanceMetrics ?? []).map((metric) => (
              <article className="finovo-payables-performance-card" key={metric.id}>
                <span>{metric.title}</span>
                <strong>{metric.value}</strong>
                <svg aria-hidden="true" viewBox="0 0 120 42">
                  <polyline
                    className="finovo-payables-sparkline"
                    points={buildPolylinePoints(metric.points, 120, 34, Math.min(...metric.points), Math.max(...metric.points))}
                  />
                </svg>
                <p>{metric.changeLabel}</p>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderVendorsView() {
    return (
      <section className="finovo-payables-view-stack">
        <div className="finovo-payables-detail-grid">
          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Vendor Health</strong>
                <span>Live store vendor coverage and terms alignment.</span>
              </div>
              <button onClick={openVendorComposer} type="button">Add Vendor</button>
            </header>
            <div className="finovo-payables-data-points">
              <div><span>Active Vendors</span><strong>{vendors.length}</strong></div>
              <div><span>Avg. Lead Days</span><strong>{averageLeadDays}</strong></div>
              <div><span>Discount Terms</span><strong>{vendors.filter((vendor) => vendor.terms.includes("/")).length}</strong></div>
            </div>
          </article>

          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Top Spend Exposure</strong>
                <span>Vendor concentration by derived AP spend.</span>
              </div>
            </header>
            <div className="finovo-payables-vendor-list">
              {(dashboard?.vendorSpend ?? []).map((item) => (
                <div className="finovo-payables-vendor-row" key={item.id}>
                  <div className="finovo-payables-vendor-meta">
                    <strong>{item.vendor}</strong>
                    <span>{formatCurrency(item.spend)}</span>
                  </div>
                  <div className="finovo-payables-vendor-bar"><span style={{ width: `${(item.spend / maxVendorSpend) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="finovo-payables-panel">
          <header className="finovo-payables-panel-header">
            <div>
              <strong>Vendor Directory</strong>
              <span>{filteredVendors.length} live vendor records for the current store.</span>
            </div>
            <button onClick={openVendorComposer} type="button">Add Vendor</button>
          </header>
          <div className="finovo-payables-table-wrap">
            <table className="finovo-payables-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Terms</th>
                  <th>Lead Days</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>{vendor.name}</td>
                      <td>{vendor.contact || "-"}<div className="finovo-payables-table-subvalue">{vendor.phone || "No phone"}</div></td>
                      <td>{vendor.email || "-"}</td>
                      <td>{vendor.terms}</td>
                      <td>{vendor.leadDays}</td>
                      <td>{vendor.notes || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="finovo-payables-empty-table" colSpan={6}>No vendors match the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    );
  }

  function renderApprovalsView() {
    return (
      <section className="finovo-payables-view-stack">
        <div className="finovo-payables-detail-grid">
          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Approval Queue</strong>
                <span>{pendingApprovals.length} items still require review.</span>
              </div>
              <div className="finovo-payables-inline-actions">
                <button disabled={isSubmittingAction || pendingApprovals.length === 0} onClick={() => void handleBulkApprove()} type="button">Approve All Pending</button>
                <button className="is-primary" onClick={openBillComposer} type="button">New Approval</button>
              </div>
            </header>
            <div className="finovo-payables-data-points">
              <div><span>Pending</span><strong>{pendingApprovals.length}</strong></div>
              <div><span>Approved</span><strong>{approvals.filter((approval) => approval.status === "Approved").length}</strong></div>
              <div><span>Open Impact</span><strong>{formatCurrency(pendingApprovals.reduce((sum, approval) => sum + parseCurrencyAmount(approval.impact), 0))}</strong></div>
            </div>
          </article>

          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Approval Notes</strong>
                <span>Each review updates the same store-scoped approval records that power the dashboard.</span>
              </div>
            </header>
            <div className="finovo-payables-empty-state">
              Finovo bill intake currently writes to the approval queue first. Once dedicated AP bill persistence lands, this desk can fan out into intake, coding, and payment scheduling without changing the visible workflow.
            </div>
          </article>
        </div>

        <article className="finovo-payables-panel">
          <header className="finovo-payables-panel-header">
            <div>
              <strong>Approvals</strong>
              <span>{filteredApprovals.length} records match the current search.</span>
            </div>
          </header>
          <div className="finovo-payables-table-wrap">
            <table className="finovo-payables-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice</th>
                  <th>Impact</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.length > 0 ? (
                  filteredApprovals.map((approval) => (
                    <tr key={approval.id}>
                      <td>{approval.requestedBy}</td>
                      <td>{approval.reference}</td>
                      <td>{approval.impact}</td>
                      <td>{approval.status}</td>
                      <td>{approval.reason}</td>
                      <td>{formatLongDate(approval.updatedAt)}</td>
                      <td>
                        {!isApprovalPendingReview(approval.status) ? (
                          <span className="finovo-payables-table-note">Reviewed</span>
                        ) : (
                          <button disabled={isSubmittingAction} onClick={() => void handleReviewApproval(approval)} type="button">Approve</button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="finovo-payables-empty-table" colSpan={7}>No approvals match the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    );
  }

  function renderPaymentsView() {
    return (
      <section className="finovo-payables-view-stack">
        <div className="finovo-payables-detail-grid">
          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Upcoming Payments</strong>
                <span>Near-term outflow buckets generated from the live payables payload.</span>
              </div>
            </header>
            <div className="finovo-payables-upcoming-list">
              {(dashboard?.upcomingPayments ?? []).map((bucket) => (
                <div className={bucket.id === "total" ? "is-total" : ""} key={bucket.id}>
                  <span>{bucket.label}</span>
                  <strong>{bucket.billCount} bills</strong>
                  <em>{formatCurrency(bucket.amount)}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Payment Mix</strong>
                <span>{upcomingBills.length} unpaid bills are still active in the queue.</span>
              </div>
              <div className="finovo-payables-inline-actions">
                <button disabled={isSubmittingAction || schedulableApprovals.length === 0} onClick={() => void handleBulkSchedule()} type="button">Schedule Approved</button>
                <button className="is-primary" disabled={isSubmittingAction || payableApprovals.length === 0} onClick={() => void handleBulkPay()} type="button">Mark Paid</button>
              </div>
            </header>
            <div className="finovo-payables-data-points">
              <div><span>Paid Bills</span><strong>{bills.filter((bill) => bill.status === "Paid").length}</strong></div>
              <div><span>Scheduled / Ready</span><strong>{payableApprovals.length}</strong></div>
              <div><span>Completed Value</span><strong>{formatCurrency(bills.filter((bill) => bill.status === "Paid").reduce((sum, bill) => sum + bill.amount, 0))}</strong></div>
            </div>
          </article>
        </div>

        {renderBillsTable(paidBills.length > 0 ? paidBills : bills.filter((bill) => bill.status === "Paid"), "Completed Payments", `${paidBills.length > 0 ? paidBills.length : bills.filter((bill) => bill.status === "Paid").length} paid bills match the current search.`, false)}
      </section>
    );
  }

  function renderCashFlowView() {
    return (
      <section className="finovo-payables-view-stack">
        <div className="finovo-payables-detail-grid is-wide-first">
          <article className="finovo-payables-panel finovo-payables-cashflow-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>AP Cash Flow Forecast</strong>
                <span>Expected cash in and cash out over the selected window.</span>
              </div>
              <span className="finovo-payables-panel-tag">{dashboard?.cashFlowForecast.windowLabel ?? "Next 90 Days"}</span>
            </header>
            <div className="finovo-payables-chart-shell">
              <div className="finovo-payables-chart-legend">
                <span><i className="tone-cash-out" />Cash Out</span>
                <span><i className="tone-cash-in" />Cash In</span>
              </div>
              <svg aria-hidden="true" className="finovo-payables-line-chart" viewBox="0 0 460 220">
                <g className="finovo-payables-grid-lines">
                  <line x1="0" x2="460" y1="20" y2="20" />
                  <line x1="0" x2="460" y1="70" y2="70" />
                  <line x1="0" x2="460" y1="120" y2="120" />
                  <line x1="0" x2="460" y1="170" y2="170" />
                </g>
                <line className="finovo-payables-zero-line" x1="0" x2="460" y1={zeroLineY} y2={zeroLineY} />
                <path className="finovo-payables-area cash-in" d={cashChartAreaIn} />
                <path className="finovo-payables-area cash-out" d={cashChartAreaOut} />
                <polyline className="finovo-payables-line cash-in" points={cashChartPointsIn} />
                <polyline className="finovo-payables-line cash-out" points={cashChartPointsOut} />
              </svg>
              <div className="finovo-payables-chart-axis">
                {chartLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Forecast Callout</strong>
                <span>Current highlight window from the derived AP forecast.</span>
              </div>
            </header>
            <div className="finovo-payables-data-points">
              <div><span>Window</span><strong>{dashboard?.cashFlowForecast.highlightLabel ?? "-"}</strong></div>
              <div><span>Cash In</span><strong>{formatCurrency(dashboard?.cashFlowForecast.highlightCashIn ?? 0)}</strong></div>
              <div><span>Cash Out</span><strong>{formatCurrency(dashboard?.cashFlowForecast.highlightCashOut ?? 0)}</strong></div>
            </div>
          </article>
        </div>

        <article className="finovo-payables-panel">
          <header className="finovo-payables-panel-header">
            <div>
              <strong>Upcoming Bill Pressure</strong>
              <span>Unpaid items that will affect the next payment run.</span>
            </div>
          </header>
          <div className="finovo-payables-table-wrap">
            <table className="finovo-payables-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Invoice</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBills.length > 0 ? (
                  upcomingBills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.vendor}</td>
                      <td>{bill.invoiceNumber}</td>
                      <td>{bill.dueDate}</td>
                      <td>{formatCurrency(bill.amount)}</td>
                      <td>{bill.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="finovo-payables-empty-table" colSpan={5}>No upcoming payment pressure matches the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    );
  }

  function renderReportsView() {
    return (
      <section className="finovo-payables-view-stack">
        <div className="finovo-payables-detail-grid">
          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>AP Aging Summary</strong>
                <span>Store-level aging breakout.</span>
              </div>
            </header>
            <div className="finovo-payables-aging-grid">
              {(dashboard?.agingBuckets ?? []).map((bucket) => (
                <div key={bucket.id}>
                  <span>{bucket.label}</span>
                  <strong>{formatCurrency(bucket.amount)}</strong>
                  <em className={bucket.tone === "danger" ? "tone-danger" : undefined}>{bucket.shareLabel}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Vendor Spend</strong>
                <span>Derived AP exposure by supplier.</span>
              </div>
            </header>
            <div className="finovo-payables-vendor-list">
              {(dashboard?.vendorSpend ?? []).map((item) => (
                <div className="finovo-payables-vendor-row" key={item.id}>
                  <div className="finovo-payables-vendor-meta">
                    <strong>{item.vendor}</strong>
                    <span>{formatCurrency(item.spend)}</span>
                  </div>
                  <div className="finovo-payables-vendor-bar"><span style={{ width: `${(item.spend / maxVendorSpend) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <section className="finovo-payables-performance-grid">
          <header className="finovo-payables-performance-header">
            <div>
              <strong>Payables Performance</strong>
              <span>This Month</span>
            </div>
            <button onClick={() => setStatusNotice("Finovo reporting exports are the next reporting slice.")} type="button">Export</button>
          </header>
          <div className="finovo-payables-performance-cards">
            {(dashboard?.performanceMetrics ?? []).map((metric) => (
              <article className="finovo-payables-performance-card" key={metric.id}>
                <span>{metric.title}</span>
                <strong>{metric.value}</strong>
                <svg aria-hidden="true" viewBox="0 0 120 42">
                  <polyline
                    className="finovo-payables-sparkline"
                    points={buildPolylinePoints(metric.points, 120, 34, Math.min(...metric.points), Math.max(...metric.points))}
                  />
                </svg>
                <p>{metric.changeLabel}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  function renderExpensesView() {
    return (
      <section className="finovo-payables-view-stack">
        <div className="finovo-payables-detail-grid">
          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Discount Opportunities</strong>
                <span>Live early-pay opportunities from the current AP stack.</span>
              </div>
            </header>
            <div className="finovo-payables-ranked-list">
              {(dashboard?.discountOpportunities ?? []).map((item) => (
                <div className="finovo-payables-ranked-row" key={item.id}>
                  <div>
                    <strong>{item.vendor}</strong>
                    <span>{item.discountLabel}</span>
                  </div>
                  <div>
                    <strong>{formatCurrency(item.amount)}</strong>
                    <span>{item.dueLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Recent Expense Activity</strong>
                <span>Latest activity signals touching vendor and bill operations.</span>
              </div>
            </header>
            <div className="finovo-payables-activity-list">
              {(dashboard?.recentActivity ?? []).map((item) => (
                <div className="finovo-payables-activity-row" key={item.id}>
                  <i className={`tone-${item.tone}`} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.amount > 0 ? formatCurrency(item.amount) : "Profile update"}</span>
                  </div>
                  <small>{item.timeLabel}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    );
  }

  function render1099sView() {
    return (
      <section className="finovo-payables-view-stack">
        <article className="finovo-payables-panel">
          <header className="finovo-payables-panel-header">
            <div>
              <strong>1099 Readiness</strong>
              <span>Vendor profiles with the contact and terms coverage needed for tax prep follow-up.</span>
            </div>
          </header>
          <div className="finovo-payables-table-wrap">
            <table className="finovo-payables-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Terms</th>
                  <th>Readiness</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.length > 0 ? (
                  filteredVendors.map((vendor) => {
                    const isReady = vendor.contact.trim().length > 0 && vendor.email.trim().length > 0 && vendor.terms.trim().length > 0;

                    return (
                      <tr key={vendor.id}>
                        <td>{vendor.name}</td>
                        <td>{vendor.contact || "Missing"}</td>
                        <td>{vendor.email || "Missing"}</td>
                        <td>{vendor.terms || "Missing"}</td>
                        <td>{isReady ? "Ready" : "Needs review"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="finovo-payables-empty-table" colSpan={5}>No vendors match the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section className="finovo-payables-view-stack">
        <div className="finovo-payables-detail-grid">
          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Workspace Snapshot</strong>
                <span>Current Finovo rollout data for this store.</span>
              </div>
            </header>
            <div className="finovo-payables-data-points">
              <div><span>Store</span><strong>{dashboard?.storeName ?? storeName}</strong></div>
              <div><span>Generated</span><strong>{dashboard?.generatedAt ? formatLongDate(dashboard.generatedAt) : "-"}</strong></div>
              <div><span>Pending Reviews</span><strong>{pendingApprovals.length}</strong></div>
            </div>
          </article>

          <article className="finovo-payables-panel">
            <header className="finovo-payables-panel-header">
              <div>
                <strong>Next Rollout Steps</strong>
                <span>Settings are staged as operational notes until more AP entities persist server-side.</span>
              </div>
            </header>
            <div className="finovo-payables-empty-state">
              The next settings slice should move approval routing, payment run defaults, and vendor policy thresholds into persisted API-backed preferences. The current lane keeps those rollout notes visible while the bills model is still derived server-side.
            </div>
          </article>
        </div>
      </section>
    );
  }

  function renderActiveView() {
    switch (activeNavId) {
      case "bills":
        return renderBillsTable(filteredBills, "Bills Workspace", `${filteredBills.length} visible items across the current filter.`, true);
      case "expenses":
        return renderExpensesView();
      case "vendors":
        return renderVendorsView();
      case "approvals":
        return renderApprovalsView();
      case "payments":
        return renderPaymentsView();
      case "1099s":
        return render1099sView();
      case "reports":
        return renderReportsView();
      case "cashflow":
        return renderCashFlowView();
      case "settings":
        return renderSettingsView();
      default:
        return renderHomeView();
    }
  }

  return (
    <div className="finovo-payables-page">
      <div className="finovo-payables-shell">
        <aside className="finovo-payables-sidebar">
          <div className="finovo-payables-sidebar-brand">
            <div className="finovo-payables-sidebar-logo">F</div>
            <div>
              <strong>Finovo</strong>
              <span>AP operations layer</span>
            </div>
          </div>

          <div className="finovo-payables-sidebar-nav">
            {navItems.map((item) => {
              const isActive = item.id === activeNavId;

              return (
                <button
                  className={`finovo-payables-nav-button${isActive ? " is-active" : ""}`}
                  key={item.id}
                  onClick={() => handleNavSelect(item.id)}
                  type="button"
                >
                  <span className="finovo-payables-nav-glyph">{getNavGlyph(item.id)}</span>
                  <span className="finovo-payables-nav-label">{item.label}</span>
                  {item.badge ? <span className="finovo-payables-nav-badge">{item.badge}</span> : null}
                </button>
              );
            })}
          </div>

          <div className="finovo-payables-sidebar-promo">
            <strong>Save time. Pay smarter.</strong>
            <p>Automate your payables and get back to what matters.</p>
            <button onClick={() => setStatusNotice("Automation workflows will layer into Finovo after the first AP endpoint set is stable.")} type="button">
              Explore Automation
            </button>
          </div>

          <div className="finovo-payables-sidebar-user">
            <strong>{storeName}</strong>
            <span>{activeNavItem?.label ?? "Home"} lane</span>
          </div>
        </aside>

        <section className="finovo-payables-content">
          <header className="finovo-payables-header">
            <div className="finovo-payables-hero-copy">
              <span className="finovo-payables-eyebrow">Finovo</span>
              <h2>{viewMeta.title}</h2>
              <p>{viewMeta.description} for {dashboard?.storeName ?? storeName}.</p>
            </div>
            <div className="finovo-payables-header-actions">
              <label className="finovo-payables-search">
                <span>{viewMeta.searchLabel}</span>
                <input onChange={(event) => setSearchTerm(event.target.value)} placeholder={viewMeta.searchLabel} value={searchTerm} />
              </label>
              <button className="finovo-payables-primary-button" onClick={handlePrimaryCreate} type="button">
                {activeNavId === "vendors" ? "Add Vendor" : "New Bill"}
              </button>
            </div>
          </header>

          <div className="finovo-payables-notice">{statusNotice}</div>

          {isLoading ? (
            <section className="finovo-payables-loading">Loading live Finovo payables data for {storeName}...</section>
          ) : errorMessage ? (
            <section className="finovo-payables-error">{errorMessage}</section>
          ) : (
            <>
              {renderComposerPanel()}
              {renderActiveView()}
              <div className="finovo-payables-footer-note">{dashboard?.statusNotice ?? "Finovo is waiting for live payables data."}</div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}