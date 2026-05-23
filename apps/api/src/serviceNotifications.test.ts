import assert from "node:assert/strict";
import test from "node:test";

import { buildServiceWorkspaceNotifications, extractServiceRoNumber } from "./serviceNotifications.js";
import type { ServiceOrderWorkspaceRow } from "./serviceOrderDetail.js";

function createServiceRow(overrides: Partial<ServiceOrderWorkspaceRow> = {}) {
  return {
    id: "service-order-1",
    inDate: "05/21/2026",
    roNumber: "256170",
    orderType: "Repair Order" as const,
    customerName: "Mclean, Douglas",
    stockNumber: "PBC-231A",
    model: "2300 SE",
    serviceWriter: "Patrick Earle",
    roStatus: "Not Started",
    category: "Parts Hold",
    maker: "PARKER",
    note: "Waiting on pump kit confirmation",
    tone: "salmon",
    ...overrides
  };
}

test("extractServiceRoNumber parses both service activity and service task detail formats", () => {
  assert.equal(extractServiceRoNumber("RO 256170 added part PUMP-KIT-1 to Cooling"), "256170");
  assert.equal(extractServiceRoNumber("256170 · RO Jacket · Front Desk"), "256170");
  assert.equal(extractServiceRoNumber("No record id here"), null);
});

test("buildServiceWorkspaceNotifications prefers persisted service activity over row fallback", () => {
  const notifications = buildServiceWorkspaceNotifications(
    [
      {
        ...createServiceRow(),
        updatedAt: new Date("2026-05-21T20:00:00.000Z")
      },
      {
        ...createServiceRow({
          id: "service-order-2",
          roNumber: "256163",
          customerName: "Internal Sales",
          stockNumber: "SRQ-078",
          model: "282 CC",
          serviceWriter: "Dustin James",
          roStatus: "In Progress",
          category: "Rig for Sale",
          maker: "TIDEWATER",
          note: "Prep lane opened for website handoff"
        }),
        updatedAt: new Date("2026-05-21T19:00:00.000Z")
      }
    ],
    [
      {
        id: "activity-1",
        label: "Service part added",
        detail: "RO 256170 added part PUMP-KIT-1 to DIAG WATER PUMP / COOLING.",
        tone: "attention",
        createdAt: new Date("2026-05-21T21:08:00.000Z")
      }
    ]
  );

  assert.equal(notifications.length, 2);
  assert.equal(notifications[0]?.roNumber, "256170");
  assert.equal(notifications[0]?.headline, "Parts update");
  assert.equal(notifications[0]?.kind, "partsReceived");
  assert.equal(notifications[0]?.sourceLabel, "Parts");
  assert.equal(notifications[1]?.roNumber, "256163");
  assert.equal(notifications[1]?.headline, "Customer update pending");
});

test("buildServiceWorkspaceNotifications falls back to row state and omits quiet estimates", () => {
  const notifications = buildServiceWorkspaceNotifications(
    [
      {
        ...createServiceRow({
          id: "service-order-3",
          roNumber: "256151",
          customerName: "Lauritzen, Zachary",
          roStatus: "Ready to Work",
          category: "Complete",
          maker: "HEWES",
          serviceWriter: "Dustin James"
        }),
        updatedAt: new Date("2026-05-21T18:00:00.000Z")
      },
      {
        ...createServiceRow({
          id: "service-order-4",
          roNumber: "256144",
          customerName: "Garza, Carlos",
          roStatus: "Ready to Cash",
          category: "Consignment",
          maker: "AVALON"
        }),
        updatedAt: new Date("2026-05-21T17:00:00.000Z")
      },
      {
        ...createServiceRow({
          id: "service-order-5",
          roNumber: "256180",
          orderType: "Estimate",
          roStatus: "Estimate",
          category: "Estimate",
          tone: "teal",
          customerName: "Estimate Customer"
        }),
        updatedAt: new Date("2026-05-21T16:00:00.000Z")
      }
    ],
    []
  );

  assert.deepEqual(
    notifications.map((entry) => [entry.roNumber, entry.headline]),
    [
      ["256151", "Tech completed"],
      ["256144", "Pickup confirmed"]
    ]
  );
});