import { useLayoutEffect, useRef, useState } from "react";

/** The shortest a fitted page is allowed to get, so a tiny viewport stays usable. */
const MIN_HEIGHT_PX = 220;
/** The single-pane widths, matching Tailwind's `max-lg`. */
const PHONE_QUERY = "(max-width: 1023.98px)";

type Fit = { height: number | undefined; shift: number };

/**
 * Sizes an element to the part of the screen the reader can see below its top
 * edge, so a page built from fixed panes never scrolls as a whole.
 *
 * `100dvh` alone is not enough on a phone: with the on-screen keyboard open the
 * layout viewport keeps its size and only `window.visualViewport` shrinks, so a
 * composer pinned to the bottom of a `100dvh` box sits behind the keyboard. The
 * height here is the visual viewport's, less the element's distance from the top
 * of the document (any bar above it), and it is measured again whenever the
 * window, the visual viewport or the document changes size. The height is
 * undefined until the first measurement, so the caller supplies a CSS fallback.
 *
 * `follow` is for a page that owns the top of the screen on a phone, with no app
 * header above it. iOS answers a focused field by panning the visual viewport
 * down inside the layout viewport (`offsetTop`), which would carry the page's
 * own header off the top. A following page is shifted down by that offset so its
 * header stays at the top of what the reader sees. It follows only below `lg`:
 * on a wide screen the offset is a pinch zoom, and the page should not chase it.
 */
export function useFitViewport<T extends HTMLElement>(follow = false) {
  const ref = useRef<T>(null);
  const appliedShift = useRef(0);
  const [fit, setFit] = useState<Fit>({ height: undefined, shift: 0 });

  useLayoutEffect(() => {
    appliedShift.current = fit.shift;
  }, [fit.shift]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const visual = window.visualViewport;

    const measure = () => {
      const panned = visual?.offsetTop ?? 0;
      const shifted = follow && window.matchMedia(PHONE_QUERY).matches;
      const top = el.getBoundingClientRect().top + window.scrollY - appliedShift.current;
      const visible = visual?.height ?? window.innerHeight;
      const bottom = shifted ? visible : panned + visible;
      const height = Math.max(Math.floor(bottom - top), MIN_HEIGHT_PX);
      const shift = shifted ? Math.round(panned) : 0;
      setFit((current) =>
        current.height === height && current.shift === shift ? current : { height, shift },
      );
    };

    measure();
    window.addEventListener("resize", measure);
    visual?.addEventListener("resize", measure);
    visual?.addEventListener("scroll", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", measure);
      visual?.removeEventListener("resize", measure);
      visual?.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [follow]);

  return { ref, height: fit.height, shift: fit.shift };
}
