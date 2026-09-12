import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import { useAppSelector } from "@/redux/store";
import { selectSchool, selectUser } from "@/redux/features/auth/auth-slice";
import { useSchoolLogo } from "@/hooks/use-school-logo";
import { useOnboardingState } from "../use-onboarding-state";
import { humanDate, initialsOf } from "../onboarding-format";
import { ReadinessChip } from "./onboarding-chips";

/**
 * The one place the pending state is stated in words.
 *
 * It sits under the header on every onboarding screen because the school admin
 * arrives at an app whose sidebar is four items long and needs to be told why,
 * once, in plain language - not left to work it out from what is missing.
 *
 * The query here is the same cache entry the control room reads, so this costs
 * no extra request.
 */
export function OnboardingStatusStrip() {
  const { state, notProvisioned } = useOnboardingState();
  const school = useAppSelector(selectSchool);
  const user = useAppSelector(selectUser);
  const schoolName = school?.name ?? user?.school_name ?? "Your school";
  const logoUrl = useSchoolLogo();

  // Nothing useful to say until the state arrives, and nothing at all to say
  // when there is no checklist - that page carries its own explanation.
  if (!state || notProvisioned) return null;

  const isLive = state.readiness_state === "LIVE";
  const { expiry } = state;
  // The warning is a state, not an event: the server sends it once, fourteen
  // days out, and the strip stays promoted for the rest of the window.
  const warning =
    expiry.applies &&
    expiry.days_remaining !== null &&
    expiry.days_remaining <= expiry.warning_days;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-white border-b border-white-02 px-5 py-2">
        {/* The crest, not the name. The name is already in the sidebar header
            directly above this line, and printing it twice in the same corner
            of the screen reads as two different things being named. The alt
            text carries it for anyone who cannot see the image. */}
        <span
          className="size-6 shrink-0 overflow-hidden rounded bg-pry-01 text-primary grid place-content-center font-mont text-[10px] font-semibold"
          title={schoolName}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="size-full object-contain" />
          ) : (
            initialsOf(schoolName)
          )}
        </span>
        <ReadinessChip state={state.readiness_state} />
        <p className="text-xs text-gray-06">
          {isLive
            ? "Onboarding is closed. These steps are read-only."
            : "Onboarding is the only part of the app open until you go live."}
        </p>
        {expiry.applies && !warning && expiry.expires_at && (
          <p className="text-xs text-gray-05 sm:ml-auto whitespace-nowrap">
            Onboarding window closes on {humanDate(expiry.expires_at)}.
          </p>
        )}
      </div>

      {warning && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2.5 border-b px-5 py-2.5",
            "bg-yellow-01/8 border-yellow-01/30",
          )}
        >
          <span className="inline-flex items-center gap-1.5 rounded-md bg-yellow-01/15 px-2 py-0.5 text-xs font-medium font-mont text-yellow-01 whitespace-nowrap">
            <TriangleAlert className="size-3" />
            {expiry.days_remaining} days left
          </span>
          <p className="text-[13px] text-gray-01 text-pretty">
            {expiry.days_remaining} days left to complete onboarding. After that
            your sign-in will be paused until XVS restores it.
          </p>
        </div>
      )}
    </>
  );
}
