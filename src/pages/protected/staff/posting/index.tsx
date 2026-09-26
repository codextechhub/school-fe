import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Building2,
  Check,
  Info,
  Network,
  Search,
  School,
} from "lucide-react";

import KpiCard from "@/components/custom/kpi-card";
import PermissionGate from "@/components/custom/permission-gate";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel as Surface } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { PersonAvatar } from "@/pages/protected/students/person-avatar";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useGetStaffRosterQuery } from "@/redux/services/staff/staff-api";
import type { StaffListRow } from "@/redux/services/staff/staff-types";
import { routesPath } from "@/routes/routesPath";

import { EmploymentBadge } from "../badges";
import { canManage } from "../can-manage";
import { StaffDrawers, type StaffDrawerRequest } from "../drawers";
import { leaveNote } from "../leave-note";
import {
  postingSummary,
  rowsForPostingView,
  type PostingView,
} from "./posting-model";

/**
 * Who is based at a branch, who reaches it through a role, and who belongs to
 * the school as a whole.
 *
 * Posting and reach remain separate. A posting is the selected branch set where
 * a person is based and can be changed here. Reach is derived from role grants, so its view
 * opens the person's access record instead of presenting a posting control
 * that cannot change it.
 *
 * The branch picker lives in this workspace because the roster endpoint
 * requires exactly one branch. A global branch lens would promise an all-branch
 * view that the endpoint cannot produce.
 */
export default function StaffPosting() {
  const navigate = useNavigate();
  // Only the branches this reader works in: the roster refuses any other.
  const {
    choices: branches,
    applies: schoolHasBranches,
    isLoading: loadingBranches,
  } = useBranchLens();

  const [chosen, setChosen] = useState<string | null>(null);
  const [view, setView] = useState<PostingView>("posted");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [drawer, setDrawer] = useState<StaffDrawerRequest | null>(null);

  const branch = chosen ?? (branches.length ? String(branches[0].id) : "");
  const rosterQuery = useGetStaffRosterQuery(branch, { skip: !branch });
  const roster = rosterQuery.data?.data;
  const summary = postingSummary(roster);
  const rows = useMemo(
    () => rowsForPostingView(roster, view, search),
    [roster, search, view],
  );

  const activeBranch =
    branches.find((entry) => String(entry.id) === branch)?.name ?? "this branch";

  function toggle(id: number) {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function changeBranch(next: string) {
    setChosen(next);
    setPicked([]);
    setSearch("");
  }

  function openRow(person: StaffListRow) {
    if (view === "posted" && canManage(person)) {
      setDrawer({
        kind: "posting",
        staffIds: [person.id],
        personName: person.full_name,
      });
      return;
    }

    navigate(
      view === "reach"
        ? `${routesPath.PROTECTED.STAFF.PROFILE_ID(person.id)}?tab=access`
        : routesPath.PROTECTED.STAFF.PROFILE_ID(person.id),
    );
  }

  if (loadingBranches) {
    return (
      <PageShell className="content-start gap-5" grid>
        <Skeleton className="h-16 w-full max-w-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-26 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </PageShell>
    );
  }

  if (branches.length < 2) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Building2}
          title={schoolHasBranches ? "You work in one branch" : "This school has one branch"}
          body={
            schoolHasBranches
              ? "Everybody you manage is based at your branch, so there is nothing to decide here. A school-wide administrator moves people between branches."
              : "Postings answer which branch somebody is based at, so there is nothing to decide here until a second branch opens."
          }
          actionLabel="Back to the directory"
          onAction={() => navigate(routesPath.PROTECTED.STAFF.INDEX)}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
          Posting &amp; reach
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-01">
          Place staff in the right branch and see which people reach it through
          their roles.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="On this roster"
          value={rosterQuery.isLoading ? "..." : summary.total}
          foot={`Everyone visible at ${activeBranch}`}
        />
        <KpiCard
          label="Posted here"
          value={rosterQuery.isLoading ? "..." : summary.posted}
          foot="One of their branch postings"
          tone="live"
        />
        <KpiCard
          label="Reaches by role"
          value={rosterQuery.isLoading ? "..." : summary.reaching}
          foot="Their access includes this branch"
        />
        <KpiCard
          label="School-wide"
          value={rosterQuery.isLoading ? "..." : summary.schoolWide}
          foot="Visible on every branch roster"
        />
      </div>

      <Surface as="section" className="grid min-w-0 gap-4 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="max-w-full overflow-x-auto">
            <SegmentedToggle
              ariaLabel="Posting and reach section"
              value={view}
              onChange={(next) => {
                setView(next);
                setPicked([]);
              }}
              options={[
                { value: "posted", label: "Staff postings", icon: Building2 },
                { value: "reach", label: "Role reach", icon: Network },
                { value: "schoolWide", label: "School-wide", icon: School },
              ]}
            />
          </div>

          {picked.length > 0 && (
            <PermissionGate permission={P.MODIFY_TEACHER}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-black-01">
                  {picked.length} selected
                </span>
                <Button variant="outline" size="sm" onClick={() => setPicked([])}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDrawer({ kind: "posting", staffIds: picked })}
                >
                  Change postings
                </Button>
              </div>
            </PermissionGate>
          )}
        </div>

        <div className="grid gap-3 border-t border-white-02 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
          <label className="relative min-w-0">
            <span className="sr-only">Search this roster</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff, ID or role"
              className="h-10.5 w-full min-w-0 rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-gray-02 focus:border-primary/60"
            />
          </label>

          <label className="grid min-w-0 gap-1.5">
            <span className="sr-only">Show roster for branch</span>
            <NativeSelect
              aria-label="Show roster for branch"
              value={branch}
              onChange={(event) => changeBranch(event.target.value)}
              className="h-10.5"
            >
              {branches.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
      </Surface>

      {rosterQuery.isError ? (
        <OutlinedNotice
          icon={Building2}
          title="We could not load this roster"
          body="Something went wrong on our side. Try another branch, or try again in a moment."
        />
      ) : rosterQuery.isLoading || rosterQuery.isFetching || !roster ? (
        <Surface className="grid gap-3 px-4 py-5 sm:px-6">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </Surface>
      ) : (
        <RosterPanel
          view={view}
          branchName={roster.branch.name}
          rows={rows}
          search={search}
          picked={picked}
          onToggle={toggle}
          onOpen={openRow}
        />
      )}

      <p className="flex items-start gap-1.5 text-xs text-gray-05">
        <Info className="mt-px size-3.5 shrink-0" />
        Changing postings changes where somebody is based. Their role reach and
        teaching assignments stay exactly as they were.
      </p>

      <StaffDrawers
        request={drawer}
        onClose={() => setDrawer(null)}
        onRequest={setDrawer}
        onSaved={() => setPicked([])}
      />
    </PageShell>
  );
}

function RosterPanel({
  view,
  branchName,
  rows,
  search,
  picked,
  onToggle,
  onOpen,
}: {
  view: PostingView;
  branchName: string;
  rows: ReturnType<typeof rowsForPostingView>;
  search: string;
  picked: number[];
  onToggle: (id: number) => void;
  onOpen: (person: StaffListRow) => void;
}) {
  const copy = {
    posted: {
      title: `Posted to ${branchName}`,
      note: "Open a person to change their posting, or select several people and move them together.",
      empty: search
        ? "No posted staff match this search."
        : `Nobody is posted to ${branchName}.`,
    },
    reach: {
      title: `Reaches ${branchName} through a role`,
      note: "Open a person to see the role grants that bring their work into this branch.",
      empty: search
        ? "No role reach matches this search."
        : `Nobody reaches ${branchName} through a branch role.`,
    },
    schoolWide: {
      title: "School-wide staff",
      note: "These people belong to the school as a whole and appear on every branch roster.",
      empty: search
        ? "No school-wide staff match this search."
        : "Nobody has a school-wide posting.",
    },
  }[view];

  return (
    <Surface as="section" className="min-w-0 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-black-01">{copy.title}</h2>
          <p className="mt-1 max-w-3xl text-xs text-gray-05">{copy.note}</p>
        </div>
        <span className="rounded-full bg-gray-04 px-2.5 py-1 text-xs font-medium text-gray-01">
          {rows.length} {rows.length === 1 ? "person" : "people"}
        </span>
      </div>

      {rows.length ? (
        <ul className="mt-4 grid gap-2">
          {rows.map((row) => (
            <RosterRow
              key={row.person.id}
              person={row.person}
              view={view}
              viaRoles={row.viaRoles}
              selectable={view === "posted" && row.person.on_roll && canManage(row.person)}
              picked={picked.includes(row.person.id)}
              onToggle={() => onToggle(row.person.id)}
              onOpen={() => onOpen(row.person)}
            />
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-gray-05">{copy.empty}</p>
      )}
    </Surface>
  );
}

/** One clickable person row with a separate bulk-selection control. */
function RosterRow({
  person,
  view,
  selectable,
  picked,
  viaRoles,
  onToggle,
  onOpen,
}: {
  person: StaffListRow;
  view: PostingView;
  selectable: boolean;
  picked: boolean;
  viaRoles: { name: string; school_wide: boolean }[];
  onToggle: () => void;
  onOpen: () => void;
}) {
  const left = !person.on_roll;
  const reason =
    view === "posted"
      ? person.branch_name ? `Posted to ${person.branch_name}` : "Posted here"
      : view === "schoolWide"
        ? "Every branch"
        : viaRoles
            .map((role) =>
              role.school_wide ? `${role.name}, school-wide` : role.name,
            )
            .join(", ") || "Role grant";

  return (
    <li
      className={cn(
        "group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-3 transition-all lg:grid-cols-[auto_minmax(180px,1.2fr)_minmax(120px,0.8fr)_minmax(130px,0.9fr)_auto]",
        picked
          ? "border-primary bg-white-03"
          : "border-white-02 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-sm",
        left && "bg-gray-03/40 opacity-70",
      )}
    >
      {selectable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={picked}
          aria-label={`Select ${person.full_name}`}
          onClick={onToggle}
          className={cn(
            "grid size-5 shrink-0 place-content-center rounded-[5px] border-[1.5px] text-white transition-colors",
            picked ? "border-primary bg-primary" : "border-gray-02 bg-white",
          )}
        >
          {picked && <Check className="size-3" />}
        </button>
      ) : (
        <span aria-hidden className="size-5 shrink-0" />
      )}

      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 items-center gap-3 text-left focus-visible:outline-none"
      >
        <PersonAvatar
          name={person.full_name}
          className="size-9 shrink-0"
          textClassName="text-xs"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-black-01 group-hover:text-primary">
            {person.full_name}
          </span>
          <span className="block truncate text-xs text-gray-05">
            {person.staff_number || "No staff ID"}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="hidden min-w-0 text-left lg:block"
      >
        <span className="block truncate text-xs text-black-01">
          {person.job_title || person.roles[0] || "No job title"}
        </span>
        <span className="block truncate text-[11px] text-gray-05">
          {person.roles.length ? person.roles.join(", ") : "No role granted"}
        </span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="hidden min-w-0 text-left lg:block"
      >
        <span className="block break-words text-xs text-black-01">{reason}</span>
        <span className="block text-[11px] text-gray-05">
          {view === "posted"
            ? "Click to change posting"
            : view === "reach"
              ? "Click to manage roles"
              : "Click to view profile"}
        </span>
      </button>

      <div className="justify-self-end">
        <EmploymentBadge
          status={person.display_employment_status}
          label={person.display_employment_status_label}
          note={leaveNote(person)}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="col-start-2 min-w-0 text-left lg:hidden"
      >
        <span className="block truncate text-xs text-black-01">
          {person.job_title || person.roles[0] || "No job title"}
        </span>
        <span className="mt-0.5 block break-words text-[11px] text-primary">{reason}</span>
      </button>
    </li>
  );
}
