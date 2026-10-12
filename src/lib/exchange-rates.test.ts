import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertToMxn,
  EXCHANGE_RATE_CACHE_KEY,
  EXCHANGE_RATE_CACHE_TTL,
  getExchangeRates,
  readCachedExchangeRates,
  type ExchangeRates,
} from "./exchange-rates.ts";
import { normalizeSearchText } from "./expense-categories.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function apiResponse(date: string, base: string, mxn: number): Response {
  return new Response(JSON.stringify({ date, base, rates: { MXN: mxn } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function cachedRates(fetchedAt: number): ExchangeRates {
  return {
    rates: { USD: 17.25, EUR: 18.5 },
    dates: { USD: "2026-10-09", EUR: "2026-10-09" },
    fetchedAt,
  };
}

describe("exchange-rate cache and conversion", () => {
  it("fetches the two public Frankfurter rates and caches only quote data", async () => {
    const storage = new MemoryStorage();
    const requested: string[] = [];
    const result = await getExchangeRates({
      storage,
      now: 1_000_000,
      fetcher: async (input) => {
        requested.push(String(input));
        return requested.length === 1
          ? apiResponse("2026-10-09", "USD", 17.25)
          : apiResponse("2026-10-09", "EUR", 18.5);
      },
    });

    assert.equal(requested.length, 2);
    assert.ok(requested.every((url) => url.startsWith("https://api.frankfurter.dev/v1/latest?")));
    assert.deepEqual(result.rates, { USD: 17.25, EUR: 18.5 });
    assert.deepEqual(result.dates, { USD: "2026-10-09", EUR: "2026-10-09" });
    assert.equal(readCachedExchangeRates(storage)?.fetchedAt, 1_000_000);
    assert.ok(storage.getItem(EXCHANGE_RATE_CACHE_KEY));
  });

  it("uses fresh cached rates without a network request", async () => {
    const storage = new MemoryStorage();
    storage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify(cachedRates(50_000)));
    let calls = 0;
    const result = await getExchangeRates({
      storage,
      now: 50_000 + EXCHANGE_RATE_CACHE_TTL - 1,
      fetcher: async () => {
        calls += 1;
        throw new Error("should not run");
      },
    });

    assert.equal(calls, 0);
    assert.equal(result.rates.USD, 17.25);
  });

  it("keeps a stale cached quote available if refresh fails", async () => {
    const storage = new MemoryStorage();
    const previous = cachedRates(10_000);
    storage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify(previous));
    const result = await getExchangeRates({
      storage,
      now: 10_000 + EXCHANGE_RATE_CACHE_TTL + 1,
      fetcher: async () => {
        throw new Error("offline");
      },
    });

    assert.deepEqual(result, previous);
  });

  it("rejects invalid API data when there is no safe cached fallback", async () => {
    await assert.rejects(
      getExchangeRates({
        storage: new MemoryStorage(),
        now: 1,
        fetcher: async () =>
          new Response(
            JSON.stringify({ date: "2026-10-09", base: "USD", rates: { MXN: -1 } }),
          ),
      }),
      /cotización recibida no es válida/,
    );
  });

  it("rounds converted amounts to the nearest cent and rejects invalid rates", () => {
    assert.equal(convertToMxn(10_000, 17.25), 172_500);
    assert.equal(convertToMxn(1, 1.5), 2);
    assert.equal(convertToMxn(-1, 17), null);
    assert.equal(convertToMxn(100, Number.NaN), null);
  });
});

describe("diacritic-insensitive option search", () => {
  it("normalizes accents, case and surrounding whitespace", () => {
    assert.equal(normalizeSearchText("  SERVÍCIOS "), "servicios");
    assert.equal(normalizeSearchText("  TRANSPORTE  "), "transporte");
  });
});
