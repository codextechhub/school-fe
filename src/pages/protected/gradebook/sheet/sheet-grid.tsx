import type { KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Panel } from "@/components/custom/surface";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Sheet, SheetComponent, SheetRow } from "@/redux/services/gradebook/gradebook-types";

import { cellKey, cellOf, cellText, MARKER_LABEL } from "./cells";
import type { useSheetSaver } from "./use-sheet-saver";

export type Saver = ReturnType<typeof useSheetSaver>;

/**
 * The sheet as a grid: students down, components across, the worked-out
 * figures at the end of each line.
 *
 * A cell is saved when the cursor leaves it. Enter moves down the column to the
 * next student, which is how a teacher copies a column off an exam script pile;
 * Tab moves across, as it does anywhere. ABS and Excused are the two small
 * buttons beside each input and save at once.
 */
export function SheetGrid({
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
  const moveDown = (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const next = document.querySelector<HTMLInputElement>(
      `[data-sheet-cell="${rowIndex + 1}:${colIndex}"]`,
    );
    if (next) next.focus();
    else event.currentTarget.blur();
  };

  return (
    <Panel as="section" className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-48 bg-white">Student</TableHead>
            {sheet.components.map((component) => (
              <TableHead key={component.id} className="text-center">
                {component.name}
                <div className="text-xs font-normal text-gray-05">max {component.max_score}</div>
              </TableHead>
            ))}
            {showFigures && (
              <>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="min-w-40">Remark</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheet.rows.map((row, rowIndex) => (
            <TableRow key={row.student.id}>
              <TableCell className="sticky left-0 z-10 bg-white">
                <p className="font-medium text-black-01">{row.student.name}</p>
                {row.student.admission_number && (
                  <p className="text-xs text-gray-05">{row.student.admission_number}</p>
                )}
              </TableCell>
              {sheet.components.map((component, colIndex) => (
                <TableCell key={component.id} className="text-center align-top">
                  <GridCell
                    row={row}
                    component={component}
                    editable={editable}
                    saver={saver}
                    position={`${rowIndex}:${colIndex}`}
                    onKeyDown={(event) => moveDown(event, rowIndex, colIndex)}
                  />
                </TableCell>
              ))}
              {showFigures && <Figures row={row} />}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}

function GridCell({
  row,
  component,
  editable,
  saver,
  position,
  onKeyDown,
}: {
  row: SheetRow;
  component: SheetComponent;
  editable: boolean;
  saver: Saver;
  position: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const id = cellKey(row.student.id, component.id);
  const stored = cellOf(row, component.id);
  const draft = saver.drafts[id];
  const error = saver.errors[id];
  const label = `${row.student.name}, ${component.name}`;

  if (!editable) {
    if (stored.marker) return <MarkerChip marker={stored.marker} />;
    return <span className="text-sm text-black-01">{stored.mark ?? "—"}</span>;
  }

  if (draft === undefined && stored.marker) {
    return (
      <span className="inline-flex items-center gap-1">
        <MarkerChip marker={stored.marker} />
        <button
          type="button"
          onClick={() => saver.mark(row.student.id, component.id, null)}
          className="rounded p-0.5 text-gray-05 hover:bg-gray-100 hover:text-black-01"
          aria-label={`Clear ${MARKER_LABEL[stored.marker]} for ${label}`}
          title="Clear"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col items-center">
      <div className="inline-flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          data-sheet-cell={position}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          value={draft ?? cellText(stored)}
          onChange={(event) => saver.type(row.student.id, component.id, event.target.value)}
          onBlur={() => saver.commit(row, component)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-9 w-14 rounded-md border bg-white text-center text-sm text-black-01 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            error ? "border-destructive" : "border-border",
          )}
        />
        <span className="flex flex-col gap-0.5">
          <MarkerButton
            text="A"
            title="Absent, not excused: counts as zero"
            label={`ABS for ${label}`}
            onClick={() => saver.mark(row.student.id, component.id, "ABS")}
          />
          <MarkerButton
            text="E"
            title="Excused: could not have sat it"
            label={`Excused for ${label}`}
            onClick={() => saver.mark(row.student.id, component.id, "EXC")}
          />
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MarkerButton({
  text,
  title,
  label,
  onClick,
}: {
  text: string;
  title: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className="h-4 w-[18px] rounded border border-border bg-white text-[9px] font-semibold leading-none text-gray-05 hover:border-primary hover:text-primary"
    >
      {text}
    </button>
  );
}

export function MarkerChip({ marker }: { marker: "ABS" | "EXC" }) {
  return (
    <Badge variant={marker === "ABS" ? "red" : "inactive"} className="rounded-md">
      {MARKER_LABEL[marker]}
    </Badge>
  );
}

/** Total, percentage, grade and remark, as the server worked them out. */
function Figures({ row }: { row: SheetRow }) {
  const done = row.complete && row.total !== null && row.total !== undefined;
  return (
    <>
      <TableCell className="text-right font-medium text-black-01">{done ? row.total : "—"}</TableCell>
      <TableCell className="text-right text-gray-06">{done && row.percentage ? `${row.percentage}%` : "—"}</TableCell>
      <TableCell className={cn("font-semibold", row.is_fail ? "text-destructive" : "text-black-01")}>
        {done ? row.grade : "—"}
      </TableCell>
      <TableCell className="text-gray-06">
        {done ? row.remark : "Not entered"}
        {done && row.excused_note && <p className="text-xs text-gray-05">{row.excused_note}</p>}
      </TableCell>
    </>
  );
}
