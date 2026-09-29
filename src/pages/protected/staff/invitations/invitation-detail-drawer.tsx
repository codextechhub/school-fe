import {
  Building2,
  Clock3,
  Info,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { PersonAvatar } from "@/pages/protected/students/person-avatar";
import { formatDate } from "@/pages/protected/students/format";
import type { StaffListRow } from "@/redux/services/staff/staff-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  invitationAgeDays,
  invitationKind,
  sendable,
  waitingLabel,
} from "./invitation-model";

/**
 * A focused read of one pending invitation.
 *
 * The drawer uses only fields returned by the invitation list. It does not
 * invent delivery history the API cannot prove, and it keeps the irreversible
 * withdrawal behind the existing reason dialog.
 *
 * A hire still awaiting approval (`PENDING_APPROVAL`) has no invitation yet:
 * the drawer says it waits on the school's approvers in Workflow, offers no
 * resend, and names withdrawal as calling the hire off. Somebody imported
 * during setup (`AWAITING_GO_LIVE`) has none yet either: the drawer says it
 * goes out when the school goes live, and offers Send only once it has.
 */
export function InvitationDetailDrawer({
  person,
  showBranch,
  schoolLive,
  canResend,
  canWithdraw,
  resending,
  onClose,
  onResend,
  onWithdraw,
  onViewRecord,
}: {
  person: StaffListRow | null;
  showBranch: boolean;
  /** Whether the school has gone live, which is when a held invitation can be sent. */
  schoolLive: boolean;
  /** Whether this reader may resend to this person; see `invitationActions`. */
  canResend: boolean;
  canWithdraw: boolean;
  resending: boolean;
  onClose: () => void;
  onResend: (person: StaffListRow) => void;
  onWithdraw: (person: StaffListRow) => void;
  onViewRecord: (person: StaffListRow) => void;
}) {
  const age = invitationAgeDays(person?.invited_at);
  const kind = person ? invitationKind(person) : "invitation";
  const awaitingApproval = kind === "hire";
  const held = kind === "held";
  const mayResend = canResend && (kind === "invitation" || (held && schoolLive));

  return (
    <Sheet open={Boolean(person)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="font-mont text-base">
            {awaitingApproval
              ? "Hire awaiting approval"
              : held
                ? "Invitation held for go-live"
                : "Invitation details"}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">
            {awaitingApproval || held
              ? "Nothing has been sent to them yet."
              : "Review access and follow up without leaving this list."}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1" viewportClassName="px-5 py-5">
          {person && (
            <div className="grid gap-5">
              <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar
                  name={person.full_name}
                  className="size-11 shrink-0"
                  textClassName="text-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-black-01">
                    {person.full_name}
                  </p>
                  {person.email && (
                    <p className="truncate text-xs text-gray-05" title={person.email}>
                      {person.email}
                    </p>
                  )}
                </div>
                <Badge variant={held ? "blue" : "pending"} className="text-xs">
                  {awaitingApproval
                    ? "Awaiting approval"
                    : held
                      ? "Invited at go-live"
                      : "Awaiting response"}
                </Badge>
              </div>

              <section className="grid gap-3 rounded-xl border border-white-02 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-black-01">
                    Access prepared
                  </p>
                  <p className="mt-0.5 text-xs text-gray-05">
                    What this person receives after activation.
                  </p>
                </div>
                <DetailRow
                  icon={ShieldCheck}
                  label="Role"
                  value={person.roles.length ? person.roles.join(", ") : "No role assigned"}
                />
                {showBranch && (
                  <DetailRow
                    icon={Building2}
                    label="Branch"
                    value={
                      person.posted_school_wide
                        ? "School-wide"
                        : (person.branch_name ?? "Not assigned")
                    }
                  />
                )}
              </section>

              <section className="grid gap-3 rounded-xl border border-white-02 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-black-01">
                    {awaitingApproval ? "Hire activity" : "Invitation activity"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-05">
                    {awaitingApproval
                      ? "The invitation goes out once the hire is approved."
                      : held
                        ? "Their invitations go out when the school goes live."
                        : "The delivery facts available for this invitation."}
                  </p>
                </div>
                <DetailRow
                  icon={Mail}
                  label={awaitingApproval || held ? "Added" : "Sent"}
                  value={formatDate(person.invited_at)}
                />
                <DetailRow
                  icon={Clock3}
                  label="Waiting"
                  value={waitingLabel(age)}
                />
              </section>

              {awaitingApproval && (
                <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 px-3.5 py-3 text-xs leading-5 text-gray-01">
                  <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  <p>
                    This hire waits on your school&apos;s approvers in
                    Workflow. Approving it sends the invitation; rejecting it
                    closes the record without sending anything.
                  </p>
                </div>
              )}

              {held && (
                <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 px-3.5 py-3 text-xs leading-5 text-gray-01">
                  <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  <p>
                    {schoolLive
                      ? "Imported while the school was being set up, and not sent when it went live. Sending it now emails their link."
                      : "Imported while the school is being set up. Their invitations go out when the school goes live."}
                  </p>
                </div>
              )}

              {mayResend && !held && (
                <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 px-3.5 py-3 text-xs leading-5 text-gray-01">
                  <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  <p>
                    Resending sends a new single-use link. The previous link
                    stops working.
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {person && (
          <div className="grid shrink-0 gap-2 border-t border-border px-5 py-4 sm:grid-cols-2">
            {mayResend && (
              <Button
                onClick={() => onResend(person)}
                disabled={resending || !sendable(person, schoolLive)}
                loading={resending}
                loadingText="Sending"
                className="sm:col-span-2"
              >
                <RefreshCw className="size-4" />
                {held ? "Send invitation" : "Resend invitation"}
              </Button>
            )}
            <Button variant="outline" onClick={() => onViewRecord(person)}>
              <UserRound className="size-4" />
              View staff record
            </Button>
            {canWithdraw && (
              <Button variant="outline-dest" onClick={() => onWithdraw(person)}>
                {awaitingApproval ? "Withdraw hire" : "Withdraw invitation"}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-t border-white-02 pt-3 first:border-0 first:pt-0">
      <span className="grid size-8 shrink-0 place-content-center rounded-lg bg-gray-04 text-gray-01">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-05">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium text-black-01">
          {value}
        </p>
      </div>
    </div>
  );
}
