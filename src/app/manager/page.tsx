"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  Plus,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  DollarSign,
  Briefcase,
  Zap,
  Globe,
  Home,
  AlertCircle,
  Pencil,
  ShieldCheck,
  Filter,
  CalendarDays,
  PackageSearch,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Type helpers ──────────────────────────────────────────────
type Expense    = { id: string; type: string; amount: number; description: string; date: string };
type StockEntry = { id: string; productId: string; quantity: number; costPrice: number; totalCost: number; date: string; product: { name: string } };

const EXPENSE_TYPES = [
  { value: "Daily",    label: "Quotidien (Pain, petit achat…)" },
  { value: "Salary",   label: "Salaires" },
  { value: "Utility",  label: "Électricité / Eau" },
  { value: "Rent",     label: "Loyer" },
  { value: "Internet", label: "Internet / Téléphone" },
  { value: "Stock",    label: "Stock (Achat hors inventaire)" },
];

const getExpenseIcon = (type: string) => {
  switch (type) {
    case "Salary":   return <Users    className="h-4 w-4 text-violet-500" />;
    case "Utility":  return <Zap      className="h-4 w-4 text-amber-500" />;
    case "Rent":     return <Home     className="h-4 w-4 text-blue-500" />;
    case "Internet": return <Globe    className="h-4 w-4 text-indigo-500" />;
    case "Stock":    return <Receipt  className="h-4 w-4 text-orange-500" />;
    default:         return <DollarSign className="h-4 w-4 text-slate-500" />;
  }
};

const getExpenseColor = (type: string): string => {
  switch (type) {
    case "Salary":   return "bg-violet-500";
    case "Utility":  return "bg-amber-500";
    case "Rent":     return "bg-blue-500";
    case "Internet": return "bg-indigo-500";
    case "Stock":    return "bg-orange-500";
    case "Daily":    return "bg-slate-400";
    default:         return "bg-slate-400";
  }
};

const fmt = (val: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD" }).format(val || 0);

const fmtQty = (q: number) => 
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(q || 0);

// ══════════════════════════════════════════════════════════════
export default function ManagerPage() {
  // ── data ────────────────────────────────────────────────────
  // ── data ────────────────────────────────────────────────────
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [dashboardData, setDashboard] = useState<any>(null);
  const [loading, setLoading]         = useState(true);

  // ── forms ───────────────────────────────────────────────────
  // ── forms ───────────────────────────────────────────────────
  const [expForm, setExpForm] = useState({
    type: "Daily" as string,
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0]
  });
  const [submitting, setSub]  = useState(false);

  // Quick actions replicate from POS
  const [quickExpForm, setQuickExpForm] = useState({ amount: "", description: "" });
  const [isExpDialogOpen, setIsExpDialogOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: "", description: "", code: "" });
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  // ── dialogs ─────────────────────────────────────────────────
  const [addExpOpen, setAddExpOpen]       = useState(false);
  const [editExpOpen, setEditExpOpen]     = useState(false);
  const [delConfirmOpen, setDelConfirmOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<{ type: "expense"; id: string; label: string } | null>(null);

  // ── edit buffers ────────────────────────────────────────────
  const [editExp, setEditExp] = useState<any>(null);

  // ── expense filter ──────────────────────────────────────────
  const [expFilter, setExpFilter] = useState<string>("all");
  const filteredExpenses = useMemo(() => {
    if (expFilter === "all") return expenses;
    return expenses.filter((e) => e.type === expFilter);
  }, [expenses, expFilter]);

  // ── calendar ────────────────────────────────────────────────
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const calendarGrid = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    // Map day-of-month → expenses
    // Monthly (non-Daily) expenses RECUR on the same day every month
    const dayMap: Record<number, Expense[]> = {};
    const monthlyTypes = expenses.filter(e => e.type !== "Daily");

    // Group by day-of-month (recurring projection)
    const seenKeys = new Set<string>();
    monthlyTypes.forEach(e => {
      const d = new Date(e.date);
      const dayOfMonth = d.getDate();
      const key = `${e.type}-${e.description}-${dayOfMonth}`;
      // For the CURRENT viewed month, show actual expenses
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!dayMap[dayOfMonth]) dayMap[dayOfMonth] = [];
        dayMap[dayOfMonth].push(e);
        seenKeys.add(key);
      }
    });

    // Project recurring charges from other months into this month
    monthlyTypes.forEach(e => {
      const d = new Date(e.date);
      const dayOfMonth = d.getDate();
      const key = `${e.type}-${e.description}-${dayOfMonth}`;
      if (!seenKeys.has(key) && dayOfMonth <= daysInMonth) {
        seenKeys.add(key);
        if (!dayMap[dayOfMonth]) dayMap[dayOfMonth] = [];
        // Create a projected expense (same data, different visual cue later if needed)
        dayMap[dayOfMonth].push({ ...e, id: `proj-${e.id}` });
      }
    });

    return { daysInMonth, firstDow, dayMap };
  }, [expenses, calMonth]);

  // ── pin ────────────────────────────────────────────────────
  const [stockPeriod, setStockPeriod] = useState<"daily" | "weekly" | "monthly" | "total">("monthly");

  // ── stock filtering & stats ────────────────────────────────
  const filteredStock = useMemo(() => {
    const now = new Date();
    return stockEntries.filter(e => {
      const d = new Date(e.date);
      if (stockPeriod === "daily")   return d.toDateString() === now.toDateString();
      if (stockPeriod === "weekly")  {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (stockPeriod === "monthly") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (stockPeriod === "total")   return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [stockEntries, stockPeriod]);

  const stockStats = useMemo(() => {
    const qty = filteredStock.reduce((s, e) => s + e.quantity, 0);
    const cost = filteredStock.reduce((s, e) => s + e.totalCost, 0);
    return { qty, cost };
  }, [filteredStock]);

  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin]               = useState("");
  const [pinError, setPinError]     = useState(false);

  // ── bilan period ───────────────────────────────────────────
  const [bilanPeriod, setBilanPeriod] = useState<"daily" | "weekly" | "monthly" | "total">("monthly");
  const periodLabels: Record<string, string> = { daily: "Aujourd'hui", weekly: "Cette Semaine", monthly: "Ce Mois", total: "Tout (Annuel)" };
  const periodData = dashboardData?.[bilanPeriod] ?? {};

  const chartConfig = {
    profit: { label: "Bénéfice", color: "#10b981" },
    expenses: { label: "Dépenses", color: "#ef4444" },
  };

  // ── data fetching ──────────────────────────────────────────
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [xR, dR, sR] = await Promise.all([
        fetch("/api/expenses"), fetch("/api/dashboard"), fetch("/api/stock-entries"),
      ]);
      if (xR.ok) setExpenses(await xR.json());
      if (dR.ok) setDashboard(await dR.json());
      if (sR.ok) setStockEntries(await sR.json());
    } catch { toast.error("Erreur de chargement"); } finally { setLoading(false); }
  };

  // ── CRUD handlers ──────────────────────────────────────────

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const r = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expForm) });
      if (r.ok) { toast.success("Dépense enregistrée"); setExpForm({ type: "Daily", amount: "", description: "", date: "" }); setAddExpOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const updateExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const r = await fetch(`/api/expenses/${editExp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editExp) });
      if (r.ok) { toast.success("Dépense mise à jour"); setEditExpOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "Daily", amount: parseFloat(quickExpForm.amount), description: quickExpForm.description || "Dépense Caisse" })
      });
      if (res.ok) { toast.success("Dépense enregistrée"); setQuickExpForm({ amount: "", description: "" }); setIsExpDialogOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const handleManagerWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawalForm.code !== "1234") { toast.error("Code manager incorrect"); return; }
    setSub(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "Withdrawal", amount: parseFloat(withdrawalForm.amount), description: withdrawalForm.description || "Retrait Gérant" })
      });
      if (res.ok) { toast.success("Retrait validé"); setWithdrawalForm({ amount: "", description: "", code: "" }); setIsWithdrawalOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/expenses/${delTarget.id}`, { method: "DELETE" });
      if (r.ok) { toast.success("Supprimé avec succès"); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setDelConfirmOpen(false); setDelTarget(null); }
  };

  const askDelete = (type: "expense", id: string, label: string) => {
    setDelTarget({ type, id, label });
    setDelConfirmOpen(true);
  };

  // ── pin ────────────────────────────────────────────────────
  const submitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") { setAuthorized(true); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── PIN GATE ──────────────────────────────────────────────
  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Card className="w-full max-w-sm shadow-xl border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto bg-indigo-100 h-16 w-16 rounded-full flex items-center justify-center mb-3">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Accès Gérant</CardTitle>
            <CardDescription>Entrez votre code PIN pour continuer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPin} className="space-y-4">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className={`text-center text-3xl tracking-[1em] font-bold h-16 ${pinError ? "border-red-500" : ""}`}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                placeholder="••••"
              />
              {pinError && <p className="text-red-500 text-xs text-center font-medium">Code PIN incorrect</p>}
              <Button type="submit" className="w-full bg-indigo-600 h-12 text-base font-semibold">
                Accéder
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── MAIN CONTENT ────────────────────────────────────────────
  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Espace Gérant</h1>
        <p className="text-slate-500 mt-1">Gérez vos charges, vos salariés et suivez votre rentabilité.</p>
      </div>

      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[540px] mb-6">
          <TabsTrigger value="balance" className="flex gap-2"><TrendingUp className="h-4 w-4" /> Bilan</TabsTrigger>
          <TabsTrigger value="expenses" className="flex gap-2"><Wallet className="h-4 w-4" /> Dépenses</TabsTrigger>
          <TabsTrigger value="stock" className="flex gap-2"><PackageSearch className="h-4 w-4" /> Stock</TabsTrigger>
          <TabsTrigger value="calendar" className="flex gap-2"><CalendarDays className="h-4 w-4" /> Calendrier</TabsTrigger>
        </TabsList>

        {/* ════════════════ TAB: BILAN ════════════════ */}
        <TabsContent value="balance" className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["daily", "weekly", "monthly", "total"] as const).map((p) => (
              <Button
                key={p}
                variant={bilanPeriod === p ? "default" : "outline"}
                size="sm"
                onClick={() => setBilanPeriod(p)}
                className={bilanPeriod === p ? "bg-indigo-600 hover:bg-indigo-700" : ""}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 mb-4 justify-end">
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="bg-indigo-600 text-white border-none hover:bg-slate-900 shadow-sm px-4" />}>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Retrait Gérant
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Retrait Gérant (Caisse)</DialogTitle>
                  <DialogDescription>Retirer des espèces sans affecter les bénéfices du magasin.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleManagerWithdrawal} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Montant à retirer (DH)</Label>
                    <Input type="number" required value={withdrawalForm.amount} onChange={(e) => setWithdrawalForm({...withdrawalForm, amount: e.target.value})} placeholder="0.00" className="text-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Motif</Label>
                    <Input value={withdrawalForm.description} onChange={(e) => setWithdrawalForm({...withdrawalForm, description: e.target.value})} placeholder="Ex: Retrait personnel..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Code Manager</Label>
                    <Input type="password" required value={withdrawalForm.code} onChange={(e) => setWithdrawalForm({...withdrawalForm, code: e.target.value})} placeholder="****" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-slate-900" disabled={submitting}>Confirmer le retrait</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-white px-4" />}>
                  <ShoppingCart className="h-4 w-4 mr-2" /> Dépense Caisse
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dépense Caisse (Quotidienne)</DialogTitle>
                  <DialogDescription>Enregistrer un petit achat payé par la caisse.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleQuickExpense} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Montant (DH)</Label>
                    <Input type="number" required value={quickExpForm.amount} onChange={(e) => setQuickExpForm({...quickExpForm, amount: e.target.value})} placeholder="0.00" className="text-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={quickExpForm.description} onChange={(e) => setQuickExpForm({...quickExpForm, description: e.target.value})} placeholder="Ex: Pain, Café..." />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-slate-900 text-white" disabled={submitting}>Valider la dépense</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{fmt(periodData?.profit ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">{periodLabels[bilanPeriod]} — après charges ({fmt(periodData?.expenses ?? 0)}).</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bénéfice Brut</CardTitle>
                <Receipt className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(periodData?.grossProfit ?? periodData?.profit ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Marge sur les ventes uniquement.</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Charges</CardTitle>
                <Wallet className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{fmt(periodData?.expenses ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Salaires, factures et loyer.</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">État de la Caisse</CardTitle>
                <DollarSign className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmt(dashboardData?.cashDrawer?.balance ?? 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Fond + Ventes jour − Dépenses quotidiennes.</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart: Bénéfice vs Dépenses */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Bénéfice vs Dépenses</CardTitle>
                <CardDescription>Comparaison journalière sur 7 jours.</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Bénéfice</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Dépenses</span>
              </div>
            </CardHeader>
            <CardContent className="h-[300px] pt-0">
              {dashboardData?.chartData?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(s) => new Date(s).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${v} DH`} />
                    <Tooltip
                      formatter={(value: any, name: string) => [`${Number(value).toFixed(2)} DH`, name === "profit" ? "Bénéfice" : "Dépenses"]}
                      labelFormatter={(l) => new Date(l).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" }}
                    />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1000} />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/30">
                  <div className="text-slate-400 text-sm italic flex flex-col items-center gap-3 text-center max-w-xs">
                    <AlertCircle className="h-5 w-5 opacity-40" />
                    <p>Le graphique s'affichera après vos premières données.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ TAB: DÉPENSES ════════════════ */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Historique des Dépenses</h2>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setAddExpOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nouvelle Dépense
            </Button>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant={expFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setExpFilter("all")} className={expFilter === "all" ? "bg-slate-800" : ""}>
              <Filter className="h-3.5 w-3.5 mr-1" /> Tout ({expenses.length})
            </Button>
            {EXPENSE_TYPES.map((t) => {
              const count = expenses.filter(e => e.type === t.value).length;
              if (count === 0) return null;
              return (
                <Button key={t.value} variant={expFilter === t.value ? "default" : "outline"} size="sm" onClick={() => setExpFilter(t.value)}
                  className={expFilter === t.value ? "bg-slate-800" : ""}
                >
                  {t.label.split("(")[0].trim()} ({count})
                </Button>
              );
            })}
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  {expFilter === "all" ? "Aucune dépense enregistrée." : `Aucune dépense de type "${expFilter}".`}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          {getExpenseIcon(exp.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{exp.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{exp.type}</Badge>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><CalendarIcon className="h-2.5 w-2.5" /> {new Date(exp.date).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <span className="text-sm font-black text-red-600 whitespace-nowrap">−{fmt(exp.amount)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600" onClick={() => { setEditExp({ ...exp }); setEditExpOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => askDelete("expense", exp.id, exp.description)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════ TAB: STOCK ════════════════ */}
        <TabsContent value="stock" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">Historique des Ajouts de Stock</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {(["daily", "weekly", "monthly", "total"] as const).map((p) => (
                <Button key={p} variant={stockPeriod === p ? "default" : "outline"} size="sm" onClick={() => setStockPeriod(p)}
                  className={stockPeriod === p ? "bg-amber-600 hover:bg-amber-700" : ""}
                >
                  {periodLabels[p]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="pt-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Investi</p>
                  <p className="text-xl font-bold text-slate-900">{fmt(stockStats.cost)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardContent className="pt-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pièces Ajoutées</p>
                  <p className="text-xl font-bold text-slate-900">{fmtQty(stockStats.qty)} <span className="text-xs font-normal text-slate-400">unités/kg</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Produit</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Quantité</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">P.A. Unitaire</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Coût Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                        Aucun mouvement de stock sur cette période.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(entry.date).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {entry.product?.name || "Produit inconnu"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            +{fmtQty(entry.quantity)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {fmt(entry.costPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {fmt(entry.totalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>


        {/* ════════════════ TAB: CALENDRIER ════════════════ */}
        <TabsContent value="calendar" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>
                  <span className="text-lg">‹</span>
                </Button>
                <CardTitle className="text-base font-semibold capitalize min-w-[160px] text-center">
                  {calMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </CardTitle>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>
                  <span className="text-lg">›</span>
                </Button>
              </div>
              {/* Legend */}
              <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
                {EXPENSE_TYPES.filter(t => t.value !== "Daily").map(t => (
                  <span key={t.value} className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${getExpenseColor(t.value)}`} />
                    {t.label.split("(")[0].trim()}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 mb-1">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-2">{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {/* Empty cells before 1st */}
                {Array.from({ length: calendarGrid.firstDow }).map((_, i) => <div key={`e${i}`} className="h-14 border border-transparent" />)}
                {/* Day cells */}
                {Array.from({ length: calendarGrid.daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const exps = calendarGrid.dayMap[day];
                  const hasPayment = !!exps;
                  const total = hasPayment ? exps.reduce((s, e) => s + e.amount, 0) : 0;
                  const isToday = day === new Date().getDate() && calMonth.getMonth() === new Date().getMonth() && calMonth.getFullYear() === new Date().getFullYear();
                  const uniqueTypes = hasPayment ? [...new Set(exps.map(e => e.type))] : [];

                  const colIdx = (calendarGrid.firstDow + i) % 7;
                  const tooltipPos = colIdx < 2 ? "left-0 translate-x-0" : colIdx > 4 ? "right-0 translate-x-0" : "left-1/2 -translate-x-1/2";

                  return (
                    <div
                      key={day}
                      className={`relative h-14 border border-slate-100 flex flex-col items-center pt-1.5 cursor-default transition-colors
                        ${hasPayment ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50"}
                        ${isToday ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50/30" : ""}
                      `}
                      onMouseEnter={() => hasPayment && setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      <span className={`text-sm ${isToday ? "font-bold text-indigo-600" : hasPayment ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                        {day}
                      </span>
                      {/* Colored dots */}
                      {hasPayment && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {uniqueTypes.slice(0, 4).map(t => (
                            <span key={t} className={`h-1.5 w-1.5 rounded-full ${getExpenseColor(t)}`} />
                          ))}
                        </div>
                      )}

                      {/* Hover tooltip */}
                      {hoveredDay === day && hasPayment && (
                        <div className={`absolute bottom-full ${tooltipPos} mb-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 pointer-events-none`}>
                          <p className="text-xs font-bold text-slate-800 mb-2 border-b pb-1">
                            {new Date(calMonth.getFullYear(), calMonth.getMonth(), day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                          </p>
                          <div className="space-y-1.5">
                            {exps.map(exp => (
                              <div key={exp.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${getExpenseColor(exp.type)}`} />
                                  <span className="text-[11px] text-slate-700 truncate max-w-[130px]">{exp.description}</span>
                                </div>
                                <span className="text-[11px] font-bold text-red-600">−{fmt(exp.amount)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t mt-2 pt-1.5 flex justify-between">
                            <span className="text-[10px] font-medium text-slate-500">Total</span>
                            <span className="text-xs font-black text-red-700">−{fmt(total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════
           DIALOGS (all controlled via open/onOpenChange)
         ════════════════════════════════════════════════════════ */}

      {/* ── ADD EXPENSE ──────────────────────────────────────── */}
      <Dialog open={addExpOpen} onOpenChange={setAddExpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle Dépense / Charge</DialogTitle>
            <DialogDescription>Remplissez les détails ci-dessous.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addExpense} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={expForm.type || "Daily"} onValueChange={(v) => setExpForm({ ...expForm, type: v as string })}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {EXPENSE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Montant (DH)</Label>
                <Input type="number" required value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Désignation</Label>
              <Input required value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="Ex: Facture REDAL Mars" />
            </div>
            <div className="space-y-1.5">
              <Label>Date de paiement</Label>
              <Input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT EXPENSE ─────────────────────────────────────── */}
      <Dialog open={editExpOpen} onOpenChange={setEditExpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Dépense</DialogTitle>
          </DialogHeader>
          {editExp && (
            <form onSubmit={updateExpense} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editExp?.type || ""} onValueChange={(v) => setEditExp(editExp ? { ...editExp, type: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {EXPENSE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Montant (DH)</Label>
                  <Input type="number" required value={editExp.amount || ""} onChange={(e) => setEditExp({ ...editExp, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input required value={editExp.description || ""} onChange={(e) => setEditExp({ ...editExp, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={editExp.date ? new Date(editExp.date).toISOString().split("T")[0] : ""} onChange={(e) => setEditExp({ ...editExp, date: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
                  {submitting ? "Mise à jour…" : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ───────────────────────────────── */}
      <Dialog open={delConfirmOpen} onOpenChange={setDelConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer <strong>{delTarget?.label}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelConfirmOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
