import { useEffect, useMemo, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { formatLongDay, periodLabel, sumExpenses } from "@/lib/money";
import type { Expense } from "@/lib/ledger-store";
import { Money, Toggle } from "@/components/ui";

export function CloseDialog({
  open,
  expenses,
  peopleCount,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  expenses: Expense[];
  peopleCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dates: string[]) => void;
}) {
  const days = useMemo(
    () => [...new Set(expenses.map((item) => item.date))].sort().reverse(),
    [expenses],
  );
  const [selected, setSelected] = useState<string[]>(days);

  useEffect(() => {
    if (open) setSelected(days);
  }, [open, days]);

  const moving = expenses.filter((item) => selected.includes(item.date));
  const totals = sumExpenses(moving);
  const full = days.length > 0 && selected.length === days.length;

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[80dvh] max-w-md -translate-y-1/2 overflow-y-auto rounded-3xl bg-surface p-5 shadow-xl">
          <AlertDialog.Title className="font-display text-2xl font-medium tracking-tight">
            Cerrar gastos
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">
            Elige el día o los días que quieres guardar. Lo cerrado queda en Archivo y no se mezcla con la lista nueva.
          </AlertDialog.Description>
          <ul className="mt-4 space-y-2">
            {days.map((day) => {
              const ofDay = expenses.filter((item) => item.date === day);
              const on = selected.includes(day);
              return (
                <li
                  key={day}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2"
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
          <div className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm">
            <p>
              Periodo: <span className="font-medium">{periodLabel(selected)}</span>
            </p>
            <p className="mt-1">
              Total a guardar: <Money cents={totals.all} className="font-medium" />
            </p>
            <p className="mt-2 text-muted">
              {full
                ? peopleCount > 0
                  ? `Se guardan ${peopleCount === 1 ? "la persona" : `las ${peopleCount} personas`} con esta lista y empieza una lista nueva.`
                  : "Empieza una lista nueva, vacía."
                : "Si dejas días fuera, las personas se quedan en la lista abierta."}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="h-12 rounded-2xl border border-line bg-surface text-sm font-medium text-ink motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.96]">
              Seguir anotando
            </AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={selected.length === 0}
              onClick={() => onConfirm(selected)}
              className="h-12 rounded-2xl bg-forest text-sm font-medium text-paper disabled:opacity-40 motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.96]"
            >
              Guardar cierre
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
