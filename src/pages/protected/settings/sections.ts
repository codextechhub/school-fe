/**
 * The sections the school Settings console has, and who may open each.
 *
 * The route table declares one path per key and the page maps each key to a
 * panel, so both read this list and neither may drift. It lives apart from the
 * page because the page is lazy: importing the list from it would pull that
 * chunk into the entry bundle.
 *
 * Two different misses, kept apart on purpose:
 *
 *   - A section that **does not exist** is a wrong address. It matches no route
 *     and falls through to the app's 404.
 *   - A section that exists but the reader **may not open** is not a wrong
 *     address. The page shows the overview instead, because a 404 would tell
 *     somebody a page is missing when it is simply not theirs.
 *
 * Every gate here is the key the section's own endpoint checks, so the console
 * never offers a panel whose first request answers 403.
 */
import { P, type PermissionCode } from "@/permissions";

export const SCHOOL_SETTINGS_SECTIONS = [
  "overview",
  "profile",
  "security",
  "notifications",
  "admission-numbers",
  "payroll",
  "more",
] as const;

export type SchoolSettingsSection = (typeof SCHOOL_SETTINGS_SECTIONS)[number];

export const DEFAULT_SCHOOL_SETTINGS_SECTION: SchoolSettingsSection = "overview";

export interface SectionGate {
  /** The reader needs ANY of these. Empty means no key is needed. */
  anyOf: PermissionCode[];
  /** A plan module the school must have bought, when the section needs one. */
  capability?: string;
  /**
   * A section made of parts with different gates opens when ANY part does.
   * When present, `anyOf` and `capability` are ignored.
   */
  parts?: Omit<SectionGate, "parts">[];
}

/**
 * The key each section's read endpoint checks, and the plan module it
 * configures. Capability names are the backend's (vs_rbac permission_bands):
 * payroll runs sit in the advanced band of finance, so a school without
 * payroll is not asked how it runs one.
 *
 * Notifications has two parts, and each is gated inside the section: the
 * event list on the notification key and `email_alerts`, and approval emails
 * on the key that changes an approval path.
 *
 * Admission numbers are gated on the key that SAVES the rule rather than the
 * one that reads it: every enrolling clerk reads the rule, because the
 * enrolment form prints its hint, and a settings screen they cannot change is
 * not a setting for them.
 */
export const SECTION_GATES: Record<
  Exclude<SchoolSettingsSection, "overview" | "more">,
  SectionGate
> = {
  profile: { anyOf: [P.VIEW_SCHOOL_PROFILE] },
  security: { anyOf: [P.VIEW_SETTINGS] },
  notifications: {
    anyOf: [],
    parts: [
      { anyOf: [P.MANAGE_NOTIFICATION_SETTINGS], capability: "email_alerts" },
      { anyOf: [P.UPDATE_WORKFLOW_TEMPLATE] },
    ],
  },
  "admission-numbers": { anyOf: [P.MODIFY_STUDENT], capability: "students" },
  payroll: { anyOf: [P.VIEW_SETTINGS], capability: "finance_advanced" },
};

export type SettingsPanelSection = keyof typeof SECTION_GATES;

/**
 * The sections this reader can open at this school: the key AND the module.
 *
 * The page, and the sidebar door onto it, both ask this one question, so the
 * door is never shown to somebody the page would then refuse.
 */
export function openSettingsSections(can: {
  hasAnyPermission: (...codes: PermissionCode[]) => boolean;
  hasCapability: (key: string | null | undefined) => boolean;
}): SettingsPanelSection[] {
  const passes = (gate: Omit<SectionGate, "parts">) =>
    can.hasAnyPermission(...gate.anyOf) && can.hasCapability(gate.capability);
  return (Object.keys(SECTION_GATES) as SettingsPanelSection[]).filter((key) => {
    const gate = SECTION_GATES[key];
    return gate.parts ? gate.parts.some(passes) : passes(gate);
  });
}

/**
 * The keys of the sections every school has, whatever its plan.
 *
 * The palette's "View settings" gates on these, because it lands on the
 * overview and a gate cannot say "this key and that module, or this other
 * key". Each plan-gated section has its own palette action, which the
 * palette filters by that section's module (see action-palette/plan.ts).
 */
export const UNPLANNED_SETTINGS_KEYS: PermissionCode[] = Array.from(
  new Set(
    Object.values(SECTION_GATES)
      .flatMap((gate) => gate.parts ?? [gate])
      .filter((gate) => !gate.capability)
      .flatMap((gate) => gate.anyOf),
  ),
);
