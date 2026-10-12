import { useState } from "react";
import { Link } from "react-router";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useDecideCorrectionMutation,
  useGetCorrectionsQuery,
} from "@/redux/services/attendance/attendance-api";
import type { CorrectionRow } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { Pager } from "@/pages/protected/students/pager";

import { MARKS } from "../marks";

/**
 * Corrections: requests to change a mark on a day that has closed.
 *
 * Two readers see this screen. One who decides corrections reads every
 * request in their branches and approves or rejects them, with an optional
 * note kept on the student's record either way. One who may only ask reads the
 * requests they made and where each stands. Nobody decides their own request:
 * the server refuses it, so the buttons are not offered on one.
 *
 * Field Access governs the request's fields (the marks, reason, note, who
 * asked, who decided and the decision note); a hidden one is left out of the
 * card rather than shown blank.
 */
export default function AttendanceCorrections() {
  const { hasPermission } = usePermissions();
  const decides = hasPermission(P.DECIDE_ATTENDANCE_CORRECTION);
  const asks = hasPermission(P.REQUEST_ATTENDANCE_CORRECTION);

  if (!decides && !asks) {
    return (
      <PageShell>
        <PageAccessDenied message="Your role does not include attendance corrections. Ask your school administrator if you need it." />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <h1 className="font-mont text-lg font-semibold text-black-01">Corrections</h1>
        <p className="text-sm text-gray-06">
          {decides
            ? "A mark on a closed day changes only with an administrator's decision. The original mark is never deleted."
            : "The corrections you have asked for. An attendance administrator decides each one."}
        </p>
      </div>
      <CorrectionList status="pending" decides={decides} />
      <CorrectionList status="decided" decides={decides} />
    </PageShell>
  );
}

function CorrectionList({ status, decides }: { status: "pending" | "decided"; decides: boolean }) {
  const { branch } = useBranchLens();
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<{ row: CorrectionRow; approve: boolean } | null>(null);
  const { data, isLoading, isError, refetch } = useGetCorrectionsQuery({ status, branch, page });
  const rows = data?.data ?? [];
  const pending = status === "pending";

  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <h2 className="font-mont text-base font-semibold text-black-01">
        {pending ? "Waiting for a decision" : "Decided"}
      </h2>
      {isError ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-06">
          We could not load these corrections.
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-24 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-md bg-white-05 px-4 py-3.5 text-sm text-gray-06">
          <ClipboardCheck className="size-4 shrink-0 text-green-01" aria-hidden="true" />
          {pending ? "No correction is waiting for a decision." : "No correction has been decided yet."}
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <CorrectionCard
              key={row.id}
              row={row}
              canDecide={pending && decides && !row.is_mine}
              ownRequest={pending && decides && row.is_mine}
              onDecide={(approve) => setDeciding({ row, approve })}
            />
          ))}
        </ul>
      )}
      <Pager page={page} totalPages={data?.pagination?.totalPages ?? 1} onGo={setPage} />
      {deciding && (
        <DecideDrawer
          row={deciding.row}
          approve={deciding.approve}
          onClose={() => setDeciding(null)}
        />
      )}
    </Panel>
  );
}

/** One request: who, which day, the change asked for, why, and where it stands. */
function CorrectionCard({
  row,
  canDecide,
  ownRequest,
  onDecide,
}: {
  row: CorrectionRow;
  canDecide: boolean;
  ownRequest: boolean;
  onDecide: (approve: boolean) => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_CORRECTION);
  const { formatDay, formatDateTime, formatTime } = useSchoolDisplay();
  const { hasPermission } = usePermissions();
  const reason = [
    !access.isHidden("reason_code") ? row.reason_label : null,
    !access.isHidden("note") ? row.note : null,
  ].filter(Boolean).join(" · ");

  return (
    <li className="grid min-w-0 gap-3 rounded-md border border-border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-black-01">
          {hasPermission(P.BROWSE_STUDENTS) ? (
            <Link
              to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student.id)}?tab=attendance`}
              className="text-primary hover:underline"
            >
              {row.student.name}
            </Link>
          ) : (
            row.student.name
          )}
        </p>
        <p className="text-xs text-gray-05">
          {[row.class_name, row.student.student_number, row.branch?.name].filter(Boolean).join(" · ")}
          {" · "}
          <Link
            to={routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(row.class_id, row.date)}
            className="text-primary hover:underline"
          >
            {formatDay(row.date, { weekday: "short" })}
          </Link>
        </p>
        {reason && <p className="text-sm text-gray-06">{reason}</p>}
        {row.requested_by_name && (
          <p className="text-xs text-gray-05">
            Requested by {row.requested_by_name}
            {row.requested_at ? ` · ${formatDateTime(row.requested_at)}` : ""}
          </p>
        )}
        {row.status && row.status !== "PENDING" && row.decided_by_name && (
          <p className="text-xs text-gray-05">
            Decided by {row.decided_by_name}
            {row.decided_at ? ` · ${formatDateTime(row.decided_at)}` : ""}
            {row.decision_note && !access.isHidden("decision_note") ? `: ${row.decision_note}` : ""}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {row.from_mark && row.to_mark && (
          <span className="flex items-center gap-1.5">
            <Badge variant={MARKS[row.from_mark].badge} className="rounded-full">{MARKS[row.from_mark].label}</Badge>
            <span aria-label="to">→</span>
            <Badge variant={MARKS[row.to_mark].badge} className="rounded-full">
              {MARKS[row.to_mark].label}
              {row.to_mark === "L" && row.arrived_at ? ` · ${formatTime(row.arrived_at)}` : ""}
            </Badge>
          </span>
        )}
        {row.status === "APPROVED" && <Badge variant="active" className="rounded-full">Approved</Badge>}
        {row.status === "REJECTED" && <Badge variant="rejected" className="rounded-full">Rejected</Badge>}
        {canDecide ? (
          <span className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onDecide(false)}>Reject</Button>
            <Button size="sm" onClick={() => onDecide(true)}>Approve</Button>
          </span>
        ) : row.status === "PENDING" ? (
          <Badge variant="pending" className="rounded-full">
            {ownRequest ? "Yours: another administrator decides" : "Awaiting decision"}
          </Badge>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Approve or reject, with an optional note.
 *
 * The note is kept on the student's record either way, so the answer to "why
 * was this refused?" is on the screen rather than in somebody's memory.
 */
function DecideDrawer({
  row,
  approve,
  onClose,
}: {
  row: CorrectionRow;
  approve: boolean;
  onClose: () => void;
}) {
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_CORRECTION);
  const { formatDay } = useSchoolDisplay();
  const [note, setNote] = useState("");
  const [decide, { isLoading }] = useDecideCorrectionMutation();
  const noteHidden = access.isHidden("decision_note");
  const noteReadOnly = access.isReadOnly("decision_note");
  const change =
    row.from_mark && row.to_mark ? `${MARKS[row.from_mark].label} → ${MARKS[row.to_mark].label}` : "";

  const submit = async () => {
    const result = await decide({
      id: row.id,
      approve,
      ...(!noteHidden && !noteReadOnly && note.trim() ? { decision_note: note.trim() } : {}),
    });
    if ("error" in result) return;
    if (approve) {
      toast.success("Correction approved", {
        description: [row.student.name, change].filter(Boolean).join(" · "),
      });
    } else {
      toast.info("Correction rejected", {
        description: "The original mark stands, and the request is kept on the student's record.",
      });
    }
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={approve ? "Approve correction" : "Reject correction"}
      subtitle={`${row.student.name} · ${formatDay(row.date)}`}
      saveLabel={approve ? "Approve" : "Reject"}
      onSave={() => void submit()}
      canSave
      saving={isLoading}
      destructive={!approve}
    >
      <div className="space-y-1 rounded-md bg-white-05 px-3 py-2.5">
        {change && <p className="text-sm font-medium text-black-01">{change}</p>}
        <p className="text-sm text-gray-06">
          {approve
            ? "The mark changes, and the original stays in the register's history."
            : "The mark stays as it is."}
        </p>
      </div>
      {!noteHidden && (
        <Field label="Note" hint="Optional. Kept on the student's record.">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={approve ? "For example, hospital card seen" : "For example, no hospital card received"}
            maxLength={300}
            disabled={noteReadOnly}
            rows={3}
          />
        </Field>
      )}
    </DrawerShell>
  );
}
