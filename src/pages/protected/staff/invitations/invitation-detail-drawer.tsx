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

import { invitationAgeDays, waitingLabel } from "./invitation-model";

/**
 * A focused read of one pending invitation.
 *
 * The drawer uses only fields returned by the invitation list. It does not
 * invent delivery history the API cannot prove, and it keeps the irreversible
 * withdrawal behind the existing reason dialog.
 */
export function InvitationDetailDrawer({
  person,
  showBranch,
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

  return (
    <Sheet open={Boolean(person)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="font-mont text-base">
            Invitation details
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">
            Review access and follow up without leaving this list.
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
                <Badge variant="pending" className="text-xs">
                  Awaiting response
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
                    Invitation activity
                  </p>
                  <p className="mt-0.5 text-xs text-gray-05">
                    The delivery facts available for this invitation.
                  </p>
                </div>
                <DetailRow
                  icon={Mail}
                  label="Sent"
                  value={formatDate(person.invited_at)}
                />
                <DetailRow
                  icon={Clock3}
                  label="Waiting"
                  value={waitingLabel(age)}
                />
              </section>

              {canResend && (
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
            {canResend && (
              <Button
                onClick={() => onResend(person)}
                disabled={resending || !person.can_resend}
                loading={resending}
                loadingText="Sending"
                className="sm:col-span-2"
              >
                <RefreshCw className="size-4" />
                Resend invitation
              </Button>
            )}
            <Button variant="outline" onClick={() => onViewRecord(person)}>
              <UserRound className="size-4" />
              View staff record
            </Button>
            {canWithdraw && (
              <Button variant="outline-dest" onClick={() => onWithdraw(person)}>
                Withdraw invitation
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
