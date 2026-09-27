/**
 * Every how-to guide the school app knows about, in the order the guides home
 * lists them within a category.
 *
 * Each area keeps its own file, so guides for students and guides for finance
 * are written and reviewed apart. A guide is added to its area's file, never
 * here; this file only puts the areas in order.
 */
import type { GuideRecord } from "../types";
import { ACADEMICS_GUIDES } from "./academics";
import { APPROVALS_AND_WORKFLOW_GUIDES } from "./approvals-and-workflow";
import { CALENDAR_AND_TIMETABLES_GUIDES } from "./calendar-and-timetables";
import { DATA_IMPORTS_AND_EXPORTS_GUIDES } from "./data-imports-and-exports";
import { FINANCE_AND_PAYMENTS_GUIDES } from "./finance-and-payments";
import { GETTING_STARTED_GUIDES } from "./getting-started";
import { PROCUREMENT_AND_INVENTORY_GUIDES } from "./procurement-and-inventory";
import { ROLES_AND_PERMISSIONS_GUIDES } from "./roles-and-permissions";
import { SCHOOL_SETUP_GUIDES } from "./school-setup";
import { STAFF_GUIDES } from "./staff";
import { STUDENTS_AND_GUARDIANS_GUIDES } from "./students-and-guardians";
import { TROUBLESHOOTING_GUIDES } from "./troubleshooting";

export const GUIDE_REGISTRY: readonly GuideRecord[] = [
  ...GETTING_STARTED_GUIDES,
  ...SCHOOL_SETUP_GUIDES,
  ...STUDENTS_AND_GUARDIANS_GUIDES,
  ...STAFF_GUIDES,
  ...ACADEMICS_GUIDES,
  ...CALENDAR_AND_TIMETABLES_GUIDES,
  ...ROLES_AND_PERMISSIONS_GUIDES,
  ...APPROVALS_AND_WORKFLOW_GUIDES,
  ...FINANCE_AND_PAYMENTS_GUIDES,
  ...PROCUREMENT_AND_INVENTORY_GUIDES,
  ...DATA_IMPORTS_AND_EXPORTS_GUIDES,
  ...TROUBLESHOOTING_GUIDES,
];
