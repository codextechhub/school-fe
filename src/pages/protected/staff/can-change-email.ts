import { useFieldAccess } from "@/components/finance-ui";
import { usePermissions } from "@/hooks/use-permissions";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { P } from "@/permissions";

/**
 * Whether the viewer may change a staff member's sign-in email.
 *
 * Two keys decide it, the same two the server checks: the account key
 * (`school.administrators.update`) and Field Access write on `email` of
 * `school.teachers`. Without a record it reads the viewer's map for an existing
 * record, because the email is open on create and would otherwise always read
 * as writable. Branch reach is the caller's to add (`_manage` on a row,
 * `canManage` on a profile).
 */
export function useCanChangeStaffEmail(record?: object | null): boolean {
  const { hasPermission } = usePermissions();
  const access = useFieldAccess(FIELD_RESOURCE.STAFF, record);
  return (
    hasPermission(P.MODIFY_ADMINISTRATOR) &&
    !access.isReadOnly("email", { creating: false })
  );
}
