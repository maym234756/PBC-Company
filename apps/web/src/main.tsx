import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const LOCALHOST_CACHE_RESET_RELOAD_KEY = "marine-cloud-localhost-cache-reset-reload";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (import.meta.env.PROD && !isLocalhost) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      return;
    }

    if (!isLocalhost) {
      return;
    }

    void Promise.all([
      navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          await Promise.all(registrations.map((registration) => registration.unregister()));
          return registrations.length > 0;
        })
        .catch(() => false),
      "caches" in window
        ? window.caches
            .keys()
            .then(async (keys) => {
              const matchingKeys = keys.filter((key) => key.startsWith("premier-marine-shell"));
              await Promise.all(matchingKeys.map((key) => window.caches.delete(key)));
              return matchingKeys.length > 0;
            })
            .catch(() => false)
        : Promise.resolve(false)
    ]).then(([hadRegistrations, hadCachedShellAssets]) => {
      const alreadyReloaded = window.sessionStorage.getItem(LOCALHOST_CACHE_RESET_RELOAD_KEY) === "done";

      if (!hadRegistrations && !hadCachedShellAssets) {
        window.sessionStorage.removeItem(LOCALHOST_CACHE_RESET_RELOAD_KEY);
        return;
      }

      if (alreadyReloaded) {
        window.sessionStorage.removeItem(LOCALHOST_CACHE_RESET_RELOAD_KEY);
        return;
      }

      window.sessionStorage.setItem(LOCALHOST_CACHE_RESET_RELOAD_KEY, "done");
      window.location.reload();
    });
  });
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);