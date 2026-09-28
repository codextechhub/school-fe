/**
 * The seam that turns a refusal into a question.
 *
 * The backend refuses a direct post when the school holds a workflow template
 * with no stages: nobody would review the document, and the empty template is
 * also standing in front of the shared ladder that would otherwise have caught
 * it. Posting anyway is legitimate - a bursar should not be stuck because
 * nobody has built the ladder yet - but it is a decision somebody makes.
 *
 * Why it lives here rather than on the screens. The documents this guards -
 * journals, direct entries, expense claims, credit notes, refunds, write-offs,
 * concessions - are rendered by @xvs/finance, and their posting buttons are
 * that package's. Handling the refusal in each of them would mean a copy per
 * screen in a package this app only consumes, and another the day a further
 * document type is gated. Every request from every package already passes
 * through one interceptor, so the question is asked there and answered once.
 * The console asks it the same way.
 *
 * The original mutation's promise is what carries the retry's result, so a
 * screen that knows nothing about any of this simply sees its post succeed.
 */

export interface ApprovalConfirmRequest {
  /** The refusal's own words, which name the document type. */
  message: string;
  /** Called with the reason when the reader confirms, or null when they do not. */
  settle: (reason: string | null) => void;
}

type Listener = (pending: ApprovalConfirmRequest | null) => void;

let listener: Listener | null = null;
let pending: ApprovalConfirmRequest | null = null;

/** Mounted once by the dialog. A second subscriber replaces the first. */
export function subscribeToApprovalConfirm(next: Listener): () => void {
  listener = next;
  next(pending);
  return () => {
    if (listener === next) listener = null;
  };
}

/**
 * Ask the reader whether to post without approval.
 *
 * Resolves to the reason they gave, or null if they declined. With no dialog
 * mounted it resolves null rather than hanging: a request must not wait forever
 * on a question nobody can see.
 */
export function askToPostWithoutApproval(message: string): Promise<string | null> {
  if (listener === null) return Promise.resolve(null);
  return new Promise((resolve) => {
    pending = {
      message,
      settle: (reason) => {
        pending = null;
        listener?.(null);
        resolve(reason);
      },
    };
    listener?.(pending);
  });
}
