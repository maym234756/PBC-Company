import { useEffect, useState } from "react";
import type { WorkspaceId } from "./types";

export const DEFAULT_PHONE_WORKSPACE_ID: WorkspaceId = "analytics";

export function resolvePhoneWorkspaceId(workspaceId: WorkspaceId): WorkspaceId {
  return workspaceId === "desktop" ? DEFAULT_PHONE_WORKSPACE_ID : workspaceId;
}

export function useIsPhoneViewport() {
  const [isPhoneViewport, setIsPhoneViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");

    function handleChange(event: MediaQueryListEvent) {
      setIsPhoneViewport(event.matches);
    }

    setIsPhoneViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isPhoneViewport;
}