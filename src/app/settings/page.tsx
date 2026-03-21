"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Save, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [shopName, setShopName] = useState(() => {
    if (typeof window === "undefined") return "Mawad Scan";
    return localStorage.getItem("shop_name") || "Mawad Scan";
  });
  const [currency, setCurrency] = useState(() => {
    if (typeof window === "undefined") return "MAD";
    return localStorage.getItem("shop_currency") || "MAD";
  });

  const handleSave = () => {
    localStorage.setItem("shop_name", shopName);
    localStorage.setItem("shop_currency", currency);
    toast.success("Paramètres enregistrés avec succès !");

    // Notifie le reste de l'app qu'un réglage local a changé.
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Paramètres</h2>
          <p className="text-slate-500">Configurez les informations générales de votre boutique.</p>
        </div>
      </div>

      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-indigo-600" />
              Général
            </CardTitle>
            <CardDescription>Informations de base de l&apos;application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Nom de la boutique</Label>
              <Input
                id="shopName"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Devise par défaut</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value ?? "MAD")}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Sélectionner une devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAD">Dirham Marocain (DH)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                  <SelectItem value="USD">Dollar ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="flex items-center text-indigo-900">
              <Info className="mr-2 h-5 w-5" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-indigo-700/80">
            <p><strong>Mawad Scan v1.0.0</strong></p>
            <p>Application de gestion de stock optimisée pour le scan QR Code rapide.</p>
            <p className="pt-4 text-xs">Développé pour simplifier vos opérations quotidiennes.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="mr-2 h-4 w-4" />
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </div>
  );
}
