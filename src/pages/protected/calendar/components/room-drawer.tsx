import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchSelect } from "@/components/custom/search-select";
import { Field } from "@/pages/protected/academics/components/entity-drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseApiError } from "@/utils/api-error";
import { useBranchLens } from "@/hooks/use-branch-lens";
import type { RoomWrite } from "@/redux/services/calendar/calendar-types";
import { ROOM_KINDS } from "./room-kind";
import type { RoomDraft } from "./room-draft";
import { problemsOf, useFormProblems } from "./form-problems";
import { ProblemSummary } from "./problem-summary";

/**
 * Add or edit a room.
 *
 * **The branch is required and can never be "the whole school".** It is the one
 * non-null branch column in the schools product, and the reason is physical: a
 * room is a place, and a place belongs to one branch. So this drawer has a branch
 * PICKER where the event drawer has a whole-school / one-branch choice, and no
 * third option to leave out.
 *
 * **Capacity is advisory and the form says so.** Nothing in the platform
 * compares it with anything - there is no student count in this module at all -
 * so a class of forty fits a room of twenty-five as far as the server is
 * concerned. Saying that under the box is honest; a validation that pretended
 * otherwise would be a rule with nothing behind it.
 *
 * **Active is not archive-by-another-name, and the copy distinguishes them.**
 * An inactive room stops being offered when anyone picks a room, and everything
 * already scheduled in it stays exactly where it is.
 */

export function RoomDrawer({
  open,
  initial,
  editing,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: RoomDraft;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (body: RoomWrite) => Promise<unknown>;
}) {
  const {
    applies: multiBranch,
    isTied,
    branch: tiedBranch,
    branches,
    label: tiedLabel,
  } = useBranchLens();

  const [draft, setDraft] = useState<RoomDraft>(initial);
  const [refusal, setRefusal] = useState<{ field: string; message: string } | null>(
    null,
  );

  const patch = (next: Partial<RoomDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setRefusal(null);
  };

  const tiedLock =
    isTied && tiedBranch !== "all"
      ? { id: tiedBranch as number, name: tiedLabel }
      : null;
  const effectiveBranch = tiedLock ? tiedLock.id : draft.branch;

  // A room's branch is never optional, unlike everywhere else in this module.
  // A single-branch school never sees the control and the server fills in its
  // only branch.
  const problems = problemsOf(
    !draft.name.trim() && {
      field: "name",
      message: "Give the room a name, for example Block A Room 1.",
    },
    multiBranch &&
      !tiedLock &&
      draft.branch === -1 && {
        field: "branch",
        message: "Say which branch this room is at.",
      },
  );

  const { register, leave, attempt, errorFor, invalid, showing, reset } =
    useFormProblems(problems);

  const openedFor = open ? JSON.stringify(initial) : "shut";
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (open) {
      setDraft(initial);
      reset();
      setRefusal(null);
    }
  }
  const dirty =
    JSON.stringify({ ...draft, branch: effectiveBranch }) !==
    JSON.stringify({ ...initial, branch: tiedLock ? tiedLock.id : initial.branch });

  const save = async () => {
    if (!attempt()) return;
    try {
      await onSave({
        name: draft.name.trim(),
        code: draft.code.trim().toUpperCase(),
        room_type: draft.room_type,
        // Omitted entirely at a single-branch school: the server fills in the
        // only branch there, and sending -1 would be a reference to nothing.
        ...(multiBranch ? { branch: effectiveBranch } : {}),
        // "" means "no answer" and must not become 0, which would read as a
        // room that seats nobody.
        capacity: draft.capacity.trim() ? Number(draft.capacity) : null,
        is_active: draft.is_active,
      });
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      // DUPLICATE_NAME and DUPLICATE_CODE both carry `detail.field`, so the
      // sentence lands under the box that was wrong rather than in a toast.
      setRefusal({
        field: String(parsed.detail.field ?? ""),
        message: parsed.message || "That room could not be saved.",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="truncate font-mont text-base">
            {editing ? `Edit ${initial.name}` : "Add room"}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            Enter the room details used for lessons and examinations.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1" viewportClassName="px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Name *"
              error={
                errorFor("name") ||
                (refusal?.field === "name" ? refusal.message : "")
              }
            >
              <Input
                ref={register("name")}
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
                onBlur={leave("name")}
                placeholder="e.g. Science Laboratory"
                aria-invalid={
                  invalid("name") ||
                  (refusal?.field === "name" || undefined)
                }
              />
            </Field>
            <Field
              label="Code"
              error={refusal?.field === "code" ? refusal.message : ""}
            >
              <Input
                value={draft.code}
                onChange={(event) =>
                  patch({ code: event.target.value.toUpperCase() })
                }
                placeholder="e.g. LAB-01"
                aria-invalid={refusal?.field === "code" || undefined}
              />
            </Field>
          </div>

          <p className="mt-1.5 text-xs text-gray-05 text-pretty">
            The code is optional and must be unique across the school.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Room type *">
              <SearchSelect
                aria-label="Room type"
                value={draft.room_type}
                clearable={false}
                placeholder="Select room type"
                onChange={(event) =>
                  patch({
                    room_type: event.target.value as RoomDraft["room_type"],
                  })
                }
                options={ROOM_KINDS.map((kind) => ({
                  value: kind.value,
                  label: kind.label,
                }))}
              />
            </Field>
            <Field label="Capacity">
              <Input
                type="number"
                min={1}
                value={draft.capacity}
                onChange={(event) => patch({ capacity: event.target.value })}
                placeholder="e.g. 36"
              />
            </Field>
          </div>

          <p className="mt-1.5 text-xs text-gray-05 text-pretty">
            Capacity is guidance for scheduling and is not enforced automatically.
          </p>

          {multiBranch && (
            <div className="mt-5 border-t border-white-02 pt-4">
              <p className="mb-2 text-[13px] font-medium text-gray-06">
                Applies to *
              </p>
              {tiedLock ? (
                <div className="rounded-lg border border-white-02 bg-white-05 px-3 py-2.5">
                  <p className="text-sm text-black-01">{tiedLock.name}</p>
                  <p className="mt-0.5 text-xs text-gray-05 text-pretty">
                    Your account is tied to this branch, so anything you create
                    belongs to it.
                  </p>
                </div>
              ) : (
                <>
                  <SearchSelect
                    aria-label="Branch"
                    placeholder="Search branches"
                    value={draft.branch === -1 ? "" : String(draft.branch)}
                    onChange={(e) =>
                      patch({
                        branch: e.target.value ? Number(e.target.value) : -1,
                      })
                    }
                    options={branches.map((b) => ({
                      value: String(b.id),
                      label: b.name,
                    }))}
                  />
                  {errorFor("branch") && (
                    <p className="mt-1.5 text-xs text-error-text text-pretty">
                      {errorFor("branch")}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-05 text-pretty">
                    A room is a physical place, so it belongs to one branch. The
                    same room name at another branch is fine.
                  </p>
                </>
              )}
            </div>
          )}

          <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3.5">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => patch({ is_active: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary,#4A659D)]"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-gray-06">
                Active room
              </span>
              <span className="block text-xs text-gray-05 text-pretty">
                An inactive room stops appearing when anyone picks a room.
                Everything already scheduled in it stays exactly where it is.
              </span>
            </span>
          </label>

          {refusal && !refusal.field && (
            <p className="mt-4 text-xs text-error-text text-pretty">
              {refusal.message}
            </p>
          )}
        </ScrollArea>

        <div className="shrink-0 border-t border-white-02 pt-4">
          <ProblemSummary problems={showing} />
          <div className="flex items-center justify-end gap-2 px-5 pb-4">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {/* Live even when the draft is incomplete: pressing it is how a
                reader finds out what is missing. `dirty` only greys SAVE
                CHANGES, where nothing-to-save explains itself. On an add form
                it would grey the button on a blank drawer, which is the same
                dead control with the reason removed. */}
            <Button onClick={save} disabled={(editing && !dirty) || saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Save room"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
