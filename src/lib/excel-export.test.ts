import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "@e965/xlsx";
import {
  buildMonthlyExcelWorkbook,
  buildSingleMemberExcelWorkbook,
  buildMemberWhatsAppText,
} from "./excel-export.ts";
import type { Expense, PersonDue } from "./ledger-store.ts";
import { sumExpenses, sumPeople } from "./money.ts";

describe("Excel Export & Multi-Person Management", () => {
  const sampleExpenses: Expense[] = [
    {
      id: "exp-1",
      date: "2026-10-01",
      description: "Supermercado mensual",
      method: "tarjeta",
      category: "comida",
      amountCents: 150000, // $1,500.00 MXN
      createdAt: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "exp-2",
      date: "2026-10-02",
      description: "Gasolina y casetas",
      method: "efectivo",
      category: "transporte",
      amountCents: 85000, // $850.00 MXN
      createdAt: "2026-10-02T12:00:00.000Z",
    },
  ];

  const samplePeople: PersonDue[] = [
    {
      id: "per-1",
      name: "Alejandro Martínez",
      amountCents: 117500, // $1,175.00 MXN
      dueDate: "2026-10-15",
      settled: true,
    },
    {
      id: "per-2",
      name: "Mariana Gómez",
      amountCents: 117500, // $1,175.00 MXN
      dueDate: "2026-10-20",
      settled: false, // PENDIENTE para siguiente mes
    },
  ];

  it("calculates sums and pending balances accurately in Mexican Pesos", () => {
    const expenseTotals = sumExpenses(sampleExpenses);
    assert.strictEqual(expenseTotals.all, 235000); // $2,350.00 MXN
    assert.strictEqual(expenseTotals.card, 150000); // $1,500.00 MXN
    assert.strictEqual(expenseTotals.cash, 85000); // $850.00 MXN

    const peopleTotals = sumPeople(samplePeople);
    assert.strictEqual(peopleTotals.assigned, 235000); // $2,350.00 MXN
    assert.strictEqual(peopleTotals.settled, 117500); // $1,175.00 MXN pagado
    assert.strictEqual(peopleTotals.pending, 117500); // $1,175.00 MXN pendiente para sig mes
  });

  it("generates a multi-sheet general Excel workbook with MXN currency", () => {
    const bytes = buildMonthlyExcelWorkbook({
      expenses: sampleExpenses,
      people: samplePeople,
      periodLabelText: "1 Oct – 2 Oct 2026",
    });

    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.length > 0);

    const wb = XLSX.read(bytes, { type: "array" });
    assert.ok(wb.SheetNames.includes("Resumen y Pendientes"));
    assert.ok(wb.SheetNames.includes("Detalle de Gastos"));
    assert.ok(wb.SheetNames.includes("Alejandro Martínez"));
    assert.ok(wb.SheetNames.includes("Mariana Gómez"));

    // Check summary sheet content
    const summarySheet = wb.Sheets["Resumen y Pendientes"];
    const text = JSON.stringify(summarySheet);
    assert.ok(text.includes("CUENTAS CLARAS"));
    assert.ok(text.includes("Pesos Mexicanos (MXN)"));
    assert.ok(text.includes("TOTAL PENDIENTE PARA SIGUIENTE MES"));

    const detailText = JSON.stringify(wb.Sheets["Detalle de Gastos"]);
    assert.ok(detailText.includes("Categoría"));
    assert.ok(detailText.includes("Comida"));
  });

  it("generates single-member Excel with their specific pending balance", () => {
    const mariana = samplePeople[1]!;
    const bytes = buildSingleMemberExcelWorkbook(mariana, sampleExpenses, samplePeople);

    assert.ok(bytes instanceof Uint8Array);
    const wb = XLSX.read(bytes, { type: "array" });
    assert.ok(wb.SheetNames.includes("Corte Individual"));

    const sheet = wb.Sheets["Corte Individual"];
    const text = JSON.stringify(sheet);
    assert.ok(text.includes("Mariana Gómez"));
    assert.ok(text.includes("PENDIENTE"));
  });

  it("builds formatted WhatsApp message text with pending debt for next month", () => {
    const mariana = samplePeople[1]!;
    const msg = buildMemberWhatsAppText(mariana, sampleExpenses, samplePeople.length);

    assert.ok(msg.includes("Mariana Gómez"));
    assert.ok(msg.includes("Monto asignado a pagar"));
    assert.ok(msg.includes("PENDIENTE"));
    assert.ok(msg.includes("Saldo pendiente para el siguiente mes"));
    assert.ok(msg.includes("$1,175.00"));
  });
});
