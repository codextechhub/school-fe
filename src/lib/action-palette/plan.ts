/**
 * Which plan module each destination belongs to, for the palette.
 *
 * A palette gate answers "may this person do it", which is about their role.
 * It cannot answer "did the school buy it", which is about the plan, and an
 * administrator holds every key: without this table the box offered a school
 * on the basic plan its timetables, its exam scheduling, its bulk imports and
 * its Finance console, and each one opened onto a refusal or an empty shell.
 *
 * So a navigation action is offered only when the school's plan reaches the
 * address it opens. Longest prefix wins, the same rule the sidebar follows by
 * gating a parent item on the module and a deeper item on its band. Module
 * names are the backend's (vs_rbac permission_bands). An address that matches
 * nothing is core to every school.
 *
 * The sidebar declares the same modules on its own items. When a screen moves
 * into a module, both places change.
 */
import { routesPath } from "@/routes/routesPath";
import { SECTION_GATES } from "@/pages/protected/settings/sections";

const R = routesPath.PROTECTED;

export const PLAN_BY_PREFIX: ReadonlyArray<readonly [prefix: string, capability: string]> = [
  [R.STUDENTS.PROMOTION, "students_plus"],
  [R.STUDENTS.INDEX, "students"],
  [R.STAFF.TEACHING, "teachers_plus"],
  [R.STAFF.POSTING, "teachers_plus"],
  [R.STAFF.INDEX, "teachers"],
  [R.ACADEMIC_CALENDAR.INDEX, "calendar"],
  [R.TIMETABLES.EXAMS, "calendar_advanced"],
  ["/timetables", "calendar_plus"],
  ["/data-imports", "bulk_import"],
  ["/export", "data_export"],
  [R.FINANCE.INDEX, "finance"],
  [R.PROCUREMENT.INDEX, "procurement"],
  ...(Object.entries(SECTION_GATES)
    .filter(([, gate]) => gate.capability)
    .map(([section, gate]) => [`${R.SETTINGS.INDEX}/${section}`, gate.capability as string] as const)),
];

/** The plan module an address needs, or undefined when it is core. */
export function capabilityForPath(to: string): string | undefined {
  const path = to.split("?")[0];
  let best: { length: number; capability: string } | undefined;
  for (const [prefix, capability] of PLAN_BY_PREFIX) {
    const matches = path === prefix || path.startsWith(`${prefix}/`);
    if (matches && (!best || prefix.length > best.length)) {
      best = { length: prefix.length, capability };
    }
  }
  return best?.capability;
}
