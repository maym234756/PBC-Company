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

test.describe("top navigation smoke", () => {
  test("opens statement requests from Receivables with a distinct queued action", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Receivables").click();
    await expect(menuButton(page, "Customer Accounts")).toBeVisible();
    await menuButton(page, "Customer Accounts").hover();
    await expect(menuButton(page, "Inquiry & Statements")).toBeVisible();
    await menuButton(page, "Inquiry & Statements").hover();
    await expect(menuButton(page, "Statement Services")).toBeVisible();
    await menuButton(page, "Statement Services").hover();
    await expect(menuButton(page, "Statement Requests")).toBeVisible();
    await menuButton(page, "Statement Requests").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics$/);
    await assertWorkflowPanel(page, {
      title: "Statement Requests",
      fields: ["Inquiry Type", "Contact Channel", "Follow-Up"],
      primaryAction: "Send Statement"
    });
    await submitWorkflow(page, "Statement request queued.");
  });

  test("opens payroll review from the Management Activity menu", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Management Activity").click();
    await expect(menuButton(page, "Digital & Workforce")).toBeVisible();
    await menuButton(page, "Digital & Workforce").hover();
    await expect(menuButton(page, "Payroll & People")).toBeVisible();
    await menuButton(page, "Payroll & People").hover();
    await expect(menuButton(page, "Payroll Review")).toBeVisible();
    await menuButton(page, "Payroll Review").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics$/);
    await assertWorkflowPanel(page, {
      title: "Payroll Review",
      fields: ["Exception Lens", "Review Owner", "Escalation Path"],
      primaryAction: "Run Payroll Audit"
    });
    await submitWorkflow(page, "Management exception review queued.");
  });

  test("opens receivables inquiry from the Receivables menu", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Receivables").click();
    await expect(menuButton(page, "Customer Accounts")).toBeVisible();
    await menuButton(page, "Customer Accounts").hover();
    await expect(menuButton(page, "Inquiry & Statements")).toBeVisible();
    await menuButton(page, "Inquiry & Statements").hover();
    await expect(menuButton(page, "Account Review")).toBeVisible();
    await menuButton(page, "Account Review").hover();
    await expect(menuButton(page, "Customer Inquiry")).toBeVisible();
    await menuButton(page, "Customer Inquiry").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics$/);
    await assertWorkflowPanel(page, {
      title: "Customer Inquiry",
      fields: ["Inquiry Type", "Contact Channel", "Follow-Up"],
      primaryAction: "Open Inquiry"
    });
    await submitWorkflow(page, "Customer inquiry queued.");
  });

  test("opens deal posting from the General Ledger menu", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "General Ledger").click();
    await expect(menuButton(page, "Posting Control")).toBeVisible();
    await menuButton(page, "Posting Control").hover();
    await expect(menuButton(page, "Deal & Funding")).toBeVisible();
    await menuButton(page, "Deal & Funding").hover();
    await expect(menuButton(page, "Posting Queue")).toBeVisible();
    await menuButton(page, "Posting Queue").hover();
    await expect(menuButton(page, "Deal Posting")).toBeVisible();
    await menuButton(page, "Deal Posting").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics$/);
    await assertWorkflowPanel(page, {
      title: "Deal Posting",
      fields: ["Posting Batch", "Posting Date", "Approver"],
      primaryAction: "Queue Posting"
    });
    await submitWorkflow(page, "Deal posting queued.");
  });

  test("opens website feed and audit trail from the System menu", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "System").click();
    await expect(menuButton(page, "Digital Operations")).toBeVisible();
    await menuButton(page, "Digital Operations").hover();
    await expect(menuButton(page, "Website Publishing")).toBeVisible();
    await menuButton(page, "Website Publishing").hover();
    await expect(menuButton(page, "Feed Delivery")).toBeVisible();
    await menuButton(page, "Feed Delivery").hover();
    await expect(menuButton(page, "Website Feed")).toBeVisible();
    await menuButton(page, "Website Feed").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/website$/);
    await assertWorkflowPanel(page, {
      title: "Website Feed",
      fields: ["Brand / Site", "Feed Window", "Feed Intent", "System Note"],
      primaryAction: "Queue Feed Push"
    });
    await submitWorkflow(page, "Website feed publish queued.");

    await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/website$/, "/sales") : "/", { waitUntil: "networkidle" });
    await menuButton(page, "System").click();
    await expect(menuButton(page, "Audit & Integrations")).toBeVisible();
    await menuButton(page, "Audit & Integrations").hover();
    await expect(menuButton(page, "Audit Logs")).toBeVisible();
    await menuButton(page, "Audit Logs").hover();
    await expect(menuButton(page, "System Audit")).toBeVisible();
    await menuButton(page, "System Audit").hover();
    await expect(menuButton(page, "Audit Trail")).toBeVisible();
    await menuButton(page, "Audit Trail").click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+\/audit$/);
    await assertWorkflowPanel(page, {
      title: "Audit Trail",
      fields: ["Audit Scope", "Audit Owner", "Audit Notes"],
      primaryAction: "Open Audit Review"
    });
    await submitWorkflow(page, "System audit review queued.");
  });

  test("opens Application and Help behavior flows instead of only navigating", async ({ page, request }) => {
    await openWorkspace(page, request);

    await menuButton(page, "Application").click();
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
    await assertWorkflowPanel(page, {
      title: "Preferences",
      fields: ["Setup Focus", "Owner Focus", "Setup Note"],
      primaryAction: "Open Personal Setup"
    });
    await submitWorkflow(page, "Preferences queued.");

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