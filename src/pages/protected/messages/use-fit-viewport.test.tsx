import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FittedPage } from "./fitted-page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * How a fitted page follows the visible screen.
 *
 * A fake `visualViewport` stands in for the browser's, so the page can be put
 * where iOS puts it when the keyboard opens: a visual viewport shorter than the
 * layout viewport and panned down inside it.
 */
class FakeViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
}

describe("a fitted page", () => {
  let container: HTMLDivElement;
  let root: Root;
  let visual: FakeViewport;
  let phone = true;

  const main = () => container.querySelector("main") as HTMLElement;
  const draw = (ownsTop: boolean) => act(async () => root.render(<FittedPage ownsTop={ownsTop}>x</FittedPage>));
  const moveViewport = (height: number, offsetTop: number) =>
    act(async () => {
      visual.height = height;
      visual.offsetTop = offsetTop;
      visual.dispatchEvent(new Event("resize"));
    });

  beforeEach(() => {
    visual = new FakeViewport();
    phone = true;
    Object.defineProperty(window, "visualViewport", { configurable: true, value: visual });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: phone, addEventListener() {}, removeEventListener() {} }),
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    Reflect.deleteProperty(window, "visualViewport");
  });

  it("fills the visible screen from its own top edge", async () => {
    await draw(true);
    expect(main().style.height).toBe("800px");
    expect(main().style.transform).toBe("");
  });

  it("shrinks with the on-screen keyboard", async () => {
    await draw(true);
    await moveViewport(450, 0);
    expect(main().style.height).toBe("450px");
  });

  it("follows the visual viewport down when iOS pans it, so its header stays in view", async () => {
    await draw(true);
    await moveViewport(450, 120);
    expect(main().style.height).toBe("450px");
    expect(main().style.transform).toBe("translateY(120px)");
  });

  it("does not chase the visual viewport on a wide screen", async () => {
    phone = false;
    await draw(true);
    await moveViewport(450, 120);
    expect(main().style.transform).toBe("");
    expect(main().style.height).toBe("570px");
  });

  it("does not follow when the app header is still above it", async () => {
    await draw(false);
    await moveViewport(450, 120);
    expect(main().style.transform).toBe("");
  });
});
