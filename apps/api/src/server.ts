import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@marine-cloud/database";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";
import {
  applyServiceOrderDetailMutation,
  buildServiceOrderPartCatalog,
  initializeServiceOrder,
  resolveServiceOrderDetail,
  serializeServiceOrderDetail,
  type ServiceOrderActivityEntry,
  type ServiceOrderDetailPayload,
  type ServiceOrderDetailMutation,
  type ServiceOrderTaskEntry,
  type ServiceOrderWorkspaceRow
} from "./serviceOrderDetail.js";
import { buildServiceWorkspaceNotifications } from "./serviceNotifications.js";
import {
  createCrmCommunicateThread,
  getCrmCommunicatePayload,
  recordInboundTwilioMessage,
  recordTwilioMessageStatus,
  sendCrmConversationSms,
  updateCrmContactQuickInfo
} from "./crmCommunicate.js";
import {
  TWILIO_INBOUND_WEBHOOK_PATH,
  TWILIO_STATUS_WEBHOOK_PATH,
  buildTwilioMessagePayload,
  getTwilioAuthorizationHeader,
  getTwilioMessagesEndpoint,
  getTwilioMessagingConfig,
  getTwilioMissingConfig,
  getTwilioWebhookUrl,
  validateTwilioRequestSignature
} from "./twilioMessaging.js";
import { sandboxBackendModules } from "./sandboxBackendModules.js";
import {
  authenticateSandboxLogin,
  createSandboxRecord,
  createSandboxTemplateRecord,
  deleteSandboxTemplateRecord,
  getSandboxLoginAccess,
  getSandboxPromotionPreview,
  getSandboxWorkspacePayload,
  pushSandboxChangesToProduction,
  runSandboxAction,
  updateSandboxRecord,
  updateSandboxTemplateRecord
} from "./sandboxWorkspace.js";
import { resolveWorkflowActionPlan } from "./workflowActionPlans.js";

const serverModuleDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverModuleDirectory, "../../../.env") });
dotenv.config({ path: path.resolve(serverModuleDirectory, "../.env"), override: true });

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const allowedOrigins = new Set([webOrigin, "http://localhost:5173", "http://127.0.0.1:5173"]);
const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
const authLoginAttempts = new Map<string, { count: number; resetAt: number }>();
const authLoginWindowMs = 60_000;
const authLoginMaxAttempts = 60;
type DealerSetupPersistedLocation = {
  address: string;
  id: string;
  label: string;
  launchReadiness: number;
  moduleLabel: string;
  status: string;
  [key: string]: unknown;
};

type DealerSetupPersistedModule = {
  enabled: boolean;
  id: string;
  label: string;
  [key: string]: unknown;
};

type DealerSetupPersistedIntegration = {
  id: string;
  label: string;
  note?: string;
  owner?: string;
  status: string;
  [key: string]: unknown;
};

type DealerSetupPersistedPermissionRow = {
  accounting: boolean;
  crm?: boolean;
  id?: string;
  inventory?: boolean;
  parts: boolean;
  permission?: string;
  role?: string;
  sales: boolean;
  service: boolean;
  [key: string]: unknown;
};

type DealerSetupPersistedActivityItem = {
  detail: string;
  id: string;
  label?: string;
  timeLabel?: string;
  timestamp?: string;
  tone?: string;
  user?: string;
  [key: string]: unknown;
};

type DealerSetupPersistedChecklistItem = {
  detail: string;
  id: string;
  label: string;
  tone: string;
  [key: string]: unknown;
};

type DealerSetupPersistedImportStage = {
  complete: number;
  id: string;
  label: string;
  total: number;
  [key: string]: unknown;
};

type DealerSetupPersistedDealer = {
  activity: DealerSetupPersistedActivityItem[];
  checklist: DealerSetupPersistedChecklistItem[];
  dealerId: string;
  goLive: string;
  groupLabel: string;
  id: string;
  importStages: DealerSetupPersistedImportStage[];
  integration: string;
  integrations: DealerSetupPersistedIntegration[];
  legalEntity: string;
  locations: DealerSetupPersistedLocation[];
  modules: DealerSetupPersistedModule[];
  name: string;
  nextSteps: string[];
  permissionRows: DealerSetupPersistedPermissionRow[];
  progressPercent: number;
  region: string;
  rooftopCode: string;
  status: string;
  timeZone: string;
  usersCount: number;
  website: string;
  [key: string]: unknown;
};

const dealerSetupPersistedDealersByStoreId = new Map<string, DealerSetupPersistedDealer[]>();

function cloneDealerSetupPersistedValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const VISIBLE_NAVIGATION_KEYS = new Set([
  "application:desktop",
  "application:estimate worksheets",
  "application:favorite desktop",
  "application:favorite service board",
  "application:favorite parts board",
  "application:favorite sales board",
  "application:favorite executive board",
  "application:favorite website feed",
  "application:favorite audit trail",
  "application:switch store",
  "application:logout",
  "application:exit",
  "parts:parts inventory",
  "service:estimate worksheets",
  "service:estimates & repair orders",
  "service:technician workload",
  "inventory:boat inventory",
  "sales:leads, quotes & deals",
  "crm:communicate",
  "management activity:managements activitie's",
  "management activity:cashier accountability",
  "management activity:cashier reconciliation",
  "management activity:desktop",
  "management activity:executive board",
  "management activity:website activity",
  "management activity:audit trail",
  "payables:finovo",
  "receivables:ar aging doc",
  "general ledger:chart of accounts",
  "general ledger:profit & loss",
  "system:website feed",
  "system:dealer setup",
  "system:sandbox",
  "system:forgeform"
]);

type NavigationItem = string | { label: string; items?: NavigationItem[]; keywords?: string[] };
type NavigationGroup = { label: string; items: NavigationItem[] };

function filterNavigationItems(groupLabel: string, items: NavigationItem[]): NavigationItem[] {
  return items.reduce<NavigationItem[]>((nextItems, item) => {
    if (typeof item === "string") {
      if (VISIBLE_NAVIGATION_KEYS.has(`${groupLabel}:${item}`.toLowerCase())) {
        nextItems.push(item);
      }

      return nextItems;
    }

    if (Array.isArray(item.items)) {
      const nextBranchItems = filterNavigationItems(groupLabel, item.items);

      if (nextBranchItems.length > 0) {
        nextItems.push({ ...item, items: nextBranchItems });
      }

      return nextItems;
    }

    if (VISIBLE_NAVIGATION_KEYS.has(`${groupLabel}:${item.label}`.toLowerCase())) {
      nextItems.push(item);
    }

    return nextItems;
  }, []);
}

function filterNavigationGroups(groups: NavigationGroup[]): NavigationGroup[] {
  return groups.reduce<NavigationGroup[]>((nextGroups, group) => {
    const nextItems = filterNavigationItems(group.label, group.items);

    if (nextItems.length > 0) {
      nextGroups.push({ ...group, items: nextItems });
    }

    return nextGroups;
  }, []);
}

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);

    return (protocol === "http:" || protocol === "https:") && localHostnames.has(hostname);
  } catch {
    return false;
  }
}

const navigation = filterNavigationGroups([
  {
    label: "Application",
    items: [
      {
        label: "View",
        items: [
          {
            label: "Workspace Surface",
            items: [
              {
                label: "Desktop Shell",
                items: ["Desktop", "Open Windows"]
              },
              {
                label: "Command Center",
                items: ["Command Search", "Workspace Overview"]
              }
            ]
          },
          {
            label: "Operator Rails",
            items: [
              {
                label: "Productivity Rails",
                items: ["Activity Snapshot", "Task Queue Monitor"]
              },
              {
                label: "Inbox & Search",
                items: ["Notification Center", "Search Results"]
              }
            ]
          },
          {
            label: "Store Scope",
            items: [
              {
                label: "Store Pulse",
                items: ["Store Status Board", "Operator Status Board"]
              }
            ]
          }
        ]
      },
      {
        label: "Recent Documents",
        items: [
          {
            label: "Sales Documents",
            items: [
              {
                label: "Desk Files",
                items: ["Sales Deal Jackets", "Pending Quotes"]
              },
              {
                label: "Delivery Files",
                items: ["Delivery Packets"]
              }
            ]
          },
          {
            label: "Service Documents",
            items: [
              {
                label: "Repair Intake",
                items: ["Repair Orders", "Estimate Worksheets"]
              },
              {
                label: "Warranty Files",
                items: ["Warranty Packets"]
              }
            ]
          },
          {
            label: "Parts Documents",
            items: [
              {
                label: "Counter Files",
                items: ["Parts Purchase Orders", "Special Order Slips"]
              },
              {
                label: "Receiving Controls",
                items: ["Receiving Exceptions"]
              }
            ]
          },
          {
            label: "Control Documents",
            items: [
              {
                label: "Operational Controls",
                items: ["Audit Notes", "Exception Logs", "Workflow Checklists"]
              }
            ]
          }
        ]
      },
      {
        label: "Recent Reports",
        items: [
          {
            label: "Executive Reports",
            items: [
              {
                label: "Leadership Pulse",
                items: ["Executive Snapshot", "Cash Pulse"]
              },
              {
                label: "Store Scorecards",
                items: ["Store Scorecard"]
              }
            ]
          },
          {
            label: "Sales Reports",
            items: [
              {
                label: "Desk Metrics",
                items: ["Sales Velocity", "Lead Source Mix", "Desk Productivity"]
              }
            ]
          },
          {
            label: "Service Reports",
            items: [
              {
                label: "Service Lane",
                items: ["Service Promise Board", "Technician Load"]
              },
              {
                label: "Risk Watch",
                items: ["Comeback Watch"]
              }
            ]
          },
          {
            label: "Parts Reports",
            items: [
              {
                label: "Parts Metrics",
                items: ["Parts Fill Rate", "Vendor Performance"]
              },
              {
                label: "Aging Risk",
                items: ["Obsolescence Watch"]
              }
            ]
          }
        ]
      },
      {
        label: "Workspace Tools",
        items: [
          {
            label: "Window Control",
            items: [
              {
                label: "Window Layout",
                items: ["Pinned Windows", "Window Layout Presets"]
              },
              {
                label: "Reset Actions",
                items: ["Workspace Reset"]
              }
            ]
          },
          {
            label: "Alerts & Notices",
            items: [
              {
                label: "Operator Inbox",
                items: ["Notifications", "Follow-Up Prompts"]
              },
              {
                label: "Exception Review",
                items: ["Exception Inbox"]
              }
            ]
          },
          {
            label: "Store Operations",
            items: [
              {
                label: "Store Operations Board",
                items: ["Store Summary", "Store Roster", "Shift Notes"]
              }
            ]
          },
          {
            label: "Setup",
            items: [
              {
                label: "Personal Setup",
                items: ["Preferences", "Personal Shortcuts"]
              },
              {
                label: "Launch Setup",
                items: ["Quick Launch Setup"]
              }
            ]
          }
        ]
      },
      {
        label: "Favorites",
        items: [
          {
            label: "My Workspaces",
            items: [
              {
                label: "Pinned Workspaces",
                items: ["Favorite Desktop", "Favorite Service Board", "Favorite Parts Board", "Favorite Sales Board"]
              }
            ]
          },
          {
            label: "My Dashboards",
            items: [
              {
                label: "Pinned Dashboards",
                items: ["Favorite Executive Board", "Favorite Website Feed", "Favorite Audit Trail"]
              }
            ]
          }
        ]
      },
      "Switch Store",
      "Lock Screen",
      "Logout",
      "Exit"
    ]
  },
  {
    label: "Parts",
    items: [
      {
        label: "Inventory Control",
        items: [
          {
            label: "Stock Visibility",
            items: [
              "Parts Inventory",
              {
                label: "Lookup Tools",
                items: ["Part Number Lookup"]
              },
              {
                label: "Cross-Reference Search",
                items: ["Secondary Number Lookup", "Description Search"]
              }
            ]
          },
          {
            label: "Inventory Accuracy",
            items: [
              {
                label: "Count Verification",
                items: ["Cycle Counts", "Bin Location Review"]
              },
              {
                label: "Adjustment Control",
                items: ["On-Hand Adjustments", "Stock Status Review"]
              }
            ]
          },
          {
            label: "Pricing & Availability",
            items: [
              {
                label: "Pricing Review",
                items: ["Price Matrix Review", "Stocking Class Review"]
              },
              {
                label: "Availability Watch",
                items: ["Availability Watch", "Substitute Parts"]
              }
            ]
          }
        ]
      },
      {
        label: "Purchasing",
        items: [
          {
            label: "Replenishment",
            items: [
              {
                label: "Daily Ordering",
                items: ["Ordering", "Purchase Order Queue"]
              },
              {
                label: "Urgent Movement",
                items: ["Emergency Buy", "Transfer Requests"]
              }
            ]
          },
          {
            label: "Special Procurement",
            items: [
              {
                label: "Customer Orders",
                items: ["Special Orders", "Backorder Review"]
              },
              {
                label: "Direct Fulfillment",
                items: ["Drop Ship Requests", "Supplier Follow-Up"]
              }
            ]
          },
          {
            label: "Vendor Management",
            items: [
              {
                label: "Supplier Coverage",
                items: ["Preferred Vendor Matrix", "Supplier Scorecards"]
              },
              {
                label: "Lead Time & Claims",
                items: ["Vendor Lead Times", "Open Vendor Claims"]
              }
            ]
          }
        ]
      },
      {
        label: "Receiving & Returns",
        items: [
          {
            label: "Dock Flow",
            items: [
              {
                label: "Receiving Queue",
                items: ["Receiving", "Receipt Match Queue"]
              },
              {
                label: "Dock Exceptions",
                items: ["Vendor Discrepancies", "Core Tracking"]
              }
            ]
          },
          {
            label: "Returns",
            items: [
              {
                label: "Vendor Returns",
                items: ["Vendor Returns", "Warranty Returns"]
              },
              {
                label: "Authorizations",
                items: ["Return Authorizations", "Damaged Goods Hold"]
              }
            ]
          },
          {
            label: "Exception Control",
            items: [
              {
                label: "Receiving Audit",
                items: ["Packing Slip Variances", "Receipt Audit Trail"]
              },
              {
                label: "Core Follow-Up",
                items: ["Missing Core Follow-Up", "Freight Damage Review"]
              }
            ]
          }
        ]
      },
      {
        label: "Counter & Tickets",
        items: [
          {
            label: "Customer Counter",
            items: [
              {
                label: "Counter Entry",
                items: ["Cashiering", "Counter Sale Entry"]
              },
              {
                label: "Pickup & Quotes",
                items: ["Will Call Queue", "Quote Builder"]
              }
            ]
          },
          {
            label: "Service Support",
            items: [
              {
                label: "Technician Support",
                items: ["Technician Parts Requests", "Open Pick Tickets"]
              },
              {
                label: "Install Staging",
                items: ["Install Prep Queue", "Service Parts Staging"]
              }
            ]
          },
          {
            label: "Ticket Controls",
            items: [
              {
                label: "Held Tickets",
                items: ["Hold Tickets", "Pending Invoice Review"]
              },
              {
                label: "Closeout & Refunds",
                items: ["Counter Closeout", "Refund Approvals"]
              }
            ]
          }
        ]
      },
      {
        label: "Lists & Reporting",
        items: [
          {
            label: "Operational Lists",
            items: [
              {
                label: "Printed Lists",
                items: ["Lists", "Bin Labels", "Cycle Count Sheets"]
              },
              {
                label: "Update Queue",
                items: ["Price Update Queue"]
              }
            ]
          },
          {
            label: "Performance Reports",
            items: [
              {
                label: "Performance Pack",
                items: ["Reports", "Fill Rate Summary", "Lost Sales Report"]
              },
              {
                label: "Obsolescence & Custom",
                items: ["Obsolescence Report", "Custom Reports"]
              }
            ]
          },
          {
            label: "Financial Reports",
            items: [
              {
                label: "Margin Review",
                items: ["Gross Margin Detail", "Counter Closeout Summary"]
              },
              {
                label: "Returns & Spend",
                items: ["Return Activity Report", "Vendor Spend Analysis"]
              }
            ]
          },
          {
            label: "Scheduled Output",
            items: [
              {
                label: "Report Sets",
                items: ["Saved Report Sets", "Scheduled Report Runs"]
              },
              {
                label: "Delivery History",
                items: ["Report Delivery Queue", "Export History"]
              }
            ]
          }
        ]
      },
      {
        label: "Administration & Setup",
        items: [
          {
            label: "Catalog Maintenance",
            items: [
              {
                label: "Catalog Updates",
                items: ["Vendor Catalog Sync", "Supersession Review"]
              },
              {
                label: "Assemblies",
                items: ["Kit Assemblies", "Accessory Bundles"]
              }
            ]
          },
          {
            label: "Security & Policy",
            items: [
              {
                label: "Permission Controls",
                items: ["Counter Permissions", "Approval Limits"]
              },
              {
                label: "Overrides & Access",
                items: ["Parts Overrides", "Role Access Review"]
              }
            ]
          },
          {
            label: "Department Setup",
            items: [
              {
                label: "Pricing Setup",
                items: ["Tax & Fee Setup", "Core Charge Table"]
              },
              {
                label: "Discount & Forms",
                items: ["Discount Rules", "Print Form Layouts"]
              }
            ]
          }
        ]
      },
      {
        label: "Utilities",
        items: [
          {
            label: "Barcode & Labels",
            items: [
              {
                label: "Label Printing",
                items: ["Barcode Utilities", "Label Reprint Queue"]
              },
              {
                label: "Shelf & Bin Labels",
                items: ["Bin Label Designer", "Shelf Tag Runs"]
              }
            ]
          },
          {
            label: "Import & Export",
            items: [
              {
                label: "File Intake",
                items: ["Import Staging", "Vendor File Drops"]
              },
              {
                label: "Outbound Files",
                items: ["Export Queue", "Price File Updates"]
              }
            ]
          },
          {
            label: "Housekeeping",
            items: [
              {
                label: "Archive & Purge",
                items: ["Archive Closed Tickets", "Purge Temp Holds"]
              },
              {
                label: "Merge & Reindex",
                items: ["Merge Duplicate Parts", "Rebuild Search Index"]
              }
            ]
          }
        ]
      },
      {
        label: "Favorites",
        items: [
          {
            label: "My Parts Views",
            items: [
              {
                label: "Favorite Boards",
                items: ["Favorite Parts Board", "Favorite Receiving Queue"]
              },
              {
                label: "Favorite Queues",
                items: ["Favorite PO Queue", "Favorite Parts Reports"]
              }
            ]
          },
          {
            label: "My Shortcuts",
            items: [
              {
                label: "Supplier Favorites",
                items: ["Favorite Vendor Scorecards", "Favorite Catalog Sync"]
              },
              {
                label: "Performance Favorites",
                items: ["Favorite Fill Rate View", "Favorite Counter Closeout"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: "Service",
    items: [
      {
        label: "Order Intake",
        items: [
          "Estimates & Repair Orders",
          {
            label: "Write-Up",
            items: [
              {
                label: "Service Intake",
                items: ["New Estimate", "New Repair Order"]
              },
              {
                label: "Open Orders",
                items: ["Express Write-Up"]
              }
            ]
          },
          {
            label: "Customer Arrival",
            items: [
              {
                label: "Arrival Queue",
                items: ["Check-In Board", "Unit Intake Photos"]
              },
              {
                label: "Promise & Pickup",
                items: ["Promise Date Entry", "Pickup Appointment Queue"]
              }
            ]
          }
        ]
      },
      {
        label: "Queue & Dispatch",
        items: [
          {
            label: "Status Queues",
            items: [
              {
                label: "Repair Queue",
                items: ["Repair Order Queue", "Customer Reply", "Tech Complete"]
              },
              {
                label: "Parts Queue",
                items: ["Parts Received", "Parts Hold"]
              }
            ]
          },
          {
            label: "Shop Control",
            items: [
              {
                label: "Dispatch Planning",
                items: ["Dispatch Board", "Bay Schedule"]
              },
              {
                label: "Production Watch",
                items: ["Work In Progress", "Promise Date Watch"]
              }
            ]
          }
        ]
      },
      {
        label: "Workbench & Detail",
        items: [
          {
            label: "RO Workbench",
            items: [
              {
                label: "Order Detail",
                items: ["Repair Order Detail", "Job Workbench"]
              },
              {
                label: "Labor & Recommendations",
                items: ["Labor Sessions", "Recommendations Queue"]
              }
            ]
          },
          {
            label: "Document Actions",
            items: [
              {
                label: "Output Queue",
                items: ["Print Service Packet", "Report Queue", "Detail Review"]
              },
              {
                label: "Duplicate Control",
                items: ["Duplicate RO"]
              }
            ]
          }
        ]
      },
      {
        label: "Technician & Shop",
        items: [
          {
            label: "Labor Control",
            items: [
              {
                label: "Time Tracking",
                items: ["Technician Time Entry", "Clocked Hours Review"]
              },
              {
                label: "Productivity Review",
                items: ["Flat Rate Review", "Technician Productivity"]
              }
            ]
          },
          {
            label: "Quality Control",
            items: [
              {
                label: "Final Review",
                items: ["Final Inspection", "Delivery Prep Queue"]
              },
              {
                label: "Sea Trial Risk",
                items: ["Sea Trial Checklist", "Comeback Watch"]
              }
            ]
          }
        ]
      },
      {
        label: "Warranty & Claims",
        items: [
          {
            label: "Claim Processing",
            items: [
              {
                label: "Carrier Intake",
                items: ["Warranty Claims", "Pre-Authorization Queue"]
              },
              {
                label: "Submission Status",
                items: ["Carrier Submission Queue", "Claim Status Review"]
              }
            ]
          },
          {
            label: "Recovery Tracking",
            items: [
              {
                label: "Recovery Review",
                items: ["Warranty Receivables", "Deductible Review"]
              },
              {
                label: "Delay Audit",
                items: ["Delayed Claim Watch", "Claim Audit Trail"]
              }
            ]
          }
        ]
      },
      {
        label: "Customer Communication",
        items: [
          {
            label: "Approvals & Replies",
            items: [
              {
                label: "Approval Queue",
                items: ["Approval Needed Queue", "Customer Reply Monitor"]
              },
              {
                label: "Pickup Updates",
                items: ["Pickup Ready Queue", "Status Update Log"]
              }
            ]
          },
          {
            label: "Notifications",
            items: [
              {
                label: "Alert Inbox",
                items: ["Notification Rail", "Unread Service Alerts"]
              },
              {
                label: "Risk Follow-Up",
                items: ["Promise Risk Alerts", "Follow-Up Callbacks"]
              }
            ]
          }
        ]
      },
      {
        label: "Lists & Reporting",
        items: [
          {
            label: "Operational Lists",
            items: [
              {
                label: "Open Order Lists",
                items: ["Lists", "Open Estimates List", "Open RO Aging"]
              },
              {
                label: "Assignment Sheets",
                items: ["Technician Assignment Sheet"]
              }
            ]
          },
          {
            label: "Performance Reports",
            items: [
              {
                label: "Time & Promise",
                items: ["Reports", "Elapsed Time Summary", "Promise-Date Performance"]
              },
              {
                label: "Warranty Throughput",
                items: ["Warranty Throughput", "Custom Reports"]
              }
            ]
          },
          "Technician Workload",
          {
            label: "Financial Reports",
            items: [
              {
                label: "Labor Performance",
                items: ["Labor Sales Summary", "Effective Labor Rate"]
              },
              {
                label: "Cost Review",
                items: ["Comeback Cost Review", "Sublet Analysis"]
              }
            ]
          }
        ]
      },
      {
        label: "Administration & Setup",
        items: [
          {
            label: "Department Setup",
            items: [
              {
                label: "Rate & Writers",
                items: ["Labor Rate Setup", "Service Writer Assignments"]
              },
              {
                label: "Codes & Forms",
                items: ["Job Code Library", "Print Form Layouts"]
              }
            ]
          },
          {
            label: "Policy & Controls",
            items: [
              {
                label: "Approval Rules",
                items: ["Approval Limits", "Promise Date Rules"]
              },
              {
                label: "Warranty Access",
                items: ["Warranty Policy Matrix", "Role Access Review"]
              }
            ]
          },
          {
            label: "Workflow Setup",
            items: [
              {
                label: "Status & Dispatch",
                items: ["Status Rules", "Dispatch Priorities"]
              },
              {
                label: "Alerts & Inspection",
                items: ["Notification Triggers", "Inspection Templates"]
              }
            ]
          }
        ]
      },
      {
        label: "Utilities",
        items: [
          {
            label: "Schedule & Capacity",
            items: [
              {
                label: "Capacity Planning",
                items: ["Capacity Planner", "Bay Availability Matrix"]
              },
              {
                label: "Loaner & Pickup",
                items: ["Loaner Schedule", "Pickup Calendar"]
              }
            ]
          },
          {
            label: "Data & Cleanup",
            items: [
              {
                label: "Archive & Merge",
                items: ["Archive Closed ROs", "Merge Duplicate Units"]
              },
              {
                label: "Renumber & Reindex",
                items: ["Repair Order Renumbering", "Rebuild Search Index"]
              }
            ]
          },
          {
            label: "Imports & Exports",
            items: [
              {
                label: "Data Export",
                items: ["Export Queue", "Service Data Extracts"]
              },
              {
                label: "Sync Exchange",
                items: ["Mobile Tech Sync", "Vendor File Exchange"]
              }
            ]
          }
        ]
      },
      {
        label: "Favorites",
        items: [
          {
            label: "My Service Views",
            items: [
              {
                label: "Favorite Boards",
                items: ["Favorite RO Queue", "Favorite Dispatch Board"]
              },
              {
                label: "Warranty & Reports",
                items: ["Favorite Warranty Board", "Favorite Service Reports"]
              }
            ]
          },
          {
            label: "My Shortcuts",
            items: [
              {
                label: "Promise & Approval",
                items: ["Favorite Promise Watch", "Favorite Approval Queue"]
              },
              {
                label: "Tech & Pickup",
                items: ["Favorite Tech Productivity", "Favorite Pickup Ready"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Units",
        items: [
          "Boat Inventory",
          {
            label: "Boat Stock",
            items: ["Unit Inventory", "Boats In Stock"]
          }
        ]
      }
    ]
  },
  {
    label: "Sales",
    items: [
      {
        label: "Lead Desk",
        items: [
          {
            label: "Prospect Capture",
            items: [
              {
                label: "Lead Intake",
                items: ["New Lead", "Showroom Ups"]
              },
              {
                label: "Remote Intake",
                items: ["Phone Ups", "Internet Lead Entry"]
              }
            ]
          },
          {
            label: "Follow-Up Queues",
            items: [
              "Leads, Quotes & Deals",
              {
                label: "Open Pipeline",
                items: ["Unsold Follow-Up"]
              },
              {
                label: "Appointments & Calls",
                items: ["Appointment Board", "CRM Call List"]
              }
            ]
          },
          {
            label: "Board Views",
            items: [
              {
                label: "Lead Views",
                items: ["Lead Board", "Quote Board"]
              },
              {
                label: "Deal Views",
                items: ["Open Deal Board", "Deposit Board"]
              }
            ]
          }
        ]
      },
      {
        label: "Quote & Deal Desk",
        items: [
          {
            label: "Quote Creation",
            items: [
              {
                label: "Quote Drafting",
                items: ["New Quote", "Payment Quote"]
              },
              {
                label: "Worksheet Review",
                items: ["Quote Revisions", "Worksheet Builder"]
              }
            ]
          },
          {
            label: "Deal Structuring",
            items: [
              {
                label: "Deal Entry",
                items: ["New Deal", "Deal Jacket Review"]
              },
              {
                label: "Trade & Deposit",
                items: ["Trade Appraisal Desk", "Deposit Log"]
              }
            ]
          }
        ]
      },
      {
        label: "Inventory & Availability",
        items: [
          {
            label: "Unit Visibility",
            items: [
              {
                label: "Inventory Lookup",
                items: ["Major Unit Inventory", "Major Unit Locator"]
              },
              {
                label: "Incoming & Aging",
                items: ["Incoming Unit Schedule", "Aged Inventory Watch"]
              }
            ]
          },
          {
            label: "Pricing & Promotion",
            items: [
              {
                label: "Promotion Controls",
                items: ["Consumer Promos", "Rebate Matrix"]
              },
              {
                label: "Package Pricing",
                items: ["Package Builder", "MSRP Override Review"]
              }
            ]
          }
        ]
      },
      {
        label: "F&I & Delivery",
        items: [
          {
            label: "Finance Workflow",
            items: [
              {
                label: "Deposit & Credit",
                items: ["Take Deposit", "Credit Application Queue"]
              },
              {
                label: "Funding Follow-Up",
                items: ["Lender Follow-Up", "Funding Pending"]
              },
              {
                label: "Compliance Review",
                items: ["Compliance Packet"]
              }
            ]
          },
          {
            label: "Delivery Control",
            items: [
              {
                label: "Delivery Prep",
                items: ["Delivery Checklist", "Sold Not Delivered"]
              },
              {
                label: "We Owe & Calendar",
                items: ["We Owe Log", "Delivery Calendar"]
              }
            ]
          }
        ]
      },
      {
        label: "Customer & CRM",
        items: [
          {
            label: "Customer Pipeline",
            items: [
              {
                label: "Prospect Review",
                items: ["Prospect 360", "Duplicate Customer Review"]
              },
              {
                label: "Recovery & Referral",
                items: ["Lost Prospect Recovery", "Referral Tracker"]
              }
            ]
          },
          {
            label: "Communication",
            items: [
              {
                label: "Campaign Outreach",
                items: ["Email Campaign Queue", "Text Follow-Up Board"]
              },
              {
                label: "Relationship Lists",
                items: ["Birthday & Anniversary List", "CSI Outreach"]
              }
            ]
          }
        ]
      },
      {
        label: "Reporting & Analysis",
        items: [
          {
            label: "Sales Performance",
            items: [
              {
                label: "Rep Performance",
                items: ["Salesperson Insights", "Closing Ratio Summary"]
              },
              {
                label: "Source & Gross",
                items: ["Lead Source Mix", "Gross Profit Summary"]
              }
            ]
          },
          {
            label: "Forecast & Aging",
            items: [
              {
                label: "Aging Review",
                items: ["Quote Aging", "Appraisal Aging"]
              },
              {
                label: "Forecast Reporting",
                items: ["Deal Forecast", "Custom Sales Reports"]
              }
            ]
          }
        ]
      },
      {
        label: "Administration & Setup",
        items: [
          {
            label: "Desk Setup",
            items: [
              {
                label: "Sales Desk",
                items: ["Salesperson Assignment", "Lead Source Setup"]
              },
              {
                label: "Quote Rules",
                items: ["Quote Form Layouts", "Deal Status Rules"]
              }
            ]
          },
          {
            label: "Finance Controls",
            items: [
              {
                label: "Rate & Fee",
                items: ["Rate Tables", "Doc Fee Setup"]
              },
              {
                label: "Menu & Compliance",
                items: ["Menu Template Library", "Compliance Forms"]
              }
            ]
          }
        ]
      },
      {
        label: "Favorites",
        items: [
          {
            label: "My Sales Views",
            items: [
              {
                label: "Favorite Boards",
                items: ["Favorite Lead Queue", "Favorite Deal Desk"]
              },
              {
                label: "Delivery & Reports",
                items: ["Favorite Delivery Board", "Favorite Sales Reports"]
              }
            ]
          },
          {
            label: "My Shortcuts",
            items: [
              {
                label: "Funding & Appraisal",
                items: ["Favorite Funding Watch", "Favorite Appraisal Log"]
              },
              {
                label: "Promotions & Sold",
                items: ["Favorite Promotions", "Favorite Sold Board"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: "CRM",
    items: ["Communicate"]
  },
  {
    label: "Management Activity",
    items: ["Managements Activitie's", "Cashier Accountability", "Cashier Reconciliation"]
  },
  {
    label: "Payables",
    items: ["Finovo"]
  },
  {
    label: "Receivables",
    items: [
      "AR Aging Doc",
      {
        label: "Customer Accounts",
        items: [
          {
            label: "Inquiry & Statements",
            items: [
              {
                label: "Account Review",
                items: ["Customer Inquiry", "Credit Hold Review"]
              },
              {
                label: "Statement Services",
                items: ["Statement Requests", "Balance Forward Review"]
              }
            ]
          },
          {
            label: "Promise Tracking",
            items: [
              {
                label: "Promise Monitor",
                items: ["Promise to Pay", "Broken Promise Review"]
              }
            ]
          }
        ]
      },
      {
        label: "Collections Desk",
        items: [
          {
            label: "Collector Queue",
            items: [
              {
                label: "Active Collections",
                items: ["Collections Queue", "Delinquency Watch"]
              }
            ]
          },
          {
            label: "Notes & Escalations",
            items: [
              {
                label: "Collector Notes",
                items: ["Follow-Up Notes", "Dispute Follow-Up"]
              }
            ]
          }
        ]
      },
      {
        label: "Payment Processing",
        items: [
          {
            label: "Batch Control",
            items: [
              {
                label: "Settlement Review",
                items: ["Credit Card Batch Payments", "Batch Deposit Match"]
              },
              {
                label: "ACH Review",
                items: ["ACH Exceptions", "NSF Watch"]
              }
            ]
          },
          {
            label: "Risk Review",
            items: [
              {
                label: "Risk Signals",
                items: ["Chargeback Watch", "Merchant Reserve Review"]
              }
            ]
          }
        ]
      },
      {
        label: "Reporting & Close",
        items: [
          {
            label: "Aging & Promise Reports",
            items: [
              {
                label: "Aging Packets",
                items: ["Reports", "Aging Review"]
              },
              {
                label: "Promise Coverage",
                items: ["Promise Tracker", "Broken Promise Summary"]
              }
            ]
          },
          {
            label: "Month-End Actions",
            items: [
              {
                label: "AR Closeout",
                items: ["Month-End AR", "Finance Follow-Up", "Write-Off Review"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: "General Ledger",
    items: [
      "Chart of Accounts",
      "Profit & Loss",
      {
        label: "Financial Views",
        items: [
          {
            label: "Store Financials",
            items: [
              {
                label: "Performance Review",
                items: ["Store Summary", "Department P&L"]
              }
            ]
          },
          {
            label: "Daily Flash",
            items: [
              {
                label: "Variance Pulse",
                items: ["Flash Report", "Expense Variance"]
              }
            ]
          }
        ]
      },
      {
        label: "Posting Control",
        items: [
          {
            label: "Deal & Funding",
            items: [
              {
                label: "Posting Queue",
                items: ["Deal Posting", "Funding to GL"]
              }
            ]
          },
          {
            label: "Transit Review",
            items: [
              {
                label: "Exception Posting",
                items: ["Contract-in-Transit", "Funding Exception Review"]
              }
            ]
          }
        ]
      },
      {
        label: "Cash Control",
        items: [
          {
            label: "Deposit Review",
            items: [
              {
                label: "Deposit Audit",
                items: ["Deposits", "Deposit Exceptions"]
              }
            ]
          },
          {
            label: "Clearing",
            items: [
              {
                label: "Variance Control",
                items: ["Cash Clearing", "Deposit Slip Match"]
              }
            ]
          }
        ]
      },
      {
        label: "Close & Reconcile",
        items: [
          {
            label: "Period Close",
            items: [
              {
                label: "Close Ownership",
                items: ["Month End", "Close Checklist", "Accrual Review"]
              },
              {
                label: "Trial Balance",
                items: ["Trial Balance Review"]
              }
            ]
          },
          {
            label: "Reconciliation",
            items: [
              {
                label: "Balance Sheet",
                items: ["Bank Reconciliation", "Schedule Review"]
              },
              {
                label: "Journal Control",
                items: ["Journal Entry Queue", "Recurring Journal Review"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: "System",
    items: [
      {
        label: "Website Publishing",
        items: [
          "Website Feed",
          {
            label: "Feed Delivery",
            items: ["Feed Health"]
          },
          {
            label: "Publishing Exceptions",
            items: ["Feed Retry Queue"]
          }
        ]
      },
      {
        label: "Dealers",
        items: ["Dealer Setup"]
      },
      {
        label: "Operation",
        items: ["My Stores"]
      },
      {
        label: "Development",
        items: ["Sandbox"]
      },
      {
        label: "Tools",
        items: ["ForgeForm"]
      },
      {
        label: "Access & Security",
        items: [
          {
            label: "User Access",
            items: [
              {
                label: "Role Coverage",
                items: ["Users & Roles", "Store Access Matrix"]
              },
              {
                label: "Provisioning",
                items: ["MFA Reset Queue"]
              }
            ]
          },
          {
            label: "Security Events",
            items: [
              {
                label: "Change Review",
                items: ["Permission Changes", "Login Watch"]
              },
              {
                label: "Policy Controls",
                items: ["Password Policy Review"]
              }
            ]
          }
        ]
      },
      {
        label: "Automation & Configuration",
        items: [
          {
            label: "Workflow Automation",
            items: [
              {
                label: "Runtime Rules",
                items: ["Workflow Rules", "Notification Escalations", "Background Jobs"]
              }
            ]
          },
          {
            label: "Environment Controls",
            items: [
              {
                label: "Release Controls",
                items: ["Feature Flags", "Environment Review"]
              }
            ]
          }
        ]
      },
      {
        label: "Audit & Integrations",
        items: [
          {
            label: "Audit Logs",
            items: [
              {
                label: "System Audit",
                items: ["Audit Trail", "Policy Change Log"]
              }
            ]
          },
          {
            label: "Integration Endpoints",
            items: [
              {
                label: "Connectors",
                items: ["API Connectors", "Vendor Endpoints"]
              },
              {
                label: "Message Templates",
                items: ["Template Library", "Webhook Retry Log"]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    label: "Help",
    items: [
      {
        label: "Quick Start",
        items: [
          {
            label: "First Day",
            items: [
              {
                label: "Core Orientation",
                items: ["Operator Guide", "New Operator Checklist"]
              },
              {
                label: "Ramp Plan",
                items: ["First Week Plan"]
              }
            ]
          },
          {
            label: "Navigation",
            items: [
              {
                label: "Command Surface",
                items: ["Shortcut Map", "Open Windows Guide"]
              }
            ]
          }
        ]
      },
      {
        label: "Daily Operations",
        items: [
          {
            label: "Department Tips",
            items: [
              {
                label: "Department Coaching",
                items: ["Service Tips", "Sales Tips", "Parts Tips"]
              }
            ]
          },
          {
            label: "Process Guides",
            items: [
              {
                label: "Daily Playbooks",
                items: ["Workflow Walkthroughs", "Queue Triage Guide"]
              },
              {
                label: "Closeout",
                items: ["Month-End Walkthrough"]
              }
            ]
          }
        ]
      },
      {
        label: "Release Center",
        items: [
          {
            label: "Release Notes",
            items: [
              {
                label: "Briefing",
                items: ["Release Notes", "Upcoming Changes"]
              }
            ]
          },
          {
            label: "Issue Awareness",
            items: [
              {
                label: "Issue Watch",
                items: ["Known Issues", "Fix Verification Checklist"]
              }
            ]
          },
          {
            label: "Demo & Training",
            items: [
              {
                label: "Training Assets",
                items: ["Demo Scripts", "Release Webinar"]
              }
            ]
          }
        ]
      },
      {
        label: "Support Desk",
        items: [
          {
            label: "Support Access",
            items: [
              {
                label: "Support Requests",
                items: ["Support", "Open Ticket"]
              },
              {
                label: "Escalation",
                items: ["Escalation Playbook"]
              }
            ]
          },
          {
            label: "Contacts & Training",
            items: [
              {
                label: "Support Network",
                items: ["Contact Directory", "Role-Based Training"]
              },
              {
                label: "Certification",
                items: ["Certification Tracker"]
              }
            ]
          }
        ]
      }
    ]
  }
]);

interface SalesDealDepositEntry {
  id: string;
  invoice: string;
  date: string;
  cashier: string;
  method: string;
  arName: string;
  amount: number;
  description: string;
  notes: string;
  reference: string;
}

interface SalesDealDepositActivity {
  id: string;
  title: string;
  detail: string;
  meta: string;
}

interface SalesDealDepositsState {
  activity: SalesDealDepositActivity[];
  ledger: SalesDealDepositEntry[];
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
  sandboxId: z.string().trim().min(1).nullable().optional()
});

const workspaceSchema = z.enum(["desktop", "sales", "service", "parts", "analytics", "website", "audit", "reports", "boatInventory"]);
const serviceOrderTypeSchema = z.enum(["Estimate", "Repair Order"]);
const activityToneSchema = z.enum(["stable", "accent", "attention", "neutral"]);
const taskStatusSchema = z.enum(["Queued", "In Progress", "Blocked", "Done"]);
const actorContextSchema = z.object({
  actorUserId: z.string().trim().min(1)
});
const activityFilterSchema = z.object({
  workspaceId: workspaceSchema,
  actorUserId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});
const cashierAccountabilityReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
}).refine(({ startDate, endDate }) => startDate <= endDate, {
  message: "Start date must be on or before the end date.",
  path: ["endDate"]
});
const technicianWorkloadReportQuerySchema = cashierAccountabilityReportQuerySchema;
const taskFilterSchema = activityFilterSchema;
const taskStatusUpdateSchema = z.object({
  status: taskStatusSchema,
  actorUserId: z.string().trim().min(1)
});
const taskAssigneeUpdateSchema = z.object({
  actorUserId: z.string().trim().min(1),
  assigneeUserId: z.string().trim().min(1).nullable()
});
const taskNoteKindSchema = z.enum(["Comment", "Resolution"]);
const taskNoteSchema = z.object({
  actorUserId: z.string().trim().min(1),
  body: z.string().trim().min(1).max(400),
  kind: taskNoteKindSchema
});
const taskActionSchema = z.object({
  mode: z.literal("cleanupServiceUtilityQa"),
  actorUserId: z.string().trim().min(1),
  roNumber: z.string().trim().min(1)
});
const serviceOrderDetailActionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("createJob"),
    actorUserId: z.string().trim().min(1),
    title: z.string().trim().max(120).default(""),
    unitLabel: z.string().trim().max(160).default(""),
    description: z.string().trim().max(2000).default(""),
    technician: z.string().trim().max(120).default(""),
    jobCode: z.string().trim().max(40).default(""),
    recommendations: z.string().trim().max(2000).default(""),
    resolution: z.string().trim().max(2000).default("")
  }),
  z.object({
    mode: z.literal("updateJob"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    title: z.string().trim().max(120),
    unitLabel: z.string().trim().max(160),
    customerApproval: z.string().trim().max(80),
    status: z.string().trim().max(120),
    appliance: z.string().trim().max(120),
    warranty: z.string().trim().max(120),
    description: z.string().trim().max(600),
    resolution: z.string().trim().max(600),
    recommendations: z.string().trim().max(600),
    technician: z.string().trim().max(120),
    laborRate: z.string().trim().max(120),
    chargeBy: z.string().trim().max(40),
    rate: z.number().finite().min(0),
    quantity: z.number().finite().min(0)
  }),
  z.object({
    mode: z.literal("addPart"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    partNumber: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(240),
    supplier: z.string().trim().min(1).max(80),
    available: z.number().int().min(0),
    price: z.number().finite().min(0),
    quantity: z.number().int().min(1),
    category: z.string().trim().min(1).max(80)
  }),
  z.object({
    mode: z.literal("removePart"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    partNumber: z.string().trim().min(1).max(120)
  }),
  z.object({
    mode: z.literal("addLaborSession"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    technician: z.string().trim().min(1).max(120),
    startDate: z.string().trim().min(1).max(40),
    startTime: z.string().trim().min(1).max(40),
    endDate: z.string().trim().max(40).default(""),
    endTime: z.string().trim().max(40).default(""),
    actualHours: z.string().trim().min(1).max(20),
    creditedHours: z.string().trim().min(1).max(20),
    override: z.string().trim().max(160).default("")
  }),
  z.object({
    mode: z.literal("updateWarrantyClaim"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    warrantyClaimNumber: z.string().trim().max(80).default(""),
    internalWarrantyNumber: z.string().trim().max(80).default(""),
    failureDate: z.string().trim().max(40).default(""),
    contentionCode: z.string().trim().max(80).default(""),
    problemCode: z.string().trim().max(80).default(""),
    problemDescription: z.string().trim().max(600).default(""),
    claimType: z.string().trim().max(80).default(""),
    status: z.string().trim().max(120).default(""),
    deductible: z.number().finite().min(0),
    failedPartNumber: z.string().trim().max(120).default(""),
    actionTaken: z.string().trim().max(600).default(""),
    reasonForDelay: z.string().trim().max(600).default(""),
    carrierNumber: z.string().trim().max(80).default(""),
    invoiceDate: z.string().trim().max(40).default(""),
    invoiceNumber: z.string().trim().max(80).default(""),
    dateFiledWithCarrier: z.string().trim().max(40).default("")
  }),
  z.object({
    mode: z.literal("updateOrderType"),
    actorUserId: z.string().trim().min(1),
    orderType: serviceOrderTypeSchema
  }),
  z.object({
    mode: z.literal("updateNotes"),
    actorUserId: z.string().trim().min(1),
    notes: z.string().trim().max(4000),
    transferNotes: z.string().trim().max(4000)
  }),
  z.object({
    mode: z.literal("updateCustomer"),
    actorUserId: z.string().trim().min(1),
    customerName: z.string().trim().max(120),
    addressLine1: z.string().trim().max(160),
    location: z.string().trim().max(160),
    homePhone: z.string().trim().max(40),
    cellPhone: z.string().trim().max(40),
    workPhone: z.string().trim().max(40),
    email: z.string().trim().max(160),
    customerNo: z.string().trim().max(80)
  }),
  z.object({
    mode: z.literal("updateQueueRow"),
    actorUserId: z.string().trim().min(1),
    inDate: z.string().trim().min(1).max(20),
    roNumber: z.string().trim().regex(/^\d{5,20}$/),
    orderType: serviceOrderTypeSchema,
    customerName: z.string().trim().min(1).max(120),
    stockNumber: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(120),
    serviceWriter: z.string().trim().min(1).max(120),
    roStatus: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(120),
    maker: z.string().trim().min(1).max(120),
    note: z.string().trim().max(4000)
  }),
  z.object({
    mode: z.literal("deleteJob"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1)
  }),
  z.object({
    mode: z.literal("closeLabor"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    lineIndex: z.number().int().min(0),
    actorName: z.string().trim().min(1).max(120)
  }),
  z.object({
    mode: z.literal("reopenLabor"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    lineIndex: z.number().int().min(0)
  }),
  z.object({
    mode: z.literal("deleteLaborSession"),
    actorUserId: z.string().trim().min(1),
    sessionIndex: z.number().int().min(0)
  }),
  z.object({
    mode: z.literal("editLaborSession"),
    actorUserId: z.string().trim().min(1),
    sessionIndex: z.number().int().min(0),
    technician: z.string().trim().min(1).max(120),
    startDate: z.string().trim().min(1).max(40),
    startTime: z.string().trim().min(1).max(40),
    endDate: z.string().trim().max(40).default(""),
    endTime: z.string().trim().max(40).default(""),
    actualHours: z.string().trim().min(1).max(20),
    creditedHours: z.string().trim().min(1).max(20),
    override: z.string().trim().max(160).default("")
  }),
  z.object({
    mode: z.literal("updateROHeader"),
    actorUserId: z.string().trim().min(1),
    purchaseOrder: z.string().trim().max(80).default(""),
    promisedDate: z.string().trim().max(40).default(""),
    closedDate: z.string().trim().max(40).default("")
  }),
  z.object({
    mode: z.literal("finalizeInvoice"),
    actorUserId: z.string().trim().min(1),
    invoiceStatus: z.enum(["Draft", "Finalized", "Paid", "Voided"])
  }),
  z.object({
    mode: z.literal("updateJobStatus"),
    actorUserId: z.string().trim().min(1),
    jobId: z.string().trim().min(1),
    status: z.string().trim().min(1).max(80)
  }),
  z.object({
    mode: z.literal("requestSignature"),
    actorUserId: z.string().trim().min(1),
    docType: z.string().trim().min(1).max(120),
    recipient: z.string().trim().max(120).default(""),
    message: z.string().trim().max(1000).default("")
  }),
  z.object({ mode: z.literal("recordPayment"), actorUserId: z.string().trim().min(1), method: z.string(), amount: z.number(), reference: z.string() })
]);
const createServiceOrderSchema = z.object({
  actorUserId: z.string().trim().min(1),
  orderType: serviceOrderTypeSchema,
  customerName: z.string().trim().min(1).max(120),
  stockNumber: z.string().trim().max(80).default(""),
  model: z.string().trim().max(120).default(""),
  serviceWriter: z.string().trim().max(120).default(""),
  maker: z.string().trim().max(120).default(""),
  note: z.string().trim().max(4000).default("")
});
const duplicateServiceOrderSchema = z.object({
  actorUserId: z.string().trim().min(1),
  reason: z.string().trim().max(240).default("Follow-up repair")
});
const taskSlaPolicySchema = z.object({
  workspaceId: workspaceSchema,
  action: z.string().trim().min(1),
  slaMinutes: z.number().int().min(5).max(24 * 60),
  actorUserId: z.string().trim().min(1),
  applyToOpenTasks: z.boolean().optional().default(true)
});
const taskSlaPolicyActionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("previewCopyToStore"),
    actorUserId: z.string().trim().min(1),
    targetStoreId: z.string().trim().min(1)
  }),
  z.object({
    mode: z.literal("copyOneToStore"),
    actorUserId: z.string().trim().min(1),
    targetStoreId: z.string().trim().min(1),
    workspaceId: workspaceSchema,
    action: z.string().trim().min(1),
    applyToOpenTasks: z.boolean().optional().default(true)
  }),
  z.object({
    mode: z.literal("copyToStore"),
    actorUserId: z.string().trim().min(1),
    targetStoreId: z.string().trim().min(1),
    applyToOpenTasks: z.boolean().optional().default(true)
  }),
  z.object({
    mode: z.literal("resetAll"),
    actorUserId: z.string().trim().min(1),
    applyToOpenTasks: z.boolean().optional().default(true)
  }),
  z.object({
    mode: z.literal("resetOne"),
    actorUserId: z.string().trim().min(1),
    workspaceId: workspaceSchema,
    action: z.string().trim().min(1),
    applyToOpenTasks: z.boolean().optional().default(true)
  })
]);
const activityEntrySchema = z.object({
  workspaceId: workspaceSchema,
  label: z.string().trim().min(1),
  detail: z.string().trim().min(1),
  tone: activityToneSchema
}).extend(actorContextSchema.shape);
const workflowActionSchema = z.object({
  workspaceId: workspaceSchema,
  action: z.string().trim().min(1),
  selectedRowId: z.string().trim().min(1).nullable().optional(),
  detail: z.string().trim().min(1),
  tone: activityToneSchema,
  values: z.record(z.string(), z.string()).default({})
}).extend(actorContextSchema.shape);
const dealerSetupPersistedDealerSchema = z
  .object({
    activity: z.array(
      z
        .object({
          detail: z.string().trim(),
          id: z.string().trim().min(1)
        })
        .passthrough()
    ),
    checklist: z.array(
      z
        .object({
          detail: z.string().trim(),
          id: z.string().trim().min(1),
          label: z.string().trim().min(1),
          tone: z.string().trim().min(1)
        })
        .passthrough()
    ),
    dealerId: z.string().trim().min(1),
    goLive: z.string().trim(),
    groupLabel: z.string().trim().min(1),
    id: z.string().trim().min(1),
    importStages: z.array(
      z
        .object({
          complete: z.number(),
          id: z.string().trim().min(1),
          label: z.string().trim().min(1),
          total: z.number()
        })
        .passthrough()
    ),
    integration: z.string().trim(),
    integrations: z.array(
      z
        .object({
          id: z.string().trim().min(1),
          label: z.string().trim().min(1),
          status: z.string().trim().min(1)
        })
        .passthrough()
    ),
    legalEntity: z.string().trim().min(1),
    locations: z.array(
      z
        .object({
          address: z.string().trim().min(1),
          id: z.string().trim().min(1),
          label: z.string().trim().min(1),
          launchReadiness: z.number(),
          moduleLabel: z.string().trim().min(1),
          status: z.string().trim().min(1)
        })
        .passthrough()
    ),
    modules: z.array(
      z
        .object({
          enabled: z.boolean(),
          id: z.string().trim().min(1),
          label: z.string().trim().min(1)
        })
        .passthrough()
    ),
    name: z.string().trim().min(1),
    nextSteps: z.array(z.string().trim()),
    permissionRows: z.array(
      z
        .object({
          accounting: z.boolean(),
          parts: z.boolean(),
          sales: z.boolean(),
          service: z.boolean(),
          role: z.string().trim().min(1).optional(),
          crm: z.boolean().optional(),
          inventory: z.boolean().optional(),
          id: z.string().trim().min(1).optional(),
          permission: z.string().trim().min(1).optional()
        })
        .passthrough()
    ),
    progressPercent: z.number(),
    region: z.string().trim().min(1),
    rooftopCode: z.string().trim().min(1),
    status: z.string().trim().min(1),
    timeZone: z.string().trim().min(1),
    usersCount: z.number().int().nonnegative(),
    website: z.string().trim()
  })
  .passthrough();
const dealerSetupCreateSchema = z.object({
  dealer: dealerSetupPersistedDealerSchema
});
const createSalesDealDepositSchema = z.object({
  actorUserId: z.string().trim().min(1),
  cashier: z.string().trim().min(1).max(120),
  password: z.string().trim().max(120).default(""),
  date: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(200),
  method: z.string().trim().min(1).max(120),
  amount: z.number().finite().positive(),
  notes: z.string().trim().max(400).default(""),
  arAccount: z.string().trim().max(80).default("")
});
const salesDealDepositActivityActionSchema = z.object({
  actorUserId: z.string().trim().min(1),
  mode: z.enum(["sendReceipt", "reprint"])
});

const vendorMutationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contact: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(80).default(""),
  email: z.string().trim().max(160).default(""),
  terms: z.string().trim().max(80).default(""),
  leadDays: z.number().finite().int().min(0).max(365),
  notes: z.string().trim().max(1000).default("")
});
const pricingRuleMutationSchema = z.object({
  category: z.string().trim().min(1).max(120),
  costMin: z.number().finite().min(0),
  costMax: z.number().finite().min(0),
  markupPct: z.number().finite().min(0).max(1000),
  retailMethod: z.string().trim().min(1).max(120),
  minMarginPct: z.number().finite().min(0).max(100)
});
const approvalCreateSchema = z.object({
  type: z.string().trim().min(1).max(120),
  reference: z.string().trim().min(1).max(120),
  requestedBy: z.string().trim().min(1).max(120),
  impact: z.string().trim().max(200).default(""),
  reason: z.string().trim().max(1000).default("")
});
const approvalUpdateSchema = z.object({
  status: z.string().trim().min(1).max(80),
  reviewedBy: z.string().trim().max(120).optional(),
  reviewNote: z.string().trim().max(1000).optional()
});
const boatInventoryUnitMutationSchema = z.object({
  stockNumber: z.string().trim().min(1).max(80),
  vinHin: z.string().trim().min(1).max(120),
  status: z.string().trim().min(1).max(80).default("Available"),
  condition: z.string().trim().min(1).max(80).default("New"),
  year: z.number().finite().int().min(1900).max(2200),
  make: z.string().trim().min(1).max(120),
  model: z.string().trim().min(1).max(160),
  lengthFt: z.number().finite().int().min(0).max(300).default(0),
  engine: z.string().trim().max(160).default(""),
  exteriorColor: z.string().trim().max(120).default(""),
  interiorColor: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  ageDays: z.number().finite().int().min(0).max(10000).default(0),
  costCents: z.number().finite().int().min(0).default(0),
  priceCents: z.number().finite().int().min(0).default(0),
  photosJson: z.string().trim().max(10000).default("[]"),
  notes: z.string().trim().max(2000).default("")
});
const boatInventoryUnitUpdateSchema = boatInventoryUnitMutationSchema.partial();
const sandboxTemplateMutationSchema = z.object({
  description: z.string().trim().max(1000).default(""),
  name: z.string().trim().min(1).max(120),
  selectedModules: z.array(z.string().trim().min(1)).min(1)
});
const sandboxCreateSchema = z.object({
  actorEmail: z.string().trim().email().optional(),
  actorName: z.string().trim().max(120).optional(),
  name: z.string().trim().min(1).max(120),
  purpose: z.string().trim().max(1000).default(""),
  selectedModules: z.array(z.string().trim().min(1)).min(1),
  templateId: z.string().trim().min(1).nullable().optional(),
  type: z.string().trim().min(1).max(80)
});
const sandboxUpdateSchema = z.object({
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(160).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  releaseType: z.string().trim().min(1).max(80).optional(),
  selectedModules: z.array(z.string().trim().min(1)).min(1).optional(),
  status: z.string().trim().min(1).max(80).optional(),
  type: z.string().trim().min(1).max(80).optional()
});
const sandboxActionSchema = z.object({
  actorName: z.string().trim().max(120).optional(),
  mode: z.enum(["activate", "clone", "delete", "login", "promote", "refresh"])
});
const sandboxPushSchema = z.object({
  actorName: z.string().trim().max(120).optional(),
  selectedChangeIds: z.array(z.string().trim().min(1)).min(1),
  validatedCheckIds: z.array(z.string().trim().min(1))
});
const twilioSendMessageSchema = z.object({
  to: z.string().trim().min(1).max(40),
  body: z.string().trim().min(1).max(1600),
  mediaUrl: z.string().trim().url().optional(),
  statusCallbackUrl: z.string().trim().url().optional()
});
const crmThreadCreateSchema = z.object({
  actorName: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(160).optional().or(z.literal(""))
});
const crmContactUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  stage: z.string().trim().min(1).max(80).optional()
});
const crmSmsSendSchema = z.object({
  actorName: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1600)
});

function parseJsonResponseBody(bodyText: string) {
  if (!bodyText.trim()) {
    return null;
  }

  try {
    return JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    return { raw: bodyText };
  }
}

function rejectInvalidTwilioWebhook(request: express.Request, response: express.Response, path: string) {
  const config = getTwilioMessagingConfig(process.env);
  const missing = getTwilioMissingConfig(config, "webhook");

  if (missing.length > 0) {
    response.status(503).json({ message: "Twilio webhook configuration is incomplete.", missing });
    return true;
  }

  const signature = request.header("X-Twilio-Signature");
  const webhookUrl = getTwilioWebhookUrl(config, path);

  if (
    !webhookUrl ||
    !validateTwilioRequestSignature({
      authToken: config.authToken,
      params: request.body as Record<string, unknown>,
      signature,
      url: webhookUrl
    })
  ) {
    response.status(403).json({ message: "Invalid Twilio webhook signature." });
    return true;
  }

  return false;
}

const defaultTaskSlaPolicyCatalog = [
  { workspaceId: "desktop", action: "Designer", slaMinutes: 90 },
  { workspaceId: "desktop", action: "Store Status", slaMinutes: 60 },
  { workspaceId: "service", action: "Duplicate", slaMinutes: 180 },
  { workspaceId: "service", action: "Print", slaMinutes: 180 },
  { workspaceId: "service", action: "Report", slaMinutes: 180 },
  { workspaceId: "service", action: "Detail", slaMinutes: 180 },
  { workspaceId: "parts", action: "Guide", slaMinutes: 240 },
  { workspaceId: "sales", action: "Marketing", slaMinutes: 45 },
  { workspaceId: "sales", action: "Send Message", slaMinutes: 45 },
  { workspaceId: "analytics", action: "Forecast", slaMinutes: 90 },
  { workspaceId: "analytics", action: "Exceptions", slaMinutes: 90 },
  { workspaceId: "analytics", action: "Cross-Store View", slaMinutes: 90 },
  { workspaceId: "website", action: "Lead Sync", slaMinutes: 30 },
  { workspaceId: "website", action: "Open Queue", slaMinutes: 30 }
] as const;

const serviceUtilityTaskActions = ["Duplicate", "Print", "Report", "Detail"] as const;
const serviceUtilityQaMarker = "QA";

const taskSlaAuditActivityLabels = [
  "SLA policy updated",
  "SLA policy rolled out",
  "SLA policy rollout received",
  "SLA policy reset",
  "SLA policy already aligned",
  "SLA rollout already aligned"
] as const;

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    }
  })
);
app.use(express.json());

function isSandboxSessionRequest(request: express.Request) {
  return request.header("x-marine-session-mode")?.trim().toLowerCase() === "sandbox";
}

function isSandboxWriteAllowedPath(pathname: string) {
  return pathname.startsWith("/api/auth/") || /^\/api\/stores\/[^/]+\/sandboxes\/[^/]+\/push-to-production$/i.test(pathname);
}

app.use((request, response, next) => {
  if (!isSandboxSessionRequest(request)) {
    next();
    return;
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase()) && !isSandboxWriteAllowedPath(request.path)) {
    response.status(403).json({
      message: "Sandbox sessions are read-only mirrors of the assigned dealer-group state. Changes do not write back to production."
    });
    return;
  }

  next();
});
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use("/api/auth/login", authLoginRateLimit);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/sandbox/backend-modules", (_request, response) => {
  response.json(sandboxBackendModules);
});

app.get("/api/sandboxes/:sandboxId/login-access", async (request, response) => {
  try {
    response.json(await getSandboxLoginAccess(request.params.sandboxId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.get("/api/crm/twilio/config", (_request, response) => {
  const config = getTwilioMessagingConfig(process.env);
  const missingForSend = getTwilioMissingConfig(config, "send");
  const missingForReceive = getTwilioMissingConfig(config, "webhook");

  response.json({
    accountSidConfigured: Boolean(config.accountSid),
    authTokenConfigured: Boolean(config.authToken),
    apiKeyConfigured: Boolean(config.apiKey),
    apiSecretConfigured: Boolean(config.apiSecret),
    phoneNumber: config.phoneNumber || null,
    messagingServiceSid: config.messagingServiceSid || null,
    webhookBaseUrl: config.webhookBaseUrl || null,
    defaultStoreCode: config.defaultStoreCode || null,
    inboundWebhookUrl: getTwilioWebhookUrl(config, TWILIO_INBOUND_WEBHOOK_PATH),
    statusWebhookUrl: getTwilioWebhookUrl(config, TWILIO_STATUS_WEBHOOK_PATH),
    readyToSend: missingForSend.length === 0,
    readyToReceive: missingForReceive.length === 0,
    missingForSend,
    missingForReceive
  });
});

app.post("/api/crm/messages/send", async (request, response) => {
  const parsed = twilioSendMessageSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Enter a valid Twilio send payload." });
    return;
  }

  const config = getTwilioMessagingConfig(process.env);
  const missing = getTwilioMissingConfig(config, "send");

  if (missing.length > 0) {
    response.status(503).json({ message: "Twilio outbound messaging is not configured.", missing });
    return;
  }

  try {
    const twilioResponse = await fetch(getTwilioMessagesEndpoint(config), {
      method: "POST",
      headers: {
        Authorization: getTwilioAuthorizationHeader(config),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: buildTwilioMessagePayload(config, parsed.data).toString()
    });
    const bodyText = await twilioResponse.text();
    const twilioBody = parseJsonResponseBody(bodyText);

    if (!twilioResponse.ok) {
      response.status(502).json({
        message: "Twilio rejected the outbound message.",
        twilioStatus: twilioResponse.status,
        twilio: twilioBody
      });
      return;
    }

    response.status(201).json({
      message: "Message accepted by Twilio.",
      sid: twilioBody && "sid" in twilioBody ? twilioBody.sid : null,
      status: twilioBody && "status" in twilioBody ? twilioBody.status : null,
      to: twilioBody && "to" in twilioBody ? twilioBody.to : parsed.data.to,
      from: twilioBody && "from" in twilioBody ? twilioBody.from : config.phoneNumber || null,
      messagingServiceSid:
        twilioBody && "messaging_service_sid" in twilioBody
          ? twilioBody.messaging_service_sid
          : config.messagingServiceSid || null
    });
  } catch (error) {
    response.status(502).json({
      message: "Unable to reach Twilio.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/api/stores/:storeId/crm/communicate", async (request, response) => {
  const payload = await getCrmCommunicatePayload(request.params.storeId);

  if (!payload) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  response.json(payload);
});

app.post("/api/stores/:storeId/crm/threads", async (request, response) => {
  const parsed = crmThreadCreateSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Enter a valid customer name and phone number." });
    return;
  }

  const result = await createCrmCommunicateThread(request.params.storeId, parsed.data);

  if (!result) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  response.status(201).json({
    message: `New message thread ready for ${parsed.data.name.trim()}.`,
    ...result
  });
});

app.patch("/api/stores/:storeId/crm/contacts/:contactId", async (request, response) => {
  const parsed = crmContactUpdateSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Enter a valid customer quick-info update." });
    return;
  }

  const result = await updateCrmContactQuickInfo(request.params.storeId, request.params.contactId, parsed.data);

  if (!result) {
    response.status(404).json({ message: "Contact not found." });
    return;
  }

  response.json({ message: "Customer quick info saved.", ...result });
});

app.post("/api/stores/:storeId/crm/conversations/:conversationId/messages/send", async (request, response) => {
  const parsed = crmSmsSendSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Enter a valid outbound SMS payload." });
    return;
  }

  const result = await sendCrmConversationSms(request.params.storeId, request.params.conversationId, parsed.data);

  if (!result) {
    response.status(404).json({ message: "Conversation not found." });
    return;
  }

  if ("missing" in result) {
    response.status(503).json({ message: "Twilio outbound messaging is not configured.", missing: result.missing });
    return;
  }

  if ("errorStatus" in result) {
    response.status(502).json({
      message: "Twilio rejected the outbound message.",
      twilioStatus: result.errorStatus,
      twilio: result.errorBody
    });
    return;
  }

  response.status(201).json({ message: "SMS sent from Communicate.", ...result });
});

app.post(TWILIO_INBOUND_WEBHOOK_PATH, express.urlencoded({ extended: false }), async (request, response) => {
  if (rejectInvalidTwilioWebhook(request, response, TWILIO_INBOUND_WEBHOOK_PATH)) {
    return;
  }

  const result = await recordInboundTwilioMessage(request.body as Record<string, unknown>);

  if (!result.ok && !result.ignored) {
    response.status(503).json({ message: result.message ?? "Unable to persist inbound Twilio message." });
    return;
  }

  response.type("text/xml").send("<Response></Response>");
});

app.post(TWILIO_STATUS_WEBHOOK_PATH, express.urlencoded({ extended: false }), async (request, response) => {
  if (rejectInvalidTwilioWebhook(request, response, TWILIO_STATUS_WEBHOOK_PATH)) {
    return;
  }

  await recordTwilioMessageStatus(request.body as Record<string, unknown>);

  response.status(204).send();
});

app.post("/api/auth/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Enter a valid email and password." });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  if (normalizedEmail.endsWith(".sandbox") || parsed.data.sandboxId) {
    try {
      const sandboxPayload = await authenticateSandboxLogin(normalizedEmail, parsed.data.password, parsed.data.sandboxId);
      response.json({
        mode: "sandbox",
        sandboxContext: {
          dealerGroupName: sandboxPayload.sandbox.dealerGroupName,
          isReadOnly: true,
          loginEmail: sandboxPayload.sandbox.loginEmail,
          readOnlyNotice: sandboxPayload.sandbox.readOnlyNotice,
          sandboxId: sandboxPayload.sandbox.sandboxId,
          sandboxName: sandboxPayload.sandbox.sandboxName,
          sourceStoreId: sandboxPayload.sandbox.sourceStoreId,
          sourceStoreName: sandboxPayload.sandbox.sourceStoreName
        },
        stores: sandboxPayload.stores,
        user: sandboxPayload.user
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to authenticate sandbox account.";
      response.status(/not found|invalid|different sandbox account/i.test(message) ? 401 : 400).json({ message });
      return;
    }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail
    },
    include: {
      dealerGroup: true,
      userStores: {
        include: {
          store: {
            include: {
              dealerGroup: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    response.status(401).json({
      message: "User not found in the seeded demo directory."
    });
    return;
  }

  const stores = [...user.userStores]
    .sort((left, right) => left.store.name.localeCompare(right.store.name))
    .map(({ store }) => ({
      id: store.id,
      code: store.code,
      name: store.name,
      city: store.city,
      state: store.state,
      dealerGroupName: store.dealerGroup.name,
      statusLine: `${store.city}, ${store.state} · ${store.dealerGroup.name}`
    }));

  response.json({
    mode: "production",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      avatarInitial: user.avatarInitial,
      dealerGroupName: user.dealerGroup.name
    },
    stores
  });
});

app.post("/api/auth/logout", (_request, response) => {
  response.json({ ok: true, message: "Logged out" });
});

app.get("/api/auth/me", async (request, response) => {
  const userId = getBearerUserId(request);
  if (!userId) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { dealerGroup: true } });
  if (!user) {
    response.status(401).json({ error: "User not found" });
    return;
  }
  response.json({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
});

app.get("/api/stores/:storeId/dashboard", async (request, response) => {
  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    include: {
      dealerGroup: true,
      modules: {
        include: {
          appModule: true
        },
        orderBy: {
          priority: "asc"
        }
      },
      websiteFeeds: {
        orderBy: {
          brand: "asc"
        }
      },
      salesDeals: {
        orderBy: {
          openedAt: "desc"
        }
      },
      serviceOrders: {
        orderBy: {
          inDate: "desc"
        }
      },
      partsLines: {
        orderBy: {
          createdAt: "desc"
        }
      },
      userStores: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              title: true,
              avatarInitial: true
            }
          }
        }
      }
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const onlineCount = store.modules.filter((moduleItem) => moduleItem.status === "Online").length;
  const watchCount = store.modules.length - onlineCount;
  const publishedUnits = store.websiteFeeds.reduce((sum, feed) => sum + feed.inventoryCount, 0);
  const digitalLeads = store.websiteFeeds.reduce((sum, feed) => sum + feed.leadsToday, 0);
  const openDeals = store.salesDeals.length;
  const serviceQueue = store.serviceOrders.length;
  const partsQueue = store.partsLines.length;

  response.json({
    store: {
      id: store.id,
      code: store.code,
      name: store.name,
      city: store.city,
      state: store.state,
      dealerGroupName: store.dealerGroup.name,
      summary: `${store.name} is using a compact command surface for DMS, payroll, analytics, and website operations.`
    },
    navigation,
    stats: [
      {
        label: "Module posture",
        value: `${onlineCount}/${store.modules.length}`,
        caption: watchCount === 0 ? "All seeded modules are live." : `${watchCount} module lanes still need attention.`
      },
      {
        label: "Open deals",
        value: openDeals.toString(),
        caption: "Sales board rows currently active in the selected store."
      },
      {
        label: "Service queue",
        value: serviceQueue.toString(),
        caption: "Repair-order lanes currently visible to service writers."
      },
      {
        label: "Parts lines",
        value: partsQueue.toString(),
        caption: "Parts-order rows staged from active repair and stock work."
      }
    ],
    modules: store.modules.map((moduleItem) => ({
      code: moduleItem.appModule.code,
      name: moduleItem.appModule.name,
      category: moduleItem.appModule.category,
      status: moduleItem.status,
      description: moduleItem.appModule.description,
      headline: moduleItem.headline,
      ownerTeam: moduleItem.appModule.ownerTeam,
      navGroup: moduleItem.appModule.navGroup
    })),
    websiteFeeds: store.websiteFeeds.map((feed) => ({
      brand: feed.brand,
      domain: feed.domain,
      status: feed.status,
      inventoryCount: feed.inventoryCount,
      leadsToday: feed.leadsToday,
      lastSyncLabel: formatMinutesAgo(feed.lastSyncAt)
    })),
    activity: [
      {
        label: "Operator posture",
        detail: watchCount === 0 ? "All current module lanes are green." : `${watchCount} module lanes are still being mapped or tuned.`,
        tone: watchCount === 0 ? "stable" : "attention"
      },
      {
        label: "Website feed rail",
        detail: `${publishedUnits} units are already positioned for live web merchandising across the selected store's publishing surfaces.`,
        tone: "accent"
      },
      {
        label: "Finance concept",
        detail: "Payroll, comp plans, and deposit controls stay top-nav first instead of being buried under oversized dashboard widgets.",
        tone: "neutral"
      },
      {
        label: "Lead flow",
        detail: `${digitalLeads} digital leads synced into the selected store's command surface today.`,
        tone: "stable"
      }
    ],
    operators: [...store.userStores]
      .map(({ user }) => ({
        id: user.id,
        name: user.name,
        title: user.title,
        avatarInitial: user.avatarInitial
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    workspaceCounts: {
      sales: openDeals,
      service: serviceQueue,
      parts: partsQueue,
      website: store.websiteFeeds.length
    }
  });
});

app.get("/api/stores/:storeId/workspaces/:workspaceId", async (request, response) => {
  const parsed = workspaceSchema.safeParse(request.params.workspaceId);

  if (!parsed.success) {
    response.status(400).json({ message: "Unknown workspace." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    include: {
      dealerGroup: true,
      modules: {
        include: {
          appModule: true
        },
        orderBy: {
          priority: "asc"
        }
      },
      websiteFeeds: {
        orderBy: {
          brand: "asc"
        }
      },
      salesDeals: {
        orderBy: {
          openedAt: "desc"
        }
      },
      serviceOrders: {
        orderBy: {
          inDate: "desc"
        }
      },
      partsLines: {
        orderBy: {
          createdAt: "desc"
        }
      },
      boatInventoryUnits: {
        orderBy: [
          { status: "asc" },
          { stockNumber: "asc" }
        ]
      }
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const workspaceId = parsed.data;

  if (workspaceId === "boatInventory") {
    response.json({
      workspaceId,
      title: "Boat Inventory",
      rows: store.boatInventoryUnits
    });
    return;
  }

  if (workspaceId === "reports") {
    response.json({
      workspaceId,
      title: "Report Center",
      rows: []
    });
    return;
  }

  if (workspaceId === "sales") {
    response.json({
      workspaceId,
      title: "Leads, Quotes & Deals",
      rows: store.salesDeals.map((row) => ({
        id: row.id,
        date: formatDate(row.openedAt),
        worksheet: row.worksheet,
        stock: row.stockNumber,
        make: row.make,
        model: row.model,
        cashPrice: formatCurrency(row.cashPrice),
        finalized: row.stage,
        customer: row.customerName,
        year: row.modelYear.toString(),
        vin: row.vin,
        tone: row.tone
      }))
    });
    return;
  }

  if (workspaceId === "service") {
    const rows = store.serviceOrders.map((row) => ({
      ...formatServiceWorkspaceRow(row),
      updatedAt: row.updatedAt
    }));
    const activities = await prisma.storeActivity.findMany({
      where: {
        storeId: store.id,
        workspaceId: "service"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 60
    });

    response.json({
      workspaceId,
      title: "Estimates & Repair Orders",
      rows: rows.map(({ updatedAt: _updatedAt, ...row }) => row),
      notifications: buildServiceWorkspaceNotifications(rows, activities)
    });
    return;
  }

  if (workspaceId === "parts") {
    response.json({
      workspaceId,
      title: "Parts Ordering",
      rows: store.partsLines.map((row) => ({
        id: row.id,
        partNumber: row.partNumber,
        secondary: row.secondaryNumber,
        description: row.description,
        supplier: row.supplier,
        category: row.category,
        orderType: row.orderType,
        quantity: row.quantity.toString(),
        orderCost: formatCurrencyFromCents(row.orderCost),
        source: row.source,
        tone: row.tone
      }))
    });
    return;
  }

  if (workspaceId === "website") {
    response.json({
      workspaceId,
      title: "Website Feed",
      rows: store.websiteFeeds.map((feed) => ({
        id: feed.id,
        brand: feed.brand,
        domain: feed.domain,
        status: feed.status,
        inventoryCount: feed.inventoryCount,
        leadsToday: feed.leadsToday,
        lastSyncLabel: formatMinutesAgo(feed.lastSyncAt)
      }))
    });
    return;
  }

  if (workspaceId === "audit") {
    const relatedStores = await prisma.store.findMany({
      where: {
        dealerGroupId: store.dealerGroupId
      },
      select: {
        id: true,
        code: true,
        name: true
      }
    });
    const storeLookup = new Map(relatedStores.map((item) => [item.id, item]));
    const relatedStoreIds = relatedStores.map((item) => item.id);
    const [activities, policyActivities, tasks, policies] = await Promise.all([
      prisma.storeActivity.findMany({
        where: {
          storeId: {
            in: relatedStoreIds
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      }),
      prisma.storeActivity.findMany({
        where: {
          storeId: {
            in: relatedStoreIds
          },
          label: {
            in: [...taskSlaAuditActivityLabels]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      }),
      prisma.storeTask.findMany({
        where: {
          storeId: {
            in: relatedStoreIds
          }
        },
        include: {
          comments: {
            orderBy: {
              createdAt: "desc"
            },
            take: 6
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 20
      }),
      loadStoreTaskSlaPolicyEntries(store.id)
    ]);
    const recentAuditRows = [
      ...activities.map((activity) => formatAuditActivityRow(activity, storeLookup.get(activity.storeId))),
      ...tasks.map((task) => formatAuditTaskRow(task, storeLookup.get(task.storeId)))
    ]
      .sort(compareAuditRows)
      .slice(0, 24);
    const includedAuditRowIds = new Set(recentAuditRows.map((row) => row.id));
    const pinnedPolicyRows = policyActivities
      .map((activity) => formatAuditActivityRow(activity, storeLookup.get(activity.storeId)))
      .filter((row) => !includedAuditRowIds.has(row.id))
      .slice(0, 4);
    const auditRows = [...recentAuditRows, ...pinnedPolicyRows]
      .sort(compareAuditRows)
      .map(({ sortBucket, sortScore, sortTime, ...row }) => row);

    response.json({
      workspaceId,
      title: "Audit Trail",
      rows: auditRows,
      policies
    });
    return;
  }

  if (workspaceId === "analytics") {
    response.json({
      workspaceId,
      title: "Executive Board",
      rows: store.modules.map((moduleItem) => ({
        id: moduleItem.id,
        label: moduleItem.appModule.name,
        status: moduleItem.status,
        ownerTeam: moduleItem.appModule.ownerTeam,
        headline: moduleItem.headline
      }))
    });
    return;
  }

  response.json({
    workspaceId,
    title: "Desktop",
    rows: store.modules.map((moduleItem) => ({
      id: moduleItem.id,
      module: moduleItem.appModule.name,
      status: moduleItem.status,
      headline: moduleItem.headline
    }))
  });
});

app.get("/api/stores/:storeId/sales-deals/:dealId/deposits", async (request, response) => {
  try {
    const { storeId, dealId } = request.params;
    const deal = await prisma.salesDeal.findFirst({
      where: {
        id: dealId,
        storeId
      }
    });

    if (!deal) {
      response.status(404).json({ message: "Sales deal not found." });
      return;
    }

    const depositState = await loadSalesDealDepositsState(storeId, deal);
    response.json(buildSalesDealDepositsResponse(deal, depositState));
  } catch (_error) {
    response.status(500).json({ message: "Unable to load sales deal deposits." });
  }
});

app.post("/api/stores/:storeId/sales-deals/:dealId/deposits", async (request, response) => {
  try {
    const { storeId, dealId } = request.params;
    const parsedDeposit = createSalesDealDepositSchema.safeParse(request.body);

    if (!parsedDeposit.success) {
      response.status(400).json({ message: "Enter valid deposit details before posting." });
      return;
    }

    const deal = await prisma.salesDeal.findFirst({
      where: {
        id: dealId,
        storeId
      }
    });

    if (!deal) {
      response.status(404).json({ message: "Sales deal not found." });
      return;
    }

    const actor = await resolveActorContext(storeId, parsedDeposit.data.actorUserId);
    const invoice = `INV-${createNumericRecordId("6")}`;
    const postedAmountCents = Math.round(parsedDeposit.data.amount * 100);
    const postedAmount = postedAmountCents / 100;
    const postedDate = parsedDeposit.data.date.trim();
    const arName = parsedDeposit.data.arAccount.trim() || resolveSalesDealDepositArName(parsedDeposit.data.method);
    await Promise.all([
      prisma.$transaction(async (transactionClient) => {
        const createdDeposit = await transactionClient.salesDealDeposit.create({
          data: {
            invoice,
            dateLabel: postedDate,
            cashier: parsedDeposit.data.cashier,
            method: parsedDeposit.data.method,
            arName,
            amountCents: postedAmountCents,
            description: parsedDeposit.data.description,
            notes: parsedDeposit.data.notes,
            reference: `DEP-${createNumericRecordId("6")}`,
            salesDealId: deal.id,
            storeId
          }
        });
        await transactionClient.salesDealDepositActivity.create({
          data: {
            salesDealDepositId: createdDeposit.id,
            title: "Deposit posted",
            detail: `${createdDeposit.method} deposit of ${formatCurrency(postedAmount)} posted by ${createdDeposit.cashier}.`,
            meta: `${postedDate} · ${invoice}`
          }
        });
        await transactionClient.salesDeal.update({
          where: {
            id: deal.id
          },
          data: {
            stage: "Deposit",
            tone: "gold"
          }
        });
      }),
      recordStoreActivity(
        storeId,
        {
          workspaceId: "sales",
          label: "Deposit posted",
          detail: `${deal.customerName} (${deal.worksheet}) deposit ${formatCurrency(postedAmount)} via ${parsedDeposit.data.method}.`,
          tone: "accent"
        },
        actor
      )
    ]);
    const refreshedDeal = await prisma.salesDeal.findFirst({
      where: {
        id: deal.id,
        storeId
      }
    });

    if (!refreshedDeal) {
      response.status(404).json({ message: "Sales deal not found after posting deposit." });
      return;
    }

    const depositState = await loadSalesDealDepositsState(storeId, refreshedDeal);
    response.status(201).json(buildSalesDealDepositsResponse(refreshedDeal, depositState));
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unable to post sales deal deposit." });
  }
});

app.post("/api/stores/:storeId/sales-deals/:dealId/deposits/:depositId/activity", async (request, response) => {
  try {
    const { storeId, dealId, depositId } = request.params;
    const parsedAction = salesDealDepositActivityActionSchema.safeParse(request.body);

    if (!parsedAction.success) {
      response.status(400).json({ message: "Enter a valid deposit activity action payload." });
      return;
    }

    const deal = await prisma.salesDeal.findFirst({
      where: {
        id: dealId,
        storeId
      }
    });

    if (!deal) {
      response.status(404).json({ message: "Sales deal not found." });
      return;
    }

    const deposit = await prisma.salesDealDeposit.findFirst({
      where: {
        id: depositId,
        salesDealId: deal.id,
        storeId
      }
    });

    if (!deposit) {
      response.status(404).json({ message: "Sales deal deposit not found." });
      return;
    }

    const actor = await resolveActorContext(storeId, parsedAction.data.actorUserId);
    const now = new Date();
    const mode = parsedAction.data.mode;
    const title = mode === "sendReceipt" ? "Receipt sent" : "Deposit reprinted";
    const detail = mode === "sendReceipt"
      ? `Receipt sent for invoice ${deposit.invoice}.`
      : `Deposit reprint opened for invoice ${deposit.invoice}.`;
    const meta = `${formatDate(now)} | ${deposit.reference}`;

    await Promise.all([
      prisma.salesDealDepositActivity.create({
        data: {
          salesDealDepositId: deposit.id,
          title,
          detail,
          meta
        }
      }),
      recordStoreActivity(
        storeId,
        {
          workspaceId: "sales",
          label: title,
          detail: `${deal.customerName} (${deal.worksheet}) ${detail}`,
          tone: "neutral"
        },
        actor
      )
    ]);
    const depositState = await loadSalesDealDepositsState(storeId, deal);
    response.json(buildSalesDealDepositsResponse(deal, depositState));
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unable to record sales deal deposit activity." });
  }
});

app.get("/api/stores/:storeId/service-orders/:roNumber/normalized", async (request, response) => {
  try {
    const order = await prisma.serviceOrder.findFirst({
      where: {
        storeId: request.params.storeId,
        roNumber: request.params.roNumber
      },
      include: {
        serviceJobs: {
          include: {
            parts: true,
            laborLines: true,
            subletLines: true
          },
          orderBy: {
            jobNumber: "asc"
          }
        }
      }
    });

    if (!order) {
      response.status(404).json({ message: "Service order not found." });
      return;
    }

    if (order.serviceJobs.length > 0) {
      response.json({ source: "normalized", serviceOrder: order });
      return;
    }

    const snapshot = parseServiceDetailSnapshot(order.detailSnapshot);
    response.json({
      source: "snapshot",
      serviceOrder: {
        ...order,
        serviceJobs: buildSnapshotServiceJobs(snapshot)
      }
    });
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unable to load normalized service order data." });
  }
});

app.post("/api/stores/:storeId/service-orders/:roNumber/normalize", async (request, response) => {
  try {
    const order = await prisma.serviceOrder.findFirst({
      where: {
        storeId: request.params.storeId,
        roNumber: request.params.roNumber
      },
      include: {
        serviceJobs: {
          select: {
            id: true
          }
        }
      }
    });

    if (!order) {
      response.status(404).json({ message: "Service order not found." });
      return;
    }

    if (order.serviceJobs.length > 0) {
      response.json({ ok: true, createdJobs: 0 });
      return;
    }

    const snapshot = parseServiceDetailSnapshot(order.detailSnapshot);
    const snapshotJobs = buildSnapshotServiceJobs(snapshot);

    await prisma.$transaction(
      snapshotJobs.map((job) =>
        prisma.serviceJob.create({
          data: {
            jobNumber: job.jobNumber,
            title: job.title,
            status: job.status,
            technician: job.technician,
            unitLabel: job.unitLabel,
            description: job.description,
            recommendations: job.recommendations,
            resolution: job.resolution,
            serviceOrderId: order.id,
            parts: {
              create: job.parts.map((part) => ({
                partNumber: part.partNumber,
                description: part.description,
                quantity: part.quantity,
                unitPriceCents: part.unitPriceCents
              }))
            },
            laborLines: {
              create: job.laborLines.map((line) => ({
                technician: line.technician,
                hours: line.hours,
                rateCents: line.rateCents,
                status: line.status
              }))
            },
            subletLines: {
              create: job.subletLines.map((line) => ({
                vendor: line.vendor,
                description: line.description,
                amountCents: line.amountCents,
                status: line.status
              }))
            }
          }
        })
      )
    );

    response.json({ ok: true, createdJobs: snapshotJobs.length });
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unable to normalize service order data." });
  }
});

app.get("/api/stores/:storeId/service-orders/:serviceOrderId", async (request, response) => {
  try {
    const { storeId, serviceOrderId } = request.params;
    const context = await loadServiceOrderDetailContext(storeId, serviceOrderId);

    response.json({
      row: context.row,
      detail: context.detail,
      partCatalog: context.partCatalog
    });
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unable to load the service order." });
  }
});

app.post("/api/stores/:storeId/service-orders", async (request, response) => {
  try {
    const { storeId } = request.params;
    const parsedOrder = createServiceOrderSchema.safeParse(request.body);

    if (!parsedOrder.success) {
      response.status(400).json({ message: "Enter valid order details to create a service lane." });
      return;
    }

    const actor = await resolveActorContext(storeId, parsedOrder.data.actorUserId);
    const inDate = new Date();
    const roNumber = await buildNextServiceRoNumber(storeId);
    const initializedOrder = initializeServiceOrder({
      id: randomUUID(),
      inDate: formatDate(inDate),
      roNumber,
      orderType: parsedOrder.data.orderType,
      customerName: parsedOrder.data.customerName,
      stockNumber: parsedOrder.data.stockNumber,
      model: parsedOrder.data.model,
      serviceWriter: parsedOrder.data.serviceWriter || actor.actorName,
      maker: parsedOrder.data.maker,
      note: parsedOrder.data.note
    });
    const createdOrder = await prisma.serviceOrder.create({
      data: {
        id: initializedOrder.row.id,
        inDate,
        roNumber: initializedOrder.row.roNumber,
        orderType: initializedOrder.row.orderType,
        customerName: initializedOrder.row.customerName,
        stockNumber: initializedOrder.row.stockNumber,
        model: initializedOrder.row.model,
        serviceWriter: initializedOrder.row.serviceWriter,
        roStatus: initializedOrder.row.roStatus,
        category: initializedOrder.row.category,
        maker: initializedOrder.row.maker,
        note: initializedOrder.row.note,
        detailSnapshot: initializedOrder.detailSnapshot,
        tone: initializedOrder.row.tone,
        storeId
      }
    });
    const activity = await recordStoreActivity(
      storeId,
      {
        workspaceId: "service",
        label: parsedOrder.data.orderType === "Estimate" ? "Estimate opened" : "Repair order opened",
        detail: `RO ${createdOrder.roNumber} created for ${createdOrder.customerName}.`,
        tone: "accent"
      },
      actor
    );
    const refreshedContext = await loadServiceOrderDetailContext(storeId, createdOrder.id);

    response.status(201).json({
      message: `${parsedOrder.data.orderType} ${createdOrder.roNumber} created.`,
      row: refreshedContext.row,
      detail: refreshedContext.detail,
      partCatalog: refreshedContext.partCatalog,
      activityEntry: formatStoreActivityEntry(activity)
    });
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unable to create the service order." });
  }
});

app.post("/api/stores/:storeId/service-orders/:serviceOrderId/duplicate", async (request, response) => {
  try {
    const { storeId, serviceOrderId } = request.params;
    const parsedDuplicate = duplicateServiceOrderSchema.safeParse(request.body);

    if (!parsedDuplicate.success) {
      response.status(400).json({ message: "Enter a valid reason to duplicate the service lane." });
      return;
    }

    const actor = await resolveActorContext(storeId, parsedDuplicate.data.actorUserId);
    const sourceOrder = await prisma.serviceOrder.findFirst({
      where: {
        id: serviceOrderId,
        storeId
      }
    });

    if (!sourceOrder) {
      response.status(404).json({ message: "The source service order could not be found." });
      return;
    }

    const duplicateReason = parsedDuplicate.data.reason.trim() || "Follow-up repair";
    const inDate = new Date();
    const roNumber = await buildNextServiceRoNumber(storeId);
    const initializedOrder = initializeServiceOrder({
      id: randomUUID(),
      inDate: formatDate(inDate),
      roNumber,
      orderType: sourceOrder.orderType === "Estimate" ? "Estimate" : "Repair Order",
      customerName: sourceOrder.customerName,
      stockNumber: sourceOrder.stockNumber,
      model: sourceOrder.model,
      serviceWriter: sourceOrder.serviceWriter || actor.actorName,
      maker: sourceOrder.maker,
      note: buildDuplicatedServiceOrderNote(sourceOrder.note, duplicateReason)
    });
    const createdOrder = await prisma.serviceOrder.create({
      data: {
        id: initializedOrder.row.id,
        inDate,
        roNumber: initializedOrder.row.roNumber,
        orderType: initializedOrder.row.orderType,
        customerName: initializedOrder.row.customerName,
        stockNumber: initializedOrder.row.stockNumber,
        model: initializedOrder.row.model,
        serviceWriter: initializedOrder.row.serviceWriter,
        roStatus: initializedOrder.row.roStatus,
        category: initializedOrder.row.category,
        maker: initializedOrder.row.maker,
        note: initializedOrder.row.note,
        detailSnapshot: initializedOrder.detailSnapshot,
        tone: initializedOrder.row.tone,
        storeId
      }
    });
    const activity = await recordStoreActivity(
      storeId,
      {
        workspaceId: "service",
        label: sourceOrder.orderType === "Estimate" ? "Estimate duplicated" : "Repair order duplicated",
        detail: `RO ${sourceOrder.roNumber} duplicated to RO ${createdOrder.roNumber} for ${createdOrder.customerName}. ${duplicateReason}.`,
        tone: "accent"
      },
      actor
    );
    const refreshedContext = await loadServiceOrderDetailContext(storeId, createdOrder.id);

    response.status(201).json({
      message: `RO ${sourceOrder.roNumber} duplicated to ${createdOrder.roNumber}.`,
      row: refreshedContext.row,
      detail: refreshedContext.detail,
      partCatalog: refreshedContext.partCatalog,
      activityEntry: formatStoreActivityEntry(activity)
    });
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unable to duplicate the service order." });
  }
});

app.post("/api/stores/:storeId/service-orders/:serviceOrderId/actions", async (request, response) => {
  try {
    const { storeId, serviceOrderId } = request.params;
    const parsedAction = serviceOrderDetailActionSchema.safeParse(request.body);

    if (!parsedAction.success) {
      response.status(400).json({ message: "Enter a valid service order action payload." });
      return;
    }

    const actor = await resolveActorContext(storeId, parsedAction.data.actorUserId);
    const context = await loadServiceOrderDetailContext(storeId, serviceOrderId);
    const mutationResult = applyServiceOrderDetailMutation(
      context.row,
      context.detail,
      mapServiceOrderMutation(parsedAction.data),
      context.taskEntries,
      context.activityEntries
    );
    const previousRoNumber = context.order.roNumber;
    const nextRoNumber = mutationResult.rowPatch.roNumber ?? previousRoNumber;
    const nextInDate = mutationResult.rowPatch.inDate ? parseUsDateInput(mutationResult.rowPatch.inDate) : null;

    if (mutationResult.rowPatch.inDate && !nextInDate) {
      response.status(400).json({ message: "Enter a valid in date in MM/DD/YYYY format." });
      return;
    }

    const orderUpdateData: {
      detailSnapshot: string;
      inDate?: Date;
      roNumber?: string;
      orderType?: "Estimate" | "Repair Order";
      customerName?: string;
      stockNumber?: string;
      model?: string;
      serviceWriter?: string;
      roStatus?: string;
      category?: string;
      maker?: string;
      note?: string;
      tone?: string;
    } = {
      detailSnapshot: serializeServiceOrderDetail(mutationResult.detail)
    };

    if (mutationResult.rowPatch.inDate && nextInDate) {
      orderUpdateData.inDate = nextInDate;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "roNumber")) {
      orderUpdateData.roNumber = mutationResult.rowPatch.roNumber;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "orderType")) {
      orderUpdateData.orderType = mutationResult.rowPatch.orderType;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "customerName")) {
      orderUpdateData.customerName = mutationResult.rowPatch.customerName;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "stockNumber")) {
      orderUpdateData.stockNumber = mutationResult.rowPatch.stockNumber;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "model")) {
      orderUpdateData.model = mutationResult.rowPatch.model;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "serviceWriter")) {
      orderUpdateData.serviceWriter = mutationResult.rowPatch.serviceWriter;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "roStatus")) {
      orderUpdateData.roStatus = mutationResult.rowPatch.roStatus;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "category")) {
      orderUpdateData.category = mutationResult.rowPatch.category;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "maker")) {
      orderUpdateData.maker = mutationResult.rowPatch.maker;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "note")) {
      orderUpdateData.note = mutationResult.rowPatch.note;
    }

    if (Object.prototype.hasOwnProperty.call(mutationResult.rowPatch, "tone")) {
      orderUpdateData.tone = mutationResult.rowPatch.tone;
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: {
        id: context.order.id
      },
      data: orderUpdateData
    });

    if (nextRoNumber !== previousRoNumber) {
      await rewriteServiceRoReferences(storeId, previousRoNumber, nextRoNumber);
    }

    const activity = await recordStoreActivity(
      storeId,
      {
        workspaceId: "service",
        label: mutationResult.activityLabel,
        detail: mutationResult.activityDetail,
        tone: mutationResult.activityTone
      },
      actor
    );
    const refreshedContext = await loadServiceOrderDetailContext(storeId, updatedOrder.id);

    response.json({
      message: mutationResult.message,
      row: refreshedContext.row,
      detail: refreshedContext.detail,
      partCatalog: refreshedContext.partCatalog,
      activityEntry: formatStoreActivityEntry(activity)
    });
  } catch (error) {
    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: error instanceof Error ? error.message : "Unable to update the service order." });
  }
});

app.get("/api/stores/:storeId/activity", async (request, response) => {
  const parsedQuery = activityFilterSchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({ message: "Unknown workspace." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const activity = await prisma.storeActivity.findMany({
    where: {
      storeId: store.id,
      workspaceId: parsedQuery.data.workspaceId,
      ...(parsedQuery.data.actorUserId ? { actorUserId: parsedQuery.data.actorUserId } : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    take: parsedQuery.data.limit ?? 8
  });

  response.json(activity.map(formatStoreActivityEntry));
});

app.get("/api/stores/:storeId/dealer-setup/dealers", async (request, response) => {
  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  response.json({
    dealers: cloneDealerSetupPersistedValue(dealerSetupPersistedDealersByStoreId.get(store.id) ?? [])
  });
});

app.post("/api/stores/:storeId/dealer-setup/dealers", async (request, response) => {
  const parsedBody = dealerSetupCreateSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({ message: "Enter a valid Dealer Setup onboarding payload." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const nextDealer = cloneDealerSetupPersistedValue(parsedBody.data.dealer);
  const currentDealers = dealerSetupPersistedDealersByStoreId.get(store.id) ?? [];

  dealerSetupPersistedDealersByStoreId.set(
    store.id,
    [nextDealer, ...currentDealers.filter((dealer) => dealer.id !== nextDealer.id)]
  );

  response.status(201).json({
    dealer: nextDealer,
    message: `${nextDealer.name} was saved for ${store.name} and will remain available after reload.`
  });
});

type FinovoBillStatus = "Pending Approval" | "Due Soon" | "Overdue" | "Paid";
type FinovoRecentActivityTone = "positive" | "neutral" | "warning";

const finovoStatusColors: Record<FinovoBillStatus, string> = {
  "Pending Approval": "#f4b544",
  "Due Soon": "#2f8cff",
  Overdue: "#ff5a4e",
  Paid: "#27cf74"
};

const finovoPreferredVendorOrder = [
  "Atlantic Marine Supply",
  "Yamaha Motors",
  "SeaTech Distributors",
  "Johnsons Controls",
  "West Marine",
  "Garmin International",
  "Mercury Marine Parts",
  "Sea Ray Distribution"
];

const finovoFallbackVendorSeeds = [
  { name: "Atlantic Marine Supply", contact: "Olivia Reed", phone: "800-555-1101", email: "ap@atlanticmarine.com", terms: "Net 15", leadDays: 4, notes: "Dockside replenishment supplier" },
  { name: "Yamaha Motors", contact: "Evan Brooks", phone: "800-555-1102", email: "marine.ap@yamaha.com", terms: "Net 15", leadDays: 5, notes: "Outboard inventory bills" },
  { name: "SeaTech Distributors", contact: "Carmen Diaz", phone: "800-555-1103", email: "finance@seatechdist.com", terms: "Net 30", leadDays: 6, notes: "Electronics distributor" },
  { name: "Johnsons Controls", contact: "Marcus Hale", phone: "800-555-1104", email: "billing@johnsonscontrols.com", terms: "Net 30", leadDays: 8, notes: "Facilities infrastructure invoices" },
  { name: "West Marine", contact: "Avery Stone", phone: "800-555-1105", email: "wholesale@westmarine.com", terms: "COD", leadDays: 2, notes: "Retail accessories and safety gear" },
  { name: "Garmin International", contact: "Taylor Quinn", phone: "800-555-1106", email: "payables@garmin.com", terms: "2/10 Net 30", leadDays: 4, notes: "Navigation electronics" }
];

const finovoFallbackApprovals = [
  { type: "Bill Approval", reference: "INV-14587", requestedBy: "Atlantic Marine Supply", impact: "$8,750.00", reason: "Dockside replenishment package requires controller approval.", status: "Pending" },
  { type: "Bill Approval", reference: "INV-09231", requestedBy: "Yamaha Motors", impact: "$12,540.00", reason: "Outboard settlement invoice staged for the next payment release.", status: "Pending" },
  { type: "Bill Approval", reference: "INV-35221", requestedBy: "SeaTech Distributors", impact: "$6,230.00", reason: "Helm electronics order needs ACH approval.", status: "Pending" }
];

function hashFinovoSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function parseFinovoCurrency(value: string) {
  const normalized = value.replace(/[^0-9.-]+/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFinovoDisplayDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

function formatFinovoCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatFinovoCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function createFinovoInvoiceNumber(seed: number, index: number) {
  return `INV-${10000 + ((seed + index * 137) % 90000)}`;
}

function normalizeFinovoApprovalStatus(status: string) {
  return status.trim().toLowerCase();
}

function isFinovoApprovalPendingReview(status: string) {
  const normalized = normalizeFinovoApprovalStatus(status);
  return normalized !== "approved" && normalized !== "scheduled" && normalized !== "paid";
}

function mapFinovoApprovalStatus(status: string): FinovoBillStatus {
  const normalized = normalizeFinovoApprovalStatus(status);

  if (normalized === "paid") {
    return "Paid";
  }

  if (normalized === "approved" || normalized === "scheduled") {
    return "Due Soon";
  }

  return "Pending Approval";
}

function buildFinovoMetricPoints(seed: number, offset: number) {
  return Array.from({ length: 7 }, (_, index) => offset + ((seed + index * 9) % 6) + index * 2);
}

function sortFinovoVendors<T extends { name: string }>(vendors: T[]) {
  return [...vendors].sort((left, right) => {
    const leftIndex = finovoPreferredVendorOrder.indexOf(left.name);
    const rightIndex = finovoPreferredVendorOrder.indexOf(right.name);
    const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    return normalizedLeftIndex - normalizedRightIndex || left.name.localeCompare(right.name);
  });
}

function buildFinovoPayablesPayload(
  store: { id: string; name: string },
  vendors: Array<{ id: string; name: string; contact: string; phone: string; email: string; terms: string; leadDays: number; notes: string; createdAt: Date; updatedAt: Date }>,
  approvals: Array<{ id: string; type: string; reference: string; requestedBy: string; impact: string; reason: string; status: string; createdAt: Date; updatedAt: Date }>
) {
  const vendorRows = sortFinovoVendors(
    vendors.length > 0
      ? vendors
      : finovoFallbackVendorSeeds.map((vendor, index) => ({
          id: `fallback-vendor-${store.id}-${index}`,
          createdAt: addDays(new Date(), -(index + 2)),
          updatedAt: addDays(new Date(), -(index + 1)),
          ...vendor
        }))
  );

  const approvalRows =
    approvals.length > 0
      ? approvals
      : finovoFallbackApprovals.map((approval, index) => ({
          id: `fallback-approval-${store.id}-${index}`,
          createdAt: addDays(new Date(), -(index + 1)),
          updatedAt: addDays(new Date(), -index),
          ...approval
        }));

  const paymentMethods = ["ACH", "Check", "Wire"];
  const today = new Date();
  const approvalBills = approvalRows.map((approval, index) => {
    const seed = hashFinovoSeed(`${store.id}:${approval.id}:${approval.reference}`);
    const status = mapFinovoApprovalStatus(approval.status);
    const dueOffset = status === "Pending Approval" ? 4 + (seed % 6) : status === "Due Soon" ? 2 + (seed % 5) : -(4 + (seed % 9));
    const dueDate = addDays(today, dueOffset);
    const billDate = addDays(dueDate, -(5 + (seed % 7)));

    return {
      id: `approval-bill-${approval.id}`,
      vendor: approval.requestedBy || vendorRows[index % Math.max(vendorRows.length, 1)]?.name || "Vendor",
      invoiceNumber: approval.reference,
      billDate,
      dueDate,
      amount: parseFinovoCurrency(approval.impact) ?? 3500 + (seed % 14000),
      status,
      paymentMethod: paymentMethods[seed % paymentMethods.length]
    };
  });

  const vendorBills = vendorRows.flatMap((vendor, index) => {
    const seed = hashFinovoSeed(`${store.id}:${vendor.id}:${vendor.name}`);
    const billCount = index % 2 === 0 ? 2 : 1;

    return Array.from({ length: billCount }, (_, billIndex) => {
      const statuses: FinovoBillStatus[] = ["Due Soon", "Paid", "Overdue", "Due Soon", "Paid"];
      const status = statuses[(seed + billIndex) % statuses.length];
      const dueOffset =
        status === "Overdue"
          ? -(10 + ((seed + billIndex * 7) % 40))
          : status === "Paid"
            ? -(3 + ((seed + billIndex * 5) % 18))
            : 3 + ((seed + billIndex * 11) % 10);
      const dueDate = addDays(today, dueOffset);
      const billDate = addDays(dueDate, -(6 + ((seed + billIndex * 3) % 8)));

      return {
        id: `vendor-bill-${vendor.id}-${billIndex}`,
        vendor: vendor.name,
        invoiceNumber: createFinovoInvoiceNumber(seed, billIndex),
        billDate,
        dueDate,
        amount: 4200 + ((seed + billIndex * 941) % 22000),
        status,
        paymentMethod: paymentMethods[(seed + billIndex) % paymentMethods.length]
      };
    });
  });

  const usedInvoices = new Set(approvalBills.map((bill) => bill.invoiceNumber));
  const bills = [...approvalBills, ...vendorBills.filter((bill) => !usedInvoices.has(bill.invoiceNumber))]
    .slice(0, 12)
    .sort((left, right) => {
      const statusOrder: Record<FinovoBillStatus, number> = {
        Overdue: 0,
        "Pending Approval": 1,
        "Due Soon": 2,
        Paid: 3
      };

      return statusOrder[left.status] - statusOrder[right.status] || left.dueDate.getTime() - right.dueDate.getTime();
    });

  const totalPayables = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const statusBreakdown = (Object.keys(finovoStatusColors) as FinovoBillStatus[]).map((status) => {
    const matchingBills = bills.filter((bill) => bill.status === status);

    return {
      id: status.toLowerCase().replace(/[^a-z]+/g, "-"),
      label: status,
      amount: matchingBills.reduce((sum, bill) => sum + bill.amount, 0),
      count: matchingBills.length,
      color: finovoStatusColors[status]
    };
  });

  const newBills = bills.filter((bill) => bill.billDate >= addDays(today, -30));
  const dueSoonBills = bills.filter((bill) => bill.status === "Due Soon");
  const overdueBills = bills
    .filter((bill) => bill.status === "Overdue")
    .sort((left, right) => right.amount - left.amount)
    .map((bill) => ({
      id: bill.id,
      vendor: bill.vendor,
      invoiceNumber: bill.invoiceNumber,
      amount: bill.amount,
      ageLabel: `${Math.max(1, Math.ceil((today.getTime() - bill.dueDate.getTime()) / 86_400_000))} Days`
    }));

  const discountOpportunities = bills
    .filter((bill) => bill.status !== "Paid")
    .slice(0, 3)
    .map((bill, index) => {
      const vendor = vendorRows.find((candidate) => candidate.name === bill.vendor) ?? vendorRows[index % Math.max(vendorRows.length, 1)];
      const discountRate = vendor?.terms.includes("2/10") ? 0.02 : vendor?.leadDays && vendor.leadDays <= 5 ? 0.015 : 0.01;

      return {
        id: `discount-${bill.id}`,
        vendor: bill.vendor,
        amount: Math.round(bill.amount * discountRate),
        discountLabel: `${(discountRate * 100).toFixed(discountRate === 0.015 ? 1 : 0)}% discount`,
        dueLabel: `Due in ${Math.max(1, Math.ceil((bill.dueDate.getTime() - today.getTime()) / 86_400_000))} days`
      };
    });

  const vendorSpendMap = new Map<string, number>();

  for (const bill of bills) {
    vendorSpendMap.set(bill.vendor, (vendorSpendMap.get(bill.vendor) ?? 0) + bill.amount);
  }

  const vendorSpend = Array.from(vendorSpendMap.entries())
    .map(([vendor, spend], index) => ({ id: `vendor-spend-${index}`, vendor, spend }))
    .sort((left, right) => right.spend - left.spend)
    .slice(0, 5);

  const cashFlowPoints = Array.from({ length: 8 }, (_, index) => {
    const bucketStart = addDays(today, index * 12);
    const bucketEnd = addDays(bucketStart, 11);
    const bucketBills = bills.filter((bill) => bill.dueDate >= bucketStart && bill.dueDate <= bucketEnd && bill.status !== "Paid");
    const cashOut = bucketBills.reduce((sum, bill) => sum + bill.amount, 0) || 22000 + ((hashFinovoSeed(`${store.id}:bucket:${index}`) % 18000));
    const cashIn = Math.round((cashOut * 1.7 + 26000 + (hashFinovoSeed(`${store.id}:cash-in:${index}`) % 22000)) / 100) * 100;

    return {
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(bucketStart),
      cashIn,
      cashOut
    };
  });

  const recentActivity = [
    ...bills
      .filter((bill) => bill.status === "Paid")
      .slice(0, 2)
      .map((bill, index) => ({
        id: `activity-paid-${bill.id}`,
        label: `Payment sent to ${bill.vendor}`,
        amount: bill.amount,
        timeLabel: `${index + 2}h`,
        tone: "positive" as FinovoRecentActivityTone
      })),
    ...approvalRows.slice(0, 2).map((approval, index) => ({
      id: `activity-approval-${approval.id}`,
      label:
        normalizeFinovoApprovalStatus(approval.status) === "paid"
          ? `Payment posted ${approval.requestedBy}`
          : normalizeFinovoApprovalStatus(approval.status) === "scheduled"
            ? `Payment scheduled ${approval.requestedBy}`
            : normalizeFinovoApprovalStatus(approval.status) === "approved"
              ? `Bill approved ${approval.requestedBy}`
              : `Bill awaiting review ${approval.requestedBy}`,
      amount: parseFinovoCurrency(approval.impact) ?? 0,
      timeLabel: formatMinutesAgo(approval.updatedAt),
      tone:
        (normalizeFinovoApprovalStatus(approval.status) === "paid"
          ? "positive"
          : normalizeFinovoApprovalStatus(approval.status) === "scheduled" || normalizeFinovoApprovalStatus(approval.status) === "approved"
            ? "neutral"
            : "warning") as FinovoRecentActivityTone
    })),
    ...vendorRows.slice(0, 1).map((vendor) => ({
      id: `activity-vendor-${vendor.id}`,
      label: `Vendor profile updated ${vendor.name}`,
      amount: 0,
      timeLabel: formatMinutesAgo(vendor.updatedAt),
      tone: "neutral" as FinovoRecentActivityTone
    }))
  ].slice(0, 5);

  const upcomingPayments = [
    {
      id: "tomorrow",
      label: "Tomorrow",
      billCount: bills.filter((bill) => bill.status !== "Paid" && bill.dueDate <= addDays(today, 1)).length,
      amount: bills.filter((bill) => bill.status !== "Paid" && bill.dueDate <= addDays(today, 1)).reduce((sum, bill) => sum + bill.amount, 0)
    },
    {
      id: "week",
      label: "This Week",
      billCount: bills.filter((bill) => bill.status !== "Paid" && bill.dueDate <= addDays(today, 7)).length,
      amount: bills.filter((bill) => bill.status !== "Paid" && bill.dueDate <= addDays(today, 7)).reduce((sum, bill) => sum + bill.amount, 0)
    },
    {
      id: "next7",
      label: "Next 7 Days",
      billCount: bills.filter((bill) => bill.status !== "Paid" && bill.dueDate <= addDays(today, 14)).length,
      amount: bills.filter((bill) => bill.status !== "Paid" && bill.dueDate <= addDays(today, 14)).reduce((sum, bill) => sum + bill.amount, 0)
    },
    {
      id: "total",
      label: "Total To Pay",
      billCount: bills.filter((bill) => bill.status !== "Paid").length,
      amount: bills.filter((bill) => bill.status !== "Paid").reduce((sum, bill) => sum + bill.amount, 0)
    }
  ];

  const agingBuckets = [
    {
      id: "current",
      label: "Current (0-30)",
      amount: bills.filter((bill) => bill.status === "Due Soon" || bill.status === "Pending Approval").reduce((sum, bill) => sum + bill.amount, 0),
      tone: "positive" as const
    },
    {
      id: "thirty-one",
      label: "31-60 Days",
      amount: overdueBills.slice(0, 1).reduce((sum, bill) => sum + bill.amount, 0) + 92430,
      tone: "warning" as const
    },
    {
      id: "sixty-one",
      label: "61-90 Days",
      amount: overdueBills.slice(1, 2).reduce((sum, bill) => sum + bill.amount, 0) + 84890,
      tone: "warning" as const
    },
    {
      id: "ninety-plus",
      label: "90+ Days",
      amount: overdueBills.reduce((sum, bill) => sum + bill.amount, 0) + 120000,
      tone: "danger" as const
    }
  ];

  const agingTotal = agingBuckets.reduce((sum, bucket) => sum + bucket.amount, 0);

  return {
    storeId: store.id,
    storeName: store.name,
    generatedAt: new Date().toISOString(),
    statusNotice: "Finovo is loading live store-scoped vendor and approval data from the API. Bill ledger and cash-flow views are derived server-side until AP transaction persistence lands.",
    navItems: [
      { id: "home", label: "Home", badge: null },
      { id: "bills", label: "Bills", badge: `${bills.length}` },
      { id: "expenses", label: "Expenses", badge: null },
      { id: "vendors", label: "Vendors", badge: `${vendorRows.length}` },
      { id: "approvals", label: "Approvals", badge: `${approvalRows.filter((approval) => isFinovoApprovalPendingReview(approval.status)).length}` },
      { id: "payments", label: "Payments", badge: `${bills.filter((bill) => bill.status === "Paid").length}` },
      { id: "1099s", label: "1099s", badge: `${Math.min(vendorRows.length, 9)}` },
      { id: "reports", label: "Reports", badge: "4" },
      { id: "cashflow", label: "Cash Flow", badge: null },
      { id: "settings", label: "Settings", badge: null }
    ],
    summaryCards: [
      { id: "total-balance", title: "Total AP Balance", value: formatFinovoCurrency(totalPayables), caption: "Live vendor-backed exposure", tone: "default" as const },
      { id: "new-bills", title: "New Bills", value: formatFinovoCurrency(newBills.reduce((sum, bill) => sum + bill.amount, 0)), caption: `${newBills.length} bills`, tone: "default" as const },
      { id: "due-soon", title: "Bills Due (Next 7 Days)", value: formatFinovoCurrency(dueSoonBills.reduce((sum, bill) => sum + bill.amount, 0)), caption: `${dueSoonBills.length} bills`, tone: "default" as const },
      { id: "overdue", title: "Overdue", value: formatFinovoCurrency(overdueBills.reduce((sum, bill) => sum + bill.amount, 0)), caption: `${overdueBills.length} bills`, tone: "critical" as const },
      { id: "discounts", title: "Early Payment Discounts", value: formatFinovoCurrency(discountOpportunities.reduce((sum, item) => sum + item.amount, 0)), caption: `${discountOpportunities.length} offers available`, tone: "positive" as const }
    ],
    cashFlowForecast: {
      windowLabel: "Next 90 Days",
      highlightLabel: `${cashFlowPoints[2]?.label ?? "Week 3"} - ${cashFlowPoints[3]?.label ?? "Week 4"}`,
      highlightCashIn: cashFlowPoints[2]?.cashIn ?? 0,
      highlightCashOut: cashFlowPoints[2]?.cashOut ?? 0,
      points: cashFlowPoints
    },
    statusBreakdown,
    approvals: approvalBills.slice(0, 3).map((bill, index) => ({
      id: `approval-card-${bill.id}`,
      vendor: bill.vendor,
      invoiceNumber: bill.invoiceNumber,
      dueLabel: `Due ${formatFinovoDisplayDate(bill.dueDate)}`,
      amount: bill.amount,
      requestedBy: approvalRows[index]?.requestedBy ?? bill.vendor
    })),
    recentActivity,
    upcomingPayments,
    bills: bills.map((bill) => ({
      id: bill.id,
      vendor: bill.vendor,
      invoiceNumber: bill.invoiceNumber,
      billDate: formatFinovoDisplayDate(bill.billDate),
      dueDate: formatFinovoDisplayDate(bill.dueDate),
      amount: bill.amount,
      status: bill.status,
      paymentMethod: bill.paymentMethod
    })),
    overdueBills,
    discountOpportunities,
    vendorSpend,
    performanceMetrics: [
      { id: "avg-days", title: "Avg. Days to Pay", value: `${24 + (hashFinovoSeed(`${store.id}:days`) % 8)}`, changeLabel: `4 vs last month`, points: buildFinovoMetricPoints(hashFinovoSeed(`${store.id}:days`), 8) },
      { id: "on-time", title: "On-Time Payments", value: `${90 + (hashFinovoSeed(`${store.id}:ontime`) % 7)}%`, changeLabel: `5% vs last month`, points: buildFinovoMetricPoints(hashFinovoSeed(`${store.id}:ontime`), 10) },
      { id: "bills-processed", title: "Bills Processed", value: `${bills.length * 14}`, changeLabel: `12 vs last month`, points: buildFinovoMetricPoints(hashFinovoSeed(`${store.id}:bills-processed`), 7) },
      { id: "discount-metric", title: "Early Pay Discounts", value: formatFinovoCurrency(discountOpportunities.reduce((sum, item) => sum + item.amount, 0)), changeLabel: `18% vs last month`, points: buildFinovoMetricPoints(hashFinovoSeed(`${store.id}:discounts`), 4) },
      { id: "payments-total", title: "Total Payments", value: formatFinovoCurrency(bills.filter((bill) => bill.status === "Paid").reduce((sum, bill) => sum + bill.amount, 0)), changeLabel: `11% vs last month`, points: buildFinovoMetricPoints(hashFinovoSeed(`${store.id}:payments-total`), 6) },
      { id: "approved-bills", title: "Bills Approved", value: `${approvalRows.filter((approval) => approval.status === "Approved").length + dueSoonBills.length}`, changeLabel: `9 vs last month`, points: buildFinovoMetricPoints(hashFinovoSeed(`${store.id}:approved-bills`), 5) }
    ],
    agingBuckets: agingBuckets.map((bucket) => ({
      ...bucket,
      shareLabel: `${Math.max(1, Math.round((bucket.amount / Math.max(agingTotal, 1)) * 100))}%`
    })),
    filterCounts: {
      all: bills.length,
      pendingApproval: bills.filter((bill) => bill.status === "Pending Approval").length,
      dueSoon: bills.filter((bill) => bill.status === "Due Soon").length,
      overdue: bills.filter((bill) => bill.status === "Overdue").length,
      paid: bills.filter((bill) => bill.status === "Paid").length
    }
  };
}

app.get("/api/stores/:storeId/payables/finovo", async (request, response) => {
  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const [vendors, approvals] = await Promise.all([
    prisma.vendor.findMany({
      where: { storeId: store.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        contact: true,
        phone: true,
        email: true,
        terms: true,
        leadDays: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.approvalRequest.findMany({
      where: { storeId: store.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        type: true,
        reference: true,
        requestedBy: true,
        impact: true,
        reason: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ]);

  response.json(buildFinovoPayablesPayload(store, vendors, approvals));
});

app.get("/api/stores/:storeId/reports/cashier-accountability", async (request, response) => {
  const parsedQuery = cashierAccountabilityReportQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({ message: "Enter a valid cashier accountability date range." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const startAt = parseDateInput(parsedQuery.data.startDate);
  const endExclusive = addDays(parseDateInput(parsedQuery.data.endDate), 1);
  const activities = await prisma.storeActivity.findMany({
    where: {
      storeId: store.id,
      createdAt: {
        gte: startAt,
        lt: endExclusive
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      workspaceId: true,
      label: true,
      detail: true,
      tone: true,
      actorUserId: true,
      actorName: true,
      actorInitial: true,
      createdAt: true,
      actorUser: {
        select: {
          title: true
        }
      }
    }
  });

  const operatorSummary = new Map<string, {
    operatorKey: string;
    actorUserId: string | null;
    name: string;
    initial: string;
    title: string;
    activityCount: number;
    activeDates: Set<string>;
    latestActivityAt: string;
    latestActivityLabel: string;
  }>();

  const entries = activities.map((activity) => {
    const operatorKey = activity.actorUserId ?? `actor:${activity.actorName.toLowerCase()}`;
    const occurredAtIso = activity.createdAt.toISOString();
    const occurredDateKey = occurredAtIso.slice(0, 10);
    const existingOperator = operatorSummary.get(operatorKey);

    if (existingOperator) {
      existingOperator.activityCount += 1;
      existingOperator.activeDates.add(occurredDateKey);
    } else {
      operatorSummary.set(operatorKey, {
        operatorKey,
        actorUserId: activity.actorUserId,
        name: activity.actorName,
        initial: activity.actorInitial,
        title: activity.actorUser?.title ?? "Store Operator",
        activityCount: 1,
        activeDates: new Set([occurredDateKey]),
        latestActivityAt: occurredAtIso,
        latestActivityLabel: activity.label
      });
    }

    return {
      id: activity.id,
      operatorKey,
      actorUserId: activity.actorUserId,
      actorName: activity.actorName,
      actorInitial: activity.actorInitial,
      actorTitle: activity.actorUser?.title ?? "Store Operator",
      workspaceId: activity.workspaceId as z.infer<typeof workspaceSchema>,
      label: activity.label,
      detail: activity.detail,
      tone: activity.tone as z.infer<typeof activityToneSchema>,
      occurredAt: occurredAtIso
    };
  });

  response.json({
    storeId: store.id,
    storeName: store.name,
    startDate: parsedQuery.data.startDate,
    endDate: parsedQuery.data.endDate,
    operators: Array.from(operatorSummary.values())
      .map((operator) => ({
        operatorKey: operator.operatorKey,
        actorUserId: operator.actorUserId,
        name: operator.name,
        initial: operator.initial,
        title: operator.title,
        activityCount: operator.activityCount,
        activeDateCount: operator.activeDates.size,
        latestActivityAt: operator.latestActivityAt,
        latestActivityLabel: operator.latestActivityLabel
      }))
      .sort((left, right) => right.activityCount - left.activityCount || left.name.localeCompare(right.name)),
    entries
  });
});

app.get("/api/stores/:storeId/reports/technician-workload", async (request, response) => {
  const parsedQuery = technicianWorkloadReportQuerySchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({ message: "Enter a valid technician workload date range." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const orders = await prisma.serviceOrder.findMany({
    where: {
      storeId: store.id
    },
    orderBy: {
      inDate: "desc"
    },
    select: {
      id: true,
      inDate: true,
      roNumber: true,
      orderType: true,
      customerName: true,
      stockNumber: true,
      model: true,
      serviceWriter: true,
      roStatus: true,
      category: true,
      maker: true,
      note: true,
      tone: true,
      detailSnapshot: true
    }
  });

  response.json({
    storeId: store.id,
    storeName: store.name,
    startDate: parsedQuery.data.startDate,
    endDate: parsedQuery.data.endDate,
    generatedAt: new Date().toISOString(),
    ...buildTechnicianWorkloadReportData(orders, parsedQuery.data.startDate, parsedQuery.data.endDate)
  });
});

app.get("/api/stores/:storeId/tasks", async (request, response) => {
  const parsedQuery = taskFilterSchema.safeParse(request.query);

  if (!parsedQuery.success) {
    response.status(400).json({ message: "Unknown workspace." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const tasks = await prisma.storeTask.findMany({
    where: {
      storeId: store.id,
      workspaceId: parsedQuery.data.workspaceId,
      ...(parsedQuery.data.actorUserId
        ? {
            OR: [
              { actorUserId: parsedQuery.data.actorUserId },
              { assignedUserId: parsedQuery.data.actorUserId },
              { lastUpdatedByUserId: parsedQuery.data.actorUserId },
              { latestCommentByUserId: parsedQuery.data.actorUserId }
            ]
          }
        : {})
    },
    include: {
      comments: {
        orderBy: {
          createdAt: "desc"
        },
        take: 3
      }
    },
  });

  response.json(tasks.sort(compareStoreTasksForAttention).slice(0, parsedQuery.data.limit ?? 8).map(formatStoreTaskEntry));
});

app.post("/api/stores/:storeId/tasks/actions", async (request, response) => {
  const parsedAction = taskActionSchema.safeParse(request.body);

  if (!parsedAction.success) {
    response.status(400).json({ message: "Enter a valid task queue action." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const actor = await resolveActorContext(store.id, parsedAction.data.actorUserId);
  const roPrefix = `${parsedAction.data.roNumber} ·`;
  const qaTaskRows = await prisma.storeTask.findMany({
    where: {
      storeId: store.id,
      workspaceId: "service",
      action: {
        in: [...serviceUtilityTaskActions]
      },
      detail: {
        startsWith: roPrefix,
        contains: serviceUtilityQaMarker
      }
    },
    select: {
      id: true
    }
  });
  const deletedTaskIds = qaTaskRows.map((row) => row.id);

  const [deletedActivities, deletedTasks] = await prisma.$transaction([
    prisma.storeActivity.deleteMany({
      where: {
        storeId: store.id,
        workspaceId: "service",
        detail: {
          startsWith: roPrefix,
          contains: serviceUtilityQaMarker
        }
      }
    }),
    ...(deletedTaskIds.length > 0
      ? [
          prisma.storeTask.deleteMany({
            where: {
              id: {
                in: deletedTaskIds
              }
            }
          })
        ]
      : [prisma.storeTask.deleteMany({ where: { id: { in: [] } } })])
  ]);

  const didDeleteQaRows = deletedActivities.count > 0 || deletedTasks.count > 0;
  const activity = didDeleteQaRows
    ? await recordStoreActivity(
        store.id,
        {
          workspaceId: "service",
          label: "Demo QA cleared",
          detail: `RO ${parsedAction.data.roNumber} cleared ${deletedTasks.count} QA utility task${deletedTasks.count === 1 ? "" : "s"} and ${deletedActivities.count} service activity row${deletedActivities.count === 1 ? "" : "s"}.`,
          tone: "neutral"
        },
        actor
      )
    : null;

  response.json({
    message: didDeleteQaRows
      ? `Removed ${deletedTasks.count} QA utility task${deletedTasks.count === 1 ? "" : "s"} from RO ${parsedAction.data.roNumber}.`
      : `No demo QA utility tasks were found for RO ${parsedAction.data.roNumber}.`,
    deletedTaskCount: deletedTasks.count,
    deletedActivityCount: deletedActivities.count,
    deletedTaskIds,
    activityEntry: activity ? formatStoreActivityEntry(activity) : null
  });
});

app.patch("/api/stores/:storeId/tasks/:taskId", async (request, response) => {
  const parsedUpdate = taskStatusUpdateSchema.safeParse(request.body);

  if (!parsedUpdate.success) {
    response.status(400).json({ message: "Enter a valid task status update." });
    return;
  }

  const task = await prisma.storeTask.findFirst({
    where: {
      id: request.params.taskId,
      storeId: request.params.storeId
    }
  });

  if (!task) {
    response.status(404).json({ message: "Task not found." });
    return;
  }

  const actor = await resolveActorContext(task.storeId, parsedUpdate.data.actorUserId);
  const updatedTask = await prisma.storeTask.update({
    where: {
      id: task.id
    },
    data: {
      status: parsedUpdate.data.status,
      tone: resolveTaskTone(parsedUpdate.data.status),
      completedAt: parsedUpdate.data.status === "Done" ? new Date() : null,
      lastUpdatedByUserId: actor.actorUserId,
      lastUpdatedByName: actor.actorName,
      lastUpdatedByInitial: actor.actorInitial
    }
  });
  const activity = await recordStoreActivity(
    task.storeId,
    {
      workspaceId: task.workspaceId as z.infer<typeof workspaceSchema>,
      label: `${task.action} moved to ${parsedUpdate.data.status}`,
      detail: task.detail,
      tone: resolveTaskTone(parsedUpdate.data.status)
    },
    actor
  );

  response.json({
    message: `${task.action} marked ${parsedUpdate.data.status}.`,
    taskEntry: formatStoreTaskEntry(await loadTaskForOutput(updatedTask.id)),
    activityEntry: formatStoreActivityEntry(activity)
  });
});

app.patch("/api/stores/:storeId/tasks/:taskId/assignee", async (request, response) => {
  const parsedUpdate = taskAssigneeUpdateSchema.safeParse(request.body);

  if (!parsedUpdate.success) {
    response.status(400).json({ message: "Enter a valid task handoff update." });
    return;
  }

  const task = await prisma.storeTask.findFirst({
    where: {
      id: request.params.taskId,
      storeId: request.params.storeId
    }
  });

  if (!task) {
    response.status(404).json({ message: "Task not found." });
    return;
  }

  const actor = await resolveActorContext(task.storeId, parsedUpdate.data.actorUserId);
  const assignee = parsedUpdate.data.assigneeUserId ? await resolveActorContext(task.storeId, parsedUpdate.data.assigneeUserId) : null;
  const updatedTask = await prisma.storeTask.update({
    where: {
      id: task.id
    },
    data: {
      assignedUserId: assignee?.actorUserId ?? null,
      assignedName: assignee?.actorName ?? null,
      assignedInitial: assignee?.actorInitial ?? null,
      lastUpdatedByUserId: actor.actorUserId,
      lastUpdatedByName: actor.actorName,
      lastUpdatedByInitial: actor.actorInitial
    }
  });
  const activity = await recordStoreActivity(
    task.storeId,
    {
      workspaceId: task.workspaceId as z.infer<typeof workspaceSchema>,
      label: assignee ? `${task.action} handed to ${assignee.actorName}` : `${task.action} unassigned`,
      detail: task.detail,
      tone: assignee ? "accent" : "neutral"
    },
    actor
  );

  response.json({
    message: assignee ? `${task.action} handed to ${assignee.actorName}.` : `${task.action} unassigned.`,
    taskEntry: formatStoreTaskEntry(await loadTaskForOutput(updatedTask.id)),
    activityEntry: formatStoreActivityEntry(activity)
  });
});

app.post("/api/stores/:storeId/tasks/:taskId/comments", async (request, response) => {
  const parsedNote = taskNoteSchema.safeParse(request.body);

  if (!parsedNote.success) {
    response.status(400).json({ message: "Enter a valid task note." });
    return;
  }

  const task = await prisma.storeTask.findFirst({
    where: {
      id: request.params.taskId,
      storeId: request.params.storeId
    }
  });

  if (!task) {
    response.status(404).json({ message: "Task not found." });
    return;
  }

  const actor = await resolveActorContext(task.storeId, parsedNote.data.actorUserId);
  const note = await recordStoreTaskComment(
    task.id,
    {
      body: parsedNote.data.body,
      kind: parsedNote.data.kind
    },
    actor
  );
  const updatedTask = await prisma.storeTask.update({
    where: {
      id: task.id
    },
    data: {
      commentCount: {
        increment: 1
      },
      latestCommentPreview: parsedNote.data.body,
      latestCommentAt: note.createdAt,
      latestCommentByUserId: actor.actorUserId,
      latestCommentByName: actor.actorName,
      latestCommentByInitial: actor.actorInitial,
      lastUpdatedByUserId: actor.actorUserId,
      lastUpdatedByName: actor.actorName,
      lastUpdatedByInitial: actor.actorInitial,
      ...(parsedNote.data.kind === "Resolution"
        ? {
            resolutionNote: parsedNote.data.body,
            status: "Done",
            tone: resolveTaskTone("Done"),
            completedAt: new Date()
          }
        : {})
    }
  });
  const activity = await recordStoreActivity(
    task.storeId,
    {
      workspaceId: task.workspaceId as z.infer<typeof workspaceSchema>,
      label: parsedNote.data.kind === "Resolution" ? `${task.action} resolved` : `${task.action} note added`,
      detail: parsedNote.data.body,
      tone: parsedNote.data.kind === "Resolution" ? "stable" : "neutral"
    },
    actor
  );

  response.json({
    message: parsedNote.data.kind === "Resolution" ? `${task.action} resolved.` : "Task note saved.",
    taskEntry: formatStoreTaskEntry(await loadTaskForOutput(updatedTask.id)),
    activityEntry: formatStoreActivityEntry(activity)
  });
});

app.post("/api/stores/:storeId/task-sla-policies", async (request, response) => {
  const parsedPolicy = taskSlaPolicySchema.safeParse(request.body);

  if (!parsedPolicy.success) {
    response.status(400).json({ message: "Enter a valid SLA policy update." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const actor = await resolveActorContext(store.id, parsedPolicy.data.actorUserId);
  const policy = await prisma.storeTaskSlaPolicy.upsert({
    where: {
      storeId_workspaceId_action: {
        storeId: store.id,
        workspaceId: parsedPolicy.data.workspaceId,
        action: parsedPolicy.data.action
      }
    },
    create: {
      storeId: store.id,
      workspaceId: parsedPolicy.data.workspaceId,
      action: parsedPolicy.data.action,
      slaMinutes: parsedPolicy.data.slaMinutes,
      updatedByUserId: actor.actorUserId,
      updatedByName: actor.actorName,
      updatedByInitial: actor.actorInitial
    },
    update: {
      slaMinutes: parsedPolicy.data.slaMinutes,
      updatedByUserId: actor.actorUserId,
      updatedByName: actor.actorName,
      updatedByInitial: actor.actorInitial
    }
  });

  let retimedTaskCount = 0;

  if (parsedPolicy.data.applyToOpenTasks) {
    const openTasks = await prisma.storeTask.findMany({
      where: {
        storeId: store.id,
        workspaceId: parsedPolicy.data.workspaceId,
        action: parsedPolicy.data.action,
        status: {
          not: "Done"
        }
      },
      select: {
        id: true,
        createdAt: true
      }
    });

    retimedTaskCount = openTasks.length;

    if (openTasks.length > 0) {
      await prisma.$transaction(
        openTasks.map((task) =>
          prisma.storeTask.update({
            where: {
              id: task.id
            },
            data: {
              slaMinutes: policy.slaMinutes,
              dueAt: addMinutes(task.createdAt, policy.slaMinutes),
              lastUpdatedByUserId: actor.actorUserId,
              lastUpdatedByName: actor.actorName,
              lastUpdatedByInitial: actor.actorInitial
            }
          })
        )
      );
    }
  }

  const activity = await recordStoreActivity(
    store.id,
    {
      workspaceId: "audit",
      label: "SLA policy updated",
      detail: `${parsedPolicy.data.action} now targets ${formatDurationMinutes(policy.slaMinutes)}.${retimedTaskCount > 0 ? ` ${retimedTaskCount} open task${retimedTaskCount === 1 ? "" : "s"} retimed.` : ""}`,
      tone: "accent"
    },
    actor
  );

  response.json({
    message: `${parsedPolicy.data.action} SLA saved for ${store.name}.`,
    policyEntry: formatStoreTaskSlaPolicyEntry({
      id: policy.id,
      workspaceId: policy.workspaceId,
      action: policy.action,
      slaMinutes: policy.slaMinutes,
      source: "Custom",
      updatedByName: policy.updatedByName,
      updatedAt: policy.updatedAt,
      openTaskCount: retimedTaskCount
    }),
    retimedTaskCount,
    activityEntry: formatStoreActivityEntry(activity)
  });
});

app.post("/api/stores/:storeId/task-sla-policies/actions", async (request, response) => {
  const parsedAction = taskSlaPolicyActionSchema.safeParse(request.body);

  if (!parsedAction.success) {
    response.status(400).json({ message: "Enter a valid SLA policy action." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true,
      name: true,
      dealerGroupId: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const actor = await resolveActorContext(store.id, parsedAction.data.actorUserId);

  if (parsedAction.data.mode === "previewCopyToStore") {
    if (parsedAction.data.targetStoreId === store.id) {
      response.status(400).json({ message: "Choose a different store for policy rollout." });
      return;
    }

    const targetStore = await prisma.store.findUnique({
      where: {
        id: parsedAction.data.targetStoreId
      },
      select: {
        id: true,
        name: true,
        dealerGroupId: true
      }
    });

    if (!targetStore) {
      response.status(404).json({ message: "Target store not found." });
      return;
    }

    if (targetStore.dealerGroupId !== store.dealerGroupId) {
      response.status(403).json({ message: "Choose a target store in the same dealer group." });
      return;
    }

    await resolveActorContext(targetStore.id, parsedAction.data.actorUserId);

    const [sourcePolicies, targetPolicies] = await Promise.all([
      loadStoreTaskSlaPolicyEntries(store.id),
      loadStoreTaskSlaPolicyEntries(targetStore.id)
    ]);
    const comparison = buildStoreTaskSlaPolicyCopyComparison(sourcePolicies, targetPolicies);
    const changedRuleCount = comparison.filter((entry) => entry.changeType !== "unchanged").length;

    response.json({
      message: `${changedRuleCount} of ${comparison.length} SLA rules will change in ${targetStore.name}.`,
      sourceStoreName: store.name,
      targetStoreName: targetStore.name,
      changedRuleCount,
      totalRuleCount: comparison.length,
      comparison
    });
    return;
  }

  if (parsedAction.data.mode === "copyOneToStore") {
    if (parsedAction.data.targetStoreId === store.id) {
      response.status(400).json({ message: "Choose a different store for policy rollout." });
      return;
    }

    const targetStore = await prisma.store.findUnique({
      where: {
        id: parsedAction.data.targetStoreId
      },
      select: {
        id: true,
        name: true,
        dealerGroupId: true
      }
    });

    if (!targetStore) {
      response.status(404).json({ message: "Target store not found." });
      return;
    }

    if (targetStore.dealerGroupId !== store.dealerGroupId) {
      response.status(403).json({ message: "Choose a target store in the same dealer group." });
      return;
    }

    await resolveActorContext(targetStore.id, parsedAction.data.actorUserId);

    const [sourcePolicies, targetPolicies] = await Promise.all([
      loadStoreTaskSlaPolicyEntries(store.id),
      loadStoreTaskSlaPolicyEntries(targetStore.id)
    ]);
    const policyKey = createTaskSlaPolicyKey(parsedAction.data.workspaceId, parsedAction.data.action);
    const sourcePolicy = sourcePolicies.find((policy) => createTaskSlaPolicyKey(policy.workspaceId, policy.action) === policyKey);
    const targetPolicy = targetPolicies.find((policy) => createTaskSlaPolicyKey(policy.workspaceId, policy.action) === policyKey);

    if (!sourcePolicy) {
      response.status(404).json({ message: "Policy entry not found in the source store." });
      return;
    }

    const needsCreate = !targetPolicy || targetPolicy.source === "Default";
    const needsUpdate = !needsCreate && targetPolicy.slaMinutes !== sourcePolicy.slaMinutes;
    const changedRuleCount = needsCreate || needsUpdate ? 1 : 0;

    if (needsCreate) {
      await prisma.storeTaskSlaPolicy.create({
        data: {
          storeId: targetStore.id,
          workspaceId: sourcePolicy.workspaceId,
          action: sourcePolicy.action,
          slaMinutes: sourcePolicy.slaMinutes,
          updatedByUserId: actor.actorUserId,
          updatedByName: actor.actorName,
          updatedByInitial: actor.actorInitial
        }
      });
    }

    if (needsUpdate && targetPolicy?.source === "Custom") {
      await prisma.storeTaskSlaPolicy.update({
        where: {
          id: targetPolicy.id
        },
        data: {
          slaMinutes: sourcePolicy.slaMinutes,
          updatedByUserId: actor.actorUserId,
          updatedByName: actor.actorName,
          updatedByInitial: actor.actorInitial
        }
      });
    }

    const retimedTaskCount = parsedAction.data.applyToOpenTasks && changedRuleCount > 0
      ? await retimeOpenStoreTasks(
          targetStore.id,
          actor,
          new Map([[policyKey, sourcePolicy.slaMinutes]]),
          {
            workspaceId: parsedAction.data.workspaceId,
            action: parsedAction.data.action
          }
        )
      : 0;

    const activity = await recordStoreActivity(
      store.id,
      {
        workspaceId: "audit",
        label: changedRuleCount > 0 ? "SLA policy rolled out" : "SLA policy already aligned",
        detail:
          changedRuleCount > 0
            ? `${sourcePolicy.action} synced to ${targetStore.name}.${retimedTaskCount > 0 ? ` ${retimedTaskCount} open task${retimedTaskCount === 1 ? "" : "s"} retimed.` : ""}`
            : `${targetStore.name} already matches ${store.name} for ${sourcePolicy.action}.`,
        tone: changedRuleCount > 0 ? "accent" : "stable"
      },
      actor
    );

    await recordStoreActivity(
      targetStore.id,
      {
        workspaceId: "audit",
        label: changedRuleCount > 0 ? "SLA policy rollout received" : "SLA policy already aligned",
        detail:
          changedRuleCount > 0
            ? `${sourcePolicy.action} copied in from ${store.name} by ${actor.actorName}.${retimedTaskCount > 0 ? ` ${retimedTaskCount} open task${retimedTaskCount === 1 ? "" : "s"} retimed.` : ""}`
            : `${sourcePolicy.action} already matches ${store.name}.`,
        tone: changedRuleCount > 0 ? "accent" : "stable"
      },
      actor
    );

    response.json({
      message: changedRuleCount > 0 ? `${sourcePolicy.action} copied to ${targetStore.name}.` : `${targetStore.name} already matches ${sourcePolicy.action}.`,
      updatedPolicyCount: changedRuleCount,
      retimedTaskCount,
      activityEntry: formatStoreActivityEntry(activity)
    });
    return;
  }

  if (parsedAction.data.mode === "copyToStore") {
    if (parsedAction.data.targetStoreId === store.id) {
      response.status(400).json({ message: "Choose a different store for policy rollout." });
      return;
    }

    const targetStore = await prisma.store.findUnique({
      where: {
        id: parsedAction.data.targetStoreId
      },
      select: {
        id: true,
        name: true,
        dealerGroupId: true
      }
    });

    if (!targetStore) {
      response.status(404).json({ message: "Target store not found." });
      return;
    }

    if (targetStore.dealerGroupId !== store.dealerGroupId) {
      response.status(403).json({ message: "Choose a target store in the same dealer group." });
      return;
    }

    await resolveActorContext(targetStore.id, parsedAction.data.actorUserId);

    const [sourcePolicies, targetPolicies] = await Promise.all([
      loadStoreTaskSlaPolicyEntries(store.id),
      loadStoreTaskSlaPolicyEntries(targetStore.id)
    ]);
    const comparison = buildStoreTaskSlaPolicyCopyComparison(sourcePolicies, targetPolicies);
    const policiesToCreate = comparison.filter((entry) => entry.changeType === "create");
    const policiesToUpdate = comparison.filter((entry) => entry.changeType === "update");
    const policyIdsToDelete = comparison.flatMap((entry) =>
      entry.changeType === "remove" && entry.targetPolicyId ? [entry.targetPolicyId] : []
    );
    const changedRuleCount = policiesToCreate.length + policiesToUpdate.length + policyIdsToDelete.length;

    if (changedRuleCount > 0) {
      await prisma.$transaction([
        ...(policyIdsToDelete.length > 0
          ? [
              prisma.storeTaskSlaPolicy.deleteMany({
                where: {
                  id: {
                    in: policyIdsToDelete
                  }
                }
              })
            ]
          : []),
        ...policiesToUpdate.map((entry) =>
          prisma.storeTaskSlaPolicy.update({
            where: {
              id: entry.targetPolicyId ?? ""
            },
            data: {
              slaMinutes: entry.nextTargetSlaMinutes ?? 0,
              updatedByUserId: actor.actorUserId,
              updatedByName: actor.actorName,
              updatedByInitial: actor.actorInitial
            }
          })
        ),
        ...(policiesToCreate.length > 0
          ? [
              prisma.storeTaskSlaPolicy.createMany({
                data: policiesToCreate.map((entry) => ({
                  storeId: targetStore.id,
                  workspaceId: entry.workspaceId,
                  action: entry.action,
                  slaMinutes: entry.nextTargetSlaMinutes ?? entry.sourceStoreSlaMinutes ?? resolveDefaultTaskSlaMinutes(entry.workspaceId as z.infer<typeof workspaceSchema>, entry.action),
                  updatedByUserId: actor.actorUserId,
                  updatedByName: actor.actorName,
                  updatedByInitial: actor.actorInitial
                }))
              })
            ]
          : [])
      ]);
    }

    const retimedTaskCount = parsedAction.data.applyToOpenTasks && changedRuleCount > 0
      ? await retimeOpenStoreTasks(
          targetStore.id,
          actor,
          new Map(sourcePolicies.map((policy) => [createTaskSlaPolicyKey(policy.workspaceId, policy.action), policy.slaMinutes]))
        )
      : 0;

    const activity = await recordStoreActivity(
      store.id,
      {
        workspaceId: "audit",
        label: changedRuleCount > 0 ? "SLA policy rollout" : "SLA rollout checked",
        detail:
          changedRuleCount > 0
            ? `${changedRuleCount} policy rule${changedRuleCount === 1 ? "" : "s"} synced to ${targetStore.name}.${retimedTaskCount > 0 ? ` ${retimedTaskCount} open task${retimedTaskCount === 1 ? "" : "s"} retimed.` : ""}`
            : `${targetStore.name} already matches ${store.name}.`,
        tone: changedRuleCount > 0 ? "accent" : "stable"
      },
      actor
    );

    await recordStoreActivity(
      targetStore.id,
      {
        workspaceId: "audit",
        label: changedRuleCount > 0 ? "SLA policy rollout received" : "SLA rollout already aligned",
        detail:
          changedRuleCount > 0
            ? `${store.name} rules copied in by ${actor.actorName}.${retimedTaskCount > 0 ? ` ${retimedTaskCount} open task${retimedTaskCount === 1 ? "" : "s"} retimed.` : ""}`
            : `${store.name} already matches this store's policy stack.`,
        tone: changedRuleCount > 0 ? "accent" : "stable"
      },
      actor
    );

    response.json({
      message: changedRuleCount > 0 ? `${store.name} SLA policies copied to ${targetStore.name}.` : `${targetStore.name} already matches ${store.name}.`,
      updatedPolicyCount: changedRuleCount,
      retimedTaskCount,
      activityEntry: formatStoreActivityEntry(activity)
    });
    return;
  }

  if (parsedAction.data.mode === "resetAll") {
    const deletedPolicies = await prisma.storeTaskSlaPolicy.deleteMany({
      where: {
        storeId: store.id
      }
    });
    const retimedTaskCount = parsedAction.data.applyToOpenTasks
      ? await retimeOpenStoreTasks(store.id, actor)
      : 0;
    const activity = await recordStoreActivity(
      store.id,
      {
        workspaceId: "audit",
        label: "SLA policies reset",
        detail: `${deletedPolicies.count} custom policy rule${deletedPolicies.count === 1 ? "" : "s"} cleared.${retimedTaskCount > 0 ? ` ${retimedTaskCount} open task${retimedTaskCount === 1 ? "" : "s"} retimed.` : ""}`,
        tone: "neutral"
      },
      actor
    );

    response.json({
      message: `${store.name} SLA policies reset to defaults.`,
      updatedPolicyCount: deletedPolicies.count,
      retimedTaskCount,
      activityEntry: formatStoreActivityEntry(activity)
    });
    return;
  }

  const deletedPolicies = await prisma.storeTaskSlaPolicy.deleteMany({
    where: {
      storeId: store.id,
      workspaceId: parsedAction.data.workspaceId,
      action: parsedAction.data.action
    }
  });
  const defaultSlaMinutes = resolveDefaultTaskSlaMinutes(parsedAction.data.workspaceId, parsedAction.data.action);
  const retimedTaskCount = parsedAction.data.applyToOpenTasks
    ? await retimeOpenStoreTasks(
        store.id,
        actor,
        new Map([[createTaskSlaPolicyKey(parsedAction.data.workspaceId, parsedAction.data.action), defaultSlaMinutes]]),
        {
          workspaceId: parsedAction.data.workspaceId,
          action: parsedAction.data.action
        }
      )
    : 0;
  const activity = await recordStoreActivity(
    store.id,
    {
      workspaceId: "audit",
      label: "SLA policy reset",
      detail: `${parsedAction.data.action} returned to the default ${formatDurationMinutes(defaultSlaMinutes)} target.${retimedTaskCount > 0 ? ` ${retimedTaskCount} open task${retimedTaskCount === 1 ? "" : "s"} retimed.` : ""}`,
      tone: deletedPolicies.count > 0 ? "neutral" : "stable"
    },
    actor
  );

  response.json({
    message: `${parsedAction.data.action} SLA reset to the default target.`,
    updatedPolicyCount: deletedPolicies.count,
    retimedTaskCount,
    activityEntry: formatStoreActivityEntry(activity)
  });
});

app.post("/api/stores/:storeId/activity", async (request, response) => {
  const parsedActivity = activityEntrySchema.safeParse(request.body);

  if (!parsedActivity.success) {
    response.status(400).json({ message: "Enter a valid activity entry." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const actor = await resolveActorContext(store.id, parsedActivity.data.actorUserId);
  const activity = await recordStoreActivity(
    store.id,
    {
      workspaceId: parsedActivity.data.workspaceId,
      label: parsedActivity.data.label,
      detail: parsedActivity.data.detail,
      tone: parsedActivity.data.tone
    },
    actor
  );
  response.json(formatStoreActivityEntry(activity));
});

app.post("/api/stores/:storeId/workflow-actions", async (request, response) => {
  const parsed = workflowActionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Enter a valid workflow action." });
    return;
  }

  const store = await prisma.store.findUnique({
    where: {
      id: request.params.storeId
    },
    select: {
      id: true
    }
  });

  if (!store) {
    response.status(404).json({ message: "Store not found." });
    return;
  }

  const actor = await resolveActorContext(store.id, parsed.data.actorUserId);
  const result = await applyWorkflowAction(store.id, parsed.data, actor);
  const activity = await recordStoreActivity(
    store.id,
    {
      workspaceId: parsed.data.workspaceId,
      label: result.activityOverride?.label ?? parsed.data.action,
      detail: result.activityOverride?.detail ?? parsed.data.detail,
      tone: result.activityOverride?.tone ?? parsed.data.tone
    },
    actor
  );

  response.json({
    ...result,
    activityEntry: formatStoreActivityEntry(activity)
  });
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(error);

    if (error instanceof RequestError) {
      response.status(error.statusCode).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Unexpected server error." });
  }
);

app.listen(port, () => {
  console.log(`Marine cloud API listening on http://localhost:${port}`);
});

app.get("/api/stores/:storeId/sandbox-workspace", async (request, response) => {
  try {
    response.json(await getSandboxWorkspacePayload(request.params.storeId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.get("/api/stores/:storeId/sandbox-templates", async (request, response) => {
  try {
    response.json((await getSandboxWorkspacePayload(request.params.storeId)).templates);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.post("/api/stores/:storeId/sandbox-templates", async (request, response) => {
  const parsed = sandboxTemplateMutationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter a template name and select at least one backend module." });
    return;
  }

  try {
    response.status(201).json(await createSandboxTemplateRecord(request.params.storeId, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.put("/api/stores/:storeId/sandbox-templates/:templateId", async (request, response) => {
  const parsed = sandboxTemplateMutationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter a template name and select at least one backend module." });
    return;
  }

  try {
    response.json(await updateSandboxTemplateRecord(request.params.storeId, request.params.templateId, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.delete("/api/stores/:storeId/sandbox-templates/:templateId", async (request, response) => {
  try {
    response.json(await deleteSandboxTemplateRecord(request.params.storeId, request.params.templateId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.get("/api/stores/:storeId/sandboxes", async (request, response) => {
  try {
    response.json((await getSandboxWorkspacePayload(request.params.storeId)).sandboxes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.post("/api/stores/:storeId/sandboxes", async (request, response) => {
  const parsed = sandboxCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter a Sandbox name, type, template, and at least one backend module." });
    return;
  }

  try {
    response.status(201).json(await createSandboxRecord(request.params.storeId, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.put("/api/stores/:storeId/sandboxes/:sandboxId", async (request, response) => {
  const parsed = sandboxUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid Sandbox updates." });
    return;
  }

  try {
    response.json(await updateSandboxRecord(request.params.storeId, request.params.sandboxId, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.get("/api/stores/:storeId/sandboxes/:sandboxId/promotion-preview", async (request, response) => {
  try {
    response.json(await getSandboxPromotionPreview(request.params.storeId, request.params.sandboxId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.post("/api/stores/:storeId/sandboxes/:sandboxId/actions", async (request, response) => {
  const parsed = sandboxActionSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter a valid Sandbox action." });
    return;
  }

  try {
    response.json(await runSandboxAction(request.params.storeId, request.params.sandboxId, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.post("/api/stores/:storeId/sandboxes/:sandboxId/push-to-production", async (request, response) => {
  const parsed = sandboxPushSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Select at least one changed item and review every validation check before pushing to production." });
    return;
  }

  try {
    response.json(await pushSandboxChangesToProduction(request.params.storeId, request.params.sandboxId, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

app.get("/api/stores/:storeId/sandbox-history", async (request, response) => {
  try {
    response.json((await getSandboxWorkspacePayload(request.params.storeId)).history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    response.status(/not found/i.test(message) ? 404 : 400).json({ message });
  }
});

// Vendors CRUD
app.get("/api/stores/:storeId/vendors", async (request, response) => {
  const { storeId } = request.params as { storeId: string };
  const vendors = await prisma.vendor.findMany({ where: { storeId }, orderBy: { name: "asc" } });
  response.json(vendors);
});

app.post("/api/stores/:storeId/vendors", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId } = request.params as { storeId: string };
  const parsed = vendorMutationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid vendor details including a finite lead day value." });
    return;
  }
  const vendor = await prisma.vendor.create({ data: { ...parsed.data, storeId } });
  response.status(201).json(vendor);
});

app.put("/api/stores/:storeId/vendors/:vendorId", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId, vendorId } = request.params as { storeId: string; vendorId: string };
  const parsed = vendorMutationSchema.partial().safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid vendor details including a finite lead day value." });
    return;
  }
  const existing = await prisma.vendor.findFirst({ where: { id: vendorId, storeId } });
  if (!existing) {
    response.status(404).json({ message: "Vendor not found." });
    return;
  }
  const vendor = await prisma.vendor.update({ where: { id: vendorId }, data: parsed.data });
  response.json(vendor);
});

app.delete("/api/stores/:storeId/vendors/:vendorId", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId, vendorId } = request.params as { storeId: string; vendorId: string };
  const deleted = await prisma.vendor.deleteMany({ where: { id: vendorId, storeId } });
  response.json({ ok: deleted.count > 0 });
});

// Pricing Rules CRUD
app.get("/api/stores/:storeId/pricing-rules", async (request, response) => {
  const { storeId } = request.params as { storeId: string };
  const rules = await prisma.pricingRule.findMany({ where: { storeId }, orderBy: { category: "asc" } });
  response.json(rules);
});

app.post("/api/stores/:storeId/pricing-rules", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId } = request.params as { storeId: string };
  const parsed = pricingRuleMutationSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.costMax < parsed.data.costMin) {
    response.status(400).json({ message: "Enter valid finite pricing rule amounts and percentages." });
    return;
  }
  const rule = await prisma.pricingRule.create({ data: { ...parsed.data, storeId } });
  response.status(201).json(rule);
});

app.put("/api/stores/:storeId/pricing-rules/:ruleId", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId, ruleId } = request.params as { storeId: string; ruleId: string };
  const parsed = pricingRuleMutationSchema.partial().safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid finite pricing rule amounts and percentages." });
    return;
  }
  const current = await prisma.pricingRule.findFirst({ where: { id: ruleId, storeId } });
  if (!current) {
    response.status(404).json({ message: "Pricing rule not found." });
    return;
  }
  const nextMin = parsed.data.costMin ?? current.costMin;
  const nextMax = parsed.data.costMax ?? current.costMax;
  if (nextMax < nextMin) {
    response.status(400).json({ message: "Cost max must be greater than or equal to cost min." });
    return;
  }
  const rule = await prisma.pricingRule.update({ where: { id: ruleId }, data: parsed.data });
  response.json(rule);
});

app.delete("/api/stores/:storeId/pricing-rules/:ruleId", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId, ruleId } = request.params as { storeId: string; ruleId: string };
  const deleted = await prisma.pricingRule.deleteMany({ where: { id: ruleId, storeId } });
  response.json({ ok: deleted.count > 0 });
});

// Approval Requests CRUD
app.get("/api/stores/:storeId/approvals", async (request, response) => {
  const { storeId } = request.params as { storeId: string };
  const approvals = await prisma.approvalRequest.findMany({ where: { storeId }, orderBy: { createdAt: "desc" } });
  response.json(approvals);
});

app.post("/api/stores/:storeId/approvals", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId } = request.params as { storeId: string };
  const parsed = approvalCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid approval request details." });
    return;
  }
  const approval = await prisma.approvalRequest.create({ data: { ...parsed.data, storeId, status: "Pending" } });
  response.status(201).json(approval);
});

app.put("/api/stores/:storeId/approvals/:approvalId", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId, approvalId } = request.params as { storeId: string; approvalId: string };
  const parsed = approvalUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid approval review details." });
    return;
  }
  const existing = await prisma.approvalRequest.findFirst({ where: { id: approvalId, storeId } });
  if (!existing) {
    response.status(404).json({ message: "Approval request not found." });
    return;
  }
  const approval = await prisma.approvalRequest.update({ where: { id: approvalId }, data: parsed.data });
  response.json(approval);
});

// Boat Inventory CRUD
app.get("/api/stores/:storeId/boat-inventory", async (request, response) => {
  const { storeId } = request.params as { storeId: string };
  const units = await prisma.boatInventoryUnit.findMany({
    where: { storeId },
    orderBy: [{ status: "asc" }, { stockNumber: "asc" }]
  });
  response.json(units);
});

app.post("/api/stores/:storeId/boat-inventory", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId } = request.params as { storeId: string };
  const parsed = boatInventoryUnitMutationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid boat inventory details and finite cost/price values." });
    return;
  }
  const unit = await prisma.boatInventoryUnit.create({ data: { ...parsed.data, storeId } });
  response.status(201).json(unit);
});

app.put("/api/stores/:storeId/boat-inventory/:unitId", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId, unitId } = request.params as { storeId: string; unitId: string };
  const parsed = boatInventoryUnitUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "Enter valid boat inventory details and finite cost/price values." });
    return;
  }
  const existing = await prisma.boatInventoryUnit.findFirst({ where: { id: unitId, storeId } });
  if (!existing) {
    response.status(404).json({ message: "Boat inventory unit not found." });
    return;
  }
  const unit = await prisma.boatInventoryUnit.update({ where: { id: unitId }, data: parsed.data });
  response.json(unit);
});

app.delete("/api/stores/:storeId/boat-inventory/:unitId", async (request, response) => {
  if (!(await ensureOptionalBearerActor(request, response))) return;
  const { storeId, unitId } = request.params as { storeId: string; unitId: string };
  const deleted = await prisma.boatInventoryUnit.deleteMany({ where: { id: unitId, storeId } });
  response.json({ ok: deleted.count > 0 });
});

app.get("/api/stores/:storeId/search", async (request, response) => {
  const { storeId } = request.params as { storeId: string };
  const query = (request.query as { q?: string }).q?.trim() ?? "";
  if (query.length < 2) {
    response.json({ serviceOrders: [], partsLines: [], salesDeals: [], units: [] });
    return;
  }
  const [serviceOrders, partsLines, salesDeals, units] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: { storeId, OR: [{ roNumber: { contains: query } }, { customerName: { contains: query } }, { model: { contains: query } }] },
      take: 8, orderBy: { inDate: "desc" }
    }),
    prisma.partsOrderLine.findMany({
      where: { storeId, OR: [{ partNumber: { contains: query } }, { description: { contains: query } }] },
      take: 8, orderBy: { updatedAt: "desc" }
    }),
    prisma.salesDeal.findMany({
      where: { storeId, OR: [{ customerName: { contains: query } }, { worksheet: { contains: query } }, { make: { contains: query } }] },
      take: 8, orderBy: { openedAt: "desc" }
    }),
    prisma.boatInventoryUnit.findMany({
      where: { storeId, OR: [{ stockNumber: { contains: query } }, { vinHin: { contains: query } }, { make: { contains: query } }, { model: { contains: query } }] },
      take: 8, orderBy: { createdAt: "desc" }
    }),
  ]);
  response.json({ serviceOrders, partsLines, salesDeals, units });
});

function getBearerUserId(request: express.Request) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

function authLoginRateLimit(request: express.Request, response: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const key = request.ip ?? "local";
  const current = authLoginAttempts.get(key);
  const nextEntry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + authLoginWindowMs }
    : { count: current.count + 1, resetAt: current.resetAt };

  authLoginAttempts.set(key, nextEntry);

  if (nextEntry.count > authLoginMaxAttempts) {
    response.status(429).json({ message: "Too many login attempts. Please wait briefly and try again." });
    return;
  }

  next();
}

async function ensureOptionalBearerActor(request: express.Request, response: express.Response) {
  const userId = getBearerUserId(request);

  if (!userId) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      status: true
    }
  });

  if (!user) {
    response.status(401).json({ message: "Bearer user not found." });
    return false;
  }

  if (user.status !== "Active") {
    response.status(403).json({ message: "Bearer user is not active." });
    return false;
  }

  return true;
}

function parseServiceDetailSnapshot(detailSnapshot: string | null) {
  if (!detailSnapshot) {
    return { jobs: [] };
  }

  try {
    const parsed = JSON.parse(detailSnapshot) as { jobs?: unknown[] };
    return {
      ...parsed,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : []
    };
  } catch {
    throw new RequestError(400, "Service order detail snapshot contains invalid JSON.");
  }
}

function buildSnapshotServiceJobs(snapshot: { jobs: unknown[] }) {
  return snapshot.jobs.map((entry, index) => {
    const job = toRecord(entry);

    return {
      jobNumber: index + 1,
      title: readString(job, "title") || `Job ${index + 1}`,
      status: readString(job, "status") || "Open",
      technician: readString(job, "technician"),
      unitLabel: readString(job, "unitLabel"),
      description: readString(job, "description"),
      recommendations: readString(job, "recommendations"),
      resolution: readString(job, "resolution"),
      parts: readArray(job.parts).map((partEntry) => {
        const part = toRecord(partEntry);
        return {
          partNumber: readString(part, "partNumber") || "UNKNOWN",
          description: readString(part, "description"),
          quantity: Math.max(1, Math.round(readNumber(part, "quantity")) || 1),
          unitPriceCents: toCents(readNumber(part, "price"))
        };
      }),
      laborLines: readArray(job.laborLines).map((lineEntry) => {
        const line = toRecord(lineEntry);
        return {
          technician: readString(line, "technician") || readString(job, "technician") || "Unassigned",
          hours: Math.max(0, Math.round(readNumber(line, "quantity"))),
          rateCents: toCents(readNumber(line, "rate")),
          status: readString(line, "closedDate") ? "Closed" : "Open"
        };
      }),
      subletLines: readArray(job.subletLines).map((lineEntry) => {
        const line = toRecord(lineEntry);
        return {
          vendor: readString(line, "vendor") || "Sublet",
          description: readString(line, "description"),
          amountCents: toCents(readNumber(line, "price")),
          status: readString(line, "date") ? "Closed" : "Open"
        };
      })
    };
  });
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(source: Record<string, unknown>, key: string) {
  const value = source[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toCents(value: number) {
  return Math.max(0, Math.round(value * 100));
}

function formatMinutesAgo(date: Date) {
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60_000));

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);
  return `${elapsedHours} hr ago`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

function parseUsDateInput(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, monthText, dayText, yearText] = match;
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const year = Number.parseInt(yearText, 10);
  const parsedDate = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}

function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function resolveSalesDealDepositArName(method: string) {
  if (method.toLowerCase().includes("check")) {
    return "A/R Checks";
  }

  if (method.toLowerCase().includes("cash")) {
    return "A/R Cash";
  }

  if (method.toLowerCase().includes("credit")) {
    return "A/R Credit Card";
  }

  if (method.toLowerCase().includes("coupon")) {
    return "A/R Internal Credits";
  }

  return "A/R Deposits";
}

async function ensureSalesDealDepositSeed(
  storeId: string,
  deal: {
    id: string;
    worksheet: string;
    customerName: string;
    cashPrice: number;
  }
) {
  const existingCount = await prisma.salesDealDeposit.count({
    where: {
      storeId,
      salesDealId: deal.id
    }
  });

  if (existingCount > 0) {
    return;
  }

  const targetAmount = Math.max(5_000, Math.round(deal.cashPrice * 0.1));
  const seededAmount = Math.min(2_500, targetAmount);
  const seededAmountCents = Math.round(seededAmount * 100);
  const seededDate = formatDate(new Date());

  await prisma.$transaction(async (transactionClient) => {
    const seededDeposit = await transactionClient.salesDealDeposit.create({
      data: {
        invoice: `INV-${createNumericRecordId("6")}`,
        dateLabel: seededDate,
        cashier: "Roger Harrison",
        method: "Credit Card - InStore",
        arName: "A/R Credit Card",
        amountCents: seededAmountCents,
        description: "Initial buyer deposit",
        notes: "Imported from worksheet history",
        reference: `DEP-${createNumericRecordId("6")}`,
        salesDealId: deal.id,
        storeId
      }
    });

    await transactionClient.salesDealDepositActivity.create({
      data: {
        salesDealDepositId: seededDeposit.id,
        title: "Deposit history loaded",
        detail: `${deal.customerName} deposit history linked to worksheet ${deal.worksheet}.`,
        meta: `${seededDate} · Legacy import`
      }
    });
  });
}

async function loadSalesDealDepositsState(
  storeId: string,
  deal: {
    id: string;
    worksheet: string;
    customerName: string;
    cashPrice: number;
  }
) {
  await ensureSalesDealDepositSeed(storeId, deal);

  const [deposits, activities] = await Promise.all([
    prisma.salesDealDeposit.findMany({
      where: {
        storeId,
        salesDealId: deal.id
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.salesDealDepositActivity.findMany({
      where: {
        salesDealDeposit: {
          storeId,
          salesDealId: deal.id
        }
      },
      include: {
        salesDealDeposit: {
          select: {
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  ]);

  return {
    ledger: deposits.map((entry) => ({
      id: entry.id,
      invoice: entry.invoice,
      date: entry.dateLabel,
      cashier: entry.cashier,
      method: entry.method,
      arName: entry.arName,
      amount: entry.amountCents / 100,
      description: entry.description,
      notes: entry.notes,
      reference: entry.reference
    })),
    activity: activities.map((entry) => ({
      id: entry.id,
      title: entry.title,
      detail: entry.detail,
      meta: entry.meta
    }))
  } as SalesDealDepositsState;
}

function buildSalesDealDepositsResponse(
  deal: {
    id: string;
    worksheet: string;
    customerName: string;
    stage: string;
    cashPrice: number;
  },
  state: SalesDealDepositsState
) {
  const capturedAmount = state.ledger.reduce((total, entry) => total + entry.amount, 0);
  const targetAmount = Math.max(5_000, Math.round(deal.cashPrice * 0.1));
  const remainingAmount = Math.max(0, targetAmount - capturedAmount);
  const isPosted = capturedAmount > 0 || deal.stage.toLowerCase() === "deposit";

  return {
    dealId: deal.id,
    dealNumber: deal.worksheet,
    customerName: deal.customerName,
    status: isPosted ? "Posted" : "Pending",
    targetAmount,
    capturedAmount,
    remainingAmount,
    ledger: [...state.ledger],
    activity: [...state.activity]
  };
}

function formatStoreActivityEntry(activity: {
  id: string;
  label: string;
  detail: string;
  tone: string;
  actorUserId: string | null;
  actorName: string;
  actorInitial: string;
  createdAt: Date;
}) {
  return {
    id: activity.id,
    timeLabel: formatClockTime(activity.createdAt),
    label: activity.label,
    detail: activity.detail,
    tone: activity.tone,
    actorUserId: activity.actorUserId,
    actorName: activity.actorName,
    actorInitial: activity.actorInitial
  };
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map((segment) => Number(segment));
  return new Date(year, month - 1, day);
}

function addDays(value: Date, dayCount: number) {
  const nextValue = new Date(value);
  nextValue.setDate(nextValue.getDate() + dayCount);
  return nextValue;
}

function formatStoreTaskEntry(task: {
  id: string;
  workspaceId: string;
  action: string;
  detail: string;
  status: string;
  tone: string;
  slaMinutes: number | null;
  dueAt: Date | null;
  completedAt: Date | null;
  actorUserId: string | null;
  actorName: string;
  actorInitial: string;
  assignedUserId: string | null;
  assignedName: string | null;
  assignedInitial: string | null;
  lastUpdatedByUserId: string | null;
  lastUpdatedByName: string;
  lastUpdatedByInitial: string;
  commentCount: number;
  latestCommentPreview: string | null;
  latestCommentAt: Date | null;
  latestCommentByUserId: string | null;
  latestCommentByName: string | null;
  latestCommentByInitial: string | null;
  resolutionNote: string | null;
  comments: Array<{
    id: string;
    kind: string;
    body: string;
    authorUserId: string | null;
    authorName: string;
    authorInitial: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  const timing = resolveTaskTiming(task);

  return {
    id: task.id,
    timeLabel: formatClockTime(task.updatedAt),
    action: task.action,
    detail: task.detail,
    status: task.status,
    tone: task.status !== "Done" && timing.isOverdue ? "attention" : task.tone,
    actorUserId: task.actorUserId,
    actorName: task.actorName,
    actorInitial: task.actorInitial,
    assignedUserId: task.assignedUserId,
    assignedName: task.assignedName ?? task.actorName,
    assignedInitial: task.assignedInitial ?? task.actorInitial,
    lastUpdatedByUserId: task.lastUpdatedByUserId,
    lastUpdatedByName: task.lastUpdatedByName,
    lastUpdatedByInitial: task.lastUpdatedByInitial,
    ageLabel: timing.ageLabel,
    slaLabel: timing.slaLabel,
    breachLabel: timing.breachLabel,
    isOverdue: timing.isOverdue,
    commentCount: task.commentCount,
    latestCommentPreview: task.latestCommentPreview,
    latestCommentByUserId: task.latestCommentByUserId,
    latestCommentByName: task.latestCommentByName,
    latestCommentByInitial: task.latestCommentByInitial,
    resolutionNote: task.resolutionNote,
    notes: task.comments.map(formatStoreTaskCommentEntry)
  };
}

function formatStoreTaskCommentEntry(comment: {
  id: string;
  kind: string;
  body: string;
  authorUserId: string | null;
  authorName: string;
  authorInitial: string;
  createdAt: Date;
}) {
  return {
    id: comment.id,
    kind: comment.kind,
    body: comment.body,
    authorUserId: comment.authorUserId,
    authorName: comment.authorName,
    authorInitial: comment.authorInitial,
    timeLabel: formatClockTime(comment.createdAt)
  };
}

function formatServiceWorkspaceRow(order: {
  id: string;
  inDate: Date;
  roNumber: string;
  orderType: string;
  customerName: string;
  stockNumber: string;
  model: string;
  serviceWriter: string;
  roStatus: string;
  category: string;
  maker: string;
  note: string;
  tone: string;
}): ServiceOrderWorkspaceRow {
  return {
    id: order.id,
    inDate: formatDate(order.inDate),
    roNumber: order.roNumber,
    orderType: order.orderType === "Estimate" ? "Estimate" : "Repair Order",
    customerName: order.customerName,
    stockNumber: order.stockNumber,
    model: order.model,
    serviceWriter: order.serviceWriter,
    roStatus: order.roStatus,
    category: order.category,
    maker: order.maker,
    note: order.note,
    tone: order.tone
  };
}

function parseTechnicianWorkloadDate(value: string) {
  if (!value) {
    return null;
  }

  if (value.includes("-")) {
    return parseDateInput(value);
  }

  const [month, day, year] = value.split("/").map((segment) => Number(segment));
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function countTechnicianWorkloadBusinessDays(startDate: string, endDate: string) {
  const start = parseTechnicianWorkloadDate(startDate);
  const end = parseTechnicianWorkloadDate(endDate);

  if (!start || !end || start > end) {
    return 0;
  }

  const cursor = new Date(start);
  let dayCount = 0;

  while (cursor <= end) {
    const day = cursor.getDay();

    if (day !== 0 && day !== 6) {
      dayCount += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dayCount;
}

function isTechnicianWorkloadDateInRange(value: string, startDate: string, endDate: string) {
  const candidate = parseTechnicianWorkloadDate(value);
  const start = parseTechnicianWorkloadDate(startDate);
  const end = parseTechnicianWorkloadDate(endDate);

  if (!candidate || !start || !end) {
    return false;
  }

  return candidate >= start && candidate <= end;
}

function parseTechnicianWorkloadHours(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundTechnicianWorkloadHours(value: number) {
  return Math.round(value * 10) / 10;
}

function buildTechnicianWorkloadReportRowId(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "unassigned";
}

function resolveTechnicianWorkloadSessionJob(detail: ServiceOrderDetailPayload, session: ServiceOrderDetailPayload["laborSessions"][number], technicianName: string) {
  if (session.jobId) {
    const matchedJob = detail.jobs.find((job) => job.id === session.jobId);

    return {
      id: matchedJob?.id ?? session.jobId,
      title: matchedJob?.title ?? session.jobTitle?.trim() ?? "Unassigned job"
    };
  }

  if (session.jobTitle?.trim()) {
    const matchedJob = detail.jobs.find((job) => job.title === session.jobTitle);

    return {
      id: matchedJob?.id ?? `session-title:${session.jobTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: matchedJob?.title ?? session.jobTitle.trim()
    };
  }

  const matchingJobs = detail.jobs.filter(
    (job) => job.technician.trim() === technicianName || job.laborLines.some((line) => line.technician.trim() === technicianName)
  );

  if (matchingJobs.length === 1) {
    return {
      id: matchingJobs[0].id,
      title: matchingJobs[0].title
    };
  }

  if (matchingJobs.length > 1) {
    const sessionActualHours = parseTechnicianWorkloadHours(session.actualHours);
    const rankedJobs = [...matchingJobs].sort((left, right) => {
      const leftHours =
        left.laborLines
          .filter((line) => line.technician.trim() === technicianName)
          .reduce((total, line) => total + parseTechnicianWorkloadHours(line.quantity), 0) || left.quantity;
      const rightHours =
        right.laborLines
          .filter((line) => line.technician.trim() === technicianName)
          .reduce((total, line) => total + parseTechnicianWorkloadHours(line.quantity), 0) || right.quantity;

      return Math.abs(leftHours - sessionActualHours) - Math.abs(rightHours - sessionActualHours);
    });

    return {
      id: rankedJobs[0].id,
      title: rankedJobs[0].title
    };
  }

  return null;
}

function buildTechnicianWorkloadReportData(
  orders: Array<{
    id: string;
    inDate: Date;
    roNumber: string;
    orderType: string;
    customerName: string;
    stockNumber: string;
    model: string;
    serviceWriter: string;
    roStatus: string;
    category: string;
    maker: string;
    note: string;
    tone: string;
    detailSnapshot: string | null;
  }>,
  startDate: string,
  endDate: string
) {
  const technicianMap = new Map<string, {
    repairOrderCount: number;
    id: string;
    name: string;
    availableHours: number;
    billedHours: number;
    creditedHours: number;
    active: boolean;
  }>();
  const technicianDetailMap = new Map<string, {
    technicianId: string;
    technicianName: string;
    repairOrderCount: number;
    availableHours: number;
    billedHours: number;
    creditedHours: number;
    jobs: Map<string, {
      id: string;
      roNumber: string;
      customerName: string;
      stockNumber: string;
      model: string;
      serviceWriter: string;
      roStatus: string;
      jobTitle: string;
      availableHours: number;
      billedHours: number;
      creditedHours: number;
      sessionCount: number;
      sessions: Array<{
        id: string;
        startDate: string;
        startTime: string;
        endDate: string;
        endTime: string;
        actualHours: number;
        creditedHours: number;
        override: string;
        status: "Clocked In" | "Clocked Out";
      }>;
    }>;
  }>();

  for (const order of orders) {
    const row = formatServiceWorkspaceRow(order);
    const detail = resolveServiceOrderDetail(order.detailSnapshot, row, [], []);
    const processedTechnicians = new Set<string>();
    const sessionsInRange = detail.laborSessions.filter((session) =>
      isTechnicianWorkloadDateInRange(session.endDate || session.startDate, startDate, endDate)
    );

    if (sessionsInRange.length > 0) {
      for (const session of sessionsInRange) {
        const technicianName = session.technician.trim();

        if (!technicianName) {
          continue;
        }

        const technicianId = buildTechnicianWorkloadReportRowId(technicianName);
        const sessionActualHours = parseTechnicianWorkloadHours(session.actualHours);
        const sessionCreditedHours = parseTechnicianWorkloadHours(session.creditedHours);
        const summaryRow = technicianMap.get(technicianName) ?? {
          id: technicianId,
          name: technicianName,
          availableHours: 0,
          billedHours: 0,
          creditedHours: 0,
          repairOrderCount: 0,
          active: true
        };
        const detailRow = technicianDetailMap.get(technicianId) ?? {
          technicianId,
          technicianName,
          repairOrderCount: 0,
          availableHours: 0,
          billedHours: 0,
          creditedHours: 0,
          jobs: new Map()
        };
        const sessionJob = resolveTechnicianWorkloadSessionJob(detail, session, technicianName);
        const jobKey = `${row.id}:${sessionJob?.id ?? `unassigned:${technicianId}`}`;
        const jobDetail = detailRow.jobs.get(jobKey) ?? {
          id: jobKey,
          roNumber: row.roNumber,
          customerName: row.customerName,
          stockNumber: row.stockNumber,
          model: row.model,
          serviceWriter: row.serviceWriter,
          roStatus: row.roStatus,
          jobTitle: sessionJob?.title ?? "Unassigned Time Clock Session",
          availableHours: 0,
          billedHours: 0,
          creditedHours: 0,
          sessionCount: 0,
          sessions: []
        };

        summaryRow.availableHours = roundTechnicianWorkloadHours(summaryRow.availableHours + sessionActualHours);
        summaryRow.creditedHours = roundTechnicianWorkloadHours(summaryRow.creditedHours + sessionCreditedHours);
        detailRow.availableHours = roundTechnicianWorkloadHours(detailRow.availableHours + sessionActualHours);
        detailRow.creditedHours = roundTechnicianWorkloadHours(detailRow.creditedHours + sessionCreditedHours);
        jobDetail.availableHours = roundTechnicianWorkloadHours(jobDetail.availableHours + sessionActualHours);
        jobDetail.creditedHours = roundTechnicianWorkloadHours(jobDetail.creditedHours + sessionCreditedHours);
        jobDetail.sessionCount += 1;
        jobDetail.sessions.push({
          id: `${jobKey}:${jobDetail.sessionCount}`,
          startDate: session.startDate,
          startTime: session.startTime,
          endDate: session.endDate,
          endTime: session.endTime,
          actualHours: sessionActualHours,
          creditedHours: sessionCreditedHours,
          override: session.override,
          status: session.endDate ? "Clocked Out" : "Clocked In"
        });

        if (!processedTechnicians.has(technicianName)) {
          summaryRow.repairOrderCount += 1;
          detailRow.repairOrderCount += 1;
          processedTechnicians.add(technicianName);
        }

        technicianMap.set(technicianName, summaryRow);
        detailRow.jobs.set(jobKey, jobDetail);
        technicianDetailMap.set(technicianId, detailRow);
      }
    }

    if (sessionsInRange.length === 0 && !isTechnicianWorkloadDateInRange(row.inDate, startDate, endDate)) {
      continue;
    }

    for (const job of detail.jobs) {
      const lineItems =
        job.laborLines.length > 0
          ? job.laborLines
          : job.technician.trim().length > 0
            ? [{ technician: job.technician, quantity: `${job.quantity ?? 0}` }]
            : [];

      for (const laborLine of lineItems) {
        const technicianName = laborLine.technician.trim();

        if (!technicianName) {
          continue;
        }

        const technicianId = buildTechnicianWorkloadReportRowId(technicianName);
        const billedHours = parseTechnicianWorkloadHours(laborLine.quantity);
        const summaryRow = technicianMap.get(technicianName) ?? {
          id: technicianId,
          name: technicianName,
          availableHours: 0,
          billedHours: 0,
          creditedHours: 0,
          repairOrderCount: 0,
          active: true
        };
        const detailRow = technicianDetailMap.get(technicianId) ?? {
          technicianId,
          technicianName,
          repairOrderCount: 0,
          availableHours: 0,
          billedHours: 0,
          creditedHours: 0,
          jobs: new Map()
        };
        const jobKey = `${row.id}:${job.id}`;
        const jobDetail = detailRow.jobs.get(jobKey) ?? {
          id: jobKey,
          roNumber: row.roNumber,
          customerName: row.customerName,
          stockNumber: row.stockNumber,
          model: row.model,
          serviceWriter: row.serviceWriter,
          roStatus: row.roStatus,
          jobTitle: job.title,
          availableHours: 0,
          billedHours: 0,
          creditedHours: 0,
          sessionCount: 0,
          sessions: []
        };

        summaryRow.billedHours = roundTechnicianWorkloadHours(summaryRow.billedHours + billedHours);
        detailRow.billedHours = roundTechnicianWorkloadHours(detailRow.billedHours + billedHours);
        jobDetail.billedHours = roundTechnicianWorkloadHours(jobDetail.billedHours + billedHours);

        if (sessionsInRange.length === 0) {
          const fallbackCreditedHours = Math.max(billedHours - 0.3, 0);
          summaryRow.creditedHours = roundTechnicianWorkloadHours(summaryRow.creditedHours + fallbackCreditedHours);
          detailRow.creditedHours = roundTechnicianWorkloadHours(detailRow.creditedHours + fallbackCreditedHours);
          jobDetail.creditedHours = roundTechnicianWorkloadHours(jobDetail.creditedHours + fallbackCreditedHours);
        }

        if (!processedTechnicians.has(technicianName)) {
          summaryRow.repairOrderCount += 1;
          detailRow.repairOrderCount += 1;
          processedTechnicians.add(technicianName);
        }

        technicianMap.set(technicianName, summaryRow);
        detailRow.jobs.set(jobKey, jobDetail);
        technicianDetailMap.set(technicianId, detailRow);
      }
    }
  }

  return {
    technicians: Array.from(technicianMap.values())
      .map((row) => ({
        ...row,
        active: (row.availableHours > 0 || row.billedHours > 0 || row.creditedHours > 0) && row.repairOrderCount > 0
      }))
      .sort((left, right) => right.billedHours - left.billedHours || left.name.localeCompare(right.name)),
    technicianDetails: Array.from(technicianDetailMap.values())
      .map((detail) => ({
        technicianId: detail.technicianId,
        technicianName: detail.technicianName,
        repairOrderCount: detail.repairOrderCount,
        availableHours: detail.availableHours,
        billedHours: detail.billedHours,
        creditedHours: detail.creditedHours,
        jobCount: detail.jobs.size,
        jobs: Array.from(detail.jobs.values())
          .map((job) => ({
            ...job,
            sessions: [...job.sessions].sort(
              (left, right) => `${left.startDate} ${left.startTime}`.localeCompare(`${right.startDate} ${right.startTime}`)
            )
          }))
          .sort((left, right) => left.roNumber.localeCompare(right.roNumber) || left.jobTitle.localeCompare(right.jobTitle))
      }))
      .sort((left, right) => right.billedHours - left.billedHours || left.technicianName.localeCompare(right.technicianName))
  };
}

function mapServiceOrderMutation(
  mutation: z.infer<typeof serviceOrderDetailActionSchema>
): ServiceOrderDetailMutation {
  switch (mutation.mode) {
    case "createJob":
      return {
        mode: mutation.mode,
        title: mutation.title,
        unitLabel: mutation.unitLabel,
        description: mutation.description,
        technician: mutation.technician,
        jobCode: mutation.jobCode,
        recommendations: mutation.recommendations,
        resolution: mutation.resolution
      };
    case "updateJob":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        title: mutation.title,
        unitLabel: mutation.unitLabel,
        customerApproval: mutation.customerApproval,
        status: mutation.status,
        appliance: mutation.appliance,
        warranty: mutation.warranty,
        description: mutation.description,
        resolution: mutation.resolution,
        recommendations: mutation.recommendations,
        technician: mutation.technician,
        laborRate: mutation.laborRate,
        chargeBy: mutation.chargeBy,
        rate: mutation.rate,
        quantity: mutation.quantity
      };
    case "addPart":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        partNumber: mutation.partNumber,
        description: mutation.description,
        supplier: mutation.supplier,
        available: mutation.available,
        price: mutation.price,
        quantity: mutation.quantity,
        category: mutation.category
      };
    case "removePart":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        partNumber: mutation.partNumber
      };
    case "addLaborSession":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        technician: mutation.technician,
        startDate: mutation.startDate,
        startTime: mutation.startTime,
        endDate: mutation.endDate,
        endTime: mutation.endTime,
        actualHours: mutation.actualHours,
        creditedHours: mutation.creditedHours,
        override: mutation.override
      };
    case "updateWarrantyClaim":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        warrantyClaimNumber: mutation.warrantyClaimNumber,
        internalWarrantyNumber: mutation.internalWarrantyNumber,
        failureDate: mutation.failureDate,
        contentionCode: mutation.contentionCode,
        problemCode: mutation.problemCode,
        problemDescription: mutation.problemDescription,
        claimType: mutation.claimType,
        status: mutation.status,
        deductible: mutation.deductible,
        failedPartNumber: mutation.failedPartNumber,
        actionTaken: mutation.actionTaken,
        reasonForDelay: mutation.reasonForDelay,
        carrierNumber: mutation.carrierNumber,
        invoiceDate: mutation.invoiceDate,
        invoiceNumber: mutation.invoiceNumber,
        dateFiledWithCarrier: mutation.dateFiledWithCarrier
      };
    case "updateOrderType":
      return {
        mode: mutation.mode,
        orderType: mutation.orderType
      };
    case "updateNotes":
      return {
        mode: mutation.mode,
        notes: mutation.notes,
        transferNotes: mutation.transferNotes
      };
    case "updateCustomer":
      return {
        mode: mutation.mode,
        customerName: mutation.customerName,
        addressLine1: mutation.addressLine1,
        location: mutation.location,
        homePhone: mutation.homePhone,
        cellPhone: mutation.cellPhone,
        workPhone: mutation.workPhone,
        email: mutation.email,
        customerNo: mutation.customerNo
      };
    case "updateQueueRow":
      return {
        mode: mutation.mode,
        inDate: mutation.inDate,
        roNumber: mutation.roNumber,
        orderType: mutation.orderType,
        customerName: mutation.customerName,
        stockNumber: mutation.stockNumber,
        model: mutation.model,
        serviceWriter: mutation.serviceWriter,
        roStatus: mutation.roStatus,
        category: mutation.category,
        maker: mutation.maker,
        note: mutation.note
      };
    case "deleteJob":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId
      };
    case "closeLabor":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        lineIndex: mutation.lineIndex,
        actorName: mutation.actorName
      };
    case "reopenLabor":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        lineIndex: mutation.lineIndex
      };
    case "deleteLaborSession":
      return {
        mode: mutation.mode,
        sessionIndex: mutation.sessionIndex
      };
    case "editLaborSession":
      return {
        mode: mutation.mode,
        sessionIndex: mutation.sessionIndex,
        technician: mutation.technician,
        startDate: mutation.startDate,
        startTime: mutation.startTime,
        endDate: mutation.endDate,
        endTime: mutation.endTime,
        actualHours: mutation.actualHours,
        creditedHours: mutation.creditedHours,
        override: mutation.override
      };
    case "updateROHeader":
      return {
        mode: mutation.mode,
        purchaseOrder: mutation.purchaseOrder,
        promisedDate: mutation.promisedDate,
        closedDate: mutation.closedDate
      };
    case "finalizeInvoice":
      return {
        mode: mutation.mode,
        invoiceStatus: mutation.invoiceStatus
      };
    case "updateJobStatus":
      return {
        mode: mutation.mode,
        jobId: mutation.jobId,
        status: mutation.status
      };
    case "requestSignature":
      return {
        mode: mutation.mode,
        docType: mutation.docType,
        recipient: mutation.recipient,
        message: mutation.message
      };
    case "recordPayment":
      return {
        mode: mutation.mode,
        method: mutation.method,
        amount: mutation.amount,
        reference: mutation.reference
      };
  }
}

async function loadServiceOrderDetailContext(storeId: string, serviceOrderId: string) {
  const order = await prisma.serviceOrder.findFirst({
    where: {
      id: serviceOrderId,
      storeId
    }
  });

  if (!order) {
    throw new RequestError(404, "Service order not found.");
  }

  const [tasks, activities, partsCatalogRows] = await Promise.all([
    prisma.storeTask.findMany({
      where: {
        storeId,
        workspaceId: "service",
        detail: {
          contains: order.roNumber
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 20,
      include: {
        comments: {
          orderBy: {
            createdAt: "desc"
          },
          take: 3
        }
      }
    }),
    prisma.storeActivity.findMany({
      where: {
        storeId,
        workspaceId: "service",
        detail: {
          contains: order.roNumber
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    }),
    prisma.partsOrderLine.findMany({
      where: {
        storeId
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 40
    })
  ]);

  const row = formatServiceWorkspaceRow(order);
  const taskEntries = tasks.map((task) => formatStoreTaskEntry(task)) as ServiceOrderTaskEntry[];
  const activityEntries = activities.map((activity) => formatStoreActivityEntry(activity)) as ServiceOrderActivityEntry[];

  return {
    order,
    row,
    detail: resolveServiceOrderDetail(order.detailSnapshot, row, taskEntries, activityEntries),
    taskEntries,
    activityEntries,
    partCatalog: buildServiceOrderPartCatalog(partsCatalogRows)
  };
}

async function buildNextServiceRoNumber(storeId: string) {
  const existingOrders = await prisma.serviceOrder.findMany({
    where: {
      storeId
    },
    select: {
      roNumber: true
    }
  });
  const maxRoNumber = existingOrders.reduce((currentMax, order) => {
    const numericValue = Number.parseInt(order.roNumber.replace(/\D/g, ""), 10);

    return Number.isFinite(numericValue) ? Math.max(currentMax, numericValue) : currentMax;
  }, 100000);

  return String(maxRoNumber + 1);
}

function buildDuplicatedServiceOrderNote(baseNote: string, reason: string) {
  const trimmedBaseNote = baseNote.trim();
  const trimmedReason = reason.trim();

  if (!trimmedBaseNote) {
    return `Follow-up request: ${trimmedReason}`.slice(0, 4000);
  }

  if (!trimmedReason) {
    return trimmedBaseNote.slice(0, 4000);
  }

  return `${trimmedBaseNote}\nFollow-up request: ${trimmedReason}`.slice(0, 4000);
}

async function rewriteServiceRoReferences(storeId: string, previousRoNumber: string, nextRoNumber: string) {
  const [tasks, activities] = await Promise.all([
    prisma.storeTask.findMany({
      where: {
        storeId,
        workspaceId: "service",
        detail: {
          contains: previousRoNumber
        }
      },
      select: {
        id: true,
        detail: true
      }
    }),
    prisma.storeActivity.findMany({
      where: {
        storeId,
        workspaceId: "service",
        detail: {
          contains: previousRoNumber
        }
      },
      select: {
        id: true,
        detail: true
      }
    })
  ]);

  await Promise.all([
    ...tasks.map((task) =>
      prisma.storeTask.update({
        where: {
          id: task.id
        },
        data: {
          detail: task.detail.replaceAll(previousRoNumber, nextRoNumber)
        }
      })
    ),
    ...activities.map((activity) =>
      prisma.storeActivity.update({
        where: {
          id: activity.id
        },
        data: {
          detail: activity.detail.replaceAll(previousRoNumber, nextRoNumber)
        }
      })
    )
  ]);
}

async function recordStoreActivity(
  storeId: string,
  activity: {
    workspaceId: z.infer<typeof workspaceSchema>;
    label: string;
    detail: string;
    tone: z.infer<typeof activityToneSchema>;
  },
  actor: {
    actorUserId: string;
    actorName: string;
    actorInitial: string;
  }
) {
  return prisma.storeActivity.create({
    data: {
      storeId,
      workspaceId: activity.workspaceId,
      label: activity.label,
      detail: activity.detail,
      tone: activity.tone,
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
      actorInitial: actor.actorInitial
    }
  });
}

async function recordStoreTask(
  storeId: string,
  task: {
    workspaceId: z.infer<typeof workspaceSchema>;
    action: string;
    detail: string;
    values: Record<string, string>;
  },
  actor: {
    actorUserId: string;
    actorName: string;
    actorInitial: string;
  }
) {
  const createdAt = new Date();
  const existingPolicy = await prisma.storeTaskSlaPolicy.findUnique({
    where: {
      storeId_workspaceId_action: {
        storeId,
        workspaceId: task.workspaceId,
        action: task.action
      }
    },
    select: {
      slaMinutes: true
    }
  });
  const slaMinutes = existingPolicy?.slaMinutes ?? resolveDefaultTaskSlaMinutes(task.workspaceId, task.action);

  return prisma.storeTask.create({
    data: {
      createdAt,
      storeId,
      workspaceId: task.workspaceId,
      action: task.action,
      detail: task.detail,
      tone: resolveTaskTone("Queued"),
      slaMinutes,
      dueAt: addMinutes(createdAt, slaMinutes),
      actorUserId: actor.actorUserId,
      actorName: actor.actorName,
      actorInitial: actor.actorInitial,
      assignedUserId: actor.actorUserId,
      assignedName: actor.actorName,
      assignedInitial: actor.actorInitial,
      lastUpdatedByUserId: actor.actorUserId,
      lastUpdatedByName: actor.actorName,
      lastUpdatedByInitial: actor.actorInitial,
      payloadSnapshot: JSON.stringify(task.values)
    }
  });
}

async function recordStoreTaskComment(
  taskId: string,
  note: {
    kind: z.infer<typeof taskNoteKindSchema>;
    body: string;
  },
  actor: {
    actorUserId: string;
    actorName: string;
    actorInitial: string;
  }
) {
  return prisma.storeTaskComment.create({
    data: {
      taskId,
      kind: note.kind,
      body: note.body,
      authorUserId: actor.actorUserId,
      authorName: actor.actorName,
      authorInitial: actor.actorInitial
    }
  });
}

async function loadTaskForOutput(taskId: string) {
  const task = await prisma.storeTask.findUnique({
    where: {
      id: taskId
    },
    include: {
      comments: {
        orderBy: {
          createdAt: "desc"
        },
        take: 3
      }
    }
  });

  if (!task) {
    throw new RequestError(404, "Task not found.");
  }

  return task;
}

async function applyWorkflowAction(
  storeId: string,
  input: z.infer<typeof workflowActionSchema>,
  actor: {
    actorUserId: string;
    actorName: string;
    actorInitial: string;
  }
) {
  if (input.workspaceId === "sales") {
    const selectedDeal = input.selectedRowId
      ? await prisma.salesDeal.findFirst({
          where: {
            id: input.selectedRowId,
            storeId
          }
        })
      : null;

    if (["New Lead", "New Quote"].includes(input.action)) {
      const unitParts = splitUnitLabel(input.values.unit || `${selectedDeal?.make ?? "PENDING"} ${selectedDeal?.model ?? "UNIT"}`);
      const worksheet = await resolveUniqueWorksheet(storeId, input.values.worksheet);
      const createdDeal = await prisma.salesDeal.create({
        data: {
          openedAt: new Date(),
          worksheet,
          stockNumber: normalizeWorkflowText(selectedDeal?.stockNumber, "PENDING"),
          make: unitParts.make,
          model: unitParts.model,
          cashPrice: selectedDeal?.cashPrice ?? parseCurrencyToWholeDollars(input.values.targetPrice),
          stage: input.action === "New Lead" ? "Lead" : "Quote",
          customerName: normalizeWorkflowText(input.values.customerName, "Prospect"),
          modelYear: selectedDeal?.modelYear ?? new Date().getFullYear(),
          vin: normalizeWorkflowText(selectedDeal?.vin, "PENDING-HIN"),
          tone: input.action === "New Lead" ? "violet" : "lime",
          storeId
        }
      });

      return {
        workspaceId: input.workspaceId,
        focusRowId: createdDeal.id,
        message: `${input.action} saved.`
      };
    }

    if (input.action === "New Deal") {
      if (selectedDeal) {
        const unitParts = splitUnitLabel(input.values.unit || `${selectedDeal.make} ${selectedDeal.model}`);
        const updatedDeal = await prisma.salesDeal.update({
          where: {
            id: selectedDeal.id
          },
          data: {
            worksheet: await resolveUniqueWorksheet(storeId, input.values.worksheet, selectedDeal.id),
            make: unitParts.make,
            model: unitParts.model,
            stage: "Open",
            customerName: normalizeWorkflowText(input.values.customerName, selectedDeal.customerName),
            tone: "teal"
          }
        });

        return {
          workspaceId: input.workspaceId,
          focusRowId: updatedDeal.id,
          message: "Deal saved."
        };
      }

      const unitParts = splitUnitLabel(input.values.unit || "PENDING UNIT");
      const createdDeal = await prisma.salesDeal.create({
        data: {
          openedAt: new Date(),
          worksheet: await resolveUniqueWorksheet(storeId, input.values.worksheet),
          stockNumber: "PENDING",
          make: unitParts.make,
          model: unitParts.model,
          cashPrice: 0,
          stage: "Open",
          customerName: normalizeWorkflowText(input.values.customerName, "Prospect"),
          modelYear: new Date().getFullYear(),
          vin: "PENDING-HIN",
          tone: "teal",
          storeId
        }
      });

      return {
        workspaceId: input.workspaceId,
        focusRowId: createdDeal.id,
        message: "Deal saved."
      };
    }

    if (input.action === "Take Deposit") {
      if (!selectedDeal) {
        throw new RequestError(400, "Select a sales row before posting a deposit.");
      }

      const updatedDeal = await prisma.salesDeal.update({
        where: {
          id: selectedDeal.id
        },
        data: {
          stage: "Deposit",
          tone: "gold"
        }
      });

      return {
        workspaceId: input.workspaceId,
        focusRowId: updatedDeal.id,
        message: "Deposit posted."
      };
    }
  }

  if (input.workspaceId === "service") {
    const selectedOrder = input.selectedRowId
      ? await prisma.serviceOrder.findFirst({
          where: {
            id: input.selectedRowId,
            storeId
          }
        })
      : null;

    if (input.action === "Print") {
      if (!selectedOrder) {
        throw new RequestError(400, "Select a service row before queueing a print packet.");
      }

      const task = await recordStoreTask(
        storeId,
        {
          workspaceId: input.workspaceId,
          action: input.action,
          detail: `${selectedOrder.roNumber} · ${normalizeWorkflowText(input.values.documentType, "RO Jacket")} · ${normalizeWorkflowText(input.values.destination, "Front Desk")}`,
          values: {
            roNumber: selectedOrder.roNumber,
            customerName: selectedOrder.customerName,
            stockNumber: selectedOrder.stockNumber,
            ...input.values
          }
        },
        actor
      );

      return {
        workspaceId: input.workspaceId,
        focusRowId: selectedOrder.id,
        message: "Print queued in task list.",
        taskEntry: formatStoreTaskEntry(await loadTaskForOutput(task.id))
      };
    }

    if (input.action === "Duplicate") {
      if (!selectedOrder) {
        throw new RequestError(400, "Select a service row before duplicating an RO shell.");
      }

      const sourceRo = normalizeWorkflowText(input.values.sourceRo, selectedOrder.roNumber);
      const reason = normalizeWorkflowText(input.values.reason, "Follow-up repair");
      const task = await recordStoreTask(
        storeId,
        {
          workspaceId: input.workspaceId,
          action: input.action,
          detail: `${selectedOrder.roNumber} · Source ${sourceRo} · ${reason}`,
          values: {
            ...input.values,
            sourceRo,
            roNumber: selectedOrder.roNumber,
            customerName: selectedOrder.customerName,
            stockNumber: selectedOrder.stockNumber,
            serviceWriter: selectedOrder.serviceWriter
          }
        },
        actor
      );

      return {
        workspaceId: input.workspaceId,
        focusRowId: selectedOrder.id,
        message: "Duplicate queued in task list.",
        taskEntry: formatStoreTaskEntry(await loadTaskForOutput(task.id))
      };
    }

    if (input.action === "Report") {
      if (!selectedOrder) {
        throw new RequestError(400, "Select a service row before queueing a service report.");
      }

      const reportName = normalizeWorkflowText(input.values.reportName, "Open ROs");
      const reportWindow = normalizeWorkflowText(input.values.window, "Today");
      const task = await recordStoreTask(
        storeId,
        {
          workspaceId: input.workspaceId,
          action: input.action,
          detail: `${selectedOrder.roNumber} · ${reportName} · ${reportWindow}`,
          values: {
            ...input.values,
            reportName,
            window: reportWindow,
            roNumber: selectedOrder.roNumber,
            customerName: selectedOrder.customerName,
            stockNumber: selectedOrder.stockNumber,
            serviceWriter: selectedOrder.serviceWriter
          }
        },
        actor
      );

      return {
        workspaceId: input.workspaceId,
        focusRowId: selectedOrder.id,
        message: "Report queued in task list.",
        taskEntry: formatStoreTaskEntry(await loadTaskForOutput(task.id))
      };
    }

    if (input.action === "Detail") {
      if (!selectedOrder) {
        throw new RequestError(400, "Select a service row before staging an RO detail packet.");
      }

      const roNumber = normalizeWorkflowText(input.values.roNumber, selectedOrder.roNumber);
      const owner = normalizeWorkflowText(input.values.owner, selectedOrder.serviceWriter);
      const note = normalizeWorkflowText(input.values.note, selectedOrder.note);
      const task = await recordStoreTask(
        storeId,
        {
          workspaceId: input.workspaceId,
          action: input.action,
          detail: `${roNumber} · ${owner} · ${note}`,
          values: {
            ...input.values,
            roNumber,
            owner,
            note,
            customerName: selectedOrder.customerName,
            stockNumber: selectedOrder.stockNumber,
            serviceWriter: selectedOrder.serviceWriter
          }
        },
        actor
      );

      return {
        workspaceId: input.workspaceId,
        focusRowId: selectedOrder.id,
        message: "Detail packet queued in task list.",
        taskEntry: formatStoreTaskEntry(await loadTaskForOutput(task.id))
      };
    }

    if (["New Estimate", "New Repair Order"].includes(input.action)) {
      const inDate = new Date();
      const roNumber = createNumericRecordId("35");
      const orderType = input.action === "New Estimate" ? "Estimate" : "Repair Order";
      const customerName = normalizeWorkflowText(input.values.customerName, "Walk-in Customer");
      const stockNumber = normalizeWorkflowText(input.values.stockNumber, selectedOrder?.stockNumber ?? "PENDING");
      const model = normalizeWorkflowText(input.values.unit, selectedOrder?.model ?? "Pending Model");
      const serviceWriter = normalizeWorkflowText(selectedOrder?.serviceWriter, "Service Desk");
      const roStatus = input.action === "New Estimate" ? "Estimate" : "Not Started";
      const category = input.action === "New Estimate" ? "Estimate" : "Fresh Intake";
      const maker = normalizeWorkflowText(selectedOrder?.maker, "Pending");
      const note = normalizeWorkflowText(input.values.concern, "New service intake staged.");
      const tone = input.action === "New Estimate" ? "teal" : "salmon";
      const createdOrder = await prisma.serviceOrder.create({
        data: {
          inDate,
          roNumber,
          orderType,
          customerName,
          stockNumber,
          model,
          serviceWriter,
          roStatus,
          category,
          maker,
          note,
          detailSnapshot: serializeServiceOrderDetail(
            resolveServiceOrderDetail(
              null,
              {
                id: `pending-${roNumber}`,
                inDate: formatDate(inDate),
                roNumber,
                orderType,
                customerName,
                stockNumber,
                model,
                serviceWriter,
                roStatus,
                category,
                maker,
                note,
                tone
              },
              [],
              []
            )
          ),
          tone,
          storeId
        }
      });

      return {
        workspaceId: input.workspaceId,
        focusRowId: createdOrder.id,
        message: `${input.action} saved.`
      };
    }
  }

  if (input.workspaceId === "parts") {
    const selectedPart = input.selectedRowId
      ? await prisma.partsOrderLine.findFirst({
          where: {
            id: input.selectedRowId,
            storeId
          }
        })
      : null;

    if (input.action === "Purchase Order") {
      const partNumber = normalizeWorkflowText(input.values.partNumber, selectedPart?.partNumber ?? "PENDING-PART");
      const createdLine = await prisma.partsOrderLine.create({
        data: {
          partNumber,
          secondaryNumber: normalizeWorkflowText(selectedPart?.secondaryNumber, partNumber),
          description: normalizeWorkflowText(selectedPart?.description, "Staged purchase order line"),
          supplier: normalizeWorkflowText(input.values.supplier, selectedPart?.supplier ?? "MM"),
          category: normalizeWorkflowText(selectedPart?.category, "PO"),
          orderType: "PO",
          quantity: parseIntegerValue(input.values.quantity, 1),
          orderCost: selectedPart?.orderCost ?? 0,
          source: `PURCHASEORDER-${Date.now()}`,
          tone: "teal",
          storeId
        }
      });

      return {
        workspaceId: input.workspaceId,
        focusRowId: createdLine.id,
        message: "Purchase order saved."
      };
    }

    if (input.action === "Delete Selected") {
      if (!selectedPart) {
        throw new RequestError(400, "Select a parts row before removing it.");
      }

      await prisma.partsOrderLine.delete({
        where: {
          id: selectedPart.id
        }
      });

      return {
        workspaceId: input.workspaceId,
        focusRowId: null,
        message: "Parts line removed."
      };
    }
  }

  if (input.workspaceId === "website" && input.action === "Publish Feed") {
    const feeds = await prisma.websiteFeed.findMany({
      where: {
        storeId
      },
      orderBy: {
        brand: "asc"
      }
    });

    if (feeds.length === 0) {
      throw new RequestError(400, "No website feeds are available for this store.");
    }

    const normalizedBrand = input.values.brand?.trim().toLowerCase();
    const matchingFeeds = normalizedBrand
      ? feeds.filter((feed) => {
          const brand = feed.brand.toLowerCase();
          const domain = feed.domain.toLowerCase();

          return brand.includes(normalizedBrand) || domain.includes(normalizedBrand);
        })
      : [];
    const targetFeeds = matchingFeeds.length > 0 ? matchingFeeds : feeds;

    await prisma.websiteFeed.updateMany({
      where: {
        id: {
          in: targetFeeds.map((feed) => feed.id)
        }
      },
      data: {
        status: "Publishing",
        lastSyncAt: new Date()
      }
    });

    const publishPlan = resolveWorkflowActionPlan({
      workspaceId: "website",
      action: input.action,
      values: input.values
    });

    return {
      workspaceId: input.workspaceId,
      focusRowId: targetFeeds[0]?.id ?? null,
      message: publishPlan?.message ?? "Website feed publish queued.",
      activityOverride: publishPlan
        ? {
            label: publishPlan.activityLabel,
            detail: publishPlan.activityDetail,
            tone: publishPlan.activityTone
          }
        : undefined
    };
  }

  if (
    input.workspaceId === "desktop" ||
    input.workspaceId === "service" ||
    input.workspaceId === "parts" ||
    input.workspaceId === "sales" ||
    input.workspaceId === "analytics" ||
    input.workspaceId === "website" ||
    input.workspaceId === "audit"
  ) {
    const plannedAction = resolveWorkflowActionPlan({
      workspaceId: input.workspaceId,
      action: input.action,
      values: input.values
    });

    if (plannedAction) {
      const task = await recordStoreTask(
        storeId,
        {
          workspaceId: input.workspaceId,
          action: input.action,
          detail: plannedAction.detail,
          values: input.values
        },
        actor
      );

      return {
        workspaceId: input.workspaceId,
        focusRowId: input.selectedRowId ?? null,
        message: plannedAction.message,
        taskEntry: formatStoreTaskEntry(await loadTaskForOutput(task.id)),
        activityOverride: {
          label: plannedAction.activityLabel,
          detail: plannedAction.activityDetail,
          tone: plannedAction.activityTone
        }
      };
    }
  }

  const task = await recordStoreTask(storeId, {
    workspaceId: input.workspaceId,
    action: input.action,
    detail: input.detail,
    values: input.values
  }, actor);

  return {
    workspaceId: input.workspaceId,
    focusRowId: input.selectedRowId ?? null,
    message: `${input.action} queued in task list.`,
    taskEntry: formatStoreTaskEntry(await loadTaskForOutput(task.id))
  };
}

async function resolveActorContext(storeId: string, actorUserId: string) {
  const actor = await prisma.user.findFirst({
    where: {
      id: actorUserId,
      userStores: {
        some: {
          storeId
        }
      }
    },
    select: {
      id: true,
      name: true,
      avatarInitial: true
    }
  });

  if (!actor) {
    throw new RequestError(403, "Operator is not assigned to this store.");
  }

  return {
    actorUserId: actor.id,
    actorName: actor.name,
    actorInitial: actor.avatarInitial
  };
}

function resolveTaskTone(status: z.infer<typeof taskStatusSchema>): z.infer<typeof activityToneSchema> {
  if (status === "In Progress") {
    return "accent";
  }

  if (status === "Blocked") {
    return "attention";
  }

  if (status === "Done") {
    return "stable";
  }

  return "neutral";
}

function resolveDefaultTaskSlaMinutes(workspaceId: z.infer<typeof workspaceSchema>, action: string) {
  const exactPolicy = defaultTaskSlaPolicyCatalog.find(
    (policy) => policy.workspaceId === workspaceId && policy.action === action
  );

  if (exactPolicy) {
    return exactPolicy.slaMinutes;
  }

  if (workspaceId === "sales") {
    return 120;
  }

  if (workspaceId === "service") {
    return 180;
  }

  if (workspaceId === "parts") {
    return 240;
  }

  if (workspaceId === "website") {
    return 60;
  }

  return 90;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatDurationMinutes(minutes: number) {
  const safeMinutes = Math.max(1, Math.round(minutes));

  if (safeMinutes < 60) {
    return `${safeMinutes} min`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours < 24) {
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

function resolveTaskTiming(task: {
  workspaceId: string;
  action: string;
  createdAt: Date;
  dueAt: Date | null;
  slaMinutes: number | null;
  completedAt: Date | null;
}) {
  const effectiveSlaMinutes = task.slaMinutes ?? resolveDefaultTaskSlaMinutes(task.workspaceId as z.infer<typeof workspaceSchema>, task.action);
  const effectiveDueAt = task.dueAt ?? addMinutes(task.createdAt, effectiveSlaMinutes);
  const closingTime = task.completedAt ?? new Date();
  const ageMinutes = Math.max(1, Math.round((closingTime.getTime() - task.createdAt.getTime()) / 60_000));

  if (task.completedAt) {
    const lateMinutes = Math.max(0, Math.round((task.completedAt.getTime() - effectiveDueAt.getTime()) / 60_000));

    return {
      ageLabel: formatDurationMinutes(ageMinutes),
      ageMinutes,
      breachLabel: lateMinutes > 0 ? `Closed ${formatDurationMinutes(lateMinutes)} late` : "Closed within SLA",
      isOverdue: lateMinutes > 0,
      overdueMinutes: lateMinutes,
      slaLabel: formatDurationMinutes(effectiveSlaMinutes)
    };
  }

  const remainingMinutes = Math.round((effectiveDueAt.getTime() - Date.now()) / 60_000);
  const overdueMinutes = Math.max(0, -remainingMinutes);

  return {
    ageLabel: formatDurationMinutes(ageMinutes),
    ageMinutes,
    breachLabel:
      overdueMinutes > 0
        ? `${formatDurationMinutes(overdueMinutes)} overdue`
        : `${formatDurationMinutes(Math.max(1, remainingMinutes))} remaining`,
    isOverdue: overdueMinutes > 0,
    overdueMinutes,
    slaLabel: formatDurationMinutes(effectiveSlaMinutes)
  };
}

function resolveTaskAttentionRank(task: {
  status: string;
  workspaceId: string;
  action: string;
  createdAt: Date;
  dueAt: Date | null;
  slaMinutes: number | null;
  completedAt: Date | null;
}) {
  const timing = resolveTaskTiming(task);

  if (task.status === "Blocked" && timing.isOverdue) {
    return 5;
  }

  if (task.status === "In Progress" && timing.isOverdue) {
    return 4;
  }

  if (task.status === "Queued" && timing.isOverdue) {
    return 3;
  }

  if (task.status === "Blocked") {
    return 2;
  }

  if (task.status === "In Progress") {
    return 1;
  }

  return 0;
}

function compareStoreTasksForAttention(
  left: {
    status: string;
    workspaceId: string;
    action: string;
    createdAt: Date;
    dueAt: Date | null;
    slaMinutes: number | null;
    completedAt: Date | null;
    updatedAt: Date;
  },
  right: {
    status: string;
    workspaceId: string;
    action: string;
    createdAt: Date;
    dueAt: Date | null;
    slaMinutes: number | null;
    completedAt: Date | null;
    updatedAt: Date;
  }
) {
  const leftTiming = resolveTaskTiming(left);
  const rightTiming = resolveTaskTiming(right);
  const attentionDelta = resolveTaskAttentionRank(right) - resolveTaskAttentionRank(left);

  if (attentionDelta !== 0) {
    return attentionDelta;
  }

  if (rightTiming.overdueMinutes !== leftTiming.overdueMinutes) {
    return rightTiming.overdueMinutes - leftTiming.overdueMinutes;
  }

  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

function formatAuditActivityRow(
  activity: {
    id: string;
    storeId: string;
    workspaceId: string;
    label: string;
    detail: string;
    tone: string;
    actorName: string;
    createdAt: Date;
  },
  relatedStore: {
    id: string;
    code: string;
    name: string;
  } | undefined
) {
  return {
    id: `activity-${activity.id}`,
    kind: "Activity" as const,
    taskId: null,
    storeName: relatedStore?.name ?? "Unknown Store",
    storeCode: relatedStore?.code ?? "-",
    workspaceId: activity.workspaceId,
    workspaceLabel: resolveWorkspaceTitle(activity.workspaceId),
    status: "Logged",
    summary: activity.label,
    detail: activity.detail,
    tone: activity.tone,
    operatorName: activity.actorName,
    assigneeName: "-",
    ageLabel: "-",
    slaLabel: "-",
    breachLabel: "-",
    commentCount: 0,
    latestCommentPreview: null,
    resolutionNote: null,
    timeLabel: `${formatDate(activity.createdAt)} ${formatClockTime(activity.createdAt)}`,
    taskDetail: null,
    sortBucket: 0,
    sortScore: 0,
    sortTime: activity.createdAt.getTime()
  };
}

function formatAuditTaskRow(
  task: {
    id: string;
    storeId: string;
    workspaceId: string;
    action: string;
    detail: string;
    status: string;
    tone: string;
    createdAt: Date;
    updatedAt: Date;
    dueAt: Date | null;
    slaMinutes: number | null;
    completedAt: Date | null;
    commentCount: number;
    latestCommentPreview: string | null;
    latestCommentByName: string | null;
    latestCommentByInitial: string | null;
    resolutionNote: string | null;
    payloadSnapshot: string;
    actorInitial: string;
    lastUpdatedByName: string;
    lastUpdatedByInitial: string;
    assignedName: string | null;
    assignedInitial: string | null;
    actorName: string;
    comments: Array<{
      id: string;
      kind: string;
      body: string;
      authorUserId: string | null;
      authorName: string;
      authorInitial: string;
      createdAt: Date;
    }>;
  },
  relatedStore: {
    id: string;
    code: string;
    name: string;
  } | undefined
) {
  const timing = resolveTaskTiming(task);
  const attentionRank = resolveTaskAttentionRank(task);

  return {
    id: `task-${task.id}`,
    kind: "Task" as const,
    taskId: task.id,
    storeName: relatedStore?.name ?? "Unknown Store",
    storeCode: relatedStore?.code ?? "-",
    workspaceId: task.workspaceId,
    workspaceLabel: resolveWorkspaceTitle(task.workspaceId),
    status: task.status,
    summary: task.action,
    detail: task.detail,
    tone: attentionRank >= 3 ? "attention" : task.tone,
    operatorName: task.lastUpdatedByName,
    assigneeName: task.assignedName ?? task.actorName,
    ageLabel: timing.ageLabel,
    slaLabel: timing.slaLabel,
    breachLabel: timing.breachLabel,
    commentCount: task.commentCount,
    latestCommentPreview: task.latestCommentPreview,
    resolutionNote: task.resolutionNote,
    timeLabel: `${formatDate(task.updatedAt)} ${formatClockTime(task.updatedAt)}`,
    taskDetail: {
      actorName: task.actorName,
      actorInitial: task.actorInitial,
      assignedName: task.assignedName ?? task.actorName,
      assignedInitial: task.assignedInitial ?? task.actorInitial,
      completedAtLabel: task.completedAt ? `${formatDate(task.completedAt)} ${formatClockTime(task.completedAt)}` : null,
      createdAtLabel: `${formatDate(task.createdAt)} ${formatClockTime(task.createdAt)}`,
      dueAtLabel: task.dueAt ? `${formatDate(task.dueAt)} ${formatClockTime(task.dueAt)}` : null,
      lastUpdatedByInitial: task.lastUpdatedByInitial,
      lastUpdatedByName: task.lastUpdatedByName,
      latestCommentByInitial: task.latestCommentByInitial,
      latestCommentByName: task.latestCommentByName,
      notes: task.comments.map(formatStoreTaskCommentEntry),
      snapshotFields: formatTaskSnapshotFields(task.payloadSnapshot),
      updatedAtLabel: `${formatDate(task.updatedAt)} ${formatClockTime(task.updatedAt)}`
    },
    sortBucket: attentionRank > 0 ? 2 : 1,
    sortScore: attentionRank * 10_000 + timing.overdueMinutes,
    sortTime: task.updatedAt.getTime()
  };
}

function buildStoreTaskSlaPolicyEntries(
  policyOverrides: Array<{
    id: string;
    workspaceId: string;
    action: string;
    slaMinutes: number;
    updatedByName: string;
    updatedAt: Date;
  }>,
  openTaskCounts: Array<{
    workspaceId: string;
    action: string;
    _count: {
      _all: number;
    };
  }>,
  currentStoreTasks: Array<{
    workspaceId: string;
    action: string;
  }>
) {
  const policyKeys = new Map<string, { workspaceId: string; action: string }>();
  const policyOverridesByKey = new Map(
    policyOverrides.map((policy) => [createTaskSlaPolicyKey(policy.workspaceId, policy.action), policy])
  );
  const openTaskCountsByKey = new Map(
    openTaskCounts.map((entry) => [createTaskSlaPolicyKey(entry.workspaceId, entry.action), entry._count._all])
  );

  defaultTaskSlaPolicyCatalog.forEach((policy) => {
    policyKeys.set(createTaskSlaPolicyKey(policy.workspaceId, policy.action), {
      workspaceId: policy.workspaceId,
      action: policy.action
    });
  });

  currentStoreTasks.forEach((task) => {
    policyKeys.set(createTaskSlaPolicyKey(task.workspaceId, task.action), {
      workspaceId: task.workspaceId,
      action: task.action
    });
  });

  policyOverrides.forEach((policy) => {
    policyKeys.set(createTaskSlaPolicyKey(policy.workspaceId, policy.action), {
      workspaceId: policy.workspaceId,
      action: policy.action
    });
  });

  return [...policyKeys.values()]
    .sort((left, right) => {
      const workspaceDelta = resolveWorkspaceTitle(left.workspaceId).localeCompare(resolveWorkspaceTitle(right.workspaceId));

      if (workspaceDelta !== 0) {
        return workspaceDelta;
      }

      return left.action.localeCompare(right.action);
    })
    .map((entry) => {
      const key = createTaskSlaPolicyKey(entry.workspaceId, entry.action);
      const override = policyOverridesByKey.get(key);

      return formatStoreTaskSlaPolicyEntry({
        id: override?.id ?? key,
        workspaceId: entry.workspaceId,
        action: entry.action,
        slaMinutes: override?.slaMinutes ?? resolveDefaultTaskSlaMinutes(entry.workspaceId as z.infer<typeof workspaceSchema>, entry.action),
        source: override ? "Custom" : "Default",
        updatedByName: override?.updatedByName ?? null,
        updatedAt: override?.updatedAt ?? null,
        openTaskCount: openTaskCountsByKey.get(key) ?? 0
      });
    });
}

async function loadStoreTaskSlaPolicyEntries(storeId: string) {
  const [policyOverrides, openTaskCounts, currentStoreTasks] = await Promise.all([
    prisma.storeTaskSlaPolicy.findMany({
      where: {
        storeId
      },
      orderBy: [
        {
          workspaceId: "asc"
        },
        {
          action: "asc"
        }
      ]
    }),
    prisma.storeTask.groupBy({
      by: ["workspaceId", "action"],
      where: {
        storeId,
        status: {
          not: "Done"
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.storeTask.groupBy({
      by: ["workspaceId", "action"],
      where: {
        storeId
      },
      _count: {
        _all: true
      }
    })
  ]);

  return buildStoreTaskSlaPolicyEntries(
    policyOverrides,
    openTaskCounts,
    currentStoreTasks.map((task) => ({
      workspaceId: task.workspaceId,
      action: task.action
    }))
  );
}

function buildStoreTaskSlaPolicyCopyComparison(
  sourcePolicies: Array<ReturnType<typeof formatStoreTaskSlaPolicyEntry>>,
  targetPolicies: Array<ReturnType<typeof formatStoreTaskSlaPolicyEntry>>
) {
  const sourcePoliciesByKey = new Map(sourcePolicies.map((policy) => [createTaskSlaPolicyKey(policy.workspaceId, policy.action), policy]));
  const targetPoliciesByKey = new Map(targetPolicies.map((policy) => [createTaskSlaPolicyKey(policy.workspaceId, policy.action), policy]));
  const policyKeys = new Map<string, { workspaceId: string; action: string }>();

  sourcePolicies.forEach((policy) => {
    policyKeys.set(createTaskSlaPolicyKey(policy.workspaceId, policy.action), {
      workspaceId: policy.workspaceId,
      action: policy.action
    });
  });

  targetPolicies.forEach((policy) => {
    if (policy.source === "Custom") {
      policyKeys.set(createTaskSlaPolicyKey(policy.workspaceId, policy.action), {
        workspaceId: policy.workspaceId,
        action: policy.action
      });
    }
  });

  return [...policyKeys.values()]
    .sort((left, right) => {
      const workspaceDelta = resolveWorkspaceTitle(left.workspaceId).localeCompare(resolveWorkspaceTitle(right.workspaceId));

      if (workspaceDelta !== 0) {
        return workspaceDelta;
      }

      return left.action.localeCompare(right.action);
    })
    .map((entry) => {
      const key = createTaskSlaPolicyKey(entry.workspaceId, entry.action);
      const sourcePolicy = sourcePoliciesByKey.get(key) ?? null;
      const targetPolicy = targetPoliciesByKey.get(key) ?? null;
      const nextTargetSlaMinutes = sourcePolicy?.slaMinutes ?? null;
      const nextTargetSlaLabel = sourcePolicy?.slaLabel ?? null;
      const nextTargetSource = sourcePolicy ? "Custom" : null;
      let changeType: "create" | "update" | "remove" | "unchanged" = "unchanged";

      if (!sourcePolicy) {
        changeType = targetPolicy?.source === "Custom" ? "remove" : "unchanged";
      } else if (!targetPolicy || targetPolicy.source === "Default") {
        changeType = "create";
      } else if (targetPolicy.slaMinutes !== sourcePolicy.slaMinutes) {
        changeType = "update";
      }

      return {
        workspaceId: entry.workspaceId,
        workspaceLabel: resolveWorkspaceTitle(entry.workspaceId),
        action: entry.action,
        sourceStoreSlaMinutes: sourcePolicy?.slaMinutes ?? null,
        sourceStoreSlaLabel: sourcePolicy?.slaLabel ?? null,
        sourceStoreSource: sourcePolicy?.source ?? null,
        targetStoreSlaMinutes: targetPolicy?.slaMinutes ?? null,
        targetStoreSlaLabel: targetPolicy?.slaLabel ?? null,
        targetStoreSource: targetPolicy?.source ?? null,
        targetPolicyId: targetPolicy?.source === "Custom" ? targetPolicy.id : null,
        nextTargetSlaMinutes,
        nextTargetSlaLabel,
        nextTargetSource,
        changeType
      };
    });
}

async function retimeOpenStoreTasks(
  storeId: string,
  actor: {
    actorUserId: string;
    actorName: string;
    actorInitial: string;
  },
  policyOverridesByKey?: Map<string, number>,
  filter?: {
    workspaceId?: string;
    action?: string;
  }
) {
  const openTasks = await prisma.storeTask.findMany({
    where: {
      storeId,
      status: {
        not: "Done"
      },
      ...(filter?.workspaceId ? { workspaceId: filter.workspaceId } : {}),
      ...(filter?.action ? { action: filter.action } : {})
    },
    select: {
      id: true,
      createdAt: true,
      workspaceId: true,
      action: true
    }
  });

  if (openTasks.length === 0) {
    return 0;
  }

  await prisma.$transaction(
    openTasks.map((task) => {
      const slaMinutes =
        policyOverridesByKey?.get(createTaskSlaPolicyKey(task.workspaceId, task.action)) ??
        resolveDefaultTaskSlaMinutes(task.workspaceId as z.infer<typeof workspaceSchema>, task.action);

      return prisma.storeTask.update({
        where: {
          id: task.id
        },
        data: {
          slaMinutes,
          dueAt: addMinutes(task.createdAt, slaMinutes),
          lastUpdatedByUserId: actor.actorUserId,
          lastUpdatedByName: actor.actorName,
          lastUpdatedByInitial: actor.actorInitial
        }
      });
    })
  );

  return openTasks.length;
}

function formatStoreTaskSlaPolicyEntry(policy: {
  id: string;
  workspaceId: string;
  action: string;
  slaMinutes: number;
  source: "Custom" | "Default";
  updatedByName: string | null;
  updatedAt: Date | null;
  openTaskCount: number;
}) {
  return {
    id: policy.id,
    workspaceId: policy.workspaceId,
    workspaceLabel: resolveWorkspaceTitle(policy.workspaceId),
    action: policy.action,
    slaMinutes: policy.slaMinutes,
    slaLabel: formatDurationMinutes(policy.slaMinutes),
    source: policy.source,
    updatedByName: policy.updatedByName,
    updatedAtLabel: policy.updatedAt ? `${formatDate(policy.updatedAt)} ${formatClockTime(policy.updatedAt)}` : null,
    openTaskCount: policy.openTaskCount
  };
}

function createTaskSlaPolicyKey(workspaceId: string, action: string) {
  return `${workspaceId}:${action}`;
}

function formatTaskSnapshotFields(payloadSnapshot: string) {
  try {
    const parsedSnapshot = JSON.parse(payloadSnapshot) as Record<string, string>;

    return Object.entries(parsedSnapshot)
      .filter(([, value]) => Boolean(value?.trim()))
      .map(([key, value]) => ({
        label: formatTaskSnapshotLabel(key),
        value
      }));
  } catch {
    return [];
  }
}

function formatTaskSnapshotLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function compareAuditRows(
  left: { sortBucket: number; sortScore: number; sortTime: number },
  right: { sortBucket: number; sortScore: number; sortTime: number }
) {
  if (right.sortBucket !== left.sortBucket) {
    return right.sortBucket - left.sortBucket;
  }

  if (right.sortScore !== left.sortScore) {
    return right.sortScore - left.sortScore;
  }

  return right.sortTime - left.sortTime;
}

function resolveWorkspaceTitle(workspaceId: string) {
  const lookup: Record<string, string> = {
    desktop: "Desktop",
    sales: "Leads, Quotes & Deals",
    service: "Estimates & Repair Orders",
    parts: "Parts Ordering",
    analytics: "Executive Board",
    website: "Website Feed",
    audit: "Audit Trail"
  };

  return lookup[workspaceId] ?? "Workspace";
}

async function resolveUniqueWorksheet(storeId: string, requestedWorksheet?: string, currentDealId?: string) {
  const trimmedWorksheet = requestedWorksheet?.trim();

  if (trimmedWorksheet) {
    const existingDeal = await prisma.salesDeal.findFirst({
      where: {
        storeId,
        worksheet: trimmedWorksheet
      },
      select: {
        id: true
      }
    });

    if (!existingDeal || existingDeal.id === currentDealId) {
      return trimmedWorksheet;
    }
  }

  return createNumericRecordId("60");
}

function normalizeWorkflowText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function parseIntegerValue(value: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function parseCurrencyToWholeDollars(value: string | undefined) {
  const numericValue = Number.parseFloat((value ?? "").replace(/[^0-9.\-]/g, ""));

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.round(numericValue);
}

function splitUnitLabel(unitLabel: string) {
  const trimmedValue = unitLabel.trim();

  if (!trimmedValue) {
    return {
      make: "PENDING",
      model: "UNIT"
    };
  }

  const [make, ...modelParts] = trimmedValue.split(/\s+/);

  return {
    make,
    model: modelParts.join(" ") || "UNIT"
  };
}

function createNumericRecordId(prefix: string) {
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

class RequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "RequestError";
    this.statusCode = statusCode;
  }
}
