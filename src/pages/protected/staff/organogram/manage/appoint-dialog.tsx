/**
 * Appointing somebody to a post, and ending an appointment.
 *
 * The post's current holders are listed with their start dates, each with an
 * End control; below them, the form to appoint somebody new. A primary
 * appointment replaces the person's current primary post, which the server
 * closes on the same day, so moving a teacher from Class Teacher to Head of
 * Primary is one appointment rather than two steps. An acting appointment is
 * cover for a post whose holder is away or not yet hired.
 *
 * Who may be appointed is the server's rule: somebody based at the post's
 * branch, or school-wide staff. A refusal is shown in its own words.
 */

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CustomDateInput } from "@/components/custom/custom-date-input";
import { SearchSelect } from "@/components/custom/search-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchStaffQuery } from "@/redux/services/staff/staff-api";
import {
  useCloseOrgAssignmentMutation,
  useCreateOrgAssignmentMutation,
  useGetOrgAssignmentsQuery,
} from "@/redux/services/staff/organogram-api";
import type { Position, PositionAssignment } from "@/redux/services/staff/organogram-types";
import { asArray, fmtDate } from "../lib/org-helpers";
import { ActingBadge, OrgAvatar } from "../components/org-primitives";
import { refusalMessage } from "./refusal";

export function AppointDialog({ position, onClose }: { position: Position | null; onClose: () => void }) {
  const open = position !== null;
  const { data: currentRes, isFetching: loadingCurrent } = useGetOrgAssignmentsQuery(
    position ? { position: position.id, current: true, page_size: 50 } : skipToken,
  );
  const current = asArray<PositionAssignment>(currentRes?.data);

  const [query, setQuery] = useState("");
  const { data: hitsRes, isFetching: searching } = useSearchStaffQuery(
    query.trim().length >= 2 ? query.trim() : skipToken,
  );
  const hits = asArray<{ id: number; name: string; meta: string }>(hitsRes?.data);
  const options = useMemo(
    () => hits.map((h) => ({ value: String(h.id), label: h.meta ? `${h.name} · ${h.meta}` : h.name })),
    [hits],
  );

  const [staffId, setStaffId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [ending, setEnding] = useState<number | null>(null);

  const [appoint, { isLoading: appointing }] = useCreateOrgAssignmentMutation();
  const [closeAssignment] = useCloseOrgAssignmentMutation();

  const reset = () => {
    setQuery("");
    setStaffId("");
    setIsPrimary(true);
    setIsActing(false);
    setStartDate("");
    setRefusal(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const full = !!position && current.length >= position.headcount;

  const submit = () => {
    if (!position || !staffId) return;
    setRefusal(null);
    appoint({
      staff_id: Number(staffId),
      position_id: position.id,
      is_primary: isPrimary,
      is_acting: isActing,
      ...(startDate ? { start_date: startDate } : {}),
    })
      .unwrap()
      .then(() => {
        toast.success(`Appointed to ${position.title}.`);
        reset();
      })
      .catch((err) => setRefusal(refusalMessage(err, "The appointment could not be made.")));
  };

  const end = (a: PositionAssignment) => {
    setEnding(a.id);
    closeAssignment({ id: a.id })
      .unwrap()
      .then(() => toast.success(`${a.staff.full_name} no longer holds ${a.position.title}.`))
      .catch((err) => toast.error(refusalMessage(err, "The appointment could not be ended.")))
      .finally(() => setEnding(null));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90dvh] p-0 sm:max-w-lg">
        <ScrollArea className="max-h-[90dvh]">
          <div className="grid gap-4 p-6">
            <DialogHeader>
              <DialogTitle>Appoint to {position?.title}</DialogTitle>
              <DialogDescription>
                {position?.org_node?.name}
                {position?.branch ? ` · ${position.branch.name}` : ""}
                {position ? ` · ${current.length} of ${position.headcount} filled` : ""}
              </DialogDescription>
            </DialogHeader>

            <section>
              <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">Held by</h4>
              {loadingCurrent && !current.length ? (
                <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ) : current.length ? (
                <ul className="flex flex-col gap-1.5">
                  {current.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5 rounded-lg border border-white-02 px-2.5 py-2">
                      <OrgAvatar user={a.staff} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium text-slate-700">{a.staff.full_name}</span>
                          {a.is_acting && <ActingBadge />}
                        </div>
                        <div className="text-[11.5px] text-slate-400">Since {fmtDate(a.start_date)}</div>
                      </div>
                      {a.can_manage && (
                        <Button size="sm" variant="outline" onClick={() => end(a)} loading={ending === a.id}>
                          End
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-slate-400">Vacant.</p>
              )}
            </section>

            <section className="grid grid-cols-1 gap-4 border-t border-white-02 pt-4 sm:grid-cols-2">
              <SearchSelect
                id="appoint-staff"
                label="Member of staff"
                isRequired
                containerClass="sm:col-span-2"
                options={options}
                loading={searching}
                value={staffId}
                onSearchChange={setQuery}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="Type at least two letters of a name…"
              />
              <label className="flex items-center justify-between gap-2 rounded-md border border-white-02 px-3 py-2 text-sm">
                Primary post <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-md border border-white-02 px-3 py-2 text-sm">
                Acting <Switch checked={isActing} onCheckedChange={setIsActing} />
              </label>
              <CustomDateInput
                id="appoint-start"
                label="Starts"
                containerClass="sm:col-span-2"
                value={startDate}
                onValueChange={setStartDate}
                placeholder="Today"
              />
              <p className="text-xs text-gray-05 text-pretty sm:col-span-2">
                {isPrimary
                  ? "Their current primary post, if they have one, ends the day this one starts."
                  : "Held alongside their primary post, which is unchanged."}
              </p>
              {full && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200 sm:col-span-2">
                  Every seat on this post is filled. Appointing somebody else adds a holder beyond its headcount, which is right for acting cover and wrong for a replacement: end the old appointment first.
                </p>
              )}
              {refusal && (
                <p role="alert" className="rounded-md bg-error-01/10 px-3 py-2 text-sm text-error-01 sm:col-span-2">{refusal}</p>
              )}
            </section>

            <DialogFooter>
              <Button variant="outline" onClick={close}>Done</Button>
              <Button onClick={submit} loading={appointing} disabled={!staffId}>Appoint</Button>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
