import type { Period } from "@/redux/services/calendar/calendar-types";

export function durationOf(period: Pick<Period, "start_time" | "end_time">) {
  return Math.max(1, minutes(period.end_time) - minutes(period.start_time));
}

function minutes(value: string) {
  const [hours = "0", minute = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minute);
}

export function formatClock(value: string) {
  const [hours = "0", minute = "00"] = value.split(":");
  const hour = Number(hours);
  const shownHour = hour % 12 || 12;
  return `${shownHour}:${minute} ${hour >= 12 ? "pm" : "am"}`;
}
