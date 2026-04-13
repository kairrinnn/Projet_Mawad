"use client";

import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ManagerPinGateProps {
  pin: string;
  setPin: (val: string) => void;
  pinError: boolean;
  submitPin: (e: React.FormEvent) => void;
  loading: boolean;
}

export function ManagerPinGate({ pin, setPin, pinError, submitPin, loading }: ManagerPinGateProps) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-card p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: "0 8px 24px rgba(79,70,229,0.30)",
              }}
            >
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Accès Gérant</h2>
            <p className="text-sm text-slate-400 mt-1">Entrez votre code PIN pour continuer.</p>
          </div>

          {/* Form */}
          <form onSubmit={submitPin} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className={`text-center text-3xl tracking-[1em] font-bold h-14 rounded-xl transition-all ${
                pinError
                  ? "border-red-400 focus-visible:ring-red-400/30 bg-red-50/50"
                  : "focus-visible:ring-indigo-500/20"
              }`}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              placeholder="••••"
            />

            {pinError && (
              <p className="text-red-500 text-xs text-center font-medium animate-fade-up">
                Code PIN incorrect. Réessayez.
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Vérification…</>
              ) : (
                "Accéder"
              )}
            </Button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Zone sécurisée — Gérants uniquement
        </p>
      </div>
    </div>
  );
}
