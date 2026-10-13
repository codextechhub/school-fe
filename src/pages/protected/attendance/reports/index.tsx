import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, ClipboardCheck, Download } from "lucide-react";
import { toast } from "sonner";

import CustomTable from "@/components/custom/custom-table";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { P } from "@/permissions";
import { useGetAttendanceReportQuery } from "@/redux/services/attendance/attendance-api";
import type { Report, ReportFileType, ReportTable } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { downloadAuthorisedFile } from "@/utils/attachment-download";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { ChoiceChips } from "../components/choice-chips";
import { reportExportPath, reportFileName } from "./export-path";

const NOT_TAKEN_PAGE = 15;

/**
 * Attendance reports: one term across the reader's branches.
 *
 * Every figure is drawn only from registers that were taken. A day a class
 * took no register is counted as not taken, never as absences, so a slow
 * register lowers no rate. The chronic-absence list is the students below
 * the school's own threshold, set in Settings.
 *
 * At a school with several branches the class and not-taken tables show each
 * class's branch, and the branch selector narrows the whole report; at a
 * school with one they show the level. Field Access removes what the reader
 * may not read: the figures follow the register's counts and the not-taken
 * list its status, and a section the server left out is not drawn.
 *
 * Three tables download, in the same term and branch as the screen.
 */
export default function AttendanceReports() {
  const { hasPermission } = usePermissions();
  const { branch } = useBranchLens();
  const [term, setTerm] = useState<number | undefined>(undefined);
  const allowed = hasPermission(P.VIEW_ATTENDANCE_REPORTS);
  const { data, isLoading, isError, refetch } = useGetAttendanceReportQuery(
    { term, branch },
    { skip: !allowed },
  );

  if (!allowed) {
    return (
      <PageShell>
        <PageAccessDenied message="Your role does not include attendance reports. Ask your school administrator if you need them." />
      </PageShell>
    );
  }

  const report = data?.data;
  return (
    <PageShell className="content-start gap-5" grid>
      {isError ? (
        <OutlinedNotice
          icon={ClipboardCheck}
          title="We could not load the report"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !report ? (
        <>
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-56 w-full rounded-md" />
          <Skeleton className="h-72 w-full rounded-md" />
        </>
      ) : !report.term ? (
        <OutlinedNotice
          icon={ClipboardCheck}
          title="No term to report on"
          body="Attendance is reported a term at a time. It appears here once a term has begun."
        />
      ) : (
        <ReportBody report={report} term={term ?? report.term.id} onTerm={setTerm} branch={branch} />
      )}
    </PageShell>
  );
}

function ReportBody({
  report,
  term,
  onTerm,
  branch,
}: {
  report: Report;
  term: number;
  onTerm: (id: number) => void;
  branch: number | "all";
}) {
  const { formatDayRange } = useSchoolDisplay();
  const termLabel = report.term ? `${report.term.name} ${report.term.session_name}` : "";
  const exportArgs = { term, branch, termLabel };

  return (
    <>
      <Panel as="section" className="space-y-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">
            {report.term?.session_name} · {report.term?.name}
          </h1>
          <p className="text-sm text-gray-06">
            {[
              formatDayRange(report.range.start, report.range.end),
              report.range.school_days !== undefined ? `${report.range.school_days} school days` : null,
              "drawn from registers actually taken",
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        {report.terms.length > 1 && (
          <ChoiceChips
            ariaLabel="Term"
            options={report.terms.map((t) => ({ value: t.id, label: `${t.name} ${t.session_name}` }))}
            value={term}
            onChange={onTerm}
          />
        )}
      </Panel>

      {report.trend && <Trend weeks={report.trend} />}
      <ByClass report={report} exportArgs={exportArgs} />
      {report.by_level && <ByLevel rows={report.by_level} />}
      {report.chronic && <Chronic report={report} exportArgs={exportArgs} />}
      {report.not_taken && <NotTaken report={report} exportArgs={exportArgs} />}
      {report.lessons_missed && report.lessons_missed.length > 0 && <LessonsMissed rows={report.lessons_missed} />}
    </>
  );
}

type ExportArgs = { term: number; branch: number | "all"; termLabel: string };

function Heading({
  title,
  body,
  table,
  exportArgs,
}: {
  title: string;
  body: string;
  table?: ReportTable;
  exportArgs?: ExportArgs;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-mont text-base font-semibold text-black-01">{title}</h2>
        <p className="text-sm text-gray-06">{body}</p>
      </div>
      {table && exportArgs && <ExportMenu table={table} exportArgs={exportArgs} />}
    </div>
  );
}

const FILE_TYPES: { value: ReportFileType; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel" },
  { value: "pdf", label: "PDF" },
];

/**
 * Download one table. Offered only to a reader who holds the export key;
 * reading the report is not enough. The file is saved straight away.
 */
function ExportMenu({ table, exportArgs }: { table: ReportTable; exportArgs: ExportArgs }) {
  const { hasPermission } = usePermissions();
  const [busy, setBusy] = useState(false);
  if (!hasPermission(P.EXPORT_ATTENDANCE_REPORTS)) return null;

  const download = async (fileType: ReportFileType) => {
    setBusy(true);
    try {
      await downloadAuthorisedFile(
        reportExportPath(table, fileType, exportArgs),
        reportFileName(table, fileType, exportArgs.termLabel),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That file could not be downloaded.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          <Download className="size-4" aria-hidden="true" />
          Download
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {FILE_TYPES.map((type) => (
          <DropdownMenuItem key={type.value} onSelect={() => void download(type.value)}>
            {type.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const rate = (value: number | null) => (value == null ? "None taken" : `${value.toFixed(1)}%`);

/**
 * The school's rate, week by week: one series, so no legend; a week with no
 * register taken is an empty slot with its own label, never a zero bar.
 * Each bar is scaled between a floor a little under the lowest week and 100,
 * so a term in the nineties still shows its dips.
 */
function Trend({ weeks }: { weeks: { week_start: string; label: string; rate: number | null }[] }) {
  const { formatDay } = useSchoolDisplay();
  const rates = weeks.map((w) => w.rate).filter((r): r is number => r != null);
  const floor = rates.length ? Math.max(0, Math.floor(Math.min(...rates)) - 3) : 0;

  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading
        title="The school's rate, week by week"
        body="A week with a missing register counts fewer days, not more absences."
      />
      {rates.length === 0 ? (
        <p className="text-sm text-gray-06">No register has been taken this term yet.</p>
      ) : (
        <div className="min-w-0">
          <ol className="flex h-44 items-end gap-0.5 border-b border-border" aria-label="Weekly attendance rate">
            {weeks.map((week) => {
              const title = `${week.label}, from ${formatDay(week.week_start)}: ${rate(week.rate)}`;
              const height = week.rate == null ? 0 : ((week.rate - floor) / (100 - floor)) * 100;
              return (
                <li key={week.week_start} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={title}>
                  <span className="mb-1 text-[10px] text-gray-06 opacity-0 transition-opacity group-hover:opacity-100">
                    {week.rate == null ? "" : `${Math.round(week.rate)}%`}
                  </span>
                  {week.rate == null ? (
                    <span className="mb-0.5 h-1 w-full max-w-6 rounded-full bg-gray-200" aria-label={title} />
                  ) : (
                    <span
                      className="w-full max-w-6 rounded-t-[4px] bg-primary/80 transition-colors group-hover:bg-primary"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      aria-label={title}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <ol className="flex gap-0.5 pt-1.5" aria-hidden="true">
            {weeks.map((week) => (
              <li key={week.week_start} className="min-w-0 flex-1 text-center text-[10px] text-gray-05">
                {week.label.replace(/^Wk\s*/, "")}
              </li>
            ))}
          </ol>
          <p className="pt-0.5 text-center text-[11px] text-gray-05" aria-hidden="true">Week of the term</p>
        </div>
      )}
      <p className="text-xs text-gray-05">
        Bars start at {floor}%, not 0, so the weeks can be told apart. A grey dash is a week with no register taken.
      </p>
    </Panel>
  );
}

function ByClass({ report, exportArgs }: { report: Report; exportArgs: ExportArgs }) {
  const scope = report.branch_dimension ? "Branch" : "Level";
  const withCounts = report.by_class.some((row) => row.counts);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading title="By class" body="Rate, absences, lateness and days not taken." table="by_class" exportArgs={exportArgs} />
      <CustomTable
        tableHeaderList={["Class", scope, ...(withCounts ? ["Rate", "Absences", "Lateness", "Days not taken"] : [])]}
        defaultBodyList={report.by_class}
        tableBodyList={report.by_class.map((row) => ({
          Class: <span className="font-medium text-black-01">{row.class_name}</span>,
          [scope]: report.branch_dimension ? row.branch?.name ?? "No branch" : row.level_name,
          ...(withCounts
            ? {
                Rate: row.counts ? rate(row.counts.rate) : "",
                Absences: row.counts?.absent ?? "",
                Lateness: row.counts?.late ?? "",
                "Days not taken": row.counts?.not_taken ?? "",
              }
            : {}),
        }))}
        hidePagination
        cardBreakpoint="lg"
        emptyText="No classes in scope"
      />
    </Panel>
  );
}

function ByLevel({ rows }: { rows: NonNullable<Report["by_level"]> }) {
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading title="By level" body="Each level's classes added up." />
      <CustomTable
        tableHeaderList={["Level", "Rate", "Absences", "Lateness"]}
        defaultBodyList={rows}
        tableBodyList={rows.map((row) => ({
          Level: <span className="font-medium text-black-01">{row.level_name}</span>,
          Rate: rate(row.rate),
          Absences: row.absent,
          Lateness: row.late,
        }))}
        hidePagination
        emptyText="No levels in scope"
      />
    </Panel>
  );
}

function Chronic({ report, exportArgs }: { report: Report; exportArgs: ExportArgs }) {
  const rows = report.chronic ?? [];
  const { hasPermission } = usePermissions();
  const canOpen = hasPermission(P.BROWSE_STUDENTS);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading
        title="Chronic absence"
        body={`Below ${report.threshold}%, the line this school set in Settings. The platform does not decide who is on this list.`}
        table="chronic"
        exportArgs={exportArgs}
      />
      {rows.length === 0 ? (
        <EmptyLine text="Nobody is below the line this term." />
      ) : (
        <CustomTable
          tableHeaderList={["Student", "Class", "Rate", "Days absent", "Days excused", "Days not taken"]}
          defaultBodyList={rows}
          tableBodyList={rows.map((row) => ({
            Student: canOpen ? (
              <Link
                to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student.id)}?tab=attendance`}
                className="font-medium text-primary hover:underline"
              >
                {row.student.name}
              </Link>
            ) : (
              <span className="font-medium text-black-01">{row.student.name}</span>
            ),
            Class: row.class_name ?? "",
            Rate: rate(row.rate),
            "Days absent": row.absent,
            "Days excused": row.excused,
            "Days not taken": row.not_taken,
          }))}
          hidePagination
        />
      )}
    </Panel>
  );
}

/** Every day a class owed a register and none was submitted, newest first, a page at a time. */
function NotTaken({ report, exportArgs }: { report: Report; exportArgs: ExportArgs }) {
  const { formatDay } = useSchoolDisplay();
  const [page, setPage] = useState(1);
  const rows = report.not_taken ?? [];
  const scope = report.branch_dimension ? "Branch" : "Level";
  const shown = rows.slice((page - 1) * NOT_TAKEN_PAGE, page * NOT_TAKEN_PAGE);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading
        title="Registers not taken"
        body={`${rows.length} across the term. Each opens the register, which can still be taken late.`}
        table="not_taken"
        exportArgs={exportArgs}
      />
      {rows.length === 0 ? (
        <EmptyLine text="Every register in this term was taken." />
      ) : (
        <CustomTable
          tableHeaderList={["Date", "Class", "Class teacher", scope]}
          defaultBodyList={shown}
          tableBodyList={shown.map((row) => ({
            Date: (
              <Link
                to={routesPath.PROTECTED.ATTENDANCE.REGISTER_ID(row.class_id, row.date)}
                className="text-primary hover:underline"
              >
                {formatDay(row.date, { weekday: "short" })}
              </Link>
            ),
            Class: row.class_name,
            "Class teacher": row.class_teacher_name ?? "No class teacher",
            [scope]: report.branch_dimension ? row.branch?.name ?? "No branch" : row.level_name,
          }))}
          currentPage={page}
          totalPage={Math.ceil(rows.length / NOT_TAKEN_PAGE)}
          onPageChange={(next) => setPage(Number(next) || 1)}
        />
      )}
    </Panel>
  );
}

function LessonsMissed({ rows }: { rows: NonNullable<Report["lessons_missed"]> }) {
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading
        title="Lessons missed"
        body="Levels that mark lessons. A student present in the morning who missed a lesson is counted here, not as an absence."
      />
      <CustomTable
        tableHeaderList={["Subject", "Class", "Teacher", "Missed", "Students"]}
        defaultBodyList={rows}
        tableBodyList={rows.map((row) => ({
          Subject: <span className="font-medium text-black-01">{row.subject}</span>,
          Class: row.class_name,
          Teacher: row.teacher_name ?? "No teacher",
          Missed: row.missed,
          Students: row.students.length ? row.students.join(", ") : "None",
        }))}
        hidePagination
      />
    </Panel>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-white-05 px-4 py-3.5 text-sm text-gray-06">
      <ClipboardCheck className="size-4 shrink-0 text-green-01" aria-hidden="true" />
      {text}
    </div>
  );
}
