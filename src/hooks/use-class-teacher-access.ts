import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";

/**
 * What the reader may do with a class's class teacher, under the Class teacher
 * Field Access switch (`academics.classes.class_teacher`).
 *
 * One switch covers every staff screen that names the person: the class list
 * and page, Teaching duties, the attendance hub, registers and report, and the
 * gradebook hub, broadsheet and approvals. The server leaves the name out of
 * each payload for a reader who may not read it.
 *
 * **Hidden is not nobody.** A null class teacher is a class without one, which
 * screens draw in amber as work to do. A hidden one is a fact the reader is not
 * told, so a screen leaves the column, line or tile out entirely rather than
 * saying "No class teacher". `canChange` gates Set, Change and Assign: without
 * Write the server refuses the change, so the screen does not offer it.
 */
export function useClassTeacherAccess(): { hidden: boolean; canChange: boolean } {
  const access = useFieldAccess(FIELD_RESOURCE.ACADEMICS_CLASSES);
  const hidden = access.isHidden("class_teacher");
  return { hidden, canChange: !hidden && !access.isReadOnly("class_teacher") };
}

/**
 * A class teacher as a screen prints it: their name, `nobody` for a class with
 * none, or null where Field Access left them out and nothing should be printed.
 */
export function classTeacherText(
  value: { name: string } | string | null | undefined,
  nobody = "No class teacher",
): string | null {
  if (value === undefined) return null;
  if (value === null) return nobody;
  return typeof value === "string" ? value : value.name;
}
