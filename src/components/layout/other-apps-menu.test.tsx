import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * Mrs. Ngozi Eze teaches at Lagoon View Academy and her son Tunde is a pupil
 * there. The server lists the parent app among her `other_apps`, so her
 * account menu offers it, opening in a new tab. A colleague with no child at
 * the school is offered nothing, and so is an administrator proxying as
 * Mrs. Eze, because the parent app would open as the administrator.
 */
const state = vi.hoisted(() => ({
  otherApps: [] as { key: string; path: string }[],
  proxying: false,
}));
vi.mock("@/redux/services/auth/auth-api", () => ({
  authApi: {
    endpoints: {
      getMe: { useQueryState: () => ({ data: { data: { other_apps: state.otherApps } } }) },
    },
  },
}));
vi.mock("@/redux/store", () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({ auth: { impersonation: state.proxying ? { id: 4 } : null } }),
}));

import { OtherAppsMenuItems } from "./other-apps-menu";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("OtherAppsMenuItems", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    state.otherApps = [];
    state.proxying = false;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const render = () =>
    act(async () =>
      root.render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Account</DropdownMenuTrigger>
          <DropdownMenuContent>
            <OtherAppsMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>,
      ),
    );

  const link = () =>
    Array.from(document.body.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Open the parent app"),
    );

  it("offers a teacher who is a parent the parent app, in a new tab", async () => {
    state.otherApps = [{ key: "parent_app", path: "/parent/" }];
    await render();
    expect(link()?.getAttribute("href")).toBe("/parent/");
    expect(link()?.getAttribute("target")).toBe("_blank");
  });

  it("offers nothing to a colleague with no child at the school", async () => {
    await render();
    expect(link()).toBeUndefined();
  });

  it("offers nothing while proxying", async () => {
    state.otherApps = [{ key: "parent_app", path: "/parent/" }];
    state.proxying = true;
    await render();
    expect(link()).toBeUndefined();
  });

  it("leaves out an app it has no name for", async () => {
    state.otherApps = [{ key: "library_app", path: "/library/" }];
    await render();
    expect(document.body.querySelectorAll('[data-slot="dropdown-menu-item"]')).toHaveLength(0);
  });
});
