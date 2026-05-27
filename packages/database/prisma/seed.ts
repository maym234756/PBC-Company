import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { PrismaClient } from "../src/generated/client.js";
import { seedCrmCommunicateFixtures } from "./crmCommunicateSeed.js";

const databaseUrl = `file:${path.resolve(import.meta.dirname, "dev.db").replace(/\\/g, "/")}`;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: databaseUrl
  })
});

const dealerGroups = [
  {
    slug: "premier-boating-centers",
    name: "Premier Boating Centers",
    description: "Premier's operating cloud for sales, service, payroll, analytics, and website publishing."
  },
  {
    slug: "ocean-marine-group",
    name: "Ocean Marine Group",
    description: "Ocean Marine Group's multi-store operating layer for marine dealership execution."
  }
];

const moduleBlueprints = [
  {
    code: "DMS",
    name: "Marine DMS",
    category: "Operations",
    description: "Inventory, deal desk, sold-unit prep, and service blockers inside one operating lane.",
    ownerTeam: "Sales + Ops",
    navGroup: "Operations"
  },
  {
    code: "PAYROLL",
    name: "Payroll Concept",
    category: "Finance",
    description: "QuickBooks-style payroll, compensation review, and deposit handoff workflows.",
    ownerTeam: "Finance",
    navGroup: "Finance"
  },
  {
    code: "ANALYTICS",
    name: "Executive Analytics",
    category: "Analytics",
    description: "Power BI-inspired KPI boards, forecast views, and cross-store drill-down reporting.",
    ownerTeam: "Leadership",
    navGroup: "Analytics"
  },
  {
    code: "WEBSITE",
    name: "Website Feed",
    category: "Commerce",
    description: "Merchandising and inventory publishing for Premier Boating Centers and Ocean Marine Group sites.",
    ownerTeam: "Digital",
    navGroup: "Commerce"
  }
];

const stores = [
  {
    code: "PBC-SRQ",
    name: "Premier Sarasota",
    city: "Sarasota",
    state: "FL",
    groupSlug: "premier-boating-centers"
  },
  {
    code: "PBC-TPA",
    name: "Premier Tampa",
    city: "Tampa",
    state: "FL",
    groupSlug: "premier-boating-centers"
  },
  {
    code: "PBC-FTL",
    name: "Premier Fort Lauderdale",
    city: "Fort Lauderdale",
    state: "FL",
    groupSlug: "premier-boating-centers"
  },
  {
    code: "OMG-CHS",
    name: "Ocean Marine Charleston",
    city: "Charleston",
    state: "SC",
    groupSlug: "ocean-marine-group"
  }
];

const users = [
  {
    email: "mmay@premier-yamaha.com",
    name: "Mason May",
    title: "Dealer Operations Lead",
    avatarInitial: "MM",
    groupSlug: "premier-boating-centers",
    storeCodes: ["PBC-SRQ", "PBC-TPA", "PBC-FTL"]
  },
  {
    email: "jcarter@premier-yamaha.com",
    name: "Jules Carter",
    title: "Sales and Service Coordinator",
    avatarInitial: "JC",
    groupSlug: "premier-boating-centers",
    storeCodes: ["PBC-SRQ", "PBC-TPA"]
  },
  {
    email: "ops@oceanmarinegroup.com",
    name: "Ocean Ops",
    title: "Executive Store Coordinator",
    avatarInitial: "OO",
    groupSlug: "ocean-marine-group",
    storeCodes: ["OMG-CHS"]
  }
];

const storeModuleAssignments = [
  {
    storeCode: "PBC-SRQ",
    moduleCode: "DMS",
    status: "Online",
    priority: 1,
    headline: "Inventory, quoting, and sold-unit coordination sit in one operating surface."
  },
  {
    storeCode: "PBC-SRQ",
    moduleCode: "PAYROLL",
    status: "Mapping",
    priority: 2,
    headline: "Comp plans and payroll approvals are modeled and ready for handoff automation."
  },
  {
    storeCode: "PBC-SRQ",
    moduleCode: "ANALYTICS",
    status: "Streaming",
    priority: 3,
    headline: "Executive scorecards stream store health, backlog, and forecast posture."
  },
  {
    storeCode: "PBC-SRQ",
    moduleCode: "WEBSITE",
    status: "Publishing",
    priority: 4,
    headline: "Published inventory and merchandising updates feed the public site in tight intervals."
  },
  {
    storeCode: "PBC-TPA",
    moduleCode: "DMS",
    status: "Online",
    priority: 1,
    headline: "Deal desk and unit readiness remain live for Tampa operators."
  },
  {
    storeCode: "PBC-TPA",
    moduleCode: "PAYROLL",
    status: "Online",
    priority: 2,
    headline: "Payroll approvals are staged with finance checkpoints already mapped."
  },
  {
    storeCode: "PBC-TPA",
    moduleCode: "ANALYTICS",
    status: "Building",
    priority: 3,
    headline: "Store-level drill-downs are staged for leadership rollout."
  },
  {
    storeCode: "PBC-TPA",
    moduleCode: "WEBSITE",
    status: "Publishing",
    priority: 4,
    headline: "Pricing and spec changes are flowing directly to the Tampa web surface."
  },
  {
    storeCode: "PBC-FTL",
    moduleCode: "DMS",
    status: "Online",
    priority: 1,
    headline: "Fort Lauderdale uses the DMS lane as the primary operational rail."
  },
  {
    storeCode: "PBC-FTL",
    moduleCode: "PAYROLL",
    status: "Mapping",
    priority: 2,
    headline: "Payroll concept workflows are aligned but still waiting on deeper finance controls."
  },
  {
    storeCode: "PBC-FTL",
    moduleCode: "ANALYTICS",
    status: "Streaming",
    priority: 3,
    headline: "Cross-store comparison views are already feeding executive snapshots."
  },
  {
    storeCode: "PBC-FTL",
    moduleCode: "WEBSITE",
    status: "Publishing",
    priority: 4,
    headline: "Merchandising pushes update the Premier web stack without duplicate entry."
  },
  {
    storeCode: "OMG-CHS",
    moduleCode: "DMS",
    status: "Online",
    priority: 1,
    headline: "Charleston keeps sold-unit and service blocker visibility in one DMS lane."
  },
  {
    storeCode: "OMG-CHS",
    moduleCode: "PAYROLL",
    status: "Building",
    priority: 2,
    headline: "Compensation rules are queued behind role and approval modeling."
  },
  {
    storeCode: "OMG-CHS",
    moduleCode: "ANALYTICS",
    status: "Streaming",
    priority: 3,
    headline: "Store telemetry is already shaped for executive drill-down and exception watching."
  },
  {
    storeCode: "OMG-CHS",
    moduleCode: "WEBSITE",
    status: "Publishing",
    priority: 4,
    headline: "Inventory and lead flow publish directly to the Ocean Marine Group site."
  }
];

const websiteFeeds = [
  {
    storeCode: "PBC-SRQ",
    brand: "Premier Boating Centers",
    domain: "premierboatingcenters.com",
    status: "Publishing",
    inventoryCount: 184,
    leadsToday: 12,
    lastSyncMinutesAgo: 2
  },
  {
    storeCode: "PBC-SRQ",
    brand: "Premier Sarasota Landing",
    domain: "sarasota.premierboatingcenters.com",
    status: "Ready",
    inventoryCount: 64,
    leadsToday: 5,
    lastSyncMinutesAgo: 6
  },
  {
    storeCode: "PBC-TPA",
    brand: "Premier Boating Centers",
    domain: "premierboatingcenters.com",
    status: "Publishing",
    inventoryCount: 152,
    leadsToday: 9,
    lastSyncMinutesAgo: 4
  },
  {
    storeCode: "PBC-FTL",
    brand: "Premier Boating Centers",
    domain: "premierboatingcenters.com",
    status: "Publishing",
    inventoryCount: 139,
    leadsToday: 7,
    lastSyncMinutesAgo: 3
  },
  {
    storeCode: "OMG-CHS",
    brand: "Ocean Marine Group",
    domain: "oceanmarinegroup.com",
    status: "Publishing",
    inventoryCount: 91,
    leadsToday: 6,
    lastSyncMinutesAgo: 5
  }
];

const salesDeals = [
  {
    storeCode: "PBC-SRQ",
    openedDaysAgo: 0,
    worksheet: "602511",
    stockNumber: "PBC-231A",
    make: "PARKER",
    model: "2300 SE",
    cashPrice: 214880,
    stage: "Open",
    customerName: "Caldwell, James",
    modelYear: 2026,
    vin: "PLX1028M26",
    tone: "teal"
  },
  {
    storeCode: "PBC-SRQ",
    openedDaysAgo: 1,
    worksheet: "602507",
    stockNumber: "OMG-118",
    make: "SEA PRO",
    model: "245 DLX",
    cashPrice: 94520,
    stage: "Quote",
    customerName: "Birkelbach, Joseph",
    modelYear: 2025,
    vin: "SPM2456J25",
    tone: "lime"
  },
  {
    storeCode: "PBC-SRQ",
    openedDaysAgo: 2,
    worksheet: "602498",
    stockNumber: "SRQ-078",
    make: "TIDEWATER",
    model: "282 CC",
    cashPrice: 188300,
    stage: "Needs Doc",
    customerName: "Mclean, Douglas",
    modelYear: 2026,
    vin: "TDW2820E26",
    tone: "salmon"
  },
  {
    storeCode: "PBC-SRQ",
    openedDaysAgo: 3,
    worksheet: "602487",
    stockNumber: "TPA-044",
    make: "AVALON",
    model: "LSZ 2385",
    cashPrice: 71440,
    stage: "Deposit",
    customerName: "Garza, Carlos",
    modelYear: 2026,
    vin: "AVL2385L26",
    tone: "gold"
  },
  {
    storeCode: "PBC-SRQ",
    openedDaysAgo: 4,
    worksheet: "602481",
    stockNumber: "FTL-210",
    make: "YAMAHA",
    model: "F250XB",
    cashPrice: 24330,
    stage: "Accessory",
    customerName: "Reyes, Diego",
    modelYear: 2026,
    vin: "YAM250B26",
    tone: "green"
  },
  {
    storeCode: "PBC-SRQ",
    openedDaysAgo: 6,
    worksheet: "602470",
    stockNumber: "PBC-311",
    make: "MAKO",
    model: "214 CC",
    cashPrice: 52480,
    stage: "Hold",
    customerName: "Rangel, Gregory",
    modelYear: 2024,
    vin: "MKO2144D24",
    tone: "violet"
  },
  {
    storeCode: "PBC-TPA",
    openedDaysAgo: 0,
    worksheet: "702540",
    stockNumber: "TPA-912",
    make: "NAUTICSTAR",
    model: "223 DC",
    cashPrice: 80210,
    stage: "Open",
    customerName: "Mackay, Kelly",
    modelYear: 2026,
    vin: "NTS2236A26",
    tone: "teal"
  },
  {
    storeCode: "PBC-TPA",
    openedDaysAgo: 1,
    worksheet: "702537",
    stockNumber: "TPA-908",
    make: "YAMAHA",
    model: "F300XSB2",
    cashPrice: 29890,
    stage: "Approved",
    customerName: "Sanchez, Jessica",
    modelYear: 2026,
    vin: "YAM300S26",
    tone: "green"
  },
  {
    storeCode: "PBC-FTL",
    openedDaysAgo: 0,
    worksheet: "802618",
    stockNumber: "FTL-311",
    make: "PURSUIT",
    model: "S 328",
    cashPrice: 388110,
    stage: "Quote",
    customerName: "Avery, Christopher",
    modelYear: 2026,
    vin: "PRS3280B26",
    tone: "teal"
  },
  {
    storeCode: "PBC-FTL",
    openedDaysAgo: 2,
    worksheet: "802607",
    stockNumber: "FTL-220",
    make: "EVERGLADES",
    model: "295 CC",
    cashPrice: 289770,
    stage: "Needs Doc",
    customerName: "Taylor, Jim",
    modelYear: 2025,
    vin: "EVG2956K25",
    tone: "salmon"
  },
  {
    storeCode: "OMG-CHS",
    openedDaysAgo: 0,
    worksheet: "902410",
    stockNumber: "CHS-120",
    make: "SEA HUNT",
    model: "Ultra 275",
    cashPrice: 169420,
    stage: "Open",
    customerName: "Kucera, Chance",
    modelYear: 2026,
    vin: "SHU2751D26",
    tone: "lime"
  }
];

const serviceOrders = [
  {
    storeCode: "PBC-SRQ",
    inDaysAgo: 0,
    roNumber: "256170",
    orderType: "Repair Order",
    customerName: "Mclean, Douglas",
    stockNumber: "PBC-231A",
    model: "2300 SE",
    serviceWriter: "Patrick Earle",
    roStatus: "Not Started",
    category: "Parts Hold",
    maker: "PARKER",
    note: "Waiting on pump kit confirmation",
    tone: "salmon"
  },
  {
    storeCode: "PBC-SRQ",
    inDaysAgo: 1,
    roNumber: "256163",
    orderType: "Repair Order",
    customerName: "Internal Sales",
    stockNumber: "SRQ-078",
    model: "282 CC",
    serviceWriter: "Dustin James",
    roStatus: "In Progress",
    category: "Rig for Sale",
    maker: "TIDEWATER",
    note: "Prep lane opened for website handoff",
    tone: "teal"
  },
  {
    storeCode: "PBC-SRQ",
    inDaysAgo: 3,
    roNumber: "256151",
    orderType: "Repair Order",
    customerName: "Lauritzen, Zachary",
    stockNumber: "OMG-214",
    model: "21 Redfisher",
    serviceWriter: "Dustin James",
    roStatus: "Ready to Work",
    category: "Complete",
    maker: "HEWES",
    note: "Estimate approved and routing clean",
    tone: "green"
  },
  {
    storeCode: "PBC-SRQ",
    inDaysAgo: 5,
    roNumber: "256144",
    orderType: "Repair Order",
    customerName: "Garza, Carlos",
    stockNumber: "TPA-044",
    model: "LSZ 2385",
    serviceWriter: "Patrick Earle",
    roStatus: "Ready to Cash",
    category: "Consignment",
    maker: "AVALON",
    note: "Final QC pending release",
    tone: "lime"
  },
  {
    storeCode: "PBC-TPA",
    inDaysAgo: 0,
    roNumber: "356201",
    orderType: "Repair Order",
    customerName: "Stanley, Tony",
    stockNumber: "TPA-912",
    model: "223 DC",
    serviceWriter: "Patrick Earle",
    roStatus: "Not Ready",
    category: "Parts Hold",
    maker: "NAUTICSTAR",
    note: "Dual-battery kit not received",
    tone: "salmon"
  },
  {
    storeCode: "PBC-FTL",
    inDaysAgo: 1,
    roNumber: "456318",
    orderType: "Repair Order",
    customerName: "Avery, Christopher",
    stockNumber: "FTL-311",
    model: "S 328",
    serviceWriter: "Dustin James",
    roStatus: "Clocked Out",
    category: "Insurance",
    maker: "Pursuit",
    note: "Technician notes posted to finance lane",
    tone: "violet"
  },
  {
    storeCode: "OMG-CHS",
    inDaysAgo: 2,
    roNumber: "556015",
    orderType: "Repair Order",
    customerName: "Kucera, Chance",
    stockNumber: "CHS-120",
    model: "Ultra 275",
    serviceWriter: "Marcus Scott",
    roStatus: "Ready to Work",
    category: "Warranty",
    maker: "SEA HUNT",
    note: "Warranty approval came through this morning",
    tone: "green"
  }
];

const partsOrderLines = [
  {
    storeCode: "PBC-SRQ",
    partNumber: "17-892267528",
    secondaryNumber: "892267528",
    description: "Pin-Float",
    supplier: "MM",
    category: "PMC",
    orderType: "NORM",
    quantity: 1,
    orderCost: 235,
    source: "REPAIRORDER-256170",
    tone: "gray"
  },
  {
    storeCode: "PBC-SRQ",
    partNumber: "35-8M0219171",
    secondaryNumber: "8M0219171",
    description: "Fuel Filter Elem",
    supplier: "MM",
    category: "PMC",
    orderType: "NORM",
    quantity: 1,
    orderCost: 1345,
    source: "REPAIRORDER-256170",
    tone: "gray"
  },
  {
    storeCode: "PBC-SRQ",
    partNumber: "46-812966A12",
    secondaryNumber: "812966A12",
    description: "Pump Kit-Water",
    supplier: "MM",
    category: "PMC",
    orderType: "NORM",
    quantity: 1,
    orderCost: 9595,
    source: "REPAIRORDER-256163",
    tone: "gray"
  },
  {
    storeCode: "PBC-SRQ",
    partNumber: "65L-14992-00-00",
    secondaryNumber: "65L1499200",
    description: "Screw, Drain",
    supplier: "YA",
    category: "PYW",
    orderType: "NORM",
    quantity: 2,
    orderCost: 524,
    source: "REPAIRORDER-256144",
    tone: "gray"
  },
  {
    storeCode: "PBC-SRQ",
    partNumber: "7-1743",
    secondaryNumber: "M198",
    description: "Circuit Breaker 50A",
    supplier: "DM",
    category: "PDO",
    orderType: "SPEC",
    quantity: 4,
    orderCost: 4642,
    source: "SERVICE-STOCK",
    tone: "gold"
  },
  {
    storeCode: "PBC-SRQ",
    partNumber: "892267A51",
    secondaryNumber: "892267A51",
    description: "Fuel Pump Kit",
    supplier: "MM",
    category: "PMC",
    orderType: "NORM",
    quantity: 1,
    orderCost: 44460,
    source: "REPAIRORDER-256151",
    tone: "teal"
  },
  {
    storeCode: "PBC-TPA",
    partNumber: "8M0100526",
    secondaryNumber: "8M0100526",
    description: "Battery Switch Kit",
    supplier: "MM",
    category: "ELEC",
    orderType: "NORM",
    quantity: 1,
    orderCost: 12880,
    source: "REPAIRORDER-356201",
    tone: "salmon"
  },
  {
    storeCode: "PBC-FTL",
    partNumber: "PRS-TRM-328",
    secondaryNumber: "PRSTRM328",
    description: "Trim Relay Harness",
    supplier: "PRS",
    category: "OEM",
    orderType: "SPEC",
    quantity: 1,
    orderCost: 21875,
    source: "REPAIRORDER-456318",
    tone: "teal"
  },
  {
    storeCode: "OMG-CHS",
    partNumber: "SEA-275-AN1",
    secondaryNumber: "SEA275AN1",
    description: "Anchor Roller Assembly",
    supplier: "SH",
    category: "OEM",
    orderType: "NORM",
    quantity: 1,
    orderCost: 18250,
    source: "REPAIRORDER-556015",
    tone: "green"
  }
];

const roSeeds = [
  { roNumber: "RO-10001", orderType: "Repair Order", customerName: "James Whitfield", stockNumber: "STK-2024-001", model: "Sea Ray 320 Sundancer", serviceWriter: "T. Morrison", roStatus: "In Progress", category: "Engine", maker: "Mercury", note: "Customer reported rough idle at low RPM", tone: "attention" },
  { roNumber: "RO-10002", orderType: "Repair Order", customerName: "Linda Bouchard", stockNumber: "STK-2023-088", model: "Boston Whaler 330 Outrage", serviceWriter: "T. Morrison", roStatus: "Waiting Parts", category: "Electrical", maker: "Yamaha", note: "Depth finder intermittent failure", tone: "neutral" },
  { roNumber: "RO-10003", orderType: "Estimate", customerName: "Kevin Marsh", stockNumber: "STK-2022-044", model: "Grady-White Canyon 271", serviceWriter: "S. Reyes", roStatus: "Open", category: "Hull", maker: "Suzuki", note: "Gel coat repair port side", tone: "neutral" },
  { roNumber: "RO-10004", orderType: "Repair Order", customerName: "Patricia Dunne", stockNumber: "STK-2021-012", model: "Chaparral 287 SSX", serviceWriter: "S. Reyes", roStatus: "Tech Complete", category: "Winterization", maker: "MerCruiser", note: "Annual winterization package", tone: "stable" },
  { roNumber: "RO-10005", orderType: "Repair Order", customerName: "Robert Sanchez", stockNumber: "STK-2024-055", model: "Malibu Wakesetter 24 MXZ", serviceWriter: "J. Park", roStatus: "Closed", category: "Upholstery", maker: "Indmar", note: "Seat repair starboard side lounge", tone: "stable" },
  { roNumber: "RO-10006", orderType: "Repair Order", customerName: "Carol Hutchins", stockNumber: "STK-2023-071", model: "Lund 208 Adventure Sport", serviceWriter: "J. Park", roStatus: "Invoice Ready", category: "Trailer", maker: "Evinrude", note: "Trailer bearing replacement + lights", tone: "accent" }
];

const partsSeeds = [
  { partNumber: "8M0123456", secondaryNumber: "", description: "Impeller Kit — Mercury 4-stroke 115hp", supplier: "Mercury Marine", category: "Engine Parts", orderType: "Special Order", quantity: 2, orderCost: 4800, source: "Purchase Order", tone: "accent" },
  { partNumber: "5033362", secondaryNumber: "5033362-1", description: "Fuel Pump Assembly — Yamaha F150", supplier: "Yamaha Marine", category: "Engine Parts", orderType: "Warranty", quantity: 1, orderCost: 18900, source: "Warranty Order", tone: "neutral" },
  { partNumber: "BW-8832100", secondaryNumber: "", description: "Boston Whaler Helm Console Bezel", supplier: "Brunswick Parts", category: "Helm & Steering", orderType: "Stock", quantity: 3, orderCost: 22500, source: "Stock Order", tone: "stable" },
  { partNumber: "MC-47-16154", secondaryNumber: "47161541", description: "MerCruiser Thermostat Kit", supplier: "Mercury Marine", category: "Cooling System", orderType: "Stock", quantity: 12, orderCost: 1200, source: "Stock Order", tone: "stable" },
  { partNumber: "YAM-6G1-13586", secondaryNumber: "", description: "Yamaha Water Pump Repair Kit", supplier: "Yamaha Marine", category: "Cooling System", orderType: "Special Order", quantity: 4, orderCost: 2850, source: "Purchase Order", tone: "accent" },
  { partNumber: "SZ-17400-93J00", secondaryNumber: "", description: "Suzuki DF 150 Lower Unit Gasket", supplier: "Suzuki Marine", category: "Lower Unit", orderType: "Stock", quantity: 6, orderCost: 3150, source: "Stock Order", tone: "stable" },
  { partNumber: "HJ-3855406T01", secondaryNumber: "3855406T02", description: "MerCruiser Exhaust Manifold 454", supplier: "Mercury Marine", category: "Exhaust", orderType: "Special Order", quantity: 1, orderCost: 52000, source: "Purchase Order", tone: "attention" },
  { partNumber: "SEA-6LZ-W0078", secondaryNumber: "", description: "Seachoice Bilge Pump 1500 GPH", supplier: "Seachoice Products", category: "Bilge & Pumps", orderType: "Stock", quantity: 8, orderCost: 5200, source: "Stock Order", tone: "stable" }
];

const dealSeeds = [
  { worksheet: "WKS-23001", stockNumber: "STK-NEW-2025-001", make: "Sea Ray", model: "320 Sundancer", cashPrice: 12895000, stage: "Finance", customerName: "Michael Torres", modelYear: 2025, vin: "SERV9109M25B", tone: "accent" },
  { worksheet: "WKS-23002", stockNumber: "STK-NEW-2025-002", make: "Boston Whaler", model: "330 Outrage", cashPrice: 19500000, stage: "Desk", customerName: "Amanda Jensen", modelYear: 2025, vin: "BW9330M25A", tone: "neutral" },
  { worksheet: "WKS-23003", stockNumber: "STK-USED-2023-001", make: "Grady-White", model: "Canyon 271", cashPrice: 8750000, stage: "Closed", customerName: "Sarah Lee", modelYear: 2023, vin: "GRGV2710M23C", tone: "stable" },
  { worksheet: "WKS-23004", stockNumber: "STK-NEW-2025-003", make: "Malibu", model: "Wakesetter 24 MXZ", cashPrice: 11200000, stage: "Lead", customerName: "David Walsh", modelYear: 2025, vin: "MBU2410M25A", tone: "neutral" }
];

const boatInventorySeeds = [
  { stockNumber: "STK-NEW-2025-001", vinHin: "SERV9109M25B", status: "Available", condition: "New", year: 2025, make: "Sea Ray", model: "320 Sundancer", lengthFt: 32, engine: "Twin MerCruiser 350 MAG", exteriorColor: "White/Blue", interiorColor: "Gray", location: "Showroom A", costCents: 9800000, priceCents: 12895000, notes: "Flagship model. Bimini top included." },
  { stockNumber: "STK-NEW-2025-002", vinHin: "BW9330M25A", status: "Available", condition: "New", year: 2025, make: "Boston Whaler", model: "330 Outrage", lengthFt: 33, engine: "Triple Yamaha F300", exteriorColor: "White", interiorColor: "Navy", location: "Showroom B", costCents: 15200000, priceCents: 19500000, notes: "Top-of-line sport fishing. Full T-top." },
  { stockNumber: "STK-USED-2023-001", vinHin: "GRGV2710M23C", status: "Available", condition: "Used", year: 2023, make: "Grady-White", model: "Canyon 271", lengthFt: 27, engine: "Twin Yamaha F200", exteriorColor: "White/Red", interiorColor: "White", location: "Lot C Row 2", costCents: 7100000, priceCents: 8750000, notes: "One owner. Low hours. Recent service." },
  { stockNumber: "STK-TRADE-2022-001", vinHin: "SMK1862M22A", status: "Available", condition: "Trade-In", year: 2022, make: "Smoker Craft", model: "Angler 182", lengthFt: 18, engine: "Mercury 115 4-Stroke", exteriorColor: "Gray/White", interiorColor: "Black", location: "Lot D Row 1", costCents: 2200000, priceCents: 2800000, notes: "Trade-in. Minor gel coat repair needed." },
  { stockNumber: "STK-NEW-2025-003", vinHin: "MBU2410M25A", status: "On Order", condition: "New", year: 2025, make: "Malibu", model: "Wakesetter 24 MXZ", lengthFt: 24, engine: "Indmar 6.2L Monsoon 450hp", exteriorColor: "Black/Gold", interiorColor: "Black", location: "On Order — ETA 30 days", costCents: 8800000, priceCents: 11200000, notes: "Customer deposit received. WKS-23004." }
];

const vendorSeeds = [
  { name: "Mercury Marine Parts", contact: "John Wells", phone: "800-555-0191", email: "jwells@mercurymarine.com", terms: "Net 30", leadDays: 5, notes: "Primary engine parts supplier" },
  { name: "Sea Ray Distribution", contact: "Lisa Park", phone: "800-555-0284", email: "lpark@searay.com", terms: "Net 15", leadDays: 7, notes: "Hull and deck components" },
  { name: "West Marine Wholesale", contact: "Tom Rivera", phone: "800-555-0372", email: "trivera@westmarine.com", terms: "COD", leadDays: 2, notes: "Accessories and hardware" },
  { name: "BRP Marine Parts", contact: "Sarah Chen", phone: "800-555-0445", email: "schen@brp.com", terms: "Net 30", leadDays: 10, notes: "Evinrude/Can-Am parts" }
];

const pricingRuleSeeds = [
  { category: "Engine Parts", costMin: 0, costMax: 5000, markupPct: 40, retailMethod: "Cost + Markup", minMarginPct: 25 },
  { category: "Engine Parts", costMin: 5000, costMax: 20000, markupPct: 32, retailMethod: "Cost + Markup", minMarginPct: 22 },
  { category: "Accessories", costMin: 0, costMax: 10000, markupPct: 50, retailMethod: "Cost + Markup", minMarginPct: 30 },
  { category: "OEM Hull Parts", costMin: 0, costMax: 999999, markupPct: 20, retailMethod: "MSRP", minMarginPct: 15 }
];

async function seed() {
  const groupIds = new Map<string, string>();

  for (const group of dealerGroups) {
    const record = await prisma.dealerGroup.upsert({
      where: { slug: group.slug },
      update: {
        name: group.name,
        description: group.description
      },
      create: group
    });

    groupIds.set(group.slug, record.id);
  }

  const moduleIds = new Map<string, string>();

  for (const moduleBlueprint of moduleBlueprints) {
    const record = await prisma.appModule.upsert({
      where: { code: moduleBlueprint.code },
      update: moduleBlueprint,
      create: moduleBlueprint
    });

    moduleIds.set(moduleBlueprint.code, record.id);
  }

  const storeIds = new Map<string, string>();

  for (const store of stores) {
    const record = await prisma.store.upsert({
      where: { code: store.code },
      update: {
        name: store.name,
        city: store.city,
        state: store.state,
        dealerGroupId: groupIds.get(store.groupSlug) ?? ""
      },
      create: {
        code: store.code,
        name: store.name,
        city: store.city,
        state: store.state,
        dealerGroupId: groupIds.get(store.groupSlug) ?? ""
      }
    });

    storeIds.set(store.code, record.id);
  }

  const userIds = new Map<string, string>();

  for (const user of users) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        title: user.title,
        avatarInitial: user.avatarInitial,
        dealerGroupId: groupIds.get(user.groupSlug) ?? ""
      },
      create: {
        email: user.email,
        name: user.name,
        title: user.title,
        avatarInitial: user.avatarInitial,
        dealerGroupId: groupIds.get(user.groupSlug) ?? ""
      }
    });

    userIds.set(user.email, record.id);
  }

  for (const user of users) {
    for (const storeCode of user.storeCodes) {
      const userId = userIds.get(user.email);
      const storeId = storeIds.get(storeCode);

      if (!userId || !storeId) {
        continue;
      }

      await prisma.userStore.upsert({
        where: {
          userId_storeId: {
            userId,
            storeId
          }
        },
        update: {},
        create: {
          userId,
          storeId
        }
      });
    }
  }

  for (const assignment of storeModuleAssignments) {
    const storeId = storeIds.get(assignment.storeCode);
    const appModuleId = moduleIds.get(assignment.moduleCode);

    if (!storeId || !appModuleId) {
      continue;
    }

    await prisma.storeModule.upsert({
      where: {
        storeId_appModuleId: {
          storeId,
          appModuleId
        }
      },
      update: {
        status: assignment.status,
        priority: assignment.priority,
        headline: assignment.headline
      },
      create: {
        storeId,
        appModuleId,
        status: assignment.status,
        priority: assignment.priority,
        headline: assignment.headline
      }
    });
  }

  for (const feed of websiteFeeds) {
    const storeId = storeIds.get(feed.storeCode);

    if (!storeId) {
      continue;
    }

    const lastSyncAt = new Date(Date.now() - feed.lastSyncMinutesAgo * 60_000);

    await prisma.websiteFeed.upsert({
      where: {
        storeId_brand: {
          storeId,
          brand: feed.brand
        }
      },
      update: {
        domain: feed.domain,
        status: feed.status,
        inventoryCount: feed.inventoryCount,
        leadsToday: feed.leadsToday,
        lastSyncAt
      },
      create: {
        brand: feed.brand,
        domain: feed.domain,
        status: feed.status,
        inventoryCount: feed.inventoryCount,
        leadsToday: feed.leadsToday,
        lastSyncAt,
        storeId
      }
    });
  }

  for (const record of salesDeals) {
    const storeId = storeIds.get(record.storeCode);

    if (!storeId) {
      continue;
    }

    await prisma.salesDeal.upsert({
      where: {
        storeId_worksheet: {
          storeId,
          worksheet: record.worksheet
        }
      },
      update: {
        openedAt: createRelativeDate(record.openedDaysAgo),
        stockNumber: record.stockNumber,
        make: record.make,
        model: record.model,
        cashPrice: record.cashPrice,
        stage: record.stage,
        customerName: record.customerName,
        modelYear: record.modelYear,
        vin: record.vin,
        tone: record.tone
      },
      create: {
        storeId,
        openedAt: createRelativeDate(record.openedDaysAgo),
        worksheet: record.worksheet,
        stockNumber: record.stockNumber,
        make: record.make,
        model: record.model,
        cashPrice: record.cashPrice,
        stage: record.stage,
        customerName: record.customerName,
        modelYear: record.modelYear,
        vin: record.vin,
        tone: record.tone
      }
    });
  }

  for (const record of serviceOrders) {
    const storeId = storeIds.get(record.storeCode);

    if (!storeId) {
      continue;
    }

    await prisma.serviceOrder.upsert({
      where: {
        storeId_roNumber: {
          storeId,
          roNumber: record.roNumber
        }
      },
      update: {
        inDate: createRelativeDate(record.inDaysAgo),
        orderType: record.orderType,
        customerName: record.customerName,
        stockNumber: record.stockNumber,
        model: record.model,
        serviceWriter: record.serviceWriter,
        roStatus: record.roStatus,
        category: record.category,
        maker: record.maker,
        note: record.note,
        detailSnapshot: null,
        tone: record.tone
      },
      create: {
        storeId,
        inDate: createRelativeDate(record.inDaysAgo),
        roNumber: record.roNumber,
        orderType: record.orderType,
        customerName: record.customerName,
        stockNumber: record.stockNumber,
        model: record.model,
        serviceWriter: record.serviceWriter,
        roStatus: record.roStatus,
        category: record.category,
        maker: record.maker,
        note: record.note,
        detailSnapshot: null,
        tone: record.tone
      }
    });
  }

  for (const record of partsOrderLines) {
    const storeId = storeIds.get(record.storeCode);

    if (!storeId) {
      continue;
    }

    await prisma.partsOrderLine.upsert({
      where: {
        storeId_partNumber_source: {
          storeId,
          partNumber: record.partNumber,
          source: record.source
        }
      },
      update: {
        secondaryNumber: record.secondaryNumber,
        description: record.description,
        supplier: record.supplier,
        category: record.category,
        orderType: record.orderType,
        quantity: record.quantity,
        orderCost: record.orderCost,
        tone: record.tone
      },
      create: {
        storeId,
        partNumber: record.partNumber,
        secondaryNumber: record.secondaryNumber,
        description: record.description,
        supplier: record.supplier,
        category: record.category,
        orderType: record.orderType,
        quantity: record.quantity,
        orderCost: record.orderCost,
        source: record.source,
        tone: record.tone
      }
    });
  }

  const firstStoreId = storeIds.get("PBC-SRQ") ?? "";

  for (const record of roSeeds) {
    await prisma.serviceOrder.upsert({
      where: { storeId_roNumber: { storeId: firstStoreId, roNumber: record.roNumber } },
      update: {
        orderType: record.orderType,
        customerName: record.customerName,
        stockNumber: record.stockNumber,
        model: record.model,
        serviceWriter: record.serviceWriter,
        roStatus: record.roStatus,
        category: record.category,
        maker: record.maker,
        note: record.note,
        tone: record.tone
      },
      create: {
        storeId: firstStoreId,
        inDate: new Date(),
        roNumber: record.roNumber,
        orderType: record.orderType,
        customerName: record.customerName,
        stockNumber: record.stockNumber,
        model: record.model,
        serviceWriter: record.serviceWriter,
        roStatus: record.roStatus,
        category: record.category,
        maker: record.maker,
        note: record.note,
        detailSnapshot: null,
        tone: record.tone
      }
    });
  }

  for (const record of partsSeeds) {
    await prisma.partsOrderLine.upsert({
      where: { storeId_partNumber_source: { storeId: firstStoreId, partNumber: record.partNumber, source: record.source } },
      update: {
        secondaryNumber: record.secondaryNumber,
        description: record.description,
        supplier: record.supplier,
        category: record.category,
        orderType: record.orderType,
        quantity: record.quantity,
        orderCost: record.orderCost,
        tone: record.tone
      },
      create: {
        storeId: firstStoreId,
        partNumber: record.partNumber,
        secondaryNumber: record.secondaryNumber,
        description: record.description,
        supplier: record.supplier,
        category: record.category,
        orderType: record.orderType,
        quantity: record.quantity,
        orderCost: record.orderCost,
        source: record.source,
        tone: record.tone
      }
    });
  }

  for (const record of dealSeeds) {
    await prisma.salesDeal.upsert({
      where: { storeId_worksheet: { storeId: firstStoreId, worksheet: record.worksheet } },
      update: {
        stockNumber: record.stockNumber,
        make: record.make,
        model: record.model,
        cashPrice: record.cashPrice,
        stage: record.stage,
        customerName: record.customerName,
        modelYear: record.modelYear,
        vin: record.vin,
        tone: record.tone
      },
      create: {
        storeId: firstStoreId,
        openedAt: new Date(),
        worksheet: record.worksheet,
        stockNumber: record.stockNumber,
        make: record.make,
        model: record.model,
        cashPrice: record.cashPrice,
        stage: record.stage,
        customerName: record.customerName,
        modelYear: record.modelYear,
        vin: record.vin,
        tone: record.tone
      }
    });
  }

  for (const record of boatInventorySeeds) {
    await prisma.boatInventoryUnit.upsert({
      where: { storeId_stockNumber: { storeId: firstStoreId, stockNumber: record.stockNumber } },
      update: {
        vinHin: record.vinHin,
        status: record.status,
        condition: record.condition,
        year: record.year,
        make: record.make,
        model: record.model,
        lengthFt: record.lengthFt,
        engine: record.engine,
        exteriorColor: record.exteriorColor,
        interiorColor: record.interiorColor,
        location: record.location,
        costCents: record.costCents,
        priceCents: record.priceCents,
        notes: record.notes
      },
      create: {
        storeId: firstStoreId,
        stockNumber: record.stockNumber,
        vinHin: record.vinHin,
        status: record.status,
        condition: record.condition,
        year: record.year,
        make: record.make,
        model: record.model,
        lengthFt: record.lengthFt,
        engine: record.engine,
        exteriorColor: record.exteriorColor,
        interiorColor: record.interiorColor,
        location: record.location,
        ageDays: 0,
        costCents: record.costCents,
        priceCents: record.priceCents,
        photosJson: "[]",
        notes: record.notes
      }
    });
  }

  for (const record of vendorSeeds) {
    const existing = await prisma.vendor.findFirst({ where: { storeId: firstStoreId, name: record.name } });
    if (!existing) {
      await prisma.vendor.create({
        data: {
          storeId: firstStoreId,
          name: record.name,
          contact: record.contact,
          phone: record.phone,
          email: record.email,
          terms: record.terms,
          leadDays: record.leadDays,
          notes: record.notes
        }
      });
    }
  }

  for (const record of pricingRuleSeeds) {
    await prisma.pricingRule.create({
      data: {
        storeId: firstStoreId,
        category: record.category,
        costMin: record.costMin,
        costMax: record.costMax,
        markupPct: record.markupPct,
        retailMethod: record.retailMethod,
        minMarginPct: record.minMarginPct
      }
    });
  }

  await seedCrmCommunicateFixtures(
    prisma,
    stores.map((store) => ({ code: store.code, name: store.name })),
    storeIds
  );
}

function createRelativeDate(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });