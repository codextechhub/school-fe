import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellOff,
  FileText,
  Image,
  Loader2,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomTextArea } from "@/components/custom/custom-textarea";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/utils/relative-date";
import { formatBytes } from "@/utils/format-bytes";
import { apiErrorMessage } from "@/utils/api-error";
import { fetchAttachmentObjectUrl, openAttachment } from "@/utils/attachment-download";
import { routesPath } from "@/routes/routesPath";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { requestSupportOpen } from "@/components/layout/support-open";
import {
  useAddTicketAttachmentMutation,
  useAddTicketCommentMutation,
  useEscalateTicketMutation,
  useGetTicketQuery,
  useSetTicketFollowingMutation,
  useTransitionTicketMutation,
} from "@/redux/services/support/support-api";
import type {
  TicketAttachment,
  TicketCategory,
  TicketStatus,
} from "@/redux/services/support/support-types";
import {
  buildConversationDays,
  conversationCommentBody,
  partitionTicketAttachments,
} from "./conversation-model";

/**
 * One ticket, and the conversation on it.
 *
 * Built on the same shape as the Console's ticket page - the thread on the
 * left, what the ticket IS on the right - so a CodeX operator and a school
 * administrator looking at the same ticket are reading the same screen. What
 * differs is the vocabulary, and it differs deliberately.
 *
 * On a wide screen the page is exactly the height of the window and nothing
 * outside it scrolls: the thread scrolls inside its own box and the reply box
 * sits under it, always in view, and the right rail scrolls on its own. The
 * description moves into the rail there, so a long description never pushes
 * the conversation down. On a phone the page scrolls normally and the thread
 * box takes most of the screen.
 *
 * A school does not need to be told which tenant it is, and cannot assign work
 * to CodeX staff, so those panels are absent rather than shown greyed out. What
 * it does need, and the Console has no equivalent of, is where the ticket now
 * sits: "Ngozi Eze sent this to XVS" is the fact a teacher is missing when
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

/**
 * What a closed ticket says in place of the reply box, worded for the reader.
 *
 * Reopening is a lifecycle move, so only somebody the server lets transition
 * the ticket (`can_transition`) has a Mark open button, and it sits in the
 * Manage panel. Everybody else has no reply box on a closed ticket and no way
 * to reopen it, so they are offered what they can do: raise a new ticket,
 * started with the old reference so whoever picks it up can find the history.
 */
function ClosedTicketNote({
  canManage,
  reference,
  title,
  category,
}: {
  canManage: boolean;
  reference: string;
  title: string;
  category: TicketCategory;
}) {
  if (canManage) {
    return (
      <p className="shrink-0 border-t border-white-02 bg-white p-4 text-[13px] text-gray-01">
        This ticket is closed. If the problem is back, select Mark open under
        Manage to reopen it.
      </p>
    );
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-white-02 bg-white p-4">
      <p className="min-w-0 flex-1 text-[13px] text-gray-01">
        This ticket is closed. If the problem is back, raise a new ticket and
        quote {reference}.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          requestSupportOpen({
            title: `Follow-up to ${reference}: ${title}`.slice(0, 220),
            description: `Follow-up to ${reference}, which is closed.\n\n`,
            category,
          })
        }
      >
        Raise a new ticket
      </Button>
    </div>
  );
}


const ACCEPTED_FILES = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.xls,.xlsx";

/** How close to the bottom still counts as reading the newest message. */
const NEAR_LATEST_PX = 72;

/**
 * The thread refreshes while the tab is in front of somebody, the same cadence
 * as the Console, so a reply from XVS appears without reloading the page.
 */
const TICKET_DETAIL_POLL = {
  pollingInterval: 10_000,
  skipPollingIfUnfocused: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
} as const;

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

/**
 * The time a message was sent, in the small grey type the thread uses.
 * `label` is the time already on the school's clock (see the thread).
 */
function MessageTime({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <time
      dateTime={value}
      className={cn("shrink-0 whitespace-nowrap text-[11px] leading-5 text-gray-01", className)}
    >
      {label}
    </time>
  );
}

/**
 * A message's text with its time on the right-hand end of the last line.
 *
 * The time is pinned to the bottom-right corner, and an invisible spacer the
 * width of the time trails the text. When the last line has room, the spacer
 * sits beside the words and the time lines up with them; when the last line is
 * full, the spacer wraps and the time drops onto a short line of its own
 * underneath, so it never covers the text.
 */
function TimedText({ text, time, label }: { text: string; time: string; label: string }) {
  return (
    <div className="relative">
      <p className="whitespace-pre-wrap break-words text-sm leading-5 text-black-01">
        {text}
        <span aria-hidden="true" className="inline-block w-12" />
      </p>
      <MessageTime value={time} label={label} className="absolute bottom-0 right-0" />
    </div>
  );
}

/**
 * Files at the foot of a message, with its time level with the last file.
 */
function TimedFiles({
  files,
  time,
  label,
}: {
  files: TicketAttachment[];
  time: string;
  label: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        {files.map((file) => (
          <AttachmentCard key={file.id} file={file} compact />
        ))}
      </div>
      <MessageTime value={time} label={label} />
    </div>
  );
}

const isPrimaryEnter = (event: React.KeyboardEvent) =>
  event.key === "Enter" && (event.metaKey || event.ctrlKey);

/**
 * A file on the ticket, as a card with its name and size.
 *
 * Images show a thumbnail. The media route needs the caller's token, so the
 * picture is fetched as a blob rather than pointed at, and the blob is released
 * when the card leaves the screen. Clicking opens the file in a new tab.
 */
function AttachmentCard({
  file,
  compact = false,
}: {
  file: TicketAttachment;
  compact?: boolean;
}) {
  const isImage = file.content_type?.startsWith("image/") ?? false;
  const [previewUrl, setPreviewUrl] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    let objectUrl = "";
    fetchAttachmentObjectUrl(file.url)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewUrl(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.url, isImage]);

  const open = () => {
    setOpening(true);
    openAttachment(file.url, file.original_filename)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "We could not open that file.");
      })
      .finally(() => setOpening(false));
  };

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "flex w-full min-w-0 items-center overflow-hidden rounded-lg border border-white-02 bg-gray-03 text-left hover:border-primary/30 hover:bg-primary/5",
        compact ? "mt-1.5 max-w-xs gap-2 p-2" : "max-w-sm gap-3 p-2.5",
      )}
    >
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.original_filename}
          className={cn("shrink-0 rounded-md object-cover", compact ? "size-10" : "size-14")}
        />
      ) : (
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-md bg-white text-primary",
            compact ? "size-8" : "size-10",
          )}
        >
          {isImage ? <Image className="size-5" /> : <FileText className="size-5" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-black-01">
          {file.original_filename}
        </span>
        <span className="mt-0.5 block text-[11px] text-gray-01">{formatBytes(file.size)}</span>
      </span>
      {opening && <Loader2 className="size-4 shrink-0 animate-spin text-gray-01" />}
    </button>
  );
}

export default function SupportTicketDetail() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useGetTicketQuery(id, {
    skip: !id,
    ...TICKET_DETAIL_POLL,
  });
  const ticket = data?.data;

  const [reply, setReply] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [escalateNote, setEscalateNote] = useState("");
  const [escalateOpen, setEscalateOpen] = useState(false);

  const [addComment, { isLoading: replying }] = useAddTicketCommentMutation();
  const [addAttachment, { isLoading: uploading }] = useAddTicketAttachmentMutation();
  const [escalate, { isLoading: escalating }] = useEscalateTicketMutation();
  const [transition, { isLoading: transitioning }] = useTransitionTicketMutation();
  const [setFollowing, { isLoading: muting }] = useSetTicketFollowingMutation();

  const unattachedFiles = (ticket?.attachments ?? []).filter((file) => !file.comment_id);
  const ticketAttachments = partitionTicketAttachments(
    unattachedFiles,
    ticket?.created_at ?? "",
  );
  // The ticket's branch zone, else the school's, for the day breaks and the times.
  const { formatDay, formatInstantTime, prefs } = useSchoolDisplay(ticket?.branch ?? null);
  const messageTime = (value: string) =>
    Number.isFinite(new Date(value).getTime()) ? formatInstantTime(value) : "Time unknown";
  const conversationDays = buildConversationDays(
    ticket?.comments ?? [],
    ticketAttachments.conversation,
    prefs.timeZone,
  );
  const conversationItemCount = conversationDays.reduce(
    (dayTotal, day) =>
      dayTotal + day.groups.reduce((groupTotal, group) => groupTotal + group.items.length, 0),
    0,
  );

  // Follow the newest message unless the reader has scrolled up to read older
  // ones; then count what arrives below and offer a way back down instead.
  const sendingRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeTicketRef = useRef("");
  const staysAtLatestRef = useRef(true);
  const forceLatestRef = useRef(false);
  const knownItemCountRef = useRef(0);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const hasTicket = Boolean(ticket);

  const scrollToLatest = (behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    staysAtLatestRef.current = true;
    setShowJumpToLatest(false);
    setNewMessagesBelow(0);
  };

  useEffect(() => {
    if (!hasTicket) return;
    const isOpening = activeTicketRef.current !== id;
    const arrived = isOpening
      ? 0
      : Math.max(0, conversationItemCount - knownItemCountRef.current);
    activeTicketRef.current = id;
    knownItemCountRef.current = conversationItemCount;
    const follow = isOpening || staysAtLatestRef.current || forceLatestRef.current;
    forceLatestRef.current = false;
    if (!follow) {
      if (arrived > 0) {
        setNewMessagesBelow((count) => count + arrived);
        setShowJumpToLatest(true);
      }
      return;
    }
    setNewMessagesBelow(0);
    const frame = requestAnimationFrame(() => scrollToLatest(isOpening ? "auto" : "smooth"));
    return () => cancelAnimationFrame(frame);
  }, [conversationItemCount, hasTicket, id]);

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
  const canAttach = ticket.capabilities?.can_attach !== false;
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
  const canSend = Boolean(reply.trim()) || Boolean(pendingFile);
  const isSending = replying || uploading;

  /**
   * Post the reply, then the file bound to it, and confirm it went.
   *
   * The two are separate calls, so the file can fail after the words landed.
   * That is said plainly and the file stays picked, rather than reporting the
   * whole reply as failed when most of it went through. The success message
   * matches the Console's: "Reply sent", or "Attachment uploaded" for a file
   * sent without words.
   */
  const send = async () => {
    if (!canSend || sendingRef.current) return;
    sendingRef.current = true;
    const text = reply.trim();
    try {
      const created = await addComment({
        id: ticket.id,
        body: conversationCommentBody(text, Boolean(pendingFile)),
      }).unwrap();
      forceLatestRef.current = true;
      setReply("");
      if (pendingFile) {
        try {
          await addAttachment({
            ticketId: String(ticket.id),
            file: pendingFile,
            comment_id: created.data?.id,
          }).unwrap();
          setPendingFile(null);
        } catch (error) {
          toast.warning(
            apiErrorMessage(
              error,
              "Your reply was posted, but the file could not be uploaded. Try the file again.",
            ),
          );
          return;
        }
      }
      toast.success(text ? "Reply sent" : "Attachment uploaded");
    } catch (error) {
      toast.error(apiErrorMessage(error, "We could not post your reply."));
    } finally {
      sendingRef.current = false;
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
    <PageShell className="text-black-01 lg:flex lg:h-[calc(100dvh-3.75rem)] lg:flex-col lg:overflow-hidden">
      <button
        onClick={() => navigate(routesPath.PROTECTED.SUPPORT.INDEX)}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 self-start text-sm text-gray-01 hover:text-black-01"
      >
        <ArrowLeft className="size-4" />
        Back to support
      </button>

      <div className="mt-5 grid min-w-0 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className={cn(CARD, "min-w-0 overflow-hidden lg:flex lg:min-h-0 lg:flex-col")}>
          <div className="shrink-0 border-b border-white-02 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mont text-xs font-medium text-primary">
                  {ticket.ticket_number}
                </p>
                <h1 className="mt-1 font-mont text-xl font-semibold text-black-01">
                  {ticket.title}
                </h1>
              </div>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-01 lg:hidden">
              {ticket.description}
            </p>
          </div>

          <div className="p-4 sm:p-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <MessageSquare className="size-4" />
              <h2 className="font-mont text-sm font-semibold">Conversation</h2>
              <span className="text-xs text-gray-01">{conversationItemCount}</span>
              {/* Muting is not leaving: the ticket stays open to you and you
                  can still reply, it just stops notifying you. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto h-8 shrink-0 gap-1.5 px-2.5 text-xs"
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

            <div className="mt-4 flex h-[65dvh] min-h-[430px] flex-col overflow-hidden rounded-xl border border-white-02 bg-gray-03/60 lg:h-auto lg:min-h-0 lg:flex-1">
              <div className="relative min-h-0 flex-1">
                <div
                  ref={viewportRef}
                  data-testid="ticket-conversation-viewport"
                  onScroll={(event) => {
                    const viewport = event.currentTarget;
                    const distance =
                      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
                    const nearLatest = distance <= NEAR_LATEST_PX;
                    staysAtLatestRef.current = nearLatest;
                    setShowJumpToLatest(!nearLatest);
                    if (nearLatest) setNewMessagesBelow(0);
                  }}
                  className="absolute inset-0 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4"
                >
                  {!conversationDays.length && (
                    <p className="px-1 py-2 text-sm text-gray-01">
                      No replies yet. Anything written here is seen by everybody
                      on the ticket.
                    </p>
                  )}

                  {conversationDays.map((day) => (
                    <section key={day.key} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="h-px flex-1 bg-white-02" />
                        <time className="shrink-0 text-[11px] font-medium text-gray-01">
                          {day.day ? formatDay(day.day, { month: "long" }) : "Date unknown"}
                        </time>
                        <span className="h-px flex-1 bg-white-02" />
                      </div>

                      {day.groups.map((group, groupIndex) => {
                        const fromXvs = group.author?.tenant_kind === "PLATFORM";
                        return (
                          <div
                            key={`${day.key}-${group.author?.id ?? "unknown"}-${groupIndex}`}
                            className="min-w-0 space-y-1.5"
                          >
                            <div className="flex items-baseline gap-2">
                              <p className="min-w-0 truncate text-sm font-semibold text-black-01">
                                {group.author?.name ?? "Unknown"}
                              </p>
                              {fromXvs && (
                                <span className="shrink-0 rounded-full bg-pry-01 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  XVS
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              {group.items.map((item) => (
                                <div
                                  key={item.id}
                                  className={cn(
                                    "min-w-0 rounded-md border px-3 py-2",
                                    fromXvs
                                      ? "border-primary/15 bg-pry-01/30"
                                      : "border-white-02 bg-white",
                                  )}
                                >
                                  {item.kind === "attachment" ? (
                                    <TimedFiles
                                      files={[item.attachment]}
                                      time={item.createdAt}
                                      label={messageTime(item.createdAt)}
                                    />
                                  ) : item.comment.attachments?.length ? (
                                    <>
                                      <p className="whitespace-pre-wrap break-words text-sm leading-5 text-black-01">
                                        {item.comment.body}
                                      </p>
                                      <TimedFiles
                                        files={item.comment.attachments}
                                        time={item.createdAt}
                                        label={messageTime(item.createdAt)}
                                      />
                                    </>
                                  ) : (
                                    <TimedText
                                      text={item.comment.body}
                                      time={item.createdAt}
                                      label={messageTime(item.createdAt)}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  ))}
                </div>

                {showJumpToLatest && (
                  <button
                    type="button"
                    aria-label={
                      newMessagesBelow
                        ? `Jump to latest message, ${newMessagesBelow} new ${newMessagesBelow === 1 ? "message" : "messages"}`
                        : "Jump to latest message"
                    }
                    onClick={() => scrollToLatest()}
                    className="absolute bottom-3 right-3 grid size-9 place-content-center rounded-full border border-primary/15 bg-white text-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <ArrowDown className="size-4" />
                    {newMessagesBelow > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-content-center rounded-full bg-primary px-1 text-[10px] font-bold leading-5 text-white ring-2 ring-white">
                        {newMessagesBelow > 99 ? "99+" : newMessagesBelow}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {isClosed ? (
                <ClosedTicketNote
                  canManage={canManage}
                  reference={ticket.ticket_number}
                  title={ticket.title}
                  category={ticket.category}
                />
              ) : canComment ? (
                <div className="shrink-0 border-t border-white-02 bg-white p-3">
                  <Textarea
                    rows={3}
                    aria-label="Reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (!isPrimaryEnter(event)) return;
                      event.preventDefault();
                      if (!isSending && canSend) void send();
                    }}
                    aria-keyshortcuts="Control+Enter Meta+Enter"
                    placeholder="Add what you have found, or what you have tried."
                    className="max-h-40"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    {canAttach && (
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-gray-01 hover:bg-gray-03">
                        <Paperclip className="size-3" />
                        Attach file
                        <input
                          type="file"
                          accept={ACCEPTED_FILES}
                          className="sr-only"
                          onChange={(event) => {
                            setPendingFile(event.target.files?.[0] ?? null);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={send}
                      disabled={isSending || !canSend}
                    >
                      {isSending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Send className="size-3" />
                      )}
                      {isSending ? "Sending…" : "Send reply"}
                    </Button>
                  </div>
                  {pendingFile && (
                    <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md bg-gray-03 px-2.5 py-1.5 text-xs text-gray-01">
                      <Paperclip className="size-3.5 shrink-0" />
                      <span className="truncate">{pendingFile.name}</span>
                      <button
                        type="button"
                        aria-label="Remove attachment"
                        onClick={() => setPendingFile(null)}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="shrink-0 border-t border-white-02 bg-white p-4 text-[13px] text-gray-01">
                  You can read this ticket, but you cannot reply to it.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── What the ticket is, and where it sits ───────────────────────── */}
        <aside className="grid min-w-0 content-start gap-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          <div className={cn(CARD, "hidden p-5 lg:block")}>
            <h2 className="font-mont text-sm font-semibold">Description</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-01">
              {ticket.description}
            </p>
          </div>

          {isEscalated && (
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
              <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto pr-1">
                {ticketAttachments.initial.map((file) => (
                  <AttachmentCard key={file.id} file={file} />
                ))}
              </div>
            </div>
          )}

          {canManage && (
            <div className={cn(CARD, "p-5")}>
              <h2 className="font-mont text-sm font-semibold">Manage</h2>

              {isClosed ? (
                <p className="mt-1 text-xs leading-5 text-gray-01">
                  This ticket is closed. Select Mark open below if the problem
                  is back.
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
