"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  Plus,
  Loader2,
  DollarSign,
  Zap,
  Globe,
  Home,
  Lock,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// New components
import { ManagerPinGate } from "@/components/manager/ManagerPinGate";
import { BilanTab } from "@/components/manager/BilanTab";
import { ExpensesTab } from "@/components/manager/ExpensesTab";
import { StockTab } from "@/components/manager/StockTab";
import { CalendarTab } from "@/components/manager/CalendarTab";
import { ManagerDialogs } from "@/components/manager/ManagerDialogs";
import { AuditLogsTab } from "@/components/manager/AuditLogsTab";

// ── Type helpers ──────────────────────────────────────────────
type Expense    = { id: string; type: string; amount: number; description: string; date: string };
type StockEntry = { id: string; productId: string; quantity: number; costPrice: number; totalCost: number; date: string; product: { name: string } };
type ProductSummary = { id: string; stock: number; costPrice: number };
type PeriodKey = "daily" | "weekly" | "monthly" | "total";
type PrevPeriod = { profit: number; grossProfit: number; expenses: number };
type DashboardPeriod = { profit?: number; grossProfit?: number; expenses?: number; prev?: PrevPeriod };
type DashboardData = Record<PeriodKey, DashboardPeriod> & {
  cashDrawer?: { balance?: number };
  chartData?: Array<{ date: string; profit: number; expenses: number }>;
};
type EditableExpense = { id: string; type: string | null; amount: string | number; description: string; date: string; paidInCash?: boolean };

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
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [dashboardData, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading]         = useState(true);

  // ── forms ───────────────────────────────────────────────────
  // ── forms ───────────────────────────────────────────────────
  const [expForm, setExpForm] = useState({
    type: "Daily" as string,
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    paidInCash: false,
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
  const [editExp, setEditExp] = useState<EditableExpense | null>(null);

  // ── expense filter ──────────────────────────────────────────
  const [expFilter, setExpFilter] = useState<string>("all");
  const filteredExpenses = useMemo(() => {
    if (expFilter === "all") return expenses;
    return expenses.filter((e) => e.type === expFilter);
  }, [expenses, expFilter]);

  // ── calendar ────────────────────────────────────────────────
  const [calMonth, _setCalMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [_hoveredDay, _setHoveredDay] = useState<number | null>(null);

  const _calendarGrid = useMemo(() => {
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
  const activeProductIds = useMemo(() => new Set(products.map((product) => product.id)), [products]);

  // ── stock filtering & stats ────────────────────────────────
  const filteredStock = useMemo(() => {
    const now = new Date();
    return stockEntries.filter(e => {
      if (!loading && !activeProductIds.has(e.productId)) return false;
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
  }, [stockEntries, stockPeriod, activeProductIds, loading]);

  const stockStats = useMemo(() => {
    const qty = filteredStock.reduce((s, e) => s + Number(e.quantity), 0);
    const purchasesCost = filteredStock.reduce((s, e) => s + Number(e.totalCost), 0);
    const currentValue = products.reduce((sum, product) => {
      return sum + Number(product.stock) * Number(product.costPrice);
    }, 0);
    return { qty, purchasesCost, currentValue };
  }, [filteredStock, products]);

  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin]               = useState("");
  const [pinError, setPinError]     = useState(false);

  // ── bilan period ───────────────────────────────────────────
  const [bilanPeriod, setBilanPeriod] = useState<"daily" | "weekly" | "monthly" | "total">("monthly");
  const periodLabels: Record<string, string> = { daily: "Aujourd'hui", weekly: "Cette Semaine", monthly: "Ce Mois", total: "Tout (Annuel)" };
  const periodData = dashboardData?.[bilanPeriod] ?? {};

  const _chartConfig = {
    profit: { label: "Bénéfice", color: "#10b981" },
    expenses: { label: "Dépenses", color: "#ef4444" },
  };

  // ── data fetching ──────────────────────────────────────────
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [xR, dR, sR, pR] = await Promise.all([
        fetch("/api/expenses"), fetch("/api/dashboard"), fetch("/api/stock-entries"), fetch("/api/products"),
      ]);
      if (xR.ok) setExpenses(await xR.json());
      if (dR.ok) setDashboard(await dR.json());
      if (sR.ok) setStockEntries(await sR.json());
      if (pR.ok) setProducts(await pR.json());
    } catch { toast.error("Erreur de chargement"); } finally { setLoading(false); }
  };

  // ── CRUD handlers ──────────────────────────────────────────

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const r = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expForm) });
      if (r.ok) { toast.success("Dépense enregistrée"); setExpForm({ type: "Daily", amount: "", description: "", date: new Date().toISOString().split("T")[0], paidInCash: false }); setAddExpOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const updateExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    if (!editExp) { setSub(false); return; }
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
    
    // Verify PIN via API
    try {
      const pinRes = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: withdrawalForm.code })
      });
      if (!pinRes.ok) {
        toast.error("Code manager incorrect");
        return;
      }
    } catch (err) {
      toast.error("Erreur de vérification du code");
      return;
    }

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
  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      if (r.ok) {
        setAuthorized(true);
        setPinError(false);
      } else {
        setPinError(true);
        setPin("");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
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
      <ManagerPinGate 
        pin={pin}
        setPin={setPin}
        pinError={pinError}
        submitPin={submitPin}
        loading={loading}
      />
    );
  }

  // ── MAIN CONTENT ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
          >
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Espace Gérant</h1>
            <p className="text-sm text-slate-400">Charges, stock et rentabilité.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setIsWithdrawalOpen(true)}
            className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0 shadow-sm gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" /> Retrait Gérant
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpDialogOpen(true)}
            className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Dépense Caisse
          </Button>
        </div>
      </div>

      <Tabs defaultValue="balance" className="w-full">
        <TabsList className="h-10 rounded-xl bg-slate-100/80 p-1 gap-0.5 w-full sm:w-auto sm:inline-flex mb-6">
          <TabsTrigger value="balance" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 flex gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Bilan</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 flex gap-1.5"><Wallet className="h-3.5 w-3.5" /> Dépenses</TabsTrigger>
          <TabsTrigger value="stock" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 flex gap-1.5"><PackageSearch className="h-3.5 w-3.5" /> Stock</TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 flex gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Calendrier</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700 flex gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Journaux</TabsTrigger>
        </TabsList>

        <TabsContent value="balance">
          <BilanTab 
            bilanPeriod={bilanPeriod}
            setBilanPeriod={setBilanPeriod}
            periodData={periodData}
            periodLabels={periodLabels}
            dashboardData={dashboardData}
            formatCurrency={fmt}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-semibold text-slate-800">Historique des Dépenses</h2>
            <Button
              onClick={() => setAddExpOpen(true)}
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 gap-1.5"
            >
              <Plus className="h-4 w-4" /> Nouvelle Dépense
            </Button>
          </div>
          <ExpensesTab 
            expenses={expenses}
            filteredExpenses={filteredExpenses}
            expFilter={expFilter}
            setExpFilter={setExpFilter}
            EXPENSE_TYPES={EXPENSE_TYPES}
            onEdit={(exp) => { setEditExp({ ...exp }); setEditExpOpen(true); }}
            onDelete={(exp) => askDelete("expense", exp.id, exp.description)}
            formatCurrency={fmt}
            getExpenseIcon={getExpenseIcon}
          />
        </TabsContent>

        <TabsContent value="stock">
          <StockTab 
            stockPeriod={stockPeriod}
            setStockPeriod={setStockPeriod}
            periodLabels={periodLabels}
            stockStats={stockStats}
            filteredStock={filteredStock}
            formatCurrency={fmt}
            formatQty={fmtQty}
            onHistoryChanged={fetchData}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab 
            expenses={expenses}
            EXPENSE_TYPES={EXPENSE_TYPES}
            getExpenseColor={getExpenseColor}
            formatCurrency={fmt}
          />
        </TabsContent>

        <TabsContent value="logs">
          <AuditLogsTab />
        </TabsContent>
      </Tabs>

      <ManagerDialogs 
        isWithdrawalOpen={isWithdrawalOpen}
        setIsWithdrawalOpen={setIsWithdrawalOpen}
        withdrawalForm={withdrawalForm}
        setWithdrawalForm={setWithdrawalForm}
        handleManagerWithdrawal={handleManagerWithdrawal}
        isExpDialogOpen={isExpDialogOpen}
        setIsExpDialogOpen={setIsExpDialogOpen}
        quickExpForm={quickExpForm}
        setQuickExpForm={setQuickExpForm}
        handleQuickExpense={handleQuickExpense}
        addExpOpen={addExpOpen}
        setAddExpOpen={setAddExpOpen}
        expForm={expForm}
        setExpForm={setExpForm}
        EXPENSE_TYPES={EXPENSE_TYPES}
        addExpense={addExpense}
        editExpOpen={editExpOpen}
        setEditExpOpen={setEditExpOpen}
        editExp={editExp}
        setEditExp={setEditExp}
        updateExpense={updateExpense}
        delConfirmOpen={delConfirmOpen}
        setDelConfirmOpen={setDelConfirmOpen}
        delTarget={delTarget}
        confirmDelete={confirmDelete}
        submitting={submitting}
      />
    </div>
  );
}
