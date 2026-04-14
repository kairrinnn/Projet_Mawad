"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileArchive,
  FileJson,
  Info,
  Loader2,
  ReceiptText,
  Save,
  ShieldCheck,
  Settings,
  Store,
} from "lucide-react";
import { toast } from "sonner";
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
  cashDrawers: Array<Record<string, string | number | boolean | null>>;
  expenses: Array<Record<string, string | number | boolean | null>>;
  stockEntries: Array<Record<string, string | number | boolean | null>>;
  stockMovements: Array<Record<string, string | number | boolean | null>>;
  auditLogs: Array<Record<string, string | number | boolean | null>>;
}

function getBackupFilename(prefix: string) {
  return `${prefix}_${new Date().toISOString().split("T")[0]}`;
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white border border-border/50 shadow-card p-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [shopName, setShopName] = useState(DEFAULT_SHOP_SETTINGS.shopName);
  const [currency, setCurrency] = useState<ShopSettingsPayload["currency"]>(DEFAULT_SHOP_SETTINGS.currency);
  const [phone, setPhone] = useState(DEFAULT_SHOP_SETTINGS.phone);
  const [address, setAddress] = useState(DEFAULT_SHOP_SETTINGS.address);
  const [receiptFooter, setReceiptFooter] = useState(DEFAULT_SHOP_SETTINGS.receiptFooter);
  const [defaultCashFund, setDefaultCashFund] = useState(String(DEFAULT_SHOP_SETTINGS.defaultCashFund));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const s = readLocalShopSettings();
    setShopName(s.shopName);
    setCurrency(s.currency);
    setPhone(s.phone);
    setAddress(s.address);
    setReceiptFooter(s.receiptFooter);
    setDefaultCashFund(String(s.defaultCashFund));
    setLoading(false);
  }, []);

  const handleSave = () => {
    setSaving(true);
    saveLocalShopSettings({
      shopName: shopName.trim() || DEFAULT_SHOP_SETTINGS.shopName,
      currency,
      phone: phone.trim(),
      address: address.trim(),
      receiptFooter: receiptFooter.trim() || DEFAULT_SHOP_SETTINGS.receiptFooter,
      defaultCashFund: Number(defaultCashFund) || DEFAULT_SHOP_SETTINGS.defaultCashFund,
    });
    toast.success("Paramètres enregistrés");
    setSaving(false);
  };

  const fetchFullExport = async () => {
    const response = await fetch("/api/reports/full-export", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Impossible de générer la sauvegarde");
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
          { name: "Resume", data: [{ generatedAt: snapshot.generatedAt, products: snapshot.counts.products ?? 0, sales: snapshot.counts.sales ?? 0, expenses: snapshot.counts.expenses ?? 0, stockEntries: snapshot.counts.stockEntries ?? 0, stockMovements: snapshot.counts.stockMovements ?? 0, auditLogs: snapshot.counts.auditLogs ?? 0 }] },
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
      toast.success("Sauvegarde Excel exportée");
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
      downloadJsonFile({ filename: getBackupFilename("Sauvegarde_Mawad_JSON"), data: snapshot });
      toast.success("Sauvegarde JSON exportée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export impossible");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleResetAllData = async () => {
    if (resetConfirmText.trim().toUpperCase() !== "RESET") {
      toast.error("Tape RESET pour confirmer.");
      return;
    }
    setResetting(true);
    try {
      const response = await fetch("/api/settings/reset", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Impossible de réinitialiser");
      }
      saveLocalShopSettings(DEFAULT_SHOP_SETTINGS);
      setShopName(DEFAULT_SHOP_SETTINGS.shopName); setCurrency(DEFAULT_SHOP_SETTINGS.currency);
      setPhone(DEFAULT_SHOP_SETTINGS.phone); setAddress(DEFAULT_SHOP_SETTINGS.address);
      setReceiptFooter(DEFAULT_SHOP_SETTINGS.receiptFooter); setDefaultCashFund(String(DEFAULT_SHOP_SETTINGS.defaultCashFund));
      setResetConfirmText(""); setResetDialogOpen(false);
      toast.success("Données réinitialisées.");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset impossible");
    } finally {
      setResetting(false);
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
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", boxShadow: "0 4px 16px rgba(79,70,229,0.25)" }}
        >
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Paramètres</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configuration du poste et outils de sauvegarde</p>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">

        {/* Left — boutique settings */}
        <div className="space-y-4">

          <SectionCard>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                <Store className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Identité boutique</h2>
                <p className="text-xs text-slate-400 mt-0.5">Appliqué sur ce poste pour les tickets et l&apos;affichage local.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom de la boutique</Label>
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label>Devise par défaut</Label>
                <Select value={currency} onValueChange={(v) => setCurrency((v as ShopSettingsPayload["currency"]) || "MAD")}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner une devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAD">Dirham Marocain (DH)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="USD">Dollar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Téléphone boutique</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: 06 12 34 56 78" className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Adresse courte</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Quartier, ville" className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Message ticket</Label>
                <Input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="Ex: Merci pour votre visite." className="rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label>Fond de caisse par défaut (MAD)</Label>
                <Input type="number" min="0" value={defaultCashFund} onChange={(e) => setDefaultCashFund(e.target.value)} placeholder="Ex: 500" className="rounded-xl" />
                <p className="text-xs text-slate-400">Utilisé à l&apos;ouverture si aucune clôture précédente n&apos;existe.</p>
              </div>
            </div>
          </SectionCard>

          {/* Info hint */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 flex-shrink-0 mt-0.5">
              <ReceiptText className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <p className="text-sm text-indigo-800/80 leading-relaxed">
              Le nom, contact, adresse et message ticket alimentent les tickets d&apos;encaissement. Pratique pour préparer un poste caisse dédié.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="rounded-full bg-indigo-600 hover:bg-indigo-700 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer les paramètres
            </Button>
          </div>
        </div>

        {/* Right — backup + danger */}
        <div className="space-y-4">

          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <FileArchive className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Sauvegarde complète</h2>
                <p className="text-xs text-slate-400 mt-0.5">Exporte toutes les données avant migration ou support.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 mb-4 leading-relaxed">
              Produits · Ventes · Dépenses · Fournisseurs · Catégories · Entrées stock · Mouvements · Journaux d&apos;audit
            </div>

            <div className="space-y-2.5">
              <Button
                onClick={() => void handleExcelBackup()}
                disabled={backupLoading}
                className="w-full justify-start rounded-xl bg-emerald-600 hover:bg-emerald-500 gap-2"
              >
                {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exporter la sauvegarde Excel
              </Button>
              <Button
                onClick={() => void handleJsonBackup()}
                disabled={backupLoading}
                variant="outline"
                className="w-full justify-start rounded-xl gap-2"
              >
                {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                Exporter la sauvegarde JSON
              </Button>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <ShieldCheck className="h-4 w-4 text-slate-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Rappel exploitation</h2>
            </div>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 flex-shrink-0" />Fais une sauvegarde avant les grosses modifications de catalogue ou de stock.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 flex-shrink-0" />Garde un export Excel hebdomadaire et un export JSON mensuel.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 flex-shrink-0" />Les exports PDF/Excel de bilan et stock sont dans l&apos;espace gérant.</li>
            </ul>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Info className="h-4 w-4 text-slate-500" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">À propos</h2>
            </div>
            <p className="text-sm font-semibold text-slate-700">MawadScan v2.0</p>
            <p className="text-sm text-slate-500 mt-1">Application de gestion de stock orientée scan et caisse rapide.</p>
          </SectionCard>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-red-900">Zone dangereuse</h2>
                <p className="text-xs text-red-700/70 mt-0.5">Remet le compte à zéro sans supprimer la connexion.</p>
              </div>
            </div>
            <p className="text-xs text-red-800/70 mb-4 leading-relaxed">
              Supprime produits, ventes, dépenses, catégories, fournisseurs, stock, caisse et journaux d&apos;audit.
            </p>
            <Button
              variant="destructive"
              className="rounded-full w-full sm:w-auto"
              onClick={() => setResetDialogOpen(true)}
            >
              Réinitialiser toutes les données
            </Button>
          </div>
        </div>
      </div>

      {/* ── Reset Dialog ──────────────────────────────────────── */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <AlertTriangle className="h-7 w-7 text-red-500" />
              </div>
            </div>
            <DialogTitle className="text-center">Réinitialiser totalement le compte</DialogTitle>
            <DialogDescription className="text-center">
              Pour confirmer, tape <strong>RESET</strong>. Toutes les données métier seront effacées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900/80 leading-relaxed">
              Exporte une sauvegarde Excel ou JSON avant de continuer.
            </div>
            <div className="space-y-1.5">
              <Label>Confirmation</Label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Tape RESET"
                className="rounded-xl font-mono"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button variant="outline" onClick={() => void handleJsonBackup()} disabled={backupLoading || resetting} className="rounded-xl gap-2">
              <FileJson className="h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={resetting} className="rounded-xl">
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => void handleResetAllData()} disabled={resetting} className="rounded-xl">
              {resetting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Réinitialisation…</> : "Tout effacer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
