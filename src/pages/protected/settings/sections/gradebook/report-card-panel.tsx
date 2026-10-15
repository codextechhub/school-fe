import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsPanel } from "@/components/settings/settings-layout";
import { useUpdateGradebookSettingsMutation } from "@/redux/services/gradebook/gradebook-api";
import type { GradebookSettings, GradebookSettingsWrite } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell } from "@/pages/protected/students/drawers/drawer-shell";

import { done } from "./setup-write";

type Option = "show_class_stats" | "rank_in_class" | "conduct_ratings" | "rating_key";

const OPTIONS: { key: Option; label: string; note: (s: GradebookSettings) => string }[] = [
  {
    key: "show_class_stats",
    label: "Class average, highest and lowest",
    note: () => "Printed beside each subject on the report card.",
  },
  {
    key: "rank_in_class",
    label: "Position in class",
    note: (s) =>
      s.rank_in_class ? "This school ranks: every card prints a position." : "This school does not rank, so nothing prints a position.",
  },
  {
    key: "conduct_ratings",
    label: "Conduct and skills ratings",
    note: (s) => `${s.rating_traits.length} traits, rated 1 to 5 by the class teacher when compiling.`,
  },
  {
    key: "rating_key",
    label: "The 1 to 5 key",
    note: () => "A line on the card explaining what each number means.",
  },
];

/**
 * What prints on every report card, which programmes are moderated, and the
 * traits a class teacher rates.
 *
 * Each switch saves the moment it is turned, as a reason code does in
 * attendance, because each is one decision and not part of a longer form. They
 * bind every branch and every report card not yet published; a published card
 * keeps what it printed.
 */
export function ReportCardPanel({ settings, canSave }: { settings: GradebookSettings; canSave: boolean }) {
  const [update, updating] = useUpdateGradebookSettingsMutation();
  const [editingTraits, setEditingTraits] = useState(false);

  const change = (body: GradebookSettingsWrite, success: string, description: string) =>
    done(update(body).unwrap(), success, description);

  const moderated = new Set(settings.moderated_programs);
  const toggleModerated = (code: string, name: string, on: boolean) => {
    const next = on ? [...moderated, code] : [...moderated].filter((c) => c !== code);
    void change(
      { moderated_programs: next },
      `${name} ${on ? "moderated" : "no longer moderated"}`,
      on
        ? "Its sheets go to the head of the subject's department before the class teacher."
        : "Its sheets go straight to the class teacher once submitted.",
    );
  };

  return (
    <>
      <SettingsPanel title="Report card options" description="What prints on every report card in this school.">
        <ul className="divide-y divide-white-02">
          {OPTIONS.filter((o) => o.key !== "rating_key" || settings.conduct_ratings).map((option) => (
            <li key={option.key}>
              <label className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
                <span className="min-w-0">
                  <span className="block font-mont text-sm font-medium text-gray-01">{option.label}</span>
                  <span className="mt-0.5 block font-mont text-xs leading-5 text-gray-05">{option.note(settings)}</span>
                </span>
                <Switch
                  checked={settings[option.key]}
                  disabled={!canSave || updating.isLoading}
                  aria-label={option.label}
                  onCheckedChange={(next) =>
                    void change(
                      { [option.key]: next },
                      `${option.label} ${next ? "on" : "off"}`,
                      "It changes every report card not yet published in this school.",
                    )
                  }
                />
              </label>
            </li>
          ))}
        </ul>
      </SettingsPanel>

      {settings.conduct_ratings && (
        <SettingsPanel
          title="Conduct and skills"
          description="The traits a class teacher rates from 1 to 5 for each student when compiling the class."
        >
          <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
            {settings.rating_traits.map((trait) => (
              <Badge key={trait} variant="inactive" className="rounded-full">
                {trait}
              </Badge>
            ))}
          </div>
          {canSave && (
            <div className="px-4 pb-4 sm:px-5">
              <Button variant="outline" size="sm" onClick={() => setEditingTraits(true)}>
                Edit traits
              </Button>
            </div>
          )}
        </SettingsPanel>
      )}

      <SettingsPanel
        title="Moderation"
        description="A moderated programme's sheets go to the head of the subject's department, who approves them or sends them back, before the class teacher compiles the class. A department with no head sends its sheets straight on."
      >
        <ul className="divide-y divide-white-02">
          {settings.programs.map((programme) => (
            <li key={programme.code}>
              <label className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <span className="font-mont text-sm text-gray-01">{programme.name}</span>
                <Switch
                  checked={moderated.has(programme.code)}
                  disabled={!canSave || updating.isLoading}
                  aria-label={`Moderate ${programme.name}`}
                  onCheckedChange={(next) => toggleModerated(programme.code, programme.name, next)}
                />
              </label>
            </li>
          ))}
        </ul>
      </SettingsPanel>

      {editingTraits && (
        <TraitsDrawer
          traits={settings.rating_traits}
          onClose={() => setEditingTraits(false)}
          onSave={(traits) => change({ rating_traits: traits }, "Traits saved", "Report cards not yet published print these.")}
        />
      )}
    </>
  );
}

/** The list of traits, in the order the card prints them. Between 1 and 15, each named once. */
function TraitsDrawer({
  traits,
  onClose,
  onSave,
}: {
  traits: string[];
  onClose: () => void;
  onSave: (traits: string[]) => Promise<boolean>;
}) {
  const [rows, setRows] = useState(traits);
  const [saving, setSaving] = useState(false);
  const cleaned = rows.map((row) => row.trim());
  const problem = cleaned.some((row) => !row)
    ? "Give every trait a name."
    : new Set(cleaned.map((row) => row.toLowerCase())).size !== cleaned.length
      ? "Each trait must have a different name."
      : cleaned.length === 0
        ? "Keep at least one trait."
        : "";

  return (
    <DrawerShell
      open
      onClose={onClose}
      title="Conduct and skills traits"
      subtitle="Between 1 and 15. The card prints them in this order."
      saveLabel="Save traits"
      canSave={!problem}
      saving={saving}
      onSave={async () => {
        setSaving(true);
        const ok = await onSave(cleaned);
        setSaving(false);
        if (ok) onClose();
      }}
    >
      <div className="space-y-3">
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Trait ${index + 1}`}
                maxLength={60}
                value={row}
                onChange={(event) => setRows((current) => current.map((r, i) => (i === index ? event.target.value : r)))}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove trait ${index + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" disabled={rows.length >= 15} onClick={() => setRows((current) => [...current, ""])}>
          <Plus className="size-4" aria-hidden="true" />
          Add a trait
        </Button>
        {problem && <p className="font-mont text-xs text-error-text">{problem}</p>}
      </div>
    </DrawerShell>
  );
}
