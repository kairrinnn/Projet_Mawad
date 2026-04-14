"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Loader2,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Search,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payments";
import { cn } from "@/lib/utils";

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

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

const PAYMENT_COLORS: Record<string, string> = {
  CASH:     "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CARD:     "bg-blue-50 text-blue-700 ring-blue-200",
  TRANSFER: "bg-violet-50 text-violet-700 ring-violet-200",
  MIXED:    "bg-amber-50 text-amber-700 ring-amber-200",
};

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sales", { cache: "no-store" });
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
      const res = await fetch(`/api/sales/${id}/refund`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { toast.success("Achat remboursé avec succès"); fetchSales(); }
      else toast.error(data.error || "Erreur lors du remboursement");
    } catch { toast.error("Erreur réseau"); }
    finally { setRefundingId(null); }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD" }).format(val);

  const filteredSales = (Array.isArray(sales) ? sales : []).filter((s) =>
    (s.product?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const totalRevenue = filteredSales
    .filter((s) => s.type === "SALE" && !s.isRefunded)
    .reduce((acc, s) => acc + (Number(s.totalPrice) || Number(s.salePrice) * Number(s.quantity) - Number(s.discount)), 0);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSales = filteredSales.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (val: string) => { setSearchTerm(val); setCurrentPage(1); };

  return (
    <div className="flex flex-col h-full gap-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historique des Ventes</h1>
            <p className="text-sm text-slate-400">
              {loading ? "Chargement…" : `${filteredSales.length} transaction${filteredSales.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        {!loading && filteredSales.length > 0 && (
          <div className="flex gap-3">
            <div className="rounded-xl border border-border/50 bg-white shadow-sm px-4 py-2 text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Ventes nettes</p>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-white shadow-sm px-4 py-2 text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Transactions</p>
              <p className="text-sm font-bold text-slate-900">{filteredSales.filter((s) => s.type === "SALE").length}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          className="pl-9 rounded-xl bg-white border-border/60 shadow-sm focus-visible:ring-indigo-500/20"
          placeholder="Rechercher par produit…"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-white border border-border/50 shadow-card overflow-hidden">

        {/* Header row */}
        <div className="flex-shrink-0 grid grid-cols-[1.4fr_1.6fr_0.8fr_0.9fr_60px_0.9fr_1fr_90px] px-4 py-2.5 bg-slate-50/80 border-b border-border/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <span>Date & Heure</span>
          <span>Produit</span>
          <span>Ticket</span>
          <span>Paiement</span>
          <span className="text-center">Qté</span>
          <span className="text-right">Réduction</span>
          <span className="text-right">Net à Payer</span>
          <span className="text-right">Action</span>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            <span className="text-sm">Chargement de l&apos;historique…</span>
          </div>
        ) : paginatedSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Receipt className="h-10 w-10 text-slate-300" />
            <p className="text-sm">Aucune vente enregistrée pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {paginatedSales.map((sale) => {
              const isRefunded = sale.isRefunded;
              const isReturn = sale.type === "REFUND";
              const net = Number(sale.totalPrice) || Number(sale.salePrice) * Number(sale.quantity) - Number(sale.discount);
              const payColor = sale.paymentMethod
                ? (PAYMENT_COLORS[sale.paymentMethod] ?? "bg-slate-50 text-slate-600 ring-slate-200")
                : "";

              return (
                <div
                  key={sale.id}
                  className={cn(
                    "grid grid-cols-[1.4fr_1.6fr_0.8fr_0.9fr_60px_0.9fr_1fr_90px] items-center px-4 py-3 text-sm transition-colors duration-100",
                    isRefunded && "opacity-50 bg-slate-50/40",
                    isReturn && !isRefunded && "bg-amber-50/30 hover:bg-amber-50/50",
                    !isRefunded && !isReturn && "hover:bg-slate-50/60"
                  )}
                >
                  {/* Date */}
                  <span className="text-xs text-slate-500">
                    {format(new Date(sale.createdAt), "dd MMM yyyy · HH:mm", { locale: fr })}
                  </span>

                  {/* Product */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "font-medium truncate",
                      isRefunded ? "text-slate-400 line-through" : isReturn ? "text-amber-700" : "text-slate-800"
                    )}>
                      {sale.product?.name || "Produit inconnu"}
                    </span>
                    {isReturn && (
                      <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        Retour
                      </span>
                    )}
                    {isRefunded && !isReturn && (
                      <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                        Remboursé
                      </span>
                    )}
                  </div>

                  {/* Ticket */}
                  <span className="text-xs text-slate-400 font-mono">{sale.ticketNumber || "—"}</span>

                  {/* Payment */}
                  <div>
                    {sale.paymentMethod ? (
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1", payColor)}>
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </div>

                  {/* Qty */}
                  <div className="flex justify-center">
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full text-xs font-bold ring-1",
                      isReturn
                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                        : "bg-slate-50 text-slate-700 ring-slate-200"
                    )}>
                      {sale.quantity > 0 ? `+${sale.quantity}` : sale.quantity}
                    </span>
                  </div>

                  {/* Discount */}
                  <div className="text-right">
                    {sale.discount > 0 ? (
                      <span className="text-amber-600 font-medium text-xs">-{formatCurrency(sale.discount)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </div>

                  {/* Net */}
                  <div className={cn(
                    "text-right font-bold tabular-nums",
                    isRefunded ? "text-slate-400" : isReturn ? "text-amber-700" : "text-slate-900"
                  )}>
                    {formatCurrency(net)}
                  </div>

                  {/* Action */}
                  <div className="flex justify-end">
                    {sale.type !== "REFUND" && !sale.isRefunded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1 text-xs px-2.5"
                        onClick={() => handleRefund(sale.id)}
                        disabled={refundingId === sale.id}
                      >
                        {refundingId === sale.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RotateCcw className="h-3 w-3" />
                        }
                        <span className="hidden sm:inline">Rembourser</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Footer */}
        {!loading && filteredSales.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2.5 border-t border-border/40 bg-slate-50/50">
            <p className="text-[11px] text-slate-400">
              {filteredSales.length} transaction{filteredSales.length > 1 ? "s" : ""} au total
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="text-xs text-slate-400">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredSales.length)} sur {filteredSales.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/60"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-300">…</span>
              ) : (
                <Button
                  key={p}
                  variant={safePage === p ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full text-xs border-border/60",
                    safePage === p && "bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
                  )}
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/60"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
