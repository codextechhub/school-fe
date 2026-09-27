import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowRight, Check, GraduationCap } from "lucide-react";

import KpiCard from "@/components/custom/kpi-card";
import PermissionGate from "@/components/custom/permission-gate";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentsLens } from "@/hooks/use-students-lens";
import { P } from "@/permissions";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
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
import { routesPath } from "@/routes/routesPath";
import { writeErrorMessage } from "@/utils/api-error";

import { ConfirmDialog } from "../drawers/confirm-dialog";
import { ClassGroups } from "./class-groups";
import { reviewCounts } from "./promotion-model";
import { OUTCOME, destinationOf } from "./outcome";

const STEPS = ["Target year", "Review students", "Confirm", "Done"];

/**
 * The end-of-session move from one school year into the next.
 *
 * The server classifies the same student set during preview and execution.
 * Overrides are sent to both calls so the confirm counts always describe the
 * write that follows. A branch is the only optional scope accepted here; the
 * selected directory year is not sent because promotion always starts from the
 * active school year returned by the server.
 */
export default function Promotion() {
  const { branch, narrowed, label } = useStudentsLens();
  return (
    <PromotionWorkflow
      key={branch ?? "all-branches"}
      branch={branch}
      narrowed={narrowed}
      branchLabel={label}
    />
  );
}

function PromotionWorkflow({
  branch,
  narrowed,
  branchLabel,
}: {
  branch?: number;
  narrowed: boolean;
  branchLabel: string;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [overrides, setOverrides] = useState<Record<string, PromotionOutcome>>({});
  const [plan, setPlan] = useState<PromotionPlan | null>(null);
  const [done, setDone] = useState<PromotionBatch | null>(null);
  const [confirming, setConfirming] = useState(false);
  const previewSequence = useRef(0);
  const pageTop = useRef<HTMLElement>(null);

  const { data: sessionsData, isLoading: sessionsLoading } = useGetSessionsQuery();
  const [preview, { isLoading: previewing }] = usePreviewPromotionMutation();
  const [run, { isLoading: running }] = useRunPromotionMutation();

  const sessions = useMemo(() => sessionsData?.data ?? [], [sessionsData]);
  const targets = sessions.filter((session) => session.status === "DRAFT");
  const active = sessions.find((session) => session.status === "ACTIVE");

  async function refreshPlan(nextOverrides = overrides, targetId = target) {
    if (!targetId) return null;
    const sequence = ++previewSequence.current;
    try {
      const result = await preview({
        branch,
        to_session: Number(targetId),
        overrides: nextOverrides,
      }).unwrap();
      if (previewSequence.current !== sequence) return null;
      setPlan(result.data);
      return result.data;
    } catch (error) {
      if (previewSequence.current === sequence) {
        toast.error(writeErrorMessage(error, "We could not preview that promotion."));
      }
      return null;
    }
  }

  function chooseTarget(value: string) {
    previewSequence.current += 1;
    setTarget(value);
    setPlan(null);
    setOverrides({});
    setClassFilter("all");
    if (value) void refreshPlan({}, value);
  }

  function goToStep(nextStep: number) {
    setStep(nextStep);
    requestAnimationFrame(() => {
      pageTop.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }

  async function toReview() {
    const currentPlan = plan ?? (await refreshPlan());
    if (currentPlan) goToStep(1);
  }

  async function toConfirm() {
    const currentPlan = await refreshPlan();
    if (currentPlan) goToStep(2);
  }

  function setOutcome(studentId: number, outcome: PromotionOutcome) {
    setOverrides((current) => ({ ...current, [String(studentId)]: outcome }));
  }

  function setClassOutcome(classId: number, outcome: PromotionOutcome) {
    if (!plan) return;
    const next = { ...overrides };
    for (const student of plan.students) {
      if (student.from_class_id === classId) next[String(student.id)] = outcome;
    }
    setOverrides(next);
  }

  async function execute() {
    setConfirming(false);
    try {
      const result = await run({
        branch,
        to_session: Number(target),
        overrides,
      }).unwrap();
      setDone(result.data);
      goToStep(3);
      toast.success(result.message);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not run that promotion."));
    }
  }

  const counts = plan?.counts;
  const liveCounts = plan ? reviewCounts(plan, overrides) : null;
  const nothingToMove = plan != null && plan.counts.candidates === 0;
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
          onAction={() => navigate(routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSIONS)}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <header
        ref={pageTop}
        className="flex min-w-0 scroll-mt-20 flex-wrap items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
            Promotion
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-01">
            The end-of-session move. Every student on the roll goes up, repeats,
            graduates or is held before anything is written.
          </p>
          {narrowed && (
            <p className="mt-2 inline-flex rounded-md bg-white-03 px-2.5 py-1 text-xs font-medium text-primary">
              {branchLabel} only
            </p>
          )}
        </div>
        <p className="shrink-0 rounded-full bg-white-03 px-3 py-1.5 text-xs font-medium text-gray-05">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
      </header>

      {step === 0 && (
        <section className="grid gap-4" aria-labelledby="sessions-heading">
          <Panel data-guide="promotion.sessions" className="p-4 sm:p-6">
            <h2 id="sessions-heading" className="text-base font-semibold text-black-01">
              Sessions
            </h2>
            <div className="mt-4 grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <SessionField label="From" value={active?.name ?? "Current school year"} />
              <ArrowRight className="mx-auto mb-3 size-4 rotate-90 text-gray-05 sm:rotate-0" />
              <div className="min-w-0">
                <label htmlFor="target-year" className="text-xs font-medium text-gray-05">
                  Into
                </label>
                <NativeSelect
                  id="target-year"
                  value={target}
                  loading={previewing}
                  onChange={(event) => chooseTarget(event.target.value)}
                  className="mt-1 h-12 bg-white-03 font-semibold text-primary"
                >
                  <option value="">Select a year</option>
                  {targets.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {previewing && !plan && (
              <div className="mt-6 border-t border-white-02 pt-5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-2 h-4 w-full max-w-xl" />
                <div className="mt-4 grid gap-2">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              </div>
            )}

            {plan && <LevelMapping plan={plan} />}

            {target && !plan && !previewing && (
              <div className="mt-6 border-t border-white-02 pt-5">
                <p className="text-sm text-gray-05">
                  The class map could not be loaded. Try the preview again before
                  reviewing students.
                </p>
                <Button className="mt-3" variant="outline" onClick={() => void refreshPlan()}>
                  Try again
                </Button>
              </div>
            )}
          </Panel>

          <div>
            <Button
              data-guide="promotion.review-open"
              onClick={() => void toReview()}
              disabled={!plan || previewing || nothingToMove}
            >
              Review students
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {nothingToMove && (
            <p data-guide="promotion.nothing-to-move" className="text-sm text-gray-05">
              Nobody in {plan?.from_session} is a candidate for promotion.
            </p>
          )}
        </section>
      )}

      {step === 1 && plan && liveCounts && (
        <section className="grid gap-4" aria-labelledby="review-heading">
          {allHeld && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Every student would be held because {plan.to_session} has no classes
              to move them into yet. Copy this year's classes forward in Academic
              Structure first.
            </p>
          )}

          <div
            data-guide="promotion.review-summary"
            className="flex min-w-0 flex-wrap items-end gap-3"
          >
            <div className="w-full sm:w-52">
              <label htmlFor="class-filter" className="sr-only">
                Filter review by class
              </label>
              <NativeSelect
                id="class-filter"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="all">All classes</option>
                {plan.level_map
                  .filter((row) => row.students > 0)
                  .map((row) => (
                    <option key={row.from_id} value={row.from_id}>
                      {row.from}
                    </option>
                  ))}
              </NativeSelect>
            </div>
            <p id="review-heading" className="pb-2 text-sm text-gray-05">
              {liveCounts.promote} promoted, {liveCounts.repeat} repeating,{" "}
              {liveCounts.graduate} graduating, {liveCounts.hold} held.
            </p>
          </div>

          <ClassGroups
            plan={plan}
            overrides={overrides}
            classFilter={classFilter}
            onSetStudent={setOutcome}
            onSetClass={setClassOutcome}
          />
          <Exceptions plan={plan} />
        </section>
      )}

      {step === 2 && counts && plan && (
        <section className="grid gap-4" aria-labelledby="confirm-heading">
          <Panel data-guide="promotion.confirm" className="p-4 sm:p-5">
            <h2 id="confirm-heading" className="text-base font-semibold text-black-01">
              Confirm this promotion
            </h2>
            <p className="mt-1 text-sm text-gray-05">
              Review the final result before moving the students into {plan.to_session}.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(["promote", "repeat", "graduate", "hold"] as const).map((key) => (
                <KpiCard
                  key={key}
                  label={OUTCOME[key.toUpperCase() as PromotionOutcome].label}
                  value={counts[key]}
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-05">
              {counts.candidates === 1
                ? `1 student moves into ${plan.to_session}. `
                : `${counts.candidates} students move into ${plan.to_session}. `}
              {counts.excluded > 0 &&
                `${counts.excluded} ${counts.excluded === 1 ? "student stays" : "students stay"} in ${plan.from_session}. `}
              This cannot be undone from here.
            </p>
          </Panel>
          <Exceptions plan={plan} />
        </section>
      )}

      {step === 3 && done && (
        <section className="grid gap-4" aria-labelledby="complete-heading">
          <Panel className="flex flex-wrap items-center gap-3.5 p-5">
            <span
              aria-hidden="true"
              className="grid size-13 shrink-0 place-content-center rounded-full bg-green-700/10 text-green-800"
            >
              <Check className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 id="complete-heading" className="text-base font-semibold text-black-01">
                Promotion complete
              </h2>
              <p className="mt-0.5 text-sm text-gray-05">
                Every move is recorded in each student's history.
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
              <KpiCard key={String(label)} label={String(label)} value={value} />
            ))}
          </div>
          <p className="text-sm text-gray-05">
            {done.from_session_name} to {done.to_session_name}.
            {done.failed > 0 &&
              ` ${done.failed} could not be written and were left where they are.`}
          </p>
          <div>
            <Button onClick={() => navigate(routesPath.PROTECTED.STUDENTS.INDEX)}>
              Back to the directory
            </Button>
          </div>
        </section>
      )}

      {step > 0 && step < 3 && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white-02 pt-4">
          <Button variant="outline" onClick={() => goToStep(step - 1)}>
            Back
          </Button>
          {step === 1 && (
            <Button
              data-guide="promotion.confirm-open"
              onClick={() => void toConfirm()}
              disabled={previewing}
            >
              {previewing ? "Recalculating..." : "Preview and confirm"}
            </Button>
          )}
          {step === 2 && (
            <PermissionGate
              permission={[P.PROMOTE_STUDENTS, P.ASSIGN_CLASS]}
              mode="all"
              fallback={
                <p className="text-xs text-gray-05">
                  Running a promotion needs promotion and class-assignment permissions.
                </p>
              }
            >
              <Button
                data-guide="promotion.run"
                onClick={() => setConfirming(true)}
                disabled={running || counts?.candidates === 0}
              >
                Run promotion
              </Button>
            </PermissionGate>
          )}
        </footer>
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

function SessionField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-05">{label}</p>
      <div className="mt-1 flex h-12 min-w-0 items-center rounded-md border border-border bg-white px-3">
        <p className="truncate text-sm font-semibold text-black-01">{value}</p>
      </div>
    </div>
  );
}

function LevelMapping({ plan }: { plan: PromotionPlan }) {
  return (
    <div data-guide="promotion.level-mapping" className="mt-6 border-t border-white-02 pt-5">
      <h2 className="text-base font-semibold text-black-01">Level mapping</h2>
      <p className="mt-1 text-sm text-gray-05">
        Targets come from the class structure in Academic Structure. Terminal
        levels leave the roll as graduates.
      </p>
      <ul className="mt-4 grid gap-2">
        {plan.level_map.map((row) => {
          const destination = destinationOf(plan, row);
          return (
            <li
              key={row.from_id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-md border border-border px-3.5 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]"
            >
              <span className="truncate font-medium text-black-01">{row.from}</span>
              <ArrowRight className="size-4 shrink-0 text-gray-05" />
              <span className={`min-w-0 truncate ${destination.tone}`}>
                {destination.label}
              </span>
              {row.terminal && (
                <span className="col-span-3 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:col-span-1">
                  Terminal
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-gray-05">
        {plan.counts.candidates} {plan.counts.candidates === 1 ? "student is" : "students are"} candidates
      </p>
    </div>
  );
}

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

/** Lists the class-wide and individual decisions that block a normal move. */
function Exceptions({ plan }: { plan: PromotionPlan }) {
  const navigate = useNavigate();
  const { by_class: byClass, by_student: byStudent } = plan.exceptions;
  const total = byClass.length + byStudent.length;
  if (total === 0) return null;

  return (
    <Panel as="section" data-guide="promotion.exceptions" className="p-4 sm:p-5">
      <h2 className="text-base font-semibold text-black-01">
        {total} {total === 1 ? "exception" : "exceptions"}
      </h2>
      <p className="mt-1 text-sm text-gray-05">
        Anything that cannot simply move up. Class-wide causes appear once;
        students needing an individual decision have their own row.
      </p>
      <ul className="mt-4 grid gap-2">
        {byClass.map((exception) => {
          const terminal = exception.cause === "TERMINAL_LEVEL";
          return (
            <li
              key={`c-${exception.class}-${exception.cause}`}
              className={`rounded-md border border-border border-l-2 p-3 ${terminal ? "border-l-primary" : "border-l-amber-400"}`}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-sm font-semibold text-black-01">{exception.class_name}</p>
                <span className="text-xs text-gray-05">
                  {exception.students} {exception.students === 1 ? "student" : "students"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-05">{exception.reason}</p>
              {FIX[exception.cause] && (
                <button
                  type="button"
                  onClick={() => navigate(FIX[exception.cause].to)}
                  className="mt-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  {FIX[exception.cause].label}
                </button>
              )}
            </li>
          );
        })}
        {byStudent.map((exception) => (
          <li
            key={`s-${exception.student}`}
            className="rounded-md border border-border border-l-2 border-l-amber-400 p-3"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-semibold text-black-01">{exception.name}</p>
              <span className="text-xs text-gray-05">{exception.class}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-05">{exception.reason}</p>
            <button
              type="button"
              onClick={() => navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(exception.student))}
              className="mt-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Open {exception.name}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
