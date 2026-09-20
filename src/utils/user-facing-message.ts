/**
 * Normalises server-written text before it reaches a person.
 *
 * APIs keep money in minor units and permissions in machine keys. Both are
 * useful contracts between systems, but neither belongs in interface copy.
 * Error helpers and the global request interceptor pass their final sentence
 * through this boundary so a new call site cannot accidentally expose either.
 */

const PERMISSION_ACTIONS: Record<string, string> = {
  approve: "Approve",
  archive: "Archive",
  assign: "Assign",
  cancel: "Cancel",
  close: "Close",
  create: "Create",
  delete: "Delete",
  download: "Download",
  export: "Export",
  generate: "Generate",
  issue: "Issue",
  manage: "Manage",
  manage_sensitive: "Manage sensitive",
  pay: "Pay",
  post: "Post",
  publish: "Publish",
  read: "View",
  refund: "Refund",
  reopen: "Reopen",
  reverse: "Reverse",
  run: "Run",
  submit: "Submit",
  update: "Update",
  upload: "Upload",
  view: "View",
  view_sensitive: "View sensitive",
};

const formatResource = (value: string): string =>
  value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/** Convert a permission key such as finance.invoice.create to Create invoice. */
export function humanizePermissionKeys(message: string): string {
  return message.replace(
    /(["']?)([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*){2,})\1/gi,
    (match, quote: string, key: string) => {
      const segments = key.toLowerCase().split(".");
      const action = PERMISSION_ACTIONS[segments.at(-1) ?? ""];
      const resource = formatResource(segments.at(-2) ?? "");
      if (!action || !resource) return match;
      const label = `${action} ${resource}`;
      return quote ? `${quote}${label}${quote}` : label;
    },
  );
}

/** Convert an integer minor-unit amount to a naira display value. */
export function formatKoboAsNaira(value: number): string {
  const sign = value < 0 ? "-" : "";
  const naira = Math.abs(value) / 100;
  return `${sign}₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Remove API-only money units and permission keys from user-facing text. */
export function userFacingMessage(message: string): string {
  const money = message.replace(
    /(-?\d[\d,]*(?:\.\d+)?)\s*kobo\b/gi,
    (_match, amount: string) => formatKoboAsNaira(Number(amount.replace(/,/g, ""))),
  );
  return humanizePermissionKeys(money).replace(/\bkobo\b/gi, "naira");
}
