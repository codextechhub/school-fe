/**
 * Does every menu screen draw its heading through `PageHeader`?
 *
 * A page that writes its own `<h1>` picks its own size, and that is how the
 * app came to have titles at 16, 18, 20, 24 and 30px side by side. So any raw
 * `<h1>` in a school page or a shared `@xvs/finance` page fails here, naming
 * the file, unless the file is listed below with the reason it is not a page
 * heading. The list is checked in the other direction too: an entry whose file
 * no longer writes an `<h1>` fails, so it cannot outlive its reason.
 *
 * The package is read from `node_modules/@xvs/finance`, the copy this app
 * actually installs, so a pin moved onto a version with a hand-written heading
 * fails here rather than only looking wrong.
 */

// Node types for this audit alone; tsconfig.app.json keeps them out of app code.
/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["src/pages/protected", "node_modules/@xvs/finance/src/pages"];

/** Files whose `<h1>` is deliberately not a `PageHeader`, and why. */
const EXEMPT: Record<string, string> = {
  // Hero banners and guide pages
  "src/pages/protected/dashboard/index.tsx": "the greeting banner",
  "src/pages/protected/academics/structure/index.tsx": "the session banner",
  "src/pages/protected/onboarding/welcome.tsx": "the full-page welcome card",
  "src/pages/protected/support/guides.tsx": "the guides landing banner",
  "src/pages/protected/support/guide-article.tsx": "a guide article",
  // Record headers: the title is a person's or a record's name
  "src/pages/protected/academics/session/session-details.tsx": "a session record",
  "src/pages/protected/classes/class-details/index.tsx": "a class record",
  "src/pages/protected/attendance/register/index.tsx": "one class's register",
  "src/pages/protected/attendance/lesson/index.tsx": "one lesson's register",
  "src/pages/protected/gradebook/sheet/index.tsx": "one subject's score sheet",
  "src/pages/protected/roles/role-view.tsx": "a role record",
  "src/pages/protected/staff/profile/index.tsx": "a staff member's profile",
  "src/pages/protected/staff/profile/restricted-profile.tsx": "a staff member's profile",
  "src/pages/protected/students/profile/index.tsx": "a student's profile",
  "src/pages/protected/students/guardians/detail.tsx": "a guardian's profile",
  "src/pages/protected/support/detail.tsx": "a support ticket",
  "node_modules/@xvs/finance/src/pages/data-imports/batches/view-batch.tsx": "an import batch record",
  "node_modules/@xvs/finance/src/pages/data-imports/templates/view.tsx": "an import template record",
  "node_modules/@xvs/finance/src/pages/export/run-detail.tsx": "an export run record",
  "node_modules/@xvs/finance/src/pages/workflow/templates/template-detail.tsx": "a workflow template record",
  // Printed sheets: the on-screen heading is a PageHeader, hidden when printing
  "src/pages/protected/calendar/class-timetables/index.tsx": "the printed timetable's title",
  "src/pages/protected/calendar/exams/index.tsx": "the printed exam timetable's title",
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const pages = ROOTS.flatMap(walk).filter(
  (file) => file.endsWith(".tsx") && !/\.test\.tsx$/.test(file),
);
const writesH1 = (file: string) => /<h1[\s>]/.test(readFileSync(file, "utf8"));

describe("page headings", () => {
  it("every page heading goes through PageHeader", () => {
    const raw = pages
      .filter(writesH1)
      .map((file) => relative(process.cwd(), file))
      .filter((file) => !(file in EXEMPT));
    expect(raw, "draw these headings with PageHeader, or list the file in EXEMPT with why").toEqual([]);
  });

  it("every exempt file still writes its own heading", () => {
    const stale = Object.keys(EXEMPT).filter((file) => {
      try {
        return !writesH1(file);
      } catch {
        return true;
      }
    });
    expect(stale, "remove these from EXEMPT").toEqual([]);
  });
});
