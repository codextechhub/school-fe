/**
 * The stage every demo video is filmed on, shared by the walkthrough scripts.
 *
 * A 1920x1080 page on the app's own address (a routed page, so the app inside
 * shares its sign-in cookies exactly as it does on its own) carries the real
 * app in a frame: a drawn phone beside a large caption for the pupil and
 * parent apps, or a browser window under the caption for the staff app. Every
 * tap shows a ring where the finger or pointer lands, and the pointer leaves
 * the app afterwards so nothing is left looking hovered.
 *
 * One recording can move between the two (:func:`show`), so a video that
 * follows a bursar at her desk and then a parent on their phone is one take.
 * Each app keeps its own sign-in, because each frame loads from its own
 * address. On the phone, :func:`banner` drops a notification over the screen,
 * in the words the app's push carries, because a recording cannot receive a
 * real push.
 *
 * The phone's screen, the browser window and the page clip rather than hide
 * what overflows: a tap scrolls its target into view, and a box that only
 * hides its overflow can still be scrolled, which slid the app up under the
 * drawn status bar.
 *
 * Filmed in Playwright's own Chromium where one is downloaded: the installed
 * Chrome films a 1080-pixel stage short at the bottom, a strip the recorder
 * fills with grey. CHROMIUM names an executable, CHANNEL a browser channel.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const SHARED_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    overflow: clip; color: #fff;
    font-family: "Geist Variable", Geist, system-ui, Helvetica, sans-serif;
    background: radial-gradient(90% 80% at 30% 35%, #1b3c77 0%, #102958 55%, #081a3c 100%);
  }
  body::before {
    content: ""; position: fixed; inset: 0; pointer-events: none;
    background-image: radial-gradient(#9bbbf1 1px, transparent 1px); background-size: 30px 30px;
    opacity: .14; mask-image: linear-gradient(110deg, #000 10%, transparent 70%);
  }
  .brand { display: flex; align-items: center; gap: 14px; color: #c2d7ff; font-size: 22px; font-weight: 650; letter-spacing: -.01em; }
  .brand i { font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-size: 26px; }
  .brand b { padding: 5px 12px; border: 1px solid #ffffff40; border-radius: 99px; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; }
  .step { color: #9fb9e8; font-size: 20px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h1 { margin: 0; font-weight: 650; line-height: 1.04; letter-spacing: -.05em; }
  p { margin: 0; color: #d4e2fb; line-height: 1.4; font-weight: 400; }
  .caption { transition: opacity .35s ease, transform .35s ease; }
  .caption.out { opacity: 0; transform: translateY(10px); }
  iframe { border: 0; display: block; background: #f5f7fc; }
  .push {
    position: absolute; z-index: 5; top: 54px; left: 12px; right: 12px; padding: 14px 16px; border-radius: 22px;
    display: grid; grid-template-columns: 38px 1fr; gap: 4px 12px; align-items: center;
    background: #f4f6fbee; backdrop-filter: blur(16px); box-shadow: 0 12px 34px #0b183466; color: #1b2840;
    transform: translateY(-160%); opacity: 0; visibility: hidden;
    transition: transform .5s cubic-bezier(.2,.8,.2,1), opacity .3s ease, visibility 0s linear .5s;
  }
  .push.in { transform: translateY(0); opacity: 1; visibility: visible; transition: transform .5s cubic-bezier(.2,.8,.2,1), opacity .2s ease; }
  .push img { grid-row: span 2; width: 38px; height: 38px; border-radius: 10px; }
  .push b { font-size: 15px; font-weight: 650; } .push span { font-size: 14px; color: #3a475e; }
  .tap {
    position: fixed; z-index: 10; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
    background: #ffffff55; border: 3px solid #ffffffd0; box-shadow: 0 0 0 6px #4a659d55;
    pointer-events: none; animation: tap .6s ease-out forwards;
  }
  @keyframes tap { from { transform: scale(.5); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
`;

const PHONE_HTML = (src, school, label) => `<!doctype html><html><head><meta charset="utf-8"><title>XVS demo</title><style>${SHARED_CSS}
  body { display: grid; grid-template-columns: 1fr 470px; align-items: center; gap: 72px; padding: 0 150px 0 140px; }
  .copy { position: relative; display: grid; gap: 22px; max-width: 760px; }
  .caption { display: grid; gap: 18px; }
  h1 { font-size: 76px; } p { font-size: 30px; max-width: 680px; }
  .phone { position: relative; width: 430px; height: 884px; padding: 20px; border-radius: 64px;
    background: linear-gradient(145deg, #2a2f3a, #0d1017); box-shadow: 0 40px 90px #00000070, inset 0 0 0 2px #ffffff1c; }
  .screen { position: relative; width: 390px; height: 844px; overflow: clip; border-radius: 46px; background: #f5f7fc; }
  .status { position: relative; display: flex; align-items: center; justify-content: space-between;
    height: 46px; padding: 6px 30px 0 34px; color: #1b2840; font-size: 15px; font-weight: 650; background: #f5f7fc; }
  .status::after { content: ""; position: absolute; top: 11px; left: 50%; width: 104px; height: 28px; margin-left: -52px; border-radius: 20px; background: #05070b; }
  .icons { display: flex; align-items: center; gap: 6px; }
  .bars { display: flex; align-items: flex-end; gap: 2px; height: 11px; }
  .bars i { display: block; width: 3px; border-radius: 1px; background: #1b2840; }
  .battery { position: relative; width: 24px; height: 11px; border: 1.5px solid #1b2840aa; border-radius: 3px; }
  .battery::after { content: ""; position: absolute; inset: 1.5px; right: 5px; border-radius: 1px; background: #1b2840; }
  iframe { width: 390px; height: 798px; }
</style></head><body>
  <section class="copy">
    <div class="brand"><i>${school}</i><b>${label}</b></div>
    <div class="caption" id="caption"><span class="step" id="step"></span><h1 id="title"></h1><p id="line"></p></div>
  </section>
  <div class="phone"><div class="screen">
    <div class="status"><span>9:41</span><span class="icons"><span class="bars"><i style="height:4px"></i><i style="height:6px"></i><i style="height:8px"></i><i style="height:11px"></i></span><span class="battery"></span></span></div>
    <iframe id="app" name="app" src="${src}"></iframe>
    <div class="push" id="push"><img id="push-icon" alt=""><b id="push-title"></b><span id="push-line"></span></div>
  </div></div>
</body></html>`;

const BROWSER_HTML = (src, school, label, address) => `<!doctype html><html><head><meta charset="utf-8"><title>XVS demo</title><style>${SHARED_CSS}
  body { display: grid; grid-template-rows: auto 1fr; gap: 26px; padding: 38px 120px 46px; }
  .top { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: end; gap: 60px; }
  .caption { display: contents; }
  .lead { display: grid; gap: 10px; }
  h1 { font-size: 56px; } p { font-size: 26px; padding-bottom: 6px; }
  .window { position: relative; justify-self: center; width: 1680px; border-radius: 16px; overflow: clip;
    background: #e9edf4; box-shadow: 0 40px 90px #00000070, 0 0 0 1px #ffffff26; }
  .chrome { display: flex; align-items: center; gap: 16px; height: 44px; padding: 0 18px; background: #dfe4ec; }
  .dots { display: flex; gap: 8px; } .dots i { width: 12px; height: 12px; border-radius: 50%; background: #c3cad6; }
  .dots i:nth-child(1) { background: #ee6a5f; } .dots i:nth-child(2) { background: #f5bd4f; } .dots i:nth-child(3) { background: #61c454; }
  .address { flex: 1; max-width: 640px; margin: 0 auto; height: 28px; border-radius: 8px; background: #fff;
    color: #3a475e; font-size: 14px; display: flex; align-items: center; justify-content: center; }
  iframe { width: 1680px; height: 744px; }
</style></head><body>
  <section class="top">
    <div class="lead"><div class="brand"><i>${school}</i><b>${label}</b></div>
      <div class="caption" id="caption"><span class="step" id="step"></span><h1 id="title"></h1></div></div>
    <p id="line"></p>
  </section>
  <div class="window"><div class="chrome"><span class="dots"><i></i><i></i><i></i></span><span class="address">${address}</span><span style="width:52px"></span></div>
    <iframe id="app" name="app" src="${src}"></iframe></div>
</body></html>`;

/**
 * Opens the stage and starts recording.
 *
 * `device` is "phone" or "browser"; `start` is the app's address to open in
 * the frame; `storage` is localStorage set on the app's origin before it loads
 * (offers already answered, as on a device after its first day).
 */
/** The stage page for one layout: the phone, or the browser window. */
function stageHtml({ device = "phone", start, school, label }) {
  return device === "browser"
    ? BROWSER_HTML(start, school, label, new URL(start).host.replace(/:\d+$/, ".xvs.codexng.com").replace(".localhost.xvs", ".xvs"))
    : PHONE_HTML(start, school, label);
}

export async function openStage({ base, start, device = "phone", school, label, steps, outDir, storage = {} }) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(browserOptions());
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript((items) => {
    try {
      for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
    } catch {
      // The stage page has no storage of its own to set.
    }
  }, storage);
  const page = await context.newPage();
  // Seconds into the recording: where the first caption starts the cut, and where finish ends it.
  const t0 = Date.now();
  const at = () => (Date.now() - t0) / 1000;
  let trimStart = null;
  const cuts = [];
  const app = page.frameLocator("#app");
  const routed = new Map();

  /**
   * Shows *layout* on the stage: ``{device, base, start, label}``, any left
   * out kept from the layout before. The stage page is served on the app's own
   * address, so its frame shares that app's sign-in cookies.
   */
  let current = { device, base, start, school, label };
  const show = async (layout = {}) => {
    current = { ...current, ...layout };
    const url = `${current.base}/__demo_stage__`;
    if (!routed.has(url)) {
      await context.route(`${url}*`, (route) => route.fulfill({
        contentType: "text/html", body: routed.get(url),
      }));
    }
    routed.set(url, stageHtml(current));
    await page.goto(`${url}?at=${Date.now()}`);
  };
  await show();

  const caption = async (n, title, line) => {
    if (trimStart === null) trimStart = Math.max(0, at() - 0.3);
    await page.evaluate(([step, t, l]) => {
      const box = document.getElementById("caption");
      const lineEl = document.getElementById("line");
      box.classList.add("out");
      lineEl.classList.add("caption", "out");
      setTimeout(() => {
        document.getElementById("step").textContent = step;
        document.getElementById("title").textContent = t;
        lineEl.textContent = l;
        box.classList.remove("out");
        lineEl.classList.remove("out");
      }, 350);
    }, [`Step ${n} of ${steps}`, title, line]);
    await pause(1200);
  };

  /** Sets the caption at once, without its fade: a part that continues the scene the part before it ended on. */
  const captionNow = async (n, title, line) => {
    if (trimStart === null) trimStart = Math.max(0, at() - 0.1);
    await page.evaluate(([step, t, l]) => {
      document.getElementById("step").textContent = step;
      document.getElementById("title").textContent = t;
      document.getElementById("line").textContent = l;
    }, [`Step ${n} of ${steps}`, title, line]);
  };

  const tap = async (locator, hold = 450) => {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (box) {
      await page.evaluate(([x, y]) => {
        const ring = document.createElement("div");
        ring.className = "tap";
        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 700);
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      await pause(hold);
    }
    await locator.click();
    await page.mouse.move(60, 1040);
  };

  const frame = () => page.frame({ name: "app" });

  /**
   * Runs *work* and leaves the wait out of the film: whatever *work* waits
   * for (the server posting a class's invoices) shows for ``keep`` seconds at
   * each end and is cut in between.
   */
  const cutWhile = async (work, keep = 1) => {
    const from = at() + keep;
    const result = await work();
    const to = at() - keep;
    if (to > from) cuts.push([from, to]);
    return result;
  };

  /** Drops a phone notification over the screen for *ms*, as the app's push reads. */
  const banner = async (title, line, { icon = "", ms = 3200 } = {}) => {
    await page.evaluate(([t, l, i]) => {
      document.getElementById("push-title").textContent = t;
      document.getElementById("push-line").textContent = l;
      const img = document.getElementById("push-icon");
      if (i) img.src = i; else img.style.display = "none";
      document.getElementById("push").classList.add("in");
    }, [title, line, icon]);
    await pause(ms);
    await page.evaluate(() => document.getElementById("push").classList.remove("in"));
    await pause(600);
  };

  /** Scrolls the app's page smoothly, as a thumb or a wheel would. */
  const scroll = async (by, ms = 1400) => {
    await frame().evaluate(async ([distance, duration]) => {
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
  };

  /**
   * Stops the recording and returns its path. Beside it, ``<path>.json`` holds
   * the span to keep (from just before the first caption to now), which
   * to-mp4.mjs plays when it joins parts into one film.
   */
  const finish = async () => {
    const video = page.video();
    const trimEnd = at();
    await context.close();
    await browser.close();
    const file = await video.path();
    fs.writeFileSync(`${file}.json`, JSON.stringify({ trimStart: trimStart ?? 0, trimEnd, cuts }));
    return file;
  };

  return { page, context, app, frame, caption, captionNow, tap, scroll, finish, show, banner, cutWhile };
}
