import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useSaveScoresMutation } from "@/redux/services/gradebook/gradebook-api";
import type {
  CellWrite,
  Marker,
  RefusedCell,
  SheetComponent,
  SheetRow,
  SheetKey,
} from "@/redux/services/gradebook/gradebook-types";
import { parseApiError } from "@/utils/api-error";

import { cellKey, cellOf, changed, judgeTyped, markerWrite, writeFor } from "./cells";

const SAVE_FAILED = "Those scores were not saved. Check your connection and try again.";

/**
 * Saving a score sheet as the teacher types, one cell at a time.
 *
 * **What was typed stays until the server has it.** Each cell's text is kept
 * as a draft from the first keystroke, and dropped only when the save it went
 * out with comes back, and only if nothing new was typed in the meantime. A
 * slow answer therefore never wipes a mark typed after it.
 *
 * **Cells are sent one at a time and in order.** The server saves a batch all
 * or nothing, so one bad cell in a batch would hold back the good ones beside
 * it. Sending each cell alone keeps a refusal on the cell that caused it, and
 * queueing them keeps a later answer from being overwritten by an earlier one.
 *
 * **A refusal is shown where it belongs.** A refused cell (`CELLS_REFUSED`)
 * keeps its text and shows the server's message under it. A sheet that locked
 * while it was open (`SHEET_LOCKED`, `CLASS_LOCKED`) says so in a toast, and
 * `onLocked` re-reads it so the grid turns read-only.
 */
export function useSheetSaver(key: SheetKey, onLocked: () => void) {
  const [save] = useSaveScoresMutation();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const latestDraft = useRef<Record<string, string | undefined>>({});

  const setError = (id: string, message: string | null) =>
    setErrors((current) => {
      if (message === null) {
        if (!(id in current)) return current;
        const { [id]: _gone, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: message };
    });

  const dropDraft = (id: string, sent: string | undefined) => {
    if (latestDraft.current[id] !== sent) return;
    delete latestDraft.current[id];
    setDrafts((current) => {
      const { [id]: _gone, ...rest } = current;
      return rest;
    });
  };

  const send = useCallback(
    (write: CellWrite, sentDraft?: string) => {
      const id = cellKey(write.student, write.component);
      setPending((count) => count + 1);
      queue.current = queue.current.then(async () => {
        const result = await save({ ...key, cells: [write] });
        setPending((count) => count - 1);
        if (!("error" in result)) {
          setError(id, null);
          dropDraft(id, sentDraft);
          return;
        }
        const refusal = parseApiError(result.error);
        const refused = refusal.detail.cells as RefusedCell[] | undefined;
        if (refusal.code === "CELLS_REFUSED" && Array.isArray(refused)) {
          for (const cell of refused) setError(cellKey(cell.student, cell.component), cell.message);
          return;
        }
        if (refusal.code === "SHEET_LOCKED" || refusal.code === "CLASS_LOCKED") {
          toast.error(refusal.message);
          onLocked();
          return;
        }
        toast.error(refusal.message || SAVE_FAILED);
      });
    },
    // `key` is a fresh object each render; its parts are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [save, key.classId, key.subjectId, key.term, onLocked],
  );

  /** Keep what was typed in a cell, without saving it yet. */
  const type = (student: number, component: number, text: string) => {
    const id = cellKey(student, component);
    latestDraft.current[id] = text;
    setDrafts((current) => ({ ...current, [id]: text }));
    setError(id, null);
  };

  /** Save what was typed in a cell, if it is clean and differs from what is stored. */
  const commit = (row: SheetRow, component: SheetComponent) => {
    const id = cellKey(row.student.id, component.id);
    const text = latestDraft.current[id];
    if (text === undefined) return;
    const typed = judgeTyped(text, component.max_score);
    if (typed.kind === "error") {
      setError(id, typed.message);
      return;
    }
    if (!changed(cellOf(row, component.id), typed)) {
      dropDraft(id, text);
      return;
    }
    send(writeFor(row.student.id, component, typed), text);
  };

  /** Set ABS or Excused on a cell, or clear it with `null`. Saved at once. */
  const mark = (student: number, component: number, marker: Marker | null) => {
    const id = cellKey(student, component);
    dropDraft(id, latestDraft.current[id]);
    setError(id, null);
    send(markerWrite(student, component, marker));
  };

  return { drafts, errors, saving: pending > 0, type, commit, mark };
}
