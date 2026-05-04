"use client";

import { ShieldCheck, Loader2 } from "lucide-react";

interface ManagerPinGateProps {
  pin: string;
  setPin: (val: string) => void;
  pinError: boolean;
  submitPin: (e: React.FormEvent) => void;
  loading: boolean;
}

export function ManagerPinGate({ pin, setPin, pinError, submitPin, loading }: ManagerPinGateProps) {
  return (
    <div
      className="flex items-center justify-center min-h-[70vh]"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(91,33,182,0.25) 0%, transparent 60%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Card */}
        <div
          className="p-8"
          style={{
            background: "#161929",
            border: "1px solid rgba(124,58,237,0.20)",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(124,58,237,0.10)",
          }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)",
                boxShadow: "0 0 30px rgba(124,58,237,0.40)",
              }}
            >
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Accès Gérant</h2>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              Entrez votre code PIN pour continuer.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submitPin} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="w-full text-center text-3xl tracking-[1em] font-bold h-14 rounded-xl outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: pinError
                  ? "1px solid rgba(239,68,68,0.6)"
                  : "1px solid rgba(124,58,237,0.30)",
                color: "#fff",
                ...(pinError ? {} : {}),
              }}
              onFocus={(e) => {
                if (!pinError) e.target.style.borderColor = "rgba(124,58,237,0.80)";
              }}
              onBlur={(e) => {
                if (!pinError) e.target.style.borderColor = "rgba(124,58,237,0.30)";
              }}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              placeholder="••••"
            />

            {pinError && (
              <p className="text-red-400 text-xs text-center font-medium animate-fade-up">
                Code PIN incorrect. Réessayez.
              </p>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold text-white transition-all disabled:cursor-not-allowed"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #5B21B6, #7C3AED)",
                boxShadow: "0 4px 20px rgba(124,58,237,0.5)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
                </span>
              ) : (
                "Accéder"
              )}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.30)" }}>
          Zone sécurisée — Gérants uniquement
        </p>
      </div>
    </div>
  );
}
