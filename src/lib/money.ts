import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const MAX_CENTS = 100_000_000;

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

export function formatMxn(cents: number): string {
  return mxn.format(cents / 100);
}

export function todayInMexico(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function cleanText(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function parseAmountToCents(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(/\$/g, "");
  if (!s || !/^[\d.,]+$/.test(s)) return null;
  let normalized = s;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const frac = s.slice(lastComma + 1);
    normalized = frac.length > 0 && frac.length <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  if (cents <= 0 || cents > MAX_CENTS) return null;
  return cents;
}

export function formatLongDay(isoDate: string): string {
  const label = format(parseISO(isoDate), "EEEE d MMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortDay(isoDate: string): string {
  return format(parseISO(isoDate), "d MMM yyyy", { locale: es });
}

export function formatStamp(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy · HH:mm", { locale: es });
}

export function periodLabel(dates: string[]): string {
  if (dates.length === 0) return "Sin fechas";
  const sorted = [...dates].sort();
  const start = sorted[0]!;
  const end = sorted[sorted.length - 1]!;
  if (start === end) return formatShortDay(start);
  return `${format(parseISO(start), "d MMM", { locale: es })} – ${formatShortDay(end)}`;
}

export type DueTone = "paid" | "late" | "soon" | "ok";

export function dueLabel(
  due: string,
  settled: boolean,
  today = todayInMexico(),
): { text: string; tone: DueTone } {
  if (settled) return { text: "Pagado", tone: "paid" };
  if (due < today) return { text: "Vencido", tone: "late" };
  if (due === today) return { text: "Se paga hoy", tone: "soon" };
  const days = differenceInCalendarDays(parseISO(due), parseISO(today));
  if (days === 1) return { text: "Mañana", tone: "ok" };
  return { text: `En ${days} días`, tone: "ok" };
}

export function sumExpenses(expenses: { method: "efectivo" | "tarjeta"; amountCents: number }[]) {
  let cash = 0;
  let card = 0;
  for (const expense of expenses) {
    if (expense.method === "efectivo") cash += expense.amountCents;
    else card += expense.amountCents;
  }
  return { cash, card, all: cash + card };
}

export function sumPeople(people: { amountCents: number; settled: boolean }[]) {
  let assigned = 0;
  let pending = 0;
  for (const person of people) {
    assigned += person.amountCents;
    if (!person.settled) pending += person.amountCents;
  }
  return { assigned, pending, settled: assigned - pending };
}
