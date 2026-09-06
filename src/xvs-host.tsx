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
  HostAvatarProps, HostBranch, HostPerson, HostQueryResult, HostExportProps,
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
import { useAppSelector } from "@/redux/store";
import { selectSchool } from "@/redux/features/auth/auth-slice";


/** Every branch this caller may see. The server scopes it by their grants. */
export function useBranches(): HostQueryResult<HostBranch> {
  const { data, isLoading, isError } = useGetMyBranchesQuery();
  return { data: data?.data, isLoading, isError };
}

/** Everyone this caller may name on an approval.
 *
 *  Three fields need translating rather than passing through. `id` is a number
 *  on a staff row and a string in the contract, and an id that is sometimes
 *  either is how a Map lookup starts silently missing. `role` is plural on the
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
    id: String(s.id), full_name: s.full_name, email: s.email,
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
export function ApprovalRolesTab() {
  return null;
}

/** The school's own mark, not the platform's.
 *
 *  The same component the school's own sidebar uses, deliberately: crossing
 *  into Finance should not change who the header says you are looking at. It
 *  also has the fallback this used not to have. A school whose crest is missing
 *  from storage - never uploaded, or the file gone - rendered an empty span
 *  here, so the top of the finance sidebar was simply blank, with nothing to
 *  say whether the logo was loading, missing or broken.
 */
export const AppLogo: ComponentType<{ animate?: boolean; className?: string }> = ({
  animate = true,
  className,
}) => {
  const logo = useSchoolLogo();
  const school = useAppSelector(selectSchool);
  return (
    <SchoolMark
      logo={logo}
      name={school?.name}
      slug={school?.slug}
      animate={animate}
      className={className}
    />
  );
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
