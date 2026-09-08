import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Users } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { useGetGuardiansQuery } from "@/redux/services/students/students-api";
import { useStudentsLens } from "@/hooks/use-students-lens";

import { EmptyRing } from "../empty-ring";
import { Pager } from "../pager";
import { FooterLead, PersonCard, SiblingsPill } from "./person-card";

/**
 * The people the school calls.
 *
 * **A household, not a contact list.** The card that matters is the one
 * standing for more than one child: those students are siblings as far as the
 * school is concerned, and that fact lives nowhere else in the product. So the
 * ward count and the children's names are on the card, not behind it - somebody
 * scanning for "who else does this reach" should not have to open anything.
 *
 * **Cards rather than a table**, which is the design's shape and the right one:
 * the useful part of a row is a sentence of names, and a table either gives
 * that column enough width to starve the rest or truncates it after the first
 * name, which removes the only thing the row was for.
 *
 * Search is the only filter, deliberately. A guardian has no status, no class
 * and no branch of their own; the one question asked of this screen is "is this
 * person already here", and that is a search box.
 */
export default function Guardians() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { lens, narrowed, label } = useStudentsLens();
  const { data, isLoading, isFetching, isError, refetch } =
    useGetGuardiansQuery({
      ...lens,
      search: search.trim() || undefined,
      page,
    });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;
  const busy = isLoading || isFetching;

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={Users}
          title="We could not load your guardians"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-black-01">Guardians</h2>
        <p className="mt-1 text-sm text-gray-01">
          One guardian can stand for several students, which is how the school
          knows they are siblings.
          {/* A guardian carries no branch of their own, so say what the
              narrowing actually means rather than letting a shorter list look
              like a smaller school. */}
          {narrowed ? ` Showing the guardians of ${label}'s students.` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Capped rather than left to fill the row. A search box the width of
            the page reads as the page's main content, and this one narrows a
            grid of cards below it; the count then sits beside the box it
            belongs to instead of alone at the far edge. Full width on a phone,
            where there is nothing to share the row with. */}
        <div className="relative min-w-0 flex-1 basis-52 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone or email"
            aria-label="Search guardians"
            className="h-9 w-full rounded-full border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {pagination && !isLoading && (
          <p className="text-xs text-gray-05" aria-live="polite">
            {pagination.totalItems}{" "}
            {pagination.totalItems === 1 ? "guardian" : "guardians"}
          </p>
        )}
      </div>

      {busy ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[122px] rounded-[10px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyRing>
          {search.trim() ? "No guardian matches that" : "No guardians yet"}
        </EmptyRing>
      ) : (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((g) => (
              <PersonCard
                key={g.id}
                name={g.full_name}
                photoUrl={g.photo_url}
                sub={g.phone || g.email || "No contact recorded"}
                chip={g.is_sibling_household ? <SiblingsPill /> : undefined}
                footerLead={
                  <FooterLead>
                    {g.ward_count} {g.ward_count === 1 ? "student" : "students"}
                  </FooterLead>
                }
                // The names, not just the count. "3 students" makes a reader
                // open the card to answer what the card could have answered.
                footerRest={g.ward_names.join(", ")}
                onOpen={() =>
                  navigate(
                    routesPath.PROTECTED.STUDENTS.GUARDIAN_DETAILS_ID(g.id),
                  )
                }
              />
            ))}
          </div>

          <Pager
            page={pagination?.currentPage ?? 1}
            totalPages={pagination?.totalPages ?? 1}
            onGo={setPage}
          />
        </>
      )}
    </PageShell>
  );
}
