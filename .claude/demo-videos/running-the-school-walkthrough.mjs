/**
 * Films "Running the school" in parts, joined by to-mp4.mjs: one term at
 * Lagoon View, from a family applying to a report card in a parent's hand.
 *
 * The data comes from lagoon-school-setup.py: fresh applicants, Mrs Ada Nwosu
 * as an existing guardian, Tolu Fashola as class teacher of JSS2 A with a
 * lesson today and an open Basic Science sheet, and JSS2 A's other results in.
 * Most parts write (an enrolment, a register, scores, a published result) and
 * cannot be undone; REHEARSE=1 walks a part and stops short of its writes,
 * printing each screen it reaches.
 *
 *   cd .claude && PART=O1 node demo-videos/running-the-school-walkthrough.mjs
 *
 * Needs the local backend (8000), school-fe (5174) and the parent app (5176).
 */
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const SCHOOL = "http://lagoon-view.localhost:5174";
const PARENT = "http://lagoon-view.localhost:5176";
const STAFF = "SchoolStaff@2026";
const PEOPLE = {
  principal: { email: "admin@lagoon-view.example.com", password: "School@2025", label: "Principal" },
  tolu: { email: "tolu.fashola@lagoon-view.example.com", password: STAFF, label: "Teacher" },
  bakare: { email: "oluwaseun.bakare@lagoon-view.example.com", password: STAFF, label: "Head of Sciences" },
};
const BELLO = { email: "bello.household@example.ng", password: "Parent@School2026" };
const PARENT_STORAGE = {
  "xvs.parent.install-offer-dismissed": "1",
  "xvs.parent.push": JSON.stringify({ choice: "not-now" }),
};
const PART = process.env.PART || "O1";
const REHEARSE = process.env.REHEARSE === "1";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out/school");
const STEPS = 15;

const CAPTIONS = {
  1: ["Running the school", "A term at Lagoon View, from an application to a report card."],
  2: ["The school at a glance", "The day's work for the principal: what needs fixing, what to watch, and the school in numbers."],
  3: ["From applicant to pupil", "A family applies. The school reviews the application and puts the child on the roll."],
  4: ["Enrolling a pupil", "Five short steps: the pupil, the class, the guardians, the details, and a final check."],
  5: ["Everything about one pupil", "Guardians, class history, medical notes, documents, attendance and results in one place."],
  6: ["Families, not just pupils", "A guardian sees all their children, and the school sees every child a guardian is linked to."],
  7: ["Who teaches what", "Every class and subject needs a teacher, and the school sees the gaps."],
  8: ["The school year", "Sessions, terms, classes and the calendar that every other screen follows."],
  9: ["The timetable", "Periods, rooms and teachers come together, and a clash is flagged before it happens."],
  10: ["The morning register", "Tolu marks her class from her phone in under a minute."],
  11: ["Fixing a mistake", "A wrong mark is changed by request, and the change is approved and recorded."],
  12: ["Entering scores", "Class tests and the exam, with totals and grades worked out as she types."],
  13: ["Checking before results go out", "Scores are moderated, the broadsheet shows the class, and the principal approves."],
  14: ["Results reach the family", "Mr Bello is told on his phone, and Femi's report card is in his app."],
  15: ["Moving up a year", "At the end of the session, each pupil is promoted, kept back or graduated."],
};

let filming = null;

async function staffStage(who, device = "browser") {
  const stage = filming = await openStage({
    base: SCHOOL, start: `${SCHOOL}/login`, device, school: "Lagoon View Academy",
    label: PEOPLE[who].label, steps: STEPS, outDir: OUT_DIR,
  });
  const { app } = stage;
  await app.getByPlaceholder(/Email, staff ID/).waitFor({ timeout: 30_000 });
  await app.getByPlaceholder(/Email, staff ID/).fill(PEOPLE[who].email);
  await app.getByPlaceholder("Enter your password").fill(PEOPLE[who].password);
  await app.getByPlaceholder("Enter your password").press("Enter");
  await app.getByPlaceholder(/Email, staff ID/).waitFor({ state: "detached", timeout: 30_000 });
  await pause(1500);
  return stage;
}

const caption = (stage, n) => stage.caption(n, ...CAPTIONS[n]);
const captionNow = (stage, n) => stage.captionNow(n, ...CAPTIONS[n]);

const type = async (stage, input, text, delay = 45) => {
  await stage.tap(input, 220);
  await input.press("ControlOrMeta+a");
  await input.pressSequentially(text, { delay });
};

const button = (scope, name) => scope.getByRole("button", { name }).or(scope.getByRole("link", { name })).or(scope.getByRole("tab", { name })).first();

/** Presses the button named *name* in the confirmation box that has just opened over the screen. */
async function confirmBox(stage, name) {
  const box = stage.app.getByRole("alertdialog").or(stage.app.getByRole("dialog")).filter({ has: stage.app.getByRole("button", { name: "Cancel" }) }).last();
  await box.waitFor({ timeout: 10_000 });
  await pause(1200);
  await stage.tap(box.getByRole("button", { name }).last());
  await box.waitFor({ state: "hidden", timeout: 30_000 });
}

/** Says what a rehearsal would have done at a step that cannot be undone, and does not do it. */
async function irreversible(what, act) {
  if (REHEARSE) {
    console.log(`  rehearsal: stopped before ${what}`);
    return false;
  }
  await act();
  return true;
}

/** In a rehearsal, prints the screen the part has reached. */
async function report(stage, label) {
  if (!REHEARSE) return;
  const text = (await stage.app.locator("body").innerText()).split("\n").filter(Boolean).join(" | ");
  console.log(`## ${label}\n${text.slice(-1400)}`);
}

/** Picks a day in the app's calendar pop-up: month and year from its two lists, then the day. */
async function pickDate(stage, opener, { day, month, year }) {
  const { app } = stage;
  await stage.tap(opener, 250);
  const lists = app.locator("[data-radix-popper-content-wrapper] select, [role=dialog] select");
  await lists.first().waitFor();
  await lists.nth(0).selectOption({ label: month });
  await lists.nth(1).selectOption({ label: String(year) });
  await pause(500);
  await stage.tap(app.locator("[data-radix-popper-content-wrapper], [role=dialog]").last()
    .getByRole("gridcell", { name: String(day), exact: true }).filter({ hasNot: app.locator("[data-outside]") }).first()
    .or(app.locator("[data-radix-popper-content-wrapper] button").filter({ hasText: new RegExp(`^${day}$`) }).first()).first(), 250);
  await pause(600);
}

const parts = {
  /** Scenes 1 to 4: the principal's dashboard, an applicant put on the roll, and a new pupil enrolled. */
  async O1() {
    const stage = await staffStage("principal");
    const { app, frame, tap } = stage;
    await frame().goto(`${SCHOOL}/overview`);
    await app.getByText("What needs your attention").first().waitFor({ timeout: 30_000 });
    await pause(1000);
    await caption(stage, 1);
    await pause(4400);
    await caption(stage, 2);
    await pause(4200);
    await stage.scroll(520, 1800);
    await pause(3400);

    await frame().goto(`${SCHOOL}/students/applicants`);
    await app.getByText("Ifeanyi Chukwu").first().waitFor({ timeout: 30_000 });
    await caption(stage, 3);
    await pause(3200);
    const ifeanyi = app.locator("li, article, div").filter({ hasText: "Ifeanyi Chukwu" }).filter({ has: app.getByRole("button", { name: "Put on the roll" }) }).last();
    await tap(ifeanyi.getByRole("button", { name: "Put on the roll" }));
    const roll = app.getByRole("dialog", { name: "Put on the roll" });
    await roll.waitFor();
    await type(stage, roll.locator("textarea"), "Entrance test passed and the form fees are paid.", 30);
    await pause(1400);
    await irreversible("putting Ifeanyi on the roll", async () => {
      await tap(roll.getByRole("button", { name: "Enrol" }));
      await roll.waitFor({ state: "hidden", timeout: 30_000 });
    });
    await pause(2800);

    await frame().goto(`${SCHOOL}/students/enrol`);
    await app.getByText("What are you creating?").waitFor({ timeout: 30_000 });
    await caption(stage, 4);
    await pause(2400);
    await type(stage, app.getByLabel(/First name/), "Kelechi", 70);
    await type(stage, app.getByLabel(/Last name/), "Nwosu", 70);
    await pickDate(stage, app.getByText("Select date").first(), { day: 14, month: "Mar", year: 2014 });
    await tap(app.getByRole("radio", { name: "Male", exact: true }).or(app.getByLabel("Male", { exact: true })).or(app.getByRole("button", { name: "Male", exact: true })).first());
    await pause(900);
    await report(stage, "student step");
    for (let step = 2; step <= 5; step += 1) {
      await tap(app.getByRole("button", { name: /^(Next|Skip)$/ }).last());
      await pause(1800);
      await report(stage, `step ${step}`);
      if (step === 2) await placement(stage);
      if (step === 3) await guardian(stage);
      if (step === 4) {
        await type(stage, app.getByLabel(/Home address/), "14 Adeniyi Jones Avenue, Ikeja", 40);
        await type(stage, app.getByLabel(/Blood group/), "O+", 90);
        await pause(800);
      }
    }
    await pause(2400);
    await irreversible("enrolling Kelechi", async () => {
      await tap(app.getByRole("button", { name: /^(Enrol|Enrol student|Finish)/ }).last());
      await app.getByText(/Kelechi Nwosu/).first().waitFor({ timeout: 30_000 });
    });
    await pause(3600);
    return stage.finish();
  },

  /** Scenes 5 to 9: a pupil's record, a family, teaching gaps, the school year, and JSS2 A's timetable. */
  async O2() {
    const stage = await staffStage("principal");
    const { app, frame, tap } = stage;
    // Femi's record, pupil 428.
    await frame().goto(`${SCHOOL}/students/428`);
    await app.getByText("Femi Bello").first().waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(stage, 5);
    await app.getByRole("tab", { name: "Guardians" }).or(app.getByRole("button", { name: "Guardians", exact: true })).first().waitFor({ timeout: 30_000 });
    await pause(2600);
    for (const tab of ["Guardians", "Attendance", "Results", "History"]) {
      await tap(app.getByRole("tab", { name: tab }).or(app.getByRole("button", { name: tab, exact: true })).last());
      await pause(2600);
    }

    await frame().goto(`${SCHOOL}/students/guardians/83`);
    await app.getByText("Students under this guardian").waitFor({ timeout: 30_000 });
    await caption(stage, 6);
    await pause(2400);
    await app.getByText("Students under this guardian").scrollIntoViewIfNeeded();
    await pause(4600);

    await frame().goto(`${SCHOOL}/staff/teaching`);
    await app.getByText("Subject coverage").first().waitFor({ timeout: 30_000 });
    await caption(stage, 7);
    await pause(3400);
    await tap(button(app, "Only gaps"));
    await pause(3400);
    await tap(button(app, "Class teachers"));
    await pause(4200);

    await frame().goto(`${SCHOOL}/academic-calendar`);
    await app.getByText("Coming up").waitFor({ timeout: 30_000 });
    await caption(stage, 8);
    await pause(4400);
    await frame().goto(`${SCHOOL}/academic-structure/classes`);
    await pause(4200);

    await frame().goto(`${SCHOOL}/timetables/classes`);
    await app.getByText("Timetable for", { exact: false }).first().waitFor({ timeout: 30_000 });
    await caption(stage, 9);
    await tap(app.getByText("Timetable for", { exact: false }).first());
    await pause(900);
    await tap(app.locator("button, [role=option], li").filter({ hasText: /JSS2 A\s*37 lessons|JSS2 A.*lessons/ }).first());
    const mondayEight = app.locator("tbody tr").filter({ hasText: "Period 8" }).locator("td").nth(1);
    await mondayEight.filter({ hasText: "Add" }).waitFor({ timeout: 30_000 });
    await pause(2600);
    await tap(mondayEight);
    const lesson = app.getByRole("dialog", { name: "Add lesson" });
    await lesson.waitFor();
    const pickIn = async (placeholder, text, option) => {
      await type(stage, lesson.getByPlaceholder(placeholder), text, 80);
      await pause(900);
      await tap(app.getByRole("option", { name: option }).first(), 250);
      await pause(700);
    };
    await pickIn("Search subjects", "Math", /^Mathematics/);
    await pickIn("Search teachers", "Chinedu", /Chinedu Okeke/);
    await pickIn("Search rooms", "Room 2", /Room 2/);
    // The clash is the point: Chinedu already teaches JSS1 A then, so the lesson is not saved.
    await lesson.getByText("This clashes with something").waitFor({ timeout: 30_000 });
    await pause(5200);
    await tap(lesson.getByRole("button", { name: "Cancel" }));
    await pause(1200);
    await tap(app.getByRole("link", { name: "See a teacher's timetable" }).or(app.getByText("See a teacher's timetable")).first());
    await pause(1600);
    await app.getByText("Timetable for", { exact: false }).first().waitFor({ timeout: 30_000 });
    await pause(800);
    await tap(app.getByText("Timetable for", { exact: false }).first());
    await pause(900);
    await tap(app.locator("button, [role=option], li").filter({ hasText: /^Tolu Fashola/ }).first());
    await app.getByText("Teaching periods").waitFor();
    await pause(4600);
    return stage.finish();
  },

  /** Scene 10: Tolu takes JSS2 A's morning register on her phone. */
  async O3() {
    const stage = await staffStage("tolu", "phone");
    const { app, frame, tap } = stage;
    await frame().goto(`${SCHOOL}/attendance`);
    await app.getByText("JSS2 A · morning register").waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(stage, 10);
    await pause(2800);
    await tap(button(app, "Take register"));
    await app.getByText("CLASS REGISTER").or(app.getByText("Class register")).first().waitFor({ timeout: 30_000 });
    await pause(2200);
    for (const [pupil, time] of [["Daniel Nwankwo", "8:12"], ["Zainab Bello", "8:20"]]) {
      await tap(app.locator(`button[aria-label="Late: ${pupil}"]`).filter({ visible: true }).first());
      const late = app.getByRole("dialog", { name: "Late arrival" });
      await late.waitFor();
      const clock = late.locator("input").first();
      await clock.click();
      await clock.press("ControlOrMeta+a");
      await clock.pressSequentially(time, { delay: 110 });
      await tap(late.getByRole("button", { name: "am", exact: true }), 250);
      await pause(700);
      await tap(late.getByRole("button", { name: "Mark late" }));
      await late.waitFor({ state: "hidden", timeout: 30_000 });
      await pause(900);
    }
    await tap(app.getByRole("button", { name: "Everyone else present" }));
    await pause(2400);
    await irreversible("submitting the register", async () => {
      await tap(app.getByRole("button", { name: "Submit register" }));
      await confirmBox(stage, "Submit register");
    });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 11: the principal decides a correction Tolu asked for, then looks at the attendance reports. */
  async O4() {
    const stage = await staffStage("principal");
    const { app, frame, tap } = stage;
    await frame().goto(`${SCHOOL}/attendance/corrections`);
    await app.getByText("Musa Adeleke").first().waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(stage, 11);
    await pause(2600);
    await tap(app.getByText("Musa Adeleke").filter({ visible: true }).first());
    const approve = app.getByRole("button", { name: /^Approve correction/ }).first();
    await approve.waitFor({ timeout: 30_000 });
    await pause(3200);
    await irreversible("approving the correction", async () => {
      await tap(approve);
      await confirmBox(stage, "Approve correction");
    });
    await pause(3000);
    await frame().goto(`${SCHOOL}/attendance/reports`);
    await pause(5200);
    return stage.finish();
  },

  /** Scene 12: Tolu enters JSS2 A's Basic Science scores and submits the sheet. */
  async O5() {
    const stage = await staffStage("tolu");
    const { app, frame, tap } = stage;
    await frame().goto(`${SCHOOL}/gradebook/sheets/84/43`);
    await app.getByText("Basic Science · JSS2 A").waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(stage, 12);
    await pause(3000);
    const SCORES = {
      "Amaka Adeleke": [16, 15, 44], "Musa Adeleke": [12, 14, 38], "Tunde Adeleke": [14, 13, 41],
      "Ebere Bello": [18, 17, 49], "Femi Bello": [19, 18, 53], "Zainab Bello": [15, 16, 46], "Daniel Nwankwo": [17, 18, 50],
    };
    for (const [pupil, [ca1, ca2, exam]] of Object.entries(SCORES)) {
      for (const [field, value] of [["1st CA", ca1], ["2nd CA", ca2], ["Examination", exam]]) {
        const input = app.locator(`input[aria-label="${pupil}, ${field}"]`).filter({ visible: true }).first();
        await input.click();
        await input.press("ControlOrMeta+a");
        await input.pressSequentially(String(value), { delay: 55 });
      }
      await pause(250);
    }
    await stage.page.keyboard.press("Tab");
    await app.getByText("7 of 7 complete").waitFor({ timeout: 30_000 });
    await pause(2600);
    const submit = app.getByRole("button", { name: /^Submit/ }).first();
    await submit.scrollIntoViewIfNeeded();
    await pause(1200);
    await irreversible("submitting the sheet", async () => {
      await tap(submit);
      await confirmBox(stage, "Submit sheet");
    });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 13, first part: the Head of Sciences moderates the sheet against the other classes. */
  async O6() {
    const stage = await staffStage("bakare");
    const { app, frame, tap } = stage;
    await frame().goto(`${SCHOOL}/gradebook/moderation`);
    const card = app.locator("article, li, section, div").filter({ hasText: "Basic Science · JSS2 A" }).filter({ has: app.getByRole("button", { name: "Approve", exact: true }) }).last();
    await card.waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(stage, 13);
    await pause(5200);
    await irreversible("approving the sheet", async () => {
      await tap(card.getByRole("button", { name: "Approve", exact: true }));
      const box = app.getByRole("alertdialog").or(app.getByRole("dialog"));
      if (await box.first().waitFor({ timeout: 2500 }).then(() => true, () => false)) await confirmBox(stage, /^Approve/);
    });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 13, middle part: Tolu, as class teacher, sends JSS2 A's broadsheet to the principal. */
  async O7() {
    const stage = await staffStage("tolu");
    const { app, frame, tap, captionNow } = stage;
    await frame().goto(`${SCHOOL}/gradebook/classes/84`);
    await app.getByText("JSS2 A · broadsheet").waitFor({ timeout: 30_000 });
    await captionNow(13, ...CAPTIONS[13]);
    await pause(4800);
    await irreversible("submitting the class", async () => {
      await tap(app.getByRole("button", { name: "Submit the class" }));
      await confirmBox(stage, /^Submit/);
    });
    await pause(3400);
    return stage.finish();
  },

  /** Scene 13, last part: the principal writes his comments and publishes JSS2 A's results. */
  async O8() {
    const stage = await staffStage("principal");
    const { app, frame, tap, captionNow } = stage;
    await frame().goto(`${SCHOOL}/gradebook/approvals`);
    const jss2 = app.getByText("JSS2 A", { exact: true }).filter({ visible: true }).first();
    await jss2.waitFor({ timeout: 30_000 });
    await captionNow(13, ...CAPTIONS[13]);
    await pause(1200);
    await tap(jss2);
    await app.getByRole("button", { name: "Approve and publish" }).waitFor({ timeout: 30_000 });
    await pause(2600);
    await tap(app.getByRole("button", { name: "Principal's comments" }));
    const notes = app.getByRole("dialog", { name: "Principal's comments" });
    await notes.waitFor();
    const boxes = notes.getByPlaceholder("Write the comment as it will print");
    await type(stage, boxes.nth(0), "An excellent term. Well done, and keep reading ahead.", 26);
    await type(stage, boxes.nth(1), "A good term. Keep up the steady work.", 26);
    await pause(1400);
    await irreversible("saving the comments and publishing", async () => {
      await tap(notes.getByRole("button", { name: "Save comments" }));
      await notes.waitFor({ state: "hidden", timeout: 30_000 });
      await pause(1800);
      await tap(app.getByRole("button", { name: "Approve and publish" }));
      await confirmBox(stage, /^(Approve and publish|Publish|Approve)/);
    });
    await pause(4200);
    return stage.finish();
  },

  /** Scene 14: the result reaches Mr Bello's phone. */
  async O9() {
    const stage = filming = await openStage({
      base: PARENT, start: `${PARENT}/parent/`, device: "phone", school: "Lagoon View Academy",
      label: "Parent app", steps: STEPS, outDir: OUT_DIR, storage: PARENT_STORAGE,
    });
    const { app, frame, tap, banner } = stage;
    await app.locator("input[name=email]").waitFor({ timeout: 30_000 });
    await app.locator("input[name=email]").fill(BELLO.email);
    await app.locator("input[name=password]").fill(BELLO.password);
    await app.locator("button.signin-submit").click();
    await app.locator("text=Welcome").first().waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(stage, 14);
    await pause(1400);
    await banner("Femi's First Term result is ready", "Open the parent app to read it.", { icon: `${PARENT}/parent/icons/icon-192.png`, ms: 3600 });
    await frame().goto(`${PARENT}/parent/results?child=428`);
    await app.getByText(/First Term/).first().waitFor({ timeout: 30_000 });
    await pause(3600);
    await stage.scroll(420, 1800);
    await pause(3200);
    const card = app.getByRole("link", { name: /report card|View result|Open/i }).or(app.getByRole("button", { name: /report card|View result/i })).first();
    if (await card.count()) {
      await tap(card);
      await pause(4200);
    }
    return stage.finish();
  },

  /** Scene 15: promotion at the end of the session, stopping at the review before anything is written. */
  async O10() {
    const stage = await staffStage("principal");
    const { app, frame, tap } = stage;
    await frame().goto(`${SCHOOL}/students/promotion`);
    await app.getByText("Step 1 of 4").first().waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(stage, 15);
    await pause(2600);
    const into = app.locator("main select").first();
    await tap(into, 250);
    await into.selectOption({ label: "2027/2028" });
    await pause(1400);
    await tap(app.getByRole("button", { name: "Review students" }));
    await pause(5200);
    await stage.scroll(480, 1800);
    await pause(4400);
    return stage.finish();
  },
};

/** The wizard's Placement step: JSS1 A at Main Branch. */
async function placement(stage) {
  const { app } = stage;
  for (const select of await app.locator("main select").all()) {
    const options = await select.locator("option").allInnerTexts();
    const wanted = options.find((o) => /Main Branch/.test(o)) || options.find((o) => /^JSS1 A/.test(o)) || options.find((o) => /JSS1/.test(o));
    if (wanted) await select.selectOption({ label: wanted });
    await pause(700);
  }
  const jss1a = app.getByRole("radio", { name: /JSS1 A/ }).or(app.getByRole("button", { name: /^JSS1 A/ })).first();
  if (await jss1a.count()) await stage.tap(jss1a);
  await pause(1200);
}

/** The wizard's Guardians step: Mrs Ada Nwosu, found as an existing guardian. */
async function guardian(stage) {
  const { app } = stage;
  await stage.tap(button(app, /Find an existing guardian/));
  const search = app.getByPlaceholder(/Search|guardian/i).last();
  await search.waitFor();
  await type(stage, search, "Nwosu", 90);
  await pause(1600);
  await stage.tap(app.getByText(/Ada Nwosu/).filter({ visible: true }).first());
  await pause(1200);
  const relation = app.locator("main select").filter({ hasText: "Select a relationship" }).last();
  await stage.tap(relation, 250);
  await relation.selectOption({ label: "Mother" });
  await pause(600);
  const primary = app.getByRole("checkbox", { name: /Primary contact/ }).or(app.getByLabel(/Primary contact/)).first();
  if (await primary.count() && !(await primary.isChecked().catch(() => false))) await stage.tap(primary);
  await pause(900);
}

if (!parts[PART]) throw new Error(`PART must be one of ${Object.keys(parts).join(", ")}`);
try {
  console.log(await parts[PART]());
} catch (error) {
  const shot = path.join(OUT_DIR, `failed-${PART}.png`);
  await filming?.page.screenshot({ path: shot }).catch(() => {});
  console.error(`${PART} failed; the stage at that moment is ${shot}`);
  throw error;
}
