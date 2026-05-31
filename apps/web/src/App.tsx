import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { isWorkspaceId } from "./lightspeedReference";
import type { SessionState, WorkspaceId } from "./types";
import { DEFAULT_PHONE_WORKSPACE_ID, resolvePhoneWorkspaceId, useIsPhoneViewport } from "./usePhoneViewport";

const SESSION_STORAGE_KEY = "marine-cloud-session";
const DEFAULT_PRODUCTION_WORKSPACE_ID: WorkspaceId = "desktop";
const VOLATILE_DASHBOARD_SESSION_PREFIXES = [
  "marine-cloud-open-windows",
  "marine-cloud-open-window-order",
  "marine-cloud-open-window-routes",
  "marine-cloud-dismissed-open-window",
  "marine-cloud-open-service-detail-windows",
  "marine-cloud-open-parts-inventory-detail-windows",
  "marine-cloud-open-sales-deal-detail-windows"
];

const DashboardPage = lazy(async () => {
  const module = await import("./pages/DashboardPage");
  return { default: module.DashboardPage };
});

const LoginPage = lazy(async () => {
  const module = await import("./pages/LoginPage");
  return { default: module.LoginPage };
});

const LandingPage = lazy(async () => {
  const module = await import("./pages/LandingPage");
  return { default: module.LandingPage };
});

export default function App() {
  const [session, setSession] = useState<SessionState | null>(() => readSession());
  const isPhoneViewport = useIsPhoneViewport();
  const defaultWorkspaceId = isPhoneViewport ? DEFAULT_PHONE_WORKSPACE_ID : DEFAULT_PRODUCTION_WORKSPACE_ID;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (session) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return;
    }

    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, [session]);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              element={<LandingPage session={session} />}
              path="/"
            />
            <Route
              element={<LoginRoute defaultWorkspaceId={defaultWorkspaceId} onSessionChange={setSession} session={session} />}
              path="/login"
            />
            <Route
              element={<LoginRoute defaultWorkspaceId={defaultWorkspaceId} onSessionChange={setSession} session={session} />}
              path="/login/sandbox/:sandboxId"
            />
            <Route
              element={<DashboardIndexRoute defaultWorkspaceId={defaultWorkspaceId} session={session} />}
              path="/dashboard/:storeId"
            />
            <Route
              element={<DashboardRoute defaultWorkspaceId={defaultWorkspaceId} isPhoneViewport={isPhoneViewport} onSessionChange={setSession} session={session} />}
              path="/dashboard/:storeId/:workspaceId"
            />
            <Route
              element={<Navigate replace to={session?.selectedStoreId ? `/dashboard/${session.selectedStoreId}/${defaultWorkspaceId}` : "/"} />}
              path="*"
            />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

function RouteFallback() {
  return <div className="app-route-loading">Loading workspace...</div>;
}

interface DashboardRouteProps {
  defaultWorkspaceId: WorkspaceId;
  isPhoneViewport?: boolean;
  session: SessionState | null;
  onSessionChange: (session: SessionState | null) => void;
}

function LoginRoute({ defaultWorkspaceId, session, onSessionChange }: DashboardRouteProps) {
  const { sandboxId } = useParams<{ sandboxId?: string }>();

  if (session?.selectedStoreId && !sandboxId) {
    return <Navigate replace to={`/dashboard/${session.selectedStoreId}/${defaultWorkspaceId}`} />;
  }

  return <LoginPage onSessionReady={onSessionChange} sandboxId={sandboxId ?? null} />;
}

function DashboardIndexRoute({ defaultWorkspaceId, session }: Pick<DashboardRouteProps, "defaultWorkspaceId" | "session">) {
  const { storeId } = useParams<{ storeId: string }>();

  if (!session) {
    return <Navigate replace to="/" />;
  }

  const nextStoreId = storeId ?? session.selectedStoreId ?? session.stores[0]?.id;

  if (!nextStoreId) {
    return <Navigate replace to="/" />;
  }

  return <Navigate replace to={`/dashboard/${nextStoreId}/${defaultWorkspaceId}`} />;
}

function DashboardRoute({ defaultWorkspaceId, isPhoneViewport = false, session, onSessionChange }: DashboardRouteProps) {
  const navigate = useNavigate();
  const { storeId, workspaceId } = useParams<{ storeId: string; workspaceId: string }>();
  const routeWorkspaceId: WorkspaceId = workspaceId && isWorkspaceId(workspaceId) ? workspaceId : defaultWorkspaceId;
  const resolvedWorkspaceId = isPhoneViewport ? resolvePhoneWorkspaceId(routeWorkspaceId) : routeWorkspaceId;

  useEffect(() => {
    if (!session) {
      return;
    }

    const matchedStore = session.stores.find((store) => store.id === storeId);

    if (!matchedStore && session.selectedStoreId) {
      navigate(`/dashboard/${session.selectedStoreId}/${defaultWorkspaceId}`, { replace: true });
      return;
    }

    if (matchedStore && (!isWorkspaceId(workspaceId ?? "") || resolvedWorkspaceId !== routeWorkspaceId)) {
      navigate(`/dashboard/${matchedStore.id}/${resolvedWorkspaceId}`, { replace: true });
      return;
    }

    if (matchedStore && matchedStore.id !== session.selectedStoreId) {
      onSessionChange({
        ...session,
        selectedStoreId: matchedStore.id
      });
    }
  }, [defaultWorkspaceId, navigate, onSessionChange, resolvedWorkspaceId, routeWorkspaceId, session, storeId, workspaceId]);

  if (!session) {
    return <Navigate replace to="/" />;
  }

  const activeStore = session.stores.find((store) => store.id === (storeId ?? session.selectedStoreId)) ?? session.stores[0];

  return (
    <DashboardPage
      activeStoreId={activeStore.id}
      onSelectStore={(selectedStoreId) => {
        onSessionChange({
          ...session,
          selectedStoreId
        });
      }}
      onSignOut={() => {
        clearVolatileDashboardSessionState(session.user.id);
        onSessionChange(null);
        navigate("/", { replace: true });
      }}
      session={session}
      workspaceId={resolvedWorkspaceId}
    />
  );
}

function clearVolatileDashboardSessionState(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  for (const prefix of VOLATILE_DASHBOARD_SESSION_PREFIXES) {
    window.sessionStorage.removeItem(`${prefix}:${userId}`);
  }
}

function readSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}
