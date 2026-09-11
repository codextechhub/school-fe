import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Link2, Search, Users, UsersRound } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Panel } from "@/components/custom/surface";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { routesPath } from "@/routes/routesPath";
import { useGetGuardiansQuery } from "@/redux/services/students/students-api";
import { useStudentsLens } from "@/hooks/use-students-lens";

import { EmptyRing } from "../empty-ring";
import { Pager } from "../pager";
import { FooterLead, PersonCard, SiblingsPill } from "./person-card";

/**
 * The people the school calls and the students linked under each one.
 *
 * Cards keep every linked student's name visible. Search is the only filter
 * because guardians do not have their own status, class, or branch.
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
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-black-01">
          Guardians
        </h1>
        <p className="mt-1 text-sm text-gray-01">
          The people your school calls, with students grouped under each
          guardian.
          {/* A guardian carries no branch of their own, so say what the
              narrowing actually means rather than letting a shorter list look
              like a smaller school. */}
          {narrowed ? ` Showing the guardians of ${label}'s students.` : ""}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(13rem,0.75fr)_minmax(0,1.6fr)]">
        <Panel as="section" className="flex items-center gap-3 rounded-xl p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-content-center rounded-lg bg-primary/10 text-primary">
            <UsersRound className="size-5" />
          </span>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-7 w-14" />
            ) : (
              <p className="text-2xl font-semibold text-black-01">
                {pagination?.totalItems ?? 0}
              </p>
            )}
            <p className="text-xs text-gray-05">Guardian records</p>
          </div>
        </Panel>

        <Panel as="section" className="flex items-center gap-3 rounded-xl p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-content-center rounded-lg bg-blue-50 text-primary">
            <Link2 className="size-5" />
          </span>
          <p className="text-sm leading-5 text-gray-01">
            One guardian record can connect several students without splitting
            the relationship across duplicate contacts.
          </p>
        </Panel>
      </div>

      <Panel as="section" className="flex flex-wrap items-center gap-2.5 rounded-xl p-3.5 sm:p-4">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone or email"
            aria-label="Search guardians"
            className="h-10.5 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {pagination && !isLoading && (
          <p className="shrink-0 text-xs text-gray-05" aria-live="polite">
            {pagination.totalItems}{" "}
            {pagination.totalItems === 1 ? "guardian" : "guardians"}
          </p>
        )}
      </Panel>

      {busy ? (
        <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((g) => (
              <PersonCard
                key={g.id}
                name={g.full_name}
                photoUrl={g.photo_url}
                sub={g.phone || g.email || "Contact missing"}
                secondary={g.phone && g.email ? g.email : undefined}
                subTone={!g.phone && !g.email ? "warn" : "default"}
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
