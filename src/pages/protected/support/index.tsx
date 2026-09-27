import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Headset, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomTable from "@/components/custom/custom-table";
import { PageShell } from "@/components/layout/page-shell";
import Tabs from "@/components/custom/tab";
import { useDebounce } from "@/hooks/use-debounce";
import { formatRelativeDate } from "@/utils/relative-date";
import { routesPath } from "@/routes/routesPath";
import { requestSupportOpen } from "@/components/layout/support-open";
import { useGetTicketsQuery } from "@/redux/services/support/support-api";
import type { Ticket, TicketStatus } from "@/redux/services/support/support-types";

/**
 * The school's support desk.
 *
 * A school is its own first line. Its staff raise tickets here, whoever holds
 * the triage key works them, and only what that person cannot solve is sent to
 * CodeX. So this screen shows two different things to two different people
 * without saying which you are: a teacher sees the threads they are on, a
 * triager sees the school's queue. The server decides that (visible_tickets_qs
 * in vs_tickets), and a client-side "is this person a manager" check would only
 * be a second opinion that can disagree with it.
 *
 * Filing stays where it was, in the header's headset panel. It is reachable
 * from every screen in the app, and a person who has just hit a problem should
 * not have to find a desk first - so this page links to that panel rather than
 * growing a second form.
 */

const FILTERS: { label: string; value: "active" | TicketStatus | "all" }[] = [
  { label: "Open", value: "active" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
  { label: "All", value: "all" },
];

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** Where a ticket sits, in one word, for somebody scanning a column of them. */
function whereItSits(ticket: Ticket): string {
  if (ticket.escalated_at) return "With XVS";
  return STATUS_LABEL[ticket.status] ?? ticket.status;
}

export default function SupportDesk() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("active");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim(), 350);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useGetTicketsQuery({
    page,
    ...(search ? { q: search } : {}),
    ...(filter === "all"
      ? {}
      : filter === "active"
        ? { state: "active" as const }
        : { status: filter }),
  });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const pagination = data?.pagination;

  const choose = (next: (typeof FILTERS)[number]["value"]) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <PageShell className="space-y-5 text-black-01">
      <div data-guide="support.heading" className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold font-mont text-black-01">Support</p>
          <p className="mt-0.5 text-xs text-gray-01">
            Issues raised at your school. Anything you cannot solve here can be
            sent to XVS.
          </p>
        </div>
        {/* The same panel the headset opens, so there is one form and not two. */}
        <Button className="h-10" onClick={() => requestSupportOpen()}>
          <Plus className="size-4" />
          Raise an issue
        </Button>
      </div>

      <div data-guide="support.filters" className="flex flex-wrap items-center justify-between gap-3">
        {/* The same switcher the rest of the app uses, so a filter behaves the
            same way here as it does anywhere else. */}
        <Tabs
          tabs={FILTERS.map(({ value, label }) => ({ value, label }))}
          activeTab={filter}
          setActiveTab={(value) => choose(value as (typeof FILTERS)[number]["value"])}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Search tickets"
            className="h-10 bg-white pl-9"
          />
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-border bg-white py-20 text-center">
          <p className="font-mont text-sm font-medium text-gray-05">
            We could not load your tickets
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-primary"
          >
            Try again
          </button>
        </div>
      ) : !isLoading && !rows.length ? (
        <div className="rounded-2xl border border-border bg-white py-20 text-center">
          <span className="mx-auto grid size-14 place-content-center rounded-full bg-pry-01 text-primary">
            <Headset className="size-6" />
          </span>
          <p className="mt-3 font-mont font-semibold">
            {search ? "No tickets match that search" : "Nothing raised yet"}
          </p>
          <p className="text-sm text-gray-01">
            {search
              ? "Try a different word, or clear the search."
              : "When somebody raises an issue it will appear here."}
          </p>
        </div>
      ) : (
        <CustomTable
          loading={isLoading}
          tableHeaderList={["Reference", "Issue", "Raised by", "Priority", "Status", "Updated"]}
          defaultBodyList={rows}
          tableBodyList={rows.map((ticket) => ({
            Reference: ticket.ticket_number,
            Issue: ticket.title,
            "Raised by": ticket.requester?.name ?? "-",
            Priority: ticket.priority,
            Status: whereItSits(ticket),
            Updated: formatRelativeDate(ticket.updated_at),
          }))}
          onRowClick={(ticket: Ticket) => {
            if (ticket) navigate(routesPath.PROTECTED.SUPPORT.DETAIL_ID(ticket.id));
          }}
          currentPage={pagination?.currentPage ?? 1}
          totalPage={pagination?.totalPages ?? 1}
          onPageChange={(next?: string | number) => setPage(Number(next) || 1)}
          emptyText="No tickets"
        />
      )}
    </PageShell>
  );
}
