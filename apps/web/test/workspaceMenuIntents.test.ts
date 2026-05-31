import assert from "node:assert/strict";
import test from "node:test";

import { resolveWorkspaceFromMenuItem } from "../src/lightspeedReference.ts";
import {
  resolveApplicationWorkspaceToolsTarget,
  resolveApplicationMenuIntent,
  resolveCrmMenuIntent,
  resolveGeneralLedgerMenuIntent,
  resolveHelpMenuIntent,
  resolveManagementMenuIntent,
  resolvePartsMenuIntent,
  resolveReceivablesMenuIntent,
  resolveSalesMenuIntent,
  resolveServiceMenuIntent,
  resolveSystemMenuIntent,
  resolveWorkspaceMenuIntent
} from "../src/workspaceMenuIntents.ts";

test("application workspace tools leaves resolve to first-class desktop panel targets", () => {
  const preferencesTarget = resolveApplicationWorkspaceToolsTarget("Preferences");
  const exceptionTarget = resolveApplicationWorkspaceToolsTarget("Exception Inbox");

  assert.ok(preferencesTarget);
  assert.equal(preferencesTarget.sectionId, "setup");
  assert.equal(preferencesTarget.sectionLabel, "Setup");
  assert.equal(preferencesTarget.workspaceId, "desktop");

  assert.ok(exceptionTarget);
  assert.equal(exceptionTarget.sectionId, "alertsNotices");
  assert.equal(exceptionTarget.workspaceId, "audit");

  assert.equal(resolveApplicationWorkspaceToolsTarget("Pending Quotes"), null);
});

test("management intents preserve the visible menu label but submit the canonical management action", () => {
  const intent = resolveManagementMenuIntent("Forecast Snapshot");

  assert.ok(intent);
  assert.equal(intent.workspaceId, "analytics");
  assert.equal(intent.tool, "Management Forecast");
  assert.equal(intent.workflowOverrides?.commandLabel, "Forecast Snapshot");
  assert.equal(intent.workflowOverrides?.submitAction, "Management Forecast");
  assert.equal(intent.initialValues?.forecastFocus, "Store posture");
});

test("management activity leaf stays page-routed instead of opening a workflow intent", () => {
  const intent = resolveManagementMenuIntent("Managements Activitie's");

  assert.equal(intent, null);
  assert.equal(resolveWorkspaceMenuIntent("Management Activity", "Managements Activitie's"), null);
  assert.equal(resolveWorkspaceFromMenuItem("Management Activity", "Managements Activitie's"), "analytics");
  assert.equal(resolveWorkspaceMenuIntent("Management Activity", "Cashier Accountability"), null);
  assert.equal(resolveWorkspaceMenuIntent("Management Activity", "Cashier Reconciliation"), null);
  assert.equal(resolveWorkspaceFromMenuItem("Management Activity", "Cashier Accountability"), "analytics");
  assert.equal(resolveWorkspaceFromMenuItem("Management Activity", "Cashier Reconciliation"), "analytics");
});

test("receivables AR Aging Doc leaf stays page-routed into analytics", () => {
  const intent = resolveReceivablesMenuIntent("AR Aging Doc");

  assert.equal(intent, null);
  assert.equal(resolveWorkspaceMenuIntent("Receivables", "AR Aging Doc"), null);
  assert.equal(resolveWorkspaceFromMenuItem("Receivables", "AR Aging Doc"), "analytics");
});

test("crm communicate leaf stays page-routed into the sales communication center", () => {
  const intent = resolveCrmMenuIntent("Communicate");

  assert.equal(intent, null);
  assert.equal(resolveWorkspaceMenuIntent("CRM", "Communicate"), null);
  assert.equal(resolveWorkspaceFromMenuItem("CRM", "Communicate"), "sales");
});

test("application favorites and estimate worksheets stay page-routed in production mode", () => {
  const pageRoutedApplicationLeaves = [
    "Favorite Audit Trail",
    "Favorite Desktop",
    "Favorite Executive Board",
    "Favorite Parts Board",
    "Favorite Sales Board",
    "Favorite Service Board",
    "Favorite Website Feed",
    "Estimate Worksheets"
  ];

  for (const item of pageRoutedApplicationLeaves) {
    assert.equal(resolveApplicationMenuIntent(item), null);
    assert.equal(resolveWorkspaceMenuIntent("Application", item), null);
  }

  assert.equal(resolveServiceMenuIntent("Estimate Worksheets"), null);
  assert.equal(resolveWorkspaceMenuIntent("Service", "Estimate Worksheets"), null);
  assert.equal(resolveWorkspaceFromMenuItem("Application", "Favorite Website Feed"), "website");
  assert.equal(resolveWorkspaceFromMenuItem("Application", "Favorite Service Board"), "service");
  assert.equal(resolveWorkspaceFromMenuItem("Service", "Estimate Worksheets"), "service");
});

test("management website intents keep the dedicated UI builder but submit the legacy backend website action", () => {
  const intent = resolveManagementMenuIntent("Favorite Website Pulse");
  const websiteActivityIntent = resolveManagementMenuIntent("Website Activity");

  assert.ok(intent);
  assert.equal(intent.workspaceId, "website");
  assert.equal(intent.tool, "Management Website Pulse");
  assert.equal(intent.workflowOverrides?.commandLabel, "Favorite Website Pulse");
  assert.equal(intent.workflowOverrides?.submitAction, "Publish Feed");
  assert.equal(intent.initialValues?.pulseType, "Inventory freshness");

  assert.equal(websiteActivityIntent, null);
  assert.equal(resolveWorkspaceMenuIntent("Management Activity", "Website Activity"), null);
  assert.equal(resolveWorkspaceFromMenuItem("Management Activity", "Website Activity"), "website");
});

test("remaining top-nav groups resolve to dedicated workspace intents", () => {
  const receivablesIntent = resolveReceivablesMenuIntent("Customer Inquiry");
  const generalLedgerIntent = resolveGeneralLedgerMenuIntent("Deal Posting");
  const forgeFormIntent = resolveSystemMenuIntent("ForgeForm");
  const systemIntent = resolveSystemMenuIntent("Audit Trail");
  const routedIntent = resolveWorkspaceMenuIntent("System", "Website Feed");
  const myStoresIntent = resolveWorkspaceMenuIntent("System", "My Stores");
  const connectionPointsIntent = resolveWorkspaceMenuIntent("System", "Connection Points");

  assert.ok(receivablesIntent);
  assert.equal(receivablesIntent.workspaceId, "analytics");
  assert.equal(receivablesIntent.tool, "Receivables Inquiry");

  assert.ok(generalLedgerIntent);
  assert.equal(generalLedgerIntent.workspaceId, "analytics");
  assert.equal(generalLedgerIntent.tool, "GL Deal Posting");
  assert.equal(generalLedgerIntent.workflowOverrides?.submitAction, "GL Deal Posting");

  assert.equal(forgeFormIntent, null);
  assert.equal(systemIntent, null);
  assert.equal(resolveWorkspaceFromMenuItem("System", "Audit Trail"), "audit");

  assert.equal(routedIntent, null);
  assert.equal(resolveWorkspaceFromMenuItem("System", "Website Feed"), "website");
  assert.equal(myStoresIntent, null);
  assert.equal(connectionPointsIntent, null);
  assert.equal(resolveWorkspaceFromMenuItem("System", "My Stores"), "analytics");
  assert.equal(resolveWorkspaceFromMenuItem("System", "Connection Points"), "analytics");
  assert.equal(resolveWorkspaceFromMenuItem("System", "ForgeForm"), "analytics");
});

test("new submenu aliases stay routed to the existing workspace flows", () => {
  const receivablesAlias = resolveReceivablesMenuIntent("Statement Requests");
  const generalLedgerAlias = resolveGeneralLedgerMenuIntent("Department P&L");
  const systemAlias = resolveSystemMenuIntent("Feed Health");

  assert.ok(receivablesAlias);
  assert.equal(receivablesAlias.tool, "Receivables Inquiry");
  assert.equal(receivablesAlias.workflowOverrides?.commandLabel, "Statement Requests");
  assert.equal(receivablesAlias.workflowOverrides?.submitAction, "Receivables Statement Request");

  assert.ok(generalLedgerAlias);
  assert.equal(generalLedgerAlias.tool, "GL Store Summary");
  assert.equal(generalLedgerAlias.workflowOverrides?.commandLabel, "Department P&L");
  assert.equal(generalLedgerAlias.workflowOverrides?.submitAction, "GL Department P&L");

  assert.ok(systemAlias);
  assert.equal(systemAlias.workspaceId, "website");
  assert.equal(systemAlias.tool, "System Website Feed");
  assert.equal(systemAlias.workflowOverrides?.submitAction, "System Feed Health");

  assert.equal(resolveWorkspaceFromMenuItem("Help", "Operator Guide"), "desktop");
  assert.equal(resolveWorkspaceFromMenuItem("System", "Login Watch"), "audit");
});

test("new deeper receivables, ledger, system, and help leaves map to workflow-bearing intents", () => {
  const creditHoldIntent = resolveReceivablesMenuIntent("Credit Hold Review");
  const brokenPromiseIntent = resolveReceivablesMenuIntent("Broken Promise Review");
  const depositSlipIntent = resolveGeneralLedgerMenuIntent("Deposit Slip Match");
  const feedRetryIntent = resolveSystemMenuIntent("Feed Retry Queue");
  const passwordPolicyIntent = resolveSystemMenuIntent("Password Policy Review");
  const openWindowsGuideIntent = resolveHelpMenuIntent("Open Windows Guide");
  const escalationPlaybookIntent = resolveHelpMenuIntent("Escalation Playbook");

  assert.ok(creditHoldIntent);
  assert.equal(creditHoldIntent.tool, "Receivables Inquiry");
  assert.equal(creditHoldIntent.workflowOverrides?.submitAction, "Receivables Inquiry Credit Hold Review");

  assert.ok(brokenPromiseIntent);
  assert.equal(brokenPromiseIntent.tool, "Receivables Queue");
  assert.equal(brokenPromiseIntent.workflowOverrides?.submitAction, "Receivables Queue Broken Promise Review");

  assert.ok(depositSlipIntent);
  assert.equal(depositSlipIntent.tool, "GL Deposit Review");
  assert.equal(depositSlipIntent.workflowOverrides?.submitAction, "GL Deposit Review Deposit Slip Match");

  assert.ok(feedRetryIntent);
  assert.equal(feedRetryIntent.workspaceId, "website");
  assert.equal(feedRetryIntent.tool, "System Website Feed");
  assert.equal(feedRetryIntent.workflowOverrides?.submitAction, "System Website Feed Feed Retry Queue");

  assert.ok(passwordPolicyIntent);
  assert.equal(passwordPolicyIntent.workspaceId, "audit");
  assert.equal(passwordPolicyIntent.tool, "System Audit Review");
  assert.equal(passwordPolicyIntent.workflowOverrides?.submitAction, "System Audit Review Password Policy Review");

  assert.ok(openWindowsGuideIntent);
  assert.equal(openWindowsGuideIntent.tool, "Help Shortcut Map");
  assert.equal(openWindowsGuideIntent.workflowOverrides?.submitAction, "Help Shortcut Map Open Windows Guide");

  assert.ok(escalationPlaybookIntent);
  assert.equal(escalationPlaybookIntent.workspaceId, "audit");
  assert.equal(escalationPlaybookIntent.tool, "Help Support Request");
  assert.equal(escalationPlaybookIntent.workflowOverrides?.submitAction, "Help Support Request Escalation Playbook");

  assert.equal(resolveWorkspaceFromMenuItem("Receivables", "Credit Hold Review"), "analytics");
  assert.equal(resolveWorkspaceFromMenuItem("General Ledger", "Trial Balance Review"), "analytics");
  assert.equal(resolveWorkspaceFromMenuItem("System", "Feed Retry Queue"), "website");
  assert.equal(resolveWorkspaceFromMenuItem("Help", "Fix Verification Checklist"), "audit");
});

test("application and help items can open behavior-bearing workflows instead of only navigating", () => {
  const applicationIntent = resolveApplicationMenuIntent("Preferences");
  const applicationQueueIntent = resolveApplicationMenuIntent("Task Queue Monitor");
  const helpIntent = resolveHelpMenuIntent("Operator Guide");
  const helpSupportIntent = resolveHelpMenuIntent("Open Ticket");
  const routedHelpIntent = resolveWorkspaceMenuIntent("Help", "Operator Guide");

  assert.ok(applicationIntent);
  assert.equal(applicationIntent.workspaceId, "desktop");
  assert.equal(applicationIntent.tool, "Application Personal Setup Review");
  assert.equal(applicationIntent.workflowOverrides?.submitAction, "Application Setup Preferences");

  assert.ok(applicationQueueIntent);
  assert.equal(applicationQueueIntent.workspaceId, "desktop");
  assert.equal(applicationQueueIntent.tool, "Application Task Queue Review");

  assert.ok(helpIntent);
  assert.equal(helpIntent.workspaceId, "desktop");
  assert.equal(helpIntent.tool, "Help Operator Guide");

  assert.ok(helpSupportIntent);
  assert.equal(helpSupportIntent.workspaceId, "audit");
  assert.equal(helpSupportIntent.tool, "Help Support Ticket");

  assert.ok(routedHelpIntent);
  assert.equal(routedHelpIntent.tool, "Help Operator Guide");
});

test("sales, service, and parts submenu leaves can now open split favorite and setup workflows with distinct submit actions", () => {
  const salesIntent = resolveSalesMenuIntent("Salesperson Assignment");
  const salesFavoriteIntent = resolveSalesMenuIntent("Favorite Deal Desk");
  const serviceIntent = resolveServiceMenuIntent("Favorite Dispatch Board");
  const partsIntent = resolvePartsMenuIntent("Counter Permissions");
  const applicationIntent = resolveApplicationMenuIntent("Pending Quotes");
  const helpReleaseIntent = resolveHelpMenuIntent("Demo Scripts");
  const routedPartsIntent = resolveWorkspaceMenuIntent("Parts", "Counter Permissions");

  assert.ok(salesIntent);
  assert.equal(salesIntent.workspaceId, "sales");
  assert.equal(salesIntent.tool, "Sales Desk Setup");
  assert.equal(salesIntent.workflowOverrides?.submitAction, "Sales Desk Setup Salesperson Assignment");

  assert.ok(salesFavoriteIntent);
  assert.equal(salesFavoriteIntent.workspaceId, "sales");
  assert.equal(salesFavoriteIntent.tool, "Sales Favorite View");
  assert.equal(salesFavoriteIntent.workflowOverrides?.submitAction, "Sales Favorite Favorite Deal Desk");

  assert.ok(serviceIntent);
  assert.equal(serviceIntent.workspaceId, "service");
  assert.equal(serviceIntent.tool, "Service Favorite View");
  assert.equal(serviceIntent.workflowOverrides?.submitAction, "Service Favorite Favorite Dispatch Board");

  assert.ok(partsIntent);
  assert.equal(partsIntent.workspaceId, "parts");
  assert.equal(partsIntent.tool, "Parts Security Setup");
  assert.equal(partsIntent.workflowOverrides?.submitAction, "Parts Security Setup Counter Permissions");

  assert.ok(applicationIntent);
  assert.equal(applicationIntent.workspaceId, "sales");
  assert.equal(applicationIntent.tool, "New Quote");
  assert.equal(applicationIntent.workflowOverrides?.submitAction, "Sales Quote Pending Quotes");

  assert.ok(helpReleaseIntent);
  assert.equal(helpReleaseIntent.workspaceId, "desktop");
  assert.equal(helpReleaseIntent.tool, "Help Release Brief");
  assert.equal(helpReleaseIntent.workflowOverrides?.submitAction, "Help Release Demo Scripts");

  assert.ok(routedPartsIntent);
  assert.equal(routedPartsIntent.tool, "Parts Security Setup");
});

test("inventory updating parts leaves resolve to the expected existing parts workflows", () => {
  const priceEscalatorIntent = resolvePartsMenuIntent("Update Part Prices Using Escalators");
  const partNumberUtilityIntent = resolvePartsMenuIntent("Part Number Utility");
  const scannedInventoryIntent = resolvePartsMenuIntent("Scanned Inventory");
  const inventoryCountSheetsIntent = resolvePartsMenuIntent("Inventory Count Sheets");
  const changePartCategoriesIntent = resolvePartsMenuIntent("Change Part Categories");

  assert.ok(priceEscalatorIntent);
  assert.equal(priceEscalatorIntent.tool, "Parts Department Setup");
  assert.equal(priceEscalatorIntent.workflowOverrides?.submitAction, "Parts Department Setup Update Part Prices Using Escalators");

  assert.ok(partNumberUtilityIntent);
  assert.equal(partNumberUtilityIntent.tool, "Parts Inventory Review");
  assert.equal(partNumberUtilityIntent.workflowOverrides?.submitAction, "Parts Inventory Part Number Utility");

  assert.ok(scannedInventoryIntent);
  assert.equal(scannedInventoryIntent.tool, "Parts Inventory Review");
  assert.equal(scannedInventoryIntent.workflowOverrides?.submitAction, "Parts Inventory Scanned Inventory");

  assert.ok(inventoryCountSheetsIntent);
  assert.equal(inventoryCountSheetsIntent.tool, "Parts Report Review");
  assert.equal(inventoryCountSheetsIntent.workflowOverrides?.submitAction, "Parts Report Inventory Count Sheets");

  assert.ok(changePartCategoriesIntent);
  assert.equal(changePartCategoriesIntent.tool, "Parts Catalog Setup");
  assert.equal(changePartCategoriesIntent.workflowOverrides?.submitAction, "Parts Catalog Setup Change Part Categories");

  assert.equal(resolveWorkspaceFromMenuItem("Parts", "Update Part Prices Using Escalators"), "parts");
  assert.equal(resolveWorkspaceMenuIntent("Parts", "Change Part Categories")?.tool, "Parts Catalog Setup");
});
