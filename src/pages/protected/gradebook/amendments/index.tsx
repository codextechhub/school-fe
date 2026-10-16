import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, FilePen } from "lucide-react";
import { toast } from "sonner";

import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { Field } from "@/pages/protected/students/drawers/drawer-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { MARKER_LABEL } from "../sheet/cells";

const STATUS: Record<AmendmentStatus, { text: string; variant: "pending" | "active" | "rejected" }> = {
  PENDING: { text: "Needs review", variant: "pending" },
  APPROVED: { text: "Approved", variant: "active" },
  REJECTED: { text: "Rejected", variant: "rejected" },
};

type AmendmentView = "ALL" | AmendmentStatus;

/** "7 · 7 · 26 · total 40, D": a line's marks in column order and what they earn. */
function lineText(line: AmendmentLine | undefined): string | null {
  if (!line) return null;
  const marks = line.cells?.map((cell) => (cell.marker ? MARKER_LABEL[cell.marker] : (cell.mark ?? "-"))).join(" · ");
  const figure = "total" in line ? `total ${line.total ?? "-"}${line.grade ? `, ${line.grade}` : ""}` : null;
  return [marks, figure].filter(Boolean).join(" · ") || null;
}

/** A queue-sized result label that never reveals a hidden total through a derived summary. */
function lineSummary(line: AmendmentLine | undefined): string | null {
  if (!line) return null;
  if ("total" in line) return `${line.total ?? "-"}${line.grade ? `, ${line.grade}` : ""}`;
  if (!line.cells) return null;
  return line.cells.map((cell) => (cell.marker ? MARKER_LABEL[cell.marker] : (cell.mark ?? "-"))).join(" · ");
}

/**
 * Corrections to published results, arranged as a review desk.
 *
 * The server owns status filtering and pagination. Three cached status reads
 * supply exact term totals for the compact summary and sliding filter instead
 * of pretending the current page is the whole school. Selecting a request
 * focuses its mark comparison, reason and audit trail. On small screens the
 * focused record follows the queue and scrolls into view.
 *
 * A correction is raised from the student's Results tab. This screen decides
 * it. The server separately supplies `can_decide`, so visibility never grants
 * authority and nobody can decide a request they raised.
 *
 * Field Access: the reason and decision note follow the amendment switches.
 * Marks and figures follow the sheet switches and disappear as complete
 * sections when the server omits them. Approving needs no note; rejecting is
 * unavailable when the decision note is hidden or read-only.
 */
export default function AmendmentsPage() {
  const { branch } = useBranchLens();
  const [view, setView] = useState<AmendmentView>("ALL");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deciding, setDeciding] = useState<AmendmentRow | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const statusFilter = view === "ALL" ? undefined : view;
  const { data, isLoading, isFetching, isError, error, refetch } = useGetAmendmentsQuery({ branch, status: statusFilter, page });
  const { data: allPage } = useGetAmendmentsQuery({ branch, page: 1 });
  const { data: pendingPage } = useGetAmendmentsQuery({ branch, status: "PENDING", page: 1 });
  const { data: approvedPage } = useGetAmendmentsQuery({ branch, status: "APPROVED", page: 1 });
  const { data: rejectedPage } = useGetAmendmentsQuery({ branch, status: "REJECTED", page: 1 });
  const rows = data?.data ?? [];
  const pages = data?.pagination.totalPages ?? 1;
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const refusal = parseApiError(error).status;
  const counts = {
    PENDING: pendingPage?.pagination.totalItems,
    APPROVED: approvedPage?.pagination.totalItems,
    REJECTED: rejectedPage?.pagination.totalItems,
  };

  useEffect(() => {
    if (!selectedId || !window.matchMedia?.("(max-width: 1023px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedId]);

  const changeView = (next: AmendmentView) => {
    setView(next);
    setPage(1);
    setSelectedId(null);
  };

  return (
    <PageShell className="content-start gap-4" grid>
      <PageHeader
        title="Gradebook corrections"
        description="Review changes to published results before they alter a student's report card."
      />

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
        <Skeleton className="h-72 w-full rounded-md" />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" aria-label="Correction summary">
            <Metric
              label="Needs review"
              value={counts.PENDING}
              foot="Awaiting a decision"
              tone={counts.PENDING ? "warn" : "default"}
            />
            <Metric label="Approved" value={counts.APPROVED} foot="Corrections applied this term" />
            <Metric label="Rejected" value={counts.REJECTED} foot="Closed without a change" />
          </section>

          <div className="max-w-full overflow-x-auto pb-1">
            <SegmentedToggle
              ariaLabel="Correction status"
              value={view}
              options={[
                { value: "ALL", label: "All", count: allPage?.pagination.totalItems },
                { value: "PENDING", label: "Needs review", count: counts.PENDING },
                { value: "APPROVED", label: "Approved", count: counts.APPROVED },
                { value: "REJECTED", label: "Rejected", count: counts.REJECTED },
              ]}
              onChange={changeView}
            />
          </div>

          {rows.length === 0 ? (
            <OutlinedNotice
              icon={FilePen}
              title={view === "ALL" ? "No correction this term" : `No ${STATUS[view].text.toLowerCase()} correction`}
              body="A correction appears here once someone asks for one from a student's Results tab."
            />
          ) : (
            <section
              className={cn(
                "grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(19rem,0.88fr)]",
                isFetching && "opacity-60",
              )}
              aria-label="Correction decision desk"
              aria-busy={isFetching}
            >
              <Panel as="section" className="overflow-hidden">
                <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3.5 py-3">
                  <div className="min-w-0">
                    <h2 className="font-mont text-sm font-semibold text-black-01">Requests</h2>
                    <p className="mt-0.5 text-xs text-gray-06">Select a request to review its marks and history.</p>
                  </div>
                  <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold tabular-nums text-gray-06">
                    {data.pagination.totalItems}
                  </span>
                </div>
                <ul className="max-h-[34rem] overflow-y-auto overscroll-contain">
                  {rows.map((row) => (
                    <AmendmentRowButton
                      key={row.id}
                      row={row}
                      branchDimension={data.branch_dimension}
                      active={selected?.id === row.id}
                      onOpen={() => setSelectedId(row.id)}
                    />
                  ))}
                </ul>
                {pages > 1 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3.5 py-2.5">
                    <span className="text-xs text-gray-06">Page {page} of {pages}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); setSelectedId(null); }}>
                        Previous
                      </Button>
                      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => { setPage(page + 1); setSelectedId(null); }}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Panel>

              {selected && (
                <div ref={detailRef} className="min-w-0 scroll-mt-20">
                  <AmendmentDetail row={selected} branchDimension={data.branch_dimension} onDecide={() => setDeciding(selected)} />
                </div>
              )}
            </section>
          )}
        </>
      )}

      {deciding && <DecisionDrawer row={deciding} onClose={() => setDeciding(null)} />}
    </PageShell>
  );
}

function Metric({ label, value, foot, tone = "default" }: { label: string; value: number | undefined; foot: string; tone?: "default" | "warn" }) {
  return (
    <Panel className={cn("space-y-1.5 px-3.5 py-3", tone === "warn" && "border-amber-200 bg-amber-50")}>
      <p className="text-xs font-medium text-gray-06">{label}</p>
      <p className={cn("font-mont text-xl font-semibold text-black-01", tone === "warn" && "text-amber-700")}>{value ?? "…"}</p>
      <p className="text-xs text-gray-06">{foot}</p>
    </Panel>
  );
}

function AmendmentRowButton({ row, branchDimension, active, onOpen }: { row: AmendmentRow; branchDimension: boolean; active: boolean; onOpen: () => void }) {
  const before = lineSummary(row.before);
  const after = lineSummary(row.after);
  const status = STATUS[row.status];
  const scope = branchDimension ? row.branch?.name : null;

  return (
    <li className={cn("border-b border-border last:border-b-0", active && "bg-pry-01/40")}>
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={onOpen}
        className="group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3.5 py-3 text-left transition-all ease-linear hover:bg-pry-01/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[minmax(9rem,1.15fr)_minmax(7rem,0.85fr)_auto_auto]"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-black-01">{row.student.name}</span>
          <span className="mt-0.5 block truncate text-xs text-gray-06">{[row.student.admission_number, row.subject.name].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm text-black-01">{row.class.name}</span>
          <span className="mt-0.5 block truncate text-xs text-gray-06">{scope ?? row.term.name}</span>
        </span>
        <span className="min-w-0 text-right sm:text-left">
          {before && after && <span className="block whitespace-nowrap text-xs font-medium text-black-01">{before} <span aria-hidden>→</span> {after}</span>}
          <Badge variant={status.variant} className="mt-1 rounded-full">{status.text}</Badge>
        </span>
        <ArrowRight className="hidden size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
      </button>
    </li>
  );
}

function AmendmentDetail({ row, branchDimension, onDecide }: { row: AmendmentRow; branchDimension: boolean; onDecide: () => void }) {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_AMENDMENT);
  const { formatDateTime } = useSchoolDisplay(row.branch?.id ?? null);
  const status = STATUS[row.status];
  const decides = row.can_decide && hasPermission(P.DECIDE_AMENDMENT);
  const mayReject = !access.isReadOnly("decision_note");
  const before = lineText(row.before);
  const after = lineText(row.after);
  const scope = branchDimension ? row.branch?.name : null;
  const meta = [row.subject.name, row.class.name, scope, row.term.name].filter(Boolean).join(" · ");

  return (
    <Panel as="section" className="p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-mont text-base font-semibold text-black-01">{row.student.name}</h2>
          <p className="mt-0.5 text-xs text-gray-06">{row.student.admission_number ? `${row.student.admission_number} · ` : ""}{meta}</p>
        </div>
        <Badge variant={status.variant} className="shrink-0 rounded-full">{status.text}</Badge>
      </div>

      {(before || after) && (
        <dl className="mt-4 grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2.5"><dt className="text-xs text-gray-05">As published</dt><dd className="mt-1 break-words text-sm text-black-01">{before ?? "-"}</dd></div>
          <ArrowRight className="mx-auto hidden size-4 text-primary sm:block" aria-hidden="true" />
          <div className="min-w-0 rounded-md bg-pry-01 px-3 py-2.5"><dt className="text-xs text-gray-05">Requested correction</dt><dd className="mt-1 break-words text-sm font-medium text-black-01">{after ?? "-"}</dd></div>
        </dl>
      )}

      {row.amendment_reason && <section className="mt-4"><h3 className="text-xs font-semibold text-black-01">Reason{row.raised_by ? ` from ${row.raised_by}` : ""}</h3><p className="mt-1 text-sm leading-6 text-gray-06">{row.amendment_reason}</p></section>}

      <section className="mt-4">
        <h3 className="text-xs font-semibold text-black-01">Request trail</h3>
        <ol className="mt-2 space-y-2 text-xs text-gray-06">
          <li className="flex gap-2"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><span>Requested{row.raised_by ? ` by ${row.raised_by}` : ""} · {formatDateTime(row.raised_at)}</span></li>
          {row.status !== "PENDING" && <li className="flex gap-2"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><span>{row.status === "APPROVED" ? "Approved" : "Rejected"}{row.decided_by ? ` by ${row.decided_by}` : ""}{row.decided_at ? ` · ${formatDateTime(row.decided_at)}` : ""}{row.version ? ` · report card version ${row.version}` : ""}</span></li>}
        </ol>
      </section>

      {row.decision_note && <div className="mt-4 rounded-md bg-gray-50 px-3 py-2.5"><p className="text-xs font-medium text-gray-05">Decision note</p><p className="mt-1 text-sm text-black-01">{row.decision_note}</p></div>}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        {decides && <Button size="sm" onClick={onDecide}>Review decision</Button>}
        <Button size="sm" variant="outline" asChild><Link to={routesPath.PROTECTED.GRADEBOOK.REPORT_CARD_ID(row.class.id, row.student.id, row.term.id)}>View report card</Link></Button>
        {decides && !mayReject && <p className="w-full text-xs text-gray-05">This role can approve, but cannot write the note required to reject.</p>}
      </div>
    </Panel>
  );
}

/** A single review drawer keeps both valid decisions beside the record being judged. */
function DecisionDrawer({ row, onClose }: { row: AmendmentRow; onClose: () => void }) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_AMENDMENT);
  const [note, setNote] = useState("");
  const [approveIt, approving] = useApproveAmendmentMutation();
  const [rejectIt, rejecting] = useRejectAmendmentMutation();
  const writesNote = !access.isReadOnly("decision_note");
  const busy = approving.isLoading || rejecting.isLoading;
  const before = lineText(row.before);
  const after = lineText(row.after);

  const decide = async (approve: boolean) => {
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
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="font-mont text-base">Review correction</SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">{row.student.name} · {row.subject.name} · {row.class.name}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-5 py-4">
          <div className="space-y-4">
            {(before || after) && <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div className="min-w-0 rounded-md bg-gray-50 px-3 py-2.5"><dt className="text-xs text-gray-05">As published</dt><dd className="mt-1 break-words text-sm text-black-01">{before ?? "-"}</dd></div><div className="min-w-0 rounded-md bg-pry-01 px-3 py-2.5"><dt className="text-xs text-gray-05">After approval</dt><dd className="mt-1 break-words text-sm font-medium text-black-01">{after ?? "-"}</dd></div></dl>}
            {row.amendment_reason && <div><h3 className="text-xs font-semibold text-black-01">Reason for the correction</h3><p className="mt-1 text-sm leading-6 text-gray-06">{row.amendment_reason}</p></div>}
            {writesNote && <Field label="Decision note" hint="Optional when approving. Required when rejecting."><Textarea rows={4} maxLength={1000} value={note} placeholder="Add a short note for the teacher and audit trail" onChange={(event) => setNote(event.target.value)} /></Field>}
            <p className="text-xs leading-5 text-gray-05">Approving changes only this student's report card and keeps the published version. Rejecting leaves the result unchanged.</p>
          </div>
        </ScrollArea>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          {writesNote && <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800" disabled={!note.trim() || busy} onClick={() => void decide(false)}>{rejecting.isLoading ? "Rejecting…" : "Reject correction"}</Button>}
          <Button disabled={busy} onClick={() => void decide(true)}>{approving.isLoading ? "Approving…" : "Approve correction"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
