export type VendorDiscountType = "none" | "percent" | "directDollar";
export type VendorDateCalculation = "none" | "daysSinceInvoiceDate" | "dayOnFollowingMonth";

export interface VendorAttachment {
  id: string;
  fileName: string;
  kind: string;
  sizeLabel: string;
  uploadedAt: string;
}

export interface VendorDirectoryRecord {
  id: string;
  vendorNumber: string;
  name: string;
  active: boolean;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  contact: string;
  phone: string;
  fedId: string;
  fax: string;
  email: string;
  productDescription: string;
  apVendorType: string;
  currentBalance: number;
  externalId: string;
  payeeName: string;
  payeeAddress1: string;
  payeeAddress2: string;
  payeeCity: string;
  payeeState: string;
  payeeZipCode: string;
  payeeCountry: string;
  payeeContact: string;
  payeePhone: string;
  payeeFedId: string;
  payeeFax: string;
  payeeEmail: string;
  usePayeeInfo: boolean;
  overrideAccount: string;
  distribution: string;
  mustHavePo: boolean;
  form1099: boolean;
  takeDiscountAfterDiscountDate: boolean;
  foreignFlooring: boolean;
  payroll: boolean;
  lastPayrollAccountUpdate: string;
  discountType: VendorDiscountType;
  discountPercent: number;
  discountDateCalculation: VendorDateCalculation;
  discountDayValue: number;
  dueDateCalculation: VendorDateCalculation;
  dueDayValue: number;
  attachments: VendorAttachment[];
}

type VendorSeedRecord = {
  active?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  address?: string;
  apVendorType?: string;
  areaCode: string;
  attachments?: VendorAttachment[];
  city: string;
  contact?: string;
  country?: string;
  currentBalance?: number;
  distribution?: string;
  email?: string;
  externalId?: string;
  fax?: string;
  fedId?: string;
  form1099?: boolean;
  lastPayrollAccountUpdate?: string;
  mustHavePo?: boolean;
  name: string;
  overrideAccount?: string;
  payroll?: boolean;
  phone?: string;
  productDescription?: string;
  state: string;
  usePayeeInfo?: boolean;
  vendorNumber?: string;
  zipCode: string;
};

const vendorSeedRecords: VendorSeedRecord[] = [
  {
    name: "DO NOT USE HUNTINGTON NATIONAL BANK",
    active: true,
    addressLine1: "ATTN HOLLY GLORY",
    addressLine2: "328 S SAGINAW ST",
    city: "FLINT",
    state: "MI",
    zipCode: "48502",
    country: "USA",
    areaCode: "810",
    phone: "",
    contact: "",
    fax: "",
    email: "",
    productDescription: "",
    apVendorType: "1099 Exempt",
    currentBalance: 0,
    externalId: "34342192",
    vendorNumber: "34342192",
    fedId: "",
    overrideAccount: "",
    distribution: "",
    mustHavePo: false,
    form1099: true,
    payroll: false,
    lastPayrollAccountUpdate: "",
    usePayeeInfo: false,
    attachments: []
  },
  { name: "Harbor Rigging Supply", address: "1440 Marina Park Drive", city: "Fort Lauderdale", state: "FL", zipCode: "33312", areaCode: "954" },
  { name: "Atlantic Hull & Gelcoat", address: "2205 Biscayne Trade Way", city: "Miami", state: "FL", zipCode: "33137", areaCode: "305" },
  { name: "Dockside Marine Electric", address: "88 Causeway Commerce Blvd", city: "Tampa", state: "FL", zipCode: "33602", areaCode: "813" },
  { name: "Bluewater Canvas & Upholstery", address: "610 Harbor Stitch Lane", city: "Stuart", state: "FL", zipCode: "34994", areaCode: "772" },
  { name: "Coastal Outboard Supply", address: "412 Engine House Road", city: "Corpus Christi", state: "TX", zipCode: "78401", areaCode: "361" },
  { name: "Apex Fiberglass Repair", address: "900 Resin Court", city: "Galveston", state: "TX", zipCode: "77550", areaCode: "409" },
  { name: "Gulf Trailer & Axle", address: "55 Crosswind Industrial", city: "Houston", state: "TX", zipCode: "77003", areaCode: "713" },
  { name: "Anchor Insurance Services", address: "320 Harbor Financial Plaza", city: "Clearwater", state: "FL", zipCode: "33755", areaCode: "727" },
  { name: "Marina Fuel Logistics", address: "701 Dock Fuel Loop", city: "New Orleans", state: "LA", zipCode: "70130", areaCode: "504" },
  { name: "Premier Hull Detail", address: "1480 Finish Line Drive", city: "Pompano Beach", state: "FL", zipCode: "33060", areaCode: "754" },
  { name: "Seafarer Electronics", address: "215 Signal Mast Way", city: "Jacksonville", state: "FL", zipCode: "32202", areaCode: "904" },
  { name: "Marine Glass Works", address: "600 Tempered Bay Avenue", city: "West Palm Beach", state: "FL", zipCode: "33401", areaCode: "561" },
  { name: "Propeller Performance Lab", address: "932 Wake Runner Court", city: "Sarasota", state: "FL", zipCode: "34236", areaCode: "941" },
  { name: "Tidewater Safety Gear", address: "410 Compliance Parkway", city: "Charleston", state: "SC", zipCode: "29403", areaCode: "843" },
  { name: "Shoreline Freight Lines", address: "250 Freight Basin Road", city: "Seattle", state: "WA", zipCode: "98134", areaCode: "206" },
  { name: "Harbor Stainless Fabrication", address: "111 Welders Point", city: "Long Beach", state: "CA", zipCode: "90802", areaCode: "562" },
  { name: "Oceanic Paint & Gelcoat", address: "72 Spray Booth Row", city: "San Diego", state: "CA", zipCode: "92101", areaCode: "619" },
  { name: "Bayview Marina Services", address: "900 Service Dock Road", city: "Annapolis", state: "MD", zipCode: "21401", areaCode: "410" },
  { name: "Dockmaster Software Support", address: "18 Launch Control Square", city: "Orlando", state: "FL", zipCode: "32801", areaCode: "407" },
  { name: "Compass Environmental Systems", address: "67 Yard Air Circle", city: "Mobile", state: "AL", zipCode: "36602", areaCode: "251" }
];

const vendorNameSuffixes = ["Marine", "Supply", "Service", "North", "South", "Harbor", "Dock", "Boatyard"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildVendorAttachments(vendorIndex: number, seed: VendorSeedRecord): VendorAttachment[] {
  if (seed.attachments) {
    return seed.attachments;
  }

  if (vendorIndex === 0 || vendorIndex % 6 !== 0) {
    return [];
  }

  return [
    {
      id: `attachment-${vendorIndex}-w9`,
      fileName: `${slugify(seed.name)}-w9.pdf`,
      kind: "Tax Document",
      sizeLabel: `${164 + (vendorIndex % 40)} KB`,
      uploadedAt: `2026-05-${`${10 + (vendorIndex % 18)}`.padStart(2, "0")}`
    },
    {
      id: `attachment-${vendorIndex}-terms`,
      fileName: `${slugify(seed.name)}-payment-terms.pdf`,
      kind: "Vendor Agreement",
      sizeLabel: `${220 + (vendorIndex % 36)} KB`,
      uploadedAt: `2026-05-${`${12 + (vendorIndex % 15)}`.padStart(2, "0")}`
    }
  ];
}

function buildVendorDirectoryRecords() {
  const records: VendorDirectoryRecord[] = [];

  for (let cycle = 0; cycle < 14; cycle += 1) {
    vendorSeedRecords.forEach((seed, seedIndex) => {
      const vendorIndex = cycle * vendorSeedRecords.length + seedIndex;
      const suffix = cycle === 0 ? "" : ` ${vendorNameSuffixes[(cycle + seedIndex) % vendorNameSuffixes.length]}`;
      const suiteLabel = cycle === 0 ? "" : ` Suite ${100 + cycle * 5 + seedIndex}`;
      const baseAddress = seed.address ?? "";
      const address1 = seed.addressLine1 ?? `${baseAddress}${suiteLabel}`.trim();
      const address2 = seed.addressLine2 ?? "";
      const derivedPhone = `${seed.areaCode}-555-${`${1100 + vendorIndex}`.slice(-4)}`;
      const derivedFax = `${seed.areaCode}-555-${`${6100 + vendorIndex}`.slice(-4)}`;
      const vendorNumber = seed.vendorNumber ?? `${34342000 + vendorIndex}`;
      const externalId = seed.externalId ?? `${34342000 + vendorIndex}`;
      const emailToken = slugify(cycle === 0 ? seed.name : `${seed.name}${suffix}`);
      const cityToken = slugify(seed.city);

      records.push({
        id: `vendor-${vendorIndex}`,
        vendorNumber,
        name: `${seed.name}${suffix}`,
        active: seed.active ?? vendorIndex % 9 !== 0,
        address1,
        address2,
        city: seed.city,
        state: seed.state,
        zipCode: seed.zipCode,
        country: seed.country ?? "USA",
        contact: seed.contact ?? `AP Desk ${seed.city}`,
        phone: seed.phone ?? derivedPhone,
        fedId: seed.fedId ?? `${1000 + vendorIndex}`,
        fax: seed.fax ?? derivedFax,
        email: seed.email ?? `${emailToken || "vendor"}@${cityToken || "marine"}.local`,
        productDescription: seed.productDescription ?? "Marine parts and service supply",
        apVendorType: seed.apVendorType ?? (vendorIndex % 4 === 0 ? "1099 Exempt" : "Open Account"),
        currentBalance: seed.currentBalance ?? (vendorIndex % 7 === 0 ? 1280.45 : 0),
        externalId,
        payeeName: "",
        payeeAddress1: "",
        payeeAddress2: "",
        payeeCity: "",
        payeeState: "",
        payeeZipCode: "",
        payeeCountry: "",
        payeeContact: "",
        payeePhone: "",
        payeeFedId: "",
        payeeFax: "",
        payeeEmail: "",
        usePayeeInfo: seed.usePayeeInfo ?? false,
        overrideAccount: seed.overrideAccount ?? "",
        distribution: seed.distribution ?? (vendorIndex === 0 ? "" : `5100-${(vendorIndex % 8) + 10}`),
        mustHavePo: seed.mustHavePo ?? vendorIndex % 5 === 0,
        form1099: seed.form1099 ?? vendorIndex % 4 === 0,
        takeDiscountAfterDiscountDate: false,
        foreignFlooring: false,
        payroll: seed.payroll ?? vendorIndex % 11 === 0,
        lastPayrollAccountUpdate: seed.lastPayrollAccountUpdate ?? (vendorIndex % 11 === 0 ? "05/28/2026" : ""),
        discountType: "none",
        discountPercent: 0,
        discountDateCalculation: "none",
        discountDayValue: 0,
        dueDateCalculation: "none",
        dueDayValue: 0,
        attachments: buildVendorAttachments(vendorIndex, seed)
      });
    });
  }

  return records;
}

export const vendorDirectoryRecords = buildVendorDirectoryRecords();

export function getVendorDirectoryRecord(vendorId: string | null | undefined) {
  if (!vendorId) {
    return null;
  }

  return vendorDirectoryRecords.find((record) => record.id === vendorId) ?? null;
}

export function formatVendorListAddress(record: VendorDirectoryRecord) {
  return [record.address1, record.address2].filter(Boolean).join(" ");
}

export function formatVendorDisplayTitle(record: Pick<VendorDirectoryRecord, "name">) {
  return `Vendor - ${record.name}`;
}