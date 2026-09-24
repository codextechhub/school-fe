import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Clock3,
  FileText,
  HeartPulse,
  LockKeyhole,
  School,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { routesPath } from "@/routes/routesPath";
import { writeErrorMessage } from "@/utils/api-error";
import { useLazyFetchAuthMediaQuery } from "@/redux/services/media-api";
import {
  useGetStudentClassHistoryQuery,
  useGetStudentDocumentsQuery,
  useGetStudentGuardiansQuery,
  useGetStudentHistoryQuery,
  useGetStudentQuery,
  useGetStudentSubjectsQuery,
  useUploadStudentDocumentMutation,
  useDeleteStudentDocumentMutation,
} from "@/redux/services/students/students-api";
import type {
  StudentDetail,
  StudentDocumentRow,
  StudentGuardianLink,
  StudentStatus,
} from "@/redux/services/students/students-types";

import { StudentDrawers, type DrawerRequest } from "../drawers";
import { ConfirmDialog } from "../drawers/confirm-dialog";
import { formatDate, formatDateTime, titleCaseCode } from "../format";
import PermissionGate from "@/components/custom/permission-gate";
import { resolveFieldAccess, useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE, STUDENT_MEDICAL_FIELDS } from "@/lib/field-resources";
import Tabs from "@/components/custom/tab";
import { P } from "@/permissions";
import { useStudentsLens } from "@/hooks/use-students-lens";
import { Panel as Surface } from "@/components/custom/surface";

import { PhotoPicker } from "../photo-picker";
import { StudentStatusBadge } from "../status-badge";
import { Dot } from "../guardians/person-card";
import { Lifecycle } from "./lifecycle";
import { EmptyRing } from "../empty-ring";
import { Rows, type Row } from "./rows";
import {
  getStudentProfileCompleteness,
  type ProfileCompleteness,
  type ProfileGap,
} from "../profile-completeness";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "guardians", label: "Guardians" },
  { key: "academic", label: "Academic" },
  { key: "medical", label: "Medical" },
  { key: "documents", label: "Documents" },
  { key: "history", label: "History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * One student's operational record.
 *
 * Guardian and document summaries load with the record because they determine
 * whether it is complete. Class history, subjects, and full history remain
 * scoped to the views that display them. Sensitive health fields are rendered
 * only when the detail endpoint exposes them to the current viewer.
 */
export default function StudentProfile() {
  const { id } = useParams();
  const studentId = Number(id);
  // The tab lives in the URL, so a registrar can send a colleague the link to
  // a child's Guardians tab rather than "open him and click the third one".
  // Tabs owns the writing; this only reads.
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { pastYear } = useStudentsLens();
  const tab = (params.get("tab") as TabKey) ?? "overview";
  const [drawer, setDrawer] = useState<DrawerRequest | null>(null);

  const { data, isLoading, isError, refetch } = useGetStudentQuery(studentId, {
    skip: !Number.isFinite(studentId),
  });
  const student = data?.data;
  const { data: guardiansData, isLoading: guardiansLoading } =
    useGetStudentGuardiansQuery(studentId, {
      skip: !Number.isFinite(studentId),
    });
  const { data: documentsData, isLoading: documentsLoading } =
    useGetStudentDocumentsQuery(studentId, {
      skip: !Number.isFinite(studentId),
    });
  const guardians = guardiansData?.data;
  const documents = documentsData?.data;
  const completeness = useMemo(
    () =>
      student
        ? getStudentProfileCompleteness({ student, guardians, documents })
        : undefined,
    [student, guardians, documents],
  );

  function openGap(gap: ProfileGap) {
    if (!student) return;
    if (gap.destination === "guardian") {
      setDrawer({ kind: "guardian", studentId: student.id });
      return;
    }
    if (gap.destination === "documents") {
      navigate("?tab=documents");
      return;
    }
    setDrawer({
      kind: "edit",
      studentId: student.id,
      section: editSectionFor(gap.key),
    });
  }

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={UserRound}
          title="We could not load this student"
          body="The record may have been removed, or something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <Surface as="section" className="overflow-hidden rounded-xl px-4 py-5 sm:px-6">
        {isLoading || !student ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start gap-4.5">
                <StudentPhoto student={student} />

                <div className="min-w-55 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
                      {student.full_name}
                    </h1>
                    <StudentStatusBadge
                      status={student.status}
                      label={student.status_label}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px]">
                    <span
                      className={
                        student.student_number
                          ? "text-gray-01"
                          : "text-amber-700"
                      }
                    >
                      {student.student_number || "No admission number"}
                    </span>
                    <Dot />
                    <span
                      className={
                        student.class_name ? "text-gray-01" : "text-amber-700"
                      }
                    >
                      {student.class_name || "Unassigned"}
                    </span>
                    {student.level_name && (
                      <>
                        <Dot />
                        <span className="text-gray-05">
                          {student.level_name}
                        </span>
                      </>
                    )}
                    {student.branch_name && (
                      <>
                        <Dot />
                        <span className="text-gray-05">
                          {student.branch_name}
                        </span>
                      </>
                    )}
                    {student.session_name && (
                      <>
                        <Dot />
                        <span className="text-gray-05">
                          {student.session_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PermissionGate permission={P.MODIFY_STUDENT}>
                  <Button
                    size="sm"
                    onClick={() =>
                      setDrawer({ kind: "edit", studentId: student.id })
                    }
                  >
                    Edit student
                  </Button>
                </PermissionGate>
                <PermissionGate permission={P.ASSIGN_CLASS} disabled={pastYear}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDrawer({ kind: "transfer", studentId: student.id })
                    }
                  >
                    {student.class_name ? "Change class" : "Assign a class"}
                  </Button>
                </PermissionGate>
                <PermissionGate permission={P.TRANSITION_STUDENT}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDrawer({ kind: "status", studentId: student.id })
                    }
                  >
                    Change status
                  </Button>
                </PermissionGate>
                <PermissionGate permission={P.MODIFY_STUDENT}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDrawer({ kind: "guardian", studentId: student.id })
                    }
                  >
                    Link guardian
                  </Button>
                </PermissionGate>
              </div>

              <Lifecycle status={student.status} />
            </div>

            <CompletenessCard
              completeness={completeness}
              loading={guardiansLoading || documentsLoading}
            />
          </div>
        )}
      </Surface>

      <Tabs
        tabKey="tab"
        tabs={TABS.map((t) => ({ value: t.key, label: t.label }))}
      />

      {tab === "overview" && (
        <Overview
          loading={isLoading}
          student={student}
          guardians={guardians}
          documents={documents}
          completeness={completeness}
          onGap={openGap}
          onOpenTab={(nextTab) => navigate(`?tab=${nextTab}`)}
        />
      )}
      {tab === "guardians" && (
        <GuardiansTab
          links={guardians ?? []}
          loading={guardiansLoading}
        />
      )}
      {tab === "academic" && <AcademicTab studentId={studentId} student={student} />}
      {tab === "medical" && <MedicalTab loading={isLoading} student={student} />}
      {tab === "documents" && (
        <DocumentsTab
          studentId={studentId}
          docs={documents ?? []}
          loading={documentsLoading}
        />
      )}
      {tab === "history" && <HistoryTab studentId={studentId} />}

      <StudentDrawers request={drawer} onClose={() => setDrawer(null)} />
    </PageShell>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────

function Overview({
  student,
  loading,
  guardians,
  documents,
  completeness,
  onGap,
  onOpenTab,
}: {
  student?: StudentDetail;
  loading?: boolean;
  guardians?: StudentGuardianLink[];
  documents?: StudentDocumentRow[];
  completeness?: ProfileCompleteness;
  onGap: (gap: ProfileGap) => void;
  onOpenTab: (tab: TabKey) => void;
}) {
  const navigate = useNavigate();
  const { data: subjectsData, isLoading: subjectsLoading } =
    useGetStudentSubjectsQuery(student?.id ?? 0, { skip: !student });
  const access = useFieldAccess(FIELD_RESOURCE.STUDENTS, student);
  const primaryGuardian =
    guardians?.find((link) => link.is_primary) ?? guardians?.[0];
  const guardianAccess = useFieldAccess(
    FIELD_RESOURCE.GUARDIANS,
    primaryGuardian?.guardian,
  );

  if (loading || !student) return <PanelSkeleton />;

  const personal: Row[] = [
    { label: "Full name", value: student.full_name },
    {
      label: "Date of birth",
      value: student.date_of_birth
        ? `${formatDate(student.date_of_birth)}${student.age != null ? ` · ${student.age} years old` : ""}`
        : "-",
    },
    { label: "Gender", value: titleCaseCode(student.gender) || "-" },
    { label: "Nationality", value: student.nationality || "-" },
    { label: "State of origin", value: student.state_of_origin || "-" },
    { label: "Home address", value: student.address || "Not recorded" },
    { label: "Student phone", value: student.phone || "Not recorded" },
    { label: "Student email", value: student.email || "Not recorded" },
  ];
  const school: Row[] = [
    { label: "Admission number", value: student.student_number || "Not issued" },
    ...(access.isHidden("enrolment_date")
      ? []
      : [{ label: "Admission date", value: formatDate(student.enrolment_date ?? null) }]),
    { label: "Class", value: student.class_name || "Unassigned" },
    { label: "Level", value: student.level_name || "Not recorded" },
    { label: "Session", value: student.session_name || "-" },
    ...(student.branch_name
      ? [{ label: "Branch", value: student.branch_name }]
      : []),
    {
      label: "Previous school",
      value: student.previous_school || "Not recorded",
    },
  ];
  const requiredDocuments = documents?.filter((document) => document.required);
  const attachedRequired = requiredDocuments?.filter(
    (document) => document.attached,
  ).length;
  const subjects = subjectsData?.data ?? [];

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.9fr)]">
      <div className="grid min-w-0 content-start gap-4">
        <Panel title="Personal details" icon={UserRound}>
          <DetailGrid rows={personal} />
        </Panel>

        <Panel title="School details" icon={School}>
          <DetailGrid rows={school} />
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <SnapshotCard
            icon={BookOpen}
            title="Academic snapshot"
            value={subjectsLoading ? undefined : subjects.length}
            label={subjects.length === 1 ? "subject" : "subjects"}
            action="View academic"
            onOpen={() => onOpenTab("academic")}
            tone="bg-violet-50 text-violet-800"
          />
          <SnapshotCard
            icon={FileText}
            title="Document snapshot"
            value={documents ? attachedRequired : undefined}
            label={
              requiredDocuments
                ? `of ${requiredDocuments.length} required on file`
                : "required documents"
            }
            action="View documents"
            onOpen={() => onOpenTab("documents")}
            tone="bg-emerald-50 text-emerald-800"
          />
        </div>
      </div>

      <aside className="grid min-w-0 content-start gap-4">
        <MissingInformation
          completeness={completeness}
          onGap={onGap}
        />

        <Panel
          title="Primary guardian"
          icon={UsersRound}
          action={
            primaryGuardian ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    routesPath.PROTECTED.STUDENTS.GUARDIAN_DETAILS_ID(
                      primaryGuardian.guardian.id,
                    ),
                  )
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                View guardian
              </button>
            ) : undefined
          }
        >
          {primaryGuardian ? (
            <div className="grid gap-1.5">
              <p className="text-sm font-semibold text-black-01">
                {primaryGuardian.guardian.full_name}
              </p>
              <p className="text-xs text-gray-05">
                {primaryGuardian.relationship_label}
                {primaryGuardian.is_primary ? " · Primary contact" : ""}
              </p>
              {!guardianAccess.isHidden("phone") && (
                <p className="mt-1 text-sm text-black-01">
                  {primaryGuardian.guardian.phone || "No phone recorded"}
                </p>
              )}
              {!guardianAccess.isHidden("email") && (
                <p className="break-words text-xs text-gray-05">
                  {primaryGuardian.guardian.email || "No email recorded"}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-700">No guardian linked.</p>
          )}
        </Panel>

        <HealthSnapshot student={student} />

        <Panel title="Recent activity" icon={Clock3}>
          <ol className="grid gap-3">
            <ActivityRow
              title="Profile updated"
              detail={formatDateTime(student.updated_at)}
              tone="bg-emerald-600"
            />
            <ActivityRow
              title="Student record created"
              detail={formatDateTime(student.created_at)}
              tone="bg-violet-500"
            />
          </ol>
        </Panel>
      </aside>
    </div>
  );
}

function editSectionFor(key: string) {
  if (["address", "phone", "email"].includes(key)) return "contact" as const;
  if (["student_number", "enrolment_date", "previous_school"].includes(key)) {
    return "admission" as const;
  }
  if (
    [
      "blood_group",
      "allergies",
      "conditions",
      "emergency_contact_name",
      "emergency_contact_phone",
    ].includes(key)
  ) {
    return "medical" as const;
  }
  return "bio" as const;
}

function CompletenessCard({
  completeness,
  loading,
}: {
  completeness?: ProfileCompleteness;
  loading?: boolean;
}) {
  if (loading || !completeness) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  const gapCount = completeness.gaps.length;

  return (
    <div className="flex min-w-0 items-center gap-3 self-start rounded-xl border border-border bg-white-05 p-3">
      <div className="relative grid size-14 shrink-0 place-content-center self-center text-primary">
        <svg viewBox="0 0 44 44" className="absolute inset-0 size-full -rotate-90">
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
            gapCount > 0 ? "text-amber-700" : "text-emerald-700",
          )}
        >
          {gapCount > 0
            ? `${gapCount} ${gapCount === 1 ? "detail" : "details"} still missing`
            : "This record is complete"}
        </p>
        {gapCount > 0 && (
          <PermissionGate permission={P.MODIFY_STUDENT}>
            <Button
              size="sm"
              className="mt-2 h-8 w-full"
              onClick={() =>
                document
                  .getElementById("missing-information")
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

function DetailGrid({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-xs text-gray-05">{row.label}</dt>
          <dd
            className={cn(
              "mt-1 min-w-0 break-words text-sm text-black-01",
              ["Not recorded", "Not issued", "Unassigned"].includes(row.value) &&
                "text-amber-700",
            )}
          >
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
  value?: number;
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
      <div className={cn("mt-4 rounded-lg px-4 py-5 text-center", tone)}>
        {value === undefined ? (
          <Skeleton className="mx-auto h-8 w-14" />
        ) : (
          <p className="text-3xl font-semibold leading-none">{value}</p>
        )}
        <p className="mt-2 text-xs opacity-75">{label}</p>
      </div>
    </Surface>
  );
}

function MissingInformation({
  completeness,
  onGap,
}: {
  completeness?: ProfileCompleteness;
  onGap: (gap: ProfileGap) => void;
}) {
  if (!completeness) return <Skeleton className="h-48 w-full rounded-xl" />;

  const gaps = completeness.gaps.slice(0, 4);

  return (
    <section
      id="missing-information"
      className={cn(
        "min-w-0 rounded-xl border p-4 sm:p-5",
        gaps.length > 0
          ? "border-amber-200 bg-amber-50/70"
          : "border-emerald-200 bg-emerald-50/60",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-8 shrink-0 place-content-center rounded-lg",
            gaps.length > 0
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          {gaps.length > 0 ? (
            <AlertTriangle className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-black-01">
            {gaps.length > 0 ? "Missing information" : "Record complete"}
          </h3>
          <p className="mt-0.5 text-xs text-gray-01">
            {gaps.length > 0
              ? "Fill these details to keep this student's record useful."
              : "The expected details and required files are on record."}
          </p>
        </div>
      </div>

      {gaps.length > 0 && (
        <>
          <ul className="mt-4 grid gap-2">
            {gaps.map((gap) => (
              <li key={gap.key}>
                <PermissionGate
                  permission={P.MODIFY_STUDENT}
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
          {completeness.gaps.length > gaps.length && (
            <p className="mt-2 text-xs text-amber-800">
              {completeness.gaps.length - gaps.length} more details need attention.
            </p>
          )}
        </>
      )}
    </section>
  );
}

const MEDICAL_LABELS: Record<(typeof STUDENT_MEDICAL_FIELDS)[number], string> = {
  blood_group: "Blood group",
  allergies: "Allergies",
  conditions: "Conditions",
};

/**
 * The medical rows this viewer may read on this record, in display order.
 *
 * Field Access leaves out what the viewer may not read, so a row is drawn only
 * for a field the record carries, and the rest leave no trace behind.
 */
function useMedicalRows(student: StudentDetail): Row[] {
  const access = useFieldAccess(FIELD_RESOURCE.STUDENTS, student);
  return STUDENT_MEDICAL_FIELDS.filter((name) => !access.isHidden(name)).map(
    (name) => ({ label: MEDICAL_LABELS[name], value: student[name] || "Not recorded" }),
  );
}

/**
 * The health side panel on the overview.
 *
 * Emergency contact details are open to everybody who may open the record; the
 * medical rows follow Field Access, and the "Sensitive" marker belongs to them,
 * so it goes when none of them is shown.
 */
function HealthSnapshot({ student }: { student: StudentDetail }) {
  const medical = useMedicalRows(student);

  return (
    <Panel
      title={medical.length > 0 ? "Health and emergency" : "Emergency contact"}
      icon={HeartPulse}
      action={
        medical.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-05">
            <LockKeyhole className="size-3" />
            Sensitive
          </span>
        ) : undefined
      }
    >
      <Rows
        rows={[
          ...medical,
          {
            label: "Emergency contact",
            value: student.emergency_contact_name || "Not recorded",
          },
          {
            label: "Emergency phone",
            value: student.emergency_contact_phone || "Not recorded",
          },
        ]}
      />
    </Panel>
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

// ── Guardians ───────────────────────────────────────────────────────────────

function GuardiansTab({
  links,
  loading,
}: {
  links: StudentGuardianLink[];
  loading?: boolean;
}) {
  const navigate = useNavigate();
  const { fieldAccess } = usePermissions();

  if (loading) return <PanelSkeleton />;
  if (links.length === 0) {
    return (
      <EmptyRing>No guardian linked</EmptyRing>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {links.map((link) => {
        const access = resolveFieldAccess(
          fieldAccess,
          FIELD_RESOURCE.GUARDIANS,
          link.guardian,
        );
        const contact = (
          [
            ["phone", "Phone"],
            ["email", "Email"],
            ["occupation", "Occupation"],
          ] as const
        )
          .filter(([name]) => !access.isHidden(name))
          .map(([name, label]) => ({
            label,
            value: link.guardian[name] || "Not recorded",
          }));
        return (
          <Panel
            key={link.id}
            title={link.guardian.full_name}
            badge={link.is_primary ? "Primary contact" : undefined}
          >
            <Rows
              rows={[
                { label: "Relationship", value: link.relationship_label },
                ...contact,
              ]}
            />
            <div className="mt-3 border-t border-white-02 pt-3">
              {link.siblings.length > 0 && (
                <p className="text-xs text-gray-05">
                  Also guardian of{" "}
                  {/* Each sibling is a link. A registrar reading "also guardian
                      of Tobi (JSS1 A)" is one click from Tobi, and making them
                      search for a name they can already see is the kind of
                      friction that ends in the wrong Tobi. */}
                  {link.siblings.map((sib, i) => (
                    <span key={sib.id}>
                      {i > 0 && ", "}
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            routesPath.PROTECTED.STUDENTS.PROFILE_ID(sib.id),
                          )
                        }
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {sib.name}
                      </button>
                      {sib.class ? ` (${sib.class})` : ""}
                    </span>
                  ))}
                </p>
              )}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    routesPath.PROTECTED.STUDENTS.GUARDIAN_DETAILS_ID(
                      link.guardian.id,
                    ),
                  )
                }
                className="mt-2 text-xs text-primary underline-offset-2 hover:underline"
              >
                Open {link.guardian.full_name}
              </button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

// ── Academic ────────────────────────────────────────────────────────────────

function AcademicTab({
  studentId,
  student,
}: {
  studentId: number;
  student?: StudentDetail;
}) {
  const { data: subjectsData, isLoading: subjectsLoading } =
    useGetStudentSubjectsQuery(studentId);
  const { data: trailData, isLoading: trailLoading } =
    useGetStudentClassHistoryQuery(studentId);

  const subjects = subjectsData?.data ?? [];
  const trail = trailData?.data ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Placement">
        <Rows
          rows={[
            { label: "Current class", value: student?.class_name || "Unassigned" },
            { label: "Level", value: student?.level_name || "-" },
            { label: "Session", value: student?.session_name || "-" },
          ]}
        />
      </Panel>

      <Panel
        title="Class history"
        note="The promotion trail across sessions."
      >
        {trailLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : trail.length === 0 ? (
          <p className="text-sm text-gray-05">
            No class history yet. It fills in as the student is placed and
            promoted.
          </p>
        ) : (
          <ul className="grid gap-2">
            {trail.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="text-black-01">{t.class_name}</span>
                <span className="text-xs text-gray-05">
                  {t.session_name}
                  {/* A null end date is the current placement, not missing
                      data - so it says so rather than showing a blank. */}
                  {t.ended_at ? "" : " · current"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Subjects" className="lg:col-span-2">
        {subjectsLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : subjects.length === 0 ? (
          <p className="text-sm text-gray-05">
            {student?.class_name
              ? "No subjects are recorded against this level yet."
              : "Assign a class to see the subjects this student takes."}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <li
                key={s.id}
                className="rounded-full bg-gray-04 px-2.5 py-1 text-xs text-black-01"
              >
                {s.name}
                {s.is_core && (
                  <span className="ml-1.5 text-gray-05">core</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ── Medical ─────────────────────────────────────────────────────────────────

function MedicalTab({
  student,
  loading,
}: {
  student?: StudentDetail;
  loading?: boolean;
}) {
  if (loading || !student) return <PanelSkeleton />;
  return <MedicalPanels student={student} />;
}

/**
 * The medical and emergency panels of a loaded record.
 *
 * A medical field the viewer may not read is absent from the record and is not
 * drawn, and the Medical panel goes with its last field. A field that is drawn
 * and empty says "Not recorded", which is a different sentence from "not
 * shown to you": collapsing the two would tell a nurse a child has no
 * allergies when the record simply was not filled in.
 */
function MedicalPanels({ student }: { student: StudentDetail }) {
  const medical = useMedicalRows(student);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {medical.length > 0 && (
        <Panel title="Medical">
          <Rows rows={medical} />
        </Panel>
      )}
      <Panel title="Emergency contact">
        <Rows
          rows={[
            { label: "Name", value: student.emergency_contact_name || "Not recorded" },
            { label: "Phone", value: student.emergency_contact_phone || "Not recorded" },
          ]}
        />
      </Panel>
    </div>
  );
}

// ── The photograph ───────────────────────────────────────

/**
 * The face of the record, and the place a photograph is put on it.
 *
 * A profile that opens with a line of text reads like a row that happened to
 * fill the page; the avatar is what makes it a person's record.
 *
 * Writing the PASSPORT_PHOTO document rather than a field of its own is what
 * keeps there being ONE photograph: replacing it from the Documents checklist
 * changes what this shows, and replacing it here changes what the checklist
 * lists.
 */
function StudentPhoto({ student }: { student: StudentDetail }) {
  const [upload, { isLoading }] = useUploadStudentDocumentMutation();

  return (
    <PhotoPicker
      name={student.full_name}
      photoUrl={student.photo_url}
      saving={isLoading}
      onPick={(file) =>
        upload({
          id: student.id, documentType: "PASSPORT_PHOTO", file,
        }).unwrap()
      }
    />
  );
}

// ── Documents ───────────────────────────────────────────────────────────────

function DocumentsTab({
  studentId,
  docs,
  loading,
}: {
  studentId: number;
  docs: StudentDocumentRow[];
  loading?: boolean;
}) {
  if (loading) return <PanelSkeleton />;

  return (
    <Panel
      title="Documents"
      note="The passport photograph is also the picture shown beside this student everywhere in the app."
    >
      <ul className="grid gap-2.5">
        {docs.map((d) => (
          <DocumentRow key={d.document_type} studentId={studentId} doc={d} />
        ))}
      </ul>
    </Panel>
  );
}

/**
 * Open an attached document.
 *
 * **A plain link could never have worked.** MediaView is behind the JWT, and a
 * new tab opened from an <a href> sends no Authorization header - so "View" on
 * a birth certificate answered 401 for as long as the tab has existed. The
 * signature on the url binds it to one reader; it is not what authenticates
 * the read.
 *
 * So the bytes are fetched with the token and opened as a local blob. Same
 * route the school crest and the student's own photograph take.
 */
function ViewDocument({ url, label }: { url: string; label: string }) {
  const [fetchMedia, { isFetching }] = useLazyFetchAuthMediaQuery();

  async function open() {
    // The tab is opened ON THE CLICK, before the await. A window opened from an
    // async continuation has lost the user gesture and the browser blocks it as
    // a popup - which is silent: nothing opens and nothing says why.
    //
    // No "noopener" here on purpose: with it window.open returns null by spec
    // and there would be no handle to point at the bytes. The opener is cleared
    // by hand instead.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const blobUrl = await fetchMedia(url).unwrap();
      if (tab) {
        tab.location.href = blobUrl;
        return;
      }
      // Popups blocked. Save it instead of navigating this page away from a
      // record the reader is in the middle of.
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = label;
      link.click();
    } catch {
      tab?.close();
      toast.error(`We could not open the ${label.toLowerCase()}.`);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={isFetching}
      className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-60"
    >
      {isFetching ? "Opening…" : "View"}
    </button>
  );
}

/**
 * One checklist row, and the control that was missing from all of them.
 *
 * **Nothing on any screen could attach a document.** The checklist has asked
 * for a birth certificate and a passport photograph since the module shipped,
 * the route to send one has existed just as long, and no page ever offered a
 * file picker - so both required rows read "Not on file" for ever, and the
 * passport photograph that gives a student their face could not be supplied at
 * all. The upload lives here, on the list that names what is wanted, rather
 * than on a separate screen that would have to repeat it.
 */
function DocumentRow({
  studentId,
  doc,
}: {
  studentId: number;
  doc: StudentDocumentRow;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [upload, { isLoading: uploading }] = useUploadStudentDocumentMutation();
  const [remove, { isLoading: removing }] = useDeleteStudentDocumentMutation();
  const [confirming, setConfirming] = useState(false);
  const busy = uploading || removing;

  // The photograph is rendered in an <img>, so the picker offers images only -
  // the backend refuses anything else, and a refusal after the upload is a
  // worse way to learn it than a picker that never shows the PDF.
  const isPhoto = doc.document_type === "PASSPORT_PHOTO";

  async function choose(file: File | undefined) {
    if (!file) return;
    try {
      await upload({ id: studentId, documentType: doc.document_type, file }).unwrap();
      toast.success(`${doc.label} attached.`);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not attach that file."));
    }
  }

  async function drop() {
    if (doc.id == null) return;
    try {
      await remove({ id: studentId, docId: doc.id }).unwrap();
      toast.success(`${doc.label} removed.`);
      setConfirming(false);
    } catch (error) {
      toast.error(writeErrorMessage(error, "We could not remove that file."));
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-white-02 pb-2.5 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-black-01">{doc.label}</p>
        {/* The state is said ONCE. It used to be here and again on the right,
            so every row read "Required - not on file … Not on file". */}
        <p
          className={cn(
            "text-xs",
            !doc.attached && doc.required ? "text-amber-700" : "text-gray-05",
          )}
        >
          {doc.attached
            ? doc.required
              ? "Required · on file"
              : "On file"
            : doc.required
              ? "Required · not on file"
              : "Optional · not on file"}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {doc.attached && <ViewDocument url={doc.url} label={doc.label} />}

        <PermissionGate permission={P.MODIFY_STUDENT}>
          <input
            ref={input}
            type="file"
            accept={isPhoto ? "image/*" : undefined}
            className="hidden"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              // Cleared so picking the SAME file again still fires a change -
              // which is exactly what retrying a failed upload looks like.
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {uploading ? "Uploading…" : doc.attached ? "Replace" : "Upload"}
          </Button>
          {doc.attached && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirming(true)}
              className="text-error-text hover:text-error-text"
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          )}
          {/* Asked, because the bytes do not come back. Deleting the row
              retires the stored file, so a misclick beside "Replace" loses a
              birth certificate the family may not be able to produce twice. */}
          <ConfirmDialog
            open={confirming}
            onCancel={() => setConfirming(false)}
            onConfirm={drop}
            title={`Remove this ${doc.label.toLowerCase()}?`}
            body={
              doc.required
                ? `The file is deleted and cannot be recovered, and ${doc.label.toLowerCase()} is one this school requires - the record will show it as missing until a new one is uploaded.`
                : "The file is deleted and cannot be recovered. A new one can be uploaded at any time."
            }
            confirmLabel="Remove"
            busy={removing}
          />
        </PermissionGate>
      </div>
    </li>
  );
}

// ── History ─────────────────────────────────────────────────────────────────

const DOT: Record<string, string> = {
  status: "bg-primary",
  class: "bg-green-700",
  guardian: "bg-amber-600",
  document: "bg-gray-400",
  edit: "bg-gray-400",
};

function HistoryTab({ studentId }: { studentId: number }) {
  const { data, isLoading } = useGetStudentHistoryQuery(studentId);
  const entries = data?.data ?? [];

  if (isLoading) return <PanelSkeleton />;
  if (entries.length === 0) {
    return <Empty>Nothing has happened to this record yet.</Empty>;
  }

  return (
    <Panel title={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}, newest first`}>
      <ul className="grid gap-3">
        {entries.map((e, i) => (
          <li key={`${e.when}-${i}`} className="flex min-w-0 gap-2.5">
            <span
              aria-hidden
              className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[e.kind] ?? "bg-gray-400"}`}
            />
            <div className="min-w-0">
              <p className="text-sm text-black-01">{e.text}</p>
              <p className="text-xs text-gray-05">
                {formatDateTime(e.when)} · {e.actor}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── Shared furniture ────────────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  badge,
  note,
  action,
  className,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** A line under the heading, for a panel whose subject needs explaining. */
  note?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Surface as="section" className={cn("rounded-xl px-4 py-5 sm:px-5.5", className)}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Icon && <Icon className="size-4.5 text-primary" />}
        <h3 className="text-sm font-semibold text-black-01">{title}</h3>
        {badge && (
          <span className="rounded-full bg-white-03 px-2 py-0.5 text-xs text-primary">
            {badge}
          </span>
        )}
        {note && (
          <span className="w-full text-xs text-gray-05">{note}</span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </Surface>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Surface className="px-4 py-10 text-center text-sm text-gray-05">
      {children}
    </Surface>
  );
}


export type { StudentStatus };
