"use client";

import { useEffect, useState, useMemo } from "react";
import { ClipboardList, Search, AlertTriangle, CheckCircle2, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  stock: number;
  category: string | null;
}

interface CountedMap {
  [productId: string]: string; // string to allow empty input
}

interface AdjustResult {
  adjusted: number;
  skipped: number;
  errors: Array<{ productId: string; error: string }>;
}

type Step = "count" | "confirm" | "done";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [counted, setCounted] = useState<CountedMap>({});
  const [search, setSearch] = useState("");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [step, setStep] = useState<Step>("count");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AdjustResult | null>(null);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Product[]) => {
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        setProducts(sorted);
        // Init counted values to system stock
        const init: CountedMap = {};
        sorted.forEach((p) => {
          init[p.id] = String(p.stock);
        });
        setCounted(init);
      })
      .catch(() => toast.error("Impossible de charger les produits"))
      .finally(() => setLoading(false));
  }, []);

  const getCountedNum = (id: string) => {
    const v = counted[id];
    if (v === "" || v === undefined) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const diffs = useMemo(() => {
    return products.filter((p) => {
      const c = getCountedNum(p.id);
      return c !== null && c !== p.stock;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, counted]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }
    if (showDiffOnly) {
      list = list.filter((p) => {
        const c = getCountedNum(p.id);
        return c !== null && c !== p.stock;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, counted, search, showDiffOnly]);

  const handleSubmit = async () => {
    const items = diffs
      .map((p) => ({ productId: p.id, newStock: getCountedNum(p.id)! }))
      .filter((item) => item.newStock !== null);

    if (items.length === 0) {
      toast.info("Aucun écart détecté — rien à valider.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/batch-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, note: note.trim() || undefined }),
        cache: "no-store",
      });

      const data = (await res.json()) as AdjustResult & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la validation");
        return;
      }

      setResult(data);
      setStep("done");

      if (data.adjusted > 0) {
        toast.success(`${data.adjusted} produit(s) mis à jour`);
      }
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setStep("count");
    setResult(null);
    setNote("");
    setShowDiffOnly(false);
    // Reload products with fresh stock values
    setLoading(true);
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Product[]) => {
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name, "fr"));
        setProducts(sorted);
        const init: CountedMap = {};
        sorted.forEach((p) => { init[p.id] = String(p.stock); });
        setCounted(init);
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── STEP: DONE ──────────────────────────────────────────────────────────────
  if (step === "done" && result) {
    return (
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inventaire physique</h2>
          <p className="text-slate-500">Résultat de la validation</p>
        </div>

        <Card className="border-emerald-200 bg-emerald-50/60 max-w-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-lg font-bold text-emerald-900">Inventaire validé</p>
                <p className="text-sm text-emerald-700">
                  {result.adjusted} ajusté(s) · {result.skipped} inchangé(s)
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
                <p className="font-semibold">{result.errors.length} erreur(s) :</p>
                {result.errors.map((e, i) => (
                  <p key={i}>{e.productId} — {e.error}</p>
                ))}
              </div>
            )}

            <Button onClick={restart} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Nouvel inventaire
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── STEP: CONFIRM ────────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setStep("count")}>
            ← Retour
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inventaire physique</h2>
            <p className="text-slate-500">Récapitulatif des écarts avant validation</p>
          </div>
        </div>

        {diffs.length === 0 ? (
          <Card className="max-w-lg border-slate-200 bg-slate-50">
            <CardContent className="pt-6 text-center text-slate-600">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-medium">Aucun écart détecté.</p>
              <p className="text-sm mt-1 text-slate-400">Tous les stocks comptés correspondent au système.</p>
              <Button variant="outline" className="mt-4" onClick={() => setStep("count")}>
                Retour à la saisie
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 max-w-2xl">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{diffs.length} produit(s) à ajuster</CardTitle>
                <CardDescription>Les stocks système seront remplacés par les quantités comptées.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-y border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-500">Produit</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-500">Système</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-500">Compté</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-500">Écart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diffs.map((p) => {
                        const c = getCountedNum(p.id)!;
                        const diff = c - p.stock;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                            <td className="px-4 py-2.5 text-right text-slate-500">{p.stock}</td>
                            <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">{c}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`font-bold ${diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {diff > 0 ? "+" : ""}{diff}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="inv-note">Note d'inventaire (optionnel)</Label>
              <Input
                id="inv-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Inventaire mensuel avril 2026"
                maxLength={500}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("count")} disabled={submitting}>
                Modifier
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validation…</>
                ) : (
                  `Valider l'inventaire (${diffs.length} ajustement${diffs.length > 1 ? "s" : ""})`
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── STEP: COUNT ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-indigo-600" />
            Inventaire physique
          </h2>
          <p className="text-slate-500">
            Saisissez les quantités comptées. Laissez inchangé si le stock est correct.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {diffs.length > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-sm px-3 py-1">
              {diffs.length} écart{diffs.length > 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            onClick={() => setStep("confirm")}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Récapitulatif →
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9 bg-white"
            placeholder="Rechercher par nom ou code-barres…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showDiffOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDiffOnly((v) => !v)}
          className={showDiffOnly ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          Écarts seulement
        </Button>
      </div>

      {/* Info banner */}
      {products.length === 0 ? (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="pt-6 text-center text-slate-500">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p>Aucun produit actif dans votre inventaire.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Produit</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left font-semibold text-slate-600">Code-barres</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left font-semibold text-slate-600">Catégorie</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Stock système</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Qté comptée</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const countedVal = counted[p.id] ?? String(p.stock);
                const countedNum = getCountedNum(p.id);
                const diff = countedNum !== null ? countedNum - p.stock : null;
                const hasDiff = diff !== null && diff !== 0;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${hasDiff ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                    <td className="hidden sm:table-cell px-4 py-2.5 text-slate-400 font-mono text-xs">
                      {p.barcode || "—"}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-2.5 text-slate-500">
                      {p.category || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 font-mono">{p.stock}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={countedVal}
                        onChange={(e) =>
                          setCounted((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className={`w-24 rounded-md border px-2 py-1 text-right text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                          hasDiff
                            ? "border-amber-300 bg-amber-50 text-amber-900"
                            : "border-slate-200 bg-white text-slate-800"
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right w-20">
                      {hasDiff && diff !== null ? (
                        <span className={`text-sm font-bold ${diff > 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {diff > 0 ? "+" : ""}{diff}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-sm">
              Aucun produit correspondant.
            </div>
          )}
        </div>
      )}

      {/* Bottom action */}
      {diffs.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setStep("confirm")} className="bg-indigo-600 hover:bg-indigo-700">
            Voir les {diffs.length} écart{diffs.length > 1 ? "s" : ""} et valider →
          </Button>
        </div>
      )}
    </div>
  );
}
