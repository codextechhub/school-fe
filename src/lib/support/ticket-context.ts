/**
 * Which screen the person was on when they raised a ticket.
 *
 * ── Why a ticket carries this ────────────────────────────────────────────────
 *
 * A ticket lands in a queue staffed from outside the school, and the first
 * thing anybody there has to work out is which part of the product broke. The
 * title rarely says: "it is not adding up" could be a fee invoice, a payroll
 * run or a report. Until now the only routing a ticket carried was the word
 * "Onboarding", stamped on every ticket whether or not the school was still
 * onboarding - so it routed a live bursar's fees complaint to the setup queue
 * and told the reader nothing true.
 *
 * The screen is the honest version of that same signal, and the server already
 * takes it: `route_pattern` and `product_area` are two of the four keys the
 * context allowlist declares (apps/vs_tickets/serializers.py).
 *
 * ── What may be sent, and why the rules are strict ───────────────────────────
 *
 * A ticket is read outside the tenant, so anything a client can put in one is
 * something a client can leak into one. That is why the allowlist exists, and
 * why the route is a PATTERN rather than the address: `/students/1042` names a
 * child to a stranger, `/students/:id` names a screen.
 *
 * The server enforces exactly that. `route_pattern` must match
 * `^/[a-z0-9_./:-]{0,199}$` AND contain no digit, no "?" and no "#" - the
 * no-digit rule being what proves the record ids were taken out. So a
 * placeholder has to be lowercase too: `:batchid`, never `:batchId`.
 *
 * Everything here mirrors those rules and then checks its own work, because of
 * what a rejection would cost. A 400 on the context would fail the whole
 * request, and the person filing the ticket is by definition someone for whom
 * something is already broken. If a pattern cannot be made valid, it is left
 * out and the ticket goes without it.
 */

/** The twenty values the server's ChoiceField accepts, verbatim. */
export type ProductArea =
  | "Account"
  | "Audit and security"
  | "Console"
  | "Data imports"
  | "Exports"
  | "Finance"
  | "Health"
  | "Notifications"
  | "Onboarding"
  | "Organogram"
  | "Permissions"
  | "Platform health"
  | "Procurement"
  | "Roles"
  | "School management"
  | "Settings"
  | "Support"
  | "Tasks"
  | "Users"
  | "Workflow";

/**
 * Which area of the product each part of this app belongs to.
 *
 * Longest prefix wins, so `/onboarding/roles` routes to Roles rather than to
 * Onboarding: somebody stuck on who-may-do-what needs the people who own roles,
 * not the people who own setup.
 *
 * Every mounted screen resolves to an area; ticket-context.test.ts walks the
 * router and names any screen that does not.
 *
 * Only areas this app actually mounts are listed. The server's vocabulary is
 * platform-wide and includes areas that belong to the console (Platform health,
 * Organogram); claiming one of those from a school would be a lie in the field
 * whose whole job is to be true.
 */
const AREA_BY_PREFIX: [prefix: string, area: ProductArea][] = [
  ["/onboarding/roles", "Roles"],
  ["/onboarding/import", "Data imports"],
  ["/onboarding", "Onboarding"],
  ["/finance", "Finance"],
  ["/procurement", "Procurement"],
  ["/notifications", "Notifications"],
  ["/students", "School management"],
  ["/branches", "School management"],
  ["/academic-structure", "School management"],
  ["/academic-calendar", "School management"],
  ["/timetables", "School management"],
  ["/overview", "School management"],
  ["/staff", "School management"],
  ["/roles", "Roles"],
  ["/settings/security", "Audit and security"],
  ["/settings/notifications", "Notifications"],
  ["/settings/payroll", "Finance"],
  ["/settings", "Settings"],
  ["/workflow", "Workflow"],
  ["/data-imports", "Data imports"],
  ["/export", "Exports"],
  ["/support", "Support"],
];

/** The server's rule for `route_pattern`, mirrored so nothing invalid is sent. */
const isSendablePattern = (pattern: string): boolean =>
  /^\/[a-z0-9_./:-]{0,199}$/.test(pattern) && !/\d/.test(pattern);

/**
 * The address with its record ids taken out: "/students/1042" -> "/students/:id".
 *
 * Built from the router's own params rather than guessed from the shape of the
 * path, so a segment is replaced because the router said it was an id, not
 * because it happened to look like one. A branch called "block-2" is a name, not
 * an id, and guessing would both mangle it and leave a digit behind that the
 * server would reject.
 *
 * Returns undefined rather than something the server would refuse.
 */
export function routePatternFor(
  pathname: string,
  params: Readonly<Record<string, string | undefined>> = {},
): string | undefined {
  const placeholders = Object.entries(params)
    .filter((entry): entry is [string, string] => !!entry[1])
    // Longest value first: a param whose value is a prefix of another's would
    // otherwise substitute inside it and leave the rest of the id behind.
    .sort((a, b) => b[1].length - a[1].length);

  let pattern = pathname;
  for (const [name, value] of placeholders) {
    // Lowercase, because the server's character class has no uppercase in it -
    // ":batchId" is refused where ":batchid" is taken.
    const placeholder = name.toLowerCase().replace(/[^a-z_]/g, "") || "id";
    pattern = pattern.split(value).join(`:${placeholder}`);
  }

  // A trailing slash says nothing and costs a character.
  if (pattern.length > 1 && pattern.endsWith("/")) pattern = pattern.slice(0, -1);

  return isSendablePattern(pattern) ? pattern : undefined;
}

/** Which product area a path belongs to, by longest matching prefix. */
export function productAreaFor(pathname: string): ProductArea | undefined {
  let best: { length: number; area: ProductArea } | undefined;
  for (const [prefix, area] of AREA_BY_PREFIX) {
    const matches = pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (matches && (!best || prefix.length > best.length)) {
      best = { length: prefix.length, area };
    }
  }
  return best?.area;
}

/**
 * What the screen contributes to a ticket's context: where they were, and which
 * part of the product that is. Either half may be absent, and an empty object
 * is a fine answer - the caller sends no context at all in that case.
 */
export function screenTicketContext(
  pathname: string,
  params: Readonly<Record<string, string | undefined>> = {},
): { route_pattern?: string; product_area?: ProductArea } {
  const route = routePatternFor(pathname, params);
  const area = productAreaFor(pathname);
  return {
    ...(route ? { route_pattern: route } : {}),
    ...(area ? { product_area: area } : {}),
  };
}
