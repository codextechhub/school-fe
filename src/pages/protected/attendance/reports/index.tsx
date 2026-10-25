import { useClassTeacherAccess } from "@/hooks/use-class-teacher-access";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookX,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  ClipboardX,
  Clock3,
  Download,
  UserRoundX,
} from "lucide-react";
import { toast } from "sonner";

import CustomTable from "@/components/custom/custom-table";
import PageAccessDenied from "@/components/custom/page-access-denied";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { useFieldAccess } from "@/components/finance-ui";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { useGetAttendanceReportQuery } from "@/redux/services/attendance/attendance-api";
import type { Report, ReportFileType, ReportTable } from "@/redux/services/attendance/attendance-types";
import { routesPath } from "@/routes/routesPath";
import { downloadAuthorisedFile } from "@/utils/attachment-download";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { AttendancePageHeader } from "../components/attendance-page-header";
import { attendanceReportFieldPolicy } from "./report-policy";
import { reportExportPath, reportFileName } from "./export-path";
import { summarizeAttendanceReport } from "./report-state";

const NOT_TAKEN_PAGE = 15;

/**
 * Attendance reports: one term across the reader's branches.
 *
 * The overview leads with the term's readable figures, the weekly trend and
 * the work that needs attention. Tabs keep the full class, chronic absence,
 * register gap and missed-lesson tables close without turning the page into a
 * long stack. Every figure is drawn only from registers that were taken. A day
 * a class took no register is counted as not taken, never as absences.
 *
 * At a school with several branches the class and not-taken tables show each
 * class's branch, and the branch selector narrows the whole report; at a
 * school with one they show the level. Field Access removes what the reader
 * may not read: the figures follow the register's counts and the not-taken
 * list its status, and a section the server left out is not drawn.
 *
 * Three tables download from the page header, in the same term and branch as
 * the screen. The client repeats the backend's Field Access boundary before
 * showing a summary or tab and never reconstructs an omitted block.
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
  const registerAccess = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_REGISTER);
  const lessonAccess = useFieldAccess(FIELD_RESOURCE.ATTENDANCE_LESSON);
  const [tab, setTab] = useState<ReportTab>("overview");
  const termLabel = report.term ? `${report.term.name} ${report.term.session_name}` : "";
  const exportArgs = { term, branch, termLabel };
  const fieldPolicy = attendanceReportFieldPolicy({
    registerCountsHidden: registerAccess.isHidden("counts"),
    registerStatusHidden: registerAccess.isHidden("status"),
    lessonMarkHidden: lessonAccess.isHidden("mark"),
    lessonCountsHidden: lessonAccess.isHidden("counts"),
  });
  const showCounts = fieldPolicy.showCounts && report.by_class.some((row) => row.counts !== undefined);
  const showChronic = showCounts && report.chronic !== undefined;
  const showGaps = fieldPolicy.showStatus && report.not_taken !== undefined;
  const showLessons = fieldPolicy.showLessons && report.lessons_missed !== undefined;
  const summary = summarizeAttendanceReport(report);
  const tabOptions = useMemo(() => [
    { value: "overview" as const, label: "Overview" },
    { value: "classes" as const, label: "Classes", count: report.by_class.length },
    ...(showChronic
      ? [{ value: "risk" as const, label: "Students at risk", count: report.chronic?.length ?? 0 }]
      : []),
    ...(showGaps
      ? [{ value: "gaps" as const, label: "Register gaps", count: report.not_taken?.length ?? 0 }]
      : []),
    ...(showLessons
      ? [{ value: "lessons" as const, label: "Missed lessons", count: report.lessons_missed?.length ?? 0 }]
      : []),
  ], [report.by_class.length, report.chronic, report.lessons_missed, report.not_taken, showChronic, showGaps, showLessons]);

  const activeTab = tabOptions.some((option) => option.value === tab) ? tab : "overview";

  return (
    <>
      <AttendancePageHeader
        title="Attendance reports"
        description="Attendance performance and unfinished registers for the selected term."
        meta={[
          report.terms.length === 1 ? termLabel : null,
          formatDayRange(report.range.start, report.range.end),
          showCounts && report.range.school_days !== undefined ? `${report.range.school_days} school days` : null,
          "Drawn only from registers actually taken",
        ]}
        actions={(
          <div className="flex max-w-full flex-wrap items-center gap-2">
            {report.terms.length > 1 && (
              <TermMenu
                terms={report.terms}
                value={term}
                onChange={(id) => {
                  setTab("overview");
                  onTerm(id);
                }}
              />
            )}
            <ReportExportMenu
              exportArgs={exportArgs}
              showChronic={showChronic}
              showGaps={showGaps}
            />
          </div>
        )}
      />

      <div className="max-w-full overflow-x-auto pb-1">
        <SegmentedToggle
          ariaLabel="Attendance report view"
          value={activeTab}
          options={tabOptions}
          onChange={setTab}
        />
      </div>

      {activeTab === "overview" && (
        <ReportOverview
          report={report}
          summary={summary}
          showCounts={showCounts}
          showChronic={showChronic}
          showGaps={showGaps}
          showLessons={showLessons}
          onOpen={setTab}
        />
      )}
      {activeTab === "classes" && (
        <>
          <ByClass report={report} showCounts={showCounts} />
          {showCounts && report.by_level && <ByLevel rows={report.by_level} />}
        </>
      )}
      {activeTab === "risk" && showChronic && <Chronic report={report} />}
      {activeTab === "gaps" && showGaps && <NotTaken report={report} />}
      {activeTab === "lessons" && showLessons && <LessonsMissed rows={report.lessons_missed ?? []} />}
    </>
  );
}

type ReportTab = "overview" | "classes" | "risk" | "gaps" | "lessons";

type ExportArgs = { term: number; branch: number | "all"; termLabel: string };

function Heading({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-mont text-base font-semibold text-black-01">{title}</h2>
        <p className="text-sm text-gray-06">{body}</p>
      </div>
      {action}
    </div>
  );
}

const FILE_TYPES: { value: ReportFileType; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel" },
  { value: "pdf", label: "PDF" },
];

function TermMenu({
  terms,
  value,
  onChange,
}: {
  terms: Report["terms"];
  value: number;
  onChange: (id: number) => void;
}) {
  const selected = terms.find((item) => item.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {selected ? `${selected.name} ${selected.session_name}` : "Choose term"}
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {terms.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => onChange(item.id)}>
            {item.name} {item.session_name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Downloads one of the report tables in the selected file format.
 *
 * The menu is offered only to a reader with the export permission. Protected
 * tables are omitted with their source report block, matching the backend's
 * Field Access enforcement instead of offering an export that cannot contain
 * the hidden fields.
 */
function ReportExportMenu({
  exportArgs,
  showChronic,
  showGaps,
}: {
  exportArgs: ExportArgs;
  showChronic: boolean;
  showGaps: boolean;
}) {
  const { hasPermission } = usePermissions();
  const [busy, setBusy] = useState(false);
  if (!hasPermission(P.EXPORT_ATTENDANCE_REPORTS)) return null;
  const tables: { value: ReportTable; label: string }[] = [
    { value: "by_class", label: "Classes" },
    ...(showChronic ? [{ value: "chronic" as const, label: "Students at risk" }] : []),
    ...(showGaps ? [{ value: "not_taken" as const, label: "Register gaps" }] : []),
  ];

  const download = async (table: ReportTable, fileType: ReportFileType) => {
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
        {tables.map((table) => (
          <DropdownMenuSub key={table.value}>
            <DropdownMenuSubTrigger>{table.label}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {FILE_TYPES.map((type) => (
                <DropdownMenuItem
                  key={type.value}
                  onSelect={() => void download(table.value, type.value)}
                >
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const rate = (value: number | null) => (value == null ? "None taken" : `${value.toFixed(1)}%`);

function ReportOverview({
  report,
  summary,
  showCounts,
  showChronic,
  showGaps,
  showLessons,
  onOpen,
}: {
  report: Report;
  summary: ReturnType<typeof summarizeAttendanceReport>;
  showCounts: boolean;
  showChronic: boolean;
  showGaps: boolean;
  showLessons: boolean;
  onOpen: (tab: ReportTab) => void;
}) {
  const showTrend = showCounts && report.trend !== undefined;
  const showAttention = showChronic || showGaps || showLessons;
  return (
    <>
      <ReportSummary
        report={report}
        summary={summary}
        showCounts={showCounts}
        showChronic={showChronic}
        showGaps={showGaps}
      />

      {(showTrend || showAttention) && (
        <div className={cn(
          "grid min-w-0 gap-4",
          showTrend && showAttention && "xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]",
        )}>
          {showTrend && <Trend weeks={report.trend ?? []} />}
          {showAttention && (
            <NeedsAttention
              report={report}
              summary={summary}
              showChronic={showChronic}
              showGaps={showGaps}
              showLessons={showLessons}
              onOpen={onOpen}
            />
          )}
        </div>
      )}

      <ClassPerformancePreview
        report={report}
        showCounts={showCounts}
        onOpen={() => onOpen("classes")}
      />
    </>
  );
}

function ReportSummary({
  report,
  summary,
  showCounts,
  showChronic,
  showGaps,
}: {
  report: Report;
  summary: ReturnType<typeof summarizeAttendanceReport>;
  showCounts: boolean;
  showChronic: boolean;
  showGaps: boolean;
}) {
  const cards = [
    ...(showCounts && summary.attendanceRate !== null
      ? [{
          label: "Attendance rate",
          value: rate(summary.attendanceRate),
          note: "Across submitted registers",
          icon: ChartNoAxesCombined,
          tone: "blue" as const,
        }]
      : []),
    ...(showChronic && summary.atRisk !== null
      ? [{
          label: "Students at risk",
          value: String(summary.atRisk),
          note: `Below the school's ${report.threshold}% line`,
          icon: UserRoundX,
          tone: "red" as const,
        }]
      : []),
    ...(showGaps && summary.registerGaps !== null
      ? [{
          label: "Registers not taken",
          value: String(summary.registerGaps),
          note: "Can still be completed late",
          icon: ClipboardX,
          tone: "amber" as const,
        }]
      : []),
    ...(showCounts && summary.late !== null
      ? [{
          label: "Late arrivals",
          value: String(summary.late),
          note: "Across submitted registers",
          icon: Clock3,
          tone: "green" as const,
        }]
      : []),
  ];

  if (!cards.length) return null;
  return (
    <section aria-label="Term attendance summary" className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Panel key={card.label} className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-3.5">
            <span className={cn(
              "grid size-10 place-items-center rounded-lg",
              card.tone === "blue" && "bg-blue-50 text-blue-700",
              card.tone === "red" && "bg-rose-50 text-rose-700",
              card.tone === "amber" && "bg-amber-50 text-amber-700",
              card.tone === "green" && "bg-emerald-50 text-emerald-700",
            )}>
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-gray-06">{card.label}</span>
              <strong className="mt-0.5 block text-2xl font-semibold tracking-[-0.02em] text-black-01">
                {card.value}
              </strong>
              <span className="mt-0.5 block text-xs text-gray-05">{card.note}</span>
            </span>
          </Panel>
        );
      })}
    </section>
  );
}

function NeedsAttention({
  report,
  summary,
  showChronic,
  showGaps,
  showLessons,
  onOpen,
}: {
  report: Report;
  summary: ReturnType<typeof summarizeAttendanceReport>;
  showChronic: boolean;
  showGaps: boolean;
  showLessons: boolean;
  onOpen: (tab: ReportTab) => void;
}) {
  const affectedClasses = new Set(report.not_taken?.map((row) => row.class_id) ?? []).size;
  const attention = [
    ...(showGaps && summary.registerGaps
      ? [{
          tab: "gaps" as const,
          title: `${summary.registerGaps} ${summary.registerGaps === 1 ? "register" : "registers"} not taken`,
          detail: `${affectedClasses} ${affectedClasses === 1 ? "class" : "classes"} affected`,
          icon: ClipboardX,
          variant: "pending" as const,
        }]
      : []),
    ...(showChronic && summary.atRisk
      ? [{
          tab: "risk" as const,
          title: `${summary.atRisk} ${summary.atRisk === 1 ? "student is" : "students are"} below ${report.threshold}%`,
          detail: "Review attendance before the term closes",
          icon: UserRoundX,
          variant: "destructive" as const,
        }]
      : []),
    ...(showLessons && summary.lessonsMissed
      ? [{
          tab: "lessons" as const,
          title: `${summary.lessonsMissed} ${summary.lessonsMissed === 1 ? "lesson" : "lessons"} missed`,
          detail: `${report.lessons_missed?.length ?? 0} subject-class entries`,
          icon: BookX,
          variant: "blue" as const,
        }]
      : []),
  ];

  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <Heading title="Needs attention" body="Start with gaps that can still be corrected." />
      {attention.length ? (
        <div className="divide-y divide-border">
          {attention.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onOpen(item.tab)}
                className="group flex w-full min-w-0 items-center gap-3 py-3 text-left"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white-03 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-black-01">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-gray-05">{item.detail}</span>
                </span>
                <Badge variant={item.variant} className="rounded-full">Open</Badge>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyLine text="Nothing in this report needs attention." />
      )}
    </Panel>
  );
}

function ClassPerformancePreview({
  report,
  showCounts,
  onOpen,
}: {
  report: Report;
  showCounts: boolean;
  onOpen: () => void;
}) {
  const scope = report.branch_dimension ? "Branch" : "Level";
  const rows = report.by_class.slice(0, 5);
  const withCounts = showCounts && rows.some((row) => row.counts);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading
        title="Class performance"
        body="Compare classes without leaving the overview."
        action={(
          <Button variant="outline" size="sm" onClick={onOpen}>
            View all classes
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      />
      <CustomTable
        tableHeaderList={["Class", scope, ...(withCounts ? ["Rate", "Absences", "Lateness", "Days not taken"] : [])]}
        defaultBodyList={rows}
        tableBodyList={rows.map((row) => ({
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
        cardBreakpoint="lg"
        hidePagination
        emptyText="No classes in scope"
      />
    </Panel>
  );
}

/**
 * The attendance rate, week by week: one series, so no legend; a week with no
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
        title="Attendance rate, week by week"
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

function ByClass({ report, showCounts }: { report: Report; showCounts: boolean }) {
  const scope = report.branch_dimension ? "Branch" : "Level";
  const withCounts = showCounts && report.by_class.some((row) => row.counts);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading title="By class" body="Rate, absences, lateness and days not taken." />
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
        cardBreakpoint="lg"
        hidePagination
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
        cardBreakpoint="lg"
        hidePagination
        emptyText="No levels in scope"
      />
    </Panel>
  );
}

function Chronic({ report }: { report: Report }) {
  const rows = report.chronic ?? [];
  const { hasPermission } = usePermissions();
  const canOpen = hasPermission(P.BROWSE_STUDENTS);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading
        title="Students at risk"
        body={`Below ${report.threshold}%, the line this school set in Settings. The platform does not decide who is on this list.`}
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
          cardBreakpoint="lg"
          hidePagination
        />
      )}
    </Panel>
  );
}

/** Every day a class owed a register and none was submitted, newest first, a page at a time. */
function NotTaken({ report }: { report: Report }) {
  const { formatDay } = useSchoolDisplay();
  const teacherHidden = useClassTeacherAccess().hidden;
  const [page, setPage] = useState(1);
  const rows = report.not_taken ?? [];
  const scope = report.branch_dimension ? "Branch" : "Level";
  const shown = rows.slice((page - 1) * NOT_TAKEN_PAGE, page * NOT_TAKEN_PAGE);
  return (
    <Panel as="section" className="space-y-4 p-4 sm:p-5">
      <Heading
        title="Registers not taken"
        body={`${rows.length} across the term. Each opens the register, which can still be taken late.`}
      />
      {rows.length === 0 ? (
        <EmptyLine text="Every register in this term was taken." />
      ) : (
        <CustomTable
          tableHeaderList={["Date", "Class", ...(teacherHidden ? [] : ["Class teacher"]), scope]}
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
            ...(teacherHidden ? {} : { "Class teacher": row.class_teacher_name ?? "No class teacher" }),
            [scope]: report.branch_dimension ? row.branch?.name ?? "No branch" : row.level_name,
          }))}
          currentPage={page}
          totalPage={Math.ceil(rows.length / NOT_TAKEN_PAGE)}
          onPageChange={(next) => setPage(Number(next) || 1)}
          cardBreakpoint="lg"
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
        cardBreakpoint="lg"
        hidePagination
        emptyText="No missed lessons in this term"
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
