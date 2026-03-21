"use client";

import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, RotateCcw, ShieldAlert, ShoppingBag, Box, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user?: { name: string | null; email: string | null };
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs");
      if (!res.ok) throw new Error("Erreur lors du chargement des logs");
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      toast.error("Impossible de charger les journaux d'audit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionIcon = (action: string) => {
    if (action.includes("SALE")) return <ShoppingBag className="h-4 w-4 text-emerald-500" />;
    if (action.includes("PRODUCT")) return <Box className="h-4 w-4 text-blue-500" />;
    if (action.includes("EXPENSE")) return <Receipt className="h-4 w-4 text-orange-500" />;
    if (action.includes("ACCESS")) return <ShieldAlert className="h-4 w-4 text-red-500" />;
    return <Search className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionColor = (action: string): BadgeVariant => {
    if (action.includes("FAILURE")) return "destructive";
    if (action.includes("CREATE")) return "default";
    if (action.includes("UPDATE")) return "secondary";
    if (action.includes("DELETE") || action.includes("ARCHIVE")) return "outline";
    return "secondary";
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(search.toLowerCase()) || 
      (log.details?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    const matchesFilter = filterAction === "all" || log.action.includes(filterAction);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Journaux d&apos;Audit</CardTitle>
              <CardDescription>
                Historique des actions critiques effectuées sur le système.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RotateCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une action ou un détail..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterAction} onValueChange={(val) => setFilterAction(val || "all")}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="SALE">Ventes</SelectItem>
                <SelectItem value="PRODUCT">Produits</SelectItem>
                <SelectItem value="EXPENSE">Charges</SelectItem>
                <SelectItem value="ACCESS">Accès Gérant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Chargement des logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Aucun journal d&apos;audit trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {format(new Date(log.createdAt), "dd MMM yyyy", { locale: fr })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "HH:mm:ss")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge variant={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] text-sm italic">
                        {log.details || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{log.user?.name || "Système"}</div>
                        <div className="text-xs text-muted-foreground">{log.user?.email || ""}</div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
