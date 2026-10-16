import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel as Surface } from "@/components/custom/surface";
import PermissionGate from "@/components/custom/permission-gate";
import { useFieldAccess } from "@/components/finance-ui";
import { useSchoolDisplay } from "@/hooks/use-school-display";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useGetPortalAccessQuery,
  useGivePortalAccessMutation,
  useResendPortalInvitationMutation,
  useTakeAwayPortalAccessMutation,
} from "@/redux/services/students/portal-access-api";
import type {
  PortalAccess,
  StudentDetail,
  StudentStatus,
} from "@/redux/services/students/students-types";
import { writeErrorMessage } from "@/utils/api-error";

import { ConfirmDialog } from "../drawers/confirm-dialog";
import { STATUS_LABEL, describe } from "./portal-access-copy";

/** The statuses in which a pupil may hold portal access. */
const ON_ROLL: StudentStatus[] = ["ENROLLED", "ACTIVE", "SUSPENDED"];

type Pending = "give" | "take" | null;

/**
 * Whether the pupil has their own sign-in account for the pupil portal, and
 * the controls to give, resend and take it away.
 *
 * The whole panel follows the `portal_access` Field Access switch: a role that
 * may not read it sees no panel at all, and the server sends it nothing. The
 * admission number and email it lists follow their own switches, so either may
 * be missing while the rest shows.
 *
 * Giving access emails an invitation to the pupil (where they have an email)
 * and to their primary guardian; a pupil with no email signs in with their
 * admission number. Taking access away ends every session the account holds.
 * A pupil who leaves the roll loses access without anybody pressing anything.
 */
export function PortalAccessPanel({ student }: { student: StudentDetail }) {
  const access = useFieldAccess(FIELD_RESOURCE.STUDENTS, student);
  const hidden = access.isHidden("portal_access");
  const query = useGetPortalAccessQuery(student.id, { skip: hidden });
  const [give, giving] = useGivePortalAccessMutation();
  const [resend, resending] = useResendPortalInvitationMutation();
  const [takeAway, takingAway] = useTakeAwayPortalAccessMutation();
  const [pending, setPending] = useState<Pending>(null);
  const { prefs } = useSchoolDisplay(student.branch);

  if (hidden) return null;
  const block: PortalAccess = query.data?.data ?? {};
  if (!query.isLoading && !block.status) return null;

  const name = student.first_name || student.full_name;
  const onRoll = ON_ROLL.includes(student.status as StudentStatus);
  const status = block.status ?? "none";
  const ids = block.sign_in_identifiers ?? {};

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      const result = (await action()) as { message?: string };
      toast.success(result?.message || "Done.");
      setPending(null);
    } catch (error) {
      toast.error(writeErrorMessage(error, fallback));
      setPending(null);
    }
  };

  return (
    <Surface as="section" className="rounded-xl px-4 py-5 sm:px-5.5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <KeyRound className="size-4.5 text-primary" />
        <h3 className="text-sm font-semibold text-black-01">Portal access</h3>
        <span className="rounded-full bg-white-03 px-2 py-0.5 text-xs text-primary">
          {STATUS_LABEL[status]}
        </span>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-gray-05">Checking portal access…</p>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-black-01">{describe(name, block, prefs)}</p>

          {(ids.admission_number || ids.email) && status !== "revoked" ? (
            <div className="grid gap-0.5 text-xs text-gray-05">
              <span>Signs in with</span>
              {ids.admission_number ? (
                <span className="font-medium text-black-01">{ids.admission_number}</span>
              ) : null}
              {ids.email ? <span className="break-words">{ids.email}</span> : null}
            </div>
          ) : null}

          <PermissionGate permission={P.GIVE_PORTAL_ACCESS}>
            <div className="flex flex-wrap gap-2">
              {(status === "none" || status === "revoked") && onRoll ? (
                <Button size="sm" onClick={() => setPending("give")}>
                  {status === "revoked" ? "Give access again" : "Give portal access"}
                </Button>
              ) : null}
              {status === "invited" ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={resending.isLoading}
                  onClick={() =>
                    run(
                      () => resend(student.id).unwrap(),
                      "The invitation could not be sent again. Try again.",
                    )
                  }
                >
                  Resend invitation
                </Button>
              ) : null}
              {status === "invited" || status === "active" ? (
                <Button size="sm" variant="outline" onClick={() => setPending("take")}>
                  Take away access
                </Button>
              ) : null}
            </div>
            {(status === "none" || status === "revoked") && !onRoll ? (
              <p className="text-xs text-gray-05">
                Only a student on the roll can be given portal access.
              </p>
            ) : null}
          </PermissionGate>
        </div>
      )}

      <ConfirmDialog
        open={pending === "give"}
        tone="primary"
        onCancel={() => setPending(null)}
        onConfirm={() =>
          run(() => give(student.id).unwrap(), "Portal access could not be given. Try again.")
        }
        busy={giving.isLoading}
        title={`Give ${name} portal access?`}
        body={`An invitation goes to ${name}'s own email, if their record has one, and to their primary guardian's email. ${name} activates the account from the link and then signs in with their admission number${student.email ? " or their email" : ""}.`}
        confirmLabel="Give access"
      />
      <ConfirmDialog
        open={pending === "take"}
        onCancel={() => setPending(null)}
        onConfirm={() =>
          run(() => takeAway(student.id).unwrap(), "Portal access could not be taken away. Try again.")
        }
        busy={takingAway.isLoading}
        title={`Take away ${name}'s portal access?`}
        body={`${name} is signed out everywhere and can no longer sign in to the pupil portal. You can give access again later, and they keep the same account.`}
        confirmLabel="Take away access"
      />
    </Surface>
  );
}
