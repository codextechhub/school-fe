import { useRef } from "react";
import { Camera, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StaffQualificationWrite } from "@/redux/services/staff/staff-types";

import { inputClass } from "../../students/drawers/drawer-shell";

/**
 * The pieces the Add form is built from.
 *
 * Separate from the form itself because the form is long and its shape is the
 * thing worth reading there: six numbered sections, one save, one transaction.
 */

/** One numbered section of the form. */
export function Section({
  step,
  title,
  note,
  children,
}: {
  step: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 border-t border-white-02 pt-5 first:border-0 first:pt-0">
      <div className="mb-4 flex items-baseline gap-2.5">
        <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-white-03 text-[11px] font-semibold text-primary">
          {step}
        </span>
        <h3 className="text-sm font-semibold text-black-01">{title}</h3>
      </div>
      {note && <p className="-mt-2 mb-4 text-xs text-gray-05">{note}</p>}
      {children}
    </section>
  );
}

/**
 * A picture held locally until there is a record to attach it to.
 *
 * Unlike the profile's picker, this one sends nothing: the person does not
 * exist yet, so the file waits in the form and goes up after the create
 * returns an id. The preview is an object URL rather than a data URL, so a
 * three-megabyte photograph does not get base64'd into React state.
 */
export function PhotoField({
  file,
  onPick,
  onClear,
}: {
  file: File | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex items-center gap-3.5">
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white-03 ring-1 ring-white-02">
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <Camera className="size-5 text-gray-05" aria-hidden />
        )}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => input.current?.click()}
        >
          {file ? "Choose another" : "Add a photograph"}
        </Button>
        {file && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Remove
          </Button>
        )}
        {/* Images only. The bytes end up in an <img> on every list, and a
            refusal after the upload is a worse way to learn that than a dialog
            that never offers the PDF. */}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) onPick(chosen);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/** A pill that toggles on and off, for the subject and class pickers. */
export function ChipToggle({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[13px]",
        on
          ? "border-primary bg-white-03 font-medium text-primary"
          : "border-white-02 bg-white text-gray-01 hover:bg-gray-03",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Typed qualification rows.
 *
 * No verification state and no expiry, on purpose: nothing in the platform
 * checks a degree and no register exists to check one against, so a field
 * somebody sets by hand would read as a check that was made.
 */
export function QualificationRows({
  rows,
  onChange,
}: {
  rows: StaffQualificationWrite[];
  onChange: (rows: StaffQualificationWrite[]) => void;
}) {
  function patch(index: number, next: Partial<StaffQualificationWrite>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...next } : row)));
  }

  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid gap-2.5 rounded-lg border border-white-02 p-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,5rem)_auto] sm:items-center"
        >
          <input
            value={row.qualification}
            onChange={(e) => patch(index, { qualification: e.target.value })}
            placeholder="B.Sc. Mathematics"
            aria-label="Qualification"
            className={inputClass}
          />
          <input
            value={row.institution}
            onChange={(e) => patch(index, { institution: e.target.value })}
            placeholder="Institution"
            aria-label="Institution"
            className={inputClass}
          />
          <input
            value={row.year_obtained ?? ""}
            onChange={(e) =>
              patch(index, {
                year_obtained: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="Year"
            inputMode="numeric"
            aria-label="Year obtained"
            className={inputClass}
          />
          <button
            type="button"
            aria-label="Remove this qualification"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="justify-self-start rounded-lg p-2 text-gray-05 hover:bg-gray-03 hover:text-error-text"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() =>
          onChange([
            ...rows,
            { qualification: "", institution: "", year_obtained: null, note: "" },
          ])
        }
      >
        <Plus className="size-4" />
        Add a row
      </Button>
      {rows.length === 0 && (
        <p className="text-[13px] text-gray-05">
          None recorded. They can be added to the record later.
        </p>
      )}
    </div>
  );
}
