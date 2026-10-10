import { skipToken } from "@reduxjs/toolkit/query";

import { PersonAvatar } from "@/pages/protected/students/person-avatar";
import {
  useGetMyStaffRecordQuery,
  useGetStaffMemberQuery,
} from "@/redux/services/staff/staff-api";

/**
 * The signed-in person's photograph in the account menu trigger.
 *
 * The authentication identity has the person's name but not the staff
 * photograph. The tenant-scoped `mine` endpoint resolves the matching staff
 * record without exposing an id supplied by the browser, then the ordinary
 * staff record cache supplies the photograph. Staff edits invalidate both
 * reads, so replacing one's photograph updates this trigger immediately.
 */
export function HeaderAccountAvatar({ name }: { name: string }) {
  const mine = useGetMyStaffRecordQuery();
  const staffId = mine.data?.data.id;
  const person = useGetStaffMemberQuery(staffId ?? skipToken);

  return (
    <PersonAvatar
      name={name}
      photoUrl={person.data?.data.photo_url ?? undefined}
      className="size-9 ring-0"
      textClassName="text-[13px]"
    />
  );
}
