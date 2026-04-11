"use client";

import { useEffect, useState } from "react";
import { DollarSign, FileText, PackageSearch, Table as TableIcon, Trash2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  stockStats: { qty: number; purchasesCost: number; currentValue: number };
  filteredStock: StockEntry[];
  formatCurrency: (val: number) => string;
  formatQty: (q: number) => string;
  onHistoryChanged: () => Promise<void> | void;
}

export function StockTab({
  stockPeriod,
  setStockPeriod,
  periodLabels,
  stockStats,
  filteredStock,
  formatCurrency,
  formatQty,
  onHistoryChanged,
}: StockTabProps) {
  const [deleteTarget, setDeleteTarget] = useState<StockEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hasExportedHistory, setHasExportedHistory] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setHasExportedHistory(false);
  }, [stockPeriod, filteredStock.length]);

  const handleExportPDF = () => {
    const filename = `Stock_${stockPeriod}_${new Date().toISOString().split("T")[0]}`;
    const headers = ["Date", "Produit", "Variation", "PA unitaire", "Impact cout"];
    const data = filteredStock.map((entry) => [
      new Date(entry.date).toLocaleDateString("fr-FR"),
      entry.product?.name || "Produit inconnu",
      entry.quantity,
      formatCurrency(entry.costPrice),
      formatCurrency(entry.totalCost),
    ]);

    exportToPDF({
      filename,
      title: `Historique net du stock - ${periodLabels[stockPeriod]}`,
      headers,
      data,
      orientation: "l",
    });
    setHasExportedHistory(true);
  };

  const handleExportExcel = () => {
    const filename = `Stock_${stockPeriod}_${new Date().toISOString().split("T")[0]}`;
    const data = filteredStock.map((entry) => ({
      Date: new Date(entry.date).toLocaleDateString("fr-FR"),
      Produit: entry.product?.name || "Produit inconnu",
      Variation: entry.quantity,
      PrixAchatUnitaire: entry.costPrice,
      ImpactCout: entry.totalCost,
    }));

    exportToExcel({ filename, data, sheetName: "Stock" });
    setHasExportedHistory(true);
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/stock-entries", { method: "DELETE", cache: "no-store" });
      if (res.ok) {
        toast.success("Historique stock vidé. Les stocks produits sont inchangés.");
        setClearConfirmOpen(false);
        await onHistoryChanged();
      } else {
        toast.error("Échec de la suppression");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setClearing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      if (!hasExportedHistory && filteredStock.length > 0) {
        handleExportExcel();
        toast.info("Un export Excel du stock a ete telecharge avant suppression.");
      }

      const { error } = await apiRequest(`/api/stock-entries/${deleteTarget.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!error) {
        toast.success("Ligne d'historique supprimee");
        setDeleteTarget(null);
        await onHistoryChanged();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Historique Net du Stock</h2>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearConfirmOpen(true)}
            disabled={filteredStock.length === 0}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Vider l&apos;historique
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Impact net sur la periode</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(stockStats.purchasesCost)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Valeur du stock actuel</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(stockStats.currentValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <PackageSearch className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Variation quantite</p>
              <p className="text-xl font-bold text-slate-900">
                {formatQty(stockStats.qty)} <span className="text-xs font-normal text-slate-400">unites/kg</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-slate-50/80 shadow-sm">
        <CardContent className="pt-4 text-sm text-slate-600">
          Cette vue montre seulement les produits encore actifs. Les corrections positives et negatives apparaissent dans ce journal, et un export Excel est telecharge automatiquement avant suppression si tu n&apos;as pas encore exporte la vue courante.
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Produit</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Variation</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">P.A. unitaire</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Impact cout</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center italic text-slate-400">
                    Aucun mouvement de stock sur cette periode.
                  </td>
                </tr>
              ) : (
                filteredStock.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(entry.date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {entry.product?.name || "Produit inconnu"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          entry.quantity >= 0
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }
                      >
                        {entry.quantity > 0 ? "+" : ""}
                        {formatQty(entry.quantity)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatCurrency(entry.costPrice)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        entry.totalCost >= 0 ? "text-slate-900" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(entry.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteTarget(entry)}
                        title="Supprimer cette ligne d'historique"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Supprimer cette ligne d&apos;historique</DialogTitle>
            <DialogDescription>
              La ligne sera retiree du journal et son effet sera inverse sur le stock du produit.
              Si aucun export n&apos;a encore ete fait sur la vue actuelle, un fichier Excel sera telecharge avant la suppression.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? "Suppression..." : "Exporter puis supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clearConfirmOpen} onOpenChange={(open) => !open && setClearConfirmOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Vider l&apos;historique du stock</DialogTitle>
            <DialogDescription>
              Toutes les lignes d&apos;historique seront supprimées définitivement. Les stocks actuels des produits restent inchangés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)} disabled={clearing}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void handleClearHistory()}
              disabled={clearing}
            >
              {clearing ? "Suppression..." : "Vider l'historique"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
