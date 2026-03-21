"use client";

import { TrendingUp, Receipt, Wallet, DollarSign, AlertCircle, FileText, Table as TableIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ResponsiveContainer, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar 
} from "recharts";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";

interface PeriodMetrics {
  profit?: number;
  grossProfit?: number;
  expenses?: number;
}

interface DashboardSummary {
  cashDrawer?: {
    balance?: number;
  };
  chartData?: Array<{
    date: string;
    profit: number;
    expenses: number;
  }>;
}

interface BilanTabProps {
  bilanPeriod: "daily" | "weekly" | "monthly" | "total";
  setBilanPeriod: (p: "daily" | "weekly" | "monthly" | "total") => void;
  periodData: PeriodMetrics;
  periodLabels: Record<string, string>;
  dashboardData: DashboardSummary | null;
  formatCurrency: (val: number) => string;
}

export function BilanTab({ 
  bilanPeriod, 
  setBilanPeriod, 
  periodData, 
  periodLabels, 
  dashboardData,
  formatCurrency 
}: BilanTabProps) {

  const handleExportPDF = () => {
    const title = `Rapport Financier - ${periodLabels[bilanPeriod]}`;
    const filename = `Rapport_Financier_${bilanPeriod}_${new Date().toISOString().split('T')[0]}`;
    const headers = ["Indicateur", "Valeur"];
    const data = [
      ["Bénéfice Net", formatCurrency(periodData?.profit ?? 0)],
      ["Bénéfice Brut", formatCurrency(periodData?.grossProfit ?? periodData?.profit ?? 0)],
      ["Total Charges", formatCurrency(periodData?.expenses ?? 0)],
      ["État de la Caisse", formatCurrency(dashboardData?.cashDrawer?.balance ?? 0)],
    ];
    exportToPDF({ filename, title, headers, data });
  };

  const handleExportExcel = () => {
    const filename = `Rapport_Financier_${bilanPeriod}_${new Date().toISOString().split('T')[0]}`;
    const data = [
      { Indicateur: "Bénéfice Net", Valeur: periodData?.profit ?? 0 },
      { Indicateur: "Bénéfice Brut", Valeur: periodData?.grossProfit ?? periodData?.profit ?? 0 },
      { Indicateur: "Total Charges", Valeur: periodData?.expenses ?? 0 },
      { Indicateur: "État de la Caisse", Valeur: dashboardData?.cashDrawer?.balance ?? 0 },
    ];
    exportToExcel({ filename, data, sheetName: "Bilan" });
  };

  return (
    <div className="space-y-6">
      {/* Period Selector & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-red-600 border-red-200">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-emerald-600 border-emerald-200">
            <TableIcon className="h-4 w-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice Net</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(periodData?.profit ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{periodLabels[bilanPeriod]} — après charges ({formatCurrency(periodData?.expenses ?? 0)}).</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bénéfice Brut</CardTitle>
            <Receipt className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(periodData?.grossProfit ?? periodData?.profit ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Marge sur les ventes uniquement.</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Charges</CardTitle>
            <Wallet className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(periodData?.expenses ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Salaires, factures et loyer.</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">État de la Caisse</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData?.cashDrawer?.balance ?? 0)}</div>
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
          {(dashboardData?.chartData?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData?.chartData ?? []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(s) => new Date(s).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${v} DH`} />
                <Tooltip
                  formatter={(value: number | string, name: string) => [`${Number(value).toFixed(2)} DH`, name === "profit" ? "Bénéfice" : "Dépenses"]}
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
                <p>Le graphique s&apos;affichera après vos premières données.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
