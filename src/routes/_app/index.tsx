import { useMemo, useState, type FormEvent } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { CloseDialog } from "@/components/close-dialog";
import { CurrencyConverter } from "@/components/currency-converter";
import { ExportModal } from "@/components/export-modal";
import { ScrollRail } from "@/components/scroll-rail";
import { SearchableSelect } from "@/components/searchable-select";
import { SwipeExpenseCard } from "@/components/swipe-expense-card";
import { SwipeTabs, type SwipeTabOption } from "@/components/swipe-tabs";
import { Button, Field, inputClass, Money, Segmented } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DEFAULT_EXPENSE_CATEGORY, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expense-categories";
import { useLedger, type Expense, type PayMethod } from "@/lib/ledger-store";
import { formatLongDay, formatShortDay, parseAmountToCents, sumExpenses, sumPeople, todayInMexico } from "@/lib/money";

export const Route = createFileRoute("/_app/")({
  component: GastosPage,
});

type PaymentFilter = "todos" | PayMethod;
type CategoryFilter = "todas" | ExpenseCategory;
type ExpenseFormError = "date" | "amount" | "description" | null;
type MetricCardProps = {
  title: string;
  caption: string;
  cents: number;
  icon: typeof Wallet;
  tone: string;
  index: number;
};

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
  const [category, setCategory] = useState<ExpenseCategory>(DEFAULT_EXPENSE_CATEGORY);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<ExpenseFormError>(null);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | undefined>();
  const [closing, setClosing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [confirmNewList, setConfirmNewList] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("todas");

  const totals = useMemo(() => sumExpenses(expenses), [expenses]);
  const peopleTotals = useMemo(() => sumPeople(people), [people]);
  const filteredByCategory = useMemo(
    () => categoryFilter === "todas" ? expenses : expenses.filter((item) => item.category === categoryFilter),
    [categoryFilter, expenses],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<ExpenseCategory, number>();
    for (const expense of expenses) counts.set(expense.category, (counts.get(expense.category) ?? 0) + 1);
    return counts;
  }, [expenses]);

  function clearError() {
    setError("");
    setErrorField(null);
    setSubmitStatus(undefined);
  }

  function resetForm() {
    setDescription("");
    setAmount("");
    setCategory(DEFAULT_EXPENSE_CATEGORY);
    setEditing(null);
    setError("");
    setErrorField(null);
  }

  function failForm(field: Exclude<ExpenseFormError, null>, message: string) {
    setError(message);
    setErrorField(field);
    setSubmitStatus("error");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!date) {
      failForm("date", "Elige la fecha del gasto.");
      return;
    }
    if (cents === null) {
      failForm("amount", "Escribe un monto válido en pesos mayor a $0.00.");
      return;
    }
    if (!description.trim()) {
      failForm("description", "Escribe la descripción del gasto.");
      return;
    }

    const input = { date, description, method, category, amountCents: cents };
    const ok = editing ? updateExpense(editing.id, input) : addExpense(input);
    if (!ok) {
      failForm("description", "No se pudo guardar el gasto. Revisa los datos e inténtalo de nuevo.");
      return;
    }

    setError("");
    setErrorField(null);
    setSubmitStatus("success");
    toast.success(editing ? "Gasto actualizado" : "Gasto agregado a la lista");
    resetForm();
    window.setTimeout(() => setSubmitStatus(undefined), 1800);
  }

  function scrollToExpenseForm() {
    const form = document.getElementById("expense-form");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    form?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function beginEditing(item: Expense) {
    setEditing(item);
    setDate(item.date);
    setDescription(item.description);
    setAmount((item.amountCents / 100).toFixed(2));
    setMethod(item.method);
    setCategory(item.category ?? DEFAULT_EXPENSE_CATEGORY);
    clearError();
    scrollToExpenseForm();
  }

  function handleStartNewListConfirm() {
    startNewList(true);
    setConfirmNewList(false);
    toast.success("Nueva lista creada; tus gastos anteriores quedaron en el Archivo");
  }

  const paymentTabs: readonly SwipeTabOption<PaymentFilter>[] = [
    { value: "todos", label: "Todos", count: filteredByCategory.length },
    { value: "efectivo", label: "Efectivo", count: filteredByCategory.filter((item) => item.method === "efectivo").length },
    { value: "tarjeta", label: "Tarjeta", count: filteredByCategory.filter((item) => item.method === "tarjeta").length },
  ];

  const metricCards: MetricCardProps[] = [
    {
      title: "Promedio por gasto",
      caption: expenses.length ? "por movimiento" : "aparecerá al registrar",
      cents: expenses.length ? Math.round(totals.all / expenses.length) : 0,
      icon: TrendingUp,
      tone: "bg-sky/45",
      index: 0,
    },
    {
      title: "En efectivo",
      caption: `${totals.all ? Math.round((totals.cash / totals.all) * 100) : 0}% del total`,
      cents: totals.cash,
      icon: Wallet,
      tone: "bg-citrus/60",
      index: 1,
    },
    {
      title: "Con tarjeta",
      caption: `${totals.all ? Math.round((totals.card / totals.all) * 100) : 0}% del total`,
      cents: totals.card,
      icon: CreditCard,
      tone: "bg-coral/25",
      index: 2,
    },
    {
      title: "Por cobrar",
      caption: people.length ? `${people.length} integrante${people.length === 1 ? "" : "s"}` : "sin integrantes todavía",
      cents: peopleTotals.pending,
      icon: Users,
      tone: "bg-forest/10",
      index: 3,
    },
  ];

  return (
    <div className="page-pad mx-auto space-y-5 px-4 pb-28 pt-5">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest via-forest to-[#084d44] p-5 text-paper shadow-xl sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 size-64 rounded-full bg-citrus/30 blur-2xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 -z-10 size-52 rounded-full bg-coral/35 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/20 bg-paper/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-paper/90">
              <Sparkles aria-hidden="true" className="size-3.5 text-citrus" />
              Lista abierta · {formatShortDay(todayInMexico())}
            </span>
            <span className="rounded-full bg-citrus px-3 py-1 text-xs font-bold text-ink">
              {expenses.length} {expenses.length === 1 ? "movimiento" : "movimientos"}
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1.2fr_0.8fr] sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-paper/70">Total de esta lista · MXN</p>
              <h1 className="mt-1 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                <Money cents={totals.all} />
              </h1>
              <p className="mt-2 max-w-md text-sm text-paper/80">
                Cada peso en su sitio. Anota, reparte y cierra con claridad.
              </p>
            </div>

            <div className="rounded-2xl border border-paper/15 bg-ink/10 p-4 backdrop-blur-sm">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-paper/15" aria-label="Proporción de efectivo y tarjeta">
                <span className="bg-citrus transition-[width] duration-300" style={{ width: `${totals.all ? (totals.cash / totals.all) * 100 : 0}%` }} />
                <span className="bg-coral transition-[width] duration-300" style={{ width: `${totals.all ? (totals.card / totals.all) * 100 : 0}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-paper/70">
                    <span className="size-2 rounded-full bg-citrus" /> Efectivo
                  </p>
                  <p className="mt-0.5 font-semibold"><Money cents={totals.cash} /></p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-paper/70">
                    <span className="size-2 rounded-full bg-coral" /> Tarjeta
                  </p>
                  <p className="mt-0.5 font-semibold"><Money cents={totals.card} /></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollRail
        label="Resumen rápido de gastos"
        className="-mx-4 px-4"
        contentClassName="gap-3 md:grid md:grid-cols-4 md:overflow-visible"
      >
        {metricCards.map((card) => <MetricCard key={card.title} {...card} />)}
      </ScrollRail>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-sky/55 bg-gradient-to-r from-sky/35 via-surface to-coral/10 p-4 shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-forest shadow-xs">
            <Users aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">
              {people.length === 0 ? "¿Compartes estos gastos?" : `${people.length} ${people.length === 1 ? "integrante" : "integrantes"} en el reparto`}
            </p>
            <p className="text-xs text-muted">
              {people.length === 0 ? "Agrega personas y define cuánto le toca a cada quien." : <><Money cents={peopleTotals.pending} /> pendiente por cobrar</>}
            </p>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link to="/personas" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink sm:flex-none">
            Ver reparto <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Button variant="surface" className="min-h-11 px-3" onClick={() => setExporting(true)} aria-label="Abrir opciones de Excel">
            <FileSpreadsheet aria-hidden="true" className="size-4 text-forest" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(19rem,0.85fr)_minmax(0,1.15fr)] xl:items-start">
        <div className="space-y-4">
          <CurrencyConverter
            onUseAmount={(convertedAmount) => {
              setAmount(convertedAmount);
              clearError();
              document.getElementById("expense-amount")?.focus();
            }}
          />

          <form
            id="expense-form"
            onSubmit={onSubmit}
            noValidate
            className="scroll-mt-24 space-y-4 rounded-[1.75rem] border border-line bg-surface p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-citrus/65 text-ink">
                  {editing ? <Calendar aria-hidden="true" className="size-5" /> : <Plus aria-hidden="true" className="size-5" />}
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                    {editing ? "Editar gasto" : "Nuevo gasto"}
                  </h2>
                  <p className="text-xs text-muted">Se guarda en este dispositivo</p>
                </div>
              </div>
              {editing ? (
                <Button variant="ghost" className="px-3 text-xs" onClick={resetForm}>Cancelar</Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha del gasto">
                <input
                  className={inputClass}
                  type="date"
                  value={date}
                  aria-invalid={errorField === "date"}
                  aria-describedby={errorField === "date" ? "expense-form-error" : undefined}
                  onChange={(event) => {
                    setDate(event.target.value);
                    if (errorField === "date") clearError();
                  }}
                  required
                />
              </Field>
              <Field label="Monto en pesos mexicanos ($ MXN)">
                <input
                  id="expense-amount"
                  className={inputClass}
                  inputMode="decimal"
                  type="text"
                  value={amount}
                  placeholder="0.00"
                  aria-invalid={errorField === "amount"}
                  aria-describedby={errorField === "amount" ? "expense-form-error" : undefined}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    if (errorField === "amount") clearError();
                  }}
                  required
                />
              </Field>
            </div>

            <Field label="Descripción del gasto">
              <input
                className={inputClass}
                value={description}
                maxLength={140}
                placeholder="Supermercado, gasolina, cena…"
                aria-invalid={errorField === "description"}
                aria-describedby={errorField === "description" ? "expense-form-error" : undefined}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (errorField === "description") clearError();
                }}
                required
              />
            </Field>

            <SearchableSelect
              id="expense-category"
              label="Categoría del gasto"
              value={category}
              options={EXPENSE_CATEGORIES}
              onChange={setCategory}
            />

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Método de pago</p>
              <Segmented
                label="Método de pago"
                value={method}
                onChange={setMethod}
                options={[
                  { value: "efectivo", label: "💵 Efectivo" },
                  { value: "tarjeta", label: "💳 Tarjeta" },
                ]}
              />
            </div>

            {error ? (
              <p id="expense-form-error" role="alert" aria-live="assertive" className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full shadow-md"
              status={submitStatus}
              statusMessage={submitStatus === "success" ? "Gasto guardado correctamente." : submitStatus === "error" ? "Hay un error que debes corregir." : undefined}
            >
              {editing ? "Guardar cambios" : "Agregar gasto a la lista"}
            </Button>
          </form>
        </div>

        <section className="min-w-0 rounded-[1.75rem] border border-line bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-forest">Tu registro</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Gastos del día a día</h2>
            </div>
            <span className="rounded-full bg-citrus/50 px-3 py-1 text-xs font-semibold text-ink">
              {filteredByCategory.length} {filteredByCategory.length === 1 ? "gasto" : "gastos"}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Categorías</h3>
              <span className="text-[11px] text-muted">Desliza para explorar</span>
            </div>
            <ScrollRail label="Filtrar gastos por categoría" className="-mx-1">
              <CategoryChip
                selected={categoryFilter === "todas"}
                label="Todas"
                count={expenses.length}
                onClick={() => setCategoryFilter("todas")}
              />
              {EXPENSE_CATEGORIES.map((item) => (
                <CategoryChip
                  key={item.value}
                  selected={categoryFilter === item.value}
                  label={item.label}
                  emoji={item.emoji}
                  count={categoryCounts.get(item.value) ?? 0}
                  onClick={() => setCategoryFilter(item.value)}
                />
              ))}
            </ScrollRail>
          </div>

          {expenses.length === 0 ? (
            <EmptyExpenses />
          ) : (
            <div className="mt-4">
              <SwipeTabs
                label="Filtrar gastos por método de pago"
                value={paymentFilter}
                onValueChange={setPaymentFilter}
                tabs={paymentTabs}
              >
                {(payment) => {
                  const filtered = filteredByCategory.filter(
                    (item) => payment === "todos" || item.method === payment,
                  );
                  const groups = groupExpenses(filtered);

                  return groups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-paper/60 p-6 text-center">
                      <p className="font-display text-lg font-semibold text-ink">Sin resultados en este filtro</p>
                      <p className="mt-1 text-sm text-muted">Prueba otra categoría o método de pago.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groups.map(([day, items]) => (
                        <section key={day} className="space-y-2">
                          <div className="flex items-baseline justify-between gap-2 px-1">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{formatLongDay(day)}</h3>
                            <Money cents={sumExpenses(items).all} className="text-xs font-bold text-ink" />
                          </div>
                          <ul className="space-y-2">
                            {items.map((item) => (
                              <SwipeExpenseCard
                                key={item.id}
                                expense={item}
                                onEdit={beginEditing}
                                onDelete={setPendingDelete}
                              />
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  );
                }}
              </SwipeTabs>
            </div>
          )}
        </section>
      </div>

      {expenses.length > 0 ? (
        <section className="rounded-3xl border border-line bg-gradient-to-r from-citrus/30 via-surface to-sky/35 p-4 shadow-xs sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-ink">¿Terminaste por hoy?</p>
              <p className="text-sm text-muted">Guarda un corte o prepara una lista nueva sin perder el historial.</p>
            </div>
            <Button onClick={() => setClosing(true)} className="w-full sm:w-auto">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Cerrar días y guardar
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-line/80 pt-3 sm:grid-cols-2">
            <Button variant="surface" onClick={() => setExporting(true)}>
              <FileSpreadsheet aria-hidden="true" className="size-4 text-forest" />
              Descargar corte en Excel
            </Button>
            <Button variant="surface" onClick={() => setConfirmNewList(true)}>
              <RotateCcw aria-hidden="true" className="size-4 text-muted" />
              Iniciar nueva lista
            </Button>
          </div>
        </section>
      ) : null}

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

      <ExportModal open={exporting} onOpenChange={setExporting} expenses={expenses} people={people} />

      <ConfirmActionDialog
        open={confirmNewList}
        onOpenChange={setConfirmNewList}
        title="¿Generar una nueva lista?"
        description="Los gastos actuales se guardarán en el Archivo para que puedas consultarlos después. Las personas con saldo pendiente pasarán a la nueva lista."
        confirmLabel="Iniciar nueva"
        onConfirm={handleStartNewListConfirm}
      />

      <ConfirmActionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="¿Eliminar este gasto?"
        description="Se quitará de la lista abierta actual. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={() => {
          if (!pendingDelete) return;
          removeExpense(pendingDelete);
          if (editing?.id === pendingDelete) resetForm();
          setPendingDelete(null);
          toast.success("Gasto eliminado");
        }}
      />
    </div>
  );
}

function MetricCard({ title, caption, cents, icon: Icon, tone, index }: MetricCardProps) {
  return (
    <article
      className={cn("rise min-w-44 w-[70vw] max-w-56 snap-start rounded-3xl border border-line bg-surface p-4 shadow-xs md:w-auto md:max-w-none", index === 0 && "border-sky/60", index === 2 && "border-coral/30")}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid size-10 place-items-center rounded-2xl", tone)}>
          <Icon aria-hidden="true" className="size-5 text-ink" />
        </span>
        <Sparkles aria-hidden="true" className="size-4 text-coral" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <p className="mt-0.5 font-display text-xl font-semibold text-ink"><Money cents={cents} /></p>
      <p className="mt-1 text-[11px] text-muted">{caption}</p>
    </article>
  );
}

function CategoryChip({
  selected,
  label,
  count,
  emoji,
  onClick,
}: {
  selected: boolean;
  label: string;
  count: number;
  emoji?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
        selected
          ? "border-forest bg-forest text-paper shadow-sm ring-2 ring-forest/15"
          : "border-line bg-surface text-ink hover:border-forest/50",
      )}
    >
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      <span>{label}</span>
      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", selected ? "bg-paper/20 text-paper" : "bg-paper text-muted")}>
        {count}
      </span>
    </button>
  );
}

function EmptyExpenses() {
  return (
    <div className="mt-4 rounded-3xl border border-dashed border-line bg-gradient-to-br from-paper/80 to-citrus/15 p-7 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-[1.25rem] bg-citrus/60 text-forest shadow-xs">
        <Calendar aria-hidden="true" className="size-6" />
      </div>
      <p className="mt-3 font-display text-xl font-semibold text-ink">Aún no hay gastos en esta lista</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
        Registra tu primera compra y aquí tendrás el resumen ordenado por fecha y categoría.
      </p>
    </div>
  );
}

function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] w-full max-w-sm -translate-y-1/2 rounded-3xl border border-line bg-surface p-5 shadow-2xl">
          <AlertDialog.Title className="font-display text-2xl font-semibold tracking-tight text-ink">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="surface" onClick={() => onOpenChange(false)}>Cancelar</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
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
