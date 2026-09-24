import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  Clock3,
  FileText,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { Panel as Surface } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import PermissionGate from "@/components/custom/permission-gate";
import Tabs from "@/components/custom/tab";
import { P } from "@/permissions";
import { usePermissions } from "@/hooks/use-permissions";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
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
import { leaveNote } from "../leave-note";
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
import {
  getStaffProfileCompleteness,
  type StaffProfileGap,
} from "../profile-completeness";

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
 * Employment and account state remain separate, and the overview highlights
 * only missing fields the current API can save. Detail collections continue to
 * load only when their tab is opened.
 */
export default function StaffProfile() {
  const { id } = useParams();
  const staffId = Number(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tab = params.get("tab") ?? "overview";
  const [drawer, setDrawer] = useState<StaffDrawerRequest | null>(null);

  const { data, isLoading, isError, refetch } = useGetStaffMemberQuery(
    staffId,
    {
      skip: !Number.isFinite(staffId),
    },
  );
  const person = data?.data;
  const completeness = useMemo(
    () => (person ? getStaffProfileCompleteness(person) : undefined),
    [person],
  );

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
        `Invitation resent${person.email ? ` to ${person.email}` : ""}. The previous link no longer works.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(
          error,
          "We could not resend that invitation. Try again.",
        ),
      );
    }
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <Surface
        as="section"
        className="overflow-hidden rounded-xl px-4 py-5 sm:px-6"
      >
        {isLoading || !person ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start gap-4.5">
                <PersonAvatar
                  name={person.full_name}
                  photoUrl={person.photo_url ?? undefined}
                  className="size-16"
                  textClassName="text-lg"
                />

                <div className="min-w-55 flex-1">
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
                    {person.full_name}
                  </h1>
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
                        <span className="text-gray-05">
                          {person.branch_name}
                        </span>
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
                  {/* Both status labels remain visible when their values match.
                    "Active" for most people at most schools, and two identical
                    chips are otherwise ambiguous. */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-gray-05">Employment</span>
                      <EmploymentBadge
                        status={person.display_employment_status}
                        label={person.display_employment_status_label}
                        note={leaveNote(person)}
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

              <div className="mt-4 flex flex-wrap gap-2.5">
                <PermissionGate permission={P.MODIFY_TEACHER}>
                  <Button
                    size="sm"
                    onClick={() =>
                      setDrawer({ kind: "edit", staffId: person.id })
                    }
                  >
                    Edit staff
                  </Button>
                </PermissionGate>
                <PermissionGate permission={P.TRANSITION_TEACHER}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDrawer({ kind: "status", staffId: person.id })
                    }
                  >
                    Change status
                  </Button>
                </PermissionGate>
                {person.account.status === "LOCKED" && (
                  <PermissionGate permission={P.REACTIVATE_ADMINISTRATOR}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actingOnAccount}
                      onClick={() => void unlock()}
                    >
                      <KeyRound className="size-4" />
                      Unlock account
                    </Button>
                  </PermissionGate>
                )}
                {person.can_resend && (
                  <PermissionGate permission={P.INVITE_TEACHER}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resending}
                      onClick={() => void resendInvite()}
                    >
                      <Mail className="size-4" />
                      Resend invitation
                    </Button>
                  </PermissionGate>
                )}
                <PermissionGate permission={P.ASSIGN_ROLE}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDrawer({ kind: "role", staffId: person.id })
                    }
                  >
                    Manage roles
                  </Button>
                </PermissionGate>
              </div>
              <Lifecycle lifecycle={person.lifecycle} />
            </div>

            <CompletenessCard completeness={completeness} />
          </div>
        )}
      </Surface>

      <div className="max-w-full overflow-x-auto">
        <Tabs tabKey="tab" tabs={TABS} />
      </div>

      {person ? (
        tab === "overview" ? (
          <OverviewTab
            person={person}
            completeness={completeness}
            onOpenDrawer={setDrawer}
            onOpenTab={(nextTab) => navigate(`?tab=${nextTab}`)}
          />
        ) : (
          <Surface as="section" className="rounded-xl px-4 py-5 sm:px-6">
            <TabBody tab={tab} person={person} onOpenDrawer={setDrawer} />
          </Surface>
        )
      ) : (
        <Surface as="section" className="rounded-xl px-4 py-5 sm:px-6">
          <TabSkeleton />
        </Surface>
      )}

      <StaffDrawers request={drawer} onClose={() => setDrawer(null)} />
    </PageShell>
  );
}

function Dot() {
  return <span aria-hidden className="size-1 rounded-full bg-gray-02" />;
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
  // holds; filing somebody else's needs update, which is a different job.
  const mayFileLeave = isSelf
    ? hasPermission(P.APPLY_FOR_LEAVE)
    : hasPermission(P.UPDATE_LEAVE);

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

  if (tab === "access") {
    if (roles.isLoading || !roles.data) return <TabSkeleton />;
    return (
      <AccessTab
        roles={roles.data.data}
        staffId={person.id}
        userId={person.user_id}
        userName={person.full_name}
        onOpenDrawer={onOpenDrawer}
      />
    );
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
  return <Empty>Choose a staff tab to view its details.</Empty>;
}

/**
 * Staff summary from the detail record.
 *
 * Payroll stays in finance because its permissions and source of truth are
 * different. Qualifications and documents are counted but are not called
 * missing because the API does not declare which ones a role requires.
 */
function OverviewTab({
  person,
  completeness,
  onOpenDrawer,
  onOpenTab,
}: {
  person: StaffDetail;
  completeness?: ReturnType<typeof getStaffProfileCompleteness>;
  onOpenDrawer: (request: StaffDrawerRequest) => void;
  onOpenTab: (tab: string) => void;
}) {
  // Personal details follow Field Access: one the viewer may not read is not listed.
  const access = useFieldAccess(FIELD_RESOURCE.STAFF, person);
  const personal = [
    { label: "Full name", value: person.full_name },
    { label: "Middle name", value: person.middle_name || "-" },
    { name: "gender", label: "Gender", value: titleCase(person.gender) || "-" },
    { name: "date_of_birth", label: "Date of birth", value: formatDate(person.date_of_birth ?? null) },
    { name: "email", label: "Email", value: person.email || "Not recorded" },
    { name: "phone", label: "Phone", value: person.phone || "Not recorded" },
  ].filter((row) => !row.name || !access.isHidden(row.name));
  const employment = [
    { label: "Staff ID", value: person.staff_number || "Not issued" },
    { label: "Job title", value: person.job_title || "Not recorded" },
    {
      label: "Employment type",
      value: titleCase(person.employment_type) || "Not recorded",
    },
    { label: "Hire date", value: formatDate(person.hire_date) },
    {
      label: "Posting",
      value: person.posted_school_wide
        ? "School-wide"
        : person.branch_name || "This school",
    },
    {
      label: "Roles",
      value: person.roles.length ? person.roles.join(", ") : "No role assigned",
    },
    {
      label: "Length of service",
      value: person.tenure
        ? [
            person.tenure.years &&
              `${person.tenure.years} ${person.tenure.years === 1 ? "year" : "years"}`,
            person.tenure.months &&
              `${person.tenure.months} ${person.tenure.months === 1 ? "month" : "months"}`,
          ]
            .filter(Boolean)
            .join(", ") || "Less than a month"
        : "Not known until a hire date is recorded",
    },
    ...(person.exit_date
      ? [{ label: "Last working day", value: formatDate(person.exit_date) }]
      : []),
  ];

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.9fr)]">
      <div className="grid min-w-0 content-start gap-4">
        <ProfilePanel title="Personal and contact" icon={UserRound}>
          <DetailGrid rows={personal} />
        </ProfilePanel>

        <ProfilePanel title="Employment" icon={BriefcaseBusiness}>
          <DetailGrid rows={employment} />
        </ProfilePanel>

        <div className="grid gap-4 sm:grid-cols-3">
          <SnapshotCard
            icon={BookOpen}
            title="Teaching"
            value={person.counts.teaching_assignments}
            label={
              person.counts.teaching_assignments === 1
                ? "assignment"
                : "assignments"
            }
            action="View teaching"
            onOpen={() => onOpenTab("teaching")}
            tone="bg-violet-50 text-violet-800"
          />
          <SnapshotCard
            icon={ShieldCheck}
            title="Qualifications"
            value={person.counts.qualifications}
            label={
              person.counts.qualifications === 1 ? "record" : "records"
            }
            action="View qualifications"
            onOpen={() => onOpenTab("qualifications")}
            tone="bg-blue-50 text-blue-800"
          />
          <SnapshotCard
            icon={FileText}
            title="Documents"
            value={person.counts.documents}
            label={person.counts.documents === 1 ? "file" : "files"}
            action="View documents"
            onOpen={() => onOpenTab("documents")}
            tone="bg-emerald-50 text-emerald-800"
          />
        </div>
      </div>

      <aside className="grid min-w-0 content-start gap-4">
        <MissingInformation
          completeness={completeness}
          onGap={() => onOpenDrawer({ kind: "edit", staffId: person.id })}
        />

        <ProfilePanel
          title="Access and reach"
          icon={ShieldCheck}
          action={
            <PermissionGate permission={P.ASSIGN_ROLE}>
              <button
                type="button"
                onClick={() =>
                  onOpenDrawer({ kind: "role", staffId: person.id })
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                Manage access
              </button>
            </PermissionGate>
          }
        >
          <DetailList
            rows={[
              { label: "Account", value: person.account.label },
              {
                label: "Roles",
                value: person.roles.length
                  ? person.roles.join(", ")
                  : "No role assigned",
              },
              {
                label: "Reach",
                value: person.posted_school_wide
                  ? "School-wide"
                  : person.branch_name || "This school",
              },
            ]}
          />
        </ProfilePanel>

        <ProfilePanel
          title="Leave snapshot"
          icon={CalendarClock}
          action={
            <button
              type="button"
              onClick={() => onOpenTab("leave")}
              className="text-xs font-medium text-primary hover:underline"
            >
              View leave
            </button>
          }
        >
          <p
            className={cn(
              "text-sm font-medium",
              person.on_leave_today
                ? "text-violet-700"
                : "text-emerald-700",
            )}
          >
            {person.on_leave_today
              ? leaveNote(person) || "On approved leave today"
              : "Available today"}
          </p>
          <p className="mt-1 text-xs text-gray-05">
            {person.counts.leave_requests}{" "}
            {person.counts.leave_requests === 1
              ? "leave request"
              : "leave requests"}{" "}
            on record
          </p>
        </ProfilePanel>

        <ProfilePanel title="Recent activity" icon={Clock3}>
          <ol className="grid gap-3">
            {person.invited_at && (
              <ActivityRow
                title="Invitation sent"
                detail={formatDate(person.invited_at)}
                tone="bg-violet-500"
              />
            )}
            <ActivityRow
              title="Employment record"
              detail={
                person.created_by
                  ? `Added by ${person.created_by.name}`
                  : "Added to this school"
              }
              tone="bg-emerald-600"
            />
          </ol>
        </ProfilePanel>
      </aside>
    </div>
  );
}

function CompletenessCard({
  completeness,
}: {
  completeness?: ReturnType<typeof getStaffProfileCompleteness>;
}) {
  if (!completeness) return <Skeleton className="h-24 w-full rounded-xl" />;
  const gapCount = completeness.gaps.length;

  return (
    <div className="flex min-w-0 items-center gap-3 self-start rounded-xl border border-border bg-white-05 p-3">
      <div className="relative grid size-14 shrink-0 place-content-center self-center text-primary">
        <svg
          viewBox="0 0 44 44"
          className="absolute inset-0 size-full -rotate-90"
        >
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="4"
          />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="4"
            pathLength="100"
            strokeDasharray={`${completeness.percentage} 100`}
          />
        </svg>
        <span className="text-xs font-semibold text-black-01">
          {completeness.percentage}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-black-01">
          Profile completeness
        </p>
        <p
          className={cn(
            "mt-1 text-xs",
            gapCount ? "text-amber-700" : "text-emerald-700",
          )}
        >
          {gapCount
            ? `${gapCount} ${gapCount === 1 ? "detail" : "details"} still missing`
            : "This record is complete"}
        </p>
        {gapCount > 0 && (
          <PermissionGate permission={P.MODIFY_TEACHER}>
            <Button
              size="sm"
              className="mt-2 h-8 w-full"
              onClick={() =>
                document
                  .getElementById("staff-missing-information")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              Complete profile
            </Button>
          </PermissionGate>
        )}
      </div>
    </div>
  );
}

function MissingInformation({
  completeness,
  onGap,
}: {
  completeness?: ReturnType<typeof getStaffProfileCompleteness>;
  onGap: (gap: StaffProfileGap) => void;
}) {
  if (!completeness) return <Skeleton className="h-44 w-full rounded-xl" />;
  const gaps = completeness.gaps.slice(0, 5);

  return (
    <section
      id="staff-missing-information"
      className={cn(
        "min-w-0 rounded-xl border p-4 sm:p-5",
        gaps.length
          ? "border-amber-200 bg-amber-50/70"
          : "border-emerald-200 bg-emerald-50/60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-8 shrink-0 place-content-center rounded-lg",
            gaps.length
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          {gaps.length ? (
            <AlertTriangle className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-black-01">
            {gaps.length ? "Missing information" : "Record complete"}
          </h3>
          <p className="mt-0.5 text-xs text-gray-01">
            {gaps.length
              ? "Fill these details to keep this staff record useful."
              : "The expected employment and contact details are recorded."}
          </p>
        </div>
      </div>
      {gaps.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {gaps.map((gap) => (
            <li key={gap.key}>
              <PermissionGate
                permission={P.MODIFY_TEACHER}
                fallback={
                  <span className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-black-01">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    {gap.label}
                  </span>
                }
              >
                <button
                  type="button"
                  onClick={() => onGap(gap)}
                  className="flex w-full items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-left text-xs text-black-01 hover:bg-white"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  <span className="min-w-0 flex-1 truncate">{gap.label}</span>
                  <span className="font-medium text-primary">Fill</span>
                </button>
              </PermissionGate>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfilePanel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Surface as="section" className="rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
        <Icon className="size-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-black-01">{title}</h3>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </Surface>
  );
}

function DetailGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-xs text-gray-05">{row.label}</dt>
          <dd
            className={cn(
              "mt-1 min-w-0 break-words text-sm text-black-01",
              ["Not recorded", "Not issued", "No role assigned"].includes(
                row.value,
              ) && "text-amber-700",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DetailList({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-2.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-0.5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-3"
        >
          <dt className="text-xs text-gray-05">{row.label}</dt>
          <dd className="min-w-0 break-words text-sm text-black-01">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SnapshotCard({
  icon: Icon,
  title,
  value,
  label,
  action,
  onOpen,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  label: string;
  action: string;
  onOpen: () => void;
  tone: string;
}) {
  return (
    <Surface as="section" className="rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="size-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-black-01">{title}</h3>
        <button
          type="button"
          onClick={onOpen}
          className="ml-auto text-xs font-medium text-primary hover:underline"
        >
          {action}
        </button>
      </div>
      <div className={cn("mt-4 rounded-lg px-3 py-5 text-center", tone)}>
        <p className="text-3xl font-semibold leading-none">{value}</p>
        <p className="mt-2 text-xs opacity-75">{label}</p>
      </div>
    </Surface>
  );
}

function ActivityRow({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: string;
}) {
  return (
    <li className="flex min-w-0 gap-2.5">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone)} />
      <div className="min-w-0">
        <p className="text-sm text-black-01">{title}</p>
        <p className="text-xs text-gray-05">{detail}</p>
      </div>
    </li>
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
