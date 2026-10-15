import { useState } from "react";
import { Link } from "react-router";
import { FilePen } from "lucide-react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import {
  useApproveAmendmentMutation,
  useGetAmendmentsQuery,
  useRejectAmendmentMutation,
} from "@/redux/services/gradebook/gradebook-api";
import type { AmendmentLine, AmendmentRow, AmendmentStatus } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { MARKER_LABEL } from "../sheet/cells";

const STATUS: Record<AmendmentStatus, { text: string; variant: "pending" | "active" | "rejected" }> = {
  PENDING: { text: "Waiting", variant: "pending" },
  APPROVED: { text: "Approved", variant: "active" },
  REJECTED: { text: "Rejected", variant: "rejected" },
};

const FILTERS: { value: AmendmentStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "PENDING", label: "Waiting" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

/** "7 · 7 · 26 · total 40, D": a line's marks in column order and what they earn. */
function lineText(line: AmendmentLine | undefined): string | null {
  if (!line) return null;
  const marks = line.cells?.map((cell) => (cell.marker ? MARKER_LABEL[cell.marker] : (cell.mark ?? "-"))).join(" · ");
  const figure = "total" in line ? `total ${line.total ?? "-"}${line.grade ? `, ${line.grade}` : ""}` : null;
  return [marks, figure].filter(Boolean).join(" · ") || null;
}

/**
 * Corrections to published results for the term, in the reader's branches:
 * waiting ones first, then newest first.
 *
 * Each shows the student, the subject, why the correction was asked for, the
 * marks before and after, and how it was decided. A holder of the decide key
 * approves (the note is optional) or rejects (the note is required) a
 * correction someone else asked for; the server marks those `can_decide`.
 * Approving re-issues the student's report card as the next version, keeping
 * the old one, and tells the guardian when the result was released.
 *
 * A correction is asked for from the student's Results tab, on the subject
 * it concerns, so this screen lists and decides but does not start one.
 *
 * Field Access: the reason and the decision note follow the amendment
 * switches, and the marks and figures the sheet's; a role that may not write
 * the decision note can approve without one but cannot reject.
 */
export default function AmendmentsPage() {
  const { branch } = useBranchLens();
  const [status, setStatus] = useState<AmendmentStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<{ row: AmendmentRow; approve: boolean } | null>(null);
  const { data, isLoading, isFetching, isError, error, refetch } = useGetAmendmentsQuery({ branch, status, page });
  const rows = data?.data ?? [];
  const pages = data?.pagination.totalPages ?? 1;
  const refusal = parseApiError(error).status;

  return (
    <PageShell className="content-start gap-4" grid>
      <div className="min-w-0">
        <h1 className="font-mont text-lg font-semibold text-black-01">Corrections</h1>
        <p className="text-sm text-gray-06">
          Changes asked for to results already published. Ask for one from the student&apos;s Results tab, on the
          subject it concerns.
        </p>
      </div>

      <div role="tablist" aria-label="Status" className="flex max-w-full gap-1 overflow-x-auto">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            role="tab"
            aria-selected={status === filter.value}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium",
              status === filter.value ? "bg-primary/10 text-primary" : "text-gray-06 hover:bg-gray-50",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {refusal === 403 ? (
        <OutlinedNotice
          icon={FilePen}
          title="Corrections are not yours to open"
          body="Corrections to published results open to the people who ask for or decide them."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={FilePen}
          title="We could not load the corrections"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !data ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <OutlinedNotice
          icon={FilePen}
          title={status ? "None here" : "No correction this term"}
          body="A correction appears here once someone asks for one from a student's Results tab."
        />
      ) : (
        <>
          <ul className={cn("grid gap-3", isFetching && "opacity-60")}>
            {rows.map((row) => (
              <AmendmentCard
                key={row.id}
                row={row}
                branchDimension={data.branch_dimension}
                onDecide={(approve) => setDeciding({ row, approve })}
              />
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-gray-06">
                Page {page} of {pages}
              </span>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {deciding && (
        <DecisionDrawer row={deciding.row} approve={deciding.approve} onClose={() => setDeciding(null)} />
      )}
    </PageShell>
  );
}

function AmendmentCard({
  row,
  branchDimension,
  onDecide,
}: {
  row: AmendmentRow;
  branchDimension: boolean;
  onDecide: (approve: boolean) => void;
}) {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_AMENDMENT);
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  const status = STATUS[row.status];
  const decides = row.can_decide && hasPermission(P.DECIDE_AMENDMENT);
  const mayReject = !access.isReadOnly("decision_note");
  const before = lineText(row.before);
  const after = lineText(row.after);
  const meta = [row.class.name, row.term.name, branchDimension ? row.branch?.name : null].filter(Boolean).join(" · ");
  const decided =
    row.status === "PENDING"
      ? null
      : [
          `${row.status === "APPROVED" ? "Approved" : "Rejected"}${row.decided_by ? ` by ${row.decided_by}` : ""}`,
          row.decided_at ? formatDate(row.decided_at) : null,
          row.version ? `report card version ${row.version}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <li>
      <Panel as="section" className="space-y-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-mont text-base font-semibold text-black-01">
              {row.subject.name} · {row.student.name}
            </h2>
            <p className="text-xs text-gray-06">{meta}</p>
          </div>
          <Badge variant={status.variant} className="shrink-0 rounded-full">
            {status.text}
          </Badge>
        </div>
        {row.amendment_reason && <p className="text-sm text-black-01">{row.amendment_reason}</p>}
        {(before || after) && (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2">
              <dt className="text-xs text-gray-05">As published</dt>
              <dd className="text-black-01">{before ?? "-"}</dd>
            </div>
            <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2">
              <dt className="text-xs text-gray-05">Corrected</dt>
              <dd className="font-medium text-black-01">{after ?? "-"}</dd>
            </div>
          </dl>
        )}
        <p className="text-xs text-gray-05">
          Asked for{row.raised_by ? ` by ${row.raised_by}` : ""} · {formatDate(row.raised_at)}
          {decided ? ` · ${decided}` : ""}
        </p>
        {row.decision_note && <p className="text-sm text-gray-06">Decision: {row.decision_note}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to={routesPath.PROTECTED.GRADEBOOK.REPORT_CARD_ID(row.class.id, row.student.id, row.term.id)}>
              View report card
            </Link>
          </Button>
          {decides && (
            <>
              {mayReject && (
                <Button size="sm" variant="outline" onClick={() => onDecide(false)}>
                  Reject
                </Button>
              )}
              <Button size="sm" onClick={() => onDecide(true)}>
                Approve
              </Button>
            </>
          )}
        </div>
      </Panel>
    </li>
  );
}

/** Approving takes an optional note; rejecting needs one, because the person who asked is owed a reason. */
function DecisionDrawer({ row, approve, onClose }: { row: AmendmentRow; approve: boolean; onClose: () => void }) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_AMENDMENT);
  const [note, setNote] = useState("");
  const [approveIt, approving] = useApproveAmendmentMutation();
  const [rejectIt, rejecting] = useRejectAmendmentMutation();
  const writesNote = !access.isReadOnly("decision_note");

  const onSave = async () => {
    const result = approve
      ? await approveIt({ id: row.id, ...(writesNote && note.trim() ? { note: note.trim() } : {}) })
      : await rejectIt({ id: row.id, note: note.trim() });
    if ("error" in result) return;
    toast.success(approve ? "Correction approved" : "Correction rejected", {
      description: approve
        ? `${row.student.name}'s report card is re-issued as the next version; the published one is kept.`
        : `${row.student.name}'s result stays as published.`,
    });
    onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`${approve ? "Approve" : "Reject"} the correction to ${row.subject.name}`}
      subtitle={`${row.student.name} · ${row.class.name} · ${row.term.name}`}
      saveLabel={approve ? "Approve the correction" : "Reject the correction"}
      onSave={() => void onSave()}
      canSave={approve || !!note.trim()}
      saving={approving.isLoading || rejecting.isLoading}
      destructive={!approve}
    >
      <div className="space-y-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-06">As published</dt>
            <dd className="text-right text-black-01">{lineText(row.before) ?? "-"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-06">Corrected</dt>
            <dd className="text-right font-medium text-black-01">{lineText(row.after) ?? "-"}</dd>
          </div>
        </dl>
        {row.amendment_reason && <p className="text-sm text-black-01">{row.amendment_reason}</p>}
        {writesNote && (
          <Field label={approve ? "Note (optional)" : "Why it is rejected"} required={!approve}>
            <Textarea
              rows={4}
              maxLength={1000}
              value={note}
              placeholder={approve ? "For example: checked against the script." : "For example: the script shows 26; the mark stands."}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        )}
        <p className="text-xs leading-5 text-gray-05">
          {approve
            ? "Only this student's report card changes. Where the result was released, the guardian is told an updated report card is ready."
            : "Nothing on the sheet or the report card changes."}
        </p>
      </div>
    </DrawerShell>
  );
}
