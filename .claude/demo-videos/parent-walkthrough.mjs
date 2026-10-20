/**
 * Films the parent app in use, for showing to schools and the team.
 *
 * The real app runs inside a drawn phone on the right of a 1920x1080 stage,
 * and each step's caption is set large on the left. The stage is served on
 * the app's own address (a routed page), so the phone shares the app's
 * sign-in cookies exactly as the app does on its own. Every tap shows a ring
 * where the finger lands.
 *
 * It signs in as the seeded parent of Lagoon View Academy (Mrs Patricia
 * Okafor, four children at two branches), so the parent seeder must have run.
 * The card payment needs the filming backend (demo-backend.py, port 8010) and
 * the parent app pointed at it (launch config "parent-fe-demo", port 5186):
 *
 *   cd .claude && BASE_URL=http://lagoon-view.localhost:5186 \
 *     API_URL=http://localhost:8010/v1 node demo-videos/parent-walkthrough.mjs
 *
 * The phone and caption stage here is the one stage.mjs holds for the other
 * walkthroughs, written out in this file.
 *
 * Environment: BASE_URL (default http://lagoon-view.localhost:5176), CHROMIUM
 * or CHANNEL (the browser; see browserOptions),
 * EMAIL, PASSWORD, PHOTO (a picture to set as the parent's photo), OUT_DIR
 * (where the .webm lands, default ./demo-videos/out).
 *
 * The walk pays PART_PAYMENT (default 5,000 naira) of Tunde's bill by card through
 * a demo checkout page, confirmed with the stand-in provider's signed notice
 * (the filming backend's stand-in provider), sets the parent's photo and marks a
 * notice read; it leaves all three. Re-run the parent seeder to put them back.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://lagoon-view.localhost:5176").replace(/\/$/, "");
const EMAIL = process.env.EMAIL || "patricia.okafor@example.ng";
const PASSWORD = process.env.PASSWORD || "Parent@School2026";
const PHOTO = process.env.PHOTO || "";
const OUT_DIR = path.resolve(process.env.OUT_DIR || "demo-videos/out");
const STAGE = `${BASE}/__demo_stage__`;
const API = (process.env.API_URL || "http://localhost:8000/v1").replace(/\/$/, "");
/** The development key the stand-in payment provider signs its notices with (settings.local). */
const FAKE_SECRET = process.env.FAKE_WEBHOOK_SECRET || "fake-dev-secret";
/** What the parent pays by card: part of the bill, so the next filming still has a balance to pay. */
const PART_PAYMENT = process.env.PART_PAYMENT || "5000";

/**
 * The card page the stand-in provider sends a parent to. It is plainly a
 * demonstration, named as one and charging nobody, and imitates no real
 * gateway. Pay posts the provider's signed success notice to the backend,
 * as the real provider would, then returns to the app's paid page.
 */
const checkoutPage = (reference, amount) => `<!doctype html><html><head><meta charset="utf-8">
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
  <div><div class="who">Lagoon View Academy · school fees</div><div class="amount">₦${Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</div></div>
  <div class="card">
    <label>Card number<input id="card" inputmode="numeric" placeholder="0000 0000 0000 0000"></label>
    <div class="row"><label>Expiry<input id="expiry" placeholder="MM / YY"></label><label>CVV<input id="cvv" placeholder="123"></label></div>
    <button class="checkout-pay" type="button" onclick="window.payDemo('${reference}')">Pay ₦${Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</button>
  </div>
  <p class="note">A stand-in for the payment gateway, used to show the app.</p>
</main></body></html>`;

/** Sends the backend the stand-in provider's signed notice that a card payment succeeded. */
async function confirmPayment(reference, amountNaira) {
  const body = JSON.stringify({
    event: "charge.success",
    data: { reference, status: "SUCCEEDED", amount: Math.round(Number(amountNaira) * 100), currency: "NGN", id: String(Date.now()) },
  });
  const signature = crypto.createHmac("sha512", FAKE_SECRET).update(body).digest("hex");
  const response = await fetch(`${API}/payments/webhooks/FAKE/`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-fake-signature": signature },
    body,
  });
  if (!response.ok) throw new Error(`The backend refused the payment notice: ${response.status}`);
}

const STAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>XVS Parent</title>
<style>
  @font-face { font-family: Geist; src: local("Geist"); }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    display: grid; grid-template-columns: 1fr 470px; align-items: center; gap: 72px;
    padding: 0 150px 0 140px; overflow: hidden;
    font-family: "Geist Variable", Geist, system-ui, Helvetica, sans-serif; color: #fff;
    background: radial-gradient(90% 80% at 30% 35%, #1b3c77 0%, #102958 55%, #081a3c 100%);
  }
  body::before {
    content: ""; position: fixed; inset: 0; pointer-events: none;
    background-image: radial-gradient(#9bbbf1 1px, transparent 1px); background-size: 30px 30px;
    opacity: .14; mask-image: linear-gradient(110deg, #000 10%, transparent 70%);
  }
  .copy { position: relative; display: grid; gap: 22px; max-width: 760px; }
  .brand { display: flex; align-items: center; gap: 14px; color: #c2d7ff; font-size: 22px; font-weight: 650; letter-spacing: -.01em; }
  .brand i { font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-size: 26px; }
  .brand b { padding: 5px 12px; border: 1px solid #ffffff40; border-radius: 99px; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; }
  .step { color: #9fb9e8; font-size: 20px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 0; font-size: 76px; font-weight: 650; line-height: 1.04; letter-spacing: -.05em; }
  p { margin: 0; color: #d4e2fb; font-size: 30px; line-height: 1.4; font-weight: 400; max-width: 680px; }
  .caption { display: grid; gap: 18px; transition: opacity .35s ease, transform .35s ease; }
  .caption.out { opacity: 0; transform: translateY(10px); }
  .phone {
    position: relative; width: 430px; height: 884px; padding: 20px; border-radius: 64px;
    background: linear-gradient(145deg, #2a2f3a, #0d1017); box-shadow: 0 40px 90px #00000070, inset 0 0 0 2px #ffffff1c;
  }
  .screen { position: relative; width: 390px; height: 844px; overflow: hidden; border-radius: 46px; background: #f5f7fc; }
  .status {
    position: relative; display: flex; align-items: center; justify-content: space-between;
    height: 46px; padding: 6px 30px 0 34px; color: #1b2840; font-size: 15px; font-weight: 650; background: #f5f7fc;
  }
  .status::after { content: ""; position: absolute; top: 11px; left: 50%; width: 104px; height: 28px; margin-left: -52px; border-radius: 20px; background: #05070b; }
  .status .icons { display: flex; align-items: center; gap: 6px; }
  .status .bars { display: flex; align-items: flex-end; gap: 2px; height: 11px; }
  .status .bars i { display: block; width: 3px; border-radius: 1px; background: #1b2840; }
  .status .battery { position: relative; width: 24px; height: 11px; border: 1.5px solid #1b2840aa; border-radius: 3px; }
  .status .battery::after { content: ""; position: absolute; inset: 1.5px; right: 5px; border-radius: 1px; background: #1b2840; }
  iframe { width: 390px; height: 798px; border: 0; display: block; }
  .tap {
    position: fixed; z-index: 10; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
    background: #ffffff55; border: 3px solid #ffffffd0; box-shadow: 0 0 0 6px #4a659d55;
    pointer-events: none; animation: tap .6s ease-out forwards;
  }
  @keyframes tap { from { transform: scale(.5); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
</style></head>
<body>
  <section class="copy">
    <div class="brand"><i>Lagoon View Academy</i><b>Parent app</b></div>
    <div class="caption" id="caption"><span class="step" id="step"></span><h1 id="title"></h1><p id="line"></p></div>
  </section>
  <div class="phone"><div class="screen">
    <div class="status"><span>9:41</span><span class="icons"><span class="bars"><i style="height:4px"></i><i style="height:6px"></i><i style="height:8px"></i><i style="height:11px"></i></span><span class="battery"></span></span></div>
    <iframe id="app" name="app" src="${BASE}/parent/sign-in"></iframe>
  </div></div>
</body></html>`;

const STEPS = 12;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function caption(page, n, title, line) {
  await page.evaluate(([step, t, l]) => {
    const box = document.getElementById("caption");
    box.classList.add("out");
    setTimeout(() => {
      document.getElementById("step").textContent = step;
      document.getElementById("title").textContent = t;
      document.getElementById("line").textContent = l;
      box.classList.remove("out");
    }, 350);
  }, [`Step ${n} of ${STEPS}`, title, line]);
  await pause(1200);
}

/** Taps a control in the app, showing a ring where the finger lands. */
async function tap(page, locator, hold = 450) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.evaluate(([px, py]) => {
      const ring = document.createElement("div");
      ring.className = "tap";
      ring.style.left = `${px}px`;
      ring.style.top = `${py}px`;
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 700);
    }, [x, y]);
    await pause(hold);
  }
  await locator.click();
  // The pointer leaves the phone, so no control is left looking hovered.
  await page.mouse.move(400, 980);
}

/** Scrolls the app's page smoothly, as a thumb would. */
async function scroll(frame, by, ms = 1400) {
  await frame.evaluate(async ([distance, duration]) => {
    const start = window.scrollY;
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        window.scrollTo(0, start + distance * ease);
        if (k < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
  }, [by, ms]);
}

/**
 * The browser to film in: Playwright's own Chromium where one is downloaded,
 * else the installed Chrome. The installed Chrome films a 1080-pixel stage
 * short at the bottom, a strip the recorder fills with grey, so it is the
 * fallback only. CHROMIUM names an executable, CHANNEL a browser channel.
 */
function browserOptions() {
  if (process.env.CHROMIUM) return { executablePath: process.env.CHROMIUM };
  if (process.env.CHANNEL) return { channel: process.env.CHANNEL };
  const cache = path.join(process.env.HOME || "", "Library/Caches/ms-playwright");
  const found = fs.existsSync(cache)
    ? fs.readdirSync(cache).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse()
    : [];
  for (const dir of found) {
    const app = path.join(cache, dir, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
    if (fs.existsSync(app)) return { executablePath: app };
  }
  return { channel: "chrome" };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // The installed Chrome, so the recording needs no browser download of Playwright's own.
  const browser = await chromium.launch(browserOptions());
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  // The install and notification offers answered already, as on a parent's phone after the first day.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("xvs.parent.install-offer-dismissed", "1");
      localStorage.setItem("xvs.parent.push", JSON.stringify({ choice: "not-now" }));
    } catch {
      // The stage itself has no storage to set.
    }
  });
  await context.route(STAGE, (route) => route.fulfill({ contentType: "text/html", body: STAGE_HTML }));
  // The stand-in provider's checkout address, answered with the demo card page.
  await context.route("https://fake.test/**", (route) => {
    const reference = new URL(route.request().url()).pathname.split("/").pop();
    route.fulfill({ contentType: "text/html", body: checkoutPage(reference, PART_PAYMENT) });
  });
  await context.exposeFunction("payDemo", async (reference) => {
    await confirmPayment(reference, PART_PAYMENT);
    await page.frame({ name: "app" }).goto(`${BASE}/parent/fees/paid?reference=${encodeURIComponent(reference)}`);
  });
  const page = await context.newPage();
  await page.goto(STAGE);
  const app = page.frameLocator("#app");
  const frame = () => page.frame({ name: "app" });
  await app.locator("input[name=email]").waitFor();
  await pause(800);

  // 1. Sign in
  await caption(page, 1, "Sign in", "Parents sign in with the email address the school invited them with.");
  await tap(page, app.locator("input[name=email]"), 250);
  await app.locator("input[name=email]").pressSequentially(EMAIL, { delay: 55 });
  await tap(page, app.locator("input[name=password]"), 250);
  await app.locator("input[name=password]").pressSequentially(PASSWORD, { delay: 55 });
  await pause(400);
  await tap(page, app.locator("button.signin-submit"));
  await app.locator("text=Welcome").first().waitFor();
  await pause(900);

  // 2. Home
  await caption(page, 2, "Every child at a glance", "Attendance, fees and the latest result for each child, on one screen.");
  await pause(1600);
  await scroll(frame(), 520, 2200);
  await pause(1200);
  await scroll(frame(), 520, 2000);
  await pause(1400);
  await scroll(frame(), -1040, 1200);

  // 3. Switch child
  await caption(page, 3, "Switch child", "Choose a child once, and every screen follows.");
  await tap(page, app.locator(".child-switcher-trigger"));
  await pause(1300);
  await tap(page, app.locator(".child-switcher-list button", { hasText: "Tunde" }));
  await pause(900);

  // 4. Results
  await tap(page, app.locator('nav[aria-label="Screens"] a', { hasText: "Results" }));
  await app.locator(".results-hero").first().waitFor();
  await caption(page, 4, "Results", "Tunde's term average, position and every subject, as the school released them.");
  await pause(1800);
  await scroll(frame(), 560, 2200);
  await pause(1600);
  await scroll(frame(), -560, 1000);

  // 5. Attendance
  await tap(page, app.locator('nav[aria-label="Screens"] button', { hasText: "More" }));
  await pause(900);
  await tap(page, app.locator('[role="dialog"] a', { hasText: "Attendance" }));
  await app.locator(".attendance-hero").first().waitFor();
  await caption(page, 5, "Attendance", "Each school day as the class teacher marked it.");
  await pause(1500);
  await scroll(frame(), 430, 1800);
  await pause(1000);
  const day = app.locator(".attendance-days button:not([disabled])").nth(6);
  if (await day.count()) await tap(page, day);
  await pause(1800);
  await scroll(frame(), -430, 1000);

  // 6. Fees
  await tap(page, app.locator('nav[aria-label="Screens"] a', { hasText: "Fees" }));
  await app.locator(".fees-simple-summary").first().waitFor();
  await caption(page, 6, "Fees", "What is left to pay for the family and for each child, with every bill a tap away.");
  await pause(2200);

  // 7. Pay a bill by card
  await tap(page, app.getByRole("button", { name: /Pay Tunde/ }).or(app.getByRole("link", { name: /Pay Tunde/ })).first());
  await app.locator(".pay-card-panel").waitFor();
  await caption(page, 7, "Pay a bill", "Pay in full or in part, by card or by bank transfer.");
  await pause(1400);
  await tap(page, app.getByRole("radio", { name: /Part payment/ }).or(app.locator(".pay-method", { hasText: "Part payment" })).first());
  await pause(500);
  await tap(page, app.locator(".pay-amount-field input"), 250);
  await app.locator(".pay-amount-field input").pressSequentially(PART_PAYMENT, { delay: 90 });
  await pause(1200);
  await tap(page, app.locator(".pay-primary-action"));
  await app.locator(".checkout-pay").waitFor();
  await caption(page, 7, "Secure checkout", "Card details go to the payment gateway's page, never to the app.");
  await pause(900);
  for (const [field, value] of [["#card", "4111 1111 1111 1111"], ["#expiry", "12 / 28"], ["#cvv", "123"]]) {
    await tap(page, app.locator(field), 200);
    await app.locator(field).pressSequentially(value, { delay: 45 });
  }
  await pause(700);
  await tap(page, app.locator(".checkout-pay"));

  // 8. Payment confirmed, and its receipt
  await app.locator(".paid-page").waitFor();
  await caption(page, 8, "Payment confirmed", "The school confirms the payment at once, and the balance updates.");
  const receipt = app.getByRole("link", { name: "View receipt" });
  await receipt.waitFor({ timeout: 30_000 });
  await pause(2400);
  await receipt.waitFor({ timeout: 30_000 });
  await caption(page, 8, "A receipt for every payment", "Ready to view or download as the school's own PDF.");
  await tap(page, receipt);
  await app.locator(".receipt-page").waitFor();
  await pause(1600);
  await scroll(frame(), 520, 2200);
  await pause(1600);

  // 9. Pay by transfer
  await tap(page, app.locator('nav[aria-label="Screens"] a', { hasText: "Fees" }));
  await app.locator(".fees-simple-summary").first().waitFor();
  await pause(800);
  const transfer = app.getByRole("button", { name: /Pay by bank transfer/ });
  await transfer.scrollIntoViewIfNeeded();
  await caption(page, 9, "Pay by transfer", "Each child has a permanent account number. Money sent to it is applied to their bills.");
  await tap(page, transfer);
  await pause(1200);
  await scroll(frame(), 420, 1800);
  await pause(2600);
  await scroll(frame(), -2000, 1200);

  // 10. Notices
  await tap(page, app.locator('nav[aria-label="Screens"] a', { hasText: "Notices" }));
  await app.locator(".notices-row-main").first().waitFor();
  await caption(page, 10, "Notices", "Messages from the school, for the whole family or one child's class.");
  await pause(1500);
  await tap(page, app.locator(".notices-row-main").first());
  await pause(2600);
  await page.keyboard.press("Escape");
  await pause(600);

  // 11. Profile and photo
  await tap(page, app.locator('nav[aria-label="Screens"] button', { hasText: "More" }));
  await pause(800);
  await tap(page, app.locator('[role="dialog"] a', { hasText: "Profile" }));
  await app.locator(".profile-hero").first().waitFor();
  await caption(page, 11, "Your profile", "Contact details and a photo, kept up to date by the parent.");
  await pause(1300);
  if (PHOTO) {
    await tap(page, app.locator('button[aria-label="Profile photo options"]'));
    await pause(1100);
    await tap(page, app.locator('[role="dialog"] button', { hasText: "Choose a photo" }), 300);
    await app.locator('input[type="file"]').setInputFiles(PHOTO);
    await app.locator(".profile-hero-avatar img").waitFor();
    await pause(1800);
  }
  await scroll(frame(), 420, 1800);
  await pause(1300);
  await scroll(frame(), -420, 1000);

  // 12. Sign out
  await caption(page, 12, "Sign out", "One tap from the avatar, and the phone is signed out for good.");
  await tap(page, app.locator(".child-switcher-trigger"));
  await pause(1200);
  await tap(page, app.locator(".child-switcher-actions button", { hasText: "Sign out" }));
  await app.locator("input[name=email]").waitFor();
  await pause(2200);

  const video = page.video();
  await context.close();
  await browser.close();
  console.log(await video.path());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
