import { useState } from "react";

import { useGetStaffMemberQuery } from "@/redux/services/staff/staff-api";

import { AssignDutiesDrawer } from "./assign-duties-drawer";
import { BulkRoleDrawer } from "./bulk-role-drawer";
import { ClassTeacherDrawer } from "./class-teacher-drawer";
import { EditDrawer } from "./edit-drawer";
import { LeaveDrawer } from "./leave-drawer";
import { PostingDrawer } from "./posting-drawer";
import { RoleDrawer } from "./role-drawer";
import { RolePreviewDrawer } from "./role-preview-drawer";
import { StatusDrawer } from "./status-drawer";

/**
 * Which drawer a screen is asking for, and about whom.
 *
 * One request object rather than six booleans, so a screen cannot have two
 * drawers open at once and cannot open one without saying who it is about.
 */
export type StaffDrawerRequest =
  | { kind: "status"; staffId: number }
  | { kind: "edit"; staffId: number }
  | { kind: "role"; staffId: number }
  | { kind: "leave"; staffId: number; personName: string; isSelf: boolean }
  | { kind: "posting"; staffIds: number[]; personName?: string }
  | { kind: "bulkRole"; staffIds: number[] }
  | {
      kind: "duties";
      staffId: number;
      personName: string;
      /** Pre-selected when the drawer opens from a cell in the coverage grid. */
      classId?: number;
      subjectId?: number;
    }
  | {
      kind: "classTeacher";
      schoolClassId: number;
      className: string;
      currentStaffId: number | null;
    };

/**
 * One host for every staff drawer, mounted once per screen.
 *
 * **It takes an id and fetches the record itself**, rather than being handed a
 * row. The directory's row carries a dozen fields and the edit form needs the
 * rest of them; a row topped up inside each drawer would mean several
 * components each deciding what "enough" means, and the one that decided wrong
 * would silently blank a field on save.
 *
 * The status, posting and bulk drawers are the exceptions and take only ids:
 * what they need is the allowed moves or the branch list, both of which are
 * their own calls, so fetching a record for them would be a request nothing
 * reads.
 *
 * **The role preview sits ON TOP of the role drawer rather than replacing it.**
 * Somebody checking what a role reaches is mid-decision about granting it, and
 * closing the form to answer the question would lose what they had chosen. It
 * is dismissed back to the drawer it opened from.
 *
 * **Keyed per person.** Without it, opening a drawer on one person and then
 * another leaves the first one's typed reason in the form, attached now to the
 * wrong person's termination.
 */
export function StaffDrawers({
  request,
  onClose,
  onSaved,
}: {
  request: StaffDrawerRequest | null;
  onClose: () => void;
  /** Called after a bulk write, so a screen can clear its selection. */
  onSaved?: () => void;
}) {
  const [previewRole, setPreviewRole] = useState<string | null>(null);

  const needsRecord =
    request?.kind === "edit" || request?.kind === "role";
  const { data } = useGetStaffMemberQuery(
    request && "staffId" in request ? request.staffId : 0,
    { skip: !needsRecord },
  );
  const person = data?.data;

  if (!request) return null;

  if (request.kind === "status") {
    return (
      <StatusDrawer
        key={`status-${request.staffId}`}
        staffId={request.staffId}
        onClose={onClose}
      />
    );
  }
  if (request.kind === "leave") {
    return (
      <LeaveDrawer
        key={`leave-${request.staffId}`}
        staffId={request.staffId}
        personName={request.personName}
        isSelf={request.isSelf}
        onClose={onClose}
      />
    );
  }
  if (request.kind === "posting") {
    return (
      <PostingDrawer
        key={`posting-${request.staffIds.join("-")}`}
        staffIds={request.staffIds}
        personName={request.personName}
        onDone={() => onSaved?.()}
        onClose={onClose}
      />
    );
  }
  if (request.kind === "duties") {
    return (
      <AssignDutiesDrawer
        key={`duties-${request.staffId}`}
        staffId={request.staffId}
        personName={request.personName}
        initialClassId={request.classId}
        initialSubjectId={request.subjectId}
        onClose={onClose}
      />
    );
  }
  if (request.kind === "classTeacher") {
    return (
      <ClassTeacherDrawer
        key={`class-teacher-${request.schoolClassId}`}
        schoolClassId={request.schoolClassId}
        className={request.className}
        currentStaffId={request.currentStaffId}
        onClose={onClose}
      />
    );
  }
  if (request.kind === "bulkRole") {
    return (
      <BulkRoleDrawer
        key={`bulk-role-${request.staffIds.join("-")}`}
        staffIds={request.staffIds}
        onDone={() => onSaved?.()}
        onClose={onClose}
      />
    );
  }

  if (!person) return null;
  if (request.kind === "edit") {
    return (
      <EditDrawer key={`edit-${person.id}`} person={person} onClose={onClose} />
    );
  }
  return (
    <>
      <RoleDrawer
        key={`role-${person.id}`}
        person={person}
        onClose={onClose}
        onPreviewRole={setPreviewRole}
      />
      {previewRole && (
        <RolePreviewDrawer
          key={`preview-${previewRole}`}
          roleKey={previewRole}
          onClose={() => setPreviewRole(null)}
        />
      )}
    </>
  );
}
