"use client";

import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  Coins,
  AlertCircle,
  FileText,
  Table as TableIcon,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { cn } from "@/lib/utils";

interface PrevPeriod {
  profit: number;
  grossProfit: number;
  expenses: number;
}

interface PeriodMetrics {
  profit?: number;
  grossProfit?: number;
  expenses?: number;
  prev?: PrevPeriod;
}

function ComparisonBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full",
        up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

interface DashboardSummary {
  cashDrawer?: { balance?: number };
  chartData?: Array<{ date: string; profit: number; expenses: number }>;
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
  formatCurrency,
}: BilanTabProps) {

  const handleExportPDF = () => {
    const title = `Rapport Financier - ${periodLabels[bilanPeriod]}`;
    const filename = `Rapport_Financier_${bilanPeriod}_${new Date().toISOString().split("T")[0]}`;
    exportToPDF({
      filename, title,
      headers: ["Indicateur", "Valeur"],
      data: [
        ["Bénéfice Net", formatCurrency(periodData?.profit ?? 0)],
        ["Bénéfice Brut", formatCurrency(periodData?.grossProfit ?? periodData?.profit ?? 0)],
        ["Total Charges", formatCurrency(periodData?.expenses ?? 0)],
        ["État de la Caisse", formatCurrency(dashboardData?.cashDrawer?.balance ?? 0)],
      ],
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Rapport_Financier_${bilanPeriod}_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Bilan",
      data: [
        { Indicateur: "Bénéfice Net", Valeur: periodData?.profit ?? 0 },
        { Indicateur: "Bénéfice Brut", Valeur: periodData?.grossProfit ?? periodData?.profit ?? 0 },
        { Indicateur: "Total Charges", Valeur: periodData?.expenses ?? 0 },
        { Indicateur: "État de la Caisse", Valeur: dashboardData?.cashDrawer?.balance ?? 0 },
      ],
    });
  };

  return (
    <div className="space-y-6">

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Period pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["daily", "weekly", "monthly", "total"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setBilanPeriod(p)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                bilanPeriod === p
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* Export */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="rounded-full border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 gap-1.5"
          >
            <TableIcon className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </div>

      {/* ── Metric cards ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Bénéfice Net */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Bénéfice Net</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 mb-1.5">
            {formatCurrency(periodData?.profit ?? 0)}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400">{periodLabels[bilanPeriod]} — après charges</p>
            {periodData?.prev && (
              <ComparisonBadge current={periodData.profit ?? 0} previous={periodData.prev.profit} />
            )}
          </div>
        </div>

        {/* Bénéfice Brut */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Bénéfice Brut</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Receipt className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">
            {formatCurrency(periodData?.grossProfit ?? periodData?.profit ?? 0)}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400">Marge sur les ventes</p>
            {periodData?.prev && (
              <ComparisonBadge current={periodData.grossProfit ?? 0} previous={periodData.prev.grossProfit} />
            )}
          </div>
        </div>

        {/* Total Charges */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Total Charges</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
              <Wallet className="h-4 w-4 text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-red-600 mb-1.5">
            {formatCurrency(periodData?.expenses ?? 0)}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400">Salaires, factures et loyer</p>
            {periodData?.prev && (
              <ComparisonBadge current={periodData.expenses ?? 0} previous={periodData.prev.expenses} />
            )}
          </div>
        </div>

        {/* État de la Caisse */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">État de la Caisse</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
              <Coins className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">
            {formatCurrency(dashboardData?.cashDrawer?.balance ?? 0)}
          </div>
          <p className="text-xs text-slate-400">Fond + Ventes − Dépenses quotidiennes</p>
        </div>
      </div>

      {/* ── Chart ────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-card p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Bénéfice vs Dépenses</h2>
            <p className="text-xs text-slate-400 mt-0.5">Comparaison journalière sur 7 jours</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Bénéfice
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Dépenses
            </span>
          </div>
        </div>

        {(dashboardData?.chartData?.length ?? 0) > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboardData?.chartData ?? []} barCategoryGap="30%" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                  <stop offset="100%" stopColor="#fca5a5" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#CBD5E1", fontSize: 10 }}
                tickFormatter={(s) => new Date(s).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#CBD5E1", fontSize: 10 }}
                tickFormatter={(v) => `${v} DH`}
              />
              <Tooltip
                formatter={(value: number | string, name: string) => [
                  `${Number(value).toFixed(2)} DH`,
                  name === "profit" ? "Bénéfice" : "Dépenses",
                ]}
                labelFormatter={(l) => new Date(l).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                cursor={{ fill: "rgba(99,102,241,0.05)", radius: 8 }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="profit" fill="url(#profitGrad)" radius={[5, 5, 0, 0]} animationDuration={900} />
              <Bar dataKey="expenses" fill="url(#expGrad)" radius={[5, 5, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40">
            <BarChart2 className="h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">Le graphique s&apos;affichera après vos premières données.</p>
          </div>
        )}
      </div>
    </div>
  );
}
