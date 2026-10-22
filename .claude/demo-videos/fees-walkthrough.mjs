/**
 * Films "School fees, from bill to ledger" in five parts, joined by to-mp4.mjs.
 *
 *   A  the Finance Admin's desk: the overview, when fees fall due, the fee
 *      structure, billing JSS2 A, and Zainab's new bill (browser stage)
 *   B1 Zainab's father, Mr Bello, finds the bill on his phone (phone stage)
 *   B2 Patricia pays Tunde's last balance by card (phone stage)
 *   C1 the card payment posted, and Mr Bello paying Femi's bill in cash at the
 *      school office (browser stage)
 *   C2 Mrs Adeleke scanning the desk's payment code and paying Amaka's bill on
 *      her phone, then a statement and the books (browser stage, with the
 *      phone beside the window)
 *
 * Each part signs in before its first caption, and the joined film starts
 * each part at that caption, so a part can be filmed again on its own. Each
 * payment and the billing cannot be undone. REHEARSE=1 walks every part and
 * stops short of each.
 *
 *   cd .claude && PART=A node demo-videos/fees-walkthrough.mjs
 *   node demo-videos/to-mp4.mjs demo-videos/out/fees.mp4 <A> <B1> <B2> <C1> <C2>
 *
 * Needs the local backend and school-fe (5174), and the filming backend
 * (demo-backend.py, 8010): the phone parts with the parent app pointed at it
 * (launch config "parent-fe-demo", 5186), and the C parts with DEMO_PAID_DIR
 * set to the folder passed here as PAID_DIR, so the desk hears "not paid"
 * until the parent pays. The C parts send the desk's own requests to the
 * filming backend too. Local data: Lagoon View, with
 * lagoon-procurement-setup.py run and Mr E. Bello's parent account active.
 *
 * Amounts already in a field are left as the app filled them: the cash
 * payment keeps the balance the dialog offers, because typing over a filled
 * field appends to it.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { openStage, pause } from "./stage.mjs";

const SCHOOL = "http://lagoon-view.localhost:5174";
const PARENT = "http://lagoon-view.localhost:5186";
const API = "http://localhost:8010/v1";
const FINANCE = { email: "ngozi.ibekwe@lagoon-view.example.com", password: "SchoolStaff@2026" };
const BELLO = { email: "bello.household@example.ng", password: "Parent@School2026" };
const PATRICIA = { email: "patricia.okafor@example.ng", password: "Parent@School2026" };
const FAKE_SECRET = "fake-dev-secret";
// Two bills from scene 5: Mr Bello pays Femi's in cash, and Mrs Adeleke pays Amaka's by code at the desk.
const FEMI = "CU-92610213";
const AMAKA = "CU-92610211";
const AMAKA_BILL = "IV-92610212";
const PAID_DIR = process.env.PAID_DIR || "";
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

/** The parent's phone camera, pointed at the code on the bursar's screen. */
const cameraPage = (qrSvg) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; overflow: hidden; }
  body { background: radial-gradient(120% 80% at 50% 40%, #39414f, #11151c); font-family: system-ui, -apple-system, Helvetica, sans-serif; color: #fff; }
  .top { padding: 18px; text-align: center; font-size: 14px; font-weight: 600; opacity: .8; }
  .finder { position: absolute; left: 50%; top: 42%; width: 250px; height: 250px; margin: -125px 0 0 -125px; padding: 14px; border-radius: 22px; background: #fff; }
  .finder svg { width: 100%; height: 100%; display: block; }
  .corner { position: absolute; width: 40px; height: 40px; border: 5px solid #ffd60a; }
  .c1 { left: -14px; top: -14px; border-right: 0; border-bottom: 0; border-radius: 16px 0 0 0; }
  .c2 { right: -14px; top: -14px; border-left: 0; border-bottom: 0; border-radius: 0 16px 0 0; }
  .c3 { left: -14px; bottom: -14px; border-right: 0; border-top: 0; border-radius: 0 0 0 16px; }
  .c4 { right: -14px; bottom: -14px; border-left: 0; border-top: 0; border-radius: 0 0 16px 0; }
  .pill { position: absolute; left: 24px; right: 24px; bottom: 120px; display: flex; gap: 12px; align-items: center; padding: 14px 18px;
    border: 0; border-radius: 18px; background: #ffd60a; color: #1a1a1a; text-align: left; font: inherit; }
  .pill b { display: block; font-size: 15px; } .pill span { font-size: 13px; opacity: .75; }
</style></head><body>
  <div class="top">Camera</div>
  <div class="finder">${qrSvg}<i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i></div>
  <button class="pill" id="open"><div><b>Pay Lagoon View Academy</b><span>Open the payment link</span></div></button>
</body></html>`;

/** What the stand-in provider shows the parent once they have paid. */
const paidPage = (naira) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; font-family: system-ui, -apple-system, Helvetica, sans-serif; background: #eef1f6; color: #17223a; }
  .bar { padding: 18px 20px; background: #17223a; color: #fff; font-size: 14px; font-weight: 600; }
  main { padding: 60px 24px; display: grid; justify-items: center; gap: 14px; text-align: center; }
  .tick { width: 76px; height: 76px; border-radius: 50%; background: #1f8f5f; color: #fff; display: grid; place-items: center; font-size: 40px; }
  h2 { margin: 6px 0 0; font-size: 24px; } p { margin: 0; color: #5b6880; font-size: 15px; }
</style></head><body><div class="bar">Demo checkout</div>
<main><div class="tick">✓</div><h2>Payment successful</h2><p>₦${naira} to Lagoon View Academy</p><p>Your receipt is on its way. You can go back to the desk.</p></main></body></html>`;

/** Part C: scenes 9 and 10 (C1), or 11 and 12 (C2), each its own take because each pays a bill. */
async function partC(half) {
  if (!PAID_DIR) throw new Error("Part C needs PAID_DIR, the folder the filming backend was started with as DEMO_PAID_DIR.");
  const stage = await openStage({
    base: SCHOOL, start: `${SCHOOL}/login`, device: "browser", school: "Lagoon View Academy",
    label: "Finance Admin", steps: STEPS, outDir: OUT_DIR,
  });
  const { app, context, frame, caption, tap, cutWhile, sidePhone, sidePhoneAway } = stage;
  // This take's requests go to the filming backend, whose stand-in provider gives the desk a checkout link.
  await context.route(`${SCHOOL}/v1/**`, async (route) => {
    const response = await route.fetch({ url: route.request().url().replace(`${SCHOOL}/v1`, API) });
    await route.fulfill({ response });
  });
  const DESK_NAIRA = "18,687.50";
  await context.route("https://fake.test/**", (route) => {
    const reference = new URL(route.request().url()).pathname.split("/").pop();
    route.fulfill({ contentType: "text/html", body: checkoutPage(reference, DESK_NAIRA) });
  });
  const phone = () => stage.page.frame({ name: "phone" });
  await context.exposeFunction("payDemo", async (reference) => {
    fs.writeFileSync(path.join(PAID_DIR, reference), "");
    await phone().setContent(paidPage(DESK_NAIRA));
  });

  await signInSchool(app, FINANCE);
  if (half === "C2") return deskScenes(stage, { phone });
  await frame().goto(`${SCHOOL}/finance/collections`);
  await row(app, "Tunde Adeleke").waitFor({ timeout: 30_000 });
  await pause(1200);

  // 9. Online payments post themselves
  await caption(9, "Online payments post themselves", "No one types it in. The payment is matched to Tunde's bill and receipted.");
  await pause(5200);

  // 10. Paid at the school office
  await frame().goto(`${SCHOOL}/finance/receivables/customers`);
  await row(app, FEMI).waitFor();
  await caption(10, "Paid at the school office", "Mr Bello pays Femi's term fees in cash. The bill is settled and he is emailed the receipt.");
  await tap(row(app, FEMI));
  await app.getByRole("button", { name: "Record payment" }).waitFor();
  await pause(1600);
  await tap(app.getByRole("button", { name: "Record payment" }));
  const dialog = app.getByRole("dialog", { name: "Record payment" });
  await dialog.getByText("Deposit account (bank / cash)").waitFor();
  const amount = dialog.locator("input[type=number]").first();
  if ((await amount.inputValue()) !== "18687.50") throw new Error(`Femi's balance is not the term's fees: ${await amount.inputValue()}`);
  await pause(900);
  await tap(amount, 300);
  await pause(900);
  await dialog.getByRole("combobox", { name: "Payment method" }).or(dialog.locator("select").first()).first().selectOption({ label: "Cash" });
  await pause(700);
  const account = dialog.getByPlaceholder("Type a bank / cash account…");
  await tap(account, 200);
  await account.pressSequentially("Cash", { delay: 80 });
  await pause(900);
  await tap(app.getByRole("option", { name: /1100/ }).first());
  await pause(1400);
  const recorded = await irreversible("recording Femi's cash", async () => {
    await tap(dialog.getByRole("button", { name: "Record payment" }));
    await cutWhile(() => dialog.waitFor({ state: "detached", timeout: 60_000 }));
  });
  await pause(recorded ? 3200 : 800);
  if (!recorded) {
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await pause(600);
  }
  return stage.finish();
}

/** Scenes 11 and 12: Amaka's bill paid by code at the desk, then the statement and the ledger. */
async function deskScenes(stage, { phone }) {
  const { app, frame, caption, tap, cutWhile, sidePhone, sidePhoneAway } = stage;
  await pause(600);

  // 11. Or scan and pay at the desk
  await frame().goto(`${SCHOOL}/finance/receivables/invoices`);
  await row(app, AMAKA_BILL).waitFor();
  await caption(11, "Or scan and pay at the desk", "The desk shows a code for Amaka's bill. Her mother scans it and pays on her own phone.");
  await tap(row(app, AMAKA_BILL));
  await app.getByRole("tab", { name: "Settlements" }).or(app.getByRole("button", { name: "Settlements" })).first().waitFor();
  await pause(1200);
  await tap(app.getByRole("tab", { name: "Settlements" }).or(app.getByRole("button", { name: "Settlements" })).first());
  const collect = app.getByRole("button", { name: "Collect at the desk" });
  await collect.waitFor();
  await pause(1400);
  await tap(collect);
  const desk = app.getByRole("dialog", { name: "Collect at the desk" });
  await desk.getByRole("button", { name: "Show payment code" }).waitFor();
  await pause(1800);
  const shown = await irreversible("starting Amaka's desk collection", async () => {
    await tap(desk.getByRole("button", { name: "Show payment code" }));
    await desk.getByText("Waiting for payment").waitFor({ timeout: 30_000 });
  });
  if (shown) {
    await pause(2400);
    const qr = await desk.locator("svg:has(> title)").first().evaluate((svg) => svg.outerHTML);
    const link = await desk.locator("input[readonly]").first().inputValue();
    const camera = await sidePhone({ html: cameraPage(qr) });
    await pause(2200);
    await tap(camera.locator("#open"));
    await phone().goto(link);
    const checkout = stage.page.frameLocator("#phone");
    await checkout.locator(".checkout-pay").waitFor();
    await pause(1200);
    for (const [field, value] of [["#card", "4111 1111 1111 1111"], ["#expiry", "12 / 28"], ["#cvv", "123"]]) {
      await tap(checkout.locator(field), 200);
      await checkout.locator(field).pressSequentially(value, { delay: 45 });
    }
    await pause(700);
    await tap(checkout.locator(".checkout-pay"));
    await checkout.getByText("Payment successful").waitFor();
    await pause(1600);
    await cutWhile(() => desk.getByText(/^Paid$/).first().waitFor({ timeout: 60_000 }), 1.5);
    await pause(1800);
    await sidePhoneAway();
    await pause(2400);
    await tap(desk.getByRole("button", { name: "Done" }));
  } else {
    await desk.getByRole("button", { name: "Cancel" }).click();
  }
  await pause(1000);

  // 12. Every account, and the school's books
  await frame().goto(`${SCHOOL}/finance/receivables/customers`);
  await row(app, AMAKA).waitFor();
  await caption(12, "Statements, and the school's books", "Each bill and payment lands on the pupil's statement and posts itself to the ledger.");
  await tap(row(app, AMAKA));
  await tap(app.getByRole("tab", { name: /Statement/ }).or(app.getByRole("button", { name: /^Statement/ })).first());
  await app.getByText("Statement of Account").first().waitFor();
  await pause(4600);
  await frame().goto(`${SCHOOL}/finance/ledger`);
  await app.getByText("Journal Entries").first().waitFor();
  await pause(1400);
  await tap(app.locator("tbody tr").filter({ visible: true }).first());
  await app.getByText("Total Dr").first().waitFor();
  await pause(4800);
  return stage.finish();
}

const parts = { A: partA, B1: partB1, B2: partB2, C1: () => partC("C1"), C2: () => partC("C2") };
if (!parts[PART]) throw new Error(`PART must be one of ${Object.keys(parts).join(", ")}`);
console.log(await parts[PART]());
