import { useNavigate } from "react-router";
import xvsLogo from "@/assets/svg/full-logo.svg";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/redux/store";
import { selectSchool, selectUser } from "@/redux/features/auth/auth-slice";
import { useSchoolLogo } from "@/hooks/use-school-logo";
import { routesPath } from "@/routes/routesPath";
import { SUPPORT_MAIL } from "@/utils/static";
import { useOnboardingState } from "./use-onboarding-state";
import { initialsOf } from "./onboarding-format";
import { ReadinessChip } from "./components/onboarding-chips";

/**
 * The first screen after sign-in, drawn as the design draws it: a card centred
 * on the canvas with no shell around it.
 *
 * It deliberately does not print how many steps there are. The catalogue is
 * conditional - a school without branches has one step fewer - so a number here
 * would be a promise the control room might not keep. "A short checklist" is
 * true for every school, and the control room counts it for the one reading it.
 */
export default function OnboardingWelcome() {
  const navigate = useNavigate();
  const { state, isLoading } = useOnboardingState();
  const user = useAppSelector(selectUser);
  const school = useAppSelector(selectSchool);
  const logoUrl = useSchoolLogo();

  const schoolName = school?.name ?? user?.school_name ?? "your school";
  // The design greets the person by their full name, not their first. This is
  // the one screen that is a greeting rather than a workspace, so the formality
  // is the point.
  const greetingName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.first_name ||
    "there";

  return (
    <main className="min-h-dvh bg-white-05 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-140 flex flex-col gap-4">
        <img
          src={xvsLogo}
          alt="XVS"
          className="h-8 w-auto self-start"
          onError={(event) => {
            // The bundled mark is the fallback; a missing file must not leave a
            // broken-image icon at the top of the first screen anyone sees.
            event.currentTarget.style.display = "none";
          }}
        />

        <div className="bg-white rounded-md border border-white-02 px-6 py-8 sm:px-9">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-05 font-mont">
            School Onboarding
          </p>
          <h1 className="mt-2.5 text-2xl font-semibold text-black-01 leading-snug text-balance">
            Welcome, {greetingName}
          </h1>
          <p className="mt-2.5 text-sm text-gray-01 text-pretty">
            Let's get {schoolName} ready to go live. Onboarding is a short
            checklist: you confirm what CodeX has already set up, fill in what
            only you know, and pick up where you left off.
          </p>

          <div className="mt-6 flex items-center gap-3.5 rounded-md border border-border p-4">
            <div className="size-11 shrink-0 overflow-hidden rounded-md bg-pry-01 text-primary grid place-content-center font-mont font-semibold text-sm">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="size-full object-contain"
                />
              ) : (
                initialsOf(schoolName)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold font-mont text-black-01 truncate">
                {schoolName}
              </p>
              <p className="mt-0.5 text-xs text-gray-06 truncate">
                {school?.slug ? `${school.slug} · ` : ""}West Africa Time
              </p>
            </div>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              state && <ReadinessChip state={state.readiness_state} />
            )}
          </div>

          <p className="mt-4 text-[13px] text-gray-05 text-pretty">
            You have 90 days to complete onboarding. We will remind you before it
            closes.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <Button
              className="h-11"
              onClick={() => navigate(routesPath.PROTECTED.ONBOARDING.INDEX)}
            >
              Enter Onboarding Control Room
              <ArrowRight />
            </Button>
            {user?.email && (
              <p className="text-center text-xs text-gray-05">
                Signed in as {user.email}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-05">
          Stuck? Reach the CodeX team at{" "}
          <a href={`mailto:${SUPPORT_MAIL}`}>{SUPPORT_MAIL}</a>
        </p>
      </div>
    </main>
  );
}
