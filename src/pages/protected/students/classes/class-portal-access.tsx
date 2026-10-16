import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import { useGivePortalAccessInBulkMutation } from "@/redux/services/students/portal-access-api";
import type { PortalAccessBulkRow } from "@/redux/services/students/students-types";
import { writeErrorMessage } from "@/utils/api-error";

import { ConfirmDialog } from "../drawers/confirm-dialog";

/**
 * Give every pupil in a class their own portal sign-in at once.
 *
 * Each pupil is invited by email, at their own address where their record has
 * one and at their primary guardian's. A pupil who already has access is left
 * alone rather than invited again, and one pupil's refusal (no admission
 * number and no email, nowhere to send the invitation) never stops the rest:
 * the refused pupils are listed under the button with the reason for each.
 */
export function ClassPortalAccess({
  classId,
  className,
}: {
  classId: number;
  className: string;
}) {
  const [giveAll, { isLoading }] = useGivePortalAccessInBulkMutation();
  const [confirming, setConfirming] = useState(false);
  const [refused, setRefused] = useState<PortalAccessBulkRow[]>([]);

  const onConfirm = async () => {
    try {
      const result = await giveAll({ school_class: classId }).unwrap();
      const rows = result.data?.results ?? [];
      setRefused(rows.filter((row) => !row.ok));
      toast.success(result.message || "Portal access given.");
    } catch (error) {
      toast.error(writeErrorMessage(error, "Portal access could not be given. Try again."));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <PermissionGate permission={P.GIVE_PORTAL_ACCESS}>
      <div className="grid gap-2">
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
          <KeyRound className="size-4" />
          Give the class portal access
        </Button>
        {refused.length > 0 ? (
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-amber-900">
                {refused.length} {refused.length === 1 ? "student was" : "students were"} not given access
              </h3>
              <button
                type="button"
                onClick={() => setRefused([])}
                className="text-xs text-amber-900 underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
            <ul className="mt-1.5 grid gap-1">
              {refused.map((row) => (
                <li key={row.student} className="text-xs text-amber-900">
                  <span className="font-medium">{row.name || `Student ${row.student}`}</span>
                  {row.message ? ` - ${row.message}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming}
        tone="primary"
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        busy={isLoading}
        title={`Give everyone in ${className} portal access?`}
        body="Each student is invited by email, at their own address where they have one and at their primary guardian's. Students who already have access are left as they are. Anyone who cannot be invited is listed with the reason."
        confirmLabel="Give access"
      />
    </PermissionGate>
  );
}
