"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  CalendarDays,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Unlock,
  Wallet,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DashboardMetric {
  revenue: number;
  profit: number;
  quantity: number;
  grossProfit?: number;
  expenses?: number;
}

interface CashDrawerData {
  startingCash: number;
  currentRevenue: number;
  currentExpenses: number;
  balance: number;
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
  cashDrawer: CashDrawerData;
  currentExpenses: number;
  lowStockCount: number;
  lowStockProducts: LowStockProduct[];
  topSales: TopSale[];
  chartData: ChartPoint[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function MetricCard({
  title,
  value,
  description,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: "default" | "accent" | "warning";
}) {
  const toneClass =
    tone === "accent"
      ? "border-indigo-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.18),_transparent_55%),linear-gradient(135deg,_#f8faff_0%,_#eef2ff_100%)]"
      : tone === "warning"
        ? "border-amber-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_52%),linear-gradient(135deg,_#fffdf5_0%,_#fff7e6_100%)]"
        : "border-white/70 bg-white/90";

  return (
    <Card className={`border shadow-sm shadow-slate-200/60 ${toneClass}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardDescription className="text-xs uppercase tracking-[0.24em] text-slate-500">
            {title}
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </CardTitle>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-slate-700 shadow-sm">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfits, setShowProfits] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newStartingCash, setNewStartingCash] = useState("");
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [quickExpense, setQuickExpense] = useState({ amount: "", description: "" });
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    description: "",
    code: "",
  });
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role;

  const fetchData = async () => {
    setLoading(true);
    const { data: json, error } = await apiRequest<DashboardData>("/api/dashboard", {
      cache: "no-store",
    });
    if (!error && json) {
      setData(json);
      setNewStartingCash(String(json.cashDrawer.startingCash));
    } else {
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated" && userRole === "CASHIER") {
      router.push("/products");
    }
  }, [router, status, userRole]);

  useEffect(() => {
    if (status === "authenticated" && userRole !== "CASHIER") {
      const timeoutId = window.setTimeout(() => {
        void fetchData();
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [status, userRole]);

  const handlePinSubmit = async () => {
    setPinSubmitting(true);
    const { data: result, error } = await apiRequest<VerifyPinResponse>(
      "/api/auth/verify-pin",
      {
        method: "POST",
        body: JSON.stringify({ pin: pinInput }),
      }
    );
    if (!error && result?.success) {
      setShowProfits(true);
      setShowPinDialog(false);
      setPinInput("");
      toast.success("Mode gerant active");
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
      toast.success("Fond de caisse mis a jour");
      setShowCashDialog(false);
      void fetchData();
    }
    setCashSubmitting(false);
  };

  const submitQuickExpense = async (event: FormEvent) => {
    event.preventDefault();
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
      toast.success("Depense enregistree");
      setQuickExpense({ amount: "", description: "" });
      setShowExpenseDialog(false);
      void fetchData();
    }
    setExpSubmitting(false);
  };

  const handleManagerWithdrawal = async (event: FormEvent) => {
    event.preventDefault();
    setExpSubmitting(true);
    const { data: pinResult, error: pinError } = await apiRequest<VerifyPinResponse>(
      "/api/auth/verify-pin",
      {
        method: "POST",
        body: JSON.stringify({ pin: withdrawalForm.code }),
      }
    );
    if (pinError || !pinResult?.success) {
      if (!pinError) toast.error("Code manager incorrect");
      setExpSubmitting(false);
      return;
    }
    const { error: expenseError } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        type: "Withdrawal",
        amount: parseFloat(withdrawalForm.amount),
        description: withdrawalForm.description || "Retrait gerant",
      }),
    });
    if (!expenseError) {
      toast.success("Retrait valide");
      setWithdrawalForm({ amount: "", description: "", code: "" });
      setIsWithdrawalOpen(false);
      void fetchData();
    }
    setExpSubmitting(false);
  };

  if (status === "loading" || userRole === "CASHIER") {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_#0f172a_0%,_#312e81_55%,_#4338ca_100%)] text-white shadow-xl shadow-indigo-950/10">
          <CardHeader className="space-y-3">
            <Skeleton className="h-4 w-32 bg-white/20" />
            <Skeleton className="h-10 w-72 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/20" />
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-24 rounded-2xl bg-white/15" />
            ))}
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Card key={item}>
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <Skeleton className="h-[420px] rounded-3xl" />
          <Skeleton className="h-[420px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border border-red-100 bg-red-50/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-red-700">Chargement impossible</CardTitle>
          <CardDescription className="text-red-600">
            Les donnees du dashboard n&apos;ont pas pu etre chargees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void fetchData()}>Reessayer</Button>
        </CardContent>
      </Card>
    );
  }

  const totalSalesCount = data.topSales.reduce(
    (sum, sale) => sum + Number(sale._sum.quantity ?? 0),
    0
  );
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const heroSection = (
    <Card className="relative overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.35),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(125,211,252,0.22),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_38%,_#312e81_100%)] text-white shadow-2xl shadow-indigo-950/15">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_46%,transparent_100%)] lg:block" />
      <CardHeader className="relative space-y-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" />
              Vue direction
            </div>
            <div className="space-y-3">
              <CardDescription className="text-sm text-indigo-100/80">{today}</CardDescription>
              <CardTitle className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Dashboard pilotage caisse et performance
              </CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-indigo-50/80 md:text-base">
                Vue d&apos;ensemble du jour, suivi des mouvements de caisse et acces
                rapide aux actions sensibles sans quitter le tableau de bord.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:max-w-sm xl:justify-end">
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border-0 bg-white text-slate-950 hover:bg-slate-100"
                  />
                }
              >
                <Lock className="h-4 w-4" />
                Retrait gerant
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Retrait gerant</DialogTitle>
                  <DialogDescription>
                    Retirer des fonds de la caisse sans impacter le benefice.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleManagerWithdrawal} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="withdrawal-amount">Montant (MAD)</Label>
                    <Input
                      id="withdrawal-amount"
                      type="number"
                      required
                      placeholder="0.00"
                      value={withdrawalForm.amount}
                      onChange={(event) =>
                        setWithdrawalForm({
                          ...withdrawalForm,
                          amount: event.target.value,
                        })
                      }
                      className="text-lg font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="withdrawal-description">Motif</Label>
                    <Input
                      id="withdrawal-description"
                      placeholder="Ex: depot banque"
                      value={withdrawalForm.description}
                      onChange={(event) =>
                        setWithdrawalForm({
                          ...withdrawalForm,
                          description: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="withdrawal-code">Code manager</Label>
                    <Input
                      id="withdrawal-code"
                      type="password"
                      required
                      placeholder="****"
                      value={withdrawalForm.code}
                      onChange={(event) =>
                        setWithdrawalForm({
                          ...withdrawalForm,
                          code: event.target.value,
                        })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={expSubmitting}>
                    {expSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirmer le retrait
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExpenseDialog(true)}
              className="border-white/20 bg-white/6 text-white hover:bg-white/12 hover:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              Depense caisse
            </Button>

            {!showProfits ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPinDialog(true)}
                className="border-white/20 bg-white/6 text-white hover:bg-white/12 hover:text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                Activer mode gerant
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfits(false)}
                className="text-indigo-50 hover:bg-white/10 hover:text-white"
              >
                <Unlock className="h-4 w-4" />
                Quitter mode gerant
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-100/70">
            Solde caisse
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {formatCurrency(data.cashDrawer.balance)}
          </p>
          <div className="mt-4 flex items-center justify-between text-sm text-indigo-50/80">
            <span>Fond initial: {formatCurrency(data.cashDrawer.startingCash)}</span>
            <button
              type="button"
              onClick={() => setShowCashDialog(true)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/14"
            >
              Modifier
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-100/70">
            Revenue du jour
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {formatCurrency(data.daily.revenue)}
          </p>
          <p className="mt-4 text-sm leading-6 text-indigo-50/80">
            {data.daily.quantity} article(s) vendus aujourd&apos;hui
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-100/70">
            Etat sensible
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              {showProfits ? (
                <Unlock className="h-5 w-5 text-emerald-300" />
              ) : (
                <Lock className="h-5 w-5 text-amber-200" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {showProfits ? "Mode gerant actif" : "Mode gerant verrouille"}
              </p>
              <p className="text-sm text-indigo-50/80">
                {showProfits
                  ? "Les benefices et la performance detaillee sont visibles."
                  : "Les donnees sensibles restent masquees tant que le PIN n'est pas valide."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const analyticsSection = (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={showProfits ? "Benefice du jour" : "Ventes du jour"}
          value={formatCurrency(showProfits ? data.daily.profit : data.daily.revenue)}
          description={
            showProfits
              ? `Benefice net apres depenses du jour: ${formatCurrency(data.daily.expenses ?? 0)}`
              : `${data.daily.quantity} article(s) vendus aujourd'hui`
          }
          icon={<TrendingUp className="h-5 w-5" />}
          tone="accent"
        />
        <MetricCard
          title={showProfits ? "Benefice hebdo" : "Ventes hebdo"}
          value={formatCurrency(showProfits ? data.weekly.profit : data.weekly.revenue)}
          description={`${data.weekly.quantity} unite(s) sur les 7 derniers jours`}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <MetricCard
          title={showProfits ? "Benefice mensuel" : "CA mensuel"}
          value={formatCurrency(showProfits ? data.monthly.profit : data.monthly.revenue)}
          description={
            showProfits
              ? `Charges mensuelles: ${formatCurrency(data.monthly.expenses ?? 0)}`
              : `Total quantite ce mois: ${data.monthly.quantity}`
          }
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Alertes stock"
          value={String(data.lowStockCount)}
          description={
            data.lowStockCount > 0
              ? "Des produits doivent etre reapprovisionnes."
              : "Aucun produit sous seuil pour le moment."
          }
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={data.lowStockCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <Card className="border border-white/70 bg-white/90 shadow-sm shadow-slate-200/60">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100/90 pb-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl text-slate-950">
                {showProfits ? "Analyse profits et charges" : "Vue protegee de la performance"}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                {showProfits
                  ? "Evolution sur 7 jours du chiffre d'affaires, du benefice et des depenses."
                  : "Le graphique detaille reste masque jusqu'a l'activation du mode gerant."}
              </CardDescription>
            </div>
            <div className="grid w-full gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 text-sm text-slate-600 sm:grid-cols-3 md:w-auto">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Entrees</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(data.cashDrawer.currentRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sorties</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(data.cashDrawer.currentExpenses)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Cumul</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatCurrency(data.total.revenue)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!showProfits ? (
              <div className="flex h-[360px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 text-center">
                <div className="rounded-full border border-indigo-200 bg-white p-4 shadow-sm">
                  <Lock className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">
                  Acces gerant requis
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Active le mode gerant pour afficher les courbes de benefice,
                  les depenses et la performance sensible de la semaine.
                </p>
                <Button className="mt-6" onClick={() => setShowPinDialog(true)}>
                  Deverrouiller
                </Button>
              </div>
            ) : (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData}>
                    <defs>
                      <linearGradient id="dashboard-revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dashboard-profit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="dashboard-expenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatShortDate}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      width={88}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <Tooltip
                      cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: "20px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.10)",
                      }}
                      labelFormatter={(label) => formatLongDate(String(label))}
                      formatter={(value: number | string, name: string) => {
                        const labels: Record<string, string> = {
                          revenue: "Chiffre d'affaires",
                          profit: "Benefice",
                          expenses: "Depenses",
                        };
                        return [formatCurrency(Number(value)), labels[name] ?? name];
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fill="url(#dashboard-revenue)" strokeWidth={2.4} />
                    <Area type="monotone" dataKey="profit" stroke="#0f766e" fill="url(#dashboard-profit)" strokeWidth={2.2} />
                    <Area type="monotone" dataKey="expenses" stroke="#f97316" fill="url(#dashboard-expenses)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-white/70 bg-white/90 shadow-sm shadow-slate-200/60">
          <CardHeader className="border-b border-slate-100/90 pb-5">
            <CardTitle className="text-xl text-slate-950">Top ventes</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Les produits les plus vendus avec leur categorie et le volume cumule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {data.topSales.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500">
                Aucune vente enregistree.
              </div>
            ) : (
              data.topSales.map((sale, index) => (
                <div
                  key={`${sale.product?.name ?? "unknown"}-${index}`}
                  className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {sale.product?.image ? (
                      <Image src={sale.product.image} alt={sale.product.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Box className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {sale.product?.name ?? "Produit inconnu"}
                    </p>
                    <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-400">
                      {sale.product?.category ?? "Sans categorie"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-right">
                    <p className="text-lg font-semibold text-indigo-700">
                      {sale._sum.quantity ?? 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-500">
                      vendus
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );

  const bottomSection = (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_1.25fr]">
      <Card className="border border-white/70 bg-white/90 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100/90 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl text-slate-950">Surveillance stock</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Apercu des produits sous seuil. Ouvre la liste detaillee si besoin.
              </CardDescription>
            </div>
            {data.lowStockCount > 0 ? (
              <Dialog>
                <DialogTrigger
                  render={<Button variant="outline" size="sm" className="shrink-0" />}
                >
                  Voir la liste
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Produits en alerte stock</DialogTitle>
                    <DialogDescription>
                      Ces articles ont atteint ou depasse leur seuil minimal.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
                    {data.lowStockProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            {product.image ? (
                              <Image src={product.image} alt={product.name} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Box className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Seuil: {product.lowStockThreshold}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-amber-600">
                            {product.stock}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            stock
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {data.lowStockProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/80 px-6 py-10 text-center text-sm text-emerald-700">
              Aucun produit critique a signaler.
            </div>
          ) : (
            data.lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-3xl border border-amber-100 bg-amber-50/70 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {product.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Seuil minimal: {product.lowStockThreshold}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-amber-700">{product.stock}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">
                    restant
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border border-white/70 bg-white/90 shadow-sm shadow-slate-200/60">
        <CardHeader className="border-b border-slate-100/90 pb-5">
          <CardTitle className="text-xl text-slate-950">Recap operationnel</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">
            Lecture rapide des mouvements financiers et du rythme commercial.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <Wallet className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Caisse aujourd&apos;hui
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCurrency(data.cashDrawer.balance)}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Entrees</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(data.cashDrawer.currentRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sorties</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(data.cashDrawer.currentExpenses)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <CreditCard className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Volume commercial
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {data.total.quantity} unite(s)
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Top ventes visibles</span>
                <span className="font-medium text-slate-950">{totalSalesCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Depenses mensuelles</span>
                <span className="font-medium text-slate-950">
                  {formatCurrency(data.monthly.expenses ?? 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <TrendingUp className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Tendance hebdo
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {formatCurrency(showProfits ? data.weekly.profit : data.weekly.revenue)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {showProfits
                ? "Benefice net de la semaine, charges deja prises en compte."
                : "Vue chiffre d'affaires tant que le mode gerant est verrouille."}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <ShoppingCart className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Rythme du jour
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {data.daily.quantity} produit(s)
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Le tableau de bord reste relie aux memes actions de depense,
              retrait et mise a jour de caisse.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const dialogs = (
    <>
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Acces mode gerant</DialogTitle>
            <DialogDescription>
              Entre le code secret pour afficher les donnees sensibles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="password"
              placeholder="Code PIN"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handlePinSubmit();
                }
              }}
              className="text-center text-2xl tracking-[1em]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={() => void handlePinSubmit()} className="w-full" disabled={pinSubmitting}>
              {pinSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le fond de caisse</DialogTitle>
            <DialogDescription>
              Ajuste le montant present dans la caisse au debut de la journee.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="starting-cash">Montant initial (MAD)</Label>
              <Input
                id="starting-cash"
                type="number"
                value={newStartingCash}
                onChange={(event) => setNewStartingCash(event.target.value)}
                className="text-lg font-semibold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void updateCashDrawer()} className="w-full" disabled={cashSubmitting}>
              {cashSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Depense de caisse</DialogTitle>
            <DialogDescription>
              Enregistre une sortie de caisse rapide sans quitter le dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitQuickExpense} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Montant (MAD)</Label>
              <Input
                id="expense-amount"
                type="number"
                required
                value={quickExpense.amount}
                onChange={(event) =>
                  setQuickExpense({ ...quickExpense, amount: event.target.value })
                }
                placeholder="0.00"
                className="text-lg font-semibold"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-description">Description</Label>
              <Input
                id="expense-description"
                required
                value={quickExpense.description}
                onChange={(event) =>
                  setQuickExpense({
                    ...quickExpense,
                    description: event.target.value,
                  })
                }
                placeholder="Ex: taxi, reparation, achat urgent"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={expSubmitting}>
                {expSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer la depense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <div className="space-y-6">
      {heroSection}
      {analyticsSection}
      {bottomSection}
      {dialogs}
    </div>
  );
}
