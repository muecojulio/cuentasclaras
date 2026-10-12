const CACHE_KEY = "cuentasclaras-fx-v1";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const ENDPOINT = "https://api.frankfurter.dev/v2/rate";

export type FxQuote = {
  usdMxn: number;
  eurMxn: number;
  asOf: string;
  fetchedAt: number;
};

function saneRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 5 && value < 80;
}

function readCache(): FxQuote | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<FxQuote>;
    if (!saneRate(data.usdMxn) || !saneRate(data.eurMxn)) return null;
    if (typeof data.asOf !== "string" || typeof data.fetchedAt !== "number") return null;
    return {
      usdMxn: data.usdMxn,
      eurMxn: data.eurMxn,
      asOf: data.asOf,
      fetchedAt: data.fetchedAt,
    };
  } catch {
    return null;
  }
}

async function pull(base: "usd" | "eur"): Promise<{ rate: number; date: string }> {
  const response = await fetch(`${ENDPOINT}/${base}/mxn`, {
    headers: { Accept: "application/json" },
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("Tipo de cambio no disponible");
  const data = (await response.json()) as { rate?: unknown; date?: unknown };
  if (!saneRate(data.rate) || typeof data.date !== "string") {
    throw new Error("Respuesta de tipo de cambio inválida");
  }
  return { rate: data.rate, date: data.date };
}

export async function loadFx(force = false): Promise<FxQuote> {
  const cached = readCache();
  const fresh = cached !== null && Date.now() - cached.fetchedAt < MAX_AGE_MS;
  if (!force && fresh && cached) return cached;
  try {
    const [usd, eur] = await Promise.all([pull("usd"), pull("eur")]);
    const quote: FxQuote = {
      usdMxn: usd.rate,
      eurMxn: eur.rate,
      asOf: usd.date,
      fetchedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(quote));
    return quote;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

export function convertToMxn(amount: number, rate: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0 || !saneRate(rate)) return null;
  return Math.round(amount * rate * 100) / 100;
}
