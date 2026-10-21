/**
 * Films "School fees, from bill to ledger" in four parts, joined by to-mp4.mjs.
 *
 *   A  the Finance Admin's desk: the overview, when fees fall due, the fee
 *      structure, billing JSS2 A, and Zainab's new bill (browser stage)
 *   B1 Zainab's father, Mr Bello, finds the bill on his phone (phone stage)
 *   B2 Patricia pays Tunde's last balance by card (phone stage)
 *   C  the Finance Admin again: the card payment posted, a cash payment at the
 *      school office, a statement and the books (browser stage)
 *
 * Each part signs in before its first caption, and the joined film starts
 * each part at that caption, so a part can be filmed again on its own. Three
 * steps cannot be undone: billing the class (A), the card payment (B2) and the
 * cash payment (C). REHEARSE=1 walks every part and stops short of each.
 *
 *   cd .claude && PART=A node demo-videos/fees-walkthrough.mjs
 *   node demo-videos/to-mp4.mjs demo-videos/out/fees.mp4 <A.webm> <B1.webm> <B2.webm> <C.webm>
 *
 * Needs the local backend and school-fe (5174), and for the phone parts the
 * filming backend (demo-backend.py, 8010) with the parent app pointed at it
 * (launch config "parent-fe-demo", 5186). Local data: Lagoon View, with
 * lagoon-procurement-setup.py run and Mr E. Bello's parent account active.
 */
import crypto from "node:crypto";
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const SCHOOL = "http://lagoon-view.localhost:5174";
const PARENT = "http://lagoon-view.localhost:5186";
const API = "http://localhost:8010/v1";
const FINANCE = { email: "ngozi.ibekwe@lagoon-view.example.com", password: "SchoolStaff@2026" };
const BELLO = { email: "bello.household@example.ng", password: "Parent@School2026" };
const PATRICIA = { email: "patricia.okafor@example.ng", password: "Parent@School2026" };
const FAKE_SECRET = "fake-dev-secret";
const PART = process.env.PART || "A";
const REHEARSE = process.env.REHEARSE === "1";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out");
const STEPS = 12;
const PARENT_STORAGE = {
  "xvs.parent.install-offer-dismissed": "1",
  "xvs.parent.push": JSON.stringify({ choice: "not-now" }),
};

/** Says what a rehearsal would have done at a step that cannot be undone, and does not do it. */
const irreversible = async (what, act) => {
  if (REHEARSE) {
    console.log(`  rehearsal: stopped before ${what}`);
    return false;
  }
  await act();
  return true;
};

async function signInSchool(app, who) {
  await app.getByPlaceholder(/Email, staff ID/).waitFor({ timeout: 30_000 });
  await app.getByPlaceholder(/Email, staff ID/).fill(who.email);
  await app.getByPlaceholder("Enter your password").fill(who.password);
  await app.getByPlaceholder("Enter your password").press("Enter");
  await app.getByRole("button", { name: "Open account menu" }).waitFor({ timeout: 30_000 });
}

async function signInParent(app, who) {
  await app.locator("input[name=email]").waitFor({ timeout: 30_000 });
  await app.locator("input[name=email]").fill(who.email);
  await app.locator("input[name=password]").fill(who.password);
  await app.locator("button.signin-submit").click();
  await app.locator("text=Welcome").first().waitFor({ timeout: 30_000 });
}

/** A drawer's own row, the first visible table row that reads *text*. */
const row = (app, text) => app.locator("tr", { hasText: text }).filter({ visible: true }).first();

async function partA() {
  const stage = await openStage({
    base: SCHOOL, start: `${SCHOOL}/login`, device: "browser", school: "Lagoon View Academy",
    label: "Finance Admin", steps: STEPS, outDir: OUT_DIR,
  });
  const { app, frame, caption, tap, scroll, cutWhile } = stage;
  await signInSchool(app, FINANCE);
  await frame().goto(`${SCHOOL}/finance`);
  await app.getByText("Collected this term").first().waitFor({ timeout: 30_000 });
  await pause(1200);

  // 1-2. The Finance Admin's desk
  await caption(1, "School fees, from bill to ledger", "One term at Lagoon View Academy: billing, paying, and the books.");
  await pause(4200);
  await caption(2, "The Finance Admin's desk", "Ngozi sees the term at a glance: billed, collected, and what needs her.");
  await pause(2600);
  await scroll(420, 2200);
  await pause(2200);
  await scroll(-420, 1200);

  // 3. When fees fall due
  await frame().goto(`${SCHOOL}/finance/settings/fees`);
  await app.getByText("End of the term billed").first().waitFor();
  await caption(3, "When fees fall due", "The school picks the rule once. Every bill after that takes its due date from it.");
  await pause(1200);
  await tap(app.getByText("End of the term billed").first(), 400);
  await pause(4200);

  // 4. What a term costs
  await frame().goto(`${SCHOOL}/finance/receivables/fee-structures`);
  await row(app, "Standard Fees").waitFor();
  await caption(4, "What a term costs", "One fee structure holds every charge: tuition, levies, the library.");
  await tap(row(app, "Standard Fees"));
  await app.getByText("Total per customer").first().waitFor();
  await pause(5200);

  // 5. Bill a whole class
  await tap(app.getByRole("button", { name: "Generate invoices" }).first());
  await app.getByText("WHO TO BILL").first().waitFor();
  await caption(5, "Bill a whole class", "Choose the class, check the preview, and every pupil is billed at once.");
  await pause(1600);
  await tap(app.getByRole("button", { name: "JSS2 A" }).or(app.getByText("JSS2 A", { exact: true })).first());
  await pause(900);
  await tap(app.getByRole("button", { name: "Preview" }));
  await app.getByText("Pupils to bill").first().waitFor({ timeout: 30_000 });
  await pause(3400);
  const bill = app.getByRole("button", { name: /^Bill \d+ pupils?$/ });
  console.log(`  ${await bill.innerText()}`);
  const billed = await irreversible("billing JSS2 A", async () => {
    await tap(bill);
    // Each invoice renders its PDF and emails its guardian before the run returns.
    await cutWhile(() => app.getByText(/^Billed \d+ pupils?/).first().waitFor({ timeout: 120_000 }));
  });
  await pause(2200);

  // 6. Each pupil's bill
  await frame().goto(`${SCHOOL}/finance/receivables/invoices`);
  await app.getByPlaceholder("Search invoice no / customer").waitFor();
  await caption(6, "Each pupil's bill", "Zainab's bill is ready, with its lines and its due date.");
  await tap(app.getByPlaceholder("Search invoice no / customer"), 200);
  await app.getByPlaceholder("Search invoice no / customer").pressSequentially("Zainab", { delay: 70 });
  await pause(1800);
  if (billed) {
    await tap(row(app, "Zainab"));
    await app.getByText("Lines").first().waitFor();
  }
  await pause(4200);
  return stage.finish();
}

async function partB1() {
  const stage = await openStage({
    base: PARENT, start: `${PARENT}/parent/`, device: "phone", school: "Lagoon View Academy",
    label: "Parent app", steps: STEPS, outDir: OUT_DIR, storage: PARENT_STORAGE,
  });
  const { app, caption, tap, scroll, banner } = stage;
  await signInParent(app, BELLO);
  await pause(1500);

  // 7. Sent to her father at once
  await caption(7, "Sent to her father at once", "Mr Bello is told on his phone and emailed the invoice. His app already shows it.");
  await pause(900);
  await banner("New bill for Zainab", "Open Fees in the parent app to see it.", { icon: `${PARENT}/parent/icons/icon-192.png`, ms: 3600 });
  await pause(1600);
  await scroll(360, 1800);
  await pause(1800);
  await scroll(-360, 1000);
  await tap(app.locator('nav[aria-label="Screens"] a', { hasText: "Fees" }));
  await app.getByText("Bills still to pay").first().waitFor();
  await pause(4200);
  return stage.finish();
}

/** Sends the filming backend the stand-in provider's signed notice that a card payment succeeded. */
async function confirmPayment(reference, amountKobo) {
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference, status: "SUCCEEDED", amount: amountKobo, currency: "NGN", id: String(Date.now()) },
  });
  const signature = crypto.createHmac("sha512", FAKE_SECRET).update(body).digest("hex");
  const response = await fetch(`${API}/payments/webhooks/FAKE/`, {
    method: "POST", headers: { "content-type": "application/json", "x-fake-signature": signature }, body,
  });
  if (!response.ok) throw new Error(`The backend refused the payment notice: ${response.status}`);
}

/** The stand-in provider's card page: plainly a demonstration, charging nobody. */
const checkoutPage = (reference, naira) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Demo checkout</title>
<style>
  * { box-sizing: border-box; } html, body { overflow-x: hidden; }
  body { margin: 0; font-family: system-ui, -apple-system, Helvetica, sans-serif; background: #eef1f6; color: #17223a; }
  .bar { padding: 18px 20px; background: #17223a; color: #fff; font-size: 14px; font-weight: 600; display: flex; justify-content: space-between; }
  .bar span:last-child { opacity: .7; font-weight: 500; }
  main { padding: 22px 20px; display: grid; gap: 16px; }
  .who { font-size: 13px; color: #5b6880; } .amount { font-size: 34px; font-weight: 700; letter-spacing: -.02em; }
  .card { background: #fff; border-radius: 16px; padding: 18px; display: grid; gap: 14px; box-shadow: 0 6px 20px #17223a14; }
  label { display: grid; gap: 6px; font-size: 12px; font-weight: 600; color: #5b6880; }
  input { width: 100%; min-width: 0; height: 46px; border: 1px solid #d4dbe7; border-radius: 10px; padding: 0 12px; font-size: 16px; color: #17223a; }
  .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
  .checkout-pay { height: 52px; border: 0; border-radius: 12px; background: #1f8f5f; color: #fff; font-size: 16px; font-weight: 700; }
  .note { text-align: center; font-size: 12px; color: #5b6880; }
</style></head><body>
<div class="bar"><span>Demo checkout</span><span>No card is charged</span></div>
<main>
  <div><div class="who">Lagoon View Academy · school fees</div><div class="amount">₦${naira}</div></div>
  <div class="card">
    <label>Card number<input id="card" inputmode="numeric" placeholder="0000 0000 0000 0000"></label>
    <div class="row"><label>Expiry<input id="expiry" placeholder="MM / YY"></label><label>CVV<input id="cvv" placeholder="123"></label></div>
    <button class="checkout-pay" type="button" onclick="window.payDemo('${reference}')">Pay ₦${naira}</button>
  </div>
  <p class="note">A stand-in for the payment gateway, used to show the app.</p>
</main></body></html>`;

async function partB2() {
  const stage = await openStage({
    base: PARENT, start: `${PARENT}/parent/`, device: "phone", school: "Lagoon View Academy",
    label: "Parent app", steps: STEPS, outDir: OUT_DIR, storage: PARENT_STORAGE,
  });
  const { app, page, context, frame, caption, tap } = stage;
  const pending = new Map();
  await context.route("https://fake.test/**", async (route) => {
    const reference = new URL(route.request().url()).pathname.split("/").pop();
    const naira = (await app.locator(".pay-primary-action").innerText().catch(() => "")).match(/[\d,.]+/)?.[0] || "1,687.50";
    pending.set(reference, naira);
    route.fulfill({ contentType: "text/html", body: checkoutPage(reference, naira) });
  });
  await context.exposeFunction("payDemo", async (reference) => {
    const kobo = Math.round(Number((pending.get(reference) || "0").replace(/,/g, "")) * 100);
    await confirmPayment(reference, kobo);
    await frame().goto(`${PARENT}/parent/fees/paid?reference=${encodeURIComponent(reference)}`);
  });
  await signInParent(app, PATRICIA);
  await tap(app.locator('nav[aria-label="Screens"] a', { hasText: "Fees" }), 0);
  await app.getByRole("button", { name: /Pay Tunde/ }).or(app.getByRole("link", { name: /Pay Tunde/ })).first().waitFor();
  await pause(1200);

  // 8. Parents pay from their phone
  await caption(8, "Parents pay from their phone", "Patricia sees Tunde's balance and pays it by card in a few taps.");
  await pause(2200);
  await tap(app.getByRole("button", { name: /Pay Tunde/ }).or(app.getByRole("link", { name: /Pay Tunde/ })).first());
  await app.locator(".pay-card-panel").waitFor();
  await pause(2200);
  await tap(app.locator(".pay-primary-action"));
  await app.locator(".checkout-pay").waitFor();
  await pause(900);
  for (const [field, value] of [["#card", "4111 1111 1111 1111"], ["#expiry", "12 / 28"], ["#cvv", "123"]]) {
    await tap(app.locator(field), 200);
    await app.locator(field).pressSequentially(value, { delay: 45 });
  }
  await pause(700);
  const paid = await irreversible("paying Tunde's balance", async () => {
    await tap(app.locator(".checkout-pay"));
    await app.locator(".paid-page").waitFor({ timeout: 60_000 });
    const receipt = app.getByRole("link", { name: "View receipt" });
    await receipt.waitFor({ timeout: 30_000 });
    await pause(2400);
    await tap(receipt);
    await app.locator(".receipt-page").waitFor();
  });
  await pause(paid ? 3600 : 1000);
  void page;
  return stage.finish();
}

async function partC() {
  const stage = await openStage({
    base: SCHOOL, start: `${SCHOOL}/login`, device: "browser", school: "Lagoon View Academy",
    label: "Finance Admin", steps: STEPS, outDir: OUT_DIR,
  });
  const { app, frame, caption, tap, cutWhile } = stage;
  await signInSchool(app, FINANCE);
  await frame().goto(`${SCHOOL}/finance/collections`);
  await row(app, "Tunde Adeleke").waitFor({ timeout: 30_000 });
  await pause(1200);

  // 9. Online payments post themselves
  await caption(9, "Online payments post themselves", "No one types it in. The payment is matched to Tunde's bill and receipted.");
  await pause(5200);

  // 10. Paid at the school office
  await frame().goto(`${SCHOOL}/finance/receivables/customers`);
  await row(app, "Ebere Bello").waitFor();
  await caption(10, "Paid at the school office", "Ebere's father, Mr Bello again, pays the rest in cash. The bill is settled and he is emailed the receipt.");
  await tap(row(app, "Ebere Bello"));
  await app.getByRole("button", { name: "Record payment" }).waitFor();
  await pause(1600);
  await tap(app.getByRole("button", { name: "Record payment" }));
  const dialog = app.getByRole("dialog", { name: "Record payment" });
  await dialog.getByText("Deposit account (bank / cash)").waitFor();
  await pause(700);
  await tap(dialog.locator("input[type=number]").first(), 200);
  await dialog.locator("input[type=number]").first().pressSequentially("4187.50", { delay: 80 });
  await pause(500);
  await dialog.getByRole("combobox", { name: "Payment method" }).or(dialog.locator("select").first()).first().selectOption({ label: "Cash" });
  await pause(700);
  const account = dialog.getByPlaceholder("Type a bank / cash account…");
  await tap(account, 200);
  await account.pressSequentially("Cash", { delay: 80 });
  await pause(900);
  await tap(app.getByRole("option", { name: /1100/ }).first());
  await pause(1400);
  const recorded = await irreversible("recording Ebere's cash", async () => {
    await tap(dialog.getByRole("button", { name: "Record payment" }));
    await cutWhile(() => dialog.waitFor({ state: "detached", timeout: 60_000 }));
  });
  await pause(recorded ? 2200 : 800);
  if (!recorded) {
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await pause(600);
  }

  // 11. Every pupil's statement
  await tap(app.getByRole("tab", { name: /Statement/ }).or(app.getByRole("button", { name: /^Statement/ })).first());
  await app.getByText("Statement of Account").first().waitFor();
  await caption(11, "Every pupil's statement", "Bills and payments, line by line, with what is still owed.");
  await pause(5600);

  // 12. And the school's books
  await frame().goto(`${SCHOOL}/finance/ledger`);
  await app.getByText("Journal Entries").first().waitFor();
  await caption(12, "And the school's books", "Each payment posts itself to the ledger. Nothing is keyed twice.");
  await pause(1600);
  await tap(app.locator("tbody tr").filter({ visible: true }).first());
  await app.getByText("Total Dr").first().waitFor();
  await pause(5200);
  return stage.finish();
}

const parts = { A: partA, B1: partB1, B2: partB2, C: partC };
if (!parts[PART]) throw new Error(`PART must be one of ${Object.keys(parts).join(", ")}`);
console.log(await parts[PART]());
