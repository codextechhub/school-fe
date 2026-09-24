import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionCode } from "@/permissions";

const held = new Set<PermissionCode>();
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: (code: PermissionCode) => held.has(code),
    hasAnyPermission: (...codes: PermissionCode[]) => codes.some((code) => held.has(code)),
    hasAllPermissions: (...codes: PermissionCode[]) => codes.every((code) => held.has(code)),
  }),
}));

const { default: PermissionGate } = await import("./permission-gate");
const { P } = await import("@/permissions");

const actions = [P.CREATE_CLASS, P.MODIFY_CLASS, P.ARCHIVE_CLASS, P.REACTIVATE_CLASS];
const render = (permission: PermissionCode | PermissionCode[], mode?: "any" | "all") =>
  renderToStaticMarkup(
    <PermissionGate permission={permission} mode={mode}>
      <button>Action</button>
    </PermissionGate>,
  );

describe("permission-gated school controls", () => {
  beforeEach(() => held.clear());

  it.each(actions)("hides an action without its own key and shows it with that key", (action) => {
    expect(render(action)).toBe("");
    for (const other of actions.filter((candidate) => candidate !== action)) {
      held.add(other);
      expect(render(action)).toBe("");
    }
    held.add(action);
    expect(render(action)).toContain("<button>Action</button>");
  });

  it("distinguishes any from all for a combined operation", () => {
    held.add(P.CREATE_CLASS);
    expect(render(actions)).toContain("<button>Action</button>");
    expect(render(actions, "all")).toBe("");
    for (const action of actions) held.add(action);
    expect(render(actions, "all")).toContain("<button>Action</button>");
  });
});
