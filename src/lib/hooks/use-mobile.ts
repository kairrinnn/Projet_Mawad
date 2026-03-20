"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Returns true if the current viewport width is below the mobile breakpoint.
 * Uses a matchMedia listener to track changes reactively.
 */
export function useMobile(): boolean {
  // Initialize lazily from window to avoid SSR mismatch
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
