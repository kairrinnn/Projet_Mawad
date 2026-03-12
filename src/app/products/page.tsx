"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, QrCode, Ticket, PackageSearch, Tag, Layers, Search, Pencil, Trash2, AlertCircle, Camera, ImagePlus, X, Barcode, ScanLine, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openQR, setOpenQR] = useState(false);
  const [openBarcodeScanner, setOpenBarcodeScanner] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const qrRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedViewImage, setSelectedViewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    salePrice: "", 
    costPrice: "", 
    stock: "", 
    category: "", 
    description: "", 
    supplierId: "none",
    image: "",
    barcode: "" 
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
    try {
      const [prodRes, suppRes] = await Promise.all([
        fetch("/api/products", { cache: 'no-store' }),
        fetch("/api/suppliers", { cache: 'no-store' })
      ]);
      const [prodData, suppData] = await Promise.all([
        prodRes.json(),
        suppRes.json()
      ]);
      
      if (Array.isArray(prodData)) {
        setProducts(prodData);
      } else if (prodData.error) {
        console.error("Products error:", prodData.error);
        setProducts([]);
      }

      if (Array.isArray(suppData)) {
        setSuppliers(suppData);
      } else if (suppData.error) {
        console.error("Suppliers error:", suppData.error);
        setSuppliers([]);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
        cache: 'no-store'
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, image: data.url }));
        setPreview(data.url);
        toast.success("Image téléchargée !");
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

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      if (res.ok) {
        setFormData({ 
          name: "", 
          salePrice: "", 
          costPrice: "", 
          stock: "", 
          category: "", 
          description: "", 
          supplierId: "none", 
          image: "",
          barcode: ""
        });
        setPreview(null);
        setOpenAdd(false);
        toast.success("Produit ajouté !");
        fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Erreur lors de l'ajout.");
      }
    } catch (error) {
      console.error("Error creating product", error);
      toast.error("Erreur lors de l'ajout.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);

    const payload = {
        ...formData,
        supplierId: formData.supplierId === "none" ? null : formData.supplierId
    };

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      if (res.ok) {
        setOpenEdit(false);
        toast.success("Produit mis à jour !");
        fetchData();
      }
    } catch (error) {
      console.error("Error updating product", error);
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "DELETE",
        cache: 'no-store'
      });
      if (res.ok) {
        setOpenDelete(false);
        toast.success("Produit supprimé !");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression.");
      }
    } catch (error) {
      console.error("Error deleting product", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      salePrice: product.salePrice.toString(),
      costPrice: product.costPrice.toString(),
      stock: product.stock.toString(),
      category: product.category || "",
      description: product.description || "",
      supplierId: product.supplierId || "none",
      image: product.image || "",
      barcode: product.barcode || ""
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
        
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger render={(props) => (
            <Button className="bg-indigo-600 hover:bg-indigo-700" {...props}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Produit
            </Button>
          )} />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajouter un produit</DialogTitle>
              <DialogDescription>
                Remplissez les informations essentielles du produit. Le QR code sera généré automatiquement.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right text-slate-600">Nom *</Label>
                  <div className="col-span-3 flex gap-2">
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="flex-1 border-slate-200" 
                      required 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={startBarcodeScanner}
                      className="shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      title="Scanner un code-barres"
                    >
                      <Barcode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-slate-600">Photo</Label>
                  <div className="col-span-3 flex items-center gap-4">
                    <div 
                      className="relative h-24 w-24 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {preview ? (
                        <>
                          <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreview(null);
                              setFormData(prev => ({ ...prev, image: "" }));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          {uploading ? (
                            <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                          ) : (
                            <>
                              <Camera className="h-6 w-6 mb-1" />
                              <span className="text-[10px]">Photo / Cam</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*"
                      capture="environment" // Force la caméra arrière sur mobile
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {!preview && (
                      <div className="text-xs text-slate-500">
                        Cliquez pour prendre une photo ou choisir un fichier.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="barcode" className="text-right text-slate-600">Code-Barre</Label>
                  <Input 
                    id="barcode" 
                    value={formData.barcode}
                    onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    placeholder="EAN-13, UPC..."
                    className="col-span-3 border-slate-200" 
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right text-slate-600">Catégorie</Label>
                  <Input 
                    id="category" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="col-span-3 border-slate-200" 
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stock" className="text-right text-slate-600">Stock initial</Label>
                  <Input 
                    id="stock" 
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="col-span-3 border-slate-200" 
                    min="0"
                  />
                </div>
                
                <div className="grid gap-4 grid-cols-2 mt-2 border-t border-slate-100 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice" className="text-slate-600">Prix d'Achat (DH) *</Label>
                      <Input 
                        id="costPrice" 
                        type="number" 
                        step="0.01"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                        className="border-slate-200"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="salePrice" className="text-slate-600">Prix de Vente (DH) *</Label>
                      <Input 
                        id="salePrice" 
                        type="number" 
                        step="0.01"
                        value={formData.salePrice}
                        onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                        className="border-slate-200"
                        required 
                      />
                    </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4 mt-2">
                  <Label htmlFor="supplier" className="text-right text-slate-600">Fournisseur</Label>
                  <div className="col-span-3">
                    <Select 
                      value={formData.supplierId} 
                      onValueChange={(val: string | null) => setFormData({...formData, supplierId: val || "none"})}
                    >
                      <SelectTrigger className="border-slate-200">
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun fournisseur (Interne)</SelectItem>
                        {suppliers.length > 0 && suppliers.map(sup => (
                           <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? "Création en cours..." : "Créer le produit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal d'agrandissement d'image */}
        <Dialog open={!!selectedViewImage} onOpenChange={() => setSelectedViewImage(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
            {selectedViewImage && (
              <div className="relative group max-h-[80vh] max-w-full">
                <img 
                  src={selectedViewImage} 
                  alt="Agrandissement" 
                  className="rounded-lg shadow-2xl max-h-[80vh] w-auto h-auto object-contain bg-white" 
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

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Prix Achat</TableHead>
              <TableHead className="text-right">Prix Vente</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Chargement de l'inventaire...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                   <div className="flex flex-col items-center justify-center text-slate-500 space-y-3">
                      <PackageSearch className="h-10 w-10 text-slate-300" />
                      <p>Aucun produit trouvé.</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded bg-slate-100 border overflow-hidden flex-shrink-0 cursor-zoom-in hover:opacity-80 transition-opacity"
                        onClick={() => product.image && setSelectedViewImage(product.image)}
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                             <PackageSearch className="h-5 w-5 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-900">{product.name}</span>
                        {product.supplier && (
                          <span className="text-xs text-slate-500 line-clamp-1">{product.supplier.name}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-normal">
                         {product.category}
                      </Badge>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                     {formatCurrency(product.costPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                     {formatCurrency(product.salePrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={product.stock <= 5 
                        ? "border-red-200 bg-red-50 text-red-700" 
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"}
                    >
                      {product.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedProduct(product);
                          setOpenQR(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 w-8 p-0"
                        title="Voir QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditModal(product)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8 w-8 p-0"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedProduct(product);
                          setOpenDelete(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
              Télécharger l'étiquette
            </Button>
            <Button variant="outline" onClick={() => setOpenQR(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Édition */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du produit. Les changements seront instantanés.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right text-slate-600">Nom *</Label>
                <Input 
                  id="edit-name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3 border-slate-200" 
                  required 
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-slate-600">Photo</Label>
                <div className="col-span-3 flex items-center gap-4">
                  <div 
                    className="relative h-24 w-24 rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    {preview ? (
                      <>
                        <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreview(null);
                            setFormData(prev => ({ ...prev, image: "" }));
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        {uploading ? (
                          <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <>
                            <Camera className="h-6 w-6 mb-1" />
                            <span className="text-[10px]">Photo / Cam</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Input 
                    type="file" 
                    ref={editFileInputRef}
                    className="hidden" 
                    accept="image/*"
                    capture="environment" // Force la caméra arrière sur mobile
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-barcode" className="text-right text-slate-600">Code-Barre</Label>
                <Input 
                  id="edit-barcode" 
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  placeholder="EAN-13, UPC..."
                  className="col-span-3 border-slate-200" 
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right text-slate-600">Catégorie</Label>
                <Input 
                  id="edit-category" 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="col-span-3 border-slate-200" 
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-stock" className="text-right text-slate-600">Stock</Label>
                <Input 
                  id="edit-stock" 
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  className="col-span-3 border-slate-200" 
                  min="0"
                />
              </div>
              
              <div className="grid gap-4 grid-cols-2 mt-2 border-t border-slate-100 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-costPrice" className="text-slate-600">Prix d'Achat (DH) *</Label>
                    <Input 
                      id="edit-costPrice" 
                      type="number" 
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                      className="border-slate-200"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="edit-salePrice" className="text-slate-600">Prix de Vente (DH) *</Label>
                    <Input 
                      id="edit-salePrice" 
                      type="number" 
                      step="0.01"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                      className="border-slate-200"
                      required 
                    />
                  </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mt-2">
                <Label htmlFor="edit-supplier" className="text-right text-slate-600">Fournisseur</Label>
                <div className="col-span-3">
                  <Select 
                    value={formData.supplierId} 
                    onValueChange={(val: string | null) => setFormData({...formData, supplierId: val || "none"})}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun fournisseur (Interne)</SelectItem>
                      {suppliers.length > 0 && suppliers.map(sup => (
                         <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {submitting ? "Mise à jour..." : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
        <Dialog open={openBarcodeScanner} onOpenChange={(val) => { if(!val) stopBarcodeScanner(); }}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none">
            <div className="relative h-[400px] flex flex-col items-center justify-center">
              <div id="barcode-scanner-ui" className="w-full h-full [&_video]:object-cover [&_#qr-shaded-region]:!border-none [&_#qr-shaded-region_div]:!border-none flex items-center justify-center overflow-hidden" />
              
              {/* Overlay Viseur Barcode (Style ScanPage) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-[260px] h-[180px]">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500" />
                      
                      <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-indigo-500/30 animate-pulse" />
                  </div>
              </div>

              <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                <Badge variant="secondary" className="bg-indigo-600 text-white border-none px-3 py-1 flex items-center gap-2">
                   <ScanLine className="h-3 w-3 animate-pulse" />
                   Visez un code-barres
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="bg-black/50 text-white hover:bg-black pointer-events-auto rounded-full"
                  onClick={stopBarcodeScanner}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {scanningBarcode && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                   <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 text-white/80 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Recherche universelle active...
                   </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
