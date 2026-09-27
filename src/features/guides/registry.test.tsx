/**
 * Is every guide sound, and does every screen have one?
 *
 * The registry is written by hand in twelve files, so these checks are what
 * keep it honest: a guide naming a screen that is not mounted, gated on a
 * permission that resolves to nothing, or listing a contents entry its article
 * does not have, fails here with the guide's id in the message.
 *
 * The coverage check works the other way round. It walks the router, so a
 * screen mounted without a guide fails with the path that has none.
 */
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Navigate } from "react-router";
import { describe, expect, it } from "vitest";

import { ACTIONS } from "@/lib/action-palette/registry";
import { resolvePermissionKey } from "@/permissions";
import { authRoutes } from "@/routes/auth";
import { protectedRoutes } from "@/routes/protected";

import { GUIDE_REGISTRY } from "./registry";
import { GUIDE_COVERAGE_ROUTE_PATTERNS, GUIDE_ROUTE_PATTERN_SET } from "./route-catalog";
import { validateGuideRegistry } from "./validate";

type RouteNode = {
  path?: string;
  index?: boolean;
  element?: { type?: unknown };
  children?: readonly RouteNode[];
};

/** Mounted screen patterns, joined to their parents, redirects left out. */
function screenPaths(routes: readonly RouteNode[], parent = ""): string[] {
  return routes.flatMap((route) => {
    const joined = route.path === undefined
      ? parent
      : route.path.startsWith("/") ? route.path : `${parent.replace(/\/$/, "")}/${route.path}`;
    const isRedirect = route.element?.type === Navigate;
    const own = !isRedirect && (route.path !== undefined || route.index) && joined ? [joined] : [];
    return [...own, ...screenPaths(route.children ?? [], joined)];
  });
}

const mounted = new Set([
  ...screenPaths(protectedRoutes as readonly RouteNode[]),
  ...screenPaths(authRoutes as readonly RouteNode[]),
]);

describe("the guide registry", () => {
  it("passes validation", () => {
    const issues = validateGuideRegistry(GUIDE_REGISTRY, {
      validActionIds: new Set(ACTIONS.map((action) => action.id)),
    });
    expect(issues.map((issue) => `${issue.guideId}: ${issue.message}`)).toEqual([]);
  });

  it("gates every guide on permissions that exist", () => {
    const unresolved = GUIDE_REGISTRY.flatMap((guide) => (
      guide.access.permissions
        .filter((code) => !resolvePermissionKey(code))
        .map((code) => `${guide.id}: code ${code} resolves to no permission key`)
    ));
    expect(unresolved).toEqual([]);
  });

  it("opens every primary route without an id to fill in", () => {
    const withParams = GUIDE_REGISTRY
      .filter((guide) => guide.primaryRoute?.includes(":"))
      .map((guide) => `${guide.id}: ${guide.primaryRoute}`);
    expect(withParams).toEqual([]);
  });
});

describe("every guide article", () => {
  const published = GUIDE_REGISTRY.filter((guide) => guide.status === "published");

  it.each(published.map((guide) => [guide.id, guide] as const))(
    "%s lists exactly the sections its article renders",
    async (_id, guide) => {
      const module = await guide.article!();
      const html = renderToStaticMarkup(
        createElement(MemoryRouter, null, createElement(module.default as ComponentType)),
      );
      const rendered = [...html.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]);
      expect(rendered).toEqual((guide.sections ?? []).map((section) => section.id));
    },
  );

  it.each(published.map((guide) => [guide.id, guide] as const))(
    "%s follows the house vocabulary",
    async (_id, guide) => {
      const module = await guide.article!();
      const text = [
        renderToStaticMarkup(
          createElement(MemoryRouter, null, createElement(module.default as ComponentType)),
        ),
        guide.title,
        guide.summary,
        ...guide.tags,
        ...guide.aliases,
      ].join(" ");
      expect(text.includes("—"), "an em dash").toBe(false);
      expect(/campus/i.test(text), "\"campus\" where a branch is meant").toBe(false);
      expect(/\bConsole\b/.test(text), "\"Console\", which school users do not have").toBe(false);
    },
  );
});

describe("the route catalogue", () => {
  it("names every screen the router mounts", () => {
    const missing = [...mounted].filter((path) => !GUIDE_ROUTE_PATTERN_SET.has(path));
    expect(missing, "mounted but not in route-catalog.ts").toEqual([]);
  });

  it("names no screen the router does not mount", () => {
    const stale = [...GUIDE_ROUTE_PATTERN_SET].filter((path) => !mounted.has(path));
    expect(stale, "in route-catalog.ts but not mounted").toEqual([]);
  });
});

describe("guide coverage", () => {
  it("gives every screen at least one published guide", () => {
    const covered = new Set(
      GUIDE_REGISTRY
        .filter((guide) => guide.status === "published")
        .flatMap((guide) => guide.routes),
    );
    const uncovered = GUIDE_COVERAGE_ROUTE_PATTERNS.filter((route) => !covered.has(route));
    expect(uncovered, "screens no published guide names in its routes").toEqual([]);
  });
});
