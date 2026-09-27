/**
 * The Division, Department, Team cascade shared by the unit and post forms:
 * children of one tier, filling a choice when there is only one, labels that
 * carry the code so typing a code finds the unit, and a suggested code.
 */

import type { OrgNode, OrgNodeKind } from "@/redux/services/staff/organogram-types";

export const divisionsOf = (nodes: OrgNode[]) => nodes.filter((n) => n.kind === "DIVISION");

/** Children of one unit at one tier; none when no parent is chosen. */
export const childNodes = (nodes: OrgNode[], parentId: string, kind: OrgNodeKind) =>
  parentId ? nodes.filter((n) => n.kind === kind && String(n.parent?.id ?? "") === parentId) : [];

/** The only candidate's id, or no choice when there are several. */
export const singleId = (list: OrgNode[]) => (list.length === 1 ? String(list[0].id) : "");

/** "Academics (ACAD)", so the search box matches the code as well as the name. */
export const nodeOption = (n: OrgNode) => ({ value: String(n.id), label: `${n.name} (${n.code})` });

/** "Junior Secondary" becomes "JS", "Academics" becomes "ACA". A suggestion only. */
export const suggestCode = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const raw = words.length === 1 ? words[0].slice(0, 3) : words.slice(0, 3).map((w) => w[0]).join("");
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
};
