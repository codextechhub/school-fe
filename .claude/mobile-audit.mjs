// Responsive audit driver - visits routes at phone/tablet widths, detects
// page-level horizontal overflow, and screenshots each route+viewport.
// Read-only: navigates + screenshots only, never submits a form.
// Ported from console-fe (.claude/skills/verify-design/_mobile_audit.mjs).
// One-time setup in this folder: `npm init -y && npm i playwright` (uses the
// system Chrome via channel:"chrome" - no browser download). Override
// EMAIL/PASSWORD with this app's seeded login; defaults below are console-fe's.
//
//   BASE_URL  frontend origin - required
//   ROUTES    space/comma-separated paths - required
//   EMAIL / PASSWORD  seeded super-admin (defaults as drive.mjs)

import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL;
if (!BASE) { console.error("BASE_URL is required"); process.exit(1); }
const EMAIL = process.env.EMAIL || "admin@codexng.com";
const PASSWORD = process.env.PASSWORD || "Admin@123456";

const targets = (process.env.ROUTES || "")
  .split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
if (!targets.length) { console.error("No ROUTES given"); process.exit(1); }

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
];

const SHOTS = "/tmp/verify-design/shots-responsive";
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const slug = (p) => (p.replace(/^\//, "").replace(/\//g, "-") || "root");

const report = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  try {
    // school-fe's login page is /accounts (and /login redirects to it), so the
    // "left the login page" check must exclude both - checking only /login
    // passes instantly on the redirect without ever authenticating.
    await page.goto(`${BASE}/accounts`, { waitUntil: "networkidle" });
    await page.locator('input[autocomplete="username"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(
      (u) => !u.pathname.includes("/login") && !u.pathname.includes("/accounts"),
      { timeout: 20000 },
    );
    console.log(`[${vp.name}] logged in`);
  } catch (e) {
    console.log(`[${vp.name}] LOGIN FAILED: ${e.message}`);
    await ctx.close();
    continue;
  }

  for (const path of targets) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.getByText("Preparing your workspace...").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
      await page.locator("h1").first().waitFor({ state: "visible", timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(1200);

      const probe = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const docOverflow = Math.max(
          document.documentElement.scrollWidth - vw,
          document.body ? document.body.scrollWidth - vw : 0,
        );
        const offenders = [];
        if (docOverflow > 1) {
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width < 2) continue;
            const cs = getComputedStyle(el);
            if (cs.position === "fixed") continue; // portals/animations
            if (r.right > vw + 2 || r.left < -2) {
              // ignore if an ancestor clips/scrolls it horizontally
              let a = el.parentElement, clipped = false;
              while (a && a !== document.body) {
                const s = getComputedStyle(a);
                if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break; }
                a = a.parentElement;
              }
              if (!clipped) {
                offenders.push({
                  tag: el.tagName.toLowerCase(),
                  cls: (typeof el.className === "string" ? el.className : "").slice(0, 140),
                  left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
                });
              }
            }
          }
        }
        return { vw, docOverflow: Math.round(docOverflow), offenders: offenders.slice(0, 10) };
      });

      const errBoundary = await page.locator("text=Something went wrong").count().catch(() => 0);
      const file = `${SHOTS}/${slug(path)}@${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: vp.name === "phone" });

      report.push({ path, vp: vp.name, url: page.url(), overflow: probe.docOverflow, offenders: probe.offenders, errBoundary });
      const flag = probe.docOverflow > 1 ? ` OVERFLOW +${probe.docOverflow}px` : "";
      console.log(`[${vp.name}] ${path}${flag}${errBoundary ? " ERROR-BOUNDARY" : ""}`);
    } catch (e) {
      console.log(`[${vp.name}] ${path} DRIVE-ERROR: ${e.message.slice(0, 120)}`);
      report.push({ path, vp: vp.name, driveError: e.message.slice(0, 200) });
    }
  }
  if (errors.length) console.log(`[${vp.name}] page errors:\n` + errors.slice(0, 15).map((e) => "  • " + e.slice(0, 200)).join("\n"));
  await ctx.close();
}

fs.writeFileSync(`${SHOTS}/report.json`, JSON.stringify(report, null, 2));

console.log("\n=== OVERFLOWING ROUTES ===");
for (const r of report.filter((r) => (r.overflow ?? 0) > 1)) {
  console.log(`\n${r.vp}  ${r.path}  +${r.overflow}px`);
  for (const o of r.offenders ?? []) console.log(`   <${o.tag}> left:${o.left} right:${o.right} w:${o.w}  ${o.cls}`);
}
console.log(`\nshots + report.json in ${SHOTS}/`);
await browser.close();
