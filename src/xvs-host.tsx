/**
 * This app's implementation of @xvs/finance's host contract.
 *
 * The package declares HostContract and asserts against it, so if anything
 * here drifts - a missing member, a renamed field - the build fails rather
 * than a bursar meeting an empty branch dropdown. See the package's host.ts.
 *
 * Each member is a thing both products have but reach differently: the console
 * asks its tenant-admin services, this app asks its own.
 */

import { type ComponentType, useMemo } from "react";
// The REAL contract types, from the package. Previously copied locally,
// which meant this app satisfied a copy and the compile-time assertion
// checked nothing here.
import type {
  HostAvatarProps, HostBranch, HostPerson, HostPosition, HostQueryResult, HostExportProps,
  HostRole,
} from "@xvs/finance/host";
import type { FinanceSettingsSection } from "@/pages/protected/finance/console-sections";

/**
 * The reader's branch reach, as the package's `useReaderReach` host member
 * reads it. Declared here rather than imported, so this host still compiles
 * against a package version that does not ask for the member yet: a member
 * the contract does not name is simply unused.
 */
interface HostReaderReach {
  /** Whether the reader acts for the whole school. */
  wholeSchool: boolean;
  /** The reader's branches, or null for a whole-school reader. */
  branchIds: number[] | null;
  /** Whether every branch in `ids` is one the reader covers; empty is the whole school. */
  covers: (ids: number[]) => boolean;
}
import { ExportButton } from "@/components/custom/export-button";
import { returnInitial } from "@/utils/helpers";

import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import { useGetStaffNamesQuery } from "@/redux/services/staff/staff-api";
import { selectPermissions } from "@/redux/features/auth/auth-slice";
import { useAppSelector } from "@/redux/store";
import { useGetSchoolRolesQuery } from "@/redux/services/roles/roles-api";
import { useGetOrgPositionsQuery } from "@/redux/services/staff/organogram-api";
import { usePermissions } from "@/hooks/use-permissions";
import { useReaderReach as useSchoolReaderReach } from "@/hooks/use-reader-reach";
import { P } from "@/permissions";
import { useSchoolLogo } from "@/hooks/use-school-logo";
import { SchoolMark } from "@/components/school-mark";

/** Every branch this caller may see. The server scopes it by their grants. */
export function useBranches(): HostQueryResult<HostBranch> {
  const { data, isLoading, isError } = useGetMyBranchesQuery();
  return { data: data?.data, isLoading, isError };
}

/** The account keys that drive a staff picker, as the names list answers to them. */
const STAFF_PICKER_KEYS = [
  "finance.expenseclaim.create",
  "finance.salary.create",
  "finance.salary.update",
  "workflow.template.update",
  "workflow.group.create",
  "workflow.group.update",
  "workflow.approvers.assign",
] as const;

/** Everyone this caller may name in a staff picker: the school's active staff.
 *
 *  Read from the names-only list (`/v1/i/me/staff/names/`) rather than the
 *  staff directory, because the people who pick staff mostly may not open the
 *  directory: Ngozi, a finance admin, records Tolu Fashola's expense claim and
 *  sets up payroll without the staff key, and through the directory every
 *  picker she met was empty. The list answers to the keys in
 *  `STAFF_PICKER_KEYS`; a reader holding none of them is not asked, and gets an
 *  empty directory rather than a refusal.
 *
 *  The list carries an account id and a name and nothing else, so `email` and
 *  `role` are empty here and a picker shows the name alone. `id` is the
 *  ACCOUNT, stringified: everything the contract hands it to speaks accounts
 *  (an expense claim's claimant, a payroll roster row's staff member, the
 *  workflow API's requesters and approvers), and a Map keyed by a value that
 *  is sometimes a number and sometimes a string silently misses. `status` is
 *  "ACTIVE" for every row, because the server lists only people still employed
 *  whose account is active.
 */
export function useDirectory(): HostQueryResult<HostPerson> {
  const permissions = useAppSelector(selectPermissions);
  const mayPick = STAFF_PICKER_KEYS.some((key) => permissions.includes(key));
  const { data, isLoading, isError } = useGetStaffNamesQuery(undefined, { skip: !mayPick });
  if (!mayPick) return { data: [], isLoading: false, isError: false };
  const rows = Array.isArray(data?.data)
    ? data.data.map((person) => ({
        id: String(person.id), full_name: person.name, email: "", role: "", status: "ACTIVE",
      }))
    : undefined;
  return { data: rows, isLoading, isError };
}

/** The school's own roles, through the slice this app already keeps.
 *
 *  Deliberately this app's ``rolesApi`` rather than a copy inside the package:
 *  the roles screen and the drawer read the same rows through the same tags, so
 *  approving a role change refreshes an approver picker without either side
 *  knowing about the other.
 */
export function useRoles(): HostQueryResult<HostRole> {
  const { data, isLoading, isError } = useGetSchoolRolesQuery();
  const rows = data?.data.map((role) => ({
    id: role.id, key: role.key, name: role.name, status: role.status,
    assigned_users_count: role.assigned_users_count,
  }));
  return { data: rows, isLoading, isError };
}

/** The posts on the school's own organogram, to route an approval to.
 *
 *  A stage or an approver group names a post by its code, and the server
 *  resolves the code inside this school's chart, so "every purchase over the
 *  limit goes to whoever holds Bursar" keeps working when the Bursar changes.
 *  `holders` counts the people in the post today, suspended ones included,
 *  which is how the picker warns about a post that currently reaches nobody.
 *
 *  Read under the chart's own key. A caller without it gets no list rather
 *  than a refusal, and the picker then leaves its Positions choice out.
 */
export function usePositions(): HostQueryResult<HostPosition> {
  const { hasPermission } = usePermissions();
  const canRead = hasPermission(P.VIEW_SCHOOL_ORGANOGRAM);
  const { data, isLoading, isError } = useGetOrgPositionsQuery(
    { page_size: 100 },
    { skip: !canRead },
  );
  if (!canRead) return { data: [], isLoading: false, isError: false };
  const rows = Array.isArray(data?.data)
    ? data.data.map((p) => ({
        code: p.code, title: p.title, is_active: p.is_active,
        holders: p.current_holders.length,
      }))
    : undefined;
  return { data: rows, isLoading, isError };
}

/** Whether the reader may route an approval step through the school's own
 *  organogram: the chart's own read key, the same one `usePositions` reads under.
 */
export function useCanUseOrganogram(): boolean {
  return usePermissions().hasPermission(P.VIEW_SCHOOL_ORGANOGRAM);
}

/** How far the reader's changes may reach, from the branch reach the session carries.
 *
 *  The same answer the school's own screens read (`useReaderReach`), so a
 *  branch administrator finds the approval screens read-only exactly where the
 *  roles and settings screens are. */
export function useReaderReach(): HostReaderReach {
  const { wholeSchool, branches, covers } = useSchoolReaderReach();
  return useMemo(
    () => ({ wholeSchool, branchIds: wholeSchool ? null : branches.map((b) => b.id), covers }),
    [wholeSchool, branches, covers],
  );
}

/** The reader's branch lens, the same one the header's branch switcher sets.
 *
 *  A finance create form at a school with several branches starts on the
 *  branch this lens is working in, so a bursar who switched to Lekki raises
 *  Lekki's documents without choosing it again. */
export { useBranchLens } from "@/hooks/use-branch-lens";

/** This app keeps no recently-opened trail, so noting one is a no-op.
 *
 *  A real answer rather than a gap: the console has a trail worth writing to
 *  and this app does not, and a screen shared between them should not have to
 *  know which it is running inside. */
export function useLogRecentOpen(_entry: unknown): void {}

export {
  financeSettingsSections,
  setupSections,
} from "@/xvs-host-config";

/** Host-owned Finance settings use the school permissions that protect them. */
export function useFinanceSettingsSectionAccess(): (section: FinanceSettingsSection) => boolean {
  const { hasPermission } = usePermissions();
  return (section) => section !== "fees" || hasPermission(P.VIEW_FEES);
}

/** A school adjusts the approval paths it was given; it does not author new ones.
 *
 *  Its templates arrive already published, and changing one forks it to this
 *  school. A blank builder alongside them would be a second way to answer a
 *  question that already has an answer. TEMPLATE_NEW is not routed here either,
 *  so the address is unreachable as well as unadvertised. */
export const createsWorkflowTemplates = false;

/** What a school calls the party that publishes its approval paths.
 *
 *  A school buys XVS and deals with XVS. The company behind it is not a name a
 *  school administrator has any reason to learn, least of all from a sentence
 *  explaining which version of an approval path they are running. */
export const platformName = "XVS";

/** The school's own fee rules: when fee bills fall due, and whether students
 *  may pay their own fees. The package names the slot after the first. */
export { default as FeeDuePolicyPanel } from "@/pages/protected/school-finance/fee-settings";

/** Who a fee structure bills: chosen classes, previewed, then billed through
 *  the school's own route, which keeps to the term the structure prices and
 *  the school's due-date rule. Without it the package bills every active
 *  customer, which in a school is every pupil. */
export { default as FeeGenerationPanel } from "@/pages/protected/school-finance/fee-generation";

/** The school app's loading crest, for the shared screens' loaders. A busy
 *  Refresh button keeps the spinning arrow; see LoadingMark. */
export { LoadingMark } from "@/components/custom/loading-mark";

/** The branch and session lenses, pinned under the Finance and Procurement
 *  menus the way they sit under the school's own.
 *
 *  Those areas swap the school's sidebar for the package's, so without this
 *  the branch switcher vanishes on entering them. Which pills appear is still
 *  decided by each route's `lenses` (see DashboardHandle), so a screen that
 *  does not follow the branch shows no branch pill here either. */
export { LensRail as ConsoleSidebarFooter } from "@/components/layout/lens-pills";

/** The school's own crest at the top of the Finance sidebar, not the platform's.
 *
 *  The same component the school's own sidebar uses, deliberately: crossing
 *  into Finance should not change who the header says you are looking at, and a
 *  school whose crest is missing from storage - never uploaded, or the file gone
 *  - falls back to the XVS mark rather than leaving the sidebar's top blank.
 */
export const AppLogo: ComponentType<{ animate?: boolean; className?: string }> = ({
  animate = true,
  className,
}) => {
  const logo = useSchoolLogo();
  return <SchoolMark logo={logo} animate={animate} className={className} />;
};

/** Scroll the sidebar so the active item is visible.
 *
 *  This app's sidebar is short enough that it does not scroll, so there is
 *  nothing to reveal. Declared rather than omitted because the contract
 *  requires it, and a no-op is the honest implementation.
 */

/**
 * The school app has its own export affordance already, and it is the right one
 * to use: it reads THIS app's permission codes (BROWSE_EXPORT_CATALOGUE and
 * RUN_EXPORT) and refuses while the tenant is still pending. The console's
 * version reads console codes that do not exist here.
 *
 * Adapted rather than widened. ExportButton requires `params` and takes no
 * booleans; the contract makes params optional and allows them. The gap is
 * closed here, in the host, which is what the host module is for. `entity` is
 * passed through: every Finance and Procurement dataset is entity-scoped, and
 * the server refuses to prepare or run one without it. `variant`,
 * `disabledReason` and the rest are console styling and are dropped.
 */
export function QuickExportButton({ screen, params, label, entity }: HostExportProps) {
  const scalars: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined) continue;
    scalars[k] = typeof v === "boolean" ? String(v) : v;
  }
  return <ExportButton screen={screen} params={scalars} label={label} entity={entity} />;
}

// This app has no staff-photo service, so the avatar is initials only. That is
// a complete answer rather than a stub: the package asks for an avatar, not for
// a photograph, and a school that later adds photos changes this one function.
export function UserAvatar({ name, className }: HostAvatarProps) {
  return (
    <span
      className={
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full " +
        "bg-primary/10 text-xs font-semibold text-primary " + (className ?? "")
      }
      aria-hidden="true"
    >
      {returnInitial(name || "U")}
    </span>
  );
}

/**
 * A school runs one set of books and cannot see another school's, so there is
 * no roll-call to show. Rendering nothing is the whole answer, and it is
 * declared rather than omitted because the contract requires the member: the
 * package places this section on Setup -> Entities, which this app does not
 * even mount.
 */
export function PlatformLedgerInventory() {
  return null;
}

// The header names the screen. Routes carry a static title in their handle,
// which is the whole answer for this app's own screens; it is not the answer
// for finance and procurement, where dozens of screens sit under one route
// parent and would all read "Finance". The package works out the right name
// from its own nav and calls this with it.
export { useDashboardTitle } from "@/components/layout/dashboard-header";
