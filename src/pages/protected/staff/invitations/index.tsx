import { useDeferredValue, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { cn } from "@/lib/utils";
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
import type {
  EmploymentStatus,
  StaffListRow,
} from "@/redux/services/staff/staff-types";

import { PersonAvatar } from "../../students/person-avatar";
import { formatDate } from "../../students/format";
import { InvitationDetailDrawer } from "./invitation-detail-drawer";
import {
  invitationActions,
  invitationAgeDays,
  invitationKind,
  invitationPageMetrics,
  sendable,
  waitingLabel,
} from "./invitation-model";
import { RevokeDialog } from "./revoke-dialog";

/** The three lists this screen can show, and the status each one filters on. */
type View = "invited" | "awaiting" | "held";

const STATUS: Record<View, EmploymentStatus> = {
  invited: "INVITED",
  awaiting: "PENDING_APPROVAL",
  held: "AWAITING_GO_LIVE",
};

/** The words that change with the list, so the markup below reads the same for all three. */
const WORDS: Record<View, { one: string; many: string; loading: string; search: string; none: string; noMatch: string }> = {
  invited: {
    one: "invitation",
    many: "invitations",
    loading: "Loading invitations",
    search: "Search invitations",
    none: "Everybody who has been invited has accepted.",
    noMatch: "No invitations match this search.",
  },
  awaiting: {
    one: "hire",
    many: "hires",
    loading: "Loading hires awaiting approval",
    search: "Search hires awaiting approval",
    none: "No hire is waiting for approval.",
    noMatch: "No hires awaiting approval match this search.",
  },
  held: {
    one: "invitation",
    many: "invitations",
    loading: "Loading invitations held for go-live",
    search: "Search invitations held for go-live",
    none: "No invitation is waiting for go-live.",
    noMatch: "No invitations held for go-live match this search.",
  },
};

/**
 * Who has been invited and has not yet accepted.
 *
 * The server applies the status filter and the active branch lens before it
 * counts or returns anything. Search also stays server-side so finding a name
 * is not limited to the current page.
 *
 * Activation remains an action only the invited person can complete by opening
 * the single-use link and setting a first password. Resend helps a person who
 * has not done that; withdrawal protects a school when the hire or address is
 * wrong.
 *
 * **Two other kinds of person have been sent nothing yet**, and each is a list
 * of its own rather than more invitations (see `invitationKind`). A hire
 * awaiting approval waits on the school's approvers in Workflow. Somebody
 * imported while the school was being set up is invited at go-live, with
 * everybody else. The switch between lists appears only while there is more
 * than one kind to show, and withdrawing from either closes the record without
 * anything having been sent. A held invitation still unsent after go-live can
 * be sent from here, which is how the server lets a school invite somebody the
 * go-live release left behind.
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
  const [view, setView] = useState<View>("invited");
  const words = WORDS[view];
  const lensBranch = multiBranch && branch !== "all" ? String(branch) : undefined;

  const { data, isLoading, isFetching, isError, refetch } = useGetStaffListQuery({
    page,
    search: deferredSearch || undefined,
    employment_status: STATUS[view],
    branch: lensBranch,
  });
  // How many wait in the other two lists, which decides whether the switch shows.
  const { data: awaitingData } = useGetStaffListQuery(
    { page: 1, employment_status: "PENDING_APPROVAL", branch: lensBranch },
    { skip: view === "awaiting" },
  );
  const { data: heldData } = useGetStaffListQuery(
    { page: 1, employment_status: "AWAITING_GO_LIVE", branch: lensBranch },
    { skip: view === "held" },
  );
  const countOf = (kind: View, probe: typeof data) =>
    (view === kind ? data : probe)?.pagination?.totalItems ?? 0;
  const awaitingCount = countOf("awaiting", awaitingData);
  const heldCount = countOf("held", heldData);
  const tabs: [View, string][] = [
    ["invited", "Invited"],
    ...(awaitingCount > 0 || view === "awaiting"
      ? [["awaiting", `Awaiting approval (${awaitingCount})`] as [View, string]]
      : []),
    ...(heldCount > 0 || view === "held"
      ? [["held", `Invited at go-live (${heldCount})`] as [View, string]]
      : []),
  ];
  // The list names a starting role only once the school is live.
  const schoolLive = data?.starting_role != null;
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
  // A hire awaiting approval has nothing to send; a held one only once live.
  const offersSend = view === "invited" || (view === "held" && schoolLive);

  async function resendTo(person: StaffListRow) {
    const held = invitationKind(person) === "held";
    if (!sendable(person, schoolLive)) {
      toast.info(
        held
          ? "Invitations for staff imported during setup go out when the school goes live."
          : `${person.full_name} has already set a password, so there is nothing to resend.`,
      );
      return;
    }
    try {
      await resend(person.id).unwrap();
      toast.success(
        held
          ? `Invitation sent${person.email ? ` to ${person.email}` : ""}.`
          : `Sent again${person.email ? ` to ${person.email}` : ""}. The previous link no longer works.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not send that invitation. Try again."),
      );
    }
  }

  function switchTo(next: View) {
    setView(next);
    setPage(1);
    setSelected(null);
  }

  function startRevoke(person: StaffListRow) {
    setSelected(null);
    setRevoking(person);
  }

  async function confirmRevoke(reason: string) {
    if (!revoking) return;
    const kind = invitationKind(revoking);
    try {
      await revoke({ id: revoking.id, reason }).unwrap();
      toast.success(
        kind === "hire"
          ? `${revoking.full_name}'s hire was withdrawn. Nothing was sent to them.`
          : kind === "held"
            ? `${revoking.full_name}'s invitation was withdrawn before it was sent. Nothing was sent to them.`
            : `${revoking.full_name}'s invitation was withdrawn.`,
      );
      setRevoking(null);
    } catch (error) {
      toast.error(
        apiErrorMessage(
          error,
          kind === "hire"
            ? "We could not withdraw that hire. Try again."
            : "We could not withdraw that invitation. Try again.",
        ),
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

  const summary =
    view === "awaiting"
      ? total
        ? `${total} ${total === 1 ? "hire is" : "hires are"} waiting for the school's approval.`
        : "No hire is waiting for approval."
      : view === "held"
        ? total
          ? schoolLive
            ? `${total} ${total === 1 ? "invitation" : "invitations"} from setup ${total === 1 ? "was" : "were"} not sent when the school went live.`
            : `${total} ${total === 1 ? "person is" : "people are"} invited when the school goes live.`
          : "No invitation is waiting for go-live."
        : total
          ? `${total} ${total === 1 ? "person is" : "people are"} waiting to activate their account.`
          : "Everybody who has been invited has accepted.";

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
            Invitations
          </h1>
          <p className="mt-1 text-sm text-gray-01">{summary}</p>
        </div>
        <PermissionGate permission={P.INVITE_TEACHER}>
          <Button onClick={() => navigate(routesPath.PROTECTED.STAFF.ADD)}>
            <UserPlus className="size-4" />
            Add staff
          </Button>
        </PermissionGate>
      </div>

      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="Which people to show"
          className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-gray-04 p-1 sm:w-fit"
        >
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => switchTo(key)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium",
                view === key
                  ? "bg-white text-black-01 shadow-sm"
                  : "text-gray-01 hover:text-black-01",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {view === "awaiting" ? (
        <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs leading-5 text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          <span>
            Your school approves each new hire before they are invited. These
            wait on the school&apos;s approvers in Workflow, and nothing is sent
            to them until a hire is approved.{" "}
            <Link
              to={routesPath.PROTECTED.WORKFLOW.APPROVALS}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Open Approvals
            </Link>
          </span>
        </p>
      ) : view === "held" ? (
        <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs leading-5 text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          {schoolLive
            ? "These were imported while the school was being set up, and their invitations were not sent when it went live. Send each one from here."
            : "These were imported while the school is being set up. Their invitations go out when the school goes live, and nothing is sent to them before then."}
        </p>
      ) : (
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
      )}

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
              aria-label={words.search}
              className="h-10.5 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <p className="ml-auto text-xs text-gray-05" aria-live="polite">
            {total} {total === 1 ? words.one : words.many}
          </p>
        </div>
      </div>

      <CustomTable
        tableHeaderList={[
          "Person",
          "Role",
          ...(showBranch ? ["Branch"] : []),
          view === "invited" ? "Sent" : "Added",
          "Waiting",
          "Status",
          "Actions",
        ]}
        loading={isLoading || isFetching}
        loadingText={words.loading}
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
            [view === "invited" ? "Sent" : "Added"]: person.invited_at
              ? formatDate(person.invited_at)
              : "-",
            Waiting: (
              <Badge variant={age != null && age >= 7 ? "amber" : "inactive"}>
                <Clock3 className="size-3" />
                {waitingLabel(age)}
              </Badge>
            ),
            Status:
              view === "awaiting" ? (
                <Badge variant="pending">Awaiting approval</Badge>
              ) : view === "held" ? (
                <Badge variant="blue">Invited at go-live</Badge>
              ) : (
                <Badge variant="pending">Awaiting response</Badge>
              ),
            Actions: (
              <span
                className="flex items-center justify-end gap-1.5"
                onClick={(event) => event.stopPropagation()}
              >
                {offersSend && actionsFor(person).resend && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resending || !sendable(person, schoolLive)}
                    onClick={() => void resendTo(person)}
                  >
                    <RefreshCw className="size-3.5" />
                    {view === "held" ? "Send" : "Resend"}
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
        emptyText={deferredSearch ? words.noMatch : words.none}
      />

      {view === "invited" && (
        <p className="flex items-start gap-1.5 text-xs leading-5 text-gray-05">
          <Info className="mt-px size-3.5 shrink-0" />
          Only the invited person can activate this account by opening the link
          and setting their first password.
          {hasPermission(P.INVITE_TEACHER) &&
            " Resending keeps the same staff record and invalidates the previous link."}
        </p>
      )}

      <InvitationDetailDrawer
        person={selected}
        showBranch={showBranch}
        schoolLive={schoolLive}
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
