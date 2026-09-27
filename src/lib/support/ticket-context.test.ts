/**
 * The server's rules, restated as tests.
 *
 * Everything in the first block is a direct transcription of what
 * apps/vs_tickets/serializers.py will accept, because the cost of getting it
 * wrong is not a wrong value - it is a 400 on the whole request, from somebody
 * who is filing a ticket precisely because something is already broken.
 */

import { describe, expect, it } from "vitest";
import {
  productAreaFor,
  routePatternFor,
  screenTicketContext,
} from "./ticket-context";
import { Navigate } from "react-router";
import { protectedRoutes } from "@/routes/protected";

type RouteNode = {
  path?: string;
  element?: { type?: unknown };
  children?: readonly RouteNode[];
};

/** Every absolute screen path the router declares; redirects are not screens. */
const mountedPaths = (routes: readonly RouteNode[]): string[] =>
  routes.flatMap((route) => [
    ...(route.path?.startsWith("/") && route.element?.type !== Navigate ? [route.path] : []),
    ...mountedPaths(route.children ?? []),
  ]);
import { routesPath } from "@/routes/routesPath";

// TicketContextSerializer.route_pattern, both halves: the regex, and the
// validate_route_pattern hook that additionally bans digits, "?" and "#".
const SERVER_ACCEPTS = (value: string) =>
  /^\/[a-z0-9_./:-]{0,199}$/.test(value) &&
  !/\d/.test(value) &&
  !value.includes("?") &&
  !value.includes("#");

describe("the route pattern", () => {
  it("takes record ids out, because a ticket is read outside the school", () => {
    // "/students/1042" tells a stranger which child. "/students/:id" tells them
    // which screen, which is the only part they need.
    expect(routePatternFor("/students/1042", { id: "1042" })).toBe("/students/:id");
  });

  it("names the placeholder after the param, in lower case", () => {
    // The server's character class has no uppercase in it, so ":batchId" is
    // refused where ":batchid" is taken.
    expect(
      routePatternFor("/onboarding/import/57/validation", { batchId: "57" }),
    ).toBe("/onboarding/import/:batchid/validation");
  });

  it("replaces the longest id first", () => {
    // A short id that is a prefix of a longer one would otherwise substitute
    // inside it and leave half an id behind, digits and all.
    const pattern = routePatternFor("/a/7/b/72", { one: "7", two: "72" });
    expect(pattern).toBe("/a/:one/b/:two");
    expect(SERVER_ACCEPTS(pattern!)).toBe(true);
  });

  it("leaves a path with no params exactly as it is", () => {
    expect(routePatternFor("/finance/receivables/invoices")).toBe(
      "/finance/receivables/invoices",
    );
  });

  it("does not mistake a name that looks like an id for one", () => {
    // A branch named "block-2" is a name, not a record id. Guessing by shape
    // would mangle it - and the router never called it a param, so nothing here
    // does either. It still cannot be sent, because of the digit.
    expect(routePatternFor("/branches/block-2")).toBeUndefined();
  });

  it("sends nothing rather than something the server would refuse", () => {
    // Each of these breaks one of the server's rules. A refused context fails
    // the whole ticket, so the pattern is dropped and the ticket still goes.
    expect(routePatternFor("/students/1042")).toBeUndefined(); // digit left in
    expect(routePatternFor("/Students", {})).toBeUndefined(); // uppercase
    expect(routePatternFor("/students?tab=all")).toBeUndefined(); // query
    expect(routePatternFor("/students#top")).toBeUndefined(); // fragment
    expect(routePatternFor(`/${"a".repeat(200)}`)).toBeUndefined(); // too long
  });

  it("drops a trailing slash", () => {
    expect(routePatternFor("/students/")).toBe("/students");
    expect(routePatternFor("/")).toBe("/");
  });

  it("never emits anything this app's own routes could not send", () => {
    // Every literal path the app declares, run through the same gate the server
    // applies. A new route with a digit or a capital in it fails here rather
    // than at the moment somebody tries to report a problem with it.
    const literals: string[] = [];
    const walk = (node: unknown) => {
      if (typeof node === "string") {
        if (!node.includes(":")) literals.push(node);
        return;
      }
      if (node && typeof node === "object") Object.values(node).forEach(walk);
    };
    walk(routesPath.PROTECTED);

    for (const path of literals) {
      const pattern = routePatternFor(path.split("?")[0]);
      expect(pattern, `${path} cannot be sent as a route_pattern`).toBeDefined();
      expect(SERVER_ACCEPTS(pattern!), path).toBe(true);
    }
  });
});

describe("the product area", () => {
  it("routes each part of the app to the queue that owns it", () => {
    expect(productAreaFor("/finance/receivables/invoices")).toBe("Finance");
    expect(productAreaFor("/procurement/vendors/vendors")).toBe("Procurement");
    expect(productAreaFor("/students")).toBe("School management");
    expect(productAreaFor("/academic-calendar/events")).toBe("School management");
    expect(productAreaFor("/notifications")).toBe("Notifications");
    expect(productAreaFor("/onboarding")).toBe("Onboarding");
  });

  it("prefers the more specific area", () => {
    // Somebody stuck on who-may-do-what needs the people who own roles, not the
    // people who own setup, even though the screen lives under /onboarding.
    expect(productAreaFor("/onboarding/roles")).toBe("Roles");
    expect(productAreaFor("/onboarding/import")).toBe("Data imports");
  });

  it("matches on whole segments, not on spelling", () => {
    // "/financials" is not Finance, and must not be routed as though it were.
    expect(productAreaFor("/financials")).toBeUndefined();
    expect(productAreaFor("/finance")).toBe("Finance");
  });

  it("says nothing about a screen it does not know", () => {
    expect(productAreaFor("/somewhere-new")).toBeUndefined();
  });

  it("names an area for every screen the router mounts", () => {
    const unrouted = mountedPaths(protectedRoutes as readonly RouteNode[])
      .filter((path) => productAreaFor(path) === undefined);
    expect(unrouted, "mounted screens whose tickets would carry no product area").toEqual([]);
  });
});

describe("what a ticket ends up carrying", () => {
  it("gives both halves when it knows both", () => {
    expect(screenTicketContext("/finance/payroll")).toEqual({
      route_pattern: "/finance/payroll",
      product_area: "Finance",
    });
  });

  it("gives the half it knows", () => {
    // An unmapped screen still says where it was.
    expect(screenTicketContext("/somewhere-new")).toEqual({
      route_pattern: "/somewhere-new",
    });
  });

  it("gives nothing rather than something unsendable", () => {
    expect(screenTicketContext("/Somewhere")).toEqual({});
  });
});
