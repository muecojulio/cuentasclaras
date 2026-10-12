import type { ButtonHTMLAttributes, ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";
import { formatMxn } from "@/lib/money";

const tap =
  "motion-safe:transition-[transform,background-color,opacity,color] motion-safe:duration-150 motion-safe:ease-out motion-safe:active:scale-[0.96]";

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "surface" | "ghost" | "danger";
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium disabled:pointer-events-none disabled:opacity-40",
        tap,
        variant === "primary" && "bg-forest text-paper",
        variant === "surface" && "border border-line bg-surface text-ink",
        variant === "ghost" && "bg-transparent text-ink",
        variant === "danger" && "bg-danger text-paper",
        className,
      )}
      {...props}
    />
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-forest focus:ring-4 focus:ring-forest/20 motion-reduce:transition-none";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-sm text-danger">{hint}</span> : null}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-line/70 p-1" role="group">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 rounded-xl text-sm font-medium",
              tap,
              active ? "bg-surface text-forest shadow-sm" : "text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-8 w-14 shrink-0 rounded-full bg-line transition-colors duration-150 data-[state=checked]:bg-forest motion-reduce:transition-none"
    >
      <Switch.Thumb className="block size-6 translate-x-1 rounded-full bg-surface shadow-sm transition-transform duration-150 will-change-transform data-[state=checked]:translate-x-7 motion-reduce:transition-none" />
    </Switch.Root>
  );
}

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatMxn(cents)}</span>;
}
