"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Phone, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  _count: {
    products: number;
  };
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
      const res = await fetch("/api/suppliers", { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSuppliers(data);
      } else {
        console.error("Suppliers error:", data.error);
        setSuppliers([]);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: 'no-store'
      });
      if (res.ok) {
        setFormData({ name: "", contact: "" });
        setOpen(false);
        toast.success("Fournisseur ajouté !");
        fetchSuppliers();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erreur lors de l'ajout.");
      }
    } catch (error) {
      console.error("Error creating supplier", error);
      toast.error("Erreur lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
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
        cache: 'no-store'
      });
      if (res.ok) {
        setOpenEdit(false);
        toast.success("Fournisseur mis à jour !");
        fetchSuppliers();
      }
    } catch (error) {
      console.error("Error updating supplier", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
        method: "DELETE",
        cache: 'no-store'
      });
      if (res.ok) {
        setOpenDelete(false);
        toast.success("Fournisseur supprimé !");
        fetchSuppliers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression.");
      }
    } catch (error) {
      console.error("Error deleting supplier", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({ name: supplier.name, contact: supplier.contact || "" });
    setOpenEdit(true);
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Fournisseurs</h2>
          <p className="text-slate-500">Gérez la liste de vos fournisseurs et leurs contacts.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={(props) => (
            <Button className="bg-indigo-600 hover:bg-indigo-700" {...props}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Fournisseur
            </Button>
          )} />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ajouter un fournisseur</DialogTitle>
              <DialogDescription>
                Créez un nouveau fournisseur pour y associer des produits.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Nom *</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="col-span-3" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact" className="text-right">Contact</Label>
                  <Input 
                    id="contact" 
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    placeholder="Téléphone, email..."
                    className="col-span-3" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Nom du Fournisseur</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-center">Nb Produits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                  Aucun fournisseur enregistré.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4 text-slate-400" />
                      {supplier.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.contact ? (
                       <div className="flex items-center text-slate-500">
                         <Phone className="mr-2 h-3 w-3" />
                         {supplier.contact}
                       </div>
                    ) : (
                      <span className="text-slate-400 italic text-sm">Non renseigné</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                      {supplier._count.products}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(supplier)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 w-8 p-0"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setOpenDelete(true);
                        }}
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
      {/* Modal Édition */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le fournisseur</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de contact du fournisseur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nom *</Label>
                <Input 
                  id="edit-name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3 border-slate-200" 
                  required 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-contact" className="text-right">Contact</Label>
                <Input 
                  id="edit-contact" 
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  placeholder="Téléphone, email..."
                  className="col-span-3 border-slate-200" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                {submitting ? "Mise à jour..." : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Suppression */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Supprimer le fournisseur ?</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Voulez-vous supprimer **{selectedSupplier?.name}** ? <br/>
              Cela supprimera également tous les produits qui lui sont liés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center mt-4">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
