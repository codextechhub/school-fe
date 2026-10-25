import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { apiErrorMessage } from "@/utils/api-error";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { useGetClassQuery } from "@/redux/services/academics/academics-api";
import type { ClassTeacherTerm } from "@/redux/services/academics/academics-types";
import { useSetClassTeacherMutation } from "@/redux/services/staff/staff-api";

import { ClassTeacherHistoryList } from "../../classes/class-teacher-history-list";
import { DrawerShell } from "../../students/drawers/drawer-shell";
import { StaffSearchSelect } from "../staff-search-select";

/**
 * Who is responsible for a class.
 *
 * **Not the same as teaching it.** Mr. Eze may teach Mathematics to JSS1 A
 * without being its class teacher, and Mrs. Adeyemi may be JSS1 A's class
 * teacher while teaching them nothing at all. So the picker offers everybody
 * employed rather than only the people with a duty in that class.
 *
 * **Clearing it is a real answer.** A class teacher leaves and nobody has taken
 * the class yet, and a school should be able to say so rather than leaving the
 * departed person's name against it.
 *
 * The picker searches everybody who still works here (`StaffSearchSelect`),
 * so a school with more staff than one page of the directory can still reach
 * the person at the bottom of it.
 *
 * Below it is who held the class earlier this year, so the person making a
 * change sees who came before. It is left out where Field Access hides it.
 */
export function ClassTeacherDrawer({
  schoolClassId,
  className,
  currentStaffId,
  currentName,
  history,
  onClose,
}: {
  schoolClassId: number;
  className: string;
  /** Null where nobody holds the class, which is the state worth changing. */
  currentStaffId: number | null;
  currentName?: string;
  /** The class's terms when the caller has them; the drawer fetches them otherwise. */
  history?: ClassTeacherTerm[];
  onClose: () => void;
}) {
  const [save, { isLoading: saving }] = useSetClassTeacherMutation();
  const historyHidden = useFieldAccess(FIELD_RESOURCE.ACADEMICS_CLASSES).isHidden(
    "class_teacher_history",
  );
  const { data: detail } = useGetClassQuery(schoolClassId, {
    skip: !!history || historyHidden,
  });
  const terms = historyHidden ? undefined : history ?? detail?.data.class_teacher_history;

  const [staffId, setStaffId] = useState(
    currentStaffId ? String(currentStaffId) : "",
  );

  async function submit() {
    try {
      const result = await save({
        school_class: schoolClassId,
        staff: staffId ? Number(staffId) : null,
      }).unwrap();
      toast.success(
        result.data.class_teacher
          ? `${result.data.class_teacher.name} is responsible for ${className}.`
          : `${className} has no class teacher.`,
      );
      onClose();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "We could not save that. Try again."),
      );
    }
  }

  return (
    <DrawerShell
      open
      onClose={onClose}
      title={`Class teacher for ${className}`}
      subtitle="The person the school and the parents come to about this class."
      saveLabel={staffId ? "Save" : "Leave it with nobody"}
      onSave={() => void submit()}
      canSave
      saving={saving}
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <StaffSearchSelect
            id="class-teacher"
            label="Class teacher"
            value={staffId}
            onChange={setStaffId}
            currentName={currentName}
            placeholder="Nobody - search staff by name"
          />
          <p className="text-xs text-gray-05">
            Clear it where nobody has taken the class yet.
          </p>
        </div>

        {terms && <ClassTeacherHistoryList terms={terms} />}

        <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          Being class teacher is separate from teaching the class. Somebody can
          be one without the other, in either direction.
        </p>
      </div>
    </DrawerShell>
  );
}
