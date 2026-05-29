export interface SandboxBackendModule {
  detail: string;
  name: string;
  sourceFiles: string[];
}

export const sandboxBackendModules: SandboxBackendModule[] = [
  {
    detail: "Dashboard payload and workspace route handlers that shape store-scoped app shell responses across website, sales, service, parts, desktop, analytics, and audit surfaces.",
    name: "Dashboard + Workspace API Routes",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Planner logic for menu-driven submit actions, queued task messages, and activity detail generation used across workspaces.",
    name: "Workflow Action Plans",
    sourceFiles: ["apps/api/src/workflowActionPlans.ts", "apps/api/src/workflowActionPlans.test.ts"]
  },
  {
    detail: "Store-scoped CRM contacts, conversations, outbound SMS actions, inbound thread hydration, and quick-info mutations for Communicate.",
    name: "CRM Communicate Backend",
    sourceFiles: ["apps/api/src/crmCommunicate.ts", "apps/api/src/server.ts"]
  },
  {
    detail: "Twilio credential resolution, request signing, inbound/status webhook handling, and outbound message payload shaping.",
    name: "Twilio Messaging Flows",
    sourceFiles: ["apps/api/src/twilioMessaging.ts", "apps/api/src/server.ts"]
  },
  {
    detail: "Service lane notification builders that derive customer, technician, parts-received, and promise-risk alerts from live service rows.",
    name: "Service Notification Rules",
    sourceFiles: ["apps/api/src/serviceNotifications.ts", "apps/api/src/serviceNotifications.test.ts"]
  },
  {
    detail: "Normalized service-order detail snapshots, mutation rules, labor/job linkage, duplicate/create flows, and part catalog shaping.",
    name: "Service Order Detail",
    sourceFiles: ["apps/api/src/serviceOrderDetail.ts", "apps/api/src/serviceOrderDetail.test.ts", "apps/api/src/server.ts"]
  },
  {
    detail: "Sales deal deposit ledger retrieval, cashier deposit creation, and receipt/reprint activity actions tied to deal-level accounting flows.",
    name: "Sales Deal Deposits",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Shared task queue and activity-log routes that record backend workflow execution across website, service, sales, parts, and audit flows.",
    name: "Task + Activity Ledger",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Task SLA preview, copy, reset, and action routes that drive audit-side policy management for queued backend work.",
    name: "Task SLA Policies",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Cashier accountability reporting endpoints that aggregate operator activity by day, user, and action window for store audit review.",
    name: "Cashier Accountability Report",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Technician workload reporting that groups repair orders, jobs, and labor sessions into available, billed, and credited hour summaries.",
    name: "Technician Workload Report",
    sourceFiles: ["apps/api/src/server.ts", "apps/api/src/serviceOrderDetail.ts"]
  },
  {
    detail: "Vendor list and maintenance endpoints used by parts-side purchasing and supplier management workflows.",
    name: "Vendor Management APIs",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Pricing-rule retrieval and mutation endpoints that back inventory pricing controls and downstream merchandising decisions.",
    name: "Pricing Rules APIs",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Approval request endpoints and status updates used by management review flows before pricing, inventory, or process changes are promoted.",
    name: "Approval Workflows",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Boat inventory CRUD and search endpoints that drive unit-level inventory state, merchandising fields, and downstream website payloads.",
    name: "Boat Inventory APIs",
    sourceFiles: ["apps/api/src/server.ts"]
  },
  {
    detail: "Prisma schema plus seed routines that define persisted store, CRM, website, service, inventory, task, and audit records used by the backend.",
    name: "Prisma + Seed Data",
    sourceFiles: ["packages/database/prisma/schema.prisma", "packages/database/prisma/seed.ts", "apps/api/src/seed.ts"]
  }
];