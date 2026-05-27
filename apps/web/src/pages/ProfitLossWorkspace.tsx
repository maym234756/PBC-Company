import { useEffect, useMemo, useState } from "react";

// ── types ────────────────────────────────────────────────────────────────────
type PLViewMode = "report" | "charts" | "forecast";
type PLChartType = "trend" | "waterfall" | "department";
type PLVarianceMode = "actual" | "priorYear" | "budget";
type PLScenarioId = "current" | "board" | "conservative" | "summerPush";
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
const profitLossGroupOrder: ProfitLossGroup[] = ["Income", "Cost of Sales", "Gross Profit", "Expenses", "Net Income"];

// seasonal multipliers for marine dealership (index 0 = January)
const SEASONAL = [0.63, 0.69, 0.80, 0.91, 1.00, 1.18, 1.42, 1.30, 1.12, 0.95, 0.78, 0.66];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BASE_MONTH_INDEX = 4;
const SNAPSHOT_STORAGE_KEY = "profit-loss-forecast-snapshots-v1";
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
      label: MONTH_SHORT[monthIndex],
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

function buildForecastInsights(baseForecast: MonthlyPoint[], scenarioForecast: MonthlyPoint[], scenario: ForecastScenario, adjustments: ScenarioAdjustments): string[] {
  const peakMonth = scenarioForecast.reduce((best, point) => (point.revenue > best.revenue ? point : best), scenarioForecast[0]);
  const revenueDelta = sumMetric(scenarioForecast, "revenue") - sumMetric(baseForecast, "revenue");
  const netDelta = sumMetric(scenarioForecast, "netIncome") - sumMetric(baseForecast, "netIncome");
  const marginText = `${adjustments.grossMarginBps >= 0 ? "+" : ""}${adjustments.grossMarginBps} bps margin`;
  const expenseText = `${adjustments.expensePct >= 0 ? "+" : ""}${adjustments.expensePct.toFixed(1)}% expense load`;

  return [
    `${scenario.label} keeps focus on ${scenario.summary.toLowerCase()}`,
    `Projected revenue moves ${revenueDelta >= 0 ? "up" : "down"} ${fmtK(Math.abs(revenueDelta))}; peak month is ${peakMonth.label} at ${fmtK(peakMonth.revenue)}.`,
    `Net income ${netDelta >= 0 ? "improves" : "softens"} ${fmtK(Math.abs(netDelta))} versus baseline with ${marginText} and ${expenseText}.`
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

function marginScore(netIncomePct: number): { score: number; label: string; color: string } {
  if (netIncomePct >= 15) return { score: 90, label: "Excellent", color: "#22c55e" };
  if (netIncomePct >= 8) return { score: 70, label: "Healthy", color: "#0d9488" };
  if (netIncomePct >= 3) return { score: 50, label: "Moderate", color: "#f59e0b" };
  if (netIncomePct >= 0) return { score: 30, label: "Low", color: "#f97316" };
  return { score: 10, label: "Loss", color: "#ef4444" };
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
const W = 680, H = 240, PAD_L = 56, PAD_R = 16, PAD_T = 16, PAD_B = 36;
const CW = W - PAD_L - PAD_R;
const CH = H - PAD_T - PAD_B;

// ── TrendChart ────────────────────────────────────────────────────────────────
interface TrendChartProps { history: MonthlyPoint[]; forecast: MonthlyPoint[] }

function TrendChart({ history, forecast }: TrendChartProps) {
  const combined = [...history, ...forecast];
  const maxRev = Math.max(...combined.map((p) => p.revenue));
  const minNI = Math.min(...combined.map((p) => p.netIncome));
  const xv = (i: number) => PAD_L + lerp(i, 0, combined.length - 1, 0, CW);
  const yv = (v: number) => PAD_T + lerp(v, minNI, maxRev, CH, 0);
  const revPts = combined.map<[number, number]>((p, i) => [xv(i), yv(p.revenue)]);
  const gpPts = combined.map<[number, number]>((p, i) => [xv(i), yv(p.grossProfit)]);
  const niPts = combined.map<[number, number]>((p, i) => [xv(i), yv(p.netIncome)]);
  const divX = xv(history.length - 0.5);
  const yTicks = 4;
  const yStep = (maxRev - minNI) / yTicks;

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
      {combined.map((p, i) => i % 2 === 0 ? (
        <text key={i} x={xv(i)} y={H - 6} textAnchor="middle" className="pl-chart-xa">{p.label}</text>
      ) : null)}
      <g transform={`translate(${PAD_L},${H - 8})`}>
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
      {bars.map((bar, i) => {
        const x = PAD_L + i * barW + gap / 2;
        const w = barW - gap;
        const y1 = yv(Math.max(bar.start, bar.end));
        const y2 = yv(Math.min(bar.start, bar.end));
        const nextBar = bars[i + 1];
        return (
          <g key={bar.label}>
            <rect x={x} y={y1} width={w} height={Math.max(y2 - y1, 2)} fill={fillMap[bar.type]} rx="2" opacity="0.85" />
            <text x={x + w / 2} y={y1 - 4} textAnchor="middle" className="pl-chart-xa" fontSize="9">{fmtK(bar.end)}</text>
            <text x={x + w / 2} y={H - 6} textAnchor="middle" className="pl-chart-xa">{bar.label}</text>
            {nextBar && (
              <line x1={x + w} y1={yv(bar.end)} x2={PAD_L + (i + 1) * barW + gap / 2} y2={yv(bar.end)} stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,2" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── DeptChart (stacked bars) ──────────────────────────────────────────────────
interface DeptChartProps { data: DeptPoint[] }

function DeptChart({ data }: DeptChartProps) {
  const totals = data.map((d) => d.sales + d.parts + d.service);
  const maxV = Math.max(...totals);
  const barW = Math.floor(CW / data.length);
  const gap = 10;
  const yv = (v: number) => PAD_T + lerp(v, 0, maxV, CH, 0);
  const colors = { sales: "#3b82f6", parts: "#a855f7", service: "#22c55e" };

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
      {data.map((d, i) => {
        const x = PAD_L + i * barW + gap / 2;
        const w = barW - gap;
        const total = d.sales + d.parts + d.service;
        const layers = [{ key: "sales" as const, value: d.sales }, { key: "parts" as const, value: d.parts }, { key: "service" as const, value: d.service }];
        let cumulative = 0;
        return (
          <g key={d.label}>
            {layers.map(({ key, value }) => {
              const y1 = yv(cumulative + value);
              const y2 = yv(cumulative);
              cumulative += value;
              return <rect key={key} x={x} y={y1} width={w} height={Math.max(y2 - y1, 2)} fill={colors[key]} opacity="0.85" rx="1" />;
            })}
            <text x={x + w / 2} y={yv(total) - 4} textAnchor="middle" className="pl-chart-xa" fontSize="9">{fmtK(total)}</text>
            <text x={x + w / 2} y={H - 6} textAnchor="middle" className="pl-chart-xa">{d.label}</text>
          </g>
        );
      })}
      <g transform={`translate(${PAD_L},${H - 8})`}>
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

// ── Margin Score Ring ─────────────────────────────────────────────────────────
interface MarginScoreRingProps { score: number; label: string; pct: number }

function MarginScoreRing({ score, label, pct }: MarginScoreRingProps) {
  const r = 12, cx = 15, cy = 15;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className={`pl-score-ring-wrap is-${label.toLowerCase()}`} title={`Margin Score: ${score} — ${label}`}>
      <svg width={30} height={30} viewBox="0 0 30 30">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">{pct.toFixed(0)}%</text>
      </svg>
      <span>{label}</span>
    </div>
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
  const [chartType, setChartType] = useState<PLChartType>("trend");
  const [showCommentary, setShowCommentary] = useState(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState<PLScenarioId>("current");
  const [revenueLiftPct, setRevenueLiftPct] = useState(0);
  const [marginShiftBps, setMarginShiftBps] = useState(0);
  const [expenseShiftPct, setExpenseShiftPct] = useState(0);
  const [savedSnapshots, setSavedSnapshots] = useState<ForecastSnapshotRecord[]>(() => loadForecastSnapshots());

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
  const netMarginPct = revenue > 0 ? (netIncome / revenue) * 100 : 0;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const score = useMemo(() => marginScore(netMarginPct), [netMarginPct]);
  const anomalies = useMemo(() => anomalyMap(statementLines), [statementLines]);
  const baselineForecast = useMemo(() => buildForecast(scopedHistoryData, { revenuePct: 0, grossMarginBps: 0, expensePct: 0 }, selectedMonthIndex, selectedYearNumber), [scopedHistoryData, selectedMonthIndex, selectedYearNumber]);
  const forecast = useMemo(() => buildForecast(scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber), [scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber]);
  const commentary = useMemo(() => buildCommentary(statementLines, selectedMonth, anomalies), [statementLines, selectedMonth, anomalies]);
  const variancePulseRows = useMemo(() => buildVariancePulseRows(statementLines), [statementLines]);
  const scenarioBridge = useMemo(() => buildScenarioBridge(scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber), [scopedHistoryData, scenarioAdjustments, selectedMonthIndex, selectedYearNumber]);
  const forecastInsights = useMemo(() => buildForecastInsights(baselineForecast, forecast, activeScenario, scenarioAdjustments), [activeScenario, baselineForecast, forecast, scenarioAdjustments]);
  const forecastConfidence = useMemo(() => getForecastConfidence(scenarioAdjustments), [scenarioAdjustments]);

  const priorRevenue = statementLines.find((line) => line.group === "Income" && line.isTotal)?.priorYear ?? getPriorYearAmount(revenue);
  const priorGrossProfit = statementLines.find((line) => line.group === "Gross Profit" && line.isTotal)?.priorYear ?? getPriorYearAmount(grossProfit);
  const priorNetIncome = statementLines.find((line) => line.group === "Net Income" && line.isTotal)?.priorYear ?? getPriorYearAmount(netIncome);
  const priorExpenses = statementLines.find((line) => line.group === "Expenses" && line.isTotal)?.priorYear ?? getPriorYearAmount(expenses);
  const selectedAccountLine = selectedAccount?.account ? statementLines.find((line) => line.account === selectedAccount.account) ?? null : null;

  useEffect(() => {
    persistForecastSnapshots(savedSnapshots);
  }, [savedSnapshots]);

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

  return (
    <div className="profit-loss-shell is-compact">
      {/* title bar */}
      <div className="profit-loss-title-bar">
        <div className="pl-title-left">
          <strong>Profit and Loss Statement</strong>
          <MarginScoreRing score={score.score} label={score.label} pct={netMarginPct} />
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

      {/* ── CHARTS VIEW ── */}
      {viewMode === "charts" && (
        <div className="pl-charts-view">
          <div className="pl-chart-type-tabs">
            {(["trend", "waterfall", "department"] as PLChartType[]).map((ct) => (
              <button key={ct} type="button" className={chartType === ct ? "is-active" : ""} onClick={() => setChartType(ct)}>
                {ct === "trend" ? "Trend" : ct === "waterfall" ? "Waterfall" : "Department"}
              </button>
            ))}
          </div>
          <div className="pl-chart-frame">
            {chartType === "trend" && <TrendChart history={scopedHistoryData} forecast={forecast} />}
            {chartType === "waterfall" && <WaterfallChart revenue={revenue} grossProfit={grossProfit} netIncome={netIncome} />}
            {chartType === "department" && <DeptChart data={scopedDeptData} />}
          </div>
        </div>
      )}

      {/* ── FORECAST VIEW ── */}
      {viewMode === "forecast" && (
        <div className="pl-forecast-view">
          <div className="pl-snapshot-board">
            <div className="pl-analysis-header">
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
          </div>
          <div className="pl-scenario-lab">
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
          </div>
          <div className="pl-forecast-summary">
            {[
              { label: "7-Month Revenue", value: fmtK(forecastRevenueTotal), detail: `${activeScenario.label} scenario` },
              { label: "7-Month Net", value: fmtK(forecastNetTotal), detail: `${forecastConfidence.label} · ${forecastConfidence.score}/100` },
              { label: "Peak Month", value: peakForecastMonth.label, detail: fmtK(peakForecastMonth.revenue) }
            ].map((pt) => (
              <div key={pt.label} className="pl-forecast-card">
                <span>{pt.label}</span>
                <strong>{pt.value}</strong>
                <small>{pt.detail}</small>
              </div>
            ))}
          </div>
          <div className="pl-forecast-insight">
            {forecastInsights.map((line) => <p key={line}>{line}</p>)}
          </div>
          <div className="pl-chart-frame">
            <TrendChart history={scopedHistoryData} forecast={forecast} />
          </div>
          <table className="profit-loss-report-table pl-forecast-table">
            <thead>
              <tr><th>Month</th><th>Projected Revenue</th><th>Gross Profit</th><th>Net Income</th></tr>
            </thead>
            <tbody>
              {scopedHistoryData.slice(-3).map((pt) => (
                <tr key={pt.label}><td>{pt.label}</td><td>{fmtK(pt.revenue)}</td><td>{fmtK(pt.grossProfit)}</td><td>{fmtK(pt.netIncome)}</td></tr>
              ))}
              {forecast.map((pt) => (
                <tr key={pt.label} className="is-forecast-row">
                  <td>{pt.label}</td><td>{fmtK(pt.revenue)}</td><td>{fmtK(pt.grossProfit)}</td><td>{fmtK(pt.netIncome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
