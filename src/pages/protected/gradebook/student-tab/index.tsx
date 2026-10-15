import { Link } from "react-router";
import { Award } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useGetStudentResultsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { ResultHistoryEntry, ResultTerm } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";

import { YearBlock } from "../report-card/report-card";

const KIND: Record<string, { text: string; variant: "pending" | "active" | "blue" }> = {
  HOLD_PLACED: { text: "Hold placed", variant: "pending" },
  HOLD_LIFTED: { text: "Hold lifted", variant: "active" },
  AMENDMENT: { text: "Amendment", variant: "blue" },
};

/**
 * A student's Results tab: every term of their school years, newest first,
 * and the holds and corrections on their results.
 *
 * A published term shows the overall average, the position where that term
 * ranked, whether the report card was released, and each subject; a term
 * with nothing published says so in one calm line rather than showing an
 * empty table. The last term of a school year carries the year's block.
 * Nothing in the history is ever deleted, and the history section appears
 * only when there is something in it.
 *
 * Field Access: every figure, the hold reasons and the amendment notes are
 * left out by the server where the reader may not read them, and their
 * columns and lines leave with them.
 */
export function StudentResultsTab({ studentId }: { studentId: number }) {
  const { data, isLoading, isError, refetch } = useGetStudentResultsQuery(studentId);
  const results = data?.data;

  if (isError) {
    return (
      <OutlinedNotice
        icon={Award}
        title="We could not load the results"
        body="Something went wrong on our side."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }
  if (isLoading || !results) return <Skeleton className="h-64 w-full rounded-md" />;

  return (
    <div className="grid grid-cols-1 gap-4">
      {results.terms.length === 0 ? (
        <OutlinedNotice icon={Award} title="No term yet" body="Results appear here once the student's first term has begun." />
      ) : (
        results.terms.map((term) => <TermCard key={term.term.id} term={term} studentId={studentId} />)
      )}
      {results.history.length > 0 && <History entries={results.history} />}
    </div>
  );
}

function TermCard({ term, studentId }: { term: ResultTerm; studentId: number }) {
  const title = `${term.session.name} · ${term.term.name}`;
  if (!term.published) {
    return (
      <Panel as="section" className="space-y-1 p-4 sm:p-5">
        <h3 className="font-mont text-base font-semibold text-black-01">{title}</h3>
        <p className="text-sm text-gray-06">{term.message}</p>
      </Panel>
    );
  }
  const subjects = term.subjects ?? [];
  const showsTotal = subjects.some((subject) => "total" in subject);
  const showsGrade = subjects.some((subject) => "grade" in subject);
  const showsRemark = subjects.some((subject) => "remark" in subject);

  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-mont text-base font-semibold text-black-01">{title}</h3>
          {term.version && term.version > 1 && (
            <p className="text-xs text-gray-05">Version {term.version}: corrected after publication.</p>
          )}
        </div>
        {term.class_id && (
          <Button size="sm" variant="outline" asChild>
            <Link to={routesPath.PROTECTED.GRADEBOOK.REPORT_CARD_ID(term.class_id, studentId, term.term.id)}>
              Preview and print
            </Link>
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {term.overall_average !== undefined && (
          <Figure label="Overall average" value={term.overall_average ? `${term.overall_average}%` : "-"} />
        )}
        {term.position && <Figure label="Position" value={term.position} />}
        <Figure label="Report card" value={term.release_label ?? "-"} />
      </dl>
      {subjects.length > 0 && (showsTotal || showsGrade) && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              {showsTotal && <TableHead className="text-right">Total</TableHead>}
              {showsGrade && <TableHead className="text-center">Grade</TableHead>}
              {showsRemark && <TableHead>Remark</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.name}>
                <TableCell className="font-medium text-black-01">{subject.name}</TableCell>
                {showsTotal && <TableCell className="text-right">{subject.total ?? "-"}</TableCell>}
                {showsGrade && <TableCell className="text-center">{subject.grade ?? "-"}</TableCell>}
                {showsRemark && <TableCell>{subject.remark ?? "-"}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {term.cumulative && <YearBlock cumulative={term.cumulative} />}
    </Panel>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-gray-50 px-3 py-2">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="text-sm font-semibold text-black-01">{value}</dd>
    </div>
  );
}

function History({ entries }: { entries: ResultHistoryEntry[] }) {
  const { formatDate } = useSchoolDisplay();
  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div>
        <h3 className="font-mont text-base font-semibold text-black-01">History</h3>
        <p className="text-sm text-gray-06">Amendments and holds on this student&apos;s results. Nothing here is deleted.</p>
      </div>
      <ul className="divide-y divide-border">
        {entries.map((entry, index) => {
          const kind = KIND[entry.kind] ?? { text: entry.kind, variant: "pending" as const };
          const note = entry.reason ?? entry.lift_note ?? entry.amendment?.amendment_reason;
          return (
            <li key={`${entry.kind}-${entry.at}-${index}`} className="flex flex-wrap items-start gap-3 py-3">
              <Badge variant={kind.variant} className="shrink-0 rounded-full">
                {kind.text}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-black-01">{entry.text}</p>
                {note && <p className="text-sm text-gray-06">{note}</p>}
                {entry.amendment?.decision_note && (
                  <p className="text-sm text-gray-06">Decision: {entry.amendment.decision_note}</p>
                )}
                <p className="text-xs text-gray-05">
                  {[entry.by ? `By ${entry.by}` : null, formatDate(entry.at)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
