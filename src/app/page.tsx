"use client";

import { useEffect, useState } from "react";
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
  ArrowUpRight, 
  TrendingUp, 
  Box, 
  CreditCard, 
  Activity,
  AlertTriangle,
  Wallet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Pencil
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DashboardData {
  daily: { revenue: number; profit: number; quantity: number };
  weekly: { revenue: number; profit: number; quantity: number };
  monthly: { revenue: number; profit: number; quantity: number };
  total: { revenue: number; profit: number; quantity: number };
  cashDrawer: { startingCash: number; currentRevenue: number };
  lowStockCount: number;
  topSales: any[];
  chartData: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfits, setShowProfits] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newStartingCash, setNewStartingCash] = useState<string>("");
  const [showCashDialog, setShowCashDialog] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.error) {
        console.error("Dashboard API error:", json.error);
        setData(null);
      } else {
        setData(json);
        setNewStartingCash(json.cashDrawer.startingCash.toString());
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePinSubmit = () => {
    if (pinInput === "1234") { // Code par défaut souhaité par l'utilisateur
      setShowProfits(true);
      setShowPinDialog(false);
      setPinInput("");
      toast.success("Mode Gérant activé");
    } else {
      toast.error("Code PIN incorrect");
      setPinInput("");
    }
  };

  const updateCashDrawer = async () => {
    try {
      const res = await fetch("/api/cash-drawer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startingCash: Number(newStartingCash) }),
      });
      if (res.ok) {
        toast.success("Fond de caisse mis à jour");
        setShowCashDialog(false);
        fetchData();
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

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
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <div className="flex items-center gap-2">
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
                {formatCurrency(data.cashDrawer.startingCash + data.cashDrawer.currentRevenue)}
            </div>
            <div className="flex items-center justify-between mt-1">
                <p className="text-xs opacity-80 leading-tight">
                    Fond: {formatCurrency(data.cashDrawer.startingCash)}
                </p>
                <button 
                    onClick={() => setShowCashDialog(true)}
                    className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors"
                >
                    Modifier
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
              {data.daily.quantity} produit(s) vendu(s)
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
              {data.weekly.quantity} produit(s) vendu(s)
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Alertes Stock
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {data.lowStockCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Produit(s) à réapprovisionner
            </p>
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
                        formatter={(value: any, name: any) => [
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
                    <div className="h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                      <Box className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
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
            <Button onClick={handlePinSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">
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
            <Button onClick={updateCashDrawer} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

