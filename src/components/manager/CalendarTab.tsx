"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Expense {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
}

interface CalendarTabProps {
  expenses: Expense[];
  EXPENSE_TYPES: { value: string; label: string }[];
  getExpenseColor: (type: string) => string;
  formatCurrency: (val: number) => string;
}

export function CalendarTab({
  expenses,
  EXPENSE_TYPES,
  getExpenseColor,
  formatCurrency
}: CalendarTabProps) {
  const [calMonth, setCalMonth] = useState(() => { 
    const n = new Date(); 
    return new Date(n.getFullYear(), n.getMonth(), 1); 
  });
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const calendarGrid = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    const dayMap: Record<number, Expense[]> = {};
    const monthlyTypes = expenses.filter(e => e.type !== "Daily");

    const seenKeys = new Set<string>();
    monthlyTypes.forEach(e => {
      const d = new Date(e.date);
      const dayOfMonth = d.getDate();
      const key = `${e.type}-${e.description}-${dayOfMonth}`;
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (!dayMap[dayOfMonth]) dayMap[dayOfMonth] = [];
        dayMap[dayOfMonth].push(e);
        seenKeys.add(key);
      }
    });

    monthlyTypes.forEach(e => {
      const d = new Date(e.date);
      const dayOfMonth = d.getDate();
      const key = `${e.type}-${e.description}-${dayOfMonth}`;
      if (!seenKeys.has(key) && dayOfMonth <= daysInMonth) {
        seenKeys.add(key);
        if (!dayMap[dayOfMonth]) dayMap[dayOfMonth] = [];
        dayMap[dayOfMonth].push({ ...e, id: `proj-${e.id}` });
      }
    });

    return { daysInMonth, firstDow, dayMap };
  }, [expenses, calMonth]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>
              <span className="text-lg">‹</span>
            </Button>
            <CardTitle className="text-base font-semibold capitalize min-w-[160px] text-center">
              {calMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </CardTitle>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>
              <span className="text-lg">›</span>
            </Button>
          </div>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
            {EXPENSE_TYPES.filter(t => t.value !== "Daily").map(t => (
              <span key={t.value} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${getExpenseColor(t.value)}`} />
                {t.label.split("(")[0].trim()}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: calendarGrid.firstDow }).map((_, i) => (
              <div key={`e${i}`} className="h-14 border border-transparent" />
            ))}
            {Array.from({ length: calendarGrid.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const exps = calendarGrid.dayMap[day];
              const hasPayment = !!exps;
              const total = hasPayment ? exps.reduce((s, e) => s + Number(e.amount), 0) : 0;
              const isToday = day === new Date().getDate() && calMonth.getMonth() === new Date().getMonth() && calMonth.getFullYear() === new Date().getFullYear();
              const uniqueTypes = hasPayment ? [...new Set(exps.map(e => e.type))] : [];
              const hasOnlyProjected = hasPayment && exps.every(e => e.id.startsWith("proj-"));

              const colIdx = (calendarGrid.firstDow + i) % 7;
              const tooltipPos = colIdx < 2 ? "left-0 translate-x-0" : colIdx > 4 ? "right-0 translate-x-0" : "left-1/2 -translate-x-1/2";

              return (
                <div
                  key={day}
                  className={`relative h-14 flex flex-col items-center pt-1.5 cursor-default transition-colors
                    ${hasPayment && !hasOnlyProjected ? "border border-slate-100 bg-red-50/60 hover:bg-red-50" : ""}
                    ${hasOnlyProjected ? "border border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50 opacity-60" : "border border-slate-100"}
                    ${isToday ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50/30" : ""}
                    ${!hasPayment ? "hover:bg-slate-50" : ""}
                  `}
                  onMouseEnter={() => hasPayment && setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <span className={`text-sm ${isToday ? "font-bold text-indigo-600" : hasPayment && !hasOnlyProjected ? "font-semibold text-slate-800" : "text-slate-400"}`}>
                    {day}
                  </span>
                  {hasPayment && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {uniqueTypes.slice(0, 4).map(t => (
                        <span key={t} className={`h-1.5 w-1.5 rounded-full ${hasOnlyProjected ? "opacity-50" : ""} ${getExpenseColor(t)}`} />
                      ))}
                    </div>
                  )}

                  {hoveredDay === day && hasPayment && (
                    <div className={`absolute bottom-full ${tooltipPos} mb-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 pointer-events-none`}>
                      <p className="text-xs font-bold text-slate-800 mb-2 border-b pb-1">
                        {new Date(calMonth.getFullYear(), calMonth.getMonth(), day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        {hasOnlyProjected && <span className="ml-2 text-[10px] font-normal text-slate-400 italic">projection</span>}
                      </p>
                      <div className="space-y-1.5">
                        {exps.map(exp => {
                          const isProjected = exp.id.startsWith("proj-");
                          return (
                            <div key={exp.id} className={`flex items-center justify-between ${isProjected ? "opacity-60" : ""}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${getExpenseColor(exp.type)}`} />
                                <span className={`text-[11px] truncate max-w-[110px] ${isProjected ? "text-slate-400 italic" : "text-slate-700"}`}>{exp.description}</span>
                                {isProjected && <span className="text-[9px] text-slate-400">↻</span>}
                              </div>
                              <span className={`text-[11px] font-bold ${isProjected ? "text-slate-400" : "text-red-600"}`}>−{formatCurrency(exp.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t mt-2 pt-1.5 flex justify-between">
                        <span className="text-[10px] font-medium text-slate-500">{hasOnlyProjected ? "Projection" : "Total"}</span>
                        <span className={`text-xs font-black ${hasOnlyProjected ? "text-slate-400" : "text-red-700"}`}>−{formatCurrency(total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
