import { useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  ListTree,
  Pencil,
  Plus,
  Rows3,
  Search,
  School,
  Signpost,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import PromptModal from "@/components/modal/prompt-modal";
import PermissionGate from "@/components/custom/permission-gate";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/utils/api-error";
import {
  useCreateLevelMutation,
  useCreateProgramMutation,
  useArchiveLevelMutation,
  useRestoreLevelMutation,
  useArchiveProgramMutation,
  useRestoreProgramMutation,
  useGetAcademicOverviewQuery,
  useGetDepartmentsQuery,
  useGetProgramsQuery,
  useUpdateLevelMutation,
  useUpdateProgramMutation,
} from "@/redux/services/academics/academics-api";
import type {
  AcademicOverview,
  EntityWrite,
  Level,
  Program,
} from "@/redux/services/academics/academics-types";
import {
  CardActions,
  ClickableCard,
  Panel,
} from "@/components/custom/surface";
import { BulkLevelsDrawer } from "./bulk-levels-drawer";
import { EntityDrawer } from "../components/entity-drawer";
import { ExportButton } from "@/components/custom/export-button";
import { EmptyYear } from "@/pages/protected/academics/components/empty-year";
import {
  PromotionPicker,
  type Promotion,
  promotionBody,
  promotionOf,
} from "./promotion-picker";
import { blankDraft, type EntityDraft } from "../components/entity-draft";
import { ScopeCell } from "../components/scope-cell";
import { PageShell } from "@/components/layout/page-shell";
import { useActionParam } from "@/hooks/use-action-param";

/**
 * Programmes, and the levels inside them.
 *
 * An accordion rather than two screens, because a level means nothing without
 * its programme - "Year 1" is a different thing inside Nursery and inside
 * Primary, and the database says so: a level's name is unique within its
 * programme, not across the school. The API nests the levels in the programme
 * for the same reason, so drawing this page costs one request rather than one
 * per programme.
 *
 * This is the first screen where scope is INHERITED. A level inside a
 * branch-only programme cannot be school-wide - it would be visible where its
 * own parent is not - so its drawer states the branch and says why, rather than
 * offering a choice the server would refuse.
 */
export default function Programs() {
  const { lens, branch, multiBranch, readOnlyYear } = useAcademicsLens();
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [page, setPage] = useState(1);

  const [programDrawer, setProgramDrawer] = useState<Program | null | "new">(null);
  const [deptChoice, setDeptChoice] = useState<number | null>(null);
  const [lastDrawer, setLastDrawer] = useState<string | number>("shut");
  const [levelDrawer, setLevelDrawer] = useState<
    { program: Program; level: Level | null } | null
  >(null);
  // Lifted out of the drawer, so where a level promotes to travels in the same
  // save as its name. See PromotionPicker for why "not set" is an option
  // rather than an absence.
  const [promotion, setPromotion] = useState<Promotion>({ kind: "unset" });
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  // Without this an archived programme is unreachable, and archive becomes a
  // delete with extra steps.
  const [showArchived, setShowArchived] = useState<"true" | "false" | "all">("true");
  const [bulkFor, setBulkFor] = useState<Program | null>(null);

  const { data, isLoading, isError, refetch } = useGetProgramsQuery({
    ...lens,
    search,
    is_active: showArchived,
    page,
  });
  const { data: deptData } = useGetDepartmentsQuery({ branch });
  const { data: overviewData, isLoading: overviewLoading } =
    useGetAcademicOverviewQuery(lens);

  const [createProgram, { isLoading: cp }] = useCreateProgramMutation();
  const [updateProgram, { isLoading: up }] = useUpdateProgramMutation();
  const [archiveProgram, { isLoading: dp }] = useArchiveProgramMutation();
  const [restoreProgram] = useRestoreProgramMutation();
  const [createLevel, { isLoading: cl }] = useCreateLevelMutation();
  const [updateLevel, { isLoading: ul }] = useUpdateLevelMutation();
  const [archiveLevel, { isLoading: dl }] = useArchiveLevelMutation();
  const [restoreLevel] = useRestoreLevelMutation();

  const programs = useMemo(() => data?.data ?? [], [data]);
  // Every programme empty, and not because of a search: the year has not
  // been started. One level anywhere disproves it. Empty programmes still
  // list, showing zero - a programme has no year of its own to be absent
  // from.
  const filtered = !!search || showArchived !== "true";
  const noLevelsThisYear =
    !filtered && programs.length > 0 && programs.every((p) => !p.levels?.length);
  const pagination = data?.pagination;
  const departments = useMemo(() => deptData?.data ?? [], [deptData]);

  // The server refuses every write into an archived year, so an Edit here
  // would only answer 409.
  const canEdit = hasPermission(P.MODIFY_STRUCTURE) && !readOnlyYear;
  const canCreate = hasPermission(P.CREATE_STRUCTURE) && !readOnlyYear;
  const canArchive = hasPermission(P.ARCHIVE_STRUCTURE) && !readOnlyYear;
  const canRestore = hasPermission(P.REACTIVATE_STRUCTURE) && !readOnlyYear;

  // "Add a programme" from the search box. `canCreate` is CREATE_STRUCTURE and
  // the read-only year, which is exactly what wraps the Add button.
  useActionParam("new", canCreate, () => setProgramDrawer("new"));

  // One place the row's wiring is written, so the two lists below cannot
  // drift apart in what a row can do.
  const rowProps = (program: Program) => ({
    program,
    open: !!open[program.id],
    multiBranch,
    canEdit,
    canCreate,
    canArchive,
    canRestore,
    onToggle: () => setOpen((o) => ({ ...o, [program.id]: !o[program.id] })),
    onEdit: () => setProgramDrawer(program),
    onArchive: () =>
      setConfirm({
        kind: program.is_active ? ("archiveProgram" as const) : ("restoreProgram" as const),
        program,
      }),
    onAddLevel: () => openLevelDrawer(program, null),
    onBulkLevels: () => setBulkFor(program),
    onEditLevel: (level: Level) => openLevelDrawer(program, level),
    onArchiveLevel: (level: Level) =>
      setConfirm({
        kind: level.is_active ? ("archiveLevel" as const) : ("restoreLevel" as const),
        program,
        level,
      }),
  });


  const allOpen = programs.length > 0 && programs.every((p) => open[p.id]);
  const toggleAll = () =>
    setOpen(
      allOpen
        ? {}
        : programs.reduce<Record<number, boolean>>((acc, p) => {
            acc[p.id] = true;
            return acc;
          }, {}),
    );

  const saveProgram = async (body: EntityWrite) => {
    const editing = programDrawer !== "new" ? programDrawer : null;
    const result = editing
      ? await updateProgram({ id: editing.id, ...body }).unwrap()
      : await createProgram(body).unwrap();
    toast.success(result.message);
  };

  const saveLevel = async (body: EntityWrite) => {
    if (!levelDrawer) return;
    const { program, level } = levelDrawer;
    const result = level
      ? await updateLevel({ id: level.id, ...body }).unwrap()
      : await createLevel({ program: program.id, ...body }).unwrap();
    toast.success(result.message);
  };

  const openLevelDrawer = (program: Program, level: Level | null) => {
    setPromotion(promotionOf(level));
    setLevelDrawer({ program, level });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const run = {
      archiveProgram: () => archiveProgram(confirm.program.id),
      restoreProgram: () => restoreProgram(confirm.program.id),
      archiveLevel: () => archiveLevel((confirm as LevelConfirmation).level.id),
      restoreLevel: () => restoreLevel((confirm as LevelConfirmation).level.id),
    }[confirm.kind];
    try {
      const result = await run().unwrap();
      toast.success(result.message);
    } catch (error) {
      toast.error(parseApiError(error).message || "That could not be done.");
    }
    setConfirm(null);
  };

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={ListTree}
          title="We could not load your programmes"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  const editingProgram = programDrawer !== "new" ? programDrawer : null;
  const drawerKey = programDrawer === null ? "shut" : (editingProgram?.id ?? "new");

  return (
    <PageShell className="content-start gap-5" grid>
      {/* Adjusted during render, not in an effect - the select must already
          hold the programme's department on the first paint. */}
      {(() => {
        const want = editingProgram?.department ?? null;
        if (programDrawer !== null && lastDrawer !== drawerKey) {
          setLastDrawer(drawerKey);
          setDeptChoice(want);
        }
        return null;
      })()}

      <ProgrammeSummary
        counts={overviewData?.data.counts}
        loading={overviewLoading}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1 basis-52">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search programmes and levels"
            aria-label="Search programmes"
            className="h-9 w-full rounded-full border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <select
          value={showArchived}
          onChange={(e) => {
            setShowArchived(e.target.value as "true" | "false" | "all");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-9 shrink-0 rounded-full border border-white-02 bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
          <option value="all">All statuses</option>
        </select>

        <Button
          size="sm"
          variant="outline"
          className="h-9 shrink-0 rounded-full border-primary text-primary"
          onClick={toggleAll}
          disabled={!programs.length}
        >
          <Rows3 className="size-3.5" />
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>

        <ExportButton
          screen="academics.programs"
          params={{
            search,
            is_active: showArchived,
            session: lens.session,
            branch: branch === "all" ? undefined : branch,
          }}
        />

        <PermissionGate permission={P.CREATE_STRUCTURE} disabled={readOnlyYear}>
          <Button className="shrink-0 text-sm" onClick={() => setProgramDrawer("new")}>
            <Plus /> Add programme
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : !programs.length ? (
        <OutlinedNotice
          icon={ListTree}
          title={filtered ? "No programmes match that" : "No programmes yet"}
          body={
            filtered
              ? "Try a different search, or change the status filter - the search looks at level names too."
              : "Programmes group the levels pupils move through: Nursery, Primary, Junior Secondary. Add the first one."
          }
          actionLabel={filtered ? "Clear filters" : undefined}
          onAction={
            filtered
              ? () => {
                  setSearch("");
                  setShowArchived("true");
                  setPage(1);
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {/* Programmes are not per-year - Junior Secondary is Junior
              Secondary - but the LEVELS inside them are. A school that has
              just drafted next year sees every programme with nothing in it,
              which reads as loss rather than as a year not yet started. */}
          {noLevelsThisYear && (
            <EmptyYear
              icon={ListTree}
              thing="levels"
              body="Levels are the rungs pupils move through inside a programme. Open a programme below and add its first level."
              filtered={false}
              filteredBody=""
              onClearFilters={() => setSearch("")}
            />
          )}

          {programs.map((program) => (
            <ProgramRow {...rowProps(program)} key={program.id} />
          ))}
        </div>
      )}

      {(pagination?.totalPages ?? 1) > 1 && (
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

      {/* ── The programme drawer ─────────────────────────────────────────── */}
      <EntityDrawer
        open={programDrawer !== null}
        editing={!!editingProgram}
        saving={cp || up}
        extraBody={{ department: deptChoice }}
        initial={
          editingProgram
            ? {
                name: editingProgram.name,
                code: editingProgram.code,
                description: editingProgram.description ?? "",
                branch: editingProgram.branch ?? null,
              }
            : blankDraft(branch === "all" ? null : branch)
        }
        copy={{
          title: editingProgram ? `Edit ${editingProgram.name}` : "Add programme",
          subtitle: "Programmes group the levels pupils move through.",
          nameLabel: "Programme name",
          namePlaceholder: "e.g. Junior Secondary",
          codePlaceholder: "e.g. JSS",
          scopeHint: "Most schools run one set of programmes across every branch.",
        }}
        onClose={() => setProgramDrawer(null)}
        onSave={saveProgram}
      >
        {() => (
          <DepartmentPicker
            departments={departments}
            value={deptChoice}
            onChange={setDeptChoice}
          />
        )}
      </EntityDrawer>

      {/* ── The level drawer ─────────────────────────────────────────────── */}
      <EntityDrawer
        open={levelDrawer !== null}
        editing={!!levelDrawer?.level}
        saving={cl || ul}
        initial={levelInitial(levelDrawer)}
        // The parent decides. A level inside a branch-only programme cannot be
        // school-wide, so the branch is stated rather than offered.
        lockedTo={
          levelDrawer?.program.branch != null
            ? {
                id: levelDrawer.program.branch,
                name: levelDrawer.program.branch_name ?? "This branch",
                reason: `${levelDrawer.program.name} belongs to this branch, so its levels cannot be school-wide.`,
              }
            : null
        }
        copy={{
          title: levelDrawer?.level
            ? `Edit ${levelDrawer.level.name}`
            : `Add level to ${levelDrawer?.program.name ?? ""}`,
          subtitle: "Levels sit inside a programme, in the order pupils move through them.",
          nameLabel: "Level name",
          namePlaceholder: "e.g. JSS1",
          codePlaceholder: "e.g. JSS1",
          scopeHint: "A level usually belongs wherever its programme does.",
        }}
        // Through extraBody rather than merged in saveLevel: the drawer greys
        // Save until something changes, and a promotion it never sees is a
        // change it cannot count.
        extraBody={promotionBody(promotion)}
        onClose={() => setLevelDrawer(null)}
        onSave={saveLevel}
      >
        {() => (
          <PromotionPicker
            value={promotion}
            onChange={setPromotion}
            siblings={levelDrawer?.program.levels ?? []}
            editingId={levelDrawer?.level?.id}
          />
        )}
      </EntityDrawer>

      <BulkLevelsDrawer
        open={bulkFor !== null}
        program={bulkFor}
        onClose={() => setBulkFor(null)}
      />

      <PromptModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={dp || dl}
        canCancel
        title={confirmTitle(confirm)}
        description={confirmBody(confirm)}
        onConfirmText={confirm?.kind.startsWith("archive") ? "Archive" : "Restore"}
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
        onConfirmClass={
          confirm
            ? "bg-error-01 text-white shadow-xs hover:bg-error-01/90 focus-visible:ring-error-01/20"
            : undefined
        }
      />
    </PageShell>
  );
}

function ProgrammeSummary({
  counts,
  loading,
}: {
  counts?: AcademicOverview["counts"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[74px] rounded-md" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Programmes",
      value: counts?.programs ?? "-",
      icon: GraduationCap,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Levels",
      value: counts?.levels ?? "-",
      icon: Signpost,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      label: "Classes",
      value: counts?.classes ?? "-",
      icon: School,
      tone: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Programme summary">
      {cards.map((card) => (
        <Panel key={card.label} className="flex min-w-0 items-center gap-3 px-4 py-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-content-center rounded-md",
              card.tone,
            )}
          >
            <card.icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-05">{card.label}</p>
            <p className="mt-0.5 text-lg font-semibold leading-tight text-black-01">
              {card.value}
            </p>
          </div>
        </Panel>
      ))}
    </section>
  );
}

function levelInitial(
  d: { program: Program; level: Level | null } | null,
): EntityDraft {
  if (!d) return blankDraft(null);
  if (d.level) {
    return {
      name: d.level.name,
      code: d.level.code,
      description: d.level.description ?? "",
      branch: d.level.branch ?? null,
    };
  }
  // A new level starts wherever its programme is, so the common case needs no
  // decision at all.
  return blankDraft(d.program.branch ?? null);
}

// ── The department picker, the programme drawer's one extra control ─────────

function DepartmentPicker({
  departments,
  value,
  onChange,
}: {
  departments: { id: number; name: string }[];
  value: number | null;
  /** Lifted, so the choice travels in the drawer's single save request. */
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
        Department
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        aria-label="Department"
        className="w-full rounded-lg border border-white-02 px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        <option value="">No department</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-05">
        Optional. A programme with no department still works everywhere.
      </p>
    </div>
  );
}

// ── Confirmations ──────────────────────────────────────────────────────────

type LevelConfirmation = {
  kind: "archiveLevel" | "restoreLevel";
  program: Program;
  level: Level;
};

type Confirmation =
  | { kind: "archiveProgram" | "restoreProgram"; program: Program }
  | LevelConfirmation;

function subjectOf(c: Confirmation) {
  return c.kind.endsWith("Level") ? (c as LevelConfirmation).level : c.program;
}

function confirmTitle(c: Confirmation | null) {
  if (!c) return "";
  const verb = c.kind.startsWith("archive") ? "Archive" : "Restore";
  return `${verb} ${subjectOf(c).name}?`;
}

/**
 * What archiving actually does, which is less than a delete used to.
 *
 * Nothing moves and nothing is removed: the row stops being offered wherever
 * one is picked, and it comes back on request. Said plainly, because a reader
 * who has met "delete" on this screen before will expect the old consequences.
 */
function confirmBody(c: Confirmation | null) {
  if (!c) return "";
  if (c.kind === "restoreProgram" || c.kind === "restoreLevel") {
    return `${subjectOf(c).name} will appear again wherever it can be picked.`;
  }
  if (c.kind === "archiveProgram") {
    return `${c.program.name} stops appearing when anyone picks a programme. Its levels stay exactly where they are, and you can restore it at any time.`;
  }
  const { level, program } = c as LevelConfirmation;
  const offered =
    level.subject_count > 0
      ? ` The ${level.subject_count === 1 ? "subject" : `${level.subject_count} subjects`} taught at it ${level.subject_count === 1 ? "stays" : "stay"} offered here.`
      : "";
  return `${level.name} stops appearing when anyone picks a level in ${program.name}. Its classes stay where they are.${offered} You can restore it at any time.`;
}

// ── One programme, with its levels ─────────────────────────────────────────

function ProgramRow({
  program,
  open,
  multiBranch,
  canEdit,
  canCreate,
  canArchive,
  canRestore,
  onToggle,
  onEdit,
  onArchive,
  onAddLevel,
  onBulkLevels,
  onEditLevel,
  onArchiveLevel,
}: {
  program: Program;
  open: boolean;
  multiBranch: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canArchive: boolean;
  canRestore: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onAddLevel: () => void;
  onBulkLevels: () => void;
  onEditLevel: (level: Level) => void;
  onArchiveLevel: (level: Level) => void;
}) {
  const canManage = program.is_active ? canArchive : canRestore;
  const levels = program.levels ?? [];
  const activeLevels = levels.filter((level) => level.is_active);
  const unwired = activeLevels.filter((level) => level.promotion === "unset").length;
  const classCount = levels.reduce((total, level) => total + level.class_count, 0);
  const subjectOfferings = levels.reduce(
    (total, level) => total + level.subject_count,
    0,
  );
  const ready = program.is_active && activeLevels.length > 0 && unwired === 0;
  const canAddLevel = canCreate && program.is_active;
  const canChangeLevels = program.is_active;
  const rowRef = useRef<HTMLDivElement>(null);

  const toggleProgram = () => {
    const opening = !open;
    onToggle();
    if (!opening) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        rowRef.current?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  };

  return (
    <div ref={rowRef} className="scroll-mt-20">
    <Panel
      as="section"
      className={cn(
        "overflow-hidden transition-[border-color,box-shadow] duration-200",
        open ? "border-primary/50 shadow-sm" : "hover:border-primary/30 hover:shadow-sm",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} ${program.name}`}
        onClick={toggleProgram}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleProgram();
          }
        }}
        className="group/program cursor-pointer px-4 py-4 transition-colors duration-200 hover:bg-primary/[0.02] active:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <span className="grid size-10 shrink-0 place-content-center rounded-md bg-primary/10 text-primary transition-[transform,background-color,color] duration-200 group-hover/program:scale-105 group-hover/program:bg-primary group-hover/program:text-white">
              <GraduationCap className="size-5" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-pretty font-semibold leading-5 text-black-01 transition-colors duration-200 group-hover/program:text-primary">
                  {program.name}
                </span>
                <Badge
                  variant={program.is_active ? "active" : "inactive"}
                  className="h-fit rounded-full py-0 text-[10px] uppercase"
                >
                  {program.is_active ? "Active" : "Archived"}
                </Badge>
              </span>
              <span className="mt-1 block text-xs text-gray-05">
                {program.code} · {program.department_name ?? "No department"}
              </span>
            </span>
          </div>

          {(canEdit || canManage || canAddLevel) && (
            <CardActions className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${program.name}`}
                    className="grid size-6 place-content-center rounded-full text-gray-06 hover:bg-gray-04"
                  >
                    <span className="text-lg leading-none">⋯</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canAddLevel && (
                    <DropdownMenuItem onClick={onBulkLevels}>
                      <Rows3 className="size-4" />
                      Add levels in bulk
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <DropdownMenuItem onClick={onArchive}>
                      {program.is_active ? (
                        <>
                          <Archive className="size-4" />
                          Archive
                        </>
                      ) : (
                        <>
                          <RotateCcw className="size-4" />
                          Restore
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardActions>
          )}
        </div>

        {(program.description?.trim() || multiBranch) && (
          <div className="mt-3 grid gap-2">
            {program.description?.trim() && (
              <p className="line-clamp-2 text-sm leading-5 text-gray-05">
                {program.description}
              </p>
            )}
            {multiBranch && (
              <div className="text-xs text-gray-05">
                <ScopeCell
                  label={program.scope_label}
                  shared={program.branch == null}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-white-02 py-3">
          <ProgramMetric label="Levels" value={levels.length} />
          <ProgramMetric label="Classes" value={classCount} className="pl-4" />
          <ProgramMetric
            label="Offerings"
            value={subjectOfferings}
            className="pl-4"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div
            className={cn(
              "inline-flex min-w-0 items-center gap-1.5 text-xs font-medium",
              ready && "text-green-01-text",
              !ready && program.is_active && activeLevels.length > 0 &&
                "text-yellow-01-text",
              (!program.is_active || activeLevels.length === 0) && "text-gray-05",
            )}
          >
            {ready ? (
              <CheckCircle2 className="size-3.5 shrink-0" />
            ) : program.is_active && activeLevels.length > 0 ? (
              <CircleAlert className="size-3.5 shrink-0" />
            ) : (
              <Signpost className="size-3.5 shrink-0" />
            )}
            <span>
              {ready
                ? "Promotion path ready"
                : !program.is_active
                  ? "Programme archived"
                  : activeLevels.length === 0
                    ? "No active levels"
                  : unwired === 1
                    ? "1 level needs a promotion rule"
                    : `${unwired} levels need promotion rules`}
            </span>
          </div>

          <CardActions className="inline-flex flex-wrap items-center justify-end gap-2">
            {canAddLevel && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary text-primary"
                onClick={onAddLevel}
              >
                <Plus className="size-3.5" />
                Add level
              </Button>
            )}
            <button
              type="button"
              onClick={toggleProgram}
              className="group/toggle inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {open ? "Hide levels" : "View levels"}
              {open ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          </CardActions>
        </div>
      </div>

      {open && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 border-t border-white-02 bg-white-05 px-3 py-3 duration-200 sm:px-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-black-01">Levels in order</h3>
              <p className="mt-0.5 text-xs text-gray-05">
                Follow the path pupils take through this programme.
              </p>
            </div>
            {canAddLevel && (
              <Button size="sm" variant="ghost" onClick={onBulkLevels}>
                <Rows3 className="size-3.5" />
                Add several
              </Button>
            )}
          </div>

          {levels.length === 0 ? (
            <Panel className="px-4 py-5 text-center text-sm text-gray-05">
              No levels in this programme yet.
            </Panel>
          ) : (
            <div className="grid gap-2">
              {levels.map((level, index) => (
                <LevelRow
                  key={level.id}
                  level={level}
                  index={index}
                  multiBranch={multiBranch}
                  canEdit={canEdit && canChangeLevels}
                  canManage={(level.is_active ? canArchive : canRestore) && canChangeLevels}
                  onEdit={() => onEditLevel(level)}
                  onArchive={() => onArchiveLevel(level)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
    </div>
  );
}

function ProgramMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-xs text-gray-05">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-black-01">{value}</p>
    </div>
  );
}

function LevelRow({
  level,
  index,
  multiBranch,
  canEdit,
  canManage,
  onEdit,
  onArchive,
}: {
  level: Level;
  index: number;
  multiBranch: boolean;
  canEdit: boolean;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const promotion =
    level.promotion === "promotes"
      ? {
          label: `Promotes to ${level.next_level_name}`,
          icon: ArrowRight,
          tone: "bg-green-01/10 text-green-01-text",
        }
      : level.promotion === "terminal"
        ? {
            label: "Pupils finish here",
            icon: CheckCircle2,
            tone: "bg-primary/10 text-primary",
          }
        : {
            label: "Promotion not set",
            icon: CircleAlert,
            tone: "bg-yellow-01/10 text-yellow-01-text",
          };

  const content = (
    <>
      <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-sm font-semibold text-primary transition-[transform,background-color,color] duration-200 group-hover/level:scale-105 group-hover/level:bg-primary group-hover/level:text-white">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1 basis-36">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-black-01 transition-colors duration-200 group-hover/level:text-primary">
            {level.name}
          </h4>
          <Badge
            variant={level.is_active ? "active" : "inactive"}
            className="h-fit rounded-full py-0 text-[10px] uppercase"
          >
            {level.is_active ? "Active" : "Archived"}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-gray-05">{level.code}</p>
      </div>

      <div className="grid min-w-[9rem] grid-cols-2 gap-4 text-xs">
        <span>
          <span className="block text-gray-05">Classes</span>
          <span className="mt-0.5 block font-semibold text-black-01">
            {level.class_count}
          </span>
        </span>
        <span>
          <span className="block text-gray-05">Subjects</span>
          <span className="mt-0.5 block font-semibold text-black-01">
            {level.subject_count}
          </span>
        </span>
      </div>

      <div className="min-w-0 basis-full sm:basis-auto">
        <span
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            promotion.tone,
          )}
        >
          <promotion.icon className="size-3.5 shrink-0" />
          <span className="truncate">{promotion.label}</span>
        </span>
        {multiBranch && (
          <div className="mt-1.5 text-xs text-gray-05">
            <ScopeCell label={level.scope_label} shared={level.branch == null} />
          </div>
        )}
      </div>

      {canManage && (
        <CardActions className="ml-auto inline-flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`${level.is_active ? "Archive" : "Restore"} ${level.name}`}
            onClick={onArchive}
            className="grid size-8 place-content-center rounded-md text-gray-06 hover:bg-gray-04 hover:text-black-01"
          >
            {level.is_active ? (
              <Archive className="size-3.5" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
          </button>
        </CardActions>
      )}
    </>
  );

  if (canEdit) {
    return (
      <ClickableCard
        label={`Edit ${level.name}`}
        onOpen={onEdit}
        className="group/level flex min-w-0 flex-wrap items-center gap-3 px-3 py-3 hover:scale-[0.995] hover:shadow-sm active:scale-[0.985]"
      >
        {content}
      </ClickableCard>
    );
  }

  return (
    <Panel className="flex min-w-0 flex-wrap items-center gap-3 px-3 py-3">
      {content}
    </Panel>
  );
}
