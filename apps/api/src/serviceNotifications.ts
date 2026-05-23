import type { ServiceOrderWorkspaceRow } from "./serviceOrderDetail.js";

type CommandTone = "stable" | "accent" | "attention" | "neutral";

export type ServiceNotificationKind = "customer" | "techComplete" | "partsReceived" | "promiseRisk";

export interface ServiceNotificationEntry {
  id: string;
  customerName: string;
  detail: string;
  headline: string;
  kind: ServiceNotificationKind;
  roNumber: string;
  sourceLabel: string;
  timeLabel: string;
  tone: CommandTone;
  unread: boolean;
}

interface ServiceNotificationSourceRow extends ServiceOrderWorkspaceRow {
  updatedAt: Date;
}

interface ServiceNotificationSourceActivity {
  id: string;
  label: string;
  detail: string;
  tone: string;
  createdAt: Date;
}

interface ServiceNotificationCandidate {
  entry: ServiceNotificationEntry;
  sortDate: Date;
}

const recentUnreadWindowMs = 24 * 60 * 60 * 1000;

export function buildServiceWorkspaceNotifications(
  rows: ServiceNotificationSourceRow[],
  activities: ServiceNotificationSourceActivity[]
) {
  const activitiesByRo = new Map<string, ServiceNotificationSourceActivity[]>();

  for (const activity of activities) {
    const roNumber = extractServiceRoNumber(activity.detail);

    if (!roNumber) {
      continue;
    }

    const existingEntries = activitiesByRo.get(roNumber) ?? [];
    existingEntries.push(activity);
    activitiesByRo.set(roNumber, existingEntries);
  }

  return rows
    .map((row) => buildServiceNotificationCandidate(row, activitiesByRo.get(row.roNumber) ?? []))
    .filter((candidate): candidate is ServiceNotificationCandidate => candidate !== null)
    .sort((left, right) => right.sortDate.getTime() - left.sortDate.getTime())
    .map((candidate) => candidate.entry);
}

export function extractServiceRoNumber(detail: string) {
  const labeledMatch = detail.match(/\bRO\s*#?\s*(\d{5,})\b/i);

  if (labeledMatch?.[1]) {
    return labeledMatch[1];
  }

  const prefixedMatch = detail.match(/^(\d{5,})\s*·/);

  return prefixedMatch?.[1] ?? null;
}

function buildServiceNotificationCandidate(row: ServiceNotificationSourceRow, activities: ServiceNotificationSourceActivity[]) {
  for (const activity of activities) {
    const activityCandidate = buildServiceActivityNotification(row, activity);

    if (activityCandidate) {
      return activityCandidate;
    }
  }

  return buildServiceFallbackNotification(row);
}

function buildServiceActivityNotification(row: ServiceNotificationSourceRow, activity: ServiceNotificationSourceActivity) {
  const isUnread = Date.now() - activity.createdAt.getTime() <= recentUnreadWindowMs;

  if (activity.label === "Service part added") {
    return createNotificationCandidate(
      row,
      {
        id: activity.id,
        detail: normalizeSentence(activity.detail),
        headline: "Parts update",
        kind: "partsReceived",
        sourceLabel: "Parts",
        tone: activity.tone === "attention" ? "attention" : "stable",
        unread: isUnread
      },
      activity.createdAt
    );
  }

  if (activity.label === "Labor session added") {
    return createNotificationCandidate(
      row,
      {
        id: activity.id,
        detail: normalizeSentence(activity.detail),
        headline: "Tech completed",
        kind: "techComplete",
        sourceLabel: "Technician",
        tone: "stable",
        unread: isUnread
      },
      activity.createdAt
    );
  }

  if (activity.label === "Service job updated" && (row.roStatus === "Ready to Work" || row.category === "Complete")) {
    return createNotificationCandidate(
      row,
      {
        id: activity.id,
        detail: normalizeSentence(activity.detail),
        headline: "Tech completed",
        kind: "techComplete",
        sourceLabel: "Technician",
        tone: "stable",
        unread: isUnread
      },
      activity.createdAt
    );
  }

  if (activity.label === "Warranty claim updated") {
    return createNotificationCandidate(
      row,
      {
        id: activity.id,
        detail: normalizeSentence(activity.detail),
        headline: "Warranty exception",
        kind: "promiseRisk",
        sourceLabel: "Warranty",
        tone: "attention",
        unread: true
      },
      activity.createdAt
    );
  }

  return null;
}

function buildServiceFallbackNotification(row: ServiceNotificationSourceRow) {
  if (row.orderType === "Estimate") {
    return null;
  }

  if (row.category === "Parts Hold") {
    return createNotificationCandidate(
      row,
      {
        id: `${row.id}-parts-hold`,
        detail: `RO ${row.roNumber} is still waiting in Parts Hold. ${row.serviceWriter} needs a release update before the job can move forward.`,
        headline: "Parts hold",
        kind: "promiseRisk",
        sourceLabel: "Parts",
        tone: "attention",
        unread: true
      },
      row.updatedAt
    );
  }

  if (row.roStatus === "In Progress") {
    return createNotificationCandidate(
      row,
      {
        id: `${row.id}-customer-update`,
        detail: `${row.customerName} is still in active work. ${row.serviceWriter} owes the next customer-facing timing update for RO ${row.roNumber}.`,
        headline: "Customer update pending",
        kind: "customer",
        sourceLabel: "Customer",
        tone: "accent",
        unread: true
      },
      row.updatedAt
    );
  }

  if (row.roStatus === "Ready to Cash") {
    return createNotificationCandidate(
      row,
      {
        id: `${row.id}-pickup-confirmed`,
        detail: `${row.customerName} is staged for pickup coordination on RO ${row.roNumber}. Cashiering and writer handoff can be finalized.`,
        headline: "Pickup confirmed",
        kind: "customer",
        sourceLabel: "Customer",
        tone: "neutral",
        unread: false
      },
      row.updatedAt
    );
  }

  if (row.roStatus === "Ready to Work" || row.category === "Complete") {
    return createNotificationCandidate(
      row,
      {
        id: `${row.id}-tech-complete`,
        detail: `${row.serviceWriter}'s lane has RO ${row.roNumber} staged for writer review and next routing.`,
        headline: "Tech completed",
        kind: "techComplete",
        sourceLabel: "Technician",
        tone: "stable",
        unread: false
      },
      row.updatedAt
    );
  }

  return null;
}

function createNotificationCandidate(
  row: ServiceOrderWorkspaceRow,
  entry: Omit<ServiceNotificationEntry, "customerName" | "roNumber" | "timeLabel">,
  sortDate: Date
): ServiceNotificationCandidate {
  return {
    entry: {
      ...entry,
      customerName: row.customerName,
      roNumber: row.roNumber,
      timeLabel: formatClockTime(sortDate)
    },
    sortDate
  };
}

function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function normalizeSentence(detail: string) {
  return detail.replace(/\s+/g, " ").trim();
}