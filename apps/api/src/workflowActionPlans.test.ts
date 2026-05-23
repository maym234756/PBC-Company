import assert from "node:assert/strict";
import test from "node:test";

import { resolveWorkflowActionPlan } from "./workflowActionPlans.js";

test("management forecast plans a stable leadership forecast task and activity", () => {
  const plan = resolveWorkflowActionPlan({
    workspaceId: "analytics",
    action: "Management Forecast",
    values: {
      window: "60 Days",
      forecastFocus: "Store posture",
      note: "Forecast Snapshot"
    }
  });

  assert.ok(plan);
  assert.equal(plan.message, "Leadership forecast queued.");
  assert.equal(plan.activityLabel, "Forecast review queued");
  assert.equal(plan.activityTone, "stable");
  assert.equal(plan.detail, "60 Days · Store posture · Forecast Snapshot");
});

test("website publish plan preserves the publish message while enriching the activity detail", () => {
  const plan = resolveWorkflowActionPlan({
    workspaceId: "website",
    action: "Publish Feed",
    values: {
      brand: "Premier Fort Lauderdale",
      window: "Recent changes",
      pulseType: "Merchandising"
    }
  });

  assert.ok(plan);
  assert.equal(plan.message, "Website feed publish queued.");
  assert.equal(plan.activityLabel, "Website feed publish queued");
  assert.equal(plan.detail, "Premier Fort Lauderdale · Recent changes · Merchandising");
});

test("receivables, general ledger, and system actions resolve into richer queued task plans", () => {
  const receivablesPlan = resolveWorkflowActionPlan({
    workspaceId: "analytics",
    action: "Receivables Queue",
    values: {
      queueName: "Collections",
      owner: "AR Team",
      priority: "High"
    }
  });
  const generalLedgerPlan = resolveWorkflowActionPlan({
    workspaceId: "analytics",
    action: "GL Deal Posting",
    values: {
      postingBatch: "Open deals",
      postingDate: "Today",
      approver: "Accounting"
    }
  });
  const systemAuditPlan = resolveWorkflowActionPlan({
    workspaceId: "audit",
    action: "System Audit Review",
    values: {
      summary: "System audit trail",
      owner: "System Admin",
      note: "System"
    }
  });

  assert.ok(receivablesPlan);
  assert.equal(receivablesPlan.message, "Collections queue queued.");
  assert.equal(receivablesPlan.detail, "Collections · AR Team · High");

  assert.ok(generalLedgerPlan);
  assert.equal(generalLedgerPlan.message, "Deal posting queued.");
  assert.equal(generalLedgerPlan.activityLabel, "Deal posting queued");

  assert.ok(systemAuditPlan);
  assert.equal(systemAuditPlan.message, "System audit review queued.");
  assert.equal(systemAuditPlan.detail, "System audit trail · System Admin · System");
});

test("distinct alias and help/application actions resolve to their own queued plans", () => {
  const statementRequestPlan = resolveWorkflowActionPlan({
    workspaceId: "analytics",
    action: "Receivables Statement Request",
    values: {
      inquiryType: "Statement request",
      contactChannel: "Phone",
      followUp: "Same Day"
    }
  });
  const applicationTaskQueuePlan = resolveWorkflowActionPlan({
    workspaceId: "desktop",
    action: "Application Task Queue Review",
    values: {
      queueScope: "All workspaces",
      ownerFocus: "Store leadership",
      note: "Application"
    }
  });
  const helpOperatorGuidePlan = resolveWorkflowActionPlan({
    workspaceId: "desktop",
    action: "Help Operator Guide",
    values: {
      guideType: "Operator guide",
      audience: "All operators",
      note: "Quick start"
    }
  });

  assert.ok(statementRequestPlan);
  assert.equal(statementRequestPlan.message, "Statement request queued.");
  assert.equal(statementRequestPlan.detail, "Statement request · Phone · Same Day");

  assert.ok(applicationTaskQueuePlan);
  assert.equal(applicationTaskQueuePlan.message, "Task queue review queued.");
  assert.equal(applicationTaskQueuePlan.detail, "All workspaces · Store leadership · Application");

  assert.ok(helpOperatorGuidePlan);
  assert.equal(helpOperatorGuidePlan.message, "Operator guide queued.");
  assert.equal(helpOperatorGuidePlan.detail, "Operator guide · All operators · Quick start");
});

test("prefixed sales, service, parts, application, and help actions resolve to planner-backed queued plans", () => {
  const salesPlan = resolveWorkflowActionPlan({
    workspaceId: "sales",
    action: "Sales Desk Setup Salesperson Assignment",
    values: {
      setupArea: "Salesperson Assignment",
      owner: "Sales Desk",
      effectiveWindow: "Next release"
    }
  });
  const servicePlan = resolveWorkflowActionPlan({
    workspaceId: "service",
    action: "Service Favorite Favorite Dispatch Board",
    values: {
      favoriteView: "Favorite Dispatch Board",
      owner: "Service Admin",
      recallWindow: "Today"
    }
  });
  const partsPlan = resolveWorkflowActionPlan({
    workspaceId: "parts",
    action: "Parts Security Setup Counter Permissions",
    values: {
      setupArea: "Counter Permissions",
      owner: "Parts Admin",
      effectiveWindow: "Next release"
    }
  });
  const applicationPlan = resolveWorkflowActionPlan({
    workspaceId: "desktop",
    action: "Application Setup Preferences",
    values: {
      setupFocus: "Preferences",
      ownerFocus: "Operator",
      note: "Application"
    }
  });
  const helpPlan = resolveWorkflowActionPlan({
    workspaceId: "desktop",
    action: "Help Release Demo Scripts",
    values: {
      releaseTrack: "Demo Scripts",
      audience: "All operators",
      note: "Release center"
    }
  });

  assert.ok(salesPlan);
  assert.equal(salesPlan.message, "Salesperson Assignment queued.");
  assert.equal(salesPlan.detail, "Salesperson Assignment · Sales Desk · Next release");

  assert.ok(servicePlan);
  assert.equal(servicePlan.message, "Favorite Dispatch Board queued.");
  assert.equal(servicePlan.detail, "Favorite Dispatch Board · Service Admin · Today");

  assert.ok(partsPlan);
  assert.equal(partsPlan.message, "Counter Permissions queued.");
  assert.equal(partsPlan.detail, "Counter Permissions · Parts Admin · Next release");

  assert.ok(applicationPlan);
  assert.equal(applicationPlan.message, "Preferences queued.");
  assert.equal(applicationPlan.detail, "Preferences · Operator · Application");

  assert.ok(helpPlan);
  assert.equal(helpPlan.message, "Demo Scripts queued.");
  assert.equal(helpPlan.detail, "Demo Scripts · All operators · Release center");
});

test("new prefixed receivables, general ledger, system, and help actions resolve to distinct queued plans", () => {
  const receivablesPlan = resolveWorkflowActionPlan({
    workspaceId: "analytics",
    action: "Receivables Inquiry Credit Hold Review",
    values: {
      inquiryType: "Credit hold",
      contactChannel: "Email",
      followUp: "Same Day"
    }
  });
  const generalLedgerPlan = resolveWorkflowActionPlan({
    workspaceId: "analytics",
    action: "GL Deposit Review Deposit Slip Match",
    values: {
      depositSource: "All deposits",
      reviewWindow: "Today",
      varianceFlag: "Open variances"
    }
  });
  const systemPlan = resolveWorkflowActionPlan({
    workspaceId: "website",
    action: "System Website Feed Feed Retry Queue",
    values: {
      brand: "Premier Fort Lauderdale",
      window: "Recent changes",
      pulseType: "Inventory freshness"
    }
  });
  const helpPlan = resolveWorkflowActionPlan({
    workspaceId: "desktop",
    action: "Help Shortcut Map Open Windows Guide",
    values: {
      shortcutScope: "Open Windows",
      audience: "All operators",
      note: "Window navigation"
    }
  });

  assert.ok(receivablesPlan);
  assert.equal(receivablesPlan.message, "Credit Hold Review queued.");
  assert.equal(receivablesPlan.detail, "Credit hold · Email · Same Day");

  assert.ok(generalLedgerPlan);
  assert.equal(generalLedgerPlan.message, "Deposit Slip Match queued.");
  assert.equal(generalLedgerPlan.detail, "All deposits · Today · Open variances");

  assert.ok(systemPlan);
  assert.equal(systemPlan.message, "Feed Retry Queue queued.");
  assert.equal(systemPlan.detail, "Premier Fort Lauderdale · Recent changes · Inventory freshness");

  assert.ok(helpPlan);
  assert.equal(helpPlan.message, "Open Windows Guide queued.");
  assert.equal(helpPlan.detail, "Open Windows · All operators · Window navigation");
});