import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Dot,
  Headset,
  RefreshCw,
  SearchX,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { requestSupportOpen } from "@/components/layout/support-open";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useRevalidateOnboardingMutation } from "@/redux/services/onboarding/onboarding-api";
import type {
  OnboardingState,
  ReadinessState,
} from "@/redux/services/onboarding/onboarding-types";
import { apiErrorMessage } from "@/utils/api-error";
import { SUPPORT_MAIL } from "@/utils/static";
import { useOnboardingState } from "./use-onboarding-state";
import { humanDate, humanDateTime } from "./onboarding-format";
import { ReadinessChip } from "./components/onboarding-chips";
import { OutlinedNotice } from "./components/outlined-notice";
import { ProgressRing } from "./components/progress-ring";
import { TaskCard } from "./components/task-card";
import { taskMeta } from "./task-catalog";
import { PageShell } from "@/components/layout/page-shell";

/**
 * The Onboarding Control Room - the home base for a school that is not live yet.
 *
 * Everything on this screen comes from `GET /onboarding/state/` in one call: the
 * checklist, the counts, the readiness state, what is blocking the gate and the
 * expiry window. Nothing here recomputes the gate. A school that has no branch
 * step simply has no branch card, because the server did not send one - the
 * count says "3 of 7", not "3 of 8", and no slot is left where a step this
 * school will never have would have been.
 */
export default function OnboardingControlRoom() {
  const {
    state,
    isLoading,
    notProvisioned,
    closedToYou,
    unexpectedError,
    refetch,
  } = useOnboardingState();

  if (isLoading) return <ControlRoomSkeleton />;

  // Three failures, three screens. A control room that was never provisioned is
  // somebody's bug and needs CodeX; a 403 is a door that opens later; anything
  // else is worth retrying.
  if (notProvisioned) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={SearchX}
          title="We could not find your onboarding checklist"
          body="Your school exists, but its onboarding control room was never set up. CodeX needs to provision it before you can start."
          actionLabel="Contact CodeX"
          onAction={() => requestSupportOpen()}
        />
      </PageShell>
    );
  }

  if (closedToYou) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={ShieldOff}
          title="You cannot open the onboarding checklist"
          body={`Your account does not carry access to this school's onboarding. Ask whoever set up your account, or reach CodeX at ${SUPPORT_MAIL}.`}
        />
      </PageShell>
    );
  }

  if (unexpectedError || !state) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CircleAlert}
          title="We could not load your checklist"
          body="Something went wrong on the way to the server. Your steps are untouched."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return <ControlRoom state={state} />;
}

function ControlRoom({ state }: { state: OnboardingState }) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [revalidate, { isLoading: isChecking }] =
    useRevalidateOnboardingMutation();

  const { counts, tasks, blocking_tasks: blockers } = state;
  const isLive = state.readiness_state === "LIVE";

  // Two ways to end up watching rather than working: the school is live and
  // onboarding is closed, or you are a branch admin, who holds the key that
  // reads this screen and none of the keys that change it. The screen is the
  // same either way - the counts, the checklist and the gate, with nothing to
  // press. Gating on the key rather than the role keeps this true for whatever
  // roles a school invents later.
  const canWorkTasks = hasPermission(P.UPDATE_ONBOARDING_TASK);
  const checklistReadOnly = isLive || !canWorkTasks;
  const percent =
    counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

  const titleOf = (key: string) =>
    tasks.find((task) => task.key === key)?.title ?? key;

  // The step to point at next: the first required one still outstanding, or
  // failing that the first outstanding step of any kind. Skipped steps are not
  // outstanding - the school has already said it will come back to them.
  const outstanding = tasks.filter(
    (task) => task.status !== "DONE" && task.status !== "SKIPPED",
  );
  const nextTask =
    outstanding.find((task) => task.is_required) ?? outstanding[0] ?? null;

  const onRecheck = async () => {
    try {
      const result = await revalidate().unwrap();
      const after = result.data.readiness_state;
      toast.success(
        after === "READY"
          ? "Checked. You are ready to go live."
          : after === state.readiness_state
            ? "Checked. Nothing has changed."
            : "Checked. Your readiness has moved.",
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not run the check. Try again."),
      );
    }
  };

  return (
    <PageShell className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold font-mont text-black-01">
            Onboarding Control Room
          </h2>
          <p className="mt-1 text-sm text-gray-01 text-pretty">
            Everything your school needs before it can go live. Take the steps in
            any order.
          </p>
        </div>
        {isLive && (
          <Button onClick={() => navigate(routesPath.PROTECTED.OVERVIEW.INDEX)}>
            Go to dashboard
            <ArrowRight />
          </Button>
        )}
      </div>

      {/* ── Progress summary ───────────────────────────────────────────── */}
      <section className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex items-center gap-5">
          <ProgressRing value={percent} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-gray-05 font-mont">
              Go-live status
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold font-mont",
                blockers.length > 0 ? "text-destructive" : "text-black-01",
              )}
            >
              {readinessHeadline(state.readiness_state, blockers.length)}
            </p>
            <p className="mt-1.5 text-[13px] text-gray-06 max-w-[34ch] text-pretty">
              {readinessDetail(state, titleOf)}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <p className="text-xs text-gray-05">
                {state.last_validation_at
                  ? `Last checked ${humanDateTime(state.last_validation_at)}`
                  : "Not checked yet"}
              </p>
              {!isLive && canWorkTasks && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={onRecheck}
                  loading={isChecking}
                  disabled={isChecking}
                >
                  <RefreshCw />
                  Re-check
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* The Skipped tile appears only once something has been skipped: a
            school that skipped nothing should not carry an empty column. */}
        <div
          className={cn(
            "grid grid-cols-2 gap-x-3 gap-y-4",
            counts.skipped > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3",
          )}
        >
          <StatTile label="Completed" value={counts.done} />
          <StatTile label="Remaining" value={counts.remaining} />
          {counts.skipped > 0 && (
            <StatTile label="Skipped" value={counts.skipped} muted />
          )}
          <StatTile
            label="Blockers"
            value={blockers.length}
            tone={blockers.length > 0 ? "destructive" : "default"}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-5">
        {/* ── The checklist ────────────────────────────────────────────── */}
        <div className="flex-[5_1_460px] min-w-0 flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.key} task={task} readOnly={checklistReadOnly} />
          ))}
        </div>

        {/* ── The rail ─────────────────────────────────────────────────── */}
        <div className="flex-[1_1_280px] min-w-0 flex flex-col gap-3">
          <GoLivePanel state={state} titleOf={titleOf} />

          {nextTask && !isLive && (
            <section className="bg-white rounded-md border border-white-02 p-4.5">
              <p className="text-xs uppercase tracking-widest text-gray-05 font-mont">
                Next best action
              </p>
              <p className="mt-2 text-sm font-semibold font-mont text-black-01">
                {nextTask.title}
              </p>
              <p className="mt-1 text-[13px] text-gray-06 text-pretty">
                {nextTask.status === "IN_PROGRESS"
                  ? "You started this one. Finishing it clears a go-live blocker."
                  : nextTask.is_required
                    ? "Your school cannot go live until this one is done."
                    : "Optional, but it is the next thing on your list."}
              </p>
              {/* Takes the reader to the screen behind the step where there is
                  one, and to the step's own card where there is not. */}
              <Button
                className="mt-3.5 w-full"
                onClick={() => {
                  const route = taskMeta(nextTask.key).route;
                  if (route) navigate(route);
                  else
                    document
                      .getElementById(`task-${nextTask.key}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                Continue
                <ArrowRight />
              </Button>
            </section>
          )}

          <section className="bg-white rounded-md border border-white-02 p-4.5">
            <p className="text-xs uppercase tracking-widest text-gray-05 font-mont">
              Required for go-live
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {tasks
                .filter((task) => task.is_required)
                .map((task) => {
                  const done = task.status === "DONE";
                  return (
                    <div
                      key={task.key}
                      className={cn(
                        "flex items-center gap-2 text-[13px]",
                        // The accessible sibling, not the raw hue: this is
                        // 13px text, and #16A34A measures 3.30:1 on white.
                        done ? "text-green-01-text" : "text-gray-06",
                      )}
                    >
                      {done ? (
                        <Check className="size-4 shrink-0" />
                      ) : (
                        <Dot className="size-4 shrink-0" />
                      )}
                      <span className="min-w-0 truncate">{task.title}</span>
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="bg-white rounded-md border border-white-02 p-4.5">
            <p className="text-sm font-semibold font-mont text-black-01">
              Need a hand?
            </p>
            <p className="mt-1 text-[13px] text-gray-06 text-pretty">
              Tell us what went wrong and we will pick it up.
            </p>
            <Button
              variant="outline"
              className="mt-3.5 w-full border-primary text-primary"
              onClick={() => requestSupportOpen()}
            >
              <Headset />
              Escalate an issue
            </Button>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

/** The compact gate, mirroring the go-live screen so the two cannot disagree. */
function GoLivePanel({
  state,
  titleOf,
}: {
  state: OnboardingState;
  titleOf: (key: string) => string;
}) {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const goLive = () => navigate(routesPath.PROTECTED.ONBOARDING.GO_LIVE);
  const readiness = state.readiness_state;

  // The panel's words come from the state payload, so anyone who can read the
  // control room can read where the school stands. Only the buttons are gated:
  // asking CodEx to go live is the school administrator's to do, and the
  // request screen is closed to a reader without the go-live key.
  const canRequest = hasPermission(P.REQUEST_GO_LIVE);
  const canReadRequests = hasPermission(P.VIEW_GO_LIVE_REQUESTS);

  return (
    <section className="bg-white rounded-md border border-white-02 p-4.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold font-mont text-black-01">
          Going live
        </p>
        <ReadinessChip state={readiness} />
      </div>

      {readiness === "NOT_READY" && (
        <>
          <p className="mt-2 text-[13px] text-gray-06 text-pretty">
            {state.blocking_tasks.length > 0
              ? `You have ${state.blocking_tasks.length} required ${plural(state.blocking_tasks.length, "step")} left: ${state.blocking_tasks.map(titleOf).join(", ")}.`
              : "Your required steps are not all done yet."}
          </p>
          {/* Disabled rather than hidden: the school needs to see that this is
              where go-live lives, and why it cannot press it yet. Absent
              entirely for a reader who could never press it at all. */}
          {canRequest && (
            <Button className="mt-3.5 w-full" disabled>
              Request go-live
            </Button>
          )}
        </>
      )}

      {readiness === "READY" && (
        <>
          <p className="mt-2 text-[13px] text-gray-06 text-pretty">
            Everything required is done. You can ask CodeX to take your school
            live.
          </p>
          {canRequest && (
            <Button className="mt-3.5 w-full" onClick={goLive}>
              Request go-live
            </Button>
          )}
        </>
      )}

      {readiness === "PENDING_APPROVAL" && (
        <>
          <p className="mt-2 text-[13px] text-gray-06 text-pretty">
            Your request is with CodeX. They review every one by hand.
          </p>
          {canReadRequests && (
            <Button variant="outline" className="mt-3.5 w-full" onClick={goLive}>
              View request
            </Button>
          )}
        </>
      )}

      {readiness === "LIVE" && (
        <>
          <p className="mt-2 text-[13px] text-gray-06 text-pretty">
            {state.go_live_at
              ? `Your school went live on ${humanDate(state.go_live_at)}. Onboarding is closed and these steps are now read-only.`
              : "Your school is live. Onboarding is closed and these steps are now read-only."}
          </p>
          {canReadRequests && (
            <Button variant="outline" className="mt-3.5 w-full" onClick={goLive}>
              View request history
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function StatTile({
  label,
  value,
  muted,
  tone = "default",
}: {
  label: string;
  value: number;
  muted?: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="border-l border-border pl-3.5">
      <p
        className={cn(
          "text-xl font-semibold font-mont",
          tone === "destructive" ? "text-destructive" : "text-black-01",
          muted && "text-gray-05",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-gray-05">{label}</p>
    </div>
  );
}

const plural = (count: number, word: string) =>
  count === 1 ? word : `${word}s`;

function readinessHeadline(state: ReadinessState, blockers: number): string {
  if (state === "READY") return "Ready to go live";
  if (state === "PENDING_APPROVAL") return "Waiting on CodeX";
  if (state === "LIVE") return "Live";
  // The count belongs in the headline, not only in a tile: "Not ready" alone
  // does not say how far off the school is.
  if (blockers > 0) {
    return `Not ready - ${blockers} ${plural(blockers, "blocker")}`;
  }
  return "Not ready";
}

function readinessDetail(
  state: OnboardingState,
  titleOf: (key: string) => string,
): string {
  if (state.readiness_state === "READY") {
    return "Everything required is done. Send your request whenever you are ready.";
  }
  if (state.readiness_state === "PENDING_APPROVAL") {
    return "Waiting on CodeX to review your request.";
  }
  if (state.readiness_state === "LIVE") {
    return "Your school is live and onboarding is closed.";
  }
  const count = state.blocking_tasks.length;
  if (count === 0) return "Your required steps are not all done yet.";
  // Name the steps, and say the thing a school worries about: that setting an
  // optional step aside has cost it nothing.
  const named = state.blocking_tasks.map(titleOf).join(", ");
  return `Go-live blocked: ${named}. Optional steps you skip don't block you.`;
}

/** Ghosts shaped like the summary and the checklist that are about to arrive. */
function ControlRoomSkeleton() {
  return (
    <PageShell className="space-y-5" aria-busy>
      <span className="sr-only">Loading your onboarding checklist…</span>
      <Skeleton className="h-6 w-64" aria-hidden />
      <div className="bg-white rounded-md border border-white-02 px-4 py-5 sm:px-6" aria-hidden>
        <div className="flex items-center gap-5">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-5" aria-hidden>
        <div className="flex-[5_1_460px] min-w-0 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-md" />
          ))}
        </div>
        <div className="flex-[1_1_280px] min-w-0 space-y-3">
          <Skeleton className="h-36 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>
      </div>
    </PageShell>
  );
}
