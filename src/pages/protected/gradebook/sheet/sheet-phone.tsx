import { useState } from "react";

import { Panel } from "@/components/custom/surface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Marker, Sheet, SheetComponent, SheetRow } from "@/redux/services/gradebook/gradebook-types";

import { cellKey, cellOf, cellText } from "./cells";
import { MarkerChip, type Saver } from "./sheet-grid";

/**
 * The sheet on a phone: one student at a time.
 *
 * The grid does not survive a phone, so each component is a full-width input
 * with ABS and Excused beside it, the worked-out figures beneath, and previous
 * and next pinned to the foot of the screen. The student picker at the top
 * jumps straight to anybody on the sheet. It reads and writes the same sheet
 * as the grid.
 */
export function SheetPhone({
  sheet,
  editable,
  showFigures,
  saver,
}: {
  sheet: Sheet;
  editable: boolean;
  showFigures: boolean;
  saver: Saver;
}) {
  const [index, setIndex] = useState(0);
  const count = sheet.rows.length;
  const at = Math.min(index, Math.max(count - 1, 0));
  const row = sheet.rows[at];
  if (!row) return null;
  const done = row.complete && row.total !== null && row.total !== undefined;

  return (
    <>
      <Panel as="section" className="space-y-4 p-4">
        <div className="min-w-0">
          <label className="text-xs text-gray-05" htmlFor="sheet-student">
            Student {at + 1} of {count}
          </label>
          <select
            id="sheet-student"
            value={at}
            onChange={(event) => setIndex(Number(event.target.value))}
            className="mt-1 block w-full truncate rounded-md border border-border bg-white px-3 py-2 text-base font-semibold text-black-01"
          >
            {sheet.rows.map((r, i) => (
              <option key={r.student.id} value={i}>
                {r.student.name}
                {r.complete ? "" : " · not complete"}
              </option>
            ))}
          </select>
          {row.student.admission_number && (
            <p className="mt-1 text-xs text-gray-05">{row.student.admission_number}</p>
          )}
        </div>

        <div className="space-y-4">
          {sheet.components.map((component) => (
            <PhoneCell key={component.id} row={row} component={component} editable={editable} saver={saver} />
          ))}
        </div>

        {showFigures && (
          <dl className="grid grid-cols-3 gap-2 rounded-md bg-gray-50 p-3 text-center">
            <PhoneFigure label="Total" value={done ? String(row.total) : "-"} />
            <PhoneFigure label="Percentage" value={done && row.percentage ? `${row.percentage}%` : "-"} />
            <PhoneFigure label="Grade" value={done && row.grade ? row.grade : "-"} />
          </dl>
        )}
        {showFigures && done && row.excused_note && <p className="text-xs text-gray-06">{row.excused_note}</p>}
      </Panel>

      <div className="sticky bottom-3 z-10 mt-3 grid grid-cols-2 gap-3 rounded-md border border-border bg-white p-3 shadow-lg">
        <Button variant="outline" disabled={at === 0} onClick={() => setIndex(at - 1)}>
          Previous
        </Button>
        <Button disabled={at >= count - 1} onClick={() => setIndex(at + 1)}>
          Next
        </Button>
      </div>
    </>
  );
}

function PhoneCell({
  row,
  component,
  editable,
  saver,
}: {
  row: SheetRow;
  component: SheetComponent;
  editable: boolean;
  saver: Saver;
}) {
  const id = cellKey(row.student.id, component.id);
  const stored = cellOf(row, component.id);
  const draft = saver.drafts[id];
  const error = saver.errors[id];
  const inputId = `cell-${id}`;
  const marker = draft === undefined ? stored.marker : null;

  const toggle = (next: Marker) =>
    saver.mark(row.student.id, component.id, marker === next ? null : next);

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-black-01">
          {component.name}
        </label>
        <span className="text-xs text-gray-05">max {component.max_score}</span>
      </div>
      {editable ? (
        <div className="mt-1 flex gap-2">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            placeholder={marker ? (marker === "ABS" ? "ABS" : "Excused") : ""}
            value={marker ? "" : (draft ?? cellText(stored))}
            onChange={(event) => saver.type(row.student.id, component.id, event.target.value)}
            onBlur={() => saver.commit(row, component)}
            className={cn(
              "h-12 min-w-0 flex-1 rounded-md border bg-white text-center text-base text-black-01 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              error ? "border-destructive" : "border-border",
            )}
          />
          <ToggleButton on={marker === "ABS"} tone="red" onClick={() => toggle("ABS")}>
            ABS
          </ToggleButton>
          <ToggleButton on={marker === "EXC"} tone="blue" onClick={() => toggle("EXC")}>
            Excused
          </ToggleButton>
        </div>
      ) : (
        <div className="mt-1 text-base text-black-01">
          {stored.marker ? <MarkerChip marker={stored.marker} /> : (stored.mark ?? "-")}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ToggleButton({
  on,
  tone,
  onClick,
  children,
}: {
  on: boolean;
  tone: "red" | "blue";
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-12 shrink-0 rounded-md border px-3 text-sm font-semibold",
        on
          ? tone === "red"
            ? "border-destructive bg-[#FCEBEB] text-[#A32D2D]"
            : "border-primary bg-primary/10 text-primary"
          : "border-border bg-white text-gray-05",
      )}
    >
      {children}
    </button>
  );
}

function PhoneFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-05">{label}</dt>
      <dd className="text-base font-semibold text-black-01">{value}</dd>
    </div>
  );
}
