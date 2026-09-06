import { useNavigate } from "react-router";
import { toast } from "sonner";
import { CheckCircle2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { Panel as Surface } from "@/components/custom/surface";
import { routesPath } from "@/routes/routesPath";
import { apiErrorMessage } from "@/utils/api-error";
import { useResendStaffInvitationMutation } from "@/redux/services/staff/staff-api";
import type { StaffDetail } from "@/redux/services/staff/staff-types";

/**
 * What happened, and the four things somebody does next.
 *
 * **Four exits rather than one.** A school adding its staff is adding several,
 * so Add another comes back to a form that has kept the role and the posting;
 * a school adding one person wants to look at the record; and somebody who has
 * just noticed a typo in the address wants Resend, which is the only control
 * that helps once the link has gone.
 *
 * **The address is repeated back deliberately.** It is the field most often
 * mistyped and the one nothing can check: `adaokeye@gmail.com` is a perfectly
 * valid address belonging to somebody else's mother, and the moment to notice
 * is now rather than a week later when nobody has accepted.
 */
export function InvitationSent({
  person,
  roleLabel,
  onAddAnother,
}: {
  person: StaffDetail;
  roleLabel: string;
  onAddAnother: () => void;
}) {
  const navigate = useNavigate();
  const [resend, { isLoading: resending }] = useResendStaffInvitationMutation();

  async function resendInvite() {
    try {
      await resend(person.id).unwrap();
      toast.success(
        `Sent again to ${person.email}. The previous link no longer works.`,
      );
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not resend that invitation. Try again."),
      );
    }
  }

  return (
    <PageShell className="content-start gap-5" grid>
      <Surface as="section" className="px-6 py-7">
        <CheckCircle2 className="size-8 text-green-01-text" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold text-black-01">
          Invitation sent
        </h2>
        <p className="mt-1 text-sm text-gray-01">
          {person.full_name} is on the staff list with employment status
          Invited, and their account is waiting for them to set a password.
        </p>

        <dl className="mt-5 grid max-w-md gap-2.5">
          <Row label="Sent to" value={person.email} />
          <Row label="Role" value={roleLabel || person.roles.join(", ") || "-"} />
          {person.staff_number && (
            <Row label="Staff ID" value={person.staff_number} />
          )}
          <Row label="Channel" value="Email and in-app. Never SMS." />
        </dl>

        <p className="mt-4 max-w-md text-xs text-gray-05">
          The link is single-use and expires. Resending voids the old one and
          restarts the clock, and never creates a second record for them.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button onClick={onAddAnother}>Add another</Button>
          <Button
            variant="outline"
            onClick={() =>
              navigate(routesPath.PROTECTED.STAFF.PROFILE_ID(person.id))
            }
          >
            View their record
          </Button>
          <Button
            variant="outline"
            disabled={resending}
            onClick={() => void resendInvite()}
          >
            <Mail className="size-4" />
            Resend invitation
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(routesPath.PROTECTED.STAFF.INDEX)}
          >
            Back to directory
          </Button>
        </div>
      </Surface>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs text-gray-05 sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-black-01">{value}</dd>
    </div>
  );
}
