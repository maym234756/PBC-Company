import { defineConfig } from "@playwright/test";

const webBaseUrl = process.env.MARINE_CLOUD_WEB_BASE_URL ?? "http://127.0.0.1:4177";
const apiBaseUrl = process.env.MARINE_CLOUD_API_BASE_URL ?? "http://127.0.0.1:4000/api";
const useExternalServers = Boolean(process.env.MARINE_CLOUD_WEB_BASE_URL || process.env.MARINE_CLOUD_API_BASE_URL);

export default defineConfig({
  testDir: "./test",
  testMatch: "topNavSmoke.spec.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  outputDir: "../../test-results/playwright",
  reporter: "list",
  use: {
    baseURL: webBaseUrl,
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
    viewport: {
      width: 1600,
      height: 1200
    }
  },
  webServer: useExternalServers
    ? undefined
    : [
        {
          command: "npm run dev",
          cwd: "../api",
          url: `${apiBaseUrl}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe"
        },
        {
          command: "npm run dev -- --host 127.0.0.1 --port 4177",
          url: webBaseUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
          env: {
            ...process.env,
            VITE_API_BASE_URL: apiBaseUrl
          }
        }
      ]
});