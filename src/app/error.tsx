"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-border/50 shadow-card p-8 text-center">
        <div className="flex justify-center mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Une erreur est survenue</h2>
        <p className="text-sm text-slate-400 mb-1">{error.message || "Erreur inattendue"}</p>
        {error.digest && (
          <p className="text-[10px] font-mono text-slate-300 mb-5">{error.digest}</p>
        )}
        <Button onClick={reset} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 gap-2">
          <RefreshCw className="h-4 w-4" /> Réessayer
        </Button>
      </div>
    </div>
  );
}
