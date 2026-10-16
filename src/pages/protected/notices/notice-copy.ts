import type {
  AudienceKind,
  NoticeAudience,
  NoticeAudienceOptions,
  NoticeStatus,
} from "@/redux/services/notices/notices-types";

/**
 * The status chip's words and colours, in the theme's contrast-safe text
 * tones on each hue's light tint.
 */
export const STATUS_CHIP: Record<NoticeStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-05/10 text-gray-06-text" },
  PUBLISHED: { label: "Published", className: "bg-green-01/10 text-green-01-text" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-destructive/10 text-error-text" },
};

export const TITLE_MAX = 150;
export const BODY_MAX = 5000;

/** The key one audience entry is told apart by in a picker. */
export const audienceKey = (entry: Pick<NoticeAudience, "kind" | "id">) =>
  `${entry.kind}:${entry.id ?? ""}`;

/**
 * The audience a poster has chosen, in words, for the confirm before
 * publishing. The whole school wins over anything else chosen with it.
 */
export function describeAudience(
  chosen: NoticeAudience[],
  options?: NoticeAudienceOptions,
): string {
  if (chosen.some((entry) => entry.kind === "SCHOOL")) return "the whole school";
  const names = chosen.map((entry) => entry.name ?? nameOf(entry.kind, entry.id, options));
  return names.filter(Boolean).join(", ") || "nobody yet";
}

function nameOf(kind: AudienceKind, id: number | null, options?: NoticeAudienceOptions) {
  if (!options || id == null) return "";
  const list =
    kind === "BRANCH" ? options.branches : kind === "LEVEL" ? options.levels : options.classes;
  return list.find((row) => row.id === id)?.name ?? "";
}

/**
 * What a draft needs before it can be saved or published, keyed by field; an
 * empty object means it is ready. Mirrors the server's own refusals so the
 * poster is told before sending.
 *
 * Only the fields the poster can change are checked (`checks`): a message the
 * role may not read is not in the form, and a correction that leaves it alone
 * is not refused for it.
 */
export function problemsWith(
  draft: { title: string; body: string; audience: NoticeAudience[] },
  publishing: boolean,
  checks: { title?: boolean; body?: boolean; audience?: boolean } = {},
): Record<string, string> {
  const { title = true, body = true, audience = true } = checks;
  const problems: Record<string, string> = {};
  if (title && !draft.title.trim()) problems.title = "Give the notice a title.";
  else if (title && draft.title.trim().length > TITLE_MAX) {
    problems.title = `Keep the title to ${TITLE_MAX} characters.`;
  }
  if (body && !draft.body.trim()) problems.body = "Write the notice before saving it.";
  else if (body && draft.body.trim().length > BODY_MAX) {
    problems.body = `Keep the notice to ${BODY_MAX} characters.`;
  }
  if (audience && publishing && draft.audience.length === 0) {
    problems.audience = "Choose who this notice is for before publishing it.";
  }
  return problems;
}
