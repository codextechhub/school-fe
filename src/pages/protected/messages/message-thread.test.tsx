import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessage } from "@/redux/services/messages/messages-types";

import { MessageThread } from "./message-thread";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The scroll behaviour of an open conversation's message list.
 *
 * Neither happy-dom nor jsdom lays anything out, so the scroll box gets a
 * stand-in geometry: every list item is 50px tall and the box shows 400px. The
 * scroll position is clamped the way a browser clamps it, so a test that says
 * "at the bottom" means the same thing it does on a screen.
 */
const ROW_PX = 50;
const VIEW_PX = 400;
const tops = new WeakMap<Element, number>();
const isViewport = (el: Element) => el.getAttribute("data-slot") === "scroll-area-viewport";
const contentHeight = (el: Element) => el.querySelectorAll("li").length * ROW_PX;

function stubGeometry() {
  const html = HTMLElement.prototype;
  Object.defineProperty(html, "scrollHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return isViewport(this) ? contentHeight(this) : 0;
    },
  });
  Object.defineProperty(html, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return isViewport(this) ? VIEW_PX : 0;
    },
  });
  Object.defineProperty(html, "scrollTop", {
    configurable: true,
    get(this: HTMLElement) {
      return tops.get(this) ?? 0;
    },
    set(this: HTMLElement, value: number) {
      const max = Math.max(contentHeight(this) - VIEW_PX, 0);
      tops.set(this, Math.min(Math.max(value, 0), max));
    },
  });
}

function unstubGeometry() {
  for (const key of ["scrollHeight", "clientHeight", "scrollTop"]) {
    Reflect.deleteProperty(HTMLElement.prototype, key);
  }
}

const range = (from: number, to: number, mine = false): ChatMessage[] =>
  Array.from({ length: to - from + 1 }, (_, index) => ({
    id: from + index,
    body: `Message ${from + index}`,
    sent_at: "2026-10-21T08:30:00Z",
    mine,
  }));

describe("the message thread's scrolling", () => {
  let container: HTMLDivElement;
  let root: Root;

  const seen = vi.fn();
  const draw = (messages: ChatMessage[], hasMore = false) =>
    act(async () =>
      root.render(
        <MessageThread
          messages={messages}
          loading={false}
          failed={false}
          hasMore={hasMore}
          loadingOlder={false}
          onLoadOlder={vi.fn()}
          onRetry={vi.fn()}
          showSender={false}
          showTimes={false}
          bodyHidden={false}
          onSeen={seen}
        />,
      ),
    );
  const viewport = () => container.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
  const bottom = () => contentHeight(viewport()) - VIEW_PX;
  const scrollTo = async (top: number) =>
    act(async () => {
      viewport().scrollTop = top;
      viewport().dispatchEvent(new Event("scroll"));
    });
  const pill = () =>
    Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("New messages"));

  beforeEach(() => {
    seen.mockReset();
    stubGeometry();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    unstubGeometry();
  });

  it("opens on the newest message", async () => {
    await draw(range(1, 40));

    expect(bottom()).toBeGreaterThan(0);
    expect(viewport().scrollTop).toBe(bottom());
    expect(pill()).toBeUndefined();
  });

  it("follows a new message while the reader is at the bottom", async () => {
    await draw(range(1, 40));
    await draw(range(1, 41));

    expect(viewport().scrollTop).toBe(bottom());
    expect(pill()).toBeUndefined();
  });

  it("holds the reader's place and offers New messages when they are reading higher up", async () => {
    await draw(range(1, 40));
    await scrollTo(300);
    await draw(range(1, 41));

    expect(viewport().scrollTop).toBe(300);
    expect(pill()).toBeDefined();
  });

  it("jumps to the newest message when the pill is tapped", async () => {
    await draw(range(1, 40));
    await scrollTo(300);
    await draw(range(1, 41));

    await act(async () => pill()?.click());

    expect(viewport().scrollTop).toBe(bottom());
    expect(pill()).toBeUndefined();
  });

  it("drops the pill when the reader scrolls down to the newest message themselves", async () => {
    await draw(range(1, 40));
    await scrollTo(300);
    await draw(range(1, 41));
    expect(pill()).toBeDefined();

    await scrollTo(bottom());

    expect(pill()).toBeUndefined();
  });

  it("takes a reader who sends a message to it even from higher up", async () => {
    await draw(range(1, 40));
    await scrollTo(300);
    await draw([...range(1, 40), ...range(41, 41, true)]);

    expect(viewport().scrollTop).toBe(bottom());
    expect(pill()).toBeUndefined();
  });

  it("keeps the reader on the same message when earlier ones load above", async () => {
    await draw(range(21, 60), true);
    await scrollTo(30);
    const before = { top: viewport().scrollTop, height: contentHeight(viewport()) };

    await draw(range(1, 60), false);

    const added = contentHeight(viewport()) - before.height;
    expect(added).toBeGreaterThan(0);
    expect(viewport().scrollTop).toBe(before.top + added);
    expect(pill()).toBeUndefined();
  });
  describe("what the reader has seen", () => {
    const lastSeen = () => seen.mock.calls[seen.mock.calls.length - 1]?.[0];

    it("reports the newest message on opening, at the bottom", async () => {
      await draw(range(1, 40));
      expect(lastSeen()).toBe(40);
    });

    it("reports a message that arrives while the reader is at the bottom", async () => {
      await draw(range(1, 40));
      await draw(range(1, 41));
      expect(lastSeen()).toBe(41);
    });

    it("reports nothing new while the New messages pill is showing", async () => {
      await draw(range(1, 40));
      await scrollTo(300);
      seen.mockClear();
      await draw(range(1, 42));

      expect(pill()).toBeDefined();
      expect(seen.mock.calls.map((call) => call[0])).not.toContain(41);
      expect(seen.mock.calls.map((call) => call[0])).not.toContain(42);
    });

    it("reports the newest message once the pill is tapped", async () => {
      await draw(range(1, 40));
      await scrollTo(300);
      await draw(range(1, 42));

      await act(async () => pill()?.click());

      expect(lastSeen()).toBe(42);
    });

    it("reports the newest message once the reader scrolls down to it", async () => {
      await draw(range(1, 40));
      await scrollTo(300);
      await draw(range(1, 42));

      await scrollTo(bottom());

      expect(lastSeen()).toBe(42);
    });
  });

  describe("the delivery marks", () => {
    const own: ChatMessage[] = [
      { id: 1, body: "One", mine: true, receipt: { state: "sent", read_count: 0, recipient_count: 3 } },
      { id: 2, body: "Two", mine: true, receipt: { state: "read", read_count: 3, recipient_count: 3 } },
      { id: 3, body: "Theirs", mine: false },
    ];
    const drawOwn = (props: { receipts: boolean; withCount?: boolean }) =>
      act(async () =>
        root.render(
          <MessageThread
            messages={own}
            loading={false}
            failed={false}
            hasMore={false}
            loadingOlder={false}
            onLoadOlder={vi.fn()}
            onRetry={vi.fn()}
            showSender={false}
            showTimes={false}
            bodyHidden={false}
            {...props}
          />,
        ),
      );
    const labels = () =>
      Array.from(container.querySelectorAll('[aria-label^="Sent"], [aria-label^="Read"]')).map((el) =>
        el.getAttribute("aria-label"),
      );

    it("draws a tick for sent and two for read on the reader's own messages only", async () => {
      await drawOwn({ receipts: true });
      expect(labels()).toEqual(["Sent", "Read"]);
    });

    it("draws nothing when receipts are off", async () => {
      await drawOwn({ receipts: false });
      expect(labels()).toEqual([]);
    });

    it("names the count for each mark in a conversation with several readers", async () => {
      await drawOwn({ receipts: true, withCount: true });
      expect(labels()).toEqual(["Sent. Read by 0 of 3", "Read. Read by 3 of 3"]);
    });
  });
});
