"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Wallet, 
  Receipt, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar,
  DollarSign,
  Briefcase,
  Lightbulb,
  Droplets,
  Zap,
  Globe,
  Home,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ManagerPage() {
  const [activeTab, setActiveTab] = useState("balance");
  const [employees, setEmployees] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Form states
  const [empForm, setEmpForm] = useState({ name: "", salary: "" });
  const [expForm, setExpForm] = useState({ type: "Daily", amount: "", description: "", date: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, expRes, dashRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/expenses"),
        fetch("/api/dashboard")
      ]);
      
      if (empRes.ok) setEmployees(await empRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
      if (dashRes.ok) setDashboardData(await dashRes.json());
    } catch (error) {
      toast.error("Erreur lors de la récupération des données");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empForm)
      });
      if (res.ok) {
        toast.success("Salarié ajouté");
        setEmpForm({ name: "", salary: "" });
        fetchData();
      }
    } catch (e) { toast.error("Erreur"); } finally { setSubmitting(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expForm)
      });
      if (res.ok) {
        toast.success("Dépense enregistrée");
        setExpForm({ type: "Daily", amount: "", description: "", date: "" });
        fetchData();
      }
    } catch (e) { toast.error("Erreur"); } finally { setSubmitting(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Dépense supprimée");
        fetchData();
      }
    } catch (e) { toast.error("Erreur"); }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Supprimer ce salarié ?")) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Salarié supprimé");
        fetchData();
      }
    } catch (e) { toast.error("Erreur"); }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(val || 0);
  };

  const getExpenseIcon = (type: string) => {
    switch (type) {
      case 'Salary': return <Users className="h-4 w-4" />;
      case 'Utility': return <Zap className="h-4 w-4 text-amber-500" />;
      case 'Rent': return <Home className="h-4 w-4 text-blue-500" />;
      case 'Internet': return <Globe className="h-4 w-4 text-indigo-500" />;
      default: return <DollarSign className="h-4 w-4 text-slate-500" />;
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Espace Gérant</h1>
          <p className="text-slate-500">Gérez vos charges, vos salariés et suivez votre rentabilité.</p>
        </div>
      </div>

      <Tabs defaultValue="balance" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px] mb-8">
          <TabsTrigger value="balance" className="flex gap-2">
            <TrendingUp className="h-4 w-4" /> Bilan
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex gap-2">
            <Wallet className="h-4 w-4" /> Dépenses
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex gap-2">
            <Users className="h-4 w-4" /> Salariés
          </TabsTrigger>
        </TabsList>

        {/* --- TAB: BILAN --- */}
        <TabsContent value="balance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bénéfice Net (Mois)</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboardData?.monthly?.profit || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Après déduction de {formatCurrency(dashboardData?.monthly?.expenses || 0)} de charges.</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bénéfice Brut (Mois)</CardTitle>
                <Receipt className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData?.monthly?.grossProfit)}</div>
                <p className="text-xs text-muted-foreground mt-1">Marge sur les ventes uniquement.</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Charges (Mois)</CardTitle>
                <Wallet className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(dashboardData?.monthly?.expenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">Salaires, factures et loyer.</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">État de la Caisse</CardTitle>
                <DollarSign className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData?.cashDrawer?.balance)}</div>
                <p className="text-xs text-muted-foreground mt-1">Fond initial + Ventes du jour - Dépenses.</p>
              </CardContent>
            </Card>
          </div>

          {/* Section Historique Simplifiée */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Résumé Financier</CardTitle>
              <CardDescription>Visualisation de la structure de vos coûts.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center border-t border-slate-50 bg-slate-50/30">
               <div className="text-slate-400 text-sm italic flex flex-col items-center gap-3 max-w-sm text-center">
                 <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 opacity-40 text-indigo-500" />
                 </div>
                 <p>Le graphique détaillé de rentabilité s'affichera ici une fois que vous aurez enregistré quelques dépenses et ventes.</p>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB: DEPENSES --- */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
                <Plus className="h-4 w-4 mr-2" /> Nouvelle Dépense
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une dépense / charge</DialogTitle>
                  <DialogDescription>Remplissez les détails pour mettre à jour votre bilan financier.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddExpense} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={expForm.type as string} onValueChange={(v) => setExpForm({...expForm, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Daily">Quotidien (Pain, petit achat...)</SelectItem>
                          <SelectItem value="Salary">Salaires</SelectItem>
                          <SelectItem value="Utility">Electricité / Eau</SelectItem>
                          <SelectItem value="Rent">Loyer</SelectItem>
                          <SelectItem value="Internet">Internet / Téléphone</SelectItem>
                          <SelectItem value="Stock">Stock (Achat hors inventaire)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Montant (DH)</Label>
                      <Input 
                        type="number" 
                        required 
                        value={expForm.amount} 
                        onChange={(e) => setExpForm({...expForm, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Désignation / Description</Label>
                    <Input 
                      required 
                      value={expForm.description} 
                      onChange={(e) => setExpForm({...expForm, description: e.target.value})}
                      placeholder="Ex: Facture REDAL Mars"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={expForm.date} 
                      onChange={(e) => setExpForm({...expForm, date: e.target.value})}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
                      {submitting ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-lg">Historique des Dépenses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {expenses.length === 0 ? (
                 <div className="p-8 text-center text-slate-400">Aucune dépense enregistrée.</div>
               ) : (
                <div className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          {getExpenseIcon(exp.type)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{exp.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                             <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{exp.type}</Badge>
                             <span>•</span>
                             <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {new Date(exp.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-red-600">-{formatCurrency(exp.amount)}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="h-8 w-8 text-slate-300 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB: SALARIES --- */}
        <TabsContent value="employees" className="space-y-6">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
                <Plus className="h-4 w-4 mr-2" /> Nouveau Salarié
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un Salarié</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddEmployee} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <Input 
                      required 
                      value={empForm.name} 
                      onChange={(e) => setEmpForm({...empForm, name: e.target.value})}
                      placeholder="Ex: Ahmed Benani"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salaire Mensuel (DH)</Label>
                    <Input 
                      type="number" 
                      required 
                      value={empForm.salary} 
                      onChange={(e) => setEmpForm({...empForm, salary: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full bg-indigo-600" disabled={submitting}>
                       {submitting ? "Ajout..." : "Ajouter"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {employees.length === 0 ? (
               <div className="col-span-full p-12 text-center border-2 border-dashed rounded-xl border-slate-200 text-slate-400">
                 Aucun salarié enregistré pour le moment.
               </div>
             ) : (
                employees.map((emp) => (
                  <Card key={emp.id} className="relative overflow-hidden group border-slate-200">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                          {emp.name.charAt(0)}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteEmployee(emp.id)} className="text-slate-300 hover:text-red-500 h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardTitle className="pt-4">{emp.name}</CardTitle>
                      <CardDescription>Poste : Salarié</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                         <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Salaire Fixe</span>
                         <span className="font-black text-indigo-600">{formatCurrency(emp.salary)}</span>
                       </div>
                    </CardContent>
                    <CardFooter className="pt-0 pb-4 justify-center">
                       <Button variant="ghost" size="sm" className="text-[10px] text-slate-400">
                         Voir fiche complète <Calendar className="ml-1 h-3 w-3" />
                       </Button>
                    </CardFooter>
                  </Card>
                ))
             )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
