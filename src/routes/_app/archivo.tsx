import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Archive, ChevronRight, FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";
import { Money } from "@/components/ui";
import { ExportModal } from "@/components/export-modal";
import { useLedger, type ClosedLedger } from "@/lib/ledger-store";
import { formatStamp, periodLabel, sumExpenses, sumPeople } from "@/lib/money";
import { buildMonthlyExcelWorkbook, downloadExcelFile } from "@/lib/excel-export";

export const Route = createFileRoute("/_app/archivo")({
  component: ArchivoPage,
});

function ArchivoPage() {
  return <ArchivoReady />;
}

function ArchivoReady() {
  const archive = useLedger((state) => state.archive);
  const [selectedForExport, setSelectedForExport] = useState<ClosedLedger | null>(null);

  function handleQuickExport(e: React.MouseEvent, item: ClosedLedger) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const bytes = buildMonthlyExcelWorkbook({
        expenses: item.expenses,
        people: item.people,
        closedAt: item.closedAt,
        periodLabelText: periodLabel(item.expenses.map((exp) => exp.date)),
      });
      const stamp = item.closedAt.slice(0, 10).replace(/-/g, "");
      downloadExcelFile(bytes, `Cuentas_Claras_Archivo_${stamp}.xlsx`);
      toast.success("Excel del cierre descargado");
    } catch {
      toast.error("Error al exportar");
    }
  }

  return (
    <div className="page-pad mx-auto max-w-6xl space-y-5 px-4 pb-28 pt-5">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest via-forest to-[#084d44] p-5 text-paper shadow-xl">
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-14 -z-10 size-48 rounded-full bg-citrus/30 blur-2xl" />
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-paper/20">
            <Archive className="size-5 text-paper" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Archivo de Cierres</h1>
            <p className="text-xs text-paper/80">Listas cerradas y guardadas en pesos mexicanos ($ MXN)</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted px-1">
        Cada vez que cierras los gastos de un día, semana o mes, se guardan aquí. Puedes consultar el detalle, descargarlos en Excel (.xlsx) o mandarlos a los integrantes.
      </p>

      {archive.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper/50 p-8 text-center space-y-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-surface border border-line text-muted mx-auto">
            <Archive className="size-6 text-forest" />
          </div>
          <div>
            <p className="font-display text-lg font-medium text-ink">No hay cierres guardados</p>
            <p className="mt-1 text-xs text-muted max-w-xs mx-auto">
              Cuando uses el botón &quot;Cerrar gastos&quot; en la pestaña Gastos, tus listas cerradas aparecerán aquí.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-forest px-4 text-xs font-semibold text-paper"
          >
            <Plus className="size-4" />
            <span>Ir a Gastos</span>
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {archive.map((item) => {
            const totals = sumExpenses(item.expenses);
            const people = sumPeople(item.people);
            const dates = item.expenses.map((expense) => expense.date);

            return (
              <li key={item.id} className="rounded-3xl border border-line bg-surface p-4 shadow-xs hover:border-forest/40 transition-colors space-y-3">
                <Link
                  to="/archivo/$id"
                  params={{ id: item.id }}
                  className="block group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">Cerrado el {formatStamp(item.closedAt)}</p>
                      <p className="font-display text-xl font-medium tracking-tight text-ink mt-0.5 group-hover:text-forest transition-colors">
                        {periodLabel(dates)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-display text-xl font-medium text-ink">
                        <Money cents={totals.all} />
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted pt-2 border-t border-line/60">
                    <div>
                      <span>
                        {item.expenses.length} {item.expenses.length === 1 ? "gasto" : "gastos"} (Ef: <Money cents={totals.cash} /> · Tarj: <Money cents={totals.card} />)
                      </span>
                      {item.people.length > 0 && (
                        <p className="mt-0.5 font-medium">
                          {people.pending > 0 ? (
                            <span className="text-danger">⚠️ Quedó pendiente: {people.pending > 0 ? <Money cents={people.pending} /> : "$0.00"}</span>
                          ) : (
                            <span className="text-forest">✅ Integrantes al corriente</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-forest font-medium">
                      <span>Ver detalles</span>
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </Link>

                <div className="pt-2 border-t border-line/60 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-paper px-3 text-xs font-semibold text-ink hover:bg-forest/10 hover:text-forest"
                    onClick={(e) => handleQuickExport(e, item)}
                  >
                    <FileSpreadsheet className="size-3.5 text-forest" />
                    <span>Descargar Excel</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-forest px-3 text-xs font-semibold text-paper hover:opacity-90"
                    onClick={() => setSelectedForExport(item)}
                  >
                    <span>Mandar a integrantes</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedForExport && (
        <ExportModal
          open={Boolean(selectedForExport)}
          onOpenChange={(open) => {
            if (!open) setSelectedForExport(null);
          }}
          expenses={selectedForExport.expenses}
          people={selectedForExport.people}
          closedAt={selectedForExport.closedAt}
          title="Corte del Archivo y Envío en Excel"
        />
      )}
    </div>
  );
}
