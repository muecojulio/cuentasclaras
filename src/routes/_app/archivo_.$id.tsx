import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LoadingList } from "@/components/shell";
import { Button, Money } from "@/components/ui";
import { useLedger, useLedgerReady } from "@/lib/ledger-store";
import { dueLabel, formatLongDay, formatStamp, periodLabel, sumExpenses } from "@/lib/money";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/_app/archivo_/$id")({
  component: DetallePage,
});

function DetallePage() {
  const ready = useLedgerReady();
  const { id } = Route.useParams();
  if (!ready) return <LoadingList />;
  return <DetalleReady id={id} />;
}

function DetalleReady({ id }: { id: string }) {
  const item = useLedger((state) => state.archive.find((entry) => entry.id === id));
  const removeArchive = useLedger((state) => state.removeArchive);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  if (!item) {
    return (
      <div className="page-pad px-4 pt-8">
        <p className="font-display text-3xl font-medium">Este cierre no está aquí</p>
        <p className="mt-2 text-sm text-muted">Puede que se haya borrado en este teléfono.</p>
        <Link to="/archivo" className="mt-4 inline-flex h-12 items-center text-sm font-medium text-forest">
          Volver al archivo
        </Link>
      </div>
    );
  }

  const totals = sumExpenses(item.expenses);
  const days = [...new Set(item.expenses.map((expense) => expense.date))].sort().reverse();

  return (
    <div className="page-pad px-4 pt-5">
      <Link to="/archivo" className="text-sm font-medium text-forest">
        Volver al archivo
      </Link>
      <p className="mt-3 text-sm text-muted">Guardado {formatStamp(item.closedAt)}</p>
      <h2 className="font-display text-3xl font-medium tracking-tight">
        {periodLabel(item.expenses.map((expense) => expense.date))}
      </h2>
      <p className="mt-2 font-display text-4xl font-medium">
        <Money cents={totals.all} />
      </p>
      <p className="mt-1 text-sm text-muted">
        Efectivo <Money cents={totals.cash} /> · Tarjeta <Money cents={totals.card} />
      </p>

      <div className="mt-6 space-y-4">
        {days.map((day) => (
          <section key={day}>
            <h3 className="text-sm font-medium">{formatLongDay(day)}</h3>
            <ul className="mt-2 space-y-2">
              {item.expenses
                .filter((expense) => expense.date === day)
                .map((expense) => (
                  <li
                    key={expense.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{expense.description}</p>
                      <p className="text-xs text-muted">
                        {expense.method === "efectivo" ? "Efectivo" : "Tarjeta"}
                      </p>
                    </div>
                    <Money cents={expense.amountCents} className="text-sm font-medium" />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      <h3 className="mt-8 font-display text-2xl font-medium">Personas</h3>
      {item.people.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Este cierre no guardó personas. Si cerraste solo algunos días, se quedaron en la lista abierta.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {item.people.map((person) => {
            const due = dueLabel(person.dueDate, person.settled);
            return (
              <li key={person.id} className="rounded-2xl border border-line bg-surface px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{person.name}</p>
                    <p className={cn("text-sm", due.tone === "late" ? "text-danger" : "text-muted")}>
                      {due.text}
                    </p>
                  </div>
                  <Money cents={person.amountCents} className="font-medium" />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="danger" className="mt-8 w-full" onClick={() => setConfirm(true)}>
        Borrar este cierre
      </Button>
      {confirm ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5">
            <p className="font-display text-2xl font-medium">¿Borrar este cierre?</p>
            <p className="mt-2 text-sm text-muted">No se puede recuperar en este teléfono.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="surface" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  removeArchive(item.id);
                  toast.success("Cierre borrado");
                  void navigate({ to: "/archivo" });
                }}
              >
                Borrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
