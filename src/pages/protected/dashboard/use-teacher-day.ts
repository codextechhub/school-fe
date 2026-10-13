import { skipToken } from "@reduxjs/toolkit/query";

import { useCapabilities } from "@/hooks/use-capabilities";
import { usePermissions } from "@/hooks/use-permissions";
import { P } from "@/permissions";
import { useGetMyAttendanceTodayQuery } from "@/redux/services/attendance/attendance-api";
import type { TeacherHub as TeacherHubData } from "@/redux/services/attendance/attendance-types";
import {
  useGetMyStaffRecordQuery,
  useGetStaffMemberQuery,
} from "@/redux/services/staff/staff-api";

/**
 * Whether the signed-in reader is an active teacher today, and their day.
 *
 * An active teacher is somebody whose employment is Active today (not
 * suspended, not on approved leave, not still invited, not gone) and who
 * teaches: they lead a class this school year or have a lesson today. A bursar
 * or registrar has neither and gets none of the teaching cards; a teacher on
 * sick leave until Thursday gets them back on Friday. When the reader's own
 * record hides its status from them, teaching alone decides.
 */
export function useTeacherDay(): { active: boolean; loading: boolean; day: TeacherHubData | null } {
  const { hasPermission } = usePermissions();
  const { hasCapability } = useCapabilities();
  const reads = hasPermission(P.VIEW_ATTENDANCE) && hasCapability("attendance");

  const mine = useGetMyStaffRecordQuery(undefined, { skip: !reads });
  const staffId = mine.data?.data.id;
  const person = useGetStaffMemberQuery(staffId ?? skipToken);
  const today = useGetMyAttendanceTodayQuery({}, { skip: !reads });

  const day = today.data?.data ?? null;
  const status = person.data?.data.display_employment_status;
  const employed = status === undefined || status === "ACTIVE";
  const teaches = !!day && (day.classes.length > 0 || (day.lessons?.length ?? 0) > 0);
  return {
    active: reads && !!staffId && employed && teaches,
    loading: reads && (mine.isLoading || person.isLoading || today.isLoading),
    day,
  };
}
