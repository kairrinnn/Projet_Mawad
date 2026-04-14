"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ maxWidth: 480, width: "100%", padding: "2rem", background: "white", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", marginBottom: 8 }}>Erreur — GlobalError boundary</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Une erreur est survenue</div>
          <pre style={{ fontSize: 12, background: "#f1f5f9", padding: "12px", borderRadius: 8, overflowX: "auto", color: "#475569", marginBottom: 16 }}>
            {error?.message || "Erreur inconnue"}
            {"\n"}
            {error?.digest ? `Digest: ${error.digest}` : ""}
            {"\n\n"}
            {error?.stack?.slice(0, 800)}
          </pre>
          <button
            onClick={reset}
            style={{ width: "100%", padding: "12px", background: "#4f46e5", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
