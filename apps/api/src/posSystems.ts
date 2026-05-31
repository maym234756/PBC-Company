import { prisma } from "@marine-cloud/database";
import { loadStorePosConnectorInventory } from "./posConnectorProviders.js";

export type PosConnectedSystemStatus = "Connected" | "Attention";
export type PosDiscoveryStatus = "Available" | "Already Connected" | "Needs Credential";
export type PosConnectionRequestMode = "Connect" | "Credential Review";
export type PosConnectionRequestState = "Requested" | "Review Queued";

export interface PosConnectedSystemRecord {
  connectionMode: string;
  id: string;
  label: string;
  lastSync: string;
  location: string;
  merchantId: string;
  provider: string;
  status: PosConnectedSystemStatus;
}

export interface PosConnectionRequestRecord {
  mode: PosConnectionRequestMode;
  requestedAt: string;
  requestedAtLabel: string;
  state: PosConnectionRequestState;
}

export interface PosDiscoveryRecord {
  deviceType: string;
  id: string;
  label: string;
  matchReason: string;
  merchantId: string;
  networkHost: string;
  provider: string;
  request: PosConnectionRequestRecord | null;
  status: PosDiscoveryStatus;
}

export interface StorePosSystemsPayload {
  connectedSystems: PosConnectedSystemRecord[];
  discoveryResults: PosDiscoveryRecord[];
  provider: string | null;
  providerOptions: string[];
  query: string;
  searchSummary: string;
}

interface PosStoreContext {
  storeCode: string;
  storeId: string;
  storeName: string;
}

interface PosSearchInput extends PosStoreContext {
  provider?: string | null;
  query?: string;
}

export interface SubmitStorePosConnectionRequestInput extends PosSearchInput {
  requestMode: "connect" | "credentialReview";
  systemId: string;
}

export interface SubmitStorePosConnectionRequestResult {
  message: string;
  payload: StorePosSystemsPayload;
}

export class PosConnectionRequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PosConnectionRequestError";
    this.statusCode = statusCode;
  }
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function createStoreSlug(storeCode: string) {
  return storeCode.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createConnectorId(storeCode: string, externalKey: string) {
  const normalizedKey = externalKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${createStoreSlug(storeCode)}-${normalizedKey}`;
}

function parseConnectedStatus(status: string): PosConnectedSystemStatus {
  return status === "Attention" ? "Attention" : "Connected";
}

function createRequestedAtLabel(requestedAt: Date | string) {
  const requestedAtDate = requestedAt instanceof Date ? requestedAt : new Date(requestedAt);
  const elapsedMs = Date.now() - requestedAtDate.getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60_000));

  if (elapsedMinutes <= 1) {
    return "Queued just now";
  }

  if (elapsedMinutes < 60) {
    return `Queued ${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `Queued ${elapsedHours} hr ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `Queued ${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
}

function scoreDiscoveryMatch(result: PosDiscoveryRecord, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;
  const exactText = `${result.provider} ${result.label}`.toLowerCase();

  if (exactText === normalizedQuery) {
    score += 220;
  }

  if (normalizeValue(result.label).includes(normalizedQuery)) {
    score += 140;
  }

  if (normalizeValue(result.provider).includes(normalizedQuery)) {
    score += 120;
  }

  if (normalizeValue(result.merchantId).includes(normalizedQuery)) {
    score += 110;
  }

  if (normalizeValue(result.networkHost).includes(normalizedQuery)) {
    score += 100;
  }

  if (normalizeValue(result.deviceType).includes(normalizedQuery)) {
    score += 70;
  }

  if (normalizeValue(result.matchReason).includes(normalizedQuery)) {
    score += 35;
  }

  if (result.request && normalizeValue(result.request.state).includes(normalizedQuery)) {
    score += 40;
  }

  return score;
}

function createSearchSummary(storeName: string, query: string, provider: string | null, resultCount: number) {
  if (query) {
    if (resultCount === 0) {
      return `No verified connection points matched "${query}" in ${storeName}.`;
    }

    return resultCount === 1
      ? `1 verified connection point ready for "${query}" in ${storeName}.`
      : `${resultCount} verified connection points ready for "${query}" in ${storeName}.`;
  }

  if (provider) {
    return `Showing ${resultCount} ${provider} connection points available for ${storeName}.`;
  }

  return `Showing ${resultCount} verified connection points available for ${storeName}.`;
}

async function syncStorePosConnectorInventory(context: PosStoreContext) {
  const inventoryRecords = await loadStorePosConnectorInventory({
    storeCode: context.storeCode,
    storeName: context.storeName
  });
  const syncedAt = new Date();

  await prisma.$transaction(async (transaction) => {
    await transaction.posConnector.updateMany({
      where: {
        storeId: context.storeId
      },
      data: {
        isInventoryActive: false
      }
    });

    for (const record of inventoryRecords) {
      const connectorId = createConnectorId(context.storeCode, record.externalKey);

      await transaction.posConnector.upsert({
        where: {
          id: connectorId
        },
        update: {
          connectionMode: record.connectionMode,
          connectionStatus: record.connectedStatus,
          deviceType: record.deviceType,
          discoverySource: record.discoverySource,
          externalKey: record.externalKey,
          isConnected: record.isConnected,
          isInventoryActive: true,
          label: record.label,
          lastSeenLabel: record.lastSeenLabel,
          lastSyncedAt: syncedAt,
          location: record.location,
          merchantId: record.merchantId,
          networkHost: record.networkHost,
          provider: record.provider,
          requiresCredential: record.requiresCredential,
          sourceKind: record.sourceKind,
          sourceLabel: record.sourceLabel
        },
        create: {
          id: connectorId,
          connectionMode: record.connectionMode,
          connectionStatus: record.connectedStatus,
          deviceType: record.deviceType,
          discoverySource: record.discoverySource,
          externalKey: record.externalKey,
          isConnected: record.isConnected,
          isInventoryActive: true,
          label: record.label,
          lastSeenLabel: record.lastSeenLabel,
          lastSyncedAt: syncedAt,
          location: record.location,
          merchantId: record.merchantId,
          networkHost: record.networkHost,
          provider: record.provider,
          requiresCredential: record.requiresCredential,
          sourceKind: record.sourceKind,
          sourceLabel: record.sourceLabel,
          storeId: context.storeId
        }
      });
    }
  });
}

async function buildStorePosSystemsPayload({ storeId, storeName, provider, query }: PosSearchInput): Promise<StorePosSystemsPayload> {
  const normalizedProvider = normalizeValue(provider);
  const normalizedQuery = normalizeValue(query);

  const connectors = await prisma.posConnector.findMany({
    where: {
      isInventoryActive: true,
      storeId
    },
    include: {
      request: true
    }
  });

  const sortedConnectors = [...connectors].sort((left, right) => {
    const connectedDelta = Number(right.isConnected) - Number(left.isConnected);

    if (connectedDelta !== 0) {
      return connectedDelta;
    }

    return left.provider.localeCompare(right.provider) || left.label.localeCompare(right.label);
  });

  const connectedSystems = sortedConnectors
    .filter((connector) => connector.isConnected)
    .map((connector) => ({
      connectionMode: connector.connectionMode,
      id: connector.id,
      label: connector.label,
      lastSync: connector.lastSeenLabel,
      location: connector.location,
      merchantId: connector.merchantId,
      provider: connector.provider,
      status: parseConnectedStatus(connector.connectionStatus)
    } satisfies PosConnectedSystemRecord));

  const discoveryResults = sortedConnectors
    .map((connector) => ({
      deviceType: connector.deviceType,
      id: connector.id,
      label: connector.label,
      matchReason: connector.discoverySource,
      merchantId: connector.merchantId,
      networkHost: connector.networkHost,
      provider: connector.provider,
      request: connector.request
        ? {
            mode: connector.request.mode as PosConnectionRequestMode,
            requestedAt: connector.request.requestedAt.toISOString(),
            requestedAtLabel: createRequestedAtLabel(connector.request.requestedAt),
            state: connector.request.state as PosConnectionRequestState
          }
        : null,
      status: connector.isConnected ? "Already Connected" : connector.requiresCredential ? "Needs Credential" : "Available"
    } satisfies PosDiscoveryRecord))
    .filter((result) => !normalizedProvider || normalizeValue(result.provider) === normalizedProvider);

  const filteredResults = normalizedQuery
    ? discoveryResults
        .map((result) => ({ result, score: scoreDiscoveryMatch(result, normalizedQuery) }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || left.result.label.localeCompare(right.result.label))
        .map((entry) => entry.result)
    : discoveryResults;

  const limitedResults = filteredResults.slice(0, 16);
  const providerOptions = ["All Providers", ...new Set(sortedConnectors.map((connector) => connector.provider))];

  return {
    connectedSystems,
    discoveryResults: limitedResults,
    provider: provider?.trim() || null,
    providerOptions,
    query: query?.trim() ?? "",
    searchSummary: createSearchSummary(storeName, query?.trim() ?? "", provider?.trim() || null, limitedResults.length)
  };
}

export async function getStorePosSystemsPayload(input: PosSearchInput): Promise<StorePosSystemsPayload> {
  await syncStorePosConnectorInventory(input);
  return buildStorePosSystemsPayload(input);
}

export async function submitStorePosConnectionRequest({
  provider,
  query,
  requestMode,
  storeCode,
  storeId,
  storeName,
  systemId
}: SubmitStorePosConnectionRequestInput): Promise<SubmitStorePosConnectionRequestResult> {
  await syncStorePosConnectorInventory({
    storeCode,
    storeId,
    storeName
  });

  const target = await prisma.posConnector.findFirst({
    where: {
      id: systemId,
      isInventoryActive: true,
      storeId
    }
  });

  if (!target) {
    throw new PosConnectionRequestError("POS system not found.", 404);
  }

  if (target.isConnected) {
    throw new PosConnectionRequestError(`${target.label} is already connected to ${storeName}.`, 409);
  }

  if (target.requiresCredential && requestMode !== "credentialReview") {
    throw new PosConnectionRequestError(`${target.label} requires credential review before activation.`);
  }

  if (!target.requiresCredential && requestMode !== "connect") {
    throw new PosConnectionRequestError(`${target.label} does not require credential review.`);
  }

  const existingRequest = await prisma.posConnectionRequest.findUnique({
    where: {
      connectorId: target.id
    }
  });

  if (!existingRequest) {
    await prisma.posConnectionRequest.create({
      data: {
        connectorId: target.id,
        mode: target.requiresCredential ? "Credential Review" : "Connect",
        requestedAt: new Date(),
        state: target.requiresCredential ? "Review Queued" : "Requested",
        storeId
      }
    });
  }

  return {
    message: existingRequest
      ? existingRequest.state === "Review Queued"
        ? `Credential review is already queued for ${target.label}.`
        : `Connection request is already queued for ${target.label}.`
      : target.requiresCredential
        ? `Credential review opened for ${target.label}. Backend validation will confirm account access before activation.`
        : `Connection request staged for ${target.label}. Backend connector sync will validate the device before activation.`,
    payload: await buildStorePosSystemsPayload({
      provider,
      query,
      storeCode,
      storeId,
      storeName
    })
  };
}
