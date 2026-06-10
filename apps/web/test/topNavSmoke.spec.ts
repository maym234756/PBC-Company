import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.MARINE_CLOUD_API_BASE_URL ?? "http://127.0.0.1:4000/api";
const SESSION_STORAGE_KEY = "marine-cloud-session";
const SMOKE_EMAIL = process.env.MARINE_CLOUD_SMOKE_EMAIL ?? "mmay@premier-yamaha.com";
const SMOKE_PASSWORD = process.env.MARINE_CLOUD_SMOKE_PASSWORD ?? "demo";

type LoginPayload = {
  user: Record<string, unknown>;
  stores: Array<{ id: string }>;
};

function topTabs(page: Parameters<typeof test>[0]["page"]) {
  return page.locator(".legacy-menu-row .top-tabs");
}

function menuButton(page: Parameters<typeof test>[0]["page"], label: string) {
  return topTabs(page).getByRole("button", { name: label, exact: true });
}

async function seedSession(page: Parameters<typeof test>[0]["page"], request: Parameters<typeof test>[0]["request"]) {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD
    }
  });

  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as LoginPayload;
  const selectedStoreId = process.env.MARINE_CLOUD_SMOKE_STORE_ID ?? payload.stores[0]?.id;

  if (!selectedStoreId) {
    throw new Error("Smoke login returned no stores.");
  }

  await page.addInitScript(
    ({ session, storageKey }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(session));
    },
    {
      session: {
        ...payload,
        selectedStoreId
      },
      storageKey: SESSION_STORAGE_KEY
    }
  );

  return selectedStoreId;
}

async function openWorkspace(page: Parameters<typeof test>[0]["page"], request: Parameters<typeof test>[0]["request"], workspaceId = "sales") {
  const storeId = await seedSession(page, request);
  await page.goto(`/dashboard/${storeId}/${workspaceId}`, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(new RegExp(`/dashboard/${storeId}/${workspaceId}$`));
  return storeId;
}

async function restoreSession(page: Parameters<typeof test>[0]["page"], request: Parameters<typeof test>[0]["request"]) {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD
    }
  });

  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as LoginPayload;
  const selectedStoreId = process.env.MARINE_CLOUD_SMOKE_STORE_ID ?? payload.stores[0]?.id;

  if (!selectedStoreId) {
    throw new Error("Smoke login returned no stores.");
  }

  await page.evaluate(
    ({ session, storageKey }) => {
      window.sessionStorage.setItem(storageKey, JSON.stringify(session));
    },
    {
      session: {
        ...payload,
        selectedStoreId
      },
      storageKey: SESSION_STORAGE_KEY
    }
  );

  return selectedStoreId;
}

async function assertWorkflowPanel(
  page: Parameters<typeof test>[0]["page"],
  config: {
    title: string;
    fields: string[];
    primaryAction: string;
  }
) {
  const panel = page.locator(".workflow-panel");

  await expect(panel).toBeVisible();
  await expect(panel.locator("h2")).toHaveText(config.title);
  await expect(panel.locator(".workflow-primary")).toHaveText(config.primaryAction);

  for (const field of config.fields) {
    await expect(panel.getByText(field, { exact: true })).toBeVisible();
  }

  return panel;
}

async function submitWorkflow(page: Parameters<typeof test>[0]["page"], message: string) {
  const panel = page.locator(".workflow-panel");

  await panel.locator(".workflow-primary").click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
}

async function assertWorkspaceToolsPanel(
  page: Parameters<typeof test>[0]["page"],
  config: {
    section: string;
    action: string;
  }
) {
  const panel = page.locator(".legacy-workspace-tools-panel");

  await expect(panel).toBeVisible();
  await expect(panel.locator(".legacy-workspace-tools-heading h3")).toHaveText(config.section);
  await expect(panel.locator(".legacy-workspace-tools-action.is-active strong")).toHaveText(config.action);

  return panel;
}

test.describe("top navigation smoke", () => {
  test("logs into production on desktop instead of auto-opening Website Feed", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await page.getByLabel("Email").fill(SMOKE_EMAIL);
    await page.getByLabel("Password").fill(SMOKE_PASSWORD);
    await page.getByRole("button", { name: "Enter Premier Marine", exact: true }).click();

    const storePicker = page.getByRole("dialog");
    await expect(storePicker).toBeVisible();
    await storePicker.locator(".store-card").first().click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
    await expect(page.getByText("Website Feed Command Center", { exact: true })).toHaveCount(0);
    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(0);
    await expect(page.locator(".legacy-workspace-empty-canvas")).toBeVisible();
  });

  test("keeps saved top tabs through relogin and lands on desktop instead of Website Feed", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "General Ledger").click();
    await expect(menuButton(page, "Chart of Accounts")).toBeVisible();
    await menuButton(page, "Chart of Accounts").click({ button: "right" });
    await expect(page.locator(".legacy-launch-strip .legacy-launch-button").first().locator("strong")).toHaveText("Chart of Accounts");
    await menuButton(page, "General Ledger").click();
    await expect(page.locator(".tab-menu")).toHaveCount(0);

    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);

    const storeId = await restoreSession(page, request);
    await page.goto("/login", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(new RegExp(`/dashboard/${storeId}/desktop$`));
    await expect(page.locator(".legacy-launch-strip .legacy-launch-button").first().locator("strong")).toHaveText("Chart of Accounts");
    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(0);
    await expect(page.getByText("Website Feed Command Center", { exact: true })).toHaveCount(0);
    await expect(page.locator(".legacy-workspace-empty-canvas")).toBeVisible();
  });

  test("keeps production quick-launch slots blank and Open Windows empty until assigned", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    const initialQuickLaunchLabels = await page.locator(".legacy-launch-strip .legacy-launch-button strong").allTextContents();

    expect(initialQuickLaunchLabels.length).toBeGreaterThan(0);
    expect(initialQuickLaunchLabels.every((label) => label.trim() === "")).toBeTruthy();
    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(0);

    await menuButton(page, "Application").click();
    await expect(menuButton(page, "Favorites")).toBeVisible();
    await menuButton(page, "Favorites").hover();
    await expect(menuButton(page, "My Workspaces")).toBeVisible();
    await menuButton(page, "My Workspaces").hover();
    await expect(menuButton(page, "Pinned Workspaces")).toBeVisible();
    await menuButton(page, "Pinned Workspaces").hover();
    await expect(menuButton(page, "Favorite Service Board")).toBeVisible();
    await menuButton(page, "Favorite Service Board").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/service$/);
    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(1);
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Favorite Service Board");

    const postNavigationQuickLaunchLabels = await page.locator(".legacy-launch-strip .legacy-launch-button strong").allTextContents();

    expect(postNavigationQuickLaunchLabels.length).toBeGreaterThan(0);
    expect(postNavigationQuickLaunchLabels.every((label) => label.trim() === "")).toBeTruthy();

    await menuButton(page, "Application").click();
    await menuButton(page, "Favorites").hover();
    await menuButton(page, "My Workspaces").hover();
    await menuButton(page, "Pinned Workspaces").hover();
    await menuButton(page, "Favorite Service Board").click({ button: "right" });
    await expect(page.locator(".legacy-launch-strip .legacy-launch-button").first().locator("strong")).toHaveText("Favorite Service Board");
    await menuButton(page, "Application").click();
    await expect(page.locator(".tab-menu")).toHaveCount(0);

    await page.locator(".legacy-open-windows .legacy-window-link").click({ button: "right" });
    await expect(page.locator(".legacy-open-windows .legacy-window-link-context-button")).toHaveText("X");
    await page.locator(".legacy-open-windows .legacy-window-link-context-button").click();
    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(0);
    await expect(page.locator(".legacy-workspace-empty-canvas")).toBeVisible();
  });

  test("clearing all Open Windows also clears the active production page", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "Application").click();
    await menuButton(page, "Favorites").hover();
    await menuButton(page, "My Workspaces").hover();
    await menuButton(page, "Pinned Workspaces").hover();
    await menuButton(page, "Favorite Service Board").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/service$/);
    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(1);

    await page.getByRole("button", { name: "Clear All", exact: true }).click();

    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(0);
    await expect(page.locator(".legacy-workspace-empty-canvas")).toBeVisible();
  });

  test("clearing Website Feed from Open Windows stays blank after refresh", async ({ page, request }) => {
    const storeId = await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Website Publishing")).toBeVisible();
    await menuButton(page, "Website Publishing").hover();
    await expect(menuButton(page, "Website Feed")).toBeVisible();
    await menuButton(page, "Website Feed").click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/${storeId}/website$`));
    await expect(page.getByText("Website Feed Command Center", { exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Website Feed");

    await page.getByRole("button", { name: "Clear All", exact: true }).click();

    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(0);
    await expect(page.getByText("Website Feed Command Center", { exact: true })).toHaveCount(0);
    await expect(page.locator(".legacy-workspace-empty-canvas")).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });

    await expect(page).toHaveURL(new RegExp(`/dashboard/${storeId}/website$`));
    await expect(page.locator(".legacy-open-windows .legacy-window-link")).toHaveCount(0);
    await expect(page.getByText("Website Feed Command Center", { exact: true })).toHaveCount(0);
    await expect(page.locator(".legacy-workspace-empty-canvas")).toBeVisible();
  });

  test("opens the new management activity leaf from the Management Activity menu", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Management Activity").click();
    await expect(menuButton(page, "Managements Activitie's")).toBeVisible();
    await expect(menuButton(page, "Cashier Accountability")).toBeVisible();
    await expect(menuButton(page, "Cashier Reconciliation")).toBeVisible();
    await menuButton(page, "Managements Activitie's").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=management-activities$/);
    await expect(page.getByRole("heading", { name: "Management Activities", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Needs Attention/, exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /Show Filters/, exact: false })).toBeVisible();
    await expect(page.getByText("Oldest Issue", { exact: false })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Age", exact: true })).toBeVisible();
    await expect(page.locator(".workflow-panel")).toHaveCount(0);
  });

  test("opens cashier accountability from the Management Activity menu", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Management Activity").click();
    await expect(menuButton(page, "Cashier Accountability")).toBeVisible();
    await menuButton(page, "Cashier Accountability").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=cashier-accountability$/);
    await expect(page.getByRole("heading", { name: "Cashier Accountability", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Find Matching Data/, exact: false })).toBeVisible();
    await expect(page.getByText("Matching Operators", { exact: true })).toBeVisible();
    await expect(page.locator(".workflow-panel")).toHaveCount(0);
  });

  test("removes default-page branches and keeps page-routed leaves in production nav", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "Application").click();
    await expect(menuButton(page, "Workspace Tools")).toHaveCount(0);
    await expect(menuButton(page, "Recent Reports")).toHaveCount(0);
    await expect(menuButton(page, "Lock Screen")).toHaveCount(0);
    await expect(menuButton(page, "Recent Documents")).toBeVisible();
    await menuButton(page, "Recent Documents").hover();
    await expect(menuButton(page, "Service Documents")).toBeVisible();
    await menuButton(page, "Service Documents").hover();
    await expect(menuButton(page, "Repair Intake")).toBeVisible();
    await menuButton(page, "Repair Intake").hover();
    await expect(menuButton(page, "Estimate Worksheets")).toBeVisible();

    await menuButton(page, "Receivables").click();
    await expect(menuButton(page, "AR Aging Doc")).toBeVisible();
    await expect(menuButton(page, "Customer Accounts")).toHaveCount(0);

    await menuButton(page, "Parts").click();
    await expect(menuButton(page, "Inventory Control")).toBeVisible();
    await menuButton(page, "Inventory Control").hover();
    await expect(menuButton(page, "Stock Visibility")).toBeVisible();
    await expect(menuButton(page, "Inventory Updating")).toBeVisible();
    await menuButton(page, "Inventory Updating").hover();
    await expect(menuButton(page, "Update Part Prices Using Escalators")).toBeVisible();
    await expect(menuButton(page, "Part Number Utility")).toBeVisible();
    await menuButton(page, "Stock Visibility").hover();
    await expect(menuButton(page, "Parts Inventory")).toBeVisible();
    await expect(menuButton(page, "Lookup Tools")).toHaveCount(0);

    await menuButton(page, "Service").click();
    await expect(menuButton(page, "Order Intake")).toBeVisible();
    await menuButton(page, "Order Intake").hover();
    await expect(menuButton(page, "Estimates & Repair Orders")).toBeVisible();
    await expect(menuButton(page, "Write-Up")).toHaveCount(0);
    await expect(menuButton(page, "Lists & Reporting")).toBeVisible();
    await menuButton(page, "Lists & Reporting").hover();
    await expect(menuButton(page, "Technician Workload")).toBeVisible();
    await expect(menuButton(page, "Performance Reports")).toHaveCount(0);

    await menuButton(page, "Inventory").click();
    await expect(menuButton(page, "Units")).toBeVisible();
    await menuButton(page, "Units").hover();
    await expect(menuButton(page, "Boat Inventory")).toBeVisible();
    await expect(menuButton(page, "Boat Stock")).toHaveCount(0);

    await menuButton(page, "Sales").click();
    await expect(menuButton(page, "Lead Desk")).toBeVisible();
    await menuButton(page, "Lead Desk").hover();
    await expect(menuButton(page, "Follow-Up Queues")).toBeVisible();
    await menuButton(page, "Follow-Up Queues").hover();
    await expect(menuButton(page, "Leads, Quotes & Deals")).toBeVisible();
    await expect(menuButton(page, "Open Pipeline")).toHaveCount(0);

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Access & Security")).toHaveCount(0);
    await expect(menuButton(page, "Automation & Configuration")).toHaveCount(0);
    await expect(menuButton(page, "Audit & Integrations")).toHaveCount(0);
    await expect(menuButton(page, "Website Publishing")).toBeVisible();
    await expect(menuButton(page, "Lead & Sync")).toHaveCount(0);
    await menuButton(page, "Website Publishing").hover();
    await expect(menuButton(page, "Website Feed")).toBeVisible();
    await expect(menuButton(page, "Feed Delivery")).toHaveCount(0);
    await expect(menuButton(page, "Publishing Exceptions")).toHaveCount(0);
    await expect(menuButton(page, "Feed Health")).toHaveCount(0);
    await expect(menuButton(page, "Dealers")).toBeVisible();
    await menuButton(page, "Dealers").hover();
    await expect(menuButton(page, "Dealer Setup")).toBeVisible();
    await expect(menuButton(page, "Operation")).toBeVisible();
    await menuButton(page, "Operation").hover();
    await expect(menuButton(page, "My Stores")).toBeVisible();
    await expect(menuButton(page, "Connect")).toBeVisible();
    await menuButton(page, "Connect").hover();
    await expect(menuButton(page, "Connection Points")).toBeVisible();
    await expect(menuButton(page, "Development")).toBeVisible();
    await menuButton(page, "Development").hover();
    await expect(menuButton(page, "Sandbox")).toBeVisible();
    await expect(menuButton(page, "Tools")).toBeVisible();
    await menuButton(page, "Tools").hover();
    await expect(menuButton(page, "ForgeForm")).toBeVisible();
    await menuButton(page, "Development").hover();
    await menuButton(page, "Sandbox").click();
    await expect(page.getByRole("heading", { name: "Sandboxes", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Sandbox");

    await expect(menuButton(page, "Help")).toHaveCount(0);
  });

  test("opens AR Aging Doc from Receivables and lets it pin to the top strip", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await expect(menuButton(page, "Receivables")).toBeVisible();
    await menuButton(page, "Receivables").click();
    await expect(menuButton(page, "AR Aging Doc")).toBeVisible();
    await menuButton(page, "AR Aging Doc").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=ar-aging-doc$/);
    await expect(page.getByRole("heading", { name: "AR Aging Report", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate AR Aging report", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Generate AR Aging report", exact: true }).click();
    await expect(page.getByText("A/R Aging Report", { exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("AR Aging Doc");

    await menuButton(page, "Receivables").click();
    await expect(menuButton(page, "AR Aging Doc")).toBeVisible();
    await menuButton(page, "AR Aging Doc").click({ button: "right" });
    await expect(page.locator(".legacy-launch-strip .legacy-launch-button").first().locator("strong")).toHaveText("AR Aging Doc");
    await menuButton(page, "Receivables").click();
    await expect(page.locator(".tab-menu")).toHaveCount(0);
  });

  test("opens Dealer Setup from the System menu", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Dealers")).toBeVisible();
    await menuButton(page, "Dealers").hover();
    await expect(menuButton(page, "Dealer Setup")).toBeVisible();
    await menuButton(page, "Dealer Setup").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=dealer-setup$/);
    await expect(page.getByRole("heading", { name: "Dealer Setup", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Dealer", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Northside Auto Group", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Dealer Setup");
  });

  test("opens ForgeForm from the System menu", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Tools")).toBeVisible();
    await menuButton(page, "Tools").hover();
    await expect(menuButton(page, "ForgeForm")).toBeVisible();
    await menuButton(page, "ForgeForm").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=forgeform$/);
    await expect(page.getByRole("heading", { name: "ForgeForm", exact: true })).toBeVisible();
    await expect(page.getByText("PDF Library", { exact: true })).toBeVisible();
    await expect(page.getByText("Purchase Packet and Consignment Packets and Trade Packets", { exact: true }).first()).toBeVisible();
  });

  test("opens Parts Inventory Update from the System menu and reopens it from a saved top tab", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Data Updating")).toBeVisible();
    await menuButton(page, "Data Updating").hover();
    await expect(menuButton(page, "Parts Inventory Update")).toBeVisible();
    await menuButton(page, "Parts Inventory Update").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=parts-inventory-update$/);
    await expect(page.getByRole("heading", { name: "Parts Inventory Update Statements", exact: true })).toBeVisible();
    await expect(page.locator(".parts-update-list-found-count")).toContainText("Found");
    await expect(page.locator(".legacy-open-windows")).toContainText("Parts Inventory Update");

    await menuButton(page, "System").click();
    await menuButton(page, "Data Updating").hover();
    await expect(menuButton(page, "Parts Inventory Update")).toBeVisible();
    await menuButton(page, "Parts Inventory Update").click({ button: "right" });
    await expect(page.locator(".legacy-launch-strip .legacy-launch-button").first().locator("strong")).toHaveText("Parts Inventory Update");

    await menuButton(page, "Application").click();
    await expect(menuButton(page, "View")).toBeVisible();
    await menuButton(page, "View").hover();
    await expect(menuButton(page, "Workspace Surface")).toBeVisible();
    await menuButton(page, "Workspace Surface").hover();
    await expect(menuButton(page, "Desktop Shell")).toBeVisible();
    await menuButton(page, "Desktop Shell").hover();
    await expect(menuButton(page, "Desktop")).toBeVisible();
    await menuButton(page, "Desktop").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
    await page.locator(".legacy-launch-strip .legacy-launch-button").first().click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=parts-inventory-update$/);
    await expect(page.getByRole("heading", { name: "Parts Inventory Update Statements", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows")).toContainText("Parts Inventory Update");
  });

  test("opens Parts Inventory Update detail and shows a separate Open Windows entry", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await menuButton(page, "Data Updating").hover();
    await expect(menuButton(page, "Parts Inventory Update")).toBeVisible();
    await menuButton(page, "Parts Inventory Update").click();

    await expect(page.getByRole("heading", { name: "Parts Inventory Update Statements", exact: true })).toBeVisible();
    await page.locator(".parts-update-list-table tbody tr").nth(1).click();
    await page.getByRole("button", { name: "Detail", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=parts-inventory-update-detail&statementId=parts-update-1$/);
    await expect(page.getByRole("heading", { name: "Parts Inventory Update - BE-CLEAR BINS ON INACTIVE PARTS BMT", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Designer", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "History", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Calculated Fields", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows")).toContainText("Parts Inventory Update");
    await expect(page.locator(".legacy-open-windows")).toContainText("Parts Inventory Update - BE-CLEAR BINS ON INACTIVE PARTS BMT");
  });

  test("renames a Parts Inventory Update row inline and carries the new title into detail windows", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await menuButton(page, "Data Updating").hover();
    await expect(menuButton(page, "Parts Inventory Update")).toBeVisible();
    await menuButton(page, "Parts Inventory Update").click();

    await expect(page.getByRole("heading", { name: "Parts Inventory Update Statements", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "New", exact: true }).click();

    const firstNameCell = page.locator(".parts-update-list-table tbody tr").first().locator("td").first();
    await expect(firstNameCell.locator(".parts-update-list-name-input")).toBeVisible();
    await firstNameCell.locator(".parts-update-list-name-input").press("Escape");
    await expect(firstNameCell).toContainText("BE-NEW PARTS UPDATE BMT");

    await firstNameCell.dblclick();
    await expect(firstNameCell.locator(".parts-update-list-name-input")).toBeVisible();
    await firstNameCell.locator(".parts-update-list-name-input").fill("PW-ROW INLINE TITLE");
    await firstNameCell.locator(".parts-update-list-name-input").press("Enter");

    await expect(firstNameCell).toContainText("PW-ROW INLINE TITLE");
    await page.getByRole("button", { name: "Detail", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=parts-inventory-update-detail&statementId=/);
    await expect(page.getByRole("heading", { name: "Parts Inventory Update - PW-ROW INLINE TITLE", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows")).toContainText("Parts Inventory Update - PW-ROW INLINE TITLE");
  });

  test("shows menu-only System branches without routing them to a default page", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    const initialUrl = page.url();

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Customers")).toBeVisible();
    await expect(menuButton(page, "System Alerts")).toBeVisible();
    await expect(menuButton(page, "Lists")).toBeVisible();
    await expect(menuButton(page, "Data Updating")).toBeVisible();
    await expect(menuButton(page, "Custom Reports")).toBeVisible();
    await expect(menuButton(page, "All Custom Reports")).toBeVisible();
    await expect(menuButton(page, "Spreadsheet Reports")).toBeVisible();

    await menuButton(page, "Customers").click();
    await expect(page).toHaveURL(initialUrl);

    await menuButton(page, "System").click();

    await menuButton(page, "Lists").hover();
    await expect(menuButton(page, "Paid-Out Types")).toBeVisible();
    await expect(menuButton(page, "Warranty Companies")).toBeVisible();

    await menuButton(page, "Tools").hover();
    await expect(menuButton(page, "Vendor Merge")).toBeVisible();
    await expect(menuButton(page, "Spell Check Dictionary")).toBeVisible();

    await menuButton(page, "Data Updating").hover();
    await expect(menuButton(page, "Parts Inventory Update")).toBeVisible();
    await expect(menuButton(page, "Major Unit Inventory Update")).toBeVisible();

    await menuButton(page, "Custom Reports").hover();
    await expect(menuButton(page, "Credit Card Logging")).toBeVisible();
    await expect(menuButton(page, "Workstation Info")).toBeVisible();
  });

  test("dealer setup onboarding wizard supports OEM multi-select, collapsible cards, guided setup steps, and structured billing", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await menuButton(page, "Dealers").hover();
    await menuButton(page, "Dealer Setup").click();

    await page.getByRole("button", { name: "Add Dealer", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Dealer onboarding wizard", exact: true })).toBeVisible();
    await expect(page.getByText("Select All Brands", { exact: true })).toBeVisible();

    const oemCards = page.locator(".dealer-setup-checkbox-card");
    await expect(oemCards).toHaveCount(7);
    await page.getByRole("button", { name: "Select All Brands", exact: true }).click();
    await expect(oemCards.locator('input[type="checkbox"]')).toHaveCount(7);
    for (const checkbox of await oemCards.locator('input[type="checkbox"]').all()) {
      await expect(checkbox).toBeChecked();
    }

    await page.getByRole("button", { name: "Continue to Stores", exact: true }).click();

    const firstStoreCard = page.locator(".dealer-setup-store-draft-card").first();
    await expect(firstStoreCard.getByText("Dealer ID pending", { exact: false })).toHaveCount(0);
    await firstStoreCard.getByRole("button", { name: "Collapse", exact: true }).click();
    await expect(firstStoreCard.getByLabel("Store Name", { exact: true })).toHaveCount(0);
    await expect(firstStoreCard.getByText("DLR-PBC-1001", { exact: true })).toBeVisible();
    await firstStoreCard.getByRole("button", { name: "Expand", exact: true }).click();
    await expect(firstStoreCard.getByLabel("Store Name", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Continue to Modules", exact: true }).click();
    await expect(page.getByText("How to read this step", { exact: true })).toBeVisible();
    await expect(page.getByText("Recommended day-one stack", { exact: true })).toBeVisible();
    await expect(page.getByText("Sales, Service, Parts", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Continue to Integrations", exact: true }).click();
    await expect(page.getByText("Connection strategy", { exact: true })).toBeVisible();
    await expect(page.getByText("Minimum launch requirement", { exact: true })).toBeVisible();
    await expect(page.getByText("DMS + Accounting", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Continue to Users", exact: true }).click();

    const firstSeatCard = page.locator(".dealer-setup-seat-card").first();
    await firstSeatCard.getByRole("button", { name: "Collapse", exact: true }).click();
    await expect(firstSeatCard.getByLabel("Full Name", { exact: true })).toHaveCount(0);
    await expect(firstSeatCard.getByText("Store Director", { exact: true })).toBeVisible();

    const secondSeatCard = page.locator(".dealer-setup-seat-card").nth(1);
    await secondSeatCard.locator("select").first().selectOption("CEO");
    await expect(secondSeatCard.locator("select").first()).toHaveValue("CEO");

    await page.getByRole("button", { name: "Continue to Billing", exact: true }).click();
    await expect(page.getByText("Contract Structure", { exact: true })).toBeVisible();
    await expect(page.getByText("Billing Contact & Delivery", { exact: true })).toBeVisible();
    await expect(page.getByText("Settlement & Finance Notes", { exact: true })).toBeVisible();
    await expect(page.getByText("Commercial Upgrades", { exact: true })).toBeVisible();

    await page.locator(".dealer-setup-billing-section").first().locator("select").nth(1).selectOption("24");
    await expect(page.getByText(/24 month term/, { exact: false })).toBeVisible();
  });

  test("dealer setup onboarding persists a created dealer after reload", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    const uniqueSuffix = `${Date.now()}`;
    const dealerName = `Smoke Marine Group ${uniqueSuffix}`;
    const companyId = `COMP-SMOKE-${uniqueSuffix}`;
    const dealerCode = `SMOKE-${uniqueSuffix}`;

    await menuButton(page, "System").click();
    await menuButton(page, "Dealers").hover();
    await menuButton(page, "Dealer Setup").click();

    await page.getByRole("button", { name: "Add Dealer", exact: true }).click();
    await page.getByLabel("DBA Name", { exact: true }).fill(dealerName);
    await page.getByLabel("Company ID", { exact: true }).fill(companyId);
    await page.getByLabel("Company Code", { exact: true }).fill(dealerCode);

    await page.getByRole("button", { name: "Continue to Stores", exact: true }).click();
    await page.getByRole("button", { name: "Continue to Modules", exact: true }).click();
    await page.getByRole("button", { name: "Continue to Integrations", exact: true }).click();
    await page.getByRole("button", { name: "Continue to Users", exact: true }).click();
    await page.getByRole("button", { name: "Continue to Billing", exact: true }).click();
    await page.getByRole("button", { name: "Continue to Review", exact: true }).click();
    await page.getByRole("button", { name: "Create Dealer", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Dealer onboarding wizard", exact: true })).toHaveCount(0);
    await expect(page.locator(".dealer-setup-config-header h3")).toHaveText(dealerName);

    await page.reload({ waitUntil: "networkidle" });

    const persistedDealerButton = page.locator(".dealer-setup-tree-button", { hasText: dealerName });
    await expect(persistedDealerButton).toBeVisible();
    await persistedDealerButton.click();
    await expect(page.locator(".dealer-setup-config-header h3")).toHaveText(dealerName);
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await expect(page.locator(".dealer-setup-profile-card", { hasText: "Company ID" }).getByText(companyId, { exact: true })).toBeVisible();
  });

  test("opens My Stores from the System menu", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Operation")).toBeVisible();
    await menuButton(page, "Operation").hover();
    await expect(menuButton(page, "My Stores")).toBeVisible();
    await menuButton(page, "My Stores").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=my-stores$/);
    await expect(page.getByRole("heading", { name: "My Stores", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request Change", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Downtown Motors", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("My Stores");
  });

  test("opens Connection Points from the System menu", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Connect")).toBeVisible();
    await menuButton(page, "Connect").hover();
    await expect(menuButton(page, "Connection Points")).toBeVisible();
    await menuButton(page, "Connection Points").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=connection-points$/);
    await expect(page.getByRole("heading", { name: "Connection Points", exact: true })).toBeVisible();
    const searchButton = page.getByRole("button", { name: "Search Connections", exact: true });
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Popular Connections", exact: true })).toBeVisible();

    await page.getByPlaceholder("Search connections...").fill("toast");
    await searchButton.click();

    await expect(page.locator(".my-pos-search-note p")).toContainText("1 verified connection point ready for \"toast\"");
    const cafeKioskRow = page.locator(".my-pos-connection-card", {
      has: page.getByRole("heading", { name: "Cafe Kiosk 01", exact: true })
    });
    await expect(cafeKioskRow).toBeVisible();
    await expect(page.getByRole("heading", { name: "Front Counter 02", exact: true })).toHaveCount(0);

    const cafeKioskButton = cafeKioskRow.locator(".my-pos-card-action");

    if (await cafeKioskButton.isEnabled()) {
      await cafeKioskButton.click();
    }

    await expect(cafeKioskRow.locator(".my-pos-card-header .legacy-chip")).toContainText("Review Queued");

    await page.reload({ waitUntil: "networkidle" });

    const reloadedCafeKioskRow = page.locator(".my-pos-connection-card", {
      has: page.getByRole("heading", { name: "Cafe Kiosk 01", exact: true })
    });
    await expect(reloadedCafeKioskRow.locator(".my-pos-card-header .legacy-chip")).toContainText("Review Queued");
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Connection Points");
  });

  test("opens Vendor Invoice from the Payables menu", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "Payables").click();
    await expect(menuButton(page, "Vendor Invoice")).toBeVisible();
    await menuButton(page, "Vendor Invoice").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-invoice$/);
    await expect(page.getByRole("heading", { name: "Vendor Invoice", exact: true })).toBeVisible();
    await expect(page.getByText("Distribution Info", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Vendor Invoice");
  });

  test("opens Vendor List from the Payables menu and reopens it from a saved top tab", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "Payables").click();
    await expect(menuButton(page, "Vendor List")).toBeVisible();
    await menuButton(page, "Vendor List").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-list$/);
    await expect(page.getByRole("heading", { name: "Vendor List", exact: true })).toBeVisible();
    await expect(page.locator(".vendor-list-found-count")).toContainText("Found");
    await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Vendor List");

    await menuButton(page, "Payables").click();
    await expect(menuButton(page, "Vendor List")).toBeVisible();
    await menuButton(page, "Vendor List").click({ button: "right" });
    await expect(page.locator(".legacy-launch-strip .legacy-launch-button").first().locator("strong")).toHaveText("Vendor List");

    await menuButton(page, "Application").click();
    await expect(menuButton(page, "View")).toBeVisible();
    await menuButton(page, "View").hover();
    await expect(menuButton(page, "Workspace Surface")).toBeVisible();
    await menuButton(page, "Workspace Surface").hover();
    await expect(menuButton(page, "Desktop Shell")).toBeVisible();
    await menuButton(page, "Desktop Shell").hover();
    await expect(menuButton(page, "Desktop")).toBeVisible();
    await menuButton(page, "Desktop").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
    await page.locator(".legacy-launch-strip .legacy-launch-button").first().click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-list$/);
    await expect(page.getByRole("heading", { name: "Vendor List", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows")).toContainText("Vendor List");
  });

  test("opens Vendor detail from Vendor List and shows the vendor name in Open Windows", async ({ page, request }) => {
    await openWorkspace(page, request, "desktop");

    await menuButton(page, "Payables").click();
    await expect(menuButton(page, "Vendor List")).toBeVisible();
    await menuButton(page, "Vendor List").click();

    await expect(page.getByRole("heading", { name: "Vendor List", exact: true })).toBeVisible();
    await page.locator(".vendor-list-table tbody tr").first().click();
    await page.getByRole("button", { name: "Detail", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-detail&vendorId=vendor-0$/);
    await expect(page.getByRole("heading", { name: "Vendor - DO NOT USE HUNTINGTON NATIONAL BANK", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "General", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Attachments", exact: true })).toBeVisible();
    await expect(page.locator(".legacy-open-windows")).toContainText("Vendor List");
    await expect(page.locator(".legacy-open-windows")).toContainText("Vendor - DO NOT USE HUNTINGTON NATIONAL BANK");
  });

  test("opens deal posting from the General Ledger menu", async ({ page, request }) => {
    await expect(menuButton(page, "View")).toBeVisible();
    await menuButton(page, "View").hover();
    await expect(menuButton(page, "Operator Rails")).toBeVisible();
    await menuButton(page, "Operator Rails").hover();
    await expect(menuButton(page, "Productivity Rails")).toBeVisible();
    await menuButton(page, "Productivity Rails").hover();
    await expect(menuButton(page, "Task Queue Monitor")).toBeVisible();
    await menuButton(page, "Task Queue Monitor").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
    await assertWorkflowPanel(page, {
      title: "Task Queue Monitor",
      fields: ["Queue Scope", "Owner Focus", "Queue Note"],
      primaryAction: "Open Queue Review"
    });
    await submitWorkflow(page, "Task queue review queued.");

    await menuButton(page, "Application").click();
    await expect(menuButton(page, "Workspace Tools")).toBeVisible();
    await menuButton(page, "Workspace Tools").hover();
    await expect(menuButton(page, "Setup")).toBeVisible();
    await menuButton(page, "Setup").hover();
    await expect(menuButton(page, "Personal Setup")).toBeVisible();
    await menuButton(page, "Personal Setup").hover();
    await expect(menuButton(page, "Preferences")).toBeVisible();
    await menuButton(page, "Preferences").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
    await assertWorkspaceToolsPanel(page, {
      section: "Setup",
      action: "Preferences"
    });

    await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/desktop$/, "/sales") : "/", { waitUntil: "networkidle" });
    await menuButton(page, "Help").click();
    await expect(menuButton(page, "Quick Start")).toBeVisible();
    await menuButton(page, "Quick Start").hover();
    await expect(menuButton(page, "First Day")).toBeVisible();
    await menuButton(page, "First Day").hover();
    await expect(menuButton(page, "Core Orientation")).toBeVisible();
    await menuButton(page, "Core Orientation").hover();
    await expect(menuButton(page, "Operator Guide")).toBeVisible();
    await menuButton(page, "Operator Guide").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
    await assertWorkflowPanel(page, {
      title: "Operator Guide",
      fields: ["Guide Type", "Audience", "Guide Note"],
      primaryAction: "Open Guide"
    });
    await submitWorkflow(page, "Operator guide queued.");
  });

  test("opens split favorite and setup flows across sales, service, and parts", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Sales").click();
    await expect(menuButton(page, "Favorites")).toBeVisible();
    await menuButton(page, "Favorites").hover();
    await expect(menuButton(page, "My Sales Views")).toBeVisible();
    await menuButton(page, "My Sales Views").hover();
    await expect(menuButton(page, "Favorite Boards")).toBeVisible();
    await menuButton(page, "Favorite Boards").hover();
    await expect(menuButton(page, "Favorite Deal Desk")).toBeVisible();
    await menuButton(page, "Favorite Deal Desk").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/sales$/);
    await assertWorkflowPanel(page, {
      title: "Favorite Deal Desk",
      fields: ["Favorite", "Owner", "Recall Window"],
      primaryAction: "Open Favorite"
    });
    await submitWorkflow(page, "Favorite Deal Desk queued.");

    await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/sales$/, "/service") : "/", { waitUntil: "networkidle" });
    await menuButton(page, "Service").click();
    await expect(menuButton(page, "Favorites")).toBeVisible();
    await menuButton(page, "Favorites").hover();
    await expect(menuButton(page, "My Service Views")).toBeVisible();
    await menuButton(page, "My Service Views").hover();
    await expect(menuButton(page, "Favorite Boards")).toBeVisible();
    await menuButton(page, "Favorite Boards").hover();
    await expect(menuButton(page, "Favorite Dispatch Board")).toBeVisible();
    await menuButton(page, "Favorite Dispatch Board").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/service$/);
    await assertWorkflowPanel(page, {
      title: "Favorite Dispatch Board",
      fields: ["Favorite", "Owner", "Recall Window"],
      primaryAction: "Open Favorite"
    });
    await submitWorkflow(page, "Favorite Dispatch Board queued.");

    await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/service$/, "/parts") : "/", { waitUntil: "networkidle" });
    await menuButton(page, "Parts").click();
    await expect(menuButton(page, "Administration & Setup")).toBeVisible();
    await menuButton(page, "Administration & Setup").hover();
    await expect(menuButton(page, "Security & Policy")).toBeVisible();
    await menuButton(page, "Security & Policy").hover();
    await expect(menuButton(page, "Permission Controls")).toBeVisible();
    await menuButton(page, "Permission Controls").hover();
    await expect(menuButton(page, "Counter Permissions")).toBeVisible();
    await menuButton(page, "Counter Permissions").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/parts$/);
    await expect(page.getByText("Parts Ordering Workbench", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Task Queue", exact: true })).toHaveCount(0);
    await assertWorkflowPanel(page, {
      title: "Counter Permissions",
      fields: ["Security Area", "Owner", "Effective Window"],
      primaryAction: "Queue Security Review"
    });
    await submitWorkflow(page, "Counter Permissions queued.");
  });

  test("opens sales, service, and parts shared workflow leaves from the top navigation", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Sales").click();
    await expect(menuButton(page, "Administration & Setup")).toBeVisible();
    await menuButton(page, "Administration & Setup").hover();
    await expect(menuButton(page, "Desk Setup")).toBeVisible();
    await menuButton(page, "Desk Setup").hover();
    await expect(menuButton(page, "Sales Desk")).toBeVisible();
    await menuButton(page, "Sales Desk").hover();
    await expect(menuButton(page, "Salesperson Assignment")).toBeVisible();
    await menuButton(page, "Salesperson Assignment").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/sales$/);
    await assertWorkflowPanel(page, {
      title: "Salesperson Assignment",
      fields: ["Setup Area", "Owner", "Effective Window"],
      primaryAction: "Queue Setup Review"
    });
    await submitWorkflow(page, "Salesperson Assignment queued.");

    await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/sales$/, "/service") : "/", { waitUntil: "networkidle" });
    await menuButton(page, "Service").click();
    await expect(menuButton(page, "Queue & Dispatch")).toBeVisible();
    await menuButton(page, "Queue & Dispatch").hover();
    await expect(menuButton(page, "Shop Control")).toBeVisible();
    await menuButton(page, "Shop Control").hover();
    await expect(menuButton(page, "Dispatch Planning")).toBeVisible();
    await menuButton(page, "Dispatch Planning").hover();
    await expect(menuButton(page, "Dispatch Board")).toBeVisible();
    await menuButton(page, "Dispatch Board").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/service$/);
    await assertWorkflowPanel(page, {
      title: "Dispatch Board",
      fields: ["Dispatch View", "Owner", "Window"],
      primaryAction: "Open Dispatch Review"
    });
    await submitWorkflow(page, "Dispatch Board queued.");

    await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/service$/, "/parts") : "/", { waitUntil: "networkidle" });
    await menuButton(page, "Parts").click();
    await expect(menuButton(page, "Purchasing")).toBeVisible();
    await menuButton(page, "Purchasing").hover();
    await expect(menuButton(page, "Replenishment")).toBeVisible();
    await menuButton(page, "Replenishment").hover();
    await expect(menuButton(page, "Daily Ordering")).toBeVisible();
    await menuButton(page, "Daily Ordering").hover();
    await expect(menuButton(page, "Purchase Order Queue")).toBeVisible();
    await menuButton(page, "Purchase Order Queue").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/parts$/);
    await assertWorkflowPanel(page, {
      title: "Purchase Order Queue",
      fields: ["Purchasing Queue", "Supplier", "Due Window"],
      primaryAction: "Open Purchasing Review"
    });
    await submitWorkflow(page, "Purchase Order Queue queued.");
  });

  test("opens additional Application and Help release flows from the top navigation", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Application").click();
    await expect(menuButton(page, "Recent Documents")).toBeVisible();
    await menuButton(page, "Recent Documents").hover();
    await expect(menuButton(page, "Sales Documents")).toBeVisible();
    await menuButton(page, "Sales Documents").hover();
    await expect(menuButton(page, "Desk Files")).toBeVisible();
    await menuButton(page, "Desk Files").hover();
    await expect(menuButton(page, "Pending Quotes")).toBeVisible();
    await menuButton(page, "Pending Quotes").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/sales$/);
    await assertWorkflowPanel(page, {
      title: "Pending Quotes",
      fields: ["Customer", "Unit", "Target Price"],
      primaryAction: "Review Quotes"
    });
    await submitWorkflow(page, "Pending Quotes queued.");

    await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/sales$/, "/desktop") : "/", { waitUntil: "networkidle" });
    await menuButton(page, "Help").click();
    await expect(menuButton(page, "Release Center")).toBeVisible();
    await menuButton(page, "Release Center").hover();
    await expect(menuButton(page, "Demo & Training")).toBeVisible();
    await menuButton(page, "Demo & Training").hover();
    await expect(menuButton(page, "Training Assets")).toBeVisible();
    await menuButton(page, "Training Assets").hover();
    await expect(menuButton(page, "Release Webinar")).toBeVisible();
    await menuButton(page, "Release Webinar").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
    await assertWorkflowPanel(page, {
      title: "Release Webinar",
      fields: ["Release Track", "Audience", "Brief Note"],
      primaryAction: "Open Webinar"
    });
    await submitWorkflow(page, "Release Webinar queued.");
  });
});
