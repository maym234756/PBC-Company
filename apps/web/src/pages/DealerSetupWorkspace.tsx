import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { createDealerSetupDealer, getDealerSetupPersistedDealers } from "../api";

type DealerSetupStatus = "Active" | "In Setup" | "Needs Review" | "Draft";
type DealerLocationStatus = "Live" | "In Progress" | "Pending" | "Not Started";
type DealerIntegrationStatus = "Connected" | "Warning" | "Pending" | "Not Started";
type DealerChecklistTone = "complete" | "warning" | "pending";
type DealerDetailTab = "profile" | "modules" | "permissions" | "integrations" | "dataImport";
type DealerCenterView = "locations" | "map";

type DealerModule = {
  enabled: boolean;
  id: string;
  label: string;
};

type DealerIntegration = {
  id: string;
  label: string;
  note: string;
  status: DealerIntegrationStatus;
};

type DealerChecklistItem = {
  detail: string;
  id: string;
  label: string;
  tone: DealerChecklistTone;
};

type DealerActivityItem = {
  detail: string;
  id: string;
  timeLabel: string;
};

type DealerPermissionRow = {
  accounting: boolean;
  crm: boolean;
  inventory: boolean;
  parts: boolean;
  role: string;
  sales: boolean;
  service: boolean;
};

type DealerImportStage = {
  complete: number;
  id: string;
  label: string;
  total: number;
};

type DealerLocation = {
  address: string;
  coordinates?: DealerMapCoordinates;
  id: string;
  label: string;
  launchReadiness: number;
  locationType?: string;
  manager?: string;
  moduleLabel: string;
  operatingCompany?: string;
  portfolioLabel?: string;
  status: DealerLocationStatus;
  storeCode?: string;
  storeDealerId?: string;
};

type DealerMapLocation = DealerLocation & {
  dealerName: string;
  dealerRecordId: string;
  groupLabel: string;
  rooftopCode: string;
};

type DealerBillingSummary = {
  achCompanyName?: string;
  achRoutingLast4?: string;
  addOnLabels: string[];
  baseMonthlyPerStore: number;
  billingContactName?: string;
  billingPhone?: string;
  billingCadence: string;
  contractStartDate?: string;
  contractTermMonths?: string;
  estimatedMonthlyTotal: number;
  invoiceEmail: string;
  invoiceDelivery?: string;
  notes: string;
  paymentMethod: string;
  paymentTerms?: string;
};

type DealerUserSeat = {
  assignedStoreId: string;
  assignedStoreLabel: string;
  email: string;
  fullName: string;
  id: string;
  phone: string;
  profile: string;
  role: string;
};

type DealerRecord = {
  dealerId: string;
  goLive: string;
  groupLabel: string;
  companyCode?: string;
  companyId?: string;
  corporateBillingEmail?: string;
  enterpriseGroupId?: string;
  enterpriseGroupName?: string;
  id: string;
  integration: string;
  integrations: DealerIntegration[];
  legalEntity: string;
  locations: DealerLocation[];
  modules: DealerModule[];
  name: string;
  nextSteps: string[];
  oemBrands?: string[];
  parentCompanyName?: string;
  permissionRows: DealerPermissionRow[];
  billing?: DealerBillingSummary;
  progressPercent: number;
  region: string;
  rooftopCode: string;
  storeType?: string;
  status: DealerSetupStatus;
  timeZone: string;
  userSeats?: DealerUserSeat[];
  usersCount: number;
  website: string;
  activity: DealerActivityItem[];
  checklist: DealerChecklistItem[];
  importStages: DealerImportStage[];
};

type DealerGroup = {
  dealerIds: string[];
  id: string;
  label: string;
};

type OnboardingStep = {
  id: string;
  label: string;
  shortLabel: string;
};

type DealerProfileDraft = {
  address: string;
  contactEmail: string;
  contactName: string;
  contactPhone: string;
  companyId: string;
  corporateBillingEmail: string;
  dbaName: string;
  dealerCode: string;
  enterpriseGroupId: string;
  enterpriseGroupName: string;
  legalDealerName: string;
  oemBrands: string[];
  parentCompanyName: string;
  portfolioMode: string;
  storeType: string;
  taxId: string;
  timeZone: string;
  website: string;
};

type DealerStoreDraft = {
  city: string;
  id: string;
  locationType: string;
  manager: string;
  operatingCompany: string;
  portfolioLabel: string;
  state: string;
  storeCode: string;
  storeDealerId: string;
  storeName: string;
  street: string;
};

type DealerUserSeatDraft = {
  assignedStoreId: string;
  email: string;
  fullName: string;
  id: string;
  phone: string;
  profile: string;
  role: string;
};

type DealerBillingDraft = {
  achCompanyName: string;
  achRoutingLast4: string;
  baseMonthlyPerStore: string;
  billingContactName: string;
  billingPhone: string;
  billingCadence: string;
  contractStartDate: string;
  contractTermMonths: string;
  invoiceEmail: string;
  invoiceDelivery: string;
  notes: string;
  paymentMethod: string;
  paymentTerms: string;
  selectedAddOnIds: string[];
};

type DealerBillingAddOn = {
  id: string;
  label: string;
  monthlyPerStore: number;
  note: string;
};

type DealerMapCoordinates = {
  lat: number;
  lng: number;
};

type DealerMapLayerId = "street" | "light" | "satellite";

const onboardingSteps: OnboardingStep[] = [
  { id: "dealer-profile", label: "Dealer Profile", shortLabel: "Profile" },
  { id: "stores", label: "Store IDs", shortLabel: "Stores" },
  { id: "modules", label: "Modules", shortLabel: "Modules" },
  { id: "integrations", label: "Integrations", shortLabel: "Integrations" },
  { id: "users", label: "Users", shortLabel: "Users" },
  { id: "billing", label: "Billing", shortLabel: "Billing" },
  { id: "review", label: "Review", shortLabel: "Review" }
];

const detailTabs: Array<{ id: DealerDetailTab; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "modules", label: "Modules" },
  { id: "permissions", label: "Permissions" },
  { id: "integrations", label: "Integrations" },
  { id: "dataImport", label: "Data Import" }
];

const sharedPermissionRows: DealerPermissionRow[] = [
  { role: "Admin", sales: true, service: true, parts: true, accounting: true, crm: true, inventory: true },
  { role: "Sales Manager", sales: true, service: false, parts: false, accounting: false, crm: true, inventory: true },
  { role: "Service Advisor", sales: false, service: true, parts: false, accounting: false, crm: false, inventory: true },
  { role: "Parts Manager", sales: false, service: true, parts: true, accounting: false, crm: false, inventory: true }
];

const dealerGroups: DealerGroup[] = [
  { id: "northstar", label: "Northstar Dealer Group", dealerIds: ["northside-auto-group", "sunset-motors", "pinehurst-automotive"] },
  { id: "summit", label: "Summit Auto Group", dealerIds: ["lakeside-auto-group"] },
  { id: "frontier", label: "Frontier Motors", dealerIds: ["metro-car-co"] }
];

const initialProfileDraft: DealerProfileDraft = {
  enterpriseGroupName: "Premier + OMG Unified Retail Network",
  enterpriseGroupId: "ENT-24001",
  parentCompanyName: "Premier Boating Centers",
  companyId: "COMP-PBC-001",
  legalDealerName: "Premier Marine Holdings, LLC",
  dbaName: "Premier + OMG Coastal Stores",
  dealerCode: "PMG-UNIFIED",
  oemBrands: ["Yamaha", "Sea-Doo", "Bennington", "Mercury Marine"],
  timeZone: "Eastern Time (US & Canada)",
  portfolioMode: "Combined enterprise",
  storeType: "Multi-store marine group",
  contactName: "Michael Anderson",
  contactEmail: "michael.anderson@premierboatingcenters.com",
  contactPhone: "(615) 555-0142",
  corporateBillingEmail: "billing@premierboatingcenters.com",
  taxId: "26-1234567",
  address: "601 Marina Commerce Dr, Fort Lauderdale, FL 33312",
  website: "https://www.premierboatingcenters.com"
};

const initialStoreDrafts: DealerStoreDraft[] = [
  {
    id: "store-1",
    storeName: "Premier Fort Lauderdale",
    storeCode: "PBC-FTL",
    storeDealerId: "DLR-PBC-1001",
    operatingCompany: "Premier Boating Centers",
    portfolioLabel: "Premier",
    manager: "Jamie Carter",
    street: "601 Marina Commerce Dr",
    city: "Fort Lauderdale",
    state: "FL",
    locationType: "Flagship marina"
  },
  {
    id: "store-2",
    storeName: "Ocean Marine Clearwater",
    storeCode: "OMG-CLW",
    storeDealerId: "DLR-OMG-2001",
    operatingCompany: "Ocean Marine Group",
    portfolioLabel: "OMG",
    manager: "Alex Monroe",
    street: "880 Gulf to Bay Blvd",
    city: "Clearwater",
    state: "FL",
    locationType: "Satellite retail"
  }
];

const initialUserSeats: DealerUserSeatDraft[] = [
  {
    id: "user-1",
    fullName: "Mason May",
    email: "mason.may@premierboatingcenters.com",
    role: "Store Director",
    profile: "Management",
    assignedStoreId: "store-1",
    phone: "(954) 555-0180"
  },
  {
    id: "user-2",
    fullName: "Jordan Lee",
    email: "jordan.lee@oceanmarinegroup.com",
    role: "Sales Manager",
    profile: "Sub Management",
    assignedStoreId: "store-2",
    phone: "(727) 555-0109"
  },
  {
    id: "user-3",
    fullName: "Taylor Brooks",
    email: "taylor.brooks@premierboatingcenters.com",
    role: "Inventory Coordinator",
    profile: "User",
    assignedStoreId: "store-1",
    phone: "(954) 555-0135"
  }
];

const initialBillingDraft: DealerBillingDraft = {
  baseMonthlyPerStore: "5000",
  billingContactName: "Emily Carter",
  billingPhone: "(615) 555-0198",
  invoiceEmail: "billing@premierboatingcenters.com",
  paymentMethod: "ACH",
  billingCadence: "Monthly autopay",
  paymentTerms: "Due on receipt",
  contractTermMonths: "12",
  contractStartDate: "2026-06-01",
  invoiceDelivery: "Email + PDF copy",
  achCompanyName: "Premier Marine Holdings",
  achRoutingLast4: "8821",
  notes: "Most dealers pay by ACH, but credit card, wire, and invoice terms remain available for exceptions.",
  selectedAddOnIds: ["advanced-builds", "api-access"]
};

const dealerBillingAddOns: DealerBillingAddOn[] = [
  { id: "advanced-builds", label: "Advanced Builds", monthlyPerStore: 1200, note: "Custom feature delivery and rollout support." },
  { id: "api-access", label: "API Keys", monthlyPerStore: 950, note: "API access, credential rotation, and integration oversight." },
  { id: "leaf-customization", label: "Leaf / App Module Expansion", monthlyPerStore: 700, note: "Additional nav leafs, module access, and workflow setup." },
  { id: "premium-support", label: "Premium Support", monthlyPerStore: 550, note: "Priority support and deployment concierge." }
];

const oemBrandOptions = ["Yamaha", "Sea-Doo", "Bennington", "Mercury Marine", "Suzuki Marine", "Chaparral", "Cobalt"];

const onboardingRoleOptions = [
  "CEO",
  "President",
  "COO",
  "CFO",
  "CIO",
  "Controller",
  "Regional Manager",
  "Store Manager",
  "Service Director",
  "Service Manager",
  "Service Advisor",
  "Parts Director",
  "Parts Manager",
  "Parts Advisor",
  "Sales Director",
  "Sales Manager",
  "Finance Manager",
  "Inventory Manager",
  "Marketing Manager",
  "Warranty Administrator",
  "Porter",
  "Boat Captain",
  "Delivery Coordinator"
];

const dealerLocationCoordinateLookup: Record<string, DealerMapCoordinates> = {
  "123 main st, springfield, il 62701": { lat: 39.8017, lng: -89.6436 },
  "456 recovery rd, springfield, il 62702": { lat: 39.8232, lng: -89.6501 },
  "789 market ave, springfield, il 62703": { lat: 39.7814, lng: -89.6507 },
  "321 service ln, springfield, il 62704": { lat: 39.7716, lng: -89.6104 },
  "100 beach dr, savannah, ga 31401": { lat: 32.0796, lng: -81.0831 },
  "140 harbor ave, charleston, sc 29401": { lat: 32.7795, lng: -79.9311 },
  "600 marina dr, madison, wi 53703": { lat: 43.0761, lng: -89.3813 },
  "12 summit way, denver, co 80202": { lat: 39.7508, lng: -104.9962 },
  "601 marina commerce dr, fort lauderdale, fl 33312": { lat: 26.1067, lng: -80.1706 },
  "601 marina commerce dr, fort lauderdale, fl": { lat: 26.1067, lng: -80.1706 },
  "880 gulf to bay blvd, clearwater, fl": { lat: 27.9606, lng: -82.7874 },
  "880 gulf to bay blvd, clearwater, fl 33755": { lat: 27.9606, lng: -82.7874 }
};

function normalizeDealerLocationAddress(address: string) {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveDealerLocationCoordinates(address: string) {
  return dealerLocationCoordinateLookup[normalizeDealerLocationAddress(address)];
}

const moduleBlueprints = [
  {
    id: "sales",
    label: "Sales & F&I",
    stage: "Core launch",
    summary: "Runs lead intake, deal jackets, quoting, desk activity, and finance handoff.",
    teams: ["Sales", "Finance", "Delivery"],
    deliverables: ["Lead pipeline", "Deal jackets", "F&I handoff"]
  },
  {
    id: "service",
    label: "Service Operations",
    stage: "Core launch",
    summary: "Controls repair orders, advisor workflow, dispatch, scheduling, and technician boards.",
    teams: ["Service advisors", "Dispatch", "Technicians"],
    deliverables: ["RO lifecycle", "Scheduling", "Tech workload"]
  },
  {
    id: "parts",
    label: "Parts Counter & Inventory",
    stage: "Core launch",
    summary: "Tracks stock, receiving, special orders, parts counter workflow, and replenishment.",
    teams: ["Parts counter", "Receiving", "Inventory control"],
    deliverables: ["Stock visibility", "Receiving", "Special orders"]
  },
  {
    id: "accounting",
    label: "Accounting & Cash Controls",
    stage: "Recommended",
    summary: "Supports GL, AR, cashier accountability, reconciliation, and financial review.",
    teams: ["Accounting", "Office manager", "Controllers"],
    deliverables: ["GL visibility", "Cash controls", "AR accountability"]
  },
  {
    id: "crm",
    label: "CRM & Customer Follow-Up",
    stage: "Recommended",
    summary: "Handles conversations, review outreach, follow-up campaigns, and customer accountability.",
    teams: ["BDC", "Sales", "Marketing"],
    deliverables: ["Conversation inbox", "Follow-up", "Review capture"]
  },
  {
    id: "inventory",
    label: "Inventory & Merchandising",
    stage: "Optional at go-live",
    summary: "Manages boat listings, pricing, merchandising content, and website inventory readiness.",
    teams: ["Inventory", "Marketing", "Sales"],
    deliverables: ["Boat listings", "Pricing", "Website-ready units"]
  }
] as const;

const integrationBlueprints = [
  {
    id: "dms",
    label: "DMS",
    stage: "Required",
    summary: "Primary system of record for units, customers, service events, and financial activity.",
    owner: "Operations + IT",
    syncs: ["Customer records", "Unit inventory", "Repair order context"]
  },
  {
    id: "f&i",
    label: "F&I Platform",
    stage: "Go-live",
    summary: "Pushes finance menu decisions, lender handoff, and product penetrations into the sales process.",
    owner: "Finance office",
    syncs: ["Menu selections", "Lender handoff", "Deal status"]
  },
  {
    id: "accounting",
    label: "Accounting",
    stage: "Required",
    summary: "Maps chart of accounts, deposit controls, and receivables visibility into the platform.",
    owner: "Controller",
    syncs: ["GL mapping", "Cash activity", "AR context"]
  },
  {
    id: "marketing",
    label: "Marketing",
    stage: "Recommended",
    summary: "Connects lead capture, campaign attribution, and website conversion sources.",
    owner: "Marketing leader",
    syncs: ["Lead sources", "Campaign attribution", "Form fills"]
  },
  {
    id: "credit",
    label: "Credit Bureau",
    stage: "Optional",
    summary: "Adds bureau pull readiness for lenders and credit-informed finance workflow when needed.",
    owner: "Finance office",
    syncs: ["Applicant identity", "Credit pulls", "Decision status"]
  }
] as const;

const initialModuleSelection = ["sales", "service", "parts", "accounting", "crm"];
const initialIntegrationSelection = ["dms", "f&i", "accounting", "marketing"];
const requiredProfileFields: Array<{ key: keyof DealerProfileDraft; label: string }> = [
  { key: "enterpriseGroupName", label: "Enterprise Group Name" },
  { key: "enterpriseGroupId", label: "Enterprise Group ID" },
  { key: "parentCompanyName", label: "Operating Company" },
  { key: "companyId", label: "Company ID" },
  { key: "legalDealerName", label: "Legal Dealer Name" },
  { key: "dealerCode", label: "Company Code" },
  { key: "oemBrands", label: "OEM Brand" },
  { key: "timeZone", label: "Time Zone" },
  { key: "contactName", label: "Primary Contact Name" },
  { key: "contactEmail", label: "Primary Contact Email" },
  { key: "corporateBillingEmail", label: "Billing Email" },
  { key: "address", label: "Address" },
  { key: "taxId", label: "Tax ID" },
  { key: "storeType", label: "Store Type" },
  { key: "website", label: "Website" }
];

const dealerSetupRows: DealerRecord[] = [
  {
    id: "northside-auto-group",
    name: "Northside Auto Group",
    dealerId: "DLR-1001",
    legalEntity: "Northside Auto Group, LLC",
    region: "Northeast",
    status: "In Setup",
    groupLabel: "Northstar Dealer Group",
    integration: "AutoPro DMS",
    goLive: "-",
    progressPercent: 68,
    rooftopCode: "RFT-10023",
    timeZone: "America/Chicago",
    usersCount: 42,
    website: "northsideautogroup.com",
    locations: [
      { id: "nag-sales", label: "Northside Auto Group - Sales", address: "123 Main St, Springfield, IL 62701", coordinates: resolveDealerLocationCoordinates("123 Main St, Springfield, IL 62701"), status: "Live", launchReadiness: 92, moduleLabel: "Sales" },
      { id: "nag-service", label: "Northside Auto Group - Service", address: "123 Main St, Springfield, IL 62701", coordinates: resolveDealerLocationCoordinates("123 Main St, Springfield, IL 62701"), status: "In Progress", launchReadiness: 74, moduleLabel: "Service" },
      { id: "nag-parts", label: "Northside Auto Group - Parts", address: "123 Main St, Springfield, IL 62701", coordinates: resolveDealerLocationCoordinates("123 Main St, Springfield, IL 62701"), status: "In Progress", launchReadiness: 68, moduleLabel: "Parts" },
      { id: "nag-collision", label: "Northside Auto Group - Collision", address: "456 Recovery Rd, Springfield, IL 62702", coordinates: resolveDealerLocationCoordinates("456 Recovery Rd, Springfield, IL 62702"), status: "Pending", launchReadiness: 45, moduleLabel: "Inventory" },
      { id: "nag-used", label: "Northside Auto Group - Used Car", address: "789 Market Ave, Springfield, IL 62703", coordinates: resolveDealerLocationCoordinates("789 Market Ave, Springfield, IL 62703"), status: "Pending", launchReadiness: 38, moduleLabel: "Sales" },
      { id: "nag-quick-lube", label: "Northside Auto Group - Quick Lube", address: "321 Service Ln, Springfield, IL 62704", coordinates: resolveDealerLocationCoordinates("321 Service Ln, Springfield, IL 62704"), status: "Not Started", launchReadiness: 12, moduleLabel: "Service" }
    ],
    modules: [
      { id: "sales", label: "Sales", enabled: true },
      { id: "service", label: "Service", enabled: true },
      { id: "parts", label: "Parts", enabled: true },
      { id: "accounting", label: "Accounting", enabled: true },
      { id: "crm", label: "CRM", enabled: true },
      { id: "inventory", label: "Inventory", enabled: true }
    ],
    integrations: [
      { id: "oem-feed", label: "OEM Feed", note: "Updated 5/12/24", status: "Connected" },
      { id: "fi-platform", label: "F&I", note: "Updated 5/10/24", status: "Connected" },
      { id: "accounting", label: "Accounting", note: "Attention required", status: "Warning" },
      { id: "vehicle-inventory", label: "Vehicle Inventory", note: "Updated 5/11/24", status: "Connected" },
      { id: "data-import", label: "DMS Data Import", note: "Field mapping in progress", status: "Pending" }
    ],
    permissionRows: sharedPermissionRows,
    importStages: [
      { id: "modules-enabled", label: "Required Modules Enabled", complete: 6, total: 6 },
      { id: "integrations-configured", label: "Integrations Configured", complete: 4, total: 5 },
      { id: "import-completed", label: "Data Import Completed", complete: 2, total: 3 },
      { id: "users-provisioned", label: "Users Provisioned", complete: 8, total: 15 }
    ],
    checklist: [
      { id: "legal", label: "Legal Entity", detail: "Northside Auto Group, LLC", tone: "complete" },
      { id: "rooftops", label: "Rooftops", detail: "3 configured", tone: "complete" },
      { id: "modules", label: "DMS Modules", detail: "7 of 8 enabled", tone: "warning" },
      { id: "roles", label: "User Roles", detail: "12 roles defined", tone: "complete" },
      { id: "integrations", label: "OEM Integrations", detail: "4 of 6 connected", tone: "warning" },
      { id: "validation", label: "Validation", detail: "8 issues found", tone: "pending" }
    ],
    activity: [
      { id: "n-1", timeLabel: "May 14, 2024 10:24 AM", detail: "Maya Patel updated permissions for role \"Service Advisor\"." },
      { id: "n-2", timeLabel: "May 13, 2024 03:41 PM", detail: "John Reynolds enabled Accounting integration." },
      { id: "n-3", timeLabel: "May 13, 2024 02:15 PM", detail: "System imported 1,248 vehicles via DMS data import." },
      { id: "n-4", timeLabel: "May 12, 2024 11:08 AM", detail: "Maya Patel updated modules for \"Northside Auto Group - Service\"." }
    ],
    nextSteps: [
      "Complete DMS data import mapping.",
      "Resolve Accounting integration warning.",
      "Add two users to each minimum role."
    ]
  },
  {
    id: "sunset-motors",
    name: "Sunset Motors",
    dealerId: "DLR-1002",
    legalEntity: "Sunset Motors Holdings",
    region: "Southeast",
    status: "Active",
    groupLabel: "Northstar Dealer Group",
    integration: "AutoPro DMS",
    goLive: "May 15, 2026",
    progressPercent: 96,
    rooftopCode: "RFT-10024",
    timeZone: "America/New_York",
    usersCount: 28,
    website: "sunsetmotors.com",
    locations: [
      { id: "sunset-sales", label: "Sunset Motors - Sales", address: "100 Beach Dr, Savannah, GA 31401", coordinates: resolveDealerLocationCoordinates("100 Beach Dr, Savannah, GA 31401"), status: "Live", launchReadiness: 96, moduleLabel: "Sales" },
      { id: "sunset-service", label: "Sunset Motors - Service", address: "100 Beach Dr, Savannah, GA 31401", coordinates: resolveDealerLocationCoordinates("100 Beach Dr, Savannah, GA 31401"), status: "Live", launchReadiness: 94, moduleLabel: "Service" },
      { id: "sunset-parts", label: "Sunset Motors - Parts", address: "100 Beach Dr, Savannah, GA 31401", coordinates: resolveDealerLocationCoordinates("100 Beach Dr, Savannah, GA 31401"), status: "Live", launchReadiness: 91, moduleLabel: "Parts" }
    ],
    modules: [
      { id: "sales", label: "Sales", enabled: true },
      { id: "service", label: "Service", enabled: true },
      { id: "parts", label: "Parts", enabled: true },
      { id: "accounting", label: "Accounting", enabled: true },
      { id: "crm", label: "CRM", enabled: true },
      { id: "inventory", label: "Inventory", enabled: true }
    ],
    integrations: [
      { id: "oem-feed", label: "OEM Feed", note: "All 5 brand feeds verified", status: "Connected" },
      { id: "fi-platform", label: "F&I", note: "Production link healthy", status: "Connected" },
      { id: "accounting", label: "Accounting", note: "Daily ledger sync clean", status: "Connected" },
      { id: "vehicle-inventory", label: "Vehicle Inventory", note: "Inventory mirror live", status: "Connected" }
    ],
    permissionRows: sharedPermissionRows,
    importStages: [
      { id: "modules-enabled", label: "Required Modules Enabled", complete: 6, total: 6 },
      { id: "integrations-configured", label: "Integrations Configured", complete: 5, total: 5 },
      { id: "import-completed", label: "Data Import Completed", complete: 3, total: 3 },
      { id: "users-provisioned", label: "Users Provisioned", complete: 12, total: 12 }
    ],
    checklist: [
      { id: "legal", label: "Legal Entity", detail: "Approved", tone: "complete" },
      { id: "rooftops", label: "Rooftops", detail: "2 configured", tone: "complete" },
      { id: "modules", label: "Modules", detail: "All required live", tone: "complete" },
      { id: "roles", label: "Roles", detail: "9 roles assigned", tone: "complete" },
      { id: "integrations", label: "Integrations", detail: "5 verified", tone: "complete" },
      { id: "validation", label: "Validation", detail: "Launch checks green", tone: "complete" }
    ],
    activity: [{ id: "s-1", timeLabel: "May 28, 2026 08:03 AM", detail: "Daily sync completed with no exceptions." }],
    nextSteps: ["Monitor 30-day stabilization window.", "Confirm OEM rebate packet output."]
  },
  {
    id: "pinehurst-automotive",
    name: "Pinehurst Automotive",
    dealerId: "DLR-1003",
    legalEntity: "Pinehurst Automotive Partners",
    region: "Southeast",
    status: "Active",
    groupLabel: "Northstar Dealer Group",
    integration: "CDK Global",
    goLive: "Apr 02, 2026",
    progressPercent: 91,
    rooftopCode: "RFT-10025",
    timeZone: "America/New_York",
    usersCount: 56,
    website: "pinehurstauto.com",
    locations: [
      { id: "pine-sales", label: "Pinehurst Automotive - Sales", address: "140 Harbor Ave, Charleston, SC 29401", coordinates: resolveDealerLocationCoordinates("140 Harbor Ave, Charleston, SC 29401"), status: "Live", launchReadiness: 88, moduleLabel: "Sales" },
      { id: "pine-service", label: "Pinehurst Automotive - Service", address: "140 Harbor Ave, Charleston, SC 29401", coordinates: resolveDealerLocationCoordinates("140 Harbor Ave, Charleston, SC 29401"), status: "Live", launchReadiness: 84, moduleLabel: "Service" }
    ],
    modules: [
      { id: "sales", label: "Sales", enabled: true },
      { id: "service", label: "Service", enabled: true },
      { id: "parts", label: "Parts", enabled: true },
      { id: "accounting", label: "Accounting", enabled: true },
      { id: "crm", label: "CRM", enabled: false },
      { id: "inventory", label: "Inventory", enabled: true }
    ],
    integrations: [
      { id: "cdk", label: "CDK Global", note: "Nightly bridge healthy", status: "Connected" },
      { id: "oem", label: "OEM Integrations", note: "Certificates pending renewal", status: "Warning" }
    ],
    permissionRows: sharedPermissionRows,
    importStages: [
      { id: "modules-enabled", label: "Required Modules Enabled", complete: 5, total: 6 },
      { id: "integrations-configured", label: "Integrations Configured", complete: 4, total: 5 },
      { id: "import-completed", label: "Data Import Completed", complete: 3, total: 3 },
      { id: "users-provisioned", label: "Users Provisioned", complete: 12, total: 15 }
    ],
    checklist: [
      { id: "legal", label: "Legal Entity", detail: "Approved", tone: "complete" },
      { id: "rooftops", label: "Rooftops", detail: "4 configured", tone: "complete" },
      { id: "modules", label: "Modules", detail: "CRM disabled by request", tone: "warning" },
      { id: "roles", label: "Roles", detail: "15 roles assigned", tone: "complete" },
      { id: "integrations", label: "Integrations", detail: "OEM cert renewal pending", tone: "warning" },
      { id: "validation", label: "Validation", detail: "Launch checks passed", tone: "complete" }
    ],
    activity: [{ id: "p-1", timeLabel: "May 27, 2026 01:16 PM", detail: "CRM opt-out confirmed for all rooftops." }],
    nextSteps: ["Renew OEM certificates before July feed audit."]
  },
  {
    id: "lakeside-auto-group",
    name: "Lakeside Auto Group",
    dealerId: "DLR-1004",
    legalEntity: "Lakeside Auto Group, Inc.",
    region: "Midwest",
    status: "Needs Review",
    groupLabel: "Summit Auto Group",
    integration: "AutoPro DMS",
    goLive: "-",
    progressPercent: 54,
    rooftopCode: "RFT-10026",
    timeZone: "America/Chicago",
    usersCount: 31,
    website: "lakesideauto.com",
    locations: [
      { id: "lake-sales", label: "Lakeside Auto Group - Sales", address: "600 Marina Dr, Madison, WI 53703", coordinates: resolveDealerLocationCoordinates("600 Marina Dr, Madison, WI 53703"), status: "Live", launchReadiness: 88, moduleLabel: "Sales" },
      { id: "lake-service", label: "Lakeside Auto Group - Service", address: "600 Marina Dr, Madison, WI 53703", coordinates: resolveDealerLocationCoordinates("600 Marina Dr, Madison, WI 53703"), status: "In Progress", launchReadiness: 71, moduleLabel: "Service" }
    ],
    modules: [
      { id: "sales", label: "Sales", enabled: true },
      { id: "service", label: "Service", enabled: true },
      { id: "parts", label: "Parts", enabled: false },
      { id: "accounting", label: "Accounting", enabled: true },
      { id: "crm", label: "CRM", enabled: true },
      { id: "inventory", label: "Inventory", enabled: true }
    ],
    integrations: [
      { id: "oem", label: "OEM Integrations", note: "3 feeds unmapped", status: "Warning" },
      { id: "payments", label: "Payment Processor", note: "Enrollment pending", status: "Pending" }
    ],
    permissionRows: sharedPermissionRows,
    importStages: [
      { id: "modules-enabled", label: "Required Modules Enabled", complete: 4, total: 6 },
      { id: "integrations-configured", label: "Integrations Configured", complete: 2, total: 5 },
      { id: "import-completed", label: "Data Import Completed", complete: 1, total: 3 },
      { id: "users-provisioned", label: "Users Provisioned", complete: 7, total: 14 }
    ],
    checklist: [
      { id: "legal", label: "Legal Entity", detail: "Approved", tone: "complete" },
      { id: "rooftops", label: "Rooftops", detail: "5 imported", tone: "complete" },
      { id: "modules", label: "Modules", detail: "Parts still disabled", tone: "warning" },
      { id: "roles", label: "Roles", detail: "7 roles seeded", tone: "pending" },
      { id: "integrations", label: "Integrations", detail: "Processor pending", tone: "warning" },
      { id: "validation", label: "Validation", detail: "18 blocking issues", tone: "pending" }
    ],
    activity: [{ id: "l-1", timeLabel: "May 28, 2026 11:02 AM", detail: "Validation report opened for 18 blocking setup issues." }],
    nextSteps: ["Enable Parts module for Midwest rooftop set.", "Complete processor enrollment.", "Assign role templates."]
  },
  {
    id: "metro-car-co",
    name: "Metro Car Co.",
    dealerId: "DLR-1005",
    legalEntity: "Metro Car Co.",
    region: "Midwest",
    status: "Draft",
    groupLabel: "Frontier Motors",
    integration: "-",
    goLive: "-",
    progressPercent: 22,
    rooftopCode: "RFT-10027",
    timeZone: "America/Denver",
    usersCount: 4,
    website: "metrocar.example",
    locations: [{ id: "metro-sales", label: "Metro Car Co. - Flagship", address: "12 Summit Way, Denver, CO 80202", coordinates: resolveDealerLocationCoordinates("12 Summit Way, Denver, CO 80202"), status: "Not Started", launchReadiness: 22, moduleLabel: "Sales" }],
    modules: [
      { id: "sales", label: "Sales", enabled: true },
      { id: "service", label: "Service", enabled: false },
      { id: "parts", label: "Parts", enabled: false },
      { id: "accounting", label: "Accounting", enabled: false },
      { id: "crm", label: "CRM", enabled: true },
      { id: "inventory", label: "Inventory", enabled: false }
    ],
    integrations: [
      { id: "dms", label: "DMS Platform", note: "No provider selected", status: "Not Started" },
      { id: "oem", label: "OEM Integrations", note: "Brand package not uploaded", status: "Not Started" }
    ],
    permissionRows: sharedPermissionRows,
    importStages: [
      { id: "modules-enabled", label: "Required Modules Enabled", complete: 1, total: 6 },
      { id: "integrations-configured", label: "Integrations Configured", complete: 0, total: 5 },
      { id: "import-completed", label: "Data Import Completed", complete: 0, total: 3 },
      { id: "users-provisioned", label: "Users Provisioned", complete: 1, total: 8 }
    ],
    checklist: [
      { id: "legal", label: "Legal Entity", detail: "Draft saved", tone: "complete" },
      { id: "rooftops", label: "Rooftops", detail: "1 placeholder", tone: "pending" },
      { id: "modules", label: "Modules", detail: "No bundle committed", tone: "pending" },
      { id: "roles", label: "Roles", detail: "No admins invited", tone: "pending" },
      { id: "integrations", label: "Integrations", detail: "Not started", tone: "pending" },
      { id: "validation", label: "Validation", detail: "Waiting on required fields", tone: "pending" }
    ],
    activity: [{ id: "m-1", timeLabel: "May 26, 2026 09:22 AM", detail: "Draft record created from dealer intake form." }],
    nextSteps: ["Select DMS provider.", "Invite dealer admin.", "Upload OEM brand package."]
  }
];

function getToneKey(value: DealerSetupStatus | DealerLocationStatus | DealerIntegrationStatus | DealerChecklistTone) {
  switch (value) {
    case "Active":
    case "Live":
    case "Connected":
    case "complete":
      return "positive";
    case "In Setup":
    case "In Progress":
    case "Pending":
    case "pending":
      return "warning";
    case "Needs Review":
    case "Warning":
    case "warning":
      return "alert";
    case "Draft":
    case "Not Started":
    default:
      return "neutral";
  }
}

function renderBooleanCell(value: boolean) {
  return <span className={`dealer-setup-boolean-cell${value ? " is-enabled" : ""}`}>{value ? "✓" : "-"}</span>;
}

function hasCompletedProfileField(profile: DealerProfileDraft, key: keyof DealerProfileDraft) {
  const value = profile[key];

  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

function describeOemBrands(oemBrands: string[]) {
  if (oemBrands.length === 0) {
    return "OEM brands pending";
  }

  if (oemBrands.length === oemBrandOptions.length) {
    return "All OEM brands selected";
  }

  return oemBrands.join(", ");
}

function getOnboardingStepDescription(activeStep: string | undefined) {
  switch (activeStep) {
    case "dealer-profile":
      return "Enter the enterprise profile, company IDs, and primary contact information.";
    case "stores":
      return "Assign each store its own dealer ID while keeping the larger company structure intact.";
    case "modules":
      return "Turn on the business work areas the dealership will actually run on day one, with plain-language scope for each module.";
    case "integrations":
      return "Choose which systems must connect at launch, who owns each connection, and what data each integration will sync.";
    case "users":
      return "Map real people, roles, profiles, and assigned stores so access can be provisioned correctly from the start.";
    case "billing":
      return "Build the commercial package, contract structure, billing contacts, and settlement path like a production subscription setup.";
    default:
      return "Review the full onboarding packet before saving the dealer profile.";
  }
}

function mergePersistedDealers(seedDealers: DealerRecord[], persistedDealers: DealerRecord[]) {
  if (persistedDealers.length === 0) {
    return seedDealers;
  }

  const persistedIds = new Set(persistedDealers.map((dealer) => dealer.id));

  return [...persistedDealers, ...seedDealers.filter((dealer) => !persistedIds.has(dealer.id))];
}

function toGroupId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "dealer-group";
}

function getDealerSetupMarkerColor(status: DealerLocationStatus, isSelected: boolean) {
  if (isSelected) {
    return "#ff6b3d";
  }

  switch (status) {
    case "Live":
      return "#12967b";
    case "In Progress":
      return "#f59e0b";
    case "Pending":
      return "#ef6c57";
    case "Not Started":
    default:
      return "#7d94a4";
  }
}

type DealerMapPerspective = "2d" | "3d";
type DealerMapMeasurementUnit = "miles" | "yards" | "feet" | "km";

type DealerMapRouteSummary = {
  distanceMiles: number;
  durationMinutes: number;
};

function calculateDealerMapDistanceMiles(start: DealerMapCoordinates, end: DealerMapCoordinates) {
  const earthRadiusMiles = 3958.7613;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLng = toRadians(end.lng - start.lng);
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const haversineValue =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
}

function calculateDealerMapBearing(start: DealerMapCoordinates, end: DealerMapCoordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const toDegrees = (value: number) => (value * 180) / Math.PI;
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const deltaLng = toRadians(end.lng - start.lng);
  const y = Math.sin(deltaLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function formatDealerMapDistance(distanceMiles: number, unit: DealerMapMeasurementUnit) {
  switch (unit) {
    case "yards":
      return `${Math.round(distanceMiles * 1760).toLocaleString()} yd`;
    case "feet":
      return `${Math.round(distanceMiles * 5280).toLocaleString()} ft`;
    case "km":
      return `${(distanceMiles * 1.609344).toFixed(1)} km`;
    case "miles":
    default:
      return `${distanceMiles.toFixed(1)} mi`;
  }
}

function getDealerMapBearingLabel(bearingDegrees: number) {
  const compassDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  return compassDirections[Math.round(bearingDegrees / 45) % compassDirections.length];
}

function formatDealerMapDuration(durationMinutes: number) {
  if (durationMinutes < 60) {
    return `${Math.round(durationMinutes)} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = Math.round(durationMinutes % 60);

  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function buildDealerMapMarkerIcon(color: string, isSelected: boolean) {
  return L.divIcon({
    className: "dealer-setup-map-marker-icon",
    html: `<span class="dealer-setup-map-marker-pin${isSelected ? " is-selected" : ""}" style="--dealer-map-marker:${color}"></span>`,
    iconAnchor: [10, 10],
    iconSize: [20, 20]
  });
}

const dealerMapLayerOptions: Array<{
  attribution: string;
  id: DealerMapLayerId;
  label: string;
  maxZoom?: number;
  url: string;
}> = [
  {
    id: "street",
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; OpenStreetMap contributors'
  },
  {
    id: "light",
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18
  }
];

function DealerSetupGoogleMap({
  locations,
  selectedLocationId,
  onSelectLocation
}: {
  locations: DealerMapLocation[];
  selectedLocationId?: string;
  onSelectLocation: (locationId: string) => void;
}) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerInstancesRef = useRef<Map<string, L.Marker>>(new Map());
  const measurementLineRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const measurementAnchorsRef = useRef<L.LayerGroup | null>(null);
  const coverageRingsRef = useRef<L.LayerGroup | null>(null);
  const territoryLayersRef = useRef<L.LayerGroup | null>(null);
  const routeCacheRef = useRef<Map<string, { polyline: Array<[number, number]>; summary: DealerMapRouteSummary }>>(new Map());
  const [activeMapLayer, setActiveMapLayer] = useState<DealerMapLayerId>("street");
  const [mapPerspective, setMapPerspective] = useState<DealerMapPerspective>("2d");
  const [isMapToolsVisible, setIsMapToolsVisible] = useState(false);
  const [isMeasurementMode, setIsMeasurementMode] = useState(false);
  const [measurementStartId, setMeasurementStartId] = useState<string | null>(null);
  const [measurementEndId, setMeasurementEndId] = useState<string | null>(null);
  const [measurementUnit, setMeasurementUnit] = useState<DealerMapMeasurementUnit>("miles");
  const [showCoverageRings, setShowCoverageRings] = useState(false);
  const [showGroupTerritories, setShowGroupTerritories] = useState(false);
  const [routeSummary, setRouteSummary] = useState<DealerMapRouteSummary | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const resolvedLocations = useMemo(
    () =>
      locations
        .map((location) => {
          const coordinates = location.coordinates ?? resolveDealerLocationCoordinates(location.address);

          if (!coordinates) {
            return null;
          }

          return { location, position: coordinates };
        })
        .filter((entry): entry is { location: DealerMapLocation; position: DealerMapCoordinates } => Boolean(entry)),
    [locations]
  );

  const unresolvedLocationCount = locations.length - resolvedLocations.length;
  const liveCount = locations.filter((location) => location.status === "Live").length;
  const pendingCount = locations.filter((location) => location.status === "Pending").length;
  const averageReadiness = locations.length === 0 ? 0 : Math.round(locations.reduce((total, location) => total + location.launchReadiness, 0) / locations.length);
  const selectedLayerConfig = dealerMapLayerOptions.find((layer) => layer.id === activeMapLayer) ?? dealerMapLayerOptions[0];
  const measurementStart = resolvedLocations.find(({ location }) => location.id === measurementStartId) ?? null;
  const measurementEnd = resolvedLocations.find(({ location }) => location.id === measurementEndId) ?? null;
  const measurementDistanceMiles = measurementStart && measurementEnd
    ? calculateDealerMapDistanceMiles(measurementStart.position, measurementEnd.position)
    : null;
  const measurementBearing = measurementStart && measurementEnd
    ? calculateDealerMapBearing(measurementStart.position, measurementEnd.position)
    : null;
  const territorySummaries = useMemo(() => {
    const groups = new Map<string, Array<{ location: DealerMapLocation; position: DealerMapCoordinates }>>();

    resolvedLocations.forEach((entry) => {
      const groupEntries = groups.get(entry.location.groupLabel) ?? [];
      groupEntries.push(entry);
      groups.set(entry.location.groupLabel, groupEntries);
    });

    return Array.from(groups.entries()).map(([groupLabel, entries]) => {
      const center = {
        lat: entries.reduce((total, entry) => total + entry.position.lat, 0) / entries.length,
        lng: entries.reduce((total, entry) => total + entry.position.lng, 0) / entries.length
      };
      const radiusMiles = Math.max(
        20,
        ...entries.map((entry) => calculateDealerMapDistanceMiles(center, entry.position) + 12)
      );

      return {
        center,
        groupLabel,
        locationCount: entries.length,
        radiusMiles
      };
    });
  }, [resolvedLocations]);
  const furthestSpan = useMemo(() => {
    if (resolvedLocations.length < 2) {
      return null;
    }

    let longestSpan: {
      end: DealerMapLocation;
      miles: number;
      start: DealerMapLocation;
    } | null = null;

    for (let index = 0; index < resolvedLocations.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < resolvedLocations.length; compareIndex += 1) {
        const start = resolvedLocations[index];
        const end = resolvedLocations[compareIndex];
        const miles = calculateDealerMapDistanceMiles(start.position, end.position);

        if (!longestSpan || miles > longestSpan.miles) {
          longestSpan = {
            end: end.location,
            miles,
            start: start.location
          };
        }
      }
    }

    return longestSpan;
  }, [resolvedLocations]);
  const mapMessage =
    locations.length === 0
      ? "No location records match the current filters."
      : resolvedLocations.length === 0
        ? "This live map runs without an API key, but these locations still need stored coordinates before they can be pinned."
        : unresolvedLocationCount > 0
          ? `${unresolvedLocationCount} location${unresolvedLocationCount === 1 ? "" : "s"} do not have stored coordinates yet and were left off the map.`
          : null;

  useEffect(() => {
    if (!mapNodeRef.current) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapNodeRef.current, {
        attributionControl: true,
        scrollWheelZoom: true,
        zoomControl: true
      });
      markerClusterGroupRef.current = L.markerClusterGroup({
        disableClusteringAtZoom: 9,
        maxClusterRadius: 44,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true
      });
      markerClusterGroupRef.current.addTo(mapInstanceRef.current);
    }

    return () => {
      markerInstancesRef.current.forEach((marker) => marker.remove());
      markerInstancesRef.current.clear();
      markerClusterGroupRef.current?.clearLayers();
      markerClusterGroupRef.current?.remove();
      markerClusterGroupRef.current = null;
      measurementLineRef.current?.remove();
      routeLineRef.current?.remove();
      measurementAnchorsRef.current?.remove();
      coverageRingsRef.current?.remove();
      territoryLayersRef.current?.remove();
      tileLayerRef.current?.remove();
      tileLayerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    tileLayerRef.current?.remove();
    tileLayerRef.current = L.tileLayer(selectedLayerConfig.url, {
      attribution: selectedLayerConfig.attribution,
      maxZoom: selectedLayerConfig.maxZoom ?? 19
    });
    tileLayerRef.current.addTo(mapInstanceRef.current);
  }, [selectedLayerConfig]);

  useEffect(() => {
    mapInstanceRef.current?.invalidateSize();
  }, [mapPerspective]);

  function handleMapLocationSelect(locationId: string) {
    onSelectLocation(locationId);

    if (!isMeasurementMode) {
      return;
    }

    if (!measurementStartId || measurementEndId) {
      setMeasurementStartId(locationId);
      setMeasurementEndId(null);
      return;
    }

    if (measurementStartId !== locationId) {
      setMeasurementEndId(locationId);
    }
  }

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    markerClusterGroupRef.current?.clearLayers();
    markerInstancesRef.current.clear();

    if (resolvedLocations.length === 0) {
      mapInstanceRef.current.setView([39.8283, -98.5795], 4);
      markerInstancesRef.current.clear();
      return;
    }

    const map = mapInstanceRef.current;
    const bounds = L.latLngBounds(resolvedLocations.map(({ position }) => [position.lat, position.lng] as [number, number]));

    resolvedLocations.forEach(({ location, position }) => {
      const isSelected = location.id === selectedLocationId;
      const marker = L.marker([position.lat, position.lng], {
        icon: buildDealerMapMarkerIcon(getDealerSetupMarkerColor(location.status, isSelected), isSelected)
      });

      marker.bindTooltip(`${location.label} (${location.status})`, { direction: "top" });
      marker.bindPopup(`
        <div class="dealer-setup-map-popup">
          <strong>${location.label}</strong>
          <p>${location.dealerName} • ${location.address}</p>
          <div class="dealer-setup-map-popup-meta">
            <span>${location.status}</span>
            <span>${location.launchReadiness}% readiness</span>
            <span>${location.moduleLabel}</span>
            <span>${location.groupLabel}</span>
          </div>
        </div>
      `);
      marker.on("click", () => handleMapLocationSelect(location.id));
      markerClusterGroupRef.current?.addLayer(marker);
      markerInstancesRef.current.set(location.id, marker);

      if (isSelected) {
        marker.openPopup();
      }
    });

    if (resolvedLocations.length === 1) {
      map.setView([resolvedLocations[0].position.lat, resolvedLocations[0].position.lng], 11);
      return;
    }

    map.fitBounds(bounds.pad(0.18));

    const selectedLocation = resolvedLocations.find(({ location }) => location.id === selectedLocationId);

    if (selectedLocation) {
      map.panTo([selectedLocation.position.lat, selectedLocation.position.lng]);
    }
  }, [handleMapLocationSelect, resolvedLocations, selectedLocationId]);

  useEffect(() => {
    routeLineRef.current?.remove();
    routeLineRef.current = null;
    setRouteSummary(null);
    setRouteError(null);

    if (!mapInstanceRef.current || !measurementStart || !measurementEnd) {
      setIsRouteLoading(false);
      return;
    }

    const startMeasurement = measurementStart;
    const endMeasurement = measurementEnd;

    const routeKey = [startMeasurement.location.id, endMeasurement.location.id].sort().join("::");
    const cachedRoute = routeCacheRef.current.get(routeKey);

    if (cachedRoute) {
      routeLineRef.current = L.polyline(cachedRoute.polyline, {
        color: "#12967b",
        opacity: 0.78,
        weight: 5
      });
      routeLineRef.current.addTo(mapInstanceRef.current);
      setRouteSummary(cachedRoute.summary);
      setIsRouteLoading(false);
      return;
    }

    const abortController = new AbortController();
    let didRouteRequestTimeout = false;
    const routeTimeout = window.setTimeout(() => {
      didRouteRequestTimeout = true;
      abortController.abort();
    }, 10000);

    async function loadRoute() {
      setIsRouteLoading(true);

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startMeasurement.position.lng},${startMeasurement.position.lat};${endMeasurement.position.lng},${endMeasurement.position.lat}?overview=full&geometries=geojson`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error("routing unavailable");
        }

        const payload = (await response.json()) as {
          routes?: Array<{ distance: number; duration: number; geometry: { coordinates: Array<[number, number]> } }>;
        };
        const route = payload.routes?.[0];

        if (!route) {
          throw new Error("route missing");
        }

        const polyline = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        const summary = {
          distanceMiles: route.distance / 1609.344,
          durationMinutes: route.duration / 60
        };

        routeCacheRef.current.set(routeKey, { polyline, summary });
        if (!mapInstanceRef.current || abortController.signal.aborted) {
          return;
        }

        routeLineRef.current = L.polyline(polyline, {
          color: "#12967b",
          opacity: 0.78,
          weight: 5
        });
        routeLineRef.current.addTo(mapInstanceRef.current);
        setRouteSummary(summary);
      } catch {
        if (!abortController.signal.aborted || didRouteRequestTimeout) {
          setRouteError("Drive route estimate is unavailable right now. Straight-line measurement still works.");
        }
      } finally {
        window.clearTimeout(routeTimeout);
        if (!abortController.signal.aborted) {
          setIsRouteLoading(false);
        }
      }
    }

    void loadRoute();

    return () => {
      window.clearTimeout(routeTimeout);
      abortController.abort();
    };
  }, [measurementEnd, measurementStart]);

  useEffect(() => {
    measurementLineRef.current?.remove();
    measurementLineRef.current = null;
    measurementAnchorsRef.current?.remove();
    measurementAnchorsRef.current = null;

    if (!mapInstanceRef.current || !measurementStart) {
      return;
    }

    const anchorLayers: L.Layer[] = [
      L.circleMarker([measurementStart.position.lat, measurementStart.position.lng], {
        color: "#14364f",
        fillColor: "#ffffff",
        fillOpacity: 1,
        radius: 8,
        weight: 3
      })
    ];

    if (measurementEnd) {
      anchorLayers.push(
        L.circleMarker([measurementEnd.position.lat, measurementEnd.position.lng], {
          color: "#12967b",
          fillColor: "#ffffff",
          fillOpacity: 1,
          radius: 8,
          weight: 3
        })
      );

      measurementLineRef.current = L.polyline(
        [
          [measurementStart.position.lat, measurementStart.position.lng],
          [measurementEnd.position.lat, measurementEnd.position.lng]
        ],
        {
          color: "#16364f",
          dashArray: "12 10",
          opacity: 0.82,
          weight: 4
        }
      );
      measurementLineRef.current.bindTooltip(formatDealerMapDistance(measurementDistanceMiles ?? 0, measurementUnit), {
        className: "dealer-setup-map-measure-tooltip",
        direction: "center",
        permanent: true
      });
      measurementLineRef.current.addTo(mapInstanceRef.current);
    }

    measurementAnchorsRef.current = L.layerGroup(anchorLayers);
    measurementAnchorsRef.current.addTo(mapInstanceRef.current);
  }, [measurementDistanceMiles, measurementEnd, measurementStart, measurementUnit]);

  const selectedVisibleLocation = locations.find((location) => location.id === selectedLocationId) ?? locations[0] ?? null;
  const selectedResolvedLocation = resolvedLocations.find(({ location }) => location.id === selectedVisibleLocation?.id) ?? null;
  const selectedLocationSearchUrl = selectedVisibleLocation
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(selectedVisibleLocation.address)}`
    : "https://www.openstreetmap.org";
  const measurementReadouts = measurementDistanceMiles === null
    ? []
    : [
        { label: "Miles", value: formatDealerMapDistance(measurementDistanceMiles, "miles") },
        { label: "Yards", value: formatDealerMapDistance(measurementDistanceMiles, "yards") },
        { label: "Feet", value: formatDealerMapDistance(measurementDistanceMiles, "feet") },
        { label: "Kilometers", value: formatDealerMapDistance(measurementDistanceMiles, "km") }
      ];

  useEffect(() => {
    coverageRingsRef.current?.remove();
    coverageRingsRef.current = null;

    if (!mapInstanceRef.current || !showCoverageRings || !selectedResolvedLocation) {
      return;
    }

    const ringMiles = [25, 50, 100];
    coverageRingsRef.current = L.layerGroup(
      ringMiles.map((miles, index) =>
        L.circle([selectedResolvedLocation.position.lat, selectedResolvedLocation.position.lng], {
          color: index === ringMiles.length - 1 ? "#ef6c57" : "#1d7f92",
          fillColor: index === ringMiles.length - 1 ? "#ef6c57" : "#1d7f92",
          fillOpacity: 0.03,
          radius: miles * 1609.344,
          weight: index === ringMiles.length - 1 ? 2.2 : 1.6
        }).bindTooltip(`${miles} mi ring`, {
          className: "dealer-setup-map-measure-tooltip",
          direction: "top",
          permanent: false
        })
      )
    );
    coverageRingsRef.current.addTo(mapInstanceRef.current);
  }, [selectedResolvedLocation, showCoverageRings]);

  useEffect(() => {
    territoryLayersRef.current?.remove();
    territoryLayersRef.current = null;

    if (!mapInstanceRef.current || !showGroupTerritories || territorySummaries.length === 0) {
      return;
    }

    territoryLayersRef.current = L.layerGroup(
      territorySummaries.map((territory, index) =>
        L.circle([territory.center.lat, territory.center.lng], {
          color: index % 2 === 0 ? "#6b8cff" : "#ef6c57",
          fillColor: index % 2 === 0 ? "#6b8cff" : "#ef6c57",
          fillOpacity: 0.05,
          radius: territory.radiusMiles * 1609.344,
          weight: 1.6
        }).bindTooltip(`${territory.groupLabel} • ${territory.locationCount} rooftops • ${territory.radiusMiles.toFixed(0)} mi`, {
          className: "dealer-setup-map-measure-tooltip",
          direction: "top",
          permanent: false
        })
      )
    );
    territoryLayersRef.current.addTo(mapInstanceRef.current);
  }, [showGroupTerritories, territorySummaries]);

  function fitAllLocations() {
    if (!mapInstanceRef.current || resolvedLocations.length === 0) {
      return;
    }

    if (resolvedLocations.length === 1) {
      mapInstanceRef.current.setView([resolvedLocations[0].position.lat, resolvedLocations[0].position.lng], 11);
      return;
    }

    const bounds = L.latLngBounds(resolvedLocations.map(({ position }) => [position.lat, position.lng] as [number, number]));
    mapInstanceRef.current.fitBounds(bounds.pad(0.18));
  }

  function focusSelectedLocation() {
    if (!mapInstanceRef.current || !selectedResolvedLocation) {
      return;
    }

    mapInstanceRef.current.setView([selectedResolvedLocation.position.lat, selectedResolvedLocation.position.lng], 11);
  }

  return (
    <div className="dealer-setup-google-map-shell">
      <div className="dealer-setup-google-map-quickbar" aria-label="Map quick actions">
        <span className="dealer-setup-field-caption">Quick Actions</span>
        <div className="dealer-setup-google-map-quickbar-actions">
          <button className="dealer-setup-map-quickbar-button" onClick={fitAllLocations} type="button">Fit All</button>
          <button className="dealer-setup-map-quickbar-button" disabled={!selectedResolvedLocation} onClick={focusSelectedLocation} type="button">Focus Selected</button>
          <button className={`dealer-setup-map-quickbar-button${mapPerspective === "3d" ? " is-active" : ""}`} onClick={() => setMapPerspective((current) => current === "2d" ? "3d" : "2d")} type="button">
            View {mapPerspective.toUpperCase()}
          </button>
          <button className={`dealer-setup-map-quickbar-button${activeMapLayer === "satellite" ? " is-active" : ""}`} onClick={() => setActiveMapLayer((current) => current === "satellite" ? "street" : "satellite")} type="button">
            {activeMapLayer === "satellite" ? "Satellite" : "Street"}
          </button>
          <button className={`dealer-setup-map-quickbar-button${isMapToolsVisible ? " is-active" : ""}`} onClick={() => setIsMapToolsVisible((current) => !current)} type="button">
            {isMapToolsVisible ? "Hide Tools" : "Show Tools"}
          </button>
          <button className={`dealer-setup-map-quickbar-button${isMeasurementMode ? " is-active" : ""}`} onClick={() => {
            setIsMeasurementMode((current) => !current);
            setIsMapToolsVisible(true);
          }} type="button">
            {isMeasurementMode ? "Measuring" : "Measure"}
          </button>
          <button className={`dealer-setup-map-quickbar-button${showCoverageRings ? " is-active" : ""}`} onClick={() => setShowCoverageRings((current) => !current)} type="button">
            {showCoverageRings ? "Hide Rings" : "Rings"}
          </button>
          <button className={`dealer-setup-map-quickbar-button${showGroupTerritories ? " is-active" : ""}`} onClick={() => setShowGroupTerritories((current) => !current)} type="button">
            {showGroupTerritories ? "Hide Zones" : "Zones"}
          </button>
          <a className="dealer-setup-map-quickbar-button is-link" href={selectedLocationSearchUrl} rel="noreferrer" target="_blank">Open OSM</a>
        </div>
      </div>
      <div className={`dealer-setup-google-map-stage${mapPerspective === "3d" ? " is-3d" : ""}`}>
        <div aria-label="Dealer location map" className="dealer-setup-google-map-canvas" ref={mapNodeRef} />
        {resolvedLocations.length > 0 ? (
          <div className="dealer-setup-google-map-overlay-shell">
            <div className="dealer-setup-google-map-topbar">
              <div className="dealer-setup-map-metric-strip">
                <article className="dealer-setup-map-metric-card">
                  <span>Pins Plotted</span>
                  <strong>{resolvedLocations.length}</strong>
                </article>
                <article className="dealer-setup-map-metric-card is-live">
                  <span>Live Rooftops</span>
                  <strong>{liveCount}</strong>
                </article>
                <article className="dealer-setup-map-metric-card">
                  <span>Avg Readiness</span>
                  <strong>{averageReadiness}%</strong>
                </article>
                <article className="dealer-setup-map-metric-card is-pending">
                  <span>Pending Pins</span>
                  <strong>{pendingCount}</strong>
                </article>
              </div>
              <div className="dealer-setup-map-action-row">
                <div className="dealer-setup-map-layer-toggle" role="tablist" aria-label="Map layer selector">
                  {dealerMapLayerOptions.map((layer) => (
                    <button
                      className={`dealer-setup-map-layer-button${activeMapLayer === layer.id ? " is-active" : ""}`}
                      key={layer.id}
                      onClick={() => setActiveMapLayer(layer.id)}
                      type="button"
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>
                <div className="dealer-setup-map-layer-toggle" role="tablist" aria-label="Map perspective selector">
                  {(["2d", "3d"] as const).map((mode) => (
                    <button
                      className={`dealer-setup-map-layer-button${mapPerspective === mode ? " is-active" : ""}`}
                      key={mode}
                      onClick={() => setMapPerspective(mode)}
                      type="button"
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button className={`dealer-setup-map-action-button${isMapToolsVisible ? " is-active" : ""}`} onClick={() => setIsMapToolsVisible((current) => !current)} type="button">
                  {isMapToolsVisible ? "Hide Map Tools" : "Show Map Tools"}
                </button>
                <button className={`dealer-setup-map-action-button${isMeasurementMode ? " is-active" : ""}`} onClick={() => {
                  setIsMeasurementMode((current) => !current);
                  setIsMapToolsVisible(true);
                }} type="button">
                  {isMeasurementMode ? "Measuring" : "Measure Line"}
                </button>
                <button className={`dealer-setup-map-action-button${showCoverageRings ? " is-active" : ""}`} onClick={() => setShowCoverageRings((current) => !current)} type="button">
                  {showCoverageRings ? "Hide Rings" : "Coverage Rings"}
                </button>
                <button className={`dealer-setup-map-action-button${showGroupTerritories ? " is-active" : ""}`} onClick={() => setShowGroupTerritories((current) => !current)} type="button">
                  {showGroupTerritories ? "Hide Territories" : "Dealer Territories"}
                </button>
                <div className="dealer-setup-map-layer-toggle" role="tablist" aria-label="Measurement unit selector">
                  {(["miles", "yards", "feet", "km"] as const).map((unit) => (
                    <button
                      className={`dealer-setup-map-layer-button${measurementUnit === unit ? " is-active" : ""}`}
                      key={unit}
                      onClick={() => setMeasurementUnit(unit)}
                      type="button"
                    >
                      {unit === "miles" ? "Mi" : unit === "yards" ? "Yd" : unit === "feet" ? "Ft" : "Km"}
                    </button>
                  ))}
                </div>
                <button
                  className="dealer-setup-map-action-button"
                  disabled={!measurementStartId && !measurementEndId}
                  onClick={() => {
                    setMeasurementStartId(null);
                    setMeasurementEndId(null);
                    setRouteSummary(null);
                    setRouteError(null);
                  }}
                  type="button"
                >
                  Clear Measure
                </button>
                <button className="dealer-setup-map-action-button" onClick={fitAllLocations} type="button">Fit All</button>
                <button className="dealer-setup-map-action-button" disabled={!selectedResolvedLocation} onClick={focusSelectedLocation} type="button">Focus Selected</button>
                <a className="dealer-setup-map-action-button is-link" href={selectedLocationSearchUrl} rel="noreferrer" target="_blank">Open In OSM</a>
              </div>
            </div>

            {selectedVisibleLocation ? (
              <div className="dealer-setup-google-map-spotlight">
                <div className="dealer-setup-google-map-spotlight-header">
                  <div>
                    <span className="dealer-setup-field-caption">Selected Rooftop</span>
                    <strong>{selectedVisibleLocation.label}</strong>
                  </div>
                  <span className={`dealer-setup-status-chip tone-${getToneKey(selectedVisibleLocation.status)}`}>{selectedVisibleLocation.status}</span>
                </div>
                <p>{selectedVisibleLocation.address}</p>
                <div className="dealer-setup-map-spotlight-metadata">
                  <span>{selectedVisibleLocation.dealerName}</span>
                  <span><strong>{selectedVisibleLocation.launchReadiness}%</strong> launch readiness</span>
                  <span>{selectedVisibleLocation.moduleLabel}</span>
                  {selectedVisibleLocation.locationType ? <span>{selectedVisibleLocation.locationType}</span> : null}
                  {selectedVisibleLocation.storeCode ? <span>{selectedVisibleLocation.storeCode}</span> : null}
                </div>
              </div>
            ) : null}

            {resolvedLocations.length > 1 && isMapToolsVisible ? (
              <div className="dealer-setup-google-map-measure-card">
                <div className="dealer-setup-google-map-spotlight-header">
                  <div>
                    <span className="dealer-setup-field-caption">Line Measurement</span>
                    <strong>{measurementDistanceMiles === null ? "Pick two rooftops" : formatDealerMapDistance(measurementDistanceMiles, measurementUnit)}</strong>
                  </div>
                  {measurementBearing !== null ? <span className="dealer-setup-status-chip tone-complete">{getDealerMapBearingLabel(measurementBearing)} {Math.round(measurementBearing)}°</span> : null}
                </div>
                <p>
                  {measurementDistanceMiles === null
                    ? isMeasurementMode
                      ? measurementStart
                        ? `${measurementStart.location.label} locked. Pick a second rooftop to finish the line.`
                        : "Measurement mode is armed. Click two dealership points to draw a line and compute distance in miles, yards, feet, and kilometers."
                      : "Turn on Measure Line to draw a point-to-point span between any two dealership rooftops."
                    : `${measurementStart?.location.label ?? "Start"} to ${measurementEnd?.location.label ?? "End"}`}
                </p>
                <div className="dealer-setup-map-measure-readouts">
                  {measurementReadouts.length > 0 ? (
                    measurementReadouts.map((readout) => (
                      <span key={readout.label}><strong>{readout.value}</strong> {readout.label}</span>
                    ))
                  ) : furthestSpan ? (
                    <span><strong>{formatDealerMapDistance(furthestSpan.miles, "miles")}</strong> Furthest network span</span>
                  ) : null}
                </div>
                {furthestSpan ? (
                  <div className="dealer-setup-map-measure-footer">
                    <span>Longest span</span>
                    <strong>{furthestSpan.start.label} to {furthestSpan.end.label}</strong>
                  </div>
                ) : null}
                <div className="dealer-setup-map-route-summary">
                  <span>Drive route</span>
                  <strong>
                    {isRouteLoading
                      ? "Calculating route..."
                      : routeSummary
                        ? `${routeSummary.distanceMiles.toFixed(1)} mi · ${formatDealerMapDuration(routeSummary.durationMinutes)}`
                        : routeError ?? "Pick two rooftops to fetch a drive route estimate."}
                  </strong>
                </div>
                <div className="dealer-setup-map-route-summary">
                  <span>Territory overlay</span>
                  <strong>{showGroupTerritories ? `${territorySummaries.length} dealer groups active` : "Dealer group territories hidden"}</strong>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {resolvedLocations.length === 0 ? (
          <div className="dealer-setup-google-map-empty-state">
            <strong>Stored coordinates required</strong>
            <p>This map runs without any API key. Add lat/lng to each rooftop record to place live dots here.</p>
            <a className="dealer-setup-map-link" href={selectedLocationSearchUrl} rel="noreferrer" target="_blank">Open selected location in OpenStreetMap</a>
          </div>
        ) : null}
      </div>
      {mapMessage ? <p className={`dealer-setup-google-map-note${resolvedLocations.length > 0 ? " is-warning" : ""}`}>{mapMessage}</p> : null}
      <div className="dealer-setup-map-legend" aria-label="Map status legend">
        {["Live", "In Progress", "Pending", "Not Started"].map((status) => (
          <span className="dealer-setup-map-legend-item" key={status}>
            <span className="dealer-setup-map-legend-dot" style={{ background: getDealerSetupMarkerColor(status as DealerLocationStatus, false) }} />
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DealerSetupWorkspaceProps {
  storeId: string;
  storeName: string;
}

type DealerHierarchyGroup = {
  dealers: DealerRecord[];
  id: string;
  label: string;
  sortOrder: number;
};

export function DealerSetupWorkspace({ storeId, storeName }: DealerSetupWorkspaceProps) {
  const [dealers, setDealers] = useState<DealerRecord[]>(dealerSetupRows);
  const [selectedDealerId, setSelectedDealerId] = useState(dealerSetupRows[0]?.id ?? "");
  const [selectedLocationId, setSelectedLocationId] = useState(dealerSetupRows[0]?.locations[1]?.id ?? dealerSetupRows[0]?.locations[0]?.id ?? "");
  const [hierarchySearchTerm, setHierarchySearchTerm] = useState("");
  const [expandedHierarchyGroupIds, setExpandedHierarchyGroupIds] = useState<string[]>([]);
  const [locationSearchTerm, setLocationSearchTerm] = useState("");
  const [locationStatusFilter, setLocationStatusFilter] = useState("All Status");
  const [locationModuleFilter, setLocationModuleFilter] = useState("All Modules");
  const [centerView, setCenterView] = useState<DealerCenterView>("locations");
  const [activeDetailTab, setActiveDetailTab] = useState<DealerDetailTab>("permissions");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [statusNotice, setStatusNotice] = useState("Dealer Setup is running in mock mode. The page is intentionally styled like a live dealer network configuration console.");
  const [profileDraft, setProfileDraft] = useState<DealerProfileDraft>(initialProfileDraft);
  const [storeDrafts, setStoreDrafts] = useState<DealerStoreDraft[]>(initialStoreDrafts);
  const [collapsedStoreDraftIds, setCollapsedStoreDraftIds] = useState<string[]>([]);
  const [moduleSelection, setModuleSelection] = useState<string[]>(initialModuleSelection);
  const [integrationSelection, setIntegrationSelection] = useState<string[]>(initialIntegrationSelection);
  const [userSeats, setUserSeats] = useState<DealerUserSeatDraft[]>(initialUserSeats);
  const [collapsedUserSeatIds, setCollapsedUserSeatIds] = useState<string[]>([]);
  const [billingDraft, setBillingDraft] = useState<DealerBillingDraft>(initialBillingDraft);
  const [isHydratingDealers, setIsHydratingDealers] = useState(true);
  const [isSavingDealer, setIsSavingDealer] = useState(false);

  const dealerById = useMemo(() => Object.fromEntries(dealers.map((dealer) => [dealer.id, dealer])) as Record<string, DealerRecord>, [dealers]);
  const selectedDealer = dealerById[selectedDealerId] ?? dealers[0] ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadPersistedDealers() {
      setIsHydratingDealers(true);

      try {
        const payload = await getDealerSetupPersistedDealers<DealerRecord>(storeId);

        if (!isActive) {
          return;
        }

        const nextDealers = mergePersistedDealers(dealerSetupRows, payload.dealers);

        setDealers(nextDealers);
        setSelectedDealerId((current) => (nextDealers.some((dealer) => dealer.id === current) ? current : nextDealers[0]?.id ?? ""));
        setStatusNotice(
          payload.dealers.length > 0
            ? `Dealer Setup loaded ${payload.dealers.length} persisted onboarded dealer${payload.dealers.length === 1 ? "" : "s"} for ${storeName}. Seed network rows remain available alongside API-backed entries.`
            : "Dealer Setup is seeded with baseline network data. Newly onboarded dealers now persist through the API for this store."
        );
      } catch {
        if (!isActive) {
          return;
        }

        setStatusNotice("Dealer Setup API could not be reached. Seeded network rows are still available, but newly onboarded dealers will not persist until the API is available.");
      } finally {
        if (isActive) {
          setIsHydratingDealers(false);
        }
      }
    }

    void loadPersistedDealers();

    return () => {
      isActive = false;
    };
  }, [storeId, storeName]);

  useEffect(() => {
    if (selectedDealerId || dealers.length === 0) {
      return;
    }

    setSelectedDealerId(dealers[0]?.id ?? "");
  }, [dealers, selectedDealerId]);

  useEffect(() => {
    if (!selectedDealer) {
      return;
    }

    if (selectedDealer.locations.some((location) => location.id === selectedLocationId)) {
      return;
    }

    setSelectedLocationId(selectedDealer.locations[0]?.id ?? "");
  }, [selectedDealer, selectedLocationId]);

  const selectedLocation = selectedDealer?.locations.find((location) => location.id === selectedLocationId) ?? selectedDealer?.locations[0] ?? null;
  const hierarchyGroups = useMemo<DealerHierarchyGroup[]>(() => {
    const normalizedSearch = hierarchySearchTerm.trim().toLowerCase();
    const preferredGroupOrder = new Map(dealerGroups.map((group, index) => [group.label, index]));
    const groupedDealers = dealers.reduce<Map<string, DealerRecord[]>>((groups, dealer) => {
      const key = dealer.groupLabel || "Ungrouped Dealers";
      const existingGroup = groups.get(key) ?? [];

      existingGroup.push(dealer);
      groups.set(key, existingGroup);

      return groups;
    }, new Map());

    return Array.from(groupedDealers.entries())
      .map(([label, groupedRows]) => {
        const visibleDealers = groupedRows.filter((dealer) => {
          if (normalizedSearch.length === 0) {
            return true;
          }

          return (
            dealer.name.toLowerCase().includes(normalizedSearch) ||
            dealer.dealerId.toLowerCase().includes(normalizedSearch) ||
            (dealer.companyId ?? "").toLowerCase().includes(normalizedSearch) ||
            dealer.locations.some((location) => location.label.toLowerCase().includes(normalizedSearch))
          );
        });

        if (normalizedSearch.length > 0 && !label.toLowerCase().includes(normalizedSearch) && visibleDealers.length === 0) {
          return null;
        }

        return {
          id: toGroupId(label),
          label,
          dealers: visibleDealers,
          sortOrder: preferredGroupOrder.get(label) ?? Number.MAX_SAFE_INTEGER
        };
      })
      .filter((group): group is DealerHierarchyGroup => Boolean(group))
      .sort((left, right) => (left.sortOrder === right.sortOrder ? left.label.localeCompare(right.label) : left.sortOrder - right.sortOrder));
  }, [dealers, hierarchySearchTerm]);

  useEffect(() => {
    if (hierarchyGroups.length === 0) {
      setExpandedHierarchyGroupIds((current) => (current.length === 0 ? current : []));
      return;
    }

    const selectedGroupId = selectedDealer ? toGroupId(selectedDealer.groupLabel || "Ungrouped Dealers") : hierarchyGroups[0]?.id;

    setExpandedHierarchyGroupIds((current) => {
      const validGroupIds = current.filter((groupId) => hierarchyGroups.some((group) => group.id === groupId));

      if (validGroupIds.length === 0) {
        return selectedGroupId ? [selectedGroupId] : [hierarchyGroups[0].id];
      }

      if (selectedGroupId && !validGroupIds.includes(selectedGroupId)) {
        return [...validGroupIds, selectedGroupId];
      }

      if (validGroupIds.length === current.length && validGroupIds.every((groupId, index) => groupId === current[index])) {
        return current;
      }

      return validGroupIds;
    });
  }, [hierarchyGroups, selectedDealer]);

  const visibleLocations = useMemo(() => {
    if (!selectedDealer) {
      return [];
    }

    const normalizedSearch = locationSearchTerm.trim().toLowerCase();

    return selectedDealer.locations.filter((location) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        location.label.toLowerCase().includes(normalizedSearch) ||
        location.address.toLowerCase().includes(normalizedSearch);
      const matchesStatus = locationStatusFilter === "All Status" || location.status === locationStatusFilter;
      const matchesModule = locationModuleFilter === "All Modules" || location.moduleLabel === locationModuleFilter;

      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [locationModuleFilter, locationSearchTerm, locationStatusFilter, selectedDealer]);

  const allDealerMapLocations = useMemo<DealerMapLocation[]>(
    () =>
      dealers.flatMap((dealer) =>
        dealer.locations.map((location) => ({
          ...location,
          dealerName: dealer.name,
          dealerRecordId: dealer.id,
          groupLabel: dealer.groupLabel,
          rooftopCode: dealer.rooftopCode
        }))
      ),
    [dealers]
  );

  const visibleMapLocations = useMemo(() => {
    const normalizedSearch = locationSearchTerm.trim().toLowerCase();

    return allDealerMapLocations.filter((location) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        location.label.toLowerCase().includes(normalizedSearch) ||
        location.address.toLowerCase().includes(normalizedSearch) ||
        location.dealerName.toLowerCase().includes(normalizedSearch) ||
        location.groupLabel.toLowerCase().includes(normalizedSearch) ||
        location.rooftopCode.toLowerCase().includes(normalizedSearch);
      const matchesStatus = locationStatusFilter === "All Status" || location.status === locationStatusFilter;
      const matchesModule = locationModuleFilter === "All Modules" || location.moduleLabel === locationModuleFilter;

      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [allDealerMapLocations, locationModuleFilter, locationSearchTerm, locationStatusFilter]);

  const locationModuleOptions = useMemo(
    () => [
      "All Modules",
      ...new Set((centerView === "map" ? allDealerMapLocations : selectedDealer?.locations ?? []).map((location) => location.moduleLabel))
    ],
    [allDealerMapLocations, centerView, selectedDealer]
  );
  const isHierarchySearchActive = hierarchySearchTerm.trim().length > 0;
  const locationStatusOptions = ["All Status", "Live", "In Progress", "Pending", "Not Started"];
  const visibleMapDealerCount = new Set(visibleMapLocations.map((location) => location.dealerRecordId)).size;
  const totalDealers = dealers.length;
  const rooftopsCount = dealers.reduce((total, dealer) => total + dealer.locations.length, 0);
  const usersCount = dealers.reduce((total, dealer) => total + dealer.usersCount, 0);
  const inSetupDealerCount = dealers.filter((dealer) => dealer.status === "In Setup").length;
  const averageReadiness = totalDealers === 0 ? 0 : Math.round(dealers.reduce((total, dealer) => total + dealer.progressPercent, 0) / totalDealers);
  const activeDealerCount = dealers.filter((dealer) => dealer.status === "Active").length;
  const onboardingProgressPercent = Math.round(((activeStepIndex + 1) / onboardingSteps.length) * 100);
  const completedRequiredFieldCount = requiredProfileFields.filter(({ key }) => hasCompletedProfileField(profileDraft, key)).length;
  const connectedSystemsCount = integrationSelection.length;
  const configuredStoreCount = storeDrafts.filter((store) => store.storeName.trim().length > 0 && store.storeDealerId.trim().length > 0).length;
  const configuredUserSeatCount = userSeats.filter(
    (seat) => seat.fullName.trim().length > 0 && seat.email.trim().length > 0 && seat.role.trim().length > 0
  ).length;
  const selectedBillingAddOns = dealerBillingAddOns.filter((addOn) => billingDraft.selectedAddOnIds.includes(addOn.id));
  const selectedModuleBlueprints = moduleBlueprints.filter((module) => moduleSelection.includes(module.id));
  const selectedIntegrationBlueprints = integrationBlueprints.filter((integration) => integrationSelection.includes(integration.id));
  const baseMonthlyPerStore = Number.parseInt(billingDraft.baseMonthlyPerStore, 10) || 5000;
  const addOnMonthlyPerStore = selectedBillingAddOns.reduce((total, addOn) => total + addOn.monthlyPerStore, 0);
  const estimatedMonthlyTotal = configuredStoreCount * (baseMonthlyPerStore + addOnMonthlyPerStore);

  function handleSelectLocation(locationId: string) {
    const selectedMapLocation = allDealerMapLocations.find((location) => location.id === locationId);

    if (selectedMapLocation && selectedMapLocation.dealerRecordId !== selectedDealerId) {
      setSelectedDealerId(selectedMapLocation.dealerRecordId);
    }

    setSelectedLocationId(locationId);
  }

  function openOnboarding() {
    setIsOnboardingOpen(true);
    setActiveStepIndex(0);
    setStatusNotice("New dealer onboarding opened with the guided setup workflow.");
  }

  function closeOnboarding() {
    setIsOnboardingOpen(false);
    setStatusNotice("Dealer onboarding minimized. Existing setup progress remains saved locally.");
  }

  function updateProfileField(field: keyof DealerProfileDraft, value: string | string[]) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleAllOemBrands() {
    setProfileDraft((current) => ({
      ...current,
      oemBrands: current.oemBrands.length === oemBrandOptions.length ? [] : [...oemBrandOptions]
    }));
  }

  function toggleOemBrand(brand: string) {
    setProfileDraft((current) => ({
      ...current,
      oemBrands: current.oemBrands.includes(brand)
        ? current.oemBrands.filter((entry) => entry !== brand)
        : [...current.oemBrands, brand]
    }));
  }

  function updateStoreDraft(index: number, field: keyof DealerStoreDraft, value: string) {
    setStoreDrafts((current) => current.map((store, storeIndex) => (storeIndex === index ? { ...store, [field]: value } : store)));
  }

  function addStoreDraft() {
    setStoreDrafts((current) => [
      ...current,
      {
        id: `store-${current.length + 1}`,
        storeName: "",
        storeCode: "",
        storeDealerId: "",
        operatingCompany: profileDraft.parentCompanyName || "",
        portfolioLabel: "",
        manager: "",
        street: "",
        city: "",
        state: "",
        locationType: "Retail location"
      }
    ]);
  }

  function toggleStoreDraftCollapse(storeId: string) {
    setCollapsedStoreDraftIds((current) =>
      current.includes(storeId) ? current.filter((entry) => entry !== storeId) : [...current, storeId]
    );
  }

  function removeStoreDraft(index: number) {
    setCollapsedStoreDraftIds((current) => current.filter((entry) => entry !== storeDrafts[index]?.id));
    setStoreDrafts((current) => (current.length === 1 ? current : current.filter((_, storeIndex) => storeIndex !== index)));
  }

  function updateUserSeat(index: number, field: keyof DealerUserSeatDraft, value: string) {
    setUserSeats((current) => current.map((seat, seatIndex) => (seatIndex === index ? { ...seat, [field]: value } : seat)));
  }

  function addUserSeat() {
    setUserSeats((current) => [
      ...current,
      {
        id: `user-${current.length + 1}`,
        fullName: "",
        email: "",
        role: "",
        profile: "User",
        assignedStoreId: storeDrafts[0]?.id ?? "",
        phone: ""
      }
    ]);
  }

  function toggleUserSeatCollapse(seatId: string) {
    setCollapsedUserSeatIds((current) =>
      current.includes(seatId) ? current.filter((entry) => entry !== seatId) : [...current, seatId]
    );
  }

  function removeUserSeat(index: number) {
    setCollapsedUserSeatIds((current) => current.filter((entry) => entry !== userSeats[index]?.id));
    setUserSeats((current) => (current.length === 1 ? current : current.filter((_, seatIndex) => seatIndex !== index)));
  }

  function updateBillingField(field: keyof DealerBillingDraft, value: string | string[]) {
    setBillingDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleBillingAddOn(addOnId: string) {
    setBillingDraft((current) => ({
      ...current,
      selectedAddOnIds: current.selectedAddOnIds.includes(addOnId)
        ? current.selectedAddOnIds.filter((entry) => entry !== addOnId)
        : [...current.selectedAddOnIds, addOnId]
    }));
  }

  function toggleModule(moduleId: string) {
    setModuleSelection((current) =>
      current.includes(moduleId) ? current.filter((entry) => entry !== moduleId) : [...current, moduleId]
    );
  }

  function toggleIntegration(integrationId: string) {
    setIntegrationSelection((current) =>
      current.includes(integrationId) ? current.filter((entry) => entry !== integrationId) : [...current, integrationId]
    );
  }

  function saveDraft() {
    setStatusNotice("Dealer draft saved locally. Backend persistence can be layered on later.");
  }

  async function continueOnboarding() {
    if (activeStepIndex < onboardingSteps.length - 1) {
      setActiveStepIndex((current) => current + 1);
      setStatusNotice(`${onboardingSteps[Math.min(activeStepIndex + 1, onboardingSteps.length - 1)].label} is ready for review.`);
      return;
    }

    if (isSavingDealer) {
      return;
    }

    const configuredStores = storeDrafts.filter((store) => store.storeName.trim().length > 0 && store.storeDealerId.trim().length > 0);
    const seededUsers = userSeats.filter(
      (seat) => seat.fullName.trim().length > 0 && seat.email.trim().length > 0 && seat.role.trim().length > 0
    );
    const primaryStore = configuredStores[0] ?? storeDrafts[0];
    const subscriptionLabel = `${configuredStores.length || 1} stores • $${estimatedMonthlyTotal.toLocaleString()}/month`;
    const selectedAddOnLabels = selectedBillingAddOns.map((addOn) => addOn.label);
    const locationIdByDraftId = new Map<string, string>();

    const newDealer: DealerRecord = {
      id: (profileDraft.companyId || primaryStore.storeDealerId || profileDraft.dealerCode).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: profileDraft.dbaName || profileDraft.legalDealerName,
      dealerId: profileDraft.companyId,
      companyId: profileDraft.companyId,
      companyCode: profileDraft.dealerCode,
      corporateBillingEmail: profileDraft.corporateBillingEmail,
      enterpriseGroupId: profileDraft.enterpriseGroupId,
      enterpriseGroupName: profileDraft.enterpriseGroupName,
      legalEntity: profileDraft.legalDealerName,
      region: "South",
      status: "In Setup",
      groupLabel: profileDraft.enterpriseGroupName,
      integration: integrationSelection.includes("dms") ? "AutoPro DMS" : "-",
      goLive: "-",
      oemBrands: profileDraft.oemBrands,
      parentCompanyName: profileDraft.parentCompanyName,
      progressPercent: 22,
      rooftopCode: primaryStore.storeDealerId || profileDraft.dealerCode,
      storeType: profileDraft.storeType,
      timeZone: profileDraft.timeZone,
      usersCount: seededUsers.length,
      website: profileDraft.website,
      locations: configuredStores.map((store, index) => {
        const locationId = `${(store.storeDealerId || store.storeCode || `store-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const address = `${store.street}, ${store.city}, ${store.state}`;

        locationIdByDraftId.set(store.id, locationId);

        return {
          id: locationId,
          label: store.storeName,
          address,
          coordinates: resolveDealerLocationCoordinates(address),
          status: index === 0 ? "In Progress" : "Pending",
          launchReadiness: index === 0 ? 24 : 14,
          moduleLabel: store.operatingCompany || "Operations",
          storeDealerId: store.storeDealerId,
          storeCode: store.storeCode,
          operatingCompany: store.operatingCompany,
          manager: store.manager,
          locationType: store.locationType,
          portfolioLabel: store.portfolioLabel
        };
      }),
      modules: [
        { id: "sales", label: "Sales", enabled: moduleSelection.includes("sales") },
        { id: "service", label: "Service", enabled: moduleSelection.includes("service") },
        { id: "parts", label: "Parts", enabled: moduleSelection.includes("parts") },
        { id: "accounting", label: "Accounting", enabled: moduleSelection.includes("accounting") },
        { id: "crm", label: "CRM", enabled: moduleSelection.includes("crm") },
        { id: "inventory", label: "Inventory", enabled: moduleSelection.includes("inventory") }
      ],
      integrations: [
        { id: "dms", label: "DMS", note: integrationSelection.includes("dms") ? "Provider selected" : "Provider pending", status: integrationSelection.includes("dms") ? "Connected" : "Pending" },
        { id: "fi", label: "F&I", note: integrationSelection.includes("f&i") ? "Package linked" : "Awaiting setup", status: integrationSelection.includes("f&i") ? "Connected" : "Pending" },
        { id: "accounting", label: "Accounting", note: integrationSelection.includes("accounting") ? "Chart mapping ready" : "Awaiting mapping", status: integrationSelection.includes("accounting") ? "Connected" : "Pending" },
        { id: "marketing", label: "Marketing", note: integrationSelection.includes("marketing") ? "Lead handoff prepared" : "Optional", status: integrationSelection.includes("marketing") ? "Connected" : "Pending" }
      ],
      permissionRows: sharedPermissionRows,
      billing: {
        achCompanyName: billingDraft.achCompanyName,
        achRoutingLast4: billingDraft.achRoutingLast4,
        addOnLabels: selectedAddOnLabels,
        baseMonthlyPerStore,
        billingContactName: billingDraft.billingContactName,
        billingPhone: billingDraft.billingPhone,
        billingCadence: billingDraft.billingCadence,
        contractStartDate: billingDraft.contractStartDate,
        contractTermMonths: billingDraft.contractTermMonths,
        estimatedMonthlyTotal,
        invoiceEmail: billingDraft.invoiceEmail,
        invoiceDelivery: billingDraft.invoiceDelivery,
        notes: billingDraft.notes,
        paymentMethod: billingDraft.paymentMethod,
        paymentTerms: billingDraft.paymentTerms
      },
      importStages: [
        { id: "modules-enabled", label: "Required Modules Enabled", complete: Math.min(moduleSelection.length, 6), total: 6 },
        { id: "integrations-configured", label: "Integrations Configured", complete: integrationSelection.length, total: 5 },
        { id: "import-completed", label: "Data Import Completed", complete: 0, total: 3 },
        { id: "users-provisioned", label: "Users Provisioned", complete: seededUsers.length, total: Math.max(seededUsers.length, configuredStores.length * 4, 4) }
      ],
      userSeats: seededUsers.map((seat) => ({
        id: seat.id,
        fullName: seat.fullName,
        email: seat.email,
        role: seat.role,
        profile: seat.profile,
        phone: seat.phone,
        assignedStoreId: locationIdByDraftId.get(seat.assignedStoreId) ?? locationIdByDraftId.get(configuredStores[0]?.id ?? "") ?? "",
        assignedStoreLabel:
          configuredStores.find((store) => store.id === seat.assignedStoreId)?.storeName ??
          configuredStores[0]?.storeName ??
          "Primary store"
      })),
      checklist: [
        { id: "legal", label: "Legal Entity", detail: profileDraft.legalDealerName, tone: "complete" },
        { id: "rooftops", label: "Rooftops", detail: `${configuredStores.length} store dealer IDs assigned`, tone: configuredStores.length > 0 ? "warning" : "pending" },
        { id: "modules", label: "Modules", detail: `${moduleSelection.length} enabled`, tone: "warning" },
        { id: "roles", label: "Users", detail: `${seededUsers.length} profiled users`, tone: seededUsers.length > 0 ? "warning" : "pending" },
        { id: "integrations", label: "Integrations", detail: `${integrationSelection.length} connected`, tone: "warning" },
        { id: "validation", label: "Commercial Plan", detail: subscriptionLabel, tone: "complete" }
      ],
      activity: [
        {
          id: "draft-1",
          timeLabel: "Just now",
          detail: `Dealer onboarding draft created for ${configuredStores.length || 1} stores with ${seededUsers.length} user seats and ${billingDraft.paymentMethod} billing.`
        }
      ],
      nextSteps: [
        `Confirm ${billingDraft.paymentMethod} billing for ${billingDraft.invoiceEmail || billingDraft.achCompanyName}.`,
        selectedAddOnLabels.includes("API Keys") ? "Generate and secure API credentials." : "Decide whether API Keys are needed for dealer integrations.",
        "Assign store-level permissions and finish launch validation."
      ]
    };

    try {
      setIsSavingDealer(true);
      const payload = await createDealerSetupDealer(storeId, { dealer: newDealer });

      setDealers((current) => mergePersistedDealers(current, [payload.dealer]));
      setSelectedDealerId(payload.dealer.id);
      setSelectedLocationId(payload.dealer.locations[0]?.id ?? "");
      setIsOnboardingOpen(false);
      setStatusNotice(payload.message);
    } catch (error) {
      setStatusNotice(error instanceof Error ? error.message : "Dealer onboarding could not be saved.");
    } finally {
      setIsSavingDealer(false);
    }
  }

  function goBackOnboarding() {
    if (activeStepIndex === 0) {
      closeOnboarding();
      return;
    }

    setActiveStepIndex((current) => Math.max(0, current - 1));
  }

  function renderOnboardingStep() {
    const activeStep = onboardingSteps[activeStepIndex]?.id;
    const onboardingStoreOptions = storeDrafts.map((store, index) => ({
      id: store.id,
      label: store.storeName || store.storeCode || `Store ${index + 1}`
    }));

    if (activeStep === "dealer-profile") {
      return (
        <div className="dealer-setup-onboarding-form-grid">
          <label className="dealer-setup-field">
            <span>Enterprise Group Name</span>
            <input onChange={(event) => updateProfileField("enterpriseGroupName", event.target.value)} value={profileDraft.enterpriseGroupName} />
          </label>
          <label className="dealer-setup-field">
            <span>Enterprise Group ID</span>
            <input onChange={(event) => updateProfileField("enterpriseGroupId", event.target.value)} value={profileDraft.enterpriseGroupId} />
          </label>
          <label className="dealer-setup-field">
            <span>Primary Operating Company</span>
            <input onChange={(event) => updateProfileField("parentCompanyName", event.target.value)} value={profileDraft.parentCompanyName} />
          </label>
          <label className="dealer-setup-field">
            <span>Company ID</span>
            <input onChange={(event) => updateProfileField("companyId", event.target.value)} value={profileDraft.companyId} />
          </label>
          <label className="dealer-setup-field">
            <span>Legal Dealer Name</span>
            <input onChange={(event) => updateProfileField("legalDealerName", event.target.value)} value={profileDraft.legalDealerName} />
          </label>
          <label className="dealer-setup-field">
            <span>Primary Contact Name</span>
            <input onChange={(event) => updateProfileField("contactName", event.target.value)} value={profileDraft.contactName} />
          </label>
          <label className="dealer-setup-field">
            <span>DBA Name</span>
            <input onChange={(event) => updateProfileField("dbaName", event.target.value)} value={profileDraft.dbaName} />
          </label>
          <label className="dealer-setup-field">
            <span>Primary Contact Email</span>
            <input onChange={(event) => updateProfileField("contactEmail", event.target.value)} value={profileDraft.contactEmail} />
          </label>
          <label className="dealer-setup-field">
            <span>Company Code</span>
            <input onChange={(event) => updateProfileField("dealerCode", event.target.value)} value={profileDraft.dealerCode} />
          </label>
          <label className="dealer-setup-field">
            <span>Primary Contact Phone</span>
            <input onChange={(event) => updateProfileField("contactPhone", event.target.value)} value={profileDraft.contactPhone} />
          </label>
          <label className="dealer-setup-field">
            <span>Billing Contact Email</span>
            <input onChange={(event) => updateProfileField("corporateBillingEmail", event.target.value)} value={profileDraft.corporateBillingEmail} />
          </label>
          <div className="dealer-setup-field dealer-setup-field-span-2">
            <div className="dealer-setup-field-header-row">
              <span>OEM Brand</span>
              <button className="dealer-setup-ghost-button" onClick={toggleAllOemBrands} type="button">
                {profileDraft.oemBrands.length === oemBrandOptions.length ? "Clear All" : "Select All Brands"}
              </button>
            </div>
            <div className="dealer-setup-checkbox-grid">
              {oemBrandOptions.map((brand) => (
                <label className={`dealer-setup-checkbox-card${profileDraft.oemBrands.includes(brand) ? " is-active" : ""}`} key={brand}>
                  <input checked={profileDraft.oemBrands.includes(brand)} onChange={() => toggleOemBrand(brand)} type="checkbox" />
                  <span>{brand}</span>
                </label>
              ))}
            </div>
            <p className="dealer-setup-field-caption">{describeOemBrands(profileDraft.oemBrands)}</p>
          </div>
          <label className="dealer-setup-field">
            <span>Tax ID</span>
            <input onChange={(event) => updateProfileField("taxId", event.target.value)} value={profileDraft.taxId} />
          </label>
          <label className="dealer-setup-field">
            <span>Time Zone</span>
            <select onChange={(event) => updateProfileField("timeZone", event.target.value)} value={profileDraft.timeZone}>
              <option>Eastern Time (US & Canada)</option>
              <option>Central Time (US & Canada)</option>
              <option>Mountain Time (US & Canada)</option>
              <option>Pacific Time (US & Canada)</option>
            </select>
          </label>
          <label className="dealer-setup-field">
            <span>Portfolio Mode</span>
            <select onChange={(event) => updateProfileField("portfolioMode", event.target.value)} value={profileDraft.portfolioMode}>
              <option>Combined enterprise</option>
              <option>Multi-store company</option>
              <option>Single dealer</option>
            </select>
          </label>
          <label className="dealer-setup-field">
            <span>Address</span>
            <input onChange={(event) => updateProfileField("address", event.target.value)} value={profileDraft.address} />
          </label>
          <label className="dealer-setup-field">
            <span>Store Type</span>
            <select onChange={(event) => updateProfileField("storeType", event.target.value)} value={profileDraft.storeType}>
              <option>Multi-store marine group</option>
              <option>Franchise</option>
              <option>Independent</option>
              <option>Marine Group</option>
            </select>
          </label>
          <label className="dealer-setup-field">
            <span>Website</span>
            <input onChange={(event) => updateProfileField("website", event.target.value)} value={profileDraft.website} />
          </label>
        </div>
      );
    }

    if (activeStep === "stores") {
      return (
        <div className="dealer-setup-onboarding-stack">
          <div className="dealer-setup-inline-action-row">
            <button className="dealer-setup-secondary-button" onClick={addStoreDraft} type="button">Add Store</button>
            <span>Each store keeps its own dealer ID while still rolling up to the same company or combined enterprise profile.</span>
          </div>
          <div className="dealer-setup-store-draft-stack">
            {storeDrafts.map((store, index) => (
              <section className="dealer-setup-store-draft-card" key={store.id}>
                <header>
                  <div>
                    <strong>{store.storeName || `Store ${index + 1}`}</strong>
                    <span>{store.operatingCompany || "Operating company pending"}</span>
                  </div>
                  <div className="dealer-setup-card-header-actions">
                    <button className="dealer-setup-ghost-button" onClick={() => toggleStoreDraftCollapse(store.id)} type="button">
                      {collapsedStoreDraftIds.includes(store.id) ? "Expand" : "Collapse"}
                    </button>
                    <button className="dealer-setup-ghost-button" disabled={storeDrafts.length === 1} onClick={() => removeStoreDraft(index)} type="button">
                      Remove
                    </button>
                  </div>
                </header>
                <div className="dealer-setup-card-summary-row">
                  <span>{store.storeDealerId || "Dealer ID pending"}</span>
                  <span>{store.storeCode || "Store code pending"}</span>
                  <span>{[store.city, store.state].filter(Boolean).join(", ") || "Location pending"}</span>
                </div>
                {collapsedStoreDraftIds.includes(store.id) ? null : (
                  <div className="dealer-setup-store-draft-grid">
                    <label className="dealer-setup-field">
                      <span>Store Name</span>
                      <input onChange={(event) => updateStoreDraft(index, "storeName", event.target.value)} value={store.storeName} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Store Code</span>
                      <input onChange={(event) => updateStoreDraft(index, "storeCode", event.target.value)} value={store.storeCode} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Store Dealer ID</span>
                      <input onChange={(event) => updateStoreDraft(index, "storeDealerId", event.target.value)} value={store.storeDealerId} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Operating Company</span>
                      <input onChange={(event) => updateStoreDraft(index, "operatingCompany", event.target.value)} value={store.operatingCompany} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Portfolio Label</span>
                      <input onChange={(event) => updateStoreDraft(index, "portfolioLabel", event.target.value)} value={store.portfolioLabel} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Location Type</span>
                      <input onChange={(event) => updateStoreDraft(index, "locationType", event.target.value)} value={store.locationType} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>General Manager</span>
                      <input onChange={(event) => updateStoreDraft(index, "manager", event.target.value)} value={store.manager} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Street</span>
                      <input onChange={(event) => updateStoreDraft(index, "street", event.target.value)} value={store.street} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>City</span>
                      <input onChange={(event) => updateStoreDraft(index, "city", event.target.value)} value={store.city} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>State</span>
                      <input onChange={(event) => updateStoreDraft(index, "state", event.target.value)} value={store.state} />
                    </label>
                  </div>
                )}
              </section>
            ))}
          </div>
          <div className="dealer-setup-onboarding-note">
            <strong>Store hierarchy</strong>
            <span>Use this step for company and store separation: each rooftop gets its own dealer ID, while company IDs and enterprise IDs remain shared for the combined environment.</span>
          </div>
        </div>
      );
    }

    if (activeStep === "modules") {
      return (
        <div className="dealer-setup-onboarding-stack">
          <div className="dealer-setup-explain-grid dealer-setup-explain-grid-compact">
            <section className="dealer-setup-explain-card is-highlight">
              <span>How to read this step</span>
              <strong>{selectedModuleBlueprints.length} work areas enabled</strong>
              <p>Each card explains who uses the module and what the store gets on day one. Turn on only the modules the dealership will actually operate at launch.</p>
            </section>
            <section className="dealer-setup-explain-card">
              <span>Recommended day-one stack</span>
              <strong>Sales, Service, Parts</strong>
              <p>Add Accounting and CRM when the store wants cash controls and customer follow-up live from the start.</p>
            </section>
          </div>
          <div className="dealer-setup-blueprint-grid">
            {moduleBlueprints.map((module) => (
              <section className={`dealer-setup-blueprint-card${moduleSelection.includes(module.id) ? " is-selected" : ""}`} key={module.id}>
                <header>
                  <div>
                    <strong>{module.label}</strong>
                    <span>{module.stage}</span>
                  </div>
                  <button className="dealer-setup-ghost-button" onClick={() => toggleModule(module.id)} type="button">
                    {moduleSelection.includes(module.id) ? "Enabled" : "Enable Module"}
                  </button>
                </header>
                <p>{module.summary}</p>
                <div className="dealer-setup-tag-row">
                  {module.teams.map((team) => (
                    <span className="dealer-setup-inline-tag" key={team}>{team}</span>
                  ))}
                </div>
                <ul className="dealer-setup-bullet-list">
                  {module.deliverables.map((deliverable) => (
                    <li key={deliverable}>{deliverable}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="dealer-setup-onboarding-note">
            <strong>Launch rule</strong>
            <span>Enable the modules that match the store's operating model today. Additional areas can be added later without rebuilding the entire dealer profile.</span>
          </div>
        </div>
      );
    }

    if (activeStep === "integrations") {
      return (
        <div className="dealer-setup-onboarding-stack">
          <div className="dealer-setup-explain-grid dealer-setup-explain-grid-compact">
            <section className="dealer-setup-explain-card is-highlight">
              <span>Connection strategy</span>
              <strong>{selectedIntegrationBlueprints.length} systems selected</strong>
              <p>This step is the launch map for outside systems. Every card tells you what syncs, who owns the connection, and whether it is required for go-live.</p>
            </section>
            <section className="dealer-setup-explain-card">
              <span>Minimum launch requirement</span>
              <strong>DMS + Accounting</strong>
              <p>Those two usually establish the operating backbone. F&I, Marketing, and Credit Bureau can be added based on rollout scope.</p>
            </section>
          </div>
          <div className="dealer-setup-blueprint-grid">
            {integrationBlueprints.map((integration) => (
              <section className={`dealer-setup-blueprint-card${integrationSelection.includes(integration.id) ? " is-selected" : ""}`} key={integration.id}>
                <header>
                  <div>
                    <strong>{integration.label}</strong>
                    <span>{integration.stage}</span>
                  </div>
                  <button className="dealer-setup-ghost-button" onClick={() => toggleIntegration(integration.id)} type="button">
                    {integrationSelection.includes(integration.id) ? "Connected" : "Mark For Launch"}
                  </button>
                </header>
                <p>{integration.summary}</p>
                <div className="dealer-setup-tag-row">
                  <span className="dealer-setup-inline-tag">Owner: {integration.owner}</span>
                </div>
                <ul className="dealer-setup-bullet-list">
                  {integration.syncs.map((sync) => (
                    <li key={sync}>{sync}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="dealer-setup-onboarding-note">
            <strong>Go-live guidance</strong>
            <span>Use this step to record what must be connected before the store launches, not every future integration the dealer may eventually want.</span>
          </div>
        </div>
      );
    }

    if (activeStep === "users") {
      return (
        <div className="dealer-setup-onboarding-stack">
          <div className="dealer-setup-inline-action-row">
            <button className="dealer-setup-secondary-button" onClick={addUserSeat} type="button">Add User</button>
            <span>Capture each person with email, role, profile type, and store scope instead of broad seat counts.</span>
          </div>
          <div className="dealer-setup-seat-stack">
            {userSeats.map((seat, index) => (
              <section className="dealer-setup-seat-card" key={seat.id}>
                <header>
                  <div>
                    <strong>{seat.fullName || `User ${index + 1}`}</strong>
                    <span>{seat.profile} profile</span>
                  </div>
                  <div className="dealer-setup-card-header-actions">
                    <button className="dealer-setup-ghost-button" onClick={() => toggleUserSeatCollapse(seat.id)} type="button">
                      {collapsedUserSeatIds.includes(seat.id) ? "Expand" : "Collapse"}
                    </button>
                    <button className="dealer-setup-ghost-button" disabled={userSeats.length === 1} onClick={() => removeUserSeat(index)} type="button">
                      Remove
                    </button>
                  </div>
                </header>
                <div className="dealer-setup-card-summary-row">
                  <span>{seat.role || "Role pending"}</span>
                  <span>{onboardingStoreOptions.find((storeOption) => storeOption.id === seat.assignedStoreId)?.label ?? "Store pending"}</span>
                  <span>{seat.email || "Email pending"}</span>
                </div>
                {collapsedUserSeatIds.includes(seat.id) ? null : (
                  <div className="dealer-setup-seat-grid">
                    <label className="dealer-setup-field">
                      <span>Full Name</span>
                      <input onChange={(event) => updateUserSeat(index, "fullName", event.target.value)} value={seat.fullName} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Email</span>
                      <input onChange={(event) => updateUserSeat(index, "email", event.target.value)} value={seat.email} />
                    </label>
                    <label className="dealer-setup-field">
                      <span>Role</span>
                      <select onChange={(event) => updateUserSeat(index, "role", event.target.value)} value={seat.role}>
                        <option value="">Select role</option>
                        {onboardingRoleOptions.map((roleOption) => (
                          <option key={roleOption} value={roleOption}>{roleOption}</option>
                        ))}
                      </select>
                    </label>
                    <label className="dealer-setup-field">
                      <span>Profile</span>
                      <select onChange={(event) => updateUserSeat(index, "profile", event.target.value)} value={seat.profile}>
                        <option>Management</option>
                        <option>Sub Management</option>
                        <option>User</option>
                      </select>
                    </label>
                    <label className="dealer-setup-field">
                      <span>Assigned Store</span>
                      <select onChange={(event) => updateUserSeat(index, "assignedStoreId", event.target.value)} value={seat.assignedStoreId}>
                        {onboardingStoreOptions.map((storeOption) => (
                          <option key={storeOption.id} value={storeOption.id}>{storeOption.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="dealer-setup-field">
                      <span>Phone</span>
                      <input onChange={(event) => updateUserSeat(index, "phone", event.target.value)} value={seat.phone} />
                    </label>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      );
    }

    if (activeStep === "billing") {
      return (
        <div className="dealer-setup-onboarding-stack">
          <div className="dealer-setup-billing-metric-grid">
            <section className="dealer-setup-billing-summary">
              <span>Standard Access</span>
              <strong>${baseMonthlyPerStore.toLocaleString()} / store / month</strong>
              <p>Base platform subscription that covers the production shell, core user access, and standard onboarding administration.</p>
            </section>
            <section className="dealer-setup-billing-summary is-muted">
              <span>Selected Upgrades</span>
              <strong>${addOnMonthlyPerStore.toLocaleString()} / store / month</strong>
              <p>{selectedBillingAddOns.map((addOn) => addOn.label).join(", ") || "No commercial upgrades selected yet."}</p>
            </section>
            <section className="dealer-setup-billing-summary is-emphasis">
              <span>Projected Monthly Contract</span>
              <strong>${estimatedMonthlyTotal.toLocaleString()} / month</strong>
              <p>{configuredStoreCount} stores • {billingDraft.paymentMethod} • {billingDraft.contractTermMonths} month term</p>
            </section>
          </div>
          <div className="dealer-setup-billing-shell">
            <section className="dealer-setup-billing-section">
              <header className="dealer-setup-card-heading">
                <div>
                  <strong>Contract Structure</strong>
                  <span>Define how the dealership is billed and when the commercial package begins.</span>
                </div>
              </header>
              <div className="dealer-setup-onboarding-form-grid is-two-column">
                <label className="dealer-setup-field">
                  <span>Base Monthly Per Store</span>
                  <input onChange={(event) => updateBillingField("baseMonthlyPerStore", event.target.value)} value={billingDraft.baseMonthlyPerStore} />
                </label>
                <label className="dealer-setup-field">
                  <span>Billing Cadence</span>
                  <select onChange={(event) => updateBillingField("billingCadence", event.target.value)} value={billingDraft.billingCadence}>
                    <option>Monthly autopay</option>
                    <option>Monthly invoice</option>
                    <option>Quarterly billing</option>
                  </select>
                </label>
                <label className="dealer-setup-field">
                  <span>Contract Term</span>
                  <select onChange={(event) => updateBillingField("contractTermMonths", event.target.value)} value={billingDraft.contractTermMonths}>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </label>
                <label className="dealer-setup-field">
                  <span>Contract Start Date</span>
                  <input onChange={(event) => updateBillingField("contractStartDate", event.target.value)} type="date" value={billingDraft.contractStartDate} />
                </label>
                <label className="dealer-setup-field">
                  <span>Payment Method</span>
                  <select onChange={(event) => updateBillingField("paymentMethod", event.target.value)} value={billingDraft.paymentMethod}>
                    <option>ACH</option>
                    <option>Credit Card</option>
                    <option>Wire</option>
                    <option>Invoice Terms</option>
                  </select>
                </label>
                <label className="dealer-setup-field">
                  <span>Payment Terms</span>
                  <select onChange={(event) => updateBillingField("paymentTerms", event.target.value)} value={billingDraft.paymentTerms}>
                    <option>Due on receipt</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 45</option>
                  </select>
                </label>
              </div>
            </section>
            <section className="dealer-setup-billing-section">
              <header className="dealer-setup-card-heading">
                <div>
                  <strong>Billing Contact & Delivery</strong>
                  <span>Record who receives invoices and how the commercial documents are distributed.</span>
                </div>
              </header>
              <div className="dealer-setup-onboarding-form-grid is-two-column">
                <label className="dealer-setup-field">
                  <span>Billing Contact Name</span>
                  <input onChange={(event) => updateBillingField("billingContactName", event.target.value)} value={billingDraft.billingContactName} />
                </label>
                <label className="dealer-setup-field">
                  <span>Billing Phone</span>
                  <input onChange={(event) => updateBillingField("billingPhone", event.target.value)} value={billingDraft.billingPhone} />
                </label>
                <label className="dealer-setup-field">
                  <span>Invoice Email</span>
                  <input onChange={(event) => updateBillingField("invoiceEmail", event.target.value)} value={billingDraft.invoiceEmail} />
                </label>
                <label className="dealer-setup-field">
                  <span>Invoice Delivery</span>
                  <select onChange={(event) => updateBillingField("invoiceDelivery", event.target.value)} value={billingDraft.invoiceDelivery}>
                    <option>Email + PDF copy</option>
                    <option>Email only</option>
                    <option>Portal + email alert</option>
                    <option>Physical invoice + email copy</option>
                  </select>
                </label>
              </div>
            </section>
            <section className="dealer-setup-billing-section">
              <header className="dealer-setup-card-heading">
                <div>
                  <strong>Settlement & Finance Notes</strong>
                  <span>Capture the remittance details the finance team needs to provision the account cleanly.</span>
                </div>
              </header>
              <div className="dealer-setup-onboarding-form-grid is-two-column">
                <label className="dealer-setup-field">
                  <span>ACH Company / Account Name</span>
                  <input onChange={(event) => updateBillingField("achCompanyName", event.target.value)} value={billingDraft.achCompanyName} />
                </label>
                <label className="dealer-setup-field">
                  <span>ACH Routing Last 4</span>
                  <input onChange={(event) => updateBillingField("achRoutingLast4", event.target.value)} value={billingDraft.achRoutingLast4} />
                </label>
                <label className="dealer-setup-field dealer-setup-field-span-2">
                  <span>Billing Notes</span>
                  <input onChange={(event) => updateBillingField("notes", event.target.value)} value={billingDraft.notes} />
                </label>
              </div>
            </section>
            <section className="dealer-setup-billing-section">
              <header className="dealer-setup-card-heading">
                <div>
                  <strong>Commercial Upgrades</strong>
                  <span>Add the optional monthly services the dealer is purchasing on top of the base subscription.</span>
                </div>
              </header>
              <div className="dealer-setup-addon-grid">
                {dealerBillingAddOns.map((addOn) => (
                  <button className={`dealer-setup-addon-card${billingDraft.selectedAddOnIds.includes(addOn.id) ? " is-selected" : ""}`} key={addOn.id} onClick={() => toggleBillingAddOn(addOn.id)} type="button">
                    <strong>{addOn.label}</strong>
                    <span>${addOn.monthlyPerStore.toLocaleString()} / store / month</span>
                    <p>{addOn.note}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div className="dealer-setup-onboarding-note">
            <strong>Professional billing setup</strong>
            <span>The billing step now separates contract structure, billing contacts, remittance method, and commercial upgrades so Finance can approve the dealer without reworking the packet offline.</span>
          </div>
        </div>
      );
    }

    return (
      <div className="dealer-setup-review-grid">
        <section className="dealer-setup-review-card">
          <span>Enterprise Profile</span>
          <strong>{profileDraft.enterpriseGroupName}</strong>
          <p>{profileDraft.parentCompanyName} · {profileDraft.companyId} · {describeOemBrands(profileDraft.oemBrands)}</p>
        </section>
        <section className="dealer-setup-review-card">
          <span>Store Network</span>
          <strong>{configuredStoreCount} stores configured</strong>
          <p>{storeDrafts.map((store) => `${store.storeName || "Unnamed"} (${store.storeDealerId || "Dealer ID pending"})`).join(", ")}</p>
        </section>
        <section className="dealer-setup-review-card">
          <span>Modules</span>
          <strong>{moduleSelection.length} enabled</strong>
          <p>{selectedModuleBlueprints.map((module) => module.label).join(", ") || "No modules selected"}</p>
        </section>
        <section className="dealer-setup-review-card">
          <span>Integrations</span>
          <strong>{integrationSelection.length} connected</strong>
          <p>{selectedIntegrationBlueprints.map((integration) => integration.label).join(", ") || "No integrations selected"}</p>
        </section>
        <section className="dealer-setup-review-card">
          <span>User Provisioning</span>
          <strong>{configuredUserSeatCount} user profiles</strong>
          <p>{userSeats.map((seat) => `${seat.fullName || "Open seat"} · ${seat.role || "Role pending"} · ${seat.profile}`).join(", ")}</p>
        </section>
        <section className="dealer-setup-review-card">
          <span>Commercial Plan</span>
          <strong>${estimatedMonthlyTotal.toLocaleString()} / month</strong>
          <p>{billingDraft.paymentMethod} · {billingDraft.paymentTerms} · {selectedBillingAddOns.map((addOn) => addOn.label).join(", ") || "Standard access only"}</p>
        </section>
      </div>
    );
  }

  function renderPermissionView() {
    if (!selectedDealer) {
      return null;
    }

    return (
      <>
        <section className="dealer-setup-detail-card">
          <header className="dealer-setup-card-heading">
            <div>
              <strong>Modules</strong>
              <span>Functional packages turned on for this rooftop.</span>
            </div>
          </header>
          <div className="dealer-setup-module-toggle-grid">
            {selectedDealer.modules.map((module) => (
              <div className={`dealer-setup-module-toggle${module.enabled ? " is-enabled" : ""}`} key={module.id}>
                <span>{module.label}</span>
                <div className={`dealer-setup-toggle-indicator${module.enabled ? " is-enabled" : ""}`} />
              </div>
            ))}
          </div>
        </section>

        <section className="dealer-setup-detail-card">
          <header className="dealer-setup-card-heading">
            <div>
              <strong>Permission Matrix</strong>
              <span>Role-based access by module.</span>
            </div>
          </header>
          <div className="dealer-setup-permission-shell">
            <table className="dealer-setup-permission-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Sales</th>
                  <th>Service</th>
                  <th>Parts</th>
                  <th>Accounting</th>
                  <th>CRM</th>
                  <th>Inventory</th>
                </tr>
              </thead>
              <tbody>
                {selectedDealer.permissionRows.map((row) => (
                  <tr key={row.role}>
                    <td>{row.role}</td>
                    <td>{renderBooleanCell(row.sales)}</td>
                    <td>{renderBooleanCell(row.service)}</td>
                    <td>{renderBooleanCell(row.parts)}</td>
                    <td>{renderBooleanCell(row.accounting)}</td>
                    <td>{renderBooleanCell(row.crm)}</td>
                    <td>{renderBooleanCell(row.inventory)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dealer-setup-detail-card">
          <header className="dealer-setup-card-heading">
            <div>
              <strong>Integrations</strong>
              <span>Connected systems for the selected rooftop.</span>
            </div>
          </header>
          <div className="dealer-setup-integrations-grid">
            {selectedDealer.integrations.map((integration) => (
              <article className="dealer-setup-integration-card" key={integration.id}>
                <header>
                  <strong>{integration.label}</strong>
                  <span className={`dealer-setup-status-chip tone-${getToneKey(integration.status)}`}>{integration.status}</span>
                </header>
                <p>{integration.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dealer-setup-detail-card">
          <header className="dealer-setup-card-heading">
            <div>
              <strong>Audit Trail (Latest)</strong>
              <span>Recent changes across setup, modules, and imports.</span>
            </div>
          </header>
          <div className="dealer-setup-audit-list">
            {selectedDealer.activity.map((entry) => (
              <div className="dealer-setup-audit-row" key={entry.id}>
                <span>{entry.detail}</span>
                <strong>{entry.timeLabel}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="dealer-setup-detail-card">
          <div className="dealer-setup-readiness-grid">
            <div className="dealer-setup-readiness-score">
              <span>Launch Readiness</span>
              <strong>{selectedDealer.locations.find((location) => location.id === selectedLocation?.id)?.launchReadiness ?? selectedDealer.progressPercent}%</strong>
              <p>{selectedLocation?.status ?? selectedDealer.status}</p>
            </div>
            <div>
              <ul className="dealer-setup-readiness-list">
                {selectedDealer.importStages.map((stage) => (
                  <li key={stage.id}>
                    <span>{stage.label}</span>
                    <strong>{stage.complete} / {stage.total}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong className="dealer-setup-next-step-heading">Recommended Next Steps</strong>
              <ul className="dealer-setup-next-step-list">
                {selectedDealer.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderProfileView() {
    if (!selectedDealer || !selectedLocation) {
      return null;
    }

    const selectedStoreUsers = (selectedDealer.userSeats ?? []).filter((seat) => seat.assignedStoreId === selectedLocation.id);
    const billingSummary = selectedDealer.billing;

    return (
      <section className="dealer-setup-detail-card">
        <div className="dealer-setup-profile-grid">
          {selectedDealer.enterpriseGroupName ? (
            <article className="dealer-setup-profile-card">
              <span>Enterprise Group</span>
              <strong>{selectedDealer.enterpriseGroupName}</strong>
            </article>
          ) : null}
          {selectedDealer.oemBrands && selectedDealer.oemBrands.length > 0 ? (
            <article className="dealer-setup-profile-card is-wide">
              <span>OEM Portfolio</span>
              <strong>{describeOemBrands(selectedDealer.oemBrands)}</strong>
            </article>
          ) : null}
          {selectedDealer.companyId ? (
            <article className="dealer-setup-profile-card">
              <span>Company ID</span>
              <strong>{selectedDealer.companyId}</strong>
            </article>
          ) : null}
          <article className="dealer-setup-profile-card">
            <span>Legal Entity</span>
            <strong>{selectedDealer.legalEntity}</strong>
          </article>
          <article className="dealer-setup-profile-card">
            <span>Dealer ID</span>
            <strong>{selectedDealer.dealerId}</strong>
          </article>
          <article className="dealer-setup-profile-card">
            <span>Region</span>
            <strong>{selectedDealer.region}</strong>
          </article>
          <article className="dealer-setup-profile-card">
            <span>Time Zone</span>
            <strong>{selectedDealer.timeZone}</strong>
          </article>
          <article className="dealer-setup-profile-card">
            <span>Rooftop</span>
            <strong>{selectedDealer.rooftopCode}</strong>
          </article>
          <article className="dealer-setup-profile-card">
            <span>Website</span>
            <strong>{selectedDealer.website}</strong>
          </article>
          {selectedLocation.storeDealerId ? (
            <article className="dealer-setup-profile-card">
              <span>Selected Store Dealer ID</span>
              <strong>{selectedLocation.storeDealerId}</strong>
            </article>
          ) : null}
          {selectedLocation.operatingCompany ? (
            <article className="dealer-setup-profile-card">
              <span>Operating Company</span>
              <strong>{selectedLocation.operatingCompany}</strong>
            </article>
          ) : null}
          {selectedLocation.manager ? (
            <article className="dealer-setup-profile-card">
              <span>General Manager</span>
              <strong>{selectedLocation.manager}</strong>
            </article>
          ) : null}
          <article className="dealer-setup-profile-card is-wide">
            <span>Selected Location</span>
            <strong>{selectedLocation.label}</strong>
            <p>{selectedLocation.address}</p>
          </article>
          {billingSummary ? (
            <article className="dealer-setup-profile-card is-wide">
              <span>Billing Plan</span>
              <strong>${billingSummary.estimatedMonthlyTotal.toLocaleString()} / month</strong>
              <p>
                {billingSummary.paymentMethod} · {billingSummary.paymentTerms ?? billingSummary.billingCadence} · {billingSummary.addOnLabels.join(", ") || "Standard access only"}
              </p>
            </article>
          ) : null}
          {(selectedDealer.userSeats ?? []).length > 0 ? (
            <article className="dealer-setup-profile-card is-wide">
              <span>Assigned Users For Selected Store</span>
              <strong>{selectedStoreUsers.length} mapped users</strong>
              <p>
                {selectedStoreUsers.length > 0
                  ? selectedStoreUsers.map((seat) => `${seat.fullName} · ${seat.role} · ${seat.profile}`).join(" | ")
                  : "No users have been assigned to this store yet."}
              </p>
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  function renderModulesView() {
    if (!selectedDealer) {
      return null;
    }

    return (
      <section className="dealer-setup-detail-card">
        <div className="dealer-setup-module-insight-grid">
          {selectedDealer.modules.map((module) => (
            <article className={`dealer-setup-module-insight${module.enabled ? " is-enabled" : ""}`} key={module.id}>
              <header>
                <strong>{module.label}</strong>
                <span>{module.enabled ? "Enabled" : "Disabled"}</span>
              </header>
              <p>{module.enabled ? `${module.label} workflows are staged for this dealer group.` : `${module.label} is not yet provisioned for the current rollout.`}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderIntegrationsView() {
    if (!selectedDealer) {
      return null;
    }

    return (
      <section className="dealer-setup-detail-card">
        <div className="dealer-setup-integrations-grid">
          {selectedDealer.integrations.map((integration) => (
            <article className="dealer-setup-integration-card is-tall" key={integration.id}>
              <header>
                <strong>{integration.label}</strong>
                <span className={`dealer-setup-status-chip tone-${getToneKey(integration.status)}`}>{integration.status}</span>
              </header>
              <p>{integration.note}</p>
              <div className="dealer-setup-integration-footnote">Mapped to {selectedDealer.integration === "-" ? "manual onboarding" : selectedDealer.integration}</div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderDataImportView() {
    if (!selectedDealer) {
      return null;
    }

    return (
      <section className="dealer-setup-detail-card">
        <div className="dealer-setup-import-grid">
          {selectedDealer.importStages.map((stage) => {
            const percent = stage.total === 0 ? 0 : Math.round((stage.complete / stage.total) * 100);
            return (
              <article className="dealer-setup-import-card" key={stage.id}>
                <header>
                  <strong>{stage.label}</strong>
                  <span>{stage.complete} / {stage.total}</span>
                </header>
                <div className="dealer-setup-progress-bar is-compact"><span style={{ width: `${percent}%` }} /></div>
                <p>{percent}% complete for the current import package.</p>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="dealer-setup-page">
      <section className="dealer-setup-topbar">
        <div className="dealer-setup-title-block">
          <span className="dealer-setup-eyebrow">Dealer Network Configuration</span>
          <h2>Dealer Setup</h2>
          <p>Manage dealer groups, rooftops, locations, modules, and permissions for {storeName} from one operations console.</p>
        </div>
        <div className="dealer-setup-topbar-actions">
          <button className="dealer-setup-secondary-button" onClick={() => setStatusNotice("Network overview is already reflected in the readiness strip below.")} type="button">Network Overview</button>
          <button className="dealer-setup-secondary-button" onClick={() => setStatusNotice("New rooftop flow opened in mock mode.")} type="button">Add Rooftop</button>
          <button className="dealer-setup-primary-button" onClick={openOnboarding} type="button">Add Dealer</button>
        </div>
      </section>

      <div className="dealer-setup-notice">{statusNotice}</div>

      {isOnboardingOpen ? (
        <div className="dealer-setup-onboarding-overlay">
          <section className="dealer-setup-onboarding-shell">
            <header className="dealer-setup-onboarding-header">
              <div>
                <span className="dealer-setup-eyebrow">Add New Dealer</span>
                <h3>Dealer onboarding wizard</h3>
                <p>Step {activeStepIndex + 1} of {onboardingSteps.length}. Completed onboarding now persists per store through the API.</p>
              </div>
              <button className="dealer-setup-close-button" onClick={closeOnboarding} type="button">Close</button>
            </header>

            <div className="dealer-setup-stepper" role="list">
              {onboardingSteps.map((step, index) => (
                <div className={`dealer-setup-step${index === activeStepIndex ? " is-active" : index < activeStepIndex ? " is-complete" : ""}`} key={step.id} role="listitem">
                  <div className="dealer-setup-step-number">{index + 1}</div>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>

            <div className="dealer-setup-onboarding-layout">
              <aside className="dealer-setup-progress-panel">
                <span>Onboarding Progress</span>
                <strong>{onboardingProgressPercent}%</strong>
                <p>Complete</p>
                <div className="dealer-setup-progress-bar"><span style={{ width: `${onboardingProgressPercent}%` }} /></div>
                <ul className="dealer-setup-progress-list">
                  {onboardingSteps.map((step, index) => (
                    <li className={index === activeStepIndex ? "is-active" : ""} key={step.id}>{step.label}</li>
                  ))}
                </ul>
              </aside>

              <section className="dealer-setup-onboarding-panel">
                <header className="dealer-setup-card-heading">
                  <div>
                    <strong>{onboardingSteps[activeStepIndex]?.label}</strong>
                    <span>{getOnboardingStepDescription(onboardingSteps[activeStepIndex]?.id)}</span>
                  </div>
                </header>
                {renderOnboardingStep()}
              </section>

              <aside className="dealer-setup-health-panel">
                <section className="dealer-setup-health-card">
                  <header>
                    <strong>Setup Health</strong>
                    <span>Good</span>
                  </header>
                  <p>Complete required fields, store dealer IDs, user profiles, and billing setup to improve your launch score.</p>
                </section>
                <section className="dealer-setup-health-card">
                  <header>
                    <strong>Required Fields</strong>
                    <span>{completedRequiredFieldCount} of {requiredProfileFields.length} completed</span>
                  </header>
                  <ul className="dealer-setup-health-list">
                    {requiredProfileFields.map((field) => (
                      <li className={hasCompletedProfileField(profileDraft, field.key) ? "is-complete" : ""} key={field.key}>{field.label}</li>
                    ))}
                  </ul>
                </section>
                <section className="dealer-setup-health-card">
                  <header>
                    <strong>Connected Systems</strong>
                    <span>{connectedSystemsCount} of 5 connected</span>
                  </header>
                  <ul className="dealer-setup-health-list">
                    {integrationBlueprints.map((integration) => (
                      <li className={integrationSelection.includes(integration.id) ? "is-complete" : ""} key={integration.id}>{integration.label}</li>
                    ))}
                  </ul>
                </section>
                <section className="dealer-setup-health-card">
                  <header>
                    <strong>Commercial Plan</strong>
                    <span>${estimatedMonthlyTotal.toLocaleString()}/month</span>
                  </header>
                  <ul className="dealer-setup-health-list">
                    <li className={configuredStoreCount > 0 ? "is-complete" : ""}>{configuredStoreCount} stores with dealer IDs</li>
                    <li className={configuredUserSeatCount > 0 ? "is-complete" : ""}>{configuredUserSeatCount} user profiles mapped</li>
                    <li className={billingDraft.invoiceEmail.trim().length > 0 ? "is-complete" : ""}>{billingDraft.paymentMethod} billing to {billingDraft.invoiceEmail || "billing email pending"}</li>
                    <li className={billingDraft.contractTermMonths.trim().length > 0 ? "is-complete" : ""}>{billingDraft.contractTermMonths || "0"} month contract term</li>
                    <li className={billingDraft.selectedAddOnIds.includes("api-access") ? "is-complete" : ""}>API access {billingDraft.selectedAddOnIds.includes("api-access") ? "included" : "optional"}</li>
                  </ul>
                </section>
              </aside>
            </div>

            <footer className="dealer-setup-onboarding-footer">
              <button className="dealer-setup-secondary-button" onClick={goBackOnboarding} type="button">Back</button>
              <div className="dealer-setup-footer-actions">
                <button className="dealer-setup-secondary-button" onClick={saveDraft} type="button">Save Draft</button>
                <button className="dealer-setup-primary-button" disabled={isSavingDealer || isHydratingDealers} onClick={() => void continueOnboarding()} type="button">
                  {activeStepIndex === onboardingSteps.length - 1
                    ? isSavingDealer
                      ? "Saving Dealer..."
                      : "Create Dealer"
                    : `Continue to ${onboardingSteps[activeStepIndex + 1]?.shortLabel}`}
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      <section className="dealer-setup-kpi-strip">
        <article className="dealer-setup-kpi-card">
          <span>Rooftops</span>
          <strong>{rooftopsCount}</strong>
          <p>Active {activeDealerCount + 11}</p>
        </article>
        <article className="dealer-setup-kpi-card">
          <span>Dealerships</span>
          <strong>{totalDealers}</strong>
          <p>Active {activeDealerCount}</p>
        </article>
        <article className="dealer-setup-kpi-card">
          <span>Users</span>
          <strong>{usersCount}</strong>
          <p>Provisioned across network</p>
        </article>
        <article className="dealer-setup-kpi-card">
          <span>Onboarding</span>
          <strong>{inSetupDealerCount}</strong>
          <p>In Progress</p>
        </article>
        <article className="dealer-setup-kpi-card is-readiness">
          <span>Launch Readiness</span>
          <strong>{averageReadiness}%</strong>
          <p>Good</p>
        </article>
      </section>

      <section className={`dealer-setup-workspace${centerView === "map" ? " is-map-view" : ""}`}>
        <aside className="dealer-setup-hierarchy-panel">
          <header className="dealer-setup-panel-header">
            <div>
              <strong>Network Hierarchy</strong>
              <span>Dealer groups, rooftops, and active workstreams.</span>
            </div>
          </header>

          <label className="dealer-setup-search-field dealer-setup-search-field-compact">
            <span>Search rooftops or dealers</span>
            <input onChange={(event) => setHierarchySearchTerm(event.target.value)} placeholder="Search rooftops or dealers" value={hierarchySearchTerm} />
          </label>

          <div className="dealer-setup-tree-root">
            {hierarchyGroups.map((group) => {
              const isGroupExpanded = isHierarchySearchActive || expandedHierarchyGroupIds.includes(group.id);
              const groupBodyId = `dealer-setup-group-${group.id}`;

              return (
              <section className={`dealer-setup-tree-group${isGroupExpanded ? " is-expanded" : ""}`} key={group.id}>
                <header className="dealer-setup-tree-group-header">
                  <button
                    aria-controls={groupBodyId}
                    aria-expanded={isGroupExpanded}
                    className={`dealer-setup-tree-group-button${isGroupExpanded ? " is-expanded" : ""}`}
                    onClick={() => setExpandedHierarchyGroupIds((current) => (
                      current.includes(group.id) ? current.filter((groupId) => groupId !== group.id) : [...current, group.id]
                    ))}
                    type="button"
                  >
                    <span className="dealer-setup-tree-group-caret" aria-hidden="true">{isGroupExpanded ? "▾" : "▸"}</span>
                    <span>{group.label}</span>
                  </button>
                  <span className="dealer-setup-tree-badge">{group.dealers.length}</span>
                </header>
                {isGroupExpanded ? (
                <div className="dealer-setup-tree-group-body" id={groupBodyId}>
                  {group.dealers.map((dealer) => (
                    <div className="dealer-setup-tree-dealer" key={dealer.id}>
                      <button className={`dealer-setup-tree-button${dealer.id === selectedDealer?.id ? " is-active" : ""}`} onClick={() => { setSelectedDealerId(dealer.id); setSelectedLocationId(dealer.locations[0]?.id ?? ""); }} type="button">
                        <span>{dealer.name}</span>
                        <span className="dealer-setup-tree-badge">{dealer.locations.length}</span>
                      </button>
                      {dealer.id === selectedDealer?.id ? (
                        <div className="dealer-setup-tree-locations">
                          {dealer.locations.map((location) => (
                            <button className={`dealer-setup-tree-location${location.id === selectedLocation?.id ? " is-active" : ""}`} key={location.id} onClick={() => setSelectedLocationId(location.id)} type="button">
                              <span>{location.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                ) : null}
              </section>
              );
            })}
          </div>

          <footer className="dealer-setup-tree-footer">
            <button className="dealer-setup-secondary-button" onClick={() => setStatusNotice("Add Rooftop launched from the hierarchy rail in mock mode.")} type="button">Add Rooftop</button>
            <button className="dealer-setup-icon-button" onClick={() => setStatusNotice("More hierarchy actions are not wired yet.")} type="button">⋯</button>
          </footer>
        </aside>

        <section className="dealer-setup-location-panel">
          <header className="dealer-setup-panel-header">
            <div className="dealer-setup-segmented-tabs" role="tablist">
              <button className={centerView === "locations" ? "is-active" : ""} onClick={() => setCenterView("locations")} role="tab" type="button">Locations</button>
              <button className={centerView === "map" ? "is-active" : ""} onClick={() => setCenterView("map")} role="tab" type="button">Map</button>
            </div>
          </header>

          <div className="dealer-setup-toolbar">
            <label className="dealer-setup-search-field dealer-setup-search-field-compact">
              <span>Search locations</span>
              <input onChange={(event) => setLocationSearchTerm(event.target.value)} placeholder="Search locations" value={locationSearchTerm} />
            </label>
            <label className="dealer-setup-inline-field dealer-setup-inline-field-compact">
              <span>Status</span>
              <select onChange={(event) => setLocationStatusFilter(event.target.value)} value={locationStatusFilter}>
                {locationStatusOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="dealer-setup-inline-field dealer-setup-inline-field-compact">
              <span>Modules</span>
              <select onChange={(event) => setLocationModuleFilter(event.target.value)} value={locationModuleFilter}>
                {locationModuleOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <button className="dealer-setup-icon-button" onClick={() => setStatusNotice("Advanced location filters are not wired yet.")} type="button">⌘</button>
          </div>

          {centerView === "locations" ? (
            <div className="dealer-setup-location-list">
              {visibleLocations.map((location) => (
                <button className={`dealer-setup-location-row${location.id === selectedLocation?.id ? " is-selected" : ""}`} key={location.id} onClick={() => handleSelectLocation(location.id)} type="button">
                  <div className="dealer-setup-location-copy">
                    <strong>{location.label}</strong>
                    <span>{location.address}</span>
                  </div>
                  <div className="dealer-setup-location-meta">
                    <span className={`dealer-setup-status-chip tone-${getToneKey(location.status)}`}>{location.status}</span>
                    <strong>{location.launchReadiness}%</strong>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="dealer-setup-map-card">
              <div className="dealer-setup-card-heading">
                <strong>Route status</strong>
                <span className="dealer-setup-field-caption">Select a rooftop to focus the full map and config panel below.</span>
              </div>
              <div className="dealer-setup-map-status-list">
                {visibleLocations.map((location) => (
                  <button
                    className={`dealer-setup-map-status-row${location.id === selectedLocation?.id ? " is-selected" : ""}`}
                    key={location.id}
                    onClick={() => handleSelectLocation(location.id)}
                    type="button"
                  >
                    <span className="dealer-setup-map-status-copy">
                      <span className="dealer-setup-map-status-dot" style={{ background: getDealerSetupMarkerColor(location.status, location.id === selectedLocation?.id) }} />
                      <span>
                        <strong>{location.label}</strong>
                        <small>{location.address}</small>
                      </span>
                    </span>
                    <span className="dealer-setup-map-status-meta">
                      <span className={`dealer-setup-status-chip tone-${getToneKey(location.status)}`}>{location.status}</span>
                      <strong>{location.launchReadiness}%</strong>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <footer className="dealer-setup-location-footer">
            <span>1-{visibleLocations.length} of {selectedDealer?.locations.length ?? 0}</span>
            <div className="dealer-setup-pagination">
              <button type="button">‹</button>
              <button className="is-active" type="button">1</button>
              <button type="button">2</button>
              <button type="button">3</button>
              <button type="button">›</button>
            </div>
          </footer>
        </section>

        {centerView === "map" ? (
          <section className="dealer-setup-map-panel">
            <div className="dealer-setup-map-card">
              <div className="dealer-setup-card-heading">
                <strong>Map coverage</strong>
                <span className="dealer-setup-field-caption">Showing {visibleMapLocations.length} configured location dot{visibleMapLocations.length === 1 ? "" : "s"} across {visibleMapDealerCount} dealer{visibleMapDealerCount === 1 ? "" : "s"} from the current filters.</span>
              </div>
              <DealerSetupGoogleMap
                locations={visibleMapLocations}
                onSelectLocation={handleSelectLocation}
                selectedLocationId={selectedLocation?.id}
              />
            </div>
          </section>
        ) : null}

        <section className="dealer-setup-config-panel">
          {selectedDealer && selectedLocation ? (
            <>
              <header className="dealer-setup-config-header">
                <div>
                  <h3>{selectedDealer.name}</h3>
                  <p>{selectedLocation.label} · {selectedLocation.address} · Rooftop ID: {selectedDealer.rooftopCode}</p>
                  <span>{selectedDealer.timeZone}</span>
                </div>
                <span className={`dealer-setup-status-chip tone-${getToneKey(selectedLocation.status)}`}>{selectedLocation.status}</span>
              </header>

              <div className="dealer-setup-config-tabs" role="tablist">
                {detailTabs.map((tab) => (
                  <button className={activeDetailTab === tab.id ? "is-active" : ""} key={tab.id} onClick={() => setActiveDetailTab(tab.id)} role="tab" type="button">{tab.label}</button>
                ))}
              </div>

              {activeDetailTab === "profile" ? renderProfileView() : null}
              {activeDetailTab === "modules" ? renderModulesView() : null}
              {activeDetailTab === "permissions" ? renderPermissionView() : null}
              {activeDetailTab === "integrations" ? renderIntegrationsView() : null}
              {activeDetailTab === "dataImport" ? renderDataImportView() : null}

              <footer className="dealer-setup-actions-row">
                <button className="dealer-setup-primary-button" onClick={() => setStatusNotice(`Saved ${selectedDealer.name} launch plan in mock mode.`)} type="button">Save Dealer</button>
                <button className="dealer-setup-secondary-button" onClick={() => setStatusNotice(`Validation queued for ${selectedDealer.name}.`)} type="button">Run Validation</button>
                <button className="dealer-setup-secondary-button" onClick={() => setStatusNotice(`Admin invite flow opened for ${selectedDealer.name}.`)} type="button">Invite Admin</button>
              </footer>
            </>
          ) : null}
        </section>
      </section>
    </div>
  );
}