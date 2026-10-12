import { useEffect, useMemo, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Download } from "lucide-react";
import { formatLongDay, periodLabel, sumExpenses } from "@/lib/money";
import type { Expense, PersonDue } from "@/lib/ledger-store";
import { Money, Toggle } from "@/components/ui";
import { buildMonthlyExcelWorkbook, downloadExcelFile } from "@/lib/excel-export";
import { toast } from "sonner";

export function CloseDialog({
  open,
  expenses,
  people,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  expenses: Expense[];
  people: PersonDue[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (dates: string[], carryOverUnsettled: boolean) => void;
}) {
  const days = useMemo(
    () => [...new Set(expenses.map((item) => item.date))].sort().reverse(),
    [expenses],
  );
  const [selected, setSelected] = useState<string[]>(days);
  const [carryOverPending, setCarryOverPending] = useState(true);

  useEffect(() => {
    if (open) {
      setSelected(days);
    }
  }, [open, days]);

  const moving = expenses.filter((item) => selected.includes(item.date));
  const totals = sumExpenses(moving);
  const full = days.length > 0 && selected.length === days.length;
  const pendingPeople = people.filter((p) => !p.settled);

  function handleQuickExcelDownload() {
    try {
      const bytes = buildMonthlyExcelWorkbook({
        expenses: moving,
        people,
        periodLabelText: periodLabel(selected),
      });
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      downloadExcelFile(bytes, `Cuentas_Claras_Cierre_${stamp}.xlsx`);
      toast.success("Excel del cierre descargado");
    } catch {
      toast.error("Error al exportar Excel");
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-xs" />
        <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] max-w-md -translate-y-1/2 overflow-y-auto rounded-3xl bg-surface p-5 shadow-xl border border-line">
          <AlertDialog.Title className="font-display text-2xl font-medium tracking-tight">
            Cerrar gastos y generar nueva lista
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">
            Elige el día o los días que deseas cerrar. Se guardarán en el Archivo en pesos mexicanos ($ MXN) y podrás iniciar de inmediato una nueva lista de gastos.
          </AlertDialog.Description>

          <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
            {days.map((day) => {
              const ofDay = expenses.filter((item) => item.date === day);
              const on = selected.includes(day);
              return (
                <li
                  key={day}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2 bg-paper/40"
                >
                  <div>
                    <p className="text-sm font-medium">{formatLongDay(day)}</p>
                    <p className="text-xs text-muted">
                      {ofDay.length} {ofDay.length === 1 ? "gasto" : "gastos"} ·{" "}
                      <Money cents={sumExpenses(ofDay).all} />
                    </p>
                  </div>
                  <Toggle
                    checked={on}
                    label={`Incluir ${formatLongDay(day)}`}
                    onCheckedChange={(next) =>
                      setSelected((current) =>
                        next ? [...new Set([...current, day])] : current.filter((item) => item !== day),
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm space-y-2 border border-line">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Período seleccionado:</span>
              <span className="font-medium text-ink">{periodLabel(selected)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Total a cerrar:</span>
              <Money cents={totals.all} className="font-display text-lg font-medium text-ink" />
            </div>

            {/* Carryover option */}
            {full && pendingPeople.length > 0 && (
              <div className="pt-2 border-t border-line/60 flex items-start gap-2.5">
                <input
                  id="carryOver"
                  type="checkbox"
                  checked={carryOverPending}
                  onChange={(e) => setCarryOverPending(e.target.checked)}
                  className="mt-1 size-4 rounded accent-forest cursor-pointer"
                />
                <label htmlFor="carryOver" className="text-xs text-ink cursor-pointer">
                  <span className="font-medium">Pasar personas con saldo pendiente al nuevo mes</span> ({pendingPeople.length} persona{pendingPeople.length > 1 ? "s" : ""})
                  <p className="text-muted text-[11px] mt-0.5">
                    Conservará en la nueva lista a quienes aún deben dinero para el siguiente mes.
                  </p>
                </label>
              </div>
            )}
          </div>

          {/* Quick export button before closing */}
          <button
            type="button"
            className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-2xl border border-line bg-paper text-xs font-medium text-ink hover:bg-forest/10 hover:text-forest transition-colors"
            onClick={handleQuickExcelDownload}
            disabled={selected.length === 0}
          >
            <Download className="size-3.5" />
            <span>Descargar Excel (.xlsx) de este cierre antes de guardar</span>
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="h-12 rounded-2xl border border-line bg-surface text-sm font-medium text-ink motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.96]">
              Seguir anotando
            </AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={selected.length === 0}
              onClick={() => onConfirm(selected, carryOverPending)}
              className="h-12 rounded-2xl bg-forest text-sm font-medium text-paper disabled:opacity-40 motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.96]"
            >
              Cerrar y nueva lista
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
