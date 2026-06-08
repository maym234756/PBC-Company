export interface PartsInventoryUpdateField {
  id: string;
  name: string;
  type: string;
}

export interface PartsInventoryUpdateCriterion {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface PartsInventoryUpdateChange {
  id: string;
  sourceField: string;
  targetField: string;
}

export interface PartsInventoryUpdatePreviewRow {
  id: string;
  partNumber: string;
  activeState: string;
  binLocation1: string;
  binLocation2: string;
  lastReceivedDate: string;
  description: string;
  setupDate: string;
  supplierCode: string;
  lastSoldDate: string;
  newBinLocation1: string;
  newBinLocation2: string;
}

export interface PartsInventoryUpdateHistoryEntry {
  id: string;
  action: string;
  actor: string;
  occurredAt: string;
  detail: string;
}

export interface PartsInventoryUpdateCalculatedField {
  id: string;
  name: string;
  formula: string;
  summary: string;
}

export interface PartsInventoryUpdateStatement {
  id: string;
  name: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  createdBy: string;
  createdDate: string;
  fieldCatalog: PartsInventoryUpdateField[];
  criteria: PartsInventoryUpdateCriterion[];
  changeSet: PartsInventoryUpdateChange[];
  previewRows: PartsInventoryUpdatePreviewRow[];
  history: PartsInventoryUpdateHistoryEntry[];
  calculatedFields: PartsInventoryUpdateCalculatedField[];
  previewSummary: string;
}

const sharedFieldCatalog: PartsInventoryUpdateField[] = [
  { id: "field-1", name: "Parts Inventory Update", type: "Money" },
  { id: "field-2", name: "Active Price", type: "Money" },
  { id: "field-3", name: "Active Price Type", type: "Text" },
  { id: "field-4", name: "Active Price Type - Num", type: "Number" },
  { id: "field-5", name: "Active State", type: "Text" },
  { id: "field-6", name: "Available Quantity", type: "Quantity" },
  { id: "field-7", name: "Bin Location 1", type: "Text" },
  { id: "field-8", name: "Bin Location 2", type: "Text" },
  { id: "field-9", name: "Category", type: "Text" },
  { id: "field-10", name: "Current Active Price", type: "Money" },
  { id: "field-11", name: "Description Upper Case", type: "Text" },
  { id: "field-12", name: "Description", type: "Text" },
  { id: "field-13", name: "Enable Price Label", type: "True/False" },
  { id: "field-14", name: "Escalation Type - Num", type: "Number" },
  { id: "field-15", name: "GL Inventory Account Code", type: "Text" },
  { id: "field-16", name: "Inventory Value", type: "Money" },
  { id: "field-17", name: "Last Count Date", type: "Date/Time" },
  { id: "field-18", name: "Last Received Date", type: "Date" },
  { id: "field-19", name: "Last Sold Date", type: "Date" },
  { id: "field-20", name: "Line", type: "Text" },
  { id: "field-21", name: "Lost Sales MTD", type: "Quantity" },
  { id: "field-22", name: "Lost Sales YTD", type: "Quantity" },
  { id: "field-23", name: "MAP Price", type: "Money" },
  { id: "field-24", name: "Margin %", type: "Percent" },
  { id: "field-25", name: "Margin", type: "Money" },
  { id: "field-26", name: "Maximum Quantity", type: "Quantity" },
  { id: "field-27", name: "Minimum Quantity", type: "Quantity" }
];

const clearBinsPreviewRows: PartsInventoryUpdatePreviewRow[] = [
  {
    id: "preview-1",
    partNumber: "123-0126",
    activeState: "Inactive",
    binLocation1: "BACK PARTS ROOM 2",
    binLocation2: "",
    lastReceivedDate: "Thu Jan 18 00:00:00 UTC 2024",
    description: "SPLIT LOOM 1/2 IN POLY",
    setupDate: "2024-01-17 09:53:34.547",
    supplierCode: "DM",
    lastSoldDate: "Mon Jan 01 00:00:00 UTC 1000",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-2",
    partNumber: "142332",
    activeState: "Inactive",
    binLocation1: "WALL0",
    binLocation2: "",
    lastReceivedDate: "Wed Sep 22 00:00:00 UTC 2024",
    description: "HOOK 2 LOT F EXT CABLE",
    setupDate: "2019-03-31 00:00:00.0",
    supplierCode: "DM",
    lastSoldDate: "Thu Jul 18 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-3",
    partNumber: "143367",
    activeState: "Inactive",
    binLocation1: "WOOD SHELF",
    binLocation2: "",
    lastReceivedDate: "Thu May 16 00:00:00 UTC 2024",
    description: "MICROFLEX/TALYSHSHOT",
    setupDate: "2020-02-14 08:05:02.19",
    supplierCode: "DM",
    lastSoldDate: "Wed Jul 17 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-4",
    partNumber: "181808",
    activeState: "Inactive",
    binLocation1: "SHELF1",
    binLocation2: "",
    lastReceivedDate: "Thu May 02 00:00:00 UTC 2024",
    description: "LANYARD",
    setupDate: "2023-08-19 10:21:35.23",
    supplierCode: "DM",
    lastSoldDate: "Mon Jul 22 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-5",
    partNumber: "183633",
    activeState: "Inactive",
    binLocation1: "D2",
    binLocation2: "",
    lastReceivedDate: "Thu Apr 11 00:00:00 UTC 2024",
    description: "THERMOSTAT",
    setupDate: "2024-04-08 15:34:46.146",
    supplierCode: "DM",
    lastSoldDate: "Mon Jul 29 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-6",
    partNumber: "187944",
    activeState: "Inactive",
    binLocation1: "C6",
    binLocation2: "",
    lastReceivedDate: "Wed Sep 06 00:00:00 UTC 2023",
    description: "MRY FUEL FILTER 10 MICRN",
    setupDate: "2017-01-30 00:00:00.0",
    supplierCode: "DM",
    lastSoldDate: "Sat Jul 06 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-7",
    partNumber: "1879831",
    activeState: "Inactive",
    binLocation1: "SHELF4",
    binLocation2: "",
    lastReceivedDate: "Fri Mar 10 00:00:00 UTC 2023",
    description: "FUEL KT ALU 1/4 10 MM SHR",
    setupDate: "2021-05-24 08:49:37.169",
    supplierCode: "DM",
    lastSoldDate: "Tue Jun 18 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-8",
    partNumber: "2000795",
    activeState: "Inactive",
    binLocation1: "SHOP",
    binLocation2: "",
    lastReceivedDate: "Wed Sep 20 00:00:00 UTC 2023",
    description: "V-YUAR BLACK 100PK",
    setupDate: "2023-09-19 10:36:11.582",
    supplierCode: "DM",
    lastSoldDate: "Wed Sep 20 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-9",
    partNumber: "2000979",
    activeState: "Inactive",
    binLocation1: "WALL3",
    binLocation2: "",
    lastReceivedDate: "Mon Feb 05 00:00:00 UTC 2024",
    description: "8\" TV-WRAP BLK 100 PK",
    setupDate: "2019-08-10 12:06:16.12",
    supplierCode: "DM",
    lastSoldDate: "Mon Feb 05 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  },
  {
    id: "preview-10",
    partNumber: "201300",
    activeState: "Inactive",
    binLocation1: "WALL6",
    binLocation2: "",
    lastReceivedDate: "Tue Oct 15 00:00:00 UTC 2021",
    description: "ARMOR LOCK (24)",
    setupDate: "2017-09-06 00:00:00.0",
    supplierCode: "DM",
    lastSoldDate: "Sat Mar 02 00:00:00 UTC 2024",
    newBinLocation1: "",
    newBinLocation2: ""
  }
];

export const partsInventoryUpdateStatements: PartsInventoryUpdateStatement[] = [
  {
    id: "parts-update-0",
    name: "BE-INACTIVATE OLD PARTS BMT",
    lastUpdatedBy: "Brigette Estrada",
    lastUpdatedAt: "12/30/2024",
    createdBy: "Brigette Estrada",
    createdDate: "06/24/2019",
    fieldCatalog: sharedFieldCatalog,
    criteria: [
      { id: "criterion-0a", field: "Parts Inventory Update > Last Sold Date", operator: "is less than", value: "12/31/2024" },
      { id: "criterion-0b", field: "Parts Inventory Update > Available Quantity", operator: "is equal to", value: "0" },
      { id: "criterion-0c", field: "Parts Inventory Update > Current Active Price", operator: "is greater than", value: "$0.00" },
      { id: "criterion-0d", field: "Parts Inventory Update > Active State", operator: "is equal to", value: "Active" }
    ],
    changeSet: [
      { id: "change-0a", sourceField: "Parts Inventory Update Change > Active State", targetField: "Parts Inventory Update > Active State" },
      { id: "change-0b", sourceField: "Parts Inventory Update Change > Enable Price Label", targetField: "Parts Inventory Update > Enable Price Label" }
    ],
    previewRows: clearBinsPreviewRows.slice(0, 6),
    history: [
      { id: "history-0a", action: "Updated criteria", actor: "Brigette Estrada", occurredAt: "12/30/2024 10:42 AM", detail: "Extended the inactivity window through year end and confirmed zero-quantity guardrails." },
      { id: "history-0b", action: "Executed preview", actor: "Brigette Estrada", occurredAt: "12/30/2024 11:18 AM", detail: "Previewed 84 candidate rows with no price exceptions." }
    ],
    calculatedFields: [
      { id: "calc-0a", name: "Inactive Age Bucket", formula: "DATEDIFF(TODAY(), [Last Sold Date])", summary: "Measures the number of idle days before a part is considered stale." },
      { id: "calc-0b", name: "Quantity Check", formula: "IF([Available Quantity] = 0, 'Ready', 'Hold')", summary: "Flags rows that can move directly into the inactivation pass." }
    ],
    previewSummary: "Showing 6 of 84 records found."
  },
  {
    id: "parts-update-1",
    name: "BE-CLEAR BINS ON INACTIVE PARTS BMT",
    lastUpdatedBy: "Brigette Estrada",
    lastUpdatedAt: "12/30/2024",
    createdBy: "Brigette Estrada",
    createdDate: "06/24/2019",
    fieldCatalog: sharedFieldCatalog,
    criteria: [
      { id: "criterion-1a", field: "Parts Inventory Update > Last Sold Date", operator: "is less than", value: "12/31/2024" },
      { id: "criterion-1b", field: "Parts Inventory Update > Available Quantity", operator: "is equal to", value: "0" },
      { id: "criterion-1c", field: "Parts Inventory Update > Current Active Price", operator: "is equal to", value: "0" },
      { id: "criterion-1d", field: "Parts Inventory Update > Bin Location 1", operator: "is not empty", value: "" },
      { id: "criterion-1e", field: "Parts Inventory Update > Active State", operator: "is equal to", value: "Inactive" }
    ],
    changeSet: [
      { id: "change-1a", sourceField: "Parts Inventory Update Change > New Bin Location 1", targetField: "Parts Inventory Update > Bin 1" },
      { id: "change-1b", sourceField: "Parts Inventory Update Change > New Bin Location 2", targetField: "Parts Inventory Update > Bin 2" }
    ],
    previewRows: clearBinsPreviewRows,
    history: [
      { id: "history-1a", action: "Changed field map", actor: "Brigette Estrada", occurredAt: "12/30/2024 09:13 AM", detail: "Updated the change set to blank both warehouse bin columns for inactive parts." },
      { id: "history-1b", action: "Ran preview", actor: "Brigette Estrada", occurredAt: "12/30/2024 09:27 AM", detail: "Preview returned 25 matching rows out of 278 records." },
      { id: "history-1c", action: "Reviewed exceptions", actor: "Brigette Estrada", occurredAt: "12/30/2024 09:44 AM", detail: "Confirmed no active-stock rows were included after applying Active State = Inactive." }
    ],
    calculatedFields: [
      { id: "calc-1a", name: "Blank Bin 1", formula: "''", summary: "Clears Bin Location 1 when the statement criteria are satisfied." },
      { id: "calc-1b", name: "Blank Bin 2", formula: "''", summary: "Clears Bin Location 2 in the same pass so inactive stock leaves the active slot map." },
      { id: "calc-1c", name: "Preview Group", formula: "IF([Active State] = 'Inactive', 'Ready', 'Hold')", summary: "Shows which rows are expected to flow into the preview grid." }
    ],
    previewSummary: "Showing 25 of 278 records found."
  }
];

export function getPartsInventoryUpdateStatement(statementId: string | null | undefined) {
  return partsInventoryUpdateStatements.find((statement) => statement.id === statementId) ?? null;
}

export function formatPartsInventoryUpdateDisplayTitle(statement: Pick<PartsInventoryUpdateStatement, "name">) {
  return `Parts Inventory Update - ${statement.name}`;
}