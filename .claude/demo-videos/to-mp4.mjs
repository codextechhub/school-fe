/**
 * Turns a Playwright recording (.webm) into an ordinary MP4 that plays and
 * seeks everywhere (QuickTime, WhatsApp, Slides, a phone), with no ffmpeg.
 *
 * The installed Google Chrome plays the recording once, in real time, and
 * hands each frame it shows to its own H.264 encoder (WebCodecs); mp4-muxer
 * packs the frames into one MP4 with its index at the front, so it starts
 * playing at once and its length is known. Chrome's own MediaRecorder writes
 * a fragmented MP4 instead, which players show as a few seconds long and
 * cannot seek, so it is not used. The page is served as localhost because
 * WebCodecs runs only on a secure page.
 *
 *   node demo-videos/to-mp4.mjs <in.webm> <out.mp4>
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node demo-videos/to-mp4.mjs <in.webm> <out.mp4>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const MUXER = fs.readFileSync(require.resolve("mp4-muxer"), "utf8");
const ORIGIN = "http://localhost";
const PAGE = `<!doctype html><meta charset="utf-8"><script src="${ORIGIN}/mp4-muxer.js"></script>
<body style="margin:0;background:#000"><video id="v" src="${ORIGIN}/in.webm" muted playsinline></video></body>`;

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await page.route(`${ORIGIN}/convert`, (route) => route.fulfill({ contentType: "text/html", body: PAGE }));
await page.route(`${ORIGIN}/mp4-muxer.js`, (route) => route.fulfill({ contentType: "text/javascript", body: MUXER }));
await page.route(`${ORIGIN}/in.webm`, (route) =>
  route.fulfill({ contentType: "video/webm", body: fs.readFileSync(input) }),
);

const out = fs.openSync(output, "w");
await page.exposeFunction("writePiece", (base64) => fs.writeSync(out, Buffer.from(base64, "base64")));
await page.goto(`${ORIGIN}/convert`);

const result = await page.evaluate(async () => {
  const video = document.getElementById("v");
  await new Promise((ready) => (video.readyState >= 2 ? ready() : video.addEventListener("loadeddata", ready, { once: true })));
  const width = video.videoWidth;
  const height = video.videoHeight;

  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: "avc", width, height, frameRate: 25 },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addVideoChunk(chunk, meta);
      } catch (error) {
        failure = error;
      }
    },
    error: (error) => (failure = error),
  });
  encoder.configure({ codec: "avc1.640028", width, height, bitrate: 8_000_000, framerate: 25 });

  // The encoder refuses the player's own frames, so each is copied through a canvas first.
  const canvas = new OffscreenCanvas(width, height).getContext("2d");
  // Every frame the player shows, stamped with its own time in the recording.
  let frames = 0;
  let lastTime = -1;
  let firstTime = -1;
  const onFrame = (_now, meta) => {
    if (meta.mediaTime > lastTime) {
      lastTime = meta.mediaTime;
      if (firstTime < 0) firstTime = meta.mediaTime;
      canvas.drawImage(video, 0, 0, width, height);
      const frame = new VideoFrame(canvas.canvas, { timestamp: Math.round(meta.mediaTime * 1e6) });
      encoder.encode(frame, { keyFrame: frames % 50 === 0 });
      frame.close();
      frames += 1;
    }
    if (!video.ended) video.requestVideoFrameCallback(onFrame);
  };
  video.requestVideoFrameCallback(onFrame);
  await video.play();
  await new Promise((ended) => video.addEventListener("ended", ended, { once: true }));
  if (failure) throw new Error(`Encoding failed: ${failure.message ?? failure}`);
  await encoder.flush();
  muxer.finalize();

  const bytes = new Uint8Array(muxer.target.buffer);
  for (let start = 0; start < bytes.length; start += 1 << 20) {
    let binary = "";
    const slice = bytes.subarray(start, start + (1 << 20));
    for (let i = 0; i < slice.length; i += 0x8000) binary += String.fromCharCode(...slice.subarray(i, i + 0x8000));
    await window.writePiece(btoa(binary));
  }
  return { frames, seconds: lastTime, firstTime };
});

fs.closeSync(out);
await browser.close();
console.log(`${output} (${result.frames} frames, ${result.firstTime} to ${Math.round(result.seconds)} s)`);
