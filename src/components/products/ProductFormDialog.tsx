"use client";

import React, { useRef } from "react";
import NextImage from "next/image";
import { Barcode, Camera, Package, Scale, Store, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProductFormCategory {
  id: string;
  name: string;
}

interface ProductFormSupplier {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  barcode: string;
  categoryId: string;
  category: string;
  description: string;
  supplierId: string;
  stock: string;
  lowStockThreshold: string;
  costPrice: string;
  salePrice: string;
  canBeSoldByWeight: boolean;
  weightCostPrice: string;
  weightSalePrice: string;
  image: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  categories: ProductFormCategory[];
  suppliers: ProductFormSupplier[];
  onStartScanner: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  preview: string | null;
  setPreview: (p: string | null) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  title,
  description,
  formData,
  setFormData,
  onSubmit,
  submitting,
  categories,
  suppliers,
  onStartScanner,
  onFileUpload,
  uploading,
  preview,
  setPreview,
  fileInputRef,
}: ProductFormDialogProps) {
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const actualRef = fileInputRef || localFileInputRef;
  const selectedCategoryLabel =
    formData.categoryId === "none"
      ? "Sans catégorie spéciale"
      : categories.find((category) => category.id === formData.categoryId)?.name ||
        "Choisir une catégorie";
  const selectedSupplierLabel =
    formData.supplierId === "none"
      ? "Aucun fournisseur"
      : suppliers.find((supplier) => supplier.id === formData.supplierId)?.name ||
        "Sélectionner un fournisseur";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100%-1rem)] overflow-hidden p-0 sm:max-w-4xl">
        <form onSubmit={onSubmit} className="flex h-full max-h-[92vh] flex-col overflow-hidden">
          <DialogHeader className="border-b border-slate-200/70 px-6 py-6 dark:border-slate-800/80">
            <p className="eyebrow-label">Catalogue</p>
            <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {title}
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-6 p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <section className="surface-card rounded-[1.5rem] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                      <Camera className="size-5" />
                    </div>
                    <div>
                      <p className="eyebrow-label">Media</p>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                        Image produit
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => actualRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          actualRef.current?.click();
                        }
                      }}
                      className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] border border-dashed border-slate-300/80 bg-slate-50/90 transition-colors hover:border-indigo-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-indigo-500/40"
                    >
                      {preview ? (
                        <>
                          <NextImage src={preview} alt="Aperçu produit" fill className="object-cover" />
                          <div className="absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/10" />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreview(null);
                              setFormData({ ...formData, image: "" });
                            }}
                            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"
                          >
                            <X className="size-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                          <div className="flex size-14 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                            <Camera className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                              Ajoute une photo nette du produit
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              JPG, PNG ou capture directe depuis l&apos;appareil photo.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Input
                      type="file"
                      ref={actualRef}
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={onFileUpload}
                      disabled={uploading}
                    />

                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => actualRef.current?.click()}
                        disabled={uploading}
                        className="w-full justify-center"
                      >
                        <Camera className="size-4" />
                        {uploading ? "Optimisation en cours..." : "Importer une photo"}
                      </Button>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Une image propre améliore la lisibilité dans la caisse et l&apos;inventaire.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="surface-card rounded-[1.5rem] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200">
                      <Barcode className="size-5" />
                    </div>
                    <div>
                      <p className="eyebrow-label">Capture</p>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                        Code barre
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <Label htmlFor="barcode" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Référence scannable
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(event) =>
                          setFormData({ ...formData, barcode: event.target.value })
                        }
                        placeholder="EAN-13, UPC..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onStartScanner}
                        className="sm:w-auto"
                      >
                        <Barcode className="size-4" />
                        Scanner
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Le scan permet aussi de préremplir certaines données publiques du produit.
                    </p>
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="surface-card rounded-[1.5rem] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-900/8 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200">
                      <Package className="size-5" />
                    </div>
                    <div>
                      <p className="eyebrow-label">Identite</p>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                        Fiche produit
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Nom du produit
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(event) =>
                          setFormData({ ...formData, name: event.target.value })
                        }
                        placeholder="Ex: Tomates cerises premium"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Catégorie
                      </Label>
                      <Select
                        value={formData.categoryId || "none"}
                        onValueChange={(value) => {
                          const selected = categories.find((category) => category.id === value);
                          setFormData({
                            ...formData,
                            categoryId: value ?? "none",
                            category: selected ? selected.name : "",
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{selectedCategoryLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sans catégorie spéciale</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Fournisseur
                      </Label>
                      <Select
                        value={formData.supplierId || "none"}
                        onValueChange={(value) =>
                          setFormData({ ...formData, supplierId: value ?? "none" })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{selectedSupplierLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun fournisseur</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label
                        htmlFor="description"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(event) =>
                          setFormData({ ...formData, description: event.target.value })
                        }
                        placeholder="Ajoute les détails utiles: variété, format, provenance, conditionnement..."
                        className="min-h-28"
                      />
                    </div>
                  </div>
                </section>

                <section className="surface-card rounded-[1.5rem] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200">
                      <Store className="size-5" />
                    </div>
                    <div>
                      <p className="eyebrow-label">Stock</p>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                        Disponibilite et seuils
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="stock" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Stock initial
                      </Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(event) =>
                          setFormData({ ...formData, stock: event.target.value })
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="lowStockThreshold"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Seuil d&apos;alerte
                      </Label>
                      <Input
                        id="lowStockThreshold"
                        type="number"
                        min="0"
                        value={formData.lowStockThreshold}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            lowStockThreshold: event.target.value,
                          })
                        }
                        placeholder="5"
                      />
                    </div>

                    <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70 md:col-span-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="weight-toggle"
                          checked={formData.canBeSoldByWeight}
                          onCheckedChange={(checked: boolean | "indeterminate") =>
                            setFormData({
                              ...formData,
                              canBeSoldByWeight: checked === true,
                            })
                          }
                          className="mt-0.5 size-5 rounded-md"
                        />
                        <div className="space-y-1">
                          <Label
                            htmlFor="weight-toggle"
                            className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-50"
                          >
                            Vente au poids
                          </Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Active un tarif au kilo pour les produits vendus à la balance.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="surface-card rounded-[1.5rem] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                      <Scale className="size-5" />
                    </div>
                    <div>
                      <p className="eyebrow-label">Tarification</p>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                        Prix et marges
                      </h3>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="costPrice"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Prix d&apos;achat
                      </Label>
                      <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        value={formData.costPrice}
                        onChange={(event) =>
                          setFormData({ ...formData, costPrice: event.target.value })
                        }
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="salePrice"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Prix de vente
                      </Label>
                      <Input
                        id="salePrice"
                        type="number"
                        step="0.01"
                        value={formData.salePrice}
                        onChange={(event) =>
                          setFormData({ ...formData, salePrice: event.target.value })
                        }
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {formData.canBeSoldByWeight ? (
                    <div className="mt-4 rounded-[1.35rem] border border-indigo-200/70 bg-indigo-50/70 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-200">
                          <Scale className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                            Tarification au kilo
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Définis les tarifs spécifiques pour la vente au poids.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="weightCostPrice"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            Prix d&apos;achat au kilo
                          </Label>
                          <Input
                            id="weightCostPrice"
                            type="number"
                            step="0.01"
                            value={formData.weightCostPrice}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                weightCostPrice: event.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="weightSalePrice"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            Prix de vente au kilo
                          </Label>
                          <Input
                            id="weightSalePrice"
                            type="number"
                            step="0.01"
                            value={formData.weightSalePrice}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                weightSalePrice: event.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200/70 dark:border-slate-800/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer le produit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
