import type { PortalAccess } from "@/redux/services/students/students-types";

import { formatDate, formatDateTime } from "../format";

/** The chip beside the panel's heading, per access state. */
export const STATUS_LABEL: Record<string, string> = {
  none: "No access",
  invited: "Invited",
  active: "Active",
  revoked: "Taken away",
};

/** The panel's one sentence about where the pupil's access stands. */
export function describe(
  name: string,
  block: PortalAccess,
  prefs?: Parameters<typeof formatDate>[1],
): string {
  switch (block.status) {
    case "invited":
      return block.invitation_expires_at
        ? `${name} has been invited and has not activated yet. The link works until ${formatDate(block.invitation_expires_at, prefs)}.`
        : `${name} has been invited and has not activated yet.`;
    case "active":
      return block.last_sign_in_at
        ? `${name} last signed in ${formatDateTime(block.last_sign_in_at, prefs)}.`
        : `${name} has activated their account and has not signed in since.`;
    case "revoked":
      return `${name}'s portal access was taken away.`;
    default:
      return `${name} has no sign-in for the pupil portal.`;
  }
}
