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
  AlertTriangle
} from "lucide-react";

interface DashboardData {
  daily: { profit: number; quantity: number };
  weekly: { profit: number; quantity: number };
  monthly: { profit: number; quantity: number };
  total: { profit: number; quantity: number };
  lowStockCount: number;
  topSales: any[];
  chartData: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.error) {
          console.error("Dashboard API error:", json.error);
          setData(null);
        } else {
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const getCurrencySymbol = () => {
    return "DH";
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Ventes Aujourd'hui
            </CardTitle>
            <CreditCard className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(data.daily?.profit || 0)}</div>
            <p className="text-xs text-slate-500 mt-1">
              {data.daily?.quantity || 0} produit(s) vendu(s)
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Ventes Hebdomadaires
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(data.weekly?.profit || 0)}</div>
            <p className="text-xs text-slate-500 mt-1">
              {data.weekly?.quantity || 0} produit(s) vendu(s)
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Ventes Mensuelles
            </CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(data.monthly?.profit || 0)}</div>
            <p className="text-xs text-slate-500 mt-1">
              {data.monthly?.quantity || 0} produit(s) vendu(s)
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
              {data.lowStockCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Produit(s) à réapprovisionner
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader>
            <CardTitle>Bénéfices des 7 derniers jours</CardTitle>
            <CardDescription>
              Aperçu des performances récentes en {getCurrencySymbol() === "DH" ? "MAD" : "EUR"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
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
                  tickFormatter={(value) => `${getCurrencySymbol()}${value}`}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value} ${getCurrencySymbol()}`, "Bénéfice"]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  cursor={{fill: '#F1F5F9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar 
                  dataKey="profit" 
                  fill="#4F46E5" 
                  radius={[4, 4, 0, 0]} 
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-white border-none shadow-sm shadow-slate-200">
          <CardHeader>
            <CardTitle>Top Ventes</CardTitle>
            <CardDescription>
              Les 5 produits les plus vendus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.topSales.length === 0 ? (
                <div className="text-center text-slate-500 py-8">Aucune vente enregistrée.</div>
              ) : (
                data.topSales.map((sale, i) => (
                  <div key={i} className="flex items-center">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 mr-4">
                      <Box className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {sale.product?.name || "Produit inconnu"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sale.product?.category || "Sans catégorie"}
                      </p>
                    </div>
                    <div className="ml-auto font-medium">
                      {sale._sum.quantity} <span className="text-xs text-slate-500 font-normal">vendu(s)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
