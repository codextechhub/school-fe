import { useCallback } from "react";
import { useSearchParams } from "react-router";

import { useSchoolDisplay } from "@/hooks/use-school-display";

/**
 * The day an attendance screen shows, kept in the address as `?date=`.
 *
 * In the address rather than in state so a link can name a day: a student's
 * day cell opens that day's register, and a reminder or a shared link lands on
 * the day it was about. No `date` means today at the school, and choosing
 * today removes it again, so the plain address always reads as "now".
 *
 * A day after today is never kept. The server refuses to take a register for
 * one and answers a read with an empty, unstarted register, which would look
 * like a class nobody has marked.
 */
export function useAttendanceDay() {
  const [params, setParams] = useSearchParams();
  const { today: todayIn } = useSchoolDisplay();
  const today = todayIn();

  const raw = params.get("date");
  const valid = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today;
  const date = valid ? raw : today;

  const setDate = useCallback(
    (next: string) => {
      setParams(
        (current) => {
          const copy = new URLSearchParams(current);
          if (!next || next >= today) copy.delete("date");
          else copy.set("date", next);
          return copy;
        },
        { replace: true },
      );
    },
    [setParams, today],
  );

  return { date, today, isToday: date === today, setDate };
}
