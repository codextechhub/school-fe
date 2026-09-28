import type { StaffProfileSection } from "@/redux/services/staff/staff-types";

/** Every tab a staff profile can show, and the section that opens it. */
const ALL_TABS: { label: string; value: string; section: StaffProfileSection | null }[] = [
  { label: "Overview", value: "overview", section: null },
  { label: "Teaching", value: "teaching", section: "teaching" },
  { label: "Access", value: "access", section: "roles" },
  { label: "Qualifications", value: "qualifications", section: "records" },
  { label: "Documents", value: "documents", section: "records" },
  { label: "Leave", value: "leave", section: "leave" },
  { label: "History", value: "history", section: "history" },
];

/**
 * The tabs a reader may open, from the sections the server says they may see.
 *
 * Overview is always there. A record from before the visibility setting, with
 * no `visible_sections`, keeps every tab: the server still refuses what the
 * reader may not open, and the tab says so.
 */
export function tabsFor(visible: StaffProfileSection[] | undefined) {
  return ALL_TABS.filter(
    (tab) => tab.section === null || !visible || visible.includes(tab.section),
  ).map(({ label, value }) => ({ label, value }));
}
