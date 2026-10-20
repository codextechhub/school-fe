/**
 * Films the student app in use, on the phone stage (stage.mjs).
 *
 * It signs in as the seeded pupil of Lagoon View Academy (Ebere Bello, JSS2 A)
 * with her admission number, so the local backend and student-fe dev server
 * must be running and the student seeder must have run:
 *
 *   cd .claude && node demo-videos/student-walkthrough.mjs
 *
 * Environment: BASE_URL (default http://lagoon-view.localhost:5175), PUPIL,
 * PASSWORD, OUT_DIR (where the .webm lands, default ./demo-videos/out).
 *
 * The walk marks a notice read and leaves it so.
 */
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const BASE = (process.env.BASE_URL || "http://lagoon-view.localhost:5175").replace(/\/$/, "");
const PUPIL = process.env.PUPIL || "LV/2026/0029";
const PASSWORD = process.env.PASSWORD || "Pupil@School2026";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out");

const { app, page, caption, tap, scroll, finish } = await openStage({
  base: BASE,
  start: `${BASE}/student/sign-in`,
  device: "phone",
  school: "Lagoon View Academy",
  label: "Student app",
  steps: 10,
  outDir: OUT_DIR,
  // The install and notification offers answered already, as on a pupil's phone after the first day.
  storage: {
    "xvs.student.install-offer-dismissed": "1",
    "xvs.student.push": JSON.stringify({ choice: "not-now" }),
  },
});
const bar = (name) => app.locator('nav[aria-label="Screens"] a', { hasText: name });
const more = async (name) => {
  await tap(app.locator('nav[aria-label="Screens"] button', { hasText: "More" }));
  await pause(800);
  await tap(app.locator('[role="dialog"] a', { hasText: name }));
};

await app.locator('input[name="identifier"]').waitFor();
await pause(800);

// 1. Sign in
await caption(1, "Sign in", "Pupils sign in with their admission number and their own password.");
await tap(app.locator('input[name="identifier"]'), 250);
await app.locator('input[name="identifier"]').pressSequentially(PUPIL, { delay: 70 });
await tap(app.locator('input[name="password"]'), 250);
await app.locator('input[name="password"]').pressSequentially(PASSWORD, { delay: 55 });
await pause(400);
await tap(app.locator("button.signin-submit"));
await app.locator("text=Hello").first().waitFor();
await pause(800);

// 2. Home
await caption(2, "Their school day", "Today's lessons, attendance, fees and the newest notice, as soon as they open the app.");
await pause(1800);
await scroll(560, 2400);
await pause(1600);
await scroll(-560, 1200);

// 3. Timetable
await tap(bar("Timetable"));
await app.locator(".timetable-feature").first().waitFor();
await caption(3, "Timetable", "The week's lessons for their class, with what is on now and next.");
await pause(1800);
await scroll(520, 2200);
await pause(1600);
await scroll(-520, 1000);

// 4. Results
await tap(bar("Results"));
await app.locator(".results-hero").first().waitFor();
await caption(4, "Results", "Each released term: average, position and every subject.");
await pause(1600);
await scroll(560, 2200);
await pause(1600);
await scroll(-560, 1000);

// 5. Report card
await tap(app.getByRole("link", { name: /report card/i }).first());
await app.locator(".report-page").first().waitFor();
await caption(5, "Report card", "The school's own report card, to read on the phone or save as a PDF.");
await pause(1800);
await scroll(700, 2600);
await pause(1600);

// 6. Attendance
await more("Attendance");
await app.locator(".attendance-hero").first().waitFor();
await caption(6, "Attendance", "Every school day as the class teacher marked it.");
await pause(1500);
await scroll(430, 1800);
await pause(1000);
const day = app.locator(".attendance-days button:not([disabled])").nth(6);
if (await day.count()) await tap(day);
await pause(1800);
await scroll(-430, 1000);

// 7. Fees
await tap(bar("Fees"));
await app.locator(".fees-hero-value").first().waitFor();
await caption(7, "Fees", "What is left to pay, every bill, and a bank account number of their own.");
await pause(1800);
await scroll(520, 2200);
await pause(1000);
const account = app.getByRole("button", { name: /Bank transfer account/ });
if (await account.count()) {
  await tap(account);
  await pause(1200);
  await scroll(460, 1800);
  await pause(2600);
}
await scroll(-1400, 1200);

// 8. Notices
await more("Notices");
await app.locator(".notices-row-main").first().waitFor();
await caption(8, "Notices", "Messages from the school and from their class.");
await pause(1500);
await tap(app.locator(".notices-row-main").first());
await pause(2600);
await page.keyboard.press("Escape");
await pause(600);

// 9. Profile
await more("Profile");
await app.locator(".profile-hero").first().waitFor();
await caption(9, "Their profile", "Their own contact details, and what the school keeps on record.");
await pause(1600);
await scroll(460, 1800);
await pause(1400);
await scroll(-460, 1000);

// 10. Sign out
await caption(10, "Shared phones", "Several pupils can sign in on one phone. Each signs out on their own.");
await tap(app.locator(".pupil-switcher-trigger"));
await pause(1600);
await tap(app.locator(".is-signout"));
await app.locator('input[name="identifier"]').waitFor();
await pause(2200);

console.log(await finish());
