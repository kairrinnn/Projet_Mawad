"use client";

import { useEffect, useState } from "react";
import {
  Download,
  FileArchive,
  FileJson,
  Info,
  Loader2,
  ReceiptText,
  Save,
  ShieldCheck,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadJsonFile, exportWorkbook } from "@/lib/export-utils";
import {
  DEFAULT_SHOP_SETTINGS,
  type ShopSettingsPayload,
  readLocalShopSettings,
  saveLocalShopSettings,
} from "@/lib/shop-settings";

interface FullExportResponse {
  generatedAt: string;
  counts: Record<string, number>;
  products: Array<Record<string, string | number | boolean | null>>;
  categories: Array<Record<string, string | number | boolean | null>>;
  suppliers: Array<Record<string, string | number | boolean | null>>;
  sales: Array<Record<string, string | number | boolean | null>>;
  expenses: Array<Record<string, string | number | boolean | null>>;
  stockEntries: Array<Record<string, string | number | boolean | null>>;
  stockMovements: Array<Record<string, string | number | boolean | null>>;
  auditLogs: Array<Record<string, string | number | boolean | null>>;
}

function getBackupFilename(prefix: string) {
  return `${prefix}_${new Date().toISOString().split("T")[0]}`;
}

export default function SettingsPage() {
  const [shopName, setShopName] = useState(DEFAULT_SHOP_SETTINGS.shopName);
  const [currency, setCurrency] = useState<ShopSettingsPayload["currency"]>(DEFAULT_SHOP_SETTINGS.currency);
  const [phone, setPhone] = useState(DEFAULT_SHOP_SETTINGS.phone);
  const [address, setAddress] = useState(DEFAULT_SHOP_SETTINGS.address);
  const [receiptFooter, setReceiptFooter] = useState(DEFAULT_SHOP_SETTINGS.receiptFooter);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    const settings = readLocalShopSettings();
    setShopName(settings.shopName);
    setCurrency(settings.currency);
    setPhone(settings.phone);
    setAddress(settings.address);
    setReceiptFooter(settings.receiptFooter);
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    saveLocalShopSettings({
      shopName: shopName.trim() || DEFAULT_SHOP_SETTINGS.shopName,
      currency,
      phone: phone.trim(),
      address: address.trim(),
      receiptFooter: receiptFooter.trim() || DEFAULT_SHOP_SETTINGS.receiptFooter,
    });
    toast.success("Parametres du poste enregistres avec succes");
    setSaving(false);
  };

  const fetchFullExport = async () => {
    const response = await fetch("/api/reports/full-export", { cache: "no-store" });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Impossible de generer la sauvegarde");
    }

    return (await response.json()) as FullExportResponse;
  };

  const handleExcelBackup = async () => {
    setBackupLoading(true);

    try {
      const snapshot = await fetchFullExport();
      exportWorkbook({
        filename: getBackupFilename("Sauvegarde_Mawad"),
        sheets: [
          {
            name: "Resume",
            data: [
              {
                generatedAt: snapshot.generatedAt,
                products: snapshot.counts.products ?? 0,
                sales: snapshot.counts.sales ?? 0,
                expenses: snapshot.counts.expenses ?? 0,
                stockEntries: snapshot.counts.stockEntries ?? 0,
                stockMovements: snapshot.counts.stockMovements ?? 0,
                auditLogs: snapshot.counts.auditLogs ?? 0,
              },
            ],
          },
          { name: "Produits", data: snapshot.products },
          { name: "Categories", data: snapshot.categories },
          { name: "Fournisseurs", data: snapshot.suppliers },
          { name: "Ventes", data: snapshot.sales },
          { name: "Depenses", data: snapshot.expenses },
          { name: "EntreesStock", data: snapshot.stockEntries },
          { name: "MouvementsStock", data: snapshot.stockMovements },
          { name: "Audit", data: snapshot.auditLogs },
        ],
      });
      toast.success("Sauvegarde Excel exportee");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export impossible");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleJsonBackup = async () => {
    setBackupLoading(true);

    try {
      const snapshot = await fetchFullExport();
      downloadJsonFile({
        filename: getBackupFilename("Sauvegarde_Mawad_JSON"),
        data: snapshot,
      });
      toast.success("Sauvegarde JSON exportee");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export impossible");
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Parametres</h2>
          <p className="text-slate-500">
            Reglages du poste et outils utiles pour un premier client en production.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-600" />
                Identite boutique
              </CardTitle>
              <CardDescription>
                Ces reglages sont appliques sur ce poste pour les tickets et l&apos;affichage local.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">Nom de la boutique</Label>
                <Input id="shopName" value={shopName} onChange={(event) => setShopName(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Devise par defaut</Label>
                <Select value={currency} onValueChange={(value) => setCurrency((value as ShopSettingsPayload["currency"]) || "MAD")}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Selectionner une devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAD">Dirham Marocain (DH)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="USD">Dollar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telephone boutique</Label>
                  <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Ex: 06 12 34 56 78" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse courte</Label>
                  <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ex: Quartier, ville" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Message ticket</Label>
                <Input
                  id="receiptFooter"
                  value={receiptFooter}
                  onChange={(event) => setReceiptFooter(event.target.value)}
                  placeholder="Ex: Merci pour votre visite."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 bg-indigo-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <ReceiptText className="h-5 w-5" />
                Effet visible immediat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-indigo-800/80">
              <p>Le nom, le contact, l&apos;adresse et le message ticket alimentent l&apos;encaissement sur ce poste.</p>
              <p>Pratique si tu prepares un poste caisse dedie pour le client final.</p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => void handleSave()} className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Enregistrer les parametres
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="h-5 w-5 text-emerald-600" />
                Sauvegarde complete
              </CardTitle>
              <CardDescription>
                Exporte les donnees metier utiles avant intervention, support ou migration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Contient: produits, ventes, depenses, fournisseurs, categories, entrees stock, mouvements stock et journaux d&apos;audit.
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={() => void handleExcelBackup()} disabled={backupLoading} className="justify-start bg-emerald-600 hover:bg-emerald-500">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter la sauvegarde Excel
                </Button>
                <Button onClick={() => void handleJsonBackup()} disabled={backupLoading} variant="outline" className="justify-start border-slate-300">
                  <FileJson className="mr-2 h-4 w-4" />
                  Exporter la sauvegarde JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-slate-700" />
                Rappel exploitation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>Fais une sauvegarde avant les grosses modifications de catalogue ou de stock.</p>
              <p>Garde au moins un export Excel hebdomadaire et un export JSON mensuel.</p>
              <p>Les exports PDF/Excel de bilan, depenses, stock et audit sont aussi disponibles dans l&apos;espace gerant.</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-50/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Info className="h-5 w-5" />
                A propos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700/80">
              <p><strong>Mawad Scan v1.0.0</strong></p>
              <p>Application de gestion de stock orientee scan et caisse rapide.</p>
              <p className="pt-2 text-xs text-slate-500">
                Configuration de poste + outillage de sauvegarde pour un premier client.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
