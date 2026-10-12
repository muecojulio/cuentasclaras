import { useEffect, useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ArrowDownLeft, ChevronDown, Coins, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, inputClass, Segmented } from "@/components/ui";
import { formatShortDay, parseAmountToCents } from "@/lib/money";
import {
  convertToMxn,
  EXCHANGE_RATE_CACHE_TTL,
  getExchangeRates,
  readCachedExchangeRates,
  type ExchangeRates,
  type ForeignCurrency,
} from "@/lib/exchange-rates";
import { cn } from "@/lib/cn";

export function CurrencyConverter({ onUseAmount }: { onUseAmount: (amount: string) => void }) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<ForeignCurrency>("USD");
  const [foreignAmount, setForeignAmount] = useState("");
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const cached = readCachedExchangeRates();
    if (cached) setRates(cached);
    setLoading(true);
    setError("");

    void getExchangeRates().then(
      (nextRates) => {
        if (!alive) return;
        setRates(nextRates);
        if (Date.now() - nextRates.fetchedAt >= EXCHANGE_RATE_CACHE_TTL) {
          setError("No se pudo actualizar. Usamos la última cotización guardada en este dispositivo.");
        }
      },
      () => {
        if (!alive) return;
        setError("No pudimos conectar con Frankfurter. Vuelve a intentarlo cuando tengas conexión.");
      },
    ).finally(() => {
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [open]);

  const foreignCents = parseAmountToCents(foreignAmount);
  const rate = rates?.rates[currency];
  const convertedCents =
    foreignCents !== null && rate !== undefined ? convertToMxn(foreignCents, rate) : null;
  const sourceDate = rates?.dates[currency];

  async function refreshRates() {
    setLoading(true);
    setError("");
    try {
      const nextRates = await getExchangeRates({ force: true });
      setRates(nextRates);
      if (Date.now() - nextRates.fetchedAt >= EXCHANGE_RATE_CACHE_TTL) {
        setError("Sin conexión: se conserva la cotización anterior.");
      } else {
        toast.success("Cotización de referencia actualizada");
      }
    } catch {
      setError("No pudimos actualizar la cotización. Comprueba tu conexión e inténtalo otra vez.");
    } finally {
      setLoading(false);
    }
  }

  function useConvertedAmount() {
    if (convertedCents === null) return;
    onUseAmount((convertedCents / 100).toFixed(2));
    setOpen(false);
    toast.success("Monto convertido al campo de gasto");
  }

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="overflow-hidden rounded-3xl border border-coral/30 bg-gradient-to-br from-surface via-surface to-citrus/25 shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-coral/15 text-danger">
            <Coins aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold tracking-tight text-ink">Conversor de moneda</p>
            <p className="text-xs text-muted">USD o EUR a pesos · sin registro ni clave</p>
          </div>
        </div>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            aria-label={open ? "Cerrar conversor de moneda" : "Abrir conversor de moneda"}
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-ink focus-visible:ring-2 focus-visible:ring-forest"
          >
            <ChevronDown aria-hidden="true" className={cn("size-5 transition-transform duration-200", open && "rotate-180")} />
          </button>
        </Collapsible.Trigger>
      </div>

      <Collapsible.Content className="collapsible-panel border-t border-coral/15 px-4 pb-4 pt-3">
        <p className="text-xs leading-relaxed text-muted">
          Convierte un importe antes de guardarlo. La cotización es una referencia del último día hábil; tus gastos no se envían al servicio.
        </p>

        <div className="mt-3">
          <Segmented
            label="Moneda de origen"
            value={currency}
            onChange={setCurrency}
            options={[
              { value: "USD", label: "🇺🇸 Dólares · USD" },
              { value: "EUR", label: "🇪🇺 Euros · EUR" },
            ]}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-end">
          <Field label={`Importe en ${currency}`}>
            <input
              className={inputClass}
              inputMode="decimal"
              type="text"
              value={foreignAmount}
              placeholder="0.00"
              autoComplete="off"
              onChange={(event) => setForeignAmount(event.target.value)}
            />
          </Field>
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-citrus/55 bg-citrus/25 px-4 py-2.5">
            <span className="text-sm font-medium text-ink">Equivale a</span>
            <span className="font-display text-xl font-semibold text-forest" aria-live="polite">
              {convertedCents === null ? "— MXN" : `${(convertedCents / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}`}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p role="status" aria-live="polite" className={cn("min-h-5 text-xs", error ? "text-danger" : "text-muted")}>
            {loading
              ? "Consultando tipo de cambio…"
              : error || (rate && sourceDate
                ? `1 ${currency} = ${rate.toLocaleString("es-MX", { maximumFractionDigits: 4 })} MXN · ${formatShortDay(sourceDate)}`
                : "Abre el conversor para consultar una referencia diaria.")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="surface"
              className="px-3"
              loading={loading}
              loadingLabel="Actualizando…"
              aria-label="Actualizar cotización de referencia"
              onClick={() => void refreshRates()}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Actualizar
            </Button>
            <Button
              className="px-3"
              disabled={convertedCents === null}
              onClick={useConvertedAmount}
            >
              <ArrowDownLeft aria-hidden="true" className="size-4" />
              Usar en gasto
            </Button>
          </div>
        </div>
        <span className="sr-only">
          El conversor consulta Frankfurter, una API pública de datos de divisas, solo cuando se abre o se actualiza manualmente.
        </span>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
