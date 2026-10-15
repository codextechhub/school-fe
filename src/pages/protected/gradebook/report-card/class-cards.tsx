import { useParams, useSearchParams } from "react-router";
import { FileText, Printer } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetClassCardsQuery } from "@/redux/services/gradebook/gradebook-api";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

import { useReportCardPrint } from "./print-page";
import { ReportCardSheet } from "./report-card";

const WHY = { HELD: "held", NOT_RELEASED: "not published with the class" } as const;

/**
 * Every released student's card in a class, in roll order, to print in one
 * go, one card to a page.
 *
 * A held student, or one the class did not publish, has no card in the print;
 * the line above the cards names each of them and why, so the person at the
 * printer knows who is missing on purpose.
 */
export default function ClassCardsPage() {
  useReportCardPrint();
  const params = useParams();
  const [search] = useSearchParams();
  const classId = Number(params.classId);
  const term = Number(search.get("term")) || undefined;
  const valid = Number.isFinite(classId);
  const { data, isLoading, isError, error, refetch } = useGetClassCardsQuery({ classId, term }, { skip: !valid });
  const status = valid ? parseApiError(error).status : 404;
  const cards = data?.data;

  return (
    <PageShell className="content-start gap-4" grid>
      {status === 409 ? (
        <OutlinedNotice
          icon={FileText}
          title="This class is not published yet"
          body="Report cards print once the principal publishes the class."
          actionLabel="Back to report cards"
          actionTo={routesPath.PROTECTED.GRADEBOOK.RELEASE}
        />
      ) : status === 404 || status === 403 ? (
        <OutlinedNotice
          icon={FileText}
          title="These report cards are not yours to open"
          body="A class's report cards open to whoever may read its release."
          actionLabel="Back to report cards"
          actionTo={routesPath.PROTECTED.GRADEBOOK.RELEASE}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={FileText}
          title="We could not open these report cards"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading || !cards ? (
        <Skeleton className="mx-auto h-[70vh] w-full max-w-[210mm] rounded-md" />
      ) : (
        <>
          <div className="print-hide flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-mont text-lg font-semibold text-black-01">
                {cards.class.name} · {cards.term.name}
              </h1>
              <p className="text-sm text-gray-06">
                {cards.cards.length} report card{cards.cards.length === 1 ? "" : "s"}, one to a page.
                {cards.left_out_count > 0 &&
                  ` Left out: ${cards.left_out.map((item) => `${item.student.name} (${WHY[item.reason]})`).join(", ")}.`}
              </p>
            </div>
            <Button disabled={cards.cards.length === 0} onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Print the class
            </Button>
          </div>
          {cards.cards.length === 0 ? (
            <OutlinedNotice
              icon={FileText}
              title="No card to print"
              body="Every student in this class is held or was not published with it."
            />
          ) : (
            <div className="print-area space-y-6">
              {cards.cards.map((card, index) => (
                <div key={`${card.facts[0]?.value}-${index}`} className="report-card-break rounded-md border border-border print:border-0">
                  <ReportCardSheet card={card} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
