import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock3,
  TriangleAlert,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useFillStaffPresentMutation,
  useGetStaffRegisterQuery,
  useSetStaffMarkMutation,
  useSubmitStaffRegisterMutation,
} from "@/redux/services/attendance/attendance-api";
import type {
  AttendanceMark,
  RegisterRow,
  StaffGroup,
  StaffRegisterRow,
} from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { AttendancePageHeader } from "../components/attendance-page-header";
import { ClosedDayNotice } from "../components/closed-day-notice";
import { DayPicker } from "../components/day-picker";
import { LateArrivalDrawer } from "../register/mark-drawers";
import { RegisterRowItem, type RowMode } from "../register/register-rows";
import { timeOnDay } from "../time-on-day";
import { useAttendanceDay } from "../use-attendance-day";
import { MARKS, markLabel } from "../marks";
import { PersonAvatar } from "@/pages/protected/students/person-avatar";
import { cn } from "@/lib/utils";
import { staffRegisterFieldPolicy } from "./staff-register-policy";
import { staffGroupProgress, summarizeStaffAttendance } from "./staff-register-state";
import { leaveLinkText } from "../leave-text";

const STAFF_MARKS: AttendanceMark[] = ["P", "L", "A"];

/**
 * The staff register: what an administrator saw. There is no clock-in.
 *
 * One register per branch, each marked and submitted on its own, because a
 * member of staff belongs to the branch that is their home. Somebody on
 * approved leave is filled in as on leave from Staff Management and cannot be
 * marked over. Somebody with no home branch cannot be marked at all until
 * Staff Management gives them one, so a reader who covers the whole school
 * sees them in a group of their own, saying so. Staff absences notify nobody.
 *
 * At a school with one branch there is one register and no branch heading.
 * Field Access governs the mark, arrival time and note, and the status,
 * counts and who submitted; the job title and leaving date follow Staff
 * Management's own switches, which the server applies.
 */
export default function StaffRegisterPage() {
  const { hasPermission } = usePermissions();
  const { date, today, setDate } = useAttendanceDay();
  const { branch } = useBranchLens();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_STAFF);
  const allowed = hasPermission(P.VIEW_STAFF_REGISTER);
  const [focusedBranchId, setFocusedBranchId] = useState<number | null>(null);
  const [showNoHomeBranch, setShowNoHomeBranch] = useState(false);
  const fieldPolicy = staffRegisterFieldPolicy({
    statusHidden: access.isHidden("status"),
    countsHidden: access.isHidden("counts"),
    markHidden: access.isHidden("mark"),
    takenByHidden: access.isHidden("taken_by"),
  });
  const { data, isLoading, isError, refetch } = useGetStaffRegisterQuery(
    { date, branch },
    { skip: !allowed },
  );

  if (!allowed) {
    return (
      <PageShell>
        <PageAccessDenied message="Your role does not include the staff register. Ask your school administrator if you need it." />
      </PageShell>
    );
  }

  const day = data?.data;
  const summary = summarizeStaffAttendance(day?.groups ?? []);
  const focused = day?.groups.find((group) => group.branch.id === focusedBranchId) ?? null;
  const focusBranch = (group: StaffGroup) => {
    setFocusedBranchId(group.branch.id);
    setShowNoHomeBranch(false);
    window.requestAnimationFrame(() => {
      document.getElementById("staff-branch-register")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const reviewNoHomeBranch = () => {
    setFocusedBranchId(null);
    setShowNoHomeBranch(true);
    window.requestAnimationFrame(() => {
      document.getElementById("staff-no-home-branch")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <PageShell className="content-start gap-5" grid>
      <AttendancePageHeader
        title="Staff register"
        description="Record who is present, late, absent, or already on approved leave."
        meta={["This is an administrator record, not a clock-in system"]}
        actions={<DayPicker date={date} today={today} onChange={setDate} />}
      />

      {isError ? (
        <OutlinedNotice
          icon={Briefcase}
          title="We could not load the staff register"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !day ? (
        <Skeleton className="h-72 w-full rounded-md" />
      ) : day.closed ? (
        <ClosedDayNotice closed={day.closed} dateLabel={day.date_label} />
      ) : (
        <>
          {fieldPolicy.showCounts && <StaffSummary summary={summary} />}

          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            {day.groups.map((group) => (
              <BranchOverviewCard
                key={group.branch.id}
                group={group}
                date={date}
                showBranch={day.branch_dimension}
                policy={fieldPolicy}
                onOpen={() => focusBranch(group)}
              />
            ))}
            {day.no_home_branch && day.no_home_branch.count > 0 && (
              <NoHomeBranchNotice
                count={day.no_home_branch.count}
                showCount={fieldPolicy.showCounts}
                onReview={reviewNoHomeBranch}
              />
            )}
          </div>

          {focused && (
            <div id="staff-branch-register" className="scroll-mt-5">
              <BranchRegister
                group={focused}
                date={date}
                heading={day.branch_dimension ? focused.branch.name : "Staff"}
                showTakenBy={fieldPolicy.showTakenBy}
              />
            </div>
          )}
          {showNoHomeBranch && day.no_home_branch && (
            <div id="staff-no-home-branch" className="scroll-mt-5">
              <NoHomeBranch rows={day.no_home_branch.rows} />
            </div>
          )}
          <p className="text-sm text-gray-06">
            On leave is filled in from approved leave in Staff Management and cannot be marked over.
            Staff absences notify nobody.
          </p>
        </>
      )}
    </PageShell>
  );
}

function StaffSummary({ summary }: { summary: ReturnType<typeof summarizeStaffAttendance> }) {
  const cards = [
    { label: "Expected today", value: summary.expected, icon: UsersRound, tone: "blue" },
    { label: "Present", value: summary.present, icon: CheckCircle2, tone: "green" },
    { label: "Late", value: summary.late, icon: Clock3, tone: "amber" },
    { label: "Needs marking", value: summary.needsMarking, icon: TriangleAlert, tone: "red" },
  ];

  return (
    <section aria-label="Staff attendance summary" className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Panel key={card.label} className="flex min-w-0 items-center gap-3 p-3.5">
            <span className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg",
              card.tone === "blue" && "bg-blue-50 text-blue-700",
              card.tone === "green" && "bg-emerald-50 text-emerald-700",
              card.tone === "amber" && "bg-amber-50 text-amber-700",
              card.tone === "red" && "bg-rose-50 text-rose-700",
            )}>
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-xs text-gray-06">{card.label}</span>
            <strong className="text-2xl font-semibold tracking-[-0.02em] text-black-01">{card.value}</strong>
          </Panel>
        );
      })}
    </section>
  );
}

function BranchOverviewCard({
  group,
  date,
  showBranch,
  policy,
  onOpen,
}: {
  group: StaffGroup;
  date: string;
  showBranch: boolean;
  policy: ReturnType<typeof staffRegisterFieldPolicy>;
  onOpen: () => void;
}) {
  const fmt = useSchoolDisplay();
  const progress = policy.showCounts ? staffGroupProgress(group) : null;
  const preview = group.rows.slice(0, 3);
  const remaining = Math.max(0, group.rows.length - preview.length);
  const submitted = group.status === "SUBMITTED";
  const status = policy.showStatus
    ? submitted
      ? { label: "Submitted", variant: "active" as const }
      : group.counts?.unmarked
        ? { label: `${group.counts.unmarked} unmarked`, variant: "pending" as const }
        : group.status === "READY"
          ? { label: "Ready", variant: "blue" as const }
          : group.status === "IN_PROGRESS"
            ? { label: "In progress", variant: "pending" as const }
            : { label: "Not started", variant: "inactive" as const }
    : null;
  const submittedLine = policy.showTakenBy && submitted
    ? [
        group.submitted_at ? timeOnDay(fmt, group.submitted_at, date) : null,
        group.submitted_by_name ? `by ${group.submitted_by_name}` : null,
      ].filter(Boolean).join(" ")
    : null;

  return (
    <Panel as="section" className="flex min-w-0 flex-col overflow-hidden">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-black-01">
            {showBranch ? group.branch.name : "Staff register"}
          </h2>
          {progress && (
            <p className="mt-0.5 text-xs text-gray-05">
              {progress.marked} of {progress.markable} markable staff completed
            </p>
          )}
          {submittedLine && <p className="mt-0.5 truncate text-xs text-gray-05">Submitted {submittedLine}</p>}
        </div>
        {status && <Badge variant={status.variant} className="rounded-full">{status.label}</Badge>}
      </div>

      <ul className="flex-1 divide-y divide-border">
        {preview.map((row) => (
          <li key={row.staff.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
            <PersonAvatar name={row.staff.name} className="size-8 shrink-0" textClassName="text-[10px]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-black-01">{row.staff.name}</span>
              {(row.role || row.exit) && (
                <span className="mt-0.5 block truncate text-xs text-gray-05">
                  {[row.role, row.exit?.text].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            <StaffPreviewStatus row={row} showMark={policy.showMark} />
          </li>
        ))}
      </ul>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-white-05 px-4 py-3">
        <span className="text-xs text-gray-05">
          {policy.showCounts && remaining > 0 ? `${remaining} more staff ${remaining === 1 ? "member" : "members"}` : "Open the full branch register"}
        </span>
        <Button size="sm" variant={submitted ? "outline" : "default"} onClick={onOpen}>
          {submitted ? "Open register" : group.status === "READY" ? "Review and submit" : "Open register"}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Panel>
  );
}

function StaffPreviewStatus({ row, showMark }: { row: StaffRegisterRow; showMark: boolean }) {
  if (row.lock_reason === "ON_LEAVE") return <Badge variant="inactive" className="rounded-full">On leave</Badge>;
  if (row.lock_reason === "NO_HOME_BRANCH") return <Badge variant="pending" className="rounded-full">No home branch</Badge>;
  if (!showMark || row.mark === undefined) return null;
  if (!row.mark) return <Badge variant="inactive" className="rounded-full">Unmarked</Badge>;
  return <Badge variant={MARKS[row.mark].badge} className="rounded-full">{markLabel(row.mark)}</Badge>;
}

function NoHomeBranchNotice({
  count,
  showCount,
  onReview,
}: {
  count: number;
  showCount: boolean;
  onReview: () => void;
}) {
  return (
    <Panel as="section" className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4 xl:col-span-2">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
          <UserRoundX className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-black-01">
            {showCount ? `${count} ${count === 1 ? "person has" : "people have"} no home branch` : "Some staff have no home branch"}
          </h2>
          <p className="mt-1 text-xs text-gray-05">They cannot be marked until a home branch is added to their staff record.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onReview}>Review people</Button>
    </Panel>
  );
}

/** A staff row in the shape the shared register row reads. */
function asRow(row: StaffRegisterRow): RegisterRow {
  return {
    student_id: row.staff.id,
    name: row.staff.name,
    student_number: row.staff.staff_number,
    locked: row.locked,
    mark: row.mark,
    arrived_at: row.arrived_at,
    note: row.note,
  };
}

/** The role line, and the leaving date of somebody who has resigned. */
function StaffAside({ row }: { row: StaffRegisterRow }) {
  if (!row.role && !row.exit) return null;
  return (
    <span className="block text-xs text-gray-05">
      {[row.role, row.exit?.text].filter(Boolean).join(" · ")}
    </span>
  );
}

/** Why a row cannot be marked, and the way to the record that settles it. */
function StaffLock({ row }: { row: StaffRegisterRow }) {
  const { hasPermission } = usePermissions();
  const { formatDay } = useSchoolDisplay();
  const profile = routesPath.PROTECTED.STAFF.PROFILE_ID(row.staff.id);
  if (row.lock_reason === "ON_LEAVE") {
    return (
      <>
        <Badge variant="inactive" className="rounded-full">On leave</Badge>
        {row.leave && hasPermission(P.VIEW_LEAVE) ? (
          <Link to={`${profile}?tab=leave`} className="text-xs text-primary hover:underline">
            {leaveLinkText(row.leave, formatDay)}
          </Link>
        ) : null}
      </>
    );
  }
  return (
    <>
      <Badge variant="pending" className="rounded-full">No home branch</Badge>
      {hasPermission(P.BROWSE_TEACHERS) && (
        <Link to={profile} className="text-xs text-primary hover:underline">Open staff record</Link>
      )}
    </>
  );
}

/**
 * One branch's staff register: marked row by row, then submitted.
 *
 * Anyone who holds the staff register's mark key may change a submitted row
 * while the school's edit window is open; after that the day's marks stand.
 */
function BranchRegister({
  group,
  date,
  heading,
  showTakenBy,
}: {
  group: StaffGroup;
  date: string;
  heading: string;
  showTakenBy: boolean;
}) {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_STAFF);
  const fmt = useSchoolDisplay();
  const [late, setLate] = useState<StaffRegisterRow | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [setMark, markState] = useSetStaffMarkMutation();
  const [fillPresent, fillState] = useFillStaffPresentMutation();
  const [submit, submitState] = useSubmitStaffRegisterMutation();
  const key = { branchId: group.branch.id, date };

  const submitted = group.status === "SUBMITTED";
  const shut = submitted && group.edit_window_open === false;
  const mode: RowMode =
    !group.closed && hasPermission(P.TAKE_STAFF_REGISTER) && !shut &&
    !access.isHidden("mark") && !access.isReadOnly("mark")
      ? "mark"
      : "read";
  const marks = STAFF_MARKS.filter((mark) => mark !== "L" || !access.isReadOnly("arrived_at"));
  const unmarked = group.counts?.unmarked ?? group.rows.filter((row) => !row.locked && !row.mark).length;

  const onMark = (row: StaffRegisterRow, mark: AttendanceMark) => {
    if (mark === "L") return setLate(row);
    if (mark === "E" || row.mark === mark) return;
    void setMark({ ...key, staffId: row.staff.id, body: { mark } });
  };

  const onFill = async () => {
    const result = await fillPresent(key);
    if ("error" in result || !result.data) return;
    const filled = result.data.data.filled;
    toast.success(filled ? `${filled} marked Present` : "Nothing left to fill", {
      description: filled ? "Nothing has been submitted yet." : "Every row already carries a mark.",
    });
  };

  const onSubmit = async () => {
    const result = await submit(key);
    setConfirming(false);
    if ("error" in result) return;
    toast.success("Staff register submitted", { description: `${heading} · ${fmt.formatDay(date)}. Nobody is notified.` });
  };

  const status = !access.isHidden("status") && group.status
    ? submitted
      ? `Submitted${showTakenBy && group.submitted_at ? ` ${timeOnDay(fmt, group.submitted_at, date)}` : ""}${showTakenBy && group.submitted_by_name ? ` by ${group.submitted_by_name}` : ""}`
      : unmarked > 0
        ? `${unmarked} still unmarked`
        : "Ready to submit"
    : null;

  return (
    <Panel as="section" className="overflow-hidden">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-mont text-base font-semibold text-black-01">{heading}</h2>
          <p className="text-xs text-gray-05">
            {[group.counts ? `${group.counts.total} people` : null, status].filter(Boolean).join(" · ")}
          </p>
        </div>
        {mode === "mark" && !submitted && (
          <div className="flex flex-wrap gap-2">
            {unmarked > 0 && (
              <Button variant="outline" size="sm" onClick={() => void onFill()} disabled={fillState.isLoading}>
                Everyone else present
              </Button>
            )}
            <Button size="sm" onClick={() => setConfirming(true)} disabled={unmarked > 0 || submitState.isLoading}>
              Submit staff register
            </Button>
          </div>
        )}
      </div>
      {group.closed ? (
        <div className="p-4 sm:p-5">
          <ClosedDayNotice closed={group.closed} dateLabel={fmt.formatDay(date)} />
        </div>
      ) : group.rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-06 sm:px-5">Nobody is based at this branch.</p>
      ) : (
        <ul className="divide-y divide-border">
          {group.rows.map((row) => (
            <RegisterRowItem
              key={row.staff.id}
              row={asRow(row)}
              mode={mode}
              marks={marks}
              offered={STAFF_MARKS}
              fieldResource={FIELD_RESOURCE.ATTENDANCE_STAFF}
              aside={<StaffAside row={row} />}
              lockedText={<StaffLock row={row} />}
              busy={markState.isLoading && markState.originalArgs?.staffId === row.staff.id}
              onMark={(mark) => onMark(row, mark)}
            />
          ))}
        </ul>
      )}
      {late && (
        <LateArrivalDrawer
          name={late.staff.name}
          subtitle={`${late.staff.name} · ${fmt.formatDay(date)}`}
          arrivedAt={late.mark === "L" ? late.arrived_at : null}
          note={late.note}
          fieldResource={FIELD_RESOURCE.ATTENDANCE_STAFF}
          onSave={async (body) =>
            !("error" in (await setMark({ ...key, staffId: late.staff.id, body: { mark: "L", ...body } })))
          }
          onClose={() => setLate(null)}
        />
      )}
      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onSubmit()}
        title={`Submit the staff register for ${heading}?`}
        body="Staff absences notify nobody. Rows can still be changed until the register closes."
        confirmLabel="Submit staff register"
        busy={submitState.isLoading}
      />
    </Panel>
  );
}

/** The people based at no branch, locked until Staff Management gives them one. */
function NoHomeBranch({ rows }: { rows: StaffRegisterRow[] }) {
  return (
    <Panel as="section" className="overflow-hidden">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h2 className="font-mont text-base font-semibold text-black-01">No home branch</h2>
        <p className="text-xs text-gray-05">
          A member of staff is marked on their home branch's register. Give each a home branch in
          Staff Management, and they appear there.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <RegisterRowItem
            key={row.staff.id}
            row={asRow(row)}
            mode="read"
            marks={[]}
            offered={STAFF_MARKS}
            fieldResource={FIELD_RESOURCE.ATTENDANCE_STAFF}
            aside={<StaffAside row={row} />}
            lockedText={<StaffLock row={row} />}
            busy={false}
            onMark={() => undefined}
          />
        ))}
      </ul>
    </Panel>
  );
}
