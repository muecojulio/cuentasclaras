import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, QrCode, Share2, Smartphone, Monitor, Apple, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";

export const Route = createFileRoute("/_app/instalar")({
  component: InstalarPage,
});

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstalarPage() {
  const [qr, setQr] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const href = typeof window !== "undefined" ? window.location.origin : "";
    setOrigin(href);

    let alive = true;
    if (href) {
      void import("qrcode").then(async (QR) => {
        try {
          const url = await QR.toDataURL(href, {
            margin: 1,
            width: 320,
            color: { dark: "#1c1915", light: "#fffdf8" },
            errorCorrectionLevel: "M",
          });
          if (alive) setQr(url);
        } catch (e) {
          console.error("Error generating QR", e);
        }
      });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  function handleCopy() {
    if (!origin) return;
    void navigator.clipboard?.writeText(origin).then(
      () => {
        setCopied(true);
        toast.success("Enlace de la app copiado al portapapeles");
        setTimeout(() => setCopied(false), 2500);
      },
      () => toast.error("No se pudo copiar el enlace"),
    );
  }

  async function handleShare() {
    if (!origin) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Cuentas Claras - App de Gastos",
          text: "Usa Cuentas Claras para anotar tus gastos en pesos mexicanos y calcular cortes mensuales:",
          url: origin,
        });
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  }

  async function handleInstallPwa() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("¡Aplicación instalada!");
      setInstallPrompt(null);
    }
  }

  return (
    <div className="page-pad space-y-5 px-4 pt-5 pb-10">
      {/* Hero / Header Card */}
      <section className="rounded-3xl bg-forest p-5 text-paper shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-paper/20">
            <QrCode className="size-5 text-paper" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Instalar en cualquier dispositivo</h1>
            <p className="text-xs text-paper/80">Escanea el código QR o agrégala a tu pantalla de inicio</p>
          </div>
        </div>
      </section>

      {/* QR Code Card */}
      <section className="rounded-3xl border border-line bg-surface p-5 text-center shadow-xs">
        <h2 className="font-display text-xl font-medium text-ink">Escanear Código QR</h2>
        <p className="mt-1 text-xs text-muted">
          Abre la cámara de tu celular (iPhone o Android) y apunta hacia este código para abrir o instalar la aplicación al instante:
        </p>

        <div className="mt-4 flex justify-center">
          {qr ? (
            <div className="rounded-3xl bg-paper p-3 border border-line shadow-xs inline-block">
              <img
                src={qr}
                alt="Código QR para instalar Cuentas Claras"
                className="size-52 rounded-2xl mx-auto block"
              />
            </div>
          ) : (
            <div className="grid size-52 place-items-center rounded-2xl border border-dashed border-line bg-paper/60 text-xs text-muted">
              Generando código QR…
            </div>
          )}
        </div>

        {origin ? (
          <p className="mt-3 text-xs text-muted font-mono truncate px-4 py-1.5 rounded-xl bg-paper/80 border border-line">
            {origin}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="surface" className="flex items-center justify-center gap-1.5" onClick={handleCopy}>
            {copied ? <Check className="size-4 text-forest" /> : <Copy className="size-4" />}
            <span>{copied ? "¡Copiado!" : "Copiar enlace"}</span>
          </Button>

          <Button variant="surface" className="flex items-center justify-center gap-1.5" onClick={() => void handleShare()}>
            <Share2 className="size-4" />
            <span>Compartir</span>
          </Button>
        </div>

        {installPrompt && !isInstalled && (
          <Button className="mt-3 w-full flex items-center justify-center gap-2 bg-forest text-paper" onClick={() => void handleInstallPwa()}>
            <Download className="size-4" />
            <span>Instalar Cuentas Claras en este equipo</span>
          </Button>
        )}
      </section>

      {/* Pasos por dispositivo */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-medium text-ink px-1">Instrucciones de instalación paso a paso</h2>

        {/* iPhone & iPad */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <span className="grid size-7 place-items-center rounded-lg bg-paper border border-line">
              <Apple className="size-4" />
            </span>
            <h3 className="font-medium text-sm">iPhone y iPad (Apple iOS)</h3>
          </div>
          <ol className="list-decimal pl-5 text-xs text-muted space-y-1.5 leading-relaxed">
            <li>Abre esta página en el navegador <strong className="text-ink">Safari</strong>.</li>
            <li>Presiona el botón <strong className="text-ink">Compartir</strong> (el icono cuadrado con una flecha hacia arriba 📤).</li>
            <li>Desliza hacia abajo y presiona <strong className="text-ink">&quot;Agregar a inicio&quot;</strong> (Add to Home Screen ➕).</li>
            <li>Toca <strong className="text-ink">&quot;Agregar&quot;</strong> en la esquina superior derecha. ¡Listo!</li>
          </ol>
        </div>

        {/* Android */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <span className="grid size-7 place-items-center rounded-lg bg-paper border border-line">
              <Smartphone className="size-4" />
            </span>
            <h3 className="font-medium text-sm">Android (Samsung, Xiaomi, Motorola, etc.)</h3>
          </div>
          <ol className="list-decimal pl-5 text-xs text-muted space-y-1.5 leading-relaxed">
            <li>Abre este enlace en <strong className="text-ink">Google Chrome</strong> o tu navegador móvil.</li>
            <li>Toca los tres puntos <strong className="text-ink">(⋮)</strong> en la esquina superior derecha.</li>
            <li>Selecciona <strong className="text-ink">&quot;Instalar aplicación&quot;</strong> o <strong className="text-ink">&quot;Agregar a la pantalla principal&quot;</strong>.</li>
            <li>Confirma la instalación y aparecerá en tu lista de aplicaciones.</li>
          </ol>
        </div>

        {/* Computadora / Laptop */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-ink">
            <span className="grid size-7 place-items-center rounded-lg bg-paper border border-line">
              <Monitor className="size-4" />
            </span>
            <h3 className="font-medium text-sm">Computadora / Laptop (PC o Mac)</h3>
          </div>
          <ol className="list-decimal pl-5 text-xs text-muted space-y-1.5 leading-relaxed">
            <li>Abre esta página en <strong className="text-ink">Chrome, Edge o Brave</strong>.</li>
            <li>Haz clic en el icono de <strong className="text-ink">Instalar</strong> (pantalla con flecha) en la barra de direcciones arriba a la derecha.</li>
            <li>O ve a Menú (⋮) &gt; Guardar y compartir &gt; <strong className="text-ink">&quot;Instalar Cuentas Claras&quot;</strong>.</li>
          </ol>
        </div>
      </section>

      {/* Ventajas PWA */}
      <section className="rounded-2xl border border-forest/20 bg-forest/5 p-4 text-xs text-muted space-y-2">
        <div className="flex items-center gap-2 font-medium text-forest">
          <Sparkles className="size-4" />
          <span>Ventajas de la Aplicación Web Progresiva (PWA)</span>
        </div>
        <p>
          • <strong>Ligera y rápida:</strong> No satura la memoria de tu teléfono ni requiere descargas pesadas de tiendas de apps.
        </p>
        <p>
          • <strong>100% Privada y Local:</strong> Todos tus gastos se guardan únicamente en la memoria de este dispositivo.
        </p>
        <p>
          • <strong>Sin conexión:</strong> Puedes ingresar y consultar tus gastos incluso cuando no tengas señal de internet.
        </p>
      </section>
    </div>
  );
}
