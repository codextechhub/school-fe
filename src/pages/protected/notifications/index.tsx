import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationEventIcon } from "@/components/custom/notification-event-icon";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { formatRelativeDate } from "@/utils/relative-date";
import { PageShell } from "@/components/layout/page-shell";
import Tabs from "@/components/custom/tab";
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
} from "@/redux/services/notifications/notifications-api";
import { useAppSelector } from "@/redux/store";
import { selectTenantIsPending } from "@/redux/features/auth/auth-slice";
import { canOpenNotification } from "@/lib/notification-destination";

/**
 * The notification centre - a school's own feed over `/v1/notify/`.
 *
 * Built to match console-fe's, deliberately, so the two apps describe the same
 * event the same way: the same three read-state tabs, the same server-side
 * search, the same unread-first ordering, the same relative dates. A school
 * admin and a CodeX operator looking at the same go-live decision should not be
 * reading two different screens.
 *
 * What console has and this does not: the Administration link. Notification
 * templates, delivery settings and the event catalogue are CodeX's - the keys
 * behind them are platform-scoped, so there is no page here to link to.
 *
 * Every endpoint is open to a school that has not gone live, which is the point:
 * onboarding is when a school gets most of its post.
 */

type Filter = "unread" | "read" | "all";

// Unread leads and is what the page opens on: the inbox exists to show what
// still needs attention. "All" sits last as the fallback - the backend keeps
// unread on top there too, so it is never a wall of read messages.
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "all", label: "All" },
];

export default function Notifications() {
  const navigate = useNavigate();
  // The page describes a school to itself, so it has to know which school it is
  // talking to: a live school being told this is "while your school gets ready"
  // is the app narrating a phase that finished months ago.
  const tenantIsPending = useAppSelector(selectTenantIsPending);
  const [filter, setFilter] = useState<Filter>("unread");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 400);

  const { data, isLoading, isError, refetch } = useGetNotificationsQuery({
    page,
    page_size: 20,
    ...(filter === "all" ? {} : { is_read: filter === "read" }),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  // The bell already polls this, so the page reuses the cached entry.
  const unreadCount =
    useGetUnreadNotificationCountQuery().data?.data.unread_count ?? 0;
  const [markRead] = useMarkNotificationsReadMutation();
  const [markAll, { isLoading: markingAll }] =
    useMarkAllNotificationsReadMutation();

  const rows = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 0;

  const open = (item: (typeof rows)[number]) => {
    // Fire-and-forget so navigation is not held on the mark-read round trip.
    if (!item.is_read) markRead({ ids: [item.id] });
    // An item pointing at a screen this app has not built is marked read where
    // it stands. The notification IS the message; nobody should be dropped on a
    // 404 for reading their own post.
    if (canOpenNotification(item.action_url)) navigate(item.action_url);
  };

  return (
    <PageShell className="space-y-5 text-black-01">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold font-mont text-black-01">
            Notification Centre
          </p>
          <p className="mt-0.5 text-xs text-gray-01">
            {tenantIsPending
              ? "Everything that has happened while your school gets ready."
              : "Everything that has happened across your school."}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-10"
          disabled={!unreadCount || markingAll}
          onClick={() => markAll()}
        >
          <CheckCheck className="size-4" />
          {markingAll ? "Marking…" : "Mark all as read"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* The app's own switcher: one highlight that slides between tabs
            rather than a background switching off one and on another. The eye
            follows the move and knows which tab it came from. */}
        <Tabs
          tabs={FILTERS.map(({ value, label }) => ({ value, label }))}
          activeTab={filter}
          setActiveTab={(value) => {
            setFilter(value as Filter);
            setPage(1);
          }}
        />
        <div className="relative w-full sm:max-w-70">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              // Back to page 1: staying on page 4 of the previous result set
              // would show an empty page for a search that has matches.
              setPage(1);
            }}
            placeholder="Search notifications"
            className="h-10 pr-10"
          />
          <Search className="size-4 absolute right-3 top-3 text-gray-05 pointer-events-none" />
        </div>
      </div>

      <section className="min-w-0 rounded-md border border-border bg-white">
        {isLoading ? (
          <div className="grid h-72 place-content-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="py-20 text-center">
            <p className="font-mont text-sm font-medium text-gray-05">
              We could not load your notifications
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-sm font-medium text-primary"
            >
              Try again
            </button>
          </div>
        ) : !rows.length ? (
          <div className="py-20 text-center">
            <span className="mx-auto grid size-14 place-content-center rounded-full bg-pry-01 text-primary">
              <Bell className="size-6" />
            </span>
            <p className="mt-3 font-mont font-semibold">
              {debouncedSearch
                ? "No notifications match that search"
                : filter === "unread"
                  ? "You are all caught up"
                  : "Nothing to show"}
            </p>
            <p className="text-sm text-gray-01">
              {debouncedSearch
                ? "Try a different word, or clear the search."
                : filter === "unread"
                  ? "Anything unread will appear here first."
                  : "New activity will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white-02">
            {rows.map((item) => (
              <button
                key={item.id}
                onClick={() => open(item)}
                className={cn(
                  "flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-gray-03",
                  !item.is_read && "bg-pry-01/30",
                )}
              >
                <span
                  className={cn(
                    "mt-1 grid size-9 shrink-0 place-content-center rounded-full",
                    item.is_read
                      ? "bg-gray-04 text-gray-05"
                      : "bg-primary text-white",
                  )}
                >
                  <NotificationEventIcon eventKey={item.event_type_key} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "truncate text-sm",
                        !item.is_read && "font-semibold",
                      )}
                    >
                      {item.subject}
                    </span>
                    <span className="shrink-0 text-xs text-gray-01">
                      {formatRelativeDate(item.created_at)}
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-01">
                    {item.body}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-primary/80">
                    {item.event_type_label}
                  </span>
                </span>
                {!item.is_read && (
                  <span className="mt-3 size-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white-02 px-5 py-3 text-sm">
            <span className="text-gray-01">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
