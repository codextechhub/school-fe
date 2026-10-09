import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import SignInMark from "@/components/auth/sign-in-mark";
import { AuthToaster } from "@/components/ui/sonner";
import { useBrandFavicon } from "@/hooks/use-brand-favicon";
import { useSchoolName } from "@/hooks/use-school-name";
import { currentSchoolSlug } from "@/utils/school-host";
import { schoolLogoUrl } from "@/utils/school-brand";
import "./auth-backdrop.css";

function AuthBackdrop() {
  return (
    <div className="school-auth-backdrop" aria-hidden="true">
      <div className="school-auth-backdrop__dots" />
      <div className="school-auth-backdrop__rings" />
    </div>
  );
}

/**
 * Shared school account layout.
 *
 * The address determines the school before a session exists. Its crest sits
 * above the form on phones and above the form content on desktop, with the XVS
 * mark as the existing fallback. A tall account form grows the page rather than
 * being clipped by vertical centering on a short screen.
 */
export default function AuthLayout() {
  const [slug] = useState(() => currentSchoolSlug());
  const schoolName = useSchoolName(slug);
  useBrandFavicon(schoolLogoUrl(slug));

  useEffect(() => {
    document.title = "Accounts - XVS";
  }, []);

  return (
    <>
      <AuthToaster />
      <main className="relative grid min-h-[100dvh] w-full grid-cols-1 overflow-hidden bg-[#0b1f4a] bg-[radial-gradient(105%_80%_at_50%_20%,#17396f_0%,#102957_46%,#081a3c_100%)] lg:grid-cols-[45%_55%] lg:bg-white lg:bg-none">
        <div className="lg:hidden"><AuthBackdrop /></div>
        <div className="relative hidden min-h-[100dvh] overflow-hidden bg-[#0b1f4a] bg-[radial-gradient(95%_75%_at_48%_38%,#1b3c77_0%,#102958_54%,#081a3c_100%)] lg:flex">
          <AuthBackdrop />
          <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-175 flex-col px-[clamp(30px,5vw,78px)] py-10 text-white">
            <div className="mt-auto">
              {slug && (
                <p className="mb-3 min-h-8 font-serif text-[clamp(20px,2.1vw,29px)] italic leading-tight text-[#c2d7ff]">
                  {schoolName}
                </p>
              )}
              <h2 className="max-w-130 text-[clamp(37px,3.7vw,53px)] font-semibold leading-[1.08] tracking-[-0.05em]">
                Everything in <span className="text-[#bdd3ff]">one place.</span>
              </h2>
              <img
                src="/svg/school-one-system.svg"
                alt=""
                aria-hidden="true"
                className="mt-7 w-full max-w-137.5"
              />
            </div>
            <p className="mt-auto pt-5 text-xs text-[#afc4e7]">
              One school. One clear view of what is happening.
            </p>
          </div>
        </div>
        <div className="relative flex min-h-[100dvh] min-w-0 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto my-auto w-full max-w-107.5 shrink-0">
            <SignInMark size={32} surface="blue" className="mb-6 lg:hidden" />
            <div className="rounded-2xl bg-white px-5 py-8 shadow-[0_22px_55px_#03132e55] sm:px-7 lg:rounded-none lg:px-0 lg:py-0 lg:shadow-none">
              <SignInMark size={48} className="mb-6 hidden lg:flex" />
              <Outlet />
            </div>
          </div>
          <p className="mx-auto w-full max-w-107.5 pt-5 text-center text-xs text-[#afc4e7] lg:text-[#8f9bb0]">
            Stuck here? Contact Administrator
          </p>
        </div>
      </main>
    </>
  );
}
