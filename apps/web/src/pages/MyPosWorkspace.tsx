import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createPosConnectionRequest,
  getStorePosSystems,
  type PosConnectedSystemRecord,
  type PosDiscoveryRecord,
  type StorePosSystemsResponse
} from "../api";

const defaultProviderOptions = ["All Providers"];
const connectionTabs = [
  { id: "all", label: "All Connections" },
  { id: "pos", label: "POS Systems" },
  { id: "processor", label: "Gateways & Processors" },
  { id: "bank", label: "Banks" },
  { id: "crm", label: "CRMs" },
  { id: "erp", label: "ERPs" },
  { id: "other", label: "Other" }
] as const;
const statusFilterOptions = [
  { id: "all", label: "All Status" },
  { id: "connected", label: "Connected" },
  { id: "attention", label: "Attention" },
  { id: "pending", label: "Pending Setup" },
  { id: "queued", label: "Queued" }
] as const;
const connectionDisplayOrder = [
  "Square",
  "Lightspeed",
  "Shopify",
  "Authorize.Net",
  "Stripe",
  "QuickBooks Online",
  "Salesforce",
  "Chase Bank",
  "Clover",
  "Toast",
  "Oracle NetSuite",
  "Xero",
  "HubSpot"
] as const;
const popularConnectionOrder = ["Clover", "Toast", "Oracle NetSuite", "Xero", "HubSpot", "QuickBooks Online", "Salesforce"] as const;

type ConnectionCategory = (typeof connectionTabs)[number]["id"];
type ProviderConnectionCategory = Exclude<ConnectionCategory, "all">;
type ConnectionStatusFilter = (typeof statusFilterOptions)[number]["id"];
type ConnectionGridEntry =
  | {
      category: ProviderConnectionCategory;
      kind: "connected";
      provider: string;
      system: PosConnectedSystemRecord;
    }
  | {
      category: ProviderConnectionCategory;
      kind: "discovery";
      provider: string;
      result: PosDiscoveryRecord;
    };

interface MyPosWorkspaceProps {
  storeId: string;
  storeName: string;
}

function getViewportSnapshot() {
  if (typeof window === "undefined") {
    return { height: 900, width: 1440 };
  }

  return {
    height: window.innerHeight,
    width: window.innerWidth
  };
}

function getResponsiveOverviewConfig(width: number) {
  if (width >= 2800) {
    return { expandedEntries: 12, featuredEntries: 5, popularConnections: 5 };
  }

  if (width >= 1800) {
    return { expandedEntries: 10, featuredEntries: 4, popularConnections: 4 };
  }

  if (width >= 1200) {
    return { expandedEntries: 8, featuredEntries: 3, popularConnections: 3 };
  }

  if (width >= 820) {
    return { expandedEntries: 6, featuredEntries: 2, popularConnections: 2 };
  }

  if (width >= 640) {
    return { expandedEntries: 5, featuredEntries: 2, popularConnections: 2 };
  }

  return { expandedEntries: 6, featuredEntries: 4, popularConnections: 3 };
}

function normalizeProviderKey(value: string) {
  return value.trim().toLowerCase();
}

function getProviderPriority(provider: string, order: readonly string[]) {
  const index = order.findIndex((entry) => normalizeProviderKey(entry) === normalizeProviderKey(provider));
  return index >= 0 ? index : order.length + 1;
}

function getConnectionCategory(provider: string): ProviderConnectionCategory {
  switch (normalizeProviderKey(provider)) {
    case "lightspeed":
    case "clover":
    case "square":
    case "toast":
      return "pos";
    case "authorize.net":
    case "stripe":
    case "finovo":
      return "processor";
    case "chase":
    case "chase bank":
    case "bank of america":
      return "bank";
    case "salesforce":
    case "hubspot":
      return "crm";
    case "oracle netsuite":
    case "netsuite":
    case "quickbooks":
    case "quickbooks online":
    case "shopify":
    case "xero":
      return "erp";
    default:
      return "other";
  }
}

function getConnectionTypeLabel(category: ProviderConnectionCategory) {
  switch (category) {
    case "pos":
      return "POS System";
    case "processor":
      return "Payment Gateway";
    case "bank":
      return "Bank Feed";
    case "crm":
      return "CRM";
    case "erp":
      return "ERP / Commerce";
    default:
      return "External Service";
  }
}

function getProviderMonogram(provider: string) {
  const parts = provider.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "CN";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getChipTone(status: string) {
  switch (status) {
    case "Connected":
    case "Available":
      return "tone-stable";
    case "Attention":
    case "Pending Setup":
      return "tone-attention";
    default:
      return "tone-neutral";
  }
}

function getDiscoveryDisplayStatus(result: PosDiscoveryRecord) {
  if (result.request) {
    return result.request.state;
  }

  if (result.status === "Needs Credential") {
    return "Pending Setup";
  }

  if (result.status === "Available") {
    return "Disconnected";
  }

  return "Connected";
}

function getEntryStatus(entry: ConnectionGridEntry): ConnectionStatusFilter {
  if (entry.kind === "connected") {
    return entry.system.status === "Attention" ? "attention" : "connected";
  }

  if (entry.result.request) {
    return "queued";
  }

  return "pending";
}

export function MyPosWorkspace({ storeId, storeName }: MyPosWorkspaceProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [viewport, setViewport] = useState(getViewportSnapshot);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("All Providers");
  const [activeTab, setActiveTab] = useState<ConnectionCategory>("all");
  const [selectedStatus, setSelectedStatus] = useState<ConnectionStatusFilter>("all");
  const [appliedSearch, setAppliedSearch] = useState<{ provider?: string; query?: string }>({});
  const [payload, setPayload] = useState<StorePosSystemsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittingSystemId, setSubmittingSystemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setErrorMessage(null);

    getStorePosSystems(storeId, appliedSearch.query, appliedSearch.provider)
      .then((nextPayload) => {
        if (cancelled) {
          return;
        }

        setPayload(nextPayload);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load POS systems.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appliedSearch.provider, appliedSearch.query, storeId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function handleViewportChange() {
      setViewport(getViewportSnapshot());
    }

    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, []);

  const connectedSystems = payload?.connectedSystems ?? [];
  const visibleDiscoveryResults = payload?.discoveryResults ?? [];
  const providerOptions = payload?.providerOptions ?? defaultProviderOptions;
  const connectedIds = new Set(connectedSystems.map((system) => system.id));
  const availableDiscoveryResults = visibleDiscoveryResults.filter((result) => !connectedIds.has(result.id));
  const connectionEntries: ConnectionGridEntry[] = [
    ...connectedSystems.map((system) => ({
      category: getConnectionCategory(system.provider),
      kind: "connected" as const,
      provider: system.provider,
      system
    })),
    ...availableDiscoveryResults.map((result) => ({
      category: getConnectionCategory(result.provider),
      kind: "discovery" as const,
      provider: result.provider,
      result
    }))
  ];
  const connectedCount = connectedSystems.filter((system) => system.status === "Connected").length;
  const attentionCount = connectedSystems.filter((system) => system.status === "Attention").length;
  const queuedCount = availableDiscoveryResults.filter((result) => Boolean(result.request)).length;
  const pendingCount = availableDiscoveryResults.filter((result) => !result.request).length;
  const providerCount = providerOptions.filter((provider) => provider !== "All Providers").length;
  const activeProviderScope = payload?.provider ?? (selectedProvider === "All Providers" ? "All Providers" : selectedProvider);
  const activeQueryScope = payload?.query || appliedSearch.query || "All connections";
  const activeTabLabel = connectionTabs.find((tab) => tab.id === activeTab)?.label ?? "All Connections";
  const sortedEntries = [...connectionEntries].sort((left, right) => {
    const leftQueued = left.kind === "discovery" && left.result.request ? 1 : 0;
    const rightQueued = right.kind === "discovery" && right.result.request ? 1 : 0;

    if (leftQueued !== rightQueued) {
      return rightQueued - leftQueued;
    }

    const priorityDelta = getProviderPriority(left.provider, connectionDisplayOrder) - getProviderPriority(right.provider, connectionDisplayOrder);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    if (left.kind !== right.kind) {
      return left.kind === "connected" ? -1 : 1;
    }

    const leftLabel = left.kind === "connected" ? left.system.label : left.result.label;
    const rightLabel = right.kind === "connected" ? right.system.label : right.result.label;
    return leftLabel.localeCompare(rightLabel);
  });
  const filteredEntries = sortedEntries.filter((entry) => {
    const matchesTab = activeTab === "all" || entry.category === activeTab;
    const matchesStatus = selectedStatus === "all" || getEntryStatus(entry) === selectedStatus;
    return matchesTab && matchesStatus;
  });
  const isDefaultOverview = activeTab === "all" && selectedStatus === "all" && !appliedSearch.provider && !appliedSearch.query;
  const isPhoneViewport = viewport.width < 640;
  const responsiveOverviewConfig = getResponsiveOverviewConfig(viewport.width);
  const featuredEntryLimit = responsiveOverviewConfig.featuredEntries;
  const expandedEntryLimit = responsiveOverviewConfig.expandedEntries;
  const entryLimit = isDefaultOverview ? featuredEntryLimit : expandedEntryLimit;
  const visibleEntries = filteredEntries.slice(0, entryLimit);
  const popularConnections = Array.from(new Set(availableDiscoveryResults.map((result) => result.provider)))
    .map((provider) => ({
      connectionCount: connectionEntries.filter((entry) => entry.provider === provider).length,
      provider,
      typeLabel: getConnectionTypeLabel(getConnectionCategory(provider))
    }))
    .sort((left, right) => {
      const priorityDelta = getProviderPriority(left.provider, popularConnectionOrder) - getProviderPriority(right.provider, popularConnectionOrder);
      return priorityDelta !== 0 ? priorityDelta : left.provider.localeCompare(right.provider);
    })
      .slice(0, responsiveOverviewConfig.popularConnections);
  const searchStatus = errorMessage
    ?? statusMessage
    ?? (isLoading
      ? `Refreshing verified connection inventory for ${storeName}.`
      : payload?.searchSummary ?? `Discovery runs through the backend and returns verified connection points for ${storeName}.`);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    setAppliedSearch({
      provider: selectedProvider === "All Providers" ? undefined : selectedProvider,
      query: searchTerm.trim() || undefined
    });
  }

  function handleAddConnection() {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handlePopularConnection(provider: string) {
    setErrorMessage(null);
    setStatusMessage(null);
    setSelectedProvider(provider);
    setSearchTerm("");
    setActiveTab(getConnectionCategory(provider));
    setSelectedStatus("all");
    setAppliedSearch({ provider });
  }

  function handleUtilityAction(action: "docs" | "webhooks" | "security" | "manage", label?: string) {
    setErrorMessage(null);

    if (action === "docs") {
      setStatusMessage("Custom connector feeds are supported through the store-scoped backend inventory and connection request API.");
      return;
    }

    if (action === "webhooks") {
      setStatusMessage("Webhook follow-up remains staged through the integrations lane while connector tooling expands.");
      return;
    }

    if (action === "security") {
      setStatusMessage("Connection requests stay store scoped and credential review is queued before activation when the connector requires it.");
      return;
    }

    setStatusMessage(`${label ?? "This connection"} management controls stay routed through the backend connector lane today.`);
  }

  async function handleRequestConnection(result: PosDiscoveryRecord) {
    if (result.status === "Already Connected") {
      setErrorMessage(`${result.label} is already connected to ${storeName}.`);
      return;
    }

    setSubmittingSystemId(result.id);
    setErrorMessage(null);

    try {
      const response = await createPosConnectionRequest(storeId, {
        provider: appliedSearch.provider,
        query: appliedSearch.query,
        requestMode: result.status === "Needs Credential" ? "credentialReview" : "connect",
        systemId: result.id
      });

      setPayload(response.payload);
      setStatusMessage(response.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to queue the connection request.");
    } finally {
      setSubmittingSystemId(null);
    }
  }

  function renderPhoneEntry(entry: ConnectionGridEntry) {
    if (entry.kind === "connected") {
      const system = entry.system;

      return (
        <article className={`legacy-info-card my-pos-phone-entry is-${entry.category}${system.status === "Attention" ? " is-attention" : " is-connected"}`} key={system.id}>
          <div className="my-pos-phone-entry-header">
            <div className={`my-pos-logo-badge is-${entry.category}`}>
              <span>{getProviderMonogram(system.provider)}</span>
            </div>

            <div className="my-pos-phone-entry-copy">
              <h4>{system.label}</h4>
              <p>
                {getConnectionTypeLabel(entry.category)} · {system.location}
              </p>
            </div>

            <span className={`legacy-chip ${getChipTone(system.status)}`}>{system.status}</span>
          </div>

          <p className="my-pos-phone-entry-description">
            {system.connectionMode} is active for this store and currently syncing without manual intervention.
          </p>

          <div className="my-pos-phone-entry-grid" aria-label={`${system.label} connection telemetry`}>
            <div className="my-pos-data-cell">
              <span>Connection</span>
              <strong>{system.connectionMode}</strong>
            </div>
            <div className="my-pos-data-cell">
              <span>Last Sync</span>
              <strong>{system.lastSync}</strong>
            </div>
            <div className="my-pos-data-cell">
              <span>Account</span>
              <strong className="my-pos-code">{system.merchantId}</strong>
            </div>
          </div>

          <div className="my-pos-phone-entry-actions">
            <button className="legacy-desktop-board-button" onClick={() => handleUtilityAction("manage", system.label)} type="button">
              Manage
            </button>
            <button className="my-pos-link-button" onClick={() => handleUtilityAction("manage", system.label)} type="button">
              Details
            </button>
          </div>
        </article>
      );
    }

    const result = entry.result;
    const requested = Boolean(result.request);
    const displayStatus = getDiscoveryDisplayStatus(result);
    const actionLabel = submittingSystemId === result.id
      ? "Queueing..."
      : requested
        ? "Queued"
        : result.status === "Needs Credential"
          ? "Continue Setup"
          : "Connect";

    return (
      <article className={`legacy-info-card my-pos-phone-entry is-${entry.category}${requested ? " is-queued" : result.status === "Needs Credential" ? " is-pending" : " is-available"}`} key={result.id}>
        <div className="my-pos-phone-entry-header">
          <div className={`my-pos-logo-badge is-${entry.category}`}>
            <span>{getProviderMonogram(result.provider)}</span>
          </div>

          <div className="my-pos-phone-entry-copy">
            <h4>{result.label}</h4>
            <p>
              {getConnectionTypeLabel(entry.category)} · {result.deviceType}
            </p>
          </div>

          <span className={`legacy-chip ${getChipTone(displayStatus)}`}>{displayStatus}</span>
        </div>

        <p className="my-pos-phone-entry-description">{result.matchReason}</p>

        <div className="my-pos-phone-entry-grid" aria-label={`${result.label} discovery telemetry`}>
          <div className="my-pos-data-cell">
            <span>Type</span>
            <strong>{result.deviceType}</strong>
          </div>
          <div className="my-pos-data-cell">
            <span>{result.request ? "Queued" : "Status"}</span>
            <strong>{result.request?.requestedAtLabel ?? displayStatus}</strong>
          </div>
          <div className="my-pos-data-cell">
            <span>Endpoint</span>
            <strong className="my-pos-code">{result.networkHost}</strong>
          </div>
        </div>

        <div className="my-pos-phone-entry-actions">
          <button
            className="legacy-desktop-board-button"
            disabled={submittingSystemId === result.id || requested || result.status === "Already Connected"}
            onClick={() => void handleRequestConnection(result)}
            type="button"
          >
            {actionLabel}
          </button>
          <button className="my-pos-link-button" onClick={() => handleUtilityAction("manage", result.label)} type="button">
            Details
          </button>
        </div>
      </article>
    );
  }

  if (isPhoneViewport) {
    return (
      <div className="my-pos-page my-pos-phone-page">
        <header className="my-pos-page-header my-pos-phone-header">
          <div className="my-pos-page-copy">
            <h2>Connection Points</h2>
            <p>Connect and manage external systems and integrations for {storeName}.</p>
          </div>

          <form className="legacy-info-card my-pos-phone-search-card" onSubmit={handleSearchSubmit}>
            <label className="my-pos-toolbar-search">
              <span>Search</span>
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search connections..."
                ref={searchInputRef}
                type="text"
                value={searchTerm}
              />
            </label>

            <label className="my-pos-toolbar-select">
              <span>Provider</span>
              <select onChange={(event) => setSelectedProvider(event.target.value)} value={selectedProvider}>
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>

            <label className="my-pos-status-filter">
              <span>Status</span>
              <select onChange={(event) => setSelectedStatus(event.target.value as ConnectionStatusFilter)} value={selectedStatus}>
                {statusFilterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="legacy-desktop-board-button" disabled={isLoading} type="submit">
              Search Connections
            </button>
          </form>
        </header>

        <section className="legacy-info-card my-pos-phone-hero">
          <span className="legacy-command-meta my-pos-kicker">Phone / Connection Points</span>
          <h3>Connect. Integrate. Simplify.</h3>
          <p>{searchStatus}</p>

          <div className="my-pos-phone-hero-actions">
            <button className="legacy-desktop-board-button" onClick={handleAddConnection} type="button">
              Add Connection
            </button>

            <div className="my-pos-phone-hero-note">
              <strong>{filteredEntries.length} connection points in scope</strong>
              <span>
                {queuedCount} queued · {activeProviderScope}
              </span>
            </div>
          </div>

          <div className="my-pos-phone-stat-grid" aria-label="Connection Points overview metrics">
            <article className="my-pos-stat-card">
              <span>Connected</span>
              <strong>{connectedCount}</strong>
            </article>
            <article className="my-pos-stat-card is-attention">
              <span>Attention</span>
              <strong>{attentionCount}</strong>
            </article>
            <article className="my-pos-stat-card">
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </article>
            <article className="my-pos-stat-card">
              <span>Providers</span>
              <strong>{providerCount}</strong>
            </article>
          </div>
        </section>

        <section className="legacy-info-card my-pos-phone-filters-card">
          <div className="my-pos-phone-section-heading">
            <div>
              <span className="my-pos-section-kicker">Browse</span>
              <h3>{activeTabLabel}</h3>
            </div>
          </div>

          <div aria-label="Connection categories" className="my-pos-phone-chip-row" role="tablist">
            {connectionTabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={`my-pos-tab${activeTab === tab.id ? " is-active" : ""}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                <span>{tab.label}</span>
                <strong>
                  {tab.id === "all"
                    ? connectionEntries.length
                    : connectionEntries.filter((entry) => entry.category === tab.id).length}
                </strong>
              </button>
            ))}
          </div>

          {popularConnections.length > 0 ? (
            <div className="my-pos-phone-provider-row">
              {popularConnections.map((connection) => (
                <button
                  className="my-pos-phone-provider-pill"
                  key={connection.provider}
                  onClick={() => handlePopularConnection(connection.provider)}
                  type="button"
                >
                  <span>{connection.provider}</span>
                  <strong>{connection.connectionCount}</strong>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="legacy-info-card my-pos-phone-results-card">
          <div className="my-pos-phone-section-heading">
            <div>
              <span className="my-pos-section-kicker">Results</span>
              <h3>{activeTabLabel}</h3>
              <p>{searchStatus}</p>
            </div>
          </div>

          <div className="my-pos-phone-entry-list">
            {visibleEntries.length > 0 ? (
              visibleEntries.map((entry) => renderPhoneEntry(entry))
            ) : (
              <div className="my-pos-empty-state">
                No connection points match the current search or filters. Adjust the query, provider, or status scope and try again.
              </div>
            )}
          </div>
        </section>

        <section className="legacy-info-card my-pos-phone-tools-card">
          <div className="my-pos-phone-section-heading">
            <div>
              <span className="my-pos-section-kicker">Tools</span>
              <h3>Need something else?</h3>
            </div>
          </div>

          <div className="my-pos-phone-tools-grid">
            <button className="my-pos-link-button" onClick={() => handleUtilityAction("docs")} type="button">
              View API Docs
            </button>
            <button className="my-pos-link-button" onClick={() => handleUtilityAction("webhooks")} type="button">
              Manage Webhooks
            </button>
            <button className="my-pos-link-button" onClick={() => handleUtilityAction("security")} type="button">
              Security Details
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="my-pos-page">
      <header className="my-pos-page-header">
        <div className="my-pos-page-copy">
          <h2>Connection Points</h2>
          <p>Connect and manage external systems and integrations for {storeName}.</p>
        </div>

        <form className="my-pos-toolbar-form" onSubmit={handleSearchSubmit}>
          <label className="my-pos-toolbar-search">
            <span>Search</span>
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search connections..."
              ref={searchInputRef}
              type="text"
              value={searchTerm}
            />
          </label>

          <label className="my-pos-toolbar-select">
            <span>Provider</span>
            <select onChange={(event) => setSelectedProvider(event.target.value)} value={selectedProvider}>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>

          <button className="legacy-desktop-board-button" disabled={isLoading} type="submit">
            Search Connections
          </button>
        </form>
      </header>

      <section className="legacy-info-card my-pos-hero">
        <div className="my-pos-hero-copy">
          <span className="legacy-command-meta my-pos-kicker">Connect / Connection Points</span>
          <h3>Connect. Integrate. Simplify.</h3>
          <p>
            Seamlessly connect your store with POS systems, payment services, banks, and external tools while the heavy discovery and validation work stays on the backend.
          </p>

          <div className="my-pos-hero-actions">
            <button className="legacy-desktop-board-button" onClick={handleAddConnection} type="button">
              Add Connection
            </button>

            <div className="my-pos-hero-inline-note">
              <strong>{isLoading ? "Scanning connector inventory" : `${filteredEntries.length} connection points in scope · ${queuedCount} queued`}</strong>
              <span>
                {activeProviderScope} · <span className="my-pos-code">{activeQueryScope}</span>
              </span>
            </div>
          </div>

          <div className="my-pos-stat-grid" aria-label="Connection Points overview metrics">
            <article className="my-pos-stat-card">
              <span>Connected</span>
              <strong>{connectedCount}</strong>
              <small>live integrations</small>
            </article>
            <article className="my-pos-stat-card is-attention">
              <span>Attention</span>
              <strong>{attentionCount}</strong>
              <small>needs follow-up</small>
            </article>
            <article className="my-pos-stat-card">
              <span>Pending</span>
              <strong>{pendingCount}</strong>
              <small>ready to stage</small>
            </article>
            <article className="my-pos-stat-card">
              <span>Providers</span>
              <strong>{providerCount}</strong>
              <small>currently in scope</small>
            </article>
          </div>
        </div>

        <div className="my-pos-hero-diagram" aria-hidden="true">
          <span className="my-pos-hero-link is-top-left" />
          <span className="my-pos-hero-link is-top-right" />
          <span className="my-pos-hero-link is-right" />
          <span className="my-pos-hero-link is-bottom-right" />
          <span className="my-pos-hero-link is-left" />

          <div className="my-pos-hero-core">
            <span className="my-pos-hero-ring is-outer" />
            <span className="my-pos-hero-ring is-middle" />
            <span className="my-pos-hero-ring is-inner" />

            <div className="my-pos-hero-hub">
              <div className="my-pos-hero-hub-mark">
                <span className="my-pos-hero-hub-arc is-left" />
                <span className="my-pos-hero-hub-bar" />
                <span className="my-pos-hero-hub-arc is-right" />
              </div>
              <strong>CIS</strong>
              <small>Core</small>
            </div>

            <div className="my-pos-hero-core-copy">
              <strong>CIS routing core</strong>
              <span>Live connection fabric</span>
            </div>
          </div>

          <div className="my-pos-hero-node is-top-left">
            <strong>POS</strong>
            <span>Retail</span>
          </div>
          <div className="my-pos-hero-node is-top-right">
            <strong>GW</strong>
            <span>Payments</span>
          </div>
          <div className="my-pos-hero-node is-right">
            <strong>BK</strong>
            <span>Banking</span>
          </div>
          <div className="my-pos-hero-node is-bottom-right">
            <strong>CRM</strong>
            <span>Customers</span>
          </div>
          <div className="my-pos-hero-node is-left">
            <strong>ERP</strong>
            <span>Ops</span>
          </div>
        </div>
      </section>

      <div className="my-pos-layout">
        <section className="legacy-info-card my-pos-main-panel">
          <div className="my-pos-panel-topbar">
            <div>
              <span className="my-pos-section-kicker">Store Scoped</span>
              <h3>{activeTabLabel}</h3>
              <p>Connected endpoints and backend-discovered connection points for {storeName}.</p>
            </div>

            <label className="my-pos-status-filter">
              <span>Status</span>
              <select onChange={(event) => setSelectedStatus(event.target.value as ConnectionStatusFilter)} value={selectedStatus}>
                {statusFilterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div aria-label="Connection categories" className="my-pos-tab-row" role="tablist">
            {connectionTabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={`my-pos-tab${activeTab === tab.id ? " is-active" : ""}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                <span>{tab.label}</span>
                <strong>
                  {tab.id === "all"
                    ? connectionEntries.length
                    : connectionEntries.filter((entry) => entry.category === tab.id).length}
                </strong>
              </button>
            ))}
          </div>

          <div aria-live="polite" className="my-pos-search-note">
            <strong>Connection Status</strong>
            <p>{searchStatus}</p>
          </div>

          <div className="my-pos-card-grid">
            {visibleEntries.length > 0 ? (
              visibleEntries.map((entry) => {
                if (entry.kind === "connected") {
                  const system = entry.system;

                  return (
                    <article
                      className={`my-pos-connection-card my-pos-system-row is-${entry.category}${system.status === "Attention" ? " is-attention" : " is-connected"}`}
                      key={system.id}
                    >
                      <div className="my-pos-card-header my-pos-row-header">
                        <div className={`my-pos-logo-badge is-${entry.category}`}>
                          <span>{getProviderMonogram(system.provider)}</span>
                        </div>

                        <div className="my-pos-card-title my-pos-row-copy">
                          <h4>{system.label}</h4>
                          <p>
                            {getConnectionTypeLabel(entry.category)} · {system.location}
                          </p>
                        </div>

                        <span className={`legacy-chip ${getChipTone(system.status)}`}>{system.status}</span>
                      </div>

                      <p className="my-pos-card-description">
                        {system.connectionMode} is active for this store and currently syncing without manual intervention.
                      </p>

                      <div className="my-pos-card-metadata" aria-label={`${system.label} connection telemetry`}>
                        <div className="my-pos-data-cell">
                          <span>Connection</span>
                          <strong>{system.connectionMode}</strong>
                        </div>
                        <div className="my-pos-data-cell">
                          <span>Account</span>
                          <strong className="my-pos-code">{system.merchantId}</strong>
                        </div>
                        <div className="my-pos-data-cell">
                          <span>Last Sync</span>
                          <strong>{system.lastSync}</strong>
                        </div>
                      </div>

                      <div className="my-pos-card-footer my-pos-result-footer">
                        <button className="my-pos-card-action" onClick={() => handleUtilityAction("manage", system.label)} type="button">
                          Manage
                        </button>

                        <button
                          aria-label={`More actions for ${system.label}`}
                          className="my-pos-icon-button"
                          onClick={() => handleUtilityAction("manage", system.label)}
                          type="button"
                        >
                          ...
                        </button>
                      </div>
                    </article>
                  );
                }

                const result = entry.result;
                const requested = Boolean(result.request);
                const displayStatus = getDiscoveryDisplayStatus(result);
                const actionLabel = submittingSystemId === result.id
                  ? "Queueing..."
                  : requested
                    ? "Queued"
                    : result.status === "Needs Credential"
                      ? "Continue Setup"
                      : "Connect";

                return (
                  <article
                    className={`my-pos-connection-card my-pos-result-row is-${entry.category}${requested ? " is-queued" : result.status === "Needs Credential" ? " is-pending" : " is-available"}`}
                    key={result.id}
                  >
                    <div className="my-pos-card-header my-pos-row-header">
                      <div className={`my-pos-logo-badge is-${entry.category}`}>
                        <span>{getProviderMonogram(result.provider)}</span>
                      </div>

                      <div className="my-pos-card-title my-pos-row-copy">
                        <h4>{result.label}</h4>
                        <p>
                          {getConnectionTypeLabel(entry.category)} · {result.deviceType}
                        </p>
                      </div>

                      <span className={`legacy-chip ${getChipTone(displayStatus)}`}>{displayStatus}</span>
                    </div>

                    <p className="my-pos-card-description my-pos-result-detail">{result.matchReason}</p>

                    <div className="my-pos-card-metadata" aria-label={`${result.label} discovery telemetry`}>
                      <div className="my-pos-data-cell">
                        <span>Type</span>
                        <strong>{result.deviceType}</strong>
                      </div>
                      <div className="my-pos-data-cell">
                        <span>Account</span>
                        <strong className="my-pos-code">{result.merchantId}</strong>
                      </div>
                      <div className="my-pos-data-cell">
                        <span>Endpoint</span>
                        <strong className="my-pos-code">{result.networkHost}</strong>
                      </div>
                      <div className="my-pos-data-cell">
                        <span>{result.request ? "Queued" : "Status"}</span>
                        <strong>{result.request?.requestedAtLabel ?? displayStatus}</strong>
                      </div>
                    </div>

                    <div className="my-pos-card-footer my-pos-result-footer">
                      <button
                        className="my-pos-card-action"
                        disabled={submittingSystemId === result.id || requested || result.status === "Already Connected"}
                        onClick={() => void handleRequestConnection(result)}
                        type="button"
                      >
                        {actionLabel}
                      </button>

                      <button
                        aria-label={`More actions for ${result.label}`}
                        className="my-pos-icon-button"
                        onClick={() => handleUtilityAction("manage", result.label)}
                        type="button"
                      >
                        ...
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="my-pos-empty-state">
                No connection points match the current search or filters. Adjust the query, provider, or status scope and try again.
              </div>
            )}
          </div>
        </section>

        <aside className="my-pos-sidebar">
          <section className="legacy-info-card my-pos-sidebar-card">
            <div className="my-pos-sidebar-heading">
              <div>
                <span className="my-pos-section-kicker">Popular Connections</span>
                <h3>Popular Connections</h3>
              </div>
            </div>

            <div className="my-pos-sidebar-list">
              {popularConnections.length > 0 ? (
                popularConnections.map((connection) => (
                  <article className="my-pos-sidebar-list-item" key={connection.provider}>
                    <div className="my-pos-sidebar-provider">
                      <span className={`my-pos-sidebar-logo is-${getConnectionCategory(connection.provider)}`}>{getProviderMonogram(connection.provider)}</span>

                      <div>
                        <strong>{connection.provider}</strong>
                        <small>{connection.typeLabel}</small>
                      </div>
                    </div>

                    <button
                      aria-label={`Filter by ${connection.provider}`}
                      className="my-pos-icon-button"
                      disabled={isLoading}
                      onClick={() => handlePopularConnection(connection.provider)}
                      type="button"
                    >
                      +
                    </button>
                  </article>
                ))
              ) : (
                <div className="my-pos-empty-state">Provider popularity will appear once connector inventory is loaded for this store.</div>
              )}
            </div>
          </section>

          <section className="legacy-info-card my-pos-sidebar-card">
            <div className="my-pos-sidebar-heading">
              <div>
                <span className="my-pos-section-kicker">Custom</span>
                <h3>Need something else?</h3>
              </div>
            </div>

            <p className="my-pos-sidebar-copy">
              Use the backend connector feed or queue a custom integration workflow when your store needs something outside the current catalog.
            </p>

            <div className="my-pos-sidebar-actions">
              <button className="my-pos-link-button" onClick={() => handleUtilityAction("docs")} type="button">
                View API Docs
              </button>
              <button className="my-pos-link-button" onClick={() => handleUtilityAction("webhooks")} type="button">
                Manage Webhooks
              </button>
            </div>
          </section>

          <section className="legacy-info-card my-pos-sidebar-card my-pos-security-banner my-pos-sidebar-security">
            <div className="my-pos-security-copy">
              <span className="my-pos-security-icon">S</span>

              <div>
                <strong>Your security is our priority</strong>
                <p>All connection requests are store scoped, review aware, and staged before activation when credentials are required.</p>
              </div>
            </div>

            <button className="my-pos-link-button" onClick={() => handleUtilityAction("security")} type="button">
              Learn more about security
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}