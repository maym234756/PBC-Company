import { useState } from "react";
import { EmbeddedWebsiteEditorPage } from "./WebsiteEditorPage";
import type { ActivityLogEntry, TaskQueueEntry, WebsiteDashboardSummary, WebsiteWorkspaceRow } from "../types";

interface WebsiteFeedLeafPageProps {
  activeUserName: string;
  entries: TaskQueueEntry[];
  fallbackStatusLine: string;
  historyEntries: ActivityLogEntry[];
  onOpenEditor: () => void;
  onOpenCustomSettings: () => void;
  onOpenOverview: () => void;
  onOpenSandbox: () => void;
  onRunTool: (tool: string) => void;
  onSelectRow: (row: WebsiteWorkspaceRow) => void;
  rows: WebsiteWorkspaceRow[];
  selectedRow: WebsiteWorkspaceRow | null;
  storeName: string;
  summary: WebsiteDashboardSummary | null;
  view: "editor" | "feed";
}

type MockIconName =
  | "bell"
  | "boat"
  | "brand"
  | "building"
  | "camera"
  | "chart"
  | "check"
  | "clipboard"
  | "document"
  | "gear"
  | "globe"
  | "help"
  | "home"
  | "image"
  | "promotion"
  | "refresh"
  | "slides"
  | "support"
  | "tag"
  | "user-add"
  | "users";

type MockTone = "amber" | "blue" | "coral" | "green";

type MockStatCard = {
  changeLabel: string;
  icon: MockIconName;
  label: string;
  sublabel: string;
  tone: MockTone;
  value: string;
};

type MockPipelineCard = {
  icon: MockIconName;
  label: string;
  percentLabel: string;
  tone: MockTone;
  value: string;
};

type MockActivityCard = {
  category: string;
  icon: MockIconName;
  timeLabel: string;
  title: string;
  tone: MockTone;
};

type MockHealthItem = {
  detail: string;
  label: string;
  meta: string;
};

type MockNavItemProps = {
  active?: boolean;
  expanded?: boolean;
  icon: MockIconName;
  label: string;
  onClick?: () => void;
  withChevron?: boolean;
};

const mockStats: MockStatCard[] = [
  {
    changeLabel: "4% vs last 7 days",
    icon: "globe",
    label: "Website",
    sublabel: "Site Health",
    tone: "blue",
    value: "98%"
  },
  {
    changeLabel: "12 vs last 7 days",
    icon: "boat",
    label: "Inventory",
    sublabel: "Total Units",
    tone: "green",
    value: "142"
  },
  {
    changeLabel: "6 vs last 7 days",
    icon: "users",
    label: "Leads",
    sublabel: "New Leads",
    tone: "coral",
    value: "27"
  },
  {
    changeLabel: "2 Due Soon",
    icon: "clipboard",
    label: "Production",
    sublabel: "In Progress",
    tone: "amber",
    value: "8"
  }
];

const mockPipeline: MockPipelineCard[] = [
  { icon: "tag", label: "In Inventory", percentLabel: "100%", tone: "blue", value: "142" },
  { icon: "camera", label: "Media Complete", percentLabel: "69%", tone: "green", value: "98" },
  { icon: "document", label: "Needs Review", percentLabel: "16%", tone: "amber", value: "23" },
  { icon: "globe", label: "On Website", percentLabel: "85%", tone: "coral", value: "121" }
];

const mockRecentActivity: MockActivityCard[] = [
  {
    category: "Inventory",
    icon: "camera",
    timeLabel: "1h ago",
    title: "Photos updated for 2024 Boston Whaler 250 Outrage",
    tone: "green"
  },
  {
    category: "Needs Review",
    icon: "document",
    timeLabel: "2h ago",
    title: "2024 Sea Ray SLX 400 flagged for review",
    tone: "amber"
  },
  {
    category: "Leads",
    icon: "users",
    timeLabel: "3h ago",
    title: "New lead from website: John Davis",
    tone: "coral"
  },
  {
    category: "Website",
    icon: "globe",
    timeLabel: "5h ago",
    title: "Homepage banner updated",
    tone: "blue"
  },
  {
    category: "Inventory",
    icon: "check",
    timeLabel: "1d ago",
    title: "2024 Harris Cruiser 230 published to website",
    tone: "green"
  }
];

const mockHealthItems: MockHealthItem[] = [
  { detail: "Active", label: "SSL Certificate", meta: "" },
  { detail: "Healthy", label: "Domain", meta: "" },
  { detail: "182", label: "Pages", meta: "No Issues" },
  { detail: "0", label: "Broken Links", meta: "No Issues" },
  { detail: "Excellent", label: "Performance", meta: "" }
];

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (trimmed.length === 0) {
    return "";
  }

  return /^(https?|sftp):\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function DashboardIcon({ className, name }: { className?: string; name: MockIconName }) {
  switch (name) {
    case "bell":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M8 18h8l-1-1.8V11a3 3 0 1 0-6 0v5.2L8 18Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M10.5 19a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "boat":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M8 8h7l2 5H6l2-5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M5 15c1.2 1.3 2.5 2 4 2s2.8-.7 4-2c1.2 1.3 2.5 2 4 2s2.8-.7 4-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "brand":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M2 8c2.6 0 2.6 2 5.2 2S9.8 8 12.4 8 15 10 17.6 10 20.2 8 22.8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M2 13c2.6 0 2.6 2 5.2 2s2.6-2 5.2-2 2.6 2 5.2 2 2.6-2 5.2-2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "building":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M5 19V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5V19M9 9h1M9 12h1M9 15h1M14 9h1M14 12h1M14 15h1M4 19h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "camera":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M7 8.5 8.5 6h7L17 8.5h2A1.5 1.5 0 0 1 20.5 10v7A1.5 1.5 0 0 1 19 18.5H5A1.5 1.5 0 0 1 3.5 17v-7A1.5 1.5 0 0 1 5 8.5h2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "chart":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M5 19V6M11 19v-8M17 19v-5M4 19h16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "check":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="m8.5 12.2 2.3 2.3 4.7-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "clipboard":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <rect height="15" rx="2" stroke="currentColor" strokeWidth="1.8" width="12" x="6" y="6" />
          <path d="M9 6.5h6V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1.5ZM9.5 11h5M9.5 15h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "document":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M8 4.5h5l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19V6A1.5 1.5 0 0 1 8.5 4.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M13 4.5V9h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "gear":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="m19 12 1.5-1.2-1.4-2.4-1.8.4a6.8 6.8 0 0 0-1.2-.7L15.8 6h-3.6l-.3 1.9c-.4.2-.8.4-1.2.7l-1.8-.4-1.4 2.4L5 12l1.5 1.2-.4 1.9 2 1.2 1.5-1.1c.4.2.8.4 1.3.5l.4 1.9h3.4l.4-1.9c.5-.1.9-.3 1.3-.5l1.5 1.1 2-1.2-.4-1.9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </svg>
      );
    case "globe":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 12h16M12 4c2.5 2.2 3.8 5 3.8 8S14.5 17.8 12 20c-2.5-2.2-3.8-5-3.8-8S9.5 6.2 12 4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "help":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.8 9.4a2.4 2.4 0 1 1 4.3 1.4c-.6.8-1.6 1.2-2.1 2.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          <circle cx="12" cy="16.7" fill="currentColor" r="1" />
        </svg>
      );
    case "home":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M4 10.5 12 4l8 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M6.5 10v9h11v-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "image":
    case "slides":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <rect height="14" rx="2" stroke="currentColor" strokeWidth="1.8" width="16" x="4" y="5" />
          <circle cx="9" cy="10" fill="currentColor" r="1.5" />
          <path d="m7 16 3-3 2 2 3-4 2 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "promotion":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M4 11h5l7-3v8l-7-3H4v-2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M9 13v4a1.5 1.5 0 0 0 1.5 1.5H12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "refresh":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M19 8V4m0 0h-4m4 0-3 3a7 7 0 1 0 2 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "support":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="M5 13a7 7 0 1 1 14 0v4a2 2 0 0 1-2 2h-2v-5h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          <path d="M5 19H3a2 2 0 0 1-2-2v-4h4v5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "tag":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <path d="m10 5 8 8-6 6-8-8V5h6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
          <circle cx="8" cy="8" fill="currentColor" r="1.2" />
        </svg>
      );
    case "user-add":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="10" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18c1-2.4 2.9-3.6 5.5-3.6 2.6 0 4.5 1.2 5.5 3.6M18 8v6M15 11h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "users":
      return (
        <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
          <circle cx="9" cy="10" r="3" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18c1-2.4 2.9-3.6 5.5-3.6 2.6 0 4.5 1.2 5.5 3.6M15 17.5c.7-1.6 2-2.4 3.9-2.4 1.1 0 2 .3 2.6.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
}

function MockNavItem({ active = false, expanded = false, icon, label, onClick, withChevron = false }: MockNavItemProps) {
  return (
    <button
      aria-expanded={withChevron ? expanded : undefined}
      className={`website-feed-mock-nav-item${active ? " is-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className="website-feed-mock-nav-icon-wrap">
        <DashboardIcon className="website-feed-mock-nav-icon" name={icon} />
      </span>
      <span className="website-feed-mock-nav-label">{label}</span>
      {withChevron ? <span className={`website-feed-mock-nav-chevron${expanded ? " is-expanded" : ""}`}>▾</span> : null}
    </button>
  );
}

export function WebsiteFeedLeafPage({
  activeUserName,
  entries,
  fallbackStatusLine,
  historyEntries,
  onOpenEditor,
  onOpenCustomSettings,
  onOpenOverview,
  onOpenSandbox,
  onRunTool,
  onSelectRow,
  rows,
  selectedRow,
  storeName,
  summary,
  view
}: WebsiteFeedLeafPageProps) {
  const [isWebsiteNavExpanded, setIsWebsiteNavExpanded] = useState(true);
  const isEditorView = view === "editor";
  const liveContextCount = (summary?.connectedSiteCount ?? 0) + rows.length + entries.length + historyEntries.length;
  const sourceContextLabel = [storeName, activeUserName, fallbackStatusLine].filter(Boolean).join(" · ");
  const liveSiteHref = normalizeWebsiteUrl(selectedRow?.domain ?? rows[0]?.domain ?? "https://harborviewmarine.com");
  const mockStoreLabel = "Harbor View Marine - Charleston, SC";
  const mockStoreFooterName = "Harbor View Marine";
  const mockOperatorLabel = "Jason Mitchell";
  const mockWelcomeName = "Jason";

  const handleInventoryAction = () => {
    const row = selectedRow ?? rows[0];

    if (row) {
      onSelectRow(row);
    }

    onRunTool("Publish Feed");
  };

  const quickActions: Array<{ icon: MockIconName; label: string; onClick: () => void }> = [
    { icon: "boat", label: "Add Inventory", onClick: handleInventoryAction },
    { icon: "user-add", label: "Add Lead", onClick: () => onRunTool("Lead Sync") },
    { icon: "promotion", label: "Create Promotion", onClick: () => onRunTool("Publish Feed") },
    { icon: "slides", label: "Manage Slides", onClick: onOpenCustomSettings },
    { icon: "users", label: "View Leads", onClick: () => onRunTool("Lead Sync") },
    { icon: "clipboard", label: "Production Board", onClick: onOpenSandbox }
  ];

  const websiteSubmenuItems: Array<{ active?: boolean; label: string; onClick: () => void }> = [
    { active: !isEditorView, label: "Overview", onClick: onOpenOverview },
    { active: isEditorView, label: "Editor", onClick: onOpenEditor },
    { label: "Pages", onClick: onOpenCustomSettings },
    { label: "Blog", onClick: onOpenCustomSettings },
    { label: "Media", onClick: onOpenCustomSettings },
    { label: "Menus", onClick: onOpenCustomSettings }
  ];

  const mainContent = isEditorView ? (
    <div className="website-feed-mock-editor-surface">
      <EmbeddedWebsiteEditorPage storeName={storeName} />
    </div>
  ) : (
    <>
      <section aria-label="Dealer summary metrics" className="website-feed-mock-stat-grid">
        {mockStats.map((card) => (
          <article className="website-feed-mock-stat-card" key={card.label}>
            <div className={`website-feed-mock-stat-icon tone-${card.tone}`}>
              <DashboardIcon className="website-feed-mock-stat-icon-svg" name={card.icon} />
            </div>

            <div className="website-feed-mock-stat-copy">
              <span className={`website-feed-mock-stat-label tone-${card.tone}`}>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.sublabel}</p>
              <small>{card.changeLabel}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="website-feed-mock-panel website-feed-mock-pipeline-panel">
        <div className="website-feed-mock-panel-header">
          <strong>Inventory to Website Pipeline</strong>
          <button className="website-feed-mock-inline-link" onClick={handleInventoryAction} type="button">
            View Inventory <span>›</span>
          </button>
        </div>

        <div className="website-feed-mock-pipeline-grid">
          {mockPipeline.map((step, index) => (
            <article
              className={`website-feed-mock-pipeline-step tone-${step.tone}${index === 0 ? " is-first" : ""}${index === mockPipeline.length - 1 ? " is-last" : ""}`}
              key={step.label}
            >
              <div className="website-feed-mock-pipeline-head">
                <span className={`website-feed-mock-pipeline-icon tone-${step.tone}`}>
                  <DashboardIcon className="website-feed-mock-pipeline-icon-svg" name={step.icon} />
                </span>
                <div>
                  <strong>{step.label}</strong>
                  <div className="website-feed-mock-pipeline-values">
                    <span className="website-feed-mock-pipeline-value">{step.value}</span>
                    <span className="website-feed-mock-pipeline-percent">{step.percentLabel}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="website-feed-mock-lower-grid">
        <section className="website-feed-mock-panel website-feed-mock-activity-panel">
          <div className="website-feed-mock-panel-header">
            <strong>Recent Activity</strong>
            <button className="website-feed-mock-inline-link" onClick={() => onRunTool("Open Queue")} type="button">
              View All
            </button>
          </div>

          <div className="website-feed-mock-activity-list">
            {mockRecentActivity.map((item) => (
              <article className="website-feed-mock-activity-row" key={item.title}>
                <span className={`website-feed-mock-activity-icon tone-${item.tone}`}>
                  <DashboardIcon className="website-feed-mock-activity-icon-svg" name={item.icon} />
                </span>
                <div className="website-feed-mock-activity-copy">
                  <strong>{item.title}</strong>
                  <span>{item.category}</span>
                </div>
                <time>{item.timeLabel}</time>
              </article>
            ))}
          </div>
        </section>

        <section className="website-feed-mock-panel website-feed-mock-actions-panel">
          <div className="website-feed-mock-panel-header">
            <strong>Quick Actions</strong>
          </div>

          <div className="website-feed-mock-actions-grid">
            {quickActions.map((action) => (
              <button className="website-feed-mock-action-card" key={action.label} onClick={action.onClick} type="button">
                <span className="website-feed-mock-action-icon">
                  <DashboardIcon className="website-feed-mock-action-icon-svg" name={action.icon} />
                </span>
                <strong>{action.label}</strong>
              </button>
            ))}
          </div>

          <div className="website-feed-mock-actions-footer">
            <button className="website-feed-mock-inline-link" onClick={onOpenCustomSettings} type="button">
              All Actions <span>›</span>
            </button>
          </div>
        </section>

        <section className="website-feed-mock-panel website-feed-mock-health-panel">
          <div className="website-feed-mock-panel-header">
            <strong>Live Site Health</strong>
            <button className="website-feed-mock-inline-link" onClick={onOpenCustomSettings} type="button">
              View Full Report
            </button>
          </div>

          <div className="website-feed-mock-health-content">
            <div className="website-feed-mock-health-ring-wrap">
              <div className="website-feed-mock-health-ring">
                <div className="website-feed-mock-health-ring-inner">
                  <strong>98%</strong>
                  <span>Healthy</span>
                </div>
              </div>
            </div>

            <div className="website-feed-mock-health-list">
              {mockHealthItems.map((item) => (
                <article className="website-feed-mock-health-row" key={item.label}>
                  <span className="website-feed-mock-health-check">
                    <DashboardIcon className="website-feed-mock-health-check-icon" name="check" />
                  </span>
                  <div className="website-feed-mock-health-copy">
                    <strong>{item.label}</strong>
                    <span>{item.meta || "\u00a0"}</span>
                  </div>
                  <em>{item.detail}</em>
                </article>
              ))}
            </div>
          </div>

          <div className="website-feed-mock-health-footer">
            <span>Last scan: Today, 7:30 AM</span>
            <a className="website-feed-mock-scan-link" href={liveSiteHref} rel="noreferrer" target="_blank">
              Scan Now <DashboardIcon className="website-feed-mock-scan-icon" name="refresh" />
            </a>
          </div>
        </section>
      </div>
    </>
  );

  return (
    <section
      aria-label={isEditorView ? "Website editor workspace" : "Dealer home website dashboard"}
      className={`website-feed-mock-shell${isEditorView ? " is-editor-view" : ""}`}
      data-live-context-count={liveContextCount}
      title={sourceContextLabel}
    >
      <aside className="website-feed-mock-sidebar">
        <div className="website-feed-mock-brandbar">
          <span className="website-feed-mock-brand-icon">
            <DashboardIcon className="website-feed-mock-brand-wave" name="brand" />
          </span>
          <strong>Premier Marine Cloud</strong>
        </div>

        <nav aria-label="Dealer navigation" className="website-feed-mock-nav">
          <MockNavItem active={!isEditorView} icon="home" label="Dealer Home" onClick={onOpenOverview} />
          <div className="website-feed-mock-nav-section">
            <MockNavItem
              active={isEditorView || isWebsiteNavExpanded}
              expanded={isWebsiteNavExpanded}
              icon="globe"
              label="Website"
              onClick={() => setIsWebsiteNavExpanded((current) => !current)}
              withChevron={true}
            />
            {isWebsiteNavExpanded ? (
              <div aria-label="Website submenu" className="website-feed-mock-nav-submenu">
                {websiteSubmenuItems.map((item) => (
                  <button
                    className={`website-feed-mock-nav-subitem${item.active ? " is-active" : ""}`}
                    key={item.label}
                    onClick={item.onClick}
                    type="button"
                  >
                    <span aria-hidden="true" className="website-feed-mock-nav-subitem-bullet" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <MockNavItem icon="boat" label="Inventory" onClick={handleInventoryAction} withChevron={true} />
          <MockNavItem icon="users" label="Leads" onClick={() => onRunTool("Lead Sync")} withChevron={true} />
          <MockNavItem icon="clipboard" label="Production" onClick={onOpenSandbox} withChevron={true} />
        </nav>

        <div className="website-feed-mock-sidebar-divider" />

        <nav aria-label="Dealer tools" className="website-feed-mock-nav website-feed-mock-nav-secondary">
          <MockNavItem icon="image" label="Media Library" onClick={onOpenCustomSettings} />
          <MockNavItem icon="chart" label="Reports" onClick={onOpenCustomSettings} />
          <MockNavItem icon="gear" label="Settings" onClick={onOpenCustomSettings} />
          <MockNavItem icon="users" label="Users" onClick={onOpenSandbox} />
        </nav>

        <div className="website-feed-mock-sidebar-divider" />

        <nav aria-label="Dealer support" className="website-feed-mock-nav website-feed-mock-nav-secondary">
          <MockNavItem icon="support" label="Support" onClick={onOpenCustomSettings} />
          <MockNavItem icon="help" label="Help Center" onClick={onOpenCustomSettings} />
        </nav>

        <div className="website-feed-mock-sidebar-footer">
          <div>
            <strong>{mockStoreFooterName}</strong>
            <span>{mockOperatorLabel}</span>
          </div>
          <span className="website-feed-mock-nav-chevron">▾</span>
        </div>
      </aside>

      <div className="website-feed-mock-main">
        <header className="website-feed-mock-topbar">
          <div>
            <h1>{isEditorView ? "Website Editor" : "Dealer Home"}</h1>
            <p>{isEditorView ? "Edit page layout, sections, and SEO while staying inside the Website workspace." : `Welcome back, ${mockWelcomeName}.`}</p>
          </div>

          <div className="website-feed-mock-topbar-actions">
            <button className="website-feed-mock-store-select" onClick={onOpenCustomSettings} type="button">
              <DashboardIcon className="website-feed-mock-store-icon" name="building" />
              <span>{mockStoreLabel}</span>
              <span className="website-feed-mock-nav-chevron">▾</span>
            </button>

            <button className="website-feed-mock-alert-button" onClick={() => onRunTool("Open Queue")} type="button">
              <DashboardIcon className="website-feed-mock-alert-icon" name="bell" />
              <span className="website-feed-mock-alert-badge">3</span>
            </button>
          </div>
        </header>

        {mainContent}
      </div>
    </section>
  );
}
