import * as XLSX from "xlsx";
import type { Expense, PersonDue } from "./ledger-store.ts";
import { formatLongDay, formatMxn, formatShortDay, formatStamp, periodLabel, sumExpenses, sumPeople } from "./money.ts";

export interface ReportData {
  title?: string;
  periodLabelText?: string;
  closedAt?: string;
  expenses: Expense[];
  people: PersonDue[];
}

/**
 * Builds a multi-sheet Excel workbook (.xlsx) containing:
 * 1. Resumen General y Pendientes para el siguiente mes
 * 2. Detalle completo de Gastos (Efectivo y Tarjeta)
 * 3. Hojas individuales por cada integrante
 */
export function buildMonthlyExcelWorkbook(data: ReportData): Uint8Array {
  const wb = XLSX.utils.book_new();
  const expenseTotals = sumExpenses(data.expenses);
  const peopleTotals = sumPeople(data.people);
  const period = data.periodLabelText || periodLabel(data.expenses.map((e) => e.date));
  const generatedStamp = data.closedAt ? formatStamp(data.closedAt) : formatStamp(new Date().toISOString());

  // -------------------------------------------------------------
  // HOJA 1: RESUMEN GENERAL Y ESTADO DE INTEGRANTES
  // -------------------------------------------------------------
  const summaryRows: (string | number)[][] = [
    ["CUENTAS CLARAS - REPORTE DE GASTOS Y CORTE MENSUAL"],
    ["Moneda oficial:", "Pesos Mexicanos (MXN)"],
    ["Período:", period],
    ["Fecha de emisión:", generatedStamp],
    [],
    ["--- RESUMEN FINANCIERO GENERAL ---", ""],
    ["Concepto", "Monto en Pesos ($ MXN)"],
    ["Total de Gastos Registrados", expenseTotals.all / 100],
    ["Gastos pagados en Efectivo", expenseTotals.cash / 100],
    ["Gastos pagados con Tarjeta", expenseTotals.card / 100],
    ["Total Asignado a Integrantes", peopleTotals.assigned / 100],
    ["Total Cobrado / Pagado", peopleTotals.settled / 100],
    ["TOTAL PENDIENTE PARA SIGUIENTE MES", peopleTotals.pending / 100],
    [],
    ["--- INTEGRANTES Y ESTADO DE PAGO ---", "", "", "", "", ""],
    [
      "Nombre del Integrante",
      "Monto Asignado ($ MXN)",
      "Fecha Límite de Pago",
      "Estado de Pago",
      "Monto Pagado ($ MXN)",
      "Pendiente para Siguiente Mes ($ MXN)",
    ],
  ];

  if (data.people.length === 0) {
    summaryRows.push(["(Sin integrantes registrados)", 0, "-", "-", 0, 0]);
  } else {
    for (const person of data.people) {
      const assigned = person.amountCents / 100;
      const paid = person.settled ? assigned : 0;
      const pending = person.settled ? 0 : assigned;
      const statusText = person.settled ? "PAGADO" : "PENDIENTE";
      const dueFormatted = formatShortDay(person.dueDate);

      summaryRows.push([
        person.name,
        assigned,
        dueFormatted,
        statusText,
        paid,
        pending,
      ]);
    }
  }

  summaryRows.push([]);
  summaryRows.push([
    "TOTALES",
    peopleTotals.assigned / 100,
    "-",
    peopleTotals.pending === 0 ? "TODO AL CORRIENTE" : "CON SALDOS PENDIENTES",
    peopleTotals.settled / 100,
    peopleTotals.pending / 100,
  ]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs["!cols"] = [
    { wch: 32 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 32 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumen y Pendientes");

  // -------------------------------------------------------------
  // HOJA 2: DETALLE DE GASTOS
  // -------------------------------------------------------------
  const expenseRows: (string | number)[][] = [
    ["DESGLOSE DETALLADO DE GASTOS"],
    ["Período:", period],
    ["Moneda:", "Pesos Mexicanos (MXN)"],
    [],
    ["#", "Fecha", "Descripción del Gasto", "Método de Pago", "Monto ($ MXN)"],
  ];

  const sortedExpenses = [...data.expenses].sort((a, b) => a.date.localeCompare(b.date));

  if (sortedExpenses.length === 0) {
    expenseRows.push([1, "-", "Sin gastos registrados", "-", 0]);
  } else {
    sortedExpenses.forEach((exp, idx) => {
      expenseRows.push([
        idx + 1,
        exp.date,
        exp.description,
        exp.method === "efectivo" ? "Efectivo" : "Tarjeta",
        exp.amountCents / 100,
      ]);
    });
  }

  expenseRows.push([]);
  expenseRows.push([
    "",
    "",
    "TOTAL DE GASTOS",
    `Efectivo: ${formatMxn(expenseTotals.cash)} | Tarjeta: ${formatMxn(expenseTotals.card)}`,
    expenseTotals.all / 100,
  ]);

  const expensesWs = XLSX.utils.aoa_to_sheet(expenseRows);
  expensesWs["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 36 },
    { wch: 18 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, expensesWs, "Detalle de Gastos");

  // -------------------------------------------------------------
  // HOJAS INDIVIDUALES POR INTEGRANTE (Hasta 20 personas)
  // -------------------------------------------------------------
  data.people.slice(0, 20).forEach((person) => {
    // Clean sheet name (Excel limits sheet names to 31 chars and no : \ / ? * [ ])
    const safeSheetName = person.name
      .replace(/[:\\/?*[\]]/g, "")
      .trim()
      .slice(0, 28) || `Persona_${person.id.slice(0, 4)}`;

    const assigned = person.amountCents / 100;
    const paid = person.settled ? assigned : 0;
    const pending = person.settled ? 0 : assigned;

    const personRows: (string | number)[][] = [
      [`CORTE INDIVIDUAL: ${person.name.toUpperCase()}`],
      ["Período:", period],
      ["Moneda:", "Pesos Mexicanos (MXN)"],
      [],
      ["Concepto", "Detalle"],
      ["Integrante", person.name],
      ["Monto que le corresponde pagar", assigned],
      ["Fecha límite de pago", formatShortDay(person.dueDate)],
      ["Estado del pago", person.settled ? "PAGADO" : "PENDIENTE"],
      ["Monto ya cubierto", paid],
      ["SALDO PENDIENTE PARA EL SIGUIENTE MES", pending],
      [],
      ["--- RESUMEN DE GASTOS DEL GRUPO EN ESTE PERÍODO ---"],
      ["Total de gastos del grupo", expenseTotals.all / 100],
      ["Gastos pagados en efectivo", expenseTotals.cash / 100],
      ["Gastos pagados con tarjeta", expenseTotals.card / 100],
      ["Total de integrantes", data.people.length],
    ];

    const personWs = XLSX.utils.aoa_to_sheet(personRows);
    personWs["!cols"] = [{ wch: 38 }, { wch: 26 }];

    // Ensure unique sheet name in workbook
    if (!wb.SheetNames.includes(safeSheetName)) {
      XLSX.utils.book_append_sheet(wb, personWs, safeSheetName);
    }
  });

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(arrayBuffer);
}

/**
 * Builds an individual Excel workbook (.xlsx) specifically for one member.
 */
export function buildSingleMemberExcelWorkbook(
  person: PersonDue,
  allExpenses: Expense[],
  allPeople: PersonDue[],
  closedAt?: string,
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const expenseTotals = sumExpenses(allExpenses);
  const period = periodLabel(allExpenses.map((e) => e.date));
  const generatedStamp = closedAt ? formatStamp(closedAt) : formatStamp(new Date().toISOString());

  const assigned = person.amountCents / 100;
  const paid = person.settled ? assigned : 0;
  const pending = person.settled ? 0 : assigned;

  const rows: (string | number)[][] = [
    ["CUENTAS CLARAS - CORTE INDIVIDUAL DE GASTOS"],
    ["Integrante:", person.name],
    ["Período:", period],
    ["Fecha de emisión:", generatedStamp],
    ["Moneda:", "Pesos Mexicanos (MXN)"],
    [],
    ["--- ESTADO DE TU CUENTA ---", ""],
    ["Concepto", "Monto / Detalle"],
    ["Monto asignado a pagar", assigned],
    ["Fecha límite de pago", formatShortDay(person.dueDate)],
    ["Estado de pago", person.settled ? "✅ PAGADO" : "⚠️ PENDIENTE"],
    ["Monto liquidado", paid],
    ["SALDO PENDIENTE PARA SIGUIENTE MES", pending],
    [],
    ["--- GASTOS REGISTRADOS DEL GRUPO ---", "", "", ""],
    ["Fecha", "Descripción", "Método", "Monto ($ MXN)"],
  ];

  const sorted = [...allExpenses].sort((a, b) => a.date.localeCompare(b.date));
  sorted.forEach((exp) => {
    rows.push([
      exp.date,
      exp.description,
      exp.method === "efectivo" ? "Efectivo" : "Tarjeta",
      exp.amountCents / 100,
    ]);
  });

  rows.push([]);
  rows.push(["TOTAL GRUPO", `${allExpenses.length} gastos`, `Repartido entre ${allPeople.length} personas`, expenseTotals.all / 100]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 34 }, { wch: 26 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, "Corte Individual");

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(arrayBuffer);
}

/**
 * Triggers browser download of a generated Excel (.xlsx) file.
 */
export function downloadExcelFile(data: Uint8Array, fileName: string) {
  const blob = new Blob([data as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Creates preformatted WhatsApp message text for a member.
 */
export function buildMemberWhatsAppText(
  person: PersonDue,
  allExpenses: Expense[],
  allPeopleCount: number,
): string {
  const expenseTotals = sumExpenses(allExpenses);
  const pending = person.settled ? 0 : person.amountCents;
  const statusEmoji = person.settled ? "✅ *PAGADO*" : "⚠️ *PENDIENTE*";

  return `*CUENTAS CLARAS - CORTE DE GASTOS* 📊
👋 Hola *${person.name}*, aquí tienes el resumen de gastos en pesos mexicanos ($ MXN):

💵 *Monto asignado a pagar:* ${formatMxn(person.amountCents)} MXN
📅 *Fecha límite de pago:* ${formatShortDay(person.dueDate)}
📌 *Estado:* ${statusEmoji}
⏳ *Saldo pendiente para el siguiente mes:* ${formatMxn(pending)} MXN

----------------------------
📊 *Total general de gastos:* ${formatMxn(expenseTotals.all)} MXN
💳 *Tarjeta:* ${formatMxn(expenseTotals.card)} | 💵 *Efectivo:* ${formatMxn(expenseTotals.cash)}
👥 *Total integrantes:* ${allPeopleCount}

_Generado automáticamente desde Cuentas Claras._`;
}

/**
 * Shares or sends report to a member via Web Share API or WhatsApp link.
 */
export async function shareMemberReport(
  person: PersonDue,
  allExpenses: Expense[],
  allPeople: PersonDue[],
  closedAt?: string,
): Promise<{ method: "share-file" | "share-text" | "whatsapp" | "download"; success: boolean }> {
  const messageText = buildMemberWhatsAppText(person, allExpenses, allPeople.length);
  const cleanName = person.name.toLowerCase().replace(/[^a-z0-9]/gi, "_");
  const fileName = `Cuentas_Claras_${cleanName}_${todayFileStamp()}.xlsx`;

  try {
    const bytes = buildSingleMemberExcelWorkbook(person, allExpenses, allPeople, closedAt);
    const file = new File([bytes as unknown as BlobPart], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    if (
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title: `Corte de Gastos - ${person.name}`,
        text: messageText,
        files: [file],
      });
      return { method: "share-file", success: true };
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: `Corte de Gastos - ${person.name}`,
        text: messageText,
      });
      // Also download Excel
      downloadExcelFile(bytes, fileName);
      return { method: "share-text", success: true };
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      return { method: "share-file", success: false };
    }
  }

  // Fallback to WhatsApp Web/App URL
  const waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  window.open(waUrl, "_blank", "noopener,noreferrer");
  return { method: "whatsapp", success: true };
}

function todayFileStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
