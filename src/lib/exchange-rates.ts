export const EXCHANGE_RATE_CACHE_KEY = "cuentasclaras-exchange-rates-v1";
export const EXCHANGE_RATE_CACHE_TTL = 6 * 60 * 60 * 1000;

export type ForeignCurrency = "USD" | "EUR";
export type ExchangeRates = {
  rates: Record<ForeignCurrency, number>;
  dates: Record<ForeignCurrency, string>;
  fetchedAt: number;
};

type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type FetchRatesOptions = {
  fetcher?: typeof fetch;
  storage?: StoragePort | null;
  now?: number;
  force?: boolean;
};

type RateResponse = { date: string; rate: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseRateResponse(payload: unknown, expectedBase: ForeignCurrency): RateResponse {
  if (
    !isRecord(payload) ||
    payload.base !== expectedBase ||
    !validDate(payload.date) ||
    !isRecord(payload.rates)
  ) {
    throw new Error("La respuesta de tipo de cambio no tiene el formato esperado.");
  }

  const rate = payload.rates.MXN;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0 || rate > 100_000) {
    throw new Error("La cotización recibida no es válida.");
  }

  return { date: payload.date, rate };
}

function parseCachedRates(value: unknown): ExchangeRates | null {
  if (!isRecord(value) || !isRecord(value.rates) || !isRecord(value.dates)) return null;
  if (
    typeof value.rates.USD !== "number" ||
    !Number.isFinite(value.rates.USD) ||
    value.rates.USD <= 0 ||
    typeof value.rates.EUR !== "number" ||
    !Number.isFinite(value.rates.EUR) ||
    value.rates.EUR <= 0 ||
    !validDate(value.dates.USD) ||
    !validDate(value.dates.EUR) ||
    typeof value.fetchedAt !== "number" ||
    !Number.isFinite(value.fetchedAt) ||
    value.fetchedAt < 0
  ) {
    return null;
  }

  return {
    rates: { USD: value.rates.USD, EUR: value.rates.EUR },
    dates: { USD: value.dates.USD, EUR: value.dates.EUR },
    fetchedAt: value.fetchedAt,
  };
}

function browserStorage(): StoragePort | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCachedExchangeRates(storage: StoragePort | null = browserStorage()): ExchangeRates | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(EXCHANGE_RATE_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parseCachedRates(parsed);
  } catch {
    return null;
  }
}

function writeCachedExchangeRates(rates: ExchangeRates, storage: StoragePort | null): void {
  if (!storage) return;
  try {
    storage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify(rates));
  } catch {
    // The converter still works for this visit if storage is disabled or full.
  }
}

async function fetchRate(
  currency: ForeignCurrency,
  fetcher: typeof fetch,
): Promise<RateResponse> {
  const url = new URL("https://api.frankfurter.dev/v1/latest");
  url.searchParams.set("base", currency);
  url.searchParams.set("symbols", "MXN");

  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Frankfurter respondió ${response.status}.`);
  return parseRateResponse(await response.json(), currency);
}

/**
 * Fetches daily reference rates from Frankfurter. Fresh quotes are cached for
 * six hours; if a refresh fails, a previously cached quote remains usable.
 */
export async function getExchangeRates(options: FetchRatesOptions = {}): Promise<ExchangeRates> {
  const fetcher = options.fetcher ?? fetch;
  const storage = Object.hasOwn(options, "storage") ? options.storage ?? null : browserStorage();
  const now = options.now ?? Date.now();
  const cached = readCachedExchangeRates(storage);
  const cacheIsFresh = cached !== null && now >= cached.fetchedAt && now - cached.fetchedAt < EXCHANGE_RATE_CACHE_TTL;

  if (!options.force && cacheIsFresh) return cached;

  try {
    const [usd, eur] = await Promise.all([
      fetchRate("USD", fetcher),
      fetchRate("EUR", fetcher),
    ]);
    const rates: ExchangeRates = {
      rates: { USD: usd.rate, EUR: eur.rate },
      dates: { USD: usd.date, EUR: eur.date },
      fetchedAt: now,
    };
    writeCachedExchangeRates(rates, storage);
    return rates;
  } catch (error) {
    if (cached) return cached;
    throw error instanceof Error ? error : new Error("No se pudo consultar el tipo de cambio.");
  }
}

export function convertToMxn(amountCents: number, rate: number): number | null {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) return null;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const converted = Math.round(amountCents * rate);
  return Number.isSafeInteger(converted) ? converted : null;
}
