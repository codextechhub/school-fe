import { ChevronLeft, ChevronRight, MessageSquareText, Search } from "lucide-react";

import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  ConversationRow,
  InboxKind,
} from "@/redux/services/messages/messages-types";
import type { Pagination } from "@/redux/services/onboarding/onboarding-types";

import { ConversationAvatar } from "./conversation-avatar";
import { INBOX_TABS, childLine, displayNameFor, listTime } from "./messages-copy";
import type { useMessageAccess } from "./use-message-access";

type Shows = ReturnType<typeof useMessageAccess>["shows"];

/**
 * The left pane: the kind tabs, the unread filter, the search box and the rows.
 *
 * A row shows the conversation's name, the pupil it is about for parent and
 * pupil conversations, a one-line preview, the time of the last activity, an
 * unread badge and, only when the server sent one, the branch it belongs to.
 * Every part reads straight from the row, and the screen draws a part only when
 * Field Access lets the viewer read it, so a hidden preview, name, child line,
 * time or unread badge leaves the row entirely. With Read status hidden the
 * Unread filter goes too, because filtering to unread would tell the reader
 * which conversations are.
 */
export function InboxList({
  kind,
  onKind,
  unreadOnly,
  onUnreadOnly,
  search,
  onSearch,
  rows,
  loading,
  failed,
  onRetry,
  pagination,
  onPage,
  selectedId,
  onOpen,
  shows,
  className,
}: {
  kind: InboxKind;
  onKind: (next: InboxKind) => void;
  unreadOnly: boolean;
  onUnreadOnly: (next: boolean) => void;
  search: string;
  onSearch: (next: string) => void;
  rows: ConversationRow[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  pagination?: Pagination;
  onPage: (page: number) => void;
  selectedId: number | null;
  onOpen: (id: number) => void;
  shows: Shows;
  className?: string;
}) {
  const filtered = kind !== "all" || unreadOnly || Boolean(search);
  const showUnread = shows("read_status");

  return (
    <section
      aria-label="Conversations"
      className={cn(
        "min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-white",
        className,
      )}
    >
      <div className="grid min-w-0 gap-2.5 border-b border-border px-3 py-3">
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedToggle
            ariaLabel="Kind of conversation"
            value={kind}
            options={INBOX_TABS}
            onChange={onKind}
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-40">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search messages"
              aria-label="Search conversations"
              className="h-9 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          {showUnread ? (
            <Button
              type="button"
              size="sm"
              variant={unreadOnly ? "default" : "outline"}
              aria-pressed={unreadOnly}
              onClick={() => onUnreadOnly(!unreadOnly)}
            >
              Unread
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="grid gap-2 p-3" aria-label="Loading conversations">
            {[0, 1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : failed ? (
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-black-01">We could not load your messages</p>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-pry-01 text-primary">
              <MessageSquareText className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-black-01">
              {filtered ? "No conversations match" : "No messages yet"}
            </p>
            <p className="max-w-xs text-xs leading-5 text-gray-06">
              {filtered
                ? "Try another search or show everything."
                : "Start one with New, and it will appear here."}
            </p>
            {filtered ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onKind("all");
                  onUnreadOnly(false);
                  onSearch("");
                }}
              >
                Show all
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <InboxRow
                key={row.id}
                row={row}
                active={row.id === selectedId}
                shows={shows}
                onOpen={() => onOpen(row.id)}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5 text-xs text-gray-06">
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.currentPage <= 1}
              onClick={() => onPage(pagination.currentPage - 1)}
            >
              <ChevronLeft aria-hidden="true" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => onPage(pagination.currentPage + 1)}
            >
              Next <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InboxRow({
  row,
  active,
  shows,
  onOpen,
}: {
  row: ConversationRow;
  active: boolean;
  shows: Shows;
  onOpen: () => void;
}) {
  const name = displayNameFor(row.kind, row.display_name, shows);
  const about = shows("child") ? childLine(row.child) : "";
  const preview = shows("body") ? row.last_message?.preview : null;
  const when = shows("sent_at")
    ? listTime(row.last_message?.sent_at ?? row.last_activity_at)
    : "";
  const unread = shows("read_status") ? (row.unread_count ?? 0) : 0;
  const mine = row.last_message?.mine;

  return (
    <li>
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        aria-label={`Open ${name}${unread > 0 ? `, ${unread} unread` : ""}`}
        onClick={onOpen}
        className={cn(
          "grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-3 text-left transition-colors",
          "hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          active && "bg-[#EEF3FF] shadow-[inset_3px_0_0_var(--color-primary)]",
        )}
      >
        <ConversationAvatar kind={row.kind} name={name === row.display_name ? name : undefined} />
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm text-black-01",
              unread > 0 ? "font-semibold" : "font-medium",
            )}
          >
            {name}
          </span>
          {about ? <span className="block truncate text-xs text-gray-06">{about}</span> : null}
          {preview ? (
            <span
              className={cn(
                "mt-0.5 block truncate text-xs",
                unread > 0 ? "font-medium text-black-01" : "text-gray-06",
              )}
            >
              {mine ? "You: " : ""}
              {preview}
            </span>
          ) : null}
          {row.branch ? (
            <span className="mt-1 inline-block max-w-full truncate rounded-full bg-pry-01 px-2 py-0.5 text-[11px] font-medium text-primary">
              {row.branch.name}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {when ? <span className="text-[11px] text-gray-05">{when}</span> : null}
          {unread > 0 ? (
            <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
