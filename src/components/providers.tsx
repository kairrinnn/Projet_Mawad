"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((registrationError) => {
            if (process.env.NODE_ENV !== "production") {
              console.error("SW registration failed:", registrationError);
            }
          });
      });
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
