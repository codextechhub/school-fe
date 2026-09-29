/**
 * The school's own settings, as `/v1/i/me/settings/*` returns them.
 *
 * These are the school-facing doors onto values the platform also holds. The
 * platform's `/v1/config/*` endpoints are gated on keys no school role can
 * hold, so a school reaches the same values here, gated on
 * `school.settings.view` / `.update`, scoped to its own tenant, and never able
 * to name another school.
 */

import type { ClockStyle, DateFormat } from "@/lib/dates";

/** Where one security value came from, nearest scope first. */
export type SecuritySourceScope = "default" | "platform" | "school" | "branch";

/** The six values the sign-in and invitation services read at runtime. */
export interface SecuritySettingsValues {
  failed_login_threshold: number;
  account_lock_minutes: number;
  self_reset_expiry_hours: number;
  admin_reset_expiry_hours: number;
  invitation_expiry_days: number;
  proxy_idle_timeout_minutes: number;
}

export type SecuritySettingKey = keyof SecuritySettingsValues;

/**
 * The bound a school or branch value must respect.
 *
 * A school may only tighten what its parent allows, never loosen it. For a
 * `maximum` field (a link lifetime) the value may not exceed `boundary`; for a
 * `minimum` field it may not go below it.
 */
export interface SecurityCompliance {
  direction: "minimum" | "maximum";
  min: number;
  max: number;
  boundary: number;
  parent_scope: "platform" | "school";
}

export interface SecuritySettingsData {
  settings: SecuritySettingsValues;
  sources: Record<SecuritySettingKey, "database" | "default">;
  source_scopes: Record<SecuritySettingKey, SecuritySourceScope>;
  /** True where this exact scope holds its own value, which a reset clears. */
  overrides: Record<SecuritySettingKey, boolean>;
  compliance: Partial<Record<SecuritySettingKey, SecurityCompliance>>;
  scope: {
    type: "platform" | "school" | "branch";
    tenant: string | null;
    branch: string | null;
  };
}

/** A PATCH: any subset of the values, `null` resetting one to its parent. */
export type SecuritySettingsPatch = {
  [K in SecuritySettingKey]?: number | null;
} & {
  reason?: string;
  /** A branch id. Absent means the whole school. Sent as a query param. */
  branch?: string;
};

export type PayrollScope = "CENTRAL" | "PER_BRANCH";

export interface PayrollScopeOption {
  value: PayrollScope;
  label: string;
  description: string;
}

export interface PayrollScopeData {
  scope: PayrollScope;
  /** "default" means nobody has set it and the school runs centrally. */
  source: "school" | "platform" | "default";
  options: PayrollScopeOption[];
}

/** Where a display value came from: set at this scope, inherited, or the default. */
export type DisplaySource = "school" | "branch" | "platform" | "default";

/**
 * One choice a display setting offers. The labels are the server's, so the
 * page never words a zone or a format itself.
 */
export interface DisplayOption {
  value: string;
  label: string;
}

/** One branch's zone as the school-wide display read lists it. */
export interface BranchDisplayZone {
  id: number;
  name: string;
  /** The zone the branch runs in: its own, or the school's when it keeps none. */
  timezone: string;
  /** "branch" when the branch keeps its own zone, which a reset clears. */
  source: DisplaySource;
}

/**
 * `GET /v1/i/me/settings/display/`: how the school shows dates and times.
 *
 * The same values reach every screen through the session's
 * `tenant.display`; this is the editable form of them, with the choices and
 * where each value came from.
 */
export interface DisplaySettingsData {
  timezone: string;
  source: DisplaySource;
  options: DisplayOption[];
  date_format: DateFormat;
  date_format_options: DisplayOption[];
  clock: ClockStyle;
  clock_options: DisplayOption[];
  branches: BranchDisplayZone[];
}

/** `GET /v1/i/me/settings/display/?branch=<id>`: one branch's zone. */
export interface BranchDisplayData {
  timezone: string;
  source?: DisplaySource;
  options?: DisplayOption[];
}

/**
 * A PATCH of the school's display settings, any subset. With `branch` set only
 * `timezone` applies, and it becomes that branch's own zone.
 */
export interface DisplaySettingsPatch {
  timezone?: string;
  date_format?: DateFormat;
  clock?: ClockStyle;
  /** A branch id, sent as a query param. Absent means the whole school. */
  branch?: number;
}
