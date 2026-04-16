"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  QrCode,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { readLocalShopSettings } from "@/lib/shop-settings";

const navItems = [
  { name: "Dashboard",    href: "/",          icon: LayoutDashboard, roles: ["MANAGER"] },
  { name: "Gérant",       href: "/manager",   icon: ShieldCheck,     roles: ["MANAGER"] },
  { name: "Produits",     href: "/products",  icon: Package,         roles: ["MANAGER", "CASHIER"] },
  { name: "Scanner",      href: "/scan",      icon: QrCode,          roles: ["MANAGER", "CASHIER"] },
  { name: "Ventes",       href: "/sales",     icon: ShoppingCart,    roles: ["MANAGER", "CASHIER"] },
  { name: "Fournisseurs", href: "/suppliers", icon: Users,           roles: ["MANAGER"] },
  { name: "Paramètres",   href: "/settings",  icon: Settings,        roles: ["MANAGER"] },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "CASHIER";
  const [shopName, setShopName] = useState("Mawad Scan");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const syncSettings = () => {
      setShopName(readLocalShopSettings().shopName);
    };
    syncSettings();
    window.addEventListener("shop-settings-updated", syncSettings);
    return () => window.removeEventListener("shop-settings-updated", syncSettings);
  }, []);

  const filteredNav = navItems.filter((item) => !item.roles || item.roles.includes(userRole));

  return (
    <div
      className="flex h-full w-64 flex-col"
      style={{ background: "linear-gradient(180deg, #0d0d1f 0%, #0a0a1b 100%)" }}
    >
      {/* ── Logo ───────────────────────────────────── */}
      <div className="flex h-16 items-center px-5 border-b border-white/[0.06]">
        <Link
          href="/"
          className="flex items-center gap-3 group"
          onClick={onNavigate}
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 transition-transform duration-200 group-hover:scale-105">
            <QrCode className="h-4 w-4 text-white" />
            <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="text-sm font-semibold text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading, sans-serif)" }}
            >
              {shopName}
            </span>
            <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
              POS · Gestion
            </span>
          </div>
        </Link>
      </div>

      {/* ── Nav ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-white shadow-lg nav-glow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
              )}
              style={
                isActive
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(79,70,229,0.85) 0%, rgba(124,58,237,0.80) 100%)",
                      boxShadow: "0 4px 20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                    }
                  : undefined
              }
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-white/80" />
              )}
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                  isActive
                    ? "text-white"
                    : "text-slate-500 group-hover:text-slate-300 group-hover:scale-110"
                )}
              />
              <span className="truncate">{item.name}</span>

              {/* Hover shimmer for inactive */}
              {!isActive && (
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Upgrade hint (visual flair) ─────────────── */}
      <div className="mx-3 mb-3">
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
          style={{
            background: "linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(124,58,237,0.08) 100%)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-[11px] text-indigo-300 font-medium">MawadScan Pro</span>
          <span className="ml-auto text-[10px] text-indigo-400/70 bg-indigo-500/20 px-1.5 py-0.5 rounded-full">
            v2
          </span>
        </div>
      </div>

      {/* ── User profile ───────────────────────────── */}
      <div
        className="border-t border-white/[0.06] p-3"
      >
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.05] cursor-pointer group"
        >
          {session?.user?.image ? (
            <div className="relative h-8 w-8 flex-shrink-0">
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                fill
                className="rounded-full object-cover ring-2 ring-white/10"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0d0d1f]" />
            </div>
          ) : (
            <div className="relative h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center ring-2 ring-white/10">
              <UserIcon className="h-4 w-4 text-indigo-300" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0d0d1f]" />
            </div>
          )}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-semibold text-white/90 truncate">
              {session?.user?.name || "Utilisateur"}
            </span>
            <span className="text-[10px] text-slate-500 truncate">
              {session?.user?.email}
            </span>
          </div>
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-white/[0.08] transition-colors"
              title={resolvedTheme === "dark" ? "Mode clair" : "Mode sombre"}
              aria-label="Changer le thème"
            >
              {resolvedTheme === "dark"
                ? <Sun className="h-3.5 w-3.5" />
                : <Moon className="h-3.5 w-3.5" />
              }
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10"
            title="Déconnexion"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
