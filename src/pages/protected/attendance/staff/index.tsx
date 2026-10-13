import { useState } from "react";
import { Link } from "react-router";
import { Briefcase } from "lucide-react";
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

import { ClosedDayNotice } from "../components/closed-day-notice";
import { DayPicker } from "../components/day-picker";
import { LateArrivalDrawer } from "../register/mark-drawers";
import { RegisterRowItem, type RowMode } from "../register/register-rows";
import { timeOnDay } from "../time-on-day";
import { useAttendanceDay } from "../use-attendance-day";

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
  const { formatDay } = useSchoolDisplay();
  const allowed = hasPermission(P.VIEW_STAFF_REGISTER);
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
  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">
            Staff register · {formatDay(date, { weekday: "long", month: "long" })}
          </h1>
          <p className="text-sm text-gray-06">This register records what an administrator saw. There is no clock-in.</p>
        </div>
        <DayPicker date={date} today={today} onChange={setDate} />
      </div>

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
          {day.groups.map((group) => (
            <BranchRegister
              key={group.branch.id}
              group={group}
              date={date}
              heading={day.branch_dimension ? group.branch.name : "Staff"}
            />
          ))}
          {day.no_home_branch && day.no_home_branch.count > 0 && (
            <NoHomeBranch rows={day.no_home_branch.rows} />
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
            {row.leave.type_label} leave to {formatDay(row.leave.end_date)}
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
function BranchRegister({ group, date, heading }: { group: StaffGroup; date: string; heading: string }) {
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
      ? `Submitted${group.submitted_at ? ` ${timeOnDay(fmt, group.submitted_at, date)}` : ""}${group.submitted_by_name ? ` by ${group.submitted_by_name}` : ""}`
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
