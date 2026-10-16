/** A notice's place in its life: drafted, published once, possibly withdrawn. */
export type NoticeStatus = "DRAFT" | "PUBLISHED" | "WITHDRAWN";

/** Who a notice is for: the whole school, a branch, a level or a class. */
export type AudienceKind = "SCHOOL" | "BRANCH" | "LEVEL" | "CLASS";

/** One part of a notice's audience, as the server sends and receives it. */
export interface NoticeAudience {
  kind: AudienceKind;
  /** The branch, level or class; null for the whole school. */
  id: number | null;
  name?: string;
}

/**
 * A notice on a staff screen.
 *
 * Any business field may be absent where the viewer's Field Access hides it
 * (`school.notices`): `audience` and `audience_label` go together, as do the
 * publication stamps, and `read_count` with `audience_count`. The two counts
 * are filled on the detail only, and are null on a draft.
 */
export interface Notice {
  id: number;
  title?: string;
  body?: string;
  status?: NoticeStatus;
  status_label?: string;
  audience?: NoticeAudience[];
  audience_label?: string;
  created_by?: string;
  created_at?: string;
  published_at?: string | null;
  published_by?: string;
  edited_at?: string | null;
  withdrawn_at?: string | null;
  withdrawn_by?: string;
  read_count?: number | null;
  audience_count?: number | null;
  /** Whether the viewer may correct, publish or withdraw this notice. */
  can_manage?: boolean;
  _read_only_fields?: readonly string[];
}

/** What a draft or a correction sends. Fields the viewer may not write are left out. */
export interface NoticeWrite {
  title?: string;
  body?: string;
  audience?: NoticeAudience[];
  /** On create only: publish at once instead of saving a draft. */
  publish?: boolean;
}

/**
 * What the viewer may address a notice to.
 *
 * `school` and `levels` are offered only to a whole-school poster, because
 * both span every branch. `branches` is empty at a school with one branch,
 * where a branch is the whole school. A teacher gets only their own classes.
 */
export interface NoticeAudienceOptions {
  school: boolean;
  branches: { id: number; name: string }[];
  levels: { id: number; name: string }[];
  classes: { id: number; name: string }[];
}

export interface NoticeListArgs {
  status?: NoticeStatus | "all";
  search?: string;
  page?: number;
}
