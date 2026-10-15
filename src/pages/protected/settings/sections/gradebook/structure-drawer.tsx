import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  useCreateStructureMutation,
  useUpdateStructureMutation,
} from "@/redux/services/gradebook/gradebook-api";
import type { Structure } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { fieldErrorsFor } from "@/utils/api-error";

import { checkStructure, structureTotal, type ComponentDraft } from "./checks";
import { type Programme } from "./setup-records";
import { done } from "./setup-write";

export type StructureDrawerMode =
  | { kind: "create"; programme: Programme }
  | { kind: "edit"; structure: Structure };

const BLANK: ComponentDraft = { name: "", short_name: "", max_score: "", is_exam: false };

/**
 * A structure's name, the branches it applies to, and its components.
 *
 * The total and the one-examination rule are checked as the components are
 * typed. A draft may be saved while it fails them, because a school builds a
 * structure in more than one sitting; putting it in use is where the server
 * insists. A structure already in use must pass them to be saved at all.
 *
 * Only a school with several branches is asked which branch a structure is for:
 * at a school with one there is nothing to choose.
 */
export function StructureDrawer({
  mode,
  branches,
  onClose,
}: {
  mode: StructureDrawerMode;
  branches: { applies: boolean; choices: { id: number; name: string }[] };
  onClose: () => void;
}) {
  const existing = mode.kind === "edit" ? mode.structure : null;
  const programmeName = existing ? existing.program_name : mode.kind === "create" ? mode.programme.name : "";
  const [name, setName] = useState(existing?.name ?? `${programmeName} assessment`);
  const [branch, setBranch] = useState<string>(existing?.branch ? String(existing.branch) : "");
  const [rows, setRows] = useState<ComponentDraft[]>(
    existing?.components?.map((c) => ({
      id: c.id, name: c.name, short_name: c.short_name, max_score: String(c.max_score), is_exam: c.is_exam,
    })) ?? [
      { name: "Continuous assessment", short_name: "CA", max_score: "40", is_exam: false },
      { name: "Examination", short_name: "EXAM", max_score: "60", is_exam: true },
    ],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [create, creating] = useCreateStructureMutation();
  const [update, updating] = useUpdateStructureMutation();

  const verdict = checkStructure(rows);
  const inUse = existing?.status === "IN_USE";
  const total = structureTotal(rows);
  const set = (index: number, patch: Partial<ComponentDraft>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const onSave = async () => {
    setErrors({});
    const body = {
      name: name.trim(),
      branch: branch ? Number(branch) : null,
      components: rows.map((row) => ({
        ...(row.id ? { id: row.id } : {}),
        name: row.name.trim(),
        short_name: row.short_name.trim(),
        max_score: Number(row.max_score),
        is_exam: row.is_exam,
      })),
    };
    const write =
      mode.kind === "create"
        ? create({ ...body, program: mode.programme.id }).unwrap()
        : update({ id: mode.structure.id, body }).unwrap();
    const ok = await done(
      write.catch((error) => {
        setErrors(fieldErrorsFor(error, ["name", "branch", "components"]));
        throw error;
      }),
      mode.kind === "create" ? "Draft structure saved" : "Structure saved",
      inUse ? "It applies to every class that has not entered a mark this term." : "Put it in use when it is ready.",
    );
    if (ok) onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      wide
      title={mode.kind === "create" ? `New structure for ${programmeName}` : `Edit ${existing!.name}`}
      subtitle={
        inUse
          ? "In use. Saving changes it for every class that has not entered a mark this term."
          : "A draft. Nothing uses it until you put it in use."
      }
      saveLabel={mode.kind === "create" ? "Save draft" : "Save"}
      onSave={() => void onSave()}
      canSave={!!name.trim() && rows.length > 0 && (!inUse || verdict.ok)}
      saving={creating.isLoading || updating.isLoading}
    >
      <div className="space-y-5">
        <Field label="Name" required error={errors.name}>
          <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        </Field>

        {branches.applies && (
          <Field
            label="Applies to"
            hint="A structure for one branch is used there instead of the school-wide one."
            error={errors.branch}
          >
            <NativeSelect value={branch} onChange={(event) => setBranch(event.target.value)}>
              <NativeSelectOption value="">Every branch</NativeSelectOption>
              {branches.choices.map((choice) => (
                <NativeSelectOption key={choice.id} value={String(choice.id)}>
                  {choice.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        )}

        <div className="space-y-2">
          <p className="font-mont text-sm font-medium text-gray-01">Components</p>
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <li key={row.id ?? `new-${index}`} className="grid grid-cols-2 gap-2 rounded-lg border border-white-02 p-3 sm:grid-cols-[1fr_88px_80px_auto]">
                <Input
                  aria-label={`Component ${index + 1} name`}
                  placeholder="Name, e.g. 1st CA"
                  maxLength={60}
                  className="col-span-2 sm:col-span-1"
                  value={row.name}
                  onChange={(event) => set(index, { name: event.target.value })}
                />
                <Input
                  aria-label={`Component ${index + 1} short name`}
                  placeholder="Short"
                  maxLength={12}
                  value={row.short_name}
                  onChange={(event) => set(index, { short_name: event.target.value })}
                />
                <Input
                  aria-label={`Component ${index + 1} maximum`}
                  placeholder="Max"
                  inputMode="numeric"
                  value={row.max_score}
                  onChange={(event) => set(index, { max_score: event.target.value })}
                />
                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1">
                  <label className="flex items-center gap-2 font-mont text-xs text-gray-01">
                    <Checkbox
                      checked={row.is_exam}
                      onCheckedChange={(next) => set(index, { is_exam: next === true })}
                    />
                    Examination
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove component ${index + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length >= 12}
            onClick={() => setRows((current) => [...current, BLANK])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add component
          </Button>
        </div>

        <p
          className={cn(
            "rounded-md px-3 py-2 font-mont text-xs leading-5",
            verdict.ok ? "bg-green-01/10 text-green-01-text" : "bg-destructive/10 text-error-text",
          )}
          aria-live="polite"
        >
          {verdict.ok ? `Total ${total} of 100. ${verdict.message}` : verdict.message}
        </p>
        {errors.components && <p className="font-mont text-xs text-error-text">{errors.components}</p>}
        {inUse && (
          <p className="font-mont text-xs leading-5 text-gray-05">
            A change that would leave a mark already entered with no column is refused. Copy the structure and
            put the copy in use instead: a class that already has marks keeps the structure it started with.
          </p>
        )}
      </div>
    </DrawerShell>
  );
}
