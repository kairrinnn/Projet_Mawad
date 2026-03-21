"use client";

// Styles spécifiques pour l'impression propre
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

import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Html5Qrcode } from "html5-qrcode";
import { 
  Trash2, Plus, Minus, ShoppingCart, CheckCircle2,
  Search, Box, RefreshCw, Upload, PackageSearch,
  Loader2, DollarSign, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface ScanProduct {
  id: string;
  name: string;
  barcode?: string | null;
  image?: string | null;
  salePrice: number;
  costPrice: number;
  weightSalePrice?: number | null;
  weightCostPrice?: number | null;
  canBeSoldByWeight: boolean;
}

interface VerifyPinResponse {
  success: boolean;
}

interface SaleResponse {
  id: string;
}

interface CartItem {
  product: ScanProduct;
  quantity: number | string; // Allow string for intermediate typing "0."
  discount: number;
  soldByWeight: boolean;
}

export default function ScanPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [allProducts, setAllProducts] = useState<ScanProduct[]>([]);
  const [_loading, setLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [lastSale, setLastSale] = useState<{ items: CartItem[], total: number, cash: number, change: number } | null>(null);
  const [shopName, setShopName] = useState("Mawad Scan");

  // Expenses & Withdrawals logic
  const [quickExpForm, setQuickExpForm] = useState({ amount: "", description: "" });
  const [isExpDialogOpen, setIsExpDialogOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: "", description: "", code: "" });
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isInitializingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerBufferRef = useRef("");
  const lastKeyTimeRef = useRef(Date.now());

  const _fetchAllProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        setAllProducts(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const _addToCart = useCallback((product: ScanProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.soldByWeight) return prev;
        return prev.map((item) => item.product.id === product.id
          ? { ...item, quantity: Number(item.quantity) + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0, soldByWeight: false }];
    });
  }, []);

  const _fetchProductDetails = useCallback(async (barcode: string) => {
    setLoading(true);
    const { data, error } = await apiRequest<ScanProduct>(`/api/products?barcode=${barcode}`);
    if (!error && data) {
      _addToCart(data);
      toast.success(`${data.name} ajouté`);
    } else if (!error) {
      toast.error("Produit non trouvé");
    }
    setLoading(false);
  }, [_addToCart]);

  useEffect(() => {
    _fetchAllProducts();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Priorité absolue au scanner même si un input est focusé
      // Sauf si c'est une touche de contrôle (Ctrl, Alt, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (scannerBufferRef.current.length > 2) {
          _fetchProductDetails(scannerBufferRef.current);
          scannerBufferRef.current = "";
          // Empêche la soumission de formulaire ou d'autres actions par défaut
          e.preventDefault();
          e.stopPropagation();
        }
      } else if (e.key.length === 1) {
        // Seuil de 50ms pour distinguer une frappe humaine d'un scanner
        if (diff > 50) {
            scannerBufferRef.current = e.key;
        } else {
            scannerBufferRef.current += e.key;
        }
        
        // Si c'est un scanner rapide, on intercepte pour éviter que ça n'écrive dans un input
        if (diff < 30) {
            e.stopPropagation();
            if (document.activeElement?.tagName === "INPUT") {
                // Optionnel: on peut laisser passer si c'est une frappe lente
            }
        }
      }
    };

    // Utilisation de la phase de CAPTURE (true) pour intercepter avant tout le monde
    window.addEventListener("keydown", handleKeyDown, true);
    
    // Load shop name from settings
    const savedName = localStorage.getItem("shop_name");
    if (savedName) setShopName(savedName);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [_fetchAllProducts, _fetchProductDetails]);

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
          if (html5QrCodeRef.current.isScanning) await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) { }
      }
      const container = document.getElementById("qr-reader");
      if (container) container.innerHTML = "";
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      await html5QrCode.start({ facingMode: "environment" }, { fps: 20, qrbox: { width: 260, height: 180 } }, (txt) => handleScanSuccess(txt), () => {});
    } catch (err: unknown) {
      if (err instanceof Error && err.toString().includes("NotAllowedError")) {
        toast.error("Accès caméra refusé");
      }
    } finally { isInitializingRef.current = false; }
  };

  const handleScanSuccess = (decodedText: string) => {
    fetchProductDetails(decodedText);
  };

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        type: "Daily",
        amount: parseFloat(quickExpForm.amount),
        description: quickExpForm.description || "Dépense Caisse",
      })
    });
    if (!error) {
      toast.success("Dépense enregistrée");
      setQuickExpForm({ amount: "", description: "" });
      setIsExpDialogOpen(false);
    }
    setSubmitting(false);
  };

  const handleManagerWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Vérification du PIN via API
    const { data: pinResult, error: pinError } = await apiRequest<VerifyPinResponse>("/api/auth/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin: withdrawalForm.code }),
    });
    
    if (pinError || !pinResult?.success) {
      if (!pinError) toast.error("Code manager incorrect");
      setSubmitting(false);
      return;
    }

    const { error: expError } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        type: "Withdrawal",
        amount: parseFloat(withdrawalForm.amount),
        description: withdrawalForm.description || "Retrait Gérant",
      })
    });
    
    if (!expError) {
      toast.success("Retrait validé");
      setWithdrawalForm({ amount: "", description: "", code: "" });
      setIsWithdrawalOpen(false);
    }
    setSubmitting(false);
  };

  const fetchProductDetails = useCallback(async (barcode: string) => {
    setLoading(true);
    const { data, error } = await apiRequest<ScanProduct>(`/api/products?barcode=${barcode}`);
    if (!error && data) {
      _addToCart(data);
      toast.success(`${data.name} ajouté`);
    } else if (!error) {
      toast.error("Produit non trouvé");
    }
    setLoading(false);
  }, [_addToCart]);

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) { toast.error("Impossible de lire l'image"); } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const currentQty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
        const step = item.soldByWeight ? 0.1 : 1;
        const newQty = Math.max(item.soldByWeight ? 0.05 : 1, currentQty + (delta * step));
        return { ...item, quantity: Number(newQty.toFixed(3)) };
      }
      return item;
    }));
  };

  const setWeightValue = (productId: string, val: string | number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: val } : item
    ));
  };

  const toggleWeightMode = (productId: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, soldByWeight: !item.soldByWeight, quantity: 1 };
      }
      return item;
    }));
  };

  const getItemPrice = (item: CartItem) => {
    if (item.soldByWeight) return item.product.weightSalePrice || item.product.salePrice;
    return item.product.salePrice;
  };

  const getItemTotal = (item: CartItem) => {
    const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity;
    const price = getItemPrice(item);
    return (price * qty) - item.discount;
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + getItemTotal(item), 0);

  const finalizeOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    const items = cart.map(item => ({
      productId: item.product.id,
      quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
      salePrice: getItemPrice(item),
      costPrice: item.soldByWeight ? (item.product.weightCostPrice || item.product.costPrice) : item.product.costPrice,
      discount: item.discount,
      soldByWeight: item.soldByWeight
    }));

    const { data: resData, error } = await apiRequest<SaleResponse[]>("/api/sales/bulk", {
      method: "POST",
      body: JSON.stringify({ items })
    });

    if (!error && resData) {
      setLastSale({ items: [...cart], total: calculateTotal(), cash: cashReceived, change: Math.max(0, cashReceived - calculateTotal()) });
      toast.success("Vente réussie !");
      setCart([]);
      setCashReceived(0);
      _fetchAllProducts();
    }
    setSubmitting(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(val || 0);

  const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 print:p-0 print:bg-white print:m-0">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div id="qr-reader-hidden" className="hidden" />
      
      {/* Ticket Invisible */}
      {lastSale && (
        <div id="printable-receipt" className="hidden">
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold">{shopName.toUpperCase()}</h2>
                <div className="h-[1px] w-12 bg-black/20 mx-auto my-1" />
                <p className="text-[10px] uppercase tracking-widest leading-none mt-2">{new Date().toLocaleString('fr-FR')}</p>
            </div>
            
            <div className="border-t border-b border-dashed border-black/30 py-2 my-4">
                {lastSale.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm mb-1">
                        <span className="flex-1 truncate">{item.product.name}</span>
                        <span className="mx-2 opacity-70">x{item.quantity}</span>
                        <span className="font-bold">{formatCurrency(getItemTotal(item))}</span>
                    </div>
                ))}
            </div>
            
            <div className="flex justify-between items-center pt-1">
                <span className="text-xs opacity-70 font-bold">TOTAL NET À PAYER</span>
                <span className="text-xl font-black">{formatCurrency(lastSale.total)}</span>
            </div>
            
            {lastSale.cash > 0 && (
                <div className="mt-4 pt-2 border-t border-dashed border-black/10 space-y-1">
                    <div className="flex justify-between text-[10px] opacity-70">
                        <span>Reçu</span>
                        <span>{formatCurrency(lastSale.cash)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                        <span>Rendu</span>
                        <span>{formatCurrency(lastSale.change)}</span>
                    </div>
                </div>
            )}
            
            <div className="mt-8 text-center space-y-1 opacity-50">
                <p className="text-[8px] uppercase tracking-widest leading-none">Document non contractuel</p>
                <p className="text-[8px] uppercase tracking-widest leading-none">Logiciel par Mawad Dev</p>
            </div>
        </div>
      )}

      <div className="flex-1 space-y-4 flex flex-col h-full print:hidden">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Scanner & POS</h2>
            <p className="text-slate-500 text-xs">Vitesse et précision pour chaque transaction.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="bg-indigo-600 text-white border-none hover:bg-slate-900 shadow-sm" />}>
                <Lock className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Retrait Gérant</span>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Retrait Gérant</DialogTitle>
                    <DialogDescription>Retirer des fonds de la caisse (non affecté au bénéfice).</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleManagerWithdrawal} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Montant (DH)</Label>
                      <Input type="number" required placeholder="0.00" value={withdrawalForm.amount} onChange={e => setWithdrawalForm({...withdrawalForm, amount: e.target.value})} className="text-lg font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Motif</Label>
                      <Input placeholder="Ex: Dépôt banque" value={withdrawalForm.description} onChange={e => setWithdrawalForm({...withdrawalForm, description: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Code Manager</Label>
                      <Input type="password" required placeholder="****" value={withdrawalForm.code} onChange={e => setWithdrawalForm({...withdrawalForm, code: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-slate-900" disabled={submitting}>Confirmer le retrait</Button>
                  </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300" />}>
                <ShoppingCart className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Dépense Caisse</span>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Petite Dépense</DialogTitle><DialogDescription>Achat rapide payé par la caisse.</DialogDescription></DialogHeader>
                  <form onSubmit={handleQuickExpense} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Montant (DH)</Label>
                      <Input type="number" required placeholder="0.00" value={quickExpForm.amount} onChange={e => setQuickExpForm({...quickExpForm, amount: e.target.value})} className="font-bold" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Input placeholder="Ex: Café, Pain..." value={quickExpForm.description} onChange={e => setQuickExpForm({...quickExpForm, description: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full bg-slate-900 text-white" disabled={submitting}>Valider la dépense</Button>
                  </form>
                </DialogContent>
            </Dialog>

            {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-red-500 hover:bg-red-50">Vider</Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">
          {/* Scanner / Products */}
          <div className="lg:col-span-4 space-y-4 flex flex-col">
              <Card className="shadow-sm border-slate-200 shrink-0 overflow-hidden">
                  <div className="bg-black aspect-video relative flex items-center justify-center overflow-hidden">
                      <div id="qr-reader" className="w-full h-full [&_video]:object-cover" />
                      {/* Overlay Viseur Barcode (Style ProductsPage) */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="relative w-[260px] h-[180px]">
                              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500" />
                              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500" />
                              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500" />
                              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500" />
                              
                              <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-indigo-500/30 animate-pulse" />
                          </div>
                      </div>
                  </div>
                  <div className="flex divide-x divide-slate-100 border-t">
                      <Button variant="ghost" className="flex-1 rounded-none h-11 text-xs text-slate-500" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" /> Image
                      </Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileScan} />
                      <Button variant="ghost" className="flex-1 rounded-none h-11 text-xs text-slate-500" onClick={startScanner}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Scanner
                      </Button>
                  </div>
              </Card>

              <Card className="shadow-sm border-slate-200 flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 border-b bg-slate-50/50">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="Rechercher un produit..." className="pl-9 h-10 text-sm bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                      </div>
                  </div>
                  <CardContent className="p-0 overflow-y-auto flex-1 h-[200px]">
                      <div className="divide-y divide-slate-100">
                          {filteredProducts.map(p => (
                              <div key={p.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => _addToCart(p)}>
                                  <div className="h-10 w-10 relative bg-slate-100 rounded overflow-hidden shrink-0">
                                      {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" /> : <Box className="h-5 w-5 text-slate-300 m-auto flex items-center justify-center h-full" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs text-slate-900 truncate">{p.name}</p>
                                      <p className="text-indigo-600 font-bold text-xs">{formatCurrency(p.salePrice)}</p>
                                  </div>
                                  <Plus className="h-4 w-4 text-slate-300" />
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
              <Card className="shadow-sm border-slate-200 flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="py-4 px-6 bg-slate-50/50 border-b">
                      <CardTitle className="text-base flex items-center text-slate-800">
                          <ShoppingCart className="h-4 w-4 mr-2 text-indigo-600" />
                          Articles au panier ({cart.length})
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-0">
                      {cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-30">
                              <PackageSearch className="h-16 w-16 mb-4" />
                              <p className="text-sm font-medium">Le panier est encore vide</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-slate-100">
                              {cart.map((item) => (
                                  <div key={item.product.id} className="p-4 flex items-center justify-between gap-4 group">
                                      <div className="flex items-center gap-4 flex-1 min-w-0">
                                          <div className="h-12 w-12 relative bg-slate-100 rounded overflow-hidden shrink-0">
                                              {item.product.image ? <Image src={item.product.image} alt={item.product.name} fill className="object-cover" /> : <Box className="h-6 w-6 m-auto text-slate-300 h-full flex items-center justify-center" />}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                              <p className="font-bold text-sm text-slate-900 truncate">{item.product.name}</p>
                                              <div className="flex items-center gap-3 mt-1">
                                                  <span className="text-xs font-medium text-slate-500">{formatCurrency(getItemPrice(item))} / {item.soldByWeight ? 'Kg' : 'unité'}</span>
                                                  {item.product.canBeSoldByWeight && (
                                                    <button onClick={() => toggleWeightMode(item.product.id)} className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase transition-colors", item.soldByWeight ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                                                      {item.soldByWeight ? "Kg" : "Unité"}
                                                    </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-4">
                                          <div className="w-24 flex justify-center">
                                            {item.soldByWeight ? (
                                                <div className="relative">
                                                    <Input 
                                                       type="text" 
                                                       inputMode="decimal"
                                                       value={item.quantity} 
                                                       onChange={e => {
                                                           const v = e.target.value.replace(',', '.');
                                                           if (v === '' || /^\d*\.?\d*$/.test(v)) setWeightValue(item.product.id, v);
                                                       }}
                                                       onBlur={() => {
                                                           const n = parseFloat(String(item.quantity)) || 0;
                                                           setWeightValue(item.product.id, Math.max(0.01, n));
                                                       }}
                                                       className="h-9 w-20 text-center text-xs font-black pr-6 border-slate-200 focus:ring-indigo-500" 
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">kg</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center h-9 bg-white border border-slate-200 rounded-md shadow-sm">
                                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2.5 h-full text-slate-400 hover:text-indigo-600 transition-colors border-r"><Minus className="h-3 w-3" /></button>
                                                    <span className="w-8 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2.5 h-full text-slate-400 hover:text-indigo-600 transition-colors border-l"><Plus className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                          </div>
                                          <div className="w-24 text-right">
                                              <p className="font-black text-slate-900 text-sm">{formatCurrency(getItemTotal(item))}</p>
                                          </div>
                                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id)} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </CardContent>
                  <CardFooter className="p-6 bg-white border-t flex-col gap-6 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                      <div className="w-full space-y-4">
                          <div className="flex justify-between items-end">
                              <span className="text-slate-500 font-medium text-sm">TOTAL À PAYER</span>
                              <span className="text-3xl font-black text-indigo-600">{formatCurrency(calculateTotal())}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Espèces Reçues</Label>
                                  <div className="relative">
                                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                      <Input type="number" placeholder="0.00" value={cashReceived || ""} onChange={e => setCashReceived(Number(e.target.value))} className="pl-9 h-11 text-base font-bold bg-slate-50 border-slate-200" />
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rendu Monnaie</Label>
                                  <div className={cn("h-11 flex items-center justify-center rounded-md font-black text-lg shadow-inner", cashReceived >= calculateTotal() ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                                      {formatCurrency(Math.max(0, cashReceived - calculateTotal()))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <Button className="w-full h-14 text-lg font-black bg-indigo-600 hover:bg-slate-900 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3" disabled={cart.length === 0 || submitting} onClick={finalizeOrder}>
                          {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                          <span>VALIDER LA VENTE</span>
                      </Button>
                  </CardFooter>
              </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
