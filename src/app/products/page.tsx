"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import {
  AlertCircle,
  Boxes,
  FileSpreadsheet,
  Package,
  Plus,
  Scale,
  Search,
  Sparkles,
  Tags,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/lib/api";
import { BarcodeScannerDialog } from "@/components/products/BarcodeScannerDialog";
import { CategoryManager } from "@/components/products/CategoryManager";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { ProductImportDialog } from "@/components/products/ProductImportDialog";
import { ProductTable } from "@/components/products/ProductTable";
import { StockHistoryDialog } from "@/components/products/StockHistoryDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

const emptyForm: ProductFormState = {
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
  weightCostPrice: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
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
  const qrRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedViewImage, setSelectedViewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormState>(emptyForm);
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

      setTimeout(async () => {
        const container = document.getElementById("barcode-scanner-ui");
        if (container) container.innerHTML = "";

        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            html5QrCodeRef.current.clear();
          } catch (error) {
            console.warn(error);
          }
        }

        const scanner = new Html5Qrcode("barcode-scanner-ui");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 20, qrbox: { width: 260, height: 180 } },
          (decodedText) => {
            handleBarcodeDetected(decodedText);
            stopBarcodeScanner();
          },
          () => {}
        );
      }, 300);
    } catch (error) {
      console.error(error);
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
    toast.info(`Code détecté: ${barcode}. Recherche en cours...`);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        setFormData((current) => ({
          ...current,
          name: product.product_name || current.name,
          barcode: barcode || current.barcode,
          category:
            product.categories_tags?.[0]?.split(":")[1]?.replace(/-/g, " ") ||
            current.category,
          description: product.generic_name || current.description,
          image: product.image_url || current.image,
        }));
        if (product.image_url) setPreview(product.image_url);
        toast.success("Produit trouvé sur Open Food Facts.");
        return;
      }

      const fallbackResponse = await fetch(
        `https://world.openproductsfacts.org/api/v0/product/${barcode}.json`
      );
      const fallbackData = await fallbackResponse.json();

      if (fallbackData.status === 1 && fallbackData.product) {
        const product = fallbackData.product;
        setFormData((current) => ({
          ...current,
          name: product.product_name || current.name,
          barcode: barcode || current.barcode,
          category: current.category,
          image: product.image_url || current.image,
        }));
        if (product.image_url) setPreview(product.image_url);
        toast.success("Produit trouvé sur Open Products Facts.");
        return;
      }

      toast.error("Produit non répertorié. Saisie manuelle requise.");
      setFormData((current) => ({
        ...current,
        name: `Produit ${barcode}`,
        barcode,
      }));
    } catch {
      toast.error("Erreur de recherche API.");
    }
  };

  const fetchData = async () => {
    setLoading(true);

    const [productsResponse, suppliersResponse, categoriesResponse] = await Promise.all([
      apiRequest<Product[]>("/api/products", { cache: "no-store" }),
      apiRequest<Supplier[]>("/api/suppliers", { cache: "no-store" }),
      apiRequest<Category[]>("/api/categories", { cache: "no-store" }),
    ]);

    if (!productsResponse.error && productsResponse.data) {
      setProducts(productsResponse.data);
    }
    if (!suppliersResponse.error && suppliersResponse.data) {
      setSuppliers(suppliersResponse.data);
    }
    if (!categoriesResponse.error && categoriesResponse.data) {
      setCategories(categoriesResponse.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const image = new Image();
        image.src = event.target?.result as string;
        image.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = image;
          const maxWidth = 1024;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Compression failed"));
            },
            "image/jpeg",
            0.7
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const compressedBlob = await compressImage(file);
      const payload = new FormData();
      payload.append("file", compressedBlob, "product.jpg");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: payload,
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok) {
        setFormData((current) => ({ ...current, image: data.url }));
        setPreview(data.url);
        toast.success("Image optimisée et téléversée.");
      } else {
        toast.error(data.error || "Erreur lors de l'upload");
      }
    } catch {
      toast.error("Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      supplierId: formData.supplierId === "none" ? null : formData.supplierId,
    };

    const { error } = await apiRequest("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!error) {
      setFormData(emptyForm);
      setPreview(null);
      setOpenAdd(false);
      toast.success("Produit ajouté.");
      fetchData();
    }

    setSubmitting(false);
  };

  const handleEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);

    const payload = {
      ...formData,
      supplierId: formData.supplierId === "none" ? null : formData.supplierId,
    };

    const { error } = await apiRequest(`/api/products/${selectedProduct.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!error) {
      setOpenEdit(false);
      toast.success("Produit mis à jour.");
      fetchData();
    }

    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setSubmitting(true);

    const { error } = await apiRequest(`/api/products/${selectedProduct.id}`, {
      method: "DELETE",
      cache: "no-store",
    });

    if (!error) {
      setOpenDelete(false);
      toast.success("Produit archivé.");
      fetchData();
    }

    setSubmitting(false);
  };

  const handleAddCategory = async (name: string) => {
    if (!name.trim()) return;

    setSubmitting(true);

    const { error } = await apiRequest("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
      cache: "no-store",
    });

    if (!error) {
      toast.success("Catégorie ajoutée.");
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
      toast.success("Catégorie supprimée.");
      fetchData();
    }

    setSubmitting(false);
  };

  const fetchStockHistory = async (productId: string) => {
    const { data, error } = await apiRequest<StockMovement[]>(
      `/api/stock-movements?productId=${productId}`,
      { cache: "no-store" }
    );

    if (!error && data) {
      setStockHistory(data);
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
      weightCostPrice: product.weightCostPrice?.toString() || "",
    });
    setPreview(product.image || null);
    setOpenEdit(true);
  };

  const handlePrintQR = () => {
    if (!qrRef.current || !selectedProduct) return;

    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const image = new Image();

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;

      if (context) {
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);

        const pngFile = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `QR_${selectedProduct.name.replace(/\s+/g, "_")}.png`;
        link.href = pngFile;
        link.click();
      }
    };

    image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter((product) => {
    const query = searchTerm.toLowerCase();

    return (
      product.name.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.supplier?.name?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "MAD",
    }).format(value);

  const lowStockCount = products.filter((product) => product.stock <= product.lowStockThreshold).length;
  const totalInventoryValue = products.reduce(
    (sum, product) => sum + product.stock * product.costPrice,
    0
  );
  const totalPotentialRevenue = products.reduce(
    (sum, product) => sum + product.stock * product.salePrice,
    0
  );
  const weightedProductsCount = products.filter((product) => product.canBeSoldByWeight).length;
  const visibleProductsCount = filteredProducts.length;
  const grossPotentialMargin = totalPotentialRevenue - totalInventoryValue;
  const heroMetrics = [
    {
      label: "Capital stock",
      value: formatCurrency(totalInventoryValue),
      icon: Boxes,
      tone: "bg-white/12 text-white ring-1 ring-white/12",
    },
    {
      label: "Marge potentielle",
      value: formatCurrency(grossPotentialMargin),
      icon: Sparkles,
      tone: "bg-white/12 text-white ring-1 ring-white/12",
    },
    {
      label: "Vente au poids",
      value: `${weightedProductsCount} référence${weightedProductsCount > 1 ? "s" : ""}`,
      icon: Scale,
      tone: "bg-white/12 text-white ring-1 ring-white/12",
    },
    {
      label: "Alertes stock",
      value: `${lowStockCount} produit${lowStockCount > 1 ? "s" : ""}`,
      icon: TriangleAlert,
      tone:
        lowStockCount > 0
          ? "bg-rose-500/18 text-white ring-1 ring-rose-200/25"
          : "bg-emerald-500/18 text-white ring-1 ring-emerald-200/25",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-hero rounded-[2rem] px-6 py-6 text-white shadow-[0_28px_70px_rgba(79,70,229,0.28)] sm:px-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
              <Package className="size-3.5" />
              Inventory control
            </span>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Produits &amp; Stock
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
                Orchestre le catalogue, les seuils critiques et les marges depuis une vue
                unique pensée pour un usage retail rapide, lisible et premium.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="command-pill border-white/15 bg-white/10 text-white/90">
                {products.length} référence{products.length > 1 ? "s" : ""} au catalogue
              </span>
              <span className="command-pill border-white/15 bg-white/10 text-white/90">
                {visibleProductsCount} visible{visibleProductsCount > 1 ? "s" : ""}
              </span>
              <span className="command-pill border-white/15 bg-white/10 text-white/90">
                {lowStockCount > 0
                  ? `${lowStockCount} produit${lowStockCount > 1 ? "s" : ""} en alerte`
                  : "Aucune alerte critique"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[460px]">
            {heroMetrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <div key={metric.label} className={`rounded-[1.5rem] p-4 ${metric.tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                      {metric.label}
                    </p>
                    <Icon className="size-4 text-white/85" />
                  </div>
                  <p className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                    {loading ? "--" : metric.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="surface-card rounded-[1.75rem] p-4 sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full max-w-2xl space-y-3">
            <div className="space-y-1">
              <p className="eyebrow-label">Command center</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Pilote l&apos;inventaire en temps réel
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Recherche rapide, import, nouvelles références et gestion des catégories
                depuis une seule barre de commande.
              </p>
            </div>

            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 pl-11"
                placeholder="Rechercher un produit, une catégorie ou un fournisseur..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loading
                ? "Chargement de l'inventaire..."
                : searchTerm
                  ? `${visibleProductsCount} résultat${visibleProductsCount > 1 ? "s" : ""} pour "${searchTerm}".`
                  : `Vue complète de ${products.length} produit${products.length > 1 ? "s" : ""} avec alertes, marges et actions rapides.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenCategories(true)}
            >
              <Tags className="size-4" />
              Catégories
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenImport(true)}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-200"
            >
              <FileSpreadsheet className="size-4" />
              Importer Excel
            </Button>
            <Button type="button" onClick={() => setOpenAdd(true)}>
              <Plus className="size-4" />
              Ajouter un produit
            </Button>
          </div>
        </div>
      </section>

      <ProductTable
        products={filteredProducts}
        loading={loading}
        onViewQR={(product) => {
          setSelectedProduct(product);
          setOpenQR(true);
        }}
        onHistory={openHistoryModal}
        onEdit={openEditModal}
        onDelete={(product) => {
          setSelectedProduct(product);
          setOpenDelete(true);
        }}
        onViewImage={setSelectedViewImage}
        formatCurrency={formatCurrency}
      />

      <ProductFormDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        title="Ajouter un produit"
        description="Remplissez les informations essentielles. Le QR code sera généré automatiquement."
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

      <ProductFormDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        title="Modifier le produit"
        description="Mettez à jour les informations. Les changements seront instantanés."
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

      <Dialog
        open={!!selectedViewImage}
        onOpenChange={() => setSelectedViewImage(null)}
      >
        <DialogContent className="flex max-w-3xl items-center justify-center overflow-hidden border-none bg-transparent p-0 shadow-none">
          {selectedViewImage ? (
            <div className="relative min-h-[320px] w-full max-h-[80vh]">
              <NextImage
                src={selectedViewImage}
                alt="Agrandissement produit"
                fill
                className="rounded-[1.75rem] bg-white object-contain shadow-2xl"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedViewImage(null)}
                className="absolute right-3 top-3 rounded-full bg-white/85 text-slate-900 backdrop-blur-sm hover:bg-white"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={openQR} onOpenChange={setOpenQR}>
        <DialogContent className="flex flex-col items-center py-8 sm:max-w-sm">
          <DialogHeader className="mb-4 w-full text-center">
            <DialogTitle className="text-center text-xl">QR Code produit</DialogTitle>
            <DialogDescription className="text-center">
              {selectedProduct?.name} · {formatCurrency(selectedProduct?.salePrice || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-border/50 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:bg-slate-50">
            {selectedProduct?.id ? (
              <>
                <QRCodeSVG
                  value={selectedProduct.id}
                  size={200}
                  level="H"
                  includeMargin
                  ref={qrRef}
                />
                <p className="rounded-lg bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-500">
                  {selectedProduct.id}
                </p>
              </>
            ) : null}
          </div>

          <DialogFooter className="w-full gap-2">
            <Button type="button" onClick={handlePrintQR} className="w-full">
              Télécharger l&apos;étiquette
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenQR(false)}
              className="w-full"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mb-4 flex justify-center">
              <div className="rounded-2xl bg-amber-100 p-3.5 dark:bg-amber-500/20">
                <AlertCircle className="size-6 text-amber-600 dark:text-amber-200" />
              </div>
            </div>
            <DialogTitle className="text-center">Archiver le produit</DialogTitle>
            <DialogDescription className="pt-1 text-center">
              <strong>{selectedProduct?.name}</strong> disparaîtra de la liste active et de
              la caisse. Son historique de ventes et de stock restera conservé.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenDelete(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {submitting ? "Archivage..." : "Archiver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={openBarcodeScanner}
        onOpenChange={(value) => {
          if (!value) stopBarcodeScanner();
        }}
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
      <ProductImportDialog
        open={openImport}
        onOpenChange={setOpenImport}
        onImportComplete={fetchData}
      />
    </div>
  );
}
