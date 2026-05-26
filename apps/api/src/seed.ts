import { prisma } from "@marine-cloud/database";

async function main() {
  // DealerGroup
  const group = await prisma.dealerGroup.upsert({
    where: { slug: "premier-marine-group" },
    update: {},
    create: {
      name: "Premier Marine Group",
      slug: "premier-marine-group",
      description: "Multi-location marine dealership group based in Florida."
    }
  });

  // Store
  const store = await prisma.store.upsert({
    where: { code: "PMC-KW" },
    update: {},
    create: {
      code: "PMC-KW",
      name: "Premier Marine — Key West, FL",
      city: "Key West",
      state: "FL",
      dealerGroupId: group.id
    }
  });

  // Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@premiermarinekw.com" },
    update: {},
    create: {
      email: "admin@premiermarinekw.com",
      name: "Alex Premier",
      title: "General Manager",
      avatarInitial: "AP",
      dealerGroupId: group.id,
      role: "admin",
      status: "Active"
    }
  });

  const writerUser = await prisma.user.upsert({
    where: { email: "writer@premiermarinekw.com" },
    update: {},
    create: {
      email: "writer@premiermarinekw.com",
      name: "Jordan Keys",
      title: "Service Writer",
      avatarInitial: "JK",
      dealerGroupId: group.id,
      role: "writer",
      status: "Active"
    }
  });

  const techUser = await prisma.user.upsert({
    where: { email: "tech@premiermarinekw.com" },
    update: {},
    create: {
      email: "tech@premiermarinekw.com",
      name: "Chris Anchors",
      title: "Marine Technician",
      avatarInitial: "CA",
      dealerGroupId: group.id,
      role: "tech",
      status: "Active"
    }
  });

  // UserStore links
  for (const user of [adminUser, writerUser, techUser]) {
    await prisma.userStore.upsert({
      where: { userId_storeId: { userId: user.id, storeId: store.id } },
      update: {},
      create: { userId: user.id, storeId: store.id }
    });
  }

  // SalesDeal records
  const deals = [
    { worksheet: "SD-2025-001", stockNumber: "S-1001", make: "Sea Ray", model: "290 Sundancer", cashPrice: 89500, stage: "Finance", customerName: "Mike Barlow", modelYear: 2025, vin: "SERVC2901A525001", tone: "stable" },
    { worksheet: "SD-2025-002", stockNumber: "S-1002", make: "Yamaha", model: "242X E-Series", cashPrice: 52000, stage: "Negotiation", customerName: "Sarah Conklin", modelYear: 2024, vin: "YAM242X24B002", tone: "accent" },
    { worksheet: "SD-2025-003", stockNumber: "S-1003", make: "Grady-White", model: "Freedom 275", cashPrice: 134000, stage: "Delivered", customerName: "Tom Marceau", modelYear: 2025, vin: "GWC275F25C003", tone: "neutral" },
  ];
  for (const deal of deals) {
    await prisma.salesDeal.upsert({
      where: { storeId_worksheet: { storeId: store.id, worksheet: deal.worksheet } },
      update: {},
      create: { ...deal, openedAt: new Date("2025-01-10"), storeId: store.id }
    });
  }

  // ServiceOrder records
  const ros = [
    { roNumber: "RO-10001", orderType: "Repair Order", customerName: "Mike Barlow", stockNumber: "S-1001", model: "290 Sundancer", serviceWriter: "Jordan Keys", roStatus: "Open", category: "Annual Service", maker: "Sea Ray", note: "Annual 100-hour service due", tone: "neutral", detailSnapshot: JSON.stringify({ jobs: [], notes: "Annual 100-hour service" }) },
    { roNumber: "RO-10002", orderType: "Repair Order", customerName: "Sarah Conklin", stockNumber: "S-1002", model: "242X E-Series", serviceWriter: "Jordan Keys", roStatus: "In Progress", category: "Engine Overhaul", maker: "Yamaha", note: "Engine overhaul — cylinder head gasket", tone: "attention", detailSnapshot: JSON.stringify({ jobs: [], notes: "Engine overhaul in progress" }) },
    { roNumber: "RO-10003", orderType: "Repair Order", customerName: "Tom Marceau", stockNumber: "S-1003", model: "Freedom 275", serviceWriter: "Jordan Keys", roStatus: "Open", category: "Gelcoat Repair", maker: "Grady-White", note: "Port side gelcoat repair near waterline", tone: "stable", detailSnapshot: JSON.stringify({ jobs: [], notes: "Gelcoat repair scheduled" }) },
    { roNumber: "RO-10004", orderType: "Estimate", customerName: "Dana Willis", stockNumber: "T-0044", model: "Bass Tracker 175", serviceWriter: "Jordan Keys", roStatus: "Estimate", category: "Trailer Inspection", maker: "Tracker", note: "Annual trailer safety inspection", tone: "neutral", detailSnapshot: JSON.stringify({ jobs: [], notes: "Trailer inspection estimate" }) },
    { roNumber: "RO-10005", orderType: "Repair Order", customerName: "Paul Navarro", stockNumber: "S-0055", model: "Cobalt 250", serviceWriter: "Jordan Keys", roStatus: "Open", category: "Winterization", maker: "Cobalt", note: "Full winterization package", tone: "neutral", detailSnapshot: JSON.stringify({ jobs: [], notes: "Winterization job" }) },
  ];
  for (const ro of ros) {
    await prisma.serviceOrder.upsert({
      where: { storeId_roNumber: { storeId: store.id, roNumber: ro.roNumber } },
      update: {},
      create: { ...ro, inDate: new Date("2025-01-15"), storeId: store.id }
    });
  }

  // PartsOrderLine records
  const parts = [
    { partNumber: "MRC-35-8M0116986", secondaryNumber: "8M0116986", description: "Mercury Oil Filter", supplier: "Mercury Marine", category: "Filters", orderType: "Stock Order", quantity: 10, orderCost: 1299, source: "MercuryParts", tone: "neutral" },
    { partNumber: "GLM-12-36150", secondaryNumber: "36150", description: "Water Pump Impeller Kit", supplier: "GLM Marine", category: "Cooling", orderType: "Stock Order", quantity: 5, orderCost: 3499, source: "GLM", tone: "neutral" },
    { partNumber: "MRC-35-60494", secondaryNumber: "60494", description: "Mercury Fuel Filter", supplier: "Mercury Marine", category: "Filters", orderType: "Special Order", quantity: 3, orderCost: 799, source: "MercuryParts", tone: "accent" },
    { partNumber: "RULE-500GPH", secondaryNumber: "500-GPH", description: "Rule 500 GPH Bilge Pump", supplier: "Rule Industries", category: "Bilge", orderType: "Stock Order", quantity: 4, orderCost: 2499, source: "MarineDepot", tone: "neutral" },
    { partNumber: "SLA-1050", secondaryNumber: "SLA1050", description: "5/16\" x 100ft Anchor Chain", supplier: "Suncor Stainless", category: "Anchoring", orderType: "Stock Order", quantity: 2, orderCost: 8900, source: "Suncor", tone: "neutral" },
    { partNumber: "ACR-1600-A", secondaryNumber: "1600A", description: "LED Navigation Light Set", supplier: "ACR Electronics", category: "Electrical", orderType: "Stock Order", quantity: 6, orderCost: 4499, source: "ACR", tone: "stable" },
    { partNumber: "OPT-DC27-12V", secondaryNumber: "DC27", description: "Optima Marine Battery 12V 750CCA", supplier: "Optima Batteries", category: "Electrical", orderType: "Stock Order", quantity: 3, orderCost: 21900, source: "Optima", tone: "neutral" },
    { partNumber: "PSS-1.250", secondaryNumber: "PSS1250", description: "PSS Prop Shaft Seal 1-1/4\"", supplier: "PYI Inc", category: "Drive/Propulsion", orderType: "Special Order", quantity: 2, orderCost: 17500, source: "PYI", tone: "attention" },
  ];
  for (const part of parts) {
    await prisma.partsOrderLine.upsert({
      where: { storeId_partNumber_source: { storeId: store.id, partNumber: part.partNumber, source: part.source } },
      update: {},
      create: { ...part, storeId: store.id }
    });
  }

  // BoatInventoryUnit records
  const units = [
    { stockNumber: "S-1001", vinHin: "SERVC2901A525001", status: "Available", condition: "New", year: 2025, make: "Sea Ray", model: "290 Sundancer", lengthFt: 29, engine: "Twin MerCruiser 6.2L", exteriorColor: "White/Silver", interiorColor: "Charcoal", location: "Showroom A", ageDays: 45, costCents: 7250000, priceCents: 8950000, photosJson: "[]", notes: "Floor model, full demo rigging" },
    { stockNumber: "S-1002", vinHin: "YAM242X24B002", status: "Available", condition: "New", year: 2024, make: "Yamaha", model: "242X E-Series", lengthFt: 24, engine: "Twin Yamaha F200", exteriorColor: "Blue/White", interiorColor: "Gray", location: "Lot B", ageDays: 90, costCents: 4200000, priceCents: 5200000, photosJson: "[]", notes: "In-stock unit" },
    { stockNumber: "S-1003", vinHin: "GWC275F25C003", status: "Sold", condition: "New", year: 2025, make: "Grady-White", model: "Freedom 275", lengthFt: 27, engine: "Twin Yamaha F200", exteriorColor: "White", interiorColor: "Tan", location: "Delivery Bay", ageDays: 12, costCents: 10800000, priceCents: 13400000, photosJson: "[]", notes: "Delivered to customer 2025-01-20" },
    { stockNumber: "S-2001", vinHin: "PENDING2025004", status: "On Order", condition: "New", year: 2025, make: "Boston Whaler", model: "350 Realm", lengthFt: 35, engine: "Triple Mercury 300 V8", exteriorColor: "White/Blue", interiorColor: "White", location: "On Order", ageDays: 0, costCents: 28000000, priceCents: 34500000, photosJson: "[]", notes: "Factory order ETA March 2025" },
  ];
  for (const unit of units) {
    await prisma.boatInventoryUnit.upsert({
      where: { storeId_stockNumber: { storeId: store.id, stockNumber: unit.stockNumber } },
      update: {},
      create: { ...unit, storeId: store.id }
    });
  }

  // Vendor records
  const vendors = [
    { name: "Mercury Marine Parts", contact: "Bob Fittings", phone: "800-555-0101", email: "parts@mercurymarine.com", terms: "Net 30", leadDays: 3, notes: "Primary OEM parts supplier" },
    { name: "GLM Marine", contact: "Lisa Keel", phone: "800-555-0202", email: "orders@glmmarine.com", terms: "Net 15", leadDays: 5, notes: "Aftermarket engine parts" },
    { name: "Marine Depot", contact: "Tom Anchor", phone: "800-555-0303", email: "wholesale@marinedepot.com", terms: "Net 30", leadDays: 7, notes: "General marine accessories" },
  ];
  for (const vendor of vendors) {
    const existing = await prisma.vendor.findFirst({ where: { storeId: store.id, name: vendor.name } });
    if (!existing) {
      await prisma.vendor.create({ data: { ...vendor, storeId: store.id } });
    }
  }

  // PricingRule records
  const pricingRules = [
    { category: "Filters", costMin: 0, costMax: 2000, markupPct: 40, retailMethod: "Cost + Markup", minMarginPct: 30 },
    { category: "Electrical", costMin: 0, costMax: 50000, markupPct: 35, retailMethod: "Cost + Markup", minMarginPct: 25 },
    { category: "Engine Parts", costMin: 0, costMax: 100000, markupPct: 30, retailMethod: "Cost + Markup", minMarginPct: 20 },
    { category: "Accessories", costMin: 0, costMax: 10000, markupPct: 45, retailMethod: "Cost + Markup", minMarginPct: 35 },
    { category: "Special Order", costMin: 0, costMax: 9999999, markupPct: 25, retailMethod: "Cost + Markup", minMarginPct: 15 },
  ];
  for (const rule of pricingRules) {
    const existing = await prisma.pricingRule.findFirst({ where: { storeId: store.id, category: rule.category } });
    if (!existing) {
      await prisma.pricingRule.create({ data: { ...rule, storeId: store.id } });
    }
  }

  console.log("✅ Seed complete — Premier Marine Key West demo data loaded.");
}

main().catch(console.error);
