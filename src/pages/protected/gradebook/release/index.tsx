import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, CircleCheck, FileText, LockKeyhole, MailWarning, Printer } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { cn } from "@/lib/utils";
import { useGetReleaseClassesQuery, useGetReleaseQuery } from "@/redux/services/gradebook/gradebook-api";
import type { Release, ReleaseClass, ReleaseRow } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

const RESULT = {
  NOT_PUBLISHED: { text: "Not published", variant: "pending" },
  HELD: { text: "Held", variant: "pending" },
  RELEASED: { text: "Released", variant: "active" },
} as const;

/** The class to open: the one in the address, else the first published, else the first. */
const pickClass = (classes: ReleaseClass[], asked: number) =>
  classes.find((item) => item.class.id === asked) ??
  classes.find((item) => item.stage === "PUBLISHED") ??
  classes[0];

/**
 * Report cards and release: a class release desk with every student and one
 * focused delivery record.
 *
 * The class rides in `?class=` because a school can have more classes than a
 * tab strip can carry. Selecting a student brings the release state, primary
 * guardian, email outcome and report-card actions into focus. The class print
 * route still prints every released card in roll order, one A4 page each.
 *
 * Before publication every student reads Not published and nothing has been
 * sent. The guardian email contains no result figure, attachment or link.
 *
 * Field Access: the primary guardian follows the stricter of the Gradebook
 * guardian choice and the Student Management guardian name and email choices.
 * The email outcome and its summary follow the email-state choice. When the
 * server omits either field, its facts and empty space leave the desk too.
 */
export default function ReleasePage() {
  const { branch } = useBranchLens();
  const [search, setSearch] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = useGetReleaseClassesQuery({ branch });
  const classes = data?.data.classes ?? [];
  const chosen = pickClass(classes, Number(search.get("class")));
  const status = parseApiError(error).status;

  const choose = (id: string) =>
    setSearch((current) => {
      const next = new URLSearchParams(current);
      next.set("class", id);
      return next;
    }, { replace: true });

  return (
    <PageShell className="content-start gap-4" grid>
      {status === 403 ? (
        <OutlinedNotice
          icon={FileText}
          title="Report cards are not yours to open"
          body="The release list and report cards open to the people the school gives them to."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={FileText}
          title="We could not load the classes"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : !chosen ? (
        <OutlinedNotice icon={FileText} title="No class this term" body="Report cards appear here once classes are running this term." />
      ) : (
        <ClassRelease
          key={chosen.class.id}
          classId={chosen.class.id}
          branchName={data?.data.branch_dimension ? chosen.branch?.name ?? null : null}
          classPicker={
            <div className="w-full sm:w-72">
              <NativeSelect aria-label="Class" value={String(chosen.class.id)} onChange={(event) => choose(event.target.value)}>
                {classes.map((item) => (
                  <option key={item.class.id} value={String(item.class.id)}>
                    {item.class.name}
                    {data?.data.branch_dimension && item.branch ? ` · ${item.branch.name}` : ""}
                    {item.stage === "PUBLISHED" ? "" : " · not published"}
                  </option>
                ))}
              </NativeSelect>
            </div>
          }
        />
      )}
    </PageShell>
  );
}

function ClassRelease({
  classId,
  branchName,
  classPicker,
}: {
  classId: number;
  branchName: string | null;
  classPicker: ReactNode;
}) {
  const { data, isLoading, isError, refetch } = useGetReleaseQuery({ classId });
  const release = data?.data;
  if (isError) {
    return (
      <OutlinedNotice
        icon={FileText}
        title="We could not load this class's release"
        body="Something went wrong on our side."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }
  if (isLoading || !release) return <Skeleton className="h-64 w-full rounded-md" />;
  return <ReleaseBody release={release} branchName={branchName} classPicker={classPicker} />;
}

function ReleaseBody({
  release,
  branchName,
  classPicker,
}: {
  release: Release;
  branchName: string | null;
  classPicker: ReactNode;
}) {
  const { formatDate } = useSchoolDisplay();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const published = release.stage === "PUBLISHED";
  const showsGuardian = release.rows.length === 0 || release.rows.some((row) => "guardian" in row);
  const showsEmail = release.rows.length === 0 || release.rows.some((row) => "email_state" in row);
  const selected = release.rows.find((row) => row.student.id === selectedStudentId) ?? release.rows[0] ?? null;
  const released = release.rows.filter((row) => row.result_state === "RELEASED").length;
  const emailed = showsEmail ? release.rows.filter((row) => row.email_state === "SENT").length : 0;
  const contactGaps = showsEmail
    ? release.rows.filter((row) => row.email_state === "NO_EMAIL" || row.email_state === "NOT_SENT").length
    : 0;

  useEffect(() => {
    if (!selectedStudentId || !window.matchMedia?.("(max-width: 1023px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedStudentId]);

  return (
    <>
      <PageHeader
        title="Report cards and release"
        description={
          published
            ? `${release.term.name} · ${release.class.name} was published${release.published_at ? ` ${formatDate(release.published_at)}` : ""}.`
            : `${release.term.name} · ${release.class.name} is not published, so nothing has been released or sent.`
        }
        actions={
          <>
            {classPicker}
            {published && (
              <Button asChild>
                <Link to={routesPath.PROTECTED.GRADEBOOK.CLASS_CARDS_ID(release.class.id)}>
                  <Printer className="size-4" aria-hidden="true" />
                  Print class
                </Link>
              </Button>
            )}
          </>
        }
      />

      {release.rows.length === 0 ? (
        <Panel as="section" className="grid min-h-56 place-items-center p-5 text-center text-sm text-gray-06">
          No student is on this class&apos;s roll.
        </Panel>
      ) : (
        <>
          <section
            className={cn("grid grid-cols-2 gap-2.5", showsEmail ? "lg:grid-cols-4" : "sm:grid-cols-3")}
            aria-label="Release summary"
          >
            <Metric label="Students" value={release.class_size} foot="On the class roll" />
            <Metric label="Released" value={released} foot={published ? "Available to families" : "Nothing released yet"} />
            <Metric
              label="Held"
              value={release.held_count}
              foot={published ? "Not included in class print" : "Before publication"}
              tone={release.held_count ? "warn" : "default"}
            />
            {showsEmail && (
              <Metric
                label="Emailed"
                value={emailed}
                foot={contactGaps ? `${contactGaps} need${contactGaps === 1 ? "s" : ""} contact follow-up` : "Every released guardian notified"}
              />
            )}
          </section>

          <section className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]" aria-label="Report card release desk">
            <Panel as="section" className="overflow-hidden">
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3.5 py-3">
                <div className="min-w-0">
                  <h2 className="font-mont text-sm font-semibold text-black-01">Students</h2>
                  <p className="mt-0.5 text-xs text-gray-06">Select a student to review release and delivery.</p>
                </div>
                <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-semibold tabular-nums text-gray-06">
                  {release.class_size}
                </span>
              </div>
              <ul className="max-h-[34rem] overflow-y-auto overscroll-contain">
                {release.rows.map((row) => (
                  <ReleaseRowButton
                    key={row.student.id}
                    row={row}
                    showsGuardian={showsGuardian}
                    showsEmail={showsEmail}
                    active={selected?.student.id === row.student.id}
                    onOpen={() => setSelectedStudentId(row.student.id)}
                  />
                ))}
              </ul>
            </Panel>

            {selected && (
              <div ref={detailRef} className="min-w-0 scroll-mt-20">
                <ReleaseDetail
                  row={selected}
                  release={release}
                  branchName={branchName}
                  showsGuardian={showsGuardian}
                  showsEmail={showsEmail}
                />
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  foot,
  tone = "default",
}: {
  label: string;
  value: number;
  foot: string;
  tone?: "default" | "warn";
}) {
  return (
    <Panel className={cn("space-y-1.5 px-3.5 py-3", tone === "warn" && "border-amber-200 bg-amber-50")}>
      <p className="text-xs font-medium text-gray-06">{label}</p>
      <p className={cn("font-mont text-xl font-semibold text-black-01", tone === "warn" && "text-amber-700")}>{value}</p>
      <p className="text-xs text-gray-06">{foot}</p>
    </Panel>
  );
}

function ReleaseRowButton({
  row,
  showsGuardian,
  showsEmail,
  active,
  onOpen,
}: {
  row: ReleaseRow;
  showsGuardian: boolean;
  showsEmail: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  const { formatDateTime } = useSchoolDisplay();
  const result = RESULT[row.result_state];

  return (
    <li className={cn("border-b border-border last:border-b-0", active && "bg-pry-01/40")}>
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        onClick={onOpen}
        className={cn(
          "group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left transition-all ease-linear hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          showsGuardian && "sm:grid-cols-[minmax(9rem,1fr)_minmax(9rem,.85fr)_minmax(8rem,.75fr)_auto]",
          !showsGuardian && "sm:grid-cols-[minmax(9rem,1fr)_minmax(8rem,.75fr)_auto]",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-black-01">{row.student.name}</span>
          {row.student.admission_number && <span className="mt-0.5 block truncate text-xs text-gray-06">{row.student.admission_number}</span>}
        </span>
        {showsGuardian && (
          <span className="min-w-0 max-sm:col-start-1">
            <span className="block truncate text-sm text-black-01">{row.guardian?.name ?? "No primary guardian"}</span>
            {row.guardian?.email && <span className="mt-0.5 block truncate text-xs text-gray-06">{row.guardian.email}</span>}
          </span>
        )}
        <span className="min-w-0 max-sm:col-start-1">
          <Badge variant={result.variant} className="rounded-full text-xs">{result.text}</Badge>
          {showsEmail && <span className="mt-1 block truncate text-xs text-gray-06">{emailLabel(row, formatDateTime)}</span>}
        </span>
        <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 max-sm:col-start-2 max-sm:row-start-1 max-sm:row-span-3" aria-hidden="true" />
      </button>
    </li>
  );
}

function ReleaseDetail({
  row,
  release,
  branchName,
  showsGuardian,
  showsEmail,
}: {
  row: ReleaseRow;
  release: Release;
  branchName: string | null;
  showsGuardian: boolean;
  showsEmail: boolean;
}) {
  const { formatDate, formatDateTime } = useSchoolDisplay();
  const result = RESULT[row.result_state];
  const previewable = row.result_state !== "NOT_PUBLISHED";
  const emailState = showsEmail ? emailLabel(row, formatDateTime) : null;

  return (
    <Panel as="section" className="space-y-3 p-4 lg:sticky lg:top-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-mont text-base font-semibold text-black-01">{row.student.name}</h2>
          <p className="mt-0.5 text-xs text-gray-06">
            {[row.student.admission_number, release.class.name, branchName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge variant={result.variant} className="rounded-full text-xs">{result.text}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        {showsGuardian && <DetailFact label="Primary guardian" value={row.guardian?.name ?? "No primary guardian"} />}
        {showsEmail && <DetailFact label="Email" value={emailState ?? "-"} />}
        <DetailFact
          label="Published"
          value={release.published_at ? formatDate(release.published_at) : "Not published"}
        />
        <DetailFact label="Report card" value={previewable ? (row.result_state === "HELD" ? "Staff preview only" : "Ready") : "Not available"} />
      </dl>

      <ReleaseStatus row={row} showsEmail={showsEmail} />

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {previewable && (
          <Button size="sm" asChild>
            <Link to={routesPath.PROTECTED.GRADEBOOK.REPORT_CARD_ID(release.class.id, row.student.id)}>
              <FileText className="size-3.5" aria-hidden="true" />
              Preview report card
            </Link>
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student.id)}?tab=results`}>Open student profile</Link>
        </Button>
      </div>

      {release.stage === "PUBLISHED" && (
        <details className="border-t border-border pt-3 text-xs">
          <summary className="cursor-pointer font-medium text-primary">Guardian email wording</summary>
          <div className="mt-2 rounded-md bg-gray-50 p-3 leading-5 text-black-01">
            <p className="font-medium">[First name]&apos;s report card is ready</p>
            <p className="mt-2">Dear Parent or Guardian,</p>
            <p>[First name]&apos;s report card for {release.term.name} is ready to collect from the school.</p>
            <p className="mt-2 text-gray-06">No score, grade, position, comment, attachment or link is included.</p>
          </div>
        </details>
      )}
    </Panel>
  );
}

function ReleaseStatus({ row, showsEmail }: { row: ReleaseRow; showsEmail: boolean }) {
  if (row.result_state === "NOT_PUBLISHED") {
    return (
      <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        This class is not published, so no report card or guardian email is available.
      </p>
    );
  }
  if (row.result_state === "HELD") {
    return (
      <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        The result is held. It is excluded from the class print{showsEmail ? ", and nothing was sent" : ""}.
      </p>
    );
  }
  if (showsEmail && (row.email_state === "NO_EMAIL" || row.email_state === "NOT_SENT")) {
    return (
      <p className="flex gap-2 rounded-md bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">
        <MailWarning className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {row.email_state === "NO_EMAIL"
          ? "The result is released, but the primary guardian has no email on file."
          : "The result is released, but the email has no recorded outcome."}
      </p>
    );
  }
  return (
    <p className="flex gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800">
      <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      The result is released{showsEmail ? " and the guardian notification was sent" : ""}.
    </p>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2.5">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-black-01">{value}</dd>
    </div>
  );
}

function emailLabel(row: ReleaseRow, formatDateTime: (value: string) => string) {
  switch (row.email_state) {
    case "SENT":
      return `Emailed${row.emailed_at ? ` ${formatDateTime(row.emailed_at)}` : ""}`;
    case "NO_EMAIL":
      return "No email on file";
    case "HELD":
      return "Held, nothing sent";
    case "NOT_SENT":
      return "Not sent";
    default:
      return "-";
  }
}
