import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import ArrangingShapes from "@/components/auth/arranging-shapes";
import SignInMark from "@/components/auth/sign-in-mark";
import { AuthToaster } from "@/components/ui/sonner";
import { useBrandFavicon } from "@/hooks/use-brand-favicon";
import { currentSchoolSlug } from "@/utils/school-host";
import { schoolLogoUrl } from "@/utils/school-brand";

export default function AuthLayout() {
  // Read once per mount: the address cannot change without a page load.
  const [slug] = useState(() => currentSchoolSlug());
  // The tab matched the page until the page grew a crest. A school signing in
  // at its own address should not find the product's mark in the tab strip
  // while its own badge sits on the form.
  useBrandFavicon(schoolLogoUrl(slug));

  useEffect(() => {
    document.title = "Accounts - XVS";
  }, []);

  return (
    <main className="w-screen h-screen flex bg-white">
      {/* There is no sidebar here, so the toasts centre on the viewport and
          clear only the top edge. */}
      <AuthToaster />
      {/* Left 45% - the calm, premium blue panel (desktop only). */}
      <div className="w-[45%] hidden lg:block relative bg-[#0b1f4a] bg-[radial-gradient(120%_120%_at_50%_28%,#11264f_0%,#0b1f4a_45%,#081530_100%)]">
        {/* Subtle texture layered under the shapes. */}
        <div className="absolute inset-0 size-full bg-[url(/image/authBg.png)] bg-cover bg-center opacity-[0.06] z-0" />
        <ArrangingShapes />
      </div>

      {/* Right 55% - white form column, centered. */}
      {/* Scroll container: a flex column that is at least the full viewport
          tall. The content block uses `m-auto` so it sits vertically centered
          when it fits, and - unlike `justify-center`, which clips the top of
          overflowing flex children - falls back to scrolling naturally from the
          top when the content is taller than the viewport (reset-password's 4
          fields on a short phone). `100dvh` accounts for mobile browser chrome. */}
      <div className="w-full flex-1 relative px-6 hide-scrollbar overflow-y-auto flex flex-col min-h-[100dvh]">
        <div className="w-full m-auto max-w-107.5 py-6 shrink-0">
          {/* The school's own crest when the address names one, the XVS mark
              otherwise, turning over on hover to write the wordmark. See
              components/auth/sign-in-mark. */}
          {/* Mobile-only - part of the centered block below lg. The blue
              panel carries the mark on desktop, so this is hidden there. */}
          <SignInMark size={32} className="lg:hidden mb-6" />
          {/* Desktop-only (blue panel is shown alongside). */}
          <SignInMark size={48} className="hidden lg:flex mb-6" />
          <Outlet />
        </div>
      </div>
    </main>
  );
}
