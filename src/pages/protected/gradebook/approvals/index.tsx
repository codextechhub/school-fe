import { classTeacherText } from "@/hooks/use-class-teacher-access";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, LockKeyhole, Stamp } from "lucide-react";

import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetAmendmentsQuery, useGetApprovalsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { ApprovalRow } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { CLASS_STAGE } from "../components/class-stage";
import {
  getApprovalDeskSummary,
  groupApprovalRows,
  type ApprovalDeskStage,
} from "./approvals-desk";
import { PrincipalCommentsDrawer } from "./principal-comments-drawer";
import { PublishDialog } from "./publish-dialog";
import { ReturnClassDrawer } from "./return-class-drawer";

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
 * The decision desk separates awaiting and published classes with the shared
 * sliding control. Selecting a class brings its complete release summary and
 * actions into focus, while checkboxes remain a separate batch-publish tool.
 * Each class names the students whose results are held and who held them,
 * never why: the reason belongs to the fee holds screen. A reader who decides
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
  const [stage, setStage] = useState<ApprovalDeskStage>("AWAITING");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const queue = data?.data;
  const rows = queue?.classes ?? [];
  const groups = groupApprovalRows(rows);
  const summary = getApprovalDeskSummary(rows);
  const visibleRows = groups[stage];
  const selected = visibleRows.find((row) => row.class.id === selectedId) ?? visibleRows[0] ?? null;
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
      <PageHeader
        title="Approvals and publishing"
        description="Review compiled classes before results go to families. Publishing locks the results; a change after that is an amendment."
        actions={
          offersBatch ? (
            <Button disabled={chosen.length === 0} onClick={() => setPublishing(chosen)}>
              {chosen.length > 1 ? `Publish ${chosen.length} classes` : "Publish the ticked class"}
            </Button>
          ) : undefined
        }
      />

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
        <>
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" aria-label="Approval summary">
            <Metric label="Waiting for you" value={summary.waitingForYou} foot="Compiled classes you can decide" tone={summary.waitingForYou ? "warn" : "default"} />
            <Metric label="Held results" value={summary.heldResults} foot="Stay private after publishing" tone={summary.heldResults ? "warn" : "default"} />
            <Metric label="Published" value={summary.published} foot="Released this term" />
          </section>

          <section className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)]" aria-label="Approval decision desk">
            <Panel as="section" className="overflow-hidden">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-border px-3.5 py-3">
                <div className="min-w-0">
                  <h2 className="font-mont text-sm font-semibold text-black-01">Classes</h2>
                  <p className="mt-0.5 text-xs text-gray-06">Select a class to check its release details.</p>
                </div>
                <div className="max-w-full overflow-x-auto pb-1">
                  <SegmentedToggle
                    ariaLabel="Approval stage"
                    value={stage}
                    options={[
                      { value: "AWAITING", label: "Awaiting", count: groups.AWAITING.length },
                      { value: "PUBLISHED", label: "Published", count: groups.PUBLISHED.length },
                    ]}
                    onChange={(next) => {
                      setStage(next);
                      setSelectedId(null);
                    }}
                  />
                </div>
              </div>
              {visibleRows.length === 0 ? (
                <p className="px-3.5 py-6 text-sm text-gray-06">
                  {stage === "AWAITING" ? "No class is waiting for approval." : "No class has been published this term."}
                </p>
              ) : (
                <ul>
                  {visibleRows.map((row) => (
                    <ApprovalRowButton
                      key={row.class.id}
                      row={row}
                      branchDimension={queue.branch_dimension}
                      selectable={offersBatch && row.can_decide}
                      checked={picked.includes(row.class.id)}
                      active={selected?.class.id === row.class.id}
                      onCheck={(on) => toggle(row.class.id, on)}
                      onOpen={() => setSelectedId(row.class.id)}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            {selected ? (
              <ApprovalDetail
                row={selected}
                branchDimension={queue.branch_dimension}
                onReturn={mayReturn ? () => setReturning(selected) : undefined}
                onComment={readsComments ? () => setCommenting(selected) : undefined}
                onPublish={() => setPublishing([selected])}
              />
            ) : (
              <Panel as="section" className="p-4 text-sm text-gray-06">
                Select a stage with classes to review its release details.
              </Panel>
            )}
          </section>
        </>
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

function Metric({
  label,
  value,
  foot,
  tone = "default",
}: {
  label: string;
  value: number;
  foot: string;
  tone?: "default" | "warn";
}) {
  return (
    <Panel className={cn("space-y-1.5 px-3.5 py-3", tone === "warn" && "border-amber-200 bg-amber-50")}>
      <p className="text-xs font-medium text-gray-06">{label}</p>
      <p className={cn("font-mont text-xl font-semibold text-black-01", tone === "warn" && "text-amber-700")}>{value}</p>
      <p className="text-xs text-gray-06">{foot}</p>
    </Panel>
  );
}

function ApprovalRowButton({
  row,
  branchDimension,
  selectable,
  checked,
  active,
  onCheck,
  onOpen,
}: {
  row: ApprovalRow;
  branchDimension: boolean;
  selectable: boolean;
  checked: boolean;
  active: boolean;
  onCheck: (on: boolean) => void;
  onOpen: () => void;
}) {
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  const teacher = classTeacherText(row.class_teacher);
  const scope = branchDimension ? row.branch?.name : null;
  const status = row.published_at ? `Published ${formatDate(row.published_at)}` : "Ready for decision";

  return (
    <li className={cn("border-b border-border last:border-b-0", active && "bg-pry-01/40")}>
      <div className="flex min-w-0 items-center gap-2 px-3 py-1">
        {selectable && (
          <Checkbox
            checked={checked}
            aria-label={`Tick ${row.class.name} to publish`}
            onCheckedChange={(value) => onCheck(value === true)}
          />
        )}
        <button
          type="button"
          aria-current={active ? "true" : undefined}
          onClick={onOpen}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-3 text-left transition-all ease-linear hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-black-01">{row.class.name}</span>
            <span className="mt-0.5 block text-xs text-gray-06">
              {row.subjects_in} of {row.subjects_due} subjects in{scope ? ` · ${scope}` : ""}
            </span>
          </span>
          <span className="hidden min-w-0 flex-1 sm:block">
            {teacher && <span className="block truncate text-sm text-black-01">{teacher}</span>}
            <span className="mt-0.5 block text-xs text-gray-06">{status}</span>
          </span>
          {row.held.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
              <LockKeyhole className="size-3" aria-hidden="true" />
              {row.held.length}
            </span>
          )}
          <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function ApprovalDetail({
  row,
  branchDimension,
  onReturn,
  onComment,
  onPublish,
}: {
  row: ApprovalRow;
  branchDimension: boolean;
  onReturn?: () => void;
  onComment?: () => void;
  onPublish: () => void;
}) {
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  const stage = CLASS_STAGE[row.stage];
  const teacher = classTeacherText(row.class_teacher);

  return (
    <Panel as="section" className="space-y-3 p-4 lg:sticky lg:top-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-mont text-base font-semibold text-black-01">{row.class.name}</h2>
          <p className="mt-0.5 text-xs text-gray-06">
            {[teacher, branchDimension ? row.branch?.name : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge variant={stage.variant} className="shrink-0 rounded-full">
          {stage.text}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <DetailFact label="Subjects received" value={`${row.subjects_in} of ${row.subjects_due}`} />
        {teacher && <DetailFact label="Class teacher" value={teacher} />}
        <DetailFact label="Results held" value={String(row.held.length)} />
        <DetailFact
          label={row.published_at ? "Published" : "Decision"}
          value={row.published_at ? formatDate(row.published_at) : row.can_decide ? "Waiting for you" : "Read only"}
        />
      </dl>

      {row.held.length > 0 ? (
        <div className="flex gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {row.held.map((held) => (
              <span key={held.student.id} className="block">
                <strong>{held.student.name}</strong>
                {held.held_by ? ` is held by ${held.held_by}` : " is held"}. {row.stage === "PUBLISHED"
                  ? "This result remains private."
                  : "Publishing keeps this result private."}
              </span>
            ))}
          </span>
        </div>
      ) : (
        <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">No result in this class is held.</p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" asChild>
          <Link to={routesPath.PROTECTED.GRADEBOOK.BROADSHEET_ID(row.class.id)}>Open broadsheet</Link>
        </Button>
        {row.can_decide && (
          <>
            {onComment && (
              <Button size="sm" variant="outline" onClick={onComment}>
                Principal&apos;s comments
              </Button>
            )}
            {onReturn && (
              <Button size="sm" variant="outline" onClick={onReturn}>
                Return
              </Button>
            )}
            <Button size="sm" onClick={onPublish}>
              Approve and publish
            </Button>
          </>
        )}
        {!row.can_decide && row.stage === "PUBLISHED" && onComment && (
          <Button size="sm" variant="outline" onClick={onComment}>
            Principal&apos;s comments
          </Button>
        )}
      </div>
    </Panel>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2.5">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-black-01">{value}</dd>
    </div>
  );
}
