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
    <div className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-3 text-xs font-semibold tracking-wide text-forest shadow-xs">
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
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-forest text-paper shadow-xs" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-paper" />
              </span>
              <p className="truncate font-display text-xl font-medium tracking-tight">Cuentas Claras</p>
            </div>
            <p className="mt-0.5 pl-10 text-xs text-muted">{subtitleFor(path)}</p>
          </div>
          <CurrencyBadge />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md safe-bottom shadow-lg">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] leading-tight px-1",
                    "motion-safe:transition-colors motion-safe:duration-150",
                    active ? "font-semibold text-forest" : "text-muted hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-5 transition-transform", active ? "scale-110" : "scale-100")} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
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
