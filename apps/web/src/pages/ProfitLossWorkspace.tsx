import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

// ── types ────────────────────────────────────────────────────────────────────
type PLViewMode = "report" | "charts" | "forecast";
type PLChartType = "trend" | "waterfall" | "department";
type PLReportLayoutMode = "focus" | "board" | "multiReport";
type PLVarianceMode = "actual" | "priorYear" | "budget";
type PLScenarioId = "current" | "board" | "conservative" | "summerPush";
type PLForecastReport = "scenarioLab" | "scenarioCompare" | "monthlyOutlook";
type PLChartMetricWidgetId =
  | "revenueRunRate"
  | "grossProfitRunRate"
  | "netIncomeRunRate"
  | "forecastRevenueDelta"
  | "forecastNetDelta"
  | "grossMargin"
  | "netMargin"
  | "expenseLoad"
  | "scenarioConfidence"
  | "peakForecastMonth"
  | "topStore"
  | "departmentLeader"
  | "revenueBudgetGap"
  | "netBudgetGap"
  | "cogsLoad"
  | "nextNinetyRevenue"
  | "nextNinetyNet"
  | "storeMarginSpread"
  | "activeAnomalyCount"
  | "snapshotVaultCount"
  | "bestScenarioNet"
  | "topDepartmentMargin";
type PLWidgetId =
  | "trendExplorer"
  | "marginWalk"
  | "departmentMix"
  | "storeLeaderboard"
  | "forecastDelta"
  | "variancePulse"
  | "departmentScoreboard"
  | "scenarioBridge"
  | "monthlyOutlookStudio"
  | "scenarioCommandCenter"
  | "storeMarginMatrix"
  | "anomalyLedger"
  | "contributorSpotlight"
  | "snapshotVault";
type WidgetLibrarySection = "data" | "visuals";
type WidgetDeliveryModalMode = "send" | "schedule";
type WidgetStoreScope = "current" | "all" | "custom";
type WidgetScheduleCadence = "weekly" | "threePerWeek" | "monthly" | "custom";
type ProfitLossDepartment = "Sales" | "Parts" | "Service" | "Administration";
type ProfitLossGroup = "Income" | "Cost of Sales" | "Gross Profit" | "Expenses" | "Net Income";

interface ProfitLossLine {
  account: string;
  description: string;
  group: ProfitLossGroup;
  isTotal?: boolean;
  may2026: number;
  priorYear?: number;
  budget?: number;
  department?: ProfitLossDepartment;
  owner?: string;
  driver?: string;
  transactions?: ProfitLossTransaction[];
  contributors?: ProfitLossStoreContribution[];
}

interface ProfitLossStore {
  id: string;
  name: string;
}

interface MonthlyPoint {
  label: string;
  revenue: number;
  grossProfit: number;
  netIncome: number;
}

interface DeptPoint {
  label: string;
  sales: number;
  parts: number;
  service: number;
}

interface ForecastScenario {
  id: PLScenarioId;
  label: string;
  summary: string;
  revenuePct: number;
  grossMarginBps: number;
  expensePct: number;
  accent: string;
}

interface ScenarioAdjustments {
  revenuePct: number;
  grossMarginBps: number;
  expensePct: number;
}

interface ScenarioBridgePoint {
  label: string;
  value: number;
  tone: "neutral" | "up" | "down";
}

interface VariancePulseRow {
  group: ProfitLossGroup;
  actual: number;
  budgetPct: number;
  priorPct: number;
  budgetTone: "favorable" | "risk" | "neutral";
  priorTone: "favorable" | "risk" | "neutral";
  focus: string;
}

interface ProfitLossTransaction {
  id: string;
  date: string;
  storeId: string;
  storeName: string;
  source: string;
  reference: string;
  detail: string;
  owner: string;
  amount: number;
}

interface ProfitLossStoreContribution {
  storeId: string;
  storeName: string;
  actual: number;
  budget: number;
  priorYear: number;
}

interface ForecastSnapshotRecord {
  id: string;
  label: string;
  savedAt: string;
  month: string;
  year: string;
  department: string;
  storeIds: string[];
  storeLabel: string;
  scopeLabel: string;
  scenarioId: PLScenarioId;
  adjustments: ScenarioAdjustments;
  revenueTotal: number;
  netTotal: number;
  confidence: number;
}

interface GmailDeliveryProfile {
  address: string;
  connectedAt: string;
}

interface WidgetScheduleRecord {
  id: string;
  widgetIds: PLWidgetId[];
  recipient: string;
  gmailAccount: string;
  cadence: WidgetScheduleCadence;
  weekday: string;
  weekdays: string[];
  monthlyDay: number;
  customRule: string;
  storeScope: WidgetStoreScope;
  storeIds: string[];
  department: string;
  month: string;
  year: string;
  savedAt: string;
}

interface StorePerformanceSnapshot {
  storeId: string;
  storeName: string;
  revenue: number;
  grossProfit: number;
  netIncome: number;
  netMarginPct: number;
}

interface DepartmentPerformanceSnapshot {
  department: ProfitLossDepartment;
  revenue: number;
  grossProfit: number;
  netIncome: number;
  grossMarginPct: number;
  netMarginPct: number;
}

interface ScenarioCompareRow {
  id: PLScenarioId;
  label: string;
  summary: string;
  revenueTotal: number;
  grossMarginPct: number;
  netTotal: number;
  deltaVsBaseline: number;
  confidence: number;
}

interface ForecastMonthlyOutlookRow {
  label: string;
  revenue: number;
  grossProfit: number;
  netIncome: number;
  baselineRevenue: number;
  baselineNetIncome: number;
  revenueDelta: number;
  netDelta: number;
  grossMarginPct: number;
  netMarginPct: number;
  revenueStepPct: number;
  paceTone: "up" | "down" | "neutral";
  paceLabel: string;
  focus: string;
}

interface ProfitLossStoreProfile {
  weight: number;
  budgetDiscipline: number;
  departmentTilt: Record<ProfitLossDepartment, number>;
}

interface ProfitLossAccountMeta {
  department: ProfitLossDepartment;
  owner: string;
  driver: string;
  budgetLiftPct: number;
  volatility: number;
}

interface ProfitLossTransactionTemplate {
  source: string;
  detail: string;
  referencePrefix: string;
  share: number;
}

// ── static data ───────────────────────────────────────────────────────────────
const profitLossStores: ProfitLossStore[] = [
  { id: "AransasPass", name: "Aransas Pass" },
  { id: "Beaumont", name: "Beaumont" },
  { id: "CorpusChristi", name: "Corpus Christi" },
  { id: "Houston", name: "Conroe" },
  { id: "Jasper", name: "Jasper" },
  { id: "Lufkin", name: "Lufkin" },
  { id: "SanAntonio", name: "San Antonio" }
];

const storeWeights: Record<string, number> = {
  AransasPass: 0.09,
  Beaumont: 0.11,
  CorpusChristi: 0.14,
  Houston: 0.22,
  Jasper: 0.10,
  Lufkin: 0.13,
  SanAntonio: 0.21
};

const storeProfiles: Record<string, ProfitLossStoreProfile> = {
  AransasPass: {
    weight: 0.09,
    budgetDiscipline: 1.012,
    departmentTilt: { Sales: 0.94, Parts: 1.02, Service: 1.08, Administration: 0.95 }
  },
  Beaumont: {
    weight: 0.11,
    budgetDiscipline: 1.006,
    departmentTilt: { Sales: 1.01, Parts: 0.98, Service: 0.97, Administration: 1.0 }
  },
  CorpusChristi: {
    weight: 0.14,
    budgetDiscipline: 1.01,
    departmentTilt: { Sales: 1.07, Parts: 1.04, Service: 1.0, Administration: 1.01 }
  },
  Houston: {
    weight: 0.22,
    budgetDiscipline: 1.015,
    departmentTilt: { Sales: 1.09, Parts: 0.96, Service: 0.94, Administration: 1.04 }
  },
  Jasper: {
    weight: 0.10,
    budgetDiscipline: 0.998,
    departmentTilt: { Sales: 0.92, Parts: 0.99, Service: 1.06, Administration: 0.97 }
  },
  Lufkin: {
    weight: 0.13,
    budgetDiscipline: 1.004,
    departmentTilt: { Sales: 0.97, Parts: 1.03, Service: 1.05, Administration: 0.99 }
  },
  SanAntonio: {
    weight: 0.21,
    budgetDiscipline: 1.009,
    departmentTilt: { Sales: 1.03, Parts: 1.01, Service: 0.98, Administration: 1.02 }
  }
};

const profitLossLines: ProfitLossLine[] = [
  { account: "4000", description: "New Boat Sales", group: "Income", may2026: 842500, priorYear: 798400 },
  { account: "4100", description: "Used Boat Sales", group: "Income", may2026: 376800, priorYear: 458200 },
  { account: "4200", description: "Parts Sales", group: "Income", may2026: 128450, priorYear: 121800 },
  { account: "4300", description: "Service Labor Sales", group: "Income", may2026: 203125, priorYear: 162400 },
  { account: "", description: "Total Income", group: "Income", isTotal: true, may2026: 1550875, priorYear: 1540800 },
  { account: "5000", description: "Cost of Goods Sold - Units", group: "Cost of Sales", may2026: 903425, priorYear: 854900 },
  { account: "5100", description: "Cost of Goods Sold - Parts", group: "Cost of Sales", may2026: 74220, priorYear: 71100 },
  { account: "5200", description: "Technician Labor Cost", group: "Cost of Sales", may2026: 91150, priorYear: 78200 },
  { account: "", description: "Total Cost of Sales", group: "Cost of Sales", isTotal: true, may2026: 1068795, priorYear: 1004200 },
  { account: "", description: "Gross Profit", group: "Gross Profit", isTotal: true, may2026: 482080, priorYear: 536600 },
  { account: "6000", description: "Payroll Expense", group: "Expenses", may2026: 174250, priorYear: 168400 },
  { account: "6100", description: "Advertising", group: "Expenses", may2026: 38650, priorYear: 24800 },
  { account: "6200", description: "Rent and Occupancy", group: "Expenses", may2026: 52300, priorYear: 51100 },
  { account: "6300", description: "Utilities", group: "Expenses", may2026: 14275, priorYear: 13950 },
  { account: "6400", description: "Insurance", group: "Expenses", may2026: 19800, priorYear: 19200 },
  { account: "6500", description: "Office and Administrative", group: "Expenses", may2026: 27625, priorYear: 26800 },
  { account: "", description: "Total Expenses", group: "Expenses", isTotal: true, may2026: 326900, priorYear: 304250 },
  { account: "", description: "Net Income", group: "Net Income", isTotal: true, may2026: 155180, priorYear: 232350 }
];

const profitLossAccountMeta: Record<string, ProfitLossAccountMeta> = {
  "4000": { department: "Sales", owner: "Regional Sales Director", driver: "Unit close rate", budgetLiftPct: 4.8, volatility: 0.06 },
  "4100": { department: "Sales", owner: "Used Inventory Manager", driver: "Used turn and pricing", budgetLiftPct: 2.5, volatility: 0.07 },
  "4200": { department: "Parts", owner: "Parts Manager", driver: "Counter mix and fill rate", budgetLiftPct: 3.5, volatility: 0.04 },
  "4300": { department: "Service", owner: "Service Director", driver: "Billed hours and effective labor rate", budgetLiftPct: 6.2, volatility: 0.05 },
  "5000": { department: "Sales", owner: "Inventory Controller", driver: "Front-end margin discipline", budgetLiftPct: 1.8, volatility: 0.05 },
  "5100": { department: "Parts", owner: "Parts Manager", driver: "Margin on stocked parts", budgetLiftPct: 2.2, volatility: 0.04 },
  "5200": { department: "Service", owner: "Service Director", driver: "Technician efficiency", budgetLiftPct: 4.1, volatility: 0.04 },
  "6000": { department: "Administration", owner: "HR / Controller", driver: "Payroll scheduling", budgetLiftPct: 2.0, volatility: 0.03 },
  "6100": { department: "Administration", owner: "Marketing Director", driver: "Campaign pacing", budgetLiftPct: 8.0, volatility: 0.08 },
  "6200": { department: "Administration", owner: "Operations Director", driver: "Occupancy plan", budgetLiftPct: 1.5, volatility: 0.02 },
  "6300": { department: "Administration", owner: "Store Ops Manager", driver: "Utility cadence", budgetLiftPct: 1.0, volatility: 0.03 },
  "6400": { department: "Administration", owner: "Controller", driver: "Coverage renewals", budgetLiftPct: 1.2, volatility: 0.02 },
  "6500": { department: "Administration", owner: "Controller", driver: "Back-office spend", budgetLiftPct: 1.8, volatility: 0.03 }
};

const accountTransactionTemplates: Record<string, ProfitLossTransactionTemplate[]> = {
  "4000": [
    { source: "Deal Posting", detail: "Retail delivery funding batch", referencePrefix: "DP", share: 0.48 },
    { source: "Dealer Trade", detail: "Dealer trade settlement", referencePrefix: "DT", share: 0.27 },
    { source: "OEM Incentive", detail: "Volume incentive accrual", referencePrefix: "INC", share: 0.25 }
  ],
  "4100": [
    { source: "Used Deal Jacket", detail: "Pre-owned unit close", referencePrefix: "UD", share: 0.44 },
    { source: "Auction Desk", detail: "Wholesale/auction settlement", referencePrefix: "AUC", share: 0.24 },
    { source: "F&I Reserve", detail: "Reserve release on used deals", referencePrefix: "FIR", share: 0.32 }
  ],
  "4200": [
    { source: "Parts Counter", detail: "Retail counter ticket batch", referencePrefix: "PC", share: 0.46 },
    { source: "Internal RO", detail: "Service internal parts issue", referencePrefix: "IRO", share: 0.29 },
    { source: "Special Order", detail: "Special-order closeout", referencePrefix: "SO", share: 0.25 }
  ],
  "4300": [
    { source: "Closed RO", detail: "Customer-pay labor closed", referencePrefix: "RO", share: 0.51 },
    { source: "Warranty Claim", detail: "Warranty labor reimbursement", referencePrefix: "WAR", share: 0.21 },
    { source: "Rigging Bay", detail: "Rigging labor release", referencePrefix: "RIG", share: 0.28 }
  ],
  "5000": [
    { source: "Inventory Relief", detail: "New unit cost relief", referencePrefix: "IR", share: 0.62 },
    { source: "Freight Accrual", detail: "Inbound freight amortization", referencePrefix: "FR", share: 0.16 },
    { source: "Prep Cost", detail: "Make-ready and rigging cost", referencePrefix: "MR", share: 0.22 }
  ],
  "5100": [
    { source: "Vendor Invoice", detail: "Parts purchase clearing", referencePrefix: "PIN", share: 0.54 },
    { source: "Stock Replenishment", detail: "Stock order receipt", referencePrefix: "SR", share: 0.28 },
    { source: "Special Order Cost", detail: "Special-order fulfillment", referencePrefix: "SOC", share: 0.18 }
  ],
  "5200": [
    { source: "Payroll", detail: "Technician payroll batch", referencePrefix: "PAY", share: 0.63 },
    { source: "Flat Rate Adj", detail: "Flat-rate correction", referencePrefix: "FLA", share: 0.17 },
    { source: "Overtime", detail: "Seasonal overtime true-up", referencePrefix: "OT", share: 0.20 }
  ],
  "6000": [
    { source: "Payroll", detail: "Salaried payroll accrual", referencePrefix: "PAY", share: 0.58 },
    { source: "Commissions", detail: "Manager compensation accrual", referencePrefix: "COM", share: 0.24 },
    { source: "Benefits", detail: "Benefits clearing batch", referencePrefix: "BEN", share: 0.18 }
  ],
  "6100": [
    { source: "Campaign Spend", detail: "Digital campaign invoice", referencePrefix: "MKT", share: 0.41 },
    { source: "Boat Show", detail: "Event and promo spend", referencePrefix: "SHOW", share: 0.34 },
    { source: "Creative", detail: "Creative and media services", referencePrefix: "CRT", share: 0.25 }
  ],
  "6200": [
    { source: "Rent", detail: "Base rent accrual", referencePrefix: "RENT", share: 0.72 },
    { source: "Facilities", detail: "Facility services and repairs", referencePrefix: "FAC", share: 0.16 },
    { source: "Property Tax", detail: "Property tax reserve", referencePrefix: "PTX", share: 0.12 }
  ],
  "6300": [
    { source: "Utilities", detail: "Electric and water sweep", referencePrefix: "UTL", share: 0.57 },
    { source: "Fuel", detail: "Fuel and yard equipment", referencePrefix: "FUEL", share: 0.19 },
    { source: "Waste", detail: "Waste and disposal services", referencePrefix: "WST", share: 0.24 }
  ],
  "6400": [
    { source: "Insurance", detail: "Policy premium accrual", referencePrefix: "INS", share: 0.68 },
    { source: "Claims Reserve", detail: "Claims reserve true-up", referencePrefix: "CLR", share: 0.14 },
    { source: "Fleet Coverage", detail: "Fleet and demo unit coverage", referencePrefix: "FLT", share: 0.18 }
  ],
  "6500": [
    { source: "Office AP", detail: "Office supply and admin AP", referencePrefix: "ADM", share: 0.42 },
    { source: "Software", detail: "System and SaaS expense", referencePrefix: "SAS", share: 0.33 },
    { source: "Professional Fees", detail: "Professional services accrual", referencePrefix: "PRO", share: 0.25 }
  ]
};

const departments = ["Consolidated Statement", "Sales", "Parts", "Service", "Administration"];
const reportMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const profitLossDepartments: ProfitLossDepartment[] = ["Sales", "Parts", "Service", "Administration"];
const profitLossGroupOrder: ProfitLossGroup[] = ["Income", "Cost of Sales", "Gross Profit", "Expenses", "Net Income"];

// seasonal multipliers for marine dealership (index 0 = January)
const SEASONAL = [0.63, 0.69, 0.80, 0.91, 1.00, 1.18, 1.42, 1.30, 1.12, 0.95, 0.78, 0.66];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BASE_MONTH_INDEX = 4;
const SNAPSHOT_STORAGE_KEY = "profit-loss-forecast-snapshots-v1";
const REPORT_SCHEDULE_STORAGE_KEY = "profit-loss-widget-schedules-v1";
const GMAIL_DELIVERY_STORAGE_KEY = "profit-loss-gmail-profile-v1";
const weekdayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const customScheduleRuleOptions = [
  "Every first business day",
  "Every last business day",
  "15th and month end",
  "Quarter close packet",
  "Month-end leadership recap"
];
const MAX_CHART_DATA_WIDGETS = 4;
const MAX_CHART_VISUAL_WIDGETS = 8;
const MAX_WIDGET_PREVIEW_ITEMS = 4;
const chartMetricWidgetOrder: PLChartMetricWidgetId[] = [
  "revenueRunRate",
  "grossProfitRunRate",
  "netIncomeRunRate",
  "forecastRevenueDelta",
  "forecastNetDelta",
  "grossMargin",
  "netMargin",
  "expenseLoad",
  "scenarioConfidence",
  "peakForecastMonth",
  "topStore",
  "departmentLeader",
  "revenueBudgetGap",
  "netBudgetGap",
  "cogsLoad",
  "nextNinetyRevenue",
  "nextNinetyNet",
  "storeMarginSpread",
  "activeAnomalyCount",
  "snapshotVaultCount",
  "bestScenarioNet",
  "topDepartmentMargin"
];
const defaultChartMetricWidgetIds: PLChartMetricWidgetId[] = ["revenueRunRate", "grossProfitRunRate", "netIncomeRunRate", "forecastRevenueDelta"];
const chartWidgetOrder: PLWidgetId[] = [
  "trendExplorer",
  "marginWalk",
  "departmentMix",
  "storeLeaderboard",
  "forecastDelta",
  "variancePulse",
  "departmentScoreboard",
  "scenarioBridge",
  "monthlyOutlookStudio",
  "scenarioCommandCenter",
  "storeMarginMatrix",
  "anomalyLedger",
  "contributorSpotlight",
  "snapshotVault"
];
const defaultChartVisualWidgetIds: PLWidgetId[] = [
  "trendExplorer",
  "marginWalk",
  "departmentMix",
  "storeLeaderboard",
  "forecastDelta",
  "variancePulse",
  "departmentScoreboard",
  "scenarioBridge"
];
const chartWidgetDefinitions: Record<PLWidgetId, { fileStem: string; shortTitle: string; subtitle: string; title: string }> = {
  trendExplorer: {
    fileStem: "trend-explorer",
    shortTitle: "Trend",
    subtitle: "Revenue, gross profit, and net income across actuals and forecast.",
    title: "Trend Explorer"
  },
  marginWalk: {
    fileStem: "margin-walk",
    shortTitle: "Walk",
    subtitle: "Bridge revenue to net income with a quick executive narrative.",
    title: "Margin Walk"
  },
  departmentMix: {
    fileStem: "department-mix",
    shortTitle: "Mix",
    subtitle: "Stacked department contribution over the recent six-month frame.",
    title: "Department Mix"
  },
  storeLeaderboard: {
    fileStem: "store-leaderboard",
    shortTitle: "Stores",
    subtitle: "Revenue-weighted ranking for the current scope.",
    title: "Store Leaderboard"
  },
  forecastDelta: {
    fileStem: "forecast-delta",
    shortTitle: "Delta",
    subtitle: "Scenario revenue pacing versus the baseline forecast window.",
    title: "Forecast Delta"
  },
  variancePulse: {
    fileStem: "variance-pulse",
    shortTitle: "Variance",
    subtitle: "Accounting pulse across budget and prior-year pressure points.",
    title: "Variance Pulse"
  },
  departmentScoreboard: {
    fileStem: "department-scoreboard",
    shortTitle: "Dept",
    subtitle: "CEO scorecards for department scale, margin, and drop-through.",
    title: "Department Scoreboard"
  },
  scenarioBridge: {
    fileStem: "scenario-bridge",
    shortTitle: "Bridge",
    subtitle: "Show how volume, margin, and expense assumptions reshape net income.",
    title: "Scenario Bridge"
  },
  monthlyOutlookStudio: {
    fileStem: "monthly-outlook-studio",
    shortTitle: "Outlook",
    subtitle: "Forward-month revenue and net pacing for the next operating window.",
    title: "Monthly Outlook Studio"
  },
  scenarioCommandCenter: {
    fileStem: "scenario-command-center",
    shortTitle: "Scenario",
    subtitle: "Board-level view of scenario outcomes, confidence, and lift.",
    title: "Scenario Command Center"
  },
  storeMarginMatrix: {
    fileStem: "store-margin-matrix",
    shortTitle: "Matrix",
    subtitle: "Heatmap-style store margin and earnings concentration.",
    title: "Store Margin Matrix"
  },
  anomalyLedger: {
    fileStem: "anomaly-ledger",
    shortTitle: "Alerts",
    subtitle: "Top P&L anomalies and owner focus areas in one panel.",
    title: "Anomaly Ledger"
  },
  contributorSpotlight: {
    fileStem: "contributor-spotlight",
    shortTitle: "Drivers",
    subtitle: "Largest GL drivers with top contributing stores.",
    title: "Contributor Spotlight"
  },
  snapshotVault: {
    fileStem: "snapshot-vault",
    shortTitle: "Vault",
    subtitle: "Saved forecast runs and current board packet candidates.",
    title: "Snapshot Vault"
  }
};
const forecastScenarios: ForecastScenario[] = [
  {
    id: "current",
    label: "Current Run",
    summary: "Hold current mix and protect margin discipline.",
    revenuePct: 0,
    grossMarginBps: 0,
    expensePct: 0,
    accent: "#0b4360"
  },
  {
    id: "board",
    label: "Board Case",
    summary: "Lean into showroom volume while keeping overhead flat.",
    revenuePct: 5,
    grossMarginBps: 90,
    expensePct: -2,
    accent: "#1d4ed8"
  },
  {
    id: "conservative",
    label: "Conservative",
    summary: "Expect softer closings and hold back on discretionary spend.",
    revenuePct: -4,
    grossMarginBps: -40,
    expensePct: -3,
    accent: "#9a3412"
  },
  {
    id: "summerPush",
    label: "Summer Push",
    summary: "Capture peak season demand with stronger unit and service throughput.",
    revenuePct: 8,
    grossMarginBps: 130,
    expensePct: 2,
    accent: "#0f766e"
  }
];
const varianceFocusByGroup: Record<ProfitLossGroup, string> = {
  Income: "Watch unit close rate and average selling price.",
  "Cost of Sales": "Monitor flooring, discounts, and technician absorption.",
  "Gross Profit": "Hold front-end margin and service effective labor rate.",
  Expenses: "Challenge payroll cadence and discretionary operating spend.",
  "Net Income": "Protect drop-through on every incremental gross dollar."
};

// ── pure helpers ──────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtK(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatSignedPercent(value: number, digits = 1) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(digits)}%`;
}

function formatSignedCompactCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${fmtK(Math.abs(value))}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function getPriorYearAmount(value: number, priorYear?: number) {
  return priorYear ?? Math.round(value * 0.94);
}

function getBudgetAmount(value: number, group?: ProfitLossGroup) {
  if (!group) return Math.round(value * 1.04);
  const budgetFactor: Record<ProfitLossGroup, number> = {
    Income: 1.03,
    "Cost of Sales": 0.985,
    "Gross Profit": 1.06,
    Expenses: 0.97,
    "Net Income": 1.12
  };
  return Math.round(value * budgetFactor[group]);
}

function getVariancePercent(value: number, comparisonValue: number) {
  if (comparisonValue === 0) return "0.0%";
  return `${(((value - comparisonValue) / Math.abs(comparisonValue)) * 100).toFixed(1)}%`;
}

function getGroupTotal(lines: ProfitLossLine[], group: ProfitLossGroup) {
  return lines.find((line) => line.group === group && line.isTotal)?.may2026 ?? 0;
}

function getDepartmentMultiplier(department: string) {
  const map: Record<string, number> = { Sales: 0.62, Parts: 0.18, Service: 0.20, Administration: 0.12 };
  return map[department] ?? 1;
}

function getStoreName(storeId: string) {
  return profitLossStores.find((store) => store.id === storeId)?.name ?? storeId;
}

function getDepartmentSelectionMultiplier(selectedDepartment: string, lineDepartment: ProfitLossDepartment, group: ProfitLossGroup) {
  if (selectedDepartment === "Consolidated Statement") return 1;
  if (selectedDepartment === lineDepartment) return 1;
  if (group === "Expenses" && lineDepartment === "Administration") return getDepartmentMultiplier(selectedDepartment);
  return 0;
}

function buildPeriodPressure(account: string, storeId: string, year: number, monthIndex: number, amplitude: number) {
  const accountSeed = Number(account.slice(-2));
  const storeSeed = profitLossStores.findIndex((store) => store.id === storeId) + 1;
  const yearSeed = year - 2024;
  return 1 + Math.sin((monthIndex + 1) * 0.88 + storeSeed * 0.63 + accountSeed * 0.09 + yearSeed * 0.41) * amplitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMonthLabel(monthIndex: number, year: number) {
  return `${MONTH_SHORT[monthIndex]} '${String(year).slice(-2)}`;
}

function getMonthEndDay(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLineYearPair(line: ProfitLossLine, year: number) {
  const year2026 = line.may2026;
  const year2025 = line.priorYear ?? Math.round(year2026 * 0.94);
  const year2024 = Math.round(year2025 * 0.93);
  const year2023 = Math.round(year2024 * 0.92);

  if (year === 2025) return { current: year2025, prior: year2024 };
  if (year === 2024) return { current: year2024, prior: year2023 };
  return { current: year2026, prior: year2025 };
}

function getVarianceTone(group: ProfitLossGroup, pct: number): "favorable" | "risk" | "neutral" {
  if (Math.abs(pct) < 2.5) return "neutral";
  const higherIsBetter = group === "Income" || group === "Gross Profit" || group === "Net Income";
  const favorable = higherIsBetter ? pct >= 0 : pct <= 0;
  return favorable ? "favorable" : "risk";
}

function sumMetric(points: MonthlyPoint[], metric: "revenue" | "grossProfit" | "netIncome") {
  return points.reduce((sum, point) => sum + point[metric], 0);
}

function sumLineMetric(lines: ProfitLossLine[], metric: "may2026" | "priorYear" | "budget") {
  return lines.reduce((sum, line) => sum + (line[metric] ?? 0), 0);
}

function getTrailingPeriods(count: number, endMonthIndex: number, endYear: number) {
  return Array.from({ length: count }, (_, index) => {
    const monthCursor = endMonthIndex - (count - 1 - index);
    return {
      monthIndex: ((monthCursor % 12) + 12) % 12,
      year: endYear + Math.floor(monthCursor / 12)
    };
  });
}

function buildAccountTransactions(line: ProfitLossLine, actual: number, storeId: string, year: number, monthIndex: number, owner: string): ProfitLossTransaction[] {
  if (!line.account || actual === 0) return [];
  const templates = accountTransactionTemplates[line.account] ?? [];
  if (templates.length === 0) return [];

  const storeIndex = profitLossStores.findIndex((store) => store.id === storeId);
  const periodEnd = getMonthEndDay(year, monthIndex);
  let allocated = 0;

  return templates.map((template, index) => {
    const amount = index === templates.length - 1 ? Math.max(actual - allocated, 0) : Math.round(actual * template.share);
    allocated += amount;
    const day = clamp(periodEnd - (index * 5 + (storeIndex % 4)), 1, periodEnd);

    return {
      id: `${storeId}-${year}-${monthIndex}-${line.account}-${index}`,
      date: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      storeId,
      storeName: getStoreName(storeId),
      source: template.source,
      reference: `${template.referencePrefix}-${String(year).slice(-2)}${String(monthIndex + 1).padStart(2, "0")}-${storeId.slice(0, 3).toUpperCase()}${index + 1}`,
      detail: template.detail,
      owner,
      amount
    };
  });
}

function buildScopedStatement(storeIds: string[], year: number, monthIndex: number, selectedDepartment: string): ProfitLossLine[] {
  const monthScale = SEASONAL[monthIndex] / SEASONAL[BASE_MONTH_INDEX];
  const accountLines = profitLossLines.filter((line) => line.account).map((line) => {
    const meta = profitLossAccountMeta[line.account];
    const { current, prior } = getLineYearPair(line, year);
    const contributors = storeIds.map((storeId) => {
      const storeProfile = storeProfiles[storeId];
      if (!storeProfile) return null;

      const departmentSelection = getDepartmentSelectionMultiplier(selectedDepartment, meta.department, line.group);
      if (departmentSelection === 0) return null;

      const scale = storeProfile.weight * storeProfile.departmentTilt[meta.department] * departmentSelection * monthScale;
      const actual = Math.round(current * scale * buildPeriodPressure(line.account, storeId, year, monthIndex, meta.volatility));
      const priorYear = Math.round(prior * scale * buildPeriodPressure(line.account, storeId, year - 1, monthIndex, meta.volatility * 0.85));
      const budget = Math.round(current * scale * storeProfile.budgetDiscipline * (1 + meta.budgetLiftPct / 100));

      return {
        storeId,
        storeName: getStoreName(storeId),
        actual,
        budget,
        priorYear
      };
    }).filter((value): value is ProfitLossStoreContribution => Boolean(value));

    const actual = contributors.reduce((sum, contribution) => sum + contribution.actual, 0);
    const priorYear = contributors.reduce((sum, contribution) => sum + contribution.priorYear, 0);
    const budget = contributors.reduce((sum, contribution) => sum + contribution.budget, 0);
    const transactions = contributors
      .flatMap((contribution) => buildAccountTransactions(line, contribution.actual, contribution.storeId, year, monthIndex, meta.owner))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 6);

    return {
      ...line,
      may2026: actual,
      priorYear,
      budget,
      department: meta.department,
      owner: meta.owner,
      driver: meta.driver,
      transactions,
      contributors
    };
  });

  const incomeLines = accountLines.filter((line) => line.group === "Income");
  const costLines = accountLines.filter((line) => line.group === "Cost of Sales");
  const expenseLines = accountLines.filter((line) => line.group === "Expenses");

  const totalIncome = sumLineMetric(incomeLines, "may2026");
  const totalIncomePrior = sumLineMetric(incomeLines, "priorYear");
  const totalIncomeBudget = sumLineMetric(incomeLines, "budget");
  const totalCost = sumLineMetric(costLines, "may2026");
  const totalCostPrior = sumLineMetric(costLines, "priorYear");
  const totalCostBudget = sumLineMetric(costLines, "budget");
  const totalExpenses = sumLineMetric(expenseLines, "may2026");
  const totalExpensesPrior = sumLineMetric(expenseLines, "priorYear");
  const totalExpensesBudget = sumLineMetric(expenseLines, "budget");

  return [
    ...incomeLines,
    { account: "", description: "Total Income", group: "Income", isTotal: true, may2026: totalIncome, priorYear: totalIncomePrior, budget: totalIncomeBudget },
    ...costLines,
    { account: "", description: "Total Cost of Sales", group: "Cost of Sales", isTotal: true, may2026: totalCost, priorYear: totalCostPrior, budget: totalCostBudget },
    {
      account: "",
      description: "Gross Profit",
      group: "Gross Profit",
      isTotal: true,
      may2026: totalIncome - totalCost,
      priorYear: totalIncomePrior - totalCostPrior,
      budget: totalIncomeBudget - totalCostBudget
    },
    ...expenseLines,
    { account: "", description: "Total Expenses", group: "Expenses", isTotal: true, may2026: totalExpenses, priorYear: totalExpensesPrior, budget: totalExpensesBudget },
    {
      account: "",
      description: "Net Income",
      group: "Net Income",
      isTotal: true,
      may2026: totalIncome - totalCost - totalExpenses,
      priorYear: totalIncomePrior - totalCostPrior - totalExpensesPrior,
      budget: totalIncomeBudget - totalCostBudget - totalExpensesBudget
    }
  ];
}

function buildHistoricalSeries(storeIds: string[], selectedDepartment: string, endYear: number, endMonthIndex: number, count: number): MonthlyPoint[] {
  return getTrailingPeriods(count, endMonthIndex, endYear).map(({ monthIndex, year }) => {
    const lines = buildScopedStatement(storeIds, year, monthIndex, selectedDepartment);
    return {
      label: buildMonthLabel(monthIndex, year),
      revenue: getGroupTotal(lines, "Income"),
      grossProfit: getGroupTotal(lines, "Gross Profit"),
      netIncome: getGroupTotal(lines, "Net Income")
    };
  });
}

function buildDepartmentRevenueHistory(storeIds: string[], endYear: number, endMonthIndex: number, count: number): DeptPoint[] {
  return getTrailingPeriods(count, endMonthIndex, endYear).map(({ monthIndex, year }) => {
    const lines = buildScopedStatement(storeIds, year, monthIndex, "Consolidated Statement");
    const sales = lines.filter((line) => line.account && line.group === "Income" && line.department === "Sales").reduce((sum, line) => sum + line.may2026, 0);
    const parts = lines.filter((line) => line.account && line.group === "Income" && line.department === "Parts").reduce((sum, line) => sum + line.may2026, 0);
    const service = lines.filter((line) => line.account && line.group === "Income" && line.department === "Service").reduce((sum, line) => sum + line.may2026, 0);
    return {
      label: buildMonthLabel(monthIndex, year),
      sales,
      parts,
      service
    };
  });
}

function loadForecastSnapshots(): ForecastSnapshotRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ForecastSnapshotRecord[] : [];
  } catch {
    return [];
  }
}

function persistForecastSnapshots(snapshots: ForecastSnapshotRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
}

function loadGmailDeliveryProfile(): GmailDeliveryProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(GMAIL_DELIVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.address === "string" ? parsed as GmailDeliveryProfile : null;
  } catch {
    return null;
  }
}

function persistGmailDeliveryProfile(profile: GmailDeliveryProfile | null) {
  if (typeof window === "undefined") return;
  if (!profile) {
    window.localStorage.removeItem(GMAIL_DELIVERY_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(GMAIL_DELIVERY_STORAGE_KEY, JSON.stringify(profile));
}

function loadWidgetSchedules(): WidgetScheduleRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(REPORT_SCHEDULE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as WidgetScheduleRecord[] : [];
  } catch {
    return [];
  }
}

function persistWidgetSchedules(schedules: WidgetScheduleRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPORT_SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}

// simple linear regression — returns slope + intercept
function linReg(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  const sx = (n * (n - 1)) / 2;
  const sx2 = ys.reduce((s, _, i) => s + i * i, 0);
  const sy = ys.reduce((a, v) => a + v, 0);
  const sxy = ys.reduce((a, v, i) => a + i * v, 0);
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function buildForecast(history: MonthlyPoint[], adjustments: ScenarioAdjustments = { revenuePct: 0, grossMarginBps: 0, expensePct: 0 }, startMonthIndex = BASE_MONTH_INDEX, startYear = 2026): MonthlyPoint[] {
  const rev = history.map((p) => p.revenue);
  const r = linReg(rev);
  const baseline = (i: number) => r.slope * i + r.intercept;
  const baseGrossMargin = average(history.map((point) => point.grossProfit / Math.max(point.revenue, 1)));
  const baseNetMargin = average(history.map((point) => point.netIncome / Math.max(point.revenue, 1)));
  const baseExpenseRatio = clamp(baseGrossMargin - baseNetMargin, 0.08, 0.34);
  const grossMargin = clamp(baseGrossMargin + adjustments.grossMarginBps / 10_000, 0.18, 0.42);
  const expenseRatio = clamp(baseExpenseRatio * (1 + adjustments.expensePct / 100), 0.06, 0.32);

  return Array.from({ length: 7 }, (_, j) => {
    const monthCursor = startMonthIndex + 1 + j;
    const monthIdx = monthCursor % 12;
    const year = startYear + Math.floor(monthCursor / 12);
    const label = buildMonthLabel(monthIdx, year);
    const projectedRevenue = Math.round(baseline(history.length + j) * SEASONAL[monthIdx] * (1 + adjustments.revenuePct / 100));
    const projectedGrossProfit = Math.round(projectedRevenue * grossMargin);
    const projectedNetIncome = Math.round(projectedRevenue * (grossMargin - expenseRatio));
    return { label, revenue: projectedRevenue, grossProfit: projectedGrossProfit, netIncome: projectedNetIncome };
  });
}

function buildVariancePulseRows(lines: ProfitLossLine[]): VariancePulseRow[] {
  return profitLossGroupOrder.map((group) => {
    const actual = getGroupTotal(lines, group);
    const totalLine = lines.find((line) => line.group === group && line.isTotal);
    const prior = getPriorYearAmount(actual, totalLine?.priorYear);
    const budget = totalLine?.budget ?? getBudgetAmount(actual, group);
    const budgetPct = budget === 0 ? 0 : ((actual - budget) / Math.abs(budget)) * 100;
    const priorPct = prior === 0 ? 0 : ((actual - prior) / Math.abs(prior)) * 100;

    return {
      group,
      actual,
      budgetPct,
      priorPct,
      budgetTone: getVarianceTone(group, budgetPct),
      priorTone: getVarianceTone(group, priorPct),
      focus: varianceFocusByGroup[group]
    };
  });
}

function buildScenarioBridge(history: MonthlyPoint[], adjustments: ScenarioAdjustments, startMonthIndex: number, startYear: number): ScenarioBridgePoint[] {
  const base = buildForecast(history, { revenuePct: 0, grossMarginBps: 0, expensePct: 0 }, startMonthIndex, startYear);
  const volume = buildForecast(history, { revenuePct: adjustments.revenuePct, grossMarginBps: 0, expensePct: 0 }, startMonthIndex, startYear);
  const margin = buildForecast(history, { revenuePct: adjustments.revenuePct, grossMarginBps: adjustments.grossMarginBps, expensePct: 0 }, startMonthIndex, startYear);
  const finalRun = buildForecast(history, adjustments, startMonthIndex, startYear);

  const baseNet = sumMetric(base, "netIncome");
  const volumeNet = sumMetric(volume, "netIncome");
  const marginNet = sumMetric(margin, "netIncome");
  const finalNet = sumMetric(finalRun, "netIncome");

  return [
    { label: "Baseline", value: baseNet, tone: "neutral" },
    { label: "Volume", value: volumeNet - baseNet, tone: volumeNet >= baseNet ? "up" : "down" },
    { label: "Margin", value: marginNet - volumeNet, tone: marginNet >= volumeNet ? "up" : "down" },
    { label: "Expenses", value: finalNet - marginNet, tone: finalNet >= marginNet ? "up" : "down" },
    { label: "Scenario Net", value: finalNet, tone: "neutral" }
  ];
}

function getForecastConfidence(adjustments: ScenarioAdjustments) {
  const intensity = Math.abs(adjustments.revenuePct) * 1.4 + Math.abs(adjustments.grossMarginBps) / 60 + Math.abs(adjustments.expensePct) * 1.2;
  const score = Math.round(clamp(92 - intensity, 50, 92));

  if (score >= 85) return { score, label: "High confidence" };
  if (score >= 72) return { score, label: "Moderate confidence" };
  return { score, label: "Watch assumptions" };
}

function anomalyMap(lines: ProfitLossLine[]): Map<string, { pct: number; direction: "up" | "down" }> {
  const result = new Map<string, { pct: number; direction: "up" | "down" }>();
  for (const line of lines) {
    if (!line.account || line.isTotal) continue;
    const prior = getPriorYearAmount(line.may2026, line.priorYear);
    if (prior === 0) continue;
    const pct = ((line.may2026 - prior) / Math.abs(prior)) * 100;
    if (Math.abs(pct) >= 15) result.set(line.account, { pct, direction: pct > 0 ? "up" : "down" });
  }
  return result;
}

function buildCommentary(lines: ProfitLossLine[], month: string, anomalies: Map<string, { pct: number; direction: "up" | "down" }>): string[] {
  const insights: string[] = [];
  const revenue = getGroupTotal(lines, "Income");
  const gross = getGroupTotal(lines, "Gross Profit");
  const net = getGroupTotal(lines, "Net Income");
  const totalBudget = lines.find((line) => line.group === "Net Income" && line.isTotal)?.budget ?? 0;
  const margin = revenue > 0 ? (net / revenue) * 100 : 0;
  insights.push(`${month} net margin is ${margin.toFixed(1)}% — ${margin >= 10 ? "on track" : "below 10% target"}.`);
  for (const [acct, { pct, direction }] of anomalies.entries()) {
    const line = lines.find((l) => l.account === acct);
    if (line) insights.push(`${line.description} is ${direction === "up" ? "up" : "down"} ${Math.abs(pct).toFixed(1)}% vs prior year (${formatCurrency(line.may2026)}).`);
  }
  if (totalBudget > 0 && net < totalBudget) {
    insights.push(`Net income trails budget by ${formatCurrency(totalBudget - net)} — work revenue mix and discretionary spend.`);
  }
  if (revenue > 0) {
    const gm = (gross / revenue) * 100;
    if (gm < 30) insights.push(`Gross margin of ${gm.toFixed(1)}% is below the 30% target — review COGS.`);
  }
  return insights.slice(0, 4);
}

function lerp(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (inMax === inMin) return outMin;
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function polyline(points: Array<[number, number]>) {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

interface SparklineProps {
  values: number[];
  color: string;
}

function Sparkline({ values, color }: SparklineProps) {
  const width = 78;
  const height = 24;
  const pad = 2;
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const points = values.map<[number, number]>((value, index) => {
    const x = lerp(index, 0, Math.max(values.length - 1, 1), pad, width - pad);
    const y = pad + lerp(value, minV, maxV, height - pad * 2, 0);
    return [x, y];
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="pl-sparkline" aria-hidden="true">
      <path d={polyline(points)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function exportCSV(lines: ProfitLossLine[], month: string, year: string) {
  const rows = [["GL Account", "Description", "Group", `${month} ${year}`, "Budget", "Prior Year", "Owner"]];
  for (const line of lines) {
    rows.push([
      line.account,
      line.description,
      line.group,
      String(line.may2026),
      String(line.budget ?? ""),
      String(line.priorYear ?? ""),
      line.owner ?? ""
    ]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ProfitLoss_${month}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── SVG chart layout constants ────────────────────────────────────────────────
const W = 760, H = 300, PAD_L = 60, PAD_R = 18, PAD_T = 18, PAD_B = 64;
const CW = W - PAD_L - PAD_R;
const CH = H - PAD_T - PAD_B;

function getChartTooltipX(anchorX: number | null, tooltipWidth: number) {
  if (anchorX === null) {
    return PAD_L;
  }

  return anchorX > W - PAD_R - tooltipWidth - 8
    ? anchorX - tooltipWidth - 10
    : anchorX + 10;
}

// ── TrendChart ────────────────────────────────────────────────────────────────
interface TrendChartProps { history: MonthlyPoint[]; forecast: MonthlyPoint[] }

function TrendChart({ history, forecast }: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const combined = [...history, ...forecast];
  const maxRev = Math.max(...combined.map((p) => p.revenue));
  const minNI = Math.min(...combined.map((p) => p.netIncome));
  const axisLabelY = H - 24;
  const legendY = H - 8;
  const xv = (i: number) => PAD_L + lerp(i, 0, combined.length - 1, 0, CW);
  const yv = (v: number) => PAD_T + lerp(v, minNI, maxRev, CH, 0);
  const revPts = combined.map<[number, number]>((p, i) => [xv(i), yv(p.revenue)]);
  const gpPts = combined.map<[number, number]>((p, i) => [xv(i), yv(p.grossProfit)]);
  const niPts = combined.map<[number, number]>((p, i) => [xv(i), yv(p.netIncome)]);
  const divX = xv(history.length - 0.5);
  const yTicks = 4;
  const yStep = (maxRev - minNI) / yTicks;
  const hoverPoint = hoverIndex !== null ? combined[hoverIndex] : null;
  const hoverIsForecast = hoverIndex !== null && hoverIndex >= history.length;
  const hoverX = hoverIndex !== null ? xv(hoverIndex) : null;
  const tooltipWidth = 156;
  const tooltipHeight = 82;
  const tooltipX = getChartTooltipX(hoverX, tooltipWidth);
  const tooltipY = PAD_T + 8;

  function handleChartHover(event: ReactMouseEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;

    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const nextIndex = Math.round(ratio * Math.max(combined.length - 1, 0));
    setHoverIndex(nextIndex);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pl-chart-svg">
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = minNI + yStep * i;
        const y = yv(val);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" className="pl-chart-ya">{fmtK(val)}</text>
          </g>
        );
      })}
      <rect x={divX} y={PAD_T} width={W - PAD_R - divX} height={CH} fill="#f0fdf4" opacity="0.6" />
      <line x1={divX} y1={PAD_T} x2={divX} y2={PAD_T + CH} stroke="#bbf7d0" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={divX + 4} y={PAD_T + 12} className="pl-chart-ya" fill="#16a34a">Forecast</text>
      <path d={polyline(revPts.slice(0, history.length))} fill="none" stroke="#3b82f6" strokeWidth="2" />
      <path d={polyline(revPts.slice(history.length - 1))} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,3" opacity="0.7" />
      <path d={polyline(gpPts)} fill="none" stroke="#22c55e" strokeWidth="1.5" />
      <path d={polyline(niPts)} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <rect
        x={PAD_L}
        y={PAD_T}
        width={CW}
        height={CH}
        fill="transparent"
        style={{ cursor: "crosshair" }}
        onMouseMove={handleChartHover}
        onMouseLeave={() => setHoverIndex(null)}
      />
      {hoverPoint && hoverX !== null && (
        <>
          <line x1={hoverX} y1={PAD_T} x2={hoverX} y2={PAD_T + CH} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,4" />
          <circle cx={hoverX} cy={yv(hoverPoint.revenue)} r="4.5" fill="#ffffff" stroke="#3b82f6" strokeWidth="2.5" />
          <circle cx={hoverX} cy={yv(hoverPoint.grossProfit)} r="4" fill="#ffffff" stroke="#22c55e" strokeWidth="2" />
          <circle cx={hoverX} cy={yv(hoverPoint.netIncome)} r="4" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
          <g pointerEvents="none" transform={`translate(${tooltipX},${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" opacity="0.98" />
            <text x="12" y="18" fill="#0f172a" fontSize="11" fontWeight="800">{hoverPoint.label}</text>
            <text x="12" y="32" fill="#64748b" fontSize="9.5">{hoverIsForecast ? "Forecast" : "Actuals"}</text>
            <line x1="12" y1="39" x2={tooltipWidth - 12} y2="39" stroke="#e2e8f0" strokeWidth="1" />
            <text x="12" y="54" fill="#3b82f6" fontSize="10" fontWeight="700">Revenue</text>
            <text x={tooltipWidth - 12} y="54" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.revenue)}</text>
            <text x="12" y="67" fill="#22c55e" fontSize="10" fontWeight="700">Gross Profit</text>
            <text x={tooltipWidth - 12} y="67" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.grossProfit)}</text>
            <text x="12" y="80" fill="#f59e0b" fontSize="10" fontWeight="700">Net Income</text>
            <text x={tooltipWidth - 12} y="80" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.netIncome)}</text>
          </g>
        </>
      )}
      {combined.map((p, i) => {
        const monthOnly = p.label.slice(0, 3);
        const showFullLabel = i === 0 || i === history.length || p.label.startsWith("Jan ");

        return (
        <text
          key={p.label}
          x={xv(i)}
          y={axisLabelY}
          textAnchor="middle"
          className="pl-chart-xa"
          fontSize="9"
        >
          {showFullLabel ? p.label : monthOnly}
        </text>
        );
      })}
      <g transform={`translate(${PAD_L},${legendY})`}>
        {[{ color: "#3b82f6", label: "Revenue" }, { color: "#22c55e", label: "Gross Profit" }, { color: "#f59e0b", label: "Net Income" }].map((item, i) => (
          <g key={item.label} transform={`translate(${i * 130},0)`}>
            <line x1={0} y1={-2} x2={16} y2={-2} stroke={item.color} strokeWidth="2" />
            <text x={20} y={0} className="pl-chart-legend">{item.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── WaterfallChart ────────────────────────────────────────────────────────────
interface WaterfallChartProps { revenue: number; grossProfit: number; netIncome: number }

function WaterfallChart({ revenue, grossProfit, netIncome }: WaterfallChartProps) {
  const [hoverBarIndex, setHoverBarIndex] = useState<number | null>(null);
  const bars = [
    { label: "Revenue", end: revenue, start: 0, type: "total" as const },
    { label: "COGS", end: grossProfit, start: revenue, type: "neg" as const },
    { label: "Gross Profit", end: grossProfit, start: 0, type: "total" as const },
    { label: "Expenses", end: netIncome, start: grossProfit, type: "neg" as const },
    { label: "Net Income", end: netIncome, start: 0, type: "pos" as const }
  ];
  const barW = Math.floor(CW / bars.length);
  const gap = 8;
  const yv = (v: number) => PAD_T + lerp(v, 0, revenue, CH, 0);
  const fillMap = { pos: "#22c55e", neg: "#ef4444", total: "#3b82f6" };
  const hoverBar = hoverBarIndex !== null ? bars[hoverBarIndex] : null;
  const hoverX = hoverBarIndex !== null ? PAD_L + hoverBarIndex * barW + barW / 2 : null;
  const tooltipWidth = 160;
  const tooltipHeight = 86;
  const tooltipX = getChartTooltipX(hoverX, tooltipWidth);
  const tooltipY = PAD_T + 8;

  function handleChartHover(event: ReactMouseEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;

    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const nextIndex = Math.round(ratio * Math.max(bars.length - 1, 0));
    setHoverBarIndex(nextIndex);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pl-chart-svg">
      {Array.from({ length: 5 }, (_, i) => {
        const v = (revenue / 4) * i;
        const y = yv(v);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" className="pl-chart-ya">{fmtK(v)}</text>
          </g>
        );
      })}
      {hoverBarIndex !== null && (
        <rect
          x={PAD_L + hoverBarIndex * barW}
          y={PAD_T}
          width={barW}
          height={CH}
          fill="#dbeafe"
          opacity="0.4"
          rx="8"
        />
      )}
      {bars.map((bar, i) => {
        const x = PAD_L + i * barW + gap / 2;
        const w = barW - gap;
        const y1 = yv(Math.max(bar.start, bar.end));
        const y2 = yv(Math.min(bar.start, bar.end));
        const nextBar = bars[i + 1];
        const isActive = hoverBarIndex === i;
        return (
          <g key={bar.label}>
            <rect
              x={x}
              y={y1}
              width={w}
              height={Math.max(y2 - y1, 2)}
              fill={fillMap[bar.type]}
              rx="2"
              opacity={isActive ? "1" : "0.85"}
              stroke={isActive ? "#0f172a" : "none"}
              strokeWidth={isActive ? "1.5" : "0"}
            />
            <text x={x + w / 2} y={y1 - 4} textAnchor="middle" className="pl-chart-xa" fontSize="9">{fmtK(bar.end)}</text>
            <text x={x + w / 2} y={H - 6} textAnchor="middle" className="pl-chart-xa">{bar.label}</text>
            {nextBar && (
              <line x1={x + w} y1={yv(bar.end)} x2={PAD_L + (i + 1) * barW + gap / 2} y2={yv(bar.end)} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,2" />
            )}
          </g>
        );
      })}
      <rect
        x={PAD_L}
        y={PAD_T}
        width={CW}
        height={CH}
        fill="transparent"
        style={{ cursor: "crosshair" }}
        onMouseMove={handleChartHover}
        onMouseLeave={() => setHoverBarIndex(null)}
      />
      {hoverBar && hoverX !== null && (
        <g pointerEvents="none" transform={`translate(${tooltipX},${tooltipY})`}>
          <rect width={tooltipWidth} height={tooltipHeight} rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" opacity="0.98" />
          <text x="12" y="18" fill="#0f172a" fontSize="11" fontWeight="800">{hoverBar.label}</text>
          <text x="12" y="32" fill="#64748b" fontSize="9.5">{hoverBar.type === "total" ? "Reported total" : "Bridge step"}</text>
          <line x1="12" y1="39" x2={tooltipWidth - 12} y2="39" stroke="#e2e8f0" strokeWidth="1" />
          <text x="12" y="55" fill="#64748b" fontSize="10" fontWeight="700">Start</text>
          <text x={tooltipWidth - 12} y="55" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverBar.start)}</text>
          <text x="12" y="69" fill="#2563eb" fontSize="10" fontWeight="700">End</text>
          <text x={tooltipWidth - 12} y="69" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverBar.end)}</text>
          <text x="12" y="83" fill="#475569" fontSize="10" fontWeight="700">Change</text>
          <text x={tooltipWidth - 12} y="83" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverBar.end - hoverBar.start)}</text>
        </g>
      )}
    </svg>
  );
}

// ── DeptChart (stacked bars) ──────────────────────────────────────────────────
interface DeptChartProps { data: DeptPoint[] }

function DeptChart({ data }: DeptChartProps) {
  const [hoverBarIndex, setHoverBarIndex] = useState<number | null>(null);
  const totals = data.map((d) => d.sales + d.parts + d.service);
  const maxV = Math.max(...totals);
  const barW = Math.floor(CW / data.length);
  const gap = 10;
  const axisLabelY = H - 26;
  const legendY = H - 8;
  const yv = (v: number) => PAD_T + lerp(v, 0, maxV, CH, 0);
  const colors = { sales: "#3b82f6", parts: "#a855f7", service: "#22c55e" };
  const hoverPoint = hoverBarIndex !== null ? data[hoverBarIndex] : null;
  const hoverX = hoverBarIndex !== null ? PAD_L + hoverBarIndex * barW + barW / 2 : null;
  const tooltipWidth = 168;
  const tooltipHeight = 96;
  const tooltipX = getChartTooltipX(hoverX, tooltipWidth);
  const tooltipY = PAD_T + 8;

  function handleChartHover(event: ReactMouseEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;

    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const nextIndex = Math.round(ratio * Math.max(data.length - 1, 0));
    setHoverBarIndex(nextIndex);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pl-chart-svg">
      {Array.from({ length: 5 }, (_, i) => {
        const v = (maxV / 4) * i;
        const y = yv(v);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" className="pl-chart-ya">{fmtK(v)}</text>
          </g>
        );
      })}
      {hoverBarIndex !== null && (
        <rect
          x={PAD_L + hoverBarIndex * barW}
          y={PAD_T}
          width={barW}
          height={CH}
          fill="#dbeafe"
          opacity="0.4"
          rx="8"
        />
      )}
      {data.map((d, i) => {
        const x = PAD_L + i * barW + gap / 2;
        const w = barW - gap;
        const total = d.sales + d.parts + d.service;
        const layers = [{ key: "sales" as const, value: d.sales }, { key: "parts" as const, value: d.parts }, { key: "service" as const, value: d.service }];
        const isActive = hoverBarIndex === i;
        let cumulative = 0;
        return (
          <g key={d.label}>
            {layers.map(({ key, value }) => {
              const y1 = yv(cumulative + value);
              const y2 = yv(cumulative);
              cumulative += value;
              return (
                <rect
                  key={key}
                  x={x}
                  y={y1}
                  width={w}
                  height={Math.max(y2 - y1, 2)}
                  fill={colors[key]}
                  opacity={isActive ? "1" : "0.85"}
                  rx="1"
                  stroke={isActive ? "#ffffff" : "none"}
                  strokeWidth={isActive ? "1" : "0"}
                />
              );
            })}
            <text x={x + w / 2} y={yv(total) - 4} textAnchor="middle" className="pl-chart-xa" fontSize="9">{fmtK(total)}</text>
            <text x={x + w / 2} y={axisLabelY} textAnchor="middle" className="pl-chart-xa" fontSize="8.5">{d.label}</text>
          </g>
        );
      })}
      <rect
        x={PAD_L}
        y={PAD_T}
        width={CW}
        height={CH}
        fill="transparent"
        style={{ cursor: "crosshair" }}
        onMouseMove={handleChartHover}
        onMouseLeave={() => setHoverBarIndex(null)}
      />
      {hoverPoint && hoverX !== null && (
        <g pointerEvents="none" transform={`translate(${tooltipX},${tooltipY})`}>
          <rect width={tooltipWidth} height={tooltipHeight} rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" opacity="0.98" />
          <text x="12" y="18" fill="#0f172a" fontSize="11" fontWeight="800">{hoverPoint.label}</text>
          <text x="12" y="32" fill="#64748b" fontSize="9.5">Department contribution mix</text>
          <line x1="12" y1="39" x2={tooltipWidth - 12} y2="39" stroke="#e2e8f0" strokeWidth="1" />
          <text x="12" y="55" fill="#3b82f6" fontSize="10" fontWeight="700">Sales</text>
          <text x={tooltipWidth - 12} y="55" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.sales)}</text>
          <text x="12" y="69" fill="#a855f7" fontSize="10" fontWeight="700">Parts</text>
          <text x={tooltipWidth - 12} y="69" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.parts)}</text>
          <text x="12" y="83" fill="#22c55e" fontSize="10" fontWeight="700">Service</text>
          <text x={tooltipWidth - 12} y="83" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.service)}</text>
          <text x="12" y="97" fill="#475569" fontSize="10" fontWeight="700">Total</text>
          <text x={tooltipWidth - 12} y="97" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.sales + hoverPoint.parts + hoverPoint.service)}</text>
        </g>
      )}
      <g transform={`translate(${PAD_L},${legendY})`}>
        {[{ color: colors.sales, label: "Sales" }, { color: colors.parts, label: "Parts" }, { color: colors.service, label: "Service" }].map((item, i) => (
          <g key={item.label} transform={`translate(${i * 90},0)`}>
            <rect x={0} y={-8} width={12} height={8} fill={item.color} opacity="0.85" />
            <text x={16} y={0} className="pl-chart-legend">{item.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

interface ForecastDeltaChartProps {
  baseline: MonthlyPoint[];
  scenario: MonthlyPoint[];
  scenarioLabel: string;
}

function ForecastDeltaChart({ baseline, scenario, scenarioLabel }: ForecastDeltaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const combined = scenario.map((point, index) => ({
    baseline: baseline[index]?.revenue ?? 0,
    label: point.label,
    scenario: point.revenue
  }));
  const maxV = Math.max(1, ...combined.flatMap((point) => [point.baseline, point.scenario]));
  const minV = Math.min(...combined.flatMap((point) => [point.baseline, point.scenario]));
  const upperBound = maxV === minV ? maxV + 1 : maxV;
  const yTicks = 4;
  const yStep = (upperBound - minV) / yTicks;
  const axisLabelY = H - 24;
  const legendY = H - 8;
  const xv = (index: number) => PAD_L + lerp(index, 0, Math.max(combined.length - 1, 1), 0, CW);
  const yv = (value: number) => PAD_T + lerp(value, minV, upperBound, CH, 0);
  const baselinePoints = combined.map<[number, number]>((point, index) => [xv(index), yv(point.baseline)]);
  const scenarioPoints = combined.map<[number, number]>((point, index) => [xv(index), yv(point.scenario)]);
  const hoverPoint = hoverIndex !== null ? combined[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? xv(hoverIndex) : null;
  const tooltipWidth = 168;
  const tooltipHeight = 84;
  const tooltipX = getChartTooltipX(hoverX, tooltipWidth);
  const tooltipY = PAD_T + 8;

  function handleChartHover(event: ReactMouseEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;

    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const nextIndex = Math.round(ratio * Math.max(combined.length - 1, 0));
    setHoverIndex(nextIndex);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pl-chart-svg">
      {Array.from({ length: yTicks + 1 }, (_, index) => {
        const value = minV + yStep * index;
        const y = yv(value);
        return (
          <g key={index}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" className="pl-chart-ya">{fmtK(value)}</text>
          </g>
        );
      })}
      <path d={polyline(baselinePoints)} fill="none" stroke="#94a3b8" strokeDasharray="5,4" strokeWidth="2" />
      <path d={polyline(scenarioPoints)} fill="none" stroke="#2563eb" strokeWidth="2.4" />
      <rect
        x={PAD_L}
        y={PAD_T}
        width={CW}
        height={CH}
        fill="transparent"
        style={{ cursor: "crosshair" }}
        onMouseMove={handleChartHover}
        onMouseLeave={() => setHoverIndex(null)}
      />
      {hoverPoint && hoverX !== null && (
        <>
          <line x1={hoverX} y1={PAD_T} x2={hoverX} y2={PAD_T + CH} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,4" />
          <circle cx={hoverX} cy={yv(hoverPoint.baseline)} r="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
          <circle cx={hoverX} cy={yv(hoverPoint.scenario)} r="4.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
          <g pointerEvents="none" transform={`translate(${tooltipX},${tooltipY})`}>
            <rect width={tooltipWidth} height={tooltipHeight} rx="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" opacity="0.98" />
            <text x="12" y="18" fill="#0f172a" fontSize="11" fontWeight="800">{hoverPoint.label}</text>
            <text x="12" y="32" fill="#64748b" fontSize="9.5">Scenario pacing versus baseline</text>
            <line x1="12" y1="39" x2={tooltipWidth - 12} y2="39" stroke="#e2e8f0" strokeWidth="1" />
            <text x="12" y="55" fill="#94a3b8" fontSize="10" fontWeight="700">Baseline</text>
            <text x={tooltipWidth - 12} y="55" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.baseline)}</text>
            <text x="12" y="69" fill="#2563eb" fontSize="10" fontWeight="700">{scenarioLabel}</text>
            <text x={tooltipWidth - 12} y="69" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.scenario)}</text>
            <text x="12" y="83" fill="#475569" fontSize="10" fontWeight="700">Delta</text>
            <text x={tooltipWidth - 12} y="83" fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="end">{fmtK(hoverPoint.scenario - hoverPoint.baseline)}</text>
          </g>
        </>
      )}
      {combined.map((point, index) => (
        <g key={point.label}>
          <circle cx={xv(index)} cy={yv(point.scenario)} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
          <text x={xv(index)} y={axisLabelY} textAnchor="middle" className="pl-chart-xa" fontSize="8.5">
            {point.label.slice(0, 3)}
          </text>
        </g>
      ))}
      <g transform={`translate(${PAD_L},${legendY})`}>
        <g>
          <line x1={0} y1={-2} x2={16} y2={-2} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,4" />
          <text x={20} y={0} className="pl-chart-legend">Baseline</text>
        </g>
        <g transform="translate(124,0)">
          <line x1={0} y1={-2} x2={16} y2={-2} stroke="#2563eb" strokeWidth="2.4" />
          <text x={20} y={0} className="pl-chart-legend">{scenarioLabel}</text>
        </g>
      </g>
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export function ProfitLossWorkspace() {
  const [selectedDepartment, setSelectedDepartment] = useState("Consolidated Statement");
  const [selectedMonth, setSelectedMonth] = useState("May");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [varianceMode, setVarianceMode] = useState<PLVarianceMode>("actual");
  const [displayAccountNumber, setDisplayAccountNumber] = useState(true);
  const [selectedStoreIds, setSelectedStoreIds] = useState(() => new Set(profitLossStores.map((s) => s.id)));
  const [collapsedGroups, setCollapsedGroups] = useState<Set<ProfitLossGroup>>(() => new Set());
  const [selectedAccount, setSelectedAccount] = useState<ProfitLossLine | null>(null);
  const [viewMode, setViewMode] = useState<PLViewMode>("report");
  const [chartLayoutMode, setChartLayoutMode] = useState<PLReportLayoutMode>("board");
  const [visibleChartMetricWidgetIds, setVisibleChartMetricWidgetIds] = useState<PLChartMetricWidgetId[]>(defaultChartMetricWidgetIds);
  const [visibleChartVisualWidgetIds, setVisibleChartVisualWidgetIds] = useState<PLWidgetId[]>(defaultChartVisualWidgetIds);
  const [featuredChartWidgetId, setFeaturedChartWidgetId] = useState<PLWidgetId>(defaultChartVisualWidgetIds[0]);
  const [chartWidgetLibrarySection, setChartWidgetLibrarySection] = useState<WidgetLibrarySection | null>(null);
  const [showCommentary, setShowCommentary] = useState(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState<PLScenarioId>("current");
  const [forecastLayoutMode, setForecastLayoutMode] = useState<PLReportLayoutMode>("board");
  const [forecastReport, setForecastReport] = useState<PLForecastReport>("scenarioLab");
  const [revenueLiftPct, setRevenueLiftPct] = useState(0);
  const [marginShiftBps, setMarginShiftBps] = useState(0);
  const [expenseShiftPct, setExpenseShiftPct] = useState(0);
  const [savedSnapshots, setSavedSnapshots] = useState<ForecastSnapshotRecord[]>(() => loadForecastSnapshots());
  const widgetPanelRefs = useRef<Partial<Record<PLWidgetId, HTMLElement | null>>>({});
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<PLWidgetId[]>([]);
  const [deliveryNotice, setDeliveryNotice] = useState("");
  const [deliveryModalMode, setDeliveryModalMode] = useState<WidgetDeliveryModalMode | null>(null);
  const [gmailProfile, setGmailProfile] = useState<GmailDeliveryProfile | null>(() => loadGmailDeliveryProfile());
  const [gmailDraftAddress, setGmailDraftAddress] = useState(() => loadGmailDeliveryProfile()?.address ?? "");
  const [deliveryRecipient, setDeliveryRecipient] = useState(() => loadGmailDeliveryProfile()?.address ?? "");
  const [deliveryWidgetIds, setDeliveryWidgetIds] = useState<PLWidgetId[]>([]);
  const [deliveryStoreScope, setDeliveryStoreScope] = useState<WidgetStoreScope>("current");
  const [deliveryCustomStoreIds, setDeliveryCustomStoreIds] = useState<string[]>([]);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [includePdfExports, setIncludePdfExports] = useState(true);
  const [scheduleCadence, setScheduleCadence] = useState<WidgetScheduleCadence>("weekly");
  const [scheduleWeekday, setScheduleWeekday] = useState("Tuesday");
  const [scheduleWeekdays, setScheduleWeekdays] = useState<string[]>(["Monday", "Wednesday", "Friday"]);
  const [scheduleMonthlyDay, setScheduleMonthlyDay] = useState("1");
  const [scheduleCustomRule, setScheduleCustomRule] = useState(customScheduleRuleOptions[0]);
  const [savedWidgetSchedules, setSavedWidgetSchedules] = useState<WidgetScheduleRecord[]>(() => loadWidgetSchedules());
  const [isExportingWidgetId, setIsExportingWidgetId] = useState<PLWidgetId | null>(null);
  const [isSendingWidgetReport, setIsSendingWidgetReport] = useState(false);

  const selectedStoreCount = selectedStoreIds.size;
  const selectedStoreIdList = useMemo(() => Array.from(selectedStoreIds), [selectedStoreIds]);
  const selectedStoreNames = profitLossStores.filter((store) => selectedStoreIds.has(store.id)).map((store) => store.name);
  const selectedStoresLabel = selectedStoreCount === profitLossStores.length ? "All Stores" : selectedStoreCount === 1 ? selectedStoreNames[0] : `${selectedStoreCount} Stores`;
  const selectedMonthIndex = reportMonths.indexOf(selectedMonth);
  const selectedYearNumber = Number(selectedYear);
  const periodEndDay = getMonthEndDay(selectedYearNumber, selectedMonthIndex);
  const selectedStoreScale = useMemo(
    () => selectedStoreIdList.reduce((sum, storeId) => sum + (storeProfiles[storeId]?.weight ?? storeWeights[storeId] ?? 0), 0),
    [selectedStoreIdList]
  );
  const scopeLabel = selectedStoreScale >= 0.999 ? "Full network" : `${Math.round(selectedStoreScale * 100)}% of network volume`;
  const scenarioAdjustments = useMemo<ScenarioAdjustments>(
    () => ({ revenuePct: revenueLiftPct, grossMarginBps: marginShiftBps, expensePct: expenseShiftPct }),
    [revenueLiftPct, marginShiftBps, expenseShiftPct]
  );
  const activeScenario = forecastScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? forecastScenarios[0];

  const statementLines = useMemo(
    () => buildScopedStatement(selectedStoreIdList, selectedYearNumber, selectedMonthIndex, selectedDepartment),
    [selectedDepartment, selectedMonthIndex, selectedStoreIdList, selectedYearNumber]
  );

  const scopedHistoryData = useMemo(
    () => buildHistoricalSeries(selectedStoreIdList, selectedDepartment, selectedYearNumber, selectedMonthIndex, 12),
    [selectedDepartment, selectedMonthIndex, selectedStoreIdList, selectedYearNumber]
  );

  const scopedDeptData = useMemo(
    () => buildDepartmentRevenueHistory(selectedStoreIdList, selectedYearNumber, selectedMonthIndex, 6),
    [selectedMonthIndex, selectedStoreIdList, selectedYearNumber]
  );

  const groupedLines = useMemo(
    () => profitLossGroupOrder.map((group) => ({ group, lines: statementLines.filter((l) => l.group === group) })),
    [statementLines]
  );

  const revenue = getGroupTotal(statementLines, "Income");
  const grossProfit = getGroupTotal(statementLines, "Gross Profit");
  const netIncome = getGroupTotal(statementLines, "Net Income");
  const expenses = getGroupTotal(statementLines, "Expenses");
  const costOfSales = getGroupTotal(statementLines, "Cost of Sales");
  const netMarginPct = revenue > 0 ? (netIncome / revenue) * 100 : 0;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const anomalies = useMemo(() => anomalyMap(statementLines), [statementLines]);
  const baselineForecast = useMemo(() => buildForecast(scopedHistoryData, { revenuePct: 0, grossMarginBps: 0, expensePct: 0 }, selectedMonthIndex, selectedYearNumber), [scopedHistoryData, selectedMonthIndex, selectedYearNumber]);
  const forecast = useMemo(() => buildForecast(scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber), [scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber]);
  const commentary = useMemo(() => buildCommentary(statementLines, selectedMonth, anomalies), [statementLines, selectedMonth, anomalies]);
  const variancePulseRows = useMemo(() => buildVariancePulseRows(statementLines), [statementLines]);
  const scenarioBridge = useMemo(() => buildScenarioBridge(scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber), [scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber]);
  const forecastConfidence = useMemo(() => getForecastConfidence(scenarioAdjustments), [scenarioAdjustments]);

  const priorRevenue = statementLines.find((line) => line.group === "Income" && line.isTotal)?.priorYear ?? getPriorYearAmount(revenue);
  const priorGrossProfit = statementLines.find((line) => line.group === "Gross Profit" && line.isTotal)?.priorYear ?? getPriorYearAmount(grossProfit);
  const priorNetIncome = statementLines.find((line) => line.group === "Net Income" && line.isTotal)?.priorYear ?? getPriorYearAmount(netIncome);
  const priorExpenses = statementLines.find((line) => line.group === "Expenses" && line.isTotal)?.priorYear ?? getPriorYearAmount(expenses);
  const selectedAccountLine = selectedAccount?.account ? statementLines.find((line) => line.account === selectedAccount.account) ?? null : null;
  const baselineRevenueTotal = sumMetric(baselineForecast, "revenue");
  const baselineNetTotal = sumMetric(baselineForecast, "netIncome");
  const trailingMonths = scopedHistoryData.slice(-3);
  const trailingRevenueRunRate = average(trailingMonths.map((point) => point.revenue));
  const trailingGrossRunRate = average(trailingMonths.map((point) => point.grossProfit));
  const trailingNetRunRate = average(trailingMonths.map((point) => point.netIncome));
  const storePerformance = useMemo<StorePerformanceSnapshot[]>(() => {
    return selectedStoreIdList
      .map((storeId) => {
        const store = profitLossStores.find((entry) => entry.id === storeId);
        const scoped = buildScopedStatement([storeId], selectedYearNumber, selectedMonthIndex, selectedDepartment);
        const storeRevenue = getGroupTotal(scoped, "Income");
        const storeGrossProfit = getGroupTotal(scoped, "Gross Profit");
        const storeNetIncome = getGroupTotal(scoped, "Net Income");

        return {
          storeId,
          storeName: store?.name ?? storeId,
          revenue: storeRevenue,
          grossProfit: storeGrossProfit,
          netIncome: storeNetIncome,
          netMarginPct: storeRevenue > 0 ? (storeNetIncome / storeRevenue) * 100 : 0
        };
      })
      .sort((left, right) => right.revenue - left.revenue);
  }, [selectedDepartment, selectedMonthIndex, selectedStoreIdList, selectedYearNumber]);
  const latestDepartmentMixPoint = scopedDeptData[scopedDeptData.length - 1] ?? null;
  const leadingStoreSlice = storePerformance.slice(0, 3);
  const departmentPerformance = useMemo<DepartmentPerformanceSnapshot[]>(() => {
    return profitLossDepartments
      .map((department) => {
        const scoped = buildScopedStatement(selectedStoreIdList, selectedYearNumber, selectedMonthIndex, department);
        const departmentRevenue = getGroupTotal(scoped, "Income");
        const departmentGrossProfit = getGroupTotal(scoped, "Gross Profit");
        const departmentNetIncome = getGroupTotal(scoped, "Net Income");

        return {
          department,
          revenue: departmentRevenue,
          grossProfit: departmentGrossProfit,
          netIncome: departmentNetIncome,
          grossMarginPct: departmentRevenue > 0 ? (departmentGrossProfit / departmentRevenue) * 100 : 0,
          netMarginPct: departmentRevenue > 0 ? (departmentNetIncome / departmentRevenue) * 100 : 0
        };
      })
      .sort((left, right) => right.revenue - left.revenue);
  }, [selectedMonthIndex, selectedStoreIdList, selectedYearNumber]);
  const scenarioCompareRows = useMemo<ScenarioCompareRow[]>(() => {
    return forecastScenarios.map((scenario) => {
      const projected = buildForecast(
        scopedHistoryData,
        {
          revenuePct: scenario.revenuePct,
          grossMarginBps: scenario.grossMarginBps,
          expensePct: scenario.expensePct
        },
        selectedMonthIndex,
        selectedYearNumber
      );
      const projectedRevenue = sumMetric(projected, "revenue");
      const projectedGrossProfit = sumMetric(projected, "grossProfit");
      const projectedNetIncome = sumMetric(projected, "netIncome");
      const confidence = getForecastConfidence({
        revenuePct: scenario.revenuePct,
        grossMarginBps: scenario.grossMarginBps,
        expensePct: scenario.expensePct
      });

      return {
        id: scenario.id,
        label: scenario.label,
        summary: scenario.summary,
        revenueTotal: projectedRevenue,
        grossMarginPct: projectedRevenue > 0 ? (projectedGrossProfit / projectedRevenue) * 100 : 0,
        netTotal: projectedNetIncome,
        deltaVsBaseline: projectedNetIncome - baselineNetTotal,
        confidence: confidence.score
      };
    });
  }, [baselineNetTotal, scopedHistoryData, selectedMonthIndex, selectedYearNumber]);
  const monthlyOutlookRows = useMemo<ForecastMonthlyOutlookRow[]>(() => {
    return forecast.map((point, index) => {
      const baselinePoint = baselineForecast[index];
      const previousPoint = index === 0 ? scopedHistoryData[scopedHistoryData.length - 1] : forecast[index - 1];
      const baselineRevenue = baselinePoint?.revenue ?? 0;
      const baselineNetIncome = baselinePoint?.netIncome ?? 0;
      const revenueDelta = point.revenue - baselineRevenue;
      const netDelta = point.netIncome - baselineNetIncome;
      const grossMarginForPoint = point.revenue > 0 ? (point.grossProfit / point.revenue) * 100 : 0;
      const netMarginForPoint = point.revenue > 0 ? (point.netIncome / point.revenue) * 100 : 0;
      const revenueStepPct = previousPoint && previousPoint.revenue !== 0 ? ((point.revenue - previousPoint.revenue) / Math.abs(previousPoint.revenue)) * 100 : 0;

      let paceTone: "up" | "down" | "neutral" = "neutral";
      let paceLabel = "Flat to plan";
      let focus = "Stable plan month with limited separation from baseline.";

      if (Math.abs(revenueDelta) < 1000 && Math.abs(netDelta) < 1000) {
        if (revenueStepPct >= 4) {
          paceTone = "up";
          paceLabel = "Seasonal lift";
          focus = "Volume is stepping up month over month while the baseline stays intact.";
        } else if (revenueStepPct <= -4) {
          paceTone = "down";
          paceLabel = "Seasonal ease";
          focus = "Volume softens sequentially here, so pricing and backlog discipline matter more.";
        }
      } else if (revenueDelta >= 0 && netDelta >= 0) {
        if (revenueStepPct <= -10) {
          paceTone = "neutral";
          paceLabel = "Cooling";
          focus = "Still above baseline, but sequential pace is easing after the peak window.";
        } else {
          paceTone = "up";
          paceLabel = "Above plan";
          focus = "Revenue and drop-through both clear baseline for this month.";
        }
      } else if (revenueDelta >= 0 && netDelta < 0) {
        paceTone = "down";
        paceLabel = "Margin watch";
        focus = "Top line is ahead, but net conversion is slipping behind baseline.";
      } else if (revenueDelta < 0 && netDelta >= 0) {
        paceTone = "neutral";
        paceLabel = "Quality mix";
        focus = "Lower volume still holds acceptable earnings quality versus baseline.";
      } else {
        paceTone = "down";
        paceLabel = "Below plan";
        focus = "Revenue and net are both tracking below baseline and need intervention.";
      }

      return {
        label: point.label,
        revenue: point.revenue,
        grossProfit: point.grossProfit,
        netIncome: point.netIncome,
        baselineRevenue,
        baselineNetIncome,
        revenueDelta,
        netDelta,
        grossMarginPct: grossMarginForPoint,
        netMarginPct: netMarginForPoint,
        revenueStepPct,
        paceTone,
        paceLabel,
        focus
      };
    });
  }, [baselineForecast, forecast, scopedHistoryData]);

  useEffect(() => {
    persistForecastSnapshots(savedSnapshots);
  }, [savedSnapshots]);

  useEffect(() => {
    persistWidgetSchedules(savedWidgetSchedules);
  }, [savedWidgetSchedules]);

  useEffect(() => {
    persistGmailDeliveryProfile(gmailProfile);
  }, [gmailProfile]);

  useEffect(() => {
    if (!visibleChartVisualWidgetIds.includes(featuredChartWidgetId)) {
      setFeaturedChartWidgetId(visibleChartVisualWidgetIds[0] ?? defaultChartVisualWidgetIds[0]);
    }
  }, [featuredChartWidgetId, visibleChartVisualWidgetIds]);

  useEffect(() => {
    setSelectedWidgetIds((current) => {
      const next = current.filter((widgetId) => visibleChartVisualWidgetIds.includes(widgetId));
      return next.length === current.length ? current : next;
    });
    setDeliveryWidgetIds((current) => {
      const next = current.filter((widgetId) => visibleChartVisualWidgetIds.includes(widgetId));
      return next.length === current.length ? current : next;
    });
  }, [visibleChartVisualWidgetIds]);

  function buildDefaultDeliverySubject(widgetIds: PLWidgetId[]) {
    if (widgetIds.length === 0) {
      return `Profit & Loss Widget Pack · ${selectedMonth} ${selectedYear}`;
    }

    const widgetLabel = widgetIds.length === 1
      ? chartWidgetDefinitions[widgetIds[0]].title
      : `${widgetIds.length} Profit & Loss widgets`;

    return `${widgetLabel} · ${selectedMonth} ${selectedYear} · ${selectedDepartment}`;
  }

  function resolveDeliveryStoreIds(scope = deliveryStoreScope, customStoreIds = deliveryCustomStoreIds) {
    if (scope === "all") {
      return profitLossStores.map((store) => store.id);
    }

    if (scope === "custom") {
      return customStoreIds;
    }

    return selectedStoreIdList;
  }

  function getDeliveryStoreLabel(storeIds: string[]) {
    if (storeIds.length === profitLossStores.length) return "All Stores";
    if (storeIds.length === 0) return "No stores selected";
    if (storeIds.length === 1) return getStoreName(storeIds[0]);
    return `${storeIds.length} Stores`;
  }

  function describeScheduleCadence(record: Pick<WidgetScheduleRecord, "cadence" | "customRule" | "monthlyDay" | "weekday" | "weekdays">) {
    if (record.cadence === "threePerWeek") {
      return `${record.weekdays.join(" / ")} each week`;
    }

    if (record.cadence === "monthly") {
      return `Day ${record.monthlyDay} each month`;
    }

    if (record.cadence === "custom") {
      return record.customRule || "Custom cadence";
    }

    return `Every ${record.weekday}`;
  }

  function closeChartWidgetLibraryModal() {
    setChartWidgetLibrarySection(null);
  }

  function resetChartWidgetLibrary(section: WidgetLibrarySection) {
    if (section === "data") {
      setVisibleChartMetricWidgetIds(defaultChartMetricWidgetIds);
      return;
    }

    setVisibleChartVisualWidgetIds(defaultChartVisualWidgetIds);
    setFeaturedChartWidgetId(defaultChartVisualWidgetIds[0]);
  }

  function toggleChartMetricWidget(widgetId: PLChartMetricWidgetId) {
    setVisibleChartMetricWidgetIds((current) => {
      if (current.includes(widgetId)) {
        return current.length === 1 ? current : current.filter((candidate) => candidate !== widgetId);
      }

      if (current.length >= MAX_CHART_DATA_WIDGETS) {
        return current;
      }

      return [...current, widgetId];
    });
  }

  function toggleChartVisualWidget(widgetId: PLWidgetId) {
    setVisibleChartVisualWidgetIds((current) => {
      if (current.includes(widgetId)) {
        return current.length === 1 ? current : current.filter((candidate) => candidate !== widgetId);
      }

      if (current.length >= MAX_CHART_VISUAL_WIDGETS) {
        return current;
      }

      return [...current, widgetId];
    });
  }

  function toggleWidgetSelection(widgetId: PLWidgetId) {
    setSelectedWidgetIds((current) => current.includes(widgetId)
      ? current.filter((candidate) => candidate !== widgetId)
      : [...current, widgetId]
    );
  }

  function toggleDeliveryWidget(widgetId: PLWidgetId) {
    setDeliveryWidgetIds((current) => current.includes(widgetId)
      ? current.filter((candidate) => candidate !== widgetId)
      : [...current, widgetId]
    );
  }

  function toggleDeliveryCustomStore(storeId: string) {
    setDeliveryCustomStoreIds((current) => current.includes(storeId)
      ? current.filter((candidate) => candidate !== storeId)
      : [...current, storeId]
    );
  }

  function toggleScheduleWeekday(weekday: string) {
    setScheduleWeekdays((current) => current.includes(weekday)
      ? current.filter((candidate) => candidate !== weekday)
      : [...current, weekday]
    );
  }

  function openWidgetDeliveryModal(mode: WidgetDeliveryModalMode, widgetId: PLWidgetId) {
    const initialWidgetIds = selectedWidgetIds.length > 0
      ? Array.from(new Set(selectedWidgetIds.includes(widgetId) ? selectedWidgetIds : [...selectedWidgetIds, widgetId]))
      : [widgetId];

    setDeliveryWidgetIds(initialWidgetIds);
    setDeliveryStoreScope("current");
    setDeliveryCustomStoreIds(selectedStoreIdList);
    setDeliveryRecipient(gmailProfile?.address ?? deliveryRecipient);
    setGmailDraftAddress(gmailProfile?.address ?? gmailDraftAddress);
    setDeliveryNote("");
    setIncludePdfExports(true);
    setDeliveryModalMode(mode);
  }

  function closeWidgetDeliveryModal() {
    setDeliveryModalMode(null);
  }

  function connectGmailProfile() {
    const normalized = gmailDraftAddress.trim().toLowerCase();

    if (!normalized) {
      setDeliveryNotice("Enter a Gmail address before saving the delivery profile.");
      return;
    }

    if (!/^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(normalized)) {
      setDeliveryNotice("Use a Gmail address for the Gmail compose handoff.");
      return;
    }

    setGmailProfile({
      address: normalized,
      connectedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    });
    setDeliveryRecipient((current) => current || normalized);
    setDeliveryNotice(`Gmail delivery profile saved for ${normalized}.`);
  }

  async function exportWidgetToPdf(widgetId: PLWidgetId, options: { quiet?: boolean } = {}) {
    const widgetNode = widgetPanelRefs.current[widgetId];

    if (!widgetNode) {
      setDeliveryNotice(`${chartWidgetDefinitions[widgetId].title} is not visible. Switch to Board layout before exporting that widget.`);
      return false;
    }

    setIsExportingWidgetId(widgetId);

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);
      const canvas = await html2canvas(widgetNode, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true
      });
      const imageData = canvas.toDataURL("image/png");
      const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";
      const pdf = new jsPDF({ format: "a4", orientation, unit: "pt" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 22;
      const scale = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
      const renderWidth = canvas.width * scale;
      const renderHeight = canvas.height * scale;
      const renderX = (pageWidth - renderWidth) / 2;

      pdf.addImage(imageData, "PNG", renderX, margin, renderWidth, renderHeight, undefined, "FAST");
      pdf.save(`${chartWidgetDefinitions[widgetId].fileStem}-${sanitizeFilePart(selectedMonth)}-${selectedYear}.pdf`);

      if (!options.quiet) {
        setDeliveryNotice(`${chartWidgetDefinitions[widgetId].title} PDF downloaded.`);
      }

      return true;
    } catch {
      setDeliveryNotice(`Could not export ${chartWidgetDefinitions[widgetId].title} to PDF.`);
      return false;
    } finally {
      setIsExportingWidgetId(null);
    }
  }

  function buildWidgetSummaryLines(widgetId: PLWidgetId) {
    if (widgetId === "trendExplorer") {
      return [
        `Current month revenue ${formatCurrency(revenue)}, gross profit ${formatCurrency(grossProfit)}, and net income ${formatCurrency(netIncome)}.`,
        `Three-month revenue run rate is ${fmtK(trailingRevenueRunRate)} with a forecast revenue delta of ${formatSignedCompactCurrency(forecastRevenueDelta)}.`
      ];
    }

    if (widgetId === "marginWalk") {
      return [
        `Revenue ${formatCurrency(revenue)}, cost of sales ${formatCurrency(costOfSales)}, gross profit ${formatCurrency(grossProfit)}, expenses ${formatCurrency(expenses)}, and net income ${formatCurrency(netIncome)}.`
      ];
    }

    if (widgetId === "departmentMix") {
      if (!latestDepartmentMixPoint) {
        return ["Department mix becomes available after the chart history loads."];
      }

      return [
        `${latestDepartmentMixPoint.label} mix: Sales ${fmtK(latestDepartmentMixPoint.sales)}, Parts ${fmtK(latestDepartmentMixPoint.parts)}, Service ${fmtK(latestDepartmentMixPoint.service)}.`
      ];
    }

    if (widgetId === "forecastDelta") {
      return [
        `${activeScenario.label} is ${formatSignedCompactCurrency(forecastRevenueDelta)} on revenue and ${formatSignedCompactCurrency(forecastNetDelta)} on net versus baseline.`,
        `Peak forecast month is ${peakForecastMonth.label} at ${fmtK(peakForecastMonth.revenue)}.`
      ];
    }

    if (widgetId === "variancePulse") {
      const largestBudgetMove = [...variancePulseRows].sort((left, right) => Math.abs(right.budgetPct) - Math.abs(left.budgetPct))[0];
      const largestPriorMove = [...variancePulseRows].sort((left, right) => Math.abs(right.priorPct) - Math.abs(left.priorPct))[0];

      return [
        `Largest budget move is ${largestBudgetMove.group} at ${formatSignedPercent(largestBudgetMove.budgetPct)} versus budget.`,
        `Largest prior-year move is ${largestPriorMove.group} at ${formatSignedPercent(largestPriorMove.priorPct)} versus prior year.`
      ];
    }

    if (widgetId === "departmentScoreboard") {
      return departmentPerformance.slice(0, 3).map((department) => (
        `${department.department}: ${fmtK(department.revenue)} revenue, ${department.grossMarginPct.toFixed(1)}% gross margin, ${department.netMarginPct.toFixed(1)}% net margin.`
      ));
    }

    if (widgetId === "scenarioBridge") {
      return [
        `Scenario net lands at ${fmtK(forecastNetTotal)} after ${scenarioBridge.map((point) => `${point.label} ${point.tone === "neutral" ? fmtK(point.value) : formatSignedCompactCurrency(point.value)}`).join(", ")}.`
      ];
    }

    if (widgetId === "monthlyOutlookStudio") {
      return monthlyOutlookRows.slice(0, 3).map((row) => (
        `${row.label}: ${fmtK(row.revenue)} revenue, ${fmtK(row.netIncome)} net, ${formatSignedCompactCurrency(row.netDelta)} vs baseline.`
      ));
    }

    if (widgetId === "scenarioCommandCenter") {
      return scenarioCompareRows.map((row) => (
        `${row.label}: ${fmtK(row.netTotal)} net, ${formatSignedCompactCurrency(row.deltaVsBaseline)} vs baseline, ${row.confidence}/100 confidence.`
      )).slice(0, 3);
    }

    if (widgetId === "storeMarginMatrix") {
      return [
        `Top store margin spread is ${storeMarginSpread.toFixed(1)} points from ${topStore?.storeName ?? "top store"} to ${worstStore?.storeName ?? "bottom store"}.`,
        `Top store ${topStore?.storeName ?? "n/a"} is running ${topStore?.netMarginPct.toFixed(1) ?? "0.0"}% net on ${topStore ? fmtK(topStore.revenue) : "$0"} revenue.`
      ];
    }

    if (widgetId === "anomalyLedger") {
      return anomalyHighlights.slice(0, 3).map((item) => (
        `${item.line.description}: ${item.direction === "up" ? "+" : "-"}${Math.abs(item.pct).toFixed(1)}% vs prior year at ${formatCurrency(item.line.may2026)}.`
      ));
    }

    if (widgetId === "contributorSpotlight") {
      return topContributionLines.slice(0, 2).map((line) => {
        const leadStores = [...(line.contributors ?? [])].sort((left, right) => right.actual - left.actual).slice(0, 2);
        return `${line.description}: ${leadStores.map((contributor) => `${contributor.storeName} ${fmtK(contributor.actual)}`).join("; ")}.`;
      });
    }

    if (widgetId === "snapshotVault") {
      return savedSnapshots.length > 0
        ? savedSnapshots.slice(0, 3).map((snapshot) => `${snapshot.label}: ${fmtK(snapshot.revenueTotal)} revenue, ${fmtK(snapshot.netTotal)} net, confidence ${snapshot.confidence}/100.`)
        : [`Live board: ${activeScenario.label} with ${fmtK(forecastRevenueTotal)} revenue and ${fmtK(forecastNetTotal)} net.`];
    }

    if (leadingStoreSlice.length === 0) {
      return ["No store leaderboard is available for the current scope."];
    }

    return [
      `Top stores: ${leadingStoreSlice.map((store) => `${store.storeName} ${fmtK(store.revenue)} / ${store.netMarginPct.toFixed(1)}%`).join("; ")}.`
    ];
  }

  async function sendWidgetReport() {
    const recipient = deliveryRecipient.trim();
    const gmailAddress = (gmailProfile?.address ?? gmailDraftAddress).trim();

    if (!isValidEmail(recipient)) {
      setDeliveryNotice("Enter a valid recipient email before opening a Gmail draft.");
      return;
    }

    if (!gmailAddress) {
      setDeliveryNotice("Save a Gmail delivery profile before sending a report.");
      return;
    }

    if (deliveryWidgetIds.length === 0) {
      setDeliveryNotice("Select at least one widget to send.");
      return;
    }

    const storeIds = resolveDeliveryStoreIds();

    if (storeIds.length === 0) {
      setDeliveryNotice("Pick at least one store for this report.");
      return;
    }

    setIsSendingWidgetReport(true);

    try {
      if (includePdfExports) {
        for (const widgetId of deliveryWidgetIds) {
          const exported = await exportWidgetToPdf(widgetId, { quiet: true });
          if (!exported) {
            return;
          }
        }
      }

      const bodyLines = [
        `${selectedMonth} ${selectedYear} Profit & Loss widget pack`,
        `Department: ${selectedDepartment}`,
        `Stores: ${getDeliveryStoreLabel(storeIds)}`,
        deliveryNote.trim() ? `Note: ${deliveryNote.trim()}` : "",
        "",
        ...deliveryWidgetIds.flatMap((widgetId) => [chartWidgetDefinitions[widgetId].title, ...buildWidgetSummaryLines(widgetId), ""]),
        includePdfExports ? "PDF files were downloaded in the browser and can be attached manually in Gmail." : ""
      ].filter(Boolean);

      const gmailUrl = new URL("https://mail.google.com/mail/");
      gmailUrl.searchParams.set("view", "cm");
      gmailUrl.searchParams.set("fs", "1");
      gmailUrl.searchParams.set("tf", "1");
      gmailUrl.searchParams.set("to", recipient);
      gmailUrl.searchParams.set("su", buildDefaultDeliverySubject(deliveryWidgetIds));
      gmailUrl.searchParams.set("body", bodyLines.join("\n"));

      window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
      setDeliveryNotice(`Gmail draft opened for ${recipient}.${includePdfExports ? " PDFs were downloaded for manual attachment." : ""}`);
      setDeliveryModalMode(null);
    } finally {
      setIsSendingWidgetReport(false);
    }
  }

  function saveWidgetSchedule() {
    const recipient = deliveryRecipient.trim();
    const gmailAddress = (gmailProfile?.address ?? gmailDraftAddress).trim();
    const storeIds = resolveDeliveryStoreIds();

    if (!isValidEmail(recipient)) {
      setDeliveryNotice("Enter a valid email for scheduled delivery.");
      return;
    }

    if (!gmailAddress) {
      setDeliveryNotice("Save a Gmail delivery profile before scheduling reports.");
      return;
    }

    if (deliveryWidgetIds.length === 0) {
      setDeliveryNotice("Select at least one widget for the schedule.");
      return;
    }

    if (deliveryStoreScope === "custom" && storeIds.length === 0) {
      setDeliveryNotice("Choose at least one store for the custom store scope.");
      return;
    }

    if (scheduleCadence === "threePerWeek" && scheduleWeekdays.length === 0) {
      setDeliveryNotice("Pick at least one weekday for the 3x weekly schedule.");
      return;
    }

    const record: WidgetScheduleRecord = {
      id: `widget-schedule-${Date.now()}`,
      widgetIds: deliveryWidgetIds,
      recipient,
      gmailAccount: gmailAddress,
      cadence: scheduleCadence,
      weekday: scheduleWeekday,
      weekdays: scheduleWeekdays,
      monthlyDay: Number(scheduleMonthlyDay) || 1,
      customRule: scheduleCustomRule.trim(),
      storeScope: deliveryStoreScope,
      storeIds,
      department: selectedDepartment,
      month: selectedMonth,
      year: selectedYear,
      savedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    };

    setSavedWidgetSchedules((current) => [record, ...current].slice(0, 8));
    setDeliveryNotice(`Schedule saved for ${recipient}. ${describeScheduleCadence(record)}.`);
    setDeliveryModalMode(null);
  }

  function deleteWidgetSchedule(scheduleId: string) {
    setSavedWidgetSchedules((current) => current.filter((schedule) => schedule.id !== scheduleId));
    setDeliveryNotice("Saved schedule removed.");
  }

  function renderWidgetActions(widgetId: PLWidgetId) {
    const isSelected = selectedWidgetIds.includes(widgetId);

    return (
      <div className="pl-widget-actions">
        <label className="pl-widget-select-toggle">
          <input checked={isSelected} onChange={() => toggleWidgetSelection(widgetId)} type="checkbox" />
          <span>Select</span>
        </label>
        <button className="pl-widget-action-button" disabled={isExportingWidgetId !== null} onClick={() => void exportWidgetToPdf(widgetId)} type="button">
          {isExportingWidgetId === widgetId ? "PDF…" : "PDF"}
        </button>
        <button className="pl-widget-action-button" onClick={() => openWidgetDeliveryModal("send", widgetId)} type="button">Send Report</button>
        <button className="pl-widget-action-button" onClick={() => openWidgetDeliveryModal("schedule", widgetId)} type="button">Schedule</button>
      </div>
    );
  }

  function applyScenarioPreset(scenarioId: PLScenarioId) {
    const scenario = forecastScenarios.find((entry) => entry.id === scenarioId);
    if (!scenario) return;
    setSelectedScenarioId(scenarioId);
    setRevenueLiftPct(scenario.revenuePct);
    setMarginShiftBps(scenario.grossMarginBps);
    setExpenseShiftPct(scenario.expensePct);
  }

  function handleGeneratePacket() {
    applyScenarioPreset("board");
    setForecastLayoutMode("multiReport");
    setForecastReport("scenarioCompare");
    setViewMode("forecast");
    setShowCommentary(true);
  }

  function saveCurrentSnapshot() {
    const snapshot: ForecastSnapshotRecord = {
      id: `${Date.now()}`,
      label: `${selectedMonth.slice(0, 3)} ${selectedYear} · ${activeScenario.label}`,
      savedAt: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      month: selectedMonth,
      year: selectedYear,
      department: selectedDepartment,
      storeIds: selectedStoreIdList,
      storeLabel: selectedStoresLabel,
      scopeLabel,
      scenarioId: selectedScenarioId,
      adjustments: scenarioAdjustments,
      revenueTotal: forecastRevenueTotal,
      netTotal: forecastNetTotal,
      confidence: forecastConfidence.score
    };

    setSavedSnapshots((current) => [snapshot, ...current].slice(0, 6));
  }

  function loadSnapshot(snapshot: ForecastSnapshotRecord) {
    setSelectedMonth(snapshot.month);
    setSelectedYear(snapshot.year);
    setSelectedDepartment(snapshot.department);
    setSelectedStoreIds(new Set(snapshot.storeIds));
    setSelectedScenarioId(snapshot.scenarioId);
    setRevenueLiftPct(snapshot.adjustments.revenuePct);
    setMarginShiftBps(snapshot.adjustments.grossMarginBps);
    setExpenseShiftPct(snapshot.adjustments.expensePct);
    setViewMode("forecast");
  }

  function deleteSnapshot(snapshotId: string) {
    setSavedSnapshots((current) => current.filter((snapshot) => snapshot.id !== snapshotId));
  }

  function openGroupFocus(group: ProfitLossGroup) {
    const target = statementLines.find((line) => line.group === group && line.account);
    if (!target) return;

    setCollapsedGroups((current) => {
      const next = new Set(current);
      next.delete(group);
      return next;
    });
    setSelectedAccount(target);
    setViewMode("report");
  }

  function toggleStore(storeId: string) {
    setSelectedStoreIds((cur) => {
      const next = new Set(cur);
      next.has(storeId) ? next.delete(storeId) : next.add(storeId);
      return next.size === 0 ? cur : next;
    });
  }

  function toggleGroup(group: ProfitLossGroup) {
    setCollapsedGroups((cur) => {
      const next = new Set(cur);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  function renderVarianceColumns(line: ProfitLossLine) {
    if (varianceMode === "actual") return null;
    const compValue = varianceMode === "priorYear" ? getPriorYearAmount(line.may2026, line.priorYear) : line.budget ?? getBudgetAmount(line.may2026, line.group);
    const variance = line.may2026 - compValue;
    const variancePct = compValue === 0 ? 0 : ((line.may2026 - compValue) / Math.abs(compValue)) * 100;
    const varianceTone = getVarianceTone(line.group, variancePct);
    const varianceClass = varianceTone === "favorable" ? "is-up" : varianceTone === "risk" ? "is-down" : "";
    return (
      <>
        <td>{formatCurrency(compValue)}</td>
        <td className={varianceClass}>{formatCurrency(variance)}</td>
        <td className={varianceClass}>{getVariancePercent(line.may2026, compValue)}</td>
      </>
    );
  }

  const summaryCards = [
    {
      label: "Revenue",
      value: formatCurrency(revenue),
      sub: `${selectedStoresLabel} | ${scopeLabel}`,
      tone: "neutral" as const,
      delta: `YoY ${getVariancePercent(revenue, priorRevenue)}`,
      deltaTone: getVarianceTone("Income", priorRevenue === 0 ? 0 : ((revenue - priorRevenue) / Math.abs(priorRevenue)) * 100),
      series: scopedHistoryData.map((point) => point.revenue),
      color: "#2563eb"
    },
    {
      label: "Gross Profit",
      value: formatCurrency(grossProfit),
      sub: `${grossMarginPct.toFixed(1)}% gross margin`,
      tone: "stable" as const,
      delta: `YoY ${getVariancePercent(grossProfit, priorGrossProfit)}`,
      deltaTone: getVarianceTone("Gross Profit", priorGrossProfit === 0 ? 0 : ((grossProfit - priorGrossProfit) / Math.abs(priorGrossProfit)) * 100),
      series: scopedHistoryData.map((point) => point.grossProfit),
      color: "#16a34a"
    },
    {
      label: "Net Income",
      value: formatCurrency(netIncome),
      sub: `${netMarginPct.toFixed(1)}% net margin`,
      tone: netIncome >= 0 ? "stable" as const : "attention" as const,
      delta: `YoY ${getVariancePercent(netIncome, priorNetIncome)}`,
      deltaTone: getVarianceTone("Net Income", priorNetIncome === 0 ? 0 : ((netIncome - priorNetIncome) / Math.abs(priorNetIncome)) * 100),
      series: scopedHistoryData.map((point) => point.netIncome),
      color: "#d97706"
    },
    {
      label: "Expense Load",
      value: formatCurrency(expenses),
      sub: "Operating expenses",
      tone: "neutral" as const,
      delta: `YoY ${getVariancePercent(expenses, priorExpenses)}`,
      deltaTone: getVarianceTone("Expenses", priorExpenses === 0 ? 0 : ((expenses - priorExpenses) / Math.abs(priorExpenses)) * 100),
      series: scopedHistoryData.map((point) => Math.max(point.grossProfit - point.netIncome, 0)),
      color: "#7c3aed"
    }
  ];

  const forecastRevenueTotal = sumMetric(forecast, "revenue");
  const forecastNetTotal = sumMetric(forecast, "netIncome");
  const peakForecastMonth = forecast.reduce((best, point) => (point.revenue > best.revenue ? point : best), forecast[0]);
  const forecastRevenueDelta = forecastRevenueTotal - baselineRevenueTotal;
  const forecastNetDelta = forecastNetTotal - baselineNetTotal;
  const maxStoreRevenue = Math.max(...storePerformance.map((entry) => entry.revenue), 1);
  const forecastOverviewCards = [
    { label: "7-Month Revenue", value: fmtK(forecastRevenueTotal), detail: `${activeScenario.label} scenario` },
    { label: "7-Month Net", value: fmtK(forecastNetTotal), detail: `${forecastConfidence.label} · ${forecastConfidence.score}/100` },
    { label: "Peak Month", value: peakForecastMonth.label, detail: `${fmtK(peakForecastMonth.revenue)} revenue` },
    {
      label: "Baseline Net Delta",
      value: formatSignedCompactCurrency(forecastNetDelta),
      detail: `${forecastNetDelta >= 0 ? "Ahead of" : "Behind"} baseline`
    }
  ];
  const peakOutlookMonth = monthlyOutlookRows[0]
    ? monthlyOutlookRows.reduce((best, row) => (row.revenue > best.revenue ? row : best), monthlyOutlookRows[0])
    : null;
  const bestNetOutlookMonth = monthlyOutlookRows[0]
    ? monthlyOutlookRows.reduce((best, row) => (row.netIncome > best.netIncome ? row : best), monthlyOutlookRows[0])
    : null;
  const seasonalLowOutlookMonth = monthlyOutlookRows[0]
    ? monthlyOutlookRows.reduce((worst, row) => (row.revenue < worst.revenue ? row : worst), monthlyOutlookRows[0])
    : null;
  const next90Rows = monthlyOutlookRows.slice(0, 3);
  const next90Revenue = next90Rows.reduce((sum, row) => sum + row.revenue, 0);
  const next90BaselineRevenue = next90Rows.reduce((sum, row) => sum + row.baselineRevenue, 0);
  const monthlyOutlookMaxRevenue = Math.max(1, ...monthlyOutlookRows.map((row) => Math.max(row.revenue, row.baselineRevenue)));
  const monthlyOutlookMaxNet = Math.max(1, ...monthlyOutlookRows.map((row) => Math.max(Math.abs(row.netIncome), Math.abs(row.baselineNetIncome))));
  const priorGrossMarginPct = priorRevenue > 0 ? (priorGrossProfit / priorRevenue) * 100 : 0;
  const priorNetMarginPct = priorRevenue > 0 ? (priorNetIncome / priorRevenue) * 100 : 0;
  const priorCostLoadPct = priorRevenue > 0 ? ((priorRevenue - priorGrossProfit) / priorRevenue) * 100 : 0;
  const revenueBudget = statementLines.find((line) => line.group === "Income" && line.isTotal)?.budget ?? getBudgetAmount(revenue, "Income");
  const netBudget = statementLines.find((line) => line.group === "Net Income" && line.isTotal)?.budget ?? getBudgetAmount(netIncome, "Net Income");
  const revenueBudgetGap = revenue - revenueBudget;
  const netBudgetGap = netIncome - netBudget;
  const costLoadPct = revenue > 0 ? (costOfSales / revenue) * 100 : 0;
  const next90Net = next90Rows.reduce((sum, row) => sum + row.netIncome, 0);
  const next90NetBaseline = next90Rows.reduce((sum, row) => sum + row.baselineNetIncome, 0);
  const topStore = storePerformance[0] ?? null;
  const worstStore = storePerformance[storePerformance.length - 1] ?? null;
  const storeMarginSpread = topStore && worstStore ? topStore.netMarginPct - worstStore.netMarginPct : 0;
  const leadingDepartment = departmentPerformance[0] ?? null;
  const topDepartmentByNetMargin = [...departmentPerformance].sort((left, right) => right.netMarginPct - left.netMarginPct)[0] ?? null;
  const bestScenario = [...scenarioCompareRows].sort((left, right) => right.netTotal - left.netTotal)[0] ?? null;
  const groupTotalLines = profitLossGroupOrder
    .map((group) => statementLines.find((line) => line.group === group && line.isTotal))
    .filter((line): line is ProfitLossLine => Boolean(line));
  const groupBudgetGapSeries = groupTotalLines.map((line) => line.may2026 - (line.budget ?? getBudgetAmount(line.may2026, line.group)));
  const expenseLoadHistory = scopedHistoryData.map((point) => Math.max(point.grossProfit - point.netIncome, 0));
  const costLoadHistory = scopedHistoryData.map((point) => (point.revenue > 0 ? ((point.revenue - point.grossProfit) / point.revenue) * 100 : 0));
  const grossMarginHistory = scopedHistoryData.map((point) => (point.revenue > 0 ? (point.grossProfit / point.revenue) * 100 : 0));
  const netMarginHistory = scopedHistoryData.map((point) => (point.revenue > 0 ? (point.netIncome / point.revenue) * 100 : 0));
  const forecastRevenueDeltaSeries = forecast.map((point, index) => point.revenue - (baselineForecast[index]?.revenue ?? 0));
  const forecastNetDeltaSeries = forecast.map((point, index) => point.netIncome - (baselineForecast[index]?.netIncome ?? 0));
  const scenarioNetSeries = scenarioCompareRows.map((row) => row.netTotal);
  const departmentNetMarginSeries = departmentPerformance.map((department) => department.netMarginPct);
  const next90RevenueSeries = next90Rows.map((row) => row.revenue);
  const next90NetSeries = next90Rows.map((row) => row.netIncome);
  const anomalyHighlights = statementLines
    .filter((line) => line.account && anomalies.has(line.account))
    .map((line) => {
      const anomaly = anomalies.get(line.account);
      return {
        direction: anomaly?.direction === "down" ? "down" as const : "up" as const,
        line,
        pct: anomaly?.pct ?? 0
      };
    })
    .sort((left, right) => Math.abs(right.pct) - Math.abs(left.pct));
  const anomalyMagnitudeSeries = anomalyHighlights.slice(0, 6).map((item) => Math.abs(item.pct));
  const snapshotNetSeries = savedSnapshots.length > 0 ? [...savedSnapshots].slice(0, 6).reverse().map((snapshot) => snapshot.netTotal) : [forecastNetTotal];
  const topContributionLines = statementLines
    .filter((line) => line.account && line.contributors && line.contributors.length > 0)
    .sort((left, right) => right.may2026 - left.may2026)
    .slice(0, 4);
  const chartMetricDefinitions: Record<PLChartMetricWidgetId, { color: string; description: string; detail: string; label: string; series: number[]; value: string }> = {
    revenueRunRate: {
      color: "#2563eb",
      description: "Trailing top-line pace against the active month.",
      detail: `${formatSignedPercent(trailingRevenueRunRate > 0 ? ((revenue - trailingRevenueRunRate) / trailingRevenueRunRate) * 100 : 0)} vs current month`,
      label: "3-Mo Revenue Run Rate",
      series: scopedHistoryData.map((point) => point.revenue),
      value: fmtK(trailingRevenueRunRate)
    },
    grossProfitRunRate: {
      color: "#16a34a",
      description: "Trailing gross profit pace with current margin context.",
      detail: `${grossMarginPct.toFixed(1)}% current gross margin`,
      label: "3-Mo Gross Profit",
      series: scopedHistoryData.map((point) => point.grossProfit),
      value: fmtK(trailingGrossRunRate)
    },
    netIncomeRunRate: {
      color: "#d97706",
      description: "Trailing earnings pace versus current net margin.",
      detail: `${netMarginPct.toFixed(1)}% current net margin`,
      label: "3-Mo Net Income",
      series: scopedHistoryData.map((point) => point.netIncome),
      value: fmtK(trailingNetRunRate)
    },
    forecastRevenueDelta: {
      color: "#0b4360",
      description: "Scenario lift or drag versus the baseline revenue outlook.",
      detail: `${activeScenario.label} vs baseline`,
      label: "Forecast Revenue Delta",
      series: forecastRevenueDeltaSeries,
      value: formatSignedCompactCurrency(forecastRevenueDelta)
    },
    forecastNetDelta: {
      color: "#0891b2",
      description: "Net income separation versus the baseline forecast run.",
      detail: `${forecastNetDelta >= 0 ? "Ahead of" : "Behind"} baseline`,
      label: "Forecast Net Delta",
      series: forecastNetDeltaSeries,
      value: formatSignedCompactCurrency(forecastNetDelta)
    },
    grossMargin: {
      color: "#14b8a6",
      description: "Current gross margin rate with historical context.",
      detail: `${formatSignedPercent(grossMarginPct - priorGrossMarginPct)} vs prior margin`,
      label: "Gross Margin",
      series: grossMarginHistory,
      value: `${grossMarginPct.toFixed(1)}%`
    },
    netMargin: {
      color: "#f59e0b",
      description: "Current net margin rate with prior-year pacing.",
      detail: `${formatSignedPercent(netMarginPct - priorNetMarginPct)} vs prior margin`,
      label: "Net Margin",
      series: netMarginHistory,
      value: `${netMarginPct.toFixed(1)}%`
    },
    expenseLoad: {
      color: "#7c3aed",
      description: "Operating expense weight carried through recent months.",
      detail: `${getVariancePercent(expenses, priorExpenses)} YoY operating spend`,
      label: "Expense Load",
      series: expenseLoadHistory,
      value: formatCurrency(expenses)
    },
    scenarioConfidence: {
      color: "#1d4ed8",
      description: "Scenario confidence based on assumption intensity.",
      detail: forecastConfidence.label,
      label: "Scenario Confidence",
      series: scenarioCompareRows.map((row) => row.confidence),
      value: `${forecastConfidence.score}/100`
    },
    peakForecastMonth: {
      color: "#0f766e",
      description: "Highest revenue month in the current forecast run.",
      detail: `${fmtK(peakForecastMonth.revenue)} revenue`,
      label: "Peak Forecast Month",
      series: forecast.map((point) => point.revenue),
      value: peakForecastMonth.label
    },
    topStore: {
      color: "#2563eb",
      description: "Leading store in the selected scope.",
      detail: topStore ? `${fmtK(topStore.revenue)} revenue · ${topStore.netMarginPct.toFixed(1)}% net margin` : "No store selected",
      label: "Top Store",
      series: storePerformance.slice(0, MAX_WIDGET_PREVIEW_ITEMS).map((store) => store.revenue),
      value: topStore?.storeName ?? "No Store"
    },
    departmentLeader: {
      color: "#16a34a",
      description: "Best current department by revenue scale.",
      detail: leadingDepartment ? `${leadingDepartment.grossMarginPct.toFixed(1)}% gross · ${leadingDepartment.netMarginPct.toFixed(1)}% net` : "Department data unavailable",
      label: "Department Leader",
      series: departmentPerformance.map((department) => department.revenue),
      value: leadingDepartment?.department ?? "No Dept"
    },
    revenueBudgetGap: {
      color: "#0f766e",
      description: "Gap between booked revenue and the current budget line.",
      detail: `${formatSignedCompactCurrency(revenueBudgetGap)} vs budget`,
      label: "Revenue Budget Gap",
      series: groupBudgetGapSeries,
      value: formatSignedCompactCurrency(revenueBudgetGap)
    },
    netBudgetGap: {
      color: "#c2410c",
      description: "Gap between net income and the budgeted finish.",
      detail: `${formatSignedCompactCurrency(netBudgetGap)} vs budget`,
      label: "Net Budget Gap",
      series: scenarioNetSeries,
      value: formatSignedCompactCurrency(netBudgetGap)
    },
    cogsLoad: {
      color: "#7c3aed",
      description: "Cost of sales burden as a share of revenue.",
      detail: `${formatSignedPercent(costLoadPct - priorCostLoadPct)} vs prior cost load`,
      label: "COGS Load",
      series: costLoadHistory,
      value: `${costLoadPct.toFixed(1)}%`
    },
    nextNinetyRevenue: {
      color: "#1d4ed8",
      description: "Projected revenue across the next ninety-day window.",
      detail: `${formatSignedCompactCurrency(next90Revenue - next90BaselineRevenue)} vs baseline`,
      label: "Next 90-Day Revenue",
      series: next90RevenueSeries,
      value: fmtK(next90Revenue)
    },
    nextNinetyNet: {
      color: "#0b4360",
      description: "Projected net income for the next ninety days.",
      detail: `${formatSignedCompactCurrency(next90Net - next90NetBaseline)} vs baseline`,
      label: "Next 90-Day Net",
      series: next90NetSeries,
      value: fmtK(next90Net)
    },
    storeMarginSpread: {
      color: "#2563eb",
      description: "Spread between the highest and lowest store net margins.",
      detail: topStore && worstStore ? `${topStore.storeName} to ${worstStore.storeName}` : "Current store scope",
      label: "Store Margin Spread",
      series: storePerformance.map((store) => store.netMarginPct),
      value: `${storeMarginSpread.toFixed(1)} pts`
    },
    activeAnomalyCount: {
      color: "#ea580c",
      description: "Accounts currently beyond the anomaly threshold.",
      detail: anomalyHighlights[0] ? `${anomalyHighlights[0].line.description} is the largest swing` : "No accounts above the alert threshold",
      label: "Active Anomalies",
      series: anomalyMagnitudeSeries.length > 0 ? anomalyMagnitudeSeries : [0],
      value: `${anomalyHighlights.length}`
    },
    snapshotVaultCount: {
      color: "#0f766e",
      description: "Saved forecast runs available for reload and reporting.",
      detail: savedSnapshots[0] ? `Latest ${savedSnapshots[0].label}` : "No saved snapshots yet",
      label: "Saved Snapshots",
      series: snapshotNetSeries,
      value: `${savedSnapshots.length}`
    },
    bestScenarioNet: {
      color: "#16a34a",
      description: "Best net-income scenario currently available in the model.",
      detail: bestScenario ? `${bestScenario.label} leads ${formatSignedCompactCurrency(bestScenario.deltaVsBaseline)} vs baseline` : `${activeScenario.label} is active`,
      label: "Best Scenario Net",
      series: scenarioNetSeries,
      value: bestScenario ? fmtK(bestScenario.netTotal) : fmtK(forecastNetTotal)
    },
    topDepartmentMargin: {
      color: "#14b8a6",
      description: "Highest department net margin in the selected scope.",
      detail: topDepartmentByNetMargin ? `${topDepartmentByNetMargin.department} leads the network` : "Department data unavailable",
      label: "Top Dept Net Margin",
      series: departmentNetMarginSeries,
      value: topDepartmentByNetMargin ? `${topDepartmentByNetMargin.netMarginPct.toFixed(1)}%` : "0.0%"
    }
  };
  const monthlyOutlookOverview = peakOutlookMonth && bestNetOutlookMonth && seasonalLowOutlookMonth
    ? [
        {
          label: "Peak Revenue Window",
          value: peakOutlookMonth.label,
          detail: `${fmtK(peakOutlookMonth.revenue)} revenue · ${peakOutlookMonth.grossMarginPct.toFixed(1)}% gross margin`
        },
        {
          label: "Best Net Drop-Through",
          value: bestNetOutlookMonth.label,
          detail: `${fmtK(bestNetOutlookMonth.netIncome)} net · ${bestNetOutlookMonth.netMarginPct.toFixed(1)}% net margin`
        },
        {
          label: "Next 90 Days",
          value: fmtK(next90Revenue),
          detail: `${formatSignedCompactCurrency(next90Revenue - next90BaselineRevenue)} vs baseline under ${activeScenario.label}`
        },
        {
          label: "Seasonal Floor",
          value: seasonalLowOutlookMonth.label,
          detail: `${fmtK(seasonalLowOutlookMonth.revenue)} revenue · ${formatSignedPercent(seasonalLowOutlookMonth.revenueStepPct)} sequential pace`
        }
      ]
    : [];
  const activeFeaturedChartWidgetId = visibleChartVisualWidgetIds.includes(featuredChartWidgetId)
    ? featuredChartWidgetId
    : visibleChartVisualWidgetIds[0];
  const supportingChartWidgetIds = visibleChartVisualWidgetIds.filter((widgetId) => widgetId !== activeFeaturedChartWidgetId);
  const isDenseVisualBoard = visibleChartVisualWidgetIds.length > MAX_CHART_DATA_WIDGETS;

  function renderChartVisual(type: PLChartType) {
    if (type === "trend") {
      return <TrendChart history={scopedHistoryData} forecast={forecast} />;
    }

    if (type === "waterfall") {
      return <WaterfallChart revenue={revenue} grossProfit={grossProfit} netIncome={netIncome} />;
    }

    return <DeptChart data={scopedDeptData} />;
  }

  function renderManagedWidgetPanel(widgetId: PLWidgetId, title: string, subtitle: string, body: ReactNode, className = "") {
    return (
      <article
        className={`pl-power-panel ${className}${isExportingWidgetId === widgetId ? " is-exporting" : ""}`.trim()}
        ref={(node) => {
          widgetPanelRefs.current[widgetId] = node;
        }}
      >
        <div className="pl-power-panel-header">
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          {renderWidgetActions(widgetId)}
        </div>
        {body}
      </article>
    );
  }

  function renderChartPanel(widgetId: PLWidgetId, type: PLChartType, title: string, subtitle: string, className = "") {
    return renderManagedWidgetPanel(
      widgetId,
      title,
      subtitle,
        <div className="pl-chart-frame is-report-panel">
          {renderChartVisual(type)}
        </div>,
      className
    );
  }

  function renderStoreLeaderboardPanel(className = "") {
    return renderManagedWidgetPanel(
      "storeLeaderboard",
      chartWidgetDefinitions.storeLeaderboard.title,
      chartWidgetDefinitions.storeLeaderboard.subtitle,
        <div className="pl-power-list">
          {storePerformance.map((store) => (
            <div key={store.storeId} className="pl-power-progress-row">
              <div className="pl-power-progress-copy">
                <strong>{store.storeName}</strong>
                <span>{fmtK(store.revenue)} revenue · {store.netMarginPct.toFixed(1)}% net margin</span>
              </div>
              <div className="pl-power-progress-track">
                <span style={{ width: `${Math.max((store.revenue / maxStoreRevenue) * 100, 10)}%` }} />
              </div>
            </div>
          ))}
        </div>,
      className
    );
  }

  function renderDepartmentPerformancePanel(className = "") {
    return renderManagedWidgetPanel(
      "departmentScoreboard",
      chartWidgetDefinitions.departmentScoreboard.title,
      chartWidgetDefinitions.departmentScoreboard.subtitle,
        <div className="pl-power-card-grid">
          {departmentPerformance.map((department) => (
            <div key={department.department} className="pl-power-mini-card">
              <span>{department.department}</span>
              <strong>{fmtK(department.revenue)}</strong>
              <small>{fmtK(department.grossProfit)} gross · {fmtK(department.netIncome)} net</small>
              <small>{department.grossMarginPct.toFixed(1)}% gross margin · {department.netMarginPct.toFixed(1)}% net margin</small>
            </div>
          ))}
        </div>,
      className
    );
  }

  function renderForecastDeltaPanel(className = "") {
    return renderManagedWidgetPanel(
      "forecastDelta",
      chartWidgetDefinitions.forecastDelta.title,
      chartWidgetDefinitions.forecastDelta.subtitle,
      <>
        <div className="pl-widget-metrics-grid">
          <div className="pl-power-mini-card">
            <span>Scenario Revenue</span>
            <strong>{formatSignedCompactCurrency(forecastRevenueDelta)}</strong>
            <small>{activeScenario.label} vs baseline</small>
          </div>
          <div className="pl-power-mini-card">
            <span>Scenario Net</span>
            <strong>{formatSignedCompactCurrency(forecastNetDelta)}</strong>
            <small>{forecastConfidence.label}</small>
          </div>
        </div>
        <div className="pl-chart-frame is-report-panel">
          <ForecastDeltaChart baseline={baselineForecast} scenario={forecast} scenarioLabel={activeScenario.label} />
        </div>
      </>,
      className
    );
  }

  function renderVariancePulsePanel(className = "") {
    const maxVariancePulse = Math.max(1, ...variancePulseRows.flatMap((row) => [Math.abs(row.budgetPct), Math.abs(row.priorPct)]));

    return renderManagedWidgetPanel(
      "variancePulse",
      chartWidgetDefinitions.variancePulse.title,
      chartWidgetDefinitions.variancePulse.subtitle,
      <div className="pl-variance-board">
        {variancePulseRows.map((row) => (
          <article className="pl-variance-card" key={row.group}>
            <div className="pl-variance-card-head">
              <strong>{row.group}</strong>
              <span>{fmtK(row.actual)}</span>
            </div>
            <div className="pl-variance-chip-row">
              <span className={`pl-variance-chip tone-${row.budgetTone}`}>Budget {formatSignedPercent(row.budgetPct)}</span>
              <span className={`pl-variance-chip tone-${row.priorTone}`}>Prior {formatSignedPercent(row.priorPct)}</span>
            </div>
            <div className="pl-variance-track-stack">
              <div className="pl-variance-track-row">
                <small>Budget</small>
                <div className="pl-variance-track">
                  <span className={`tone-${row.budgetTone}`} style={{ width: `${(Math.abs(row.budgetPct) / maxVariancePulse) * 100}%` }} />
                </div>
              </div>
              <div className="pl-variance-track-row">
                <small>Prior</small>
                <div className="pl-variance-track">
                  <span className={`tone-${row.priorTone}`} style={{ width: `${(Math.abs(row.priorPct) / maxVariancePulse) * 100}%` }} />
                </div>
              </div>
            </div>
            <small>{row.focus}</small>
          </article>
        ))}
      </div>,
      className
    );
  }

  function renderScenarioBridgePanel(className = "") {
    const maxBridgeValue = Math.max(1, ...scenarioBridge.map((point) => Math.abs(point.value)));

    return renderManagedWidgetPanel(
      "scenarioBridge",
      chartWidgetDefinitions.scenarioBridge.title,
      chartWidgetDefinitions.scenarioBridge.subtitle,
      <div className="pl-scenario-bridge-list">
        {scenarioBridge.map((point) => (
          <div className="pl-scenario-bridge-row" key={point.label}>
            <div className="pl-scenario-bridge-copy">
              <strong>{point.label}</strong>
              <span>{point.label === "Scenario Net" ? activeScenario.label : "Bridge component"}</span>
            </div>
            <div className="pl-scenario-bridge-track">
              <span className={`tone-${point.tone}`} style={{ width: `${Math.max((Math.abs(point.value) / maxBridgeValue) * 100, 12)}%` }} />
            </div>
            <strong>{point.tone === "neutral" ? fmtK(point.value) : formatSignedCompactCurrency(point.value)}</strong>
          </div>
        ))}
      </div>,
      className
    );
  }

  function renderMonthlyOutlookPreviewPanel(className = "") {
    return renderManagedWidgetPanel(
      "monthlyOutlookStudio",
      chartWidgetDefinitions.monthlyOutlookStudio.title,
      chartWidgetDefinitions.monthlyOutlookStudio.subtitle,
      <div className="pl-outlook-preview-grid">
        {monthlyOutlookRows.slice(0, MAX_WIDGET_PREVIEW_ITEMS).map((row) => (
          <article className={`pl-outlook-preview-card tone-${row.paceTone}`} key={row.label}>
            <div className="pl-outlook-preview-head">
              <strong>{row.label}</strong>
              <span>{row.paceLabel}</span>
            </div>
            <div className="pl-outlook-preview-metrics">
              <div>
                <span>Revenue</span>
                <strong>{fmtK(row.revenue)}</strong>
              </div>
              <div>
                <span>Net</span>
                <strong>{fmtK(row.netIncome)}</strong>
              </div>
            </div>
            <div className="pl-outlook-preview-bars">
              <span className="is-baseline" style={{ width: `${(row.baselineRevenue / monthlyOutlookMaxRevenue) * 100}%` }} />
              <span className="is-current" style={{ width: `${(row.revenue / monthlyOutlookMaxRevenue) * 100}%` }} />
            </div>
            <small>{formatSignedCompactCurrency(row.netDelta)} vs baseline · {row.netMarginPct.toFixed(1)}% net margin</small>
          </article>
        ))}
      </div>,
      className
    );
  }

  function renderScenarioCommandCenterPanel(className = "") {
    const maxScenarioNet = Math.max(1, ...scenarioCompareRows.map((row) => row.netTotal));

    return renderManagedWidgetPanel(
      "scenarioCommandCenter",
      chartWidgetDefinitions.scenarioCommandCenter.title,
      chartWidgetDefinitions.scenarioCommandCenter.subtitle,
      <div className="pl-scenario-command-grid">
        {scenarioCompareRows.map((row) => (
          <article className={`pl-scenario-command-card${row.id === selectedScenarioId ? " is-active" : ""}`} key={row.id}>
            <div className="pl-scenario-command-head">
              <strong>{row.label}</strong>
              <span>{row.confidence}/100</span>
            </div>
            <div className="pl-scenario-command-metrics">
              <div>
                <span>Revenue</span>
                <strong>{fmtK(row.revenueTotal)}</strong>
              </div>
              <div>
                <span>Net</span>
                <strong>{fmtK(row.netTotal)}</strong>
              </div>
            </div>
            <div className="pl-scenario-command-chip-row">
              <span>{row.grossMarginPct.toFixed(1)}% gross margin</span>
              <span>{formatSignedCompactCurrency(row.deltaVsBaseline)} vs baseline</span>
            </div>
            <div className="pl-scenario-command-track">
              <span style={{ width: `${Math.max((row.netTotal / maxScenarioNet) * 100, 18)}%` }} />
            </div>
            <small>{row.summary}</small>
          </article>
        ))}
      </div>,
      className
    );
  }

  function renderStoreMarginMatrixPanel(className = "") {
    const maxStoreNetIncome = Math.max(1, ...storePerformance.map((store) => Math.abs(store.netIncome)));

    return renderManagedWidgetPanel(
      "storeMarginMatrix",
      chartWidgetDefinitions.storeMarginMatrix.title,
      chartWidgetDefinitions.storeMarginMatrix.subtitle,
      <div className="pl-margin-matrix-grid">
        {storePerformance.map((store) => {
          const tone = store.netMarginPct >= 11 ? "up" : store.netMarginPct <= 8 ? "down" : "neutral";

          return (
            <article className={`pl-margin-matrix-card tone-${tone}`} key={store.storeId}>
              <div className="pl-margin-matrix-head">
                <strong>{store.storeName}</strong>
                <span>{store.netMarginPct.toFixed(1)}% net</span>
              </div>
              <div className="pl-margin-matrix-metrics">
                <div>
                  <span>Revenue</span>
                  <strong>{fmtK(store.revenue)}</strong>
                </div>
                <div>
                  <span>Gross</span>
                  <strong>{fmtK(store.grossProfit)}</strong>
                </div>
              </div>
              <div className="pl-margin-matrix-track">
                <span className={`tone-${tone}`} style={{ width: `${Math.max((Math.abs(store.netIncome) / maxStoreNetIncome) * 100, 10)}%` }} />
              </div>
              <small>{fmtK(store.netIncome)} net income contribution</small>
            </article>
          );
        })}
      </div>,
      className
    );
  }

  function renderAnomalyLedgerPanel(className = "") {
    const topAnomalies = anomalyHighlights.slice(0, 6);
    const maxAnomalyPct = Math.max(15, ...topAnomalies.map((item) => Math.abs(item.pct)));

    return renderManagedWidgetPanel(
      "anomalyLedger",
      chartWidgetDefinitions.anomalyLedger.title,
      chartWidgetDefinitions.anomalyLedger.subtitle,
      topAnomalies.length > 0 ? (
        <div className="pl-anomaly-ledger-list">
          {topAnomalies.map((item) => (
            <article className={`pl-anomaly-ledger-item tone-${item.direction}`} key={item.line.account}>
              <div className="pl-anomaly-ledger-head">
                <div>
                  <strong>{item.line.description}</strong>
                  <span>{item.line.owner ?? "Owner not assigned"}</span>
                </div>
                <strong>{item.direction === "up" ? "+" : "-"}{Math.abs(item.pct).toFixed(1)}%</strong>
              </div>
              <div className="pl-anomaly-ledger-track">
                <span className={`tone-${item.direction}`} style={{ width: `${Math.max((Math.abs(item.pct) / maxAnomalyPct) * 100, 12)}%` }} />
              </div>
              <small>{formatCurrency(item.line.may2026)} actual · {item.line.driver ?? "No driver noted"}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="pl-report-delivery-empty">No account anomalies are above the current alert threshold.</p>
      ),
      className
    );
  }

  function renderContributorSpotlightPanel(className = "") {
    return renderManagedWidgetPanel(
      "contributorSpotlight",
      chartWidgetDefinitions.contributorSpotlight.title,
      chartWidgetDefinitions.contributorSpotlight.subtitle,
      topContributionLines.length > 0 ? (
        <div className="pl-contributor-spotlight-grid">
          {topContributionLines.map((line) => {
            const contributors = [...(line.contributors ?? [])].sort((left, right) => right.actual - left.actual).slice(0, 3);

            return (
              <article className="pl-contributor-spotlight-card" key={line.account}>
                <div className="pl-contributor-spotlight-head">
                  <div>
                    <strong>{line.description}</strong>
                    <span>{line.owner ?? "Owner not assigned"}</span>
                  </div>
                  <strong>{fmtK(line.may2026)}</strong>
                </div>
                <div className="pl-contributor-spotlight-list">
                  {contributors.map((contributor) => (
                    <div className="pl-contributor-spotlight-row" key={contributor.storeId}>
                      <span>{contributor.storeName}</span>
                      <div className="pl-contributor-spotlight-track">
                        <b style={{ width: `${Math.max((contributor.actual / Math.max(line.may2026, 1)) * 100, 10)}%` }} />
                      </div>
                      <small>{fmtK(contributor.actual)}</small>
                    </div>
                  ))}
                </div>
                <small>{line.driver ?? "No driver noted"}</small>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="pl-report-delivery-empty">No contributor data is available for the current scope.</p>
      ),
      className
    );
  }

  function renderSnapshotVaultPanel(className = "") {
    const previewSnapshots = savedSnapshots.length > 0
      ? savedSnapshots.slice(0, 4).map((snapshot) => ({
          confidence: snapshot.confidence,
          department: snapshot.department,
          id: snapshot.id,
          isActive: snapshot.scenarioId === selectedScenarioId && snapshot.month === selectedMonth && snapshot.year === selectedYear,
          label: snapshot.label,
          netTotal: snapshot.netTotal,
          revenueTotal: snapshot.revenueTotal,
          savedAt: snapshot.savedAt,
          storeLabel: snapshot.storeLabel
        }))
      : [{
          confidence: forecastConfidence.score,
          department: selectedDepartment,
          id: "live-run",
          isActive: true,
          label: `${selectedMonth.slice(0, 3)} ${selectedYear} · ${activeScenario.label}`,
          netTotal: forecastNetTotal,
          revenueTotal: forecastRevenueTotal,
          savedAt: "Live board",
          storeLabel: selectedStoresLabel
        }];

    return renderManagedWidgetPanel(
      "snapshotVault",
      chartWidgetDefinitions.snapshotVault.title,
      chartWidgetDefinitions.snapshotVault.subtitle,
      <div className="pl-snapshot-list">
        {previewSnapshots.map((snapshot) => (
          <article className={`pl-snapshot-card${snapshot.isActive ? " is-active" : ""}`} key={snapshot.id}>
            <strong>{snapshot.label}</strong>
            <span>{snapshot.savedAt}</span>
            <small>{snapshot.department} · {snapshot.storeLabel}</small>
            <div className="pl-snapshot-metrics">
              <span>Revenue {fmtK(snapshot.revenueTotal)}</span>
              <span>Net {fmtK(snapshot.netTotal)}</span>
              <span>Confidence {snapshot.confidence}/100</span>
            </div>
          </article>
        ))}
      </div>,
      className
    );
  }

  function renderChartMetricCard(widgetId: PLChartMetricWidgetId) {
    const card = chartMetricDefinitions[widgetId];

    return (
      <article key={widgetId} className="pl-power-kpi-card">
        <span>{card.label}</span>
        <strong>{card.value}</strong>
        <div className="pl-power-kpi-card-foot">
          <small>{card.detail}</small>
          <Sparkline color={card.color} values={card.series.length > 0 ? card.series : [0]} />
        </div>
      </article>
    );
  }

  function renderVisualWidgetPanel(widgetId: PLWidgetId, className = "") {
    if (widgetId === "trendExplorer") {
      return renderChartPanel(widgetId, "trend", chartWidgetDefinitions.trendExplorer.title, chartWidgetDefinitions.trendExplorer.subtitle, className);
    }

    if (widgetId === "marginWalk") {
      return renderChartPanel(widgetId, "waterfall", chartWidgetDefinitions.marginWalk.title, chartWidgetDefinitions.marginWalk.subtitle, className);
    }

    if (widgetId === "departmentMix") {
      return renderChartPanel(widgetId, "department", chartWidgetDefinitions.departmentMix.title, chartWidgetDefinitions.departmentMix.subtitle, className);
    }

    if (widgetId === "storeLeaderboard") {
      return renderStoreLeaderboardPanel(className);
    }

    if (widgetId === "forecastDelta") {
      return renderForecastDeltaPanel(className);
    }

    if (widgetId === "variancePulse") {
      return renderVariancePulsePanel(className);
    }

    if (widgetId === "departmentScoreboard") {
      return renderDepartmentPerformancePanel(className);
    }

    if (widgetId === "scenarioBridge") {
      return renderScenarioBridgePanel(className);
    }

    if (widgetId === "scenarioCommandCenter") {
      return renderScenarioCommandCenterPanel(className);
    }

    if (widgetId === "storeMarginMatrix") {
      return renderStoreMarginMatrixPanel(className);
    }

    if (widgetId === "anomalyLedger") {
      return renderAnomalyLedgerPanel(className);
    }

    if (widgetId === "contributorSpotlight") {
      return renderContributorSpotlightPanel(className);
    }

    if (widgetId === "snapshotVault") {
      return renderSnapshotVaultPanel(className);
    }

    return renderMonthlyOutlookPreviewPanel(className);
  }

  function renderSnapshotBoardPanel(className = "") {
    return (
      <article className={`pl-power-panel ${className}`.trim()}>
        <div className="pl-power-panel-header">
          <div>
            <strong>Forecast Snapshots</strong>
            <span>Save the current run and reload it for leadership reviews.</span>
          </div>
          <button type="button" onClick={saveCurrentSnapshot}>Save Snapshot</button>
        </div>
        {savedSnapshots.length > 0 ? (
          <div className="pl-snapshot-list">
            {savedSnapshots.map((snapshot) => (
              <article key={snapshot.id} className={`pl-snapshot-card${snapshot.scenarioId === selectedScenarioId && snapshot.month === selectedMonth && snapshot.year === selectedYear ? " is-active" : ""}`}>
                <strong>{snapshot.label}</strong>
                <span>{snapshot.savedAt}</span>
                <small>{snapshot.department} · {snapshot.storeLabel}</small>
                <div className="pl-snapshot-metrics">
                  <span>Revenue {fmtK(snapshot.revenueTotal)}</span>
                  <span>Net {fmtK(snapshot.netTotal)}</span>
                </div>
                <div className="pl-snapshot-actions">
                  <button type="button" onClick={() => loadSnapshot(snapshot)}>Load</button>
                  <button type="button" onClick={() => deleteSnapshot(snapshot.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="pl-snapshot-empty">No forecast snapshots saved yet.</p>
        )}
      </article>
    );
  }

  function renderScenarioLabPanel(className = "") {
    return (
      <article className={`pl-power-panel ${className}`.trim()}>
        <div className="pl-power-panel-header">
          <div>
            <strong>Scenario Lab</strong>
            <span>Blend preset plays with custom volume, margin, and expense levers.</span>
          </div>
        </div>
        <div className="pl-scenario-grid">
          {forecastScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={`pl-scenario-card tone-${scenario.id}${selectedScenarioId === scenario.id ? " is-active" : ""}`}
              onClick={() => applyScenarioPreset(scenario.id)}
            >
              <strong>{scenario.label}</strong>
              <span>{scenario.summary}</span>
              <small>{scenario.revenuePct >= 0 ? "+" : ""}{scenario.revenuePct}% volume · {scenario.grossMarginBps >= 0 ? "+" : ""}{scenario.grossMarginBps} bps · {scenario.expensePct >= 0 ? "+" : ""}{scenario.expensePct}% expense</small>
            </button>
          ))}
        </div>
        <div className="pl-driver-controls">
          <label>
            <span>Volume</span>
            <strong>{revenueLiftPct >= 0 ? "+" : ""}{revenueLiftPct.toFixed(1)}%</strong>
            <input type="range" min={-10} max={15} step={0.5} value={revenueLiftPct} onChange={(e) => setRevenueLiftPct(Number(e.target.value))} />
          </label>
          <label>
            <span>Gross Margin</span>
            <strong>{marginShiftBps >= 0 ? "+" : ""}{marginShiftBps} bps</strong>
            <input type="range" min={-250} max={250} step={10} value={marginShiftBps} onChange={(e) => setMarginShiftBps(Number(e.target.value))} />
          </label>
          <label>
            <span>Expense Load</span>
            <strong>{expenseShiftPct >= 0 ? "+" : ""}{expenseShiftPct.toFixed(1)}%</strong>
            <input type="range" min={-8} max={8} step={0.5} value={expenseShiftPct} onChange={(e) => setExpenseShiftPct(Number(e.target.value))} />
          </label>
        </div>
      </article>
    );
  }

  function renderScenarioComparePanel(className = "") {
    return (
      <article className={`pl-power-panel ${className}`.trim()}>
        <div className="pl-power-panel-header">
          <div>
            <strong>Scenario Compare</strong>
            <span>Side-by-side scenario outputs for the forecast deck.</span>
          </div>
        </div>
        <div className="pl-power-table-wrap">
          <table className="pl-power-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Revenue</th>
                <th>Gross Margin</th>
                <th>Net</th>
                <th>vs Baseline</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {scenarioCompareRows.map((row) => (
                <tr key={row.id} className={row.id === selectedScenarioId ? "is-active" : ""}>
                  <td>
                    <strong>{row.label}</strong>
                    <small>{row.summary}</small>
                  </td>
                  <td>{fmtK(row.revenueTotal)}</td>
                  <td>{row.grossMarginPct.toFixed(1)}%</td>
                  <td>{fmtK(row.netTotal)}</td>
                  <td>{formatSignedCompactCurrency(row.deltaVsBaseline)}</td>
                  <td>{row.confidence}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    );
  }

  function renderMonthlyOutlookPanel(className = "") {
    return (
      <article className={`pl-power-panel ${className}`.trim()}>
        <div className="pl-power-panel-header">
          <div>
            <strong>Monthly Outlook Studio</strong>
            <span>Month-by-month revenue, margin, and drop-through against the active plan.</span>
          </div>
        </div>
        <div className="pl-monthly-outlook-overview">
          {monthlyOutlookOverview.map((item) => (
            <article key={item.label} className="pl-monthly-outlook-overview-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <div className="pl-monthly-outlook-card-grid">
          {monthlyOutlookRows.map((row) => {
            const activeRevenueWidth = Math.max((row.revenue / monthlyOutlookMaxRevenue) * 100, row.revenue > 0 ? 10 : 0);
            const baselineRevenueWidth = Math.max((row.baselineRevenue / monthlyOutlookMaxRevenue) * 100, row.baselineRevenue > 0 ? 10 : 0);
            const activeNetWidth = Math.max((Math.abs(row.netIncome) / monthlyOutlookMaxNet) * 100, Math.abs(row.netIncome) > 0 ? 10 : 0);
            const baselineNetWidth = Math.max((Math.abs(row.baselineNetIncome) / monthlyOutlookMaxNet) * 100, Math.abs(row.baselineNetIncome) > 0 ? 10 : 0);

            return (
              <article key={row.label} className={`pl-monthly-outlook-card tone-${row.paceTone}`}>
                <div className="pl-monthly-outlook-card-head">
                  <div>
                    <strong>{row.label}</strong>
                    <span>{row.focus}</span>
                  </div>
                  <span className={`pl-monthly-outlook-chip tone-${row.paceTone}`}>{row.paceLabel}</span>
                </div>
                <div className="pl-monthly-outlook-metrics">
                  <div>
                    <span>Revenue</span>
                    <strong>{fmtK(row.revenue)}</strong>
                    <small>{formatSignedCompactCurrency(row.revenueDelta)} vs baseline</small>
                  </div>
                  <div>
                    <span>Gross Margin</span>
                    <strong>{row.grossMarginPct.toFixed(1)}%</strong>
                    <small>{formatSignedPercent(row.revenueStepPct)} vs prior month pace</small>
                  </div>
                  <div>
                    <span>Net Income</span>
                    <strong>{fmtK(row.netIncome)}</strong>
                    <small>{row.netMarginPct.toFixed(1)}% net margin</small>
                  </div>
                </div>
                <div className="pl-monthly-outlook-compare">
                  <div className="pl-monthly-outlook-track-row">
                    <span>Revenue</span>
                    <div className="pl-monthly-outlook-track">
                      <i className="is-baseline" style={{ width: `${baselineRevenueWidth}%` }} />
                      <b className={`tone-${row.paceTone}`} style={{ width: `${activeRevenueWidth}%` }} />
                    </div>
                    <small>{fmtK(row.baselineRevenue)} baseline</small>
                  </div>
                  <div className="pl-monthly-outlook-track-row">
                    <span>Net</span>
                    <div className="pl-monthly-outlook-track is-net">
                      <i className="is-baseline" style={{ width: `${baselineNetWidth}%` }} />
                      <b className={`tone-${row.netDelta > 0 ? "up" : row.netDelta < 0 ? "down" : row.paceTone}`} style={{ width: `${activeNetWidth}%` }} />
                    </div>
                    <small>{fmtK(row.baselineNetIncome)} baseline</small>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </article>
    );
  }

  return (
    <div className="profit-loss-shell is-compact">
      <div className="profit-loss-title-bar">
        <div className="pl-title-left">
          <div className="pl-title-copy">
            <strong>Profit and Loss Statement</strong>
            <span>{selectedMonth} {selectedYear} · {selectedStoresLabel} · {selectedDepartment}</span>
          </div>
        </div>
        <div className="profit-loss-title-actions">
          <button type="button" onClick={() => exportCSV(statementLines, selectedMonth, selectedYear)}>CSV</button>
          <button type="button" onClick={() => window.print()}>Print</button>
          <button className="is-primary" type="button" onClick={handleGeneratePacket}>Generate Packet</button>
        </div>
      </div>

      {/* command strip */}
      <section className="profit-loss-command-strip" aria-label="Report setup">
        <div className="profit-loss-department-pills">
          {departments.map((dept) => (
            <button key={dept} className={dept === selectedDepartment ? "is-active" : ""} type="button" onClick={() => setSelectedDepartment(dept)}>
              {dept === "Consolidated Statement" ? "Consolidated" : dept}
            </button>
          ))}
        </div>
        <label>
          <span>Month</span>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {reportMonths.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>
          <span>Year</span>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            <option>2026</option><option>2025</option><option>2024</option>
          </select>
        </label>
        <label>
          <span>Compare</span>
          <select value={varianceMode} onChange={(e) => setVarianceMode(e.target.value as PLVarianceMode)}>
            <option value="actual">Actual</option>
            <option value="priorYear">Actual vs Prior Year</option>
            <option value="budget">Budget vs Actual</option>
          </select>
        </label>
        <details className="profit-loss-store-picker">
          <summary>{selectedStoresLabel}</summary>
          <div className="profit-loss-store-menu">
            {profitLossStores.map((store) => (
              <label key={store.id}>
                <input type="checkbox" checked={selectedStoreIds.has(store.id)} onChange={() => toggleStore(store.id)} />
                <span>{store.name}</span>
              </label>
            ))}
          </div>
        </details>
        <label className="profit-loss-account-toggle">
          <input type="checkbox" checked={displayAccountNumber} onChange={(e) => setDisplayAccountNumber(e.target.checked)} />
          <span>GL #</span>
        </label>
      </section>

      {/* summary cards */}
      <section className="profit-loss-summary-strip">
        {summaryCards.map((card) => (
          <article key={card.label} className={`profit-loss-summary-card tone-${card.tone}`}>
            <div className="pl-summary-card-head">
              <span>{card.label}</span>
              <small className={`pl-summary-delta is-${card.deltaTone}`}>{card.delta}</small>
            </div>
            <strong>{card.value}</strong>
            <div className="pl-summary-card-foot">
              <small>{card.sub}</small>
              <Sparkline values={card.series} color={card.color} />
            </div>
          </article>
        ))}
      </section>

      <section className="pl-analysis-board" aria-label="Profit and loss analytics board">
        <article className="pl-analysis-panel">
          <div className="pl-analysis-header">
            <div>
              <strong>Variance Pulse</strong>
              <span>Conditional formatting inside the Lightspeed shell.</span>
            </div>
            <button type="button" onClick={() => setViewMode("report")}>Report</button>
          </div>
          <div className="pl-variance-matrix">
            <table>
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Actual</th>
                  <th>vs Budget</th>
                  <th>vs Prior</th>
                </tr>
              </thead>
              <tbody>
                {variancePulseRows.map((row) => (
                  <tr key={row.group} className="pl-variance-row" onClick={() => openGroupFocus(row.group)}>
                    <td>
                      <strong>{row.group}</strong>
                      <small>{row.focus}</small>
                    </td>
                    <td>{formatCurrency(row.actual)}</td>
                    <td><span className={`pl-variance-pill is-${row.budgetTone}`}>{row.budgetPct >= 0 ? "+" : ""}{row.budgetPct.toFixed(1)}%</span></td>
                    <td><span className={`pl-variance-pill is-${row.priorTone}`}>{row.priorPct >= 0 ? "+" : ""}{row.priorPct.toFixed(1)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="pl-analysis-panel">
          <div className="pl-analysis-header">
            <div>
              <strong>Scenario Run</strong>
              <span>{activeScenario.label} · {selectedDepartment}</span>
            </div>
            <button type="button" onClick={() => setViewMode("forecast")}>Forecast</button>
          </div>
          <div className="pl-driver-stack">
            {scenarioBridge.map((point) => (
              <div key={point.label} className={`pl-driver-chip is-${point.tone}`}>
                <span>{point.label}</span>
                <strong>{point.tone === "neutral" ? fmtK(point.value) : `${point.value >= 0 ? "+" : "-"}${fmtK(Math.abs(point.value)).replace("$", "$")}`}</strong>
              </div>
            ))}
          </div>
          <div className="pl-analysis-note">
            <strong>{activeScenario.summary}</strong>
            <span>{scopeLabel} · Confidence {forecastConfidence.score}/100</span>
          </div>
        </article>
      </section>

      {/* view tabs */}
      <div className="pl-view-tabs">
        {(["report", "charts", "forecast"] as PLViewMode[]).map((v) => (
          <button key={v} type="button" className={viewMode === v ? "is-active" : ""} onClick={() => setViewMode(v)}>
            {v === "report" ? "Report" : v === "charts" ? "Charts" : "Forecast"}
          </button>
        ))}
      </div>

      {/* ── REPORT VIEW ── */}
      {viewMode === "report" && (
        <div className={`profit-loss-report-stage${selectedAccountLine ? " has-detail" : ""}`}>
          <div className="profit-loss-report-main">
            {commentary.length > 0 && (
              <div className="pl-commentary-banner">
                <button type="button" onClick={() => setShowCommentary((v) => !v)} className="pl-commentary-toggle">
                  {showCommentary ? "Hide" : "Show"} Insights ({commentary.length})
                </button>
                {showCommentary && <ul>{commentary.map((line, i) => <li key={i}>{line}</li>)}</ul>}
              </div>
            )}

            <div className="profit-loss-report-page">
              <header className="profit-loss-report-header">
                <strong>MJM Marine, LLC</strong>
                <div>
                  <h2>G/L Profit And Loss Statement</h2>
                  <p>Fiscal Year Ends: December 31, {selectedYear}</p>
                  <p>For the Month Ended: {selectedMonth} {periodEndDay}, {selectedYear}</p>
                  <p>For Store(s): {selectedStoresLabel}</p>
                </div>
              </header>
              <h3>Department: {selectedDepartment}</h3>
              <div className="profit-loss-report-table-shell">
                <table className="profit-loss-report-table is-collapsible">
                  <thead>
                    <tr>
                      {displayAccountNumber && <th>G/L Account</th>}
                      <th>Description</th>
                      <th>{selectedMonth} {selectedYear}</th>
                      {varianceMode !== "actual" && (
                        <>
                          <th>{varianceMode === "priorYear" ? `${selectedMonth} ${selectedYearNumber - 1}` : "Budget"}</th>
                          <th>Variance</th>
                          <th>Variance %</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  {groupedLines.map(({ group, lines }) => {
                    const isCollapsed = collapsedGroups.has(group);
                    const groupTotal = getGroupTotal(statementLines, group);
                    const colSpan = displayAccountNumber ? (varianceMode === "actual" ? 3 : 6) : varianceMode === "actual" ? 2 : 5;
                    return (
                      <tbody key={group}>
                        <tr className="profit-loss-group-row">
                          <td colSpan={colSpan}>
                            <button onClick={() => toggleGroup(group)} type="button">
                              <span>{isCollapsed ? "+" : "−"}</span>
                              <strong>{group}</strong>
                              <em>{formatCurrency(groupTotal)}</em>
                            </button>
                          </td>
                        </tr>
                        {!isCollapsed && lines.map((line) => {
                          const anomaly = line.account ? anomalies.get(line.account) : undefined;
                          return (
                            <tr
                              key={`${line.group}:${line.description}`}
                              className={[line.isTotal ? "is-total" : "", selectedAccountLine?.account === line.account && line.account ? "is-selected" : ""].filter(Boolean).join(" ")}
                              onClick={() => line.account && setSelectedAccount(line)}
                            >
                              {displayAccountNumber && <td>{line.account}</td>}
                              <td>
                                {line.description}
                                {anomaly && (
                                  <span className={`pl-anomaly-tag ${anomaly.direction === "up" ? "is-up" : "is-down"}`}>
                                    {anomaly.direction === "up" ? "▲" : "▼"} {Math.abs(anomaly.pct).toFixed(0)}%
                                  </span>
                                )}
                              </td>
                              <td>{formatCurrency(line.may2026)}</td>
                              {renderVarianceColumns(line)}
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            </div>
          </div>

          {selectedAccountLine && (
            <aside className="profit-loss-account-detail is-open">
              <div className="profit-loss-account-detail-header">
                <span>Account Detail</span>
                <button type="button" onClick={() => setSelectedAccount(null)}>Close</button>
              </div>
              <strong>{selectedAccountLine.account} — {selectedAccountLine.description}</strong>
              <p>{selectedMonth} {selectedYear}: {formatCurrency(selectedAccountLine.may2026)}</p>
              <div className="pl-account-kpi-grid">
                <div className="pl-account-kpi">
                  <span>Budget</span>
                  <strong>{formatCurrency(selectedAccountLine.budget ?? 0)}</strong>
                </div>
                <div className="pl-account-kpi">
                  <span>Owner</span>
                  <strong>{selectedAccountLine.owner ?? "Controller"}</strong>
                </div>
                <div className="pl-account-kpi">
                  <span>Driver</span>
                  <strong>{selectedAccountLine.driver ?? "Department mix"}</strong>
                </div>
              </div>
              {selectedAccountLine.priorYear !== undefined && (
                <p className="pl-acct-compare">Prior Year: {formatCurrency(selectedAccountLine.priorYear)} ({getVariancePercent(selectedAccountLine.may2026, selectedAccountLine.priorYear)} YoY)</p>
              )}
              {selectedAccountLine.budget !== undefined && (
                <p className="pl-acct-compare">Budget: {formatCurrency(selectedAccountLine.budget)} ({getVariancePercent(selectedAccountLine.may2026, selectedAccountLine.budget)} to plan)</p>
              )}
              {anomalies.has(selectedAccountLine.account) && (
                <div className="pl-acct-alert">Variance alert: {Math.abs(anomalies.get(selectedAccountLine.account)!.pct).toFixed(1)}% change versus prior year.</div>
              )}
              {selectedAccountLine.contributors && selectedAccountLine.contributors.length > 0 && (
                <div className="pl-account-store-list">
                  <span>Store Mix</span>
                  {selectedAccountLine.contributors.map((contribution) => (
                    <div key={`${selectedAccountLine.account}:${contribution.storeId}`} className="pl-account-store-item">
                      <strong>{contribution.storeName}</strong>
                      <small>{formatCurrency(contribution.actual)} actual · {formatCurrency(contribution.budget)} budget</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="profit-loss-account-transactions">
                <span>Transaction Drill-Through</span>
                {selectedAccountLine.transactions && selectedAccountLine.transactions.length > 0 ? (
                  <div className="pl-account-transaction-list">
                    {selectedAccountLine.transactions.map((transaction) => (
                      <div key={transaction.id} className="pl-account-transaction-item">
                        <div>
                          <strong>{transaction.source}</strong>
                          <small>{transaction.detail}</small>
                        </div>
                        <div>
                          <span>{formatShortDate(transaction.date)} · {transaction.storeName} · {transaction.reference}</span>
                          <strong>{formatCurrency(transaction.amount)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No transaction activity is staged for this line in the current scope.</p>
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {viewMode === "charts" && (
        <div className="pl-charts-view">
          {deliveryNotice && <div className="pl-widget-delivery-notice">{deliveryNotice}</div>}
          <div className="pl-report-toolbar">
            <div className="pl-report-toolbar-group is-layout-toggle">
              <span>Layout</span>
              {([
                ["focus", "Focus"],
                ["board", "Board"],
                ["multiReport", "Report Pack"]
              ] as Array<[PLReportLayoutMode, string]>).map(([mode, label]) => (
                <button key={mode} type="button" className={chartLayoutMode === mode ? "is-active" : ""} onClick={() => setChartLayoutMode(mode)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="pl-power-section-header">
            <div className="pl-power-section-copy">
              <strong>CEO Data Tiles</strong>
              <span>Pick the four headline accounting signals leadership should see first.</span>
            </div>
            <div className="pl-power-section-actions">
              <small>{visibleChartMetricWidgetIds.length}/{MAX_CHART_DATA_WIDGETS} visible</small>
              <button className="pl-widget-action-button" onClick={() => setChartWidgetLibrarySection("data")} type="button">Filter Data Tiles</button>
            </div>
          </div>
          <div className="pl-power-kpi-strip">
            {visibleChartMetricWidgetIds.map((widgetId) => renderChartMetricCard(widgetId))}
          </div>
          <div className="pl-power-section-header">
            <div className="pl-power-section-copy">
              <strong>Accounting Visual Board</strong>
              <span>Swap between advanced CEO and accounting widgets while holding up to eight on screen.</span>
            </div>
            <div className="pl-power-section-actions">
              {chartLayoutMode === "focus" && activeFeaturedChartWidgetId && visibleChartVisualWidgetIds.length > 1 && (
                <div className="pl-focus-widget-switcher">
                  {visibleChartVisualWidgetIds.map((widgetId) => (
                    <button
                      key={widgetId}
                      type="button"
                      className={activeFeaturedChartWidgetId === widgetId ? "is-active" : ""}
                      onClick={() => setFeaturedChartWidgetId(widgetId)}
                    >
                      {chartWidgetDefinitions[widgetId].shortTitle}
                    </button>
                  ))}
                </div>
              )}
              <small>{visibleChartVisualWidgetIds.length}/{MAX_CHART_VISUAL_WIDGETS} visible</small>
              <button className="pl-widget-action-button" onClick={() => setChartWidgetLibrarySection("visuals")} type="button">Filter Widgets</button>
            </div>
          </div>
          {chartLayoutMode === "focus" ? (
            <div className="pl-power-focus-layout">
              {activeFeaturedChartWidgetId && renderVisualWidgetPanel(activeFeaturedChartWidgetId, "is-span-2")}
              {supportingChartWidgetIds.length > 0 && (
                <div className="pl-power-side-stack">
                  {supportingChartWidgetIds.map((widgetId) => <Fragment key={widgetId}>{renderVisualWidgetPanel(widgetId)}</Fragment>)}
                </div>
              )}
            </div>
          ) : (
            <div className={`pl-power-grid${chartLayoutMode === "multiReport" ? " is-report-pack" : ""}${isDenseVisualBoard ? " is-dense" : ""}`}>
              {visibleChartVisualWidgetIds.map((widgetId) => <Fragment key={widgetId}>{renderVisualWidgetPanel(widgetId)}</Fragment>)}
            </div>
          )}
        </div>
      )}

      {viewMode === "forecast" && (
        <div className="pl-forecast-view">
          <div className="pl-report-toolbar">
            <div className="pl-report-toolbar-group">
              <span>Report</span>
              {([
                ["scenarioLab", "Scenario Lab"],
                ["scenarioCompare", "Scenario Compare"],
                ["monthlyOutlook", "Monthly Outlook"]
              ] as Array<[PLForecastReport, string]>).map(([reportKey, label]) => (
                <button key={reportKey} type="button" className={forecastReport === reportKey ? "is-active" : ""} onClick={() => setForecastReport(reportKey)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="pl-report-toolbar-group is-layout-toggle">
              <span>Layout</span>
              {([
                ["focus", "Focus"],
                ["board", "Board"],
                ["multiReport", "Report Pack"]
              ] as Array<[PLReportLayoutMode, string]>).map(([mode, label]) => (
                <button key={mode} type="button" className={forecastLayoutMode === mode ? "is-active" : ""} onClick={() => setForecastLayoutMode(mode)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="pl-power-kpi-strip">
            {forecastOverviewCards.map((card) => (
              <article key={card.label} className="pl-power-kpi-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </article>
            ))}
          </div>
          {forecastLayoutMode === "focus" ? (
            <div className="pl-power-focus-layout">
              {forecastReport === "scenarioLab"
                ? renderScenarioLabPanel("is-span-2")
                : forecastReport === "scenarioCompare"
                  ? renderScenarioComparePanel("is-span-2")
                  : renderMonthlyOutlookPanel("is-span-2")}
              <div className="pl-power-side-stack">
                {renderSnapshotBoardPanel()}
              </div>
            </div>
          ) : (
            <div className={`pl-power-grid${forecastLayoutMode === "multiReport" ? " is-report-pack" : ""}`}>
              {renderSnapshotBoardPanel("is-span-2")}
              {renderScenarioLabPanel()}
              {renderScenarioComparePanel()}
              {renderMonthlyOutlookPanel("is-span-2")}
            </div>
          )}
        </div>
      )}

      {chartWidgetLibrarySection && (
        <div className="modal-backdrop" onClick={closeChartWidgetLibraryModal} role="presentation">
          <div aria-modal="true" className="modal-panel pl-report-delivery-modal pl-widget-library-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <div>
                <span className="pl-report-delivery-eyebrow">Charts personalization</span>
                <h2>{chartWidgetLibrarySection === "data" ? "Choose Data Tiles" : "Choose Visual Widgets"}</h2>
              </div>
              <button className="pl-widget-action-button" onClick={closeChartWidgetLibraryModal} type="button">Close</button>
            </div>
            <p className="pl-report-delivery-copy">
              {chartWidgetLibrarySection === "data"
                ? "Select up to four small data tiles for the executive strip. Keep the mix tight so the header stays readable."
                : "Select up to eight advanced accounting visuals for the board. Focus mode will feature one and stack the others beside it."}
            </p>
            <div className="pl-widget-library-status">
              <strong>
                {chartWidgetLibrarySection === "data" ? visibleChartMetricWidgetIds.length : visibleChartVisualWidgetIds.length}/{chartWidgetLibrarySection === "data" ? MAX_CHART_DATA_WIDGETS : MAX_CHART_VISUAL_WIDGETS} selected
              </strong>
              <span>At least one item stays visible at all times.</span>
            </div>
            <div className="pl-widget-library-list">
              {chartWidgetLibrarySection === "data"
                ? chartMetricWidgetOrder.map((widgetId) => {
                    const definition = chartMetricDefinitions[widgetId];
                    const selected = visibleChartMetricWidgetIds.includes(widgetId);
                    const disabled = !selected && visibleChartMetricWidgetIds.length >= MAX_CHART_DATA_WIDGETS;

                    return (
                      <label className={`pl-widget-library-option${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`} key={widgetId}>
                        <input checked={selected} disabled={disabled} onChange={() => toggleChartMetricWidget(widgetId)} type="checkbox" />
                        <div className="pl-widget-library-option-copy">
                          <strong>{definition.label}</strong>
                          <span>{definition.description}</span>
                        </div>
                        <small>{definition.value}</small>
                      </label>
                    );
                  })
                : chartWidgetOrder.map((widgetId) => {
                    const definition = chartWidgetDefinitions[widgetId];
                    const selected = visibleChartVisualWidgetIds.includes(widgetId);
                    const disabled = !selected && visibleChartVisualWidgetIds.length >= MAX_CHART_VISUAL_WIDGETS;

                    return (
                      <label className={`pl-widget-library-option${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`} key={widgetId}>
                        <input checked={selected} disabled={disabled} onChange={() => toggleChartVisualWidget(widgetId)} type="checkbox" />
                        <div className="pl-widget-library-option-copy">
                          <strong>{definition.title}</strong>
                          <span>{definition.subtitle}</span>
                        </div>
                        <small>{definition.shortTitle}</small>
                      </label>
                    );
                  })}
            </div>
            <div className="pl-report-delivery-footer">
              <small>
                {chartWidgetLibrarySection === "data"
                  ? "Use the executive strip for high-signal callouts. The line spark in each tile updates automatically with the current scope."
                  : "Every visible visual widget keeps the existing PDF, send, and schedule controls so the board remains exportable."}
              </small>
              <div className="pl-report-delivery-actions">
                <button className="pl-widget-action-button" onClick={() => resetChartWidgetLibrary(chartWidgetLibrarySection)} type="button">Reset Defaults</button>
                <button className="pl-widget-action-button is-primary" onClick={closeChartWidgetLibraryModal} type="button">Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deliveryModalMode && (
        <div className="modal-backdrop" onClick={closeWidgetDeliveryModal} role="presentation">
          <div aria-modal="true" className="modal-panel pl-report-delivery-modal" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-header">
              <div>
                <span className="pl-report-delivery-eyebrow">{deliveryModalMode === "send" ? "Widget delivery" : "Scheduled delivery"}</span>
                <h2>{deliveryModalMode === "send" ? "Send Widget Report" : "Schedule Widget Report"}</h2>
              </div>
              <button className="pl-widget-action-button" onClick={closeWidgetDeliveryModal} type="button">Close</button>
            </div>
            <p className="pl-report-delivery-copy">
              {deliveryModalMode === "send"
                ? "Open a Gmail draft for the selected widgets and optionally download each widget PDF first."
                : "Save a recurring widget pack with store scope and cadence so the report set is ready for delivery automation."}
            </p>
            <div className="pl-report-delivery-grid">
              <section className="pl-report-delivery-section">
                <h3>Gmail Profile</h3>
                <label className="pl-report-delivery-field">
                  <span>Gmail Account</span>
                  <input onChange={(event) => setGmailDraftAddress(event.target.value)} placeholder="you@gmail.com" type="email" value={gmailDraftAddress} />
                </label>
                <div className="pl-report-delivery-inline-actions">
                  <button className="pl-widget-action-button" onClick={connectGmailProfile} type="button">Save Gmail</button>
                  {gmailProfile && <span className="pl-report-delivery-chip">Connected {gmailProfile.address}</span>}
                </div>
                <label className="pl-report-delivery-field">
                  <span>Recipient Email</span>
                  <input onChange={(event) => setDeliveryRecipient(event.target.value)} placeholder="controller@company.com" type="email" value={deliveryRecipient} />
                </label>
                {deliveryModalMode === "send" && (
                  <label className="pl-report-delivery-check">
                    <input checked={includePdfExports} onChange={(event) => setIncludePdfExports(event.target.checked)} type="checkbox" />
                    <span>Download widget PDFs before opening Gmail</span>
                  </label>
                )}
                <div className="pl-report-delivery-field is-readonly">
                  <span>Email Subject</span>
                  <div className="pl-report-delivery-readout">{buildDefaultDeliverySubject(deliveryWidgetIds)}</div>
                </div>
              </section>

              <section className="pl-report-delivery-section">
                <h3>Widgets</h3>
                <div className="pl-report-delivery-widget-list">
                  {visibleChartVisualWidgetIds.map((widgetId) => (
                    <label className="pl-report-delivery-check" key={widgetId}>
                      <input checked={deliveryWidgetIds.includes(widgetId)} onChange={() => toggleDeliveryWidget(widgetId)} type="checkbox" />
                      <span>{chartWidgetDefinitions[widgetId].title}</span>
                    </label>
                  ))}
                </div>
                <p className="pl-report-delivery-empty">Delivery uses the widgets that are currently visible on the board.</p>

                <h3>Store Scope</h3>
                <div className="pl-report-delivery-scope-switcher">
                  {([
                    ["current", `Current (${selectedStoresLabel})`],
                    ["all", "All Stores"],
                    ["custom", "Custom Stores"]
                  ] as Array<[WidgetStoreScope, string]>).map(([scope, label]) => (
                    <label className="pl-report-delivery-check" key={scope}>
                      <input checked={deliveryStoreScope === scope} onChange={() => setDeliveryStoreScope(scope)} type="radio" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {deliveryStoreScope === "custom" && (
                  <div className="pl-report-delivery-store-list">
                    {profitLossStores.map((store) => (
                      <label className="pl-report-delivery-check" key={store.id}>
                        <input checked={deliveryCustomStoreIds.includes(store.id)} onChange={() => toggleDeliveryCustomStore(store.id)} type="checkbox" />
                        <span>{store.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                <label className="pl-report-delivery-field">
                  <span>Notes</span>
                  <textarea onChange={(event) => setDeliveryNote(event.target.value)} placeholder="Add context for the email body or schedule note…" rows={4} value={deliveryNote} />
                </label>
              </section>
            </div>

            {deliveryModalMode === "schedule" && (
              <>
                <section className="pl-report-delivery-section is-full-width">
                  <h3>Cadence</h3>
                  <div className="pl-report-delivery-scope-switcher">
                    {([
                      ["weekly", "Every Tuesday"],
                      ["threePerWeek", "3x Weekly"],
                      ["monthly", "Monthly"],
                      ["custom", "Custom"]
                    ] as Array<[WidgetScheduleCadence, string]>).map(([cadence, label]) => (
                      <label className="pl-report-delivery-check" key={cadence}>
                        <input checked={scheduleCadence === cadence} onChange={() => setScheduleCadence(cadence)} type="radio" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  {scheduleCadence === "weekly" && (
                    <label className="pl-report-delivery-field">
                      <span>Weekday</span>
                      <select onChange={(event) => setScheduleWeekday(event.target.value)} value={scheduleWeekday}>
                        {weekdayOptions.map((weekday) => <option key={weekday}>{weekday}</option>)}
                      </select>
                    </label>
                  )}
                  {scheduleCadence === "threePerWeek" && (
                    <div className="pl-report-delivery-widget-list is-compact">
                      {weekdayOptions.map((weekday) => (
                        <label className="pl-report-delivery-check" key={weekday}>
                          <input checked={scheduleWeekdays.includes(weekday)} onChange={() => toggleScheduleWeekday(weekday)} type="checkbox" />
                          <span>{weekday}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {scheduleCadence === "monthly" && (
                    <label className="pl-report-delivery-field">
                      <span>Day of Month</span>
                      <input max="31" min="1" onChange={(event) => setScheduleMonthlyDay(event.target.value)} type="number" value={scheduleMonthlyDay} />
                    </label>
                  )}
                  {scheduleCadence === "custom" && (
                    <label className="pl-report-delivery-field">
                      <span>Custom Rule</span>
                      <select onChange={(event) => setScheduleCustomRule(event.target.value)} value={scheduleCustomRule}>
                        {customScheduleRuleOptions.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </label>
                  )}
                </section>

                <section className="pl-report-delivery-section is-full-width">
                  <div className="pl-report-delivery-schedule-header">
                    <h3>Saved Schedules</h3>
                    <span>{savedWidgetSchedules.length} saved</span>
                  </div>
                  {savedWidgetSchedules.length > 0 ? (
                    <div className="pl-report-delivery-schedule-list">
                      {savedWidgetSchedules.map((schedule) => (
                        <article className="pl-report-delivery-schedule-card" key={schedule.id}>
                          <strong>{schedule.widgetIds.map((widgetId) => chartWidgetDefinitions[widgetId].title).join(" · ")}</strong>
                          <span>{schedule.recipient} · {describeScheduleCadence(schedule)}</span>
                          <small>{schedule.department} · {getDeliveryStoreLabel(schedule.storeIds)} · Saved {schedule.savedAt}</small>
                          <button className="pl-widget-action-button" onClick={() => deleteWidgetSchedule(schedule.id)} type="button">Delete</button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-report-delivery-empty">No saved schedules yet.</p>
                  )}
                </section>
              </>
            )}

            <div className="pl-report-delivery-footer">
              <small>
                {deliveryModalMode === "send"
                  ? "Gmail opens as a prefilled draft in a new tab. Browser-downloaded PDFs can be attached there."
                  : "Schedules are stored in the browser profile for now and are ready to be wired into automated delivery later."}
              </small>
              <div className="pl-report-delivery-actions">
                <button className="pl-widget-action-button" onClick={closeWidgetDeliveryModal} type="button">Cancel</button>
                {deliveryModalMode === "send" ? (
                  <button className="pl-widget-action-button is-primary" disabled={isSendingWidgetReport} onClick={() => void sendWidgetReport()} type="button">
                    {isSendingWidgetReport ? "Opening Gmail…" : "Open Gmail Draft"}
                  </button>
                ) : (
                  <button className="pl-widget-action-button is-primary" onClick={saveWidgetSchedule} type="button">Save Schedule</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
