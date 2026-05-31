export type ResolvedPosConnectorRecord = {
  connectedStatus: "Connected" | "Attention";
  connectionMode: string;
  deviceType: string;
  discoverySource: string;
  externalKey: string;
  isConnected: boolean;
  label: string;
  lastSeenLabel: string;
  location: string;
  merchantId: string;
  networkHost: string;
  provider: string;
  requiresCredential: boolean;
  sourceKind: string;
  sourceLabel: string;
};

interface StorePosConnectorContext {
  storeCode: string;
  storeName: string;
}

interface PosConnectorProvider {
  loadConnectors(context: StorePosConnectorContext): Promise<ResolvedPosConnectorRecord[]>;
}

type CatalogConnectorTemplate = {
  connectedStatus: "Connected" | "Attention";
  connectionMode: string;
  deviceType: string;
  discoverySource: string;
  externalKey: string;
  hostSuffix: string;
  isConnected: boolean;
  label: string;
  lastSeenLabel: string;
  location: string;
  merchantSeed: number;
  provider: string;
  requiresCredential: boolean;
};

type JsonFeedConnectorRecord = {
  connectedStatus?: unknown;
  connectionMode?: unknown;
  deviceType?: unknown;
  discoverySource?: unknown;
  externalKey?: unknown;
  id?: unknown;
  isConnected?: unknown;
  key?: unknown;
  label?: unknown;
  lastSeenLabel?: unknown;
  location?: unknown;
  matchReason?: unknown;
  merchantId?: unknown;
  networkHost?: unknown;
  provider?: unknown;
  requiresCredential?: unknown;
  systemId?: unknown;
};

const catalogConnectorTemplates: CatalogConnectorTemplate[] = [
  {
    externalKey: "square-pos",
    label: "Square POS",
    provider: "Square",
    deviceType: "POS System",
    location: "Front counter",
    lastSeenLabel: "Last sync 2 min ago",
    connectionMode: "Cloud register sync",
    connectedStatus: "Connected",
    discoverySource: "Square sales and tender sync is live for the active store.",
    hostSuffix: "square-pos",
    merchantSeed: 2102,
    isConnected: true,
    requiresCredential: false
  },
  {
    externalKey: "lightspeed-retail",
    label: "Lightspeed Retail",
    provider: "Lightspeed",
    deviceType: "POS System",
    location: "Retail floor",
    lastSeenLabel: "Last sync 5 min ago",
    connectionMode: "Retail cloud bridge",
    connectedStatus: "Connected",
    discoverySource: "Retail items, customers, and payments are flowing through the Lightspeed bridge.",
    hostSuffix: "lightspeed-retail",
    merchantSeed: 3941,
    isConnected: true,
    requiresCredential: false
  },
  {
    externalKey: "shopify-commerce",
    label: "Shopify",
    provider: "Shopify",
    deviceType: "eCommerce",
    location: "Online storefront",
    lastSeenLabel: "Last sync 10 min ago",
    connectionMode: "Catalog + order sync",
    connectedStatus: "Connected",
    discoverySource: "Storefront catalog and order intake are synced through the commerce connector.",
    hostSuffix: "shopify-commerce",
    merchantSeed: 6103,
    isConnected: true,
    requiresCredential: false
  },
  {
    externalKey: "authorize-net-gateway",
    label: "Authorize.Net",
    provider: "Authorize.Net",
    deviceType: "Payment Gateway",
    location: "Gateway routing",
    lastSeenLabel: "Last sync 1 min ago",
    connectionMode: "Gateway token relay",
    connectedStatus: "Connected",
    discoverySource: "Card tokenization and settlement callbacks are reporting healthy.",
    hostSuffix: "authorize-net",
    merchantSeed: 7408,
    isConnected: true,
    requiresCredential: false
  },
  {
    externalKey: "stripe-payments",
    label: "Stripe",
    provider: "Stripe",
    deviceType: "Payment Gateway",
    location: "Online checkout",
    lastSeenLabel: "Last sync 3 min ago",
    connectionMode: "Payment intent bridge",
    connectedStatus: "Connected",
    discoverySource: "Checkout intents and webhook delivery are connected for the store's digital lane.",
    hostSuffix: "stripe-payments",
    merchantSeed: 7512,
    isConnected: true,
    requiresCredential: false
  },
  {
    externalKey: "quickbooks-online",
    label: "QuickBooks Online",
    provider: "QuickBooks Online",
    deviceType: "Accounting / ERP",
    location: "Back office accounting",
    lastSeenLabel: "Setup staged",
    connectionMode: "Ledger sync pipeline",
    connectedStatus: "Connected",
    discoverySource: "Accounting sync profile exists for this store, but credentials still need review before the connector can activate.",
    hostSuffix: "quickbooks-online",
    merchantSeed: 8124,
    isConnected: false,
    requiresCredential: true
  },
  {
    externalKey: "salesforce-crm",
    label: "Salesforce",
    provider: "Salesforce",
    deviceType: "CRM",
    location: "Lead pipeline",
    lastSeenLabel: "No active sync",
    connectionMode: "Lead + contact bridge",
    connectedStatus: "Connected",
    discoverySource: "Lead and customer sync rules are available, but the CRM connector is not active for this store yet.",
    hostSuffix: "salesforce-crm",
    merchantSeed: 8222,
    isConnected: false,
    requiresCredential: false
  },
  {
    externalKey: "chase-bank-feed",
    label: "Chase Bank",
    provider: "Chase Bank",
    deviceType: "Bank Feed",
    location: "Treasury reconciliation",
    lastSeenLabel: "Last sync 15 min ago",
    connectionMode: "Settlement export feed",
    connectedStatus: "Connected",
    discoverySource: "Daily settlement files are reaching the active store's reconciliation queue.",
    hostSuffix: "chase-bank",
    merchantSeed: 9041,
    isConnected: true,
    requiresCredential: false
  },
  {
    externalKey: "clover-pos",
    label: "Clover POS",
    provider: "Clover",
    deviceType: "POS System",
    location: "Service counter",
    lastSeenLabel: "Seen 9 min ago",
    connectionMode: "Local gateway",
    connectedStatus: "Connected",
    discoverySource: "Clover gateway has been detected for the service counter and is ready to connect.",
    hostSuffix: "clover-pos",
    merchantSeed: 3977,
    isConnected: false,
    requiresCredential: false
  },
  {
    externalKey: "toast-cafe-kiosk-01",
    label: "Cafe Kiosk 01",
    provider: "Toast",
    deviceType: "POS System",
    location: "Cafe kiosk",
    lastSeenLabel: "Seen 2 min ago",
    connectionMode: "Cloud token handshake",
    connectedStatus: "Connected",
    discoverySource: "Toast registration was verified from the store network, but credentials still need confirmation.",
    hostSuffix: "cafe-kiosk-01",
    merchantSeed: 9204,
    isConnected: false,
    requiresCredential: true
  },
  {
    externalKey: "oracle-netsuite",
    label: "Oracle NetSuite",
    provider: "Oracle NetSuite",
    deviceType: "ERP",
    location: "Operations finance",
    lastSeenLabel: "Connector available",
    connectionMode: "SuiteTalk data bridge",
    connectedStatus: "Connected",
    discoverySource: "ERP endpoints are registered for the store and ready for staged activation.",
    hostSuffix: "oracle-netsuite",
    merchantSeed: 9310,
    isConnected: false,
    requiresCredential: false
  },
  {
    externalKey: "xero-accounting",
    label: "Xero",
    provider: "Xero",
    deviceType: "Accounting",
    location: "Finance back office",
    lastSeenLabel: "Connector available",
    connectionMode: "Ledger export connector",
    connectedStatus: "Connected",
    discoverySource: "Accounting export endpoints are ready when the finance team wants to stage Xero.",
    hostSuffix: "xero-accounting",
    merchantSeed: 9428,
    isConnected: false,
    requiresCredential: false
  },
  {
    externalKey: "hubspot-crm",
    label: "HubSpot",
    provider: "HubSpot",
    deviceType: "CRM",
    location: "Marketing automation",
    lastSeenLabel: "Connector available",
    connectionMode: "Contact + campaign sync",
    connectedStatus: "Connected",
    discoverySource: "HubSpot webhook targets are defined and can be activated when the team is ready.",
    hostSuffix: "hubspot-crm",
    merchantSeed: 9544,
    isConnected: false,
    requiresCredential: false
  }
];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return fallback;
}

function normalizeConnectedStatus(value: unknown, isConnected: boolean): "Connected" | "Attention" {
  const normalized = normalizeString(value).toLowerCase();

  if (normalized === "attention") {
    return "Attention";
  }

  return isConnected ? "Connected" : "Connected";
}

function createStoreSlug(storeCode: string) {
  return storeCode.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createMerchantId(storeCode: string, seed: number, provider: string) {
  const normalizedStoreCode = storeCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase().padEnd(3, "X");
  const normalizedProvider = provider.trim().toLowerCase();

  if (["authorize.net", "stripe"].includes(normalizedProvider)) {
    return `GWY ${normalizedStoreCode}-${seed}`;
  }

  if (["chase bank", "bank of america"].includes(normalizedProvider)) {
    return `ACH ${normalizedStoreCode}-${seed}`;
  }

  if (["salesforce", "hubspot"].includes(normalizedProvider)) {
    return `CRM ${normalizedStoreCode}-${seed}`;
  }

  if (["quickbooks online", "oracle netsuite", "xero", "shopify"].includes(normalizedProvider)) {
    return `ACC ${normalizedStoreCode}-${seed}`;
  }

  return `MID ${normalizedStoreCode}-${seed}`;
}

function createNetworkHost(storeCode: string, hostSuffix: string, provider: string) {
  const storeSlug = createStoreSlug(storeCode);
  const normalizedProvider = provider.trim().toLowerCase();

  if (normalizedProvider === "toast") {
    return `toast://${storeSlug}-${hostSuffix}`;
  }

  if (normalizedProvider === "shopify") {
    return `https://${storeSlug}-${hostSuffix}.myshopify.com`;
  }

  if (normalizedProvider === "salesforce") {
    return `https://${storeSlug}-${hostSuffix}.my.salesforce.com`;
  }

  if (normalizedProvider === "hubspot") {
    return `https://api.hubapi.com/${storeSlug}-${hostSuffix}`;
  }

  if (normalizedProvider === "oracle netsuite") {
    return `https://${storeSlug}-${hostSuffix}.suitetalk.api.netsuite.com`;
  }

  if (normalizedProvider === "quickbooks online") {
    return `https://quickbooks.intuit.com/${storeSlug}-${hostSuffix}`;
  }

  if (normalizedProvider === "xero") {
    return `https://api.xero.com/${storeSlug}-${hostSuffix}`;
  }

  if (normalizedProvider === "authorize.net") {
    return `https://api.authorize.net/${storeSlug}-${hostSuffix}`;
  }

  if (normalizedProvider === "stripe") {
    return `https://api.stripe.com/${storeSlug}-${hostSuffix}`;
  }

  return `${storeSlug}-${hostSuffix}.local`;
}

function createFallbackFeedHost(storeCode: string, externalKey: string, provider: string) {
  return createNetworkHost(
    storeCode,
    externalKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "connector",
    provider
  );
}

class CatalogPosConnectorProvider implements PosConnectorProvider {
  async loadConnectors(context: StorePosConnectorContext) {
    return catalogConnectorTemplates.map((record) => ({
      connectedStatus: record.connectedStatus,
      connectionMode: record.connectionMode,
      deviceType: record.deviceType,
      discoverySource: record.discoverySource,
      externalKey: record.externalKey,
      isConnected: record.isConnected,
      label: record.label,
      lastSeenLabel: record.lastSeenLabel,
      location: record.location,
      merchantId: createMerchantId(context.storeCode, record.merchantSeed, record.provider),
      networkHost: createNetworkHost(context.storeCode, record.hostSuffix, record.provider),
      provider: record.provider,
      requiresCredential: record.requiresCredential,
      sourceKind: "catalog",
      sourceLabel: "default-catalog"
    } satisfies ResolvedPosConnectorRecord));
  }
}

class JsonFeedPosConnectorProvider implements PosConnectorProvider {
  constructor(private readonly feedUrl: string) {}

  async loadConnectors(context: StorePosConnectorContext) {
    const requestUrl = new URL(this.feedUrl);
    requestUrl.searchParams.set("storeCode", context.storeCode);
    requestUrl.searchParams.set("storeName", context.storeName);

    const response = await fetch(requestUrl, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`POS connector feed request failed with ${response.status}.`);
    }

    const payload = await response.json() as unknown;
    const rawRecords = Array.isArray(payload)
      ? payload
      : typeof payload === "object" && payload !== null && Array.isArray((payload as { connectors?: unknown }).connectors)
        ? (payload as { connectors: unknown[] }).connectors
        : [];

    return rawRecords
      .map((entry, index) => this.normalizeFeedRecord(context, entry, index))
      .filter((entry): entry is ResolvedPosConnectorRecord => entry !== null);
  }

  private normalizeFeedRecord(context: StorePosConnectorContext, entry: unknown, index: number) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const record = entry as JsonFeedConnectorRecord;
    const provider = normalizeString(record.provider);
    const label = normalizeString(record.label);

    if (!provider || !label) {
      return null;
    }

    const isConnected = normalizeBoolean(record.isConnected, false);
    const externalKey =
      normalizeString(record.externalKey)
      || normalizeString(record.systemId)
      || normalizeString(record.id)
      || normalizeString(record.key)
      || `${provider.toLowerCase()}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`;

    return {
      connectedStatus: normalizeConnectedStatus(record.connectedStatus, isConnected),
      connectionMode: normalizeString(record.connectionMode) || "Connector bridge",
      deviceType: normalizeString(record.deviceType) || "Terminal",
      discoverySource: normalizeString(record.discoverySource) || normalizeString(record.matchReason) || "Imported from configured POS connector feed.",
      externalKey,
      isConnected,
      label,
      lastSeenLabel: normalizeString(record.lastSeenLabel) || "Synced from connector feed",
      location: normalizeString(record.location) || context.storeName,
      merchantId: normalizeString(record.merchantId) || createMerchantId(context.storeCode, 6000 + index, provider),
      networkHost: normalizeString(record.networkHost) || createFallbackFeedHost(context.storeCode, externalKey, provider),
      provider,
      requiresCredential: normalizeBoolean(record.requiresCredential, false),
      sourceKind: "json-feed",
      sourceLabel: "env:POS_CONNECTOR_FEED_URL"
    } satisfies ResolvedPosConnectorRecord;
  }
}

export async function loadStorePosConnectorInventory(context: StorePosConnectorContext) {
  const configuredFeedUrl = process.env.POS_CONNECTOR_FEED_URL?.trim();

  if (configuredFeedUrl) {
    try {
      const feedRecords = await new JsonFeedPosConnectorProvider(configuredFeedUrl).loadConnectors(context);

      if (feedRecords.length > 0) {
        return dedupeConnectors(feedRecords);
      }
    } catch (error) {
      console.warn(
        `[my-pos] POS connector feed sync failed for ${context.storeCode}; falling back to catalog inventory.`,
        error instanceof Error ? error.message : error
      );
    }
  }

  const catalogRecords = await new CatalogPosConnectorProvider().loadConnectors(context);
  return dedupeConnectors(catalogRecords);
}

function dedupeConnectors(records: ResolvedPosConnectorRecord[]) {
  const uniqueRecords = new Map<string, ResolvedPosConnectorRecord>();

  for (const record of records) {
    uniqueRecords.set(`${record.provider.toLowerCase()}:${record.externalKey.toLowerCase()}`, record);
  }

  return [...uniqueRecords.values()];
}