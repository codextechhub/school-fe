import type {
  FinanceSettingsSection,
  PaymentsSection,
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
  "receivables",
  "payroll",
] as const;

export const setupSections: readonly SetupSection[] = [
  "accounts",
  "periods",
  "tax-codes",
  "cost-centers",
] as const;

/**
 * The Payments screens a school mounts: its own payouts, batches, settlement,
 * transactions log, needs-attention events and the held settlements paid to its
 * branches. Held Reconciliations is the platform's own check and is left out.
 *
 * Payouts and batches pay out of money the platform holds, so the finance
 * sidebar offers them only at a school whose custody is HELD (the sidebar's
 * `gateOnCustody`); at a DIRECT school their address shows a notice instead.
 */
export const paymentsSections: readonly PaymentsSection[] = [
  "payouts",
  "batches",
  "settlement",
  "transactions",
  "webhooks",
  "held-settlements",
] as const;
