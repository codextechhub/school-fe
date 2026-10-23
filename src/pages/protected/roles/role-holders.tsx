import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useReaderReach } from "@/hooks/use-reader-reach";
import { selectUser } from "@/redux/features/auth/auth-slice";
import { useRevokeRoleAssignmentMutation } from "@/redux/services/roles/roles-api";
import type { RoleHolder } from "@/redux/services/roles/roles-types";
import { useAppSelector } from "@/redux/store";
import { writeErrorMessage } from "@/utils/api-error";

/** The platform's own administrator role, which is handed over rather than withdrawn. */
const SUPER_ADMIN_ROLE_KEY = "xvs_super_admin";

/**
 * The people holding one role, and taking the role away from them.
 *
 * One person or several are removed in a single act: tick them, or press
 * Remove on a row, give the reason once, and each grant is withdrawn in turn.
 * Withdrawn grants are kept with the reason on each person's history, which
 * is why the reason is asked for at all; the server refuses a withdrawal
 * without one.
 *
 * A grant is offered for removal only where the reader covers its reach: the
 * grant's own branch, or the role's branches when it inherits them, and the
 * whole school for a school-wide grant. The reader's own grant is never
 * offered, so ticking every row cannot take away the access being used to do
 * it. The Super Admin role is handed over to somebody else, never withdrawn
 * here. Anything the server still refuses (somebody posted beyond the reader's
 * branches) comes back by name.
 */
export function RoleHolders({
  roleKey,
  roleName,
  roleBranchIds,
  holders,
  canRemove,
  branchName,
  reachLabel,
}: {
  roleKey: string;
  roleName: string;
  /** The branches the role itself reaches; empty is school-wide. */
  roleBranchIds: number[];
  holders: RoleHolder[];
  /** Whether the reader holds the key to grant and withdraw roles. */
  canRemove: boolean;
  branchName: (id: number) => string;
  /** What a grant that inherits the role's reach reads as. */
  reachLabel: string;
}) {
  const me = useAppSelector(selectUser);
  const { covers } = useReaderReach();
  const [revoke] = useRevokeRoleAssignmentMutation();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState<RoleHolder[] | null>(null);
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState(false);

  const handedOver = roleKey === SUPER_ADMIN_ROLE_KEY;
  const removable = useMemo(() => {
    if (!canRemove || handedOver) return new Set<number>();
    return new Set(
      holders
        .filter((holder) => String(holder.user_id) !== String(me?.id))
        .filter((holder) => covers(holder.branch == null ? roleBranchIds : [holder.branch]))
        .map((holder) => holder.id),
    );
  }, [canRemove, handedOver, holders, me?.id, covers, roleBranchIds]);

  const ticked = holders.filter((holder) => selected.has(holder.id) && removable.has(holder.id));
  const allTicked = removable.size > 0 && ticked.length === removable.size;
  const showChecks = removable.size > 0;

  const toggle = (id: number, on: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const close = () => {
    if (removing) return;
    setConfirming(null);
    setReason("");
  };

  const remove = async () => {
    if (!confirming) return;
    setRemoving(true);
    const removed: string[] = [];
    const failed: { name: string; message: string }[] = [];
    for (const holder of confirming) {
      try {
        await revoke({ id: holder.id, reason_note: reason.trim() }).unwrap();
        removed.push(holder.user_name);
      } catch (error) {
        failed.push({ name: holder.user_name, message: writeErrorMessage(error, "it was refused") });
      }
    }
    if (!removed.length) {
      setRemoving(false);
      toast.error(
        confirming.length === 1
          ? `We could not remove ${confirming[0].user_name}: ${failed[0].message}`
          : `We could not remove anybody from ${roleName}. ${failed[0].name}: ${failed[0].message}`,
      );
      return;
    }
    const who = removed.length === 1 ? removed[0] : `${removed.length} people`;
    if (failed.length) {
      toast.info(
        `${who} removed from ${roleName}. Not removed: ${failed.map((entry) => `${entry.name} (${entry.message})`).join("; ")}.`,
      );
    } else {
      toast.success(`${who} removed from ${roleName}. The record stays on their history.`);
    }
    setSelected(new Set());
    setRemoving(false);
    setConfirming(null);
    setReason("");
  };

  return (
    <>
      {showChecks && (
        <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-04 px-4 py-2.5">
          <label className="flex items-center gap-2.5 text-sm text-black-01">
            <Checkbox
              checked={allTicked}
              onCheckedChange={(on) => setSelected(on === true ? new Set(removable) : new Set())}
              aria-label="Select everybody who can be removed"
            />
            {ticked.length ? `${ticked.length} selected` : "Select all"}
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={!ticked.length}
            onClick={() => setConfirming(ticked)}
          >
            <UserMinus /> Remove from role
          </Button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {holders.map((holder) => {
          const mayRemove = removable.has(holder.id);
          const isMe = String(holder.user_id) === String(me?.id);
          return (
            <div key={holder.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-border px-4 py-3">
              {showChecks && (
                <Checkbox
                  className="mt-1"
                  checked={selected.has(holder.id) && mayRemove}
                  disabled={!mayRemove}
                  onCheckedChange={(on) => toggle(holder.id, on === true)}
                  aria-label={`Select ${holder.user_name}`}
                />
              )}
              {/* Name first; reach and Remove wrap beneath it on a phone. */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 grow basis-48">
                  <p className="font-medium text-black-01">{holder.user_name}{isMe && <span className="font-normal text-gray-05"> (you)</span>}</p>
                  <p className="break-all text-xs text-gray-05">{holder.user_email}</p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant="inactive">{holder.branch == null ? reachLabel : branchName(holder.branch)}</Badge>
                  {mayRemove && (
                    <Button variant="ghost" size="sm" className="text-error-text" onClick={() => setConfirming([holder])}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canRemove && handedOver && holders.length > 0 && (
        <p className="mt-3 rounded-lg bg-gray-04 px-4 py-2.5 text-xs text-gray-01">
          Super Admin is handed over to somebody else, never withdrawn.
        </p>
      )}

      <AlertDialog open={confirming !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming?.length === 1
                ? `Remove ${confirming[0].user_name} from ${roleName}?`
                : `Remove ${confirming?.length ?? 0} people from ${roleName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming && confirming.length > 1 && <span className="mb-2 block text-black-01">{confirming.map((holder) => holder.user_name).join(", ")}</span>}
              They lose what this role lets them do straight away. Their other roles stay, and the record of this one stays on their history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="grid gap-1.5 text-sm font-medium text-black-01">
            Why are they being removed?
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Changed job, left the department…"
              rows={3}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Keep them</AlertDialogCancel>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={!reason.trim()}
              loading={removing}
              onClick={() => void remove()}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
