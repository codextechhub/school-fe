import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { NativeSelect } from "@/components/ui/native-select";
import { apiErrorMessage } from "@/utils/api-error";
import {
  useGetStaffListQuery,
  useSetClassTeacherMutation,
} from "@/redux/services/staff/staff-api";

import { DrawerShell, Field } from "../../students/drawers/drawer-shell";

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
 * The picker lists people who still work here. Somebody resigned or terminated
 * is left out: making them responsible for a class is a mistake nothing
 * downstream would catch, because the designation carries no end date.
 */
export function ClassTeacherDrawer({
  schoolClassId,
  className,
  currentStaffId,
  onClose,
}: {
  schoolClassId: number;
  className: string;
  /** Null where nobody holds the class, which is the state worth changing. */
  currentStaffId: number | null;
  onClose: () => void;
}) {
  const { data } = useGetStaffListQuery({ page: 1 });
  const [save, { isLoading: saving }] = useSetClassTeacherMutation();

  const [staffId, setStaffId] = useState(
    currentStaffId ? String(currentStaffId) : "",
  );

  const people = (data?.data ?? []).filter(
    (person) =>
      person.employment_status !== "RESIGNED" &&
      person.employment_status !== "TERMINATED",
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
        <Field
          label="Class teacher"
          hint="Leave it empty where nobody has taken the class yet."
        >
          <NativeSelect
            aria-label="Class teacher"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="h-9"
          >
            <option value="">Nobody</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
                {person.job_title ? ` - ${person.job_title}` : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <p className="flex items-start gap-2 rounded-lg bg-white-03 px-3.5 py-2.5 text-xs text-gray-01">
          <Info className="mt-px size-3.5 shrink-0 text-primary" />
          Being class teacher is separate from teaching the class. Somebody can
          be one without the other, in either direction.
        </p>
      </div>
    </DrawerShell>
  );
}
