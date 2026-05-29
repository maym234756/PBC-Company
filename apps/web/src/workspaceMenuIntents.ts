import type { WorkspaceId } from "./types";

type WorkspaceMenuWorkspaceId = WorkspaceId;

export type ApplicationWorkspaceToolsSectionId = "windowControl" | "alertsNotices" | "storeOperations" | "setup";

export interface ApplicationWorkspaceToolsAction {
  detail: string;
  label: string;
  workspaceId: WorkspaceMenuWorkspaceId;
}

export interface ApplicationWorkspaceToolsSection {
  actions: ApplicationWorkspaceToolsAction[];
  id: ApplicationWorkspaceToolsSectionId;
  label: string;
}

export interface ApplicationWorkspaceToolsTarget {
  action: string;
  actionDetail: string;
  sectionId: ApplicationWorkspaceToolsSectionId;
  sectionLabel: string;
  workspaceId: WorkspaceMenuWorkspaceId;
}

export const applicationWorkspaceToolsSections: ApplicationWorkspaceToolsSection[] = [
  {
    id: "windowControl",
    label: "Window Control",
    actions: [
      { label: "Pinned Windows", detail: "Open Windows rail", workspaceId: "desktop" },
      { label: "Window Layout Presets", detail: "Saved desktop dashboards", workspaceId: "desktop" },
      { label: "Workspace Reset", detail: "Desktop layout reset", workspaceId: "desktop" }
    ]
  },
  {
    id: "alertsNotices",
    label: "Alerts & Notices",
    actions: [
      { label: "Notifications", detail: "Recent operator activity", workspaceId: "desktop" },
      { label: "Follow-Up Prompts", detail: "Work that needs attention", workspaceId: "desktop" },
      { label: "Exception Inbox", detail: "Audit-side exception review", workspaceId: "audit" }
    ]
  },
  {
    id: "storeOperations",
    label: "Store Operations",
    actions: [
      { label: "Store Summary", detail: "Store KPI snapshot", workspaceId: "desktop" },
      { label: "Store Roster", detail: "Active operator roster", workspaceId: "desktop" },
      { label: "Shift Notes", detail: "Recent handoff notes", workspaceId: "desktop" }
    ]
  },
  {
    id: "setup",
    label: "Setup",
    actions: [
      { label: "Preferences", detail: "Operator workspace preferences", workspaceId: "desktop" },
      { label: "Personal Shortcuts", detail: "Quick launch coverage", workspaceId: "desktop" },
      { label: "Quick Launch Setup", detail: "Launch strip readiness", workspaceId: "desktop" }
    ]
  }
];

export function resolveApplicationWorkspaceToolsTarget(item: string): ApplicationWorkspaceToolsTarget | null {
  for (const section of applicationWorkspaceToolsSections) {
    const action = section.actions.find((candidate) => candidate.label === item);

    if (action) {
      return {
        action: action.label,
        actionDetail: action.detail,
        sectionId: section.id,
        sectionLabel: section.label,
        workspaceId: action.workspaceId
      };
    }
  }

  return null;
}

export type WorkflowPresentationOverrides = {
  commandLabel?: string;
  description?: string;
  primaryActionLabel?: string;
  submitAction?: string;
  title?: string;
};

export type WorkspaceMenuIntent = {
  workspaceId: WorkspaceMenuWorkspaceId;
  tool: string;
  notice: string;
  initialValues?: Record<string, string>;
  workflowOverrides?: WorkflowPresentationOverrides;
};

function createWorkspaceMenuIntent(
  workspaceId: WorkspaceMenuWorkspaceId,
  item: string,
  tool: string,
  config: {
    description: string;
    notice: string;
    primaryActionLabel: string;
    submitAction?: string;
    title?: string;
    initialValues?: Record<string, string>;
  }
): WorkspaceMenuIntent {
  return {
    workspaceId,
    tool,
    notice: config.notice,
    initialValues: config.initialValues,
    workflowOverrides: {
      commandLabel: item,
      description: config.description,
      primaryActionLabel: config.primaryActionLabel,
      submitAction: config.submitAction ?? tool,
      title: config.title ?? item
    }
  };
}

function createAliasedWorkspaceMenuIntent(
  workspaceId: WorkspaceMenuWorkspaceId,
  item: string,
  tool: string,
  submitActionPrefix: string,
  config: {
    description: string;
    notice: string;
    primaryActionLabel: string;
    title?: string;
    initialValues?: Record<string, string>;
  }
): WorkspaceMenuIntent {
  return createWorkspaceMenuIntent(workspaceId, item, tool, {
    ...config,
    submitAction: `${submitActionPrefix} ${item}`
  });
}

export function resolveManagementMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Favorite Executive Board":
      return createWorkspaceMenuIntent("analytics", item, "Management Forecast", {
        title: "Executive Board Recall",
        description: "Pull the preferred executive board packet for leadership review.",
        notice: "Favorite executive board ready.",
        primaryActionLabel: "Open Executive View",
        initialValues: {
          window: "90 Days",
          forecastFocus: "Executive board",
          note: item
        }
      });
    case "Forecast Snapshot":
      return createWorkspaceMenuIntent("analytics", item, "Management Forecast", {
        description: "Stage the executive forecast packet around the current store posture.",
        notice: "Forecast snapshot ready.",
        primaryActionLabel: "Run Snapshot",
        initialValues: {
          window: "60 Days",
          forecastFocus: "Store posture",
          note: item
        }
      });
    case "Daily Scorecard":
      return createWorkspaceMenuIntent("analytics", item, "Management Forecast", {
        description: "Build the short-window scorecard leadership uses to open the day.",
        notice: "Daily scorecard ready.",
        primaryActionLabel: "Build Scorecard",
        initialValues: {
          window: "30 Days",
          forecastFocus: "Daily scorecard",
          note: item
        }
      });
    case "Favorite Forecast":
      return createWorkspaceMenuIntent("analytics", item, "Management Forecast", {
        description: "Load the saved forecast view used in recurring leadership reviews.",
        notice: "Favorite forecast ready.",
        primaryActionLabel: "Load Favorite",
        initialValues: {
          window: "60 Days",
          forecastFocus: "Pipeline pressure",
          note: item
        }
      });
    case "Exception Monitor":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Queue a leadership exception sweep across active operational blockers.",
        notice: "Exception monitor ready.",
        primaryActionLabel: "Run Monitor",
        initialValues: {
          threshold: "All open",
          owner: "Leadership",
          escalation: "Leadership"
        }
      });
    case "Margin Risk Board":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Surface margin pressure before quotes and deals slip.",
        notice: "Margin risk board ready.",
        primaryActionLabel: "Open Margin Risk",
        initialValues: {
          threshold: "High urgency",
          owner: "Sales Desk",
          escalation: "Sales Desk"
        }
      });
    case "Cash Pulse":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Stage the cash blocker review for immediate follow-up.",
        notice: "Cash pulse ready.",
        primaryActionLabel: "Run Cash Pulse",
        initialValues: {
          threshold: "Financial blockers",
          owner: "Controller",
          escalation: "Controller"
        }
      });
    case "Funding Alerts":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Queue funding blockers that need desk and lender attention.",
        notice: "Funding alerts ready.",
        primaryActionLabel: "Open Funding Alerts",
        initialValues: {
          threshold: "Funding blockers",
          owner: "F&I",
          escalation: "F&I"
        }
      });
    case "Favorite Exception Watch":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Load the saved leadership exception watch.",
        notice: "Favorite exception watch ready.",
        primaryActionLabel: "Load Favorite",
        initialValues: {
          threshold: "All open",
          owner: "Leadership",
          escalation: "Leadership"
        }
      });
    case "Favorite Funding Alerts":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Load the funding blocker watchlist used by leadership.",
        notice: "Favorite funding alerts ready.",
        primaryActionLabel: "Load Favorite",
        initialValues: {
          threshold: "Funding blockers",
          owner: "F&I",
          escalation: "F&I"
        }
      });
    case "Deal Funding Watch":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Track funding blockers that are slowing deals to close.",
        notice: "Deal funding watch ready.",
        primaryActionLabel: "Open Funding Watch",
        initialValues: {
          threshold: "Funding blockers",
          owner: "F&I",
          escalation: "F&I"
        }
      });
    case "Promise Date Watch":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Highlight repair orders at risk of missing promise dates.",
        notice: "Promise date watch ready.",
        primaryActionLabel: "Run Promise Watch",
        initialValues: {
          threshold: "Promise date risk",
          owner: "Service",
          escalation: "Service"
        }
      });
    case "Backorder Risk":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Queue supply blockers that threaten parts fulfillment.",
        notice: "Backorder risk ready.",
        primaryActionLabel: "Open Backorder Risk",
        initialValues: {
          threshold: "Backorder risk",
          owner: "Parts",
          escalation: "Parts"
        }
      });
    case "Payroll Review":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Stage payroll exceptions for management review before closeout.",
        notice: "Payroll review ready.",
        primaryActionLabel: "Run Payroll Audit",
        initialValues: {
          threshold: "Time clock exceptions",
          owner: "Payroll & People",
          escalation: "Payroll & People"
        }
      });
    case "Time Clock Exceptions":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Open the time clock exception pass for missing or mismatched punches.",
        notice: "Time clock exceptions ready.",
        primaryActionLabel: "Review Exceptions",
        initialValues: {
          threshold: "Time clock exceptions",
          owner: "Payroll & People",
          escalation: "Payroll & People"
        }
      });
    case "Comp Plan Review":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Check compensation plan variances before payroll is finalized.",
        notice: "Comp plan review ready.",
        primaryActionLabel: "Review Comp Plans",
        initialValues: {
          threshold: "Comp plan variance",
          owner: "Payroll & People",
          escalation: "Payroll & People"
        }
      });
    case "Favorite Payroll Audit":
      return createWorkspaceMenuIntent("analytics", item, "Management Exception Review", {
        description: "Load the saved payroll audit view for recurring review.",
        notice: "Favorite payroll audit ready.",
        primaryActionLabel: "Load Favorite",
        initialValues: {
          threshold: "Time clock exceptions",
          owner: "Payroll & People",
          escalation: "Payroll & People"
        }
      });
    case "Cross-Store View":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Compare stores across the live leadership lane that needs attention.",
        notice: "Cross-store view ready.",
        primaryActionLabel: "Stage Comparison",
        initialValues: {
          focus: "Service backlog",
          timeframe: "30 Days"
        }
      });
    case "Store Scorecards":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Open store scorecards around deal pace and execution quality.",
        notice: "Store scorecards ready.",
        primaryActionLabel: "Open Scorecards",
        initialValues: {
          focus: "Deal velocity",
          timeframe: "MTD"
        }
      });
    case "Benchmark Queue":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Queue the benchmark lane used for group-level comparison.",
        notice: "Benchmark queue ready.",
        primaryActionLabel: "Open Benchmark Queue",
        initialValues: {
          focus: "Funding cadence",
          timeframe: "30 Days"
        }
      });
    case "Action Tracker":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Stage the cross-store action tracker for website and ops follow-up.",
        notice: "Action tracker ready.",
        primaryActionLabel: "Open Action Tracker",
        initialValues: {
          focus: "Website feed",
          timeframe: "7 Days"
        }
      });
    case "Favorite Cross-Store Compare":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Load the saved cross-store comparison board.",
        notice: "Favorite cross-store compare ready.",
        primaryActionLabel: "Load Favorite",
        initialValues: {
          focus: "Service backlog",
          timeframe: "30 Days"
        }
      });
    case "Sales Activity":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        title: "Sales Activity Pulse",
        description: "Compare sales pace, lead velocity, and desk throughput across stores.",
        notice: "Sales activity ready.",
        primaryActionLabel: "Open Sales Pulse",
        initialValues: {
          focus: "Deal velocity",
          timeframe: "30 Days"
        }
      });
    case "Lead Response Monitor":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Compare lead response posture across stores and teams.",
        notice: "Lead response monitor ready.",
        primaryActionLabel: "Open Response Monitor",
        initialValues: {
          focus: "Lead response",
          timeframe: "7 Days"
        }
      });
    case "Delivery Readiness":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Surface sold-not-delivered readiness across active stores.",
        notice: "Delivery readiness ready.",
        primaryActionLabel: "Open Delivery Readiness",
        initialValues: {
          focus: "Delivery readiness",
          timeframe: "30 Days"
        }
      });
    case "Service Throughput":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Compare service backlog and closeout posture across stores.",
        notice: "Service throughput ready.",
        primaryActionLabel: "Open Throughput View",
        initialValues: {
          focus: "Service backlog",
          timeframe: "30 Days"
        }
      });
    case "Parts Fill Rate":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Compare parts fill-rate pressure across the group.",
        notice: "Parts fill rate ready.",
        primaryActionLabel: "Open Fill Rate View",
        initialValues: {
          focus: "Parts fill rate",
          timeframe: "30 Days"
        }
      });
    case "Staffing Coverage":
      return createWorkspaceMenuIntent("analytics", item, "Management Cross-Store Review", {
        description: "Compare staffing coverage pressure across stores and departments.",
        notice: "Staffing coverage ready.",
        primaryActionLabel: "Compare Coverage",
        initialValues: {
          focus: "Staffing coverage",
          timeframe: "MTD"
        }
      });
    case "Website Activity":
      return null;
    case "Lead Handoff Monitor":
      return createWorkspaceMenuIntent("website", item, "Management Lead Handoff", {
        description: "Run the lead handoff check between website queues and store teams.",
        notice: "Lead handoff monitor ready.",
        primaryActionLabel: "Queue Handoff Check",
        submitAction: "Lead Sync",
        initialValues: {
          lane: "Sales only",
          owner: "BDC",
          responseWindow: "30 Minutes"
        }
      });
    case "Campaign Response":
      return createWorkspaceMenuIntent("website", item, "Management Digital Queue", {
        description: "Open the campaign response queue for digital follow-up.",
        notice: "Campaign response ready.",
        primaryActionLabel: "Open Response Queue",
        submitAction: "Open Queue",
        initialValues: {
          queueName: "Campaign Response",
          assignee: "Digital Ops",
          priority: "High"
        }
      });
    case "Reputation Watch":
      return createWorkspaceMenuIntent("website", item, "Management Digital Queue", {
        description: "Open the reputation queue for review and response follow-up.",
        notice: "Reputation watch ready.",
        primaryActionLabel: "Open Reputation Queue",
        submitAction: "Open Queue",
        initialValues: {
          queueName: "Reputation",
          assignee: "Brand Team",
          priority: "High"
        }
      });
    case "Favorite Website Pulse":
      return createWorkspaceMenuIntent("website", item, "Management Website Pulse", {
        title: "Website Pulse",
        description: "Load the saved website pulse for the latest merchandising changes.",
        notice: "Favorite website pulse ready.",
        primaryActionLabel: "Load Pulse",
        submitAction: "Publish Feed",
        initialValues: {
          window: "Recent changes",
          pulseType: "Inventory freshness",
          note: item
        }
      });
    case "Policy Exceptions":
      return createWorkspaceMenuIntent("audit", item, "Management Policy Audit", {
        description: "Stage a policy exception review in the audit trail.",
        notice: "Policy exceptions ready.",
        primaryActionLabel: "Queue Review",
        initialValues: {
          summary: item,
          owner: "Operations",
          note: "Management Activity"
        }
      });
    case "Approval Log":
      return createWorkspaceMenuIntent("audit", item, "Management Approval Review", {
        description: "Open the approval log workflow for sign-off review.",
        notice: "Approval log ready.",
        primaryActionLabel: "Open Approval Log",
        initialValues: {
          summary: item,
          approver: "GM",
          note: "Management Activity"
        }
      });
    case "Month-End Readiness":
      return createWorkspaceMenuIntent("audit", item, "Management Close Readiness", {
        description: "Queue the month-end readiness checklist for audit follow-up.",
        notice: "Month-end readiness ready.",
        primaryActionLabel: "Open Close Checklist",
        initialValues: {
          summary: item,
          closingWindow: "Month End",
          note: "Management Activity"
        }
      });
    case "Favorite Approval Log":
      return createWorkspaceMenuIntent("audit", item, "Management Approval Review", {
        title: "Favorite Approval Log",
        description: "Load the saved approval log review workflow.",
        notice: "Favorite approval log ready.",
        primaryActionLabel: "Load Favorite",
        initialValues: {
          summary: item,
          approver: "GM",
          note: "Management Activity"
        }
      });
    default:
      return null;
  }
}

export function resolveReceivablesMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "AR Aging Doc":
      return null;
    case "Customer Inquiry":
    case "Statement Requests":
    case "Promise to Pay":
    case "Credit Hold Review":
    case "Balance Forward Review":
      if (item === "Credit Hold Review") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Inquiry", "Receivables Inquiry", {
          description: "Review credit-hold accounts with customer contact and same-day follow-up already staged.",
          notice: "Credit hold review ready.",
          primaryActionLabel: "Review Credit Hold",
          initialValues: {
            inquiryType: "Credit hold",
            contactChannel: "Email",
            followUp: "Same Day"
          }
        });
      }

      if (item === "Balance Forward Review") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Inquiry", "Receivables Inquiry", {
          description: "Stage a balance-forward review before reissuing statement history.",
          notice: "Balance-forward review ready.",
          primaryActionLabel: "Review Balance Forward",
          initialValues: {
            inquiryType: "Balance forward review",
            contactChannel: "Email",
            followUp: "Next Business Day"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "Receivables Inquiry", {
        description:
          item === "Statement Requests"
            ? "Stage a statement request with channel and follow-up timing in one flow."
            : item === "Promise to Pay"
              ? "Log a payment-promise follow-up with the right contact cadence and owner."
              : "Stage a customer account inquiry with aging and promise detail in one flow.",
        notice:
          item === "Statement Requests"
            ? "Statement request ready."
            : item === "Promise to Pay"
              ? "Promise-to-pay follow-up ready."
              : "Customer inquiry ready.",
        primaryActionLabel:
          item === "Statement Requests" ? "Send Statement" : item === "Promise to Pay" ? "Log Promise" : "Open Inquiry",
        submitAction:
          item === "Statement Requests"
            ? "Receivables Statement Request"
            : item === "Promise to Pay"
              ? "Receivables Promise to Pay"
              : undefined,
        initialValues: {
          inquiryType:
            item === "Statement Requests" ? "Statement request" : item === "Promise to Pay" ? "Payment promise" : "Customer account",
          contactChannel: "Phone",
          followUp: item === "Promise to Pay" ? "Next Business Day" : "Same Day"
        }
      });
    case "Credit Card Batch Payments":
    case "ACH Exceptions":
    case "Chargeback Watch":
    case "Batch Deposit Match":
    case "NSF Watch":
    case "Merchant Reserve Review":
      if (item === "Batch Deposit Match") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Batch", "Receivables Batch", {
          description: "Reconcile card batch totals against posted deposits before settlement closes.",
          notice: "Batch deposit match ready.",
          primaryActionLabel: "Review Match",
          initialValues: {
            batchType: "Credit Card",
            cutoffWindow: "Today",
            settlementStatus: "Needs review"
          }
        });
      }

      if (item === "NSF Watch") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Batch", "Receivables Batch", {
          description: "Review ACH return exposure and next-step handling before the batch rolls forward.",
          notice: "NSF watch ready.",
          primaryActionLabel: "Open NSF Watch",
          initialValues: {
            batchType: "ACH",
            cutoffWindow: "Today",
            settlementStatus: "Held"
          }
        });
      }

      if (item === "Merchant Reserve Review") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Batch", "Receivables Batch", {
          description: "Stage merchant reserve holds and chargeback exposure for receivables review.",
          notice: "Merchant reserve review ready.",
          primaryActionLabel: "Review Reserve",
          initialValues: {
            batchType: "Credit Card",
            cutoffWindow: "MTD",
            settlementStatus: "Held"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "Receivables Batch", {
        description:
          item === "ACH Exceptions"
            ? "Review ACH settlement exceptions before the batch rolls forward."
            : item === "Chargeback Watch"
              ? "Stage chargeback exposure for payment review and follow-up."
              : "Review the credit-card batch before settlement and reconciliation.",
        notice:
          item === "ACH Exceptions"
            ? "ACH exceptions ready."
            : item === "Chargeback Watch"
              ? "Chargeback watch ready."
              : "Credit card batch ready.",
        primaryActionLabel:
          item === "ACH Exceptions" ? "Review Exceptions" : item === "Chargeback Watch" ? "Open Chargebacks" : "Review Batch",
        submitAction:
          item === "ACH Exceptions"
            ? "Receivables ACH Review"
            : item === "Chargeback Watch"
              ? "Receivables Chargeback Watch"
              : undefined,
        initialValues: {
          batchType: item === "ACH Exceptions" ? "ACH" : "Credit Card",
          cutoffWindow: "Today",
          settlementStatus: item === "Chargeback Watch" ? "Needs review" : "Ready to settle"
        }
      });
    case "Collections Queue":
    case "Delinquency Watch":
    case "Follow-Up Notes":
    case "Broken Promise Review":
    case "Dispute Follow-Up":
      if (item === "Broken Promise Review") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Queue", "Receivables Queue", {
          description: "Open broken-payment promises in a priority queue with AR ownership attached.",
          notice: "Broken promise review ready.",
          primaryActionLabel: "Open Broken Promises",
          initialValues: {
            queueName: "Promises to Pay",
            owner: "AR Team",
            priority: "Critical"
          }
        });
      }

      if (item === "Dispute Follow-Up") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Queue", "Receivables Queue", {
          description: "Queue disputed receivables follow-up with the collector owner and next step.",
          notice: "Dispute follow-up ready.",
          primaryActionLabel: "Queue Follow-Up",
          initialValues: {
            queueName: "Disputes",
            owner: "AR Team",
            priority: "High"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "Receivables Queue", {
        description:
          item === "Delinquency Watch"
            ? "Open the delinquency watch with ownership and priority controls."
            : item === "Follow-Up Notes"
              ? "Review receivables follow-up notes with a queue owner and urgency lens."
              : "Open the collections queue with owner and escalation context.",
        notice:
          item === "Delinquency Watch"
            ? "Delinquency watch ready."
            : item === "Follow-Up Notes"
              ? "Follow-up notes queue ready."
              : "Collections queue ready.",
        primaryActionLabel:
          item === "Delinquency Watch" ? "Review Delinquency" : item === "Follow-Up Notes" ? "Open Notes Queue" : "Open Queue",
        submitAction:
          item === "Delinquency Watch"
            ? "Receivables Delinquency Watch"
            : item === "Follow-Up Notes"
              ? "Receivables Follow-Up Review"
              : undefined,
        initialValues: {
          queueName: item === "Follow-Up Notes" ? "Disputes" : "Collections",
          owner: "AR Team",
          priority: "High"
        }
      });
    case "Reports":
    case "Aging Review":
    case "Promise Tracker":
    case "Month-End AR":
    case "Finance Follow-Up":
    case "Write-Off Review":
    case "Broken Promise Summary":
      if (item === "Broken Promise Summary") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "Receivables Report", "Receivables Report", {
          description: "Queue a broken-promise summary with the current aging window and delivery target.",
          notice: "Broken promise summary ready.",
          primaryActionLabel: "Queue Summary",
          initialValues: {
            reportName: "Broken Promise Summary",
            window: "30 Days",
            delivery: "Operator Queue"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "Receivables Report", {
        description:
          item === "Aging Review"
            ? "Queue an aging review with the right window and delivery path."
            : item === "Promise Tracker"
              ? "Stage a promise-tracker packet for AR follow-up."
              : item === "Month-End AR"
                ? "Queue the month-end AR packet with the proper delivery path."
                : item === "Finance Follow-Up"
                  ? "Stage a finance follow-up report for AR handoff and review."
                  : item === "Write-Off Review"
                    ? "Queue the write-off review packet with aging and delivery controls."
                    : "Queue a receivables report with the right aging window and delivery path.",
        notice:
          item === "Aging Review"
            ? "Aging review ready."
            : item === "Promise Tracker"
              ? "Promise tracker ready."
              : item === "Month-End AR"
                ? "Month-end AR ready."
                : item === "Finance Follow-Up"
                  ? "Finance follow-up ready."
                  : item === "Write-Off Review"
                    ? "Write-off review ready."
                    : "Receivables reports ready.",
        primaryActionLabel:
          item === "Aging Review"
            ? "Open Aging Review"
            : item === "Promise Tracker"
              ? "Open Tracker"
              : item === "Month-End AR"
                ? "Queue AR Close"
                : item === "Finance Follow-Up"
                  ? "Queue Follow-Up"
                  : item === "Write-Off Review"
                    ? "Review Write-Offs"
                    : "Queue Report",
        submitAction:
          item === "Aging Review"
            ? "Receivables Aging Review"
            : item === "Promise Tracker"
              ? "Receivables Promise Tracker"
              : item === "Month-End AR"
                ? "Receivables Month End"
                : item === "Finance Follow-Up"
                  ? "Receivables Finance Follow-Up"
                  : item === "Write-Off Review"
                    ? "Receivables Write-Off Review"
                    : undefined,
        initialValues: {
          reportName:
            item === "Promise Tracker"
              ? "Promise Tracking"
              : item === "Finance Follow-Up"
                ? "Collections Productivity"
                : "Aging Summary",
          window: item === "Month-End AR" ? "MTD" : "30 Days",
          delivery: "Operator Queue"
        }
      });
    default:
      return null;
  }
}

export function resolveGeneralLedgerMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Store Summary":
    case "Department P&L":
    case "Flash Report":
    case "Expense Variance":
      if (item === "Expense Variance") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "GL Store Summary", "GL Store Summary", {
          description: "Open the expense-variance view with accounting ownership and the active period in focus.",
          notice: "Expense variance ready.",
          primaryActionLabel: "Open Variance",
          initialValues: {
            period: "MTD",
            summaryLens: "P&L",
            reviewer: "Controller"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "GL Store Summary", {
        description:
          item === "Department P&L"
            ? "Open the department P&L view with period and accounting ownership."
            : item === "Flash Report"
              ? "Stage the flash report for a quick accounting posture check."
              : "Open the store summary with period and variance focus for accounting review.",
        notice: item === "Department P&L" ? "Department P&L ready." : item === "Flash Report" ? "Flash report ready." : "Store summary ready.",
        primaryActionLabel: item === "Flash Report" ? "Open Flash" : "Open Summary",
        submitAction:
          item === "Department P&L" ? "GL Department P&L" : item === "Flash Report" ? "GL Flash Report" : undefined,
        initialValues: {
          period: "MTD",
          summaryLens: item === "Flash Report" ? "Cash" : "P&L",
          reviewer: "Controller"
        }
      });
    case "Deal Posting":
    case "Funding to GL":
    case "Contract-in-Transit":
    case "Funding Exception Review":
      if (item === "Funding Exception Review") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "GL Deal Posting", "GL Deal Posting", {
          description: "Review funding exceptions before deal-posting batches are pushed into GL.",
          notice: "Funding exceptions ready.",
          primaryActionLabel: "Review Exceptions",
          initialValues: {
            postingBatch: "Funding cleared",
            postingDate: "Today",
            approver: "Accounting"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "GL Deal Posting", {
        description:
          item === "Funding to GL"
            ? "Stage funding-cleared deals for GL posting and approval."
            : item === "Contract-in-Transit"
              ? "Queue contract-in-transit items for GL posting review."
              : "Stage a deal-posting batch with posting date and approver context.",
        notice: item === "Funding to GL" ? "Funding-to-GL ready." : item === "Contract-in-Transit" ? "Contract-in-transit ready." : "Deal posting ready.",
        primaryActionLabel: item === "Funding to GL" ? "Post Funding" : item === "Contract-in-Transit" ? "Review Transit" : "Queue Posting",
        submitAction:
          item === "Funding to GL"
            ? "GL Funding Posting"
            : item === "Contract-in-Transit"
              ? "GL Transit Posting"
              : undefined,
        initialValues: {
          postingBatch:
            item === "Funding to GL" ? "Funding cleared" : item === "Contract-in-Transit" ? "Delivered deals" : "Open deals",
          postingDate: "Today",
          approver: "Accounting"
        }
      });
    case "Deposits":
    case "Deposit Exceptions":
    case "Cash Clearing":
    case "Deposit Slip Match":
      if (item === "Deposit Slip Match") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "GL Deposit Review", "GL Deposit Review", {
          description: "Match deposit slips to posted activity before reconciliation moves forward.",
          notice: "Deposit slip match ready.",
          primaryActionLabel: "Match Deposits",
          initialValues: {
            depositSource: "All deposits",
            reviewWindow: "Today",
            varianceFlag: "Open variances"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "GL Deposit Review", {
        description:
          item === "Deposit Exceptions"
            ? "Review deposit exceptions before accounting posts the day."
            : item === "Cash Clearing"
              ? "Stage cash-clearing review with source and variance controls."
              : "Review deposit reconciliation and exceptions before posting.",
        notice: item === "Deposit Exceptions" ? "Deposit exceptions ready." : item === "Cash Clearing" ? "Cash clearing ready." : "Deposit review ready.",
        primaryActionLabel: item === "Cash Clearing" ? "Review Clearing" : "Review Deposits",
        submitAction:
          item === "Deposit Exceptions" ? "GL Deposit Exceptions" : item === "Cash Clearing" ? "GL Cash Clearing" : undefined,
        initialValues: {
          depositSource: item === "Cash Clearing" ? "Sales deposits" : "All deposits",
          reviewWindow: "Today",
          varianceFlag: item === "Deposit Exceptions" ? "Open variances" : "Open variances"
        }
      });
    case "Month End":
    case "Close Checklist":
    case "Accrual Review":
    case "Bank Reconciliation":
    case "Schedule Review":
    case "Journal Entry Queue":
    case "Trial Balance Review":
    case "Recurring Journal Review":
      if (item === "Trial Balance Review") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "GL Month End", "GL Month End", {
          description: "Stage the trial-balance review with the close owner and current period attached.",
          notice: "Trial balance review ready.",
          primaryActionLabel: "Review Trial Balance",
          initialValues: {
            closeWindow: "Month End",
            checklistOwner: "Controller",
            note: "Trial Balance Review"
          }
        });
      }

      if (item === "Recurring Journal Review") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "GL Month End", "GL Month End", {
          description: "Review recurring journals before they are included in the next close cycle.",
          notice: "Recurring journal review ready.",
          primaryActionLabel: "Review Journals",
          initialValues: {
            closeWindow: "This Week",
            checklistOwner: "Controller",
            note: "Recurring Journal Review"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "GL Month End", {
        description:
          item === "Close Checklist"
            ? "Open the accounting close checklist with owner and timing controls."
            : item === "Accrual Review"
              ? "Stage accrual review for the close window with checklist ownership."
              : item === "Bank Reconciliation"
                ? "Queue bank reconciliation review for the current close window."
                : item === "Schedule Review"
                  ? "Stage balance-sheet schedule review for closeout."
                  : item === "Journal Entry Queue"
                    ? "Open the journal-entry queue for month-end accounting review."
                    : "Stage the month-end checklist with owner and close window controls.",
        notice:
          item === "Close Checklist"
            ? "Close checklist ready."
            : item === "Accrual Review"
              ? "Accrual review ready."
              : item === "Bank Reconciliation"
                ? "Bank reconciliation ready."
                : item === "Schedule Review"
                  ? "Schedule review ready."
                  : item === "Journal Entry Queue"
                    ? "Journal-entry queue ready."
                    : "Month end ready.",
        primaryActionLabel:
          item === "Journal Entry Queue" ? "Open JE Queue" : item === "Bank Reconciliation" ? "Review Bank Recs" : "Open Closeout",
        submitAction:
          item === "Close Checklist"
            ? "GL Close Checklist"
            : item === "Accrual Review"
              ? "GL Accrual Review"
              : item === "Bank Reconciliation"
                ? "GL Bank Reconciliation"
                : item === "Schedule Review"
                  ? "GL Schedule Review"
                  : item === "Journal Entry Queue"
                    ? "GL Journal Entry Queue"
                    : undefined,
        initialValues: {
          closeWindow: item === "Bank Reconciliation" ? "This Week" : "Month End",
          checklistOwner: "Controller",
          note: item
        }
      });
    default:
      return null;
  }
}

export function resolveSystemMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Sandbox":
      return createWorkspaceMenuIntent("website", item, "System Website Feed", {
        description: "Open the website sandbox lane with environment-safe defaults for system validation.",
        notice: "System sandbox ready.",
        primaryActionLabel: "Open Sandbox",
        submitAction: "System Sandbox Review",
        initialValues: {
          window: "Recent changes",
          pulseType: "Sandbox validation",
          note: "Sandbox"
        }
      });
    case "Website Feed":
      return null;
    case "Feed Health":
    case "Lead Form Routing":
    case "Sync Monitor":
    case "Feed Retry Queue":
    case "Lead Retry Queue":
      if (item === "Feed Retry Queue") {
        return createAliasedWorkspaceMenuIntent("website", item, "System Website Feed", "System Website Feed", {
          description: "Open retry-ready website feed publishes with brand and freshness context attached.",
          notice: "Feed retry queue ready.",
          primaryActionLabel: "Open Retry Queue",
          initialValues: {
            window: "Recent changes",
            pulseType: "Inventory freshness",
            note: "Feed Retry Queue"
          }
        });
      }

      if (item === "Lead Retry Queue") {
        return createAliasedWorkspaceMenuIntent("website", item, "System Website Feed", "System Website Feed", {
          description: "Review lead-delivery retries before routing backlog grows across stores.",
          notice: "Lead retry queue ready.",
          primaryActionLabel: "Review Retries",
          initialValues: {
            window: "Recent changes",
            pulseType: "Lead routing",
            note: "Lead Retry Queue"
          }
        });
      }

      return createWorkspaceMenuIntent("website", item, "System Website Feed", {
        description:
          item === "Feed Health"
            ? "Stage a feed-health pass with publishing scope and cadence controls."
            : item === "Lead Form Routing"
              ? "Review lead-form routing through the website system lane."
              : item === "Sync Monitor"
                ? "Open the website sync monitor with feed scope and system context."
                : "Stage a system-driven website feed push with publishing scope and cadence.",
        notice:
          item === "Feed Health"
            ? "Feed health ready."
            : item === "Lead Form Routing"
              ? "Lead form routing ready."
              : item === "Sync Monitor"
                ? "Sync monitor ready."
                : "System website feed ready.",
        primaryActionLabel:
          item === "Lead Form Routing" ? "Review Routing" : item === "Sync Monitor" ? "Open Monitor" : "Queue Feed Push",
        submitAction:
          item === "Feed Health"
            ? "System Feed Health"
            : item === "Lead Form Routing"
              ? "System Lead Routing"
              : item === "Sync Monitor"
                ? "System Sync Monitor"
                : "Publish Feed",
        initialValues: {
          window: "Full inventory",
          pulseType:
            item === "Feed Health" ? "Inventory freshness" : item === "Lead Form Routing" ? "Lead routing" : "Lead routing",
          note: item
        }
      });
    case "Users & Roles":
    case "Permission Changes":
    case "Store Access Matrix":
    case "MFA Reset Queue":
      if (item === "MFA Reset Queue") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "System Access Review", "System Access Review", {
          description: "Queue MFA reset work with security ownership and the current change window already in focus.",
          notice: "MFA reset queue ready.",
          primaryActionLabel: "Open MFA Queue",
          initialValues: {
            roleScope: "All users",
            reviewer: "Security Admin",
            changeWindow: "Today"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "System Access Review", {
        description:
          item === "Permission Changes"
            ? "Review permission changes and operator access from the system lane."
            : item === "Store Access Matrix"
              ? "Open the store-access matrix for a system-level role review."
              : "Review role coverage and operator access from the system command lane.",
        notice:
          item === "Permission Changes"
            ? "Permission changes ready."
            : item === "Store Access Matrix"
              ? "Store access matrix ready."
              : "Users and roles ready.",
        primaryActionLabel: item === "Store Access Matrix" ? "Open Matrix" : "Review Access",
        submitAction:
          item === "Permission Changes"
            ? "System Permission Review"
            : item === "Store Access Matrix"
              ? "System Access Matrix"
              : undefined,
        initialValues: {
          roleScope: item === "Store Access Matrix" ? "All users" : "Store operators",
          reviewer: "System Admin",
          changeWindow: "This Week"
        }
      });
    case "Workflow Rules":
    case "Notification Escalations":
    case "Background Jobs":
    case "Feature Flags":
    case "Environment Review":
    case "API Connectors":
    case "Vendor Endpoints":
    case "Template Library":
    case "Webhook Retry Log":
      if (item === "Webhook Retry Log") {
        return createAliasedWorkspaceMenuIntent("analytics", item, "System Workflow Review", "System Workflow Review", {
          description: "Review webhook retry pressure with automation ownership and publish timing in view.",
          notice: "Webhook retry log ready.",
          primaryActionLabel: "Review Webhooks",
          initialValues: {
            ruleset: "Cross-workspace automations",
            owner: "System Admin",
            publishWindow: "Today"
          }
        });
      }

      return createWorkspaceMenuIntent("analytics", item, "System Workflow Review", {
        description:
          item === "Notification Escalations"
            ? "Review notification escalations with owner and publish timing in one pass."
            : item === "Background Jobs"
              ? "Open the background-job rule set for system review."
              : item === "Feature Flags"
                ? "Review feature flags with owner and release timing controls."
                : item === "Environment Review"
                  ? "Stage the system environment review with rule ownership and release timing."
                  : item === "API Connectors"
                    ? "Review API connector rules and ownership from the system lane."
                    : item === "Vendor Endpoints"
                      ? "Stage vendor endpoint rules and review timing in one pass."
                      : item === "Template Library"
                        ? "Open the template library rules for system review."
                        : "Open workflow rules for review with owner and publish timing in one pass.",
        notice:
          item === "Notification Escalations"
            ? "Notification escalations ready."
            : item === "Background Jobs"
              ? "Background jobs ready."
              : item === "Feature Flags"
                ? "Feature flags ready."
                : item === "Environment Review"
                  ? "Environment review ready."
                  : item === "API Connectors"
                    ? "API connectors ready."
                    : item === "Vendor Endpoints"
                      ? "Vendor endpoints ready."
                      : item === "Template Library"
                        ? "Template library ready."
                        : "Workflow rules ready.",
        primaryActionLabel:
          item === "Background Jobs" ? "Review Jobs" : item === "Feature Flags" ? "Review Flags" : "Review Rules",
        submitAction:
          item === "Notification Escalations"
            ? "System Escalation Review"
            : item === "Background Jobs"
              ? "System Background Job Review"
              : item === "Feature Flags"
                ? "System Feature Flag Review"
                : item === "Environment Review"
                  ? "System Environment Review"
                  : item === "API Connectors"
                    ? "System API Connector Review"
                    : item === "Vendor Endpoints"
                      ? "System Vendor Endpoint Review"
                      : item === "Template Library"
                        ? "System Template Review"
                        : undefined,
        initialValues: {
          ruleset:
            item === "Notification Escalations"
              ? "Escalations"
              : item === "Background Jobs"
                ? "Cross-workspace automations"
                : item === "Feature Flags"
                  ? "Notifications"
                  : item === "Environment Review"
                    ? "Cross-workspace automations"
                    : item === "API Connectors"
                      ? "Cross-workspace automations"
                      : item === "Vendor Endpoints"
                        ? "Cross-workspace automations"
                        : item === "Template Library"
                          ? "Notifications"
                          : "Cross-workspace automations",
          owner: "System Admin",
          publishWindow: "Next release"
        }
      });
    case "Audit Trail":
      return null;
    case "Login Watch":
    case "Policy Change Log":
    case "Password Policy Review":
      if (item === "Password Policy Review") {
        return createAliasedWorkspaceMenuIntent("audit", item, "System Audit Review", "System Audit Review", {
          description: "Review password-policy drift and enforcement notes from the system audit lane.",
          notice: "Password policy review ready.",
          primaryActionLabel: "Open Policy Review",
          initialValues: {
            summary: "Password policy review",
            owner: "Security Admin",
            note: "System"
          }
        });
      }

      return createWorkspaceMenuIntent("audit", item, "System Audit Review", {
        description:
          item === "Login Watch"
            ? "Review login watch entries with a scoped owner and operator note."
            : item === "Policy Change Log"
              ? "Open the policy change log with audit ownership and note context."
              : "Review system-level audit items with a scoped owner and operator note.",
        notice: item === "Login Watch" ? "Login watch ready." : item === "Policy Change Log" ? "Policy change log ready." : "System audit trail ready.",
        primaryActionLabel: item === "Login Watch" ? "Open Login Watch" : "Open Audit Review",
        submitAction: item === "Login Watch" ? "System Login Watch" : item === "Policy Change Log" ? "System Policy Change Review" : undefined,
        initialValues: {
          summary: item === "Login Watch" ? "System login watch" : item === "Policy Change Log" ? "Policy change log" : "System audit trail",
          owner: "System Admin",
          note: item
        }
      });
    default:
      return null;
  }
}

export function resolveCrmMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Communicate":
      return null;
    default:
      return null;
  }
}

export function resolveSalesMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "New Lead":
    case "Showroom Ups":
    case "Phone Ups":
    case "Internet Lead Entry":
      return createAliasedWorkspaceMenuIntent("sales", item, "New Lead", "Sales Lead", {
        description: "Stage lead intake directly from the sales desk with source-aware defaults.",
        notice: `${item} ready.`,
        primaryActionLabel: "Stage Lead",
        initialValues: {
          source:
            item === "Showroom Ups"
              ? "Walk-In"
              : item === "Phone Ups"
                ? "Phone Up"
                : item === "Internet Lead Entry"
                  ? "Website Lead"
                  : "Website Lead"
        }
      });
    case "New Quote":
    case "Payment Quote":
    case "Quote Revisions":
    case "Worksheet Builder":
    case "Pending Quotes":
      return createAliasedWorkspaceMenuIntent("sales", item, "New Quote", "Sales Quote", {
        description: "Open a sales quote worksheet with pricing context and the next desk move ready.",
        notice: `${item} ready.`,
        primaryActionLabel: item === "Pending Quotes" ? "Review Quotes" : "Open Quote",
        initialValues: {
          targetPrice: item === "Payment Quote" ? "$0 down / payment focus" : ""
        }
      });
    case "New Deal":
    case "Deal Jacket Review":
    case "Trade Appraisal Desk":
    case "Sales Deal Jackets":
      return createAliasedWorkspaceMenuIntent("sales", item, "New Deal", "Sales Deal", {
        description: "Stage a deal jacket review with desk-ready customer and unit context.",
        notice: `${item} ready.`,
        primaryActionLabel: item === "Trade Appraisal Desk" ? "Open Appraisal" : "Create Deal"
      });
    case "Take Deposit":
      return createAliasedWorkspaceMenuIntent("sales", item, "Take Deposit", "Sales Deposit", {
        description: "Queue deposit capture without leaving the active sales lane.",
        notice: "Deposit capture ready.",
        primaryActionLabel: "Post Deposit"
      });
    case "Major Unit Inventory":
    case "Major Unit Locator":
    case "Incoming Unit Schedule":
    case "Aged Inventory Watch":
      return createAliasedWorkspaceMenuIntent("sales", item, "Inventory Review", "Sales Inventory", {
        description: "Review inventory availability, aging, and locator context from the sales board.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Inventory View",
        initialValues: {
          view: item
        }
      });
    case "Consumer Promos":
    case "Rebate Matrix":
    case "Email Campaign Queue":
      return createAliasedWorkspaceMenuIntent("sales", item, "Marketing", "Sales Marketing", {
        description: "Launch campaign and promotion work directly from the current sales lane.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Campaign",
        initialValues: {
          campaign: item
        }
      });
    case "Package Builder":
    case "MSRP Override Review":
      return createAliasedWorkspaceMenuIntent("sales", item, "Pricing Review", "Sales Pricing", {
        description: "Stage pricing and promotion review without leaving the desk board.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Pricing Review",
        initialValues: {
          focus: item
        }
      });
    case "Credit Application Queue":
    case "Lender Follow-Up":
    case "Compliance Packet":
      return createAliasedWorkspaceMenuIntent("sales", item, "Finance Review", "Sales Finance", {
        description: "Queue finance, compliance, and lender follow-up work from the active desk lane.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Finance Review",
        initialValues: {
          queue: item
        }
      });
    case "Delivery Checklist":
    case "We Owe Log":
    case "Sold Not Delivered":
    case "Delivery Calendar":
    case "Delivery Packets":
      return createAliasedWorkspaceMenuIntent("sales", item, "Delivery Review", "Sales Delivery", {
        description: "Open sold-unit delivery control with customer and target-date context attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Delivery",
        initialValues: {
          queue: item
        }
      });
    case "Prospect 360":
    case "Duplicate Customer Review":
    case "Lost Prospect Recovery":
    case "Referral Tracker":
    case "Birthday & Anniversary List":
      return createAliasedWorkspaceMenuIntent("sales", item, "Customer Review", "Sales Customer", {
        description: "Review CRM posture and customer follow-up from the current sales lane.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Review",
        initialValues: {
          view: item
        }
      });
    case "Text Follow-Up Board":
    case "Appointment Board":
    case "CRM Call List":
    case "CSI Outreach":
      return createAliasedWorkspaceMenuIntent("sales", item, "Send Message", "Sales Messaging", {
        description: "Stage outbound customer and CRM messaging without leaving the sales board.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Message",
        initialValues: {
          channel:
            item === "Text Follow-Up Board"
              ? "SMS"
              : item === "CSI Outreach"
                ? "Email"
                : "CRM Task"
        }
      });
    case "Favorite Lead Queue":
    case "Favorite Deal Desk":
    case "Favorite Funding Watch":
    case "Favorite Delivery Board":
    case "Favorite Sales Reports":
    case "Favorite Appraisal Log":
    case "Favorite Promotions":
    case "Favorite Sold Board":
      return createAliasedWorkspaceMenuIntent("sales", item, "Sales Favorite View", "Sales Favorite", {
        description: "Recall a saved sales board or favorite workflow with ownership and recall timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Favorite",
        initialValues: {
          favoriteView: item,
          owner: "Sales Desk",
          recallWindow: "Today"
        }
      });
    case "Salesperson Insights":
    case "Lead Source Mix":
    case "Closing Ratio Summary":
    case "Gross Profit Summary":
    case "Custom Sales Reports":
      return createAliasedWorkspaceMenuIntent("sales", item, "Sales Report", "Sales Report", {
        description: "Queue a sales report with the right delivery path and time window.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Report",
        initialValues: {
          reportName: item
        }
      });
    case "Salesperson Assignment":
    case "Lead Source Setup":
      return createAliasedWorkspaceMenuIntent("sales", item, "Sales Desk Setup", "Sales Desk Setup", {
        description: "Review lead-routing and salesperson assignment controls with ownership and rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Setup Review",
        initialValues: {
          setupArea: item,
          owner: "Sales Desk",
          effectiveWindow: "Next release"
        }
      });
    case "Quote Form Layouts":
    case "Deal Status Rules":
      return createAliasedWorkspaceMenuIntent("sales", item, "Sales Workflow Setup", "Sales Workflow Setup", {
        description: "Review quote and desk-workflow controls with rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Workflow Review",
        initialValues: {
          setupArea: item,
          owner: "Sales Desk",
          effectiveWindow: "Next release"
        }
      });
    case "Rate Tables":
    case "Doc Fee Setup":
    case "Menu Template Library":
    case "Compliance Forms":
      return createAliasedWorkspaceMenuIntent("sales", item, "Sales Finance Setup", "Sales Finance Setup", {
        description: "Review finance-control setup with ownership and rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Finance Setup",
        initialValues: {
          setupArea: item,
          owner: "F&I",
          effectiveWindow: "Next release"
        }
      });
    default:
      return null;
  }
}

export function resolveServiceMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Estimate Worksheets":
      return null;
    case "Technician Time Entry":
      return createAliasedWorkspaceMenuIntent("service", item, "Technician Time Entry", "Service Time", {
        description: "Queue technician time entry updates from the current service lane.",
        notice: "Technician time entry ready.",
        primaryActionLabel: "Queue Time Entry"
      });
    case "Warranty Claims":
      return createAliasedWorkspaceMenuIntent("service", item, "Warranty Claims", "Service Claim", {
        description: "Stage a service claim packet with RO, carrier, and claim type context.",
        notice: "Warranty claims ready.",
        primaryActionLabel: "Queue Claim"
      });
    case "Report Queue":
    case "Reports":
    case "Custom Reports":
    case "Labor Sales Summary":
    case "Effective Labor Rate":
    case "Comeback Cost Review":
    case "Sublet Analysis":
    case "Service Promise Board":
    case "Technician Load":
      return createAliasedWorkspaceMenuIntent("service", item, "Report", "Service Report", {
        description: "Queue a service report or board review with the right time window and delivery path.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Report",
        initialValues: {
          reportName: item === "Reports" || item === "Report Queue" ? "Open ROs" : item
        }
      });
    case "Favorite Service Board":
    case "Favorite Dispatch Board":
    case "Favorite Promise Watch":
    case "Favorite Pickup Ready":
    case "Favorite Warranty Board":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Favorite View", "Service Favorite", {
        description: "Recall a saved service board or favorite workflow with ownership and recall timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Favorite",
        initialValues: {
          favoriteView: item,
          owner: "Service Admin",
          recallWindow: "Today"
        }
      });
    case "Check-In Board":
    case "Promise Date Entry":
    case "Pickup Appointment Queue":
    case "Unit Intake Photos":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Intake Review", "Service Intake", {
        description: "Review service intake posture with owner notes and the next customer touch attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Intake Review",
        initialValues: {
          intakeFocus: item,
          owner: "Service Writer",
          note: "Service intake"
        }
      });
    case "Dispatch Board":
    case "Bay Schedule":
    case "Work In Progress":
    case "Promise Date Watch":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Dispatch Review", "Service Dispatch", {
        description: "Open dispatch and promise-date control with ownership and window context.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Dispatch Review",
        initialValues: {
          dispatchView: item,
          owner: "Dispatch",
          window: "Today"
        }
      });
    case "Repair Order Detail":
    case "Job Workbench":
    case "Labor Sessions":
    case "Recommendations Queue":
    case "Detail Review":
    case "Repair Orders":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Workbench Review", "Service Workbench", {
        description: "Stage service workbench review with RO context and operator notes.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Workbench",
        initialValues: {
          workbenchView: item,
          note: "Service workbench"
        }
      });
    case "Final Inspection":
    case "Sea Trial Checklist":
    case "Delivery Prep Queue":
    case "Comeback Watch":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Quality Review", "Service Quality", {
        description: "Queue quality-control follow-up with ownership and note context.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Quality Review",
        initialValues: {
          qualityFocus: item,
          owner: "Shop Foreman",
          note: "Service quality"
        }
      });
    case "Warranty Packets":
    case "Pre-Authorization Queue":
    case "Carrier Submission Queue":
    case "Claim Status Review":
    case "Warranty Receivables":
    case "Deductible Review":
    case "Delayed Claim Watch":
    case "Claim Audit Trail":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Warranty Review", "Service Warranty", {
        description: "Open service warranty review with queue ownership and a current review window.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Warranty Review",
        initialValues: {
          warrantyQueue: item,
          owner: "Warranty",
          reviewWindow: "This Week"
        }
      });
    case "Approval Needed Queue":
    case "Pickup Ready Queue":
    case "Status Update Log":
    case "Promise Risk Alerts":
    case "Follow-Up Callbacks":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Communication Review", "Service Communication", {
        description: "Stage service communication follow-up with the next customer step attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Follow-Up Review",
        initialValues: {
          communicationQueue: item,
          owner: "Service Writer",
          nextStep: "Review"
        }
      });
    case "Labor Rate Setup":
    case "Job Code Library":
    case "Service Writer Assignments":
    case "Print Form Layouts":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Department Setup", "Service Department Setup", {
        description: "Review core service department setup with ownership and rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Setup Review",
        initialValues: {
          setupArea: item,
          owner: "Service Admin",
          effectiveWindow: "Next release"
        }
      });
    case "Approval Limits":
    case "Promise Date Rules":
    case "Warranty Policy Matrix":
    case "Role Access Review":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Policy Setup", "Service Policy Setup", {
        description: "Review service policy controls with ownership and rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Policy Review",
        initialValues: {
          setupArea: item,
          owner: "Service Admin",
          effectiveWindow: "Next release"
        }
      });
    case "Status Rules":
    case "Notification Triggers":
    case "Dispatch Priorities":
    case "Inspection Templates":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Workflow Setup", "Service Workflow Setup", {
        description: "Review service workflow controls with ownership and rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Workflow Review",
        initialValues: {
          setupArea: item,
          owner: "Service Admin",
          effectiveWindow: "Next release"
        }
      });
    case "Capacity Planner":
    case "Bay Availability Matrix":
    case "Loaner Schedule":
    case "Pickup Calendar":
    case "Archive Closed ROs":
    case "Merge Duplicate Units":
    case "Repair Order Renumbering":
    case "Rebuild Search Index":
    case "Export Queue":
    case "Service Data Extracts":
    case "Mobile Tech Sync":
    case "Vendor File Exchange":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Utility Review", "Service Utility", {
        description: "Open service utilities with the right owner and time window for follow-up.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Utility Review",
        initialValues: {
          utilityAction: item,
          owner: "Service Admin",
          window: "Today"
        }
      });
    default:
      return null;
  }
}

export function resolvePartsMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Parts Inventory":
    case "Part Number Lookup":
    case "Secondary Number Lookup":
    case "Description Search":
    case "Cycle Counts":
    case "Bin Location Review":
    case "On-Hand Adjustments":
    case "Stock Status Review":
    case "Price Matrix Review":
    case "Availability Watch":
    case "Substitute Parts":
    case "Stocking Class Review":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Inventory Review", "Parts Inventory", {
        description: "Review parts inventory, lookup, and availability posture from one operator flow.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Inventory Review",
        initialValues: {
          inventoryView: item,
          supplier: "",
          window: "Today"
        }
      });
    case "Ordering":
    case "Purchase Order Queue":
    case "Emergency Buy":
    case "Transfer Requests":
    case "Special Orders":
    case "Backorder Review":
    case "Drop Ship Requests":
    case "Supplier Follow-Up":
    case "Preferred Vendor Matrix":
    case "Vendor Lead Times":
    case "Open Vendor Claims":
    case "Supplier Scorecards":
    case "Parts Purchase Orders":
    case "Special Order Slips":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Purchasing Review", "Parts Purchasing", {
        description: "Open purchasing and vendor follow-up with supplier ownership and due timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Purchasing Review",
        initialValues: {
          purchasingQueue: item,
          supplier: "",
          dueWindow: "Today"
        }
      });
    case "Receiving":
    case "Receipt Match Queue":
    case "Vendor Discrepancies":
    case "Core Tracking":
    case "Vendor Returns":
    case "Warranty Returns":
    case "Return Authorizations":
    case "Damaged Goods Hold":
    case "Packing Slip Variances":
    case "Missing Core Follow-Up":
    case "Freight Damage Review":
    case "Receipt Audit Trail":
    case "Receiving Exceptions":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Receiving Review", "Parts Receiving", {
        description: "Stage receiving, return, and exception-control review with owner and timing context.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Receiving Review",
        initialValues: {
          receivingQueue: item,
          owner: "Receiving",
          window: "Today"
        }
      });
    case "Cashiering":
    case "Counter Sale Entry":
    case "Will Call Queue":
    case "Quote Builder":
    case "Technician Parts Requests":
    case "Open Pick Tickets":
    case "Install Prep Queue":
    case "Service Parts Staging":
    case "Hold Tickets":
    case "Pending Invoice Review":
    case "Counter Closeout":
    case "Refund Approvals":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Counter Review", "Parts Counter", {
        description: "Open counter and ticket-control work with the next operator step attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Counter Review",
        initialValues: {
          counterQueue: item,
          customer: "",
          nextStep: "Review"
        }
      });
    case "Lists":
    case "Bin Labels":
    case "Cycle Count Sheets":
    case "Price Update Queue":
    case "Reports":
    case "Fill Rate Summary":
    case "Lost Sales Report":
    case "Obsolescence Report":
    case "Custom Reports":
    case "Gross Margin Detail":
    case "Return Activity Report":
    case "Vendor Spend Analysis":
    case "Counter Closeout Summary":
    case "Saved Report Sets":
    case "Scheduled Report Runs":
    case "Report Delivery Queue":
    case "Export History":
    case "Parts Fill Rate":
    case "Obsolescence Watch":
    case "Vendor Performance":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Report Review", "Parts Report", {
        description: "Queue parts lists, reporting, and scheduled output with the right delivery path.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Report",
        initialValues: {
          reportName: item,
          window: "30 Days",
          delivery: "Operator Queue"
        }
      });
    case "Favorite PO Queue":
    case "Favorite Receiving Queue":
    case "Favorite Parts Reports":
    case "Favorite Vendor Scorecards":
    case "Favorite Fill Rate View":
    case "Favorite Counter Closeout":
    case "Favorite Parts Board":
    case "Favorite Catalog Sync":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Favorite View", "Parts Favorite", {
        description: "Recall a saved parts board, queue, or shortcut with ownership and recall timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Favorite",
        initialValues: {
          favoriteView: item,
          owner: "Parts Admin",
          recallWindow: "Today"
        }
      });
    case "Vendor Catalog Sync":
    case "Supersession Review":
    case "Kit Assemblies":
    case "Accessory Bundles":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Catalog Setup", "Parts Catalog Setup", {
        description: "Review parts catalog maintenance and accessory bundle setup with rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Setup Review",
        initialValues: {
          setupArea: item,
          owner: "Parts Admin",
          effectiveWindow: "Next release"
        }
      });
    case "Counter Permissions":
    case "Approval Limits":
    case "Parts Overrides":
    case "Role Access Review":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Security Setup", "Parts Security Setup", {
        description: "Review parts security and approval controls with rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Security Review",
        initialValues: {
          setupArea: item,
          owner: "Parts Admin",
          effectiveWindow: "Next release"
        }
      });
    case "Tax & Fee Setup":
    case "Core Charge Table":
    case "Discount Rules":
    case "Print Form Layouts":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Department Setup", "Parts Department Setup", {
        description: "Review parts department setup and pricing controls with rollout timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Department Review",
        initialValues: {
          setupArea: item,
          owner: "Parts Admin",
          effectiveWindow: "Next release"
        }
      });
    case "Barcode Utilities":
    case "Label Reprint Queue":
    case "Bin Label Designer":
    case "Shelf Tag Runs":
    case "Import Staging":
    case "Export Queue":
    case "Vendor File Drops":
    case "Price File Updates":
    case "Archive Closed Tickets":
    case "Purge Temp Holds":
    case "Merge Duplicate Parts":
    case "Rebuild Search Index":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Utility Review", "Parts Utility", {
        description: "Open parts utility and cleanup flows with owner and timing controls.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Utility Review",
        initialValues: {
          utilityAction: item,
          owner: "Parts Admin",
          window: "Today"
        }
      });
    default:
      return null;
  }
}

export function resolveApplicationMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Favorite Audit Trail":
    case "Favorite Desktop":
    case "Favorite Executive Board":
    case "Favorite Parts Board":
    case "Favorite Sales Board":
    case "Favorite Service Board":
    case "Favorite Website Feed":
    case "Estimate Worksheets":
      return null;
    case "Desktop":
    case "Open Windows":
    case "Command Search":
    case "Workspace Overview":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Application Workspace Surface", "Application Surface", {
        description: "Review the desktop surface, launch tools, and open-window shell behavior from one flow.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Surface Review",
        initialValues: {
          surface: item,
          ownerFocus: "Operator",
          note: "Application"
        }
      });
    case "Activity Snapshot":
    case "Search Results":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Application Activity Review", "Application Activity", {
        description: "Review desktop-side operator activity and shared search context without leaving the shell.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Activity Review",
        initialValues: {
          panel: item,
          ownerFocus: "Operator",
          note: "Application"
        }
      });
    case "Pinned Windows":
    case "Workspace Reset":
    case "Window Layout Presets":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Application Window Control", "Application Window", {
        description: "Review window control, reset, and layout behavior from the desktop shell.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Window Review",
        initialValues: {
          layoutAction: item,
          layoutScope: "Desktop",
          note: "Application"
        }
      });
    case "Notifications":
    case "Follow-Up Prompts":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Application Alert Inbox Review", "Application Alert", {
        description: "Review desktop alerts and follow-up prompts with owner and timing context attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Alert Review",
        initialValues: {
          alertView: item,
          ownerFocus: "Operator",
          followUp: "Same Day"
        }
      });
    case "Store Status Board":
    case "Store Summary":
    case "Store Roster":
    case "Shift Notes":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Application Store Operations Review", "Application Store", {
        description: "Review store-level operating posture, roster context, and shift notes from the desktop shell.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Store Review",
        initialValues: {
          storeView: item,
          ownerFocus: "Store leadership",
          window: "Today"
        }
      });
    case "Preferences":
    case "Personal Shortcuts":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Application Personal Setup Review", "Application Setup", {
        description: "Review personal setup and shortcut preferences with operator ownership attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Personal Setup",
        initialValues: {
          setupFocus: item,
          ownerFocus: "Operator",
          note: "Application"
        }
      });
    case "Task Queue Monitor":
      return createWorkspaceMenuIntent("desktop", item, "Application Task Queue Review", {
        description: "Stage a desktop-side review of the operator task queue with scope and owner focus.",
        notice: "Task queue monitor ready.",
        primaryActionLabel: "Open Queue Review",
        initialValues: {
          queueScope: "All workspaces",
          ownerFocus: "Store leadership",
          note: "Application"
        }
      });
    case "Notification Center":
      return createWorkspaceMenuIntent("desktop", item, "Application Notification Review", {
        description: "Open the shared notification center with alert-lane and follow-up controls.",
        notice: "Notification center ready.",
        primaryActionLabel: "Open Notifications",
        initialValues: {
          alertLane: "All alerts",
          ownerFocus: "Operator",
          followUp: "Same Day"
        }
      });
    case "Operator Status Board":
      return createWorkspaceMenuIntent("analytics", item, "Application Operator Status", {
        description: "Review operator posture across teams, shifts, and store ownership in one board.",
        notice: "Operator status board ready.",
        primaryActionLabel: "Open Status Board",
        initialValues: {
          statusScope: "All operators",
          shiftWindow: "Today",
          ownerFocus: "Store leadership"
        }
      });
    case "Exception Logs":
      return createWorkspaceMenuIntent("audit", item, "Application Exception Log Review", {
        description: "Review exception logs with scoped ownership and a current-note trail.",
        notice: "Exception logs ready.",
        primaryActionLabel: "Open Exceptions",
        initialValues: {
          summary: "Operational exceptions",
          owner: "Operations",
          note: "Application"
        }
      });
    case "Workflow Checklists":
      return createWorkspaceMenuIntent("audit", item, "Application Workflow Checklist", {
        description: "Open workflow checklists for operational follow-up and audit-ready notes.",
        notice: "Workflow checklists ready.",
        primaryActionLabel: "Open Checklists",
        initialValues: {
          summary: "Workflow checklists",
          owner: "Operations",
          note: "Application"
        }
      });
    case "Audit Notes":
    case "Exception Inbox":
      return createAliasedWorkspaceMenuIntent("audit", item, "Application Audit Review", "Application Audit", {
        description: "Open audit-side application review with ownership and follow-up notes attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Audit Review",
        initialValues: {
          auditFocus: item,
          owner: "Operations",
          note: "Application"
        }
      });
    case "Executive Snapshot":
      return createAliasedWorkspaceMenuIntent("analytics", item, "Application Executive Snapshot", "Application Executive", {
        description: "Stage an executive application snapshot with reviewer and time-window context.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Snapshot",
        initialValues: {
          snapshotView: item,
          reviewer: "Leadership",
          window: "30 Days"
        }
      });
    case "Cash Pulse":
      return createWorkspaceMenuIntent("analytics", item, "Application Cash Pulse", {
        description: "Stage a cash pulse view with lens, timing, and accounting review controls.",
        notice: "Cash pulse ready.",
        primaryActionLabel: "Open Cash Pulse",
        initialValues: {
          window: "Today",
          cashLens: "Current cash posture",
          reviewer: "Controller"
        }
      });
    case "Store Scorecard":
      return createWorkspaceMenuIntent("analytics", item, "Application Store Scorecard", {
        description: "Open the store scorecard with timeframe and reviewer context for leadership.",
        notice: "Store scorecard ready.",
        primaryActionLabel: "Open Scorecard",
        initialValues: {
          window: "30 Days",
          scorecardFocus: "Store posture",
          reviewer: "Leadership"
        }
      });
    case "Quick Launch Setup":
      return createWorkspaceMenuIntent("desktop", item, "Application Quick Launch Setup", {
        description: "Review quick-launch coverage and lane setup for operators across the store.",
        notice: "Quick launch setup ready.",
        primaryActionLabel: "Review Shortcuts",
        initialValues: {
          shortcutScope: "Store operators",
          launchLane: "Quick Launch",
          note: "Application"
        }
      });
    case "Sales Deal Jackets":
      return createAliasedWorkspaceMenuIntent("sales", item, "New Deal", "Sales Deal", {
        description: "Open the sales deal jacket from Application without dropping out of the shared shell.",
        notice: "Sales deal jackets ready.",
        primaryActionLabel: "Create Deal"
      });
    case "Pending Quotes":
      return createAliasedWorkspaceMenuIntent("sales", item, "New Quote", "Sales Quote", {
        description: "Open the pending quote lane from Application with quote context attached.",
        notice: "Pending quotes ready.",
        primaryActionLabel: "Review Quotes"
      });
    case "Delivery Packets":
      return createAliasedWorkspaceMenuIntent("sales", item, "Delivery Review", "Sales Delivery", {
        description: "Stage delivery packets directly from Application with the delivery queue preselected.",
        notice: "Delivery packets ready.",
        primaryActionLabel: "Queue Delivery",
        initialValues: {
          queue: item
        }
      });
    case "Repair Orders":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Workbench Review", "Service Workbench", {
        description: "Open service documents from Application with workbench review context attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Workbench",
        initialValues: {
          workbenchView: item,
          note: "Application"
        }
      });
    case "Warranty Packets":
      return createAliasedWorkspaceMenuIntent("service", item, "Service Warranty Review", "Service Warranty", {
        description: "Open warranty packet review from Application with owner and window controls.",
        notice: "Warranty packets ready.",
        primaryActionLabel: "Open Warranty Review",
        initialValues: {
          warrantyQueue: item,
          owner: "Warranty",
          reviewWindow: "This Week"
        }
      });
    case "Parts Purchase Orders":
    case "Special Order Slips":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Purchasing Review", "Parts Purchasing", {
        description: "Open purchasing-side parts documents from Application with supplier timing attached.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Purchasing Review",
        initialValues: {
          purchasingQueue: item,
          supplier: "",
          dueWindow: "Today"
        }
      });
    case "Receiving Exceptions":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Receiving Review", "Parts Receiving", {
        description: "Open receiving exception review from Application with owner and timing controls.",
        notice: "Receiving exceptions ready.",
        primaryActionLabel: "Open Receiving Review",
        initialValues: {
          receivingQueue: item,
          owner: "Receiving",
          window: "Today"
        }
      });
    case "Sales Velocity":
    case "Lead Source Mix":
    case "Desk Productivity":
      return createAliasedWorkspaceMenuIntent("sales", item, "Sales Report", "Sales Report", {
        description: "Open sales reporting from Application with the right report and delivery path preselected.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Report",
        initialValues: {
          reportName: item
        }
      });
    case "Service Promise Board":
    case "Technician Load":
    case "Comeback Watch":
      return createAliasedWorkspaceMenuIntent("service", item, "Report", "Service Report", {
        description: "Open service-side reporting from Application with the right board or report in focus.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Report",
        initialValues: {
          reportName: item
        }
      });
    case "Parts Fill Rate":
    case "Obsolescence Watch":
    case "Vendor Performance":
      return createAliasedWorkspaceMenuIntent("parts", item, "Parts Report Review", "Parts Report", {
        description: "Open parts reporting from Application with the selected report or board already in focus.",
        notice: `${item} ready.`,
        primaryActionLabel: "Queue Report",
        initialValues: {
          reportName: item,
          window: "30 Days",
          delivery: "Operator Queue"
        }
      });
    default:
      return null;
  }
}

export function resolveHelpMenuIntent(item: string): WorkspaceMenuIntent | null {
  switch (item) {
    case "Operator Guide":
      return createWorkspaceMenuIntent("desktop", item, "Help Operator Guide", {
        description: "Open the operator guide with audience and note context for the current store.",
        notice: "Operator guide ready.",
        primaryActionLabel: "Open Guide",
        initialValues: {
          guideType: "Operator guide",
          audience: "All operators",
          note: "Quick start"
        }
      });
    case "First Week Plan":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Help Onboarding Checklist", "Help Onboarding Checklist", {
        description: "Stage the first-week ramp plan with audience and onboarding emphasis already attached.",
        notice: "First week plan ready.",
        primaryActionLabel: "Open Ramp Plan",
        initialValues: {
          checklistType: "First week plan",
          audience: "New hire",
          note: "Ramp-up"
        }
      });
    case "New Operator Checklist":
      return createWorkspaceMenuIntent("desktop", item, "Help Onboarding Checklist", {
        description: "Stage the onboarding checklist for new operators and cross-training support.",
        notice: "New operator checklist ready.",
        primaryActionLabel: "Open Checklist",
        initialValues: {
          checklistType: "New operator",
          audience: "New hire",
          note: "Onboarding"
        }
      });
    case "Shortcut Map":
      return createWorkspaceMenuIntent("desktop", item, "Help Shortcut Map", {
        description: "Open the shortcut map for quick-launch, menu, and open-window navigation.",
        notice: "Shortcut map ready.",
        primaryActionLabel: "Open Shortcut Map",
        initialValues: {
          shortcutScope: "Quick Launch",
          audience: "All operators",
          note: "Keyboard and launch map"
        }
      });
    case "Open Windows Guide":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Help Shortcut Map", "Help Shortcut Map", {
        description: "Open the open-windows guide with navigation scope and audience already selected.",
        notice: "Open windows guide ready.",
        primaryActionLabel: "Open Guide",
        initialValues: {
          shortcutScope: "Open Windows",
          audience: "All operators",
          note: "Window navigation"
        }
      });
    case "Service Tips":
    case "Sales Tips":
    case "Parts Tips":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Help Tips Guide", "Help Tips", {
        description: "Open operator tip content with the right department track and audience already in focus.",
        notice: `${item} ready.`,
        primaryActionLabel: "Open Tips",
        initialValues: {
          tipTrack: item,
          audience: "Store operators",
          note: "Daily operations"
        }
      });
    case "Queue Triage Guide":
    case "Month-End Walkthrough":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Help Workflow Walkthrough", "Help Workflow Walkthrough", {
        description:
          item === "Month-End Walkthrough"
            ? "Stage the month-end walkthrough with the closeout audience and guidance path attached."
            : "Review the queue-triage playbook with the right audience and walkthrough focus.",
        notice: item === "Month-End Walkthrough" ? "Month-end walkthrough ready." : "Queue triage guide ready.",
        primaryActionLabel: item === "Month-End Walkthrough" ? "Open Walkthrough" : "Open Triage Guide",
        initialValues: {
          walkthroughType: item === "Month-End Walkthrough" ? "Month-end closeout" : "Queue triage",
          audience: item === "Month-End Walkthrough" ? "Leadership" : "Store operators",
          note: item === "Month-End Walkthrough" ? "Closeout" : "Daily operations"
        }
      });
    case "Workflow Walkthroughs":
      return createWorkspaceMenuIntent("desktop", item, "Help Workflow Walkthrough", {
        description: "Review cross-workspace walkthroughs with track and audience controls.",
        notice: "Workflow walkthroughs ready.",
        primaryActionLabel: "Open Walkthroughs",
        initialValues: {
          walkthroughType: "Cross-workspace",
          audience: "Store operators",
          note: "Daily operations"
        }
      });
    case "Upcoming Changes":
    case "Demo Scripts":
    case "Release Webinar":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Help Release Brief", "Help Release", {
        description: "Review release-center content with audience and rollout context attached.",
        notice: `${item} ready.`,
        primaryActionLabel: item === "Release Webinar" ? "Open Webinar" : "Review Brief",
        initialValues: {
          releaseTrack: item,
          audience: "All operators",
          note: "Release center"
        }
      });
    case "Release Notes":
      return createWorkspaceMenuIntent("desktop", item, "Help Release Notes", {
        description: "Stage release notes with audience and time-window context for operators.",
        notice: "Release notes ready.",
        primaryActionLabel: "Review Notes",
        initialValues: {
          releaseWindow: "Current release",
          audience: "All operators",
          note: "What changed"
        }
      });
    case "Known Issues":
      return createWorkspaceMenuIntent("audit", item, "Help Known Issues Review", {
        description: "Review the known-issues list with ownership and operator notes.",
        notice: "Known issues ready.",
        primaryActionLabel: "Review Issues",
        initialValues: {
          summary: "Known issues",
          owner: "Support",
          note: "Help"
        }
      });
    case "Fix Verification Checklist":
      return createAliasedWorkspaceMenuIntent("audit", item, "Help Known Issues Review", "Help Known Issues Review", {
        description: "Review fix-verification work with support ownership and release notes already attached.",
        notice: "Fix verification checklist ready.",
        primaryActionLabel: "Open Checklist",
        initialValues: {
          summary: "Fix verification checklist",
          owner: "Support",
          note: "Release verification"
        }
      });
    case "Support":
      return createWorkspaceMenuIntent("audit", item, "Help Support Request", {
        description: "Open support guidance with a scoped owner and current ticket notes.",
        notice: "Support desk ready.",
        primaryActionLabel: "Open Support",
        initialValues: {
          summary: "Support request",
          owner: "Support",
          note: "Help"
        }
      });
    case "Escalation Playbook":
      return createAliasedWorkspaceMenuIntent("audit", item, "Help Support Request", "Help Support Request", {
        description: "Open the escalation playbook with support ownership and current paths in view.",
        notice: "Escalation playbook ready.",
        primaryActionLabel: "Open Playbook",
        initialValues: {
          summary: "Escalation playbook",
          owner: "Support",
          note: "Escalation paths"
        }
      });
    case "Open Ticket":
      return createWorkspaceMenuIntent("audit", item, "Help Support Ticket", {
        description: "Stage a new support ticket with ownership and note context for follow-up.",
        notice: "Support ticket ready.",
        primaryActionLabel: "Open Ticket",
        initialValues: {
          summary: "New support ticket",
          owner: "Support",
          note: "Help"
        }
      });
    case "Contact Directory":
      return createAliasedWorkspaceMenuIntent("audit", item, "Help Contact Directory", "Help Directory", {
        description: "Open the support contact directory with owner notes and escalation context.",
        notice: "Contact directory ready.",
        primaryActionLabel: "Open Directory",
        initialValues: {
          directoryScope: item,
          owner: "Support",
          note: "Help"
        }
      });
    case "Certification Tracker":
      return createAliasedWorkspaceMenuIntent("desktop", item, "Help Role Training Plan", "Help Role Training Plan", {
        description: "Open the certification tracker with the right audience and training note already attached.",
        notice: "Certification tracker ready.",
        primaryActionLabel: "Open Tracker",
        initialValues: {
          trainingTrack: "Certification tracker",
          audience: "Store operators",
          note: "Help"
        }
      });
    case "Role-Based Training":
      return createWorkspaceMenuIntent("desktop", item, "Help Role Training Plan", {
        description: "Open the training plan with track and audience controls for role-based ramp-up.",
        notice: "Role-based training ready.",
        primaryActionLabel: "Open Training Plan",
        initialValues: {
          trainingTrack: "Role-based training",
          audience: "Store operators",
          note: "Help"
        }
      });
    default:
      return null;
  }
}

export function resolveWorkspaceMenuIntent(groupLabel: string, item: string): WorkspaceMenuIntent | null {
  switch (groupLabel) {
    case "Application":
      return resolveApplicationMenuIntent(item);
    case "Parts":
      return resolvePartsMenuIntent(item);
    case "Sales":
      return resolveSalesMenuIntent(item);
    case "CRM":
      return resolveCrmMenuIntent(item);
    case "Service":
      return resolveServiceMenuIntent(item);
    case "Management Activity":
      return resolveManagementMenuIntent(item);
    case "Receivables":
      return resolveReceivablesMenuIntent(item);
    case "General Ledger":
      return resolveGeneralLedgerMenuIntent(item);
    case "System":
      return resolveSystemMenuIntent(item);
    case "Help":
      return resolveHelpMenuIntent(item);
    default:
      return null;
  }
}
