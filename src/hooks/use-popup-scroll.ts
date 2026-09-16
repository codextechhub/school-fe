import * as React from "react";

/**
 * Re-enables wheel / touch scrolling inside popups that portal to <body>.
 *
 * Radix's Dialog and Sheet lock page scrolling with react-remove-scroll, which
 * `preventDefault()`s every wheel and touchmove whose target sits outside the
 * dialog content (the lock's only "shard"). Radix's own popups (Select,
 * Popover, DropdownMenu) each mount their own RemoveScroll around their popup,
 * so they keep scrolling. base-ui's Combobox does not - its list portals to
 * <body>, lands outside every lock, and silently stops scrolling by mouse wheel
 * or finger the moment it is opened from inside a modal. Only the arrow keys
 * still move through the options.
 *
 * We can't register the popup as a shard from the outside, so we scroll it
 * ourselves while a lock is active. react-remove-scroll-bar keeps
 * `data-scroll-locked` on <body> for as long as any lock is mounted; with no
 * lock, the browser's native scrolling runs and these handlers stay out of the
 * way (no double-scroll).
 */
// Module scope on purpose: it closes over nothing, so the handlers below stay
// stable instead of taking it as a dependency.
function scrollByHand(el: HTMLElement, dx: number, dy: number) {
  if (dy) el.scrollTop += dy;
  if (dx) el.scrollLeft += dx;
}

export function usePopupScroll<T extends HTMLElement = HTMLElement>() {
  const lastTouch = React.useRef<{ x: number; y: number } | null>(null);

  const onWheel = React.useCallback((e: React.WheelEvent<T>) => {
    if (!document.body.hasAttribute("data-scroll-locked")) return;
    const el = e.currentTarget;
    // deltaMode: 0 = pixels, 1 = lines, 2 = pages.
    const step = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
    scrollByHand(el, e.deltaX * step, e.deltaY * step);
  }, []);

  const onTouchStart = React.useCallback((e: React.TouchEvent<T>) => {
    const t = e.touches[0];
    lastTouch.current = t ? { x: t.clientX, y: t.clientY } : null;
  }, []);

  const onTouchMove = React.useCallback((e: React.TouchEvent<T>) => {
    if (!document.body.hasAttribute("data-scroll-locked")) return;
    const t = e.touches[0];
    const prev = lastTouch.current;
    if (!t || !prev) return;
    scrollByHand(e.currentTarget, prev.x - t.clientX, prev.y - t.clientY);
    lastTouch.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = React.useCallback(() => {
    lastTouch.current = null;
  }, []);

  return { onWheel, onTouchStart, onTouchMove, onTouchEnd };
}
