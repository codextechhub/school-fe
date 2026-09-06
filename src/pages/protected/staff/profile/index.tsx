import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { KeyRound, Mail, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { Panel as Surface } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import PermissionGate from "@/components/custom/permission-gate";
import Tabs from "@/components/custom/tab";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAppSelector } from "@/redux/store";
import { selectUser } from "@/redux/features/auth/auth-slice";
import { apiErrorMessage } from "@/utils/api-error";
import {
  useGetStaffDocumentsQuery,
  useGetStaffHistoryQuery,
  useGetStaffLeaveQuery,
  useGetStaffMemberQuery,
  useGetStaffQualificationsQuery,
  useGetStaffRolesQuery,
  useGetStaffTeachingQuery,
  useResendStaffInvitationMutation,
  useStaffAccountActionMutation,
} from "@/redux/services/staff/staff-api";
import type { StaffDetail } from "@/redux/services/staff/staff-types";

import { AccountBadge, EmploymentBadge } from "../badges";
import { PersonAvatar } from "../../students/person-avatar";
import { formatDate } from "../../students/format";
import { Lifecycle } from "./lifecycle";
import {
  AccessTab,
  DocumentsTab,
  Empty,
  HistoryTab,
  LeaveTab,
  QualificationsTab,
  TabSkeleton,
  TeachingTab,
} from "./tab-panels";
import { StaffDrawers, type StaffDrawerRequest } from "../drawers";

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Teaching", value: "teaching" },
  { label: "Access", value: "access" },
  { label: "Qualifications", value: "qualifications" },
  { label: "Documents", value: "documents" },
  { label: "Leave", value: "leave" },
  { label: "History", value: "history" },
];

/**
 * One person's record.
 *
 * **The header carries two statuses, side by side and never merged.** The
 * employment chip is what this module owns; the account chip is the identity
 * layer's. Mrs. Okafor mistypes her password three times on a Tuesday morning:
 * she reads Active and Locked, in that order, and the Unlock button sits beside
 * the account fact rather than beside her job. A single chip would have told
 * her school she was suspended.
 *
 * **Each tab fetches only when it is opened.** Six endpoints behind seven tabs,
 * and a head teacher opening a profile to check a phone number should not pull
 * an audit trail, a document list and a leave history to do it.
 *
 * **The tab lives in the URL**, so a colleague can be sent the link to somebody's
 * Access tab rather than "open him and click the third one".
 */
export default function StaffProfile() {
  const { id } = useParams();
  const staffId = Number(id);
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const [drawer, setDrawer] = useState<StaffDrawerRequest | null>(null);

  const { data, isLoading, isError, refetch } = useGetStaffMemberQuery(staffId, {
    skip: !Number.isFinite(staffId),
  });
  const person = data?.data;

  const [resend, { isLoading: resending }] = useResendStaffInvitationMutation();
  const [accountAction, { isLoading: actingOnAccount }] =
    useStaffAccountActionMutation();

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={UserRound}
          title="We could not load this record"
          body="It may have been removed, or something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  async function unlock() {
    if (!person) return;
    try {
      await accountAction({ id: person.id, action: "unlock" }).unwrap();
      toast.success(`${person.full_name} can sign in again.`);
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not unlock that account. Try again."),
      );
    }
  }

  async function resendInvite() {
    if (!person) return;
    try {
      await resend(person.id).unwrap();
      toast.success(
        `Invitation resent to ${person.email}. The previous link no longer works.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not resend that invitation. Try again."),
      );
    }
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <Surface as="section" className="px-6 py-5.5">
        {isLoading || !person ? (
          <div className="grid gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-4.5">
              <PersonAvatar
                name={person.full_name}
                photoUrl={person.photo_url ?? undefined}
                className="size-16"
                textClassName="text-lg"
              />

              <div className="min-w-55 flex-1">
                <h2 className="text-[22px] font-semibold text-black-01">
                  {person.full_name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
                  <span
                    className={
                      person.staff_number ? "text-gray-01" : "text-gray-02"
                    }
                  >
                    {person.staff_number || "No staff ID"}
                  </span>
                  <Dot />
                  <span className="text-gray-01">
                    {person.job_title || "No job title"}
                  </span>
                  {person.branch_name && (
                    <>
                      <Dot />
                      <span className="text-gray-05">{person.branch_name}</span>
                    </>
                  )}
                  {person.roles.length > 0 && (
                    <>
                      <Dot />
                      <span className="text-gray-05">
                        {person.roles.join(", ")}
                      </span>
                    </>
                  )}
                </div>
                {/* **Labelled, not two bare chips.** Both statuses read
                    "Active" for most people at most schools, and two identical
                    green chips beside a name say nothing and hide which is
                    which. Naming them is what makes the pair legible on the one
                    record where they differ: Mrs. Okafor reads Employment
                    Active, Account Locked, and the sentence underneath says her
                    employment is unaffected. */}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xs text-gray-05">Employment</span>
                    <EmploymentBadge
                      status={person.employment_status}
                      label={person.employment_status_label}
                    />
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="text-xs text-gray-05">Account</span>
                    <AccountBadge
                      status={person.account.status}
                      label={person.account.label}
                    />
                  </span>
                </div>
                {/* The server's own sentence about the disagreement, where
                    there is one. It is what stops a lockout being read as a
                    discipline, so it is rendered rather than reworded. */}
                {person.account_flag && (
                  <p className="mt-1.5 text-xs text-gray-05">
                    {person.account_flag.note}
                  </p>
                )}
              </div>
            </div>

            <Lifecycle lifecycle={person.lifecycle} />

            {/* Wraps rather than scrolls: actions on a phone belong on two rows
                rather than behind a sideways drag. Each is gated on the key the
                SERVER checks for it, so a reader who cannot do the thing is not
                shown a button that fills in a drawer and is refused at Save. */}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <PermissionGate permission={P.MODIFY_TEACHER}>
                <Button
                  variant="outline"
                  onClick={() => setDrawer({ kind: "edit", staffId: person.id })}
                >
                  Edit record
                </Button>
              </PermissionGate>
              <PermissionGate permission={P.MANAGE_TEACHERS}>
                <Button
                  variant="outline"
                  onClick={() =>
                    setDrawer({ kind: "status", staffId: person.id })
                  }
                >
                  Change status
                </Button>
              </PermissionGate>
              {/* Offered only where the account is actually locked. The server
                  answers 422 otherwise, and a button that is always there is a
                  button that is usually wrong. */}
              {person.account.status === "LOCKED" && (
                <PermissionGate permission={P.REACTIVATE_ADMINISTRATOR}>
                  <Button
                    variant="outline"
                    disabled={actingOnAccount}
                    onClick={() => void unlock()}
                  >
                    <KeyRound className="size-4" />
                    Unlock account
                  </Button>
                </PermissionGate>
              )}
              {/* `can_resend` is the SERVER's answer, so this button can never
                  contradict the API: it is offered exactly when there is an
                  unused invitation to send again. */}
              {person.can_resend && (
                <PermissionGate permission={P.INVITE_TEACHER}>
                  <Button
                    variant="outline"
                    disabled={resending}
                    onClick={() => void resendInvite()}
                  >
                    <Mail className="size-4" />
                    Resend invitation
                  </Button>
                </PermissionGate>
              )}
            </div>
          </>
        )}
      </Surface>

      <div className="max-w-full overflow-x-auto">
        <Tabs tabKey="tab" tabs={TABS} />
      </div>

      <Surface as="section" className="px-6 py-5.5">
        {person ? (
          <TabBody tab={tab} person={person} onOpenDrawer={setDrawer} />
        ) : (
          <TabSkeleton />
        )}
      </Surface>

      <StaffDrawers request={drawer} onClose={() => setDrawer(null)} />
    </PageShell>
  );
}

function Dot() {
  return (
    <span aria-hidden className="size-1 rounded-full bg-gray-02" />
  );
}

/**
 * One tab's body, and the query behind it.
 *
 * Every query is skipped unless its tab is open, which is what keeps a profile
 * to two requests instead of seven. The record itself carries `counts`, so the
 * tab strip could show how much is behind each one without fetching any of it -
 * left out for now because a badge on every tab is noise where most are empty.
 */
function TabBody({
  tab,
  person,
  onOpenDrawer,
}: {
  tab: string;
  person: StaffDetail;
  onOpenDrawer: (request: StaffDrawerRequest) => void;
}) {
  const { hasPermission } = usePermissions();
  const signedInUserId = useAppSelector(selectUser)?.id;
  // Whose record this is. `user_id` is the ACCOUNT, which is what the signed-in
  // user carries; the staff id is a different number and comparing the two
  // would make everybody's leave look like somebody else's.
  const isSelf = signedInUserId != null && signedInUserId === person.user_id;
  // Applying for your own needs the apply key, which every member of staff
  // holds; filing somebody else's needs manage, which is a different job.
  const mayFileLeave = isSelf
    ? hasPermission(P.APPLY_FOR_LEAVE)
    : hasPermission(P.MANAGE_LEAVE);

  const roles = useGetStaffRolesQuery(person.id, { skip: tab !== "access" });
  const teaching = useGetStaffTeachingQuery(
    { id: person.id },
    { skip: tab !== "teaching" },
  );
  const quals = useGetStaffQualificationsQuery(person.id, {
    skip: tab !== "qualifications",
  });
  const docs = useGetStaffDocumentsQuery(person.id, {
    skip: tab !== "documents",
  });
  const leave = useGetStaffLeaveQuery(person.id, { skip: tab !== "leave" });
  const history = useGetStaffHistoryQuery(person.id, {
    skip: tab !== "history",
  });

  if (tab === "overview") return <OverviewTab person={person} />;

  if (tab === "access") {
    if (roles.isLoading || !roles.data) return <TabSkeleton />;
    return <AccessTab roles={roles.data.data} />;
  }
  if (tab === "teaching") {
    // Closed before go-live, and that is a refusal rather than an error: a
    // school still being set up has no year to teach in yet.
    if (teaching.isError) {
      return (
        <Empty>
          Teaching duties open when the school goes live and its academic year
          is running.
        </Empty>
      );
    }
    if (teaching.isLoading || !teaching.data) return <TabSkeleton />;
    return <TeachingTab teaching={teaching.data.data} />;
  }
  if (tab === "qualifications") {
    if (quals.isLoading || !quals.data) return <TabSkeleton />;
    return <QualificationsTab rows={quals.data.data} />;
  }
  if (tab === "documents") {
    if (docs.isLoading || !docs.data) return <TabSkeleton />;
    return <DocumentsTab rows={docs.data.data} />;
  }
  if (tab === "leave") {
    if (leave.isError) {
      return (
        <Empty>
          Leave opens when the school goes live. Nobody applies for time off
          during setup.
        </Empty>
      );
    }
    if (leave.isLoading || !leave.data) return <TabSkeleton />;
    return (
      <LeaveTab
        leave={leave.data.data}
        onFile={
          mayFileLeave
            ? () =>
                onOpenDrawer({
                  kind: "leave",
                  staffId: person.id,
                  personName: person.full_name,
                  isSelf,
                })
            : undefined
        }
        fileLabel={isSelf ? "Apply for leave" : "Record leave"}
      />
    );
  }
  if (tab === "history") {
    if (history.isLoading || !history.data) return <TabSkeleton />;
    return <HistoryTab entries={history.data.data.entries} />;
  }
  return <OverviewTab person={person} />;
}

/**
 * Bio, contact and employment, from the record itself.
 *
 * **No salary.** Payroll is the finance engine's record, held on
 * `EmployeeSalary` and read by somebody holding a finance key. A figure here
 * would be a second number with no rule about which wins, and it is the one a
 * bursar would read on the day they were asked what somebody earns.
 */
function OverviewTab({ person }: { person: StaffDetail }) {
  const bio: { label: string; value: string }[] = [
    { label: "Full name", value: person.full_name },
    { label: "Middle name", value: person.middle_name || "-" },
    { label: "Gender", value: titleCase(person.gender) || "-" },
    { label: "Date of birth", value: formatDate(person.date_of_birth) },
  ];
  const contact = [
    { label: "Email", value: person.email },
    { label: "Phone", value: person.phone || "-" },
  ];
  const employment = [
    { label: "Staff ID", value: person.staff_number || "Not issued" },
    { label: "Job title", value: person.job_title || "-" },
    {
      label: "Employment type",
      value: titleCase(person.employment_type) || "-",
    },
    { label: "Hire date", value: formatDate(person.hire_date) },
    {
      label: "Length of service",
      // Absent rather than guessed where no hire date was entered. When an
      // account was created is not when somebody started, and three years of
      // service read off an invitation date is a number nobody entered.
      value: person.tenure
        ? [
            person.tenure.years &&
              `${person.tenure.years} ${person.tenure.years === 1 ? "year" : "years"}`,
            person.tenure.months &&
              `${person.tenure.months} ${person.tenure.months === 1 ? "month" : "months"}`,
          ]
            .filter(Boolean)
            .join(", ") || "Less than a month"
        : "Not known - no hire date recorded",
    },
    ...(person.exit_date
      ? [{ label: "Last working day", value: formatDate(person.exit_date) }]
      : []),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Bio" rows={bio} />
      <Section title="Contact" rows={contact} />
      <Section title="Employment" rows={employment} />
    </div>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <section className="min-w-0">
      <h3 className="mb-3 text-sm font-semibold text-black-01">{title}</h3>
      <dl className="grid gap-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-0.5 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:gap-3"
          >
            <dt className="text-xs text-gray-05 sm:pt-0.5">{row.label}</dt>
            <dd className="min-w-0 break-words text-sm text-black-01">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "FULL_TIME" becomes "Full time". Only for the enums served without a label. */
function titleCase(code: string | null | undefined): string {
  if (!code) return "";
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
