import type { SheetStatus } from "@/redux/services/gradebook/gradebook-types";

type Variant = "active" | "pending" | "rejected";

/**
 * Where a sheet stands, as every gradebook screen words it.
 *
 * APPROVED is a sheet its head of department moderated. A sheet that needs no
 * moderation never reaches it and stays SUBMITTED, which is already in.
 */
export const SHEET_STATUS: Record<SheetStatus, { text: string; variant: Variant }> = {
  NOT_STARTED: { text: "Not started", variant: "pending" },
  IN_PROGRESS: { text: "In progress", variant: "pending" },
  SUBMITTED: { text: "Submitted", variant: "pending" },
  APPROVED: { text: "Approved", variant: "active" },
  RETURNED: { text: "Returned", variant: "rejected" },
};

/** A submitted or approved sheet is locked to its teacher. */
export const isLockedStatus = (status: SheetStatus) => status === "SUBMITTED" || status === "APPROVED";
