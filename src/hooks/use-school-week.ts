import { useMemo } from "react";

import { useGetCalendarRulesQuery } from "@/redux/services/calendar/calendar-api";
import {
  resolveCalendarRules,
  type ResolvedCalendarRules,
} from "@/lib/calendar-rules";

/**
 * The school's calendar rules, resolved, for any screen that draws a week,
 * offers a weekday, defaults an event or checks a timetable.
 *
 * Reads `/academics/calendar/rules/`, cached for an hour and silent on
 * failure. While it is in flight, or if it fails, every value is the fallback
 * in {@link resolveCalendarRules}, so nothing waits on it to render: a month
 * grid draws Monday-first and snaps to Sunday-first the moment the rule
 * arrives.
 */
export function useCalendarRules(): ResolvedCalendarRules & { loaded: boolean } {
  const { data } = useGetCalendarRulesQuery();
  const rules = data?.data;
  return useMemo(
    () => ({ ...resolveCalendarRules(rules), loaded: !!rules }),
    [rules],
  );
}

/** The day the school's week starts on, and the days it teaches. */
export function useSchoolWeek(): Pick<ResolvedCalendarRules, "weekStartsOn" | "teachingDays"> {
  const { weekStartsOn, teachingDays } = useCalendarRules();
  return { weekStartsOn, teachingDays };
}
