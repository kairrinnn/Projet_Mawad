"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex items-center justify-center h-[80vh]">
      <Card className="w-full max-w-sm shadow-xl border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto bg-indigo-100 h-16 w-16 rounded-full flex items-center justify-center mb-3">
            <ShieldCheck className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Accès Gérant</CardTitle>
          <CardDescription>Entrez votre code PIN pour continuer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPin} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className={`text-center text-3xl tracking-[1em] font-bold h-16 ${pinError ? "border-red-500" : ""}`}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              placeholder="••••"
            />
            {pinError && <p className="text-red-500 text-xs text-center font-medium">Code PIN incorrect</p>}
            <Button type="submit" className="w-full bg-indigo-600 h-12 text-base font-semibold" disabled={loading}>
              {loading ? "Vérification..." : "Accéder"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
