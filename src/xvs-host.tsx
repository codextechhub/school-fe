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

import { type ComponentType } from "react";
// The REAL contract types, from the package. Previously copied locally,
// which meant this app satisfied a copy and the compile-time assertion
// checked nothing here.
import type {
  HostAvatarProps, HostBranch, HostPerson, HostPosition, HostQueryResult, HostExportProps,
  HostRole,
} from "@xvs/finance/host";
import { ExportButton } from "@/components/custom/export-button";
import { returnInitial } from "@/utils/helpers";

import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import { useGetStaffListQuery } from "@/redux/services/staff/staff-api";
import { useGetSchoolRolesQuery } from "@/redux/services/roles/roles-api";
import { routesPath } from "@/routes/routesPath";
import { useSchoolLogo } from "@/hooks/use-school-logo";
import { SchoolMark } from "@/components/school-mark";

/** Every branch this caller may see. The server scopes it by their grants. */
export function useBranches(): HostQueryResult<HostBranch> {
  const { data, isLoading, isError } = useGetMyBranchesQuery();
  return { data: data?.data, isLoading, isError };
}

/** Everyone this caller may name on an approval.
 *
 *  Three fields need translating rather than passing through. `id` is the
 *  ACCOUNT, `user_id` on the staff row - not the row's own `id`, which is the
 *  employment record and a different number entirely. Everything the contract
 *  hands this id to speaks accounts: the workflow API returns `requested_by`
 *  and its approver lists as account ids, and the approver-group endpoint takes
 *  one. Passing the staff id made every name in the workflow screens fall back
 *  to "User 60", because no lookup ever matched, and would have added the wrong
 *  person to an approver group had the two sequences ever overlapped. It is
 *  also stringified, because an id that is sometimes a number and sometimes a
 *  string is how a Map lookup starts silently missing. `role` is plural on the
 *  record, because one person may hold several, and the contract shows one
 *  beside a name to make an approver identifiable, so the first is what it
 *  gets. And `status` is the ACCOUNT's, not the employment record's: the
 *  contract uses it to gate delegation, and whether somebody may be handed
 *  another person's approvals is a question about whether their login works.
 *  A teacher on maternity leave still signs in; a suspended account does not.
 */
export function useDirectory(): HostQueryResult<HostPerson> {
  const { data, isLoading, isError } = useGetStaffListQuery();
  const rows = data?.data.map((s) => ({
    id: String(s.user_id), full_name: s.full_name, email: s.email,
    role: s.roles[0] ?? "", status: s.account_status,
  }));
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

/** A school has no organogram, so there are no seats to approve through.
 *
 *  The organogram is CodeX's own reporting structure - platform-scoped, with no
 *  tenant column and a platform key on its endpoint - so there is no version of
 *  it a school could be shown. Answering with an empty list is the real answer
 *  rather than a gap: the approver picker drops its Positions tab instead of
 *  offering one that could never list anything, which is what it did while the
 *  package queried the console's endpoint directly and answered every school
 *  administrator 403.
 */
export function usePositions(): HostQueryResult<HostPosition> {
  return { data: [], isLoading: false, isError: false };
}

/** This app keeps no recently-opened trail, so noting one is a no-op.
 *
 *  A real answer rather than a gap: the console has a trail worth writing to
 *  and this app does not, and a screen shared between them should not have to
 *  know which it is running inside. */
export function useLogRecentOpen(_entry: unknown): void {}

/** Where this app lists who holds which role: the drawer's People tab. */
export const rolesHref = routesPath.PROTECTED.ROLES.INDEX;

/** No platform-wide staffing view exists for one school, so the tab is empty.
 *
 *  Rendering nothing rather than omitting the tab: the shared screen decides
 *  its own layout, and an app that cannot fill a slot fills it with nothing. */
import type {
  FinanceSettingsSection, SetupSection,
} from "@/pages/protected/finance/console-sections";

export function ApprovalRolesTab() {
  return null;
}

/** Which Finance Settings sections this app routes.
 *
 *  The router's own list, so the settings nav cannot offer a section this app
 *  does not serve. Entities is absent because a school keeps one set of books
 *  and never creates another; "fees" is present and is school-only. */
export const financeSettingsSections: readonly FinanceSettingsSection[] = [
  "overview", "fiscal-calendar", "accounting", "documents",
  "banking-cash", "reference-data", "approvals", "fees",
] as const;

/** Which Setup pages this app routes; see SCHOOL_SETUP_SECTIONS in the route
 *  table, which is built from this. Dimensions and currencies are absent: a
 *  school reports on branches and terms rather than analytical axes, and bills
 *  in naira only. */
export const setupSections: readonly SetupSection[] = [
  "accounts", "periods", "tax-codes", "cost-centers",
] as const;

/** A school adjusts the approval paths it was given; it does not author new ones.
 *
 *  Its templates arrive already published, and changing one forks it to this
 *  school. A blank builder alongside them would be a second way to answer a
 *  question that already has an answer. TEMPLATE_NEW is not routed here either,
 *  so the address is unreachable as well as unadvertised. */
export const createsWorkflowTemplates = false;

/** When this school's fee bills fall due. */
export { default as FeeDuePolicyPanel } from "@/pages/protected/school-finance/fee-due-policy";

/** The school's own crest at the top of the Finance sidebar, not the platform's.
 *
 *  The same component the school's own sidebar uses, deliberately: crossing
 *  into Finance should not change who the header says you are looking at, and a
 *  school whose crest is missing from storage - never uploaded, or the file gone
 *  - falls back to the XVS shield rather than leaving the sidebar's top blank.
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
 * closed here, in the host, which is what the host module is for. The props the
 * school button has no concept of - entity, variant, disabledReason - are
 * dropped deliberately: a school runs one set of books, so `entity` is
 * meaningless, and the rest are console styling.
 */
export function QuickExportButton({ screen, params, label }: HostExportProps) {
  const scalars: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined) continue;
    scalars[k] = typeof v === "boolean" ? String(v) : v;
  }
  return <ExportButton screen={screen} params={scalars} label={label} />;
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
