import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, Field, inputClass, Segmented } from "@/components/ui";
import { convertToMxn, loadFx, type FxQuote } from "@/lib/fx";
import { formatShortDay, parseAmountToCents } from "@/lib/money";

export const Route = createFileRoute("/_app/ajustes")({
  component: AjustesPage,
});

function AjustesPage() {
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const [foreign, setForeign] = useState("");
  const [qr, setQr] = useState("");
  const [origin, setOrigin] = useState("");

  async function refresh(force: boolean) {
    setStatus("loading");
    try {
      const next = await loadFx(force);
      setQuote(next);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void refresh(false);
    const href = window.location.origin;
    setOrigin(href);
    let alive = true;
    void import("qrcode").then(async (QR) => {
      const url = await QR.toDataURL(href, {
        margin: 1,
        width: 280,
        color: { dark: "#1c1915", light: "#fffdf8" },
        errorCorrectionLevel: "M",
      });
      if (alive) setQr(url);
    });
    return () => {
      alive = false;
    };
  }, []);

  const cents = parseAmountToCents(foreign);
  const rate = currency === "USD" ? quote?.usdMxn : quote?.eurMxn;
  const pesos = cents !== null && rate ? convertToMxn(cents / 100, rate) : null;

  return (
    <div className="page-pad space-y-4 px-4 pt-5">
      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl font-medium tracking-tight">Tipo de cambio</h2>
        <p className="mt-1 text-sm text-muted">
          Referencia del día, en vivo, desde Frankfurter. No se envían tus gastos.
        </p>
        {status === "loading" && !quote ? <p className="mt-4 text-sm">Consultando…</p> : null}
        {status === "error" && !quote ? (
          <p className="mt-4 text-sm text-danger">No pude consultar el tipo de cambio. Tus gastos siguen guardados aquí.</p>
        ) : null}
        {quote ? (
          <div className="mt-4 space-y-2">
            <p className="text-lg font-medium tabular-nums">1 USD = {quote.usdMxn.toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} MXN</p>
            <p className="text-lg font-medium tabular-nums">1 EUR = {quote.eurMxn.toLocaleString("es-MX", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} MXN</p>
            <p className="text-xs text-muted">Fecha de la cotización: {formatShortDay(quote.asOf)}. Se guarda 12 horas en este teléfono.</p>
          </div>
        ) : null}
        <Button variant="surface" className="mt-4 w-full" onClick={() => void refresh(true)}>
          Actualizar ahora
        </Button>
        <div className="mt-4 space-y-3">
          <Segmented
            value={currency}
            onChange={setCurrency}
            options={[
              { value: "USD", label: "Dólares" },
              { value: "EUR", label: "Euros" },
            ]}
          />
          <Field label={`Monto en ${currency}`}>
            <input
              className={inputClass}
              inputMode="decimal"
              value={foreign}
              placeholder="0.00"
              onChange={(event) => setForeign(event.target.value)}
            />
          </Field>
          <p className="text-sm">
            {pesos === null
              ? "Escribe un monto para verlo en pesos."
              : `Equivalen a ${pesos.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}. Anótalo en Gastos si quieres guardarlo.`}
          </p>
          <Button
            variant="surface"
            className="w-full"
            disabled={pesos === null}
            onClick={() => {
              if (pesos === null) return;
              const text = pesos.toFixed(2);
              void navigator.clipboard?.writeText(text).then(
                () => toast.success("Monto en pesos copiado"),
                () => toast.message(text),
              );
            }}
          >
            Copiar monto en pesos
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl font-medium tracking-tight">Instalar en el iPhone</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>Abre Cuentas Claras en Safari.</li>
          <li>Toca Compartir.</li>
          <li>Elige Agregar a inicio.</li>
        </ol>
        <a
          href="/?install=1&platform=ios"
          className="mt-4 inline-flex h-12 items-center text-sm font-medium text-forest"
        >
          Ver la guía de instalación
        </a>
        {qr ? (
          <img src={qr} alt="Código QR de esta aplicación" className="mx-auto mt-4 size-52 rounded-2xl border border-line" />
        ) : (
          <p className="mt-4 text-sm text-muted">Preparando el código QR…</p>
        )}
        {origin ? <p className="mt-2 break-all text-center text-xs text-muted">{origin}</p> : null}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="font-display text-2xl font-medium tracking-tight">Privacidad</h2>
        <div className="mt-3 space-y-3 text-sm text-muted">
          <p>Fechas, descripciones, montos, nombres y fechas de pago se guardan solo en este teléfono. No hay cuenta y no hay un servidor con tus gastos.</p>
          <p>El tipo de cambio se pide a Frankfurter, un servicio público sin registro. La consulta no incluye tus gastos, nombres ni montos, y no envía la dirección de esta página.</p>
          <p>No se conectan automatizaciones, modelos de inteligencia artificial ni rastreadores a esta información. Si borras los datos del navegador, la lista se pierde en este aparato.</p>
          <p>La cotización se cachea 12 horas aquí para no consultarla en cada visita. No hace falta una base de datos compartida: sin cuentas, esa base dejaría tus gastos a la vista de cualquiera.</p>
        </div>
      </section>
    </div>
  );
}
