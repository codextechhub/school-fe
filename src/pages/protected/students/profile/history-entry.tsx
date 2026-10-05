import type { DisplayPrefs } from "@/lib/dates";
import type { HistoryEntry } from "@/redux/services/students/students-types";

import { formatDateTime } from "../format";

const DOT: Record<string, string> = {
  status: "bg-primary",
  class: "bg-green-700",
  branch: "bg-sky-700",
  guardian: "bg-amber-600",
  document: "bg-gray-400",
  edit: "bg-gray-400",
};

/**
 * One line of the student's History tab.
 *
 * The reason behind a move (a status change, an admission-stage move, or any
 * other entry the backend gives one) arrives as its own `reason` field, never
 * inside `text`, because it sits behind a Field Access switch and a sentence
 * cannot be partly withheld. The backend leaves the key out for a reader whose
 * role cannot read it, and for an entry that has none, so the reason line is
 * drawn only when there is something to show: an absent, null or blank reason
 * leaves no empty "Reason:" behind.
 */
export function HistoryEntryItem({
  entry,
  prefs,
}: {
  entry: HistoryEntry;
  prefs?: DisplayPrefs;
}) {
  const reason = entry.reason?.trim();
  return (
    <li className="flex min-w-0 gap-2.5">
      <span
        aria-hidden
        className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[entry.kind] ?? "bg-gray-400"}`}
      />
      <div className="min-w-0">
        <p className="text-sm text-black-01">{entry.text}</p>
        {reason && (
          <p className="break-words text-sm text-gray-05">Reason: {reason}</p>
        )}
        <p className="text-xs text-gray-05">
          {formatDateTime(entry.when, prefs)} · {entry.actor}
        </p>
      </div>
    </li>
  );
}
