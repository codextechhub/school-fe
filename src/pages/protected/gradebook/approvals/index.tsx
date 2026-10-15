import { useState } from "react";
import { Link } from "react-router";
import { Stamp } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetAmendmentsQuery, useGetApprovalsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { ApprovalRow } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { CLASS_STAGE } from "../components/class-stage";
import { PrincipalCommentsDrawer } from "./principal-comments-drawer";
import { PublishDialog } from "./publish-dialog";
import { ReturnClassDrawer } from "./return-class-drawer";

/** The awaiting classes first, each group in the order the server lists it. */
const byDecision = (a: ApprovalRow, b: ApprovalRow) =>
  Number(b.stage === "AWAITING") - Number(a.stage === "AWAITING");

/**
 * Approvals and publishing: the classes their class teachers have sent to the
 * principal, and the classes already published, in the reader's branches.
 *
 * An approver decides an awaiting class here: return it (to the class teacher,
 * or one subject's sheet to its teacher), write the principal's comment for
 * each remark band, and approve and publish it. Publishing locks every mark,
 * comment and rating and releases every result that is not held; a change
 * after that is an amendment. Where two or more classes await a decision they
 * can be ticked and published together, each in its own transaction, so one
 * refusal does not stop the rest.
 *
 * Each row names the students whose results are held and who held them, never
 * why: the reason belongs to the fee holds screen. A reader who decides
 * corrections is told how many wait, with the way to them.
 *
 * Field Access: Return needs Write on the return note, because a class never
 * goes back without one, and the principal's comments follow their own switch
 * (hidden leaves the action out, read-only opens the drawer to read).
 */
export default function ApprovalsPage() {
  const { branch } = useBranchLens();
  const { data, isLoading, isError, error, refetch } = useGetApprovalsQuery({ branch });
  const sheetAccess = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SHEET);
  const resultAccess = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_RESULT);
  const [returning, setReturning] = useState<ApprovalRow | null>(null);
  const [commenting, setCommenting] = useState<ApprovalRow | null>(null);
  const [publishing, setPublishing] = useState<ApprovalRow[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  const queue = data?.data;
  const rows = [...(queue?.classes ?? [])].sort(byDecision);
  const deciding = rows.filter((row) => row.can_decide);
  const chosen = deciding.filter((row) => picked.includes(row.class.id));
  const offersBatch = deciding.length > 1;
  const mayReturn = !sheetAccess.isReadOnly("note");
  const readsComments = !resultAccess.isHidden("comments");
  const status = parseApiError(error).status;
  const { hasPermission } = usePermissions();
  const decidesCorrections = hasPermission(P.DECIDE_AMENDMENT);
  const { data: waiting } = useGetAmendmentsQuery({ branch, status: "PENDING" }, { skip: !decidesCorrections });
  const corrections = waiting?.pagination.totalItems ?? 0;

  const toggle = (id: number, on: boolean) =>
    setPicked((current) => (on ? [...current, id] : current.filter((value) => value !== id)));

  return (
    <PageShell className="content-start gap-4" grid>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">Approvals and publishing</h1>
          <p className="text-sm text-gray-06">
            Compiled classes waiting on the principal. Publishing locks the results; a change after that is an
            amendment.
          </p>
        </div>
        {offersBatch && (
          <Button disabled={chosen.length === 0} onClick={() => setPublishing(chosen)}>
            {chosen.length > 1 ? `Publish ${chosen.length} classes` : "Publish the ticked class"}
          </Button>
        )}
      </div>

      {decidesCorrections && corrections > 0 && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-white px-4 py-3 text-sm text-black-01">
          {corrections === 1 ? "1 correction to a published result is" : `${corrections} corrections to published results are`}{" "}
          waiting for a decision.
          <Link to={routesPath.PROTECTED.GRADEBOOK.AMENDMENTS} className="font-medium text-primary hover:underline">
            Open corrections
          </Link>
        </p>
      )}

      {status === 403 ? (
        <OutlinedNotice
          icon={Stamp}
          title="Approvals are not yours to open"
          body="Approving and publishing results belongs to the principal, or whoever the school gives it to."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={Stamp}
          title="We could not load the approvals"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !queue ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <OutlinedNotice
          icon={Stamp}
          title="No class is waiting"
          body="A class appears here when its class teacher submits it, and stays once it is published."
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => (
            <ApprovalCard
              key={row.class.id}
              row={row}
              branchDimension={queue.branch_dimension}
              selectable={offersBatch && row.can_decide}
              selected={picked.includes(row.class.id)}
              onSelect={(on) => toggle(row.class.id, on)}
              onReturn={mayReturn ? () => setReturning(row) : undefined}
              onComment={readsComments ? () => setCommenting(row) : undefined}
              onPublish={() => setPublishing([row])}
            />
          ))}
        </ul>
      )}

      {returning && <ReturnClassDrawer row={returning} onClose={() => setReturning(null)} />}
      {commenting && <PrincipalCommentsDrawer row={commenting} onClose={() => setCommenting(null)} />}
      {publishing && (
        <PublishDialog
          rows={publishing}
          onClose={(published) => {
            setPublishing(null);
            if (published.length) setPicked((current) => current.filter((id) => !published.includes(id)));
          }}
        />
      )}
    </PageShell>
  );
}

function ApprovalCard({
  row,
  branchDimension,
  selectable,
  selected,
  onSelect,
  onReturn,
  onComment,
  onPublish,
}: {
  row: ApprovalRow;
  branchDimension: boolean;
  selectable: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onReturn?: () => void;
  onComment?: () => void;
  onPublish: () => void;
}) {
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  const stage = CLASS_STAGE[row.stage];
  const meta = [
    `${row.subjects_in} of ${row.subjects_due} subjects`,
    row.class_teacher ? `class teacher ${row.class_teacher.name}` : "no class teacher",
    branchDimension ? row.branch?.name : null,
    row.published_at ? `published ${formatDate(row.published_at)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const heldNote = row.held.length
    ? `${row.held
        .map((held) => (held.held_by ? `${held.student.name} is held by ${held.held_by}` : `${held.student.name} is held`))
        .join("; ")}.`
    : "No result in this class is held.";

  return (
    <li>
      <Panel as="section" className="space-y-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          {selectable && (
            <Checkbox
              className="mt-1"
              checked={selected}
              aria-label={`Tick ${row.class.name} to publish`}
              onCheckedChange={(value) => onSelect(value === true)}
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-mont text-base font-semibold text-black-01">{row.class.name}</h2>
            <p className="text-xs text-gray-06">{meta}</p>
          </div>
          <Badge variant={stage.variant} className="shrink-0 rounded-full">
            {stage.text}
          </Badge>
        </div>
        <p className={row.held.length ? "text-sm text-[#854F0B]" : "text-sm text-gray-06"}>{heldNote}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" asChild>
            <Link to={routesPath.PROTECTED.GRADEBOOK.BROADSHEET_ID(row.class.id)}>Open broadsheet</Link>
          </Button>
          {row.can_decide && (
            <>
              {onReturn && (
                <Button size="sm" variant="outline" onClick={onReturn}>
                  Return
                </Button>
              )}
              {onComment && (
                <Button size="sm" variant="outline" onClick={onComment}>
                  Principal&apos;s comments
                </Button>
              )}
              <Button size="sm" onClick={onPublish}>
                Approve and publish
              </Button>
            </>
          )}
          {!row.can_decide && row.stage === "PUBLISHED" && onComment && (
            <Button size="sm" variant="ghost" onClick={onComment}>
              Principal&apos;s comments
            </Button>
          )}
        </div>
      </Panel>
    </li>
  );
}
