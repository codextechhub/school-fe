import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A school's crest, which turns over on hover to write "XVS" and turns back
 * when the pointer leaves. The sidebar's mark and the sign-in page's are the
 * same object at two sizes.
 *
 * The back face is the product's wordmark, not the school's name. A school's
 * name is arbitrary text - "Holy Cross College" sets happily at this size,
 * "Government Comprehensive Secondary School, Ikeja" does not at any size that
 * is still readable - so a face carrying it needs a rule for shrinking and
 * replacing it, and every school past the rule is shown something that is not
 * its name anyway. Three fixed letters need no rule: the flip always writes the
 * same word, at one size, in full.
 *
 * The writing is Grand Hotel, which is the face the CodeX console's hand-drawn
 * "CodeX" wordmark was traced from, so the two products sign themselves in the
 * same hand. Set from the font rather than traced: the console can afford one
 * pen stroke per letter because its wordmark never changes shape, and a font
 * gets the same letters here without a second set of authored paths to keep.
 */

/** Height of the crest, in px, where the caller names none. */
const DEFAULT_SIZE = 30;

/**
 * The wordmark and the flip box, as multiples of the crest's height.
 *
 * "XVS" in Grand Hotel stands 0.75em of ink and runs 1.39em wide. Set at 1.07x
 * the crest, its ink lands a little short of the crest's height, which is the
 * allowance the console makes so the calligraphy does not tower over the
 * shield. The box is wider and taller than either face, so nothing shifts as it
 * turns and neither face is ever near an edge.
 */
const WORDMARK_SCALE = 1.07;
const BOX_WIDTH_SCALE = 1.87;
const BOX_HEIGHT_SCALE = 1.33;

/** What the back face writes. The product, in every school's sidebar. */
const WORDMARK = "XVS";

/** The mark shown for a school with no crest of its own, and its name. */
const FALLBACK_SRC = "/image/logo.png";

export function SchoolMark({
  logo,
  /**
   * Names the mark to a screen reader. Empty where an enclosing link already
   * carries the name, which is the sidebar's case: a repeat there makes a
   * screen reader say the school twice.
   */
  alt = "",
  size = DEFAULT_SIZE,
  /**
   * Turn the flip off where there is no room for the wordmark - the collapsed
   * icon rail being the case that matters. The crest still renders.
   */
  animate = true,
  className,
}: {
  logo?: string | null;
  alt?: string;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  // A crest can be missing two ways: never given to us, or given and then
  // unfetchable - a file gone from storage, or a public endpoint answering 404
  // for a slug that is not a school. Both land on the product's own mark, so
  // neither leaves a blank space where a badge belongs.
  const [failed, setFailed] = useState(false);
  const src = failed || !logo ? FALLBACK_SRC : logo;

  const crest = (className?: string) => (
    <img
      src={src}
      alt={alt}
      className={cn("w-auto", className)}
      style={{ height: size }}
      onError={() => setFailed(true)}
    />
  );

  if (!animate) return crest(className);

  return (
    <span
      className={cn("school-mark", className)}
      style={{
        height: Math.round(size * BOX_HEIGHT_SCALE),
        width: Math.round(size * BOX_WIDTH_SCALE),
      }}
    >
      <span className="school-mark__card">
        <span className="school-mark__face">{crest()}</span>

        <span className="school-mark__face school-mark__face--back">
          <span
            className="school-mark__ink whitespace-nowrap leading-none text-primary"
            style={{
              fontFamily: "var(--font-script)",
              fontSize: Math.round(size * WORDMARK_SCALE),
              fontWeight: 400,
            }}
            aria-hidden="true"
          >
            {WORDMARK}
          </span>
        </span>
      </span>
    </span>
  );
}
