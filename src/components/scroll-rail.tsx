import { forwardRef, useCallback, useRef, type ReactNode, type TouchEvent } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useScrollOverflow } from "@/lib/use-scroll-overflow";

type ScrollRailProps = {
  children: ReactNode;
  label?: string;
  className?: string;
  contentClassName?: string;
};

export const ScrollRail = forwardRef<HTMLDivElement, ScrollRailProps>(function ScrollRail(
  { children, label, className, contentClassName },
  forwardedRef,
) {
  const { ref, overflow, update } = useScrollOverflow<HTMLDivElement>();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef, ref],
  );

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    dragged.current = false;
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch || !touchStart.current) return;
    if (Math.abs(touch.clientX - touchStart.current.x) > 8) dragged.current = true;
  }

  function finishTouch() {
    touchStart.current = null;
    if (dragged.current) {
      window.setTimeout(() => {
        dragged.current = false;
      }, 450);
    }
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={setRef}
        role={label ? "group" : undefined}
        aria-label={label}
        data-native-scroll="true"
        className={cn(
          "flex w-full items-stretch gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-1",
          "scroll-snap-x scrollbar-hidden",
          contentClassName,
        )}
        onScroll={update}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={finishTouch}
        onTouchCancel={finishTouch}
        onClickCapture={(event) => {
          if (!dragged.current) return;
          event.preventDefault();
          event.stopPropagation();
          dragged.current = false;
        }}
      >
        {children}
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-paper to-transparent transition-opacity",
          overflow.left ? "opacity-100" : "opacity-0",
        )}
      />
      {overflow.right ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 grid w-8 place-items-center bg-gradient-to-l from-paper via-paper/90 to-transparent text-forest"
        >
          <ChevronRight className="size-4 drop-shadow-sm" />
        </span>
      ) : null}
      {label ? <span className="sr-only">Carril desplazable horizontalmente.</span> : null}
    </div>
  );
});
