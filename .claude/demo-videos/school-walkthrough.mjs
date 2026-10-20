/**
 * Films the school side of the parent app, on the browser stage (stage.mjs):
 * the admin sees the parent app is given automatically, enrols a pupil with
 * her mother as guardian, and finds the mother already invited.
 *
 * It signs in as Lagoon View Academy's seeded admin, so the local backend and
 * school-fe dev server must be running. Local email prints to the backend's
 * console, so the invitation reaches nobody.
 *
 *   cd .claude && node demo-videos/school-walkthrough.mjs
 *
 * Environment: BASE_URL (default http://lagoon-view.localhost:5174), EMAIL,
 * PASSWORD, OUT_DIR (where the .webm lands, default ./demo-videos/out).
 *
 * The walk enrols a real pupil (Chidinma Eze, JSS1 A) and her guardian (Ngozi
 * Eze) in the local data and leaves them. A second run finds the guardian
 * already held and links her, as the school would.
 */
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const BASE = (process.env.BASE_URL || "http://lagoon-view.localhost:5174").replace(/\/$/, "");
const EMAIL = process.env.EMAIL || "admin@lagoon-view.example.com";
const PASSWORD = process.env.PASSWORD || "School@2025";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out");

const { app, caption, tap, scroll, frame, finish } = await openStage({
  base: BASE,
  start: `${BASE}/accounts`,
  device: "browser",
  school: "Lagoon View Academy",
  label: "School admin",
  steps: 7,
  outDir: OUT_DIR,
});

const type = async (locator, text, delay = 55) => {
  await tap(locator, 200);
  await locator.pressSequentially(text, { delay });
};
const box = (name) => app.getByRole("textbox", { name, exact: true });
const next = () => tap(app.getByRole("button", { name: /^(Next|Skip)$/ }));

await app.getByPlaceholder(/Email, staff ID/).waitFor();
await pause(800);

// 1. Sign in
await caption(1, "The school's own app", "Staff sign in on the school's address.");
await type(app.getByPlaceholder(/Email, staff ID/), EMAIL, 45);
await type(app.getByPlaceholder("Enter your password"), PASSWORD, 55);
await app.getByPlaceholder("Enter your password").press("Enter");
await app.getByRole("button", { name: "Open account menu" }).waitFor({ timeout: 30_000 });
await pause(1500);

// 2. The parent app setting
await frame().goto(`${BASE}/settings/guardians`);
await app.getByText("Give parents the parent app automatically").waitFor();
await caption(2, "Parents get the app automatically", "On by default. When a child joins the roll, each guardian is emailed an invitation.");
await pause(1200);
await app.getByText("Give parents the parent app automatically").scrollIntoViewIfNeeded();
await pause(3200);

// 3. Enrol: the student
await frame().goto(`${BASE}/students/enrol`);
await box("First name").waitFor();
await caption(3, "Enrol a pupil", "The pupil first: name, date of birth and the details the school asks for.");
await type(box("First name"), "Chidinma");
await type(box("Last name"), "Eze");
await tap(app.getByRole("button", { name: "Date of birth" }));
await app.locator('select[aria-label="Choose the Year"]').selectOption("2014", { force: true });
await app.locator('select[aria-label="Choose the Month"]').selectOption("3", { force: true });
await pause(500);
await tap(app.getByRole("button", { name: /April 14th, 2014/ }));
await tap(app.getByRole("radio", { name: "Female" }));
await type(box("State of origin"), "Anambra");
await pause(900);
await next();

// 4. Placement
await app.getByText("Entry class").first().waitFor();
await caption(4, "Branch and class", "Where the pupil learns, and the seat they take.");
const placement = app.locator("main select");
await placement.nth(0).selectOption({ label: "Lagoon View Academy Main Branch" });
await pause(700);
await placement.nth(1).selectOption({ index: 1 });
await pause(1500);
await next();

// 5. Guardian
await app.getByRole("button", { name: "Add a new one" }).waitFor();
await caption(5, "Her mother, with an email", "An email is required while the parent app is given automatically, because the invitation goes there.");
await tap(app.getByRole("button", { name: "Add a new one" }));
await type(box("First name"), "Ngozi");
await type(box("Last name"), "Eze");
await type(box("Phone"), "0803 555 0144");
await type(box("Email"), "ngozi.eze@example.com", 45);
await app.locator("main select").first().selectOption({ label: "Mother" });
await pause(1400);
await next();

// 6. Review and enrol
await next();
await app.getByRole("button", { name: "Enrol student" }).waitFor();
await caption(6, "Review and enrol", "One check of everything, then the pupil joins the roll.");
await pause(1400);
await scroll(360, 1600);
await pause(1200);
await tap(app.getByRole("button", { name: "Enrol student" }));
await pause(3500);

// 7. The guardian is invited
await frame().goto(`${BASE}/students/guardians`);
await app.getByText("Ngozi Eze").first().waitFor({ timeout: 30_000 });
await caption(7, "Already invited", "Ngozi has an invitation to the parent app in her inbox. She sets a password and sees Chidinma.");
await tap(app.getByText("Ngozi Eze").first());
await app.getByText("Parent app access").first().waitFor({ timeout: 30_000 });
await pause(800);
await app.getByText("Parent app access").first().scrollIntoViewIfNeeded();
await pause(4200);

console.log(await finish());
