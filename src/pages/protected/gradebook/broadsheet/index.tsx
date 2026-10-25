import { useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ClipboardList, Printer, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import { useGetBroadsheetQuery, useSubmitClassMutation } from "@/redux/services/gradebook/gradebook-api";
import type { Broadsheet, BroadsheetCell, ClassKey } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { ConfirmDialog } from "@/pages/protected/students/drawers/confirm-dialog";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { CLASS_STAGE } from "../components/class-stage";
import { CompileDrawer } from "./compile-drawer";

const ordinal = (n: number) => {
  const v = n % 100;
  const suffix = ["th", "st", "nd", "rd"][(v - 20) % 10] ?? ["th", "st", "nd", "rd"][v] ?? "th";
  return `${n}${suffix}`;
};

/**
 * A class's broadsheet: every student against every subject the class owes,
 * with each student's average, position (where the school ranks) and whether
 * the class teacher's comment is written.
 *
 * The class teacher compiles from here: Open on a row is the compile drawer,
 * where the comment and the conduct ratings are written student by student,
 * and Submit sends the class to the principal once every subject is in and
 * every comment written. The server says whether this reader may submit
 * (`can_submit`), and why not (`submit_blockers`). A reader of the hub or the
 * approvals queue reads the broadsheet and opens a drawer read-only.
 *
 * Prints landscape for the results meeting, the gradebook chrome left off.
 *
 * Field Access: the average, the position and the comment status follow their
 * result switches. The compact summary repeats only data whose source field is
 * readable, so a hidden field leaves both its table column and summary card.
 */
export default function BroadsheetPage() {
  const params = useParams();
  const [search] = useSearchParams();
  const key: ClassKey = { classId: Number(params.classId), term: Number(search.get("term")) || undefined };
  const valid = Number.isFinite(key.classId);
  const { data, isLoading, isError, error, refetch } = useGetBroadsheetQuery(key, { skip: !valid });
  const sheet = data?.data;
  const status = valid ? parseApiError(error).status : 404;

  return (
    <PageShell className="content-start gap-4" grid>
      {status === 404 || status === 403 ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="This broadsheet is not yours to open"
          body="A class's broadsheet opens to its class teacher, and to whoever follows results or approves them for its branch."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title="We could not open this broadsheet"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !sheet ? (
        <>
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-96 w-full rounded-md" />
        </>
      ) : (
        <BroadsheetBody sheet={sheet} classKey={key} />
      )}
    </PageShell>
  );
}

function BroadsheetBody({ sheet, classKey }: { sheet: Broadsheet; classKey: ClassKey }) {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_RESULT);
  const [opened, setOpened] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submit, submitting] = useSubmitClassMutation();

  const showAverage = !access.isHidden("average");
  const showPosition = sheet.ranks && !access.isHidden("position");
  const showComment = !access.isHidden("comment_done");
  const mayOpen = hasAnyPermission(P.SUBMIT_CLASS_RESULTS, P.PUBLISH_RESULTS);
  const open = sheet.stage === "ENTERING" || sheet.stage === "COMPILING";
  const offersSubmit = hasPermission(P.SUBMIT_CLASS_RESULTS) && open;
  const missing = sheet.submit_blockers.subjects_missing.length;
  const comments = sheet.submit_blockers.comments_missing;
  const submitLabel = missing
    ? `${missing} subject${missing === 1 ? "" : "s"} missing`
    : comments
      ? `${comments} comment${comments === 1 ? "" : "s"} to write`
      : "Submit the class";
  const subjectsIn = sheet.subjects.filter((subject) => subject.in).length;
  const commentsReady = sheet.rows.filter((row) => row.comment_done).length;
  const readableAverages = (showAverage ? sheet.rows : [])
    .flatMap((row) => row.average === null || row.average === undefined ? [] : [Number(row.average)])
    .filter((value) => Number.isFinite(value));
  const classAverage = readableAverages.length
    ? `${(readableAverages.reduce((sum, value) => sum + value, 0) / readableAverages.length).toFixed(1)}%`
    : "-";

  const onSubmit = async () => {
    const result = await submit(classKey);
    setConfirming(false);
    if ("error" in result) return;
    toast.success(`${sheet.class.name} submitted`, { description: "It is with the principal for approval." });
  };

  return (
    <>
      {sheet.returned && open && (
        <div role="status" className="rounded-md border border-[#F5C4C4] bg-[#FCEBEB] px-4 py-3 print-hide">
          <p className="text-sm font-semibold text-[#A32D2D]">
            Returned{sheet.returned.by ? ` by ${sheet.returned.by}` : ""}
          </p>
          {sheet.returned.note && <p className="mt-1 text-sm text-black-01">{sheet.returned.note}</p>}
        </div>
      )}

      <PageHeader
        title={`${sheet.class.name} · broadsheet`}
        description={[
          sheet.term.name,
          sheet.class_teacher === undefined
            ? null
            : sheet.class_teacher
              ? `class teacher ${sheet.class_teacher.name}`
              : "no class teacher",
          `${sheet.rows.length} students`,
        ].filter(Boolean).join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2 print-hide">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Print
            </Button>
            {offersSubmit && (
              <Button disabled={!sheet.can_submit || submitting.isLoading} onClick={() => setConfirming(true)}>
                {submitLabel}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <SummaryCard label="Current stage">
          <Badge variant={CLASS_STAGE[sheet.stage].variant} className="rounded-full">
            {CLASS_STAGE[sheet.stage].text}
          </Badge>
        </SummaryCard>
        <SummaryCard label="Subject sheets" value={`${subjectsIn} of ${sheet.subjects.length}`} />
        {showComment && <SummaryCard label="Comments ready" value={`${commentsReady} of ${sheet.rows.length}`} />}
        {showAverage && <SummaryCard label="Class average" value={classAverage} />}
      </div>

      {sheet.attendance_warning && sheet.attendance_warning.days_not_taken > 0 && (
        <Note>
          {sheet.attendance_warning.days_not_taken} school day{sheet.attendance_warning.days_not_taken === 1 ? "" : "s"} this
          term had no register taken for this class, so the attendance on these report cards is short by{" "}
          {sheet.attendance_warning.days_not_taken === 1 ? "that day" : "those days"}.
        </Note>
      )}
      {sheet.gaps.length > 0 && (
        <Note>
          {sheet.gaps.length} subject{sheet.gaps.length === 1 ? "" : "s"} not in yet:{" "}
          {sheet.gaps.map((g) => `${g.subject.name} (${g.main_teacher?.name ?? "no main teacher"})`).join(", ")}. The
          class cannot be submitted until every subject is in.
        </Note>
      )}

      <Panel as="section" className="print-area overflow-hidden">
        <p className="print-only hidden px-2 pb-2 font-mont text-base font-semibold">
          {sheet.class.name} · {sheet.term.name}
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-44 bg-white">Student</TableHead>
              {sheet.subjects.map((subject) => (
                <TableHead key={subject.id} className="text-center" title={subject.name}>
                  <Link
                    to={routesPath.PROTECTED.GRADEBOOK.SHEET_ID(sheet.class.id, subject.id, classKey.term)}
                    className="font-semibold text-black-01 hover:text-primary hover:underline"
                  >
                    {subject.short}
                  </Link>
                  {!subject.in && (
                    <div className="text-[11px] font-normal text-gray-05">{subject.main_teacher?.name ?? "No teacher"}</div>
                  )}
                </TableHead>
              ))}
              {showAverage && <TableHead className="text-right">Average</TableHead>}
              {showPosition && <TableHead className="text-right">Position</TableHead>}
              {(showComment || mayOpen) && <TableHead className="print-hide">Compile</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheet.rows.map((row) => (
              <TableRow key={row.student.id}>
                <TableCell className="sticky left-0 z-10 bg-white">
                  <p className="font-medium text-black-01">{row.student.name}</p>
                  {row.student.admission_number && (
                    <p className="text-xs text-gray-05">{row.student.admission_number}</p>
                  )}
                </TableCell>
                {sheet.subjects.map((subject) => (
                  <TableCell key={subject.id} className="text-center">
                    <CellText cell={row.cells.find((c) => c.subject === subject.id)} />
                  </TableCell>
                ))}
                {showAverage && <TableCell className="text-right font-medium">{row.average ?? "-"}</TableCell>}
                {showPosition && (
                  <TableCell className="text-right">{row.position ? ordinal(row.position) : "-"}</TableCell>
                )}
                {(showComment || mayOpen) && (
                  <TableCell className="print-hide">
                    <span className="inline-flex items-center gap-2">
                      {showComment && (
                        <Badge variant={row.comment_done ? "active" : "pending"} className="min-w-28 justify-center rounded-full">
                          {row.comment_done ? "Done" : "No comment"}
                        </Badge>
                      )}
                      {mayOpen && (
                        <Button size="sm" variant="outline" onClick={() => setOpened(row.student.id)}>
                          Open
                        </Button>
                      )}
                    </span>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      {opened !== null && (
        <CompileDrawer
          classKey={classKey}
          className={sheet.class.name}
          studentId={opened}
          onMove={setOpened}
          onClose={() => setOpened(null)}
        />
      )}
      <ConfirmDialog
        tone="primary"
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void onSubmit()}
        title={`Submit ${sheet.class.name}?`}
        body="The class goes to the principal for approval, and its comments and ratings are locked for you. The principal can send it back with a note."
        confirmLabel="Submit the class"
        busy={submitting.isLoading}
      />
    </>
  );
}

function SummaryCard({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <Panel className="space-y-1.5 px-3.5 py-3">
      <p className="text-xs font-medium text-gray-06">{label}</p>
      {children ?? <p className="font-mont text-lg font-semibold text-black-01">{value}</p>}
    </Panel>
  );
}

function CellText({ cell }: { cell: BroadsheetCell | undefined }) {
  if (!cell || cell.state === "NOT_IN") return <span className="text-gray-05" title="Not in yet">·</span>;
  if (cell.state === "NOT_TAKEN") return <span className="text-gray-05" title="Does not take it">-</span>;
  return <span className="text-black-01">{cell.total ?? "-"}</span>;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#854F0B] print-hide">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
