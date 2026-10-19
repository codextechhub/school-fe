import { useState } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/custom/surface";
import PermissionGate from "@/components/custom/permission-gate";
import { LiveOnly } from "@/components/custom/as-at-control";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";
import {
  useGetGuardianPortalAccessQuery,
  useGiveGuardianPortalAccessMutation,
  useResendGuardianPortalInvitationMutation,
  useTakeAwayGuardianPortalAccessMutation,
} from "@/redux/services/students/portal-access-api";
import type { GuardianDetail, PortalAccess } from "@/redux/services/students/students-types";
import { writeErrorMessage } from "@/utils/api-error";

import { ConfirmDialog } from "../drawers/confirm-dialog";
import { STATUS_LABEL, describe } from "../profile/portal-access-copy";

type Pending = "give" | "take" | null;

const APP = "the parent app";

/**
 * Whether the guardian has their own sign-in for the parent app, and the
 * controls to give it, resend the invitation and take it away.
 *
 * The panel follows the `portal_access` Field Access switch on guardians: a
 * role that may not read it sees no panel, and the server sends it nothing.
 * The email it shows follows the guardian email switch on the server.
 *
 * Giving access emails the guardian an invitation; they activate from the
 * link and sign in to the parent app with their email, where they see the
 * children linked to them here. A guardian who already has an account at the
 * school (a teacher whose child attends) keeps that one account. Taking access
 * away signs them out of the parent app everywhere: an account made only for
 * the parent app is closed, one also used for work is left working. The
 * controls show today only, never on a day in the record's history.
 */
export function ParentAppAccessPanel({ guardian }: { guardian: GuardianDetail }) {
  const access = useFieldAccess(FIELD_RESOURCE.GUARDIANS, guardian);
  const hidden = access.isHidden("portal_access");
  const query = useGetGuardianPortalAccessQuery(guardian.id, { skip: hidden });
  const [give, giving] = useGiveGuardianPortalAccessMutation();
  const [resend, resending] = useResendGuardianPortalInvitationMutation();
  const [takeAway, takingAway] = useTakeAwayGuardianPortalAccessMutation();
  const [pending, setPending] = useState<Pending>(null);

  if (hidden) return null;
  const block: PortalAccess = query.data?.data ?? {};
  if (!query.isLoading && !block.status) return null;

  // The full name: a guardian's first name is often only an initial ("Mr. A. Adeyemi").
  const name = guardian.full_name || guardian.first_name || "This guardian";
  const status = block.status ?? "none";
  const email = block.sign_in_identifiers?.email;

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      const result = (await action()) as { message?: string };
      toast.success(result?.message || "Done.");
    } catch (error) {
      toast.error(writeErrorMessage(error, fallback));
    }
    setPending(null);
  };

  return (
    <Panel as="section" className="rounded-xl p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Smartphone className="size-4.5 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-black-01">Parent app access</h2>
        <span className="rounded-full bg-white-03 px-2 py-0.5 text-xs text-primary">
          {STATUS_LABEL[status]}
        </span>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-gray-05">Checking parent app access…</p>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-black-01">{describe(name, block, undefined, APP)}</p>

          {email && status !== "revoked" ? (
            <div className="grid gap-0.5 text-xs text-gray-05">
              <span>Signs in with</span>
              <span className="break-words font-medium text-black-01">{email}</span>
            </div>
          ) : null}

          <LiveOnly>
            <PermissionGate permission={P.GIVE_PORTAL_ACCESS}>
              <div className="flex flex-wrap gap-2">
                {status === "none" || status === "revoked" ? (
                  <Button size="sm" onClick={() => setPending("give")}>
                    {status === "revoked" ? "Give access again" : "Give parent app access"}
                  </Button>
                ) : null}
                {status === "invited" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={resending.isLoading}
                    onClick={() =>
                      run(
                        () => resend(guardian.id).unwrap(),
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
            </PermissionGate>
          </LiveOnly>
        </div>
      )}

      <ConfirmDialog
        open={pending === "give"}
        tone="primary"
        onCancel={() => setPending(null)}
        onConfirm={() =>
          run(() => give(guardian.id).unwrap(), "Parent app access could not be given. Try again.")
        }
        busy={giving.isLoading}
        title={`Give ${name} the parent app?`}
        body={`An invitation goes to ${name}'s email. ${name} activates the account from the link and then signs in to the parent app with that email, where they see the children linked to them here.`}
        confirmLabel="Give access"
      />
      <ConfirmDialog
        open={pending === "take"}
        onCancel={() => setPending(null)}
        onConfirm={() =>
          run(
            () => takeAway(guardian.id).unwrap(),
            "Parent app access could not be taken away. Try again.",
          )
        }
        busy={takingAway.isLoading}
        title={`Take away ${name}'s parent app access?`}
        body={`${name} is signed out of the parent app everywhere. An account made only for the parent app is closed; one ${name} also uses for work at the school is left working. You can give access again later.`}
        confirmLabel="Take away access"
      />
    </Panel>
  );
}
