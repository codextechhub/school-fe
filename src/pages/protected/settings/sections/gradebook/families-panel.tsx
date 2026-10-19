import { Switch } from "@/components/ui/switch";
import { SettingsPanel } from "@/components/settings/settings-layout";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { useUpdateGradebookSettingsMutation } from "@/redux/services/gradebook/gradebook-api";
import type { GradebookSettings } from "@/redux/services/gradebook/gradebook-types";

import { done } from "./setup-write";

const LABEL = "Tell every parent with a parent app account";

/**
 * Who hears when a child's result is released.
 *
 * Off, the school's default, only the child's primary guardian is told. On,
 * each of the child's other parents who use the parent app is told too, in the
 * app and on their phone; the report card email still goes to the primary
 * guardian alone, so a family never gets two. The switch saves the moment it
 * is turned, like the report card options beside it.
 *
 * Field Access `gradebook.setup.tell_every_parent` decides it: hidden, the
 * panel is left out; read-only, the switch shows the school's choice and
 * cannot be moved.
 */
export function FamiliesPanel({ settings, canSave }: { settings: GradebookSettings; canSave: boolean }) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SETUP);
  const [update, updating] = useUpdateGradebookSettingsMutation();
  if (access.isHidden("tell_every_parent") || settings.tell_every_parent === undefined) return null;

  const on = settings.tell_every_parent;
  const editable = canSave && !access.isReadOnly("tell_every_parent");

  return (
    <SettingsPanel
      title="Telling families about results"
      description="Who hears when a child's result is released. The report card email always goes to the child's primary guardian."
    >
      <label className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <span className="min-w-0">
          <span className="block font-mont text-sm font-medium text-gray-01">{LABEL}</span>
          <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">
            {on
              ? "Each child's other parents who use the parent app are told too, in the app and on their phone. They are not emailed."
              : "Only the child's primary guardian is told: by email, and in the parent app and on their phone if they use it."}
          </span>
        </span>
        <Switch
          checked={on}
          disabled={!editable || updating.isLoading}
          aria-label={LABEL}
          onCheckedChange={(next) =>
            void done(
              update({ tell_every_parent: next }).unwrap(),
              next ? "Every parent will be told" : "Only the primary guardian will be told",
              "It applies to the next results this school releases.",
            )
          }
        />
      </label>
    </SettingsPanel>
  );
}
