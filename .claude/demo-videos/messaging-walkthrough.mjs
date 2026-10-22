/**
 * Films "Messaging at school" in parts, joined by to-mp4.mjs.
 *
 * Who can talk to whom at Lagoon View, and why it stays safe: a teacher and a
 * parent about one child, a pupil asking a teacher, staff groups and
 * announcements, and the principal looking in where the rules allow it. Staff
 * parts film the staff app in the browser window; the parent and the pupil
 * are filmed on the phone.
 *
 * Every send cannot be undone, and the app has no way to delete a message.
 * lagoon-messaging-setup.py removes the conversations the film makes between
 * Tolu and Mr Bello and between Femi and Tolu, so those parts can be filmed
 * again after it runs; a group, a broadcast or a reply made in a take stays.
 *
 *   cd .claude && PART=M1 node demo-videos/messaging-walkthrough.mjs
 *
 * Needs the local backend (8000), school-fe (5174), the parent app (5176) and
 * the student portal (5175).
 */
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const SCHOOL = "http://lagoon-view.localhost:5174";
const PARENT = "http://lagoon-view.localhost:5176";
const PUPIL = "http://lagoon-view.localhost:5175";
const STAFF = "SchoolStaff@2026";
const PEOPLE = {
  tolu: { email: "tolu.fashola@lagoon-view.example.com", password: STAFF, label: "Teacher" },
  chukwuemeka: { email: "branch.admin@lagoon-view.example.com", password: "School@2025", label: "Branch Admin" },
  principal: { email: "admin@lagoon-view.example.com", password: "School@2025", label: "Principal" },
};
const BELLO = { email: "bello.household@example.ng", password: "Parent@School2026" };
const FEMI = { admission: "LV/2026/0030", password: "Pupil@School2026" };
const PARENT_STORAGE = {
  "xvs.parent.install-offer-dismissed": "1",
  "xvs.parent.push": JSON.stringify({ choice: "not-now" }),
};
const PART = process.env.PART || "M1";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out/messaging");
const STEPS = 10;

const CAPTIONS = {
  1: ["Messaging at school", "Teachers, families and pupils, each able to reach only the people they should."],
  2: ["One inbox", "Direct messages, family conversations, groups and announcements, sorted for her."],
  3: ["Writing to a parent", "Tolu can write only to the families of children she teaches."],
  4: ["The parent answers", "Mr Bello is told on his phone, opens it and replies. Tolu sees it has been read."],
  5: ["Who a parent can reach", "Femi's class teacher, his subject teachers and the school office. Nobody else."],
  6: ["Pupils can ask too", "Femi asks his teacher a question, and is told his parent and the school can read it."],
  7: ["Staff groups", "A group for the JSS2 teachers, run by the branch admin."],
  8: ["Announcements to staff", "One message to every member of staff. Replies come back privately to the sender."],
  9: ["A private reply", "Tolu answers the announcement. Only the sender sees her reply."],
  10: ["Keeping it safe", "The principal can read groups, announcements and pupils' conversations, and every look is recorded."],
};

// The stage of the part being filmed, so a failure can show what was on it.
let filming = null;

async function staffStage(who) {
  const stage = filming = await openStage({
    base: SCHOOL, start: `${SCHOOL}/login`, device: "browser", school: "Lagoon View Academy",
    label: PEOPLE[who].label, steps: STEPS, outDir: OUT_DIR,
  });
  const { app } = stage;
  await app.getByPlaceholder(/Email, staff ID/).waitFor({ timeout: 30_000 });
  await app.getByPlaceholder(/Email, staff ID/).fill(PEOPLE[who].email);
  await app.getByPlaceholder("Enter your password").fill(PEOPLE[who].password);
  await app.getByPlaceholder("Enter your password").press("Enter");
  await app.getByPlaceholder(/Email, staff ID/).waitFor({ state: "detached", timeout: 30_000 });
  await stage.frame().goto(`${SCHOOL}/messages`);
  await app.getByRole("button", { name: /^New/ }).first().waitFor({ timeout: 30_000 });
  await pause(1200);
  return stage;
}

async function parentStage() {
  const stage = filming = await openStage({
    base: PARENT, start: `${PARENT}/parent/`, device: "phone", school: "Lagoon View Academy",
    label: "Parent app", steps: STEPS, outDir: OUT_DIR, storage: PARENT_STORAGE,
  });
  await signInParent(stage.app);
  return stage;
}

async function signInParent(app) {
  await app.locator("input[name=email]").waitFor({ timeout: 30_000 });
  await app.locator("input[name=email]").fill(BELLO.email);
  await app.locator("input[name=password]").fill(BELLO.password);
  await app.locator("button.signin-submit").click();
  await app.locator("text=Welcome").first().waitFor({ timeout: 30_000 });
  await pause(800);
}

const caption = (stage, n) => stage.caption(n, ...CAPTIONS[n]);
const captionNow = (stage, n) => stage.captionNow(n, ...CAPTIONS[n]);

const type = async (stage, input, text, delay = 32) => {
  await stage.tap(input, 220);
  await input.pressSequentially(text, { delay });
};

/** A conversation in the staff inbox, by the name or title it shows. */
const conversation = (app, name) => app.getByRole("button").filter({ hasText: name }).first()
  .or(app.getByRole("link").filter({ hasText: name }).first()).first();

/** Writes *text* in the open conversation's reply box and sends it. */
async function reply(stage, text) {
  const { app } = stage;
  const box = app.locator("textarea").filter({ visible: true }).last();
  await type(stage, box, text);
  await pause(800);
  await stage.tap(app.getByRole("button", { name: /^Send/ }).filter({ visible: true }).last());
  await pause(2400);
}

const parts = {
  /** Scenes 1 to 3: Tolu's inbox, then her first message to Mr Bello about Femi. */
  async M1() {
    const stage = await staffStage("tolu");
    const { app, tap } = stage;
    await caption(stage, 1);
    await pause(4400);
    await caption(stage, 2);
    await pause(2400);
    for (const tab of ["Direct", "Parents and pupils", "Groups", "All"]) {
      await tap(app.getByRole("button", { name: tab, exact: true }).or(app.getByRole("tab", { name: tab, exact: true })).first());
      await pause(1800);
    }
    await caption(stage, 3);
    await pause(1600);
    await tap(app.getByRole("button", { name: /^New/ }).first());
    const message = app.getByRole("menuitem", { name: "Message" });
    if (await message.waitFor({ timeout: 2500 }).then(() => true, () => false)) await tap(message);
    const form = app.getByRole("dialog", { name: "New message" });
    await tap(form.getByRole("button", { name: "Parent or pupil" }));
    await pause(1600);
    await type(stage, form.getByPlaceholder(/Search pupils/), "Femi", 90);
    await pause(1400);
    await tap(form.getByRole("radio", { name: /Mr\. E\. Bello/ }).or(form.getByRole("button", { name: /Mr\. E\. Bello/ })).first());
    await type(stage, form.getByPlaceholder("Write your message"),
      "Good afternoon Mr Bello. Femi did very well in today's Basic Science practical. He set up the microscope on his own and helped his partner. Please encourage him to keep revising his notes.", 18);
    await pause(1400);
    await tap(form.getByRole("button", { name: "Send message" }));
    await form.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 4, first part: the push on Mr Bello's phone, the message, his reply. */
  async M2() {
    const stage = await parentStage();
    const { app, frame, tap, banner } = stage;
    await caption(stage, 4);
    await pause(1400);
    await banner("New message from Tolu Fashola about Femi", "Open the parent app to read it.", {
      icon: `${PARENT}/parent/icons/icon-192.png`, ms: 3600,
    });
    await frame().goto(`${PARENT}/parent/messages`);
    const thread = app.locator("a, button").filter({ hasText: "Tolu Fashola" }).filter({ visible: true }).first();
    await thread.waitFor({ timeout: 30_000 });
    await pause(1600);
    await tap(thread);
    await pause(3600);
    await reply(stage, "Thank you Ma, we are very proud of him. He told us all about the microscopes at dinner. We will make sure he revises.");
    await pause(2600);
    return stage.finish();
  },

  /** Scene 4, last part: back on Tolu's screen, the reply has arrived and her message reads as seen. */
  async M3() {
    const stage = await staffStage("tolu");
    const { app, tap } = stage;
    await captionNow(stage, 4);
    const thread = conversation(app, "Mr. E. Bello");
    await thread.waitFor({ timeout: 30_000 });
    await pause(1200);
    await tap(thread);
    await pause(5200);
    return stage.finish();
  },

  /** Scene 5: the people a parent may write to, for one child. Nothing is sent. */
  async M4() {
    const stage = await parentStage();
    const { app, frame, tap } = stage;
    await frame().goto(`${PARENT}/parent/messages/new`);
    await app.getByText("Which child is it about?").waitFor({ timeout: 30_000 });
    await caption(stage, 5);
    await pause(2200);
    await tap(app.locator("label").filter({ hasText: "Femi" }).first());
    await pause(4200);
    await stage.scroll(260, 1400);
    await pause(3600);
    return stage.finish();
  },

  /** Scene 6: Femi writes to Tolu in the student portal, then his father reads it, read only. */
  async M5() {
    const stage = filming = await openStage({
      base: PUPIL, start: `${PUPIL}/student/`, device: "phone", school: "Lagoon View Academy",
      label: "Student portal", steps: STEPS, outDir: OUT_DIR,
    });
    const { app, frame, tap, show } = stage;
    await app.getByPlaceholder("e.g. LVS/2026/0184").waitFor({ timeout: 30_000 });
    await app.getByPlaceholder("e.g. LVS/2026/0184").fill(FEMI.admission);
    await app.getByPlaceholder("Enter your password").fill(FEMI.password);
    await app.getByRole("button", { name: "Sign in" }).click();
    await app.getByText("Hello, Femi.").waitFor({ timeout: 30_000 });
    await frame().goto(`${PUPIL}/student/messages`);
    await app.getByText("New message").first().waitFor({ timeout: 30_000 });
    await caption(stage, 6);
    await pause(2600);
    await tap(app.getByRole("button", { name: "New message" }).or(app.getByRole("link", { name: "New message" })).first());
    await app.getByText("Who is it for?").waitFor();
    await pause(1800);
    await tap(app.locator("label").filter({ hasText: "Tolu Fashola" }).first());
    await type(stage, app.getByPlaceholder("Write your message"),
      "Good afternoon Ma. Please, will next week's practical test cover the parts of the microscope?", 30);
    await pause(1200);
    await tap(app.getByRole("button", { name: "Send message" }));
    await pause(3600);
    await show({ base: PARENT, start: `${PARENT}/parent/`, label: "Parent app" });
    await signInParent(app);
    await frame().goto(`${PARENT}/parent/messages`);
    await app.getByText("Your child's conversations with staff").waitFor({ timeout: 30_000 });
    await stage.captionNow(6, ...CAPTIONS[6]);
    await pause(1200);
    await stage.scroll(320, 1400);
    await pause(4600);
    return stage.finish();
  },

  /** Scenes 7 and 8: Chukwuemeka makes the JSS2 teachers' group, then announces the staff meeting. */
  async M6() {
    const stage = await staffStage("chukwuemeka");
    const { app, tap } = stage;
    await caption(stage, 7);
    await pause(1800);
    await tap(app.getByRole("button", { name: /^New/ }).first());
    await tap(app.getByRole("menuitem", { name: "Group" }));
    const group = app.getByRole("dialog", { name: "New group" });
    await type(stage, group.getByPlaceholder("e.g. JSS1 form teachers"), "JSS2 teachers", 60);
    for (const person of ["Tolu Fashola", "Bisi Olanrewaju", "Amina Garba", "Chinedu Okeke"]) {
      await tap(group.getByRole("checkbox").filter({ hasText: person }).first(), 250);
    }
    await type(stage, group.getByPlaceholder("Say hello"),
      "Hello all. Please let us have JSS2 A's First Term scores in by Friday so results can go out on time.", 22);
    await pause(1400);
    await tap(group.getByRole("button", { name: "Create group" }));
    await group.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(3600);

    await caption(stage, 8);
    await pause(1400);
    await tap(app.getByRole("button", { name: /^New/ }).first());
    await tap(app.getByRole("menuitem", { name: "Broadcast" }));
    const cast = app.getByRole("dialog", { name: "New broadcast" });
    await type(stage, cast.getByPlaceholder("e.g. Staff meeting moved to Friday"), "Staff meeting moved to Friday", 50);
    await type(stage, cast.getByPlaceholder("What do your colleagues need to know?"),
      "This week's staff meeting moves to Friday at 2:30 pm in the staff room. Please reply if you cannot attend.", 22);
    await tap(cast.locator('[role=radio][value="PRIVATE_REPLIES"]'));
    await pause(900);
    await tap(cast.getByRole("button", { name: "Select all shown" }));
    await pause(1800);
    await tap(cast.getByRole("button", { name: "Send broadcast" }));
    await cast.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 9: Tolu replies to the announcement, privately. */
  async M7() {
    const stage = await staffStage("tolu");
    const { app, tap } = stage;
    await caption(stage, 9);
    await pause(1400);
    await tap(app.getByRole("button", { name: "Broadcasts", exact: true }).or(app.getByRole("tab", { name: "Broadcasts", exact: true })).first());
    const cast = conversation(app, "Staff meeting moved to Friday");
    await cast.waitFor({ timeout: 30_000 });
    await tap(cast);
    await pause(3000);
    const privately = app.getByRole("button", { name: /^Reply privately/ }).first();
    if (await privately.count()) await tap(privately);
    await pause(1000);
    await reply(stage, "Noted, sir. I may be ten minutes late on Friday: I have the JSS2 practical until 2:40.");
    await pause(2600);
    return stage.finish();
  },

  /** Scene 10: the principal's oversight of a group and a pupil's conversation. */
  async M8() {
    const stage = await staffStage("principal");
    const { app, frame, tap } = stage;
    await frame().goto(`${SCHOOL}/messages/oversight`);
    await app.getByText("Every opening is recorded").first().waitFor({ timeout: 30_000 });
    await caption(stage, 10);
    await pause(3200);
    await tap(conversation(app, "JSS2 teachers"));
    await pause(4200);
    await tap(app.getByRole("button", { name: /Pupil conversations/ }).or(app.getByRole("tab", { name: /Pupil conversations/ })).first());
    await pause(1600);
    await tap(conversation(app, "Femi Bello"));
    await pause(5600);
    return stage.finish();
  },
};

if (!parts[PART]) throw new Error(`PART must be one of ${Object.keys(parts).join(", ")}`);
try {
  console.log(await parts[PART]());
} catch (error) {
  const shot = path.join(OUT_DIR, `failed-${PART}.png`);
  await filming?.page.screenshot({ path: shot }).catch(() => {});
  console.error(`${PART} failed; the stage at that moment is ${shot}`);
  throw error;
}
