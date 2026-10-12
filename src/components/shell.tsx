import { Link, useRouterState } from "@tanstack/react-router";
import { Archive, ReceiptText, Settings2, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { loadFx, type FxQuote } from "@/lib/fx";
import { freshOpen, useLedger } from "@/lib/ledger-store";

const NAV = [
  { to: "/", label: "Gastos", icon: ReceiptText, exact: true },
  { to: "/personas", label: "Personas", icon: Users, exact: false },
  { to: "/archivo", label: "Archivo", icon: Archive, exact: false },
  { to: "/ajustes", label: "Más", icon: Settings2, exact: false },
] as const;

function subtitleFor(path: string): string {
  if (path === "/") return "Lista abierta";
  if (path.startsWith("/personas")) return "Quién paga y cuándo";
  if (path.startsWith("/archivo/")) return "Cierre guardado";
  if (path.startsWith("/archivo")) return "Listas cerradas";
  if (path.startsWith("/ajustes")) return "Privacidad e instalación";
  return "Cuentas Claras";
}

function FxChip() {
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadFx()
      .then((next) => {
        if (alive) setQuote(next);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const label = quote
    ? `USD ${quote.usdMxn.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : failed
      ? "Sin cambio"
      : "USD …";

  return (
    <Link
      to="/ajustes"
      className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.96]"
    >
      {label}
    </Link>
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
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-forest" aria-hidden="true">
                <span className="size-2 rounded-full bg-paper" />
              </span>
              <p className="truncate font-display text-xl font-medium tracking-tight">Cuentas Claras</p>
            </div>
            <p className="mt-0.5 pl-10 text-xs text-muted">{subtitleFor(path)}</p>
          </div>
          <FxChip />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                    "motion-safe:transition-colors motion-safe:duration-150",
                    active ? "font-medium text-forest" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  {item.label}
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
      <p className="mt-2 text-sm text-muted">Los gastos de este teléfono aparecen en un momento.</p>
    </div>
  );
}
