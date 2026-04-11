"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImportRow {
  name: string;
  salePrice: number | string;
  costPrice: number | string;
  stock?: number | string;
  lowStockThreshold?: number | string;
  barcode?: string;
  category?: string;
  description?: string;
}

interface ImportResult {
  created: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const REQUIRED_COLUMNS = ["name", "salePrice", "costPrice"];
const COLUMN_ALIASES: Record<string, string> = {
  nom: "name",
  produit: "name",
  "prix de vente": "salePrice",
  "prix vente": "salePrice",
  prixvente: "salePrice",
  "prix d'achat": "costPrice",
  "prix achat": "costPrice",
  prixachat: "costPrice",
  stock: "stock",
  "seuil alerte": "lowStockThreshold",
  "seuil bas": "lowStockThreshold",
  "code-barres": "barcode",
  "code barres": "barcode",
  codebarres: "barcode",
  "code barre": "barcode",
  categorie: "category",
  "catégorie": "category",
  description: "description",
};

function normalizeHeader(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return COLUMN_ALIASES[lower] ?? lower;
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["name", "salePrice", "costPrice", "stock", "lowStockThreshold", "barcode", "category", "description"],
    ["Exemple Produit A", 25, 15, 100, 5, "1234567890", "Boissons", "Description optionnelle"],
    ["Exemple Produit B", 50, 30, 50, 10, "", "Alimentaire", ""],
  ]);
  ws["!cols"] = [
    { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
    { wch: 16 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produits");
  XLSX.writeFile(wb, "modele_import_produits.xlsx");
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ProductImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setPreview([]);
    setFileName("");
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError("");
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
          raw: false,
        });

        if (rawRows.length === 0) {
          setParseError("Le fichier est vide.");
          return;
        }

        // Normalize column headers
        const normalizedRows: ImportRow[] = rawRows.map((raw) => {
          const mapped: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(raw)) {
            const normalKey = normalizeHeader(key);
            mapped[normalKey] = value;
          }
          return mapped as unknown as ImportRow;
        });

        // Check required columns
        const firstRow = normalizedRows[0];
        const missing = REQUIRED_COLUMNS.filter((col) => !(col in firstRow));
        if (missing.length > 0) {
          setParseError(
            `Colonnes obligatoires manquantes : ${missing.join(", ")}. ` +
              `Télécharge le modèle pour voir la structure attendue.`
          );
          return;
        }

        if (normalizedRows.length > 500) {
          setParseError("Maximum 500 produits par import. Divisez votre fichier.");
          return;
        }

        setPreview(normalizedRows.slice(0, 10));
        // Store full data in state via a ref trick — pass as state
        setPreview(normalizedRows);
      } catch {
        setParseError("Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier Excel valide (.xlsx).");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: preview }),
        cache: "no-store",
      });

      const data = (await res.json()) as ImportResult & { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'import");
        return;
      }

      setResult(data);

      if (data.created > 0) {
        toast.success(`${data.created} produit(s) importé(s) avec succès`);
        onImportComplete();
      }

      if (data.errors.length > 0 && data.created === 0) {
        toast.error("Aucun produit importé. Vérifiez les erreurs ci-dessous.");
      }
    } catch {
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Importer des produits depuis Excel
          </DialogTitle>
          <DialogDescription>
            Importez jusqu'à 500 produits en une seule opération depuis un fichier .xlsx.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-600">
              Colonnes requises : <strong>name</strong>, <strong>salePrice</strong>, <strong>costPrice</strong>
            </span>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Modèle Excel
            </Button>
          </div>

          {/* File picker */}
          {!result && (
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 transition hover:border-indigo-400 hover:bg-indigo-50/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600">
                {fileName ? (
                  <span className="font-medium text-indigo-600">{fileName}</span>
                ) : (
                  "Cliquez pour sélectionner un fichier .xlsx"
                )}
              </p>
              {!fileName && (
                <p className="text-xs text-slate-400">Format Excel (.xlsx) uniquement</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && !result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {preview.length} produit(s) détecté(s)
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-slate-500 hover:text-red-600"
                  onClick={reset}
                >
                  <X className="h-3.5 w-3.5" />
                  Réinitialiser
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Nom</th>
                      <th className="px-3 py-2 text-right font-medium">Prix vente</th>
                      <th className="px-3 py-2 text-right font-medium">Prix achat</th>
                      <th className="px-3 py-2 text-right font-medium">Stock</th>
                      <th className="px-3 py-2 text-left font-medium">Code-barres</th>
                      <th className="px-3 py-2 text-left font-medium">Catégorie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.slice(0, 8).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">
                          {String(row.name || "")}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">{String(row.salePrice ?? "")}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{String(row.costPrice ?? "")}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{String(row.stock ?? 0)}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono">{String(row.barcode ?? "")}</td>
                        <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">{String(row.category ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 8 && (
                  <p className="px-3 py-2 text-center text-xs text-slate-400">
                    … et {preview.length - 8} autre(s) non affichés
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">
                  {result.created} produit(s) créé(s) avec succès
                </span>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-red-700">
                    {result.errors.length} erreur(s) :
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-2">
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 text-xs text-red-800">
                        <span className="shrink-0 font-medium">Ligne {err.row} ({err.name}):</span>
                        <span>{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {result ? (
            <Button onClick={() => handleClose(false)}>Fermer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
                Annuler
              </Button>
              <Button
                onClick={() => void handleImport()}
                disabled={preview.length === 0 || importing || !!parseError}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {importing ? (
                  "Import en cours..."
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer {preview.length > 0 ? `(${preview.length})` : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
