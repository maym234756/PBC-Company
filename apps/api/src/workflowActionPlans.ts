export type WorkflowActionPlanWorkspaceId = "desktop" | "service" | "parts" | "sales" | "analytics" | "website" | "audit";
export type WorkflowActionPlanTone = "neutral" | "accent" | "stable" | "attention";

export interface WorkflowActionPlanInput {
  workspaceId: WorkflowActionPlanWorkspaceId;
  action: string;
  values: Record<string, string>;
}

export interface WorkflowActionPlan {
  activityDetail: string;
  activityLabel: string;
  activityTone: WorkflowActionPlanTone;
  detail: string;
  message: string;
}

function normalizeWorkflowText(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function summarizeValues(values: Record<string, string>, keys: string[], fallback: string) {
  const summary = keys
    .map((key) => values[key]?.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");

  return summary || fallback;
}

function createPlannedAction(
  values: Record<string, string>,
  config: {
    activityDetailPrefix: string;
    activityLabel: string;
    activityTone: WorkflowActionPlanTone;
    detailKeys: string[];
    fallbackDetail: string;
    message: string;
  }
): WorkflowActionPlan {
  const detail = summarizeValues(values, config.detailKeys, config.fallbackDetail);

  return {
    activityDetail: `${config.activityDetailPrefix} for ${detail}.`,
    activityLabel: config.activityLabel,
    activityTone: config.activityTone,
    detail,
    message: config.message
  };
}

function createPrefixedActionPlan(
  input: WorkflowActionPlanInput,
  prefix: string,
  config: {
    activityTone: WorkflowActionPlanTone;
    detailKeys: string[];
    fallbackDetail: string;
  }
): WorkflowActionPlan | null {
  if (!input.action.startsWith(prefix)) {
    return null;
  }

  const label = normalizeWorkflowText(input.action.slice(prefix.length), prefix.trim());

  return createPlannedAction(input.values, {
    activityDetailPrefix: `${label} queued`,
    activityLabel: `${label} queued`,
    activityTone: config.activityTone,
    detailKeys: config.detailKeys,
    fallbackDetail: config.fallbackDetail,
    message: `${label} queued.`
  });
}

function resolvePrefixedWorkflowActionPlan(input: WorkflowActionPlanInput): WorkflowActionPlan | null {
  return (
    createPrefixedActionPlan(input, "Sales Lead ", {
      activityTone: "accent",
      detailKeys: ["customerName", "interest", "source"],
      fallbackDetail: "New prospect · Open unit · Website Lead"
    }) ??
    createPrefixedActionPlan(input, "Sales Quote ", {
      activityTone: "accent",
      detailKeys: ["customerName", "unit", "targetPrice"],
      fallbackDetail: "Open quote · Retail unit · $0"
    }) ??
    createPrefixedActionPlan(input, "Sales Deal ", {
      activityTone: "accent",
      detailKeys: ["customerName", "unit", "worksheet"],
      fallbackDetail: "Buyer review · Retail unit · Worksheet"
    }) ??
    createPrefixedActionPlan(input, "Sales Deposit ", {
      activityTone: "stable",
      detailKeys: ["customerName", "amount", "method"],
      fallbackDetail: "Buyer review · $5,000 · ACH"
    }) ??
    createPrefixedActionPlan(input, "Sales Inventory ", {
      activityTone: "neutral",
      detailKeys: ["view", "unit", "window"],
      fallbackDetail: "Major Unit Inventory · All units · Today"
    }) ??
    createPrefixedActionPlan(input, "Sales Pricing ", {
      activityTone: "neutral",
      detailKeys: ["focus", "unit", "strategy"],
      fallbackDetail: "Pricing review · Retail unit · Retail pricing"
    }) ??
    createPrefixedActionPlan(input, "Sales Marketing ", {
      activityTone: "neutral",
      detailKeys: ["campaign", "audience", "note"],
      fallbackDetail: "Weekend follow-up · Open quotes · Sales"
    }) ??
    createPrefixedActionPlan(input, "Sales Finance ", {
      activityTone: "stable",
      detailKeys: ["queue", "customer", "dueWindow"],
      fallbackDetail: "Credit Application Queue · Buyer review · Today"
    }) ??
    createPrefixedActionPlan(input, "Sales Delivery ", {
      activityTone: "stable",
      detailKeys: ["queue", "customer", "targetDate"],
      fallbackDetail: "Delivery Checklist · Buyer review · Next available"
    }) ??
    createPrefixedActionPlan(input, "Sales Customer ", {
      activityTone: "neutral",
      detailKeys: ["view", "customer", "nextAction"],
      fallbackDetail: "Prospect 360 · Buyer review · Review"
    }) ??
    createPrefixedActionPlan(input, "Sales Messaging ", {
      activityTone: "neutral",
      detailKeys: ["recipient", "channel", "message"],
      fallbackDetail: "Buyer review · CRM Task · Follow-up queued"
    }) ??
    createPrefixedActionPlan(input, "Sales Report ", {
      activityTone: "neutral",
      detailKeys: ["reportName", "window", "delivery"],
      fallbackDetail: "Salesperson Insights · 30 Days · Operator Queue"
    }) ??
    createPrefixedActionPlan(input, "Sales Favorite ", {
      activityTone: "stable",
      detailKeys: ["favoriteView", "owner", "recallWindow"],
      fallbackDetail: "Favorite Lead Queue · Sales Desk · Today"
    }) ??
    createPrefixedActionPlan(input, "Sales Desk Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Salesperson Assignment · Sales Desk · Next release"
    }) ??
    createPrefixedActionPlan(input, "Sales Workflow Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Quote Form Layouts · Sales Desk · Next release"
    }) ??
    createPrefixedActionPlan(input, "Sales Finance Setup ", {
      activityTone: "stable",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Rate Tables · F&I · Next release"
    }) ??
    createPrefixedActionPlan(input, "Sales Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Salesperson Assignment · Sales Desk · Next release"
    }) ??
    createPrefixedActionPlan(input, "Service Time ", {
      activityTone: "neutral",
      detailKeys: ["technician", "roNumber", "hours"],
      fallbackDetail: "Technician review · RO review · 1.0"
    }) ??
    createPrefixedActionPlan(input, "Service Claim ", {
      activityTone: "attention",
      detailKeys: ["roNumber", "claimType", "carrier"],
      fallbackDetail: "RO review · Standard · OEM"
    }) ??
    createPrefixedActionPlan(input, "Service Report ", {
      activityTone: "neutral",
      detailKeys: ["reportName", "window", "delivery"],
      fallbackDetail: "Open ROs · Today · Operator Queue"
    }) ??
    createPrefixedActionPlan(input, "Service Intake ", {
      activityTone: "neutral",
      detailKeys: ["intakeFocus", "owner", "note"],
      fallbackDetail: "Check-In Board · Service Writer · Service intake"
    }) ??
    createPrefixedActionPlan(input, "Service Dispatch ", {
      activityTone: "neutral",
      detailKeys: ["dispatchView", "owner", "window"],
      fallbackDetail: "Dispatch Board · Dispatch · Today"
    }) ??
    createPrefixedActionPlan(input, "Service Workbench ", {
      activityTone: "neutral",
      detailKeys: ["workbenchView", "roNumber", "note"],
      fallbackDetail: "Repair Order Detail · RO review · Service workbench"
    }) ??
    createPrefixedActionPlan(input, "Service Quality ", {
      activityTone: "attention",
      detailKeys: ["qualityFocus", "owner", "note"],
      fallbackDetail: "Final Inspection · Shop Foreman · Service quality"
    }) ??
    createPrefixedActionPlan(input, "Service Warranty ", {
      activityTone: "attention",
      detailKeys: ["warrantyQueue", "owner", "reviewWindow"],
      fallbackDetail: "Pre-Authorization Queue · Warranty · This Week"
    }) ??
    createPrefixedActionPlan(input, "Service Communication ", {
      activityTone: "neutral",
      detailKeys: ["communicationQueue", "owner", "nextStep"],
      fallbackDetail: "Approval Needed Queue · Service Writer · Review"
    }) ??
    createPrefixedActionPlan(input, "Service Favorite ", {
      activityTone: "stable",
      detailKeys: ["favoriteView", "owner", "recallWindow"],
      fallbackDetail: "Favorite Service Board · Service Admin · Today"
    }) ??
    createPrefixedActionPlan(input, "Service Department Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Labor Rate Setup · Service Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Service Policy Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Approval Limits · Service Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Service Workflow Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Status Rules · Service Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Service Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Labor Rate Setup · Service Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Service Utility ", {
      activityTone: "neutral",
      detailKeys: ["utilityAction", "owner", "window"],
      fallbackDetail: "Capacity Planner · Service Admin · Today"
    }) ??
    createPrefixedActionPlan(input, "Parts Inventory ", {
      activityTone: "neutral",
      detailKeys: ["inventoryView", "supplier", "window"],
      fallbackDetail: "Parts Inventory · Preferred vendor · Today"
    }) ??
    createPrefixedActionPlan(input, "Parts Purchasing ", {
      activityTone: "accent",
      detailKeys: ["purchasingQueue", "supplier", "dueWindow"],
      fallbackDetail: "Ordering · Preferred vendor · Today"
    }) ??
    createPrefixedActionPlan(input, "Parts Receiving ", {
      activityTone: "attention",
      detailKeys: ["receivingQueue", "owner", "window"],
      fallbackDetail: "Receiving · Receiving · Today"
    }) ??
    createPrefixedActionPlan(input, "Parts Counter ", {
      activityTone: "neutral",
      detailKeys: ["counterQueue", "customer", "nextStep"],
      fallbackDetail: "Cashiering · Counter lane · Review"
    }) ??
    createPrefixedActionPlan(input, "Parts Report ", {
      activityTone: "neutral",
      detailKeys: ["reportName", "window", "delivery"],
      fallbackDetail: "Fill Rate Summary · 30 Days · Operator Queue"
    }) ??
    createPrefixedActionPlan(input, "Parts Favorite ", {
      activityTone: "stable",
      detailKeys: ["favoriteView", "owner", "recallWindow"],
      fallbackDetail: "Favorite PO Queue · Parts Admin · Today"
    }) ??
    createPrefixedActionPlan(input, "Parts Catalog Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Vendor Catalog Sync · Parts Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Parts Security Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Counter Permissions · Parts Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Parts Department Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Tax & Fee Setup · Parts Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Parts Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupArea", "owner", "effectiveWindow"],
      fallbackDetail: "Vendor Catalog Sync · Parts Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "Parts Utility ", {
      activityTone: "neutral",
      detailKeys: ["utilityAction", "owner", "window"],
      fallbackDetail: "Barcode Utilities · Parts Admin · Today"
    }) ??
    createPrefixedActionPlan(input, "Application Surface ", {
      activityTone: "neutral",
      detailKeys: ["surface", "ownerFocus", "note"],
      fallbackDetail: "Desktop · Operator · Application"
    }) ??
    createPrefixedActionPlan(input, "Application Activity ", {
      activityTone: "neutral",
      detailKeys: ["panel", "ownerFocus", "note"],
      fallbackDetail: "Activity Snapshot · Operator · Application"
    }) ??
    createPrefixedActionPlan(input, "Application Window ", {
      activityTone: "neutral",
      detailKeys: ["layoutAction", "layoutScope", "note"],
      fallbackDetail: "Pinned Windows · Desktop · Application"
    }) ??
    createPrefixedActionPlan(input, "Application Alert ", {
      activityTone: "attention",
      detailKeys: ["alertView", "ownerFocus", "followUp"],
      fallbackDetail: "Notifications · Operator · Same Day"
    }) ??
    createPrefixedActionPlan(input, "Application Store ", {
      activityTone: "neutral",
      detailKeys: ["storeView", "ownerFocus", "window"],
      fallbackDetail: "Store Status Board · Store leadership · Today"
    }) ??
    createPrefixedActionPlan(input, "Application Setup ", {
      activityTone: "neutral",
      detailKeys: ["setupFocus", "ownerFocus", "note"],
      fallbackDetail: "Preferences · Operator · Application"
    }) ??
    createPrefixedActionPlan(input, "Application Workspace ", {
      activityTone: "neutral",
      detailKeys: ["surface", "ownerFocus", "note"],
      fallbackDetail: "Desktop · Operator · Application"
    }) ??
    createPrefixedActionPlan(input, "Application Executive ", {
      activityTone: "stable",
      detailKeys: ["snapshotView", "reviewer", "window"],
      fallbackDetail: "Executive Snapshot · Leadership · 30 Days"
    }) ??
    createPrefixedActionPlan(input, "Application Audit ", {
      activityTone: "attention",
      detailKeys: ["auditFocus", "owner", "note"],
      fallbackDetail: "Audit Notes · Operations · Application"
    }) ??
    createPrefixedActionPlan(input, "Receivables Inquiry ", {
      activityTone: "neutral",
      detailKeys: ["inquiryType", "contactChannel", "followUp"],
      fallbackDetail: "Customer account · Phone · Same Day"
    }) ??
    createPrefixedActionPlan(input, "Receivables Batch ", {
      activityTone: "accent",
      detailKeys: ["batchType", "cutoffWindow", "settlementStatus"],
      fallbackDetail: "Credit Card · Today · Ready to settle"
    }) ??
    createPrefixedActionPlan(input, "Receivables Queue ", {
      activityTone: "attention",
      detailKeys: ["queueName", "owner", "priority"],
      fallbackDetail: "Collections · AR Team · High"
    }) ??
    createPrefixedActionPlan(input, "Receivables Report ", {
      activityTone: "neutral",
      detailKeys: ["reportName", "window", "delivery"],
      fallbackDetail: "Aging Summary · 30 Days · Operator Queue"
    }) ??
    createPrefixedActionPlan(input, "GL Store Summary ", {
      activityTone: "neutral",
      detailKeys: ["period", "summaryLens", "reviewer"],
      fallbackDetail: "MTD · P&L · Controller"
    }) ??
    createPrefixedActionPlan(input, "GL Deal Posting ", {
      activityTone: "accent",
      detailKeys: ["postingBatch", "postingDate", "approver"],
      fallbackDetail: "Open deals · Today · Accounting"
    }) ??
    createPrefixedActionPlan(input, "GL Deposit Review ", {
      activityTone: "attention",
      detailKeys: ["depositSource", "reviewWindow", "varianceFlag"],
      fallbackDetail: "All deposits · Today · Open variances"
    }) ??
    createPrefixedActionPlan(input, "GL Month End ", {
      activityTone: "neutral",
      detailKeys: ["closeWindow", "checklistOwner", "note"],
      fallbackDetail: "Month End · Controller · GL closeout"
    }) ??
    createPrefixedActionPlan(input, "System Website Feed ", {
      activityTone: "stable",
      detailKeys: ["brand", "window", "pulseType"],
      fallbackDetail: "All feeds · Recent changes · Lead routing"
    }) ??
    createPrefixedActionPlan(input, "System Access Review ", {
      activityTone: "neutral",
      detailKeys: ["roleScope", "reviewer", "changeWindow"],
      fallbackDetail: "All users · System Admin · This Week"
    }) ??
    createPrefixedActionPlan(input, "System Workflow Review ", {
      activityTone: "neutral",
      detailKeys: ["ruleset", "owner", "publishWindow"],
      fallbackDetail: "Cross-workspace automations · System Admin · Next release"
    }) ??
    createPrefixedActionPlan(input, "System Audit Review ", {
      activityTone: "neutral",
      detailKeys: ["summary", "owner", "note"],
      fallbackDetail: "System audit trail · System Admin · System"
    }) ??
    createPrefixedActionPlan(input, "Help Tips ", {
      activityTone: "neutral",
      detailKeys: ["tipTrack", "audience", "note"],
      fallbackDetail: "Service Tips · Store operators · Daily operations"
    }) ??
    createPrefixedActionPlan(input, "Help Onboarding Checklist ", {
      activityTone: "neutral",
      detailKeys: ["checklistType", "audience", "note"],
      fallbackDetail: "New operator · New hire · Onboarding"
    }) ??
    createPrefixedActionPlan(input, "Help Shortcut Map ", {
      activityTone: "neutral",
      detailKeys: ["shortcutScope", "audience", "note"],
      fallbackDetail: "Quick Launch · All operators · Keyboard and launch map"
    }) ??
    createPrefixedActionPlan(input, "Help Workflow Walkthrough ", {
      activityTone: "neutral",
      detailKeys: ["walkthroughType", "audience", "note"],
      fallbackDetail: "Cross-workspace · Store operators · Daily operations"
    }) ??
    createPrefixedActionPlan(input, "Help Release ", {
      activityTone: "neutral",
      detailKeys: ["releaseTrack", "audience", "note"],
      fallbackDetail: "Upcoming Changes · All operators · Release center"
    }) ??
    createPrefixedActionPlan(input, "Help Known Issues Review ", {
      activityTone: "attention",
      detailKeys: ["summary", "owner", "note"],
      fallbackDetail: "Known issues · Support · Help"
    }) ??
    createPrefixedActionPlan(input, "Help Support Request ", {
      activityTone: "neutral",
      detailKeys: ["summary", "owner", "note"],
      fallbackDetail: "Support request · Support · Help"
    }) ??
    createPrefixedActionPlan(input, "Help Directory ", {
      activityTone: "neutral",
      detailKeys: ["directoryScope", "owner", "note"],
      fallbackDetail: "Contact Directory · Support · Help"
    }) ??
    createPrefixedActionPlan(input, "Help Role Training Plan ", {
      activityTone: "neutral",
      detailKeys: ["trainingTrack", "audience", "note"],
      fallbackDetail: "Role-based training · Store operators · Help"
    })
  );
}

export function resolveWorkflowActionPlan(input: WorkflowActionPlanInput): WorkflowActionPlan | null {
  const prefixedPlan = resolvePrefixedWorkflowActionPlan(input);

  if (prefixedPlan) {
    return prefixedPlan;
  }

  switch (`${input.workspaceId}:${input.action}`) {
    case "analytics:Management Forecast": {
      const detail = summarizeValues(input.values, ["window", "forecastFocus", "note"], "60 Days · Store posture · Leadership brief");
      return {
        activityDetail: `Leadership forecast queued for ${detail}.`,
        activityLabel: "Forecast review queued",
        activityTone: "stable",
        detail,
        message: "Leadership forecast queued."
      };
    }
    case "analytics:Management Exception Review": {
      const detail = summarizeValues(input.values, ["threshold", "owner", "escalation"], "High urgency · Leadership · Leadership");
      return {
        activityDetail: `Management exception review queued for ${detail}.`,
        activityLabel: "Exception review queued",
        activityTone: "attention",
        detail,
        message: "Management exception review queued."
      };
    }
    case "analytics:Management Cross-Store Review": {
      const detail = summarizeValues(input.values, ["compareStores", "focus", "timeframe"], "Current store · Service backlog · 30 Days");
      return {
        activityDetail: `Cross-store comparison queued for ${detail}.`,
        activityLabel: "Cross-store review queued",
        activityTone: "accent",
        detail,
        message: "Cross-store review queued."
      };
    }
    case "analytics:Receivables Inquiry":
    case "analytics:Receivables Statement Request":
    case "analytics:Receivables Promise to Pay": {
      if (input.action === "Receivables Statement Request") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Statement request queued",
          activityLabel: "Statement request queued",
          activityTone: "neutral",
          detailKeys: ["inquiryType", "contactChannel", "followUp"],
          fallbackDetail: "Statement request · Phone · Same Day",
          message: "Statement request queued."
        });
      }

      if (input.action === "Receivables Promise to Pay") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Promise-to-pay follow-up queued",
          activityLabel: "Promise follow-up queued",
          activityTone: "attention",
          detailKeys: ["inquiryType", "contactChannel", "followUp"],
          fallbackDetail: "Payment promise · Phone · Next Business Day",
          message: "Promise-to-pay follow-up queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Receivables inquiry queued",
        activityLabel: "Receivables inquiry queued",
        activityTone: "neutral",
        detailKeys: ["inquiryType", "contactChannel", "followUp"],
        fallbackDetail: "Customer account · Phone · Same Day",
        message: "Customer inquiry queued."
      });
    }
    case "analytics:Receivables Batch":
    case "analytics:Receivables ACH Review":
    case "analytics:Receivables Chargeback Watch": {
      if (input.action === "Receivables ACH Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "ACH exception review queued",
          activityLabel: "ACH review queued",
          activityTone: "accent",
          detailKeys: ["batchType", "cutoffWindow", "settlementStatus"],
          fallbackDetail: "ACH · Today · Ready to settle",
          message: "ACH exception review queued."
        });
      }

      if (input.action === "Receivables Chargeback Watch") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Chargeback watch queued",
          activityLabel: "Chargeback watch queued",
          activityTone: "attention",
          detailKeys: ["batchType", "cutoffWindow", "settlementStatus"],
          fallbackDetail: "Credit Card · Today · Needs review",
          message: "Chargeback watch queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Batch review queued",
        activityLabel: "Batch review queued",
        activityTone: "accent",
        detailKeys: ["batchType", "cutoffWindow", "settlementStatus"],
        fallbackDetail: "Credit Card · Today · Ready to settle",
        message: "Credit card batch review queued."
      });
    }
    case "analytics:Receivables Queue":
    case "analytics:Receivables Delinquency Watch":
    case "analytics:Receivables Follow-Up Review": {
      if (input.action === "Receivables Delinquency Watch") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Delinquency watch queued",
          activityLabel: "Delinquency watch queued",
          activityTone: "attention",
          detailKeys: ["queueName", "owner", "priority"],
          fallbackDetail: "Collections · AR Team · High",
          message: "Delinquency watch queued."
        });
      }

      if (input.action === "Receivables Follow-Up Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Follow-up review queued",
          activityLabel: "Follow-up review queued",
          activityTone: "neutral",
          detailKeys: ["queueName", "owner", "priority"],
          fallbackDetail: "Disputes · AR Team · High",
          message: "Follow-up review queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Collections queue review queued",
        activityLabel: "Collections queue queued",
        activityTone: "attention",
        detailKeys: ["queueName", "owner", "priority"],
        fallbackDetail: "Collections · AR Team · High",
        message: "Collections queue queued."
      });
    }
    case "analytics:Receivables Report":
    case "analytics:Receivables Aging Review":
    case "analytics:Receivables Promise Tracker":
    case "analytics:Receivables Month End":
    case "analytics:Receivables Finance Follow-Up":
    case "analytics:Receivables Write-Off Review": {
      if (input.action === "Receivables Aging Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Aging review queued",
          activityLabel: "Aging review queued",
          activityTone: "neutral",
          detailKeys: ["reportName", "window", "delivery"],
          fallbackDetail: "Aging Summary · 30 Days · Operator Queue",
          message: "Aging review queued."
        });
      }

      if (input.action === "Receivables Promise Tracker") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Promise tracker queued",
          activityLabel: "Promise tracker queued",
          activityTone: "neutral",
          detailKeys: ["reportName", "window", "delivery"],
          fallbackDetail: "Promise Tracking · 30 Days · Operator Queue",
          message: "Promise tracker queued."
        });
      }

      if (input.action === "Receivables Month End") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Month-end AR review queued",
          activityLabel: "Month-end AR queued",
          activityTone: "accent",
          detailKeys: ["reportName", "window", "delivery"],
          fallbackDetail: "Aging Summary · MTD · Operator Queue",
          message: "Month-end AR review queued."
        });
      }

      if (input.action === "Receivables Finance Follow-Up") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Finance follow-up queued",
          activityLabel: "Finance follow-up queued",
          activityTone: "neutral",
          detailKeys: ["reportName", "window", "delivery"],
          fallbackDetail: "Collections Productivity · 30 Days · Operator Queue",
          message: "Finance follow-up queued."
        });
      }

      if (input.action === "Receivables Write-Off Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Write-off review queued",
          activityLabel: "Write-off review queued",
          activityTone: "attention",
          detailKeys: ["reportName", "window", "delivery"],
          fallbackDetail: "Aging Summary · 30 Days · Operator Queue",
          message: "Write-off review queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Receivables report queued",
        activityLabel: "Receivables report queued",
        activityTone: "neutral",
        detailKeys: ["reportName", "window", "delivery"],
        fallbackDetail: "Aging Summary · 30 Days · Operator Queue",
        message: "Receivables report queued."
      });
    }
    case "analytics:GL Store Summary":
    case "analytics:GL Department P&L":
    case "analytics:GL Flash Report": {
      if (input.action === "GL Department P&L") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Department P&L review queued",
          activityLabel: "Department P&L queued",
          activityTone: "neutral",
          detailKeys: ["period", "summaryLens", "reviewer"],
          fallbackDetail: "MTD · P&L · Controller",
          message: "Department P&L review queued."
        });
      }

      if (input.action === "GL Flash Report") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Flash report queued",
          activityLabel: "Flash report queued",
          activityTone: "accent",
          detailKeys: ["period", "summaryLens", "reviewer"],
          fallbackDetail: "MTD · Cash · Controller",
          message: "Flash report queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Store summary review queued",
        activityLabel: "Store summary queued",
        activityTone: "neutral",
        detailKeys: ["period", "summaryLens", "reviewer"],
        fallbackDetail: "MTD · P&L · Controller",
        message: "Store summary queued."
      });
    }
    case "analytics:GL Deal Posting":
    case "analytics:GL Funding Posting":
    case "analytics:GL Transit Posting": {
      if (input.action === "GL Funding Posting") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Funding posting queued",
          activityLabel: "Funding posting queued",
          activityTone: "accent",
          detailKeys: ["postingBatch", "postingDate", "approver"],
          fallbackDetail: "Funding cleared · Today · Accounting",
          message: "Funding posting queued."
        });
      }

      if (input.action === "GL Transit Posting") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Contract-in-transit review queued",
          activityLabel: "Transit review queued",
          activityTone: "attention",
          detailKeys: ["postingBatch", "postingDate", "approver"],
          fallbackDetail: "Delivered deals · Today · Accounting",
          message: "Contract-in-transit review queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Deal posting queued",
        activityLabel: "Deal posting queued",
        activityTone: "accent",
        detailKeys: ["postingBatch", "postingDate", "approver"],
        fallbackDetail: "Open deals · Today · Accounting",
        message: "Deal posting queued."
      });
    }
    case "analytics:GL Deposit Review":
    case "analytics:GL Deposit Exceptions":
    case "analytics:GL Cash Clearing": {
      if (input.action === "GL Deposit Exceptions") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Deposit exceptions queued",
          activityLabel: "Deposit exceptions queued",
          activityTone: "attention",
          detailKeys: ["depositSource", "reviewWindow", "varianceFlag"],
          fallbackDetail: "All deposits · Today · Open variances",
          message: "Deposit exceptions queued."
        });
      }

      if (input.action === "GL Cash Clearing") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Cash clearing review queued",
          activityLabel: "Cash clearing queued",
          activityTone: "accent",
          detailKeys: ["depositSource", "reviewWindow", "varianceFlag"],
          fallbackDetail: "Sales deposits · Today · Open variances",
          message: "Cash clearing review queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Deposit review queued",
        activityLabel: "Deposit review queued",
        activityTone: "attention",
        detailKeys: ["depositSource", "reviewWindow", "varianceFlag"],
        fallbackDetail: "All deposits · Today · Open variances",
        message: "Deposit review queued."
      });
    }
    case "analytics:GL Month End":
    case "analytics:GL Close Checklist":
    case "analytics:GL Accrual Review":
    case "analytics:GL Bank Reconciliation":
    case "analytics:GL Schedule Review":
    case "analytics:GL Journal Entry Queue": {
      if (input.action === "GL Close Checklist") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Close checklist queued",
          activityLabel: "Close checklist queued",
          activityTone: "neutral",
          detailKeys: ["closeWindow", "checklistOwner", "note"],
          fallbackDetail: "Month End · Controller · Close Checklist",
          message: "Close checklist queued."
        });
      }

      if (input.action === "GL Accrual Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Accrual review queued",
          activityLabel: "Accrual review queued",
          activityTone: "neutral",
          detailKeys: ["closeWindow", "checklistOwner", "note"],
          fallbackDetail: "Month End · Controller · Accrual Review",
          message: "Accrual review queued."
        });
      }

      if (input.action === "GL Bank Reconciliation") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Bank reconciliation queued",
          activityLabel: "Bank reconciliation queued",
          activityTone: "attention",
          detailKeys: ["closeWindow", "checklistOwner", "note"],
          fallbackDetail: "This Week · Controller · Bank Reconciliation",
          message: "Bank reconciliation queued."
        });
      }

      if (input.action === "GL Schedule Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Schedule review queued",
          activityLabel: "Schedule review queued",
          activityTone: "neutral",
          detailKeys: ["closeWindow", "checklistOwner", "note"],
          fallbackDetail: "Month End · Controller · Schedule Review",
          message: "Schedule review queued."
        });
      }

      if (input.action === "GL Journal Entry Queue") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Journal-entry queue queued",
          activityLabel: "Journal-entry queue queued",
          activityTone: "accent",
          detailKeys: ["closeWindow", "checklistOwner", "note"],
          fallbackDetail: "Month End · Controller · Journal Entry Queue",
          message: "Journal-entry queue queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Month-end closeout queued",
        activityLabel: "Month-end closeout queued",
        activityTone: "neutral",
        detailKeys: ["closeWindow", "checklistOwner", "note"],
        fallbackDetail: "Month End · Controller · GL closeout",
        message: "Month-end closeout queued."
      });
    }
    case "analytics:System Access Review":
    case "analytics:System Permission Review":
    case "analytics:System Access Matrix": {
      if (input.action === "System Permission Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Permission review queued",
          activityLabel: "Permission review queued",
          activityTone: "neutral",
          detailKeys: ["roleScope", "reviewer", "changeWindow"],
          fallbackDetail: "Store operators · System Admin · This Week",
          message: "Permission review queued."
        });
      }

      if (input.action === "System Access Matrix") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Access matrix review queued",
          activityLabel: "Access matrix queued",
          activityTone: "neutral",
          detailKeys: ["roleScope", "reviewer", "changeWindow"],
          fallbackDetail: "All users · System Admin · This Week",
          message: "Access matrix review queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Access review queued",
        activityLabel: "Access review queued",
        activityTone: "neutral",
        detailKeys: ["roleScope", "reviewer", "changeWindow"],
        fallbackDetail: "Store operators · System Admin · This Week",
        message: "Access review queued."
      });
    }
    case "analytics:System Workflow Review":
    case "analytics:System Escalation Review":
    case "analytics:System Background Job Review":
    case "analytics:System Feature Flag Review":
    case "analytics:System Environment Review":
    case "analytics:System API Connector Review":
    case "analytics:System Vendor Endpoint Review":
    case "analytics:System Template Review": {
      if (input.action === "System Escalation Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Escalation review queued",
          activityLabel: "Escalation review queued",
          activityTone: "neutral",
          detailKeys: ["ruleset", "owner", "publishWindow"],
          fallbackDetail: "Escalations · System Admin · Next release",
          message: "Escalation review queued."
        });
      }

      if (input.action === "System Background Job Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Background job review queued",
          activityLabel: "Background jobs queued",
          activityTone: "accent",
          detailKeys: ["ruleset", "owner", "publishWindow"],
          fallbackDetail: "Cross-workspace automations · System Admin · Next release",
          message: "Background job review queued."
        });
      }

      if (input.action === "System Feature Flag Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Feature flag review queued",
          activityLabel: "Feature flag review queued",
          activityTone: "neutral",
          detailKeys: ["ruleset", "owner", "publishWindow"],
          fallbackDetail: "Notifications · System Admin · Next release",
          message: "Feature flag review queued."
        });
      }

      if (input.action === "System Environment Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Environment review queued",
          activityLabel: "Environment review queued",
          activityTone: "neutral",
          detailKeys: ["ruleset", "owner", "publishWindow"],
          fallbackDetail: "Cross-workspace automations · System Admin · Next release",
          message: "Environment review queued."
        });
      }

      if (input.action === "System API Connector Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "API connector review queued",
          activityLabel: "API connector review queued",
          activityTone: "neutral",
          detailKeys: ["ruleset", "owner", "publishWindow"],
          fallbackDetail: "Cross-workspace automations · System Admin · Next release",
          message: "API connector review queued."
        });
      }

      if (input.action === "System Vendor Endpoint Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Vendor endpoint review queued",
          activityLabel: "Vendor endpoint review queued",
          activityTone: "neutral",
          detailKeys: ["ruleset", "owner", "publishWindow"],
          fallbackDetail: "Cross-workspace automations · System Admin · Next release",
          message: "Vendor endpoint review queued."
        });
      }

      if (input.action === "System Template Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Template review queued",
          activityLabel: "Template review queued",
          activityTone: "neutral",
          detailKeys: ["ruleset", "owner", "publishWindow"],
          fallbackDetail: "Notifications · System Admin · Next release",
          message: "Template review queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Workflow rules review queued",
        activityLabel: "Workflow rules review queued",
        activityTone: "neutral",
        detailKeys: ["ruleset", "owner", "publishWindow"],
        fallbackDetail: "Cross-workspace automations · System Admin · Next release",
        message: "Workflow rules review queued."
      });
    }
    case "website:Publish Feed": {
      const brand = normalizeWorkflowText(input.values.brand, "All feeds");
      const window = normalizeWorkflowText(input.values.window, "Full inventory");
      const feedIntent = normalizeWorkflowText(input.values.pulseType, normalizeWorkflowText(input.values.note, "Publish update"));
      const detail = `${brand} · ${window} · ${feedIntent}`;
      return {
        activityDetail: `Website feed publish queued for ${detail}.`,
        activityLabel: "Website feed publish queued",
        activityTone: "stable",
        detail,
        message: "Website feed publish queued."
      };
    }
    case "website:System Feed Health":
    case "website:System Lead Routing":
    case "website:System Sync Monitor":
    case "website:Application Favorite Website Feed": {
      if (input.action === "System Feed Health") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Feed health review queued",
          activityLabel: "Feed health queued",
          activityTone: "stable",
          detailKeys: ["brand", "window", "pulseType"],
          fallbackDetail: "All feeds · Full inventory · Inventory freshness",
          message: "Feed health review queued."
        });
      }

      if (input.action === "System Lead Routing") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Lead routing review queued",
          activityLabel: "Lead routing queued",
          activityTone: "stable",
          detailKeys: ["brand", "window", "pulseType"],
          fallbackDetail: "All feeds · Full inventory · Lead routing",
          message: "Lead routing review queued."
        });
      }

      if (input.action === "System Sync Monitor") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Sync monitor queued",
          activityLabel: "Sync monitor queued",
          activityTone: "stable",
          detailKeys: ["brand", "window", "pulseType"],
          fallbackDetail: "All feeds · Full inventory · Lead routing",
          message: "Sync monitor queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "Favorite website feed queued",
        activityLabel: "Favorite website feed queued",
        activityTone: "stable",
        detailKeys: ["brand", "window", "pulseType"],
        fallbackDetail: "All feeds · Recent changes · Inventory freshness",
        message: "Favorite website feed queued."
      });
    }
    case "website:Lead Sync": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Lead sync queued",
        activityLabel: "Lead sync queued",
        activityTone: "stable",
        detailKeys: ["lane", "owner", "responseWindow"],
        fallbackDetail: "All lanes · BDC · 30 Minutes",
        message: "Lead sync queued."
      });
    }
    case "website:Open Queue": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Digital queue review queued",
        activityLabel: "Digital queue queued",
        activityTone: "neutral",
        detailKeys: ["queueName", "assignee", "priority"],
        fallbackDetail: "Publishing · Digital Ops · High",
        message: "Digital queue queued."
      });
    }
    case "desktop:Application Task Queue Review": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Task queue review queued",
        activityLabel: "Task queue review queued",
        activityTone: "neutral",
        detailKeys: ["queueScope", "ownerFocus", "note"],
        fallbackDetail: "All workspaces · Store leadership · Application",
        message: "Task queue review queued."
      });
    }
    case "desktop:Application Notification Review": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Notification center review queued",
        activityLabel: "Notification review queued",
        activityTone: "neutral",
        detailKeys: ["alertLane", "ownerFocus", "followUp"],
        fallbackDetail: "All alerts · Operator · Same Day",
        message: "Notification center review queued."
      });
    }
    case "analytics:Application Operator Status": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Operator status review queued",
        activityLabel: "Operator status queued",
        activityTone: "neutral",
        detailKeys: ["statusScope", "shiftWindow", "ownerFocus"],
        fallbackDetail: "All operators · Today · Store leadership",
        message: "Operator status review queued."
      });
    }
    case "audit:Application Exception Log Review": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Exception log review queued",
        activityLabel: "Exception log review queued",
        activityTone: "attention",
        detailKeys: ["summary", "owner", "note"],
        fallbackDetail: "Operational exceptions · Operations · Application",
        message: "Exception log review queued."
      });
    }
    case "audit:Application Workflow Checklist": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Workflow checklist review queued",
        activityLabel: "Workflow checklist queued",
        activityTone: "neutral",
        detailKeys: ["summary", "owner", "note"],
        fallbackDetail: "Workflow checklists · Operations · Application",
        message: "Workflow checklist review queued."
      });
    }
    case "analytics:Application Cash Pulse": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Application cash pulse queued",
        activityLabel: "Cash pulse queued",
        activityTone: "accent",
        detailKeys: ["window", "cashLens", "reviewer"],
        fallbackDetail: "Today · Current cash posture · Controller",
        message: "Application cash pulse queued."
      });
    }
    case "analytics:Application Store Scorecard": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Store scorecard review queued",
        activityLabel: "Store scorecard queued",
        activityTone: "neutral",
        detailKeys: ["window", "scorecardFocus", "reviewer"],
        fallbackDetail: "30 Days · Store posture · Leadership",
        message: "Store scorecard review queued."
      });
    }
    case "desktop:Application Quick Launch Setup": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Quick launch setup review queued",
        activityLabel: "Quick launch setup queued",
        activityTone: "neutral",
        detailKeys: ["shortcutScope", "launchLane", "note"],
        fallbackDetail: "Store operators · Quick Launch · Application",
        message: "Quick launch setup review queued."
      });
    }
    case "desktop:Help Operator Guide": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Operator guide queued",
        activityLabel: "Operator guide queued",
        activityTone: "neutral",
        detailKeys: ["guideType", "audience", "note"],
        fallbackDetail: "Operator guide · All operators · Quick start",
        message: "Operator guide queued."
      });
    }
    case "desktop:Help Onboarding Checklist": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Onboarding checklist queued",
        activityLabel: "Onboarding checklist queued",
        activityTone: "neutral",
        detailKeys: ["checklistType", "audience", "note"],
        fallbackDetail: "New operator · New hire · Onboarding",
        message: "Onboarding checklist queued."
      });
    }
    case "desktop:Help Shortcut Map": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Shortcut map queued",
        activityLabel: "Shortcut map queued",
        activityTone: "neutral",
        detailKeys: ["shortcutScope", "audience", "note"],
        fallbackDetail: "Quick Launch · All operators · Keyboard and launch map",
        message: "Shortcut map queued."
      });
    }
    case "desktop:Help Workflow Walkthrough": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Workflow walkthrough queued",
        activityLabel: "Workflow walkthrough queued",
        activityTone: "neutral",
        detailKeys: ["walkthroughType", "audience", "note"],
        fallbackDetail: "Cross-workspace · Store operators · Daily operations",
        message: "Workflow walkthrough queued."
      });
    }
    case "desktop:Help Release Notes": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Release notes review queued",
        activityLabel: "Release notes queued",
        activityTone: "neutral",
        detailKeys: ["releaseWindow", "audience", "note"],
        fallbackDetail: "Current release · All operators · What changed",
        message: "Release notes review queued."
      });
    }
    case "audit:Help Known Issues Review": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Known issues review queued",
        activityLabel: "Known issues queued",
        activityTone: "attention",
        detailKeys: ["summary", "owner", "note"],
        fallbackDetail: "Known issues · Support · Help",
        message: "Known issues review queued."
      });
    }
    case "audit:Help Support Request": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Support request queued",
        activityLabel: "Support request queued",
        activityTone: "neutral",
        detailKeys: ["summary", "owner", "note"],
        fallbackDetail: "Support request · Support · Help",
        message: "Support request queued."
      });
    }
    case "audit:Help Support Ticket": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Support ticket queued",
        activityLabel: "Support ticket queued",
        activityTone: "attention",
        detailKeys: ["summary", "owner", "note"],
        fallbackDetail: "New support ticket · Support · Help",
        message: "Support ticket queued."
      });
    }
    case "desktop:Help Role Training Plan": {
      return createPlannedAction(input.values, {
        activityDetailPrefix: "Role-based training queued",
        activityLabel: "Role-based training queued",
        activityTone: "neutral",
        detailKeys: ["trainingTrack", "audience", "note"],
        fallbackDetail: "Role-based training · Store operators · Help",
        message: "Role-based training queued."
      });
    }
    case "audit:Management Policy Audit": {
      const detail = summarizeValues(input.values, ["summary", "owner", "note"], "Policy exceptions · Operations · Management Activity");
      return {
        activityDetail: `Policy exception review queued for ${detail}.`,
        activityLabel: "Policy review queued",
        activityTone: "attention",
        detail,
        message: "Policy exception review queued."
      };
    }
    case "audit:Management Approval Review": {
      const detail = summarizeValues(input.values, ["summary", "approver", "note"], "Approval log · GM · Management Activity");
      return {
        activityDetail: `Approval review queued for ${detail}.`,
        activityLabel: "Approval review queued",
        activityTone: "neutral",
        detail,
        message: "Approval review queued."
      };
    }
    case "audit:Management Close Readiness": {
      const detail = summarizeValues(input.values, ["summary", "closingWindow", "note"], "Month-End Readiness · Month End · Management Activity");
      return {
        activityDetail: `Close readiness review queued for ${detail}.`,
        activityLabel: "Close readiness queued",
        activityTone: "neutral",
        detail,
        message: "Close readiness review queued."
      };
    }
    case "audit:System Audit Review":
    case "audit:System Login Watch":
    case "audit:System Policy Change Review": {
      if (input.action === "System Login Watch") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Login watch queued",
          activityLabel: "Login watch queued",
          activityTone: "attention",
          detailKeys: ["summary", "owner", "note"],
          fallbackDetail: "System login watch · System Admin · System",
          message: "Login watch queued."
        });
      }

      if (input.action === "System Policy Change Review") {
        return createPlannedAction(input.values, {
          activityDetailPrefix: "Policy change review queued",
          activityLabel: "Policy change review queued",
          activityTone: "neutral",
          detailKeys: ["summary", "owner", "note"],
          fallbackDetail: "Policy change log · System Admin · System",
          message: "Policy change review queued."
        });
      }

      return createPlannedAction(input.values, {
        activityDetailPrefix: "System audit review queued",
        activityLabel: "System audit review queued",
        activityTone: "neutral",
        detailKeys: ["summary", "owner", "note"],
        fallbackDetail: "System audit trail · System Admin · System",
        message: "System audit review queued."
      });
    }
    default:
      return null;
  }
}