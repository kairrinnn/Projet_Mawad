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
import { ShoppingCart, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: session } = useSession();

  useEffect(() => {
    const fetchSales = async () => {
      try {
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
    fetchSales();
  }, []);

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
                <TableHead className="text-right">Prix Unitaire</TableHead>
                <TableHead className="text-right">Réduction</TableHead>
                {session?.user?.role === "MANAGER" && (
                  <TableHead className="text-right font-semibold">Bénéfice Net</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={session?.user?.role === "MANAGER" ? 6 : 5} className="text-center py-10 text-slate-500">
                    Chargement de l'historique...
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={session?.user?.role === "MANAGER" ? 6 : 5} className="text-center py-10">
                    <span className="text-slate-500">Aucune vente enregistrée pour le moment.</span>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-slate-50/50">
                    <TableCell>
                       <div className="flex items-center text-slate-600">
                           <CalendarDays className="h-3 w-3 mr-2" />
                           {format(new Date(sale.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                       </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                       {sale.product?.name || "Produit Inconnu"}
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge variant="outline" className="font-medium bg-slate-100 border-slate-200">
                           {sale.quantity}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                       {formatCurrency(sale.salePrice)}
                    </TableCell>
                    <TableCell className="text-right">
                       <span className={sale.discount > 0 ? "text-amber-600 font-medium" : "text-slate-300"}>
                           {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : "-"}
                       </span>
                    </TableCell>
                    {session?.user?.role === "MANAGER" && (
                      <TableCell className={`text-right font-bold ${sale.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(sale.profit)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
