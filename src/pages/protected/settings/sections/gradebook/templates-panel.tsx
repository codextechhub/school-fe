import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SettingsPanel } from "@/components/settings/settings-layout";
import { useFieldAccess } from "@/components/finance-ui";
import { FIELD_RESOURCE } from "@/lib/field-resources";
import { cn } from "@/lib/utils";
import {
  useGetRemarkTemplatesQuery,
  useSaveRemarkTemplatesMutation,
} from "@/redux/services/gradebook/gradebook-api";
import type { RemarkTemplate } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell } from "@/pages/protected/students/drawers/drawer-shell";

import { checkTemplates, templateBandLabel, type TemplateDraft } from "./checks";
import { done } from "./setup-write";

/**
 * The principal's remark templates: one sentence per band of overall average.
 *
 * When the principal writes the comments for a class, each band starts from
 * its template, and the principal may change the wording for that class. The
 * list is replaced whole when it is saved, so bands can be added, moved and
 * removed together.
 */
export function TemplatesPanel({ canSave }: { canSave: boolean }) {
  const access = useFieldAccess(FIELD_RESOURCE.GRADEBOOK_SETUP);
  const { data, isLoading } = useGetRemarkTemplatesQuery();
  const [editing, setEditing] = useState(false);
  const templates = data?.data.templates;
  if (access.isHidden("templates") || (templates === undefined && !isLoading)) return null;
  const readOnly = access.isReadOnly("templates");
  const list = templates ?? [];
  const floors = list.map((t) => t.band_min);

  return (
    <SettingsPanel
      title="Principal's remark templates"
      description="Offered by band of overall average when the principal writes the comments for a class. The principal can still change the wording for each class."
    >
      <ul className="divide-y divide-white-02">
        {isLoading && <li className="px-4 py-4 font-mont text-xs text-gray-05 sm:px-5">Loading templates…</li>}
        {list.map((template) => (
          <li key={template.band_min} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:gap-4 sm:px-5">
            <span className="font-mont text-sm font-medium text-gray-01">
              {templateBandLabel(template.band_min, floors)}
            </span>
            <span className="font-mont text-sm text-gray-06">{template.text}</span>
          </li>
        ))}
      </ul>
      {canSave && !readOnly && (
        <div className="px-4 py-3 sm:px-5">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={isLoading}>
            Edit templates
          </Button>
        </div>
      )}
      {editing && <TemplatesDrawer templates={list} onClose={() => setEditing(false)} />}
    </SettingsPanel>
  );
}

function TemplatesDrawer({ templates, onClose }: { templates: RemarkTemplate[]; onClose: () => void }) {
  const [rows, setRows] = useState<TemplateDraft[]>(
    templates.map((t) => ({ band_min: String(t.band_min), text: t.text })),
  );
  const [save, saving] = useSaveRemarkTemplatesMutation();
  const verdict = checkTemplates(rows);
  const set = (index: number, patch: Partial<TemplateDraft>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const onSave = async () => {
    const body = [...rows]
      .map((row) => ({ band_min: Number(row.band_min), text: row.text.trim() }))
      .sort((a, b) => b.band_min - a.band_min);
    if (await done(save(body).unwrap(), "Remark templates saved")) onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      wide
      title="Principal's remark templates"
      subtitle="One remark for each band of overall average. One band must start at 0."
      saveLabel="Save templates"
      onSave={() => void onSave()}
      canSave={verdict.ok}
      saving={saving.isLoading}
    >
      <div className="space-y-4">
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li key={index} className="space-y-2 rounded-lg border border-white-02 p-3">
              <div className="flex items-center gap-2">
                <label className="font-mont text-xs text-gray-05" htmlFor={`band-${index}`}>
                  From an average of
                </label>
                <Input
                  id={`band-${index}`}
                  className="w-20"
                  inputMode="numeric"
                  value={row.band_min}
                  onChange={(event) => set(index, { band_min: event.target.value })}
                />
                <span className="font-mont text-xs text-gray-05">%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  aria-label={`Remove template ${index + 1}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <Textarea
                aria-label={`Template ${index + 1} remark`}
                maxLength={300}
                rows={2}
                value={row.text}
                onChange={(event) => set(index, { text: event.target.value })}
              />
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length >= 10}
          onClick={() => setRows((current) => [...current, { band_min: "", text: "" }])}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add a band
        </Button>
        <p
          className={cn(
            "rounded-md px-3 py-2 font-mont text-xs leading-5",
            verdict.ok ? "bg-green-01/10 text-green-01-text" : "bg-destructive/10 text-error-text",
          )}
          aria-live="polite"
        >
          {verdict.message}
        </p>
      </div>
    </DrawerShell>
  );
}
