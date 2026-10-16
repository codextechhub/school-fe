import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "./index";

/**
 * The pupil portal's school end: giving pupils access, and posting notices.
 *
 * A code with no mapping resolves to "" and its screen gates on nothing a
 * school can hold, so the Portal access controls and the Notices screens would
 * be missing for every school entitled to them. These assertions keep each
 * code naming the key the server checks.
 */
describe("pupil portal keys", () => {
  it("resolves giving portal access", () => {
    expect(resolvePermissionKey(P.GIVE_PORTAL_ACCESS)).toBe("school.portal_access.issue");
  });

  it("resolves the three notice keys, each to its own key", () => {
    expect(resolvePermissionKey(P.BROWSE_NOTICES)).toBe("school.notices.view");
    expect(resolvePermissionKey(P.POST_NOTICES)).toBe("school.notices.post");
    expect(resolvePermissionKey(P.POST_CLASS_NOTICES)).toBe("school.class_notices.post");
  });
});
