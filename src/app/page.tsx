"use client";
// v4 — Complete Dark Glass Dashboard

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
  Trophy,
  ChevronRight,
  Minus,
  Sparkles,
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

/* ─── Types ──────────────────────────────────────────────── */

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

/* ─── Hooks ──────────────────────────────────────────────── */

function useCountUp(end: number, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    const startVal = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(startVal + (end - startVal) * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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

/* ─── Glass helpers ──────────────────────────────────────── */

const glass = {
  card: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
  } as React.CSSProperties,
  cardHover: "hover:border-white/15 transition-all duration-300",
};

/* ─── Custom Tooltip ─────────────────────────────────────── */

function DarkTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(10,4,30,0.95)",
      border: "1px solid rgba(139,92,246,0.35)",
      borderRadius: "14px",
      padding: "10px 14px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      fontSize: "12px",
      color: "#e2e8f0",
    }}>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 6, fontSize: 11 }}>
        {label ? new Date(label).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : ""}
      </p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>
            {p.name === "revenue" ? "Chiffre d'affaire" : "Bénéfice"}
          </span>
          <span style={{ marginLeft: "auto", fontWeight: 700, color: "#fff" }}>{p.value} DH</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

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
      method: "POST", body: JSON.stringify({ pin: pinInput }),
    });
    if (!error && result?.success) {
      setShowProfits(true); setShowPinDialog(false); setPinInput("");
      toast.success("Mode Gérant activé");
    } else { setPinInput(""); }
    setPinSubmitting(false);
  };

  const updateCashDrawer = async () => {
    setCashSubmitting(true);
    const { error } = await apiRequest("/api/cash-drawer", {
      method: "POST", body: JSON.stringify({ startingCash: Number(newStartingCash) }), cache: "no-store",
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
        closingCash: Number(closingCash), expectedCash: data.cashDrawer.balance,
        startingCash: data.cashDrawer.startingCash, notes: closingNotes,
      }), cache: "no-store",
    });
    if (!error) { toast.success("Caisse clôturée"); setShowCloseCashDialog(false); setClosingNotes(""); fetchData(); }
    setCloseCashSubmitting(false);
  };

  const submitQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setExpSubmitting(true);
    const { error } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ type: "Daily", amount: quickExpense.amount, description: quickExpense.description, date: new Date().toISOString() }),
    });
    if (!error) { toast.success("Dépense enregistrée"); setQuickExpense({ amount: "", description: "" }); setShowExpenseDialog(false); fetchData(); }
    setExpSubmitting(false);
  };

  const handleManagerWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault(); setExpSubmitting(true);
    const { data: pinResult, error: pinError } = await apiRequest<VerifyPinResponse>("/api/auth/verify-pin", {
      method: "POST", body: JSON.stringify({ pin: withdrawalForm.code }),
    });
    if (pinError || !pinResult?.success) {
      if (!pinError) toast.error("Code manager incorrect");
      setExpSubmitting(false); return;
    }
    const { error: expError } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ type: "Withdrawal", amount: parseFloat(withdrawalForm.amount), description: withdrawalForm.description || "Retrait Gérant" }),
    });
    if (!expError) { toast.success("Retrait validé"); setWithdrawalForm({ amount: "", description: "", code: "" }); setIsWithdrawalOpen(false); fetchData(); }
    setExpSubmitting(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD" }).format(value);

  /* ── Auth loading ────────────────────────── */
  if (status === "loading" || userRole === "CASHIER") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#8b5cf6" }} />
      </div>
    );
  }

  /* ── Skeleton ───────────────────────────── */
  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-6 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-7 w-48 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="h-4 w-32 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
            </div>
            <div className="flex gap-2">
              {[120, 100, 110].map((w, i) => (
                <div key={i} className="h-9 rounded-full" style={{ width: w, background: "rgba(255,255,255,0.06)" }} />
              ))}
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", height: 140 }}>
                <div className="flex justify-between">
                  <div className="h-3.5 w-24 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-8 w-8 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>
                <div className="h-8 w-36 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }} />
                <div className="h-3 w-20 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-7">
            <div className="lg:col-span-4 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", height: 380 }} />
            <div className="lg:col-span-3 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", height: 380 }} />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!data) return (
    <PageWrapper>
      <p style={{ color: "rgba(255,255,255,0.4)" }} className="p-8 text-sm">Erreur de chargement.</p>
    </PageWrapper>
  );

  const maxTopQty = Math.max(...(data.topSales ?? []).map(s => s._sum.quantity ?? 0), 1);
  const isDrawerLive = data.cashDrawer.isOpened && !data.cashDrawer.isClosed;

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#f1f5f9", fontFamily: "var(--font-heading)" }}>
              Tableau de bord
            </h1>
            <div className="flex items-center gap-2 mt-1" suppressHydrationWarning>
              {mounted && clock ? (
                <>
                  <span className="text-sm capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {clock.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                  <span className="text-sm font-mono tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </>
              ) : <div className="h-4 w-48 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Retrait Gérant */}
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger render={(props) => (
                <button
                  className="flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-semibold text-white cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
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
                  <div className="space-y-1.5"><Label>Montant (DH)</Label><Input type="number" required placeholder="0.00" value={withdrawalForm.amount} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })} className="text-lg font-bold" /></div>
                  <div className="space-y-1.5"><Label>Motif</Label><Input placeholder="Ex: Dépôt banque" value={withdrawalForm.description} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Code Manager</Label><Input type="password" required placeholder="****" value={withdrawalForm.code} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, code: e.target.value })} /></div>
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={expSubmitting}>
                    {expSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmer le retrait
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dépense */}
            <button
              onClick={() => setShowExpenseDialog(true)}
              className="flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:border-white/20"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dépense Caisse</span>
            </button>

            {/* Mode Gérant */}
            {!showProfits ? (
              <button
                onClick={() => setShowPinDialog(true)}
                className="flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium cursor-pointer transition-all duration-200"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
              >
                <Lock className="h-3.5 w-3.5" />
                Mode Gérant
              </button>
            ) : (
              <button
                onClick={() => setShowProfits(false)}
                className="flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium cursor-pointer transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
              >
                <Unlock className="h-3.5 w-3.5" />
                Quitter
              </button>
            )}
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">

          {/* Caisse Live */}
          <CashCard
            cashDrawer={data.cashDrawer}
            isLive={isDrawerLive}
            formatCurrency={formatCurrency}
            onOpen={() => setShowCashDialog(true)}
            onClose={() => setShowCloseCashDialog(true)}
          />

          {/* Ventes Aujourd'hui */}
          <KpiCard
            label={showProfits ? "Bénéfice Auj." : "Ventes Aujourd'hui"}
            rawValue={showProfits ? data.daily.profit : data.daily.revenue}
            formatter={formatCurrency}
            sub={formatSoldLabel(data.daily.quantity, data.daily.weightKg ?? 0)}
            icon={showProfits ? TrendingUp : CreditCard}
            accentColor="#10b981"
            glowColor="rgba(16,185,129,0.25)"
            trend={showProfits ? "up" : "neutral"}
          />

          {/* Ventes Hebdo */}
          <KpiCard
            label={showProfits ? "Bénéfice Hebdo" : "Ventes Semaine"}
            rawValue={showProfits ? data.weekly.profit : data.weekly.revenue}
            formatter={formatCurrency}
            sub={formatSoldLabel(data.weekly.quantity, data.weekly.weightKg ?? 0)}
            icon={Activity}
            accentColor="#818cf8"
            glowColor="rgba(129,140,248,0.2)"
            trend="neutral"
          />

          {/* Stock Alerts */}
          <StockCard count={data.lowStockCount} products={data.lowStockProducts} />
        </div>

        {/* ── Chart + Top Ventes ─────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-7">

          {/* Chart */}
          <div
            className="lg:col-span-4 p-5 transition-all duration-300 hover:border-white/12"
            style={glass.card}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>
                  {showProfits ? "Revenus & Bénéfices" : "Chiffre d'Affaire"}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {showProfits ? "7 derniers jours (gérant)" : "7 derniers jours"}
                </p>
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: showProfits ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)" }}
              >
                {showProfits
                  ? <Sparkles className="h-4 w-4" style={{ color: "#a78bfa" }} />
                  : <Lock className="h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                }
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.chartData ?? []} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.1)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)" }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.1)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)" }}
                />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#gradRevenue)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#8b5cf6", stroke: "rgba(139,92,246,0.3)", strokeWidth: 6 }}
                  filter="url(#glow)"
                />
                {showProfits && (
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradProfit)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#10b981", stroke: "rgba(16,185,129,0.3)", strokeWidth: 6 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            {!showProfits && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: "#8b5cf6" }} />
                    Chiffre d&apos;affaire
                  </span>
                </div>
                <button
                  onClick={() => setShowPinDialog(true)}
                  className="flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors hover:opacity-90"
                  style={{ color: "#a78bfa" }}
                >
                  <Lock className="h-3 w-3" />
                  Voir bénéfices
                </button>
              </div>
            )}

            {showProfits && (
              <div className="mt-3 flex items-center gap-4 text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: "#8b5cf6" }} />
                  Chiffre d&apos;affaire
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: "#10b981" }} />
                  Bénéfice
                </span>
              </div>
            )}
          </div>

          {/* Top Ventes */}
          <div
            className="lg:col-span-3 p-5 transition-all duration-300"
            style={glass.card}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "#f1f5f9" }}>Top Ventes</h2>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>5 produits les plus vendus</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(251,191,36,0.15)" }}>
                <Trophy className="h-4 w-4" style={{ color: "#fbbf24" }} />
              </div>
            </div>

            {(data.topSales ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14" style={{ color: "rgba(255,255,255,0.25)" }}>
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Aucune vente enregistrée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(data.topSales ?? []).map((sale, i) => {
                  const qty = sale._sum.quantity ?? 0;
                  const pct = Math.round((qty / maxTopQty) * 100);
                  const medals = [
                    { gradient: "linear-gradient(135deg, #f59e0b, #d97706)", glow: "rgba(245,158,11,0.4)" },
                    { gradient: "linear-gradient(135deg, #94a3b8, #64748b)", glow: "rgba(148,163,184,0.3)" },
                    { gradient: "linear-gradient(135deg, #cd7c2f, #92400e)", glow: "rgba(180,83,9,0.35)" },
                  ];
                  const barColors = ["#f59e0b", "#94a3b8", "#cd7c2f", "#8b5cf6", "#8b5cf6"];

                  return (
                    <div key={i}>
                      <div className="flex items-center gap-3 mb-1.5">
                        {/* Rank badge */}
                        <div
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{
                            background: i < 3 ? medals[i].gradient : "rgba(255,255,255,0.06)",
                            color: i < 3 ? "white" : "rgba(255,255,255,0.3)",
                            boxShadow: i < 3 ? `0 0 12px ${medals[i].glow}` : "none",
                          }}
                        >
                          {i + 1}
                        </div>
                        {/* Image */}
                        <div className="h-9 w-9 relative rounded-xl overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                          {sale.product?.image ? (
                            <Image src={sale.product.image} alt={sale.product?.name ?? ""} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Box className="h-4 w-4" style={{ color: "rgba(255,255,255,0.25)" }} />
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate leading-tight" style={{ color: "#f1f5f9" }}>
                            {sale.product?.name || "Produit inconnu"}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {sale.product?.category || "Sans catégorie"}
                          </p>
                        </div>
                        {/* Qty */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-bold tabular-nums" style={{ color: barColors[i] }}>{qty}</div>
                          <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>vendu(s)</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="ml-[60px] h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: i < 3 ? medals[i].gradient : "rgba(139,92,246,0.6)",
                            boxShadow: i < 3 ? `0 0 8px ${medals[i].glow}` : "none",
                            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
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

        {/* ── Dialogs ──────────────────────────────── */}

        {/* PIN */}
        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Accès Mode Gérant</DialogTitle>
              <DialogDescription>Entrez votre code secret pour accéder aux données sensibles.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input type="password" placeholder="Code PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()} className="text-center text-2xl tracking-[1em] h-14" autoFocus />
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
                <Input type="number" required value={quickExpense.amount} onChange={(e) => setQuickExpense({ ...quickExpense, amount: e.target.value })} placeholder="0.00" className="text-lg font-bold h-12" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input required value={quickExpense.description} onChange={(e) => setQuickExpense({ ...quickExpense, description: e.target.value })} placeholder="Ex: Pain, taxi, réparation…" />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={expSubmitting}>
                  {expSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer la dépense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </PageWrapper>
  );
}

/* ─── PageWrapper — full-bleed dark bg ───────────────────── */

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="-mx-4 sm:-mx-6 md:-mx-8 -mt-8 -mb-20 md:-mb-8 px-4 sm:px-6 md:px-8 pt-8 pb-20 md:pb-8 min-h-full"
      style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(109,40,217,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(79,46,220,0.1) 0%, transparent 60%), #07070e",
      }}
    >
      {children}
    </div>
  );
}

/* ─── CashCard ───────────────────────────────────────────── */

function CashCard({
  cashDrawer, isLive, formatCurrency, onOpen, onClose,
}: {
  cashDrawer: DashboardData["cashDrawer"];
  isLive: boolean;
  formatCurrency: (v: number) => string;
  onOpen: () => void;
  onClose: () => void;
}) {
  const animatedBalance = useCountUp(cashDrawer.balance);

  return (
    <div
      className="col-span-2 lg:col-span-1 relative rounded-[20px] p-5 overflow-hidden text-white cursor-default"
      style={{
        background: "linear-gradient(145deg, #4c1d95 0%, #3730a3 50%, #1e1b4b 100%)",
        boxShadow: "0 0 40px rgba(109,40,217,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {/* Orbs */}
      <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full pointer-events-none" style={{ background: "rgba(167,139,250,0.15)", filter: "blur(30px)" }} />
      <div className="absolute -bottom-8 -left-6 h-28 w-28 rounded-full pointer-events-none" style={{ background: "rgba(79,46,220,0.2)", filter: "blur(24px)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full pointer-events-none" style={{ background: "rgba(99,102,241,0.08)", filter: "blur(40px)" }} />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
              Caisse
            </span>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#86efac" }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                LIVE
              </span>
            )}
            {cashDrawer.isClosed && (
              <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Clôturée</span>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            <Wallet className="h-[18px] w-[18px]" style={{ color: "rgba(255,255,255,0.9)" }} />
          </div>
        </div>

        {/* Balance */}
        <div className="text-3xl font-bold tracking-tight tabular-nums mb-3" style={{ textShadow: "0 0 20px rgba(167,139,250,0.5)" }}>
          {formatCurrency(animatedBalance)}
        </div>

        {/* Breakdown */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between text-[11px]">
            <span style={{ color: "rgba(255,255,255,0.45)" }}>Fond initial</span>
            <span style={{ color: "rgba(255,255,255,0.8)" }}>{formatCurrency(cashDrawer.startingCash)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span style={{ color: "rgba(255,255,255,0.45)" }}>Entrées cash</span>
            <span style={{ color: "#86efac" }}>+{formatCurrency(cashDrawer.currentRevenue)}</span>
          </div>
          {cashDrawer.cashRefunds > 0 && (
            <div className="flex justify-between text-[11px]">
              <span style={{ color: "rgba(255,255,255,0.45)" }}>Remboursements</span>
              <span style={{ color: "#fca5a5" }}>-{formatCurrency(cashDrawer.cashRefunds)}</span>
            </div>
          )}
          {cashDrawer.currentExpenses > 0 && (
            <div className="flex justify-between text-[11px]">
              <span style={{ color: "rgba(255,255,255,0.45)" }}>Dépenses</span>
              <span style={{ color: "#fdba74" }}>-{formatCurrency(cashDrawer.currentExpenses)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpen}
            className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
            style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
          >
            {cashDrawer.isOpened ? "Modifier fond" : "Ouvrir"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-90"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Clôturer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── KpiCard ────────────────────────────────────────────── */

function KpiCard({
  label, rawValue, formatter, sub, icon: Icon, accentColor, glowColor, trend,
}: {
  label: string;
  rawValue: number;
  formatter: (v: number) => string;
  sub: string;
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  trend: "up" | "down" | "neutral";
}) {
  const animated = useCountUp(rawValue);

  return (
    <div
      className="rounded-[20px] p-5 transition-all duration-300 cursor-default group"
      style={{
        ...glass.card,
        boxShadow: `0 0 0 0 ${glowColor}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${glowColor}`;
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${glowColor}`;
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
          {label}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: `${accentColor}20` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
      </div>

      <div className="text-2xl font-bold tabular-nums mb-2" style={{ color: "#f1f5f9" }}>
        {formatter(animated)}
      </div>

      <div className="flex items-center gap-1.5">
        {trend === "up" && <ArrowUpRight className="h-3 w-3" style={{ color: "#34d399" }} />}
        {trend === "neutral" && <Minus className="h-3 w-3" style={{ color: "rgba(255,255,255,0.2)" }} />}
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</span>
      </div>
    </div>
  );
}

/* ─── StockCard ──────────────────────────────────────────── */

function StockCard({ count, products }: { count: number; products: LowStockProduct[] }) {
  const hasAlert = count > 0;

  return (
    <div
      className="rounded-[20px] p-5 transition-all duration-300 cursor-default"
      style={{
        ...glass.card,
        borderColor: hasAlert ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
          Alertes Stock
        </span>
        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: hasAlert ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)" }}>
          {hasAlert && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#f59e0b" }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />
            </span>
          )}
          <AlertTriangle className="h-4 w-4" style={{ color: hasAlert ? "#fbbf24" : "rgba(255,255,255,0.25)" }} />
        </div>
      </div>

      <div className="text-2xl font-bold tabular-nums mb-2" style={{ color: hasAlert ? "#fbbf24" : "#f1f5f9" }}>
        {count}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          Produit{count !== 1 ? "s" : ""} à réapprovisionner
        </span>
        {hasAlert && (
          <Dialog>
            <DialogTrigger className="flex items-center gap-0.5 text-[11px] font-medium cursor-pointer transition-colors hover:opacity-80" style={{ color: "#fbbf24" }}>
              Voir <ChevronRight className="h-3 w-3" />
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
                {products?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 relative rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" /> : <Box className="h-full w-full p-2 text-slate-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Seuil: {p.lowStockThreshold}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{p.stock}</p>
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
  );
}
