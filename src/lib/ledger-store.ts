import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { cleanText, MAX_CENTS } from "./money.ts";
import {
  DEFAULT_EXPENSE_CATEGORY,
  isExpenseCategory,
  type ExpenseCategory,
} from "./expense-categories.ts";

export type PayMethod = "efectivo" | "tarjeta";

export type Expense = {
  id: string;
  date: string;
  description: string;
  method: PayMethod;
  category: ExpenseCategory;
  amountCents: number;
  createdAt: string;
};

export type PersonDue = {
  id: string;
  name: string;
  amountCents: number;
  dueDate: string;
  settled: boolean;
};

export type OpenLedger = {
  id: string;
  openedAt: string;
  expenses: Expense[];
  people: PersonDue[];
};

export type ClosedLedger = {
  id: string;
  openedAt: string;
  closedAt: string;
  expenses: Expense[];
  people: PersonDue[];
};

type ExpenseInput = {
  date: string;
  description: string;
  method: PayMethod;
  amountCents: number;
  category?: ExpenseCategory;
};

type PersonInput = {
  name: string;
  amountCents: number;
  dueDate: string;
};

type LedgerState = {
  open: OpenLedger;
  archive: ClosedLedger[];
  addExpense: (input: ExpenseInput) => boolean;
  updateExpense: (id: string, input: ExpenseInput) => boolean;
  removeExpense: (id: string) => void;
  addPerson: (input: PersonInput) => boolean;
  updatePerson: (id: string, input: PersonInput) => boolean;
  setPersonSettled: (id: string, settled: boolean) => void;
  setAllPeopleSettled: (settled: boolean) => void;
  removePerson: (id: string) => void;
  splitEvenly: () => boolean;
  closeDays: (dates: string[], carryOverUnsettled?: boolean) => "full" | "partial" | null;
  startNewList: (carryOverUnsettled?: boolean) => void;
  removeArchive: (id: string) => void;
};

const EMPTY_OPEN: OpenLedger = {
  id: "pending",
  openedAt: "",
  expenses: [],
  people: [],
};

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function uid(): string {
  return crypto.randomUUID();
}

export function freshOpen(initialPeople: PersonDue[] = []): OpenLedger {
  return {
    id: uid(),
    openedAt: new Date().toISOString(),
    expenses: [],
    people: initialPeople.map((p) => ({
      ...p,
      id: uid(),
      settled: false,
    })),
  };
}

function validCents(cents: number): boolean {
  return Number.isInteger(cents) && cents > 0 && cents <= MAX_CENTS;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function expenseFrom(input: ExpenseInput, id: string, createdAt: string): Expense | null {
  const description = cleanText(input.description, 140);
  if (!description || !validDate(input.date) || !validCents(input.amountCents)) return null;
  if (input.method !== "efectivo" && input.method !== "tarjeta") return null;
  const category = input.category === undefined ? DEFAULT_EXPENSE_CATEGORY : input.category;
  if (!isExpenseCategory(category)) return null;
  return {
    id,
    date: input.date,
    description,
    method: input.method,
    category,
    amountCents: input.amountCents,
    createdAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addDefaultCategory(expense: unknown): unknown {
  if (!isRecord(expense)) return expense;
  return {
    ...expense,
    category: isExpenseCategory(expense.category) ? expense.category : DEFAULT_EXPENSE_CATEGORY,
  };
}

/** Upgrade the existing local v1 ledger without discarding saved expenses. */
export function migrateLedgerState(persistedState: unknown, _version: number): unknown {
  if (!isRecord(persistedState)) return { open: EMPTY_OPEN, archive: [] };
  const storedOpen = isRecord(persistedState.open) ? persistedState.open : EMPTY_OPEN;
  const archive = Array.isArray(persistedState.archive)
    ? persistedState.archive.filter(isRecord).map((entry) => ({
        ...entry,
        expenses: Array.isArray(entry.expenses) ? entry.expenses.map(addDefaultCategory) : [],
      }))
    : [];

  return {
    ...persistedState,
    open: {
      ...storedOpen,
      expenses: Array.isArray(storedOpen.expenses)
        ? storedOpen.expenses.map(addDefaultCategory)
        : [],
      people: Array.isArray(storedOpen.people) ? storedOpen.people : [],
    },
    archive,
  };
}

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      open: EMPTY_OPEN,
      archive: [],
      addExpense: (input) => {
        const expense = expenseFrom(input, uid(), new Date().toISOString());
        if (!expense) return false;
        const open = get().open;
        if (open.expenses.length >= 500) return false;
        set({ open: { ...open, expenses: [expense, ...open.expenses] } });
        return true;
      },
      updateExpense: (id, input) => {
        const open = get().open;
        const current = open.expenses.find((item) => item.id === id);
        if (!current) return false;
        const next = expenseFrom(input, id, current.createdAt);
        if (!next) return false;
        set({
          open: {
            ...open,
            expenses: open.expenses.map((item) => (item.id === id ? next : item)),
          },
        });
        return true;
      },
      removeExpense: (id) => {
        const open = get().open;
        set({ open: { ...open, expenses: open.expenses.filter((item) => item.id !== id) } });
      },
      addPerson: (input) => {
        const name = cleanText(input.name, 60);
        if (!name || !validDate(input.dueDate) || !validCents(input.amountCents)) return false;
        const open = get().open;
        if (open.people.length >= 40) return false;
        const person: PersonDue = {
          id: uid(),
          name,
          amountCents: input.amountCents,
          dueDate: input.dueDate,
          settled: false,
        };
        set({ open: { ...open, people: [...open.people, person] } });
        return true;
      },
      updatePerson: (id, input) => {
        const name = cleanText(input.name, 60);
        if (!name || !validDate(input.dueDate) || !validCents(input.amountCents)) return false;
        const open = get().open;
        if (!open.people.some((item) => item.id === id)) return false;
        set({
          open: {
            ...open,
            people: open.people.map((item) =>
              item.id === id
                ? { ...item, name, amountCents: input.amountCents, dueDate: input.dueDate }
                : item,
            ),
          },
        });
        return true;
      },
      setPersonSettled: (id, settled) => {
        const open = get().open;
        set({
          open: {
            ...open,
            people: open.people.map((item) => (item.id === id ? { ...item, settled } : item)),
          },
        });
      },
      setAllPeopleSettled: (settled) => {
        const open = get().open;
        set({
          open: {
            ...open,
            people: open.people.map((item) => ({ ...item, settled })),
          },
        });
      },
      removePerson: (id) => {
        const open = get().open;
        set({ open: { ...open, people: open.people.filter((item) => item.id !== id) } });
      },
      splitEvenly: () => {
        const open = get().open;
        if (open.people.length === 0) return false;
        const total = open.expenses.reduce((sum, item) => sum + item.amountCents, 0);
        if (total <= 0) return false;
        const base = Math.floor(total / open.people.length);
        let remainder = total - base * open.people.length;
        if (base <= 0 && remainder <= 0) return false;
        set({
          open: {
            ...open,
            people: open.people.map((person) => {
              const extra = remainder > 0 ? 1 : 0;
              if (remainder > 0) remainder -= 1;
              return { ...person, amountCents: base + extra };
            }),
          },
        });
        return true;
      },
      closeDays: (dates, carryOverUnsettled = true) => {
        const open = get().open;
        const chosen = new Set(dates);
        const moving = open.expenses.filter((item) => chosen.has(item.date));
        const staying = open.expenses.filter((item) => !chosen.has(item.date));
        if (moving.length === 0) return null;
        const full = staying.length === 0;

        // Archive gets the snapshot of these expenses and people
        const closed: ClosedLedger = {
          id: uid(),
          openedAt: open.openedAt || new Date().toISOString(),
          closedAt: new Date().toISOString(),
          expenses: moving,
          people: [...open.people],
        };
        const archive = [closed, ...get().archive].slice(0, 100);

        if (full) {
          // Carry over unsettled people if requested
          const pendingPeople = carryOverUnsettled
            ? open.people.filter((p) => !p.settled)
            : [];
          set({
            archive,
            open: freshOpen(pendingPeople),
          });
          return "full";
        } else {
          set({
            archive,
            open: { ...open, expenses: staying },
          });
          return "partial";
        }
      },
      startNewList: (carryOverUnsettled = false) => {
        const open = get().open;
        // If current list has expenses, archive it first so no data is lost
        if (open.expenses.length > 0) {
          const closed: ClosedLedger = {
            id: uid(),
            openedAt: open.openedAt || new Date().toISOString(),
            closedAt: new Date().toISOString(),
            expenses: open.expenses,
            people: [...open.people],
          };
          const archive = [closed, ...get().archive].slice(0, 100);
          const pendingPeople = carryOverUnsettled
            ? open.people.filter((p) => !p.settled)
            : [];
          set({
            archive,
            open: freshOpen(pendingPeople),
          });
        } else {
          const pendingPeople = carryOverUnsettled
            ? open.people.filter((p) => !p.settled)
            : [];
          set({
            open: freshOpen(pendingPeople),
          });
        }
      },
      removeArchive: (id) => {
        set({ archive: get().archive.filter((item) => item.id !== id) });
      },
    }),
    {
      name: "cuentasclaras-ledger-v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : window.localStorage,
      ),
      partialize: (state) => ({ open: state.open, archive: state.archive }),
      version: 2,
      migrate: migrateLedgerState,
      skipHydration: true,
    },
  ),
);

export function useLedgerReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const finish = () => {
      const open = useLedger.getState().open;
      if (!open.openedAt) useLedger.setState({ open: freshOpen() });
      if (alive) setReady(true);
    };
    if (useLedger.persist.hasHydrated()) {
      finish();
      return;
    }
    const unsub = useLedger.persist.onFinishHydration(finish);
    void useLedger.persist.rehydrate();
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return ready;
}
