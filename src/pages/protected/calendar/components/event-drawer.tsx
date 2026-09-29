import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CalendarOff,
  Loader2,
  MapPin,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchSelect } from "@/components/custom/search-select";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Field } from "@/pages/protected/academics/components/entity-drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/utils/api-error";
import { useBranchLens } from "@/hooks/use-branch-lens";
import type {
  Program,
  SchoolClass,
} from "@/redux/services/academics/academics-types";
import type {
  CalendarEvent,
  CalendarEventWrite,
} from "@/redux/services/calendar/calendar-types";
import { eventKindsIn, eventVariant } from "./event-kind";
import { formatRange } from "./dates";
import { AudiencePicker } from "./audience-picker";
import { closesSchoolShown, type EventDraft } from "./event-draft";
import { useCalendarRules } from "@/hooks/use-school-week";
import { problemsOf, useFormProblems } from "./form-problems";
import { ProblemSummary } from "./problem-summary";
import { useSchoolWords } from "@/hooks/use-school-words";

/**
 * The event drawer: read one, or write one.
 *
 * Its own file rather than a sixth caller of the academics EntityDrawer. That
 * one's spine is name + code + description + scope, and an event has no code at
 * all while having four fields that one has never heard of. Bending it would
 * have meant a `hideCode` flag, which is how a shared form becomes five forms
 * wearing one name.
 *
 * What IS borrowed is that drawer's hard-won rules, because they were learned
 * the expensive way:
 *
 *   * **Touched, not blurred.** Focus opens in the name box, so a
 *     blur-marks-touched rule scolds a reader for a field they never typed in -
 *     and the inserted message pushes the controls below down by a line WHILE
 *     they are clicking one.
 *   * **A refusal lands under the field it names**, never in a toast that
 *     appears where the reader is not looking and leaves before they look up.
 *   * **Re-seeded during render, not in an effect**, or the previous event's
 *     values paint for a frame first.
 *   * **Scope is stated, not offered, when it is not a choice.** A branch-tied
 *     account cannot create a school-wide event, and the server would refuse
 *     it, so a radio there would be a control that lies.
 *
 * Two rules are this drawer's own:
 *
 * **A warning is not a refusal.** Creating an event outside every term, or
 * overlapping another, SUCCEEDS and returns `warnings`. They are handed to the
 * caller to toast, and the drawer closes, because the write happened.
 *
 * **"School closed" starts from the school's default for the type.** On a new
 * event the box follows the type chosen (see `closesSchoolShown`) until the
 * person changes the box themselves; an edited event keeps its own answer.
 *
 * **Changing the branch clears the audience.** A class that was in scope stops
 * being in scope the moment the event moves branch, and the server refuses the
 * whole write for one out-of-scope id. Clearing is the honest reset; carrying
 * the picks would build a request that cannot succeed.
 */

export function EventDrawer({
  open,
  initial,
  editing,
  saving,
  programs,
  classes,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: EventDraft;
  /** True when editing: changes the Save label and nothing else. */
  editing: boolean;
  saving: boolean;
  programs: Program[];
  classes: SchoolClass[];
  onClose: () => void;
  onSave: (body: CalendarEventWrite) => Promise<unknown>;
}) {
  const {
    applies: multiBranch,
    pinnedBranch,
    branches,
    label: tiedLabel,
  } = useBranchLens();
  const kinds = eventKindsIn(useSchoolWords());
  const { closesSchoolByType } = useCalendarRules();

  const [draft, setDraft] = useState<EventDraft>(initial);
  // Set once the person changes the "school closed" box in this drawer.
  const [closesChosen, setClosesChosen] = useState(false);
  const [refusal, setRefusal] = useState<{ field: string; message: string } | null>(
    null,
  );

  const patch = (next: Partial<EventDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
    setRefusal(null);
  };

  const tiedLock =
    pinnedBranch != null
      ? {
          id: pinnedBranch,
          name: tiedLabel,
          reason:
            "You work in this branch only, so anything you create belongs to it.",
        }
      : null;
  const effectiveBranch = tiedLock ? tiedLock.id : draft.branch;

  // The server refuses this too, with the same sentence. Caught here as well
  // so a reader who can see both boxes is told before they press Save.
  const endsBeforeStart =
    !!draft.start_date && !!draft.end_date && draft.end_date < draft.start_date;

  // In the reading order of the form: the first one is where the cursor goes.
  const problems = problemsOf(
    !draft.name.trim() && {
      field: "name",
      message: "Give the event a name, for example Mid-term break.",
    },
    !draft.start_date && {
      field: "start_date",
      message: "Pick a start date.",
    },
    !draft.end_date && {
      field: "end_date",
      message: "Pick an end date. For a one-day event it is the start date.",
    },
    endsBeforeStart && {
      field: "end_date",
      message: "The end date cannot fall before the start date.",
    },
    multiBranch &&
      draft.branch === -1 && {
        field: "branch",
        message: "Say which branch this event belongs to.",
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
      setClosesChosen(false);
      reset();
      setRefusal(null);
    }
  }

  const closesSchool = closesSchoolShown({
    editing,
    chosen: closesChosen,
    eventType: draft.event_type,
    byType: closesSchoolByType,
    value: draft.closes_school,
  });

  const dirty =
    JSON.stringify({ ...draft, branch: effectiveBranch }) !==
    JSON.stringify({ ...initial, branch: tiedLock ? tiedLock.id : initial.branch });

  /** Moving the event's branch invalidates every id picked under the old one. */
  const setBranch = (next: number | null) =>
    patch({
      branch: next,
      audience: next === draft.branch ? draft.audience : [],
    });

  const save = async () => {
    if (!attempt()) return;
    try {
      await onSave({
        name: draft.name.trim(),
        event_type: draft.event_type,
        start_date: draft.start_date,
        // A one-day event is the ordinary case, and the server takes the two
        // dates equal for it rather than a null end.
        end_date: draft.end_date || draft.start_date,
        closes_school: closesSchool,
        description: draft.description.trim(),
        // Sent explicitly, including null: omitting it on a PATCH means "leave
        // it alone", which is not what picking school-wide means.
        ...(multiBranch ? { branch: effectiveBranch } : {}),
        audience: draft.audience,
      });
      onClose();
    } catch (error) {
      const parsed = parseApiError(error);
      // Every refusal in this module arrives as a sentence written for this
      // reader, so it is shown rather than replaced with wording of our own.
      const field =
        parsed.code === "INVALID_DATE_RANGE" || parsed.code === "EVENT_OUTSIDE_SESSION"
          ? "dates"
          : String(parsed.detail.field ?? "");
      setRefusal({
        field,
        message: parsed.message || "That could not be saved.",
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
            {editing ? `Edit ${initial.name}` : "Add event"}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            Holidays, breaks, exam periods and school events. Every one is dated
            inside the school year you are looking at.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1" viewportClassName="px-5 py-5">
          <Field
            label="Event name *"
            error={errorFor("name") || (refusal?.field === "name" ? refusal.message : "")}
          >
            <Input
              ref={register("name")}
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              onBlur={leave("name")}
              placeholder="e.g. Mid-term break"
              aria-invalid={invalid("name") || (refusal?.field === "name" || undefined)}
            />
          </Field>

          <div className="mt-4">
            <Field label="Type *">
              <div className="flex flex-wrap gap-1.5">
                {kinds.map((kind) => {
                  const on = draft.event_type === kind.value;
                  return (
                    <button
                      key={kind.value}
                      type="button"
                      onClick={() => patch({ event_type: kind.value })}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs",
                        on
                          ? "border-primary bg-pry-01 font-medium text-primary"
                          : "border-white-02 bg-white text-gray-06 hover:bg-gray-04",
                      )}
                    >
                      {kind.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            {draft.event_type === "EXAM_PERIOD" && (
              <p className="mt-1.5 text-xs text-gray-05 text-pretty">
                An exam timetable hangs off this. Once it is dated, papers can
                be scheduled inside it on the Exam scheduling screen.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Start date *" error={errorFor("start_date")}>
              <DatePickerInput
                aria-label="Event start date"
                value={draft.start_date}
                onChange={(e) => {
                  const start = e.target.value;
                  // A one-day event is most of them, so the end follows the
                  // start until the reader says otherwise. Never drags it
                  // backwards past a date they already chose.
                  patch({
                    start_date: start,
                    end_date:
                      !draft.end_date || draft.end_date < start
                        ? start
                        : draft.end_date,
                  });
                }}
                onBlur={leave("start_date")}
                aria-invalid={invalid("start_date")}
                className={cn(errorFor("start_date") && "border-error-01")}
              />
            </Field>
            <Field label="End date *" error={errorFor("end_date")}>
              <DatePickerInput
                aria-label="Event end date"
                value={draft.end_date}
                // The calendar greys out anything before the start, so the
                // backwards range is unreachable rather than merely refused.
                min={draft.start_date || undefined}
                onChange={(e) => patch({ end_date: e.target.value })}
                onBlur={leave("end_date")}
                aria-invalid={invalid("end_date")}
                className={cn(errorFor("end_date") && "border-error-01")}
              />
            </Field>
          </div>
          {refusal?.field === "dates" && (
            <p className="mt-1.5 text-xs text-error-text text-pretty">
              {refusal.message}
            </p>
          )}

          {/* Absent at a single-branch school, where every row is school-wide
              and a control with one answer is a question nobody can act on. */}
          {multiBranch && (
            <div className="mt-5 border-t border-white-02 pt-4">
              <p className="mb-2 text-[13px] font-medium text-gray-06">
                Applies to *
              </p>

              {tiedLock ? (
                <div className="rounded-lg border border-white-02 bg-white-05 px-3 py-2.5">
                  <p className="text-sm text-black-01">{tiedLock.name}</p>
                  <p className="mt-0.5 text-xs text-gray-05 text-pretty">
                    {tiedLock.reason}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ScopeOption
                      on={draft.branch === null}
                      label="The whole school"
                      onClick={() => setBranch(null)}
                    />
                    <ScopeOption
                      on={draft.branch !== null}
                      label="One branch"
                      onClick={() =>
                        setBranch(draft.branch ?? branches[0]?.id ?? -1)
                      }
                    />
                  </div>
                  {draft.branch !== null && (
                    <div className="mt-2">
                      <SearchSelect
                        aria-label="Branch"
                        placeholder="Search branches"
                        value={draft.branch === -1 ? "" : String(draft.branch)}
                        onChange={(e) =>
                          setBranch(e.target.value ? Number(e.target.value) : -1)
                        }
                        options={branches.map((b) => ({
                          value: String(b.id),
                          label: b.name,
                        }))}
                      />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-05 text-pretty">
                    Most events apply to every branch.
                  </p>
                </>
              )}
            </div>
          )}

          <AudiencePicker
            programs={programs}
            classes={classes}
            value={draft.audience}
            onChange={(audience) => patch({ audience })}
          />

          <div className="mt-5 border-t border-white-02 pt-4">
            <Field label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Optional"
                className="resize-y"
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={closesSchool}
              onChange={(e) => {
                setClosesChosen(true);
                patch({ closes_school: e.target.checked });
              }}
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary,#4A659D)]"
            />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-gray-06">
                School closed on these days
              </span>
              <span className="block text-xs text-gray-05 text-pretty">
                Marks them non-teaching on the calendar and takes them out of
                the teaching-day count. It does not touch any timetable: a
                school that closes for a holiday does not delete that Tuesday's
                lessons, it simply does not hold them.
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
              {editing ? "Save changes" : "Add event"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Reading one ──────────────────────────────────────────────────────────────

/**
 * The read-only detail.
 *
 * A separate component from the form, not a `readOnly` flag on it: a disabled
 * form is a form, and a reader without edit rights should see a document rather
 * than a wall of greyed-out boxes.
 */
export function EventDetail({
  event,
  open,
  multiBranch,
  onClose,
  onEdit,
}: {
  event: CalendarEvent | null;
  open: boolean;
  multiBranch: boolean;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const words = useSchoolWords();
  return (
    <Sheet open={open && !!event} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left">
          <SheetTitle className="font-mont text-lg text-pretty">
            {event?.name}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01">
            Event details
          </SheetDescription>
        </SheetHeader>

        {event && (
          <ScrollArea className="flex-1" viewportClassName="px-5 py-5">
            <div className="rounded-lg border border-border bg-pry-01/40 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-content-center rounded-full bg-white text-primary">
                  <CalendarDays className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-06">
                    Event dates
                  </p>
                  <p className="text-sm font-semibold text-black-01">
                    {formatRange(event.start_date, event.end_date)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={eventVariant(event.event_type)}
                      className="rounded-full py-0 text-[11px]"
                    >
                      {event.type_label}
                    </Badge>
                    {event.closes_school && (
                      <Badge variant="red" className="rounded-full py-0 text-[11px]">
                        <CalendarOff className="size-3" /> School closed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DetailFact
                icon={BookOpen}
                label={`School ${words.term}`}
                value={event.term?.name ?? `Outside every ${words.term}`}
                muted={!event.term}
              />
              {multiBranch && (
                <DetailFact
                  icon={MapPin}
                  label="Applies to"
                  value={event.scope_label ?? (event.branch_name || "School-wide")}
                />
              )}
              <DetailFact
                icon={UsersRound}
                label="Who it covers"
                value={
                  event.audience?.length
                    ? event.audience.map((audience) => audience.name).join(", ")
                    : "Everybody"
                }
              />
              <DetailFact
                icon={CalendarOff}
                label="Teaching day"
                value={event.closes_school ? "No, the school is closed" : "Yes"}
              />
            </div>

            {event.description && (
              <div className="mt-4 rounded-lg border border-border bg-white-05 p-4">
                <p className="text-sm font-semibold text-black-01">
                  Event description
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-06 text-pretty">
                  {event.description}
                </p>
              </div>
            )}
          </ScrollArea>
        )}

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white-02 px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onEdit && <Button onClick={onEdit}>Edit event</Button>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailFact({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border p-3">
      <span className="flex items-center gap-2 text-xs font-semibold text-gray-06">
        <Icon className="size-3.5 text-primary" /> {label}
      </span>
      <p
        className={cn(
          "mt-2 text-sm text-pretty",
          muted ? "text-gray-05" : "text-black-01",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Scope choices stay as real buttons because they change the write target,
 * while the branch picker below selects the exact branch.
 */
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
        on ? "border-primary bg-pry-01 text-primary" : "border-white-02 text-gray-06",
      )}
    >
      {label}
    </button>
  );
}
