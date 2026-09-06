/**
 * Registry shape, not registry vocabulary.
 *
 * These tests do NOT assert that a particular action exists or is worded a
 * particular way: rewording "View students" must not turn a test red. They
 * assert the four things that make an entry safe to ship, each of which is a
 * real failure mode rather than a style rule:
 *   - a duplicated or renamed id silently resets a user's learned ranking,
 *     because the id is the popularity storage key;
 *   - a `to` that no route serves is a palette row that lands on nothing;
 *   - a gate naming a code the permission registry does not resolve denies
 *     everybody (see the `holds` helper in gate.ts), so the action vanishes;
 *   - two identical labels are two indistinguishable rows.
 */

import { describe, expect, it } from "vitest";
import { P, resolvePermissionKey, type PermissionCode } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import { academicRoutes } from "@/routes/protected/academic-routes";
import { branchesRoutes } from "@/routes/protected/branches-routes";
import { classesRoutes } from "@/routes/protected/classes-routes";
import { onboardingRoutes, onboardingWelcomeRoute } from "@/routes/protected/onboarding-routes";
import { overviewRoutes } from "@/routes/protected/overview-routes";
import { staffRoutes } from "@/routes/protected/staff-routes";
import { studentsRoutes } from "@/routes/protected/students-routes";
import { supportRoutes } from "@/routes/protected/support-routes";
import { financeRoutes, FINANCE_MOUNTED_PATHS } from "@/routes/protected/finance-routes";
import {
  procurementRoutes,
  PROCUREMENT_MOUNTED_PATHS,
} from "@/routes/protected/procurement-routes";
import {
  ACTIONS,
  LIVE_ONLY_ACTION_IDS,
  PENDING_ONLY_ACTION_IDS,
  pathOpensBeforeGoLive,
} from "./registry";
import type { ActionDef } from "./types";

/**
 * The paths the router genuinely mounts. Taken from the route modules rather
 * than from routesPath, because the two can drift: a path can be named without
 * anything mounting it, which is exactly how /school-fees and /settings sat in
 * the sidebar pointing at "#" until the stubs were removed.
 * Every one of these modules is import-cheap (lazy() page imports plus
 * type-only handles), so pulling them in costs no page bundle.
 *
 * The protected route barrel is deliberately NOT imported: it pulls in
 * DashboardLayout eagerly, and with it the whole shell.
 */
const SERVED_PATHS = new Set([
  ...[
    onboardingWelcomeRoute,
    ...onboardingRoutes,
    ...overviewRoutes,
    ...branchesRoutes,
    ...academicRoutes,
    ...classesRoutes,
    ...studentsRoutes,
    ...staffRoutes,
    ...supportRoutes,
  ]
    .map((route) => route.path)
    .filter((path): path is string => typeof path === "string"),
  // The two consoles mount one path per real section under a single parent, so
  // their paths live in the sets the route tables build for the sidebar rather
  // than at the top level of the array.
  ...FINANCE_MOUNTED_PATHS,
  ...PROCUREMENT_MOUNTED_PATHS,
]);

/**
 * Which screens a school may open before go-live, straight off the route
 * handles. DashboardLayout closes a page when
 * `tenantIsPending && !onboardingRoute && !pendingSurface`, so those two flags
 * ARE the rule; the palette keeps its own prefix list and these tests are what
 * stop the two from drifting.
 *
 * Handles are inherited: the finance and procurement children sit under one
 * parent that carries the handle for all of them, exactly as DashboardLayout
 * merges `useMatches()` from the root down.
 */
interface RouteLike {
  path?: string;
  handle?: { pendingSurface?: boolean; onboarding?: boolean };
  children?: RouteLike[];
}

function collectHandles(
  routes: RouteLike[],
  inherited: RouteLike["handle"] = {},
  into: Map<string, NonNullable<RouteLike["handle"]>> = new Map(),
): Map<string, NonNullable<RouteLike["handle"]>> {
  for (const route of routes) {
    const merged = { ...inherited, ...(route.handle ?? {}) };
    if (typeof route.path === "string") into.set(route.path, merged);
    if (route.children) collectHandles(route.children, merged, into);
  }
  return into;
}

/**
 * `onboardingWelcomeRoute` is deliberately absent. It is mounted as a SIBLING
 * of the layout route rather than a child, so it has no shell and the closed
 * wall cannot be drawn over it - the handle flags say nothing about it because
 * there is nothing for them to say. It is still a served path; it is just not
 * somewhere the go-live rule applies.
 */
const ROUTE_HANDLES = collectHandles([
  ...onboardingRoutes,
  ...overviewRoutes,
  ...branchesRoutes,
  ...academicRoutes,
  ...classesRoutes,
  ...studentsRoutes,
  ...supportRoutes,
  ...financeRoutes,
  ...procurementRoutes,
] as RouteLike[]);

const routeOpensBeforeGoLive = (path: string): boolean => {
  const handle = ROUTE_HANDLES.get(path);
  return !!(handle?.pendingSurface || handle?.onboarding);
};

/**
 * The old addresses `redirects()` still answers. `pendingSurface` on a redirect
 * is not a statement about a screen - it is what stops the layout answering
 * before the redirect runs - so they are nobody's destination and sit outside
 * this agreement. A new redirect appearing should fail here and be added
 * deliberately, not slip through.
 */
const LEGACY_REDIRECTS = new Set([
  "/academic",
  "/academic/session",
  "/academic/calender",
  "/classes",
]);

/**
 * Every literal path routesPath declares, so an action's `to` can be traced
 * back to the path table as well as to the router. Path *builders* (functions)
 * and their `:param` templates are skipped: no palette action can navigate to
 * one without an id it has no way to know.
 */
function literalPaths(node: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof node === "string") {
    if (!node.includes(":")) out.add(node);
    return out;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) literalPaths(value, out);
  }
  return out;
}
const DECLARED_PATHS = literalPaths(routesPath);

const PERMISSION_CODES = new Set<string>(Object.values(P));

// "/onboarding/roles?tab=invitations" is served by "/onboarding/roles"; the
// query string picks the tab.
const pathOf = (to: string): string => to.split("?")[0];

function gateCodes(action: ActionDef): PermissionCode[] {
  const gate = action.gate;
  if (gate === null) return [];
  if ("perm" in gate) return [gate.perm];
  if ("any" in gate) return gate.any;
  if ("all" in gate) return gate.all;
  return [];
}

const navActions = ACTIONS.filter(
  (action): action is ActionDef & { run: { to: string } } => "to" in action.run,
);

const isConsolePath = (to: string): boolean =>
  to.startsWith("/finance") || to.startsWith("/procurement");

/**
 * This app's screens that answer `?action=new` by opening their create drawer.
 * Kept here rather than inferred, because the only honest way to infer it is to
 * render each screen; what this catches is the half-done edit - an action added
 * with no landing hook wired, which looks like a palette row that does nothing.
 */
const SCREENS_WITH_CREATE_LANDING = [
  routesPath.PROTECTED.ACADEMIC_STRUCTURE.DEPARTMENTS,
  routesPath.PROTECTED.ACADEMIC_STRUCTURE.PROGRAMS,
  routesPath.PROTECTED.ACADEMIC_STRUCTURE.SUBJECTS,
  routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASSES,
  routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS,
  routesPath.PROTECTED.ACADEMIC_CALENDAR.EVENTS,
  routesPath.PROTECTED.TIMETABLES.ROOMS,
  routesPath.PROTECTED.TIMETABLES.BELL_SCHEDULE,
];

describe("action registry shape", () => {
  it("is a non-empty list", () => {
    expect(ACTIONS.length).toBeGreaterThan(0);
  });

  it("gives every action a unique id", () => {
    const ids = ACTIONS.map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("writes every id in kebab-case", () => {
    for (const action of ACTIONS) {
      expect(action.id, action.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("gives every action a distinct label", () => {
    const labels = ACTIONS.map((action) => action.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("never repeats an alias inside one action, or repeats its own label", () => {
    for (const action of ACTIONS) {
      const aliases = action.aliases.map((alias) => alias.toLowerCase());
      expect(new Set(aliases).size, action.id).toBe(aliases.length);
      expect(aliases, action.id).not.toContain(action.label.toLowerCase());
    }
  });

  it("leaves no label or alias blank", () => {
    for (const action of ACTIONS) {
      expect(action.label.trim(), action.id).not.toBe("");
      for (const alias of action.aliases) {
        expect(alias.trim(), action.id).not.toBe("");
      }
    }
  });
});

describe("action registry destinations", () => {
  it("navigates only to paths the router actually mounts", () => {
    for (const action of navActions) {
      expect(SERVED_PATHS.has(pathOf(action.run.to)), action.id).toBe(true);
    }
  });

  it("navigates only to paths routesPath declares", () => {
    for (const action of navActions) {
      // Finance and Procurement are excluded on purpose. routesPath names each
      // console's top-level screens, but a section path
      // ("/finance/receivables/invoices") is built by the route table from the
      // package's own section lists and never written down here. Their
      // guarantee is the stronger one anyway: those actions are derived FROM
      // the mounted paths, so the test above is the whole check.
      if (isConsolePath(action.run.to)) continue;
      // The path, not the whole string: a `do` action carries a landing param
      // ("?action=new") that no path table would ever name. The param is
      // checked separately below.
      expect(DECLARED_PATHS.has(pathOf(action.run.to)), action.id).toBe(true);
    }
  });

  it("asks for a landing the app knows how to answer", () => {
    // A query string on an action is an instruction to the screen it lands on,
    // and the only instructions any screen listens for are these two - `action`
    // through useActionParam, `tab` on the roles screen. A row carrying
    // anything else silently does nothing on arrival, which reads to the person
    // who picked it as the palette being broken.
    for (const action of navActions) {
      const query = action.run.to.split("?")[1];
      if (!query) continue;
      for (const key of new URLSearchParams(query).keys()) {
        expect(["action", "tab"], `${action.id} -> ?${key}`).toContain(key);
      }
    }
  });

  it("only asks a screen to create when the screen can be asked", () => {
    // Every "?action=new" row needs a landing hook on the other end, or picking
    // it opens the list screen and nothing else happens. This pins the two
    // together: the screens wired with useActionParam, and the actions that
    // navigate to them.
    const wired = new Set(
      SCREENS_WITH_CREATE_LANDING.map((path) => path),
    );
    for (const action of navActions) {
      if (!action.run.to.includes("action=new")) continue;
      if (isConsolePath(action.run.to)) continue;
      expect(wired.has(pathOf(action.run.to)), action.id).toBe(true);
    }
  });

  it("never points at a placeholder or a parameterised path", () => {
    for (const action of navActions) {
      expect(action.run.to, action.id).toMatch(/^\//);
      expect(action.run.to, action.id).not.toContain(":");
      expect(action.run.to, action.id).not.toBe("#");
    }
  });

  it("runs only the commands the header can carry out", () => {
    for (const action of ACTIONS) {
      if ("to" in action.run) continue;
      expect(["proxy", "logout", "help"], action.id).toContain(action.run.command);
    }
  });
});

describe("action registry gates", () => {
  it("names only codes the permission registry knows", () => {
    for (const action of ACTIONS) {
      for (const code of gateCodes(action)) {
        expect(PERMISSION_CODES.has(code), `${action.id} -> ${code}`).toBe(true);
      }
    }
  });

  it("names only codes that resolve to a backend key", () => {
    // gate.ts denies an unresolvable code, so this failing would mean an action
    // silently hidden from every user rather than a loud error.
    for (const action of ACTIONS) {
      for (const code of gateCodes(action)) {
        expect(resolvePermissionKey(code), `${action.id} -> ${code}`).not.toBe("");
      }
    }
  });

  it("never leaves a permission list empty", () => {
    for (const action of ACTIONS) {
      const gate = action.gate;
      if (gate === null) continue;
      if ("any" in gate) expect(gate.any.length, action.id).toBeGreaterThan(0);
      if ("all" in gate) expect(gate.all.length, action.id).toBeGreaterThan(0);
      if ("module" in gate) expect(gate.module.length, action.id).toBeGreaterThan(0);
    }
  });
});

describe("readiness lists", () => {
  const ids = new Set(ACTIONS.map((action) => action.id));

  it("names only actions that exist", () => {
    for (const id of [...LIVE_ONLY_ACTION_IDS, ...PENDING_ONLY_ACTION_IDS]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("never puts one action in both", () => {
    const live = new Set(LIVE_ONLY_ACTION_IDS);
    for (const id of PENDING_ONLY_ACTION_IDS) {
      expect(live.has(id), id).toBe(false);
    }
  });

  it("closes exactly what the router closes", () => {
    // The failure this catches, in the direction that hurt: Sessions & Terms
    // carries `pendingSurface: true` because a school cannot go live without
    // building its academic structure, and the hand-written list called it
    // live-only. Corona Secondary, still onboarding, typed "sessions" into the
    // search box and got nothing back, while the sidebar three inches to the
    // left was offering the same screen.
    const live = new Set(LIVE_ONLY_ACTION_IDS);
    for (const action of navActions) {
      const path = pathOf(action.run.to);
      expect(!live.has(action.id), `${action.id} -> ${path}`).toBe(
        routeOpensBeforeGoLive(path),
      );
    }
  });

  it("agrees with every route handle, not just the ones an action points at", () => {
    // The reverse direction, so a screen mounted as a pending surface is caught
    // before anybody gives it a palette row.
    for (const [path, handle] of ROUTE_HANDLES) {
      if (path.includes(":") || LEGACY_REDIRECTS.has(path)) continue;
      expect(pathOpensBeforeGoLive(path), path).toBe(
        !!(handle.pendingSurface || handle.onboarding),
      );
    }
  });
});
