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
 *   node demo-videos/to-mp4.mjs <out.mp4> <part-1.webm> <part-2.webm> ...
 *
 * Several recordings are joined in order into one MP4, so a long walkthrough
 * can be filmed in parts and a part re-filmed alone. A recording with a
 * ``<name>.webm.json`` beside it (written by stage.mjs) is played from its
 * ``trimStart`` to its ``trimEnd`` second, which leaves out the moment the
 * stage spends loading before its first caption. Its ``cuts``, a list of
 * ``[from, to]`` seconds, are left out too: a wait on camera for the server
 * to finish (a class's invoices rendering, a receipt posting) becomes a cut.
 * Its ``overlays``, ``[{image, x, y}]``, are drawn over every frame of the
 * part: a clean copy of a fixed piece of the stage (the drawn phone's status
 * bar) laid over a take that filmed it marred.
 *
 * Beside the MP4 it writes ``<out>.scenes.json``: the second each scene
 * starts in the finished film. Parts filmed by a stage that logs its captions
 * (``captions`` in the sidecar) are timed from that log, mapped through each
 * part's trim and cuts; a caption that continues the scene before it starts
 * nothing. Older parts fall back to watching the stage's caption change on
 * screen, which a switch between the phone and the browser also trips. A
 * voiceover is timed from it.
 *
 * With ``AUDIO=<file.wav>`` the WAV becomes the film's sound, encoded as AAC
 * from its first second, and the scene times are left as they were. A scene
 * file can be corrected by hand before the voiceover is built from it.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const [output, inputs] = args[0]?.endsWith(".mp4") ? [args[0], args.slice(1)] : [args[1], [args[0]]];
if (!output || !inputs.length || inputs.some((name) => !name)) {
  console.error("Usage: node demo-videos/to-mp4.mjs <in.webm> <out.mp4>, or <out.mp4> <part.webm> ...");
  process.exit(1);
}
/** Where each part plays from and to, in seconds of its own recording. */
const parts = inputs.map((name) => {
  const side = `${name}.json`;
  const trim = fs.existsSync(side) ? JSON.parse(fs.readFileSync(side, "utf8")) : {};
  return {
    start: trim.trimStart ?? 0, end: trim.trimEnd ?? Infinity, cuts: trim.cuts ?? [],
    captions: trim.captions ?? null,
    overlays: (trim.overlays ?? []).map((overlay) => ({
      ...overlay, data: fs.readFileSync(path.resolve(path.dirname(name), overlay.image)).toString("base64"),
    })),
  };
});

const require = createRequire(import.meta.url);
const MUXER = fs.readFileSync(require.resolve("mp4-muxer"), "utf8");
const ORIGIN = "http://localhost";
const PAGE = `<!doctype html><meta charset="utf-8"><script src="${ORIGIN}/mp4-muxer.js"></script>
<body style="margin:0;background:#000"><video id="v" muted playsinline></video></body>`;

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await page.route(`${ORIGIN}/convert`, (route) => route.fulfill({ contentType: "text/html", body: PAGE }));
await page.route(`${ORIGIN}/mp4-muxer.js`, (route) => route.fulfill({ contentType: "text/javascript", body: MUXER }));
for (const [index, name] of inputs.entries()) {
  await page.route(`${ORIGIN}/part-${index}.webm`, (route) =>
    route.fulfill({ contentType: "video/webm", body: fs.readFileSync(name) }),
  );
}

const AUDIO = process.env.AUDIO ? fs.readFileSync(process.env.AUDIO) : null;
if (AUDIO) await page.route(`${ORIGIN}/audio.wav`, (route) => route.fulfill({ contentType: "audio/wav", body: AUDIO }));

const out = fs.openSync(output, "w");
await page.exposeFunction("writePiece", (base64) => fs.writeSync(out, Buffer.from(base64, "base64")));
if (process.env.DEBUG) page.on("console", (message) => console.log(`  ${message.text()}`));
await page.goto(`${ORIGIN}/convert`);

const result = await page.evaluate(async ([parts, debug, withAudio]) => {
  const video = document.getElementById("v");
  const load = (src) => new Promise((ready) => {
    video.addEventListener("loadeddata", ready, { once: true });
    video.src = src;
  });
  await load(`${location.origin}/part-0.webm`);
  const width = video.videoWidth;
  const height = video.videoHeight;

  const sound = withAudio
    ? await new AudioContext().decodeAudioData(await (await fetch(`${location.origin}/audio.wav`)).arrayBuffer())
    : null;
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: "avc", width, height, frameRate: 25 },
    ...(sound ? { audio: { codec: "aac", numberOfChannels: 1, sampleRate: sound.sampleRate } } : {}),
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  let failure = null;
  if (sound) {
    // The whole track is encoded up front: it is short, and the muxer orders the two tracks itself.
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (error) => (failure = error),
    });
    audioEncoder.configure({ codec: "mp4a.40.2", sampleRate: sound.sampleRate, numberOfChannels: 1, bitrate: 128_000 });
    const samples = sound.getChannelData(0);
    for (let at = 0; at < samples.length; at += 1024) {
      const slice = samples.slice(at, Math.min(at + 1024, samples.length));
      const data = new AudioData({
        format: "f32-planar", sampleRate: sound.sampleRate, numberOfFrames: slice.length,
        numberOfChannels: 1, timestamp: Math.round((at / sound.sampleRate) * 1e6), data: slice,
      });
      audioEncoder.encode(data);
      data.close();
    }
    await audioEncoder.flush();
  }
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
  const canvas = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
  // Scene starts: the caption's band shrunk to a thumbnail, compared frame to frame.
  const thumb = new OffscreenCanvas(64, 16).getContext("2d", { willReadFrequently: true });
  const scenes = [0];
  let lastThumb = null;
  let lastChange = -10;
  const watchCaption = (at) => {
    const bar = canvas.getImageData(955, 214, 10, 4).data;
    const browserLayout = bar[0] > 230 && bar[1] > 230 && bar[2] > 230;
    const [sx, sy, sw, sh] = browserLayout ? [110, 30, 1700, 160] : [120, 120, 860, 840];
    thumb.drawImage(canvas.canvas, sx, sy, sw, sh, 0, 0, 64, 16);
    const pixels = thumb.getImageData(0, 0, 64, 16).data;
    const now = new Float32Array(64 * 16);
    for (let i = 0; i < now.length; i += 1) now[i] = (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3;
    if (lastThumb) {
      let diff = 0;
      for (let i = 0; i < now.length; i += 1) diff += Math.abs(now[i] - lastThumb[i]);
      if (diff / now.length > 3) {
        if (at - lastChange > 2) scenes.push(Math.round(at * 100) / 100);
        lastChange = at;
      }
    }
    lastThumb = now;
  };
  const DEBUG = debug;
  let frames = 0;
  let offset = 0;
  // The part being played. A part that ends on its "ended" event leaves its
  // frame callback registered, and that callback must not act on the next part.
  let playing = -1;
  const partOffsets = [];
  for (const [index, part] of parts.entries()) {
    playing = index;
    partOffsets.push(offset);
    const overlays = await Promise.all(part.overlays.map(async (overlay) => ({
      ...overlay,
      bitmap: await createImageBitmap(await (await fetch(`data:image/png;base64,${overlay.data}`)).blob()),
    })));
    if (index > 0) await load(`${location.origin}/part-${index}.webm`);
    console.log(`part ${index}: playing from ${part.start} to ${part.end}`);
    // Every frame the player shows inside the part's span, stamped after the parts before it.
    let lastTime = -1;
    let partEnd = 0;
    await new Promise((done) => {
      const onFrame = (_now, meta) => {
        if (playing !== index) return;
        const t = meta.mediaTime;
        if (t > part.end) {
          video.pause();
          done();
          return;
        }
        const cutHere = part.cuts.some(([from, to]) => t >= from && t < to);
        if (t > lastTime && t >= part.start && !cutHere) {
          lastTime = t;
          canvas.drawImage(video, 0, 0, width, height);
          for (const overlay of overlays) canvas.drawImage(overlay.bitmap, overlay.x, overlay.y);
          const skipped = part.cuts.reduce((sum, [from, to]) => sum + (t >= to ? to - from : 0), 0);
          const at = offset + (t - part.start - skipped);
          watchCaption(at);
          const frame = new VideoFrame(canvas.canvas, { timestamp: Math.round(at * 1e6) });
          encoder.encode(frame, { keyFrame: frames % 50 === 0 });
          frame.close();
          frames += 1;
          partEnd = at;
        }
        if (video.ended) {
          done();
          return;
        }
        video.requestVideoFrameCallback(onFrame);
        // Back-pressure: a long join outruns the encoder and the player stalls,
        // so playback waits while the encoder catches up. Frames carry their
        // own recording time, so a pause changes nothing in the film.
        if (encoder.encodeQueueSize > 12 && !video.paused) {
          video.pause();
          const resume = setInterval(() => {
            if (encoder.encodeQueueSize > 2) return;
            clearInterval(resume);
            video.play();
          }, 20);
        }
      };
      video.addEventListener("ended", () => done(), { once: true });
      video.requestVideoFrameCallback(onFrame);
      video.play().catch((error) => console.log(`part ${index}: play refused: ${error.message}`));
      if (DEBUG) {
        const watch = setInterval(() => console.log(`part ${index}: time ${video.currentTime.toFixed(1)} paused ${video.paused} ended ${video.ended} queue ${encoder.encodeQueueSize} frames ${frames}`), 5000);
        video.addEventListener("emptied", () => clearInterval(watch), { once: true });
      }
    });
    console.log(`part ${index}: done at ${partEnd}`);
    offset = partEnd + 0.04;
  }
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
  return { frames, seconds: offset, partOffsets, scenes: scenes.filter((t, i) => i === 0 || t > 0.5) };
}, [parts.map((p) => ({ start: p.start, end: Number.isFinite(p.end) ? p.end : 1e9, cuts: p.cuts, overlays: p.overlays })), !!process.env.DEBUG, !!AUDIO]);

fs.closeSync(out);
await browser.close();
/** Scene starts from the parts' caption logs, or null when a part has none. */
function loggedScenes() {
  if (parts.some((part) => !part.captions)) return null;
  const starts = [];
  parts.forEach((part, index) => {
    for (const shown of part.captions) {
      if (shown.continued) continue;
      const t = Math.max(shown.at, part.start);
      const skipped = part.cuts.reduce((sum, [from, to]) => sum + (t >= to ? to - from : 0), 0);
      starts.push(Math.round((result.partOffsets[index] + t - part.start - skipped) * 100) / 100);
    }
  });
  return starts;
}
const logged = loggedScenes();
if (logged) result.scenes = logged;
// A join that adds the sound keeps the scene times the sound was timed from.
if (!AUDIO) fs.writeFileSync(`${output.replace(/\.mp4$/, "")}.scenes.json`, JSON.stringify({ seconds: result.seconds, scenes: result.scenes }, null, 1));
console.log(`${output} (${result.frames} frames, ${Math.round(result.seconds)} s from ${inputs.length} part${inputs.length === 1 ? "" : "s"})`);
