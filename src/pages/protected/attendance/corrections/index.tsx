import { useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Search,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { Pager } from "@/pages/protected/students/pager";
import { PersonAvatar } from "@/pages/protected/students/person-avatar";
import {
  useDecideCorrectionMutation,
  useGetCorrectionsQuery,
} from "@/redux/services/attendance/attendance-api";
import type { CorrectionRow } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";

import { AttendancePageHeader } from "../components/attendance-page-header";
import { MARKS } from "../marks";
import { correctionDecisionBody, correctionFieldPolicy } from "./correction-field-policy";
import { correctionMatchesSearch, correctionPageSummary } from "./correction-list-state";

type QueueTab = "pending" | "decided";

/**
 * Correction review keeps the queue and its evidence together.
 *
 * Counts come from the server's pagination totals rather than from the current
 * page. The queue is the only paginated collection; selecting a row opens its
 * review alongside it on wide screens and moves the review into view on small
 * screens. Field Access removes protected evidence from both the queue and the
 * review, and separately decides whether a decision note may be submitted.
 */
export default function AttendanceCorrections() {
  const { hasPermission } = usePermissions();
  const decides = hasPermission(P.DECIDE_ATTENDANCE_CORRECTION);
  const asks = hasPermission(P.REQUEST_ATTENDANCE_CORRECTION);
  const canBrowseStudents = hasPermission(P.BROWSE_STUDENTS);
  const { branch, applies, label: branchLabel } = useBranchLens();
  const access = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_CORRECTION);
  const policy = correctionFieldPolicy({
    fromMarkHidden: access.isHidden("from_mark"),
    toMarkHidden: access.isHidden("to_mark"),
    arrivedAtHidden: access.isHidden("arrived_at"),
    reasonHidden: access.isHidden("reason_code"),
    noteHidden: access.isHidden("note"),
    requesterHidden: access.isHidden("requested_by_name"),
    requestedAtHidden: access.isHidden("requested_at"),
    deciderHidden: access.isHidden("decided_by_name"),
    decidedAtHidden: access.isHidden("decided_at"),
    decisionNoteHidden: access.isHidden("decision_note"),
    decisionNoteReadOnly: access.isReadOnly("decision_note"),
  });
  const [tab, setTab] = useState<QueueTab>("pending");
  const [pendingPage, setPendingPage] = useState(1);
  const [decidedPage, setDecidedPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const mayReadCorrections = decides || asks;
  const pending = useGetCorrectionsQuery(
    { status: "pending", branch, page: pendingPage },
    { skip: !mayReadCorrections },
  );
  const decided = useGetCorrectionsQuery(
    { status: "decided", branch, page: decidedPage },
    { skip: !mayReadCorrections },
  );
  const awaiting = useGetCorrectionsQuery(
    { status: "pending", branch, page: 1, awaitingMe: true },
    { skip: !decides },
  );

  if (!decides && !asks) {
    return (
      <PageShell>
        <PageAccessDenied message="Your role does not include attendance corrections. Ask your school administrator if you need it." />
      </PageShell>
    );
  }

  const activeQuery = tab === "pending" ? pending : decided;
  const rows = activeQuery.data?.data ?? [];
  const visibleRows = rows.filter((row) => correctionMatchesSearch(row, search, policy.showRequester));
  const focused = visibleRows.find((row) => row.id === selectedId) ?? visibleRows[0] ?? null;
  const pendingTotal = pending.data?.pagination.totalItems;
  const awaitingTotal = awaiting.data?.pagination.totalItems;
  const decidedTotal = decided.data?.pagination.totalItems;
  const ownPendingTotal = pendingTotal != null && awaitingTotal != null
    ? Math.max(0, pendingTotal - awaitingTotal)
    : undefined;
  const pageSummary = correctionPageSummary(rows);
  const page = tab === "pending" ? pendingPage : decidedPage;
  const totalPages = activeQuery.data?.pagination.totalPages ?? 1;

  const selectRow = (row: CorrectionRow) => {
    setSelectedId(row.id);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      window.requestAnimationFrame(() => {
        document.getElementById("attendance-correction-focus")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const changeTab = (next: QueueTab) => {
    setTab(next);
    setSelectedId(null);
    setSearch("");
  };

  const changePage = (next: number) => {
    if (tab === "pending") setPendingPage(next);
    else setDecidedPage(next);
    setSelectedId(null);
  };

  return (
    <PageShell className="content-start gap-5" grid>
      <AttendancePageHeader
        title="Attendance corrections"
        description={decides
          ? "Review requested mark changes, see the evidence together, and leave a clear decision."
          : "Follow the corrections you requested and see the decision on each one."}
        meta={[applies ? branchLabel : null]}
      />

      <CorrectionSummary
        decides={decides}
        pending={pendingTotal}
        awaiting={awaitingTotal}
        ownPending={ownPendingTotal}
        decided={decidedTotal}
        loading={pending.isLoading || decided.isLoading || (decides && awaiting.isLoading)}
      />

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.78fr)]">
        <Panel as="section" className="overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border p-3 sm:p-4">
            <label className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05"
                aria-hidden="true"
              />
              <span className="sr-only">Search this page</span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search this page"
                className="pl-9"
              />
            </label>
            <div className="max-w-full overflow-x-auto">
              <SegmentedToggle<QueueTab>
                value={tab}
                options={[
                  { value: "pending", label: "Pending", count: pendingTotal },
                  { value: "decided", label: "Decided", count: decidedTotal },
                ]}
                onChange={changeTab}
                ariaLabel="Correction status filter"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 bg-white-05 px-4 py-2.5 text-xs text-gray-05">
            <span className="font-semibold uppercase tracking-[0.1em] text-gray-06">
              {tab === "pending" ? "Pending requests" : "Decision history"}
            </span>
            <span>
              {tab === "decided"
                ? `${pageSummary.approved} approved, ${pageSummary.rejected} rejected on this page`
                : `${visibleRows.length} shown on this page`}
            </span>
          </div>

          {activeQuery.isError ? (
            <QueueMessage>
              <span>We could not load these corrections.</span>
              <Button variant="outline" size="sm" onClick={() => activeQuery.refetch()}>
                Try again
              </Button>
            </QueueMessage>
          ) : activeQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-20 w-full rounded-md" />
              ))}
            </div>
          ) : visibleRows.length === 0 ? (
            <QueueMessage>
              <CheckCircle2 className="size-4 shrink-0 text-green-01" aria-hidden="true" />
              <span>
                {search
                  ? "No correction on this page matches your search."
                  : tab === "pending"
                    ? "No correction is waiting for a decision."
                    : "No correction has been decided yet."}
              </span>
            </QueueMessage>
          ) : (
            <ul className="divide-y divide-border">
              {visibleRows.map((row) => (
                <CorrectionQueueRow
                  key={row.id}
                  row={row}
                  active={focused?.id === row.id}
                  policy={policy}
                  onSelect={() => selectRow(row)}
                />
              ))}
            </ul>
          )}

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-gray-05">
              {activeQuery.data?.pagination.totalItems ?? 0} {tab === "pending" ? "pending" : "decided"} request{(activeQuery.data?.pagination.totalItems ?? 0) === 1 ? "" : "s"}
            </p>
            <Pager page={page} totalPages={totalPages} onGo={changePage} />
          </div>
        </Panel>

        <div id="attendance-correction-focus" className="min-w-0 scroll-mt-5 xl:sticky xl:top-5">
          {focused ? (
            <CorrectionFocus
              key={focused.id}
              row={focused}
              policy={policy}
              canDecide={tab === "pending" && decides && !focused.is_mine}
              ownRequest={tab === "pending" && focused.is_mine}
              canBrowseStudents={canBrowseStudents}
            />
          ) : (
            <Panel className="grid min-h-60 place-content-center p-6 text-center">
              <div>
                <ClipboardEmptyState status={tab} />
                <p className="mt-3 text-sm font-medium text-black-01">No correction selected</p>
                <p className="mt-1 max-w-xs text-sm text-gray-05">
                  {search ? "Clear the search or choose another page." : "Requests in this queue will open here."}
                </p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function CorrectionSummary({
  decides,
  pending,
  awaiting,
  ownPending,
  decided,
  loading,
}: {
  decides: boolean;
  pending?: number;
  awaiting?: number;
  ownPending?: number;
  decided?: number;
  loading: boolean;
}) {
  const cards = decides
    ? [
      { label: "Waiting", hint: "All pending", value: pending, icon: Clock3, tone: "amber" },
      { label: "Awaiting you", hint: "Ready to review", value: awaiting, icon: AlertTriangle, tone: "red" },
      { label: "Your pending", hint: "Another admin decides", value: ownPending, icon: Send, tone: "blue" },
      { label: "Decided", hint: "Recorded decisions", value: decided, icon: CheckCircle2, tone: "green" },
    ] as const
    : [
      { label: "Waiting", hint: "Your pending requests", value: pending, icon: Clock3, tone: "amber" },
      { label: "Decided", hint: "Your recorded decisions", value: decided, icon: CheckCircle2, tone: "green" },
    ] as const;

  const tones = {
    amber: "bg-yellow-01/10 text-yellow-01-text",
    red: "bg-destructive/10 text-error-text",
    blue: "bg-primary/10 text-primary",
    green: "bg-green-01/10 text-green-01-text",
  };

  return (
    <section
      aria-label="Correction summary"
      className={cn(
        "grid min-w-0 grid-cols-2 gap-3",
        decides ? "lg:grid-cols-4" : "sm:grid-cols-2",
      )}
    >
      {cards.map(({ label, hint, value, icon: Icon, tone }) => (
        <Panel key={label} className="flex min-w-0 items-center gap-3 p-3 sm:p-4">
          <span className={cn("grid size-10 shrink-0 place-content-center rounded-md", tones[tone])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-gray-06">{label}</span>
            <span className="mt-0.5 block truncate text-[11px] text-gray-05">{hint}</span>
          </span>
          {loading && value == null ? (
            <Skeleton className="h-7 w-8" />
          ) : (
            <strong className="font-mont text-xl font-semibold text-black-01">{value ?? "-"}</strong>
          )}
        </Panel>
      ))}
    </section>
  );
}

function QueueMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-32 flex-wrap items-center justify-center gap-2.5 px-4 py-8 text-sm text-gray-06">
      {children}
    </div>
  );
}

/** One selectable request, limited to fields this reader may see. */
function CorrectionQueueRow({
  row,
  active,
  policy,
  onSelect,
}: {
  row: CorrectionRow;
  active: boolean;
  policy: ReturnType<typeof correctionFieldPolicy>;
  onSelect: () => void;
}) {
  const { formatDay } = useSchoolDisplay();
  const secondary = [row.class_name, row.student.student_number, row.branch?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "group relative grid w-full min-w-0 gap-3 px-4 py-3 text-left transition-all active:scale-[0.99] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
          active ? "bg-primary/7" : "hover:bg-white-05",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-0.5 bg-primary transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-50",
          )}
          aria-hidden="true"
        />
        <span className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={row.student.name} className="size-9 shrink-0" textClassName="text-[11px]" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-black-01">{row.student.name}</span>
            <span className="mt-0.5 block truncate text-xs text-gray-05">{secondary}</span>
            <span className="mt-1 block truncate text-[11px] text-gray-05">
              {policy.showRequester && row.requested_by_name
                ? `Requested by ${row.requested_by_name}`
                : formatDay(row.date, { weekday: "short" })}
            </span>
          </span>
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          <MarkChange row={row} policy={policy} compact />
          <StatusBadge row={row} />
          <ChevronRight
            className="ml-auto size-4 shrink-0 text-gray-05 transition-transform group-hover:translate-x-0.5 sm:ml-1"
            aria-hidden="true"
          />
        </span>
      </button>
    </li>
  );
}

/** The full decision surface for one selected correction. */
function CorrectionFocus({
  row,
  policy,
  canDecide,
  ownRequest,
  canBrowseStudents,
}: {
  row: CorrectionRow;
  policy: ReturnType<typeof correctionFieldPolicy>;
  canDecide: boolean;
  ownRequest: boolean;
  canBrowseStudents: boolean;
}) {
  const { formatDay, formatDateTime } = useSchoolDisplay();
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);
  const [decide, { isLoading }] = useDecideCorrectionMutation();
  const isDecided = row.status === "APPROVED" || row.status === "REJECTED";
  const requestedMeta = policy.showRequestedAt && row.requested_at
    ? formatDateTime(row.requested_at)
    : null;
  const showRequestEvidence =
    (policy.showReason && Boolean(row.reason_label)) ||
    (policy.showNote && Boolean(row.note));
  const showDecisionEvidence =
    (policy.showDecider && Boolean(row.decided_by_name)) ||
    (policy.showDecidedAt && Boolean(row.decided_at)) ||
    (policy.showDecisionNote && Boolean(row.decision_note));

  const submit = async () => {
    if (!confirm) return;
    const approve = confirm === "approve";
    const result = await decide(correctionDecisionBody({
      id: row.id,
      approve,
      note,
      canWriteDecisionNote: policy.canWriteDecisionNote,
    }));
    if ("error" in result) return;
    setConfirm(null);
    if (approve) {
      toast.success("Correction approved", {
        description: `${row.student.name}'s register has been updated.`,
      });
    } else {
      toast.info("Correction rejected", {
        description: "The original mark stands, and the request remains in the attendance record.",
      });
    }
  };

  return (
    <Panel className="overflow-hidden">
      <div className="bg-primary/[0.055] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <StatusBadge row={row} />
          <span className="text-xs text-gray-05">{formatDay(row.date, { weekday: "short" })}</span>
        </div>
        <div className="mt-4 flex min-w-0 items-center gap-3">
          <PersonAvatar name={row.student.name} className="size-11 shrink-0" textClassName="text-sm" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-gray-05">
              Attendance correction
            </p>
            {canBrowseStudents ? (
              <Link
                to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student.id)}?tab=attendance`}
                className="block truncate font-mont text-lg font-semibold text-black-01 hover:text-primary hover:underline"
              >
                {row.student.name}
              </Link>
            ) : (
              <p className="truncate font-mont text-lg font-semibold text-black-01">{row.student.name}</p>
            )}
            <p className="truncate text-xs text-gray-05">
              {[row.class_name, row.student.student_number, row.branch?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-border p-4 sm:p-5">
        {(policy.showFromMark || policy.showToMark) && (
          <div className="rounded-md border border-border p-3">
            <MarkChange row={row} policy={policy} />
          </div>
        )}

        <dl className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
          <Detail label="Attendance date" value={formatDay(row.date, { weekday: "long" })} />
          {policy.showRequester && row.requested_by_name && (
            <Detail label="Requested by" value={row.requested_by_name} />
          )}
          {requestedMeta && <Detail label="Requested" value={requestedMeta} />}
          <Detail label="Class" value={row.class_name} />
        </dl>

        {showRequestEvidence && (
          <div className="space-y-3 rounded-md bg-white-05 p-3">
            {policy.showReason && row.reason_label && (
              <Detail label="Reason" value={row.reason_label} />
            )}
            {policy.showNote && row.note && (
              <Detail label="Request note" value={row.note} />
            )}
          </div>
        )}

        {isDecided && showDecisionEvidence && (
          <div className="space-y-3 rounded-md bg-white-05 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-06">Decision</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {policy.showDecider && row.decided_by_name && (
                <Detail label="Decided by" value={row.decided_by_name} />
              )}
              {policy.showDecidedAt && row.decided_at && (
                <Detail label="Decided" value={formatDateTime(row.decided_at)} />
              )}
            </div>
            {policy.showDecisionNote && row.decision_note && (
              <Detail label="Decision note" value={row.decision_note} />
            )}
          </div>
        )}

        {ownRequest && (
          <div className="flex gap-2 rounded-md bg-yellow-01/10 p-3 text-sm text-yellow-01-text">
            <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Another attendance administrator must decide a request you submitted.
          </div>
        )}

        {canDecide && (
          <div className="space-y-3">
            {policy.showDecisionNote && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-black-01">
                  Decision note <span className="font-normal text-gray-05">Optional</span>
                </span>
                {policy.canWriteDecisionNote ? (
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Add a short note for the requester"
                    maxLength={300}
                    rows={3}
                  />
                ) : (
                  <p className="rounded-md bg-white-05 px-3 py-2.5 text-sm text-gray-05">
                    Your role can read decision notes but cannot write them.
                  </p>
                )}
              </label>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="border-destructive/30 text-error-text hover:bg-destructive/5 hover:text-error-text"
                onClick={() => setConfirm("reject")}
                disabled={isLoading}
              >
                <X className="size-4" aria-hidden="true" />
                Reject
              </Button>
              <Button onClick={() => setConfirm("approve")} disabled={isLoading}>
                <Check className="size-4" aria-hidden="true" />
                Approve correction
              </Button>
            </div>
          </div>
        )}

        <Button variant="ghost" className="w-full text-primary" asChild>
          <Link to={routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(row.class_id, row.date)}>
            Open the full register
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <ConfirmDialog
        open={confirm != null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void submit()}
        title={confirm === "approve" ? "Approve this correction?" : "Reject this correction?"}
        body={confirm === "approve"
          ? `The requested mark for ${row.student.name} will replace the recorded mark. The original remains in the register history.`
          : `The recorded mark for ${row.student.name} will stay unchanged. The request and your decision remain in the attendance record.`}
        confirmLabel={confirm === "approve" ? "Approve correction" : "Reject correction"}
        busy={isLoading}
        tone={confirm === "approve" ? "primary" : "destructive"}
      />
    </Panel>
  );
}

function MarkChange({
  row,
  policy,
  compact = false,
}: {
  row: CorrectionRow;
  policy: ReturnType<typeof correctionFieldPolicy>;
  compact?: boolean;
}) {
  const { formatTime } = useSchoolDisplay();
  const showFrom = policy.showFromMark ? row.from_mark : undefined;
  const showTo = policy.showToMark ? row.to_mark : undefined;

  if (!showFrom && !showTo) return null;

  if (compact) {
    return (
      <span className="flex items-center gap-1.5">
        {showFrom && <Badge variant={MARKS[showFrom].badge} className="rounded-full">{MARKS[showFrom].label}</Badge>}
        {showFrom && showTo && <ArrowRight className="size-3.5 text-gray-05" aria-hidden="true" />}
        {showTo && <Badge variant={MARKS[showTo].badge} className="rounded-full">{MARKS[showTo].label}</Badge>}
      </span>
    );
  }

  if (!showFrom) {
    if (!showTo) return null;
    return (
      <MarkBox
        label="Requested mark"
        mark={showTo}
        detail={showTo === "L" && policy.showArrivedAt && row.arrived_at ? `Arrived ${formatTime(row.arrived_at)}` : undefined}
      />
    );
  }

  if (!showTo) return <MarkBox label="Recorded mark" mark={showFrom} />;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <MarkBox label="Recorded mark" mark={showFrom} />
      <ArrowRight className="size-4 shrink-0 text-gray-05" aria-label="changes to" />
      <MarkBox
        label="Requested mark"
        mark={showTo}
        detail={showTo === "L" && policy.showArrivedAt && row.arrived_at ? `Arrived ${formatTime(row.arrived_at)}` : undefined}
      />
    </div>
  );
}

function MarkBox({
  label,
  mark,
  detail,
}: {
  label: string;
  mark: keyof typeof MARKS;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-05">{label}</p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge variant={MARKS[mark].badge} className="rounded-full">{MARKS[mark].label}</Badge>
        {detail && <span className="text-[11px] text-gray-05">{detail}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ row }: { row: CorrectionRow }) {
  if (row.status === "APPROVED") {
    return <Badge variant="active" className="rounded-full"><Check className="size-3" />Approved</Badge>;
  }
  if (row.status === "REJECTED") {
    return <Badge variant="rejected" className="rounded-full"><X className="size-3" />Rejected</Badge>;
  }
  return <Badge variant="pending" className="rounded-full"><Clock3 className="size-3" />Pending</Badge>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-05">{label}</dt>
      <dd className="mt-1 break-words text-sm text-black-01">{value}</dd>
    </div>
  );
}

function ClipboardEmptyState({ status }: { status: QueueTab }) {
  return (
    <span className="mx-auto grid size-10 place-content-center rounded-full bg-white-05 text-gray-05">
      {status === "pending"
        ? <Clock3 className="size-4" aria-hidden="true" />
        : <CheckCircle2 className="size-4" aria-hidden="true" />}
    </span>
  );
}
