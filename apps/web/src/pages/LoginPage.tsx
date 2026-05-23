import { FormEvent, startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api";
import { StoreSelectModal } from "../components/StoreSelectModal";
import { legacyFallbackNavigation, quickLaunchButtons } from "../lightspeedReference";
import type { LoginPayload, SessionState, StoreOption } from "../types";

interface LoginPageProps {
  onSessionReady: (session: SessionState) => void;
}

const platformHighlights = [
  {
    label: "Marine DMS",
    detail: "Deal desk, unit readiness, and inventory control in one lane."
  },
  {
    label: "Payroll Concept",
    detail: "QuickBooks-inspired finance workflows without making the screen feel heavy."
  },
  {
    label: "Executive Analytics",
    detail: "Power BI-style scorecards and drill-downs from the same operating surface."
  },
  {
    label: "Website Feeds",
    detail: "Publishing inventory to Premier and Ocean sites with a live operational rail."
  }
];

export function LoginPage({ onSessionReady }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("mmay@premier-yamaha.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingLogin, setPendingLogin] = useState<LoginPayload | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = await login(email, password);
      setPendingLogin(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStoreSelect(store: StoreOption) {
    if (!pendingLogin) {
      return;
    }

    const nextSession: SessionState = {
      user: pendingLogin.user,
      stores: pendingLogin.stores,
      selectedStoreId: store.id
    };

    startTransition(() => {
      onSessionReady(nextSession);
      navigate(`/dashboard/${store.id}/desktop`);
    });
  }

  return (
    <div className="legacy-login-screen">
      <header className="legacy-app-frame">
        <div className="legacy-title-strip">
          <span>Premier Marine Cloud DMS</span>
          <span>Operator Sign In</span>
        </div>

        <div className="legacy-menu-row">
          <div className="legacy-login-menu-links">
            {legacyFallbackNavigation.map((group) => (
              <span className="legacy-static-menu-item" key={group.label}>
                {group.label}
              </span>
            ))}
          </div>

          <div className="legacy-header-tools">
            <input className="legacy-global-search" placeholder="Main Menu Quick Search" readOnly type="text" />
          </div>
        </div>

        <div className="legacy-launch-strip">
          {quickLaunchButtons.map((button) => (
            <button className="legacy-launch-button" disabled key={button.slot} type="button">
              <span>{button.slot}</span>
              <strong>{button.label}</strong>
            </button>
          ))}
        </div>
      </header>

      <div className="legacy-login-body">
        <aside className="legacy-login-sidebar">
          <div className="legacy-open-title">Open Windows</div>
          <div className="legacy-window-link active">Desktop</div>
          <div className="legacy-login-sidebar-footer">
            <span className="brand-badge">PBC + OMG Marine Cloud</span>
            <h1>Tight operational control across DMS, payroll, analytics, and website publishing.</h1>
            <p>
              Sign in, select a store, and enter a command surface built to feel like the day-to-day DMS environment
              your operators already understand.
            </p>
            <div className="legacy-login-highlight-list">
              {platformHighlights.map((item) => (
                <article className="legacy-login-highlight" key={item.label}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </article>
              ))}
            </div>
          </div>
        </aside>

        <main className="legacy-login-workarea">
          <div className="legacy-window-bar">
            <div>
              <strong>Login</strong>
              <span>Choose a store after sign-in to enter the command surface.</span>
            </div>
          </div>

          <div className="legacy-login-stage">
            <section className="legacy-login-panel">
              <div className="legacy-login-panel-header">
                <span className="section-eyebrow">Operator access</span>
                <h2>Sign in</h2>
                <p>Seeded demo user: mmay@premier-yamaha.com</p>
              </div>

              <form className="legacy-login-form" onSubmit={handleSubmit}>
                <label>
                  <span>Email</span>
                  <input
                    autoComplete="username"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="dealer@company.com"
                    type="email"
                    value={email}
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter any password for the seeded demo"
                    type="password"
                    value={password}
                  />
                </label>

                {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

                <button className="legacy-login-submit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Signing in..." : "Enter Desktop"}
                </button>
              </form>

              <div className="legacy-login-note-bar">
                <span>Store selection opens immediately after login.</span>
                <span>Desktop, Service, Parts, Sales, and Website pages are routed after sign-in.</span>
              </div>
            </section>
          </div>
        </main>
      </div>

      <StoreSelectModal
        onClose={() => setPendingLogin(null)}
        onSelect={handleStoreSelect}
        open={Boolean(pendingLogin)}
        stores={pendingLogin?.stores ?? []}
        subtitle="Choose the store lane you want to operate from. The dashboard shell will follow that context."
        title="Select a Store"
      />
    </div>
  );
}