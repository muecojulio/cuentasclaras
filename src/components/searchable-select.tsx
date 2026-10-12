import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { normalizeSearchText } from "@/lib/expense-categories";
import { cn } from "@/lib/cn";

export type SearchableOption<T extends string> = {
  value: T;
  label: string;
  emoji?: string;
};

export function SearchableSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly SearchableOption<T>[];
  onChange: (value: T) => void;
}) {
  const generatedId = useId();
  const listId = `${generatedId}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const normalizedQuery = normalizeSearchText(query);
  const filteredOptions = normalizedQuery
    ? options.filter((option) => normalizeSearchText(option.label).includes(normalizedQuery))
    : options;

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  function choose(option: SearchableOption<T>) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function openList() {
    setOpen(true);
    setQuery("");
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (filteredOptions.length === 0) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (current < 0) return direction > 0 ? 0 : filteredOptions.length - 1;
        return (current + direction + filteredOptions.length) % filteredOptions.length;
      });
      return;
    }

    if ((event.key === "Home" || event.key === "End") && open && filteredOptions.length > 0) {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : filteredOptions.length - 1);
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) choose(option);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    }

    if (event.key === "Tab") {
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          className="h-12 w-full rounded-2xl border border-line bg-paper pl-10 pr-12 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus-visible:border-forest focus-visible:ring-4 focus-visible:ring-forest/20 motion-reduce:transition-none"
          placeholder={selected?.label ?? "Busca una opción"}
          value={open ? query : (selected?.label ?? "")}
          onFocus={openList}
          onClick={() => {
            if (!open) openList();
          }}
          onChange={(event) => {
            const nextQuery = event.target.value;
            const hasMatches = options.some((option) =>
              normalizeSearchText(option.label).includes(normalizeSearchText(nextQuery)),
            );
            setQuery(nextQuery);
            setOpen(true);
            setActiveIndex(hasMatches ? 0 : -1);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? `Cerrar ${label.toLocaleLowerCase("es-MX")}` : `Mostrar ${label.toLocaleLowerCase("es-MX")}`}
          aria-expanded={open}
          className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-forest"
          onClick={() => {
            if (open) {
              setOpen(false);
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            } else {
              inputRef.current?.focus();
              openList();
            }
          }}
        >
          <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          {filteredOptions.length > 0 ? (
            <ul id={listId} role="listbox" aria-label={`${label} disponibles`} className="space-y-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  data-active={index === activeIndex || undefined}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-ink outline-none transition-colors",
                    index === activeIndex ? "bg-forest/10" : "hover:bg-paper",
                  )}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  {option.emoji ? <span aria-hidden="true" className="text-base">{option.emoji}</span> : null}
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {option.value === value ? <Check aria-hidden="true" className="size-4 text-forest" /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" aria-live="polite" className="px-3 py-4 text-sm text-muted">
              No hay {label.toLocaleLowerCase("es-MX")} que coincidan con “{query}”.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
