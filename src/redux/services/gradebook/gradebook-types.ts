/**
 * The gradebook's shared vocabulary, as `/v1/gradebook/` sends it.
 *
 * Each screen's own payload types sit beside its endpoints; this file holds
 * what several of them share: references, the term and branch a read is asked
 * for, and the states a sheet, a class and a result move through. The string
 * values are the backend's (`vs_gradebook.constants`), so a state the server
 * adds shows up here as a type error rather than as a blank chip.
 */

/** Any named row the server refers to: a class, subject, branch, teacher or term. */
export interface Ref {
  id: number;
  name: string;
}

/** A student as every gradebook row names them. */
export interface StudentRef extends Ref {
  admission_number: string;
}

/** The term a hub reads, with its session's name. */
export interface TermRef extends Ref {
  session: string;
}

/** A published examination paper for a sheet's subject. */
export interface ExamPaper {
  date: string;
  sitting: string;
  sitting_label: string;
}

/**
 * The term and branch a gradebook read is asked for.
 *
 * Both are optional. An omitted term is the school's current term by its own
 * clock, and an omitted branch is every branch the caller can see.
 */
export interface TermArgs {
  term?: number;
  branch?: number | "all";
}

/** Where one subject's sheet stands. APPROVED is moderated and in. */
export type SheetStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "RETURNED";

/** Where a class stands in the chain, as the hubs and approvals report it. */
export type ClassStage = "ENTERING" | "COMPILING" | "AWAITING" | "PUBLISHED";

/** A cell that holds no mark: absent (counts as zero) or excused (left out). */
export type Marker = "ABS" | "EXC";

/** What a family may see of one result. A held result is published but not released. */
export type ResultState = "NOT_PUBLISHED" | "HELD" | "RELEASED";

/** What happened to the guardian's "report card is ready" email. */
export type EmailState = "SENT" | "NO_EMAIL" | "HELD" | "NOT_SENT";

/** Why a sheet due this term is not in, on the hub's late list. */
export type LateReason =
  | "ENTERED"
  | "RETURNED"
  | "AWAITING_MODERATION"
  | "NO_MAIN_TEACHER"
  | "LAST_WORKING_DAY"
  | "CANNOT_SIGN_IN";

/** A structure or scale's life: drafted, in force, or replaced. */
export type SetupStatus = "DRAFT" | "IN_USE" | "RETIRED";

/** Where a correction to a published result stands. */
export type AmendmentStatus = "PENDING" | "APPROVED" | "REJECTED";
