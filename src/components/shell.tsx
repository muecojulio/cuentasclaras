import { Link, useRouterState } from "@tanstack/react-router";
import { Archive, QrCode, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { freshOpen, useLedger } from "@/lib/ledger-store";

const NAV = [
  { to: "/", label: "Gastos", icon: ReceiptText, exact: true },
  { to: "/personas", label: "Personas", icon: Users, exact: false },
  { to: "/archivo", label: "Archivo", icon: Archive, exact: false },
  { to: "/instalar", label: "Instalar", icon: QrCode, exact: false },
  { to: "/privacidad", label: "Privacidad", icon: ShieldCheck, exact: false },
] as const;

function subtitleFor(path: string): string {
  if (path === "/") return "Gastos en pesos mexicanos";
  if (path.startsWith("/personas")) return "Quién paga y cuándo · Reparto";
  if (path.startsWith("/archivo/")) return "Cierre guardado";
  if (path.startsWith("/archivo")) return "Listas y cierres guardados";
  if (path.startsWith("/instalar")) return "Código QR e instalación";
  if (path.startsWith("/privacidad")) return "Políticas de privacidad y datos locales";
  return "Cuentas Claras";
}

function CurrencyBadge() {
  return (
    <div className="inline-flex h-10 items-center gap-1.5 rounded-full border border-citrus bg-citrus/45 px-3 text-xs font-bold tracking-wide text-ink shadow-xs">
      <span aria-hidden="true" className="size-2 rounded-full bg-forest" />
      $ MXN
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const finish = () => {
      if (!useLedger.getState().open.openedAt) useLedger.setState({ open: freshOpen() });
    };
    if (useLedger.persist.hasHydrated()) {
      finish();
      return;
    }
    const unsub = useLedger.persist.onFinishHydration(finish);
    void useLedger.persist.rehydrate();
    return () => unsub();
  }, []);

  return (
    <div className="min-h-dvh bg-paper text-ink pb-20">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative grid size-9 place-items-center rounded-2xl bg-forest text-paper shadow-sm" aria-hidden="true">
                <ReceiptText className="size-5" />
                <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-paper bg-coral" />
              </span>
              <p className="truncate font-display text-xl font-semibold tracking-tight">Cuentas Claras</p>
            </div>
            <p className="mt-0.5 pl-10 text-xs text-muted">{subtitleFor(path)}</p>
          </div>
          <CurrencyBadge />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl">{children}</main>

      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md safe-bottom shadow-lg">
        <ul className="mx-auto grid max-w-6xl grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 min-w-11 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-tight",
                    active ? "font-semibold text-forest" : "text-muted hover:text-ink",
                  )}
                >
                  <span className={cn("grid size-8 place-items-center rounded-xl", active ? "bg-forest/10" : "bg-transparent")}>
                    <Icon className={cn("size-5 transition-transform", active ? "scale-110" : "scale-100")} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function LoadingList() {
  return (
    <div className="page-pad px-4 pt-6">
      <p className="font-display text-3xl font-medium tracking-tight">Preparando tu lista</p>
      <p className="mt-2 text-sm text-muted">Los gastos de este dispositivo aparecen en un momento.</p>
    </div>
  );
}
