import { Link } from "react-router";
import { ArrowRight, BookOpenCheck, ClipboardList } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useSchoolWords } from "@/hooks/use-school-words";
import { cn } from "@/lib/utils";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { useGetMySheetsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { ClassStage, Duty, MySheet, SheetCta, TeacherHub } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { parseApiError } from "@/utils/api-error";

import { examPaperText } from "../components/exam-paper";
import { SheetStatusChip } from "../components/sheet-status-chip";
import { getMySheetsSummary, groupMySheets, mySheetBoardStages, type MySheetBoardStage } from "./my-sheets-state";

const CTA_TEXT: Record<SheetCta, string> = {
  ENTER: "Enter scores",
  CONTINUE: "Continue",
  REVISE: "Revise",
  VIEW: "Open",
};

/**
 * A teacher's score-sheet workbench for the current term.
 *
 * Sheets are grouped by the next useful action: unfinished or returned work,
 * complete sheets ready to submit, and locked sheets already submitted. The
 * grouping is derived from the existing teacher-hub response and never changes
 * who may open, edit or submit a sheet.
 *
 * A sheet appears only when the reader is its main teacher. Duties for classes
 * and departments remain below the board and lead to the existing broadsheet
 * and moderation workflows.
 */
export default function MySheets() {
  const { data, isLoading, isError, error, refetch } = useGetMySheetsQuery();
  const { term } = useSchoolWords();
  const hub = data?.data;

  return (
    <PageShell className="content-start gap-4" grid>
      {isError ? (
        <OutlinedNotice
          icon={ClipboardList}
          title={parseApiError(error).status === 404 ? `No ${term} in progress` : "We could not load your sheets"}
          body={
            parseApiError(error).status === 404
              ? `This school has no ${term} today, so there are no score sheets to fill. Sheets appear once a ${term} begins.`
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

function HubBody({ hub }: { hub: TeacherHub }) {
  const { term } = useSchoolWords();
  if (hub.sheets.length === 0 && hub.duties.length === 0) {
    return (
      <OutlinedNotice
        icon={BookOpenCheck}
        title={`No score sheets for you this ${term}`}
        body={`You are not the main teacher of a subject in any class this ${term}. A sheet appears here once you are made a subject's main teacher in a class.`}
      />
    );
  }

  const summary = getMySheetsSummary(hub.sheets);
  const groups = groupMySheets(hub.sheets);

  return (
    <>
      <PageHeader
        title="My sheets"
        description={`${hub.term.name}, ${hub.term.session} · subjects whose marks you own, grouped by the next task.`}
      />

      {hub.sheets.length > 0 && (
        <>
          <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-label="Score sheet summary">
            <Metric label="Assigned" value={summary.assigned} foot="Your subject sheets" />
            <Metric label="Students remaining" value={summary.studentsRemaining} foot="Across open sheets" />
            <Metric label="Returned" value={summary.returned} foot="Needs correction" tone={summary.returned ? "warn" : "default"} />
            <Metric label="Submitted" value={summary.submitted} foot="Waiting or approved" />
          </section>

          <section className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-3" aria-label="Score sheets by workflow stage">
            {mySheetBoardStages.map((stage) => (
              <BoardColumn
                key={stage.value}
                stage={stage.value}
                title={stage.title}
                description={stage.description}
                sheets={groups[stage.value]}
              />
            ))}
          </section>
        </>
      )}

      {hub.duties.length > 0 && (
        <Panel as="section" className="space-y-3 p-4 sm:p-5">
          <h2 className="font-mont text-base font-semibold text-black-01">Your other duties</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {hub.duties.map((duty) => (
              <DutyCard
                key={`${duty.kind}:${duty.class?.id ?? duty.department?.id}`}
                duty={duty}
              />
            ))}
          </ul>
        </Panel>
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

function BoardColumn({
  stage,
  title,
  description,
  sheets,
}: {
  stage: MySheetBoardStage;
  title: string;
  description: string;
  sheets: MySheet[];
}) {
  return (
    <Panel as="section" className="overflow-hidden">
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div className="min-w-0">
          <h2 className="font-mont text-sm font-semibold text-black-01">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-06">{description}</p>
        </div>
        <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-gray-04 px-2 py-1 text-xs font-medium text-gray-06">
          {sheets.length}
        </span>
      </div>
      {sheets.length === 0 ? (
        <p className="px-3.5 py-5 text-sm text-gray-06">{emptyStageText[stage]}</p>
      ) : (
        <ul className="grid gap-2 p-2.5">
          {sheets.map((sheet) => (
            <SheetCard key={`${sheet.class.id}:${sheet.subject.id}`} sheet={sheet} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

const emptyStageText: Record<MySheetBoardStage, string> = {
  NEEDS_WORK: "No score sheets need work.",
  READY: "No score sheets are ready to submit.",
  SUBMITTED: "No score sheets have been submitted.",
};

function SheetCard({ sheet }: { sheet: MySheet }) {
  const fmt = useSchoolDisplay();
  const paper = examPaperText(fmt, sheet.exam_paper);
  const percentage = sheet.roll > 0 ? Math.min(100, Math.round((sheet.entered / sheet.roll) * 100)) : 0;

  return (
    <li>
      <Link
        to={routesPath.PROTECTED.GRADEBOOK.SHEET_ID(sheet.class.id, sheet.subject.id)}
        className="group block min-w-0 rounded-md border border-border bg-gray-04/30 px-3 py-3 transition-all ease-linear hover:-translate-y-0.5 hover:border-pry-01 hover:bg-primary/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 break-words text-sm font-medium leading-tight text-black-01">
            {sheet.class.name} · {sheet.subject.name}
          </p>
          <SheetStatusChip status={sheet.status} />
        </div>
        {paper && <p className="mt-1 text-xs text-gray-06">Examination {paper}</p>}
        <div className="mt-3 flex items-center gap-2" aria-label={`${sheet.entered} of ${sheet.roll} students complete`}>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
          </span>
          <span className="shrink-0 text-xs tabular-nums text-gray-06">{sheet.entered}/{sheet.roll}</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-gray-06">
            {sheet.roll - sheet.entered > 0 ? `${sheet.roll - sheet.entered} students remaining` : "Every student complete"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
            {CTA_TEXT[sheet.cta]}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </li>
  );
}

/** What a class teacher's duty card says the class needs, by its stage. */
const CLASS_DUTY: Record<ClassStage, string> = {
  ENTERING: "compile the class",
  COMPILING: "compile the class",
  AWAITING: "with the principal",
  PUBLISHED: "results published",
};

function DutyCard({ duty }: { duty: Duty }) {
  const head = duty.kind === "HEAD_OF_DEPARTMENT";
  const hat = head ? `As head of ${duty.department?.name ?? "department"}` : "As class teacher";
  const title = head ? "Moderation queue" : `${duty.class?.name ?? "Your class"} · ${CLASS_DUTY[duty.stage ?? "ENTERING"]}`;
  const meta = head
    ? duty.waiting
      ? `${duty.waiting} sheet${duty.waiting === 1 ? "" : "s"} waiting for you`
      : "Nothing waiting for you"
    : `${duty.subjects_in ?? 0} of ${duty.subjects_due ?? 0} subjects in`;
  const body = (
    <>
      <p className="text-xs text-gray-05">{hat}</p>
      <p className="truncate font-medium text-black-01">{title}</p>
      <p className="text-xs text-gray-06">{meta}</p>
    </>
  );
  return (
    <li className="min-w-0">
      <Link
        to={
          head || !duty.class
            ? routesPath.PROTECTED.GRADEBOOK.MODERATION
            : routesPath.PROTECTED.GRADEBOOK.BROADSHEET_ID(duty.class.id)
        }
        className="block rounded-md border border-border px-4 py-3 transition-colors hover:bg-primary/5"
      >
        {body}
      </Link>
    </li>
  );
}

function HubSkeleton() {
  return (
    <>
      <Skeleton className="h-12 w-72 rounded-md" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-24 rounded-md" />)}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((index) => <Skeleton key={index} className="h-72 rounded-md" />)}
      </div>
    </>
  );
}
