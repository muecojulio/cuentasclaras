import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Database, Lock, EyeOff, FileSpreadsheet, HardDrive, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/privacidad")({
  component: PrivacidadPage,
});

function PrivacidadPage() {
  return (
    <div className="page-pad space-y-4 px-4 pt-5 pb-10">
      {/* Header Banner */}
      <section className="rounded-3xl bg-forest p-5 text-paper shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-paper/20">
            <ShieldCheck className="size-5 text-paper" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">Políticas de Privacidad</h1>
            <p className="text-xs text-paper/80">Tus datos financieros te pertenecen únicamente a ti</p>
          </div>
        </div>
      </section>

      {/* Introducción */}
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-xs space-y-3">
        <h2 className="font-display text-xl font-medium text-ink">Compromiso de Privacidad</h2>
        <p className="text-sm text-muted leading-relaxed">
          En <strong className="text-ink">Cuentas Claras</strong> creemos firmemente que la privacidad financiera es un derecho fundamental. Nuestra aplicación fue diseñada bajo la filosofía de <em className="text-ink">privacidad por diseño</em>: no recopilamos, no vendemos y no enviamos tus gastos a ningún servidor externo.
        </p>
      </section>

      {/* Puntos clave */}
      <div className="space-y-3">
        {/* 1. Almacenamiento Local */}
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="grid size-8 place-items-center rounded-xl bg-forest/10 text-forest">
              <HardDrive className="size-4" />
            </span>
            <h3 className="font-medium text-sm text-ink">1. Almacenamiento 100% Local</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Todas las fechas, descripciones de gastos, métodos de pago (efectivo o tarjeta), montos en pesos mexicanos ($ MXN), nombres de las personas y sus fechas de pago se guardan únicamente en el almacenamiento local de tu dispositivo (<code className="rounded bg-paper px-1 py-0.5 text-[11px] font-mono text-ink">localStorage</code>).
          </p>
        </section>

        {/* 2. Sin Cuentas ni Contraseñas */}
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="grid size-8 place-items-center rounded-xl bg-forest/10 text-forest">
              <Lock className="size-4" />
            </span>
            <h3 className="font-medium text-sm text-ink">2. Sin Cuentas ni Contraseñas</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            No necesitas registrarte, ni proporcionar tu correo electrónico, teléfono o números de tarjetas bancarias. Puedes usar todas las funciones de inmediato sin revelar tu identidad.
          </p>
        </section>

        {/* 3. Pesos Mexicanos sin servicios externos */}
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="grid size-8 place-items-center rounded-xl bg-forest/10 text-forest">
              <EyeOff className="size-4" />
            </span>
            <h3 className="font-medium text-sm text-ink">3. Moneda Nacional en Pesos ($ MXN)</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Todas las operaciones se procesan en moneda nacional mexicana ($ MXN). No se envían consultas a servicios externos de tipo de cambio ni se conecta tu información a rastreadores de terceros.
          </p>
        </section>

        {/* 4. Exportación Segura a Excel */}
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="grid size-8 place-items-center rounded-xl bg-forest/10 text-forest">
              <FileSpreadsheet className="size-4" />
            </span>
            <h3 className="font-medium text-sm text-ink">4. Generación y Envío Seguro de Excel (.xlsx)</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Los archivos de Excel con el resumen mensual, gastos y saldos pendientes se generan de forma instantánea en la memoria de tu propio navegador. Solo se comparten con los destinatarios que tú elijas voluntariamente (por ejemplo, al mandar el corte por WhatsApp).
          </p>
        </section>

        {/* 5. Control y Borrado */}
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="grid size-8 place-items-center rounded-xl bg-forest/10 text-forest">
              <Trash2 className="size-4" />
            </span>
            <h3 className="font-medium text-sm text-ink">5. Control y Eliminación de Información</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Tú tienes el control total para editar gastos, eliminar registros, cerrar listas o borrar cierres antiguos del Archivo. Si decides borrar los datos del navegador o el caché de tu dispositivo, los datos locales se borrarán por completo.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-paper/60 p-4 text-center text-xs text-muted">
        <p>Cuentas Claras · Versión 2.0 en Pesos Mexicanos (MXN)</p>
        <p className="mt-0.5">Última actualización: Octubre 2026</p>
      </section>
    </div>
  );
}
