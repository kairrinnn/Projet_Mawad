"use client";

import { useEffect, useState } from "react";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page += 1
  ) {
    pages.push(page);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}

const PAYMENT_COLORS: Record<string, string> = {
  CASH: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  CARD: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  TRANSFER: "bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  MIXED: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
};

function getNetAmount(sale: SaleRow) {
  return (
    Number(sale.totalPrice) ||
    Number(sale.salePrice) * Number(sale.quantity) - Number(sale.discount)
  );
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sales", { cache: "no-store" });
      const data = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleRefund = async (id: string) => {
    if (!confirm("Voulez-vous vraiment rembourser cet achat ?")) return;

    setRefundingId(id);
    try {
      const response = await fetch(`/api/sales/${id}/refund`, { method: "POST" });
      const data = await response.json();

      if (response.ok) {
        toast.success("Achat remboursé avec succès.");
        fetchSales();
      } else {
        toast.error(data.error || "Erreur lors du remboursement");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRefundingId(null);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "MAD",
    }).format(value);

  const filteredSales = (Array.isArray(sales) ? sales : []).filter((sale) => {
    const query = searchTerm.toLowerCase();
    const paymentLabel = sale.paymentMethod
      ? PAYMENT_METHOD_LABELS[sale.paymentMethod].toLowerCase()
      : "";

    return (
      (sale.product?.name?.toLowerCase() || "").includes(query) ||
      (sale.ticketNumber?.toLowerCase() || "").includes(query) ||
      paymentLabel.includes(query)
    );
  });

  const totalRevenue = filteredSales
    .filter((sale) => sale.type === "SALE" && !sale.isRefunded)
    .reduce((sum, sale) => sum + getNetAmount(sale), 0);
  const refundCount = filteredSales.filter(
    (sale) => sale.isRefunded || sale.type === "REFUND"
  ).length;
  const refundAmount = filteredSales
    .filter((sale) => sale.isRefunded || sale.type === "REFUND")
    .reduce((sum, sale) => sum + getNetAmount(sale), 0);
  const completedSalesCount = filteredSales.filter(
    (sale) => sale.type === "SALE" && !sale.isRefunded
  ).length;
  const averageBasket = completedSalesCount > 0 ? totalRevenue / completedSalesCount : 0;

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSales = filteredSales.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const metricCards = [
    {
      label: "Ventes nettes",
      value: formatCurrency(totalRevenue),
      accent: "bg-white/12 text-white ring-1 ring-white/12",
      icon: TrendingUp,
    },
    {
      label: "Transactions",
      value: `${completedSalesCount}`,
      accent: "bg-white/12 text-white ring-1 ring-white/12",
      icon: ShoppingCart,
    },
    {
      label: "Panier moyen",
      value: formatCurrency(averageBasket),
      accent: "bg-white/12 text-white ring-1 ring-white/12",
      icon: Receipt,
    },
    {
      label: "Remboursements",
      value: `${refundCount} · ${formatCurrency(refundAmount)}`,
      accent:
        refundCount > 0
          ? "bg-rose-500/18 text-white ring-1 ring-rose-200/25"
          : "bg-emerald-500/18 text-white ring-1 ring-emerald-200/25",
      icon: RotateCcw,
    },
  ];

  return (
    <div className="space-y-6">
      <section
        className="rounded-[2rem] px-6 py-6 text-white sm:px-7"
        style={{
          background: "linear-gradient(135deg, #1E1040 0%, #5B21B6 50%, #7C3AED 100%)",
          boxShadow: "0 24px 60px rgba(91,33,182,0.4)",
          border: "1px solid rgba(124,58,237,0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle noise overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at top right, rgba(255,255,255,0.12) 0%, transparent 60%), radial-gradient(circle at bottom left, rgba(255,255,255,0.06) 0%, transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90"
              style={{ background: "rgba(0,0,0,0.20)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <ShoppingCart className="size-3.5" />
              Journal de caisse
            </span>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Historique des ventes
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.20)", border: "1px solid rgba(255,255,255,0.12)" }}>
                {filteredSales.length} transaction{filteredSales.length > 1 ? "s" : ""}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.20)", border: "1px solid rgba(255,255,255,0.12)" }}>
                {completedSalesCount} vente{completedSalesCount > 1 ? "s" : ""} active{completedSalesCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[460px]">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.10em]" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {metric.label}
                    </p>
                    <div className="flex items-center justify-center h-6 w-6 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }}>
                      <Icon className="size-3.5 text-white" />
                    </div>
                  </div>
                  <p className="mt-2.5 text-xl font-extrabold tracking-tight">
                    {loading ? "--" : metric.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search bar */}
      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{ background: "#161929", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-white/30" />
            <Input
              className="h-11 pl-11"
              placeholder="Rechercher un produit, un ticket ou un paiement..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Button type="button" variant="outline" onClick={fetchSales} className="flex-shrink-0">
            <RotateCcw className="size-4" />
            Actualiser
          </Button>
        </div>
      </div>

      <section
        className="overflow-hidden rounded-2xl"
        style={{ background: "#161929", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Transactions
            </p>
            <h2 className="text-base font-semibold text-white/90 mt-0.5">
              Journal de caisse
            </h2>
          </div>

          {!loading && filteredSales.length > 0 ? (
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: "#1E2235",
                color: "#A78BFA",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredSales.length)} / {filteredSales.length}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
              <Loader2 className="size-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                Synchronisation des ventes
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Les transactions sont en train d&apos;etre chargées.
              </p>
            </div>
          </div>
        ) : paginatedSales.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-300">
              <Receipt className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-950 dark:text-slate-50">
                Aucune transaction trouvée
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ajuste ta recherche ou attends les prochaines ventes pour remplir cet écran.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 lg:hidden">
              {paginatedSales.map((sale) => {
                const isRefunded = sale.isRefunded;
                const isReturn = sale.type === "REFUND";
                const net = getNetAmount(sale);
                const paymentColor = sale.paymentMethod
                  ? PAYMENT_COLORS[sale.paymentMethod] ?? "bg-slate-100 text-slate-700"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

                return (
                  <article
                    key={sale.id}
                    className={cn(
                      "rounded-[1.5rem] border p-4 shadow-[0_16px_32px_rgba(15,23,42,0.05)]",
                      isRefunded
                        ? "border-slate-200/70 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-950/60"
                        : isReturn
                          ? "border-amber-200/70 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                          : "border-slate-200/70 bg-white/85 dark:border-slate-800/80 dark:bg-slate-950/70"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                            {sale.product?.name || "Produit inconnu"}
                          </h3>
                          {isReturn ? (
                            <Badge className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                              Retour
                            </Badge>
                          ) : null}
                          {isRefunded && !isReturn ? (
                            <Badge className="rounded-full bg-slate-900/8 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-100/10 dark:text-slate-300">
                              Remboursé
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {format(new Date(sale.createdAt), "dd MMM yyyy · HH:mm", {
                            locale: fr,
                          })}
                        </p>
                      </div>

                      {sale.paymentMethod ? (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            paymentColor
                          )}
                        >
                          {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/80">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Ticket
                        </p>
                        <p className="mt-1 font-mono text-sm text-slate-700 dark:text-slate-200">
                          {sale.ticketNumber || "—"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/80">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Quantité
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {sale.quantity > 0 ? `+${sale.quantity}` : sale.quantity}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/80">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Net à payer
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {formatCurrency(net)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {sale.discount > 0
                          ? `Réduction ${formatCurrency(sale.discount)}`
                          : "Aucune réduction"}
                      </p>

                      {sale.type !== "REFUND" && !sale.isRefunded ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefund(sale.id)}
                          disabled={refundingId === sale.id}
                          className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-200"
                        >
                          {refundingId === sale.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          Rembourser
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow
                    className="hover:bg-transparent border-0"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    {["Date","Produit","Ticket","Paiement","Quantité","Réduction","Net à payer","Action"].map((h, i) => (
                      <TableHead
                        key={h}
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.08em] border-0",
                          i === 0 ? "px-5" : "",
                          i >= 6 ? "text-right" : "",
                          i === 7 ? "pr-5" : ""
                        )}
                        style={{ color: "rgba(255,255,255,0.40)" }}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.map((sale) => {
                    const isRefunded = sale.isRefunded;
                    const isReturn = sale.type === "REFUND";
                    const net = getNetAmount(sale);
                    const paymentColor = sale.paymentMethod
                      ? PAYMENT_COLORS[sale.paymentMethod] ?? "bg-slate-100 text-slate-700"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";

                    return (
                      <TableRow
                        key={sale.id}
                        className="border-0 hover:bg-white/[0.02] transition-colors"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          opacity: (isRefunded || isReturn) ? 0.45 : 1,
                        }}
                      >
                        <TableCell className="px-5 py-3.5 text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
                          {format(new Date(sale.createdAt), "dd MMM yyyy · HH:mm", { locale: fr })}
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white/85">
                              {sale.product?.name || "Produit inconnu"}
                            </span>
                            {isReturn && (
                              <Badge className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                Retour
                              </Badge>
                            )}
                            {isRefunded && !isReturn && (
                              <Badge className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.50)" }}>
                                Remboursé
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5" style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(255,255,255,0.40)" }}>
                          {sale.ticketNumber || "—"}
                        </TableCell>

                        <TableCell className="py-3.5">
                          {sale.paymentMethod ? (
                            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", paymentColor)}>
                              {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                            </span>
                          ) : (
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.30)" }}>—</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5 text-sm font-semibold text-white/85">
                          {sale.quantity > 0 ? `+${sale.quantity}` : sale.quantity}
                        </TableCell>

                        <TableCell className="py-3.5 text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
                          {sale.discount > 0 ? formatCurrency(sale.discount) : "—"}
                        </TableCell>

                        <TableCell className="py-3.5 text-right text-sm font-bold text-white/90">
                          {formatCurrency(net)}
                        </TableCell>

                        <TableCell className="py-3.5 pr-5">
                          <div className="flex justify-end">
                            {sale.type !== "REFUND" && !sale.isRefunded ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRefund(sale.id)}
                                disabled={refundingId === sale.id}
                                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                              >
                                {refundingId === sale.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="size-3.5" />
                                )}
                                Rembourser
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!loading && filteredSales.length > 0 ? (
          <div
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
              {(safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filteredSales.length)} sur {filteredSales.length} transaction
              {filteredSales.length > 1 ? "s" : ""}
            </p>

            {totalPages > 1 ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                  className="size-9 rounded-full"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {getPageNumbers(safePage, totalPages).map((page, index) =>
                  page === "..." ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      variant={safePage === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(page)}
                      className="size-9 rounded-full text-xs"
                    >
                      {page}
                    </Button>
                  )
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                  className="size-9 rounded-full"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
