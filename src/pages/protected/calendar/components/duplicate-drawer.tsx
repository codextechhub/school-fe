import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SearchSelect } from "@/components/custom/search-select";
import { Field } from "@/pages/protected/academics/components/entity-drawer";
import { parseApiError } from "@/utils/api-error";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ClassTimetableRow,
  DuplicateSummary,
  TeacherDutyMatch,
} from "@/redux/services/calendar/calendar-types";
import { splitWarnings } from "./publish-check";
import { DutyNote } from "./duty-note";

/** The server sends an ISO weekday, so the name is the client's to choose. */
const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

/**
 * Copy another class's week into this one.
 *
 * **The preview is the server's answer, not ours, and that is the whole reason
 * it is a round trip.** Two of its numbers cannot be computed here: which
 * source lessons sit in a period the TARGET class does not run - a class at a
 * branch with its own short Friday does not run the other branch's Friday
 * periods - and how many rows the copy would replace. Two clients would decide
 * the first differently, so neither decides it.
 *
 * **Preview writes nothing**, and it is a separate endpoint call from the real
 * one rather than a flag on it, so a mistyped flag cannot perform the write it
 * meant to describe.
 *
 * **Both toggles default ON, and both are worth turning off.** Copied teachers
 * may create clashes - the same person cannot teach two classes at once - and
 * two classes certainly cannot share a room at the same time, so keeping rooms
 * usually needs fixing afterwards. The form says so rather than letting the red
 * cells explain it later.
 *
 * **Copied teachers answer to the school's teaching-duty rule.** The preview
 * lists each copied lesson whose teacher has no duty for the target class.
 * Under WARN the copy goes ahead; under REFUSE the server refuses it with a
 * sentence, which shows here, and the preview says so before the press.
 */

export function DuplicateDrawer({
  open,
  targetName,
  sources,
  summary,
  previewing,
  running,
  onPreview,
  onClose,
  onRun,
  dutyMatch = "OFF",
}: {
  open: boolean;
  targetName: string;
  /** Only classes that already hold lessons. Nothing else can be copied from. */
  sources: ClassTimetableRow[];
  summary: DuplicateSummary | null;
  previewing: boolean;
  running: boolean;
  onPreview: (args: {
    source: number;
    keepTeachers: boolean;
    keepRooms: boolean;
  }) => void;
  onClose: () => void;
  onRun: (args: {
    source: number;
    keepTeachers: boolean;
    keepRooms: boolean;
  }) => Promise<unknown>;
  /** The school's teaching-duty rule: how copied duty mismatches read. */
  dutyMatch?: TeacherDutyMatch;
}) {
  const [source, setSource] = useState<number | null>(null);
  const [keepTeachers, setKeepTeachers] = useState(true);
  const [keepRooms, setKeepRooms] = useState(true);
  const [refusal, setRefusal] = useState("");

  const openedFor = open ? targetName : "shut";
  const [lastOpenedFor, setLastOpenedFor] = useState(openedFor);
  if (openedFor !== lastOpenedFor) {
    setLastOpenedFor(openedFor);
    if (open) {
      setSource(null);
      setKeepTeachers(true);
      setKeepRooms(true);
      setRefusal("");
    }
  }

  // The preview follows every change to any of the three inputs, because all
  // three change the answer: dropping the teachers changes what is copied, and
  // the counts move with it.
  useEffect(() => {
    if (open && source) onPreview({ source, keepTeachers, keepRooms });
    // onPreview is a stable RTK trigger; including it would refetch per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source, keepTeachers, keepRooms]);

  const run = async () => {
    if (!source) return;
    try {
      await onRun({ source, keepTeachers, keepRooms });
      onClose();
    } catch (error) {
      setRefusal(parseApiError(error).message || "That copy could not be made.");
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
            Duplicate into {targetName}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-gray-01 text-pretty">
            Copy another class's week across, then edit the differences.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1" viewportClassName="px-5 py-5">
          {sources.length === 0 ? (
            <p className="rounded-lg border border-white-02 bg-white-05 px-3 py-2.5 text-sm text-gray-06 text-pretty">
              No other class has any lessons yet, so there is nothing to copy
              from. Build one class's week first, then duplicate it into the
              rest.
            </p>
          ) : (
            <>
              <Field label="Copy from *">
                <SearchSelect
                  aria-label="Copy from"
                  placeholder="Search classes"
                  value={source ? String(source) : ""}
                  onChange={(e) => {
                    setRefusal("");
                    setSource(e.target.value ? Number(e.target.value) : null);
                  }}
                  options={sources.map((c) => ({
                    value: String(c.id),
                    label: `${c.name} · ${c.lesson_count} lesson${c.lesson_count === 1 ? "" : "s"}`,
                  }))}
                />
              </Field>
              <p className="mt-1 text-xs text-gray-05">
                Only classes that already have lessons are listed.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={keepTeachers}
                  onChange={(e) => {
                    setRefusal("");
                    setKeepTeachers(e.target.checked);
                  }}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary,#4A659D)]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-gray-06">
                    Keep the same teachers
                  </span>
                  <span className="block text-xs text-gray-05 text-pretty">
                    Leave this off to copy the subjects only. Copied teachers
                    may create clashes, which stay flagged until you resolve
                    them.
                  </span>
                </span>
              </label>

              <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={keepRooms}
                  onChange={(e) => setKeepRooms(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary,#4A659D)]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-gray-06">
                    Keep the same rooms
                  </span>
                  <span className="block text-xs text-gray-05 text-pretty">
                    Two classes cannot share a room at the same time, so this
                    usually needs changing afterwards.
                  </span>
                </span>
              </label>

              {source && (
                <div className="mt-5 border-t border-white-02 pt-4">
                  <p className="mb-2 text-[13px] font-medium text-gray-06">
                    What this will do
                  </p>
                  {previewing && !summary ? (
                    <p className="text-sm text-gray-05">Working it out…</p>
                  ) : summary ? (
                    <>
                      <p className="text-sm text-black-01 text-pretty">
                        {summary.copied} lesson
                        {summary.copied === 1 ? "" : "s"} copied into{" "}
                        {targetName}.
                      </p>
                      {/* Said BEFORE the press. A copy that quietly overwrote
                          nine lessons somebody spent an afternoon on is the
                          one thing this preview exists to prevent. */}
                      {summary.replaced > 0 && (
                        <p className="mt-1.5 rounded-lg border border-yellow-01/40 bg-yellow-01/5 px-3 py-2 text-xs text-gray-06 text-pretty">
                          {summary.replaced} lesson
                          {summary.replaced === 1 ? "" : "s"} already in{" "}
                          {targetName} will be replaced.
                        </p>
                      )}
                      {summary.skipped > 0 && (
                        <p className="mt-1.5 text-xs text-gray-05 text-pretty">
                          {summary.skipped} will be skipped: they sit in a
                          period {targetName} does not run, or on a day the
                          school no longer teaches.
                        </p>
                      )}
                      <DuplicateDutyNotice
                        summary={summary}
                        dutyMatch={dutyMatch}
                        keepTeachers={keepTeachers}
                      />
                      {summary.rows.length > 0 && (
                        <ul className="mt-2.5 grid max-h-56 gap-1 overflow-y-auto">
                          {summary.rows.map((row, i) => (
                            <li
                              key={`${row.day_of_week}-${row.period}-${i}`}
                              className="flex flex-wrap items-baseline gap-x-2 rounded border border-white-02 px-2.5 py-1.5"
                            >
                              <span className="text-[11px] text-gray-05">
                                {DAY_NAMES[row.day_of_week] ?? ""} · {row.period}
                              </span>
                              <span className="text-xs font-medium text-black-01">
                                {row.subject}
                              </span>
                              {/* Already the words "No teacher" / "No room"
                                  when the toggles are dropping them, which is
                                  the answer this preview exists to show. */}
                              <span className="text-[11px] text-gray-05">
                                {row.teacher} · {row.room}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {summary.skipped_rows.length > 0 && (
                        <ul className="mt-2 grid gap-1">
                          {summary.skipped_rows.map((row, i) => (
                            <li
                              key={`s-${row.day_of_week}-${row.period}-${i}`}
                              className="flex flex-wrap items-baseline gap-x-2 rounded border border-dashed border-white-02 px-2.5 py-1.5 opacity-70"
                            >
                              <span className="text-[11px] text-gray-05">
                                {DAY_NAMES[row.day_of_week] ?? ""} · {row.period}
                              </span>
                              <span className="text-xs text-gray-06 line-through">
                                {row.subject}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </>
          )}

          {refusal && (
            <p role="alert" className="mt-4 text-xs text-error-text text-pretty">
              {refusal}
            </p>
          )}
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white-02 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={running}>
            Cancel
          </Button>
          <Button
            onClick={run}
            disabled={!source || running || !summary || summary.copied === 0}
          >
            {running && <Loader2 className="size-4 animate-spin" />}
            {summary && summary.copied > 0
              ? `Copy ${summary.copied} lesson${summary.copied === 1 ? "" : "s"}`
              : "Copy"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The copied lessons whose teacher has no teaching duty for the target class.
 *
 * Nothing under OFF. Under WARN a warning, and the copy goes ahead. Under
 * REFUSE, while teachers are being kept, the server refuses the copy, so this
 * says so before the press and names the way round it.
 */
export function DuplicateDutyNotice({
  summary,
  dutyMatch,
  keepTeachers,
}: {
  summary: DuplicateSummary;
  dutyMatch: TeacherDutyMatch;
  keepTeachers: boolean;
}) {
  const duty = splitWarnings(summary.warnings).duty;
  if (dutyMatch === "OFF" || duty.length === 0) return null;
  const blocks = dutyMatch === "REFUSE" && keepTeachers;
  return (
    <>
      <DutyNote
        severity={blocks ? "blocking" : "warning"}
        lines={duty.map((w) => w.detail)}
      />
      {blocks && (
        <p className="mt-1.5 text-xs text-gray-05 text-pretty">
          The school only allows a teacher who has the lesson in Teaching
          duties, so this copy will be refused. Turn off &quot;Keep the same
          teachers&quot;, or give them the duties first.
        </p>
      )}
    </>
  );
}
