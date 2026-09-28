import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Archive,
  ArrowRight,
  BookOpenCheck,
  Clock3,
  type LucideIcon,
  UserPlus,
} from "lucide-react";

import PermissionGate from "@/components/custom/permission-gate";
import {
  CardActions,
  ClickableCard,
  Panel,
} from "@/components/custom/surface";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import { useStudentsLens } from "@/hooks/use-students-lens";
import { writeErrorMessage } from "@/utils/api-error";
import {
  useConfirmApplicantMutation,
  useGetAdmissionPolicyQuery,
  useGetAdmissionRulesQuery,
  useGetStudentsQuery,
  useMoveApplicantStageMutation,
  useRejectApplicantMutation,
} from "@/redux/services/students/students-api";
import type {
  AdmissionStage,
  StudentRow,
} from "@/redux/services/students/students-types";
import { NativeSelect } from "@/components/ui/native-select";

import { ConfirmDialog } from "../drawers/confirm-dialog";
import { DrawerShell, Field, inputClass } from "../drawers/drawer-shell";
import { StudentDrawers, type DrawerRequest } from "../drawers";
import {
  ENROL_PERMISSIONS,
  STUDENT_DRAWER_PERMISSION,
} from "../drawers/access";
import { formatDate } from "../format";
import { Pager } from "../pager";
import { PersonAvatar } from "../person-avatar";
import { StudentStatusBadge } from "../status-badge";

type StageKey = "waiting" | "placement" | "closed";

/**
 * The front of the lifecycle: who has applied, and the two ends it can reach.
 *
 * Three groups, because they are three different questions. Waiting is a
 * decision to make. Recently enrolled is a job half done - the student is on
 * the roll and still has no class. Closed applications are kept because a
 * family that did not join is a thing a school looks up later, and closing an
 * application is not the same as withdrawing a student who was once here.
 */
export default function Applicants() {
  const navigate = useNavigate();
  const {
    lens,
    multiBranch,
    label: branchLabel,
    sessionName,
    pastYear,
  } = useStudentsLens();

  const [enrolling, setEnrolling] = useState<StudentRow | null>(null);
  const [rejecting, setRejecting] = useState<StudentRow | null>(null);
  const [drawer, setDrawer] = useState<DrawerRequest | null>(null);
  const [stage, setStage] = useState<StageKey>("waiting");
  const [pages, setPages] = useState<Record<StageKey, number>>({
    waiting: 1,
    placement: 1,
    closed: 1,
  });

  // The school's own admission steps; none means it admits on the spot.
  const stages = useGetAdmissionRulesQuery().data?.data.stages ?? [];
  const [stageFilter, setStageFilter] = useState<number | "none" | undefined>();
  const waiting = useGetStudentsQuery({
    ...lens,
    status: "APPLICANT",
    stage: stageFilter,
    page: pages.waiting,
  });
  const placement = useGetStudentsQuery({
    ...lens,
    status: "ENROLLED",
    class: "unassigned",
    page: pages.placement,
  });
  const closed = useGetStudentsQuery({
    ...lens,
    status: "REJECTED",
    page: pages.closed,
  });

  const waitingRows = useMemo(
    () => sortLongestWaiting(waiting.data?.data ?? []),
    [waiting.data],
  );
  const placementRows = placement.data?.data ?? [];
  const closedRows = closed.data?.data ?? [];

  const counts: Record<StageKey, number> = {
    waiting: waiting.data?.pagination.totalItems ?? 0,
    placement: placement.data?.pagination.totalItems ?? 0,
    closed: closed.data?.pagination.totalItems ?? 0,
  };

  function setPage(key: StageKey, page: number) {
    setPages((current) => ({ ...current, [key]: page }));
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
            Applicants
          </h1>
          <p className="mt-1 text-sm text-gray-01">
            Review admissions for {multiBranch ? branchLabel : "this school"}
            {sessionName ? ` in ${sessionName}` : ""}.
          </p>
        </div>
        <PermissionGate permission={ENROL_PERMISSIONS} mode="all">
          <Button
            onClick={() =>
              navigate(`${routesPath.PROTECTED.STUDENTS.ENROL}?applicant=1`)
            }
          >
            <UserPlus className="size-4" />
            Add applicant
          </Button>
        </PermissionGate>
      </div>

      <PipelineNav
        active={stage}
        counts={counts}
        loading={waiting.isLoading || placement.isLoading || closed.isLoading}
        onChange={setStage}
      />

      {stage === "waiting" && stages.length > 0 && (
        <StageFilter
          stages={stages}
          value={stageFilter}
          onChange={(next) => {
            setStageFilter(next);
            setPage("waiting", 1);
          }}
        />
      )}

      {stage === "waiting" && (
        <StagePanel
          title="Waiting on a decision"
          subtitle="Review each application, then enrol the student or close the application."
          icon={Clock3}
          tone="amber"
          loading={waiting.isLoading || waiting.isFetching}
          error={waiting.isError}
          onRetry={() => waiting.refetch()}
          rows={waitingRows}
          emptyTitle="No applications are waiting"
          emptyBody="New applications will appear here for review."
          page={waiting.data?.pagination.currentPage ?? 1}
          totalPages={waiting.data?.pagination.totalPages ?? 1}
          onPageChange={(page) => setPage("waiting", page)}
          details={stages.length > 0 ? (student) => <StageLine student={student} /> : undefined}
          actions={(student) => (
            // Confirm and close are record updates on the server, not transitions.
            <PermissionGate permission={P.MODIFY_STUDENT}>
              {stages.length > 0 && <StageControls student={student} stages={stages} />}
              <Button size="sm" onClick={() => setEnrolling(student)}>
                Put on the roll
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejecting(student)}
              >
                Close application
              </Button>
            </PermissionGate>
          )}
          onOpen={(id) =>
            navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(id))
          }
        />
      )}

      {stage === "placement" && (
        <StagePanel
          title="On the roll, no class yet"
          subtitle="These students are enrolled but cannot appear on a class register until they are placed."
          icon={BookOpenCheck}
          tone="green"
          loading={placement.isLoading || placement.isFetching}
          error={placement.isError}
          onRetry={() => placement.refetch()}
          rows={placementRows}
          emptyTitle="Everyone enrolled has a class"
          emptyBody="Students who still need placement will appear here."
          page={placement.data?.pagination.currentPage ?? 1}
          totalPages={placement.data?.pagination.totalPages ?? 1}
          onPageChange={(page) => setPage("placement", page)}
          actions={(student) => (
            <PermissionGate
              permission={STUDENT_DRAWER_PERMISSION.transfer}
              disabled={pastYear}
            >
              <Button
                size="sm"
                onClick={() =>
                  setDrawer({ kind: "transfer", studentId: student.id })
                }
              >
                Assign a class
              </Button>
            </PermissionGate>
          )}
          onOpen={(id) =>
            navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(id))
          }
        />
      )}

      {stage === "closed" && (
        <StagePanel
          title="Closed applications"
          subtitle="Kept for reference so the school can answer why a family did not join."
          icon={Archive}
          tone="gray"
          loading={closed.isLoading || closed.isFetching}
          error={closed.isError}
          onRetry={() => closed.refetch()}
          rows={closedRows}
          emptyTitle="No applications have been closed"
          emptyBody="Applications closed after review will remain available here."
          page={closed.data?.pagination.currentPage ?? 1}
          totalPages={closed.data?.pagination.totalPages ?? 1}
          onPageChange={(page) => setPage("closed", page)}
          onOpen={(id) =>
            navigate(routesPath.PROTECTED.STUDENTS.PROFILE_ID(id))
          }
        />
      )}

      {enrolling && (
        <ConfirmEnrolment
          student={enrolling}
          onClose={() => setEnrolling(null)}
        />
      )}
      {rejecting && (
        <CloseApplication
          student={rejecting}
          onClose={() => setRejecting(null)}
        />
      )}
      <StudentDrawers request={drawer} onClose={() => setDrawer(null)} />
    </PageShell>
  );
}

function PipelineNav({
  active,
  counts,
  loading,
  onChange,
}: {
  active: StageKey;
  counts: Record<StageKey, number>;
  loading: boolean;
  onChange: (stage: StageKey) => void;
}) {
  const items: {
    key: StageKey;
    label: string;
    note: string;
    icon: LucideIcon;
    tone: string;
  }[] = [
    {
      key: "waiting",
      label: "Awaiting decision",
      note: "Needs review",
      icon: Clock3,
      tone: "bg-amber-100 text-amber-700",
    },
    {
      key: "placement",
      label: "Needs a class",
      note: "Enrolled to place",
      icon: BookOpenCheck,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "closed",
      label: "Closed",
      note: "Kept for reference",
      icon: Archive,
      tone: "bg-gray-04 text-gray-06",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {items.map((item) => {
        const selected = active === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-xl border bg-white p-3.5 text-left transition-colors",
              selected
                ? "border-primary ring-1 ring-primary/15"
                : "border-border hover:border-primary/40",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-content-center rounded-lg",
                item.tone,
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-black-01">
                {item.label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-gray-05">
                {item.note}
              </span>
            </span>
            {loading ? (
              <Skeleton className="size-7 shrink-0 rounded-full" />
            ) : (
              <span className="grid size-7 shrink-0 place-content-center rounded-full bg-white-03 text-xs font-semibold text-primary">
                {counts[item.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StagePanel({
  title,
  subtitle,
  icon: Icon,
  rows,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyBody,
  tone,
  actions,
  details,
  onOpen,
  page,
  totalPages,
  onPageChange,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  rows: StudentRow[];
  loading?: boolean;
  error?: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyBody: string;
  tone: "amber" | "green" | "gray";
  actions?: (student: StudentRow) => React.ReactNode;
  /** Extra lines on each card, such as the admission step and its offer. */
  details?: (student: StudentRow) => React.ReactNode;
  onOpen: (id: number) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const edge = {
    amber: "bg-amber-500",
    green: "bg-emerald-600",
    gray: "bg-gray-02",
  }[tone];

  return (
    <Panel as="section" className="rounded-xl p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-content-center rounded-lg",
            tone === "amber"
              ? "bg-amber-100 text-amber-700"
              : tone === "green"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-04 text-gray-06",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-black-01">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-gray-05">{subtitle}</p>
        </div>
      </div>

      {error ? (
        <div className="mt-5">
          <OutlinedNotice
            icon={Icon}
            title="We could not load this stage"
            body="Something went wrong on our side. Try again in a moment."
            actionLabel="Try again"
            onAction={onRetry}
          />
        </div>
      ) : loading ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5 grid min-h-52 place-content-center rounded-xl border border-dashed border-white-02 bg-white-05 px-4 py-10 text-center">
          <span className="mx-auto grid size-11 place-content-center rounded-full bg-white-03 text-primary">
            <Icon className="size-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-black-01">
            {emptyTitle}
          </p>
          <p className="mt-1 text-xs text-gray-05">{emptyBody}</p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {rows.map((s) => (
            <li key={s.id} className="min-w-0">
              <ClickableCard
                onOpen={() => onOpen(s.id)}
                label={`Open ${s.full_name}'s applicant record`}
                className="relative flex h-full flex-col overflow-hidden rounded-xl p-0 text-left"
              >
                <span
                  aria-hidden
                  className={cn("absolute inset-y-0 left-0 w-1", edge)}
                />
                <div className="flex h-full min-w-0 flex-col px-4 py-4 pl-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <PersonAvatar
                      name={s.full_name}
                      photoUrl={s.photo_url}
                      className="size-10 shrink-0"
                      textClassName="text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-black-01">
                        {s.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-05">
                        {s.level_name || "No level recorded"}
                      </p>
                    </div>
                    <StudentStatusBadge
                      status={s.status}
                      label={s.status_label}
                    />
                  </div>

                  <div className="mt-4 grid gap-2 border-t border-border pt-3">
                    <CardRow label="Applied for">
                      {s.level_name || "Not stated"}
                    </CardRow>
                    <CardRow label="Guardian">
                      {s.primary_guardian || "Nobody linked"}
                    </CardRow>
                    {details?.(s)}
                    <p className="mt-1 text-xs font-medium text-gray-01">
                      {waitingLine(s)}
                    </p>
                  </div>

                  {actions && (
                    <CardActions className="mt-auto flex flex-wrap gap-2 pt-4">
                      {actions(s)}
                    </CardActions>
                  )}

                  {!actions && (
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-primary">
                      Open record
                      <ArrowRight className="size-3.5" />
                    </span>
                  )}
                </div>
              </ClickableCard>
            </li>
          ))}
        </ul>
      )}

      {!error && !loading && rows.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <Pager page={page} totalPages={totalPages} onGo={onPageChange} />
        </div>
      )}
    </Panel>
  );
}

function CardRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="w-22 shrink-0 text-xs text-gray-05">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-black-01">
        {children}
      </span>
    </div>
  );
}

function sortLongestWaiting(rows: StudentRow[]) {
  return [...rows].sort((a, b) => {
    const aTime = a.applied_on ? Date.parse(a.applied_on) : Number.MAX_VALUE;
    const bTime = b.applied_on ? Date.parse(b.applied_on) : Number.MAX_VALUE;
    return aTime - bTime;
  });
}

/**
 * How long this person has been waiting.
 *
 * An applicant's clock starts at `applied_on`; anyone already on the roll
 * started at `enrolment_date`. Saying "waiting 12 days" rather than printing
 * the date is the point of the line: the number is what somebody acts on, and
 * a date makes the reader do the subtraction before they can.
 */
function waitingLine(s: StudentRow): string {
  const since = s.applied_on ?? s.enrolment_date;
  if (!since) return "No date recorded";
  const then = new Date(`${since}T00:00:00`);
  if (Number.isNaN(then.getTime())) return formatDate(since);
  const days = Math.max(
    0,
    Math.floor((Date.now() - then.getTime()) / 86_400_000),
  );
  const verb = s.applied_on ? "Applied" : "Enrolled";
  if (days === 0) return `${verb} today`;
  return `${verb} ${days} ${days === 1 ? "day" : "days"} ago · ${formatDate(since)}`;
}

/**
 * Put an applicant on the roll.
 *
 * It does not place them in a class, and the drawer says so. That is the model:
 * an enrolled student with no class is the "unassigned" state the whole module
 * tracks, and the placement is a separate move with its own reason and audit
 * line. Pretending otherwise here would mean inventing a seat.
 */
function ConfirmEnrolment({
  student,
  onClose,
}: {
  student: StudentRow;
  onClose: () => void;
}) {
  // The rule of the applicant's own branch, which is the one the server checks.
  const { data: policyData } = useGetAdmissionPolicyQuery(
    student.branch != null ? { branch: String(student.branch) } : undefined,
  );
  const policy = policyData?.data;
  const [number, setNumber] = useState("");
  const [confirm, { isLoading }] = useConfirmApplicantMutation();

  // Blank is fine where the applicant already has a number, or where the
  // server issues the next one itself.
  const required =
    Boolean(policy?.required) && !student.student_number && !policy?.auto_issue;
  const valid = !required || number.trim().length > 0;

  async function save() {
    try {
      await confirm({
        id: student.id,
        ...(number.trim() ? { student_number: number.trim() } : {}),
      }).unwrap();
      toast.success(`${student.full_name} is now enrolled.`);
      onClose();
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not enrol that applicant."));
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Put on the roll"
      subtitle={`${student.full_name} becomes an enrolled student.`}
      saveLabel="Enrol"
      onSave={save}
      canSave={valid}
      saving={isLoading}
    >
      <div className="grid gap-4">
        <Field
          label={required ? "Admission number" : "Admission number (optional)"}
          hint={
            policy?.hint ||
            (required
              ? undefined
              : "Leave blank to issue one later. The school has set no format.")
          }
        >
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={inputClass}
          />
        </Field>

        <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
          This puts {student.first_name} on the roll. It does not place them in a
          class - do that next, so the move carries its own reason and appears on
          their history.
        </p>
      </div>
    </DrawerShell>
  );
}

/** Close an application, which is not the same as withdrawing a student. */
function CloseApplication({
  student,
  onClose,
}: {
  student: StudentRow;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [reject, { isLoading }] = useRejectApplicantMutation();

  async function save() {
    try {
      await reject({ id: student.id, reason: reason.trim() }).unwrap();
      toast.success(`${student.full_name}'s application is closed.`);
      setConfirming(false);
      onClose();
    } catch (error) {
      setConfirming(false);
      toast.error(writeErrorMessage(error, "We could not close that application."));
    }
  }

  return (
    <>
      <DrawerShell
        open={!confirming}
        onClose={onClose}
        title="Close this application"
        subtitle={`${student.full_name} will not be enrolled.`}
        saveLabel="Continue"
        onSave={() => setConfirming(true)}
        canSave={reason.trim().length > 0}
        saving={isLoading}
        destructive
      >
        <div className="grid gap-4">
          <Field
            label="Reason"
            hint="Kept on the record so the school can see the decision later."
          >
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-white-02 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <p className="rounded-lg bg-gray-04 px-3 py-2 text-xs text-gray-05">
            The record is kept. Closing an application is not withdrawing a
            student - {student.first_name} was never on the roll, and the school
            needs the two apart.
          </p>
        </div>
      </DrawerShell>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={save}
        title={`Close ${student.full_name}'s application?`}
        body="The record is kept so the decision can be looked up later, but they will not be enrolled."
        confirmLabel="Close application"
        busy={isLoading}
      />
    </>
  );
}

/**
 * Narrow the waiting list to one admission step.
 *
 * "Not started" is an applicant no step has been given yet. Counts are the
 * server's, per step, in the reader's branches.
 */
function StageFilter({
  stages,
  value,
  onChange,
}: {
  stages: AdmissionStage[];
  value: number | "none" | undefined;
  onChange: (next: number | "none" | undefined) => void;
}) {
  const chips: { key: string; label: string; value: number | "none" | undefined; count?: number }[] = [
    { key: "all", label: "All steps", value: undefined },
    { key: "none", label: "Not started", value: "none" },
    ...[...stages]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ key: String(s.id), label: s.name, value: s.id as number, count: s.applicants })),
  ];
  return (
    <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="group" aria-label="Admission step">
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-gray-01 hover:border-primary/40",
            )}
          >
            {chip.label}
            {chip.count != null ? <span className="ml-1.5 text-gray-05">{chip.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** The step an applicant is at, and where an offer stands. */
function StageLine({ student }: { student: StudentRow }) {
  return (
    <>
      <CardRow label="Step">{student.admission_stage_name || "Not started"}</CardRow>
      {student.offer_expires_on ? (
        <p
          className={cn(
            "text-xs",
            student.offer_expired ? "font-medium text-amber-700" : "text-gray-05",
          )}
        >
          {student.offer_expired
            ? `Offer expired on ${formatDate(student.offer_expires_on)}. Extend it, move them on, or close the application.`
            : `Offer open until ${formatDate(student.offer_expires_on)}.`}
        </p>
      ) : null}
    </>
  );
}

/**
 * Move an applicant to another step, or give an expired offer seven more days.
 *
 * Entering an offer step starts its window on the server, from the school's
 * own day; extending sets a new last day explicitly.
 */
function StageControls({
  student,
  stages,
}: {
  student: StudentRow;
  stages: AdmissionStage[];
}) {
  const [move, { isLoading }] = useMoveApplicantStageMutation();
  const ordered = [...stages].sort((a, b) => a.position - b.position);

  const send = (stage: number | null, offerExpiresOn?: string, done?: string) =>
    move({ id: student.id, stage, ...(offerExpiresOn ? { offer_expires_on: offerExpiresOn } : {}) })
      .unwrap()
      .then(() => toast.success(done ?? `${student.full_name} moved.`))
      .catch((error) => toast.error(writeErrorMessage(error, "That move could not be made.")));

  const extend = () => {
    const next = new Date();
    next.setDate(next.getDate() + 7);
    const iso = [
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, "0"),
      String(next.getDate()).padStart(2, "0"),
    ].join("-");
    return send(
      student.admission_stage ?? null,
      iso,
      `${student.full_name}'s offer is open until ${formatDate(iso)}.`,
    );
  };

  return (
    <>
      {/* The select's own wrapper is full width; this box sets its size. */}
      <div className="w-40">
      <NativeSelect
        size="sm"
        aria-label={`Move ${student.full_name} to a step`}
        value={student.admission_stage == null ? "" : String(student.admission_stage)}
        disabled={isLoading}
        onChange={(event) => {
          const value = event.target.value;
          const stage = value === "" ? null : Number(value);
          const name = ordered.find((s) => s.id === stage)?.name ?? "Not started";
          send(stage, undefined, `${student.full_name} moved to ${name}.`);
        }}
      >
        <option value="">Not started</option>
        {ordered.map((s) => (
          <option key={s.id} value={String(s.id)}>{s.name}</option>
        ))}
      </NativeSelect>
      </div>
      {student.offer_expired ? (
        <Button size="sm" variant="outline" disabled={isLoading} onClick={extend}>
          Extend 7 days
        </Button>
      ) : null}
    </>
  );
}

