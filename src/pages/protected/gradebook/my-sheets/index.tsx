import { Link } from "react-router";
import { BookOpenCheck, ChevronRight, ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useSchoolWords } from "@/hooks/use-school-words";
import { useGetMySheetsQuery } from "@/redux/services/gradebook/gradebook-api";
import type { ClassStage, Duty, MySheet, SheetCta, TeacherHub } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { examPaperText } from "../components/exam-paper";
import { SheetStatusChip } from "../components/sheet-status-chip";

const CTA_TEXT: Record<SheetCta, string> = {
  ENTER: "Enter scores",
  CONTINUE: "Continue",
  REVISE: "Revise",
  VIEW: "Open",
};

/**
 * A teacher's own score sheets for the current term, and the work their other
 * hats carry.
 *
 * A sheet is listed when the reader is its main teacher. An assistant reads a
 * sheet but is not listed for it, because they cannot enter or submit it.
 *
 * Duties (the class the reader leads, the department they head) say how far
 * the class has got and how many sheets wait for the head. A class teacher's
 * card opens the class's broadsheet, where it is compiled; a head's opens the
 * moderation queue.
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

  return (
    <>
      <PageHeader
        title={`My sheets this ${term}`}
        description={`${hub.term.name}, ${hub.term.session} · each subject you own the marks for, and the work your other roles carry.`}
      />

      {hub.sheets.length > 0 && (
        <ul className="grid gap-3">
          {hub.sheets.map((sheet) => (
            <SheetCard key={`${sheet.class.id}:${sheet.subject.id}`} sheet={sheet} />
          ))}
        </ul>
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

function SheetCard({ sheet }: { sheet: MySheet }) {
  const fmt = useSchoolDisplay();
  const paper = examPaperText(fmt, sheet.exam_paper);
  const meta = [`${sheet.entered} of ${sheet.roll} entered`, paper ? `examination ${paper}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <li>
      <Link
        to={routesPath.PROTECTED.GRADEBOOK.SHEET_ID(sheet.class.id, sheet.subject.id)}
        className="flex min-w-0 flex-wrap items-center gap-3 rounded-md border border-border bg-white px-4 py-3 transition-colors hover:bg-primary/5"
      >
        {/* Its own line on a phone, so the chip and the link never squeeze the title. */}
        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
          <p className="truncate font-medium text-black-01">
            {sheet.class.name} · {sheet.subject.name}
          </p>
          <p className="text-xs text-gray-05">{meta}</p>
        </div>
        <SheetStatusChip status={sheet.status} />
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {CTA_TEXT[sheet.cta]}
          <ChevronRight className="size-4" aria-hidden="true" />
        </span>
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
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
    </>
  );
}
