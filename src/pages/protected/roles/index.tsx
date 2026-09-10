import { useMemo, useState } from "react";
import { Info, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { PageShell } from "@/components/layout/page-shell";
import { P } from "@/permissions";
import { useGetSchoolRolesQuery } from "@/redux/services/roles/roles-api";
import { RoleDrawer } from "../onboarding/components/role-drawer";

/**
 * Roles & Permissions, for a school that is already running.
 *
 * The onboarding screen at /onboarding/roles asks a school to confirm its
 * baseline once, and it belongs to a checklist that disappears at go-live. This
 * is the permanent door to the same rows: the place a head teacher goes in
 * March when a new bursar joins, which until now did not exist and left the
 * API reachable only from the setup wizard.
 *
 * The drawer is the onboarding one, deliberately. Two screens for naming a role
 * and ticking its permissions would drift, and the second one to drift would be
 * the one nobody opened during setup.
 */

const SEEDED_COLUMNS = ["Role", "People", "Permissions", "Status"];
const OWN_COLUMNS = ["Role", "People", "Permissions"];

export default function Roles() {
  const roles = useGetSchoolRolesQuery();

  const [search, setSearch] = useState("");
  const [explainerOpen, setExplainerOpen] = useState(false);
  // `drawerKey === null` while open means "a new role": one surface for naming,
  // describing and permissioning, whichever it is.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const openRole = (key: string | null) => {
    setDrawerKey(key);
    setDrawerOpen(true);
  };

  const all = useMemo(() => roles.data?.data ?? [], [roles.data]);
  const matching = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((role) => role.name.toLowerCase().includes(needle));
  }, [all, search]);

  // Split on is_system_role rather than on a name list, so a baseline role
  // CodeX adds later lands in the right table with no frontend change.
  const seeded = matching.filter((role) => role.is_system_role);
  const own = matching.filter((role) => !role.is_system_role);

  const rowFor = (role: (typeof all)[number], withStatus: boolean) => ({
    _slug: role.key,
    role: <span className="whitespace-nowrap font-semibold">{role.name}</span>,
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
              <Badge variant="success" className="text-xs">Active</Badge>
            ) : (
              <Badge variant="inactive" className="text-xs">Unavailable</Badge>
            ),
        }
      : {}),
  });

  return (
    <PageShell className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 max-w-[60ch]">
          <h2 className="flex items-center gap-1.5 text-lg font-semibold font-mont text-black-01">
            Roles &amp; Permissions
            <button
              type="button"
              onClick={() => setExplainerOpen((open) => !open)}
              aria-expanded={explainerOpen}
              aria-label="What approval means here"
              className="rounded-full text-gray-01 hover:text-black-01 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Info className="size-4" />
            </button>
          </h2>
          <p className="mt-1 text-sm text-gray-01 text-pretty">
            What each job at your school can reach. Open a role to see what it
            holds, or add one of your own.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <PermissionGate permission={P.CREATE_ROLE}>
            <Button onClick={() => openRole(null)}>
              <Plus />
              Add a role
            </Button>
          </PermissionGate>
        </div>
      </div>

      {explainerOpen && (
        <div className="flex items-start gap-2.5 rounded-lg border border-gray-05/40 bg-gray-05/5 px-3.5 py-3">
          <Info className="size-4 shrink-0 mt-0.5 text-gray-01" />
          <p className="text-sm text-gray-01 text-pretty">
            Some permissions - raising bills, taking payment, changing what a
            role can spend - need a second look before they take effect. Ticking
            one raises a request instead of saving straight away, and the request
            waits under Approvals with everything else awaiting a decision.
          </p>
        </div>
      )}

      <div className="relative max-w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-01" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search roles"
          className="pl-9"
        />
      </div>

      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-black-01">
          Roles CodeX set up for this school
        </h3>
        <CustomTable
          tableHeaderList={SEEDED_COLUMNS}
          tableBodyList={seeded.map((role) => rowFor(role, true))}
          loading={roles.isLoading}
          loadingText="Loading roles…"
          emptyText={
            search
              ? "No default role matches that."
              : "No default roles were set up for this school."
          }
          hidePagination
          onRowClick={(row) => openRole((row as { _slug: string })._slug)}
        />
      </section>

      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-black-01">
          Roles this school added
        </h3>
        <CustomTable
          tableHeaderList={OWN_COLUMNS}
          tableBodyList={own.map((role) => rowFor(role, false))}
          loading={roles.isLoading}
          loadingText="Loading roles…"
          emptyText={
            search
              ? "No role of yours matches that."
              : "You have not added a role of your own yet."
          }
          hidePagination
          onRowClick={(row) => openRole((row as { _slug: string })._slug)}
        />
      </section>

      <RoleDrawer
        open={drawerOpen}
        roleKey={drawerKey}
        onClose={() => setDrawerOpen(false)}
      />
    </PageShell>
  );
}
