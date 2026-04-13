"use client";
// Redesign v2 — Modern SaaS Dashboard

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
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
  ArrowDownRight,
  BarChart2,
  Trophy,
  ChevronRight,
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

/* ─── Page ───────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (status === "authenticated" && userRole === "CASHIER") {
      router.push("/products");
    }
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
    if (!error) {
      toast.success("Fond de caisse mis à jour");
      setShowCashDialog(false);
      fetchData();
    }
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
    if (!error) {
      toast.success("Caisse clôturée");
      setShowCloseCashDialog(false);
      setClosingNotes("");
      fetchData();
    }
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

  /* ── Spinners ─────────────────────────── */
  if (status === "loading" || userRole === "CASHIER") {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  /* ── Skeleton ─────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-52" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white shadow-card p-5 space-y-3 border border-border/50">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4 rounded-2xl bg-white shadow-card p-5 border border-border/50 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="lg:col-span-3 rounded-2xl bg-white shadow-card p-5 border border-border/50 space-y-4">
            <Skeleton className="h-6 w-28" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-slate-500 p-8">Erreur de chargement.</div>;

  /* ─── JSX ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 stagger-children">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Retrait Gérant */}
          <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
            <DialogTrigger render={(props) => (
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-sm border-0 gap-1.5"
                {...props}
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Retrait Gérant</span>
              </Button>
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowExpenseDialog(true)}
            className="rounded-full gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dépense Caisse</span>
          </Button>

          {/* Mode Gérant toggle */}
          {!showProfits ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPinDialog(true)}
              className="rounded-full gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-indigo-50/50"
            >
              <Lock className="h-3.5 w-3.5" />
              Mode Gérant
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowProfits(false)}
              className="rounded-full gap-1.5 text-slate-500 hover:text-slate-700"
            >
              <Unlock className="h-3.5 w-3.5" />
              Quitter
            </Button>
          )}
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* Caisse en Direct */}
        <div
          className="relative rounded-2xl p-5 overflow-hidden text-white"
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            boxShadow: "0 8px 32px rgba(79,70,229,0.30), 0 2px 8px rgba(79,70,229,0.20)",
          }}
        >
          {/* Background glow orb */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-white/80">Caisse en Direct</span>
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
                className="text-[11px] font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
              >
                {data.cashDrawer.isOpened ? "Modifier fond" : "Ouvrir"}
              </button>
              <button
                onClick={() => setShowCloseCashDialog(true)}
                className="text-[11px] font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
              >
                Clôturer
              </button>
            </div>
          </div>
        </div>

        {/* Ventes Aujourd'hui */}
        <MetricCard
          label={showProfits ? "Bénéfice Aujourd'hui" : "Ventes Aujourd'hui"}
          value={formatCurrency(showProfits ? data.daily.profit : data.daily.revenue)}
          sub={formatSoldLabel(data.daily.quantity, data.daily.weightKg ?? 0)}
          icon={showProfits ? TrendingUp : CreditCard}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={showProfits ? "up" : undefined}
        />

        {/* Ventes Hebdo */}
        <MetricCard
          label={showProfits ? "Bénéfice Hebdo" : "Ventes Hebdo"}
          value={formatCurrency(showProfits ? data.weekly.profit : data.weekly.revenue)}
          sub={formatSoldLabel(data.weekly.quantity, data.weekly.weightKg ?? 0)}
          icon={Activity}
          iconColor="text-violet-600"
          iconBg="bg-violet-50"
        />

        {/* Alertes Stock */}
        <div className="relative rounded-2xl bg-white border border-border/50 p-5 shadow-card overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Alertes Stock</span>
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              data.lowStockCount > 0 ? "bg-amber-50" : "bg-slate-50"
            )}>
              <AlertTriangle className={cn(
                "h-4 w-4",
                data.lowStockCount > 0 ? "text-amber-500" : "text-slate-400"
              )} />
            </div>
          </div>
          <div className={cn(
            "text-3xl font-bold tracking-tight mb-1",
            data.lowStockCount > 0 ? "text-amber-600" : "text-slate-900"
          )}>
            {data.lowStockCount}
          </div>
          <p className="text-xs text-slate-400">Produit(s) à réapprovisionner</p>
          {data.lowStockCount > 0 && (
            <Dialog>
              <DialogTrigger className="mt-3 flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 transition-colors">
                Voir la liste <ChevronRight className="h-3 w-3" />
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Produits en alerte stock
                  </DialogTitle>
                  <DialogDescription>
                    Ces articles ont atteint ou sont sous leur seuil d&apos;alerte.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
                  {data.lowStockProducts?.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 relative rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {p.image ? (
                            <Image src={p.image} alt={p.name} fill className="object-cover" />
                          ) : (
                            <Box className="h-full w-full p-2 text-slate-400" />
                          )}
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

      {/* ── Chart + Top Ventes ───────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-7">

        {/* Chart */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-border/50 shadow-card p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {showProfits ? "Analyse des Bénéfices" : "Chiffre d'Affaire"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Performance des 7 derniers jours</p>
            </div>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              showProfits ? "bg-indigo-50" : "bg-slate-50"
            )}>
              {showProfits
                ? <BarChart2 className="h-4 w-4 text-indigo-500" />
                : <Lock className="h-4 w-4 text-slate-300" />
              }
            </div>
          </div>

          {!showProfits ? (
            <div className="h-[300px] flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-dashed border-slate-200">
              <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-indigo-500" />
              </div>
              <p className="font-semibold text-slate-800 text-sm">Graphique verrouillé</p>
              <p className="text-xs text-slate-400 px-8 text-center mt-1 mb-4">
                Activez le Mode Gérant pour visualiser les courbes de performance.
              </p>
              <Button
                size="sm"
                onClick={() => setShowPinDialog(true)}
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-5"
              >
                Déverrouiller
              </Button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.chartData} barCategoryGap="35%">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  stroke="#CBD5E1"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  stroke="#CBD5E1"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  formatter={(value: number | string, name: string) => [
                    `${value} DH`,
                    name === "profit" ? "Bénéfice" : "Chiffre d'Affaire",
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString("fr-FR")}
                  cursor={{ fill: "rgba(99,102,241,0.06)", radius: 8 }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                    padding: "8px 12px",
                  }}
                />
                <Bar
                  dataKey={showProfits ? "profit" : "revenue"}
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Ventes */}
        <div className="lg:col-span-3 rounded-2xl bg-white border border-border/50 shadow-card p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Top Ventes</h2>
              <p className="text-xs text-slate-400 mt-0.5">5 produits les plus vendus</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
          </div>

          <div className="space-y-3">
            {data.topSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Aucune vente enregistrée</p>
              </div>
            ) : (
              data.topSales.map((sale, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: i === 0
                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                        : i === 1
                        ? "linear-gradient(135deg, #94a3b8, #64748b)"
                        : i === 2
                        ? "linear-gradient(135deg, #cd7c2f, #a16207)"
                        : "none",
                      backgroundColor: i > 2 ? "#F1F5F9" : undefined,
                      color: i <= 2 ? "white" : "#94A3B8",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="h-9 w-9 relative rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                    {sale.product?.image ? (
                      <Image src={sale.product.image} alt={sale.product.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Box className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                      {sale.product?.name || "Produit inconnu"}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {sale.product?.category || "Sans catégorie"}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-bold text-indigo-600">{sale._sum.quantity}</div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider">vendu(s)</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────── */}

      {/* PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Accès Mode Gérant</DialogTitle>
            <DialogDescription>Entrez votre code secret pour accéder aux données sensibles.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Code PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              className="text-center text-2xl tracking-[1em] h-14"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handlePinSubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={pinSubmitting}
            >
              {pinSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer
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
            <Input
              type="number"
              value={newStartingCash}
              onChange={(e) => setNewStartingCash(e.target.value)}
              className="text-lg font-bold h-12"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={updateCashDrawer}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={cashSubmitting}
            >
              {cashSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
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
              <Input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="text-lg font-bold h-12"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Notes</Label>
              <Input
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ex: dépôt banque, écart justifié…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={closeCashDrawer}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={closeCashSubmitting}
            >
              {closeCashSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer la clôture
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
              <Input
                type="number"
                required
                value={quickExpense.amount}
                onChange={(e) => setQuickExpense({ ...quickExpense, amount: e.target.value })}
                placeholder="0.00"
                className="text-lg font-bold h-12"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                required
                value={quickExpense.description}
                onChange={(e) => setQuickExpense({ ...quickExpense, description: e.target.value })}
                placeholder="Ex: Pain, taxi, réparation…"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={expSubmitting}
              >
                {expSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enregistrer la dépense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ─── MetricCard helper ────────────────────────────────────── */

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl bg-white border border-border/50 p-5 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-900 mb-1">{value}</div>
      <div className="flex items-center gap-1.5">
        {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
        {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}
