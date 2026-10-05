import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Archive,
  BookOpenText,
  ChevronRight,
  Edit,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Plus,
  RotateCcw,
  Rows3,
  Search,
  UserRoundCheck,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PromptModal from "@/components/modal/prompt-modal";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { ScopeCell } from "@/pages/protected/academics/components/scope-cell";
import { EmptyYear } from "@/pages/protected/academics/components/empty-year";
import { CardActions, ClickableCard, Panel } from "@/components/custom/surface";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { cn } from "@/lib/utils";
import {
  useArchiveClassMutation,
  useCreateClassMutation,
  useGetAcademicOverviewQuery,
  useGetClassesQuery,
  useGetProgramsQuery,
  useRestoreClassMutation,
  useUpdateClassMutation,
} from "@/redux/services/academics/academics-api";
import type {
  ClassWrite,
  Level,
  SchoolClass,
} from "@/redux/services/academics/academics-types";
import { ExportButton } from "@/components/custom/export-button";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { ClassDrawer } from "./class-drawer";
import { GenerateArmsDrawer } from "./generate-arms-drawer";
import { PageShell } from "@/components/layout/page-shell";
import { useActionParam } from "@/hooks/use-action-param";
import { routesPath } from "@/routes/routesPath";
import { canManageRow } from "@/lib/can-manage";

/**
 * The classes pupils sit in, including their arms and assigned class teachers.
 *
 * A card opens the class record for every reader. Edit and lifecycle controls
 * remain permission-gated actions within that card, so view access never turns
 * into write access and a read-only card never becomes a dead control.
 */
export default function Classes() {
  const navigate = useNavigate();
  const { lens, branch, multiBranch, readOnlyYear } = useAcademicsLens();
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [status, setStatus] = useState<"true" | "false" | "all">("true");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  // A level id belongs to one year, so it cannot survive a year switch: the
  // dropdown would name a level this year does not have and the list would
  // filter by it. The page number goes with it.
  const [lastSession, setLastSession] = useState(lens.session);
  if (lens.session !== lastSession) {
    setLastSession(lens.session);
    setLevelFilter("all");
    setPage(1);
  }

  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [armsOpen, setArmsOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);

  const { data, isLoading, isError, refetch } = useGetClassesQuery({
    ...lens,
    search,
    is_active: status,
    level: levelFilter === "all" ? undefined : levelFilter,
    page,
  });
  // Levels come from the programmes call, which already nests them - one
  // request rather than a second flat list of the same rows.
  const { data: programData } = useGetProgramsQuery(lens);
  const { data: overviewData } = useGetAcademicOverviewQuery(lens);

  const [create, { isLoading: creating }] = useCreateClassMutation();
  const [update, { isLoading: updating }] = useUpdateClassMutation();
  const [archive, { isLoading: archiving }] = useArchiveClassMutation();
  const [restore, { isLoading: restoring }] = useRestoreClassMutation();

  const classes = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;
  const levels = useMemo<Level[]>(
    () => (programData?.data ?? []).flatMap((p) => p.levels ?? []),
    [programData],
  );

  // The server refuses every write into an archived year, so an Edit here
  // would only answer 409.
  const canEdit = hasPermission(P.MODIFY_CLASS) && !readOnlyYear;
  const canArchive = hasPermission(P.ARCHIVE_CLASS) && !readOnlyYear;
  const canRestore = hasPermission(P.REACTIVATE_CLASS) && !readOnlyYear;

  // "Add a class" from the search box, on the Add button's own gate.
  useActionParam("new", hasPermission(P.CREATE_CLASS) && !readOnlyYear, () => {
    setEditing(null);
    setDrawerOpen(true);
  });
  const filtered = !!search || status !== "true" || levelFilter !== "all";

  const saveClass = async (body: ClassWrite) => {
    const result = editing
      ? await update({ id: editing.id, ...body }).unwrap()
      : await create(body).unwrap();
    toast.success(result.message);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    try {
      const result =
        confirm.kind === "archive"
          ? await archive(confirm.klass.id).unwrap()
          : await restore(confirm.klass.id).unwrap();
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
          icon={GraduationCap}
          title="We could not load your classes"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div data-guide="classes.toolbar" className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1 basis-52">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search classes"
            aria-label="Search classes"
            className="h-9 w-full rounded-full border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => {
            setLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value));
            setPage(1);
          }}
          aria-label="Filter by level"
          className="h-9 shrink-0 rounded-full border border-white-02 bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="all">All levels</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "true" | "false" | "all");
            setPage(1);
          }}
          aria-label="Filter by status"
          className="h-9 shrink-0 rounded-full border border-white-02 bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="true">Active</option>
          <option value="false">Archived</option>
          <option value="all">All statuses</option>
        </select>

        <SegmentedToggle
          ariaLabel="Class view"
          value={view}
          onChange={setView}
          options={[
            { value: "cards", label: "Cards", icon: LayoutGrid },
            { value: "table", label: "Table", icon: Rows3 },
          ]}
        />

        <ExportButton
          screen="academics.classes"
          params={{
            search,
            is_active: status,
            level: levelFilter === "all" ? undefined : levelFilter,
            branch: branch === "all" ? undefined : branch,
            // The rows belong to one year, so the file has to as well.
            session: lens.session,
          }}
        />

        <PermissionGate permission={P.CREATE_CLASS} disabled={readOnlyYear}>
          <Button
            data-guide="classes.generate-arms"
            variant="outline"
            className="shrink-0 border-primary text-sm text-primary"
            onClick={() => setArmsOpen(true)}
          >
            <Wand2 className="size-4" />
            Generate arms
          </Button>
          <Button
            data-guide="classes.add"
            className="shrink-0 text-sm"
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
          >
            <Plus /> Add class
          </Button>
        </PermissionGate>
      </div>

      <Panel
        as="section"
        data-guide="classes.summary"
        className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden sm:grid-cols-3 sm:divide-y-0"
        aria-label="Class structure summary"
      >
        <DirectorySummary
          icon={GraduationCap}
          label="Classes"
          value={overviewData?.data.counts.classes}
        />
        <DirectorySummary
          icon={Users}
          label="Levels"
          value={overviewData?.data.counts.levels}
        />
        <DirectorySummary
          icon={BookOpenText}
          label="Subjects"
          value={overviewData?.data.counts.subjects}
          className="col-span-2 sm:col-span-1"
        />
      </Panel>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-md" />
          ))}
        </div>
      ) : !classes.length ? (
        <EmptyYear
          icon={GraduationCap}
          thing="classes"
          body="A class is a level plus an arm. Generate a set of arms for a level, or add one class at a time."
          filtered={filtered}
          filteredBody="Try a different search, or change the level and status filters."
          onClearFilters={() => {
            setSearch("");
            setStatus("true");
            setLevelFilter("all");
            setPage(1);
          }}
        />
      ) : view === "cards" ? (
        <div data-guide="classes.list" className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((klass) => (
            <ClassCard
              key={klass.id}
              klass={klass}
              multiBranch={multiBranch}
              canEdit={canEdit && klass.is_active && canManageRow(klass)}
              canManage={(klass.is_active ? canArchive : canRestore) && canManageRow(klass)}
              onOpen={() =>
                navigate(
                  routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASS_DETAILS_ID(
                    klass.id,
                  ),
                )
              }
              onEdit={() => {
                setEditing(klass);
                setDrawerOpen(true);
              }}
              onArchive={() => setConfirm({ kind: "archive", klass })}
              onRestore={() => setConfirm({ kind: "restore", klass })}
            />
          ))}
        </div>
      ) : (
        <CustomTable
          tableHeaderList={[
            "Class",
            "Code",
            "Level",
            "Arm",
            ...(multiBranch ? ["Scope"] : []),
            "Class Teacher",
            "Capacity",
            "Subjects",
            "Status",
          ]}
          defaultBodyList={classes}
          tableBodyList={classes.map((c) => ({
            Class: c.name,
            Code: c.code,
            Level: c.level_name,
            Arm: c.arm || "-",
            ...(multiBranch ? { Scope: c.scope_label ?? "School-wide" } : {}),
            "Class Teacher": c.class_teacher?.name ?? "Not assigned",
            // Spelled out rather than left blank: no limit is a state the
            // school chose, and an empty cell reads as missing data.
            Capacity: c.capacity != null ? String(c.capacity) : "No limit",
            Subjects: String(c.subject_count),
            Status: c.is_active ? "Active" : "Archived",
          }))}
          onRowClick={(klass: SchoolClass) => {
            if (klass) {
              navigate(
                routesPath.PROTECTED.ACADEMIC_STRUCTURE.CLASS_DETAILS_ID(
                  klass.id,
                ),
              );
            }
          }}
          currentPage={pagination?.currentPage ?? 1}
          totalPage={pagination?.totalPages ?? 1}
          onPageChange={(next) => setPage(Number(next) || 1)}
          emptyText="No classes"
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

      <ClassDrawer
        open={drawerOpen}
        editing={editing}
        levels={levels}
        saving={creating || updating}
        onClose={() => setDrawerOpen(false)}
        onSave={saveClass}
      />

      <GenerateArmsDrawer
        open={armsOpen}
        levels={levels}
        classes={classes}
        onClose={() => setArmsOpen(false)}
      />

      <PromptModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={archiving || restoring}
        canCancel
        title={
          confirm?.kind === "archive"
            ? `Archive ${confirm.klass.name}?`
            : `Restore ${confirm?.klass.name}?`
        }
        description={
          confirm?.kind === "archive"
            ? "An archived class stops appearing when anyone picks a class, but its history stays intact. Pupils already in it are not moved for you."
            : `${confirm?.klass.name} will appear again wherever a class can be picked.`
        }
        onConfirmText={confirm?.kind === "archive" ? "Archive class" : "Restore"}
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

type Confirmation = { kind: "archive" | "restore"; klass: SchoolClass };

/** The tile colour keys off the programme band, as this card always did. */
function tileVariant(levelName: string) {
  if (/^JSS|^Junior/i.test(levelName)) return "green";
  if (/^Primary|^Nursery/i.test(levelName)) return "amber";
  return "blue";
}

function ClassCard({
  klass,
  multiBranch,
  canEdit,
  canManage,
  onOpen,
  onEdit,
  onArchive,
  onRestore,
}: {
  klass: SchoolClass;
  multiBranch: boolean;
  canEdit: boolean;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  return (
    <ClickableCard
      label={`Open ${klass.name}`}
      onOpen={onOpen}
      className="group px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <figure
          className={cn(
            badgeVariants({ variant: tileVariant(klass.level_name) }),
            "grid size-10 shrink-0 place-content-center rounded-lg",
          )}
        >
          <GraduationCap className="size-5!" />
        </figure>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate font-semibold text-black-01">
              {klass.name}
            </h3>
            {!klass.is_active && (
              <Badge
                variant="inactive"
                className="h-fit shrink-0 rounded-full py-0 text-[11px]"
              >
                Archived
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-gray-05">
            {klass.level_name}
            {klass.arm ? `, Arm ${klass.arm}` : ""}
          </p>
          {multiBranch && (
            <div className="mt-1.5 flex items-center gap-1.5 text-gray-05">
              <MapPin className="size-3 shrink-0 text-amber-01" />
              <span className="min-w-0 truncate text-xs">
                <ScopeCell
                  label={klass.scope_label}
                  shared={klass.branch == null}
                />
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex min-w-0 items-center gap-2 rounded-lg bg-white-03 px-3 py-2.5">
        <UserRoundCheck className="size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-[11px] text-gray-05">Class teacher</p>
          <p
            className={cn(
              "truncate text-sm font-medium",
              klass.class_teacher ? "text-black-01" : "text-amber-700",
            )}
          >
            {klass.class_teacher?.name ?? "No class teacher assigned"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 divide-x divide-border rounded-lg border border-border">
        <Stat label="Subjects" value={String(klass.subject_count)} />
        <Stat
          label="Capacity"
          value={klass.capacity == null ? "No limit" : String(klass.capacity)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <CardActions className="inline-flex flex-wrap items-center gap-1">
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="text-primary"
              onClick={onEdit}
            >
              <Edit className="size-4" />
              Edit
            </Button>
          )}
          {canManage &&
            (klass.is_active ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-06"
                onClick={onArchive}
              >
                <Archive className="size-4" />
                Archive
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="text-primary"
                onClick={onRestore}
              >
                <RotateCcw className="size-4" />
                Restore
              </Button>
            ))}
        </CardActions>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          View details
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </ClickableCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p className="text-[11px] text-gray-05">{label}</p>
      <p className="truncate text-base font-semibold text-black-01">{value}</p>
    </div>
  );
}

function DirectorySummary({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3 px-4 py-3", className)}>
      <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-05">{label}</p>
        <p className="text-lg font-semibold text-black-01">{value ?? "-"}</p>
      </div>
    </div>
  );
}
