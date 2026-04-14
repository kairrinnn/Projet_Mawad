"use client";

import React, { useRef } from "react";
import NextImage from "next/image";
import { Camera, Barcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  fileInputRef
}: ProductFormDialogProps) {
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const actualRef = fileInputRef || localFileInputRef;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right text-slate-600">Nom *</Label>
              <div className="col-span-3 flex gap-2">
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="flex-1 border-slate-200" 
                  required 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onStartScanner}
                  className="shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  title="Scanner un code-barres"
                >
                  <Barcode className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-slate-600">Photo</Label>
              <div className="col-span-3 flex items-center gap-4">
                <div 
                  className="relative h-24 w-24 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => actualRef.current?.click()}
                >
                  {preview ? (
                    <>
                      <NextImage src={preview} alt="Aperçu" fill className="object-cover" />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreview(null);
                          setFormData({ ...formData, image: "" });
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      {uploading ? (
                        <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                      ) : (
                        <>
                          <Camera className="h-6 w-6 mb-1" />
                          <span className="text-[10px]">Photo / Cam</span>
                        </>
                      )}
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
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="barcode" className="text-right text-slate-600">Code-Barre</Label>
              <Input 
                id="barcode" 
                value={formData.barcode}
                onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                placeholder="EAN-13, UPC..."
                className="col-span-3 border-slate-200" 
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right text-slate-600">Catégorie</Label>
              <div className="col-span-3">
                <Select 
                  value={formData.categoryId || "none"} 
                  onValueChange={(value) => {
                    const val = value ?? "none";
                    const selected = categories.find(c => c.id === val);
                    setFormData({
                      ...formData, 
                      categoryId: val, 
                      category: selected ? selected.name : ""
                    });
                  }}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sans catégorie spéciale</SelectItem>
                    {categories.map(cat => (
                       <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right text-slate-600">Stock</Label>
              <Input 
                id="stock" 
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                className="col-span-3 border-slate-200" 
                min="0"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lowStockThreshold" className="text-right text-slate-600">Seuil d&apos;alerte</Label>
              <Input 
                id="lowStockThreshold" 
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})}
                className="col-span-3 border-slate-200" 
              />
            </div>
            
            <div className="grid gap-4 grid-cols-2 mt-2 border-t border-slate-100 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-slate-600">Prix d&apos;Achat (DH) *</Label>
                  <Input 
                    id="costPrice" 
                    type="number" 
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                    className="border-slate-200"
                    required 
                  />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="salePrice" className="text-slate-600">Prix de Vente (DH) *</Label>
                  <Input 
                    id="salePrice" 
                    type="number" 
                    step="0.01"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                    className="border-slate-200"
                    required 
                  />
                </div>
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-2">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="weight-toggle" className="text-slate-600 font-bold">Vente au kilo possible ?</Label>
                <input 
                  type="checkbox" 
                  id="weight-toggle"
                  checked={formData.canBeSoldByWeight}
                  onChange={(e) => setFormData({...formData, canBeSoldByWeight: e.target.checked})}
                  className="h-5 w-5 accent-indigo-600 cursor-pointer"
                />
              </div>

              {formData.canBeSoldByWeight && (
                <div className="grid gap-4 grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <Label htmlFor="weightCostPrice" className="text-slate-600">Prix Achat Kilo (DH)</Label>
                    <Input 
                      id="weightCostPrice" 
                      type="number" 
                      step="0.01"
                      value={formData.weightCostPrice}
                      onChange={(e) => setFormData({...formData, weightCostPrice: e.target.value})}
                      className="border-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightSalePrice" className="text-slate-600">Prix Vente Kilo (DH)</Label>
                    <Input 
                      id="weightSalePrice" 
                      type="number" 
                      step="0.01"
                      value={formData.weightSalePrice}
                      onChange={(e) => setFormData({...formData, weightSalePrice: e.target.value})}
                      className="border-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 items-center gap-4 mt-2">
              <Label htmlFor="supplier" className="text-right text-slate-600">Fournisseur</Label>
              <div className="col-span-3">
                <Select 
                  value={formData.supplierId || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, supplierId: value ?? "none" })}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fournisseur (Interne)</SelectItem>
                    {suppliers.map(sup => (
                       <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {submitting ? "Traitement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
