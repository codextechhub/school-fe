/**
 * Films "More than fees" in parts, joined by to-mp4.mjs: the rest of a
 * bursar's month at Lagoon View after the fees film.
 *
 * Each part signs in before its first caption, so a part can be filmed again
 * on its own; most of them post to the books and cannot be undone. The data
 * they act on comes from lagoon-finance-setup.py (payroll staff, the petty
 * cash float, the asset register, the bank statement file, last term's
 * arrears), which leaves undone exactly what the film does.
 *
 *   cd .claude && PART=F1 node demo-videos/finance-more-walkthrough.mjs
 *
 * Needs the local backend and school-fe (5174).
 */
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const SCHOOL = "http://lagoon-view.localhost:5174";
const STAFF = "SchoolStaff@2026";
const PEOPLE = {
  ngozi: { email: "ngozi.ibekwe@lagoon-view.example.com", password: STAFF, label: "Finance Admin" },
  principal: { email: "admin@lagoon-view.example.com", password: "School@2025", label: "Principal" },
  kemi: { email: "kemi.afolabi@lagoon-view.example.com", password: STAFF, label: "Finance Admin" },
};
const PART = process.env.PART || "F1";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out/finance-more");
const STEPS = 14;

// The stage of the part being filmed, so a failure can show what was on it.
let filming = null;

async function stageFor(who) {
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
  await pause(1500);
  return stage;
}

const row = (app, text) => app.locator("tr", { hasText: text }).filter({ visible: true }).first();
/** A section switch, drawn as a tab on some screens and a button on others. */
const section = (app, name) => app.getByRole("tab", { name }).or(app.getByRole("button", { name })).first();
const RECEIPT = path.resolve(OUT_DIR, "receipt-lab-chemicals.png");

/** Types into a search picker and chooses the first option matching *option*. */
async function pick(stage, input, text, option) {
  await stage.tap(input, 250);
  await input.press("ControlOrMeta+a");
  await input.pressSequentially(text, { delay: 70 });
  await pause(900);
  await stage.tap(stage.app.getByRole("option", { name: option }).first(), 300);
  await pause(500);
}

const type = async (stage, input, text, delay = 55) => {
  await stage.tap(input, 220);
  await input.press("ControlOrMeta+a");
  await input.pressSequentially(text, { delay });
};

/**
 * Clicks *button* and, when that opens a box asking to confirm, presses the
 * box's *confirm* button. A box opened over a drawer hides the drawer from the
 * page's accessibility tree, so the box's button is the one that matches
 * *confirm* and is not labelled like *button* itself.
 */
async function pressAndConfirm(stage, button, confirm) {
  const { app } = stage;
  const pressed = (await button.innerText()).trim();
  await stage.tap(button);
  const boxes = app.getByRole("dialog").or(app.getByRole("alertdialog"));
  const same = new RegExp(`^\\s*${pressed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);
  // A box's own Close (the X) and Cancel never confirm it.
  const other = boxes.getByRole("button", { name: confirm }).filter({ hasNotText: same }).filter({ hasNotText: /^\s*(Close|Cancel)\s*$/ });
  const asked = await other.first().waitFor({ timeout: 2500 }).then(() => true, () => false);
  if (asked) {
    await pause(900);
    await stage.tap(other.last());
  }
}

/** Picks Main Branch where a form asks which branch a document is for. */
async function chooseBranch(stage, form) {
  const branch = form.getByRole("combobox", { name: /Branch/ });
  if (await branch.count()) {
    await stage.tap(branch.first(), 250);
    await branch.first().selectOption({ label: "Lagoon View Academy Main Branch" });
    await pause(500);
  }
}

/** The principal opens the request waiting on him whose card names *what* (its type or number), and approves it. */
async function approveInInbox(stage, what) {
  const { app, frame, tap } = stage;
  await frame().goto(`${SCHOOL}/workflow/approvals`);
  // Each waiting request is one card, a button that opens its review.
  const review = app.getByRole("button").filter({ hasText: what }).filter({ hasText: "Review" }).first();
  await review.waitFor({ timeout: 30_000 });
  await pause(1600);
  await tap(review);
  await app.getByRole("button", { name: /^Approve/ }).first().waitFor({ timeout: 30_000 });
  await pause(3600);
  await pressAndConfirm(stage, app.getByRole("button", { name: /^Approve/ }).first(), /^Approve|^Confirm/);
  await pause(2800);
}

const parts = {
  /** Scenes 1 to 3: the title, the morning dashboard, and spending against the budget. */
  async F1() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance`);
    await app.getByText("Finance overview").first().waitFor({ timeout: 30_000 });
    await pause(1200);
    await caption(1, "More than fees", "The rest of a bursar's month: spending, salaries, the bank and the books.");
    await pause(4600);
    await caption(2, "The morning view", "Cash in the bank, what families owe, and how many months the cash will last.");
    await pause(5200);
    await tap(app.getByRole("button", { name: "Cash, spend & compliance" }).or(app.getByRole("tab", { name: "Cash, spend & compliance" })).first());
    await app.getByText("Cash runway").first().waitFor();
    await pause(5600);
    await frame().goto(`${SCHOOL}/finance/budgets/budgets`);
    await row(app, "2026 operating plan").waitFor({ timeout: 30_000 });
    await caption(3, "Spending against the plan", "The board approved a budget for the year. Every naira spent is measured against it.");
    await pause(3400);
    await tap(row(app, "2026 operating plan"));
    await app.getByText("LINES · ACTUAL VS BUDGET").or(app.getByText(/Lines · actual vs budget/i)).first().waitFor();
    await pause(3000);
    await row(app, "Teaching & laboratory materials").scrollIntoViewIfNeeded();
    await pause(5400);
    return stage.finish();
  },
};

Object.assign(parts, {
  /** Scene 4, first part: Ngozi records Tolu's claim from the receipt and sends it for approval. */
  async F2a() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/expenses/claims`);
    await app.getByRole("button", { name: "New claim" }).waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(4, "Staff claim it back", "Tolu bought lab chemicals with her own money. Finance records her claim with the receipt, the principal approves, and she is paid.");
    await pause(2400);
    await tap(app.getByRole("button", { name: "New claim" }));
    const form = app.getByRole("dialog", { name: "New expense claim" });
    await form.getByPlaceholder("Staff name").waitFor();
    await type(stage, form.getByPlaceholder("Staff name"), "Tolu Fashola");
    await chooseBranch(stage, form);
    await type(stage, form.getByPlaceholder("e.g. Travel to workshop"), "Chemicals for the SS2 practical");
    await type(stage, form.getByPlaceholder("What was bought"), "Hydrochloric acid, indicators, litmus paper, test tubes", 30);
    await pick(stage, form.getByPlaceholder("5xxx"), "5310", /5310/);
    await pick(stage, form.getByPlaceholder("None").first(), "Science", /Science lab/);
    await type(stage, form.getByPlaceholder("0.00").first(), "18500", 90);
    await pause(900);
    await form.locator("input[type=file]").setInputFiles(RECEIPT);
    await pause(2600);
    await tap(form.getByRole("button", { name: "Create and submit" }));
    await form.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(3200);
    return stage.finish();
  },

  /** Scene 4, second part: the principal approves the claim from his inbox. */
  async F2b() {
    const stage = await stageFor("principal");
    await stage.captionNow(4, "Staff claim it back", "Tolu bought lab chemicals with her own money. Finance records her claim with the receipt, the principal approves, and she is paid.");
    await approveInInbox(stage, /^EX-\d+/);
    return stage.finish();
  },

  /** Scene 4, last part: Ngozi pays Tolu from the bank. */
  async F2c() {
    const stage = await stageFor("ngozi");
    const { app, frame, captionNow, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/expenses/claims`);
    const claim = row(app, "Chemicals for the SS2 practical");
    await claim.waitFor({ timeout: 30_000 });
    await captionNow(4, "Staff claim it back", "Tolu bought lab chemicals with her own money. Finance records her claim with the receipt, the principal approves, and she is paid.");
    await pause(1200);
    await tap(claim);
    const pay = app.getByRole("button", { name: /^Pay/ }).first();
    await pay.waitFor({ timeout: 30_000 });
    await pause(2400);
    await tap(pay);
    const bank = app.getByPlaceholder(/cash\/bank|bank account/i).last();
    if (await bank.count()) await pick(stage, bank, "Lagoon", /Lagoon View main account/);
    await pause(1200);
    await pressAndConfirm(stage, app.getByRole("button", { name: /^(Pay|Record payment|Reimburse)/ }).last(), /^Pay|^Confirm|^Reimburse/);
    await app.getByText(/Paid|Reimbursed/).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 5: a voucher spends the office float, and a top-up from the bank refills it. */
  async F3() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/expenses/petty-cash`);
    await app.getByRole("button", { name: "New voucher" }).waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(5, "The cash box", "Small payments come out of a float kept in the office, which is topped up from the bank.");
    await pause(3600);
    await tap(app.getByRole("button", { name: "New voucher" }));
    const voucher = app.getByRole("dialog", { name: "New voucher" });
    await voucher.getByPlaceholder("5xxx").waitFor();
    await pick(stage, voucher.getByPlaceholder("5xxx"), "5300", /5300/);
    await type(stage, voucher.getByPlaceholder("0.00").first(), "4800", 90);
    await type(stage, voucher.getByPlaceholder("What it was for"), "Bottled water and snacks for the PTA meeting", 30);
    await pause(1400);
    await tap(voucher.getByRole("button", { name: "Save & post" }));
    await voucher.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(3000);
    await tap(app.getByRole("button", { name: /^Replenish/ }));
    const refill = app.getByRole("dialog", { name: "Replenish float" });
    const move = refill.getByRole("button", { name: /^Move ₦/ });
    await move.waitFor();
    await pause(1200);
    await pick(stage, refill.getByPlaceholder("Default cash/bank"), "Lagoon", /Lagoon View main account/);
    await pause(1600);
    await tap(move);
    await refill.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 6, first part: Ngozi raises October's run from the roster and sends it for approval. */
  async F4a() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/payroll`);
    await app.getByRole("button", { name: "New payroll run" }).waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(6, "Paying the staff", "Each salary is worked out from the person's pay structure, with tax and pension taken off.");
    await pause(4200);
    await tap(app.getByRole("button", { name: "New payroll run" }));
    const form = app.getByRole("dialog", { name: "New payroll run" });
    await form.getByPlaceholder("e.g. June 2026").waitFor();
    await type(stage, form.getByPlaceholder("e.g. June 2026"), "October 2026");
    await pause(1800);
    await tap(form.getByRole("button", { name: "Generate run" }));
    await form.waitFor({ state: "hidden", timeout: 60_000 });
    await pause(1600);
    const run = app.locator("tr", { hasText: "October 2026" }).filter({ hasNotText: "Cancelled" }).filter({ visible: true }).first();
    await run.waitFor({ timeout: 30_000 });
    await tap(run);
    const submit = app.getByRole("button", { name: /Submit for approval/i });
    await submit.waitFor({ timeout: 30_000 });
    await pause(4200);
    await pressAndConfirm(stage, submit, /^Submit|^Confirm|^Send/);
    await app.getByText(/Awaiting approval|Pending approval|submitted/i).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(3000);
    return stage.finish();
  },

  /** Scene 6, second part: the principal approves the run. */
  async F4b() {
    const stage = await stageFor("principal");
    await stage.captionNow(6, "Paying the staff", "Each salary is worked out from the person's pay structure, with tax and pension taken off.");
    await approveInInbox(stage, /^PL-\d+/);
    return stage.finish();
  },

  /** Scene 6, last part, and scene 7: Ngozi posts the approved run, opens a payslip, then the statutory returns. */
  async F4c() {
    const stage = await stageFor("ngozi");
    const { app, frame, captionNow, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/payroll`);
    const run = app.locator("tr", { hasText: "October 2026" }).filter({ hasNotText: "Cancelled" }).filter({ visible: true }).first();
    await run.waitFor({ timeout: 30_000 });
    await captionNow(6, "Paying the staff", "Each salary is worked out from the person's pay structure, with tax and pension taken off.");
    await pause(1000);
    await tap(run);
    const post = app.getByRole("button", { name: /Calculate & post/ });
    if (await post.waitFor({ timeout: 6000 }).then(() => true, () => false)) {
      await pause(2200);
      await pressAndConfirm(stage, post, /^Post|^Calculate|^Confirm/);
      await app.getByText("Calculated").filter({ visible: true }).first().waitFor({ timeout: 60_000 });
    }
    const pay = app.getByRole("button", { name: /^Pay net/ });
    await pay.waitFor({ timeout: 30_000 });
    await pause(2600);
    await tap(pay);
    const bank = app.getByPlaceholder("Default cash/bank");
    if (await bank.first().waitFor({ timeout: 3000 }).then(() => true, () => false)) {
      await pick(stage, bank.last(), "Lagoon", /Lagoon View main account/);
    }
    await pause(1400);
    await tap(app.getByRole("button", { name: /^Pay ₦/ }).last());
    await app.getByText("Paid").filter({ visible: true }).first().waitFor({ timeout: 60_000 });
    await pause(3600);
    await frame().goto(`${SCHOOL}/finance/payroll`);
    await section(app, "Statutory returns").waitFor({ timeout: 30_000 });
    await caption(7, "The taxes on salaries", "PAYE, pension and the other deductions are set aside from each run, ready to file and pay.");
    await tap(section(app, "Statutory returns"));
    await pause(4400);
    await frame().goto(`${SCHOOL}/finance/budgets/tax`);
    await app.getByText(/PAYE/).first().waitFor({ timeout: 30_000 });
    await pause(5200);
    return stage.finish();
  },

  /** Scene 9, first part: Ngozi raises the scholarship and is told it needs a colleague to post. */
  async F6() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/receivables/concessions`);
    await app.getByRole("button", { name: /^New/ }).first().waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(9, "A scholarship", "Daniel has won a full scholarship for the term. A large award needs a second person in finance to post it.");
    await pause(2600);
    await tap(app.getByRole("button", { name: /^New/ }).first());
    const conc = app.getByRole("dialog", { name: "New concession" });
    await conc.getByRole("button", { name: "Scholarship" }).waitFor();
    await tap(conc.getByRole("button", { name: "Scholarship" }));
    await pick(stage, conc.getByPlaceholder("Select customer"), "Daniel Nwankwo", /Daniel Nwankwo/);
    await pick(stage, conc.getByPlaceholder(/Select a customer first|Select invoice|invoice/i).first(), "IV-92610216", /IV-92610216/);
    await tap(conc.getByRole("button", { name: "% of balance" }));
    await type(stage, conc.getByPlaceholder("0", { exact: true }).first(), "100", 120);
    await type(stage, conc.getByPlaceholder("e.g. Sibling discount 10%"), "Term scholarship: first in the JSS2 entrance exam", 30);
    await pause(2400);
    await pressAndConfirm(stage, conc.getByRole("button", { name: "Post concession" }), /^Post|^Confirm/);
    await app.getByText(/one person may grant alone/).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(5200);
    return stage.finish();
  },

  /** Scene 9, last part: Kemi, a second finance admin, posts the scholarship. */
  async F6b() {
    const stage = await stageFor("kemi");
    const { app, frame, captionNow, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/receivables/concessions`);
    const draft = row(app, "Daniel Nwankwo");
    await draft.waitFor({ timeout: 30_000 });
    await captionNow(9, "A scholarship", "Daniel has won a full scholarship for the term. A large award needs a second person in finance to post it.");
    await pause(1400);
    await tap(draft);
    const post = app.getByRole("button", { name: /^Post/ }).first();
    await post.waitFor({ timeout: 30_000 });
    await pause(2800);
    await pressAndConfirm(stage, post, /^Post|^Confirm/);
    await app.getByText("Posted").filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(3600);
    return stage.finish();
  },

  /** Scene 10: a wrong charge taken off with a credit note, and a bill split into three instalments. */
  async F6c() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/receivables/credit-notes`);
    await app.getByRole("button", { name: "Issue note" }).waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(10, "Fixing a bill, and paying in parts", "A wrong charge is taken off with a credit note, and a family is allowed to pay in three instalments.");
    await pause(1800);
    await tap(app.getByRole("button", { name: "Issue note" }));
    const note = app.getByRole("dialog", { name: /Issue credit/ });
    await note.getByPlaceholder("Select customer").waitFor();
    await pick(stage, note.getByPlaceholder("Select customer"), "Musa Adeleke", /Musa Adeleke/);
    await pick(stage, note.getByPlaceholder("Revenue account to reverse"), "4100", /4100/);
    await pick(stage, note.getByPlaceholder(/Select a customer first|Select invoice|invoice/i).first(), "IV-92610213", /IV-92610213/);
    const branch = note.getByRole("combobox", { name: "Branch" });
    if (await branch.count()) await branch.selectOption({ label: "Lagoon View Academy Main Branch" });
    await type(stage, note.getByPlaceholder("0.00").first(), "1000", 120);
    await type(stage, note.getByPlaceholder("Why this adjustment?"), "Library charge billed in error: Musa has his own reading-programme books", 28);
    await tap(note.getByRole("button", { name: /Apply to oldest invoices/ }));
    await pause(2200);
    await pressAndConfirm(stage, note.getByRole("button", { name: "Issue note" }), /^Issue|^Confirm/);
    await note.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(2800);

    await frame().goto(`${SCHOOL}/finance/receivables/payment-plans`);
    await app.getByRole("button", { name: /^New/ }).first().waitFor({ timeout: 30_000 });
    await pause(1200);
    await tap(app.getByRole("button", { name: /^New/ }).first());
    const plan = app.getByRole("dialog", { name: "New payment plan" });
    await plan.getByPlaceholder("Select customer").waitFor();
    await pick(stage, plan.getByPlaceholder("Select customer"), "Temitope Adegoke", /Temitope Adegoke/);
    await pick(stage, plan.getByPlaceholder(/Select a customer first|Select invoice|invoice/i).first(), "IV-92610223", /IV-92610223/);
    await type(stage, plan.locator("input[type=number]").first(), "3", 150);
    await tap(plan.getByRole("button", { name: "Monthly" }));
    await pause(3600);
    await tap(plan.getByRole("button", { name: "Create plan" }));
    await plan.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(3200);
    return stage.finish();
  },

  /** Scene 11: last term's arrears by age, and the reminders raised for them. */
  async F7() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/receivables/dunning`);
    await app.getByRole("button", { name: "Run reminders now" }).waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(11, "Gentle reminders", "Bills past their due date are grouped by age, and families are reminded on the school's schedule.");
    await pause(3600);
    await tap(section(app, /^Policies/));
    await pause(3600);
    await tap(section(app, /^Reminder queue/));
    const daniel = row(app, "Daniel Nwankwo");
    await daniel.waitFor({ timeout: 30_000 });
    await pause(2600);
    await pressAndConfirm(stage, daniel.getByRole("button", { name: "Send" }), /^Send|^Confirm/);
    await pause(4200);
    return stage.finish();
  },

  /** Scene 12: the asset register, and October's depreciation. */
  async F8() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/budgets/assets`);
    await app.getByRole("button", { name: "Run depreciation" }).waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(12, "What the school owns", "The bus, the generator, the laptops: each loses a little value every month, and the books record it.");
    await pause(4600);
    await tap(app.getByRole("button", { name: "Run depreciation" }));
    const run = app.getByRole("dialog", { name: "Run depreciation" });
    await run.getByRole("button", { name: "Post depreciation" }).waitFor();
    await pause(3600);
    await tap(run.getByRole("button", { name: "Post depreciation" }));
    await run.waitFor({ state: "hidden", timeout: 60_000 });
    await pause(3600);
    return stage.finish();
  },

  /** Scenes 13 and 14: the board's reports from the one ledger, then closing September. */
  async F9() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/reports/trial-balance`);
    await app.getByText(/Trial Balance/i).first().waitFor({ timeout: 30_000 });
    await pause(1000);
    await caption(13, "Reports for the board", "Every report comes from the same ledger, ready to print or export.");
    await pause(4200);
    for (const report of ["income-statement", "balance-sheet"]) {
      await frame().goto(`${SCHOOL}/finance/reports/${report}`);
      await pause(4800);
    }
    await frame().goto(`${SCHOOL}/finance/setup/periods`);
    await app.getByText("Posting periods").waitFor({ timeout: 30_000 });
    await caption(14, "Closing the month", "Once September is closed, nothing more can be posted into it, and every change is on record.");
    await pause(2200);
    // Each branch closes its own months.
    await app.locator("select").filter({ hasText: "All branches" }).first().selectOption({ label: "Lagoon View Academy Main Branch" });
    await pause(1600);
    const september = app.getByRole("button").filter({ hasText: "September 2026" }).first();
    await september.scrollIntoViewIfNeeded();
    await tap(september);
    await pause(2200);
    const close = app.getByRole("button", { name: "Run close steps" });
    await close.waitFor({ timeout: 30_000 });
    await pause(3200);
    await pressAndConfirm(stage, close, /^Run period close|^Confirm/);
    await app.getByRole("button").filter({ hasText: "September 2026" }).filter({ hasText: "Closed" }).first().waitFor({ timeout: 60_000 });
    await pause(3000);
    await frame().goto(`${SCHOOL}/finance/audit`);
    await pause(5600);
    return stage.finish();
  },

  /**
   * Scene 8: October's statement matched against the books. The statement's
   * lines are entered beforehand through the screen's own manual import
   * (import-statement in the film's notes); Auto-match pairs what it can, the
   * three same-sized ₦7,000 receipts are matched by hand, and the bank charge
   * the books never heard of becomes an adjusting entry.
   */
  async F5() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/finance/bank-reconciliation`);
    await app.getByText("Match progress").waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(8, "Checking the bank", "The bank's statement is matched to the books line by line, so anything the school did not know about shows up.");
    await pause(3800);
    await pressAndConfirm(stage, app.getByRole("button", { name: "Auto-match" }), /^Auto-match|^Match|^Confirm/);
    await pause(4200);
    const charge = app.getByRole("button").filter({ hasText: "NIP TRANSFER FEE AND VAT" }).first();
    await charge.scrollIntoViewIfNeeded();
    await tap(charge);
    await pause(1400);
    await tap(app.getByRole("button", { name: "Add adjusting entry" }));
    const adjust = app.getByRole("dialog", { name: "Add adjusting entry" });
    const postMatch = adjust.getByRole("button", { name: "Post & match" });
    await postMatch.waitFor({ timeout: 30_000 });
    await pause(1200);
    // The posting date's calendar opens on its own; choosing the date it already shows puts it away.
    const calendar = app.getByRole("dialog").filter({ hasText: "Today" }).filter({ hasNotText: "Add adjusting entry" });
    if (await calendar.isVisible().catch(() => false)) {
      await calendar.getByRole("button", { name: /21/ }).or(calendar.getByText("21", { exact: true })).first().click();
      await pause(600);
    }
    await pause(2400);
    await tap(postMatch);
    await adjust.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(2400);
    // Three ₦7,000 receipts within days of each other: the bursar pairs these by hand.
    for (const [bank, book] of [["EBERE BELLO SCHOOL FEES", "Receipt: Ebere Bello"], ["TUNDE ADELEKE SCHOOL FEES", "Receipt: Tunde Adeleke"], ["GRACE NWANKWO SCHOOL FEES", "Receipt: Grace Nwankwo"]]) {
      const line = app.getByRole("button").filter({ hasText: bank }).first();
      if (!(await line.count())) continue;
      await tap(line, 250);
      await tap(app.getByRole("button").filter({ hasText: book }).first(), 250);
      await pause(700);
      await tap(app.getByRole("button", { name: "Match selected" }));
      await pause(1600);
    }
    await pause(1400);
    await pressAndConfirm(stage, app.getByRole("button", { name: "Complete reconciliation" }), /^Complete|^Confirm|^Mark/);
    await pause(4200);
    return stage.finish();
  },
});

if (!parts[PART]) throw new Error(`PART must be one of ${Object.keys(parts).join(", ")}`);
try {
  console.log(await parts[PART]());
} catch (error) {
  const shot = path.join(OUT_DIR, `failed-${PART}.png`);
  await filming?.page.screenshot({ path: shot }).catch(() => {});
  console.error(`${PART} failed; the stage at that moment is ${shot}`);
  throw error;
}
