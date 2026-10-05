import { useMemo, useState } from "react";
import { Loader2, Plus, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { parseApiError } from "@/utils/api-error";
import {
  blankTerms,
  dayLabel,
  termProblem,
  termWindows,
} from "./session-format";
import { useGetMyBranchesQuery } from "@/redux/services/branches/branches-api";
import {
  useCreateSessionMutation,
  useUpdateSessionMutation,
} from "@/redux/services/academics/academics-api";
import type {
  AcademicSession,
  TermWrite,
} from "@/redux/services/academics/academics-types";
import { useSchoolWords } from "@/hooks/use-school-words";

/**
 * Create or edit a school year, with its terms and its branches, in ONE save.
 *
 * One drawer for both, because the list and the detail screen both open it and
 * two drawers over the same object drift: one of them gains a field, and which
 * one you get depends on which button you pressed.
 *
 * One request too. The API takes the terms and the branch set nested inside the
 * session for the same reason this form has one Save button - a year created by
 * one call and its terms by three leaves a half-built year on screen the moment
 * the second one fails.
 */

interface Draft {
  name: string;
  start: string;
  end: string;
  terms: TermWrite[];
  /** Empty means the year the whole school runs. */
  branchIds: number[];
  schoolWide: boolean;
}

function draftFrom(
  session: AcademicSession | null,
  termNames: string[],
): Draft {
  if (!session) {
    return {
      name: "",
      start: "",
      end: "",
      terms: blankTerms(termNames),
      branchIds: [],
      schoolWide: true,
    };
  }
  const branchIds = (session.branches ?? []).map((b) => b.id);
  return {
    name: session.name,
    start: session.start_date,
    end: session.end_date,
    terms: session.terms.map((t) => ({
      id: t.id,
      name: t.name,
      order_index: t.order_index,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
    branchIds,
    schoolWide: branchIds.length === 0,
  };
}

export function SessionDrawer({
  open,
  session,
  onClose,
}: {
  open: boolean;
  /** The year being edited, or null to create one. */
  session: AcademicSession | null;
  onClose: () => void;
}) {
  // The school's own term names, so a new year opens on the right rows.
  const words = useSchoolWords();
  const namesKey = words.termNames.join("\n");

  const [draft, setDraft] = useState<Draft>(() =>
    draftFrom(session, words.termNames),
  );
  /**
   * Whether the name is owed a message yet.
   *
   * Set by a save attempt, or by leaving the field AFTER typing in it - never
   * by focus merely passing through. The drawer focuses this box on open, so
   * the weaker rule inserted "A name is required" the instant the reader
   * reached for anything else, and the line it added pushed the control they
   * were clicking downwards mid-click. See the same note in entity-drawer.
   */
  const [touchedName, setTouchedName] = useState(false);
  const [editedName, setEditedName] = useState(false);
  /** The server's duplicate refusal, shown under the field it names. */
  const [refusal, setRefusal] = useState<{
    field: string;
    message: string;
  } | null>(null);

  const { data: branchData } = useGetMyBranchesQuery();
  const branches = useMemo(() => branchData?.data ?? [], [branchData]);
  const multiBranch = branches.length > 1;

  const [create, { isLoading: creating }] = useCreateSessionMutation();
  const [update, { isLoading: updating }] = useUpdateSessionMutation();
  const saving = creating || updating;

  // Reset on a different year, during render rather than in an effect: an
  // effect paints the previous year's dates for a frame first. The term names
  // are part of the key because they can arrive after the drawer opens.
  const openedFor = open
    ? session
      ? `s${session.id}`
      : `new:${namesKey}`
    : "shut";
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (open) {
      setDraft(draftFrom(session, words.termNames));
      setTouchedName(false);
      setEditedName(false);
      setRefusal(null);
    }
  }

  const patch = (next: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setRefusal(null);
  };

  const setTerm = (index: number, next: Partial<TermWrite>) =>
    setDraft((d) => ({
      ...d,
      terms: d.terms.map((t, i) => (i === index ? { ...t, ...next } : t)),
    }));

  // Per-row, because the message belongs under the term that is wrong.
  const sessionDates = { start: draft.start, end: draft.end };
  const termErrors = draft.terms.map((_, i) =>
    termProblem(draft.terms, i, sessionDates, words.Term),
  );
  const windows = termWindows(draft.terms, sessionDates, words.Term);

  const datesBackwards =
    !!draft.start && !!draft.end && draft.end <= draft.start;
  const noBranchPicked =
    multiBranch && !draft.schoolWide && draft.branchIds.length === 0;

  const valid =
    !!draft.name.trim() &&
    !!draft.start &&
    !!draft.end &&
    !datesBackwards &&
    draft.terms.length > 0 &&
    draft.terms.every((t) => t.name.trim() && t.start_date && t.end_date) &&
    termErrors.every((e) => !e) &&
    !noBranchPicked;

  const initial = useMemo(
    () => JSON.stringify(draftFrom(session, words.termNames)),
    [session, words.termNames],
  );
  const dirty = JSON.stringify(draft) !== initial;

  const save = async () => {
    setTouchedName(true);
    const body = {
      name: draft.name.trim(),
      start_date: draft.start,
      end_date: draft.end,
      terms: draft.terms.map((t, i) => ({ ...t, order_index: i + 1 })),
      // Sent explicitly: omitting it would leave the existing set alone,
      // which is not what clearing the picker means.
      branch_ids: draft.schoolWide ? [] : draft.branchIds,
    };
    try {
      const result = session
        ? await update({ id: session.id, ...body }).unwrap()
        : await create(body).unwrap();
      toast.success(result.message);
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      // A duplicate names the field it hit, so it goes under that field rather
      // than into a toast that vanishes before the person looks up.
      if (
        parsed.code === "DUPLICATE_NAME" ||
        parsed.code === "DUPLICATE_CODE"
      ) {
        setTouchedName(true);
        setRefusal({
          field: String(parsed.detail.field ?? "name"),
          message: parsed.message,
        });
        return;
      }
      // Anything else is toasted centrally.
    }
  };

  const nameEmpty = touchedName && !draft.name.trim();

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="truncate font-mont text-base">
            {session ? `Edit ${session.name}` : "Create session"}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            A session runs on the same dates everywhere it applies.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-w-0 flex-1" viewportClassName="px-5 py-5">
          <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
            Session name *
          </label>
          <Input
            data-guide="session-drawer.name"
            value={draft.name}
            onChange={(e) => {
              setEditedName(true);
              patch({ name: e.target.value });
            }}
            onBlur={() => editedName && setTouchedName(true)}
            placeholder="e.g. 2026/2027"
            aria-invalid={nameEmpty || refusal?.field === "name" || undefined}
          />
          {nameEmpty && (
            <p className="mt-1 text-xs text-error-text">A name is required.</p>
          )}
          {refusal?.field === "name" && (
            <p className="mt-1.5 text-xs text-error-text text-pretty">
              {refusal.message}
            </p>
          )}

          <div data-guide="session-drawer.dates" className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
                Starts *
              </label>
              <DatePickerInput
                aria-label="Session start date"
                value={draft.start}
                onChange={(e) => patch({ start: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-06">
                Ends *
              </label>
              <DatePickerInput
                aria-label="Session end date"
                value={draft.end}
                min={draft.start || undefined}
                onChange={(e) => patch({ end: e.target.value })}
                aria-invalid={datesBackwards || undefined}
                className={cn(datesBackwards && "border-error-01")}
              />
            </div>
          </div>
          {datesBackwards && (
            <p className="mt-1 text-xs text-error-text">
              The session must end after it starts.
            </p>
          )}

          {/* A session carries a SET of branches, not the single-branch scope
              the catalogue entities use, so it gets its own control rather than
              borrowing one that cannot express "these two". */}
          {multiBranch && (
            <div data-guide="session-drawer.applies-to" className="mt-5 border-t border-white-02 pt-4">
              <p className="mb-2 text-[13px] font-medium text-gray-06">
                Applies to *
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ScopeOption
                  on={draft.schoolWide}
                  label="The whole school"
                  onClick={() => patch({ schoolWide: true, branchIds: [] })}
                />
                <ScopeOption
                  on={!draft.schoolWide}
                  label="Selected branches"
                  onClick={() => patch({ schoolWide: false })}
                />
              </div>
              {draft.schoolWide ? (
                <p className="mt-2 text-xs text-gray-05 text-pretty">
                  Covers every branch this school has, including any opened
                  while this year is running.
                </p>
              ) : (
                <>
                  {/* A picker, not a field of chips. A school with twenty
                      branches turns loose chips into a wall you have to read
                      end to end; a box you can type into answers "is Ikeja in
                      this year?" in one keystroke, and shows what is chosen
                      without the reader hunting for the highlighted ones. */}
                  <div className="mt-3">
                    <MultiSelect
                      searchable
                      placeholder="Choose branches"
                      value={draft.branchIds.map(String)}
                      onValueChange={(next) =>
                        patch({ branchIds: next.map(Number) })
                      }
                      options={branches.map((b) => ({
                        value: String(b.id),
                        label: b.name,
                      }))}
                      className="w-full"
                    />
                  </div>
                  {noBranchPicked && (
                    <p className="mt-2 text-xs text-error-text">
                      Pick at least one branch.
                    </p>
                  )}
                </>
              )}
              <p className="mt-2 text-xs text-gray-05 text-pretty">
                The dates above apply everywhere this session runs. A branch
                cannot keep its own {words.term} dates.
              </p>
            </div>
          )}

          <div data-guide="session-drawer.terms" className="mt-5 border-t border-white-02 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-gray-06">
                {words.Terms}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-primary"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    terms: [
                      ...d.terms,
                      {
                        name: "",
                        order_index: d.terms.length + 1,
                        start_date: "",
                        end_date: "",
                      },
                    ],
                  }))
                }
              >
                <Plus className="size-4" />
                Add {words.term}
              </Button>
            </div>

            <div className="grid gap-3">
              {draft.terms.map((term, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white-02 bg-white-05 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-5 shrink-0 place-content-center rounded-full bg-gray-04 text-[11px] text-gray-06">
                      {i + 1}
                    </span>
                    <Input
                      value={term.name}
                      onChange={(e) => setTerm(i, { name: e.target.value })}
                      placeholder={`${words.Term} name`}
                      className="h-9.5 min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${term.name || `${words.term} ${i + 1}`}`}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          terms: d.terms.filter((_, j) => j !== i),
                        }))
                      }
                      className="grid size-7 shrink-0 place-content-center rounded-md text-gray-06 hover:bg-gray-04 hover:text-error-01"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {/* Bounded by the session and the term before, so the
                        calendar cannot offer a day the form would reject. */}
                    <DatePickerInput
                      aria-label={`${term.name || `${words.Term} ${i + 1}`} start date`}
                      value={term.start_date}
                      disabled={!!windows[i].waitingOn}
                      min={windows[i].startMin}
                      max={windows[i].max}
                      onChange={(e) =>
                        setTerm(i, { start_date: e.target.value })
                      }
                      className={cn(
                        "h-9.5",
                        termErrors[i] && "border-error-01",
                      )}
                    />
                    <DatePickerInput
                      aria-label={`${term.name || `${words.Term} ${i + 1}`} end date`}
                      value={term.end_date}
                      disabled={!!windows[i].waitingOn}
                      min={windows[i].endMin}
                      max={windows[i].max}
                      onChange={(e) => setTerm(i, { end_date: e.target.value })}
                      className={cn(
                        "h-9.5",
                        termErrors[i] && "border-error-01",
                      )}
                    />
                  </div>
                  {windows[i].waitingOn ? (
                    <p className="mt-1.5 text-xs text-gray-05 text-pretty">
                      Set the end date of {windows[i].waitingOn} first.
                    </p>
                  ) : (
                    windows[i].follows &&
                    !termErrors[i] && (
                      <p className="mt-1.5 text-xs text-gray-05 text-pretty">
                        Starts after {windows[i].follows.name} ends on{" "}
                        {dayLabel(windows[i].follows.end)}.
                      </p>
                    )
                  )}
                  {termErrors[i] && (
                    <p className="mt-1.5 text-xs text-error-text text-pretty">
                      {termErrors[i]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {draft.terms.length === 0 && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-error-text">
                <TriangleAlert className="size-3.5" />A session needs at least
                one {words.term}.
              </p>
            )}
          </div>

          {refusal && refusal.field !== "name" && (
            <p className="mt-4 text-xs text-error-text text-pretty">
              {refusal.message}
            </p>
          )}
        </ScrollArea>

        <div data-guide="session-drawer.actions" className="flex shrink-0 items-center justify-end gap-2 border-t border-white-02 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {/* Gated on valid AND dirty: a Save that is live on a form nobody has
              touched invites a pointless write, and the write it invites on an
              archived year is refused by the server anyway. */}
          <Button onClick={save} disabled={!valid || !dirty || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {session ? "Save changes" : "Create"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ScopeOption({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-sm",
        on
          ? "border-primary bg-pry-01 text-primary"
          : "border-white-02 text-gray-06",
      )}
    >
      {label}
    </button>
  );
}
