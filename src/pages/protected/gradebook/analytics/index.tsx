import type { ReactNode } from "react";
import { ChartColumn, Download, Loader2 } from "lucide-react";
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
import { useSchoolWords } from "@/hooks/use-school-words";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { useExportAnalyticsMutation, useGetAnalyticsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { Analytics, AnalyticsTable } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { apiErrorMessage, parseApiError } from "@/utils/api-error";
import { downloadObjectUrl } from "@/utils/attachment-download";

/**
 * Performance analytics: how the term's published results read, from
 * published results only and never as a judgement on a teacher.
 *
 * Four parts, each drawn only when it has something to say: each subject in
 * each published class (average, grade spread, pass rate, how many marked);
 * the same subject across the classes that offer it, with the gap between
 * them; each student's overall average against their most recent earlier
 * published term, biggest fall first; and, where the school ranks, the top of
 * each class. The first and third export as CSV or Excel, cut by the server
 * from the same figures, for a holder of the export key.
 *
 * Field Access: the class figures, the overall averages and the positions
 * are left out by the server where the reader may not read them, and their
 * columns leave the tables. The top of each class needs both the position
 * and the overall average, so it is sent only to a reader of both.
 */
export default function AnalyticsPage() {
  const { branch } = useBranchLens();
  const { data, isLoading, isError, error, refetch } = useGetAnalyticsQuery({ branch });
  const report = data?.data;
  const status = parseApiError(error).status;

  return (
    <PageShell className="content-start gap-4" grid>
      <PageHeader
        title="Performance analytics"
        description={
          report
            ? `${report.term.name}, ${report.term.session} · ${report.scope.published_count === 1 ? "1 published class" : `${report.scope.published_count} published classes`}`
            : undefined
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
  const subjects = report.subjects;
  const showsAverage = subjects.some((row) => "average" in row);
  const showsSpread = subjects.some((row) => "spread" in row);
  const showsPass = subjects.some((row) => "pass_rate" in row);
  const showsFigures = report.movers.some((row) => "change" in row);

  return (
    <>
      <Card
        title="By subject and class"
        note="Average, grade spread and pass rate."
        action={<ExportMenu table="subjects" />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Class</TableHead>
              {showsAverage && <TableHead className="text-right">Average</TableHead>}
              {showsSpread && <TableHead>Grade spread</TableHead>}
              {showsPass && <TableHead className="text-right">Pass rate</TableHead>}
              <TableHead className="text-right">Marked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((row) => (
              <TableRow key={`${row.class.id}:${row.subject.id}`}>
                <TableCell className="font-medium text-black-01">{row.subject.name}</TableCell>
                <TableCell>{row.class.name}</TableCell>
                {showsAverage && <TableCell className="text-right">{row.average ? `${row.average}%` : "-"}</TableCell>}
                {showsSpread && (
                  <TableCell className="whitespace-nowrap text-gray-06">
                    {row.spread?.map((band) => `${band.grade} ${band.count}`).join(" · ") || "-"}
                  </TableCell>
                )}
                {showsPass && (
                  <TableCell className="text-right">
                    {row.pass_rate === null || row.pass_rate === undefined ? "-" : `${row.pass_rate}%`}
                  </TableCell>
                )}
                <TableCell className="text-right">{row.marked}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {report.compare.length > 0 && (
        <Card
          title="The same subject across classes"
          note="Where more than one class offers it. A gap is a question for the head of department, not a judgement on a teacher."
        >
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {report.compare.map((row) => (
              <li key={row.subject.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold text-black-01">{row.subject.name}</p>
                <dl className="mt-2 space-y-1 text-sm">
                  {row.arms.map((arm) => (
                    <div key={arm.class.id} className="flex justify-between gap-3">
                      <dt className="text-gray-06">{arm.class.name}</dt>
                      <dd className="font-medium text-black-01">{arm.average ? `${arm.average}%` : "-"}</dd>
                    </div>
                  ))}
                </dl>
                {row.gap && <p className="mt-2 text-xs text-gray-05">Gap of {row.gap} points between highest and lowest</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title={`${Term} on ${term}, by student`}
        note={
          report.movers.length
            ? `Change in overall average against the student's most recent published ${term}. A student with no earlier published result is not on this table.`
            : `No student in a published class has an earlier published ${term} to compare against yet.`
        }
        action={report.movers.length ? <ExportMenu table="movers" /> : undefined}
      >
        {report.movers.length > 0 && (
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
              {report.movers.map((row) => {
                const falling = row.change?.startsWith("-");
                return (
                  <TableRow key={row.student.id}>
                    <TableCell className="font-medium text-black-01">{row.student.name}</TableCell>
                    <TableCell>{row.class.name}</TableCell>
                    <TableCell>
                      {row.from ? `${row.from}% ` : ""}
                      <span className="text-xs text-gray-05">{row.from_term.name}</span>
                    </TableCell>
                    {showsFigures && <TableCell className="text-right">{row.to ? `${row.to}%` : "-"}</TableCell>}
                    {showsFigures && (
                      <TableCell className={cn("text-right font-medium", falling ? "text-[#A32D2D]" : "text-[#0F6B32]")}>
                        {row.change ?? "-"}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {report.ranks && report.tops && report.tops.length > 0 && (
        <Card title="Top of each class" note="Where the school ranks.">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.tops.map((top) => (
              <li key={top.class.id} className="rounded-md border border-border p-3">
                <p className="text-xs text-gray-05">{top.class.name}</p>
                <p className="text-sm font-semibold text-black-01">{top.students.map((student) => student.name).join(", ")}</p>
                <p className="text-xs text-gray-06">{top.average}% overall</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Card({ title, note, action, children }: { title: string; note: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-mont text-base font-semibold text-black-01">{title}</h2>
          <p className="text-sm text-gray-06">{note}</p>
        </div>
        {action}
      </div>
      {children}
    </Panel>
  );
}

/** Downloads one table as CSV or Excel; offered only to a holder of the export key. */
function ExportMenu({ table }: { table: AnalyticsTable }) {
  const { branch } = useBranchLens();
  const { hasPermission } = usePermissions();
  const [download, downloading] = useExportAnalyticsMutation();
  if (!hasPermission(P.EXPORT_RESULT_ANALYTICS)) return null;

  const take = async (fileType: "csv" | "xlsx") => {
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
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={downloading.isLoading}>
          {downloading.isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void take("csv")}>CSV</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void take("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
