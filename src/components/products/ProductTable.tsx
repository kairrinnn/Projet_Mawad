"use client";

import NextImage from "next/image";
import {
  Activity,
  Loader2,
  PackageSearch,
  Pencil,
  QrCode,
  Scale,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function ProductActions({
  product,
  onViewQR,
  onHistory,
  onEdit,
  onDelete,
}: {
  product: Product;
  onViewQR: (product: Product) => void;
  onHistory: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewQR(product)}
        className="h-8 rounded-full border-indigo-200/70 px-3 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-200"
      >
        <QrCode className="size-3.5" />
        QR
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onHistory(product)}
        className="h-8 rounded-full border-violet-200/70 px-3 text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-200"
      >
        <Activity className="size-3.5" />
        Historique
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(product)}
        className="h-8 rounded-full border-amber-200/70 px-3 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-200"
      >
        <Pencil className="size-3.5" />
        Modifier
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(product)}
        className="h-8 rounded-full border-rose-200/70 px-3 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-200"
      >
        <Trash2 className="size-3.5" />
        Archiver
      </Button>
    </div>
  );
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
      <div className="surface-card rounded-[1.75rem] px-6 py-16">
        <div className="flex flex-col items-center gap-3 text-center text-slate-500 dark:text-slate-300">
          <div className="flex size-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Synchronisation de l&apos;inventaire
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Les produits et les niveaux de stock sont en train d&apos;etre charges.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="surface-card rounded-[1.75rem] px-6 py-16">
        <div className="flex flex-col items-center gap-3 text-center text-slate-500 dark:text-slate-300">
          <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-300">
            <PackageSearch className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Aucun produit ne correspond a cette recherche
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Essaie un autre mot-cle ou ajoute une nouvelle reference.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden rounded-[1.75rem]">
      <div className="flex flex-col gap-3 border-b border-slate-200/70 px-5 py-5 dark:border-slate-800/80 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="eyebrow-label">Inventaire</p>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
            Catalogue actif
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vue operationnelle des produits, marges, seuils de stock et actions rapides.
          </p>
        </div>
        <Badge className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
          {products.length} reference{products.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        {products.map((product) => {
          const isLowStock = product.stock <= product.lowStockThreshold;
          const marginValue = product.salePrice - product.costPrice;

          return (
            <article
              key={product.id}
              className="rounded-[1.5rem] border border-slate-200/70 bg-white/85 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.05)] dark:border-slate-800/80 dark:bg-slate-950/70"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => product.image && onViewImage(product.image)}
                  className={cn(
                    "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800",
                    product.image ? "cursor-zoom-in" : "cursor-default"
                  )}
                >
                  {product.image ? (
                    <NextImage src={product.image} alt={product.name} fill className="object-cover" />
                  ) : (
                    <PackageSearch className="size-5 text-slate-300 dark:text-slate-600" />
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">
                      {product.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        isLowStock
                          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                      )}
                    >
                      {isLowStock ? "Alerte stock" : "Stock sain"}
                    </Badge>
                    {product.canBeSoldByWeight && (
                      <Badge className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                        <Scale className="size-3" />
                        Vente au poids
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {product.category ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        {product.category}
                      </span>
                    ) : null}
                    {product.supplier?.name ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        {product.supplier.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Vente
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {formatCurrency(product.salePrice)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Achat
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {formatCurrency(product.costPrice)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Stock
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {product.stock} unite{product.stock > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Marge unitaire {formatCurrency(marginValue)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <ProductActions
                  product={product}
                  onViewQR={onViewQR}
                  onHistory={onHistory}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200/70 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-950/40">
              <TableHead className="px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Produit
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Categorie
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Prix
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Stock
              </TableHead>
              <TableHead className="pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isLowStock = product.stock <= product.lowStockThreshold;

              return (
                <TableRow
                  key={product.id}
                  className="border-slate-200/60 bg-transparent hover:bg-slate-50/70 dark:border-slate-800/70 dark:hover:bg-slate-950/40"
                >
                  <TableCell className="px-5 py-4 align-top">
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        onClick={() => product.image && onViewImage(product.image)}
                        className={cn(
                          "relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800",
                          product.image ? "cursor-zoom-in" : "cursor-default"
                        )}
                      >
                        {product.image ? (
                          <NextImage src={product.image} alt={product.name} fill className="object-cover" />
                        ) : (
                          <PackageSearch className="size-5 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {product.name}
                          </p>
                          {isLowStock ? (
                            <Badge className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                              Alerte stock
                            </Badge>
                          ) : null}
                          {product.canBeSoldByWeight ? (
                            <Badge className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                              <Scale className="size-3" />
                              Au poids
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {product.supplier?.name ? <span>{product.supplier.name}</span> : null}
                          {product.barcode ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono dark:bg-slate-800">
                              {product.barcode}
                            </span>
                          ) : null}
                        </div>
                        {isLowStock ? (
                          <p className="text-xs text-rose-600 dark:text-rose-300">
                            Seuil critique a {product.lowStockThreshold} unite{product.lowStockThreshold > 1 ? "s" : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    {product.category ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {product.category}
                      </Badge>
                    ) : (
                      <span className="text-sm text-slate-400">Non classe</span>
                    )}
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {formatCurrency(product.salePrice)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Achat {formatCurrency(product.costPrice)}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        Marge {formatCurrency(product.salePrice - product.costPrice)}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="align-top">
                    <div className="space-y-2">
                      <Badge
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          isLowStock
                            ? "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                            : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                        )}
                      >
                        {product.stock} unite{product.stock > 1 ? "s" : ""}
                      </Badge>
                      {product.canBeSoldByWeight && product.weightSalePrice ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatCurrency(product.weightSalePrice)} / kg
                        </p>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell className="py-4 pr-5 align-top">
                    <div className="flex justify-end">
                      <ProductActions
                        product={product}
                        onViewQR={onViewQR}
                        onHistory={onHistory}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
