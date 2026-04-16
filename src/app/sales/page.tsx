"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
  RotateCcw,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payments";

interface SaleRow {
  id: string;
  createdAt: string;
  quantity: number;
  discount: number;
  totalPrice: number;
  salePrice: number;
  ticketNumber?: string | null;
  paymentMethod?: PaymentMethod;
  isRefunded: boolean;
  type: "SALE" | "REFUND";
  product?: { name?: string } | null;
}

/** Must match the height applied to each desktop row below */
const ROW_H = 44;

const PAYMENT_COLORS: Record<string, string> = {
  CASH:     "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  CARD:     "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  TRANSFER: "bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  MIXED:    "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
};

function getNetAmount(sale: SaleRow) {
  return (
    Number(sale.totalPrice) ||
    Number(sale.salePrice) * Number(sale.quantity) - Number(sale.discount)
  );
}

export default function SalesPage() {
  const [sales, setSales]           = useState<SaleRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]     = useState(12);
  const bodyRef = useRef<HTMLDivElement>(null);

  /* ── Dynamic page size: counts exactly how many rows fit ── */
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const calc = () => setPageSize(Math.max(5, Math.floor(el.clientHeight / ROW_H)));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/sales", { cache: "no-store" });
      const data = await res.json();
      setSales(Array.isArray(data) ? data : []);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);

  const handleRefund = async (id: string) => {
    if (!confirm("Voulez-vous vraiment rembourser cet achat ?")) return;
    setRefundingId(id);
    try {
      const res  = await fetch(`/api/sales/${id}/refund`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { toast.success("Achat remboursé avec succès."); fetchSales(); }
      else toast.error(data.error || "Erreur lors du remboursement");
    } catch { toast.error("Erreur réseau"); }
    finally   { setRefundingId(null); }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD" }).format(v);

  const filtered = (Array.isArray(sales) ? sales : []).filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      (s.product?.name?.toLowerCase() || "").includes(q) ||
      (s.ticketNumber?.toLowerCase()  || "").includes(q) ||
      (s.paymentMethod ? PAYMENT_METHOD_LABELS[s.paymentMethod].toLowerCase() : "").includes(q)
    );
  });

  const salesCount  = filtered.filter(s => s.type === "SALE" && !s.isRefunded).length;
  const totalRev    = filtered.filter(s => s.type === "SALE" && !s.isRefunded).reduce((a, s) => a + getNetAmount(s), 0);
  const avgBasket   = salesCount > 0 ? totalRev / salesCount : 0;
  const refundCount = filtered.filter(s => s.isRefunded || s.type === "REFUND").length;
  const refundTotal = filtered.filter(s => s.isRefunded || s.type === "REFUND").reduce((a, s) => a + getNetAmount(s), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const metrics = [
    { label: "Ventes nettes",  value: fmt(totalRev),  icon: TrendingUp,  color: "text-indigo-500" },
    { label: "Transactions",   value: `${salesCount}`, icon: ShoppingCart, color: "text-violet-500" },
    { label: "Panier moyen",   value: fmt(avgBasket), icon: Receipt,      color: "text-emerald-500" },
    {
      label: "Remboursements",
      value: refundCount > 0 ? `${refundCount} · ${fmt(refundTotal)}` : "—",
      icon: RotateCcw,
      color: refundCount > 0 ? "text-rose-500" : "text-slate-400",
    },
  ];

  return (
    <div className="flex h-full gap-4">

      {/* ── LEFT: Stats + Search (desktop only) ──────────── */}
      <div className="hidden lg:flex w-56 flex-shrink-0 flex-col gap-4">

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm flex-shrink-0">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Ventes</h1>
            <p className="text-xs text-slate-400">
              {loading ? "…" : `${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="flex flex-col gap-2">
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800/60 border border-border/50 px-3.5 py-3 shadow-sm"
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                  {loading ? "—" : value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Produit, ticket…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Refresh */}
        <Button variant="outline" size="sm" onClick={fetchSales} className="gap-2 text-xs">
          <RotateCcw className="h-3.5 w-3.5" />
          Actualiser
        </Button>
      </div>

      {/* ── RIGHT: Table ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-border/50 shadow-card overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0">
            <ShoppingCart className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex-1">Ventes</span>
          <span className="text-xs text-slate-400">{filtered.length}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchSales}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Mobile search */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-border/50 lg:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Produit, ticket…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Desktop table column headers */}
        <div className="flex-shrink-0 hidden lg:grid grid-cols-[1.4fr_1.6fr_0.8fr_0.9fr_56px_0.8fr_1fr_86px] px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-border/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          <span>Date</span>
          <span>Produit</span>
          <span>Ticket</span>
          <span>Paiement</span>
          <span className="text-center">Qté</span>
          <span>Réduction</span>
          <span className="text-right">Net</span>
          <span className="text-right">Action</span>
        </div>

        {/* ── Body (fills remaining height, no scroll) ──── */}
        <div ref={bodyRef} className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <Receipt className="h-9 w-9 text-slate-300 dark:text-slate-600" />
              <span className="text-sm">{searchTerm ? "Aucun résultat" : "Aucune vente"}</span>
            </div>
          ) : (
            <>
              {/* Mobile: card list (scrollable) */}
              <div className="lg:hidden h-full overflow-y-auto divide-y divide-border/40 px-3">
                {paginated.map((sale) => {
                  const isRefunded = sale.isRefunded;
                  const isReturn   = sale.type === "REFUND";
                  const net        = getNetAmount(sale);
                  const payColor   = sale.paymentMethod ? (PAYMENT_COLORS[sale.paymentMethod] ?? "") : "";
                  return (
                    <div key={sale.id} className={cn("py-3 flex items-center gap-3", isRefunded && "opacity-50")}>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-semibold truncate", isRefunded ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-50")}>
                            {sale.product?.name || "Produit inconnu"}
                          </span>
                          {isReturn && <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">Retour</span>}
                        </div>
                        <p className="text-xs text-slate-400">{format(new Date(sale.createdAt), "dd MMM · HH:mm", { locale: fr })}</p>
                      </div>
                      <div className="flex-shrink-0 text-right space-y-0.5">
                        <p className={cn("text-sm font-bold", isReturn ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-50")}>{fmt(net)}</p>
                        {sale.paymentMethod && <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", payColor)}>{PAYMENT_METHOD_LABELS[sale.paymentMethod]}</span>}
                      </div>
                      {sale.type !== "REFUND" && !sale.isRefunded && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => handleRefund(sale.id)} disabled={refundingId === sale.id}>
                          {refundingId === sale.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: fixed-height rows (no scroll) */}
              <div className="hidden lg:block">
                {paginated.map((sale) => {
                  const isRefunded = sale.isRefunded;
                  const isReturn   = sale.type === "REFUND";
                  const net        = getNetAmount(sale);
                  const payColor   = sale.paymentMethod
                    ? (PAYMENT_COLORS[sale.paymentMethod] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")
                    : "";
                  return (
                    <div
                      key={sale.id}
                      style={{ height: ROW_H }}
                      className={cn(
                        "grid grid-cols-[1.4fr_1.6fr_0.8fr_0.9fr_56px_0.8fr_1fr_86px] items-center border-b border-border/30 px-4 text-sm last:border-0",
                        isRefunded && "opacity-50 bg-slate-50/40 dark:bg-slate-800/20",
                        isReturn && !isRefunded && "bg-amber-50/30 hover:bg-amber-50/50 dark:bg-amber-500/5 dark:hover:bg-amber-500/8",
                        !isRefunded && !isReturn && "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      )}
                    >
                      {/* Date */}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(sale.createdAt), "dd MMM yyyy · HH:mm", { locale: fr })}
                      </span>

                      {/* Product */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("font-medium truncate", isRefunded ? "text-slate-400 line-through" : isReturn ? "text-amber-700 dark:text-amber-400" : "text-slate-800 dark:text-slate-100")}>
                          {sale.product?.name || "Produit inconnu"}
                        </span>
                        {isReturn && <span className="flex-shrink-0 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.5 rounded-full">Retour</span>}
                        {isRefunded && !isReturn && <span className="flex-shrink-0 text-[9px] font-bold uppercase bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded-full">Remboursé</span>}
                      </div>

                      {/* Ticket */}
                      <span className="text-xs text-slate-400 font-mono">{sale.ticketNumber || "—"}</span>

                      {/* Payment */}
                      <div>
                        {sale.paymentMethod ? (
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", payColor)}>
                            {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                          </span>
                        ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </div>

                      {/* Qty */}
                      <div className="flex justify-center">
                        <span className={cn("inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-full text-xs font-bold", isReturn ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200")}>
                          {sale.quantity > 0 ? `+${sale.quantity}` : sale.quantity}
                        </span>
                      </div>

                      {/* Discount */}
                      <div className="text-xs">
                        {sale.discount > 0
                          ? <span className="text-amber-600 dark:text-amber-400 font-medium">-{fmt(sale.discount)}</span>
                          : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </div>

                      {/* Net */}
                      <div className={cn("text-right font-bold tabular-nums", isRefunded ? "text-slate-400" : isReturn ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-slate-50")}>
                        {fmt(net)}
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">
                        {sale.type !== "REFUND" && !sale.isRefunded && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10 gap-1 text-xs px-2"
                            onClick={() => handleRefund(sale.id)}
                            disabled={refundingId === sale.id}
                          >
                            {refundingId === sale.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <RotateCcw className="h-3 w-3" />
                            }
                            <span className="hidden xl:inline">Rembourser</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Footer: arrows only ───────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between border-t border-border/40 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-2">
          <span className="text-[11px] text-slate-400 tabular-nums">
            {loading
              ? "…"
              : filtered.length === 0
                ? "0 résultat"
                : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} / ${filtered.length}`
            }
          </span>
          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <span className="text-xs text-slate-400 tabular-nums">
                {safePage} / {totalPages}
              </span>
            )}
            <Button
              variant="outline" size="icon"
              className="h-7 w-7 rounded-full border-border/60"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1 || loading}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="icon"
              className="h-7 w-7 rounded-full border-border/60"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages || loading}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
