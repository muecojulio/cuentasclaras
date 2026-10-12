import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, inputClass, Money, Toggle } from "@/components/ui";
import { useLedger, type PersonDue } from "@/lib/ledger-store";
import { dueLabel, parseAmountToCents, sumExpenses, sumPeople, todayInMexico } from "@/lib/money";
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
  const removePerson = useLedger((state) => state.removePerson);
  const splitEvenly = useLedger((state) => state.splitEvenly);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayInMexico);
  const [editing, setEditing] = useState<PersonDue | null>(null);
  const [error, setError] = useState("");

  const spent = sumExpenses(expenses).all;
  const assigned = sumPeople(people);
  const gap = spent - assigned.assigned;

  function reset() {
    setName("");
    setAmount("");
    setEditing(null);
    setError("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const cents = parseAmountToCents(amount);
    if (!name.trim()) {
      setError("Escribe el nombre.");
      return;
    }
    if (cents === null) {
      setError("Escribe cuánto le toca, mayor a cero.");
      return;
    }
    if (!dueDate) {
      setError("Elige la fecha en que tiene que pagar.");
      return;
    }
    const input = { name, amountCents: cents, dueDate };
    const ok = editing ? updatePerson(editing.id, input) : addPerson(input);
    if (!ok) {
      setError("No se pudo guardar.");
      return;
    }
    toast.success(editing ? "Persona actualizada" : "Persona agregada");
    reset();
  }

  return (
    <div className="page-pad px-4 pt-5">
      <section className="rounded-3xl border border-line bg-surface px-4 py-4">
        <p className="text-sm text-muted">Gastos de la lista</p>
        <p className="font-display text-3xl font-medium tracking-tight">
          <Money cents={spent} />
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted">Asignado</p>
            <Money cents={assigned.assigned} className="font-medium" />
          </div>
          <div>
            <p className="text-muted">Por cobrar</p>
            <Money cents={assigned.pending} className="font-medium" />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {people.length === 0
            ? "Agrega una o más personas y ponle a cada una su monto y su fecha de pago."
            : gap === 0
              ? "El reparto cubre exactamente el total de gastos."
              : gap > 0
                ? `Faltan ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(gap / 100)} por asignar.`
                : "El reparto supera el total de gastos."}
        </p>
        <Button
          variant="surface"
          className="mt-3 w-full"
          disabled={people.length === 0 || spent <= 0}
          onClick={() => {
            if (splitEvenly()) toast.success("Monto repartido en partes iguales");
            else toast.error("Necesitas gastos y personas para repartir.");
          }}
        >
          Repartir el total en partes iguales
        </Button>
      </section>

      <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            {editing ? "Editar persona" : "Agregar persona"}
          </h2>
          {editing ? (
            <button type="button" className="text-sm text-muted" onClick={reset}>
              Cancelar
            </button>
          ) : null}
        </div>
        <Field label="Nombre" hint={error || undefined}>
          <input
            className={inputClass}
            value={name}
            maxLength={60}
            placeholder="Nombre"
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
            }}
            required
          />
        </Field>
        <Field label="Cuánto paga">
          <input
            className={inputClass}
            inputMode="decimal"
            value={amount}
            placeholder="0.00"
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
        <Field label="Fecha en que tiene que pagar">
          <input
            className={inputClass}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="w-full">
          {editing ? "Guardar cambios" : "Agregar persona"}
        </Button>
      </form>

      {people.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Nadie está en esta lista todavía.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {people.map((person) => {
            const due = dueLabel(person.dueDate, person.settled);
            return (
              <li key={person.id} className="rise rounded-2xl border border-line bg-surface px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{person.name}</p>
                    <p
                      className={cn(
                        "text-sm",
                        due.tone === "late" && "text-danger",
                        due.tone === "soon" && "text-forest",
                        (due.tone === "ok" || due.tone === "paid") && "text-muted",
                      )}
                    >
                      {due.text}
                    </p>
                  </div>
                  <Money cents={person.amountCents} className="font-medium" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-3 text-sm">
                    <Toggle
                      checked={person.settled}
                      label={`${person.name} ya pagó`}
                      onCheckedChange={(next) => setPersonSettled(person.id, next)}
                    />
                    Ya pagó
                  </label>
                  <div className="flex">
                    <button
                      type="button"
                      aria-label={`Editar ${person.name}`}
                      className="grid size-11 place-items-center rounded-xl text-muted motion-safe:active:scale-[0.96]"
                      onClick={() => {
                        setEditing(person);
                        setName(person.name);
                        setAmount((person.amountCents / 100).toFixed(2));
                        setDueDate(person.dueDate);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Quitar ${person.name}`}
                      className="grid size-11 place-items-center rounded-xl text-muted motion-safe:active:scale-[0.96]"
                      onClick={() => {
                        removePerson(person.id);
                        if (editing?.id === person.id) reset();
                        toast.success("Persona quitada");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
