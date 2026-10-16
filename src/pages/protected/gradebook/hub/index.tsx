import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, BookOpenCheck, CircleCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import CustomTable from "@/components/custom/custom-table";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useSchoolWords } from "@/hooks/use-school-words";
import { cn } from "@/lib/utils";
import { P } from "@/permissions";
import { useGetResultsHubQuery, useRemindTeacherMutation } from "@/redux/services/gradebook/gradebook-api";
import type { HubClass, LateSheet, ResultsHub as Hub } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { CLASS_STAGE } from "../components/class-stage";
import { SheetStatusChip } from "../components/sheet-status-chip";
import { filterHubClasses, hubStageOptions, type HubStageFilter } from "./hub-state";

/**
 * Results this term, for a reader who works every class in their branches.
 *
 * The page is a compact control room: totals establish the term's position,
 * the sliding stage filter narrows the class list, and work that needs attention
 * stays beside the classes it is delaying. A class row opens its broadsheet;
 * late-sheet actions retain the reminder and staff-account permissions enforced
 * by the API.
 *
 * The hub shows operational progress, not student result values. Its layout
 * uses the same fields and actions returned by the existing endpoint and does
 * not derive marks, averages, positions or comments.
 */
export default function ResultsHub() {
  const { branch } = useBranchLens();
  const { data, isLoading, isError, error, refetch } = useGetResultsHubQuery({ branch });
  const { term } = useSchoolWords();
  const hub = data?.data;

  return (
    <PageShell className="content-start gap-5" grid>
      {isError ? (
        <OutlinedNotice
          icon={BookOpenCheck}
          title={parseApiError(error).status === 404 ? `No ${term} in progress` : "We could not load results"}
          body={
            parseApiError(error).status === 404
              ? `This school has no ${term} today, so there are no results under way.`
              : "Something went wrong on our side."
          }
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !hub ? (
        <HubSkeleton />
      ) : (
        <HubBody hub={hub} />
      )}
    </PageShell>
  );
}

function HubBody({ hub }: { hub: Hub }) {
  const { formatDay } = useSchoolDisplay();
  const { applies, label } = useBranchLens();
  const [stage, setStage] = useState<HubStageFilter>("ALL");
  const k = hub.kpis;
  const still = k.sheets_due - k.sheets_in;
  const stageOptions = useMemo(() => hubStageOptions(hub.classes), [hub.classes]);
  const visibleClasses = useMemo(() => filterHubClasses(hub.classes, stage), [hub.classes, stage]);
  const subtitle = [
    `${hub.term.name}, ${hub.term.session}`,
    applies ? label : null,
    hub.results_day ? `results release ${formatDay(hub.results_day, { weekday: "short" })}` : null,
    `${hub.term.name} ends ${formatDay(hub.term_ends, { weekday: "short" })}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader title="Results this term" description={subtitle} />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <CompactMetric
          label="Subject sheets in"
          value={`${k.sheets_in} of ${k.sheets_due}`}
          foot={still ? `${still} still to come` : "Every sheet is in"}
        />
        <CompactMetric
          label="Classes compiled"
          value={k.classes_compiled}
          foot="Ready for approval or published"
        />
        <CompactMetric
          label="Awaiting approval"
          value={k.awaiting_approval}
          foot="With the principal"
          tone={k.awaiting_approval ? "warn" : "default"}
        />
        <CompactMetric label="Published" value={k.published} foot="Locked for families" />
        <CompactMetric
          label="Results held"
          value={k.held}
          foot={k.held ? "Held over fees" : "None held"}
          tone={k.held ? "warn" : "default"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {hub.classes_without_branch.length > 0 && (
        <div role="status" className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#854F0B]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {hub.classes_without_branch.map((item) => item.name).join(", ")} {" "}
            {hub.classes_without_branch.length === 1 ? "has" : "have"} no branch, so no results can be kept for{" "}
            {hub.classes_without_branch.length === 1 ? "it" : "them"}. Give each class a branch under Classes &amp; Arms.
          </span>
        </div>
      )}

      <div className="max-w-full overflow-x-auto pb-1">
        <SegmentedToggle
          ariaLabel="Results stage"
          value={stage}
          options={stageOptions}
          onChange={setStage}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,0.8fr)]">
        <ClassTable hub={hub} rows={visibleClasses} />
        <LateList late={hub.late} />
      </div>
    </>
  );
}

function CompactMetric({
  label,
  value,
  foot,
  tone = "default",
  className,
}: {
  label: string;
  value: number | string;
  foot: string;
  tone?: "default" | "warn";
  className?: string;
}) {
  return (
    <Panel
      className={cn(
        "space-y-1.5 px-3.5 py-3",
        tone === "warn" && "border-amber-200 bg-amber-50",
        className,
      )}
    >
      <p className="text-xs font-medium text-gray-06">{label}</p>
      <p className={cn("font-mont text-xl font-semibold text-black-01", tone === "warn" && "text-amber-700")}>
        {value}
      </p>
      <p className="text-xs text-gray-06">{foot}</p>
    </Panel>
  );
}

function ClassTable({ hub, rows }: { hub: Hub; rows: HubClass[] }) {
  const navigate = useNavigate();
  const placeHeader = hub.branch_dimension ? "Branch" : "Programme";

  return (
    <Panel as="section" className="space-y-3 p-3.5 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-mont text-base font-semibold text-black-01">Classes</h2>
          <p className="text-sm text-gray-06">Select a class to open its broadsheet and finish the next task.</p>
        </div>
        <span className="text-xs text-gray-06">{rows.length} shown</span>
      </div>
      <CustomTable
        tableHeaderList={["Class", placeHeader, "Subject sheets", "Stage", "Class teacher"]}
        defaultBodyList={rows}
        hidePagination
        emptyText="No class at this stage"
        onRowClick={(row: HubClass) => navigate(routesPath.PROTECTED.GRADEBOOK.BROADSHEET_ID(row.id))}
        tableBodyList={rows.map((row) => ({
          _id: row.id,
          Class: (
            <Link
              to={routesPath.PROTECTED.GRADEBOOK.BROADSHEET_ID(row.id)}
              className="font-medium text-black-01 hover:text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.name}
            </Link>
          ),
          [placeHeader]: hub.branch_dimension ? row.branch?.name ?? "No branch" : row.program.name,
          "Subject sheets": <SheetProgress value={row.subjects_in} total={row.subjects_due} />,
          Stage: (
            <span className="inline-flex flex-wrap gap-1">
              <Badge variant={CLASS_STAGE[row.stage].variant} className="rounded-full">
                {CLASS_STAGE[row.stage].text}
              </Badge>
              {row.returned && (
                <Badge variant="rejected" className="rounded-full">Returned</Badge>
              )}
            </span>
          ),
          "Class teacher": row.class_teacher?.name ?? "No class teacher",
        }))}
      />
    </Panel>
  );
}

function SheetProgress({ value, total }: { value: number; total: number }) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <span className="flex min-w-28 items-center gap-2" aria-label={`${value} of ${total} subject sheets in`}>
      <span className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </span>
      <span className="shrink-0 tabular-nums text-gray-06">{value}/{total}</span>
    </span>
  );
}

/**
 * Sheets still holding up the term. The list remains complete, but its compact
 * rows stop the shorter panel being stretched to match the class table.
 */
function LateList({ late }: { late: LateSheet[] }) {
  const { hasPermission } = usePermissions();
  const { term } = useSchoolWords();
  const [remind, reminding] = useRemindTeacherMutation();
  const canRemind = hasPermission(P.REMIND_SUBJECT_TEACHER);

  const send = async (row: LateSheet) => {
    const result = await remind({ classId: row.class.id, subjectId: row.subject.id });
    if ("error" in result) return;
    toast.success("Reminder sent", {
      description: `${row.main_teacher?.name ?? "The main teacher"} gets it in the app and by email.`,
    });
  };

  return (
    <Panel as="section" className="overflow-hidden xl:flex xl:max-h-[32rem] xl:flex-col">
      <div className="shrink-0 border-b border-border px-3.5 py-3 sm:px-4">
        <h2 className="font-mont text-base font-semibold text-black-01">Needs attention</h2>
        <p className="text-sm text-gray-06">
          {late.length
            ? `${late.length} sheet${late.length === 1 ? " is" : "s are"} still holding up the term.`
            : `Every sheet due this ${term} is in.`}
        </p>
      </div>
      {late.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-4 text-sm text-gray-06">
          <CircleCheck className="size-4 text-green-01-text" aria-hidden="true" />
          Nothing needs chasing.
        </p>
      ) : (
        <ul className="min-h-0 xl:overflow-y-auto">
          {late.map((row) => {
            const busy =
              reminding.isLoading &&
              reminding.originalArgs?.classId === row.class.id &&
              reminding.originalArgs?.subjectId === row.subject.id;
            const remindable = canRemind && row.main_teacher !== null && row.status !== "SUBMITTED";
            const sheetPath = routesPath.PROTECTED.GRADEBOOK.SHEET_ID(row.class.id, row.subject.id);

            return (
              <li key={`${row.class.id}:${row.subject.id}`} className="border-b border-border px-3.5 py-3 last:border-0 sm:px-4">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <Link to={sheetPath} className="min-w-0 font-medium text-black-01 hover:text-primary hover:underline">
                    {row.class.name} · {row.subject.name}
                  </Link>
                  <SheetStatusChip status={row.status} />
                </div>
                <p className="mt-1 text-xs text-gray-06">
                  {row.reason}
                  {row.staff_link !== null && (
                    <>
                      {" · "}
                      <Link
                        to={routesPath.PROTECTED.STAFF.PROFILE_ID(row.staff_link)}
                        className="font-medium text-primary hover:underline"
                      >
                        Open staff record
                      </Link>
                    </>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {remindable && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={row.reminded_today || row.reason_kind === "CANNOT_SIGN_IN" || busy}
                      onClick={() => void send(row)}
                    >
                      {row.reminded_today ? "Reminded today" : "Remind"}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={sheetPath}>
                      Open sheet
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function HubSkeleton() {
  return (
    <>
      <Skeleton className="h-12 w-80 rounded-md" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-24 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-2xl rounded-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,0.8fr)]">
        <Skeleton className="h-80 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
      </div>
    </>
  );
}
