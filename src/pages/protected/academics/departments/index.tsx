import { useMemo, useState } from "react";
import {
  Archive,
  BookOpenText,
  ChevronRight,
  GraduationCap,
  Layers,
  LayoutGrid,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Rows3,
  Search,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import PromptModal from "@/components/modal/prompt-modal";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { CardActions, ClickableCard, Panel } from "@/components/custom/surface";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAcademicsLens } from "@/hooks/use-academics-lens";
import { parseApiError } from "@/utils/api-error";
import {
  useCreateDepartmentMutation,
  useArchiveDepartmentMutation,
  useGetAcademicOverviewQuery,
  useRestoreDepartmentMutation,
  useGetDepartmentsQuery,
  useUpdateDepartmentMutation,
} from "@/redux/services/academics/academics-api";
import type {
  AcademicOverview,
  Department,
} from "@/redux/services/academics/academics-types";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { EntityDrawer } from "../components/entity-drawer";
import { ExportButton } from "@/components/custom/export-button";
import { blankDraft, type EntityDraft } from "../components/entity-draft";
import { ScopeCell } from "../components/scope-cell";
import { PageShell } from "@/components/layout/page-shell";
import { useActionParam } from "@/hooks/use-action-param";
import { cn } from "@/lib/utils";

/**
 * Faculty groupings that programmes and subjects hang off.
 *
 * The smallest of the four catalogue screens, and the first to use the shared
 * entity drawer - which is why it is built before Programmes, Classes and
 * Subjects rather than after them.
 *
 * Three refusals are the school's to resolve rather than ours to hide, so each
 * gets a modal that says what to do next: a department with programmes mapped
 * to it cannot be deleted, narrowing a school-wide department to one branch
 * takes it away from the others, and deleting one is final.
 */
export default function Departments() {
  const { lens, branch, multiBranch } = useAcademicsLens();
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState<"true" | "false" | "all">("true");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Department | null>(null);
  const [viewing, setViewing] = useState<Department | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);

  // The year travels only so the counts can be that year's. The list itself
  // stays whole: a department is the school's filing, not the year's.
  const { data, isLoading, isError, refetch } = useGetDepartmentsQuery({
    ...lens,
    search,
    is_active: showArchived,
    page,
  });
  const { data: overviewData, isLoading: overviewLoading } =
    useGetAcademicOverviewQuery(lens);

  const [create, { isLoading: creating }] = useCreateDepartmentMutation();
  const [update, { isLoading: updating }] = useUpdateDepartmentMutation();
  const [archive, { isLoading: archiving }] = useArchiveDepartmentMutation();
  const [restore, { isLoading: restoring }] = useRestoreDepartmentMutation();

  const departments = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;

  const canEdit = hasPermission(P.MODIFY_STRUCTURE);
  const canManage = hasPermission(P.MANAGE_STRUCTURE);
  const filtered = !!search || showArchived !== "true";

  const openNew = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  // "Add a department" from the search box, on the same key the Add button is
  // wrapped in. The hook takes the gate as an argument rather than trusting the
  // callback to check: a query param is typed as easily as it is clicked.
  useActionParam("new", hasPermission(P.CREATE_STRUCTURE), openNew);
  // One list, running or not: the counts already say which.
  const renderList = (rows: Department[]) =>
    view === "cards" ? (
      <div className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((dept) => (
          <DepartmentCard
            key={dept.id}
            dept={dept}
            multiBranch={multiBranch}
            canEdit={canEdit}
            canManage={canManage}
            onOpen={() => setViewing(dept)}
            onEdit={() => openEdit(dept)}
            onArchive={() => setConfirm({ kind: "archive", department: dept })}
            onRestore={() => setConfirm({ kind: "restore", department: dept })}
          />
        ))}
      </div>
    ) : (
      <CustomTable
        tableHeaderList={[
          "Department",
          "Code",
          ...(multiBranch ? ["Scope"] : []),
          "Programmes",
          "Subjects",
          "Status",
        ]}
        defaultBodyList={rows}
        tableBodyList={rows.map((d) => ({
          Department: d.name,
          Code: d.code,
          ...(multiBranch ? { Scope: d.scope_label ?? "School-wide" } : {}),
          Programmes: String(d.program_count),
          Subjects: String(d.subject_count),
          Status: d.is_active ? "Active" : "Archived",
        }))}
        onRowClick={(dept: Department) => dept && setViewing(dept)}
        currentPage={pagination?.currentPage ?? 1}
        totalPage={pagination?.totalPages ?? 1}
        onPageChange={(next) => setPage(Number(next) || 1)}
        emptyText="No departments"
      />
    );

  const openEdit = (dept: Department) => {
    setViewing(null);
    setEditing(dept);
    setDrawerOpen(true);
  };

  const draft: EntityDraft = editing
    ? {
        name: editing.name,
        code: editing.code,
        description: editing.description ?? "",
        branch: editing.branch ?? null,
      }
    : blankDraft(branch === "all" ? null : branch);

  /**
   * Narrowing a school-wide department to one branch is guarded, not silent.
   *
   * It takes the department away from every other branch, and anything already
   * mapped to it there stays but can never be used again. That is not a saving
   * detail, so the save is held and the consequence is named first.
   */
  const saveDraft = async (body: Parameters<typeof create>[0]) => {
    const narrowing =
      !!editing && editing.branch == null && body.branch != null && multiBranch;
    if (narrowing) {
      return new Promise<void>((resolve, reject) => {
        setConfirm({
          kind: "narrow",
          department: editing,
          payload: body,
          resolve,
          reject,
        });
      });
    }
    const result = editing
      ? await update({ id: editing.id, ...body }).unwrap()
      : await create(body).unwrap();
    toast.success(result.message);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === "narrow") {
        const result = await update({
          id: confirm.department.id,
          ...confirm.payload,
        }).unwrap();
        toast.success(result.message);
        confirm.resolve();
      } else {
        const run = confirm.kind === "restore" ? restore : archive;
        const result = await run(confirm.department.id).unwrap();
        toast.success(result.message);
      }
      setConfirm(null);
    } catch (error) {
      const parsed = parseApiError(error);
      toast.error(parsed.message || "That could not be done.");
      if (confirm.kind === "narrow") confirm.reject(error);
      setConfirm(null);
    }
  };

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Layers}
          title="We could not load your departments"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <DepartmentSummary
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
            placeholder="Search departments"
            aria-label="Search departments"
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

        <SegmentedToggle
          ariaLabel="Department view"
          value={view}
          onChange={setView}
          options={[
            { value: "cards", label: "Cards", icon: LayoutGrid },
            { value: "table", label: "Table", icon: Rows3 },
          ]}
        />

        <ExportButton
          screen="academics.departments"
          params={{
            search,
            is_active: showArchived,
            branch: branch === "all" ? undefined : branch,
          }}
        />

        <PermissionGate permission={P.CREATE_STRUCTURE}>
          <Button className="shrink-0 text-sm" onClick={openNew}>
            <Plus /> Add department
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-md" />
          ))}
        </div>
      ) : !departments.length ? (
        <OutlinedNotice
          icon={Layers}
          title={filtered ? "No departments match that" : "No departments yet"}
          body={
            filtered
              ? "Try a different search, or change the status filter."
              : "Departments group the programmes and subjects a school teaches. Add the first one."
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
        renderList(departments)
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

      <EntityDrawer
        open={drawerOpen}
        editing={!!editing}
        saving={creating || updating}
        initial={draft}
        copy={{
          title: editing ? `Edit ${editing.name}` : "Add department",
          subtitle: "Departments group the programmes and subjects a school teaches.",
          nameLabel: "Department name",
          namePlaceholder: "e.g. Sciences",
          codePlaceholder: "e.g. SCI",
          scopeHint: "Most schools run one set of departments across every branch.",
        }}
        onClose={() => setDrawerOpen(false)}
        onSave={saveDraft}
      />

      <DepartmentDetails
        department={viewing}
        open={!!viewing}
        multiBranch={multiBranch}
        canEdit={canEdit}
        canManage={canManage}
        onClose={() => setViewing(null)}
        onEdit={() => viewing && openEdit(viewing)}
        onArchive={() => {
          if (!viewing) return;
          setViewing(null);
          setConfirm({
            kind: viewing.is_active ? "archive" : "restore",
            department: viewing,
          });
        }}
      />

      <PromptModal
        isOpen={!!confirm}
        onClose={() => {
          if (confirm?.kind === "narrow") confirm.reject(new Error("cancelled"));
          setConfirm(null);
        }}
        onConfirm={runConfirm}
        loading={updating || archiving || restoring}
        canCancel
        title={confirmTitle(confirm)}
        description={confirmBody(confirm)}
        onConfirmText={confirmAction(confirm)}
        containerClass="min-h-[320px] lg:w-[420px]"
        srcClass="size-25"
        src="/image/caution.png"
        onConfirmClass={
          confirm?.kind === "narrow"
            ? "bg-error-01 text-white shadow-xs hover:bg-error-01/90 focus-visible:ring-error-01/20"
            : undefined
        }
      />
    </PageShell>
  );
}

function DepartmentSummary({
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
      label: "Departments",
      value: counts?.departments ?? "-",
      icon: Layers,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Programmes",
      value: counts?.programs ?? "-",
      icon: GraduationCap,
      tone: "bg-sky-100 text-sky-700",
    },
    {
      label: "Subjects",
      value: counts?.subjects ?? "-",
      icon: BookOpenText,
      tone: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Department summary">
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

/**
 * Read-only department detail shown before any edit action.
 *
 * All values come from the directory response, so opening the drawer does not
 * add a request per card. Editing remains permission-gated and opens the shared
 * entity form only when the reader asks to change the record.
 */
function DepartmentDetails({
  department,
  open,
  multiBranch,
  canEdit,
  canManage,
  onClose,
  onEdit,
  onArchive,
}: {
  department: Department | null;
  open: boolean;
  multiBranch: boolean;
  canEdit: boolean;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  if (!department) return null;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
              <Layers className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="truncate font-mont text-base">
                  {department.name}
                </SheetTitle>
                <Badge
                  variant={department.is_active ? "active" : "inactive"}
                  className="h-fit rounded-full py-0 text-[10px] uppercase"
                >
                  {department.is_active ? "Active" : "Archived"}
                </Badge>
              </div>
              <SheetDescription className="mt-0.5 text-xs text-gray-05">
                Department code: {department.code}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-w-0 flex-1" viewportClassName="px-5 py-5">
          <section aria-labelledby="department-overview-heading">
            <h3
              id="department-overview-heading"
              className="text-xs font-medium uppercase tracking-wide text-gray-05"
            >
              Overview
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-01">
              {department.description?.trim() ||
                "No description has been added for this department."}
            </p>
          </section>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Panel className="px-4 py-3">
              <span className="grid size-8 place-content-center rounded-md bg-sky-100 text-sky-700">
                <GraduationCap className="size-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold text-black-01">
                {department.program_count}
              </p>
              <p className="text-xs text-gray-05">Programmes</p>
            </Panel>
            <Panel className="px-4 py-3">
              <span className="grid size-8 place-content-center rounded-md bg-violet-100 text-violet-700">
                <BookOpenText className="size-4" />
              </span>
              <p className="mt-3 text-2xl font-semibold text-black-01">
                {department.subject_count}
              </p>
              <p className="text-xs text-gray-05">Subjects</p>
            </Panel>
          </div>

          <div className="mt-5 grid gap-3">
            <Panel className="px-4 py-3">
              <p className="text-xs text-gray-05">Scope</p>
              <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-black-01">
                <Pin className="size-4 shrink-0 text-primary" />
                {multiBranch ? (
                  <ScopeCell
                    label={department.scope_label}
                    shared={department.branch == null}
                  />
                ) : (
                  <span>The whole school</span>
                )}
              </div>
            </Panel>
            <Panel className="px-4 py-3">
              <p className="text-xs text-gray-05">Availability</p>
              <p className="mt-1.5 text-sm leading-5 text-gray-01">
                {department.is_active
                  ? "Available when assigning programmes and subjects."
                  : "Hidden from new assignments until it is restored."}
              </p>
            </Panel>
          </div>
        </ScrollArea>

        {(canEdit || canManage) && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
            {canManage && (
              <Button variant="outline" onClick={onArchive}>
                {department.is_active ? (
                  <Archive className="size-4" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                {department.is_active ? "Archive" : "Restore"}
              </Button>
            )}
            {canEdit && (
              <Button onClick={onEdit}>
                <Pencil className="size-4" />
                Edit department
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── The confirmations ───────────────────────────────────────────────────────

type Confirmation =
  | { kind: "archive" | "restore"; department: Department }
  | {
      kind: "narrow";
      department: Department;
      payload: { name?: string; code?: string; description?: string; branch?: number | null };
      resolve: () => void;
      reject: (reason?: unknown) => void;
    };

function confirmTitle(c: Confirmation | null) {
  if (!c) return "";
  switch (c.kind) {
    case "archive":
      return `Archive ${c.department.name}?`;
    case "restore":
      return `Restore ${c.department.name}?`;
    case "narrow":
      return `Narrow ${c.department.name} to one branch?`;
  }
}

function confirmBody(c: Confirmation | null) {
  if (!c) return "";
  switch (c.kind) {
    case "archive":
      return "An archived department stops appearing when anyone picks one. Nothing already mapped to it is moved, and you can restore it at any time.";
    case "restore":
      return `${c.department.name} will appear again wherever a department can be picked.`;
    case "narrow":
      return `Every other branch will stop seeing ${c.department.name}. Anything already mapped to it there stays, but nobody at those branches can use it again.`;
  }
}

function confirmAction(c: Confirmation | null) {
  if (!c) return "Confirm";
  switch (c.kind) {
    case "archive":
      return "Archive";
    case "restore":
      return "Restore";
    case "narrow":
      return "Narrow scope";
  }
}

// ── The card ────────────────────────────────────────────────────────────────

function DepartmentCard({
  dept,
  multiBranch,
  canEdit,
  canManage,
  onOpen,
  onEdit,
  onArchive,
  onRestore,
}: {
  dept: Department;
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
      label={`Open ${dept.name}`}
      onOpen={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-content-center rounded-md bg-primary/10 text-primary">
            <Layers className="size-4.5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h5 className="text-pretty text-base font-semibold leading-5 text-black-01">
              {dept.name}
            </h5>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-05">
              {dept.code}
            </p>
          </div>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5">
          <Badge
            variant={dept.is_active ? "active" : "inactive"}
            className="h-fit rounded-full py-0 text-[11px] uppercase"
          >
            {dept.is_active ? "Active" : "Archived"}
          </Badge>
          {(canEdit || canManage) && (
            <CardActions>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${dept.name}`}
                    className="grid size-6 place-content-center rounded-full text-gray-06 hover:bg-gray-04"
                  >
                    <span className="text-lg leading-none">⋯</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {canEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canManage && dept.is_active && (
                    <DropdownMenuItem onClick={onArchive}>
                      <Archive className="size-4" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  {canManage && !dept.is_active && (
                    <DropdownMenuItem onClick={onRestore}>
                      <RotateCcw className="size-4" />
                      Restore
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardActions>
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-gray-05">
        {dept.description?.trim() || "No description has been added yet."}
      </p>

      {multiBranch && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-05">
          <Pin className="size-3 shrink-0" />
          <ScopeCell label={dept.scope_label} shared={dept.branch == null} />
        </div>
      )}

      <hr className="my-3 border-white-02" />

      <div className="grid grid-cols-2 divide-x divide-border">
        <Stat label="Programmes" value={dept.program_count} />
        <Stat label="Subjects" value={dept.subject_count} className="pl-4" />
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-white-02 pt-3">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          View details
          <ChevronRight className="size-3.5" />
        </span>
      </div>
    </ClickableCard>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-05">{label}</p>
      <p className="text-lg font-semibold text-black-01">{value}</p>
    </div>
  );
}
