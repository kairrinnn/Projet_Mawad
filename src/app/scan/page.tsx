"use client";

// Styles spécifiques pour l'impression propre (Restauration version élégante)
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
      overflow: visible !important;
    }
    #printable-receipt, #printable-receipt * {
      visibility: visible;
    }
    #printable-receipt {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm;
      padding: 5mm;
      color: black;
      background: white;
      font-family: monospace;
      font-size: 10pt;
      display: block !important;
    }
    @page {
      margin: 0;
      size: auto;
    }
  }
`;

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
  soldByWeight: boolean;
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

    // 1. Écouteur global pour le scanner physique (clavier wedge)
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length > 2) {
          fetchProductDetails(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        if (diff > 50) {
            buffer = e.key;
        } else {
            buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // 2. Impression automatique après vente
  useEffect(() => {
    if (lastSale) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [lastSale]);

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
        if (existing.soldByWeight) {
          toast.info(`${product.name} est déjà dans le panier (Vente au poids)`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0, soldByWeight: false }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const step = item.soldByWeight ? 0.1 : 1;
        const newQty = Math.max(item.soldByWeight ? 0.05 : 1, item.quantity + (delta * step));
        return { ...item, quantity: Number(newQty.toFixed(3)) };
      }
      return item;
    }));
  };

  const setWeight = (productId: string, weight: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: Math.max(0, weight) } : item
    ));
  };

  const toggleWeightMode = (productId: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const isSwitchingToWeight = !item.soldByWeight;
        return { 
          ...item, 
          soldByWeight: isSwitchingToWeight,
          quantity: 1 
        };
      }
      return item;
    }));
  };

  const updateDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, discount: Math.max(0, discount) } : item
    ));
  };

  const getItemPrice = (item: CartItem) => {
    if (item.soldByWeight) {
      return item.product.weightSalePrice || item.product.salePrice;
    }
    return item.product.salePrice;
  };

  const getItemTotal = (item: CartItem) => {
    const price = getItemPrice(item);
    return (price * item.quantity) - item.discount;
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  const finalizeOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        salePrice: getItemPrice(item),
        costPrice: item.soldByWeight ? (item.product.weightCostPrice || item.product.costPrice) : item.product.costPrice,
        discount: item.discount,
        soldByWeight: item.soldByWeight
      }));

      const res = await fetch("/api/sales/bulk", {
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
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 print:p-0 print:bg-white print:m-0">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div id="qr-reader-hidden" className="hidden" />
      
      {/* Ticket Invisible */}
      {lastSale && (
        <div id="printable-receipt" className="hidden">
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '14pt', margin: '0' }}>{shopName.toUpperCase()}</h2>
                <p style={{ fontSize: '8pt', margin: '2px 0' }}>{new Date().toLocaleString()}</p>
                <div style={{ borderBottom: '1px dashed black', margin: '5px 0' }} />
            </div>
            
            <table style={{ width: '100%', fontSize: '9pt', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid black' }}>
                        <th style={{ textAlign: 'left' }}>Item</th>
                        <th style={{ textAlign: 'center' }}>Qté</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {lastSale.items.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ padding: '4px 0' }}>{item.product.name} {item.soldByWeight ? '(Kg)' : ''}</td>
                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>
                              {formatCurrency(getItemTotal(item))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div style={{ borderTop: '1px dashed black', marginTop: '10px', paddingTop: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>TOTAL:</span>
                    <span>{formatCurrency(lastSale.total)}</span>
                </div>
                {lastSale.cash > 0 && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginTop: '4px' }}>
                            <span>Espèces:</span>
                            <span>{formatCurrency(lastSale.cash)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', fontWeight: 'bold', marginTop: '2px' }}>
                            <span>Rendu:</span>
                            <span>{formatCurrency(lastSale.change)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

      <div className="flex-1 space-y-4 sm:space-y-6 flex flex-col h-full print:hidden">
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
                </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">
          {/* Colonne Gauche */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
              <Card className="shadow-sm border-slate-200 overflow-hidden shrink-0">
                  <div className="bg-black relative flex items-center justify-center aspect-video sm:aspect-square overflow-hidden">
                      <div id="qr-reader" className="w-full h-full [&_video]:object-cover flex items-center justify-center overflow-hidden" />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="relative w-[260px] h-[180px]">
                              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500" />
                              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500" />
                              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500" />
                              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500" />
                          </div>
                      </div>
                  </div>
                  <div className="flex border-t border-slate-100">
                      <Button variant="ghost" className="flex-1 rounded-none h-10 text-[10px] sm:text-xs text-slate-500" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-3 w-3 mr-1.5" /> Photo
                      </Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileScan} />
                      <Button variant="ghost" className="flex-1 rounded-none h-10 text-[10px] sm:text-xs text-slate-500" onClick={() => startScanner()}>
                          <RefreshCw className="h-3 w-3 mr-1.5" /> Relancer
                      </Button>
                  </div>
              </Card>

              <Card className="shadow-sm border-slate-200 flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                      <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input 
                              placeholder="Chercher..." 
                              className="pl-8 h-9 text-xs bg-white"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                  </div>
                  <CardContent className="p-0 overflow-y-auto flex-1 h-[200px]">
                      <div className="grid grid-cols-1 gap-px bg-slate-100">
                          {filteredProducts.map(p => (
                              <div key={p.id} className="bg-white p-3 flex items-center gap-3 hover:bg-indigo-50 cursor-pointer" onClick={() => addToCart(p)}>
                                  <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center shrink-0">
                                      {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Box className="h-4 w-4 text-slate-300" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs truncate">{p.name}</p>
                                      <p className="text-indigo-600 font-bold text-xs">{formatCurrency(p.salePrice)}</p>
                                  </div>
                                  <Plus className="h-4 w-4 text-indigo-400" />
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>
          </div>

          {/* Colonne Droite: Panier */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
              <Card className="shadow-sm border-slate-200 flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="p-4 bg-slate-50/30 border-b border-slate-100 shrink-0">
                      <div className="flex justify-between items-center">
                          <CardTitle className="text-base flex items-center">
                              <ShoppingCart className="h-4 w-4 mr-2 text-indigo-500" />
                              Panier ({cart.length})
                          </CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-0">
                      {cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-12 text-slate-300">
                              <PackageSearch className="h-12 w-12 mb-2 opacity-20" />
                              <p className="text-sm">Panier vide</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-slate-100">
                              {cart.map((item) => (
                                  <div key={item.product.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className="h-10 w-10 bg-slate-100 rounded overflow-hidden shrink-0">
                                              {item.product.image ? <img src={item.product.image} className="w-full h-full object-cover" /> : <Box className="h-4 w-4 m-auto text-slate-300" />}
                                          </div>
                                          <div className="min-w-0">
                                              <p className="font-bold text-sm truncate">{item.product.name}</p>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] text-slate-500 font-medium">
                                                    {`${formatCurrency(getItemPrice(item))} / ${item.soldByWeight ? 'Kg' : 'unité'}`}
                                                  </span>
                                                  {item.product.canBeSoldByWeight && (
                                                    <Button variant="outline" size="sm" onClick={() => toggleWeightMode(item.product.id)} className="h-5 px-1.5 text-[8px] uppercase font-bold">
                                                      {item.soldByWeight ? "Unité" : "Kilo"}
                                                    </Button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                          <div className="flex flex-col items-center">
                                              {item.soldByWeight ? (
                                                  <Input type="number" step="0.01" value={item.quantity} onChange={(e) => setWeight(item.product.id, Number(e.target.value))} className="h-8 w-16 text-center text-xs font-bold" />
                                              ) : (
                                                  <div className="flex items-center h-8 bg-slate-100 rounded border">
                                                      <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2 h-full border-r"><Minus className="h-3 w-3" /></button>
                                                      <span className="px-3 text-xs font-bold">{item.quantity}</span>
                                                      <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2 h-full border-l"><Plus className="h-3 w-3" /></button>
                                                  </div>
                                              )}
                                          </div>
                                          <div className="text-right min-w-[80px]">
                                              <p className="font-bold text-indigo-900 text-sm">{formatCurrency(getItemTotal(item))}</p>
                                          </div>
                                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </CardContent>
                  <CardFooter className="p-6 bg-white border-t flex-col gap-4 shrink-0">
                      <div className="w-full space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                              <div>Total à payer</div>
                              <div className="text-right text-indigo-600 text-2xl">{formatCurrency(calculateTotal())}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <Input type="number" placeholder="Espèces" value={cashReceived || ""} onChange={(e) => setCashReceived(Number(e.target.value))} className="h-10" />
                              <div className="h-10 bg-emerald-50 text-emerald-700 flex items-center px-3 rounded border border-emerald-100 font-bold">
                                  Rendu: {formatCurrency(Math.max(0, cashReceived - calculateTotal()))}
                              </div>
                          </div>
                      </div>
                      <Button className="w-full h-12 text-base font-bold bg-indigo-600 hover:bg-indigo-700" disabled={cart.length === 0 || submitting} onClick={finalizeOrder}>
                          {submitting ? "Traitement..." : "VALIDER LA VENTE"}
                      </Button>
                  </CardFooter>
              </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
