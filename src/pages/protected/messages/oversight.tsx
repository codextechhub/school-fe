import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { SegmentedToggle } from "@/components/custom/segmented-toggle";
import { useHeaderHiddenOnPhone } from "@/components/layout/dashboard-header";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { P, type PermissionCode } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import {
  useGetOversightConversationQuery,
  useGetOversightListQuery,
  useGetOversightMessagesQuery,
  useLazyGetOversightMessagesQuery,
} from "@/redux/services/messages/messages-api";
import type {
  ChatMessage,
  OversightKind,
  OversightRow,
} from "@/redux/services/messages/messages-types";

import { ConversationAvatar } from "./conversation-avatar";
import { FittedPage } from "./fitted-page";
import { MessageThread } from "./message-thread";
import {
  OVERSIGHT_BANNER,
  OVERSIGHT_TABS,
  childLine,
  displayNameFor,
  listTime,
  mergeThread,
  participantNames,
} from "./messages-copy";
import { useMessageAccess } from "./use-message-access";

const M = routesPath.PROTECTED.MESSAGES;
const PAGE = 50;

const TAB_KEYS: Record<OversightKind, PermissionCode> = {
  groups: P.INSPECT_MESSAGE_GROUPS,
  broadcasts: P.INSPECT_BROADCASTS,
  "pupil-conversations": P.INSPECT_PUPIL_CONVERSATIONS,
};

/**
 * Read-only inspection of conversations the reader takes no part in.
 *
 * One tab per inspect key the reader holds: groups, broadcasts, and pupil
 * conversations. A list row carries no message text, only the name, who is in
 * it, how many messages it holds and when it last moved. Opening one shows a
 * banner that says so plainly, because every opening is written to the audit
 * trail: the thread has no composer, nothing is marked read, and nothing
 * refreshes on its own, so one opening is one inspection.
 *
 * An opened conversation takes the whole screen on a phone, app header bar
 * included, the way an open conversation in Messages does.
 *
 * Staff-to-staff direct conversations and guardian conversations never appear
 * here, and a broadcast's private replies are not part of the broadcast.
 */
export default function MessageOversightPage() {
  const { hasPermission } = usePermissions();
  const { shows } = useMessageAccess();
  const navigate = useNavigate();
  const params = useParams();

  const tabs = (Object.keys(TAB_KEYS) as OversightKind[]).filter((tab) => hasPermission(TAB_KEYS[tab]));
  const [chosen, setChosen] = useState<OversightKind | null>(null);
  const tab: OversightKind | null = chosen && tabs.includes(chosen) ? chosen : (tabs[0] ?? null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const settled = useDebounce(search, 350);

  const list = useGetOversightListQuery(
    { kind: tab ?? "groups", search: settled, page },
    { skip: tab == null },
  );

  const parsed = Number(params.id);
  const selectedId = params.id && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  useHeaderHiddenOnPhone(tab != null && selectedId != null);

  if (tab == null) return <PageAccessDenied />;

  const rows = list.data?.data ?? [];
  const pagination = list.data?.pagination;

  return (
    <FittedPage ownsTop={selectedId != null} className={cn(selectedId != null && "max-lg:p-0")}>
      <PageHeader
        className={cn("shrink-0", selectedId != null && "max-lg:hidden")}
        title="Message oversight"
        description="Read groups, broadcasts and pupil conversations you are not part of. Every opening is recorded."
        actions={
          hasPermission(P.VIEW_MESSAGES) ? (
            <Button asChild variant="outline" className="shrink-0 text-sm">
              <Link to={M.INDEX}>
                <ArrowLeft aria-hidden="true" /> Messages
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <section
          aria-label="Conversations to inspect"
          className={cn(
            "min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-white",
            selectedId != null ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="grid min-w-0 gap-2.5 border-b border-border px-3 py-3">
            {tabs.length > 1 ? (
              <div className="max-w-full overflow-x-auto pb-1">
                <SegmentedToggle
                  ariaLabel="What to inspect"
                  value={tab}
                  options={tabs.map((value) => ({ value, label: OVERSIGHT_TABS[value].label }))}
                  onChange={(next) => {
                    setChosen(next);
                    setPage(1);
                    navigate(M.OVERSIGHT);
                  }}
                />
              </div>
            ) : null}
            <p className="text-xs leading-5 text-gray-06">{OVERSIGHT_TABS[tab].note}</p>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-05" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name"
                aria-label="Search conversations to inspect"
                className="h-9 w-full rounded-lg border border-white-02 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {list.isLoading || list.isFetching ? (
              <div className="grid gap-2 p-3" aria-label="Loading conversations">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : list.isError ? (
              <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-black-01">We could not load this list</p>
                <Button size="sm" variant="outline" onClick={() => list.refetch()}>
                  Try again
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-06">
                {settled ? "Nothing matches that search." : "There is nothing to inspect here."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((row) => (
                  <OversightItem
                    key={row.id}
                    row={row}
                    active={row.id === selectedId}
                    shows={shows}
                    onOpen={() => navigate(M.OVERSIGHT_DETAIL_ID(row.id))}
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
                  onClick={() => setPage(pagination.currentPage - 1)}
                >
                  <ChevronLeft aria-hidden="true" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => setPage(pagination.currentPage + 1)}
                >
                  Next <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section
          aria-label="Inspection"
          className={cn(
            "min-h-0 min-w-0 overflow-hidden rounded-md border border-border bg-white",
            selectedId != null ? "flex max-lg:rounded-none max-lg:border-0" : "hidden lg:flex",
          )}
        >
          {selectedId != null ? (
            <InspectedConversation
              key={selectedId}
              id={selectedId}
              onBack={() => navigate(M.OVERSIGHT)}
              shows={shows}
            />
          ) : (
            <div className="grid flex-1 content-center justify-items-center gap-2 p-6 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-pry-01 text-primary">
                <ShieldAlert className="size-6" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-black-01">Select a conversation to inspect</p>
              <p className="max-w-xs text-xs leading-5 text-gray-06">
                Opening one is recorded in the audit trail.
              </p>
            </div>
          )}
        </section>
      </div>
    </FittedPage>
  );
}

/** "6 people · 14 messages" for a row or a header, from the counts the server sent. */
function factsOf(
  row: Pick<OversightRow, "kind" | "member_count" | "recipient_count" | "message_count">,
  shows: ReturnType<typeof useMessageAccess>["shows"],
): string {
  const count =
    row.kind === "BROADCAST" ? (shows("recipients") ? row.recipient_count : undefined) : row.member_count;
  return [
    count != null ? `${count} ${row.kind === "BROADCAST" ? "staff" : "people"}` : "",
    row.message_count != null
      ? `${row.message_count} ${row.message_count === 1 ? "message" : "messages"}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function OversightItem({
  row,
  active,
  shows,
  onOpen,
}: {
  row: OversightRow;
  active: boolean;
  shows: ReturnType<typeof useMessageAccess>["shows"];
  onOpen: () => void;
}) {
  const name = displayNameFor(row.kind, row.display_name, shows);
  const about = shows("child") ? childLine(row.child) : "";
  const people = shows("participants") ? participantNames(row.participants) : [];
  const facts = factsOf(row, shows);
  const when = shows("sent_at") ? listTime(row.last_activity_at) : "";

  return (
    <li>
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        aria-label={`Inspect ${name}`}
        onClick={onOpen}
        className={cn(
          "grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-3 text-left transition-colors",
          "hover:bg-pry-01/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          active && "bg-[#EEF3FF] shadow-[inset_3px_0_0_var(--color-primary)]",
        )}
      >
        <ConversationAvatar kind={row.kind} name={name === row.display_name ? name : undefined} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-black-01">{name}</span>
          {about ? <span className="block truncate text-xs text-gray-06">{about}</span> : null}
          {people.length > 0 ? (
            <span className="block truncate text-xs text-gray-06">{people.join(", ")}</span>
          ) : null}
          {facts ? <span className="block truncate text-xs text-gray-05">{facts}</span> : null}
          {row.branch ? (
            <span className="mt-1 inline-block max-w-full truncate rounded-full bg-pry-01 px-2 py-0.5 text-[11px] font-medium text-primary">
              {row.branch.name}
            </span>
          ) : null}
        </span>
        {when ? <span className="shrink-0 text-[11px] text-gray-05">{when}</span> : null}
      </button>
    </li>
  );
}

/**
 * One conversation opened for inspection.
 *
 * Fetched once per opening and never polled or refetched on focus, since each
 * request is an audited inspection. Earlier messages load on request. There is
 * no composer and no read marking.
 */
function InspectedConversation({
  id,
  onBack,
  shows,
}: {
  id: number;
  onBack: () => void;
  shows: ReturnType<typeof useMessageAccess>["shows"];
}) {
  const detail = useGetOversightConversationQuery(id);
  const latest = useGetOversightMessagesQuery({ id, limit: PAGE });
  const [fetchOlder, olderState] = useLazyGetOversightMessagesQuery();
  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<{ before: number | null; hasMore: boolean } | null>(null);

  const conversation = detail.data?.data;
  const page = latest.data?.data;
  const messages = mergeThread(older, page?.results ?? []);
  const hasMore = cursor ? cursor.hasMore : (page?.has_more ?? false);
  const before = cursor ? cursor.before : (page?.next_before ?? null);

  const loadOlder = useCallback(async () => {
    if (before == null) return;
    try {
      const result = await fetchOlder({ id, before, limit: PAGE }).unwrap();
      setOlder((current) => mergeThread(current, result.data.results));
      setCursor({ before: result.data.next_before, hasMore: result.data.has_more });
    } catch {
      toast.error("We could not load earlier messages. Try again.");
    }
  }, [before, fetchOlder, id]);

  if (detail.isError && !conversation) {
    return (
      <div className="grid flex-1 content-center justify-items-center gap-3 p-6 text-center">
        <p className="text-sm font-semibold text-black-01">This conversation is not available</p>
        <p className="max-w-xs text-xs leading-5 text-gray-06">
          It may be outside your branches, or it may not be one you can inspect.
        </p>
        <Button size="sm" variant="outline" onClick={onBack}>
          Back to the list
        </Button>
      </div>
    );
  }

  const name = conversation ? displayNameFor(conversation.kind, conversation.display_name, shows) : "";
  const about = shows("child") ? childLine(conversation?.child) : "";
  const counts = conversation ? factsOf(conversation, shows) : "";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex min-w-0 shrink-0 items-center gap-2 border-b border-border bg-white px-3 py-2.5 max-lg:pt-[calc(0.625rem+env(safe-area-inset-top))]">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="shrink-0 lg:hidden"
          aria-label="Back to the list"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        {conversation ? (
          <>
            <ConversationAvatar kind={conversation.kind} name={name === conversation.display_name ? name : undefined} />
            <div className="min-w-0 flex-1">
              <h2 className="break-words font-mont text-sm font-semibold leading-5 text-black-01">
                {name}
              </h2>
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-06">
                {about ? <span className="break-words">{about}</span> : null}
                {counts ? <span className="break-words">{counts}</span> : null}
                {conversation.branch ? (
                  <span className="rounded-full bg-pry-01 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {conversation.branch.name}
                  </span>
                ) : null}
              </p>
            </div>
          </>
        ) : (
          <Skeleton className="h-5 w-40" />
        )}
      </header>

      <div
        role="note"
        className="flex shrink-0 items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 break-words">{OVERSIGHT_BANNER}</p>
      </div>

      <MessageThread
        messages={messages}
        loading={latest.isLoading}
        failed={latest.isError}
        hasMore={hasMore}
        loadingOlder={olderState.isFetching}
        onLoadOlder={() => void loadOlder()}
        onRetry={() => latest.refetch()}
        showSender={shows("participants")}
        showTimes={shows("sent_at")}
        bodyHidden={!shows("body")}
      />
    </div>
  );
}
