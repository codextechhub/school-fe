import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Info, Plus, Search, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import Tabs from "@/components/custom/tab";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import { useGetSchoolRolesQuery } from "@/redux/services/roles/roles-api";
import { useTransitionOnboardingTaskMutation } from "@/redux/services/onboarding/onboarding-api";
import { useAppSelector } from "@/redux/store";
import { usePermissions } from "@/hooks/use-permissions";
import { selectSchool } from "@/redux/features/auth/auth-slice";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import { OutlinedNotice } from "./components/outlined-notice";
import { InvitationsPanel } from "./components/invitations-panel";
import { RoleDrawer } from "./components/role-drawer";
import { useOnboardingState } from "./use-onboarding-state";
import { PageShell } from "@/components/layout/page-shell";

/**
 * "Confirm Default Roles & RBAC" - one screen, two tabs, opened from two cards.
 *
 * The design draws Roles & Permissions and Invitations side by side, and the
 * control room opens the same screen from either step: the roles card lands on
 * the first tab, the staff card on the second. The tab lives in the URL, so
 * both cards are ordinary links and a reader can be sent straight to either.
 *
 * The screen's own job is small and worth stating plainly: CodeX seeds every
 * school with a baseline of roles, and this step asks the school to look at
 * them, add any of its own, and say yes. It is not where roles are assigned to
 * people - that happens on the Invitations tab, where an invitation names the
 * role the person will hold.
 */

const ROLES_KEY = "DEFAULT_ROLES";
// No "Action" column: the row opens the role, so a column repeating that is a
// second button for the same thing and a header the reader has to decode.
const DEFAULT_COLUMNS = ["Role", "People", "Permissions", "Status"];
const CUSTOM_COLUMNS = ["Role", "People", "Permissions"];

const TABS = [
  { label: "Roles & Permissions", value: "roles" },
  { label: "Invitations", value: "invitations" },
];

export default function OnboardingRoles() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tab = params.get("tab") === "invitations" ? "invitations" : "roles";

  const school = useAppSelector(selectSchool);
  const { state } = useOnboardingState();
  const { hasPermission } = usePermissions();

  // The two tabs are two different permissions, and a reader may hold one
  // without the other: a branch admin can read the staff list and holds none of
  // the school.roles.* keys. So the roles query only runs when the roles tab is
  // the one on screen and the reader can actually read it - otherwise opening
  // "Open invitations" fires a request that 403s and blocks a tab it has
  // nothing to do with.
  const canSeeRoles = hasPermission(P.VIEW_ROLES);
  const roles = useGetSchoolRolesQuery(undefined, {
    skip: tab !== "roles" || !canSeeRoles,
  });
  const [transition, { isLoading: confirming }] =
    useTransitionOnboardingTaskMutation();

  const [search, setSearch] = useState("");
  // `drawerKey === null` while open means "a new role"; the drawer is the one
  // surface for naming, describing and permissioning, whichever it is.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const openRole = (key: string | null) => {
    setDrawerKey(key);
    setDrawerOpen(true);
  };

  // A refusal from the roles query only blocks the roles tab. The invitations
  // panel answers its own 403 with its own sentence.
  const refusal = roles.error ? parseApiError(roles.error) : null;
  const rolesForbidden = !canSeeRoles || refusal?.status === 403;

  const task = state?.tasks.find((entry) => entry.key === ROLES_KEY);
  const alreadyDone = task?.status === "DONE";

  const all = useMemo(() => roles.data?.data ?? [], [roles.data]);
  const matching = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((role) => role.name.toLowerCase().includes(needle));
  }, [all, search]);

  // The design's two tables are the same distinction the API already makes:
  // is_system_role is the baseline CodeX seeded, everything else the school
  // added. Splitting on that rather than on a name list means a baseline role
  // added later lands in the right table without a frontend change.
  const seeded = matching.filter((role) => role.is_system_role);
  const own = matching.filter((role) => !role.is_system_role);

  const rowFor = (role: (typeof all)[number], withStatus: boolean) => ({
    _slug: role.key,
    role: (
      <span className="whitespace-nowrap font-semibold">{role.name}</span>
    ),
    people: (
      <span className="whitespace-nowrap text-gray-01">
        {role.assigned_users_count === 0
          ? "Nobody yet"
          : `${role.assigned_users_count} ${
              role.assigned_users_count === 1 ? "person" : "people"
            }`}
      </span>
    ),
    permissions: (
      <span className="whitespace-nowrap text-gray-01">
        {role.permissions_count === 0
          ? "None yet"
          : `${role.permissions_count} granted`}
      </span>
    ),
    ...(withStatus
      ? {
          status:
            role.status === "ACTIVE" ? (
              <Badge variant="success" className="text-xs">
                Active
              </Badge>
            ) : (
              <Badge variant="inactive" className="text-xs">
                Unavailable
              </Badge>
            ),
        }
      : {}),
  });

  const confirm = async () => {
    try {
      await transition({ key: ROLES_KEY, status: "DONE" }).unwrap();
      toast.success(`Roles confirmed for ${school?.name ?? "your school"}.`);
      navigate(routesPath.PROTECTED.ONBOARDING.INDEX);
    } catch (error) {
      // The platform checks this step rather than taking the school's word for
      // it, so a refusal here is a real condition to read, not a failure.
      toast.error(
        apiErrorMessage(
          error,
          "We could not confirm that step yet. Open the control room to see what is outstanding.",
        ),
      );
    }
  };

  return (
    <PageShell className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 max-w-[60ch]">
          <h2 className="text-lg font-semibold font-mont text-black-01">
            {canSeeRoles
              ? "Confirm Default Roles & Permissions"
              : "Add Staff & Invitations"}
          </h2>
          <p className="mt-1 text-sm text-gray-01 text-pretty">
            {canSeeRoles
              ? `CodeX has set ${school?.name ?? "your school"} up with a baseline of roles. Look them over, add any of your own, and invite the people who will operate the system.`
              : "The people who will operate the system, and whether their invitations have landed."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={() => navigate(routesPath.PROTECTED.ONBOARDING.INDEX)}
          >
            <ArrowLeft />
            Back to control room
          </Button>
          <PermissionGate permission={P.VIEW_ROLES}>
            <Button onClick={confirm} loading={confirming} disabled={alreadyDone}>
              {alreadyDone ? "Confirmed" : "Save and continue"}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* One live tab is not a choice, so the strip only appears when the
          reader can actually open both halves. */}
      {canSeeRoles && (
        <div className="max-w-full overflow-x-auto">
          <Tabs tabKey="tab" tabs={TABS} />
        </div>
      )}

      {tab === "invitations" || !canSeeRoles ? (
        <InvitationsPanel />
      ) : rolesForbidden ? (
        <OutlinedNotice
          icon={ShieldOff}
          title="You cannot manage this school's roles"
          body="Your account can read the onboarding checklist but not the roles behind it. A school administrator confirms the roles and decides what each one can reach."
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative w-full max-w-70">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search roles"
                aria-label="Search roles"
                className="pr-9"
              />
              <Search className="pointer-events-none absolute right-3 top-3 size-4 text-gray-05" />
            </div>
            <PermissionGate permission={P.CREATE_ROLE}>
              <Button onClick={() => openRole(null)}>
                <Plus />
                Add custom role
              </Button>
            </PermissionGate>
          </div>

          <section className="bg-white rounded-md border border-white-02 px-3 py-4 sm:px-5">
            <p className="mb-3 text-sm font-semibold font-mont text-black-01">
              Default role templates
            </p>
            <div className="overflow-x-auto">
              <CustomTable
                tableHeaderList={DEFAULT_COLUMNS}
                tableBodyList={seeded.map((role) => rowFor(role, true))}
                loading={roles.isLoading}
                loadingText="Loading your roles…"
                emptyText={
                  search
                    ? "No default role matches that."
                    : "No default roles were set up for this school."
                }
                hidePagination
                onRowClick={(row) => openRole((row as { _slug: string })._slug)}
              />
            </div>
            <p className="mt-2.5 flex items-start gap-1.5 text-xs text-gray-05">
              <Info className="size-3.5 shrink-0 mt-px text-gray-05" />
              Open a role to see what it can reach. CodeX maintains these, so their
              permissions are read-only - to work differently, add a role of
              your own.
            </p>
          </section>

          <section className="bg-white rounded-md border border-white-02 px-3 py-4 sm:px-5">
            <p className="mb-3 text-sm font-semibold font-mont text-black-01">
              Custom roles
            </p>
            <div className="overflow-x-auto">
              <CustomTable
                tableHeaderList={CUSTOM_COLUMNS}
                tableBodyList={own.map((role) => rowFor(role, false))}
                loading={roles.isLoading}
                loadingText="Loading your roles…"
                emptyText={
                  search
                    ? "No role of your own matches that."
                    : "You have not added any roles of your own."
                }
                hidePagination
                onRowClick={(row) => openRole((row as { _slug: string })._slug)}
              />
            </div>
          </section>
        </div>
      )}

      <RoleDrawer
        open={drawerOpen}
        roleKey={drawerKey}
        onClose={() => setDrawerOpen(false)}
      />

    </PageShell>
  );
}
