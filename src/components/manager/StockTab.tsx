"use client";

import { DollarSign, FileText, PackageSearch, Table as TableIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

interface StockEntry {
  id: string;
  productId: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  date: string;
  product: { name: string };
}

interface StockTabProps {
  stockPeriod: "daily" | "weekly" | "monthly" | "total";
  setStockPeriod: (p: "daily" | "weekly" | "monthly" | "total") => void;
  periodLabels: Record<string, string>;
  stockStats: { qty: number; cost: number };
  filteredStock: StockEntry[];
  formatCurrency: (val: number) => string;
  formatQty: (q: number) => string;
}

export function StockTab({
  stockPeriod,
  setStockPeriod,
  periodLabels,
  stockStats,
  filteredStock,
  formatCurrency,
  formatQty
}: StockTabProps) {
  const handleExportPDF = () => {
    const filename = `Stock_${stockPeriod}_${new Date().toISOString().split("T")[0]}`;
    const headers = ["Date", "Produit", "Quantite", "PA unitaire", "Cout total"];
    const data = filteredStock.map((entry) => [
      new Date(entry.date).toLocaleDateString("fr-FR"),
      entry.product?.name || "Produit inconnu",
      formatQty(entry.quantity),
      formatCurrency(entry.costPrice),
      formatCurrency(entry.totalCost),
    ]);

    exportToPDF({
      filename,
      title: `Historique stock - ${periodLabels[stockPeriod]}`,
      headers,
      data,
      orientation: "l",
    });
  };

  const handleExportExcel = () => {
    const filename = `Stock_${stockPeriod}_${new Date().toISOString().split("T")[0]}`;
    const data = filteredStock.map((entry) => ({
      Date: new Date(entry.date).toLocaleDateString("fr-FR"),
      Produit: entry.product?.name || "Produit inconnu",
      Quantite: entry.quantity,
      PrixAchatUnitaire: entry.costPrice,
      CoutTotal: entry.totalCost,
    }));

    exportToExcel({ filename, data, sheetName: "Stock" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">Historique des Ajouts de Stock</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {(["daily", "weekly", "monthly", "total"] as const).map((p) => (
            <Button 
              key={p} 
              variant={stockPeriod === p ? "default" : "outline"} 
              size="sm" 
              onClick={() => setStockPeriod(p)}
              className={stockPeriod === p ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              {periodLabels[p]}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredStock.length === 0}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredStock.length === 0}>
            <TableIcon className="mr-2 h-4 w-4" />
            Excel
          </Button>
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
              <p className="text-xl font-bold text-slate-900">{formatCurrency(stockStats.cost)}</p>
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
              <p className="text-xl font-bold text-slate-900">
                {formatQty(stockStats.qty)} <span className="text-xs font-normal text-slate-400">unités/kg</span>
              </p>
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
                      {new Date(entry.date).toLocaleDateString("fr-FR", { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {entry.product?.name || "Produit inconnu"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        +{formatQty(entry.quantity)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatCurrency(entry.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(entry.totalCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
