"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2, ShoppingCart, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SaleRow {
  id: string;
  createdAt: string;
  quantity: number;
  discount: number;
  totalPrice: number;
  salePrice: number;
  isRefunded: boolean;
  type: "SALE" | "REFUND";
  product?: {
    name?: string;
  } | null;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sales", { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSales(data);
      } else {
        console.error("Sales error:", data.error);
        setSales([]);
      }
    } catch (error) {
      console.error("Failed to fetch sales", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleRefund = async (id: string) => {
    if (!confirm("Voulez-vous vraiment rembourser cet achat ?")) return;
    
    setRefundingId(id);
    try {
      const res = await fetch(`/api/sales/${id}/refund`, { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Achat remboursé avec succès");
        fetchSales();
      } else {
        toast.error(data.error || "Erreur lors du remboursement");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setRefundingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(val);
  };

  const filteredSales = (Array.isArray(sales) ? sales : []).filter(s => {
      const prodName = s.product?.name?.toLowerCase() || "";
      return prodName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Historique des Ventes</h2>
          <p className="text-slate-500">Consultez et filtrez les enregistrements de toutes vos ventes.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
         <Input 
            placeholder="Rechercher par produit..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm bg-white shadow-sm"
         />
      </div>

      <Card className="border-none shadow-sm shadow-slate-200">
        <CardHeader className="bg-slate-50 border-b border-slate-100/60 pb-3">
          <CardTitle className="flex items-center text-sm text-slate-500 font-medium">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Toutes les transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-center">Quantité</TableHead>
                <TableHead className="text-right">Réduction</TableHead>
                <TableHead className="text-right font-semibold">Net à Payer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    Chargement de l&apos;historique...
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <span className="text-slate-500">Aucune vente enregistrée pour le moment.</span>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => {
                  const isRefunded = sale.isRefunded;
                  const isRefundOperation = sale.type === "REFUND";

                  return (
                    <TableRow 
                      key={sale.id} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        isRefunded && "bg-slate-50/40 opacity-60 grayscale-[0.5]",
                        isRefundOperation && "bg-amber-50/40 hover:bg-amber-50/60"
                      )}
                    >
                      <TableCell>
                         <div className="flex items-center text-slate-600">
                             <CalendarDays className="h-3 w-3 mr-2" />
                             {format(new Date(sale.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                         </div>
                      </TableCell>
                      <TableCell className={cn(
                        "font-medium",
                        isRefunded ? "text-slate-400 line-through" : "text-slate-900",
                        isRefundOperation && "text-amber-700"
                      )}>
                         <div className="flex items-center gap-2">
                           {sale.product?.name || "Produit Inconnu"}
                           {isRefundOperation && (
                             <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px] py-0 h-4">
                               RETOUR
                             </Badge>
                           )}
                           {isRefunded && (
                             <Badge variant="outline" className="text-slate-400 text-[10px] py-0 h-4 border-slate-200">
                               REMBOURSÉ
                             </Badge>
                           )}
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge 
                           variant="outline" 
                           className={cn(
                             "font-medium border-slate-200",
                             isRefundOperation ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                           )}
                         >
                             {sale.quantity > 0 ? `+${sale.quantity}` : sale.quantity}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <span className={sale.discount > 0 ? "text-amber-600 font-medium" : "text-slate-300"}>
                             {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : "-"}
                         </span>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold",
                        isRefundOperation ? "text-amber-700" : "text-slate-900",
                        isRefunded && "text-slate-400"
                      )}>
                         {formatCurrency(sale.totalPrice || (sale.salePrice * sale.quantity) - sale.discount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {sale.type !== "REFUND" && !sale.isRefunded && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1"
                            onClick={() => handleRefund(sale.id)}
                            disabled={refundingId === sale.id}
                          >
                            {refundingId === sale.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">Rembourser</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
