import { formatDate } from "@/pages/protected/students/format";
import type { ClassTeacherTerm } from "@/redux/services/academics/academics-types";

import { pastEntries, type HistoryEntry } from "./class-teacher-history";

/**
 * Who looked after a class earlier this year, newest first.
 *
 * Shown under the current class teacher on the class page and in the drawer
 * that changes it, so the person making a change sees who held the class
 * before. A stretch with nobody is a row of its own, because "JSS1 A had no
 * class teacher for three weeks" is the line a school most needs to find.
 *
 * Each row names who set the person, or who cleared the class, unless Field
 * Access hides who changed it; the server then sends no `set_by` and the row
 * shows the dates alone. The caller hides the whole list where Field Access
 * hides the history.
 */
export function ClassTeacherHistoryList({ terms }: { terms: ClassTeacherTerm[] }) {
  const entries = pastEntries(terms);

  return (
    <section aria-labelledby="class-teacher-history-heading">
      <h3
        id="class-teacher-history-heading"
        className="text-xs font-semibold text-black-01"
      >
        Earlier this year
      </h3>
      {entries.length ? (
        <ol className="mt-2 grid gap-2">
          {entries.map((entry) => (
            <HistoryRow key={entry.key} entry={entry} />
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-xs text-gray-05">
          No earlier class teacher this year.
        </p>
      )}
    </section>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <li className="flex min-w-0 gap-2.5">
      <span
        aria-hidden
        className={
          entry.name
            ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-gray-05"
            : "mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500"
        }
      />
      <div className="min-w-0 flex-1">
        <p
          className={
            entry.name
              ? "truncate text-[13px] text-black-01"
              : "text-[13px] text-amber-700"
          }
        >
          {entry.name ?? "No class teacher"}
        </p>
        <p className="text-xs text-gray-05">
          {stretch(entry)}
          {entry.by && (
            <> · {entry.name ? "set by" : "cleared by"} {entry.by.name}</>
          )}
        </p>
      </div>
    </li>
  );
}

/** "8 Sep 2026 to 3 Feb 2027", or "Until 3 Feb 2027" where the start predates the history. */
function stretch(entry: HistoryEntry): string {
  const to = formatDate(entry.to);
  return entry.from ? `${formatDate(entry.from)} to ${to}` : `Until ${to}`;
}
