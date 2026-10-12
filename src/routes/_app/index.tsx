import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  Wallet,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { CloseDialog } from "@/components/close-dialog";
import { ExportModal } from "@/components/export-modal";
import { Button, Field, inputClass, Money, Segmented } from "@/components/ui";
import { useLedger, type Expense, type PayMethod } from "@/lib/ledger-store";
import { formatLongDay, formatShortDay, parseAmountToCents, sumExpenses, sumPeople, todayInMexico } from "@/lib/money";

export const Route = createFileRoute("/_app/")({
  component: GastosPage,
});

function GastosPage() {
  return <GastosReady />;
}

function GastosReady() {
  const expenses = useLedger((state) => state.open.expenses);
  const people = useLedger((state) => state.open.people);
  const addExpense = useLedger((state) => state.addExpense);
  const updateExpense = useLedger((state) => state.updateExpense);
  const removeExpense = useLedger((state) => state.removeExpense);
  const closeDays = useLedger((state) => state.closeDays);
  const startNewList = useLedger((state) => state.startNewList);

  const [date, setDate] = useState(todayInMexico);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [confirmNewList, setConfirmNewList] = useState(false);

  const totals = sumExpenses(expenses);
  const peopleTotals = sumPeople(people);
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
      setError("Escribe la descripción del gasto.");
      return;
    }
    if (!date) {
      setError("Elige la fecha del gasto.");
      return;
    }
    if (cents === null) {
      setError("Escribe un monto válido en pesos mayor a $0.00.");
      return;
    }
    const input = { date, description, method, amountCents: cents };
    const ok = editing ? updateExpense(editing.id, input) : addExpense(input);
    if (!ok) {
      setError("No se pudo guardar el gasto. Revisa los datos.");
      return;
    }
    toast.success(editing ? "Gasto actualizado en pesos ($ MXN)" : "Gasto agregado a la lista");
    resetForm();
    if (!editing) setMethod(method);
  }

  function handleStartNewListConfirm() {
    startNewList(true);
    setConfirmNewList(false);
    toast.success("Nueva lista de gastos generada");
  }

  return (
    <div className="page-pad px-4 pt-5 pb-24 space-y-4">
      {/* Resumen Total Header Card */}
      <section className="rounded-3xl bg-forest p-5 text-paper shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-paper/75 font-medium">
              Total de Gastos (Pesos Mexicanos)
            </p>
            <p className="font-display text-4xl font-medium tracking-tight mt-0.5">
              <Money cents={totals.all} />
            </p>
          </div>
          <span className="rounded-full bg-paper/20 px-3 py-1 text-xs font-semibold text-paper">
            {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-paper/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-paper/20">
              <Wallet className="size-3.5" />
            </span>
            <div>
              <p className="text-paper/70">Efectivo</p>
              <p className="font-semibold text-sm">
                <Money cents={totals.cash} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-paper/20">
              <CreditCard className="size-3.5" />
            </span>
            <div>
              <p className="text-paper/70">Tarjeta</p>
              <p className="font-semibold text-sm">
                <Money cents={totals.card} />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mini banner de Personas & Pendientes */}
      <section className="rounded-2xl border border-line bg-surface p-3.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid size-8 place-items-center rounded-xl bg-forest/10 text-forest shrink-0">
            <Users className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink truncate">
              {people.length === 0
                ? "Sin personas asignadas aún"
                : `${people.length} ${people.length === 1 ? "persona asignada" : "personas asignadas"}`}
            </p>
            <p className="text-[11px] text-muted truncate">
              {people.length === 0 ? (
                "Define quién paga y en qué fecha"
              ) : peopleTotals.pending > 0 ? (
                <span className="text-danger font-medium">
                  Pendiente para sig. mes: <Money cents={peopleTotals.pending} />
                </span>
              ) : (
                <span className="text-forest font-medium">Al corriente (todo pagado)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to="/personas"
            className="inline-flex h-8 items-center px-2.5 rounded-xl bg-paper border border-line text-xs font-medium text-ink hover:bg-forest/10 hover:text-forest transition-colors"
          >
            Ver Reparto
          </Link>
          <button
            type="button"
            onClick={() => setExporting(true)}
            className="inline-flex h-8 items-center px-2.5 rounded-xl bg-forest text-paper text-xs font-medium hover:opacity-90 transition-opacity gap-1"
            title="Corte del mes y Excel"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </section>

      {/* Formulario para agregar / editar gasto */}
      <form onSubmit={onSubmit} className="space-y-3 rounded-3xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-forest/10 text-forest">
              {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            </span>
            <h2 className="font-display text-xl font-medium tracking-tight text-ink">
              {editing ? "Editar gasto" : "Ingresar nuevo gasto"}
            </h2>
          </div>
          {editing ? (
            <button
              type="button"
              className="text-xs text-muted hover:text-ink font-medium px-2 py-1 rounded-lg bg-paper"
              onClick={resetForm}
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Fecha del gasto">
            <input
              className={inputClass}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>

          <Field label="Monto en pesos ($ MXN)">
            <input
              className={inputClass}
              inputMode="decimal"
              value={amount}
              placeholder="0.00"
              onChange={(event) => {
                setAmount(event.target.value);
                if (error) setError("");
              }}
              required
            />
          </Field>
        </div>

        <Field label="Descripción del gasto" hint={error || undefined}>
          <input
            className={inputClass}
            value={description}
            maxLength={140}
            placeholder="Supermercado, gasolina, restaurante, luz, renta…"
            onChange={(event) => {
              setDescription(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>

        <div>
          <label className="block text-xs text-muted mb-1 font-medium">Método de pago</label>
          <Segmented
            value={method}
            onChange={setMethod}
            options={[
              { value: "efectivo", label: "💵 Efectivo" },
              { value: "tarjeta", label: "💳 Tarjeta" },
            ]}
          />
        </div>

        <Button type="submit" className="w-full mt-2">
          {editing ? "Guardar cambios del gasto" : "Agregar gasto a la lista"}
        </Button>
      </form>

      {/* Lista de gastos registrados agrupados por fecha */}
      {groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper/50 p-6 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-surface border border-line text-muted mx-auto mb-2">
            <Calendar className="size-6 text-forest" />
          </div>
          <p className="font-display text-lg font-medium text-ink">Lista abierta sin gastos</p>
          <p className="mt-1 text-xs text-muted max-w-xs mx-auto">
            Ingresa la fecha, concepto, si fue en efectivo o tarjeta y el monto en pesos mexicanos ($ MXN).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display text-lg font-medium text-ink">Gastos registrados</h3>
            <span className="text-xs text-muted">Sumatoria en vivo ($ MXN)</span>
          </div>

          {groups.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {formatLongDay(day)}
                </h4>
                <Money cents={sumExpenses(items).all} className="text-xs font-semibold text-ink" />
              </div>

              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-xs hover:border-forest/40 transition-colors"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-xl text-xs font-medium ${
                        item.method === "efectivo"
                          ? "bg-forest/15 text-forest"
                          : "bg-ink/10 text-ink"
                      }`}
                      title={item.method === "efectivo" ? "Pagado en Efectivo" : "Pagado con Tarjeta"}
                    >
                      {item.method === "efectivo" ? "💵" : "💳"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.description}</p>
                      <p className="text-[11px] text-muted">
                        {item.method === "efectivo" ? "Efectivo" : "Tarjeta"} · {formatShortDay(item.date)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <Money cents={item.amountCents} className="text-sm font-semibold text-ink" />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Editar ${item.description}`}
                        className="grid size-9 place-items-center rounded-xl text-muted hover:bg-paper hover:text-ink transition-colors"
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
                        className="grid size-9 place-items-center rounded-xl text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        onClick={() => setPendingDelete(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Botones de acción principales (Cerrar gastos y Nueva lista) */}
      {expenses.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-line">
          <Button
            className="w-full shadow-md flex items-center justify-center gap-2 h-12"
            onClick={() => setClosing(true)}
          >
            <CheckCircle2 className="size-4" />
            <span>Cerrar gastos de este día o días</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="surface"
              className="flex items-center justify-center gap-1.5"
              onClick={() => setExporting(true)}
            >
              <FileSpreadsheet className="size-4 text-forest" />
              <span>Corte en Excel</span>
            </Button>

            <Button
              variant="surface"
              className="flex items-center justify-center gap-1.5"
              onClick={() => setConfirmNewList(true)}
            >
              <RotateCcw className="size-4 text-muted" />
              <span>Nueva lista</span>
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Cierre de días */}
      <CloseDialog
        open={closing}
        expenses={expenses}
        people={people}
        onOpenChange={setClosing}
        onConfirm={(dates, carryOver) => {
          const result = closeDays(dates, carryOver);
          if (result === "full") {
            toast.success("¡Lista cerrada y guardada en Archivo! Nueva lista iniciada.");
          } else if (result === "partial") {
            toast.success("Los días seleccionados quedaron guardados en el Archivo.");
          } else {
            toast.error("Elige al menos un día con gastos.");
          }
        }}
      />

      {/* Modal de Exportación y Envío en Excel */}
      <ExportModal
        open={exporting}
        onOpenChange={setExporting}
        expenses={expenses}
        people={people}
      />

      {/* Diálogo de Confirmación para Nueva Lista */}
      {confirmNewList && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5 shadow-2xl border border-line">
            <h3 className="font-display text-xl font-medium text-ink">¿Generar nueva lista de gastos?</h3>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Los gastos actuales se guardarán en el <strong className="text-ink">Archivo</strong> para que no se pierdan, y se iniciará una lista en blanco.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="surface" onClick={() => setConfirmNewList(false)}>
                Cancelar
              </Button>
              <Button className="bg-forest text-paper" onClick={handleStartNewListConfirm}>
                Iniciar nueva
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación para Eliminar Gasto */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5 shadow-2xl border border-line">
            <h3 className="font-display text-xl font-medium text-ink">¿Eliminar este gasto?</h3>
            <p className="mt-2 text-xs text-muted">
              Se eliminará de la lista abierta actual.
            </p>
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
      )}
    </div>
  );
}

function groupExpenses(expenses: Expense[]): [string, Expense[]][] {
  const sorted = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  const map = new Map<string, Expense[]>();
  for (const expense of sorted) {
    const list = map.get(expense.date) ?? [];
    list.push(expense);
    map.set(expense.date, list);
  }
  return [...map.entries()];
}
