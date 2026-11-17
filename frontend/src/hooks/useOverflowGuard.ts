import { useEffect } from "react";

/**
 * useOverflowGuard: Dev-only hook to monitor and flag any DOM element whose
 * bounding box escapes its nearest [data-card] or [data-boundary] ancestor.
 * Outlines violating elements in red and logs detailed geometric diagnostics.
 */
export function useOverflowGuard(enabled = import.meta.env?.DEV ?? true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const checkOverflow = () => {
      const cards = document.querySelectorAll<HTMLElement>("[data-card]");
      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const children = card.querySelectorAll<HTMLElement>("*");

        children.forEach((el) => {
          // Ignore SVG defs, hidden elements, tooltips, sheets and dialogs
          if (
            el.closest("[data-radix-portal]") ||
            el.closest("[role='dialog']") ||
            el.closest("[role='tooltip']") ||
            el.tagName === "DEFS" ||
            el.tagName === "CLIPPATH"
          ) {
            return;
          }

          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            return;
          }

          const rect = el.getBoundingClientRect();
          // Allow 2px tolerance for fractional subpixel antialiasing
          const overflowsRight = rect.right > cardRect.right + 2;
          const overflowsLeft = rect.left < cardRect.left - 2;

          if (overflowsRight || overflowsLeft) {
            el.style.outline = "2px dashed #EF4444";
            console.warn(
              `[OVERFLOW GUARD] Element escaped card bounds:`,
              el,
              `Card right: ${cardRect.right}px, Element right: ${rect.right}px (Delta: +${(rect.right - cardRect.right).toFixed(1)}px)`
            );
          } else if (el.style.outline.includes("dashed")) {
            el.style.outline = "";
          }
        });
      });
    };

    // Run after paint and on resize
    const timer = setTimeout(checkOverflow, 400);
    window.addEventListener("resize", checkOverflow);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [enabled]);
}
