import { formatTime, type DisplayPrefs } from "@/lib/dates";
import { activeDisplayPrefs } from "@/lib/school-display";
import type { Period } from "@/redux/services/calendar/calendar-types";

export function durationOf(period: Pick<Period, "start_time" | "end_time">) {
  return Math.max(1, minutes(period.end_time) - minutes(period.start_time));
}

function minutes(value: string) {
  const [hours = "0", minute = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minute);
}

/** A bell time on the school's clock: "1:05 pm" or "13:05". */
export function formatClock(value: string, prefs: DisplayPrefs = activeDisplayPrefs()) {
  return formatTime(value, prefs);
}
