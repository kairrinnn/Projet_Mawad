"use client";

import { Pencil, Trash2, QrCode, Activity, PackageSearch, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  category: string | null;
  categoryId: string | null;
  description: string | null;
  supplierId: string | null;
  image: string | null;
  canBeSoldByWeight: boolean;
  weightSalePrice: number | null;
  weightCostPrice: number | null;
  supplier?: { id: string; name: string } | null;
}

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onViewQR: (product: Product) => void;
  onHistory: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewImage: (url: string) => void;
  formatCurrency: (amount: number) => string;
}

export function ProductTable({
  products,
  loading,
  onViewQR,
  onHistory,
  onEdit,
  onDelete,
  onViewImage,
  formatCurrency,
}: ProductTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-border/50 shadow-card flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          <p className="text-sm">Chargement de l&apos;inventaire…</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-border/50 shadow-card flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <PackageSearch className="h-10 w-10 text-slate-300" />
          <p className="text-sm">Aucun produit trouvé</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-border/50 shadow-card overflow-hidden">
      {/* ── Table header ───────────────────────────────────── */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_120px] px-4 py-2.5 bg-slate-50/80 border-b border-border/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <span>Produit</span>
        <span>Catégorie</span>
        <span className="text-right">Prix Achat</span>
        <span className="text-right">Prix Vente</span>
        <span className="text-center">Stock</span>
        <span className="text-right">Actions</span>
      </div>

      {/* ── Rows ───────────────────────────────────────────── */}
      <div className="divide-y divide-border/40">
        {products.map((product) => {
          const isLowStock = product.stock <= product.lowStockThreshold;

          return (
            <div
              key={product.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_120px] items-center px-4 py-3 hover:bg-slate-50/60 transition-colors duration-150 group"
            >
              {/* Product */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-10 w-10 relative rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity ring-0 hover:ring-2 ring-indigo-200"
                  onClick={() => product.image && onViewImage(product.image)}
                >
                  {product.image ? (
                    <NextImage src={product.image} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <PackageSearch className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 truncate">{product.name}</span>
                    {isLowStock && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                        Alerte
                      </span>
                    )}
                  </div>
                  {product.supplier && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{product.supplier.name}</p>
                  )}
                  {isLowStock && (
                    <p className="text-[10px] text-red-400 mt-0.5">Seuil: {product.lowStockThreshold}</p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                {product.category ? (
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal text-[11px] rounded-full border-0"
                  >
                    {product.category}
                  </Badge>
                ) : (
                  <span className="text-slate-300 text-sm">—</span>
                )}
              </div>

              {/* Cost price */}
              <div className="text-right text-sm text-slate-400 tabular-nums">
                {formatCurrency(product.costPrice)}
              </div>

              {/* Sale price */}
              <div className="text-right text-sm font-semibold text-slate-800 tabular-nums">
                {formatCurrency(product.salePrice)}
              </div>

              {/* Stock badge */}
              <div className="flex justify-center">
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-full text-xs font-bold",
                    isLowStock
                      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  )}
                >
                  {product.stock}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewQR(product)}
                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Voir QR Code"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onHistory(product)}
                  className="h-8 w-8 text-slate-400 hover:text-violet-600 hover:bg-violet-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Historique"
                >
                  <Activity className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(product)}
                  className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Modifier"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(product)}
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Archiver"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-border/40 bg-slate-50/50">
        <p className="text-[11px] text-slate-400">
          {products.length} produit{products.length > 1 ? "s" : ""} affiché{products.length > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
