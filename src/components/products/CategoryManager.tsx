"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
}

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onAddCategory: (name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  submitting: boolean;
}

export function CategoryManager({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onDeleteCategory,
  submitting
}: CategoryManagerProps) {
  const [newCatName, setNewCatName] = useState("");

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    await onAddCategory(newCatName);
    setNewCatName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer les catégories</DialogTitle>
          <DialogDescription>
            Ajoutez ou supprimez des catégories pour classer vos produits.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Nom de la catégorie" 
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={submitting}>Ajouter</Button>
          </div>
          <div className="border rounded-md max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="p-4 text-center text-slate-400 text-sm">Aucune catégorie</p>
            ) : (
              <div className="divide-y">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteCategory(cat.id)}
                      disabled={submitting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
