import type {
  FinanceSettingsSection,
  SetupSection,
} from "@/pages/protected/finance/console-sections";

/**
 * Finance route capabilities shared by the router and the package host.
 *
 * This module contains data only. Route registration imports it before a
 * finance screen is opened, so it must not depend on the full host adapter,
 * which carries staff, branch, role, export, and branding implementations.
 */
export const financeSettingsSections: readonly FinanceSettingsSection[] = [
  "overview",
  "fiscal-calendar",
  "accounting",
  "documents",
  "banking-cash",
  "reference-data",
  "approvals",
  "fees",
] as const;

export const setupSections: readonly SetupSection[] = [
  "accounts",
  "periods",
  "tax-codes",
  "cost-centers",
] as const;
