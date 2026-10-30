import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";

/** The setting field named by each API property on one settings form. */
export function useSettingFields(names: Record<string, string>, canSave: boolean) {
  const access = useFieldAccess(FIELD_RESOURCE.SCHOOL_SETTINGS);
  const field = (name: string) => names[name] ?? name;
  const shown = (name: string) => !access.isHidden(field(name));
  const editable = (name: string) =>
    canSave && shown(name) && !access.isReadOnly(field(name));
  const submitted = <T extends Record<string, unknown>>(values: T): Partial<T> =>
    Object.fromEntries(
      Object.entries(values).filter(([name]) => editable(name)),
    ) as Partial<T>;
  return { shown, editable, submitted };
}
