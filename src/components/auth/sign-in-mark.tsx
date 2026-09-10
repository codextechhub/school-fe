import { useState } from "react";

import { SchoolMark } from "@/components/school-mark";
import { cn } from "@/lib/utils";
import { currentSchoolSlug } from "@/utils/school-host";
import { schoolLogoUrl } from "@/utils/school-brand";

/**
 * The mark at the top of the sign-in page, which turns over on hover to write
 * "XVS" the way the sidebar's does.
 *
 * The flip and the crest fallback are components/school-mark's; what this adds
 * is where the crest comes from. The sidebar is handed a logo the session has
 * already fetched, and this runs before any session exists, so it has to
 * resolve the crest from the address alone.
 *
 * A school's own crest where the address names a school and that school has
 * uploaded one, and the XVS shield otherwise. Which matters because this is the
 * page where somebody decides whether they are in the right place: staff at
 * Holy Cross reaching holy-cross.xvs.codexng.com should see their own badge,
 * and the bare product address has no school to show.
 *
 * The fallback is driven by the image failing to load rather than by asking
 * first. The endpoint answers 404 for a school with no crest and for a slug
 * that is not a school at all, deliberately without distinguishing them, so
 * there is nothing to be gained by a probe request that a plain onError does
 * not already tell us - and this way the common case is one request, not two.
 */
export default function SignInMark({
  /** Height of the crest, in px. */
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  // Read once per mount: the address cannot change without a page load.
  const [slug] = useState(() => currentSchoolSlug());
  const url = schoolLogoUrl(slug);

  return (
    // The flip box is inline-block, so centring is the row's job rather than
    // the mark's own margins.
    <div className={cn("flex justify-center", className)}>
      <SchoolMark
        logo={url || null}
        // Named from the address rather than from which image won: on a school's
        // own host the mark stands for that school whether its badge loaded or
        // the shield stood in, and the bare product host has no school to name.
        alt={url ? "School logo" : "XVS"}
        size={size}
      />
    </div>
  );
}
