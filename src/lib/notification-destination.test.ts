import { describe, expect, it } from "vitest";

import { canOpenNotification } from "./notification-destination";

/**
 * The bell's own reason for existing: a notification that reports an outcome
 * has to be able to reach it, and one that names a screen belonging to the
 * other product must not strand the reader on a 404.
 */
describe("canOpenNotification", () => {
  it("opens a finished import on the batch it finished", () => {
    // The address vs_notifications/services/routing.py writes for a completed
    // import job. If this ever stops matching, the bell goes quiet again.
    expect(
      canOpenNotification("/data-imports/batches/7f3c9e10-0000-4000-8000-000000000001/view"),
    ).toBe(true);
  });

  it("opens the screens a school actually has", () => {
    for (const url of [
      "/onboarding/profile",
      "/data-imports/batches",
      "/export/files",
      "/workflow/approvals",
      "/finance/receivables/invoices",
    ]) {
      expect(canOpenNotification(url), url).toBe(true);
    }
  });

  it("refuses a console screen this app does not serve", () => {
    // Both are real addresses in console-fe and the server writes them for
    // platform events, so a school does receive them.
    for (const url of ["/team-management", "/me/security"]) {
      expect(canOpenNotification(url), url).toBe(false);
    }
  });

  it("treats an empty or relative action_url as unopenable", () => {
    for (const url of ["", "   ", "data-imports/batches", "https://example.com/x"]) {
      expect(canOpenNotification(url), JSON.stringify(url)).toBe(false);
    }
  });

  it("ignores a query string, which narrows a screen rather than naming one", () => {
    expect(canOpenNotification("/data-imports/batches?status=import_partial")).toBe(true);
  });
});
