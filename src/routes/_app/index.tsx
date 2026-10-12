import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CloseDialog } from "@/components/close-dialog";
import { Button, Field, inputClass, Money, Segmented } from "@/components/ui";
import { useLedger, type Expense, type PayMethod } from "@/lib/ledger-store";
import { formatLongDay, parseAmountToCents, sumExpenses, todayInMexico } from "@/lib/money";

export const Route = createFileRoute("/_app/")({
  component: GastosPage,
});

function GastosPage() {
  return <GastosReady />;
}

function GastosReady() {
  const expenses = useLedger((state) => state.open.expenses);
  const peopleCount = useLedger((state) => state.open.people.length);
  const addExpense = useLedger((state) => state.addExpense);
  const updateExpense = useLedger((state) => state.updateExpense);
  const removeExpense = useLedger((state) => state.removeExpense);
  const closeDays = useLedger((state) => state.closeDays);

  const [date, setDate] = useState(todayInMexico);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const totals = sumExpenses(expenses);
  const groups = useMemo(() => groupExpenses(expenses), [expenses]);

  function resetForm() {
    setDescription("");
    setAmount("");
    setEditing(null);
    setError("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!description.trim()) {
      setError("Escribe qué se gastó.");
      return;
    }
    if (!date) {
      setError("Elige la fecha.");
      return;
    }
    if (cents === null) {
      setError("Escribe un monto mayor a cero, hasta $1,000,000.");
      return;
    }
    const input = { date, description, method, amountCents: cents };
    const ok = editing ? updateExpense(editing.id, input) : addExpense(input);
    if (!ok) {
      setError("No se pudo guardar. Revisa los datos.");
      return;
    }
    toast.success(editing ? "Gasto actualizado" : "Gasto agregado");
    resetForm();
    if (!editing) setMethod(method);
  }

  return (
    <div className={expenses.length > 0 ? "page-pad-dock px-4 pt-5" : "page-pad px-4 pt-5"}>
      <section className="rounded-3xl bg-ink px-5 py-4 text-paper">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-paper/70 uppercase">Total de la lista</p>
            <p className="font-display text-3xl font-medium tracking-tight">
              <Money cents={totals.all} />
            </p>
          </div>
          <p className="text-right text-xs text-paper/75">
            Efectivo <Money cents={totals.cash} />
            <br />
            Tarjeta <Money cents={totals.card} />
          </p>
        </div>
      </section>

      <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            {editing ? "Editar gasto" : "Nuevo gasto"}
          </h2>
          {editing ? (
            <button type="button" className="text-sm text-muted" onClick={resetForm}>
              Cancelar
            </button>
          ) : null}
        </div>
        <Field label="Fecha">
          <input
            className={inputClass}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Descripción" hint={error || undefined}>
          <input
            className={inputClass}
            value={description}
            maxLength={140}
            placeholder="Súper, taxi, comida…"
            onChange={(event) => {
              setDescription(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>
        <Field label="Monto en pesos">
          <input
            className={inputClass}
            inputMode="decimal"
            value={amount}
            placeholder="0.00"
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
        <Segmented
          value={method}
          onChange={setMethod}
          options={[
            { value: "efectivo", label: "Efectivo" },
            { value: "tarjeta", label: "Tarjeta" },
          ]}
        />
        <Button type="submit" className="w-full">
          {editing ? "Guardar cambios" : "Agregar gasto"}
        </Button>
      </form>

      {groups.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Todavía no hay gastos en esta lista. Anota fecha, qué fue y si lo pagaste en efectivo o con tarjeta.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {groups.map(([day, items]) => (
            <section key={day}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-medium">{formatLongDay(day)}</h3>
                <Money cents={sumExpenses(items).all} className="text-sm text-muted" />
              </div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="rise flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
                    <span
                      className={item.method === "efectivo" ? "size-2.5 shrink-0 rounded-full bg-forest" : "size-2.5 shrink-0 rounded-full bg-ink"}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted">{item.method === "efectivo" ? "Efectivo" : "Tarjeta"}</p>
                    </div>
                    <Money cents={item.amountCents} className="text-sm font-medium" />
                    <button
                      type="button"
                      aria-label={`Editar ${item.description}`}
                      className="grid size-11 place-items-center rounded-xl text-muted motion-safe:transition-transform motion-safe:active:scale-[0.96]"
                      onClick={() => {
                        setEditing(item);
                        setDate(item.date);
                        setDescription(item.description);
                        setAmount((item.amountCents / 100).toFixed(2));
                        setMethod(item.method);
                        setError("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${item.description}`}
                      className="grid size-11 place-items-center rounded-xl text-muted motion-safe:transition-transform motion-safe:active:scale-[0.96]"
                      onClick={() => setPendingDelete(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {expenses.length > 0 ? (
        <div className="dock-above-nav mx-auto max-w-lg px-4">
          <Button className="w-full shadow-lg" onClick={() => setClosing(true)}>
            Cerrar gastos de esta lista
          </Button>
        </div>
      ) : null}

      <CloseDialog
        open={closing}
        expenses={expenses}
        peopleCount={peopleCount}
        onOpenChange={setClosing}
        onConfirm={(dates) => {
          const result = closeDays(dates);
          if (result === "full") toast.success("Lista guardada. Ya puedes empezar otra.");
          else if (result === "partial") toast.success("Esos días quedaron en el archivo.");
          else toast.error("Elige al menos un día con gastos.");
        }}
      />

      {pendingDelete ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5">
            <p className="font-display text-2xl font-medium">¿Quitar este gasto?</p>
            <p className="mt-2 text-sm text-muted">Se borra solo de la lista abierta.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="surface" onClick={() => setPendingDelete(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  removeExpense(pendingDelete);
                  if (editing?.id === pendingDelete) resetForm();
                  setPendingDelete(null);
                  toast.success("Gasto eliminado");
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function groupExpenses(expenses: Expense[]): [string, Expense[]][] {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const map = new Map<string, Expense[]>();
  for (const expense of sorted) {
    const list = map.get(expense.date) ?? [];
    list.push(expense);
    map.set(expense.date, list);
  }
  return [...map.entries()];
}
