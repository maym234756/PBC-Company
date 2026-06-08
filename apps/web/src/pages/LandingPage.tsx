import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { submitPublicLaunchIntake } from "../api";
import type { SessionState } from "../types";

const DEFAULT_PRODUCTION_WORKSPACE_PATH = "desktop";

interface LandingPageProps {
  session: SessionState | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface CapabilityPillar {
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  tone: "current" | "service" | "inventory" | "finance";
}

interface InstallGuide {
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
}

interface ShowcaseCard {
  eyebrow: string;
  title: string;
  description: string;
}

interface ShowcaseMetric {
  label: string;
  value: string;
}

interface ShowcaseRouteStep {
  label: string;
  value: string;
}

interface ShowcaseTab {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  announcement: string;
  primaryAction: string;
  stage: {
    top: string;
    apps: string;
    core: string;
    data: string;
    floor: string;
  };
  floatingLeft: {
    eyebrow: string;
    title: string;
    description: string;
  };
  floatingRight: {
    eyebrow: string;
    title: string;
    description: string;
  };
  metrics: ShowcaseMetric[];
  highlights: string[];
  routeSteps: ShowcaseRouteStep[];
  cards: ShowcaseCard[];
}

interface ProofCard {
  eyebrow: string;
  title: string;
  description: string;
}

type LaunchReviewTrack = "Executive Launch" | "Advanced CRM" | "Service Operations" | "Integration Connect" | "Mobile + Install";
type LaunchReviewTimeline = "Immediate" | "This Month" | "This Quarter" | "Exploring";
type LaunchIntakeStatus = "idle" | "submitting" | "success" | "error";

interface LaunchIntakeFormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  interestLane: LaunchReviewTrack;
  timeline: LaunchReviewTimeline;
  message: string;
}

const mainNavItems = [
  { label: "Platform", href: "#products" },
  { label: "Proof", href: "#proof" },
  { label: "Advantage", href: "#advantage" }
];

const launchReviewTracks: LaunchReviewTrack[] = ["Executive Launch", "Advanced CRM", "Service Operations", "Integration Connect", "Mobile + Install"];
const launchReviewTimelines: LaunchReviewTimeline[] = ["Immediate", "This Month", "This Quarter", "Exploring"];
const defaultLaunchIntakeForm: LaunchIntakeFormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  interestLane: "Executive Launch",
  timeline: "This Quarter",
  message: ""
};
const launchReviewMoments = [
  {
    label: "Advanced CRM",
    value: "Customer timeline",
    detail: "Follow every inquiry, quote, deposit, and delivery in one record."
  },
  {
    label: "Integration Connect",
    value: "Instant website sync",
    detail: "Push inventory, pricing, and website updates from live dealership data."
  },
  {
    label: "Operator reach",
    value: "Install-ready",
    detail: "Desktop, dockside, and mobile stay inside the same workflow."
  }
];

const capabilityPillars: CapabilityPillar[] = [
  {
    eyebrow: "Advanced CRM",
    title: "Every lead, quote, trade, deposit, and delivery lives in one Premier Marine timeline.",
    description: "Premier Marine Advanced CRM keeps customer context, deal momentum, and follow-up attached to the actual unit instead of scattering it across tools.",
    detail: "Lead desk, quoting, texting, deposits, delivery handoff.",
    tone: "current"
  },
  {
    eyebrow: "Integration Connect",
    title: "Update your website and inventory straight from the source.",
    description: "Integration Connect keeps inventory, pricing, availability, and incoming website inquiries synced to Premier Marine so your storefront stays current without extra work.",
    detail: "Website publishing, inventory sync, inquiry capture, instant updates.",
    tone: "inventory"
  },
  {
    eyebrow: "Service control",
    title: "The shop floor gets the same live context as the showroom.",
    description: "Route work orders, technician load, parts demand, and customer updates through the same Premier Marine command layer.",
    detail: "Service queue, status updates, promise dates, advisor workflows.",
    tone: "service"
  },
  {
    eyebrow: "Command layer",
    title: "Operators get one system for approvals, reporting, mobile action, and next steps.",
    description: "Premier Marine gives ownership, managers, and frontline teams a shared operating surface instead of another disconnected dashboard stack.",
    detail: "Approvals, dashboards, reporting, mobile action, operator notes.",
    tone: "finance"
  }
];

const installDeviceChips = ["Desktop app", "Dockside tablet", "iPhone home screen", "Android app shell"];

const installGuides: InstallGuide[] = [
  {
    eyebrow: "Desktop and laptop",
    title: "Install from Chrome or Edge",
    description: "Use the browser install button or the address-bar install icon to pin Premier Marine like a native app.",
    steps: ["Open Premier Marine in Chrome or Edge.", "Click Install App or use the browser install icon.", "Launch it later from your taskbar, dock, or applications list."]
  },
  {
    eyebrow: "iPhone and iPad",
    title: "Add to Home Screen on iOS",
    description: "Safari does not show a native install prompt, so iPhone and iPad installs use the Share sheet flow.",
    steps: ["Open Premier Marine in Safari.", "Tap Share.", "Choose Add to Home Screen."]
  },
  {
    eyebrow: "Android phone and tablet",
    title: "Install from Chrome on Android",
    description: "Android supports the full install prompt, so operators can save Premier Marine directly to their app drawer.",
    steps: ["Open Premier Marine in Chrome.", "Tap Install App when prompted or use the browser menu.", "Open it from your home screen like any other app."]
  }
];

const proofSignals = [
  "Sales",
  "Service",
  "Website",
  "Mobile",
  "Customer timeline",
  "Live inventory",
  "One source",
  "Install-ready"
];

const proofCards: ProofCard[] = [
  {
    eyebrow: "Sales",
    title: "One customer timeline.",
    description: "Inquiry to delivery stays connected."
  },
  {
    eyebrow: "Website",
    title: "One live inventory source.",
    description: "Pricing and inquiries stay in sync."
  },
  {
    eyebrow: "Service",
    title: "One dispatch surface.",
    description: "Promise dates and blockers stay visible."
  },
  {
    eyebrow: "Mobile",
    title: "One install-ready workflow.",
    description: "Desktop, dockside, and field stay aligned."
  }
];

const showcaseTabs: ShowcaseTab[] = [
  {
    id: "launch-wave",
    navLabel: "What's New",
    eyebrow: "Launch wave",
    title: "Advanced CRM, Integration Connect, and live service command in one launch-ready platform.",
    description: "Premier Marine gives the dealership one place to capture demand, publish inventory, run service, and move operators faster without splitting the story across products.",
    announcement: "What's New: CRM, Connect, and service command now move together.",
    primaryAction: "See what Premier Marine can do",
    stage: {
      top: "Advanced CRM Live",
      apps: "Integration Connect | Service Board | Dockside Mobile",
      core: "Premier Marine Command Cloud",
      data: "Inventory | CRM | Service | Finance | Website",
      floor: "Premier Marine Trust Layer"
    },
    floatingLeft: {
      eyebrow: "Live movement",
      title: "One system that keeps the whole dealership moving",
      description: "The landing story changes by lane, but the command layer stays centered on Premier Marine."
    },
    floatingRight: {
      eyebrow: "Operator route",
      title: "Public story outside. Live login inside.",
      description: "The launch surface looks premium without burying access for operators."
    },
    metrics: [
      { label: "Launch view", value: "CRM + service + connect" },
      { label: "Shared source", value: "One live operating rail" },
      { label: "Operator reach", value: "Install-ready everywhere" }
    ],
    highlights: ["Advanced CRM", "Integration Connect", "Service command", "Installable web app"],
    routeSteps: [
      { label: "Capture", value: "Advanced CRM" },
      { label: "Publish", value: "Integration Connect" },
      { label: "Operate", value: "Service command" },
      { label: "Launch", value: "Install-ready access" }
    ],
    cards: [
      {
        eyebrow: "Advanced CRM",
        title: "Keep the customer timeline clean from first inquiry to delivery.",
        description: "Premier Marine keeps every quote, trade note, deposit, and follow-up decision connected to the deal in motion."
      },
      {
        eyebrow: "Integration Connect",
        title: "Push inventory and website updates from the same source of truth.",
        description: "Pricing, availability, and incoming inquiries stay synced without forcing teams into duplicate update work."
      },
      {
        eyebrow: "Service Board",
        title: "Service updates stay inside the same command layer.",
        description: "Promise dates, parts readiness, and advisor notes remain visible alongside the rest of the business."
      }
    ]
  },
  {
    id: "advanced-crm",
    navLabel: "CRM",
    eyebrow: "Advanced CRM",
    title: "Premier Marine Advanced CRM keeps every deal moving in one customer timeline.",
    description: "Built for marine dealerships, Advanced CRM keeps inquiries, trades, deposits, accessories, delivery steps, and follow-up in one operating flow.",
    announcement: "CRM Focus: Quotes, trades, deposits, and delivery in one timeline.",
    primaryAction: "Explore Advanced CRM",
    stage: {
      top: "Premier CRM Command",
      apps: "Lead Desk | Trade Review | Delivery Handoff",
      core: "Premier Marine Advanced CRM",
      data: "Leads | Deposits | Accessories | Delivery",
      floor: "Customer Timeline Engine"
    },
    floatingLeft: {
      eyebrow: "Marine-first CRM",
      title: "Built around real marine deal structure",
      description: "Boat, trailer, motor, accessories, trade, deposit, and delivery all read like one live transaction."
    },
    floatingRight: {
      eyebrow: "Customer momentum",
      title: "Catch attention outside. Keep urgency inside.",
      description: "Premier Marine turns website interest into a real customer timeline instead of another loose lead list."
    },
    metrics: [
      { label: "Customer file", value: "Inquiry to delivery" },
      { label: "Deal control", value: "Trades, deposits, approvals" },
      { label: "Follow-up", value: "Website lead into CRM" }
    ],
    highlights: ["Lead capture", "Trade appraisal", "Deposit path", "Delivery handoff"],
    routeSteps: [
      { label: "Capture", value: "Lead intake" },
      { label: "Appraise", value: "Trade review" },
      { label: "Commit", value: "Deposit path" },
      { label: "Deliver", value: "Final handoff" }
    ],
    cards: [
      {
        eyebrow: "Customer Timeline",
        title: "See the entire deal without stitching together separate tools.",
        description: "Every inquiry, quote shift, trade note, deposit, and delivery dependency stays inside the same Premier Marine record."
      },
      {
        eyebrow: "Deal Control",
        title: "Track real momentum, not just stage labels.",
        description: "Deposits, signatures, inventory locks, approvals, and next actions stay visible from the same command surface."
      },
      {
        eyebrow: "Follow-up Engine",
        title: "Turn website traffic into real operating follow-up.",
        description: "Incoming website interest can move directly into the same CRM rhythm the store team already uses every day."
      }
    ]
  },
  {
    id: "service-ops",
    navLabel: "Service",
    eyebrow: "Service ops",
    title: "A service lane that looks premium and still works like a real dispatch surface.",
    description: "Premier Marine gives service teams a polished front-end story backed by real dispatch, parts, workload, and customer update control.",
    announcement: "Service Focus: Tech load, parts, and customer updates in one lane.",
    primaryAction: "Open service operations",
    stage: {
      top: "Tech Load View",
      apps: "Advisor Board | Parts Status | ETA Updates",
      core: "Service Operations Cloud",
      data: "ROs | Parts | Promise Dates | Workload",
      floor: "Premier Marine Service Rail"
    },
    floatingLeft: {
      eyebrow: "Live board",
      title: "Dispatch, status, and customer updates",
      description: "The product story moves, but the service logic stays anchored to real shop behavior."
    },
    floatingRight: {
      eyebrow: "Operator speed",
      title: "One glance to see who is blocked",
      description: "Promise dates, parts delays, and technician load stay visible for fast action."
    },
    metrics: [
      { label: "Advisor board", value: "Live work order context" },
      { label: "Tech load", value: "Balanced by real workload" },
      { label: "Customer updates", value: "Promise dates stay visible" }
    ],
    highlights: ["Technician load", "Promise dates", "Parts blockers", "Customer updates"],
    routeSteps: [
      { label: "Check in", value: "Advisor board" },
      { label: "Dispatch", value: "Tech load" },
      { label: "Resolve", value: "Parts status" },
      { label: "Update", value: "Customer ETA" }
    ],
    cards: [
      {
        eyebrow: "Advisor Board",
        title: "Keep the customer conversation tied to the work order.",
        description: "Advisors can text or update customers without leaving the service status view."
      },
      {
        eyebrow: "Parts Readiness",
        title: "See blockers before they become angry phone calls.",
        description: "Parts status, expected arrival, and next actions stay surfaced in the same panel."
      },
      {
        eyebrow: "Technician Flow",
        title: "Balance the day with real workload visibility.",
        description: "Move work based on live technician load rather than static schedules."
      }
    ]
  },
  {
    id: "integration-connect",
    navLabel: "Connect",
    eyebrow: "Integration connect",
    title: "Website updates, inventory publishing, and incoming inquiries move straight from the source.",
    description: "Premier Marine Integration Connect keeps your website, unit availability, pricing, photos, and lead capture moving with the same source-of-truth data your team already works from.",
    announcement: "Connect Focus: Website sync, inventory publishing, and live inquiries from one source.",
    primaryAction: "See Integration Connect",
    stage: {
      top: "Instant Website Updates",
      apps: "Website | Inventory | Lead Capture",
      core: "Premier Marine Integration Connect",
      data: "Availability | Pricing | Photos | Inquiries",
      floor: "Source-of-Truth Sync"
    },
    floatingLeft: {
      eyebrow: "Straight from the source",
      title: "Update once and let Premier Marine do the rest",
      description: "Inventory and website changes move from the live operating system instead of getting trapped in manual update loops."
    },
    floatingRight: {
      eyebrow: "Always current",
      title: "Stay on top of your inventory in the world, not just in-house",
      description: "Availability, presentation, and inquiry capture stay aligned so the outside world sees the same truth your team sees."
    },
    metrics: [
      { label: "Website sync", value: "Publish from source" },
      { label: "Inventory reach", value: "Live pricing + availability" },
      { label: "Inquiry return", value: "Route straight into CRM" }
    ],
    highlights: ["Website sync", "Inventory publishing", "Instant inquiries", "Source-of-truth data"],
    routeSteps: [
      { label: "Update", value: "Inventory changes" },
      { label: "Publish", value: "Website sync" },
      { label: "Capture", value: "Live inquiries" },
      { label: "Route", value: "CRM handoff" }
    ],
    cards: [
      {
        eyebrow: "Website publishing",
        title: "Push website updates without a second system.",
        description: "Unit changes, pricing shifts, and availability updates can publish from the same place the dealership already works."
      },
      {
        eyebrow: "Inventory reach",
        title: "Keep inventory visible and current outside the dealership.",
        description: "Premier Marine helps the public-facing inventory story stay aligned with what operators actually have ready to sell."
      },
      {
        eyebrow: "Source lead capture",
        title: "Route inquiries back into Advanced CRM immediately.",
        description: "The same system that publishes your inventory can help feed the next customer conversation without delay."
      }
    ]
  }
];

function isAppleMobileDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function LandingPage({ session }: LandingPageProps) {
  const signedInWorkspacePath = session?.selectedStoreId ? `/dashboard/${session.selectedStoreId}/${DEFAULT_PRODUCTION_WORKSPACE_PATH}` : null;
  const primaryAccessPath = signedInWorkspacePath ?? "/login";
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installOutcome, setInstallOutcome] = useState<"idle" | "accepted" | "dismissed">("idle");
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
  const [activeShowcaseIndex, setActiveShowcaseIndex] = useState(0);
  const [launchForm, setLaunchForm] = useState<LaunchIntakeFormState>(defaultLaunchIntakeForm);
  const [launchIntakeStatus, setLaunchIntakeStatus] = useState<LaunchIntakeStatus>("idle");
  const [launchIntakeFeedback, setLaunchIntakeFeedback] = useState("");

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const displayMode = window.matchMedia("(display-mode: standalone)");

    const updateStandaloneState = () => {
      setIsStandalone(displayMode.matches || Boolean(navigatorWithStandalone.standalone));
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallOutcome("idle");
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setInstallOutcome("accepted");
      updateStandaloneState();
    };

    updateStandaloneState();
    setIsAppleMobile(isAppleMobileDevice());

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    displayMode.addEventListener("change", updateStandaloneState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      displayMode.removeEventListener("change", updateStandaloneState);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveShowcaseIndex((currentIndex) => (currentIndex + 1) % showcaseTabs.length);
    }, 4800);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const isInstalled = isStandalone || installOutcome === "accepted";
  const activeShowcase = showcaseTabs[activeShowcaseIndex];
  const activeShowcaseStageRows = [
    { id: "command", label: "Command layer", value: activeShowcase.stage.top },
    { id: "apps", label: "Operator apps", value: activeShowcase.stage.apps },
    { id: "core", label: "Operating core", value: activeShowcase.stage.core },
    { id: "data", label: "Live data", value: activeShowcase.stage.data },
    { id: "trust", label: "Trust rail", value: activeShowcase.stage.floor }
  ];
  const installSupportMessage = isInstalled
    ? "Premier Marine is installed on this device and can launch like a dedicated app."
    : installPrompt
      ? "This browser can install Premier Marine as an app with a dedicated icon and standalone window."
      : isAppleMobile
        ? "On iPhone and iPad, use Safari and tap Share, then Add to Home Screen to install Premier Marine."
        : "Open Premier Marine in Chrome or Edge on desktop or Android to install it like an app.";

  function updateLaunchForm<FieldName extends keyof LaunchIntakeFormState>(fieldName: FieldName, value: LaunchIntakeFormState[FieldName]) {
    setLaunchForm((currentForm) => ({
      ...currentForm,
      [fieldName]: value
    }));
  }

  async function handleInstallClick() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallOutcome(choice.outcome);
  }

  function renderInstallControl(className: string, label = "Install App", installedLabel = "Installed") {
    if (isInstalled) {
      return (
        <a className={className} href="#install">
          {installedLabel}
        </a>
      );
    }

    if (installPrompt) {
      return (
        <button className={className} onClick={() => void handleInstallClick()} type="button">
          {label}
        </button>
      );
    }

    return (
      <a className={className} href="#install">
        {label}
      </a>
    );
  }

  async function handleLaunchIntakeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLaunchIntakeStatus("submitting");
    setLaunchIntakeFeedback("");

    try {
      const result = await submitPublicLaunchIntake(launchForm);
      setLaunchIntakeStatus("success");
      setLaunchIntakeFeedback(`${result.message} Routed to ${result.assignedStoreName}.`);
      setLaunchForm({ ...defaultLaunchIntakeForm });
    } catch (error) {
      setLaunchIntakeStatus("error");
      setLaunchIntakeFeedback(error instanceof Error ? error.message : "Unable to submit the launch review request right now.");
    }
  }

  return (
    <main className="pm-launch">
      <div aria-hidden="true" className="pm-launch-background">
        <div className="pm-launch-aura is-one" />
        <div className="pm-launch-aura is-two" />
        <div className="pm-launch-grid" />
      </div>

      <header className="pm-launch-nav-shell">
        <div className="pm-launch-nav">
          <Link className="pm-launch-brand" to="/">
            <span className="pm-launch-brand-mark">PM</span>
            <span className="pm-launch-brand-copy">
              <strong>Premier Marine</strong>
              <span>Marine dealership operating cloud</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="pm-launch-nav-tabs">
            {mainNavItems.map((item) => (
              <a className="pm-launch-nav-tab" href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pm-launch-nav-utilities">
            <a className="pm-launch-utility-link" href="#contact">
              Contact Us
            </a>
            <Link className="pm-launch-utility-link" to={primaryAccessPath}>
              Login
            </Link>
            <a className="pm-launch-utility-cta" href="#products">
              Get started
            </a>
          </div>
        </div>
      </header>

      <section className="pm-launch-announcement" id="whats-new">
        <span className="pm-launch-announcement-pill">What&apos;s New</span>
        <p>{activeShowcase.announcement}</p>
        <a className="pm-launch-announcement-link" href="#products">
          See what&apos;s new
        </a>
      </section>

      <section className="pm-launch-hero">
        <div className="pm-launch-copy">
          <span className="pm-launch-eyebrow">Premier Marine for modern dealerships</span>
          <h1>One operating system for all dealerships.</h1>
          <p>CRM, inventory, website sync, service control, and install-ready access stay connected inside Premier Marine.</p>

          <div className="pm-launch-cta-row">
            <a className="pm-launch-button is-primary" href="#products">
              See how it works
            </a>
            <a className="pm-launch-button is-secondary" href="#contact">
              Request a launch review
            </a>
            <Link className="pm-launch-button is-ghost" to={primaryAccessPath}>
              {signedInWorkspacePath ? "Open Dashboard" : "Login"}
            </Link>
          </div>

          <div className="pm-launch-install-row">
            {renderInstallControl("pm-launch-install-action", "Install App")}
            <span>{installSupportMessage}</span>
          </div>

          <div className="pm-launch-stat-grid">
            <article className="pm-launch-stat-card">
              <span>Public launch surface</span>
              <strong>Brand-first entry with direct operator access.</strong>
            </article>
            <article className="pm-launch-stat-card">
              <span>Advanced CRM</span>
              <strong>Keep the full customer timeline intact.</strong>
            </article>
            <article className="pm-launch-stat-card">
              <span>Integration Connect</span>
              <strong>Keep website and inventory synced to the source.</strong>
            </article>
          </div>

          <div className="pm-launch-command-rail">
            {launchReviewMoments.map((moment) => (
              <article className="pm-launch-command-card" key={moment.label}>
                <span>{moment.label}</span>
                <strong>{moment.value}</strong>
                <p>{moment.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="pm-launch-stage">
          <div aria-hidden="true" className="pm-launch-stage-halo" />
          <div aria-hidden="true" className="pm-launch-stage-glow" />

          <div className="pm-launch-stage-visual">
            <div className="pm-launch-live-board">
              <div className="pm-launch-live-board-head">
                <div className="pm-launch-live-board-title">
                  <span>{activeShowcase.eyebrow}</span>
                  <strong>{activeShowcase.primaryAction}</strong>
                </div>

                <div className="pm-launch-live-status">
                  {activeShowcase.highlights.slice(0, 3).map((highlight) => (
                    <span key={highlight}>{highlight}</span>
                  ))}
                </div>
              </div>

              <div className="pm-launch-live-board-body">
                <article className="pm-launch-live-context-card">
                  <span>{activeShowcase.floatingLeft.eyebrow}</span>
                  <strong>{activeShowcase.floatingLeft.title}</strong>
                  <p>{activeShowcase.floatingLeft.description}</p>
                  <div className="pm-launch-live-chip-row">
                    {activeShowcase.highlights.slice(0, 2).map((highlight) => (
                      <span key={highlight}>{highlight}</span>
                    ))}
                  </div>
                </article>

                <div className="pm-launch-live-stream">
                  <div aria-hidden="true" className="pm-launch-live-beam" />

                  {activeShowcaseStageRows.map((row) => (
                    <article className={`pm-launch-live-lane is-${row.id}`} key={row.id}>
                      <div className="pm-launch-live-lane-copy">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                      <div className="pm-launch-live-lane-meter" />
                    </article>
                  ))}
                </div>

                <article className="pm-launch-live-context-card is-secondary">
                  <span>{activeShowcase.floatingRight.eyebrow}</span>
                  <strong>{activeShowcase.floatingRight.title}</strong>
                  <p>{activeShowcase.floatingRight.description}</p>
                  <div className="pm-launch-live-chip-row">
                    {activeShowcase.highlights.slice(-2).map((highlight) => (
                      <span key={highlight}>{highlight}</span>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          </div>

          <div aria-label="Hero showcase tabs" className="pm-launch-stage-tabrail" role="tablist">
            {showcaseTabs.map((tab, index) => (
              <button
                aria-pressed={activeShowcaseIndex === index}
                className={`pm-launch-stage-tab${activeShowcaseIndex === index ? " is-active" : ""}`}
                key={tab.id}
                onClick={() => setActiveShowcaseIndex(index)}
                type="button"
              >
                {tab.navLabel}
              </button>
            ))}
          </div>

          <div className="pm-launch-stage-console">
            <div className="pm-launch-stage-console-head">
              <span>{activeShowcase.eyebrow}</span>
              <strong>{activeShowcase.primaryAction}</strong>
            </div>
            <div className="pm-launch-stage-console-grid">
              {activeShowcase.highlights.slice(0, 3).map((highlight) => (
                <article className="pm-launch-stage-console-card" key={highlight}>
                  <span>Live module</span>
                  <strong>{highlight}</strong>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="pm-launch-proof-heading" className="pm-launch-proof-band" id="proof">
        <div className="pm-launch-proof-head">
          <span>Operating proof</span>
          <h2 id="pm-launch-proof-heading">Sales, service, website, and mobile stay on one rail.</h2>
          <p>Premier Marine keeps every lane tied to the same login, source of truth, and install-ready workflow.</p>
        </div>

        <div aria-hidden="true" className="pm-launch-proof-strip">
          <div className="pm-launch-proof-strip-track">
            {proofSignals.map((signal, index) => (
              <span key={`${signal}-primary-${index}`}>{signal}</span>
            ))}
          </div>

          <div className="pm-launch-proof-strip-track is-offset">
            {proofSignals.map((signal, index) => (
              <span key={`${signal}-secondary-${index}`}>{signal}</span>
            ))}
          </div>
        </div>

        <div className="pm-launch-proof-grid">
          {proofCards.map((card) => (
            <article className="pm-launch-proof-card" key={card.eyebrow}>
              <span>{card.eyebrow}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pm-launch-products" id="products">
        <div className="pm-launch-section-head pm-launch-products-head">
          <span>Platform spotlight</span>
          <h2>See Premier Marine through one focused spotlight.</h2>
          <p>Switch between CRM, service, website sync, and launch view without opening a second product story.</p>
        </div>

        <div className="pm-launch-product-spotlight">
          <div aria-label="Product spotlight tabs" className="pm-launch-product-tabrail" role="tablist">
            {showcaseTabs.map((tab, index) => (
              <button
                aria-pressed={activeShowcaseIndex === index}
                className={`pm-launch-product-tab${activeShowcaseIndex === index ? " is-active" : ""}`}
                key={tab.id}
                onClick={() => setActiveShowcaseIndex(index)}
                type="button"
              >
                <span>{tab.eyebrow}</span>
                <strong>{tab.navLabel}</strong>
              </button>
            ))}
          </div>

          <div className={`pm-launch-product-stage is-${activeShowcase.id}`}>
            <article className="pm-launch-product-stage-copy">
              <span>{activeShowcase.eyebrow}</span>
              <h3>{activeShowcase.title}</h3>
              <p>{activeShowcase.description}</p>

              <div className="pm-launch-product-metric-grid">
                {activeShowcase.metrics.map((metric) => (
                  <article className="pm-launch-product-metric-card" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </article>
                ))}
              </div>

              <div className="pm-launch-cta-row">
                <a className="pm-launch-button is-primary" href="#contact">
                  {activeShowcase.primaryAction}
                </a>
                {renderInstallControl("pm-launch-button is-secondary", "Install the App")}
              </div>

              <article className="pm-launch-product-spotlight-note">
                <span>{activeShowcase.floatingLeft.eyebrow}</span>
                <strong>{activeShowcase.floatingLeft.title}</strong>
                <p>{activeShowcase.floatingLeft.description}</p>
              </article>
            </article>

            <div className="pm-launch-product-stage-visual">
              <div className="pm-launch-product-stage-stack">
                <article className="pm-launch-product-stage-row is-top">
                  <span>Customer view</span>
                  <strong>{activeShowcase.stage.top}</strong>
                </article>

                <article className="pm-launch-product-stage-row is-apps">
                  <span>Operator apps</span>
                  <strong>{activeShowcase.stage.apps}</strong>
                </article>

                <article className="pm-launch-product-stage-row is-core">
                  <span>Operating core</span>
                  <strong>{activeShowcase.stage.core}</strong>
                </article>

                <article className="pm-launch-product-stage-row is-data">
                  <span>Live data</span>
                  <strong>{activeShowcase.stage.data}</strong>
                </article>

                <article className="pm-launch-product-stage-row is-floor">
                  <span>Trust rail</span>
                  <strong>{activeShowcase.stage.floor}</strong>
                </article>
              </div>

              <div className="pm-launch-product-card-grid pm-launch-product-route-grid">
                {activeShowcase.routeSteps.map((step, index) => (
                  <article className="pm-launch-product-card pm-launch-product-route-card" key={step.label}>
                    <span>{`${String(index + 1).padStart(2, "0")} ${step.label}`}</span>
                    <strong>{step.value}</strong>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pm-launch-industries" id="advantage">
        <div className="pm-launch-section-head">
          <span>Why Premier Marine</span>
          <h2>Why Premier Marine stands out.</h2>
          <p>Customer control, connected inventory, service command, and one shared operating layer.</p>
        </div>

        <div className="pm-launch-capability-grid">
          {capabilityPillars.map((pillar) => (
            <article className={`pm-launch-capability-card tone-${pillar.tone}`} key={pillar.title}>
              <span>{pillar.eyebrow}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
              <strong>{pillar.detail}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="pm-launch-install" id="install">
        <div className="pm-launch-section-head">
          <span>Install everywhere</span>
          <h2>Install Premier Marine wherever the team works.</h2>
          <p>Keep the browser entry, then install it on desktop, dockside, tablet, and phone.</p>
        </div>

        <div className="pm-launch-install-grid">
          <article className="pm-launch-install-panel">
            <span>Install flow</span>
            <h3>Open in browser. Install when ready.</h3>
            <p>{installSupportMessage}</p>

            <div className="pm-launch-chip-row">
              {installDeviceChips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>

            <div className="pm-launch-cta-row">
              {renderInstallControl("pm-launch-button is-primary", "Install Premier Marine")}
              <Link className="pm-launch-button is-ghost" to={primaryAccessPath}>
                {signedInWorkspacePath ? "Open Dashboard" : "Login in Browser"}
              </Link>
            </div>
          </article>

          <div className="pm-launch-install-guides">
            {installGuides.map((guide) => (
              <article className="pm-launch-guide-card" key={guide.title}>
                <span>{guide.eyebrow}</span>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                <ol>
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pm-launch-contact" id="contact">
        <div className="pm-launch-section-head">
          <span>Contact us</span>
          <h2>Start a Premier Marine launch review.</h2>
          <p>We route the request into Premier Marine so the conversation starts inside the platform.</p>
        </div>

        <div className="pm-launch-contact-layout">
          <form className="pm-launch-contact-form" onSubmit={handleLaunchIntakeSubmit}>
            <div className="pm-launch-contact-form-head">
              <span>Launch intake</span>
              <h3>Request a launch review.</h3>
              <p>Choose the lane, set the timing, and tell us what needs attention first.</p>
            </div>

            <div className="pm-launch-form-grid">
              <label className="pm-launch-field">
                <span>Name</span>
                <input
                  autoComplete="name"
                  onChange={(event) => updateLaunchForm("name", event.target.value)}
                  placeholder="Morgan Rivera"
                  required
                  type="text"
                  value={launchForm.name}
                />
              </label>

              <label className="pm-launch-field">
                <span>Company</span>
                <input
                  autoComplete="organization"
                  onChange={(event) => updateLaunchForm("company", event.target.value)}
                  placeholder="Premier Marine Group"
                  type="text"
                  value={launchForm.company}
                />
              </label>

              <label className="pm-launch-field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  onChange={(event) => updateLaunchForm("email", event.target.value)}
                  placeholder="morgan@premiermarine.com"
                  required
                  type="email"
                  value={launchForm.email}
                />
              </label>

              <label className="pm-launch-field">
                <span>Phone</span>
                <input
                  autoComplete="tel"
                  onChange={(event) => updateLaunchForm("phone", event.target.value)}
                  placeholder="(305) 555-0188"
                  required
                  type="tel"
                  value={launchForm.phone}
                />
              </label>
            </div>

            <div className="pm-launch-form-grid is-compact">
              <label className="pm-launch-field">
                <span>Review track</span>
                <select onChange={(event) => updateLaunchForm("interestLane", event.target.value as LaunchReviewTrack)} value={launchForm.interestLane}>
                  {launchReviewTracks.map((track) => (
                    <option key={track} value={track}>
                      {track}
                    </option>
                  ))}
                </select>
              </label>

              <label className="pm-launch-field">
                <span>Timeline</span>
                <select onChange={(event) => updateLaunchForm("timeline", event.target.value as LaunchReviewTimeline)} value={launchForm.timeline}>
                  {launchReviewTimelines.map((timeline) => (
                    <option key={timeline} value={timeline}>
                      {timeline}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="pm-launch-review-chip-row">
              {launchReviewTimelines.map((timeline) => (
                <button
                  aria-pressed={launchForm.timeline === timeline}
                  className={`pm-launch-review-chip${launchForm.timeline === timeline ? " is-active" : ""}`}
                  key={timeline}
                  onClick={() => updateLaunchForm("timeline", timeline)}
                  type="button"
                >
                  {timeline}
                </button>
              ))}
            </div>

            <label className="pm-launch-field is-full">
              <span>What should we review first?</span>
              <textarea
                onChange={(event) => updateLaunchForm("message", event.target.value)}
                placeholder="Tell us which workflow, rollout milestone, or launch gap you want the first review to cover."
                required
                value={launchForm.message}
              />
            </label>

            <div className="pm-launch-form-actions">
              <button className="pm-launch-button is-primary" disabled={launchIntakeStatus === "submitting"} type="submit">
                {launchIntakeStatus === "submitting" ? "Submitting request..." : "Request launch review"}
              </button>
              <Link className="pm-launch-button is-ghost" to={primaryAccessPath}>
                {signedInWorkspacePath ? "Return to dashboard" : "Operator login"}
              </Link>
            </div>

            {launchIntakeFeedback ? (
              <p className={`pm-launch-form-feedback is-${launchIntakeStatus === "error" ? "error" : "success"}`}>{launchIntakeFeedback}</p>
            ) : (
              <p className="pm-launch-form-note">Every request creates a real CRM conversation in Premier Marine&apos;s launch queue.</p>
            )}
          </form>

          <div className="pm-launch-contact-side">
            <article className="pm-launch-contact-panel">
              <span>Review tracks</span>
              <h3>Choose the lane to start with.</h3>
              <div className="pm-launch-review-track-list">
                {launchReviewTracks.map((track) => (
                  <button
                    aria-pressed={launchForm.interestLane === track}
                    className={`pm-launch-track-chip${launchForm.interestLane === track ? " is-active" : ""}`}
                    key={track}
                    onClick={() => updateLaunchForm("interestLane", track)}
                    type="button"
                  >
                    {track}
                  </button>
                ))}
              </div>
            </article>

            <article className="pm-launch-contact-panel">
              <span>Scheduler posture</span>
              <h3>We route it like a real operating review.</h3>
              <ul className="pm-launch-review-list">
                <li>Executive walkthrough for platform story and rollout priorities.</li>
                <li>Advanced CRM and service review for customer command and queue visibility.</li>
                <li>Integration Connect and mobile review for website sync, live inquiries, and install planning.</li>
              </ul>
            </article>

            <div className="pm-launch-contact-mini-grid">
              <article className="pm-launch-contact-card">
                <span>See how it works</span>
                <h3>Show the platform before the login.</h3>
                <p>Give stakeholders the product story before they step into the live workspace.</p>
                <a className="pm-launch-inline-link" href="#products">
                  View the platform story
                </a>
              </article>

              <article className="pm-launch-contact-card">
                <span>Install path</span>
                <h3>Keep install planning in the same conversation.</h3>
                <p>Desktop, dock, tablet, and phone rollout stays tied to the launch review.</p>
                {renderInstallControl("pm-launch-inline-link", "Install the app", "Installed")}
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}