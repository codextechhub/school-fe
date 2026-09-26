import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  Check,
  LayoutGrid,
  List,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  UserCheck,
  UsersRound,
} from "lucide-react";

import PermissionGate from "@/components/custom/permission-gate";
import { AsAtBanner, AsAtControl, LiveOnly } from "@/components/custom/as-at-control";
import { AsAtContext, useAsAt, useAsAtParam } from "@/lib/as-at";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { ClickableCard, Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import {
  useGetGuardianQuery,
  useUploadGuardianPhotoMutation,
} from "@/redux/services/students/students-api";
import {
  RELATIONSHIPS,
  type GuardianDetail as GuardianRecord,
} from "@/redux/services/students/students-types";
import { routesPath } from "@/routes/routesPath";

import { LinkChildDrawer } from "../drawers/link-child-drawer";
import { EmptyRing } from "../empty-ring";
import { PhotoPicker } from "../photo-picker";
import { StudentStatusBadge } from "../status-badge";
import { EditGuardianDrawer } from "./edit-guardian-drawer";
import { CheckNamePill, SiblingsPill } from "./person-card";
import {
  getGuardianProfileCompleteness,
  type GuardianProfileGap,
} from "./profile-completeness";

function relationshipLabel(code: string) {
  return (
    RELATIONSHIPS.find((relationship) => relationship.value === code)?.label ??
    code
  );
}

/**
 * One guardian and every student linked under that guardian.
 *
 * Guardian-owned contact details remain separate from relationship and
 * primary-contact facts, which belong to each individual student link.
 *
 * The name, phone, email, occupation, address and photograph follow Field
 * Access (`school.guardians`): one the viewer may not read is absent from the
 * record and drawn nowhere on this page, header, details and checklist alike.
 *
 * A name the platform split from one line and nobody has confirmed carries a
 * "Check name" flag, and the edit drawer opens on the confirmation.
 *
 * The "As at" control reads the guardian and their wards as they stood at the
 * end of an earlier day (`?as_at=`, see `lib/as-at.ts`), with nothing on the
 * page that changes the record.
 */
export default function GuardianDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const guardianId = Number(id);
  const [linking, setLinking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [studentView, setStudentView] = useState<"list" | "grid">("list");
  const [asAt, setAsAt] = useAsAtParam();

  // `currentData`, so another day's answer is never shown under this one.
  const { currentData: data, isLoading, isError, refetch } = useGetGuardianQuery(
    { id: guardianId, asAt },
    { skip: !Number.isFinite(guardianId) },
  );
  const guardian = data?.data;
  const completeness = useMemo(
    () => (guardian ? getGuardianProfileCompleteness(guardian) : undefined),
    [guardian],
  );
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS, guardian);
  const shows = (name: "phone" | "email" | "occupation" | "address") =>
    !access.isHidden(name);

  if (isError && asAt) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={UserRound}
          title="This record has no history for that day"
          body="Its history starts later than the day you picked. Go back to today and pick a day the calendar offers."
          actionLabel="Back to today"
          onAction={() => setAsAt(undefined)}
        />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={UserRound}
          title="We could not load this guardian"
          body="The record may have been removed, or something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  const wards = guardian?.wards ?? [];
  const primaryLinks = wards.filter((ward) => ward.is_primary).length;
  const activeStudents = wards.filter(
    (ward) => ward.status === "ACTIVE",
  ).length;

  return (
    <AsAtContext.Provider value={asAt}>
    <PageShell className="content-start gap-5" grid>
      {asAt && <AsAtBanner asAt={asAt} onReturn={() => setAsAt(undefined)} />}
      <Panel
        as="section"
        className="overflow-hidden rounded-xl px-4 py-5 sm:px-6"
      >
        {isLoading || !guardian ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start gap-4.5">
                <GuardianPhoto guardian={guardian} />

                <div className="min-w-55 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
                      {guardian.full_name}
                    </h1>
                    {wards.length > 1 && <SiblingsPill />}
                    {guardian.name_needs_review && <CheckNamePill />}
                  </div>
                  <p className="mt-1.5 text-[13px] text-gray-05">
                    Guardian of {wards.length}{" "}
                    {wards.length === 1 ? "student" : "students"}
                  </p>
                  {(shows("phone") || shows("email")) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-gray-01">
                      {shows("phone") && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="size-3.5 text-gray-05" />
                          {guardian.phone || "No phone recorded"}
                        </span>
                      )}
                      {shows("email") && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <Mail className="size-3.5 shrink-0 text-gray-05" />
                          <span className="break-all">
                            {guardian.email || "No email recorded"}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <LiveOnly>
                  <PermissionGate permission={P.MODIFY_STUDENT}>
                    <Button size="sm" onClick={() => setEditing(true)}>
                      {guardian.name_needs_review ? "Check name" : "Edit details"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLinking(true)}
                    >
                      Link another child
                    </Button>
                  </PermissionGate>
                </LiveOnly>
              </div>
            </div>

            {/* The date control sits on the completeness card, one panel beside the person. */}
            <div className="grid min-w-0 content-start gap-3">
              <AsAtControl
                historyStarts={guardian.history_starts}
                value={asAt}
                onChange={setAsAt}
              />
              <CompletenessCard completeness={completeness} />
            </div>
          </div>
        )}
      </Panel>

      {guardian ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.9fr)]">
          <div className="grid min-w-0 content-start gap-4">
            <ProfilePanel title="Personal and contact" icon={UserRound}>
              <DetailGrid
                rows={[
                  { label: "Full name", value: guardian.full_name || "Hidden" },
                  ...(
                    [
                      ["phone", "Phone"],
                      ["email", "Email"],
                      ["occupation", "Occupation"],
                      ["address", "Home address"],
                    ] as const
                  )
                    .filter(([name]) => shows(name))
                    .map(([name, label]) => ({
                      label,
                      value: guardian[name] || "Not recorded",
                    })),
                  {
                    label: "Parent account",
                    value: guardian.has_account
                      ? "Account available"
                      : "No parent account",
                  },
                ]}
              />
            </ProfilePanel>

            <ProfilePanel
              title="Students under this guardian"
              icon={UsersRound}
              action={
                wards.length > 0 ? (
                  <SegmentedToggle
                    ariaLabel="Students under this guardian layout"
                    value={studentView}
                    onChange={setStudentView}
                    options={[
                      { value: "list", label: "List", icon: List },
                      { value: "grid", label: "Grid", icon: LayoutGrid },
                    ]}
                  />
                ) : undefined
              }
            >
              {wards.length === 0 ? (
                <EmptyRing>No students linked yet</EmptyRing>
              ) : studentView === "list" ? (
                <div className="-mx-3 divide-y divide-border">
                  {wards.map((ward) => (
                    <StudentLinkRow
                      key={ward.id}
                      ward={ward}
                      onOpen={() =>
                        navigate(
                          routesPath.PROTECTED.STUDENTS.PROFILE_ID(ward.id),
                        )
                      }
                    />
                  ))}
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {wards.map((ward) => (
                    <li key={ward.id} className="min-w-0">
                      <StudentLinkCard
                        ward={ward}
                        onOpen={() =>
                          navigate(
                            routesPath.PROTECTED.STUDENTS.PROFILE_ID(ward.id),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </ProfilePanel>
          </div>

          <aside className="grid min-w-0 content-start gap-4">
            <MissingInformation
              completeness={completeness}
              onGap={() => setEditing(true)}
            />

            <ProfilePanel title="Contact and access" icon={ShieldCheck}>
              <CheckList
                rows={[
                  ...(shows("phone")
                    ? [{
                        label: guardian.phone
                          ? "Reachable by phone"
                          : "Phone number missing",
                        ready: Boolean(guardian.phone),
                      }]
                    : []),
                  ...(shows("email")
                    ? [{
                        label: guardian.email
                          ? "Email on file"
                          : "Email address missing",
                        ready: Boolean(guardian.email),
                      }]
                    : []),
                  {
                    label: guardian.has_account
                      ? "Parent account available"
                      : "No parent account",
                    ready: guardian.has_account,
                    attention: false,
                  },
                ]}
              />
            </ProfilePanel>

            <ProfilePanel title="Guardian summary" icon={UsersRound}>
              <SummaryList
                rows={[
                  `${wards.length} linked ${wards.length === 1 ? "student" : "students"}`,
                  `${primaryLinks} primary contact ${primaryLinks === 1 ? "link" : "links"}`,
                  `${activeStudents} active ${activeStudents === 1 ? "student" : "students"}`,
                ]}
              />
            </ProfilePanel>
          </aside>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      )}

      {guardian && editing && (
        <EditGuardianDrawer
          key={guardian.id}
          guardian={guardian}
          open={editing}
          onClose={() => setEditing(false)}
        />
      )}

      {guardian && (
        <LinkChildDrawer
          guardianId={guardian.id}
          guardianName={guardian.full_name}
          linkedStudentIds={wards.map((ward) => ward.id)}
          open={linking}
          onClose={() => setLinking(false)}
        />
      )}
    </PageShell>
    </AsAtContext.Provider>
  );
}

function CompletenessCard({
  completeness,
}: {
  completeness?: ReturnType<typeof getGuardianProfileCompleteness>;
}) {
  const asAt = useAsAt();
  if (!completeness) return <Skeleton className="h-24 w-full rounded-xl" />;
  const gapCount = completeness.gaps.length;

  return (
    <div className="flex min-w-0 items-center gap-3 self-start rounded-xl border border-border bg-white-05 p-3">
      <ProgressRing percentage={completeness.percentage} />
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
          <PermissionGate permission={P.MODIFY_STUDENT} disabled={Boolean(asAt)}>
            <Button
              size="sm"
              className="mt-2 h-8 w-full"
              onClick={() =>
                document
                  .getElementById("guardian-missing-information")
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

function ProgressRing({ percentage }: { percentage: number }) {
  return (
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
          strokeDasharray={`${percentage} 100`}
        />
      </svg>
      <span className="text-xs font-semibold text-black-01">{percentage}%</span>
    </div>
  );
}

function MissingInformation({
  completeness,
  onGap,
}: {
  completeness?: ReturnType<typeof getGuardianProfileCompleteness>;
  onGap: (gap: GuardianProfileGap) => void;
}) {
  const asAt = useAsAt();
  if (!completeness) return <Skeleton className="h-44 w-full rounded-xl" />;
  const gaps = completeness.gaps;

  return (
    <section
      id="guardian-missing-information"
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
          <h2 className="text-sm font-semibold text-black-01">
            {gaps.length ? "Missing information" : "Record complete"}
          </h2>
          <p className="mt-0.5 text-xs text-gray-01">
            {gaps.length
              ? "Fill these details so the school can identify and reach this guardian."
              : "The guardian's contact details are recorded."}
          </p>
        </div>
      </div>

      {gaps.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {gaps.map((gap) => (
            <li key={gap.key}>
              <PermissionGate
                permission={P.MODIFY_STUDENT}
                disabled={Boolean(asAt)}
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
    <Panel as="section" className="rounded-xl p-4 sm:p-5">
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4.5 shrink-0 text-primary" />
          <h2 className="text-sm font-semibold text-black-01">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </Panel>
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
              row.value === "Not recorded" && "text-amber-700",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StudentLinkRow({
  ward,
  onOpen,
}: {
  ward: GuardianRecord["wards"][number];
  onOpen: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${ward.name}'s student profile`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group grid min-w-0 cursor-pointer gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-white-05 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:grid-cols-[minmax(11rem,1.4fr)_repeat(3,minmax(6rem,0.7fr))_auto] lg:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-black-01">
          {ward.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-05">
          {ward.student_number || "No admission number"}
        </p>
      </div>
      <LinkFact label="Class" value={ward.class_name || "Unassigned"} />
      <LinkFact
        label="Relationship"
        value={relationshipLabel(ward.relationship)}
      />
      <div className="min-w-0">
        <p className="text-[11px] text-gray-05">Status</p>
        <div className="mt-1">
          <StudentStatusBadge status={ward.status} label={ward.status_label} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        {ward.is_primary && (
          <span className="text-xs font-medium text-primary">
            Primary contact
          </span>
        )}
        <span className="text-xs font-medium text-primary group-hover:underline">
          View student
        </span>
      </div>
    </article>
  );
}

function StudentLinkCard({
  ward,
  onOpen,
}: {
  ward: GuardianRecord["wards"][number];
  onOpen: () => void;
}) {
  return (
    <ClickableCard
      onOpen={onOpen}
      label={`Open ${ward.name}'s student profile`}
      className="flex h-full flex-col gap-3 rounded-xl p-4 text-left"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-black-01">
            {ward.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-05">
            {ward.student_number || "No admission number"}
          </p>
        </div>
        <StudentStatusBadge status={ward.status} label={ward.status_label} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <LinkFact label="Class" value={ward.class_name || "Unassigned"} />
        <LinkFact
          label="Relationship"
          value={relationshipLabel(ward.relationship)}
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-xs font-medium text-primary">View student</span>
        {ward.is_primary && (
          <span className="text-xs font-medium text-primary">
            Primary contact
          </span>
        )}
      </div>
    </ClickableCard>
  );
}

function LinkFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-gray-05">{label}</p>
      <p className="mt-1 truncate text-sm text-black-01">{value}</p>
    </div>
  );
}

function CheckList({
  rows,
}: {
  rows: { label: string; ready: boolean; attention?: boolean }[];
}) {
  return (
    <ul className="grid gap-3">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center gap-2.5 text-sm">
          <span
            className={cn(
              "grid size-6 shrink-0 place-content-center rounded-full",
              row.ready
                ? "bg-emerald-100 text-emerald-700"
                : row.attention === false
                  ? "bg-gray-04 text-gray-05"
                  : "bg-amber-100 text-amber-700",
            )}
          >
            {row.ready ? (
              <Check className="size-3.5" />
            ) : row.attention === false ? (
              <ShieldCheck className="size-3.5" />
            ) : (
              <AlertTriangle className="size-3.5" />
            )}
          </span>
          <span className="text-black-01">{row.label}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryList({ rows }: { rows: string[] }) {
  const icons = [UsersRound, ShieldCheck, UserCheck];

  return (
    <ul className="grid gap-3">
      {rows.map((row, index) => {
        const Icon = icons[index] ?? UsersRound;
        return (
          <li key={row} className="flex items-center gap-2.5 text-sm">
            <Icon className="size-4 shrink-0 text-primary" />
            <span className="text-black-01">{row}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** A guardian's photograph and its upload control. */
function GuardianPhoto({ guardian }: { guardian: GuardianRecord }) {
  const [upload, { isLoading }] = useUploadGuardianPhotoMutation();
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS, guardian);

  return (
    <PhotoPicker
      name={guardian.full_name}
      photoUrl={guardian.photo_url ?? ""}
      saving={isLoading}
      editable={!guardian.as_at && !access.isReadOnly("photo_url")}
      size="size-16"
      textClassName="text-[21px]"
      onPick={(file) => upload({ id: guardian.id, file }).unwrap()}
    />
  );
}
