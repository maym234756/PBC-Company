import { useEffect, useMemo, useRef, useState } from "react";

type ChartAccountType = "Asset" | "Liability" | "Equity" | "Income" | "Expense";
type ChartAccountStatus = "Active" | "Inactive";
type ChartAccountTone = "stable" | "attention" | "critical";
type ChartAccountActivityTone = "stable" | "attention" | "neutral";
type ChartAccountDirectPost = "Allowed" | "Restricted";
type ChartAccountPostingMode = "System" | "Manual Review" | "Restricted";
type ChartAccountRiskRating = "Low" | "Medium" | "High";
type ChartAccountSummaryFilterId = "accountsInView" | "needsReview" | "reconciliationsDue" | "directPostRestricted" | "highRisk";
type ChartAccountReconciliationStatus = "Ready" | "Due" | "Blocked" | "Not Scheduled";

interface ChartAccountSourceMap {
  id: string;
  source: string;
  mode: string;
  owner: string;
  lastPosted: string;
  reference: string;
}

interface ChartAccountException {
  id: string;
  label: string;
  detail: string;
  tone: ChartAccountTone;
}

interface ChartAccountActivity {
  id: string;
  label: string;
  detail: string;
  actor: string;
  timeLabel: string;
  tone: ChartAccountActivityTone;
}

interface ChartAccountReconciliation {
  required: boolean;
  cadence: string;
  owner: string;
  lastCompleted: string;
  nextDue: string;
  status: ChartAccountReconciliationStatus;
  reference: string;
  nextStep: string;
}

interface ChartAccountReportingMeta {
  rollupGroup: string;
  financialStatementLine: string;
  riskRating: ChartAccountRiskRating;
}

interface ChartAccountRow {
  id: string;
  accountNumber: string;
  description: string;
  type: ChartAccountType;
  department: string;
  balanceType: "Debit" | "Credit";
  status: ChartAccountStatus;
  controlAccount: string;
  schedule: string;
  summary: string;
  storeScope: string;
  postingMode: ChartAccountPostingMode;
  directPost: ChartAccountDirectPost;
  closeOwner: string;
  reviewCycle: string;
  postingSummary: string;
  notes: string[];
  sourceMaps: ChartAccountSourceMap[];
  exceptions: ChartAccountException[];
  activity: ChartAccountActivity[];
  reconciliation: ChartAccountReconciliation;
}

function buildSourceMaps(accountId: string, entries: Array<[string, string, string, string, string]>): ChartAccountSourceMap[] {
  return entries.map(([source, mode, owner, lastPosted, reference], index) => ({
    id: `${accountId}-map-${index}`,
    source,
    mode,
    owner,
    lastPosted,
    reference
  }));
}

function buildExceptions(accountId: string, entries: Array<[string, string, ChartAccountTone]>): ChartAccountException[] {
  return entries.map(([label, detail, tone], index) => ({
    id: `${accountId}-exception-${index}`,
    label,
    detail,
    tone
  }));
}

function buildActivities(accountId: string, entries: Array<[string, string, string, string, ChartAccountActivityTone]>): ChartAccountActivity[] {
  return entries.map(([label, detail, actor, timeLabel, tone], index) => ({
    id: `${accountId}-activity-${index}`,
    label,
    detail,
    actor,
    timeLabel,
    tone
  }));
}

const chartAccountRows: ChartAccountRow[] = [
  {
    id: "coa-1000",
    accountNumber: "1000",
    description: "Cash - Operating",
    type: "Asset",
    department: "Corporate",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Bank",
    schedule: "Balance Sheet",
    summary: "Primary operating cash account for retail receipts, ACH disbursements, and bank reconciliation.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Controller",
    reviewCycle: "Daily",
    postingSummary: "Only cashiering, deposit review, and bank rec workflows can release activity into this account.",
    notes: [
      "Cashiering owns the front-end deposit batch and treasury owns final reconciliation.",
      "Manual journal access is limited to approved bank corrections and stale-date cleanup."
    ],
    sourceMaps: buildSourceMaps("coa-1000", [
      ["Deposit batch", "Batch post", "Treasury", "10:51 AM", "DEP-OPER"],
      ["Cash clearing", "Controller release", "Accounting", "9:18 AM", "CLR-1000"]
    ]),
    exceptions: buildExceptions("coa-1000", [["Deposit match open", "Three morning receipts remain unmatched against the bank import.", "attention"]]),
    activity: buildActivities("coa-1000", [
      ["Morning receipts imported", "15 receipts rolled into cash clearing and await final slip match.", "Mason May", "11 min ago", "attention"],
      ["Bank rec checkpoint", "Controller reviewed operating bank activity through 9:42 AM.", "Controller", "46 min ago", "stable"]
    ]),
    reconciliation: {
      required: true,
      cadence: "Daily",
      owner: "Treasury Accountant",
      lastCompleted: "Today 9:42 AM",
      nextDue: "Today 4:00 PM",
      status: "Due",
      reference: "Operating bank rec",
      nextStep: "Match the open deposit slip and release the midday cash batch before close review."
    }
  },
  {
    id: "coa-1010",
    accountNumber: "1010",
    description: "Cash - Flooring",
    type: "Asset",
    department: "Sales",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Bank",
    schedule: "Balance Sheet",
    summary: "Clearing cash account tied to floorplan proceeds, payoff activity, and lender settlements.",
    storeScope: "Multi-store",
    postingMode: "Restricted",
    directPost: "Restricted",
    closeOwner: "Inventory Controller",
    reviewCycle: "Daily",
    postingSummary: "Floorplan payoff, payoff reversals, and lender settlement batches are controller released only.",
    notes: ["Use this account only for lender cash movement and floorplan settlement correction work."],
    sourceMaps: buildSourceMaps("coa-1010", [["Floorplan payoff", "Approval hold", "Inventory Controller", "Yesterday 5:26 PM", "FLR-CASH"]]),
    exceptions: [],
    activity: buildActivities("coa-1010", [["Payoff file posted", "Yesterday's payoff file cleared against lender settlement detail.", "Inventory Controller", "1 h ago", "stable"]]),
    reconciliation: {
      required: true,
      cadence: "Daily",
      owner: "Inventory Controller",
      lastCompleted: "Today 8:15 AM",
      nextDue: "Tomorrow 8:00 AM",
      status: "Ready",
      reference: "Floorplan cash rollforward",
      nextStep: "No open variance. Hold until the next lender settlement run."
    }
  },
  {
    id: "coa-1100",
    accountNumber: "1100",
    description: "Contracts in Transit",
    type: "Asset",
    department: "Sales",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Deal Posting",
    schedule: "CIT",
    summary: "Tracks funded deals between F&I completion and final GL posting release.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Deal Posting Lead",
    reviewCycle: "Daily",
    postingSummary: "Only deal-posting and funding-to-GL queues can move balance in or out of this account.",
    notes: [
      "CIT aging is reviewed every morning before the first posting batch.",
      "Controller sign-off is required before reserve split exceptions are cleared."
    ],
    sourceMaps: buildSourceMaps("coa-1100", [
      ["Deal posting", "Batch post", "F&I Accounting", "8:05 AM", "DP-CIT"],
      ["Funding to GL", "Controller release", "Controller", "Yesterday 4:48 PM", "FUN-CIT"]
    ]),
    exceptions: buildExceptions("coa-1100", [
      ["Funding packet blocked", "Two funded deals are missing reserve splits before GL release.", "critical"],
      ["Aging threshold", "One contract has remained in transit beyond 48 hours.", "attention"]
    ]),
    activity: buildActivities("coa-1100", [
      ["Funding batch paused", "Funding-to-GL batch was paused after reserve split mismatch on worksheet 71492.", "Accounting", "7 min ago", "attention"],
      ["Transit sweep", "Morning CIT sweep found one deal past policy aging.", "Deal Posting Lead", "39 min ago", "attention"]
    ]),
    reconciliation: {
      required: true,
      cadence: "Daily",
      owner: "Deal Posting Lead",
      lastCompleted: "Yesterday 5:05 PM",
      nextDue: "Today 1:00 PM",
      status: "Blocked",
      reference: "CIT rollforward",
      nextStep: "Clear reserve split mapping and age exceptions before today's deal-posting batch is reopened."
    }
  },
  {
    id: "coa-1200",
    accountNumber: "1200",
    description: "Accounts Receivable - Trade",
    type: "Asset",
    department: "Accounting",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "AR",
    schedule: "AR Aging",
    summary: "Trade receivables from customer accounts, warranty claims, and carrier reimbursements.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "AR Lead",
    reviewCycle: "Daily",
    postingSummary: "Cash application, statement batches, and approved write-offs are the only release paths into trade AR.",
    notes: [
      "Aging review is tied to the collections queue and promise-to-pay follow-up.",
      "Warranty remittances should clear through source-specific subledgers before month end."
    ],
    sourceMaps: buildSourceMaps("coa-1200", [
      ["Counter receivables", "Batch post", "AR Team", "9:14 AM", "AR-TRADE"],
      ["Warranty remits", "Batch post", "Warranty Admin", "Yesterday 2:10 PM", "WAR-AR"]
    ]),
    exceptions: buildExceptions("coa-1200", [["Promise follow-up", "Four over-30 balances need finance follow-up before close.", "attention"]]),
    activity: buildActivities("coa-1200", [
      ["Aging packet refreshed", "Collections queue refreshed with latest over-30 and over-60 balances.", "AR Lead", "22 min ago", "neutral"],
      ["Cash application posted", "ACH receipts posted against customer inquiry batch AR-0527A.", "AR Team", "58 min ago", "stable"]
    ]),
    reconciliation: {
      required: true,
      cadence: "Weekly",
      owner: "AR Lead",
      lastCompleted: "Monday 4:20 PM",
      nextDue: "Friday 3:00 PM",
      status: "Due",
      reference: "AR aging tie-out",
      nextStep: "Finish promise-to-pay follow-up and clear the four oldest open balances before Friday review."
    }
  },
  {
    id: "coa-1300",
    accountNumber: "1300",
    description: "Major Unit Inventory",
    type: "Asset",
    department: "Inventory",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Inventory",
    schedule: "Floorplan",
    summary: "Major unit inventory carrying value tied to receiving, transfers, and unit cost relief.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Inventory Controller",
    reviewCycle: "Daily",
    postingSummary: "Receiving, unit transfer, and sold-unit cost relief batches control this balance. Manual entries are controller only.",
    notes: [
      "Any unit cost correction must be paired with floorplan payable and front-end gross validation.",
      "Physical unit counts roll into the floorplan schedule review every Friday."
    ],
    sourceMaps: buildSourceMaps("coa-1300", [
      ["Inventory receiving", "Batch post", "Inventory Admin", "Today 8:32 AM", "INV-RCV"],
      ["Unit cost relief", "Deal posting", "Deal Posting Lead", "Yesterday 6:02 PM", "INV-REL"]
    ]),
    exceptions: buildExceptions("coa-1300", [["Floorplan mismatch", "One aged unit is carrying a cost that no longer matches its lender curtailment schedule.", "critical"]]),
    activity: buildActivities("coa-1300", [
      ["Aged-unit review", "Inventory controller tagged one unit for cost correction before Friday curtailment.", "Inventory Controller", "16 min ago", "attention"],
      ["Receiving batch closed", "Morning receiving batch updated three inbound units and related setup cost.", "Inventory Admin", "1 h ago", "stable"]
    ]),
    reconciliation: {
      required: true,
      cadence: "Daily",
      owner: "Inventory Controller",
      lastCompleted: "Today 8:55 AM",
      nextDue: "Today 2:00 PM",
      status: "Blocked",
      reference: "Floorplan inventory rollforward",
      nextStep: "Correct the aged unit cost mismatch before the next curtailment review and inventory tie-out."
    }
  },
  {
    id: "coa-1310",
    accountNumber: "1310",
    description: "Parts Inventory",
    type: "Asset",
    department: "Parts",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Inventory",
    schedule: "Parts",
    summary: "Stocked parts balance for counter, service, and replenishment inventory.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Parts Manager",
    reviewCycle: "Weekly",
    postingSummary: "Receiving, stock adjustments, and service issue postings are controlled through parts operations workflows.",
    notes: ["Cycle-count adjustments must route through parts control before they hit the ledger."],
    sourceMaps: buildSourceMaps("coa-1310", [
      ["Parts receiving", "Batch post", "Parts Admin", "Today 7:48 AM", "PRT-RCV"],
      ["Service issue", "RO close", "Service Accounting", "Yesterday 4:56 PM", "PRT-ISS"]
    ]),
    exceptions: [],
    activity: buildActivities("coa-1310", [["Cycle count signed off", "Weekly parts cycle-count variance posted below policy threshold.", "Parts Manager", "2 h ago", "stable"]]),
    reconciliation: {
      required: true,
      cadence: "Weekly",
      owner: "Parts Manager",
      lastCompleted: "Tuesday 6:10 PM",
      nextDue: "Friday 5:00 PM",
      status: "Ready",
      reference: "Parts inventory rollforward",
      nextStep: "No open inventory variance. Next review runs with Friday stock freeze."
    }
  },
  {
    id: "coa-1400",
    accountNumber: "1400",
    description: "Prepaid Expenses",
    type: "Asset",
    department: "Corporate",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Manual",
    schedule: "Prepaids",
    summary: "Prepaid insurance, subscriptions, and other deferred corporate expense balances.",
    storeScope: "Corporate only",
    postingMode: "Manual Review",
    directPost: "Allowed",
    closeOwner: "Senior Accountant",
    reviewCycle: "Month End",
    postingSummary: "This account is manual-review only and every entry should reference a prepaid schedule line.",
    notes: [
      "Amortization journals must reference vendor, coverage window, and remaining balance.",
      "Recurring entries should not bypass the prepaid schedule owner."
    ],
    sourceMaps: buildSourceMaps("coa-1400", [["Recurring journal", "Manual review", "Senior Accountant", "Apr 30", "PREPAID-AMORT"]]),
    exceptions: buildExceptions("coa-1400", [["Amortization lag", "May prepaid amortization has not been posted for two subscription contracts.", "attention"]]),
    activity: buildActivities("coa-1400", [
      ["Schedule refreshed", "Prepaid schedule updated with new software renewal and policy dates.", "Senior Accountant", "Yesterday 3:14 PM", "neutral"],
      ["Recurring journal prepared", "Month-end prepaid amortization journal is staged but not posted.", "Controller", "Yesterday 5:32 PM", "attention"]
    ]),
    reconciliation: {
      required: true,
      cadence: "Month End",
      owner: "Senior Accountant",
      lastCompleted: "Apr 30",
      nextDue: "May 31",
      status: "Due",
      reference: "Prepaid schedule",
      nextStep: "Post May amortization and confirm schedule rollforward before close packet is finalized."
    }
  },
  {
    id: "coa-2000",
    accountNumber: "2000",
    description: "Accounts Payable",
    type: "Liability",
    department: "Accounting",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "AP",
    schedule: "AP Aging",
    summary: "Open vendor liability controlled through AP entry, matching, and check/ACH settlement.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "AP Lead",
    reviewCycle: "Daily",
    postingSummary: "Vendor invoices, check runs, ACH settlement, and approved voids are the only posting paths into AP.",
    notes: ["Invoice holds should resolve in AP before any controller-level true-up is considered."],
    sourceMaps: buildSourceMaps("coa-2000", [
      ["Vendor invoice", "Batch post", "AP Team", "10:05 AM", "AP-ENTRY"],
      ["Check run", "Settlement", "AP Lead", "Yesterday 4:32 PM", "AP-CHECK"]
    ]),
    exceptions: buildExceptions("coa-2000", [["Holdback accrual", "One vendor holdback remains open after the latest payment run.", "attention"]]),
    activity: buildActivities("coa-2000", [
      ["Invoice match review", "AP team reviewed unmatched receiving lines before the noon payment release.", "AP Lead", "33 min ago", "neutral"],
      ["ACH settlement posted", "Morning ACH settlement cleared 18 invoices from yesterday's run.", "AP Team", "1 h ago", "stable"]
    ]),
    reconciliation: {
      required: true,
      cadence: "Weekly",
      owner: "AP Lead",
      lastCompleted: "Monday 5:18 PM",
      nextDue: "Thursday 4:30 PM",
      status: "Due",
      reference: "AP aging tie-out",
      nextStep: "Resolve the holdback accrual before the next AP aging review and payment run."
    }
  },
  {
    id: "coa-2100",
    accountNumber: "2100",
    description: "Floorplan Payable",
    type: "Liability",
    department: "Inventory",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "Floorplan",
    schedule: "Floorplan",
    summary: "Lender liability for financed inventory and related curtailment activity.",
    storeScope: "All stores",
    postingMode: "Restricted",
    directPost: "Restricted",
    closeOwner: "Inventory Controller",
    reviewCycle: "Daily",
    postingSummary: "Receiving, curtailment, payoff, and lender correction files own this balance. Direct journals are disabled.",
    notes: ["Curtailment aging should reconcile to individual unit schedules before the lender sweep window."],
    sourceMaps: buildSourceMaps("coa-2100", [
      ["Lender receiving", "Batch post", "Inventory Admin", "Today 8:32 AM", "FLR-RCV"],
      ["Curtailment sweep", "Settlement", "Inventory Controller", "Yesterday 3:58 PM", "FLR-CURT"]
    ]),
    exceptions: buildExceptions("coa-2100", [["Curtailment due", "Next lender curtailment includes one unit still unresolved in inventory cost relief.", "attention"]]),
    activity: buildActivities("coa-2100", [["Lender file imported", "Today's lender activity was imported and matched to current floorplan balances.", "Inventory Controller", "28 min ago", "stable"]]),
    reconciliation: {
      required: true,
      cadence: "Daily",
      owner: "Inventory Controller",
      lastCompleted: "Today 9:05 AM",
      nextDue: "Today 2:00 PM",
      status: "Due",
      reference: "Floorplan liability schedule",
      nextStep: "Resolve the unit cost relief issue before curtailment sweep is released."
    }
  },
  {
    id: "coa-2200",
    accountNumber: "2200",
    description: "Sales Tax Payable",
    type: "Liability",
    department: "Sales",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "Tax",
    schedule: "Tax",
    summary: "Collected sales tax by jurisdiction, tied to deals, parts invoices, and service invoices.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Controller",
    reviewCycle: "Weekly",
    postingSummary: "Source tax engines and invoice batches own this account. Controller approval is required for any correction entry.",
    notes: [
      "Jurisdiction mapping must stay aligned across sales, parts, and service billing.",
      "Tax filing support is generated from this schedule and should remain audit clean."
    ],
    sourceMaps: buildSourceMaps("coa-2200", [
      ["Deal tax", "Batch post", "F&I Accounting", "Yesterday 6:18 PM", "TAX-DEAL"],
      ["RO and parts tax", "Invoice close", "Ops Accounting", "Today 7:54 AM", "TAX-OPS"]
    ]),
    exceptions: buildExceptions("coa-2200", [["Jurisdiction gap", "One blended county tax code from the service lane is missing its liability mapping.", "critical"]]),
    activity: buildActivities("coa-2200", [
      ["Tax filing prep", "Weekly sales-tax packet generated with one unresolved mapping exception.", "Controller", "18 min ago", "attention"],
      ["Service tax batch posted", "Morning service invoice tax batch posted successfully for all but one county code.", "Ops Accounting", "1 h ago", "stable"]
    ]),
    reconciliation: {
      required: true,
      cadence: "Weekly",
      owner: "Controller",
      lastCompleted: "Friday 5:42 PM",
      nextDue: "Thursday 3:00 PM",
      status: "Blocked",
      reference: "Sales tax filing schedule",
      nextStep: "Resolve the county-code mapping before the tax packet is exported for filing."
    }
  },
  {
    id: "coa-3000",
    accountNumber: "3000",
    description: "Owner Equity",
    type: "Equity",
    department: "Corporate",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "Manual",
    schedule: "Equity",
    summary: "Owner contribution, distribution, and equity reclass account under controller ownership.",
    storeScope: "Corporate only",
    postingMode: "Manual Review",
    directPost: "Allowed",
    closeOwner: "Controller",
    reviewCycle: "Month End",
    postingSummary: "This account is manual-review only and every journal should carry ownership approval documentation.",
    notes: ["Use for approved contribution and distribution entries only."],
    sourceMaps: buildSourceMaps("coa-3000", [["Ownership journal", "Manual review", "Controller", "Apr 30", "EQ-OWNER"]]),
    exceptions: [],
    activity: buildActivities("coa-3000", [["Equity rollforward reviewed", "Controller signed off the April equity rollforward and retained earnings tie-out.", "Controller", "Yesterday 4:40 PM", "stable"]]),
    reconciliation: {
      required: true,
      cadence: "Month End",
      owner: "Controller",
      lastCompleted: "Apr 30",
      nextDue: "May 31",
      status: "Ready",
      reference: "Equity rollforward",
      nextStep: "No open exception. Hold for approved month-end ownership journals only."
    }
  },
  {
    id: "coa-4000",
    accountNumber: "4000",
    description: "New Boat Sales",
    type: "Income",
    department: "Sales",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "Deal Posting",
    schedule: "P&L",
    summary: "Revenue account for new-boat retail deals and related front-end gross release.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Deal Posting Lead",
    reviewCycle: "Daily",
    postingSummary: "Deal-posting batches own this account. Manual revenue journals are not permitted outside controller-approved true-ups.",
    notes: ["Revenue recognition should align with funding and delivery policy before release to the GL."],
    sourceMaps: buildSourceMaps("coa-4000", [["Deal posting", "Batch post", "F&I Accounting", "Today 9:06 AM", "REV-NEW"]]),
    exceptions: buildExceptions("coa-4000", [["Reserve split review", "One delivered deal needs reserve split confirmation before final revenue release.", "attention"]]),
    activity: buildActivities("coa-4000", [
      ["Deal batch staged", "Five delivered deals are staged for the next revenue posting batch.", "F&I Accounting", "12 min ago", "attention"],
      ["Front-end gross released", "Yesterday's new-boat batch posted with no margin overrides.", "Deal Posting Lead", "54 min ago", "stable"]
    ]),
    reconciliation: {
      required: false,
      cadence: "Operational review",
      owner: "Deal Posting Lead",
      lastCompleted: "Today 9:06 AM",
      nextDue: "Next posting batch",
      status: "Not Scheduled",
      reference: "P&L variance review",
      nextStep: "Hold until reserve split review clears and the next deal batch is released."
    }
  },
  {
    id: "coa-4100",
    accountNumber: "4100",
    description: "Used Boat Sales",
    type: "Income",
    department: "Sales",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "Deal Posting",
    schedule: "P&L",
    summary: "Revenue account for used-unit retail and wholesale deal activity.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Used Inventory Manager",
    reviewCycle: "Daily",
    postingSummary: "Used deal jackets and posted wholesale settlements own this revenue line.",
    notes: ["Wholesale and retail used-unit activity should stay separated at the source map level."],
    sourceMaps: buildSourceMaps("coa-4100", [["Used deal posting", "Batch post", "Used Inventory Manager", "Yesterday 5:22 PM", "REV-USED"]]),
    exceptions: [],
    activity: buildActivities("coa-4100", [["Used retail batch posted", "Posted two used retail deals and one wholesale settlement without exceptions.", "Used Inventory Manager", "1 h ago", "stable"]]),
    reconciliation: {
      required: false,
      cadence: "Operational review",
      owner: "Used Inventory Manager",
      lastCompleted: "Yesterday 5:22 PM",
      nextDue: "Next posting batch",
      status: "Not Scheduled",
      reference: "P&L variance review",
      nextStep: "Monitor gross variance against used-unit turn and pricing reports."
    }
  },
  {
    id: "coa-4200",
    accountNumber: "4200",
    description: "Parts Sales",
    type: "Income",
    department: "Parts",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "Parts",
    schedule: "P&L",
    summary: "Retail, internal, and special-order parts revenue account.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Parts Manager",
    reviewCycle: "Daily",
    postingSummary: "Counter tickets, service issue billing, and special-order closeout drive this revenue line.",
    notes: ["Parts gross review should tie back to fill-rate and inventory-turn reporting."],
    sourceMaps: buildSourceMaps("coa-4200", [["Parts counter", "Invoice close", "Parts Admin", "Today 8:24 AM", "REV-PARTS"]]),
    exceptions: [],
    activity: buildActivities("coa-4200", [["Counter invoice batch", "Morning parts counter invoices posted and tied to cashiering without variance.", "Parts Admin", "42 min ago", "stable"]]),
    reconciliation: {
      required: false,
      cadence: "Operational review",
      owner: "Parts Manager",
      lastCompleted: "Today 8:24 AM",
      nextDue: "Next posting batch",
      status: "Not Scheduled",
      reference: "P&L variance review",
      nextStep: "Continue monitoring margin and inventory-turn variance from the parts board."
    }
  },
  {
    id: "coa-4300",
    accountNumber: "4300",
    description: "Service Labor Sales",
    type: "Income",
    department: "Service",
    balanceType: "Credit",
    status: "Active",
    controlAccount: "Repair Orders",
    schedule: "P&L",
    summary: "Service labor revenue for customer-pay, warranty, and rigging labor.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Service Director",
    reviewCycle: "Daily",
    postingSummary: "Closed repair orders, warranty settlements, and approved labor adjustments release into this account.",
    notes: ["Warranty and rigging labor splits should be reviewed before daily service closeout."],
    sourceMaps: buildSourceMaps("coa-4300", [
      ["RO close", "Invoice close", "Service Accounting", "Today 7:54 AM", "REV-SVC"],
      ["Warranty labor", "Batch post", "Warranty Admin", "Yesterday 2:40 PM", "REV-WAR"]
    ]),
    exceptions: buildExceptions("coa-4300", [["Labor split review", "One rigging order posted customer-pay labor that should be split to warranty.", "attention"]]),
    activity: buildActivities("coa-4300", [
      ["RO close batch posted", "Closed seven repair orders into service revenue with one split under review.", "Service Accounting", "26 min ago", "attention"],
      ["Warranty reimbursement received", "Warranty carrier batch posted and cleared three prior labor claims.", "Warranty Admin", "2 h ago", "stable"]
    ]),
    reconciliation: {
      required: false,
      cadence: "Operational review",
      owner: "Service Director",
      lastCompleted: "Today 7:54 AM",
      nextDue: "Next RO close batch",
      status: "Not Scheduled",
      reference: "Service gross review",
      nextStep: "Correct the rigging labor split before the next service gross review."
    }
  },
  {
    id: "coa-5000",
    accountNumber: "5000",
    description: "Cost of Goods Sold - Units",
    type: "Expense",
    department: "Sales",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Deal Posting",
    schedule: "P&L",
    summary: "Cost relief account for sold major units, freight, and prep allocations.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Inventory Controller",
    reviewCycle: "Daily",
    postingSummary: "Unit cost relief is driven from deal posting and receiving corrections only.",
    notes: ["Every sold-unit relief should tie back to inventory and floorplan schedules before close."],
    sourceMaps: buildSourceMaps("coa-5000", [["Unit cost relief", "Deal posting", "Inventory Controller", "Yesterday 6:02 PM", "COGS-UNIT"]]),
    exceptions: buildExceptions("coa-5000", [["Cost relief variance", "One sold unit relieved inventory at an outdated freight allocation.", "attention"]]),
    activity: buildActivities("coa-5000", [["Cost relief exception", "Controller flagged one sold-unit relief for revised prep and freight allocation.", "Inventory Controller", "31 min ago", "attention"]]),
    reconciliation: {
      required: false,
      cadence: "Operational review",
      owner: "Inventory Controller",
      lastCompleted: "Yesterday 6:02 PM",
      nextDue: "Next deal posting batch",
      status: "Not Scheduled",
      reference: "Gross variance review",
      nextStep: "Correct the freight allocation on the flagged unit before the next P&L review."
    }
  },
  {
    id: "coa-5100",
    accountNumber: "5100",
    description: "Cost of Goods Sold - Parts",
    type: "Expense",
    department: "Parts",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Parts",
    schedule: "P&L",
    summary: "Cost relief account for sold parts inventory across retail and internal usage.",
    storeScope: "All stores",
    postingMode: "System",
    directPost: "Restricted",
    closeOwner: "Parts Manager",
    reviewCycle: "Daily",
    postingSummary: "Counter sales, internal service issues, and special-order closeout release cost through the parts workflow.",
    notes: ["Margin variance should be reviewed with parts sales and fill-rate reporting."],
    sourceMaps: buildSourceMaps("coa-5100", [["Parts issue cost", "Invoice close", "Parts Admin", "Today 8:24 AM", "COGS-PARTS"]]),
    exceptions: [],
    activity: buildActivities("coa-5100", [["Daily parts close", "Parts cost relief posted without exception on the morning invoice batch.", "Parts Admin", "42 min ago", "stable"]]),
    reconciliation: {
      required: false,
      cadence: "Operational review",
      owner: "Parts Manager",
      lastCompleted: "Today 8:24 AM",
      nextDue: "Next parts close batch",
      status: "Not Scheduled",
      reference: "P&L margin review",
      nextStep: "No exception. Continue margin review with daily parts close."
    }
  },
  {
    id: "coa-6000",
    accountNumber: "6000",
    description: "Payroll Expense",
    type: "Expense",
    department: "Corporate",
    balanceType: "Debit",
    status: "Active",
    controlAccount: "Payroll",
    schedule: "P&L",
    summary: "Payroll expense for salaried, hourly, commission, and allocated labor costs.",
    storeScope: "All stores",
    postingMode: "Manual Review",
    directPost: "Restricted",
    closeOwner: "Payroll Administrator",
    reviewCycle: "Weekly",
    postingSummary: "Payroll batches flow from the payroll feed, while accrual true-ups remain controller reviewed.",
    notes: [
      "Payroll accruals should reference the current pay period, burden estimate, and reversal date.",
      "Do not bypass payroll feed controls for commissions or benefit allocations."
    ],
    sourceMaps: buildSourceMaps("coa-6000", [
      ["Payroll feed", "Batch post", "Payroll Administrator", "Yesterday 4:12 PM", "PAY-REG"],
      ["Accrual journal", "Manual review", "Controller", "Apr 30", "PAY-ACCRUAL"]
    ]),
    exceptions: buildExceptions("coa-6000", [["Accrual review pending", "Month-end payroll accrual assumptions need controller approval before posting.", "attention"]]),
    activity: buildActivities("coa-6000", [
      ["Payroll batch received", "Regular payroll feed posted for seven stores and is ready for burden review.", "Payroll Administrator", "54 min ago", "stable"],
      ["Accrual draft prepared", "Controller prepared the month-end payroll accrual but has not approved final assumptions.", "Controller", "Yesterday 5:44 PM", "attention"]
    ]),
    reconciliation: {
      required: false,
      cadence: "Weekly review",
      owner: "Payroll Administrator",
      lastCompleted: "Yesterday 4:12 PM",
      nextDue: "Friday 1:00 PM",
      status: "Not Scheduled",
      reference: "Payroll variance review",
      nextStep: "Approve payroll accrual assumptions before the Friday management P&L packet is finalized."
    }
  }
];

const chartAccountTypes: Array<"All" | ChartAccountType> = ["All", "Asset", "Liability", "Equity", "Income", "Expense"];
const chartAccountToolbarActions = ["New", "Edit", "Delete", "Duplicate", "Print", "Export"];
const chartAccountReportingMeta: Record<string, ChartAccountReportingMeta> = {
  "coa-1000": {
    rollupGroup: "1000 Assets > 1010 Cash and Cash Equivalents > 1000 Cash - Operating",
    financialStatementLine: "Balance Sheet / Cash and cash equivalents",
    riskRating: "High"
  },
  "coa-1010": {
    rollupGroup: "1000 Assets > 1010 Cash and Cash Equivalents > 1010 Cash - Flooring",
    financialStatementLine: "Balance Sheet / Restricted and floorplan cash",
    riskRating: "High"
  },
  "coa-1100": {
    rollupGroup: "1000 Assets > 1100 Trade and Finance Receivables > 1100 Contracts in Transit",
    financialStatementLine: "Balance Sheet / Contracts in transit",
    riskRating: "High"
  },
  "coa-1200": {
    rollupGroup: "1000 Assets > 1200 Customer Receivables > 1200 Accounts Receivable - Trade",
    financialStatementLine: "Balance Sheet / Trade accounts receivable",
    riskRating: "Medium"
  },
  "coa-1300": {
    rollupGroup: "1000 Assets > 1300 Inventory > 1300 Major Unit Inventory",
    financialStatementLine: "Balance Sheet / Major unit inventory",
    riskRating: "High"
  },
  "coa-1310": {
    rollupGroup: "1000 Assets > 1300 Inventory > 1310 Parts Inventory",
    financialStatementLine: "Balance Sheet / Parts inventory",
    riskRating: "Medium"
  },
  "coa-1400": {
    rollupGroup: "1000 Assets > 1400 Prepaid and Other Current Assets > 1400 Prepaid Expenses",
    financialStatementLine: "Balance Sheet / Prepaid expenses",
    riskRating: "Low"
  },
  "coa-2000": {
    rollupGroup: "2000 Liabilities > 2000 Current Liabilities > 2000 Accounts Payable",
    financialStatementLine: "Balance Sheet / Accounts payable",
    riskRating: "High"
  },
  "coa-2100": {
    rollupGroup: "2000 Liabilities > 2100 Floorplan Liabilities > 2100 Floorplan Payable",
    financialStatementLine: "Balance Sheet / Floorplan payable",
    riskRating: "High"
  },
  "coa-2200": {
    rollupGroup: "2000 Liabilities > 2200 Accrued and Statutory Liabilities > 2200 Sales Tax Payable",
    financialStatementLine: "Balance Sheet / Sales tax payable",
    riskRating: "Medium"
  },
  "coa-3000": {
    rollupGroup: "3000 Equity > 3000 Owner Capital and Retained Earnings > 3000 Owner Equity",
    financialStatementLine: "Balance Sheet / Owner equity",
    riskRating: "Medium"
  },
  "coa-4000": {
    rollupGroup: "4000 Income > 4000 Unit Sales Revenue > 4000 New Boat Sales",
    financialStatementLine: "P&L / New unit sales",
    riskRating: "Medium"
  },
  "coa-4100": {
    rollupGroup: "4000 Income > 4100 Unit Sales Revenue > 4100 Used Boat Sales",
    financialStatementLine: "P&L / Used unit sales",
    riskRating: "Medium"
  },
  "coa-4200": {
    rollupGroup: "4000 Income > 4200 Parts and Accessories Revenue > 4200 Parts Sales",
    financialStatementLine: "P&L / Parts sales",
    riskRating: "Low"
  },
  "coa-4300": {
    rollupGroup: "4000 Income > 4300 Service and Labor Revenue > 4300 Service Labor Sales",
    financialStatementLine: "P&L / Service labor sales",
    riskRating: "Medium"
  },
  "coa-5000": {
    rollupGroup: "5000 Expense > 5000 Cost of Sales > 5000 Cost of Goods Sold - Units",
    financialStatementLine: "P&L / Cost of goods sold - units",
    riskRating: "Medium"
  },
  "coa-5100": {
    rollupGroup: "5000 Expense > 5000 Cost of Sales > 5100 Cost of Goods Sold - Parts",
    financialStatementLine: "P&L / Cost of goods sold - parts",
    riskRating: "Low"
  },
  "coa-6000": {
    rollupGroup: "6000 Expense > 6000 Operating Expenses > 6000 Payroll Expense",
    financialStatementLine: "P&L / Payroll expense",
    riskRating: "Medium"
  }
};

function getAccountReportingMeta(row: ChartAccountRow): ChartAccountReportingMeta {
  return (
    chartAccountReportingMeta[row.id] ?? {
      rollupGroup: `${row.type} > ${row.controlAccount} > ${row.accountNumber} ${row.description}`,
      financialStatementLine: row.schedule,
      riskRating: "Medium"
    }
  );
}

function hasOpenReviewItem(row: ChartAccountRow) {
  return row.exceptions.length > 0 || row.reconciliation.status === "Due" || row.reconciliation.status === "Blocked";
}

function isHighRisk(row: ChartAccountRow) {
  return getAccountReportingMeta(row).riskRating === "High";
}

function getAccountTone(row: ChartAccountRow): ChartAccountTone {
  if (row.status === "Inactive" || row.reconciliation.status === "Blocked" || row.exceptions.some((item) => item.tone === "critical")) {
    return "critical";
  }

  if (row.exceptions.length > 0 || row.reconciliation.status === "Due") {
    return "attention";
  }

  return "stable";
}

function getPostingTone(postingMode: ChartAccountPostingMode): ChartAccountTone {
  if (postingMode === "Restricted") {
    return "critical";
  }

  if (postingMode === "Manual Review") {
    return "attention";
  }

  return "stable";
}

function getDirectPostTone(directPost: ChartAccountDirectPost): Extract<ChartAccountTone, "stable" | "attention"> {
  return directPost === "Allowed" ? "stable" : "attention";
}

function getDirectPostLabel(directPost: ChartAccountDirectPost) {
  return directPost === "Allowed" ? "Yes" : "No";
}

function getRiskTone(riskRating: ChartAccountRiskRating): ChartAccountTone {
  if (riskRating === "High") {
    return "critical";
  }

  if (riskRating === "Medium") {
    return "attention";
  }

  return "stable";
}

function getWatchLabel(row: ChartAccountRow) {
  if (row.status === "Inactive") {
    return "Inactive";
  }

  if (row.reconciliation.status === "Blocked" || row.exceptions.some((item) => item.tone === "critical")) {
    return "Blocked";
  }

  if (row.exceptions.length > 0) {
    return `${row.exceptions.length} review item${row.exceptions.length === 1 ? "" : "s"}`;
  }

  if (row.reconciliation.status === "Due") {
    return "Reconcile today";
  }

  return "Clear";
}

function matchesSummaryFilter(row: ChartAccountRow, filterId: ChartAccountSummaryFilterId | null) {
  switch (filterId) {
    case "needsReview":
      return hasOpenReviewItem(row);
    case "reconciliationsDue":
      return row.reconciliation.required && (row.reconciliation.status === "Due" || row.reconciliation.status === "Blocked");
    case "directPostRestricted":
      return row.directPost === "Restricted";
    case "highRisk":
      return isHighRisk(row);
    case "accountsInView":
    case null:
      return true;
    default:
      return true;
  }
}

export function ChartOfAccountsWorkspace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | ChartAccountType>("All");
  const [activeSummaryFilter, setActiveSummaryFilter] = useState<ChartAccountSummaryFilterId | null>(null);
  const summaryStripRef = useRef<HTMLDivElement | null>(null);

  const baseRows = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return chartAccountRows.filter((row) => {
      const reportingMeta = getAccountReportingMeta(row);
      const matchesType = typeFilter === "All" || row.type === typeFilter;
      const matchesSearch =
        !normalizedSearchTerm ||
        [
          row.accountNumber,
          row.description,
          reportingMeta.rollupGroup,
          reportingMeta.financialStatementLine,
          reportingMeta.riskRating,
          row.controlAccount,
          row.schedule,
          row.storeScope,
          row.closeOwner,
          row.postingMode,
          getDirectPostLabel(row.directPost),
          row.reconciliation.owner,
          row.reconciliation.reference,
          row.reconciliation.lastCompleted,
          row.reconciliation.nextDue,
          row.summary,
          row.notes.join(" "),
          row.sourceMaps.map((item) => `${item.source} ${item.mode} ${item.owner} ${item.reference}`).join(" "),
          row.exceptions.map((item) => `${item.label} ${item.detail}`).join(" "),
          row.activity.map((item) => `${item.label} ${item.detail} ${item.actor}`).join(" ")
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchTerm);

      return matchesType && matchesSearch;
    });
  }, [searchTerm, typeFilter]);

  const filteredRows = useMemo(
    () => baseRows.filter((row) => matchesSummaryFilter(row, activeSummaryFilter)),
    [activeSummaryFilter, baseRows]
  );

  const summaryCards = useMemo(() => {
    const reviewCount = baseRows.filter(hasOpenReviewItem).length;
    const reconciliationDueCount = baseRows.filter(
      (row) => row.reconciliation.required && (row.reconciliation.status === "Due" || row.reconciliation.status === "Blocked")
    ).length;
    const highRiskCount = baseRows.filter(isHighRisk).length;
    const restrictedDirectPostCount = baseRows.filter((row) => row.directPost === "Restricted").length;

    return [
      {
        id: "accountsInView" as const,
        label: "Accounts in view",
        value: baseRows.length.toString(),
        tone: "neutral" as const
      },
      {
        id: "needsReview" as const,
        label: "Needs review",
        value: reviewCount.toString(),
        tone: reviewCount > 0 ? ("attention" as const) : ("stable" as const)
      },
      {
        id: "reconciliationsDue" as const,
        label: "Reconciliations due",
        value: reconciliationDueCount.toString(),
        tone: reconciliationDueCount > 0 ? ("attention" as const) : ("stable" as const)
      },
      {
        id: "highRisk" as const,
        label: "High risk",
        value: highRiskCount.toString(),
        tone: highRiskCount > 0 ? ("attention" as const) : ("stable" as const)
      },
      {
        id: "directPostRestricted" as const,
        label: "Direct post disabled",
        value: restrictedDirectPostCount.toString(),
        tone: restrictedDirectPostCount > 0 ? ("attention" as const) : ("neutral" as const)
      }
    ];
  }, [baseRows]);

  useEffect(() => {
    if (!activeSummaryFilter) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (summaryStripRef.current?.contains(event.target as Node)) {
        return;
      }

      setActiveSummaryFilter(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeSummaryFilter]);

  function handleSummaryCardSelect(cardId: ChartAccountSummaryFilterId) {
    setActiveSummaryFilter((current) => (current === cardId ? null : cardId));
  }

  return (
    <div className="chart-accounts-shell">
      <div className="chart-accounts-toolbar">
        <div className="chart-accounts-toolbar-actions">
          {chartAccountToolbarActions.map((action) => (
            <button key={action} type="button">
              <span>{action.slice(0, 1)}</span>
              <strong>{action}</strong>
            </button>
          ))}
        </div>
        <div className="chart-accounts-toolbar-title">
          <strong>Chart of Accounts</strong>
          <span>Accounting control center and account governance</span>
        </div>
      </div>

      <div className="chart-accounts-summary-strip" ref={summaryStripRef}>
        {summaryCards.map((card) => (
          <button
            className={`chart-accounts-summary-card tone-${card.tone} ${activeSummaryFilter === card.id ? "is-active" : ""}`}
            key={card.label}
            onClick={() => handleSummaryCardSelect(card.id)}
            type="button"
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </button>
        ))}
      </div>

      <div className="chart-accounts-filter-strip">
        <label>
          <span>Search</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Account number, rollup, statement line, owner, source map..."
            value={searchTerm}
          />
        </label>
        <label>
          <span>Type</span>
          <select onChange={(event) => setTypeFilter(event.target.value as "All" | ChartAccountType)} value={typeFilter}>
            {chartAccountTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <span className="chart-accounts-found">Found: {filteredRows.length}</span>
      </div>

      <div className="chart-accounts-body">
        <div className="chart-accounts-grid-wrap">
          <table className="chart-accounts-grid">
            <thead>
              <tr>
                <th>Account</th>
                <th>Description</th>
                <th>Rollup Group</th>
                <th>Statement Line</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Control</th>
                <th>Close Owner</th>
                <th>Review</th>
                <th>Last Reviewed</th>
                <th>Direct Post</th>
                <th>Next Due</th>
                <th>Posting Method</th>
                <th>Risk</th>
                <th>Watch</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const reportingMeta = getAccountReportingMeta(row);

                return (
                  <tr key={row.id}>
                    <td>{row.accountNumber}</td>
                    <td>{row.description}</td>
                    <td>{reportingMeta.rollupGroup}</td>
                    <td>{reportingMeta.financialStatementLine}</td>
                    <td>{row.type}</td>
                    <td>{row.balanceType}</td>
                    <td>{row.controlAccount}</td>
                    <td>{row.closeOwner}</td>
                    <td>{row.reviewCycle}</td>
                    <td>{row.reconciliation.lastCompleted}</td>
                    <td>
                      <span className={`chart-accounts-chip tone-${getDirectPostTone(row.directPost)}`}>{getDirectPostLabel(row.directPost)}</span>
                    </td>
                    <td>{row.reconciliation.nextDue}</td>
                    <td>
                      <span className={`chart-accounts-chip tone-${getPostingTone(row.postingMode)}`}>{row.postingMode}</span>
                    </td>
                    <td>
                      <span className={`chart-accounts-chip tone-${getRiskTone(reportingMeta.riskRating)}`}>{reportingMeta.riskRating}</span>
                    </td>
                    <td>
                      <span className={`chart-accounts-chip tone-${getAccountTone(row)}`}>{getWatchLabel(row)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
