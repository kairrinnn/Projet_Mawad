"use client";
// Version Restaurée: 15 Mars - Toutes fonctionnalités incluses

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
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
  Loader2
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { readLocalShopSettings } from "@/lib/shop-settings";

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
    parts.push(grams < 1000 ? `${grams} g` : `${new Intl.NumberFormat("fr-FR").format(Math.round(weightKg * 100) / 100)} kg`);
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
  _sum: {
    quantity: number | null;
  };
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
    closedAt?: string | null;
    carriedOver?: boolean;
  };
  currentExpenses: number;
  lowStockCount: number;
  lowStockProducts: LowStockProduct[];
  topSales: TopSale[];
  chartData: ChartPoint[];
}

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
  
  // Retrait Gérant replicate from POS
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: "", description: "", code: "" });
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: json, error } = await apiRequest<DashboardData>("/api/dashboard", { cache: 'no-store' });
    if (!error && json) {
      setData(json);
      // Si carry-over depuis la veille → utiliser ce montant ; sinon → fond par défaut des paramètres
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

  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role;

  useEffect(() => {
    if (status === "authenticated" && userRole === "CASHIER") {
      router.push("/products");
    }
  }, [status, userRole, router]);

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
      cache: 'no-store'
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
      cache: "no-store"
    });
    if (!error) {
      toast.success("Caisse cloturee");
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
    
    // Vérification du PIN via API
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
      })
    });
    
    if (!expError) {
      toast.success("Retrait validé");
      setWithdrawalForm({ amount: "", description: "", code: "" });
      setIsWithdrawalOpen(false);
      fetchData();
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
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="col-span-4 gap-4 md:grid-cols-2 lg:grid-cols-7">
          <CardHeader>
            <Skeleton className="h-6 w-1/4" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return <div>Erreur de chargement.</div>;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'MAD' 
    }).format(value);
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <div className="flex items-center gap-2">
            {/* Retrait Gérant */}
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="bg-indigo-600 text-white border-none hover:bg-slate-900 shadow-sm" />}>
                <Lock className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Retrait Gérant</span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Retrait Gérant</DialogTitle>
                  <DialogDescription>Retirer des fonds de la caisse (non affecté au bénéfice).</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleManagerWithdrawal} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Montant (DH)</Label>
                    <Input type="number" required placeholder="0.00" value={withdrawalForm.amount} onChange={e => setWithdrawalForm({...withdrawalForm, amount: e.target.value})} className="text-lg font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Motif</Label>
                    <Input placeholder="Ex: Dépôt banque" value={withdrawalForm.description} onChange={e => setWithdrawalForm({...withdrawalForm, description: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Code Manager</Label>
                    <Input type="password" required placeholder="****" value={withdrawalForm.code} onChange={e => setWithdrawalForm({...withdrawalForm, code: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-slate-900" disabled={expSubmitting}>Confirmer le retrait</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowExpenseDialog(true)}
                className="text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300"
            >
                <ShoppingCart className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Dépense Caisse</span>
            </Button>

            {!showProfits ? (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowPinDialog(true)}
                    className="bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50"
                >
                    <Lock className="mr-2 h-4 w-4" /> Mode Gérant
                </Button>
            ) : (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowProfits(false)}
                    className="text-slate-500 hover:text-slate-700"
                >
                    <Unlock className="mr-2 h-4 w-4" /> Quitter Mode Gérant
                </Button>
            )}
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card Caisse */}
        <Card className="bg-indigo-600 border-none shadow-sm shadow-indigo-100 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Caisse en Direct
            </CardTitle>
            <Wallet className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {formatCurrency(data.cashDrawer.balance)}
            </div>
            <div className="space-y-2 mt-1 text-xs opacity-80 leading-tight">
                <p>Fond: {formatCurrency(data.cashDrawer.startingCash)}</p>
                <p>Ventes espèces: +{formatCurrency(data.cashDrawer.currentRevenue)}</p>
                {data.cashDrawer.cashRefunds > 0 && (
                  <p className="opacity-100 text-red-200">Remboursements: -{formatCurrency(data.cashDrawer.cashRefunds)}</p>
                )}
                {data.cashDrawer.currentExpenses > 0 && (
                  <p>Dépenses caisse: -{formatCurrency(data.cashDrawer.currentExpenses)}</p>
                )}
                {data.cashDrawer.isClosed ? (
                  <p>
                    Clôturée: {formatCurrency(data.cashDrawer.closingCash)} ({formatCurrency(data.cashDrawer.variance)} d&apos;écart)
                  </p>
                ) : (
                  <p>Statut: ouverte</p>
                )}
            </div>
            <div className="flex items-center gap-2 mt-3">
                <button 
                    onClick={() => setShowCashDialog(true)}
                    className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors"
                >
                    Modifier
                </button>
                <button
                    onClick={() => setShowCloseCashDialog(true)}
                    className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                    disabled={data.cashDrawer.isClosed}
                >
                    {data.cashDrawer.isClosed ? "Cloturee" : "Cloturer"}
                </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {showProfits ? "Bénéfice Aujourd'hui" : "Ventes Aujourd'hui"}
            </CardTitle>
            {showProfits ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
                <CreditCard className="h-4 w-4 text-slate-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
                {showProfits ? formatCurrency(data.daily.profit) : formatCurrency(data.daily.revenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formatSoldLabel(data.daily.quantity, data.daily.weightKg ?? 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {showProfits ? "Bénéfice Hebdo" : "Ventes Hebdo"}
            </CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
                {showProfits ? formatCurrency(data.weekly.profit) : formatCurrency(data.weekly.revenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formatSoldLabel(data.weekly.quantity, data.weekly.weightKg ?? 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Alertes Stock
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 \${data.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold \${data.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {data.lowStockCount}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Produit(s) à réapprovisionner
                </p>
              </div>
              {data.lowStockCount > 0 && (
                <Dialog>
                  <DialogTrigger className="text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-1 h-auto rounded transition-colors">
                    Voir liste
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
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                      {data.lowStockProducts?.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 relative rounded bg-slate-100 overflow-hidden">
                              {p.image ? (
                                <Image src={p.image} alt={p.name} fill className="object-cover" />
                              ) : (
                                <Box className="h-full w-full p-2 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase">Seuil: {p.lowStockThreshold}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">{p.stock}</p>
                            <p className="text-[9px] text-slate-400 uppercase">En stock</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>{showProfits ? "Analyse des Bénéfices" : "Analyse du Chiffre d'Affaire"}</CardTitle>
                <CardDescription>Performance des 7 derniers jours.</CardDescription>
            </div>
            {!showProfits && <Lock className="h-4 w-4 text-slate-300" />}
          </CardHeader>
          <CardContent className="pl-2">
            {!showProfits ? (
                <div className="h-[350px] flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-lg border border-dashed m-2">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-slate-900">Graphique verrouillé</p>
                        <p className="text-xs text-slate-500 px-8">Activez le Mode Gérant pour visualiser les courbes de performance.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowPinDialog(true)}>Déverrouiller</Button>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                        dataKey="date" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => {
                            const date = new Date(val);
                            return `${date.getDate()}/${date.getMonth()+1}`;
                        }}
                        />
                        <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value} DH`}
                        />
                        <Tooltip 
                        formatter={(value: number | string, name: string) => [
                            `${value} DH`, 
                            name === "profit" ? "Bénéfice" : "Chiffre d'Affaire"
                        ]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        cursor={{fill: '#F1F5F9'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar 
                        dataKey={showProfits ? "profit" : "revenue"} 
                        fill="#4F46E5" 
                        radius={[4, 4, 0, 0]} 
                        animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-white border-none shadow-sm shadow-slate-200 mb-6 md:mb-0">
          <CardHeader>
            <CardTitle>Top Ventes</CardTitle>
            <CardDescription>Les 5 produits les plus vendus.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.topSales.length === 0 ? (
                <div className="text-center text-slate-500 py-8">Aucune vente enregistrée.</div>
              ) : (
                data.topSales.map((sale, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 relative rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                      {sale.product?.image ? (
                        <Image src={sale.product.image} alt={sale.product.name} fill className="object-cover" />
                      ) : (
                        <Box className="flex h-full w-full items-center justify-center h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold truncate text-slate-900 leading-tight">
                        {sale.product?.name || "Produit inconnu"}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                        {sale.product?.category || "Sans catégorie"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-bold text-indigo-600">
                        {sale._sum.quantity}
                      </div>
                      <div className="text-[9px] text-slate-400 font-normal uppercase tracking-wider">
                        vendu(s)
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog PIN */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Accès Mode Gérant</DialogTitle>
            <CardDescription>Entrez votre code secret pour accéder aux données sensibles.</CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="password"
              placeholder="Code PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              className="text-center text-2xl tracking-[1em]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handlePinSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={pinSubmitting}>
              {pinSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Fond de Caisse */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le Fond de Caisse</DialogTitle>
            <CardDescription>Ajustez le montant présent dans la caisse au début de la journée.</CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-slate-700">Montant Initial (MAD)</label>
                <Input
                    type="number"
                    value={newStartingCash}
                    onChange={(e) => setNewStartingCash(e.target.value)}
                    className="text-lg font-bold"
                />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={updateCashDrawer} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={cashSubmitting}>
              {cashSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseCashDialog} onOpenChange={setShowCloseCashDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cloturer la Caisse</DialogTitle>
            <CardDescription>Comparez le montant theorique avec le cash compte en fin de journee.</CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
              Attendu: <span className="font-bold text-slate-900">{formatCurrency(data.cashDrawer.balance)}</span>
            </div>
            <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-slate-700">Cash compte (MAD)</label>
                <Input
                    type="number"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    className="text-lg font-bold"
                />
            </div>
            <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Input
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Ex: depot banque, ecart justifie"
                />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeCashDrawer} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold" disabled={closeCashSubmitting}>
              {closeCashSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer la cloture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Dépense Rapide */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Dépense de Caisse</DialogTitle>
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
                className="text-lg font-bold"
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
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-semibold" disabled={expSubmitting}>
                {expSubmitting ? "Enregistrement…" : "Enregistrer la dépense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
