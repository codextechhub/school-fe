import { Link } from "react-router";
import { BookOpenCheck, CircleCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import CustomTable from "@/components/custom/custom-table";
import KpiCard from "@/components/custom/kpi-card";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { usePermissions } from "@/hooks/use-permissions";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useSchoolWords } from "@/hooks/use-school-words";
import { P } from "@/permissions";
import { useGetResultsHubQuery, useRemindTeacherMutation } from "@/redux/services/gradebook/gradebook-api";
import type { ClassStage, HubClass, LateSheet, ResultsHub as Hub } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { SheetStatusChip } from "../components/sheet-status-chip";

const STAGE: Record<ClassStage, { text: string; variant: "pending" | "active" | "blue" }> = {
  ENTERING: { text: "Entering", variant: "pending" },
  COMPILING: { text: "Compiling", variant: "pending" },
  AWAITING: { text: "Awaiting approval", variant: "blue" },
  PUBLISHED: { text: "Published", variant: "active" },
};

/**
 * Results this term, for a reader who works every class in their branches.
 *
 * Where each class has reached in the chain from score sheet to published
 * result, and which sheets are not in, with the one reason the platform knows
 * for each. Remind sends the sheet's main teacher a reminder in the app and by
 * email, once a school day. "Cannot sign in" is a reason only a reader who can
 * unlock staff accounts is told, with a link to the person's staff record.
 *
 * Reads the branch lens: at a school with several branches the figures are
 * the chosen branch's, or every branch the reader works in.
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
  const k = hub.kpis;
  const still = k.sheets_due - k.sheets_in;
  const subtitle = [
    applies ? label : null,
    hub.results_day ? `results to be released ${formatDay(hub.results_day, { weekday: "short" })}` : null,
    `${hub.term.name} ends ${formatDay(hub.term_ends, { weekday: "short" })}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="min-w-0">
        <h1 className="font-mont text-lg font-semibold text-black-01">
          Results for {hub.term.name}, {hub.term.session}
        </h1>
        <p className="text-sm text-gray-06">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Subject sheets in" value={`${k.sheets_in} of ${k.sheets_due}`} foot={still ? `${still} still to come` : "Every sheet is in"} />
        <KpiCard label="Classes compiled" value={k.classes_compiled} foot="Every subject in, comments written" />
        <KpiCard label="Awaiting approval" value={k.awaiting_approval} foot="With the principal" tone={k.awaiting_approval ? "warn" : "default"} />
        <KpiCard label="Published" value={k.published} foot="Locked; a change is an amendment" />
        <KpiCard label="Results held" value={k.held} foot={k.held ? "Held over fees" : "None held"} tone={k.held ? "warn" : "default"} />
      </div>

      {hub.classes_without_branch.length > 0 && (
        <div role="status" className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#854F0B]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {hub.classes_without_branch.map((c) => c.name).join(", ")}{" "}
            {hub.classes_without_branch.length === 1 ? "has" : "have"} no branch, so no results can be kept for{" "}
            {hub.classes_without_branch.length === 1 ? "it" : "them"}. Give each class a branch under Classes &amp; Arms.
          </span>
        </div>
      )}

      <ClassTable hub={hub} />
      <LateList late={hub.late} />
    </>
  );
}

function ClassTable({ hub }: { hub: Hub }) {
  const placeHeader = hub.branch_dimension ? "Branch" : "Programme";
  const rows = hub.classes;
  return (
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="font-mont text-base font-semibold text-black-01">By class</h2>
        <p className="text-sm text-gray-06">Where each class has reached in the chain.</p>
      </div>
      <CustomTable
        tableHeaderList={["Class", placeHeader, "Subjects in", "Stage", "Class teacher"]}
        defaultBodyList={rows}
        hidePagination
        emptyText="No class this term"
        tableBodyList={rows.map((row: HubClass) => ({
          Class: <span className="font-medium text-black-01">{row.name}</span>,
          [placeHeader]: hub.branch_dimension ? row.branch?.name ?? "No branch" : row.program.name,
          "Subjects in": `${row.subjects_in} of ${row.subjects_due}`,
          Stage: (
            <span className="inline-flex flex-wrap gap-1">
              <Badge variant={STAGE[row.stage].variant} className="rounded-full">
                {STAGE[row.stage].text}
              </Badge>
              {row.returned && (
                <Badge variant="rejected" className="rounded-full">
                  Returned
                </Badge>
              )}
            </span>
          ),
          "Class teacher": row.class_teacher?.name ?? "No class teacher",
        }))}
      />
    </Panel>
  );
}

/**
 * The sheets due this term that are not in. A submitted sheet still waiting for
 * its head is here too, with that as its reason, so the count of late sheets is
 * always the sheets due less the sheets in.
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
    <Panel as="section" className="space-y-3 p-4 sm:p-5">
      <div>
        <h2 className="font-mont text-base font-semibold text-black-01">What is late</h2>
        <p className="text-sm text-gray-06">
          Sheets not yet in, with the reason the platform knows. Remind sends the main teacher a reminder in the app
          and by email.
        </p>
      </div>
      {late.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-gray-06">
          <CircleCheck className="size-4 text-green-01-text" aria-hidden="true" />
          Every sheet due this {term} is in.
        </p>
      ) : (
        <ul className="grid gap-2">
          {late.map((row) => {
            const busy =
              reminding.isLoading &&
              reminding.originalArgs?.classId === row.class.id &&
              reminding.originalArgs?.subjectId === row.subject.id;
            // A submitted sheet waits on its head, not its teacher.
            const remindable = canRemind && row.main_teacher !== null && row.status !== "SUBMITTED";
            return (
              <li
                key={`${row.class.id}:${row.subject.id}`}
                className="flex min-w-0 flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3"
              >
                <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                  <p className="font-medium text-black-01">
                    {row.class.name} · {row.subject.name}
                  </p>
                  <p className="text-xs text-gray-06">
                    {row.reason}
                    {row.staff_link !== null && (
                      <>
                        {" · "}
                        <Link
                          to={routesPath.PROTECTED.STAFF.PROFILE_ID(row.staff_link)}
                          className="font-medium text-primary hover:underline"
                        >
                          Open their staff record
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <SheetStatusChip status={row.status} />
                <span className="flex flex-wrap gap-2">
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
                    <Link to={routesPath.PROTECTED.GRADEBOOK.SHEET_ID(row.class.id, row.subject.id)}>Open sheet</Link>
                  </Button>
                </span>
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-26 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-md" />
    </>
  );
}
