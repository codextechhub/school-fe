/** One branch, as `/v1/i/me/branches/` returns it. */
export interface SchoolBranch {
  id: number;
  /** The per-school number a school knows its own sites by. */
  code: number;
  name: string;
  is_main: boolean;
  /** Free text on the server: "Primary", "Secondary", or "" for many schools. */
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | "INACTIVE" | "CLOSED" | string;
  address: string;
  email: string;
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
