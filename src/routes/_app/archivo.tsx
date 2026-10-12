import { Link, createFileRoute } from "@tanstack/react-router";
import { Money } from "@/components/ui";
import { useLedger } from "@/lib/ledger-store";
import { formatStamp, periodLabel, sumExpenses, sumPeople } from "@/lib/money";

export const Route = createFileRoute("/_app/archivo")({
  component: ArchivoPage,
});

function ArchivoPage() {
  return <ArchivoReady />;
}

function ArchivoReady() {
  const archive = useLedger((state) => state.archive);

  return (
    <div className="page-pad px-4 pt-5">
      <h2 className="font-display text-3xl font-medium tracking-tight">Archivo</h2>
      <p className="mt-2 text-sm text-muted">
        Cada cierre se queda guardado en este teléfono. La lista abierta queda libre para empezar de nuevo.
      </p>
      {archive.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          Cuando cierres los gastos de un día o de varios, aparecerán aquí.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {archive.map((item) => {
            const totals = sumExpenses(item.expenses);
            const people = sumPeople(item.people);
            const dates = item.expenses.map((expense) => expense.date);
            return (
              <li key={item.id} className="rise">
                <Link
                  to="/archivo/$id"
                  params={{ id: item.id }}
                  className="block rounded-3xl border border-line bg-surface px-4 py-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.96]"
                >
                  <p className="text-sm text-muted">Cerrado {formatStamp(item.closedAt)}</p>
                  <p className="mt-1 font-display text-2xl font-medium tracking-tight">
                    {periodLabel(dates)}
                  </p>
                  <p className="mt-2 text-lg font-medium">
                    <Money cents={totals.all} />
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.expenses.length} {item.expenses.length === 1 ? "gasto" : "gastos"}
                    {item.people.length > 0
                      ? ` · ${people.pending > 0 ? "hay pagos pendientes" : "personas al corriente"}`
                      : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
