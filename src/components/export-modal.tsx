import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, FileSpreadsheet, MessageCircle, Send, Share2, X, Check, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, Money } from "@/components/ui";
import type { Expense, PersonDue } from "@/lib/ledger-store";
import { formatMxn, formatShortDay, periodLabel, sumExpenses, sumPeople } from "@/lib/money";
import {
  buildMonthlyExcelWorkbook,
  buildSingleMemberExcelWorkbook,
  buildMemberWhatsAppText,
  downloadExcelFile,
  shareMemberReport,
} from "@/lib/excel-export";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  people: PersonDue[];
  closedAt?: string;
  title?: string;
}

export function ExportModal({
  open,
  onOpenChange,
  expenses,
  people,
  closedAt,
  title = "Corte del Mes y Envío en Excel",
}: ExportModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExportingGeneral, setIsExportingGeneral] = useState(false);
  const [sharingPersonId, setSharingPersonId] = useState<string | null>(null);

  const expenseTotals = sumExpenses(expenses);
  const peopleTotals = sumPeople(people);
  const period = periodLabel(expenses.map((e) => e.date));

  function handleDownloadGeneral() {
    setIsExportingGeneral(true);
    try {
      const bytes = buildMonthlyExcelWorkbook({
        expenses,
        people,
        closedAt,
        periodLabelText: period,
      });
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `Cuentas_Claras_Reporte_Mes_${stamp}.xlsx`;
      downloadExcelFile(bytes, fileName);
      toast.success("Excel general (.xlsx) descargado exitosamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el archivo Excel");
    } finally {
      setIsExportingGeneral(false);
    }
  }

  function handleDownloadSinglePerson(person: PersonDue) {
    try {
      const bytes = buildSingleMemberExcelWorkbook(person, expenses, people, closedAt);
      const safeName = person.name.toLowerCase().replace(/[^a-z0-9]/gi, "_");
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `Cuentas_Claras_${safeName}_${stamp}.xlsx`;
      downloadExcelFile(bytes, fileName);
      toast.success(`Excel de ${person.name} descargado`);
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el archivo");
    }
  }

  async function handleSharePerson(person: PersonDue) {
    setSharingPersonId(person.id);
    try {
      const res = await shareMemberReport(person, expenses, people, closedAt);
      if (res.success) {
        if (res.method === "share-file") toast.success(`Excel y reporte enviados para ${person.name}`);
        else if (res.method === "share-text") toast.success(`Reporte compartido para ${person.name}`);
        else if (res.method === "whatsapp") toast.success(`Abriendo WhatsApp para ${person.name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo compartir");
    } finally {
      setSharingPersonId(null);
    }
  }

  function handleCopyText(person: PersonDue) {
    const text = buildMemberWhatsAppText(person, expenses, people.length);
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopiedId(person.id);
        toast.success(`Mensaje para ${person.name} copiado`);
        setTimeout(() => setCopiedId(null), 2500);
      },
      () => toast.error("No se pudo copiar el texto"),
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-xs animate-in fade-in" />
        <Dialog.Content className="fixed inset-x-4 top-[5%] z-50 mx-auto max-h-[90dvh] max-w-lg overflow-y-auto rounded-3xl bg-surface p-5 shadow-2xl border border-line animate-in zoom-in-95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-forest/15 text-forest">
                  <FileSpreadsheet className="size-4" />
                </span>
                <Dialog.Title className="font-display text-2xl font-medium tracking-tight text-ink">
                  {title}
                </Dialog.Title>
              </div>
              <Dialog.Description className="mt-1 text-xs text-muted">
                Envía a cada integrante su reporte en Excel con los gastos y lo que queda pendiente para el siguiente mes.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink transition-colors"
                aria-label="Cerrar ventana"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Resumen del Corte */}
          <div className="mt-4 rounded-2xl bg-paper border border-line p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-muted font-medium">Período</span>
              <span className="text-xs font-medium text-ink">{period}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/60">
              <div className="rounded-xl bg-surface p-2.5">
                <p className="text-[11px] text-muted">Total Gastos</p>
                <p className="font-display text-lg font-medium text-ink">
                  <Money cents={expenseTotals.all} />
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  Ef: <Money cents={expenseTotals.cash} /> · Tarj: <Money cents={expenseTotals.card} />
                </p>
              </div>

              <div className="rounded-xl bg-surface p-2.5">
                <p className="text-[11px] text-muted">Pendiente Siguiente Mes</p>
                <p className="font-display text-lg font-medium text-danger">
                  <Money cents={peopleTotals.pending} />
                </p>
                <p className="text-[10px] text-forest mt-0.5">
                  Cobrado: <Money cents={peopleTotals.settled} />
                </p>
              </div>
            </div>

            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={handleDownloadGeneral}
              disabled={isExportingGeneral || expenses.length === 0}
            >
              <Download className="size-4" />
              Descargar Excel General (.xlsx)
            </Button>
          </div>

          {/* Lista de Integrantes para Envío Individual */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-lg font-medium text-ink">
                Mandar a cada integrante ({people.length})
              </h3>
              <span className="text-xs text-muted">Pesos Mexicanos (MXN)</span>
            </div>

            {people.length === 0 ? (
              <div className="rounded-2xl border border-line bg-paper/50 p-4 text-center">
                <AlertCircle className="size-6 text-muted mx-auto mb-1.5" />
                <p className="text-sm font-medium text-ink">No hay integrantes registrados</p>
                <p className="text-xs text-muted mt-0.5">
                  Agrega personas en la pestaña &quot;Personas&quot; para enviarles su reporte en Excel y su saldo pendiente.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {people.map((person) => {
                  const pending = person.settled ? 0 : person.amountCents;
                  const isSettled = person.settled;

                  return (
                    <li
                      key={person.id}
                      className="rounded-2xl border border-line bg-surface p-3.5 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink text-sm">{person.name}</p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isSettled
                                  ? "bg-forest/15 text-forest"
                                  : "bg-danger/15 text-danger"
                              }`}
                            >
                              {isSettled ? "Pagado" : "Pendiente"}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            Fecha de pago: <span className="text-ink font-medium">{formatShortDay(person.dueDate)}</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-muted">Le toca pagar</p>
                          <p className="font-medium text-sm text-ink">
                            <Money cents={person.amountCents} />
                          </p>
                        </div>
                      </div>

                      {/* Aviso de saldo pendiente si aplica */}
                      {!isSettled ? (
                        <div className="rounded-xl bg-danger/10 border border-danger/20 px-3 py-1.5 flex items-center justify-between text-xs">
                          <span className="text-danger font-medium">Queda pendiente para siguiente mes:</span>
                          <span className="font-bold text-danger">{formatMxn(pending)} MXN</span>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-forest/10 border border-forest/20 px-3 py-1.5 flex items-center justify-between text-xs">
                          <span className="text-forest font-medium">Cuenta al corriente:</span>
                          <span className="font-medium text-forest">$0.00 pendiente</span>
                        </div>
                      )}

                      {/* Botones de acción para este integrante */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-line/60">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 h-9 rounded-xl border border-line bg-paper text-xs font-medium text-ink hover:bg-forest/10 hover:text-forest transition-colors"
                          onClick={() => handleDownloadSinglePerson(person)}
                          title={`Descargar Excel para ${person.name}`}
                        >
                          <FileSpreadsheet className="size-3.5" />
                          <span>Excel</span>
                        </button>

                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-forest text-paper text-xs font-medium hover:opacity-90 transition-opacity"
                          onClick={() => void handleSharePerson(person)}
                          disabled={sharingPersonId === person.id}
                          title={`Enviar reporte a ${person.name}`}
                        >
                          <Send className="size-3.5" />
                          <span>Mandar</span>
                        </button>

                        <button
                          type="button"
                          className="flex items-center justify-center gap-1.5 h-9 rounded-xl border border-line bg-paper text-xs font-medium text-muted hover:text-ink transition-colors"
                          onClick={() => handleCopyText(person)}
                          title={`Copiar texto para ${person.name}`}
                        >
                          {copiedId === person.id ? (
                            <>
                              <Check className="size-3.5 text-forest" />
                              <span className="text-forest">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-line">
            <Button variant="surface" className="w-full" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
