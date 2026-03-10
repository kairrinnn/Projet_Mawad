"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { ShoppingCart, CheckCircle2, ScanLine, Tag, Search, Box, RefreshCw, Upload, PackageSearch, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export default function ScanPage() {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [openSale, setOpenSale] = useState(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sale details
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isInitializingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startScanner = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      // Nettoyage de l'instance existante
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch (e) {
          console.warn("Erreur lors du nettoyage préliminaire:", e);
        }
      }

      // Nettoyage forcé du DOM
      const container = document.getElementById("qr-reader");
      if (container) container.innerHTML = "";

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = { 
        fps: 20, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText: string) => {
          setScannedId(decodedText);
          fetchProductDetails(decodedText);
          html5QrCode.stop().catch(() => {});
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Erreur scanner:", err);
    } finally {
      isInitializingRef.current = false;
    }
  };

  const fetchAllProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setAllProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      setScannedId(decodedText);
      fetchProductDetails(decodedText);
    } catch (err) {
      toast.error("Aucun code QR détecté sur l'image.");
    }
  };

  useEffect(() => {
    let currentScanner: Html5Qrcode | null = null;

    const init = async () => {
      await startScanner();
      currentScanner = html5QrCodeRef.current;
    };

    init();
    fetchAllProducts();

    return () => {
      if (currentScanner) {
        if (currentScanner.isScanning) {
          currentScanner.stop().then(() => {
            currentScanner?.clear();
          }).catch(err => console.error("Error stopping scanner on unmount", err));
        } else {
          currentScanner.clear();
        }
      }
    };
  }, []);

  const fetchProductDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        toast.error("Produit introuvable.");
        resumeScanner();
        return;
      }
      const data = await res.json();
      setProduct(data);
      setQuantity(1);
      setDiscount(0);
      setOpenSale(true);
      toast.success("Produit détecté !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur de connexion.");
      resumeScanner();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (prod: any) => {
      setProduct(prod);
      setQuantity(1);
      setDiscount(0);
      setOpenSale(true);
      // Optionnel: arrêter le scanner si actif
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
      }
  };

  const resumeScanner = async () => {
      setProduct(null);
      setScannedId(null);
      if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
          startScanner();
      }
  };

  const handleConfirmSale = async () => {
    if (!product) return;
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
        toast.success(`Vente enregistrée !`);
        setOpenSale(false);
        resumeScanner();
        // Rafraîchir les produits pour le stock
        fetchAllProducts();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erreur lors de la vente.");
      }
    } catch (error) {
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

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 10); // Limiter pour l'UX mobile

  const topProducts = allProducts
    .sort((a, b) => (b.sales?.length || 0) - (a.sales?.length || 0))
    .slice(0, 5);

  const total = product ? (product.salePrice * quantity) - discount : 0;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Scanner & Vente</h2>
          <p className="text-slate-500">Scannez ou recherchez un produit pour vendre.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Colonne Scanner */}
        <Card className="shadow-sm border-slate-200 overflow-hidden lg:col-span-5 self-start">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
             <div className="flex items-center text-indigo-900 font-semibold">
                <ScanLine className="mr-2 h-5 w-5" />
                Scanner de produits
             </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center">
            <div className="w-full bg-black relative flex items-center justify-center min-h-[250px] sm:min-h-[300px]">
                <div id="qr-reader" className="w-full max-w-sm aspect-square" />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                    <div className="w-[180px] h-[180px] border-2 border-dashed border-white/50 rounded-lg relative">
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-indigo-400" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-indigo-400" />
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-indigo-400" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-indigo-400" />
                    </div>
                </div>
            </div>

            <div className="flex w-full border-t border-slate-100">
                <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none h-12 text-slate-600 hover:text-indigo-600 border-r border-slate-100 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="h-4 w-4 mr-2" /> Scanner photo
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileScan}
                />
                <Button 
                    variant="ghost" 
                    className="flex-1 rounded-none h-12 text-slate-600 hover:text-indigo-600 text-xs"
                    onClick={() => startScanner()}
                >
                    <RefreshCw className="h-4 w-4 mr-2" /> Redémarrer
                </Button>
            </div>
          </CardContent>
        </Card>

        {/* Colonne Recherche Directe */}
        <div className="lg:col-span-7 space-y-6">
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Chercher par nom de produit ou catégorie..." 
                            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                        {loadingProducts ? (
                            <div className="p-8 text-center text-slate-400">Chargement des produits...</div>
                        ) : filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                                <button 
                                    key={p.id}
                                    onClick={() => handleSelectProduct(p)}
                                    className="w-full p-3 sm:p-4 flex items-center gap-2 sm:gap-4 hover:bg-slate-50 transition-colors text-left"
                                >
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded bg-slate-100 border flex-shrink-0 overflow-hidden">
                                        {p.image ? (
                                            <img src={p.image} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                <PackageSearch className="h-5 w-5 text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 truncate text-sm sm:text-base">{p.name}</h4>
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                                            <Badge variant="outline" className="text-[9px] sm:text-[10px] h-3.5 sm:h-4 font-normal py-0">{p.category || 'Général'}</Badge>
                                            <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{formatCurrency(p.salePrice)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 sm:gap-1 pl-2">
                                        <span className={`text-[10px] sm:text-xs font-bold leading-none ${p.stock <= 5 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            Stock {p.stock}
                                        </span>
                                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-slate-300" />
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <PackageSearch className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                Aucun produit trouvé pour "{searchQuery}"
                            </div>
                        )}
                    </div>
                </CardContent>
                {searchQuery === "" && allProducts.length > 0 && (
                    <CardFooter className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col items-start gap-3">
                        <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <TrendingUp className="h-3 w-3 mr-1" /> Top Ventes
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {topProducts.map(p => (
                                <Badge 
                                    key={p.id} 
                                    variant="secondary" 
                                    className="cursor-pointer hover:bg-indigo-100 transition-colors py-1 px-3"
                                    onClick={() => handleSelectProduct(p)}
                                >
                                    {p.name}
                                </Badge>
                            ))}
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
      </div>

      <Dialog open={openSale} onOpenChange={setOpenSale}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl font-bold">
                <ShoppingCart className="mr-2 h-6 w-6 text-indigo-600" />
                Vendre ce produit
            </DialogTitle>
          </DialogHeader>
          
          {product && (
            <div className="space-y-6 pt-4">
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-center sm:text-left flex items-center gap-4">
                    <div className="h-16 w-16 rounded-lg overflow-hidden border bg-white flex-shrink-0">
                        {product.image ? (
                            <img src={product.image} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center">
                                <PackageSearch className="h-6 w-6 text-slate-200" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-xl text-indigo-900">{product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="bg-white border-indigo-100">Stock: {product.stock}</Badge>
                            <span className="text-sm font-bold text-indigo-600">{formatCurrency(product.salePrice)}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Quantité</Label>
                        <Input type="number" min="1" max={product.stock} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Réduction (DH)</Label>
                        <Input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                    </div>
                </div>

                <div className="flex justify-between items-center text-xl font-bold border-t pt-4">
                    <span>Total</span>
                    <span className="text-indigo-600">{formatCurrency(total)}</span>
                </div>
            </div>
          )}
          
          <DialogFooter className="mt-6 flex sm:justify-between items-center gap-2">
            <Button variant="ghost" onClick={() => setOpenSale(false)}>Annuler</Button>
            <Button onClick={handleConfirmSale} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8">
              {submitting ? "Validation..." : "Valider la vente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
