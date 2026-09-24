import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellOff,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomTextArea } from "@/components/custom/custom-textarea";
import { PageShell } from "@/components/layout/page-shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/utils/relative-date";
import { apiErrorMessage } from "@/utils/api-error";
import { openAttachment } from "@/utils/attachment-download";
import { routesPath } from "@/routes/routesPath";
import {
  useAddTicketCommentMutation,
  useEscalateTicketMutation,
  useGetTicketQuery,
  useSetTicketFollowingMutation,
  useTransitionTicketMutation,
} from "@/redux/services/support/support-api";
import type {
  TicketAttachment,
  TicketStatus,
} from "@/redux/services/support/support-types";
import {
  buildConversationDays,
  partitionTicketAttachments,
} from "./conversation-model";

/**
 * One ticket, and the conversation on it.
 *
 * Built on the same two-column shape as the Console's ticket page - the thread
 * on the left, what the ticket IS on the right - so a CodeX operator and a
 * school administrator looking at the same ticket are reading the same screen.
 * What differs is the vocabulary, and it differs deliberately.
 *
 * A school does not need to be told which tenant it is, and cannot assign work
 * to CodeX staff, so those panels are absent rather than shown greyed out. What
 * it does need, and the Console has no equivalent of, is where the ticket now
 * sits: "Ngozi Eze sent this to CodeX" is the fact a teacher is missing when
 * their own school goes quiet on them.
 *
 * The thread IS the ticket. Escalating opens nothing new and moves nothing: the
 * same reference and the same replies travel up, so the person who raised it
 * keeps watching the thing they were given.
 *
 * What the reader may do here is the server's answer, not this screen's.
 * `capabilities` arrives per ticket because access is not a permission alone -
 * whoever raised a ticket may reply to it whatever keys they hold, and a
 * triager's reach is narrowed by branch.
 */

const CARD = "rounded-md border border-border bg-white";

const STATUS_TONE: Record<TicketStatus, string> = {
  OPEN: "bg-primary/10 text-primary",
  ASSIGNED: "bg-violet-500/10 text-violet-600",
  IN_PROGRESS: "bg-yellow-01/10 text-yellow-01-text",
  RESOLVED: "bg-green-01/10 text-green-01-text",
  CLOSED: "bg-gray-05/10 text-gray-06-text",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge className={cn("font-mont text-xs capitalize", STATUS_TONE[status])}>
      {status.replace("_", " ").toLowerCase()}
    </Badge>
  );
}

/** One label over one value, the shape the Console's detail panel uses. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-01">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-black-01">{value}</dd>
    </div>
  );
}

const dayLabel = (date: Date): string => {
  if (!Number.isFinite(date.getTime())) return "Date unknown";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const messageTime = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unknown";
  return date.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function AttachmentLink({ file }: { file: TicketAttachment }) {
  const open = () => {
    openAttachment(file.url, file.original_filename).catch((error) => {
      toast.error(error instanceof Error ? error.message : "We could not open that file.");
    });
  };

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex min-w-0 items-center gap-1.5 text-left text-xs font-medium text-primary hover:underline"
    >
      <Paperclip className="size-3.5 shrink-0" />
      <span className="truncate">{file.original_filename}</span>
    </button>
  );
}

export default function SupportTicketDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useGetTicketQuery(id, { skip: !id });
  const ticket = data?.data;

  const [reply, setReply] = useState("");
  const [escalateNote, setEscalateNote] = useState("");
  const [escalateOpen, setEscalateOpen] = useState(false);

  const [addComment, { isLoading: replying }] = useAddTicketCommentMutation();
  const [escalate, { isLoading: escalating }] = useEscalateTicketMutation();
  const [transition, { isLoading: transitioning }] = useTransitionTicketMutation();
  const [setFollowing, { isLoading: muting }] = useSetTicketFollowingMutation();

  // The thread scrolls inside its own box, so arriving at a ticket has to land
  // on the newest message rather than the oldest. Without this, opening a long
  // thread shows a conversation from three weeks ago and the reply box below
  // something nobody is answering.
  const threadRef = useRef<HTMLDivElement>(null);
  const conversationItemCount =
    (ticket?.comments?.length ?? 0) + (ticket?.attachments?.length ?? 0);
  useEffect(() => {
    const viewport = threadRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [conversationItemCount, id]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="grid h-72 place-content-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (isError || !ticket) {
    return (
      <PageShell>
        <div className={cn(CARD, "py-20 text-center")}>
          <p className="font-mont text-sm font-medium text-gray-05">
            We could not load this ticket
          </p>
          <button onClick={() => refetch()} className="mt-2 text-sm font-medium text-primary">
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  const canComment = ticket.capabilities?.can_comment !== false;
  const canManage = ticket.capabilities?.can_transition === true;
  // Offered exactly when the endpoint would accept it: the server already
  // accounts for "already escalated" and for a CodeX ticket.
  const canEscalate = ticket.capabilities?.can_escalate === true;
  const isEscalated = Boolean(ticket.escalated_at);
  const isClosed = ticket.status === "CLOSED";
  const isResolved = ticket.status === "RESOLVED";
  // Absent means following: the server only records a row once somebody has
  // deliberately muted, and everyone on a ticket hears about it by default.
  const following = ticket.is_following !== false;
  const unattachedFiles = (ticket.attachments ?? []).filter((file) => !file.comment_id);
  const ticketAttachments = partitionTicketAttachments(
    unattachedFiles,
    ticket.created_at,
  );
  const conversationDays = buildConversationDays(
    ticket.comments ?? [],
    ticketAttachments.conversation,
  );

  const send = async () => {
    if (!reply.trim()) return;
    try {
      await addComment({ id: ticket.id, body: reply.trim() }).unwrap();
      setReply("");
    } catch (error) {
      toast.error(apiErrorMessage(error, "We could not post your reply."));
    }
  };

  const sendUp = async () => {
    try {
      await escalate({ id: ticket.id, note: escalateNote.trim() }).unwrap();
      setEscalateNote("");
      setEscalateOpen(false);
      toast.success("Sent to XVS support.");
    } catch (error) {
      toast.error(apiErrorMessage(error, "We could not send this to XVS."));
    }
  };

  /**
   * Reopening lands on IN_PROGRESS, not OPEN.
   *
   * The server's lifecycle has no route back to OPEN - RESOLVED and CLOSED both
   * lead only to IN_PROGRESS - and it is the truthful state anyway: a ticket
   * somebody has already worked and is now working again was never untouched.
   * The badge says "in progress" the moment this lands, so the screen does not
   * claim otherwise.
   */
  const reopen = () => move("IN_PROGRESS");

  const toggleMute = async () => {
    const next = !following;
    try {
      await setFollowing({ id: ticket.id, following: next }).unwrap();
      toast.success(next ? "You will be notified about this ticket." : "Notifications muted.");
    } catch (error) {
      toast.error(apiErrorMessage(error, "We could not change your notifications."));
    }
  };

  const move = async (status: "RESOLVED" | "CLOSED" | "IN_PROGRESS") => {
    try {
      await transition({ id: ticket.id, status }).unwrap();
    } catch (error) {
      toast.error(apiErrorMessage(error, "We could not update this ticket."));
    }
  };

  return (
    <PageShell className="space-y-5 text-black-01">
      <button
        onClick={() => navigate(routesPath.PROTECTED.SUPPORT.INDEX)}
        className="inline-flex cursor-pointer items-center gap-1 text-sm text-gray-01 hover:text-black-01"
      >
        <ArrowLeft className="size-4" />
        Back to support
      </button>

      {/* One column on a phone, thread-and-facts on a wide screen. The right
          rail is fixed-width so the conversation keeps a readable measure
          rather than stretching across a 27-inch display. */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-5">
          <section className={cn(CARD, "min-w-0 overflow-hidden")}>
            <div className="border-b border-white-02 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mont text-xs font-medium text-primary">
                    {ticket.ticket_number}
                  </p>
                  <h1 className="mt-1 font-mont text-xl font-semibold text-black-01">
                    {ticket.title}
                  </h1>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  {/* Muting is not leaving. The ticket stays open to you and
                      you can still reply; it just stops paging you, which is
                      what somebody on twenty threads actually needs. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
                    aria-pressed={!following}
                    disabled={muting}
                    onClick={toggleMute}
                  >
                    {muting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : following ? (
                      <BellOff className="size-3.5" />
                    ) : (
                      <Bell className="size-3.5" />
                    )}
                    {following ? "Mute" : "Unmute"}
                  </Button>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-01">
                {ticket.description}
              </p>
            </div>

            {/* ── The conversation ──────────────────────────────────────────
                A bounded box the thread scrolls inside, with the reply stuck to
                the bottom of it, the way the Console does it. A long thread that
                grows the page pushes the reply box off the screen, so answering
                a ticket means scrolling back down past everything you have just
                read. Bounding it means the thing you came to do never moves.

                `min-h-0` on the middle row is what lets it shrink: a grid row
                sizes to its content by default, and without it the list simply
                pushes the composer out of the box instead of scrolling. */}
            <div className="grid h-[72dvh] min-h-[34rem] max-h-[52rem] grid-rows-[auto_minmax(0,1fr)_auto] lg:h-[calc(100dvh-10rem)] lg:min-h-[38rem] lg:max-h-[58rem]">
              {/* The rule is the top edge of the scrolling box, not decoration.
                  Without it the thread simply stops mid-air when you scroll and
                  the oldest message looks cut off by nothing; with it the
                  conversation visibly passes underneath the heading, which is
                  what tells you there is more above. */}
              <p className="border-b border-white-02 px-5 pb-3 pt-5 font-mont text-sm font-semibold sm:px-6 sm:pt-6">
                Conversation
              </p>

              {!conversationDays.length ? (
                <p className="px-5 py-3 text-sm text-gray-01 sm:px-6">
                  No replies yet. Anything written here is seen by everybody on
                  the ticket.
                </p>
              ) : (
                <ScrollArea
                  viewportRef={threadRef}
                  className="min-h-0"
                  viewportClassName="px-5 py-4 sm:px-6"
                >
                  <ol className="grid gap-4">
                    {conversationDays.map((day) => (
                      <li key={day.key} className="grid min-w-0 gap-3">
                        <div className="flex items-center gap-3" aria-label={dayLabel(day.date)}>
                          <span className="h-px flex-1 bg-white-02" />
                          <time className="shrink-0 text-[11px] font-medium text-gray-05">
                            {dayLabel(day.date)}
                          </time>
                          <span className="h-px flex-1 bg-white-02" />
                        </div>

                        {day.groups.map((group, groupIndex) => {
                          const fromCodex = group.author?.tenant_kind === "PLATFORM";
                          return (
                            <div
                              key={`${day.key}-${group.author?.id ?? "unknown"}-${groupIndex}`}
                              className="grid min-w-0 gap-1"
                            >
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="font-mont text-sm font-medium text-black-01">
                                  {group.author?.name ?? "Unknown"}
                                </span>
                                {fromCodex && (
                                  <span className="rounded-full bg-pry-01 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    XVS
                                  </span>
                                )}
                                <time className="ml-auto shrink-0 text-[11px] text-gray-05">
                                  {messageTime(group.items.at(-1)?.createdAt ?? "")}
                                </time>
                              </div>

                              <div className="grid gap-1">
                                {group.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      "min-w-0 rounded-md px-3 py-1.5 text-sm leading-5",
                                      fromCodex
                                        ? "bg-pry-01/40 text-black-01"
                                        : "bg-gray-03 text-gray-01",
                                    )}
                                  >
                                    {item.kind === "comment" ? (
                                      <>
                                        <p className="whitespace-pre-wrap">{item.comment.body}</p>
                                        {item.comment.attachments?.length > 0 && (
                                          <div className="mt-2 grid gap-1 border-t border-black/5 pt-2">
                                            {item.comment.attachments.map((file) => (
                                              <AttachmentLink key={file.id} file={file} />
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <AttachmentLink file={item.attachment} />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
              )}

              {canComment && !isClosed ? (
                // Pinned: the composer is the last row of the grid, so it sits
                // under the thread however long the thread gets.
                <div className="grid gap-2 border-t border-white-02 p-5 sm:p-6">
                  <CustomTextArea
                    id="reply"
                    label="Reply"
                    rows={3}
                    placeholder="Add what you have found, or what you have tried."
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={send} loading={replying} disabled={!reply.trim() || replying}>
                      <Send className="size-4" />
                      Post reply
                    </Button>
                  </div>
                </div>
              ) : isClosed ? (
                <p className="border-t border-white-02 px-5 py-4 text-[13px] text-gray-01 sm:px-6">
                  This ticket is closed. Reopen it if the problem is back.
                </p>
              ) : (
                <span />
              )}
            </div>
          </section>
        </div>

        {/* ── What the ticket is, and where it sits ───────────────────────── */}
        <aside className="grid min-w-0 content-start gap-4">
          {isEscalated && (
            // The fact a teacher is missing when their own school goes quiet.
            // Named, dated, and explicit that the thread did not move.
            <div className={cn(CARD, "border-primary/20 bg-pry-01/30 p-4")}>
              <p className="font-mont text-sm font-semibold text-primary">With XVS</p>
              <p className="mt-1 text-[13px] leading-6 text-primary">
                {ticket.escalated_by?.name ?? "Your school"} sent this to XVS{" "}
                {formatRelativeDate(ticket.escalated_at!)}. Replies here still
                reach everybody on it.
              </p>
            </div>
          )}

          <div className={cn(CARD, "p-5")}>
            <h2 className="font-mont text-sm font-semibold">Ticket details</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Fact label="Raised by" value={ticket.requester?.name ?? "-"} />
              <Fact label="Raised" value={formatRelativeDate(ticket.created_at)} />
              <Fact label="Category" value={ticket.category} />
              <Fact label="Priority" value={ticket.priority} />
              {ticket.branch_name ? (
                <Fact label="Branch" value={ticket.branch_name} />
              ) : null}
              {ticket.resolved_at ? (
                <Fact label="Resolved" value={formatRelativeDate(ticket.resolved_at)} />
              ) : null}
            </dl>
          </div>

          {ticketAttachments.initial.length > 0 && (
            <div className={cn(CARD, "p-5")}>
              <h2 className="inline-flex items-center gap-1.5 font-mont text-sm font-semibold">
                <Paperclip className="size-4 text-primary" />
                Files attached
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-05">
                Included when this ticket was raised.
              </p>
              <ul className="mt-3 grid max-h-48 gap-2 overflow-y-auto pr-1">
                {ticketAttachments.initial.map((file) => (
                  <li key={file.id} className="min-w-0 rounded-md bg-gray-03 px-3 py-2">
                    <AttachmentLink file={file} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManage && (
            <div className={cn(CARD, "p-5")}>
              <h2 className="font-mont text-sm font-semibold">Manage</h2>

              {isClosed ? (
                <p className="mt-1 text-xs leading-5 text-gray-01">
                  This ticket is closed. Reopen it if the problem is back.
                </p>
              ) : canEscalate ? (
                <>
                  <p className="mt-1 text-xs leading-5 text-gray-01">
                    This one is your school's to solve. If it is beyond you, send
                    it to XVS and the whole thread goes with it.
                  </p>
                  {escalateOpen ? (
                    <div className="mt-3 grid gap-2">
                      <CustomTextArea
                        id="escalate-note"
                        label="What have you already tried?"
                        rows={3}
                        placeholder="One line saves XVS asking you the same question."
                        value={escalateNote}
                        onChange={(event) => setEscalateNote(event.target.value)}
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" onClick={() => setEscalateOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={sendUp} loading={escalating} disabled={escalating}>
                          <ArrowUpRight className="size-4" />
                          Send
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => setEscalateOpen(true)}
                    >
                      <ArrowUpRight className="size-4" />
                      Send to XVS
                    </Button>
                  )}
                </>
              ) : (
                <p className="mt-1 text-xs leading-5 text-gray-01">
                  XVS has this one. You can still reply, and close it once it
                  is sorted.
                </p>
              )}

              <div className="mt-3 grid gap-2">
                {(isResolved || isClosed) && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={reopen}
                    loading={transitioning}
                  >
                    <RotateCcw className="size-4" />
                    Mark open
                  </Button>
                )}
                {!isResolved && !isClosed && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => move("RESOLVED")}
                    loading={transitioning}
                  >
                    Mark resolved
                  </Button>
                )}
                {!isClosed && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => move("CLOSED")}
                    loading={transitioning}
                  >
                    Close ticket
                  </Button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
