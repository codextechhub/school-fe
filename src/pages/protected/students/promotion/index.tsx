import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Check, GraduationCap } from "lucide-react";

import KpiCard from "@/components/custom/kpi-card";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { useStudentsLens } from "@/hooks/use-students-lens";
import { Panel } from "@/components/custom/surface";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { cn } from "@/lib/utils";
import { writeErrorMessage } from "@/utils/api-error";
import { useGetSessionsQuery } from "@/redux/services/academics/academics-api";
import {
  usePreviewPromotionMutation,
  useRunPromotionMutation,
} from "@/redux/services/students/students-api";
import type {
  PromotionBatch,
  PromotionOutcome,
  PromotionPlan,
} from "@/redux/services/students/students-types";

import { ConfirmDialog } from "../drawers/confirm-dialog";
import { ClassGroups } from "./class-groups";
import { OUTCOME, destinationOf } from "./outcome";

const STEPS = ["Target year", "Review students", "Confirm", "Done"];

/**
 * The end-of-session move.
 *
 * **The preview is the server's, not ours.** It runs the same classification
 * the run does, so the overrides go to BOTH: counts computed here from the
 * override map would be a second opinion, and the number on the confirm step
 * has to be the number the run acts on. Every step that changes an override
 * re-previews rather than doing the arithmetic itself.
 *
 * **Nothing is silently skipped.** A student the run will not touch appears on
 * the exception list with the reason, and the reasons are the server's own
 * sentences - printed verbatim, because they say whose problem each one is.
 * Class-wide causes collapse to one row however many students they cover;
 * per-student causes get one each.
 *
 * **The target year is usually empty, and that is the normal case.** A school
 * copies its structure forward before promoting into it, so "there is no class
 * at the next level" is what this screen says most of the first time it is
 * opened - and it says where to go and fix it rather than showing a wall of
 * held students with no explanation.
 */
export default function Promotion() {
  const { lens, narrowed, label } = useStudentsLens();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState("");
  const [overrides, setOverrides] = useState<Record<string, PromotionOutcome>>(
    {},
  );
  const [plan, setPlan] = useState<PromotionPlan | null>(null);
  const [done, setDone] = useState<PromotionBatch | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data: sessionsData, isLoading: sessionsLoading } =
    useGetSessionsQuery();
  const [preview, { isLoading: previewing }] = usePreviewPromotionMutation();
  const [run, { isLoading: running }] = useRunPromotionMutation();

  const sessions = useMemo(() => sessionsData?.data ?? [], [sessionsData]);
  // A promotion moves INTO a year that has not started. The active year is
  // where everyone already is, and an archived one refuses writes outright -
  // offering either would be offering a refusal.
  const targets = sessions.filter((s) => s.status === "DRAFT");
  const active = sessions.find((s) => s.status === "ACTIVE");

  async function refreshPlan(next = overrides) {
    if (!target) return null;
    try {
      const result = await preview({
        ...lens,
        to_session: Number(target),
        overrides: next,
      }).unwrap();
      setPlan(result.data);
      return result.data;
    } catch (error) {
      toast.error(
        writeErrorMessage(error, "We could not preview that promotion."),
      );
      return null;
    }
  }

  async function toReview() {
    const fresh = await refreshPlan();
    if (fresh) setStep(1);
  }

  async function toConfirm() {
    // Re-previewed with the overrides in hand, so the confirm step's counts
    // are the ones the run will produce and not our own arithmetic.
    const fresh = await refreshPlan();
    if (fresh) setStep(2);
  }

  function setOutcome(studentId: number, outcome: PromotionOutcome) {
    setOverrides((o) => ({ ...o, [String(studentId)]: outcome }));
  }

  function setClassOutcome(classId: number, outcome: PromotionOutcome) {
    if (!plan) return;
    const next = { ...overrides };
    for (const s of plan.students) {
      if (s.from_class_id === classId) next[String(s.id)] = outcome;
    }
    setOverrides(next);
  }

  async function execute() {
    setConfirming(false);
    try {
      // The SAME lens the preview used. A run scoped differently from the
      // preview it was confirmed against would move a set of children nobody
      // reviewed.
      const result = await run({
        ...lens,
        to_session: Number(target),
        overrides,
      }).unwrap();
      setDone(result.data);
      setStep(3);
      toast.success(result.message);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not run that promotion."));
    }
  }

  const counts = plan?.counts;
  const nothingToMove = plan != null && plan.counts.candidates === 0;
  // Every candidate held means the target year has no structure to land in.
  // Naming that beats a list of held students nobody can act on.
  const allHeld =
    plan != null &&
    plan.counts.candidates > 0 &&
    plan.counts.hold === plan.counts.candidates;

  if (!sessionsLoading && targets.length === 0) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={GraduationCap}
          title="There is no year to promote into"
          body="A promotion moves students into a year that has not started yet. Create next year in Academic Structure, copy this year's classes into it, and come back."
          actionLabel="Go to Sessions"
          onAction={() =>
            navigate(routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS)
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-black-01">Promotion</h2>
        <p className="mt-1 text-sm text-gray-01">
          The end-of-session move. Every student on the roll goes up, repeats,
          graduates or is held, and you decide which before anything is written.
        </p>
        {/* Said out loud, and on this screen more than any other: a promotion
            cannot be undone from here, so "every student on the roll" has to
            name WHICH roll. The preview and the run carry the same lens, so
            what this line describes is exactly what will move. */}
        {narrowed && (
          <p className="mt-2 inline-flex rounded-md bg-white-03 px-2.5 py-1 text-xs font-medium text-primary">
            {label} only
          </p>
        )}
      </div>

      {/* In a tray, like the profile's tabs and the classes screen: four steps
          loose on the page background read as four labels rather than one
          progress indicator with a position in it.

          Sized to the four steps rather than to the page. Stretched, the tray
          was a white band across the whole width with its content in the first
          third and nothing in the rest, which reads as a panel whose contents
          failed to load. Bordered for the same reason the cards are: the page
          is white too, so an unbordered white tray has no edge at all and the
          steps float on the background the tray exists to lift them off.

          Hidden on phones, where the labels do not fit - the strip scrolls and
          a reader sees "Target yea / Review studer / Dor", clipped words that
          read as broken. Nothing is lost: the footer says "Step 2 of 4 · Review
          students" on every width. */}
      <ol className="hidden w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-white p-1.5 sm:flex">
        {STEPS.map((label, i) => (
          <li key={label} className="min-w-0">
            <span
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3.5 text-[13.5px]",
                i === step && "bg-white-03 font-semibold text-primary",
                i !== step && "text-gray-06",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                  i < step && "bg-green-700 text-white",
                  i === step && "bg-primary text-white",
                  i > step && "bg-gray-04 text-gray-05",
                )}
              >
                {i + 1}
              </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {/* ── 1. the target year, and what each class maps to ─────────────── */}
      {step === 0 && (
        <section className="grid gap-4">
          <div className="max-w-sm">
            <label
              htmlFor="target-year"
              className="text-xs font-medium text-gray-05"
            >
              Promote into
            </label>
            <NativeSelect
              id="target-year"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setPlan(null);
                setOverrides({});
              }}
              className="mt-1 h-9"
            >
              <option value="">Select a year</option>
              {targets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            <p className="mt-1.5 text-xs text-gray-05">
              {active
                ? `Students move out of ${active.name} into the year you pick.`
                : "Students move out of the current year into the year you pick."}
            </p>
          </div>

          {plan && (
            <>
              <Panel className="px-5.5 py-5">
                <h3 className="text-sm font-semibold text-black-01">
                  Where each class goes
                </h3>
                <p className="mt-0.5 text-xs text-gray-05">
                  Resolved against the real class list, so a class can never be
                  promoted into one the school does not run.
                </p>
                <ul className="mt-3 grid gap-2">
                  {plan.level_map.map((row) => (
                    <li
                      key={row.from_id}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0 text-black-01">{row.from}</span>
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className={destinationOf(plan, row).tone}>
                          {destinationOf(plan, row).label}
                        </span>
                        <span className="text-xs text-gray-05">
                          {row.students}{" "}
                          {row.students === 1 ? "student" : "students"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Exceptions plan={plan} />
            </>
          )}
        </section>
      )}

      {/* ── 2. per-class review ─────────────────────────────────────────── */}
      {step === 1 && plan && (
        <>
          {allHeld && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Every student would be held, because {plan.to_session} has no
              classes to move them into yet. Copy this year's classes forward in
              Academic Structure first - the promotion has nowhere to land until
              you do.
            </p>
          )}
          <ClassGroups
            plan={plan}
            overrides={overrides}
            onSetStudent={setOutcome}
            onSetClass={setClassOutcome}
          />
          <Exceptions plan={plan} />
        </>
      )}

      {/* ── 3. confirm ──────────────────────────────────────────────────── */}
      {step === 2 && counts && (
        <section className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* The app's KPI card. Four label-and-number tiles is exactly
                what it is for, and a hand-written pair drifts in type scale
                the moment somebody edits one of the two screens. */}
            {(["promote", "repeat", "graduate", "hold"] as const).map((k) => (
              <KpiCard
                key={k}
                label={OUTCOME[k.toUpperCase() as PromotionOutcome].label}
                value={counts[k]}
              />
            ))}
          </div>
          <p className="text-sm text-gray-05">
            {counts.candidates === 1
              ? `1 student moves into ${plan?.to_session}. `
              : `${counts.candidates} students move into ${plan?.to_session}. `}
            {counts.graduate > 0 &&
              (counts.graduate === 1
                ? "1 leaves the roll as a graduate. "
                : `${counts.graduate} leave the roll as graduates. `)}
            {counts.excluded > 0 &&
              (counts.excluded === 1
                ? `1 student on the roll is not a candidate and stays in ${plan?.from_session}. `
                : `${counts.excluded} students on the roll are not candidates and stay in ${plan?.from_session}. `)}
            This cannot be undone from here.
          </p>
          <Exceptions plan={plan!} />
        </section>
      )}

      {/* ── 4. done ─────────────────────────────────────────────────────── */}
      {step === 3 && done && (
        <section className="grid gap-4">
          {/* An irreversible thing finished. The design marks it rather than
              dropping the reader back onto four numbers - a run that ends the
              same way it was previewed gives no sign it actually happened. */}
          <Panel className="flex items-center gap-3.5 px-5.5 py-5">
            <span
              aria-hidden
              className="grid size-13 shrink-0 place-content-center rounded-full bg-green-700/10 text-green-800"
            >
              <Check className="size-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-black-01">
                Promotion complete
              </h3>
              <p className="mt-0.5 text-sm text-gray-05">
                Every move is on the students&apos; own history.
              </p>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Promoted", done.promoted],
              ["Repeated", done.repeated],
              ["Graduated", done.graduated],
              ["Held", done.held],
            ].map(([label, value]) => (
              <KpiCard
                key={String(label)}
                label={String(label)}
                value={value}
              />
            ))}
          </div>
          <p className="text-sm text-gray-05">
            {done.from_session_name} to {done.to_session_name}.
            {done.failed > 0 &&
              ` ${done.failed} could not be written and were left where they are.`}
          </p>
          <div>
            <Button
              onClick={() => navigate(routesPath.PROTECTED.STUDENTS.INDEX)}
            >
              Back to the directory
            </Button>
          </div>
        </section>
      )}

      {previewing && !plan && <Skeleton className="h-40 w-full rounded-xl" />}

      {/* ── the footer ──────────────────────────────────────────────────── */}
      {step < 3 && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white-02 pt-4">
          <span className="mr-auto text-xs text-gray-05">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </span>
          {/* Step 2 keeps its way back: the per-student overrides are the whole
              point of it, and this is the last moment before a run that cannot
              be undone from here. */}
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step === 0 && (
            <>
              {target && !plan && (
                <Button onClick={() => refreshPlan()} disabled={previewing}>
                  {previewing ? "Checking…" : "Check this year"}
                </Button>
              )}
              {plan && (
                <Button
                  onClick={toReview}
                  disabled={previewing || nothingToMove}
                >
                  Review students
                </Button>
              )}
            </>
          )}
          {step === 1 && (
            <Button onClick={toConfirm} disabled={previewing}>
              {previewing ? "Recalculating…" : "Preview and confirm"}
            </Button>
          )}
          {/* The run needs BOTH keys, because it writes placements and placing
              is academics' power - the same pair the backend asserts. mode
              "all" rather than the default any: either key alone must not
              open it. */}
          {step === 2 && (
            <PermissionGate
              permission={[P.MANAGE_STUDENTS, P.ASSIGN_CLASS]}
              mode="all"
              fallback={
                <p className="text-xs text-gray-05">
                  You can preview a promotion but not run one. That needs the
                  student-lifecycle and class-assignment permissions.
                </p>
              }
            >
              <Button
                onClick={() => setConfirming(true)}
                disabled={running || counts?.candidates === 0}
              >
                Run promotion
              </Button>
            </PermissionGate>
          )}
        </div>
      )}

      {nothingToMove && step === 0 && (
        <p className="text-sm text-gray-05">
          Nobody in {plan?.from_session} is a candidate for promotion.
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={execute}
        title={`Promote ${counts?.candidates ?? 0} students into ${plan?.to_session}?`}
        body={`This moves every student to their target class in one action and cannot be undone from here.${
          counts?.graduate
            ? ` ${counts.graduate} will leave the roll as graduates.`
            : ""
        }`}
        confirmLabel="Run promotion"
        busy={running}
      />
    </PageShell>
  );
}

/**
 * Why students are not simply moving up.
 *
 * Class-wide causes collapse to one row however many students they cover, and
 * per-student causes get one each - the split the server already makes, kept
 * because repeating "this class has no target" under 25 names buries the two
 * rows that actually need a decision.
 */
/**
 * Where to go and fix a class-wide cause.
 *
 * Every one of these sentences ends by telling a registrar to change something
 * in Academic Structure, and each names a DIFFERENT screen: an unwired level is
 * fixed on Programmes & Levels, a missing class on Classes & Arms. Printing the
 * instruction without the door means reading it, leaving, and hunting for the
 * screen it meant.
 */
const FIX: Record<string, { label: string; to: string }> = {
  LEVEL_NOT_WIRED: {
    label: "Set its promotion target",
    to: routesPath.PROTECTED.ACADEMIC_STRUCTURE.PROGRAMS,
  },
  NO_CLASS_AT_NEXT_LEVEL: {
    label: "Add the class",
    to: routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASSES,
  },
  NO_CLASS_TO_REPEAT: {
    label: "Add the class",
    to: routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASSES,
  },
};

function Exceptions({ plan }: { plan: PromotionPlan }) {
  const navigate = useNavigate();
  const { by_class: byClass, by_student: byStudent } = plan.exceptions;
  if (byClass.length === 0 && byStudent.length === 0) return null;

  return (
    <Panel as="section" className="px-5.5 py-5">
      <p className="text-xs font-medium text-gray-05">
        {byClass.length + byStudent.length}{" "}
        {byClass.length + byStudent.length === 1 ? "exception" : "exceptions"}
      </p>
      <ul className="mt-3 grid gap-2.5">
        {byClass.map((e) => (
          <li
            key={`c-${e.class}-${e.cause}`}
            className="border-l-2 border-amber-400 pl-3"
          >
            <p className="text-sm font-medium text-black-01">
              {e.class_name}
              <span className="ml-2 text-xs font-normal text-gray-05">
                {e.students} {e.students === 1 ? "student" : "students"}
              </span>
            </p>
            <p className="text-xs text-gray-05">{e.reason}</p>
            {FIX[e.cause] && (
              <button
                type="button"
                onClick={() => navigate(FIX[e.cause].to)}
                className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
              >
                {FIX[e.cause].label}
              </button>
            )}
          </li>
        ))}
        {byStudent.map((e) => (
          <li
            key={`s-${e.student}`}
            className="border-l-2 border-amber-400 pl-3"
          >
            <p className="text-sm font-medium text-black-01">
              {e.name}
              <span className="ml-2 text-xs font-normal text-gray-05">
                {e.class}
              </span>
            </p>
            <p className="text-xs text-gray-05">{e.reason}</p>
            {/* A per-student cause is fixed on that student, so the door is
                their record rather than a settings screen. */}
            <button
              type="button"
              onClick={() =>
                navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(e.student))
              }
              className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              Open {e.name}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
