import { FormEvent, startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api";
import { StoreSelectModal } from "../components/StoreSelectModal";
import type { LoginPayload, SessionState, StoreOption } from "../types";

interface LoginPageProps {
  onSessionReady: (session: SessionState) => void;
}

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
      navigate(`/dashboard/${store.id}/website`);
    });
  }

  return (
    <div className="login-page-screen">
      <div className="login-page-backdrop" aria-hidden="true" />

      <div className="login-page-card">
        <div className="login-page-header">
          <span className="brand-badge">PBC + OMG Marine Cloud</span>
          <h1>Sign in</h1>
          <p>Seeded demo user: mmay@premier-yamaha.com</p>
        </div>

        <form className="login-page-form" onSubmit={handleSubmit}>
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

          <button className="primary-button login-page-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Enter Website"}
          </button>
        </form>

        <div className="login-page-note">
          <span>Store selection opens immediately after login.</span>
          <span>Website opens first, with Desktop, Service, Parts, and Sales available inside.</span>
        </div>
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
