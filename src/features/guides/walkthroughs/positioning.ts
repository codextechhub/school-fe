import type { WalkthroughPlacement } from "./types";

export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type SizeLike = {
  width: number;
  height: number;
};

export type CoachSide = Exclude<WalkthroughPlacement, "auto">;

export type CoachPosition = {
  left: number;
  top: number;
  side: CoachSide;
};

const DEFAULT_GAP = 14;
const DEFAULT_MARGIN = 16;

export function walkthroughScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}

export function visibleWalkthroughTarget({
  target,
  viewport,
  margin = 8,
  maxHeight = 180,
}: {
  target: RectLike;
  viewport: SizeLike;
  margin?: number;
  maxHeight?: number;
}): RectLike {
  const left = clamp(target.left, margin, viewport.width - margin);
  const right = clamp(target.right, left, viewport.width - margin);
  const top = clamp(target.top, margin, viewport.height - margin);
  const bottom = clamp(Math.min(target.bottom, top + maxHeight), top, viewport.height - margin);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (maximum < minimum) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

function overlapArea(a: RectLike, b: RectLike): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function orderedSides(preferred: WalkthroughPlacement, allowedSides: readonly CoachSide[]): CoachSide[] {
  const defaults: readonly CoachSide[] = ["bottom", "top", "right", "left"];
  const first = preferred === "auto" || !allowedSides.includes(preferred) ? [] : [preferred];
  return [...new Set([...first, ...defaults])].filter((side): side is CoachSide => allowedSides.includes(side));
}

function rawCandidate(
  side: CoachSide,
  target: RectLike,
  card: SizeLike,
  gap: number,
): { left: number; top: number } {
  if (side === "top") {
    return { left: target.left + (target.width - card.width) / 2, top: target.top - gap - card.height };
  }
  if (side === "left") {
    return { left: target.left - gap - card.width, top: target.top + (target.height - card.height) / 2 };
  }
  if (side === "right") {
    return { left: target.right + gap, top: target.top + (target.height - card.height) / 2 };
  }
  return { left: target.left + (target.width - card.width) / 2, top: target.bottom + gap };
}

function asRect(position: { left: number; top: number }, card: SizeLike): RectLike {
  return {
    ...position,
    right: position.left + card.width,
    bottom: position.top + card.height,
    width: card.width,
    height: card.height,
  };
}

export function positionWalkthroughCoach({
  target,
  card,
  viewport,
  preferred = "auto",
  allowedSides = ["top", "right", "bottom", "left"],
  gap = DEFAULT_GAP,
  margin = DEFAULT_MARGIN,
}: {
  target: RectLike;
  card: SizeLike;
  viewport: SizeLike;
  preferred?: WalkthroughPlacement;
  allowedSides?: readonly CoachSide[];
  gap?: number;
  margin?: number;
}): CoachPosition {
  const candidates = orderedSides(preferred, allowedSides).map((side, priority) => {
    const raw = rawCandidate(side, target, card, gap);
    const position = {
      left: clamp(raw.left, margin, viewport.width - card.width - margin),
      top: clamp(raw.top, margin, viewport.height - card.height - margin),
    };
    const rect = asRect(position, card);
    const overflow = Math.abs(position.left - raw.left) + Math.abs(position.top - raw.top);
    return { ...position, side, priority, overlap: overlapArea(rect, target), overflow };
  });

  const best = candidates.sort((a, b) => (
    a.overlap - b.overlap
    || a.priority - b.priority
    || a.overflow - b.overflow
  ))[0];

  return best ?? {
    left: clamp((viewport.width - card.width) / 2, margin, viewport.width - card.width - margin),
    top: clamp((viewport.height - card.height) / 2, margin, viewport.height - card.height - margin),
    side: "bottom",
  };
}
