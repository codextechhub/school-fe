import type { GuideCategory } from "./types";

export const GUIDE_CATEGORIES = [
  { id: "getting-started", title: "Getting started", description: "Sign in, find your way around, and get help when you need it.", order: 1 },
  { id: "school-setup", title: "School setup", description: "Set the school up, take it live, and manage its branches.", order: 2 },
  { id: "students-and-guardians", title: "Students and guardians", description: "Admit, enrol, place, promote, and keep family records right.", order: 3 },
  { id: "staff", title: "Staff", description: "Add staff, invite them, post them to branches, and assign teaching.", order: 4 },
  { id: "academics", title: "Academics", description: "Sessions, {terms}, departments, programmes, classes, and subjects.", order: 5 },
  { id: "calendar-and-timetables", title: "Calendar and timetables", description: "Date the school year, plan the week, and schedule exams.", order: 6 },
  { id: "roles-and-permissions", title: "Roles and permissions", description: "Decide who can do what, and get access changes approved.", order: 7 },
  { id: "approvals-and-workflow", title: "Approvals and workflow", description: "Decide what waits on you, track what you sent, and set up approval routes.", order: 8 },
  { id: "finance-and-payments", title: "Finance and payments", description: "Fees, invoices, receipts, expenses, payroll, budgets, and reports.", order: 9 },
  { id: "procurement-and-inventory", title: "Procurement and inventory", description: "Buy for the school, pay vendors, and keep track of stock.", order: 10 },
  { id: "data-imports-and-exports", title: "Data imports and exports", description: "Bring records in from spreadsheets and take reports out.", order: 11 },
  { id: "troubleshooting", title: "Troubleshooting", description: "Understand common failures and recover without losing work.", order: 12 },
] as const satisfies readonly GuideCategory[];
