import { describe, expect, it } from "vitest";

import { P, resolvePermissionKey } from "./index";

/**
 * The gradebook keys the backend seeds, pinned to the codes the screens gate
 * on. `usePermissions` answers false for a code it cannot resolve, so a key
 * missing here hides a screen from every role that holds it, with nothing
 * failing anywhere else.
 */
describe("Gradebook permission registry", () => {
  it("resolves the sheet and hub keys", () => {
    expect(resolvePermissionKey(P.VIEW_RESULTS_HUB)).toBe("gradebook.hub.view");
    expect(resolvePermissionKey(P.VIEW_SCORE_SHEETS)).toBe("gradebook.sheet.view");
    expect(resolvePermissionKey(P.ENTER_OWN_SCORES)).toBe("gradebook.sheet.enter");
    expect(resolvePermissionKey(P.ENTER_ANY_SCORES)).toBe("gradebook.sheet.enter_any");
    expect(resolvePermissionKey(P.REMIND_SUBJECT_TEACHER)).toBe("gradebook.sheet.remind");
    expect(resolvePermissionKey(P.UPLOAD_SCORES)).toBe("gradebook.sheet.import");
  });

  it("resolves the moderation, class, hold and release keys", () => {
    expect(resolvePermissionKey(P.MODERATE_SHEETS)).toBe("gradebook.moderation.approve");
    expect(resolvePermissionKey(P.SUBMIT_CLASS_RESULTS)).toBe("gradebook.class.submit");
    expect(resolvePermissionKey(P.PUBLISH_RESULTS)).toBe("gradebook.class.publish");
    expect(resolvePermissionKey(P.VIEW_RESULT_HOLDS)).toBe("gradebook.hold.view");
    expect(resolvePermissionKey(P.MANAGE_RESULT_HOLDS)).toBe("gradebook.hold.update");
    expect(resolvePermissionKey(P.VIEW_RELEASE)).toBe("gradebook.release.view");
    expect(resolvePermissionKey(P.VIEW_STUDENT_RESULTS)).toBe("gradebook.result.view");
  });

  it("resolves the setup, amendment and analytics keys", () => {
    expect(resolvePermissionKey(P.VIEW_ASSESSMENT_SETUP)).toBe("gradebook.setup.view");
    expect(resolvePermissionKey(P.MANAGE_ASSESSMENT_SETUP)).toBe("gradebook.setup.update");
    expect(resolvePermissionKey(P.RAISE_AMENDMENT)).toBe("gradebook.amendment.create");
    expect(resolvePermissionKey(P.DECIDE_AMENDMENT)).toBe("gradebook.amendment.approve");
    expect(resolvePermissionKey(P.VIEW_RESULT_ANALYTICS)).toBe("gradebook.analytics.view");
    expect(resolvePermissionKey(P.EXPORT_RESULT_ANALYTICS)).toBe("gradebook.analytics.export");
  });

  it("resolves the who-takes-what keys under academics", () => {
    expect(resolvePermissionKey(P.VIEW_ELECTIVE_TAKERS)).toBe("academics.electives.view");
    expect(resolvePermissionKey(P.SET_ELECTIVE_TAKERS)).toBe("academics.electives.update");
  });

  it("keeps entering your own sheet apart from entering any sheet", () => {
    // The backend grants `enter` to teachers and `enter_any` to nobody by
    // default. One code for both would let every teacher enter every sheet.
    expect(resolvePermissionKey(P.ENTER_OWN_SCORES)).not.toBe(
      resolvePermissionKey(P.ENTER_ANY_SCORES),
    );
  });
});
