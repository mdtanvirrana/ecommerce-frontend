"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Hydration-safe media query hook built on React's useSyncExternalStore.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      const mql = window.matchMedia(query);
      const handler = () => onStoreChange();
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return serverFallback;
    return window.matchMedia(query).matches;
  }, [query, serverFallback]);

  const getServerSnapshot = useCallback(() => serverFallback, [serverFallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
