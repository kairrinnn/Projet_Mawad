"use client";

import { useEffect, useState, useRef } from "react";
import NextImage from "next/image";
import { apiRequest } from "@/lib/api";
import { Search, AlertCircle, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { CategoryManager } from "@/components/products/CategoryManager";
import { StockHistoryDialog } from "@/components/products/StockHistoryDialog";
import { ProductTable } from "@/components/products/ProductTable";
import { BarcodeScannerDialog } from "@/components/products/BarcodeScannerDialog";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface Supplier {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  category: string | null;
  categoryId: string | null;
  description: string | null;
  supplierId: string | null;
  image: string | null;
  canBeSoldByWeight: boolean;
  weightSalePrice: number | null;
  weightCostPrice: number | null;
  supplier?: Supplier | null;
}

interface StockMovement {
  id: string;
  createdAt: string;
  type: string;
  quantity: number;
  oldStock: number;
  newStock: number;
  reason: string | null;
}

interface ProductFormState {
  name: string;
  salePrice: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
  category: string;
  categoryId: string;
  description: string;
  supplierId: string;
  image: string;
  barcode: string;
  canBeSoldByWeight: boolean;
  weightSalePrice: string;
  weightCostPrice: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openCategories, setOpenCategories] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [openQR, setOpenQR] = useState(false);
  const [openBarcodeScanner, setOpenBarcodeScanner] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const qrRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedViewImage, setSelectedViewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormState>({
    name: "", 
    salePrice: "", 
    costPrice: "", 
    stock: "", 
    lowStockThreshold: "5",
    category: "", 
    categoryId: "none",
    description: "", 
    supplierId: "none",
    image: "",
    barcode: "",
    canBeSoldByWeight: false,
    weightSalePrice: "",
    weightCostPrice: ""
  });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isInitializingScanner = useRef(false);

  const startBarcodeScanner = async () => {
    if (isInitializingScanner.current) return;
    isInitializingScanner.current = true;
    
    try {
      setOpenBarcodeScanner(true);
      setScanningBarcode(true);
      
      // Petit délai pour laisser le modal s'ouvrir
      setTimeout(async () => {
        // Nettoyage préventif pour éviter le dédoublage caméra
        const container = document.getElementById("barcode-scanner-ui");
        if (container) container.innerHTML = "";
        
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) await html5QrCodeRef.current.stop();
            html5QrCodeRef.current.clear();
          } catch (e) { console.warn(e); }
        }

        const scanner = new Html5Qrcode("barcode-scanner-ui");
        html5QrCodeRef.current = scanner;
        
        await scanner.start(
          { facingMode: "environment" },
          { 
            fps: 20, 
            qrbox: { width: 260, height: 180 }
          },
          (decodedText) => {
            handleBarcodeDetected(decodedText);
            stopBarcodeScanner();
          },
          () => {}
        );
      }, 300);
    } catch (err) {
      console.error(err);
      toast.error("Erreur d'accès à la caméra.");
      setOpenBarcodeScanner(false);
    } finally {
      isInitializingScanner.current = false;
    }
  };

  const stopBarcodeScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
    }
    setOpenBarcodeScanner(false);
    setScanningBarcode(false);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    toast.info(`Code détecté: ${barcode}. Recherche...`);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      
      if (data.status === 1 && data.product) {
        const prod = data.product;
        setFormData(prev => ({
          ...prev,
          name: prod.product_name || prev.name,
          barcode: barcode || prev.barcode,
          category: prod.categories_tags?.[0]?.split(':')[1]?.replace(/-/g, ' ') || prev.category,
          description: prod.generic_name || prev.description,
          image: prod.image_url || prev.image
        }));
        if (prod.image_url) setPreview(prod.image_url);
        toast.success("Produit trouvé sur Open Food Facts !");
      } else {
        // Essayer Open Products Facts si pas trouvé sur Food
        const res2 = await fetch(`https://world.openproductsfacts.org/api/v0/product/${barcode}.json`);
        const data2 = await res2.json();
        if (data2.status === 1 && data2.product) {
          const prod = data2.product;
        setFormData(prev => ({
          ...prev,
          name: prod.product_name || prev.name,
          barcode: barcode || prev.barcode,
          category: prev.category,
          image: prod.image_url || prev.image
        }));
          if (prod.image_url) setPreview(prod.image_url);
          toast.success("Produit trouvé sur Open Products Facts !");
        } else {
        toast.error("Produit non répertorié. Saisie manuelle requise.");
        setFormData(prev => ({ ...prev, name: `Produit ${barcode}`, barcode: barcode }));
      }
      }
    } catch (error) {
      toast.error("Erreur de recherche API.");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, suppRes, catRes] = await Promise.all([
      apiRequest<Product[]>("/api/products", { cache: 'no-store' }),
      apiRequest<Supplier[]>("/api/suppliers", { cache: 'no-store' }),
      apiRequest<Category[]>("/api/categories", { cache: 'no-store' })
    ]);
    
    if (!prodRes.error && prodRes.data) setProducts(prodRes.data);
    if (!suppRes.error && suppRes.data) setSuppliers(suppRes.data);
    if (!catRes.error && catRes.data) setCategories(catRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 1024;
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          }, "image/jpeg", 0.7);
        };
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compresser l'image avant l'upload (réduit la taille de ~90%)
      const compressedBlob = await compressImage(file);
      const formDataUpload = new FormData();
      formDataUpload.append("file", compressedBlob, "product.jpg");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
        cache: 'no-store'
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, image: data.url }));
        setPreview(data.url);
        toast.success("Image optimisée et téléchargée !");
      } else {
        toast.error(data.error || "Erreur lors de l'upload");
      }
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
        ...formData,
        supplierId: formData.supplierId === "none" ? null : formData.supplierId
    }

    const { error } = await apiRequest("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!error) {
      setFormData({ 
        name: "", 
        salePrice: "", 
        costPrice: "", 
        stock: "", 
        lowStockThreshold: "5",
        category: "", 
        categoryId: "none",
        description: "", 
        supplierId: "none", 
        image: "",
        barcode: "",
        canBeSoldByWeight: false,
        weightSalePrice: "",
        weightCostPrice: ""
      });
      setPreview(null);
      setOpenAdd(false);
      toast.success("Produit ajouté !");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);

    const payload = {
        ...formData,
        supplierId: formData.supplierId === "none" ? null : formData.supplierId
    };

    const { error } = await apiRequest(`/api/products/${selectedProduct.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!error) {
      setOpenEdit(false);
      toast.success("Produit mis à jour !");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);

    const { error } = await apiRequest(`/api/products/${selectedProduct.id}`, {
      method: "DELETE",
      cache: 'no-store'
    });

    if (!error) {
      setOpenDelete(false);
      toast.success("Produit supprimé !");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setSubmitting(true);
    const { error } = await apiRequest("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: newCatName.trim() }),
      cache: "no-store",
    });
    if (!error) {
      toast.success("Catégorie ajoutée !");
      setNewCatName("");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;
    setSubmitting(true);
    const { error } = await apiRequest(`/api/categories?id=${id}`, {
      method: "DELETE",
      cache: "no-store",
    });
    if (!error) {
      toast.success("Catégorie supprimée !");
      fetchData();
    }
    setSubmitting(false);
  };

  const fetchStockHistory = async (productId: string) => {
    const { data: movements, error } = await apiRequest<StockMovement[]>(`/api/stock-movements?productId=${productId}`, { cache: "no-store" });
    if (!error && movements) {
      setStockHistory(movements);
    }
  };

  const openHistoryModal = (product: Product) => {
    setSelectedProduct(product);
    setStockHistory([]);
    fetchStockHistory(product.id);
    setOpenHistory(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      salePrice: product.salePrice.toString(),
      costPrice: product.costPrice.toString(),
      stock: product.stock.toString(),
      lowStockThreshold: (product.lowStockThreshold || 5).toString(),
      category: product.category || "",
      categoryId: product.categoryId || "none",
      description: product.description || "",
      supplierId: product.supplierId || "none",
      image: product.image || "",
      barcode: product.barcode || "",
      canBeSoldByWeight: product.canBeSoldByWeight || false,
      weightSalePrice: product.weightSalePrice?.toString() || "",
      weightCostPrice: product.weightCostPrice?.toString() || ""
    });
    setPreview(product.image || null);
    setOpenEdit(true);
  };

  const handlePrintQR = () => {
    if (!qrRef.current || !selectedProduct) return;
    
    // Convertir le SVG en URL de données (Data URI)
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Créer l'URL du PNG et déclencher le téléchargement
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR_${selectedProduct.name.replace(/\s+/g, "_")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'MAD' 
    }).format(val);
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Produits & Stock</h2>
          <p className="text-slate-500">Gérez votre inventaire et générez vos QR codes.</p>
        </div>
        
        <ProductFormDialog
          open={openAdd}
          onOpenChange={setOpenAdd}
          title="Ajouter un produit"
          description="Remplissez les informations essentielles du produit. Le QR code sera généré automatiquement."
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          submitting={submitting}
          categories={categories}
          suppliers={suppliers}
          onStartScanner={startBarcodeScanner}
          onFileUpload={handleFileUpload}
          uploading={uploading}
          preview={preview}
          setPreview={setPreview}
          fileInputRef={fileInputRef}
        />

        {/* Modal d'agrandissement d'image */}
        <Dialog open={!!selectedViewImage} onOpenChange={() => setSelectedViewImage(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
            {selectedViewImage && (
              <div className="relative group min-h-[300px] w-full max-h-[80vh]">
                <NextImage 
                  src={selectedViewImage} 
                  alt="Agrandissement" 
                  fill
                  className="rounded-lg shadow-2xl object-contain bg-white" 
                />
                <Button 
                  onClick={() => setSelectedViewImage(null)}
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 bg-white/50 hover:bg-white text-slate-900 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            className="pl-9 bg-white" 
            placeholder="Rechercher un produit..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ProductTable 
        products={filteredProducts}
        loading={loading}
        onViewQR={(p) => { setSelectedProduct(p); setOpenQR(true); }}
        onHistory={openHistoryModal}
        onEdit={openEditModal}
        onDelete={(p) => { setSelectedProduct(p); setOpenDelete(true); }}
        onViewImage={setSelectedViewImage}
        formatCurrency={formatCurrency}
      />

      {/* Modal QR Code */}
      <Dialog open={openQR} onOpenChange={setOpenQR}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center py-10">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-2xl text-center">QR Code Produit</DialogTitle>
            <DialogDescription className="text-center">
              {selectedProduct?.name} ({formatCurrency(selectedProduct?.salePrice || 0)})
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white p-8 rounded-xl shadow-md border-2 border-slate-100 mb-6 flex flex-col items-center justify-center">
            {selectedProduct && selectedProduct.id && (
              <>
                <div className="mb-4">
                  <QRCodeSVG 
                    value={selectedProduct.id} 
                    size={220}
                    level="H"
                    includeMargin={true}
                    ref={qrRef}
                  />
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  ID: {selectedProduct.id}
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="w-full gap-2 sm:flex-row !flex-col !items-stretch">
            <Button onClick={handlePrintQR} className="bg-indigo-600 hover:bg-indigo-700">
              Télécharger l&apos;étiquette
            </Button>
            <Button variant="outline" onClick={() => setOpenQR(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Édition */}
        <ProductFormDialog
          open={openEdit}
          onOpenChange={setOpenEdit}
          title="Modifier le produit"
          description="Mettez à jour les informations du produit. Les changements seront instantanés."
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEdit}
          submitting={submitting}
          categories={categories}
          suppliers={suppliers}
          onStartScanner={startBarcodeScanner}
          onFileUpload={handleFileUpload}
          uploading={uploading}
          preview={preview}
          setPreview={setPreview}
          fileInputRef={editFileInputRef}
        />

      {/* Modal Suppression */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Confirmer la suppression</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Êtes-vous sûr de vouloir supprimer le produit **{selectedProduct?.name}** ? <br/>
              Cette action est irréversible et pourrait affecter vos historiques.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center mt-4">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        {/* Modal Scanner de Code-Barres Universel */}
        <BarcodeScannerDialog
          open={openBarcodeScanner}
          onOpenChange={(val) => { if(!val) stopBarcodeScanner(); }}
          onStop={stopBarcodeScanner}
          scanning={scanningBarcode}
        />

        <CategoryManager 
          open={openCategories}
          onOpenChange={setOpenCategories}
          categories={categories}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          submitting={submitting}
        />

        <StockHistoryDialog 
          open={openHistory}
          onOpenChange={setOpenHistory}
          productName={selectedProduct?.name}
          history={stockHistory}
        />
    </div>
  );
}
