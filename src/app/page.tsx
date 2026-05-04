"use client";
// Dashboard v4 — Animations, hover reactivity, sober design

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Box,
  CreditCard,
  Activity,
  AlertTriangle,
  Wallet,
  Lock,
  Unlock,
  Loader2,
  ShoppingCart,
  ArrowUpRight,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { readLocalShopSettings } from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────── */

interface DashboardMetric {
  revenue: number;
  profit: number;
  quantity: number;
  weightKg?: number;
}

function formatSoldLabel(units: number, weightKg: number): string {
  const parts: string[] = [];
  if (units > 0) parts.push(`${units} unité${units > 1 ? "s" : ""}`);
  if (weightKg > 0) {
    const grams = Math.round(weightKg * 1000);
    parts.push(
      grams < 1000
        ? `${grams} g`
        : `${new Intl.NumberFormat("fr-FR").format(Math.round(weightKg * 100) / 100)} kg`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "0 vente";
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  image?: string | null;
}

interface TopSale {
  _sum: { quantity: number | null };
  product: {
    name: string;
    image?: string | null;
    category?: string | null;
  } | null;
}

interface ChartPoint {
  date: string;
  profit: number;
  revenue: number;
  expenses: number;
  quantity: number;
}

interface VerifyPinResponse {
  success: boolean;
}

interface DashboardData {
  daily: DashboardMetric;
  weekly: DashboardMetric;
  monthly: DashboardMetric;
  total: DashboardMetric;
  cashDrawer: {
    startingCash: number;
    expectedCash: number;
    currentRevenue: number;
    cashRefunds: number;
    currentExpenses: number;
    balance: number;
    closingCash: number;
    variance: number;
    isClosed: boolean;
    isOpened: boolean;
    closedAt?: string | null;
    carriedOver?: boolean;
  };
  currentExpenses: number;
  lowStockCount: number;
  lowStockProducts: LowStockProduct[];
  topSales: TopSale[];
  chartData: ChartPoint[];
}

/* ─── Hooks ─────────────────────────────────────────────────── */

function useCountUp(end: number, duration = 700) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const t0 = performance.now();
    if (raf.current) cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(end * ease));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end]);
  return value;
}

function useLiveClock() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showProfits, setShowProfits] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newStartingCash, setNewStartingCash] = useState<string>("");
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [showCloseCashDialog, setShowCloseCashDialog] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [quickExpense, setQuickExpense] = useState({ amount: "", description: "" });
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [closeCashSubmitting, setCloseCashSubmitting] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: "", description: "", code: "" });
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role;
  const clock = useLiveClock();

  const fetchData = async () => {
    setLoading(true);
    const { data: json, error } = await apiRequest<DashboardData>("/api/dashboard", { cache: "no-store" });
    if (!error && json) {
      setData(json);
      const suggestedFund = json.cashDrawer.carriedOver
        ? json.cashDrawer.startingCash
        : readLocalShopSettings().defaultCashFund;
      setNewStartingCash(suggestedFund.toString());
      setClosingCash((json.cashDrawer.closingCash || json.cashDrawer.balance).toString());
    } else {
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (status === "authenticated" && userRole === "CASHIER") router.push("/products");
  }, [status, userRole, router]);
  useEffect(() => {
    if (status === "authenticated" && userRole !== "CASHIER") {
      const id = window.setTimeout(() => void fetchData(), 0);
      return () => window.clearTimeout(id);
    }
  }, [status, userRole]);

  const handlePinSubmit = async () => {
    setPinSubmitting(true);
    const { data: result, error } = await apiRequest<VerifyPinResponse>("/api/auth/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin: pinInput }),
    });
    if (!error && result?.success) {
      setShowProfits(true);
      setShowPinDialog(false);
      setPinInput("");
      toast.success("Mode Gérant activé");
    } else {
      setPinInput("");
    }
    setPinSubmitting(false);
  };

  const updateCashDrawer = async () => {
    setCashSubmitting(true);
    const { error } = await apiRequest("/api/cash-drawer", {
      method: "POST",
      body: JSON.stringify({ startingCash: Number(newStartingCash) }),
      cache: "no-store",
    });
    if (!error) { toast.success("Fond de caisse mis à jour"); setShowCashDialog(false); fetchData(); }
    setCashSubmitting(false);
  };

  const closeCashDrawer = async () => {
    if (!data) return;
    setCloseCashSubmitting(true);
    const { error } = await apiRequest("/api/cash-drawer", {
      method: "PATCH",
      body: JSON.stringify({
        closingCash: Number(closingCash),
        expectedCash: data.cashDrawer.balance,
        startingCash: data.cashDrawer.startingCash,
        notes: closingNotes,
      }),
      cache: "no-store",
    });
    if (!error) { toast.success("Caisse clôturée"); setShowCloseCashDialog(false); setClosingNotes(""); fetchData(); }
    setCloseCashSubmitting(false);
  };

  const submitQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpSubmitting(true);
    const { error } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        type: "Daily",
        amount: quickExpense.amount,
        description: quickExpense.description,
        date: new Date().toISOString(),
      }),
    });
    if (!error) {
      toast.success("Dépense enregistrée");
      setQuickExpense({ amount: "", description: "" });
      setShowExpenseDialog(false);
      fetchData();
    }
    setExpSubmitting(false);
  };

  const handleManagerWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpSubmitting(true);
    const { data: pinResult, error: pinError } = await apiRequest<VerifyPinResponse>("/api/auth/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin: withdrawalForm.code }),
    });
    if (pinError || !pinResult?.success) {
      if (!pinError) toast.error("Code manager incorrect");
      setExpSubmitting(false);
      return;
    }
    const { error: expError } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        type: "Withdrawal",
        amount: parseFloat(withdrawalForm.amount),
        description: withdrawalForm.description || "Retrait Gérant",
      }),
    });
    if (!expError) {
      toast.success("Retrait validé");
      setWithdrawalForm({ amount: "", description: "", code: "" });
      setIsWithdrawalOpen(false);
      fetchData();
    }
    setExpSubmitting(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD" }).format(value);

  /* ── Auth loading ─────────────────── */
  if (status === "loading" || userRole === "CASHIER") {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      </div>
    );
  }

  /* ── Skeleton ─────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="sk h-7 w-44" />
            <div className="sk h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <div className="sk h-9 w-32 rounded-full" />
            <div className="sk h-9 w-28 rounded-full" />
            <div className="sk h-9 w-28 rounded-full" />
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Cash drawer — taller */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", opacity: 0.25, minHeight: 180 }} />
          {/* 3 white cards */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-border/50 shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="sk h-3.5 w-24" />
                <div className="sk h-9 w-9 rounded-xl" />
              </div>
              <div className="sk h-9 w-36" />
              <div className="sk h-3.5 w-20" />
            </div>
          ))}
        </div>

        {/* Chart + Top Ventes */}
        <div className="grid gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4 rounded-2xl bg-white border border-border/50 shadow-card p-5 space-y-4">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <div className="sk h-5 w-40" />
                <div className="sk h-3.5 w-28" />
              </div>
              <div className="sk h-8 w-8 rounded-lg" />
            </div>
            <div className="sk h-[280px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-3 rounded-2xl bg-white border border-border/50 shadow-card p-5 space-y-5">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <div className="sk h-5 w-28" />
                <div className="sk h-3.5 w-36" />
              </div>
              <div className="sk h-8 w-8 rounded-lg" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="sk h-4 w-4 rounded-full flex-shrink-0" />
                  <div className="sk h-9 w-9 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="sk h-3.5 w-32" />
                    <div className="sk h-3 w-20" />
                  </div>
                  <div className="sk h-4 w-8" />
                </div>
                <div className="ml-16 sk h-1 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-slate-500 p-8 text-sm">Erreur de chargement.</div>;

  const maxTopQty = Math.max(...(data.topSales ?? []).map(s => s._sum.quantity ?? 0), 1);
  const isLive = data.cashDrawer.isOpened && !data.cashDrawer.isClosed;

  /* ─── JSX ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 stagger-children">

      {/* ── Header / Topbar ────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Tableau de bord</h1>
          <div className="flex items-center gap-2 mt-0.5" suppressHydrationWarning>
            {mounted && clock ? (
              <>
                <span className="text-xs text-slate-400 dark:text-white/35 capitalize">
                  {clock.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <span className="text-slate-200 dark:text-white/20">·</span>
                <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-white/30">
                  {clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </>
            ) : <div className="sk h-3.5 w-44" />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Retrait Gérant */}
          <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
            <DialogTrigger render={(props) => (
              <button
                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: "linear-gradient(135deg, #5B21B6, #7C3AED)",
                  boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
                }}
                {...props}
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Retrait Gérant</span>
              </button>
            )} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Retrait Gérant</DialogTitle>
                <DialogDescription>Retirer des fonds de la caisse (non affecté au bénéfice).</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleManagerWithdrawal} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Montant (DH)</Label>
                  <Input type="number" required placeholder="0.00" value={withdrawalForm.amount} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })} className="text-lg font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label>Motif</Label>
                  <Input placeholder="Ex: Dépôt banque" value={withdrawalForm.description} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Code Manager</Label>
                  <Input type="password" required placeholder="****" value={withdrawalForm.code} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, code: e.target.value })} />
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={expSubmitting}>
                  {expSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirmer le retrait
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dépense Caisse */}
          <button
            onClick={() => setShowExpenseDialog(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all dark:text-white/70 dark:hover:text-white text-slate-600 hover:text-slate-900"
            style={{
              background: "#1E2235",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dépense Caisse</span>
          </button>

          {/* Mode Gérant */}
          {!showProfits ? (
            <button
              onClick={() => setShowPinDialog(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all dark:text-white/70 dark:hover:text-white text-slate-600 hover:text-slate-900"
              style={{
                background: "#1E2235",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mode Gérant</span>
            </button>
          ) : (
            <button
              onClick={() => setShowProfits(false)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white/90 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Unlock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Metric cards ───────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* Caisse en Direct */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden text-white card-lift"
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.35), 0 2px 8px rgba(79,70,229,0.20)",
          }}
        >
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/80">Caisse en Direct</span>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Live
                </span>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Wallet className="h-[18px] w-[18px] text-white" />
            </div>
          </div>
          <div className="relative">
            <div className="text-3xl font-bold tracking-tight mb-2">
              {formatCurrency(data.cashDrawer.balance)}
            </div>
            <div className="space-y-1 text-[11px] text-white/70 leading-relaxed">
              <p>Fond: <span className="text-white/90">{formatCurrency(data.cashDrawer.startingCash)}</span></p>
              <p>Entrées: <span className="text-emerald-300">+{formatCurrency(data.cashDrawer.currentRevenue)}</span></p>
              {data.cashDrawer.cashRefunds > 0 && (
                <p>Remboursements: <span className="text-red-300">-{formatCurrency(data.cashDrawer.cashRefunds)}</span></p>
              )}
              {data.cashDrawer.currentExpenses > 0 && (
                <p>Dépenses: <span className="text-orange-300">-{formatCurrency(data.cashDrawer.currentExpenses)}</span></p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setShowCashDialog(true)}
                className="text-[12px] font-semibold text-white px-3 py-1.5 transition-colors cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  borderRadius: "8px",
                }}
              >
                {data.cashDrawer.isOpened ? "Modifier fond" : "Ouvrir"}
              </button>
              <button
                onClick={() => setShowCloseCashDialog(true)}
                className="text-[12px] font-semibold transition-colors cursor-pointer"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#FCA5A5",
                  border: "1px solid rgba(239,68,68,0.30)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                }}
              >
                Clôturer
              </button>
            </div>
          </div>
        </div>

        {/* Ventes Aujourd'hui */}
        <MetricCard
          label={showProfits ? "Bénéfice Aujourd'hui" : "Ventes Aujourd'hui"}
          rawValue={showProfits ? data.daily.profit : data.daily.revenue}
          formatter={formatCurrency}
          sub={formatSoldLabel(data.daily.quantity, data.daily.weightKg ?? 0)}
          icon={showProfits ? TrendingUp : CreditCard}
          iconColor="text-emerald-400"
          sparkValues={(data.chartData ?? []).slice(-7).map(d => d.revenue)}
          sparkColor="#10b981"
          trend={showProfits ? "up" : undefined}
        />

        {/* Ventes Hebdo */}
        <MetricCard
          label={showProfits ? "Bénéfice Hebdo" : "Ventes Semaine"}
          rawValue={showProfits ? data.weekly.profit : data.weekly.revenue}
          formatter={formatCurrency}
          sub={formatSoldLabel(data.weekly.quantity, data.weekly.weightKg ?? 0)}
          icon={Activity}
          iconColor="text-violet-400"
          sparkValues={(data.chartData ?? []).slice(-7).map(d => d.revenue)}
          sparkColor="#A78BFA"
        />

        {/* Alertes Stock */}
        <div className={cn(
          "relative rounded-2xl border p-5 shadow-card overflow-hidden card-lift",
          "bg-white dark:bg-[oklch(0.14_0.025_264)]",
          data.lowStockCount > 0
            ? "border-amber-200 dark:border-amber-700/40"
            : "border-border/50"
        )}>
          {data.lowStockCount > 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/20 pointer-events-none" />
          )}
          <div className="relative flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Alertes Stock</span>
            <div className={cn("relative flex h-9 w-9 items-center justify-center rounded-xl",
              data.lowStockCount > 0
                ? "bg-amber-50 dark:bg-amber-900/30"
                : "bg-slate-50 dark:bg-white/[0.06]"
            )}>
              {data.lowStockCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>
              )}
              <AlertTriangle className={cn("h-4 w-4", data.lowStockCount > 0 ? "text-amber-500" : "text-slate-400")} />
            </div>
          </div>
          <div className={cn("relative text-3xl font-bold tracking-tight mb-1",
            data.lowStockCount > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-900 dark:text-slate-100"
          )}>
            {data.lowStockCount}
          </div>
          <p className="relative text-xs text-slate-400 dark:text-slate-500">Produit(s) à réapprovisionner</p>
          {data.lowStockCount > 0 && (
            <Dialog>
              <DialogTrigger className="relative mt-3 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer">
                Voir la liste <ChevronRight className="h-3 w-3" />
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Produits en alerte stock
                  </DialogTitle>
                  <DialogDescription>Ces articles ont atteint ou sont sous leur seuil d&apos;alerte.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
                  {data.lowStockProducts?.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 relative rounded-lg bg-slate-100 dark:bg-white/[0.08] overflow-hidden flex-shrink-0">
                          {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" /> : <Box className="h-full w-full p-2 text-slate-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Seuil: {p.lowStockThreshold}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{p.stock}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wide">En stock</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── Chart + Top Ventes ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-7">

        {/* Chart — revenue always visible */}
        <div
          className="lg:col-span-4 rounded-2xl p-5 card-lift"
          style={{
            background: "#161929",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 0 40px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white/90">
                {showProfits ? "Revenus & Bénéfices" : "Chiffre d'Affaire"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>7 derniers jours</p>
            </div>
            {/* Period pills */}
            <div className="flex items-center gap-1">
              {(["7J", "14J", "30J"] as const).map((p) => (
                <button
                  key={p}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  style={
                    p === "7J"
                      ? { background: "rgba(124,58,237,0.35)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.4)" }
                      : { background: "transparent", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.chartData ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.30} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.15)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(255,255,255,0.30)" }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis stroke="rgba(255,255,255,0.15)" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "rgba(255,255,255,0.30)" }} />
              <Tooltip
                formatter={(value: number | string, name: string) => [
                  `${value} DH`,
                  name === "profit" ? "Bénéfice" : "Chiffre d'Affaire",
                ]}
                labelFormatter={(label) => new Date(label).toLocaleDateString("fr-FR")}
                cursor={{ stroke: "rgba(124,58,237,0.25)", strokeWidth: 1 }}
                contentStyle={{
                  background: "#1E2235",
                  borderRadius: "12px",
                  border: "1px solid rgba(124,58,237,0.4)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  fontSize: "12px",
                  padding: "8px 12px",
                  color: "#fff",
                }}
                labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#7C3AED"
                strokeWidth={2}
                fill="url(#gradRevenue)"
                dot={false}
                activeDot={{ r: 4, fill: "#A78BFA", strokeWidth: 0 }}
                animationDuration={900}
              />
              {showProfits && (
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradProfit)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                  animationDuration={900}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend + unlock hint */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded-full bg-violet-400" />
                Chiffre d&apos;affaire
              </span>
              {showProfits && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 rounded-full bg-emerald-400" />
                  Bénéfice
                </span>
              )}
            </div>
            {!showProfits && (
              <button
                onClick={() => setShowPinDialog(true)}
                className="flex items-center gap-1 text-[11px] transition-colors cursor-pointer hover:opacity-80"
                style={{ color: "#A78BFA" }}
              >
                <Lock className="h-3 w-3" />
                Voir bénéfices
              </button>
            )}
          </div>
        </div>

        {/* Top Ventes */}
        <div
          className="lg:col-span-3 rounded-2xl p-5 card-lift"
          style={{
            background: "#161929",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 0 40px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white/90">Top Ventes</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Produits les plus vendus</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
          </div>

          {(data.topSales ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: "rgba(255,255,255,0.20)" }}>
              <ShoppingCart className="h-8 w-8 mb-2" />
              <p className="text-sm">Aucune vente enregistrée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(data.topSales ?? []).map((sale, i) => {
                const qty = sale._sum.quantity ?? 0;
                const pct = Math.round((qty / maxTopQty) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <span
                        className="w-4 flex-shrink-0 text-center text-[11px] font-mono select-none"
                        style={{ color: "rgba(255,255,255,0.20)" }}
                      >
                        {i + 1}
                      </span>
                      {/* Product image */}
                      <div
                        className="h-9 w-9 relative rounded-xl overflow-hidden flex-shrink-0"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        {sale.product?.image ? (
                          <Image src={sale.product.image} alt={sale.product?.name ?? ""} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Box className="h-4 w-4" style={{ color: "rgba(167,139,250,0.5)" }} />
                          </div>
                        )}
                      </div>
                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/85 truncate leading-tight">
                          {sale.product?.name || "Produit inconnu"}
                        </p>
                        {sale.product?.category && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{
                              background: "rgba(124,58,237,0.15)",
                              color: "#A78BFA",
                            }}
                          >
                            {sale.product.category}
                          </span>
                        )}
                      </div>
                      {/* Qty */}
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm font-bold text-white tabular-nums">{qty}</span>
                        <span className="text-[9px] ml-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>vte{qty > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    {/* Progress bar — gradient + glow */}
                    <div
                      className="mt-2 ml-7 h-[3px] rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, #7C3AED, #A855F7)",
                          boxShadow: "0 0 8px rgba(124,58,237,0.5)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────── */}

      {/* PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Accès Mode Gérant</DialogTitle>
            <DialogDescription>Entrez votre code secret pour accéder aux données sensibles.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="password" placeholder="Code PIN" value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              className="text-center text-2xl tracking-[1em] h-14" autoFocus />
          </div>
          <DialogFooter>
            <Button onClick={handlePinSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={pinSubmitting}>
              {pinSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fond de Caisse */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le Fond de Caisse</DialogTitle>
            <DialogDescription>Ajustez le montant présent dans la caisse au début de la journée.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Montant Initial (MAD)</Label>
            <Input type="number" value={newStartingCash} onChange={(e) => setNewStartingCash(e.target.value)} className="text-lg font-bold h-12" />
          </div>
          <DialogFooter>
            <Button onClick={updateCashDrawer} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={cashSubmitting}>
              {cashSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clôture Caisse */}
      <Dialog open={showCloseCashDialog} onOpenChange={setShowCloseCashDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clôturer la Caisse</DialogTitle>
            <DialogDescription>Comparez le montant théorique avec le cash compté en fin de journée.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 flex items-center justify-between">
              <span className="text-sm text-slate-600">Montant attendu</span>
              <span className="font-bold text-slate-900">{formatCurrency(data.cashDrawer.balance)}</span>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Cash compté (MAD)</Label>
              <Input type="number" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} className="text-lg font-bold h-12" />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Notes</Label>
              <Input value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Ex: dépôt banque, écart justifié…" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeCashDrawer} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={closeCashSubmitting}>
              {closeCashSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmer la clôture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dépense Rapide */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Dépense de Caisse</DialogTitle>
            <DialogDescription>Enregistrer une sortie d&apos;espèces de la caisse.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitQuickExpense} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Montant (DH)</Label>
              <Input type="number" required value={quickExpense.amount}
                onChange={(e) => setQuickExpense({ ...quickExpense, amount: e.target.value })}
                placeholder="0.00" className="text-lg font-bold h-12" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input required value={quickExpense.description}
                onChange={(e) => setQuickExpense({ ...quickExpense, description: e.target.value })}
                placeholder="Ex: Pain, taxi, réparation…" />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={expSubmitting}>
                {expSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer la dépense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ─── Sparkline ─────────────────────────────────────────────── */

function Sparkline({ values, color = "#7C3AED" }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const w = 100, h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const areaPath = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(" ")} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-8" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── MetricCard ────────────────────────────────────────────── */

function MetricCard({
  label,
  rawValue,
  formatter,
  sub,
  icon: Icon,
  iconColor,
  sparkValues,
  sparkColor,
  trend,
}: {
  label: string;
  rawValue: number;
  formatter: (v: number) => string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg?: string;
  sparkValues?: number[];
  sparkColor?: string;
  trend?: "up" | "down";
}) {
  const animated = useCountUp(rawValue);
  return (
    <div
      className="rounded-2xl p-5 card-lift overflow-hidden relative"
      style={{
        background: "#161929",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 0 40px rgba(0,0,0,0.4)",
      }}
    >
      <div className="relative z-10 flex items-start justify-between mb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {label}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>
      <div className="relative z-10 text-[28px] font-extrabold tracking-tight text-white mb-1 tabular-nums leading-none">
        {formatter(animated)}
      </div>
      <div className="relative z-10 flex items-center gap-1.5 mb-3">
        {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />}
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</p>
      </div>
      {/* Sparkline */}
      {sparkValues && sparkValues.length > 1 && (
        <div className="relative z-10 -mx-1">
          <Sparkline values={sparkValues} color={sparkColor ?? "#7C3AED"} />
        </div>
      )}
    </div>
  );
}
