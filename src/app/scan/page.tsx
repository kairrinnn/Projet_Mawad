"use client";

const printStyles = `
  @media print {
    body * { visibility: hidden; overflow: visible !important; }
    #printable-receipt, #printable-receipt * { visibility: visible; }
    #printable-receipt {
      position: absolute; left: 0; top: 0; width: 80mm; padding: 5mm;
      color: black; background: white; font-family: monospace; font-size: 10pt;
      display: block !important;
    }
    @page { margin: 0; size: auto; }
  }
`;

import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { apiRequest } from "@/lib/api";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { DEFAULT_SHOP_SETTINGS, readLocalShopSettings } from "@/lib/shop-settings";
import { Html5Qrcode } from "html5-qrcode";
import {
  Trash2, Plus, Minus, ShoppingCart, CheckCircle2,
  Search, Box, RefreshCw, Upload, PackageSearch,
  Loader2, DollarSign, Lock, QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface VerifyPinResponse { success: boolean; }
interface SaleResponse {
  id: string;
  ticketNumber?: string | null;
  paymentMethod?: PaymentMethod;
  cashReceived?: number | null;
  changeGiven?: number | null;
}

interface CartItem {
  product: ScanProduct;
  quantity: number | string;
  discount: number;
  soldByWeight: boolean;
}

export default function ScanPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [allProducts, setAllProducts] = useState<ScanProduct[]>([]);
  const [_loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [lastSale, setLastSale] = useState<{
    items: CartItem[]; total: number; cash: number; change: number;
    paymentMethod: PaymentMethod; ticketNumber: string | null;
  } | null>(null);
  const [shopSettings, setShopSettings] = useState(DEFAULT_SHOP_SETTINGS);
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
      if (res.ok) setAllProducts(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const _addToCart = useCallback((product: ScanProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.soldByWeight) return prev;
        return prev.map((item) => item.product.id === product.id
          ? { ...item, quantity: Number(item.quantity) + 1 } : item);
      }
      return [...prev, { product, quantity: 1, discount: 0, soldByWeight: false }];
    });
  }, []);

  const fetchProductDetails = useCallback(async (barcode: string) => {
    setLoading(true);
    const { data, error } = await apiRequest<ScanProduct>(`/api/products?barcode=${barcode}`);
    if (!error && data) { _addToCart(data); toast.success(`${data.name} ajouté`); }
    else if (!error) toast.error("Produit non trouvé");
    setLoading(false);
  }, [_addToCart]);

  const fetchShopSettings = useCallback(async () => {
    setShopSettings(readLocalShopSettings());
  }, []);

  useEffect(() => {
    _fetchAllProducts();
    void fetchShopSettings();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;
      if (e.key === "Enter") {
        if (scannerBufferRef.current.length > 2) {
          fetchProductDetails(scannerBufferRef.current);
          scannerBufferRef.current = "";
          e.preventDefault(); e.stopPropagation();
        }
      } else if (e.key.length === 1) {
        if (diff > 50) { scannerBufferRef.current = e.key; }
        else { scannerBufferRef.current += e.key; }
        if (diff < 30) e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (html5QrCodeRef.current?.isScanning) html5QrCodeRef.current.stop().catch(console.error);
    };
  }, [_fetchAllProducts, fetchProductDetails, fetchShopSettings]);

  useEffect(() => {
    const reload = () => void fetchShopSettings();
    window.addEventListener("shop-settings-updated", reload);
    return () => window.removeEventListener("shop-settings-updated", reload);
  }, [fetchShopSettings]);

  useEffect(() => {
    if (lastSale) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [lastSale]);

  const startScanner = async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    try {
      if (html5QrCodeRef.current) {
        try { if (html5QrCodeRef.current.isScanning) await html5QrCodeRef.current.stop(); html5QrCodeRef.current.clear(); } catch {}
      }
      const container = document.getElementById("qr-reader");
      if (container) container.innerHTML = "";
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      await html5QrCode.start({ facingMode: "environment" }, { fps: 20, qrbox: { width: 260, height: 180 } }, (txt) => fetchProductDetails(txt), () => {});
    } catch (err: unknown) {
      if (err instanceof Error && err.toString().includes("NotAllowedError")) toast.error("Accès caméra refusé");
    } finally { isInitializingRef.current = false; }
  };

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ type: "Daily", amount: parseFloat(quickExpForm.amount), description: quickExpForm.description || "Dépense Caisse" }),
    });
    if (!error) { toast.success("Dépense enregistrée"); setQuickExpForm({ amount: "", description: "" }); setIsExpDialogOpen(false); }
    setSubmitting(false);
  };

  const handleManagerWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: pinResult, error: pinError } = await apiRequest<VerifyPinResponse>("/api/auth/verify-pin", {
      method: "POST", body: JSON.stringify({ pin: withdrawalForm.code }),
    });
    if (pinError || !pinResult?.success) { if (!pinError) toast.error("Code manager incorrect"); setSubmitting(false); return; }
    const { error: expError } = await apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify({ type: "Withdrawal", amount: parseFloat(withdrawalForm.amount), description: withdrawalForm.description || "Retrait Gérant" }),
    });
    if (!expError) { toast.success("Retrait validé"); setWithdrawalForm({ amount: "", description: "", code: "" }); setIsWithdrawalOpen(false); }
    setSubmitting(false);
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      fetchProductDetails(decodedText);
    } catch { toast.error("Impossible de lire l'image"); }
    finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const removeFromCart = (id: string) => setCart((p) => p.filter((i) => i.product.id !== id));

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.product.id !== id) return item;
      const curr = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
      const step = item.soldByWeight ? 0.1 : 1;
      const newQty = Math.max(item.soldByWeight ? 0.05 : 1, curr + delta * step);
      return { ...item, quantity: Number(newQty.toFixed(3)) };
    }));
  };

  const setWeightValue = (id: string, val: string | number) =>
    setCart((p) => p.map((i) => i.product.id === id ? { ...i, quantity: val } : i));

  const toggleWeightMode = (id: string) =>
    setCart((p) => p.map((i) => i.product.id === id ? { ...i, soldByWeight: !i.soldByWeight, quantity: 1 } : i));

  const getItemPrice = (item: CartItem) =>
    item.soldByWeight ? item.product.weightSalePrice || item.product.salePrice : item.product.salePrice;

  const getItemTotal = (item: CartItem) => {
    const qty = typeof item.quantity === "string" ? parseFloat(item.quantity) || 0 : item.quantity;
    return getItemPrice(item) * qty - item.discount;
  };

  const calculateTotal = () => cart.reduce((s, i) => s + getItemTotal(i), 0);

  const finalizeOrder = async () => {
    if (cart.length === 0) return;
    const total = calculateTotal();
    setSubmitting(true);
    const items = cart.map((item) => ({
      productId: item.product.id,
      quantity: typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity,
      salePrice: getItemPrice(item),
      costPrice: item.soldByWeight ? (item.product.weightCostPrice || item.product.costPrice) : item.product.costPrice,
      discount: item.discount,
      soldByWeight: item.soldByWeight,
    }));
    const { data: resData, error } = await apiRequest<SaleResponse[]>("/api/sales/bulk", {
      method: "POST",
      body: JSON.stringify({ items, paymentMethod, cashReceived: paymentMethod === "CASH" ? cashReceived : null }),
    });
    if (!error && resData) {
      const primary = resData[0];
      setLastSale({
        items: [...cart], total,
        cash: paymentMethod === "CASH" ? Number(primary?.cashReceived ?? cashReceived) : 0,
        change: paymentMethod === "CASH" ? Number(primary?.changeGiven ?? Math.max(0, cashReceived - total)) : 0,
        paymentMethod,
        ticketNumber: primary?.ticketNumber ?? null,
      });
      toast.success("Vente réussie !");
      setCart([]); setCashReceived(0); setPaymentMethod("CASH");
      _fetchAllProducts();
    }
    setSubmitting(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: shopSettings.currency }).format(val || 0);

  const filteredProducts = allProducts.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full -mt-8 -mx-4 sm:-mx-6 md:-mx-8 pt-8 px-4 sm:px-6 md:px-8 print:p-0 print:bg-white print:m-0">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <div id="qr-reader-hidden" className="hidden" />

      {/* ── Printable receipt ──────────────────────────────────── */}
      {lastSale && (
        <div id="printable-receipt" className="hidden">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">{shopSettings.shopName.toUpperCase()}</h2>
            <div className="h-[1px] w-12 bg-black/20 mx-auto my-1" />
            <p className="text-[10px] uppercase tracking-widest leading-none mt-2">{new Date().toLocaleString("fr-FR")}</p>
            {lastSale.ticketNumber && <p className="text-[9px] mt-1 leading-tight">Ticket: {lastSale.ticketNumber}</p>}
            {shopSettings.address && <p className="text-[9px] mt-2 leading-tight">{shopSettings.address}</p>}
            {shopSettings.phone && <p className="text-[9px] leading-tight">{shopSettings.phone}</p>}
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
          <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-70 mt-2">
            <span>Paiement</span>
            <span>{PAYMENT_METHOD_LABELS[lastSale.paymentMethod]}</span>
          </div>
          {lastSale.paymentMethod === "CASH" && lastSale.cash > 0 && (
            <div className="mt-4 pt-2 border-t border-dashed border-black/10 space-y-1">
              <div className="flex justify-between text-[10px] opacity-70"><span>Reçu</span><span>{formatCurrency(lastSale.cash)}</span></div>
              <div className="flex justify-between text-xs font-bold"><span>Rendu</span><span>{formatCurrency(lastSale.change)}</span></div>
            </div>
          )}
          <div className="mt-8 text-center space-y-1 opacity-50">
            {shopSettings.receiptFooter && <p className="text-[8px] uppercase tracking-widest leading-none">{shopSettings.receiptFooter}</p>}
            <p className="text-[8px] uppercase tracking-widest leading-none">Document non contractuel</p>
          </div>
        </div>
      )}

      {/* ── Main UI ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 space-y-5 print:hidden">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", boxShadow: "0 4px 16px rgba(79,70,229,0.25)" }}
            >
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scanner & POS</h1>
              <p className="text-sm text-slate-500 mt-0.5">Vitesse et précision pour chaque transaction</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Retrait Gérant */}
            <Dialog open={isWithdrawalOpen} onOpenChange={setIsWithdrawalOpen}>
              <DialogTrigger render={(props) => (
                <Button size="sm" className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 shadow-sm gap-1.5" {...props}>
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Retrait Gérant</span>
                </Button>
              )} />
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Retrait Gérant</DialogTitle>
                  <DialogDescription>Retirer des fonds de la caisse (non affecté au bénéfice).</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleManagerWithdrawal} className="space-y-4 pt-2">
                  <div className="space-y-1.5"><Label>Montant (DH)</Label><Input type="number" required placeholder="0.00" value={withdrawalForm.amount} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })} className="rounded-xl text-lg font-bold" /></div>
                  <div className="space-y-1.5"><Label>Motif</Label><Input placeholder="Ex: Dépôt banque" value={withdrawalForm.description} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })} className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label>Code Manager</Label><Input type="password" required placeholder="••••" value={withdrawalForm.code} onChange={(e) => setWithdrawalForm({ ...withdrawalForm, code: e.target.value })} className="rounded-xl" /></div>
                  <Button type="submit" disabled={submitting} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Vérification…</> : "Confirmer le retrait"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dépense Caisse */}
            <Dialog open={isExpDialogOpen} onOpenChange={setIsExpDialogOpen}>
              <DialogTrigger render={(props) => (
                <Button size="sm" variant="outline" className="rounded-full gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50" {...props}>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Dépense Caisse</span>
                </Button>
              )} />
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Petite Dépense</DialogTitle>
                  <DialogDescription>Achat rapide payé par la caisse.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleQuickExpense} className="space-y-4 pt-2">
                  <div className="space-y-1.5"><Label>Montant (DH)</Label><Input type="number" required placeholder="0.00" value={quickExpForm.amount} onChange={(e) => setQuickExpForm({ ...quickExpForm, amount: e.target.value })} className="rounded-xl font-bold" /></div>
                  <div className="space-y-1.5"><Label>Description</Label><Input placeholder="Ex: Café, Pain…" value={quickExpForm.description} onChange={(e) => setQuickExpForm({ ...quickExpForm, description: e.target.value })} className="rounded-xl" /></div>
                  <Button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</> : "Valider la dépense"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="rounded-full text-red-500 hover:bg-red-50 hover:text-red-600">
                Vider
              </Button>
            )}
          </div>
        </div>

        {/* ── Two-column grid ─────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-12 flex-1 min-h-0">

          {/* Left — Scanner + Product search */}
          <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">

            {/* Camera */}
            <div className="rounded-2xl bg-white border border-border/50 shadow-card overflow-hidden flex-shrink-0">
              <div className="bg-[#0a0a1b] aspect-video relative flex items-center justify-center overflow-hidden">
                <div id="qr-reader" className="w-full h-full [&_video]:object-cover" />
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-[260px] h-[180px]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-indigo-400" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-indigo-400" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-indigo-400" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-indigo-400" />
                    <div className="absolute top-1/2 left-2 right-2 h-px bg-indigo-400/40 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="flex divide-x divide-slate-100 border-t border-border/50">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 h-11 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" /> Image
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileScan} />
                <button
                  onClick={startScanner}
                  className="flex-1 flex items-center justify-center gap-2 h-11 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Démarrer caméra
                </button>
              </div>
            </div>

            {/* Product search list */}
            <div className="rounded-2xl bg-white border border-border/50 shadow-card flex flex-col min-h-0 flex-1">
              <div className="p-3 border-b border-slate-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher un produit…"
                    className="pl-9 rounded-xl bg-slate-50 border-border/60"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: 360 }}>
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                    <PackageSearch className="h-8 w-8 mb-2" />
                    <p className="text-xs">Aucun produit trouvé</p>
                  </div>
                ) : filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => _addToCart(p)}
                  >
                    <div className="h-9 w-9 relative bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {p.image
                        ? <Image src={p.image} alt={p.name} fill className="object-cover" />
                        : <Box className="h-4 w-4 text-slate-300 m-auto" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-indigo-600 font-bold">{formatCurrency(p.salePrice)}</p>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Cart + Checkout */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
            <div className="rounded-2xl bg-white border border-border/50 shadow-card flex flex-col flex-1 min-h-0 overflow-hidden">

              {/* Cart header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                  <ShoppingCart className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900">Panier</span>
                  <span className="text-xs text-slate-400 ml-2">{cart.length} article{cart.length > 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-slate-300">
                    <PackageSearch className="h-14 w-14 mb-3 opacity-50" />
                    <p className="text-sm font-medium">Le panier est vide</p>
                    <p className="text-xs mt-1">Scannez ou recherchez un produit</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">

                        <div className="h-11 w-11 relative bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                          {item.product.image
                            ? <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
                            : <Box className="h-5 w-5 text-slate-300 m-auto" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">{formatCurrency(getItemPrice(item))} / {item.soldByWeight ? "kg" : "unité"}</span>
                            {item.product.canBeSoldByWeight && (
                              <button
                                onClick={() => toggleWeightMode(item.product.id)}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors",
                                  item.soldByWeight ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}
                              >
                                {item.soldByWeight ? "kg" : "Unité"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quantity control */}
                        <div className="flex-shrink-0">
                          {item.soldByWeight ? (
                            <div className="relative">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(e) => {
                                  const v = e.target.value.replace(",", ".");
                                  if (v === "" || /^\d*\.?\d*$/.test(v)) setWeightValue(item.product.id, v);
                                }}
                                onBlur={() => {
                                  const n = parseFloat(String(item.quantity)) || 0;
                                  setWeightValue(item.product.id, Math.max(0.01, n));
                                }}
                                className="h-9 w-20 text-center text-sm font-bold pr-7 rounded-xl"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">kg</span>
                            </div>
                          ) : (
                            <div className="flex items-center h-9 bg-white border border-border/60 rounded-xl overflow-hidden">
                              <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2.5 h-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-r border-border/60">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2.5 h-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-l border-border/60">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="w-20 text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(getItemTotal(item))}</p>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkout footer */}
              <div className="border-t border-slate-100 p-5 space-y-4 flex-shrink-0 bg-white">

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Total à payer</span>
                  <span className="text-3xl font-black text-indigo-600">{formatCurrency(calculateTotal())}</span>
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paiement</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-border/60 font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Espèces</SelectItem>
                        <SelectItem value="CARD">Carte</SelectItem>
                        <SelectItem value="TRANSFER">Virement</SelectItem>
                        <SelectItem value="OTHER">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Espèces reçues</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        placeholder={paymentMethod === "CASH" ? "0.00" : "—"}
                        value={cashReceived || ""}
                        onChange={(e) => setCashReceived(Number(e.target.value))}
                        disabled={paymentMethod !== "CASH"}
                        className="pl-9 h-11 text-base font-bold rounded-xl bg-slate-50 border-border/60 disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Change */}
                {paymentMethod === "CASH" && cashReceived > 0 && (
                  <div className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-2.5",
                    cashReceived >= calculateTotal() ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"
                  )}>
                    <span className="text-xs font-medium text-slate-600">Rendu monnaie</span>
                    <span className={cn("text-lg font-black", cashReceived >= calculateTotal() ? "text-emerald-600" : "text-red-500")}>
                      {formatCurrency(Math.max(0, cashReceived - calculateTotal()))}
                    </span>
                  </div>
                )}

                {/* Validate button */}
                <Button
                  className="w-full h-14 text-base font-black rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-0 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50 gap-3"
                  disabled={cart.length === 0 || submitting}
                  onClick={finalizeOrder}
                >
                  {submitting
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <CheckCircle2 className="h-5 w-5" />
                  }
                  VALIDER LA VENTE
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
