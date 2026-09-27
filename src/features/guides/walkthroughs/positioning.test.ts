import { describe, expect, it } from "vitest";

import { positionWalkthroughCoach, visibleWalkthroughTarget, walkthroughScrollBehavior } from "./positioning";

const target = { left: 400, top: 300, right: 600, bottom: 360, width: 200, height: 60 };
const card = { width: 340, height: 280 };
const viewport = { width: 1200, height: 800 };

describe("walkthrough coach positioning", () => {
  it("does not smooth-scroll when reduced motion is requested", () => {
    expect(walkthroughScrollBehavior(true)).toBe("auto");
    expect(walkthroughScrollBehavior(false)).toBe("smooth");
  });

  it("uses the measured card height to keep a top card clear of its target", () => {
    const position = positionWalkthroughCoach({ target, card, viewport, preferred: "top" });

    expect(position.side).toBe("top");
    expect(position.top + card.height).toBeLessThan(target.top);
  });

  it("falls back when the preferred side cannot fit without covering the target", () => {
    const position = positionWalkthroughCoach({
      target: { left: 400, top: 680, right: 600, bottom: 740, width: 200, height: 60 },
      card,
      viewport,
      preferred: "bottom",
    });

    expect(position.side).toBe("top");
    expect(position.top + card.height).toBeLessThan(680);
  });

  it("honours horizontal placement when it fits", () => {
    const position = positionWalkthroughCoach({ target, card, viewport, preferred: "right" });

    expect(position.side).toBe("right");
    expect(position.left).toBeGreaterThan(target.right);
  });

  it("keeps phone cards on a clear vertical side", () => {
    const phoneCard = { width: 358, height: 260 };
    const phoneViewport = { width: 390, height: 844 };
    const phoneTarget = { left: 24, top: 330, right: 366, bottom: 370, width: 342, height: 40 };
    const position = positionWalkthroughCoach({
      target: phoneTarget,
      card: phoneCard,
      viewport: phoneViewport,
      preferred: "bottom",
      allowedSides: ["top", "bottom"],
    });

    expect(position.left).toBe(16);
    expect(position.top).toBeGreaterThan(phoneTarget.bottom);
  });

  it("focuses a visible slice of an oversized section so the coach can stay clear", () => {
    const largeTarget = { left: 320, top: 120, right: 1180, bottom: 760, width: 860, height: 640 };
    const focusTarget = visibleWalkthroughTarget({ target: largeTarget, viewport });
    const position = positionWalkthroughCoach({
      target: focusTarget,
      card,
      viewport,
      preferred: "left",
    });

    expect(focusTarget.height).toBe(180);
    expect(position.top).toBeGreaterThan(focusTarget.bottom);
  });
});
