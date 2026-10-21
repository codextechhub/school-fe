/**
 * Films "Buying for the school" in parts, joined by to-mp4.mjs.
 *
 * One purchase, ten microscopes for the Biology lab, from five people's
 * screens. Nearly every step here cannot be undone (a request, an approval,
 * an order, a delivery, a bill, a payment), so each is a part of its own: a
 * part that fails is filmed again from where the data now stands, and the
 * parts after it carry on. Between some parts an off-camera step runs through
 * the same API the screens use: three suppliers' quotes, and the approvals of
 * the order, the bill and the payment, which the film cuts straight past.
 *
 *   cd .claude && PART=S1 node demo-videos/procurement-walkthrough.mjs
 *
 * Parts, in order: S1 S2 S3 S4 S5 quotes S6 S7 approve-po S8 S9 approve-bill
 * S10 approve-payment S11 S12. Needs the local backend and school-fe (5174), with
 * lagoon-procurement-setup.py run on the local data.
 */
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const SCHOOL = "http://lagoon-view.localhost:5174";
const API = "http://localhost:8000/v1";
const TENANT = "lagoon-view";
const ENTITY = "LAGOONVIEW";
const STAFF = "SchoolStaff@2026";
const PEOPLE = {
  tolu: { email: "tolu.fashola@lagoon-view.example.com", password: STAFF, label: "Teacher" },
  bakare: { email: "oluwaseun.bakare@lagoon-view.example.com", password: STAFF, label: "Head of Sciences" },
  ngozi: { email: "ngozi.ibekwe@lagoon-view.example.com", password: STAFF, label: "Finance Admin" },
  principal: { email: "admin@lagoon-view.example.com", password: "School@2025", label: "Principal" },
  kemi: { email: "kemi.afolabi@lagoon-view.example.com", password: STAFF, label: "Procurement Admin" },
};
const TITLE = "Biology lab microscopes";
const PART = process.env.PART || "S1";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out/procurement");
const STEPS = 11;
const QUOTES = [["LABTECH", 82_000], ["SCIENTIA", 85_000], ["UNILAB", 91_500]];

// ── the API, for the steps the film cuts past ─────────────────────────────

const tokens = {};
async function signIn(who) {
  if (tokens[who]) return tokens[who];
  const response = await fetch(`${API}/user/auth/login/`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: PEOPLE[who].email, password: PEOPLE[who].password, tenant: TENANT }),
  });
  const body = await response.json();
  if (!body.success) throw new Error(`${who} could not sign in: ${body.message}`);
  return (tokens[who] = body.data.access);
}

async function api(who, method, route, body) {
  const join = route.includes("?") ? "&" : "?";
  const response = await fetch(`${API}${route}${join}entity=${ENTITY}&tenant=${TENANT}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${await signIn(who)}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${route} as ${who}: ${response.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data.data;
}

/** Approves whatever *documentType* waits on each of *approvers* in turn, as they would in their inbox. */
async function approveAll(documentType, approvers) {
  for (const who of approvers) {
    const waiting = await api(who, "GET", `/procurement/approvals/?document_type=${documentType}`);
    const rows = Array.isArray(waiting) ? waiting : waiting?.results ?? [];
    if (!rows.length) {
      console.log(`  nothing waiting on ${who} for ${documentType}`);
      continue;
    }
    for (const row of rows) {
      const result = await api(who, "POST", `/procurement/approvals/${row.id}/actions/`, { action: "APPROVED", comment: "" });
      console.log(`  ${who} approved ${row.document_number || row.id}: ${result.status}`);
    }
  }
}

async function enterQuotes() {
  const rfqs = await api("kemi", "GET", `/procurement/rfqs/?search=${encodeURIComponent(TITLE)}`);
  const rfq = (Array.isArray(rfqs) ? rfqs : rfqs.results).find((row) => /open|issued/i.test(row.status || row.rfq_status || ""));
  if (!rfq) throw new Error("No open RFQ for the microscopes.");
  const detail = await api("kemi", "GET", `/procurement/rfqs/${rfq.id}/`);
  const line = detail.lines[0];
  for (const [vendor, naira] of QUOTES) {
    const quote = await api("kemi", "POST", "/procurement/quotations/", {
      rfq: rfq.id, vendor, quote_date: "2026-10-21", valid_until: "2026-11-30", lead_time_days: 7,
      reference: `${vendor}-Q-2210`,
      lines: [{ rfq_line: line.id, description: line.description, quantity: Number(line.quantity), unit_price: naira * 100 }],
    });
    await api("kemi", "POST", `/procurement/quotations/${quote.id}/submit/`, {});
    console.log(`  ${vendor} quoted N${naira.toLocaleString()} a unit`);
  }
}

// ── the stage ─────────────────────────────────────────────────────────────

async function stageFor(who) {
  const stage = await openStage({
    base: SCHOOL, start: `${SCHOOL}/login`, device: "browser", school: "Lagoon View Academy",
    label: PEOPLE[who].label, steps: STEPS, outDir: OUT_DIR,
  });
  const { app } = stage;
  await app.getByPlaceholder(/Email, staff ID/).waitFor({ timeout: 30_000 });
  await app.getByPlaceholder(/Email, staff ID/).fill(PEOPLE[who].email);
  await app.getByPlaceholder("Enter your password").fill(PEOPLE[who].password);
  await app.getByPlaceholder("Enter your password").press("Enter");
  await app.getByRole("button", { name: "Open account menu" }).waitFor({ timeout: 30_000 });
  return stage;
}

const row = (app, text) => app.locator("tr", { hasText: text }).filter({ visible: true }).first();
const drawer = (app, name) => app.getByRole("dialog", { name }).last();

/** Types into a search picker and chooses the first option matching *option*. */
async function pick(stage, input, text, option) {
  await stage.tap(input, 250);
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

/** The Award control under the column marked "Lowest bid", refusing to go on unless that column is Labtech. */
async function lowestBidAward(compare) {
  const awards = compare.getByRole("button", { name: "Award" });
  for (let i = 0; i < (await awards.count()); i += 1) {
    const header = await awards.nth(i).evaluate((el) => {
      const cell = el.closest("td");
      return cell.closest("table").rows[0].cells[cell.cellIndex].textContent;
    });
    if (/Lowest bid/.test(header)) {
      if (!/Labtech/.test(header)) throw new Error(`The lowest bid is not Labtech's: ${header}`);
      return awards.nth(i);
    }
  }
  throw new Error("No Award control under the lowest bid.");
}

/** Clicks *button* and, when that opens a further dialog asking to confirm, presses its *confirm* button. */
async function pressAndConfirm(stage, button, confirm) {
  const dialogs = stage.app.getByRole("dialog").or(stage.app.getByRole("alertdialog"));
  const before = await dialogs.count();
  await stage.tap(button);
  const opened = await dialogs.nth(before).waitFor({ timeout: 2500 }).then(() => true, () => false);
  if (opened) {
    await pause(900);
    await stage.tap(dialogs.nth(before).getByRole("button", { name: confirm }).last());
  }
}

async function approveOnCamera(who, step, title, line, finished) {
  const stage = await stageFor(who);
  const { app, frame, caption, tap } = stage;
  await frame().goto(`${SCHOOL}/procurement/approvals`);
  await row(app, TITLE).waitFor({ timeout: 30_000 });
  await pause(800);
  await caption(step, title, line);
  await pause(1600);
  await tap(row(app, TITLE));
  await app.getByRole("button", { name: "Approve" }).waitFor();
  await pause(3200);
  await tap(app.getByRole("button", { name: "Approve" }));
  await app.getByText(finished).first().waitFor({ timeout: 30_000 });
  await pause(2600);
  return stage.finish();
}

// ── the parts ─────────────────────────────────────────────────────────────

const parts = {
  async S1() {
    const stage = await stageFor("tolu");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/requisitions`);
    await app.getByRole("button", { name: "New Requisition" }).waitFor({ timeout: 30_000 });
    const pending = app.getByRole("tab", { name: /Pending Approval/ }).or(app.getByRole("button", { name: /^Pending Approval/ })).first();
    await pending.click();
    await pause(800);
    await caption(1, "Buying for the school", "Ten microscopes for the Biology lab: who asks, who approves, who buys, who pays.");
    await pause(4200);
    await caption(2, "Ask for what the lab needs", "Any teacher can ask. The budget panel shows what the lab can still spend.");
    await tap(app.getByRole("button", { name: "New Requisition" }));
    const form = drawer(app, "New Requisition");
    await form.getByPlaceholder("What is being requested?").waitFor();
    await type(stage, form.getByPlaceholder("What is being requested?"), TITLE);
    await tap(form.getByPlaceholder("Select cost centre"), 250);
    await pause(700);
    await tap(app.getByRole("option", { name: /Science lab/ }).first(), 300);
    await form.getByText("Available").first().waitFor({ timeout: 15_000 });
    await pause(2200);
    await type(stage, form.getByPlaceholder("Item description"), "Student compound microscope, 40x to 1000x");
    await type(stage, form.getByRole("spinbutton", { name: "Quantity" }).or(form.getByLabel("Quantity")).first(), "10", 120);
    await type(stage, form.getByPlaceholder("Unit"), "each");
    await type(stage, form.getByPlaceholder("0.00").first(), "85000", 90);
    await type(stage, form.getByPlaceholder("Explain why this purchase is needed"),
      "SS2 practicals need one microscope per pair; four work today.", 28);
    await pause(1600);
    await tap(form.getByRole("button", { name: "Create Requisition" }));
    await app.getByText(/submitted/i).first().waitFor({ timeout: 30_000 });
    await pause(1200);
    if ((await pending.getAttribute("aria-selected")) !== "true") await tap(pending);
    await pause(3600);
    return stage.finish();
  },

  S2: () => approveOnCamera("bakare", 3, "Her line manager decides first",
    "It goes to whoever she reports to on the school's organogram.", /moved to|Approved/),
  S3: () => approveOnCamera("ngozi", 4, "Finance approves",
    "It lands in Ngozi's approvals with the budget beside it.", /moved to|Approved/),
  S4: () => approveOnCamera("principal", 5, "Large purchases go higher",
    "At ₦850,000 it is over the school's ₦500,000 line, so the principal signs off too.", /fully approved|Approved/),

  async S5() {
    const stage = await stageFor("kemi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/sourcing/rfqs`);
    await app.getByRole("button", { name: "New RFQ" }).waitFor({ timeout: 30_000 });
    await pause(800);
    await caption(6, "Three quotes, the best price wins", "Kemi asks three suppliers to quote and compares them side by side.");
    await tap(app.getByRole("button", { name: "New RFQ" }));
    const form = drawer(app, "New RFQ");
    await form.getByPlaceholder("Optional - prefill from an approved requisition").waitFor();
    await type(stage, form.getByRole("textbox").first(), TITLE);
    await pick(stage, form.getByPlaceholder("Optional - prefill from an approved requisition"), "PR", /APPROVED/);
    await form.getByPlaceholder("Description").first().waitFor();
    await pause(900);
    for (const vendor of ["Labtech", "Scientia", "Unilab"]) {
      await pick(stage, form.getByPlaceholder("Add a vendor to invite"), vendor, new RegExp(vendor, "i"));
    }
    await pause(1600);
    await tap(form.getByRole("button", { name: "Create & Issue" }));
    await app.getByText(/issued/i).first().waitFor({ timeout: 30_000 });
    await pause(2400);
    return stage.finish();
  },

  quotes: enterQuotes,

  async S6() {
    const stage = await stageFor("kemi");
    const { app, frame, captionNow, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/sourcing/quotations`);
    await app.getByRole("button", { name: "Compare" }).waitFor({ timeout: 30_000 });
    await pause(600);
    await captionNow(6, "Three quotes, the best price wins", "Kemi asks three suppliers to quote and compares them side by side.");
    await pause(1600);
    await tap(app.getByRole("button", { name: "Compare" }));
    const compare = app.getByRole("dialog", { name: "Compare quotations" });
    await compare.getByText("Lowest bid").waitFor({ timeout: 30_000 });
    await pause(4200);
    const award = await lowestBidAward(compare);
    await tap(award);
    const confirm = app.getByRole("dialog", { name: "Award this quotation?" });
    await confirm.getByRole("button", { name: "Award" }).waitFor();
    await pause(1200);
    await tap(confirm.getByRole("button", { name: "Award" }));
    await app.getByText(/purchase order PO-/i).first().waitFor({ timeout: 30_000 });
    await pause(2600);
    return stage.finish();
  },

  async S7() {
    const stage = await stageFor("kemi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/purchase-orders`);
    await row(app, "LABTECH").or(row(app, "Labtech")).first().waitFor({ timeout: 30_000 });
    await pause(600);
    await caption(7, "The order goes out", "The purchase order is drafted from the winning quote and emailed once approved.");
    await tap(row(app, "LABTECH").or(row(app, "Labtech")).first());
    await app.getByRole("button", { name: "Submit for Approval" }).waitFor();
    await pause(3200);
    await tap(app.getByRole("button", { name: "Submit for Approval" }));
    const raise = app.getByRole("dialog", { name: /Raise this purchase order/ });
    await raise.waitFor();
    await pause(900);
    const email = raise.getByRole("checkbox").first();
    if ((await email.getAttribute("aria-checked")) !== "true" && !(await email.isChecked().catch(() => false))) await tap(email);
    await pause(1600);
    await tap(raise.getByRole("button", { name: "Raise for Approval" }));
    await app.getByText(/Pending Approval|submitted/i).first().waitFor({ timeout: 30_000 });
    await pause(2200);
    return stage.finish();
  },

  "approve-po": () => approveAll("procurement.purchase_order", ["ngozi", "principal"]),

  async S8() {
    const stage = await stageFor("kemi");
    const { app, frame, captionNow, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/purchase-orders`);
    const po = row(app, "LABTECH").or(row(app, "Labtech")).first();
    await po.waitFor({ timeout: 30_000 });
    await captionNow(7, "The order goes out", "The purchase order is drafted from the winning quote and emailed once approved.");
    await tap(po);
    await app.getByRole("tab", { name: /Vendor Email/ }).waitFor({ timeout: 30_000 });
    await pause(2200);
    await tap(app.getByRole("tab", { name: /Vendor Email/ }));
    await pause(3600);
    await frame().goto(`${SCHOOL}/procurement/goods-receipts`);
    await app.getByRole("button", { name: "New Goods Receipt" }).waitFor();
    await caption(8, "Check what arrives", "Ten arrive. One has a cracked lens, so nine are accepted and one goes back.");
    await tap(app.getByRole("button", { name: "New Goods Receipt" }));
    const form = drawer(app, "New Goods Receipt");
    await pick(stage, form.getByPlaceholder("No PO"), "PO", /LABTECH/);
    await type(stage, form.getByPlaceholder("Delivery note or waybill"), "WB-2211");
    const accepted = form.getByLabel(/Accepted qty/).first();
    await accepted.waitFor();
    await type(stage, accepted, "9", 150);
    await type(stage, form.getByLabel(/Rejected qty/).first(), "1", 150);
    await type(stage, form.getByPlaceholder(/Record inspection findings/),
      "One microscope arrived with a cracked objective lens; returned to Labtech.", 26);
    await pause(1400);
    await tap(form.getByRole("button", { name: "Create & Post" }));
    await app.getByText(/Posted/).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(3000);
    return stage.finish();
  },

  async S9() {
    const stage = await stageFor("ngozi");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/vendor-invoices`);
    await app.getByRole("button", { name: "Record Invoice" }).waitFor({ timeout: 30_000 });
    await pause(600);
    await caption(9, "The bill is checked before it is paid", "The supplier's invoice is matched to the order and to what arrived.");
    await tap(app.getByRole("button", { name: "Record Invoice" }));
    const form = drawer(app, "Record Invoice");
    await pick(stage, form.getByPlaceholder("Select vendor"), "Labtech", /Labtech/i);
    await pick(stage, form.getByPlaceholder("Select a received PO"), "PO", /PO-92610212/);
    const number = form.getByLabel(/Vendor invoice #/);
    await type(stage, number, "LT-INV-0457");
    await pause(2400);
    await tap(form.getByRole("button", { name: "Save Draft" }));
    await form.waitFor({ state: "hidden", timeout: 30_000 });
    await pause(1400);
    const bill = row(app, "LT-INV-0457");
    if (!(await app.getByRole("tab", { name: /3-Way Match/ }).count())) await tap(bill);
    await tap(app.getByRole("tab", { name: /3-Way Match/ }));
    await pause(900);
    const run = app.getByRole("button", { name: "Run Match" });
    if (await run.count()) await tap(run);
    await app.getByText(/3-way match passed/i).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(3200);
    await tap(app.getByRole("button", { name: "Submit for Approval" }));
    await pause(2600);
    return stage.finish();
  },

  "approve-bill": () => approveAll("procurement.vendor_invoice", ["kemi", "principal"]),

  async S10() {
    const stage = await stageFor("ngozi");
    const { app, frame, captionNow, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/vendor-invoices`);
    const bill = row(app, "LT-INV-0457").or(row(app, "LABTECH")).first();
    await bill.waitFor({ timeout: 30_000 });
    await captionNow(9, "The bill is checked before it is paid", "The supplier's invoice is matched to the order and to what arrived.");
    await tap(bill);
    await app.getByText(/Posted/).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(2600);
    await frame().goto(`${SCHOOL}/procurement/vendor-payments`);
    await app.getByRole("button", { name: "New Payment" }).waitFor();
    await caption(10, "Pay the supplier", "Ngozi pays from the school's bank account. The ledger updates itself.");
    await tap(app.getByRole("button", { name: "New Payment" }));
    const form = drawer(app, "New Payment");
    await pick(stage, form.getByPlaceholder(/Select vendor|Search vendor/).first(), "Labtech", /Labtech/i);
    await tap(form.getByPlaceholder("Select bank account"), 250);
    await pause(700);
    await tap(app.getByRole("option", { name: /Lagoon View main account/ }).first(), 300);
    await pause(900);
    await tap(form.getByRole("checkbox", { name: /^Select / }).first());
    await pause(2600);
    await tap(form.getByRole("button", { name: "Create & Submit" }));
    await pause(2600);
    return stage.finish();
  },

  "approve-payment": () => approveAll("procurement.vendor_payment", ["kemi", "principal"]),

  async S11() {
    const stage = await stageFor("ngozi");
    const { app, frame, captionNow, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/vendor-payments`);
    const payment = row(app, "LABTECH").or(row(app, "Labtech")).first();
    await payment.waitFor({ timeout: 30_000 });
    await captionNow(10, "Pay the supplier", "Ngozi pays from the school's bank account. The ledger updates itself.");
    await tap(payment);
    await app.getByRole("button", { name: "Post Payment" }).waitFor({ timeout: 30_000 });
    await pause(1600);
    await pressAndConfirm(stage, app.getByRole("button", { name: "Post Payment" }), /^Post|^Confirm/);
    await app.getByText(/Posted/).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
    await pause(3000);
    return stage.finish();
  },

  async S12() {
    const stage = await stageFor("principal");
    const { app, frame, caption, tap } = stage;
    await frame().goto(`${SCHOOL}/procurement/requisitions`);
    await row(app, TITLE).waitFor({ timeout: 30_000 });
    await pause(600);
    await caption(11, "Every step on record", "Who asked, who approved, what arrived and what was paid, in one trail.");
    await tap(row(app, TITLE));
    await tap(app.getByRole("tab", { name: "Approval Trail" }));
    await pause(4200);
    await frame().goto(`${SCHOOL}/procurement/analytics/spend`);
    await app.getByText("Total spend").first().waitFor({ timeout: 30_000 });
    await pause(4600);
    return stage.finish();
  },
};

if (!parts[PART]) throw new Error(`PART must be one of ${Object.keys(parts).join(", ")}`);
console.log(await parts[PART]());
