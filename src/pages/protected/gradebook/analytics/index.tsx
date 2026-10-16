import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChartColumn, Download, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolWords } from "@/hooks/use-school-words";
import { cn } from "@/lib/utils";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { P } from "@/permissions";
import { useExportAnalyticsMutation, useGetAnalyticsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { Analytics, AnalyticsSubject, AnalyticsTable } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import { downloadObjectUrl } from "@/utils/attachment-download";

type SubjectSummary = {
  id: number;
  name: string;
  rows: AnalyticsSubject[];
  marked: number;
  average?: number;
  passRate?: number;
  spread: { grade: string; count: number }[];
};

type ClassSummary = {
  id: number;
  name: string;
  subjects: number;
  marked: number;
  average?: number;
  passRate?: number;
};

/**
 * Published-result overview for the active term and branch lens.
 *
 * Summary figures are weighted from the subject entries returned by the
 * server. Optional figures stay optional throughout the page, so Field Access
 * omissions remove their cards, labels and comparisons instead of leaving an
 * empty or inferable placeholder.
 */
export default function AnalyticsPage() {
  const { branch } = useBranchLens();
  const { data, isLoading, isError, error, refetch } = useGetAnalyticsQuery({ branch });
  const report = data?.data;
  const status = parseApiError(error).status;

  return (
    <PageShell className="content-start gap-4" grid>
      <PageHeader
        title="Gradebook analytics"
        description={
          report
            ? `${report.term.name}, ${report.term.session} · ${report.scope.published_count === 1 ? "1 published class" : `${report.scope.published_count} published classes`}`
            : undefined
        }
        actions={
          report && report.scope.published_count > 0 ? (
            <ExportMenu tables={report.movers.length > 0 ? ["subjects", "movers"] : ["subjects"]} />
          ) : undefined
        }
      />
      {status === 403 ? (
        <OutlinedNotice
          icon={ChartColumn}
          title="Analytics are not yours to open"
          body="Performance analytics open to the people the school gives them to."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={ChartColumn}
          title="We could not load the analytics"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !report ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : report.scope.published_count === 0 ? (
        <OutlinedNotice
          icon={ChartColumn}
          title="Nothing published yet"
          body="Nothing is published yet, so there is nothing to analyse. Figures appear once the principal publishes a class."
        />
      ) : (
        <AnalyticsBody report={report} />
      )}
    </PageShell>
  );
}

function AnalyticsBody({ report }: { report: Analytics }) {
  const { term, Term } = useSchoolWords();
  const subjects = useMemo(() => summariseSubjects(report.subjects), [report.subjects]);
  const classes = useMemo(() => summariseClasses(report.subjects), [report.subjects]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(subjects[0]?.id ?? null);
  const focusRef = useRef<HTMLElement>(null);
  const selected = subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0];
  const weightedAverage = weightedFigure(report.subjects, "average");
  const weightedPassRate = weightedFigure(report.subjects, "pass_rate");
  const showsFigures = report.movers.some((row) => "change" in row);
  const attention = useMemo(() => buildAttention(report), [report]);

  const selectSubject = (subjectId: number) => {
    setSelectedSubjectId(subjectId);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => focusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <section aria-label="Term summary" className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Published classes" value={String(report.scope.published_count)} note="Ready for analysis" />
        <Metric label="Subjects reported" value={String(subjects.length)} note="Across published classes" />
        {weightedAverage !== undefined && (
          <Metric label="Average mark" value={`${formatNumber(weightedAverage)}%`} note="Across reported marks" />
        )}
        {weightedPassRate !== undefined && (
          <Metric label="Pass rate" value={`${formatNumber(weightedPassRate)}%`} note="Across reported marks" />
        )}
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
        <div className="grid min-w-0 gap-4">
          <Card title="Subject performance" note="Select a subject to compare its published classes.">
            {subjects.length > 0 ? (
              <ul className="divide-y divide-border">
                {subjects.map((subject) => {
                  const active = subject.id === selected?.id;
                  return (
                    <li key={subject.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectSubject(subject.id)}
                        className={cn(
                          "group grid w-full min-w-0 grid-cols-1 gap-2 rounded-md px-1 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)] sm:items-center",
                          "hover:bg-[#F4F7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          active && "bg-[#EEF3FF]",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-black-01">{subject.name}</span>
                          <span className="mt-0.5 block text-xs text-gray-05">
                            {subject.rows.length === 1 ? "1 class" : `${subject.rows.length} classes`} · {subject.marked} marked
                          </span>
                          {subject.spread.length > 0 && (
                            <span className="mt-1.5 flex flex-wrap gap-1" aria-label="Grade spread">
                              {subject.spread.map((band) => (
                                <span key={band.grade} className="rounded-full bg-gray-02 px-2 py-0.5 text-[11px] font-medium text-gray-06">
                                  {band.grade} {band.count}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        {(subject.average !== undefined || subject.passRate !== undefined) && (
                          <span className="grid gap-2">
                            {subject.average !== undefined && <FigureBar label="Average" value={subject.average} />}
                            {subject.passRate !== undefined && <FigureBar label="Pass rate" value={subject.passRate} tone="green" />}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-06">No subject figures are available for the published classes.</p>
            )}
          </Card>

          <Card
            title={`${Term} on ${term}`}
            note={
              report.movers.length
                ? `Overall average against each student's most recent published ${term}.`
                : `No student in a published class has an earlier published ${term} to compare against yet.`
            }
          >
            {report.movers.length > 0 && (
              <>
                <ul className="grid gap-2 md:hidden">
                  {report.movers.map((row) => (
                    <li key={row.student.id} className="rounded-md border border-border p-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-black-01">{row.student.name}</p>
                          <p className="text-xs text-gray-05">{row.class.name}</p>
                        </div>
                        {showsFigures && <Movement change={row.change} />}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt className="text-gray-05">{row.from_term.name}</dt>
                          <dd className="mt-0.5 font-medium text-black-01">{row.from ? `${row.from}%` : "-"}</dd>
                        </div>
                        {showsFigures && (
                          <div>
                            <dt className="text-gray-05">This {term}</dt>
                            <dd className="mt-0.5 font-medium text-black-01">{row.to ? `${row.to}%` : "-"}</dd>
                          </div>
                        )}
                      </dl>
                    </li>
                  ))}
                </ul>
                <div className="hidden min-w-0 overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Previous {term}</TableHead>
                        {showsFigures && <TableHead className="text-right">This {term}</TableHead>}
                        {showsFigures && <TableHead className="text-right">Change</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.movers.map((row) => (
                        <TableRow key={row.student.id}>
                          <TableCell className="font-medium text-black-01">{row.student.name}</TableCell>
                          <TableCell>{row.class.name}</TableCell>
                          <TableCell>{row.from ? `${row.from}% ` : ""}<span className="text-xs text-gray-05">{row.from_term.name}</span></TableCell>
                          {showsFigures && <TableCell className="text-right">{row.to ? `${row.to}%` : "-"}</TableCell>}
                          {showsFigures && <TableCell className="text-right"><Movement change={row.change} /></TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </div>

        <aside ref={focusRef} className="grid min-w-0 scroll-mt-4 gap-4">
          {selected && (
            <Card title={selected.name} note="Published class comparison for the selected subject.">
              <ul className="space-y-3">
                {selected.rows.map((row) => (
                  <li key={row.class.id} className="rounded-md border border-border p-3">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-black-01">{row.class.name}</p>
                      <span className="shrink-0 text-xs text-gray-05">{row.marked} marked</span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {row.average !== undefined && row.average !== null && <FigureBar label="Average" value={Number(row.average)} />}
                      {row.pass_rate !== undefined && row.pass_rate !== null && <FigureBar label="Pass rate" value={row.pass_rate} tone="green" />}
                    </div>
                  </li>
                ))}
              </ul>
              {report.compare.find((row) => row.subject.id === selected.id)?.gap && (
                <p className="mt-3 text-xs text-gray-05">
                  Gap of {report.compare.find((row) => row.subject.id === selected.id)?.gap} points between highest and lowest.
                </p>
              )}
            </Card>
          )}

          {attention.length > 0 && (
            <Card title="Needs attention" note="Signals to review, not judgements on a teacher.">
              <ul className="space-y-2">
                {attention.map((item) => (
                  <li key={item.key} className="flex items-start gap-2.5 rounded-md bg-amber-50 p-3 text-sm text-[#854F0B]">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {classes.length > 0 && (
            <Card title="Classes at a glance" note="Weighted from each class's published subject entries.">
              <ul className="divide-y divide-border">
                {classes.map((row) => (
                  <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-black-01">{row.name}</p>
                      <p className="text-xs text-gray-05">{row.subjects} {row.subjects === 1 ? "subject" : "subjects"} · {row.marked} marked entries</p>
                    </div>
                    <div className="flex shrink-0 gap-3 text-right">
                      {row.average !== undefined && <div><p className="text-xs text-gray-05">Average</p><p className="text-sm font-semibold text-black-01">{formatNumber(row.average)}%</p></div>}
                      {row.passRate !== undefined && <div><p className="text-xs text-gray-05">Pass</p><p className="text-sm font-semibold text-black-01">{formatNumber(row.passRate)}%</p></div>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.ranks && report.tops && report.tops.length > 0 && (
            <Card title="Top of each class" note="Shown where the school ranks results.">
              <ul className="space-y-2">
                {report.tops.map((top) => (
                  <li key={top.class.id} className="rounded-md border border-border p-3">
                    <p className="text-xs text-gray-05">{top.class.name}</p>
                    <p className="mt-0.5 text-sm font-semibold text-black-01">{top.students.map((student) => student.name).join(", ")}</p>
                    <p className="text-xs text-gray-06">{top.average}% overall</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <Panel as="section" className="p-3 sm:p-4"><p className="text-xs font-medium text-gray-05">{label}</p><p className="mt-1 font-mont text-xl font-semibold text-black-01 sm:text-2xl">{value}</p><p className="mt-0.5 text-[11px] text-gray-05">{note}</p></Panel>;
}

function FigureBar({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "green" }) {
  const bounded = Math.max(0, Math.min(value, 100));
  return (
    <span className="grid grid-cols-[4.5rem_minmax(4rem,1fr)_3rem] items-center gap-2 text-xs">
      <span className="text-gray-05">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-gray-02"><span className={cn("block h-full rounded-full", tone === "green" ? "bg-[#2F9E5B]" : "bg-pry-01")} style={{ width: `${bounded}%` }} /></span>
      <span className="text-right font-semibold text-black-01">{formatNumber(value)}%</span>
    </span>
  );
}

function Movement({ change }: { change?: string }) {
  const falling = change?.startsWith("-");
  return <span className={cn("inline-flex items-center justify-end gap-1 font-medium", falling ? "text-[#A32D2D]" : "text-[#0F6B32]")}>{falling ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUp className="size-3.5" aria-hidden="true" />}{change ?? "-"}</span>;
}

function Card({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  return <Panel as="section" className="min-w-0 p-4 sm:p-5"><div className="min-w-0"><h2 className="font-mont text-base font-semibold text-black-01">{title}</h2><p className="mt-0.5 text-sm text-gray-06">{note}</p></div>{children && <div className="mt-4 min-w-0">{children}</div>}</Panel>;
}

function summariseSubjects(rows: AnalyticsSubject[]): SubjectSummary[] {
  const groups = new Map<number, { name: string; rows: AnalyticsSubject[] }>();
  for (const row of rows) {
    const group = groups.get(row.subject.id) ?? { name: row.subject.name, rows: [] };
    group.rows.push(row);
    groups.set(row.subject.id, group);
  }
  return Array.from(groups, ([id, group]) => ({ id, name: group.name, rows: group.rows, marked: group.rows.reduce((total, row) => total + row.marked, 0), average: weightedFigure(group.rows, "average"), passRate: weightedFigure(group.rows, "pass_rate"), spread: mergeSpread(group.rows) })).sort((a, b) => a.name.localeCompare(b.name));
}

function summariseClasses(rows: AnalyticsSubject[]): ClassSummary[] {
  const groups = new Map<number, { name: string; rows: AnalyticsSubject[] }>();
  for (const row of rows) {
    const group = groups.get(row.class.id) ?? { name: row.class.name, rows: [] };
    group.rows.push(row);
    groups.set(row.class.id, group);
  }
  return Array.from(groups, ([id, group]) => ({ id, name: group.name, subjects: group.rows.length, marked: group.rows.reduce((total, row) => total + row.marked, 0), average: weightedFigure(group.rows, "average"), passRate: weightedFigure(group.rows, "pass_rate") })).sort((a, b) => a.name.localeCompare(b.name));
}

function weightedFigure(rows: AnalyticsSubject[], field: "average" | "pass_rate") {
  let weighted = 0;
  let marked = 0;
  for (const row of rows) {
    const value = row[field];
    if (value === undefined || value === null) continue;
    const number = Number(value);
    if (!Number.isFinite(number)) continue;
    weighted += number * row.marked;
    marked += row.marked;
  }
  return marked > 0 ? weighted / marked : undefined;
}

function mergeSpread(rows: AnalyticsSubject[]) {
  const totals = new Map<string, number>();
  for (const row of rows) for (const band of row.spread ?? []) totals.set(band.grade, (totals.get(band.grade) ?? 0) + band.count);
  return Array.from(totals, ([grade, count]) => ({ grade, count }));
}

function buildAttention(report: Analytics) {
  const comparisons = report.compare.filter((row) => row.gap !== undefined && Number(row.gap) > 0).sort((a, b) => Number(b.gap) - Number(a.gap)).slice(0, 2).map((row) => ({ key: `subject:${row.subject.id}`, text: `${row.subject.name} has a ${row.gap}-point gap between comparable classes.` }));
  const movements = report.movers.filter((row) => row.change?.startsWith("-")).slice(0, 2).map((row) => ({ key: `student:${row.student.id}`, text: `${row.student.name}'s overall average is ${row.change?.replace("-", "")} points below ${row.from_term.name}.` }));
  return [...comparisons, ...movements];
}

function formatNumber(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

/** Downloads the permitted analytics tables in CSV or Excel format. */
function ExportMenu({ tables }: { tables: AnalyticsTable[] }) {
  const { branch } = useBranchLens();
  const { hasPermission } = usePermissions();
  const [download, downloading] = useExportAnalyticsMutation();
  if (!hasPermission(P.EXPORT_RESULT_ANALYTICS)) return null;

  const take = async (table: AnalyticsTable, fileType: "csv" | "xlsx") => {
    const result = await download({ table, fileType, branch });
    if ("error" in result) {
      toast.error("The table could not be exported", { description: apiErrorMessage(result.error, "Try again.") });
      return;
    }
    downloadObjectUrl(result.data.url, result.data.filename);
    URL.revokeObjectURL(result.data.url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="outline" disabled={downloading.isLoading}>{downloading.isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}Export</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {tables.flatMap((table) => {
          const label = table === "subjects" ? "Subject performance" : "Term movement";
          return [<DropdownMenuItem key={`${table}:csv`} onSelect={() => void take(table, "csv")}>{label} CSV</DropdownMenuItem>, <DropdownMenuItem key={`${table}:xlsx`} onSelect={() => void take(table, "xlsx")}>{label} Excel</DropdownMenuItem>];
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
