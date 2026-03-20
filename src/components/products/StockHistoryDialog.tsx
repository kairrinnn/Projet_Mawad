"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StockMovement {
  id: string;
  createdAt: string;
  type: string;
  quantity: number;
  oldStock: number;
  newStock: number;
  reason: string | null;
}

interface StockHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  history: StockMovement[];
}

export function StockHistoryDialog({
  open,
  onOpenChange,
  productName,
  history
}: StockHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historique du stock : {productName || "Produit"}</DialogTitle>
          <DialogDescription>
            Mouvements récents de l'inventaire pour ce produit.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Ancien</TableHead>
                <TableHead>Nouveau</TableHead>
                <TableHead>Motif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    Aucun historique disponible.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase ${
                          m.type === "IN"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : m.type === "OUT"
                            ? "bg-orange-50 text-orange-600 border-orange-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.quantity}</TableCell>
                    <TableCell className="text-slate-400">{m.oldStock}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{m.newStock}</TableCell>
                    <TableCell
                      className="text-xs text-slate-500 max-w-[150px] truncate"
                      title={m.reason || ""}
                    >
                      {m.reason}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
