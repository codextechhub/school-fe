import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Info, MailCheck, UserPlus } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import PermissionGate from "@/components/custom/permission-gate";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
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
import { RevokeDialog } from "./revoke-dialog";

/**
 * Who has been invited and has not yet accepted.
 *
 * The same rows as the directory, filtered to `INVITED` by the server rather
 * than on the client: a page of twenty-five with three invitations on it would
 * otherwise show three, and the count in the sidebar would disagree with the
 * screen it points at.
 *
 * **There is no "Mark accepted", and its absence is the decision.** Activation
 * is the invited person opening a single-use link and setting their first
 * password, which is what promotes the account. An administrator cannot do that
 * for them without being handed a way to set another person's credential, which
 * is a larger decision than this screen should take. Marking it here would move
 * the employment status alone: Mrs. Okonkwo presses it on 20 October, Mr.
 * Adeyemo reads Active on every screen in the school, and he still cannot sign
 * in. Resend is the control that actually helps, and Revoke is the one for an
 * address that was wrong.
 */
export default function StaffInvitations() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<StaffListRow | null>(null);

  const { data, isLoading, isFetching, isError, refetch } = useGetStaffListQuery({
    page,
    employment_status: "INVITED",
  });
  const [resend, { isLoading: resending }] = useResendStaffInvitationMutation();
  const [revoke, { isLoading: revokingNow }] =
    useRevokeStaffInvitationMutation();

  const rows = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;
  const showBranch = data?.multi_branch ?? false;

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
        `Sent again to ${person.email}. The previous link no longer works.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not resend that invitation. Try again."),
      );
    }
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
          <h2 className="text-lg font-semibold text-black-01">Invitations</h2>
          <p className="mt-1 text-sm text-gray-01">
            {pagination?.totalItems
              ? `${pagination.totalItems} ${pagination.totalItems === 1 ? "person has" : "people have"} been invited and not yet set a password.`
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

      <CustomTable
        tableHeaderList={[
          "Person",
          "Role",
          ...(showBranch ? ["Posted to"] : []),
          "Invited",
          "",
        ]}
        loading={isLoading || isFetching}
        defaultBodyList={rows}
        dropDown
        disabledDropdown={resending || revokingNow}
        dropDownList={[
          {
            label: "View record",
            onActionClick: (row: { _id: number }) =>
              navigate(routesPath.PROTECTED.STAFF.PROFILE_ID(row._id)),
          },
          {
            label: "Resend invitation",
            onActionClick: (row: { _id: number }) => {
              const person = rows.find((entry) => entry.id === row._id);
              if (person) void resendTo(person);
            },
          },
          // Withdrawing is a lifecycle move and needs the manage key, so it is
          // offered only to somebody who holds it rather than shown to
          // everybody and refused at the confirm.
          ...(hasPermission(P.MANAGE_TEACHERS)
            ? [
                {
                  label: "Withdraw invitation",
                  onActionClick: (row: { _id: number }) => {
                    const person = rows.find((entry) => entry.id === row._id);
                    if (person) setRevoking(person);
                  },
                },
              ]
            : []),
        ]}
        tableBodyList={rows.map((person) => ({
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
                <span
                  className="block max-w-60 truncate text-xs text-gray-05"
                  title={person.email}
                >
                  {person.email}
                </span>
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
                "Posted to": person.posted_school_wide
                  ? "School-wide"
                  : (person.branch_name ?? "-"),
              }
            : {}),
          Invited: person.invited_at ? formatDate(person.invited_at) : "-",
        }))}
        onRowClick={(person: StaffListRow) => {
          if (person?.id) {
            navigate(routesPath.PROTECTED.STAFF.PROFILE_ID(person.id));
          }
        }}
        currentPage={pagination?.currentPage ?? 1}
        totalPage={pagination?.totalPages ?? 1}
        onPageChange={(next) => setPage(Number(next) || 1)}
        hidePagination={(pagination?.totalPages ?? 0) < 2}
        emptyText="Everybody who has been invited has accepted."
      />

      <p className="flex items-start gap-1.5 text-xs text-gray-05">
        <Info className="mt-px size-3.5 shrink-0" />
        Resending reuses the account that is already there, so chasing somebody
        never creates a second record for them. There is no way to accept an
        invitation on somebody's behalf: setting the first password is what
        promotes the account, and only they can do it.
      </p>

      <RevokeDialog
        person={revoking}
        saving={revokingNow}
        onCancel={() => setRevoking(null)}
        onConfirm={confirmRevoke}
      />
    </PageShell>
  );
}
