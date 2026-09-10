# The XVS wordmark and its write-on

`src/components/school-mark.tsx` turns a school's crest over on hover and writes
"XVS" in calligraphy underneath it. This note covers where the artwork came from
and how to change it, because none of it is obvious from the path data.

console-fe writes "CodeX" the same way, from the same face, with the same
generator. The two are deliberately siblings: the products sign themselves in
one hand. Neither imports the other, so a change here does not reach the console
and a change there does not reach this app.

## What ships

Nothing is downloaded at runtime. `src/components/xvs-wordmark.ts` holds:

- `INK` - the filled wordmark as a single SVG path.
- `PEN` - five pen strokes tracing the letters in the order a hand writes them,
  each with its slice of the write-on's timeline.

Shipping outlines rather than a webfont means no extra request, no flash of a
fallback face while the font loads, and no dependency on a font being installed.

## Where the letterforms came from

Grand Hotel, under the SIL Open Font License 1.1, which permits using and
redistributing the outlines: <https://fonts.google.com/specimen/Grand+Hotel>.

## How the write-on works

The filled wordmark is painted through an SVG `<mask>` whose content is the pen
strokes, stroked thick and white. Walking a stroke's `stroke-dashoffset` down to
zero grows the mask along the stroke, so the letters emerge along the path the
pen travels rather than fading in or wiping across. All five strokes are laid end
to end on one timeline, so the letters arrive in the order they are written: the
X's two diagonals, the V's entry flourish rising from its curl, the V itself down
the stem and back up the right leg, and the S in one motion from the curl inside
its loop to the tail under the bowl.

Three details that are load-bearing:

- **Timing comes from arc length.** `s` (start) and `l` (length) are each
  stroke's share of the real total, so the pen holds a constant speed instead of
  spending as long on the V's short flourish as on the whole of the S.
- **`o` (the resting dash offset) is above 1, per stroke.** The mask strokes have
  round caps, so at an offset of exactly 1 the cap still paints a dot half a
  stroke-width beyond the end of the dash: a speck of ink appears before the pen
  has reached it. Each stroke is pushed back by its own half-cap-over-length
  (`o = 1 + (stroke-width / 2) / arc length`), so the short strokes need a much
  larger push than the long ones.
- **Everything is a CSS transition, never a keyframe animation.** Transitions
  retarget from wherever the property currently sits, so moving the pointer on
  and off quickly reverses the spin from mid-flight rather than snapping back and
  replaying. The delays are declared twice - in the resting rule (which plays on
  the way out) and in the hover rule (the way in) - which is what makes the
  letters un-write from the S back to the X.

## Changing it

**Retiming** - the CSS custom properties on `.school-mark` in `src/index.css`
(`--flip-in`, `--draw-in`, `--draw-start` and their `-out` counterparts). No
regeneration needed.

**A different mask stroke-width** - `o` in `xvs-wordmark.ts` is derived from it,
so regenerate `o` with the new half-width. Too thin and the pen misses parts of a
letter; too thick and it spills onto the next letter and reveals it early. Both
were measured against this artwork: coverage is complete from 22 upwards, and the
V's pen starts touching the left edge of the S at 28. 26 is the tested value,
with margin on both sides.

**New word, or a different face** - regenerate `INK`, then re-trace `PEN` by
hand. There is no automatic way to get a centreline from a filled outline; these
strokes were drawn against a coordinate grid over the artwork and checked by
rendering the reveal at intervals and looking at it.

### Regenerating INK

The generator is `scripts/wordmark-path.py` (needs `fonttools` and `brotli`). It
wants a TTF, and the repo carries the face as woff2, so convert first:

```python
from fontTools.ttLib import TTFont
f = TTFont("node_modules/@fontsource/grand-hotel/files/grand-hotel-latin-400-normal.woff2")
f.flavor = None
f.save("/tmp/GrandHotel-Regular.ttf")
```

(That package is not a dependency any more - the outlines ship instead - so
install it for the length of the job and remove it again.)

```bash
python3 scripts/wordmark-path.py /tmp/GrandHotel-Regular.ttf XVS 100
```

It lays the glyphs out with the font's own advances and kerning, measures the ink
box, flips y (font space is y-up, SVG is y-down), normalises to a 100-unit height
and prints the viewBox and the path. Keep `WORDMARK_VIEWBOX` and `WORDMARK_RATIO`
in step with the viewBox it reports.

### Checking a change

Coverage matters as much as looks: at the end of the write-on the mask must
reveal *all* the ink, or letters keep a permanently missing sliver. Rasterise the
raw fill and the fully-revealed mask at the same size, count the ink pixels the
mask leaves behind, and render the reveal at 0%, 25%, 50%, 75% and 100% and look
at it. The current strokes leave nothing unrevealed, and no letter shows any ink
before its own stroke begins.
