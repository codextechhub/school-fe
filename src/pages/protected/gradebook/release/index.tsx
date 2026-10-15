import { Link, useSearchParams } from "react-router";
import { FileText, Printer } from "lucide-react";

import CustomTable from "@/components/custom/custom-table";
import { Panel } from "@/components/custom/surface";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchLens } from "@/hooks/use-branch-lens";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { useGetReleaseClassesQuery, useGetReleaseQuery } from "@/redux/services/gradebook/gradebook-api";
import type { Release, ReleaseClass, ReleaseRow } from "@/redux/services/gradebook/gradebook-types";
import { routesPath } from "@/routes/routesPath";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { parseApiError } from "@/utils/api-error";

const RESULT = {
  NOT_PUBLISHED: { text: "Not published", variant: "pending" },
  HELD: { text: "Held", variant: "pending" },
  RELEASED: { text: "Released", variant: "active" },
} as const;

/** The class to open: the one in the address, else the first published, else the first. */
const pickClass = (classes: ReleaseClass[], asked: number) =>
  classes.find((item) => item.class.id === asked) ??
  classes.find((item) => item.stage === "PUBLISHED") ??
  classes[0];

/**
 * Report cards and release: for one class, who was released, who was held
 * and what became of each guardian's email, with every card to preview and
 * the class to print.
 *
 * The class is chosen from a select (it rides in `?class=`), because tabs do
 * not scale past a handful of classes. Before publication every row reads
 * "Not published" and nothing has been sent. The email a guardian receives
 * carries nothing from the result, and the sample under the table says so in
 * the email's own words.
 *
 * Field Access: the primary guardian follows the stricter of the gradebook's
 * guardian switch and the student module's guardian name and email switches,
 * and the email state its own switch; a column the server leaves out leaves
 * the table.
 */
export default function ReleasePage() {
  const { branch } = useBranchLens();
  const [search, setSearch] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = useGetReleaseClassesQuery({ branch });
  const classes = data?.data.classes ?? [];
  const chosen = pickClass(classes, Number(search.get("class")));
  const status = parseApiError(error).status;

  const choose = (id: string) =>
    setSearch((current) => {
      const next = new URLSearchParams(current);
      next.set("class", id);
      return next;
    }, { replace: true });

  return (
    <PageShell className="content-start gap-4" grid>
      {status === 403 ? (
        <OutlinedNotice
          icon={FileText}
          title="Report cards are not yours to open"
          body="The release list and report cards open to the people the school gives them to."
          actionLabel="Back to the gradebook"
          actionTo={routesPath.PROTECTED.GRADEBOOK.INDEX}
        />
      ) : isError ? (
        <OutlinedNotice
          icon={FileText}
          title="We could not load the classes"
          body="Something went wrong on our side."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-md" />
      ) : !chosen ? (
        <OutlinedNotice icon={FileText} title="No class this term" body="Report cards appear here once classes are running this term." />
      ) : (
        <>
          <div className="w-full sm:w-72">
            <NativeSelect aria-label="Class" value={String(chosen.class.id)} onChange={(event) => choose(event.target.value)}>
              {classes.map((item) => (
                <option key={item.class.id} value={String(item.class.id)}>
                  {item.class.name}
                  {data?.data.branch_dimension && item.branch ? ` · ${item.branch.name}` : ""}
                  {item.stage === "PUBLISHED" ? "" : " · not published"}
                </option>
              ))}
            </NativeSelect>
          </div>
          <ClassRelease classId={chosen.class.id} />
        </>
      )}
    </PageShell>
  );
}

function ClassRelease({ classId }: { classId: number }) {
  const { data, isLoading, isError, refetch } = useGetReleaseQuery({ classId });
  const release = data?.data;
  if (isError) {
    return (
      <OutlinedNotice
        icon={FileText}
        title="We could not load this class's release"
        body="Something went wrong on our side."
        actionLabel="Try again"
        onAction={() => refetch()}
      />
    );
  }
  if (isLoading || !release) return <Skeleton className="h-64 w-full rounded-md" />;
  return <ReleaseBody release={release} />;
}

function ReleaseBody({ release }: { release: Release }) {
  const { formatDate, formatDateTime } = useSchoolDisplay();
  const published = release.stage === "PUBLISHED";
  const showsGuardian = release.rows.length === 0 || release.rows.some((row) => "guardian" in row);
  const showsEmail = release.rows.length === 0 || release.rows.some((row) => "email_state" in row);

  const email = (row: ReleaseRow) => {
    switch (row.email_state) {
      case "SENT":
        return <span className="text-gray-06">Emailed {row.emailed_at ? formatDateTime(row.emailed_at) : ""}</span>;
      case "NO_EMAIL":
        return <span className="text-[#A32D2D]">No email on file</span>;
      case "HELD":
        return <span className="text-[#854F0B]">Held, nothing sent</span>;
      case "NOT_SENT":
        return <span className="text-[#A32D2D]" title="The email has no recorded outcome">Not sent</span>;
      default:
        return <span className="text-gray-05">-</span>;
    }
  };

  const headers = [
    "Student",
    ...(showsGuardian ? ["Primary guardian"] : []),
    "Result",
    ...(showsEmail ? ["Email"] : []),
    "Report card",
  ];

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-mont text-lg font-semibold text-black-01">Report cards and release · {release.class.name}</h1>
          <p className="text-sm text-gray-06">
            {published
              ? `Published ${release.published_at ? formatDate(release.published_at) : ""} · ${release.class_size} students`
              : "Not published yet, so nothing has been released or sent."}
          </p>
          {release.held_count > 0 && (
            <Badge variant="pending" className="mt-2 rounded-full">
              {release.held_count} held, not included
            </Badge>
          )}
        </div>
        {published && (
          <Button variant="outline" asChild>
            <Link to={routesPath.PROTECTED.GRADEBOOK.CLASS_CARDS_ID(release.class.id)}>
              <Printer className="size-4" aria-hidden="true" />
              Print class
            </Link>
          </Button>
        )}
      </div>

      <Panel as="section" className="min-w-0">
        <CustomTable
          tableHeaderList={headers}
          hidePagination
          emptyText="No student is on this class's roll."
          defaultBodyList={release.rows}
          tableBodyList={release.rows.map((row) => ({
            Student: (
              <Link
                to={`${routesPath.PROTECTED.STUDENTS.PROFILE_ID(row.student.id)}?tab=results`}
                className="font-medium text-primary hover:underline"
              >
                {row.student.name}
              </Link>
            ),
            ...(showsGuardian
              ? {
                  "Primary guardian": row.guardian ? (
                    <span className="min-w-0">
                      <span className="block text-black-01">{row.guardian.name ?? "-"}</span>
                      {row.guardian.email && <span className="block text-xs text-gray-05">{row.guardian.email}</span>}
                    </span>
                  ) : (
                    <span className="text-gray-05">No primary guardian</span>
                  ),
                }
              : {}),
            Result: (
              <Badge variant={RESULT[row.result_state].variant} className="rounded-full">
                {RESULT[row.result_state].text}
              </Badge>
            ),
            ...(showsEmail ? { Email: email(row) } : {}),
            "Report card":
              row.result_state === "NOT_PUBLISHED" ? (
                <span className="text-gray-05">-</span>
              ) : (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={routesPath.PROTECTED.GRADEBOOK.REPORT_CARD_ID(release.class.id, row.student.id)}>Preview</Link>
                </Button>
              ),
          }))}
        />
      </Panel>

      <Panel as="section" className="space-y-2 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-black-01">The email a guardian receives</h2>
        <p className="text-sm text-gray-06">
          Nothing from the result is in it: no score, no grade, no position, no comment, no attachment and no link.
        </p>
        <div className="rounded-md border border-border bg-gray-50 p-3 text-sm text-black-01">
          <p className="font-medium">[First name]&apos;s report card is ready</p>
          <p className="mt-2">Dear Parent or Guardian,</p>
          <p>
            [First name]&apos;s report card for {release.term.name} is ready to collect from the school.
          </p>
        </div>
      </Panel>
    </>
  );
}
