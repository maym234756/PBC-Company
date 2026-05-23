import assert from "node:assert/strict";
import test from "node:test";

import {
  applyServiceOrderDetailMutation,
  initializeServiceOrder,
  resolveServiceOrderDetail,
  serializeServiceOrderDetail,
  type ServiceOrderActivityEntry,
  type ServiceOrderTaskEntry,
  type ServiceOrderWorkspaceRow
} from "./serviceOrderDetail.js";

const emptyTaskEntries: ServiceOrderTaskEntry[] = [];
const emptyActivityEntries: ServiceOrderActivityEntry[] = [];

function createServiceRow(overrides: Partial<ServiceOrderWorkspaceRow> = {}): ServiceOrderWorkspaceRow {
  return {
    id: "service-order-1",
    inDate: "05/20/2026",
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
    tone: "teal",
    ...overrides
  };
}

test("updateOrderType preserves repair-order metadata through an estimate round trip", () => {
  const initialRow = createServiceRow();
  const initialDetail = resolveServiceOrderDetail(null, initialRow, emptyTaskEntries, emptyActivityEntries);

  const estimateResult = applyServiceOrderDetailMutation(
    initialRow,
    initialDetail,
    {
      mode: "updateOrderType",
      orderType: "Estimate"
    },
    emptyTaskEntries,
    emptyActivityEntries
  );

  const estimateRow = {
    ...initialRow,
    ...estimateResult.rowPatch
  };
  const persistedEstimateDetail = resolveServiceOrderDetail(
    serializeServiceOrderDetail(estimateResult.detail),
    estimateRow,
    emptyTaskEntries,
    emptyActivityEntries
  );

  const repairOrderResult = applyServiceOrderDetailMutation(
    estimateRow,
    persistedEstimateDetail,
    {
      mode: "updateOrderType",
      orderType: "Repair Order"
    },
    emptyTaskEntries,
    emptyActivityEntries
  );

  assert.equal(estimateResult.rowPatch.orderType, "Estimate");
  assert.equal(estimateResult.rowPatch.roStatus, "Estimate");
  assert.equal(estimateResult.rowPatch.category, "Estimate");

  assert.equal(repairOrderResult.rowPatch.orderType, "Repair Order");
  assert.equal(repairOrderResult.rowPatch.roStatus, initialRow.roStatus);
  assert.equal(repairOrderResult.rowPatch.category, initialRow.category);
  assert.equal(repairOrderResult.rowPatch.tone, initialRow.tone);
});

test("addPart marks the service row as parts hold when the part is backordered", () => {
  const row = createServiceRow({ category: "Fresh Intake", tone: "salmon", roStatus: "Not Started" });
  const detail = resolveServiceOrderDetail(null, row, emptyTaskEntries, emptyActivityEntries);
  const targetJob = detail.jobs[0];

  const result = applyServiceOrderDetailMutation(
    row,
    detail,
    {
      mode: "addPart",
      jobId: targetJob.id,
      partNumber: "BACK-ORDER-1",
      description: "Pump kit",
      supplier: "MM",
      available: 0,
      price: 199.99,
      quantity: 1,
      category: "PMC"
    },
    emptyTaskEntries,
    emptyActivityEntries
  );

  const addedPart = result.detail.jobs[0]?.parts.find((part) => part.partNumber === "BACK-ORDER-1") ?? null;

  assert.ok(addedPart);
  assert.equal(addedPart?.available, 0);
  assert.equal(result.rowPatch.category, "Parts Hold");
  assert.equal(result.activityTone, "attention");
});

test("updateQueueRow keeps editable queue fields and generated detail copy aligned", () => {
  const row = createServiceRow();
  const detail = resolveServiceOrderDetail(null, row, emptyTaskEntries, emptyActivityEntries);

  const result = applyServiceOrderDetailMutation(
    row,
    detail,
    {
      mode: "updateQueueRow",
      inDate: "05/21/2026",
      roNumber: "256170",
      orderType: "Repair Order",
      customerName: "Mclean, Douglas",
      stockNumber: "PBC-231A",
      model: "2300 SE",
      serviceWriter: "Patrick Earle",
      roStatus: "Ready to Cash",
      category: "Consignment",
      maker: "PARKER",
      note: "Final QC pending release"
    },
    emptyTaskEntries,
    emptyActivityEntries
  );

  assert.equal(result.rowPatch.inDate, "05/21/2026");
  assert.equal(result.rowPatch.roNumber, "256170");
  assert.equal(result.rowPatch.customerName, "Mclean, Douglas");
  assert.equal(result.rowPatch.roStatus, "Ready to Cash");
  assert.equal(result.rowPatch.category, "Consignment");
  assert.equal(result.rowPatch.tone, "lime");
  assert.match(result.detail.notes, /RO 256170/);
  assert.match(result.detail.notes, /final QC pending release/i);
  assert.match(result.detail.transferNotes, /PBC-231A/);
  assert.equal(result.detail.purchaseOrder, "PO-256170");
});

test("updateQueueRow reuses estimate transition rules when the type changes", () => {
  const row = createServiceRow();
  const detail = resolveServiceOrderDetail(null, row, emptyTaskEntries, emptyActivityEntries);

  const result = applyServiceOrderDetailMutation(
    row,
    detail,
    {
      mode: "updateQueueRow",
      inDate: row.inDate,
      roNumber: row.roNumber,
      orderType: "Estimate",
      customerName: row.customerName,
      stockNumber: row.stockNumber,
      model: row.model,
      serviceWriter: row.serviceWriter,
      roStatus: row.roStatus,
      category: row.category,
      maker: row.maker,
      note: row.note
    },
    emptyTaskEntries,
    emptyActivityEntries
  );

  assert.equal(result.rowPatch.orderType, "Estimate");
  assert.equal(result.rowPatch.roStatus, "Estimate");
  assert.equal(result.rowPatch.category, "Estimate");
  assert.equal(result.rowPatch.tone, "teal");
});

test("updateQueueRow keeps larger plain-text notes intact", () => {
  const row = createServiceRow();
  const detail = resolveServiceOrderDetail(null, row, emptyTaskEntries, emptyActivityEntries);
  const longNote = "Writer follow-up: ".repeat(120);

  const result = applyServiceOrderDetailMutation(
    row,
    detail,
    {
      mode: "updateQueueRow",
      inDate: row.inDate,
      roNumber: row.roNumber,
      orderType: row.orderType,
      customerName: row.customerName,
      stockNumber: row.stockNumber,
      model: row.model,
      serviceWriter: row.serviceWriter,
      roStatus: row.roStatus,
      category: row.category,
      maker: row.maker,
      note: longNote
    },
    emptyTaskEntries,
    emptyActivityEntries
  );

  assert.equal(result.rowPatch.note, longNote.trim());
  assert.match(result.detail.notes, /Writer follow-up:/);
});

test("initializeServiceOrder seeds estimate defaults and snapshot content", () => {
  const result = initializeServiceOrder({
    id: "service-order-new",
    inDate: "05/22/2026",
    roNumber: "256171",
    orderType: "Estimate",
    customerName: "Harbor, Maya",
    stockNumber: "",
    model: "255 LXF",
    serviceWriter: "Mason May",
    maker: "",
    note: ""
  });

  assert.equal(result.row.orderType, "Estimate");
  assert.equal(result.row.roStatus, "Estimate");
  assert.equal(result.row.category, "Estimate");
  assert.equal(result.row.tone, "teal");
  assert.equal(result.row.stockNumber, "TBD");
  assert.equal(result.row.maker, "255");
  assert.match(result.detail.notes, /RO 256171/);
  assert.match(result.detail.notes, /new estimate intake awaiting writer review/i);
});