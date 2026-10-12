import { useLayoutEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";
import { useScrollOverflow } from "@/lib/use-scroll-overflow";

export type SwipeTabOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function SwipeTabs<T extends string>({
  label,
  value,
  tabs,
  onValueChange,
  children,
  className,
}: {
  label: string;
  value: T;
  tabs: readonly SwipeTabOption<T>[];
  onValueChange: (value: T) => void;
  children: (value: T) => ReactNode;
  className?: string;
}) {
  const { ref, overflow, update } = useScrollOverflow<HTMLDivElement>();
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const touchStart = useRef<{ x: number; y: number; at: number } | null>(null);
  const tabSignature = tabs.map(({ value: tabValue, label: tabLabel, count }) => `${tabValue}:${tabLabel}:${count ?? ""}`).join("|");

  useLayoutEffect(() => {
    const list = ref.current;
    const active = list?.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (!list || !active) return;

    setIndicator({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
    const nextLeft = active.offsetLeft + active.offsetWidth / 2 - list.clientWidth / 2;
    const maxLeft = Math.max(0, list.scrollWidth - list.clientWidth);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      left: Math.max(0, Math.min(maxLeft, nextLeft)),
      behavior: reducedMotion ? "auto" : "smooth",
    });
    update();
  }, [ref, update, value, tabSignature]);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const excluded = target?.closest(
      "button, a, input, select, textarea, [role='button'], [role='tab'], [role='combobox'], [role='switch'], [data-native-scroll], [data-gesture-owner], [data-swipe-ignore], [contenteditable='true'], canvas, iframe",
    );
    const touch = event.touches[0];
    touchStart.current = excluded || event.touches.length !== 1 || !touch
      ? null
      : { x: touch.clientX, y: touch.clientY, at: performance.now() };
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const duration = performance.now() - start.at;
    const distance = Math.abs(deltaX);
    const quickEnough = duration <= 240 && distance >= 30;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.2 || (distance < 52 && !quickEnough)) return;

    const currentIndex = tabs.findIndex((tab) => tab.value === value);
    const direction = deltaX < 0 ? 1 : -1;
    const nextTab = tabs[currentIndex + direction];
    if (nextTab) onValueChange(nextTab.value);
  }

  return (
    <Tabs.Root value={value} onValueChange={(next) => onValueChange(next as T)} className={className}>
      <div className="relative min-w-0">
        <Tabs.List
          ref={ref}
          aria-label={label}
          data-native-scroll="true"
          className="relative flex w-full min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain rounded-2xl bg-line/65 p-1.5 scrollbar-hidden"
          onScroll={update}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 top-1.5 z-0 rounded-xl bg-forest shadow-sm motion-safe:transition-[transform,width] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
              visibility: indicator.ready ? "visible" : "hidden",
            }}
          />
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "group relative z-10 inline-flex h-11 min-w-24 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted outline-none",
                "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                "data-[state=active]:font-semibold data-[state=active]:text-paper",
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined ? (
                <span className="rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] leading-none group-data-[state=active]:bg-paper/20">
                  {tab.count}
                </span>
              ) : null}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-20 w-4 bg-gradient-to-r from-paper to-transparent transition-opacity",
            overflow.left ? "opacity-100" : "opacity-0",
          )}
        />
        {overflow.right ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-20 grid w-6 place-items-center bg-gradient-to-l from-paper via-paper/90 to-transparent text-forest"
          >
            <span className="size-1.5 rounded-full bg-forest/70" />
          </span>
        ) : null}
      </div>

      {tabs.map((tab) => (
        <Tabs.Content
          key={tab.value}
          value={tab.value}
          data-swipe-panel="true"
          className="swipe-tab-panel mt-3 min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => {
            touchStart.current = null;
          }}
        >
          {children(tab.value)}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
