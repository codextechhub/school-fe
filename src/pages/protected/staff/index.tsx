import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Briefcase, Check, Search, UserPlus, X } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetStaffListQuery } from "@/redux/services/staff/staff-api";
import type {
  AccountStatus,
  EmploymentStatus,
  StaffListRow,
} from "@/redux/services/staff/staff-types";

import { AccountFlagChip, EmploymentBadge } from "./badges";
import { CountsHeader } from "./counts-header";
import { FiltersPopover } from "./filters-popover";
import { StaffDrawers, type StaffDrawerRequest } from "./drawers";
// Neither of these is student-specific, and a second copy is the thing to
// avoid: six places once drew their own initials circle, and a date parsed two
// ways reads a day early on one screen and not the other.
import { PersonAvatar } from "../students/person-avatar";

/**
 * The staff directory. The module's front door, and its biggest screen.
 *
 * **Everybody who works here, not only the teachers.** The bursar, the
 * registrar and the procurement officer are on this list, which is why the
 * screen says Staff. The backend keys are still `school.teachers.*` because a
 * permission key is a primary key that four tables point at; the word changed
 * and the key did not.
 *
 * **Two statuses, two columns, never merged.** Employment says whether somebody
 * still works here; the account says whether their login works. Where they
 * agree the account is silent, and the chip beside a name appears only when
 * they disagree - which is the one row on a page of fifty that somebody has to
 * read. See `badges.tsx` for why that silence is the design rather than an
 * omission.
 *
 * **One call draws the whole screen.** The rows, the six header figures, the
 * roles this school may hand out and whether the branch dimension applies all
 * arrive together, because a directory that needs four calls to draw its header
 * draws it late - and because two calls that narrowed differently is how the
 * student directory once showed 87 over a table of 49.
 *
 * Bulk import and the row menu's Manage assignments are not here yet. They
 * arrive with the screens and drawers that answer them, rather than being drawn
 * now and doing nothing.
 */
export default function StaffDirectory() {
  const navigate = useNavigate();
  const { branch, applies: multiBranch, label: branchLabel } = useBranchLens();
  const narrowed = branch !== "all" && branch != null;
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [employment, setEmployment] = useState<EmploymentStatus | "all">("all");
  const [account, setAccount] = useState<AccountStatus | "all">("all");
  const [schoolWideOnly, setSchoolWideOnly] = useState(false);
  const [teachingOnly, setTeachingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drawer, setDrawer] = useState<StaffDrawerRequest | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  const { data, isLoading, isFetching, isError, refetch } = useGetStaffListQuery({
    page,
    search: search.trim() || undefined,
    role: role === "all" ? undefined : role,
    employment_status: employment === "all" ? undefined : employment,
    account_status: account === "all" ? undefined : account,
    // "school" is not a branch id: the server reads it as "posted nowhere in
    // particular", which is a different question from any single branch and
    // the one a branch pill cannot ask. The pill answers the other half.
    branch: schoolWideOnly ? "school" : narrowed ? String(branch) : undefined,
    teaching: teachingOnly ? "true" : undefined,
  });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const counts = data?.counts;
  const pagination = data?.pagination;
  const roles = useMemo(() => data?.role_options ?? [], [data]);
  // The server's answer, not the branch list's. A one-branch school drops every
  // branch-shaped field, and reading the pill instead would put a Posted column
  // of nulls on a school that has no branches to post anybody to.
  const showBranch = data?.multi_branch ?? false;

  const facets =
    (role !== "all" ? 1 : 0) +
    (employment !== "all" ? 1 : 0) +
    (account !== "all" ? 1 : 0) +
    (schoolWideOnly ? 1 : 0) +
    (teachingOnly ? 1 : 0);
  const anyFilter = facets > 0 || search.trim().length > 0;

  const chips = [
    search.trim() && { label: `"${search.trim()}"`, clear: () => setSearch("") },
    role !== "all" && {
      label: roles.find((r) => r.value === role)?.label ?? "Role",
      clear: () => setRole("all"),
    },
    employment !== "all" && {
      label:
        counts?.by_employment_status.find((s) => s.value === employment)
          ?.label ?? employment,
      clear: () => setEmployment("all"),
    },
    account !== "all" && {
      label: `Account: ${account.charAt(0)}${account.slice(1).toLowerCase()}`,
      clear: () => setAccount("all"),
    },
    schoolWideOnly && {
      label: "Posted school-wide",
      clear: () => setSchoolWideOnly(false),
    },
    teachingOnly && {
      label: "Has teaching duties",
      clear: () => setTeachingOnly(false),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  function resetTo(next: () => void) {
    next();
    setPage(1);
    // A selection made under one filter must not survive into another, where
    // those rows are off screen and the write would be invisible.
    setPicked([]);
  }

  function clearAll() {
    setSearch("");
    setRole("all");
    setEmployment("all");
    setAccount("all");
    setSchoolWideOnly(false);
    setTeachingOnly(false);
    setPage(1);
    setPicked([]);
  }

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Briefcase}
          title="We could not load your staff"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-black-01">
            Staff Directory
          </h2>
          {/* Named only when a branch is actually being read. `branchLabel`
              says "All branches" when nothing is narrowed, and "employed at All
              branches" reads like a place rather than an absence of one. */}
          <p className="mt-1 text-sm text-gray-01">
            Everybody employed at{" "}
            {multiBranch && narrowed ? branchLabel : "this school"}.
          </p>
        </div>
        <PermissionGate permission={P.INVITE_TEACHER}>
          <Button onClick={() => navigate(routesPath.PROTECTED.STAFF.ADD)}>
            <UserPlus className="size-4" />
            Add staff
          </Button>
        </PermissionGate>
      </div>

      <CountsHeader
        counts={counts}
        loading={isLoading}
        onPickStatus={(next) => resetTo(() => setEmployment(next))}
        onPickLocked={() => resetTo(() => setAccount("LOCKED"))}
        onPickTeaching={() => resetTo(() => setTeachingOnly(true))}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-55 max-w-85 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <input
            value={search}
            onChange={(e) => resetTo(() => setSearch(e.target.value))}
            placeholder="Search name, email or staff ID"
            aria-label="Search staff"
            className="h-10.5 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <FiltersPopover
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          value={{ role, employment, account, schoolWideOnly }}
          onChange={(next) =>
            resetTo(() => {
              if (next.role !== undefined) setRole(next.role);
              if (next.employment !== undefined) setEmployment(next.employment);
              if (next.account !== undefined) setAccount(next.account);
              if (next.schoolWideOnly !== undefined) {
                setSchoolWideOnly(next.schoolWideOnly);
              }
            })
          }
          onClear={clearAll}
          roles={roles}
          employmentStatuses={counts?.by_employment_status ?? []}
        />
      </div>

      {/* Two or more filters is where a reader loses track of what is applied,
          so the chips appear then rather than for every single one. */}
      {chips.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => resetTo(chip.clear)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-04 px-2.5 py-1 text-xs text-black-01 hover:bg-white-02"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {anyFilter && !isLoading && (
        <p className="text-xs text-gray-05" aria-live="polite">
          {pagination?.totalItems ?? 0}{" "}
          {pagination?.totalItems === 1 ? "person matches" : "people match"}{" "}
          your filters
        </p>
      )}

      {/* Only where something is selected. A bar that is always there is a bar
          that is usually empty, and its two buttons would be permanently
          disabled - which reads as broken rather than as inapplicable. */}
      {picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-primary bg-white-03 px-4 py-2.5">
          <span className="text-[13px] font-medium text-black-01">
            {picked.length} selected
          </span>
          {multiBranch && (
            <PermissionGate permission={P.MODIFY_TEACHER}>
              <Button
                variant="outline"
                onClick={() => setDrawer({ kind: "posting", staffIds: picked })}
              >
                Change posting
              </Button>
            </PermissionGate>
          )}
          <PermissionGate permission={P.ASSIGN_ROLE}>
            <Button
              variant="outline"
              onClick={() => setDrawer({ kind: "bulkRole", staffIds: picked })}
            >
              Assign role
            </Button>
          </PermissionGate>
          <button
            type="button"
            onClick={() => setPicked([])}
            className="ml-auto text-xs text-primary underline-offset-2 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <CustomTable
        tableHeaderList={[
          "",
          "Staff member",
          "Staff ID",
          "Role",
          ...(showBranch ? ["Posted to"] : []),
          "Employment",
          "Teaching load",
          // The row-menu column. CustomTable renders an extra cell when
          // `dropDown` is set, and without this the header row is one short.
          "",
        ]}
        loading={isLoading || isFetching}
        defaultBodyList={rows}
        dropDown
        // Gated on the key the SERVER checks, so a reader who cannot do the
        // thing is not offered it, fills in a drawer and is refused at Save.
        // Assign role and Manage assignments arrive with their own drawers.
        dropDownList={[
          {
            label: "View profile",
            onActionClick: (row: { _id: number }) =>
              navigate(routesPath.PROTECTED.STAFF.PROFILE_ID(row._id)),
          },
          ...(hasPermission(P.MODIFY_TEACHER)
            ? [
                {
                  label: "Edit record",
                  onActionClick: (row: { _id: number }) =>
                    setDrawer({ kind: "edit" as const, staffId: row._id }),
                },
              ]
            : []),
          ...(hasPermission(P.ASSIGN_ROLE)
            ? [
                {
                  label: "Roles and access",
                  onActionClick: (row: { _id: number }) =>
                    setDrawer({ kind: "role" as const, staffId: row._id }),
                },
              ]
            : []),
          ...(hasPermission(P.MANAGE_TEACHERS)
            ? [
                {
                  label: "Change status",
                  onActionClick: (row: { _id: number }) =>
                    setDrawer({ kind: "status" as const, staffId: row._id }),
                },
              ]
            : []),
        ]}
        tableBodyList={rows.map((person) => ({
          // Carried so the row menu can find the person back; CustomTable hands
          // the DISPLAY row to onActionClick, not the source record.
          _id: person.id,
          // Stops the row's own navigation: the click is a selection, not a
          // request to open somebody's record.
          "": (
            <span onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                role="checkbox"
                aria-checked={picked.includes(person.id)}
                aria-label={`Select ${person.full_name}`}
                onClick={() =>
                  setPicked((current) =>
                    current.includes(person.id)
                      ? current.filter((id) => id !== person.id)
                      : [...current, person.id],
                  )
                }
                className={cn(
                  "grid size-4.75 place-content-center rounded-[5px] border-[1.5px] text-white",
                  picked.includes(person.id)
                    ? "border-primary bg-primary"
                    : "border-gray-02 bg-white",
                )}
              >
                {picked.includes(person.id) && <Check className="size-3" />}
              </button>
            </span>
          ),
          "Staff member": (
            <span className="flex min-w-0 items-center gap-2.5">
              <PersonAvatar
                name={person.full_name}
                className="size-8.5 shrink-0"
                textClassName="text-xs"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm text-black-01">
                  {person.full_name}
                </span>
                <span className="block truncate text-xs text-gray-05">
                  {person.job_title || "No job title"}
                </span>
              </span>
            </span>
          ),
          // "Not issued" rather than a dash: the format is the school's own and
          // somebody may legitimately not have one yet, which is a different
          // thing from a value that went missing.
          "Staff ID": person.staff_number || "Not issued",
          // Every role they hold, joined. One person may hold the same role at
          // two branches or two different roles, and showing only the first is
          // how a reader concludes the second grant never landed.
          Role: person.roles.length ? (
            <span className="whitespace-nowrap text-gray-01">
              {person.roles.join(", ")}
            </span>
          ) : (
            <span className="text-gray-02">No role</span>
          ),
          ...(showBranch
            ? {
                "Posted to": person.posted_school_wide ? (
                  <span className="inline-flex rounded-full bg-white-03 px-2 py-0.5 text-xs font-medium text-primary">
                    School-wide
                  </span>
                ) : (
                  <span className="whitespace-nowrap text-gray-01">
                    {person.branch_name}
                  </span>
                ),
              }
            : {}),
          // Two chips side by side, and the second one silent unless the
          // account disagrees with the record.
          Employment: (
            <span className="flex flex-wrap items-center gap-1.5">
              <EmploymentBadge
                status={person.employment_status}
                label={person.employment_status_label}
              />
              <AccountFlagChip flag={person.account_flag} />
            </span>
          ),
          // A count, uncoloured, with nothing to compare it against. No
          // contract records a maximum load and no subject records a weekly
          // frequency, so a threshold here would be invented.
          "Teaching load": person.teaching_load
            ? `${person.teaching_load} ${person.teaching_load === 1 ? "class" : "classes"}`
            : "None",
        }))}
        onRowClick={(person: StaffListRow) => {
          if (person?.id) {
            navigate(routesPath.PROTECTED.STAFF.PROFILE_ID(person.id));
          }
        }}
        currentPage={pagination?.currentPage ?? 1}
        totalPage={pagination?.totalPages ?? 1}
        onPageChange={(next) => setPage(Number(next) || 1)}
        emptyText={
          anyFilter ? "Nobody matches these filters" : "No staff records yet"
        }
      />

      <StaffDrawers
        request={drawer}
        onClose={() => setDrawer(null)}
        onSaved={() => setPicked([])}
      />
    </PageShell>
  );
}
