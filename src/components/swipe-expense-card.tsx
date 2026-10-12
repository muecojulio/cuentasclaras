import { useEffect, useId, useRef, useState, type TouchEvent } from "react";
import { MoreHorizontal, Pencil, Trash2, Wallet, CreditCard } from "lucide-react";
import type { Expense } from "@/lib/ledger-store";
import { getExpenseCategory } from "@/lib/expense-categories";
import { formatShortDay } from "@/lib/money";
import { Money } from "@/components/ui";
import { cn } from "@/lib/cn";

const ACTION_WIDTH = 112;

type TouchStart = { x: number; y: number; at: number; wasOpen: boolean; axis: "x" | "y" | null };

export function SwipeExpenseCard({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [desktopActions, setDesktopActions] = useState(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const touchStart = useRef<TouchStart | null>(null);
  const suppressClick = useRef(false);
  const actionsId = useId();
  const category = getExpenseCategory(expense.category);
  const actionsVisible = desktopActions || open;
  const offset = dragOffset ?? (actionsVisible ? -ACTION_WIDTH : 0);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
    const update = () => setDesktopActions(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("button, a, input, select, textarea, [role='button'], [data-swipe-ignore]")) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: performance.now(),
      wasOpen: open,
      axis: null,
    };
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (start.axis === null && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      start.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.2 ? "x" : "y";
    }
    if (start.axis !== "x") return;

    setDragging(true);
    setDragOffset(Math.max(-ACTION_WIDTH, Math.min(0, (start.wasOpen ? -ACTION_WIDTH : 0) + deltaX)));
  }

  function finishTouch(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || start.axis !== "x") {
      setDragging(false);
      setDragOffset(null);
      return;
    }

    const deltaX = touch.clientX - start.x;
    const elapsed = Math.max(1, performance.now() - start.at);
    const velocity = deltaX / elapsed;
    const threshold = ACTION_WIDTH * 0.32;
    const nextOpen = start.wasOpen
      ? !(deltaX > threshold || velocity > 0.55)
      : deltaX < -threshold || velocity < -0.55;

    setOpen(nextOpen);
    setDragging(false);
    setDragOffset(null);
    suppressClick.current = Math.abs(deltaX) > 10;
    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 450);
    }
  }

  function toggleActions() {
    setOpen((current) => !current);
  }

  return (
    <li
      data-gesture-owner="expense-actions"
      className="relative overflow-hidden rounded-2xl border border-line bg-coral/10 shadow-xs"
    >
      <div
        className={cn(
          "relative z-10 flex min-h-[5.5rem] items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5",
          "touch-pan-y will-change-transform",
          dragging ? "transition-none" : "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={finishTouch}
        onTouchCancel={() => {
          touchStart.current = null;
          setDragging(false);
          setDragOffset(null);
        }}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }}
      >
        <span
          aria-hidden="true"
          className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-xl", category.tone)}
          title={category.label}
        >
          {category.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{expense.description}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted">
            <span className="font-medium text-ink/80">{category.label}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {expense.method === "efectivo" ? (
                <Wallet aria-hidden="true" className="size-3" />
              ) : (
                <CreditCard aria-hidden="true" className="size-3" />
              )}
              {expense.method === "efectivo" ? "Efectivo" : "Tarjeta"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatShortDay(expense.date)}</span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <Money cents={expense.amountCents} className="text-sm font-bold text-ink" />
        </div>

        {!desktopActions ? (
          <button
            type="button"
            aria-label={`${open ? "Ocultar" : "Mostrar"} acciones para ${expense.description}`}
            aria-expanded={actionsVisible}
            aria-controls={actionsId}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-paper hover:text-ink focus-visible:ring-2 focus-visible:ring-forest"
            onKeyDown={(event) => {
              if (event.key === "Escape" && open) {
                event.preventDefault();
                setOpen(false);
              }
            }}
            onClick={toggleActions}
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      <div
        id={actionsId}
        aria-hidden={!actionsVisible}
        inert={!actionsVisible}
        className={cn(
          "absolute inset-y-0 right-0 flex w-28 items-center justify-evenly bg-coral/15 px-1",
          "transition-opacity duration-150",
          actionsVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          type="button"
          aria-label={`Editar ${expense.description}`}
          className="grid size-11 place-items-center rounded-xl bg-surface text-forest shadow-xs focus-visible:ring-2 focus-visible:ring-forest"
          onClick={() => onEdit(expense)}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Eliminar ${expense.description}`}
          className="grid size-11 place-items-center rounded-xl bg-surface text-danger shadow-xs focus-visible:ring-2 focus-visible:ring-danger"
          onClick={() => onDelete(expense.id)}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </li>
  );
}
