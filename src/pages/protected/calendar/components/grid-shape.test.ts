import { describe, expect, it } from "vitest";

import { DEFAULT_DISPLAY } from "@/lib/dates";
import { clashedSlotIds, toRows, warningsFromDays } from "./grid-shape";
import type {
  GridCell,
  GridDay,
} from "@/redux/services/calendar/calendar-types";

// The failure these guard is a grid that still LOOKS like a grid. Put a
// lesson under the wrong day and nothing is misaligned, nothing errors, and
// nobody notices until a teacher turns up on the wrong morning.

const cell = (period: number, over: Partial<GridCell> = {}): GridCell => ({
  period,
  period_label: `Period ${period}`,
  start_time: "08:00:00",
  end_time: "08:45:00",
  kind: "LESSON",
  slot: null,
  ...over,
});

const day = (n: 1 | 2 | 3, label: string, cells: GridCell[]): GridDay => ({
  day_of_week: n,
  day_label: label,
  cells,
});

describe("turning days into rows", () => {
  it("keeps each day's cell in that day's column", () => {
    const rows = toRows([
      day(1, "Monday", [cell(1, { slot: { id: 11 } as never })]),
      day(2, "Tuesday", [cell(1, { slot: { id: 22 } as never })]),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0]?.slot?.id).toBe(11);
    expect(rows[0].cells[1]?.slot?.id).toBe(22);
  });

  it("gives a day that does not run a period a null, not a blank slot", () => {
    // Friday running its own short schedule does not run Period 6. That is a
    // cell nobody can fill, and it must not render as an empty one inviting a
    // click - the server would refuse the write with "that period does not run
    // on this day".
    const rows = toRows([
      day(1, "Monday", [cell(1), cell(6)]),
      day(2, "Friday", [cell(1)]),
    ]);
    const period6 = rows.find((r) => r.period === 6)!;
    expect(period6.cells[0]).not.toBeNull();
    expect(period6.cells[1]).toBeNull();
  });

  it("orders rows by first appearance, not by period id", () => {
    // The server sends the periods in force already ordered by time. Sorting
    // by id here would reorder the school day the moment a period was added
    // in the middle of it and got the highest id.
    const rows = toRows([day(1, "Monday", [cell(9), cell(3), cell(5)])]);
    expect(rows.map((r) => r.period)).toEqual([9, 3, 5]);
  });

  it("carries a period that only one day runs", () => {
    const rows = toRows([
      day(1, "Monday", [cell(1)]),
      day(2, "Friday", [cell(1), cell(99)]),
    ]);
    expect(rows.map((r) => r.period)).toEqual([1, 99]);
    expect(rows[1].cells[0]).toBeNull();
    expect(rows[1].cells[1]?.period).toBe(99);
  });

  it("names the days only where two rows share a label", () => {
    // The short-Friday case: an everyday "Period 1" and Friday's own, told
    // apart by their times alone until this names them.
    const rows = toRows([
      day(1, "Monday", [cell(1, { period_label: "Period 1" })]),
      day(2, "Friday", [cell(9, { period_label: "Period 1" })]),
    ]);
    expect(rows[0].runsOn).toEqual(["Monday"]);
    expect(rows[1].runsOn).toEqual(["Friday"]);
  });

  it("says nothing when a label is unique, even if a day skips the row", () => {
    // The bug this replaced: tagging every row a Friday does not run left the
    // eight everyday rows wearing "Monday, Tuesday, Wednesday, Thursday only",
    // which buried the two rows that actually needed telling apart.
    const rows = toRows([
      day(1, "Monday", [
        cell(1, { period_label: "Period 1" }),
        cell(6, { period_label: "Period 6" }),
      ]),
      day(2, "Friday", [cell(1, { period_label: "Period 1" })]),
    ]);
    expect(rows.map((r) => r.runsOn)).toEqual([[], []]);
  });

  it("writes the times on the school's clock, without seconds", () => {
    const rows = toRows([day(1, "Monday", [cell(1)])], DEFAULT_DISPLAY);
    expect(rows[0].time).toBe("8:00 am - 8:45 am");
    const h24 = toRows([day(1, "Monday", [cell(1)])], { ...DEFAULT_DISPLAY, clock: "H24" });
    expect(h24[0].time).toBe("08:00 - 08:45");
  });

  it("leaves the time blank where the grid sends none", () => {
    // A teacher's grid omits start_time and end_time entirely. Reading
    // `.slice()` off the absent value is a crash, and formatting it anyway
    // gives every row a bare " - " where a time should be.
    const rows = toRows([
      day(1, "Monday", [
        { period: 1, period_label: "Period 1", kind: "LESSON", slot: null },
      ]),
    ]);
    expect(rows[0].time).toBe("");
  });
});

describe("gathering a teacher grid's clashes", () => {
  const warn = (detail: string, ids: number[]) => ({
    code: "TEACHER_DOUBLE_BOOKED",
    detail,
    slot_ids: ids,
  });

  it("collects warnings hung on the cells", () => {
    const rows = warningsFromDays([
      day(1, "Monday", [cell(1, { warnings: [warn("Booked twice.", [1, 7])] })]),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].detail).toBe("Booked twice.");
  });

  it("lists one double-booking once, not once per cell", () => {
    // The same clash rides on BOTH cells of the pair. Without deduplication
    // the panel says "Ngozi Eze is double-booked" twice for one problem.
    const rows = warningsFromDays([
      day(1, "Monday", [
        cell(1, { warnings: [warn("Booked twice.", [1, 7])] }),
        cell(2, { warnings: [warn("Booked twice.", [1, 7])] }),
      ]),
    ]);
    expect(rows).toHaveLength(1);
  });

  it("is empty for a week with nothing wrong in it", () => {
    expect(warningsFromDays([day(1, "Monday", [cell(1)])])).toEqual([]);
  });
});

describe("reading clashes off the warnings", () => {
  it("flags both slots of a pair, not just the one that was written", () => {
    // A clash is a relationship. If only the newly written slot went red, the
    // person would go looking for the other half with nothing marking it.
    const ids = clashedSlotIds([
      { code: "TEACHER_DOUBLE_BOOKED", detail: "…", slot_ids: [1, 7] },
    ]);
    expect(ids.has(1)).toBe(true);
    expect(ids.has(7)).toBe(true);
  });

  it("merges slots appearing in more than one clash", () => {
    // One teacher booked into three classes at once produces several warnings
    // sharing a slot. The set must not double-count or drop it.
    const ids = clashedSlotIds([
      { code: "TEACHER_DOUBLE_BOOKED", detail: "…", slot_ids: [1, 7] },
      { code: "TEACHER_DOUBLE_BOOKED", detail: "…", slot_ids: [1, 4] },
    ]);
    expect([...ids].sort()).toEqual([1, 4, 7]);
  });

  it("is empty when there are no warnings at all", () => {
    expect(clashedSlotIds().size).toBe(0);
    expect(clashedSlotIds([]).size).toBe(0);
  });

  it("survives a warning carrying no slot ids", () => {
    // A redacted warning - one whose other half is at a branch this caller
    // cannot see - carries its own slot alone or none at all.
    const ids = clashedSlotIds([
      { code: "ROOM_DOUBLE_BOOKED", detail: "…" } as never,
    ]);
    expect(ids.size).toBe(0);
  });
});
