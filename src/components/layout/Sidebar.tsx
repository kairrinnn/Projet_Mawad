"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  QrCode, 
  ShoppingCart, 
  Users, 
  Settings,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Scanner", href: "/scan", icon: QrCode },
  { name: "Ventes", href: "/sales", icon: ShoppingCart },
  { name: "Fournisseurs", href: "/suppliers", icon: Users },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-slate-50">
      <div className="flex h-16 items-center justify-center border-b border-slate-800 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <QrCode className="h-6 w-6 text-indigo-400" />
          <span>Mawad<span className="text-indigo-400">Scan</span></span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || "User"} 
              className="h-9 w-9 rounded-full border border-slate-700"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <UserIcon className="h-5 w-5 text-slate-400" />
            </div>
          )}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{session?.user?.name || "Utilisateur"}</span>
            <span className="text-xs text-slate-400 truncate">{session?.user?.email}</span>
          </div>
          <button 
            onClick={() => signOut()}
            className="text-slate-400 hover:text-red-400 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
