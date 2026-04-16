"use client";

import { Sidebar } from "./Sidebar";
import { Menu, QrCode, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { readLocalShopSettings } from "@/lib/shop-settings";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("Mawad Scan");
  const pathname = usePathname();
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

  if (pathname === "/login") {
    return <main className="h-screen">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar ─────────────────────── */}
      <div className="hidden md:flex md:flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.12)]">
        <Sidebar />
      </div>

      {/* ── Content area ────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="flex h-14 flex-shrink-0 items-center px-4 md:hidden z-50 border-b border-border/60"
          style={{
            background: "linear-gradient(180deg, #0d0d1f 0%, #0a0a1b 100%)",
          }}
        >
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={(props) => (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 text-white/70 hover:text-white hover:bg-white/10"
                {...props}
              >
                <span className="sr-only">Ouvrir le menu</span>
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            )} />
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu de navigation</SheetTitle>
              </SheetHeader>
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="ml-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
              <QrCode className="h-3.5 w-3.5 text-white" />
            </div>
            <span
              className="text-sm font-semibold text-white tracking-tight"
              style={{ fontFamily: "var(--font-heading, sans-serif)" }}
            >
              {shopName}
            </span>
          </div>

          <div className="ml-auto">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label="Changer le thème"
              >
                {resolvedTheme === "dark"
                  ? <Sun className="h-4 w-4" />
                  : <Moon className="h-4 w-4" />
                }
              </Button>
            )}
          </div>
        </header>

        {/* ── Main content ────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-grid">
          <div className="animate-fade-up flex-1 min-h-0 w-full mx-auto max-w-7xl px-4 py-8 pb-20 md:pb-8 sm:px-6 md:px-8 overflow-y-auto">
            {children}
          </div>
        </main>

        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              borderRadius: "12px",
              fontSize: "13px",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </div>
    </div>
  );
}
