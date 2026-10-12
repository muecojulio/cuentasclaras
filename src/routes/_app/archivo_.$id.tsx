import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileSpreadsheet, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingList } from "@/components/shell";
import { Button, Money } from "@/components/ui";
import { ExportModal } from "@/components/export-modal";
import { useLedger, useLedgerReady } from "@/lib/ledger-store";
import { dueLabel, formatLongDay, formatMxn, formatShortDay, formatStamp, periodLabel, sumExpenses, sumPeople } from "@/lib/money";
import { buildSingleMemberExcelWorkbook, downloadExcelFile, shareMemberReport } from "@/lib/excel-export";
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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  if (!item) {
    return (
      <div className="page-pad mx-auto max-w-6xl space-y-3 px-4 pt-8">
        <h2 className="font-display text-2xl font-medium text-ink">Este cierre no se encuentra</h2>
        <p className="text-xs text-muted">Es posible que haya sido eliminado de este dispositivo.</p>
        <Link to="/archivo" className="inline-flex h-10 items-center text-xs font-semibold text-forest">
          ← Volver al archivo
        </Link>
      </div>
    );
  }

  const currentItem = item;
  const totals = sumExpenses(currentItem.expenses);
  const peopleTotals = sumPeople(currentItem.people);
  const days = [...new Set(currentItem.expenses.map((expense) => expense.date))].sort().reverse();
  const period = periodLabel(currentItem.expenses.map((expense) => expense.date));

  function handleSinglePersonExcel(person: (typeof currentItem.people)[0]) {
    try {
      const bytes = buildSingleMemberExcelWorkbook(person, currentItem.expenses, currentItem.people, currentItem.closedAt);
      const safeName = person.name.toLowerCase().replace(/[^a-z0-9]/gi, "_");
      downloadExcelFile(bytes, `Cuentas_Claras_${safeName}.xlsx`);
      toast.success(`Excel de ${person.name} descargado`);
    } catch {
      toast.error("Error al exportar");
    }
  }

  async function handleSharePerson(person: (typeof currentItem.people)[0]) {
    setSharingId(person.id);
    try {
      const res = await shareMemberReport(person, currentItem.expenses, currentItem.people, currentItem.closedAt);
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
    <div className="page-pad mx-auto max-w-6xl space-y-5 px-4 pb-28 pt-4">
      <Link
        to="/archivo"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-forest hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        <span>Volver a la lista de cierres</span>
      </Link>

      {/* Header Resumen del Cierre */}
      <section className="rounded-3xl bg-forest p-5 text-paper shadow-md">
        <p className="text-xs text-paper/75 font-medium">Guardado el {formatStamp(item.closedAt)}</p>
        <h1 className="font-display text-3xl font-medium tracking-tight mt-1">{period}</h1>

        <div className="mt-3 flex items-baseline justify-between pt-3 border-t border-paper/20">
          <div>
            <p className="text-xs text-paper/70">Total Gastos (Pesos Mexicanos)</p>
            <p className="font-display text-3xl font-medium mt-0.5">
              <Money cents={totals.all} />
            </p>
          </div>
          <p className="text-right text-xs text-paper/80">
            Efectivo: <Money cents={totals.cash} />
            <br />
            Tarjeta: <Money cents={totals.card} />
          </p>
        </div>
      </section>

      {/* Botón Maestro de Exportación / Envío a Integrantes */}
      <section className="rounded-2xl border border-line bg-surface p-3.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink">Reporte en Excel (.xlsx)</p>
          <p className="text-[11px] text-muted truncate">Descarga el reporte completo o envíalo a cada integrante</p>
        </div>

        <Button
          className="shrink-0 flex items-center gap-1.5 bg-forest text-paper text-xs h-9 px-3"
          onClick={() => setExportModalOpen(true)}
        >
          <FileSpreadsheet className="size-4" />
          <span>Mandar / Excel</span>
        </Button>
      </section>

      {/* Sección Integrantes y Saldos Pendientes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-medium text-ink">
            Integrantes y estado de pago ({item.people.length})
          </h2>
          {item.people.length > 0 && (
            <span className="text-xs text-muted">
              {peopleTotals.pending > 0 ? (
                <span className="text-danger font-medium">
                  Pendiente: <Money cents={peopleTotals.pending} />
                </span>
              ) : (
                <span className="text-forest font-medium">Todo pagado</span>
              )}
            </span>
          )}
        </div>

        {item.people.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-4 text-xs text-muted">
            Este cierre no guardó personas registradas.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {item.people.map((person) => {
              const due = dueLabel(person.dueDate, person.settled);
              const pendingAmount = person.settled ? 0 : person.amountCents;

              return (
                <li key={person.id} className="rounded-2xl border border-line bg-surface p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink text-sm">{person.name}</p>
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
                      <p className="text-xs text-muted mt-0.5">
                        Fecha límite: {formatShortDay(person.dueDate)} ({due.text})
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted">Asignado</p>
                      <Money cents={person.amountCents} className="font-medium text-sm text-ink" />
                    </div>
                  </div>

                  {!person.settled && (
                    <div className="rounded-xl bg-danger/10 px-3 py-1 text-xs text-danger font-medium flex items-center justify-between">
                      <span>Pendiente para sig. mes:</span>
                      <span className="font-bold">{formatMxn(pendingAmount)} MXN</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-line/60 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl border border-line bg-paper text-xs font-medium text-ink hover:bg-forest/10 hover:text-forest transition-colors"
                      onClick={() => handleSinglePersonExcel(person)}
                    >
                      <FileSpreadsheet className="size-3.5" />
                      <span>Excel</span>
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-forest text-paper text-xs font-medium hover:opacity-90 transition-opacity"
                      onClick={() => void handleSharePerson(person)}
                      disabled={sharingId === person.id}
                    >
                      <Send className="size-3.5" />
                      <span>Mandar</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Detalle de Gastos por Día */}
      <section className="space-y-3 pt-2">
        <h2 className="font-display text-lg font-medium text-ink px-1">
          Gastos del período ({item.expenses.length})
        </h2>

        {days.map((day) => (
          <div key={day} className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted px-1">
              {formatLongDay(day)}
            </h3>
            <ul className="space-y-2">
              {item.expenses
                .filter((expense) => expense.date === day)
                .map((expense) => (
                  <li
                    key={expense.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs">{expense.method === "efectivo" ? "💵" : "💳"}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{expense.description}</p>
                        <p className="text-[11px] text-muted">
                          {expense.method === "efectivo" ? "Efectivo" : "Tarjeta"}
                        </p>
                      </div>
                    </div>
                    <Money cents={expense.amountCents} className="text-sm font-medium text-ink shrink-0" />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Botón Borrar Cierre */}
      <div className="pt-6 border-t border-line">
        <Button variant="danger" className="w-full h-11 text-xs" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" />
          <span>Eliminar este cierre del archivo</span>
        </Button>
      </div>

      {/* Modal de Envío en Excel */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        expenses={item.expenses}
        people={item.people}
        closedAt={item.closedAt}
        title="Corte del Archivo y Envío en Excel"
      />

      {/* Confirmación para Eliminar Cierre */}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-5 shadow-2xl border border-line">
            <h3 className="font-display text-xl font-medium text-ink">¿Borrar este cierre?</h3>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Esta acción no se puede deshacer. Se eliminarán los gastos y registros asociados a este cierre en este dispositivo.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="surface" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  removeArchive(item.id);
                  toast.success("Cierre eliminado del archivo");
                  void navigate({ to: "/archivo" });
                }}
              >
                Borrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
