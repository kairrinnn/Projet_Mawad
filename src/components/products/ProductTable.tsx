"use client";

import { 
  Pencil, 
  Trash2, 
  QrCode, 
  Activity, 
  PackageSearch 
} from "lucide-react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  formatCurrency
}: ProductTableProps) {
  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead>Produit</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead className="text-right">Prix Achat</TableHead>
            <TableHead className="text-right">Prix Vente</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                Chargement de l&apos;inventaire...
              </TableCell>
            </TableRow>
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <PackageSearch className="h-10 w-10 text-slate-300" />
                  <p>Aucun produit trouvé.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 relative rounded bg-slate-100 border overflow-hidden flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                      onClick={() => product.image && onViewImage(product.image)}
                    >
                      {product.image ? (
                        <NextImage src={product.image} alt={product.name} fill className="object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <PackageSearch className="h-5 w-5 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{product.name}</span>
                          {product.stock <= product.lowStockThreshold && (
                            <Badge variant="destructive" className="bg-red-100 text-red-600 hover:bg-red-100 border-none text-[10px] px-1.5 py-0 h-4 uppercase font-bold">
                              Alerte
                            </Badge>
                          )}
                        </div>
                        {product.stock <= product.lowStockThreshold && (
                          <span className="text-[10px] text-red-500 font-medium">Seuil: {product.lowStockThreshold}</span>
                        )}
                      </div>
                      {product.supplier && (
                        <span className="text-xs text-slate-500 line-clamp-1">{product.supplier.name}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {product.category ? (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-normal">
                      {product.category}
                    </Badge>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {formatCurrency(product.costPrice)}
                </TableCell>
                <TableCell className="text-right font-medium text-slate-900">
                  {formatCurrency(product.salePrice)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={product.stock <= product.lowStockThreshold
                      ? "border-red-200 bg-red-50 text-red-700" 
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"}
                  >
                    {product.stock}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onViewQR(product)}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 w-8 p-0"
                      title="Voir QR Code"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-900 hover:bg-slate-100" onClick={() => onHistory(product)} title="Historique">
                      <Activity className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(product)}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 w-8 p-0"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDelete(product)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
