import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { useCreateScaleMutation, useUpdateScaleMutation } from "@/redux/services/gradebook/gradebook-api";
import type { Scale } from "@/redux/services/gradebook/gradebook-types";
import { DrawerShell, Field } from "@/pages/protected/students/drawers/drawer-shell";
import { fieldErrorsFor } from "@/utils/api-error";

import { bandRanges, checkScale, type BandDraft } from "./checks";
import { type Programme } from "./setup-records";
import { done } from "./setup-write";

export type ScaleDrawerMode = { kind: "create"; programme: Programme } | { kind: "edit"; scale: Scale };

const BLANK: BandDraft = { min_score: "", grade: "", remark: "", is_fail: false };

/**
 * A grading scale's name, the branches it applies to, and its bands.
 *
 * Each band is its lowest mark, its grade and remark, and whether it is a
 * fail; the marks it covers run up to the next band's lowest, which the drawer
 * shows beside each row as it is typed. A scale in use is read live by every
 * result not yet published, so saving one regrades those results; published
 * results keep the grades they were given.
 */
export function ScaleDrawer({
  mode,
  branches,
  onClose,
}: {
  mode: ScaleDrawerMode;
  branches: { applies: boolean; choices: { id: number; name: string }[] };
  onClose: () => void;
}) {
  const existing = mode.kind === "edit" ? mode.scale : null;
  const programmeName = existing ? existing.program_name : mode.kind === "create" ? mode.programme.name : "";
  const [name, setName] = useState(existing?.name ?? `${programmeName} grading`);
  const [branch, setBranch] = useState<string>(existing?.branch ? String(existing.branch) : "");
  const [rows, setRows] = useState<BandDraft[]>(
    existing?.bands?.map((b) => ({
      id: b.id, min_score: String(b.min_score), grade: b.grade, remark: b.remark ?? "", is_fail: b.is_fail,
    })) ?? [
      { min_score: "70", grade: "A", remark: "Excellent", is_fail: false },
      { min_score: "60", grade: "B", remark: "Very good", is_fail: false },
      { min_score: "50", grade: "C", remark: "Good", is_fail: false },
      { min_score: "40", grade: "D", remark: "Pass", is_fail: false },
      { min_score: "0", grade: "F", remark: "Fail", is_fail: true },
    ],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [create, creating] = useCreateScaleMutation();
  const [update, updating] = useUpdateScaleMutation();

  const verdict = checkScale(rows);
  const inUse = existing?.status === "IN_USE";
  const floors = rows.map((row) => Number(row.min_score));
  const numeric = rows.every((row) => row.min_score.trim() !== "" && Number.isInteger(Number(row.min_score)));
  const ranges = numeric ? bandRanges(floors) : [];
  const set = (index: number, patch: Partial<BandDraft>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const onSave = async () => {
    setErrors({});
    const body = {
      name: name.trim(),
      branch: branch ? Number(branch) : null,
      bands: [...rows]
        .sort((a, b) => Number(b.min_score) - Number(a.min_score))
        .map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          min_score: Number(row.min_score),
          grade: row.grade.trim(),
          remark: row.remark.trim(),
          is_fail: row.is_fail,
        })),
    };
    const write =
      mode.kind === "create"
        ? create({ ...body, program: mode.programme.id }).unwrap()
        : update({ id: mode.scale.id, body }).unwrap();
    const ok = await done(
      write.catch((error) => {
        setErrors(fieldErrorsFor(error, ["name", "branch", "bands"]));
        throw error;
      }),
      mode.kind === "create" ? "Draft scale saved" : "Scale saved",
      inUse ? "Results not yet published are graded by it now." : "Put it in use when it is ready.",
    );
    if (ok) onClose();
  };

  return (
    <DrawerShell
      open
      onClose={onClose}
      wide
      title={mode.kind === "create" ? `New scale for ${programmeName}` : `Edit ${existing!.name}`}
      subtitle={
        inUse
          ? "In use. Saving regrades every result not yet published; published results keep their grades."
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
            hint="A scale for one branch is used there instead of the school-wide one."
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
          <p className="font-mont text-sm font-medium text-gray-01">Bands</p>
          <p className="font-mont text-xs leading-5 text-gray-05">
            Each band starts at its lowest mark and runs up to the next band&apos;s.
          </p>
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <li key={row.id ?? `new-${index}`} className="grid grid-cols-2 gap-2 rounded-lg border border-white-02 p-3 sm:grid-cols-[80px_72px_1fr_auto]">
                <Input
                  aria-label={`Band ${index + 1} lowest mark`}
                  placeholder="From"
                  inputMode="numeric"
                  value={row.min_score}
                  onChange={(event) => set(index, { min_score: event.target.value })}
                />
                <Input
                  aria-label={`Band ${index + 1} grade`}
                  placeholder="Grade"
                  maxLength={10}
                  value={row.grade}
                  onChange={(event) => set(index, { grade: event.target.value })}
                />
                <Input
                  aria-label={`Band ${index + 1} remark`}
                  placeholder="Remark, e.g. Credit"
                  maxLength={120}
                  className="col-span-2 sm:col-span-1"
                  value={row.remark}
                  onChange={(event) => set(index, { remark: event.target.value })}
                />
                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1">
                  <span className="font-mont text-xs text-gray-05 sm:hidden">{ranges[index] ?? ""}</span>
                  <label className="flex items-center gap-2 font-mont text-xs text-gray-01">
                    <Checkbox checked={row.is_fail} onCheckedChange={(next) => set(index, { is_fail: next === true })} />
                    Fail
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove band ${index + 1}`}
                    disabled={rows.length === 1}
                    onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                {ranges[index] && (
                  <span className="col-span-full hidden font-mont text-xs text-gray-05 sm:block">
                    Marks {ranges[index]}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length >= 20}
            onClick={() => setRows((current) => [...current, BLANK])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add band
          </Button>
        </div>

        <p
          className={cn(
            "rounded-md px-3 py-2 font-mont text-xs leading-5",
            verdict.ok ? "bg-green-01/10 text-green-01-text" : "bg-destructive/10 text-error-text",
          )}
          aria-live="polite"
        >
          {verdict.message}
        </p>
        {errors.bands && <p className="font-mont text-xs text-error-text">{errors.bands}</p>}
      </div>
    </DrawerShell>
  );
}
