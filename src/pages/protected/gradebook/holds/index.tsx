import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  RefreshCw,
  Search,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFieldAccess } from "@/components/finance-ui";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { useGetHoldsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { HoldRow } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";
import { formatKoboAsNaira } from "@/utils/user-facing-message";

import { HoldDrawer } from "./hold-drawer";

type LedgerView = "attention" | "all";

/**
 * Fee holds: a focused ledger for the students on this term's class rolls.
 *
 * The ledger opens on families who owe and anyone already held, then widens
 * to the whole roll through the shared sliding control. Selecting a student
 * brings the Finance context, current hold and permitted action into one
 * panel. Page summaries say "on this page" where the API only returns the
 * current page, so a partial result set is never presented as a school total.
 *
 * Balances are context for a person's decision, read from Finance at the time
 * shown; no result is ever held automatically. When Finance cannot answer,
 * every balance is blank rather than zero and the whole roll is listed.
 *
 * A reader with the holds key reads; Hold result and Lift hold need the
 * manage key. A released result cannot be held. No mark appears here.
 *
 * Field Access: balance, oldest unpaid and the finance-derived summary cards
 * share the existing balance Read choice. Hiding it also removes the as-of
 * line and the needs-attention filter, because that filter would reveal who
 * owes. Hold reason and lift note follow their existing shared choice; a role
 * that may not write it cannot place a hold.
 */
export default function FeeHoldsPage() {
  const { branch } = useBranchLens();
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_HOLD);
  const { formatDateTime } = useSchoolDisplay();
  const showsBalance = !access.isHidden("balance");
  const [view, setView] = useState<LedgerView>("attention");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [acting, setActing] = useState<HoldRow | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const settled = useDebounce(search);
  const owes = showsBalance && view === "attention";

  const { data, isLoading, isFetching, isError, error, refetch } = useGetHoldsQuery({
    branch,
    owes,
    classId: classId ? Number(classId) : undefined,
    search: settled,
    page,
  });
  const status = parseApiError(error).status;
  const rows = data?.data ?? [];
  const selected = rows.find((row) => row.student.id === selectedStudentId) ?? rows[0] ?? null;
  const mayAct = hasPermission(P.MANAGE_RESULT_HOLDS);
  const mayHold = mayAct && !access.isReadOnly("reason");
  const financeDown = data?.finance_available === false;
  const filtering = !!(classId || settled.trim());
  const heldHere = rows.filter((row) => row.hold).length;
  const owingHere = showsBalance ? rows.filter((row) => (row.balance ?? 0) > 0).length : 0;
  const visibleBalance = showsBalance
    ? rows.reduce((total, row) => total + Math.max(row.balance ?? 0, 0), 0)
    : 0;

  useEffect(() => {
    if (!selectedStudentId || !window.matchMedia?.("(max-width: 1023px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedStudentId]);

  const narrow = (apply: () => void) => {
    apply();
    setPage(1);
    setSelectedStudentId(null);
  };

  const emptyText = filtering
    ? "No student matches these filters."
    : showsBalance && owes && !financeDown
      ? "No family owes anything and no result is held."
      : "No student is on a class roll this term.";

  return (
    <PageShell className="content-start gap-4" grid>
      <PageHeader
        title="Fee holds"
        description={
          <>
            {showsBalance && data?.as_of && !financeDown
              ? `Students in ${data.term.name}'s classes. Finance was read as of ${formatDateTime(data.as_of)}. `
              : "Students in this term's classes. "}
            Balances guide a person&apos;s decision; no result is ever held automatically.
          </>
        }
        actions={showsBalance ? (
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} aria-hidden="true" />
            Refresh Finance
          </Button>
        ) : undefined}
      />

      {status === 403 ? (
        <OutlinedNotice
          icon={Wallet}
          title="Fee holds are not yours to open"
          body="Holding a result over fees belongs to the people the school gives it to, usually the bursar."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={Wallet}
          title="We could not load the fee holds"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !data ? (
        <Skeleton className="h-72 w-full rounded-md" />
      ) : (
        <>
          <section
            className={cn("grid grid-cols-2 gap-2.5", showsBalance && !financeDown && "lg:grid-cols-4")}
            aria-label="Fee hold summary"
          >
            <Metric
              label={owes ? "Needs attention" : "Students listed"}
              value={data.pagination.totalItems}
              foot={owes ? "Owes or currently held" : "Across the filtered roll"}
              tone={owes && data.pagination.totalItems > 0 ? "warn" : "default"}
            />
            <Metric
              label="Results held"
              value={heldHere}
              foot={data.pagination.totalPages > 1 ? "On this page" : "In this list"}
              tone={heldHere ? "warn" : "default"}
            />
            {showsBalance && !financeDown && (
              <>
                <Metric
                  label="Families owing"
                  value={owingHere}
                  foot={data.pagination.totalPages > 1 ? "On this page" : "In this list"}
                  className="max-sm:col-span-2"
                />
                <Metric
                  label="Outstanding shown"
                  value={formatKoboAsNaira(visibleBalance)}
                  foot={data.pagination.totalPages > 1 ? "On this page" : "In this list"}
                  className="max-sm:col-span-2"
                />
              </>
            )}
          </section>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-64 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" aria-hidden="true" />
              <Input
                value={search}
                aria-label="Search by name or admission number"
                placeholder="Search by name or admission number"
                className="pl-9"
                onChange={(event) => narrow(() => setSearch(event.target.value))}
              />
            </div>
            <div className="w-full sm:w-52">
              <NativeSelect
                aria-label="Class"
                value={classId}
                onChange={(event) => narrow(() => setClassId(event.target.value))}
              >
                <option value="">All classes</option>
                {data.classes.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {showsBalance && !financeDown && (
              <div className="max-w-full overflow-x-auto pb-1 sm:ml-auto">
                <SegmentedToggle
                  ariaLabel="Fee hold list"
                  value={view}
                  options={[
                    { value: "attention", label: "Needs attention" },
                    { value: "all", label: "Whole roll" },
                  ]}
                  onChange={(next) => narrow(() => setView(next))}
                />
              </div>
            )}
          </div>

          {showsBalance && financeDown && (
            <div role="status" className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#854F0B]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Finance cannot answer right now, so no balance is shown and every student is listed. Holds can still be
                placed and lifted.
              </span>
            </div>
          )}

          {rows.length === 0 ? (
            <Panel as="section" className="grid min-h-56 place-items-center p-5 text-center text-sm text-gray-06">
              {emptyText}
            </Panel>
          ) : (
            <section
              className={cn(
                "grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]",
                isFetching && "opacity-60",
              )}
              aria-label="Fee hold ledger"
              aria-busy={isFetching}
            >
              <Panel as="section" className="overflow-hidden">
                <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3.5 py-3">
                  <div className="min-w-0">
                    <h2 className="font-mont text-sm font-semibold text-black-01">Students</h2>
                    <p className="mt-0.5 text-xs text-gray-06">Choose a student to review the balance and hold.</p>
                  </div>
                  <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold tabular-nums text-gray-06">
                    {data.pagination.totalItems}
                  </span>
                </div>
                <ul className="max-h-[34rem] overflow-y-auto overscroll-contain">
                  {rows.map((row) => (
                    <LedgerRowButton
                      key={row.student.id}
                      row={row}
                      showsBalance={showsBalance && !financeDown}
                      active={selected?.student.id === row.student.id}
                      onOpen={() => setSelectedStudentId(row.student.id)}
                    />
                  ))}
                </ul>
                <LedgerPagination
                  page={data.pagination.currentPage}
                  pages={data.pagination.totalPages}
                  onPageChange={(next) => {
                    setPage(next);
                    setSelectedStudentId(null);
                  }}
                />
              </Panel>

              {selected && (
                <div ref={detailRef} className="min-w-0 scroll-mt-20">
                  <HoldDetail
                    row={selected}
                    showsBalance={showsBalance && !financeDown}
                    mayAct={mayAct}
                    mayHold={mayHold}
                    asOf={showsBalance && !financeDown ? data.as_of : undefined}
                    onAct={() => setActing(selected)}
                  />
                </div>
              )}
            </section>
          )}
        </>
      )}

      {acting && data && <HoldDrawer row={acting} term={data.term.id} onClose={() => setActing(null)} />}
    </PageShell>
  );
}

function Metric({
  label,
  value,
  foot,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  foot: string;
  tone?: "default" | "warn";
  className?: string;
}) {
  return (
    <Panel className={cn("space-y-1.5 px-3.5 py-3", tone === "warn" && "border-amber-200 bg-amber-50", className)}>
      <p className="text-xs font-medium text-gray-06">{label}</p>
      <p className={cn("break-words font-mont text-xl font-semibold text-black-01", tone === "warn" && "text-amber-700")}>
        {value}
      </p>
      <p className="text-xs text-gray-06">{foot}</p>
    </Panel>
  );
}

function LedgerRowButton({
  row,
  showsBalance,
  active,
  onOpen,
}: {
  row: HoldRow;
  showsBalance: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  const { formatDate } = useSchoolDisplay(row.branch?.id ?? null);
  const unpaid = oldestUnpaidLabel(row, formatDate);

  return (
    <li className={cn("border-b border-border last:border-b-0", active && "bg-pry-01/40")}>
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={onOpen}
        className="group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left transition-all ease-linear hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[minmax(10rem,1.2fr)_minmax(7rem,.75fr)_auto_auto]"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-black-01">{row.student.name}</span>
          <span className="mt-0.5 block truncate text-xs text-gray-06">
            {[row.student.admission_number, row.class.name, row.branch?.name].filter(Boolean).join(" · ")}
          </span>
        </span>
        {showsBalance && (
          <span className="min-w-0 max-sm:col-start-1">
            <span className="block truncate text-sm font-semibold text-amber-700">
              {row.balance === null || row.balance === undefined ? "Finance did not answer" : formatKoboAsNaira(row.balance)}
            </span>
            <span className="mt-0.5 block truncate text-xs text-gray-06">{unpaid}</span>
          </span>
        )}
        <span className={cn("max-sm:col-start-1", !showsBalance && "sm:col-start-3")}>
          <Badge variant={row.hold ? "pending" : "success"} className="rounded-full text-xs">
            {row.hold ? "Held" : "Not held"}
          </Badge>
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 max-sm:col-start-2 max-sm:row-start-1 max-sm:row-span-3" aria-hidden="true" />
      </button>
    </li>
  );
}

function HoldDetail({
  row,
  showsBalance,
  mayAct,
  mayHold,
  asOf,
  onAct,
}: {
  row: HoldRow;
  showsBalance: boolean;
  mayAct: boolean;
  mayHold: boolean;
  asOf?: string;
  onAct: () => void;
}) {
  const { formatDate, formatDateTime } = useSchoolDisplay(row.branch?.id ?? null);
  const holdBy = row.hold
    ? [row.hold.placed_by ? `by ${row.hold.placed_by}` : null, formatDate(row.hold.placed_at)].filter(Boolean).join(" · ")
    : "";

  return (
    <Panel as="section" className="space-y-3 p-4 lg:sticky lg:top-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-mont text-base font-semibold text-black-01">{row.student.name}</h2>
          <p className="mt-0.5 text-xs text-gray-06">
            {[row.student.admission_number, row.class.name, row.branch?.name].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge variant={row.hold ? "pending" : "success"} className="rounded-full text-xs">
          {row.hold ? "Held" : "Not held"}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {showsBalance && (
          <>
            <DetailFact
              label="Balance from Finance"
              value={row.balance === null || row.balance === undefined ? "Finance did not answer" : formatKoboAsNaira(row.balance)}
            />
            <DetailFact label="Oldest unpaid" value={oldestUnpaidLabel(row, formatDate)} />
          </>
        )}
        <DetailFact label="Class" value={row.class.name} />
        <DetailFact label="Result status" value={row.released ? "Released" : "Not released"} />
      </dl>

      {row.hold ? (
        <div className="flex gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="block">Held {holdBy}</strong>
            {row.hold.reason && <span className="block">{row.hold.reason}</span>}
          </span>
        </div>
      ) : (
        <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
          No hold is active. A person must decide whether to hold this result.
        </p>
      )}

      {asOf && <p className="text-xs text-gray-06">Finance as of {formatDateTime(asOf)}. Refresh to read it again.</p>}

      {row.released ? (
        <p className="text-xs leading-5 text-gray-06">
          Released{row.released_on ? ` on ${formatDate(row.released_on)}` : ""}; a released result cannot be held.
        </p>
      ) : mayAct && (row.hold || mayHold) ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button size="sm" variant={row.hold ? "outline" : "default"} onClick={onAct}>
            {row.hold ? "Lift hold" : "Hold result"}
          </Button>
        </div>
      ) : null}
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

function LedgerPagination({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3.5 py-3" aria-label="Student list pages">
      <p className="text-xs text-gray-06">Page {page} of {pages}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

function oldestUnpaidLabel(row: HoldRow, formatDate: (value: string) => string) {
  if (!row.oldest_unpaid_on) return "No unpaid bill";
  if (row.days_owed) return row.days_owed === 1 ? "1 day overdue" : `${row.days_owed} days overdue`;
  return `Due ${formatDate(row.oldest_unpaid_on)}`;
}
