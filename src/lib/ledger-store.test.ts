import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { useLedger, freshOpen } from "./ledger-store.ts";
import { parseAmountToCents, formatMxn } from "./money.ts";

describe("Ledger Store & Expense Lifecycle", () => {
  beforeEach(() => {
    useLedger.setState({
      open: freshOpen(),
      archive: [],
    });
  });

  it("adds and calculates expenses in Mexican Pesos ($ MXN)", () => {
    const store = useLedger.getState();
    const ok1 = store.addExpense({
      date: "2026-10-10",
      description: "Despensa Walmart",
      method: "tarjeta",
      amountCents: 125050, // $1,250.50 MXN
    });
    const ok2 = store.addExpense({
      date: "2026-10-10",
      description: "Taxis y estacionamiento",
      method: "efectivo",
      amountCents: 20000, // $200.00 MXN
    });

    assert.strictEqual(ok1, true);
    assert.strictEqual(ok2, true);

    const expenses = useLedger.getState().open.expenses;
    assert.strictEqual(expenses.length, 2);
    assert.strictEqual(expenses[0]?.description, "Taxis y estacionamiento");
    assert.strictEqual(expenses[1]?.description, "Despensa Walmart");
  });

  it("allows adding more than one person and assigning amounts and due dates", () => {
    const store = useLedger.getState();
    const ok1 = store.addPerson({
      name: "Valeria Ríos",
      amountCents: 50000,
      dueDate: "2026-10-15",
    });
    const ok2 = store.addPerson({
      name: "Rodrigo Morales",
      amountCents: 75000,
      dueDate: "2026-10-20",
    });
    const ok3 = store.addPerson({
      name: "Camila Torres",
      amountCents: 20000,
      dueDate: "2026-10-25",
    });

    assert.strictEqual(ok1, true);
    assert.strictEqual(ok2, true);
    assert.strictEqual(ok3, true);

    const people = useLedger.getState().open.people;
    assert.strictEqual(people.length, 3);
    assert.strictEqual(people[0]?.name, "Valeria Ríos");
    assert.strictEqual(people[1]?.name, "Rodrigo Morales");
    assert.strictEqual(people[2]?.name, "Camila Torres");
  });

  it("splits total evenly among all members", () => {
    const store = useLedger.getState();
    store.addExpense({
      date: "2026-10-12",
      description: "Cena familiar",
      method: "tarjeta",
      amountCents: 100000, // $1,000.00 MXN
    });
    store.addPerson({ name: "Persona 1", amountCents: 100, dueDate: "2026-10-15" });
    store.addPerson({ name: "Persona 2", amountCents: 100, dueDate: "2026-10-15" });
    store.addPerson({ name: "Persona 3", amountCents: 100, dueDate: "2026-10-15" });

    const splitOk = useLedger.getState().splitEvenly();
    assert.strictEqual(splitOk, true);

    const people = useLedger.getState().open.people;
    const totalAssigned = people.reduce((acc, p) => acc + p.amountCents, 0);
    assert.strictEqual(totalAssigned, 100000); // Exactly $1,000.00 MXN
    assert.strictEqual(people[0]?.amountCents, 33334);
    assert.strictEqual(people[1]?.amountCents, 33333);
    assert.strictEqual(people[2]?.amountCents, 33333);
  });

  it("closes expenses into archive and generates a new fresh list carrying over pending members", () => {
    const store = useLedger.getState();
    store.addExpense({
      date: "2026-10-10",
      description: "Renta de oficina",
      method: "tarjeta",
      amountCents: 500000,
    });
    store.addPerson({
      name: "Juan Pagador",
      amountCents: 250000,
      dueDate: "2026-10-15",
    });
    store.addPerson({
      name: "Pedro Deudor",
      amountCents: 250000,
      dueDate: "2026-10-15",
    });

    // Mark Juan as settled
    const juanId = useLedger.getState().open.people[0]!.id;
    store.setPersonSettled(juanId, true);

    // Close the full list with carryOverUnsettled = true
    const result = useLedger.getState().closeDays(["2026-10-10"], true);
    assert.strictEqual(result, "full");

    const stateAfter = useLedger.getState();
    assert.strictEqual(stateAfter.archive.length, 1);
    assert.strictEqual(stateAfter.archive[0]?.expenses.length, 1);
    assert.strictEqual(stateAfter.archive[0]?.people.length, 2);

    // New open list has no expenses
    assert.strictEqual(stateAfter.open.expenses.length, 0);
    // And Pedro Deudor was carried over to next month
    assert.strictEqual(stateAfter.open.people.length, 1);
    assert.strictEqual(stateAfter.open.people[0]?.name, "Pedro Deudor");
    assert.strictEqual(stateAfter.open.people[0]?.settled, false);
    assert.strictEqual(stateAfter.open.people[0]?.amountCents, 250000);
  });
});
