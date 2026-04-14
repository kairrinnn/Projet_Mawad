"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Phone, Pencil, Trash2, AlertCircle, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  _count: { products: number };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: "", contact: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers", { cache: "no-store" });
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      });
      if (res.ok) {
        setFormData({ name: "", contact: "" });
        setOpen(false);
        toast.success("Fournisseur ajouté !");
        fetchSuppliers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'ajout.");
      }
    } catch { toast.error("Erreur lors de l'ajout."); }
    finally { setSubmitting(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      });
      if (res.ok) { setOpenEdit(false); toast.success("Fournisseur mis à jour !"); fetchSuppliers(); }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, { method: "DELETE", cache: "no-store" });
      if (res.ok) { setOpenDelete(false); toast.success("Fournisseur supprimé !"); fetchSuppliers(); }
      else { const d = await res.json(); toast.error(d.error || "Erreur suppression."); }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({ name: supplier.name, contact: supplier.contact || "" });
    setOpenEdit(true);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", boxShadow: "0 4px 16px rgba(79,70,229,0.25)" }}
          >
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fournisseurs</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? "Chargement…" : `${suppliers.length} fournisseur${suppliers.length > 1 ? "s" : ""} enregistré${suppliers.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormData({ name: "", contact: "" }); }}>
          <DialogTrigger render={(props) => (
            <Button
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0 shadow-sm gap-2"
              {...props}
            >
              <Plus className="h-4 w-4" /> Nouveau Fournisseur
            </Button>
          )} />
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Ajouter un fournisseur</DialogTitle>
              <DialogDescription>Créez un fournisseur pour y associer des produits.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nom du fournisseur" required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact</Label>
                <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="Téléphone, email…" className="rounded-xl" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</> : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-border/50 shadow-card overflow-hidden">

        {/* Header row */}
        <div className="grid grid-cols-[1fr_1fr_80px_80px] px-5 py-3 border-b border-slate-100 bg-slate-50/60">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fournisseur</span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contact</span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">Produits</span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</span>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_80px_80px] px-5 py-4 items-center">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 mx-auto rounded-full" />
                <Skeleton className="h-7 w-16 ml-auto rounded-lg" />
              </div>
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Building2 className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun fournisseur enregistré</p>
            <p className="text-xs mt-1">Cliquez sur &laquo; Nouveau Fournisseur &raquo; pour commencer.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="group grid grid-cols-[1fr_1fr_80px_80px] px-5 py-3.5 items-center hover:bg-slate-50/60 transition-colors">

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 flex-shrink-0">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{supplier.name}</span>
                </div>

                <div>
                  {supplier.contact ? (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {supplier.contact}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 italic">Non renseigné</span>
                  )}
                </div>

                <div className="flex justify-center">
                  <span className={cn(
                    "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full text-[11px] font-bold",
                    supplier._count.products > 0
                      ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                      : "bg-slate-100 text-slate-400"
                  )}>
                    {supplier._count.products}
                  </span>
                </div>

                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => openEditModal(supplier)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setSelectedSupplier(supplier); setOpenDelete(true); }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && suppliers.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40">
            <p className="text-[11px] text-slate-400">
              {suppliers.length} fournisseur{suppliers.length > 1 ? "s" : ""} · {suppliers.reduce((a, s) => a + s._count.products, 0)} produit{suppliers.reduce((a, s) => a + s._count.products, 0) > 1 ? "s" : ""} associé{suppliers.reduce((a, s) => a + s._count.products, 0) > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* ── Edit Dialog ───────────────────────────────────────── */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le fournisseur</DialogTitle>
            <DialogDescription>Mettez à jour les informations de contact.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="Téléphone, email…" className="rounded-xl" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Mise à jour…</> : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────── */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
            </div>
            <DialogTitle className="text-center">Supprimer le fournisseur ?</DialogTitle>
            <DialogDescription className="text-center">
              <span className="font-semibold text-slate-700">{selectedSupplier?.name}</span> sera supprimé ainsi que tous ses produits associés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)} className="flex-1 rounded-xl">Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 rounded-xl"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Suppression…</> : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
