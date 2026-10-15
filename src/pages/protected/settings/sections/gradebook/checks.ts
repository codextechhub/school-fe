/**
 * The checks assessment setup runs while somebody edits, before anything is
 * sent.
 *
 * They are the server's rules for putting a structure or a scale in use, so the
 * drawer can say what is wrong as it is typed. The server still has the last
 * word: a draft may be saved while it fails these, and the server refuses to put
 * it in use until it passes.
 */

export interface Check {
  ok: boolean;
  message: string;
}

/** A component row as the drawer holds it: text the person typed. */
export interface ComponentDraft {
  id?: number;
  name: string;
  short_name: string;
  max_score: string;
  is_exam: boolean;
}

/** A band row as the drawer holds it. */
export interface BandDraft {
  id?: number;
  min_score: string;
  grade: string;
  remark: string;
  is_fail: boolean;
}

const whole = (text: string): number | null => {
  const value = Number(text.trim());
  return text.trim() !== "" && Number.isInteger(value) ? value : null;
};

/** Every component's maximum added up, counting one that is not a number as 0. */
export function structureTotal(rows: ComponentDraft[]): number {
  return rows.reduce((sum, row) => sum + (whole(row.max_score) ?? 0), 0);
}

/**
 * Whether the components make a structure that can be put in use: each named,
 * worth 1 to 100 marks, together exactly 100, with at most one examination.
 */
export function checkStructure(rows: ComponentDraft[]): Check {
  if (rows.length === 0) return { ok: false, message: "Add at least one component." };
  if (rows.some((row) => !row.name.trim() || !row.short_name.trim())) {
    return { ok: false, message: "Give every component a name and a short name." };
  }
  if (rows.some((row) => {
    const max = whole(row.max_score);
    return max === null || max < 1 || max > 100;
  })) {
    return { ok: false, message: "Give every component a maximum from 1 to 100." };
  }
  const names = new Set(rows.map((row) => row.name.trim().toLowerCase()));
  const shorts = new Set(rows.map((row) => row.short_name.trim().toLowerCase()));
  if (names.size !== rows.length || shorts.size !== rows.length) {
    return { ok: false, message: "Give each component its own name and short name." };
  }
  if (rows.filter((row) => row.is_exam).length > 1) {
    return { ok: false, message: "Only one component can be the examination." };
  }
  const total = structureTotal(rows);
  if (total !== 100) return { ok: false, message: `The components total ${total}. They must total 100.` };
  return { ok: true, message: "The components total 100." };
}

/** "70 – 100": the marks a band covers, from its floor up to the next band's. */
export function bandRanges(floors: number[]): string[] {
  const sorted = [...floors].sort((a, b) => b - a);
  return floors.map((floor) => {
    const above = sorted.filter((other) => other > floor);
    const top = above.length ? Math.min(...above) - 1 : 100;
    return `${floor} – ${top}`;
  });
}

/**
 * Whether the bands make a scale that can be put in use: every mark from 0 to
 * 100 falls in exactly one band, and at least one band is a pass.
 */
export function checkScale(rows: BandDraft[]): Check {
  if (rows.length === 0) return { ok: false, message: "Add at least one band." };
  if (rows.some((row) => !row.grade.trim())) return { ok: false, message: "Give every band a grade." };
  const floors = rows.map((row) => whole(row.min_score));
  if (floors.some((floor) => floor === null || floor < 0 || floor > 100)) {
    return { ok: false, message: "Give every band a lowest mark from 0 to 100." };
  }
  const values = floors as number[];
  const repeated = values.find((floor, index) => values.indexOf(floor) !== index);
  if (repeated !== undefined) return { ok: false, message: `Two bands start at ${repeated}. Each needs its own lowest mark.` };
  if (!values.includes(0)) {
    return { ok: false, message: `Nothing covers marks below ${Math.min(...values)}. The lowest band must start at 0.` };
  }
  if (rows.every((row) => row.is_fail)) return { ok: false, message: "At least one band must be a pass." };
  return { ok: true, message: "No gap, no overlap, 0 to 100 covered." };
}

/** A remark template row as the drawer holds it. */
export interface TemplateDraft {
  band_min: string;
  text: string;
}

/** Whether the templates cover every average: each its own lowest average, one of them 0. */
export function checkTemplates(rows: TemplateDraft[]): Check {
  if (rows.length === 0) return { ok: false, message: "Add at least one template." };
  if (rows.some((row) => !row.text.trim())) return { ok: false, message: "Write every template's remark." };
  const floors = rows.map((row) => whole(row.band_min));
  if (floors.some((floor) => floor === null || floor < 0 || floor > 100)) {
    return { ok: false, message: "Give every template a lowest average from 0 to 100." };
  }
  const values = floors as number[];
  if (new Set(values).size !== values.length) {
    return { ok: false, message: "Two templates start at the same average. Each needs its own." };
  }
  if (!values.includes(0)) return { ok: false, message: "One template must start at 0, so every average has a remark." };
  return { ok: true, message: "Every average from 0 to 100 has a remark." };
}

/** "70% and above", "55% to 69%", "Below 40%": a template's band in words. */
export function templateBandLabel(floor: number, floors: number[]): string {
  const above = floors.filter((other) => other > floor);
  if (above.length === 0) return floor === 0 ? "Every average" : `${floor}% and above`;
  const top = Math.min(...above) - 1;
  return floor === 0 ? `Below ${top + 1}%` : `${floor}% to ${top}%`;
}
