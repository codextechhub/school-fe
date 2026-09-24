import { toIso } from "../components/dates";

/** The complete week-aligned window needed to draw one calendar month. */
export function monthWindow(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const lead = first.getDay();
  const from = new Date(year, month - 1, 1 - lead);
  const cells = Math.ceil((lead + last.getDate()) / 7) * 7;
  const to = new Date(from);
  to.setDate(from.getDate() + cells - 1);
  return { from: toIso(from), to: toIso(to), cells };
}
