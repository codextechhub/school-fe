import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Archive,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronRight,
  CircleCheck,
  CopyPlus,
  LayoutGrid,
  Pencil,
  Plus,
  Rows3,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import PromptModal from "@/components/modal/prompt-modal";
import CustomTable from "@/components/custom/custom-table";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { cn, formatMonthYearShort } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { useBranchLens } from "@/hooks/use-branch-lens";
import {
  useActivateSessionMutation,
  useArchiveSessionMutation,
  useGetAcademicOverviewQuery,
  useGetSessionsQuery,
} from "@/redux/services/academics/academics-api";
import type {
  AcademicSession,
  OverviewSession,
  SessionStatus,
} from "@/redux/services/academics/academics-types";
import { ExportButton } from "@/components/custom/export-button";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { SessionDrawer } from "./session-drawer";
import { RollForwardDialog } from "./roll-forward-dialog";
import { CardActions, ClickableCard, Panel } from "@/components/custom/surface";
import { SessionStatusChip } from "./session-chips";
import {
  scopeOf,
  statusOf,
  teachingWeeks,
  termState,
} from "./session-format";
import { PageShell } from "@/components/layout/page-shell";
import { useActionParam } from "@/hooks/use-action-param";
import { canManageRow } from "@/lib/can-manage";
import { useReaderReach } from "@/hooks/use-reader-reach";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { useSchoolWords } from "@/hooks/use-school-words";

/**
 * The school years this school has defined.
 *
 * The card carries name, dates, status and term pills with their tick and
 * their "· ongoing", from the API rather than a local array.
 *
 * The footer deliberately does not read "3 branches · 1,284 students · 16
 * classes". There is no student model in the product, and a class count is only
 * true of the year that is RUNNING, so printing this year's classes under last
 * year's name is a quiet lie.
 *
 * So the footer states the session's own shape, which every card can answer
 * honestly: how many terms, and how many teaching weeks.
 */
export default function AcademicSessions() {
  const navigate = useNavigate();
  const { branch } = useBranchLens();
  // Where a year applies is only said to a reader who works across branches.
  const { multiBranch } = useAcademicsLens();
  const words = useSchoolWords();
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SessionStatus | "all">("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);

  const [drawerFor, setDrawerFor] = useState<AcademicSession | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [seedFor, setSeedFor] = useState<AcademicSession | null>(null);

  const { data, isLoading, isError, refetch } = useGetSessionsQuery({
    branch,
    search,
    status,
    page,
  });
  const { data: overviewData, isLoading: overviewLoading } =
    useGetAcademicOverviewQuery({ branch });

  const [activate, { isLoading: activating }] = useActivateSessionMutation();
  const [archive, { isLoading: archiving }] = useArchiveSessionMutation();

  const sessions = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;
  const activeSession = overviewData?.data.active_session;
  const activeName = activeSession?.name ?? sessions.find((s) => s.status === "ACTIVE")?.name;

  const canEdit = hasPermission(P.MODIFY_SESSION);
  // The copy WRITES structure, so it answers to the structure key the server
  // checks, not to "may edit this session".
  const canSeed = hasPermission(P.CREATE_STRUCTURE);
  const canActivate = hasPermission(P.ACTIVATE_SESSION);
  const canArchive = hasPermission(P.ARCHIVE_SESSION);

  const openNew = () => {
    setDrawerFor(null);
    setDrawerOpen(true);
  };
  // "Add a session" from the search box, on the Add button's own key.
  useActionParam("new", hasPermission(P.CREATE_SESSION), openNew);
  const openEdit = (session: AcademicSession) => {
    setDrawerFor(session);
    setDrawerOpen(true);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    try {
      const result =
        confirm.kind === "activate"
          ? await activate(confirm.session.id).unwrap()
          : await archive(confirm.session.id).unwrap();
      toast.success(result.message);
    } catch {
      // Toasted centrally.
    }
    setConfirm(null);
  };

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={CalendarRange}
          title="We could not load your sessions"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <SessionSummary
        session={activeSession}
        loading={overviewLoading}
      />

      {/* flex-wrap, so the toolbar stacks on a phone instead of squeezing the
          search box to nothing. */}
      <div data-guide="sessions.toolbar" className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1 basis-52">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search sessions"
            aria-label="Search sessions"
            className="h-9 w-full rounded-full border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SessionStatus | "all");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-9 shrink-0 rounded-full border border-white-02 bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <SegmentedToggle
          ariaLabel="Session view"
          value={view}
          onChange={setView}
          options={[
            { value: "cards", label: "Cards", icon: LayoutGrid },
            { value: "table", label: "Table", icon: Rows3 },
          ]}
        />

        <ExportButton
          screen="academics.sessions"
          params={{ search, status, branch: branch === "all" ? undefined : branch }}
        />

        <PermissionGate permission={P.CREATE_SESSION}>
          <Button data-guide="sessions.new" className="shrink-0 text-sm" onClick={openNew}>
            <Plus /> New session
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-md" />
          ))}
        </div>
      ) : !sessions.length ? (
        <OutlinedNotice
          icon={CalendarRange}
          title={
            search || status !== "all"
              ? "No sessions match that"
              : "No academic sessions yet"
          }
          body={
            search || status !== "all"
              ? "Try a different search, or clear the status filter."
              : "The academic structure hangs off a school year. Create one, then make it active."
          }
          actionLabel={search || status !== "all" ? "Clear filters" : undefined}
          onAction={
            search || status !== "all"
              ? () => {
                  setSearch("");
                  setStatus("all");
                  setPage(1);
                }
              : undefined
          }
        />
      ) : view === "cards" ? (
        <div data-guide="sessions.list" className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              canEdit={canEdit}
              canActivate={canActivate}
              canArchive={canArchive}
              onOpen={() =>
                navigate(
                  routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSION_DETAILS_ID(
                    session.id,
                  ),
                )
              }
              onEdit={() => openEdit(session)}
              onActivate={() => setConfirm({ kind: "activate", session })}
              canSeed={canSeed}
              onSeed={() => setSeedFor(session)}
              onArchive={() => setConfirm({ kind: "archive", session })}
            />
          ))}
        </div>
      ) : (
        <CustomTable
          tableHeaderList={[
            "Session", "Starts", "Ends", words.Terms,
            ...(multiBranch ? ["Scope"] : []),
            "Status",
          ]}
          // Display fields only, in header order. The raw sessions go through
          // `defaultBodyList`, which is what onRowClick receives.
          defaultBodyList={sessions}
          tableBodyList={sessions.map((s) => ({
            Session: s.name,
            Starts: formatMonthYearShort(s.start_date),
            Ends: formatMonthYearShort(s.end_date),
            [words.Terms]: String(s.term_count),
            ...(multiBranch ? { Scope: scopeOf(s) } : {}),
            Status: statusOf(s.status).label,
          }))}
          onRowClick={(row: AcademicSession) =>
            navigate(
              routesPath.PROTECTED.ACADEMIC_STRUCTURE.SESSION_DETAILS_ID(row.id),
            )
          }
          currentPage={pagination?.currentPage ?? 1}
          totalPage={pagination?.totalPages ?? 1}
          onPageChange={(next) => setPage(Number(next) || 1)}
          emptyText="No sessions"
        />
      )}

      {view === "cards" && (pagination?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-05">
          <span>
            Page {pagination?.currentPage} of {pagination?.totalPages}
          </span>
          <div className="inline-flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!pagination?.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!pagination?.next}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <RollForwardDialog
        target={seedFor}
        open={!!seedFor}
        onClose={() => setSeedFor(null)}
      />

      <SessionDrawer
        open={drawerOpen}
        session={drawerFor}
        onClose={() => setDrawerOpen(false)}
      />

      <PromptModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={activating || archiving}
        canCancel
        title={confirmTitle(confirm)}
        description={confirmBody(confirm, activeName)}
        onConfirmText={confirm?.kind === "activate" ? "Set as active" : "Archive session"}
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
        onConfirmClass={
          confirm?.kind === "archive"
            ? "bg-error-01 text-white shadow-xs hover:bg-error-01/90 focus-visible:ring-error-01/20"
            : undefined
        }
      />
    </PageShell>
  );
}

function SessionSummary({
  session,
  loading,
}: {
  session?: OverviewSession | null;
  loading: boolean;
}) {
  const words = useSchoolWords();
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[74px] rounded-md" />
        ))}
      </div>
    );
  }

  const ongoing = session?.terms.filter((term) => term.state === "ongoing").length ?? 0;
  const terms = session?.terms.length ?? 0;
  const weeks = teachingWeeks(session?.terms ?? []);
  const cards = [
    {
      label: "Active session",
      value: session?.name ?? "Not set",
      icon: CalendarRange,
      tone: "bg-primary/10 text-primary",
      marker: !!session,
    },
    {
      label: `${words.Terms} running`,
      value: `${ongoing} of ${terms}`,
      icon: BookOpenCheck,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      label: "Teaching weeks",
      value: `${weeks} ${weeks === 1 ? "week" : "weeks"}`,
      icon: CalendarDays,
      tone: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <section data-guide="sessions.summary" className="grid gap-3 sm:grid-cols-3" aria-label="Session summary">
      {cards.map((card) => (
        <Panel key={card.label} className="flex min-w-0 items-center gap-3 px-4 py-3">
          <span className={cn("grid size-10 shrink-0 place-content-center rounded-md", card.tone)}>
            <card.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-05">{card.label}</p>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <p className="truncate text-lg font-semibold leading-tight text-black-01">
                {card.value}
              </p>
              {card.marker && <span className="size-2 shrink-0 rounded-full bg-green-01" />}
            </div>
          </div>
        </Panel>
      ))}
    </section>
  );
}

// ── The confirmations ───────────────────────────────────────────────────────

type Confirmation = { kind: "activate" | "archive"; session: AcademicSession };

function confirmTitle(confirm: Confirmation | null) {
  if (!confirm) return "";
  return confirm.kind === "activate"
    ? `Make ${confirm.session.name} the active session?`
    : `Archive ${confirm.session.name}?`;
}

/**
 * What the school is actually agreeing to.
 *
 * Both of these are stated in consequences rather than in verbs, because both
 * reach further than the row they are pressed on: activating one year archives
 * another, and archiving the live one leaves the school with no active year at
 * all until it sets one.
 */
function confirmBody(confirm: Confirmation | null, activeName?: string) {
  if (!confirm) return "";
  if (confirm.kind === "activate") {
    return activeName && activeName !== confirm.session.name
      ? `Only one session can be active at a time, so ${activeName} will stop being active. Everything built on top of a session follows the active one.`
      : "Everything built on top of a session follows the active one.";
  }
  return confirm.session.status === "ACTIVE"
    ? "This is your active session. Everything later built on a session depends on it, and archiving leaves the school with no active session until you set another one."
    : "An archived session becomes read-only history. You can still open it, but nothing in it can be changed.";
}

// ── The card ────────────────────────────────────────────────────────────────

function SessionCard({
  session,
  canEdit,
  canActivate,
  canArchive,
  onOpen,
  onEdit,
  onActivate,
  onArchive,
  canSeed,
  onSeed,
}: {
  session: AcademicSession;
  canEdit: boolean;
  canActivate: boolean;
  canArchive: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onArchive: () => void;
  canSeed: boolean;
  onSeed: () => void;
}) {
  const isActive = session.status === "ACTIVE";
  const archived = session.status === "ARCHIVED";
  // A year shared beyond the viewer's branches is theirs to read, not change.
  const mine = canManageRow(session);
  const { wholeSchool } = useReaderReach();
  const { multiBranch } = useAcademicsLens();
  const words = useSchoolWords();
  const weeks = teachingWeeks(session.terms);
  // An archived year is read-only on the server, so its Edit is not offered
  // rather than offered and refused.
  const editable = canEdit && mine;
  // Copying a year in copies shared structure, which only a whole-school
  // administrator may create.
  const seedable = canSeed && mine && wholeSchool;
  const activatable = canActivate && mine;
  const archivable = canArchive && mine;
  const showMenu = ((editable || seedable) && !archived) || activatable || archivable;

  return (
    <ClickableCard
      label={`Open ${session.name}`}
      onOpen={onOpen}
      // The live year keeps its green edge, which outranks the shared hairline.
      className={cn(isActive && "border-green-01 hover:border-green-01")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="truncate text-base font-semibold text-black-01">
              {session.name}
            </h5>
            <SessionStatusChip status={session.status} />
          </div>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-05">
            <CalendarRange className="size-3.5 shrink-0" />
            {formatMonthYearShort(session.start_date)} -{" "}
            {formatMonthYearShort(session.end_date)}
          </p>
        </div>

        <CardActions className="inline-flex shrink-0 items-start">
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${session.name}`}
                  className="grid size-6 place-content-center rounded-full text-gray-06 hover:bg-gray-04"
                >
                  <span className="text-lg leading-none">⋯</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {editable && !archived && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="size-4" />
                    Edit session
                  </DropdownMenuItem>
                )}
                {activatable && !isActive && (
                  <DropdownMenuItem onClick={onActivate}>
                    <CircleCheck className="size-4" />
                    Set as active
                  </DropdownMenuItem>
                )}
                {seedable && !archived && (
                  <DropdownMenuItem onClick={onSeed}>
                    <CopyPlus className="size-4" />
                    Copy structure in
                  </DropdownMenuItem>
                )}
                {archivable && !archived && (
                  <DropdownMenuItem variant="destructive" onClick={onArchive}>
                    <Archive className="size-4" />
                    Archive
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardActions>
      </div>

      <div className="mt-4 grid gap-2" aria-label={`${session.name} ${words.terms}`}>
        <div className="flex items-center justify-between gap-2">
          {session.terms.map((term, index) => {
            const state = termState(term);
            return (
              <div key={term.id} className="flex min-w-0 flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-content-center rounded-full border text-[9px] font-semibold",
                    state === "completed" && "border-green-01 bg-green-01 text-white",
                    state === "ongoing" && "border-yellow-01 bg-yellow-01/10 text-yellow-01-text",
                    state === "pending" && "border-white-02 text-gray-05",
                  )}
                >
                  {state === "completed" ? <Check className="size-3" /> : index + 1}
                </span>
                <span className="truncate text-[11px] font-medium text-gray-06">
                  {words.Term.charAt(0)}
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          {session.terms.map((term) => {
            const state = termState(term);
            return (
              <span
                key={term.id}
                className={cn(
                  "h-1 min-w-0 flex-1 rounded-full",
                  state === "completed" && "bg-green-01",
                  state === "ongoing" && "bg-yellow-01",
                  state === "pending" && "bg-gray-02/60",
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t border-white-02 pt-3">
        <div className="min-w-0 text-xs text-gray-05">
          {multiBranch && <p className="truncate">{scopeOf(session)}</p>}
          <p className="mt-0.5 font-medium text-gray-01">
            {weeks} teaching {weeks === 1 ? "week" : "weeks"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
          View details
          <ChevronRight className="size-3.5" />
        </span>
      </div>
    </ClickableCard>
  );
}
