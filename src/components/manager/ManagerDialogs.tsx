"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ManagerDialogsProps {
  isWithdrawalOpen: boolean;
  setIsWithdrawalOpen: (o: boolean) => void;
  withdrawalForm: { amount: string; description: string; code: string };
  setWithdrawalForm: (f: { amount: string; description: string; code: string }) => void;
  handleManagerWithdrawal: (e: React.FormEvent) => void;
  
  isExpDialogOpen: boolean;
  setIsExpDialogOpen: (o: boolean) => void;
  quickExpForm: { amount: string; description: string };
  setQuickExpForm: (f: { amount: string; description: string }) => void;
  handleQuickExpense: (e: React.FormEvent) => void;
  
  addExpOpen: boolean;
  setAddExpOpen: (o: boolean) => void;
  expForm: { type: string; amount: string; description: string; date: string; paidInCash: boolean };
  setExpForm: (f: { type: string; amount: string; description: string; date: string; paidInCash: boolean }) => void;
  EXPENSE_TYPES: { value: string; label: string }[];
  addExpense: (e: React.FormEvent) => void;
  
  editExpOpen: boolean;
  setEditExpOpen: (o: boolean) => void;
  editExp: { id: string; type: string | null; amount: string | number; description: string; date: string; paidInCash?: boolean } | null;
  setEditExp: (f: { id: string; type: string | null; amount: string | number; description: string; date: string; paidInCash?: boolean } | null) => void;
  updateExpense: (e: React.FormEvent) => void;
  
  delConfirmOpen: boolean;
  setDelConfirmOpen: (o: boolean) => void;
  delTarget: { label: string } | null;
  confirmDelete: () => void;
  
  submitting: boolean;
}

export function ManagerDialogs({
  isWithdrawalOpen, setIsWithdrawalOpen, withdrawalForm, setWithdrawalForm, handleManagerWithdrawal,
  isExpDialogOpen, setIsExpDialogOpen, quickExpForm, setQuickExpForm, handleQuickExpense,
  addExpOpen, setAddExpOpen, expForm, setExpForm, EXPENSE_TYPES, addExpense,
  editExpOpen, setEditExpOpen, editExp, setEditExp, updateExpense,
  delConfirmOpen, setDelConfirmOpen, delTarget, confirmDelete,
  submitting
}: ManagerDialogsProps) {
  return (
    <>
      {/* Retrait Gérant */}
      <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retrait Gérant (Caisse)</DialogTitle>
            <DialogDescription>Retirer des espèces sans affecter les bénéfices du magasin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleManagerWithdrawal} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Montant à retirer (DH)</Label>
              <Input type="number" required value={withdrawalForm.amount} onChange={(e) => setWithdrawalForm({...withdrawalForm, amount: e.target.value})} placeholder="0.00" className="text-xl font-bold" />
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Input value={withdrawalForm.description} onChange={(e) => setWithdrawalForm({...withdrawalForm, description: e.target.value})} placeholder="Ex: Retrait personnel..." />
            </div>
            <div className="space-y-2">
              <Label>Code Manager</Label>
              <Input type="password" required value={withdrawalForm.code} onChange={(e) => setWithdrawalForm({...withdrawalForm, code: e.target.value})} placeholder="****" />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-slate-900" disabled={submitting}>Confirmer le retrait</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dépense Caisse Rapide */}
      <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dépense Caisse (Quotidienne)</DialogTitle>
            <DialogDescription>Enregistrer un petit achat payé par la caisse.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickExpense} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Montant (DH)</Label>
              <Input type="number" required value={quickExpForm.amount} onChange={(e) => setQuickExpForm({...quickExpForm, amount: e.target.value})} placeholder="0.00" className="text-xl font-bold" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={quickExpForm.description} onChange={(e) => setQuickExpForm({...quickExpForm, description: e.target.value})} placeholder="Ex: Pain, Café..." />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-slate-900 text-white" disabled={submitting}>Valider la dépense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nouvelle Dépense */}
      <Dialog open={addExpOpen} onOpenChange={setAddExpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle Dépense / Charge</DialogTitle>
            <DialogDescription>Remplissez les détails ci-dessous.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addExpense} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={expForm.type || "Daily"} onValueChange={(v) => setExpForm({ ...expForm, type: v as string })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {EXPENSE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Montant (DH)</Label>
                <Input type="number" required value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Désignation</Label>
              <Input required value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} placeholder="Ex: Facture REDAL Mars" />
            </div>
            <div className="space-y-1.5">
              <Label>Date de paiement</Label>
              <Input type="date" value={expForm.date} onChange={(e) => setExpForm({ ...expForm, date: e.target.value })} />
            </div>
            {expForm.type !== "Daily" && expForm.type !== "Withdrawal" && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <Checkbox
                  id="paidInCash-add"
                  checked={expForm.paidInCash}
                  onCheckedChange={(checked: boolean | "indeterminate") => setExpForm({ ...expForm, paidInCash: checked === true })}
                />
                <Label htmlFor="paidInCash-add" className="cursor-pointer text-sm font-normal text-slate-700">
                  Payé en espèces (déduit de la caisse)
                </Label>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modifier Dépense */}
      <Dialog open={editExpOpen} onOpenChange={setEditExpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Dépense</DialogTitle>
          </DialogHeader>
          {editExp && (
            <form onSubmit={updateExpense} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editExp?.type || ""} onValueChange={(v) => setEditExp(editExp ? { ...editExp, type: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {EXPENSE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Montant (DH)</Label>
                  <Input type="number" required value={editExp.amount || ""} onChange={(e) => setEditExp({ ...editExp, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input required value={editExp.description || ""} onChange={(e) => setEditExp({ ...editExp, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={editExp.date ? new Date(editExp.date).toISOString().split("T")[0] : ""} onChange={(e) => setEditExp({ ...editExp, date: e.target.value })} />
              </div>
              {editExp.type !== "Daily" && editExp.type !== "Withdrawal" && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Checkbox
                    id="paidInCash-edit"
                    checked={editExp.paidInCash ?? false}
                    onCheckedChange={(checked: boolean | "indeterminate") => setEditExp({ ...editExp, paidInCash: checked === true })}
                  />
                  <Label htmlFor="paidInCash-edit" className="cursor-pointer text-sm font-normal text-slate-700">
                    Payé en espèces (déduit de la caisse)
                  </Label>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
                  {submitting ? "Mise à jour…" : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Supprimer Confirmation */}
      <Dialog open={delConfirmOpen} onOpenChange={setDelConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer <strong>{delTarget?.label}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelConfirmOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
