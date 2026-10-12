import type { ButtonHTMLAttributes, ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMxn } from "@/lib/money";

export type ButtonStatus = "success" | "error";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "surface" | "ghost" | "danger";
  loading?: boolean;
  loadingLabel?: string;
  status?: ButtonStatus;
  statusMessage?: string;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  loading = false,
  loadingLabel = "Procesando…",
  status,
  statusMessage,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const icon = loading ? (
    <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
  ) : status === "success" ? (
    <CheckCircle2 className="size-4" aria-hidden="true" />
  ) : status === "error" ? (
    <CircleAlert className="size-4" aria-hidden="true" />
  ) : null;

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-status={status}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold",
        "outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-forest text-paper shadow-sm",
        variant === "surface" && "border border-line bg-surface text-ink",
        variant === "ghost" && "bg-transparent text-ink",
        variant === "danger" && "bg-danger text-paper shadow-sm",
        status === "error" && "ring-2 ring-danger/35",
        status === "success" && "ring-2 ring-forest/25",
        className,
      )}
    >
      {icon}
      <span>{loading ? loadingLabel : children}</span>
      {statusMessage ? (
        <span className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </span>
      ) : null}
    </button>
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus-visible:border-forest focus-visible:ring-4 focus-visible:ring-forest/20 motion-reduce:transition-none";

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
      {hint ? (
        <span className="mt-1.5 block text-sm text-danger" role="alert">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-2xl bg-line/70 p-1"
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-xl px-2 text-sm font-semibold",
              active ? "bg-surface text-forest shadow-sm" : "text-muted hover:text-ink",
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
      className="relative h-11 w-[4.25rem] shrink-0 rounded-full bg-line outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper data-[state=checked]:bg-forest motion-reduce:transition-none"
    >
      <Switch.Thumb className="block size-7 translate-x-1 rounded-full bg-surface shadow-sm transition-transform duration-150 will-change-transform data-[state=checked]:translate-x-8 motion-reduce:transition-none" />
    </Switch.Root>
  );
}

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatMxn(cents)}</span>;
}
