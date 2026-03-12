"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Trash2, Plus, Minus, ShoppingCart, CheckCircle2, ScanLine, Tag, 
  Search, Box, RefreshCw, Upload, PackageSearch, ChevronRight, 
  TrendingUp, AlertTriangle, Loader2, Printer, DollarSign 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMobile } from "@/lib/hooks/use-mobile";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface CartItem {
  product: any;
  quantity: number;
  discount: number;
}

export default function ScanPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const isMobile = useMobile();
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [lastSale, setLastSale] = useState<{ items: CartItem[], total: number, cash: number, change: number } | null>(null);
  const [shopName, setShopName] = useState("Mawad Scan");

  // Quick Expense state
  const [quickExpForm, setQuickExpForm] = useState({ amount: "", description: "" });
  const [isExpDialogOpen, setIsExpDialogOpen] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isInitializingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllProducts();
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch (e) { console.warn(e); }
      }

      const container = document.getElementById("qr-reader");
      if (container) container.innerHTML = "";

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = { 
        fps: 20, 
        qrbox: { width: 260, height: 180 }
      };

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText: string) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Erreur scanner:", err);
      if (err?.toString().includes("NotAllowedError") || err?.toString().includes("Permission denied")) {
        setPermissionDenied(true);
      }
    } finally {
      isInitializingRef.current = false;
    }
  };

  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const handleScanSuccess = (decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 2000) {
      return;
    }
    
    lastScannedRef.current = decodedText;
    lastScanTimeRef.current = now;
    fetchProductDetails(decodedText);
  };

  const fetchAllProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        setAllProducts(await res.json());
      }
    } catch (e) { console.error(e); } finally { setLoadingProducts(false); }
  };

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Daily",
          amount: parseFloat(quickExpForm.amount),
          description: quickExpForm.description || "Petite dépense (Caisse)",
          date: new Date()
        })
      });
      if (res.ok) {
        toast.success("Dépense enregistrée");
        setQuickExpForm({ amount: "", description: "" });
        setIsExpDialogOpen(false);
      }
    } catch (e) { toast.error("Erreur"); } finally { setSubmitting(false); }
  };

  const fetchProductDetails = async (barcode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?barcode=${barcode}`);
      const data = await res.json();
      
      if (res.ok && data) {
        addToCart(data);
        toast.success(`${data.name} ajouté`);
      } else {
        toast.error("Produit non trouvé");
      }
    } catch (error) {
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      toast.error("Impossible de lire le code barre sur cette image");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, discount: Math.max(0, discount) } : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.salePrice * item.quantity) - item.discount, 0);
  };

  const finalizeOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        salePrice: item.product.salePrice,
        costPrice: item.product.costPrice,
        discount: item.discount
      }));

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });

      if (res.ok) {
        const total = calculateTotal();
        setLastSale({ 
          items: [...cart], 
          total, 
          cash: cashReceived, 
          change: Math.max(0, cashReceived - total) 
        });
        
        toast.success("Vente enregistrée !");
        setCart([]);
        setCashReceived(0);
        fetchAllProducts();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la validation");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(val || 0);
  };

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode?.includes(searchQuery)
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <div id="qr-reader-hidden" className="hidden" />
      
      {/* Ticket simple de dernière vente */}
      {lastSale && (
        <Card className="mb-6 border-indigo-100 bg-indigo-50/30 overflow-hidden print:block hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-center opacity-50">{shopName}</CardTitle>
            </CardHeader>
            <CardContent className="text-[10px] space-y-1">
                {lastSale.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                        <span>{item.quantity}x {item.product.name}</span>
                        <span>{formatCurrency((item.product.salePrice * item.quantity) - item.discount)}</span>
                    </div>
                ))}
                <div className="border-t border-dashed border-slate-300 pt-1 mt-1 font-bold flex justify-between">
                    <span>TOTAL</span>
                    <span>{formatCurrency(lastSale.total)}</span>
                </div>
            </CardContent>
        </Card>
      )}

      <div className="flex-1 space-y-4 sm:space-y-6 flex flex-col h-full">
        <div className="flex justify-between items-center px-1">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Scanner & POS</h2>
            <p className="hidden sm:block text-slate-500 text-sm">Vente rapide en session.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" />}>
                    <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Dépense Caisse</span>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sortie de Caisse</DialogTitle>
                        <DialogDescription>Enregistrez une dépense immédiate payée avec l'argent de la caisse.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleQuickExpense} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Montant (DH)</Label>
                            <Input 
                                type="number" 
                                required 
                                value={quickExpForm.amount} 
                                onChange={(e) => setQuickExpForm({...quickExpForm, amount: e.target.value})}
                                placeholder="0.00"
                                className="text-xl font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Motif / Description</Label>
                            <Input 
                                required 
                                value={quickExpForm.description} 
                                onChange={(e) => setQuickExpForm({...quickExpForm, description: e.target.value})}
                                placeholder="Ex: Achat pain, réparation..."
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={submitting}>
                                {submitting ? "Traitement..." : "Valider la dépense"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {cart.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCart([])} className="text-red-500 border-red-100 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Vider ({cart.length})</span>
                    <span className="sm:hidden">{cart.length}</span>
                </Button>
            )}
          </div>
        </div>

        {permissionDenied && (
          <Card className="bg-amber-50 border-amber-200 shadow-none">
            <CardContent className="p-4 text-sm text-amber-700 flex items-center justify-between">
              <div className="flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4 shrink-0" />
                  <span>Caméra bloquée. Utilisez le scanner photo ou HTTPS.</span>
              </div>
              <Button variant="ghost" size="sm" className="text-amber-800 p-0 h-auto underline" onClick={() => {setPermissionDenied(false); startScanner();}}>Réessayer</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">
          {/* Colonne Gauche: Scanner et Recherche */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
              <Card className="shadow-sm border-slate-200 overflow-hidden shrink-0">
                  <div className="bg-black relative flex items-center justify-center aspect-video sm:aspect-square overflow-hidden">
                      {permissionDenied ? (
                          <div className="flex flex-col items-center justify-center p-8 text-white/40 text-center">
                              <ScanLine className="h-10 w-10 opacity-20 mb-2" />
                              <p className="text-[10px] uppercase tracking-widest">Scanner Inactif</p>
                          </div>
                      ) : (
                          <>
                              <div id="qr-reader" className="w-full h-full [&_video]:object-cover [&_#qr-shaded-region]:!border-none [&_#qr-shaded-region_div]:!border-none flex items-center justify-center overflow-hidden" />
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                  <div className="relative w-[260px] h-[180px]">
                                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500" />
                                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500" />
                                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500" />
                                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500" />
                                      
                                      <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-indigo-500/30 animate-pulse" />
                                  </div>
                              </div>
                          </>
                      )}
                      {loading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                          </div>
                      )}
                  </div>
                  <div className="flex border-t border-slate-100">
                      <Button variant="ghost" className="flex-1 rounded-none h-10 text-[10px] sm:text-xs text-slate-500" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-3 w-3 mr-1.5" /> Photo
                      </Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileScan} />
                      <Button variant="ghost" className="flex-1 rounded-none h-10 text-[10px] sm:text-xs text-slate-500" onClick={() => startScanner()}>
                          <RefreshCw className="h-3 w-3 mr-1.5" /> Relancer
                      </Button>
                  </div>
              </Card>

              <Card className="shadow-sm border-slate-200 flex-1 flex flex-col min-h-[250px] overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input 
                              placeholder="Chercher un produit..." 
                              className="pl-8 h-9 text-xs bg-white"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                  </div>
                  <CardContent className="p-0 overflow-y-auto flex-1">
                      {loadingProducts ? (
                          <div className="p-4 flex flex-col items-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Chargement...</span>
                          </div>
                      ) : filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 italic text-[10px]">Aucun produit.</div>
                      ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-px bg-slate-100">
                              {filteredProducts.map(p => (
                                  <div key={p.id} className="bg-white p-3 flex items-center gap-3 hover:bg-indigo-50/50 transition-colors group cursor-pointer" onClick={() => addToCart(p)}>
                                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-indigo-100">
                                          {p.image ? (
                                              <img src={p.image} className="w-full h-full object-cover" alt="" />
                                          ) : (
                                              <Box className="h-5 w-5 text-slate-300" />
                                          )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight">{p.name}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                              <p className="text-indigo-600 font-extrabold text-xs">{formatCurrency(p.salePrice)}</p>
                                              <span className="text-[10px] font-medium text-slate-400">Stock: {p.stock}</span>
                                          </div>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white">
                                          <Plus className="h-4 w-4" />
                                      </Button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>

          {/* Colonne Droite: Panier */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
              <Card className="shadow-sm border-slate-200 flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="p-4 bg-slate-50/30 border-b border-slate-100 shrink-0">
                      <div className="flex justify-between items-center">
                          <CardTitle className="text-base sm:text-lg flex items-center">
                              <ShoppingCart className="h-4 w-4 mr-2 text-indigo-500" />
                              Panier en cours
                          </CardTitle>
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-none font-bold">
                              {cart.length} article{cart.length > 1 ? 's' : ''}
                          </Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-0 min-h-[300px]">
                      {cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-12 text-slate-300 text-center">
                              <PackageSearch className="h-12 w-12 mb-4 opacity-20" />
                              <p className="text-sm font-medium">Panier vide</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Scannez un code barre ou cherchez un produit</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-slate-100">
                              {cart.map((item) => (
                                  <div key={item.product.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 group hover:bg-slate-50/50 transition-colors">
                                      <div className="flex items-center gap-4 flex-1">
                                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                              {item.product.image ? (
                                                  <img src={item.product.image} className="w-full h-full object-cover rounded-lg" alt="" />
                                              ) : (
                                                  <Box className="h-5 w-5 text-slate-300" />
                                              )}
                                          </div>
                                          <div>
                                              <p className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{item.product.name}</p>
                                              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">{formatCurrency(item.product.salePrice)} / unité</p>
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-3 sm:gap-6">
                                          <div className="flex flex-col gap-1 items-center">
                                              <Label className="text-[9px] text-slate-400 uppercase font-bold">Quantité</Label>
                                              <div className="flex items-center h-8 sm:h-9 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                                                  <button onClick={() => updateQuantity(item.product.id, -1)} className="h-full px-3 hover:bg-slate-100 transition-colors text-slate-600 border-r border-slate-200">
                                                      <Minus className="h-3.5 w-3.5" />
                                                  </button>
                                                  <div className="px-4 font-black text-sm min-w-[3rem] text-center">
                                                      {item.quantity}
                                                  </div>
                                                  <button onClick={() => updateQuantity(item.product.id, 1)} className="h-full px-3 hover:bg-slate-100 transition-colors text-slate-600 border-l border-slate-200">
                                                      <Plus className="h-3.5 w-3.5" />
                                                  </button>
                                              </div>
                                          </div>

                                          <div className="flex flex-col gap-1 min-w-[70px] sm:min-w-[100px]">
                                              <Label className="text-[9px] text-slate-400 uppercase font-bold">Remise</Label>
                                              <Input 
                                                  type="number" 
                                                  value={item.discount} 
                                                  onChange={(e) => updateDiscount(item.product.id, Number(e.target.value))}
                                                  className="h-8 sm:h-9 text-xs font-bold focus-visible:ring-indigo-500 bg-white"
                                              />
                                          </div>

                                          <div className="text-right min-w-[70px] sm:min-w-[90px]">
                                              <p className="text-[9px] text-slate-400 uppercase font-bold">Total</p>
                                              <p className="font-bold text-indigo-900 text-sm sm:text-base">{formatCurrency((item.product.salePrice * item.quantity) - item.discount)}</p>
                                          </div>

                                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id)} className="hidden sm:flex text-slate-300 hover:text-red-500 hover:bg-red-50">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </CardContent>
                  <CardFooter className="p-6 bg-white border-t border-slate-100 flex-col gap-4 shrink-0">
                      <div className="w-full space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Espèces Reçues (DH)</Label>
                                  <Input 
                                      type="number" 
                                      placeholder="0.00" 
                                      className="h-10 text-lg font-bold"
                                      value={cashReceived || ""}
                                      onChange={(e) => setCashReceived(Number(e.target.value))}
                                  />
                              </div>
                              <div className="space-y-1.5">
                                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Monnaie à rendre</Label>
                                  <div className="h-10 flex items-center px-3 bg-slate-50 rounded-md border border-slate-200 text-lg font-black text-emerald-600">
                                      {formatCurrency(Math.max(0, cashReceived - calculateTotal()))}
                                  </div>
                              </div>
                          </div>

                          <div className="pt-2 border-t border-slate-50 space-y-2">
                              <div className="flex justify-between text-slate-500 text-sm">
                                  <span>Nombre d'articles</span>
                                  <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                              </div>
                              <div className="flex justify-between items-end">
                                  <span className="text-lg font-bold text-slate-900">Total à payer</span>
                                  <span className="text-3xl font-black text-indigo-600">{formatCurrency(calculateTotal())}</span>
                              </div>
                          </div>
                      </div>
                      <Button 
                          className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
                          disabled={cart.length === 0 || submitting}
                          onClick={finalizeOrder}
                      >
                          {submitting ? (
                              <div className="flex items-center gap-2">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                  <span>Traitement...</span>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-6 w-6" />
                                  <span>VALIDER LA VENTE</span>
                              </div>
                          )}
                      </Button>
                  </CardFooter>
              </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
