import type { NavigationGroup, WorkspaceId } from "./types";

export interface QuickLaunchButton {
  slot: string;
  label: string;
  workspaceId?: WorkspaceId;
  action?: "switchStore" | "logout";
}

export interface WorkspaceDefinition {
  id: WorkspaceId;
  title: string;
  subtitle: string;
  tools: string[];
}

export const legacyFallbackNavigation: NavigationGroup[] = [
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
              {
                label: "Lookup Tools",
                items: ["Parts Inventory", "Part Number Lookup"]
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
          {
            label: "Write-Up",
            items: [
              {
                label: "Service Intake",
                items: ["New Estimate", "New Repair Order"]
              },
              {
                label: "Open Orders",
                items: ["Estimates & Repair Orders", "Express Write-Up"]
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
          {
            label: "Boat Stock",
            items: ["Boat Inventory", "Unit Inventory", "Boats In Stock"]
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
              {
                label: "Open Pipeline",
                items: ["Leads, Quotes & Deals", "Unsold Follow-Up"]
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
    label: "Receivables",
    items: [
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
        label: "Digital Operations",
        items: [
          {
            label: "Website Publishing",
            items: [
              {
                label: "Feed Delivery",
                items: ["Website Feed", "Feed Health"]
              },
              {
                label: "Publishing Exceptions",
                items: ["Feed Retry Queue"]
              }
            ]
          },
          {
            label: "Lead & Sync",
            items: [
              {
                label: "Lead Delivery",
                items: ["Lead Form Routing", "Sync Monitor"]
              },
              {
                label: "Retry & Recovery",
                items: ["Lead Retry Queue"]
              }
            ]
          }
        ]
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
];

export const workspaceDefinitions: Record<WorkspaceId, WorkspaceDefinition> = {
  desktop: {
    id: "desktop",
    title: "Desktop",
    subtitle: "Compact command surface for multi-department operators",
    tools: ["Designer", "Refresh", "Store Status", "Workspace Tools"]
  },
  service: {
    id: "service",
    title: "Estimates & Repair Orders",
    subtitle: "RO queue, service readiness, and warranty blockers",
    tools: ["New Estimate", "New Repair Order", "Duplicate", "Print", "Report", "Detail"]
  },
  parts: {
    id: "parts",
    title: "Parts Ordering",
    subtitle: "Fast ordering flow with line visibility and supplier detail",
    tools: ["Delete", "Delete Selected", "Guide", "Purchase Order", "Refresh"]
  },
  boatInventory: {
    id: "boatInventory",
    title: "Boat Inventory",
    subtitle: "Unit stock, trade-ins, on-order boats, pricing, and merchandising readiness",
    tools: ["Add Unit", "Edit Unit", "Refresh"]
  },
  sales: {
    id: "sales",
    title: "Leads, Quotes & Deals",
    subtitle: "Sales board with deal velocity and queue color",
    tools: ["New Lead", "New Quote", "New Deal", "Take Deposit", "Marketing", "Send Message"]
  },
  analytics: {
    id: "analytics",
    title: "Executive Board",
    subtitle: "Leadership posture across DMS, payroll, analytics, and website lanes",
    tools: ["Forecast", "Exceptions", "Cross-Store View", "Refresh"]
  },
  audit: {
    id: "audit",
    title: "Audit Trail",
    subtitle: "Cross-store operator history, task handoff, and workflow exception tracking",
    tools: ["Refresh"]
  },
  website: {
    id: "website",
    title: "Website Feed",
    subtitle: "Inventory publishing and lead sync command rail",
    tools: ["Publish Feed", "Lead Sync", "Open Queue", "Refresh"]
  },
  reports: {
    id: "reports",
    title: "Report Center",
    subtitle: "Business intelligence reports for revenue, parts, technicians, and aging",
    tools: ["Refresh", "Export"]
  }
};

export const workspaceOrder: WorkspaceId[] = ["desktop", "service", "parts", "boatInventory", "sales", "analytics", "website", "audit", "reports"];

export const quickLaunchButtons: QuickLaunchButton[] = [
  { slot: "1", label: "Desktop", workspaceId: "desktop" },
  { slot: "2", label: "Estimates & Repair Orders", workspaceId: "service" },
  { slot: "3", label: "Parts Ordering", workspaceId: "parts" },
  { slot: "4", label: "Sales Board", workspaceId: "sales" },
  { slot: "6", label: "Website Feed", workspaceId: "website" },
  { slot: "7", label: "Payroll Review", workspaceId: "analytics" },
  { slot: "8", label: "Receivables", workspaceId: "analytics" },
  { slot: "9", label: "Audit Trail", workspaceId: "audit" },
  { slot: "0", label: "Switch Store", action: "switchStore" }
];

const navigationMenuWorkspaceLookup: Record<string, WorkspaceId> = {
    "application:view": "desktop",
    "application:desktop": "desktop",
    "application:open windows": "desktop",
    "application:command search": "desktop",
    "application:workspace overview": "desktop",
    "application:activity snapshot": "desktop",
    "application:task queue monitor": "desktop",
    "application:notification center": "desktop",
    "application:search results": "desktop",
    "application:store status board": "desktop",
    "application:operator status board": "analytics",
    "application:sales deal jackets": "desktop",
    "application:pending quotes": "sales",
    "application:delivery packets": "sales",
    "application:repair orders": "desktop",
    "application:estimate worksheets": "service",
    "application:warranty packets": "service",
    "application:parts purchase orders": "desktop",
    "application:special order slips": "parts",
    "application:receiving exceptions": "parts",
    "application:audit notes": "desktop",
    "application:exception logs": "audit",
    "application:workflow checklists": "audit",
    "application:executive snapshot": "desktop",
    "application:cash pulse": "analytics",
    "application:store scorecard": "analytics",
    "application:sales velocity": "desktop",
    "application:lead source mix": "sales",
    "application:desk productivity": "sales",
    "application:service promise board": "desktop",
    "application:technician load": "service",
    "application:comeback watch": "service",
    "application:parts fill rate": "desktop",
    "application:obsolescence watch": "parts",
    "application:vendor performance": "parts",
    "application:pinned windows": "desktop",
    "application:workspace reset": "desktop",
    "application:window layout presets": "desktop",
    "application:notifications": "desktop",
    "application:exception inbox": "audit",
    "application:follow-up prompts": "desktop",
    "application:store summary": "desktop",
    "application:store roster": "desktop",
    "application:shift notes": "desktop",
    "application:preferences": "desktop",
    "application:personal shortcuts": "desktop",
    "application:quick launch setup": "desktop",
    "application:favorite desktop": "desktop",
    "application:favorite service board": "service",
    "application:favorite parts board": "parts",
    "application:favorite sales board": "sales",
    "application:favorite executive board": "analytics",
    "application:favorite website feed": "website",
    "application:favorite audit trail": "audit",
    "parts:parts inventory": "parts",
    "inventory:boat inventory": "boatInventory",
    "inventory:unit inventory": "boatInventory",
    "inventory:boats in stock": "boatInventory",
    "parts:ordering": "parts",
    "parts:receiving": "parts",
    "parts:special orders": "parts",
    "parts:cashiering": "parts",
    "service:new estimate": "service",
    "service:new repair order": "service",
    "service:estimates & repair orders": "service",
    "service:warranty claims": "service",
    "sales:salesperson insights": "sales",
    "sales:new lead": "sales",
    "sales:new quote": "sales",
    "sales:new deal": "sales",
    "sales:leads, quotes & deals": "sales",
    "crm:communicate": "sales",
    "management activity:desktop": "desktop",
    "management activity:executive board": "analytics",
    "management activity:managements activitie's": "analytics",
    "management activity:cashier accountability": "analytics",
    "management activity:cashier reconciliation": "analytics",
    "management activity:exception monitor": "analytics",
    "management activity:website activity": "website",
    "management activity:payroll review": "analytics",
    "management activity:lead handoff monitor": "website",
    "management activity:campaign response": "website",
    "management activity:reputation watch": "website",
    "management activity:audit trail": "audit",
    "management activity:policy exceptions": "audit",
    "management activity:approval log": "audit",
    "management activity:month-end readiness": "audit",
    "management activity:favorite website pulse": "website",
    "management activity:favorite approval log": "audit",
    "receivables:customer inquiry": "analytics",
    "receivables:credit hold review": "analytics",
    "receivables:statement requests": "analytics",
    "receivables:balance forward review": "analytics",
    "receivables:promise to pay": "analytics",
    "receivables:broken promise review": "analytics",
    "receivables:collections queue": "analytics",
    "receivables:delinquency watch": "analytics",
    "receivables:follow-up notes": "analytics",
    "receivables:dispute follow-up": "analytics",
    "receivables:credit card batch payments": "analytics",
    "receivables:batch deposit match": "analytics",
    "receivables:ach exceptions": "analytics",
    "receivables:nsf watch": "analytics",
    "receivables:chargeback watch": "analytics",
    "receivables:merchant reserve review": "analytics",
    "receivables:reports": "analytics",
    "receivables:aging review": "analytics",
    "receivables:promise tracker": "analytics",
    "receivables:broken promise summary": "analytics",
    "receivables:month-end ar": "analytics",
    "receivables:finance follow-up": "analytics",
    "receivables:write-off review": "analytics",
    "general ledger:chart of accounts": "analytics",
    "general ledger:profit & loss": "analytics",
    "general ledger:store summary": "analytics",
    "general ledger:department p&l": "analytics",
    "general ledger:flash report": "analytics",
    "general ledger:expense variance": "analytics",
    "general ledger:deal posting": "analytics",
    "general ledger:funding to gl": "analytics",
    "general ledger:contract-in-transit": "analytics",
    "general ledger:funding exception review": "analytics",
    "general ledger:deposits": "analytics",
    "general ledger:deposit exceptions": "analytics",
    "general ledger:cash clearing": "analytics",
    "general ledger:deposit slip match": "analytics",
    "general ledger:month end": "analytics",
    "general ledger:close checklist": "analytics",
    "general ledger:accrual review": "analytics",
    "general ledger:trial balance review": "analytics",
    "general ledger:bank reconciliation": "analytics",
    "general ledger:schedule review": "analytics",
    "general ledger:journal entry queue": "analytics",
    "general ledger:recurring journal review": "analytics",
    "system:website feed": "website",
    "system:feed health": "website",
    "system:feed retry queue": "website",
    "system:lead form routing": "website",
    "system:sync monitor": "website",
    "system:lead retry queue": "website",
    "system:users & roles": "analytics",
    "system:permission changes": "analytics",
    "system:store access matrix": "analytics",
    "system:mfa reset queue": "analytics",
    "system:workflow rules": "analytics",
    "system:notification escalations": "analytics",
    "system:background jobs": "analytics",
    "system:feature flags": "analytics",
    "system:environment review": "analytics",
    "system:audit trail": "audit",
    "system:login watch": "audit",
    "system:password policy review": "audit",
    "system:policy change log": "audit",
    "system:api connectors": "analytics",
    "system:vendor endpoints": "analytics",
    "system:template library": "analytics",
    "system:webhook retry log": "analytics",
    "help:first week plan": "desktop",
    "help:open windows guide": "desktop",
    "help:queue triage guide": "desktop",
    "help:month-end walkthrough": "desktop",
    "help:fix verification checklist": "audit",
    "help:release webinar": "desktop",
    "help:escalation playbook": "audit",
    "help:certification tracker": "desktop"
};

export function hasExplicitWorkspaceAssignment(groupLabel: string, item: string): boolean {
  return `${groupLabel}:${item}`.toLowerCase() in navigationMenuWorkspaceLookup;
}

export function resolveWorkspaceFromMenuItem(groupLabel: string, item: string): WorkspaceId | null {
  const groupFallbackLookup: Record<string, WorkspaceId> = {
    application: "desktop",
    parts: "parts",
    inventory: "boatInventory",
    service: "service",
    sales: "sales",
    crm: "sales",
    "management activity": "analytics",
    receivables: "analytics",
    "general ledger": "analytics",
    system: "analytics",
    help: "desktop"
  };

  const lookupKey = `${groupLabel}:${item}`.toLowerCase();
  const groupKey = groupLabel.toLowerCase();

  return navigationMenuWorkspaceLookup[lookupKey] ?? groupFallbackLookup[groupKey] ?? null;
}

export function isWorkspaceId(value: string): value is WorkspaceId {
  return workspaceOrder.includes(value as WorkspaceId);
}
