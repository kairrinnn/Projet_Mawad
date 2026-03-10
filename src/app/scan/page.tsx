"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ShoppingCart, CheckCircle2, ScanLine, XCircle, Tag, Search, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export default function ScanPage() {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openSale, setOpenSale] = useState(false);
  
  // Sale details
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Manual search
  const [manualId, setManualId] = useState("");

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialiser le scanner QR
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      /* verbose= */ false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Succès de lecture
        if (scannedId !== decodedText) {
          setScannedId(decodedText);
          fetchProductDetails(decodedText);
          
          try {
            // @ts-ignore - Check if scanning via camera before pausing
            if (scanner.getState() === 2) { 
              scanner.pause(true);
            }
          } catch (e) {
            // Ignorer si le scanner n'est pas en mode live (cas du scan de fichier)
          }
        }
      },
      (error) => {
        // Échec de lecture (ignoré car récurrent jusqu'à succès)
      }
    );

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
      });
    };
  }, []);

  const fetchProductDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        toast.error("Produit introuvable dans la base de données.");
        resumeScanner();
        return;
      }
      const data = await res.json();
      
      if (data.stock <= 0) {
          toast.warning(`Le produit ${data.name} est en rupture de stock !`);
      }

      setProduct(data);
      setQuantity(1);
      setDiscount(0);
      setOpenSale(true);
      toast.success("Produit détecté !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la récupération du produit.");
      resumeScanner();
    } finally {
      setLoading(false);
      setScannedId(null); // Reset pour scanner à nouveau le même produit ensuite
    }
  };

  const resumeScanner = () => {
      if (scannerRef.current) {
          // Utiliser un try-catch et vérifier l'état si possible
          try {
              // @ts-ignore - html5-qrcode internal state check
              if (scannerRef.current.getState?.() === 3) { // 3 = PAUSED
                scannerRef.current.resume();
              } else if (scannerRef.current.resume) {
                // Fallback si getState n'est pas dispo
                scannerRef.current.resume();
              }
          } catch (e) {
              // Ignorer si déjà en cours
          }
      }
      setProduct(null);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      fetchProductDetails(manualId.trim());
    }
  };

  const handleValidationClose = (open: boolean) => {
      setOpenSale(open);
      if (!open) {
          resumeScanner();
      }
  };

  const handleConfirmSale = async () => {
    if (!product) return;
    
    if (quantity > product.stock) {
        toast.error(`Stock insuffisant. Il ne reste que ${product.stock} unité(s).`);
        return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: Number(quantity),
          discount: Number(discount)
        }),
      });

      if (res.ok) {
        toast.success(`Vente enregistrée : ${quantity}x ${product.name}`);
        setOpenSale(false);
        // On laisse handleValidationClose gérer le resume via l'event onOpenChange
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erreur lors de l'enregistrement de la vente.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur système.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'MAD' 
    }).format(val);
  };

  const total = product ? (product.salePrice * quantity) - discount : 0;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Scanner & Vente</h2>
          <p className="text-slate-500">Scannez un code QR pour enregistrer rapidement une vente.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
            <CardTitle className="flex items-center text-indigo-900">
              <ScanLine className="mr-2 h-5 w-5" />
              Scanner de Code QR
            </CardTitle>
            <CardDescription>Placez le code QR dans le cadre pour la détection automatique.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex justify-center">
            {/* Le container pour la librairie html5-qrcode */}
            <div id="qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden border-2 border-dashed border-indigo-200" />
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-4">
            <form onSubmit={handleManualSearch} className="flex w-full space-x-2">
              <Input 
                placeholder="Ou saisissez l'ID manuellement..." 
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="flex-1 bg-white"
              />
              <Button type="submit" variant="secondary" disabled={loading}>
                {loading ? <span className="animate-pulse">...</span> : <Search className="h-4 w-4" />}
              </Button>
            </form>
          </CardFooter>
        </Card>

        {/* Partie Instructions / Statut */}
        <Card className="shadow-sm border-slate-200 flex flex-col justify-center items-center p-8 bg-gradient-to-br from-indigo-50 to-white text-center">
             <div className="rounded-full bg-white p-4 shadow-sm mb-6 border border-indigo-100">
                 <ShoppingCart className="h-10 w-10 text-indigo-400" />
             </div>
             <h3 className="text-xl font-semibold text-slate-800 mb-2">Prêt à scanner</h3>
             <p className="text-slate-500 max-w-sm text-sm">
                 Dès qu'un produit est détecté, une fenêtre de confirmation s'affichera pour valider la quantité et finaliser la vente. Le stock sera automatiquement mis à jour.
             </p>
             
             <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs text-left">
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                    <div className="flex items-center text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Rapide
                    </div>
                    <span className="text-sm text-slate-600 leading-tight block">Vente flash en 2 clics</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                    <div className="flex items-center text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
                        <Box className="h-3 w-3 mr-1" /> Stock
                    </div>
                    <span className="text-sm text-slate-600 leading-tight block">Déduction automatique</span>
                </div>
             </div>
        </Card>
      </div>

      {/* Modal Confirmation de Vente */}
      <Dialog open={openSale} onOpenChange={handleValidationClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl">
                <ShoppingCart className="mr-2 h-6 w-6 text-indigo-600" />
                Détails de la vente
            </DialogTitle>
          </DialogHeader>
          
          {product && (
            <div className="space-y-6 py-2">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-start">
                    <div>
                        <h4 className="font-semibold text-lg text-slate-900">{product.name}</h4>
                        <div className="flex items-center mt-1 space-x-2">
                            <Badge variant="secondary" className="font-normal text-xs">{product.category || 'Standard'}</Badge>
                            <span className="text-xs text-slate-500">ID: {product.id.substring(0,8)}...</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-slate-900">{formatCurrency(product.salePrice)}</div>
                        <div className={`text-xs mt-1 ${product.stock <= 5 ? 'text-red-500 font-semibold' : 'text-emerald-500'}`}>
                            En stock : {product.stock}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-slate-600">Quantité</Label>
                        <Input 
                            id="quantity" 
                            type="number" 
                            min="1" 
                            max={product.stock}
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                            className="text-lg font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="discount" className="text-slate-600 flex items-center">
                            <Tag className="h-3 w-3 mr-1" /> Réduction totale (DH)
                        </Label>
                        <Input 
                            id="discount" 
                            type="number" 
                            min="0" 
                            step="1"
                            value={discount}
                            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        />
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-end">
                    <span className="text-slate-500">Total à payer</span>
                    <span className="text-3xl font-bold text-indigo-600">
                        {formatCurrency(total)}
                    </span>
                </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-between items-center gap-2 mt-4">
            <Button variant="ghost" onClick={() => handleValidationClose(false)} className="text-slate-500">
                Annuler
            </Button>
            <Button 
                onClick={handleConfirmSale} 
                disabled={submitting || !product || product.stock < quantity} 
                className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            >
              {submitting ? "Validation..." : "Encaisser & Valider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
