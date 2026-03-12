"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Html5Qrcode } from "html5-qrcode";
import { Trash2, Plus, Minus, ShoppingCart, CheckCircle2, ScanLine, Tag, Search, Box, RefreshCw, Upload, PackageSearch, ChevronRight, TrendingUp, AlertTriangle, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMobile } from "@/lib/hooks/use-mobile";

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

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isInitializingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setAllProducts(data);
      }
    } catch (err) { console.error(err); } finally { setLoadingProducts(false); }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err) {
      toast.error("Aucun code QR détecté.");
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

    // Charger le nom de la boutique
    const savedName = localStorage.getItem("shop_name");
    if (savedName) setShopName(savedName);

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        buffer = "";
      }

      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length > 2) {
          handleScanSuccess(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (currentScanner) {
        if (currentScanner.isScanning) {
          currentScanner.stop().then(() => currentScanner?.clear()).catch(e => console.error(e));
        } else { currentScanner.clear(); }
      }
    };
  }, []);

  const fetchProductDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      addToCart(data, true);
    } catch (error) {
      console.error(error);
      toast.error("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: any, isScan: boolean = false) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (isScan) return prev;
        
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > item.product.stock) {
          toast.warning(`Stock insuffisant (${item.product.stock})`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, discount } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const finalizeOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sales/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            discount: item.discount
          }))
        }),
      });

      if (res.ok) {
        const total = calculateTotal();
        const change = Math.max(0, cashReceived - total);
        
        setLastSale({
            items: [...cart],
            total,
            cash: cashReceived,
            change
        });
        
        toast.success("Commande validée avec succès !");
        setCart([]);
        setCashReceived(0);
        fetchAllProducts();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erreur lors de la validation.");
      }
    } catch (error) {
      toast.error("Erreur système.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.salePrice * item.quantity) - item.discount, 0);
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
  ).slice(0, 10);

  return (
    <div className="flex flex-col h-full space-y-4 max-w-full">
      {/* Styles d'impression pour ticket de caisse */}
      <style jsx global>{`
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
      `}</style>

      {/* Ticket Invisible - Uniquement pour window.print() */}
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
                            <td style={{ padding: '4px 0' }}>{item.product.name}</td>
                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency((item.product.salePrice * item.quantity) - item.discount)}</td>
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

      <div className="flex-1 space-y-4 sm:space-y-6 flex flex-col h-full">
        <div className="flex justify-between items-center px-1">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Scanner & POS</h2>
            <p className="hidden sm:block text-slate-500 text-sm">Vente rapide en session.</p>
          </div>
          {cart.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCart([])} className="text-red-500 border-red-100 hover:bg-red-50">
                  Vider le panier ({cart.length})
              </Button>
          )}
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
                          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-300" /></div>
                      ) : (
                          <div className="divide-y divide-slate-50">
                              {filteredProducts.map(p => (
                                  <button 
                                      key={p.id}
                                      onClick={() => addToCart(p)}
                                      className="w-full p-3 flex items-center text-left hover:bg-slate-50 transition-colors group"
                                  >
                                      <div className="h-8 w-8 rounded bg-slate-100 flex-shrink-0 mr-3 flex items-center justify-center overflow-hidden border border-slate-100">
                                          {p.image ? <img src={p.image} className="h-full w-full object-cover" /> : <Box className="h-4 w-4 text-slate-300" />}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                          <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                                          <div className="text-[10px] text-slate-500 flex items-center gap-2">
                                              <span className="font-bold text-indigo-600">{formatCurrency(p.salePrice)}</span>
                                              <span className="opacity-30">|</span>
                                              <span>{p.stock} en stock</span>
                                          </div>
                                      </div>
                                      <Plus className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 ml-2" />
                                  </button>
                              ))}
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>

          <Card className="lg:col-span-8 flex flex-col shadow-sm border-slate-200 overflow-hidden min-h-[400px]">
              <CardHeader className="py-3 px-4 border-b border-slate-100 bg-white shrink-0">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-indigo-600" />
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Panier Actuel</CardTitle>
                      </div>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">
                          {cart.length} article{cart.length > 1 ? 's' : ''}
                      </Badge>
                  </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-slate-50/30">
                  {cart.length === 0 ? (
                      lastSale ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                              <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-100 animate-in zoom-in duration-300">
                                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                              </div>
                              <div className="space-y-2">
                                  <h3 className="text-xl font-bold text-slate-900">Vente Terminée !</h3>
                                  <p className="text-sm text-slate-500">La commande a été enregistrée avec succès.</p>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-md">
                                  <Button onClick={handlePrint} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-12">
                                      <Printer className="h-5 w-5" />
                                      Imprimer le ticket
                                  </Button>
                                  <Button variant="outline" onClick={() => setLastSale(null)} className="w-full h-12">
                                      Nouvelle vente
                                  </Button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-3">
                              <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                                  <ShoppingCart className="h-8 w-8 opacity-20" />
                              </div>
                              <p className="text-sm">Le panier est vide.<br/>Scannez un produit pour commencer.</p>
                          </div>
                      )
                  ) : (
                      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                          {cart.map((item) => (
                              <div key={item.product.id} className="p-3 sm:p-4 bg-white border-b border-slate-50 last:border-0 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-3 sm:flex sm:items-center sm:gap-6">
                                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded border bg-slate-50 flex-shrink-0 overflow-hidden self-start sm:self-center">
                                      {item.product.image ? <img src={item.product.image} className="h-full w-full object-cover" /> : <PackageSearch className="h-full w-full p-2 text-slate-200" />}
                                  </div>

                                  <div className="min-w-0 pr-2 self-start sm:self-center">
                                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">{item.product.name}</h4>
                                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium">{formatCurrency(item.product.salePrice)} / u</p>
                                  </div>

                                  <div className="sm:hidden self-start pt-0.5">
                                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.product.id)} className="h-8 w-8 text-slate-300 hover:text-red-500">
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </div>
                                  
                                  <div className="col-span-2 sm:flex-1 flex items-center justify-between sm:justify-end gap-3 sm:gap-8 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-50">
                                      <div className="flex flex-col gap-1">
                                          <Label className="text-[9px] text-slate-400 uppercase font-bold sm:hidden">Qté</Label>
                                          <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 h-9 sm:h-10">
                                              <button onClick={() => updateQuantity(item.product.id, -1)} className="h-full px-3 hover:bg-slate-100 transition-colors text-slate-600 border-r border-slate-200">
                                                  <Minus className="h-3.5 w-3.5" />
                                              </button>
                                              <div className="w-12 h-full flex items-center justify-center font-black text-sm text-slate-900 bg-white">
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
  );
}
