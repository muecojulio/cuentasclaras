import { useCallback, useEffect, useRef, useState } from "react";

export type ScrollOverflow = { left: boolean; right: boolean };

export function useScrollOverflow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [overflow, setOverflow] = useState<ScrollOverflow>({ left: false, right: false });

  const update = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const next = {
      left: element.scrollLeft > 2,
      right: maxScroll - element.scrollLeft > 2,
    };
    setOverflow((current) =>
      current.left === next.left && current.right === next.right ? current : next,
    );
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    update();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(element);
    for (const child of element.children) resizeObserver?.observe(child);

    const mutationObserver =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
        update();
        if (resizeObserver) {
          for (const child of element.children) resizeObserver.observe(child);
        }
      });
    mutationObserver?.observe(element, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  return { ref, overflow, update };
}
