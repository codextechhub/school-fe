import { GraduationCap, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyBranchQuery } from "@/redux/services/branches/branches-api";
import { locationOf, StatusChip } from "./branch-display";

/**
 * One branch in full.
 *
 * A drawer rather than a page, matching the role drawer: this is a handful of
 * facts about a row the reader is already looking at, and a route would take
 * them off the list they will go back to in ten seconds.
 *
 * Read-only, like the list. Everything here is CodeX's to change.
 */
export function BranchDrawer({
  code,
  onClose,
}: {
  /** The branch to show, or null when the drawer is shut. */
  code: number | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useGetMyBranchQuery(code as number, {
    skip: code == null,
  });
  const branch = data?.data;

  return (
    <Sheet open={code != null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="flex items-center gap-2.5 font-mont text-base min-w-0">
            <span className="grid size-8 shrink-0 place-content-center rounded-md bg-pry-01 text-primary">
              <GraduationCap className="size-4" />
            </span>
            <span className="truncate">{branch?.name ?? "Branch"}</span>
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">
            {branch ? locationOf(branch) : "Loading this branch…"}
          </SheetDescription>
        </SheetHeader>

        {/* The body scrolls, the header does not. It used to scroll the whole
            panel, so the branch's own name left the screen on the way down the
            record it names. */}
        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-5 py-5">
          {isLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isError || !branch ? (
            <p className="text-sm text-gray-01">
              We could not load this branch. Close this and try again.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={branch.is_main ? "blue" : "inactive"}>
                  {branch.is_main ? "Main branch" : "Branch"}
                </Badge>
                {branch.branch_type?.trim() && (
                  <Badge variant="amber">{branch.branch_type}</Badge>
                )}
                <StatusChip status={branch.status} />
              </div>

              <dl className="mt-5 grid gap-0">
                <Row label="Branch code" value={String(branch.code)} mono />
                <Row label="Address" value={branch.address} />
                <Row label="State" value={branch.state} />
                <Row label="Country" value={branch.country} />
                <Row label="Email" value={branch.email} />
                <Row
                  label="Opened"
                  value={
                    branch.opened_at
                      ? new Date(branch.opened_at).toLocaleDateString()
                      : ""
                  }
                />
              </dl>

              <div className="mt-5 rounded-md border border-border px-3.5 py-3">
                <p className="text-xs font-semibold text-black-01 font-mont">
                  Students, teachers and classes
                </p>
                <p className="mt-1 text-[13px] text-gray-01 text-pretty">
                  Not available yet. These arrive with the student and staff
                  records, and this branch will count them then.
                </p>
              </div>

              <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-05">
                <Info className="size-3.5 shrink-0 mt-px" />
                CodeX maintains your branches. Ask the team to open a new one or
                change any of these details.
              </p>
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/** One fact. An empty value says so rather than leaving a blank line. */
function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const shown = value?.trim();
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 border-b border-border last:border-b-0 items-baseline">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd
        className={[
          "min-w-0 text-[13px] break-words",
          mono ? "font-mono" : "",
          shown ? "text-black-01" : "text-gray-04",
        ].join(" ")}
      >
        {shown || "Not on file"}
      </dd>
    </div>
  );
}
