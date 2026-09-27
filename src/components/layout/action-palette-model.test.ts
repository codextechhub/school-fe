/**
 * The palette's rules, tested where they can be wrong.
 *
 * Three things here are load-bearing and none of them is about wording:
 *   - a pending school must never be offered a screen that answers it the
 *     "opens at go-live" wall;
 *   - Get Help must survive go-live, because a support form that vanishes when
 *     a school starts trading is a defect, not a rule;
 *   - popularity must never promote a weak match over a strong one, which is
 *     the one guarantee that stops a learned palette from becoming unusable.
 */

import { describe, expect, it } from "vitest";
import { capabilityForPath } from "@/lib/action-palette/plan";
import { P, resolvePermissionKey } from "@/permissions";
import {
  ACTIONS,
  LIVE_ONLY_ACTION_IDS,
  PENDING_ONLY_ACTION_IDS,
  type ActionDef,
  type ActionSection,
  type PopularityModel,
  type ScoredAction,
} from "@/lib/action-palette";
import {
  availableActions,
  buildPaletteView,
  COLLAPSED_COUNT,
  isAvailableAtReadiness,
  rankActions,
  rankDefaultActions,
} from "./action-palette-model";

// A user who holds every key in the registry, so these tests isolate the
// readiness and ranking rules from the permission rule (gate.ts owns that one).
const ALL_PERMISSIONS = Object.values(P).map(resolvePermissionKey);

const ids = (actions: readonly { id: string }[]) => actions.map((a) => a.id);
const rankedIds = (results: readonly { action: ActionDef }[]) =>
  results.map((r) => r.action.id);

const noPopularity: PopularityModel = { scoreFor: () => 0 };
const popularityFor = (scores: Record<string, number>): PopularityModel => ({
  scoreFor: (actionId) => scores[actionId] ?? 0,
});

describe("readiness filtering", () => {
  it("hides every live-only action while the tenant is pending", () => {
    const offered = ids(
      availableActions(
        ACTIONS,
        { permissions: ALL_PERMISSIONS, actorPermissions: ALL_PERMISSIONS },
        true,
      ),
    );
    for (const id of LIVE_ONLY_ACTION_IDS) {
      expect(offered, `${id} must not be offered to a pending school`).not.toContain(id);
    }
    // The onboarding half is exactly what remains, so a pending school is not
    // left with an empty palette.
    expect(offered).toContain("view-control-room");
    expect(offered).toContain("upload-datasets");
  });

  it("offers the live actions and hides the onboarding ones once live", () => {
    const offered = ids(
      availableActions(
        ACTIONS,
        { permissions: ALL_PERMISSIONS, actorPermissions: ALL_PERMISSIONS },
        false,
      ),
    );
    for (const id of LIVE_ONLY_ACTION_IDS) {
      expect(offered, `${id} must be offered to a live school`).toContain(id);
    }
    for (const id of PENDING_ONLY_ACTION_IDS) {
      if (id === "get-help") continue;
      expect(offered, `${id} must not be offered to a live school`).not.toContain(id);
    }
  });

  it("keeps Get Help reachable in both states", () => {
    expect(isAvailableAtReadiness("get-help", true)).toBe(true);
    expect(isAvailableAtReadiness("get-help", false)).toBe(true);
    for (const pending of [true, false]) {
      const offered = ids(
        availableActions(
          ACTIONS,
          { permissions: ALL_PERMISSIONS, actorPermissions: ALL_PERMISSIONS },
          pending,
        ),
      );
      expect(offered, `pending=${pending}`).toContain("get-help");
    }
  });

  it("keeps the account actions out of the readiness rules entirely", () => {
    // Logging out of a pending school has to work, and so does logging out of
    // a live one: neither list may ever swallow the Account section.
    for (const pending of [true, false]) {
      const offered = ids(
        availableActions(
          ACTIONS,
          { permissions: ALL_PERMISSIONS, actorPermissions: ALL_PERMISSIONS },
          pending,
        ),
      );
      expect(offered, `pending=${pending}`).toContain("logout");
      expect(offered, `pending=${pending}`).toContain("proxy-user");
    }
  });
});

describe("gating the account commands against the actor", () => {
  // During a proxy session `permissions` holds the TARGET's keys. Gating the
  // proxy action on those would delete it from the palette at the exact moment
  // the admin wants to hop to a third account - the same trap the header's
  // account menu avoids by reading selectActorPermissions.
  const proxyKey = resolvePermissionKey(P.START_PROXY_SESSION);
  const targetPermissions = ALL_PERMISSIONS.filter((key) => key !== proxyKey);

  it("keeps Proxy user while the actor holds the key and the target does not", () => {
    const offered = ids(
      availableActions(
        ACTIONS,
        { permissions: targetPermissions, actorPermissions: ALL_PERMISSIONS },
        false,
      ),
    );
    expect(offered).toContain("proxy-user");
  });

  it("hides Proxy user when the actor does not hold the key", () => {
    const offered = ids(
      availableActions(
        ACTIONS,
        { permissions: ALL_PERMISSIONS, actorPermissions: targetPermissions },
        false,
      ),
    );
    expect(offered).not.toContain("proxy-user");
  });

  it("judges navigation by the identity in effect, not by the actor", () => {
    // The reverse of the rule above: while proxying as someone who cannot see
    // classes, the palette must not offer classes just because the actor can.
    const withoutClasses = ALL_PERMISSIONS.filter(
      (key) => key !== resolvePermissionKey(P.BROWSE_CLASSES),
    );
    const offered = ids(
      availableActions(
        ACTIONS,
        { permissions: withoutClasses, actorPermissions: ALL_PERMISSIONS },
        false,
      ),
    );
    expect(offered).not.toContain("view-classes");
  });
});

describe("ranking order", () => {
  // Fixtures, not the real registry: this block tests the ORDER rule, and a
  // test that goes red because someone reworded "View classes" is a test that
  // gets deleted. The shapes are chosen so the tiers are unambiguous.
  const fixture = (id: string, label: string): ActionDef => ({
    id,
    label,
    aliases: [],
    section: "Overview",
    group: "Overview",
    kind: "view",
    gate: null,
    run: { to: `/${id}` },
  });
  // For the query "view alpha": an exact label hit, versus a hit that only
  // matches by skipping a word (the weakest tier that still matches).
  const strong = fixture("strong", "View alpha");
  const weak = fixture("weak", "View beta alpha reports");
  const pair = [strong, weak];

  it("puts a tier ahead of popularity, however popular the weak match is", () => {
    const query = "view alpha";
    const plain = rankActions(pair, query, noPopularity);
    expect(rankedIds(plain)).toEqual(["strong", "weak"]);
    expect(plain[0].tier).toBeGreaterThan(plain[1].tier);

    // Hand the weak match a learned score no real user could ever reach. It
    // must still not overtake the stronger match: popularity reorders within
    // a tier and never across one.
    const skewed = rankActions(pair, query, popularityFor({ weak: 1_000_000 }));
    expect(rankedIds(skewed)).toEqual(["strong", "weak"]);
  });

  it("lets popularity reorder inside a tier", () => {
    // "view" is a prefix of both labels, so both land in the same tier and
    // popularity is free to decide between them.
    const query = "view";
    const plain = rankActions(pair, query, noPopularity);
    expect(plain[0].tier).toBe(plain[1].tier);

    const learned = rankActions(pair, query, popularityFor({ weak: 500 }));
    expect(rankedIds(learned)).toEqual(["weak", "strong"]);
    expect(learned[0].tier).toBe(plain[0].tier);
  });

  it("is deterministic when tier, popularity and match strength all tie", () => {
    // Same tier, same length, so the same match score: only the label breaks
    // the tie, and it must break it the same way whatever order they arrive in.
    const twins = [fixture("gamma", "View gamma"), fixture("delta", "View delta")];
    expect(rankedIds(rankActions(twins, "view", noPopularity))).toEqual(["delta", "gamma"]);
    expect(rankedIds(rankActions([...twins].reverse(), "view", noPopularity))).toEqual([
      "delta",
      "gamma",
    ]);
  });

  it("returns nothing for an empty query", () => {
    expect(rankActions(pair, "   ", noPopularity)).toEqual([]);
  });
});

describe("the empty-query list", () => {
  const live = availableActions(
    ACTIONS,
    { permissions: ALL_PERMISSIONS, actorPermissions: ALL_PERMISSIONS },
    false,
  );

  it("falls back to registry order when the user has no history", () => {
    expect(rankedIds(rankDefaultActions(live, {}))).toEqual(ids(live));
  });

  it("floats the most-used actions to the top", () => {
    const last = live[live.length - 1].id;
    const middle = live[Math.floor(live.length / 2)].id;
    const ordered = rankedIds(rankDefaultActions(live, { [last]: 9, [middle]: 4 }));
    expect(ordered.slice(0, 2)).toEqual([last, middle]);
  });

  it("only ever offers what the readiness filter left", () => {
    const pending = availableActions(
      ACTIONS,
      { permissions: ALL_PERMISSIONS, actorPermissions: ALL_PERMISSIONS },
      true,
    );
    // A learned score for a live-only action must not resurrect it: the school
    // that used View students before a data reset still cannot open it now.
    const ordered = rankedIds(rankDefaultActions(pending, { "view-students": 999 }));
    expect(ordered).not.toContain("view-students");
  });
});

describe("the dropdown's rows", () => {
  // The one thing that can be wrong here: the flat row order the arrow keys
  // walk drifting away from the order the rows are drawn in. Expanding
  // regroups the list, so that is where a drift would appear first.
  const fixture = (id: string, section: ActionSection): ActionDef => ({
    id,
    label: `View ${id}`,
    aliases: [],
    section,
    group: section,
    kind: "view",
    gate: null,
    run: { to: `/${id}` },
  });
  const scored = (actions: ActionDef[]): ScoredAction[] =>
    actions.map((action) => ({ action, tier: 1, popularity: 0, matchScore: 1 }));

  it("shows the top few and a show-all row when there are more", () => {
    const many = scored(
      Array.from({ length: COLLAPSED_COUNT + 3 }, (_, i) => fixture(`a${i}`, "Overview")),
    );
    const view = buildPaletteView(many, false);
    expect(view.total).toBe(COLLAPSED_COUNT + 3);
    expect(view.truncated).toBe(true);
    expect(view.groups).toBeNull();
    // COLLAPSED_COUNT actions, then the show-all row LAST so ArrowDown reaches
    // it after the results rather than before them.
    expect(view.rows).toHaveLength(COLLAPSED_COUNT + 1);
    expect(view.rows[view.rows.length - 1]).toEqual({ kind: "show-all" });
  });

  it("has no show-all row when everything already fits", () => {
    const few = scored([fixture("one", "Overview"), fixture("two", "People")]);
    const view = buildPaletteView(few, false);
    expect(view.truncated).toBe(false);
    expect(view.rows.map((row) => row.kind)).toEqual(["action", "action"]);
  });

  it("walks the expanded rows in the order the section headers draw them", () => {
    // Relevance order puts Finance first; SECTION_ORDER puts People before it,
    // so the expanded row order must follow the headers, not the ranking.
    const results = scored([
      fixture("fees", "Finance"),
      fixture("pupils", "People"),
      fixture("terms", "Academics"),
      fixture("staff", "People"),
    ]);
    const view = buildPaletteView(results, true);
    expect(view.truncated).toBe(false);
    expect(view.groups?.map((group) => group.section)).toEqual([
      "People",
      "Academics",
      "Finance",
    ]);
    const drawn = view.groups?.flatMap((group) => group.items.map((item) => item.action.id));
    const walked = view.rows.flatMap((row) => (row.kind === "action" ? [row.result.action.id] : []));
    expect(walked).toEqual(drawn);
    expect(walked).toEqual(["pupils", "staff", "terms", "fees"]);
  });
});

describe("plan filtering", () => {
  const everyone = { permissions: ALL_PERMISSIONS, actorPermissions: ALL_PERMISSIONS };
  // A school on the basic plan: every core module and none of the add-ons.
  const basic = (key: string | undefined) =>
    !key || ["students", "teachers", "calendar"].includes(key);

  it("hides actions whose address needs a module the school has not bought", () => {
    const offered = availableActions(ACTIONS, everyone, false, basic);
    for (const action of offered) {
      if ("command" in action.run) continue;
      const needs = capabilityForPath(action.run.to);
      expect(basic(needs), `${action.id} needs ${needs}`).toBe(true);
    }
    const offeredIds = ids(offered);
    expect(offeredIds).not.toContain("view-payroll-settings");
    expect(offeredIds).toContain("view-school-settings");
    expect(offeredIds).toContain("view-admission-number-settings");
  });

  it("offers everything the role allows when the plan is not known", () => {
    expect(availableActions(ACTIONS, everyone, false)).toEqual(
      availableActions(ACTIONS, everyone, false, () => true),
    );
  });

  it("never plan-gates a header command", () => {
    const offered = ids(availableActions(ACTIONS, everyone, false, (key) => !key));
    expect(offered).toContain("get-help");
  });
});
