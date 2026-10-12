import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Globe2,
  HardDrive,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_app/privacidad")({
  component: PrivacidadPage,
});

const cards = [
  {
    title: "1. Datos guardados en el dispositivo",
    icon: HardDrive,
    tone: "bg-citrus/45 text-ink",
    body: (
      <>
        Los gastos (fecha, descripción, importe, forma de pago y categoría), los nombres y saldos de integrantes y los cierres se guardan en el <strong className="text-ink">almacenamiento local de este navegador</strong>. No se crean cuentas y esta aplicación no sincroniza el libro con un servidor.
      </>
    ),
  },
  {
    title: "2. Conversor y servicio externo",
    icon: Globe2,
    tone: "bg-sky/50 text-ink",
    body: (
      <>
        Si abres o actualizas el conversor, se consultan cotizaciones públicas USD→MXN y EUR→MXN en <code className="rounded bg-paper px-1 py-0.5 font-mono text-[11px] text-ink">api.frankfurter.dev</code>. La petición contiene solo los códigos de moneda: <strong className="text-ink">no incluye tus compras, nombres, importes registrados ni saldos</strong>. El servicio y la infraestructura de red pueden recibir datos técnicos habituales, como la dirección IP, el agente del navegador y la hora de la consulta. Las cotizaciones se guardan en el navegador durante seis horas para reducir llamadas.
      </>
    ),
  },
  {
    title: "3. Exportación y envío voluntario",
    icon: FileSpreadsheet,
    tone: "bg-coral/25 text-ink",
    body: (
      <>
        Los reportes Excel se generan en el navegador. Si eliges descargar, compartir o abrir WhatsApp, los datos incluidos en ese reporte salen del dispositivo hacia el destino que seleccionaste y quedan sujetos a las políticas de ese servicio. Cuentas Claras no los envía por sí sola.
      </>
    ),
  },
  {
    title: "4. Cookies, analítica y alojamiento",
    icon: Database,
    tone: "bg-forest/15 text-forest",
    body: (
      <>
        La aplicación no crea cookies propias para publicidad, perfiles de seguimiento ni analítica. El proveedor que aloja o presenta esta instalación puede procesar solicitudes técnicas o cargar componentes de plataforma bajo sus propios avisos de privacidad; esos tratamientos no están controlados por el libro local.
      </>
    ),
  },
];

function PrivacidadPage() {
  return (
    <div className="page-pad mx-auto max-w-4xl space-y-5 px-4 pb-28 pt-5">
      <header className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest via-forest to-[#084d44] p-5 text-paper shadow-xl sm:p-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 size-56 rounded-full bg-citrus/30 blur-2xl" />
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-paper/15 text-citrus">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-paper/70">Tus datos, tus decisiones</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Privacidad y datos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/85">
              Esta política explica qué se guarda, cuándo se consulta una API externa y qué ocurre cuando exportas o compartes un corte.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-citrus px-3 py-1 text-xs font-bold text-ink">Sin cuenta</span>
          <span className="rounded-full border border-paper/25 bg-paper/10 px-3 py-1 text-xs font-semibold text-paper">Datos del libro en este navegador</span>
          <span className="rounded-full border border-paper/25 bg-paper/10 px-3 py-1 text-xs font-semibold text-paper">Última actualización: 12 oct 2026</span>
        </div>
      </header>

      <section className="rounded-3xl border border-coral/30 bg-coral/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <h2 className="font-semibold text-ink">Antes de guardar información financiera</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              El almacenamiento local del navegador no está cifrado por esta aplicación ni protegido con una contraseña. No guardes números de tarjeta, claves bancarias ni datos que no quieras que vea otra persona con acceso a este dispositivo o perfil.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {cards.map(({ title, icon: Icon, tone, body }) => (
          <section key={title} className="rounded-3xl border border-line bg-surface p-4 shadow-xs sm:p-5">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-2xl ${tone}`}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
          </section>
        ))}
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4 shadow-xs sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-forest/10 text-forest">
            <Trash2 aria-hidden="true" className="size-5" />
          </span>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Acceso, conservación y eliminación</h2>
        </div>
        <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-muted sm:grid-cols-2">
          <li className="rounded-2xl bg-paper/80 p-3">
            <strong className="text-ink">Control:</strong> puedes corregir o quitar gastos, borrar cierres del Archivo y exportar copias desde las funciones de la aplicación.
          </li>
          <li className="rounded-2xl bg-paper/80 p-3">
            <strong className="text-ink">Borrado del dispositivo:</strong> al limpiar los datos del sitio en la configuración del navegador se eliminan tanto el libro local como la caché de cotizaciones. Esta acción no se puede deshacer.
          </li>
          <li className="rounded-2xl bg-paper/80 p-3">
            <strong className="text-ink">Sin recuperación:</strong> si cambias de navegador o dispositivo, borras el almacenamiento o el navegador lo limpia, Cuentas Claras no puede restaurar tus registros.
          </li>
          <li className="rounded-2xl bg-paper/80 p-3">
            <strong className="text-ink">Responsable:</strong> el titular que publica y opera la instalación que estás usando. Para solicitudes sobre esa instalación, utiliza el canal de contacto indicado por dicho titular.
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-gradient-to-r from-sky/25 via-surface to-citrus/20 p-4 shadow-xs sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-surface text-forest shadow-xs">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </span>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Cotizaciones informativas</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Frankfurter distribuye cotizaciones históricas y de referencia basadas en fuentes oficiales; no es un servicio bancario ni ofrece un tipo de cambio garantizado para una operación. Los importes convertidos son orientativos y se guardan en el libro solo cuando tú confirmas el gasto.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="https://www.frankfurter.dev/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-forest"
          >
            <Globe2 aria-hidden="true" className="size-4" />
            Frankfurter <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
          <a
            href="https://github.com/lineofflight/frankfurter"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-ink"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            Código abierto <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </section>

      <footer className="rounded-2xl border border-line bg-paper/70 p-4 text-center text-xs leading-relaxed text-muted">
        <p className="font-semibold text-ink">Cuentas Claras · Política de privacidad</p>
        <p className="mt-1">Vigente desde el 12 de octubre de 2026. Si cambian el almacenamiento o los servicios externos, esta política se actualizará aquí.</p>
      </footer>
    </div>
  );
}
