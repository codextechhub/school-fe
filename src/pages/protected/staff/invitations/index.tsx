import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ChevronRight,
  Clock3,
  Info,
  MailCheck,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import KpiCard from "@/components/custom/kpi-card";
import PermissionGate from "@/components/custom/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { routesPath } from "@/routes/routesPath";
import { apiErrorMessage } from "@/utils/api-error";
import {
  useGetStaffListQuery,
  useResendStaffInvitationMutation,
  useRevokeStaffInvitationMutation,
} from "@/redux/services/staff/staff-api";
import type { StaffListRow } from "@/redux/services/staff/staff-types";

import { PersonAvatar } from "../../students/person-avatar";
import { formatDate } from "../../students/format";
import { InvitationDetailDrawer } from "./invitation-detail-drawer";
import {
  invitationActions,
  invitationAgeDays,
  invitationPageMetrics,
  waitingLabel,
} from "./invitation-model";
import { RevokeDialog } from "./revoke-dialog";

/**
 * Who has been invited and has not yet accepted.
 *
 * The server applies the `INVITED` filter and the active branch lens before it
 * counts or returns anything. Search also stays server-side so finding a name
 * is not limited to the current page.
 *
 * Activation remains an action only the invited person can complete by opening
 * the single-use link and setting a first password. Resend helps a person who
 * has not done that; withdrawal protects a school when the hire or address is
 * wrong.
 */
export default function StaffInvitations() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { branch, applies: multiBranch } = useBranchLens();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StaffListRow | null>(null);
  const [revoking, setRevoking] = useState<StaffListRow | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetStaffListQuery({
    page,
    search: deferredSearch || undefined,
    employment_status: "INVITED",
    branch: multiBranch && branch !== "all" ? String(branch) : undefined,
  });
  const [resend, { isLoading: resending }] = useResendStaffInvitationMutation();
  const [revoke, { isLoading: revokingNow }] =
    useRevokeStaffInvitationMutation();

  const rows = useMemo(() => data?.data ?? [], [data]);
  const metrics = useMemo(() => invitationPageMetrics(rows), [rows]);
  const pagination = data?.pagination;
  const total = pagination?.totalItems ?? 0;
  const multiplePages = (pagination?.totalPages ?? 0) > 1;
  const showBranch = data?.multi_branch ?? false;
  const actionsFor = (person: StaffListRow) =>
    invitationActions(person, hasPermission);
  const selectedActions = selected ? actionsFor(selected) : null;

  async function resendTo(person: StaffListRow) {
    if (!person.can_resend) {
      toast.info(
        `${person.full_name} has already set a password, so there is nothing to resend.`,
      );
      return;
    }
    try {
      await resend(person.id).unwrap();
      toast.success(
        `Sent again${person.email ? ` to ${person.email}` : ""}. The previous link no longer works.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not resend that invitation. Try again."),
      );
    }
  }

  function startRevoke(person: StaffListRow) {
    setSelected(null);
    setRevoking(person);
  }

  async function confirmRevoke(reason: string) {
    if (!revoking) return;
    try {
      await revoke({ id: revoking.id, reason }).unwrap();
      toast.success(`${revoking.full_name}'s invitation was withdrawn.`);
      setRevoking(null);
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not withdraw that invitation. Try again."),
      );
    }
  }

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={MailCheck}
          title="We could not load your invitations"
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
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
            Invitations
          </h1>
          <p className="mt-1 text-sm text-gray-01">
            {total
              ? `${total} ${total === 1 ? "person is" : "people are"} waiting to activate their account.`
              : "Everybody who has been invited has accepted."}
          </p>
        </div>
        <PermissionGate permission={P.INVITE_TEACHER}>
          <Button onClick={() => navigate(routesPath.PROTECTED.STAFF.ADD)}>
            <UserPlus className="size-4" />
            Add staff
          </Button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Awaiting response"
          value={total}
          foot={deferredSearch ? "Matching this search" : "Pending activation"}
          tone="live"
        />
        <KpiCard
          label="Needs follow-up"
          value={metrics.followUp}
          foot={
            multiplePages
              ? "On this page, waiting 7+ days"
              : "Waiting 7+ days"
          }
          tone={metrics.followUp > 0 ? "warn" : "default"}
        />
        <KpiCard
          label="Oldest invitation"
          value={waitingLabel(metrics.oldestDays)}
          foot={multiplePages ? "Oldest on this page" : "Longest waiting"}
        />
      </div>

      <div className="grid min-w-0 gap-3 rounded-xl border border-border bg-white p-3.5 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <div className="relative min-w-55 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name or email"
              aria-label="Search invitations"
              className="h-10.5 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <p className="ml-auto text-xs text-gray-05" aria-live="polite">
            {total} {total === 1 ? "invitation" : "invitations"}
          </p>
        </div>
      </div>

      <CustomTable
        tableHeaderList={[
          "Person",
          "Role",
          ...(showBranch ? ["Branch"] : []),
          "Sent",
          "Waiting",
          "Status",
          "Actions",
        ]}
        loading={isLoading || isFetching}
        loadingText="Loading invitations"
        defaultBodyList={rows}
        cardBreakpoint="lg"
        tableBodyList={rows.map((person) => {
          const age = invitationAgeDays(person.invited_at);
          return {
            _id: person.id,
            Person: (
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
                  {person.email && (
                    <span
                      className="block max-w-60 truncate text-xs text-gray-05"
                      title={person.email}
                    >
                      {person.email}
                    </span>
                  )}
                </span>
              </span>
            ),
            Role: person.roles.length ? (
              <span className="whitespace-nowrap text-gray-01">
                {person.roles.join(", ")}
              </span>
            ) : (
              <span className="text-gray-02">No role</span>
            ),
            ...(showBranch
              ? {
                  Branch: person.posted_school_wide
                    ? "School-wide"
                    : (person.branch_name ?? "-"),
                }
              : {}),
            Sent: person.invited_at ? formatDate(person.invited_at) : "-",
            Waiting: (
              <Badge variant={age != null && age >= 7 ? "amber" : "inactive"}>
                <Clock3 className="size-3" />
                {waitingLabel(age)}
              </Badge>
            ),
            Status: <Badge variant="pending">Awaiting response</Badge>,
            Actions: (
              <span
                className="flex items-center justify-end gap-1.5"
                onClick={(event) => event.stopPropagation()}
              >
                {actionsFor(person).resend && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resending || !person.can_resend}
                    onClick={() => void resendTo(person)}
                  >
                    <RefreshCw className="size-3.5" />
                    Resend
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`View ${person.full_name}'s invitation details`}
                  onClick={() => setSelected(person)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </span>
            ),
          };
        })}
        onRowClick={(person: StaffListRow) => setSelected(person)}
        currentPage={pagination?.currentPage ?? 1}
        totalPage={pagination?.totalPages ?? 1}
        onPageChange={(next) => setPage(Number(next) || 1)}
        hidePagination={(pagination?.totalPages ?? 0) < 2}
        emptyText={
          deferredSearch
            ? "No invitations match this search."
            : "Everybody who has been invited has accepted."
        }
      />

      <p className="flex items-start gap-1.5 text-xs leading-5 text-gray-05">
        <Info className="mt-px size-3.5 shrink-0" />
        Only the invited person can activate this account by opening the link
        and setting their first password.
        {hasPermission(P.INVITE_TEACHER) &&
          " Resending keeps the same staff record and invalidates the previous link."}
      </p>

      <InvitationDetailDrawer
        person={selected}
        showBranch={showBranch}
        canResend={selectedActions?.resend ?? false}
        canWithdraw={selectedActions?.withdraw ?? false}
        resending={resending}
        onClose={() => setSelected(null)}
        onResend={(person) => void resendTo(person)}
        onWithdraw={startRevoke}
        onViewRecord={(person) =>
          navigate(routesPath.PROTECTED.STAFF.PROFILE_ID(person.id))
        }
      />

      <RevokeDialog
        person={revoking}
        saving={revokingNow}
        onCancel={() => setRevoking(null)}
        onConfirm={confirmRevoke}
      />
    </PageShell>
  );
}
