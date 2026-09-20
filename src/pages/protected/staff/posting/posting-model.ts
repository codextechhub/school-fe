import type {
  StaffListRow,
  StaffRoster,
} from "@/redux/services/staff/staff-types";

export type PostingView = "posted" | "reach" | "schoolWide";

export interface PostingViewRow {
  person: StaffListRow;
  viaRoles: { name: string; school_wide: boolean }[];
}

const GROUP_FOR_VIEW: Record<
  PostingView,
  StaffRoster["groups"][number]["key"]
> = {
  posted: "posted_here",
  reach: "reaching_here",
  schoolWide: "school_wide",
};

/** Counts each server-owned roster group without reclassifying its people. */
export function postingSummary(roster?: StaffRoster) {
  const size = (key: StaffRoster["groups"][number]["key"]) =>
    roster?.groups.find((group) => group.key === key)?.rows.length ?? 0;

  return {
    total: roster?.total ?? 0,
    posted: size("posted_here"),
    reaching: size("reaching_here"),
    schoolWide: size("school_wide"),
  };
}

/** Returns one semantic roster group, narrowed by the visible search field. */
export function rowsForPostingView(
  roster: StaffRoster | undefined,
  view: PostingView,
  search: string,
): PostingViewRow[] {
  const rows =
    roster?.groups.find((group) => group.key === GROUP_FOR_VIEW[view])?.rows ??
    [];
  const needle = search.trim().toLowerCase();

  return rows
    .filter((person) => {
      if (!needle) return true;
      const searchable = [
        person.full_name,
        person.staff_number,
        person.job_title,
        ...person.roles,
        ...(person.via_roles ?? []).map((role) => role.name),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(needle);
    })
    .map((person) => ({
      person,
      viaRoles: person.via_roles ?? [],
    }));
}
