import { FormEvent, startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSandboxLoginAccess, login } from "../api";
import { StoreSelectModal } from "../components/StoreSelectModal";
import type { LoginPayload, SandboxSessionContext, SessionState, StoreOption } from "../types";

const DEFAULT_PRODUCTION_WORKSPACE_PATH = "desktop";

interface LoginPageProps {
  onSessionReady: (session: SessionState) => void;
  sandboxId?: string | null;
}

export function LoginPage({ onSessionReady, sandboxId = null }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("mmay@premier-yamaha.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSandboxAccess, setIsLoadingSandboxAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingLogin, setPendingLogin] = useState<LoginPayload | null>(null);
  const [sandboxAccess, setSandboxAccess] = useState<SandboxSessionContext | null>(null);

  useEffect(() => {
    if (!sandboxId) {
      setSandboxAccess(null);
      setEmail("mmay@premier-yamaha.com");
      setPassword("");
      return;
    }

    let isActive = true;
    setIsLoadingSandboxAccess(true);
    setErrorMessage(null);

    void getSandboxLoginAccess(sandboxId)
      .then((access) => {
        if (!isActive) {
          return;
        }

        setSandboxAccess({
          dealerGroupName: access.dealerGroupName,
          isReadOnly: true,
          loginEmail: access.loginEmail,
          readOnlyNotice: access.readOnlyNotice,
          sandboxId: access.sandboxId,
          sandboxName: access.sandboxName,
          sourceStoreId: access.sourceStoreId,
          sourceStoreName: access.sourceStoreName
        });
        setEmail(access.loginEmail);
        setPassword(access.apiKey);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load sandbox access.");
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingSandboxAccess(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [sandboxId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload = await login(email, password, sandboxId);
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
      mode: pendingLogin.mode ?? (sandboxAccess ? "sandbox" : "production"),
      sandboxContext: pendingLogin.sandboxContext ?? sandboxAccess,
      user: pendingLogin.user,
      stores: pendingLogin.stores,
      selectedStoreId: store.id
    };

    startTransition(() => {
      onSessionReady(nextSession);
      navigate(`/dashboard/${store.id}/${DEFAULT_PRODUCTION_WORKSPACE_PATH}`);
    });
  }

  return (
    <div className="login-page-screen">
      <div className="login-page-backdrop" aria-hidden="true" />

      <div className="login-page-card">
        <div className="login-page-header">
          <span className="brand-badge">{sandboxAccess ? "Sandbox Access" : "PBC + OMG Marine Cloud"}</span>
          <h1>{sandboxAccess ? "Sign in to Sandbox" : "Sign in"}</h1>
          <p>
            {sandboxAccess
              ? `${sandboxAccess.sandboxName} mirrors ${sandboxAccess.dealerGroupName} and opens with reduced sandbox chrome.`
              : "Seeded demo user: mmay@premier-yamaha.com"}
          </p>
        </div>

        <form className="login-page-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="username"
              disabled={isLoadingSandboxAccess}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={sandboxAccess ? "operator@dealer.com.sandbox" : "dealer@company.com"}
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>{sandboxAccess ? "API Key" : "Password"}</span>
            <input
              autoComplete="current-password"
              disabled={isLoadingSandboxAccess}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={sandboxAccess ? "Sandbox API key" : "Enter any password for the seeded demo"}
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="primary-button login-page-submit" disabled={isSubmitting || isLoadingSandboxAccess} type="submit">
            {isSubmitting ? "Signing in..." : sandboxAccess ? "Enter Sandbox" : "Enter Website"}
          </button>
        </form>

        <div className="login-page-note">
          <span>
            {sandboxAccess
              ? sandboxAccess.readOnlyNotice
              : "Store selection opens immediately after login."}
          </span>
          <span>
            {sandboxAccess
              ? `Sandbox sign-in is scoped to ${sandboxAccess.dealerGroupName} only. ${sandboxAccess.sourceStoreName} is the source lane for this environment.`
              : "Desktop opens first, with Website, Service, Parts, and Sales available inside."}
          </span>
        </div>
      </div>

      <StoreSelectModal
        onClose={() => setPendingLogin(null)}
        onSelect={handleStoreSelect}
        open={Boolean(pendingLogin)}
        stores={pendingLogin?.stores ?? []}
        subtitle={sandboxAccess ? `Choose a ${sandboxAccess.dealerGroupName} store lane for this sandbox session.` : "Choose the store lane you want to operate from. The dashboard shell will follow that context."}
        title={sandboxAccess ? "Select a Sandbox Store" : "Select a Store"}
      />
    </div>
  );
}
