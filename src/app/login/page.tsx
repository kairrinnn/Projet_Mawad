"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { QrCode, ShieldCheck, TrendingUp, Package } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden">

      {/* ── Left — branding panel ─────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0d0d1f 0%, #0a0a1b 60%, #0f0a2a 100%)" }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        {/* Content */}
        <div className="relative flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <QrCode className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-semibold text-white tracking-tight">MawadScan</span>
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/20 rounded-full px-3 py-1 mb-6 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[11px] font-medium text-indigo-300 uppercase tracking-wider">POS · Gestion</span>
            </div>

            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight mb-4">
              Gérez votre boutique,<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)" }}
              >
                sans effort.
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Inventaire, ventes, caisse et bilan — tout en un seul endroit, accessible en quelques secondes.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-3 mb-8">
            {[
              { icon: Package,    label: "Gestion de stock en temps réel",      color: "text-violet-400", bg: "bg-violet-500/15" },
              { icon: TrendingUp, label: "Tableau de bord financier complet",    color: "text-emerald-400", bg: "bg-emerald-500/15" },
              { icon: ShieldCheck,label: "Accès sécurisé par rôle (PIN gérant)", color: "text-indigo-400", bg: "bg-indigo-500/15" },
            ].map(({ icon: Icon, label, color, bg }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <span className="text-sm text-slate-300">{label}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-[11px] text-slate-600">© 2026 MawadScan · Tous droits réservés</p>
        </div>
      </div>

      {/* ── Right — login form ────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 relative">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">MawadScan</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Connexion</h2>
            <p className="text-sm text-slate-400">Accédez à votre espace de gestion.</p>
          </div>

          {/* Google button */}
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-200 shadow-sm font-medium gap-3"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            {/* Google SVG */}
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.18 2.18 5.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continuer avec Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">accès sécurisé</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-5">
            {[
              { icon: ShieldCheck, label: "Sécurisé" },
              { icon: QrCode,      label: "QR Codes" },
              { icon: TrendingUp,  label: "Analytics" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Legal */}
          <p className="text-center text-[11px] text-slate-400 mt-8 leading-relaxed">
            En vous connectant, vous acceptez nos{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-slate-600">conditions d&apos;utilisation</span>{" "}
            et notre{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-slate-600">politique de confidentialité</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
