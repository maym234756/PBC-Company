# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\test\topNavSmoke.spec.ts >> top navigation smoke >> opens deal posting from the General Ledger menu
- Location: apps\web\test\topNavSmoke.spec.ts:793:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.legacy-menu-row .top-tabs').getByRole('button', { name: 'View', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.legacy-menu-row .top-tabs').getByRole('button', { name: 'View', exact: true })

```

# Test source

```ts
  694 |     await expect(searchButton).toBeVisible();
  695 |     await expect(searchButton).toBeEnabled();
  696 |     await expect(page.getByRole("heading", { name: "Popular Connections", exact: true })).toBeVisible();
  697 | 
  698 |     await page.getByPlaceholder("Search connections...").fill("toast");
  699 |     await searchButton.click();
  700 | 
  701 |     await expect(page.locator(".my-pos-search-note p")).toContainText("1 verified connection point ready for \"toast\"");
  702 |     const cafeKioskRow = page.locator(".my-pos-connection-card", {
  703 |       has: page.getByRole("heading", { name: "Cafe Kiosk 01", exact: true })
  704 |     });
  705 |     await expect(cafeKioskRow).toBeVisible();
  706 |     await expect(page.getByRole("heading", { name: "Front Counter 02", exact: true })).toHaveCount(0);
  707 | 
  708 |     const cafeKioskButton = cafeKioskRow.locator(".my-pos-card-action");
  709 | 
  710 |     if (await cafeKioskButton.isEnabled()) {
  711 |       await cafeKioskButton.click();
  712 |     }
  713 | 
  714 |     await expect(cafeKioskRow.locator(".my-pos-card-header .legacy-chip")).toContainText("Review Queued");
  715 | 
  716 |     await page.reload({ waitUntil: "networkidle" });
  717 | 
  718 |     const reloadedCafeKioskRow = page.locator(".my-pos-connection-card", {
  719 |       has: page.getByRole("heading", { name: "Cafe Kiosk 01", exact: true })
  720 |     });
  721 |     await expect(reloadedCafeKioskRow.locator(".my-pos-card-header .legacy-chip")).toContainText("Review Queued");
  722 |     await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Connection Points");
  723 |   });
  724 | 
  725 |   test("opens Vendor Invoice from the Payables menu", async ({ page, request }) => {
  726 |     await openWorkspace(page, request, "desktop");
  727 | 
  728 |     await menuButton(page, "Payables").click();
  729 |     await expect(menuButton(page, "Vendor Invoice")).toBeVisible();
  730 |     await menuButton(page, "Vendor Invoice").click();
  731 | 
  732 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-invoice$/);
  733 |     await expect(page.getByRole("heading", { name: "Vendor Invoice", exact: true })).toBeVisible();
  734 |     await expect(page.getByText("Distribution Info", { exact: true })).toBeVisible();
  735 |     await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  736 |     await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Vendor Invoice");
  737 |   });
  738 | 
  739 |   test("opens Vendor List from the Payables menu and reopens it from a saved top tab", async ({ page, request }) => {
  740 |     await openWorkspace(page, request, "desktop");
  741 | 
  742 |     await menuButton(page, "Payables").click();
  743 |     await expect(menuButton(page, "Vendor List")).toBeVisible();
  744 |     await menuButton(page, "Vendor List").click();
  745 | 
  746 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-list$/);
  747 |     await expect(page.getByRole("heading", { name: "Vendor List", exact: true })).toBeVisible();
  748 |     await expect(page.locator(".vendor-list-found-count")).toContainText("Found");
  749 |     await expect(page.locator(".legacy-open-windows .legacy-window-link-copy")).toHaveText("Vendor List");
  750 | 
  751 |     await menuButton(page, "Payables").click();
  752 |     await expect(menuButton(page, "Vendor List")).toBeVisible();
  753 |     await menuButton(page, "Vendor List").click({ button: "right" });
  754 |     await expect(page.locator(".legacy-launch-strip .legacy-launch-button").first().locator("strong")).toHaveText("Vendor List");
  755 | 
  756 |     await menuButton(page, "Application").click();
  757 |     await expect(menuButton(page, "View")).toBeVisible();
  758 |     await menuButton(page, "View").hover();
  759 |     await expect(menuButton(page, "Workspace Surface")).toBeVisible();
  760 |     await menuButton(page, "Workspace Surface").hover();
  761 |     await expect(menuButton(page, "Desktop Shell")).toBeVisible();
  762 |     await menuButton(page, "Desktop Shell").hover();
  763 |     await expect(menuButton(page, "Desktop")).toBeVisible();
  764 |     await menuButton(page, "Desktop").click();
  765 | 
  766 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
  767 |     await page.locator(".legacy-launch-strip .legacy-launch-button").first().click();
  768 | 
  769 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-list$/);
  770 |     await expect(page.getByRole("heading", { name: "Vendor List", exact: true })).toBeVisible();
  771 |     await expect(page.locator(".legacy-open-windows")).toContainText("Vendor List");
  772 |   });
  773 | 
  774 |   test("opens Vendor detail from Vendor List and shows the vendor name in Open Windows", async ({ page, request }) => {
  775 |     await openWorkspace(page, request, "desktop");
  776 | 
  777 |     await menuButton(page, "Payables").click();
  778 |     await expect(menuButton(page, "Vendor List")).toBeVisible();
  779 |     await menuButton(page, "Vendor List").click();
  780 | 
  781 |     await expect(page.getByRole("heading", { name: "Vendor List", exact: true })).toBeVisible();
  782 |     await page.locator(".vendor-list-table tbody tr").first().click();
  783 |     await page.getByRole("button", { name: "Detail", exact: true }).click();
  784 | 
  785 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/analytics\?view=vendor-detail&vendorId=vendor-0$/);
  786 |     await expect(page.getByRole("heading", { name: "Vendor - DO NOT USE HUNTINGTON NATIONAL BANK", exact: true })).toBeVisible();
  787 |     await expect(page.getByRole("tab", { name: "General", exact: true })).toBeVisible();
  788 |     await expect(page.getByRole("tab", { name: "Attachments", exact: true })).toBeVisible();
  789 |     await expect(page.locator(".legacy-open-windows")).toContainText("Vendor List");
  790 |     await expect(page.locator(".legacy-open-windows")).toContainText("Vendor - DO NOT USE HUNTINGTON NATIONAL BANK");
  791 |   });
  792 | 
  793 |   test("opens deal posting from the General Ledger menu", async ({ page, request }) => {
> 794 |     await expect(menuButton(page, "View")).toBeVisible();
      |                                            ^ Error: expect(locator).toBeVisible() failed
  795 |     await menuButton(page, "View").hover();
  796 |     await expect(menuButton(page, "Operator Rails")).toBeVisible();
  797 |     await menuButton(page, "Operator Rails").hover();
  798 |     await expect(menuButton(page, "Productivity Rails")).toBeVisible();
  799 |     await menuButton(page, "Productivity Rails").hover();
  800 |     await expect(menuButton(page, "Task Queue Monitor")).toBeVisible();
  801 |     await menuButton(page, "Task Queue Monitor").click();
  802 | 
  803 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
  804 |     await assertWorkflowPanel(page, {
  805 |       title: "Task Queue Monitor",
  806 |       fields: ["Queue Scope", "Owner Focus", "Queue Note"],
  807 |       primaryAction: "Open Queue Review"
  808 |     });
  809 |     await submitWorkflow(page, "Task queue review queued.");
  810 | 
  811 |     await menuButton(page, "Application").click();
  812 |     await expect(menuButton(page, "Workspace Tools")).toBeVisible();
  813 |     await menuButton(page, "Workspace Tools").hover();
  814 |     await expect(menuButton(page, "Setup")).toBeVisible();
  815 |     await menuButton(page, "Setup").hover();
  816 |     await expect(menuButton(page, "Personal Setup")).toBeVisible();
  817 |     await menuButton(page, "Personal Setup").hover();
  818 |     await expect(menuButton(page, "Preferences")).toBeVisible();
  819 |     await menuButton(page, "Preferences").click();
  820 | 
  821 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
  822 |     await assertWorkspaceToolsPanel(page, {
  823 |       section: "Setup",
  824 |       action: "Preferences"
  825 |     });
  826 | 
  827 |     await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/desktop$/, "/sales") : "/", { waitUntil: "networkidle" });
  828 |     await menuButton(page, "Help").click();
  829 |     await expect(menuButton(page, "Quick Start")).toBeVisible();
  830 |     await menuButton(page, "Quick Start").hover();
  831 |     await expect(menuButton(page, "First Day")).toBeVisible();
  832 |     await menuButton(page, "First Day").hover();
  833 |     await expect(menuButton(page, "Core Orientation")).toBeVisible();
  834 |     await menuButton(page, "Core Orientation").hover();
  835 |     await expect(menuButton(page, "Operator Guide")).toBeVisible();
  836 |     await menuButton(page, "Operator Guide").click();
  837 | 
  838 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/desktop$/);
  839 |     await assertWorkflowPanel(page, {
  840 |       title: "Operator Guide",
  841 |       fields: ["Guide Type", "Audience", "Guide Note"],
  842 |       primaryAction: "Open Guide"
  843 |     });
  844 |     await submitWorkflow(page, "Operator guide queued.");
  845 |   });
  846 | 
  847 |   test("opens split favorite and setup flows across sales, service, and parts", async ({ page, request }) => {
  848 |     await openWorkspace(page, request);
  849 | 
  850 |     await menuButton(page, "Sales").click();
  851 |     await expect(menuButton(page, "Favorites")).toBeVisible();
  852 |     await menuButton(page, "Favorites").hover();
  853 |     await expect(menuButton(page, "My Sales Views")).toBeVisible();
  854 |     await menuButton(page, "My Sales Views").hover();
  855 |     await expect(menuButton(page, "Favorite Boards")).toBeVisible();
  856 |     await menuButton(page, "Favorite Boards").hover();
  857 |     await expect(menuButton(page, "Favorite Deal Desk")).toBeVisible();
  858 |     await menuButton(page, "Favorite Deal Desk").click();
  859 | 
  860 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/sales$/);
  861 |     await assertWorkflowPanel(page, {
  862 |       title: "Favorite Deal Desk",
  863 |       fields: ["Favorite", "Owner", "Recall Window"],
  864 |       primaryAction: "Open Favorite"
  865 |     });
  866 |     await submitWorkflow(page, "Favorite Deal Desk queued.");
  867 | 
  868 |     await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/sales$/, "/service") : "/", { waitUntil: "networkidle" });
  869 |     await menuButton(page, "Service").click();
  870 |     await expect(menuButton(page, "Favorites")).toBeVisible();
  871 |     await menuButton(page, "Favorites").hover();
  872 |     await expect(menuButton(page, "My Service Views")).toBeVisible();
  873 |     await menuButton(page, "My Service Views").hover();
  874 |     await expect(menuButton(page, "Favorite Boards")).toBeVisible();
  875 |     await menuButton(page, "Favorite Boards").hover();
  876 |     await expect(menuButton(page, "Favorite Dispatch Board")).toBeVisible();
  877 |     await menuButton(page, "Favorite Dispatch Board").click();
  878 | 
  879 |     await expect(page).toHaveURL(/\/dashboard\/[^/]+\/service$/);
  880 |     await assertWorkflowPanel(page, {
  881 |       title: "Favorite Dispatch Board",
  882 |       fields: ["Favorite", "Owner", "Recall Window"],
  883 |       primaryAction: "Open Favorite"
  884 |     });
  885 |     await submitWorkflow(page, "Favorite Dispatch Board queued.");
  886 | 
  887 |     await page.goto(/dashboard/.test(page.url()) ? page.url().replace(/\/service$/, "/parts") : "/", { waitUntil: "networkidle" });
  888 |     await menuButton(page, "Parts").click();
  889 |     await expect(menuButton(page, "Administration & Setup")).toBeVisible();
  890 |     await menuButton(page, "Administration & Setup").hover();
  891 |     await expect(menuButton(page, "Security & Policy")).toBeVisible();
  892 |     await menuButton(page, "Security & Policy").hover();
  893 |     await expect(menuButton(page, "Permission Controls")).toBeVisible();
  894 |     await menuButton(page, "Permission Controls").hover();
```