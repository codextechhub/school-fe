import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Link } from "react-router";
import { MessageSquareText, Megaphone, Plus, ShieldCheck, UserRound, Users } from "lucide-react";

import PageAccessDenied from "@/components/custom/page-access-denied";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { useActionParam } from "@/hooks/use-action-param";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { routesPath } from "@/routes/routesPath";
import { useGetInboxQuery } from "@/redux/services/messages/messages-api";
import type { InboxKind } from "@/redux/services/messages/messages-types";

import { ConversationView } from "./conversation-view";
import { InboxList } from "./inbox-list";
import { NewBroadcastDrawer } from "./new-broadcast-drawer";
import { NewGroupDrawer } from "./new-group-drawer";
import { NewMessageDrawer } from "./new-message-drawer";
import { useMessageAccess } from "./use-message-access";

const M = routesPath.PROTECTED.MESSAGES;
const INBOX_POLL_MS = 30_000;

type Composing = "message" | "group" | "broadcast" | null;

/**
 * The staff inbox with the open conversation beside it.
 *
 * From a large tablet up the list and the conversation sit side by side. On a
 * phone and a narrow tablet one fills the screen: the list, or the open
 * conversation with a Back button above it. The open conversation is the
 * address (`/messages/:id`), so a notification, a reload and the browser's Back
 * all land where the reader expects, and the filters stay put while they move
 * between conversations.
 *
 * **New** offers a Message, a Group and a Broadcast, each only to a role that
 * holds the key for it. The inbox refreshes while the tab is in front, and the
 * conversation open beside it refreshes on its own schedule.
 *
 * Every business field follows Field Access on `school.messages`: the screen
 * draws a name, preview, child line, time, unread badge or branch only when the
 * viewer may read it, and the drawers explain what a role cannot do instead of
 * offering a control that would be refused.
 */
export default function MessagesPage() {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const { shows } = useMessageAccess();
  const navigate = useNavigate();
  const params = useParams();
  const [kind, setKind] = useState<InboxKind>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [composing, setComposing] = useState<Composing>(null);
  const settled = useDebounce(search, 350);

  const canView = hasPermission(P.VIEW_MESSAGES);
  const canStaff = hasPermission(P.SEND_MESSAGES);
  const canFamily = hasPermission(P.SEND_FAMILY_MESSAGES);
  const canMessage = canStaff || canFamily;
  // Choosing the people for either needs the staff contact list, which is the
  // send key's.
  const canGroup = hasPermission(P.CREATE_MESSAGE_GROUP) && canStaff;
  const canBroadcast = hasPermission(P.SEND_BROADCAST) && canStaff;
  const canInspect = hasAnyPermission(
    P.INSPECT_MESSAGE_GROUPS,
    P.INSPECT_BROADCASTS,
    P.INSPECT_PUPIL_CONVERSATIONS,
  );

  const unreadFilter = unreadOnly && shows("read_status");
  const inbox = useGetInboxQuery(
    { kind, unread: unreadFilter, search: settled, page },
    {
      skip: !canView,
      pollingInterval: INBOX_POLL_MS,
      skipPollingIfUnfocused: true,
      refetchOnFocus: true,
    },
  );

  useActionParam("new", canMessage, () => setComposing("message"));

  if (!canView) return <PageAccessDenied />;

  const parsed = Number(params.id);
  const selectedId = params.id && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  const openConversation = (id: number) => navigate(M.DETAIL_ID(id));
  const closeConversation = () => navigate(M.INDEX);

  return (
    <PageShell grid className="content-start gap-4">
      <PageHeader
        title="Messages"
        description="Talk to colleagues, parents and pupils, in groups and by broadcast."
        actions={
          <>
            {canInspect ? (
              <Button asChild variant="outline" className="shrink-0 text-sm">
                <Link to={M.OVERSIGHT}>
                  <ShieldCheck aria-hidden="true" /> Oversight
                </Link>
              </Button>
            ) : null}
            {canMessage || canGroup || canBroadcast ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="shrink-0 text-sm">
                    <Plus aria-hidden="true" /> New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {canMessage ? (
                    <DropdownMenuItem onSelect={() => setComposing("message")}>
                      <UserRound aria-hidden="true" /> Message
                    </DropdownMenuItem>
                  ) : null}
                  {canGroup ? (
                    <DropdownMenuItem onSelect={() => setComposing("group")}>
                      <Users aria-hidden="true" /> Group
                    </DropdownMenuItem>
                  ) : null}
                  {canBroadcast ? (
                    <DropdownMenuItem onSelect={() => setComposing("broadcast")}>
                      <Megaphone aria-hidden="true" /> Broadcast
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        }
      />

      <div className="grid h-[calc(100dvh-10.5rem)] min-h-[30rem] min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <InboxList
          className={selectedId != null ? "hidden lg:flex" : "flex"}
          kind={kind}
          onKind={(next) => {
            setKind(next);
            setPage(1);
          }}
          unreadOnly={unreadFilter}
          onUnreadOnly={(next) => {
            setUnreadOnly(next);
            setPage(1);
          }}
          search={search}
          onSearch={(next) => {
            setSearch(next);
            setPage(1);
          }}
          rows={inbox.data?.data ?? []}
          loading={inbox.isLoading}
          failed={inbox.isError && !inbox.data}
          onRetry={() => inbox.refetch()}
          pagination={inbox.data?.pagination}
          onPage={setPage}
          selectedId={selectedId}
          onOpen={openConversation}
          shows={shows}
        />

        <section
          aria-label="Conversation"
          className={`min-h-0 min-w-0 overflow-hidden rounded-md border border-border bg-white ${
            selectedId != null ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedId != null ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <ConversationView
                key={selectedId}
                id={selectedId}
                onBack={closeConversation}
                onOpenConversation={openConversation}
                onGone={closeConversation}
              />
            </div>
          ) : (
            <div className="grid flex-1 content-center justify-items-center gap-2 p-6 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-pry-01 text-primary">
                <MessageSquareText className="size-6" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-black-01">Select a conversation</p>
              <p className="max-w-xs text-xs leading-5 text-gray-06">
                Pick one from the list to read it here.
              </p>
            </div>
          )}
        </section>
      </div>

      {composing === "message" ? (
        <NewMessageDrawer
          canStaff={canStaff}
          canFamily={canFamily}
          onClose={() => setComposing(null)}
          onOpened={openConversation}
        />
      ) : null}
      {composing === "group" ? (
        <NewGroupDrawer onClose={() => setComposing(null)} onOpened={openConversation} />
      ) : null}
      {composing === "broadcast" ? (
        <NewBroadcastDrawer onClose={() => setComposing(null)} onOpened={openConversation} />
      ) : null}
    </PageShell>
  );
}
