export const EXPENSE_CATEGORIES = [
  { value: "comida", label: "Comida", emoji: "🥑", tone: "bg-citrus/35 text-ink" },
  { value: "transporte", label: "Transporte", emoji: "🚲", tone: "bg-sky/45 text-ink" },
  { value: "hogar", label: "Hogar", emoji: "🏡", tone: "bg-coral/20 text-ink" },
  { value: "servicios", label: "Servicios", emoji: "💡", tone: "bg-citrus/25 text-ink" },
  { value: "salud", label: "Salud", emoji: "🌿", tone: "bg-forest/15 text-forest" },
  { value: "ocio", label: "Ocio", emoji: "🎟️", tone: "bg-sky/35 text-ink" },
  { value: "trabajo", label: "Trabajo", emoji: "💼", tone: "bg-coral/15 text-ink" },
  { value: "otros", label: "Otros", emoji: "✨", tone: "bg-paper text-muted" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = "otros";

const categoryValues = new Set<string>(EXPENSE_CATEGORIES.map(({ value }) => value));

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && categoryValues.has(value);
}

export function getExpenseCategory(value: unknown) {
  return EXPENSE_CATEGORIES.find((category) => category.value === value) ??
    EXPENSE_CATEGORIES.find((category) => category.value === DEFAULT_EXPENSE_CATEGORY)!;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}
