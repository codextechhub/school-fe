/**
 * The header search reads the school's shape from the sources the finance
 * sidebar reads, and asks the books for custody only of a reader who may read
 * it. The hooks it leans on are replaced here, so these tests check the wiring
 * between them and nothing about the requests themselves.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { P, resolvePermissionKey, type PermissionCode } from "@/permissions";
import type { PaletteSchool } from "@/lib/action-palette";

const state = vi.hoisted(() => ({
  applies: false,
  wholeSchool: true,
  held: [] as string[],
  entities: [] as { code: string }[],
  selected: null as string | null,
  mode: undefined as string | undefined,
  entitySkip: [] as boolean[],
  custodyCalls: [] as { entity: string | null | undefined; enabled: boolean }[],
}));

vi.mock("@/hooks/use-branch-lens", () => ({
  useBranchLens: () => ({ applies: state.applies }),
}));

vi.mock("@/hooks/use-reader-reach", () => ({
  useReaderReach: () => ({ wholeSchool: state.wholeSchool }),
}));

vi.mock("@/hooks/use-permissions", async () => {
  const permissions = await vi.importActual<typeof import("@/permissions")>("@/permissions");
  return {
    usePermissions: () => ({
      hasPermission: (code: PermissionCode) =>
        state.held.includes(permissions.resolvePermissionKey(code)),
    }),
  };
});

vi.mock("@/redux/store", () => ({
  useAppSelector: () => state.selected,
}));

vi.mock("@/redux/services/finance/entity-api", () => ({
  useGetEntitiesQuery: (_arg: unknown, options: { skip: boolean }) => {
    state.entitySkip.push(options.skip);
    return { data: options.skip ? undefined : { data: state.entities } };
  },
}));

vi.mock("@/components/finance-ui/held-custody", async () => {
  const actual = await vi.importActual<typeof import("@/components/finance-ui/held-custody")>(
    "@/components/finance-ui/held-custody",
  );
  return {
    mayReadCustody: actual.mayReadCustody,
    useCustodyReading: (entity: string | null | undefined, enabled: boolean) => {
      state.custodyCalls.push({ entity, enabled });
      return enabled && entity && state.mode ? state.mode : "UNKNOWN";
    },
  };
});

const { usePaletteSchool } = await import("./use-palette-school");

function read(): PaletteSchool {
  let school: PaletteSchool | undefined;
  function Probe() {
    school = usePaletteSchool();
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return school!;
}

beforeEach(() => {
  state.applies = false;
  state.wholeSchool = true;
  state.held = [];
  state.entities = [{ code: "MAIN" }];
  state.selected = null;
  state.mode = "HELD";
  state.entitySkip = [];
  state.custodyCalls = [];
});

describe("usePaletteSchool", () => {
  it("reads several branches off the branch lens", () => {
    state.applies = true;
    expect(read().multiBranch).toBe(true);
    state.applies = false;
    expect(read().multiBranch).toBe(false);
  });

  it("asks nothing of the books for a reader who may not read custody", () => {
    // A class teacher opening the header must not send a finance request.
    const school = read();
    expect(state.entitySkip).toEqual([true]);
    expect(state.custodyCalls).toEqual([{ entity: null, enabled: false }]);
    expect(school.custody).toBe("UNKNOWN");
  });

  it("reads custody for the school's books when the reader may view payouts", () => {
    state.held = [resolvePermissionKey(P.PAY_VIEW_PAYOUTS)];
    const school = read();
    expect(state.entitySkip).toEqual([false]);
    expect(state.custodyCalls).toEqual([{ entity: "MAIN", enabled: true }]);
    expect(school.custody).toBe("HELD");
  });

  it("reads custody for a payment settings reader as well", () => {
    state.held = [resolvePermissionKey(P.PAY_VIEW_PAYMENT_SETTINGS)];
    state.mode = "DIRECT";
    expect(read().custody).toBe("DIRECT");
  });

  it("reads whether the reader covers the whole school off their reach", () => {
    expect(read().wholeSchool).toBe(true);
    state.wholeSchool = false;
    expect(read().wholeSchool).toBe(false);
  });
});
