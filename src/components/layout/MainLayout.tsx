"use client";

import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readLocalShopSettings } from "@/lib/shop-settings";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("Mawad Scan");
  const pathname = usePathname();

  useEffect(() => {
    const syncSettings = () => {
      setShopName(readLocalShopSettings().shopName);
    };

    syncSettings();
    window.addEventListener("shop-settings-updated", syncSettings);
    return () => window.removeEventListener("shop-settings-updated", syncSettings);
  }, []);

  if (pathname === '/login') {
    return <main className="h-screen bg-slate-50">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-16 flex-shrink-0 items-center border-b bg-white px-4 md:hidden shadow-sm z-50">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={(props) => (
              <Button variant="ghost" size="icon" className="-ml-2 text-slate-600" {...props}>
                <span className="sr-only">Ouvrir le menu</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            )} />
            <SheetContent side="left" className="p-0 w-64 border-r-0">
                <SheetHeader className="sr-only">
                    <SheetTitle>Menu de navigation</SheetTitle>
                </SheetHeader>
              <Sidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="ml-4 flex grow items-center font-bold text-lg text-slate-900 tracking-tight">
            {shopName}
          </div>
        </header>

        {/* Main section */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden focus:outline-none">
          <div className="container mx-auto max-w-7xl px-4 py-8 pb-20 md:pb-8 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
        <Toaster position="top-right" richColors />
      </div>
    </div>
  );
}
