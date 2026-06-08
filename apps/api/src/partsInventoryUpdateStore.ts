import { prisma } from "@marine-cloud/database";
import { randomUUID } from "node:crypto";

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
  activeState: string;
  binLocation1: string;
  binLocation2: string;
  description: string;
  id: string;
  lastReceivedDate: string;
  lastSoldDate: string;
  newBinLocation1: string;
  newBinLocation2: string;
  partNumber: string;
  setupDate: string;
  supplierCode: string;
}

export interface PartsInventoryUpdateHistoryEntry {
  action: string;
  actor: string;
  detail: string;
  id: string;
  occurredAt: string;
}

export interface PartsInventoryUpdateCalculatedField {
  formula: string;
  id: string;
  name: string;
  summary: string;
}

export interface PartsInventoryUpdateStatement {
  calculatedFields: PartsInventoryUpdateCalculatedField[];
  changeSet: PartsInventoryUpdateChange[];
  createdBy: string;
  createdDate: string;
  criteria: PartsInventoryUpdateCriterion[];
  fieldCatalog: PartsInventoryUpdateField[];
  history: PartsInventoryUpdateHistoryEntry[];
  id: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  name: string;
  previewRows: PartsInventoryUpdatePreviewRow[];
  previewSummary: string;
}

const DEFAULT_ACTOR = "Premier Marine Ops";

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

export async function getPartsInventoryUpdateStatements(storeId: string) {
  await ensureStoreStatements(storeId);

  const statements = await prisma.partsInventoryUpdateStatement.findMany({
    where: { storeId },
    orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }]
  });

  return statements.map(deserializeStatementRecord);
}

export async function createPartsInventoryUpdateStatement(storeId: string, name?: string) {
  await ensureStoreStatements(storeId);

  const now = new Date();
  const timestamp = formatDateLabel(now);
  const topDisplayOrder = await getNextTopDisplayOrder(storeId);
  const template = createSeedStatements()[0];
  const statement: PartsInventoryUpdateStatement = {
    id: `parts-update-${randomUUID().slice(0, 8)}`,
    name: name?.trim() || "BE-NEW PARTS UPDATE BMT",
    lastUpdatedBy: DEFAULT_ACTOR,
    lastUpdatedAt: timestamp,
    createdBy: DEFAULT_ACTOR,
    createdDate: timestamp,
    fieldCatalog: clonePartsInventoryUpdateValue(sharedFieldCatalog),
    criteria: clonePartsInventoryUpdateValue(template.criteria),
    changeSet: clonePartsInventoryUpdateValue(template.changeSet),
    previewRows: clonePartsInventoryUpdateValue(clearBinsPreviewRows.slice(0, 4)),
    history: [
      {
        id: `history-${randomUUID().slice(0, 8)}`,
        action: "Created statement",
        actor: DEFAULT_ACTOR,
        occurredAt: formatDateTimeLabel(now),
        detail: "Created a new draft statement from the inactive-parts template."
      }
    ],
    calculatedFields: clonePartsInventoryUpdateValue(template.calculatedFields),
    previewSummary: buildPreviewSummary(4, 4)
  };

  await prisma.partsInventoryUpdateStatement.create({
    data: serializeStatementForCreate(storeId, statement, topDisplayOrder, now, now)
  });

  return clonePartsInventoryUpdateValue(statement);
}

export async function updatePartsInventoryUpdateStatement(
  storeId: string,
  statementId: string,
  update: {
    changeSet?: PartsInventoryUpdateChange[];
    criteria?: PartsInventoryUpdateCriterion[];
    name?: string;
  }
) {
  await ensureStoreStatements(storeId);

  const existingRecord = await prisma.partsInventoryUpdateStatement.findFirst({
    where: { storeId, id: statementId }
  });

  if (!existingRecord) {
    return null;
  }

  const now = new Date();
  const existing = deserializeStatementRecord(existingRecord);
  const nextName = typeof update.name === "string" ? update.name.trim() : existing.name;
  const criteriaChanged = Array.isArray(update.criteria);
  const changeSetChanged = Array.isArray(update.changeSet);
  const nameChanged = typeof update.name === "string" && nextName && nextName !== existing.name;
  const nextStatement: PartsInventoryUpdateStatement = {
    ...existing,
    name: nextName || existing.name,
    criteria: criteriaChanged ? clonePartsInventoryUpdateValue(update.criteria ?? []) : existing.criteria,
    changeSet: changeSetChanged ? clonePartsInventoryUpdateValue(update.changeSet ?? []) : existing.changeSet,
    lastUpdatedAt: formatDateLabel(now),
    lastUpdatedBy: DEFAULT_ACTOR,
    history: [
      {
        id: `history-${randomUUID().slice(0, 8)}`,
        action: nameChanged ? "Renamed statement" : criteriaChanged || changeSetChanged ? "Saved designer changes" : "Updated statement",
        actor: DEFAULT_ACTOR,
        occurredAt: formatDateTimeLabel(now),
        detail: nameChanged
          ? `Renamed statement to ${nextName}.`
          : criteriaChanged || changeSetChanged
            ? "Saved filter criteria and change-set edits."
            : "Updated statement metadata."
      },
      ...existing.history
    ]
  };

  await prisma.partsInventoryUpdateStatement.updateMany({
    where: { storeId, id: statementId },
    data: serializeStatementData(nextStatement, existingRecord.displayOrder)
  });

  return clonePartsInventoryUpdateValue(nextStatement);
}

export async function duplicatePartsInventoryUpdateStatement(storeId: string, statementId: string) {
  await ensureStoreStatements(storeId);

  const sourceRecord = await prisma.partsInventoryUpdateStatement.findFirst({
    where: { storeId, id: statementId }
  });

  if (!sourceRecord) {
    return null;
  }

  const source = deserializeStatementRecord(sourceRecord);
  const now = new Date();
  const timestamp = formatDateLabel(now);
  const topDisplayOrder = await getNextTopDisplayOrder(storeId);
  const nextStatement: PartsInventoryUpdateStatement = {
    ...clonePartsInventoryUpdateValue(source),
    id: `parts-update-${randomUUID().slice(0, 8)}`,
    name: `${source.name} COPY`,
    createdBy: DEFAULT_ACTOR,
    createdDate: timestamp,
    lastUpdatedBy: DEFAULT_ACTOR,
    lastUpdatedAt: timestamp,
    history: [
      {
        id: `history-${randomUUID().slice(0, 8)}`,
        action: "Duplicated statement",
        actor: DEFAULT_ACTOR,
        occurredAt: formatDateTimeLabel(now),
        detail: `Created a duplicate from ${source.name}.`
      },
      ...source.history.map((entry) => ({ ...entry, id: `history-${randomUUID().slice(0, 8)}` }))
    ]
  };

  await prisma.partsInventoryUpdateStatement.create({
    data: serializeStatementForCreate(storeId, nextStatement, topDisplayOrder, now, now)
  });

  return clonePartsInventoryUpdateValue(nextStatement);
}

export async function runPartsInventoryUpdateStatement(storeId: string, statementId: string) {
  await ensureStoreStatements(storeId);

  const existingRecord = await prisma.partsInventoryUpdateStatement.findFirst({
    where: { storeId, id: statementId }
  });

  if (!existingRecord) {
    return null;
  }

  const existing = deserializeStatementRecord(existingRecord);
  const now = new Date();
  const previewCount = existing.previewRows.length;
  const nextStatement: PartsInventoryUpdateStatement = {
    ...existing,
    lastUpdatedAt: formatDateLabel(now),
    lastUpdatedBy: DEFAULT_ACTOR,
    previewSummary: buildPreviewSummary(previewCount, Math.max(previewCount, previewCount * 7)),
    history: [
      {
        id: `history-${randomUUID().slice(0, 8)}`,
        action: "Ran statement",
        actor: DEFAULT_ACTOR,
        occurredAt: formatDateTimeLabel(now),
        detail: `Previewed ${previewCount} candidate rows for ${existing.name}.`
      },
      ...existing.history
    ]
  };

  await prisma.partsInventoryUpdateStatement.updateMany({
    where: { storeId, id: statementId },
    data: serializeStatementData(nextStatement, existingRecord.displayOrder)
  });

  return clonePartsInventoryUpdateValue(nextStatement);
}

export async function deletePartsInventoryUpdateStatement(storeId: string, statementId: string) {
  await ensureStoreStatements(storeId);

  const deleted = await prisma.partsInventoryUpdateStatement.deleteMany({
    where: { storeId, id: statementId }
  });

  return deleted.count > 0;
}

async function ensureStoreStatements(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, partsInventoryUpdateInitialized: true }
  });

  if (!store) {
    return;
  }

  if (store.partsInventoryUpdateInitialized) {
    return;
  }

  const existingCount = await prisma.partsInventoryUpdateStatement.count({
    where: { storeId }
  });

  if (existingCount > 0) {
    await prisma.store.update({
      where: { id: storeId },
      data: { partsInventoryUpdateInitialized: true }
    });
    return;
  }

  const seeded = createSeedStatements();

  await prisma.$transaction([
    prisma.partsInventoryUpdateStatement.createMany({
      data: seeded.map((statement, index) => serializeStatementForCreate(storeId, statement, index))
    }),
    prisma.store.update({
      where: { id: storeId },
      data: { partsInventoryUpdateInitialized: true }
    })
  ]);
}

function createSeedStatements(): PartsInventoryUpdateStatement[] {
  return clonePartsInventoryUpdateValue([
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
        {
          id: "history-0a",
          action: "Updated criteria",
          actor: "Brigette Estrada",
          occurredAt: "12/30/2024 10:42 AM",
          detail: "Extended the inactivity window through year end and confirmed zero-quantity guardrails."
        },
        {
          id: "history-0b",
          action: "Executed preview",
          actor: "Brigette Estrada",
          occurredAt: "12/30/2024 11:18 AM",
          detail: "Previewed 84 candidate rows with no price exceptions."
        }
      ],
      calculatedFields: [
        {
          id: "calc-0a",
          name: "Inactive Age Bucket",
          formula: "DATEDIFF(TODAY(), [Last Sold Date])",
          summary: "Measures the number of idle days before a part is considered stale."
        },
        {
          id: "calc-0b",
          name: "Quantity Check",
          formula: "IF([Available Quantity] = 0, 'Ready', 'Hold')",
          summary: "Flags rows that can move directly into the inactivation pass."
        }
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
        {
          id: "history-1a",
          action: "Changed field map",
          actor: "Brigette Estrada",
          occurredAt: "12/30/2024 09:13 AM",
          detail: "Updated the change set to blank both warehouse bin columns for inactive parts."
        },
        {
          id: "history-1b",
          action: "Ran preview",
          actor: "Brigette Estrada",
          occurredAt: "12/30/2024 09:27 AM",
          detail: "Preview returned 25 matching rows out of 278 records."
        },
        {
          id: "history-1c",
          action: "Reviewed exceptions",
          actor: "Brigette Estrada",
          occurredAt: "12/30/2024 09:44 AM",
          detail: "Confirmed no active-stock rows were included after applying Active State = Inactive."
        }
      ],
      calculatedFields: [
        {
          id: "calc-1a",
          name: "Blank Bin 1",
          formula: "''",
          summary: "Clears Bin Location 1 when the statement criteria are satisfied."
        },
        {
          id: "calc-1b",
          name: "Blank Bin 2",
          formula: "''",
          summary: "Clears Bin Location 2 in the same pass so inactive stock leaves the active slot map."
        },
        {
          id: "calc-1c",
          name: "Preview Group",
          formula: "IF([Active State] = 'Inactive', 'Ready', 'Hold')",
          summary: "Shows which rows are expected to flow into the preview grid."
        }
      ],
      previewSummary: "Showing 25 of 278 records found."
    }
  ]);
}

function buildPreviewSummary(displayCount: number, totalCount: number) {
  return `Showing ${displayCount} of ${totalCount} records found.`;
}

function deserializeStatementRecord(record: {
  id: string;
  name: string;
  lastUpdatedBy: string;
  lastUpdatedAtLabel: string;
  createdBy: string;
  createdDateLabel: string;
  fieldCatalogJson: string;
  criteriaJson: string;
  changeSetJson: string;
  previewRowsJson: string;
  historyJson: string;
  calculatedFieldsJson: string;
  previewSummary: string;
}) {
  return {
    id: record.id,
    name: record.name,
    lastUpdatedBy: record.lastUpdatedBy,
    lastUpdatedAt: record.lastUpdatedAtLabel,
    createdBy: record.createdBy,
    createdDate: record.createdDateLabel,
    fieldCatalog: parseJsonValue<PartsInventoryUpdateField[]>(record.fieldCatalogJson, []),
    criteria: parseJsonValue<PartsInventoryUpdateCriterion[]>(record.criteriaJson, []),
    changeSet: parseJsonValue<PartsInventoryUpdateChange[]>(record.changeSetJson, []),
    previewRows: parseJsonValue<PartsInventoryUpdatePreviewRow[]>(record.previewRowsJson, []),
    history: parseJsonValue<PartsInventoryUpdateHistoryEntry[]>(record.historyJson, []),
    calculatedFields: parseJsonValue<PartsInventoryUpdateCalculatedField[]>(record.calculatedFieldsJson, []),
    previewSummary: record.previewSummary
  } satisfies PartsInventoryUpdateStatement;
}

function serializeStatementForCreate(
  storeId: string,
  statement: PartsInventoryUpdateStatement,
  displayOrder: number,
  createdAt = new Date(),
  updatedAt = createdAt
) {
  return {
    id: statement.id,
    storeId,
    createdAt,
    updatedAt,
    ...serializeStatementData(statement, displayOrder)
  };
}

function serializeStatementData(statement: PartsInventoryUpdateStatement, displayOrder: number) {
  return {
    name: statement.name,
    displayOrder,
    lastUpdatedBy: statement.lastUpdatedBy,
    lastUpdatedAtLabel: statement.lastUpdatedAt,
    createdBy: statement.createdBy,
    createdDateLabel: statement.createdDate,
    fieldCatalogJson: JSON.stringify(statement.fieldCatalog),
    criteriaJson: JSON.stringify(statement.criteria),
    changeSetJson: JSON.stringify(statement.changeSet),
    previewRowsJson: JSON.stringify(statement.previewRows),
    historyJson: JSON.stringify(statement.history),
    calculatedFieldsJson: JSON.stringify(statement.calculatedFields),
    previewSummary: statement.previewSummary
  };
}

async function getNextTopDisplayOrder(storeId: string) {
  const currentTop = await prisma.partsInventoryUpdateStatement.findFirst({
    where: { storeId },
    orderBy: { displayOrder: "asc" },
    select: { displayOrder: true }
  });

  return (currentTop?.displayOrder ?? 0) - 1;
}

function clonePartsInventoryUpdateValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseJsonValue<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatDateLabel(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const year = value.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatDateTimeLabel(value: Date) {
  const hours = value.getHours();
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";
  const hourLabel = String(hours % 12 || 12);
  return `${formatDateLabel(value)} ${hourLabel}:${minutes} ${meridiem}`;
}
