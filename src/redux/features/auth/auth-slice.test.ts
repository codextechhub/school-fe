import { describe, expect, it } from "vitest";
import type { ActiveImpersonation, Auth, User } from "./auth-types";
import {
  authSliceReducer,
  selectActorPermissions,
  selectTenantIsPending,
  setAuthContext,
  updateSchool,
  setImpersonation,
  updatePermissions,
  updateTenant,
} from "./auth-slice";

/**
 * `/me` re-runs on mount, on token refresh and on window focus, almost always
 * returning the identical context. The reducers no-op in that case so Immer
 * hands back the very same state object - anything else re-renders the whole
 * protected tree for nothing. These tests pin that
 * identity guarantee (toBe, not toEqual) because it is the entire point.
 */
const stateWith = (partial: Partial<Auth>): Auth => ({
  session_id: 1,
  user: null,
  permissions: [],
  school: null,
  tenant: null,
  ...partial,
});

describe("updatePermissions", () => {
  it("returns the SAME state reference for an identical permissions array", () => {
    const state = stateWith({ permissions: ["student.view", "student.create"] });
    const next = authSliceReducer(state, updatePermissions(["student.view", "student.create"]));

    expect(next).toBe(state);
  });

  it("treats a REORDERED permissions array as a change (comparison is order-sensitive by design)", () => {
    // Order-sensitivity is deliberate: an index-wise compare is O(n) with no
    // sorting/allocation on the hot path, and the backend returns a stable
    // order - so a reordering is rare and a needless re-render is the safe
    // side to err on (never a missed permission update).
    const state = stateWith({ permissions: ["student.view", "student.create"] });
    const next = authSliceReducer(state, updatePermissions(["student.create", "student.view"]));

    expect(next).not.toBe(state);
    expect(next.permissions).toEqual(["student.create", "student.view"]);
  });

  it("applies a genuine change (added / removed permission)", () => {
    const state = stateWith({ permissions: ["student.view"] });

    const added = authSliceReducer(state, updatePermissions(["student.view", "student.create"]));
    expect(added).not.toBe(state);
    expect(added.permissions).toEqual(["student.view", "student.create"]);

    const removed = authSliceReducer(state, updatePermissions([]));
    expect(removed).not.toBe(state);
    expect(removed.permissions).toEqual([]);
  });

  it("assigns when the persisted session has no permissions key (legacy state)", () => {
    // samePermissions() requires a truthy existing array, so undefined always
    // takes the assignment branch - even for an empty incoming list.
    const state = stateWith({ permissions: undefined });
    const next = authSliceReducer(state, updatePermissions([]));

    expect(next).not.toBe(state);
    expect(next.permissions).toEqual([]);
  });
});

describe("updateTenant", () => {
  it("returns the SAME state reference for an equal tenant (same slug + name)", () => {
    const state = stateWith({ tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" } });
    const next = authSliceReducer(
      state,
      updateTenant({ slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" }),
    );

    expect(next).toBe(state);
  });

  it("returns the SAME state reference when both are null", () => {
    const state = stateWith({ tenant: null });
    expect(authSliceReducer(state, updateTenant(null))).toBe(state);
  });

  it("applies a changed slug or a changed name", () => {
    const state = stateWith({ tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" } });

    const slugChanged = authSliceReducer(
      state,
      updateTenant({ slug: "other-school", name: "Greenfield Academy", kind: "SCHOOL" }),
    );
    expect(slugChanged).not.toBe(state);
    expect(slugChanged.tenant?.slug).toBe("other-school");

    const nameChanged = authSliceReducer(
      state,
      updateTenant({ slug: "greenfield", name: "Greenfield Academy (Renamed)", kind: "SCHOOL" }),
    );
    expect(nameChanged).not.toBe(state);
    expect(nameChanged.tenant?.name).toBe("Greenfield Academy (Renamed)");
  });

  it("applies a transition to/from null", () => {
    const withTenant = stateWith({ tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" } });
    const cleared = authSliceReducer(withTenant, updateTenant(null));
    expect(cleared).not.toBe(withTenant);
    expect(cleared.tenant).toBeNull();

    const withoutTenant = stateWith({ tenant: null });
    const set = authSliceReducer(
      withoutTenant,
      updateTenant({ slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" }),
    );
    expect(set).not.toBe(withoutTenant);
    expect(set.tenant).toEqual({ slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" });
  });

  it("applies a changed status - this is how a school learns it went live", () => {
    // The guard used to compare slug and name only. That was harmless while
    // those were the only fields, and stopped being harmless the moment status
    // started deciding what a school may open: the /me sync carrying PENDING →
    // ACTIVE would have been dropped here as "the same tenant", leaving the app
    // locked against a school the server had already let in.
    const state = stateWith({
      tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL", status: "PENDING" },
    });
    const next = authSliceReducer(
      state,
      updateTenant({ slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL", status: "ACTIVE" }),
    );

    expect(next).not.toBe(state);
    expect(next.tenant?.status).toBe("ACTIVE");
  });

  it("applies a changed kind", () => {
    const state = stateWith({
      tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" },
    });
    const next = authSliceReducer(
      state,
      updateTenant({ slug: "greenfield", name: "Greenfield Academy", kind: "PLATFORM" }),
    );

    expect(next).not.toBe(state);
    expect(next.tenant?.kind).toBe("PLATFORM");
  });
});

describe("updateSchool", () => {
  const school = {
    id: 2,
    name: "Bright Star Academy",
    slug: "bright-star",
    logo: "https://api.test/media/school_logos/crest-abc123.png",
  };

  it("returns the SAME state reference for an unchanged school", () => {
    const state = stateWith({ school });
    expect(authSliceReducer(state, updateSchool({ ...school }))).toBe(state);
  });

  it("applies a new logo - this is how the shell picks one up", () => {
    const state = stateWith({ school });
    const next = authSliceReducer(
      state,
      updateSchool({ ...school, logo: "https://api.test/media/school_logos/new-def456.png" }),
    );

    expect(next).not.toBe(state);
    expect(next.school?.logo).toContain("new-def456");
  });

  it("applies a cleared logo, so a removal reaches the sidebar", () => {
    const state = stateWith({ school });
    const next = authSliceReducer(state, updateSchool({ ...school, logo: null }));

    expect(next).not.toBe(state);
    expect(next.school?.logo).toBeNull();
  });
});

describe("selectTenantIsPending", () => {
  const rootWith = (tenant: Auth["tenant"]) =>
    ({ auth: stateWith({ tenant }) }) as never;

  it("is true only for a school that has not gone live", () => {
    expect(
      selectTenantIsPending(
        rootWith({ slug: "greenfield", name: "Greenfield", kind: "SCHOOL", status: "PENDING" }),
      ),
    ).toBe(true);
  });

  it("is false for a live school", () => {
    expect(
      selectTenantIsPending(
        rootWith({ slug: "greenfield", name: "Greenfield", kind: "SCHOOL", status: "ACTIVE" }),
      ),
    ).toBe(false);
  });

  it("is false when the session predates the status field", () => {
    // A persisted session from before the backend sent `status` must not lock a
    // working school out of its own app. The server still refuses a pending one.
    expect(
      selectTenantIsPending(
        rootWith({ slug: "greenfield", name: "Greenfield", kind: "SCHOOL" }),
      ),
    ).toBe(false);
    expect(selectTenantIsPending(rootWith(null))).toBe(false);
  });
});

// ── Proxy ("view as another user") ──────────────────────────────────────────

const aUser = (partial: Partial<User> = {}): User =>
  ({
    id: 7,
    uid: "u-7",
    email: "ada@greenfield.test",
    first_name: "Ada",
    last_name: "Obi",
    full_name: "Ada Obi",
    phone: "",
    gender: "",
    role: "school_admin",
    status: "ACTIVE",
    school_id: 1,
    school_name: "Greenfield",
    branch_id: null,
    branch_name: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  }) as User;

describe("setAuthContext", () => {
  it("returns the SAME state reference when /me returns an unchanged context", () => {
    // The hot path: /me re-runs on every focus and its payload is a brand-new
    // object each time. Nothing may re-render.
    const user = aUser();
    const state = stateWith({
      user,
      school: null,
      tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" },
      permissions: ["school.dashboard.view"],
    });
    const next = authSliceReducer(
      state,
      setAuthContext({
        user: aUser(),
        school: null,
        tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" },
        permissions: ["school.dashboard.view"],
      }),
    );

    expect(next).toBe(state);
  });

  it("swaps the whole identity when /me comes back as a different user", () => {
    const state = stateWith({
      user: aUser(),
      tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" },
      permissions: ["school.dashboard.view", "school.impersonation.start"],
    });
    const next = authSliceReducer(
      state,
      setAuthContext({
        user: aUser({ id: 12, full_name: "Ben Musa", email: "ben@greenfield.test", role: "teacher" }),
        school: null,
        tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" },
        permissions: ["academics.classes.view"],
      }),
    );

    expect(next).not.toBe(state);
    expect(next.user?.full_name).toBe("Ben Musa");
    expect(next.permissions).toEqual(["academics.classes.view"]);
    // Same tenant object: school proxying is intra-tenant, so it must not churn.
    expect(next.tenant).toBe(state.tenant);
  });

  it("detects an edit to the same user via updated_at", () => {
    const state = stateWith({ user: aUser() });
    const next = authSliceReducer(
      state,
      setAuthContext({
        user: aUser({ updated_at: "2026-02-02T00:00:00Z" }),
        school: null,
        tenant: null,
        permissions: [],
      }),
    );

    expect(next).not.toBe(state);
    expect(next.user?.updated_at).toBe("2026-02-02T00:00:00Z");
  });
});

describe("selectActorPermissions", () => {
  const impersonation: ActiveImpersonation = {
    id: 42,
    tenantSlug: "greenfield",
    target: {
      id: 12,
      email: "ben@greenfield.test",
      full_name: "Ben Musa",
      tenant_kind: "SCHOOL",
      role: "teacher",
      tenant_slug: "greenfield",
      tenant_name: "Greenfield Academy",
      school_name: "Greenfield",
    },
    actor: {
      user: aUser(),
      school: null,
      tenant: { slug: "greenfield", name: "Greenfield Academy", kind: "SCHOOL" },
      permissions: ["school.impersonation.start", "school.impersonation.end"],
    },
  };

  it("reads the live permissions when no proxy is active", () => {
    const state = stateWith({ permissions: ["school.dashboard.view"] });
    expect(selectActorPermissions({ auth: state } as never)).toEqual([
      "school.dashboard.view",
    ]);
  });

  // The exit affordance is gated on this: while proxying, `permissions` holds
  // the TARGET's keys, so reading them would hide the way out from the admin.
  it("reads the retained ACTOR snapshot while a proxy session is active", () => {
    const state = stateWith({
      permissions: ["academics.classes.view"],
      impersonation,
    });
    expect(selectActorPermissions({ auth: state } as never)).toEqual([
      "school.impersonation.start",
      "school.impersonation.end",
    ]);
  });

  it("falls back to the live permissions once the proxy is cleared", () => {
    const proxying = stateWith({
      permissions: ["academics.classes.view"],
      impersonation,
    });
    const exited = authSliceReducer(proxying, setImpersonation(null));

    expect(exited.impersonation).toBeNull();
    expect(selectActorPermissions({ auth: exited } as never)).toEqual([
      "academics.classes.view",
    ]);
  });
});
