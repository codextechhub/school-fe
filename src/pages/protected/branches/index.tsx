import { useState } from "react";
import { GraduationCap, MapPin } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OutlinedNotice } from "@/pages/protected/onboarding/components/outlined-notice";
import { cn } from "@/lib/utils";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import type { SchoolBranch } from "@/redux/services/branches/branches-types";
import { BranchDrawer } from "./branch-drawer";
import { locationOf, StatusChip } from "./branch-display";
import { PageShell } from "@/components/layout/page-shell";

/**
 * The branches this school runs.
 *
 * Read-only, and that is the product decision rather than a gap. Opening and
 * editing a branch is CodeX's: every write endpoint demands
 * `platform.branches.*`, which no school role holds. So there is no Edit
 * button. A card that offered one would be refused by the API behind it, and a
 * school that needs a new branch or a corrected address asks the team.
 *
 * The three counts read as dashes because there is no Student, Teacher or Class
 * model in the product yet. The server sends null rather than zero for exactly
 * this reason: zero would claim a branch has no students, which is a different
 * and false statement. The fields are already in the response shape, so the day
 * those models land this screen needs no change.
 */
export default function Branches() {
  const { data, isLoading, isError, refetch } = useGetMyBranchesQuery();
  const [openCode, setOpenCode] = useState<number | null>(null);

  const branches = data?.data ?? [];

  if (isLoading) {
    return (
      <PageShell>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-md" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={GraduationCap}
          title="We could not load your branches"
          body="Something went wrong on our side. Try again in a moment."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  if (!branches.length) {
    return (
      <PageShell>
        <OutlinedNotice
          icon={GraduationCap}
          title="No branches yet"
          body="CodeX sets up your branches. Ask the team if one is missing."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            onView={() => setOpenCode(branch.code)}
          />
        ))}
      </div>

      <BranchDrawer
        code={openCode}
        onClose={() => setOpenCode(null)}
      />
    </PageShell>
  );
}

/** How a branch reads at a glance. */
function BranchCard({
  branch,
  onView,
}: {
  branch: SchoolBranch;
  onView: () => void;
}) {
  return (
    // The whole card opens the branch, not just the button. The lift on hover
    // promises the card is clickable, so it has to be - a card that leans
    // towards you and then ignores the click is worse than a flat one.
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView();
        }
      }}
      className="h-fit bg-white rounded-md w-full px-4 py-3 min-w-0 border border-border cursor-pointer transition-all ease-linear hover:scale-98 hover:border-pry-01 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex justify-between gap-3">
        <figure
          className={cn(
            badgeVariants({ variant: "red" }),
            "size-8 rounded-md grid place-content-center shrink-0",
          )}
        >
          <GraduationCap className="size-5!" />
        </figure>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge
            variant={branch.is_main ? "blue" : "inactive"}
            className="text-xs py-0.5 h-fit rounded-lg"
          >
            {branch.is_main ? "Main branch" : "Branch"}
          </Badge>
          <StatusChip status={branch.status} />
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <h4 className="font-medium text-black-01 truncate" title={branch.name}>
          {branch.name}
        </h4>

        <div className="flex gap-1.5 items-center mt-1.5 text-gray-05 min-w-0">
          <MapPin className="size-3 shrink-0 text-amber-01" />
          <p className="text-xs truncate">{locationOf(branch)}</p>
        </div>

        <hr className="my-3 border-white-02 border-1.5" />

        <div className="flex items-center justify-between px-1 xl:px-3">
          <Stat label="Students" value={branch.students_count} />
          <Stat label="Teachers" value={branch.teachers_count} />
          <Stat label="Classes" value={branch.classes_count} />
        </div>

        {/* No Edit. Branch details are CodeX's to change, and a button the API
            would refuse is worse than no button. */}
        <div className="inline-flex items-center gap-3 mt-4">
          <Button size="sm" onClick={onView}>
            View
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * One count, or a dash.
 *
 * A dash is the whole point: null means the product cannot answer yet, and a 0
 * would answer wrongly.
 */
function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs text-gray-05">{label}</p>
      <p className="text-lg font-semibold text-black-01 tabular-nums">
        {value == null ? (
          <span className="text-gray-04" title="Not available yet">
            &ndash;
          </span>
        ) : (
          value.toLocaleString()
        )}
      </p>
    </div>
  );
}
