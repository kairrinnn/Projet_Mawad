"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
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
  Calendar,
  DollarSign,
  Briefcase,
  Zap,
  Globe,
  Home,
  AlertCircle,
  Pencil,
  ShieldCheck,
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Type helpers ──────────────────────────────────────────────
type Employee = { id: string; name: string; salary: number };
type Expense  = { id: string; type: string; amount: number; description: string; date: string };

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

const fmt = (val: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD" }).format(val || 0);

// ══════════════════════════════════════════════════════════════
export default function ManagerPage() {
  // ── data ────────────────────────────────────────────────────
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [dashboardData, setDashboard] = useState<any>(null);
  const [loading, setLoading]         = useState(true);

  // ── forms ───────────────────────────────────────────────────
  const [empForm, setEmpForm] = useState({ name: "", salary: "" });
  const [expForm, setExpForm] = useState({ type: "Daily", amount: "", description: "", date: "" });
  const [submitting, setSub]  = useState(false);

  // ── dialogs ─────────────────────────────────────────────────
  const [addExpOpen, setAddExpOpen]       = useState(false);
  const [addEmpOpen, setAddEmpOpen]       = useState(false);
  const [editExpOpen, setEditExpOpen]     = useState(false);
  const [editEmpOpen, setEditEmpOpen]     = useState(false);
  const [delConfirmOpen, setDelConfirmOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<{ type: "expense" | "employee"; id: string; label: string } | null>(null);

  // ── edit buffers ────────────────────────────────────────────
  const [editEmp, setEditEmp] = useState<any>(null);
  const [editExp, setEditExp] = useState<any>(null);

  // ── pin ────────────────────────────────────────────────────
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin]               = useState("");
  const [pinError, setPinError]     = useState(false);

  // ── bilan period ───────────────────────────────────────────
  const [bilanPeriod, setBilanPeriod] = useState<"daily" | "weekly" | "monthly" | "total">("monthly");
  const periodLabels: Record<string, string> = { daily: "Aujourd'hui", weekly: "Cette Semaine", monthly: "Ce Mois", total: "Tout (Annuel)" };
  const periodData = dashboardData?.[bilanPeriod] ?? {};

  const chartConfig = {
    revenue: { label: "Chiffre d'affaires", color: "#4f46e5" },
  };

  // ── data fetching ──────────────────────────────────────────
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eR, xR, dR] = await Promise.all([
        fetch("/api/employees"), fetch("/api/expenses"), fetch("/api/dashboard"),
      ]);
      if (eR.ok) setEmployees(await eR.json());
      if (xR.ok) setExpenses(await xR.json());
      if (dR.ok) setDashboard(await dR.json());
    } catch { toast.error("Erreur de chargement"); } finally { setLoading(false); }
  };

  // ── CRUD handlers ──────────────────────────────────────────
  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const r = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(empForm) });
      if (r.ok) { toast.success("Salarié ajouté"); setEmpForm({ name: "", salary: "" }); setAddEmpOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const r = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expForm) });
      if (r.ok) { toast.success("Dépense enregistrée"); setExpForm({ type: "Daily", amount: "", description: "", date: "" }); setAddExpOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const updateEmployee = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const r = await fetch(`/api/employees/${editEmp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editEmp) });
      if (r.ok) { toast.success("Salarié mis à jour"); setEditEmpOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const updateExpense = async (e: React.FormEvent) => {
    e.preventDefault(); setSub(true);
    try {
      const r = await fetch(`/api/expenses/${editExp.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editExp) });
      if (r.ok) { toast.success("Dépense mise à jour"); setEditExpOpen(false); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setSub(false); }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    try {
      const url = delTarget.type === "expense" ? `/api/expenses/${delTarget.id}` : `/api/employees/${delTarget.id}`;
      const r = await fetch(url, { method: "DELETE" });
      if (r.ok) { toast.success("Supprimé avec succès"); fetchData(); }
    } catch { toast.error("Erreur"); } finally { setDelConfirmOpen(false); setDelTarget(null); }
  };

  const askDelete = (type: "expense" | "employee", id: string, label: string) => {
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
        <TabsList className="grid w-full grid-cols-3 lg:w-[420px] mb-6">
          <TabsTrigger value="balance" className="flex gap-2"><TrendingUp className="h-4 w-4" /> Bilan</TabsTrigger>
          <TabsTrigger value="expenses" className="flex gap-2"><Wallet className="h-4 w-4" /> Dépenses</TabsTrigger>
          <TabsTrigger value="employees" className="flex gap-2"><Users className="h-4 w-4" /> Salariés</TabsTrigger>
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

          {/* Chart */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Évolution des Revenus</CardTitle>
                <CardDescription>Chiffre d'affaires sur les 7 derniers jours.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">7 jours</Badge>
            </CardHeader>
            <CardContent className="h-[300px] pt-0">
              {dashboardData?.chartData?.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart data={dashboardData.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(s) => new Date(s).toLocaleDateString("fr-FR", { weekday: "short" })} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${v} DH`} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" animationDuration={1200} />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/30">
                  <div className="text-slate-400 text-sm italic flex flex-col items-center gap-3 text-center max-w-xs">
                    <AlertCircle className="h-5 w-5 opacity-40" />
                    <p>Le graphique s'affichera après vos premières ventes.</p>
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

          <Card className="shadow-sm">
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <div className="p-12 text-center text-slate-400">Aucune dépense enregistrée.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
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
                            <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {new Date(exp.date).toLocaleDateString("fr-FR")}</span>
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

        {/* ════════════════ TAB: SALARIÉS ════════════════ */}
        <TabsContent value="employees" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Équipe</h2>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setAddEmpOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau Salarié
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {employees.length === 0 ? (
              <div className="col-span-full p-12 text-center border-2 border-dashed rounded-xl border-slate-200 text-slate-400">
                Aucun salarié enregistré pour le moment.
              </div>
            ) : (
              employees.map((emp) => (
                <Card key={emp.id} className="relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                        {emp.name?.charAt(0)?.toUpperCase() || "S"}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => askDelete("employee", emp.id, emp.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="pt-3 text-base">{emp.name || "Salarié"}</CardTitle>
                    <CardDescription className="text-xs">Poste : Salarié</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Salaire</span>
                      <span className="font-black text-indigo-600">{fmt(emp.salary)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 pb-3 justify-center">
                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700 gap-1" onClick={() => { setEditEmp({ ...emp }); setEditEmpOpen(true); }}>
                      <Pencil className="h-3 w-3" /> Modifier
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
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
                <Select value={expForm.type} onValueChange={(v) => setExpForm({ ...expForm, type: v })}>
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

      {/* ── ADD EMPLOYEE ─────────────────────────────────────── */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Salarié</DialogTitle>
          </DialogHeader>
          <form onSubmit={addEmployee} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input required value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} placeholder="Ex: Ahmed Benani" />
            </div>
            <div className="space-y-1.5">
              <Label>Salaire Mensuel (DH)</Label>
              <Input type="number" required value={empForm.salary} onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })} placeholder="0.00" />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
                {submitting ? "Ajout…" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT EMPLOYEE ────────────────────────────────────── */}
      <Dialog open={editEmpOpen} onOpenChange={setEditEmpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Salarié</DialogTitle>
          </DialogHeader>
          {editEmp && (
            <form onSubmit={updateEmployee} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                <Input required value={editEmp.name} onChange={(e) => setEditEmp({ ...editEmp, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Salaire Mensuel (DH)</Label>
                <Input type="number" required value={editEmp.salary} onChange={(e) => setEditEmp({ ...editEmp, salary: e.target.value })} />
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
                  <Select value={editExp.type} onValueChange={(v) => setEditExp({ ...editExp, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {EXPENSE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Montant (DH)</Label>
                  <Input type="number" required value={editExp.amount} onChange={(e) => setEditExp({ ...editExp, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input required value={editExp.description} onChange={(e) => setEditExp({ ...editExp, description: e.target.value })} />
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
