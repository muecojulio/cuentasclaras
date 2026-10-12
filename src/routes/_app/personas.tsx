import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileSpreadsheet,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
  CheckCircle2,
  Divide,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Field, inputClass, Money, Toggle } from "@/components/ui";
import { ExportModal } from "@/components/export-modal";
import { useLedger, type PersonDue } from "@/lib/ledger-store";
import { dueLabel, formatMxn, formatShortDay, parseAmountToCents, sumExpenses, sumPeople, todayInMexico } from "@/lib/money";
import {
  buildSingleMemberExcelWorkbook,
  downloadExcelFile,
  shareMemberReport,
} from "@/lib/excel-export";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/_app/personas")({
  component: PersonasPage,
});

function PersonasPage() {
  return <PersonasReady />;
}

function PersonasReady() {
  const people = useLedger((state) => state.open.people);
  const expenses = useLedger((state) => state.open.expenses);
  const addPerson = useLedger((state) => state.addPerson);
  const updatePerson = useLedger((state) => state.updatePerson);
  const setPersonSettled = useLedger((state) => state.setPersonSettled);
  const setAllPeopleSettled = useLedger((state) => state.setAllPeopleSettled);
  const removePerson = useLedger((state) => state.removePerson);
  const splitEvenly = useLedger((state) => state.splitEvenly);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayInMexico);
  const [editing, setEditing] = useState<PersonDue | null>(null);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"name" | "amount" | "dueDate" | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | undefined>();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const spent = sumExpenses(expenses).all;
  const assigned = sumPeople(people);
  const gap = spent - assigned.assigned;

  function reset() {
    setName("");
    setAmount("");
    setEditing(null);
    setError("");
    setErrorField(null);
  }

  function failForm(field: "name" | "amount" | "dueDate", message: string) {
    setError(message);
    setErrorField(field);
    setSubmitStatus("error");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!name.trim()) {
      failForm("name", "Escribe el nombre de la persona.");
      return;
    }
    if (cents === null) {
      failForm("amount", "Escribe cuánto le toca pagar, mayor a $0.00.");
      return;
    }
    if (!dueDate) {
      failForm("dueDate", "Elige la fecha en que tiene que pagar.");
      return;
    }
    const input = { name, amountCents: cents, dueDate };
    const ok = editing ? updatePerson(editing.id, input) : addPerson(input);
    if (!ok) {
      failForm("name", "No se pudo guardar la persona. Revisa los datos.");
      return;
    }
    setError("");
    setErrorField(null);
    setSubmitStatus("success");
    toast.success(editing ? "Persona actualizada" : "Persona agregada a la lista");
    reset();
    window.setTimeout(() => setSubmitStatus(undefined), 1800);
  }

  function handleSinglePersonExcel(person: PersonDue) {
    try {
      const bytes = buildSingleMemberExcelWorkbook(person, expenses, people);
      const safeName = person.name.toLowerCase().replace(/[^a-z0-9]/gi, "_");
      downloadExcelFile(bytes, `Cuentas_Claras_${safeName}.xlsx`);
      toast.success(`Excel de ${person.name} descargado`);
    } catch {
      toast.error("Error al exportar");
    }
  }

  async function handleSharePerson(person: PersonDue) {
    setSharingId(person.id);
    try {
      const res = await shareMemberReport(person, expenses, people);
      if (res.success) {
        if (res.method === "share-file") toast.success(`Excel y corte compartidos con ${person.name}`);
        else if (res.method === "share-text") toast.success(`Corte compartido con ${person.name}`);
        else if (res.method === "whatsapp") toast.success(`Abriendo WhatsApp para ${person.name}`);
      }
    } catch {
      toast.error("No se pudo compartir");
    } finally {
      setSharingId(null);
    }
  }

  return (
    <div className="page-pad mx-auto grid gap-5 px-4 pb-28 pt-5 xl:grid-cols-2">
      {/* Resumen de Reparto y Pendientes para el Siguiente Mes */}
      <section className="space-y-4 rounded-[1.75rem] border border-line bg-gradient-to-br from-surface via-surface to-citrus/20 p-5 shadow-sm xl:col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted font-medium">Total de Gastos a Repartir</p>
            <p className="font-display text-3xl font-medium tracking-tight text-ink mt-0.5">
              <Money cents={spent} />
            </p>
          </div>
          <span className="rounded-full bg-forest/15 px-3 py-1 text-xs font-semibold text-forest">
            {people.length} {people.length === 1 ? "integrante" : "integrantes"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line text-xs">
          <div className="rounded-2xl bg-paper p-2.5">
            <p className="text-muted text-[11px]">Asignado</p>
            <p className="font-medium text-sm text-ink mt-0.5">
              <Money cents={assigned.assigned} />
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-2.5">
            <p className="text-muted text-[11px]">Ya Pagado</p>
            <p className="font-medium text-sm text-forest mt-0.5">
              <Money cents={assigned.settled} />
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-2.5">
            <p className="text-muted text-[11px]">Pendiente Sig. Mes</p>
            <p className="font-medium text-sm text-danger mt-0.5">
              <Money cents={assigned.pending} />
            </p>
          </div>
        </div>

        {/* Indicador de Balance */}
        <div className="rounded-2xl bg-paper/80 p-3 text-xs text-muted">
          {people.length === 0 ? (
            <p>Agrega una o más personas para definir cuánto le toca pagar a cada una y su fecha compromiso.</p>
          ) : gap === 0 ? (
            <p className="text-forest font-medium flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              <span>El reparto cubre exactamente el 100% de los gastos ($ MXN).</span>
            </p>
          ) : gap > 0 ? (
            <p className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>Faltan {formatMxn(gap)} MXN por asignar entre los integrantes.</span>
            </p>
          ) : (
            <p className="text-danger font-medium flex items-center gap-1.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>El monto asignado supera el total de gastos por {formatMxn(Math.abs(gap))} MXN.</span>
            </p>
          )}
        </div>

        {/* Botones de acción de reparto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            variant="surface"
            className="flex items-center justify-center gap-1.5 text-xs h-10"
            disabled={people.length === 0 || spent <= 0}
            onClick={() => {
              if (splitEvenly()) toast.success("Total repartido en partes iguales");
              else toast.error("Necesitas gastos y personas registradas.");
            }}
          >
            <Divide className="size-3.5" />
            <span>Repartir en partes iguales</span>
          </Button>

          <Button
            className="flex items-center justify-center gap-1.5 text-xs h-10 bg-forest text-paper"
            onClick={() => setExportModalOpen(true)}
            disabled={people.length === 0 && expenses.length === 0}
          >
            <FileSpreadsheet className="size-3.5" />
            <span>Mandar corte mensual en Excel</span>
          </Button>
        </div>
      </section>

      {/* Formulario para agregar o editar persona */}
      <form id="people-form" noValidate onSubmit={onSubmit} className="space-y-3 rounded-[1.75rem] border border-line bg-surface p-4 shadow-sm xl:col-start-1 xl:row-start-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-forest/10 text-forest">
              {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            </span>
            <h2 className="font-display text-xl font-medium tracking-tight text-ink">
              {editing ? "Editar persona" : "Agregar persona / integrante"}
            </h2>
          </div>
          {editing ? (
            <button
              type="button"
              className="text-xs text-muted hover:text-ink font-medium px-2 py-1 rounded-lg bg-paper"
              onClick={reset}
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <Field label="Nombre del integrante">
          <input
            id="person-name"
            className={inputClass}
            value={name}
            maxLength={60}
            placeholder="Ej: Carlos, Ana, Mamá, Juan Pérez…"
            aria-invalid={errorField === "name"}
            aria-describedby={errorField === "name" ? "person-form-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (errorField === "name") {
                setError("");
                setErrorField(null);
                setSubmitStatus(undefined);
              }
            }}
            required
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cuánto le toca pagar ($ MXN)">
            <input
              id="person-amount"
              className={inputClass}
              inputMode="decimal"
              type="text"
              value={amount}
              placeholder="0.00"
              aria-invalid={errorField === "amount"}
              aria-describedby={errorField === "amount" ? "person-form-error" : undefined}
              onChange={(event) => {
                setAmount(event.target.value);
                if (errorField === "amount") {
                  setError("");
                  setErrorField(null);
                  setSubmitStatus(undefined);
                }
              }}
              required
            />
          </Field>

          <Field label="Fecha en que tiene que pagar">
            <input
              id="person-due-date"
              className={inputClass}
              type="date"
              value={dueDate}
              aria-invalid={errorField === "dueDate"}
              aria-describedby={errorField === "dueDate" ? "person-form-error" : undefined}
              onChange={(event) => {
                setDueDate(event.target.value);
                if (errorField === "dueDate") {
                  setError("");
                  setErrorField(null);
                  setSubmitStatus(undefined);
                }
              }}
              required
            />
          </Field>
        </div>

        {error ? (
          <p id="person-form-error" role="alert" aria-live="assertive" className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="mt-2 w-full"
          status={submitStatus}
          statusMessage={submitStatus === "success" ? "Persona guardada correctamente." : submitStatus === "error" ? "Hay un error que debes corregir." : undefined}
        >
          {editing ? "Guardar cambios de la persona" : "Agregar persona"}
        </Button>
      </form>

      {/* Lista de Personas Registradas */}
      {people.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper/50 p-6 text-center xl:col-start-2 xl:row-start-2">
          <Users className="size-8 text-muted mx-auto mb-2" />
          <p className="font-display text-lg font-medium text-ink">No hay personas registradas</p>
          <p className="mt-1 text-xs text-muted max-w-xs mx-auto">
            Puedes agregar una o varias personas, asignarles montos individuales o automáticos y fecha de pago.
          </p>
        </div>
      ) : (
        <div className="space-y-3 xl:col-start-2 xl:row-start-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="font-display text-lg font-medium text-ink">Integrantes ({people.length})</h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-11 rounded-xl px-2 text-[11px] font-semibold text-forest hover:bg-forest/10"
                onClick={() => {
                  setAllPeopleSettled(true);
                  toast.success("Todos marcados como pagados");
                }}
              >
                Todos pagaron
              </button>
              <span className="text-muted">·</span>
              <button
                type="button"
                className="min-h-11 rounded-xl px-2 text-[11px] font-semibold text-muted hover:bg-paper hover:text-ink"
                onClick={() => {
                  setAllPeopleSettled(false);
                  toast.message("Todos marcados como pendientes");
                }}
              >
                Todos pendientes
              </button>
            </div>
          </div>

          <ul className="space-y-3">
            {people.map((person) => {
              const due = dueLabel(person.dueDate, person.settled);
              const pendingAmount = person.settled ? 0 : person.amountCents;

              return (
                <li
                  key={person.id}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink text-base truncate">{person.name}</p>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                            person.settled
                              ? "bg-forest/15 text-forest"
                              : "bg-danger/15 text-danger",
                          )}
                        >
                          {person.settled ? "PAGADO" : "PENDIENTE"}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "text-xs mt-0.5 flex items-center gap-1",
                          due.tone === "late" && "text-danger font-medium",
                          due.tone === "soon" && "text-amber-600 dark:text-amber-400 font-medium",
                          (due.tone === "ok" || due.tone === "paid") && "text-muted",
                        )}
                      >
                        <Calendar className="size-3" />
                        <span>Paga el {formatShortDay(person.dueDate)} ({due.text})</span>
                      </p>

                      {!person.settled && (
                        <p className="text-xs text-danger font-medium mt-1">
                          Saldo pendiente para sig. mes: {formatMxn(pendingAmount)} MXN
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted">Monto</p>
                      <Money cents={person.amountCents} className="font-display text-lg font-medium text-ink" />
                    </div>
                  </div>

                  {/* Toggle Pagado y Acciones de Envío / Excel */}
                  <div className="pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer font-medium">
                      <Toggle
                        checked={person.settled}
                        label={`${person.name} ya pagó`}
                        onCheckedChange={(next) => setPersonSettled(person.id, next)}
                      />
                      <span>{person.settled ? "Marcado como pagado" : "¿Ya pagó?"}</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="surface"
                        className="min-h-11 px-3 text-xs"
                        onClick={() => handleSinglePersonExcel(person)}
                        title={`Descargar Excel de ${person.name}`}
                      >
                        <FileSpreadsheet aria-hidden="true" className="size-4" />
                        Excel
                      </Button>

                      <Button
                        className="min-h-11 px-3 text-xs"
                        onClick={() => void handleSharePerson(person)}
                        loading={sharingId === person.id}
                        loadingLabel="Enviando…"
                        title={`Enviar corte a ${person.name}`}
                      >
                        <Send aria-hidden="true" className="size-4" />
                        Mandar
                      </Button>

                      <button
                        type="button"
                        aria-label={`Editar ${person.name}`}
                        className="grid size-11 place-items-center rounded-xl text-muted hover:bg-paper hover:text-ink"
                        onClick={() => {
                          setEditing(person);
                          setName(person.name);
                          setAmount((person.amountCents / 100).toFixed(2));
                          setDueDate(person.dueDate);
                          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                          document.getElementById("people-form")?.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
                        }}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>

                      <button
                        type="button"
                        aria-label={`Quitar ${person.name}`}
                        className="grid size-11 place-items-center rounded-xl text-muted hover:bg-danger/10 hover:text-danger"
                        onClick={() => {
                          removePerson(person.id);
                          if (editing?.id === person.id) reset();
                          toast.success("Persona quitada");
                        }}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Modal de Corte de Mes y Envío en Excel */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        expenses={expenses}
        people={people}
      />
    </div>
  );
}
