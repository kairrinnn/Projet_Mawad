"use client";

import { Filter, Pencil, Trash2, Calendar as CalendarIcon, FileText, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";

interface Expense {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
}

interface ExpensesTabProps {
  expenses: Expense[];
  filteredExpenses: Expense[];
  expFilter: string;
  setExpFilter: (filter: string) => void;
  EXPENSE_TYPES: { value: string; label: string }[];
  onEdit: (exp: Expense) => void;
  onDelete: (exp: Expense) => void;
  formatCurrency: (val: number) => string;
  getExpenseIcon: (type: string) => React.ReactNode;
}

export function ExpensesTab({
  expenses,
  filteredExpenses,
  expFilter,
  setExpFilter,
  EXPENSE_TYPES,
  onEdit,
  onDelete,
  formatCurrency,
  getExpenseIcon
}: ExpensesTabProps) {

  const handleExportPDF = () => {
    const title = `Historique des Dépenses - Filtre: ${expFilter}`;
    const filename = `Depenses_${expFilter}_${new Date().toISOString().split('T')[0]}`;
    const headers = ["Date", "Description", "Type", "Montant"];
    const data = filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString("fr-FR"),
      e.description,
      e.type,
      formatCurrency(e.amount)
    ]);
    exportToPDF({ filename, title, headers, data });
  };

  const handleExportExcel = () => {
    const filename = `Depenses_${expFilter}_${new Date().toISOString().split('T')[0]}`;
    const data = filteredExpenses.map(e => ({
      Date: new Date(e.date).toLocaleDateString("fr-FR"),
      Description: e.description,
      Type: e.type,
      Montant: e.amount
    }));
    exportToExcel({ filename, data, sheetName: "Depenses" });
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant={expFilter === "all" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setExpFilter("all")} 
            className={expFilter === "all" ? "bg-slate-800" : ""}
          >
            <Filter className="h-3.5 w-3.5 mr-1" /> Tout ({expenses.length})
          </Button>
          {EXPENSE_TYPES.map((t) => {
            const count = expenses.filter(e => e.type === t.value).length;
            if (count === 0) return null;
            return (
              <Button 
                key={t.value} 
                variant={expFilter === t.value ? "default" : "outline"} 
                size="sm" 
                onClick={() => setExpFilter(t.value)}
                className={expFilter === t.value ? "bg-slate-800" : ""}
              >
                {t.label.split("(")[0].trim()} ({count})
              </Button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-red-600 border-red-200">
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-emerald-600 border-emerald-200">
            <TableIcon className="h-4 w-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              {expFilter === "all" ? "Aucune dépense enregistrée." : `Aucune dépense de type "${expFilter}".`}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      {getExpenseIcon(exp.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{exp.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{exp.type}</Badge>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <CalendarIcon className="h-2.5 w-2.5" /> 
                          {new Date(exp.date).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-sm font-black text-red-600 whitespace-nowrap">−{formatCurrency(exp.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600" onClick={() => onEdit(exp)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => onDelete(exp)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
