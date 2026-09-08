import { UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import PermissionGate from "@/components/custom/permission-gate";
import { P } from "@/permissions";
import type { SchoolClass } from "@/redux/services/academics/academics-types";

/**
 * The teacher who looks after each class itself.
 *
 * **A different fact from teaching the class, and that is why it has its own
 * panel.** A teaching duty says somebody teaches Mathematics to JSS1 A; being
 * class teacher says they are the person the school and the parents come to
 * about JSS1 A, whatever they teach it. Somebody can be one without the other
 * in both directions.
 *
 * The word "responsible" is deliberately not used here or above it. It was
 * used for both this and a subject's main teacher, and one word for two
 * designations is how a reader concludes that the main teacher for JSS1 A
 * Mathematics is thereby JSS1 A's class teacher.
 *
 * It lives on the CLASS rather than on an assignment, because uniqueness is a
 * property of the class: JSS1 A has one class teacher. This panel sets it and
 * keeps no second copy.
 *
 * **A class with nobody is the row worth seeing**, so it is the one drawn in
 * amber. Most schools fill these in September and never look again, which is
 * exactly when the one that was missed goes unnoticed.
 */
export function ClassTeachers({
  classes,
  onSet,
}: {
  classes: SchoolClass[];
  onSet: (row: SchoolClass) => void;
}) {
  if (!classes.length) {
    return (
      <p className="py-6 text-center text-[13px] text-gray-05">
        No classes this year yet. They are built in Academic Structure.
      </p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {classes.map((row) => (
        <li
          key={row.id}
          className="flex min-w-0 items-center gap-3 rounded-lg border border-white-02 px-3.5 py-2.5"
        >
          <UserRoundCheck
            className="size-4 shrink-0 text-gray-05"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-black-01">
              {row.name}
            </span>
            {row.class_teacher ? (
              <span className="block truncate text-xs text-gray-05">
                {row.class_teacher.name}
              </span>
            ) : (
              <span className="block text-xs text-amber-700">
                No class teacher yet
              </span>
            )}
          </span>
          <PermissionGate permission={P.ASSIGN_TEACHING}>
            <Button variant="ghost" onClick={() => onSet(row)}>
              {row.class_teacher ? "Change" : "Set"}
            </Button>
          </PermissionGate>
        </li>
      ))}
    </ul>
  );
}
