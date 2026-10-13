/**
 * One branch, as `/v1/i/me/branches/` returns it.
 *
 * `address` and `email` are Field Access fields of `school.branches` and are
 * absent when the signed-in role may not read them. The branch name has no
 * switch. Neither field is ever writable from this app.
 */
export interface SchoolBranch {
  _read_only_fields?: string[];
  id: number;
  /** The per-school number a school knows its own sites by. */
  code: number;
  name: string;
  is_main: boolean;
  /** Free text on the server: "Primary", "Secondary", or "" for many schools. */
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE" | "CLOSED" | string;
  address?: string;
  email?: string;
  state: string;
  country: string;
  opened_at: string | null;
  /**
   * Null until the product has a Student, Teacher or Class model.
   *
   * Null, not zero: zero would claim the branch has none, which is a different
   * and false statement. The screen renders a dash.
   */
  students_count: number | null;
  teachers_count: number | null;
  classes_count: number | null;
}
