import { useParams, useSearchParams } from "react-router";
import { FileText, Printer } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetReportCardQuery } from "@/redux/services/gradebook/gradebook-api";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { useReportCardPrint } from "./print-page";
import { ReportCardSheet } from "./report-card";

/**
 * One student's report card, previewed as it prints.
 *
 * Only a published class has cards: before that the server answers 409 and the
 * page says so rather than showing an empty card. A held student's card is
 * readable by staff and says it is held.
 */
export default function ReportCardPage() {
  useReportCardPrint();
  const params = useParams();
  const [search] = useSearchParams();
  const classId = Number(params.classId);
  const studentId = Number(params.studentId);
  const term = Number(search.get("term")) || undefined;
  const valid = Number.isFinite(classId) && Number.isFinite(studentId);
  const { data, isLoading, isError, error, refetch } = useGetReportCardQuery(
    { classId, studentId, term },
    { skip: !valid },
  );
  const status = valid ? parseApiError(error).status : 404;
  const card = data?.data;

  return (
    <PageShell className="content-start gap-4" grid>
      {status === 409 ? (
        <OutlinedNotice
          icon={FileText}
          title="This class is not published yet"
          body="A report card exists once the principal publishes the class."
          actionLabel="Back to report cards"
          actionTo={routesPath.PROTECTED.GRADEBOOK.RELEASE}
        />
      ) : status === 404 || status === 403 ? (
        <OutlinedNotice
          icon={FileText}
          title="This report card is not yours to open"
          body="A report card opens to whoever may read the release of its class."
          actionLabel="Back to report cards"
          actionTo={routesPath.PROTECTED.GRADEBOOK.RELEASE}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={FileText}
          title="We could not open this report card"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !card ? (
        <Skeleton className="mx-auto h-[70vh] w-full max-w-[210mm] rounded-md" />
      ) : (
        <>
          <div className="print-hide flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-06">Preview as it will print: A4, black and white.</p>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Print this report card
            </Button>
          </div>
          <div className="print-area rounded-md border border-border">
            <ReportCardSheet card={card} />
          </div>
        </>
      )}
    </PageShell>
  );
}
